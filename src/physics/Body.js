import { Vec2, Rot, Transform2, Sweep } from "./Math2D.js";
import { Fixture } from "./Fixture.js";
import { BodyType } from "./BodyType.js";

/** @import World from "./World.js" */
/** @import { Shape } from "./Shapes.js" */
/** @import { Contact } from "./Contact.js" */

/**
 * @class Body
 * @description A rigid body: a position, an orientation, and the velocity and
 * mass that go with them. Collision geometry lives on its fixtures, added with
 * {@link Body#createFixture}. Bodies are created through
 * {@link World#createBody}, never with `new`.
 *
 * Everything here is in physics units (meters, radians, seconds). The engine's
 * {@link RigidBody} component is the pixel-space wrapper around this class.
 *
 * @param {World} world - The owning world
 * @param {Object} [def] - `{ type, position, angle, linearVelocity,
 *   angularVelocity, linearDamping, angularDamping, fixedRotation, bullet,
 *   allowSleep, awake, active, gravityScale, userData }`
 */
class Body {
  constructor(world, def = {}) {
    this.world = world;
    this.type = def.type || BodyType.STATIC;

    this.xf = new Transform2();
    this.xf.set(def.position || new Vec2(0, 0), def.angle || 0);

    this.sweep = new Sweep();
    this.sweep.localCenter.setZero();
    this.sweep.c0.copy(this.xf.p);
    this.sweep.c.copy(this.xf.p);
    this.sweep.a0 = def.angle || 0;
    this.sweep.a = def.angle || 0;
    this.sweep.alpha0 = 0;

    this.linearVelocity = new Vec2(def.linearVelocity || { x: 0, y: 0 });
    this.angularVelocity = def.angularVelocity || 0;
    this.force = new Vec2(0, 0);
    this.torque = 0;

    this.linearDamping = def.linearDamping ?? 0;
    this.angularDamping = def.angularDamping ?? 0;
    this.gravityScale = def.gravityScale ?? 1;

    this.mass = 0;
    this.invMass = 0;
    this.I = 0;
    this.invI = 0;

    this.fixedRotation = !!def.fixedRotation;
    this.bullet = !!def.bullet;
    this.allowSleep = def.allowSleep !== false;
    this.awake = def.awake !== false;
    this.active = def.active !== false;
    this.sleepTime = 0;

    this.userData = def.userData ?? null;

    /** Head of this body's fixture list. @internal */
    this.fixtureList = null;
    /** @internal */
    this.fixtureCount = 0;
    /** Contacts this body currently takes part in. @internal */
    this.contacts = [];
    /** Joints this body currently takes part in. @internal */
    this.joints = [];

    /** @internal */
    this.prev = null;
    /** @internal */
    this.next = null;
    /** Scratch flag used while building solver islands. @private */
    this.islandFlag = false;
    /** Index into the current island's body array. @internal */
    this.islandIndex = 0;

    if (this.type === BodyType.STATIC) {
      this.awake = false;
      this.linearVelocity.setZero();
      this.angularVelocity = 0;
    } else if (this.type === BodyType.DYNAMIC) {
      this.mass = 1;
      this.invMass = 1;
    }
  }

  /**
   * @method createFixture
   * @description Attaches a shape to this body. The second argument may be a
   * plain density number or a definition object.
   * @param {Shape} shape - A CircleShape or PolygonShape
   * @param {Object|number} [def] - `{ density, friction, restitution, isSensor,
   *   filterCategoryBits, filterMaskBits, filterGroupIndex, userData }`
   * @returns {Fixture} - The new fixture
   */
  createFixture(shape, def = {}) {
    const fixtureDef = typeof def === "number" ? { density: def } : def;
    const fixture = new Fixture(this, shape, fixtureDef);

    if (this.active) {
      fixture.createProxies(this.world.broadPhase, this.xf);
    }

    fixture.next = this.fixtureList;
    this.fixtureList = fixture;
    this.fixtureCount++;

    if (fixture.density > 0) this.resetMassData();

    this.world.newContacts = true;
    return fixture;
  }

