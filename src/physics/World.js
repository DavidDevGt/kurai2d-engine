import { Vec2 } from "./Math2D.js";
import Settings from "./Settings.js";
import AABB from "./AABB.js";
import { BroadPhase } from "./BroadPhase.js";
import { Body } from "./Body.js";
import { BodyType } from "./BodyType.js";
import { ContactManager, shouldCollide } from "./Contact.js";
import Island from "./Island.js";
import { DistanceProxy } from "./Distance.js";
import { timeOfImpact, TOIState } from "./TimeOfImpact.js";
import { JointType } from "./Joint.js";
import DistanceJoint from "./DistanceJoint.js";
import RevoluteJoint from "./RevoluteJoint.js";

/** @import { Joint } from "./Joint.js" */
/** @import { Contact } from "./Contact.js" */

/**
 * @function removeFrom
 * @description Splices the first occurrence of `item` out of `array`.
 * @private
 */
function removeFrom(array, item) {
  const index = array.indexOf(item);
  if (index >= 0) array.splice(index, 1);
}

const EVENTS = [
  "begin-contact",
  "end-contact",
  "pre-solve",
  "post-solve",
  "remove-body",
  "remove-fixture",
];

/**
 * @class World
 * @description The physics world: it owns the bodies, finds which ones touch,
 * and advances them all by one time step. This is Kurai2D's own rigid-body
 * engine: broadphase, narrowphase, an impulse solver and continuous collision
 * detection, with no external physics dependency.
 *
 * Games normally reach it through {@link Physics}, which adds the pixel/meter
 * conversion, a fixed-timestep accumulator and collision routing to
 * {@link Behaviour} components.
 *
 * @param {Object} [def] - `{ gravity, allowSleep, warmStarting,
 *   continuousPhysics, velocityThreshold, velocityIterations,
 *   positionIterations }`
 */
class World {
  constructor(def = {}) {
    this.gravity = new Vec2(def.gravity || { x: 0, y: 0 });
    this.broadPhase = new BroadPhase();
    this.contactManager = new ContactManager(this);

    /** Head of the body list; walk it with {@link Body#getNext}. @private */
    this.bodyList = null;
    this.bodyCount = 0;

    /** Head of the joint list. @private */
    this.jointList = null;
    this.jointCount = 0;

    this.allowSleep = def.allowSleep !== false;
    this.warmStarting = def.warmStarting !== false;
    this.continuousPhysics = def.continuousPhysics !== false;
    this.autoClearForces = def.autoClearForces !== false;

    this.velocityThreshold =
      def.velocityThreshold ?? Settings.velocityThreshold;
    this.velocityIterations =
      def.velocityIterations ?? Settings.velocityIterations;
    this.positionIterations =
      def.positionIterations ?? Settings.positionIterations;

    /** Optional `(fixtureA, fixtureB) => boolean` veto on new contacts. */
    this.contactFilter = null;

    /** @private */
    this.newContacts = false;
    /** @private */
    this.locked = false;
    /** @private */
    this.island = new Island();
    /** @private */
    this.listeners = Object.create(null);
    for (const name of EVENTS) this.listeners[name] = [];

    /** @private */
    this._toiProxyA = new DistanceProxy();
    /** @private */
    this._toiProxyB = new DistanceProxy();
    /** What the last time-of-impact search hit. @private */
    this._toiHitBody = null;
  }

  /**
   * @method on
   * @description Subscribes to a world event. Supported events:
   * `begin-contact`, `end-contact`, `pre-solve`, `post-solve`, `remove-body`
   * and `remove-fixture`.
   * @param {string} name - Event name
   * @param {Function} listener - Called with the contact (or body/fixture)
   * @returns {World} - this
   */
  on(name, listener) {
    if (!this.listeners[name]) this.listeners[name] = [];
    if (typeof listener === "function") this.listeners[name].push(listener);
    return this;
  }

  /**
   * @method off
   * @description Unsubscribes a listener.
   * @param {string} name
   * @param {Function} listener
   * @returns {World} - this
   */
  off(name, listener) {
    const list = this.listeners[name];
    if (!list) return this;
    const index = list.indexOf(listener);
    if (index >= 0) list.splice(index, 1);
    return this;
  }

