import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createFakeCanvas,
  createFakeGL,
  flushMicrotasks,
  captureWarnings,
} from "./helpers/fakeWebGL.mjs";
import Kurai2D from "../src/Kurai2D.js";
import GameLoop from "../src/GameLoop.js";
import Scene from "../src/Scene.js";
import Texture from "../src/Texture.js";
import Color from "../src/Color.js";
import Camera from "../src/Camera.js";
import Time from "../src/Time.js";
import CanvasText from "../src/CanvasText.js";
import GameObject from "../src/components/GameObject.js";
import PointLight from "../src/lights/PointLight.js";
import GLManager from "../src/managers/GLManager.js";
import TextureManager from "../src/managers/TextureManager.js";
import { initShaderProgram } from "../src/GLUtils.js";
import { Vector2, Vector3 } from "../src/Physics.js";
import { computeViewport, clientToView } from "../src/render/Viewport.js";
import LightUniforms, { MAX_LIGHTS } from "../src/render/LightUniforms.js";
import {
  buildDrawOrder,
  isVisible,
  isAutoBatchable,
} from "../src/render/DrawList.js";
import {
  writeInstanceMatrix,
  writeInstanceColor,
  frameTexCoords,
} from "../src/instancing/InstanceData.js";
import { mat4, vec3 } from "gl-matrix";

// ---------------------------------------------------------------------------
// Helpers

/** Builds an engine on a fake canvas; destroy it when done. */
function makeEngine(options) {
  const canvas = createFakeCanvas();
  const engine = new Kurai2D(canvas, options);
  return { engine, canvas, gl: canvas.gl };
}

/** Puts a ready texture in the current engine's cache so no image loads. */
function seedTexture(path) {
  TextureManager.textures.set(
    `${path}|nearest`,
    Promise.resolve({ texture: { path }, width: 64, height: 64 })
  );
}

/**
 * A GameObject with an unlit Texture component (lit sprites are never
 * auto-batched), created in the current engine.
 */
function sprite(path, x = 0, { layer = 0, lit = false } = {}) {
  const obj = new GameObject(
    "sprite",
    new Vector3(x, 0, 0),
    0,
    new Vector2(8, 8)
  );
  obj.addComponent(new Texture(path, 0, 0, 1, 1, 1000, true, true, lit));
  obj.setLayer(layer);
  return obj;
}

/**
 * Draws two frames and returns the first one's stats: counters are
 * snapshotted when the next frame begins.
 */
function renderTwice(engine, scene) {
  engine.drawScene(scene, 1 / 60);
  engine.drawScene(scene, 1 / 60);
  return engine.getRenderStats();
}

// ---------------------------------------------------------------------------
// Engine render path (fake WebGL)

test("drawScene batches plain sprites sharing a texture into one draw call", async () => {
  const { engine, gl } = makeEngine();
  try {
    seedTexture("hero.png");
    const scene = new Scene();
    for (let i = 0; i < 5; i++) scene.add(sprite("hero.png", i * 20));
    await flushMicrotasks();

    const stats = renderTwice(engine, scene);
    assert.equal(stats.drawCalls, 1);
    assert.equal(stats.quads, 5);

    gl.clearCalls();
    engine.drawScene(scene, 1 / 60);
    assert.equal(gl.count("drawElements"), 1, "one batched draw");
    assert.equal(gl.count("drawArrays"), 0, "no per-sprite draws");
  } finally {
    engine.destroy();
  }
});

test("lit sprites are drawn one by one", async () => {
  const { engine } = makeEngine();
  try {
    seedTexture("lit.png");
    const scene = new Scene();
    for (let i = 0; i < 3; i++)
      scene.add(sprite("lit.png", i * 20, { lit: true }));
    await flushMicrotasks();
    assert.equal(renderTwice(engine, scene).drawCalls, 3);
  } finally {
    engine.destroy();
  }
});

