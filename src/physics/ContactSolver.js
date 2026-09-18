import { Vec2, Transform2, clamp } from "./Math2D.js";
import Settings from "./Settings.js";
import { ManifoldType, WorldManifold } from "./Collision.js";

const MAX_CONDITION_NUMBER = 1000;
const worldManifold = new WorldManifold();
const xfA = new Transform2();
const xfB = new Transform2();

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
class ContactSolver {
  constructor(def) {
    this.positions = def.positions;
    this.velocities = def.velocities;
    this.contacts = def.contacts;
    this.dt = def.dt;
    this.velocityThreshold =
      def.velocityThreshold ?? Settings.velocityThreshold;

    this.velocityConstraints = [];
    this.positionConstraints = [];

    for (let i = 0; i < this.contacts.length; i++) {
      const contact = this.contacts[i];
      const fixtureA = contact.fixtureA;
      const fixtureB = contact.fixtureB;
      const bodyA = fixtureA.body;
      const bodyB = fixtureB.body;
      const manifold = contact.manifold;
      const pointCount = manifold.pointCount;
      if (pointCount === 0) continue;

      const vc = {
        friction: contact.friction,
        restitution: contact.restitution,
        tangentSpeed: contact.tangentSpeed,
        indexA: bodyA.islandIndex,
        indexB: bodyB.islandIndex,
        invMassA: bodyA.invMass,
        invMassB: bodyB.invMass,
        invIA: bodyA.invI,
        invIB: bodyB.invI,
        contactIndex: i,
        pointCount,
        normal: new Vec2(),
        tangent: new Vec2(),
        K: { k11: 0, k12: 0, k22: 0 },
        normalMass: { k11: 0, k12: 0, k22: 0 },
        points: [],
      };
      for (let j = 0; j < pointCount; j++) {
        vc.points.push({
          rA: new Vec2(),
          rB: new Vec2(),
          normalImpulse: manifold.points[j].normalImpulse,
          tangentImpulse: manifold.points[j].tangentImpulse,
          normalMass: 0,
          tangentMass: 0,
          velocityBias: 0,
        });
      }

      const pc = {
        indexA: bodyA.islandIndex,
        indexB: bodyB.islandIndex,
        invMassA: bodyA.invMass,
        invMassB: bodyB.invMass,
        invIA: bodyA.invI,
        invIB: bodyB.invI,
        localCenterA: bodyA.sweep.localCenter,
        localCenterB: bodyB.sweep.localCenter,
        radiusA: fixtureA.shape.radius,
        radiusB: fixtureB.shape.radius,
        type: manifold.type,
        localNormal: manifold.localNormal,
        localPoint: manifold.localPoint,
        localPoints: [],
        pointCount,
      };
      for (let j = 0; j < pointCount; j++) {
        pc.localPoints.push(manifold.points[j].localPoint);
      }

      this.velocityConstraints.push(vc);
      this.positionConstraints.push(pc);
    }
  }

