/**
 * Deterministic sample-data generator for the demo and the benchmark harness.
 * Produces a mid-size ScheduleDocument whose left classification tree is DERIVED
 * from each item's three-level category (major / middle / minor). Items carry
 * varied depths so the template demonstrates all three tree levels:
 *
 * - some items with ONLY a major (section-level rows),
 * - some with a major + middle (track-level rows),
 * - some with a major + middle + minor (detail-level rows),
 *
 * and several items sharing one leaf so multi-bar rows are exercised. The tree is
 * materialized into rows/sections via {@link rebuildClassification}. NOT
 * production content -- purely a fixture.
 */

import type {
  Dependency,
  MilestoneShape,
  ScheduleDocument,
  ScheduleItem,
  Section,
  TaskShape,
} from '../domain/model/schedule-model.js';
import type { Annotation } from '../domain/model/annotation.js';
import { fromDayNumber, toDayNumber } from '../domain/usecase/time-coordinate-mapper.js';
import { rebuildClassification } from '../domain/usecase/classification-tree.js';
import { TRANSPARENT_COLOR_KEY } from '../domain/model/cud-palette.js';

/** Default row count for the mid-size fixture (NFR-L1-002 target ~50 rows). */
export const DEFAULT_ROW_COUNT = 50;

/**
 * Fixed project id for the starter TEMPLATE fixture, so the deterministic template
 * stays byte-stable across sessions and tests. The real app boundary
 * (`loadInitialDocument`) overrides this with a freshly minted UUID for a genuinely
 * new project.
 */
export const TEMPLATE_PROJECT_ID = '00000000-0000-4000-8000-000000000001';

/** Fixed project id for the mid-size deterministic BENCHMARK fixture. */
export const SAMPLE_PROJECT_ID = '00000000-0000-4000-8000-000000000002';

/**
 * A small, clean starter template shown on app startup (fix 6b). Unlike the
 * mid-size benchmark fixture, this is a curated set of a dozen items spread across
 * THREE sections (大分類) with a mix of track (中分類) and detail (小分類) rows, so
 * the left classification tree immediately shows a real multi-section / multi-track
 * / multi-detail hierarchy instead of collapsing everything onto the top row. It
 * also exercises a plan/actual pair, a couple of milestones, a rounded-box
 * enclosure, comments and a dependency.
 *
 * @param projectId - The project UUID to stamp on the document; defaults to the
 *   fixed {@link TEMPLATE_PROJECT_ID} so the fixture is deterministic. The app
 *   boundary passes a freshly minted UUID for a genuinely new project.
 * @returns A compact, fully derived ScheduleDocument suitable as the blank canvas.
 */
