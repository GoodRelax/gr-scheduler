/**
 * Entity layer (Clean Architecture): pure domain model for the M1 walking
 * skeleton. These types are a deliberately minimal but real subset of the
 * ScheduleDocument aggregate defined in docs/spec/30-architecture.sdoc
 * (ARCH-C-001..003, ARCH-C-007). Editing, dependencies, plan/actual, watermark,
 * annotations and i18n value maps are intentionally out of M1 scope.
 *
 * Naming follows the project "meaningful names" rule: field names are
 * domain-qualified (e.g. `itemKind`, `taskShape`) rather than bare `type`/`data`.
 */

import type { Annotation } from './annotation.js';

/** ISO-8601 calendar date string, e.g. "2026-07-18". */
export type IsoDate = string;

/** Discriminates a point-in-time milestone from a spanning task. */
export type ItemKind = 'milestone' | 'task';

/** Milestone glyph shapes drawable by the SVG renderer in M1. */
export type MilestoneShape = 'circle' | 'triangle' | 'square' | 'diamond' | 'star';

/** Task bar shapes drawable by the SVG renderer in M1. */
export type TaskShape = 'bar' | 'arrow' | 'chevron';

/**
 * Anchor position of the abbreviation label relative to its item glyph
 * (PROP-L1-002 `label_position`). `auto` lets the renderer choose.
 */
export type LabelPosition = 'auto' | 'center' | 'top' | 'bottom' | 'right' | 'left';

/** Whether an item represents planned or actual dates (PROP `plan_actual_kind`). */
export type PlanActualKind = 'plan' | 'actual';

/**
 * Which side of the plan/actual pair is currently drawn (PLAN-L1-002). `both`
 * overlays plan and actual; the single-sided modes hide the other side; `none`
 * hides both (the state reached when both independent Plan/Actual toggles are
 * turned off).
 */
export type PlanActualDisplay = 'plan-only' | 'actual-only' | 'both' | 'none';

/**
 * Cursor rendering mode (CURS-L1-003). `vertical-line` draws only the time-axis
 * line; `crosshair` adds the horizontal row-indicating line.
 */
export type CursorMode = 'vertical-line' | 'crosshair';

/**
 * The pointer-following measurement guide mode (CURS-L1-003, cursor-guide rework).
 * An exclusive selection (radio, not a toggle) of four modes:
 *
 * - `none`            -- no guide is drawn (default).
 * - `crosshair`       -- one vertical + one horizontal line tracking the pointer.
 * - `single-vertical` -- one vertical line at the pointer.
 * - `double-vertical` -- two vertical lines (pointer + a second offset line).
 *
 * Persisted in {@link ViewState.cursorGuideMode} so it round-trips via JSON / autosave.
 */
export type CursorGuideMode = 'none' | 'crosshair' | 'single-vertical' | 'double-vertical';

/** The horizontal offset (CSS px) of the second line in `double-vertical` mode. */
export const DOUBLE_VERTICAL_GUIDE_OFFSET_PX = 40;

/** One measurement cursor pinned to a date on the time axis (CURS-L1-002). */
export interface CursorState {
  /** Time-axis position of the cursor. */
  readonly atDate: IsoDate;
  /** Vertical-line vs crosshair rendering (CURS-L1-003). */
  readonly mode: CursorMode;
}

/**
 * The two-cursor span tool (CURS-L1-002). `primary` is the base (基準) marker;
 * `secondary` is the diff (差分) marker. The measured day-count is displayed
 * above the secondary marker (mock feedback). Kept in ViewState so its position
 * and mode survive a visibility toggle (CURS-L1-004) and persist with the doc.
 */
export interface DualCursorState {
  readonly primary: CursorState;
  readonly secondary: CursorState;
  /** Visibility toggle (CURS-L1-004); absent is treated as hidden. */
  readonly visible?: boolean;
}

