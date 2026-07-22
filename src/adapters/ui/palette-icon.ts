/**
 * Adapter layer: the floating command palette's miniature line-art icons (CR-014).
 *
 * Before CR-014 the palette described shapes with TEXT GLYPHS and EMOJI -- `>>` for a
 * chevron, `|-|` for a span, seven emoji for the CR-004 special milestones -- while the
 * canvas drew real SVG geometry. That was TWO parallel definitions of the same shapes,
 * which silently drifted apart (the text `>>` looks nothing like the drawn feather
 * banner). This module removes the second definition: every shape icon in the palette
 * is a miniature inline `<svg>` whose path data comes from the SAME builders the canvas
 * uses -- {@link taskGlyphPath} for the task shapes and {@link milestoneShapePath} for
 * every milestone shape, including the seven special ones. A change to a canvas glyph
 * therefore changes its palette icon with it (single source of truth).
 *
 * Buttons that have NO canvas counterpart (progress line, comment, add-box, watermark,
 * the cursor-guide modes and the grid toggles) get bespoke paths declared here, drawn in
 * the same visual language: one 20x20 design grid, an outline stroked with `currentColor`
 * so every theme (light / dark / mono) keeps working, round caps and joins.
 *
 * ## Proportions -- the SILVER RATIO (1 : sqrt(2) = 1 : 1.414)
 *
 * CR-014 Part 5 asked for a deliberate ratio instead of ad-hoc pixel values. The SILVER
 * ratio is used rather than the golden ratio because sqrt(2) is the aspect of the ISO/JIS
 * paper series (A3/A4) a Japanese schedule sheet is printed on, and because its rungs stay
 * self-similar under halving, which keeps a dense toolbar visually regular.
 *
 * Every palette dimension is a rung of ONE geometric ladder,
 * `rung(n) = PALETTE_BUTTON_EDGE_PX / SILVER_RATIO ** n`:
 *
 * | rung | value  | applied to                                        |
 * |------|--------|---------------------------------------------------|
 * | n=0  | 20.000 | button box edge (min-width / min-height, border-box) |
 * | n=1  | 14.142 | rendered glyph (inline `<svg>`) edge              |
 * | n=3  |  7.071 | gap BETWEEN command groups                        |
 * | n=4  |  5.000 | total horizontal glyph inset inside the design grid |
 * | n=5  |  3.536 | gap between buttons WITHIN a group                |
 *
 * The button padding is not a free value either: it is the leftover ring
 * `(rung(0) - rung(1)) / 2`, see {@link PALETTE_BUTTON_PAD_PX}.
 */

import type { MilestoneShape, TaskShape } from '../../domain/model/schedule-model.js';
import type { FadePoint } from '../../domain/usecase/fade-geometry.js';
import { fadeTrapezoidPoints } from '../../domain/usecase/fade-geometry.js';
import {
  TASK_CONNECTOR_LINE_Y_FRACTION,
  taskGlyphPaintMode,
  taskGlyphPath,
  type GlyphRect,
} from '../../domain/usecase/task-glyph.js';
import { milestoneShapeKindUsesEvenOdd, milestoneShapePath } from '../render/item-geometry.js';

/** The silver ratio, 1 : sqrt(2) ~= 1 : 1.414 (see the module header for the rationale). */
export const SILVER_RATIO = Math.SQRT2;

/** Rung 0 of the silver ladder: the square edge of a palette button, in CSS px. */
export const PALETTE_BUTTON_EDGE_PX = 20;

/**
 * A rung of the palette's silver-ratio ladder: the button edge reduced `steps` times
 * by {@link SILVER_RATIO}. Every palette dimension is derived from this, so there are
 * no free-floating magic numbers.
 *
 * @param steps - How many silver steps DOWN from the button edge (0 = the edge itself).
 * @returns The rung length in CSS px.
 */
export function paletteSilverRungPx(steps: number): number {
  return PALETTE_BUTTON_EDGE_PX / SILVER_RATIO ** steps;
}

