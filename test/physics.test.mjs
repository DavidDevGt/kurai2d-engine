import { test } from "node:test";
import assert from "node:assert/strict";

import {
  World,
  Box,
  Circle,
  Vec2,
  AABB,
  PolygonShape,
  CircleShape,
  Transform2,
  DynamicTree,
  testOverlap,
} from "../src/physics/index.js";
import { Physics, Vector2 } from "../src/Physics.js";
import RigidBody from "../src/components/RigidBody.js";
import BoxCollider from "../src/components/BoxCollider.js";
import CircleCollider from "../src/components/CircleCollider.js";

/**
 * Builds a world with a wide static floor whose top surface sits at y = 1.
 */
function worldWithGround(gravity = -10, groundOptions = {}) {
  const world = new World({ gravity: new Vec2(0, gravity) });
  const ground = world.createBody({ type: "static", position: new Vec2(0, 0) });
  ground.createFixture(Box(50, 1), { friction: 0.5, ...groundOptions });
  return { world, ground };
}

function run(world, steps, dt = 1 / 60) {
  for (let i = 0; i < steps; i++) world.step(dt);
}

test("free fall matches semi-implicit Euler integration", () => {
  const world = new World({ gravity: new Vec2(0, -10) });
  const body = world.createBody({ type: "dynamic", position: new Vec2(0, 0) });
  body.createFixture(Box(0.5, 0.5), { density: 1 });

  run(world, 60);

  assert.ok(Math.abs(body.getLinearVelocity().y + 10) < 1e-6);
  const expected = -0.5 * 10 * (1 + 1 / 60);
  assert.ok(
    Math.abs(body.getPosition().y - expected) < 1e-3,
    `expected ~${expected}, got ${body.getPosition().y}`
  );
});

test("gravityScale and damping change how a body falls", () => {
  const world = new World({ gravity: new Vec2(0, -10) });
  const normal = world.createBody({
    type: "dynamic",
    position: new Vec2(0, 0),
  });
  normal.createFixture(Box(0.5, 0.5), { density: 1 });
  const floaty = world.createBody({
    type: "dynamic",
    position: new Vec2(5, 0),
    gravityScale: 0.5,
  });
  floaty.createFixture(Box(0.5, 0.5), { density: 1 });
  const damped = world.createBody({
    type: "dynamic",
    position: new Vec2(10, 0),
    linearDamping: 5,
  });
  damped.createFixture(Box(0.5, 0.5), { density: 1 });

  run(world, 60);

  assert.ok(floaty.getPosition().y > normal.getPosition().y);
  assert.ok(damped.getPosition().y > normal.getPosition().y);
  assert.ok(
    Math.abs(floaty.getLinearVelocity().y + 5) < 1e-6,
    "half gravity means half the velocity"
  );
});

test("a static body never moves and a kinematic one ignores gravity", () => {
  const world = new World({ gravity: new Vec2(0, -10) });
  const stat = world.createBody({ type: "static", position: new Vec2(0, 3) });
  stat.createFixture(Box(0.5, 0.5), { density: 1 });
  const kin = world.createBody({ type: "kinematic", position: new Vec2(5, 3) });
  kin.createFixture(Box(0.5, 0.5), { density: 1 });
  kin.setLinearVelocity(new Vec2(2, 0));

  run(world, 60);

  assert.equal(stat.getPosition().y, 3);
  assert.ok(
    Math.abs(kin.getPosition().y - 3) < 1e-9,
    "no gravity on kinematic"
  );
  assert.ok(
    Math.abs(kin.getPosition().x - 7) < 0.05,
    "kinematic keeps drifting"
  );
});

test("a box lands on the ground and settles flat", () => {
  const { world } = worldWithGround();
  const box = world.createBody({ type: "dynamic", position: new Vec2(0, 5) });
  box.createFixture(Box(0.5, 0.5), { density: 1, friction: 0.5 });

  run(world, 240);

  assert.ok(
    Math.abs(box.getPosition().y - 1.5) < 0.03,
    `expected ~1.5, got ${box.getPosition().y}`
  );
  assert.ok(Math.abs(box.getAngle()) < 1e-3, "should not tip over");
  assert.ok(Math.abs(box.getLinearVelocity().y) < 1e-3, "should be at rest");
});

