import { Vec2, Transform2, EPSILON } from "./Math2D.js";
import { ShapeType } from "./Shapes.js";

/**
 * @class DistanceProxy
 * @description A convex shape reduced to what GJK needs: a point cloud plus a
 * skin radius. Circles collapse to a single point with a large radius; polygons
 * keep their corners and carry the small polygon skin.
 */
class DistanceProxy {
  constructor() {
    this.vertices = [];
    this.radius = 0;
  }

  /**
   * @method set
   * @description Fills this proxy from a shape.
   * @param {Shape} shape - A CircleShape or PolygonShape
   * @returns {DistanceProxy} - this
   */
  set(shape) {
    if (shape.type === ShapeType.CIRCLE) {
      this.vertices = [shape.p];
    } else {
      this.vertices = shape.vertices;
    }
    this.radius = shape.radius;
    return this;
  }

  /**
   * @method getSupport
   * @description Index of the vertex furthest along a direction.
   * @param {Object} d - Direction in the proxy's local frame
   * @returns {number}
   */
  getSupport(d) {
    let best = 0;
    let bestValue = this.vertices[0].x * d.x + this.vertices[0].y * d.y;
    for (let i = 1; i < this.vertices.length; i++) {
      const value = this.vertices[i].x * d.x + this.vertices[i].y * d.y;
      if (value > bestValue) {
        bestValue = value;
        best = i;
      }
    }
    return best;
  }

  /**
   * @method getMaxExtent
   * @description Distance from the local origin to the furthest vertex, plus
   * the skin. Continuous collision uses it to bound how fast a rotating body's
   * surface can approach another.
   * @returns {number}
   */
  getMaxExtent() {
    let maxSq = 0;
    for (const v of this.vertices) {
      const sq = v.x * v.x + v.y * v.y;
      if (sq > maxSq) maxSq = sq;
    }
    return Math.sqrt(maxSq) + this.radius;
  }
}

/**
 * @class SimplexVertex
 * @description One vertex of the GJK simplex: a point on the Minkowski
 * difference along with the witness points that produced it.
 * @private
 */
class SimplexVertex {
  constructor() {
    this.wA = new Vec2();
    this.wB = new Vec2();
    this.w = new Vec2();
    this.a = 0;
    this.indexA = 0;
    this.indexB = 0;
  }

  copy(other) {
    this.wA.copy(other.wA);
    this.wB.copy(other.wB);
    this.w.copy(other.w);
    this.a = other.a;
    this.indexA = other.indexA;
    this.indexB = other.indexB;
  }
}

/**
 * @class Simplex
 * @description The 1-, 2- or 3-point simplex GJK maintains while walking
 * towards the closest point on the Minkowski difference.
 * @private
 */
class Simplex {
  constructor() {
    this.v = [new SimplexVertex(), new SimplexVertex(), new SimplexVertex()];
    this.count = 0;
  }

  getSearchDirection() {
    switch (this.count) {
      case 1:
        return Vec2.neg(this.v[0].w);
      case 2: {
        const e12 = Vec2.sub(this.v[1].w, this.v[0].w);
        const sgn = Vec2.cross(e12, Vec2.neg(this.v[0].w));
        return sgn > 0 ? Vec2.crossSV(1, e12) : Vec2.crossVS(e12, 1);
      }
      default:
        return new Vec2(0, 0);
    }
  }

  getWitnessPoints(out) {
    switch (this.count) {
      case 1:
        out.pointA.copy(this.v[0].wA);
        out.pointB.copy(this.v[0].wB);
        break;
      case 2:
        out.pointA.set(
          this.v[0].a * this.v[0].wA.x + this.v[1].a * this.v[1].wA.x,
          this.v[0].a * this.v[0].wA.y + this.v[1].a * this.v[1].wA.y
        );
        out.pointB.set(
          this.v[0].a * this.v[0].wB.x + this.v[1].a * this.v[1].wB.x,
          this.v[0].a * this.v[0].wB.y + this.v[1].a * this.v[1].wB.y
        );
        break;
      case 3:
        out.pointA.set(
          this.v[0].a * this.v[0].wA.x +
            this.v[1].a * this.v[1].wA.x +
            this.v[2].a * this.v[2].wA.x,
          this.v[0].a * this.v[0].wA.y +
            this.v[1].a * this.v[1].wA.y +
            this.v[2].a * this.v[2].wA.y
        );
        out.pointB.copy(out.pointA);
        break;
      default:
        break;
    }
  }