  /**
   * @method initializeVelocityConstraints
   * @description Computes the effective mass at every contact point and the
   * bounce target, from the state at the start of the step.
   */
  initializeVelocityConstraints() {
    for (let i = 0; i < this.velocityConstraints.length; i++) {
      const vc = this.velocityConstraints[i];
      const pc = this.positionConstraints[i];
      const contact = this.contacts[vc.contactIndex];
      const manifold = contact.manifold;

      const posA = this.positions[vc.indexA];
      const posB = this.positions[vc.indexB];
      const velA = this.velocities[vc.indexA];
      const velB = this.velocities[vc.indexB];

      xfA.q.set(posA.a);
      xfB.q.set(posB.a);
      xfA.p.set(
        posA.c.x - (xfA.q.c * pc.localCenterA.x - xfA.q.s * pc.localCenterA.y),
        posA.c.y - (xfA.q.s * pc.localCenterA.x + xfA.q.c * pc.localCenterA.y)
      );
      xfB.p.set(
        posB.c.x - (xfB.q.c * pc.localCenterB.x - xfB.q.s * pc.localCenterB.y),
        posB.c.y - (xfB.q.s * pc.localCenterB.x + xfB.q.c * pc.localCenterB.y)
      );

      worldManifold.initialize(manifold, xfA, pc.radiusA, xfB, pc.radiusB);
      vc.normal.copy(worldManifold.normal);
      vc.tangent.set(vc.normal.y, -vc.normal.x);

      const mA = vc.invMassA;
      const mB = vc.invMassB;
      const iA = vc.invIA;
      const iB = vc.invIB;

      for (let j = 0; j < vc.pointCount; j++) {
        const vcp = vc.points[j];
        vcp.rA.set(
          worldManifold.points[j].x - posA.c.x,
          worldManifold.points[j].y - posA.c.y
        );
        vcp.rB.set(
          worldManifold.points[j].x - posB.c.x,
          worldManifold.points[j].y - posB.c.y
        );

        const rnA = Vec2.cross(vcp.rA, vc.normal);
        const rnB = Vec2.cross(vcp.rB, vc.normal);
        const kNormal = mA + mB + iA * rnA * rnA + iB * rnB * rnB;
        vcp.normalMass = kNormal > 0 ? 1 / kNormal : 0;

        const rtA = Vec2.cross(vcp.rA, vc.tangent);
        const rtB = Vec2.cross(vcp.rB, vc.tangent);
        const kTangent = mA + mB + iA * rtA * rtA + iB * rtB * rtB;
        vcp.tangentMass = kTangent > 0 ? 1 / kTangent : 0;

        vcp.velocityBias = 0;
        const vRel =
          vc.normal.x *
            (velB.v.x - velB.w * vcp.rB.y - (velA.v.x - velA.w * vcp.rA.y)) +
          vc.normal.y *
            (velB.v.y + velB.w * vcp.rB.x - (velA.v.y + velA.w * vcp.rA.x));
        if (vRel < -this.velocityThreshold) {
          vcp.velocityBias = -vc.restitution * vRel;
        }
      }

      if (vc.pointCount === 2) {
        const vcp1 = vc.points[0];
        const vcp2 = vc.points[1];
        const rn1A = Vec2.cross(vcp1.rA, vc.normal);
        const rn1B = Vec2.cross(vcp1.rB, vc.normal);
        const rn2A = Vec2.cross(vcp2.rA, vc.normal);
        const rn2B = Vec2.cross(vcp2.rB, vc.normal);

        const k11 = mA + mB + iA * rn1A * rn1A + iB * rn1B * rn1B;
        const k22 = mA + mB + iA * rn2A * rn2A + iB * rn2B * rn2B;
        const k12 = mA + mB + iA * rn1A * rn2A + iB * rn1B * rn2B;

        if (k11 * k11 < MAX_CONDITION_NUMBER * (k11 * k22 - k12 * k12)) {
          vc.K.k11 = k11;
          vc.K.k12 = k12;
          vc.K.k22 = k22;
          const det = k11 * k22 - k12 * k12;
          const invDet = det !== 0 ? 1 / det : 0;
          vc.normalMass.k11 = invDet * k22;
          vc.normalMass.k12 = -invDet * k12;
          vc.normalMass.k22 = invDet * k11;
        } else {
          vc.pointCount = 1;
        }
      }
    }
  }

  /**
   * @method warmStart
   * @description Re-applies last step's impulses before solving, which gets the
   * solver most of the way to the answer immediately.
   */
  warmStart() {
    for (const vc of this.velocityConstraints) {
      const velA = this.velocities[vc.indexA];
      const velB = this.velocities[vc.indexB];
      const mA = vc.invMassA;
      const mB = vc.invMassB;
      const iA = vc.invIA;
      const iB = vc.invIB;

      for (let j = 0; j < vc.pointCount; j++) {
        const vcp = vc.points[j];
        const px =
          vcp.normalImpulse * vc.normal.x + vcp.tangentImpulse * vc.tangent.x;
        const py =
          vcp.normalImpulse * vc.normal.y + vcp.tangentImpulse * vc.tangent.y;

        velA.w -= iA * (vcp.rA.x * py - vcp.rA.y * px);
        velA.v.x -= mA * px;
        velA.v.y -= mA * py;
        velB.w += iB * (vcp.rB.x * py - vcp.rB.y * px);
        velB.v.x += mB * px;
        velB.v.y += mB * py;
      }
    }
  }

