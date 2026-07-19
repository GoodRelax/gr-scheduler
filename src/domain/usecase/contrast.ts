/**
 * UseCase layer: WCAG 2.1 contrast-ratio math (NFR-L1-006, WCAG 1.4.3). Pure, no
 * DOM. Parses a CSS hex color, computes the relative luminance per the WCAG
 * definition, and derives the contrast ratio between two colors so the UI color
 * tokens and the CUD palette can be asserted against the AA thresholds.
 *
 * References: WCAG 2.1 Success Criterion 1.4.3 (Contrast Minimum). The AA
 * thresholds are 4.5:1 for normal text and 3:1 for large text and non-text UI
 * components (SC 1.4.11).
 */

/** WCAG AA minimum contrast ratio for normal-size text (SC 1.4.3). */
export const AA_TEXT_CONTRAST_RATIO = 4.5;

/** WCAG AA minimum contrast ratio for large text / UI components (1.4.3/1.4.11). */
export const AA_LARGE_OR_UI_CONTRAST_RATIO = 3;

/** An sRGB color channel triple in the 0..255 integer range. */
interface RgbChannels {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

/**
 * Parse a CSS hex color (`#rgb` or `#rrggbb`, case-insensitive) into 0..255
 * channels. Throws on any other syntax so an invalid token fails loudly in tests
 * rather than silently reporting a wrong ratio.
 *
 * @param hexColor - A `#rgb` or `#rrggbb` string.
 * @returns The parsed sRGB channels.
 */
export function parseHexColor(hexColor: string): RgbChannels {
  const normalized = hexColor.trim().toLowerCase();
  const shortMatch = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(normalized);
  if (shortMatch !== null) {
    const [, r, g, b] = shortMatch;
    return {
      red: Number.parseInt(`${r}${r}`, 16),
      green: Number.parseInt(`${g}${g}`, 16),
      blue: Number.parseInt(`${b}${b}`, 16),
    };
  }
  const longMatch = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(normalized);
  if (longMatch !== null) {
    const [, r, g, b] = longMatch;
    return {
      red: Number.parseInt(r as string, 16),
      green: Number.parseInt(g as string, 16),
      blue: Number.parseInt(b as string, 16),
    };
  }
  throw new Error(`Unsupported hex color for contrast math: ${hexColor}`);
}

/** Linearize one gamma-encoded sRGB channel (0..1) per the WCAG formula. */
function linearizeChannel(channel255: number): number {
  const channel = channel255 / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/**
 * Compute the WCAG relative luminance (0..1) of a hex color.
 *
 * @param hexColor - A `#rgb` or `#rrggbb` string.
 * @returns The relative luminance in [0, 1].
 */
export function relativeLuminance(hexColor: string): number {
  const { red, green, blue } = parseHexColor(hexColor);
  return (
    0.2126 * linearizeChannel(red) +
    0.7152 * linearizeChannel(green) +
    0.0722 * linearizeChannel(blue)
  );
}

/**
 * Compute the WCAG contrast ratio between two hex colors (1..21). Order does not
 * matter; the lighter color is always the numerator.
 *
 * @param foregroundHex - One color.
 * @param backgroundHex - The other color.
 * @returns The contrast ratio in [1, 21].
 */
export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const lumA = relativeLuminance(foregroundHex);
  const lumB = relativeLuminance(backgroundHex);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Whether two colors meet a WCAG AA contrast threshold.
 *
 * @param foregroundHex - The text/graphic color.
 * @param backgroundHex - The background color.
 * @param isLargeOrUi - True for large text or non-text UI (3:1); false for normal
 *   text (4.5:1).
 * @returns True when the pair meets the applicable AA threshold.
 */
export function meetsContrastAA(
  foregroundHex: string,
  backgroundHex: string,
  isLargeOrUi = false,
): boolean {
  const threshold = isLargeOrUi ? AA_LARGE_OR_UI_CONTRAST_RATIO : AA_TEXT_CONTRAST_RATIO;
  return contrastRatio(foregroundHex, backgroundHex) >= threshold;
}