  /**
   * @method solve2
   * @description Closest point on a line segment to the origin, expressed in
   * barycentric coordinates. Drops the vertex that isn't part of the answer.
   * @private
   */
  solve2() {
    const w1 = this.v[0].w;
    const w2 = this.v[1].w;
    const e12 = Vec2.sub(w2, w1);

    const d12_2 = -Vec2.dot(w1, e12);
    if (d12_2 <= 0) {
      this.v[0].a = 1;
      this.count = 1;
      return;
    }

    const d12_1 = Vec2.dot(w2, e12);
    if (d12_1 <= 0) {
      this.v[1].a = 1;
      this.count = 1;
      this.v[0].copy(this.v[1]);
      return;
    }

    const inv = 1 / (d12_1 + d12_2);
    this.v[0].a = d12_1 * inv;
    this.v[1].a = d12_2 * inv;
    this.count = 2;
  }

  /**
   * @method solve3
   * @description Closest point on a triangle to the origin. Reduces the simplex
   * to the feature (vertex, edge or the whole triangle) that owns it.
   * @private
   */
  solve3() {
    const w1 = this.v[0].w;
    const w2 = this.v[1].w;
    const w3 = this.v[2].w;

    const e12 = Vec2.sub(w2, w1);
    const w1e12 = Vec2.dot(w1, e12);
    const w2e12 = Vec2.dot(w2, e12);
    const d12_1 = w2e12;
    const d12_2 = -w1e12;

    const e13 = Vec2.sub(w3, w1);
    const w1e13 = Vec2.dot(w1, e13);
    const w3e13 = Vec2.dot(w3, e13);
    const d13_1 = w3e13;
    const d13_2 = -w1e13;

    const e23 = Vec2.sub(w3, w2);
    const w2e23 = Vec2.dot(w2, e23);
    const w3e23 = Vec2.dot(w3, e23);
    const d23_1 = w3e23;
    const d23_2 = -w2e23;

    const n123 = Vec2.cross(e12, e13);
    const d123_1 = n123 * Vec2.cross(w2, w3);
    const d123_2 = n123 * Vec2.cross(w3, w1);
    const d123_3 = n123 * Vec2.cross(w1, w2);

    if (d12_2 <= 0 && d13_2 <= 0) {
      this.v[0].a = 1;
      this.count = 1;
      return;
    }

    if (d12_1 > 0 && d12_2 > 0 && d123_3 <= 0) {
      const inv = 1 / (d12_1 + d12_2);
      this.v[0].a = d12_1 * inv;
      this.v[1].a = d12_2 * inv;
      this.count = 2;
      return;
    }

    if (d13_1 > 0 && d13_2 > 0 && d123_2 <= 0) {
      const inv = 1 / (d13_1 + d13_2);
      this.v[0].a = d13_1 * inv;
      this.v[2].a = d13_2 * inv;
      this.count = 2;
      this.v[1].copy(this.v[2]);
      return;
    }

    if (d12_1 <= 0 && d23_2 <= 0) {
      this.v[1].a = 1;
      this.count = 1;
      this.v[0].copy(this.v[1]);
      return;
    }

    if (d13_1 <= 0 && d23_1 <= 0) {
      this.v[2].a = 1;
      this.count = 1;
      this.v[0].copy(this.v[2]);
      return;
    }

    if (d23_1 > 0 && d23_2 > 0 && d123_1 <= 0) {
      const inv = 1 / (d23_1 + d23_2);
      this.v[1].a = d23_1 * inv;
      this.v[2].a = d23_2 * inv;
      this.count = 2;
      this.v[0].copy(this.v[2]);
      return;
    }

    const inv = 1 / (d123_1 + d123_2 + d123_3);
    this.v[0].a = d123_1 * inv;
    this.v[1].a = d123_2 * inv;
    this.v[2].a = d123_3 * inv;
    this.count = 3;
  }
}

const simplex = new Simplex();
const saveA = [0, 0, 0];
const saveB = [0, 0, 0];