test("a sprite the batch can't reproduce splits the batch", async () => {
  const { engine } = makeEngine();
  try {
    seedTexture("tiles.png");
    const scene = new Scene();
    scene.add(sprite("tiles.png", 0, { layer: 0 }));
    const additive = sprite("tiles.png", 10, { layer: 1 });
    additive.getComponent(Texture).setBlendMode("additive");
    scene.add(additive);
    scene.add(sprite("tiles.png", 20, { layer: 2 }));
    await flushMicrotasks();

    const stats = renderTwice(engine, scene);
    assert.equal(stats.drawCalls, 3, "batch, single additive draw, batch");
    assert.equal(stats.quads, 3);
  } finally {
    engine.destroy();
  }
});

test("off-screen sprites are culled unless alwaysVisible", async () => {
  const { engine } = makeEngine();
  try {
    seedTexture("a.png");
    const scene = new Scene();
    scene.add(sprite("a.png", 0));
    const far = sprite("a.png", 100000);
    scene.add(far);
    await flushMicrotasks();

    assert.equal(renderTwice(engine, scene).quads, 1);
    far.alwaysVisible = true;
    assert.equal(renderTwice(engine, scene).quads, 2);
  } finally {
    engine.destroy();
  }
});

test("lights are uploaded once per camera with the standard program", async () => {
  const { engine, gl } = makeEngine();
  try {
    engine.addPointLight(
      new PointLight(new Vector2(0, 0), new Color(255, 0, 0, 255), 1, 100)
    );
    engine.addCamera(new Camera({ viewport: { x: 0.5, width: 0.5 } }));
    gl.clearCalls();
    engine.drawScene(new Scene(), 1 / 60);
    const activeLightUploads = gl.calls.filter(
      ([name, args]) =>
        name === "uniform1i" && args[0]?.uniform === "uActiveLights"
    );
    assert.deepEqual(
      activeLightUploads.map(([, args]) => args[1]),
      [1, 1],
      "one point light, uploaded for each of the two cameras"
    );
  } finally {
    engine.destroy();
  }
});

// ---------------------------------------------------------------------------
// Several engines on one page

test("each engine keeps its own context, textures and render stats", async () => {
  const a = makeEngine();
  const b = makeEngine({ tickGlobals: false });
  try {
    a.engine.makeCurrent();
    seedTexture("shared.png");
    const sceneA = new Scene();
    for (let i = 0; i < 3; i++) sceneA.add(sprite("shared.png", i * 20));

    b.engine.makeCurrent();
    seedTexture("shared.png");
    const sceneB = new Scene([sprite("shared.png")]);
    await flushMicrotasks();

    assert.notEqual(a.engine.context, b.engine.context);
    assert.notEqual(a.engine.context.textures, b.engine.context.textures);
    assert.equal(sceneA.objects[0].getComponent(Texture).gl, a.gl);
    assert.equal(sceneB.objects[0].getComponent(Texture).gl, b.gl);

    a.gl.clearCalls();
    b.gl.clearCalls();
    for (let i = 0; i < 2; i++) {
      a.engine.drawScene(sceneA, 1 / 60);
      b.engine.drawScene(sceneB, 1 / 60);
    }
    assert.equal(a.engine.getRenderStats().quads, 3);
    assert.equal(b.engine.getRenderStats().quads, 1);
    assert.equal(GLManager.getGL(), b.gl, "the last engine to draw is current");
    assert.ok(a.gl.count("drawElements") > 0);
    assert.ok(b.gl.count("drawElements") > 0);
  } finally {
    a.engine.destroy();
    b.engine.destroy();
  }
});

test("only engines with tickGlobals advance Time", () => {
  const main = makeEngine();
  const secondary = makeEngine({ tickGlobals: false });
  try {
    main.engine.drawScene(new Scene(), 0.02);
    secondary.engine.drawScene(new Scene(), 0.5);
    assert.equal(Time.getDeltaTime(), 0.02);
  } finally {
    main.engine.destroy();
    secondary.engine.destroy();
  }
});