  /**
   * @method destroyFixture
   * @description Removes a fixture and every contact it was part of.
   * @param {Fixture} fixture
   */
  destroyFixture(fixture) {
    if (!fixture || fixture.body !== this) return;

    let node = this.fixtureList;
    let prev = null;
    let found = false;
    while (node) {
      if (node === fixture) {
        if (prev) prev.next = node.next;
        else this.fixtureList = node.next;
        found = true;
        break;
      }
      prev = node;
      node = node.next;
    }
    if (!found) return;

    for (let i = this.contacts.length - 1; i >= 0; i--) {
      const contact = this.contacts[i];
      if (contact.fixtureA === fixture || contact.fixtureB === fixture) {
        this.world.contactManager.destroy(contact);
      }
    }

    if (this.active) fixture.destroyProxies(this.world.broadPhase);

    fixture.body = null;
    fixture.next = null;
    this.fixtureCount--;
    this.resetMassData();
  }

  /**
   * @method getFixtureList
   * @description Returns the first fixture; walk the rest with
   * {@link Fixture#getNext}.
   * @returns {Fixture|null}
   */
  getFixtureList() {
    return this.fixtureList;
  }

  /**
   * @method getNext
   * @description Returns the next body in the world's list.
   * @returns {Body|null}
   */
  getNext() {
    return this.next;
  }

  /**
   * @method setUserData
   * @description Attaches arbitrary data to the body. The engine stores the
   * owning {@link RigidBody} here so contacts can be traced back to game
   * objects.
   * @param {*} data
   */
  setUserData(data) {
    this.userData = data;
  }

  /**
   * @method getUserData
   * @description Returns the attached data.
   * @returns {*}
   */
  getUserData() {
    return this.userData;
  }

  /**
   * @method getWorld
   * @description Returns the owning world.
   * @returns {World}
   */
  getWorld() {
    return this.world;
  }

  /**
   * @method getType
   * @description Returns "static", "kinematic" or "dynamic".
   * @returns {string}
   */
  getType() {
    return this.type;
  }

  /**
   * @method setType
   * @description Changes the body type at runtime, resetting velocities and
   * re-deriving mass. Existing contacts are dropped so they rebuild against the
   * new type.
   * @param {string} type - "static", "kinematic" or "dynamic"
   */
  setType(type) {
    if (this.type === type) return;
    this.type = type;

    this.resetMassData();

    if (this.type === BodyType.STATIC) {
      this.linearVelocity.setZero();
      this.angularVelocity = 0;
      this.sweep.a0 = this.sweep.a;
      this.sweep.c0.copy(this.sweep.c);
      this.awake = false;
      this.synchronizeFixtures();
    } else {
      this.setAwake(true);
    }

    this.force.setZero();
    this.torque = 0;

    for (let i = this.contacts.length - 1; i >= 0; i--) {
      this.world.contactManager.destroy(this.contacts[i]);
    }

    for (let f = this.fixtureList; f; f = f.next) {
      for (const proxy of f.proxies) {
        if (proxy.proxyId !== -1)
          this.world.broadPhase.touchProxy(proxy.proxyId);
      }
    }
    this.world.newContacts = true;
  }

  /**
   * @method setTransform
   * @description Teleports the body: sets position and angle directly, without
   * any velocity implied by the move.
   *
   * A teleport wakes the body. Contacts are only re-evaluated for bodies that
   * are awake, so a sleeping body dropped into a new spot would otherwise sit
   * there without noticing what it now overlaps: respawning a player onto a
   * pickup, for instance, would silently miss it.
   *
   * @param {Object} position - `{ x, y }` in physics units
   * @param {number} angle - Radians
   */
  setTransform(position, angle) {
    this.xf.q.set(angle);
    this.xf.p.copy(position);

    this.sweep.c.copy(Transform2.mulVec(this.xf, this.sweep.localCenter));
    this.sweep.a = angle;
    this.sweep.c0.copy(this.sweep.c);
    this.sweep.a0 = angle;

    this.setAwake(true);
    this.synchronizeFixtures(this.xf);
    this.world.newContacts = true;
  }

