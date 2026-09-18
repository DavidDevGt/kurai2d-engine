import AABB from "./AABB.js";
import Settings from "./Settings.js";
import { Vec2 } from "./Math2D.js";

const NULL_NODE = -1;

/**
 * @class TreeNode
 * @description One node of the dynamic AABB tree. Leaves hold a fixture proxy;
 * internal nodes just bound their two children.
 * @private
 */
class TreeNode {
  constructor() {
    this.aabb = new AABB();
    this.userData = null;
    this.parent = NULL_NODE;
    this.child1 = NULL_NODE;
    this.child2 = NULL_NODE;
    /** -1 marks a free node, 0 a leaf. */
    this.height = -1;
    this.next = NULL_NODE;
  }

  isLeaf() {
    return this.child1 === NULL_NODE;
  }
}

/**
 * @class DynamicTree
 * @description A balanced tree of axis-aligned boxes over every fixture in the
 * world. Leaves are stored with a "fat" AABB so a body can jiggle a little
 * without forcing a re-insert, and the tree is rebalanced with rotations on the
 * way back up after each change. Every broadphase query, world raycast and
 * continuous-collision sweep goes through it.
 */
class DynamicTree {
  constructor() {
    /** @private */
    this.root = NULL_NODE;
    /** @private */
    this.nodes = [];
    /** @private */
    this.freeList = NULL_NODE;
    /** @private */
    this.nodeCount = 0;
  }

  /**
   * @method allocateNode
   * @description Takes a node from the free list, growing the pool if needed.
   * @returns {number} - The node id
   * @private
   */
  allocateNode() {
    if (this.freeList === NULL_NODE) {
      const node = new TreeNode();
      this.nodes.push(node);
      this.freeList = this.nodes.length - 1;
      node.next = NULL_NODE;
    }

    const id = this.freeList;
    const node = this.nodes[id];
    this.freeList = node.next;
    node.parent = NULL_NODE;
    node.child1 = NULL_NODE;
    node.child2 = NULL_NODE;
    node.height = 0;
    node.userData = null;
    this.nodeCount++;
    return id;
  }

  /**
   * @method freeNode
   * @description Returns a node to the free list.
   * @param {number} id
   * @private
   */
  freeNode(id) {
    const node = this.nodes[id];
    node.next = this.freeList;
    node.height = -1;
    node.userData = null;
    this.freeList = id;
    this.nodeCount--;
  }

  /**
   * @method createProxy
   * @description Adds a fixture proxy to the tree.
   * @param {AABB} aabb - The tight world AABB
   * @param {Object} userData - The FixtureProxy this leaf stands for
   * @returns {number} - The proxy id
   */
  createProxy(aabb, userData) {
    const id = this.allocateNode();
    const node = this.nodes[id];
    node.aabb.copy(aabb).extend(Settings.aabbExtension);
    node.userData = userData;
    node.height = 0;
    this.insertLeaf(id);
    return id;
  }

  /**
   * @method destroyProxy
   * @description Removes a proxy from the tree.
   * @param {number} id
   */
  destroyProxy(id) {
    this.removeLeaf(id);
    this.freeNode(id);
  }

  /**
   * @method moveProxy
   * @description Re-fits a proxy whose fixture moved. Returns false (and does
   * nothing) while the new box still fits inside the fat one.
   * @param {number} id
   * @param {AABB} aabb - The new tight AABB
   * @param {Object} displacement - How far the body moved this step
   * @returns {boolean} - Whether the proxy was actually re-inserted
   */
  moveProxy(id, aabb, displacement) {
    const node = this.nodes[id];
    if (node.aabb.contains(aabb)) return false;

    this.removeLeaf(id);

    const fat = node.aabb.copy(aabb).extend(Settings.aabbExtension);
    const dx = Settings.aabbMultiplier * displacement.x;
    const dy = Settings.aabbMultiplier * displacement.y;
    if (dx < 0) fat.lowerBound.x += dx;
    else fat.upperBound.x += dx;
    if (dy < 0) fat.lowerBound.y += dy;
    else fat.upperBound.y += dy;

    this.insertLeaf(id);
    return true;
  }

  /**
   * @method getFatAABB
   * @description Returns the stored (fattened) AABB of a proxy.
   * @param {number} id
   * @returns {AABB}
   */
  getFatAABB(id) {
    return this.nodes[id].aabb;
  }

  /**
   * @method getUserData
   * @description Returns the proxy payload of a leaf.
   * @param {number} id
   * @returns {Object}
   */
  getUserData(id) {
    return this.nodes[id].userData;
  }