  /**
   * @method solveVelocityConstraints
   * @description One relaxation pass over every contact point: friction first,
   * then the normal impulses that stop the bodies interpenetrating.
   */
  solveVelocityConstraints() {
    for (const vc of this.velocityConstraints) {
      const velA = this.velocities[vc.indexA];
      const velB = this.velocities[vc.indexB];
      const mA = vc.invMassA;
      const mB = vc.invMassB;
      const iA = vc.invIA;
      const iB = vc.invIB;
      const normal = vc.normal;
      const tangent = vc.tangent;
      const friction = vc.friction;

      for (let j = 0; j < vc.pointCount; j++) {
        const vcp = vc.points[j];
        const dvx =
          velB.v.x - velB.w * vcp.rB.y - (velA.v.x - velA.w * vcp.rA.y);
        const dvy =
          velB.v.y + velB.w * vcp.rB.x - (velA.v.y + velA.w * vcp.rA.x);

        const vt = dvx * tangent.x + dvy * tangent.y - vc.tangentSpeed;
        let lambda = vcp.tangentMass * -vt;

        const maxFriction = friction * vcp.normalImpulse;
        const newImpulse = clamp(
          vcp.tangentImpulse + lambda,
          -maxFriction,
          maxFriction
        );
        lambda = newImpulse - vcp.tangentImpulse;
        vcp.tangentImpulse = newImpulse;

        const px = lambda * tangent.x;
        const py = lambda * tangent.y;
        velA.v.x -= mA * px;
        velA.v.y -= mA * py;
        velA.w -= iA * (vcp.rA.x * py - vcp.rA.y * px);
        velB.v.x += mB * px;
        velB.v.y += mB * py;
        velB.w += iB * (vcp.rB.x * py - vcp.rB.y * px);
      }

      if (vc.pointCount === 1) {
        const vcp = vc.points[0];
        const dvx =
          velB.v.x - velB.w * vcp.rB.y - (velA.v.x - velA.w * vcp.rA.y);
        const dvy =
          velB.v.y + velB.w * vcp.rB.x - (velA.v.y + velA.w * vcp.rA.x);
        const vn = dvx * normal.x + dvy * normal.y;

        let lambda = -vcp.normalMass * (vn - vcp.velocityBias);
        const newImpulse = Math.max(vcp.normalImpulse + lambda, 0);
        lambda = newImpulse - vcp.normalImpulse;
        vcp.normalImpulse = newImpulse;

        const px = lambda * normal.x;
        const py = lambda * normal.y;
        velA.v.x -= mA * px;
        velA.v.y -= mA * py;
        velA.w -= iA * (vcp.rA.x * py - vcp.rA.y * px);
        velB.v.x += mB * px;
        velB.v.y += mB * py;
        velB.w += iB * (vcp.rB.x * py - vcp.rB.y * px);
      } else {
        this._solveBlock(vc, velA, velB, mA, mB, iA, iB);
      }
    }
  }

