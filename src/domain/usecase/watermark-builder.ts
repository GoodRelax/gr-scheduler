/**
 * UseCase layer: the diagonal tiled watermark geometry builder (TOOL-L1-007,
 * TOOL-L2-001/002, DATA-SVG-002). Pure, no DOM.
 *
 * Produces the set of tile placements (position + rotation + shared opacity) that
 * cover an area with a faint, diagonally rotated, repeated label. Both the live
 * screen-space overlay (svg-renderer) and the one-shot SVG export (svg-exporter)
 * consume this single builder so the on-screen and exported marks match exactly
 * (TOOL-L1-007 requires the mark on BOTH surfaces).
 *
 * The tile count is bounded by construction (a hard ceiling) so a tiny zoom / a
 * huge canvas can never emit an unbounded number of nodes.
 */

import type { Watermark } from '../model/schedule-model.js';
import {
  DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
  DEFAULT_WATERMARK_TEXT,
} from '../model/schedule-model.js';

/** Content of a watermark mark: local user name + generation timestamp. */
export interface WatermarkContent {
  /** Local, self-asserted user name (TOOL-L2-001). */
  readonly userName: string;
  /** ISO-8601 generation timestamp (TOOL-L2-001). */
  readonly timestamp: string;
}

/** One placed watermark tile in the target coordinate space. */
export interface WatermarkTile {
  readonly x: number;
  readonly y: number;
  /** Rotation in degrees applied about (x, y); constant across tiles. */
  readonly rotationDeg: number;
}

/** A complete watermark layer: the label text, tiles and the shared opacity. */
export interface WatermarkLayer {
  /** Rendered label = `${userName} ${timestamp}`, already trimmed. */
  readonly label: string;
  /** The bounded set of tile placements. */
  readonly tiles: readonly WatermarkTile[];
  /** Shared low opacity for the whole layer (faint, TOOL-L2-002). */
  readonly opacity: number;
  /** Font size in px for each tile label. */
  readonly fontSizePx: number;
}

/** Horizontal spacing between tiles in px. */
const TILE_STEP_X = 260;
/** Vertical spacing between tiles in px. */
const TILE_STEP_Y = 150;
/** Diagonal tilt of every tile (TOOL-L2-002). */
const ROTATION_DEG = -30;
/**
 * Faint layer opacity (TOOL-L2-002). Lowered from the previous 0.12 to 0.06 so the
 * default-ON watermark reads as a subtle, still-legible mark rather than a
 * distraction over the schedule content.
 */
const LAYER_OPACITY = 0.06;
/** Per-tile font size. */
const FONT_SIZE_PX = 18;
/** Hard ceiling on tile count so the layer can never explode. */
const MAX_TILES = 2000;

/**
 * Build the watermark tile layer covering `[0,0]..[width,height]` (TOOL-L2-002).
 *
 * @param content - The user name + timestamp to render.
 * @param width - Target width in px.
 * @param height - Target height in px.
 * @returns The label, bounded tile placements, opacity and font size.
 */
export function buildWatermarkLayer(
  content: WatermarkContent,
  width: number,
  height: number,
): WatermarkLayer {
  const label = `${content.userName} ${content.timestamp}`.trim();
  const tiles: WatermarkTile[] = [];
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  for (let y = 0; y <= safeHeight + TILE_STEP_Y; y += TILE_STEP_Y) {
    for (let x = 0; x <= safeWidth + TILE_STEP_X; x += TILE_STEP_X) {
      if (tiles.length >= MAX_TILES) {
        return { label, tiles, opacity: LAYER_OPACITY, fontSizePx: FONT_SIZE_PX };
      }
      tiles.push({ x, y, rotationDeg: ROTATION_DEG });
    }
  }
  return { label, tiles, opacity: LAYER_OPACITY, fontSizePx: FONT_SIZE_PX };
}

/**
 * Resolve the EFFECTIVE watermark from a possibly-absent stored value
 * (TOOL-L1-007, TOOL-L2-003). The watermark is shown by DEFAULT: an absent value
 * (a fresh or legacy document) resolves to an enabled mark whose label is the
 * default text {@link DEFAULT_WATERMARK_TEXT} ("GoodRelax") with no timestamp, and
 * whose hide password is the default hash. A stored value is returned as-is,
 * except that an absent {@link Watermark.hideHash} falls back to the default hash
 * so hiding is always gated by a known password.
 *
 * Pure: no clock is read here, so the default render path stays deterministic and
 * testable (the timestamp, when shown, is injected at the adapter boundary).
 *
 * @param watermark - The stored watermark, or undefined.
 * @returns The effective watermark to render / gate hiding with.
 */
export function resolveWatermark(watermark: Watermark | undefined): Watermark {
  if (watermark === undefined) {
    return {
      enabled: true,
      userName: DEFAULT_WATERMARK_TEXT,
      timestamp: '',
      hideHash: DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
    };
  }
  return {
    ...watermark,
    hideHash: watermark.hideHash ?? DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
  };
}

/** Left-pad a non-negative integer to two ASCII digits (UTC field formatting). */
function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/**
 * Format an epoch-milliseconds instant as a minute-precision UTC ISO-8601 string
 * with a trailing `Z` (e.g. `2026-07-19T05:12Z`), for the evidence watermark
 * timestamp (TOOL-L2-001). Pure and clock-free: the caller injects the instant, so
 * the format is deterministic and testable. UTC is used so a shared/captured chart
 * carries an unambiguous, timezone-independent generation time.
 *
 * @param epochMillis - Milliseconds since the Unix epoch (UTC).
 * @returns The UTC ISO-8601 timestamp trimmed to minute precision with `Z`.
 */
export function formatWatermarkTimestampUtc(epochMillis: number): string {
  const date = new Date(epochMillis);
  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hour = pad2(date.getUTCHours());
  const minute = pad2(date.getUTCMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}Z`;
}
