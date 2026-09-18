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
export class Vec2 {
    /**
     * @method zero
     * @description Returns a fresh zero vector.
     * @returns {Vec2}
     */
    static zero(): Vec2;
    /**
     * @method add
     * @description a + b as a new vector.
     * @param {Object} a
     * @param {Object} b
     * @returns {Vec2}
     */
    static add(a: any, b: any): Vec2;
    /**
     * @method sub
     * @description a - b as a new vector.
     * @param {Object} a
     * @param {Object} b
     * @returns {Vec2}
     */
    static sub(a: any, b: any): Vec2;
    /**
     * @method mul
     * @description s * v as a new vector (either argument order works).
     * @param {number|Object} a
     * @param {number|Object} b
     * @returns {Vec2}
     */
    static mul(a: number | any, b: number | any): Vec2;
    /**
     * @method combine
     * @description sa * a + sb * b as a new vector.
     * @param {number} sa
     * @param {Object} a
     * @param {number} sb
     * @param {Object} b
     * @returns {Vec2}
     */
    static combine(sa: number, a: any, sb: number, b: any): Vec2;
    /**
     * @method neg
     * @description -v as a new vector.
     * @param {Object} v
     * @returns {Vec2}
     */
    static neg(v: any): Vec2;
    /**
     * @method dot
     * @description Dot product.
     * @param {Object} a
     * @param {Object} b
     * @returns {number}
     */
    static dot(a: any, b: any): number;
    /**
     * @method cross
     * @description 2D cross product (the z of the 3D cross): a.x*b.y - a.y*b.x.
     * @param {Object} a
     * @param {Object} b
     * @returns {number}
     */
    static cross(a: any, b: any): number;
    /**
     * @method crossVS
     * @description Cross of a vector with a scalar: (v.y * s, -v.x * s).
     * @param {Object} v
     * @param {number} s
     * @returns {Vec2}
     */
    static crossVS(v: any, s: number): Vec2;
    /**
     * @method crossSV
     * @description Cross of a scalar with a vector: (-s * v.y, s * v.x). This is
     * how angular velocity turns into linear velocity at an offset.
     * @param {number} s
     * @param {Object} v
     * @returns {Vec2}
     */
    static crossSV(s: number, v: any): Vec2;
    /**
     * @method distance
     * @description Distance between two points.
     * @param {Object} a
     * @param {Object} b
     * @returns {number}
     */
    static distance(a: any, b: any): number;
    /**
     * @method distanceSquared
     * @description Squared distance between two points.
     * @param {Object} a
     * @param {Object} b
     * @returns {number}
     */
    static distanceSquared(a: any, b: any): number;
    /**
     * @method lerp
     * @description Linear interpolation between two points.
     * @param {Object} a
     * @param {Object} b
     * @param {number} t
     * @returns {Vec2}
     */
    static lerp(a: any, b: any, t: number): Vec2;
    constructor(x?: number, y?: number);
    x: any;
    y: any;
    /**
     * @method set
     * @description Sets both components in place.
     * @param {number} x
     * @param {number} y
     * @returns {Vec2} - this
     */
    set(x: number, y: number): Vec2;
    /**
     * @method copy
     * @description Copies another vector's components into this one.
     * @param {Object} v - Any `{ x, y }`
     * @returns {Vec2} - this
     */
    copy(v: any): Vec2;
    /**
     * @method clone
     * @description Returns an independent copy.
     * @returns {Vec2}
     */
    clone(): Vec2;
    /**
     * @method setZero
     * @description Zeroes both components in place.
     * @returns {Vec2} - this
     */
    setZero(): Vec2;
    /**
     * @method add
     * @description Adds another vector in place.
     * @param {Object} v
     * @returns {Vec2} - this
     */
    add(v: any): Vec2;
    /**
     * @method addMul
     * @description Adds `s * v` in place. The workhorse of the solver.
     * @param {number} s
     * @param {Object} v
     * @returns {Vec2} - this
     */
    addMul(s: number, v: any): Vec2;
    /**
     * @method sub
     * @description Subtracts another vector in place.
     * @param {Object} v
     * @returns {Vec2} - this
     */
    sub(v: any): Vec2;
    /**
     * @method subMul
     * @description Subtracts `s * v` in place.
     * @param {number} s
     * @param {Object} v
     * @returns {Vec2} - this
     */
    subMul(s: number, v: any): Vec2;
    /**
     * @method mul
     * @description Scales in place.
     * @param {number} s
     * @returns {Vec2} - this
     */
    mul(s: number): Vec2;
    /**
     * @method neg
     * @description Negates in place.
     * @returns {Vec2} - this
     */
    neg(): Vec2;
    /**
     * @method length
     * @description Euclidean length.
     * @returns {number}
     */
    length(): number;
    /**
     * @method lengthSquared
     * @description Squared length (no sqrt).
     * @returns {number}
     */
    lengthSquared(): number;
    /**
     * @method normalize
     * @description Normalizes in place and returns the previous length. A
     * zero-length vector is left untouched (and reports 0).
     * @returns {number} - The length before normalizing
     */
    normalize(): number;
    /**
     * @method isValid
     * @description True when both components are finite.
     * @returns {boolean}
     */
    isValid(): boolean;
}
/**
 * @class Rot
 * @description A 2D rotation stored as sine/cosine, so rotating a vector never
 * needs a trig call in the inner loop.
 * @param {number} [angle=0] - Angle in radians
 */
