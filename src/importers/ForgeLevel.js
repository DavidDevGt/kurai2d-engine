import GameObject from "../components/GameObject.js";
import Instance from "../Instance.js";
import InstancedTexture from "../InstancedTexture.js";
import RigidBody from "../components/RigidBody.js";
import BoxCollider from "../components/BoxCollider.js";
import PolygonCollider from "../components/PolygonCollider.js";
import Behaviour from "../components/Behaviour.js";
import CameraManager from "../managers/CameraManager.js";
import { Vector2, Vector3 } from "../Physics.js";

/** @import Scene from "../Scene.js" */
/** @import { Physics } from "../Physics.js" */

/**
 * @class ParallaxLayer
 * @extends Behaviour
 * @description Shifts every instance of a tile layer by a fraction of how far
 * the active camera has moved since load, so a layer with `parallaxX/Y < 1`
 * scrolls slower than the world (a distant background) and `1` stays locked
 * to it (the default, ordinary foreground). Attached automatically by
 * {@link ForgeLevel} to any layer whose Forge parallax factors aren't `1`.
 * @private
 */
class ParallaxLayer extends Behaviour {
  constructor(instanced, basePositions, parallaxX, parallaxY) {
    super();
    this.instanced = instanced;
    this.basePositions = basePositions;
    this.parallaxX = parallaxX;
    this.parallaxY = parallaxY;
    this.origin = null;
  }

  start() {
    const camera = CameraManager.getCamera();
    const pos =
      camera && camera.getPosition ? camera.getPosition() : { x: 0, y: 0 };
    this.origin = { x: pos.x, y: pos.y };
  }

  update() {
    const camera = CameraManager.getCamera();
    if (!camera || !camera.getPosition || !this.origin) return;
    const pos = camera.getPosition();
    const dx = (pos.x - this.origin.x) * (1 - this.parallaxX);
    const dy = (pos.y - this.origin.y) * (1 - this.parallaxY);
    if (dx === 0 && dy === 0) return;

    const instances = this.instanced.instances;
    for (let i = 0; i < instances.length; i++) {
      const base = this.basePositions[i];
      instances[i].transform.position.x = base.x + dx;
      instances[i].transform.position.y = base.y + dy;
    }
    this.instanced.markDirty();
  }
}

/**
 * @class AnimatedTiles
 * @extends InstancedTexture
 * @description The instanced batch for one Forge animation: every cell painted
 * with that animation, each playing its frame list from the level file. Frames
 * are tile indices into the tileset atlas, so UVs come from
 * {@link ForgeLevel.tileTexCoords} (margins and spacing included).
 * @private
 */
class AnimatedTiles extends InstancedTexture {
  constructor(tileset, count, pixelart) {
    super(tileset.image, count, 0, 0, 1, 1, 0, false, pixelart, false);
    this.tileset = tileset;
  }

  updateInstanceTexCoords(index) {
    const instance = this.instances[index];
    if (!instance) return;
    this.instanceTexCoords.set(
      ForgeLevel.tileTexCoords(
        this.tileset,
        instance.frame,
        instance._flipH === true,
        instance._flipV === true,
        this.pixelart
      ),
      index * 8
    );
  }
}

/** Twice the signed area of triangle (a,b,c); positive when a→b→c turns left. */
function cross([ax, ay], [bx, by], [cx, cy]) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