export function generateTemplateDocument(projectId: string = TEMPLATE_PROJECT_ID): ScheduleDocument {
  const epoch = toDayNumber(EPOCH_DATE);
  const day = (offset: number): string => fromDayNumber(epoch + offset);

  interface Seed {
    readonly id: string;
    readonly abbrev: string;
    readonly kind: ItemKindLocal;
    readonly startOffset: number;
    readonly durationDays: number;
    readonly major: string;
    readonly middle?: string;
    readonly minor?: string;
    readonly fill: string;
    readonly milestoneShape?: MilestoneShape;
    /** Actual (as-run) start offset from the epoch (CR-001 actual-date model). */
    readonly actualStartOffset?: number;
    /** Actual (as-run) end offset from the epoch; omit while still in progress. */
    readonly actualEndOffset?: number;
    /** Deadline / target-end offset from the epoch (CR-001 Part C). */
    readonly targetOffset?: number;
    readonly progressRatio?: number;
  }
  type ItemKindLocal = 'milestone' | 'task';

  // A CUD-friendly fill is stored per item. Plan vs actual is expressed by the
  // actual-date fields (actualStart/actualEnd) ON THE SAME ITEM (CR-001 actual-date
  // model), not by a discriminator flag or a paired "-Actual" item. Every seed carries
  // a valid { major, middle } category; select items also carry actual dates so the
  // fixture exercises Overlap rendering and the progress line.
  const PLAN_FILL = '#4477aa';
  // An Automotive SPICE (ASPICE) V-model project laid out from project start
  // (Kickoff, day 0) to SOS (Start Of Sales, ~2 years 10 months = day 1034), so
  // the ~3-year default timeline frames the whole programme. The two named
  // sections ("Over All Schedule" for programme-level phases/milestones and
  // "TeamA" for the ASPICE engineering tracks SYS.1-SYS.5 / SWE.1-SWE.6 plus
  // integration & validation) carry plan/actual pairs, milestones and gates. Day
  // offsets approximate months at ~30 days.
  const SOS_OFFSET_DAYS = 1034; // ~2 years 10 months to Start Of Sales.
  const seeds: readonly Seed[] = [
    // ===== Major "Over All Schedule" -- programme-level view =====
    // Middle "Milestones-Plan" -- programme gates / milestones. Completed gates carry
    // an actualStart marker (CR-001 actual-date model); SoP carries a targetDate
    // (deadline marker, CR-001 Part C).
    { id: 'oa-ms-plan-kickoff', abbrev: 'Kickoff', kind: 'milestone', startOffset: 0, durationDays: 0, major: 'Over All Schedule', middle: 'Milestones-Plan', fill: PLAN_FILL, milestoneShape: 'diamond', actualStartOffset: 4 },
    { id: 'oa-ms-plan-freeze', abbrev: 'Design Freeze', kind: 'milestone', startOffset: 430, durationDays: 0, major: 'Over All Schedule', middle: 'Milestones-Plan', fill: PLAN_FILL, milestoneShape: 'diamond', actualStartOffset: 448 },
    { id: 'oa-ms-plan-sop', abbrev: 'SoP', kind: 'milestone', startOffset: 970, durationDays: 0, major: 'Over All Schedule', middle: 'Milestones-Plan', fill: PLAN_FILL, milestoneShape: 'triangle', targetOffset: 960 },
    { id: 'oa-ms-plan-launch', abbrev: 'SOS', kind: 'milestone', startOffset: SOS_OFFSET_DAYS, durationDays: 0, major: 'Over All Schedule', middle: 'Milestones-Plan', fill: PLAN_FILL, milestoneShape: 'star' },
    // Middle "Phase-Plan" -- programme phase bars spanning the whole timeline. The
    // finished/running phases carry actual dates + a progress front.
    { id: 'oa-phase-plan-concept', abbrev: 'Concept', kind: 'task', startOffset: 0, durationDays: 120, major: 'Over All Schedule', middle: 'Phase-Plan', fill: PLAN_FILL, actualStartOffset: 4, actualEndOffset: 125, progressRatio: 1 },
    { id: 'oa-phase-plan-dev', abbrev: 'Series Development', kind: 'task', startOffset: 120, durationDays: 520, major: 'Over All Schedule', middle: 'Phase-Plan', fill: PLAN_FILL, actualStartOffset: 128, progressRatio: 0.55, targetOffset: 650 },
    { id: 'oa-phase-plan-valid', abbrev: 'Validation', kind: 'task', startOffset: 640, durationDays: 360, major: 'Over All Schedule', middle: 'Phase-Plan', fill: PLAN_FILL },
    { id: 'oa-phase-plan-rampup', abbrev: 'Ramp-Up', kind: 'task', startOffset: 1000, durationDays: 34, major: 'Over All Schedule', middle: 'Phase-Plan', fill: PLAN_FILL },
    // ===== Major "TeamA" -- ASPICE engineering tracks =====
    // Middle "Phase-Plan" -- the SYS.1..SWE.1 multi-bar showcase row. SYS1 carries
    // actual dates + a progress front.
    { id: 'ta-phase-plan-sys1', abbrev: 'SYS1', kind: 'task', startOffset: 0, durationDays: 40, major: 'TeamA', middle: 'Phase-Plan', fill: PLAN_FILL, actualStartOffset: 2, actualEndOffset: 45, progressRatio: 0.8 },
    { id: 'ta-phase-plan-sys2', abbrev: 'SYS2', kind: 'task', startOffset: 30, durationDays: 50, major: 'TeamA', middle: 'Phase-Plan', fill: PLAN_FILL },
    { id: 'ta-phase-plan-sys3', abbrev: 'SYS3', kind: 'task', startOffset: 70, durationDays: 50, major: 'TeamA', middle: 'Phase-Plan', fill: PLAN_FILL },
    { id: 'ta-phase-plan-swe1', abbrev: 'SWE1', kind: 'task', startOffset: 50, durationDays: 110, major: 'TeamA', middle: 'Phase-Plan', fill: PLAN_FILL },
    // Middle "SYS-Phase-Plan" -- the later system-engineering ASPICE phases
    // (SYS.4 system integration test, SYS.5 system qualification test).
    { id: 'ta-sysphase-plan-sys4', abbrev: 'SYS.4', kind: 'task', startOffset: 120, durationDays: 200, major: 'TeamA', middle: 'SYS-Phase-Plan', fill: PLAN_FILL },
    { id: 'ta-sysphase-plan-sys5', abbrev: 'SYS.5', kind: 'task', startOffset: 880, durationDays: 120, major: 'TeamA', middle: 'SYS-Phase-Plan', fill: PLAN_FILL },
    // Middle "SWE-Phase-Plan" -- the software-engineering ASPICE phases SWE.2..SWE.6.
    // SWE.2 carries actual dates + a progress front.
    { id: 'ta-swephase-plan-swe2', abbrev: 'SWE.2', kind: 'task', startOffset: 200, durationDays: 230, major: 'TeamA', middle: 'SWE-Phase-Plan', fill: PLAN_FILL, actualStartOffset: 205, progressRatio: 0.5 },
    { id: 'ta-swephase-plan-swe3', abbrev: 'SWE.3', kind: 'task', startOffset: 320, durationDays: 240, major: 'TeamA', middle: 'SWE-Phase-Plan', fill: PLAN_FILL },
    { id: 'ta-swephase-plan-swe4', abbrev: 'SWE.4', kind: 'task', startOffset: 430, durationDays: 250, major: 'TeamA', middle: 'SWE-Phase-Plan', fill: PLAN_FILL },
    { id: 'ta-swephase-plan-swe5', abbrev: 'SWE.5', kind: 'task', startOffset: 620, durationDays: 200, major: 'TeamA', middle: 'SWE-Phase-Plan', fill: PLAN_FILL },
    { id: 'ta-swephase-plan-swe6', abbrev: 'SWE.6', kind: 'task', startOffset: 760, durationDays: 140, major: 'TeamA', middle: 'SWE-Phase-Plan', fill: PLAN_FILL },
    // Middle "Integration-Plan" -- SW/system integration and vehicle validation.
    { id: 'ta-int-plan-swint', abbrev: 'SW Integration', kind: 'task', startOffset: 760, durationDays: 120, major: 'TeamA', middle: 'Integration-Plan', fill: PLAN_FILL },
    { id: 'ta-int-plan-sysint', abbrev: 'System Integration', kind: 'task', startOffset: 860, durationDays: 100, major: 'TeamA', middle: 'Integration-Plan', fill: PLAN_FILL },
    { id: 'ta-int-plan-vehicle', abbrev: 'Vehicle Validation', kind: 'task', startOffset: 940, durationDays: 94, major: 'TeamA', middle: 'Integration-Plan', fill: PLAN_FILL },
    // Middle "Task-Plan" -- early requirement tasks (spellings fixed: Actual /
    // Clarify). Minor (小分類) sub-levels demonstrate the full three-level tree.
    { id: 'ta-task-plan-orient', abbrev: 'Orientation', kind: 'task', startOffset: 0, durationDays: 10, major: 'TeamA', middle: 'Task-Plan', minor: 'Onboarding', fill: PLAN_FILL, actualStartOffset: 0, actualEndOffset: 12, progressRatio: 1 },
    { id: 'ta-task-plan-clarify-stk', abbrev: 'Clarify Stakeholders', kind: 'task', startOffset: 8, durationDays: 17, major: 'TeamA', middle: 'Task-Plan', minor: 'Requirements', fill: PLAN_FILL },
    { id: 'ta-task-plan-gather', abbrev: 'Gather Request', kind: 'task', startOffset: 20, durationDays: 25, major: 'TeamA', middle: 'Task-Plan', minor: 'Requirements', fill: PLAN_FILL },
    { id: 'ta-task-plan-clarify-uc', abbrev: 'Clarify Usecase', kind: 'task', startOffset: 40, durationDays: 30, major: 'TeamA', middle: 'Task-Plan', minor: 'Usecase', fill: PLAN_FILL },
  ];

  const items: ScheduleItem[] = seeds.map((seed) => {
    const base = {
      id: seed.id,
      rowId: 'pending',
      startDate: day(seed.startOffset),
      abbrev: seed.abbrev,
      importance: 1,
      fillColor: seed.fill,
      // No border by default (item: items have NO stroke unless one is set
      // explicitly); a transparent stroke renders as `stroke="none"`.
      strokeColor: TRANSPARENT_COLOR_KEY,
      majorCategory: seed.major,
      ...(seed.middle !== undefined ? { middleCategory: seed.middle } : {}),
      ...(seed.minor !== undefined ? { minorCategory: seed.minor } : {}),
      ...(seed.actualStartOffset !== undefined ? { actualStart: day(seed.actualStartOffset) } : {}),
      ...(seed.actualEndOffset !== undefined ? { actualEnd: day(seed.actualEndOffset) } : {}),
      ...(seed.targetOffset !== undefined ? { targetDate: day(seed.targetOffset) } : {}),
      ...(seed.progressRatio !== undefined ? { progressRatio: seed.progressRatio } : {}),
    };
    if (seed.kind === 'milestone') {
      return {
        ...base,
        itemKind: 'milestone',
        endDate: null,
        milestoneShape: seed.milestoneShape ?? 'diamond',
      };
    }
    return {
      ...base,
      itemKind: 'task',
      endDate: day(seed.startOffset + seed.durationDays),
      taskShape: 'bar',
    };
  });

  const sections: Section[] = ['Over All Schedule', 'TeamA'].map((name, index) => ({
    id: `section-${index}`,
    name,
    order: index,
    rowIds: [],
    collapsed: false,
  }));

  const annotations: Annotation[] = [
    {
      id: 'tpl-note',
      annotationKind: 'callout-box',
      text: 'core build',
      anchorDate: day(45),
      anchorRowIndex: 2,
      bodyOffsetPx: { dx: 48, dy: -34 },
    },
  ];

  const dependencies: Dependency[] = [
    // Finish-to-start with a 10-day lag (procurement wait) between Concept and Dev
    // (CR-001 Part C linkType / signed lagDays).
    { id: 'tpl-dep-concept-dev', fromItemId: 'oa-phase-plan-concept', fromAnchor: 5, toItemId: 'oa-phase-plan-dev', toAnchor: 3, linkType: 'FS', lagDays: 10 },
    { id: 'tpl-dep-dev-valid', fromItemId: 'oa-phase-plan-dev', fromAnchor: 5, toItemId: 'oa-phase-plan-valid', toAnchor: 3 },
    // Start-to-start with a 5-day lead (fast-tracking) inside the SYS multi-bar row.
    { id: 'tpl-dep-sys1-sys2', fromItemId: 'ta-phase-plan-sys1', fromAnchor: 5, toItemId: 'ta-phase-plan-sys2', toAnchor: 3, linkType: 'SS', lagDays: -5 },
    { id: 'tpl-dep-sys3-swe1', fromItemId: 'ta-phase-plan-sys3', fromAnchor: 5, toItemId: 'ta-phase-plan-swe1', toAnchor: 3 },
  ];

  const rawDocument: ScheduleDocument = {
    projectId,
    schemaVersion: 2,
    title: 'gr-scheduler template',
    epochDate: EPOCH_DATE,
    viewState: {
      zoomX: 1,
      zoomY: 1,
      scrollX: 0,
      scrollY: 0,
      fontScale: 'M',
      leftPaneWidth: 200,
      planActualDisplay: 'both',
      planActualStyle: 'overlap',
      todayLineVisible: true,
      gridDateLinesVisible: true,
      gridCategoryLinesVisible: true,
    },
    sections,
    rows: [],
    items,
    dependencies,
    annotations,
  };
  return rebuildClassification(rawDocument);
}

