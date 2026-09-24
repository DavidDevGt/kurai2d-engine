import { World, Box, Vec2 as PhysicsVec2 } from "./physics/index.js";

/** @import RigidBody from "./components/RigidBody.js" */
/** @import DistanceJoint from "./physics/DistanceJoint.js" */
/** @import RevoluteJoint from "./physics/RevoluteJoint.js" */
/** @import { Joint } from "./physics/Joint.js" */
/** @import { Body } from "./physics/Body.js" */

/**
 * @function dispatchCollision
 * @description Calls onCollisionEnter/onCollisionExit on an object and its
 * component list (Behaviours), passing the other object. Duck-typed so this
 * module doesn't need to import the component classes.
 * @private
 */
function dispatchCollision(object, other, contact, type) {
  if (!object) return;
  if (typeof object[type] === "function") {
    object[type](other, contact);
  }
  if (Array.isArray(object.components)) {
    for (const comp of object.components) {
      if (comp && typeof comp[type] === "function") {
        comp[type](other, contact);
      }
    }
  }
}

/**
 * @class Physics
 * @description The game-facing front end of Kurai2D's own rigid-body engine
 * (see `src/physics`). It owns the {@link World}, converts between world
 * (pixel) units and physics units via `scale`, steps the simulation on a fixed
 * timestep, and routes contacts to `onCollisionEnter`/`onCollisionExit` on your
 * objects and {@link Behaviour} components.
 * @param {number} gravity - The gravity of the physics engine
 * @param {number} scale - Pixels per physics unit (meter)
 * @param {number} velocityThreshold - Relative speed below which impacts stop
 *   bouncing, which is what lets resting bodies settle instead of jittering
 */
class Physics {
  constructor(gravity, scale, velocityThreshold = 0.1) {
    this.world = new World({
      gravity: new PhysicsVec2(0, gravity),
      velocityThreshold,
    });
    this.gravity = gravity;
    this.scale = scale;

    this.fixedTimeStep = 1 / 60;
    this.maxSubSteps = 5;
    /** Largest slice the variable mode will simulate in one step. */
    this.maxTimeStep = 1 / 30;
    /** "fixed" or "variable", see {@link Physics#setVariableTimeStep}. */
    this.timeStepMode = "fixed";
    /** Steps taken by the last process() call. */
    this.lastStepCount = 0;
    /** @private */
    this._accumulator = 0;
    /** World-level listeners added via onCollisionEnter. @private */
    this._enterCallbacks = [];
    /** World-level listeners added via onCollisionExit. @private */
    this._exitCallbacks = [];

    this._dispatchContacts();
  }

  /**
   * @method _dispatchContacts
   * @description Binds contact routing to the current world: owning objects (so
   * Behaviour components receive onCollisionEnter/onCollisionExit) first, then
   * any world-level listeners. Bodies created through RigidBody carry the owner
   * via userData. Re-run whenever the world is replaced, so subscriptions
   * survive a clear().
   * @private
   */
  _dispatchContacts() {
    const fire = (contact, type, callbacks) => {
      const fixtureA = contact.getFixtureA();
      const fixtureB = contact.getFixtureB();
      const bodyA = fixtureA.getBody();
      const bodyB = fixtureB.getBody();

      const a = bodyA.getUserData();
      const b = bodyB.getUserData();
      const objA = a && a.parentObject ? a.parentObject : null;
      const objB = b && b.parentObject ? b.parentObject : null;
      dispatchCollision(objA, objB, contact, type);
      dispatchCollision(objB, objA, contact, type);

      for (const callback of callbacks) callback(bodyA, bodyB, contact);
    };

    this.world.on("begin-contact", (contact) =>
      fire(contact, "onCollisionEnter", this._enterCallbacks)
    );
    this.world.on("end-contact", (contact) =>
      fire(contact, "onCollisionExit", this._exitCallbacks)
    );
  }

