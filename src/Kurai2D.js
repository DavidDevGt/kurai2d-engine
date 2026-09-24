import { mat4 } from "gl-matrix";
import Color from "./Color.js";
import Camera from "./Camera.js";
import { Vector2, Vector3 } from "./Physics.js";
import Time from "./Time.js";
import GLManager from "./managers/GLManager.js";
import GLState from "./managers/GLState.js";
import TextureManager from "./managers/TextureManager.js";
import RenderStats from "./managers/RenderStats.js";
import PointLight from "./lights/PointLight.js";
import DirectionalLight from "./lights/DirectionalLight.js";
import Drawable from "./Drawable.js";
import SpriteBatch from "./SpriteBatch.js";
import Tween from "./Tween.js";
import Timer from "./Timer.js";
import Coroutine from "./Coroutine.js";
import PostProcessor from "./PostProcessor.js";
import RenderTarget from "./RenderTarget.js";
import GameLoop from "./GameLoop.js";
import { createStandardProgramInfo } from "./render/StandardProgram.js";
import { computeViewport, clientToView } from "./render/Viewport.js";
import LightUniforms, { MAX_LIGHTS } from "./render/LightUniforms.js";
import {
  buildDrawOrder,
  isVisible,
  isAutoBatchable,
  queueBatchedDraw,
} from "./render/DrawList.js";

/**
 * Engines currently ticking the global Time/Tween/Timer/Coroutine systems.
 * @type {Set<Kurai2D>}
 */
const globalTickers = new Set();

/**
 * @class Kurai2D
 * @description The engine: owns a WebGL2 context, its cameras and lights, and
 * renders scenes into it.
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {Object} [options] - Context options
 * @param {boolean} [options.antialias=true] - Request an MSAA drawing buffer.
 * Pixel-art games that never rotate or scale sprites to fractional sizes can
 * pass `false` for hard, exact pixel edges (and to avoid MSAA texture-edge
 * artifacts); rotated sprites and shapes will then be aliased.
 * @param {boolean} [options.tickGlobals=true] - Whether `drawScene` advances
 * the global Time, Tween, Timer and Coroutine systems. With several engines
 * on one page, leave it on for exactly one of them so those systems advance
 * once per frame.
 */
class Kurai2D {
  constructor(canvas, options = {}) {
    const { antialias = true, tickGlobals = true } = options;
    const gl = canvas.getContext("webgl2", {
      antialias,
      powerPreference: "high-performance",
      desynchronized: false,
    });
    if (!gl) {
      throw new Error(
        "[Kurai2D] > Could not acquire a WebGL2 context. Ensure the canvas is valid and WebGL2 is supported."
      );
    }

    this.gl = gl;
    GLManager.setGL(gl);
    /**
     * The RenderContext holding this engine's GL state. Objects created while
     * it is current belong to this engine.
     */
    this.context = GLManager.getContext();
    this.context.canvas = canvas;
    this._initProgram(gl);
    this._bindContextGuards(canvas);
    this.camera = new Camera();
    this.cameras = [this.camera];
    this.context.camera = this.camera;

    this.ambientLight = new Vector3(1.0, 1.0, 1.0);
    this.pointLights = [];
    this.directionalLights = [];
    this.debugLogged = false;

    this.cullingEnabled = true;

    /** @private */
    this._drawOrder = [];
    /**
     * Auto-batches consecutive plain-Texture objects that qualify (see
     * isAutoBatchable in render/DrawList.js) into single draw calls instead of
     * one drawArrays per object.
     * @private
     */
    this._autoBatch = new SpriteBatch();
    /** @private */
    this._projection = mat4.create();
    /** @private */
    this._view = mat4.create();
    /** @private */
    this._identityView = mat4.create();
    /** @private */
    this._lights = new LightUniforms();
    this.backgroundColor = {
      r: 0.0,
      g: 0.0,
      b: 0.0,
      a: 1.0,
    };

    this.postProcessor = null;
    /** @private */
    this._sceneRT = null;

    this.designResolution = null;

    /** @private */
    this._loop = new GameLoop({ isBlocked: () => this._contextLost });

    this.tickGlobals = tickGlobals;
    if (tickGlobals) {
      if (globalTickers.size > 0) {
        console.warn(
          "[Kurai2D] > Another engine already ticks Time/Tween/Timer/Coroutine. Pass { tickGlobals: false } to secondary engines so they advance once per frame."
        );
      }
      globalTickers.add(this);
    }
    /** @private */
    this._destroyed = false;
  }

