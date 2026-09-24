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
  InputManager,
} from "kurai2d-engine";

const canvas = document.getElementById("game");
const fpsEl = document.getElementById("fps-counter");
const scoreEl = document.getElementById("score-counter");

// 1. Engine & Setup
const engine = new Kurai2D(canvas);
engine.setBackgroundColor(new Color(15, 23, 42, 255)); // #0f172a

const scene = new Scene();
const SCALE = 30; // 30 pixels per meter
const physics = new Physics(-35, SCALE);

function onResize() {
  engine.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);
onResize();

// 2. Input Configuration
const input = new InputManager();
input.mapAction("left", ["a", "ArrowLeft", "pad:0:dpadLeft"]);
input.mapAction("right", ["d", "ArrowRight", "pad:0:dpadRight"]);
input.mapAction("jump", [" ", "w", "ArrowUp", "pad:0:south"]);

// 3. Level Geometry Builder
function createPlatform(name, x, y, width, height, colorHex = "#334155") {
  const obj = new GameObject(
    name,
    new Vector3(x, y, 0),
    0,
    new Vector2(width, height)
  );

  const rb = new RigidBody(physics, "static", new Vector2(x, y), true, obj);
  obj.addComponent(rb);

  const hx = width / (2 * SCALE);
  const hy = height / (2 * SCALE);
  const col = new BoxCollider(rb, new Vector2(hx, hy), 0, 0.5, 0.0, false, obj);
  obj.addComponent(col);

  const shape = new Square2D();
  shape.setColor(Color.fromHex(colorHex));
  obj.addComponent(shape);

  scene.add(obj);
  return obj;
}

// Ground and Platforms
createPlatform("ground", 0, -250, 1600, 40, "#1e293b");
createPlatform("plat1", -220, -150, 180, 20, "#3b82f6");
createPlatform("plat2", 150, -80, 220, 20, "#8b5cf6");
createPlatform("plat3", -100, 20, 160, 20, "#ec4899");
createPlatform("plat4", 320, 100, 200, 20, "#10b981");
createPlatform("plat5", -380, 80, 200, 20, "#f59e0b");
createPlatform("platHigh", 0, 220, 240, 20, "#6366f1");

// 4. Collectible Coins
let score = 0;
const TOTAL_COINS = 6;
const coinLocations = [
  { x: -220, y: -110 },
  { x: 150, y: -40 },
  { x: -100, y: 60 },
  { x: 320, y: 140 },
  { x: -380, y: 120 },
  { x: 0, y: 260 },
];
const coins = [];

coinLocations.forEach((loc, idx) => {
  const coinObj = new GameObject(
    `coin_${idx}`,
    new Vector3(loc.x, loc.y, 1),
    0,
    new Vector2(18, 18)
  );

  const rb = new RigidBody(physics, "static", new Vector2(loc.x, loc.y), true, coinObj);
  coinObj.addComponent(rb);

  const radiusPhysics = 10 / SCALE;
  const col = new CircleCollider(rb, radiusPhysics, 0, 0, 0, true, coinObj); // isSensor = true
  coinObj.addComponent(col);

  const shape = new Circle2D(24);
  shape.setColor(Color.fromHex("#fbbf24")); // Amber gold
  coinObj.addComponent(shape);

  coinObj.isCoin = true;
  coinObj.collected = false;

  scene.add(coinObj);
  coins.push(coinObj);
});

// 5. Player Character
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 44;
const playerObj = new GameObject(
  "player",
  new Vector3(0, -180, 2),
  0,
  new Vector2(PLAYER_WIDTH, PLAYER_HEIGHT)
);

const playerRb = new RigidBody(
  physics,
  "dynamic",
  new Vector2(0, -180),
  true, // fixedRotation = true (player stays upright)
  playerObj
);
playerObj.addComponent(playerRb);

const playerCol = new BoxCollider(
  playerRb,
  new Vector2(PLAYER_WIDTH / (2 * SCALE), PLAYER_HEIGHT / (2 * SCALE)),
  1.0, // density
  0.1, // friction
  0.0, // restitution (no bounce)
  false,
  playerObj
);
playerObj.addComponent(playerCol);

const playerShape = new Square2D();
playerShape.setColor(Color.fromHex("#38bdf8")); // Sky blue
playerObj.addComponent(playerShape);

playerObj.isPlayer = true;
scene.add(playerObj);

// Handle Coin Pickups via collision routing
physics.onCollisionEnter((objA, objB) => {
  const a = objA;
  const b = objB;
  if (!a || !b) return;

  const player = a.isPlayer ? a : b.isPlayer ? b : null;
  const coin = a.isCoin ? a : b.isCoin ? b : null;

  if (player && coin && !coin.collected) {
    coin.collected = true;
    score++;
    if (scoreEl) scoreEl.textContent = `${score} / ${TOTAL_COINS}`;
    // Destroy and remove coin from scene
    coin.destroy();
    scene.remove(coin);
  }
});

// 6. Character Control Parameters
const MOVE_SPEED = 240; // pixels per second
const JUMP_IMPULSE = 380; // impulse force

function isGrounded() {
  const pos = playerRb.getPosition();
  const vel = playerRb.getLinearVelocity();
  // If moving upwards significantly, not grounded
  if (vel.y > 10) return false;

  // Raycast from 1px below the player's feet downwards
  const feetY = pos.y - PLAYER_HEIGHT / 2;
  const hit = physics.raycast(
    { x: pos.x, y: feetY - 1 },
    { x: 0, y: -1 },
    12
  );
  return hit !== null && hit.object !== playerObj && !hit.object?.isCoin;
}

// 7. Game Loop
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

  // Handle Input (InputManager uses isDown / justPressed)
  let moveX = 0;
  if (input.isDown("left")) moveX -= 1;
  if (input.isDown("right")) moveX += 1;

  const currentVel = playerRb.getLinearVelocity();
  playerRb.setLinearVelocity(moveX * MOVE_SPEED, currentVel.y);

  if (input.justPressed("jump") && isGrounded()) {
    playerRb.setLinearVelocity(currentVel.x, JUMP_IMPULSE);
  }

  // Step Physics
  physics.process(dt);

  // Smooth Camera Follow Player
  const playerPos = playerObj.transform.position;
  const camPos = engine.camera.getPosition();
  const nextCamX = camPos.x + (playerPos.x - camPos.x) * 0.1;
  const nextCamY = camPos.y + (playerPos.y + 40 - camPos.y) * 0.1;
  engine.camera.setPosition(nextCamX, nextCamY);

  // Animate coin floating bob
  const time = performance.now() * 0.003;
  coins.forEach((c, idx) => {
    if (!c.collected) {
      c.transform.position.y = coinLocations[idx].y + Math.sin(time + idx) * 5;
    }
  });

  scene.update(dt);
  engine.drawScene(scene, dt);
  input.update();
});
