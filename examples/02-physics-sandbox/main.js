import {
  Kurai2D,
  Scene,
  Color,
  Vector2,
  Vector3,
  Physics,
  GameObject,
  RigidBody,
  BoxCollider,
  CircleCollider,
  Square2D,
  Circle2D,
} from "kurai2d-engine";

const canvas = document.getElementById("game");
const fpsEl = document.getElementById("fps-counter");
const bodyCountEl = document.getElementById("body-count");
const btnBox = document.getElementById("btn-spawn-box");
const btnCircle = document.getElementById("btn-spawn-circle");
const btnClear = document.getElementById("btn-clear");

// 1. Initialize Engine & WebGL2
const engine = new Kurai2D(canvas);
engine.setBackgroundColor(new Color(15, 23, 42, 255)); // #0f172a

const scene = new Scene();

// Responsive resize
function onResize() {
  engine.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);
onResize();

// 2. Setup Physics World (gravity -30 m/s^2, 30 pixels per meter)
const SCALE = 30;
const physics = new Physics(-30, SCALE);

let spawnType = "box"; // 'box' | 'circle'
let dynamicObjects = [];

btnBox.addEventListener("click", (e) => {
  e.stopPropagation();
  spawnType = "box";
  btnBox.className = "btn active";
  btnCircle.className = "btn btn-secondary";
});

btnCircle.addEventListener("click", (e) => {
  e.stopPropagation();
  spawnType = "circle";
  btnCircle.className = "btn active";
  btnBox.className = "btn btn-secondary";
});

btnClear.addEventListener("click", (e) => {
  e.stopPropagation();
  clearDynamicObjects();
});

// Helper to create static barrier/platform
function createStaticBox(name, x, y, width, height, angle = 0, colorHex = "#334155") {
  const obj = new GameObject(
    name,
    new Vector3(x, y, 0),
    angle,
    new Vector2(width, height)
  );

  const rb = new RigidBody(physics, "static", new Vector2(x, y), true, obj);
  if (angle !== 0) rb.setRotation(angle);
  obj.addComponent(rb);

  // Fixture size expects half-width and half-height in physics units
  const hx = width / (2 * SCALE);
  const hy = height / (2 * SCALE);
  const collider = new BoxCollider(
    rb,
    new Vector2(hx, hy),
    0, // density
    0.6, // friction
    0.2, // restitution
    false,
    obj
  );
  obj.addComponent(collider);

  const shape = new Square2D();
  shape.setColor(Color.fromHex(colorHex));
  obj.addComponent(shape);

  scene.add(obj);
  return obj;
}

// 3. Create Static Environment
// Ground Floor
createStaticBox("floor", 0, -320, 800, 30, 0, "#475569");
// Angled Ramp Left
createStaticBox("rampLeft", -180, -100, 320, 20, -0.35, "#3b82f6");
// Angled Ramp Right
createStaticBox("rampRight", 180, 50, 320, 20, 0.35, "#ec4899");
// Left Wall
createStaticBox("wallLeft", -390, 0, 20, 700, 0, "#334155");
// Right Wall
createStaticBox("wallRight", 390, 0, 20, 700, 0, "#334155");

// Helper to spawn dynamic box
function spawnDynamicBox(x, y, size = 30) {
  const obj = new GameObject(
    `box_${Date.now()}_${Math.random()}`,
    new Vector3(x, y, 0),
    Math.random() * Math.PI,
    new Vector2(size, size)
  );

  const rb = new RigidBody(physics, "dynamic", new Vector2(x, y), false, obj);
  obj.addComponent(rb);

  const hx = size / (2 * SCALE);
  const hy = size / (2 * SCALE);
  const collider = new BoxCollider(
    rb,
    new Vector2(hx, hy),
    1.2, // density
    0.4, // friction
    0.3, // restitution (bouncy)
    false,
    obj
  );
  obj.addComponent(collider);

  const shape = new Square2D();
  const colors = ["#f59e0b", "#fbbf24", "#d97706", "#f97316"];
  const color = Color.fromHex(colors[Math.floor(Math.random() * colors.length)]);
  shape.setColor(color);
  obj.addComponent(shape);

  scene.add(obj);
  dynamicObjects.push(obj);
}

// Helper to spawn dynamic circle
function spawnDynamicCircle(x, y, radius = 16) {
  const obj = new GameObject(
    `circle_${Date.now()}_${Math.random()}`,
    new Vector3(x, y, 0),
    0,
    new Vector2(radius, radius)
  );

  const rb = new RigidBody(physics, "dynamic", new Vector2(x, y), false, obj);
  obj.addComponent(rb);

  const radiusPhysics = radius / SCALE;
  const collider = new CircleCollider(
    rb,
    radiusPhysics,
    1.0, // density
    0.2, // friction
    0.7, // high restitution (super bouncy ball!)
    false,
    obj
  );
  obj.addComponent(collider);

  const shape = new Circle2D(32);
  const colors = ["#10b981", "#14b8a6", "#06b6d4", "#6366f1"];
  const color = Color.fromHex(colors[Math.floor(Math.random() * colors.length)]);
  shape.setColor(color);
  obj.addComponent(shape);

  scene.add(obj);
  dynamicObjects.push(obj);
}

function clearDynamicObjects() {
  dynamicObjects.forEach((obj) => {
    obj.destroy();
    scene.remove(obj);
  });
  dynamicObjects = [];
}

// Spawn initial pyramid of boxes
for (let row = 0; row < 5; row++) {
  const count = 5 - row;
  const y = -290 + row * 32;
  const startX = -((count - 1) * 32) / 2;
  for (let i = 0; i < count; i++) {
    spawnDynamicBox(startX + i * 32, y, 28);
  }
}

// 4. Interactive pointer spawning
let isPointerDown = false;
let lastSpawnTime = 0;

function spawnAtPointer(clientX, clientY) {
  const worldPos = engine.screenToWorld(clientX, clientY);
  if (spawnType === "box") {
    spawnDynamicBox(worldPos.x, worldPos.y, 24 + Math.random() * 14);
  } else {
    spawnDynamicCircle(worldPos.x, worldPos.y, 12 + Math.random() * 8);
  }
}

canvas.addEventListener("pointerdown", (e) => {
  isPointerDown = true;
  spawnAtPointer(e.clientX, e.clientY);
  lastSpawnTime = performance.now();
});

window.addEventListener("pointerup", () => {
  isPointerDown = false;
});

canvas.addEventListener("pointermove", (e) => {
  if (!isPointerDown) return;
  const now = performance.now();
  if (now - lastSpawnTime > 75) {
    spawnAtPointer(e.clientX, e.clientY);
    lastSpawnTime = now;
  }
});

// 5. Game Loop
let frameCount = 0;
let fpsTimer = 0;

engine.run((dt) => {
  frameCount++;
  fpsTimer += dt;

  if (fpsTimer >= 0.5) {
    const fps = Math.round(frameCount / fpsTimer);
    if (fpsEl) fpsEl.textContent = String(fps);
    if (bodyCountEl) bodyCountEl.textContent = String(dynamicObjects.length + 5);
    frameCount = 0;
    fpsTimer = 0;
  }

  // Advance physics simulation
  physics.process(dt);

  // Update GameObjects & render
  scene.update(dt);
  engine.drawScene(scene, dt);
});
