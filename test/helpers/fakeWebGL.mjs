/**
 * A recording stand-in for a WebGL2 context, good enough to construct a real
 * Kurai2D engine and run its render path in Node. Every method not defined
 * below is accepted, recorded in `calls` and returns a fresh object (so
 * createBuffer/createTexture/... hand back distinct handles). Upper-case
 * properties act as GL enum constants.
 */
export function createFakeGL(canvas) {
  const calls = [];
  const constants = new Map();
  let nextAttrib = 0;

  const target = {
    canvas,
    calls,
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getShaderInfoLog: () => "",
    getProgramInfoLog: () => "",
    // Leave room for the 4 consecutive locations of a mat4 attribute.
    getAttribLocation: () => (nextAttrib += 4),
    getUniformLocation: (program, name) => ({ uniform: name }),
    /** Number of recorded calls to `name`. */
    count(name) {
      return calls.filter((c) => c[0] === name).length;
    },
    /** Forgets the recorded calls. */
    clearCalls() {
      calls.length = 0;
    },
  };

  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop !== "string") return undefined;
      if (/^[A-Z][A-Z0-9_]*$/.test(prop)) {
        if (!constants.has(prop)) constants.set(prop, 0x1000 + constants.size);
        return constants.get(prop);
      }
      return (...args) => {
        calls.push([prop, args]);
        return {};
      };
    },
  });
}

/**
 * A minimal canvas whose getContext("webgl2") returns a fake GL. Supports
 * add/removeEventListener plus `dispatch(type, event)` to simulate events
 * such as webglcontextlost.
 */
export function createFakeCanvas({ width = 800, height = 600 } = {}) {
  const listeners = new Map();
  const canvas = {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    style: {},
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
    dispatch(type, event = {}) {
      for (const fn of listeners.get(type) ?? []) fn(event);
    },
    getContext() {
      return canvas.gl;
    },
  };
  canvas.gl = createFakeGL(canvas);
  return canvas;
}

/** Waits for pending promise callbacks (e.g. async texture init). */
export function flushMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve));
}

/** Runs `fn` with console.warn silenced, returning the warnings it logged. */
export function captureWarnings(fn) {
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return warnings;
}