/** Rung 1: the rendered edge of the inline glyph `<svg>` inside a button (~14.14px). */
export const PALETTE_GLYPH_EDGE_PX = paletteSilverRungPx(1);

/** Rung 3: the gap BETWEEN command groups (~7.07px). */
export const PALETTE_GROUP_GAP_PX = paletteSilverRungPx(3);

/** Rung 5: the gap between buttons WITHIN one group (~3.54px). */
export const PALETTE_BUTTON_GAP_PX = paletteSilverRungPx(5);

/**
 * The leftover ring between the button box and the glyph box, used as the button's
 * padding so an icon button is exactly `PALETTE_BUTTON_EDGE_PX` on a side (border-box)
 * and a TEXT button (P / A / Ao / As / S / M / L / @) breathes by the same amount.
 */
export const PALETTE_BUTTON_PAD_PX = (PALETTE_BUTTON_EDGE_PX - PALETTE_GLYPH_EDGE_PX) / 2;

/**
 * The icon design grid: every palette path is authored in a square `0 0 20 20` user
 * space and scaled down to {@link PALETTE_GLYPH_EDGE_PX} by the `<svg>` viewBox, so the
 * authored coordinates stay readable integers.
 */
export const PALETTE_ICON_GRID = 20;

/** Outline weight in design-grid units (~1.13 CSS px once scaled to the glyph edge). */
export const PALETTE_ICON_STROKE_UNITS = 1.6;

/** Rung 4 halved: the horizontal inset of a glyph from each edge of the design grid. */
const PALETTE_GLYPH_INSET = paletteSilverRungPx(4) / 2;

/** Width of a task glyph inside the design grid (grid minus both insets). */
export const PALETTE_TASK_GLYPH_WIDTH = PALETTE_ICON_GRID - PALETTE_GLYPH_INSET * 2;

/**
 * Height of a task glyph's band: the glyph width reduced ONE silver step, so a palette
 * task icon has the same sqrt(2) : 1 landscape aspect as the rest of the ladder and
 * still reads as a horizontal bar rather than a square.
 */
export const PALETTE_TASK_BAND_HEIGHT = PALETTE_TASK_GLYPH_WIDTH / SILVER_RATIO;

/**
 * The rect a FILLED-body task glyph (bar / chevron) is drawn into: the band centered
 * vertically in the design grid, because such a glyph occupies its whole rect.
 */
export const PALETTE_TASK_FILL_RECT: GlyphRect = {
  x: PALETTE_GLYPH_INSET,
  y: (PALETTE_ICON_GRID - PALETTE_TASK_BAND_HEIGHT) / 2,
  width: PALETTE_TASK_GLYPH_WIDTH,
  height: PALETTE_TASK_BAND_HEIGHT,
};

/**
 * The rect a LINE-style task glyph (arrow / span) is drawn into. Such a glyph puts its
 * connector on {@link TASK_CONNECTOR_LINE_Y_FRACTION} of the band (the canvas reserves
 * the upper part for the in-band abbreviation, which a palette icon has none of), so the
 * rect is shifted UP until that connector lands exactly on the grid's horizontal center
 * and the icon reads as centered.
 */
export const PALETTE_TASK_LINE_RECT: GlyphRect = {
  x: PALETTE_GLYPH_INSET,
  y: PALETTE_ICON_GRID / 2 - PALETTE_TASK_BAND_HEIGHT * TASK_CONNECTOR_LINE_Y_FRACTION,
  width: PALETTE_TASK_GLYPH_WIDTH,
  height: PALETTE_TASK_BAND_HEIGHT,
};

/** Center of a milestone glyph in the design grid (both axes). */
export const PALETTE_MILESTONE_CENTER = PALETTE_ICON_GRID / 2;

/** Circumradius of a milestone glyph: the half-grid reduced one silver step (~7.07). */
export const PALETTE_MILESTONE_RADIUS = PALETTE_ICON_GRID / 2 / SILVER_RATIO;

