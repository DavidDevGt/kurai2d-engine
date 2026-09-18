import { test } from "node:test";
import assert from "node:assert/strict";

import GLManager from "../src/managers/GLManager.js";
import InstancedTexture from "../src/InstancedTexture.js";
import Instance from "../src/Instance.js";
import { Vector2, Vector3 } from "../src/Physics.js";

/**
 * The narrow slice of the WebGL API InstancedTexture's constructor and
 * buffer-upload methods touch: enough to build a real instance and drive
 * its animation/instance-management logic without a real GPU. draw() itself
 * needs far more of the API (uniforms, vertex attribs, drawArraysInstanced);
 * none of that is exercised here, since animation correctness lives entirely
 * in the CPU-side frame/UV bookkeeping this stubs just enough to run.
 */
function fakeGL() {
  return {
    ARRAY_BUFFER: 1,
    STATIC_DRAW: 2,
    DYNAMIC_DRAW: 3,
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    deleteBuffer: () => {},
  };
}

/**
 * Constructs a real InstancedTexture against the fake GL context. The
 * texture-loading it kicks off in the background always fails in Node (no
 * Image constructor) and is already caught internally; this just keeps that
 * expected, harmless error out of the test output.
 */
function makeInstancedTexture(
  count = 4,
  frames = { frameWidth: 16, frameHeight: 16, framesPerRow: 4, totalFrames: 8 }
) {
  GLManager.setGL(fakeGL());
  GLManager.setProgramInfo({});
  const originalError = console.error;
  console.error = () => {};
  try {
    return new InstancedTexture(
      "fake.png",
      count,
      frames.frameWidth,
      frames.frameHeight,
      frames.framesPerRow,
      frames.totalFrames,
      100,
      false,
      true,
      false
    );
  } finally {
    console.error = originalError;
  }
}

function addInstance(it, x = 0, y = 0) {
  const instance = new Instance(
    "sprite",
    new Vector3(x, y, 0),
    new Vector2(8, 8),
    0,
    0
  );
  it.addInstance(instance);
  return instance;
}

function uvAt(it, index) {
  const offset = index * 8;
  return Array.from(it.instanceTexCoords.slice(offset, offset + 8));
}

test("playAnimation advances every instance's frame in lockstep and loops", () => {
  const it = makeInstancedTexture();
  const a = addInstance(it, 0, 0);
  const b = addInstance(it, 50, 0);

  it.playAnimation([1, 2, 3], 100);
  assert.equal(a.frame, 0);
  assert.equal(b.frame, 0);

  it.update(100);
  assert.equal(a.frame, 1);
  assert.equal(b.frame, 1);

  it.update(200);
  assert.equal(a.frame, 2);
  it.update(300);
  assert.equal(a.frame, 3);
  it.update(400);
  assert.equal(a.frame, 1, "loops back to the start of the sequence");
  assert.equal(b.frame, 1, "both instances stay in lockstep");
});

test("playAnimation's frame changes are actually uploaded to the per-instance UV buffer", () => {
  const it = makeInstancedTexture();
  addInstance(it, 0, 0);

  const uvFrame0 = uvAt(it, 0);
  it.playAnimation([1, 2, 3], 100);
  it.update(100);

  const uvFrame1 = uvAt(it, 0);
  assert.notDeepEqual(
    uvFrame1,
    uvFrame0,
    "advancing the animation changes the uploaded UV coordinates"
  );
  assert.deepEqual(uvFrame1, it.getFrameTexCoords(1));
});

test("playAnimationOnce stops on the last frame instead of looping", () => {
  const it = makeInstancedTexture();
  const a = addInstance(it);

  it.playAnimationOnce([5, 6], 100);
  it.update(100);
  assert.equal(a.frame, 5);
  assert.equal(a.isAnimating, true);

  it.update(200);
  assert.equal(a.frame, 6, "holds on the final frame");
  assert.equal(a.isAnimating, false, "stops itself once the sequence finishes");

  it.update(300);
  assert.equal(a.frame, 6, "no further changes once stopped");
});

test("getAnimation reports the shared animation, empty when none is set", () => {
  const it = makeInstancedTexture();
  assert.deepEqual(it.getAnimation(), []);

  it.playAnimation([1, 2, 3], 250);
  assert.deepEqual(it.getAnimation(), [1, 2, 3]);

  it.playAnimationOnce([4], 250);
  assert.deepEqual(it.getAnimation(), [4]);
});

test("stopAnimation halts every instance and clears the shared default", () => {
  const it = makeInstancedTexture();
  const a = addInstance(it);

  it.playAnimation([1, 2, 3], 100);
  it.update(100);
  assert.equal(a.frame, 1);

  it.stopAnimation();
  assert.equal(a.isAnimating, false);
  assert.deepEqual(it.getAnimation(), []);

  it.update(200);
  assert.equal(a.frame, 1, "no longer advances once stopped");
});

test("stopAnimation(true) reverts every instance to its original frame", () => {
  const it = makeInstancedTexture();
  const a = new Instance(
    "sprite",
    new Vector3(0, 0, 0),
    new Vector2(8, 8),
    0,
    7
  );
  it.addInstance(a);

  it.playAnimation([1, 2, 3], 100);
  it.update(100);
  assert.equal(a.frame, 1);

  it.stopAnimation(true);
  assert.equal(
    a.frame,
    7,
    "reverts to the frame the instance was created with"
  );
});

test("an instance added after playAnimation automatically joins the shared animation", () => {
  const it = makeInstancedTexture();
  it.playAnimation([2, 4, 6], 100);

  const late = addInstance(it, 10, 10);
  assert.equal(late.isAnimating, true);
  assert.equal(late.frame, 0);

  it.update(100);
  assert.equal(late.frame, 2, "advances the same as instances added earlier");
});

test("an instance added after playAnimationOnce joins as a one-shot", () => {
  const it = makeInstancedTexture();
  it.playAnimationOnce([9, 10], 100);

  const late = addInstance(it);
  it.update(100);
  assert.equal(late.frame, 9);
  it.update(200);
  assert.equal(late.frame, 10);
  it.update(300);
  assert.equal(
    late.isAnimating,
    false,
    "the late joiner also stops after one pass"
  );
});

test("animateInstance still gives one instance an independent animation, unaffected by the shared default", () => {
  const it = makeInstancedTexture();
  const shared = addInstance(it, 0, 0);
  const solo = addInstance(it, 20, 0);

  it.playAnimation([1, 2], 100);
  it.animateInstance(solo.id, [50, 60, 70], 100);

  it.update(100);
  assert.equal(shared.frame, 1);
  assert.equal(
    solo.frame,
    50,
    "the individually-animated instance ignores the shared clip"
  );

  it.update(200);
  assert.equal(shared.frame, 2);
  assert.equal(solo.frame, 60);
});

test("stopInstanceAnimation stops one instance without touching the shared animation on the rest", () => {
  const it = makeInstancedTexture();
  const a = addInstance(it);
  const b = addInstance(it);

  it.playAnimation([1, 2, 3], 100);
  it.stopInstanceAnimation(a.id);

  it.update(100);
  assert.equal(a.frame, 0, "stopped instance never advances");
  assert.equal(b.frame, 1, "the rest keep playing the shared animation");
});

test("setInstanceFrame sets a specific frame and uploads its UVs immediately", () => {
  const it = makeInstancedTexture();
  const a = addInstance(it);

  it.setInstanceFrame(a.id, 5);
  assert.equal(a.frame, 5);
  assert.deepEqual(uvAt(it, 0), it.getFrameTexCoords(5));
});
