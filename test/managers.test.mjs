import { test } from "node:test";
import assert from "node:assert/strict";

import SceneManager from "../src/managers/SceneManager.js";
import CameraManager from "../src/managers/CameraManager.js";
import EventManager from "../src/managers/EventManager.js";
import AssetManager from "../src/managers/AssetManager.js";
import NetworkManager from "../src/managers/NetworkManager.js";
import Scene from "../src/Scene.js";

test("SceneManager.setScene/getScene round-trip", () => {
  const scene = new Scene();
  SceneManager.setScene(scene);
  assert.equal(SceneManager.getScene(), scene);
});

test("SceneManager.transitionTo swaps the scene and runs onSwap without a fade", async () => {
  const before = new Scene();
  const after = new Scene();
  SceneManager.setScene(before);

  let swapped = null;
  const result = await SceneManager.transitionTo(after, {
    onSwap: (scene) => {
      swapped = scene;
    },
  });

  assert.equal(SceneManager.getScene(), after);
  assert.equal(swapped, after);
  assert.equal(result, after);
});

test("SceneManager.transitionTo routes through screenEffects.transition when given", async () => {
  const after = new Scene();
  const calls = [];
  const screenEffects = {
    transition: async (swap, options) => {
      calls.push(options);
      await swap();
    },
  };

  await SceneManager.transitionTo(after, {
    screenEffects,
    duration: 0.5,
    onSwap: () => calls.push("swapped"),
  });

  assert.equal(SceneManager.getScene(), after);
  assert.deepEqual(calls[0], { duration: 0.5 });
  assert.equal(calls[1], "swapped");
});

test("CameraManager stores and returns the active camera and last position", () => {
  const camera = { name: "main" };
  CameraManager.setCamera(camera);
  assert.equal(CameraManager.getCamera(), camera);

  const pos = { x: 3, y: 4 };
  CameraManager.setLastPosition(pos);
  assert.equal(CameraManager.getLastPosition(), pos);
});

test("CameraManager.getCamera warns and returns null when nothing was set", () => {
  CameraManager.camera = null;
  const originalWarn = console.warn;
  let warned = false;
  console.warn = () => {
    warned = true;
  };
  const result = CameraManager.getCamera();
  console.warn = originalWarn;

  assert.equal(result, null);
  assert.equal(warned, true);
});

/**
 * A minimal DOM stand-in: EventManager only ever calls addEventListener,
 * removeEventListener and getBoundingClientRect.
 */
function fakeCanvas() {
  return {
    listeners: new Map(),
    style: {},
    addEventListener(type, fn) {
      this.listeners.set(type, fn);
    },
    removeEventListener(type) {
      this.listeners.delete(type);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 600 };
    },
  };
}

function fakeCamera() {
  return {
    transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 } },
    viewport: { x: 0, y: 0, width: 1, height: 1 },
  };
}

function fakeObject(id, { x = 0, y = 0, hw = 10, hh = 10, z = 0 } = {}) {
  return {
    id,
    isActive: true,
    transform: { position: { x, y, z }, scale: { x: hw, y: hh } },
    getComponent: () => null,
  };
}

test("EventManager.screenToWorld inverts the camera's projection at zoom 1", () => {
  const originalWindow = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const canvas = fakeCanvas();
  const camera = fakeCamera();
  const scene = { objects: [] };
  const em = new EventManager(canvas, scene, camera);

  const world = em.screenToWorld(400, 300);
  assert.ok(Math.abs(world.x) < 1e-9);
  assert.ok(Math.abs(world.y) < 1e-9);

  em.clean();
  globalThis.window = originalWindow;
});

test("EventManager tracks key state and dispatches key listeners", () => {
  const originalWindow = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const em = new EventManager(fakeCanvas(), { objects: [] }, fakeCamera());

  let pressed = 0;
  em.addKeyDown("a", () => pressed++);
  em.handleKeyDown({ key: "a" });
  assert.equal(em.isKeyPressed("a"), true);
  assert.equal(pressed, 1);

  em.handleKeyUp({ key: "a" });
  assert.equal(em.isKeyPressed("a"), false);

  em.clean();
  globalThis.window = originalWindow;
});

test("EventManager dispatches click listeners for the topmost hit object", () => {
  const originalWindow = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const scene = { objects: [fakeObject(1, { z: 0 }), fakeObject(2, { z: 5 })] };
  const em = new EventManager(fakeCanvas(), scene, fakeCamera());

  const hits = [];
  em.addClickEvent(scene.objects[0], (e, obj) => hits.push(obj.id));
  em.addClickEvent(scene.objects[1], (e, obj) => hits.push(obj.id));
  em.handleClick({ clientX: 400, clientY: 300 });

  assert.deepEqual(hits, [2], "the higher-z object under the cursor wins");

  em.clean();
  globalThis.window = originalWindow;
});

test("EventManager fires hover enter/leave as the pointer moves between objects", () => {
  const originalWindow = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const a = fakeObject("a", { x: -100, y: 0 });
  const b = fakeObject("b", { x: 100, y: 0 });
  const scene = { objects: [a, b] };
  const em = new EventManager(fakeCanvas(), scene, fakeCamera());

  const events = [];
  em.addHoverEvent(
    a,
    () => events.push("enter-a"),
    () => events.push("leave-a")
  );
  em.addHoverEvent(
    b,
    () => events.push("enter-b"),
    () => events.push("leave-b")
  );

  em.handleMouseMove({ clientX: 400 - 100, clientY: 300 });
  em.handleMouseMove({ clientX: 400 + 100, clientY: 300 });

  assert.deepEqual(events, ["enter-a", "leave-a", "enter-b"]);

  em.clean();
  globalThis.window = originalWindow;
});