  /**
   * @method makeCurrent
   * @description Makes this engine's RenderContext current. Objects created
   * afterwards (textures, shapes, render targets, materials...) belong to
   * this engine. Only needed when several engines share a page: a new engine
   * is current right after construction, and each engine makes itself
   * current while it draws.
   * @returns {Kurai2D} - this
   */
  makeCurrent() {
    GLManager.makeCurrent(this.context);
    return this;
  }

  /**
   * @method _initProgram
   * @description Compiles the standard shader program and publishes it to the
   * engine's RenderContext. Called from the constructor and again after a
   * WebGL context loss is restored (all programs die with the context).
   * @private
   */
  _initProgram(gl) {
    this.programInfo = createStandardProgramInfo(gl);
    this.shaderProgram = this.programInfo.program;
    this.context.programInfo = this.programInfo;
  }

  /**
   * @method _bindContextGuards
   * @description Installs webglcontextlost/restored handlers: on loss the
   * default (context is gone for good) is prevented and rendering pauses; on
   * restore every GPU resource is rebuilt and rendering resumes.
   * @private
   */
  _bindContextGuards(canvas) {
    /** @private */
    this._canvas = canvas;
    /** @private */
    this._contextLost = false;
    /** @private */
    this._contextLostHandlers = [];
    /** @private */
    this._contextRestoredHandlers = [];
    /** @private */
    this._onCtxLost = (e) => {
      e.preventDefault();
      this._contextLost = true;
      console.warn(
        "[Kurai2D] > WebGL context lost, rendering paused until restore."
      );
      for (const h of this._contextLostHandlers) h();
    };
    /** @private */
    this._onCtxRestored = () => {
      try {
        this._restoreContext();
        console.info("[Kurai2D] > WebGL context restored.");
      } catch (err) {
        console.error("[Kurai2D] > Context restore failed:", err);
      }
    };
    canvas.addEventListener("webglcontextlost", this._onCtxLost, false);
    canvas.addEventListener("webglcontextrestored", this._onCtxRestored, false);
  }

  /**
   * @method getRenderStats
   * @description Render counters for this engine's most recent completed
   * frame: { drawCalls, quads, textureBinds }. DebugOverlay shows these
   * automatically.
   * @returns {{drawCalls:number, quads:number, textureBinds:number}}
   */
  getRenderStats() {
    return this.context.frameStats;
  }

  /**
   * @method onContextLost
   * @description Registers a callback fired when the WebGL context is lost
   * (e.g. to show a "please wait" overlay).
   * @param {Function} cb
   * @returns {Kurai2D} - this
   */
  onContextLost(cb) {
    if (typeof cb === "function") this._contextLostHandlers.push(cb);
    return this;
  }

  /**
   * @method onContextRestored
   * @description Registers a callback fired after the context and all GPU
   * resources have been rebuilt.
   * @param {Function} cb
   * @returns {Kurai2D} - this
   */
  onContextRestored(cb) {
    if (typeof cb === "function") this._contextRestoredHandlers.push(cb);
    return this;
  }

  /**
   * @method _restoreContext
   * @description Rebuilds everything the GPU forgot: the standard program,
   * cached textures (from the surviving image cache), every registered
   * drawable's buffers, custom Materials, post-processing programs, the
   * auto-batch and the scene render target. Runs on the webglcontextrestored
   * event.
   * @private
   */
  _restoreContext() {
    const gl = this.gl;
    this.makeCurrent();
    this._initProgram(gl);
    GLState.reset();
    TextureManager.restoreAll();
    GLManager.restoreAll();
    this._autoBatch = new SpriteBatch();
    if (this._sceneRT) {
      const canvas = gl.canvas;
      this._sceneRT = new RenderTarget(
        Math.max(2, canvas.width),
        Math.max(2, canvas.height)
      );
    }
    this._contextLost = false;
    for (const h of this._contextRestoredHandlers) h();
  }

