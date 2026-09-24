import RenderContext from "./RenderContext.js";

/** @type {WeakMap<object, RenderContext>} */
const contextsByGL = new WeakMap();
/** Restorable object -> the context it was registered in. */
const ownerOf = new WeakMap();
/** The context engine objects read from and write to. */
let current = new RenderContext();

/**
 * @class GLManager
 * @description Gives engine objects access to the current WebGL context.
 * State is stored per RenderContext: each Kurai2D engine owns one and makes
 * it current while it renders, and objects created afterwards (textures,
 * shapes, render targets...) bind to the context that was current when they
 * were created. With a single engine this is invisible.
 */
class GLManager {
  /**
   * @method getContext
   * @description Returns the current RenderContext.
   * @returns {RenderContext}
   */
  static getContext() {
    return current;
  }

  /**
   * @method makeCurrent
   * @description Makes a RenderContext current. Engines call this for you
   * (see `Kurai2D#makeCurrent`).
   * @param {RenderContext} context
   */
  static makeCurrent(context) {
    current = context;
  }

  /**
   * @method contextFor
   * @description Returns the RenderContext registered for a WebGL context,
   * or null.
   * @param {object} gl
   * @returns {RenderContext|null}
   */
  static contextFor(gl) {
    return (gl && contextsByGL.get(gl)) || null;
  }

  /**
   * @method setGL
   * @description Makes the RenderContext of `gl` current, creating it on first
   * use. The first call adopts the initial (empty) context so state set
   * before any engine existed is kept.
   * @param {object} gl - The WebGL context
   */
  static setGL(gl) {
    if (!gl) {
      current.gl = null;
      return;
    }
    let context = contextsByGL.get(gl);
    if (!context) {
      if (!current.gl) {
        current.gl = gl;
        current.canvas = gl.canvas || current.canvas;
        context = current;
      } else {
        context = new RenderContext(gl);
      }
      contextsByGL.set(gl, context);
    }
    current = context;
  }

  /**
   * @method setProgramInfo
   * @description Sets the standard program info of the current context.
   * @param {Object} programInfo - The program info
   */
  static setProgramInfo(programInfo) {
    current.programInfo = programInfo;
  }

  /**
   * @method setCanvas
   * @description Sets the canvas of the current context.
   * @param {HTMLCanvasElement} canvas - The canvas
   */
  static setCanvas(canvas) {
    current.canvas = canvas;
  }

  /**
   * @method getGL
   * @description Returns the current WebGL context.
   * @returns {WebGL2RenderingContext} - The WebGL context
   */
  static getGL() {
    return current.gl;
  }

  /**
   * @method getProgramInfo
   * @description Returns the standard program info of the current context.
   * @returns {Object} - The program info
   */
  static getProgramInfo() {
    return current.programInfo;
  }

  /**
   * @method getCanvas
   * @description Returns the canvas of the current context.
   * @returns {HTMLCanvasElement} - The canvas
   */
  static getCanvas() {
    return current.canvas;
  }

  /**
   * @method registerRestorable
   * @description Registers an object holding GL resources (buffers, textures,
   * programs) for re-creation after a WebGL context loss. The object must
   * implement `_restoreGL()`. Drawables register themselves automatically and
   * unregister on dispose(). The object belongs to the current context.
   * @param {Object} obj - An object with a _restoreGL() method
   */
  static registerRestorable(obj) {
    const context = current;
    context.restorables.add(obj);
    ownerOf.set(obj, context);
  }

  /**
   * @method unregisterRestorable
   * @description Removes an object from the context-restore registry of the
   * context it was registered in.
   * @param {Object} obj
   */
  static unregisterRestorable(obj) {
    const context = ownerOf.get(obj) || current;
    context.restorables.delete(obj);
    ownerOf.delete(obj);
  }

  /**
   * @method restoreAll
   * @description Calls _restoreGL() on every object registered in the current
   * context. Invoked by Kurai2D after the context is restored and the default
   * shaders/textures have been rebuilt.
   */
  static restoreAll() {
    for (const obj of current.restorables) {
      try {
        obj._restoreGL();
      } catch (e) {
        console.error("[GLManager] > restore failed for", obj, e);
      }
    }
  }

  /**
   * @method setProjection
   * @description Stores the current camera's projection matrix so custom
   * Materials (which use their own shader program) can upload it.
   * @param {Float32Array} matrix - The projection matrix
   */
  static setProjection(matrix) {
    current.projection = matrix;
  }

  /**
   * @method getProjection
   * @description Returns the last projection matrix set by the renderer.
   * @returns {Float32Array}
   */
  static getProjection() {
    return current.projection;
  }

  /** @returns {WebGL2RenderingContext|null} */
  static get gl() {
    return current.gl;
  }

  /** @returns {Object|null} */
  static get programInfo() {
    return current.programInfo;
  }

  /** @returns {HTMLCanvasElement|null} */
  static get canvas() {
    return current.canvas;
  }

  /** @returns {Float32Array|null} */
  static get projection() {
    return current.projection;
  }

  /** @returns {Set<Object>} */
  static get restorables() {
    return current.restorables;
  }
}

export default GLManager;