test("a stack of boxes stays stacked and falls asleep", () => {
  const { world } = worldWithGround();
  const boxes = [];
  for (let i = 0; i < 5; i++) {
    const box = world.createBody({
      type: "dynamic",
      position: new Vec2(0, 1.6 + i * 1.05),
    });
    box.createFixture(Box(0.5, 0.5), { density: 1, friction: 0.5 });
    boxes.push(box);
  }

  run(world, 400);

  for (let i = 0; i < boxes.length; i++) {
    const y = boxes[i].getPosition().y;
    assert.ok(
      Math.abs(y - (1.5 + i)) < 0.15,
      `box ${i} expected near ${1.5 + i}, got ${y}`
    );
    assert.equal(boxes[i].isAwake(), false, `box ${i} should be asleep`);
  }
});

test("a sleeping body wakes when something lands on it", () => {
  const { world } = worldWithGround();
  const sleeper = world.createBody({
    type: "dynamic",
    position: new Vec2(0, 2),
  });
  sleeper.createFixture(Box(0.5, 0.5), { density: 1, friction: 0.5 });
  run(world, 200);
  assert.equal(sleeper.isAwake(), false);

  const dropped = world.createBody({
    type: "dynamic",
    position: new Vec2(0, 6),
  });
  dropped.createFixture(Box(0.5, 0.5), { density: 1, friction: 0.5 });
  run(world, 100);

  assert.ok(dropped.getPosition().y > sleeper.getPosition().y, "landed on top");
  assert.ok(
    Math.abs(sleeper.getPosition().y - 1.5) < 0.05,
    "the sleeper must not be pushed into the ground"
  );
});

test("teleporting a sleeping body wakes it so it sees new overlaps", () => {
  const { world } = worldWithGround();
  const sensorBody = world.createBody({
    type: "static",
    position: new Vec2(20, 2),
  });
  sensorBody.createFixture(Box(1, 1), { isSensor: true });

  const box = world.createBody({ type: "dynamic", position: new Vec2(0, 2) });
  box.createFixture(Box(0.5, 0.5), { density: 1, friction: 0.5 });

  run(world, 200);
  assert.equal(box.isAwake(), false, "it should have settled");

  let touched = false;
  world.on("begin-contact", () => (touched = true));

  box.setTransform(new Vec2(20, 2), 0);
  run(world, 3);

  assert.equal(box.isAwake(), true);
  assert.equal(touched, true, "the overlap must be reported");
});

test("restitution controls the bounce height", () => {
  const drop = (restitution) => {
    const { world } = worldWithGround(-10, { restitution });
    const ball = world.createBody({
      type: "dynamic",
      position: new Vec2(0, 5),
    });
    ball.createFixture(Circle(0.5), { density: 1, restitution });

    let bounced = false;
    let apex = 0;
    for (let i = 0; i < 400; i++) {
      world.step(1 / 60);
      if (ball.getLinearVelocity().y > 0) bounced = true;
      if (bounced) apex = Math.max(apex, ball.getPosition().y);
    }
    return { bounced, apex };
  };

  const bouncy = drop(0.8);
  const dead = drop(0);

  assert.equal(bouncy.bounced, true);
  assert.ok(
    bouncy.apex > 3 && bouncy.apex < 4.2,
    `expected an apex near 3.7, got ${bouncy.apex}`
  );
  assert.ok(dead.apex < 1.6, `a dead ball must not bounce, apex ${dead.apex}`);
});

test("friction brings a sliding box to a halt, frictionless keeps it going", () => {
  const slide = (friction) => {
    const { world } = worldWithGround(-10, { friction });
    const box = world.createBody({
      type: "dynamic",
      position: new Vec2(0, 1.5),
    });
    box.createFixture(Box(0.5, 0.5), { density: 1, friction });
    box.setLinearVelocity(new Vec2(10, 0));
    run(world, 240);
    return box.getLinearVelocity().x;
  };

  assert.ok(Math.abs(slide(0.5)) < 0.05, "friction should stop the box");
  assert.ok(slide(0) > 9.5, "a frictionless box keeps its speed");
});

