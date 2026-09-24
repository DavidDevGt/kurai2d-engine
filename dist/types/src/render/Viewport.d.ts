/**
 * Viewport math shared by rendering and input picking. Pure functions: they
 * only read the canvas size and camera, so they can be tested without WebGL.
 */
/**
 * @typedef {Object} ViewportRect
 * @property {number} px - GL viewport x, in device pixels
 * @property {number} py - GL viewport y, in device pixels
 * @property {number} pw - GL viewport width, in device pixels
 * @property {number} ph - GL viewport height, in device pixels
 * @property {number} worldW - Visible world width before camera zoom
 * @property {number} worldH - Visible world height before camera zoom
 */
/**
 * @function computeViewport
 * @description Computes the device-pixel GL viewport rect and the world-space
 * extents for a camera, honoring the design resolution and fit mode. Without
 * a design resolution it returns the camera's screen sub-rect at the canvas
 * CSS size.
 * @param {{width:number, height:number, clientWidth:number, clientHeight:number}} canvas
 * @param {{viewport:{x:number, y:number, width:number, height:number}}} camera
 * @param {{width:number, height:number, mode:string}|null} design
 * @returns {ViewportRect}
 */
export function computeViewport(canvas: {
    width: number;
    height: number;
    clientWidth: number;
    clientHeight: number;
}, camera: {
    viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}, design: {
    width: number;
    height: number;
    mode: string;
} | null): ViewportRect;
/**
 * @function clientToView
 * @description Maps a client/CSS pixel coordinate to pre-camera view space
 * (origin center, +Y up) inside a viewport, honoring device pixel ratio and
 * letterbox offsets. This is also the coordinate space of `screenSpace`
 * objects.
 * @param {HTMLCanvasElement} canvas
 * @param {ViewportRect} viewport - From computeViewport
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{x:number, y:number}}
 */
export function clientToView(canvas: HTMLCanvasElement, viewport: ViewportRect, clientX: number, clientY: number): {
    x: number;
    y: number;
};
export type ViewportRect = {
    /**
     * - GL viewport x, in device pixels
     */
    px: number;
    /**
     * - GL viewport y, in device pixels
     */
    py: number;
    /**
     * - GL viewport width, in device pixels
     */
    pw: number;
    /**
     * - GL viewport height, in device pixels
     */
    ph: number;
    /**
     * - Visible world width before camera zoom
     */
    worldW: number;
    /**
     * - Visible world height before camera zoom
     */
    worldH: number;
};
