export default Island;
/** @import { Contact } from "./Contact.js" */
/** @import { Joint } from "./Joint.js" */
/** @import { Body } from "./Body.js" */
/**
 * @class Island
 * @description A connected group of bodies, everything reachable through
 * touching contacts, solved together. Islands are what make sleeping work:
 * a pile of crates only goes to sleep once *every* body in it has settled, so
 * one crate still rolling keeps the whole pile simulated.
 */
declare class Island {
    bodies: any[];
    contacts: any[];
    joints: any[];
    /** @private */
    private positions;
    /** @private */
    private velocities;
    /**
     * @method clear
     * @description Empties the island for reuse on the next seed body.
     */
    clear(): void;
    /**
     * @method addBody
     * @description Adds a body and records its index for the solver.
     * @param {Body} body
     */
    addBody(body: Body): void;
    /**
     * @method addContact
     * @description Adds a touching contact to be solved with this island.
     * @param {Contact} contact
     */
    addContact(contact: Contact): void;
    /**
     * @method addJoint
     * @description Adds a joint to be solved with this island.
     * @param {Joint} joint
     */
    addJoint(joint: Joint): void;
    /**
     * @method solve
     * @description Advances the island by one step: integrate velocities, solve
     * contacts, integrate positions, fix leftover overlap, then decide whether
     * the island can go to sleep.
     * @param {Object} step - `{ dt, velocityIterations, positionIterations,
     *   warmStarting, velocityThreshold }`
     * @param {Vec2} gravity - World gravity in physics units
     * @param {boolean} allowSleep - Whether sleeping is enabled world-wide
     */
    solve(step: any, gravity: Vec2, allowSleep: boolean): void;
}
import type { Body } from "./Body.js";
import type { Contact } from "./Contact.js";
import type { Joint } from "./Joint.js";
import { Vec2 } from "./Math2D.js";