/** True if every turn around the polygon bends the same way (collinear runs are ignored). */
function isConvex(points) {
  if (points.length < 4) return true;
  let sign = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const c = points[(i + 2) % points.length];
    const turn = cross(a, b, c);
    if (Math.abs(turn) < 1e-9) continue;
    const s = turn > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

function pointInTriangle(p, a, b, c) {
  const d1 = cross(a, b, p);
  const d2 = cross(b, c, p);
  const d3 = cross(c, a, p);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/**
 * @function triangulate
 * @description Ear-clipping triangulation of a simple polygon (no holes,
 * no self-intersections). Concave collider shapes are decomposed this way
 * into triangles, since the physics engine's PolygonShape only accepts
 * convex point sets and would otherwise silently collapse to their convex
 * hull, discarding the concave part.
 * @param {Array<[number,number]>} points
 * @returns {Array<Array<[number,number]>>} - Each entry is a 3-point triangle
 */
function triangulate(points) {
  const ordered = signedArea(points) < 0 ? [...points].reverse() : points;
  const indices = ordered.map((_, i) => i);
  const triangles = [];

  let guard = 0;
  while (indices.length > 3 && guard++ < indices.length * indices.length) {
    let clipped = false;
    for (let i = 0; i < indices.length; i++) {
      const i0 = indices[(i - 1 + indices.length) % indices.length];
      const i1 = indices[i];
      const i2 = indices[(i + 1) % indices.length];
      const a = ordered[i0],
        b = ordered[i1],
        c = ordered[i2];
      if (cross(a, b, c) <= 1e-9) continue;

      const containsOther = indices.some(
        (idx) =>
          idx !== i0 &&
          idx !== i1 &&
          idx !== i2 &&
          pointInTriangle(ordered[idx], a, b, c)
      );
      if (containsOther) continue;

      triangles.push([a, b, c]);
      indices.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (indices.length === 3) {
    triangles.push(indices.map((i) => ordered[i]));
  }
  return triangles;
}

/**
 * @class ForgeLevel
 * @description Imports an Emerald Tile Forge level export (`level.json`).
 *
 * Each tile layer is drawn as **one draw call**: a single {@link InstancedTexture}
 * whose instances each carry their own UV quad via `Instance.setTexCoords`, so
 * tiles can be sliced out of an atlas with margins, spacing and per-tile flips
 * without ever switching textures.
 *
 * Solid tiles become static physics bodies. Runs of horizontally adjacent
 * full-tile colliders are merged into one box each, so an 18-tile floor costs
 * one body instead of eighteen. A tile whose collider is a shape other than
 * the full tile (a ramp, a wedge) gets a real {@link PolygonCollider} built
 * from that shape's own points, not a bounding-box approximation.
 *
 * Physics is optional. Omit `physics` and no colliders are built, which is all
 * a purely visual level needs. To get collisions, pass a `Physics` engine and,
 * if you use collision layers, a `filter` naming the layer the level's tiles
 * live on.
 *
 * Animated tiles painted in Forge play automatically, and solid ones become
 * colliders like any other solid tile. Entity markers (spawns, coins, ...) are
 * returned as `map.objects` for your game to place.
 *
 * @example
 * // Visual level only: no physics, no collision layers.
 * import level from "./level.json";
 * const map = ForgeLevel.load(level, { scene });
 * engine.setBackgroundColor(Color.fromHex(map.background));
 *
 * @example
 * // With collisions: define the layers first, then filter the level's colliders.
 * CollisionLayers.define("ground", "player");
 * const map = ForgeLevel.load(level, {
 *   scene,
 *   physics,
 *   filter: { category: "ground", collidesWith: "all" },
 * });
 */

/** Tiled-compatible flip flags, packed into the high bits of a gid. */
const FLIP_H = 0x80000000;
const FLIP_V = 0x40000000;
const FLIP_D = 0x20000000;
const GID_MASK = 0x1fffffff;

/** Forge stores an animated tile cell as this base plus the animation's `aid`. */
const ANIM_BASE = 1000000;

/** The collider of a solid animated tile: the whole cell. */
const FULL_TILE = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

class ForgeLevel {
  /**
   * @method load
   * @description Builds renderable and collidable objects from a Forge export.
   * @param {Object} data - The parsed `level.json`
   * @param {Object} options
   * @param {Scene} options.scene - Scene to add the layer objects to
   * @param {Physics} [options.physics] - Physics engine; omit to skip colliders
   * @param {Object} [options.filter] - Collision filter spec for the colliders
   * @param {Object} [options.ownerObject] - Owner reported by collision events
   * @param {boolean} [options.pixelart=true] - NEAREST filtering for the atlas
   * @param {string} [options.layerOrder="top-first"] - Whether `layers[0]` is
   *   the topmost layer ("top-first") or the bottommost ("bottom-first")
   * @returns {Object} - `{ tileSize, cols, rows, width, height, background,
   *   bounds, layers, colliders, objects, entityTypes, toWorld }`
   */
  static load(data, options = /** @type {any} */ ({})) {
    const {
      scene,
      physics = null,
      filter = null,
      ownerObject = null,
      pixelart = true,
      layerOrder = "top-first",
    } = options;

    const tileSize = data.tileSize;
    const cols = data.cols;
    const rows = data.rows;

    const originX = -(cols * tileSize) / 2;
    const originY = (rows * tileSize) / 2;

    /**
     * Grid cell -> world centre. Forge counts rows downwards from the top;
     * Kurai2D's y axis points up, so the row term is subtracted.
     */
    const toWorld = (col, row) => ({
      x: originX + (col + 0.5) * tileSize,
      y: originY - (row + 0.5) * tileSize,
    });

    const layers = [];
    const colliders = [];
    const objects = [];
    let tileLayerIndex = 0;

    for (const layer of data.layers) {
      if (layer.visible === false) continue;

      if (layer.type === "object") {
        objects.push(...ForgeLevel._readObjects(layer, { toWorld, tileSize }));
        continue;
      }

      if (layer.type !== "tile") {
        console.warn(
          `[ForgeLevel] Skipping layer "${layer.name}" of unsupported type "${layer.type}".`
        );
        continue;
      }

      const depth =
        layerOrder === "bottom-first" ? tileLayerIndex : -tileLayerIndex;

      const built = ForgeLevel._buildTileLayer(data, layer, {
        cols,
        rows,
        tileSize,
        toWorld,
        pixelart,
        depth,
      });
      tileLayerIndex++;
      for (const object of built) {
        if (scene) scene.add(object.gameObject);
        layers.push(object);
      }
    }

    if (physics) {
      colliders.push(
        ...ForgeLevel._buildColliders(data, {
          cols,
          rows,
          tileSize,
          physics,
          filter,
          ownerObject,
        })
      );
    }

    return {
      tileSize,
      cols,
      rows,
      width: cols * tileSize,
      height: rows * tileSize,
      background: data.background,
      bounds: {
        minX: originX,
        maxX: originX + cols * tileSize,
        minY: originY - rows * tileSize,
        maxY: originY,
      },
      layers,
      colliders,
      objects,
      entityTypes: data.entityTypes || [],
      toWorld,
    };
  }

  /**
   * @method _readObjects
   * @description Converts one object layer's entries from grid cells to world
   * space. An object's `x`/`y` is its top-left cell and `w`/`h` its size in
   * cells, so a 1x1 object resolves to that cell's centre.
   * @returns {Array<Object>} - `{ type, name, x, y, width, height, props, layer, cell }`
   * @private
   */
  static _readObjects(layer, { toWorld, tileSize }) {
    const out = [];
    for (const object of layer.objects || []) {
      const w = object.w ?? 1;
      const h = object.h ?? 1;
      const centre = toWorld(object.x + (w - 1) / 2, object.y + (h - 1) / 2);
      out.push({
        type: object.type || "",
        name: object.name || object.type || "object",
        x: centre.x,
        y: centre.y,
        width: w * tileSize,
        height: h * tileSize,
        props: object.props || {},
        layer: layer.name,
        cell: { col: object.x, row: object.y },
      });
    }
    return out;
  }

  /**
   * @method _buildTileLayer
   * @description Turns one tile layer into an InstancedTexture per tileset it
   * references (a texture switch is a new draw call, so tiles are grouped by
   * the atlas they come from).
   * @returns {Array<Object>} - `{ gameObject, instanced, tileset, layer, count }`
   * @private
   */
  static _buildTileLayer(data, layer, ctx) {
    const { cols, rows, tileSize, toWorld, pixelart, depth = 0 } = ctx;

    const buckets = new Map();
    const animBuckets = new Map();
    const warnedAnims = new Set();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const raw = layer.data[row * cols + col];
        if (!raw) continue;

        const gid = raw & GID_MASK;
        const flipH = (raw & FLIP_H) !== 0;
        const flipV = (raw & FLIP_V) !== 0;

        if (gid >= ANIM_BASE) {
          const animation = ForgeLevel._animationFor(data, gid);
          const animTileset =
            animation && data.tilesets[animation.tilesetIndex];
          if (!animTileset) {
            if (!warnedAnims.has(gid)) {
              warnedAnims.add(gid);
              console.warn(
                `[ForgeLevel] Animated tile ${gid} has no matching animation or tileset; skipped.`
              );
            }
            continue;
          }
          if (!animBuckets.has(animation)) {
            animBuckets.set(animation, { tileset: animTileset, cells: [] });
          }
          animBuckets.get(animation).cells.push({ col, row, flipH, flipV });
          continue;
        }

        const tileset = ForgeLevel._tilesetFor(data, gid);
        if (!tileset) {
          console.warn(`[ForgeLevel] gid ${gid} matches no tileset.`);
          continue;
        }
        if (!buckets.has(tileset)) buckets.set(tileset, []);
        buckets.get(tileset).push({
          col,
          row,
          index: gid - tileset.firstgid,
          flipH,
          flipV,
          flipD: (raw & FLIP_D) !== 0,
        });
      }
    }

    const groups = [];
    for (const [tileset, cells] of buckets) {
      groups.push({ tileset, cells, animation: null });
    }
    for (const [animation, { tileset, cells }] of animBuckets) {
      groups.push({ tileset, cells, animation });
    }

    const built = [];
    for (const { tileset, cells, animation } of groups) {
      const instanced = animation
        ? new AnimatedTiles(tileset, cells.length, pixelart)
        : new InstancedTexture(
            tileset.image,
            cells.length,
            0,
            0,
            1,
            1,
            0,
            false,
            pixelart,
            false
          );

      const gameObject = new GameObject(
        `${layer.name || "layer"}:${animation ? animation.name : tileset.name}`,
        new Vector3(0, 0, depth),
        0,
        new Vector2(1, 1)
      );
      gameObject.addComponent(instanced);
      if (layer.opacity != null) gameObject.setOpacity(layer.opacity);

      const half = tileSize / 2;
      for (const cell of cells) {
        const position = toWorld(cell.col, cell.row);
        const instance = new Instance(
          "tile",
          new Vector3(position.x, position.y, 0),
          new Vector2(half, half),
          0,
          animation ? animation.frames[0] : 0
        );
        if (animation) {
          instance._flipH = cell.flipH;
          instance._flipV = cell.flipV;
          instance.playAnimation(animation.frames, animation.speed);
        } else {
          if (cell.flipD) {
            console.warn(
              "[ForgeLevel] Diagonal tile flips are not supported; tile left unrotated."
            );
          }
          instance.setTexCoords(
            ForgeLevel.tileTexCoords(
              tileset,
              cell.index,
              cell.flipH,
              cell.flipV,
              pixelart
            )
          );
        }
        instanced.addInstance(instance);
      }

      instanced.setStatic(true);

      const parallaxX = layer.parallaxX ?? 1;
      const parallaxY = layer.parallaxY ?? 1;
      if (parallaxX !== 1 || parallaxY !== 1) {
        const basePositions = instanced.instances.map((inst) => ({
          x: inst.transform.position.x,
          y: inst.transform.position.y,
        }));
        gameObject.addComponent(
          new ParallaxLayer(instanced, basePositions, parallaxX, parallaxY)
        );
      }

      built.push({
        gameObject,
        instanced,
        tileset,
        layer,
        animation,
        count: cells.length,
        depth,
        parallax: { x: parallaxX, y: parallaxY },
      });
    }

    return built;
  }

  /**
   * @method tileTexCoords
   * @description UV quad for one tile of an atlas, in the corner order
   * `Drawable.getFrameTexCoords` uses: (R,B) (L,B) (R,T) (L,T). The v axis is
   * flipped because GL samples from the bottom up.
   *
   * With NEAREST filtering (`pixelart: true`, the default) tiles are meant to
   * sit flush against their neighbors, so no inset is applied: adjacent tiles
   * in the atlas never blend under NEAREST, and insetting would shrink every
   * tile by half a texel on each edge, leaving a visible sliver of the
   * neighboring tile's (or the background's) color at every seam. With LINEAR
   * filtering that half-texel bleed is real, so the inset is kept there.
   * @param {Object} tileset - A Forge tileset entry
   * @param {number} index - Tile index within the tileset
   * @param {boolean} [flipH=false]
   * @param {boolean} [flipV=false]
   * @param {boolean} [pixelart=true] - Whether the atlas is sampled with NEAREST
   * @returns {number[]} - 8 UV floats
   */
  static tileTexCoords(
    tileset,
    index,
    flipH = false,
    flipV = false,
    pixelart = true
  ) {
    const {
      imageW,
      imageH,
      tileW,
      tileH,
      columns,
      marginX = 0,
      marginY = 0,
      spacingX = 0,
      spacingY = 0,
    } = tileset;

    const col = index % columns;
    const row = Math.floor(index / columns);
    const px = marginX + col * (tileW + spacingX);
    const py = marginY + row * (tileH + spacingY);

    const ix = pixelart ? 0 : 0.5 / imageW;
    const iy = pixelart ? 0 : 0.5 / imageH;

    let uRight = (px + tileW) / imageW - ix;
    let uLeft = px / imageW + ix;
    let vTop = (imageH - py - tileH) / imageH + iy;
    let vBottom = (imageH - py) / imageH - iy;

    if (flipH) {
      const swap = uRight;
      uRight = uLeft;
      uLeft = swap;
    }
    if (flipV) {
      const swap = vTop;
      vTop = vBottom;
      vBottom = swap;
    }

    return [uRight, vBottom, uLeft, vBottom, uRight, vTop, uLeft, vTop];
  }

  /**
   * @method _animationFor
   * @description Finds the Forge animation an animated-tile gid refers to
   * (gid = ANIM_BASE + the animation's `aid`), or null if the file has none.
   * @private
   */
  static _animationFor(data, gid) {
    const aid = gid - ANIM_BASE;
    return (data.animations || []).find((a) => a.aid === aid) || null;
  }

  /**
   * @method _tilesetFor
   * @description Finds the tileset that owns a gid (the one with the largest
   * firstgid not greater than it).
   * @private
   */
  static _tilesetFor(data, gid) {
    let best = null;
    for (const tileset of data.tilesets) {
      if (
        gid >= tileset.firstgid &&
        (!best || tileset.firstgid > best.firstgid)
      ) {
        best = tileset;
      }
    }
    return best;
  }

  /**
   * @method _buildColliders
   * @description Creates static bodies for solid tiles. Full-tile colliders are
   * merged into horizontal runs, since BoxCollider is cheaper than a polygon
   * with the same 4 corners. A tile whose collider shape isn't the full tile
   * gets its own {@link PolygonCollider} built from that shape's actual
   * points, in world space, not a bounding-box stand-in.
   * @returns {Array<RigidBody>}
   * @private
   */
  static _buildColliders(data, ctx) {
    const { cols, rows, tileSize, physics, filter, ownerObject } = ctx;
    const scale = physics.getScale();
    const originX = -(cols * tileSize) / 2;
    const originY = (rows * tileSize) / 2;
    const bodies = [];
    let warnedDegenerate = false;

    const shapeAt = [];
    for (let row = 0; row < rows; row++) {
      shapeAt[row] = [];
      for (let col = 0; col < cols; col++) {
        shapeAt[row][col] = null;
        for (const layer of data.layers) {
          if (layer.type !== "tile") continue;
          const raw = layer.data[row * cols + col];
          if (!raw) continue;
          const gid = raw & GID_MASK;
          if (gid >= ANIM_BASE) {
            const animation = ForgeLevel._animationFor(data, gid);
            if (!animation || !animation.solid) continue;
            shapeAt[row][col] = {
              bounds: ForgeLevel._boundsOf(FULL_TILE),
              points: FULL_TILE,
            };
            break;
          }
          const tileset = ForgeLevel._tilesetFor(data, gid);
          if (!tileset || !tileset.colliders) continue;
          const shape = tileset.colliders[String(gid - tileset.firstgid)];
          if (!shape || !shape.wall) continue;
          shapeAt[row][col] = {
            bounds: ForgeLevel._boundsOf(shape.points),
            points: shape.points,
          };
          break;
        }
      }
    }

    const isFullTile = (cell) =>
      cell && Math.abs(signedArea(cell.points)) > 0.99;

    for (let row = 0; row < rows; row++) {
      let col = 0;
      while (col < cols) {
        const cell = shapeAt[row][col];
        if (!cell) {
          col++;
          continue;
        }

        if (!isFullTile(cell)) {
          try {
            bodies.push(
              ForgeLevel._staticPolygon(physics, {
                points: cell.points,
                originX,
                originY,
                col,
                row,
                tileSize,
                scale,
                filter,
                ownerObject,
              })
            );
          } catch (error) {
            if (!warnedDegenerate) {
              warnedDegenerate = true;
              console.warn(
                `[ForgeLevel] A tile collider shape is degenerate (${error.message}); using its bounding box instead.`
              );
            }
            const centerX =
              originX +
              col * tileSize +
              (cell.bounds.x + cell.bounds.w / 2) * tileSize;
            const centerY =
              originY -
              row * tileSize -
              (cell.bounds.y + cell.bounds.h / 2) * tileSize;
            bodies.push(
              ForgeLevel._staticBox(
                physics,
                centerX,
                centerY,
                (cell.bounds.w * tileSize) / 2,
                (cell.bounds.h * tileSize) / 2,
                scale,
                filter,
                ownerObject
              )
            );
          }
          col++;
          continue;
        }

        const runStart = col;
        while (col < cols && isFullTile(shapeAt[row][col])) col++;
        const runLength = col - runStart;
        const runWidth = runLength * tileSize;
        const centerX = originX + runStart * tileSize + runWidth / 2;
        const centerY = originY - (row + 0.5) * tileSize;

        bodies.push(
          ForgeLevel._staticBox(
            physics,
            centerX,
            centerY,
            runWidth / 2,
            tileSize / 2,
            scale,
            filter,
            ownerObject
          )
        );
      }
    }

    return bodies;
  }

  /**
   * @method _staticBox
   * @description Creates one static body with a box collider, in world pixels.
   * @private
   */
  static _staticBox(physics, x, y, halfW, halfH, scale, filter, ownerObject) {
    const body = new RigidBody(
      physics,
      "static",
      new Vector2(x, y),
      true,
      ownerObject
    );
    new BoxCollider(
      body,
      new Vector2(halfW / scale, halfH / scale),
      0,
      0.6,
      0,
      false,
      ownerObject,
      filter
    );
    return body;
  }

  /**
   * @method _staticPolygon
   * @description Creates one static body with a polygon collider built from a
   * tile's own collider shape. The body sits at the shape's bounding-box
   * centre; the polygon's points are converted from Forge's normalised,
   * top-down tile space into local physics units around that centre.
   *
   * The shape is decomposed into triangles first when it isn't convex: the
   * physics engine's PolygonShape only accepts convex point sets and would
   * otherwise silently reduce a concave outline to its convex hull. A convex
   * shape (the common case) still gets exactly one collider, unchanged.
   * @private
   */
  static _staticPolygon(physics, ctx) {
    const {
      points,
      originX,
      originY,
      col,
      row,
      tileSize,
      scale,
      filter,
      ownerObject,
    } = ctx;
    const bounds = ForgeLevel._boundsOf(points);
    const centerX =
      originX + col * tileSize + (bounds.x + bounds.w / 2) * tileSize;
    const centerY =
      originY - row * tileSize - (bounds.y + bounds.h / 2) * tileSize;

    const body = new RigidBody(
      physics,
      "static",
      new Vector2(centerX, centerY),
      true,
      ownerObject
    );

    const toLocal = ([px, py]) => {
      const worldX = originX + col * tileSize + px * tileSize;
      const worldY = originY - row * tileSize - py * tileSize;
      return { x: (worldX - centerX) / scale, y: (worldY - centerY) / scale };
    };

    const pieces = isConvex(points) ? [points] : triangulate(points);
    for (const piece of pieces) {
      new PolygonCollider(
        body,
        piece.map(toLocal),
        0,
        0.6,
        0,
        false,
        ownerObject,
        filter
      );
    }
    return body;
  }

  /**
   * @method _boundsOf
   * @description Normalised bounding box of a collider polygon.
   * @returns {{x:number, y:number, w:number, h:number}}
   * @private
   */
  static _boundsOf(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
}

export default ForgeLevel;
