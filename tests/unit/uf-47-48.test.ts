// Unit tests for UF-47 `single-html-shell.ts` and UF-48 `frame-loop.ts`
// (table T-075 of docs/spec/05-07-design.md).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ Written from docs/spec alone. `docs/development-rules/04-verification.md`
// §1 forbids the author of a unit from writing its tests, so nothing below was
// derived from the body of either unit -- only from the requirements, and from
// the declarations UF-48 publishes (`FrameEnvironment`, `FrameValues`,
// `FrameLoop`, `frameLoop`).
//
// ⚠️ UF-47 is the entry Vite reads. It publishes nothing (`export {}`) and boots
// against `window` and `document` the moment it is imported, so under vitest's
// node environment (vitest.config.ts) there is no host for it to boot into and
// nothing here imports it. Table T-077's BO-2 -- the order of table T-034,
// which FR-062 and FR-027 state -- is `chooseStartupDocument` (UF-23) and is
// driven by tests/unit/uf-23.test.ts; UF-48 receives the winner as its `first`
// argument, so BO-2 is out of reach from this file.
//
// ⚠️ `requestAnimationFrame` does not exist under node. Every case installs its
// own, so a frame runs when this file says it runs and never otherwise.
//
// ⭐ THE MANUSCRIPT MOVED, AND THIS FILE FOLLOWED IT -- NOT THE OTHER WAY ROUND.
// Table T-230 of Chapter 5.4 (「まるごと差し替えるときの呼び手ごとの扱い」) was
// written after the first draft of this file, and it says of every whole-document
// replacement:
//
//   「呼び手は、自分がどの行かを名乗ること（MUST）。名乗らない差し替えを受け付け
//     てはならない（MUST NOT）」
//
// and of the one row this loop may stand in:
//
//   | RD-6 | 起動時の文書 | 呼び手が持って来る | 空にする | 入ってきたまま | 積まない | `FR-062` ／ 表 T-034 |
//
// ⚠️ ONE ROW, NOT TWO, SINCE CR-280. 「自動保存」 was taken out of the
// specification in as many words, and RD-5 「自動保存からの復帰」 left the table
// with it -- so 「呼び手が持って来る」 now names a single row, and every case
// below that hands over a whole document stands in it.
//
// ⛔ SO THE CASES BELOW THAT HAND OVER A WHOLE DOCUMENT NAME THEIR ROW, AND
// THE HISTORY THEY EXPECT AFTERWARDS IS THE TABLE'S 履歴 COLUMN AND NOT WHAT THE
// LOOP USED TO DO. An expectation was not bent to the code: the specification
// grew a column, and the column says the previous history does not survive a
// replacement. The describe 「表 T-230」 near the foot of this file is where that
// column is read out of the .md and driven.
// ⚠️ NOT ASSERTED HERE: 「名乗らない差し替え」. `HeldDocumentCall` narrows the
// argument to the rows above, so a nameless call cannot be written in typed
// code, and the MUST NOT itself is driven on the road it binds --
// tests/unit/uf-8-9-replace-document.test.ts, which owns `replaceDocument`
// (PI-8). ⚠️ Also not asserted here: the four rows this member does not offer.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  compareDays,
  dayOf,
  planActualState,
  textOfDay,
  type CalendarDay,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
import {
  rulerWeekdayWords,
  type DisplayLanguage,
  type ScreenSurface,
  type ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type {
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type HeldDocumentCall,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { validateDocument } from '../fixtures/grs-document'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// the copy of a table from the .md at read time, which is what keeps table
// T-230's 履歴 column below from falling behind the manuscript (Chapter 1.9
// :275 -- a test of a requirement that points at a table is driven by the
// table).
import { specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The document under test
// ---------------------------------------------------------------------------

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of. It is the
// one document the specification has actually decided the values of, so the
// cases below build on it rather than inventing a second idea of what a
// document looks like (the reason tests/fixtures/grs-document.ts gives for
// holding no sample).
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

/** UUIDs for the two rows the small document draws. */
const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'
/** A `TaskGroup.id` no row carries -- OP-10's "指す行が存在しない". */
const GONE = '99999999-9999-4999-8999-999999999999'

const FIRST_START = '2026-04-01'

/**
 * An actual that begins after its Task's plan has already finished, which is
 * the half of OC-5 (table T-038) a late start produces; FR-084 is where that
 * overhang is drawn. Long enough that the actual bar ends beyond every plan bar
 * in the document, short enough that no Task drops under the LOD floor (S-86).
 */
const LATE_ACTUAL_START = '2026-04-20'
const LATE_ACTUAL_WORKED_DAYS = 20

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Two rows, one Task on each, so what table T-068 draws can be named row by
 * row. The calendar (IV-7 / IV-17), the project and the 97 settings are the
 * ones the specification decided, so those are taken from the template; the
 * rows, the Tasks and whatever the case overrides are written out here.
 *
 * IV-1 (uids and ids unique), IV-2 (every reference resolves), IV-6 (each Task
 * named by exactly one member), IV-8 (every row has a label), IV-10 (finish is
 * not before start) all hold by construction, and `validateDocument` below
 * keeps the shape honest.
 *
 * ⚠️ What is NOT "by construction" is what the template holds. The two premises
 * every case below stands on -- a Task with no actual, and settings with no
 * stored place -- are pinned by the cases at the head of this file, so a
 * template that stops meeting them fails there and says which one it broke.
 */
function twoRowDocument(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  /**
   * ⛔ Every column table T-058 gives a Task (AT-24 .. AT-44) is named here.
   *
   * ⚠️ This used to spread `template.schedule.tasks[0]` and override only the
   * fields a case cared about, which made all the others an unstated dependency
   * on the bundled document: when that Task stopped being a milestone with no
   * actual and became the overview roll-up, carrying an `actualStart` and a
   * three-figure `actualDuration`, both Tasks here silently grew an actual bar
   * hundreds of working days long. FR-055 fits the drawn extent and OC-5 of
   * table T-038 counts an actual that runs outside its plan, so the fit shrank
   * until both Tasks fell under the task LOD floor (S-86) and neither was
   * drawn -- with nothing in the file saying an actual was ever involved.
   *
   * ⭐ Naming the columns cannot fail that way again, and the check is a
   * machine's: the schema `validateDocument` runs requires all of them and sets
   * `additionalProperties` false, so a dropped column and a stray one both come
   * back named. ⚠️ The `Task` return type is for the reader and the editor
   * only -- `tsc --noEmit` includes `src`, not `tests`, so it never sees this
   * file.
   *
   * ⭐ No actual at all is what these cases mean by a Task: PS-1 of table
   * T-019a, a Task nobody has started. Nothing below measures an actual bar, a
   * progress marker or a resume icon; the one case that wants an actual builds
   * it through `edit`.
   */
  const task = (uid: number, start: string, finish: string, name: string): Task => ({
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name,
    start,
    finish,
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
  })
  const row = (id: string, parentId: string | null, label: string) => ({
    id,
    parentId,
    label,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: false,
    isHidden: false,
    color: null,
    height: null,
  })
  const draft = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100 },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [task(1, FIRST_START, '2026-04-10', 'One'), task(2, '2026-04-06', '2026-04-20', 'Two')],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, 'Alpha'), row(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: 1, groupId: ALPHA, stackOrder: null },
        { taskUid: 2, groupId: BETA, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  edit(draft)
  return draft as unknown as Document
}

const settingsOf = (document: Document): any => (document as any).documentSettings
const rowsOf = (document: Document): any[] => (document as any).schedule.taskGroups

// ---------------------------------------------------------------------------
// Table T-230, read out of the manuscript rather than copied
// ---------------------------------------------------------------------------

const T_230 = specTable('T-230')

const headingWith = (needle: string): string => {
  const found = T_230.headings.find((heading) => heading.includes(needle))
  if (found === undefined) throw new Error(`table T-230 has no column mentioning ${needle}`)
  return found
}

/** The four columns these cases read, by the table's own heading text. */
const COL_WS3 = headingWith('WS-3')
const COL_HISTORY = headingWith('履歴')
const COL_STAMP = headingWith('刻印')
const COL_UNDO_STEP = headingWith('取り消し')

const cellOf = (row: string, column: string): string => {
  const found = T_230.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-230 has no row ${row}`)
  return found.by[column] ?? ''
}

/**
 * The rows whose `WS-3` column says the caller brings the document, taken from
 * the table itself.
 *
 * ⭐ NOT A LIST OF ROW IDS TYPED HERE. `HeldDocumentCall` is declared as
 * exactly these rows, so a manuscript that moved another caller into 「呼び手
 * が持って来る」 has to reach this file rather than slide past it.
 */
const HELD_ROWS = T_230.rows
  .filter((row) => row.by[COL_WS3] === '呼び手が持って来る')
  .map((row) => row.id)

/** One replacement, named the way table T-230 requires a caller to name itself. */
const bringing = (row: string, document: Document): HeldDocumentCall =>
  ({ row, document }) as unknown as HeldDocumentCall

/**
 * ⭐ The row every case that does not care WHICH row it is stands in: RD-6,
 * 「起動時の文書」, which since CR-280 took 「自動保存」 out of the specification
 * is the only row whose `WS-3` column says 「呼び手が持って来る」.
 *
 * ⚠️ WHAT THESE CASES ASK OF IT IS NOT THE ROW'S OWN BUSINESS -- they count
 * frames and read the description that came out of one. The row is named only
 * because table T-230 (MUST) forbids a replacement that does not name one, and
 * the 表 T-230 describe below is where the row's own three columns are driven.
 */
const RESTORED = (document: Document): HeldDocumentCall => bringing('RD-6', document)

// ---------------------------------------------------------------------------
// The two keys the shell is asked with, spelt by table T-036
// ---------------------------------------------------------------------------

/**
 * One row of table T-036, as the manuscript spells its assignment.
 *
 * ⭐ Read rather than typed for the reason Chapter 1.9 (:275) gives, and copied
 * from tests/unit/uf-47-48-history-bytes.test.ts, which drives the same two
 * keys for the same reason: the shell publishes no history, so pressing a key
 * is the only currency a test has for asking what the history holds.
 */
function keyOf(row: string): KeyInput {
  const found = specTable('T-036').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  const assignment = (found.by['割当'] ?? '').split('/')[0] ?? ''
  const parts = assignment
    .replace(/`/g, '')
    .replace(/＋/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${row} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: {
      ctrl: named('Ctrl'),
      shift: named('Shift'),
      alt: named('Alt'),
      meta: named('Cmd'),
    } satisfies InputModifiers,
  }
}

/** SK-20 -- 「基準日線を出す / 消す」, which UN-13 of table T-027 makes a 対象. */
const SK_20 = keyOf('SK-20')
/** SK-6 -- 「元に戻す」. */
const SK_6 = keyOf('SK-6')

/** What a case watches to say whether a press moved the current value. */
const stateOf = (loop: FrameLoop) => ({
  title: (loop.document() as any).schedule.project.title as string | null,
  statusDate: (loop.document() as any).schedule.project.statusDate as string | null,
})

// ---------------------------------------------------------------------------
// The host UF-48 is given
// ---------------------------------------------------------------------------

/**
 * BO-1 has already settled these by the time a frame loop exists: FR-051 keeps
 * the last two out of the settings because they differ from one machine to the
 * next, and `appHeaderMaxHeight` (S-116) is their cap, not their value.
 */
const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  /** Every SVG the loop has put on the surface, oldest first. */
  readonly drawn: string[]
  readonly surface: { showSvg(svg: string): void }
  /** Run whatever the loop asked an animation frame for, until it asks for no more. */
  runAnimationFrames(): void
  /** How many frames the surface has been given. */
  frames(): number
}