/**
 * A snapshot of an item's plan before it was last moved (PLAN-L1-004). Rendered
 * as a grayed ghost bar so a plan change is visible on the one-page chart.
 */
export interface PreviousPlan {
  readonly startDate: IsoDate;
  readonly endDate: IsoDate | null;
}

/** Stroke weight step (PROP `line_weight`). */
export type LineWeight = 'thin' | 'medium' | 'thick';

/**
 * Free-form pixel offset applied to the abbreviation label on top of its anchor
 * position, produced by dragging the label (ITEM-L1-010). World-space, zoom
 * independent (screen pixels).
 */
export interface LabelOffset {
  readonly dx: number;
  readonly dy: number;
}

/**
 * A single schedule item placed on one row's y-band. A milestone has
 * `endDate === null`; a task spans `[startDate, endDate]`.
 *
 * Beyond the M1 geometry fields, M2 adds the editable property set defined in
 * PROP-L1-002. All property fields are optional so pre-M2 fixtures and imported
 * documents remain valid; the property panel treats a missing value as empty.
 */
export interface ScheduleItem {
  /** Stable unique identifier within the document. */
  readonly id: string;
  /** Owning row identifier (Row.id). */
  readonly rowId: string;
  /** Milestone (point) vs task (span). */
  readonly itemKind: ItemKind;
  /** Inclusive start date of the item. */
  readonly startDate: IsoDate;
  /** Inclusive end date for tasks; null for milestones. */
  readonly endDate: IsoDate | null;
  /** Short label rendered next to the glyph. */
  readonly abbrev: string;
  /**
   * Level-of-detail weight in [0, 1]. Higher stays visible when zoomed out.
   * Consumed by the LOD selector (ADR-005).
   */
  readonly importance: number;
  /** Milestone glyph shape (present when itemKind === 'milestone'). */
  readonly milestoneShape?: MilestoneShape;
  /** Task bar shape (present when itemKind === 'task'). */
  readonly taskShape?: TaskShape;
  /**
   * Left-edge taper of a task bar in whole days (business hand-over cross-fade).
   * The top-left vertex is pulled right by this many days so the bar fades IN;
   * absent or 0 means a square left edge. Tasks only (milestones never fade).
   * Constrained with {@link fadeOutDays} so `fadeInDays + fadeOutDays` never
   * exceeds the task's day length (the top edge can never cross the bottom).
   */
  readonly fadeInDays?: number;
  /**
   * Right-edge taper of a task bar in whole days (business hand-over cross-fade).
   * The bottom-right vertex is pulled left by this many days so the bar fades OUT;
   * absent or 0 means a square right edge. Tasks only. When it equals
   * {@link fadeInDays} and both are positive the bar is a parallelogram.
   */
  readonly fadeOutDays?: number;
  /** Fill color (CSS color string). */
  readonly fillColor: string;
  /**
   * When true, {@link fillColor} is an EXPLICIT user choice that overrides the
   * plan/actual display color (green/orange) for this item on the canvas. Absent
   * or false means a plan/actual item keeps its derived plan/actual hue while a
   * plain item shows its own {@link fillColor}. Set by the property panel's
   * fill-color control so editing the fill takes visible effect on plan/actual items.
   */
  readonly fillColorExplicit?: boolean;
  /** Stroke color (CSS color string). */
  readonly strokeColor: string;
  /** Formal full name (PROP `full_name`). */
  readonly fullName?: string;
  /** Free-form description (PROP `description`). */
  readonly description?: string;
  /** Top-level classification (PROP `major_category`). */
  readonly majorCategory?: string;
  /** Mid-level classification (PROP `middle_category`). */
  readonly middleCategory?: string;
  /** Leaf-level classification (PROP `minor_category`). */
  readonly minorCategory?: string;
  /** Responsible person or team (PROP `assignee`). */
  readonly assignee?: string;
  /** Progress status label (PROP `status`). */
  readonly status?: string;
  /** Additional remarks (PROP `remarks`). */
  readonly remarks?: string;
  /** Plan vs actual discriminator (PROP `plan_actual_kind`). */
  readonly planActualKind?: PlanActualKind;
  /**
   * Shared id linking a plan item to its actual counterpart for one logical task
   * (PLAN-L1-001). Both members carry the same `planGroupId`, distinguished by
   * `planActualKind`; the actual overlays the plan.
   */
  readonly planGroupId?: string;
  /**
   * Progress front as a fraction in [0, 1] of the item's own span, used to place
   * this row's vertex on the illuminated line (PLAN-L1-003 / L2-001). Applies to
   * actual items; absent means "not started" (0) for line purposes.
   */
  readonly progressRatio?: number;
  /** Snapshot of the pre-change plan for gray ghost display (PLAN-L1-004). */
  readonly previousPlan?: PreviousPlan;
  /** Stroke weight step (PROP `line_weight`). */
  readonly lineWeight?: LineWeight;
  /** Abbreviation label anchor (PROP `label_position`). */
  readonly labelPosition?: LabelPosition;
  /** Screen-space offset applied to the abbreviation label (ITEM-L1-010). */
  readonly labelOffset?: LabelOffset;
  /**
   * References an imported image asset (DATA-JSON-007 `icon.importedAssetId`) held
   * in {@link ScheduleDocument.assets}. Present only when the item's glyph is an
   * imported (sanitized) SVG/PNG icon (ITEM-L1-008).
   */
  readonly importedAssetId?: string;
}

