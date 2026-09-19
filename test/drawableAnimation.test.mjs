import { test } from "node:test";
import assert from "node:assert/strict";

import GLManager from "../src/managers/GLManager.js";
import Texture from "../src/Texture.js";
import Animator from "../src/Animator.js";
import GameObject from "../src/components/GameObject.js";

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

function makeTexture() {
  GLManager.setGL(fakeGL());
  GLManager.setProgramInfo({});
  const originalError = console.error;
  console.error = () => {};
  try {
    return new Texture("fake.png", 16, 16, 8, 32, 100, false, true, false);
  } finally {
    console.error = originalError;
  }
}

const laterThanNow = () => performance.now() + 1;

test("playAnimation shows its first frame immediately, replacing the previous animation's frame", () => {
  const texture = makeTexture();
  texture.playAnimation([24, 25, 26], 100);
  assert.equal(texture.currentFrame, 24);

  texture.playAnimation([8, 9, 10], 100);
  assert.equal(
    texture.currentFrame,
    8,
    "no stale frame from the old animation"
  );
});

test("playAnimation then advances one frame per interval and loops", () => {
  const texture = makeTexture();
  texture.playAnimation([8, 9, 10], 100);
  const t = laterThanNow();

  texture.updateAnimation(t + 101);
  assert.equal(texture.currentFrame, 9);
  texture.updateAnimation(t + 202);
  assert.equal(texture.currentFrame, 10);
  texture.updateAnimation(t + 303);
  assert.equal(texture.currentFrame, 8, "wraps back to the first frame");
});

test("the second frame waits a full interval even if the last animation ticked a moment ago", () => {
  const texture = makeTexture();
  texture.playAnimation([24, 25], 100);
  texture.updateAnimation(laterThanNow() + 101);

  texture.playAnimation([8, 9, 10], 100);
  texture.updateAnimation(performance.now() + 10);
  assert.equal(texture.currentFrame, 8, "still on the first frame 10ms in");
});

test("a one-frame animation holds that frame instead of running off the end", () => {
  const texture = makeTexture();
  texture.playAnimation([5], 100);
  assert.equal(texture.currentFrame, 5);

  const t = laterThanNow();
  texture.updateAnimation(t + 101);
  texture.updateAnimation(t + 202);
  assert.equal(texture.currentFrame, 5);
});

test("playAnimationOnce starts on its first frame, ends on the last, and calls back once", () => {
  const texture = makeTexture();
  let done = 0;
  texture.playAnimationOnce([3, 4, 5], null, 100, () => done++);
  assert.equal(texture.currentFrame, 3);

  const t = laterThanNow();
  texture.updateAnimation(t + 101);
  assert.equal(texture.currentFrame, 4);
  assert.equal(done, 0);

  texture.updateAnimation(t + 202);
  assert.equal(texture.currentFrame, 5);
  assert.equal(done, 1, "fires when the last frame appears");
  assert.equal(texture.isPlaying, false, "holds the last frame");

  texture.updateAnimation(t + 303);
  assert.equal(done, 1, "and never again");
});

test("playAnimationOnce falls back to the default loop when it finishes", () => {
  const texture = makeTexture();
  texture.playAnimationOnce([3, 4], [0, 1], 100, () => {});
  const t = laterThanNow();

  texture.updateAnimation(t + 101);
  assert.equal(texture.currentFrame, 4);
  assert.equal(texture.isPlaying, true);
  texture.updateAnimation(t + 202);
  assert.equal(texture.currentFrame, 0, "the default loop takes over");
});

test("Animator.play shows the clip's first frame immediately", () => {
  const texture = makeTexture();
  const animator = new Animator();
  animator.addClip("idle_left", [24, 25, 26], { speed: 140 });
  animator.addClip("idle_right", [8, 9, 10], { speed: 140 });
  const object = new GameObject("knight");
  object.addComponent(texture);
  object.addComponent(animator);

  animator.play("idle_left");
  assert.equal(texture.currentFrame, 24);
  animator.play("idle_right");
  assert.equal(
    texture.currentFrame,
    8,
    "switching clips never shows the old direction"
  );
});