const realRaf = (globalThis as any).requestAnimationFrame

function host(): Host {
  const drawn: string[] = []
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    drawn,
    surface: {
      showSvg: (svg: string) => {
        drawn.push(svg)
      },
    },
    runAnimationFrames: () => {
      // Bounded, so a loop that asks for a frame from inside a frame -- which
      // NFR-010 forbids -- ends the test instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
    frames: () => drawn.length,
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

/** Every vertex the SVG draws, which is where "the drawn shapes" can be measured. */
function drawnPoints(svg: string): { readonly x: number; readonly y: number }[] {
  const points: { x: number; y: number }[] = []
  for (const attribute of svg.matchAll(/points="([^"]+)"/g)) {
    for (const pair of (attribute[1] ?? '').trim().split(/\s+/)) {
      const [x, y] = pair.split(',').map(Number)
      if (x !== undefined && y !== undefined) points.push({ x, y })
    }
  }
  return points
}

/**
 * Every word the picture prints, in the order it prints them.
 *
 * ⭐ The shape of one label is the neighbour's, not this file's guess:
 * tests/unit/uf-32-ruler-band.test.ts reads a 目盛ラベル the same way, and it is
 * the file that owns what the band draws.
 */
const labelsInOrder = (svg: string): readonly string[] =>
  [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((hit) => (hit[1] ?? '').trim())

/**
 * The same picture with every printed word taken out of it -- what is left is
 * the part FR-038 says no language may reach.
 */
const withoutWords = (svg: string): string =>
  svg.replace(/(<text\b[^>]*>)[\s\S]*?(<\/text>)/g, '$1$2')

/**
 * Which of a language's seven weekdays a printed label carries, or -1.
 *
 * ⚠️ CARRIES rather than IS: FR-038 (MUST NOT) forbids a weekday being written
 * into a requirement or a table, so a case can only ask the dictionary for the
 * roster; and how much of a 段 the word takes up is FR-017's rule and
 * tests/unit/uf-32-ruler-band.test.ts's to drive. ⛔ An empty entry is skipped
 * -- FR-038's fallback for a word not yet written matches every label.
 */
const weekdaySlotIn = (label: string, roster: readonly string[]): number =>
  roster.findIndex((word) => word !== '' && label.includes(word))

const day = (text: string): CalendarDay => {
  const parsed = dayOf(text)
  if (parsed === null) throw new Error(`${text} is not a day`)
  return parsed
}

// ---------------------------------------------------------------------------

describe('the document these cases drive', () => {
  it('is a valid GRS JSON document', () => {
    const report = validateDocument(twoRowDocument())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('carries no actual: every Task is PS-1 of table T-019a', () => {
    // ⛔ A premise, not decoration. FR-055 fits the drawn extent and OC-5 of
    // table T-038 counts an actual bar that runs outside its plan, so an actual
    // nobody asked for moves the zoom every case below is standing on, and a
    // large enough one takes both Tasks under the task LOD floor (S-86). The
    // case further down that does want an actual says so through `edit`.
    for (const task of (twoRowDocument() as any).schedule.tasks) {
      expect(planActualState(task)).toBe('notStarted')
      expect(task.actualStart).toBeNull()
      expect(task.actualDuration).toBeNull()
      expect(task.actualFinish).toBeNull()
    }
  })

  it('stores no place: the OP-10 cases below really drive the null side', () => {
    // The settings come from the template, so this is the one thing about it
    // the OP-10 cases depend on. S-77 / S-78 hold the stored place, and OP-10
    // branches on whether it is null; a template that filled either in would
    // send those cases down the other branch without changing a line of them.
    const settings = settingsOf(twoRowDocument())
    expect(settings.scrollDate).toBeNull()
    expect(settings.scrollGroupId).toBeNull()
  })
})

describe('UF-48 frameLoop -- BO-5 of table T-077', () => {
  it('puts the first frame up as boot ends, not on the animation frame after it', () => {
    // Table T-078 closes with "⚠️ 最初の 1 枚は 表 T-077 の `BO-5` が起こす" --
    // the first frame belongs to the boot order, not to any of FT-1..FT-5. So
    // it is already on the surface before an animation frame has run.
    const pane = host()
    frameLoop(pane.surface, twoRowDocument(), SCREEN)
    expect(pane.frames()).toBe(1)
  })

  it('runs BO-5 exactly once -- boot does not owe a second frame', () => {
    const pane = host()
    frameLoop(pane.surface, twoRowDocument(), SCREEN)
    pane.runAnimationFrames()
    expect(pane.frames()).toBe(1)
  })

  it('NFR-011: that first frame is whole -- sized to the settled screen and carrying the shapes', () => {
    // NFR-011 (MUST NOT): "空白のまま残る画面も、内容が欠けたまま出る画面も
    // 出さないこと". BO-1 settles the size before BO-5 draws, so the picture is
    // the size the host reported and it already holds what the document draws.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const svg = pane.drawn[0] ?? ''

    expect(svg).toContain(`width="${SCREEN.width}"`)
    expect(svg).toContain(`height="${SCREEN.height}"`)
    expect(drawnPoints(svg).length).toBeGreaterThan(0)

    // BO-1 also settles ScreenRegions (CP-35) before anything is drawn, and
    // the first frame's values are built on that -- not on a 0x0 window.
    const values = loop.current()
    expect(values).not.toBeNull()
    expect(values!.regions.scheduleCanvas.width).toBe(SCREEN.width)
    expect(values!.regions.appHeader.height).toBe(SCREEN.appHeaderHeight)
    expect(values!.layout.placements).toHaveLength(2)
  })
})

describe('OP-10 of table T-024a -- a place the person has not chosen yet', () => {
  it('does not read a null scrollDate as 1970-01-01', () => {
    // S-77: "`null` は「人がまだ場所を決めていない」を表す". OP-10 (MUST):
    // "`FR-055` の全体表示が選ぶ倍率と表示位置にすること". Reading the null as
    // the zero of some day count puts the origin at the epoch and the whole
    // schedule fifty-six years off the right edge.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const origin = loop.current()!.layout.originDay

    expect(origin).not.toBeNull()
    expect(textOfDay(origin!)).not.toBe('1970-01-01')
    // FR-055 fits what is drawn, so the origin cannot be later than the first
    // day drawn either -- that would cut the left edge off.
    expect(compareDays(origin!, day(FIRST_START))).toBeLessThanOrEqual(0)
  })

  it('leaves every drawn shape inside the screen, which is what fitting to it means', () => {
    // FR-055: "縦横の倍率と表示位置を全体が収まる側へ合わせる". The two Tasks
    // span twenty days; at the stored 1x zoom they would not need fitting, so
    // what this measures is that OP-10 chose a place and a zoom at all.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const values = loop.current()!

    for (const point of drawnPoints(pane.drawn[0] ?? '')) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(SCREEN.width)
    }
    for (const placement of values.layout.placements) {
      expect(placement.x).toBeGreaterThanOrEqual(values.regions.rowArea.x)
      expect(placement.x + placement.width).toBeLessThanOrEqual(
        values.regions.rowArea.x + values.regions.rowArea.width,
      )
    }
  })

  it('FR-055: an actual bar that runs past its plan is inside the screen too', () => {
    // FR-055's RATIONALE (MUST): what the fit measures is the drawn extent,
    // and what counts towards it is table T-038 -- whose OC-5 row is the actual
    // bar that runs outside its plan, in both directions. So the fit is taken
    // on the plan AND on the part of the actual sticking out of it, and OP-10
    // is what makes boot run that fit at all.
    //
    // ⚠️ The two sibling cases above cannot see this: they drive plan-only
    // Tasks, and a fit measured on plans alone still puts every plan bar on
    // screen. What leaves the screen is the actual. FR-055's RATIONALE spells
    // out the cost in the other direction -- an overhang to the left ends up
    // behind the row title panel, where no scroll position reaches it.
    const late = twoRowDocument((draft) => {
      draft.schedule.tasks[0].actualStart = LATE_ACTUAL_START
      draft.schedule.tasks[0].actualDuration = LATE_ACTUAL_WORKED_DAYS
    })
    expect(validateDocument(late).valid).toBe(true)

    const pane = host()
    const values = frameLoop(pane.surface, late, SCREEN).current()!
    const placement = values.layout.placements.find((p) => p.taskUid === 1)!
    const rowArea = values.regions.rowArea
    const actualEnd = placement.actualX! + placement.actualWidth

    // ⛔ The premise. OC-6 takes the horizontal extent of a below-shifted actual
    // back out of the count, so this case only means what it says while the
    // actual is drawn on the plan (table T-012, SH-1 / SH-2)...
    expect(placement.actualPlacement).toBe('inside')
    // ...and only while that actual really does run past its plan (RV-1 puts
    // its right end at `actualStart` plus `actualDuration` in worked days).
    expect(placement.actualX).not.toBeNull()
    expect(actualEnd).toBeGreaterThan(placement.x + placement.width)

    // LC-7 sums the occupancy from table T-038, so it reaches the actual's end.
    expect(placement.occupiedX1).toBeGreaterThanOrEqual(actualEnd)

    // And the fit was taken on that: the whole actual bar is on screen.
    expect(placement.actualX!).toBeGreaterThanOrEqual(rowArea.x)
    expect(actualEnd).toBeLessThanOrEqual(rowArea.x + rowArea.width)

    // The extent grew, so the fit had to give a day less room than it does for
    // the same document without the actual. Measuring the plan alone would
    // hand back that same zoom and draw the overhang off the right edge.
    const planOnly = frameLoop(pane.surface, twoRowDocument(), SCREEN).current()!
    expect(values.layout.pxPerDay).toBeLessThan(planOnly.layout.pxPerDay)
  })

  it('is a reading rule: the stored place stays null, OP-6 does not fill it in', () => {
    // OP-10: "`null` は「人がまだ場所を決めていない」を表す値であって、欠けて
    // いるのではない（`OP-6` の補完に当たらない）". FR-051 puts the same thing
    // the other way round: "読む側の規則は表 T-024a の `OP-10` が持つ". So the
    // stored settings still say null after the first frame, and every later
    // frame decides again.
    const document = twoRowDocument()
    const pane = host()
    const loop = frameLoop(pane.surface, document, SCREEN)

    expect(settingsOf(loop.document()).scrollDate).toBeNull()
    expect(settingsOf(loop.document()).scrollGroupId).toBeNull()
    expect(settingsOf(loop.document()).zoomX).toBe(settingsOf(document).zoomX)
    expect(settingsOf(loop.document()).zoomY).toBe(settingsOf(document).zoomY)
  })

  it('holds when scrollGroupId names a row that is gone, even though scrollDate holds a day', () => {
    // OP-10 covers two cases in one row: "表示位置が `null`、または指す行が存在
    // しないとき". IV-3 says in as many words that the stored place is NOT kept
    // pointing at a live row, so this state is reachable in a valid document
    // (CD-2 makes it on purpose when a row is deleted).
    const stale = twoRowDocument((draft) => {
      draft.documentSettings.scrollDate = '2026-04-05'
      draft.documentSettings.scrollGroupId = GONE
    })
    expect(validateDocument(stale).valid).toBe(true)

    const pane = host()
    const fitted = frameLoop(pane.surface, twoRowDocument(), SCREEN).current()!
    const loop = frameLoop(pane.surface, stale, SCREEN)
    const values = loop.current()!

    // FR-055's answer, not the stored day: the same place and zoom the null
    // case above was given.
    expect(values.layout.originDay).toEqual(fitted.layout.originDay)
    expect(values.layout.pxPerDay).toBe(fitted.layout.pxPerDay)
  })

  it('does not hold when the stored place is good: that day and that zoom are kept', () => {
    // The other side of OP-10. S-77 and S-78 are what FR-050 saved, and WY-1
    // wants the same JSON to come back looking the same, so a place the person
    // did choose is used as it stands.
    const placed = twoRowDocument((draft) => {
      draft.documentSettings.scrollDate = '2026-04-05'
      draft.documentSettings.scrollGroupId = ALPHA
    })
    const pane = host()
    const values = frameLoop(pane.surface, placed, SCREEN).current()!

    expect(values.layout.originDay).toEqual(day('2026-04-05'))
    // FR-017: one day is `pxPerDayAt1x` times zoomX. Untouched by any fit.
    expect(values.layout.pxPerDay).toBe(
      settingsOf(placed).pxPerDayAt1x * settingsOf(placed).zoomX,
    )
  })
})

describe('HF-8 of table T-051 -- what boot must not do', () => {
  const collapsed = () =>
    twoRowDocument((draft) => {
      draft.schedule.taskGroups[0].isCollapsed = true
    })

  it('keeps the collapse the person saved', () => {
    // HF-8 (MUST NOT): "起動のときは働かせてはならない（MUST NOT。表 T-024a の
    // `OP-10`）". OP-10 gives the reason: "起動のたびに畳みを捨てると、`HR-6`
    // が `WY-1` のために保存させた状態が消える".
    const document = collapsed()
    expect(validateDocument(document).valid).toBe(true)

    const pane = host()
    const loop = frameLoop(pane.surface, document, SCREEN)

    expect(rowsOf(loop.document()).map((r) => r.isCollapsed)).toEqual([true, false])
  })

  it('and draws the picture that collapse means -- the row under it stays undrawn', () => {
    // The half that matters: HF-8 could be honoured in the document and still
    // be applied to the frame. LC-1 of table T-068 drops the collapsed rows
    // first, and HR-1a forbids drawing "畳んだ `TaskGroup` の配下の行と、その行
    // に載っている `Task`".
    const pane = host()
    const withCollapse = frameLoop(pane.surface, collapsed(), SCREEN).current()!
    const withoutCollapse = frameLoop(pane.surface, twoRowDocument(), SCREEN).current()!

    expect(withoutCollapse.layout.rows.map((r) => r.groupId)).toEqual([ALPHA, BETA])
    expect(withCollapse.layout.rows.map((r) => r.groupId)).toEqual([ALPHA])
    expect(withCollapse.layout.placements.map((p) => p.taskUid)).toEqual([1])
  })
})

describe('table T-078 -- the whole of what may wake a frame', () => {
  it('FT-3: a change of size runs exactly one more frame', () => {
    // FT-3: "画面の寸法が変わったこと ... `SingleHtmlShell`（`CP-25`）が自分で
    // 観測する". NFR-010 adds the MUST: "画面の寸法が変わったことは「操作」に
    // 数えること" -- the picture must be rebuilt, or the old size stays on
    // screen.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before + 1)
    expect(pane.drawn[before]).toContain('width="1400"')
    expect(loop.current()!.regions.scheduleCanvas.width).toBe(1400)
  })

  it('FT-2: replacing the current value runs exactly one more frame', () => {
    // FT-2: "現在値の差し替え（表 T-067 の `WS-6`）". LY-5 makes this layer the
    // only holder of a current value, so after WS-6 the loop answers with the
    // new document.
    //
    // ⭐ The call names its row of table T-230 because that table requires it
    // (MUST) -- and the row is also what makes the second expectation exact:
    // "「呼び手が持って来る」の行では、呼び手が渡した文書がそのまま `WS-3` の
    // 答えである" and 「刻印 = 入ってきたまま」, so nothing is rebuilt on the way
    // through and the very document handed over is the one that lands.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()
    const next = twoRowDocument((draft) => {
      draft.schedule.tasks[1].finish = '2026-05-29'
    })

    loop.holdDocument(RESTORED(next))
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before + 1)
    expect(loop.document()).toBe(next)
  })

  it('NFR-010: with no trigger, no frame -- reading the current values is not one', () => {
    // NFR-010: "利用者が操作していない間、`GRS` は、画面を描き直さないこと".
    // Table T-078 closes with the MUST NOT that makes it concrete: "本表に無い
    // 契機でフレームを起こしてはならない". `current()` and `document()` are not
    // in the table.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()

    for (let turn = 0; turn < 5; turn += 1) {
      loop.current()
      loop.document()
      pane.runAnimationFrames()
    }

    expect(pane.frames()).toBe(before)
  })

  it('NFR-010: a resize that does not change the size is not FT-3', () => {
    // ⛔ FT-3's trigger is "画面の寸法が変わったこと" -- the change, not the
    // notice of one. When the size is what it already was, no row of table
    // T-078 has fired, and the MUST NOT after the table applies: "本表に無い
    // 契機でフレームを起こしてはならない". NFR-010's RATIONALE is the cost:
    // "電池と発熱に直に効き".
    //
    // ⚠️ The window fires `resize` for things that leave the box alone (a
    // scrollbar coming and going, the on-screen keyboard, devicePixelRatio),
    // and `appHeaderHeight` / `scrollbarThickness` are re-measured each time
    // and usually come back the same. Table T-075 gives UF-48 "フレームを起こす
    // 契機の観測（表 T-078）", and LY-5 makes it the only place holding the
    // previous size, so the comparison has nowhere else to live.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()

    loop.resize({ ...SCREEN })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before)
  })
})

describe('ADR-001 and table T-071 -- computed once at the head of a frame', () => {
  it('CA-2: the three values are not rebuilt while the frame lasts', () => {
    // CA-2: "無効化の契機 ... **フレームの先頭。** そのフレームのあいだは作り
    // 直さない". MN-6 measured what the other way costs: table T-068's eleven
    // stages four times per pointer move.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    const first = loop.current()
    expect(first).not.toBeNull()
    expect(loop.current()).toBe(first)
    expect(loop.current()!.layout).toBe(first!.layout)
    expect(loop.current()!.geometry).toBe(first!.geometry)
    expect(loop.current()!.regions).toBe(first!.regions)
  })

  it('CA-4: all three are rebuilt together, so none of them is left stale', () => {
    // CA-4 (MUST NOT): "1 つだけが古いという状態を作ってはならない". CA-1 names
    // the three: the frame's ScreenRegions, its ScheduleLayout and its
    // ScheduleGeometry.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = loop.current()!

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()
    const after = loop.current()!

    expect(after).not.toBe(before)
    // The regions are this frame's...
    expect(after.regions.scheduleCanvas.width).toBe(1400)
    // ...the layout was laid out on THOSE regions...
    expect(after.layout.originX).toBe(after.regions.rowArea.x)
    expect(after.layout.contentWidth).not.toBe(before.layout.contentWidth)
    // ...and the geometry was cut from THAT layout.
    const drawnFirst = after.geometry.tasks.find((t) => t.taskUid === 1)!
    const placedFirst = after.layout.placements.find((p) => p.taskUid === 1)!
    expect(drawnFirst.plan).not.toBeNull()
    const outline = drawnFirst.plan as { form: 'outline'; points: readonly { x: number }[] }
    expect(Math.min(...outline.points.map((p) => p.x))).toBeCloseTo(placedFirst.x, 6)
  })

  it('CA-2: two triggers before the frame head are still one calculation', () => {
    // "フレームの先頭で 1 回計算して配る" (CP-25, ADR-001). Two rows of table
    // T-078 firing between one animation frame and the next owe one frame, not
    // two -- the second would compute the same eleven stages again for the same
    // picture, which is the cost MN-6 says this decision exists to avoid.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()

    loop.resize({ ...SCREEN, width: 1400 })
    loop.holdDocument(
      RESTORED(
        twoRowDocument((draft) => {
          draft.schedule.tasks[0].name = 'Renamed'
        }),
      ),
    )
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before + 1)
    expect(pane.drawn[before]).toContain('width="1400"')
  })
})

