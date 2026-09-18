/**
 * @class Fixture
 * @description A shape bound to a body, together with the material properties
 * that decide how contacts behave: density (which feeds the body's mass),
 * friction, restitution (bounciness), the sensor flag, and the collision
 * filter. A body can carry any number of fixtures.
 *
 * Fixtures are created through {@link Body#createFixture}, never directly.
 */
export class Fixture {
    constructor(body: any, shape: any, def?: {});
    body: any;
    shape: any;
    density: any;
    friction: any;
    restitution: any;
    sensor: boolean;
    userData: any;
    filter: {
        categoryBits: any;
        maskBits: any;
        groupIndex: any;
    };
    /** @private */
    private proxies;
    /** @private */
    private next;
    /**
     * @method getType
     * @description Returns the underlying shape type ("circle" or "polygon").
     * @returns {string}
     */
    getType(): string;
    /**
     * @method getShape
     * @description Returns the fixture's shape.
     * @returns {Shape}
     */
    getShape(): Shape;
    /**
     * @method getBody
     * @description Returns the body this fixture is attached to.
     * @returns {Body}
     */
    getBody(): Body;
    /**
     * @method getNext
     * @description Returns the next fixture on the same body, or null.
     * @returns {Fixture|null}
     */
    getNext(): Fixture | null;
    /**
     * @method setUserData
     * @description Attaches arbitrary data to the fixture.
     * @param {*} data
     */
    setUserData(data: any): void;
    /**
     * @method getUserData
     * @description Returns the attached data.
     * @returns {*}
     */
    getUserData(): any;
    /**
     * @method setSensor
     * @description A sensor still reports contacts but never generates a
     * collision response: the classic trigger volume.
     * @param {boolean} value
     */
    setSensor(value: boolean): void;
    /**
     * @method isSensor
     * @description Whether this fixture is a sensor.
     * @returns {boolean}
     */
    isSensor(): boolean;
    /**
     * @method setFilterData
     * @description Replaces the collision filter. Two fixtures collide only when
     * each one's category bit appears in the other's mask (or they share a
     * positive group index).
     * @param {Object} filter - `{ categoryBits, maskBits, groupIndex }`
     */
    setFilterData(filter?: any): void;
    /**
     * @method getFilterData
     * @description Returns the current collision filter.
     * @returns {Object}
     */
    getFilterData(): any;
    /**
     * @method getFilterCategoryBits
     * @description Returns the category bits.
     * @returns {number}
     */
    getFilterCategoryBits(): number;
    /**
     * @method getFilterMaskBits
     * @description Returns the mask bits.
     * @returns {number}
     */
    getFilterMaskBits(): number;
    /**
     * @method getFilterGroupIndex
     * @description Returns the group index.
     * @returns {number}
     */
    getFilterGroupIndex(): number;
    /**
     * @method refilter
     * @description Re-evaluates existing contacts after a filter change, so a
     * fixture that just stopped colliding with a layer separates immediately
     * instead of on its next move.
     */
    refilter(): void;
    /**
     * @method setDensity
     * @description Sets the density. Call {@link Body#resetMassData} afterwards
     * for it to take effect on the body's mass.
     * @param {number} density
     */
    setDensity(density: number): void;
    /**
     * @method getDensity
     * @description Returns the density.
     * @returns {number}
     */
    getDensity(): number;
    /**
     * @method setFriction
     * @description Sets the friction coefficient (0 = ice).
     * @param {number} friction
     */
    setFriction(friction: number): void;
    /**
     * @method getFriction
     * @description Returns the friction coefficient.
     * @returns {number}
     */
    getFriction(): number;
    /**
     * @method setRestitution
     * @description Sets the bounciness (0 = no bounce, 1 = perfectly elastic).
     * @param {number} restitution
     */
    setRestitution(restitution: number): void;
    /**
     * @method getRestitution
     * @description Returns the bounciness.
     * @returns {number}
     */
    getRestitution(): number;
    /**
     * @method testPoint
     * @description True when a world-space point is inside this fixture.
     * @param {Object} p - `{ x, y }` in physics units
     * @returns {boolean}
     */
    testPoint(p: any): boolean;
    /**
     * @method rayCast
     * @description Casts a ray against this fixture's shape.
     * @param {Object} output - Written as `{ fraction, normal }` on a hit
     * @param {Object} input - `{ p1, p2, maxFraction }`
     * @returns {boolean}
     */
    rayCast(output: any, input: any): boolean;
    /**
     * @method getMassData
     * @description Computes this fixture's contribution to the body's mass.
     * @param {Object} [massData]
     * @returns {Object} - `{ mass, center, I }`
     */
    getMassData(massData?: any): any;
    /**
     * @method getAABB
     * @description Returns the fixture's current world AABB.
     * @param {number} [childIndex=0]
     * @returns {AABB}
     */
    getAABB(childIndex?: number): AABB;
    /**
     * @method createProxies
     * @description Registers this fixture with the broadphase.
     * @param {BroadPhase} broadPhase
     * @param {Transform2} xf
     * @private
     */
    private createProxies;
    /**
     * @method destroyProxies
     * @description Removes this fixture from the broadphase.
     * @param {BroadPhase} broadPhase
     * @private
     */
    private destroyProxies;
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
    private synchronize;
}
/**
 * @class FixtureProxy
 * @description The link between a fixture and its entry in the broadphase tree.
 * @private
 */
export class FixtureProxy {
    constructor(fixture: any, childIndex: any);
    aabb: AABB;
    fixture: any;
    childIndex: any;
    proxyId: number;
}
import AABB from "./AABB.js";
