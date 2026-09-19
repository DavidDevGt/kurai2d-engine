# Changelog

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
