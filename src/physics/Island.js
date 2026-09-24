import { Vec2 } from "./Math2D.js";
import Settings from "./Settings.js";
import ContactSolver from "./ContactSolver.js";
import { BodyType } from "./BodyType.js";

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
class Island {
  constructor() {
    this.bodies = [];
    this.contacts = [];
    this.joints = [];
    /** @private */
    this.positions = [];
    /** @private */
    this.velocities = [];
  }

  /**
   * @method clear
   * @description Empties the island for reuse on the next seed body.
   */
  clear() {
    this.bodies.length = 0;
    this.contacts.length = 0;
    this.joints.length = 0;
  }

  /**
   * @method addBody
   * @description Adds a body and records its index for the solver.
   * @param {Body} body
   */
  addBody(body) {
    body.islandIndex = this.bodies.length;
    this.bodies.push(body);
  }

  /**
   * @method addContact
   * @description Adds a touching contact to be solved with this island.
   * @param {Contact} contact
   */
  addContact(contact) {
    this.contacts.push(contact);
  }

  /**
   * @method addJoint
   * @description Adds a joint to be solved with this island.
   * @param {Joint} joint
   */
  addJoint(joint) {
    this.joints.push(joint);
  }

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
  solve(step, gravity, allowSleep) {
    const h = step.dt;

    this.positions.length = 0;
    this.velocities.length = 0;

    for (const body of this.bodies) {
      const c = body.sweep.c.clone();
      const a = body.sweep.a;
      const v = body.linearVelocity.clone();
      let w = body.angularVelocity;

      body.sweep.c0.copy(body.sweep.c);
      body.sweep.a0 = body.sweep.a;

      if (body.type === BodyType.DYNAMIC) {
        v.x +=
          h * (body.gravityScale * gravity.x + body.invMass * body.force.x);
        v.y +=
          h * (body.gravityScale * gravity.y + body.invMass * body.force.y);
        w += h * body.invI * body.torque;

        const linearScale = 1 / (1 + h * body.linearDamping);
        v.x *= linearScale;
        v.y *= linearScale;
        w *= 1 / (1 + h * body.angularDamping);
      }

      this.positions.push({ c, a });
      this.velocities.push({ v, w });
    }

    const solver = new ContactSolver({
      contacts: this.contacts,
      positions: this.positions,
      velocities: this.velocities,
      dt: h,
      velocityThreshold: step.velocityThreshold,
    });

    for (const joint of this.joints) {
      joint.initVelocityConstraints(step, this.positions, this.velocities);
    }

    solver.initializeVelocityConstraints();
    if (step.warmStarting) solver.warmStart();

    for (let i = 0; i < step.velocityIterations; i++) {
      for (const joint of this.joints) {
        joint.solveVelocityConstraints(step, this.velocities);
      }
      solver.solveVelocityConstraints();
    }
    solver.storeImpulses();

    for (let i = 0; i < this.bodies.length; i++) {
      const pos = this.positions[i];
      const vel = this.velocities[i];

      let translationX = h * vel.v.x;
      let translationY = h * vel.v.y;
      const translationSq =
        translationX * translationX + translationY * translationY;
      if (translationSq > Settings.maxTranslation * Settings.maxTranslation) {
        const ratio = Settings.maxTranslation / Math.sqrt(translationSq);
        vel.v.x *= ratio;
        vel.v.y *= ratio;
      }

      const rotation = h * vel.w;
      if (rotation * rotation > Settings.maxRotation * Settings.maxRotation) {
        vel.w *= Settings.maxRotation / Math.abs(rotation);
      }

      pos.c.x += h * vel.v.x;
      pos.c.y += h * vel.v.y;
      pos.a += h * vel.w;
    }

    let positionSolved = false;
    for (let i = 0; i < step.positionIterations; i++) {
      let jointsOkay = true;
      for (const joint of this.joints) {
        jointsOkay =
          joint.solvePositionConstraints(this.positions) && jointsOkay;
      }
      const contactsOkay = solver.solvePositionConstraints();
      if (jointsOkay && contactsOkay) {
        positionSolved = true;
        break;
      }
    }

    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      body.sweep.c.copy(this.positions[i].c);
      body.sweep.a = this.positions[i].a;
      body.linearVelocity.copy(this.velocities[i].v);
      body.angularVelocity = this.velocities[i].w;
      body.synchronizeTransform();
    }

    if (!allowSleep) return;

    let minSleepTime = Number.MAX_VALUE;
    const linTolSqr =
      Settings.linearSleepTolerance * Settings.linearSleepTolerance;
    const angTolSqr =
      Settings.angularSleepTolerance * Settings.angularSleepTolerance;

    for (const body of this.bodies) {
      if (body.type === BodyType.STATIC) continue;
      if (
        !body.allowSleep ||
        body.angularVelocity * body.angularVelocity > angTolSqr ||
        Vec2.dot(body.linearVelocity, body.linearVelocity) > linTolSqr
      ) {
        body.sleepTime = 0;
        minSleepTime = 0;
      } else {
        body.sleepTime += h;
        minSleepTime = Math.min(minSleepTime, body.sleepTime);
      }
    }

    if (minSleepTime >= Settings.timeToSleep && positionSolved) {
      for (const body of this.bodies) body.setAwake(false);
    }
  }
}

export default Island;