/**
 * @function distance
 * @description GJK: computes the distance and the closest points between two
 * convex proxies. This is the primitive continuous collision and overlap tests
 * are built on.
 * @param {Object} output - Written as `{ distance, pointA, pointB, iterations }`
 * @param {Object} input - `{ proxyA, proxyB, transformA, transformB, useRadii }`
 * @returns {Object} - The same output object
 */
function distance(output, input) {
  const { proxyA, proxyB, transformA, transformB } = input;

  simplex.count = 1;
  const v0 = simplex.v[0];
  v0.indexA = 0;
  v0.indexB = 0;
  v0.wA.copy(Transform2.mulVec(transformA, proxyA.vertices[0]));
  v0.wB.copy(Transform2.mulVec(transformB, proxyB.vertices[0]));
  v0.w.set(v0.wB.x - v0.wA.x, v0.wB.y - v0.wA.y);
  v0.a = 1;

  let iter = 0;
  while (iter < 20) {
    const saveCount = simplex.count;
    for (let i = 0; i < saveCount; i++) {
      saveA[i] = simplex.v[i].indexA;
      saveB[i] = simplex.v[i].indexB;
    }

    if (simplex.count === 2) simplex.solve2();
    else if (simplex.count === 3) simplex.solve3();

    if (simplex.count === 3) break;

    const d = simplex.getSearchDirection();
    if (d.lengthSquared() < EPSILON * EPSILON) break;

    const vertex = simplex.v[simplex.count];
    vertex.indexA = proxyA.getSupport(
      rotateInverse(transformA, d.x * -1, d.y * -1)
    );
    vertex.wA.copy(
      Transform2.mulVec(transformA, proxyA.vertices[vertex.indexA])
    );
    vertex.indexB = proxyB.getSupport(rotateInverse(transformB, d.x, d.y));
    vertex.wB.copy(
      Transform2.mulVec(transformB, proxyB.vertices[vertex.indexB])
    );
    vertex.w.set(vertex.wB.x - vertex.wA.x, vertex.wB.y - vertex.wA.y);

    iter++;

    let duplicate = false;
    for (let i = 0; i < saveCount; i++) {
      if (vertex.indexA === saveA[i] && vertex.indexB === saveB[i]) {
        duplicate = true;
        break;
      }
    }
    if (duplicate) break;

    simplex.count++;
  }

  if (!output.pointA) output.pointA = new Vec2();
  if (!output.pointB) output.pointB = new Vec2();
  simplex.getWitnessPoints(output);
  output.distance = Vec2.distance(output.pointA, output.pointB);
  output.iterations = iter;

  if (input.useRadii) {
    const rA = proxyA.radius;
    const rB = proxyB.radius;
    if (output.distance > rA + rB && output.distance > EPSILON) {
      output.distance -= rA + rB;
      const normal = Vec2.sub(output.pointB, output.pointA);
      normal.normalize();
      output.pointA.addMul(rA, normal);
      output.pointB.subMul(rB, normal);
    } else {
      const px = 0.5 * (output.pointA.x + output.pointB.x);
      const py = 0.5 * (output.pointA.y + output.pointB.y);
      output.pointA.set(px, py);
      output.pointB.set(px, py);
      output.distance = 0;
    }
  }

  return output;
}

/**
 * @function rotateInverse
 * @description Rotates a world direction into a transform's local frame.
 * @private
 */
function rotateInverse(xf, x, y) {
  return new Vec2(xf.q.c * x + xf.q.s * y, -xf.q.s * x + xf.q.c * y);
}

const overlapProxyA = new DistanceProxy();
const overlapProxyB = new DistanceProxy();
const overlapOutput = { distance: 0, pointA: new Vec2(), pointB: new Vec2() };

/**
 * @function testOverlap
 * @description True when two shapes overlap under their transforms. Sensors use
 * this instead of building a manifold, since they never need contact points.
 * @param {Shape} shapeA
 * @param {Transform2} xfA
 * @param {Shape} shapeB
 * @param {Transform2} xfB
 * @returns {boolean}
 */
function testOverlap(shapeA, xfA, shapeB, xfB) {
  overlapProxyA.set(shapeA);
  overlapProxyB.set(shapeB);
  distance(overlapOutput, {
    proxyA: overlapProxyA,
    proxyB: overlapProxyB,
    transformA: xfA,
    transformB: xfB,
    useRadii: true,
  });
  return overlapOutput.distance < 10 * EPSILON;
}

export { DistanceProxy, distance, testOverlap };
