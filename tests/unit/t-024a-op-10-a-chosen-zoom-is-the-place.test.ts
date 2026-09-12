// The two sentences the user ruled into `OP-10` of 表 T-024a on 2026-09-06:
// a person's choice of zoom or of place BECOMES the place, and the row is not
// redone every frame.
//
// The unit driven is UF-48 `single-html-shell` (CP-25 of table T-062), whose
// `frame-loop.ts` takes FT-1 of table T-078 -- 人の入力（ポインタとキー） -- on
// `receiveInput`, and answers what one frame computed on `current()`. OP-10
// decides what a frame draws from when the stored place is `null`, so the loop
// is the only seam where both halves of the ruling can be measured: what the
// press did, and what the frames AFTER it did to that.
//
// ---------------------------------------------------------------------------
// WHERE TABLE T-218 PUTS THIS FILE
// ---------------------------------------------------------------------------
// `TS-6`, tests/unit/ -- the inside of one unit, driven by values alone
// (vitest.config.ts lists the three Vitest places). ⛔ `TS-3` (tests/system/,
// Playwright) is not open to it: every case under `TS-3` is a `SW_SPEC_TEST` of
// Chapter 9 and `TW-2` of table T-219 requires each to take an `SWS-xxx` of
// Chapter 6.1 as its parent, and none of the eight `SW_SPEC` nodes reaches a
// zoom press. Chapter 7 says in as many words that having no receptacle does
// not excuse the case: 「⚠️ 受け皿が無いことは、書かなくてよいという意味では
// ない」.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: the body that wrote a
// unit does not write its test; what may be read is the head comment, the
// published types and the signatures.)
//
// Exported declarations read, and nothing else:
//   frame-loop.ts        `FrameEnvironment`, `FrameLoop`, `FrameValues`,
//                        `ScreenWiring`, and the one signature
//                        `frameLoop(surface, first, env, screen?, files?,
//                        showPointerShape?, clipboard?, startedFromTemplate?)`
//   input-source.ts      `HumanInput`, `InputModifiers`, `KeyInput`
//   screen-renderer.ts   `DisplayLanguage`, `ScreenPart`, `ScreenSurface`,
//                        `ScreenView`
//   schedule-layout.ts   `ScheduleLayout` (`pxPerDay`, `rectangleHeight`,
//                        `originDay`, `rows`)
//   document-settings.ts `DocumentSettings`
// ⛔ NOT ONE EXPECTED VALUE BELOW CAME OUT OF A BODY. Every assertion is either
// a sentence read out of the manuscript at run time, or a RELATION between two
// pictures this file made the program draw: the picture before a press against
// the picture after it, and the picture on one frame against the picture on the
// frames that follow with nothing pressed.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-024a OP-10  its condition -- 「表示位置が `null`、または指す行が存在しない
//           とき」 -- and the two clauses this file is for:
//           「⛔⛔ **人が倍率か表示位置を選んだときは、それを表示位置とすること
//           （MUST）**（利用者の裁定 2026-09-06）—— **選んだ時点で「人がまだ場所
//           を決めていない」ではなくなるので、本行の条件は成り立たなくなり、
//           全体表示はやり直されない。**⛔ **本行を毎フレームやり直しては
//           ならない（MUST NOT）** —— **本行は結果を定めるものであって、頻度を
//           定めるものではない。**」
//           and the measurement the ruling was made on: 「⚠️ 実測（2026-09-05、
//           出荷ビルド）: 毎フレームやり直していたので、人が書いた倍率が次の
//           フレームで上書きされ、`IC-12` / `IC-13` / `IC-15` / `IC-10` の 4 つ
//           とも絵を 1 度も動かさなかった。」
//   FR-055  what the row falls back to -- 「1 つの操作で、縦横の倍率と表示位置を
//           全体が収まる側へ合わせること」 -- and `HF-8` of table T-051, whose
//           MUST NOT the ruling explicitly does not move.
//   T-036   SK-16 (`Shift` ＋ `+` / `Shift` ＋ `-`, entrances IC-13 / IC-12),
//           SK-16a (`Alt` ＋ `+` / `Alt` ＋ `-`, entrances IC-15 / IC-14) and
//           SK-18 (`F`, entrance IC-10) -- the keys that reach the four
//           entrances the measurement names.
//   T-109   IC-10 全体を 1 画面に収める / IC-12 時間軸を縮小する /
//           IC-13 時間軸を拡大する / IC-15 行軸を拡大する.
//   T-203   S-77 `scrollDate` and S-78 `scrollGroupId` -- 表示位置, the pair
//           OP-10's condition reads and the ruling says a choice fills in.
//
// ---------------------------------------------------------------------------
// ⛔⛔ IC-14 IS NOT PRESSED HERE, AND THAT IS DELIBERATE
// ---------------------------------------------------------------------------
// OP-10 says so itself: 「⚠️ **`IC-14`（縮小）が動かないのは本行と別である** ——
// **行が既に `LF-3` の下限に座っており、縮める先が無い。**」 A case that pressed
// `Alt` ＋ `-` and demanded the picture move would be asserting the opposite of
// what the manuscript states, and a case that pressed it and demanded the
// picture NOT move would be this file holding `LF-3`'s floor, which is another
// file's row. ⇒ The row-axis entrance driven below is IC-15 alone.
//
// ---------------------------------------------------------------------------
// ⭐⭐ SEVEN CASES BELOW ARE RED ON PURPOSE, AND WHAT WAS MEASURED IS HERE
// ---------------------------------------------------------------------------
// CR-359 moved the sentences of `OP-10` and left the implementation to a later
// body: 「⭐ 裁定 1 の実装場所を仕様では指さない」. Measured here on
// 2026-09-06, at commit c782071, through the harness below:
//
//   one press of SK-16 (`Shift` ＋ `+`) writes `zoomX: 1 -> 1.1` into the
//   document, and the frame it asks for draws `pxPerDay` 18.67924528301887 --
//   the SAME number as before the press. `scrollDate` and `scrollGroupId` are
//   both still `null` afterwards.
//
// ⇒ The press is delivered and the zoom IS written; `OP-10` then runs again and
// draws over it, and the choice never becomes 表示位置. That is exactly the
// defect the row's own ⚠️ records (「人が書いた倍率が次のフレームで上書きされ」),
// and the two clauses this file holds are the ones that forbid it.
//
// ⛔ NOT ONE ASSERTION WAS WEAKENED TO MAKE A CASE PASS. A red case holds a
// clause as well as a green one and says the work is owed; the day the row
// stops being redone every frame, all seven go green with no edit here.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - WHICH day and WHICH row a press settles on. The ruling says the choice
//     becomes 表示位置; it does not say the place is the one the fit would have
//     chosen, and inventing an answer here would put a rule in a test that the
//     manuscript does not carry.
//   - The ⛔⛔ that keeps the row off a `BT-4` document, and the definition of
//     「その文書が覆う最初の日」. Those are
//     tests/unit/t-024a-op-10-first-day-covered.test.ts's, and every loop below
//     is booted with `startedFromTemplate` left off so the exclusion is not in
//     play at all.
//   - `HF-8` of table T-051. The ruling states it is not moved, and
//     tests/unit/uf-47-48.test.ts already holds it.
//   - The three branches where OP-10 DOES fire (a null place, and a
//     `scrollGroupId` naming no row). tests/unit/uf-47-48.test.ts owns those.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-source'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