  /**
   * @method raycast
   * @description Casts a ray through the world and returns the closest hit.
   * @param {Object} origin - World-space { x, y } start point
   * @param {Object} direction - Ray direction { x, y } (need not be normalized)
   * @param {number} maxDistance - Max ray length in world units
   * @returns {{object, rigidBody, point, normal, fraction}|null}
   */
  raycast(origin, direction, maxDistance) {
    const scale = this.scale;
    const len = Math.hypot(direction.x, direction.y) || 1;
    const dx = direction.x / len;
    const dy = direction.y / len;
    const p1 = new PhysicsVec2(origin.x / scale, origin.y / scale);
    const p2 = new PhysicsVec2(
      (origin.x + dx * maxDistance) / scale,
      (origin.y + dy * maxDistance) / scale
    );

    let result = null;
    this.world.rayCast(p1, p2, (fixture, point, normal, fraction) => {
      const rb = fixture.getBody().getUserData();
      result = {
        object: rb && rb.parentObject ? rb.parentObject : null,
        rigidBody: rb || null,
        point: { x: point.x * scale, y: point.y * scale },
        normal: { x: normal.x, y: normal.y },
        fraction,
      };
      return fraction;
    });
    return result;
  }

  /**
   * @method queryPoint
   * @description Returns the objects whose colliders contain a world-space point.
   * @param {Object} point - World-space { x, y }
   * @returns {Array} - Owning objects at the point
   */
  queryPoint(point) {
    const p = new PhysicsVec2(point.x / this.scale, point.y / this.scale);
    const results = [];
    const seen = new Set();
    this.world.queryPoint(p, (fixture) => {
      const body = fixture.getBody();
      if (seen.has(body)) return true;
      seen.add(body);
      const rb = body.getUserData();
      if (rb && rb.parentObject) results.push(rb.parentObject);
      return true;
    });
    return results;
  }

  /**
   * @method setFixedTimeStep
   * @description Runs the simulation in constant-size slices, independent of
   * the frame rate: `process()` banks the elapsed time and steps as many whole
   * slices as fit. This is the default and the safe choice: the same inputs
   * produce the same result on every machine, and a slow frame can't destabilise
   * the solver.
   *
   * The cost is that motion updates at the step rate, not the display rate. On
   * a 120Hz screen with a 1/60 step, every simulated position is shown for two
   * frames, so anything that moves in the render frame (a smoothly lerped
   * camera, for instance) will slide against sprites that only move every other
   * frame. Either drive those from the same fixed step, or use
   * {@link Physics#setVariableTimeStep}.
   *
   * @param {number} step - Fixed step in seconds (e.g. 1/60)
   * @param {number} [maxSubSteps] - Max steps per process() call (spiral guard)
   * @returns {Physics} - this
   */
  setFixedTimeStep(step, maxSubSteps = this.maxSubSteps) {
    if (step > 0) this.fixedTimeStep = step;
    this.maxSubSteps = maxSubSteps;
    this.timeStepMode = "fixed";
    return this;
  }

  /**
   * @method setVariableTimeStep
   * @description Advances the simulation once per `process()` call using the
   * frame's own delta, so physics runs at exactly the rendering rate. Every
   * rendered frame then shows a freshly simulated position, which is what
   * removes the stepping you otherwise see when the display refreshes faster
   * than the simulation.
   *
   * The trade-offs are real and worth knowing:
   * - **Not deterministic.** Results depend on the frame timings the machine
   *   happened to produce, so replays and lockstep networking need fixed steps.
   * - **Solver accuracy tracks the frame rate.** Contacts are resolved
   *   iteratively, so a long frame is a coarser solve; deep stacks and fast
   *   bodies are more forgiving under a fixed step.
   *
   * A frame longer than `maxStep` is split into several equal steps rather than
   * simulated in one lump, up to `maxSubSteps`; beyond that the excess time is
   * dropped instead of letting the world explode or spiral.
   *
   * @param {number} [maxStep=1/30] - Longest slice to simulate in one step
   * @param {number} [maxSubSteps] - Max steps per process() call
   * @returns {Physics} - this
   */
  setVariableTimeStep(maxStep = 1 / 30, maxSubSteps = this.maxSubSteps) {
    if (maxStep > 0) this.maxTimeStep = maxStep;
    this.maxSubSteps = maxSubSteps;
    this.timeStepMode = "variable";
    this._accumulator = 0;
    return this;
  }

