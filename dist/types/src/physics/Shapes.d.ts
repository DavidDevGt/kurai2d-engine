/**
 * @class Shape
 * @description Base class for collision shapes. A shape is pure geometry in a
 * body's local frame: it carries no position of its own and can be shared
 * between fixtures.
 */
export class Shape {
    constructor(type: any, radius: any);
    type: any;
    radius: any;
    /**
     * @method getType
     * @description Returns the shape type ("circle" or "polygon").
     * @returns {string}
     */
    getType(): string;
    /**
     * @method getRadius
     * @description Returns the shape's skin radius.
     * @returns {number}
     */
    getRadius(): number;
}
/**
 * ShapeType
 */
export type ShapeType = string;
export namespace ShapeType {
    let CIRCLE: string;
    let POLYGON: string;
}
/**
 * @class CircleShape
 * @extends Shape
 * @description A circle, optionally offset from the body origin.
 * @param {number} [radius=0] - Radius in physics units
 * @param {Object} [center] - Local center `{ x, y }`, defaults to the origin
 */
export class CircleShape extends Shape {
    constructor(radius?: number, center?: any);
    p: Vec2;
    /**
     * @method getVertexCount
     * @description A circle is a single-point proxy plus a radius.
     * @returns {number}
     */
    getVertexCount(): number;
    /**
     * @method getVertex
     * @description Returns the circle's local center (its only support point).
     * @returns {Vec2}
     */
    getVertex(): Vec2;
    /**
     * @method getSupport
     * @description Index of the vertex furthest along a direction (always 0).
     * @returns {number}
     */
    getSupport(): number;
    /**
     * @method computeAABB
     * @description Writes this shape's world AABB under a transform.
     * @param {AABB} aabb - Output box
     * @param {Transform2} xf - The owning body's transform
     */
    computeAABB(aabb: AABB, xf: Transform2): void;
    /**
     * @method computeMass
     * @description Writes mass, center and rotational inertia for a density.
     * @param {Object} massData - Output `{ mass, center, I }`
     * @param {number} density
     */
    computeMass(massData: any, density: number): void;
    /**
     * @method testPoint
     * @description True when a world point is inside the circle.
     * @param {Transform2} xf
     * @param {Object} p - World point
     * @returns {boolean}
     */
    testPoint(xf: Transform2, p: any): boolean;
    /**
     * @method rayCast
     * @description Casts a ray against the circle.
     * @param {Object} output - Written as `{ fraction, normal }` on a hit
     * @param {Object} input - `{ p1, p2, maxFraction }` in world space
     * @param {Transform2} xf
     * @returns {boolean} - Whether the ray hit
     */
    rayCast(output: any, input: any, xf: Transform2): boolean;
}
/**
 * @class PolygonShape
 * @extends Shape
 * @description A convex polygon with up to `MAX_VERTICES` corners, wound
 * counter-clockwise. Boxes, by far the common case, come from
 * {@link PolygonShape.box}.
 * @param {Array<Object>} [points] - Optional points to build a convex hull from
 */
export class PolygonShape extends Shape {
    /**
     * @method box
     * @description Builds an axis-aligned box from half-extents, optionally
     * offset and rotated in the body's local frame.
     * @param {number} hx - Half width
     * @param {number} hy - Half height
     * @param {Object} [center] - Local center `{ x, y }`
     * @param {number} [angle=0] - Local rotation in radians
     * @returns {PolygonShape}
     */
    static box(hx: number, hy: number, center?: any, angle?: number): PolygonShape;
    constructor(points?: any);
    vertices: any[];
    normals: any[];
    centroid: Vec2;
    /**
     * @method setAsBox
     * @description Turns this polygon into a box in place.
     * @param {number} hx - Half width
     * @param {number} hy - Half height
     * @param {Object} [center] - Local center `{ x, y }`
     * @param {number} [angle=0] - Local rotation in radians
     * @returns {PolygonShape} - this
     */
    setAsBox(hx: number, hy: number, center?: any, angle?: number): PolygonShape;
    /**
     * @method set
     * @description Builds the convex hull of a point cloud. Points inside the
     * hull are dropped, so callers can pass a rough outline.
     * @param {Array<Object>} points - `{ x, y }` points
     * @returns {PolygonShape} - this
     */
    set(points: Array<any>): PolygonShape;
    /**
     * @method getVertexCount
     * @description Number of corners.
     * @returns {number}
     */
    getVertexCount(): number;
    /**
     * @method getVertex
     * @description Returns a corner by index.
     * @param {number} index
     * @returns {Vec2}
     */
    getVertex(index: number): Vec2;
    /**
     * @method getSupport
     * @description Index of the vertex furthest along a local direction: the
     * support function GJK is built on.
     * @param {Object} d - Local direction
     * @returns {number}
     */
    getSupport(d: any): number;
    /**
     * @method computeAABB
     * @description Writes this shape's world AABB under a transform.
     * @param {AABB} aabb - Output box
     * @param {Transform2} xf
     */
    computeAABB(aabb: AABB, xf: Transform2): void;
    /**
     * @method computeMass
     * @description Writes mass, center and rotational inertia for a density by
     * summing the triangle fan of the polygon.
     * @param {Object} massData - Output `{ mass, center, I }`
     * @param {number} density
     */
    computeMass(massData: any, density: number): void;
    /**
     * @method testPoint
     * @description True when a world point is inside the polygon.
     * @param {Transform2} xf
     * @param {Object} p - World point
     * @returns {boolean}
     */
    testPoint(xf: Transform2, p: any): boolean;
    /**
     * @method rayCast
     * @description Casts a ray against the polygon by clipping it against every
     * edge plane and keeping the surviving interval.
     * @param {Object} output - Written as `{ fraction, normal }` on a hit
     * @param {Object} input - `{ p1, p2, maxFraction }` in world space
     * @param {Transform2} xf
     * @returns {boolean}
     */
    rayCast(output: any, input: any, xf: Transform2): boolean;
}
/**
 * @function Box
 * @description Convenience factory for a box polygon.
 * @param {number} hx - Half width in physics units
 * @param {number} hy - Half height in physics units
 * @param {Object} [center] - Local center `{ x, y }`
 * @param {number} [angle=0] - Local rotation in radians
 * @returns {PolygonShape}
 */
export function Box(hx: number, hy: number, center?: any, angle?: number): PolygonShape;
/**
 * @function Circle
 * @description Convenience factory for a circle shape.
 * @param {number} radius - Radius in physics units
 * @param {Object} [center] - Local center `{ x, y }`
 * @returns {CircleShape}
 */
export function Circle(radius: number, center?: any): CircleShape;
import AABB from "./AABB.js";
import { Vec2 } from "./Math2D.js";
import { Transform2 } from "./Math2D.js";
export { AABB };
