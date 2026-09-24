export default BoxColliderDebug;
/** @import RigidBody from "./RigidBody.js" */
/**
 * @class BoxColliderDebug
 * @param {RigidBody} rigidbody - The rigidbody to attach the collider to
 * @param {Color} color - The color of the collider
 */
declare class BoxColliderDebug {
    constructor(rigidbody: any, color?: any);
    rigidbody: any;
    physics: any;
    scale: any;
    color: any;
    gameObject: GameObject;
}
import GameObject from "./GameObject.js";
