/**
 * @file Math primitives for the Emerald physics engine.
 * @description Everything here works in *physics units* (meters, radians), not
 * world/pixel units. The conversion happens in {@link Physics} and
 * {@link RigidBody}, so nothing below ever needs to know about the pixel scale.
 */

/**
 * @class Vec2
 * @description A 2D vector in physics space. Instance methods mutate in place
 * (used in the hot solver paths); the statics allocate a new vector. Accepts
 * either two numbers or any `{ x, y }` object.
 * @param {number|Object} [x=0] - The x coordinate, or an `{ x, y }` object
 * @param {number} [y=0] - The y coordinate
 */
class Vec2 {
  constructor(x = 0, y = 0) {
    if (typeof x === "object" && x !== null) {
      this.x = x.x || 0;
      this.y = x.y || 0;
    } else {
      this.x = x;
      this.y = y;
    }
  }

  /**
   * @method set
   * @description Sets both components in place.
   * @param {number} x
   * @param {number} y
   * @returns {Vec2} - this
   */
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * @method copy
   * @description Copies another vector's components into this one.
   * @param {Object} v - Any `{ x, y }`
   * @returns {Vec2} - this
   */
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  /**
   * @method clone
   * @description Returns an independent copy.
   * @returns {Vec2}
   */
  clone() {
    return new Vec2(this.x, this.y);
  }

  /**
   * @method setZero
   * @description Zeroes both components in place.
   * @returns {Vec2} - this
   */
  setZero() {
    this.x = 0;
    this.y = 0;
    return this;
  }

  /**
   * @method add
   * @description Adds another vector in place.
   * @param {Object} v
   * @returns {Vec2} - this
   */
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /**
   * @method addMul
   * @description Adds `s * v` in place. The workhorse of the solver.
   * @param {number} s
   * @param {Object} v
   * @returns {Vec2} - this
   */
  addMul(s, v) {
    this.x += s * v.x;
    this.y += s * v.y;
    return this;
  }

  /**
   * @method sub
   * @description Subtracts another vector in place.
   * @param {Object} v
   * @returns {Vec2} - this
   */
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /**
   * @method subMul
   * @description Subtracts `s * v` in place.
   * @param {number} s
   * @param {Object} v
   * @returns {Vec2} - this
   */
  subMul(s, v) {
    this.x -= s * v.x;
    this.y -= s * v.y;
    return this;
  }

