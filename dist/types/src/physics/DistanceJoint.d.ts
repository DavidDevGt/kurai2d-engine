export default DistanceJoint;
/**
 * @class DistanceJoint
 * @extends Joint
 * @description Holds two anchor points at a fixed distance apart, like a
 * rigid rod. Passing `frequencyHz` turns it into a damped spring pulling the
 * anchors toward that distance instead of holding it exactly, for tethers
 * and camera rigs that should have some give.
 * @param {Object} def - `{ bodyA, bodyB, localAnchorA, localAnchorB, length,
 *   frequencyHz, dampingRatio, collideConnected, userData }`
 */
declare class DistanceJoint extends Joint {
    localAnchorA: Vec2;
    localAnchorB: Vec2;
    length: any;
    frequencyHz: any;
    dampingRatio: any;
    impulse: number;
    gamma: number;
    bias: number;
    u: Vec2;
    rA: Vec2;
    rB: Vec2;
    mass: number;
    /** @private */
    private indexA;
    /** @private */
    private indexB;
    /**
     * @method getAnchorA
     * @returns {Vec2}
     */
    getAnchorA(): Vec2;
    /**
     * @method getAnchorB
     * @returns {Vec2}
     */
    getAnchorB(): Vec2;
    /**
     * @method getReactionForce
     * @param {number} invDt
     * @returns {Vec2}
     */
    getReactionForce(invDt: number): Vec2;
    /**
     * @method getReactionTorque
     * @returns {number}
     */
    getReactionTorque(): number;
    /**
     * @method setLength
     * @param {number} length
     */
    setLength(length: number): void;
    /**
     * @method getLength
     * @returns {number}
     */
    getLength(): number;
    /**
     * @method initVelocityConstraints
     * @description Effective mass at the current anchor separation, plus (for
     * a soft joint) the spring-damper bias for this step.
     * @param {Object} step - `{ dt, warmStarting }`
     * @param {Array<Object>} positions
     * @param {Array<Object>} velocities
     */
    initVelocityConstraints(step: any, positions: Array<any>, velocities: Array<any>): void;
    invMassA: any;
    invMassB: any;
    invIA: any;
    invIB: any;
    /**
     * @method solveVelocityConstraints
     * @param {Object} step - `{ dt }` (unused here, kept for a uniform joint interface)
     * @param {Array<Object>} velocities
     */
    solveVelocityConstraints(step: any, velocities: Array<any>): void;
    /**
     * @method solvePositionConstraints
     * @description Skipped for a soft (spring) joint: the bias already pulled
     * it toward rest length during the velocity pass, and correcting position
     * on top of that would fight the spring.
     * @param {Array<Object>} positions
     * @returns {boolean}
     */
    solvePositionConstraints(positions: Array<any>): boolean;
}
import { Joint } from "./Joint.js";
import { Vec2 } from "./Math2D.js";
