import { test } from "node:test";
import assert from "node:assert/strict";

import { World, Box, Vec2 } from "../src/physics/index.js";
import { Physics, Vector2 } from "../src/Physics.js";
import RigidBody from "../src/components/RigidBody.js";
import BoxCollider from "../src/components/BoxCollider.js";

/**
 * Runs a world for `steps` fixed-size steps.
 */
function run(world, steps, dt = 1 / 60) {
  for (let i = 0; i < steps; i++) world.step(dt);
}

test("a distance joint holds two falling bodies apart under gravity", () => {
  const world = new World({ gravity: new Vec2(0, -10) });
  const a = world.createBody({ type: "dynamic", position: new Vec2(0, 10) });
  a.createFixture(Box(0.5, 0.5), { density: 1 });
  const b = world.createBody({ type: "dynamic", position: new Vec2(0, 5) });
  b.createFixture(Box(0.5, 0.5), { density: 1 });

  world.createJoint({
    type: "distance",
    bodyA: a,
    bodyB: b,
    localAnchorA: new Vec2(0, 0),
    localAnchorB: new Vec2(0, 0),
    length: 5,
  });

  run(world, 180);

  const separation = Vec2.distance(a.getPosition(), b.getPosition());
  assert.ok(Math.abs(separation - 5) < 1e-3, "stays at the rest length");
});

test("a soft distance joint (frequencyHz) settles near, not exactly at, its rest length", () => {
  const world = new World({ gravity: new Vec2(0, -10) });
  const anchor = world.createBody({
    type: "static",
    position: new Vec2(0, 10),
  });
  const bob = world.createBody({ type: "dynamic", position: new Vec2(0, 5) });
  bob.createFixture(Box(0.5, 0.5), { density: 1 });

  world.createJoint({
    type: "distance",
    bodyA: anchor,
    bodyB: bob,
    localAnchorA: new Vec2(0, 0),
    localAnchorB: new Vec2(0, 0),
    length: 5,
    frequencyHz: 2,
    dampingRatio: 0.5,
  });

  run(world, 240);

  const separation = Vec2.distance(anchor.getPosition(), bob.getPosition());
  assert.ok(separation > 5, "gravity stretches a soft joint past rest length");
  assert.ok(separation < 6, "but the spring keeps it from falling freely");
});

test("a revolute joint keeps a pendulum swinging at a fixed radius from its anchor", () => {
  const world = new World({ gravity: new Vec2(0, -10) });
  const anchor = world.createBody({
    type: "static",
    position: new Vec2(0, 10),
  });
  const bob = world.createBody({ type: "dynamic", position: new Vec2(3, 10) });
  bob.createFixture(Box(0.4, 0.4), { density: 1 });

  world.createJoint({
    type: "revolute",
    bodyA: anchor,
    bodyB: bob,
    localAnchorA: new Vec2(0, 0),
    localAnchorB: new Vec2(-3, 0),
  });

  run(world, 300);

  const radius = Vec2.distance(anchor.getPosition(), bob.getPosition());
  assert.ok(Math.abs(radius - 3) < 1e-3, "the bob stays 3 units from the pin");
  assert.ok(bob.getPosition().y < 10, "gravity swings it below the anchor");
});

test("a revolute joint's motor drives angular velocity toward motorSpeed", () => {
  const world = new World({ gravity: new Vec2(0, 0) });
  const anchor = world.createBody({ type: "static", position: new Vec2(0, 0) });
  const arm = world.createBody({ type: "dynamic", position: new Vec2(2, 0) });
  arm.createFixture(Box(1, 0.1), { density: 1 });

  const joint = world.createJoint({
    type: "revolute",
    bodyA: anchor,
    bodyB: arm,
    localAnchorA: new Vec2(0, 0),
    localAnchorB: new Vec2(-2, 0),
    enableMotor: true,
    motorSpeed: 2,
    maxMotorTorque: 1000,
  });

  run(world, 120);

  assert.ok(
    Math.abs(arm.getAngularVelocity() - 2) < 0.05,
    "spins up to the target speed"
  );
  assert.equal(joint.isMotorEnabled(), true);
});

test("a revolute joint's motor is torque-limited", () => {
  const world = new World({ gravity: new Vec2(0, 0) });
  const anchor = world.createBody({ type: "static", position: new Vec2(0, 0) });
  const arm = world.createBody({ type: "dynamic", position: new Vec2(2, 0) });
  arm.createFixture(Box(1, 0.1), { density: 5 });

  world.createJoint({
    type: "revolute",
    bodyA: anchor,
    bodyB: arm,
    localAnchorA: new Vec2(0, 0),
    localAnchorB: new Vec2(-2, 0),
    enableMotor: true,
    motorSpeed: 100,
    maxMotorTorque: 0.001,
  });

  run(world, 30);

  assert.ok(
    Math.abs(arm.getAngularVelocity()) < 1,
    "a near-zero torque limit barely moves the heavy arm"
  );
});

test("destroying a body destroys the joints attached to it", () => {
  const world = new World({ gravity: new Vec2(0, 0) });
  const a = world.createBody({ type: "dynamic", position: new Vec2(0, 0) });
  a.createFixture(Box(0.5, 0.5), { density: 1 });
  const b = world.createBody({ type: "dynamic", position: new Vec2(2, 0) });
  b.createFixture(Box(0.5, 0.5), { density: 1 });

  const joint = world.createJoint({
    type: "distance",
    bodyA: a,
    bodyB: b,
    localAnchorA: new Vec2(0, 0),
    localAnchorB: new Vec2(0, 0),
    length: 2,
  });

  assert.equal(world.getJointCount(), 1);
  world.destroyBody(a);
  assert.equal(world.getJointCount(), 0);
  assert.equal(b.joints.length, 0);
  assert.equal(joint.bodyA, a);
});