  /**
   * @method destroy
   * @description Stops the loop, removes the engine's event listeners and
   * releases its post-processing resources. The engine can't be used
   * afterwards. Use it when tearing down one of several engines on a page.
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.stop();
    if (this._canvas) {
      this._canvas.removeEventListener("webglcontextlost", this._onCtxLost);
      this._canvas.removeEventListener(
        "webglcontextrestored",
        this._onCtxRestored
      );
    }
    if (this.postProcessor) this.postProcessor.dispose();
    if (this._sceneRT) this._sceneRT.dispose();
    this.postProcessor = null;
    this._sceneRT = null;
    globalTickers.delete(this);
  }

  /**
   * @method setDesignResolution
   * @description Makes the world render at a fixed design resolution that is
   * scaled to fit any screen, so the game looks consistent across devices and
   * aspect ratios. Modes:
   *  - "fit"     letterbox: preserve aspect, whole design visible, bars on the sides
   *  - "fill"    cover: preserve aspect, fill the screen, crop the overflow
   *  - "stretch" ignore aspect, stretch the design to the screen
   *  - "pixel"   like "fit" but snapped to an integer scale for crisp pixel art
   * Call this once (and again on orientation change if desired); it composes with
   * `resize`. Use `screenToWorld` for correct picking under any mode.
   * @param {number} width - Design width in world units
   * @param {number} height - Design height in world units
   * @param {string} [mode="fit"] - "fit" | "fill" | "stretch" | "pixel"
   */
  setDesignResolution(width, height, mode = "fit") {
    this.designResolution = { width, height, mode };
  }

  /**
   * @method clearDesignResolution
   * @description Disables design-resolution scaling; the world reverts to using
   * the canvas's CSS pixel size as world units.
   */
  clearDesignResolution() {
    this.designResolution = null;
  }

  /**
   * @method _viewportFor
   * @description Viewport rect and world extents for a camera. See
   * computeViewport in render/Viewport.js.
   * @private
   */
  _viewportFor(camera) {
    return computeViewport(this.gl.canvas, camera, this.designResolution);
  }

  /**
   * @method _clientToView
   * @description Maps a client/CSS pixel coordinate to pre-camera view space
   * (origin center, +Y up). This is also the screen-space coordinate used for
   * `screenSpace` objects. Camera transform is applied separately by
   * `screenToWorld`.
   * @private
   * @returns {{x:number, y:number}}
   */
  _clientToView(clientX, clientY, camera = this.camera) {
    return clientToView(
      this.gl.canvas,
      this._viewportFor(camera),
      clientX,
      clientY
    );
  }

  /**
   * @method screenToWorld
   * @description Converts a client/CSS pixel coordinate (e.g. `event.clientX/Y`)
   * to world space for a camera, accounting for device pixel ratio, the active
   * design resolution + fit mode (including letterbox offset), and the camera's
   * position / zoom / rotation. Use this for mouse picking instead of ad-hoc math.
   * @param {number} clientX - Client X (relative to the viewport)
   * @param {number} clientY - Client Y (relative to the viewport)
   * @param {Camera} [camera] - The camera to unproject through (default primary)
   * @returns {Vector2} - World-space position
   */
  screenToWorld(clientX, clientY, camera = this.camera) {
    const { x: vx, y: vy } = this._clientToView(clientX, clientY, camera);

    const zoomX = camera.transform.scale.x || 1;
    const zoomY = camera.transform.scale.y || 1;
    const ux = vx / zoomX;
    const uy = vy / zoomY;

    const rot = -camera.transform.rotation;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const wx = ux * c - uy * s - camera.transform.position.x;
    const wy = ux * s + uy * c - camera.transform.position.y;
    return new Vector2(wx, wy);
  }

  /**
   * @method enablePostProcessing
   * @description Turns on the post-processing pipeline (lazily creating the
   * scene render target and processor). Add effects with addPostEffect.
   * @returns {PostProcessor} - The processor (to add/remove effects)
   */
  enablePostProcessing() {
    if (!this.postProcessor) {
      this.makeCurrent();
      const canvas = this.gl.canvas;
      this._sceneRT = new RenderTarget(canvas.width, canvas.height);
      this.postProcessor = new PostProcessor();
    }
    this.postProcessor.enabled = true;
    return this.postProcessor;
  }

  /**
   * @method disablePostProcessing
   * @description Disables the pipeline (scene renders straight to the canvas).
   */
  disablePostProcessing() {
    if (this.postProcessor) this.postProcessor.enabled = false;
  }

  /**
   * @method addPostEffect
   * @description Appends a post-processing effect (enabling the pipeline if
   * needed). See PostEffects for the built-ins.
   * @param {import("./PostProcessor.js").PostEffect} effect
   * @returns {Kurai2D} - this
   */
  addPostEffect(effect) {
    this.enablePostProcessing().addEffect(effect);
    return this;
  }

