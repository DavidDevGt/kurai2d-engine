import { Vec2, Rot, Transform2, EPSILON } from "./Math2D.js";
import Settings from "./Settings.js";

/** @import { CircleShape, PolygonShape } from "./Shapes.js" */

/**
 * @enum {number} ManifoldType
 * @description How a manifold's reference frame is stored: either two circle
 * centers, or a reference face on body A or on body B.
 */
const ManifoldType = {
  CIRCLES: 0,
  FACE_A: 1,
  FACE_B: 2,
};

/**
 * @enum {number} ContactFeature
 * @description Whether a contact point came from a vertex or a face, used to
 * build the stable per-point id that carries impulses across steps.
 * @private
 */
const ContactFeature = {
  VERTEX: 0,
  FACE: 1,
};

/**
 * @function featureKey
 * @description Packs a contact feature into a single integer so warm starting
 * can match this step's points against the previous step's.
 * @private
 */
function featureKey(indexA, indexB, typeA, typeB) {
  return (
    (indexA & 0xff) | ((indexB & 0xff) << 8) | (typeA << 16) | (typeB << 17)
  );
}

/**
 * @class ManifoldPoint
 * @description A single contact point, stored in the reference body's local
 * frame so it stays valid as the bodies move within a step.
 */
class ManifoldPoint {
  constructor() {
    this.localPoint = new Vec2();
    this.normalImpulse = 0;
    this.tangentImpulse = 0;
    this.id = 0;
  }
}

/**
 * @class Manifold
 * @description Up to two contact points plus the frame they are expressed in.
 * Two points is all a 2D convex-convex overlap can produce, and it is exactly
 * what a stable resting contact (a box on the ground) needs.
 */
class Manifold {
  constructor() {
    this.type = ManifoldType.CIRCLES;
    this.localNormal = new Vec2();
    this.localPoint = new Vec2();
    this.points = [new ManifoldPoint(), new ManifoldPoint()];
    this.pointCount = 0;
  }

  /**
   * @method reset
   * @description Empties the manifold.
   */
  reset() {
    this.pointCount = 0;
  }
}

/**
 * @class WorldManifold
 * @description A manifold converted into world space: the collision normal
 * (always pointing from body A to body B), the contact points, and how deeply
 * each one is penetrating (negative means overlapping).
 */
class WorldManifold {
  constructor() {
    this.normal = new Vec2();
    this.points = [new Vec2(), new Vec2()];
    this.separations = [0, 0];
    this.pointCount = 0;
  }

  /**
   * @method initialize
   * @description Fills this world manifold from a local manifold.
   * @param {Manifold} manifold
   * @param {Transform2} xfA
   * @param {number} radiusA
   * @param {Transform2} xfB
   * @param {number} radiusB
   * @returns {WorldManifold} - this
   */
  initialize(manifold, xfA, radiusA, xfB, radiusB) {
    this.pointCount = manifold.pointCount;
    if (manifold.pointCount === 0) return this;

    switch (manifold.type) {
      case ManifoldType.CIRCLES: {
        this.normal.set(1, 0);
        const pointA = Transform2.mulVec(xfA, manifold.localPoint);
        const pointB = Transform2.mulVec(xfB, manifold.points[0].localPoint);
        if (Vec2.distanceSquared(pointA, pointB) > EPSILON * EPSILON) {
          this.normal.set(pointB.x - pointA.x, pointB.y - pointA.y);
          this.normal.normalize();
        }
        const cAx = pointA.x + radiusA * this.normal.x;
        const cAy = pointA.y + radiusA * this.normal.y;
        const cBx = pointB.x - radiusB * this.normal.x;
        const cBy = pointB.y - radiusB * this.normal.y;
        this.points[0].set(0.5 * (cAx + cBx), 0.5 * (cAy + cBy));
        this.separations[0] =
          (cBx - cAx) * this.normal.x + (cBy - cAy) * this.normal.y;
        break;
      }
      case ManifoldType.FACE_A: {
        this.normal.copy(Rot.mulVec(xfA.q, manifold.localNormal));
        const planePoint = Transform2.mulVec(xfA, manifold.localPoint);
        for (let i = 0; i < manifold.pointCount; i++) {
          const clip = Transform2.mulVec(xfB, manifold.points[i].localPoint);
          const s =
            radiusA -
            ((clip.x - planePoint.x) * this.normal.x +
              (clip.y - planePoint.y) * this.normal.y);
          const cAx = clip.x + s * this.normal.x;
          const cAy = clip.y + s * this.normal.y;
          const cBx = clip.x - radiusB * this.normal.x;
          const cBy = clip.y - radiusB * this.normal.y;
          this.points[i].set(0.5 * (cAx + cBx), 0.5 * (cAy + cBy));
          this.separations[i] =
            (cBx - cAx) * this.normal.x + (cBy - cAy) * this.normal.y;
        }
        break;
      }
      case ManifoldType.FACE_B: {
        this.normal.copy(Rot.mulVec(xfB.q, manifold.localNormal));
        const planePoint = Transform2.mulVec(xfB, manifold.localPoint);
        for (let i = 0; i < manifold.pointCount; i++) {
          const clip = Transform2.mulVec(xfA, manifold.points[i].localPoint);
          const s =
            radiusB -
            ((clip.x - planePoint.x) * this.normal.x +
              (clip.y - planePoint.y) * this.normal.y);
          const cBx = clip.x + s * this.normal.x;
          const cBy = clip.y + s * this.normal.y;
          const cAx = clip.x - radiusA * this.normal.x;
          const cAy = clip.y - radiusA * this.normal.y;
          this.points[i].set(0.5 * (cAx + cBx), 0.5 * (cAy + cBy));
          this.separations[i] =
            (cAx - cBx) * this.normal.x + (cAy - cBy) * this.normal.y;
        }
        this.normal.neg();
        break;
      }
      default:
        break;
    }
    return this;
  }
}

