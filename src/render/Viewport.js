/**
 * Viewport math shared by rendering and input picking. Pure functions: they
 * only read the canvas size and camera, so they can be tested without WebGL.
 */

/**
 * @typedef {Object} ViewportRect
 * @property {number} px - GL viewport x, in device pixels
 * @property {number} py - GL viewport y, in device pixels
 * @property {number} pw - GL viewport width, in device pixels
 * @property {number} ph - GL viewport height, in device pixels
 * @property {number} worldW - Visible world width before camera zoom
 * @property {number} worldH - Visible world height before camera zoom
 */

/**
 * @function computeViewport
 * @description Computes the device-pixel GL viewport rect and the world-space
 * extents for a camera, honoring the design resolution and fit mode. Without
 * a design resolution it returns the camera's screen sub-rect at the canvas
 * CSS size.
 * @param {{width:number, height:number, clientWidth:number, clientHeight:number}} canvas
 * @param {{viewport:{x:number, y:number, width:number, height:number}}} camera
 * @param {{width:number, height:number, mode:string}|null} design
 * @returns {ViewportRect}
 */
export function computeViewport(canvas, camera, design) {
  const vp = camera.viewport;
  const rx = vp.x * canvas.width;
  const ry = vp.y * canvas.height;
  const rw = vp.width * canvas.width;
  const rh = vp.height * canvas.height;

  if (!design) {
    return {
      px: Math.floor(rx),
      py: Math.floor(ry),
      pw: Math.floor(rw),
      ph: Math.floor(rh),
      worldW: canvas.clientWidth * vp.width,
      worldH: canvas.clientHeight * vp.height,
    };
  }

  const dw = design.width;
  const dh = design.height;
  const mode = design.mode;

  if (mode === "stretch") {
    return {
      px: Math.floor(rx),
      py: Math.floor(ry),
      pw: Math.floor(rw),
      ph: Math.floor(rh),
      worldW: dw,
      worldH: dh,
    };
  }
  if (mode === "fill") {
    const scale = Math.max(rw / dw, rh / dh);
    return {
      px: Math.floor(rx),
      py: Math.floor(ry),
      pw: Math.floor(rw),
      ph: Math.floor(rh),
      worldW: rw / scale,
      worldH: rh / scale,
    };
  }

  let scale = Math.min(rw / dw, rh / dh);
  if (mode === "pixel") scale = Math.max(1, Math.floor(scale));
  const vw = dw * scale;
  const vh = dh * scale;
  return {
    px: Math.floor(rx + (rw - vw) / 2),
    py: Math.floor(ry + (rh - vh) / 2),
    pw: Math.floor(vw),
    ph: Math.floor(vh),
    worldW: dw,
    worldH: dh,
  };
}

/**
 * @function clientToView
 * @description Maps a client/CSS pixel coordinate to pre-camera view space
 * (origin center, +Y up) inside a viewport, honoring device pixel ratio and
 * letterbox offsets. This is also the coordinate space of `screenSpace`
 * objects.
 * @param {HTMLCanvasElement} canvas
 * @param {ViewportRect} viewport - From computeViewport
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{x:number, y:number}}
 */
export function clientToView(canvas, viewport, clientX, clientY) {
  const rect =
    typeof canvas.getBoundingClientRect === "function"
      ? canvas.getBoundingClientRect()
      : {
          left: 0,
          top: 0,
          width: canvas.clientWidth,
          height: canvas.clientHeight,
        };

  const sx = (clientX - rect.left) * (canvas.width / (rect.width || 1));
  const sy = (clientY - rect.top) * (canvas.height / (rect.height || 1));
  const gy = canvas.height - sy;

  const { px, py, pw, ph, worldW, worldH } = viewport;
  const nx = (sx - px) / (pw || 1);
  const ny = (gy - py) / (ph || 1);

  return { x: (nx - 0.5) * worldW, y: (ny - 0.5) * worldH };
}
