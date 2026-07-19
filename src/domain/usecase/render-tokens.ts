/**
 * UseCase layer: semantic color tokens for the SVG renderer's DECORATIONS
 * (selection, handles, measurement cursors, ruler, ghosts, comment callouts).
 * Pure data, no DOM.
 *
 * These centralize colors the renderer previously wrote as scattered hex literals
 * (review M-3 / R5 -- DRY). Each is named by PURPOSE so a theme/a11y adjustment
 * touches ONE place instead of chasing duplicated `#rrggbb` strings across the
 * render code. The chromatic accents reuse the Color-Universal-Design (Okabe-Ito)
 * hues also listed in {@link CUD_PALETTE}. Every value is kept BYTE-IDENTICAL to
 * the prior literal, so this is a pure indirection cleanup (no rendered color
 * changes).
 */

/** Selection outline / resize-handle / primary measurement-cursor stroke (CUD blue). */
export const CUD_BLUE_ACCENT_HEX = '#0072b2';

/** Secondary measurement cursor, its day-count label, and new-box stroke (CUD green). */
export const CUD_GREEN_ACCENT_HEX = '#009e73';

/** Fill of the small square resize / selection handles (opaque white). */
export const HANDLE_FILL_HEX = '#ffffff';

/** Transient dependency-link preview polyline stroke (purple, DEP-L1-002). */
export const DEPENDENCY_PREVIEW_STROKE_HEX = '#8452b3';

/** Vertical alignment / snapping guide stroke (CUD orange). */
export const ALIGNMENT_GUIDE_STROKE_HEX = '#e69f00';

/** Classification / section gridline and date-ruler separator stroke (faint slate). */
export const SECTION_LINE_HEX = '#c3c8d0';

/** Previous-plan ("before" ghost) bar fill (light gray). */
export const PREVIOUS_PLAN_GHOST_FILL_HEX = '#c9c9c9';

/** Previous-plan ("before" ghost) bar stroke (mid gray). */
export const PREVIOUS_PLAN_GHOST_STROKE_HEX = '#9a9a9a';

/** Date-ruler background fill. */
export const RULER_BACKGROUND_HEX = '#eef1f5';

/** Date-ruler tier label text fill. */
export const RULER_LABEL_HEX = '#2b2b2b';

/** Date-ruler bottom border stroke. */
export const RULER_BORDER_HEX = '#a9b0ba';

/** Tiled watermark text fill (muted gray). */
export const WATERMARK_TILE_HEX = '#888888';

/** Comment callout-box fill (pale amber). */
export const COMMENT_CALLOUT_FILL_HEX = '#fff7e6';

/** Comment callout-box border and leader stroke (brown). */
export const COMMENT_CALLOUT_STROKE_HEX = '#8a6d3b';

/** Comment free-leader stroke when the callout has no box (neutral gray). */
export const COMMENT_LEADER_STROKE_HEX = '#555555';
