import {
  Manifold,
  WorldManifold,
  collideCircles,
  collidePolygonAndCircle,
  collidePolygons,
} from "./Collision.js";
import { ShapeType } from "./Shapes.js";
import { testOverlap } from "./Distance.js";
import { BodyType } from "./BodyType.js";

/** @import { Fixture, FixtureProxy } from "./Fixture.js" */
/** @import { Transform2 } from "./Math2D.js" */
/** @import World from "./World.js" */

/**
 * @function mixFriction
 * @description Combines two friction coefficients (geometric mean), so a slick
 * body sliding on a rough one lands somewhere in between.
 * @private
 */
function mixFriction(a, b) {
  return Math.sqrt(a * b);
}

/**
 * @function mixRestitution
 * @description Combines two restitutions: the bouncier surface wins, which is
 * what players expect from a trampoline on concrete.
 * @private
 */
function mixRestitution(a, b) {
  return a > b ? a : b;
}

/**
 * @function shouldCollide
 * @description Applies the collision filter to a fixture pair. A positive
 * shared group index always collides, a negative one never does; otherwise each
 * fixture's category must appear in the other's mask.
 * @param {Fixture} fixtureA
 * @param {Fixture} fixtureB
 * @returns {boolean}
 */
function shouldCollide(fixtureA, fixtureB) {
  const filterA = fixtureA.filter;
  const filterB = fixtureB.filter;

  if (filterA.groupIndex === filterB.groupIndex && filterA.groupIndex !== 0) {
    return filterA.groupIndex > 0;
  }

  return (
    (filterA.maskBits & filterB.categoryBits) !== 0 &&
    (filterB.maskBits & filterA.categoryBits) !== 0
  );
}

/**
 * @class Contact
 * @description A potential or actual touch between two fixtures. The broadphase
 * creates one as soon as two AABBs overlap; `touching` only becomes true once
 * the narrowphase finds real contact points. Contacts persist across steps,
 * which is what lets the solver warm-start from last frame's impulses.
 */
class Contact {
  constructor(fixtureA, fixtureB) {
    this.fixtureA = fixtureA;
    this.fixtureB = fixtureB;
    this.manifold = new Manifold();
    this.friction = mixFriction(fixtureA.friction, fixtureB.friction);
    this.restitution = mixRestitution(
      fixtureA.restitution,
      fixtureB.restitution
    );
    this.tangentSpeed = 0;

    /** @internal */
    this.touching = false;
    /** @private */
    this.enabled = true;
    /** @private */
    this.filterFlag = false;
    /** @private */
    this.islandFlag = false;
    /** @private */
    this.toiFlag = false;
    /** @private */
    this.toi = 1;
    /** @internal */
    this._index = -1;
  }

  /**
   * @method create
   * @description Builds a contact for a fixture pair, normalizing the order so
   * mixed polygon/circle pairs always arrive as (polygon, circle): the one
   * ordering the narrowphase implements.
   * @param {Fixture} fixtureA
   * @param {Fixture} fixtureB
   * @returns {Contact}
   */
  static create(fixtureA, fixtureB) {
    if (
      fixtureA.shape.type === ShapeType.CIRCLE &&
      fixtureB.shape.type === ShapeType.POLYGON
    ) {
      return new Contact(fixtureB, fixtureA);
    }
    return new Contact(fixtureA, fixtureB);
  }

  /**
   * @method getManifold
   * @description Returns the local-space manifold.
   * @returns {Manifold}
   */
  getManifold() {
    return this.manifold;
  }

  /**
   * @method getWorldManifold
   * @description Returns the contact in world space: the normal (pointing from
   * fixture A's body towards fixture B's), the contact points, and the
   * separation at each point.
   * @param {WorldManifold} [worldManifold] - Optional object to fill
   * @returns {WorldManifold}
   */
  getWorldManifold(worldManifold = new WorldManifold()) {
    return worldManifold.initialize(
      this.manifold,
      this.fixtureA.body.xf,
      this.fixtureA.shape.radius,
      this.fixtureB.body.xf,
      this.fixtureB.shape.radius
    );
  }

  /**
   * @method isTouching
   * @description Whether the fixtures are actually in contact this step.
   * @returns {boolean}
   */
  isTouching() {
    return this.touching;
  }

  /**
   * @method setEnabled
   * @description Enables or disables the collision response for this contact.
   * Disabling only lasts for the current step (useful from a pre-solve
   * callback to build one-way platforms).
   * @param {boolean} value
   */
  setEnabled(value) {
    this.enabled = !!value;
  }

