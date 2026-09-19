import { test } from "node:test";
import assert from "node:assert/strict";

import { Physics } from "../src/Physics.js";
import BoxCollider from "../src/components/BoxCollider.js";
import PolygonCollider from "../src/components/PolygonCollider.js";
import ForgeLevel from "../src/importers/ForgeLevel.js";
import GLManager from "../src/managers/GLManager.js";
import CameraManager from "../src/managers/CameraManager.js";

function fakeGL() {
  return {
    ARRAY_BUFFER: 1,
    STATIC_DRAW: 2,
    DYNAMIC_DRAW: 3,
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    deleteBuffer: () => {},
  };
}

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

test("tileTexCoords covers the full tile with no inset under pixelart (NEAREST), but insets under linear filtering", () => {
  const tileset = {
    imageW: 32,
    imageH: 16,
    tileW: 16,
    tileH: 16,
    columns: 2,
  };
  const [uRightPA, vBottomPA, uLeftPA, , , vTopPA] = ForgeLevel.tileTexCoords(
    tileset,
    0,
    false,
    false,
    true
  );
  assert.equal(uLeftPA, 0, "left edge reaches the tile boundary exactly");
  assert.equal(
    uRightPA,
    16 / 32,
    "right edge reaches the tile boundary exactly"
  );
  assert.equal(vTopPA, 0, "top edge reaches the tile boundary exactly");
  assert.equal(
    vBottomPA,
    16 / 16,
    "bottom edge reaches the tile boundary exactly"
  );

  const [uRightLin, , uLeftLin] = ForgeLevel.tileTexCoords(
    tileset,
    0,
    false,
    false,
    false
  );
  assert.ok(
    uLeftLin > 0,
    "linear filtering keeps the anti-bleed inset on the left edge"
  );
  assert.ok(
    uRightLin < 16 / 32,
    "linear filtering keeps the anti-bleed inset on the right edge"
  );
});

test("a parallax layer actually scrolls slower than the world as the camera moves", () => {
  GLManager.setGL(fakeGL());
  GLManager.setProgramInfo({});
  const originalError = console.error;
  console.error = () => {};

  let camPos = { x: 0, y: 0 };
  CameraManager.setCamera({ getPosition: () => camPos });

  const data = {
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
      },
    ],
    layers: [
      {
        type: "tile",
        name: "bg",
        visible: true,
        data: [1, 1],
        parallaxX: 0.5,
        parallaxY: 0.5,
      },
    ],
  };

  const scene = { add() {} };
  let map;
  try {
    map = ForgeLevel.load(data, { scene, pixelart: true });
  } finally {
    console.error = originalError;
  }

  const built = map.layers[0];
  const basePositions = built.instanced.instances.map((inst) => ({
    x: inst.transform.position.x,
    y: inst.transform.position.y,
  }));

  built.gameObject.update(0.016);
  camPos = { x: 100, y: 40 };
  built.gameObject.update(0.016);

  for (let i = 0; i < basePositions.length; i++) {
    const inst = built.instanced.instances[i];
    assert.ok(
      Math.abs(inst.transform.position.x - (basePositions[i].x + 50)) < 1e-9,
      "a 0.5 parallax factor moves the layer by half the camera's x delta"
    );
    assert.ok(
      Math.abs(inst.transform.position.y - (basePositions[i].y + 20)) < 1e-9,
      "a 0.5 parallax factor moves the layer by half the camera's y delta"
    );
  }
});

test("a non-parallax layer (factor 1) gets no ParallaxLayer behaviour at all", () => {
  GLManager.setGL(fakeGL());
  GLManager.setProgramInfo({});
  const originalError = console.error;
  console.error = () => {};

  const data = {
    tileSize: 16,
    cols: 1,
    rows: 1,
    tilesets: [
      {
        firstgid: 1,
        name: "set",
        image: "set.png",
        imageW: 16,
        imageH: 16,
        tileW: 16,
        tileH: 16,
        columns: 1,
      },
    ],
    layers: [{ type: "tile", name: "ground", visible: true, data: [1] }],
  };

  const scene = { add() {} };
  let map;
  try {
    map = ForgeLevel.load(data, { scene, pixelart: true });
  } finally {
    console.error = originalError;
  }

  assert.equal(
    map.layers[0].gameObject.components.length,
    1,
    "just the InstancedTexture, no parallax behaviour"
  );
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

test("_buildColliders decomposes a concave collider shape into triangles on one body", () => {
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
              [0, 0],
              [1, 0],
              [1, 0.5],
              [0.5, 0.5],
              [0.5, 1],
              [0, 1],
            ],
          },
        },
      },
    ],
    layers: [{ type: "tile", name: "ground", data: [1] }],
  };

  const bodies = ForgeLevel._buildColliders(data, {
    cols: 1,
    rows: 1,
    tileSize: 16,
    physics,
    filter: null,
    ownerObject: null,
  });

  assert.equal(bodies.length, 1, "the concave shape is still a single body");

  let fixtureCount = 0;
  for (let f = bodies[0].getBody().getFixtureList(); f; f = f.next)
    fixtureCount++;
  assert.equal(
    fixtureCount,
    4,
    "a 6-vertex concave polygon ear-clips into 4 triangles"
  );
});

