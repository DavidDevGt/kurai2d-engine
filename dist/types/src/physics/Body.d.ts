/** @import World from "./World.js" */
/** @import { Shape } from "./Shapes.js" */
/** @import { Contact } from "./Contact.js" */
/**
 * @class Body
 * @description A rigid body: a position, an orientation, and the velocity and
 * mass that go with them. Collision geometry lives on its fixtures, added with
 * {@link Body#createFixture}. Bodies are created through
 * {@link World#createBody}, never with `new`.
 *
 * Everything here is in physics units (meters, radians, seconds). The engine's
 * {@link RigidBody} component is the pixel-space wrapper around this class.
 *
 * @param {World} world - The owning world
 * @param {Object} [def] - `{ type, position, angle, linearVelocity,
 *   angularVelocity, linearDamping, angularDamping, fixedRotation, bullet,
 *   allowSleep, awake, active, gravityScale, userData }`
 */
export class Body {
    constructor(world: any, def?: {});
    world: any;
    type: any;
    xf: Transform2;
    sweep: Sweep;
    linearVelocity: Vec2;
    angularVelocity: any;
    force: Vec2;
    torque: number;
    linearDamping: any;
    angularDamping: any;
    gravityScale: any;
    mass: number;
    invMass: number;
    I: number;
    invI: number;
    fixedRotation: boolean;
    bullet: boolean;
    allowSleep: boolean;
    awake: boolean;
    active: boolean;
    sleepTime: number;
    userData: any;
    /** Scratch flag used while building solver islands. @private */
    private islandFlag;
    /**
     * @method createFixture
     * @description Attaches a shape to this body. The second argument may be a
     * plain density number or a definition object.
     * @param {Shape} shape - A CircleShape or PolygonShape
     * @param {Object|number} [def] - `{ density, friction, restitution, isSensor,
     *   filterCategoryBits, filterMaskBits, filterGroupIndex, userData }`
     * @returns {Fixture} - The new fixture
     */
    createFixture(shape: Shape, def?: any | number): Fixture;
    /**
     * @method destroyFixture
     * @description Removes a fixture and every contact it was part of.
     * @param {Fixture} fixture
     */
    destroyFixture(fixture: Fixture): void;
    /**
     * @method getFixtureList
     * @description Returns the first fixture; walk the rest with
     * {@link Fixture#getNext}.
     * @returns {Fixture|null}
     */
    getFixtureList(): Fixture | null;
    /**
     * @method getNext
     * @description Returns the next body in the world's list.
     * @returns {Body|null}
     */
    getNext(): Body | null;
    /**
     * @method setUserData
     * @description Attaches arbitrary data to the body. The engine stores the
     * owning {@link RigidBody} here so contacts can be traced back to game
     * objects.
     * @param {*} data
     */
    setUserData(data: any): void;
    /**
     * @method getUserData
     * @description Returns the attached data.
     * @returns {*}
     */
    getUserData(): any;
    /**
     * @method getWorld
     * @description Returns the owning world.
     * @returns {World}
     */
    getWorld(): World;
    /**
     * @method getType
     * @description Returns "static", "kinematic" or "dynamic".
     * @returns {string}
     */
    getType(): string;
    /**
     * @method setType
     * @description Changes the body type at runtime, resetting velocities and
     * re-deriving mass. Existing contacts are dropped so they rebuild against the
     * new type.
     * @param {string} type - "static", "kinematic" or "dynamic"
     */
    setType(type: string): void;
    /**
     * @method setTransform
     * @description Teleports the body: sets position and angle directly, without
     * any velocity implied by the move.
     *
     * A teleport wakes the body. Contacts are only re-evaluated for bodies that
     * are awake, so a sleeping body dropped into a new spot would otherwise sit
     * there without noticing what it now overlaps: respawning a player onto a
     * pickup, for instance, would silently miss it.
     *
     * @param {Object} position - `{ x, y }` in physics units
     * @param {number} angle - Radians
     */
    setTransform(position: any, angle: number): void;
    /**
     * @method setPosition
     * @description Moves the body, keeping its angle.
     * @param {Object} position - `{ x, y }` in physics units
     */
    setPosition(position: any): void;
    /**
     * @method setAngle
     * @description Rotates the body, keeping its position.
     * @param {number} angle - Radians
     */
    setAngle(angle: number): void;
    /**
     * @method getTransform
     * @description Returns the body's transform (live reference).
     * @returns {Transform2}
     */
    getTransform(): Transform2;
    /**
     * @method getPosition
     * @description Returns the body origin in world space (live reference).
     * @returns {Vec2}
     */
    getPosition(): Vec2;
    /**
     * @method getAngle
     * @description Returns the body's angle in radians.
     * @returns {number}
     */
    getAngle(): number;
    /**
     * @method getWorldCenter
     * @description Returns the center of mass in world space.
     * @returns {Vec2}
     */
    getWorldCenter(): Vec2;
    /**
     * @method getLocalCenter
     * @description Returns the center of mass in the body's frame.
     * @returns {Vec2}
     */
    getLocalCenter(): Vec2;
    /**
     * @method getWorldPoint
     * @description Converts a local point to world space.
     * @param {Object} localPoint
     * @returns {Vec2}
     */
    getWorldPoint(localPoint: any): Vec2;
    /**
     * @method getLocalPoint
     * @description Converts a world point to the body's frame.
     * @param {Object} worldPoint
     * @returns {Vec2}
     */
    getLocalPoint(worldPoint: any): Vec2;
    /**
     * @method getWorldVector
     * @description Rotates a local direction into world space.
     * @param {Object} localVector
     * @returns {Vec2}
     */
    getWorldVector(localVector: any): Vec2;
    /**
     * @method getLocalVector
     * @description Rotates a world direction into the body's frame.
     * @param {Object} worldVector
     * @returns {Vec2}
     */
    getLocalVector(worldVector: any): Vec2;
    /**
     * @method setLinearVelocity
     * @description Sets the velocity of the center of mass.
     * @param {Object} velocity - `{ x, y }` in physics units per second
     */
    setLinearVelocity(velocity: any): void;
    /**
     * @method getLinearVelocity
     * @description Returns the velocity of the center of mass (live reference).
     * @returns {Vec2}
     */
    getLinearVelocity(): Vec2;
    /**
     * @method getLinearVelocityFromWorldPoint
     * @description Velocity of the material point of this body that currently
     * coincides with a world point (linear plus the spin contribution).
     * @param {Object} worldPoint
     * @returns {Vec2}
     */
    getLinearVelocityFromWorldPoint(worldPoint: any): Vec2;
    /**
     * @method setAngularVelocity
     * @description Sets the spin in radians per second.
     * @param {number} omega
     */
    setAngularVelocity(omega: number): void;
    /**
     * @method getAngularVelocity
     * @description Returns the spin in radians per second.
     * @returns {number}
     */
    getAngularVelocity(): number;
    /**
     * @method applyForce
     * @description Applies a force at a world point. Forces are cleared at the
     * end of every step, so this belongs in your update loop.
     * @param {Object} force
     * @param {Object} [point] - Defaults to the center of mass
     * @param {boolean} [wake=true]
     */
    applyForce(force: any, point?: any, wake?: boolean): void;
    /**
     * @method applyForceToCenter
     * @description Applies a force at the center of mass (no torque).
     * @param {Object} force
     * @param {boolean} [wake=true]
     */
    applyForceToCenter(force: any, wake?: boolean): void;
    /**
     * @method applyTorque
     * @description Applies a torque about the center of mass.
     * @param {number} torque
     * @param {boolean} [wake=true]
     */
    applyTorque(torque: number, wake?: boolean): void;
    /**
     * @method applyLinearImpulse
     * @description Applies an instantaneous change in momentum at a world point.
     * Unlike a force, an impulse takes effect immediately: this is what a jump
     * or a knockback should use.
     * @param {Object} impulse
     * @param {Object} [point] - Defaults to the center of mass
     * @param {boolean} [wake=true]
     */
    applyLinearImpulse(impulse: any, point?: any, wake?: boolean): void;
    /**
     * @method applyAngularImpulse
     * @description Applies an instantaneous change in angular momentum.
     * @param {number} impulse
     * @param {boolean} [wake=true]
     */
    applyAngularImpulse(impulse: number, wake?: boolean): void;
    /**
     * @method getMass
     * @description Returns the body's mass.
     * @returns {number}
     */
    getMass(): number;
    /**
     * @method getInertia
     * @description Returns the rotational inertia about the center of mass.
     * @returns {number}
     */
    getInertia(): number;
    /**
     * @method resetMassData
     * @description Recomputes mass, center of mass and inertia from the
     * fixtures' densities. Called automatically when fixtures change.
     */
    resetMassData(): void;
    /**
     * @method setMassData
     * @description Overrides the computed mass properties.
     * @param {Object} massData - `{ mass, center, I }`
     */
    setMassData(massData: any): void;
    /**
     * @method setAwake
     * @description Wakes the body or puts it to sleep. A sleeping body is skipped
     * by the solver until something touches it, which is what keeps a settled
     * pile of crates free.
     * @param {boolean} flag
     */
    setAwake(flag: boolean): void;
    /**
     * @method isAwake
     * @description Whether the body is currently simulated.
     * @returns {boolean}
     */
    isAwake(): boolean;
    /**
     * @method setSleepingAllowed
     * @description Allows or forbids this body from ever sleeping.
     * @param {boolean} flag
     */
    setSleepingAllowed(flag: boolean): void;
    /**
     * @method isSleepingAllowed
     * @description Whether this body may sleep.
     * @returns {boolean}
     */
    isSleepingAllowed(): boolean;
    /**
     * @method setActive
     * @description Adds or removes the body from collision detection without
     * destroying it.
     * @param {boolean} flag
     */
    setActive(flag: boolean): void;
    /**
     * @method isActive
     * @description Whether the body takes part in collision detection.
     * @returns {boolean}
     */
    isActive(): boolean;
    /**
     * @method setFixedRotation
     * @description Locks or unlocks the body's rotation. Locking is the usual
     * choice for player characters, which should never topple over.
     * @param {boolean} flag
     */
    setFixedRotation(flag: boolean): void;
    /**
     * @method isFixedRotation
     * @description Whether rotation is locked.
     * @returns {boolean}
     */
    isFixedRotation(): boolean;
    /**
     * @method setBullet
     * @description Turns continuous collision detection on for this body, so it
     * is swept against static geometry instead of teleporting between steps.
     * @param {boolean} flag
     */
    setBullet(flag: boolean): void;
    /**
     * @method isBullet
     * @description Whether continuous collision detection is enabled.
     * @returns {boolean}
     */
    isBullet(): boolean;
    /**
     * @method setLinearDamping
     * @description Sets the drag applied to linear motion each step.
     * @param {number} damping
     */
    setLinearDamping(damping: number): void;
    /**
     * @method getLinearDamping
     * @description Returns the linear damping.
     * @returns {number}
     */
    getLinearDamping(): number;
    /**
     * @method setAngularDamping
     * @description Sets the drag applied to rotation each step.
     * @param {number} damping
     */
    setAngularDamping(damping: number): void;
    /**
     * @method getAngularDamping
     * @description Returns the angular damping.
     * @returns {number}
     */
    getAngularDamping(): number;
    /**
     * @method setGravityScale
     * @description Scales how strongly gravity pulls on this body (0 disables it,
     * 2 makes it twice as heavy-feeling).
     * @param {number} scale
     */
    setGravityScale(scale: number): void;
    /**
     * @method getGravityScale
     * @description Returns the gravity multiplier.
     * @returns {number}
     */
    getGravityScale(): number;
    /**
     * @method getContactList
     * @description Returns the contacts this body is part of.
     * @returns {Array<Contact>}
     */
    getContactList(): Array<Contact>;
    /**
     * @method synchronizeTransform
     * @description Rebuilds the body transform from the sweep's current state.
     * @private
     */
    private synchronizeTransform;
    /**
     * @method synchronizeFixtures
     * @description Updates the broadphase proxies to span where the body was at
     * the start of the step and where it is now.
     * @param {Transform2} [xf1] - Optional explicit "before" transform
     * @private
     */
    private synchronizeFixtures;
    /**
     * @method advance
     * @description Moves the body to a fraction of its sweep, used by continuous
     * collision detection when an impact is found mid-step.
     * @param {number} alpha
     * @private
     */
    private advance;
}
import { BodyType } from "./BodyType.js";
import { Transform2 } from "./Math2D.js";
import { Sweep } from "./Math2D.js";
import { Vec2 } from "./Math2D.js";
import type { Shape } from "./Shapes.js";
import { Fixture } from "./Fixture.js";
import type World from "./World.js";
import type { Contact } from "./Contact.js";
export { BodyType };
