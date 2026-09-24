import GLManager from "./GLManager.js";

/**
 * @class RenderStats
 * @description Frame-level render counters, incremented by every draw site in
 * the engine (Drawable, InstancedTexture, SpriteBatch, post-processing) and
 * reset at the start of each drawScene. Read the previous completed frame via
 * `RenderStats.frame` or `engine.getRenderStats()`. DebugOverlay shows it
 * automatically. Counters are kept per RenderContext, so each engine reports
 * its own numbers.
 *
 * - drawCalls:    GPU draw commands issued (the batching win shows up here)
 * - quads:        sprites/shapes drawn, counting every instance in a batch
 * - textureBinds: texture switches (high numbers = poor batching order)
 */
class RenderStats {
  /**
   * @method beginFrame
   * @description Snapshots the counters gathered since the previous call into
   * `frame` and zeroes the accumulators. Called by Kurai2D.drawScene.
   */
  static beginFrame() {
    const ctx = GLManager.getContext();
    const s = ctx.stats;
    const f = ctx.frameStats;
    f.drawCalls = s.drawCalls;
    f.quads = s.quads;
    f.textureBinds = s.textureBinds;
    s.drawCalls = 0;
    s.quads = 0;
    s.textureBinds = 0;
  }

  /** @returns {number} Draw calls so far in the frame in progress. */
  static get drawCalls() {
    return GLManager.getContext().stats.drawCalls;
  }

  static set drawCalls(value) {
    GLManager.getContext().stats.drawCalls = value;
  }

  /** @returns {number} Quads so far in the frame in progress. */
  static get quads() {
    return GLManager.getContext().stats.quads;
  }

  static set quads(value) {
    GLManager.getContext().stats.quads = value;
  }

  /** @returns {number} Texture binds so far in the frame in progress. */
  static get textureBinds() {
    return GLManager.getContext().stats.textureBinds;
  }

  static set textureBinds(value) {
    GLManager.getContext().stats.textureBinds = value;
  }

  /**
   * Counters of the last completed frame.
   * @returns {{drawCalls:number, quads:number, textureBinds:number}}
   */
  static get frame() {
    return GLManager.getContext().frameStats;
  }
}

export default RenderStats;