  /**
   * @method setPosition
   * @description Moves the body, keeping its angle.
   * @param {Object} position - `{ x, y }` in physics units
   */
  setPosition(position) {
    this.setTransform(position, this.sweep.a);
  }

  /**
   * @method setAngle
   * @description Rotates the body, keeping its position.
   * @param {number} angle - Radians
   */
  setAngle(angle) {
    this.setTransform(this.xf.p, angle);
  }

  /**
   * @method getTransform
   * @description Returns the body's transform (live reference).
   * @returns {Transform2}
   */
  getTransform() {
    return this.xf;
  }

  /**
   * @method getPosition
   * @description Returns the body origin in world space (live reference).
   * @returns {Vec2}
   */
  getPosition() {
    return this.xf.p;
  }

  /**
   * @method getAngle
   * @description Returns the body's angle in radians.
   * @returns {number}
   */
  getAngle() {
    return this.sweep.a;
  }

  /**
   * @method getWorldCenter
   * @description Returns the center of mass in world space.
   * @returns {Vec2}
   */
  getWorldCenter() {
    return this.sweep.c;
  }

  /**
   * @method getLocalCenter
   * @description Returns the center of mass in the body's frame.
   * @returns {Vec2}
   */
  getLocalCenter() {
    return this.sweep.localCenter;
  }

  /**
   * @method getWorldPoint
   * @description Converts a local point to world space.
   * @param {Object} localPoint
   * @returns {Vec2}
   */
  getWorldPoint(localPoint) {
    return Transform2.mulVec(this.xf, localPoint);
  }

  /**
   * @method getLocalPoint
   * @description Converts a world point to the body's frame.
   * @param {Object} worldPoint
   * @returns {Vec2}
   */
  getLocalPoint(worldPoint) {
    return Transform2.mulTVec(this.xf, worldPoint);
  }

  /**
   * @method getWorldVector
   * @description Rotates a local direction into world space.
   * @param {Object} localVector
   * @returns {Vec2}
   */
  getWorldVector(localVector) {
    return Rot.mulVec(this.xf.q, localVector);
  }

  /**
   * @method getLocalVector
   * @description Rotates a world direction into the body's frame.
   * @param {Object} worldVector
   * @returns {Vec2}
   */
  getLocalVector(worldVector) {
    return Rot.mulTVec(this.xf.q, worldVector);
  }

  /**
   * @method setLinearVelocity
   * @description Sets the velocity of the center of mass.
   * @param {Object} velocity - `{ x, y }` in physics units per second
   */
  setLinearVelocity(velocity) {
    if (this.type === BodyType.STATIC) return;
    if (velocity.x * velocity.x + velocity.y * velocity.y > 0) {
      this.setAwake(true);
    }
    this.linearVelocity.set(velocity.x, velocity.y);
  }

  /**
   * @method getLinearVelocity
   * @description Returns the velocity of the center of mass (live reference).
   * @returns {Vec2}
   */
  getLinearVelocity() {
    return this.linearVelocity;
  }

  /**
   * @method getLinearVelocityFromWorldPoint
   * @description Velocity of the material point of this body that currently
   * coincides with a world point (linear plus the spin contribution).
   * @param {Object} worldPoint
   * @returns {Vec2}
   */
  getLinearVelocityFromWorldPoint(worldPoint) {
    return Vec2.add(
      this.linearVelocity,
      Vec2.crossSV(this.angularVelocity, Vec2.sub(worldPoint, this.sweep.c))
    );
  }

  /**
   * @method setAngularVelocity
   * @description Sets the spin in radians per second.
   * @param {number} omega
   */
  setAngularVelocity(omega) {
    if (this.type === BodyType.STATIC) return;
    if (omega * omega > 0) this.setAwake(true);
    this.angularVelocity = omega;
  }