  /**
   * @method isEnabled
   * @description Whether the collision response is enabled.
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * @method getFixtureA
   * @description Returns the first fixture.
   * @returns {Fixture}
   */
  getFixtureA() {
    return this.fixtureA;
  }

  /**
   * @method getFixtureB
   * @description Returns the second fixture.
   * @returns {Fixture}
   */
  getFixtureB() {
    return this.fixtureB;
  }

  /**
   * @method getFriction
   * @description Returns the mixed friction used by the solver.
   * @returns {number}
   */
  getFriction() {
    return this.friction;
  }

  /**
   * @method setFriction
   * @description Overrides the mixed friction for this contact.
   * @param {number} friction
   */
  setFriction(friction) {
    this.friction = friction;
  }

  /**
   * @method resetFriction
   * @description Restores the friction mixed from the two fixtures.
   */
  resetFriction() {
    this.friction = mixFriction(this.fixtureA.friction, this.fixtureB.friction);
  }

  /**
   * @method getRestitution
   * @description Returns the mixed restitution used by the solver.
   * @returns {number}
   */
  getRestitution() {
    return this.restitution;
  }

  /**
   * @method setRestitution
   * @description Overrides the mixed restitution for this contact.
   * @param {number} restitution
   */
  setRestitution(restitution) {
    this.restitution = restitution;
  }

  /**
   * @method resetRestitution
   * @description Restores the restitution mixed from the two fixtures.
   */
  resetRestitution() {
    this.restitution = mixRestitution(
      this.fixtureA.restitution,
      this.fixtureB.restitution
    );
  }

  /**
   * @method flagForFiltering
   * @description Marks the contact so the next step re-checks whether these two
   * fixtures are still allowed to collide.
   */
  flagForFiltering() {
    this.filterFlag = true;
  }

  /**
   * @method evaluate
   * @description Runs the narrowphase for this fixture pair into `manifold`.
   * @param {Manifold} manifold
   * @param {Transform2} xfA
   * @param {Transform2} xfB
   * @private
   */
  evaluate(manifold, xfA, xfB) {
    const shapeA = this.fixtureA.shape;
    const shapeB = this.fixtureB.shape;

    if (shapeA.type === ShapeType.CIRCLE) {
      collideCircles(manifold, shapeA, xfA, shapeB, xfB);
    } else if (shapeB.type === ShapeType.CIRCLE) {
      collidePolygonAndCircle(manifold, shapeA, xfA, shapeB, xfB);
    } else {
      collidePolygons(manifold, shapeA, xfA, shapeB, xfB);
    }
  }

  /**
   * @method update
   * @description Re-runs the narrowphase, carries last step's impulses over to
   * matching contact points (warm starting), and fires begin/end contact
   * events on the world when the touching state flips.
   * @param {World} world - The owning world, used to dispatch events
   */
  update(world) {
    const oldPoints = [];
    for (let i = 0; i < this.manifold.pointCount; i++) {
      oldPoints.push({
        id: this.manifold.points[i].id,
        normalImpulse: this.manifold.points[i].normalImpulse,
        tangentImpulse: this.manifold.points[i].tangentImpulse,
      });
    }

    const wasTouching = this.touching;
    let touching = false;
    this.enabled = true;

    const bodyA = this.fixtureA.body;
    const bodyB = this.fixtureB.body;
    const sensor = this.fixtureA.sensor || this.fixtureB.sensor;

    if (sensor) {
      touching = testOverlap(
        this.fixtureA.shape,
        bodyA.xf,
        this.fixtureB.shape,
        bodyB.xf
      );
      this.manifold.pointCount = 0;
    } else {
      this.evaluate(this.manifold, bodyA.xf, bodyB.xf);
      touching = this.manifold.pointCount > 0;

      for (let i = 0; i < this.manifold.pointCount; i++) {
        const point = this.manifold.points[i];
        point.normalImpulse = 0;
        point.tangentImpulse = 0;
        for (const old of oldPoints) {
          if (old.id === point.id) {
            point.normalImpulse = old.normalImpulse;
            point.tangentImpulse = old.tangentImpulse;
            break;
          }
        }
      }

      if (touching !== wasTouching) {
        bodyA.setAwake(true);
        bodyB.setAwake(true);
      }
    }

    this.touching = touching;

    if (!wasTouching && touching) world.dispatch("begin-contact", this);
    if (wasTouching && !touching) world.dispatch("end-contact", this);
    if (!sensor && touching) world.dispatch("pre-solve", this, this.manifold);
  }
}

/**
 * @class ContactManager
 * @description Owns the world's contact list: creates contacts from broadphase
 * pairs, drops them once the AABBs stop overlapping, and refreshes the ones
 * that remain each step.
 */
