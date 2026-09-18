/**
 * @class BroadPhase
 * @description Keeps the AABB tree and the list of proxies that moved since the
 * last step, and turns those into the candidate pairs the narrowphase looks at.
 */
export class BroadPhase {
    /** @private */
    private tree;
    /** @private */
    private moveBuffer;
    /** @private */
    private proxyCount;
    /**
     * @method createProxy
     * @description Adds a fixture proxy and queues it for pairing.
     * @param {AABB} aabb
     * @param {Object} userData
     * @returns {number} - Proxy id
     */
    createProxy(aabb: AABB, userData: any): number;
    /**
     * @method destroyProxy
     * @description Removes a fixture proxy.
     * @param {number} id
     */
    destroyProxy(id: number): void;
    /**
     * @method moveProxy
     * @description Updates a proxy's box, queueing it for re-pairing if the tree
     * actually had to move it.
     * @param {number} id
     * @param {AABB} aabb
     * @param {Object} displacement
     */
    moveProxy(id: number, aabb: AABB, displacement: any): void;
    /**
     * @method touchProxy
     * @description Forces a proxy to be re-paired next update even though it
     * didn't move (used when a fixture's filter changes).
     * @param {number} id
     */
    touchProxy(id: number): void;
    /** @private */
    private bufferMove;
    /** @private */
    private unbufferMove;
    /**
     * @method getFatAABB
     * @description Returns a proxy's fattened AABB.
     * @param {number} id
     * @returns {AABB}
     */
    getFatAABB(id: number): AABB;
    /**
     * @method getUserData
     * @description Returns a proxy's payload.
     * @param {number} id
     * @returns {Object}
     */
    getUserData(id: number): any;
    /**
     * @method testOverlap
     * @description True when two proxies' fat AABBs overlap.
     * @param {number} idA
     * @param {number} idB
     * @returns {boolean}
     */
    testOverlap(idA: number, idB: number): boolean;
    /**
     * @method query
     * @description Forwards an AABB query to the tree.
     * @param {AABB} aabb
     * @param {Function} callback
     */
    query(aabb: AABB, callback: Function): void;
    /**
     * @method rayCast
     * @description Forwards a ray cast to the tree.
     * @param {Object} input
     * @param {Function} callback
     */
    rayCast(input: any, callback: Function): void;
    /**
     * @method updatePairs
     * @description Emits `callback(userDataA, userDataB)` once for every new
     * overlapping pair among the proxies that moved. Pairs are de-duplicated, so
     * two proxies moving towards each other still report once.
     * @param {Function} callback
     */
    updatePairs(callback: Function): void;
}
/**
 * @class DynamicTree
 * @description A balanced tree of axis-aligned boxes over every fixture in the
 * world. Leaves are stored with a "fat" AABB so a body can jiggle a little
 * without forcing a re-insert, and the tree is rebalanced with rotations on the
 * way back up after each change. Every broadphase query, world raycast and
 * continuous-collision sweep goes through it.
 */
export class DynamicTree {
    /** @private */
    private root;
    /** @private */
    private nodes;
    /** @private */
    private freeList;
    /** @private */
    private nodeCount;
    /**
     * @method allocateNode
     * @description Takes a node from the free list, growing the pool if needed.
     * @returns {number} - The node id
     * @private
     */
    private allocateNode;
    /**
     * @method freeNode
     * @description Returns a node to the free list.
     * @param {number} id
     * @private
     */
    private freeNode;
    /**
     * @method createProxy
     * @description Adds a fixture proxy to the tree.
     * @param {AABB} aabb - The tight world AABB
     * @param {Object} userData - The FixtureProxy this leaf stands for
     * @returns {number} - The proxy id
     */
    createProxy(aabb: AABB, userData: any): number;
    /**
     * @method destroyProxy
     * @description Removes a proxy from the tree.
     * @param {number} id
     */
    destroyProxy(id: number): void;
    /**
     * @method moveProxy
     * @description Re-fits a proxy whose fixture moved. Returns false (and does
     * nothing) while the new box still fits inside the fat one.
     * @param {number} id
     * @param {AABB} aabb - The new tight AABB
     * @param {Object} displacement - How far the body moved this step
     * @returns {boolean} - Whether the proxy was actually re-inserted
     */
    moveProxy(id: number, aabb: AABB, displacement: any): boolean;
    /**
     * @method getFatAABB
     * @description Returns the stored (fattened) AABB of a proxy.
     * @param {number} id
     * @returns {AABB}
     */
    getFatAABB(id: number): AABB;
    /**
     * @method getUserData
     * @description Returns the proxy payload of a leaf.
     * @param {number} id
     * @returns {Object}
     */
    getUserData(id: number): any;
    /**
     * @method insertLeaf
     * @description Inserts a leaf, choosing the sibling that grows the tree's
     * total surface area least, then rebalancing on the way back to the root.
     * @param {number} leaf
     * @private
     */
    private insertLeaf;
    /**
     * @method removeLeaf
     * @description Unlinks a leaf and collapses its now-single-child parent.
     * @param {number} leaf
     * @private
     */
    private removeLeaf;
    /**
     * @method balance
     * @description One AVL-style rotation at `iA` if its subtrees differ in
     * height by more than one. Keeps queries logarithmic.
     * @param {number} iA
     * @returns {number} - The new root of that subtree
     * @private
     */
    private balance;
    /**
     * @method query
     * @description Calls `callback(proxyId)` for every leaf whose fat AABB
     * overlaps `aabb`. Returning false from the callback stops the query.
     * @param {AABB} aabb
     * @param {Function} callback
     */
    query(aabb: AABB, callback: Function): void;
    /**
     * @method rayCast
     * @description Walks the tree along a ray, calling
     * `callback(subInput, proxyId)`. The callback returns the new max fraction
     * (0 terminates the cast), which lets the traversal shrink as it finds hits.
     * @param {Object} input - `{ p1, p2, maxFraction }`
     * @param {Function} callback
     */
    rayCast(input: any, callback: Function): void;
    /**
     * @method getHeight
     * @description Height of the tree (0 when empty), useful when profiling.
     * @returns {number}
     */
    getHeight(): number;
}
export const NULL_NODE: -1;
import AABB from "./AABB.js";
