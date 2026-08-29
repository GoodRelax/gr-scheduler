// What grabbing the LEFT end of an actual bar does to the other end -- the
// second column the user ruled into GR-5 of 表 T-023d on 2026-08-29 -- and the
// row that deliberately does NOT follow it, GR-15.
//
// The unit driven is UF-48 `frame-loop.ts` (CP-25 of table T-062), which takes
// FT-1 of table T-078 on `receiveInput` and answers what the document says on
// `document()`. The release is read where it LANDS, on the document, because
// the row is about which columns move and not about which `DocumentCommand`
// carried them.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⭐ WHY THIS FILE EXISTS BESIDE tests/unit/t-023d-follows-the-pointer.test.ts.
// That file has a GR-5 case, and it asks one thing: that `actualStart` moved.
// The ruling of 2026-08-29 is about the column it does NOT ask about -- the
// actual FINISH, which must stand still while `actualDuration` is laid down
// again. Nothing in tests/ measured that column on this road, which is why
// changing it broke no case.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: the body that wrote a
// unit does not write its test; what may be read is the head comment, the
// published types and the signatures.)
//
// Exported declarations read, and nothing else:
//   frame-loop.ts        `FrameEnvironment`, `FrameValues`, `FrameLoop`,
//                        `ScreenWiring`, and the one signature
//                        `frameLoop(surface, first, env, screen?, ...)`
//   schedule-geometry.ts `Point`, `BarGeometry`, `TaskGeometry`
//   schedule-layout.ts   `ScheduleLayout` (`pxPerDay`), `dateAtX`
//   schedule.ts          `CalendarDay`, `dayOf`, `textOfDay`, `compareDays`,
//                        `isWorkingDay`, `workingCalendarOf`,
//                        `workingDaysBetween`, `dateFromWorkingDays`, and the
//                        entity types this fixture writes out
//   document-settings.ts `SETTINGS_DEFAULTS`, which is GENERATED from
//                        `_assets/tbl-settings.md` -- S-130 is read out of it
//                        rather than typed here
// ⚠️ THREE LINES OF BODY WERE SEEN AND ARE DECLARED RATHER THAN CLAIMED AWAY:
// the first lines of `workingDaysBetween`, `dateFromWorkingDays` and
// `nextWorkingDay` came into view while their signatures were being read. ⭐
// THAT SET NO EXPECTED VALUE. Where the manuscript settles a worked-day figure
// it is ALSO written out as a literal derived by hand from the fixture's own
// calendar (see 「HOW THE EXPECTED VALUES WERE OBTAINED」), so a calendar that
// miscounted would fail these cases rather than agree with them.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-023d GR-5   「実績の開始点 | 実績バーの左端 | `actualStart` を変える。
//           実績の終了日は据え置き、`actualDuration` を置き直すこと（MUST）
//           （利用者の裁定 2026-08-29）。⛔ 実績バーを平行移動させてはならない
//           （MUST NOT）—— `FR-011` が「人が置いていない限り両端を動かさない
//           こと（MUST NOT）」と定めており、人が置いたのは左端 1 つである。
//           ⭐ 置き直しは `GR-6` の「置いた日付から稼働日数を算出する」と同じ
//           算術を、始点の側から行うものである —— 新しい算術を起こさない。
//           ⚠️ 本表でただ 1 行、2 つの列を変える行である —— それを承知の裁定
//           である」
//   T-023d GR-6   「実績の終了点 | 実績バーの右端 | `actualDuration` を変える
//           （置いた日付から稼働日数を算出する）」 -- the arithmetic GR-5 says
//           it reuses.
//   T-023d GR-15  「実績のマイルストーン | 実績の図形の上 | `actualStart` を
//           動かす。マイルストーンは実績バーを持たないので `GR-5` / `GR-6` /
//           `GR-17` に当たらない」 -- and GR-5's own 「本表でただ 1 行、2 つの
//           列を変える行である」 is what makes that ONE column and not two.
//   T-023d  ⛔「掴んだ端点を置いた日を、稼働日へ寄せてはならない（MUST NOT）
//           —— 休日に働くことがあり、寄せると人が置いた日と違う日が入る」
//   T-023d  「上の行ほど優先すること（MUST）」 -- why the fixture keeps the
//           actual ends days away from the plan ends (GR-3 / GR-4 outrank
//           GR-5 / GR-6).
//   FR-011  「実績バーの左端を `actualStart`、右端を `actualStart` に
//           `actualDuration` を稼働日で加えた日とし、人が置いていない限り両端を
//           動かさないこと（MUST NOT）」 -- the definition of 「実績の終了日」
//           these cases measure.
//   FR-043 / S-130  a milestone's actual is a point: 「実績期間は `S-130` と
//           すること（MUST）」, 「点なので長さを持たない」.
//   T-019 / T-019a  PA-2 進行中 -- the state the plain fixture Task is in, and
//           the state it stays in.
//   T-028 IN-1   「ポインタ操作は……離した時点で確定する」.
//   FR-054  the calendar the worked days are counted on.
//
// ---------------------------------------------------------------------------
// HOW THE EXPECTED VALUES WERE OBTAINED
// ---------------------------------------------------------------------------
// The fixture's calendar is the shipped template's: Monday to Friday working,
// and its seven exception rows all fall in December 2026 or later, so April
// 2026 is an unbroken run of five-day weeks. April 2026 begins on a Wednesday,
// which makes 6/13/20 Mondays and 4, 5, 11, 12, 18, 19 the weekend days.
//
// The plain Task's actual is `actualStart` = Thu 2026-04-09 and
// `actualDuration` = 4 worked days, so FR-011 puts its right end on
//   Fri 10 (1), Mon 13 (2), Tue 14 (3), Wed 15 (4)  ->  2026-04-15.
// Dragging the left end one day to the LEFT lands on Wed 2026-04-08, and
// holding the end at Wed 15 costs
//   Thu 9 (1), Fri 10 (2), Mon 13 (3), Tue 14 (4), Wed 15 (5) -> 5 worked days.
// Dragging it two days to the RIGHT lands on Sat 2026-04-11, a non-working day
// on purpose (⛔ 稼働日へ寄せてはならない).
//
// ⚠️ THAT LAST ONE IS NOT GIVEN A FIGURE, AND THE REASON IS THE MANUSCRIPT'S.
// FR-011 says the right end is 「`actualStart` に `actualDuration` を稼働日で
// 加えた日」, and when the START is a non-working day the two honest readings of
// 「稼働日で加えた」 differ by one: counting the worked days the bar covers, and
// counting steps from the first working day at or after the start. Nothing in
// docs/spec picks between them. So the rightward cases assert what the row
// itself settles -- that the end did not move, and that the length is GR-6's
// arithmetic read from the start side -- and the figure 5 is asserted only
// where both readings agree.
// Every figure below is also asserted as a RELATION -- the right end FR-011
// computes before the drag against the one it computes after -- so a case says
// both what the day is and that it did not move.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - Which `DocumentCommand` the release plans. Table T-108 gives CM-13
//     `setTaskPlanActualState` 「予実の 5 列を置く」, but the row is about the
//     columns, and tests/unit/edit-task.test.ts owns the command.
//   - The picture while the pointer is held (the third closing rule of table
//     T-023d). tests/unit/t-023d-follows-the-pointer.test.ts owns it.
//   - That `actualStart` moves at all under GR-5 and GR-15. That is the case
//     the file above already has; what is added here is the OTHER end.
//   - GR-6, GR-9, GR-17 and GR-18. GR-5 borrows GR-6's arithmetic, so GR-6's
//     own road is quoted but not driven.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  compareDays,
  dateFromWorkingDays,
  dayOf,
  isWorkingDay,
  textOfDay,
  workingCalendarOf,
  workingDaysBetween,
  type CalendarDay,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
