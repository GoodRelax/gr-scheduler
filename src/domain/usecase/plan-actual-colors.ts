/**
 * UseCase layer: plan/actual display coloring (CR-002 Part 1).
 *
 * The Overlap plan/actual split is derived from the item's OWN base
 * {@link ScheduleItem.fillColor} by adjusting SATURATION and LIGHTNESS, not from a
 * pair of fixed hues:
 *
 * - the PLAN side is a PALE (lightened, chroma-retaining) tint -- supplementary;
 * - the ACTUAL / progress side is a VIVID (saturated + deepened) shade -- emphasized.
 *
 * "Pale" is achieved primarily by raising LIGHTNESS while keeping most of the base
 * saturation, so the plan tint stays a clearly-colored lighter version of the base
 * hue and never washes out to a flat grey.
 *
 * The split only applies where a plan and an actual coexist (an item that records
 * an actual start); a plan-only item keeps its own stored fill so a normal bar is
 * not washed out. An EXPLICIT fill ({@link ScheduleItem.fillColorExplicit}) always
 * overrides the derivation (the user picked that exact color).
 *
 * Label legibility (WCAG 1.4.3): the in-bar abbreviation label uses a dark, fixed
 * ink ({@link a11y-tokens.ITEM_LABEL_HEX}); the pale plan shade only LIGHTENS the
 * fill (raising label contrast), and the vivid actual shade DEEPENS it (also a dark
 * enough field for the light-on-dark? no -- the label ink is dark, and the vivid
 * shade stays a mid tone), so neither derivation pushes the label pair below AA.
 *
 * Every function here is pure and side-effect free.
 */

import type { ScheduleItem } from '../model/schedule-model.js';

/** A color in the HSL space; `h` in [0,360), `s`/`l` in [0,1]. */
export interface Hsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

/**
 * Fraction the PLAN shade RETAINS of the base saturation. Kept HIGH (near-full) so
 * the pale plan stays a clearly-COLORED tint of the base hue: "pale" is carried by
 * LIGHTNESS, not by draining chroma. An earlier low value (0.45) desaturated the
 * base blue `#4477aa` almost to a flat grey `#b6c2ce`; retaining most of the chroma
 * keeps it a soft, recognizable blue (~`#81a4c7`) while still reading as the lighter,
 * supplementary "plan" side against the vivid actual.
 */
const PLAN_SATURATION_RETAIN = 0.9;
/**
 * Fraction of the remaining lightness headroom the PLAN shade LIGHTENS toward white.
 * Moderate (not near-white) so the tint stays saturated enough to be a color rather
 * than a wash: this LIGHTNESS lift is what makes the plan side "pale".
 */
const PLAN_LIGHTEN_FRACTION = 0.33;
/** Fraction of the remaining headroom the ACTUAL shade SATURATES toward full. */
const ACTUAL_SATURATE_FRACTION = 0.35;
/** Fraction the ACTUAL shade RETAINS of the base lightness (deepen toward black). */
const ACTUAL_LIGHTNESS_RETAIN = 0.82;

/** Clamp a number into the inclusive [0, 1] range. */
function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Parse a `#rgb` / `#rrggbb` hex triplet into 0..255 channels, or null. */
function parseHex(css: string): { r: number; g: number; b: number } | null {
  const text = css.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(text);
  if (short !== null) {
    const r = parseInt(short[1]! + short[1]!, 16);
    const g = parseInt(short[2]! + short[2]!, 16);
    const b = parseInt(short[3]! + short[3]!, 16);
    return { r, g, b };
  }
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(text);
  if (long !== null) {
    return {
      r: parseInt(long[1]!, 16),
      g: parseInt(long[2]!, 16),
      b: parseInt(long[3]!, 16),
    };
  }
  return null;
}

/** Parse an `rgb(r, g, b)` / `rgba(r, g, b, a)` functional color into channels, or null. */
function parseRgbFunction(css: string): { r: number; g: number; b: number } | null {
  const match = /^rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/i.exec(css.trim());
  if (match === null) {
    return null;
  }
  const clampByte = (value: number): number => (value < 0 ? 0 : value > 255 ? 255 : value);
  return {
    r: clampByte(parseInt(match[1]!, 10)),
    g: clampByte(parseInt(match[2]!, 10)),
    b: clampByte(parseInt(match[3]!, 10)),
  };
}

/**
 * Parse a CSS color (`#rgb`, `#rrggbb`, `rgb()`/`rgba()`) into {@link Hsl}.
 *
 * @param css - The CSS color string.
 * @returns The HSL representation, or null when the color is not recognized
 *   (named colors, `transparent`, gradients: the caller keeps the base fill).
 */
