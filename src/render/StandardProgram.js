import {
  STANDARD_FRAGMENT_SHADER,
  STANDARD_VERTEX_SHADER,
} from "../Shaders.js";
import { initShaderProgram } from "../GLUtils.js";

/**
 * Uniform names of the standard program, keyed by the name the engine uses
 * to look them up in `programInfo.uniformLocations`.
 * @private
 */
const UNIFORMS = {
  projectionMatrix: "uProjectionMatrix",
  globalViewMatrix: "uModelViewMatrix",
  instancedModelViewMatrix: "uInstancedModelViewMatrix",
  uModelMatrix: "uModelMatrix",
  uInstancedModelMatrix: "uInstancedModelMatrix",
  uAmbientLightValues: "uAmbientLightValues",
  uSampler: "uSampler",
  color: "uColor",
  useTexture: "useTexture",
  useInstances: "useInstances",
  useText: "useText",
  useLighting: "uUseLighting",
  uOpacity: "uOpacity",
  uLightPosition: "uLightPosition",
  uLightColor: "uLightColor",
  uLightIntensity: "uLightIntensity",
  uLightRadius: "uLightRadius",
  uActiveLights: "uActiveLights",
  uDirLightPosition: "uDirLightPosition",
  uDirLightDirection: "uDirLightDirection",
  uDirLightColor: "uDirLightColor",
  uDirLightIntensity: "uDirLightIntensity",
  uDirLightWidth: "uDirLightWidth",
  uActiveDirLights: "uActiveDirLights",
};

/**
 * Attribute names of the standard program, keyed like `UNIFORMS`.
 * @private
 */
const ATTRIBUTES = {
  vertexPosition: "aVertexPosition",
  aTexCoord: "aTextureCoord",
  instanceMatrix: "aInstanceMatrix0",
  instanceTexCoord0: "aInstanceTexCoord0",
  instanceTexCoord1: "aInstanceTexCoord1",
  instanceTexCoord2: "aInstanceTexCoord2",
  instanceTexCoord3: "aInstanceTexCoord3",
  instanceColor: "aInstanceColor",
};

/**
 * @function createStandardProgramInfo
 * @description Compiles the engine's standard shader program and caches every
 * attribute and uniform location the draw paths use. Called when an engine is
 * created and again after a WebGL context loss is restored.
 * @param {WebGL2RenderingContext} gl
 * @returns {{program: WebGLProgram, attribLocations: Object<string, number>,
 *   uniformLocations: Object<string, WebGLUniformLocation>}}
 */
export function createStandardProgramInfo(gl) {
  const program = initShaderProgram(
    gl,
    STANDARD_VERTEX_SHADER,
    STANDARD_FRAGMENT_SHADER
  );
  /** @type {Object<string, number>} */
  const attribLocations = {};
  for (const key in ATTRIBUTES) {
    attribLocations[key] = gl.getAttribLocation(program, ATTRIBUTES[key]);
  }
  /** @type {Object<string, WebGLUniformLocation>} */
  const uniformLocations = {};
  for (const key in UNIFORMS) {
    uniformLocations[key] = gl.getUniformLocation(program, UNIFORMS[key]);
  }
  return { program, attribLocations, uniformLocations };
}
