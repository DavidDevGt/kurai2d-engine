import Color from "../Color.js";
import { Vector2, Vector3 } from "../Physics.js";
import { Circle2D } from "../Shapes.js";
import GameObject from "./GameObject.js";

/** @import RigidBody from "./RigidBody.js" */

/**
 * @class CircleColliderDebug
 * @param {RigidBody} rigidbody - The rigidbody to attach the collider to
 * @param {Color} color - The color of the collider
 */
class CircleColliderDebug {
  constructor(rigidbody, color = null) {
    this.rigidbody = rigidbody;
    this.physics = this.rigidbody.physics;
    this.scale = this.physics.getScale();
    this.color = color || new Color(255, 0, 0, 255);
    const body = this.rigidbody.getBody();
    this.gameObject = new GameObject(
      "CircleColliderDebug",
      new Vector3(
        body.getPosition().x * this.scale,
        body.getPosition().y * this.scale,
        100
      ),
      this.rigidbody.getAngle(),
      new Vector2(
        this.rigidbody.getCollider().getRadius() * this.scale,
        this.rigidbody.getCollider().getRadius() * this.scale
      )
    );
    this.gameObject.addComponent(new Circle2D());
    this.gameObject.getComponent(Circle2D).setColor(this.color);
    this.gameObject.setOpacity(0.3);
  }
}

export default CircleColliderDebug;
