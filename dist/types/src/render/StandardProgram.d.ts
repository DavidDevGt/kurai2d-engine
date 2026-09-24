/**
 * @function createStandardProgramInfo
 * @description Compiles the engine's standard shader program and caches every
 * attribute and uniform location the draw paths use. Called when an engine is
 * created and again after a WebGL context loss is restored.
 * @param {WebGL2RenderingContext} gl
 * @returns {{program: WebGLProgram, attribLocations: Object<string, number>,
 *   uniformLocations: Object<string, WebGLUniformLocation>}}
 */
export function createStandardProgramInfo(gl: WebGL2RenderingContext): {
    program: WebGLProgram;
    attribLocations: {
        [x: string]: number;
    };
    uniformLocations: {
        [x: string]: WebGLUniformLocation;
    };
};