test("a second engine ticking globals triggers a warning", () => {
  const first = makeEngine();
  let second;
  try {
    const warnings = captureWarnings(() => {
      second = makeEngine();
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /tickGlobals: false/);
  } finally {
    first.engine.destroy();
    second?.engine.destroy();
  }
});

// ---------------------------------------------------------------------------
// Context loss and teardown

test("context restore rebuilds the auto-batch so sprites keep drawing", async () => {
  const { engine, canvas } = makeEngine();
  const log = { info: console.info, warn: console.warn };
  console.info = () => {};
  console.warn = () => {};
  try {
    seedTexture("hero.png");
    const scene = new Scene([sprite("hero.png"), sprite("hero.png", 20)]);
    await flushMicrotasks();

    const batchBefore = engine._autoBatch;
    canvas.dispatch("webglcontextlost", { preventDefault() {} });
    canvas.dispatch("webglcontextrestored");
    assert.notEqual(engine._autoBatch, batchBefore, "batch recreated");

    await flushMicrotasks();
    const stats = renderTwice(engine, scene);
    assert.equal(stats.drawCalls, 1);
    assert.equal(stats.quads, 2);
  } finally {
    console.info = log.info;
    console.warn = log.warn;
    engine.destroy();
  }
});

test("destroy removes the context listeners and stops rendering", () => {
  const { engine, canvas, gl } = makeEngine();
  assert.equal(canvas.listenerCount("webglcontextlost"), 1);
  engine.destroy();
  assert.equal(canvas.listenerCount("webglcontextlost"), 0);
  assert.equal(canvas.listenerCount("webglcontextrestored"), 0);
  gl.clearCalls();
  engine.drawScene(new Scene(), 1 / 60);
  assert.equal(gl.calls.length, 0);
});

// ---------------------------------------------------------------------------
// Pure render helpers

test("computeViewport without a design resolution uses the CSS size", () => {
  const canvas = {
    width: 1600,
    height: 1200,
    clientWidth: 800,
    clientHeight: 600,
  };
  const cam = { viewport: { x: 0.5, y: 0, width: 0.5, height: 1 } };
  assert.deepEqual(computeViewport(canvas, cam, null), {
    px: 800,
    py: 0,
    pw: 800,
    ph: 1200,
    worldW: 400,
    worldH: 600,
  });
});

test("computeViewport letterboxes in fit mode and snaps in pixel mode", () => {
  const canvas = {
    width: 1000,
    height: 500,
    clientWidth: 1000,
    clientHeight: 500,
  };
  const cam = { viewport: { x: 0, y: 0, width: 1, height: 1 } };

  const fit = computeViewport(canvas, cam, {
    width: 320,
    height: 180,
    mode: "fit",
  });
  assert.equal(fit.ph, 500);
  assert.equal(fit.pw, Math.floor(320 * (500 / 180)));
  assert.equal(fit.px, Math.floor((1000 - 320 * (500 / 180)) / 2));
  assert.deepEqual([fit.worldW, fit.worldH], [320, 180]);

  const pixel = computeViewport(canvas, cam, {
    width: 320,
    height: 180,
    mode: "pixel",
  });
  assert.deepEqual([pixel.pw, pixel.ph], [640, 360], "integer scale 2");

  const fill = computeViewport(canvas, cam, {
    width: 320,
    height: 180,
    mode: "fill",
  });
  assert.deepEqual([fill.pw, fill.ph], [1000, 500]);
  assert.equal(fill.worldW, 320, "fill crops the height, keeps the width");
});

test("clientToView maps the viewport center to the origin", () => {
  const canvas = {
    width: 800,
    height: 600,
    clientWidth: 800,
    clientHeight: 600,
  };
  const vp = computeViewport(
    canvas,
    { viewport: { x: 0, y: 0, width: 1, height: 1 } },
    null
  );
  assert.deepEqual(clientToView(canvas, vp, 400, 300), { x: 0, y: 0 });
  assert.deepEqual(clientToView(canvas, vp, 800, 0), { x: 400, y: 300 });
});

test("LightUniforms packs lights into view space and caps the count", () => {
  const lights = new LightUniforms();
  const point = (x) => ({
    position: { x, y: 5 },
    color: { r: 255, g: 0, b: 51 },
    intensity: 2,
    radius: 10,
  });
  lights.pack(
    { x: 0.1, y: 0.2, z: 0.3 },
    Array.from({ length: MAX_LIGHTS + 2 }, (_, i) => point(i)),
    [],
    100,
    0,
    2
  );
  assert.equal(lights.pointCount, MAX_LIGHTS);
  assert.equal(lights.dirCount, 0);
  assert.equal(lights.pointPositions[0], (0 + 100) * 2);
  assert.equal(lights.pointPositions[1], 5 * 2);
  assert.equal(lights.pointRadii[0], 20);
  assert.ok(Math.abs(lights.pointColors[2] - 0.2) < 1e-6);
  assert.ok(Math.abs(lights.ambient[2] - 0.3) < 1e-6);
});

test("buildDrawOrder sorts by layer, then z, then texture", () => {
  const obj = (name, layer, z, path) => ({
    name,
    layer,
    transform: { position: { z } },
    getComponent: () => (path ? { useTexture: true, texturePath: path } : null),
  });
  const objects = [
    obj("top", 2, 0, "a.png"),
    obj("b-tex", 0, 0, "b.png"),
    obj("front", 0, 5, "a.png"),
    obj("a-tex", 0, 0, "a.png"),
    obj("untextured", 0, 0, null),
  ];
  const order = buildDrawOrder([], objects).map((o) => o.name);
  assert.deepEqual(order, ["untextured", "a-tex", "b-tex", "front", "top"]);
});

test("isVisible culls by the view rectangle with a safety margin", () => {
  const at = (x, extra = {}) => ({
    transform: { position: { x, y: 0 }, scale: { x: 10, y: 10 } },
    getComponent: () => null,
    ...extra,
  });
  assert.equal(isVisible(at(0), -100, 100, -100, 100), true);
  assert.equal(isVisible(at(110), -100, 100, -100, 100), true, "margin");
  assert.equal(isVisible(at(200), -100, 100, -100, 100), false);
  assert.equal(
    isVisible(at(200, { alwaysVisible: true }), -100, 100, -100, 100),
    true
  );
});

test("isAutoBatchable only accepts plain, unlit, normally blended textures", () => {
  const plain = () =>
    Object.assign(Object.create(Texture.prototype), {
      useTexture: true,
      texture: {},
      isWireframe: false,
      material: null,
      useLighting: false,
      blendMode: "normal",
      _hasPivot: false,
    });
  assert.equal(isAutoBatchable(plain()), true);
  assert.equal(
    isAutoBatchable({ ...plain(), texture: null }),
    false,
    "not a Texture instance"
  );
  for (const [key, value] of [
    ["texture", null],
    ["useLighting", true],
    ["blendMode", "additive"],
    ["material", {}],
    ["isWireframe", true],
    ["_hasPivot", true],
  ]) {
    const d = plain();
    d[key] = value;
    assert.equal(isAutoBatchable(d), false, key);
  }
  class Custom extends Texture {}
  const sub = Object.assign(Object.create(Custom.prototype), plain());
  assert.equal(isAutoBatchable(sub), false, "subclasses draw themselves");
});

// ---------------------------------------------------------------------------
// Instancing data

test("writeInstanceMatrix packs translate/rotate/scale at the instance slot", () => {
  const out = new Float32Array(32);
  const scratch = {
    matrix: mat4.create(),
    pos: vec3.create(),
    scale: vec3.create(),
  };
  const transform = {
    position: { x: 3.4, y: -2.6, z: 1 },
    rotation: 0,
    scale: { x: 2, y: 4 },
  };
  writeInstanceMatrix(out, 1, transform, true, scratch);
  assert.deepEqual(
    Array.from(out.slice(0, 16)),
    new Array(16).fill(0),
    "slot 0 untouched"
  );
  assert.equal(out[16], 2, "scale x");
  assert.equal(out[16 + 5], 4, "scale y");
  assert.deepEqual(
    [out[16 + 12], out[16 + 13], out[16 + 14]],
    [3, -3, 1],
    "pixel-snapped translation"
  );
});

test("writeInstanceColor falls back to opaque white", () => {
  const out = new Float32Array(8);
  writeInstanceColor(out, 0, [0.5, 0.25, 0, 1]);
  writeInstanceColor(out, 1, null);
  assert.deepEqual(Array.from(out), [0.5, 0.25, 0, 1, 1, 1, 1, 1]);
});

test("frameTexCoords picks the frame cell and mirrors horizontally", () => {
  const sheet = {
    frameWidth: 16,
    frameHeight: 16,
    framesPerRow: 4,
    textureWidth: 64,
    textureHeight: 32,
  };
  const uv = frameTexCoords(5, sheet, false);
  const mirrored = frameTexCoords(5, sheet, true);
  // Frame 5 is column 1, row 1 (bottom row of a 2-row sheet).
  const halfTexelX = 0.5 / 64;
  assert.ok(
    Math.abs(uv[0] - (32 / 64 - halfTexelX)) < 1e-9,
    "left edge of UVs"
  );
  assert.ok(Math.abs(uv[2] - (16 / 64 + halfTexelX)) < 1e-9);
  assert.deepEqual(
    [mirrored[0], mirrored[2]],
    [uv[2], uv[0]],
    "mirroring swaps u"
  );
  assert.deepEqual(
    frameTexCoords(0, { ...sheet, frameWidth: 0 }, false),
    [1, 1, 0, 1, 1, 0, 0, 0]
  );
});

// ---------------------------------------------------------------------------
// GameLoop

function manualFrames() {
  const queue = [];
  return {
    requestFrame: (cb) => queue.push(cb),
    cancelFrame: () => {},
    tick(now) {
      const cb = queue.shift();
      if (cb) cb(now);
    },
  };
}

test("GameLoop clamps dt and runs the fixed step with interpolation", () => {
  const frames = manualFrames();
  const loop = new GameLoop(frames);
  const updates = [];
  let fixed = 0;
  loop.start((dt, alpha) => updates.push([dt, alpha]), {
    pauseOnBlur: false,
    fixedStep: 0.125,
    fixedUpdate: () => fixed++,
    maxDelta: 0.25,
  });
  frames.tick(1000);
  frames.tick(1187.5);
  frames.tick(5000);
  loop.stop();

  assert.deepEqual(updates[0], [0, 0], "first frame has no dt");
  assert.equal(updates[1][0], 0.1875);
  assert.equal(updates[1][1], 0.5, "half a step left over");
  assert.equal(updates[2][0], 0.25, "stall clamped to maxDelta");
  assert.equal(
    fixed,
    1 + 2,
    "0.1875s -> 1 step, then 0.0625 + 0.25 -> 2 steps"
  );
});

test("GameLoop pause skips updates and resume avoids a dt spike", () => {
  const frames = manualFrames();
  const loop = new GameLoop(frames);
  const dts = [];
  loop.start((dt) => dts.push(dt), { pauseOnBlur: false });
  frames.tick(0);
  frames.tick(16);
  loop.pause();
  frames.tick(2000);
  loop.resume();
  frames.tick(2016);
  frames.tick(2032);
  loop.stop();
  assert.equal(dts.length, 4);
  assert.equal(dts[2], 0, "first frame after resume");
  assert.ok(Math.abs(dts[3] - 0.016) < 1e-9);
});

test("GameLoop keeps spinning without updates while blocked", () => {
  const frames = manualFrames();
  let blocked = true;
  const loop = new GameLoop({ ...frames, isBlocked: () => blocked });
  let updates = 0;
  loop.start(() => updates++, { pauseOnBlur: false });
  frames.tick(0);
  frames.tick(16);
  blocked = false;
  frames.tick(32);
  loop.stop();
  assert.equal(updates, 1);
});

// ---------------------------------------------------------------------------
// Small fixes

test("CanvasText.setColor accepts a Color as well as a CSS string", () => {
  const text = { text: "hi", setText() {} };
  CanvasText.prototype.setColor.call(text, new Color(255, 0, 0, 255));
  assert.equal(text.fillStyle, "rgba(255, 0, 0, 1)");
  CanvasText.prototype.setColor.call(text, "#00ff00");
  assert.equal(text.fillStyle, "#00ff00");
});

test("a shader compile error is logged, not alerted", () => {
  const gl = createFakeGL({});
  const broken = new Proxy(gl, {
    get: (t, p) => (p === "getShaderParameter" ? () => false : t[p]),
  });
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    initShaderProgram(broken, "vs", "fs");
  } finally {
    console.error = original;
  }
  assert.equal(errors.length, 2, "one per shader");
  assert.match(errors[0], /compiling a shader/);
});
