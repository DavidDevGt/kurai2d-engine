/**
 * @namespace Settings
 * @description Global tunables for the physics engine, in physics units
 * (meters/radians/seconds). The defaults are tuned for bodies roughly 0.1m to
 * 10m in size, that's what the `scale` argument of {@link Physics} is for:
 * pick a scale that puts your sprites in that range and these never need
 * touching.
 *
 * `velocityThreshold` is the one value commonly overridden per game; the
 * {@link Physics} constructor forwards its third argument to
 * `world.velocityThreshold`, which shadows the value here for that world.
 */
const Settings = {
  /** Collision tolerance. Bodies are allowed to overlap this much. */
  linearSlop: 0.005,

  /** Angular tolerance used by the position solver. */
  angularSlop: (2 / 180) * Math.PI,

  /**
   * Polygons are inflated by this radius for collision, which keeps
   * face-to-face contacts stable instead of flickering on and off.
   */
  polygonRadius: 2 * 0.005,

  /** Max overlap the position solver may fix in a single iteration. */
  maxLinearCorrection: 0.2,

  /** Max angle the position solver may fix in a single iteration. */
  maxAngularCorrection: (8 / 180) * Math.PI,

  /** A body may not move further than this in one step (stability clamp). */
  maxTranslation: 2,

  /** A body may not rotate further than this in one step. */
  maxRotation: 0.5 * Math.PI,

  /** Position-correction rate for the discrete solver (0..1). */
  baumgarte: 0.2,

  /** Position-correction rate for the continuous (TOI) solver. */
  toiBaumgarte: 0.75,

  /**
   * Relative normal speed below which a collision is treated as inelastic.
   * Without it, resting bodies would jitter forever on their restitution.
   */
  velocityThreshold: 1,

  /** How long a body must be nearly still before it is allowed to sleep. */
  timeToSleep: 0.5,

  /** Linear speed under which a body counts as "still". */
  linearSleepTolerance: 0.01,

  /** Angular speed under which a body counts as "still". */
  angularSleepTolerance: (2 / 180) * Math.PI,

  /** Broadphase AABBs are fattened by this much to avoid constant re-inserts. */
  aabbExtension: 0.1,

  /** Fat AABBs also lead the body's motion by this multiple of its travel. */
  aabbMultiplier: 4,

  /** Default velocity iterations per step. */
  velocityIterations: 8,

  /** Default position iterations per step. */
  positionIterations: 3,

  /** Max continuous-collision advancement iterations per body pair. */
  maxTOIIterations: 20,

  /** Max continuous-collision passes per body per step. */
  maxTOIPasses: 8,
};

export default Settings;
