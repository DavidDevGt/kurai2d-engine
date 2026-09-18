import { Vec2 } from "./Math2D.js";

/**
 * @class AABB
 * @description An axis-aligned bounding box in physics space. Used by the
 * broadphase to reject pairs long before any real collision maths runs.
 */
class AABB {
  constructor(lowerX = 0, lowerY = 0, upperX = 0, upperY = 0) {
    this.lowerBound = new Vec2(lowerX, lowerY);
    this.upperBound = new Vec2(upperX, upperY);
  }

  /**
   * @method set
   * @description Sets all four bounds in place.
   * @param {number} lx
   * @param {number} ly
   * @param {number} ux
   * @param {number} uy
   * @returns {AABB} - this
   */
  set(lx, ly, ux, uy) {
    this.lowerBound.set(lx, ly);
    this.upperBound.set(ux, uy);
    return this;
  }

  /**
   * @method copy
   * @description Copies another AABB.
   * @param {AABB} other
   * @returns {AABB} - this
   */
  copy(other) {
    this.lowerBound.copy(other.lowerBound);
    this.upperBound.copy(other.upperBound);
    return this;
  }

  /**
   * @method getCenter
   * @description Returns the box center.
   * @returns {Vec2}
   */
  getCenter() {
    return new Vec2(
      0.5 * (this.lowerBound.x + this.upperBound.x),
      0.5 * (this.lowerBound.y + this.upperBound.y)
    );
  }

  /**
   * @method getExtents
   * @description Returns the box half-extents.
   * @returns {Vec2}
   */
  getExtents() {
    return new Vec2(
      0.5 * (this.upperBound.x - this.lowerBound.x),
      0.5 * (this.upperBound.y - this.lowerBound.y)
    );
  }

  /**
   * @method getPerimeter
   * @description Perimeter of the box, the cost function the AABB tree
   * minimizes when choosing where to insert a leaf.
   * @returns {number}
   */
  getPerimeter() {
    return (
      2 *
      (this.upperBound.x -
        this.lowerBound.x +
        (this.upperBound.y - this.lowerBound.y))
    );
  }

  /**
   * @method combine
   * @description Sets this box to the union of two others.
   * @param {AABB} a
   * @param {AABB} b
   * @returns {AABB} - this
   */
  combine(a, b) {
    this.lowerBound.x = Math.min(a.lowerBound.x, b.lowerBound.x);
    this.lowerBound.y = Math.min(a.lowerBound.y, b.lowerBound.y);
    this.upperBound.x = Math.max(a.upperBound.x, b.upperBound.x);
    this.upperBound.y = Math.max(a.upperBound.y, b.upperBound.y);
    return this;
  }

  /**
   * @method extend
   * @description Grows the box by `amount` on every side.
   * @param {number} amount
   * @returns {AABB} - this
   */
  extend(amount) {
    this.lowerBound.x -= amount;
    this.lowerBound.y -= amount;
    this.upperBound.x += amount;
    this.upperBound.y += amount;
    return this;
  }

  /**
   * @method contains
   * @description True when `other` lies entirely inside this box.
   * @param {AABB} other
   * @returns {boolean}
   */
  contains(other) {
    return (
      this.lowerBound.x <= other.lowerBound.x &&
      this.lowerBound.y <= other.lowerBound.y &&
      other.upperBound.x <= this.upperBound.x &&
      other.upperBound.y <= this.upperBound.y
    );
  }

  /**
   * @method containsPoint
   * @description True when a point lies inside this box.
   * @param {Object} p - `{ x, y }`
   * @returns {boolean}
   */
  containsPoint(p) {
    return (
      this.lowerBound.x <= p.x &&
      p.x <= this.upperBound.x &&
      this.lowerBound.y <= p.y &&
      p.y <= this.upperBound.y
    );
  }

  /**
   * @method testOverlap
   * @description True when two boxes overlap.
   * @param {AABB} a
   * @param {AABB} b
   * @returns {boolean}
   */
  static testOverlap(a, b) {
    return !(
      b.lowerBound.x - a.upperBound.x > 0 ||
      b.lowerBound.y - a.upperBound.y > 0 ||
      a.lowerBound.x - b.upperBound.x > 0 ||
      a.lowerBound.y - b.upperBound.y > 0
    );
  }

  /**
   * @method rayCast
   * @description Slab test of a ray against this box.
   * @param {Object} input - `{ p1, p2, maxFraction }`
   * @returns {boolean} - True if the ray hits the box within maxFraction
   */
  rayCast(input) {
    let tmin = -Number.MAX_VALUE;
    let tmax = Number.MAX_VALUE;

    const p = input.p1;
    const dx = input.p2.x - input.p1.x;
    const dy = input.p2.y - input.p1.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 1e-12) {
      if (p.x < this.lowerBound.x || this.upperBound.x < p.x) return false;
    } else {
      const invD = 1 / dx;
      let t1 = (this.lowerBound.x - p.x) * invD;
      let t2 = (this.upperBound.x - p.x) * invD;
      if (t1 > t2) {
        const t = t1;
        t1 = t2;
        t2 = t;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    if (absDy < 1e-12) {
      if (p.y < this.lowerBound.y || this.upperBound.y < p.y) return false;
    } else {
      const invD = 1 / dy;
      let t1 = (this.lowerBound.y - p.y) * invD;
      let t2 = (this.upperBound.y - p.y) * invD;
      if (t1 > t2) {
        const t = t1;
        t1 = t2;
        t2 = t;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    return tmax >= 0 && tmin <= (input.maxFraction ?? 1);
  }
}

export default AABB;
