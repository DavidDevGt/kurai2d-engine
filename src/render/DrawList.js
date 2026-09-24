import Drawable from "../Drawable.js";
import Texture from "../Texture.js";
import InstancedTexture from "../InstancedTexture.js";

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
export function textureSortKey(object) {
  const drawable = object.getComponent(Drawable);
  return drawable && drawable.useTexture
    ? drawable.texturePath + "|" + (drawable.pixelart ? 1 : 0)
    : "";
}

/**
 * @function buildDrawOrder
 * @description Fills `order` with the scene's objects sorted by layer, then z,
 * then texture. Reuses the `order` array to avoid a per-frame allocation.
 * @param {Array} order - Scratch array, overwritten
 * @param {Array} objects - Scene objects
 * @returns {Array} - `order`
 */
export function buildDrawOrder(order, objects) {
  order.length = objects.length;
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    order[i] = obj;
    obj._sortTexKey = textureSortKey(obj);
  }
  order.sort(
    (a, b) =>
      (a.layer || 0) - (b.layer || 0) ||
      a.transform.position.z - b.transform.position.z ||
      (a._sortTexKey < b._sortTexKey
        ? -1
        : a._sortTexKey > b._sortTexKey
          ? 1
          : 0)
  );
  return order;
}

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
export function isVisible(object, left, right, bottom, top) {
  if (!object || !object.transform) return true;
  if (object.alwaysVisible) return true;
  if (object.transform.parent) return true;
  if (object.getComponent && object.getComponent(InstancedTexture)) {
    return true;
  }

  const pos = object.transform.position;
  const scale = object.transform.scale;
  const half = Math.max(Math.abs(scale.x), Math.abs(scale.y)) * 1.5;

  return !(
    pos.x + half < left ||
    pos.x - half > right ||
    pos.y + half < bottom ||
    pos.y - half > top
  );
}

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
export function isAutoBatchable(drawable) {
  return (
    Object.getPrototypeOf(drawable) === Texture.prototype &&
    drawable.useTexture &&
    !!drawable.texture &&
    !drawable.isWireframe &&
    !drawable.material &&
    !drawable.useLighting &&
    drawable.blendMode === "normal" &&
    !drawable._hasPivot
  );
}

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
export function queueBatchedDraw(batch, drawable, object, now) {
  drawable.updateAnimation(now);
  const uv = drawable.getFrameUV();

  const transform = object.transform.parent
    ? object.transform.getWorldTransform()
    : object.transform;
  const x = drawable.pixelart
    ? Math.round(transform.position.x)
    : transform.position.x;
  const y = drawable.pixelart
    ? Math.round(transform.position.y)
    : transform.position.y;

  const parentOpacity =
    typeof object.opacity === "number"
      ? Math.max(0, Math.min(1, object.opacity))
      : 1.0;

  batch.draw({
    texture: drawable.texture,
    x,
    y,
    w: transform.scale.x * 2,
    h: transform.scale.y * 2,
    rotation: transform.rotation,
    u0: uv.right,
    v0: uv.bottom,
    u1: uv.left,
    v1: uv.top,
    r: drawable.color[0],
    g: drawable.color[1],
    b: drawable.color[2],
    a: drawable.color[3] * parentOpacity,
  });
}
