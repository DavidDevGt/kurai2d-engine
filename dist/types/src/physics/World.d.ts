export default World;
/**
 * @class World
 * @description The physics world: it owns the bodies, finds which ones touch,
 * and advances them all by one time step. This is Kurai2D's own rigid-body
 * engine: broadphase, narrowphase, an impulse solver and continuous collision
 * detection, with no external physics dependency.
 *
 * Games normally reach it through {@link Physics}, which adds the pixel/meter
 * conversion, a fixed-timestep accumulator and collision routing to
 * {@link Behaviour} components.
 *
 * @param {Object} [def] - `{ gravity, allowSleep, warmStarting,
 *   continuousPhysics, velocityThreshold, velocityIterations,
 *   positionIterations }`
 */
declare class World {
    constructor(def?: {});
    gravity: Vec2;
    broadPhase: BroadPhase;
    contactManager: ContactManager;
    /** Head of the body list; walk it with {@link Body#getNext}. @private */
    private bodyList;
    bodyCount: number;
    /** Head of the joint list. @private */
    private jointList;
    jointCount: number;
    allowSleep: boolean;
    warmStarting: boolean;
    continuousPhysics: boolean;
    autoClearForces: boolean;
    velocityThreshold: any;
    velocityIterations: any;
    positionIterations: any;
    /** Optional `(fixtureA, fixtureB) => boolean` veto on new contacts. */
    contactFilter: any;
    /** @private */
    private newContacts;
    /** @private */
    private locked;
    /** @private */
    private island;
    /** @private */
    private listeners;
    /** @private */
    private _toiProxyA;
    /** @private */
    private _toiProxyB;
    /** What the last time-of-impact search hit. @private */
    private _toiHitBody;
    /**
     * @method on
     * @description Subscribes to a world event. Supported events:
     * `begin-contact`, `end-contact`, `pre-solve`, `post-solve`, `remove-body`
     * and `remove-fixture`.
     * @param {string} name - Event name
     * @param {Function} listener - Called with the contact (or body/fixture)
     * @returns {World} - this
     */
    on(name: string, listener: Function): World;
    /**
     * @method off
     * @description Unsubscribes a listener.
     * @param {string} name
     * @param {Function} listener
     * @returns {World} - this
     */
    off(name: string, listener: Function): World;
    /**
     * @method dispatch
     * @description Fires a world event. Listener errors are contained so one bad
     * callback can't halt the simulation mid-step.
     * @param {string} name
     * @param {...*} args
     */
    dispatch(name: string, ...args: any[]): void;
    /**
     * @method createBody
     * @description Creates a body in this world.
     * @param {Object} [def] - See {@link Body}
     * @returns {Body}
     */
    createBody(def?: any): Body;
    /**
     * @method destroyBody
     * @description Removes a body, its fixtures and all its contacts.
     * @param {Body} body
     */
    destroyBody(body: Body): void;
    /**
     * @method getBodyList
     * @description Returns the first body; walk the rest with
     * {@link Body#getNext}.
     * @returns {Body|null}
     */
    getBodyList(): Body | null;
    /**
     * @method getBodyCount
     * @description Number of bodies in the world.
     * @returns {number}
     */
    getBodyCount(): number;
    /**
     * @method createJoint
     * @description Creates a constraint between two bodies, a
     * {@link DistanceJoint} or a {@link RevoluteJoint}, chosen by `def.type`
     * (see {@link JointType}). Wakes both bodies, since a joint pulling on a
     * sleeping body needs it simulating again immediately.
     * @param {Object} def - `{ type, bodyA, bodyB, ... }`, forwarded to the
     *   chosen joint's constructor
     * @returns {Joint}
     */
    createJoint(def: any): Joint;
    /**
     * @method destroyJoint
     * @description Removes a joint. Safe to call as part of destroying one of
     * its bodies (see {@link World#destroyBody}).
     * @param {Joint} joint
     */
    destroyJoint(joint: Joint): void;
    /**
     * @method getJointList
     * @description Returns the first joint; walk the rest with `joint.next`.
     * @returns {Joint|null}
     */
    getJointList(): Joint | null;
    /**
     * @method getJointCount
     * @returns {number}
     */
    getJointCount(): number;
    /**
     * @method getContactList
     * @description Returns every live contact (touching or merely close enough
     * for their bounding boxes to overlap).
     * @returns {Array<Contact>}
     */
    getContactList(): Array<Contact>;
    /**
     * @method getContactCount
     * @description Number of live contacts.
     * @returns {number}
     */
    getContactCount(): number;
    /**
     * @method setGravity
     * @description Sets world gravity in physics units per second squared.
     * @param {Object} gravity - `{ x, y }`
     */
    setGravity(gravity: any): void;
    /**
     * @method getGravity
     * @description Returns world gravity.
     * @returns {Vec2}
     */
    getGravity(): Vec2;
    /**
     * @method isLocked
     * @description True while a step is in progress, when the body/fixture graph
     * must not be modified.
     * @returns {boolean}
     */
    isLocked(): boolean;
    /**
     * @method setAllowSleeping
     * @description Enables or disables sleeping world-wide.
     * @param {boolean} flag
     */
    setAllowSleeping(flag: boolean): void;
    /**
     * @method step
     * @description Advances the simulation by `dt` seconds: refresh contacts,
     * solve the islands, then sweep any continuous (bullet) bodies.
     * @param {number} dt - Time step in seconds
     * @param {number} [velocityIterations] - Solver velocity iterations
     * @param {number} [positionIterations] - Solver position iterations
     */
    step(dt: number, velocityIterations?: number, positionIterations?: number): void;
    /**
     * @method solve
     * @description Groups the awake bodies into islands of things that touch and
     * solves each island on its own.
     * @param {Object} step
     * @private
     */
    private solve;
    /**
     * @method solveContinuous
     * @description Sweeps every bullet body against the static and kinematic
     * geometry it passed through this step, and rewinds it to the first impact.
     * Without this, a body moving further than its own size in one step would
     * simply appear on the far side of a thin wall.
     * @private
     */
    private solveContinuous;
    /**
     * @method _absorbImpactVelocity
     * @description Takes the excess approach speed out of a body that a rewind
     * stopped short of a *moving* obstacle, leaving it travelling with whatever
     * it landed on.
     *
     * The rewind puts the body where the two first touched, but the obstacle
     * carries on to the end of the step, so the body is left hovering by up to
     * one step of the obstacle's travel, too far apart for the discrete solver
     * to see a contact next step. Keeping the body's original velocity as well
     * means it arrives even faster the following step, is rewound again, and
     * never lands: a rider on a descending platform would fall for ever without
     * ever standing on it. Dropping the approach speed to the obstacle's own
     * closes that gap within a step or two, which is where the discrete solver
     * takes over and the two stay in contact.
     *
     * Static obstacles are left alone: they do not run away from the body, so
     * the overlap the rewind aims for survives into the next step and the
     * discrete solver already handles them.
     *
     * @param {Body} body - The body that was rewound
     * @param {number} dx - How far it swept this step, before the rewind
     * @param {number} dy
     * @private
     */
    private _absorbImpactVelocity;
    /**
     * @method _findTimeOfImpact
     * @description Earliest fraction of this step at which `body` first touches
     * non-dynamic geometry, or null when it hits nothing. The body that was hit
     * is left in `_toiHitBody`.
     * @param {Body} body
     * @returns {number|null}
     * @private
     */
    private _findTimeOfImpact;
    /**
     * @method clearForces
     * @description Zeroes the accumulated forces and torques on every body.
     * Called automatically at the end of each step.
     */
    clearForces(): void;
    /**
     * @method rayCast
     * @description Casts a ray from `p1` to `p2`, calling
     * `callback(fixture, point, normal, fraction)` for every fixture hit.
     *
     * The callback controls what happens next, exactly like a filter: return the
     * `fraction` to clip the ray there and keep looking for closer hits (the
     * usual "closest hit" behaviour), `0` to stop immediately, `1` to keep the
     * full ray and collect every hit, or `-1` to ignore this fixture entirely.
     *
     * @param {Object} p1 - Ray start `{ x, y }` in physics units
     * @param {Object} p2 - Ray end `{ x, y }` in physics units
     * @param {Function} callback
     */
    rayCast(p1: any, p2: any, callback: Function): void;
    /**
     * @method queryAABB
     * @description Calls `callback(fixture)` for every fixture whose bounding box
     * overlaps `aabb`. Returning false from the callback ends the query.
     * @param {AABB} aabb
     * @param {Function} callback
     */
    queryAABB(aabb: AABB, callback: Function): void;
    /**
     * @method queryPoint
     * @description Calls `callback(fixture)` for every fixture containing a
     * world-space point.
     * @param {Object} point - `{ x, y }` in physics units
     * @param {Function} callback
     */
    queryPoint(point: any, callback: Function): void;
}
import { Vec2 } from "./Math2D.js";
import { BroadPhase } from "./BroadPhase.js";
import { ContactManager } from "./Contact.js";
import { Body } from "./Body.js";
import type { Joint } from "./Joint.js";
import type { Contact } from "./Contact.js";
import AABB from "./AABB.js";
