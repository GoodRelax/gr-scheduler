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
 * (TOOL-L1-007, TOOL-L2-003, TOOL-L2-004, CR-009 Part 2). The watermark is shown by
 * DEFAULT: an absent value (a fresh document with no stored mark) resolves to an
 * enabled mark whose label is the default text {@link DEFAULT_WATERMARK_TEXT}
 * ("GoodRelax") plus a UTC generation time, and whose hide password is the default
 * hash. The generation time is MANDATORY (CR-009 Part 2): the default mark can never
 * be time-less, so the resolved timestamp is always a valid minute-precision UTC
 * ISO-8601 string with a trailing `Z`.
 *
 * A stored value is returned as-is (its timestamp is preserved, since it is
 * re-stamped only on content changes -- CR-009 Part 3 -- not per render), except
 * that an absent {@link Watermark.hideHash} falls back to the default hash so hiding
 * is always gated by a known password.
 *
 * The absent-default branch reads the real clock ({@link Date.now}) so the mandatory
 * UTC time is present the first time a fresh document is resolved; callers that need
 * a stable time seed it once into the stored watermark and re-stamp it only on
 * content changes, so the render path (which passes a stored value) stays stable
 * across zoom / scroll.
 *
 * @param watermark - The stored watermark, or undefined.
 * @returns The effective watermark to render / gate hiding with.
 */
export function resolveWatermark(watermark: Watermark | undefined): Watermark {
  if (watermark === undefined) {
    return {
      enabled: true,
      userName: DEFAULT_WATERMARK_TEXT,
      timestamp: formatWatermarkTimestampUtc(Date.now()),
      hideHash: DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
    };
  }
  return {
    ...watermark,
    hideHash: watermark.hideHash ?? DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
  };
}

/**
 * Materialize a CONCRETE watermark carrying a fixed, mandatory UTC time for a freshly
 * adopted document -- the bootstrap seed AND an import (CR-009 Part 2 / Part 3). This
 * pins the evidence time ONCE so that {@link resolveWatermark} thereafter returns it
 * verbatim on every render, keeping it stable across zoom / scroll (a document with a
 * completely absent watermark would otherwise make {@link resolveWatermark} read the
 * clock every render, so zooming would change the UTC until the next edit).
 *
 * A watermark that already carries a real time KEEPS it (an imported chart's evidence
 * time is preserved); only an absent or empty time is seeded with the current UTC.
 * Unlike the content-change re-stamp, this never overwrites an existing time. Reading
 * the real clock here is intentional runtime behavior.
 *
 * @param watermark - The stored watermark, or undefined.
 * @returns A concrete watermark whose `timestamp` is a non-empty minute-precision UTC.
 */
export function materializeWatermark(watermark: Watermark | undefined): Watermark {
  const resolved = resolveWatermark(watermark);
  if (resolved.timestamp !== '') {
    return resolved;
  }
  return { ...resolved, timestamp: formatWatermarkTimestampUtc(Date.now()) };
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