/**
 * @function mulTXf
 * @description Composes transforms: returns the transform of `B` expressed in
 * `A`'s frame.
 * @private
 */
function mulTXf(A, B) {
  const out = new Transform2();
  out.q.s = A.q.c * B.q.s - A.q.s * B.q.c;
  out.q.c = A.q.c * B.q.c + A.q.s * B.q.s;
  const px = B.p.x - A.p.x;
  const py = B.p.y - A.p.y;
  out.p.set(A.q.c * px + A.q.s * py, -A.q.s * px + A.q.c * py);
  return out;
}

/**
 * @function collideCircles
 * @description Builds the manifold for two circles.
 * @param {Manifold} manifold - Output manifold
 * @param {CircleShape} circleA
 * @param {Transform2} xfA
 * @param {CircleShape} circleB
 * @param {Transform2} xfB
 */
function collideCircles(manifold, circleA, xfA, circleB, xfB) {
  manifold.pointCount = 0;

  const pA = Transform2.mulVec(xfA, circleA.p);
  const pB = Transform2.mulVec(xfB, circleB.p);
  const distSqr = Vec2.distanceSquared(pA, pB);
  const radius = circleA.radius + circleB.radius;
  if (distSqr > radius * radius) return;

  manifold.type = ManifoldType.CIRCLES;
  manifold.localPoint.copy(circleA.p);
  manifold.localNormal.setZero();
  manifold.pointCount = 1;
  manifold.points[0].localPoint.copy(circleB.p);
  manifold.points[0].id = 0;
}

/**
 * @function collidePolygonAndCircle
 * @description Builds the manifold for a polygon against a circle. The circle
 * is pushed into the polygon's frame, then tested against the closest face,
 * falling back to the nearest corner when it sits past the face's edge.
 * @param {Manifold} manifold - Output manifold
 * @param {PolygonShape} polygonA
 * @param {Transform2} xfA
 * @param {CircleShape} circleB
 * @param {Transform2} xfB
 */
function collidePolygonAndCircle(manifold, polygonA, xfA, circleB, xfB) {
  manifold.pointCount = 0;

  const c = Transform2.mulVec(xfB, circleB.p);
  const cLocal = Transform2.mulTVec(xfA, c);

  let normalIndex = 0;
  let separation = -Number.MAX_VALUE;
  const radius = polygonA.radius + circleB.radius;
  const vertexCount = polygonA.vertices.length;
  const vertices = polygonA.vertices;
  const normals = polygonA.normals;

  for (let i = 0; i < vertexCount; i++) {
    const s =
      normals[i].x * (cLocal.x - vertices[i].x) +
      normals[i].y * (cLocal.y - vertices[i].y);
    if (s > radius) return;
    if (s > separation) {
      separation = s;
      normalIndex = i;
    }
  }

  const vertIndex1 = normalIndex;
  const vertIndex2 = vertIndex1 + 1 < vertexCount ? vertIndex1 + 1 : 0;
  const v1 = vertices[vertIndex1];
  const v2 = vertices[vertIndex2];

  if (separation < EPSILON) {
    manifold.pointCount = 1;
    manifold.type = ManifoldType.FACE_A;
    manifold.localNormal.copy(normals[normalIndex]);
    manifold.localPoint.set(0.5 * (v1.x + v2.x), 0.5 * (v1.y + v2.y));
    manifold.points[0].localPoint.copy(circleB.p);
    manifold.points[0].id = 0;
    return;
  }

  const u1 =
    (cLocal.x - v1.x) * (v2.x - v1.x) + (cLocal.y - v1.y) * (v2.y - v1.y);
  const u2 =
    (cLocal.x - v2.x) * (v1.x - v2.x) + (cLocal.y - v2.y) * (v1.y - v2.y);

  if (u1 <= 0) {
    if (Vec2.distanceSquared(cLocal, v1) > radius * radius) return;
    manifold.pointCount = 1;
    manifold.type = ManifoldType.FACE_A;
    manifold.localNormal.set(cLocal.x - v1.x, cLocal.y - v1.y);
    manifold.localNormal.normalize();
    manifold.localPoint.copy(v1);
  } else if (u2 <= 0) {
    if (Vec2.distanceSquared(cLocal, v2) > radius * radius) return;
    manifold.pointCount = 1;
    manifold.type = ManifoldType.FACE_A;
    manifold.localNormal.set(cLocal.x - v2.x, cLocal.y - v2.y);
    manifold.localNormal.normalize();
    manifold.localPoint.copy(v2);
  } else {
    const faceCenterX = 0.5 * (v1.x + v2.x);
    const faceCenterY = 0.5 * (v1.y + v2.y);
    const s =
      (cLocal.x - faceCenterX) * normals[vertIndex1].x +
      (cLocal.y - faceCenterY) * normals[vertIndex1].y;
    if (s > radius) return;
    manifold.pointCount = 1;
    manifold.type = ManifoldType.FACE_A;
    manifold.localNormal.copy(normals[vertIndex1]);
    manifold.localPoint.set(faceCenterX, faceCenterY);
  }

  manifold.points[0].localPoint.copy(circleB.p);
  manifold.points[0].id = 0;
}

