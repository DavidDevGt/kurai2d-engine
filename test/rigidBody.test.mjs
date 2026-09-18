import { test } from "node:test";
import assert from "node:assert/strict";

import { Physics, Vector2 } from "../src/Physics.js";
import RigidBody from "../src/components/RigidBody.js";
import BoxCollider from "../src/components/BoxCollider.js";
import { Box } from "../src/physics/index.js";

function dynamicBox(physics, x, y) {
  const rb = new RigidBody(physics, "dynamic", new Vector2(x, y), false);
  new BoxCollider(rb, new Vector2(0.5, 0.5), 1, 0, 0, false, null, null);
  return rb;
}

test("RigidBody exposes force/impulse/torque without needing getBody()", () => {
  const physics = new Physics(0, 30);
  const rb = dynamicBox(physics, 0, 0);

  rb.applyForceToCenter(300, 0);
  physics.process(1 / 60);
  const v1 = rb.getLinearVelocity();
  assert.ok(v1.x > 0, "a sustained force accelerates the body");

  const rb2 = dynamicBox(physics, 0, 100);
  rb2.applyImpulse(60, 0);
  physics.process(1 / 60);
  const v2 = rb2.getLinearVelocity();
  assert.ok(v2.x > 0, "an impulse applies instantly");
  assert.ok(
    Math.abs(rb2.getAngularVelocity()) < 1e-6,
    "an impulse at the center imparts no spin"
  );

  const rb3 = dynamicBox(physics, 0, 200);
  rb3.applyImpulse(0, 60, { x: 15, y: 200 });
  physics.process(1 / 60);
  assert.ok(
    Math.abs(rb3.getAngularVelocity()) > 1e-6,
    "an impulse off-center imparts spin"
  );

  const rb4 = dynamicBox(physics, 0, 300);
  rb4.applyTorque(1000);
  physics.process(1 / 60);
  assert.ok(rb4.getAngularVelocity() > 0, "torque spins the body");

  const rb5 = dynamicBox(physics, 0, 400);
  rb5.applyAngularImpulse(5);
  physics.process(1 / 60);
  assert.ok(rb5.getAngularVelocity() > 0, "an angular impulse spins the body");
});

test("RigidBody sleep/active/fixed-rotation flags round-trip", () => {
  const physics = new Physics(0, 30);
  const rb = dynamicBox(physics, 0, 0);

  assert.equal(rb.isAwake(), true);
  rb.setAwake(false);
  assert.equal(rb.isAwake(), false);

  rb.setSleepingAllowed(false);
  assert.equal(rb.isSleepingAllowed(), false);
  assert.equal(rb.isAwake(), true, "forbidding sleep wakes the body back up");

  assert.equal(rb.isActive(), true);
  rb.setActive(false);
  assert.equal(rb.isActive(), false);
  rb.setActive(true);
  assert.equal(rb.isActive(), true);

  assert.equal(rb.isFixedRotation(), false);
  rb.setFixedRotation(true);
  assert.equal(rb.isFixedRotation(), true);
});

test("RigidBody damping and gravity scale round-trip", () => {
  const physics = new Physics(0, 30);
  const rb = dynamicBox(physics, 0, 0);

  rb.setLinearDamping(0.5);
  assert.equal(rb.getLinearDamping(), 0.5);
  rb.setAngularDamping(0.25);
  assert.equal(rb.getAngularDamping(), 0.25);
  rb.setGravityScale(2);
  assert.equal(rb.getGravityScale(), 2);
});

test("RigidBody.getMass/getInertia/resetMassData reflect the attached fixture", () => {
  const physics = new Physics(0, 30);
  const rb = new RigidBody(physics, "dynamic", new Vector2(0, 0), false);
  new BoxCollider(rb, new Vector2(15, 15), 2, 0, 0, false, null, null);

  assert.ok(rb.getMass() > 0);
  assert.ok(rb.getInertia() > 0);

  const before = rb.getMass();
  rb.setMassData({ mass: 50, center: { x: 0, y: 0 }, I: 10 });
  assert.equal(rb.getMass(), 50);
  assert.notEqual(rb.getMass(), before);

  rb.resetMassData();
  assert.ok(Math.abs(rb.getMass() - before) < 1e-6);
});

