// `FR-033`（コピーして貼り付ける）-- the two KEYS, driven through the shell, and
// what they leave in the document.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: `TS-6`,
// tests/unit/, written by someone who read only docs/spec. The unit is `UF-48`
// of 表 T-075 (`frame-loop.ts`, `CP-25` of 表 T-062).
//
// ---------------------------------------------------------------------------
// ⭐ THE CLAUSES, VERBATIM (docs/spec/01-04-requirements.md, `FR-033`)
// ---------------------------------------------------------------------------
//
//   STATEMENT: 「作成者がタスクを選んでコピーし貼り付けたとき、`GRS` は、**選ば
//    れた `Task` とその WBS の子孫を部分木ごと**複製すること。行見出しパネルでは、
//    選ばれた `TaskGroup` を**部分木ごと**複製すること。」
//   「複製した `Task` は、複製元と同じ行に載せること（MUST）」
//   「段が表 T-014 の `ST-7` の安全弁に達したときは、貼り付けを受け付けずに通知
//    すること（MUST）」
//   「複製した `Task` に、複製元と同じ `UID` を使ってはならない（MUST NOT）」
//   「複製に `TaskOrigin` を付けてはならない（MUST NOT）」
//   「貼り付け先は、選んでいる行の子とすること（MUST）」
//   「複製に使う置き場はアプリの中に持つこと（MUST）。OS のクリップボードから読み
//    込んではならない（MUST NOT）」
//
// and 表 T-223 の `DU-1` / `DU-2`, which say what travels with each of the two.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS BESIDE tests/unit/fr-033-the-copy-store-is-inside-the-
//    app.test.ts, WHICH ANOTHER BODY WROTE
// ---------------------------------------------------------------------------
// That file asks `FR-033` at the USE-CASE seam and at the TABLE: that `CM-8` /
// `CM-28` name what to copy by identifier, that `src/` reads no OS clipboard,
// that `editTask` / `editTaskGroup` duplicate a subtree when handed the command,
// that a vanished source is refused as a value, and that 表 T-036 assigns
// `Ctrl+C` and `Ctrl+V`. ⛔ NOT ONE OF ITS CASES PRESSES A KEY.
//
// ⇒ The half nobody asks is the half the two ledger rows were actually raised
// about -- the KEYS reaching the DOCUMENT:
//
//   DFC-321 「⛔ **コピーと貼り付けが何も起こさない**（`NFR-004` の掃引 2026-09-05）
//         …… 実測 2026-09-05（出荷ビルド、`file://` と `http://`）—— **押しても
//         文書も絵も動かない。**」
//   DFC-290 「⛔ **複製したものを貼る道が無い** …… `pasteTaskSubtree` /
//         `pasteTaskGroupSubtree` の発行元が `src/` に 0 件」
//
// ⛔ NOTHING THAT FILE ASKS IS ASKED AGAIN HERE. The key assignments, the
// refusals for a vanished source, and the ban on reading the OS clipboard are
// its cases and stay its cases; the two keys are READ from 表 T-036 here rather
// than asserted.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: only the head, the
// published types and the signatures.)
//
//   frame-loop.ts       `FrameEnvironment`, `FrameLoop`, `ScreenWiring`, and the
//                       signature `frameLoop(surface, first, env, screen?, ...)`
//   screen-renderer.ts  `DisplayLanguage`, `ScreenPart`, `ScreenSurface`,
//                       `ScreenView`, `Notice`
//   input-command-translator.ts  `HumanInput`, `InputModifiers`, `KeyInput`,
//                       `PointerInput`, `PointerPhase`
// ⛔ NO FUNCTION BODY WAS READ. ⭐ The host, the fake surface and the way one
// Task's bar is found on the canvas are copied from
// tests/unit/fr-072-a-moved-selection-does-not-open-the-panel.test.ts, and the
// row-title press from tests/unit/t-051-hf-14-a-raised-row-is-visible.test.ts.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//  1. WHICH ROW OF 表 T-233 A REFUSED PASTE CARRIES. `FR-033` says 「貼り付けを
//     受け付けずに通知すること（MUST）」 and names NO row; DFC-290's own record says
//     the choice was the body's and not the user's. So the case below asks only
//     what 表 T-233's closing rule requires -- that whatever is told IS a row of
//     that table, in the words `FR-038`'s dictionary holds for it.
//  2. WHAT AN EMPTY STORE TELLS. Same reason: `FR-033` states no reason row for
//     it, and DFC-321's record marks `RS-27` as a fill-in by the front session.
//     The case below asks only that the document does not move.
//  3. 表 T-223's cascade in detail. `DU-1` / `DU-2` have cases in
//     tests/unit/edit-task.test.ts and the file named above.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  Notice,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// 1. The manuscript, read at run time rather than copied
// ===========================================================================

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