  /**
   * @method dispatch
   * @description Fires a world event. Listener errors are contained so one bad
   * callback can't halt the simulation mid-step.
   * @param {string} name
   * @param {...*} args
   */
  dispatch(name, ...args) {
    const list = this.listeners[name];
    if (!list || list.length === 0) return;
    for (const listener of list) {
      try {
        listener(...args);
      } catch (error) {
        console.error(`[Physics] ${name} listener threw:`, error);
      }
    }
  }

  /**
   * @method createBody
   * @description Creates a body in this world.
   * @param {Object} [def] - See {@link Body}
   * @returns {Body}
   */
  createBody(def = {}) {
    if (this.locked) {
      throw new Error(
        "[Physics] Cannot create a body while the world is stepping."
      );
    }
    const body = new Body(this, def);
    body.prev = null;
    body.next = this.bodyList;
    if (this.bodyList) this.bodyList.prev = body;
    this.bodyList = body;
    this.bodyCount++;
    return body;
  }

  /**
   * @method destroyBody
   * @description Removes a body, its fixtures and all its contacts.
   * @param {Body} body
   */
  destroyBody(body) {
    if (!body || body.world !== this) return;
    if (this.locked) {
      throw new Error(
        "[Physics] Cannot destroy a body while the world is stepping."
      );
    }

    for (let i = body.joints.length - 1; i >= 0; i--) {
      this.destroyJoint(body.joints[i]);
    }

    for (let i = body.contacts.length - 1; i >= 0; i--) {
      this.contactManager.destroy(body.contacts[i]);
    }
    body.contacts.length = 0;

    let fixture = body.fixtureList;
    while (fixture) {
      const next = fixture.next;
      this.dispatch("remove-fixture", fixture);
      if (body.active) fixture.destroyProxies(this.broadPhase);
      fixture.body = null;
      fixture.next = null;
      fixture = next;
    }
    body.fixtureList = null;
    body.fixtureCount = 0;

    this.dispatch("remove-body", body);

    if (body.prev) body.prev.next = body.next;
    if (body.next) body.next.prev = body.prev;
    if (body === this.bodyList) this.bodyList = body.next;
    body.prev = null;
    body.next = null;
    body.world = null;
    this.bodyCount--;
  }

  /**
   * @method getBodyList
   * @description Returns the first body; walk the rest with
   * {@link Body#getNext}.
   * @returns {Body|null}
   */
  getBodyList() {
    return this.bodyList;
  }

  /**
   * @method getBodyCount
   * @description Number of bodies in the world.
   * @returns {number}
   */
  getBodyCount() {
    return this.bodyCount;
  }

  /**
   * @method createJoint
   * @description Creates a constraint between two bodies, a
   * {@link DistanceJoint} or a {@link RevoluteJoint}, chosen by `def.type`
   * (see {@link JointType}). Wakes both bodies, since a joint pulling on a
   * sleeping body needs it simulating again immediately.
   * @param {Object} def - `{ type, bodyA, bodyB, ... }`, forwarded to the
   *   chosen joint's constructor
   * @returns {Joint}
   */
  createJoint(def) {
    if (this.locked) {
      throw new Error(
        "[Physics] Cannot create a joint while the world is stepping."
      );
    }

    const joint =
      def.type === JointType.REVOLUTE
        ? new RevoluteJoint(def)
        : new DistanceJoint(def);

    joint.prev = null;
    joint.next = this.jointList;
    if (this.jointList) this.jointList.prev = joint;
    this.jointList = joint;
    this.jointCount++;

    joint.bodyA.joints.push(joint);
    joint.bodyB.joints.push(joint);
    joint.bodyA.setAwake(true);
    joint.bodyB.setAwake(true);

    if (!joint.collideConnected) {
      for (let i = joint.bodyA.contacts.length - 1; i >= 0; i--) {
        const contact = joint.bodyA.contacts[i];
        const other =
          contact.fixtureA.body === joint.bodyA
            ? contact.fixtureB.body
            : contact.fixtureA.body;
        if (other === joint.bodyB) this.contactManager.destroy(contact);
      }
    }

    return joint;
  }

