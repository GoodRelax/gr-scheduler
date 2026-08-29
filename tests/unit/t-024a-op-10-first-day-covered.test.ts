// What 「その文書が覆う最初の日」 counts, and what it MUST NOT -- the sentence
// the user ruled into OP-10 of 表 T-024a on 2026-08-29.
//
// The unit driven is UF-48 `frame-loop.ts` (CP-25 of table T-062), whose
// `frameLoop` takes BT-4 of table T-034 as its `startedFromTemplate` argument
// and answers what one frame computed on `current()`. OP-10's ⛔⛔ excludes a
// document opened from BT-4 from the fit, and then says what to draw instead --
// so that argument is the only road to the sentence this file is about.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: the body that wrote a
// unit does not write its test; what may be read is the head comment, the
// published types and the signatures.)
//
// Exported declarations read, and nothing else:
//   frame-loop.ts        `FrameEnvironment`, `FrameValues`, `FrameLoop`, and
//                        the one signature `frameLoop(surface, first, env,
//                        screen?, files?, showPointerShape?, clipboard?,
//                        startedFromTemplate?)`
//   schedule-layout.ts   `ScheduleLayout.originDay` -- 「The day the left edge
//                        of the Row Area points at (S-77)」, `CalendarDay | null`
//   schedule.ts          `CalendarDay`, `textOfDay`, and the entity types this
//                        fixture writes out
// ⛔ NOT ONE EXPECTED VALUE BELOW CAME OUT OF A BODY. Every day asserted is a
// day THIS FILE put into the fixture, and which of them is owed is decided by
// OP-10's own definition, quoted where it is used.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-024a OP-10  the ⛔⛔ that keeps the fit off a BT-4 document, and then:
//           「⭐ そのときは、その文書が覆う最初の日と、行の木の先頭から描くこと
//           （MUST）—— 倍率は文書が持つものをそのまま使う。⛔ 日も行 ID も新しく
//           持たせてはならない（MUST NOT）—— どちらも文書から導ける。
//           ⭐ 「その文書が覆う最初の日」とは、その文書の `Task` が持つ `start`
//           と `actualStart` のうち最も早い日のことである（MUST）（利用者の裁定
//           2026-08-29）。⛔ 注記（`HighlightBox` / `CommentBox`）の日付と、暦の
//           例外日（`Exception.fromDate`）を数えてはならない（MUST NOT）——
//           注記は書き出されないので、数えると同じ日程を MSPDI で往復させただけ
//           で初回の表示位置が変わる。……⚠️ `Task` を 1 件も持たない文書には、
//           直前の ⛔⛔ が定める `BT-4` の除外を働かせないこと（MUST）—— 覆う日を
//           数える対象が無い。⛔ 代わりの日を発明しない（MUST NOT）。⇒ ⭐ その
//           ような文書は本行の冒頭にもどり、`FR-055` の全体表示が選ぶ倍率と表示
//           位置になる（MUST）」
//   FR-055  what the fit chooses when there is nothing to fit: 「描くものが 1 つ
//           も無い文書では、倍率を等倍に戻し、表示位置を `scrollDate` に合わせる
//           こと（MUST）。`scrollDate` が `null` のときは実行日に合わせてよい
//           （MAY）—— 実寸が 0 だと収める倍率が決まらない」, and 「測る対象は
//           描画の実寸とし、算入するものは表 T-038 に従うこと（MUST）」.
//   T-038   every row of it is a part of a `Task`, which is why a document with
//           no `Task` has no extent to fit.
//   T-024a OP-10  its first sentence, which is why the fixture's stored place
//           must be null for any of this to run: 「表示位置が `null`、または指す
//           行が存在しないとき」
//   T-034  BT-4  「初期表示用のテンプレート（`FR-027`）」 -- the seat OP-10
//           excludes by name, and what `startedFromTemplate` says.
//   T-203  S-77 `scrollDate` / S-78 `scrollGroupId` -- the stored place.
//   T-058  AT-28 `start` / AT-34 `actualStart` -- the two columns the definition
//           names; AT-31 `deadline`, AT-29 `finish`, AT-36 `actualFinish` and
//           AT-37 `resume` are Task date columns it does NOT name.
//   T-058  AT-113 `CommentBox.anchorDate`, AT-117 `HighlightBox.startDate`,
//           AT-79 `Exception.fromDate` -- the three the MUST NOT lists.
//
// ---------------------------------------------------------------------------
// HOW THE EXPECTED VALUES WERE OBTAINED
// ---------------------------------------------------------------------------
// Each case builds a document whose days IT chose, and asks for the one day
// OP-10's definition picks out of them. The "must not count" cases are built by
// taking the base document and adding ONE date that is earlier than every day
// the definition counts: the owed answer is therefore the base document's
// answer, unchanged, and a failure names exactly which column was counted.
// ⛔ No figure is copied from `src/` and none is read from a settings table --
// this row's answer is a day the document itself carries.
//
// ⚠️ ONE CASE READS THE CLOCK, AND IT IS THE ONLY ONE THAT MAY. FR-055's 実行日
// is the day the program is RUN, so there is no document to take it from and no
// seam to inject it through -- `frameLoop` takes no `today`. It is therefore
// derived here the way 5.4 derives a day, and the two hazards that carries are
// both closed where it is used: see `runDayOf`.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - 「行の木の先頭から描く」, the vertical half of the same sentence, and the
//     ⛔⛔ exclusion itself. Both are already driven on the SHIPPED template by
//     tests/unit/fr-027-startup-shows-its-depth.test.ts, and nothing here
//     repeats a case of that file.
//   - The branch where OP-10 DOES run (a null place on a document that did not
//     come from BT-4, and a `scrollGroupId` naming no row).
//     tests/unit/uf-47-48.test.ts owns those three.
//   - 「別の文書を開いた時点でこの除外は解けること（MUST）」 and the ⭐ that
//     undo / redo / merge do not lift it. Those are about a SECOND document
//     arriving, which is table T-230's road and not this row's definition.
//   - 「倍率は文書が持つものをそのまま使う」 -- the zoom on the BT-4 branch,
//     which is fr-027's.
//   - ⚠️ WHICH day the fit takes when only the ROW half of the place dangles --
//     `scrollDate` holding a day while `scrollGroupId` names no row, on a
//     document with nothing drawn. OP-10 fires on that, and FR-055 then says
//     「表示位置を `scrollDate` に合わせる」; but whether the day half survives a
//     place OP-10 has just called unusable is not settled anywhere. ⛔ STILL A
//     HOLE, and the empty-document cases below stay on the `null` side of it,
//     where the MUST and its MAY leave exactly two answers.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { textOfDay, type Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

