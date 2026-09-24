export default Drawable;
export type DrawableOptions = {
    /**
     * - The WebGL rendering context
     */
    gl?: WebGLRenderingContext;
    /**
     * - The program information
     */
    programInfo?: any;
    /**
     * - The vertices buffer
     */
    verticesBuffer?: WebGLBuffer;
    /**
     * - The texture coordinate buffer
     */
    texCoordBuffer?: WebGLBuffer;
    /**
     * - The vertices of the object
     */
    vertices?: any[];
    /**
     * - Whether to use a texture
     */
    useTexture?: boolean;
    /**
     * - The path to the texture
     */
    texturePath?: string;
    /**
     * - The width of the frame
     */
    frameWidth?: number;
    /**
     * - The height of the frame
     */
    frameHeight?: number;
    /**
     * - The number of frames per row
     */
    framesPerRow?: number;
    /**
     * - The total number of frames
     */
    totalFrames?: number;
    /**
     * - The speed of the animation
     */
    animationSpeed?: number;
    /**
     * - Whether to autoplay the animation
     */
    autoplay?: boolean;
    /**
     * - Whether to use pixel art
     */
    pixelart?: boolean;
    /**
     * - Whether to use lighting
     */
    useLighting?: boolean;
};
/**
 * @typedef {Object} DrawableOptions
 * @property {WebGLRenderingContext} [gl] - The WebGL rendering context
 * @property {Object} [programInfo] - The program information
 * @property {WebGLBuffer} [verticesBuffer] - The vertices buffer
 * @property {WebGLBuffer} [texCoordBuffer] - The texture coordinate buffer
 * @property {Array} [vertices] - The vertices of the object
 * @property {boolean} [useTexture=false] - Whether to use a texture
 * @property {string} [texturePath=""] - The path to the texture
 * @property {number} [frameWidth=0] - The width of the frame
 * @property {number} [frameHeight=0] - The height of the frame
 * @property {number} [framesPerRow=1] - The number of frames per row
 * @property {number} [totalFrames=1] - The total number of frames
 * @property {number} [animationSpeed=1000] - The speed of the animation
 * @property {boolean} [autoplay=true] - Whether to autoplay the animation
 * @property {boolean} [pixelart=false] - Whether to use pixel art
 * @property {boolean} [useLighting=true] - Whether to use lighting
 */
/**
 * @class Drawable
 * @description A class that represents a drawable object
 * @param {DrawableOptions} [options] - Configuration for the drawable
 */