/**
 * @function findMaxSeparation
 * @description Separating-axis test: finds the face of `poly1` that pushes
 * `poly2` furthest away, and how far.
 * @returns {{separation:number, edgeIndex:number}}
 * @private
 */
function findMaxSeparation(poly1, xf1, poly2, xf2) {
  const count1 = poly1.vertices.length;
  const count2 = poly2.vertices.length;
  const n1s = poly1.normals;
  const v1s = poly1.vertices;
  const v2s = poly2.vertices;
  const xf = mulTXf(xf2, xf1);

  let bestIndex = 0;
  let maxSeparation = -Number.MAX_VALUE;

  for (let i = 0; i < count1; i++) {
    const n = Rot.mulVec(xf.q, n1s[i]);
    const v1 = Transform2.mulVec(xf, v1s[i]);

    let si = Number.MAX_VALUE;
    for (let j = 0; j < count2; j++) {
      const sij = n.x * (v2s[j].x - v1.x) + n.y * (v2s[j].y - v1.y);
      if (sij < si) si = sij;
    }

    if (si > maxSeparation) {
      maxSeparation = si;
      bestIndex = i;
    }
  }

  return { separation: maxSeparation, edgeIndex: bestIndex };
}

/**
 * @function findIncidentEdge
 * @description Picks the edge of `poly2` most anti-parallel to the reference
 * face: the edge that is actually being pressed into it.
 * @private
 */
function findIncidentEdge(poly1, xf1, edge1, poly2, xf2) {
  const normals1 = poly1.normals;
  const count2 = poly2.vertices.length;
  const vertices2 = poly2.vertices;
  const normals2 = poly2.normals;

  const normal1World = Rot.mulVec(xf1.q, normals1[edge1]);
  const normal1 = Rot.mulTVec(xf2.q, normal1World);

  let index = 0;
  let minDot = Number.MAX_VALUE;
  for (let i = 0; i < count2; i++) {
    const dot = normal1.x * normals2[i].x + normal1.y * normals2[i].y;
    if (dot < minDot) {
      minDot = dot;
      index = i;
    }
  }

  const i1 = index;
  const i2 = i1 + 1 < count2 ? i1 + 1 : 0;

  return [
    {
      v: Transform2.mulVec(xf2, vertices2[i1]),
      indexA: edge1,
      indexB: i1,
      typeA: ContactFeature.FACE,
      typeB: ContactFeature.VERTEX,
    },
    {
      v: Transform2.mulVec(xf2, vertices2[i2]),
      indexA: edge1,
      indexB: i2,
      typeA: ContactFeature.FACE,
      typeB: ContactFeature.VERTEX,
    },
  ];
}

/**
 * @function clipSegmentToLine
 * @description Sutherland-Hodgman clip of the incident edge against one side
 * plane of the reference face.
 * @returns {Array} - The surviving 0..2 clip vertices
 * @private
 */