  /**
   * @method getAngularVelocity
   * @description Returns the spin in radians per second.
   * @returns {number}
   */
  getAngularVelocity() {
    return this.angularVelocity;
  }

  /**
   * @method applyForce
   * @description Applies a force at a world point. Forces are cleared at the
   * end of every step, so this belongs in your update loop.
   * @param {Object} force
   * @param {Object} [point] - Defaults to the center of mass
   * @param {boolean} [wake=true]
   */
  applyForce(force, point = null, wake = true) {
    if (this.type !== BodyType.DYNAMIC) return;
    if (wake && !this.awake) this.setAwake(true);
    if (!this.awake) return;

    this.force.add(force);
    if (point) {
      this.torque += Vec2.cross(Vec2.sub(point, this.sweep.c), force);
    }
  }

  /**
   * @method applyForceToCenter
   * @description Applies a force at the center of mass (no torque).
   * @param {Object} force
   * @param {boolean} [wake=true]
   */
  applyForceToCenter(force, wake = true) {
    this.applyForce(force, null, wake);
  }

  /**
   * @method applyTorque
   * @description Applies a torque about the center of mass.
   * @param {number} torque
   * @param {boolean} [wake=true]
   */
  applyTorque(torque, wake = true) {
    if (this.type !== BodyType.DYNAMIC) return;
    if (wake && !this.awake) this.setAwake(true);
    if (!this.awake) return;
    this.torque += torque;
  }

  /**
   * @method applyLinearImpulse
   * @description Applies an instantaneous change in momentum at a world point.
   * Unlike a force, an impulse takes effect immediately: this is what a jump
   * or a knockback should use.
   * @param {Object} impulse
   * @param {Object} [point] - Defaults to the center of mass
   * @param {boolean} [wake=true]
   */
  applyLinearImpulse(impulse, point = null, wake = true) {
    if (this.type !== BodyType.DYNAMIC) return;
    if (wake && !this.awake) this.setAwake(true);
    if (!this.awake) return;

    this.linearVelocity.addMul(this.invMass, impulse);
    if (point) {
      this.angularVelocity +=
        this.invI * Vec2.cross(Vec2.sub(point, this.sweep.c), impulse);
    }
  }

  /**
   * @method applyAngularImpulse
   * @description Applies an instantaneous change in angular momentum.
   * @param {number} impulse
   * @param {boolean} [wake=true]
   */
  applyAngularImpulse(impulse, wake = true) {
    if (this.type !== BodyType.DYNAMIC) return;
    if (wake && !this.awake) this.setAwake(true);
    if (!this.awake) return;
    this.angularVelocity += this.invI * impulse;
  }

  /**
   * @method getMass
   * @description Returns the body's mass.
   * @returns {number}
   */
  getMass() {
    return this.mass;
  }

  /**
   * @method getInertia
   * @description Returns the rotational inertia about the center of mass.
   * @returns {number}
   */
  getInertia() {
    return this.I;
  }

  /**
   * @method resetMassData
   * @description Recomputes mass, center of mass and inertia from the
   * fixtures' densities. Called automatically when fixtures change.
   */
  resetMassData() {
    this.mass = 0;
    this.invMass = 0;
    this.I = 0;
    this.invI = 0;
    this.sweep.localCenter.setZero();

    if (this.type === BodyType.STATIC || this.type === BodyType.KINEMATIC) {
      this.sweep.c0.copy(this.xf.p);
      this.sweep.c.copy(this.xf.p);
      this.sweep.a0 = this.sweep.a;
      return;
    }

    const localCenter = new Vec2(0, 0);
    for (let f = this.fixtureList; f; f = f.next) {
      if (f.density === 0) continue;
      const massData = f.getMassData();
      this.mass += massData.mass;
      localCenter.addMul(massData.mass, massData.center);
      this.I += massData.I;
    }

    if (this.mass > 0) {
      this.invMass = 1 / this.mass;
      localCenter.mul(this.invMass);
    } else {
      this.mass = 1;
      this.invMass = 1;
    }

    if (this.I > 0 && !this.fixedRotation) {
      this.I -= this.mass * Vec2.dot(localCenter, localCenter);
      this.invI = 1 / this.I;
    } else {
      this.I = 0;
      this.invI = 0;
    }

    const oldCenter = this.sweep.c.clone();
    this.sweep.localCenter.copy(localCenter);
    this.sweep.c.copy(Transform2.mulVec(this.xf, this.sweep.localCenter));
    this.sweep.c0.copy(this.sweep.c);

    this.linearVelocity.add(
      Vec2.crossSV(this.angularVelocity, Vec2.sub(this.sweep.c, oldCenter))
    );
  }