/** Discriminates the two importable image asset formats (ITEM-L1-008). */
export type ImportedAssetFormat = 'svg' | 'png';

/**
 * An imported image icon that has passed the import sanitizer (ARCH-C-026) and is
 * safe to embed. Held at document top level (DATA-JSON-013) so that
 * Export -> Import round-trips never lose an imported icon; items reference it by
 * id via {@link ScheduleItem.importedAssetId}.
 *
 * `sanitizedDataUri` is always a self-contained `data:` URI (base64), never an
 * external reference, so SVG export stays offline (NFR-L1-001).
 */
export interface ImportedAsset {
  /** Stable unique identifier referenced by ScheduleItem.importedAssetId. */
  readonly id: string;
  /** Source format of the sanitized asset. */
  readonly assetFormat: ImportedAssetFormat;
  /** Sanitized, self-contained `data:` URI (base64). */
  readonly sanitizedDataUri: string;
}

/** A horizontal band (ribbon) that carries multiple items (multi-bar). */
export interface Row {
  readonly id: string;
  readonly sectionId: string;
  /** Human-readable classification label (中分類) shown in the left pane. */
  readonly classificationLabel: string;
  /**
   * Optional leaf-level classification (小分類) shown further indented in the
   * left pane (SECT-L2-001 hierarchy by indentation, not columns).
   */
  readonly subClassificationLabel?: string;
  /** Ordering index within the owning section. */
  readonly order: number;
  /**
   * Derived-tree metadata set by {@link rebuildClassification}: the raw category
   * path components and this row's depth (0 major / 1 middle / 2 minor). Present
   * only on rows materialized from item categories; legacy/hand-built rows omit
   * them and are treated as non-collapsible by the vertical-LOD transform.
   */
  readonly majorLabel?: string;
  readonly middleLabel?: string;
  readonly minorLabel?: string;
  readonly depth?: 0 | 1 | 2;
}

/**
 * A DECLARED classification node persisted in the document (SECT editing rework).
 *
 * The left classification tree is otherwise DERIVED from items' categories, so a
 * branch with no items would vanish. A declared node is a user-created branch that
 * the tree renders even when EMPTY, so the user can add a section / track / detail
 * up front and create items into it afterwards. Its depth is implied by how many
 * of the three path components are set:
 *
 * - `{ major }`            -> a declared SECTION (大分類), always shown.
 * - `{ major, middle }`    -> a declared TRACK (中分類) under that section.
 * - `{ major, middle, minor }` -> a declared DETAIL (小分類) under that track.
 *
 * A `minor` without a `middle` is malformed and ignored by the reconciler (the UI
 * never produces it: a detail is only ever added under an existing track).
 */