  /**
   * @method destroyJoint
   * @description Removes a joint. Safe to call as part of destroying one of
   * its bodies (see {@link World#destroyBody}).
   * @param {Joint} joint
   */
  destroyJoint(joint) {
    if (!joint) return;
    if (this.locked) {
      throw new Error(
        "[Physics] Cannot destroy a joint while the world is stepping."
      );
    }

    joint.bodyA.setAwake(true);
    joint.bodyB.setAwake(true);
    removeFrom(joint.bodyA.joints, joint);
    removeFrom(joint.bodyB.joints, joint);

    if (joint.prev) joint.prev.next = joint.next;
    if (joint.next) joint.next.prev = joint.prev;
    if (joint === this.jointList) this.jointList = joint.next;
    joint.prev = null;
    joint.next = null;
    this.jointCount--;
  }

  /**
   * @method getJointList
   * @description Returns the first joint; walk the rest with `joint.next`.
   * @returns {Joint|null}
   */
  getJointList() {
    return this.jointList;
  }

  /**
   * @method getJointCount
   * @returns {number}
   */
  getJointCount() {
    return this.jointCount;
  }

  /**
   * @method getContactList
   * @description Returns every live contact (touching or merely close enough
   * for their bounding boxes to overlap).
   * @returns {Array<Contact>}
   */
  getContactList() {
    return this.contactManager.contacts;
  }

  /**
   * @method getContactCount
   * @description Number of live contacts.
   * @returns {number}
   */
  getContactCount() {
    return this.contactManager.contacts.length;
  }

  /**
   * @method setGravity
   * @description Sets world gravity in physics units per second squared.
   * @param {Object} gravity - `{ x, y }`
   */
  setGravity(gravity) {
    this.gravity.set(gravity.x, gravity.y);
    for (let body = this.bodyList; body; body = body.next) {
      if (body.type === BodyType.DYNAMIC) body.setAwake(true);
    }
  }

  /**
   * @method getGravity
   * @description Returns world gravity.
   * @returns {Vec2}
   */
  getGravity() {
    return this.gravity;
  }

  /**
   * @method isLocked
   * @description True while a step is in progress, when the body/fixture graph
   * must not be modified.
   * @returns {boolean}
   */
  isLocked() {
    return this.locked;
  }

  /**
   * @method setAllowSleeping
   * @description Enables or disables sleeping world-wide.
   * @param {boolean} flag
   */
  setAllowSleeping(flag) {
    if (flag === this.allowSleep) return;
    this.allowSleep = !!flag;
    if (!this.allowSleep) {
      for (let body = this.bodyList; body; body = body.next)
        body.setAwake(true);
    }
  }

  /**
   * @method step
   * @description Advances the simulation by `dt` seconds: refresh contacts,
   * solve the islands, then sweep any continuous (bullet) bodies.
   * @param {number} dt - Time step in seconds
   * @param {number} [velocityIterations] - Solver velocity iterations
   * @param {number} [positionIterations] - Solver position iterations
   */
  step(
    dt,
    velocityIterations = this.velocityIterations,
    positionIterations = this.positionIterations
  ) {
    if (!Number.isFinite(dt) || dt < 0) return;

    if (this.newContacts) {
      this.contactManager.findNewContacts();
      this.newContacts = false;
    }

    this.locked = true;

    const step = {
      dt,
      invDt: dt > 0 ? 1 / dt : 0,
      velocityIterations,
      positionIterations,
      warmStarting: this.warmStarting,
      velocityThreshold: this.velocityThreshold,
    };

    this.contactManager.collide();

    if (dt > 0) {
      this.solve(step);
      if (this.continuousPhysics) this.solveContinuous();
    }

    this.locked = false;

    if (this.autoClearForces) this.clearForces();
  }