test("RigidBody world/local point and vector conversions round-trip in pixel units", () => {
  const physics = new Physics(0, 30);
  const rb = dynamicBox(physics, 90, 60);
  rb.setRotation(Math.PI / 4);

  const local = { x: 10, y: 5 };
  const world = rb.getWorldPoint(local);
  const backToLocal = rb.getLocalPoint(world);
  assert.ok(Math.abs(backToLocal.x - local.x) < 1e-3);
  assert.ok(Math.abs(backToLocal.y - local.y) < 1e-3);

  const worldVec = rb.getWorldVector({ x: 1, y: 0 });
  const backToLocalVec = rb.getLocalVector(worldVec);
  assert.ok(Math.abs(backToLocalVec.x - 1) < 1e-3);
  assert.ok(Math.abs(backToLocalVec.y - 0) < 1e-3);
});

test("RigidBody.getLinearVelocityFromWorldPoint includes the spin contribution", () => {
  const physics = new Physics(0, 30);
  const rb = dynamicBox(physics, 0, 0);
  rb.setAngularVelocity(2);

  const v = rb.getLinearVelocityFromWorldPoint({ x: 30, y: 0 });
  assert.ok(Math.abs(v.y) > 1, "spinning body has a nonzero velocity offset");
});

test("RigidBody.setType changes both the physics type and getType()", () => {
  const physics = new Physics(-600, 30);
  const rb = new RigidBody(physics, "kinematic", new Vector2(0, 0), false);
  new BoxCollider(rb, new Vector2(15, 15), 1, 0, 0, false, null, null);

  assert.equal(rb.getType(), "kinematic");
  rb.setType("dynamic");
  assert.equal(rb.getType(), "dynamic");
  assert.equal(rb.getBody().getType(), "dynamic");

  physics.process(1 / 60);
  const v = rb.getLinearVelocity();
  assert.ok(v.y < 0, "now dynamic, gravity actually pulls on it");
});

test("RigidBody.setPosition/setTransform teleport in pixel units", () => {
  const physics = new Physics(0, 30);
  const rb = dynamicBox(physics, 0, 0);

  rb.setPosition(new Vector2(90, 60));
  const p = rb.getPosition();
  assert.ok(Math.abs(p.x - 90) < 1e-3);
  assert.ok(Math.abs(p.y - 60) < 1e-3);

  rb.setTransform(new Vector2(30, -30), Math.PI / 2);
  const p2 = rb.getPosition();
  assert.ok(Math.abs(p2.x - 30) < 1e-3);
  assert.ok(Math.abs(p2.y - -30) < 1e-3);
  assert.ok(Math.abs(rb.getAngle() - Math.PI / 2) < 1e-3);
});

test("RigidBody.createFixture/destroyFixture work without going through a Collider class", () => {
  const physics = new Physics(0, 30);
  const rb = new RigidBody(physics, "dynamic", new Vector2(0, 0), false);

  const fixture = rb.createFixture(Box(0.5, 0.5), { density: 1 });
  assert.ok(rb.getMass() > 0);

  rb.destroyFixture(fixture);
  rb.resetMassData();
  assert.equal(
    rb.getMass(),
    1,
    "no fixtures left means the fallback unit mass"
  );
});

test("RigidBody.getWorld returns the physics World", () => {
  const physics = new Physics(0, 30);
  const rb = dynamicBox(physics, 0, 0);
  assert.equal(rb.getWorld(), physics.world);
});

test("RigidBody.get/setUserData is independent of the engine's own collision routing", () => {
  const physics = new Physics(-600, 30);
  const ground = new RigidBody(physics, "static", new Vector2(0, 0), false);
  new BoxCollider(ground, new Vector2(200, 10), 0, 0, 0, false, null, null);

  const box = new RigidBody(physics, "dynamic", new Vector2(0, 100), false);
  new BoxCollider(box, new Vector2(10, 10), 1, 0, 0, false, null, null);

  box.setUserData({ kind: "crate", hp: 3 });
  assert.deepEqual(box.getUserData(), { kind: "crate", hp: 3 });

  let entered = false;
  physics.onCollisionEnter(() => {
    entered = true;
  });
  for (let i = 0; i < 240 && !entered; i++) physics.process(1 / 60);

  assert.equal(
    entered,
    true,
    "custom userData never breaks collision dispatch"
  );
  assert.deepEqual(box.getUserData(), { kind: "crate", hp: 3 });
});

test("RigidBody.getContactList reflects a touching contact", () => {
  const physics = new Physics(-600, 30);
  const ground = new RigidBody(physics, "static", new Vector2(0, 0), false);
  new BoxCollider(ground, new Vector2(200, 10), 0, 0, 0, false, null, null);

  const box = new RigidBody(physics, "dynamic", new Vector2(0, 30), false);
  new BoxCollider(box, new Vector2(10, 10), 1, 0, 0, false, null, null);

  for (let i = 0; i < 240; i++) physics.process(1 / 60);

  assert.ok(box.getContactList().length > 0);
});