// ===========================================================================
// The second surface: IF-9
// ===========================================================================
//
// ⛔ Written from docs/spec and from the declarations UF-48 publishes, the same
// way the cases above were. What was read of `frame-loop.ts` is its head
// comment and its exported declarations (`ScreenWiring` among them); its body
// was not.
//
// The rows these cases answer to:
//   IF-9    表 T-065 -- `ScreenSurface`, declared by `ScreenRenderer` (CP-37)
//           and implemented by `DomScreenSurface` (CP-38): the description of
//           the UI parts outside the schedule is put on the screen
//   MN-8    表 T-070 -- the rejected alternative was ONE renderer drawing both
//           the schedule and everything around it
//   SC-1    表 T-031 -- the row title panel follows the body vertically and
//           does not flow sideways
//   SC-4    表 T-031 -- both scrollbars are always drawn, fitted or not
//   FR-051  the `App Header` height and the scrollbar thickness are settled
//           from the environment at boot and are NOT settings; the header does
//           not exceed `appHeaderMaxHeight` (S-116)
//   FR-038  which language the screen is read in is the reader's environment,
//           and the document does not hold it (MUST NOT)
//   U-32    `Schedule Canvas` -- the container the frame is carved out of
//   NFR-011 no screen goes up blank, and none goes up with a part missing
//   CA-2 / CA-4  the frame's three values are computed once and rebuilt
//           together, which is what both surfaces of one frame are filled from

