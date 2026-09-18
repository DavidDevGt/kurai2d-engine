import AABB from "./AABB.js";
import { Vec2 } from "./Math2D.js";

/**
 * @class FixtureProxy
 * @description The link between a fixture and its entry in the broadphase tree.
 * @private
 */
class FixtureProxy {
  constructor(fixture, childIndex) {
    this.aabb = new AABB();
    this.fixture = fixture;
    this.childIndex = childIndex;
    this.proxyId = -1;
  }
}

/**
 * @class Fixture
 * @description A shape bound to a body, together with the material properties
 * that decide how contacts behave: density (which feeds the body's mass),
 * friction, restitution (bounciness), the sensor flag, and the collision
 * filter. A body can carry any number of fixtures.
 *
 * Fixtures are created through {@link Body#createFixture}, never directly.
 */
class Fixture {
  constructor(body, shape, def = {}) {
    this.body = body;
    this.shape = shape;
    this.density = def.density ?? 0;
    this.friction = def.friction ?? 0.2;
    this.restitution = def.restitution ?? 0;
    this.sensor = !!def.isSensor;
    this.userData = def.userData ?? null;
    this.filter = {
      categoryBits: def.filterCategoryBits ?? def.categoryBits ?? 0x0001,
      maskBits: def.filterMaskBits ?? def.maskBits ?? 0xffff,
      groupIndex: def.filterGroupIndex ?? def.groupIndex ?? 0,
    };

    /** @private */
    this.proxies = [new FixtureProxy(this, 0)];
    /** @private */
    this.next = null;
  }

  /**
   * @method getType
   * @description Returns the underlying shape type ("circle" or "polygon").
   * @returns {string}
   */
  getType() {
    return this.shape.type;
  }

  /**
   * @method getShape
   * @description Returns the fixture's shape.
   * @returns {Shape}
   */
  getShape() {
    return this.shape;
  }

  /**
   * @method getBody
   * @description Returns the body this fixture is attached to.
   * @returns {Body}
   */
  getBody() {
    return this.body;
  }

  /**
   * @method getNext
   * @description Returns the next fixture on the same body, or null.
   * @returns {Fixture|null}
   */
  getNext() {
    return this.next;
  }

  /**
   * @method setUserData
   * @description Attaches arbitrary data to the fixture.
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
   * @method setSensor
   * @description A sensor still reports contacts but never generates a
   * collision response: the classic trigger volume.
   * @param {boolean} value
   */
  setSensor(value) {
    if (value !== this.sensor) {
      this.body.setAwake(true);
      this.sensor = !!value;
    }
  }

  /**
   * @method isSensor
   * @description Whether this fixture is a sensor.
   * @returns {boolean}
   */
  isSensor() {
    return this.sensor;
  }

  /**
   * @method setFilterData
   * @description Replaces the collision filter. Two fixtures collide only when
   * each one's category bit appears in the other's mask (or they share a
   * positive group index).
   * @param {Object} filter - `{ categoryBits, maskBits, groupIndex }`
   */
  setFilterData(filter = {}) {
    this.filter = {
      categoryBits: filter.categoryBits ?? this.filter.categoryBits,
      maskBits: filter.maskBits ?? this.filter.maskBits,
      groupIndex: filter.groupIndex ?? this.filter.groupIndex,
    };
    this.refilter();
  }

  /**
   * @method getFilterData
   * @description Returns the current collision filter.
   * @returns {Object}
   */
  getFilterData() {
    return this.filter;
  }

  /**
   * @method getFilterCategoryBits
   * @description Returns the category bits.
   * @returns {number}
   */
  getFilterCategoryBits() {
    return this.filter.categoryBits;
  }

  /**
   * @method getFilterMaskBits
   * @description Returns the mask bits.
   * @returns {number}
   */
  getFilterMaskBits() {
    return this.filter.maskBits;
  }

  /**
   * @method getFilterGroupIndex
   * @description Returns the group index.
   * @returns {number}
   */
  getFilterGroupIndex() {
    return this.filter.groupIndex;
  }

