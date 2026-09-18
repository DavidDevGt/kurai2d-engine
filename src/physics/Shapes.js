import { Vec2, Rot, Transform2, EPSILON } from "./Math2D.js";
import Settings from "./Settings.js";
import AABB from "./AABB.js";

/**
 * @enum ShapeType
 * @description The shape kinds the narrowphase knows how to collide.
 */
const ShapeType = {
  CIRCLE: "circle",
  POLYGON: "polygon",
};

/**
 * @class Shape
 * @description Base class for collision shapes. A shape is pure geometry in a
 * body's local frame: it carries no position of its own and can be shared
 * between fixtures.
 */
class Shape {
  constructor(type, radius) {
    this.type = type;
    this.radius = radius;
  }

  /**
   * @method getType
   * @description Returns the shape type ("circle" or "polygon").
   * @returns {string}
   */
  getType() {
    return this.type;
  }

  /**
   * @method getRadius
   * @description Returns the shape's skin radius.
   * @returns {number}
   */
  getRadius() {
    return this.radius;
  }
}

/**
 * @class CircleShape
 * @extends Shape
 * @description A circle, optionally offset from the body origin.
 * @param {number} [radius=0] - Radius in physics units
 * @param {Object} [center] - Local center `{ x, y }`, defaults to the origin
 */
class CircleShape extends Shape {
  constructor(radius = 0, center = null) {
    super(ShapeType.CIRCLE, radius);
    this.p = center ? new Vec2(center) : new Vec2(0, 0);
  }

  /**
   * @method getVertexCount
   * @description A circle is a single-point proxy plus a radius.
   * @returns {number}
   */
  getVertexCount() {
    return 1;
  }

  /**
   * @method getVertex
   * @description Returns the circle's local center (its only support point).
   * @returns {Vec2}
   */
  getVertex() {
    return this.p;
  }

  /**
   * @method getSupport
   * @description Index of the vertex furthest along a direction (always 0).
   * @returns {number}
   */
  getSupport() {
    return 0;
  }

  /**
   * @method computeAABB
   * @description Writes this shape's world AABB under a transform.
   * @param {AABB} aabb - Output box
   * @param {Transform2} xf - The owning body's transform
   */
  computeAABB(aabb, xf) {
    const px = xf.q.c * this.p.x - xf.q.s * this.p.y + xf.p.x;
    const py = xf.q.s * this.p.x + xf.q.c * this.p.y + xf.p.y;
    aabb.set(
      px - this.radius,
      py - this.radius,
      px + this.radius,
      py + this.radius
    );
  }

  /**
   * @method computeMass
   * @description Writes mass, center and rotational inertia for a density.
   * @param {Object} massData - Output `{ mass, center, I }`
   * @param {number} density
   */
  computeMass(massData, density) {
    massData.mass = density * Math.PI * this.radius * this.radius;
    massData.center = this.p.clone();
    massData.I =
      massData.mass *
      (0.5 * this.radius * this.radius + Vec2.dot(this.p, this.p));
  }

  /**
   * @method testPoint
   * @description True when a world point is inside the circle.
   * @param {Transform2} xf
   * @param {Object} p - World point
   * @returns {boolean}
   */
  testPoint(xf, p) {
    const cx = xf.q.c * this.p.x - xf.q.s * this.p.y + xf.p.x;
    const cy = xf.q.s * this.p.x + xf.q.c * this.p.y + xf.p.y;
    const dx = p.x - cx;
    const dy = p.y - cy;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  /**
   * @method rayCast
   * @description Casts a ray against the circle.
   * @param {Object} output - Written as `{ fraction, normal }` on a hit
   * @param {Object} input - `{ p1, p2, maxFraction }` in world space
   * @param {Transform2} xf
   * @returns {boolean} - Whether the ray hit
   */
  rayCast(output, input, xf) {
    const posX = xf.q.c * this.p.x - xf.q.s * this.p.y + xf.p.x;
    const posY = xf.q.s * this.p.x + xf.q.c * this.p.y + xf.p.y;

    const sx = input.p1.x - posX;
    const sy = input.p1.y - posY;
    const b = sx * sx + sy * sy - this.radius * this.radius;

    const rx = input.p2.x - input.p1.x;
    const ry = input.p2.y - input.p1.y;
    const c = sx * rx + sy * ry;
    const rr = rx * rx + ry * ry;
    const sigma = c * c - rr * b;

    if (sigma < 0 || rr < EPSILON) return false;

    let a = -(c + Math.sqrt(sigma));
    if (a < 0 || a > input.maxFraction * rr) return false;

    a /= rr;
    output.fraction = a;
    const nx = sx + a * rx;
    const ny = sy + a * ry;
    const len = Math.hypot(nx, ny) || 1;
    output.normal = new Vec2(nx / len, ny / len);
    return true;
  }
}

/**
 * @class PolygonShape
 * @extends Shape
 * @description A convex polygon with up to `MAX_VERTICES` corners, wound
 * counter-clockwise. Boxes, by far the common case, come from
 * {@link PolygonShape.box}.
 * @param {Array<Object>} [points] - Optional points to build a convex hull from
 */
class PolygonShape extends Shape {
  constructor(points = null) {
    super(ShapeType.POLYGON, Settings.polygonRadius);
    this.vertices = [];
    this.normals = [];
    this.centroid = new Vec2(0, 0);
    if (points) this.set(points);
  }

