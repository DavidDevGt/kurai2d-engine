export default RigidBody;
/**
 * @class RigidBody
 * @description The game-facing physics body: everything you can do to a body
 * (move it, push it, spin it, sleep it, query its mass) is a method on this
 * class directly, in world/pixel units. There is no separate lower-level
 * body object you need to fetch first. `getBody()` still returns the raw,
 * physics-unit {@link Body} underneath for the rare case you need it (writing
 * a custom joint, say), but nothing in ordinary use requires it.
 * @param {Physics} physics - The physics engine
 * @param {string | "static" | "dynamic" | "kinematic"} type - The type of rigidbody
 * @param {Vector2} position - The position of the rigidbody
 * @param {boolean} fixedRotation - Whether the rigidbody is fixed rotation
 * @param {GameObject} parentObject - The parent object of the rigidbody
 * @param {Vector2} offset - The offset of the rigidbody
 */
declare class RigidBody {
    constructor(physics: any, type: any, position: any, fixedRotation: any, parentObject?: any, offset?: Vector2);
    physics: any;
    offset: Vector2;
    type: any;
    body: any;
    parentObject: any;
    position: any;
    collider: Collider;
    id: string;
    name: string;
    /** Freely usable by your own code; see {@link RigidBody#getUserData}. */
    userData: any;
    /**
     * @method updatePosition
     * @description Updates the position of the rigidbody
     * @param {Vector2} position - The new position
     */
    updatePosition(position: Vector2): void;
    /**
     * @method setPosition
     * @description Alias of {@link RigidBody#updatePosition}, named to match
     * `setRotation`/`setTransform`.
     * @param {Vector2} position - The new position, in world (pixel) units
     */
    setPosition(position: Vector2): void;
    /**
     * @method setTransform
     * @description Teleports the body to a new position and angle in one move
     * (no velocity implied), and wakes it so contacts at the new spot are seen
     * on the very next step.
     * @param {Vector2} position - World (pixel) units
     * @param {number} angle - Radians
     */
    setTransform(position: Vector2, angle: number): void;
    /**
     * @method getWorldX
     * @description The single source of truth for body(physics) -> world(pixel)
     * conversion on X: undo the scale and the spawn offset.
     * @returns {number} - The live world-space x of the body
     * @private
     */
    private getWorldX;
    /**
     * @method getWorldY
     * @description World-space y counterpart of getWorldX.
     * @returns {number} - The live world-space y of the body
     * @private
     */
    private getWorldY;
    /**
     * @method syncTransform
     * @description Writes the body's live world position and angle into a
     * Transform. This is the one place body state is copied onto a renderable, so
     * position and rotation stay in lock-step. Static/kinematic bodies are not
     * driven by the simulation, so only dynamic bodies write back.
     * @param {Transform} transform - The transform to update in place
     */
    syncTransform(transform: Transform): void;
    /**
     * @method getOffset
     * @description Returns the offset of the rigidbody
     * @returns {Vector2} - The offset of the rigidbody
     */
    getOffset(): Vector2;
    /**
     * @method setCollider
     * @description Sets the collider of the rigidbody
     * @param {Collider} collider - The collider to set
     */
    setCollider(collider: Collider): void;
    /**
     * @method createFixture
     * @description Attaches a shape directly, bypassing the Collider component
     * classes ({@link BoxCollider}, {@link CircleCollider}, {@link PolygonCollider})
     * that normally build one for you. `shape` is a physics-unit shape (e.g. from
     * `Box()`/`Circle()`/`new PolygonShape()`), not pixels.
     * @param {Shape} shape
     * @param {Object|number} [def] - `{ density, friction, restitution, isSensor, ... }`
     * @returns {Fixture}
     */
    createFixture(shape: Shape, def?: any | number): Fixture;
    /**
     * @method destroyFixture
     * @description Removes a fixture created with {@link RigidBody#createFixture}.
     * @param {Fixture} fixture
     */
    destroyFixture(fixture: Fixture): void;
    /**
     * @method setRotation
     * @description Sets the rotation of the rigidbody
     * @param {number} rotation - The new rotation
     */
    setRotation(rotation: number): void;
    /**
     * @method setLinearVelocity
     * @description Sets the body's linear velocity in world (pixel) units per
     * second. Converts to physics units internally.
     * @param {number} vx - Horizontal velocity (world units/sec)
     * @param {number} vy - Vertical velocity (world units/sec)
     */
    setLinearVelocity(vx: number, vy: number): void;
    /**
     * @method getLinearVelocity
     * @description Returns the body's linear velocity in world (pixel) units/sec.
     * @returns {{x:number, y:number}}
     */
    getLinearVelocity(): {
        x: number;
        y: number;
    };
    /**
     * @method getLinearVelocityFromWorldPoint
     * @description The velocity (world units/sec) of the material point of this
     * body currently at `worldPoint`: linear velocity plus the contribution
     * from spin. Useful for e.g. where a spinning platform's edge is moving.
     * @param {Object} worldPoint - World (pixel) units
     * @returns {Vector2}
     */
    getLinearVelocityFromWorldPoint(worldPoint: any): Vector2;
    /**
     * @method setAngularVelocity
     * @description Sets the body's spin, in radians per second.
     * @param {number} omega
     */
    setAngularVelocity(omega: number): void;
    /**
     * @method getAngularVelocity
     * @description Returns the body's spin, in radians per second.
     * @returns {number}
     */
    getAngularVelocity(): number;
    /**
     * @method applyImpulse
     * @description Applies an instantaneous change in momentum (world units).
     * This is what a jump or a knockback should use, since (unlike a force) it
     * takes effect immediately rather than accumulating over the step.
     * @param {number} ix
     * @param {number} iy
     * @param {Object} [point] - World (pixel) point to apply it at; defaults to
     *   the center of mass (no torque)
     * @param {boolean} [wake=true]
     */
    applyImpulse(ix: number, iy: number, point?: any, wake?: boolean): void;
    /**
     * @method applyAngularImpulse
     * @description Applies an instantaneous change in angular momentum.
     * @param {number} impulse
     * @param {boolean} [wake=true]
     */
    applyAngularImpulse(impulse: number, wake?: boolean): void;
    /**
     * @method applyForce
     * @description Applies a force (world units) at a world point. Forces
     * accumulate and are cleared at the end of every step, so this belongs in
     * your update loop, unlike an impulse.
     * @param {number} fx
     * @param {number} fy
     * @param {Object} [point] - World (pixel) point; defaults to the center of
     *   mass (no torque)
     * @param {boolean} [wake=true]
     */
    applyForce(fx: number, fy: number, point?: any, wake?: boolean): void;
    /**
     * @method applyForceToCenter
     * @description Applies a force (world units) at the center of mass: no
     * torque, unlike {@link RigidBody#applyForce} with a point.
     * @param {number} fx
     * @param {number} fy
     * @param {boolean} [wake=true]
     */
    applyForceToCenter(fx: number, fy: number, wake?: boolean): void;
    /**
     * @method applyTorque
     * @description Applies a torque about the center of mass.
     * @param {number} torque
     * @param {boolean} [wake=true]
     */
    applyTorque(torque: number, wake?: boolean): void;
    /**
     * @method setAwake
     * @description Wakes or sleeps the body.
     * @param {boolean} awake
     */
    setAwake(awake: boolean): void;
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
     * @returns {boolean}
     */
    isActive(): boolean;
    /**
     * @method setFixedRotation
     * @description Locks or unlocks the body's rotation at runtime.
     * @param {boolean} flag
     */
    setFixedRotation(flag: boolean): void;
    /**
     * @method isFixedRotation
     * @returns {boolean}
     */
    isFixedRotation(): boolean;
    /**
     * @method setContinuous
     * @description Enables continuous collision detection (CCD) for this body by
     * marking it a "bullet". Fast-moving bodies (e.g. a dash, a projectile, a
     * player falling at high speed) otherwise sweep so far in a single fixed step
     * that they tunnel straight through thin static geometry; with CCD on, the
     * engine sweeps the body against static geometry so it stops at the wall
     * instead of teleporting past it. Costs more per step, so reserve it for the
     * handful of bodies that actually move fast.
     * @param {boolean} [enabled=true]
     * @returns {RigidBody} - this
     */
    setContinuous(enabled?: boolean): RigidBody;
    /**
     * @method isContinuous
     * @description Whether CCD (bullet mode) is enabled for this body.
     * @returns {boolean}
     */
    isContinuous(): boolean;
    /**
     * @method setLinearDamping
     * @description Sets the drag applied to linear motion each step.
     * @param {number} damping
     */
    setLinearDamping(damping: number): void;
    /**
     * @method getLinearDamping
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
     * @returns {number}
     */
    getAngularDamping(): number;
    /**
     * @method setGravityScale
     * @description Scales how strongly gravity pulls on this body (0 disables
     * it, 2 makes it twice as heavy-feeling).
     * @param {number} scale
     */
    setGravityScale(scale: number): void;
    /**
     * @method getGravityScale
     * @returns {number}
     */
    getGravityScale(): number;
    /**
     * @method getMass
     * @description Returns the body's mass, in physics units (derived from its
     * fixtures' shapes and densities, unaffected by the pixel scale).
     * @returns {number}
     */
    getMass(): number;
    /**
     * @method getInertia
     * @description Returns the body's rotational inertia about its center of
     * mass, in physics units.
     * @returns {number}
     */
    getInertia(): number;
    /**
     * @method resetMassData
     * @description Re-derives mass/center/inertia from the body's current
     * fixtures. Call this after changing a fixture's density at runtime.
     */
    resetMassData(): void;
    /**
     * @method setMassData
     * @description Overrides the computed mass properties directly.
     * @param {Object} massData - `{ mass, center, I }`; `center` is a world
     *   (pixel) offset from the body's origin
     */
    setMassData(massData: any): void;
    /**
     * @method getWorldPoint
     * @description Converts a point local to this body into world (pixel) space.
     * @param {Object} localPoint - World-unit offset from the body's origin
     * @returns {Vector2}
     */
    getWorldPoint(localPoint: any): Vector2;
    /**
     * @method getLocalPoint
     * @description Converts a world (pixel) point into this body's local frame.
     * @param {Object} worldPoint - World (pixel) units
     * @returns {Vector2}
     */
    getLocalPoint(worldPoint: any): Vector2;
    /**
     * @method getWorldVector
     * @description Rotates a local direction (not a point, unaffected by the
     * body's position) into world space.
     * @param {Object} localVector
     * @returns {Vector2}
     */
    getWorldVector(localVector: any): Vector2;
    /**
     * @method getLocalVector
     * @description Rotates a world direction into this body's local frame.
     * @param {Object} worldVector
     * @returns {Vector2}
     */
    getLocalVector(worldVector: any): Vector2;
    /**
     * @method getContactList
     * @description Returns the raw physics contacts this body currently takes
     * part in. Each contact's `fixtureA`/`fixtureB` point at physics-unit
     * fixtures/bodies, not RigidBody wrappers. Walk `fixture.body.getUserData()`
     * to get back to the owning RigidBody.
     * @returns {Array<Contact>}
     */
    getContactList(): Array<Contact>;
    /**
     * @method getWorld
     * @description Returns the raw physics {@link World} this body lives in.
     * @returns {World}
     */
    getWorld(): World;
    /**
     * @method getUserData
     * @description Returns whatever you last passed to
     * {@link RigidBody#setUserData}. This is separate from the underlying
     * physics body's own userData slot, which the engine itself uses internally
     * to route collisions back to this RigidBody, so setting it here can never
     * break that.
     * @returns {*}
     */
    getUserData(): any;
    /**
     * @method setUserData
     * @param {*} data
     */
    setUserData(data: any): void;
    /**
     * @method getPosition
     * @description Returns the live world-space position of the body (kept in sync
     * with the simulation), not the spawn position. Use getInitialPosition() for
     * the position the body was created at.
     * @returns {Vector2} - The current world-space position of the rigidbody
     */
    getPosition(): Vector2;
    /**
     * @method getInitialPosition
     * @description Returns the world-space position the body was created at.
     * @returns {Vector2} - The spawn position of the rigidbody
     */
    getInitialPosition(): Vector2;
    /**
     * @method getAngle
     * @description Returns the angle of the rigidbody
     * @returns {number} - The angle of the rigidbody
     */
    getAngle(): number;
    /**
     * @method getCollider
     * @description Returns the collider of the rigidbody
     * @returns {Collider} - The collider of the rigidbody
     */
    getCollider(): Collider;
    /**
     * @method getBody
     * @description Returns the underlying, physics-unit {@link Body}. Nothing in
     * ordinary use needs this: every common operation is a method on RigidBody
     * itself, in world/pixel units, but it's here for advanced cases (writing a
     * custom joint or solver hook) that need the raw physics object.
     * @returns {Body} - The body of the rigidbody
     */
    getBody(): Body;
    /**
     * @method getPhysics
     * @description Returns the physics engine of the rigidbody
     * @returns {Physics} - The physics engine of the rigidbody
     */
    getPhysics(): Physics;
    /**
     * @method destroy
     * @description Destroys the rigidbody
     */
    destroy(): void;
    /**
     * @method detachCollider
     * @description Detaches a collider from the rigidbody
     * @param {Collider} collider - The collider to detach
     */
    detachCollider(collider: Collider): void;
    /**
     * @method setParent
     * @description Sets the parent object of the rigidbody
     * @param {GameObject} parent - The parent object to set
     */
    setParent(parent: GameObject): void;
    /**
     * @method getType
     * @description Returns the type of the rigidbody
     * @returns {string | "static" | "dynamic" | "kinematic"} - The type of the rigidbody
     */
    getType(): string | "static" | "dynamic" | "kinematic";
    /**
     * @method setType
     * @description Changes the body type at runtime (e.g. turning a kinematic
     * moving platform into a dynamic one when it breaks apart). Resets
     * velocities and re-derives mass; existing contacts are dropped so they
     * rebuild against the new type.
     * @param {string | "static" | "dynamic" | "kinematic"} type
     */
    setType(type: string | "static" | "dynamic" | "kinematic"): void;
}
import { Vector2 } from "../Physics.js";
import Collider from "./Collider.js";
