import {
  Kurai2D,
  Scene,
  Color,
  Vector2,
  Vector3,
  Square2D,
  Triangle2D,
  Circle2D,
  GameObject,
} from "kurai2d-engine";

const canvas = document.getElementById("game");
const fpsEl = document.getElementById("fps-counter");
const drawCallsEl = document.getElementById("draw-calls");

// 1. Initialize Kurai2D WebGL2 Engine
const engine = new Kurai2D(canvas);
engine.setBackgroundColor(new Color(15, 23, 42, 255)); // Deep slate #0f172a

// 2. Create the Scene
const scene = new Scene();

// Responsive viewport resize
function onResize() {
  engine.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);
onResize();

// 3. Palette helper
const palettes = [
  {
    bg: new Color(15, 23, 42, 255),
    primary: new Color(99, 102, 241, 255), // Indigo
    secondary: new Color(236, 72, 153, 255), // Pink
    accent: new Color(45, 212, 191, 255), // Teal
    orbit: new Color(251, 191, 36, 255), // Amber
  },
  {
    bg: new Color(9, 9, 11, 255),
    primary: new Color(168, 85, 247, 255), // Purple
    secondary: new Color(59, 130, 246, 255), // Blue
    accent: new Color(244, 63, 94, 255), // Rose
    orbit: new Color(34, 197, 94, 255), // Green
  },
  {
    bg: new Color(24, 24, 27, 255),
    primary: new Color(249, 115, 22, 255), // Orange
    secondary: new Color(14, 165, 233, 255), // Cyan
    accent: new Color(234, 179, 8, 255), // Yellow
    orbit: new Color(168, 85, 247, 255), // Violet
  },
];
let paletteIndex = 0;

// 4. Create GameObjects with Shapes
// Center Diamond (Square2D rotated 45 deg)
const centerSquare = new GameObject(
  "centerSquare",
  new Vector3(0, 0, 0),
  Math.PI / 4,
  new Vector2(60, 60)
);
const centerDrawable = new Square2D();
centerDrawable.setColor(palettes[0].primary);
centerSquare.addComponent(centerDrawable);
scene.add(centerSquare);

// Inner Pulsing Circle
const centerCircle = new GameObject(
  "centerCircle",
  new Vector3(0, 0, 1),
  0,
  new Vector2(30, 30)
);
const circleDrawable = new Circle2D(48);
circleDrawable.setColor(palettes[0].accent);
centerCircle.addComponent(circleDrawable);
scene.add(centerCircle);

// Orbiting satellites (Triangles and Circles)
const satellites = [];
const SATELLITE_COUNT = 6;
const ORBIT_RADIUS = 160;

for (let i = 0; i < SATELLITE_COUNT; i++) {
  const isTriangle = i % 2 === 0;
  const obj = new GameObject(
    `satellite_${i}`,
    new Vector3(0, 0, 0),
    0,
    new Vector2(25, 25)
  );

  const shape = isTriangle ? new Triangle2D() : new Circle2D(32);
  shape.setColor(isTriangle ? palettes[0].secondary : palettes[0].orbit);
  obj.addComponent(shape);

  satellites.push({
    gameObject: obj,
    shape,
    isTriangle,
    angleOffset: (i / SATELLITE_COUNT) * Math.PI * 2,
    speed: 0.8 + (i % 3) * 0.3,
    dist: ORBIT_RADIUS + ((i % 3) - 1) * 35,
  });

  scene.add(obj);
}

// Interactive pointer tracking
let mouseX = 0;
let mouseY = 0;
window.addEventListener("pointermove", (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 60;
  mouseY = -(e.clientY / window.innerHeight - 0.5) * 60;
});

// Click to cycle palette
window.addEventListener("pointerdown", () => {
  paletteIndex = (paletteIndex + 1) % palettes.length;
  const pal = palettes[paletteIndex];
  engine.setBackgroundColor(pal.bg);
  centerDrawable.setColor(pal.primary);
  circleDrawable.setColor(pal.accent);

  satellites.forEach((sat) => {
    sat.shape.setColor(sat.isTriangle ? pal.secondary : pal.orbit);
  });
});

// 5. Game Loop
let totalTime = 0;
let frameCount = 0;
let fpsTimer = 0;

engine.run((dt) => {
  totalTime += dt;
  frameCount++;
  fpsTimer += dt;

  if (fpsTimer >= 0.5) {
    const fps = Math.round(frameCount / fpsTimer);
    if (fpsEl) fpsEl.textContent = String(fps);
    if (drawCallsEl) drawCallsEl.textContent = String(satellites.length + 2);
    frameCount = 0;
    fpsTimer = 0;
  }

  // Smooth camera follow mouse
  const camPos = engine.camera.getPosition();
  const nextX = camPos.x + (mouseX - camPos.x) * 0.05;
  const nextY = camPos.y + (mouseY - camPos.y) * 0.05;
  engine.camera.setPosition(nextX, nextY);

  // Animate center shapes
  centerSquare.transform.rotation += dt * 0.6;
  const pulse = 1 + Math.sin(totalTime * 3) * 0.15;
  centerSquare.transform.scale.x = 60 * pulse;
  centerSquare.transform.scale.y = 60 * pulse;

  const circlePulse = 1 + Math.cos(totalTime * 4) * 0.2;
  centerCircle.transform.scale.x = 30 * circlePulse;
  centerCircle.transform.scale.y = 30 * circlePulse;

  // Animate satellites
  satellites.forEach((sat) => {
    const currentAngle = sat.angleOffset + totalTime * sat.speed;
    sat.gameObject.transform.position.x = Math.cos(currentAngle) * sat.dist;
    sat.gameObject.transform.position.y = Math.sin(currentAngle) * sat.dist;
    sat.gameObject.transform.rotation = currentAngle + Math.PI / 2;
  });

  scene.update(dt);
  engine.drawScene(scene, dt);
});
