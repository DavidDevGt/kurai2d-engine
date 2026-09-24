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
export function uploadInstanceBuffer(gl, buffer, data) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
}

/**
 * @function texCoordLocations
 * @description The four per-instance texture coordinate attribute locations
 * (one vec2 per quad corner).
 * @param {{attribLocations: Object<string, number>}} programInfo
 * @returns {number[]}
 */
function texCoordLocations(programInfo) {
  const a = programInfo.attribLocations;
  return [
    a.instanceTexCoord0,
    a.instanceTexCoord1,
    a.instanceTexCoord2,
    a.instanceTexCoord3,
  ];
}

/**
 * @function bindInstanceAttributes
 * @description Points the instanced attributes (model matrix, color and,
 * when textured, per-corner tex coords) at their buffers with a divisor of 1.
 * @param {WebGL2RenderingContext} gl
 * @param {{attribLocations: Object<string, number>}} programInfo
 * @param {{matrix: WebGLBuffer, texCoord: WebGLBuffer, color: WebGLBuffer}} buffers
 * @param {boolean} textured
 */
export function bindInstanceAttributes(gl, programInfo, buffers, textured) {
  if (textured) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
    const locs = texCoordLocations(programInfo);
    for (let i = 0; i < 4; i++) {
      const loc = locs[i];
      if (loc === -1) continue;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 8 * 4, i * 2 * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
  }

  const colorLoc = programInfo.attribLocations.instanceColor;
  if (colorLoc !== undefined && colorLoc !== -1) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(colorLoc, 1);
  }

  // A mat4 attribute occupies four consecutive vec4 locations.
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.matrix);
  const matrixLoc = programInfo.attribLocations.instanceMatrix;
  for (let i = 0; i < 4; i++) {
    const loc = matrixLoc + i;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 16 * 4, i * 4 * 4);
    gl.vertexAttribDivisor(loc, 1);
  }
}

/**
 * @function unbindInstanceAttributes
 * @description Resets divisors and disables the attributes enabled by
 * bindInstanceAttributes, so later non-instanced draws are unaffected.
 * @param {WebGL2RenderingContext} gl
 * @param {{attribLocations: Object<string, number>}} programInfo
 * @param {boolean} textured
 */
export function unbindInstanceAttributes(gl, programInfo, textured) {
  const matrixLoc = programInfo.attribLocations.instanceMatrix;
  for (let i = 0; i < 4; i++) {
    gl.vertexAttribDivisor(matrixLoc + i, 0);
    gl.disableVertexAttribArray(matrixLoc + i);
  }

  const colorLoc = programInfo.attribLocations.instanceColor;
  if (colorLoc !== undefined && colorLoc !== -1) {
    gl.vertexAttribDivisor(colorLoc, 0);
    gl.disableVertexAttribArray(colorLoc);
  }

  if (textured) {
    for (const loc of texCoordLocations(programInfo)) {
      if (loc === -1) continue;
      gl.vertexAttribDivisor(loc, 0);
      gl.disableVertexAttribArray(loc);
    }
  }
}