  /**
   * @method insertLeaf
   * @description Inserts a leaf, choosing the sibling that grows the tree's
   * total surface area least, then rebalancing on the way back to the root.
   * @param {number} leaf
   * @private
   */
  insertLeaf(leaf) {
    if (this.root === NULL_NODE) {
      this.root = leaf;
      this.nodes[leaf].parent = NULL_NODE;
      return;
    }

    const leafAABB = this.nodes[leaf].aabb;
    let index = this.root;
    const combined = new AABB();
    const childCombined = new AABB();

    while (!this.nodes[index].isLeaf()) {
      const node = this.nodes[index];
      const child1 = node.child1;
      const child2 = node.child2;

      const area = node.aabb.getPerimeter();
      combined.combine(node.aabb, leafAABB);
      const combinedArea = combined.getPerimeter();

      const cost = 2 * combinedArea;
      const inheritanceCost = 2 * (combinedArea - area);

      childCombined.combine(leafAABB, this.nodes[child1].aabb);
      let cost1;
      if (this.nodes[child1].isLeaf()) {
        cost1 = childCombined.getPerimeter() + inheritanceCost;
      } else {
        cost1 =
          childCombined.getPerimeter() -
          this.nodes[child1].aabb.getPerimeter() +
          inheritanceCost;
      }

      childCombined.combine(leafAABB, this.nodes[child2].aabb);
      let cost2;
      if (this.nodes[child2].isLeaf()) {
        cost2 = childCombined.getPerimeter() + inheritanceCost;
      } else {
        cost2 =
          childCombined.getPerimeter() -
          this.nodes[child2].aabb.getPerimeter() +
          inheritanceCost;
      }

      if (cost < cost1 && cost < cost2) break;
      index = cost1 < cost2 ? child1 : child2;
    }

    const sibling = index;
    const oldParent = this.nodes[sibling].parent;
    const newParent = this.allocateNode();
    const newParentNode = this.nodes[newParent];
    newParentNode.parent = oldParent;
    newParentNode.userData = null;
    newParentNode.aabb.combine(leafAABB, this.nodes[sibling].aabb);
    newParentNode.height = this.nodes[sibling].height + 1;
    newParentNode.child1 = sibling;
    newParentNode.child2 = leaf;
    this.nodes[sibling].parent = newParent;
    this.nodes[leaf].parent = newParent;

    if (oldParent !== NULL_NODE) {
      if (this.nodes[oldParent].child1 === sibling) {
        this.nodes[oldParent].child1 = newParent;
      } else {
        this.nodes[oldParent].child2 = newParent;
      }
    } else {
      this.root = newParent;
    }

    let walk = this.nodes[leaf].parent;
    while (walk !== NULL_NODE) {
      walk = this.balance(walk);
      const node = this.nodes[walk];
      const c1 = this.nodes[node.child1];
      const c2 = this.nodes[node.child2];
      node.height = 1 + Math.max(c1.height, c2.height);
      node.aabb.combine(c1.aabb, c2.aabb);
      walk = node.parent;
    }
  }

  /**
   * @method removeLeaf
   * @description Unlinks a leaf and collapses its now-single-child parent.
   * @param {number} leaf
   * @private
   */
  removeLeaf(leaf) {
    if (leaf === this.root) {
      this.root = NULL_NODE;
      return;
    }

    const parent = this.nodes[leaf].parent;
    const grandParent = this.nodes[parent].parent;
    const sibling =
      this.nodes[parent].child1 === leaf
        ? this.nodes[parent].child2
        : this.nodes[parent].child1;

    if (grandParent !== NULL_NODE) {
      if (this.nodes[grandParent].child1 === parent) {
        this.nodes[grandParent].child1 = sibling;
      } else {
        this.nodes[grandParent].child2 = sibling;
      }
      this.nodes[sibling].parent = grandParent;
      this.freeNode(parent);

      let index = grandParent;
      while (index !== NULL_NODE) {
        index = this.balance(index);
        const node = this.nodes[index];
        const c1 = this.nodes[node.child1];
        const c2 = this.nodes[node.child2];
        node.aabb.combine(c1.aabb, c2.aabb);
        node.height = 1 + Math.max(c1.height, c2.height);
        index = node.parent;
      }
    } else {
      this.root = sibling;
      this.nodes[sibling].parent = NULL_NODE;
      this.freeNode(parent);
    }
  }