  /**
   * @method _solveBlock
   * @description Two-point block solve. Solving both points of a manifold
   * together (rather than one after the other) is what keeps a box resting on
   * the ground from rocking between its corners. Four candidate solutions are
   * tried in turn: both points pushing, either one alone, or neither.
   * @private
   */
  _solveBlock(vc, velA, velB, mA, mB, iA, iB) {
    const cp1 = vc.points[0];
    const cp2 = vc.points[1];
    const normal = vc.normal;

    const ax = cp1.normalImpulse;
    const ay = cp2.normalImpulse;

    const dv1x = velB.v.x - velB.w * cp1.rB.y - (velA.v.x - velA.w * cp1.rA.y);
    const dv1y = velB.v.y + velB.w * cp1.rB.x - (velA.v.y + velA.w * cp1.rA.x);
    const dv2x = velB.v.x - velB.w * cp2.rB.y - (velA.v.x - velA.w * cp2.rA.y);
    const dv2y = velB.v.y + velB.w * cp2.rB.x - (velA.v.y + velA.w * cp2.rA.x);

    let vn1 = dv1x * normal.x + dv1y * normal.y;
    let vn2 = dv2x * normal.x + dv2y * normal.y;

    const bx = vn1 - cp1.velocityBias - (vc.K.k11 * ax + vc.K.k12 * ay);
    const by = vn2 - cp2.velocityBias - (vc.K.k12 * ax + vc.K.k22 * ay);

    let xx;
    let xy;

    for (;;) {
      xx = -(vc.normalMass.k11 * bx + vc.normalMass.k12 * by);
      xy = -(vc.normalMass.k12 * bx + vc.normalMass.k22 * by);
      if (xx >= 0 && xy >= 0) break;

      xx = -cp1.normalMass * bx;
      xy = 0;
      vn2 = vc.K.k12 * xx + by;
      if (xx >= 0 && vn2 >= 0) break;

      xx = 0;
      xy = -cp2.normalMass * by;
      vn1 = vc.K.k12 * xy + bx;
      if (xy >= 0 && vn1 >= 0) break;

      xx = 0;
      xy = 0;
      vn1 = bx;
      vn2 = by;
      if (vn1 >= 0 && vn2 >= 0) break;

      return;
    }

    const dx = xx - ax;
    const dy = xy - ay;
    const p1x = dx * normal.x;
    const p1y = dx * normal.y;
    const p2x = dy * normal.x;
    const p2y = dy * normal.y;

    velA.v.x -= mA * (p1x + p2x);
    velA.v.y -= mA * (p1y + p2y);
    velA.w -=
      iA *
      (cp1.rA.x * p1y - cp1.rA.y * p1x + (cp2.rA.x * p2y - cp2.rA.y * p2x));

    velB.v.x += mB * (p1x + p2x);
    velB.v.y += mB * (p1y + p2y);
    velB.w +=
      iB *
      (cp1.rB.x * p1y - cp1.rB.y * p1x + (cp2.rB.x * p2y - cp2.rB.y * p2x));

    cp1.normalImpulse = xx;
    cp2.normalImpulse = xy;
  }

  /**
   * @method storeImpulses
   * @description Writes the accumulated impulses back onto the manifold so the
   * next step can warm-start from them.
   */
  storeImpulses() {
    for (const vc of this.velocityConstraints) {
      const manifold = this.contacts[vc.contactIndex].manifold;
      for (let j = 0; j < vc.pointCount; j++) {
        manifold.points[j].normalImpulse = vc.points[j].normalImpulse;
        manifold.points[j].tangentImpulse = vc.points[j].tangentImpulse;
      }
    }
  }