  /**
   * @method getTimeStepMode
   * @description Returns "fixed" or "variable".
   * @returns {string}
   */
  getTimeStepMode() {
    return this.timeStepMode;
  }

  /**
   * @method createBody
   * @description Creates a body in the physics engine
   * @param {string} type - The type of the body
   * @param {Vector2} position - The position of the body
   * @param {boolean} fixedRotation - Whether the body should have a fixed rotation
   * @param {boolean} attachFixture - Whether the body should have a fixture
   * @param {Vector2} fixtureSize - The size of the fixture
   * @param {number} density - The density of the fixture
   * @param {number} friction - The friction of the fixture
   * @param {number} restitution - The restitution of the fixture
   * @returns {Body} - The body
   */
  createBody(
    type,
    position = new Vector2(0, 0),
    fixedRotation = false,
    attachFixture = true,
    fixtureSize = new Vector2(1, 1),
    density = 0,
    friction = 0,
    restitution = 0
  ) {
    const bodyRef = this.world.createBody({
      type: type,
      position: new PhysicsVec2(
        position.x / this.scale,
        position.y / this.scale
      ),
      fixedRotation: fixedRotation,
    });

    if (attachFixture) {
      bodyRef.createFixture(Box(fixtureSize.x, fixtureSize.y), {
        density: density,
        friction: friction,
        restitution: restitution,
      });
    }

    return bodyRef;
  }

  /**
   * @method createDistanceJoint
   * @description Connects two rigid bodies with a fixed-length rod between two
   * world-space anchor points, or a damped spring toward that length when
   * `frequencyHz` is set.
   * @param {RigidBody} rigidBodyA
   * @param {RigidBody} rigidBodyB
   * @param {Object} [options] - `{ anchorA, anchorB, length, frequencyHz,
   *   dampingRatio, collideConnected }`. `anchorA`/`anchorB` are world-space
   *   pixel points; each defaults to its body's own center. `length` is in
   *   pixels; it defaults to the current distance between the anchors.
   * @returns {DistanceJoint}
   */
  createDistanceJoint(rigidBodyA, rigidBodyB, options = {}) {
    const bodyA = rigidBodyA.body;
    const bodyB = rigidBodyB.body;
    const scale = this.scale;
    const anchorA = options.anchorA
      ? new PhysicsVec2(options.anchorA.x / scale, options.anchorA.y / scale)
      : bodyA.getWorldCenter();
    const anchorB = options.anchorB
      ? new PhysicsVec2(options.anchorB.x / scale, options.anchorB.y / scale)
      : bodyB.getWorldCenter();
    const length =
      options.length != null
        ? options.length / scale
        : Math.hypot(anchorB.x - anchorA.x, anchorB.y - anchorA.y);

    const joint = this.world.createJoint({
      type: "distance",
      bodyA,
      bodyB,
      localAnchorA: bodyA.getLocalPoint(anchorA),
      localAnchorB: bodyB.getLocalPoint(anchorB),
      length,
      frequencyHz: options.frequencyHz,
      dampingRatio: options.dampingRatio,
      collideConnected: options.collideConnected,
    });
    return /** @type {DistanceJoint} */ (joint);
  }