/** S-116 `appHeaderMaxHeight`, copied from table T-212 of _assets/tbl-settings.md. */
const APP_HEADER_MAX_HEIGHT = 56

interface ScreenPane {
  /** Every description the loop has put on the surface, oldest first. */
  readonly views: ScreenView[]
  readonly wiring: ScreenWiring
  /** How many descriptions the surface has been given. */
  screens(): number
  /** The last one. */
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    // ⚠️ Nothing below drives the two pulled members. `readDialogueInput`
    // answers `null` because the person has typed nothing, and
    // `readScreenPartAt` answers `null` because this fake has drawn nothing
    // anywhere -- which is what that member calls "the schedule below is
    // exposed".
    readDialogueInput: () => null,
    // IF-9 also returns what a properties-panel field settled at.
    // Nothing here drives one, so there is never a commit to take.
    readFieldCommit: () => null,
    readScreenPartAt: () => null,
  }
  return {
    views,
    wiring: { surface, language },
    screens: () => views.length,
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

/** One scrollbar of a description, by axis. SC-4 requires both to exist. */
const scrollbarOf = (view: ScreenView, axis: 'horizontal' | 'vertical') =>
  view.frame.scrollbars.find((bar) => bar.axis === axis)

/** Every row the panel shows, pinned ones first (FR-098 lifts those out of the list). */
const titlesOf = (view: ScreenView) => [
  ...view.rowTitlePanel.pinnedTitles,
  ...view.rowTitlePanel.titles,
]

/**
 * The same two rows over one working week instead of twenty days.
 *
 * ⭐ FR-055 fits the drawn extent to the `Row Area`, so a short extent buys a
 * large px/day -- and FR-017 judges the 段階 on px/day against 表 T-205 の
 * `S-85`. ⚠️ WHY A CASE WOULD WANT THAT: the 曜日 has a 段 of its own only on
 * the finest 段階, and it is the one thing in the picture FR-038 lets the
 * display language reach. ⛔ The default twenty-day document is NOT a safe
 * stand-in: at the width these cases drive, its fit lands close enough to
 * `S-85` that the 段階 could fall either side of it.
 */
const shortDocument = () =>
  twoRowDocument((draft) => {
    draft.schedule.tasks[0].start = FIRST_START
    draft.schedule.tasks[0].finish = '2026-04-03'
    draft.schedule.tasks[1].start = '2026-04-02'
    draft.schedule.tasks[1].finish = '2026-04-08'
  })

/** A document with no rows and no tasks -- the empty case SC-4 still has to draw for. */
const emptyDocument = () =>
  twoRowDocument((draft) => {
    draft.schedule.tasks = []
    draft.schedule.taskGroups = []
    draft.schedule.taskGroupMembers = []
  })

describe('IF-9 of table T-065 -- the frame draws on a second surface', () => {
  it('GIVEN a screen wiring WHEN boot ends THEN the first description is already on the surface (BO-5)', () => {
    // NFR-011 (MUST NOT): "空白のまま残る画面も、内容が欠けたまま出る画面も出さ
    // ないこと". Table T-078 closes with "最初の 1 枚は 表 T-077 の `BO-5` が
    // 起こす", and BO-5 is "最初の 1 枚を出す" -- one screen, not the schedule
    // now and the parts around it on some later frame.
    const pane = host()
    const screen = screenPane()

    frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)

    expect(pane.frames()).toBe(1)
    expect(screen.screens()).toBe(1)
  })

  it('GIVEN a screen wiring WHEN boot ends THEN BO-5 owes no second description', () => {
    const pane = host()
    const screen = screenPane()

    frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    pane.runAnimationFrames()

    expect(screen.screens()).toBe(1)
  })

  it('GIVEN no screen wiring WHEN boot ends THEN the schedule alone is drawn (the omitted case)', () => {
    // ⛔ The absent parameter is the null case for this seam. `ScreenWiring` is
    // optional on purpose, and table T-077 governs the schedule whether or not
    // the caller had a browser to build a surface on.
    const pane = host()

    expect(() => frameLoop(pane.surface, twoRowDocument(), SCREEN)).not.toThrow()
    expect(pane.frames()).toBe(1)
  })

  it('GIVEN no screen wiring WHEN a frame is woken THEN it still runs (FT-3 without IF-9)', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(2)
    expect(pane.drawn[1]).toContain('width="1400"')
  })

  it('MN-8: GIVEN one frame THEN each of the two surfaces is fed exactly once', () => {
    // MN-8 of table T-070 rejected "描画が 1 つで日程表も外側も描く": the parts
    // outside the schedule are assembled by CP-37 and land on IF-9, while the
    // schedule lands on IF-1. ⛔ Both are filled from the SAME frame, which is
    // what CA-4 forbids splitting.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()
    loop.holdDocument(
      RESTORED(
        twoRowDocument((draft) => {
          draft.schedule.tasks[0].name = 'Renamed'
        }),
      ),
    )
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(3)
    expect(screen.screens()).toBe(3)
  })

  it('NFR-010: GIVEN a screen wiring WHEN nothing in table T-078 fires THEN no description is made', () => {
    // "本表に無い契機でフレームを起こしてはならない（MUST NOT）". Reading the
    // current values is in no row of table T-078, and neither is a resize that
    // reports the size the screen already had.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)

    for (let turn = 0; turn < 5; turn += 1) {
      loop.current()
      loop.document()
      loop.resize({ ...SCREEN })
      pane.runAnimationFrames()
    }

    expect(screen.screens()).toBe(1)
    expect(pane.frames()).toBe(1)
  })
})