/** The world rect a task shape's palette icon is drawn into (paint-mode dependent). */
export function paletteTaskGlyphRect(shape: TaskShape): GlyphRect {
  return taskGlyphPaintMode(shape) === 'fill' ? PALETTE_TASK_FILL_RECT : PALETTE_TASK_LINE_RECT;
}

/** Serialize polygon vertices as a closed SVG path `d`. */
function polygonPathD(points: readonly FadePoint[]): string {
  const steps = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`);
  return `${steps.join(' ')} Z`;
}

/**
 * The palette path for a `bar` task. The canvas draws a bar as the FADE POLYGON rather
 * than as a `taskGlyphPath` (which returns an empty string for `bar`), so the icon is
 * built from the same {@link fadeTrapezoidPoints} builder with both fades at zero --
 * i.e. the exact rectangle a fade-less bar renders as.
 *
 * @returns The SVG path data of the bar icon.
 */
export function paletteBarPathD(): string {
  const rect = PALETTE_TASK_FILL_RECT;
  return polygonPathD(
    fadeTrapezoidPoints({
      startDay: 0,
      endDay: 1,
      fadeInDays: 0,
      fadeOutDays: 0,
      top: rect.y,
      bottom: rect.y + rect.height,
      dayToX: (day) => rect.x + day * rect.width,
    }),
  );
}

/**
 * The SVG path data of a TASK shape's palette icon, taken from the canvas builder.
 *
 * @param shape - The task shape the button arms.
 * @returns The path `d` for the icon, in design-grid units.
 */
export function paletteTaskShapePathD(shape: TaskShape): string {
  return shape === 'bar' ? paletteBarPathD() : taskGlyphPath(shape, paletteTaskGlyphRect(shape));
}

/**
 * The SVG path data of a MILESTONE shape's palette icon, taken from the canvas builder.
 *
 * @param shape - The milestone shape the button arms.
 * @returns The path `d` for the icon, in design-grid units.
 */
export function paletteMilestoneShapePathD(shape: MilestoneShape): string {
  return milestoneShapePath(
    shape,
    PALETTE_MILESTONE_CENTER,
    PALETTE_MILESTONE_CENTER,
    PALETTE_MILESTONE_RADIUS,
  );
}

/** How a palette icon paints: an outline is the default, some glyphs also need a fill. */
export interface PaletteIconPaint {
  /** SVG `fill` attribute value (`none` for pure line art). */
  readonly fill: string;
  /** SVG `fill-rule` attribute value, when the glyph's subpaths are holes. */
  readonly fillRule: string;
}

/** Pure line art: an unfilled outline stroked with the inherited `currentColor`. */
const OUTLINE_PAINT: PaletteIconPaint = { fill: 'none', fillRule: 'nonzero' };

/**
 * The paint mode of a TASK shape's palette icon, derived from the canvas's own
 * {@link taskGlyphPaintMode}. A `span`'s terminals are FILLED discs on the canvas, so its
 * icon keeps the fill; `bar` and `chevron` paint as filled bodies on the canvas but are
 * reduced to an outline here, because CR-014 makes the whole palette line art.
 *
 * @param shape - The task shape.
 * @returns The icon's fill attributes.
 */
export function paletteTaskShapePaint(shape: TaskShape): PaletteIconPaint {
  return taskGlyphPaintMode(shape) === 'line-with-dots'
    ? { fill: 'currentColor', fillRule: 'nonzero' }
    : OUTLINE_PAINT;
}

/**
 * The paint mode of a MILESTONE shape's palette icon. Always an outline (line art), but
 * the `fill-rule` still follows the canvas's {@link milestoneShapeKindUsesEvenOdd} so the
 * composite CR-004 glyphs keep their hole semantics if a theme ever fills them.
 *
 * @param shape - The milestone shape.
 * @returns The icon's fill attributes.
 */
export function paletteMilestoneShapePaint(shape: MilestoneShape): PaletteIconPaint {
  return { fill: 'none', fillRule: milestoneShapeKindUsesEvenOdd(shape) ? 'evenodd' : 'nonzero' };
}

/**
 * Palette buttons that have NO canvas counterpart and therefore need a bespoke icon.
 * Each name matches the command it labels; the paths live in
 * {@link PALETTE_COMMAND_ICON_PATHS}.
 */
export type PaletteCommandIconName =
  | 'progress-line'
  | 'comment'
  | 'add-box'
  | 'watermark'
  | 'cursor-guide-none'
  | 'cursor-guide-crosshair'
  | 'cursor-guide-single-vertical'
  | 'cursor-guide-double-vertical'
  | 'grid-date'
  | 'grid-category';

/**
 * Bespoke line-art paths for the commands with no drawn canvas shape, authored in the
 * shared 20x20 design grid so they sit at the same optical weight as the shape icons.
 *
 * - `progress-line`  -- the zigzag of an "inazuma" (progress) line, NOT a lightning emoji.
 * - `comment`        -- a speech bubble with a tail.
 * - `add-box`        -- the rounded annotation box.
 * - `watermark`      -- a copyright-style ring with an inner C arc.
 * - `cursor-guide-*` -- the four exclusive pointer-guide modes (off / crosshair / one
 *                       vertical rule / two vertical rules).
 * - `grid-date`      -- the vertical date rules under a top ruler.
 * - `grid-category`  -- the horizontal category boundary rules.
 */
export const PALETTE_COMMAND_ICON_PATHS: Readonly<Record<PaletteCommandIconName, string>> = {
  'progress-line': 'M 12.5 2 L 6 7.5 L 14 12.5 L 7.5 18',
  comment: 'M 3 4 L 17 4 L 17 13 L 9 13 L 5.5 17 L 5.5 13 L 3 13 Z',
  'add-box':
    'M 4.5 5 L 15.5 5 A 2 2 0 0 1 17.5 7 L 17.5 13 A 2 2 0 0 1 15.5 15 ' +
    'L 4.5 15 A 2 2 0 0 1 2.5 13 L 2.5 7 A 2 2 0 0 1 4.5 5 Z',
  watermark:
    'M 10 2.5 A 7.5 7.5 0 1 0 10 17.5 A 7.5 7.5 0 1 0 10 2.5 Z ' +
    'M 12.6 7.7 A 3.4 3.4 0 1 0 12.6 12.3',
  'cursor-guide-none': 'M 10 3 A 7 7 0 1 0 10 17 A 7 7 0 1 0 10 3 Z M 5 5 L 15 15',
  'cursor-guide-crosshair': 'M 10 2 L 10 18 M 2 10 L 18 10',
  'cursor-guide-single-vertical': 'M 10 2 L 10 18',
  'cursor-guide-double-vertical': 'M 7.5 2 L 7.5 18 M 12.5 2 L 12.5 18',
  'grid-date': 'M 2.5 3.5 L 17.5 3.5 M 6 3.5 L 6 17 M 10 3.5 L 10 17 M 14 3.5 L 14 17',
  'grid-category': 'M 2.5 6 L 17.5 6 M 2.5 10 L 17.5 10 M 2.5 14 L 17.5 14',
};

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** Round a CSS length to 2 decimals so the emitted attributes/stylesheet stay compact. */
function roundPx(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

/**
 * Build a palette icon: an inline `<svg>` of one path, sized to the silver-ratio glyph
 * rung, stroked with the inherited `currentColor` so themes keep working, and hidden
 * from assistive tech (the button's `aria-label` carries the accessible name).
 *
 * @param pathD - The SVG path data, authored in the 20x20 design grid.
 * @param paint - Fill attributes for the path (defaults to pure line art).
 * @returns The icon element, ready to append to a button.
 */
export function createPaletteIconSvg(
  pathD: string,
  paint: PaletteIconPaint = OUTLINE_PAINT,
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('width', roundPx(PALETTE_GLYPH_EDGE_PX));
  svg.setAttribute('height', roundPx(PALETTE_GLYPH_EDGE_PX));
  svg.setAttribute('viewBox', `0 0 ${PALETTE_ICON_GRID} ${PALETTE_ICON_GRID}`);
  svg.setAttribute('data-role', 'palette-icon');
  // Decorative: the accessible name lives on the owning button (WCAG 1.1.1 / 4.1.2).
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('d', pathD);
  path.setAttribute('fill', paint.fill);
  path.setAttribute('fill-rule', paint.fillRule);
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', PALETTE_ICON_STROKE_UNITS.toString());
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
  return svg;
}

/** Build the palette icon of a TASK shape from the canvas geometry. */
export function createTaskShapeIcon(shape: TaskShape): SVGSVGElement {
  return createPaletteIconSvg(paletteTaskShapePathD(shape), paletteTaskShapePaint(shape));
}

/** Build the palette icon of a MILESTONE shape from the canvas geometry. */
export function createMilestoneShapeIcon(shape: MilestoneShape): SVGSVGElement {
  return createPaletteIconSvg(
    paletteMilestoneShapePathD(shape),
    paletteMilestoneShapePaint(shape),
  );
}

/** Build one of the bespoke command icons (no canvas counterpart). */
export function createCommandIcon(name: PaletteCommandIconName): SVGSVGElement {
  return createPaletteIconSvg(PALETTE_COMMAND_ICON_PATHS[name]);
}

/**
 * Replace a button's text label with an icon, leaving its accessible name, tooltip and
 * `data-role` untouched (CR-014 is a purely visual change).
 *
 * @param button - The button to re-skin.
 * @param icon - The icon built by one of the `create*Icon` helpers.
 */
export function setPaletteButtonIcon(button: HTMLButtonElement, icon: SVGSVGElement): void {
  button.textContent = '';
  button.appendChild(icon);
}

/**
 * The palette's proportion stylesheet: every size/gap declaration that follows the
 * silver-ratio ladder, emitted from the constants above so the CSS can never drift from
 * them (and so a unit test can assert the ratio really reaches the DOM).
 *
 * @param paletteClass - The floating palette's CSS class (owned by the app shell).
 * @returns A CSS text fragment to append to the palette stylesheet.
 */
export function paletteProportionCss(paletteClass: string): string {
  return `
/* CR-014 Part 4: silver-ratio (1:${roundPx(SILVER_RATIO)}) proportions. */
.${paletteClass} { gap: ${roundPx(PALETTE_BUTTON_GAP_PX)}px ${roundPx(PALETTE_GROUP_GAP_PX)}px; }
.${paletteClass} .grsch-cmd-group { gap: ${roundPx(PALETTE_BUTTON_GAP_PX)}px; }
/* The shapes row nests two GROUPS (task, milestone), so its children are separated by
   the inter-GROUP rung, not the inter-button one -- otherwise TASK and MILESTONE would
   sit closer together than any other pair of groups in the palette. */
.${paletteClass} .grsch-cmd-group[data-role='shape-groups'] { gap: ${roundPx(PALETTE_GROUP_GAP_PX)}px; }
.${paletteClass} button {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: ${roundPx(PALETTE_BUTTON_EDGE_PX)}px;
  min-height: ${roundPx(PALETTE_BUTTON_EDGE_PX)}px;
  padding: 0 ${roundPx(PALETTE_BUTTON_PAD_PX)}px;
}
.${paletteClass} button svg[data-role="palette-icon"] {
  display: block;
  width: ${roundPx(PALETTE_GLYPH_EDGE_PX)}px;
  height: ${roundPx(PALETTE_GLYPH_EDGE_PX)}px;
  overflow: visible;
  pointer-events: none;
}`;
}
