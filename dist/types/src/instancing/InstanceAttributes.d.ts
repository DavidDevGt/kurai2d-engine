/**
 * WebGL plumbing for InstancedTexture: uploading the packed per-instance
 * arrays and wiring them to the standard program's instanced attributes.
 */
/**
 * @function uploadInstanceBuffer
 * @description Replaces the contents of an instance buffer.
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLBuffer} buffer
 * @param {Float32Array} data
 */
export function uploadInstanceBuffer(gl: WebGL2RenderingContext, buffer: WebGLBuffer, data: Float32Array): void;
/**
 * @function bindInstanceAttributes
 * @description Points the instanced attributes (model matrix, color and,
 * when textured, per-corner tex coords) at their buffers with a divisor of 1.
 * @param {WebGL2RenderingContext} gl
 * @param {{attribLocations: Object<string, number>}} programInfo
 * @param {{matrix: WebGLBuffer, texCoord: WebGLBuffer, color: WebGLBuffer}} buffers
 * @param {boolean} textured
 */
export function bindInstanceAttributes(gl: WebGL2RenderingContext, programInfo: {
    attribLocations: {
        [x: string]: number;
    };
}, buffers: {
    matrix: WebGLBuffer;
    texCoord: WebGLBuffer;
    color: WebGLBuffer;
}, textured: boolean): void;
/**
 * @function unbindInstanceAttributes
 * @description Resets divisors and disables the attributes enabled by
 * bindInstanceAttributes, so later non-instanced draws are unaffected.
 * @param {WebGL2RenderingContext} gl
 * @param {{attribLocations: Object<string, number>}} programInfo
 * @param {boolean} textured
 */
export function unbindInstanceAttributes(gl: WebGL2RenderingContext, programInfo: {
    attribLocations: {
        [x: string]: number;
    };
}, textured: boolean): void;
