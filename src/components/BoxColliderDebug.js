import Color from "../Color.js";
import { Vector2, Vector3 } from "../Physics.js";
import { Square2D } from "../Shapes.js";
import GameObject from "./GameObject.js";

/** @import RigidBody from "./RigidBody.js" */

/**
 * @class BoxColliderDebug
 * @param {RigidBody} rigidbody - The rigidbody to attach the collider to
 * @param {Color} color - The color of the collider
 */
class BoxColliderDebug {
  constructor(rigidbody, color = null) {
    this.rigidbody = rigidbody;
    this.physics = this.rigidbody.physics;
    this.scale = this.physics.getScale();
    this.color = color || new Color(255, 0, 0, 255);
    const body = this.rigidbody.getBody();
    this.gameObject = new GameObject(
      "BoxColliderDebug",
      new Vector3(
        body.getPosition().x * this.scale,
        body.getPosition().y * this.scale,
        100
      ),
      this.rigidbody.getAngle(),
      new Vector2(
        this.rigidbody.getCollider().getFixtureSize().x * this.scale,
        this.rigidbody.getCollider().getFixtureSize().y * this.scale
      )
    );
    this.gameObject.addComponent(new Square2D());
    this.gameObject.getComponent(Square2D).setColor(this.color);
    this.gameObject.setOpacity(0.3);
  }
}

export default BoxColliderDebug;