  /**
   * @method solvePositionConstraints
   * @description Pushes overlapping bodies apart geometrically. This runs on
   * positions only, no velocity is added, so separating a deep overlap can't
   * fling bodies across the level.
   * @returns {boolean} - True once every overlap is within tolerance
   */
  solvePositionConstraints() {
    let minSeparation = 0;

    for (const pc of this.positionConstraints) {
      const posA = this.positions[pc.indexA];
      const posB = this.positions[pc.indexB];
      const mA = pc.invMassA;
      const iA = pc.invIA;
      const mB = pc.invMassB;
      const iB = pc.invIB;

      for (let j = 0; j < pc.pointCount; j++) {
        xfA.q.set(posA.a);
        xfB.q.set(posB.a);
        xfA.p.set(
          posA.c.x -
            (xfA.q.c * pc.localCenterA.x - xfA.q.s * pc.localCenterA.y),
          posA.c.y - (xfA.q.s * pc.localCenterA.x + xfA.q.c * pc.localCenterA.y)
        );
        xfB.p.set(
          posB.c.x -
            (xfB.q.c * pc.localCenterB.x - xfB.q.s * pc.localCenterB.y),
          posB.c.y - (xfB.q.s * pc.localCenterB.x + xfB.q.c * pc.localCenterB.y)
        );

        const psm = solverManifold(pc, xfA, xfB, j);
        const normal = psm.normal;
        const point = psm.point;
        const separation = psm.separation;

        const rAx = point.x - posA.c.x;
        const rAy = point.y - posA.c.y;
        const rBx = point.x - posB.c.x;
        const rBy = point.y - posB.c.y;

        if (separation < minSeparation) minSeparation = separation;

        const C = clamp(
          Settings.baumgarte * (separation + Settings.linearSlop),
          -Settings.maxLinearCorrection,
          0
        );

        const rnA = rAx * normal.y - rAy * normal.x;
        const rnB = rBx * normal.y - rBy * normal.x;
        const K = mA + mB + iA * rnA * rnA + iB * rnB * rnB;
        const impulse = K > 0 ? -C / K : 0;

        const px = impulse * normal.x;
        const py = impulse * normal.y;

        posA.c.x -= mA * px;
        posA.c.y -= mA * py;
        posA.a -= iA * (rAx * py - rAy * px);
        posB.c.x += mB * px;
        posB.c.y += mB * py;
        posB.a += iB * (rBx * py - rBy * px);
      }
    }

    return minSeparation >= -3 * Settings.linearSlop;
  }
}

const psmNormal = new Vec2();
const psmPoint = new Vec2();
const psmResult = { normal: psmNormal, point: psmPoint, separation: 0 };

/**
 * @function solverManifold
 * @description Rebuilds one contact point in world space from the position the
 * solver is currently proposing.
 * @private
 */
function solverManifold(pc, xfA, xfB, index) {
  switch (pc.type) {
    case ManifoldType.CIRCLES: {
      const pointA = Transform2.mulVec(xfA, pc.localPoint);
      const pointB = Transform2.mulVec(xfB, pc.localPoints[0]);
      psmNormal.set(pointB.x - pointA.x, pointB.y - pointA.y);
      psmNormal.normalize();
      psmPoint.set(0.5 * (pointA.x + pointB.x), 0.5 * (pointA.y + pointB.y));
      psmResult.separation =
        (pointB.x - pointA.x) * psmNormal.x +
        (pointB.y - pointA.y) * psmNormal.y -
        pc.radiusA -
        pc.radiusB;
      break;
    }
    case ManifoldType.FACE_A: {
      psmNormal.set(
        xfA.q.c * pc.localNormal.x - xfA.q.s * pc.localNormal.y,
        xfA.q.s * pc.localNormal.x + xfA.q.c * pc.localNormal.y
      );
      const planePoint = Transform2.mulVec(xfA, pc.localPoint);
      const clipPoint = Transform2.mulVec(xfB, pc.localPoints[index]);
      psmResult.separation =
        (clipPoint.x - planePoint.x) * psmNormal.x +
        (clipPoint.y - planePoint.y) * psmNormal.y -
        pc.radiusA -
        pc.radiusB;
      psmPoint.copy(clipPoint);
      break;
    }
    default: {
      psmNormal.set(
        xfB.q.c * pc.localNormal.x - xfB.q.s * pc.localNormal.y,
        xfB.q.s * pc.localNormal.x + xfB.q.c * pc.localNormal.y
      );
      const planePoint = Transform2.mulVec(xfB, pc.localPoint);
      const clipPoint = Transform2.mulVec(xfA, pc.localPoints[index]);
      psmResult.separation =
        (clipPoint.x - planePoint.x) * psmNormal.x +
        (clipPoint.y - planePoint.y) * psmNormal.y -
        pc.radiusA -
        pc.radiusB;
      psmPoint.copy(clipPoint);
      psmNormal.neg();
      break;
    }
  }
  return psmResult;
}

export default ContactSolver;