// ===========================================================================
// The row, read out of the manuscript rather than copied
// ===========================================================================

const T_024A = specTable('T-024a')

const RULE_COLUMN = ((): string => {
  const found = T_024A.headings.find((heading) => heading.includes('規則'))
  if (found === undefined) throw new Error('table T-024a has no 規則 column')
  return found
})()

const OP_10 = ((): string => {
  const found = T_024A.rows.find((row) => row.id === 'OP-10')
  if (found === undefined) throw new Error('table T-024a has no row OP-10')
  return found.by[RULE_COLUMN] ?? ''
})()

// ===========================================================================
// The document these cases drive
// ===========================================================================

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of. The calendar,
// the project and the settings come from it, because those are the ones the
// specification has decided; the rows, the Tasks and the annotations are
// written out here so that every day counted can be named.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

/** A stored date column, written the way the startup template writes one. */
const stored = (day: string): string => `${day}T00:00:00`

/** The day part of a stored date. */
const dayPart = (value: string): string => value.slice(0, 10)

/**
 * 実行日 -- the calendar day of the host running this case, spelt the way a
 * date column is spelt.
 *
 * ⛔ NOT `toISOString().slice(0, 10)`, WHICH IS WHAT THIS CASE ROTTED ON.
 * That reads the day in UTC, and 5.4 (FR-054) forbids reaching a day by
 * converting a time zone: 「交換相手の値から日を取るときは、字面の日付の部分を
 * 取ること（MUST）。時差を換算してはならない（MUST NOT）—— 換算すると、書き出した
 * 日が取り込んだ日と 1 日ずれる」. A host east of UTC therefore spends the first
 * hours of every day disagreeing with itself, and one midnight this case held
 * the UTC day while the frame drew the host's own. `getFullYear` /
 * `getMonth` / `getDate` are the local calendar's own three numbers, which is
 * the 字面 the rule asks for.
 *
 * ⚠️ THE SECOND HAZARD IS THE CLOCK MOVING MID-CASE, and the case that uses
 * this closes it by sampling either side of the boot and accepting both -- a
 * boot that straddles midnight is a real run of the program, not a defect, and
 * the answer it gives is right on whichever side it read.
 */