test("sensors report overlap without any collision response", () => {
  const world = new World({ gravity: new Vec2(0, -10) });
  const trigger = world.createBody({
    type: "static",
    position: new Vec2(0, 0),
  });
  trigger.createFixture(Box(2, 0.5), { isSensor: true });
  const ball = world.createBody({ type: "dynamic", position: new Vec2(0, 5) });
  ball.createFixture(Circle(0.3), { density: 1 });

  let began = 0;
  let ended = 0;
  world.on("begin-contact", () => began++);
  world.on("end-contact", () => ended++);

  run(world, 120);

  assert.equal(began, 1);
  assert.equal(ended, 1);
  assert.ok(ball.getPosition().y < -2, "a sensor must not block the ball");
});

test("collision filtering keeps non-matching layers apart", () => {
  const build = (boxCategory, boxMask) => {
    const world = new World({ gravity: new Vec2(0, -10) });
    const ground = world.createBody({
      type: "static",
      position: new Vec2(0, 0),
    });
    ground.createFixture(Box(50, 1), {
      filterCategoryBits: 0x0001,
      filterMaskBits: 0xffff,
    });
    const box = world.createBody({ type: "dynamic", position: new Vec2(0, 5) });
    box.createFixture(Box(0.5, 0.5), {
      density: 1,
      filterCategoryBits: boxCategory,
      filterMaskBits: boxMask,
    });
    run(world, 150);
    return box.getPosition().y;
  };

  assert.ok(build(0x0002, 0xffff) > 1.4, "matching masks collide");
  assert.ok(build(0x0002, 0x0002) < -2, "a non-matching mask falls through");
});

test("changing a filter at runtime separates existing contacts", () => {
  const { world } = worldWithGround();
  const box = world.createBody({ type: "dynamic", position: new Vec2(0, 2) });
  const fixture = box.createFixture(Box(0.5, 0.5), { density: 1 });
  run(world, 120);
  assert.ok(box.getPosition().y > 1.4, "resting on the ground");

  fixture.setFilterData({ categoryBits: 0x0004, maskBits: 0x0004 });
  run(world, 120);
  assert.ok(box.getPosition().y < 0, "should now fall through the ground");
});

test("continuous detection stops a bullet, discrete lets it tunnel", () => {
  const shoot = (bullet) => {
    const world = new World({ gravity: new Vec2(0, 0) });
    const wall = world.createBody({ type: "static", position: new Vec2(5, 0) });
    wall.createFixture(Box(0.1, 5));
    const body = world.createBody({
      type: "dynamic",
      position: new Vec2(0, 0),
      bullet,
    });
    body.createFixture(Box(0.2, 0.2), { density: 1 });
    body.setLinearVelocity(new Vec2(200, 0));
    run(world, 30);
    return body;
  };

  const stopped = shoot(true);
  assert.ok(
    stopped.getPosition().x < 4.9,
    `bullet should stop at the wall, got ${stopped.getPosition().x}`
  );
  assert.ok(
    Math.abs(stopped.getLinearVelocity().x) < 1,
    "the impact should kill its speed"
  );
  assert.ok(shoot(false).getPosition().x > 20, "no CCD means tunneling");
});

/**
 * A moving platform and something standing on it: a kinematic body 4 wide and
 * 0.5 thick with a 1x1 box resting on top, so the rider's centre sits 0.75
 * above the platform's.
 */
function liftWithRider(riderOptions = {}) {
  const world = new World({ gravity: new Vec2(0, -10) });
  const lift = world.createBody({
    type: "kinematic",
    position: new Vec2(0, 0),
  });
  lift.createFixture(Box(2, 0.25));
  const rider = world.createBody({
    type: "dynamic",
    position: new Vec2(0, 0.9),
    ...riderOptions,
  });
  rider.createFixture(Box(0.5, 0.5), { density: 1 });
  return { world, lift, rider };
}