// ===========================================================================
// 1. The two sentences, read out of the manuscript rather than believed
// ===========================================================================

const T_024A = specTable('T-024a')

const RULE_COLUMN = ((): string => {
  const found = T_024A.headings.find((heading) => heading.includes('規則'))
  if (found === undefined) throw new Error('table T-024a has no 規則 column')
  return found
})()

/** The 事項 column -- table T-024a puts each row's CONDITION there, not in 規則. */
const SUBJECT_COLUMN = ((): string => {
  const found = T_024A.headings.find((heading) => heading.includes('事項'))
  if (found === undefined) throw new Error('table T-024a has no 事項 column')
  return found
})()

const OP_10_ROW = ((): { readonly by: Readonly<Record<string, string>> } => {
  const found = T_024A.rows.find((row) => row.id === 'OP-10')
  if (found === undefined) throw new Error('table T-024a has no row OP-10')
  return found
})()

const OP_10 = OP_10_ROW.by[RULE_COLUMN] ?? ''
const OP_10_WHEN = OP_10_ROW.by[SUBJECT_COLUMN] ?? ''

/**
 * The ruling of 2026-09-06, quoted from `OP-10`'s own cell.
 *
 * ⚠️ Japanese literals in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- these two strings ARE
 * the clauses, and matching them against the manuscript is what makes the cases
 * below cases about the specification rather than about this file's memory.
 */