/**
 * Build a fresh, EMPTY schedule document (SHELL file-ops "All Clear"). No items,
 * dependencies or annotations; the classification tree is re-derived from the (now
 * empty) item set by {@link rebuildClassification}, leaving a clean editable canvas.
 *
 * @param projectId - The project id for the new document (mint a fresh UUID).
 * @returns An empty, ready-to-edit ScheduleDocument.
 */
export function generateEmptyDocument(projectId: string = TEMPLATE_PROJECT_ID): ScheduleDocument {
  const sections: Section[] = [];
  const rawDocument: ScheduleDocument = {
    projectId,
    schemaVersion: 2,
    title: 'gr-scheduler',
    epochDate: EPOCH_DATE,
    viewState: {
      zoomX: 1,
      zoomY: 1,
      scrollX: 0,
      scrollY: 0,
      fontScale: 'M',
      leftPaneWidth: 200,
      planActualDisplay: 'both',
      planActualStyle: 'overlap',
      todayLineVisible: true,
      gridDateLinesVisible: true,
      gridCategoryLinesVisible: true,
    },
    sections,
    rows: [],
    items: [],
    dependencies: [],
    annotations: [],
  };
  return rebuildClassification(rawDocument);
}

/** Default item count for the benchmark (NFR-L1-002 target ~1000 items). */
export const DEFAULT_ITEM_COUNT = 1000;