  /**
   * @method removePostEffect
   * @description Removes a previously added post-processing effect.
   * @param {import("./PostProcessor.js").PostEffect} effect
   * @returns {Kurai2D} - this
   */
  removePostEffect(effect) {
    if (this.postProcessor) this.postProcessor.removeEffect(effect);
    return this;
  }

  /**
   * @method setAmbientLight
   * @description Sets the ambient light for the scene
   * @param {Vector3} vector3 - The ambient light color as a Vector3 instance
   */
  setAmbientLight(vector3) {
    if (
      vector3 &&
      typeof vector3.x === "number" &&
      typeof vector3.y === "number" &&
      typeof vector3.z === "number"
    ) {
      this.ambientLight = vector3;
    } else {
      console.error("[Kurai2D] > vector3 is not an instance of Vector3 class.");
    }
  }

  /**
   * @method resize
   * @description Resizes the canvas
   * @param {number} width - The width of the canvas
   * @param {number} height - The height of the canvas
   * @param {number} [dpr] - Device pixel ratio override; defaults to
   * `window.devicePixelRatio` (or 1 outside a browser)
   */
  resize(width, height, dpr) {
    const ratio =
      dpr || (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    const canvas = this.gl.canvas;

    if ("style" in canvas && canvas.style) {
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
    }
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);

    this.gl.viewport(0, 0, canvas.width, canvas.height);
  }

  /**
   * @method addPointLight
   * @description Adds a point light to the scene
   * @param {PointLight} pointLight - The point light to add
   */
  addPointLight(pointLight) {
    if (!(pointLight instanceof PointLight)) {
      console.error(
        "[Kurai2D] > Passed argument is not an instance of PointLight class."
      );
      return;
    }
    if (this.pointLights.length < MAX_LIGHTS) {
      this.pointLights.push(pointLight);
    } else {
      console.warn(`Maximum number of point lights reached (${MAX_LIGHTS})`);
    }
  }

  /**
   * @method addDirectionalLight
   * @description Adds a directional light to the scene
   * @param {DirectionalLight} directionalLight - The directional light to add
   */
  addDirectionalLight(directionalLight) {
    if (!(directionalLight instanceof DirectionalLight)) {
      console.error(
        "[Kurai2D] > Passed argument is not an instance of DirectionalLight class."
      );
      return;
    }
    if (this.directionalLights.length < MAX_LIGHTS) {
      this.directionalLights.push(directionalLight);
    } else {
      console.warn(
        `Maximum number of directional lights reached (${MAX_LIGHTS})`
      );
    }
  }

  /**
   * @method removeDirectionalLight
   * @description Removes a directional light from the scene
   * @param {DirectionalLight} directionalLight - The directional light to remove
   */
  removeDirectionalLight(directionalLight) {
    const index = this.directionalLights.indexOf(directionalLight);
    if (index > -1) {
      this.directionalLights.splice(index, 1);
    }
  }

  /**
   * @method setBackgroundColor
   * @description Sets the background color of the scene
   * @param {Color} color - The background color
   */
  setBackgroundColor(color) {
    if (color instanceof Color) {
      this.backgroundColor = {
        r: color.r / 255,
        g: color.g / 255,
        b: color.b / 255,
        a: color.a / 255,
      };
    } else {
      console.error("[Kurai2D] > color is not an instance of Color class.");
    }
  }

  /**
   * @method run
   * @description Starts an engine-owned game loop on requestAnimationFrame. Each
   * frame it computes a delta time (clamped so a tab-switch stall can't produce
   * a huge jump), optionally advances a fixed-timestep simulation, and calls
   * your `update(dt, alpha)`. `alpha` is the 0..1 interpolation factor between
   * the last and next fixed step (1 when no fixed step is configured), so you
   * can render smoothly between simulation ticks.
   *
   * @param {Function} update - `(dt, alpha) => void`, called once per frame
   * @param {Object} [options]
   * @param {number} [options.maxDelta=0.25] - Max dt (seconds) per frame
   * @param {number} [options.fixedStep=0] - Fixed simulation step in seconds
   *   (e.g. 1/60). 0 disables the fixed loop.
   * @param {Function} [options.fixedUpdate] - `(step) => void`, called 0..N
   *   times per frame to advance the fixed-timestep simulation
   * @param {number} [options.maxSubSteps=5] - Cap on fixed steps per frame
   * @param {boolean} [options.pauseOnBlur=true] - Auto-pause when the tab is
   *   hidden/minimized (and on window blur if `pauseOnWindowBlur` is set)
   * @param {boolean} [options.pauseOnWindowBlur=false] - Also pause on window blur
   * @param {Function} [options.onPause] - Called when the loop pauses
   * @param {Function} [options.onResume] - Called when the loop resumes
   * @returns {Function} - A stop function (same as calling `stop()`)
   */
  run(update, options = {}) {
    this._loop.start(update, options);
    return () => this.stop();
  }

