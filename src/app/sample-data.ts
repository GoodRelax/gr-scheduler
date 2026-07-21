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
import { DEFAULT_WATERMARK_HIDE_PASSWORD_HASH } from '../domain/model/schedule-model.js';
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
 * The curated starter template shown on app startup. It reproduces the user's
 * hand-authored `old/gr-scheduler-template.json` content in the CURRENT data model:
 * an Automotive SPICE (ASPICE) programme that runs from project start (Kickoff,
 * 2026-01-01) to SOS (Start Of Sales, 2028-10-31), framed across a ~3-year timeline.
 *
 * Plan and actual are kept as SEPARATE items on SEPARATE rows (KEEP-AS-IS): the blue
 * plan items live on the `*-Plan` tracks and the red actual items on the paired
 * `*-Actual` tracks, so the chart renders exactly like the original template. The
 * left classification tree (2 sections / 13 rows) is DERIVED from each item's
 * major / middle / minor category via {@link rebuildClassification}; item dates are
 * the user's curated absolute values, preserved verbatim.
 *
 * @param projectId - The project UUID to stamp on the document; defaults to the
 *   fixed {@link TEMPLATE_PROJECT_ID} so the fixture is deterministic. The app
 *   boundary passes a freshly minted UUID for a genuinely new project.
 * @returns A fully derived ScheduleDocument suitable as the default startup document.
 */
