# Kurai2D Engine - Examples

This directory contains standalone, interactive examples demonstrating the features of **Kurai2D Engine**.

## 🚀 Running the Examples

Because modern WebGL2 and ES Modules require an HTTP server (browser security prevents loading modules from `file://`), run:

```bash
npm run examples
```

Or using any static HTTP server of your choice:

```bash
# Using npx serve:
npx serve .

# Using Python 3:
python -m http.server 8080

# Using Vite:
npx vite
```

Then open your browser at `http://localhost:3000/examples/` (or the port indicated by your server).

---

## 📂 Included Examples

| Example | Directory | Highlights |
|---|---|---|
| **01. Basic Shapes & Transforms** | [`01-basic-shapes/`](./01-basic-shapes/) | `Kurai2D`, `Scene`, `Square2D`, `Triangle2D`, `Circle2D`, `Color`, transforms, palette switching |
| **02. 2D Physics Sandbox** | [`02-physics-sandbox/`](./02-physics-sandbox/) | `Physics`, `RigidBody`, `BoxCollider`, `CircleCollider`, ramps, bouncy restitution, pointer spawning |
| **03. 2D Platformer & Camera Follow** | [`03-platformer/`](./03-platformer/) | `InputManager`, character physics with fixed rotation, raycast ground check, smooth camera follow, sensor pickups |
| **04. Dynamic Lighting & Particles** | [`04-lighting-and-particles/`](./04-lighting-and-particles/) | `PointLight`, `setAmbientLight`, `ParticleEmitter`, fire torch, cursor follow, burst sparks |
| **05. Stress Test & Batching** | [`05-stress-test/`](./05-stress-test/) | `InstancedTexture`, `Instance`, 1,000 to 10,000 entities bouncing at 60 FPS in a single draw call |
