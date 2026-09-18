/**
 * @description Identifies a concrete {@link Joint} subclass.
 */
const JointType = Object.freeze({
  DISTANCE: "distance",
  REVOLUTE: "revolute",
});

/**
 * @class Joint
 * @description Base class for a constraint between two bodies. A joint is
 * solved by the same island that solves contacts (see {@link Island}), right
 * alongside them, so a body linked only by a joint (no touching fixtures)
 * still wakes, sleeps and moves together with whatever it is jointed to.
 *
 * Concrete joints ({@link DistanceJoint}, {@link RevoluteJoint}) implement
 * `initVelocityConstraints`, `solveVelocityConstraints` and
 * `solvePositionConstraints`, matching {@link ContactSolver}'s per-step
 * lifecycle.
 * @param {Object} def - `{ type, bodyA, bodyB, collideConnected, userData }`
 */
class Joint {
  constructor(def) {
    this.type = def.type;
    this.bodyA = def.bodyA;
    this.bodyB = def.bodyB;
    this.collideConnected = def.collideConnected ?? false;
    this.userData = def.userData ?? null;
    /** @private */
    this.islandFlag = false;
    /** @private */
    this.prev = null;
    /** @private */
    this.next = null;
  }

  /**
   * @method getType
   * @returns {string}
   */
  getType() {
    return this.type;
  }

  /**
   * @method getBodyA
   * @returns {Body}
   */
  getBodyA() {
    return this.bodyA;
  }

  /**
   * @method getBodyB
   * @returns {Body}
   */
  getBodyB() {
    return this.bodyB;
  }

  /**
   * @method getUserData
   * @returns {*}
   */
  getUserData() {
    return this.userData;
  }

  /**
   * @method setUserData
   * @param {*} data
   */
  setUserData(data) {
    this.userData = data;
  }
}

export { Joint, JointType };
