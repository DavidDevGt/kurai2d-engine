export default GLManager;
/**
 * @class GLManager
 * @description Gives engine objects access to the current WebGL context.
 * State is stored per RenderContext: each Kurai2D engine owns one and makes
 * it current while it renders, and objects created afterwards (textures,
 * shapes, render targets...) bind to the context that was current when they
 * were created. With a single engine this is invisible.
 */
declare class GLManager {
    /**
     * @method getContext
     * @description Returns the current RenderContext.
     * @returns {RenderContext}
     */
    static getContext(): RenderContext;
    /**
     * @method makeCurrent
     * @description Makes a RenderContext current. Engines call this for you
     * (see `Kurai2D#makeCurrent`).
     * @param {RenderContext} context
     */
    static makeCurrent(context: RenderContext): void;
    /**
     * @method contextFor
     * @description Returns the RenderContext registered for a WebGL context,
     * or null.
     * @param {object} gl
     * @returns {RenderContext|null}
     */
    static contextFor(gl: object): RenderContext | null;
    /**
     * @method setGL
     * @description Makes the RenderContext of `gl` current, creating it on first
     * use. The first call adopts the initial (empty) context so state set
     * before any engine existed is kept.
     * @param {object} gl - The WebGL context
     */
    static setGL(gl: object): void;
    /**
     * @method setProgramInfo
     * @description Sets the standard program info of the current context.
     * @param {Object} programInfo - The program info
     */
    static setProgramInfo(programInfo: any): void;
    /**
     * @method setCanvas
     * @description Sets the canvas of the current context.
     * @param {HTMLCanvasElement} canvas - The canvas
     */
    static setCanvas(canvas: HTMLCanvasElement): void;
    /**
     * @method getGL
     * @description Returns the current WebGL context.
     * @returns {WebGL2RenderingContext} - The WebGL context
     */
    static getGL(): WebGL2RenderingContext;
    /**
     * @method getProgramInfo
     * @description Returns the standard program info of the current context.
     * @returns {Object} - The program info
     */
    static getProgramInfo(): any;
    /**
     * @method getCanvas
     * @description Returns the canvas of the current context.
     * @returns {HTMLCanvasElement} - The canvas
     */
    static getCanvas(): HTMLCanvasElement;
    /**
     * @method registerRestorable
     * @description Registers an object holding GL resources (buffers, textures,
     * programs) for re-creation after a WebGL context loss. The object must
     * implement `_restoreGL()`. Drawables register themselves automatically and
     * unregister on dispose(). The object belongs to the current context.
     * @param {Object} obj - An object with a _restoreGL() method
     */
    static registerRestorable(obj: any): void;
    /**
     * @method unregisterRestorable
     * @description Removes an object from the context-restore registry of the
     * context it was registered in.
     * @param {Object} obj
     */
    static unregisterRestorable(obj: any): void;
    /**
     * @method restoreAll
     * @description Calls _restoreGL() on every object registered in the current
     * context. Invoked by Kurai2D after the context is restored and the default
     * shaders/textures have been rebuilt.
     */
    static restoreAll(): void;
    /**
     * @method setProjection
     * @description Stores the current camera's projection matrix so custom
     * Materials (which use their own shader program) can upload it.
     * @param {Float32Array} matrix - The projection matrix
     */
    static setProjection(matrix: Float32Array): void;
    /**
     * @method getProjection
     * @description Returns the last projection matrix set by the renderer.
     * @returns {Float32Array}
     */
    static getProjection(): Float32Array;
    /** @returns {WebGL2RenderingContext|null} */
    static get gl(): WebGL2RenderingContext | null;
    /** @returns {Object|null} */
    static get programInfo(): any | null;
    /** @returns {HTMLCanvasElement|null} */
    static get canvas(): HTMLCanvasElement | null;
    /** @returns {Float32Array|null} */
    static get projection(): Float32Array | null;
    /** @returns {Set<Object>} */
    static get restorables(): Set<any>;
}
import RenderContext from "./RenderContext.js";