test("a kinematic platform holds its path under a rider", () => {
  const { world, lift, rider } = liftWithRider();
  run(world, 30);
  lift.setLinearVelocity(new Vec2(0, 1));

  run(world, 120);

  assert.ok(
    Math.abs(lift.getPosition().y - 2) < 1e-9,
    `lift should be unmoved by the load, got ${lift.getPosition().y}`
  );
  assert.ok(
    Math.abs(rider.getPosition().y - lift.getPosition().y - 0.75) < 0.03,
    `rider should ride up with it, got ${rider.getPosition().y}`
  );
});

test("a bullet body keeps its footing on a descending platform", () => {
  const { world, lift, rider } = liftWithRider({ bullet: true });
  run(world, 30);
  lift.setLinearVelocity(new Vec2(0, -2));

  run(world, 180);

  const gap = rider.getPosition().y - lift.getPosition().y;
  assert.ok(
    Math.abs(gap - 0.75) < 0.05,
    `rider should still be standing on the lift, got a gap of ${gap}`
  );
  assert.ok(
    Math.abs(rider.getLinearVelocity().y + 2) < 0.5,
    `rider should be descending with it, got ${rider.getLinearVelocity().y}`
  );
});

test("raycast returns the closest hit with its surface normal", () => {
  const world = new World({ gravity: new Vec2(0, 0) });
  const near = world.createBody({ type: "static", position: new Vec2(5, 0) });
  near.createFixture(Box(1, 1));
  const far = world.createBody({ type: "static", position: new Vec2(9, 0) });
  far.createFixture(Box(1, 1));
  world.step(1 / 60);

  let closest = null;
  world.rayCast(
    new Vec2(0, 0),
    new Vec2(20, 0),
    (fixture, point, normal, f) => {
      closest = { x: point.x, nx: normal.x, ny: normal.y, fraction: f };
      return f;
    }
  );

  assert.ok(Math.abs(closest.x - 4) < 1e-6, "hits the near box's left face");
  assert.ok(Math.abs(closest.nx + 1) < 1e-6, "normal points back at the ray");
  assert.ok(Math.abs(closest.ny) < 1e-6);
  assert.ok(Math.abs(closest.fraction - 0.2) < 1e-6);

  let hits = 0;
  world.rayCast(new Vec2(0, 0), new Vec2(20, 0), () => {
    hits++;
    return 1;
  });
  assert.equal(hits, 2);

  let missed = 0;
  world.rayCast(new Vec2(0, 50), new Vec2(20, 50), () => {
    missed++;
    return 1;
  });
  assert.equal(missed, 0);
});

test("queryPoint finds the fixtures under a point", () => {
  const world = new World({ gravity: new Vec2(0, 0) });
  const body = world.createBody({ type: "static", position: new Vec2(3, 3) });
  body.createFixture(Box(1, 1));
  world.step(1 / 60);

  const inside = [];
  world.queryPoint(new Vec2(3.5, 3.5), (f) => {
    inside.push(f);
    return true;
  });
  assert.equal(inside.length, 1);

  const outside = [];
  world.queryPoint(new Vec2(4.5, 3.5), (f) => {
    outside.push(f);
    return true;
  });
  assert.equal(outside.length, 0);
});

test("contact normals point from fixture A to fixture B", () => {
  const { world, ground } = worldWithGround();
  const box = world.createBody({ type: "dynamic", position: new Vec2(0, 3) });
  box.createFixture(Box(0.5, 0.5), { density: 1 });

  let normalY = null;
  world.on("begin-contact", (contact) => {
    const wm = contact.getWorldManifold();
    const fromGround = contact.getFixtureA().getBody() === ground;
    normalY = fromGround ? wm.normal.y : -wm.normal.y;
  });

  run(world, 120);
  assert.ok(normalY > 0.99, "the ground pushes the box upwards");
});