import type {
  BarGeometry,
  Point,
  TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { dateAtX } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

// ===========================================================================
// The two rows, read out of the manuscript rather than copied
// ===========================================================================

const T_023D = specTable('T-023d')

const OPERATION_COLUMN = ((): string => {
  const found = T_023D.headings.find((heading) => heading.includes('操作'))
  if (found === undefined) throw new Error('table T-023d has no 操作 column')
  return found
})()

const operationOf = (row: string): string => {
  const found = T_023D.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-023d has no row ${row}`)
  return found.by[OPERATION_COLUMN] ?? ''
}

const GR_5 = operationOf('GR-5')
const GR_6 = operationOf('GR-6')
const GR_15 = operationOf('GR-15')

// ===========================================================================
// The document these cases drive
// ===========================================================================

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of. The calendar,
// the project and the settings come from it; the rows and the Tasks are written
// out here so that every day counted can be named.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const ROW_A = '4a000000-0000-4000-8000-000000000001'
const ROW_B = '4a000000-0000-4000-8000-000000000002'

/** The Task GR-5 is grabbed on -- PA-2 進行中 of table T-019. */
const PLAIN_UID = 1
/** The milestone GR-15 is grabbed on. */
const MILESTONE_UID = 2

/** A day of April 2026, as a stored date column writes it. */
const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

/** The day part of a stored date, which sorts the way the calendar runs. */
const dayPart = (value: string | null): string => {
  if (value === null) throw new Error('the column this case reads holds nothing')
  return value.slice(0, 10)
}

const PLAIN_START = day(6) // Mon
const PLAIN_FINISH = day(24) // Fri
const PLAIN_ACTUAL_START = day(9) // Thu
/** In WORKING days -- `actualDuration` is counted in them (FR-011). */
const PLAIN_ACTUAL_DURATION = 4

const MILESTONE_DAY = day(13) // Mon
const MILESTONE_ACTUAL_START = day(17) // Fri

/**
 * `S-130`, read from the generated defaults rather than typed. FR-043 (MUST):
 * 「マイルストーンは……実績期間は `S-130` とすること」, and S-130's own remark is
 * 「点なので長さを持たない」.
 */
const MILESTONE_ACTUAL_DURATION = ((): number => {
  const value = SETTINGS_DEFAULTS['milestoneActualDuration']
  if (typeof value !== 'number') throw new Error('S-130 is not a number')
  return value
})()

/** 1 day is this many px at zoom 1 -- S-1's key, set wide so a day is legible. */
const PX_PER_DAY_AT_1X = 20

function task(over: Partial<Task> & { readonly uid: number }): Task {
  return {
    wbsParentUid: null,
    wbsOrder: over.uid,
    name: null,
    start: null,
    finish: null,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...over,
  } as unknown as Task
}

const group = (id: string, order: number, label: string): unknown => ({
  id,
  parentId: null,
  label,
  derivedFromTaskUid: null,
  order,
  isCollapsed: false,
  isHidden: false,
  color: null,
  height: null,
})

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        // ⭐ Cleared: a Status Line drawn across these rows would be one more
        // thing to press past, and GR-16 is not this file's subject.
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        // ⚠️ `actualStart` is deliberately THREE days after `start` and the
        // actual end well inside the plan end: the table prefers GR-3 and GR-4
        // to GR-5 and GR-6, so ends standing on the same day would leave the
        // actual pair unreachable and these cases would measure the plan twice.
        task({
          uid: PLAIN_UID,
          name: 'Alpha',
          start: PLAIN_START,
          finish: PLAIN_FINISH,
          actualStart: PLAIN_ACTUAL_START,
          actualDuration: PLAIN_ACTUAL_DURATION,
          resumeValid: true,
          percentComplete: 25,
        }),
        // 「マイルストーンは実績バーを持たないので `GR-5` / `GR-6` / `GR-17` に
        // 当たらない」. Its actual stands on another day so the plan figure and
        // the actual figure do not overlap.
        task({
          uid: MILESTONE_UID,
          name: 'Beta',
          start: MILESTONE_DAY,
          finish: MILESTONE_DAY,
          milestone: true,
          actualStart: MILESTONE_ACTUAL_START,
          actualDuration: MILESTONE_ACTUAL_DURATION,
          resumeValid: true,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [group(ROW_A, 0, 'A'), group(ROW_B, 1, 'B')],
      taskGroupMembers: [
        { taskUid: PLAIN_UID, groupId: ROW_A, stackOrder: null },
        { taskUid: MILESTONE_UID, groupId: ROW_B, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      pxPerDayAt1x: PX_PER_DAY_AT_1X,
      // ⭐ S-77 and S-78 are PINNED, and that is what keeps the axis still.
      // OP-10 of table T-024a sends a null place to FR-055's fit, and the fit
      // measures what is DRAWN -- so a document that stored no place would
      // re-fit itself the moment a bar changed length, and a case measuring
      // pixels before and against after would be measuring the fit.
      scrollDate: day(1),
      scrollGroupId: ROW_A,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  return draft as unknown as Document
}

// ===========================================================================
// FR-011's own arithmetic, on the fixture's own calendar
// ===========================================================================

const CALENDAR = workingCalendarOf(fixtureDocument().schedule)

const dayValue = (text: string): CalendarDay => {
  const value = dayOf(text)
  if (value === null) throw new Error(`${text} is not a day`)
  return value
}

/**
 * FR-011: 「実績バーの……右端を `actualStart` に `actualDuration` を稼働日で加えた
 * 日とし」. This is the 「実績の終了日」 GR-5 says stands still.
 */
const actualEndOf = (task: Task): string =>
  dayPart(
    textOfDay(
      dateFromWorkingDays(
        CALENDAR,
        dayValue(task.actualStart as string),
        task.actualDuration as number,
      ),
    ),
  )

// ===========================================================================
// The host UF-48 is given
// ===========================================================================

/** BO-1 of table T-077 has already settled these by the time a loop exists. */
const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 700,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of table T-060 puts the browser
 * in this layer. ⛔ Nothing in this fake decides anything: it drains the queue.
 * Copied, unchanged, from tests/unit/t-023d-follows-the-pointer.test.ts.
 */
function host(): {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
} {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

/** A stand-in for IF-9's surface that has drawn no UI part over the schedule. */
function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  return { surface, language }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// ===========================================================================
// Spelling one happening
// ===========================================================================

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

// ===========================================================================
// A loop, drawn and ready
// ===========================================================================

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
}

function stage(): Stage {
  const pen = host()
  const loop = frameLoop(pen.surface as any, fixtureDocument(), SCREEN, screenPane())
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  // The first frame is owed by the loop being made (BO-5 of table T-077), so
  // drain it before any case reads `current()`.
  pen.runAnimationFrames()
  return { loop, send }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const taskOf = (loop: FrameLoop, uid: number): Task => {
  const found = loop.document().schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`the document has no Task ${uid}`)
  return found
}

/** How wide one calendar day is drawn -- the frame's own measurement of itself. */
const pxPerDay = (loop: FrameLoop): number => frameOf(loop).layout.pxPerDay

const drawnTask = (loop: FrameLoop, uid: number): TaskGeometry => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not in this frame`)
  return found
}