const runDayOf = (at: Date): string =>
  `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(
    at.getDate(),
  ).padStart(2, '0')}`

const ROW_ONE = '3a000000-0000-4000-8000-000000000001'
const ROW_TWO = '3a000000-0000-4000-8000-000000000002'

/**
 * The days the base document is built out of.
 *
 * ⭐ `EARLIEST_ACTUAL_START` is deliberately EARLIER than every `start`: it is
 * the half of the definition a document could not otherwise tell apart, since
 * a plan that begins before every actual answers the same day whichever of the
 * two columns is counted.
 */
const EARLIEST_START = '2026-04-06'
const LATER_START = '2026-04-10'
const EARLIEST_ACTUAL_START = '2026-04-03'

/**
 * A day earlier than anything the definition counts. Every 「数えてはならない」
 * case puts exactly this day into one column that the definition does not name,
 * so that counting it would move the answer and nothing else would.
 */
const NOT_COUNTED = '2026-01-05'

/**
 * A zoom that is NOT 等倍, stored by the documents with nothing drawn.
 *
 * ⭐ FR-055 (MUST) 「倍率を等倍に戻し」 says nothing at all about a document that
 * already stood at 等倍, and the shipped template stands at exactly that -- so
 * the case that reads the zoom has to hand it a document to come back FROM.
 * ⚠️ The two figures are this file's own, not the manuscript's: S-97 and S-98
 * bound the zoom and nothing here reads either, so what matters is only that
 * they are not 1.
 */
const STORED_ZOOM_X = 3
const STORED_ZOOM_Y = 2

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

/**
 * Two rows, two Tasks, and whatever one case adds.
 *
 * ⚠️ IV-6 (each Task named by exactly one member), IV-2 (every reference
 * resolves) and IV-10 (finish is not before start) hold by construction, and
 * `validateDocument` keeps the shape honest -- a case at the head of this file
 * runs it, so a fixture that stopped being a document fails there by name.
 */