export interface DeclaredCategory {
  /** The (required) section-level classification value. */
  readonly major: string;
  /** The track-level value, when this declares a track or detail. */
  readonly middle?: string;
  /** The detail-level value, when this declares a detail leaf. */
  readonly minor?: string;
}

/** A major grouping of rows (大分類). */
export interface Section {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly rowIds: readonly string[];
  /**
   * When true the section is hidden (collapsed): its rows are removed from
   * layout/render and it is offered for re-showing via a small tab
   * (SECT-L1-003/004). Absent is treated as visible (false).
   */
  readonly collapsed?: boolean;
}

/**
 * A 9-point anchor index on an item's bounding box, in the row-major order
 * defined by DEP-L1-002 (DATA-JSON-008 `fromAnchor`/`toAnchor` = 0..8):
 * 0 top_left, 1 top_center, 2 top_right, 3 middle_left, 4 center,
 * 5 middle_right, 6 bottom_left, 7 bottom_center, 8 bottom_right.
 */
export type AnchorIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * A directed dependency between two items (DEP-L1-001). The line is drawn from
 * `fromItemId`'s `fromAnchor` to `toItemId`'s `toAnchor`; `bends` caches the
 * elbow count the router last produced (0..3, DEP-L2-002).
 */
export interface Dependency {
  readonly id: string;
  readonly fromItemId: string;
  readonly fromAnchor: AnchorIndex;
  readonly toItemId: string;
  readonly toAnchor: AnchorIndex;
  /** Elbow count from the last route (0..3); advisory cache, recomputed on render. */
  readonly bends?: number;
}

/** Font scale steps (ARCH-C-007). */
export type FontScale = 'S' | 'M' | 'L';

/**
 * A UI locale code (ADR-008). The MVP ships English and Japanese; the resolver
 * (usecase/i18n.ts) falls back gracefully so adding a locale never breaks render.
 */
export type Locale = 'en' | 'ja';

/**
 * A multilingual VALUE map (PROP-L1-003, ADR-008, DATA-JSON-012). Keys are
 * BCP-47-ish locale codes; the value is the localized string. Property NAMES stay
 * English (PROP-L1-004) -- only user-visible VALUES/labels are localized. A plain
 * `string` is also accepted throughout (a non-localized literal value), so the
 * resolver takes `string | I18nValue`.
 */
export interface I18nValue {
  readonly en?: string;
  readonly ja?: string;
}

/**
 * The evidence watermark configuration (TOOL-L1-007, TOOL-L2-001/003,
 * DATA-JSON-010). `userName` is a locally entered, self-asserted name (NOT an
 * authenticated identity, security-design §6); `timestamp` is an ISO-8601 string.
 * When `enabled` is true the diagonal tiled watermark is drawn on the live canvas
 * AND embedded into SVG export so a shared/captured chart carries the mark.
 */
export interface Watermark {
  /** Visibility toggle (TOOL-L2-003); false leaves the chart unmarked. */
  readonly enabled: boolean;
  /** Local, self-asserted user name shown in the mark (TOOL-L2-001). */
  readonly userName: string;
  /** ISO-8601 generation timestamp shown in the mark (TOOL-L2-001). */
  readonly timestamp: string;
}

/**
 * View state driving rendering. zoomX (time axis) and zoomY (row axis) are
 * independent (anisotropic zoom, ADR-004). scrollX/scrollY are world-space
 * offsets in CSS pixels.
 */