const EPOCH_DATE = '2026-01-01';

/** CUD-friendly palette subset for the fixture (final palette is PROP-owned). */
const FILL_COLORS = ['#4477aa', '#66ccee', '#228833', '#ccbb44', '#ee6677', '#aa3377'];
const MILESTONE_SHAPES: MilestoneShape[] = ['circle', 'triangle', 'square', 'diamond', 'star'];
const TASK_SHAPES: TaskShape[] = ['bar', 'arrow', 'chevron'];

/**
 * Small deterministic pseudo-random generator (mulberry32) so benchmark runs
 * are reproducible across sessions.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A three-level classification path assignable to an item. */
interface CategoryPath {
  readonly majorCategory: string;
  readonly middleCategory?: string;
  readonly minorCategory?: string;
}

/**
 * The classification path for a synthetic "row bucket" so the derived tree has a
 * clean 3-level shape: the first bucket in each section is a bare major, the
 * second a dedicated middle track, and the rest are distinct minor leaves under a
 * shared middle track.
 */
function pathForBucket(sectionIndex: number, positionInSection: number, bucketIndex: number): CategoryPath {
  const major = `Phase ${sectionIndex + 1}`;
  if (positionInSection === 0) {
    return { majorCategory: major };
  }
  if (positionInSection === 1) {
    return { majorCategory: major, middleCategory: `Track ${sectionIndex + 1}-A` };
  }
  return {
    majorCategory: major,
    middleCategory: `Track ${sectionIndex + 1}-B`,
    minorCategory: `Detail ${bucketIndex + 1}`,
  };
}