test("_buildColliders keeps a convex non-full-tile shape as exactly one collider", () => {
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
              [0, 0.5],
              [0.5, 0],
              [1, 0.5],
              [0.5, 1],
            ],
          },
        },
      },
    ],
    layers: [{ type: "tile", name: "ground", data: [1] }],
  };

  const bodies = ForgeLevel._buildColliders(data, {
    cols: 1,
    rows: 1,
    tileSize: 16,
    physics,
    filter: null,
    ownerObject: null,
  });

  let fixtureCount = 0;
  for (let f = bodies[0].getBody().getFixtureList(); f; f = f.next)
    fixtureCount++;
  assert.equal(
    fixtureCount,
    1,
    "a convex quad stays a single collider, no needless splitting"
  );
  assert.equal(bodies[0].getCollider().getPoints().length, 4);
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

function animatedLevel(overrides = {}) {
  return {
    tileSize: 16,
    cols: 3,
    rows: 1,
    tilesets: [
      {
        firstgid: 1,
        name: "set",
        image: "set.png",
        imageW: 64,
        imageH: 16,
        tileW: 16,
        tileH: 16,
        columns: 4,
        colliders: {},
      },
    ],
    animations: [
      {
        aid: 1,
        name: "Torch",
        tilesetIndex: 0,
        frames: [1, 2, 3],
        speed: 100,
        solid: false,
      },
    ],
    layers: [
      {
        type: "tile",
        name: "deco",
        visible: true,
        data: [1, 1000001, 1000001],
      },
    ],
    ...overrides,
  };
}

function loadQuiet(data, options = {}) {
  GLManager.setGL(fakeGL());
  GLManager.setProgramInfo({});
  const originalError = console.error;
  console.error = () => {};
  try {
    return ForgeLevel.load(data, { scene: { add() {} }, ...options });
  } finally {
    console.error = originalError;
  }
}

const uv = (instanced, index) =>
  Array.from(instanced.instanceTexCoords.slice(index * 8, index * 8 + 8));

test("animated tile cells become their own batch that plays the animation's frames", () => {
  const data = animatedLevel();
  const map = loadQuiet(data);

  assert.equal(
    map.layers.length,
    2,
    "one static batch plus one animated batch"
  );
  const anim = map.layers.find((l) => l.animation);
  assert.equal(anim.animation.name, "Torch");
  assert.equal(anim.count, 2, "both painted cells share the batch");
  assert.ok(anim.instanced.instances.every((i) => i.isAnimating));
  assert.equal(anim.instanced.instances[0].animationSpeed, 100);

  const tileset = data.tilesets[0];
  const expected = (frame) =>
    Array.from(
      new Float32Array(
        ForgeLevel.tileTexCoords(tileset, frame, false, false, true)
      )
    );

  anim.instanced.update(1000);
  assert.deepEqual(
    uv(anim.instanced, 0),
    expected(1),
    "starts on the first frame"
  );
  anim.instanced.update(1100);
  assert.deepEqual(
    uv(anim.instanced, 0),
    expected(2),
    "advances after `speed` ms"
  );
  assert.deepEqual(
    uv(anim.instanced, 1),
    expected(2),
    "every cell plays in step"
  );
});

test("a flipped animated cell keeps its flip on every frame", () => {
  const flippedH = (0x80000000 | 1000001) >>> 0;
  const data = animatedLevel({
    cols: 1,
    layers: [{ type: "tile", name: "deco", visible: true, data: [flippedH] }],
  });
  const map = loadQuiet(data);
  const anim = map.layers.find((l) => l.animation);

  anim.instanced.update(1000);
  assert.deepEqual(
    uv(anim.instanced, 0),
    Array.from(
      new Float32Array(
        ForgeLevel.tileTexCoords(data.tilesets[0], 1, true, false, true)
      )
    )
  );
});

test("an animated cell with no matching animation is skipped with a single warning", () => {
  const data = animatedLevel({
    layers: [
      {
        type: "tile",
        name: "deco",
        visible: true,
        data: [1000009, 1000009, 1],
      },
    ],
  });
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  let map;
  try {
    map = loadQuiet(data);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(map.layers.length, 1, "only the ordinary tile is built");
  assert.equal(warnings.length, 1, "the same missing animation warns once");
});

test("a solid animation becomes a collider and a non-solid one does not", () => {
  const ctx = {
    cols: 3,
    rows: 1,
    tileSize: 16,
    physics: new Physics(-600, 30),
    filter: null,
    ownerObject: null,
  };

  const solid = animatedLevel({
    animations: [{ ...animatedLevel().animations[0], solid: true }],
    layers: [{ type: "tile", name: "deco", data: [1000001, 1000001, 1000001] }],
  });
  const bodies = ForgeLevel._buildColliders(solid, ctx);
  assert.equal(
    bodies.length,
    1,
    "a run of solid animated cells merges into one box"
  );
  assert.ok(bodies[0].getCollider() instanceof BoxCollider);

  const passable = animatedLevel({
    layers: [{ type: "tile", name: "deco", data: [1000001, 1000001, 1000001] }],
  });
  assert.equal(ForgeLevel._buildColliders(passable, ctx).length, 0);
});

test("physics is optional: without it a level still loads and simply has no colliders", () => {
  const map = loadQuiet(animatedLevel());
  assert.ok(map.layers.length > 0, "layers are still built");
  assert.deepEqual(map.colliders, []);

  const solid = animatedLevel({
    animations: [{ ...animatedLevel().animations[0], solid: true }],
  });
  const withPhysics = loadQuiet(solid, { physics: new Physics(-600, 30) });
  assert.equal(
    withPhysics.colliders.length,
    1,
    "solid animated cells collide when physics is given"
  );
});
