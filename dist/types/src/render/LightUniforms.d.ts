/** Maximum lights of each kind the standard shader supports. */
export const MAX_LIGHTS: 4;
export default LightUniforms;
/**
 * @class LightUniforms
 * @description Packs ambient, point and directional lights into the standard
 * program's uniform arrays for one camera. The typed arrays are allocated
 * once and reused every frame.
 */
declare class LightUniforms {
    ambient: Float32Array<ArrayBuffer>;
    pointPositions: Float32Array<ArrayBuffer>;
    pointColors: Float32Array<ArrayBuffer>;
    pointIntensities: Float32Array<ArrayBuffer>;
    pointRadii: Float32Array<ArrayBuffer>;
    dirPositions: Float32Array<ArrayBuffer>;
    dirDirections: Float32Array<ArrayBuffer>;
    dirColors: Float32Array<ArrayBuffer>;
    dirIntensities: Float32Array<ArrayBuffer>;
    dirWidths: Float32Array<ArrayBuffer>;
    pointCount: number;
    dirCount: number;
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
    pack(ambient: {
        x: number;
        y: number;
        z: number;
    }, pointLights: any[], directionalLights: any[], camX: number, camY: number, zoom: number): void;
    /**
     * @method upload
     * @description Sends the packed arrays to the standard program. Array
     * uniforms are skipped when no light of that kind is active; the shader
     * only reads the first `uActive*` entries.
     * @param {WebGL2RenderingContext} gl
     * @param {Object<string, WebGLUniformLocation>} loc - Standard uniform locations
     */
    upload(gl: WebGL2RenderingContext, loc: {
        [x: string]: WebGLUniformLocation;
    }): void;
}