test("world.destroyJoint removes it without touching either body", () => {
  const world = new World({ gravity: new Vec2(0, 0) });
  const a = world.createBody({ type: "dynamic", position: new Vec2(0, 0) });
  a.createFixture(Box(0.5, 0.5), { density: 1 });
  const b = world.createBody({ type: "dynamic", position: new Vec2(2, 0) });
  b.createFixture(Box(0.5, 0.5), { density: 1 });

  const joint = world.createJoint({
    type: "distance",
    bodyA: a,
    bodyB: b,
    localAnchorA: new Vec2(0, 0),
    localAnchorB: new Vec2(0, 0),
    length: 2,
  });

  world.destroyJoint(joint);

  assert.equal(world.getJointCount(), 0);
  assert.equal(a.joints.length, 0);
  assert.equal(b.joints.length, 0);
  assert.equal(world.getBodyCount(), 2);
});

test("collideConnected defaults to false: jointed bodies pass through each other", () => {
  const world = new World({ gravity: new Vec2(0, -10) });
  const a = world.createBody({ type: "dynamic", position: new Vec2(0, 5) });
  a.createFixture(Box(1, 1), { density: 1 });
  const b = world.createBody({ type: "dynamic", position: new Vec2(0, 3) });
  b.createFixture(Box(1, 1), { density: 1 });

  world.createJoint({
    type: "distance",
    bodyA: a,
    bodyB: b,
    localAnchorA: new Vec2(0, 0),
    localAnchorB: new Vec2(0, 0),
    length: 0.5,
  });

  run(world, 120);

  assert.equal(world.getContactCount(), 0);
});

test("collideConnected: true lets jointed bodies still collide", () => {
  const world = new World({ gravity: new Vec2(0, -10) });
  const ground = world.createBody({
    type: "static",
    position: new Vec2(0, 0),
  });
  ground.createFixture(Box(50, 1));

  const a = world.createBody({ type: "dynamic", position: new Vec2(0, 5) });
  a.createFixture(Box(0.5, 0.5), { density: 1 });
  const b = world.createBody({ type: "dynamic", position: new Vec2(0, 3) });
  b.createFixture(Box(0.5, 0.5), { density: 1 });

  world.createJoint({
    type: "distance",
    bodyA: a,
    bodyB: b,
    localAnchorA: new Vec2(0, 0),
    localAnchorB: new Vec2(0, 0),
    length: 4,
    collideConnected: true,
  });

  run(world, 240);

  assert.ok(
    b.getPosition().y > 1.4,
    "b rests on top of a instead of overlapping it"
  );
});

test("creating a joint wakes both of its bodies", () => {
  const world = new World({ gravity: new Vec2(0, 0) });
  const a = world.createBody({ type: "dynamic", position: new Vec2(0, 0) });
  a.createFixture(Box(0.5, 0.5), { density: 1 });
  const b = world.createBody({ type: "dynamic", position: new Vec2(2, 0) });
  b.createFixture(Box(0.5, 0.5), { density: 1 });

  a.setAwake(false);
  b.setAwake(false);

  world.createJoint({
    type: "distance",
    bodyA: a,
    bodyB: b,
    localAnchorA: new Vec2(0, 0),
    localAnchorB: new Vec2(0, 0),
    length: 2,
  });

  assert.equal(a.isAwake(), true);
  assert.equal(b.isAwake(), true);
});

test("a joint keeps its island together: an awake body keeps its jointed partner awake", () => {
  const world = new World({ gravity: new Vec2(0, -10) });
  const anchor = world.createBody({
    type: "static",
    position: new Vec2(0, 10),
  });
  const bob = world.createBody({ type: "dynamic", position: new Vec2(3, 10) });
  bob.createFixture(Box(0.4, 0.4), { density: 1 });

  world.createJoint({
    type: "revolute",
    bodyA: anchor,
    bodyB: bob,
    localAnchorA: new Vec2(0, 0),
    localAnchorB: new Vec2(-3, 0),
  });

  run(world, 30);

  assert.equal(bob.isAwake(), true, "a swinging pendulum stays awake");
});

test("Physics.createDistanceJoint and createRevoluteJoint work in pixel space", () => {
  const physics = new Physics(-600, 30);
  const anchorRB = new RigidBody(physics, "static", new Vector2(0, 300));
  const bobRB = new RigidBody(physics, "dynamic", new Vector2(90, 300));
  new BoxCollider(bobRB, new Vector2(12, 12), 1, 0, 0, false, null, null);

  physics.createRevoluteJoint(anchorRB, bobRB, { x: 0, y: 300 });

  for (let i = 0; i < 300; i++) physics.process(1 / 60);

  const at = bobRB.body.getPosition();
  const anchorAt = anchorRB.body.getPosition();
  const radius = Vec2.distance(at, anchorAt) * physics.scale;
  assert.ok(Math.abs(radius - 90) < 1, "pixel-space anchors still pin at 90px");
});

test("Physics.destroyJoint removes a joint created through the pixel-space API", () => {
  const physics = new Physics(-600, 30);
  const a = new RigidBody(physics, "dynamic", new Vector2(0, 300));
  new BoxCollider(a, new Vector2(12, 12), 1, 0, 0, false, null, null);
  const b = new RigidBody(physics, "dynamic", new Vector2(90, 300));
  new BoxCollider(b, new Vector2(12, 12), 1, 0, 0, false, null, null);

  const joint = physics.createDistanceJoint(a, b, { length: 90 });
  assert.equal(physics.world.getJointCount(), 1);

  physics.destroyJoint(joint);
  assert.equal(physics.world.getJointCount(), 0);
});