  /**
   * @method createRevoluteJoint
   * @description Pins two rigid bodies together at a shared world-space point,
   * like a hinge: a door, a pendulum arm, a see-saw. Set `enableMotor` to
   * drive it toward a target angular speed instead of swinging freely.
   * @param {RigidBody} rigidBodyA
   * @param {RigidBody} rigidBodyB
   * @param {Object} anchor - World-space pixel point both bodies pin to
   * @param {Object} [options] - `{ enableMotor, motorSpeed, maxMotorTorque,
   *   collideConnected }`
   * @returns {RevoluteJoint}
   */
  createRevoluteJoint(rigidBodyA, rigidBodyB, anchor, options = {}) {
    const bodyA = rigidBodyA.body;
    const bodyB = rigidBodyB.body;
    const worldAnchor = new PhysicsVec2(
      anchor.x / this.scale,
      anchor.y / this.scale
    );

    const joint = this.world.createJoint({
      type: "revolute",
      bodyA,
      bodyB,
      localAnchorA: bodyA.getLocalPoint(worldAnchor),
      localAnchorB: bodyB.getLocalPoint(worldAnchor),
      enableMotor: options.enableMotor,
      motorSpeed: options.motorSpeed,
      maxMotorTorque: options.maxMotorTorque,
      collideConnected: options.collideConnected,
    });
    return /** @type {RevoluteJoint} */ (joint);
  }

  /**
   * @method destroyJoint
   * @description Removes a joint created by {@link Physics#createDistanceJoint}
   * or {@link Physics#createRevoluteJoint}.
   * @param {Joint} joint
   */
  destroyJoint(joint) {
    this.world.destroyJoint(joint);
  }

  /**
   * @method onCollisionEnter
   * @description Registers a world-level listener called whenever any two
   * fixtures start touching. Survives {@link Physics#clear}.
   * @param {Function} callback - Called with (bodyA, bodyB, contact)
   */
  onCollisionEnter(callback) {
    if (typeof callback === "function") this._enterCallbacks.push(callback);
  }

  /**
   * @method onCollisionExit
   * @description Registers a world-level listener called whenever any two
   * fixtures stop touching. Survives {@link Physics#clear}.
   * @param {Function} callback - Called with (bodyA, bodyB, contact)
   */
  onCollisionExit(callback) {
    if (typeof callback === "function") this._exitCallbacks.push(callback);
  }

  /**
   * @method process
   * @description Advances the simulation by `dt` seconds, in whichever way the
   * current time-step mode calls for. Call it once per frame.
   * @param {number} dt - Seconds elapsed since the previous call
   * @returns {number} - How many steps were simulated
   */
  process(dt) {
    this.lastStepCount = 0;
    if (!Number.isFinite(dt) || dt <= 0) return 0;

    this.lastStepCount =
      this.timeStepMode === "variable"
        ? this._stepVariable(dt)
        : this._stepFixed(dt);
    return this.lastStepCount;
  }

  /**
   * @method _stepVariable
   * @description Simulates the frame's own delta. Normally that is a single
   * step of exactly `dt`, so physics advances in lock-step with rendering. Only
   * an unusually long frame is divided, and only far enough to keep each slice
   * within `maxTimeStep`.
   * @param {number} dt
   * @returns {number} - Steps taken
   * @private
   */
  _stepVariable(dt) {
    const budget = this.maxTimeStep * this.maxSubSteps;
    const total = Math.min(dt, budget);
    const steps = Math.max(1, Math.ceil(total / this.maxTimeStep));
    const step = total / steps;

    for (let i = 0; i < steps; i++) {
      this.world.step(step);
    }
    return steps;
  }

  /**
   * @method _stepFixed
   * @description Banks elapsed time and simulates as many constant-size slices
   * as have accumulated, leaving the remainder for next frame.
   * @param {number} dt
   * @returns {number} - Steps taken
   * @private
   */
  _stepFixed(dt) {
    this._accumulator += dt;
    let steps = 0;
    while (
      this._accumulator >= this.fixedTimeStep &&
      steps < this.maxSubSteps
    ) {
      this.world.step(this.fixedTimeStep);
      this._accumulator -= this.fixedTimeStep;
      steps++;
    }

    if (steps === this.maxSubSteps) this._accumulator = 0;
    return steps;
  }