  /**
   * @method box
   * @description Builds an axis-aligned box from half-extents, optionally
   * offset and rotated in the body's local frame.
   * @param {number} hx - Half width
   * @param {number} hy - Half height
   * @param {Object} [center] - Local center `{ x, y }`
   * @param {number} [angle=0] - Local rotation in radians
   * @returns {PolygonShape}
   */
  static box(hx, hy, center = null, angle = 0) {
    const shape = new PolygonShape();
    shape.setAsBox(hx, hy, center, angle);
    return shape;
  }

  /**
   * @method setAsBox
   * @description Turns this polygon into a box in place.
   * @param {number} hx - Half width
   * @param {number} hy - Half height
   * @param {Object} [center] - Local center `{ x, y }`
   * @param {number} [angle=0] - Local rotation in radians
   * @returns {PolygonShape} - this
   */
  setAsBox(hx, hy, center = null, angle = 0) {
    this.vertices = [
      new Vec2(-hx, -hy),
      new Vec2(hx, -hy),
      new Vec2(hx, hy),
      new Vec2(-hx, hy),
    ];
    this.normals = [
      new Vec2(0, -1),
      new Vec2(1, 0),
      new Vec2(0, 1),
      new Vec2(-1, 0),
    ];
    this.centroid.setZero();

    if (center) {
      const c = new Vec2(center);
      const xf = new Transform2();
      xf.set(c, angle);
      for (let i = 0; i < this.vertices.length; i++) {
        this.vertices[i] = Transform2.mulVec(xf, this.vertices[i]);
        this.normals[i] = Rot.mulVec(xf.q, this.normals[i]);
      }
      this.centroid.copy(c);
    }
    return this;
  }

  /**
   * @method set
   * @description Builds the convex hull of a point cloud. Points inside the
   * hull are dropped, so callers can pass a rough outline.
   * @param {Array<Object>} points - `{ x, y }` points
   * @returns {PolygonShape} - this
   */
  set(points) {
    const hull = computeHull(points);
    if (hull.length < 3) {
      throw new Error("[Physics] A polygon needs at least 3 distinct points.");
    }
    this.vertices = hull;
    this.normals = [];
    for (let i = 0; i < hull.length; i++) {
      const next = hull[(i + 1) % hull.length];
      const edge = Vec2.sub(next, hull[i]);
      if (edge.lengthSquared() <= EPSILON * EPSILON) {
        throw new Error("[Physics] Polygon has a degenerate edge.");
      }
      const normal = new Vec2(edge.y, -edge.x);
      normal.normalize();
      this.normals.push(normal);
    }
    this.centroid = computeCentroid(hull);
    return this;
  }

  /**
   * @method getVertexCount
   * @description Number of corners.
   * @returns {number}
   */
  getVertexCount() {
    return this.vertices.length;
  }

  /**
   * @method getVertex
   * @description Returns a corner by index.
   * @param {number} index
   * @returns {Vec2}
   */
  getVertex(index) {
    return this.vertices[index];
  }

  /**
   * @method getSupport
   * @description Index of the vertex furthest along a local direction: the
   * support function GJK is built on.
   * @param {Object} d - Local direction
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
   * @method computeAABB
   * @description Writes this shape's world AABB under a transform.
   * @param {AABB} aabb - Output box
   * @param {Transform2} xf
   */
  computeAABB(aabb, xf) {
    let lowerX = Infinity;
    let lowerY = Infinity;
    let upperX = -Infinity;
    let upperY = -Infinity;
    for (const v of this.vertices) {
      const x = xf.q.c * v.x - xf.q.s * v.y + xf.p.x;
      const y = xf.q.s * v.x + xf.q.c * v.y + xf.p.y;
      if (x < lowerX) lowerX = x;
      if (y < lowerY) lowerY = y;
      if (x > upperX) upperX = x;
      if (y > upperY) upperY = y;
    }
    aabb.set(
      lowerX - this.radius,
      lowerY - this.radius,
      upperX + this.radius,
      upperY + this.radius
    );
  }