test("EventManager.clean removes its listeners and clears pressed keys", () => {
  const originalWindow = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const canvas = fakeCanvas();
  const em = new EventManager(canvas, { objects: [] }, fakeCamera());

  em.handleKeyDown({ key: "x" });
  assert.equal(em.isKeyPressed("x"), true);

  em.clean();
  assert.equal(em.isKeyPressed("x"), false);
  assert.equal(canvas.listeners.has("click"), false);

  globalThis.window = originalWindow;
});

test("AssetManager loads json/text through fetch and tracks progress", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (path) => ({
    ok: true,
    json: async () => ({ path }),
    text: async () => `body:${path}`,
  });

  const assets = new AssetManager();
  const progressCalls = [];
  assets
    .json("level", "level.json")
    .text("readme", "readme.txt")
    .onProgress((loaded, total) => progressCalls.push([loaded, total]));

  await assets.load();

  assert.deepEqual(assets.get("level"), { path: "level.json" });
  assert.equal(assets.get("readme"), "body:readme.txt");
  assert.equal(assets.progress(), 1);
  assert.equal(progressCalls.length, 2);

  globalThis.fetch = originalFetch;
});

test("AssetManager.load rejects on a failed fetch unless continueOnError is set", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 404 });

  const strict = new AssetManager().json("missing", "nope.json");
  await assert.rejects(() => strict.load());

  const lenient = new AssetManager().json("missing", "nope.json");
  await lenient.load({ continueOnError: true });
  assert.equal(lenient.get("missing"), null);

  globalThis.fetch = originalFetch;
});

test("AssetManager.get/has/clear behave after loading", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => 42 });

  const assets = new AssetManager().json("n", "n.json");
  await assets.load();

  assert.equal(assets.has("n"), true);
  assert.equal(assets.has("missing"), false);
  assets.clear();
  assert.equal(assets.has("n"), false);
  assert.equal(assets.progress(), 1);

  globalThis.fetch = originalFetch;
});

test("NetworkManager.join throws before connect", async () => {
  const net = new NetworkManager();
  await assert.rejects(() => net.join("arena"), /connect\(\) before join\(\)/);
});

/**
 * A fake Colyseus room: enough of the real API for _wireRoom and send() to
 * exercise their full dispatch paths without a real server.
 */
function fakeRoom() {
  const handlers = { stateChange: null, leave: null, messages: new Map() };
  return {
    sessionId: "session-1",
    sent: [],
    handlers,
    onStateChange(fn) {
      handlers.stateChange = fn;
    },
    onLeave(fn) {
      handlers.leave = fn;
    },
    onMessage(type, fn) {
      handlers.messages.set(type, fn);
    },
    send(type, payload) {
      this.sent.push([type, payload]);
    },
    async leave() {
      this.left = true;
    },
  };
}

test("NetworkManager wires onStateChange/onMessage/onLeave through a joined room", async () => {
  const net = new NetworkManager();
  const room = fakeRoom();
  net.client = { joinOrCreate: async () => room };

  const states = [];
  const hits = [];
  const leaves = [];
  net.onStateChange((s) => states.push(s));
  net.onMessage("hit", (m) => hits.push(m));
  net.onLeave((code) => leaves.push(code));

  await net.join("arena", { name: "p1" });

  room.handlers.stateChange({ hp: 10 });
  room.handlers.messages.get("hit")({ dmg: 5 });
  room.handlers.leave(1000);

  assert.deepEqual(states, [{ hp: 10 }]);
  assert.deepEqual(hits, [{ dmg: 5 }]);
  assert.deepEqual(leaves, [1000]);
  assert.equal(net.sessionId, "session-1");
});

test("NetworkManager.onMessage registered after join wires directly onto the room", async () => {
  const net = new NetworkManager();
  const room = fakeRoom();
  net.client = { joinOrCreate: async () => room };
  await net.join("arena");

  const hits = [];
  net.onMessage("hit", (m) => hits.push(m));
  room.handlers.messages.get("hit")({ dmg: 1 });

  assert.deepEqual(hits, [{ dmg: 1 }]);
});

test("NetworkManager.send is a no-op with no room, and forwards once joined", async () => {
  const net = new NetworkManager();
  assert.doesNotThrow(() => net.send("ping", {}));

  const room = fakeRoom();
  net.client = { joinOrCreate: async () => room };
  await net.join("arena");
  net.send("ping", { n: 1 });

  assert.deepEqual(room.sent, [["ping", { n: 1 }]]);
});

test("NetworkManager.leave clears the room", async () => {
  const net = new NetworkManager();
  const room = fakeRoom();
  net.client = { joinOrCreate: async () => room };
  await net.join("arena");

  await net.leave();
  assert.equal(net.room, null);
  assert.equal(room.left, true);
});

test("NetworkManager.now increases monotonically from creation", async () => {
  const net = new NetworkManager();
  const t0 = net.now();
  await new Promise((resolve) => setTimeout(resolve, 5));
  const t1 = net.now();
  assert.ok(t1 > t0);
});

test("NetworkManager.connect resolves and sets a client when colyseus.js is available", async () => {
  const net = new NetworkManager();
  await net.connect("ws://localhost:2567");
  assert.ok(net.client);
});
