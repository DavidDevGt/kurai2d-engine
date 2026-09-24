export default GLState;
/**
 * @class GLState
 * @description Tiny redundant-uniform filter. The renderer sets the same handful
 * of per-object uniforms (useTexture, useInstances, useLighting, color, opacity)
 * for every object every frame; most calls repeat the previous value. These
 * helpers skip the GL call when the value is unchanged. Keyed by uniform
 * location, which is program-specific, so the cache is safe across objects.
 * The caches live in the current RenderContext, one set per engine.
 */
declare class GLState {
    /**
     * @method reset
     * @description Clears the cache. Called at the start of each frame so the
     * first object always re-establishes state.
     */
    static reset(): void;
    /**
     * @method uniform1i
     * @description Cached gl.uniform1i (accepts booleans, coerced like WebGL does).
     */
    static uniform1i(gl: any, location: any, value: any): void;
    /**
     * @method uniform1f
     * @description Cached gl.uniform1f.
     */
    static uniform1f(gl: any, location: any, value: any): void;
    /**
     * @method uniform4fv
     * @description Cached gl.uniform4fv (compares the four components).
     */
    static uniform4fv(gl: any, location: any, value: any): void;
    /** @returns {Map<WebGLUniformLocation, number>} */
    static get ints(): Map<WebGLUniformLocation, number>;
    /** @returns {Map<WebGLUniformLocation, number>} */
    static get floats(): Map<WebGLUniformLocation, number>;
    /** @returns {Map<WebGLUniformLocation, number[]>} */
    static get vec4s(): Map<WebGLUniformLocation, number[]>;
}