  /**
   * @method computeMass
   * @description Writes mass, center and rotational inertia for a density by
   * summing the triangle fan of the polygon.
   * @param {Object} massData - Output `{ mass, center, I }`
   * @param {number} density
   */
  computeMass(massData, density) {
    const count = this.vertices.length;
    let area = 0;
    let I = 0;
    const center = new Vec2(0, 0);
    const inv3 = 1 / 3;

    const ref = this.vertices[0];
    for (let i = 1; i < count - 1; i++) {
      const e1 = Vec2.sub(this.vertices[i], ref);
      const e2 = Vec2.sub(this.vertices[i + 1], ref);
      const D = Vec2.cross(e1, e2);
      const triangleArea = 0.5 * D;
      area += triangleArea;

      center.x += triangleArea * inv3 * (e1.x + e2.x);
      center.y += triangleArea * inv3 * (e1.y + e2.y);

      const intx2 = e1.x * e1.x + e2.x * e1.x + e2.x * e2.x;
      const inty2 = e1.y * e1.y + e2.y * e1.y + e2.y * e2.y;
      I += 0.25 * inv3 * D * (intx2 + inty2);
    }

    massData.mass = density * area;

    if (area > EPSILON) {
      center.mul(1 / area);
    }
    massData.center = Vec2.add(ref, center);

    I *= density;
    I +=
      massData.mass *
      (Vec2.dot(massData.center, massData.center) - Vec2.dot(center, center));
    massData.I = I;
  }

  /**
   * @method testPoint
   * @description True when a world point is inside the polygon.
   * @param {Transform2} xf
   * @param {Object} p - World point
   * @returns {boolean}
   */
  testPoint(xf, p) {
    const local = Transform2.mulTVec(xf, p);
    for (let i = 0; i < this.vertices.length; i++) {
      const dot =
        this.normals[i].x * (local.x - this.vertices[i].x) +
        this.normals[i].y * (local.y - this.vertices[i].y);
      if (dot > 0) return false;
    }
    return true;
  }

  /**
   * @method rayCast
   * @description Casts a ray against the polygon by clipping it against every
   * edge plane and keeping the surviving interval.
   * @param {Object} output - Written as `{ fraction, normal }` on a hit
   * @param {Object} input - `{ p1, p2, maxFraction }` in world space
   * @param {Transform2} xf
   * @returns {boolean}
   */
  rayCast(output, input, xf) {
    const p1 = Transform2.mulTVec(xf, input.p1);
    const p2 = Transform2.mulTVec(xf, input.p2);
    const d = Vec2.sub(p2, p1);

    let lower = 0;
    let upper = input.maxFraction;
    let index = -1;

    for (let i = 0; i < this.vertices.length; i++) {
      const numerator = Vec2.dot(
        this.normals[i],
        Vec2.sub(this.vertices[i], p1)
      );
      const denominator = Vec2.dot(this.normals[i], d);

      if (denominator === 0) {
        if (numerator < 0) return false;
      } else {
        const t = numerator / denominator;
        if (denominator < 0 && t > lower) {
          lower = t;
          index = i;
        } else if (denominator > 0 && t < upper) {
          upper = t;
        }
      }

      if (upper < lower) return false;
    }

    if (index >= 0) {
      output.fraction = lower;
      output.normal = Rot.mulVec(xf.q, this.normals[index]);
      return true;
    }
    return false;
  }
}

/**
 * @function computeHull
 * @description Monotone-chain convex hull, counter-clockwise, with duplicate
 * and near-collinear points removed.
 * @param {Array<Object>} points
 * @returns {Array<Vec2>}
 * @private
 */
function computeHull(points) {
  const unique = [];
  for (const p of points) {
    const v = new Vec2(p);
    let duplicate = false;
    for (const u of unique) {
      if (Vec2.distanceSquared(u, v) < 0.25 * Settings.linearSlop ** 2) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) unique.push(v);
  }
  if (unique.length < 3) return unique;

  unique.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const cross = (o, a, b) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower = [];
  for (const p of unique) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = unique.length - 1; i >= 0; i--) {
    const p = unique[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * @function computeCentroid
 * @description Area-weighted centroid of a convex polygon.
 * @param {Array<Vec2>} vertices
 * @returns {Vec2}
 * @private
 */
function computeCentroid(vertices) {
  const c = new Vec2(0, 0);
  let area = 0;
  const inv3 = 1 / 3;
  const ref = vertices[0];

  for (let i = 1; i < vertices.length - 1; i++) {
    const e1 = Vec2.sub(vertices[i], ref);
    const e2 = Vec2.sub(vertices[i + 1], ref);
    const triangleArea = 0.5 * Vec2.cross(e1, e2);
    area += triangleArea;
    c.x += triangleArea * inv3 * (e1.x + e2.x);
    c.y += triangleArea * inv3 * (e1.y + e2.y);
  }

  if (area > EPSILON) c.mul(1 / area);
  return Vec2.add(ref, c);
}

/**
 * @function Box
 * @description Convenience factory for a box polygon.
 * @param {number} hx - Half width in physics units
 * @param {number} hy - Half height in physics units
 * @param {Object} [center] - Local center `{ x, y }`
 * @param {number} [angle=0] - Local rotation in radians
 * @returns {PolygonShape}
 */
function Box(hx, hy, center = null, angle = 0) {
  return PolygonShape.box(hx, hy, center, angle);
}

/**
 * @function Circle
 * @description Convenience factory for a circle shape.
 * @param {number} radius - Radius in physics units
 * @param {Object} [center] - Local center `{ x, y }`
 * @returns {CircleShape}
 */
function Circle(radius, center = null) {
  return new CircleShape(radius, center);
}

export { Shape, ShapeType, CircleShape, PolygonShape, Box, Circle, AABB };