  /**
   * @method stop
   * @description Stops a loop previously started with run().
   */
  stop() {
    this._loop.stop();
  }

  /**
   * @method pause
   * @description Pauses the loop: `update`/`fixedUpdate` stop being called while
   * the RAF keeps spinning. Time doesn't accumulate, so resuming produces no dt
   * spike. Fires the `onPause` callback once.
   */
  pause() {
    this._loop.pause();
  }

  /**
   * @method resume
   * @description Resumes a paused loop and resyncs the clock so the first frame
   * after resuming has ~0 dt. Fires the `onResume` callback once.
   */
  resume() {
    this._loop.resume();
  }

  /**
   * @method isPaused
   * @description Whether the loop started with run() is paused.
   * @returns {boolean}
   */
  isPaused() {
    return this._loop.paused;
  }

  /**
   * @method drawScene
   * @description Draws the scene
   * @param {import("./Scene.js").default} scene - The scene to draw
   * @param {number} deltaTime - The delta time
   */
  drawScene(scene, deltaTime) {
    if (this._contextLost || this._destroyed) return;
    this.makeCurrent();
    RenderStats.beginFrame();

    if (this.tickGlobals) {
      Time.setDeltaTime(deltaTime);
      const scaledDelta = Time.getDeltaTime();
      Tween.update(scaledDelta);
      Timer.update(scaledDelta);
      Coroutine.update(scaledDelta);
    }

    for (let i = 0; i < scene.objects.length; i++) {
      const object = scene.objects[i];
      if (object && typeof object.syncPhysics === "function") {
        object.syncPhysics();
      }
    }

    const gl = this.gl;
    const canvas = gl.canvas;

    const usePost = this.postProcessor && this.postProcessor.hasEffects();
    if (usePost) {
      this._sceneRT.resize(canvas.width, canvas.height);
      this._sceneRT.bind();
    }

    this._beginPass();
    const bg = this.backgroundColor || { r: 0, g: 0, b: 0, a: 1 };
    gl.clearColor(bg.r, bg.g, bg.b, bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const order = buildDrawOrder(this._drawOrder, scene.objects);
    const now = performance.now();

    const postExcluded = [];
    for (const camera of this.cameras) {
      if (!camera || !camera.active) continue;
      if (usePost && camera.excludeFromPost) {
        postExcluded.push(camera);
        continue;
      }
      this._renderCamera(camera, order, now);
    }

    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, canvas.width, canvas.height);

    if (usePost) {
      this._sceneRT.unbind();
      this.postProcessor.process(
        this._sceneRT.texture,
        canvas.width,
        canvas.height,
        now / 1000
      );

      if (postExcluded.length) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this._beginPass();
        for (const camera of postExcluded) {
          this._renderCamera(camera, order, now);
        }
        gl.disable(gl.SCISSOR_TEST);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    }
  }

