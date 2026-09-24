import {
  Kurai2D,
  Scene,
  Color,
  Vector2,
  Vector3,
  GameObject,
  Square2D,
  Circle2D,
  PointLight,
  ParticleEmitter,
} from "kurai2d-engine";

const canvas = document.getElementById("game");
const fpsEl = document.getElementById("fps-counter");
const particleCountEl = document.getElementById("particle-count");
const sliderRadius = document.getElementById("slider-radius");
const sliderIntensity = document.getElementById("slider-intensity");

// 1. Initialize Engine with Dark Ambient Lighting
const engine = new Kurai2D(canvas);
engine.setBackgroundColor(new Color(8, 11, 20, 255)); // Very dark blue/black
engine.setAmbientLight(new Vector3(0.12, 0.12, 0.18)); // Dim ambient

const scene = new Scene();

function onResize() {
  engine.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);
onResize();

// 2. Setup Point Light (Torch attached to cursor)
const torchLight = new PointLight(
  new Vector2(0, 0),
  new Color(251, 146, 60, 255), // Warm torch amber/orange
  1.8,
  320
);
engine.addPointLight(torchLight);

// Optional Secondary Ambient/Cool Light
const crystalLight = new PointLight(
  new Vector2(0, 0),
  new Color(56, 189, 248, 255), // Cyan crystal light
  1.4,
  240
);
engine.addPointLight(crystalLight);

sliderRadius.addEventListener("input", (e) => {
  torchLight.radius = parseFloat(e.target.value);
});

sliderIntensity.addEventListener("input", (e) => {
  torchLight.intensity = parseFloat(e.target.value);
});

// 3. Populate Scene with Objects receiving lighting (useLighting: true by default)
const pillars = [];
const GRID_ROWS = 4;
const GRID_COLS = 6;
const SPACING_X = 140;
const SPACING_Y = 120;

for (let r = 0; r < GRID_ROWS; r++) {
  for (let c = 0; c < GRID_COLS; c++) {
    const x = (c - (GRID_COLS - 1) / 2) * SPACING_X;
    const y = (r - (GRID_ROWS - 1) / 2) * SPACING_Y;

    const isCircle = (r + c) % 2 === 0;
    const obj = new GameObject(
      `pillar_${r}_${c}`,
      new Vector3(x, y, 0),
      0,
      new Vector2(isCircle ? 35 : 45, isCircle ? 35 : 45)
    );

    const shape = isCircle ? new Circle2D(32) : new Square2D();
    shape.setColor(Color.fromHex(isCircle ? "#64748b" : "#475569"));
    obj.addComponent(shape);

    scene.add(obj);
    pillars.push({ obj, isCircle, baseX: x, baseY: y });
  }
}

// 4. Setup Particle Emitter for Fire Sparks & Fireworks
const emitter = new ParticleEmitter(scene, {
  capacity: 350,
  layer: 10,
  spriteFactory: () => new Circle2D(12),
});

// Pointer Tracking
let pointerX = 0;
let pointerY = 0;
let hasPointerMoved = false;

window.addEventListener("pointermove", (e) => {
  const world = engine.screenToWorld(e.clientX, e.clientY);
  pointerX = world.x;
  pointerY = world.y;
  hasPointerMoved = true;
});

// Spark Burst on Click
window.addEventListener("pointerdown", (e) => {
  const world = engine.screenToWorld(e.clientX, e.clientY);
  // Explode 40 sparks with randomized warm/golden hues
  emitter.burst(40, {
    x: world.x,
    y: world.y,
    speed: 260,
    spread: Math.PI * 2,
    life: 0.8,
    sFrom: 1.2,
    sTo: 0.1,
    aFrom: 1.0,
    aTo: 0.0,
    cr: 255,
    cg: 180 + Math.floor(Math.random() * 70),
    cb: 50,
    additive: true,
  });
});

// 5. Game Loop
let frameCount = 0;
let fpsTimer = 0;
let time = 0;

engine.run((dt) => {
  time += dt;
  frameCount++;
  fpsTimer += dt;

  if (fpsTimer >= 0.5) {
    if (fpsEl) fpsEl.textContent = String(Math.round(frameCount / fpsTimer));
    if (particleCountEl) particleCountEl.textContent = String(emitter.parts.length);
    frameCount = 0;
    fpsTimer = 0;
  }

  // Smooth torch light movement following mouse
  torchLight.position.x += (pointerX - torchLight.position.x) * 0.15;
  torchLight.position.y += (pointerY - torchLight.position.y) * 0.15;

  // Add subtle torch flicker
  const flicker = 1 + Math.sin(time * 18) * 0.04 + Math.cos(time * 27) * 0.03;
  torchLight.radius = parseFloat(sliderRadius.value) * flicker;

  // Orbit the secondary cyan crystal light
  crystalLight.position.x = Math.sin(time * 0.8) * 220;
  crystalLight.position.y = Math.cos(time * 0.8) * 160;

  // Emit steady embers trail behind torch
  if (hasPointerMoved) {
    emitter.emit({
      x: torchLight.position.x + (Math.random() - 0.5) * 10,
      y: torchLight.position.y + (Math.random() - 0.5) * 10,
      dir: Math.PI / 2 + (Math.random() - 0.5) * 0.8, // drift upward
      speed: 60 + Math.random() * 60,
      life: 0.5 + Math.random() * 0.3,
      sFrom: 0.6,
      sTo: 0.1,
      aFrom: 0.9,
      aTo: 0.0,
      cr: 254,
      cg: 215,
      cb: 120,
    });
  }

  // Update particles
  emitter.update(dt);

  scene.update(dt);
  engine.drawScene(scene, dt);
});