  /**
   * @method setMassData
   * @description Overrides the computed mass properties.
   * @param {Object} massData - `{ mass, center, I }`
   */
  setMassData(massData) {
    if (this.type !== BodyType.DYNAMIC) return;

    this.invMass = 0;
    this.I = 0;
    this.invI = 0;

    this.mass = massData.mass;
    if (this.mass <= 0) this.mass = 1;
    this.invMass = 1 / this.mass;

    if (massData.I > 0 && !this.fixedRotation) {
      this.I =
        massData.I - this.mass * Vec2.dot(massData.center, massData.center);
      this.invI = 1 / this.I;
    }

    const oldCenter = this.sweep.c.clone();
    this.sweep.localCenter.copy(massData.center);
    this.sweep.c.copy(Transform2.mulVec(this.xf, this.sweep.localCenter));
    this.sweep.c0.copy(this.sweep.c);
    this.linearVelocity.add(
      Vec2.crossSV(this.angularVelocity, Vec2.sub(this.sweep.c, oldCenter))
    );
  }

  /**
   * @method setAwake
   * @description Wakes the body or puts it to sleep. A sleeping body is skipped
   * by the solver until something touches it, which is what keeps a settled
   * pile of crates free.
   * @param {boolean} flag
   */
  setAwake(flag) {
    if (this.type === BodyType.STATIC) return;
    if (flag) {
      this.awake = true;
      this.sleepTime = 0;
    } else {
      this.awake = false;
      this.sleepTime = 0;
      this.linearVelocity.setZero();
      this.angularVelocity = 0;
      this.force.setZero();
      this.torque = 0;
    }
  }

  /**
   * @method isAwake
   * @description Whether the body is currently simulated.
   * @returns {boolean}
   */
  isAwake() {
    return this.awake;
  }

  /**
   * @method setSleepingAllowed
   * @description Allows or forbids this body from ever sleeping.
   * @param {boolean} flag
   */
  setSleepingAllowed(flag) {
    this.allowSleep = !!flag;
    if (!flag) this.setAwake(true);
  }

  /**
   * @method isSleepingAllowed
   * @description Whether this body may sleep.
   * @returns {boolean}
   */
  isSleepingAllowed() {
    return this.allowSleep;
  }

  /**
   * @method setActive
   * @description Adds or removes the body from collision detection without
   * destroying it.
   * @param {boolean} flag
   */
  setActive(flag) {
    if (flag === this.active) return;
    this.active = !!flag;

    if (this.active) {
      for (let f = this.fixtureList; f; f = f.next) {
        f.createProxies(this.world.broadPhase, this.xf);
      }
      this.world.newContacts = true;
    } else {
      for (let f = this.fixtureList; f; f = f.next) {
        f.destroyProxies(this.world.broadPhase);
      }
      for (let i = this.contacts.length - 1; i >= 0; i--) {
        this.world.contactManager.destroy(this.contacts[i]);
      }
    }
  }

  /**
   * @method isActive
   * @description Whether the body takes part in collision detection.
   * @returns {boolean}
   */
  isActive() {
    return this.active;
  }

  /**
   * @method setFixedRotation
   * @description Locks or unlocks the body's rotation. Locking is the usual
   * choice for player characters, which should never topple over.
   * @param {boolean} flag
   */
  setFixedRotation(flag) {
    if (this.fixedRotation === !!flag) return;
    this.fixedRotation = !!flag;
    this.angularVelocity = 0;
    this.resetMassData();
  }