test("impulses and forces move a body the way momentum says they should", () => {
  const world = new World({ gravity: new Vec2(0, 0) });
  const body = world.createBody({ type: "dynamic", position: new Vec2(0, 0) });
  body.createFixture(Box(0.5, 0.5), { density: 1 });
  const mass = body.getMass();

  body.applyLinearImpulse(new Vec2(mass * 3, 0), body.getWorldCenter());
  assert.ok(
    Math.abs(body.getLinearVelocity().x - 3) < 1e-9,
    "impulse / mass is an instant velocity change"
  );

  body.setLinearVelocity(new Vec2(0, 0));
  body.applyForceToCenter(new Vec2(mass * 60, 0));
  world.step(1 / 60);
  assert.ok(Math.abs(body.getLinearVelocity().x - 1) < 1e-9);
  world.step(1 / 60);
  assert.ok(
    Math.abs(body.getLinearVelocity().x - 1) < 1e-9,
    "forces do not persist across steps"
  );
});

test("mass and inertia come from shape and density", () => {
  const world = new World({ gravity: new Vec2(0, 0) });
  const box = world.createBody({ type: "dynamic", position: new Vec2(0, 0) });
  box.createFixture(Box(1, 2), { density: 3 });
  assert.ok(Math.abs(box.getMass() - 24) < 1e-6);

  const ball = world.createBody({ type: "dynamic", position: new Vec2(0, 0) });
  ball.createFixture(Circle(2), { density: 1 });
  assert.ok(Math.abs(ball.getMass() - Math.PI * 4) < 1e-6);
  assert.ok(Math.abs(ball.getInertia() - 0.5 * Math.PI * 4 * 4) < 1e-4);

  const locked = world.createBody({
    type: "dynamic",
    position: new Vec2(0, 0),
    fixedRotation: true,
  });
  locked.createFixture(Box(1, 1), { density: 1 });
  assert.equal(locked.getInertia(), 0, "fixed rotation means no inertia");
});

test("destroying a body removes it, its fixtures and its contacts", () => {
  const { world } = worldWithGround();
  const box = world.createBody({ type: "dynamic", position: new Vec2(0, 2) });
  box.createFixture(Box(0.5, 0.5), { density: 1 });
  run(world, 90);
  assert.ok(world.getContactCount() > 0);
  assert.equal(world.getBodyCount(), 2);

  world.destroyBody(box);
  run(world, 5);

  assert.equal(world.getBodyCount(), 1);
  assert.equal(world.getContactCount(), 0);
});

test("polygon and circle shape maths: AABB, point tests, hulls", () => {
  const xf = new Transform2();
  xf.set(new Vec2(2, 3), 0);

  const box = new PolygonShape();
  box.setAsBox(1, 2);
  const aabb = new AABB();
  box.computeAABB(aabb, xf);
  assert.ok(Math.abs(aabb.lowerBound.x - 1) < 0.02);
  assert.ok(Math.abs(aabb.upperBound.y - 5) < 0.02);
  assert.equal(box.testPoint(xf, new Vec2(2.5, 4)), true);
  assert.equal(box.testPoint(xf, new Vec2(4, 4)), false);

  const circle = new CircleShape(1.5);
  circle.computeAABB(aabb, xf);
  assert.ok(Math.abs(aabb.lowerBound.x - 0.5) < 1e-9);
  assert.equal(circle.testPoint(xf, new Vec2(3, 3)), true);
  assert.equal(circle.testPoint(xf, new Vec2(4, 3)), false);

  const hull = new PolygonShape([
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
    { x: 1, y: 1 },
  ]);
  assert.equal(hull.getVertexCount(), 4);
  assert.ok(Math.abs(hull.centroid.x - 1) < 1e-9);
  assert.ok(Math.abs(hull.centroid.y - 1) < 1e-9);
});

test("testOverlap agrees with the narrowphase about touching shapes", () => {
  const xfA = new Transform2();
  const xfB = new Transform2();
  xfA.set(new Vec2(0, 0), 0);

  xfB.set(new Vec2(1.5, 0), 0);
  assert.equal(testOverlap(Box(1, 1), xfA, Box(1, 1), xfB), true);

  xfB.set(new Vec2(2.5, 0), 0);
  assert.equal(testOverlap(Box(1, 1), xfA, Box(1, 1), xfB), false);

  xfB.set(new Vec2(1.2, 0), 0);
  assert.equal(testOverlap(Circle(1), xfA, Circle(0.5), xfB), true);
});

