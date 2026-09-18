export default ForgeLevel;
declare class ForgeLevel {
    /**
     * @method load
     * @description Builds renderable and collidable objects from a Forge export.
     * @param {Object} data - The parsed `level.json`
     * @param {Object} options
     * @param {Scene} options.scene - Scene to add the layer objects to
     * @param {Physics} [options.physics] - Physics engine; omit to skip colliders
     * @param {Object} [options.filter] - Collision filter spec for the colliders
     * @param {Object} [options.ownerObject] - Owner reported by collision events
     * @param {boolean} [options.pixelart=true] - NEAREST filtering for the atlas
     * @param {string} [options.layerOrder="top-first"] - Whether `layers[0]` is
     *   the topmost layer ("top-first") or the bottommost ("bottom-first")
     * @returns {Object} - `{ tileSize, cols, rows, width, height, background,
     *   bounds, layers, colliders, objects, entityTypes, toWorld }`
     */
    static load(data: any, options?: {
        scene: Scene;
        physics?: Physics;
        filter?: any;
        ownerObject?: any;
        pixelart?: boolean;
        layerOrder?: string;
    }): any;
    /**
     * @method _readObjects
     * @description Converts one object layer's entries from grid cells to world
     * space. An object's `x`/`y` is its top-left cell and `w`/`h` its size in
     * cells, so a 1x1 object resolves to that cell's centre.
     * @returns {Array<Object>} - `{ type, name, x, y, width, height, props, layer, cell }`
     * @private
     */
    private static _readObjects;
    /**
     * @method _buildTileLayer
     * @description Turns one tile layer into an InstancedTexture per tileset it
     * references (a texture switch is a new draw call, so tiles are grouped by
     * the atlas they come from).
     * @returns {Array<Object>} - `{ gameObject, instanced, tileset, layer, count }`
     * @private
     */
    private static _buildTileLayer;
    /**
     * @method tileTexCoords
     * @description UV quad for one tile of an atlas, in the corner order
     * `Drawable.getFrameTexCoords` uses: (R,B) (L,B) (R,T) (L,T). The v axis is
     * flipped because GL samples from the bottom up.
     *
     * With NEAREST filtering (`pixelart: true`, the default) tiles are meant to
     * sit flush against their neighbors, so no inset is applied: adjacent tiles
     * in the atlas never blend under NEAREST, and insetting would shrink every
     * tile by half a texel on each edge, leaving a visible sliver of the
     * neighboring tile's (or the background's) color at every seam. With LINEAR
     * filtering that half-texel bleed is real, so the inset is kept there.
     * @param {Object} tileset - A Forge tileset entry
     * @param {number} index - Tile index within the tileset
     * @param {boolean} [flipH=false]
     * @param {boolean} [flipV=false]
     * @param {boolean} [pixelart=true] - Whether the atlas is sampled with NEAREST
     * @returns {number[]} - 8 UV floats
     */
    static tileTexCoords(tileset: any, index: number, flipH?: boolean, flipV?: boolean, pixelart?: boolean): number[];
    /**
     * @method _tilesetFor
     * @description Finds the tileset that owns a gid (the one with the largest
     * firstgid not greater than it).
     * @private
     */
    private static _tilesetFor;
    /**
     * @method _buildColliders
     * @description Creates static bodies for solid tiles. Full-tile colliders are
     * merged into horizontal runs, since BoxCollider is cheaper than a polygon
     * with the same 4 corners. A tile whose collider shape isn't the full tile
     * gets its own {@link PolygonCollider} built from that shape's actual
     * points, in world space, not a bounding-box stand-in.
     * @returns {Array<RigidBody>}
     * @private
     */
    private static _buildColliders;
    /**
     * @method _staticBox
     * @description Creates one static body with a box collider, in world pixels.
     * @private
     */
    private static _staticBox;
    /**
     * @method _staticPolygon
     * @description Creates one static body with a polygon collider built from a
     * tile's own collider shape. The body sits at the shape's bounding-box
     * centre; the polygon's points are converted from Forge's normalised,
     * top-down tile space into local physics units around that centre.
     *
     * The shape is decomposed into triangles first when it isn't convex: the
     * physics engine's PolygonShape only accepts convex point sets and would
     * otherwise silently reduce a concave outline to its convex hull. A convex
     * shape (the common case) still gets exactly one collider, unchanged.
     * @private
     */
    private static _staticPolygon;
    /**
     * @method _boundsOf
     * @description Normalised bounding box of a collider polygon.
     * @returns {{x:number, y:number, w:number, h:number}}
     * @private
     */
    private static _boundsOf;
}