describe('SC-4 of table T-031 -- both scrollbars, always', () => {
  it('GIVEN the two-row document WHEN the first description is made THEN it carries both scrollbars', () => {
    // SC-4: "横・縦とも常時表示する。内容が収まっていても消さない". ⚠️ NFR-011
    // is what makes this the loop's business: a description handed over with a
    // part missing is "内容が欠けたまま出る画面".
    const pane = host()
    const screen = screenPane()
    frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)

    const view = screen.last()
    expect(view.frame.scrollbars).toHaveLength(2)
    expect(scrollbarOf(view, 'horizontal')).toBeDefined()
    expect(scrollbarOf(view, 'vertical')).toBeDefined()
  })

  it('GIVEN a document with no rows and no tasks THEN both scrollbars are still drawn (the empty case)', () => {
    // ⛔ The empty case is the one SC-4 was written for: "内容が収まっていても
    // 消さない" -- and nothing fits more completely than nothing. FR-051 gives
    // the reason under table T-031: "消えるとキャンバスの幅が変わり、再レイア
    // ウトが走る".
    const document = emptyDocument()
    expect(validateDocument(document).valid).toBe(true)

    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, document, SCREEN, screen.wiring)

    const view = screen.last()
    expect(view.frame.scrollbars).toHaveLength(2)
    expect(scrollbarOf(view, 'horizontal')).toBeDefined()
    expect(scrollbarOf(view, 'vertical')).toBeDefined()
    // And the frame really was built on an empty schedule.
    expect(loop.current()!.layout.rows).toEqual([])
    expect(titlesOf(view)).toEqual([])
  })

  it('FR-051: GIVEN a frame THEN the scrollbar lanes take their place FROM the Row Area, not over it', () => {
    // FR-051 (MUST): "`Scrollbars` は `Row Area` から場所を取ること". SC-4 is
    // the reason it has to take place at all -- "場所を取らない形では `SC-4` が
    // 意味を持たない". So the vertical lane begins where the Row Area ends, and
    // the horizontal lane below it; neither is drawn over the schedule.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const rowArea = loop.current()!.regions.rowArea
    const canvas = loop.current()!.regions.scheduleCanvas
    const view = screen.last()

    const vertical = scrollbarOf(view, 'vertical')!
    const horizontal = scrollbarOf(view, 'horizontal')!
    expect(vertical.track.x).toBeGreaterThanOrEqual(rowArea.x + rowArea.width)
    expect(horizontal.track.y).toBeGreaterThanOrEqual(rowArea.y + rowArea.height)

    // U-32: the `Schedule Canvas` is the container the lanes are cut out of, so
    // neither of them leaves it.
    for (const bar of view.frame.scrollbars) {
      expect(bar.track.x).toBeGreaterThanOrEqual(canvas.x)
      expect(bar.track.y).toBeGreaterThanOrEqual(canvas.y)
      expect(bar.track.x + bar.track.width).toBeLessThanOrEqual(canvas.x + canvas.width)
      expect(bar.track.y + bar.track.height).toBeLessThanOrEqual(canvas.y + canvas.height)
    }
  })
})

describe('SC-1 of table T-031 -- the panel follows the body, sideways it does not', () => {
  it('GIVEN two drawn rows THEN each title stands at the y and height the body row has', () => {
    // SC-1: "縦は本体と連動する". ⛔ The panel and the `Row Area` have to be the
    // SAME numbers, which is why a row title takes its box from the shell's
    // measurement of this frame rather than from a second computation.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const rows = loop.current()!.layout.rows
    const titles = titlesOf(screen.last())

    // ⛔ Not a vacuous comparison: both rows of the document are drawn.
    expect(rows).toHaveLength(2)
    expect(titles).toHaveLength(2)
    expect(titles.map((title) => title.groupId)).toEqual(rows.map((row) => row.groupId))
    for (const row of rows) {
      const title = titles.find((candidate) => candidate.groupId === row.groupId)!
      expect(title.box.y).toBe(row.y)
      expect(title.box.height).toBe(row.height)
    }
  })

  it('GIVEN a collapsed row THEN the panel drops the same row the body drops (HF-8 / HR-1a)', () => {
    // The vertical link is not only the numbers: a row the body does not draw
    // is a row the panel has no line for. HR-1a forbids drawing "畳んだ
    // `TaskGroup` の配下の行", and HF-8 keeps the saved collapse at boot.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(
      pane.surface,
      twoRowDocument((draft) => {
        draft.schedule.taskGroups[0].isCollapsed = true
      }),
      SCREEN,
      screen.wiring,
    )

    expect(loop.current()!.layout.rows.map((row) => row.groupId)).toEqual([ALPHA])
    expect(titlesOf(screen.last()).map((title) => title.groupId)).toEqual([ALPHA])
  })

  it('GIVEN the body standing at a different day THEN the titles have not moved sideways', () => {
    // SC-1: "**横には流れない**". The stored place (S-77 / S-78) puts the body
    // on 2026-04-05 in one case and OP-10's fit decides it in the other, so the
    // two frames look at different days -- and the panel stands where it stood.
    const scrolled = twoRowDocument((draft) => {
      draft.documentSettings.scrollDate = '2026-04-05'
      draft.documentSettings.scrollGroupId = ALPHA
    })
    expect(validateDocument(scrolled).valid).toBe(true)

    const pane = host()
    const fittedScreen = screenPane()
    const scrolledScreen = screenPane()
    const fittedLoop = frameLoop(pane.surface, twoRowDocument(), SCREEN, fittedScreen.wiring)
    const scrolledLoop = frameLoop(pane.surface, scrolled, SCREEN, scrolledScreen.wiring)

    // ⛔ The premise: the two frames really are looking at different days.
    expect(scrolledLoop.current()!.layout.originDay).not.toEqual(
      fittedLoop.current()!.layout.originDay,
    )

    const fittedTitles = titlesOf(fittedScreen.last())
    const scrolledTitles = titlesOf(scrolledScreen.last())
    expect(scrolledTitles.map((title) => title.groupId)).toEqual(
      fittedTitles.map((title) => title.groupId),
    )
    for (const [index, title] of scrolledTitles.entries()) {
      expect(title.box.x).toBe(fittedTitles[index]!.box.x)
      expect(title.box.width).toBe(fittedTitles[index]!.box.width)
    }
  })
})