interface Box {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

/** The bounding box of one drawn bar, whichever of table T-012's two forms. */
function boxOfBar(bar: BarGeometry | null, what: string): Box {
  if (bar === null) throw new Error(`${what} is not drawn`)
  const points: readonly Point[] =
    bar.form === 'outline'
      ? bar.points
      : [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((one) => one.at)]
  if (points.length === 0) throw new Error(`${what} came out with no points`)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

const midY = (box: Box): number => (box.y0 + box.y1) / 2
const midX = (box: Box): number => (box.x0 + box.x1) / 2

const planBox = (loop: FrameLoop, uid: number): Box =>
  boxOfBar(drawnTask(loop, uid).plan, `Task ${uid}'s plan bar`)
const actualBox = (loop: FrameLoop, uid: number): Box =>
  boxOfBar(drawnTask(loop, uid).actual, `Task ${uid}'s actual figure`)

/** The day the frame itself says stands under an x. */
const dayUnder = (loop: FrameLoop, x: number): string => {
  const found = dateAtX(frameOf(loop).layout, x)
  if (found === null) throw new Error('the frame drew no time axis under that point')
  return dayPart(textOfDay(found))
}

/**
 * One gesture: press at a point, move, release -- IN-1 of table T-028 settles
 * it on the release.
 *
 * ⭐ THE RELEASE LANDS INSIDE A DAY, not on its edge. The press point comes off
 * a drawn edge, which is a day boundary; a release exactly `days` widths along
 * would be a boundary too, and a boundary is the one x where a rounding either
 * way changes the answer. Four tenths of a day past it is inside the day
 * whether the reading floors or rounds. ⚠️ Which day that is is never assumed:
 * every case asks the frame (`dayUnder`).
 */
function dragBy(built: Stage, at: Point, days: number): void {
  const width = pxPerDay(built.loop)
  const to = at.x + days * width + 0.4 * width
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('move', to, at.y))
  built.send(pointer('up', to, at.y))
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('表 T-023d -- the rows this file is driven by', () => {
  it('GR-5 still says the actual finish stands still and the duration is laid down again (MUST)', () => {
    expect(GR_5).toContain('`actualStart` を変える')
    expect(GR_5).toContain('実績の終了日は据え置き')
    expect(GR_5).toContain('`actualDuration` を置き直すこと（MUST）')
  })

  it('GR-5 still forbids moving the actual bar bodily (MUST NOT)', () => {
    expect(GR_5).toContain('実績バーを平行移動させてはならない（MUST NOT）')
  })

  it('GR-5 still says it is the ONE row of the table that changes two columns', () => {
    // ⭐ The sentence the GR-15 cases below stand on: every other row of table
    // T-023d changes exactly one column, GR-15 included.
    expect(GR_5).toContain('本表でただ 1 行、2 つの列を変える行である')
  })

  it('GR-5 still borrows GR-6 arithmetic rather than raising its own', () => {
    expect(GR_5).toContain('`GR-6` の「置いた日付から稼働日数を算出する」と同じ算術')
    expect(GR_6).toContain('置いた日付から稼働日数を算出する')
  })

  it('GR-15 still moves `actualStart` and still says a milestone has no actual bar', () => {
    expect(GR_15).toContain('`actualStart` を動かす')
    expect(GR_15).toContain('マイルストーンは実績バーを持たない')
    expect(GR_15).toContain('`GR-5`')
  })
})

describe('the fixture these cases stand on', () => {
  it('is a `GRS JSON` document', () => {
    const report = validateDocument(fixtureDocument())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('runs on a calendar that works Monday to Friday through the days these cases use', () => {
    // The hand derivation in the head of this file rests on exactly this.
    const working: Record<string, boolean> = {}
    for (let d = 6; d <= 24; d += 1) working[day(d).slice(0, 10)] = isWorkingDay(CALENDAR, dayValue(day(d)))
    expect(working['2026-04-08']).toBe(true) // Wed
    expect(working['2026-04-09']).toBe(true) // Thu
    expect(working['2026-04-10']).toBe(true) // Fri
    expect(working['2026-04-11']).toBe(false) // Sat
    expect(working['2026-04-12']).toBe(false) // Sun
    expect(working['2026-04-13']).toBe(true) // Mon
    expect(working['2026-04-15']).toBe(true) // Wed
  })

  it("puts the plain Task's actual bar three days inside its plan bar, so GR-3 cannot outrank GR-5", () => {
    // 「上の行ほど優先すること（MUST）」: GR-3 (the plan start) stands above GR-5,
    // and the two would collide if the fixture put them on the same day.
    const built = stage()
    const gap = actualBox(built.loop, PLAIN_UID).x0 - planBox(built.loop, PLAIN_UID).x0
    expect(gap).toBeGreaterThan(2 * pxPerDay(built.loop))
    expect(dayUnder(built.loop, actualBox(built.loop, PLAIN_UID).x0 + 0.4 * pxPerDay(built.loop))).toBe(
      dayPart(PLAIN_ACTUAL_START),
    )
  })

  it('starts the plain Task at 進行中 (PA-2), with the actual end FR-011 computes', () => {
    const built = stage()
    const before = taskOf(built.loop, PLAIN_UID)
    expect(before.actualFinish).toBeNull()
    expect(before.resume).toBeNull()
    // The hand derivation: Thu 9 + 4 worked days = Fri 10, Mon 13, Tue 14, Wed 15.
    expect(actualEndOf(before)).toBe('2026-04-15')
  })

  it("gives the milestone the actual duration S-130, which is what makes it a point", () => {
    const built = stage()
    expect(taskOf(built.loop, MILESTONE_UID).actualDuration).toBe(MILESTONE_ACTUAL_DURATION)
    expect(MILESTONE_ACTUAL_DURATION).toBe(0)
  })
})

// ===========================================================================
// GR-5: 「実績の終了日は据え置き、`actualDuration` を置き直すこと（MUST）」
// ===========================================================================

describe('表 T-023d GR-5 -- grabbing the actual bar left end', () => {
  it('leaves the actual finish exactly where it was, dragged to the right', () => {
    const built = stage()
    const before = taskOf(built.loop, PLAIN_UID)
    const endBefore = actualEndOf(before)

    dragBy(built, { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }, 2)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(dayPart(after.actualStart), 'the end this case moved').not.toBe(dayPart(before.actualStart))
    expect(actualEndOf(after), 'GR-5 (MUST): 実績の終了日は据え置き').toBe(endBefore)
    expect(actualEndOf(after)).toBe('2026-04-15')
  })

  it('lays `actualDuration` down again rather than carrying it, dragged to the right', () => {
    const built = stage()
    const before = taskOf(built.loop, PLAIN_UID)

    dragBy(built, { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }, 2)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(dayPart(after.actualStart)).toBe('2026-04-11')
    // ⛔ A bar moved bodily would have kept the four worked days it came in
    // with and carried its right end along; the row forbids exactly that.
    expect(after.actualDuration, 'GR-5 (MUST NOT): 実績バーを平行移動させてはならない').not.toBe(
      before.actualDuration,
    )
    // ⚠️ NO FIGURE IS NAMED HERE ON PURPOSE. This release lands on a Saturday,
    // and FR-011's 「`actualStart` に `actualDuration` を稼働日で加えた日」 does
    // not settle how a span that BEGINS on a non-working day is counted -- the
    // two readings differ by one. What the row does settle is that the length
    // was laid down again to hold the end, and that is what is asserted; the
    // case that names a figure is the leftward one below, which begins on a
    // working day and reads the same either way.
    expect(after.actualDuration, 'GR-5 (MUST): `actualDuration` を置き直すこと').toBe(
      workingDaysBetween(
        CALENDAR,
        dayValue(dayPart(after.actualStart)),
        dayValue(actualEndOf(before)),
      ),
    )
  })

  it('does the same from the other side, dragged to the left', () => {
    const built = stage()
    const before = taskOf(built.loop, PLAIN_UID)
    const endBefore = actualEndOf(before)

    dragBy(built, { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }, -1)

    const after = taskOf(built.loop, PLAIN_UID)
    // Wed 8 -> Wed 15: Thu 9 (1), Fri 10 (2), Mon 13 (3), Tue 14 (4), Wed 15
    // (5). ⭐ The start is a working day here, so both readings of 「稼働日で
    // 加えた」 answer five and the figure can be named.
    expect(dayPart(after.actualStart)).toBe('2026-04-08')
    expect(after.actualDuration, 'GR-5 (MUST): `actualDuration` を置き直すこと').toBe(5)
    expect(actualEndOf(after), 'GR-5 (MUST): 実績の終了日は据え置き').toBe(endBefore)
  })

  it('settles `actualStart` on the day the pointer was let go on, and does not shift it to a working day', () => {
    // ⛔「掴んだ端点を置いた日を、稼働日へ寄せてはならない（MUST NOT）—— 休日に
    // 働くことがあり、寄せると人が置いた日と違う日が入る」. The release above
    // lands on Sat 2026-04-11, which this calendar does not work.
    const built = stage()
    const at = { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }
    const width = pxPerDay(built.loop)
    const released = dayUnder(built.loop, at.x + 2 * width + 0.4 * width)

    dragBy(built, at, 2)

    expect(isWorkingDay(CALENDAR, dayValue(released)), 'the case really lands on a non-working day').toBe(
      false,
    )
    expect(dayPart(taskOf(built.loop, PLAIN_UID).actualStart)).toBe(released)
  })

  it('lays the same length down that GR-6 arithmetic would, counted from the start side', () => {
    // 「置き直しは `GR-6` の「置いた日付から稼働日数を算出する」と同じ算術を、
    // 始点の側から行うものである —— 新しい算術を起こさない」.
    const built = stage()
    const endBefore = actualEndOf(taskOf(built.loop, PLAIN_UID))

    dragBy(built, { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }, 2)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(after.actualDuration).toBe(
      workingDaysBetween(CALENDAR, dayValue(dayPart(after.actualStart)), dayValue(endBefore)),
    )
  })

  it('moves no plan date and no other actual column (FR-011)', () => {
    const built = stage()
    const before = structuredClone(taskOf(built.loop, PLAIN_UID))

    dragBy(built, { x: actualBox(built.loop, PLAIN_UID).x0, y: midY(actualBox(built.loop, PLAIN_UID)) }, 2)

    const after = taskOf(built.loop, PLAIN_UID)
    expect(after.start).toBe(before.start)
    expect(after.finish).toBe(before.finish)
    expect(after.actualFinish).toBe(before.actualFinish)
    expect(after.resume).toBe(before.resume)
  })

  it('draws the right end of the actual bar in the same place afterwards', () => {
    // The same MUST, read off the picture instead of the columns: nothing about
    // the axis moved during the drag, so an end that stood still in days stands
    // still in pixels.
    const built = stage()
    const width = pxPerDay(built.loop)
    const before = actualBox(built.loop, PLAIN_UID)

    dragBy(built, { x: before.x0, y: midY(before) }, 2)

    const after = actualBox(built.loop, PLAIN_UID)
    expect(after.x1, 'GR-5 (MUST): 実績の終了日は据え置き').toBeCloseTo(before.x1, 6)
    // ⛔ A bodily move would have carried the right end along by the same two
    // days the left end travelled.
    expect(after.x0 - before.x0).toBeCloseTo(2 * width, 6)
  })
})

// ===========================================================================
// GR-15: the row that deliberately still CARRIES its length
// ===========================================================================

describe('表 T-023d GR-15 -- grabbing a milestone actual figure', () => {
  it('carries `actualDuration` unchanged, because GR-5 is the only row that changes two columns', () => {
    // 「マイルストーンは実績バーを持たないので `GR-5` / `GR-6` / `GR-17` に当たら
    // ない」, and GR-5's own 「本表でただ 1 行、2 つの列を変える行である」 leaves
    // GR-15 with one column: `actualStart`.
    // ⛔ HAD GR-5's RULE REACHED HERE, the length would have grown to hold the
    // figure's day still -- which for a point is a length it must not have
    // (S-130: 「点なので長さを持たない」).
    const built = stage()
    const before = taskOf(built.loop, MILESTONE_UID)

    dragBy(
      built,
      { x: midX(actualBox(built.loop, MILESTONE_UID)), y: midY(actualBox(built.loop, MILESTONE_UID)) },
      3,
    )

    const after = taskOf(built.loop, MILESTONE_UID)
    expect(dayPart(after.actualStart), 'GR-15: `actualStart` を動かす').not.toBe(
      dayPart(before.actualStart),
    )
    expect(after.actualDuration, 'GR-15 changes one column, not two').toBe(
      MILESTONE_ACTUAL_DURATION,
    )
  })

  it('moves the whole figure -- its day is the day the pointer was let go on', () => {
    const built = stage()
    const at = {
      x: midX(actualBox(built.loop, MILESTONE_UID)),
      y: midY(actualBox(built.loop, MILESTONE_UID)),
    }
    const width = pxPerDay(built.loop)
    const released = dayUnder(built.loop, at.x + 3 * width + 0.4 * width)

    dragBy(built, at, 3)

    expect(dayPart(taskOf(built.loop, MILESTONE_UID).actualStart)).toBe(released)
  })

  it('leaves the plan milestone where it stands (FR-011)', () => {
    const built = stage()
    const before = structuredClone(taskOf(built.loop, MILESTONE_UID))

    dragBy(
      built,
      { x: midX(actualBox(built.loop, MILESTONE_UID)), y: midY(actualBox(built.loop, MILESTONE_UID)) },
      3,
    )

    const after = taskOf(built.loop, MILESTONE_UID)
    expect(after.start).toBe(before.start)
    expect(after.finish).toBe(before.finish)
    expect(after.milestone).toBe(true)
    expect(compareDays(dayValue(dayPart(after.start)), dayValue(dayPart(after.actualStart)))).toBeLessThan(
      0,
    )
  })
})