test("the AABB tree keeps queries and raycasts correct as it rebalances", () => {
  const tree = new DynamicTree();
  const ids = [];
  for (let i = 0; i < 50; i++) {
    const aabb = new AABB(i, 0, i + 0.5, 0.5);
    ids.push(tree.createProxy(aabb, { index: i }));
  }

  const found = [];
  tree.query(new AABB(10, 0, 12, 0.5), (id) => {
    found.push(tree.getUserData(id).index);
    return true;
  });
  found.sort((a, b) => a - b);
  assert.deepEqual(found, [10, 11, 12]);

  for (let i = 0; i < ids.length; i += 2) tree.destroyProxy(ids[i]);
  const remaining = [];
  tree.query(new AABB(-1, -1, 51, 1), (id) => {
    remaining.push(tree.getUserData(id).index);
    return true;
  });
  assert.equal(remaining.length, 25);
  assert.ok(remaining.every((i) => i % 2 === 1));
});

test("Physics converts between world pixels and physics units", () => {
  const physics = new Physics(-10, 32);
  const body = new RigidBody(physics, "dynamic", new Vector2(64, 320), true);
  new BoxCollider(body, new Vector2(0.5, 0.5), 1, 0.2, 0);

  assert.equal(body.getPosition().x, 64);
  assert.equal(body.getBody().getPosition().x, 2);

  body.setLinearVelocity(320, 0);
  assert.ok(Math.abs(body.getBody().getLinearVelocity().x - 10) < 1e-9);
  assert.ok(Math.abs(body.getLinearVelocity().x - 320) < 1e-9);

  physics.process(1 / 60);
  assert.ok(body.getPosition().x > 64, "the body moved in world units");
});

test("Physics.raycast and queryPoint report the owning game objects", () => {
  const physics = new Physics(0, 32);
  const owner = { name: "wall" };
  const wall = new RigidBody(
    physics,
    "static",
    new Vector2(160, 0),
    true,
    owner
  );
  new BoxCollider(wall, new Vector2(1, 5), 0, 0, 0, false, owner);
  physics.process(1 / 60);

  const hit = physics.raycast({ x: 0, y: 0 }, { x: 1, y: 0 }, 500);
  assert.ok(hit, "the ray should reach the wall");
  assert.equal(hit.object, owner);
  assert.ok(Math.abs(hit.point.x - 128) < 1, `hit at ${hit.point.x}`);
  assert.ok(Math.abs(hit.normal.x + 1) < 1e-6);

  assert.deepEqual(physics.queryPoint({ x: 160, y: 0 }), [owner]);
  assert.deepEqual(physics.queryPoint({ x: 400, y: 0 }), []);

  const missed = physics.raycast({ x: 0, y: 0 }, { x: -1, y: 0 }, 500);
  assert.equal(missed, null, "a ray pointing away must not hit");
});

test("Physics routes collisions to onCollisionEnter/onCollisionExit", () => {
  const physics = new Physics(-10, 32);
  const events = [];
  const player = {
    name: "player",
    components: [],
    onCollisionEnter: (other) => events.push(["enter", other && other.name]),
    onCollisionExit: (other) => events.push(["exit", other && other.name]),
  };
  const ground = { name: "ground", components: [] };

  const groundBody = new RigidBody(
    physics,
    "static",
    new Vector2(0, 0),
    true,
    ground
  );
  new BoxCollider(groundBody, new Vector2(10, 1), 0, 0.3, 0, false, ground);

  const playerBody = new RigidBody(
    physics,
    "dynamic",
    new Vector2(0, 200),
    true,
    player
  );
  new CircleCollider(playerBody, 0.5, 1, 0.3, 0, false, player);

  for (let i = 0; i < 240; i++) physics.process(1 / 60);

  assert.deepEqual(events[0], ["enter", "ground"]);
  assert.ok(
    playerBody.getPosition().y > 0,
    "the player should be resting on the ground"
  );
});

