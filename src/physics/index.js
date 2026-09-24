/**
 * @file Kurai2D's built-in 2D rigid-body physics engine.
 * @description A complete, dependency-free simulation: a dynamic AABB tree
 * broadphase, SAT/GJK narrowphase, an impulse-based contact solver with warm
 * starting and island sleeping, and conservative-advancement continuous
 * collision detection.
 *
 * Everything here works in physics units (meters, radians, seconds). Games
 * normally use {@link Physics}, {@link RigidBody}, {@link BoxCollider} and
 * {@link CircleCollider} instead, which handle the pixel conversion; reach for
 * this module directly only when you want a bare world.
 *
 * @example
 * import { World, Box, Vec2 } from "kurai2d-engine/src/physics/index.js";
 * const world = new World({ gravity: new Vec2(0, -10) });
 * const ground = world.createBody({ type: "static", position: new Vec2(0, 0) });
 * ground.createFixture(Box(50, 1), { friction: 0.4 });
 * const crate = world.createBody({ type: "dynamic", position: new Vec2(0, 8) });
 * crate.createFixture(Box(0.5, 0.5), { density: 1, friction: 0.3 });
 * world.step(1 / 60);
 */
import World from "./World.js";
import { Body, BodyType } from "./Body.js";
import { Fixture } from "./Fixture.js";
import { Contact, ContactManager, shouldCollide } from "./Contact.js";
import {
  Shape,
  ShapeType,
  CircleShape,
  PolygonShape,
  Box,
  Circle,
} from "./Shapes.js";
import { Vec2, Rot, Transform2, Sweep } from "./Math2D.js";
import AABB from "./AABB.js";
import Settings from "./Settings.js";
import { Manifold, ManifoldType, WorldManifold } from "./Collision.js";
import { DistanceProxy, distance, testOverlap } from "./Distance.js";
import { timeOfImpact, TOIState } from "./TimeOfImpact.js";
import { BroadPhase, DynamicTree } from "./BroadPhase.js";
import { Joint, JointType } from "./Joint.js";
import DistanceJoint from "./DistanceJoint.js";
import RevoluteJoint from "./RevoluteJoint.js";

export {
  World,
  Body,
  BodyType,
  Fixture,
  Contact,
  ContactManager,
  shouldCollide,
  Shape,
  ShapeType,
  CircleShape,
  PolygonShape,
  Box,
  Circle,
  Vec2,
  Rot,
  Transform2,
  Sweep,
  AABB,
  Settings,
  Manifold,
  ManifoldType,
  WorldManifold,
  DistanceProxy,
  distance,
  testOverlap,
  timeOfImpact,
  TOIState,
  BroadPhase,
  DynamicTree,
  Joint,
  JointType,
  DistanceJoint,
  RevoluteJoint,
};