describe('SC-1 of table T-031 -- the panel and the body hold the SAME rows', () => {
  /**
   * A document with enough rows that the stack is taller than the `Row Area`,
   * anchored at a row well down the stack so the ones above it are off the top.
   * ⚠ S-78 is 「人が決めた表示位置」 and OP-10 reads it, so this is the
   * ordinary way a person leaves the schedule -- not a contrived frame.
   */
  const manyRows = (anchorAt: number): Document =>
    twoRowDocument((draft) => {
      const rows: unknown[] = []
      const members: unknown[] = []
      const tasks = [...draft.schedule.tasks]
      for (let index = 0; index < 24; index += 1) {
        const id = `row-${index}`
        rows.push({
          id,
          parentId: null,
          label: `Row ${index}`,
          derivedFromTaskUid: null,
          order: index,
          isCollapsed: false,
          isHidden: false,
          color: null,
          height: null,
        })
        members.push({ taskUid: 1, groupId: id, stackOrder: null })
      }
      draft.schedule.tasks = tasks.slice(0, 1)
      draft.schedule.taskGroups = rows
      draft.schedule.taskGroupMembers = members
      draft.documentSettings.scrollGroupId = `row-${anchorAt}`
    })

  it('GIVEN the stack is anchored below its top THEN some rows really do fall outside the Row Area', () => {
    // ⛔ THE PREMISE OF THE CASE BELOW, ASSERTED RATHER THAN ASSUMED. With
    // nothing clipped, an equality of counts says nothing at all.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, manyRows(12), SCREEN, screen.wiring)
    const values = loop.current()!
    const area = values.regions.rowArea

    const outside = values.layout.rows.filter(
      (row) =>
        Math.min(row.y + row.height, area.y + area.height) <= Math.max(row.y, area.y),
    )
    expect(outside.length, 'no row is off the Row Area, so nothing is being clipped').toBeGreaterThan(
      0,
    )
  })

  it('GIVEN rows fall outside the Row Area THEN the panel holds exactly the rows the body draws', () => {
    // SC-1: 「縦は本体と連動する」. A row the body has no band for is a row the
    // panel has no line for -- a title painted where no band is stands up in
    // the Time Ruler, over the corner HF-10's control needs.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, manyRows(12), SCREEN, screen.wiring)
    const values = loop.current()!
    const area = values.regions.rowArea

    const showing = values.layout.rows.filter(
      (row) => Math.min(row.y + row.height, area.y + area.height) > Math.max(row.y, area.y),
    )
    const titles = titlesOf(screen.last())

    expect(titles.map((title) => title.groupId)).toEqual(showing.map((row) => row.groupId))
    expect(titles.length).toBe(showing.length)
  })

  it('GIVEN a title is drawn THEN its band lies inside the Row Area, cut the same way the body is', () => {
    // The other half of 「連動する」: a title that kept its whole height while
    // the band beside it was cut stands taller than the row it names.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, manyRows(12), SCREEN, screen.wiring)
    const values = loop.current()!
    const area = values.regions.rowArea

    for (const title of titlesOf(screen.last())) {
      const row = values.layout.rows.find((one) => one.groupId === title.groupId)!
      expect(title.box.y, `${title.groupId} starts above the Row Area`).toBeGreaterThanOrEqual(area.y)
      expect(
        title.box.y + title.box.height,
        `${title.groupId} runs past the foot of the Row Area`,
      ).toBeLessThanOrEqual(area.y + area.height)
      expect(title.box.y, `${title.groupId} is not the body's own top`).toBe(
        Math.max(row.y, area.y),
      )
      expect(title.box.height, `${title.groupId} is not the body's own height`).toBe(
        Math.min(row.y + row.height, area.y + area.height) - Math.max(row.y, area.y),
      )
    }
  })
})

describe('CA-4 and FR-051 -- one frame of screen, at the size that frame settled', () => {
  it('GIVEN FT-3 WHEN the frame runs THEN the description is built on the regions of THAT frame', () => {
    // CA-4 (MUST NOT): "1 つだけが古いという状態を作ってはならない". The parts
    // around the schedule are cut from the same `ScreenRegions` the schedule
    // was laid out on, so a wider window widens both in the same frame.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const before = scrollbarOf(screen.last(), 'vertical')!.track.x

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()

    expect(screen.screens()).toBe(2)
    expect(pane.drawn[1]).toContain('width="1400"')
    const after = scrollbarOf(screen.last(), 'vertical')!.track.x
    expect(after).toBeGreaterThan(before)
    expect(after).toBeGreaterThanOrEqual(
      loop.current()!.regions.rowArea.x + loop.current()!.regions.rowArea.width,
    )
  })

  it('FT-3: GIVEN only the App Header height changed THEN a frame runs', () => {
    // ⛔ FR-051 (MUST): the header height is settled from the environment at
    // boot and may not be a setting, and "上部に使った高さはそのまま日程表から
    // 引かれる". So a header that changed height changed the screen dimensions
    // in the sense FT-3 means -- leaving the old picture up shows a schedule
    // sized to a screen that no longer exists (NFR-011).
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const before = loop.current()!.regions.scheduleCanvas.height

    loop.resize({ ...SCREEN, appHeaderHeight: 40 })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(2)
    expect(screen.screens()).toBe(2)
    expect(loop.current()!.regions.appHeader.height).toBe(40)
    expect(loop.current()!.regions.scheduleCanvas.height).toBeGreaterThan(before)
  })

  it('FT-3: GIVEN only the scrollbar thickness changed THEN a frame runs', () => {
    // Same MUST of FR-051: the thickness is settled from the environment, not
    // held as a setting, and it takes its place from the `Row Area` -- so a
    // thicker bar shrinks the drawing area and the picture is no longer right.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN, screen.wiring)
    const before = loop.current()!.regions.rowArea.width

    loop.resize({ ...SCREEN, scrollbarThickness: 16 })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(2)
    expect(screen.screens()).toBe(2)
    expect(loop.current()!.regions.rowArea.width).toBeLessThan(before)
  })

  it('FR-051: GIVEN a host reporting a header taller than S-116 THEN the cap is what is used', () => {
    // FR-051 (MUST): "`App Header` の高さは、`_assets/tbl-settings.md` の表
    // T-212 が持つ上限を超えないこと". S-116 `appHeaderMaxHeight` = 56 px, and
    // ⚠️ FR-051 says in as many words that it "はその上限であって、高さそのもの
    // ではない" -- so 40 above is used as it stands and 80 here is not.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(
      pane.surface,
      twoRowDocument(),
      { ...SCREEN, appHeaderHeight: 80 },
      screen.wiring,
    )
    const regions = loop.current()!.regions

    expect(regions.appHeader.height).toBe(APP_HEADER_MAX_HEIGHT)
    expect(regions.scheduleCanvas.y).toBe(APP_HEADER_MAX_HEIGHT)
    expect(regions.scheduleCanvas.height).toBe(SCREEN.height - APP_HEADER_MAX_HEIGHT)
  })

  it('FR-051: GIVEN a header of exactly S-116 THEN it is used whole (the boundary)', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(
      pane.surface,
      twoRowDocument(),
      { ...SCREEN, appHeaderHeight: APP_HEADER_MAX_HEIGHT },
      screen.wiring,
    )

    expect(loop.current()!.regions.appHeader.height).toBe(APP_HEADER_MAX_HEIGHT)
  })
})