/**
 * ⚠️ Japanese literals in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- these strings ARE the
 * clauses. ⭐ Each ends at its own marker's closing parenthesis.
 */
const FR_033_STATEMENT =
  '作成者がタスクを選んでコピーし貼り付けたとき、`GRS` は、**選ばれた `Task` とその WBS の子孫を部分木ごと**複製すること。行見出しパネルでは、選ばれた `TaskGroup` を**部分木ごと**複製すること。'

const FR_033_SAME_ROW = '複製した `Task` は、複製元と同じ行に載せること（MUST）'

const FR_033_NO_SAME_UID =
  '複製した `Task` に、複製元と同じ `UID` を使ってはならない（MUST NOT）'

const FR_033_NO_TASK_ORIGIN = '複製に `TaskOrigin` を付けてはならない（MUST NOT）'

const FR_033_PASTE_UNDER_THE_CHOSEN_ROW = '貼り付け先は、選んでいる行の子とすること（MUST）'

/** ⭐ The clause that ties this requirement to 表 T-014 の `ST-7`. */
const FR_033_REFUSE_AT_THE_VALVE =
  '段が表 T-014 の `ST-7` の安全弁に達したときは、貼り付けを受け付けずに通知すること（MUST）'

/** 表 T-233's closing rule -- what a telling may carry at all. */
const T_233_ONLY_ITS_OWN_ROWS =
  ' 通知が運ぶ理由は 表 T-233 の行とすること（MUST）。同表に無い理由を運んではならない（MUST NOT）'

const T_036: SpecTable = specTable('T-036')
const T_037: SpecTable = specTable('T-037')
const T_103: SpecTable = specTable('T-103')
const T_223: SpecTable = specTable('T-223')
const T_233: SpecTable = specTable('T-233')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/**
 * The keystroke 表 T-036 assigns one row, read out of its 割当 column.
 * ⚠️ Copied from tests/unit/d-337-....test.ts, including its warning against
 * `bare`, which would answer `Ctrl` for an assignment spelt 「`Ctrl` ＋ `R`」.
 */