  /**
   * @method _beginPass
   * @description Resets blend/depth/viewport state and binds the standard
   * program at the start of a render pass.
   * @private
   */
  _beginPass() {
    const gl = this.gl;
    const canvas = gl.canvas;
    gl.clearDepth(1.0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(this.programInfo.program);
    GLState.reset();
  }

  /**
   * @method _renderCamera
   * @description Renders the sorted draw order through a single camera into its
   * viewport rectangle.
   * @private
   */
  _renderCamera(camera, order, now) {
    const gl = this.gl;
    const uniforms = this.programInfo.uniformLocations;

    const { px, py, pw, ph, worldW, worldH } = this._viewportFor(camera);
    gl.viewport(px, py, pw, ph);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(px, py, pw, ph);

    if (camera.clearColor) {
      const c = camera.clearColor;
      gl.clearColor(c.r / 255, c.g / 255, c.b / 255, c.a / 255);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    const projectionMatrix = this._projection;
    mat4.ortho(
      projectionMatrix,
      -worldW / 2,
      worldW / 2,
      -worldH / 2,
      worldH / 2,
      -100,
      100
    );
    GLManager.setProjection(/** @type {Float32Array} */ (projectionMatrix));

    const view = this._view;
    mat4.identity(view);
    mat4.scale(view, view, [
      camera.transform.scale.x,
      camera.transform.scale.y,
      1,
    ]);
    mat4.rotate(view, view, camera.transform.rotation, [0, 0, 1]);
    let camTX = camera.transform.position.x;
    let camTY = camera.transform.position.y;
    if (camera.pixelSnap && camera.transform.rotation === 0) {
      const zx = camera.transform.scale.x || 1;
      const zy = camera.transform.scale.y || 1;
      camTX = Math.round(camTX * zx) / zx;
      camTY = Math.round(camTY * zy) / zy;
    }
    mat4.translate(view, view, [camTX, camTY, camera.transform.position.z]);

    gl.uniformMatrix4fv(uniforms.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(uniforms.globalViewMatrix, false, view);
    gl.uniformMatrix4fv(uniforms.instancedModelViewMatrix, false, view);

    const camX = camera.transform.position.x;
    const camY = camera.transform.position.y;
    const zoom = camera.transform.scale.x || 1;

    this._lights.pack(
      this.ambientLight,
      this.pointLights,
      this.directionalLights,
      camX,
      camY,
      zoom
    );
    this._lights.upload(gl, uniforms);

    const halfW = worldW / 2 / zoom;
    const halfH = worldH / 2 / zoom;
    const viewLeft = -camX - halfW;
    const viewRight = -camX + halfW;
    const viewBottom = -camY - halfH;
    const viewTop = -camY + halfH;

    const ignoreLayers = camera.ignoreLayers;
    const onlyLayers = camera.onlyLayers;
    const batch = this._autoBatch;
    batch.begin(projectionMatrix, view);
    let batchPending = false;
    for (const object of order) {
      const objLayer = object.layer || 0;
      if (onlyLayers && !onlyLayers.has(objLayer)) {
        continue;
      }
      if (ignoreLayers && ignoreLayers.size && ignoreLayers.has(objLayer)) {
        continue;
      }
      if (
        this.cullingEnabled &&
        !object.screenSpace &&
        !isVisible(object, viewLeft, viewRight, viewBottom, viewTop)
      ) {
        continue;
      }

      if (!object.screenSpace) {
        const drawable = object.getComponent(Drawable);
        if (drawable && isAutoBatchable(drawable)) {
          queueBatchedDraw(batch, drawable, object, now);
          batchPending = true;
          continue;
        }
      }

      if (batchPending) {
        batch.flush();
        gl.useProgram(this.programInfo.program);
        batchPending = false;
      }

      const objView = object.screenSpace ? this._identityView : view;
      object.draw(objView, uniforms.globalViewMatrix, now);
    }
    if (batchPending) {
      batch.flush();
      gl.useProgram(this.programInfo.program);
    }
  }

  /**
   * @method addCamera
   * @description Adds a camera to the render list (for split-screen, etc.).
   * @param {Camera} camera - The camera to add
   */
  addCamera(camera) {
    if (this.cameras.indexOf(camera) === -1) this.cameras.push(camera);
  }

  /**
   * @method removeCamera
   * @description Removes a camera from the render list.
   * @param {Camera} camera - The camera to remove
   */
  removeCamera(camera) {
    const idx = this.cameras.indexOf(camera);
    if (idx !== -1) this.cameras.splice(idx, 1);
  }

  /**
   * @method setCameras
   * @description Replaces the camera list. The first camera becomes the primary
   * `this.camera`.
   * @param {Camera[]} cameras - The cameras to render
   */
  setCameras(cameras) {
    this.cameras = cameras.slice();
    if (this.cameras.length > 0) {
      this.camera = this.cameras[0];
      this.context.camera = this.camera;
    }
  }

  /**
   * @method setCullingEnabled
   * @description Enables or disables off-screen object culling.
   * @param {boolean} enabled - Whether culling is enabled
   */
  setCullingEnabled(enabled) {
    this.cullingEnabled = enabled;
  }
}

export default Kurai2D;