declare class Drawable {
    constructor({ gl, programInfo, verticesBuffer, texCoordBuffer, vertices, useTexture, texturePath, frameWidth, frameHeight, framesPerRow, totalFrames, animationSpeed, autoplay, pixelart, useLighting, }?: {
        gl?: any;
        programInfo?: any;
        verticesBuffer?: any;
        texCoordBuffer?: any;
        vertices?: any;
        useTexture?: boolean;
        texturePath?: string;
        frameWidth?: number;
        frameHeight?: number;
        framesPerRow?: number;
        totalFrames?: number;
        animationSpeed?: number;
        autoplay?: boolean;
        pixelart?: boolean;
        useLighting?: boolean;
    });
    gl: any;
    programInfo: any;
    id: string;
    verticesBuffer: any;
    texCoordBuffer: any;
    vertices: any;
    color: vec4;
    texturePath: string;
    texture: WebGLTexture;
    useTexture: boolean;
    pixelart: boolean;
    /** @private */
    private _texRetained;
    frameWidth: number;
    frameHeight: number;
    framesPerRow: number;
    totalFrames: number;
    currentFrame: number;
    animationSpeed: number;
    lastFrameTime: number;
    textureWidth: number;
    textureHeight: number;
    isPlaying: boolean;
    playOnce: boolean;
    originalTexture: WebGLTexture;
    mirrored: boolean;
    flippedY: boolean;
    /** @private */
    private _pivotX;
    /** @private */
    private _pivotY;
    animationType: string;
    currentAnimationArray: any[];
    currentAnimationIndex: number;
    shouldRevertAfterPlayingOnce: boolean;
    revertAnimation: any[];
    parentObject: any;
    isActive: boolean;
    isWireframe: boolean;
    /** @type {Function} */
    callbackFunction: Function;
    useLighting: boolean;
    /** @private */
    private _objectTransformMatrix;
    /** @private */
    private _finalTransformMatrix;
    /** @private */
    private _scratchPos;
    /** @private */
    private _scratchScale;
    /** @private */
    private _scratchPivot;
    /** @private */
    private _lastTexFrame;
    /** @private */
    private _lastMirrored;
    /** @private */
    private _lastFlippedY;
    /** @private */
    private _wireframeBuffer;
    blendMode: string;
    /** @private */
    private _region;
    /** @private */
    private _lastRegion;
    material: Material;
    /**
     * @method setMaterial
     * @description Assigns a custom Material (fragment shader) to this drawable,
     * or pass null to revert to the standard shader.
     * @param {Material|null} material
     */
    setMaterial(material: Material | null): void;
    /**
     * @method setBlendMode
     * @description Sets the blend mode ("normal", "additive", "multiply").
     * @param {string} mode - The blend mode
     */
    setBlendMode(mode: string): void;
    /**
     * @method setRegion
     * @description Sets a normalized UV sub-rect (for atlas frames). Values are
     * 0..1 with top-left origin. Pass nothing to clear.
     */
    setRegion(left: any, top: any, right: any, bottom: any): void;
    /**
     * @method setFlipX
     * @description Horizontally mirrors the sprite (e.g. to face left/right)
     * without touching the GameObject's scale.
     * @param {boolean} flip
     */
    setFlipX(flip: boolean): void;
    /**
     * @method setFlipY
     * @description Vertically mirrors the sprite.
     * @param {boolean} flip
     */
    setFlipY(flip: boolean): void;
    /**
     * @method getFlipX
     * @returns {boolean}
     */
    getFlipX(): boolean;
    /**
     * @method getFlipY
     * @returns {boolean}
     */
    getFlipY(): boolean;
    /**
     * @method setPivot
     * @description Sets the sprite's origin in normalized local space, where
     * (0,0) is the center (default), x runs -1 (left) .. 1 (right) and y runs
     * -1 (bottom) .. 1 (top). The chosen point is what sits on the GameObject's
     * position and acts as the rotation/scale center. Call with no args to reset
     * to centered.
     * @param {number} [x=0]
     * @param {number} [y=0]
     */
    setPivot(x?: number, y?: number): void;
    /**
     * @method setAnchor
     * @description Convenience wrapper around setPivot using 0..1 anchor
     * coordinates with a top-left origin (CSS-style): (0.5,0.5) = center,
     * (0.5,1) = bottom-center, (0,0) = top-left.
     * @param {number} [ax=0.5]
     * @param {number} [ay=0.5]
     */
    setAnchor(ax?: number, ay?: number): void;
    /**
     * @method setIsWireframe
     * @description Sets the wireframe mode
     * @param {boolean} bool - Whether to enable wireframe mode
     */
    setIsWireframe(bool: boolean): void;
    /**
     * @method setUseLighting
     * @description Sets the lighting mode
     * @param {boolean} useLighting - Whether to enable lighting reaction
     */
    setUseLighting(useLighting: boolean): void;
    /**
     * @method setIsActive
     * @description Sets the active state
     * @param {boolean} bool - Whether to enable the active state
     */
    setIsActive(bool: boolean): void;
    /**
     * @method setParent
     * @description Sets the parent object
     * @param {Object} parent - The parent object
     */
    setParent(parent: any): void;
    /**
     * @method getParent
     * @description Gets the parent object
     * @returns {Object} - The parent object
     */
    getParent(): any;
    /**
     * @method setColor
     * @description Sets the color of the object
     * @param {Color} color - The color to set
     */
    setColor(color: Color): void;
    /**
     * @method initTexture
     * @description Initializes the texture
     */
    initTexture(): Promise<void>;
    /**
     * @method dispose
     * @description Frees this drawable's GPU resources: its vertex/texcoord
     * buffers and its reference on the shared texture (the GL texture itself is
     * deleted when the last drawable using it is disposed). Call it when the
     * owning object is permanently removed. GameObject.destroy() and
     * Scene.remove(obj, { dispose: true }) do it for you. Safe to call twice.
     */
    dispose(): void;
    /**
     * @method updateAnimation
     * @description Updates the animation
     * @param {number} currentTime - The current time
     */
    updateAnimation(currentTime: number): void;
    /**
     * @method getAnimation
     * @description Gets the animation
     * @returns {Array|string|null} - The animation
     */
    getAnimation(): any[] | string | null;
    /**
     * @method _startFrames
     * @description Starts a frame-list animation: the first frame shows
     * immediately (instead of the previous animation's leftover frame until the
     * first tick) and the next one follows after one full `animationSpeed`.
     * @private
     */
    private _startFrames;
    /**
     * @method playAnimation
     * @description Plays an animation
     * @param {Array} animation - The animation to play
     * @param {number} animationSpeed - The speed of the animation
     */
    playAnimation(animation: any[], animationSpeed?: number): void;
    /**
     * @method setFrame
     * @description Sets the frame
     * @param {number} frame - The frame to set
     */
    setFrame(frame: number): void;
    /**
     * @method playAnimationOnce
     * @description Plays an animation once
     * @param {Array} animation - The animation to play
     * @param {Array} defaultAnimation - The default animation
     * @param {number} animationSpeed - The speed of the animation
     * @param {function} callbackFunction - The callback function
     */
    playAnimationOnce(animation: any[], defaultAnimation?: any[], animationSpeed?: number, callbackFunction?: Function): void;
    /**
     * @method stopAnimation
     * @description Stops the animation
     */
    stopAnimation(): void;
    /**
     * @method getFrameUV
     * @description Computes this drawable's current normalized UV rect,
     * honoring the active frame/region and the mirrored/flippedY flags. Pure
     * (no GL calls, no cache bookkeeping) so it can be called from draw() and
     * from external batched-rendering paths that need the same UVs without
     * owning their own texcoord buffer.
     * @returns {{left: number, right: number, top: number, bottom: number}}
     */
    getFrameUV(): {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
    /**
     * @method draw
     * @description Draws the object
     * @param {mat4} globalViewMatrix - The global view matrix
     * @param {WebGLUniformLocation} uniformLocation - The uniform location
     * @param {number} currentTime - The current time
     * @param {Object} objectTransform - The object transform
     */
    draw(globalViewMatrix: mat4, uniformLocation: WebGLUniformLocation, currentTime: number, objectTransform: any): void;
}
import { vec4 } from "gl-matrix";
import type Material from "./Material.js";
import Color from "./Color.js";
import { mat4 } from "gl-matrix";
