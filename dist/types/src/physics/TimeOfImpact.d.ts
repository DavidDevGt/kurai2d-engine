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
export function timeOfImpact(input: any): {
    state: string;
    t: number;
};
export type TOIState = TOIState;
export namespace TOIState {
    let SEPARATED: string;
    let TOUCHING: string;
    let OVERLAPPED: string;
    let FAILED: string;
}