describe('FR-038 -- the display language is the environment, not the document', () => {
  it('GIVEN either language WHEN the frame is drawn THEN the document holds no language', () => {
    // FR-038's RATIONALE (MUST NOT): "どの言語で開くかは読む人の環境であり、
    // 文書に保存しない". The settings table says the same from the other side --
    // S-99 `language` is 「別枠。`localStorage` に置く。」, so no key of table
    // T-203 carries it and the loop may not put one there.
    for (const language of ['ja', 'en'] as const) {
      const pane = host()
      const screen = screenPane(language)
      // ⚠️ The baseline is a COPY taken before the loop ran: the loop answers
      // with the very object it was handed, so comparing it against itself
      // would pass whatever the loop wrote into it.
      const opened = twoRowDocument()
      const asOpened = structuredClone(settingsOf(opened))
      const loop = frameLoop(pane.surface, opened, SCREEN, screen.wiring)
      pane.runAnimationFrames()

      expect(screen.screens()).toBe(1)
      expect(Object.keys(settingsOf(loop.document()))).not.toContain('language')
      expect(settingsOf(loop.document())).toEqual(asOpened)
    }
  })

  it('GIVEN the language chosen for this session THEN it reaches the 曜日 and nothing else of the picture', () => {
    // ⛔ THIS CASE USED TO DEMAND THE WHOLE PICTURE BE THE SAME STRING EITHER
    // WAY, on a comment quoting FR-038 as 「日程表の出力に言語は含まれない」.
    // ⚠️ NO SUCH SENTENCE IS IN docs/spec. What FR-038's RATIONALE says is the
    // opposite of a picture with no words in it:
    //
    //   「⚠️ **日程表の出力のうち言語に依るのは、目盛の第 4 段の曜日だけである**
    //     （`FR-017`）—— **どの語で刷ったかは文書に残らない。**」
    //
    // ⭐ So the promise has two halves and this case drives both: the 曜日 DOES
    // follow the session's language, and it is the only thing in the picture
    // that does. FR-017 (MUST) is where that 段 stands -- 「曜日の段は曜日」を
    // 1 段に持つ -- and it hands the words themselves back to FR-038:「⭐ **曜日
    // の語がどこに住むかは `FR-038` が持つ。**」, which Chapter 6.2 puts in one
    // dictionary and PI-37 publishes as `rulerWeekdayWords`（「目盛の第 4 段が
    // 刷る曜日 7 語。表示言語ごと」）.
    //
    // ⚠️ The words are NOT typed in here. FR-038 (MUST NOT):「要求にも表にも語
    // そのものを書いてはならない」, so there is no row to read one from; what a
    // case may do is ask PI-37 for the roster of each language and hold the
    // picture against it. ⛔ The second half of the old comment -- that the
    // dictionary is empty and both languages print the same empty strings --
    // is false as well: PD-160 records 「2026-08-24 実測: 枠は 242、記入も 242」.
    const pane = host()
    const japanese = screenPane('ja')
    const english = screenPane('en')

    // ⭐ The premise, asked of the dictionary rather than assumed: two languages
    // that spelt a weekday alike would make every expectation below vacuous.
    const inJa = rulerWeekdayWords('ja')
    const inEn = rulerWeekdayWords('en')
    // PI-37 of 表 T-064:「`rulerWeekdayWords`（目盛の第 4 段が刷る曜日 7 語。
    // 表示言語ごと。`FR-017` ／ `FR-038`）」.
    expect([inJa.length, inEn.length], 'PI-37: 曜日 7 語、表示言語ごと').toEqual([7, 7])
    expect(
      inJa.filter((word) => inEn.includes(word)),
      'FR-038: 2 言語が同じ綴りの曜日を持つと、以下は何も測らない',
    ).toEqual([])

    const inJapanese = frameLoop(pane.surface, shortDocument(), SCREEN, japanese.wiring)
    const drawnInJapanese = pane.drawn[0] ?? ''
    const inEnglish = frameLoop(pane.surface, shortDocument(), SCREEN, english.wiring)
    const drawnInEnglish = pane.drawn[1] ?? ''

    // ⭐ 「どの語で刷ったか」 is the ONLY thing that may differ, so the two
    // pictures with every printed word taken out of them are one string: every
    // rule, every rectangle, every attribute and the order they are written in.
    expect(
      withoutWords(drawnInEnglish),
      'FR-038: 語のほかに言語で動くものは無い',
    ).toBe(withoutWords(drawnInJapanese))

    // ⭐ ...and neither the layout nor the regions carry the choice at all --
    // 「文書に保存しない」 leaves nothing for them to be measured from.
    expect(inEnglish.current()!.layout).toEqual(inJapanese.current()!.layout)
    expect(inEnglish.current()!.regions).toEqual(inJapanese.current()!.regions)

    // ⚠️ Which 段階 the picture is drawn on is not the language's either, and
    // the case needs the finest one: FR-017 gives the 曜日 a 段 there and
    // nowhere else. `shortDocument` is what buys it -- FR-055 fits an extent of
    // one working week to the whole `Row Area`, and that px/day is far above
    // 表 T-205 の `S-85`. (The equality just above covers the 段階 itself:
    // `tier` is a member of the layout.)
    const printedInJapanese = labelsInOrder(drawnInJapanese)
    const printedInEnglish = labelsInOrder(drawnInEnglish)
    expect(printedInEnglish.length, '同じ 段階 なので目盛ラベルの数は同じである').toBe(
      printedInJapanese.length,
    )

    // ⭐ The language actually arrived: each picture carries the roster of the
    // language its own screen was opened in, and none of the other's.
    // ⚠️ CARRIES, not equals. Whether the 曜日 stands alone on a 段 of its own
    // is FR-017's, and tests/unit/uf-32-ruler-band.test.ts is the file that
    // drives it; measuring it a second time here would make one defect fail two
    // files. What is UF-48's is which words got there.
    for (const one of [
      { language: 'ja', printed: printedInJapanese, own: inJa, other: inEn },
      { language: 'en', printed: printedInEnglish, own: inEn, other: inJa },
    ]) {
      expect(
        one.printed.filter((label) => weekdaySlotIn(label, one.own) >= 0).length,
        `FR-017 / FR-038: ${one.language} の画面の第 4 段は ${one.language} の曜日を刷る`,
      ).toBeGreaterThan(0)
      expect(
        one.printed.filter((label) => weekdaySlotIn(label, one.other) >= 0),
        `FR-038 (MUST): 言語の状態は 1 つである -- ${one.language} の画面に他方の語は出ない`,
      ).toEqual([])
    }

    // ⭐ And every label that moved is the SAME weekday in the other roster,
    // with the rest of the label unchanged -- 「言語に依るのは…曜日だけである」
    // read label by label.
    const moved = printedInJapanese
      .map((label, at) => ({ at, label, other: printedInEnglish[at] ?? '' }))
      .filter((one) => one.label !== one.other)
    for (const one of moved) {
      const slot = weekdaySlotIn(one.label, inJa)
      expect(
        slot,
        `FR-038: ${one.at} 番目のラベルが言語で動いた -- 曜日を含まねばならない`,
      ).toBeGreaterThanOrEqual(0)
      expect(
        weekdaySlotIn(one.other, inEn),
        `FR-038: ${one.at} 番目のラベルは、他方の言語では同じ曜日である`,
      ).toBe(slot)
      expect(
        one.other.replace(inEn[slot] ?? '', '').trim(),
        `FR-038: ${one.at} 番目のラベルは、曜日のほかは言語で動かない`,
      ).toBe(one.label.replace(inJa[slot] ?? '', '').trim())
    }
  })
})

describe('NFR-011 and FT-2 -- the description is whole, and it describes THIS document', () => {
  const named = (title: string) =>
    twoRowDocument((draft) => {
      draft.schedule.project.title = title
    })

  it('NFR-011: GIVEN the first frame THEN no member of the description is missing', () => {
    // NFR-011 (MUST NOT): "空白のまま残る画面も、内容が欠けたまま出る画面も出さ
    // ないこと". ⚠️ The members that may be `null` are the ones a requirement
    // says are absent -- a closed properties panel (FR-072), a hidden palette
    // (S-99e), no open surface (S-99g), the `Agent API` off (FR-066), nothing
    // waiting to be answered (NT-7). The rest are always there.
    const pane = host()
    const screen = screenPane()
    frameLoop(pane.surface, named('Under test'), SCREEN, screen.wiring)
    const view = screen.last()

    expect(view.frame).toBeDefined()
    expect(view.appHeaderItems).toBeDefined()
    expect(view.rowTitlePanel).toBeDefined()
    expect(Array.isArray(view.notices)).toBe(true)
    expect(Array.isArray(view.tooltips)).toBe(true)
  })

  it('GIVEN a document with a title and two rows THEN the description carries both', () => {
    // ⛔ The wiring is what this measures. `Project.title` (AT-3) is the
    // `Document Title` (U-27) the `App Header` shows, and the two rows are what
    // the `Row Title Panel` (U-22) lists -- so a loop that handed the surface an
    // empty schedule, or last frame's, would answer with neither.
    const pane = host()
    const screen = screenPane()
    frameLoop(pane.surface, named('Under test'), SCREEN, screen.wiring)
    const view = screen.last()

    expect(view.appHeaderItems.documentTitle).toBe('Under test')
    expect(titlesOf(view).map((title) => title.wholeLabel)).toEqual(['Alpha', 'Beta'])
  })

  it('FT-2: GIVEN the current value is replaced THEN the next description is of the new document', () => {
    // FT-2 of table T-078: "現在値の差し替え（表 T-067 の `WS-6`）". LY-5 makes
    // this layer the only holder of a current value, so the description that
    // frame hands over is cut from the value that replaced it -- CA-4 forbids
    // one of the three being left as it was.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, named('First'), SCREEN, screen.wiring)
    expect(screen.last().appHeaderItems.documentTitle).toBe('First')

    loop.holdDocument(RESTORED(named('Second')))
    pane.runAnimationFrames()

    expect(screen.screens()).toBe(2)
    expect(screen.last().appHeaderItems.documentTitle).toBe('Second')
  })
})