  /**
   * @method balance
   * @description One AVL-style rotation at `iA` if its subtrees differ in
   * height by more than one. Keeps queries logarithmic.
   * @param {number} iA
   * @returns {number} - The new root of that subtree
   * @private
   */
  balance(iA) {
    const A = this.nodes[iA];
    if (A.isLeaf() || A.height < 2) return iA;

    const iB = A.child1;
    const iC = A.child2;
    const B = this.nodes[iB];
    const C = this.nodes[iC];
    const balance = C.height - B.height;

    if (balance > 1) {
      const iF = C.child1;
      const iG = C.child2;
      const F = this.nodes[iF];
      const G = this.nodes[iG];

      C.child1 = iA;
      C.parent = A.parent;
      A.parent = iC;

      if (C.parent !== NULL_NODE) {
        if (this.nodes[C.parent].child1 === iA)
          this.nodes[C.parent].child1 = iC;
        else this.nodes[C.parent].child2 = iC;
      } else {
        this.root = iC;
      }

      if (F.height > G.height) {
        C.child2 = iF;
        A.child2 = iG;
        G.parent = iA;
        A.aabb.combine(B.aabb, G.aabb);
        C.aabb.combine(A.aabb, F.aabb);
        A.height = 1 + Math.max(B.height, G.height);
        C.height = 1 + Math.max(A.height, F.height);
      } else {
        C.child2 = iG;
        A.child2 = iF;
        F.parent = iA;
        A.aabb.combine(B.aabb, F.aabb);
        C.aabb.combine(A.aabb, G.aabb);
        A.height = 1 + Math.max(B.height, F.height);
        C.height = 1 + Math.max(A.height, G.height);
      }
      return iC;
    }

    if (balance < -1) {
      const iD = B.child1;
      const iE = B.child2;
      const D = this.nodes[iD];
      const E = this.nodes[iE];

      B.child1 = iA;
      B.parent = A.parent;
      A.parent = iB;

      if (B.parent !== NULL_NODE) {
        if (this.nodes[B.parent].child1 === iA)
          this.nodes[B.parent].child1 = iB;
        else this.nodes[B.parent].child2 = iB;
      } else {
        this.root = iB;
      }

      if (D.height > E.height) {
        B.child2 = iD;
        A.child1 = iE;
        E.parent = iA;
        A.aabb.combine(C.aabb, E.aabb);
        B.aabb.combine(A.aabb, D.aabb);
        A.height = 1 + Math.max(C.height, E.height);
        B.height = 1 + Math.max(A.height, D.height);
      } else {
        B.child2 = iE;
        A.child1 = iD;
        D.parent = iA;
        A.aabb.combine(C.aabb, D.aabb);
        B.aabb.combine(A.aabb, E.aabb);
        A.height = 1 + Math.max(C.height, D.height);
        B.height = 1 + Math.max(A.height, E.height);
      }
      return iB;
    }

    return iA;
  }

  /**
   * @method query
   * @description Calls `callback(proxyId)` for every leaf whose fat AABB
   * overlaps `aabb`. Returning false from the callback stops the query.
   * @param {AABB} aabb
   * @param {Function} callback
   */
  query(aabb, callback) {
    if (this.root === NULL_NODE) return;
    const stack = [this.root];
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === NULL_NODE) continue;
      const node = this.nodes[id];
      if (!AABB.testOverlap(node.aabb, aabb)) continue;
      if (node.isLeaf()) {
        if (callback(id) === false) return;
      } else {
        stack.push(node.child1, node.child2);
      }
    }
  }

  /**
   * @method rayCast
   * @description Walks the tree along a ray, calling
   * `callback(subInput, proxyId)`. The callback returns the new max fraction
   * (0 terminates the cast), which lets the traversal shrink as it finds hits.
   * @param {Object} input - `{ p1, p2, maxFraction }`
   * @param {Function} callback
   */
  rayCast(input, callback) {
    if (this.root === NULL_NODE) return;

    let maxFraction = input.maxFraction;
    const segment = {
      p1: input.p1,
      p2: new Vec2(),
      maxFraction: 1,
    };

    const stack = [this.root];
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === NULL_NODE) continue;
      const node = this.nodes[id];

      segment.p2.set(
        input.p1.x + maxFraction * (input.p2.x - input.p1.x),
        input.p1.y + maxFraction * (input.p2.y - input.p1.y)
      );
      if (!node.aabb.rayCast(segment)) continue;

      if (node.isLeaf()) {
        const value = callback({ p1: input.p1, p2: input.p2, maxFraction }, id);
        if (value === 0) return;
        if (value > 0) maxFraction = value;
      } else {
        stack.push(node.child1, node.child2);
      }
    }
  }

  /**
   * @method getHeight
   * @description Height of the tree (0 when empty), useful when profiling.
   * @returns {number}
   */
  getHeight() {
    return this.root === NULL_NODE ? 0 : this.nodes[this.root].height;
  }
}

