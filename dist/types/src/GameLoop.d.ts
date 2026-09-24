export default GameLoop;
/**
 * @class GameLoop
 * @description The requestAnimationFrame loop behind `Kurai2D#run`: clamped
 * delta time, an optional fixed-timestep accumulator, pause/resume without a
 * dt spike, and auto-pause when the page is hidden. The frame scheduler is
 * injectable so the loop can be driven by tests.
 */
declare class GameLoop {
    /**
     * @param {Object} [options]
     * @param {Function} [options.isBlocked] - `() => boolean`; while true the
     *   loop keeps spinning but skips updates (e.g. WebGL context lost)
     * @param {Function} [options.requestFrame] - Frame scheduler, defaults to
     *   `globalThis.requestAnimationFrame`
     * @param {Function} [options.cancelFrame] - Defaults to
     *   `globalThis.cancelAnimationFrame`
     */
    constructor(options?: {
        isBlocked?: Function;
        requestFrame?: Function;
        cancelFrame?: Function;
    });
    isBlocked: Function;
    requestFrame: any;
    cancelFrame: any;
    running: boolean;
    paused: boolean;
    /** @private */
    private _rafId;
    /** @private */
    private _lastTime;
    /** @private */
    private _accumulator;
    /** @private */
    private _onPause;
    /** @private */
    private _onResume;
    /** @private */
    private _onVisibility;
    /** @private */
    private _onWinBlur;
    /** @private */
    private _onWinFocus;
    /**
     * @method start
     * @description Starts the loop. See `Kurai2D#run` for the options.
     * @param {Function} update - `(dt, alpha) => void`
     * @param {Object} [options]
     */
    start(update: Function, options?: any): void;
    /**
     * @method stop
     * @description Stops the loop and removes the lifecycle listeners.
     */
    stop(): void;
    /**
     * @method pause
     * @description Stops calling update while the frame callback keeps
     * spinning. Fires `onPause` once.
     */
    pause(): void;
    /**
     * @method resume
     * @description Resumes and resyncs the clock so the next frame has ~0 dt.
     * Fires `onResume` once.
     */
    resume(): void;
    /**
     * @method _bindLifecycle
     * @description Wires visibility/blur listeners that auto-pause the loop when
     * the page is backgrounded.
     * @private
     */
    private _bindLifecycle;
    /**
     * @method _unbindLifecycle
     * @description Removes any listeners registered by `_bindLifecycle`.
     * @private
     */
    private _unbindLifecycle;
}
