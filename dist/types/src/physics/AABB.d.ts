export default AABB;
/**
 * @class AABB
 * @description An axis-aligned bounding box in physics space. Used by the
 * broadphase to reject pairs long before any real collision maths runs.
 */
declare class AABB {
    /**
     * @method testOverlap
     * @description True when two boxes overlap.
     * @param {AABB} a
     * @param {AABB} b
     * @returns {boolean}
     */
    static testOverlap(a: AABB, b: AABB): boolean;
    constructor(lowerX?: number, lowerY?: number, upperX?: number, upperY?: number);
    lowerBound: Vec2;
    upperBound: Vec2;
    /**
     * @method set
     * @description Sets all four bounds in place.
     * @param {number} lx
     * @param {number} ly
     * @param {number} ux
     * @param {number} uy
     * @returns {AABB} - this
     */
    set(lx: number, ly: number, ux: number, uy: number): AABB;
    /**
     * @method copy
     * @description Copies another AABB.
     * @param {AABB} other
     * @returns {AABB} - this
     */
    copy(other: AABB): AABB;
    /**
     * @method getCenter
     * @description Returns the box center.
     * @returns {Vec2}
     */
    getCenter(): Vec2;
    /**
     * @method getExtents
     * @description Returns the box half-extents.
     * @returns {Vec2}
     */
    getExtents(): Vec2;
    /**
     * @method getPerimeter
     * @description Perimeter of the box, the cost function the AABB tree
     * minimizes when choosing where to insert a leaf.
     * @returns {number}
     */
    getPerimeter(): number;
    /**
     * @method combine
     * @description Sets this box to the union of two others.
     * @param {AABB} a
     * @param {AABB} b
     * @returns {AABB} - this
     */
    combine(a: AABB, b: AABB): AABB;
    /**
     * @method extend
     * @description Grows the box by `amount` on every side.
     * @param {number} amount
     * @returns {AABB} - this
     */
    extend(amount: number): AABB;
    /**
     * @method contains
     * @description True when `other` lies entirely inside this box.
     * @param {AABB} other
     * @returns {boolean}
     */
    contains(other: AABB): boolean;
    /**
     * @method containsPoint
     * @description True when a point lies inside this box.
     * @param {Object} p - `{ x, y }`
     * @returns {boolean}
     */
    containsPoint(p: any): boolean;
    /**
     * @method rayCast
     * @description Slab test of a ray against this box.
     * @param {Object} input - `{ p1, p2, maxFraction }`
     * @returns {boolean} - True if the ray hits the box within maxFraction
     */
    rayCast(input: any): boolean;
}
import { Vec2 } from "./Math2D.js";