export class Rot {
    /**
     * @method mulVec
     * @description Rotates a vector by `q` into a new vector.
     * @param {Rot} q
     * @param {Object} v
     * @returns {Vec2}
     */
    static mulVec(q: Rot, v: any): Vec2;
    /**
     * @method mulTVec
     * @description Inverse-rotates a vector by `q` (world direction -> local).
     * @param {Rot} q
     * @param {Object} v
     * @returns {Vec2}
     */
    static mulTVec(q: Rot, v: any): Vec2;
    constructor(angle?: number);
    s: number;
    c: number;
    /**
     * @method set
     * @description Sets the rotation from an angle in radians.
     * @param {number} angle
     * @returns {Rot} - this
     */
    set(angle: number): Rot;
    /**
     * @method copy
     * @description Copies another rotation.
     * @param {Rot} r
     * @returns {Rot} - this
     */
    copy(r: Rot): Rot;
    /**
     * @method setIdentity
     * @description Resets to zero rotation.
     * @returns {Rot} - this
     */
    setIdentity(): Rot;
    /**
     * @method getAngle
     * @description Returns the angle in radians.
     * @returns {number}
     */
    getAngle(): number;
}
/**
 * @class Transform2
 * @description A rigid transform: a translation `p` plus a rotation `q`. Named
 * Transform2 so it never collides with the engine's renderable `Transform`.
 */
export class Transform2 {
    /**
     * @method mulVec
     * @description Transforms a local point into world space.
     * @param {Transform2} xf
     * @param {Object} v
     * @returns {Vec2}
     */
    static mulVec(xf: Transform2, v: any): Vec2;
    /**
     * @method mulTVec
     * @description Transforms a world point into local space.
     * @param {Transform2} xf
     * @param {Object} v
     * @returns {Vec2}
     */
    static mulTVec(xf: Transform2, v: any): Vec2;
    p: Vec2;
    q: Rot;
    /**
     * @method setIdentity
     * @description Resets to the identity transform.
     * @returns {Transform2} - this
     */
    setIdentity(): Transform2;
    /**
     * @method set
     * @description Sets position and angle.
     * @param {Object} position
     * @param {number} angle
     * @returns {Transform2} - this
     */
    set(position: any, angle: number): Transform2;
    /**
     * @method copy
     * @description Copies another transform.
     * @param {Transform2} xf
     * @returns {Transform2} - this
     */
    copy(xf: Transform2): Transform2;
}
/**
 * @class Sweep
 * @description The motion of a body's center of mass across one step, used by
 * continuous collision detection to reconstruct where the body was at any
 * fraction of the step.
 */
export class Sweep {
    /** Local center of mass */
    localCenter: Vec2;
    /** World center at the start of the step */
    c0: Vec2;
    /** World center now */
    c: Vec2;
    /** Angle at the start of the step */
    a0: number;
    /** Angle now */
    a: number;
    /** Fraction of the step `c0`/`a0` correspond to (0..1) */
    alpha0: number;
    /**
     * @method getTransform
     * @description Writes the body transform at fraction `beta` of the sweep into
     * `xf`. beta 0 is the start of the (remaining) sweep, 1 is the end.
     * @param {Transform2} xf - Output transform
     * @param {number} beta - Interpolation fraction
     * @returns {Transform2} - xf
     */
    getTransform(xf: Transform2, beta: number): Transform2;
    /**
     * @method advance
     * @description Moves the start of the sweep forward to fraction `alpha` of
     * the original span, so later TOI queries only consider the remaining motion.
     * @param {number} alpha - Absolute fraction of the original sweep
     */
    advance(alpha: number): void;
    /**
     * @method normalize
     * @description Keeps the sweep angles near zero so long-lived spinning bodies
     * don't lose float precision.
     */
    normalize(): void;
}
/**
 * @function clamp
 * @description Clamps a number to [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 * @private
 */
export function clamp(value: number, min: number, max: number): number;
export const EPSILON: 1.1920929e-7;
