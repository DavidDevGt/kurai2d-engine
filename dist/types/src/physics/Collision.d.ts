/**
 * @class Manifold
 * @description Up to two contact points plus the frame they are expressed in.
 * Two points is all a 2D convex-convex overlap can produce, and it is exactly
 * what a stable resting contact (a box on the ground) needs.
 */
export class Manifold {
    type: number;
    localNormal: Vec2;
    localPoint: Vec2;
    points: ManifoldPoint[];
    pointCount: number;
    /**
     * @method reset
     * @description Empties the manifold.
     */
    reset(): void;
}
/**
 * @class ManifoldPoint
 * @description A single contact point, stored in the reference body's local
 * frame so it stays valid as the bodies move within a step.
 */
export class ManifoldPoint {
    localPoint: Vec2;
    normalImpulse: number;
    tangentImpulse: number;
    id: number;
}
/**
 * ManifoldType
 */
export type ManifoldType = number;
export namespace ManifoldType {
    let CIRCLES: number;
    let FACE_A: number;
    let FACE_B: number;
}
/**
 * @class WorldManifold
 * @description A manifold converted into world space: the collision normal
 * (always pointing from body A to body B), the contact points, and how deeply
 * each one is penetrating (negative means overlapping).
 */
export class WorldManifold {
    normal: Vec2;
    points: Vec2[];
    separations: number[];
    pointCount: number;
    /**
     * @method initialize
     * @description Fills this world manifold from a local manifold.
     * @param {Manifold} manifold
     * @param {Transform2} xfA
     * @param {number} radiusA
     * @param {Transform2} xfB
     * @param {number} radiusB
     * @returns {WorldManifold} - this
     */
    initialize(manifold: Manifold, xfA: Transform2, radiusA: number, xfB: Transform2, radiusB: number): WorldManifold;
}
/**
 * @function collideCircles
 * @description Builds the manifold for two circles.
 * @param {Manifold} manifold - Output manifold
 * @param {CircleShape} circleA
 * @param {Transform2} xfA
 * @param {CircleShape} circleB
 * @param {Transform2} xfB
 */
export function collideCircles(manifold: Manifold, circleA: CircleShape, xfA: Transform2, circleB: CircleShape, xfB: Transform2): void;
/**
 * @function collidePolygonAndCircle
 * @description Builds the manifold for a polygon against a circle. The circle
 * is pushed into the polygon's frame, then tested against the closest face,
 * falling back to the nearest corner when it sits past the face's edge.
 * @param {Manifold} manifold - Output manifold
 * @param {PolygonShape} polygonA
 * @param {Transform2} xfA
 * @param {CircleShape} circleB
 * @param {Transform2} xfB
 */
export function collidePolygonAndCircle(manifold: Manifold, polygonA: PolygonShape, xfA: Transform2, circleB: CircleShape, xfB: Transform2): void;
/**
 * @function collidePolygons
 * @description Builds the manifold for two convex polygons using the
 * separating-axis test to pick a reference face, then clipping the opposing
 * (incident) edge against it. The result is the one- or two-point contact patch
 * that makes boxes rest flat instead of rocking.
 * @param {Manifold} manifold - Output manifold
 * @param {PolygonShape} polyA
 * @param {Transform2} xfA
 * @param {PolygonShape} polyB
 * @param {Transform2} xfB
 */
export function collidePolygons(manifold: Manifold, polyA: PolygonShape, xfA: Transform2, polyB: PolygonShape, xfB: Transform2): void;
/**
 * @function mulTXf
 * @description Composes transforms: returns the transform of `B` expressed in
 * `A`'s frame.
 * @private
 */
export function mulTXf(A: any, B: any): Transform2;
import { Vec2 } from "./Math2D.js";
import { Transform2 } from "./Math2D.js";
import type { CircleShape } from "./Shapes.js";
import type { PolygonShape } from "./Shapes.js";