  /**
   * @method getInterpolationAlpha
   * @description How far the fixed-step simulation currently sits between its
   * last completed step and the next one (0..1). Useful if you interpolate
   * renderables between physics states. Always 0 in variable mode, where every
   * frame already renders a freshly simulated position.
   * @returns {number}
   */
  getInterpolationAlpha() {
    if (this.timeStepMode === "variable" || this.fixedTimeStep <= 0) return 0;
    return Math.min(1, this._accumulator / this.fixedTimeStep);
  }

  /**
   * @method clear
   * @description Drops every body and starts a fresh world with the original
   * gravity; use it when tearing a level down. Collision routing and any
   * listeners added through onCollisionEnter/onCollisionExit are re-bound to
   * the new world, so they keep working afterwards.
   */
  clear() {
    this.world = new World({
      gravity: new PhysicsVec2(0, this.gravity),
      velocityThreshold: this.world.velocityThreshold,
    });
    this._accumulator = 0;
    this._dispatchContacts();
  }

  /**
   * @method getGravity
   * @description Returns the gravity of the physics engine
   * @returns {number} - The gravity of the physics engine
   */
  getGravity() {
    return this.gravity;
  }

  /**
   * @method getScale
   * @description Returns the scale of the physics engine
   * @returns {number} - The scale of the physics engine
   */
  getScale() {
    return this.scale;
  }

  /**
   * @method scheduleAction
   * @description Schedules an action to be executed as soon as possible
   * @param {Function} callback - The callback function to execute
   */
  static scheduleAction(callback) {
    if (typeof callback === "function") {
      setTimeout(() => {
        callback();
      }, 0);
    }
  }
}

/**
 * @class Vector2
 * @description Represents a 2D vector
 * @param {number} x - The x coordinate of the vector
 * @param {number} y - The y coordinate of the vector
 */
class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * @method set
   * @description Sets the x and y coordinates in place
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @returns {Vector2} - This vector
   */
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * @method clone
   * @description Returns a copy of the vector
   * @returns {Vector2} - The cloned vector
   */
  clone() {
    return new Vector2(this.x, this.y);
  }

  /**
   * @method equals
   * @description Checks if the vector is equal to another vector
   * @param {Vector2} other - The other vector
   * @returns {boolean} - True if the vector is equal to the other vector
   */
  equals(other) {
    if (!other) return false;
    if (!(other instanceof Vector2)) return false;
    return this.x === other.x && this.y === other.y;
  }

  /**
   * @method getX
   * @description Returns the x coordinate of the vector
   * @returns {number} - The x coordinate of the vector
   */
  getX() {
    return this.x;
  }

  /**
   * @method getY
   * @description Returns the y coordinate of the vector
   * @returns {number} - The y coordinate of the vector
   */
  getY() {
    return this.y;
  }
}

/**
 * @class Vector3
 * @description Represents a 3D vector
 * @param {number} x - The x coordinate of the vector
 * @param {number} y - The y coordinate of the vector
 * @param {number} z - The z coordinate of the vector
 */
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * @method set
   * @description Sets the x, y and z coordinates in place
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @param {number} z - The z coordinate
   * @returns {Vector3} - This vector
   */
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /**
   * @method clone
   * @description Returns a copy of the vector
   * @returns {Vector3} - The cloned vector
   */
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  /**
   * @method equals
   * @description Checks if the vector is equal to another vector
   * @param {Vector3} other - The other vector
   * @returns {boolean} - True if the vector is equal to the other vector
   */
  equals(other) {
    if (!other) return false;
    if (!(other instanceof Vector3)) return false;
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }

  /**
   * @method getX
   * @description Returns the x coordinate of the vector
   * @returns {number} - The x coordinate of the vector
   */
  getX() {
    return this.x;
  }

  /**
   * @method getY
   * @description Returns the y coordinate of the vector
   * @returns {number} - The y coordinate of the vector
   */
  getY() {
    return this.y;
  }

  /**
   * @method getZ
   * @description Returns the z coordinate of the vector
   * @returns {number} - The z coordinate of the vector
   */
  getZ() {
    return this.z;
  }
}

export { Physics, Vector2, Vector3 };
