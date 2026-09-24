/**
 * @class Joint
 * @description Base class for a constraint between two bodies. A joint is
 * solved by the same island that solves contacts (see {@link Island}), right
 * alongside them, so a body linked only by a joint (no touching fixtures)
 * still wakes, sleeps and moves together with whatever it is jointed to.
 *
 * Concrete joints ({@link DistanceJoint}, {@link RevoluteJoint}) implement
 * `initVelocityConstraints`, `solveVelocityConstraints` and
 * `solvePositionConstraints`, matching {@link ContactSolver}'s per-step
 * lifecycle.
 * @param {Object} def - `{ type, bodyA, bodyB, collideConnected, userData }`
 */
export class Joint {
    constructor(def: any);
    type: any;
    bodyA: any;
    bodyB: any;
    collideConnected: any;
    userData: any;
    /** @private */
    private islandFlag;
    /**
     * @method getType
     * @returns {string}
     */
    getType(): string;
    /**
     * @method getBodyA
     * @returns {Body}
     */
    getBodyA(): Body;
    /**
     * @method getBodyB
     * @returns {Body}
     */
    getBodyB(): Body;
    /**
     * @method getUserData
     * @returns {*}
     */
    getUserData(): any;
    /**
     * @method setUserData
     * @param {*} data
     */
    setUserData(data: any): void;
}
/** @import { Body } from "./Body.js" */
/**
 * @description Identifies a concrete {@link Joint} subclass.
 */
export const JointType: Readonly<{
    DISTANCE: "distance";
    REVOLUTE: "revolute";
}>;
import type { Body } from "./Body.js";