class ContactManager {
  constructor(world) {
    this.world = world;
    this.contacts = [];
  }

  /**
   * @method addPair
   * @description Creates a contact for a new broadphase pair, unless the two
   * fixtures share a body, already have a contact, or the filter rejects them.
   * @param {FixtureProxy} proxyA
   * @param {FixtureProxy} proxyB
   */
  addPair(proxyA, proxyB) {
    const fixtureA = proxyA.fixture;
    const fixtureB = proxyB.fixture;
    const bodyA = fixtureA.body;
    const bodyB = fixtureB.body;

    if (bodyA === bodyB) return;

    if (bodyA.type !== BodyType.DYNAMIC && bodyB.type !== BodyType.DYNAMIC) {
      return;
    }

    for (const contact of bodyB.contacts) {
      if (
        (contact.fixtureA === fixtureA && contact.fixtureB === fixtureB) ||
        (contact.fixtureA === fixtureB && contact.fixtureB === fixtureA)
      ) {
        return;
      }
    }

    for (const joint of bodyA.joints) {
      if (
        !joint.collideConnected &&
        (joint.bodyA === bodyB || joint.bodyB === bodyB)
      ) {
        return;
      }
    }

    if (
      this.world.contactFilter &&
      !this.world.contactFilter(fixtureA, fixtureB)
    ) {
      return;
    }
    if (!shouldCollide(fixtureA, fixtureB)) return;

    const contact = Contact.create(fixtureA, fixtureB);
    contact._index = this.contacts.length;
    this.contacts.push(contact);
    bodyA.contacts.push(contact);
    bodyB.contacts.push(contact);
  }

  /**
   * @method findNewContacts
   * @description Turns this step's broadphase movement into new contacts.
   */
  findNewContacts() {
    this.world.broadPhase.updatePairs((proxyA, proxyB) =>
      this.addPair(proxyA, proxyB)
    );
  }

  /**
   * @method destroy
   * @description Removes a contact, firing end-contact if it was touching.
   * @param {Contact} contact
   */
  destroy(contact) {
    const bodyA = contact.fixtureA.body;
    const bodyB = contact.fixtureB.body;

    if (contact.touching) {
      this.world.dispatch("end-contact", contact);
      bodyA.setAwake(true);
      bodyB.setAwake(true);
    }

    const index = contact._index;
    if (index >= 0 && this.contacts[index] === contact) {
      const last = this.contacts.pop();
      if (last !== contact) {
        this.contacts[index] = last;
        last._index = index;
      }
      contact._index = -1;
    }

    removeFrom(bodyA.contacts, contact);
    removeFrom(bodyB.contacts, contact);
  }

  /**
   * @method collide
   * @description Refreshes every contact: drops the ones whose AABBs no longer
   * overlap or whose filters changed, and re-runs the narrowphase on the rest.
   */
  collide() {
    for (let i = this.contacts.length - 1; i >= 0; i--) {
      const contact = this.contacts[i];
      const fixtureA = contact.fixtureA;
      const fixtureB = contact.fixtureB;
      const bodyA = fixtureA.body;
      const bodyB = fixtureB.body;

      if (contact.filterFlag) {
        if (
          bodyA.type !== BodyType.DYNAMIC &&
          bodyB.type !== BodyType.DYNAMIC
        ) {
          this.destroy(contact);
          continue;
        }
        if (
          this.world.contactFilter &&
          !this.world.contactFilter(fixtureA, fixtureB)
        ) {
          this.destroy(contact);
          continue;
        }
        if (!shouldCollide(fixtureA, fixtureB)) {
          this.destroy(contact);
          continue;
        }
        contact.filterFlag = false;
      }

      const activeA = bodyA.awake && bodyA.type !== BodyType.STATIC;
      const activeB = bodyB.awake && bodyB.type !== BodyType.STATIC;
      if (!activeA && !activeB) continue;

      const proxyIdA = fixtureA.proxies[0].proxyId;
      const proxyIdB = fixtureB.proxies[0].proxyId;
      if (!this.world.broadPhase.testOverlap(proxyIdA, proxyIdB)) {
        this.destroy(contact);
        continue;
      }

      contact.update(this.world);
    }
  }
}

/**
 * @function removeFrom
 * @description Removes an item from an array in place (order is irrelevant for
 * contact lists).
 * @private
 */
function removeFrom(array, item) {
  const index = array.indexOf(item);
  if (index >= 0) {
    const last = array.pop();
    if (index < array.length) array[index] = last;
  }
}

export { Contact, ContactManager, shouldCollide, mixFriction, mixRestitution };