// ===========================================================================
// 表 T-230 -- 「まるごと差し替えるときの呼び手ごとの扱い」
// ===========================================================================
//
// ⛔ THE TABLE IS THE AUTHORITY, AND IT IS READ AT LOAD TIME. Chapter 5.4 says
// 「文書をまるごと差し替える道も、本表の 7 つの順を踏む …… 呼び手ごとに違うのは
// 履歴・刻印・取り消しの 1 段の 3 つだけであり、それを 表 T-230 に示す」, so
// those three are what the cases below ask the loop for -- each one after
// asserting the CELL it is about, so that a manuscript which moves a cell
// reaches this file rather than sliding past it.
//
// ⚠️ THE SHELL PUBLISHES NEITHER THE HISTORY NOR ITS DEPTH, so the only way to
// ask what it holds is the application's own currency: write, undo, and see
// whether the current value moved. That is the same road
// tests/unit/uf-47-48-history-bytes.test.ts takes, and the two keys are read out
// of table T-036 rather than typed -- SK-20 「基準日線を出す / 消す」, which
// UN-13 of table T-027 makes a 対象 either way round, and SK-6 「元に戻す」.
//
// ⚠️ NOT ASSERTED: the difference between RD-4's 「捨てる」 and RD-6's
// 「空にする」. Both leave a history with nothing to undo, and that common ground
// is what is driven; a reading that tells the two words apart is written down
// nowhere. (tests/unit/uf-8-9-replace-document.test.ts records the same
// abstention for the same reason, one layer down.)

describe('表 T-230 -- the row the caller names settles the history, the stamp and the undo step', () => {
  const titled = (title: string) =>
    twoRowDocument((draft) => {
      draft.schedule.project.title = title
    })

  /** Presses SK-20 and refuses to go on if it left no 段 behind. */
  const writeOneStep = (loop: FrameLoop, what: string): void => {
    const before = stateOf(loop)
    loop.receiveInput(SK_20)
    expect(stateOf(loop), `${what}: SK-20 moved nothing, so it left no 段 to undo`).not.toEqual(
      before,
    )
  }

  it('the rows this member may stand in are the ones whose WS-3 column says the caller brings the document', () => {
    // 「`WS-3` の位置に立つのは本表がその欄に名指したものである（MUST）…… 「呼び
    // 手が持って来る」の行では、呼び手が渡した文書がそのまま `WS-3` の答えであ
    // る。」 `HeldDocumentCall` is declared as exactly these rows, so this is the
    // case that keeps the declaration and the manuscript pinned to each other.
    //
    // ⚠️ ONE ROW SINCE CR-280 TOOK 「自動保存」 OUT. RD-5 「自動保存からの復帰」
    // stood here beside RD-6 and left the table with the mechanism it named.
    expect(HELD_ROWS).toEqual(['RD-6'])
    expect(cellOf('RD-6', COL_WS3)).toBe('呼び手が持って来る')
    // ⛔ And the four this member does NOT offer are not in that column: RD-1
    // and RD-2 are reached from inside the loop, RD-3 and RD-4 need an
    // `ImportDocument` call nothing hands it.
    expect(T_230.rows.map((row) => row.id)).toEqual(['RD-1', 'RD-2', 'RD-3', 'RD-4', 'RD-6'])
  })

  for (const row of HELD_ROWS) {
    describe(`${row} -- ${cellOf(row, COL_HISTORY)} / ${cellOf(row, COL_STAMP)} / ${cellOf(row, COL_UNDO_STEP)}`, () => {
      it('履歴: what was there to undo before the replacement is not there after it', () => {
        // ⛔ THIS IS THE MANUSCRIPT MOVING, NOT AN EXPECTATION BENT TO THE CODE.
        // RD-6 「起動時の文書 | 呼び手が持って来る | 空にする | 入ってきたまま |
        // 積まない | `FR-062` ／ 表 T-034」. That cell is not RD-3's 「いまのもの
        // を残す」, so the 段 the write below leaves cannot survive the
        // replacement.
        expect(['捨てる', '空にする'], `表 T-230 ${row} の履歴`).toContain(
          cellOf(row, COL_HISTORY),
        )
        expect(cellOf(row, COL_HISTORY)).not.toBe(cellOf('RD-3', COL_HISTORY))

        const pane = host()
        const loop = frameLoop(pane.surface, titled('Before'), SCREEN)
        writeOneStep(loop, row)

        loop.holdDocument(bringing(row, titled('Brought')))
        const landed = stateOf(loop)
        expect(landed.title).toBe('Brought')

        loop.receiveInput(SK_6)

        expect(stateOf(loop), 'the 段 written before the replacement was still there').toEqual(
          landed,
        )
      })

      it('取り消しの 1 段: the replacement itself is not a step, so one write leaves exactly one', () => {
        // 「`WS-4` は、本表の欄が「積まない」の行で取り消しの 1 段を積んではなら
        // ない（MUST NOT）—— 表 T-027 が分類しているのは人が文書に対して行う操作
        // であり、履歴を歩くこと自体はその対象ではない。」
        expect(cellOf(row, COL_UNDO_STEP), `表 T-230 ${row} の取り消しの 1 段`).toBe('積まない')

        const pane = host()
        const loop = frameLoop(pane.surface, titled('Before'), SCREEN)
        writeOneStep(loop, row)

        loop.holdDocument(bringing(row, titled('Brought')))
        const landed = stateOf(loop)
        writeOneStep(loop, row)

        // The one 段 that IS a 対象 comes back...
        loop.receiveInput(SK_6)
        expect(stateOf(loop)).toEqual(landed)
        // ...and there is nothing behind it. ⛔ A replacement that had pushed a
        // 段 of its own would walk back to 'Before' here, and a history that had
        // survived would walk back to what the first write left.
        loop.receiveInput(SK_6)
        expect(stateOf(loop), 'the replacement left a 段 of its own').toEqual(landed)
      })

      it('刻印: the stamp that lands is the one the document came in with', () => {
        // 「`WS-5` は、本表の刻印の欄が「進める」の行でだけ刻印を進めること
        // （MUST）。「入ってきたまま」の行で進めてはならない（MUST NOT）—— 取り
        // 消しは以前の文書を刻印ごと復元し（`FR-063`）、ファイルと起動テンプレー
        // トから来る文書は、書かれたときの刻印を持っていなければ `FR-063` の等値
        // の判定が意味を成さない。」
        expect(cellOf(row, COL_STAMP), `表 T-230 ${row} の刻印`).toBe('入ってきたまま')

        const stamp = {
          scheduleUpdatedUtc: '2026-01-02T03:04:05Z',
          settingsUpdatedUtc: '2026-01-02T03:04:05Z',
          lastEditedBy: 'whoever wrote the file',
        }
        const brought = twoRowDocument((draft) => {
          draft.schedule.project.title = 'Brought'
          draft.documentStamp = { ...stamp }
        })
        expect(validateDocument(brought).valid).toBe(true)

        const pane = host()
        const loop = frameLoop(pane.surface, titled('Before'), SCREEN)
        // ⛔ The premise: a write of the loop's own has already moved the stamp,
        // so a stamp that were advanced again on the way through would differ
        // from the one handed over in all three of its members.
        writeOneStep(loop, row)
        expect((loop.document() as any).documentStamp).not.toEqual(stamp)

        loop.holdDocument(bringing(row, brought))

        expect((loop.document() as any).documentStamp).toEqual(stamp)
      })
    })
  }
})
