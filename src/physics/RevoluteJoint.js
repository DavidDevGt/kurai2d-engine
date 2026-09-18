import { Vec2, Rot, clamp } from "./Math2D.js";
import { Joint, JointType } from "./Joint.js";
import PhysicsSettings from "./Settings.js";

/**
 * @function solve22
 * @description Solves the symmetric 2x2 system `K * x = b` for `x`.
 * @param {{k11:number, k12:number, k22:number}} K
 * @param {Vec2} b
 * @returns {Vec2}
 * @private
 */
function solve22(K, b) {
  const det = K.k11 * K.k22 - K.k12 * K.k12;
  const invDet = det !== 0 ? 1 / det : 0;
  return new Vec2(
    invDet * (K.k22 * b.x - K.k12 * b.y),
    invDet * (K.k11 * b.y - K.k12 * b.x)
  );
}

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
class RevoluteJoint extends Joint {
  constructor(def) {
    super({ ...def, type: JointType.REVOLUTE });
    this.localAnchorA = new Vec2(def.localAnchorA || { x: 0, y: 0 });
    this.localAnchorB = new Vec2(def.localAnchorB || { x: 0, y: 0 });
    this.referenceAngle =
      def.referenceAngle ?? def.bodyB.getAngle() - def.bodyA.getAngle();

    this.enableMotor = !!def.enableMotor;
    this.motorSpeed = def.motorSpeed ?? 0;
    this.maxMotorTorque = def.maxMotorTorque ?? 0;

    this.impulse = new Vec2();
    this.motorImpulse = 0;
    this.axialMass = 0;
    this.motorMass = 0;
    this.K = { k11: 0, k12: 0, k22: 0 };
    this.rA = new Vec2();
    this.rB = new Vec2();
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
    return Vec2.mul(invDt, this.impulse);
  }

  /**
   * @method getReactionTorque
   * @param {number} invDt
   * @returns {number}
   */
  getReactionTorque(invDt) {
    return invDt * this.motorImpulse;
  }

  /**
   * @method getJointAngle
   * @description Current angle of body B relative to body A, minus the angle
   * they started at.
   * @returns {number}
   */
  getJointAngle() {
    return this.bodyB.getAngle() - this.bodyA.getAngle() - this.referenceAngle;
  }

  /**
   * @method setMotorSpeed
   * @param {number} speed
   */
  setMotorSpeed(speed) {
    this.motorSpeed = speed;
  }

  /**
   * @method getMotorSpeed
   * @returns {number}
   */
  getMotorSpeed() {
    return this.motorSpeed;
  }

  /**
   * @method setMaxMotorTorque
   * @param {number} torque
   */
  setMaxMotorTorque(torque) {
    this.maxMotorTorque = torque;
  }

  /**
   * @method setEnableMotor
   * @param {boolean} flag
   */
  setEnableMotor(flag) {
    this.enableMotor = !!flag;
  }

  /**
   * @method isMotorEnabled
   * @returns {boolean}
   */
  isMotorEnabled() {
    return this.enableMotor;
  }

  /**
   * @method getMotorTorque
   * @param {number} invDt
   * @returns {number}
   */
  getMotorTorque(invDt) {
    return invDt * this.motorImpulse;
  }

  /**
   * @method initVelocityConstraints
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

    const mA = this.invMassA;
    const mB = this.invMassB;
    const iA = this.invIA;
    const iB = this.invIB;

    this.axialMass = iA + iB;
    this.motorMass = this.axialMass > 0 ? 1 / this.axialMass : 0;
    if (!this.enableMotor || this.axialMass === 0) this.motorImpulse = 0;

    this.K.k11 =
      mA + mB + iA * this.rA.y * this.rA.y + iB * this.rB.y * this.rB.y;
    this.K.k12 = -iA * this.rA.x * this.rA.y - iB * this.rB.x * this.rB.y;
    this.K.k22 =
      mA + mB + iA * this.rA.x * this.rA.x + iB * this.rB.x * this.rB.x;

    if (step.warmStarting) {
      velA.v.subMul(mA, this.impulse);
      velA.w -= iA * (Vec2.cross(this.rA, this.impulse) + this.motorImpulse);
      velB.v.addMul(mB, this.impulse);
      velB.w += iB * (Vec2.cross(this.rB, this.impulse) + this.motorImpulse);
    } else {
      this.impulse.setZero();
      this.motorImpulse = 0;
    }
  }

  /**
   * @method solveVelocityConstraints
   * @param {Object} step - `{ dt }`
   * @param {Array<Object>} velocities
   */
  solveVelocityConstraints(step, velocities) {
    const velA = velocities[this.indexA];
    const velB = velocities[this.indexB];
    const mA = this.invMassA;
    const mB = this.invMassB;
    const iA = this.invIA;
    const iB = this.invIB;

    if (this.enableMotor) {
      const Cdot = velB.w - velA.w - this.motorSpeed;
      let impulse = -this.motorMass * Cdot;
      const oldImpulse = this.motorImpulse;
      const maxImpulse = this.maxMotorTorque * step.dt;
      this.motorImpulse = clamp(oldImpulse + impulse, -maxImpulse, maxImpulse);
      impulse = this.motorImpulse - oldImpulse;
      velA.w -= iA * impulse;
      velB.w += iB * impulse;
    }

    const vpA = Vec2.add(velA.v, Vec2.crossSV(velA.w, this.rA));
    const vpB = Vec2.add(velB.v, Vec2.crossSV(velB.w, this.rB));
    const Cdot = Vec2.sub(vpB, vpA);
    const impulse = solve22(this.K, Vec2.neg(Cdot));

    this.impulse.add(impulse);

    velA.v.subMul(mA, impulse);
    velA.w -= iA * Vec2.cross(this.rA, impulse);
    velB.v.addMul(mB, impulse);
    velB.w += iB * Vec2.cross(this.rB, impulse);
  }

  /**
   * @method solvePositionConstraints
   * @param {Array<Object>} positions
   * @returns {boolean}
   */
  solvePositionConstraints(positions) {
    const posA = positions[this.indexA];
    const posB = positions[this.indexB];
    const mA = this.invMassA;
    const mB = this.invMassB;
    const iA = this.invIA;
    const iB = this.invIB;
    const localCenterA = this.bodyA.sweep.localCenter;
    const localCenterB = this.bodyB.sweep.localCenter;

    const qA = new Rot(posA.a);
    const qB = new Rot(posB.a);
    const rA = Rot.mulVec(qA, Vec2.sub(this.localAnchorA, localCenterA));
    const rB = Rot.mulVec(qB, Vec2.sub(this.localAnchorB, localCenterB));

    const C = Vec2.sub(Vec2.add(posB.c, rB), Vec2.add(posA.c, rA));
    const positionError = C.length();

    const K = {
      k11: mA + mB + iA * rA.y * rA.y + iB * rB.y * rB.y,
      k12: -iA * rA.x * rA.y - iB * rB.x * rB.y,
      k22: mA + mB + iA * rA.x * rA.x + iB * rB.x * rB.x,
    };
    const impulse = solve22(K, Vec2.neg(C));

    posA.c.subMul(mA, impulse);
    posA.a -= iA * Vec2.cross(rA, impulse);
    posB.c.addMul(mB, impulse);
    posB.a += iB * Vec2.cross(rB, impulse);

    return positionError <= PhysicsSettings.linearSlop;
  }
}

export default RevoluteJoint;
