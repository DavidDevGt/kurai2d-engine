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
class Gamepad {
  /**
   * @method get
   * @description Returns the (cached) handle for a pad index: 0 for the
   * first controller, 1 for the second, and so on.
   * @param {number} [index=0]
   * @returns {Gamepad}
   */
  static get(index = 0) {
    let pad = Gamepad._instances.get(index);
    if (!pad) {
      pad = new Gamepad(index);
      Gamepad._instances.set(index, pad);
    }
    return pad;
  }

  /**
   * @private Use `Gamepad.get(index)` rather than constructing directly, so
   * every caller asking for the same pad index shares one instance.
   */
  constructor(index) {
    this.index = index;
  }

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
  key(name) {
    return `pad:${this.index}:${name}`;
  }

  /**
   * @method button
   * @description A raw button index, mapping-independent: an escape hatch
   * for a pad whose layout the standard/custom mapping tables don't cover.
   * @param {number} n
   * @returns {string}
   */
  button(n) {
    return `pad:${this.index}:${n}`;
  }

  /**
   * @method axis
   * @description A raw analog axis past the deadzone, in one direction.
   * @param {number} n - Axis index (0/1 = left stick X/Y, 2/3 = right stick X/Y on a standard pad)
   * @param {"+"|"-"} [sign="+"]
   * @returns {string}
   */
  axis(n, sign = "+") {
    return `pad:${this.index}:axis${n}${sign}`;
  }
}

Gamepad._instances = new Map();

Gamepad.SOUTH = "south";
Gamepad.EAST = "east";
Gamepad.WEST = "west";
Gamepad.NORTH = "north";

Gamepad.L1 = "l1";
Gamepad.R1 = "r1";
Gamepad.L2 = "l2";
Gamepad.R2 = "r2";

Gamepad.SELECT = "select";
Gamepad.START = "start";
Gamepad.HOME = "home";

Gamepad.L3 = "l3";
Gamepad.R3 = "r3";

Gamepad.DPAD_UP = "dpadUp";
Gamepad.DPAD_DOWN = "dpadDown";
Gamepad.DPAD_LEFT = "dpadLeft";
Gamepad.DPAD_RIGHT = "dpadRight";

Gamepad.LEFT_STICK_UP = "leftStickUp";
Gamepad.LEFT_STICK_DOWN = "leftStickDown";
Gamepad.LEFT_STICK_LEFT = "leftStickLeft";
Gamepad.LEFT_STICK_RIGHT = "leftStickRight";
Gamepad.RIGHT_STICK_UP = "rightStickUp";
Gamepad.RIGHT_STICK_DOWN = "rightStickDown";
Gamepad.RIGHT_STICK_LEFT = "rightStickLeft";
Gamepad.RIGHT_STICK_RIGHT = "rightStickRight";

export default Gamepad;