export interface ViewState {
  /** Horizontal (time-axis) zoom multiplier. > 0. */
  readonly zoomX: number;
  /** Vertical (row-axis) zoom multiplier. > 0. */
  readonly zoomY: number;
  /** World-space horizontal scroll offset in pixels. */
  readonly scrollX: number;
  /** World-space vertical scroll offset in pixels. */
  readonly scrollY: number;
  /** Font size step. */
  readonly fontScale: FontScale;
  /**
   * Width in CSS pixels of the fixed left classification pane (CANVAS-L2-001).
   * User-resizable via the pane divider; absent falls back to a default.
   */
  readonly leftPaneWidth?: number;
  /**
   * Plan/actual display filter (PLAN-L1-002); absent is treated as `both`. Held
   * in view state (not the edit history) so switching the filter never pollutes
   * Undo/Redo.
   */
  readonly planActualDisplay?: PlanActualDisplay;
  /** Whether the today line is drawn (CURS-L1-001 / L1-004); absent is hidden. */
  readonly todayLineVisible?: boolean;
  /**
   * Whether the faint VERTICAL date gridlines are drawn (aligned to the current
   * LOD tick granularity). Default ON: absent is treated as visible, so legacy
   * documents show the grid. Held in view state so the toggle round-trips with the
   * document (JSON / autosave) without polluting Undo/Redo.
   */
  readonly gridDateLinesVisible?: boolean;
  /**
   * Whether the faint HORIZONTAL category boundary gridlines (middle / minor row
   * boundaries) are drawn. Default ON: absent is treated as visible.
   */
  readonly gridCategoryLinesVisible?: boolean;
  /** The dual measurement cursor (CURS-L1-002/003/004); absent means unused. */
  readonly dualCursor?: DualCursorState;
  /**
   * The pointer-following measurement-guide mode (CURS-L1-003, cursor-guide
   * rework). Absent is treated as `none` (off), matching the prior default. Held in
   * view state so the selected mode round-trips via JSON / autosave.
   */
  readonly cursorGuideMode?: CursorGuideMode;
  /**
   * The evidence watermark (TOOL-L1-007); absent means no watermark. Held in view
   * state so toggling it never pollutes Undo/Redo, yet still round-trips with the
   * document (serialized inside viewState by the JSON codec).
   */
  readonly watermark?: Watermark;
  /**
   * Active UI locale for value/label resolution (PROP-L1-003, ADR-008); absent is
   * treated as the default locale. Held in view state (a display concern, like
   * fontScale) so switching language is not an undoable edit.
   */
  readonly activeLocale?: Locale;
}

/** Root aggregate for the M1 skeleton. */
export interface ScheduleDocument {
  readonly schemaVersion: number;
  readonly title: string;
  /** Time-axis origin: dates map to x relative to this epoch. */
  readonly epochDate: IsoDate;
  readonly viewState: ViewState;
  readonly sections: readonly Section[];
  readonly rows: readonly Row[];
  readonly items: readonly ScheduleItem[];
  /**
   * User-declared classification branches shown even when they carry no items
   * (SECT editing rework). The left pane renders the UNION of these declared nodes
   * and the item-derived tree, so an added-but-empty section / track / detail stays
   * visible until the user creates items into it. Absent means none.
   */
  readonly declaredCategories?: readonly DeclaredCategory[];
  /** Directed dependencies between items (DEP-L1-001); absent means none. */
  readonly dependencies?: readonly Dependency[];
  /** Free canvas annotations: comments and rounded-box enclosures (ARCH-C-005). */
  readonly annotations?: readonly Annotation[];
  /**
   * Imported (sanitized) image icon assets (DATA-JSON-013). Referenced by
   * ScheduleItem.importedAssetId; embedded so JSON/MSPDI round-trips preserve
   * imported icons (IO-L1-001). Absent means none.
   */
  readonly assets?: readonly ImportedAsset[];
}

/** Pixel size of the drawing surface. */
export interface CanvasSize {
  readonly widthPx: number;
  readonly heightPx: number;
}
