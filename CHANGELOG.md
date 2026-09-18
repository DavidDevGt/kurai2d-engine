# Changelog

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