const A_CHOICE_IS_THE_PLACE =
  '⛔ **人が倍率か表示位置を選んだときは、それを表示位置とすること（MUST）**'

const NOT_EVERY_FRAME = '⛔ **本行を毎フレームやり直してはならない（MUST NOT）**'

/** The reason the first of the two gives, which is what the second rests on. */
const BECAUSE_THE_CONDITION_STOPS_HOLDING =
  '選んだ時点で「人がまだ場所を決めていない」ではなくなるので、本行の条件は成り立たなくなり、全体表示はやり直されない。'

/** OP-10's condition -- what has to be true of the fixture for any of this to run. */
const THE_CONDITION = '表示位置が `null`、または指す行が存在しないとき'

// ===========================================================================
// 2. The keys, tied to the entrances the measurement names
// ===========================================================================

const T_036 = specTable('T-036')

const ENTRANCE_COLUMN = ((): string => {
  const found = T_036.headings.find((heading) => heading.includes('入口'))
  if (found === undefined) throw new Error('table T-036 has no 入口 column')
  return found
})()

const entrancesOf = (row: string): string => {
  const found = T_036.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  return found.by[ENTRANCE_COLUMN] ?? ''
}

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

/**
 * The four presses, spelled the way `KeyInput.key` says table T-036's
 * assignment column spells one -- 「a letter or a sign as one upper-case
 * character」.
 *
 * ⭐ The SPELLING is this file's reading of the assignment column
 * (`Shift` ＋ `+`, `Alt` ＋ `+`, `F`); the case at the head of section 4 checks
 * that each row still names the entrance the case says it reaches, so a
 * reassignment of the key to another entrance fails there by name rather than
 * silently pressing the wrong thing here.
 */
const SHIFT_PLUS: KeyInput = { kind: 'key', key: '+', modifiers: { ...NO_MODS, shift: true } }
const SHIFT_MINUS: KeyInput = { kind: 'key', key: '-', modifiers: { ...NO_MODS, shift: true } }
const ALT_PLUS: KeyInput = { kind: 'key', key: '+', modifiers: { ...NO_MODS, alt: true } }
const PRESS_F: KeyInput = { kind: 'key', key: 'F', modifiers: NO_MODS }

// ===========================================================================
// 3. The document these cases drive
// ===========================================================================

// BT-4 of table T-034 supplies the calendar, the project and the settings,
// because those are the ones the specification has decided. ⛔ The loops below
// are NOT told they came from it (`startedFromTemplate` is left off), so OP-10's
// ⛔⛔ exclusion never operates -- what is borrowed is a valid document, not the
// template's own branch.
const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const stored = (day: string): string => `${day}T00:00:00`

const ROW_ONE = '3a000000-0000-4000-8000-000000000001'
const ROW_TWO = '3a000000-0000-4000-8000-000000000002'

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
 * Two rows, two Tasks, and no stored place -- which is OP-10's condition, so
 * the first frame of every case below is drawn by the row.
 */
function fixtureDocument(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100 },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task({ uid: 1, name: 'One', start: stored('2026-04-06'), finish: stored('2026-04-24') }),
        task({ uid: 2, name: 'Two', start: stored('2026-04-10'), finish: stored('2026-05-29') }),
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
    documentSettings: {
      ...structuredClone(template.documentSettings),
      scrollDate: null,
      scrollGroupId: null,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  edit(draft)
  return draft as unknown as Document
}

