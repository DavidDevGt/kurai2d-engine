export default RevoluteJoint;
/**
 * @class RevoluteJoint
 * @extends Joint
 * @description Pins two bodies together at a shared point while leaving
 * rotation free, like a door hinge or a pendulum arm. Optionally driven by a
 * motor that spins the joint toward a target angular speed, up to a torque
 * limit; set `enableMotor` for a turntable, a windmill blade, or a wheel.
 * @param {Object} def - `{ bodyA, bodyB, localAnchorA, localAnchorB,
 *   enableMotor, motorSpeed, maxMotorTorque, collideConnected, userData }`
 */
declare class RevoluteJoint extends Joint {
    localAnchorA: Vec2;
    localAnchorB: Vec2;
    referenceAngle: any;
    enableMotor: boolean;
    motorSpeed: any;
    maxMotorTorque: any;
    impulse: Vec2;
    motorImpulse: number;
    axialMass: number;
    motorMass: number;
    K: {
        k11: number;
        k12: number;
        k22: number;
    };
    rA: Vec2;
    rB: Vec2;
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
     * @param {number} invDt
     * @returns {number}
     */
    getReactionTorque(invDt: number): number;
    /**
     * @method getJointAngle
     * @description Current angle of body B relative to body A, minus the angle
     * they started at.
     * @returns {number}
     */
    getJointAngle(): number;
    /**
     * @method setMotorSpeed
     * @param {number} speed
     */
    setMotorSpeed(speed: number): void;
    /**
     * @method getMotorSpeed
     * @returns {number}
     */
    getMotorSpeed(): number;
    /**
     * @method setMaxMotorTorque
     * @param {number} torque
     */
    setMaxMotorTorque(torque: number): void;
    /**
     * @method setEnableMotor
     * @param {boolean} flag
     */
    setEnableMotor(flag: boolean): void;
    /**
     * @method isMotorEnabled
     * @returns {boolean}
     */
    isMotorEnabled(): boolean;
    /**
     * @method getMotorTorque
     * @param {number} invDt
     * @returns {number}
     */
    getMotorTorque(invDt: number): number;
    /**
     * @method initVelocityConstraints
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
     * @param {Object} step - `{ dt }`
     * @param {Array<Object>} velocities
     */
    solveVelocityConstraints(step: any, velocities: Array<any>): void;
    /**
     * @method solvePositionConstraints
     * @param {Array<Object>} positions
     * @returns {boolean}
     */
    solvePositionConstraints(positions: Array<any>): boolean;
}
import { Joint } from "./Joint.js";
import { Vec2 } from "./Math2D.js";