test("Physics.process steps on a fixed timestep and survives long stalls", () => {
  const physics = new Physics(-10, 32);
  physics.setFixedTimeStep(1 / 60, 5);
  const body = new RigidBody(physics, "dynamic", new Vector2(0, 0), true);
  new BoxCollider(body, new Vector2(0.5, 0.5), 1, 0, 0);

  physics.process(1 / 120);
  assert.equal(body.getBody().getLinearVelocity().y, 0);
  physics.process(1 / 120);
  assert.ok(body.getBody().getLinearVelocity().y < 0, "one full step ran");

  const before = body.getBody().getLinearVelocity().y;
  physics.process(10);
  const after = body.getBody().getLinearVelocity().y;
  assert.ok(
    Math.abs(after - before) < 10 * (1 / 60) * 10,
    "the substep cap should bound how far a single call advances"
  );
});

test("variable time step advances once per frame at the frame's own delta", () => {
  const physics = new Physics(-10, 32);
  physics.setVariableTimeStep();
  assert.equal(physics.getTimeStepMode(), "variable");

  const body = new RigidBody(physics, "dynamic", new Vector2(0, 0), true);
  new BoxCollider(body, new Vector2(0.5, 0.5), 1, 0, 0);

  assert.equal(physics.process(1 / 120), 1);
  const v1 = body.getBody().getLinearVelocity().y;
  assert.ok(Math.abs(v1 - -10 / 120) < 1e-9, `got ${v1}`);

  assert.equal(physics.process(1 / 120), 1);
  const v2 = body.getBody().getLinearVelocity().y;
  assert.ok(Math.abs(v2 - -10 / 60) < 1e-9, `got ${v2}`);
});

test("variable and fixed steps agree on free fall over the same span", () => {
  const fall = (configure, dt, frames) => {
    const physics = new Physics(-10, 32);
    configure(physics);
    const body = new RigidBody(physics, "dynamic", new Vector2(0, 0), true);
    new BoxCollider(body, new Vector2(0.5, 0.5), 1, 0, 0);
    for (let i = 0; i < frames; i++) physics.process(dt);
    return body.getBody().getLinearVelocity().y;
  };

  const fixed = fall((p) => p.setFixedTimeStep(1 / 60), 1 / 60, 60);
  const variable = fall((p) => p.setVariableTimeStep(), 1 / 120, 120);
  assert.ok(Math.abs(fixed - variable) < 1e-6, `${fixed} vs ${variable}`);
  assert.ok(Math.abs(fixed - -10) < 1e-6);
});

test("variable step splits a long frame and caps a stalled one", () => {
  const physics = new Physics(-10, 32);
  physics.setVariableTimeStep(1 / 30, 5);
  const body = new RigidBody(physics, "dynamic", new Vector2(0, 0), true);
  new BoxCollider(body, new Vector2(0.5, 0.5), 1, 0, 0);

  assert.equal(physics.process(1 / 60), 1);
  assert.equal(physics.process(3 / 30), 3);

  const before = body.getBody().getLinearVelocity().y;
  assert.equal(physics.process(30), 5);
  const advanced = before - body.getBody().getLinearVelocity().y;
  assert.ok(
    Math.abs(advanced - 10 * (5 / 30)) < 1e-6,
    `expected ~1/6s of gravity, got ${advanced}`
  );
});

test("switching modes keeps stepping correct and drops stale banked time", () => {
  const physics = new Physics(-10, 32);
  const body = new RigidBody(physics, "dynamic", new Vector2(0, 0), true);
  new BoxCollider(body, new Vector2(0.5, 0.5), 1, 0, 0);

  assert.equal(physics.getTimeStepMode(), "fixed");
  assert.equal(physics.process(1 / 120), 0);
  assert.ok(physics.getInterpolationAlpha() > 0.49);

  physics.setVariableTimeStep();
  assert.equal(physics.getInterpolationAlpha(), 0);
  assert.equal(physics.process(1 / 60), 1);
  assert.ok(
    Math.abs(body.getBody().getLinearVelocity().y - -10 / 60) < 1e-9,
    "only the frame's own delta should have been simulated"
  );

  physics.setFixedTimeStep(1 / 60);
  assert.equal(physics.getTimeStepMode(), "fixed");
  assert.equal(physics.process(1 / 60), 1);
});

