export default ContactSolver;
/**
 * @class ContactSolver
 * @description Resolves every contact in an island with sequential impulses:
 * for each contact point it works out the impulse that removes the approaching
 * velocity (plus any bounce), applies it, and repeats over all points for a
 * fixed number of iterations. Impulses are accumulated and clamped so they can
 * only ever push, never pull, and they carry over between steps (warm starting)
 * so stacks settle instead of sinking.
 *
 * Position error left over after the velocity pass is fixed separately, by
 * nudging the bodies apart without injecting energy.
 *
 * @param {Object} def - `{ contacts, positions, velocities, dt, velocityThreshold }`
 */
declare class ContactSolver {
    constructor(def: any);
    positions: any;
    velocities: any;
    contacts: any;
    dt: any;
    velocityThreshold: any;
    velocityConstraints: {
        friction: any;
        restitution: any;
        tangentSpeed: any;
        indexA: any;
        indexB: any;
        invMassA: any;
        invMassB: any;
        invIA: any;
        invIB: any;
        contactIndex: number;
        pointCount: any;
        normal: Vec2;
        tangent: Vec2;
        K: {
            k11: number;
            k12: number;
            k22: number;
        };
        normalMass: {
            k11: number;
            k12: number;
            k22: number;
        };
        points: any[];
    }[];
    positionConstraints: {
        indexA: any;
        indexB: any;
        invMassA: any;
        invMassB: any;
        invIA: any;
        invIB: any;
        localCenterA: any;
        localCenterB: any;
        radiusA: any;
        radiusB: any;
        type: any;
        localNormal: any;
        localPoint: any;
        localPoints: any[];
        pointCount: any;
    }[];
    /**
     * @method initializeVelocityConstraints
     * @description Computes the effective mass at every contact point and the
     * bounce target, from the state at the start of the step.
     */
    initializeVelocityConstraints(): void;
    /**
     * @method warmStart
     * @description Re-applies last step's impulses before solving, which gets the
     * solver most of the way to the answer immediately.
     */
    warmStart(): void;
    /**
     * @method solveVelocityConstraints
     * @description One relaxation pass over every contact point: friction first,
     * then the normal impulses that stop the bodies interpenetrating.
     */
    solveVelocityConstraints(): void;
    /**
     * @method _solveBlock
     * @description Two-point block solve. Solving both points of a manifold
     * together (rather than one after the other) is what keeps a box resting on
     * the ground from rocking between its corners. Four candidate solutions are
     * tried in turn: both points pushing, either one alone, or neither.
     * @private
     */
    private _solveBlock;
    /**
     * @method storeImpulses
     * @description Writes the accumulated impulses back onto the manifold so the
     * next step can warm-start from them.
     */
    storeImpulses(): void;
    /**
     * @method solvePositionConstraints
     * @description Pushes overlapping bodies apart geometrically. This runs on
     * positions only, no velocity is added, so separating a deep overlap can't
     * fling bodies across the level.
     * @returns {boolean} - True once every overlap is within tolerance
     */
    solvePositionConstraints(): boolean;
}
import { Vec2 } from "./Math2D.js";