function clipSegmentToLine(vIn, normal, offset, vertexIndexA) {
  const vOut = [];

  const d0 = normal.x * vIn[0].v.x + normal.y * vIn[0].v.y - offset;
  const d1 = normal.x * vIn[1].v.x + normal.y * vIn[1].v.y - offset;

  if (d0 <= 0) vOut.push(vIn[0]);
  if (d1 <= 0) vOut.push(vIn[1]);

  if (d0 * d1 < 0) {
    const interp = d0 / (d0 - d1);
    vOut.push({
      v: new Vec2(
        vIn[0].v.x + interp * (vIn[1].v.x - vIn[0].v.x),
        vIn[0].v.y + interp * (vIn[1].v.y - vIn[0].v.y)
      ),
      indexA: vertexIndexA,
      indexB: vIn[0].indexB,
      typeA: ContactFeature.VERTEX,
      typeB: ContactFeature.FACE,
    });
  }

  return vOut;
}

/**
 * @function collidePolygons
 * @description Builds the manifold for two convex polygons using the
 * separating-axis test to pick a reference face, then clipping the opposing
 * (incident) edge against it. The result is the one- or two-point contact patch
 * that makes boxes rest flat instead of rocking.
 * @param {Manifold} manifold - Output manifold
 * @param {PolygonShape} polyA
 * @param {Transform2} xfA
 * @param {PolygonShape} polyB
 * @param {Transform2} xfB
 */
function collidePolygons(manifold, polyA, xfA, polyB, xfB) {
  manifold.pointCount = 0;
  const totalRadius = polyA.radius + polyB.radius;

  const edgeA = findMaxSeparation(polyA, xfA, polyB, xfB);
  if (edgeA.separation > totalRadius) return;

  const edgeB = findMaxSeparation(polyB, xfB, polyA, xfA);
  if (edgeB.separation > totalRadius) return;

  let poly1;
  let poly2;
  let xf1;
  let xf2;
  let edge1;
  let flip;

  const tol = 0.1 * Settings.linearSlop;
  if (edgeB.separation > edgeA.separation + tol) {
    poly1 = polyB;
    poly2 = polyA;
    xf1 = xfB;
    xf2 = xfA;
    edge1 = edgeB.edgeIndex;
    manifold.type = ManifoldType.FACE_B;
    flip = true;
  } else {
    poly1 = polyA;
    poly2 = polyB;
    xf1 = xfA;
    xf2 = xfB;
    edge1 = edgeA.edgeIndex;
    manifold.type = ManifoldType.FACE_A;
    flip = false;
  }

  const incidentEdge = findIncidentEdge(poly1, xf1, edge1, poly2, xf2);

  const count1 = poly1.vertices.length;
  const iv1 = edge1;
  const iv2 = edge1 + 1 < count1 ? edge1 + 1 : 0;

  let v11 = poly1.vertices[iv1];
  let v12 = poly1.vertices[iv2];

  const localTangent = Vec2.sub(v12, v11);
  localTangent.normalize();
  const localNormal = new Vec2(localTangent.y, -localTangent.x);
  const planePoint = new Vec2(0.5 * (v11.x + v12.x), 0.5 * (v11.y + v12.y));

  const tangent = Rot.mulVec(xf1.q, localTangent);
  const normal = new Vec2(tangent.y, -tangent.x);

  v11 = Transform2.mulVec(xf1, v11);
  v12 = Transform2.mulVec(xf1, v12);

  const frontOffset = normal.x * v11.x + normal.y * v11.y;
  const sideOffset1 = -(tangent.x * v11.x + tangent.y * v11.y) + totalRadius;
  const sideOffset2 = tangent.x * v12.x + tangent.y * v12.y + totalRadius;

  const clip1 = clipSegmentToLine(
    incidentEdge,
    Vec2.neg(tangent),
    sideOffset1,
    iv1
  );
  if (clip1.length < 2) return;

  const clip2 = clipSegmentToLine(clip1, tangent, sideOffset2, iv2);
  if (clip2.length < 2) return;

  manifold.localNormal.copy(localNormal);
  manifold.localPoint.copy(planePoint);

  let pointCount = 0;
  for (let i = 0; i < 2; i++) {
    const separation =
      normal.x * clip2[i].v.x + normal.y * clip2[i].v.y - frontOffset;
    if (separation <= totalRadius) {
      const cp = manifold.points[pointCount];
      cp.localPoint.copy(Transform2.mulTVec(xf2, clip2[i].v));
      cp.id = flip
        ? featureKey(
            clip2[i].indexB,
            clip2[i].indexA,
            clip2[i].typeB,
            clip2[i].typeA
          )
        : featureKey(
            clip2[i].indexA,
            clip2[i].indexB,
            clip2[i].typeA,
            clip2[i].typeB
          );
      pointCount++;
    }
  }

  manifold.pointCount = pointCount;
}

export {
  Manifold,
  ManifoldPoint,
  ManifoldType,
  WorldManifold,
  collideCircles,
  collidePolygonAndCircle,
  collidePolygons,
  mulTXf,
};
