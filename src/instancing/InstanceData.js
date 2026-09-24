import { mat4 } from "gl-matrix";

/**
 * CPU-side packing of per-instance data (model matrices, tints and texture
 * coordinates) into the flat Float32Arrays InstancedTexture uploads as
 * instanced vertex attributes. Pure functions: no WebGL involved.
 */

/** Floats per instance in each packed array. */
export const MATRIX_FLOATS = 16;
export const TEXCOORD_FLOATS = 8;
export const COLOR_FLOATS = 4;

const Z_AXIS = [0, 0, 1];

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
export function writeInstanceMatrix(out, index, transform, pixelart, scratch) {
  const matrix = scratch.matrix;
  mat4.identity(matrix);

  const pos = scratch.pos;
  pos[0] = pixelart ? Math.round(transform.position.x) : transform.position.x;
  pos[1] = pixelart ? Math.round(transform.position.y) : transform.position.y;
  pos[2] = transform.position.z;

  const scale = scratch.scale;
  scale[0] = transform.scale.x;
  scale[1] = transform.scale.y;
  scale[2] = 1;

  mat4.translate(matrix, matrix, pos);
  mat4.rotate(matrix, matrix, transform.rotation, Z_AXIS);
  mat4.scale(matrix, matrix, scale);

  out.set(matrix, index * MATRIX_FLOATS);
}

/**
 * @function writeInstanceColor
 * @description Writes an RGBA tint (0..1) into `out` at slot `index`, or
 * opaque white when `tint` is null.
 * @param {Float32Array} out - Packed colors (4 floats per instance)
 * @param {number} index - Instance slot
 * @param {number[]|null} tint
 */
export function writeInstanceColor(out, index, tint) {
  const offset = index * COLOR_FLOATS;
  if (tint) {
    out[offset] = tint[0];
    out[offset + 1] = tint[1];
    out[offset + 2] = tint[2];
    out[offset + 3] = tint[3];
  } else {
    out[offset] = 1;
    out[offset + 1] = 1;
    out[offset + 2] = 1;
    out[offset + 3] = 1;
  }
}

/**
 * @function writeInstanceTexCoords
 * @description Copies 8 texture coordinates into `out` at slot `index`.
 * @param {Float32Array} out - Packed tex coords (8 floats per instance)
 * @param {number} index - Instance slot
 * @param {ArrayLike<number>} texCoords
 */
export function writeInstanceTexCoords(out, index, texCoords) {
  const offset = index * TEXCOORD_FLOATS;
  for (let i = 0; i < TEXCOORD_FLOATS; i++) {
    out[offset + i] = texCoords[i];
  }
}

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
export function frameTexCoords(frame, sheet, mirrored) {
  let texLeft, texRight, texTop, texBottom;

  if (sheet.frameWidth > 0 && sheet.frameHeight > 0) {
    const col = frame % sheet.framesPerRow;
    const row = Math.floor(frame / sheet.framesPerRow);

    const ix = 0.5 / sheet.textureWidth;
    const iy = 0.5 / sheet.textureHeight;

    texLeft = ((col + 1) * sheet.frameWidth) / sheet.textureWidth - ix;
    texRight = (col * sheet.frameWidth) / sheet.textureWidth + ix;
    texTop =
      (sheet.textureHeight - row * sheet.frameHeight - sheet.frameHeight) /
        sheet.textureHeight +
      iy;
    texBottom =
      (sheet.textureHeight - row * sheet.frameHeight) / sheet.textureHeight -
      iy;
  } else {
    texLeft = 1.0;
    texRight = 0.0;
    texTop = 0.0;
    texBottom = 1.0;
  }

  return mirrored
    ? [
        texRight,
        texBottom,
        texLeft,
        texBottom,
        texRight,
        texTop,
        texLeft,
        texTop,
      ]
    : [
        texLeft,
        texBottom,
        texRight,
        texBottom,
        texLeft,
        texTop,
        texRight,
        texTop,
      ];
}
