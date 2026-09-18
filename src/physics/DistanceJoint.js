import { Vec2, Rot } from "./Math2D.js";
import { Joint, JointType } from "./Joint.js";
import PhysicsSettings from "./Settings.js";

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
class DistanceJoint extends Joint {
  constructor(def) {
    super({ ...def, type: JointType.DISTANCE });
    this.localAnchorA = new Vec2(def.localAnchorA || { x: 0, y: 0 });
    this.localAnchorB = new Vec2(def.localAnchorB || { x: 0, y: 0 });
    this.length = def.length ?? 1;
    this.frequencyHz = def.frequencyHz ?? 0;
    this.dampingRatio = def.dampingRatio ?? 0;

    this.impulse = 0;
    this.gamma = 0;
    this.bias = 0;
    this.u = new Vec2();
    this.rA = new Vec2();
    this.rB = new Vec2();
    this.mass = 0;
    /** @private */
    this.indexA = 0;
    /** @private */
    this.indexB = 0;
  }

  /**
   * @method getAnchorA
   * @returns {Vec2}
   */
  getAnchorA() {
    return this.bodyA.getWorldPoint(this.localAnchorA);
  }

  /**
   * @method getAnchorB
   * @returns {Vec2}
   */
  getAnchorB() {
    return this.bodyB.getWorldPoint(this.localAnchorB);
  }

  /**
   * @method getReactionForce
   * @param {number} invDt
   * @returns {Vec2}
   */
  getReactionForce(invDt) {
    return Vec2.mul(this.impulse * invDt, this.u);
  }

  /**
   * @method getReactionTorque
   * @returns {number}
   */
  getReactionTorque() {
    return 0;
  }

  /**
   * @method setLength
   * @param {number} length
   */
  setLength(length) {
    this.length = length;
  }

  /**
   * @method getLength
   * @returns {number}
   */
  getLength() {
    return this.length;
  }

  /**
   * @method initVelocityConstraints
   * @description Effective mass at the current anchor separation, plus (for
   * a soft joint) the spring-damper bias for this step.
   * @param {Object} step - `{ dt, warmStarting }`
   * @param {Array<Object>} positions
   * @param {Array<Object>} velocities
   */
  initVelocityConstraints(step, positions, velocities) {
    this.indexA = this.bodyA.islandIndex;
    this.indexB = this.bodyB.islandIndex;
    this.invMassA = this.bodyA.invMass;
    this.invMassB = this.bodyB.invMass;
    this.invIA = this.bodyA.invI;
    this.invIB = this.bodyB.invI;
    const localCenterA = this.bodyA.sweep.localCenter;
    const localCenterB = this.bodyB.sweep.localCenter;

    const posA = positions[this.indexA];
    const posB = positions[this.indexB];
    const velA = velocities[this.indexA];
    const velB = velocities[this.indexB];

    const qA = new Rot(posA.a);
    const qB = new Rot(posB.a);

    this.rA = Rot.mulVec(qA, Vec2.sub(this.localAnchorA, localCenterA));
    this.rB = Rot.mulVec(qB, Vec2.sub(this.localAnchorB, localCenterB));
    this.u = Vec2.sub(Vec2.add(posB.c, this.rB), Vec2.add(posA.c, this.rA));

    const length = this.u.length();
    if (length > PhysicsSettings.linearSlop) {
      this.u.mul(1 / length);
    } else {
      this.u.set(0, 0);
    }

    const crA = Vec2.cross(this.rA, this.u);
    const crB = Vec2.cross(this.rB, this.u);
    let invMass =
      this.invMassA +
      this.invIA * crA * crA +
      this.invMassB +
      this.invIB * crB * crB;
    this.mass = invMass !== 0 ? 1 / invMass : 0;

    if (this.frequencyHz > 0) {
      const C = length - this.length;
      const omega = 2 * Math.PI * this.frequencyHz;
      const d = 2 * this.mass * this.dampingRatio * omega;
      const k = this.mass * omega * omega;
      const h = step.dt;

      this.gamma = h * (d + h * k);
      this.gamma = this.gamma !== 0 ? 1 / this.gamma : 0;
      this.bias = C * h * k * this.gamma;

      invMass += this.gamma;
      this.mass = invMass !== 0 ? 1 / invMass : 0;
    } else {
      this.gamma = 0;
      this.bias = 0;
    }

    if (step.warmStarting) {
      const P = Vec2.mul(this.impulse, this.u);
      velA.v.subMul(this.invMassA, P);
      velA.w -= this.invIA * Vec2.cross(this.rA, P);
      velB.v.addMul(this.invMassB, P);
      velB.w += this.invIB * Vec2.cross(this.rB, P);
    } else {
      this.impulse = 0;
    }
  }

  /**
   * @method solveVelocityConstraints
   * @param {Object} step - `{ dt }` (unused here, kept for a uniform joint interface)
   * @param {Array<Object>} velocities
   */
  solveVelocityConstraints(step, velocities) {
    const velA = velocities[this.indexA];
    const velB = velocities[this.indexB];

    const vpA = Vec2.add(velA.v, Vec2.crossSV(velA.w, this.rA));
    const vpB = Vec2.add(velB.v, Vec2.crossSV(velB.w, this.rB));
    const Cdot = Vec2.dot(this.u, Vec2.sub(vpB, vpA));

    const impulse = -this.mass * (Cdot + this.bias + this.gamma * this.impulse);
    this.impulse += impulse;

    const P = Vec2.mul(impulse, this.u);
    velA.v.subMul(this.invMassA, P);
    velA.w -= this.invIA * Vec2.cross(this.rA, P);
    velB.v.addMul(this.invMassB, P);
    velB.w += this.invIB * Vec2.cross(this.rB, P);
  }

  /**
   * @method solvePositionConstraints
   * @description Skipped for a soft (spring) joint: the bias already pulled
   * it toward rest length during the velocity pass, and correcting position
   * on top of that would fight the spring.
   * @param {Array<Object>} positions
   * @returns {boolean}
   */
  solvePositionConstraints(positions) {
    if (this.frequencyHz > 0) return true;

    const posA = positions[this.indexA];
    const posB = positions[this.indexB];

    const qA = new Rot(posA.a);
    const qB = new Rot(posB.a);

    const localCenterA = this.bodyA.sweep.localCenter;
    const localCenterB = this.bodyB.sweep.localCenter;
    const rA = Rot.mulVec(qA, Vec2.sub(this.localAnchorA, localCenterA));
    const rB = Rot.mulVec(qB, Vec2.sub(this.localAnchorB, localCenterB));
    const u = Vec2.sub(Vec2.add(posB.c, rB), Vec2.add(posA.c, rA));

    const length = u.normalize();
    const C = length - this.length;

    const clamped = Math.max(
      -PhysicsSettings.maxLinearCorrection,
      Math.min(PhysicsSettings.maxLinearCorrection, C)
    );

    const impulse = -this.mass * clamped;
    const P = Vec2.mul(impulse, u);

    posA.c.subMul(this.invMassA, P);
    posA.a -= this.invIA * Vec2.cross(rA, P);
    posB.c.addMul(this.invMassB, P);
    posB.a += this.invIB * Vec2.cross(rB, P);

    return Math.abs(C) < PhysicsSettings.linearSlop;
  }
}

export default DistanceJoint;
