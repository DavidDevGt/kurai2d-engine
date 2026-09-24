export default ParticleSettings;
/**
 * @class ParticleSettings
 * @description Represents the settings for a particle system
 * @param {number} lifetime - The lifetime of the particle
 * @param {Vector2} velocity - The velocity of the particle
 * @param {Vector2} gravity - The gravity of the particle
 * @param {number} amount - The amount of particles
 * @param {Vector2} direction - The direction of the particle
 * @param {number} spread - The spread of the particle
 * @param {number} emissionRate - The emission rate of the particle
 * @param {number} frame - The frame of the particle
 * @param {number} offset - The offset of the particle
 * @param {number} rotation - The rotation of the particle
 * @param {Vector2} scale - The scale of the particle
 * @param {{frames: number[], speed: number}} animation - The animation of the particle
 */
declare class ParticleSettings {
    /**
     * @param {Object} [settings]
     * @param {number} [settings.lifetime=1]
     * @param {Vector2} [settings.velocity]
     * @param {Vector2} [settings.gravity]
     * @param {number} [settings.amount=10]
     * @param {Vector2} [settings.direction]
     * @param {number} [settings.spread=Math.PI/4]
     * @param {number} [settings.emissionRate=Infinity]
     * @param {number} [settings.frame]
     * @param {number} [settings.offset]
     * @param {number} [settings.rotation]
     * @param {Vector2} [settings.scale]
     * @param {{frames: number[], speed: number}} [settings.animation]
     * @param {string} [settings.shape="cone"]
     * @param {number} [settings.shapeRadius=0]
     * @param {Vector2} [settings.shapeSize]
     * @param {Array|Function|null} [settings.scaleOverLife]
     * @param {Array|Function|null} [settings.alphaOverLife]
     * @param {Array|Function|null} [settings.colorOverLife]
     * @param {number} [settings.rotationSpeed=0]
     * @param {number} [settings.drag=0]
     */
    constructor({ lifetime, velocity, gravity, amount, direction, spread, emissionRate, frame, offset, rotation, scale, animation, shape, shapeRadius, shapeSize, scaleOverLife, alphaOverLife, colorOverLife, rotationSpeed, drag, }?: {
        lifetime?: number;
        velocity?: Vector2;
        gravity?: Vector2;
        amount?: number;
        direction?: Vector2;
        spread?: number;
        emissionRate?: number;
        frame?: number;
        offset?: number;
        rotation?: number;
        scale?: Vector2;
        animation?: {
            frames: number[];
            speed: number;
        };
        shape?: string;
        shapeRadius?: number;
        shapeSize?: Vector2;
        scaleOverLife?: any[] | Function | null;
        alphaOverLife?: any[] | Function | null;
        colorOverLife?: any[] | Function | null;
        rotationSpeed?: number;
        drag?: number;
    });
    lifetime: number;
    velocity: Vector2;
    gravity: Vector2;
    amount: number;
    direction: Vector2;
    spread: number;
    emissionRate: number;
    frame: number;
    offset: number;
    rotation: number;
    scale: Vector2;
    animation: {
        frames: number[];
        speed: number;
    };
    shape: string;
    shapeRadius: number;
    shapeSize: Vector2;
    scaleOverLife: Function | any[];
    alphaOverLife: Function | any[];
    colorOverLife: Function | any[];
    rotationSpeed: number;
    drag: number;
}
import { Vector2 } from "../Physics.js";