function keyOf(id: string): KeyInput {
  const parts = ((rowOf(T_036, id).by['割当'] ?? '').split('/')[0] ?? '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/＋/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
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

/** `SK-4` 「コピーする」 and `SK-5` 「貼り付ける」, READ and not typed. */
const COPY = keyOf('SK-4')
const PASTE = keyOf('SK-5')

/** `U-22` -- the 面 the row half of the STATEMENT names（行見出しパネル）. */
const ROW_TITLE_PANEL = bare(rowOf(T_103, 'U-22').by['確定名（英）'] ?? '')

interface ReasonWords {
  readonly rowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
  readonly nextStep: Readonly<Record<DisplayLanguage, string>>
}

const REASON_WORDS: readonly ReasonWords[] = (
  JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons: ReasonWords[] }
).reasons

// ===========================================================================
// 2. The document these cases are driven on
// ===========================================================================

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

const PARENT_ROW = 'aaaaaaaa-0000-4000-8000-000000000001'
const CHILD_ROW = 'aaaaaaaa-0000-4000-8000-000000000002'

/** The `Task` a case presses, and the WBS child that has to travel with it. */
const PARENT_TASK = 1
const CHILD_TASK = 2

function task(uid: number, parentUid: number | null): Record<string, unknown> {
  return {
    uid,
    wbsParentUid: parentUid,
    wbsOrder: uid,
    name: `Task ${uid}`,
    start: '2026-04-01T00:00:00',
    finish: '2026-04-10T00:00:00',
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
  }
}

function group(id: string, parentId: string | null, order: number): Record<string, unknown> {
  return {
    id,
    parentId,
    label: id === PARENT_ROW ? 'Parent row' : 'Child row',
    derivedFromTaskUid: null,
    order,
    isCollapsed: false,
    isHidden: false,
    color: null,
    height: null,
  }
}

/**
 * Two rows, parent and child, carrying one WBS pair of Tasks.
 *
 * ⭐ THE SHAPE IS WHAT THE STATEMENT ASKS ABOUT: 「選ばれた `Task` とその WBS の
 * 子孫を部分木ごと」 needs a Task WITH a descendant, and 「選ばれた `TaskGroup` を
 * 部分木ごと」 needs a row WITH a row under it.
 */
function documentOfTwoRows(cap?: number): Document {
  const template = structuredClone(TEMPLATE) as any
  const settings = { ...structuredClone(template.documentSettings) }
  if (cap !== undefined) settings.stackSafetyCap = cap
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        title: 'A document to copy from',
        uidHighWaterMark: 1000,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [task(PARENT_TASK, null), task(CHILD_TASK, PARENT_TASK)],
      resources: [],
      assignments: [],
      taskGroups: [group(PARENT_ROW, null, 0), group(CHILD_ROW, PARENT_ROW, 0)],
      taskGroupMembers: [
        { taskUid: PARENT_TASK, groupId: PARENT_ROW, stackOrder: null },
        { taskUid: CHILD_TASK, groupId: CHILD_ROW, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: settings,
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

// ===========================================================================
// 3. The host UF-48 is given
// ===========================================================================

const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

function host(): Host {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  } as unknown as ScreenSurface
  return {
    wiring: { surface, language } as unknown as ScreenWiring,
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  /** Press one Task's plan bar on the canvas -- `SL-2` of 表 T-023c moving. */
  pressTask(uid: number): void
  /** Press one row's title -- the 行見出しパネル half of the STATEMENT. */
  pressRow(groupId: string): void
  taskUids(): readonly number[]
  groupIds(): readonly string[]
  rowOfTask(uid: number): string | undefined
  taskOriginCount(): number
  notices(): readonly Notice[]
  documentText(): string
}

function stage(document: Document): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, document, SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  const schedule = (): any => (loop.document() as any).schedule
  /** The middle of one Task's plan bar, as this frame drew it. */
  const middleOfTheBar = (uid: number): { readonly x: number; readonly y: number } => {
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame, so it has drawn no bar')
    const drawn = values.geometry.tasks.find((one: any) => one.taskUid === uid)
    if (drawn === undefined || drawn.plan === null) {
      throw new Error(`Task ${uid} has no plan bar in this frame`)
    }
    if (drawn.plan.form !== 'outline') {
      throw new Error(`Task ${uid} is drawn as a ${drawn.plan.form}, which has no body to press`)
    }
    const xs = drawn.plan.points.map((one: any) => one.x)
    const ys = drawn.plan.points.map((one: any) => one.y)
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    }
  }
  return {
    loop,
    send,
    pressTask: (uid) => {
      const at = middleOfTheBar(uid)
      // IN-1 settles a pointer operation on the release, so a press left down
      // would be a drag rather than a choice.
      send(pointer('down', at.x, at.y))
      send(pointer('up', at.x, at.y))
    },
    pressRow: (groupId) => {
      // CS-2 of 表 T-066 settles the gesture on what was drawn AT THE PRESS.
      screen.drawAt({
        part: ROW_TITLE_PANEL,
        entry: null,
        format: null,
        rowGroupId: groupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as unknown as ScreenPart)
      send(pointer('down', 60, 300))
      send(pointer('up', 60, 300))
      screen.drawAt(null)
    },
    taskUids: () => schedule().tasks.map((one: any) => one.uid),
    groupIds: () => schedule().taskGroups.map((one: any) => one.id),
    rowOfTask: (uid) =>
      schedule().taskGroupMembers.find((one: any) => one.taskUid === uid)?.groupId,
    taskOriginCount: () => schedule().taskOrigins.length,
    notices: () => screen.last().notices,
    documentText: () => JSON.stringify(loop.document()),
  }
}

// ===========================================================================
// 4. The premises every case below stands on
// ===========================================================================

describe('FR-033 -- the manuscript this file is driven by', () => {
  it('still states the two subtrees, and still keeps a copy on its original row', () => {
    expect(REQUIREMENTS).toContain(FR_033_STATEMENT)
    expect(REQUIREMENTS).toContain(FR_033_SAME_ROW)
  })

  it('still forbids a copy wearing its original’s UID or a TaskOrigin', () => {
    expect(REQUIREMENTS).toContain(FR_033_NO_SAME_UID)
    expect(REQUIREMENTS).toContain(FR_033_NO_TASK_ORIGIN)
  })

  it('still lands a pasted row under the chosen one, and still refuses a paste at the valve', () => {
    expect(REQUIREMENTS).toContain(FR_033_PASTE_UNDER_THE_CHOSEN_ROW)
    expect(REQUIREMENTS).toContain(FR_033_REFUSE_AT_THE_VALVE)
  })

  it('表 T-223 still cascades a Task to its WBS descendants and a row to the rows below it', () => {
    expect(rowOf(T_223, 'DU-1').cells.join(' ')).toContain('WBS の子孫')
    expect(rowOf(T_223, 'DU-2').cells.join(' ')).toContain('配下の行')
  })

  it('the fixture really holds the two subtrees the STATEMENT speaks of', () => {
    // ⛔ WITHOUT THIS, a "the subtree travelled" case could pass on a fixture
    // whose subtree was one node deep.
    const built = stage(documentOfTwoRows())
    expect(built.taskUids()).toEqual([PARENT_TASK, CHILD_TASK])
    expect(built.groupIds()).toEqual([PARENT_ROW, CHILD_ROW])
    expect(built.notices()).toEqual([])
  })
})

// ===========================================================================
// 5. DFC-321 / DFC-290 -- the two keys reach the document
// ===========================================================================

describe('FR-033 -- SK-4 then SK-5 on a chosen Task duplicates its subtree', () => {
  it('⭐⭐ the pair of keys leaves two more Tasks in the document', () => {
    // ⛔ DFC-321's measurement on the shipped build: 「押しても文書も絵も動かない」.
    // The STATEMENT: 「選ばれた `Task` とその WBS の子孫を部分木ごと複製すること」,
    // and 表 T-223 の `DU-1` names 「その `Task` の WBS の子孫」 as what travels.
    const built = stage(documentOfTwoRows())
    built.pressTask(PARENT_TASK)

    built.send(COPY)
    built.send(PASTE)

    expect(
      built.taskUids().length,
      'SK-4 then SK-5 on a chosen Task left the document exactly as it was -- FR-033’s STATEMENT ' +
        'asks for the Task and its WBS descendants to be duplicated 部分木ごと',
    ).toBe(4)
  })

  it('and the copies wear UIDs of their own (MUST NOT)', () => {
    const built = stage(documentOfTwoRows())
    built.pressTask(PARENT_TASK)

    built.send(COPY)
    built.send(PASTE)

    const uids = built.taskUids()
    expect(new Set(uids).size, 'a copy was given a UID the document already held').toBe(uids.length)
  })

  it('and the copied Task sits on the row its original sits on (MUST)', () => {
    // 「複製した `Task` は、複製元と同じ行に載せること（MUST）」 -- 載る行が決まら
    // ないと、表 T-050 の `CD-2` が消す範囲も決まらない。
    const built = stage(documentOfTwoRows())
    built.pressTask(PARENT_TASK)

    built.send(COPY)
    built.send(PASTE)

    const copies = built.taskUids().filter((uid) => uid !== PARENT_TASK && uid !== CHILD_TASK)
    expect(copies.length).toBe(2)
    const rows = copies.map((uid) => built.rowOfTask(uid))
    expect(
      rows.every((one) => one === PARENT_ROW || one === CHILD_ROW),
      'a copy landed on a row neither of its originals is on',
    ).toBe(true)
  })

  it('and no TaskOrigin is put on a copy (MUST NOT)', () => {
    // 「複製に `TaskOrigin` を付けてはならない（MUST NOT）」 —— 交換相手から来たもの
    // ではないので、合流の照合対象にしない。
    const built = stage(documentOfTwoRows())
    built.pressTask(PARENT_TASK)

    built.send(COPY)
    built.send(PASTE)

    expect(built.taskOriginCount()).toBe(0)
  })
})

describe('FR-033 -- SK-4 then SK-5 on a chosen row duplicates the row subtree', () => {
  it('⭐⭐ the pair of keys leaves two more rows in the document', () => {
    // 「行見出しパネルでは、選ばれた `TaskGroup` を**部分木ごと**複製すること」, and
    // 表 T-223 の `DU-2` names 「配下の行」 as what travels with it.
    const built = stage(documentOfTwoRows())
    built.pressRow(PARENT_ROW)

    built.send(COPY)
    built.send(PASTE)

    expect(
      built.groupIds().length,
      'SK-4 then SK-5 on a chosen row left the document exactly as it was -- FR-033’s STATEMENT ' +
        'asks for the row and the rows under it to be duplicated 部分木ごと',
    ).toBe(4)
  })

  it('and the Tasks on the copied rows come with them (DU-2)', () => {
    // 「その行に載っているすべての `Task`（`DU-1` が各 `Task` に連鎖する）」 and
    // 「⚠️ **複製した `Task` は複製した行に載せる。**」
    const built = stage(documentOfTwoRows())
    built.pressRow(PARENT_ROW)

    built.send(COPY)
    built.send(PASTE)

    const newRows = built.groupIds().filter((id) => id !== PARENT_ROW && id !== CHILD_ROW)
    expect(newRows.length).toBe(2)
    const carried = built
      .taskUids()
      .filter((uid) => newRows.includes(built.rowOfTask(uid) ?? ''))
    expect(
      carried.length,
      'the copied rows came up empty, which DU-2 (「その行に載っているすべての `Task`」) forbids',
    ).toBe(2)
  })
})

// ===========================================================================
// 6. The controls that keep section 5 from passing on a loop that copies always
// ===========================================================================

describe('FR-033 -- what does NOT change the document', () => {
  it('⭐ SK-5 with nothing ever copied leaves the document exactly as it was', () => {
    // ⛔ WITHOUT THIS, a loop that duplicated on `Ctrl+V` regardless of any copy
    // would pass every case above. ⚠️ WHAT IT TELLS IS NOT ASSERTED: FR-033
    // states no reason row for an empty store (see the head of this file).
    const built = stage(documentOfTwoRows())
    const before = built.documentText()

    built.pressTask(PARENT_TASK)
    built.send(PASTE)

    expect(built.documentText()).toBe(before)
  })

  it('⭐ SK-4 on its own leaves the document exactly as it was -- a copy is not an edit', () => {
    // 「複製に使う置き場はアプリの中に持つこと（MUST）」 -- a store, not a change:
    // FR-031 counts an undo step from a WRITE, and taking a copy writes nothing.
    const built = stage(documentOfTwoRows())
    built.pressTask(PARENT_TASK)
    const before = built.documentText()

    built.send(COPY)

    expect(built.documentText()).toBe(before)
  })
})

// ===========================================================================
// 7. ⭐⭐ FR-033 x 表 T-014 の ST-7 -- the paste that is refused at the valve
// ===========================================================================
//
// 「段が表 T-014 の `ST-7` の安全弁に達したときは、貼り付けを受け付けずに通知する
//  こと（MUST）」 —— 貼り付けだけに逃げ道を作ると、安全弁が場所によって効いたり効か
//  なかったりする。
//
// ⭐ THE CAP IS SET BY THE DOCUMENT, NOT TYPED INTO THE LOOP. `S-89`'s own remark
// says its 255 「測って決めた値ではない」, so a fixture of 256 overlapping Tasks
// would be measuring the fixture; the sibling file `st-7-rs-24-...` is where the
// number itself is held to the manuscript.

describe('FR-033 (MUST) -- a paste that would pass the safety valve is refused AND told', () => {
  /** A cap of 2, so the row's own two Tasks stand exactly at it. */
  const AT_THE_CAP = 2

  it('the premise: with the cap at 2, the fixture stands AT the valve and is not yet past it', () => {
    // 「安全弁の値（`S-89`）は「許される段数の上限」であること（MUST）」 -- the row
    // this case pastes onto holds one Task, so the paste is what would pass it.
    const built = stage(documentOfTwoRows(AT_THE_CAP))
    expect(built.notices()).toEqual([])
    expect(built.taskUids().length).toBe(2)
  })

  it('⭐⭐ the paste that would make a third stack on one row is not taken', async () => {
    // The document's parent row holds one Task; two pastes of that Task's
    // subtree would put three overlapping Tasks on it, which is one past a cap
    // of 2. ⛔ The FIRST paste is lawful and is asserted so, precisely so that
    // a loop which refuses every paste cannot pass this case.
    const built = stage(documentOfTwoRows(AT_THE_CAP))
    built.pressTask(PARENT_TASK)
    built.send(COPY)

    built.send(PASTE)
    const afterTheLawfulOne = built.taskUids().length
    expect(
      afterTheLawfulOne,
      'the first paste, which stacks exactly TO the cap, was refused -- ST-7 allows it',
    ).toBe(4)

    built.send(PASTE)

    expect(
      built.taskUids().length,
      'a paste that would put a stack past the safety valve was taken -- FR-033 (MUST): ' +
        '「段が表 T-014 の `ST-7` の安全弁に達したときは、貼り付けを受け付けずに通知すること」',
    ).toBe(afterTheLawfulOne)
  })

  it('⭐ and the refusal is TOLD, in the words FR-038 holds for a row of 表 T-233', () => {
    // 「貼り付けを受け付けずに**通知**すること（MUST）」, and 表 T-233's closing
    // rule: 「通知が運ぶ理由は 表 T-233 の行とすること（MUST）。同表に無い理由を運
    // んではならない（MUST NOT）」.
    // ⛔ WHICH row is not asserted: FR-033 names none (see the head of this file).
    expect(REQUIREMENTS).toContain(T_233_ONLY_ITS_OWN_ROWS)
    const built = stage(documentOfTwoRows(AT_THE_CAP))
    built.pressTask(PARENT_TASK)
    built.send(COPY)
    built.send(PASTE)
    built.send(PASTE)

    const told = built.notices()
    expect(
      told.length,
      'the paste was refused in silence -- FR-033 (MUST) asks for the person to be told',
    ).toBeGreaterThan(0)
    const known = REASON_WORDS.map((one) => one.text.ja)
    for (const notice of told) {
      expect(known, `a telling carried words FR-038’s dictionary does not hold`).toContain(
        notice.text,
      )
      expect(
        T_037.rows.map((one) => one.id),
        `the manner ${JSON.stringify(notice.manner)} is not a row of table T-037`,
      ).toContain(notice.manner)
      expect(
        T_233.rows.length,
        'table T-233 is empty, so nothing above can be a row of it',
      ).toBeGreaterThan(0)
    }
  })
})
