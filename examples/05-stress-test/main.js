import {
  Kurai2D,
  Scene,
  Color,
  Vector2,
  Vector3,
  GameObject,
  InstancedTexture,
  Instance,
} from "kurai2d-engine";

const canvas = document.getElementById("game");
const fpsEl = document.getElementById("fps-counter");
const entityCountEl = document.getElementById("entity-count");
const btnAdd500 = document.getElementById("btn-add-500");
const btnAdd1000 = document.getElementById("btn-add-1000");
const btnSet5000 = document.getElementById("btn-set-5000");
const btnReset = document.getElementById("btn-reset");

// 1. Initialize Engine
const engine = new Kurai2D(canvas);
engine.setBackgroundColor(new Color(11, 15, 25, 255)); // #0b0f19

const scene = new Scene();

let screenW = window.innerWidth;
let screenH = window.innerHeight;

function onResize() {
  screenW = window.innerWidth;
  screenH = window.innerHeight;
  engine.resize(screenW, screenH);
}
window.addEventListener("resize", onResize);
onResize();

// 2. Generate a procedural gem/particle texture data URL
function createDotTexture() {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext("2d");

  // Radial glowing particle
  const gradient = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.9)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(16, 16, 15, 0, Math.PI * 2);
  ctx.fill();

  return c.toDataURL();
}

const textureUrl = createDotTexture();

// 3. Create InstancedTexture Container
let MAX_CAPACITY = 10000;
const rootObj = new GameObject("instancedGroup", new Vector3(0, 0, 0), 0, new Vector2(1, 1));
const instancedTex = new InstancedTexture(
  textureUrl,
  MAX_CAPACITY,
  32,
  32,
  1,
  1,
  0,
  false,
  false,
  false
);
rootObj.addComponent(instancedTex);
scene.add(rootObj);

// Palette colors for instances
const colors = [
  new Color(99, 102, 241, 255), // Indigo
  new Color(236, 72, 153, 255), // Pink
  new Color(56, 189, 248, 255), // Cyan
  new Color(34, 197, 94, 255),  // Emerald
  new Color(251, 191, 36, 255), // Amber
  new Color(168, 85, 247, 255), // Violet
];

// Per-instance velocity state
let velocities = [];

function addEntities(count) {
  const currentTotal = instancedTex.instances.length;
  const target = Math.min(currentTotal + count, MAX_CAPACITY);
  const toAdd = target - currentTotal;

  const halfW = screenW / 2;
  const halfH = screenH / 2;

  for (let i = 0; i < toAdd; i++) {
    const size = 12 + Math.random() * 16;
    const inst = new Instance(
      `dot_${currentTotal + i}`,
      new Vector3(
        (Math.random() - 0.5) * screenW * 0.8,
        (Math.random() - 0.5) * screenH * 0.8,
        0
      ),
      new Vector2(size, size),
      Math.random() * Math.PI * 2
    );

    const col = colors[Math.floor(Math.random() * colors.length)];
    inst.setColor(col);
    instancedTex.addInstance(inst);

    const speed = 80 + Math.random() * 160;
    const angle = Math.random() * Math.PI * 2;
    velocities.push({
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotSpeed: (Math.random() - 0.5) * 4,
    });
  }

  if (entityCountEl) entityCountEl.textContent = String(instancedTex.instances.length);
}

function resetEntities(count = 1000) {
  instancedTex.clearInstances();
  velocities = [];
  addEntities(count);
}

// Button controls
btnAdd500.addEventListener("click", () => addEntities(500));
btnAdd1000.addEventListener("click", () => addEntities(1000));
btnSet5000.addEventListener("click", () => resetEntities(5000));
btnReset.addEventListener("click", () => resetEntities(1000));

// Space to scatter
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    velocities.forEach((v) => {
      v.vx = (Math.random() - 0.5) * 500;
      v.vy = (Math.random() - 0.5) * 500;
    });
  }
});

// Initial 1,000 entities
resetEntities(1000);

// 4. Game Loop
let frameCount = 0;
let fpsTimer = 0;

engine.run((dt) => {
  frameCount++;
  fpsTimer += dt;

  if (fpsTimer >= 0.5) {
    if (fpsEl) fpsEl.textContent = String(Math.round(frameCount / fpsTimer));
    frameCount = 0;
    fpsTimer = 0;
  }

  const boundX = screenW / 2 - 20;
  const boundY = screenH / 2 - 20;

  const instances = instancedTex.instances;
  const len = instances.length;

  for (let i = 0; i < len; i++) {
    const inst = instances[i];
    const v = velocities[i];
    if (!v) continue;

    const pos = inst.transform.position;
    pos.x += v.vx * dt;
    pos.y += v.vy * dt;
    inst.transform.rotation += v.rotSpeed * dt;

    // Bounce off viewport boundaries
    if (pos.x < -boundX) {
      pos.x = -boundX;
      v.vx = -v.vx;
    } else if (pos.x > boundX) {
      pos.x = boundX;
      v.vx = -v.vx;
    }

    if (pos.y < -boundY) {
      pos.y = -boundY;
      v.vy = -v.vy;
    } else if (pos.y > boundY) {
      pos.y = boundY;
      v.vy = -v.vy;
    }
  }

  // Mark instance buffer matrices as dirty so GPU updates all transforms in one buffer call
  instancedTex._matricesDirty = true;

  scene.update(dt);
  engine.drawScene(scene, dt);
});
