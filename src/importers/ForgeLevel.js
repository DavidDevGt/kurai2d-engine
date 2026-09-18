import GameObject from "../components/GameObject.js";
import Instance from "../Instance.js";
import InstancedTexture from "../InstancedTexture.js";
import RigidBody from "../components/RigidBody.js";
import BoxCollider from "../components/BoxCollider.js";
import PolygonCollider from "../components/PolygonCollider.js";
import { Vector2, Vector3 } from "../Physics.js";

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
 * @example
 * import level from "./level.json";
 * const map = ForgeLevel.load(level, { scene, physics, filter: LAYERS.ground });
 * emerald.setBackgroundColor(Color.fromHex(map.background));
 */

/** Tiled-compatible flip flags, packed into the high bits of a gid. */
const FLIP_H = 0x80000000;
const FLIP_V = 0x40000000;
const FLIP_D = 0x20000000;
const GID_MASK = 0x1fffffff;

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
  static load(data, options = {}) {
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
     * Emerald's y axis points up, so the row term is subtracted.
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
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const raw = layer.data[row * cols + col];
        if (!raw) continue;

        const gid = raw & GID_MASK;
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
          flipH: (raw & FLIP_H) !== 0,
          flipV: (raw & FLIP_V) !== 0,
          flipD: (raw & FLIP_D) !== 0,
        });
      }
    }

    const built = [];
    for (const [tileset, cells] of buckets) {
      const instanced = new InstancedTexture(
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
        `${layer.name || "layer"}:${tileset.name}`,
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
          0
        );
        if (cell.flipD) {
          console.warn(
            "[ForgeLevel] Diagonal tile flips are not supported; tile left unrotated."
          );
        }
        instance.setTexCoords(
          ForgeLevel.tileTexCoords(tileset, cell.index, cell.flipH, cell.flipV)
        );
        instanced.addInstance(instance);
      }

      instanced.setStatic(true);

      built.push({
        gameObject,
        instanced,
        tileset,
        layer,
        count: cells.length,
        depth,
        parallax: { x: layer.parallaxX ?? 1, y: layer.parallaxY ?? 1 },
      });

      if ((layer.parallaxX ?? 1) !== 1 || (layer.parallaxY ?? 1) !== 1) {
        console.warn(
          `[ForgeLevel] Layer "${layer.name}" requests parallax ` +
            `(${layer.parallaxX}, ${layer.parallaxY}); scroll it yourself against the camera.`
        );
      }
    }

    return built;
  }

  /**
   * @method tileTexCoords
   * @description UV quad for one tile of an atlas, in the corner order
   * `Drawable.getFrameTexCoords` uses: (R,B) (L,B) (R,T) (L,T). Coordinates are
   * inset by half a texel so neighbouring tiles never bleed into each other,
   * and the v axis is flipped because GL samples from the bottom up.
   * @param {Object} tileset - A Forge tileset entry
   * @param {number} index - Tile index within the tileset
   * @param {boolean} [flipH=false]
   * @param {boolean} [flipV=false]
   * @returns {number[]} - 8 UV floats
   */
  static tileTexCoords(tileset, index, flipH = false, flipV = false) {
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

    const ix = 0.5 / imageW;
    const iy = 0.5 / imageH;

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
      cell &&
      cell.bounds.w > 0.99 &&
      cell.bounds.h > 0.99 &&
      cell.bounds.x < 0.01 &&
      cell.bounds.y < 0.01;

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

    const localPoints = points.map(([px, py]) => {
      const worldX = originX + col * tileSize + px * tileSize;
      const worldY = originY - row * tileSize - py * tileSize;
      return { x: (worldX - centerX) / scale, y: (worldY - centerY) / scale };
    });

    new PolygonCollider(
      body,
      localPoints,
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