  /**
   * @method mul
   * @description Scales in place.
   * @param {number} s
   * @returns {Vec2} - this
   */
  mul(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /**
   * @method neg
   * @description Negates in place.
   * @returns {Vec2} - this
   */
  neg() {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  /**
   * @method length
   * @description Euclidean length.
   * @returns {number}
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * @method lengthSquared
   * @description Squared length (no sqrt).
   * @returns {number}
   */
  lengthSquared() {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * @method normalize
   * @description Normalizes in place and returns the previous length. A
   * zero-length vector is left untouched (and reports 0).
   * @returns {number} - The length before normalizing
   */
  normalize() {
    const len = this.length();
    if (len < EPSILON) return 0;
    const inv = 1 / len;
    this.x *= inv;
    this.y *= inv;
    return len;
  }

  /**
   * @method isValid
   * @description True when both components are finite.
   * @returns {boolean}
   */
  isValid() {
    return Number.isFinite(this.x) && Number.isFinite(this.y);
  }

  /**
   * @method zero
   * @description Returns a fresh zero vector.
   * @returns {Vec2}
   */
  static zero() {
    return new Vec2(0, 0);
  }

  /**
   * @method add
   * @description a + b as a new vector.
   * @param {Object} a
   * @param {Object} b
   * @returns {Vec2}
   */
  static add(a, b) {
    return new Vec2(a.x + b.x, a.y + b.y);
  }

  /**
   * @method sub
   * @description a - b as a new vector.
   * @param {Object} a
   * @param {Object} b
   * @returns {Vec2}
   */
  static sub(a, b) {
    return new Vec2(a.x - b.x, a.y - b.y);
  }

  /**
   * @method mul
   * @description s * v as a new vector (either argument order works).
   * @param {number|Object} a
   * @param {number|Object} b
   * @returns {Vec2}
   */
  static mul(a, b) {
    if (typeof a === "number") return new Vec2(a * b.x, a * b.y);
    return new Vec2(a.x * b, a.y * b);
  }

  /**
   * @method combine
   * @description sa * a + sb * b as a new vector.
   * @param {number} sa
   * @param {Object} a
   * @param {number} sb
   * @param {Object} b
   * @returns {Vec2}
   */
  static combine(sa, a, sb, b) {
    return new Vec2(sa * a.x + sb * b.x, sa * a.y + sb * b.y);
  }

  /**
   * @method neg
   * @description -v as a new vector.
   * @param {Object} v
   * @returns {Vec2}
   */
  static neg(v) {
    return new Vec2(-v.x, -v.y);
  }

  /**
   * @method dot
   * @description Dot product.
   * @param {Object} a
   * @param {Object} b
   * @returns {number}
   */
  static dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }

  /**
   * @method cross
   * @description 2D cross product (the z of the 3D cross): a.x*b.y - a.y*b.x.
   * @param {Object} a
   * @param {Object} b
   * @returns {number}
   */
  static cross(a, b) {
    return a.x * b.y - a.y * b.x;
  }

  /**
   * @method crossVS
   * @description Cross of a vector with a scalar: (v.y * s, -v.x * s).
   * @param {Object} v
   * @param {number} s
   * @returns {Vec2}
   */
  static crossVS(v, s) {
    return new Vec2(s * v.y, -s * v.x);
  }

  /**
   * @method crossSV
   * @description Cross of a scalar with a vector: (-s * v.y, s * v.x). This is
   * how angular velocity turns into linear velocity at an offset.
   * @param {number} s
   * @param {Object} v
   * @returns {Vec2}
   */
  static crossSV(s, v) {
    return new Vec2(-s * v.y, s * v.x);
  }

  /**
   * @method distance
   * @description Distance between two points.
   * @param {Object} a
   * @param {Object} b
   * @returns {number}
   */
  static distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * @method distanceSquared
   * @description Squared distance between two points.
   * @param {Object} a
   * @param {Object} b
   * @returns {number}
   */
  static distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  /**
   * @method lerp
   * @description Linear interpolation between two points.
   * @param {Object} a
   * @param {Object} b
   * @param {number} t
   * @returns {Vec2}
   */
  static lerp(a, b, t) {
    return new Vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }
}

/**
 * @class Rot
 * @description A 2D rotation stored as sine/cosine, so rotating a vector never
 * needs a trig call in the inner loop.
 * @param {number} [angle=0] - Angle in radians
 */
class Rot {
  constructor(angle = 0) {
    this.s = Math.sin(angle);
    this.c = Math.cos(angle);
  }

  /**
   * @method set
   * @description Sets the rotation from an angle in radians.
   * @param {number} angle
   * @returns {Rot} - this
   */
  set(angle) {
    this.s = Math.sin(angle);
    this.c = Math.cos(angle);
    return this;
  }

  /**
   * @method copy
   * @description Copies another rotation.
   * @param {Rot} r
   * @returns {Rot} - this
   */
  copy(r) {
    this.s = r.s;
    this.c = r.c;
    return this;
  }

  /**
   * @method setIdentity
   * @description Resets to zero rotation.
   * @returns {Rot} - this
   */
  setIdentity() {
    this.s = 0;
    this.c = 1;
    return this;
  }

  /**
   * @method getAngle
   * @description Returns the angle in radians.
   * @returns {number}
   */
  getAngle() {
    return Math.atan2(this.s, this.c);
  }

  /**
   * @method mulVec
   * @description Rotates a vector by `q` into a new vector.
   * @param {Rot} q
   * @param {Object} v
   * @returns {Vec2}
   */
  static mulVec(q, v) {
    return new Vec2(q.c * v.x - q.s * v.y, q.s * v.x + q.c * v.y);
  }

  /**
   * @method mulTVec
   * @description Inverse-rotates a vector by `q` (world direction -> local).
   * @param {Rot} q
   * @param {Object} v
   * @returns {Vec2}
   */
  static mulTVec(q, v) {
    return new Vec2(q.c * v.x + q.s * v.y, -q.s * v.x + q.c * v.y);
  }
}

/**
 * @class Transform2
 * @description A rigid transform: a translation `p` plus a rotation `q`. Named
 * Transform2 so it never collides with the engine's renderable `Transform`.
 */
class Transform2 {
  constructor() {
    this.p = new Vec2();
    this.q = new Rot();
  }

  /**
   * @method setIdentity
   * @description Resets to the identity transform.
   * @returns {Transform2} - this
   */
  setIdentity() {
    this.p.setZero();
    this.q.setIdentity();
    return this;
  }

  /**
   * @method set
   * @description Sets position and angle.
   * @param {Object} position
   * @param {number} angle
   * @returns {Transform2} - this
   */
  set(position, angle) {
    this.p.copy(position);
    this.q.set(angle);
    return this;
  }

  /**
   * @method copy
   * @description Copies another transform.
   * @param {Transform2} xf
   * @returns {Transform2} - this
   */
  copy(xf) {
    this.p.copy(xf.p);
    this.q.copy(xf.q);
    return this;
  }

  /**
   * @method mulVec
   * @description Transforms a local point into world space.
   * @param {Transform2} xf
   * @param {Object} v
   * @returns {Vec2}
   */
  static mulVec(xf, v) {
    return new Vec2(
      xf.q.c * v.x - xf.q.s * v.y + xf.p.x,
      xf.q.s * v.x + xf.q.c * v.y + xf.p.y
    );
  }

  /**
   * @method mulTVec
   * @description Transforms a world point into local space.
   * @param {Transform2} xf
   * @param {Object} v
   * @returns {Vec2}
   */
  static mulTVec(xf, v) {
    const px = v.x - xf.p.x;
    const py = v.y - xf.p.y;
    return new Vec2(xf.q.c * px + xf.q.s * py, -xf.q.s * px + xf.q.c * py);
  }
}

/**
 * @class Sweep
 * @description The motion of a body's center of mass across one step, used by
 * continuous collision detection to reconstruct where the body was at any
 * fraction of the step.
 */
class Sweep {
  constructor() {
    /** Local center of mass */
    this.localCenter = new Vec2();
    /** World center at the start of the step */
    this.c0 = new Vec2();
    /** World center now */
    this.c = new Vec2();
    /** Angle at the start of the step */
    this.a0 = 0;
    /** Angle now */
    this.a = 0;
    /** Fraction of the step `c0`/`a0` correspond to (0..1) */
    this.alpha0 = 0;
  }

  /**
   * @method getTransform
   * @description Writes the body transform at fraction `beta` of the sweep into
   * `xf`. beta 0 is the start of the (remaining) sweep, 1 is the end.
   * @param {Transform2} xf - Output transform
   * @param {number} beta - Interpolation fraction
   * @returns {Transform2} - xf
   */
  getTransform(xf, beta) {
    const angle = (1 - beta) * this.a0 + beta * this.a;
    xf.q.set(angle);
    xf.p.x = (1 - beta) * this.c0.x + beta * this.c.x;
    xf.p.y = (1 - beta) * this.c0.y + beta * this.c.y;
    xf.p.x -= xf.q.c * this.localCenter.x - xf.q.s * this.localCenter.y;
    xf.p.y -= xf.q.s * this.localCenter.x + xf.q.c * this.localCenter.y;
    return xf;
  }

  /**
   * @method advance
   * @description Moves the start of the sweep forward to fraction `alpha` of
   * the original span, so later TOI queries only consider the remaining motion.
   * @param {number} alpha - Absolute fraction of the original sweep
   */
  advance(alpha) {
    const beta = (alpha - this.alpha0) / (1 - this.alpha0);
    this.c0.x += beta * (this.c.x - this.c0.x);
    this.c0.y += beta * (this.c.y - this.c0.y);
    this.a0 += beta * (this.a - this.a0);
    this.alpha0 = alpha;
  }

  /**
   * @method normalize
   * @description Keeps the sweep angles near zero so long-lived spinning bodies
   * don't lose float precision.
   */
  normalize() {
    const twoPi = 2 * Math.PI;
    const d = twoPi * Math.floor(this.a0 / twoPi);
    this.a0 -= d;
    this.a -= d;
  }
}

const EPSILON = 1.1920929e-7;

/**
 * @function clamp
 * @description Clamps a number to [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 * @private
 */
function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export { Vec2, Rot, Transform2, Sweep, clamp, EPSILON };
