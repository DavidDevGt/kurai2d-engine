import { Vec2, Transform2, EPSILON } from "./Math2D.js";
import Settings from "./Settings.js";
import { distance } from "./Distance.js";

/**
 * @enum TOIState
 * @description Outcome of a time-of-impact query.
 */
const TOIState = {
  /** The shapes never meet within the step. */
  SEPARATED: "separated",
  /** They meet at the returned fraction of the step. */
  TOUCHING: "touching",
  /** They already overlap at the start of the step. */
  OVERLAPPED: "overlapped",
  /** The search ran out of iterations; `t` is still a safe lower bound. */
  FAILED: "failed",
};

const xfA = new Transform2();
const xfB = new Transform2();
const output = { distance: 0, pointA: new Vec2(), pointB: new Vec2() };

/**
 * @function timeOfImpact
 * @description Finds the first fraction of a step at which two moving shapes
 * touch, by conservative advancement: measure the gap, work out the fastest the
 * shapes could possibly close it, and skip ahead by exactly that much time,
 * never further. Repeating this converges on the impact without ever stepping
 * past it, which is what stops a fast body from tunnelling through a wall.
 *
 * @param {Object} input - `{ proxyA, proxyB, sweepA, sweepB, tMax }`
 * @returns {{state: string, t: number}} - The outcome and the impact fraction
 */
function timeOfImpact(input) {
  const { proxyA, proxyB, sweepA, sweepB } = input;
  const tMax = input.tMax ?? 1;

  const totalRadius = proxyA.radius + proxyB.radius;
  const target = Math.max(
    Settings.linearSlop,
    totalRadius - 3 * Settings.linearSlop
  );
  const tolerance = 0.25 * Settings.linearSlop;

  const dxA = sweepA.c.x - sweepA.c0.x;
  const dyA = sweepA.c.y - sweepA.c0.y;
  const dxB = sweepB.c.x - sweepB.c0.x;
  const dyB = sweepB.c.y - sweepB.c0.y;
  const dAngA = Math.abs(sweepA.a - sweepA.a0);
  const dAngB = Math.abs(sweepB.a - sweepB.a0);

  const approachBound =
    Math.hypot(dxA - dxB, dyA - dyB) +
    dAngA * proxyA.getMaxExtent() +
    dAngB * proxyB.getMaxExtent();

  if (approachBound < EPSILON) return { state: TOIState.SEPARATED, t: tMax };

  let t = 0;
  for (let iter = 0; iter < Settings.maxTOIIterations; iter++) {
    sweepA.getTransform(xfA, t);
    sweepB.getTransform(xfB, t);

    distance(output, {
      proxyA,
      proxyB,
      transformA: xfA,
      transformB: xfB,
      useRadii: false,
    });

    if (output.distance <= 0) {
      return { state: t === 0 ? TOIState.OVERLAPPED : TOIState.TOUCHING, t };
    }
    if (output.distance < target + tolerance) {
      return { state: TOIState.TOUCHING, t };
    }

    t += (output.distance - target) / approachBound;
    if (t >= tMax) return { state: TOIState.SEPARATED, t: tMax };
  }

  return { state: TOIState.FAILED, t };
}

export { timeOfImpact, TOIState };