const settingsOf = (document: Document): DocumentSettings =>
  (document as unknown as { readonly documentSettings: DocumentSettings }).documentSettings

// ===========================================================================
// 4. The host UF-48 is given
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
 * in this layer. ⛔ Nothing in this fake decides anything: it drains the queue,
 * and it counts the turns it drained so a case can ask for MORE frames than the
 * loop would otherwise have run -- which is the whole of the second clause.
 */
function host(): {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(turns?: number): number
} {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  let clock = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => {} },
    runAnimationFrames: (turns = 8): number => {
      let ran = 0
      for (let turn = 0; turn < turns && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) {
          clock += 16
          ran += 1
          callback(clock)
        }
      }
      return ran
    },
  }
}

function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
  const surface: ScreenSurface = {
    showScreenView: (_view: ScreenView) => {},
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

/** What one frame drew from: the zoom on each axis, and the place it used. */
interface Picture {
  /** S-1 times `zoomX` -- FR-017 makes this the width of one day. */
  readonly pxPerDay: number
  /** What a rectangle's plan bar is tall at this zoom -- the row axis. */
  readonly rectangleHeight: number
  /** The height of the first row's band, the other reading of the row axis. */
  readonly firstRowHeight: number
}

interface Booted {
  readonly loop: FrameLoop
  /** One press, and the frames it asks for. */
  send(input: HumanInput): void
  /** Drain up to `turns` more animation frames with nothing pressed. */
  idle(turns?: number): number
  picture(): Picture
  place(): { readonly scrollDate: unknown; readonly scrollGroupId: unknown }
}

function boot(document: Document = fixtureDocument()): Booted {
  const pen = host()
  const loop = frameLoop(pen.surface as any, document, SCREEN, screenPane())
  // FT-3 of table T-078 is not what starts this: the first frame is owed by the
  // loop being made, so drain it before any case reads `current()`.
  pen.runAnimationFrames()
  const picture = (): Picture => {
    const values = loop.current()
    if (values === null) throw new Error('BO-1 settled no size, so no frame was drawn')
    const first = values.layout.rows[0]
    if (first === undefined) throw new Error('the fixture drew no row')
    return {
      pxPerDay: values.layout.pxPerDay,
      rectangleHeight: values.layout.rectangleHeight,
      firstRowHeight: first.height,
    }
  }
  return {
    loop,
    send: (input: HumanInput) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    idle: (turns = 8) => pen.runAnimationFrames(turns),
    picture,
    place: () => {
      const settings = settingsOf(loop.document()) as unknown as Record<string, unknown>
      return {
        scrollDate: settings['scrollDate'],
        scrollGroupId: settings['scrollGroupId'],
      }
    },
  }
}

// ===========================================================================
// 5. The premises every case below stands on
// ===========================================================================

describe('表 T-024a OP-10 -- the manuscript this file is driven by', () => {
  it('still carries the ruling of 2026-09-06 that a choice becomes the place', () => {
    expect(OP_10).toContain(A_CHOICE_IS_THE_PLACE)
    expect(OP_10).toContain('（利用者の裁定 2026-09-06）')
    expect(OP_10).toContain(BECAUSE_THE_CONDITION_STOPS_HOLDING)
  })

  it('still forbids redoing the row every frame', () => {
    expect(OP_10).toContain(NOT_EVERY_FRAME)
    expect(OP_10).toContain('本行は結果を定めるものであって、頻度を定めるものではない。')
  })

  it('still names the four entrances the measurement found dead, and keeps IC-14 out', () => {
    // The measurement the ruling was made on, quoted so that a case pressing a
    // fifth entrance would have to move this line first.
    expect(OP_10).toContain(
      '`IC-12` / `IC-13` / `IC-15` / `IC-10` の 4 つとも絵を 1 度も動かさなかった。',
    )
    expect(OP_10).toContain('**`IC-14`（縮小）が動かないのは本行と別である**')
  })

  it('still reads the place as the condition, so the fixture below is on the branch', () => {
    expect(OP_10_WHEN).toContain(THE_CONDITION)
  })

  it('leaves table T-036 pointing the pressed keys at those same entrances', () => {
    // ⭐ Not a copy of the assignment column: what is asserted is the tie
    // between the row this file presses and the entrance OP-10 names.
    expect(entrancesOf('SK-16')).toContain('IC-13')
    expect(entrancesOf('SK-16')).toContain('IC-12')
    expect(entrancesOf('SK-16a')).toContain('IC-15')
    expect(entrancesOf('SK-18')).toContain('IC-10')
  })

  it('drives a document that is a document, with no place stored', () => {
    const document = fixtureDocument()
    expect(validateDocument(document).valid).toBe(true)
    const settings = settingsOf(document) as unknown as Record<string, unknown>
    expect(settings['scrollDate']).toBeNull()
    expect(settings['scrollGroupId']).toBeNull()
  })
})

// ===========================================================================
// 6. 「人が倍率か表示位置を選んだときは、それを表示位置とすること（MUST）」
// ===========================================================================

describe('OP-10 (MUST) -- what a person chose becomes the place', () => {
  it('IC-13: a press of the time-axis zoom-in moves the picture', () => {
    const one = boot()
    const before = one.picture()
    one.send(SHIFT_PLUS)
    expect(one.picture().pxPerDay).toBeGreaterThan(before.pxPerDay)
  })

  it('IC-12: a press of the time-axis zoom-out moves the picture', () => {
    const one = boot()
    const before = one.picture()
    one.send(SHIFT_MINUS)
    expect(one.picture().pxPerDay).toBeLessThan(before.pxPerDay)
  })

  it('IC-15: a press of the row-axis zoom-in moves the picture', () => {
    // ⛔ IC-14 is NOT the mirror of this case; see the block at the head of the
    // file. The row axis is read on both of the two figures a zoom moves.
    const one = boot()
    const before = one.picture()
    one.send(ALT_PLUS)
    const after = one.picture()
    expect(
      after.rectangleHeight > before.rectangleHeight || after.firstRowHeight > before.firstRowHeight,
      'a row-axis zoom that moves neither the rectangle height nor the band height moved nothing',
    ).toBe(true)
  })

  it('IC-10: the fit is still reachable, and moves the picture back after a zoom', () => {
    // ⭐ The fit is a choice of 表示位置 too -- FR-055 「1 つの操作で、縦横の倍率と
    // 表示位置を全体が収まる側へ合わせること」 -- so it is on this clause's side
    // of the row, not the row's own fallback. What it must do is MOVE the
    // picture when the person is not standing where the fit stands.
    const one = boot()
    const fitted = one.picture()
    one.send(SHIFT_PLUS)
    expect(one.picture().pxPerDay).not.toBe(fitted.pxPerDay)
    one.send(PRESS_F)
    expect(one.picture().pxPerDay).toBe(fitted.pxPerDay)
  })

  it('fills in 表示位置, so the condition of OP-10 stops holding', () => {
    // The sentence's own reason: 「選んだ時点で「人がまだ場所を決めていない」では
    // なくなるので、本行の条件は成り立たなくなり、全体表示はやり直されない」.
    // ⛔ WHICH day and WHICH row is not asserted -- see the head of this file.
    // What the clause requires is that the pair no longer reads as 「人がまだ場所
    // を決めていない」, which is the two halves of the condition: `null`, or a
    // row that is not there.
    const one = boot()
    expect(one.place().scrollDate).toBeNull()
    expect(one.place().scrollGroupId).toBeNull()

    one.send(SHIFT_PLUS)

    const after = one.place()
    expect(after.scrollDate, 'S-77 still says the person has not chosen a place').not.toBeNull()
    expect(after.scrollGroupId, 'S-78 still says the person has not chosen a place').not.toBeNull()
    // 「または指す行が存在しないとき」 -- the other half of the same condition.
    expect([ROW_ONE, ROW_TWO]).toContain(after.scrollGroupId)
  })

  it('fills it in for the row axis and for the fit as well, not only for the time axis', () => {
    // 「倍率か表示位置」 -- either one, so no entrance may leave the pair unset.
    //
    // ⚠️ ONE READING HERE IS WORTH OVERTURNING IF IT IS WRONG. Pressing SK-18
    // is taken as 「人が…表示位置を選んだ」, because FR-055 says the fit is what
    // 「縦横の倍率と表示位置を全体が収まる側へ合わせる」 and the person asked for
    // it. ⛔ A press is not the same thing as the row FIRING ON ITS OWN at boot:
    // that one must leave the pair `null` (「`null` は…欠けているのではない
    // （`OP-6` の補完に当たらない）」), and tests/unit/uf-47-48.test.ts holds it.
    // The premise case above asserts the boot leaves it null, so these two
    // files do not disagree -- but if a later ruling says a pressed fit is not a
    // choice either, PRESS_F belongs out of this list and nowhere else changes.
    for (const press of [ALT_PLUS, PRESS_F, SHIFT_MINUS]) {
      const one = boot()
      one.send(press)
      const after = one.place()
      expect(after.scrollDate, `${String(press.key)} left S-77 null`).not.toBeNull()
      expect(after.scrollGroupId, `${String(press.key)} left S-78 null`).not.toBeNull()
    }
  })
})

// ===========================================================================
// 7. 「本行を毎フレームやり直してはならない（MUST NOT）」
// ===========================================================================

describe('OP-10 (MUST NOT) -- the row is not redone every frame', () => {
  it('does not overwrite the zoom the person wrote on the frames that follow', () => {
    // ⭐⭐ THIS IS THE MEASURED DEFECT, PUT THE OTHER WAY ROUND: 「毎フレーム
    // やり直していたので、人が書いた倍率が次のフレームで上書きされ」. So the
    // case presses once and then asks for MORE frames than the press did, with
    // nothing pressed, and reads the picture after each.
    const one = boot()
    one.send(SHIFT_PLUS)
    const chosen = one.picture()

    for (let frame = 0; frame < 12; frame += 1) {
      one.idle(1)
      expect(
        one.picture().pxPerDay,
        `frame ${frame + 1} after the press redid OP-10 and overwrote the person's zoom`,
      ).toBe(chosen.pxPerDay)
    }
  })

  it('holds the row axis the same way', () => {
    const one = boot()
    one.send(ALT_PLUS)
    const chosen = one.picture()
    one.idle(12)
    expect(one.picture().rectangleHeight).toBe(chosen.rectangleHeight)
    expect(one.picture().firstRowHeight).toBe(chosen.firstRowHeight)
  })

  it('keeps the zoom working AFTER the fit, which is where the row used to come back', () => {
    // ⭐ The fit writes a place of its own, and the frames after it must not
    // re-enter the row either -- otherwise the next press is overwritten again.
    const one = boot()
    one.send(PRESS_F)
    const fitted = one.picture()
    one.send(SHIFT_PLUS)
    const zoomed = one.picture()
    expect(zoomed.pxPerDay).toBeGreaterThan(fitted.pxPerDay)
    one.idle(12)
    expect(one.picture().pxPerDay).toBe(zoomed.pxPerDay)
  })

  it('does not move the picture at all while nothing is pressed', () => {
    // The plainest reading of 「毎フレームやり直してはならない」: with no input,
    // frame two draws what frame one drew. ⚠️ This is asserted from the FIRST
    // frame, where the row legitimately fires -- the ban is on repeating it, not
    // on running it.
    //
    // ⛔ THE WEAKEST OF THE FOUR, AND IT IS GREEN TODAY WHILE THE OTHER THREE
    // ARE NOT. Redoing the row on every frame draws the same picture each time
    // as long as nothing changed, so this case cannot see the defect at all;
    // the three above it can, because a press is what the redone row destroys.
    // It is kept because it catches the OTHER way a frame loop rots -- a
    // picture that drifts with the clock while the person is not touching it.
    const one = boot()
    const first = one.picture()
    one.idle(12)
    expect(one.picture()).toEqual(first)
  })
})
