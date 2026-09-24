/**
 * @class GameLoop
 * @description The requestAnimationFrame loop behind `Kurai2D#run`: clamped
 * delta time, an optional fixed-timestep accumulator, pause/resume without a
 * dt spike, and auto-pause when the page is hidden. The frame scheduler is
 * injectable so the loop can be driven by tests.
 */
class GameLoop {
  /**
   * @param {Object} [options]
   * @param {Function} [options.isBlocked] - `() => boolean`; while true the
   *   loop keeps spinning but skips updates (e.g. WebGL context lost)
   * @param {Function} [options.requestFrame] - Frame scheduler, defaults to
   *   `globalThis.requestAnimationFrame`
   * @param {Function} [options.cancelFrame] - Defaults to
   *   `globalThis.cancelAnimationFrame`
   */
  constructor(options = {}) {
    this.isBlocked = options.isBlocked || (() => false);
    this.requestFrame =
      options.requestFrame ||
      (typeof globalThis.requestAnimationFrame === "function"
        ? globalThis.requestAnimationFrame.bind(globalThis)
        : null);
    this.cancelFrame =
      options.cancelFrame ||
      (typeof globalThis.cancelAnimationFrame === "function"
        ? globalThis.cancelAnimationFrame.bind(globalThis)
        : null);

    this.running = false;
    this.paused = false;
    /** @private */
    this._rafId = null;
    /** @private */
    this._lastTime = 0;
    /** @private */
    this._accumulator = 0;
    /** @private */
    this._onPause = null;
    /** @private */
    this._onResume = null;
    /** @private */
    this._onVisibility = null;
    /** @private */
    this._onWinBlur = null;
    /** @private */
    this._onWinFocus = null;
  }

  /**
   * @method start
   * @description Starts the loop. See `Kurai2D#run` for the options.
   * @param {Function} update - `(dt, alpha) => void`
   * @param {Object} [options]
   */
  start(update, options = {}) {
    const raf = this.requestFrame;
    if (!raf) {
      throw new Error(
        "[Kurai2D] > run() requires requestAnimationFrame (browser environment)."
      );
    }

    const maxDelta = options.maxDelta ?? 0.25;
    const fixedStep = options.fixedStep ?? 0;
    const fixedUpdate = options.fixedUpdate || null;
    const maxSubSteps = options.maxSubSteps ?? 5;

    this.running = true;
    this.paused = false;
    this._lastTime = 0;
    this._accumulator = 0;
    this._onPause = options.onPause || null;
    this._onResume = options.onResume || null;
    this._bindLifecycle(options);

    const frame = (now) => {
      if (!this.running) return;
      if (this.paused || this.isBlocked()) {
        this._lastTime = now;
        this._rafId = raf(frame);
        return;
      }
      if (this._lastTime === 0) this._lastTime = now;
      let dt = (now - this._lastTime) / 1000;
      this._lastTime = now;
      if (!isFinite(dt) || dt < 0) dt = 0;
      if (dt > maxDelta) dt = maxDelta;

      let alpha = 1;
      if (fixedStep > 0 && fixedUpdate) {
        this._accumulator += dt;
        let steps = 0;
        while (this._accumulator >= fixedStep && steps < maxSubSteps) {
          fixedUpdate(fixedStep);
          this._accumulator -= fixedStep;
          steps++;
        }
        if (steps === maxSubSteps) this._accumulator = 0;
        alpha = this._accumulator / fixedStep;
      }

      update(dt, alpha);
      this._rafId = raf(frame);
    };

    this._rafId = raf(frame);
  }

  /**
   * @method stop
   * @description Stops the loop and removes the lifecycle listeners.
   */
  stop() {
    this.running = false;
    this._unbindLifecycle();
    if (this._rafId != null && this.cancelFrame) this.cancelFrame(this._rafId);
    this._rafId = null;
  }

  /**
   * @method pause
   * @description Stops calling update while the frame callback keeps
   * spinning. Fires `onPause` once.
   */
  pause() {
    if (this.paused) return;
    this.paused = true;
    if (this._onPause) this._onPause();
  }

  /**
   * @method resume
   * @description Resumes and resyncs the clock so the next frame has ~0 dt.
   * Fires `onResume` once.
   */
  resume() {
    if (!this.paused) return;
    this.paused = false;
    this._lastTime = 0;
    if (this._onResume) this._onResume();
  }

  /**
   * @method _bindLifecycle
   * @description Wires visibility/blur listeners that auto-pause the loop when
   * the page is backgrounded.
   * @private
   */
  _bindLifecycle(options) {
    this._unbindLifecycle();
    const pauseOnBlur = options.pauseOnBlur ?? true;
    if (!pauseOnBlur) return;

    if (typeof document !== "undefined" && document.addEventListener) {
      this._onVisibility = () => {
        if (document.hidden) this.pause();
        else this.resume();
      };
      document.addEventListener("visibilitychange", this._onVisibility);
    }
    if (
      options.pauseOnWindowBlur &&
      typeof window !== "undefined" &&
      window.addEventListener
    ) {
      this._onWinBlur = () => this.pause();
      this._onWinFocus = () => this.resume();
      window.addEventListener("blur", this._onWinBlur);
      window.addEventListener("focus", this._onWinFocus);
    }
  }

  /**
   * @method _unbindLifecycle
   * @description Removes any listeners registered by `_bindLifecycle`.
   * @private
   */
  _unbindLifecycle() {
    if (this._onVisibility && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this._onVisibility);
      this._onVisibility = null;
    }
    if (this._onWinBlur && typeof window !== "undefined") {
      window.removeEventListener("blur", this._onWinBlur);
      window.removeEventListener("focus", this._onWinFocus);
      this._onWinBlur = null;
      this._onWinFocus = null;
    }
  }
}

export default GameLoop;
