/**
 * @class Color
 * @description Represents a color
 * @param {number} r - The red value
 * @param {number} g - The green value
 * @param {number} b - The blue value
 * @param {number} a - The alpha value
 */
class Color {
  constructor(r, g, b, a = 255) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  static fromHex(hex) {
    const value = hex.startsWith("#") ? hex.slice(1) : hex;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return new Color(r, g, b, 255);
  }
}

export default Color;
