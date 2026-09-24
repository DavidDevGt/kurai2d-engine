/**
 * @enum {string} BodyType
 * @description The three ways a body can take part in the simulation.
 *
 * - `static`: never moves, infinite mass. Ground, walls, platforms.
 * - `kinematic`: moves only when you set its velocity; forces and collisions
 *   never push it back. Moving platforms, elevators.
 * - `dynamic`: fully simulated, gravity, impulses and contacts all apply.
 */
const BodyType = {
  STATIC: "static",
  KINEMATIC: "kinematic",
  DYNAMIC: "dynamic",
};

export { BodyType };
