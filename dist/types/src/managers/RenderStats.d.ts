export default RenderStats;
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
declare class RenderStats {
    /**
     * @method beginFrame
     * @description Snapshots the counters gathered since the previous call into
     * `frame` and zeroes the accumulators. Called by Kurai2D.drawScene.
     */
    static beginFrame(): void;
    static set drawCalls(value: number);
    /** @returns {number} Draw calls so far in the frame in progress. */
    static get drawCalls(): number;
    static set quads(value: number);
    /** @returns {number} Quads so far in the frame in progress. */
    static get quads(): number;
    static set textureBinds(value: number);
    /** @returns {number} Texture binds so far in the frame in progress. */
    static get textureBinds(): number;
    /**
     * Counters of the last completed frame.
     * @returns {{drawCalls:number, quads:number, textureBinds:number}}
     */
    static get frame(): {
        drawCalls: number;
        quads: number;
        textureBinds: number;
    };
}
