/**
 * @class Contact
 * @description A potential or actual touch between two fixtures. The broadphase
 * creates one as soon as two AABBs overlap; `touching` only becomes true once
 * the narrowphase finds real contact points. Contacts persist across steps,
 * which is what lets the solver warm-start from last frame's impulses.
 */
export class Contact {
    /**
     * @method create
     * @description Builds a contact for a fixture pair, normalizing the order so
     * mixed polygon/circle pairs always arrive as (polygon, circle): the one
     * ordering the narrowphase implements.
     * @param {Fixture} fixtureA
     * @param {Fixture} fixtureB
     * @returns {Contact}
     */
    static create(fixtureA: Fixture, fixtureB: Fixture): Contact;
    constructor(fixtureA: any, fixtureB: any);
    fixtureA: any;
    fixtureB: any;
    manifold: Manifold;
    friction: number;
    restitution: any;
    tangentSpeed: number;
    /** @private */
    private enabled;
    /** @private */
    private filterFlag;
    /** @private */
    private islandFlag;
    /** @private */
    private toiFlag;
    /** @private */
    private toi;
    /**
     * @method getManifold
     * @description Returns the local-space manifold.
     * @returns {Manifold}
     */
    getManifold(): Manifold;
    /**
     * @method getWorldManifold
     * @description Returns the contact in world space: the normal (pointing from
     * fixture A's body towards fixture B's), the contact points, and the
     * separation at each point.
     * @param {WorldManifold} [worldManifold] - Optional object to fill
     * @returns {WorldManifold}
     */
    getWorldManifold(worldManifold?: WorldManifold): WorldManifold;
    /**
     * @method isTouching
     * @description Whether the fixtures are actually in contact this step.
     * @returns {boolean}
     */
    isTouching(): boolean;
    /**
     * @method setEnabled
     * @description Enables or disables the collision response for this contact.
     * Disabling only lasts for the current step (useful from a pre-solve
     * callback to build one-way platforms).
     * @param {boolean} value
     */
    setEnabled(value: boolean): void;
    /**
     * @method isEnabled
     * @description Whether the collision response is enabled.
     * @returns {boolean}
     */
    isEnabled(): boolean;
    /**
     * @method getFixtureA
     * @description Returns the first fixture.
     * @returns {Fixture}
     */
    getFixtureA(): Fixture;
    /**
     * @method getFixtureB
     * @description Returns the second fixture.
     * @returns {Fixture}
     */
    getFixtureB(): Fixture;
    /**
     * @method getFriction
     * @description Returns the mixed friction used by the solver.
     * @returns {number}
     */
    getFriction(): number;
    /**
     * @method setFriction
     * @description Overrides the mixed friction for this contact.
     * @param {number} friction
     */
    setFriction(friction: number): void;
    /**
     * @method resetFriction
     * @description Restores the friction mixed from the two fixtures.
     */
    resetFriction(): void;
    /**
     * @method getRestitution
     * @description Returns the mixed restitution used by the solver.
     * @returns {number}
     */
    getRestitution(): number;
    /**
     * @method setRestitution
     * @description Overrides the mixed restitution for this contact.
     * @param {number} restitution
     */
    setRestitution(restitution: number): void;
    /**
     * @method resetRestitution
     * @description Restores the restitution mixed from the two fixtures.
     */
    resetRestitution(): void;
    /**
     * @method flagForFiltering
     * @description Marks the contact so the next step re-checks whether these two
     * fixtures are still allowed to collide.
     */
    flagForFiltering(): void;
    /**
     * @method evaluate
     * @description Runs the narrowphase for this fixture pair into `manifold`.
     * @param {Manifold} manifold
     * @param {Transform2} xfA
     * @param {Transform2} xfB
     * @private
     */
    private evaluate;
    /**
     * @method update
     * @description Re-runs the narrowphase, carries last step's impulses over to
     * matching contact points (warm starting), and fires begin/end contact
     * events on the world when the touching state flips.
     * @param {World} world - The owning world, used to dispatch events
     */
    update(world: World): void;
}
/**
 * @class ContactManager
 * @description Owns the world's contact list: creates contacts from broadphase
 * pairs, drops them once the AABBs stop overlapping, and refreshes the ones
 * that remain each step.
 */
export class ContactManager {
    constructor(world: any);
    world: any;
    contacts: any[];
    /**
     * @method addPair
     * @description Creates a contact for a new broadphase pair, unless the two
     * fixtures share a body, already have a contact, or the filter rejects them.
     * @param {FixtureProxy} proxyA
     * @param {FixtureProxy} proxyB
     */
    addPair(proxyA: FixtureProxy, proxyB: FixtureProxy): void;
    /**
     * @method findNewContacts
     * @description Turns this step's broadphase movement into new contacts.
     */
    findNewContacts(): void;
    /**
     * @method destroy
     * @description Removes a contact, firing end-contact if it was touching.
     * @param {Contact} contact
     */
    destroy(contact: Contact): void;
    /**
     * @method collide
     * @description Refreshes every contact: drops the ones whose AABBs no longer
     * overlap or whose filters changed, and re-runs the narrowphase on the rest.
     */
    collide(): void;
}
/**
 * @function shouldCollide
 * @description Applies the collision filter to a fixture pair. A positive
 * shared group index always collides, a negative one never does; otherwise each
 * fixture's category must appear in the other's mask.
 * @param {Fixture} fixtureA
 * @param {Fixture} fixtureB
 * @returns {boolean}
 */
export function shouldCollide(fixtureA: Fixture, fixtureB: Fixture): boolean;
/** @import { Fixture, FixtureProxy } from "./Fixture.js" */
/** @import { Transform2 } from "./Math2D.js" */
/** @import World from "./World.js" */
/**
 * @function mixFriction
 * @description Combines two friction coefficients (geometric mean), so a slick
 * body sliding on a rough one lands somewhere in between.
 * @private
 */
export function mixFriction(a: any, b: any): number;
/**
 * @function mixRestitution
 * @description Combines two restitutions: the bouncier surface wins, which is
 * what players expect from a trampoline on concrete.
 * @private
 */
export function mixRestitution(a: any, b: any): any;
import { Manifold } from "./Collision.js";
import { WorldManifold } from "./Collision.js";
import type { Fixture } from "./Fixture.js";
import type World from "./World.js";
import type { FixtureProxy } from "./Fixture.js";
