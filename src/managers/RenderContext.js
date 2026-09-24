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
class RenderContext {
  /**
   * @param {WebGL2RenderingContext|null} [gl]
   */
  constructor(gl = null) {
    /** @type {WebGL2RenderingContext|null} */
    this.gl = gl;
    /** @type {Object|null} */
    this.programInfo = null;
    /** @type {HTMLCanvasElement|null} */
    this.canvas = gl && gl.canvas ? /** @type {any} */ (gl.canvas) : null;
    /** @type {Float32Array|null} */
    this.projection = null;
    /** Objects with a `_restoreGL()` method, rebuilt after a context loss. */
    this.restorables = new Set();

    /** GPU texture cache: "path|nearest|linear" -> Promise<{texture,width,height}> */
    this.textures = new Map();
    /** Texture reference counts, same keys as `textures`. */
    this.textureRefs = new Map();

    /** Uniform value caches used by GLState to skip redundant uploads. */
    this.uniformInts = new Map();
    this.uniformFloats = new Map();
    this.uniformVec4s = new Map();

    /** The primary camera of the engine owning this context. */
    this.camera = null;
    this.lastCameraPosition = null;

    /** Render counters for the frame in progress. */
    this.stats = { drawCalls: 0, quads: 0, textureBinds: 0 };
    /** Render counters of the last completed frame. */
    this.frameStats = { drawCalls: 0, quads: 0, textureBinds: 0 };
  }
}

export default RenderContext;
