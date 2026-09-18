# Emerald

Emerald is a comprehensive 2D graphics engine that can help you create games easier than ever.

**New to the engine?** The [Getting Started guide](docs/getting-started.md) walks from an empty page to a playable sprite with input, tiles, audio, saves, and a debug overlay.

## Table of Contents

- [Emerald](#emerald)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
  - [Scene](#scene)
  - [Game Objects](#game-objects)
    - [Creating a new GameObject](#creating-a-new-gameobject)
    - [Behaviour (component lifecycle)](#behaviour-component-lifecycle)
    - [Transform hierarchy](#transform-hierarchy)
    - [Components](#components)
      - [Texture](#texture)
      - [InstancedTexture](#instancedtexture)
      - [Square2D](#square2d)
      - [Triangle2D](#triangle2d)
      - [Circle2D](#circle2d)
      - [RigidBody](#rigidbody)
      - [BoxCollider](#boxcollider)
      - [CircleCollider](#circlecollider)
      - [PolygonCollider](#polygoncollider)
  - [Object methods](#object-methods)
    - [Position](#position)
    - [Rotation](#rotation)
    - [Scale](#scale)
    - [Change color](#change-color)
    - [Sprite flipping, pivot & anchor](#sprite-flipping-pivot--anchor)
  - [Animations](#animations)
  - [Instance System](#instance-system)
    - [Creating Instances](#creating-instances)
    - [Instance Management](#instance-management)
    - [Instance Events](#instance-events)
    - [Per-instance color](#per-instance-color)
    - [Per-instance atlas regions](#per-instance-atlas-regions)
    - [Per-instance animation](#per-instance-animation)
  - [Physics Engine](#physics-engine)
    - [Setting up Physics](#setting-up-physics)
    - [Time stepping](#time-stepping)
    - [RigidBody methods](#rigidbody-methods)
    - [Collision Detection](#collision-detection)
    - [Collision layers](#collision-layers)
    - [Continuous collision detection](#continuous-collision-detection)
    - [Raycasting & point queries](#raycasting--point-queries)
    - [Tilemap colliders & auto-tiling](#tilemap-colliders--auto-tiling)
  - [Particle System](#particle-system)
    - [Particle Settings](#particle-settings)
    - [Creating Particle Systems](#creating-particle-systems)
    - [Particle System Methods](#particle-system-methods)
    - [ParticleEmitter (simple pooled bursts)](#particleemitter-simple-pooled-bursts)
  - [Lighting System](#lighting-system)
    - [Ambient Light](#ambient-light)
    - [Point Light](#point-light)
    - [Directional Light](#directional-light)
  - [Text Rendering](#text-rendering)
    - [BitmapText](#bitmaptext)
    - [CanvasText](#canvastext)
  - [Input](#input)
    - [Keyboard Events](#keyboard-events)
    - [Mouse Events](#mouse-events)
    - [Object Events](#object-events)
    - [Event Cleanup](#event-cleanup)
    - [InputManager (actions)](#inputmanager-actions)
    - [Gamepads & Controllers](#gamepads--controllers)
  - [AudioManager](#audiomanager)
    - [Adding Audio](#adding-audio)
    - [Playing Audio](#playing-audio)
    - [Audio Control](#audio-control)
    - [Buses & Fades](#buses--fades)
    - [Positional Audio](#positional-audio)
  - [Camera](#camera)
  - [FPSCounter](#fpscounter)
  - [Time Management](#time-management)
  - [Tween, Timer & StateMachine](#tween-timer--statemachine)
  - [SpatialGrid & Pool](#spatialgrid--pool)
  - [MathUtils](#mathutils)
  - [Coroutines](#coroutines)
  - [Rendering Pipeline](#rendering-pipeline)
    - [Post-processing](#post-processing)
    - [PostEffects (built-in)](#posteffects-built-in)
    - [RenderTarget](#rendertarget)
    - [Material (custom shaders)](#material-custom-shaders)
    - [SpriteBatch](#spritebatch)
  - [In-Engine UI](#in-engine-ui)
  - [ScreenEffects (transitions)](#screeneffects-transitions)
  - [Scene Transitions & the Game Loop](#scene-transitions--the-game-loop)
  - [DebugOverlay](#debugoverlay)
  - [Serializer (save/load scenes)](#serializer-saveload-scenes)
  - [Storage (versioned saves)](#storage-versioned-saves)
  - [EmeraldDB (IndexedDB saves)](#emeralddb-indexeddb-saves)
  - [AssetManager](#assetmanager)
  - [Asset importers (Tiled, Aseprite & Forge)](#asset-importers-tiled-aseprite--forge)
  - [Networking (NetworkManager + Interpolator)](#networking-networkmanager--interpolator)
  - [Advanced Features](#advanced-features)
    - [Resize Handling](#resize-handling)
    - [Resolution independence](#resolution-independence)
    - [Auto-pause & lifecycle](#auto-pause--lifecycle)
    - [Production hardening](#production-hardening)
  - [NPM scripts](#npm-scripts)

## Getting Started

To get started with Emerald, you need to have a canvas element in your HTML and import the necessary classes.

```javascript
import { Emerald, Scene, Color, SceneManager } from "emeraldengine";

const emerald = new Emerald(canvas); // You should pass your own canvas element here
const scene = new Scene();
SceneManager.setScene(scene);

emerald.setBackgroundColor(new Color(20, 20, 30, 255)); // color = new Color(r, g, b, a = 255)
```

`new Emerald(canvas, { antialias: false })` turns off antialiasing (on by default). Pixel-art games that don't rotate sprites can use it for crisp, exact pixel edges.

To draw items on the screen you need some sort of animation loop. You can drive one yourself with `window.requestAnimationFrame`:

```javascript
let lastTime = 0;
const animate = (currentTime) => {
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  emerald.drawScene(scene, deltaTime); // You need this line to tell the engine what to draw
  window.requestAnimationFrame(animate);
};
animate(0);
```

Or let `emerald.run()` own the loop for you. It computes a clamped delta time, pauses automatically when the tab is hidden, and optionally drives a fixed-timestep simulation alongside your rendering:

```javascript
const stop = emerald.run(
  (dt, alpha) => {
    world.update(dt);
    emerald.drawScene(scene, dt);
  },
  {
    maxDelta: 0.25, // clamp dt after a tab-switch stall
    fixedStep: 1 / 60, // optional fixed simulation step (0 = off)
    fixedUpdate: (step) => physics.process(step),
  }
);
// later: stop();  // or emerald.stop();
```

See [Auto-pause & lifecycle](#auto-pause--lifecycle) for the pause/resume hooks `run()` accepts.

## Scene

Emerald has multiple scenes support. In order to render any object it has to be added to the scene using the `add` method.

```javascript
// Adding an object to the scene
scene.add(gameObject);

// Removing an object from the scene
scene.remove(gameObject);

// Freeing it for good (buffers + texture reference), instead of just removing it
scene.remove(gameObject, { dispose: true });
```

When changing a scene you should deactivate the current scene to not mess up the event manager:

```javascript
scene.setIsActive(true); // Activate
scene.setIsActive(false); // Deactivate
```

`SceneManager` keeps track of which scene is currently active:

```javascript
import { SceneManager } from "emeraldengine";

SceneManager.setScene(scene);
const currentScene = SceneManager.getScene();
```

It can also switch scenes behind a fade, wired to `ScreenEffects`. See [Scene Transitions & the Game Loop](#scene-transitions--the-game-loop).

## Game Objects

### Creating a new GameObject

```javascript
import { GameObject, Vector3, Vector2 } from "emeraldengine";
/*
    ARGUMENTS:
    1. name: string = Name of the new GameObject
    2. position: Vector3 = Position of the new GameObject
    3. rotation: number = Rotation of the new GameObject
    4. scale: Vector2 = Scale of the new GameObject
*/
const gameObject = new GameObject(name, position, rotation, scale);
```

This will create a new empty GameObject. At this stage you will not see anything on the screen until you add some components.

### Behaviour (component lifecycle)

For your own game logic (rather than rendering/physics), add a `Behaviour` component. It's ticked automatically every frame the object is active.

```javascript
import { Behaviour } from "emeraldengine";

class Spinner extends Behaviour {
  start() {
    this.speed = 2;
  } // once, before the first update
  update(dt) {
    this.gameObject.transform.rotation += this.speed * dt;
  }
  onCollisionEnter(other, contact) {} // requires physics ticking
  onCollisionExit(other, contact) {}
  onDestroy() {}
}
gameObject.addComponent(new Spinner());
```

### Transform hierarchy

GameObjects can be parented to one another. A child's transform composes on top of its parent's position/rotation/scale, so moving the parent moves the whole group.

```javascript
parent.addChild(child); // or child.setParent(parent)
child.setParent(null); // detach
```

### Components

There are currently 9 components: Texture, InstancedTexture, Square2D, Circle2D, Triangle2D, RigidBody, BoxCollider, CircleCollider, PolygonCollider

#### Texture

```javascript
import { Texture } from "emeraldengine";
/*
    ARGUMENTS:
    1. texturePath = Specify the path for the texture that you want to use.
    2. frameWidth: number = The width of each frame.
    3. frameHeight: number = The height of each frame.
    4. framesPerRow: number = How many frames are in one row in your spritesheet.
    5. totalFrames: number = How many total frames does your spritesheet have.
    6. animationSpeed: number = Speed of change of every frame.
    7. autoPlay: boolean = Specify if you want the animation to play automatically. If you don't want any animation then pass false for it.
    8. pixelart: boolean = Specify whether the texture should be rendered in pixel art style. (THIS IS OPTIONAL. If you don't specify it then it will be defaulted to true)
    9. useLighting: boolean = Specify whether the texture should react to lighting or not. If you don't want any lighting then pass false for it. (THIS IS OPTIONAL. If you don't specify it then it will be defaulted to true)
*/
const texture = new Texture(
  texturePath,
  frameWidth,
  frameHeight,
  framesPerRow,
  totalFrames,
  animationSpeed,
  autoPlay,
  (pixelart = true),
  (useLighting = true)
);

// Add the texture to a game object
gameObject.addComponent(texture);
```

![Texture](https://github.com/vahan-gev/emeralddocs/blob/main/github/screenshots/texture.png?raw=true)

#### InstancedTexture

InstancedTexture is perfect for rendering many objects with the same texture efficiently, such as tiles, particles, or repeating elements. The whole batch is drawn in a single draw call. See the [Instance System](#instance-system) section for how to add, manage, and animate instances.

```javascript
import { InstancedTexture } from "emeraldengine";
/*
    ARGUMENTS:
    1. texturePath = Specify the path for the texture that you want to use.
    2. instanceCount: number = How many instances of the texture you want to create.
    3. frameWidth: number = The width of each frame.
    4. frameHeight: number = The height of each frame.
    5. framesPerRow: number = How many frames are in one row in your spritesheet.
    6. totalFrames: number = How many total frames does your spritesheet have.
    7. animationSpeed: number = Speed of change of every frame.
    8. autoPlay: boolean = Specify if you want the animation to play automatically. If you don't want any animation then pass false for it.
    9. pixelart: boolean = Specify whether the texture should be rendered in pixel art style. (THIS IS OPTIONAL. If you don't specify it then it will be defaulted to true)
    10. useLighting: boolean = Specify whether the texture should react to lighting or not. If you don't want any lighting then pass false for it. (THIS IS OPTIONAL. If you don't specify it then it will be defaulted to true)
*/
const instancedTexture = new InstancedTexture(
  texturePath,
  instanceCount,
  frameWidth,
  frameHeight,
  framesPerRow,
  totalFrames,
  animationSpeed,
  autoPlay,
  (pixelart = true),
  (useLighting = true)
);

// Add the instanced texture to a game object
gameObject.addComponent(instancedTexture);
```

![InstancedTexture](https://github.com/vahan-gev/emeralddocs/blob/main/github/screenshots/instancedtexture.png?raw=true)

#### Square2D

```javascript
import { Square2D } from "emeraldengine";
let square = new Square2D();
gameObject.addComponent(square);
```

![Square2D](https://github.com/vahan-gev/emeralddocs/blob/main/github/screenshots/square2d.png?raw=true)

#### Triangle2D

```javascript
import { Triangle2D } from "emeraldengine";
let triangle = new Triangle2D();
gameObject.addComponent(triangle);
```

![Triangle2D](https://github.com/vahan-gev/emeralddocs/blob/main/github/screenshots/triangle2d.png?raw=true)

#### Circle2D

```javascript
import { Circle2D } from "emeraldengine";
/*
    ARGUMENTS:
    1. segments = number of segments that the circle will have. Default is 32.
*/
let circle = new Circle2D(segments);
gameObject.addComponent(circle);
```

![Circle2D](https://github.com/vahan-gev/emeralddocs/blob/main/github/screenshots/circle2d.png?raw=true)

#### RigidBody

RigidBody is a component that allows you to add physics to your game objects. However, it won't work until you create a Physics instance at the top of your code. `RigidBody` itself is the body: every physics operation (position, velocity, forces, sleep state, mass) is a method on it directly; see [RigidBody methods](#rigidbody-methods) in the Physics Engine section for the full list.

```javascript
import { RigidBody, Physics, Vector2 } from "emeraldengine";

// Create physics engine first
const physics = new Physics(-70, 32, 2); // gravity, scale, velocityThreshold

/*
    ARGUMENTS:
    1. physics: Physics = Instance of the Physics class that you created at the top of your code.
    2. type: string = Type of the rigid body. It can be "dynamic", "kinematic", or "static".
    3. position: Vector2 = Position of the rigid body is Vector2 because it doesn't need any Z index.
    4. fixedRotation: boolean = Specify whether the rigid body should have a fixed rotation or not. Default is false.
    5. parentObject: GameObject = (OPTIONAL) If you want to attach the rigid body to a GameObject you can pass it here. If you don't want to attach it to any GameObject then pass null.
    6. offset: Vector2 = (OPTIONAL) Offset from the GameObject's position.
*/
const rigidBody = new RigidBody(
  physics,
  "dynamic",
  new Vector2(0, 0),
  false,
  gameObject,
  new Vector2(0, 0)
);

gameObject.addComponent(rigidBody);
```

#### BoxCollider

```javascript
import { BoxCollider } from "emeraldengine";

/*
    ARGUMENTS:
    1. rigidBody: RigidBody = The rigid body component that this collider will be attached to.
    2. size: Vector2 = Size of the box collider.
    3. density: number = Density of the collider.
    4. friction: number = Friction of the collider.
    5. restitution: number = Restitution (bounciness) of the collider.
    6. isSensor: boolean = Whether this collider is a sensor (triggers events but doesn't collide physically).
    7. parentObject: GameObject = (OPTIONAL) Parent GameObject.
    8. filter: Object = (OPTIONAL) Collision filter spec (see Collision layers below).
*/
const boxCollider = new BoxCollider(
  rigidBody,
  new Vector2(1, 1),
  1,
  0.3,
  0.1,
  false,
  gameObject
);

gameObject.addComponent(boxCollider);
```

![BoxCollider](https://github.com/vahan-gev/emeralddocs/blob/main/github/screenshots/boxcollider.png?raw=true)

The `BoxCollider` is specifically made bigger than the `Square2D` component in this image to demonstrate how it works. You can adjust the size of the collider to fit your needs.

#### CircleCollider

```javascript
import { CircleCollider } from "emeraldengine";

/*
    ARGUMENTS:
    1. rigidBody: RigidBody = The rigid body component that this collider will be attached to.
    2. radius: number = Radius of the circle collider.
    3. density: number = Density of the collider.
    4. friction: number = Friction of the collider.
    5. restitution: number = Restitution (bounciness) of the collider.
    6. isSensor: boolean = Whether this collider is a sensor.
    7. parentObject: GameObject = (OPTIONAL) Parent GameObject.
    8. filter: Object = (OPTIONAL) Collision filter spec (see Collision layers below).
*/
const circleCollider = new CircleCollider(
  rigidBody,
  1.5,
  1,
  0.3,
  0.8,
  false,
  gameObject
);

gameObject.addComponent(circleCollider);
```

![CircleCollider](https://github.com/vahan-gev/emeralddocs/blob/main/github/screenshots/circlecollider.png?raw=true)

The `CircleCollider` is specifically made bigger than the `Circle2D` component in this image to demonstrate how it works. You can adjust the radius of the collider to fit your needs.

#### PolygonCollider

For a collision shape a box or circle can't approximate, like ramps, wedges, or arbitrary outlines.

```javascript
import { PolygonCollider } from "emeraldengine";

/*
    ARGUMENTS:
    1. rigidBody: RigidBody = The rigid body component that this collider will be attached to.
    2. points: Array<{x:number, y:number}> = Local-space points, in physics units, in any order. The convex hull of these points is used, so a concave outline needs more than one collider.
    3. density: number = Density of the collider.
    4. friction: number = Friction of the collider.
    5. restitution: number = Restitution (bounciness) of the collider.
    6. isSensor: boolean = (OPTIONAL) Whether this collider is a sensor. Default is false.
    7. parentObject: GameObject = (OPTIONAL) Parent GameObject.
    8. filter: Object = (OPTIONAL) Collision filter spec (see Collision layers below).
*/
const polygonCollider = new PolygonCollider(
  rigidBody,
  [
    { x: -1, y: -0.5 },
    { x: 1, y: -0.5 },
    { x: 0, y: 1 },
  ],
  1,
  0.3,
  0.1,
  false,
  gameObject
);

gameObject.addComponent(polygonCollider);
```

## Object methods

### Position

```javascript
// Set position
gameObject.transform.position.x = 100;
gameObject.transform.position.y = 200;
gameObject.transform.position.z = 0;

// Or set all at once
gameObject.transform.position = new Vector3(100, 200, 0);
```

![Position](https://github.com/vahan-gev/emeralddocs/blob/main/github/videos/position.gif?raw=true)

### Rotation

```javascript
// Set rotation (in radians)
gameObject.transform.rotation = Math.PI / 4; // 45 degrees
```

![Rotation](https://github.com/vahan-gev/emeralddocs/blob/main/github/videos/rotation.gif?raw=true)

### Scale

```javascript
// Set scale
gameObject.transform.scale.x = 2;
gameObject.transform.scale.y = 2;

// Or set both at once
gameObject.transform.scale = new Vector2(2, 2);
```

![Scale](https://github.com/vahan-gev/emeralddocs/blob/main/github/videos/scale.gif?raw=true)

### Change color

```javascript
// For textures
const texture = gameObject.getComponent(Texture);
texture.setColor(new Color(255, 0, 0)); // Red
```

![Change Color](https://github.com/vahan-gev/emeralddocs/blob/main/github/videos/changecolor.gif?raw=true)

### Sprite flipping, pivot & anchor

Any `Texture` (or other `Drawable`) can be mirrored and re-pivoted without touching the GameObject's scale, handy for characters that face left/right and for putting a sprite's origin at its feet.

```javascript
tex.setFlipX(facing < 0); // mirror horizontally (e.g. face left)
tex.setFlipY(true); // mirror vertically

// Pivot: which local point sits on the GameObject's position and acts as the
// rotation/scale center. (0,0) = center (default); x in [-1,1] left..right,
// y in [-1,1] bottom..top.
tex.setPivot(0, -1); // bottom-center, feet on the ground

// Anchor: the same thing in 0..1 with a top-left origin (CSS-style).
tex.setAnchor(0.5, 1); // bottom-center
tex.setAnchor(0.5, 0.5); // back to center
```

## Animations

For animated textures, `setFrame` jumps straight to a specific frame:

```javascript
const texture = gameObject.getComponent(Texture);
texture.setFrame(2); // Set to frame 2
```

Or play through a sequence of frames:

```javascript
// Play animation
texture.playAnimation([0, 1, 2, 3], 200); // frames array, speed in ms

// Play once, then stop instead of looping
texture.playAnimationOnce([0, 1, 2, 3], null, 200, () => console.log("done"));

// Stop animation
texture.stopAnimation();

// Check if playing
if (texture.isPlaying) {
  // Animation is currently playing
}
```

![Animations](https://github.com/vahan-gev/emeralddocs/blob/main/github/videos/animations.gif?raw=true)

For named clips instead of raw frame arrays, use `Animator`:

```javascript
import { Animator } from "emeraldengine";

const anim = new Animator();
anim
  .addClip("run", [0, 1, 2, 3], { speed: 100 })
  .addClip("jump", [8, 9], { loop: false });
gameObject.addComponent(texture);
gameObject.addComponent(anim);
anim.play("run");
```

## Instance System

The Instance system allows you to efficiently manage multiple copies of the same texture through `InstancedTexture` (see [Components](#instancedtexture)).

### Creating Instances

```javascript
import { Instance } from "emeraldengine";

// Create an instance
const instance = new Instance(
  "InstanceName",
  new Vector3(x, y, z),
  new Vector2(width, height),
  rotation,
  frame
);

// Add to InstancedTexture
const instancedTexture = gameObject.getComponent(InstancedTexture);
instancedTexture.addInstance(instance);
```

### Instance Management

```javascript
// Remove instance
instancedTexture.removeInstance(instanceId);

// Get instance by ID
const instance = instancedTexture.getInstanceWithId(instanceId);

// Get instance at position
const instance = instancedTexture.getInstanceAtPosition(position, tolerance);

// Clear all instances
instancedTexture.clearInstances();
```

### Instance Events

```javascript
// Add click event to specific instance
instancedTexture.addInstanceClickEvent(instanceId, (event) => {
  console.log("Instance clicked!");
});

// Add hover events to specific instance
instancedTexture.addInstanceHoverEvent(
  instanceId,
  (event) => console.log("Mouse entered"),
  (event) => console.log("Mouse left")
);
```

### Per-instance color

Each instance can have an independent RGBA tint (white = unchanged, so existing scenes render identically). The tint multiplies the texture in the shader.

```javascript
import { Color } from "emeraldengine";

// On the Instance directly (Color uses 0..255 channels; raw form is 0..1):
instance.setColor(new Color(255, 120, 60)); // warm tint
instance.setColor(1.0, 0.4, 0.2, 1.0); // same, as raw 0..1 RGBA

// Or drive it through the InstancedTexture by index:
instancedTexture.updateInstanceColor(0); // re-read instance 0's tint
instancedTexture.updateAllInstanceColors(); // re-read every instance's tint
```

Tip: for additive sparkle/coin glows, set the instanced texture's blend mode: `instancedTexture.setBlendMode("additive")`.

### Per-instance atlas regions

Normally every instance samples the shared frame grid (`instance.frame`). With `setTexCoords` an instance carries its own UV quad instead, so a single InstancedTexture (one draw call) can batch tiles from an atlas with margins and spacing, apply per-instance flips, or mix arbitrary sprite regions:

```javascript
const tile = new Instance(
  "tile",
  new Vector3(x, y, 0),
  new Vector2(32, 32),
  rotation
);
// 8 floats, one vec2 per corner in getFrameTexCoords order: (R,B) (L,B) (R,T) (L,T)
tile.setTexCoords([right, bottom, left, bottom, right, top, left, top]);
instancedTexture.addInstance(tile);
instancedTexture.setStatic(true); // non-moving batch: matrices upload once
```

This is exactly how the Tile Forge level loader renders a whole layer of sliced, rotated, flipped tiles as one draw call. Pass `null` to return an instance to the frame grid.

### Per-instance animation

Instancing and sprite animation aren't mutually exclusive: each `Instance` can run its own independent frame sequence, still batched into the same single draw call.

```javascript
// Every instance can animate on its own, at its own pace:
instancedTexture.animateInstance(zombie1.id, [0, 1, 2, 3], 150);
instancedTexture.animateInstance(zombie2.id, [4, 5, 6], 250); // a different clip, different speed
instancedTexture.stopInstanceAnimation(zombie1.id, true); // stop, and revert to its original frame

// Or animate every instance together, in lockstep: current ones immediately,
// and any added later automatically join in:
instancedTexture.playAnimation([0, 1, 2, 3], 150); // loops
instancedTexture.playAnimationOnce([10, 11, 12], 150); // plays once, holds the last frame
instancedTexture.getAnimation(); // -> the frames array currently set this way
instancedTexture.stopAnimation(); // stop the shared animation on every instance
```

`playAnimation`/`playAnimationOnce` set the animation every instance plays by default; `animateInstance` overrides that for one instance specifically (a boss that should stay in its own attack animation while the rest of the horde keeps walking, say).

## Physics Engine

Emerald ships its own 2D rigid-body physics engine, with no external dependency. It has a dynamic AABB tree broadphase, a separating-axis narrowphase, an impulse solver with warm starting so stacks settle instead of sinking or jittering, island-based sleeping, and continuous collision detection for fast bodies.

### Setting up Physics

```javascript
import { Physics } from "emeraldengine";
/*
    ARGUMENTS:
    1. gravity: number = Gravity force (negative for downward)
    2. scale: number = Scale factor for physics units to pixels
    3. velocityThreshold: number = Minimum velocity threshold
*/
const physics = new Physics(-70, 32, 2);
```

The simulation runs in physics units (meters, radians, seconds); `scale` is the pixels-per-meter conversion. Aim for bodies roughly 0.1–10 units in size; that's the range the solver tolerances are tuned for. The world itself lives at `physics.world`, and the raw classes are in `src/physics` if you want a bare world without the pixel wrapper.

You need to process physics in your own update loop:

```javascript
const animate = (currentTime) => {
  physics.process(deltaTime);
};
```

### Time stepping

`process(dt)` turns a frame's elapsed time into simulation steps, in one of two modes.

```javascript
physics.setFixedTimeStep(1 / 60, 5); // step, max substeps (default)
physics.setVariableTimeStep(1 / 30, 5); // max step, max substeps
```

**Fixed** banks real time and simulates constant-size slices. It's deterministic: the same inputs give the same result on every machine, and a slow frame can't destabilise the solver. The catch is that motion updates at the step rate, not the display rate, so on a high-refresh screen anything moved in the render frame can slide against sprites that only move every other step.

**Variable** advances once per call using the frame's own delta, so physics runs at exactly the rendering rate. It's not deterministic, and a long frame is a coarser solve. Frames longer than `maxStep` are split into equal steps rather than simulated in one lump, up to `maxSubSteps`.

```javascript
const steps = physics.process(dt); // how many steps actually ran
physics.getTimeStepMode(); // "fixed" | "variable"
physics.getInterpolationAlpha(); // 0..1 through the current fixed step, for interpolating renderables
```

### RigidBody methods

Position, velocity, forces, sleep state, mass: every operation the physics engine supports is a method on `RigidBody` itself, in world (pixel) units; the engine converts to/from physics units internally, so you never touch the scale factor.

```javascript
// Position, rotation, velocity
rigidBody.setPosition(new Vector2(100, 200));
rigidBody.setTransform(new Vector2(100, 200), Math.PI / 2); // position + angle, atomically
rigidBody.getPosition(); // Vector2, current position (not the spawn point)
rigidBody.getInitialPosition(); // Vector2, the position it was created at
rigidBody.setRotation(Math.PI);
rigidBody.setLinearVelocity(380, 0); // world units per second
rigidBody.getLinearVelocity(); // { x, y } in world units/sec
rigidBody.setAngularVelocity(2); // radians/sec
rigidBody.getAngularVelocity();
rigidBody.getLinearVelocityFromWorldPoint({ x, y }); // velocity at a point on the body, spin included

// Forces and impulses (world units)
rigidBody.applyForce(fx, fy); // accumulates; cleared automatically each step
rigidBody.applyForce(fx, fy, { x, y }); // applied off-center, adds torque
rigidBody.applyForceToCenter(fx, fy); // never adds torque
rigidBody.applyTorque(torque);
rigidBody.applyImpulse(ix, iy); // instantaneous, at the center: jumps, knockback
rigidBody.applyImpulse(ix, iy, { x, y }); // instantaneous, off-center, adds spin
rigidBody.applyAngularImpulse(impulse);

// Sleeping, activity, rotation lock
rigidBody.setAwake(true); // wake (or sleep) the body
rigidBody.isAwake();
rigidBody.setSleepingAllowed(false); // this body should never sleep
rigidBody.isSleepingAllowed();
rigidBody.setActive(false); // pull out of collision detection without destroying it
rigidBody.isActive();
rigidBody.setFixedRotation(true); // lock rotation at runtime
rigidBody.isFixedRotation();
rigidBody.setType("kinematic"); // change body type at runtime

// Damping, gravity, mass
rigidBody.setLinearDamping(0.5);
rigidBody.getLinearDamping();
rigidBody.setAngularDamping(0.2);
rigidBody.getAngularDamping();
rigidBody.setGravityScale(2); // 0 disables gravity for this body, 2 doubles it
rigidBody.getGravityScale();
rigidBody.getMass();
rigidBody.getInertia();
rigidBody.resetMassData(); // re-derive from fixtures after changing a density
rigidBody.setMassData({ mass, center, I }); // override directly; center is world units

// Local/world point and vector conversions (world units in and out)
rigidBody.getWorldPoint(localPoint);
rigidBody.getLocalPoint(worldPoint);
rigidBody.getWorldVector(localVector);
rigidBody.getLocalVector(worldVector);

// Fixtures, without going through a Collider component
rigidBody.createFixture(shape, { density, friction, restitution });
rigidBody.destroyFixture(fixture);

// Your own data, and the world/contacts this body belongs to
rigidBody.setUserData({ kind: "crate", hp: 3 });
rigidBody.getUserData();
rigidBody.getWorld();
rigidBody.getContactList();
```

`setUserData`/`getUserData` are entirely separate from the physics engine's own internal bookkeeping (which is how collisions get routed back to this RigidBody), so setting your own data can never interfere with that.

### Collision Detection

```javascript
// Handle collision enter
physics.onCollisionEnter((bodyA, bodyB, contact) => {
  console.log("Collision started!");

  // Get collision normal. It always points from fixture A's body towards
  // fixture B's, so read it relative to the body you care about:
  const manifold = contact.getWorldManifold();
  const normal = manifold.normal;
  const facingPlayer = contact.getFixtureA().getBody() === playerBody;
  const n = facingPlayer ? normal : { x: -normal.x, y: -normal.y };
  // n.y = -1 the player is standing on something (with y-down gravity)
  // n.y =  1 the player hit a ceiling
  // n.x = -1 / 1 the player hit a wall on that side
  // manifold.separations[i] is how deep contact point i is (negative = overlap)

  // Check if bodies are sensors
  const fixtureA = contact.getFixtureA();
  const fixtureB = contact.getFixtureB();
  if (fixtureA.isSensor() || fixtureB.isSensor()) {
    // Handle sensor collision
  }
});

// Handle collision exit
physics.onCollisionExit((bodyA, bodyB, contact) => {
  console.log("Collision ended!");
});
```

Per-object collision events also fire automatically on `Behaviour` components (`onCollisionEnter`/`onCollisionExit`) for any GameObject with a RigidBody. See [Behaviour](#behaviour-component-lifecycle).

### Collision layers

`CollisionLayers` maps human-readable layer names to the category bits the physics engine uses for filtering, so you can express "players collide with ground and enemies, but not each other" without juggling bitmasks. Two fixtures collide only when each one's category is in the other's mask.

```javascript
import { CollisionLayers } from "emeraldengine";

CollisionLayers.define("ground", "player", "enemy", "pickup");

playerCollider
  .setCategory("player")
  .setCollidesWith(["ground", "enemy", "pickup"]);
enemyCollider.setCategory("enemy").setCollidesWith(["ground", "player"]); // ignore each other

// Or up front, in the collider constructor's filter argument:
new BoxCollider(body, size, 1, 0.2, 0, false, gameObject, {
  category: "pickup",
  collidesWith: ["player"],
});

// Raw control if you prefer bits:
collider.setFilter({ category: 0x0004, mask: 0xffff, group: 0 });
```

### Continuous collision detection

Fast bodies (a dash, a projectile, a hard fall) can move far enough in one physics step to tunnel through thin walls. Mark them continuous so the engine sweeps their path against static geometry instead of testing only where they ended up:

```javascript
projectile.setContinuous(true); // bullet-mode CCD
projectile.isContinuous(); // boolean
```

Reserve it for the handful of bodies that actually move fast; it costs more per step.

### Raycasting & point queries

```javascript
const hit = physics.raycast({ x, y }, { x: 1, y: 0 }, 500);
// -> { object, rigidBody, point, normal, fraction } | null

const objects = physics.queryPoint({ x, y }); // owners whose collider contains the point
```

### Tilemap colliders & auto-tiling

A `Tilemap` can generate physics colliders from its map and auto-pick tile frames from a solidity grid.

```javascript
// 1) Build solid colliders from the current map.
//    Solid cells are merged greedily into horizontal runs, so a row of N tiles
//    becomes ONE static box collider instead of N.
map.setMap(grid, { originX: 0, originY: 0, flipY: true });
map.buildColliders(physics, {
  isSolid: (frame) => frame != null && frame >= 0, // default
  friction: 0.2,
  restitution: 0,
  density: 0,
  ownerObject: map.gameObject, // collision callbacks resolve back to this
});
map.clearColliders(); // destroy the generated bodies (e.g. before a rebuild)

// 2) Auto-tiling: turn a boolean solidity grid into frame indices using a
//    4-bit edge bitmask (up|right|down|left = bits 1,2,4,8). Empty cells -> -1.
const frames = Tilemap.computeAutoTile(solidGrid, {
  frames: lookup16, // optional length-16 mask -> frame map matching your sheet
  base: 0, // added to every solid frame when no lookup is given
  edgesSolid: true, // treat out-of-bounds as solid
});
map.setAutoTiledMap(solidGrid, { base: 0, originX: 0, originY: 0 }); // compute + setMap
```

## Particle System

Emerald includes a powerful particle system for creating visual effects.

![Particles](https://github.com/vahan-gev/emeralddocs/blob/main/github/videos/particles.gif?raw=true)

### Particle Settings

```javascript
import { ParticleSettings, Vector2, Color } from "emeraldengine";

const particleSettings = new ParticleSettings({
  lifetime: 1.2,
  velocity: new Vector2(200, 300),
  gravity: new Vector2(0, -400),
  amount: 16,
  direction: new Vector2(0, 1), // upward
  spread: Math.PI * 2,
  emissionRate: Infinity, // one-shot emission
  frame: 0,
  offset: 5,
  rotation: 0,
  scale: new Vector2(5, 5),
  animation: { frames: [0, 1, 2], speed: 200 },

  // Emitter shape: where new particles spawn relative to the emit point:
  //   "point" | "circle" | "ring" | "box" | "cone" (default)
  shape: "ring",
  shapeRadius: 24, // used by circle/ring
  shapeSize: new Vector2(40, 10), // used by box

  // Over-lifetime curves ({ from, to } interpolated by normalized age):
  scaleOverLife: { from: 1.4, to: 0.0 }, // size multiplier
  alphaOverLife: { from: 1.0, to: 0.0 }, // opacity
  colorOverLife: {
    from: new Color(255, 240, 180),
    to: new Color(255, 90, 60),
  },

  rotationSpeed: Math.PI, // radians/sec per particle
  drag: 1.2, // velocity damping per second (0 = none)
});
```

### Creating Particle Systems

```javascript
import { Particles } from "emeraldengine";

/*
    ARGUMENTS:
    1. name: string = Name of the particle system
    2. texturePath: string = Path to the texture
    3. frameWidth: number = Width of each frame
    4. frameHeight: number = Height of each frame
    5. framesPerRow: number = Frames per row in spritesheet
    6. totalFrames: number = Total frames in spritesheet
    7. duration: number = Duration of the effect
    8. settings: ParticleSettings = Particle settings object
*/
const particles = new Particles(
  "explosion",
  texturePath,
  16,
  16,
  9,
  27,
  1.2,
  particleSettings
);

// Add to scene
scene.add(particles.gameObject);
```

### Particle System Methods

```javascript
// Play particle effect at position
particles.play(new Vector3(x, y, z));

// Stop particle system
particles.stop();

// Reset particle system
particles.reset();

// Update particles (call in your animation loop)
particles.update(deltaTime);

// Check if active
if (particles.active) {
  // Particles are currently active
}
```

### ParticleEmitter (simple pooled bursts)

If you don't need per-particle curves, `ParticleEmitter` is a simpler, allocation-free system built from a fixed pool of textured GameObjects, good for one-off bursts (dust, sparkles, confetti, hit effects). Spawn with `burst(n, cfg)` / `emit(cfg)`; every `cfg` field is optional.

```javascript
import { ParticleEmitter } from "emeraldengine";

const fx = new ParticleEmitter(scene, {
  texture: "spark.png",
  capacity: 256, // pool size (max live particles)
  layer: 50,
});

fx.burst(12, {
  x: 200,
  y: 120,
  dir: -Math.PI / 2,
  spread: Math.PI,
  speed: 180, // emission cone
  gx: 0,
  gy: -300,
  drag: 2,
  life: 0.4,
  size: 8,
  sFrom: 1,
  sTo: 0.1, // scale over life
  aFrom: 0.7,
  aTo: 0, // alpha over life
  cr: 255,
  cg: 220,
  cb: 120,
  additive: true,
  rotSpeed: 6,
  shape: "ring",
  radius: 12, // "point" | "ring" | "circle" | "box"
});

// in the loop:
fx.update(dt);
fx.activeCount; // live particles
fx.reset(); // kill all immediately
fx.destroy(); // remove pooled objects from the scene
```

## Lighting System

Emerald supports ambient, point, and directional lighting.

### Ambient Light

```javascript
// Set ambient light
emerald.setAmbientLight(new Vector3(0.3, 0.3, 0.3)); // RGB values 0-1
```

### Point Light

```javascript
import { PointLight } from "emeraldengine";

/*
    ARGUMENTS:
    1. position: Vector2 = Position of the light
    2. color: Color = Color of the light
    3. intensity: number = Light intensity
    4. radius: number = Light radius
*/
const pointLight = new PointLight(
  new Vector2(100, 0),
  new Color(255, 204, 153),
  1.5,
  400
);

// Add to engine
emerald.addPointLight(pointLight);

// Update position
pointLight.position.x = newX;
pointLight.position.y = newY;
```

### Directional Light

```javascript
import { DirectionalLight } from "emeraldengine";

/*
    ARGUMENTS:
    1. position: Vector2 = Position of the light
    2. direction: Vector2 = Direction vector
    3. color: Color = Color of the light
    4. intensity: number = Light intensity
    5. width: number = Width of the light beam
*/
const directionalLight = new DirectionalLight(
  new Vector2(0, 300),
  new Vector2(0, -1), // pointing down
  new Color(255, 255, 255),
  3.0,
  200
);

// Add to engine
emerald.addDirectionalLight(directionalLight);

// Rotate direction
const angle = 0.1;
const newX =
  directionalLight.direction.x * Math.cos(angle) -
  directionalLight.direction.y * Math.sin(angle);
const newY =
  directionalLight.direction.x * Math.sin(angle) +
  directionalLight.direction.y * Math.cos(angle);
directionalLight.direction.x = newX;
directionalLight.direction.y = newY;
```

## Text Rendering

### BitmapText

Emerald supports bitmap font rendering using the BitmapText component. This allows you to display text with custom fonts and styles.

![BitmapText](https://github.com/vahan-gev/emeralddocs/blob/main/github/screenshots/bitmaptext.png?raw=true)

```javascript
import { BitmapText } from "emeraldengine";

/*
    ARGUMENTS:
    1. text: string = Text to display
    2. texturePath: string = Path to bitmap font texture
    3. letters: string = String containing all available characters
    4. letterSpacing: number = Spacing between letters
    5. frameWidth: number = Width of each character frame
    6. frameHeight: number = Height of each character frame
    7. framesPerRow: number = Characters per row in font texture
    8. totalFrames: number = Total character frames
    9. pixelArt: boolean = Whether to use pixel art rendering
    10. fontSize: number = Font size
    11. color: Color = Text color
    12. position: Vector3 = Text position
    13. rotation: number = Text rotation
    14. useLighting: boolean = Whether text should react to lighting
*/
const bitmapText = new BitmapText(
  "Hello World!",
  fontTexturePath,
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?.",
  16,
  32,
  32,
  10,
  95,
  true,
  24,
  new Color(255, 255, 255),
  new Vector3(0, 200, 0),
  0,
  false
);

// Add to scene
scene.add(bitmapText.gameObject);

// Update text
bitmapText.setText("New Text!");
bitmapText.setColor(new Color(255, 0, 0));
bitmapText.setFontSize(32);
bitmapText.setLetterSpacing(20);
```

### CanvasText

`CanvasText` renders any CSS font (including loaded webfonts) into a texture, at the device pixel ratio so text is crisp on Retina/HiDPI displays, with support for multi-line strings, word-wrapping, and alignment. Use `BitmapText` for retro/pixel fonts from a glyph sheet, `CanvasText` for everything else (UI, dialogue, any real font).

```javascript
import { CanvasText } from "emeraldengine";

// Factory: returns a GameObject already sized to the text
const label = CanvasText.create("Score: 0", {
  font: "700 24px 'Pixelify Sans', sans-serif",
  color: "#8fe0ff",
  screenSpace: true, // HUD: fixed on screen, position in px from center
  position: new Vector3(0, 240, 0),
});
scene.add(label);

// Multi-line + wrapping
const dialog = CanvasText.create(
  "A long line of dialogue that wraps automatically.\nExplicit breaks work too.",
  { font: "16px system-ui", maxWidth: 320, align: "left", lineHeight: 22 }
);

// Updating (re-renders the texture; attached GameObject rescales to fit)
const text = label.getComponent(CanvasText);
text.setText("Score: 120");
text.setColor("#ffd166");
text.setMaxWidth(400);
text.setAlign("center"); // "left" | "center" | "right"
```

## Input

Emerald supports keyboard, mouse, click, and hover events through the built-in `EventManager` class, plus a higher-level action-mapping `InputManager` for gameplay input (keyboard, mouse and gamepad through one API).

![EventManager](https://github.com/vahan-gev/emeralddocs/blob/main/github/videos/eventmanager.gif?raw=true)

```javascript
import { EventManager } from "emeraldengine";

let eventManager = new EventManager(canvas, scene, emerald.camera);
```

`EventManager` hits only the topmost object under the pointer, and its `screenToWorld(clientX, clientY)` accounts for camera zoom, DPR, and viewport.

### Keyboard Events

```javascript
// Key down events
eventManager.addKeyDown("w", () => {
  console.log("W key pressed");
});

// Key up events
eventManager.addKeyUp("w", () => {
  console.log("W key released");
});

// Check if key is currently pressed
if (eventManager.isKeyPressed("w")) {
  // W key is currently held down
}

// Remove key events
eventManager.removeKeyDown("w", callbackFunction);
eventManager.removeKeyUp("w", callbackFunction);
```

### Mouse Events

```javascript
// Get mouse position
const mousePos = eventManager.getMousePosition();
console.log(mousePos.x, mousePos.y);

// Check if camera was moved
if (eventManager.wasCameraMoved()) {
  // Camera was moved by dragging
  eventManager.resetCameraMoved();
}
```

### Object Events

```javascript
// Click events
eventManager.addClickEvent(gameObject, (event, object) => {
  console.log("Object clicked!");
});

// Hover events
eventManager.addHoverEvent(
  gameObject,
  (event) => {
    console.log("Mouse entered object");
  },
  (event) => {
    console.log("Mouse left object");
  }
);

// Remove events
eventManager.removeClickEvent(gameObject, callbackFunction);
eventManager.removeHoverEvent(gameObject, enterCallback, leaveCallback);
```

### Event Cleanup

```javascript
// Clean up all events when done
eventManager.clean();

// Change scene
eventManager.changeScene(newScene);
```

### InputManager (actions)

For gameplay, `InputManager` lets you bind named actions once and read them everywhere: keyboard keys, mouse buttons, gamepad buttons and analog stick directions are all just tokens:

```javascript
import { InputManager } from "emeraldengine";
const input = new InputManager();
input.mapAction("jump", ["Space", " ", "pad:0:south"]); // keyboard + gamepad
input.mapAction("left", ["a", "ArrowLeft", "pad:0:dpadLeft"]);
// in the loop:
if (input.justPressed("jump")) player.jump();
const move = input.getAxis("left", "right"); // -1 / 0 / +1
input.update(); // call once per frame (edge detection + gamepad polling)
```

### Gamepads & Controllers

Full controller support is built into `InputManager`: analog sticks/triggers, semantic button names that resolve through each pad's mapping, rumble, connect/disconnect events, and a registry for non-standard controllers. Gamepad input flows through the same `isDown`/`justPressed`/`getAxis` machinery as the keyboard, so a token like `"pad:0:south"` works anywhere a key token does.

`pad:<i>:<name>` targets pad index `<i>`. Names resolve through the pad's mapping, so `south` is always the bottom face button whether the pad reports Xbox or PlayStation ordering:

| Tokens                                                                                | Buttons                                |
| -------------------------------------------------------------------------------------- | --------------------------------------- |
| `south`/`a`/`cross`, `east`/`b`/`circle`, `west`/`x`/`square`, `north`/`y`/`triangle` | face buttons                           |
| `l1`/`lb`, `r1`/`rb`, `l2`/`lt`, `r2`/`rt`                                            | shoulders / triggers                   |
| `select`/`back`/`view`/`share`, `start`/`menu`/`options`, `guide`/`home`              | center                                 |
| `l3`/`leftStick`, `r3`/`rightStick`                                                   | stick clicks                           |
| `dpadUp`/`up`, `dpadDown`/`down`, `dpadLeft`/`left`, `dpadRight`/`right`              | d-pad                                  |
| `pad:<i>:<n>`                                                                         | raw button index (mapping-independent) |
| `pad:<i>:axis<n>+` / `axis<n>-`                                                       | analog axis past the deadzone          |
| `pad:<i>:leftStickUp/Down/Left/Right`, `rightStick...`                                | analog stick as a d-pad                |

`getGamepadStick` applies a radial deadzone (on the stick's distance from center, not per axis), rescaled so there's no jump at the threshold, with an optional response curve:

```javascript
input.setGamepadDeadzone(0.25);
input.setGamepadCurve(2); // finer control near center (great for camera sticks)
const { x, y, magnitude, angle } = input.getGamepadStick("left", 0, {
  invertY: true,
});
```

Sticks, triggers and rumble:

```javascript
const { x, y } = input.getGamepadStick("left"); // deadzoned -1..1
const aim = input.getGamepadStick("right");
const t = input.getGamepadTrigger("right"); // 0..1
input.getGamepadButton("south").pressed; // also .value, .index

input.rumble(0, { duration: 120, strong: 0.6, weak: 0.4 }); // where supported
```

Connection events and diagnostics:

```javascript
input.onGamepadConnected((info) =>
  console.log(info.id, info.mapping, info.buttonCount, info.axesCount)
);
input.onGamepadDisconnected((info) => pauseFor(info.index));

input.isGamepadConnected(0);
input.getGamepadInfo(0); // { id, mapping, buttonCount, axesCount, standard }
input.getPressedButtons(0); // raw indices currently pressed (layout discovery)
```

Most pads (and anything via XInput / Steam Input) report `mapping === "standard"` and work out of the box. Common DirectInput pads (Logitech Dual Action, generic Twin-USB PS2 adapters, 8BitDo in D-input mode) are recognized out of the box too. For anything else, register a mapping once; it only applies to pads whose id matches and that aren't already standard:

```javascript
InputManager.registerGamepadMapping("my-controller-id", {
  buttons: { south: 1, east: 2, west: 0, north: 3, start: 9 },
});
```

D-pads reported as a hat axis (instead of buttons 12–15) are decoded into the `dpad*` tokens automatically.

## AudioManager

Emerald includes a comprehensive audio management system.

### Adding Audio

```javascript
import { AudioManager } from "emeraldengine";

const audioManager = new AudioManager();

// Add audio files
audioManager.add("path/to/sound.wav", "soundName", { volume: 0.8, loop: false });
audioManager.add("path/to/music.mp3", "backgroundMusic", { bus: "music", loop: true });
```

### Playing Audio

```javascript
// Play audio
audioManager.play("soundName"); // restarts from 0

// Play overlapping copies, for rapid SFX
audioManager.playOverlap("soundName");

// Play exclusively (stops all other audio first)
audioManager.playExclusive("soundName");
```

### Audio Control

```javascript
// Stop specific audio
audioManager.stop("soundName");

// Stop all audio
audioManager.stopAll();

// Remove audio
audioManager.remove("soundName");

// Get audio object
const sound = audioManager.getSound("soundName");
```

### Buses & Fades

Every sound belongs to a named mix bus. `"music"` and `"sfx"` exist by default (new sounds land on `"sfx"`), and any name you use creates a bus on the fly. Effective volume is `master × bus × sound × fade`, so one slider mutes all music without touching the SFX:

```javascript
audioManager.setMasterVolume(0.5);
audioManager.setBusVolume("music", 0.5); // the settings-menu "music volume" slider
audioManager.setBusVolume("sfx", 0.8);
audioManager.setSoundBus("thunder", "ambience"); // move a sound, creating the bus
audioManager.getBusVolume("music"); // 0.5
```

Fades run on the manager's clock (self-driven via rAF by default; pass `{ autoTick: false }` and call `audioManager.update(dt)` yourself to tie them to the game loop):

```javascript
audioManager.fadeIn("theme", 1.5); // play from silence to full over 1.5s
audioManager.fadeOut("theme", 2.0); // fade to silence, then stop
audioManager.fadeTo("theme", 0.2, 0.5); // duck under dialogue
audioManager.crossfade("theme", "boss", 2.0); // level -> boss music, one call
```

### Positional Audio

`AudioManager` can also attenuate and pan sounds based on a listener position, using the Web Audio `StereoPanner` where available and falling back to volume-only panning otherwise.

```javascript
audioManager.setListener(player.x, player.y); // usually the camera/player each frame
audioManager.setSpatialRange(100, 800); // full volume <100px, silent >800px

audioManager.playSpatial("explosion", { x: 1200, y: 50 }); // one-shot, positioned

// Pure helper (also used internally), handy for custom routing/tests:
const { volume, pan, distance } = audioManager.computeSpatial({ x, y });
```

## Camera

The engine has simple controls for the camera. The camera is stored in the emerald variable.

```javascript
// Set camera position
emerald.camera.setPosition(x, y, z);
emerald.camera.setZoom(1.5);

// Access camera transform directly
emerald.camera.transform.position.x = 100;
emerald.camera.transform.position.y = 200;
emerald.camera.transform.scale.x = 1.5;
emerald.camera.transform.scale.y = 1.5;
```

Multiple cameras are supported, each with a normalized viewport (origin bottom-left), useful for split-screen:

```javascript
import { Camera, CameraController } from "emeraldengine";

const top = new Camera({ viewport: { x: 0, y: 0.5, width: 1, height: 0.5 } });
const bottom = new Camera({ viewport: { x: 0, y: 0, width: 1, height: 0.5 } });
emerald.setCameras([top, bottom]); // or emerald.addCamera(cam) / removeCamera(cam)

top.clearColor = new Color(10, 14, 20); // optional per-viewport clear
top.setIgnoreLayers([11, 20]); // skip these object layers in this camera
```

`CameraController` adds smooth follow, bounds, a deadzone, and shake:

```javascript
const cam = new CameraController(emerald.camera);
cam
  .follow(player.gameObject, 0.12)
  .setDeadzone(90, 60) // half-extents in world units; camera only scrolls once the target leaves this box; 0/0 or null disables
  .setBounds(-1000, -1000, 1000, 1000);
cam.shake(10, 0.3);
// each frame: cam.update(dt);
```

## FPSCounter

Emerald has a built-in FPS counter.

```javascript
import { FPSCounter } from "emeraldengine";
let fpsCounter = new FPSCounter();

const animate = (currentTime) => {
  emerald.drawScene(scene, deltaTime);
  fpsCounter.update(); // Call this in your animation loop
  window.requestAnimationFrame(animate);
};
animate();
```

## Time Management

```javascript
import { Time } from "emeraldengine";

// Get delta time
const deltaTime = Time.deltaTime; // or Time.getDeltaTime()
Time.getUnscaledDeltaTime(); // raw delta, ignores timeScale
Time.getElapsedTime(); // total accumulated time

// Time is automatically updated when you call emerald.drawScene()
// You can also manually set it
Time.setDeltaTime(deltaTime);

// Slow down / speed up / pause the whole game:
Time.setTimeScale(0.5); // 0 = paused, 1 = normal, 2 = double speed
Time.getTimeScale();
```

## Tween, Timer & StateMachine

```javascript
import { Tween, Easing } from "emeraldengine";
Tween.to(sprite.transform.position, { x: 200, y: -50 }, 0.6, {
  easing: Easing.outBack, // linear, inOutQuad, outCubic, outBounce, outElastic, ...
  delay: 0,
  loop: false,
  yoyo: false,
  onUpdate: (t) => {},
  onComplete: () => {},
}).then(() => console.log("done"));
Tween.killOf(target);
Tween.killAll();
// driven automatically by drawScene
```

```javascript
import { Timer } from "emeraldengine";
Timer.after(2, () => spawnEnemy()); // once
const h = Timer.every(0.5, () => tick(), 10); // 10 times (omit count = forever)
Timer.clear(h);
Timer.clearAll();
```

```javascript
import { StateMachine } from "emeraldengine";
const fsm = new StateMachine();
fsm.add("idle", {
  update: (dt, sm) => {
    if (seen) sm.set("chase");
  },
});
fsm.add("chase", { enter: () => roar(), update: (dt) => move(dt) });
fsm.set("idle");
// in update(dt): fsm.update(dt);  -> fsm.is("chase")
```

## SpatialGrid & Pool

```javascript
import { SpatialGrid } from "emeraldengine";
const grid = new SpatialGrid(64);
grid.clear();
for (const e of enemies)
  grid.insert(e, e.transform.position.x, e.transform.position.y);
const near = grid.queryRadius(px, py, 100); // or grid.queryRect(...)
```

```javascript
import { Pool } from "emeraldengine";
const bullets = new Pool(
  () => new Bullet(),
  (b, x, y) => b.spawn(x, y),
  50
);
const b = bullets.acquire(px, py);
bullets.release(b); // bullets.releaseAll()
```

## MathUtils

```javascript
import { MathUtils } from "emeraldengine";
MathUtils.clamp(v, 0, 1);
MathUtils.lerp(a, b, t);
MathUtils.map(v, 0, 10, 0, 100);
MathUtils.degToRad(90);
MathUtils.randomRange(0, 5);
MathUtils.randomInt(1, 6);
MathUtils.distance(a, b);
MathUtils.normalize(v);
MathUtils.angleBetween(a, b);
```

## Coroutines

Generator-based sequencing layered on the same per-frame delta the rest of the engine uses. It's driven automatically from `Emerald.drawScene`, so coroutines honor pause/slow-mo via `Time.timeScale`.

```javascript
import { Coroutine } from "emeraldengine";

const handle = Coroutine.start(function* () {
  big.setText("3");
  audio.beep();
  yield 0.7; // wait 0.7 seconds
  big.setText("2");
  audio.beep();
  yield 0.7;
  yield Coroutine.waitFrames(3); // wait 3 frames
  yield Coroutine.waitUntil(() => player.ready); // block until predicate is truthy
  yield Coroutine.waitWhile(() => paused); // block while predicate is truthy
  yield fetch("/level.json"); // await any promise
  yield Coroutine.tween(0, 1, 0.5, (v) => (door.openAmount = v)); // drive a value
  yield otherCoroutineHandle; // wait for a nested coroutine
  start();
});

handle.cancel(); // stop it early
handle.isRunning(); // boolean
await handle.promise; // resolves when the coroutine finishes or is cancelled

Coroutine.count(); // number of running coroutines
Coroutine.clearAll(); // cancel + remove every coroutine (e.g. on scene exit)
```

## Rendering Pipeline

### Post-processing

When post-processing is enabled, Emerald renders the whole scene into an offscreen texture and then runs a chain of full-screen shader passes before drawing the final image to the canvas. You manage it entirely through the `Emerald` instance:

```javascript
emerald.enablePostProcessing(); // allocate the scene render target + processor
emerald.disablePostProcessing(); // turn it back off

const bloom = emerald.addPostEffect(PostEffects.bloom()); // returns the effect
emerald.removePostEffect(bloom);

// Effects run in the order they were added. Toggle one without removing it:
bloom.enabled = false;
```

`drawScene` automatically routes through the processor while any enabled effect exists; if none do, it draws straight to the screen with zero overhead.

Write a custom pass by constructing a `PostEffect`. Your fragment shader (GLSL ES 3.00) gets `vUV` (0–1 screen UV), `uScene` (the previous pass), `uResolution`, and `uTime` for free, and writes its result to `fragColor`. Declare any extra uniforms and set them in `setUniforms`:

```javascript
import { PostEffect } from "emeraldengine";

const tint = new PostEffect(
  "tint",
  `
  uniform vec3 uTint;
  void main() {
    fragColor = texture(uScene, vUV) * vec4(uTint, 1.0);
  }`,
  {
    setUniforms: (gl, loc) => gl.uniform3f(loc("uTint"), 1.0, 0.85, 0.7),
    enabled: true,
  }
);
emerald.addPostEffect(tint);
```

Keep UI crisp by rendering it on a camera excluded from post-processing: it draws straight to the screen after the effect chain, so bloom never blows out your buttons and text:

```javascript
const uiCam = new Camera({ excludeFromPost: true }); // or uiCam.setExcludeFromPost(true)
emerald.addCamera(uiCam);
hudObject.setLayer(100); // and restrict cameras via setOnlyLayers/ignoreLayers
```

### PostEffects (built-in)

Factory functions on the `PostEffects` namespace return a ready `PostEffect`:

```javascript
import { PostEffects } from "emeraldengine";

emerald.enablePostProcessing();
emerald.addPostEffect(
  PostEffects.bloom({ threshold: 0.6, intensity: 1.2, spread: 1.1 })
);
emerald.addPostEffect(
  PostEffects.vignette({ intensity: 0.5, radius: 0.75, softness: 0.45 })
);
emerald.addPostEffect(
  PostEffects.colorGrade({ brightness: 0.02, contrast: 1.08, saturation: 1.15 })
);
emerald.addPostEffect(PostEffects.chromaticAberration({ amount: 0.003 }));
emerald.addPostEffect(PostEffects.scanlines({ intensity: 0.15, count: 480 }));
emerald.addPostEffect(
  PostEffects.crt({ curvature: 4.0, scanlineIntensity: 0.2, vignette: 0.3 })
);
emerald.addPostEffect(PostEffects.grayscale());
```

| Effect                | Options (defaults)                                          |
| --------------------- | ------------------------------------------------------------ |
| `bloom`               | `threshold 0.7`, `intensity 1.0`, `spread 1.0` (multi-pass)  |
| `vignette`            | `intensity 0.5`, `radius 0.75`, `softness 0.45`              |
| `colorGrade`          | `brightness 0`, `contrast 1`, `saturation 1`                 |
| `chromaticAberration` | `amount 0.003`                                                |
| `scanlines`           | `intensity 0.15`, `count 480`                                 |
| `crt`                 | `curvature 4.0`, `scanlineIntensity 0.2`, `vignette 0.3`     |
| `grayscale`           | none                                                           |

`bloom` is exported as a class too (`BloomEffect`) if you want to subclass it.

### RenderTarget

An offscreen framebuffer backed by a color texture (and an optional depth buffer). Used internally by the post-processor, but useful on its own for minimaps, mirrors, or picture-in-picture.

```javascript
import { RenderTarget } from "emeraldengine";

const rt = new RenderTarget(512, 512, { depth: false, pixelart: false });
rt.bind(); // binds the FBO and sets the viewport to its size
// ...draw...
rt.unbind(); // restore the canvas framebuffer
// rt.texture now holds the rendered image (a WebGLTexture)
rt.resize(1024, 1024); // reallocates only if the size changed
rt.dispose(); // free GL resources
```

### Material (custom shaders)

A `Material` replaces a Drawable's fragment shader while reusing the engine's standard vertex shader, so transforms, the camera, and instancing keep working. Your fragment program (GLSL ES 3.00) automatically has `vTexCoord`, `vFragPos`, `vInstanceColor`, `uSampler`, `uColor`, `uOpacity`, and `uTime`, and writes its result to `fragColor`. Don't redeclare them; declare any extra uniforms and push values with `set(name, value)`.

Older shaders written with `texture2D` and `gl_FragColor` keep working unchanged.

```javascript
import { Material, Square2D } from "emeraldengine";

const dissolve = new Material(
  `
  uniform float uAmount;
  void main() {
    vec4 c = texture(uSampler, vTexCoord);
    if (c.a < uAmount) discard;
    fragColor = c * uColor * uOpacity;
  }
  `,
  { uniforms: { uAmount: 0.0 } }
);

const shape = new Square2D();
shape.setMaterial(dissolve); // any Drawable: Texture, Square2D, Circle2D…
gameObject.addComponent(shape);

// Animate a uniform (numbers, vec2/3/4 arrays, or functions are accepted):
dissolve.set("uAmount", 0.5);
dissolve.set("uPulse", () => 0.5 + 0.5 * Math.sin(performance.now() / 300));
```

### SpriteBatch

A dynamic batched renderer with its own minimal shader. Instead of one draw call per sprite, it accumulates sprites that share a texture into a single interleaved buffer and submits them in one `drawElements` call, ideal for many same-atlas quads (bullets, tiles, text glyphs).

```javascript
import { SpriteBatch } from "emeraldengine";

const batch = new SpriteBatch({ maxQuads: 2000 });
batch.begin(projectionMatrix, viewMatrix); // gl-matrix mat4 / Float32Array(16)
for (const e of entities) {
  batch.draw({
    texture: atlasTexture, // a WebGLTexture; changing it flushes the batch
    x: e.x,
    y: e.y,
    w: 32,
    h: 32,
    rotation: e.angle,
    originX: 0.5,
    originY: 0.5,
    u0: e.u0,
    v0: e.v0,
    u1: e.u1,
    v1: e.v1, // UV sub-rect (defaults 0..1)
    r: 1,
    g: 1,
    b: 1,
    a: 1, // per-vertex tint
  });
}
batch.end(); // flushes remaining sprites
console.log(batch.drawCalls); // GL draw calls emitted this frame
```

Also worth knowing about: `obj.setLayer(10)` (layers sort before z), `hudObj.setScreenSpace(true)` (ignore the camera, position in pixels from viewport center), `drawable.setBlendMode("additive" | "normal" | "multiply")`, off-screen culling (`emerald.setCullingEnabled(true)`, `particles.alwaysVisible = true` to opt out), `TextureAtlas.load`/`applyTo` for atlas sub-rects, and `TextureManager.preload([...])` for shared/cached GL textures.

## In-Engine UI

`UI` is a retained-mode toolkit drawn entirely by the engine, with no DOM/HTML overlay. Elements are screen-space objects on a dedicated high layer with their own pointer and keyboard hit-testing. Positions are pixels from the viewport center (y up), either a literal `{x, y}` or a responsive `(viewW, viewH) => ({x, y})` function; call `relayout()` after a resize.

Pair it with a UI camera so the UI draws over the game and the game cameras skip the UI layer:

```javascript
import { UI } from "emeraldengine";

const uiCam = UI.createCamera(); // a full-screen camera that renders ONLY UI.LAYER
gameCamera.ignoreLayer(UI.LAYER); // keep the UI out of the game viewport(s)
emerald.setCameras([gameCamera, uiCam]); // add the UI camera last

const ui = new UI(scene, canvas, { accent: [120, 200, 255] });

// Labels (return a handle with setText)
const score = ui.label(() => ({ x: 0, y: 200 }), "Score: 0", {
  font: "700 30px system-ui, sans-serif",
  color: "#eaf2ff",
});
score.setText("Score: 120");

// Buttons (panel + centered label, hover highlight, click handler)
ui.button(() => ({ x: 0, y: 0 }), "START", 240, 56, {
  accent: [120, 220, 160],
  onClick: () => startGame(),
});

// Panels and a modal dimmer behind a dialog
ui.dim(0.6); // full-screen backdrop
ui.panel(() => ({ x: 0, y: 0 }), 480, 320, { opacity: 0.94 });

// Editable single-line text field
const name = ui.textField(() => ({ x: 0, y: -80 }), 280, 44, {
  placeholder: "Your name",
  maxLength: 16,
  onChange: (v) => console.log(v),
});
name.getValue();
name.setValue("P1");

ui.relayout(); // after creating/anchoring or on window resize
ui.isOver(clientX, clientY); // true if an interactive element is under the pointer
ui.destroy(); // remove all UI objects + detach listeners

UI.LAYER; // 100000, the default UI render layer
```

## ScreenEffects (transitions)

Full-screen camera transitions drawn with the engine's own screen-space quads (no CSS overlay), so they survive resolution changes, post-processing and split-screen. `fadeOut`/`fadeIn`/`flash` return promises. Call `update(dt)` each frame before `drawScene`.

```javascript
import { ScreenEffects, Color } from "emeraldengine";

const fx = new ScreenEffects(scene, { layer: 100000, size: 5000 });

await fx.fadeOut(0.4, new Color(0, 0, 0, 255)); // fade to black
loadNextLevel();
await fx.fadeIn(0.4); // fade back in

fx.flash(new Color(255, 255, 255, 255), 0.25); // quick screen flash
fx.setLetterbox(80); // animate cinematic bars to 80px; pass 0 to retract

// in the loop:
fx.update(dt);
// when leaving the scene:
fx.destroy();
```

## Scene Transitions & the Game Loop

`emerald.run(update, options)` (see [Getting Started](#getting-started)) computes a clamped delta time, optionally advances a fixed-timestep simulation, and calls your `update(dt, alpha)` each frame. `alpha` is the 0..1 interpolation factor between fixed steps (1 when no fixed step is configured).

Switch scenes behind a fade with `SceneManager.transitionTo` (wired to `ScreenEffects`), or drive the fade directly with `ScreenEffects.transition`:

```javascript
import { SceneManager, ScreenEffects, Color } from "emeraldengine";

const fx = new ScreenEffects(overlayScene); // update()'d each frame by your loop

await SceneManager.transitionTo(nextScene, {
  screenEffects: fx,
  duration: 0.4,
  color: new Color(0, 0, 0, 255),
  onSwap: (scene) => buildLevel(scene), // runs while the screen is covered
});

// Or lower-level: fade out -> swap -> fade in
await fx.transition(() => swapScenes(), { duration: 0.4 });
```

## DebugOverlay

```javascript
import { DebugOverlay } from "emeraldengine";

const debug = new DebugOverlay();
debug.setVisible(true); // toggle (e.g. bind to F3)
debug.setMetric("enemies", enemies.length); // add/refresh a custom row
debug.showColliders(scene, true); // overlay collider shapes for the scene
// after drawScene each frame:
debug.update(emerald, scene); // FPS / frame-time graph / objects / cameras
debug.destroy();
```

It shows a frame-time sparkline with min/avg/max milliseconds and heap usage, and its `draws`/`quads`/`binds` numbers come from the same render stats you can read yourself:

```javascript
const { drawCalls, quads, textureBinds } = emerald.getRenderStats();
```

Draw calls growing with level size means something isn't batched. Use `Tilemap`, `SpriteBatch`, or the level loader's instanced tile path.

## Serializer (save/load scenes)

```javascript
import { Serializer } from "emeraldengine";
Serializer.register("coin", (data) => makeCoin(data.value));
coin.prefabType = "coin";
coin.serialize = () => ({ value: 5 });
const json = Serializer.toJSON(scene); // save
Serializer.fromJSON(json, new Scene()); // load
```

## Storage (versioned saves)

`Storage.save`/`Storage.load` wrap your data in a versioned envelope (`{ v, t, data }`) with an automatic `.bak` mirror, so saves survive both corrupted writes (a torn write recovers from backup) and schema changes (old saves migrate forward instead of being discarded):

```javascript
import { Storage } from "emeraldengine";

// Write: version + timestamp envelope, plus a .bak backup by default.
Storage.save("profile", { level: 3, coins: 120 }, { version: 2 });

// Read: falls back, recovers from backup, and migrates old versions.
const profile = Storage.load("profile", {
  version: 2,
  fallback: { level: 1, coins: 0 },
  migrate: (old, fromVersion) => {
    // v1 saves had no coins field, upgrade them instead of losing progress
    return { ...old, coins: old.coins ?? 0 };
  },
  // rewrite: true (default) re-saves migrated data in the new format
});

Storage.hasSave("profile"); // true
Storage.removeSave("profile"); // deletes the save AND its backup
```

Plain pre-versioning values load as version 0, so adopting the envelope on an existing game is safe. For raw key/value access, `Storage.saveToLocalStorage`/`readFromLocalStorage` still exist.

## EmeraldDB (IndexedDB saves)

`Storage` lives on localStorage, which caps out around 5MB: plenty for settings and high scores, not for a big persistent world. `EmeraldDB` is the async, big-world companion: same versioned envelope, `.bak` backup, and migration semantics, backed by IndexedDB (effectively unlimited), and values are structured-cloned (no JSON round-trip), so Maps, Sets, Dates, and typed arrays save as-is.

```javascript
import { EmeraldDB } from "emeraldengine";

// Versioned world save, mirrors Storage.save/load, but async:
await EmeraldDB.save("world", world, { version: 3 });
const world = await EmeraldDB.load("world", {
  version: 3,
  fallback: makeNewWorld(),
  migrate: (old, fromVersion) => upgradeWorld(old, fromVersion),
});
await EmeraldDB.hasSave("world"); // true (checks the .bak too)
await EmeraldDB.removeSave("world"); // deletes save + backup

// Plain async key/value (no envelope):
await EmeraldDB.set("settings", { volume: 0.8, keybinds: new Map() });
const settings = await EmeraldDB.get("settings", {});
await EmeraldDB.keys(); // every key in the store

// Optional setup:
EmeraldDB.configure({ name: "my-game", store: "saves" }); // before first use
EmeraldDB.isSupported(); // feature-detect (falls back to Storage if false)
await EmeraldDB.importFromStorage("profile"); // one-time upgrade of an old localStorage save
```

Rule of thumb: `Storage` for small synchronous bits (settings, best times), `EmeraldDB` for the world.

## AssetManager

One async loader for everything a game needs at startup: images/textures, audio, JSON, text, and web fonts, with deduplication and aggregate progress for a loading bar. Images are routed through `TextureManager`, so the GL upload cache is shared with the rest of the engine.

```javascript
import { AssetManager } from "emeraldengine";

const assets = new AssetManager();
assets
  .image("player", "player.png", { pixelart: true })
  .audio("jump", "jump.wav")
  .json("level1", "levels/1.json")
  .text("credits", "credits.txt")
  .font("Press Start 2P", "fonts/press-start.woff2");

assets.onProgress((loaded, total) => bar.set(loaded / total));
await assets.load({ continueOnError: false }); // rejects on a failed asset unless true

assets.get("player"); // HTMLImageElement
assets.get("level1"); // parsed JSON
assets.has("jump"); // boolean
assets.progress(); // 0..1
await assets.getTexture("player"); // { texture, width, height } from the GL cache
assets.clear();
```

## Asset importers (Tiled, Aseprite & Forge)

Import maps from [Tiled](https://www.mapeditor.org), sprite-sheet animations from [Aseprite](https://www.aseprite.org), and levels from Emerald's own Tile Forge editor. All three are pure parsers/builders: hand them the already-parsed JSON (load it with `AssetManager.json` or `fetch`).

```javascript
import { TiledMap } from "emeraldengine";

// Build a ready-to-render Tilemap from a Tiled JSON map + its tile sheet.
const map = TiledMap.toTilemap(mapJson, "tiles.png", { layer: "ground" });
scene.add(map.gameObject);
map.buildColliders(physics);

// Or just the frame grid (for your own Tilemap.setMap call):
const grid = TiledMap.toFrameGrid(mapJson, { layer: "ground" });

// Object layers (spawn points, triggers) as plain data; Tiled `properties` are
// flattened into `props`, and flipY converts to a y-up world.
const spawns = TiledMap.objects(mapJson, { layer: "spawns", flipY: true });
// -> [{ name, type, x, y, width, height, gid, props, ... }]
```

```javascript
import { Aseprite, Texture, Animator } from "emeraldengine";

const cfg = Aseprite.spriteConfig(sheetJson); // { frameWidth, frameHeight, framesPerRow, totalFrames }
const tex = new Texture(
  "hero.png",
  cfg.frameWidth,
  cfg.frameHeight,
  cfg.framesPerRow,
  cfg.totalFrames,
  0,
  false
);
gameObject.addComponent(tex);

const anim = new Animator();
gameObject.addComponent(anim);
Aseprite.applyTo(anim, sheetJson); // registers a clip per frame-tag
anim.play("run");

// Or inspect the clips yourself (handles forward/reverse/pingpong):
Aseprite.toClips(sheetJson); // -> [{ name, frames:[...], speed }]
```

```javascript
import { ForgeLevel } from "emeraldengine";

/*
    ARGUMENTS (options object):
    1. scene: Scene = Scene to add the layer objects to.
    2. physics: Physics = (OPTIONAL) Physics engine; omit to skip colliders.
    3. filter: Object = (OPTIONAL) Collision filter spec for the colliders.
    4. ownerObject: GameObject = (OPTIONAL) Owner reported by collision events.
    5. pixelart: boolean = (OPTIONAL) NEAREST filtering for the atlas. Default is true.
    6. layerOrder: string = (OPTIONAL) "top-first" or "bottom-first": whether layers[0] is the topmost or bottommost layer. Default is "top-first".
*/
const map = ForgeLevel.load(levelJson, {
  scene,
  physics,
  filter: LAYERS.ground,
});

emerald.setBackgroundColor(Color.fromHex(map.background));
// map -> { tileSize, cols, rows, width, height, background, bounds,
//          layers, colliders, objects, entityTypes, toWorld }
```

Each tile layer is drawn as one draw call (an `InstancedTexture` per tileset, batched by atlas). Solid tiles become static bodies: full-tile runs are merged into single `BoxCollider`s, and a tile whose collider is a shape other than the full tile (a ramp, a wedge) gets a real `PolygonCollider` built from that shape's own points, not a bounding-box approximation. Object layers (spawns, pickups, triggers) come back as plain data in `map.objects`, already converted from grid cells to world space.

## Networking (NetworkManager + Interpolator)

A thin, optional multiplayer layer over [Colyseus](https://colyseus.io). `colyseus.js` is a peer dependency imported dynamically, so games that don't use networking never load it.

```javascript
import { NetworkManager } from "emeraldengine";

const net = new NetworkManager({ interpolation: { delay: 0.1 } });
await net.connect("wss://my-server:2567"); // dynamically imports colyseus.js
const room = await net.join("arena", { name: "P1" });

net.onMessage("hit", (msg) => applyHit(msg));
net.onStateChange((state) => {
  for (const [id, p] of state.players) net.interpolator.push(id, p, net.now());
});
net.onLeave((code) => showDisconnected(code));

net.send("move", { dir: 1 });
net.sessionId; // this client's id
await net.leave();

// each frame, render remote entities "in the past" for smoothness:
const pos = net.interpolator.sample(remoteId, net.now()); // { x, y } | null
```

`Interpolator` is also exported standalone and is pure (no network/DOM), so you can use it with any transport or in tests:

```javascript
import { Interpolator } from "emeraldengine";

const interp = new Interpolator({ delay: 0.1, maxBuffer: 60 });
interp.push(entityId, { x, y }, serverTimeSeconds); // on each authoritative update
const smoothed = interp.sample(entityId, nowSeconds); // each frame
interp.prune(nowSeconds); // bound memory for long-lived entities
interp.remove(entityId); // when an entity leaves
interp.clear();
```

## Advanced Features

### Resize Handling

```javascript
// Handle window resize
const handleResize = () => {
  const { width, height } = getCanvasDimensions();
  emerald.resize(width, height);
};

window.addEventListener("resize", handleResize);
```

### Resolution independence

Author your game at one fixed resolution and let the engine scale it to any screen:

```javascript
// Design at 960x540, letterboxed onto whatever screen the player has:
emerald.setDesignResolution(960, 540, "fit");

// Modes:
//  "fit"     letterbox: whole design visible, bars if aspect differs
//  "fill"    cover: fills the screen, crops the overflow
//  "stretch" distorts to fill exactly (no bars, no crop)
//  "pixel"   integer scaling, crisp for pixel art
emerald.clearDesignResolution(); // back to 1:1 CSS pixels

// Mouse/touch coordinates -> world space (accounts for the design scale,
// letterbox offset, camera zoom/position, and DPR):
const world = emerald.screenToWorld(input.mouse.x, input.mouse.y);
```

### Auto-pause & lifecycle

`run()` pauses the loop when the tab is hidden (stops audio-desync, timer pileups, and giant delta-time spikes on return). Hooks let you pause music or show an overlay; you can also pause manually:

```javascript
emerald.run(update, {
  pauseOnBlur: true, // default: pause when the tab is hidden
  pauseOnWindowBlur: false, // stricter: also pause when the window loses focus
  onPause: () => audio.setMasterVolume(0),
  onResume: () => audio.setMasterVolume(1),
});

emerald.pause(); // e.g. from your own pause menu
emerald.resume();
```

The first `dt` after resuming is clamped (`maxDelta`, default 0.25s), so physics never explodes after a long background stint.

### Production hardening

Removing an object from a scene keeps its GPU resources alive so it can be re-added. When something is gone for good, dispose it: shared textures are reference-counted and freed when their last user disposes:

```javascript
scene.remove(enemy, { dispose: true }); // buffers + texture reference freed
gameObject.destroy(); // same, plus physics bodies + Behaviour.onDestroy
scene.dispose(); // tear down an entire level/screen
drawable.dispose(); // lowest level, safe to call twice
```

Lost WebGL contexts (mobile tab switches, GPU resets, laptops waking) are survived automatically: rendering pauses on loss, and on restore the engine recompiles shaders, re-uploads every cached texture, rebuilds all drawable buffers, custom `Material`s, post effects, and render targets, then resumes. Optional hooks:

```javascript
emerald.onContextLost(() => overlay.show("Recovering graphics..."));
emerald.onContextRestored(() => overlay.hide());
```

Spritesheet frame UVs are inset half a texel everywhere, so frames never bleed into neighboring cells. For pixel-art games also snap the camera to whole pixels:

```javascript
emerald.camera.setPixelSnap(true); // rendered position rounds; stored position stays smooth
```

## NPM scripts

| Script           | Purpose                                      |
| ---------------- | --------------------------------------------- |
| `npm test`       | Node test suite (`node --test test/`)         |
| `npm run types`  | Regenerate `dist/types` from JSDoc via `tsc`  |
| `npm run format` | Prettier                                      |
