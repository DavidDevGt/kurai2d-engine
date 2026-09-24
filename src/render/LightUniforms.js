/** Maximum lights of each kind the standard shader supports. */
export const MAX_LIGHTS = 4;

/**
 * @class LightUniforms
 * @description Packs ambient, point and directional lights into the standard
 * program's uniform arrays for one camera. The typed arrays are allocated
 * once and reused every frame.
 */
class LightUniforms {
  constructor() {
    this.ambient = new Float32Array(3);
    this.pointPositions = new Float32Array(MAX_LIGHTS * 2);
    this.pointColors = new Float32Array(MAX_LIGHTS * 3);
    this.pointIntensities = new Float32Array(MAX_LIGHTS);
    this.pointRadii = new Float32Array(MAX_LIGHTS);
    this.dirPositions = new Float32Array(MAX_LIGHTS * 2);
    this.dirDirections = new Float32Array(MAX_LIGHTS * 2);
    this.dirColors = new Float32Array(MAX_LIGHTS * 3);
    this.dirIntensities = new Float32Array(MAX_LIGHTS);
    this.dirWidths = new Float32Array(MAX_LIGHTS);
    this.pointCount = 0;
    this.dirCount = 0;
  }

  /**
   * @method pack
   * @description Fills the arrays for a camera. Light positions and sizes are
   * converted to the camera's zoomed view space, which is what the fragment
   * shader compares against.
   * @param {{x:number, y:number, z:number}} ambient
   * @param {Array} pointLights
   * @param {Array} directionalLights
   * @param {number} camX - Camera position x
   * @param {number} camY - Camera position y
   * @param {number} zoom - Camera zoom (scale.x)
   */
  pack(ambient, pointLights, directionalLights, camX, camY, zoom) {
    this.ambient[0] = ambient.x;
    this.ambient[1] = ambient.y;
    this.ambient[2] = ambient.z;

    const pointCount = Math.min(pointLights.length, MAX_LIGHTS);
    for (let i = 0; i < pointCount; i++) {
      const light = pointLights[i];
      this.pointPositions[i * 2] = (light.position.x + camX) * zoom;
      this.pointPositions[i * 2 + 1] = (light.position.y + camY) * zoom;
      this.pointColors[i * 3] = light.color.r / 255;
      this.pointColors[i * 3 + 1] = light.color.g / 255;
      this.pointColors[i * 3 + 2] = light.color.b / 255;
      this.pointIntensities[i] = light.intensity;
      this.pointRadii[i] = light.radius * zoom;
    }
    this.pointCount = pointCount;

    const dirCount = Math.min(directionalLights.length, MAX_LIGHTS);
    for (let i = 0; i < dirCount; i++) {
      const light = directionalLights[i];
      this.dirPositions[i * 2] = (light.position.x + camX) * zoom;
      this.dirPositions[i * 2 + 1] = (light.position.y + camY) * zoom;
      this.dirDirections[i * 2] = light.direction.x;
      this.dirDirections[i * 2 + 1] = light.direction.y;
      this.dirColors[i * 3] = light.color.r / 255;
      this.dirColors[i * 3 + 1] = light.color.g / 255;
      this.dirColors[i * 3 + 2] = light.color.b / 255;
      this.dirIntensities[i] = light.intensity;
      this.dirWidths[i] = light.width * zoom;
    }
    this.dirCount = dirCount;
  }

  /**
   * @method upload
   * @description Sends the packed arrays to the standard program. Array
   * uniforms are skipped when no light of that kind is active; the shader
   * only reads the first `uActive*` entries.
   * @param {WebGL2RenderingContext} gl
   * @param {Object<string, WebGLUniformLocation>} loc - Standard uniform locations
   */
  upload(gl, loc) {
    gl.uniform3fv(loc.uAmbientLightValues, this.ambient);
    if (this.pointCount > 0) {
      gl.uniform2fv(loc.uLightPosition, this.pointPositions);
      gl.uniform3fv(loc.uLightColor, this.pointColors);
      gl.uniform1fv(loc.uLightIntensity, this.pointIntensities);
      gl.uniform1fv(loc.uLightRadius, this.pointRadii);
    }
    gl.uniform1i(loc.uActiveLights, this.pointCount);

    if (this.dirCount > 0) {
      gl.uniform2fv(loc.uDirLightPosition, this.dirPositions);
      gl.uniform2fv(loc.uDirLightDirection, this.dirDirections);
      gl.uniform3fv(loc.uDirLightColor, this.dirColors);
      gl.uniform1fv(loc.uDirLightIntensity, this.dirIntensities);
      gl.uniform1fv(loc.uDirLightWidth, this.dirWidths);
    }
    gl.uniform1i(loc.uActiveDirLights, this.dirCount);
  }
}

export default LightUniforms;