  /**
   * @method solve
   * @description Groups the awake bodies into islands of things that touch and
   * solves each island on its own.
   * @param {Object} step
   * @private
   */
  solve(step) {
    for (let body = this.bodyList; body; body = body.next) {
      body.islandFlag = false;
      body.sweep.alpha0 = 0;
    }
    for (const contact of this.contactManager.contacts) {
      contact.islandFlag = false;
    }
    for (let joint = this.jointList; joint; joint = joint.next) {
      joint.islandFlag = false;
    }

    const island = this.island;
    const stack = [];

    for (let seed = this.bodyList; seed; seed = seed.next) {
      if (seed.islandFlag) continue;
      if (!seed.awake || !seed.active) continue;
      if (seed.type === BodyType.STATIC) continue;

      island.clear();
      stack.length = 0;
      stack.push(seed);
      seed.islandFlag = true;

      while (stack.length > 0) {
        const body = stack.pop();
        island.addBody(body);
        body.awake = true;

        if (body.type === BodyType.STATIC) continue;

        for (const contact of body.contacts) {
          if (contact.islandFlag) continue;
          if (!contact.touching || !contact.enabled) continue;
          if (contact.fixtureA.sensor || contact.fixtureB.sensor) continue;

          island.addContact(contact);
          contact.islandFlag = true;

          const other =
            contact.fixtureA.body === body
              ? contact.fixtureB.body
              : contact.fixtureA.body;
          if (other.islandFlag) continue;
          stack.push(other);
          other.islandFlag = true;
        }

        for (const joint of body.joints) {
          if (joint.islandFlag) continue;
          const other = joint.bodyA === body ? joint.bodyB : joint.bodyA;
          if (!other.active) continue;

          island.addJoint(joint);
          joint.islandFlag = true;

          if (other.islandFlag) continue;
          stack.push(other);
          other.islandFlag = true;
        }
      }

      island.solve(step, this.gravity, this.allowSleep);

      for (const body of island.bodies) {
        if (body.type === BodyType.STATIC) body.islandFlag = false;
      }
    }

    for (let body = this.bodyList; body; body = body.next) {
      if (!body.islandFlag) continue;
      if (body.type === BodyType.STATIC) continue;
      body.synchronizeFixtures();
    }

    this.contactManager.findNewContacts();
  }

  /**
   * @method solveContinuous
   * @description Sweeps every bullet body against the static and kinematic
   * geometry it passed through this step, and rewinds it to the first impact.
   * Without this, a body moving further than its own size in one step would
   * simply appear on the far side of a thin wall.
   * @private
   */
  solveContinuous() {
    for (let body = this.bodyList; body; body = body.next) {
      if (!body.bullet) continue;
      if (body.type !== BodyType.DYNAMIC) continue;
      if (!body.awake || !body.active) continue;

      const dx = body.sweep.c.x - body.sweep.c0.x;
      const dy = body.sweep.c.y - body.sweep.c0.y;
      const travelSq = dx * dx + dy * dy;
      if (travelSq === 0) continue;

      const alpha = this._findTimeOfImpact(body);
      if (alpha === null) continue;

      body.advance(alpha);
      this._absorbImpactVelocity(body, dx, dy);
      body.synchronizeFixtures();
      this.newContacts = true;
    }

    if (this.newContacts) {
      this.contactManager.findNewContacts();
      this.newContacts = false;
    }
  }

  /**
   * @method _absorbImpactVelocity
   * @description Takes the excess approach speed out of a body that a rewind
   * stopped short of a *moving* obstacle, leaving it travelling with whatever
   * it landed on.
   *
   * The rewind puts the body where the two first touched, but the obstacle
   * carries on to the end of the step, so the body is left hovering by up to
   * one step of the obstacle's travel, too far apart for the discrete solver
   * to see a contact next step. Keeping the body's original velocity as well
   * means it arrives even faster the following step, is rewound again, and
   * never lands: a rider on a descending platform would fall for ever without
   * ever standing on it. Dropping the approach speed to the obstacle's own
   * closes that gap within a step or two, which is where the discrete solver
   * takes over and the two stay in contact.
   *
   * Static obstacles are left alone: they do not run away from the body, so
   * the overlap the rewind aims for survives into the next step and the
   * discrete solver already handles them.
   *
   * @param {Body} body - The body that was rewound
   * @param {number} dx - How far it swept this step, before the rewind
   * @param {number} dy
   * @private
   */
  _absorbImpactVelocity(body, dx, dy) {
    const other = this._toiHitBody;
    if (!other || other.type === BodyType.STATIC) return;

    const travel = Math.sqrt(dx * dx + dy * dy);
    if (travel === 0) return;

    const nx = dx / travel;
    const ny = dy / travel;
    const v = body.linearVelocity;
    const w = other.linearVelocity;
    const approach = (v.x - w.x) * nx + (v.y - w.y) * ny;
    if (approach <= 0) return;

    v.x -= approach * nx;
    v.y -= approach * ny;
  }