export function parseColorToHsl(css: string): Hsl | null {
  const rgb = parseHex(css) ?? parseRgbFunction(css);
  if (rgb === null) {
    return null;
  }
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  hue *= 60;
  if (hue < 0) {
    hue += 360;
  }
  return { h: hue, s: clamp01(saturation), l: clamp01(lightness) };
}

/**
 * Convert an {@link Hsl} back to a `#rrggbb` CSS hex string.
 *
 * @param hsl - The HSL color.
 * @returns A lowercase `#rrggbb` string.
 */
export function hslToCss(hsl: Hsl): string {
  const s = clamp01(hsl.s);
  const l = clamp01(hsl.l);
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hueSextant = (((hsl.h % 360) + 360) % 360) / 60;
  const secondary = chroma * (1 - Math.abs((hueSextant % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hueSextant < 1) {
    [r, g, b] = [chroma, secondary, 0];
  } else if (hueSextant < 2) {
    [r, g, b] = [secondary, chroma, 0];
  } else if (hueSextant < 3) {
    [r, g, b] = [0, chroma, secondary];
  } else if (hueSextant < 4) {
    [r, g, b] = [0, secondary, chroma];
  } else if (hueSextant < 5) {
    [r, g, b] = [secondary, 0, chroma];
  } else {
    [r, g, b] = [chroma, 0, secondary];
  }
  const lightnessMatch = l - chroma / 2;
  const toByte = (channel: number): string => {
    const value = Math.round((channel + lightnessMatch) * 255);
    const clamped = value < 0 ? 0 : value > 255 ? 255 : value;
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

/**
 * Derive the PALE plan shade from a base color: lighten toward white while retaining
 * most of the base saturation (CR-002 Part 1), so the result is a clearly-colored
 * lighter tint rather than a grey wash. Returns the base color unchanged when it
 * cannot be parsed (named / transparent / gradient).
 *
 * @param baseColor - The item's base fill color.
 * @returns The pale plan shade as `#rrggbb`, or the base color when unparseable.
 */
export function planColorFrom(baseColor: string): string {
  const hsl = parseColorToHsl(baseColor);
  if (hsl === null) {
    return baseColor;
  }
  return hslToCss({
    h: hsl.h,
    s: clamp01(hsl.s * PLAN_SATURATION_RETAIN),
    l: clamp01(hsl.l + (1 - hsl.l) * PLAN_LIGHTEN_FRACTION),
  });
}

/**
 * Derive the VIVID actual shade from a base color: saturate toward full and deepen
 * toward black (CR-002 Part 1). Returns the base color unchanged when it cannot be
 * parsed.
 *
 * @param baseColor - The item's base fill color.
 * @returns The vivid actual shade as `#rrggbb`, or the base color when unparseable.
 */
export function actualColorFrom(baseColor: string): string {
  const hsl = parseColorToHsl(baseColor);
  if (hsl === null) {
    return baseColor;
  }
  return hslToCss({
    h: hsl.h,
    s: clamp01(hsl.s + (1 - hsl.s) * ACTUAL_SATURATE_FRACTION),
    l: clamp01(hsl.l * ACTUAL_LIGHTNESS_RETAIN),
  });
}

/** The subset of an item this module reads to color its plan/actual sides. */
type ColorableItem = Pick<ScheduleItem, 'fillColor' | 'fillColorExplicit' | 'actualStart'>;

/**
 * The fill for an item's PLAN side (and for a plain glyph that has no actual).
 *
 * CR-002 Part 1: an item that records an actual is drawn with the PALE plan shade so
 * the vivid actual reads as the emphasized "as-run" side; a plan-only item keeps its
 * own stored fill (nothing to contrast against, so no wash-out). An explicit fill
 * always overrides.
 *
 * @param item - The item to color.
 * @returns The plan-side fill color.
 */
export function displayFillColor(item: ColorableItem): string {
  if (item.fillColorExplicit === true) {
    return item.fillColor;
  }
  if (item.actualStart === undefined) {
    return item.fillColor;
  }
  return planColorFrom(item.fillColor);
}

/**
 * The fill for an item's ACTUAL / progress side (CR-002 Part 1): the VIVID shade of
 * the item's base color, unless an explicit fill overrides it.
 *
 * @param item - The item to color.
 * @returns The actual-side fill color.
 */
export function actualDisplayFillColor(item: ColorableItem): string {
  if (item.fillColorExplicit === true) {
    return item.fillColor;
  }
  return actualColorFrom(item.fillColor);
}
