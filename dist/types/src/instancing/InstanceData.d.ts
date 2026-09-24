/**
 * @function writeInstanceMatrix
 * @description Writes an instance's translate-rotate-scale model matrix into
 * `out` at slot `index`.
 * @param {Float32Array} out - Packed matrices (16 floats per instance)
 * @param {number} index - Instance slot
 * @param {{position:{x:number,y:number,z:number}, rotation:number, scale:{x:number,y:number}}} transform
 * @param {boolean} pixelart - Round x/y to whole pixels
 * @param {{matrix: mat4, pos: import("gl-matrix").vec3, scale: import("gl-matrix").vec3}} scratch
 */
export function writeInstanceMatrix(out: Float32Array, index: number, transform: {
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: number;
    scale: {
        x: number;
        y: number;
    };
}, pixelart: boolean, scratch: {
    matrix: mat4;
    pos: import("gl-matrix").vec3;
    scale: import("gl-matrix").vec3;
}): void;
/**
 * @function writeInstanceColor
 * @description Writes an RGBA tint (0..1) into `out` at slot `index`, or
 * opaque white when `tint` is null.
 * @param {Float32Array} out - Packed colors (4 floats per instance)
 * @param {number} index - Instance slot
 * @param {number[]|null} tint
 */
export function writeInstanceColor(out: Float32Array, index: number, tint: number[] | null): void;
/**
 * @function writeInstanceTexCoords
 * @description Copies 8 texture coordinates into `out` at slot `index`.
 * @param {Float32Array} out - Packed tex coords (8 floats per instance)
 * @param {number} index - Instance slot
 * @param {ArrayLike<number>} texCoords
 */
export function writeInstanceTexCoords(out: Float32Array, index: number, texCoords: ArrayLike<number>): void;
/**
 * @function frameTexCoords
 * @description Texture coordinates of one frame of a sprite sheet, in the
 * vertex order of the instanced quad. Frames are inset by half a texel so
 * neighbouring frames never bleed in. Without a frame size the whole texture
 * is used.
 * @param {number} frame - Frame index, row-major from the top-left
 * @param {{frameWidth:number, frameHeight:number, framesPerRow:number,
 *   textureWidth:number, textureHeight:number}} sheet
 * @param {boolean} mirrored - Flip horizontally
 * @returns {number[]} - 8 texture coordinates
 */
export function frameTexCoords(frame: number, sheet: {
    frameWidth: number;
    frameHeight: number;
    framesPerRow: number;
    textureWidth: number;
    textureHeight: number;
}, mirrored: boolean): number[];
/**
 * CPU-side packing of per-instance data (model matrices, tints and texture
 * coordinates) into the flat Float32Arrays InstancedTexture uploads as
 * instanced vertex attributes. Pure functions: no WebGL involved.
 */
/** Floats per instance in each packed array. */
export const MATRIX_FLOATS: 16;
export const TEXCOORD_FLOATS: 8;
export const COLOR_FLOATS: 4;
import { mat4 } from "gl-matrix";
