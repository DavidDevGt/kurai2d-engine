/**
 * @class DistanceProxy
 * @description A convex shape reduced to what GJK needs: a point cloud plus a
 * skin radius. Circles collapse to a single point with a large radius; polygons
 * keep their corners and carry the small polygon skin.
 */
export class DistanceProxy {
    vertices: any[];
    radius: number;
    /**
     * @method set
     * @description Fills this proxy from a shape.
     * @param {Shape} shape - A CircleShape or PolygonShape
     * @returns {DistanceProxy} - this
     */
    set(shape: Shape): DistanceProxy;
    /**
     * @method getSupport
     * @description Index of the vertex furthest along a direction.
     * @param {Object} d - Direction in the proxy's local frame
     * @returns {number}
     */
    getSupport(d: any): number;
    /**
     * @method getMaxExtent
     * @description Distance from the local origin to the furthest vertex, plus
     * the skin. Continuous collision uses it to bound how fast a rotating body's
     * surface can approach another.
     * @returns {number}
     */
    getMaxExtent(): number;
}
/**
 * @function distance
 * @description GJK: computes the distance and the closest points between two
 * convex proxies. This is the primitive continuous collision and overlap tests
 * are built on.
 * @param {Object} output - Written as `{ distance, pointA, pointB, iterations }`
 * @param {Object} input - `{ proxyA, proxyB, transformA, transformB, useRadii }`
 * @returns {Object} - The same output object
 */
export function distance(output: any, input: any): any;
/**
 * @function testOverlap
 * @description True when two shapes overlap under their transforms. Sensors use
 * this instead of building a manifold, since they never need contact points.
 * @param {Shape} shapeA
 * @param {Transform2} xfA
 * @param {Shape} shapeB
 * @param {Transform2} xfB
 * @returns {boolean}
 */
export function testOverlap(shapeA: Shape, xfA: Transform2, shapeB: Shape, xfB: Transform2): boolean;
import { Transform2 } from "./Math2D.js";