/**
 * Generate a mid-size schedule document with a derived 3-level classification
 * tree.
 *
 * @param itemCount - Number of items to distribute across the leaf buckets.
 * @param rowCount - Approximate number of leaf buckets (defaults to ~50).
 * @param projectId - The project UUID to stamp on the document; defaults to the
 *   fixed {@link SAMPLE_PROJECT_ID} so the benchmark fixture stays deterministic.
 * @returns A fully formed ScheduleDocument fixture.
 */
export function generateSampleDocument(
  itemCount: number = DEFAULT_ITEM_COUNT,
  rowCount: number = DEFAULT_ROW_COUNT,
  projectId: string = SAMPLE_PROJECT_ID,
): ScheduleDocument {
  const random = createSeededRandom(0x9e3779b1);
  const epochDayNumber = toDayNumber(EPOCH_DATE);

  const sectionCount = Math.max(1, Math.round(rowCount / 8));
  const bucketsPerSection = Math.ceil(rowCount / sectionCount);

  // Precompute one category path per leaf bucket so a distinct tree is derived.
  const bucketPaths: CategoryPath[] = [];
  for (let bucketIndex = 0; bucketIndex < rowCount; bucketIndex += 1) {
    const sectionIndex = Math.min(sectionCount - 1, Math.floor(bucketIndex / bucketsPerSection));
    const positionInSection = bucketIndex - sectionIndex * bucketsPerSection;
    bucketPaths.push(pathForBucket(sectionIndex, positionInSection, bucketIndex));
  }

  // Seed sections (major carriers) in Phase order so reorder / collapse keep a
  // stable id + order; rebuildClassification fills their rowIds from the items.
  const seededSections: Section[] = [];
  for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
    seededSections.push({
      id: `section-${sectionIndex}`,
      name: `Phase ${sectionIndex + 1}`,
      order: sectionIndex,
      rowIds: [],
      collapsed: false,
    });
  }

  const items: ScheduleItem[] = [];

  // M4 showcase FIRST (document order) so its detail rows lead Phase 1 (indices
  // 0..showcaseRowCount-1), which the box/comment annotations enclose. Each row is
  // a plan/actual pair on ONE leaf, exercising multi-bar.
  const showcaseRowCount = Math.min(6, rowCount);
  for (let rowIndex = 0; rowIndex < showcaseRowCount; rowIndex += 1) {
    const planStart = epochDayNumber + 150 + rowIndex * 4;
    const planEnd = planStart + 30;
    const showcasePath: CategoryPath = {
      majorCategory: 'Phase 1',
      middleCategory: 'Showcase',
      minorCategory: `Plan Row ${rowIndex + 1}`,
    };
    // CR-001 actual-date model: ONE item carries both the planned span
    // (startDate/endDate) and the actual dates (actualStart/actualEnd) + a progress
    // front, so the showcase row exercises Overlap rendering and the progress line.
    const actualStart = planStart + (rowIndex % 3);
    const actualEnd = planEnd + (rowIndex % 3 === 0 ? 12 : -6);
    items.push({
      id: `plan-${rowIndex}`,
      rowId: 'pending',
      itemKind: 'task',
      startDate: fromDayNumber(planStart),
      endDate: fromDayNumber(planEnd),
      abbrev: `P${rowIndex}`,
      importance: 1,
      taskShape: 'bar',
      fillColor: '#4477aa',
      strokeColor: TRANSPARENT_COLOR_KEY,
      actualStart: fromDayNumber(actualStart),
      actualEnd: fromDayNumber(Math.max(actualStart + 1, actualEnd)),
      progressRatio: 0.3 + (rowIndex % 4) * 0.2,
      ...showcasePath,
    });
  }

  for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
    const bucketIndex = Math.floor(random() * rowCount);
    const path = bucketPaths[bucketIndex] ?? { majorCategory: 'Phase 1' };
    const startOffsetDays = Math.floor(random() * 720);
    const isMilestone = random() < 0.25;
    const durationDays = isMilestone ? 0 : 1 + Math.floor(random() * 45);
    const startDate = fromDayNumber(epochDayNumber + startOffsetDays);
    const endDate = isMilestone
      ? null
      : fromDayNumber(epochDayNumber + startOffsetDays + durationDays);

    const fillColor = FILL_COLORS[itemIndex % FILL_COLORS.length] ?? '#4477aa';
    items.push({
      id: `item-${itemIndex}`,
      rowId: 'pending',
      itemKind: isMilestone ? 'milestone' : 'task',
      startDate,
      endDate,
      abbrev: `${isMilestone ? 'M' : 'T'}${itemIndex}`,
      importance: Math.round(random() * 100) / 100,
      ...(isMilestone
        ? { milestoneShape: MILESTONE_SHAPES[itemIndex % MILESTONE_SHAPES.length] as MilestoneShape }
        : { taskShape: TASK_SHAPES[itemIndex % TASK_SHAPES.length] as TaskShape }),
      fillColor,
      strokeColor: TRANSPARENT_COLOR_KEY,
      ...path,
    });
  }

  // A rounded-box enclosure over the showcase region (stays within Phase 1) and
  // one comment of each kind (CURS-L1-005/006/007).
  const annotations: Annotation[] = [
    {
      id: 'box-showcase',
      annotationKind: 'rounded-box',
      startDate: fromDayNumber(epochDayNumber + 140),
      endDate: fromDayNumber(epochDayNumber + 210),
      topRowIndex: 0,
      bottomRowIndex: Math.max(0, showcaseRowCount - 1),
      strokeColor: '#cc3311',
      cornerRadiusPx: 10,
    },
    {
      id: 'comment-callout',
      annotationKind: 'callout-box',
      text: 'review here',
      anchorDate: fromDayNumber(epochDayNumber + 165),
      anchorRowIndex: 0,
      bodyOffsetPx: { dx: 40, dy: -34 },
    },
    {
      id: 'comment-polyline',
      annotationKind: 'polyline',
      text: 'delayed row',
      anchorDate: fromDayNumber(epochDayNumber + 175),
      anchorRowIndex: 2,
      bodyOffsetPx: { dx: 60, dy: 30 },
    },
  ];

  // A few deterministic demo dependencies between existing low-index items.
  const dependencies: Dependency[] = [];
  const depPairs: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 2],
    [3, 5],
  ];
  for (const [fromIndex, toIndex] of depPairs) {
    if (fromIndex < itemCount && toIndex < itemCount) {
      dependencies.push({
        id: `dep-sample-${fromIndex}-${toIndex}`,
        fromItemId: `item-${fromIndex}`,
        fromAnchor: 7,
        toItemId: `item-${toIndex}`,
        toAnchor: 1,
      });
    }
  }

  const rawDocument: ScheduleDocument = {
    projectId,
    schemaVersion: 2,
    title: `gr-scheduler sample (${rowCount} rows / ${itemCount} items)`,
    epochDate: EPOCH_DATE,
    viewState: {
      zoomX: 1,
      zoomY: 1,
      scrollX: 0,
      scrollY: 0,
      fontScale: 'M',
      leftPaneWidth: 200,
      planActualDisplay: 'both',
      planActualStyle: 'overlap',
      todayLineVisible: true,
      dualCursor: {
        primary: { atDate: fromDayNumber(epochDayNumber + 160), mode: 'vertical-line' },
        secondary: { atDate: fromDayNumber(epochDayNumber + 190), mode: 'crosshair' },
        visible: true,
      },
    },
    sections: seededSections,
    rows: [],
    items,
    dependencies,
    annotations,
  };

  // Materialize the derived classification tree (sections / rows / rowId).
  return rebuildClassification(rawDocument);
}
