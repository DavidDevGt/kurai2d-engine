export default CircleColliderDebug;
/** @import RigidBody from "./RigidBody.js" */
/**
 * @class CircleColliderDebug
 * @param {RigidBody} rigidbody - The rigidbody to attach the collider to
 * @param {Color} color - The color of the collider
 */
declare class CircleColliderDebug {
    constructor(rigidbody: any, color?: any);
    rigidbody: any;
    physics: any;
    scale: any;
    color: any;
    gameObject: GameObject;
}
import GameObject from "./GameObject.js";