  /**
   * @method _findTimeOfImpact
   * @description Earliest fraction of this step at which `body` first touches
   * non-dynamic geometry, or null when it hits nothing. The body that was hit
   * is left in `_toiHitBody`.
   * @param {Body} body
   * @returns {number|null}
   * @private
   */
  _findTimeOfImpact(body) {
    let minAlpha = 1;
    let hit = false;
    this._toiHitBody = null;
    const proxyA = this._toiProxyA;
    const proxyB = this._toiProxyB;

    for (let fixture = body.fixtureList; fixture; fixture = fixture.next) {
      if (fixture.sensor) continue;
      proxyA.set(fixture.shape);

      const sweptAABB = fixture.getAABB();

      this.broadPhase.query(sweptAABB, (proxyId) => {
        const other = this.broadPhase.getUserData(proxyId).fixture;
        const otherBody = other.body;
        if (otherBody === body) return true;
        if (otherBody.type === BodyType.DYNAMIC) return true;
        if (other.sensor) return true;
        if (!otherBody.active) return true;
        if (!shouldCollide(fixture, other)) return true;
        if (this.contactFilter && !this.contactFilter(fixture, other)) {
          return true;
        }

        proxyB.set(other.shape);
        const result = timeOfImpact({
          proxyA,
          proxyB,
          sweepA: body.sweep,
          sweepB: otherBody.sweep,
          tMax: minAlpha,
        });

        if (
          (result.state === TOIState.TOUCHING ||
            result.state === TOIState.OVERLAPPED) &&
          result.t < minAlpha
        ) {
          minAlpha = result.t;
          hit = true;
          this._toiHitBody = otherBody;
        }
        return true;
      });
    }

    if (!hit || minAlpha <= 0 || minAlpha >= 1) return null;
    return minAlpha;
  }

  /**
   * @method clearForces
   * @description Zeroes the accumulated forces and torques on every body.
   * Called automatically at the end of each step.
   */
  clearForces() {
    for (let body = this.bodyList; body; body = body.next) {
      body.force.setZero();
      body.torque = 0;
    }
  }

  /**
   * @method rayCast
   * @description Casts a ray from `p1` to `p2`, calling
   * `callback(fixture, point, normal, fraction)` for every fixture hit.
   *
   * The callback controls what happens next, exactly like a filter: return the
   * `fraction` to clip the ray there and keep looking for closer hits (the
   * usual "closest hit" behaviour), `0` to stop immediately, `1` to keep the
   * full ray and collect every hit, or `-1` to ignore this fixture entirely.
   *
   * @param {Object} p1 - Ray start `{ x, y }` in physics units
   * @param {Object} p2 - Ray end `{ x, y }` in physics units
   * @param {Function} callback
   */
  rayCast(p1, p2, callback) {
    const input = {
      p1: new Vec2(p1),
      p2: new Vec2(p2),
      maxFraction: 1,
    };

    this.broadPhase.rayCast(input, (subInput, proxyId) => {
      const proxy = this.broadPhase.getUserData(proxyId);
      const fixture = proxy.fixture;
      const output = { fraction: 0, normal: new Vec2() };
      const hit = fixture.rayCast(output, subInput);
      if (!hit) return subInput.maxFraction;

      const fraction = output.fraction;
      const point = new Vec2(
        (1 - fraction) * input.p1.x + fraction * input.p2.x,
        (1 - fraction) * input.p1.y + fraction * input.p2.y
      );
      return callback(fixture, point, output.normal, fraction);
    });
  }

  /**
   * @method queryAABB
   * @description Calls `callback(fixture)` for every fixture whose bounding box
   * overlaps `aabb`. Returning false from the callback ends the query.
   * @param {AABB} aabb
   * @param {Function} callback
   */
  queryAABB(aabb, callback) {
    this.broadPhase.query(aabb, (proxyId) => {
      const fixture = this.broadPhase.getUserData(proxyId).fixture;
      return callback(fixture);
    });
  }

  /**
   * @method queryPoint
   * @description Calls `callback(fixture)` for every fixture containing a
   * world-space point.
   * @param {Object} point - `{ x, y }` in physics units
   * @param {Function} callback
   */
  queryPoint(point, callback) {
    const aabb = new AABB(point.x, point.y, point.x, point.y);
    this.broadPhase.query(aabb, (proxyId) => {
      const fixture = this.broadPhase.getUserData(proxyId).fixture;
      if (!fixture.testPoint(point)) return true;
      return callback(fixture);
    });
  }
}

export default World;
