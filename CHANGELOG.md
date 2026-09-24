# Changelog

## 4.0.0

First release as **Kurai2D Engine**, a fork of Emerald 3.4.1. Entries below 4.0.0 are Emerald's history.

### Breaking

- The package is now `kurai2d-engine`, and the engine class `Emerald` is now `Kurai2D`. `EmeraldDB` is now `KuraiDB`, and its default IndexedDB database is `"kurai2d-db"` instead of `"emerald-db"` (see "Migrating from Emerald" in the README to keep reading old saves).
- Console messages are prefixed `[Kurai2D] >`.
- Requires Node 18 or newer for tooling and tests (Node 12–16 are end-of-life).

### Added

- Several engines can share a page. Each `Kurai2D` owns a `RenderContext` (its WebGL state, texture cache, uniform cache, camera and render stats), and makes it current while it draws. New `Kurai2D#makeCurrent()` and `Kurai2D#destroy()`.
- `new Kurai2D(canvas, { tickGlobals })` (default `true`): set it to `false` on secondary engines so `Time`, `Tween`, `Timer` and `Coroutine` advance once per frame. A warning is logged when a second engine would tick them too.
- `Kurai2D#isPaused()`.
- `GameObject#alwaysVisible` is now a declared property (default `false`); the culler already honoured it.
- A fake-WebGL render test suite covering auto-batching, culling, lights, multiple engines, context restore, viewport math and the game loop.
- CI on GitHub Actions (Node 18, 20, 22): format check, type check, tests, and a check that `dist/types` is up to date.

### Changed

- The engine core is split into focused modules: `render/StandardProgram`, `render/Viewport`, `render/LightUniforms`, `render/DrawList` and `GameLoop`. `InstancedTexture` moves its per-instance packing and attribute binding to `instancing/InstanceData` and `instancing/InstanceAttributes`. No public API changes.
- The JavaScript sources are now type-checked from their JSDoc (`checkJs`), and the published types are more precise as a result.
- `InstancedTexture#updateInstanceCount` frees the old per-instance GPU buffers, keeps existing instances (dropping any beyond the new capacity) and rebuilds their matrices.
- Unused dev dependencies (`colyseus`, `@colyseus/schema`, `vite`) were removed, which also drops the deprecated `uuid@8` from the install.

### Fixed

- After a WebGL context loss and restore, auto-batched sprites stopped drawing because the internal `SpriteBatch` kept using the dead program and buffers. It is now rebuilt on restore.
- `CanvasText#setColor` accepts a `Color` like every other drawable; passing one used to produce invalid text color.
- A shader compile or link failure is logged with `console.error` instead of blocking the page with `alert()`.
- `InstancedTexture#playAnimationOnce` also accepts the `Drawable` signature `(animation, defaultAnimation, speed)`.

## 3.4.1

### Fixed

- `Texture#playAnimation`, `playAnimationOnce` and `Animator#play` now show the animation's first frame immediately. Previously the sprite kept the previous animation's frame until the first animation tick, so switching directions or states could flash a stale frame for up to one frame duration.

## 3.4.0

### Added

- `ForgeLevel` now supports animated tiles painted in Forge. Each animation plays with its own frames and speed, and solid animations become colliders like any other solid tile. Previously these cells were silently dropped.

### Docs

- The `ForgeLevel` docs now show a self-contained example, explain that `physics` is optional, and explain how to set up collision layers with the `filter` option.

## 3.3.0

### Added

- `new Emerald(canvas, { antialias })` option (default `true`). Pixel-art games that don't rotate sprites can pass `false` for exact pixel edges.
- Automatic sprite batching: consecutive plain `Texture` objects that share a texture are now drawn in one call instead of one per sprite, when they are unlit, use the normal blend mode, have no `Material`, wireframe or custom pivot, and are not screen-space. Everything else keeps the per-object path. `Drawable#getFrameUV()` exposes the frame's UV rect.

### Changed

- All engine shaders (standard pipeline, `SpriteBatch`, `Material`, post-processing and the built-in post effects) are now GLSL ES 3.00. Custom `Material` and `PostEffect` source written in the older ES 1.00 style (`texture2D`, `gl_FragColor`, `attribute`, `varying`, and the derivatives/texture-lod `#extension` pragmas) keeps working; new code can use `texture()` and `fragColor`.
- Texture coordinates are interpolated with `centroid`, so tiles no longer sample past their edge under MSAA.
- Objects with equal layer and z are now ordered by texture to cut texture switches, so the paint order between overlapping sprites at the same layer and z can differ from insertion order.
- `Drawable#draw` and `InstancedTexture` reuse scratch vectors and matrices instead of allocating every frame.

### Fixed

- Hairline gaps between adjacent atlas tiles at fractional zoom with MSAA on, introduced by the flush (no inset) pixel-art tile UVs in 3.2.0.

## 3.2.0

### Added

- `ForgeLevel` now applies parallax automatically: a Forge tile layer whose `parallaxX`/`parallaxY` is below `1` scrolls slower than the world as the active camera moves (a distant background), while `1` stays locked to it.
- Concave collider shapes from Forge are decomposed into triangles, one `PolygonCollider` each, instead of silently collapsing to their convex hull. Convex shapes still get exactly one collider.

### Changed

- `ForgeLevel.tileTexCoords` takes a `pixelart` flag (default `true`). With NEAREST filtering, tiles now sit flush with no half-texel UV inset, which removes slivers of the neighboring tile's color at seams. The inset is kept for linear-filtered atlases.

### Docs

- Fixed broken Tile Forge links in the getting-started guide.

## 3.1.0

### Added

- Physics joints: `DistanceJoint` and `RevoluteJoint`, created via `Physics#createDistanceJoint`/`createRevoluteJoint` and destroyed with `Physics#destroyJoint`. Fully wired into island solving, sleeping, and `collideConnected` filtering.
- `PolygonCollider` component for arbitrary convex-hull colliders, alongside the existing `BoxCollider`/`CircleCollider`.
- `ForgeLevel` importer for levels built with the Tile Forge editor, including real per-shape `PolygonCollider`s for non-full-tile geometry (falling back to a bounding-box `BoxCollider` for degenerate shapes).
- `Gamepad` manager module.

### Changed

- `RigidBody` now exposes the full physics `Body` API directly (position, velocity, forces, impulses, mass, sleep state, fixtures, and more) instead of requiring `.getBody()` first. `.getBody()` still works for existing code.
- `InstancedTexture.playAnimation`/`playAnimationOnce`/`getAnimation` now actually drive shared per-instance animation (previously no-ops); added `InstancedTexture.stopAnimation`.
- The physics engine now supports a variable timestep (`Physics#setVariableTimeStep`) in addition to the default fixed timestep, decoupling simulation rate from a fixed 60fps.
- `BoxCollider`/`CircleCollider`/`PolygonCollider` create their fixtures through `rigidbody.createFixture(...)` directly.

### Removed

- The `planck` dependency. The 2D physics engine (`src/physics/`) is now fully self-contained.

### Docs

- Rewrote `README.md` and `docs/getting-started.md`: consolidated overlapping sections, restored the original tutorial voice, and removed em dashes throughout.
- Every code snippet in `docs/getting-started.md` was executed against the real engine APIs; two inaccuracies were found and fixed.