const PAIR_STRIDE = 2097152;

/**
 * @class BroadPhase
 * @description Keeps the AABB tree and the list of proxies that moved since the
 * last step, and turns those into the candidate pairs the narrowphase looks at.
 */
class BroadPhase {
  constructor() {
    /** @private */
    this.tree = new DynamicTree();
    /** @private */
    this.moveBuffer = [];
    /** @private */
    this.proxyCount = 0;
  }

  /**
   * @method createProxy
   * @description Adds a fixture proxy and queues it for pairing.
   * @param {AABB} aabb
   * @param {Object} userData
   * @returns {number} - Proxy id
   */
  createProxy(aabb, userData) {
    const id = this.tree.createProxy(aabb, userData);
    this.proxyCount++;
    this.bufferMove(id);
    return id;
  }

  /**
   * @method destroyProxy
   * @description Removes a fixture proxy.
   * @param {number} id
   */
  destroyProxy(id) {
    this.unbufferMove(id);
    this.proxyCount--;
    this.tree.destroyProxy(id);
  }

  /**
   * @method moveProxy
   * @description Updates a proxy's box, queueing it for re-pairing if the tree
   * actually had to move it.
   * @param {number} id
   * @param {AABB} aabb
   * @param {Object} displacement
   */
  moveProxy(id, aabb, displacement) {
    if (this.tree.moveProxy(id, aabb, displacement)) this.bufferMove(id);
  }

  /**
   * @method touchProxy
   * @description Forces a proxy to be re-paired next update even though it
   * didn't move (used when a fixture's filter changes).
   * @param {number} id
   */
  touchProxy(id) {
    this.bufferMove(id);
  }

  /** @private */
  bufferMove(id) {
    this.moveBuffer.push(id);
  }

  /** @private */
  unbufferMove(id) {
    const index = this.moveBuffer.indexOf(id);
    if (index >= 0) this.moveBuffer[index] = NULL_NODE;
  }

  /**
   * @method getFatAABB
   * @description Returns a proxy's fattened AABB.
   * @param {number} id
   * @returns {AABB}
   */
  getFatAABB(id) {
    return this.tree.getFatAABB(id);
  }

  /**
   * @method getUserData
   * @description Returns a proxy's payload.
   * @param {number} id
   * @returns {Object}
   */
  getUserData(id) {
    return this.tree.getUserData(id);
  }

  /**
   * @method testOverlap
   * @description True when two proxies' fat AABBs overlap.
   * @param {number} idA
   * @param {number} idB
   * @returns {boolean}
   */
  testOverlap(idA, idB) {
    return AABB.testOverlap(
      this.tree.getFatAABB(idA),
      this.tree.getFatAABB(idB)
    );
  }

  /**
   * @method query
   * @description Forwards an AABB query to the tree.
   * @param {AABB} aabb
   * @param {Function} callback
   */
  query(aabb, callback) {
    this.tree.query(aabb, callback);
  }

  /**
   * @method rayCast
   * @description Forwards a ray cast to the tree.
   * @param {Object} input
   * @param {Function} callback
   */
  rayCast(input, callback) {
    this.tree.rayCast(input, callback);
  }

  /**
   * @method updatePairs
   * @description Emits `callback(userDataA, userDataB)` once for every new
   * overlapping pair among the proxies that moved. Pairs are de-duplicated, so
   * two proxies moving towards each other still report once.
   * @param {Function} callback
   */
  updatePairs(callback) {
    if (this.moveBuffer.length === 0) return;

    const seen = new Set();
    const pairs = [];

    for (const queryProxy of this.moveBuffer) {
      if (queryProxy === NULL_NODE) continue;
      const fatAABB = this.tree.getFatAABB(queryProxy);

      this.tree.query(fatAABB, (proxyId) => {
        if (proxyId === queryProxy) return true;
        const a = Math.min(proxyId, queryProxy);
        const b = Math.max(proxyId, queryProxy);
        const key = a * PAIR_STRIDE + b;
        if (seen.has(key)) return true;
        seen.add(key);
        pairs.push(a, b);
        return true;
      });
    }

    this.moveBuffer.length = 0;

    for (let i = 0; i < pairs.length; i += 2) {
      callback(
        this.tree.getUserData(pairs[i]),
        this.tree.getUserData(pairs[i + 1])
      );
    }
  }
}

export { BroadPhase, DynamicTree, NULL_NODE };
