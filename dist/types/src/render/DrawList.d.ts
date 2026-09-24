/**
 * Per-frame draw list helpers: ordering, culling and auto-batching decisions.
 * None of these touch WebGL, so they can be tested with plain objects.
 */
/**
 * @function textureSortKey
 * @description Key that groups objects sharing a GPU texture, so the sort can
 * put them next to each other and cut texture switches. Objects without a
 * texture get "" and sort first within their layer and z.
 * @param {Object} object - A GameObject
 * @returns {string}
 */
export function textureSortKey(object: any): string;
/**
 * @function buildDrawOrder
 * @description Fills `order` with the scene's objects sorted by layer, then z,
 * then texture. Reuses the `order` array to avoid a per-frame allocation.
 * @param {Array} order - Scratch array, overwritten
 * @param {Array} objects - Scene objects
 * @returns {Array} - `order`
 */
export function buildDrawOrder(order: any[], objects: any[]): any[];
/**
 * @function isVisible
 * @description Conservative AABB visibility test against the view rectangle.
 * Instanced objects (whose instances spread beyond the owner transform),
 * parented objects and objects flagged `alwaysVisible` are never culled.
 * @param {Object} object - A GameObject
 * @param {number} left
 * @param {number} right
 * @param {number} bottom
 * @param {number} top
 * @returns {boolean}
 */
export function isVisible(object: any, left: number, right: number, bottom: number, top: number): boolean;
/**
 * @function isAutoBatchable
 * @description Whether a Drawable can be folded into the auto-batch instead
 * of issuing its own draw call: it must be a plain Texture (not a subclass
 * with its own draw() override, and not InstancedTexture, which already
 * batches via GPU instancing) with no feature the batch's minimal shader
 * can't reproduce - no custom material (different shader), no lighting
 * (the batch shader has no lighting terms), no wireframe mode, only the
 * default "normal" blend mode (the batch never touches blendFunc), and no
 * custom pivot (the batch's origin offset isn't rotated the way a pivoted
 * transform is, so it would place a rotated sprite incorrectly).
 * @param {Drawable} drawable
 * @returns {boolean}
 */
export function isAutoBatchable(drawable: Drawable): boolean;
/**
 * @function queueBatchedDraw
 * @description Queues one Texture object's current frame into a SpriteBatch,
 * reproducing the same position/rotation/scale/UV/tint/opacity math that
 * Drawable.draw() would have applied, so batched and unbatched rendering are
 * visually identical.
 * @param {import("../SpriteBatch.js").default} batch
 * @param {Drawable} drawable
 * @param {Object} object - The GameObject owning `drawable`
 * @param {number} now - Frame timestamp in ms (drives animation)
 */
export function queueBatchedDraw(batch: import("../SpriteBatch.js").default, drawable: Drawable, object: any, now: number): void;
import Drawable from "../Drawable.js";
