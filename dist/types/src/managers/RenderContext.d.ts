export default RenderContext;
/**
 * @class RenderContext
 * @description Everything that belongs to one WebGL context: the context
 * itself, the standard program, the GPU texture cache, the uniform cache,
 * restorable GPU resources, the active camera and the render counters. Each
 * Kurai2D engine owns one, and the static managers (GLManager, GLState,
 * TextureManager, CameraManager, RenderStats) read and write whichever is
 * current. Engines make their context current while they render, so several
 * engines can share a page without mixing state.
 */
declare class RenderContext {
    /**
     * @param {WebGL2RenderingContext|null} [gl]
     */
    constructor(gl?: WebGL2RenderingContext | null);
    /** @type {WebGL2RenderingContext|null} */
    gl: WebGL2RenderingContext | null;
    /** @type {Object|null} */
    programInfo: any | null;
    /** @type {HTMLCanvasElement|null} */
    canvas: HTMLCanvasElement | null;
    /** @type {Float32Array|null} */
    projection: Float32Array | null;
    /** Objects with a `_restoreGL()` method, rebuilt after a context loss. */
    restorables: Set<any>;
    /** GPU texture cache: "path|nearest|linear" -> Promise<{texture,width,height}> */
    textures: Map<any, any>;
    /** Texture reference counts, same keys as `textures`. */
    textureRefs: Map<any, any>;
    /** Uniform value caches used by GLState to skip redundant uploads. */
    uniformInts: Map<any, any>;
    uniformFloats: Map<any, any>;
    uniformVec4s: Map<any, any>;
    /** The primary camera of the engine owning this context. */
    camera: any;
    lastCameraPosition: any;
    /** Render counters for the frame in progress. */
    stats: {
        drawCalls: number;
        quads: number;
        textureBinds: number;
    };
    /** Render counters of the last completed frame. */
    frameStats: {
        drawCalls: number;
        quads: number;
        textureBinds: number;
    };
}