  /**
   * @method isFixedRotation
   * @description Whether rotation is locked.
   * @returns {boolean}
   */
  isFixedRotation() {
    return this.fixedRotation;
  }

  /**
   * @method setBullet
   * @description Turns continuous collision detection on for this body, so it
   * is swept against static geometry instead of teleporting between steps.
   * @param {boolean} flag
   */
  setBullet(flag) {
    this.bullet = !!flag;
  }

  /**
   * @method isBullet
   * @description Whether continuous collision detection is enabled.
   * @returns {boolean}
   */
  isBullet() {
    return this.bullet;
  }

  /**
   * @method setLinearDamping
   * @description Sets the drag applied to linear motion each step.
   * @param {number} damping
   */
  setLinearDamping(damping) {
    this.linearDamping = damping;
  }

  /**
   * @method getLinearDamping
   * @description Returns the linear damping.
   * @returns {number}
   */
  getLinearDamping() {
    return this.linearDamping;
  }

  /**
   * @method setAngularDamping
   * @description Sets the drag applied to rotation each step.
   * @param {number} damping
   */
  setAngularDamping(damping) {
    this.angularDamping = damping;
  }

  /**
   * @method getAngularDamping
   * @description Returns the angular damping.
   * @returns {number}
   */
  getAngularDamping() {
    return this.angularDamping;
  }

  /**
   * @method setGravityScale
   * @description Scales how strongly gravity pulls on this body (0 disables it,
   * 2 makes it twice as heavy-feeling).
   * @param {number} scale
   */
  setGravityScale(scale) {
    this.gravityScale = scale;
  }

  /**
   * @method getGravityScale
   * @description Returns the gravity multiplier.
   * @returns {number}
   */
  getGravityScale() {
    return this.gravityScale;
  }

  /**
   * @method getContactList
   * @description Returns the contacts this body is part of.
   * @returns {Array<Contact>}
   */
  getContactList() {
    return this.contacts;
  }

  /**
   * @method synchronizeTransform
   * @description Rebuilds the body transform from the sweep's current state.
   * @private
   */
  synchronizeTransform() {
    this.xf.q.set(this.sweep.a);
    this.xf.p.set(
      this.sweep.c.x -
        (this.xf.q.c * this.sweep.localCenter.x -
          this.xf.q.s * this.sweep.localCenter.y),
      this.sweep.c.y -
        (this.xf.q.s * this.sweep.localCenter.x +
          this.xf.q.c * this.sweep.localCenter.y)
    );
  }

  /**
   * @method synchronizeFixtures
   * @description Updates the broadphase proxies to span where the body was at
   * the start of the step and where it is now.
   * @param {Transform2} [xf1] - Optional explicit "before" transform
   * @private
   */
  synchronizeFixtures(xf1 = null) {
    if (!this.active) return;
    let from = xf1;
    if (!from) {
      from = new Transform2();
      from.q.set(this.sweep.a0);
      from.p.set(
        this.sweep.c0.x -
          (from.q.c * this.sweep.localCenter.x -
            from.q.s * this.sweep.localCenter.y),
        this.sweep.c0.y -
          (from.q.s * this.sweep.localCenter.x +
            from.q.c * this.sweep.localCenter.y)
      );
    }
    for (let f = this.fixtureList; f; f = f.next) {
      f.synchronize(this.world.broadPhase, from, this.xf);
    }
  }

  /**
   * @method advance
   * @description Moves the body to a fraction of its sweep, used by continuous
   * collision detection when an impact is found mid-step.
   * @param {number} alpha
   * @private
   */
  advance(alpha) {
    this.sweep.advance(alpha);
    this.sweep.c.copy(this.sweep.c0);
    this.sweep.a = this.sweep.a0;
    this.synchronizeTransform();
  }
}

export { Body, BodyType };
