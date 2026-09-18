export default Gamepad;
/**
 * @class Gamepad
 * @description An autocomplete-friendly way to build the raw gamepad token
 * strings InputManager already understands ("pad:0:south", etc.). It does
 * not read input itself, and it is unrelated to the browser's own native
 * `Gamepad` interface (the objects `navigator.getGamepads()` returns). It
 * exists purely so you don't have to remember button-name spelling: every
 * button/stick-direction name InputManager's standard mapping recognizes is
 * a static constant here, so typing `Gamepad.` in an editor lists them the
 * way an enum's members would.
 *
 * `Gamepad.get(index).key(name)` produces exactly the same string as writing
 * the token by hand, so the two are fully interchangeable anywhere
 * InputManager takes one: `mapAction`, `isDown`, `justPressed`,
 * `justReleased`.
 *
 * @example
 * import { Gamepad, InputManager } from "./index.js";
 *
 * const input = new InputManager();
 * const pad = Gamepad.get(0); // the first controller
 *
 * input.mapAction("jump", [pad.key(Gamepad.SOUTH)]);
 * input.mapAction("left", [pad.key(Gamepad.DPAD_LEFT), pad.key(Gamepad.LEFT_STICK_LEFT)]);
 *
 * // in the loop:
 * if (input.justPressed("jump")) player.jump();
 */
declare class Gamepad {
    /**
     * @method get
     * @description Returns the (cached) handle for a pad index: 0 for the
     * first controller, 1 for the second, and so on.
     * @param {number} [index=0]
     * @returns {Gamepad}
     */
    static get(index?: number): Gamepad;
    /**
     * @private Use `Gamepad.get(index)` rather than constructing directly, so
     * every caller asking for the same pad index shares one instance.
     */
    private constructor();
    index: any;
    /**
     * @method key
     * @description A face/shoulder/centre/d-pad/stick-as-button token for this
     * pad. Pass one of the `Gamepad.*` constants (`Gamepad.SOUTH`,
     * `Gamepad.DPAD_UP`, …). InputManager's standard mapping also accepts a
     * few vendor aliases these don't cover (e.g. "a", "cross" for `SOUTH`) if
     * you'd rather think in Xbox/PlayStation terms; those still work as plain
     * strings, `key()` just doesn't need to name them since `SOUTH` already
     * reads the same on every pad.
     * @param {string} name - One of the `Gamepad.*` button constants
     * @returns {string}
     */
    key(name: string): string;
    /**
     * @method button
     * @description A raw button index, mapping-independent: an escape hatch
     * for a pad whose layout the standard/custom mapping tables don't cover.
     * @param {number} n
     * @returns {string}
     */
    button(n: number): string;
    /**
     * @method axis
     * @description A raw analog axis past the deadzone, in one direction.
     * @param {number} n - Axis index (0/1 = left stick X/Y, 2/3 = right stick X/Y on a standard pad)
     * @param {"+"|"-"} [sign="+"]
     * @returns {string}
     */
    axis(n: number, sign?: "+" | "-"): string;
}
declare namespace Gamepad {
    let _instances: Map<any, any>;
    let SOUTH: string;
    let EAST: string;
    let WEST: string;
    let NORTH: string;
    let L1: string;
    let R1: string;
    let L2: string;
    let R2: string;
    let SELECT: string;
    let START: string;
    let HOME: string;
    let L3: string;
    let R3: string;
    let DPAD_UP: string;
    let DPAD_DOWN: string;
    let DPAD_LEFT: string;
    let DPAD_RIGHT: string;
    let LEFT_STICK_UP: string;
    let LEFT_STICK_DOWN: string;
    let LEFT_STICK_LEFT: string;
    let LEFT_STICK_RIGHT: string;
    let RIGHT_STICK_UP: string;
    let RIGHT_STICK_DOWN: string;
    let RIGHT_STICK_LEFT: string;
    let RIGHT_STICK_RIGHT: string;
}