function documentOf(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100 },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task({ uid: 1, name: 'One', start: stored(EARLIEST_START), finish: stored('2026-04-24') }),
        task({
          uid: 2,
          name: 'Two',
          start: stored(LATER_START),
          finish: stored('2026-04-30'),
          actualStart: stored(EARLIEST_ACTUAL_START),
          // In WORKING days -- `actualDuration` is counted in them (FR-011).
          actualDuration: 5,
          percentComplete: 20,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [group(ROW_ONE, 0, 'One'), group(ROW_TWO, 1, 'Two')],
      taskGroupMembers: [
        { taskUid: 1, groupId: ROW_ONE, stackOrder: null },
        { taskUid: 2, groupId: ROW_TWO, stackOrder: null },
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
 * Copied, unchanged, from tests/unit/uf-47-48.test.ts.
 */
function host(): {
  readonly surface: { showSvg(svg: string): void }
  readonly drawn: string[]
  runAnimationFrames(): void
} {
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
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

/** What one boot drew: the zoom and the place, which is what OP-10 decides. */
interface DrawnPlace {
  /** S-1 times `zoomX` -- the width of one day, and so the zoom in force. */
  readonly pxPerDay: number
  /** S-77's half of the place, as a day. */
  readonly origin: string | null
  /** S-78's half: the row the frame drew first. */
  readonly topRow: string | null
}

/**
 * One boot, and what its first frame drew from.
 *
 * ⭐ `startedFromTemplate` is BT-4 of table T-034 being told to the boot: OP-10
 * excludes 「表 T-034 の `BT-4`（起動テンプレート）から開いた文書」 and nothing
 * else, so the sentence this file is about is unreachable without it. The
 * cases that ask what the row does when the exclusion does NOT operate pass
 * `false`, which is BT-1 / BT-2 -- an opened file.
 */
function frameOfBoot(document: Document, fromTemplate: boolean): DrawnPlace {
  const pen = host()
  const loop = frameLoop(
    pen.surface as any,
    document,
    SCREEN,
    undefined,
    undefined,
    undefined,
    undefined,
    fromTemplate,
  )
  pen.runAnimationFrames()
  const values = loop.current()
  if (values === null) throw new Error('BO-1 settled no size, so no frame was drawn')
  const origin = values.layout.originDay
  return {
    pxPerDay: values.layout.pxPerDay,
    // `textOfDay` answers the stored spelling, which carries a time part the
    // schedule never interprets (FR-054, MUST NOT). The day is what is compared.
    origin: origin === null ? null : dayPart(textOfDay(origin)),
    topRow: values.layout.rows[0]?.groupId ?? null,
  }
}

/** The day a BT-4 boot drew from. */
const originOfBoot = (document: Document): string | null => frameOfBoot(document, true).origin

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('表 T-024a OP-10 -- the manuscript this file is driven by', () => {
  it('still defines 「その文書が覆う最初の日」 as the earliest `start` or `actualStart`', () => {
    expect(OP_10).toContain('その文書が覆う最初の日')
    expect(OP_10).toContain('`Task` が持つ `start` と `actualStart` のうち最も早い日')
  })

  it('still forbids counting the annotations and the calendar exception days (MUST NOT)', () => {
    expect(OP_10).toContain('数えてはならない（MUST NOT）')
    expect(OP_10).toContain('`HighlightBox`')
    expect(OP_10).toContain('`CommentBox`')
    expect(OP_10).toContain('`Exception.fromDate`')
  })

  it('still says what a document holding no `Task` does', () => {
    expect(OP_10).toContain('`Task` を 1 件も持たない文書')
    expect(OP_10).toContain('数える対象が無い')
    expect(OP_10).toContain('代わりの日を発明しない')
  })

  it('still excludes a BT-4 document from the fit, which is the branch these cases drive', () => {
    expect(OP_10).toContain('`BT-4`')
    expect(OP_10).toContain('働かせてはならない（MUST NOT）')
  })
})

describe('the fixture these cases stand on', () => {
  it('is a `GRS JSON` document', () => {
    const report = validateDocument(documentOf())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('stores no place, so OP-10 is the row that decides where the first frame starts', () => {
    // OP-10's first sentence: 「表示位置が `null`、または指す行が存在しないとき」.
    // A template that filled either in would send every case below down a
    // branch none of them is about, without changing a line of them.
    const settings = (documentOf() as any).documentSettings
    expect(settings.scrollDate).toBeNull()
    expect(settings.scrollGroupId).toBeNull()
  })

  it('carries an `actualStart` earlier than every `start`, which is what makes the two columns tell apart', () => {
    const tasks = (documentOf() as any).schedule.tasks as Task[]
    const starts = tasks.map((one) => dayPart(one.start as string))
    const actuals = tasks.flatMap((one) =>
      one.actualStart === null ? [] : [dayPart(one.actualStart)],
    )
    expect(actuals).toContain(EARLIEST_ACTUAL_START)
    expect(starts.every((one) => one > EARLIEST_ACTUAL_START)).toBe(true)
  })
})

// ===========================================================================
// 「その文書の `Task` が持つ `start` と `actualStart` のうち最も早い日」
// ===========================================================================

describe('OP-10 -- which days 「その文書が覆う最初の日」 counts', () => {
  it('takes an `actualStart` that begins before every `start`', () => {
    // The definition names TWO columns. This document's earliest `start` is
    // 2026-04-06 and its earliest `actualStart` is 2026-04-03, so a first day
    // taken from the plan alone would answer the later of the two.
    expect(originOfBoot(documentOf())).toBe(EARLIEST_ACTUAL_START)
  })

  it('takes the earliest `start` when no actual begins earlier', () => {
    // The other half of the same definition, on a document where no Task has
    // been started at all (PS-1 of table T-019a for both).
    const noActuals = documentOf((draft) => {
      for (const one of draft.schedule.tasks) {
        one.actualStart = null
        one.actualDuration = null
        one.percentComplete = 0
      }
    })
    expect(originOfBoot(noActuals)).toBe(EARLIEST_START)
  })
})

// ===========================================================================
// 「注記の日付と、暦の例外日を数えてはならない（MUST NOT）」
// ===========================================================================

describe('OP-10 -- the days it MUST NOT count', () => {
  it('does not count a `CommentBox` anchorDate (MUST NOT)', () => {
    // 「注記は書き出されないので、数えると同じ日程を MSPDI で往復させただけで
    // 初回の表示位置が変わる」.
    const withNote = documentOf((draft) => {
      draft.schedule.commentBoxes.push({
        id: '3b000000-0000-4000-8000-000000000001',
        leaderShapeKind: 'polyline',
        text: 'Note',
        anchorDate: stored(NOT_COUNTED),
        anchorGroupId: ROW_ONE,
        bodyOffsetPx: null,
      })
    })
    expect(originOfBoot(withNote)).toBe(EARLIEST_ACTUAL_START)
  })

  it('does not count a `HighlightBox` startDate (MUST NOT)', () => {
    const withBox = documentOf((draft) => {
      draft.schedule.highlightBoxes.push({
        id: '3c000000-0000-4000-8000-000000000001',
        startDate: stored(NOT_COUNTED),
        endDate: stored('2026-01-20'),
        topGroupId: ROW_ONE,
        bottomGroupId: ROW_TWO,
        strokeColor: null,
        cornerRadiusPx: null,
      })
    })
    expect(originOfBoot(withBox)).toBe(EARLIEST_ACTUAL_START)
  })

  it('does not count a calendar `Exception.fromDate` (MUST NOT)', () => {
    // 「例外日は同じ列の備考が自ら「繰り返しの起点であって実日付の範囲ではない」
    // と述べており、日付の範囲として数えられる列ではない」.
    const withException = documentOf((draft) => {
      const calendar = draft.schedule.calendars[0]
      calendar.exceptions = [
        {
          ordinal: calendar.exceptions.length,
          name: 'A day the whole company is away',
          fromDate: stored(NOT_COUNTED),
          toDate: stored(NOT_COUNTED),
          dayWorking: false,
          recurrenceKind: 1,
          carry: {},
          carryElements: [],
        },
        ...calendar.exceptions,
      ]
    })
    expect(originOfBoot(withException)).toBe(EARLIEST_ACTUAL_START)
  })

  it('does not count `Task.deadline` -- the definition names two columns and that is not one', () => {
    // AT-31. A deadline already past is an ordinary document (no invariant of
    // table T-220 forbids one), and it is the one Task date column that can
    // stand before `start` without the document ceasing to make sense.
    const withDeadline = documentOf((draft) => {
      draft.schedule.tasks[0].deadline = stored(NOT_COUNTED)
    })
    expect(originOfBoot(withDeadline)).toBe(EARLIEST_ACTUAL_START)
  })

  it('does not count `Project.startDate` -- the definition counts what a `Task` holds', () => {
    // 「その文書の `Task` が持つ」. The project's own start is neither of the two
    // columns, and a document whose Tasks all begin later than it is ordinary.
    const withProjectStart = documentOf((draft) => {
      draft.schedule.project.startDate = stored(NOT_COUNTED)
    })
    expect(originOfBoot(withProjectStart)).toBe(EARLIEST_ACTUAL_START)
  })
})

// ===========================================================================
// 「`Task` を 1 件も持たない文書では…… 代わりの日を発明しない」
// ===========================================================================

describe('OP-10 -- a document that holds no `Task`', () => {
  /**
   * No `Task`, and so nothing to count -- but the rows are still there.
   * ⚠️ Used only by the 「本行の冒頭にもどり」 case, which is a RELATION and does
   * not need 「描くもの」 to have been decided one way or the other.
   */
  const emptyOfTasks = (): Document =>
    documentOf((draft) => {
      draft.schedule.tasks = []
      draft.schedule.taskGroupMembers = []
      // So that 「倍率を等倍に戻し」 would be visible if it applied here too.
      draft.documentSettings.zoomX = STORED_ZOOM_X
      draft.documentSettings.zoomY = STORED_ZOOM_Y
    })

  /**
   * No `Task` and no row either -- 「描くものが 1 つも無い文書」 in FR-055's own
   * words, with nothing left that any table asks to be drawn.
   *
   * ⭐ WHY THE ROWS GO TOO. Table T-038, which FR-055 (MUST) measures by, lists
   * only the parts of a `Task`; a document with rows and no `Task` has no
   * horizontal extent either, but whether its bands count as 「描くもの」 is not
   * something any row settles. Taking the rows out removes the question.
   * ⭐ AND WHY THE ZOOM IS NOT 1. 「倍率を等倍に戻し」 says nothing at all on a
   * document that already stood at 等倍.
   */
  const nothingDrawn = (): Document =>
    documentOf((draft) => {
      draft.schedule.tasks = []
      draft.schedule.taskGroupMembers = []
      draft.schedule.taskGroups = []
      // ⭐ The Status Line goes too. FR-046 draws one while `Project.statusDate`
      // holds a day, and this fixture must leave nothing on the canvas that
      // anyone could call 「描くもの」.
      // ⛔ `Project.startDate` deliberately STAYS: whether that column may
      // decide the place is the question the last case asks.
      draft.schedule.project.statusDate = null
      draft.documentSettings.zoomX = STORED_ZOOM_X
      draft.documentSettings.zoomY = STORED_ZOOM_Y
    })

  it('is a `GRS JSON` document, so the cases below are about the row and not the shape', () => {
    for (const document of [emptyOfTasks(), nothingDrawn()]) {
      const report = validateDocument(document)
      expect(report.errors).toEqual([])
      expect(report.valid).toBe(true)
    }
  })

  it('still boots and still draws a frame', () => {
    // 「数える対象が無い」 is something the row says happens, not something it
    // refuses: the boot order of table T-077 runs to BO-5 either way.
    const pen = host()
    const loop = frameLoop(
      pen.surface as any,
      nothingDrawn(),
      SCREEN,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    )
    pen.runAnimationFrames()
    expect(loop.current()).not.toBeNull()
    expect(pen.drawn.length).toBeGreaterThan(0)
  })

  it('goes back to the head of the row: BT-4 draws it exactly as a document with no exclusion would', () => {
    // ⇒ 「そのような文書は本行の冒頭にもどり、`FR-055` の全体表示が選ぶ倍率と
    // 表示位置になる（MUST）」. The head of the row is what a document that was
    // NOT opened from BT-4 already gets, so the two boots must agree -- in the
    // zoom as well as the place. ⛔ A BT-4 branch still doing something of its
    // own here would part them.
    for (const document of [emptyOfTasks, nothingDrawn]) {
      expect(frameOfBoot(document(), true)).toEqual(frameOfBoot(document(), false))
    }
  })

  it('takes FR-055 zoom for a document with nothing drawn: 倍率を等倍に戻し (MUST)', () => {
    // FR-055 (MUST): 「描くものが 1 つも無い文書では、倍率を等倍に戻し……」 ——
    // 「実寸が 0 だと収める倍率が決まらない」. So one day is drawn S-1 wide and
    // not S-1 times the zoom this document stored.
    const drawn = frameOfBoot(nothingDrawn(), true)
    const settings = (nothingDrawn() as any).documentSettings
    expect(settings.zoomX, 'the fixture really stored a zoom that is not 等倍').toBe(STORED_ZOOM_X)
    expect(drawn.pxPerDay).toBe(settings.pxPerDayAt1x)
  })

  it('leaves the stored zoom alone while doing it -- OP-10 is on the reading side (FR-051)', () => {
    // FR-051: 「読む側の規則は表 T-024a の `OP-10` が持つ」, and HF-8 forbids the
    // boot discarding what the document says (MUST NOT). The frame draws at
    // 等倍; the document goes on saying what it said.
    const pen = host()
    const loop = frameLoop(
      pen.surface as any,
      nothingDrawn(),
      SCREEN,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    )
    pen.runAnimationFrames()
    const held = (loop.document() as any).documentSettings
    expect(held.zoomX).toBe(STORED_ZOOM_X)
    expect(held.zoomY).toBe(STORED_ZOOM_Y)
    expect(held.scrollDate).toBeNull()
    expect(held.scrollGroupId).toBeNull()
  })

  it('takes FR-055 place too: 表示位置を `scrollDate` に合わせる, and `null` may only become 実行日', () => {
    // OP-10 (MUST) sends this document back to the head of its own row:
    // 「そのような文書は本行の冒頭にもどり、`FR-055` の全体表示が選ぶ倍率と表示
    // 位置になる（MUST）」, having first forbidden the alternative outright:
    // 「⛔ 代わりの日を発明しない（MUST NOT）」.
    // FR-055 then says what the fit chooses when there is nothing to fit:
    // 「描くものが 1 つも無い文書では、倍率を等倍に戻し、表示位置を `scrollDate`
    // に合わせること（MUST）。`scrollDate` が `null` のときは実行日に合わせてよい
    // （MAY）」.
    // This document's `scrollDate` is `null` (pinned by the case above), so the
    // MUST leaves exactly two answers: no day at all, or the run day under the
    // MAY. ⛔ WHAT IT REFUSES is any other day of the document -- this fixture
    // still carries `Project.startDate` (AT-12), a column FR-055 never names,
    // table T-038 never draws and PF-8 keeps as profile text, and a frame that
    // drew from it would be placing the 代わりの日 the row forbids.
    //
    // ⚠️ THE RUN DAY IS SAMPLED EITHER SIDE OF THE BOOT and both are accepted.
    // 実行日 is the one value in this file that no document can carry, so it has
    // to come off the clock (`runDayOf` says why it is the LOCAL day and not the
    // UTC one); reading it once could disagree with a boot that happened on the
    // other side of a midnight. ⭐ Two samples make that disagreement impossible
    // without widening what the case accepts by a single further day.
    const before = runDayOf(new Date())
    const origin = originOfBoot(nothingDrawn())
    const after = runDayOf(new Date())
    expect(
      origin === null || origin === before || origin === after,
      `FR-055 (MUST/MAY) allows only null or the run day (${before} .. ${after}); ` +
        `the frame drew from ${origin}`,
    ).toBe(true)
  })
})
