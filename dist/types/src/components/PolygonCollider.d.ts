export default PolygonCollider;
/** @import GameObject from "./GameObject.js" */
/** @import RigidBody from "./RigidBody.js" */
/**
 * @class PolygonCollider
 * @extends Collider
 * @description A convex-polygon fixture, for collision shapes a box or
 * circle can't approximate, like ramps, wedges, or arbitrary tile outlines (see
 * {@link ForgeLevel}). Points outside the convex hull of what you pass are
 * dropped automatically; a concave shape needs more than one collider.
 * @param {RigidBody} rigidbody - The rigidbody to attach the collider to
 * @param {Array<{x:number,y:number}>} points - Local-space points, in
 *   physics units, in any order
 * @param {number} density - The density of the collider
 * @param {number} friction - The friction of the collider
 * @param {number} restitution - The restitution of the collider
 * @param {boolean} [isSensor=false] - Whether the collider is a sensor
 * @param {GameObject} [parentObject=null] - The parent object of the collider
 * @param {Object} [filter=null] - Collision filter spec, see {@link Collider#setFilter}
 */
declare class PolygonCollider extends Collider {
    constructor(rigidbody: any, points: any, density: any, friction: any, restitution: any, isSensor?: boolean, parentObject?: any, filter?: any);
    collider: any;
    points: any;
    /**
     * @method getPoints
     * @description Returns the local-space points this collider was built from
     * @returns {Array<{x:number,y:number}>}
     */
    getPoints(): Array<{
        x: number;
        y: number;
    }>;
}
import Collider from "./Collider.js";
