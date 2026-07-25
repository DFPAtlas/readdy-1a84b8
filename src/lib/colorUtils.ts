/**
 * Converts a hex colour string to OKLCH channel values [L, C, H].
 * Returns null if the hex is invalid.
 *
 * Pipeline: hex → sRGB → linear RGB → XYZ (D65) → OKLab → OKLCH
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;

  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function srgbToLinear(c: number): number {
  if (c <= 0.04045) return c / 12.92;
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToXyz(r: number, g: number, b: number): [number, number, number] {
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
  ];
}

function xyzToOklab(x: number, y: number, z: number): [number, number, number] {
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return [L, C, H];
}

export function hexToOklch(hex: string): [number, number, number] | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [sr, sg, sb] = rgb;
  const lr = srgbToLinear(sr);
  const lg = srgbToLinear(sg);
  const lb = srgbToLinear(sb);
  const [x, y, z] = linearToXyz(lr, lg, lb);
  const [L, a, b_] = xyzToOklab(x, y, z);
  return oklabToOklch(L, a, b_);
}

/**
 * Clamp a value between min and max.
 */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Generates a full 11-step OKLCH scale (50–950) from a single anchor colour.
 *
 * Strategy:
 *   - 500 = anchor
 *   - Lighter steps (50→400): ramp up lightness, reduce chroma
 *   - Darker steps (600→950): ramp down lightness, reduce chroma gradually
 *   - Hue stays constant across all steps
 */
export function generateOklchScale(anchorHex: string): Record<string, string> | null {
  const oklch = hexToOklch(anchorHex);
  if (!oklch) return null;

  const [aLight, aChrom, aHue] = oklch;

  const steps: Array<{ key: number; lightMult: number; chromMult: number }> = [
    { key: 50,  lightMult: 1.42, chromMult: 0.28 },
    { key: 100, lightMult: 1.32, chromMult: 0.40 },
    { key: 200, lightMult: 1.20, chromMult: 0.58 },
    { key: 300, lightMult: 1.10, chromMult: 0.76 },
    { key: 400, lightMult: 1.04, chromMult: 0.90 },
    { key: 500, lightMult: 1.00, chromMult: 1.00 },
    { key: 600, lightMult: 0.94, chromMult: 0.92 },
    { key: 700, lightMult: 0.86, chromMult: 0.84 },
    { key: 800, lightMult: 0.78, chromMult: 0.74 },
    { key: 900, lightMult: 0.68, chromMult: 0.62 },
    { key: 950, lightMult: 0.58, chromMult: 0.50 },
  ];

  const scale: Record<string, string> = {};

  for (const step of steps) {
    const L = clamp(aLight * step.lightMult, 0, 1);
    const C = clamp(aChrom * step.chromMult, 0, 0.4);
    const H = aHue;

    // Format: "0.770 0.095 20" (3 decimal places for L and C, whole for H)
    const Lstr = L.toFixed(3);
    const Cstr = C.toFixed(3);
    const Hstr = Math.round(H).toString();

    scale[String(step.key)] = `${Lstr} ${Cstr} ${Hstr}`;
  }

  return scale;
}