test("process ignores non-finite or non-positive deltas in both modes", () => {
  for (const mode of ["fixed", "variable"]) {
    const physics = new Physics(-10, 32);
    if (mode === "variable") physics.setVariableTimeStep();
    const body = new RigidBody(physics, "dynamic", new Vector2(0, 0), true);
    new BoxCollider(body, new Vector2(0.5, 0.5), 1, 0, 0);

    assert.equal(physics.process(0), 0, mode);
    assert.equal(physics.process(-1), 0, mode);
    assert.equal(physics.process(NaN), 0, mode);
    assert.equal(physics.process(Infinity), 0, mode);
    assert.equal(body.getBody().getLinearVelocity().y, 0, mode);
  }
});

test("Physics.clear empties the world and keeps collision routing alive", () => {
  const physics = new Physics(-10, 32);
  const owner = { name: "box", components: [] };
  const body = new RigidBody(
    physics,
    "dynamic",
    new Vector2(0, 0),
    true,
    owner
  );
  new BoxCollider(body, new Vector2(0.5, 0.5), 1, 0, 0, false, owner);
  assert.equal(physics.world.getBodyCount(), 1);

  physics.clear();
  assert.equal(physics.world.getBodyCount(), 0);

  let entered = false;
  const ground = {
    name: "ground",
    components: [],
    onCollisionEnter: () => {
      entered = true;
    },
  };
  const groundBody = new RigidBody(
    physics,
    "static",
    new Vector2(0, 0),
    true,
    ground
  );
  new BoxCollider(groundBody, new Vector2(10, 1), 0, 0, 0, false, ground);
  const faller = new RigidBody(physics, "dynamic", new Vector2(0, 200), true, {
    name: "faller",
    components: [],
  });
  new BoxCollider(faller, new Vector2(0.5, 0.5), 1, 0, 0);

  for (let i = 0; i < 240; i++) physics.process(1 / 60);
  assert.equal(
    entered,
    true,
    "contacts must still be dispatched after clear()"
  );
});

test("collider debug shapes follow an offset rigidbody", () => {
  const physics = new Physics(-10, 32);
  const owner = { name: "hero", components: [] };
  const offset = new Vector2(-4, -10);
  const body = new RigidBody(
    physics,
    "dynamic",
    new Vector2(100, 200),
    true,
    owner,
    offset
  );
  const collider = new BoxCollider(
    body,
    new Vector2(0.5, 0.5),
    1,
    0,
    0,
    false,
    owner
  );

  collider._debugShape = {
    gameObject: { transform: { position: { x: 0, y: 0 }, rotation: 0 } },
  };
  collider.syncDebugShape({ position: { x: 100, y: 200 }, rotation: 0 });

  const drawn = collider._debugShape.gameObject.transform.position;
  assert.equal(drawn.x, 96);
  assert.equal(drawn.y, 190);
  assert.equal(body.getBody().getPosition().x * 32, 96);
  assert.equal(body.getBody().getPosition().y * 32, 190);
});

test("Physics.onCollisionEnter listeners survive a clear()", () => {
  const physics = new Physics(-10, 32);
  const seen = [];
  physics.onCollisionEnter((bodyA, bodyB) => seen.push([bodyA, bodyB]));

  physics.clear();

  const ground = new RigidBody(physics, "static", new Vector2(0, 0), true);
  new BoxCollider(ground, new Vector2(10, 1), 0, 0, 0);
  const faller = new RigidBody(physics, "dynamic", new Vector2(0, 200), true);
  new BoxCollider(faller, new Vector2(0.5, 0.5), 1, 0, 0);

  for (let i = 0; i < 240; i++) physics.process(1 / 60);

  assert.equal(seen.length, 1);
  assert.ok(
    seen[0].includes(ground.getBody()) && seen[0].includes(faller.getBody()),
    "the listener receives both physics bodies"
  );
});