export function generateTemplateDocument(projectId: string = TEMPLATE_PROJECT_ID): ScheduleDocument {
  interface Seed {
    readonly id: string;
    readonly abbrev: string;
    readonly kind: ItemKindLocal;
    /** Curated absolute start date (ISO-8601), preserved verbatim from the template. */
    readonly startDate: string;
    /** Curated absolute end date; null for a milestone. */
    readonly endDate: string | null;
    readonly major: string;
    readonly middle: string;
    readonly minor?: string;
    readonly fill: string;
    readonly milestoneShape?: MilestoneShape;
    /** Left-edge day taper (business hand-over cross-fade). */
    readonly fadeInDays?: number;
    /** Right-edge day taper. */
    readonly fadeOutDays?: number;
    /** Progress front fraction in [0, 1] (present on actual items). */
    readonly progressRatio?: number;
    /** Optional owner name shown left of the glyph when the assignee column is on. */
    readonly assignee?: string;
  }
  type ItemKindLocal = 'milestone' | 'task';

  // Blue = plan, red = actual: the two hues the original template used to distinguish
  // the plan rows from the paired actual rows (KEEP-AS-IS -- no plan/actual merge).
  const PLAN_FILL = '#4477aa';
  const ACTUAL_FILL = '#ee6677';

  // Items in DOCUMENT ORDER so each track's first appearance materializes the 13-row
  // tree in the intended order:
  //   Over All Schedule -> Milestones-Plan, Milestones-Actual, Phase-Plan, Phase-Actual
  //   TeamA -> Phase-Plan, Phase-Actual, SYS-Phase-Plan, SWE-Phase-Plan,
  //            SWE-Phase-Actual, Integration-Plan, Task-Plan{Onboarding,Requirements,Usecase}
  const seeds: readonly Seed[] = [
    // ===== Major "Over All Schedule" =====
    // Middle "Milestones-Plan" -- programme gates (blue).
    { id: 'oa-ms-plan-kickoff', abbrev: 'Kickoff', kind: 'milestone', startDate: '2026-01-01', endDate: null, major: 'Over All Schedule', middle: 'Milestones-Plan', fill: PLAN_FILL, milestoneShape: 'diamond' },
    { id: 'oa-ms-plan-freeze', abbrev: 'Design Freeze', kind: 'milestone', startDate: '2027-03-07', endDate: null, major: 'Over All Schedule', middle: 'Milestones-Plan', fill: PLAN_FILL, milestoneShape: 'diamond' },
    { id: 'oa-ms-plan-sop', abbrev: 'SoP', kind: 'milestone', startDate: '2028-08-28', endDate: null, major: 'Over All Schedule', middle: 'Milestones-Plan', fill: PLAN_FILL, milestoneShape: 'triangle' },
    { id: 'oa-ms-plan-launch', abbrev: 'SOS', kind: 'milestone', startDate: '2028-10-31', endDate: null, major: 'Over All Schedule', middle: 'Milestones-Plan', fill: PLAN_FILL, milestoneShape: 'star' },
    // Middle "Milestones-Actual" -- the as-run gates (red).
    { id: 'oa-ms-actual-kickoff', abbrev: 'Kickoff', kind: 'milestone', startDate: '2026-01-05', endDate: null, major: 'Over All Schedule', middle: 'Milestones-Actual', fill: ACTUAL_FILL, milestoneShape: 'diamond' },
    { id: 'oa-ms-actual-freeze', abbrev: 'Design Freeze', kind: 'milestone', startDate: '2027-03-25', endDate: null, major: 'Over All Schedule', middle: 'Milestones-Actual', fill: ACTUAL_FILL, milestoneShape: 'diamond' },
    // Middle "Phase-Plan" -- programme phase bars (blue).
    { id: 'oa-phase-plan-concept', abbrev: 'Concept', kind: 'task', startDate: '2026-01-01', endDate: '2026-05-01', major: 'Over All Schedule', middle: 'Phase-Plan', fill: PLAN_FILL },
    { id: 'oa-phase-plan-dev', abbrev: 'Series Development', kind: 'task', startDate: '2026-05-01', endDate: '2027-10-03', major: 'Over All Schedule', middle: 'Phase-Plan', fill: PLAN_FILL },
    { id: 'oa-phase-plan-valid', abbrev: 'Validation', kind: 'task', startDate: '2027-10-03', endDate: '2028-09-27', major: 'Over All Schedule', middle: 'Phase-Plan', fill: PLAN_FILL },
    { id: 'oa-phase-plan-rampup', abbrev: 'Ramp-Up', kind: 'task', startDate: '2028-09-27', endDate: '2029-03-15', major: 'Over All Schedule', middle: 'Phase-Plan', fill: PLAN_FILL, fadeInDays: 27, fadeOutDays: 0 },
    // Middle "Phase-Actual" -- the as-run phase bars (red) with a progress front.
    { id: 'oa-phase-actual-concept', abbrev: 'Concept', kind: 'task', startDate: '2026-01-05', endDate: '2026-05-06', major: 'Over All Schedule', middle: 'Phase-Actual', fill: ACTUAL_FILL, progressRatio: 1 },
    { id: 'oa-phase-actual-dev', abbrev: 'Series Development', kind: 'task', startDate: '2026-05-09', endDate: '2027-05-16', major: 'Over All Schedule', middle: 'Phase-Actual', fill: ACTUAL_FILL, progressRatio: 0.55 },
    // ===== Major "TeamA" =====
    // Middle "Phase-Plan" -- the SYS1..SWE1 multi-bar showcase row (blue).
    { id: 'ta-phase-plan-sys1', abbrev: 'SYS1', kind: 'task', startDate: '2025-12-30', endDate: '2026-02-08', major: 'TeamA', middle: 'Phase-Plan', fill: PLAN_FILL, fadeOutDays: 9, assignee: 'Suzuki' },
    { id: 'ta-phase-plan-sys2', abbrev: 'SYS2', kind: 'task', startDate: '2026-01-31', endDate: '2026-03-22', major: 'TeamA', middle: 'Phase-Plan', fill: PLAN_FILL, fadeInDays: 11, assignee: 'Saotome' },
    { id: 'ta-phase-plan-sys3', abbrev: 'SYS3', kind: 'task', startDate: '2026-03-12', endDate: '2026-05-01', major: 'TeamA', middle: 'Phase-Plan', fill: PLAN_FILL, assignee: 'Sato' },
    { id: 'ta-phase-plan-swe1', abbrev: 'SWE1', kind: 'task', startDate: '2026-02-28', endDate: '2026-06-18', major: 'TeamA', middle: 'Phase-Plan', fill: PLAN_FILL, assignee: 'Tanaka' },
    // Middle "Phase-Actual" -- the as-run SYS1 bar (red) with a progress front.
    { id: 'ta-phase-actual-sys1', abbrev: 'SYS1', kind: 'task', startDate: '2026-01-03', endDate: '2026-02-15', major: 'TeamA', middle: 'Phase-Actual', fill: ACTUAL_FILL, progressRatio: 0.8 },
    // Middle "SYS-Phase-Plan" -- later system-engineering ASPICE phases (blue).
    { id: 'ta-sysphase-plan-sys4', abbrev: 'SYS.4', kind: 'task', startDate: '2026-05-01', endDate: '2026-11-17', major: 'TeamA', middle: 'SYS-Phase-Plan', fill: PLAN_FILL },
    { id: 'ta-sysphase-plan-sys5', abbrev: 'SYS.5', kind: 'task', startDate: '2028-05-30', endDate: '2028-09-27', major: 'TeamA', middle: 'SYS-Phase-Plan', fill: PLAN_FILL },
    // Middle "SWE-Phase-Plan" -- software-engineering ASPICE phases SWE.2..SWE.6 (blue).
    { id: 'ta-swephase-plan-swe2', abbrev: 'SWE.2', kind: 'task', startDate: '2026-07-20', endDate: '2027-03-07', major: 'TeamA', middle: 'SWE-Phase-Plan', fill: PLAN_FILL },
    { id: 'ta-swephase-plan-swe3', abbrev: 'SWE.3', kind: 'task', startDate: '2026-11-17', endDate: '2027-07-15', major: 'TeamA', middle: 'SWE-Phase-Plan', fill: PLAN_FILL },
    { id: 'ta-swephase-plan-swe4', abbrev: 'SWE.4', kind: 'task', startDate: '2027-03-07', endDate: '2027-11-12', major: 'TeamA', middle: 'SWE-Phase-Plan', fill: PLAN_FILL },
    { id: 'ta-swephase-plan-swe5', abbrev: 'SWE.5', kind: 'task', startDate: '2027-09-13', endDate: '2028-03-31', major: 'TeamA', middle: 'SWE-Phase-Plan', fill: PLAN_FILL },
    { id: 'ta-swephase-plan-swe6', abbrev: 'SWE.6', kind: 'task', startDate: '2028-01-31', endDate: '2028-06-19', major: 'TeamA', middle: 'SWE-Phase-Plan', fill: PLAN_FILL },
    // Middle "SWE-Phase-Actual" -- the as-run SWE.2 bar (red) with a progress front.
    { id: 'ta-swephase-actual-swe2', abbrev: 'SWE.2', kind: 'task', startDate: '2026-07-25', endDate: '2027-03-07', major: 'TeamA', middle: 'SWE-Phase-Actual', fill: ACTUAL_FILL, progressRatio: 0.5 },
    // Middle "Integration-Plan" -- SW/system integration and vehicle validation (blue).
    { id: 'ta-int-plan-swint', abbrev: 'SW Integration', kind: 'task', startDate: '2028-01-31', endDate: '2028-05-30', major: 'TeamA', middle: 'Integration-Plan', fill: PLAN_FILL },
    { id: 'ta-int-plan-sysint', abbrev: 'System Integration', kind: 'task', startDate: '2028-05-10', endDate: '2028-08-18', major: 'TeamA', middle: 'Integration-Plan', fill: PLAN_FILL },
    { id: 'ta-int-plan-vehicle', abbrev: 'Vehicle Validation', kind: 'task', startDate: '2028-07-29', endDate: '2028-10-31', major: 'TeamA', middle: 'Integration-Plan', fill: PLAN_FILL },
    // Middle "Task-Plan" -- early requirement tasks under minor (小分類) sub-levels,
    // demonstrating the full three-level tree.
    { id: 'ta-task-plan-orient', abbrev: 'Orientation', kind: 'task', startDate: '2026-01-01', endDate: '2026-01-11', major: 'TeamA', middle: 'Task-Plan', minor: 'Onboarding', fill: PLAN_FILL },
    { id: 'ta-task-plan-clarify-stk', abbrev: 'Clarify Stakeholders', kind: 'task', startDate: '2026-01-09', endDate: '2026-01-26', major: 'TeamA', middle: 'Task-Plan', minor: 'Requirements', fill: PLAN_FILL },
    { id: 'ta-task-plan-gather', abbrev: 'Gather Request', kind: 'task', startDate: '2026-01-21', endDate: '2026-02-15', major: 'TeamA', middle: 'Task-Plan', minor: 'Requirements', fill: PLAN_FILL },
    { id: 'ta-task-plan-clarify-uc', abbrev: 'Clarify Usecase', kind: 'task', startDate: '2026-02-10', endDate: '2026-03-12', major: 'TeamA', middle: 'Task-Plan', minor: 'Usecase', fill: PLAN_FILL },
  ];

  const items: ScheduleItem[] = seeds.map((seed) => {
    const base = {
      id: seed.id,
      rowId: 'pending',
      startDate: seed.startDate,
      abbrev: seed.abbrev,
      importance: 1,
      fillColor: seed.fill,
      // No border by default; a transparent stroke renders as `stroke="none"`.
      strokeColor: TRANSPARENT_COLOR_KEY,
      majorCategory: seed.major,
      middleCategory: seed.middle,
      ...(seed.minor !== undefined ? { minorCategory: seed.minor } : {}),
      ...(seed.fadeInDays !== undefined ? { fadeInDays: seed.fadeInDays } : {}),
      ...(seed.fadeOutDays !== undefined ? { fadeOutDays: seed.fadeOutDays } : {}),
      ...(seed.progressRatio !== undefined ? { progressRatio: seed.progressRatio } : {}),
      ...(seed.assignee !== undefined ? { assignee: seed.assignee } : {}),
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
      endDate: seed.endDate,
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
      anchorDate: '2026-02-15',
      anchorRowIndex: 2,
      bodyOffsetPx: { dx: 48, dy: -34 },
    },
  ];

  const dependencies: Dependency[] = [
    { id: 'tpl-dep-concept-dev', fromItemId: 'oa-phase-plan-concept', fromAnchor: 5, toItemId: 'oa-phase-plan-dev', toAnchor: 3 },
    { id: 'tpl-dep-dev-valid', fromItemId: 'oa-phase-plan-dev', fromAnchor: 5, toItemId: 'oa-phase-plan-valid', toAnchor: 3 },
    { id: 'tpl-dep-sys1-sys2', fromItemId: 'ta-phase-plan-sys1', fromAnchor: 5, toItemId: 'ta-phase-plan-sys2', toAnchor: 3 },
    { id: 'tpl-dep-sys3-swe1', fromItemId: 'ta-phase-plan-sys3', fromAnchor: 5, toItemId: 'ta-phase-plan-swe1', toAnchor: 3 },
  ];

  const rawDocument: ScheduleDocument = {
    projectId,
    schemaVersion: 2,
    title: 'gr-scheduler template',
    epochDate: EPOCH_DATE,
    viewState: {
      zoomX: 0.14868791475294058,
      zoomY: 1.1043942854708473,
      scrollX: -40,
      scrollY: 0,
      fontScale: 'L',
      leftPaneWidth: 200,
      planActualDisplay: 'both',
      planActualStyle: 'overlap',
      todayLineVisible: true,
      // CR-006 Part 5: the progress line now defaults to HIDDEN, but the demo template
      // opts in explicitly so the illuminated line still appears out of the box.
      progressLineVisible: true,
      gridDateLinesVisible: true,
      gridCategoryLinesVisible: true,
      themePreference: 'light',
      watermark: {
        enabled: true,
        userName: 'GoodRelax',
        timestamp: '',
        hideHash: DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
      },
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
      // CR-006 Part 5: opt the benchmark/sample document into the (now default-hidden)
      // progress line so its illuminated line stays visible.
      progressLineVisible: true,
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
