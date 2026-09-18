import { test } from "node:test";
import assert from "node:assert/strict";

import { Physics } from "../src/Physics.js";
import BoxCollider from "../src/components/BoxCollider.js";
import PolygonCollider from "../src/components/PolygonCollider.js";
import ForgeLevel from "../src/importers/ForgeLevel.js";

/**
 * A 2x1 tileset: tile 0 is a full-tile collider, tile 1 is a small triangle
 * well inside the tile's bounds (so its bounding box isn't the full tile).
 */
function twoTileData() {
  return {
    tileSize: 16,
    cols: 2,
    rows: 1,
    tilesets: [
      {
        firstgid: 1,
        name: "set",
        image: "set.png",
        imageW: 32,
        imageH: 16,
        tileW: 16,
        tileH: 16,
        columns: 2,
        colliders: {
          0: {
            wall: true,
            points: [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
            ],
          },
          1: {
            wall: true,
            points: [
              [0.1, 0.1],
              [0.9, 0.1],
              [0.1, 0.9],
            ],
          },
        },
      },
    ],
    layers: [
      { type: "tile", name: "ground", visible: true, data: [1, 2] },
      {
        type: "object",
        name: "entities",
        objects: [
          { type: "spawn", x: 0, y: 0 },
          { type: "coin", x: 1, y: 0, w: 1, h: 1 },
        ],
      },
    ],
  };
}

test("tileTexCoords flips U and V independently", () => {
  const tileset = {
    imageW: 32,
    imageH: 16,
    tileW: 16,
    tileH: 16,
    columns: 2,
  };
  const base = ForgeLevel.tileTexCoords(tileset, 0);
  const flippedH = ForgeLevel.tileTexCoords(tileset, 0, true, false);
  const flippedV = ForgeLevel.tileTexCoords(tileset, 0, false, true);

  assert.equal(flippedH[0], base[2], "U channel swaps under a horizontal flip");
  assert.equal(flippedV[1], base[5], "V channel swaps under a vertical flip");
});

test("_tilesetFor picks the tileset owning a gid", () => {
  const data = {
    tilesets: [
      { firstgid: 1, name: "a" },
      { firstgid: 50, name: "b" },
    ],
  };
  assert.equal(ForgeLevel._tilesetFor(data, 1).name, "a");
  assert.equal(ForgeLevel._tilesetFor(data, 49).name, "a");
  assert.equal(ForgeLevel._tilesetFor(data, 50).name, "b");
  assert.equal(ForgeLevel._tilesetFor(data, 0), null);
});

test("_boundsOf returns the axis-aligned bounding box of a polygon", () => {
  const bounds = ForgeLevel._boundsOf([
    [0.2, 0.4],
    [0.8, 0.1],
    [0.5, 0.9],
  ]);
  assert.ok(Math.abs(bounds.x - 0.2) < 1e-9);
  assert.ok(Math.abs(bounds.y - 0.1) < 1e-9);
  assert.ok(Math.abs(bounds.w - 0.6) < 1e-9);
  assert.ok(Math.abs(bounds.h - 0.8) < 1e-9);
});

test("_readObjects converts grid cells to world-space entries", () => {
  const toWorld = (col, row) => ({ x: col * 16, y: -row * 16 });
  const layer = {
    name: "entities",
    objects: [{ type: "spawn", name: "p1", x: 2, y: 1 }],
  };
  const [entry] = ForgeLevel._readObjects(layer, { toWorld, tileSize: 16 });
  assert.equal(entry.type, "spawn");
  assert.equal(entry.width, 16);
  assert.equal(entry.height, 16);
  assert.deepEqual(entry.cell, { col: 2, row: 1 });
});

test("_buildColliders merges a run of full tiles into one box collider", () => {
  const physics = new Physics(-600, 30);
  const data = {
    tileSize: 16,
    cols: 3,
    rows: 1,
    tilesets: [
      {
        firstgid: 1,
        colliders: {
          0: {
            wall: true,
            points: [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
            ],
          },
        },
      },
    ],
    layers: [{ type: "tile", name: "ground", data: [1, 1, 1] }],
  };

  const bodies = ForgeLevel._buildColliders(data, {
    cols: 3,
    rows: 1,
    tileSize: 16,
    physics,
    filter: null,
    ownerObject: null,
  });

  assert.equal(bodies.length, 1, "three full tiles become one merged body");
  assert.ok(bodies[0].getCollider() instanceof BoxCollider);
});

test("_buildColliders gives a non-full-tile shape a real PolygonCollider", () => {
  const physics = new Physics(-600, 30);
  const data = twoTileData();

  const bodies = ForgeLevel._buildColliders(data, {
    cols: 2,
    rows: 1,
    tileSize: 16,
    physics,
    filter: null,
    ownerObject: null,
  });

  assert.equal(bodies.length, 2);
  assert.ok(bodies[0].getCollider() instanceof BoxCollider);
  assert.ok(bodies[1].getCollider() instanceof PolygonCollider);
  assert.equal(bodies[1].getCollider().getPoints().length, 3);
});

test("_buildColliders falls back to a bounding box when a collider shape is degenerate", () => {
  const physics = new Physics(-600, 30);
  const data = {
    tileSize: 16,
    cols: 1,
    rows: 1,
    tilesets: [
      {
        firstgid: 1,
        colliders: {
          0: {
            wall: true,
            points: [
              [0.2, 0.2],
              [0.2, 0.2],
            ],
          },
        },
      },
    ],
    layers: [{ type: "tile", name: "ground", data: [1] }],
  };

  const originalWarn = console.warn;
  let warned = false;
  console.warn = () => {
    warned = true;
  };

  let bodies;
  try {
    bodies = ForgeLevel._buildColliders(data, {
      cols: 1,
      rows: 1,
      tileSize: 16,
      physics,
      filter: null,
      ownerObject: null,
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(bodies.length, 1);
  assert.ok(bodies[0].getCollider() instanceof BoxCollider);
  assert.equal(warned, true, "warns instead of throwing");
});
