/**
 * Entity layer: the fixed 10-color palette (PROP-L1-005) tuned for Color
 * Universal Design (PROP-L1-006). None of the entries are raw primaries such as
 * `#FF0000`; the red/green/blue/orange hues are desaturated and lightness-shifted
 * so that adjacent swatches stay distinguishable under the common color-vision
 * deficiency types (protanopia / deuteranopia / tritanopia).
 *
 * These values follow the widely used Okabe-Ito CUD set for the chromatic
 * colors, extended with a neutral gray ramp for stroke/fill defaults. Pure data,
 * no side effects.
 */

/** One selectable palette color with a stable key and a CUD-adjusted value. */
export interface PaletteColor {
  /** Stable English identifier (never localized). */
  readonly colorKey: string;
  /** CSS hex color value (CUD adjusted, not a raw primary). */
  readonly cssValue: string;
}

/**
 * The 10 CUD-adjusted palette colors in a stable order:
 * white, black, dark gray, light gray, red, blue, yellow, green, orange, purple.
 */
export const CUD_PALETTE: readonly PaletteColor[] = [
  { colorKey: 'white', cssValue: '#ffffff' },
  { colorKey: 'black', cssValue: '#000000' },
  { colorKey: 'dark_gray', cssValue: '#4d4d4d' },
  { colorKey: 'light_gray', cssValue: '#d9d9d9' },
  { colorKey: 'red', cssValue: '#d55e00' },
  { colorKey: 'blue', cssValue: '#0072b2' },
  { colorKey: 'yellow', cssValue: '#f0e442' },
  { colorKey: 'green', cssValue: '#009e73' },
  { colorKey: 'orange', cssValue: '#e69f00' },
  { colorKey: 'purple', cssValue: '#cc79a7' },
];

/**
 * The `transparent` keyword offered alongside the palette swatches so an item can
 * have no visible fill or border. It is a safe CSS keyword (no paint reference),
 * accepted by {@link isValidColorValue}, and rendered as a checkerboard swatch in
 * the property panel so it reads as "no color", not as white.
 */
export const TRANSPARENT_COLOR_KEY = 'transparent';

/** Default fill color for newly created items (CUD blue). */
export const DEFAULT_FILL_COLOR = '#0072b2';

/**
 * Default stroke color for newly created items: transparent, so tasks and
 * milestones have NO border by default (user feedback: the dark-gray default
 * border was noisy). The fill keeps its color default; a border can still be set
 * explicitly via the stroke color palette.
 */
export const DEFAULT_STROKE_COLOR = TRANSPARENT_COLOR_KEY;