  /**
   * @method refilter
   * @description Re-evaluates existing contacts after a filter change, so a
   * fixture that just stopped colliding with a layer separates immediately
   * instead of on its next move.
   */
  refilter() {
    const world = this.body.world;
    if (!world) return;

    for (const contact of this.body.contacts) {
      if (contact.fixtureA === this || contact.fixtureB === this) {
        contact.flagForFiltering();
      }
    }

    for (const proxy of this.proxies) {
      if (proxy.proxyId !== -1) world.broadPhase.touchProxy(proxy.proxyId);
    }
  }

  /**
   * @method setDensity
   * @description Sets the density. Call {@link Body#resetMassData} afterwards
   * for it to take effect on the body's mass.
   * @param {number} density
   */
  setDensity(density) {
    this.density = density;
  }

  /**
   * @method getDensity
   * @description Returns the density.
   * @returns {number}
   */
  getDensity() {
    return this.density;
  }

  /**
   * @method setFriction
   * @description Sets the friction coefficient (0 = ice).
   * @param {number} friction
   */
  setFriction(friction) {
    this.friction = friction;
  }

  /**
   * @method getFriction
   * @description Returns the friction coefficient.
   * @returns {number}
   */
  getFriction() {
    return this.friction;
  }

  /**
   * @method setRestitution
   * @description Sets the bounciness (0 = no bounce, 1 = perfectly elastic).
   * @param {number} restitution
   */
  setRestitution(restitution) {
    this.restitution = restitution;
  }

  /**
   * @method getRestitution
   * @description Returns the bounciness.
   * @returns {number}
   */
  getRestitution() {
    return this.restitution;
  }

  /**
   * @method testPoint
   * @description True when a world-space point is inside this fixture.
   * @param {Object} p - `{ x, y }` in physics units
   * @returns {boolean}
   */
  testPoint(p) {
    return this.shape.testPoint(this.body.xf, p);
  }

  /**
   * @method rayCast
   * @description Casts a ray against this fixture's shape.
   * @param {Object} output - Written as `{ fraction, normal }` on a hit
   * @param {Object} input - `{ p1, p2, maxFraction }`
   * @returns {boolean}
   */
  rayCast(output, input) {
    return this.shape.rayCast(output, input, this.body.xf);
  }

  /**
   * @method getMassData
   * @description Computes this fixture's contribution to the body's mass.
   * @param {Object} [massData]
   * @returns {Object} - `{ mass, center, I }`
   */
  getMassData(massData = { mass: 0, center: new Vec2(), I: 0 }) {
    this.shape.computeMass(massData, this.density);
    return massData;
  }

  /**
   * @method getAABB
   * @description Returns the fixture's current world AABB.
   * @param {number} [childIndex=0]
   * @returns {AABB}
   */
  getAABB(childIndex = 0) {
    return this.proxies[childIndex].aabb;
  }

  /**
   * @method createProxies
   * @description Registers this fixture with the broadphase.
   * @param {BroadPhase} broadPhase
   * @param {Transform2} xf
   * @private
   */
  createProxies(broadPhase, xf) {
    for (const proxy of this.proxies) {
      this.shape.computeAABB(proxy.aabb, xf);
      proxy.proxyId = broadPhase.createProxy(proxy.aabb, proxy);
    }
  }

  /**
   * @method destroyProxies
   * @description Removes this fixture from the broadphase.
   * @param {BroadPhase} broadPhase
   * @private
   */
  destroyProxies(broadPhase) {
    for (const proxy of this.proxies) {
      if (proxy.proxyId !== -1) {
        broadPhase.destroyProxy(proxy.proxyId);
        proxy.proxyId = -1;
      }
    }
  }

  /**
   * @method synchronize
   * @description Re-fits the broadphase proxies after the body moved. The AABB
   * spans both the old and the new transform so a fast body's proxy still
   * covers the ground it swept over.
   * @param {BroadPhase} broadPhase
   * @param {Transform2} xf1
   * @param {Transform2} xf2
   * @private
   */
  synchronize(broadPhase, xf1, xf2) {
    for (const proxy of this.proxies) {
      const aabb1 = new AABB();
      const aabb2 = new AABB();
      this.shape.computeAABB(aabb1, xf1);
      this.shape.computeAABB(aabb2, xf2);
      proxy.aabb.combine(aabb1, aabb2);
      const displacement = new Vec2(xf2.p.x - xf1.p.x, xf2.p.y - xf1.p.y);
      broadPhase.moveProxy(proxy.proxyId, proxy.aabb, displacement);
    }
  }
}

export { Fixture, FixtureProxy };
