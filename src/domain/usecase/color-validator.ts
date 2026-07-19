/**
 * UseCase layer: color-value validation for untrusted import (security-design
 * §3.1 / C-02, M5a review finding M-3). Pure, no DOM.
 *
 * An imported document's `fillColor` / `strokeColor` (and annotation stroke
 * colors) flow into exported SVG paint attributes. An attacker could smuggle an
 * external paint reference such as `url(http://evil/beacon)` or a legacy IE
 * `expression(...)` there, causing the SHARED SVG to fetch an external resource
 * (a tracking beacon / information disclosure) on a third party's machine. We
 * therefore validate every color field against an allowlist and REJECT anything
 * that is not a plain color literal.
 *
 * Accepted (C-02):
 * - hex: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`
 * - `rgb(...)` / `rgba(...)` / `hsl(...)` / `hsla(...)` with numeric/percent args
 * - the 10 CUD palette key names (e.g. `red`, `dark_gray`) and their hex values
 * - a small set of safe CSS keywords: `none`, `transparent`, `currentColor`,
 *   `inherit`
 *
 * Rejected: `url(...)` paint references (internal or external), `expression(...)`,
 * `javascript:`, `image(...)`, and any other unrecognized token.
 */

import { CUD_PALETTE } from '../model/cud-palette.js';

/** Hex colors: #rgb, #rgba, #rrggbb, #rrggbbaa. */
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Functional colors with numeric / percentage / comma-or-space separated args:
 * rgb(), rgba(), hsl(), hsla(). Args are constrained to digits, dots, `%`,
 * spaces, commas and a leading sign -- no nested `url()` or identifiers.
 */
const FUNCTIONAL_COLOR = /^(?:rgb|rgba|hsl|hsla)\(\s*[-0-9.%,\s/]+\)$/i;

/** Safe non-paint-reference CSS keywords. */
const SAFE_COLOR_KEYWORDS = new Set(['none', 'transparent', 'currentcolor', 'inherit']);

/** CUD palette key names (e.g. `red`) accepted as symbolic color values. */
const PALETTE_KEYS = new Set(CUD_PALETTE.map((color) => color.colorKey.toLowerCase()));

/** CUD palette hex values, lower-cased, accepted directly. */
const PALETTE_VALUES = new Set(CUD_PALETTE.map((color) => color.cssValue.toLowerCase()));

/**
 * True when a string is an accepted color literal (C-02). Rejects paint
 * references (`url(...)`), `expression(...)`, `javascript:` and unknown tokens.
 *
 * @param value - The candidate color string.
 * @returns Whether the value is a safe color literal.
 */
export function isValidColorValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > 64) {
    return false;
  }
  // Defense in depth: reject dangerous substrings outright.
  if (
    normalized.includes('url(') ||
    normalized.includes('expression') ||
    normalized.includes('javascript:') ||
    normalized.includes('image(')
  ) {
    return false;
  }
  if (SAFE_COLOR_KEYWORDS.has(normalized)) {
    return true;
  }
  if (PALETTE_KEYS.has(normalized) || PALETTE_VALUES.has(normalized)) {
    return true;
  }
  return HEX_COLOR.test(normalized) || FUNCTIONAL_COLOR.test(normalized);
}

/**
 * True when an SVG paint attribute value (`fill`, `stroke`, `stop-color`, ...)
 * is safe: a valid color literal OR an INTERNAL fragment paint reference
 * `url(#localGradient)`. External `url(http...)` / `url(data...)` references are
 * rejected so a sanitized imported icon can still reference its own gradients
 * without becoming an exfiltration vector (M5a review M-3 / L-1).
 *
 * @param value - The raw paint attribute value.
 * @returns Whether the paint value is safe to keep on a sanitized element.
 */
export function isSafePaintValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  // Internal fragment reference only: url(#id) or url("#id") / url('#id').
  if (/^url\(\s*['"]?#[^)'"]+['"]?\s*\)$/i.test(normalized)) {
    return true;
  }
  return isValidColorValue(value);
}
