// FR-099 (MUST) -- the roster's second way of deleting: the CHOSEN assignees
// go, and before they go the question names the TASKS an unassignment reaches.
//
// ---------------------------------------------------------------------------
// THE TWO CLAUSES, QUOTED VERBATIM (docs/spec/01-04-requirements.md:1730, :1738)
// ---------------------------------------------------------------------------
//
//   消し方は、**どの割当からも参照されていない担当者をまとめて消すこと**と、
//   **選んだ担当者を消すこと**の 2 つとすること（MUST）。
//
//   **消すことで解かれる割当があるときは、そのタスクの名前を示して確認を求めること
//   （MUST）。件数だけを示してはならない（MUST NOT）** —— 一緒に消えるものは
//   表 T-050 の `CD-5` が持つ。
//
// ⭐⭐ THE SECOND CLAUSE NAMES THE TASKS AND NOT THE RESOURCES, and 表 T-234's
// `QN-3` says the same thing again: 「担当者を消すことで解かれる割当があるとき |
// 挙げる —— **解かれる割当のタスクの名前**。連鎖は 表 T-050 の `CD-5` が持つ」.
// ⛔ A question that listed the chosen assignees would be naming what the person
// just picked, not what they are about to lose.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE LEDGER ROWS IT STANDS IN FOR
// ---------------------------------------------------------------------------
// DFC-288: 「⛔ **担当者を消す道が 1 つも繋がっていない** …… `IC-66`（選んだ担当者を
// 消す）に応える所が無い」, and its repair note: 「⭐ **何も選ばれていなければ書かず、
// `RS-27` を告げる**（体の判断。空で書き通すと、何も言わずに「編集あり」になる）」.
// DFC-289: 「⛔ **担当者を消す前の確認（`QN-3`）を上げる道が無い**」, repaired in the
// same hand -- 「⭐ **`DFC-288` と 1 つの手で入れること**」 -- which is why one file
// holds both.
// ⚠️ DFC-340 records a wording mismatch that is NOT this file's to fix: 「`QN-3` の
// 文は「この担当者を削除しますか？」と**単数**だが、`IC-66` が消すのは**集合**で
// ある」. ⛔ No case below asserts the sentence; they assert the ROW and the ITEMS,
// which is what FR-099 and 表 T-234 rule on.
//
// ---------------------------------------------------------------------------
// WHERE 表 T-218 PUTS THIS FILE
// ---------------------------------------------------------------------------
// `TS-6`, tests/unit/ -- 「単体テスト | 持たない | —— | Unit | `tests/unit/` |
// Vitest」. The unit is `UF-48` of 表 T-075 (`frame-loop.ts`, `CP-25` of 表
// T-062): 表 T-060's `LY-5` makes it the only layer that may hold a current
// value, and which assignees are chosen is one -- `ScreenSession.
// selectedResourceUids`. ⛔ NOT tests/integration/: `TS-2` takes 「`SWS-xxx`」 for
// a parent and Chapter 9 holds none for FR-099; this body owns tests/ only and
// may not write one into docs/spec to give itself a parent.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: only the head, the
// published types and the signatures.)
//
//   frame-loop.ts       `FrameEnvironment`, `FrameLoop`, `ScreenWiring` and the
//                       signature `frameLoop(surface, first, env, screen?)`
//   screen-renderer.ts  `Confirmation`, `ConfirmationItem`, `DisplayLanguage`,
//                       `ResourceRoster`, `RosterResource`, `ScreenPart`,
//                       `ScreenSurface`, `ScreenView`
//   input-command-translator.ts  `HumanInput`, `InputModifiers`, `KeyInput`,
//                       `PointerButton`, `PointerInput`, `PointerPhase`
//   schedule.ts         `Resource`, `Assignment`, `Task`, `TaskGroup`
// ⛔ NO FUNCTION BODY WAS READ.
// ⭐ THE HOST, THE FAKE SURFACE AND THE WAY A PRESS IS AIMED ARE COPIED, NOT
// INVENTED: tests/unit/fr-029-the-reason-a-press-carries.test.ts drives this same
// unit through `ScreenPart`, and tests/unit/uf-47-48-choosers.test.ts is where a
// confirmation is answered by the key NT-7 (MUST) assigns.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   `FR-099`      the two clauses above, and 「⭐ **「どの割当からも参照されていない
//                 担当者をまとめて消す」ことは、その全員をまとめて選ぶ操作と、選んだ
//                 担当者を消す操作の 2 手で果たすこと（MUST）**」 -- why there is
//                 exactly one deleting entrance and it is `IC-66`.
//   表 T-109      `IC-62` 「`Command Palette` | 表示 | 担当者の名簿を表示する」,
//                 `IC-66` 「`Resource Roster` | — | 選んだ担当者を消す |
//                 `FR-099`（表 T-108 の `CM-42`）」, `IC-68` 「選ばれていないことを
//                 示し、同じ入口で選ぶ」, `IC-67` 「選ばれていることを示し、同じ入口
//                 で解く」. ⭐ The 面 column is READ, never typed -- it is the join
//                 between an entrance and the surface a press on it is answered
//                 as.
//   表 T-234 QN-3 「担当者を消すことで解かれる割当があるとき | 挙げる —— 解かれる
//                 割当のタスクの名前」, 正 `FR-099`.
//   表 T-050 CD-5 「担当者（`Resource`）| **その担当者を指す割当**（`Assignment`）。
//                 ⚠️ **タスクは消えない** —— 担当が外れるだけである」 -- the chain,
//                 and the reason a case counts the Tasks afterwards.
//   表 T-037 NT-7 「**続けてよいかを問うとき** | **何が起きるかを示したうえで、続ける
//                 か取りやめるかを選ばせること（MUST）。** 消えるもの・解かれるものが
//                 あるときは、**その名前を挙げること（MUST）**」, and 「⭐⭐ **`y` と
//                 `n` の打鍵でも答えられること（MUST）。**」 -- how a case answers.
//   表 T-233 RS-27 「押した入口が、いま行えることを持たない」 -- what a press with
//                 nobody chosen falls to (`FR-029`'s fall-through).
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   1. THE SENTENCE `QN-3` SHOWS. FR-038 (MUST NOT) keeps the words in one
//      dictionary and DFC-340 is open against that very sentence; these cases
//      assert the ROW id and the ITEMS, which are the document's own values.
//   2. `IC-65` (choosing the unreferenced ones). FR-099 makes the sweep 「2 手」
//      -- a choosing step and this deleting step -- and only the deleting step
//      is what DFC-288 and DFC-289 are about.
//   3. WHETHER THE ENTRANCE IS DRAWN FAINT while nobody is chosen. That is
//      FR-029's other half and the renderer's;
//      tests/unit/fr-029-the-reason-a-press-carries.test.ts owns the family.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
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
 * clauses, and matching them against the manuscript is what makes the cases
 * below cases about the specification.
 *
 * ⭐ EACH ENDS AT ITS MARKER'S OWN CLOSING PARENTHESIS. Check 39 takes the
 * trailing window that ENDS at `（MUST）` / `（MUST NOT）` and looks for it under
 * tests/; a quote that began at the sentence and stopped before the marker would
 * hold nothing at all.
 */
const FR_099_TWO_WAYS_OF_DELETING =
  'を出し、そこから担当者を消せるようにすること。**入口はコマンドパレットとすること（MUST）。** 消し方は、**どの割当からも参照されていない担当者をまとめて消すこと**と、**選んだ担当者を消すこと**の 2 つとすること（MUST）'

/**
 * ⚠️ THESE TWO STOP SHORT OF THE PARAGRAPH BREAK. Their 120- and 90-character
 * windows reach back across a blank line into the sentence about 表 T-109, and a
 * source file cannot carry a raw line break inside a quoted string without
 * changing its bytes -- so what is written here is the longest window of each
 * that is one unbroken run of manuscript.
 */
const FR_099_NAME_THE_TASKS = 'で解かれる割当があるときは、そのタスクの名前を示して確認を求めること（MUST）'

const FR_099_NOT_A_COUNT =
  'る割当があるときは、そのタスクの名前を示して確認を求めること（MUST）。件数だけを示してはならない（MUST NOT）'

/** FR-099's own reason there is exactly one deleting entrance. */
const FR_099_ONE_ENTRANCE = '選んだ担当者を消す操作の 2 手で果たすこと（MUST）'

const T_109: SpecTable = specTable('T-109')
const T_234: SpecTable = specTable('T-234')
const T_233: SpecTable = specTable('T-233')
const T_050: SpecTable = specTable('T-050')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/**
 * The 面 表 T-109 puts one entrance on, as that table spells it.
 *
 * ⛔ READ AND NOT TYPED: the 面 column is the join between an entrance and the
 * surface a press on it is answered as, and a file that typed the pairs would be
 * a second copy of that column. ⚠️ Copied from
 * tests/unit/fr-029-the-reason-a-press-carries.test.ts.
 */
function surfaceOf(icon: string): string {
  const cell = bare(rowOf(T_109, icon).by['面'] ?? '')
  const first = cell.split('/')[0]?.trim() ?? ''
  if (first === '') throw new Error(`表 T-109 ${icon} names no 面`)
  return first
}

/** FR-038's dictionary, as the manuscript keeps it. */
interface DictionaryWords {
  readonly reasons: readonly {
    readonly rowId: string
    readonly text: Readonly<Record<DisplayLanguage, string>>
  }[]
  readonly confirmation: readonly {
    readonly answer: string
    readonly text: Readonly<Record<DisplayLanguage, string>>
  }[]
}

const WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as DictionaryWords

const reasonWords = (rowId: string): string => {
  const found = WORDS.reasons.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`FR-038's dictionary holds no words for ${rowId}`)
  return found.text.ja
}

/** NT-7 (MUST): 「⭐⭐ **`y` と `n` の打鍵でも答えられること（MUST）。**」 */
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

function answerKeyFor(answer: string): KeyInput {
  const word = WORDS.confirmation.find((one) => one.answer === answer)?.text.ja ?? ''
  if (word === '') throw new Error(`FR-038: the manuscript holds no word for the answer ${answer}`)
  return { kind: 'key', key: word.slice(0, 1).toUpperCase(), modifiers: { ...NO_MODIFIERS } }
}

const PROCEED = 'proceed'
const CANCEL = 'cancel'
const QN_3 = 'QN-3'
const RS_27 = 'RS-27'

// ===========================================================================
// 2. The document these cases drive
// ===========================================================================

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ROW_ID = '11111111-1111-4111-8111-111111111111'

/** ⭐ Two assignees, so a case that deleted "all of them" is caught by the other. */
const ANNA = 41
const BORIS = 42

/**
 * ⭐⭐ THREE TASKS AND FOUR ASSIGNMENTS, arranged so that the two counts FR-099
 * separates cannot agree by accident:
 *
 *   ANNA  -> ALPHA, BETA        (two tasks, two assignments)
 *   BORIS -> GAMMA              (one task, one assignment)
 *   ANNA  -> GAMMA              (⭐ a task ALSO held by somebody else)
 *
 * ⇒ deleting ANNA alone frees three assignments across three tasks while one
 * assignee and one Task-with-an-assignee remain, and 「解かれる割当のタスクの
 * 名前」 is a list of THREE task names -- never of one assignee name, and never
 * of a count.
 */
const ALPHA = 1
const BETA = 2
const GAMMA = 3
const TASK_NAMES: Readonly<Record<number, string>> = {
  [ALPHA]: 'Alpha task',
  [BETA]: 'Beta task',
  [GAMMA]: 'Gamma task',
}
const RESOURCE_NAMES: Readonly<Record<number, string>> = {
  [ANNA]: 'Anna the assignee',
  [BORIS]: 'Boris the assignee',
}

function documentWithRoster(): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (uid: number, start: string, finish: string) =>
    ({
      uid,
      wbsParentUid: null,
      wbsOrder: uid,
      name: TASK_NAMES[uid],
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
    }) as unknown as Record<string, unknown>
  const resource = (uid: number) => ({
    uid,
    name: RESOURCE_NAMES[uid],
    resourceKind: null,
    isCostResource: null,
    calendarUid: null,
    carry: {},
    carryElements: [],
  })
  const assignment = (uid: number, taskUid: number, resourceUid: number) => ({
    uid,
    taskUid,
    resourceUid,
    carry: {},
    carryElements: [],
  })
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task(ALPHA, '2026-04-01', '2026-04-10'),
        task(BETA, '2026-05-06', '2026-05-20'),
        task(GAMMA, '2026-06-01', '2026-06-12'),
      ],
      resources: [resource(ANNA), resource(BORIS)],
      assignments: [
        assignment(91, ALPHA, ANNA),
        assignment(92, BETA, ANNA),
        assignment(93, GAMMA, BORIS),
        assignment(94, GAMMA, ANNA),
      ],
      taskGroups: [
        {
          id: ROW_ID,
          parentId: null,
          label: 'One row',
          derivedFromTaskUid: null,
          order: 0,
          isCollapsed: false,
          isHidden: false,
          color: null,
          height: null,
        },
      ],
      taskGroupMembers: [ALPHA, BETA, GAMMA].map((taskUid) => ({
        taskUid,
        groupId: ROW_ID,
        stackOrder: null,
      })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

// ===========================================================================
// 3. The host UF-48 is given. Copied from the fr-029 file.
// ===========================================================================

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

function host(): Host {
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

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left' as PointerButton,
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

const ON_THE_SURFACE = { x: 80, y: 120 }

interface Stage {
  readonly loop: FrameLoop
  /** Take one entrance of 表 T-109, on the 面 that table puts it on. */
  take(icon: string, options?: { readonly resourceUid?: number }): void
  send(input: HumanInput): void
  view(): ScreenView
  document(): Document
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, documentWithRoster(), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  return {
    loop,
    take: (icon, options = {}) => {
      // ⚠️ CS-2 of 表 T-066 settles the gesture on what was drawn AT THE PRESS,
      // so the surface is told what it has drawn before the button goes down.
      screen.drawAt({
        part: surfaceOf(icon),
        entry: icon as any,
        format: null,
        rowGroupId: null,
        resourceUid: options.resourceUid ?? null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as unknown as ScreenPart)
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      screen.drawAt(null)
    },
    send,
    view: () => screen.last(),
    document: () => loop.document(),
  }
}

/** Open the roster and choose the assignees named. */
function rosterWith(chosen: readonly number[], language: DisplayLanguage = 'ja'): Stage {
  const built = stage(language)
  built.take('IC-62')
  for (const uid of chosen) built.take('IC-68', { resourceUid: uid })
  return built
}

const rosterOf = (view: ScreenView): any =>
  (view.openModal as any)?.surface === surfaceOf('IC-66') ? (view.openModal as any) : null

const namesOf = (document: Document, of: 'tasks' | 'resources'): readonly (string | null)[] =>
  ((document as any).schedule[of] as { name: string | null }[]).map((one) => one.name)

const assignmentCount = (document: Document): number =>
  ((document as any).schedule.assignments as unknown[]).length

// ===========================================================================
// 4. The premises every case below stands on
// ===========================================================================

describe('FR-099 -- the manuscript this file is driven by', () => {
  it('still states the two ways of deleting, each ending at its own （MUST）', () => {
    expect(REQUIREMENTS).toContain(FR_099_TWO_WAYS_OF_DELETING)
    expect(REQUIREMENTS).toContain(FR_099_ONE_ENTRANCE)
  })

  it('still asks for the TASK names before the delete, and forbids a bare count', () => {
    expect(REQUIREMENTS).toContain(FR_099_NAME_THE_TASKS)
    expect(REQUIREMENTS).toContain(FR_099_NOT_A_COUNT)
  })

  it('表 T-234 QN-3 still lists the tasks, and names FR-099 for its 正', () => {
    const row = rowOf(T_234, QN_3).cells.join(' ')
    expect(row).toContain('解かれる割当のタスクの名前')
    expect(bare(rowOf(T_234, QN_3).by['正'] ?? '')).toBe('FR-099')
    // ⚠️ THE RAW CELL, NOT `bare`: that helper answers with the FIRST backticked
    // token, which in this cell is the chain's own row id.
    expect(rowOf(T_234, QN_3).by['名前を挙げるか'] ?? '').toContain('挙げる')
  })

  it('表 T-050 CD-5 still says the Tasks themselves survive', () => {
    const row = rowOf(T_050, 'CD-5').cells.join(' ')
    expect(row).toContain('タスクは消えない')
  })

  it('表 T-109 still puts IC-62 on the palette and IC-66 / IC-68 on the roster', () => {
    // ⭐ THE JOIN EVERY PRESS BELOW IS AIMED BY, read rather than typed.
    expect(surfaceOf('IC-62')).toBe('Command Palette')
    expect(surfaceOf('IC-66')).toBe('Resource Roster')
    expect(surfaceOf('IC-68')).toBe('Resource Roster')
    expect(rowOf(T_109, 'IC-66').cells.join(' ')).toContain('選んだ担当者を消す')
    expect(rowOf(T_109, 'IC-68').cells.join(' ')).toContain('同じ入口で選ぶ')
  })

  it('the fixture separates the counts FR-099 separates', () => {
    // ⛔ WITHOUT THIS, "three task names" could be right for the wrong reason.
    const start = documentWithRoster()
    expect(namesOf(start, 'resources')).toHaveLength(2)
    expect(namesOf(start, 'tasks')).toHaveLength(3)
    expect(assignmentCount(start)).toBe(4)
    // ⭐ One assignee holds three of the four assignments, and one Task is held
    // by both -- so no count below can stand in for another.
    expect(new Set(namesOf(start, 'tasks')).size).toBe(3)
  })

  it('the roster opens at all', async () => {
    // ⛔ THE ROAD EVERY CASE BELOW WALKS. `IC-62` 「担当者の名簿を表示する」.
    const built = stage()
    built.take('IC-62')

    const roster = rosterOf(built.view())
    expect(roster, '表 T-109 IC-62 did not open the Resource Roster').not.toBeNull()
    expect(
      (roster.resources as { uid: number }[]).map((one) => one.uid).sort((a, b) => a - b),
    ).toEqual([ANNA, BORIS])
  })
})

// ===========================================================================
// 5. DFC-288 -- 「**選んだ担当者を消すこと**の 2 つとすること（MUST）」
// ===========================================================================

describe('FR-099 (MUST) -- IC-66 deletes the CHOSEN assignees', () => {
  it('choosing one and taking IC-66 raises a question rather than writing at once', () => {
    const built = rosterWith([ANNA])
    const before = built.document()

    built.take('IC-66')

    expect(
      built.view().confirmation,
      'FR-099 (MUST): 「消すことで解かれる割当があるときは……確認を求めること」',
    ).not.toBeNull()
    expect(
      built.document(),
      'the assignees went before the question was answered',
    ).toBe(before)
  })

  it('answering yes takes the chosen assignee and its assignments, and nothing else', () => {
    const built = rosterWith([ANNA])
    built.take('IC-66')

    built.send(answerKeyFor(PROCEED))
    const after = built.document()

    expect(namesOf(after, 'resources'), 'the chosen assignee is gone').toEqual([
      RESOURCE_NAMES[BORIS],
    ])
    // ⭐ 表 T-050 の `CD-5`: 「⚠️ **タスクは消えない** —— 担当が外れるだけである」.
    expect(namesOf(after, 'tasks'), 'CD-5 (⚠️): a Task must not go with an assignee').toEqual([
      TASK_NAMES[ALPHA],
      TASK_NAMES[BETA],
      TASK_NAMES[GAMMA],
    ])
    // ⭐ Three of the four assignments pointed at ANNA; BORIS's one survives.
    expect(assignmentCount(after)).toBe(1)
  })

  it('⭐ the control: the assignee NOT chosen stays, with its assignment', () => {
    // ⛔ WITHOUT THIS, A BUILD THAT EMPTIED THE WHOLE ROSTER WOULD PASS the case
    // above. FR-099's second way is 「**選んだ**担当者を消すこと」.
    const built = rosterWith([BORIS])
    built.take('IC-66')
    built.send(answerKeyFor(PROCEED))
    const after = built.document()

    expect(namesOf(after, 'resources')).toEqual([RESOURCE_NAMES[ANNA]])
    expect(assignmentCount(after), 'ANNA held three of the four assignments').toBe(3)
  })

  it('⭐ the control: answering no leaves the document exactly as it was', () => {
    const built = rosterWith([ANNA])
    const before = built.document()
    built.take('IC-66')

    built.send(answerKeyFor(CANCEL))

    expect(built.document(), 'the cancelling answer wrote something').toBe(before)
    expect(built.view().confirmation, 'the question stayed up after being answered').toBeNull()
  })
})

// ===========================================================================
// 6. DFC-289 -- 「そのタスクの名前を示して確認を求めること（MUST）。
//     件数だけを示してはならない（MUST NOT）」
// ===========================================================================

describe('表 T-234 QN-3 (MUST) -- the question names the TASKS, not the assignees', () => {
  it('the question raised is QN-3', () => {
    const built = rosterWith([ANNA])
    built.take('IC-66')

    expect(built.view().confirmation?.question).toBe(QN_3)
  })

  it('⭐⭐ one item per TASK whose assignment would be freed', () => {
    const built = rosterWith([ANNA])
    built.take('IC-66')

    const items = built.view().confirmation?.items ?? []
    expect(
      [...items].map((one) => one.name).sort(),
      '表 T-234 QN-3: 「挙げる —— **解かれる割当のタスクの名前**」',
    ).toEqual([TASK_NAMES[ALPHA], TASK_NAMES[BETA], TASK_NAMES[GAMMA]].sort())
  })

  it('⛔ and NOT one item per assignee', () => {
    // ⛔⛔ THE MISTAKE THE ROW WARNS AGAINST IN AS MANY WORDS: 「`QN-3` が挙げる
    // のはタスクであって担当者ではない」. ANNA is one assignee across three tasks,
    // so a question that listed the chosen assignees would carry ONE item with
    // her name in it.
    const built = rosterWith([ANNA])
    built.take('IC-66')

    const names = (built.view().confirmation?.items ?? []).map((one) => one.name)
    expect(names).not.toContain(RESOURCE_NAMES[ANNA])
    expect(names.length, 'one item arrived, which is the count of assignees and not of tasks').toBe(
      3,
    )
  })

  it('⭐ the control: choosing a different assignee lists a different set of tasks', () => {
    // ⛔ WITHOUT THIS, A BUILD THAT LISTED EVERY TASK IN THE DOCUMENT WOULD PASS
    // the case above -- the fixture has three tasks and ANNA reaches all three.
    // BORIS reaches exactly one.
    const built = rosterWith([BORIS])
    built.take('IC-66')

    expect(
      (built.view().confirmation?.items ?? []).map((one) => one.name),
      'the question listed tasks an unassignment would not reach',
    ).toEqual([TASK_NAMES[GAMMA]])
  })

  it('⛔ a bare count is not offered in place of the names (MUST NOT)', () => {
    const built = rosterWith([ANNA])
    built.take('IC-66')

    for (const item of built.view().confirmation?.items ?? []) {
      expect(item.name, 'FR-099 (MUST NOT): 「件数だけを示してはならない」').not.toBeNull()
      expect(String(item.name).length).toBeGreaterThan(0)
    }
  })
})

// ===========================================================================
// 7. ⭐ Nothing chosen -- no write, and the reason is told
// ===========================================================================

describe('FR-029 / 表 T-233 RS-27 -- IC-66 with nobody chosen', () => {
  it('writes nothing', () => {
    const built = rosterWith([])
    const before = built.document()

    built.take('IC-66')

    expect(
      built.document(),
      'a press with nobody chosen moved the document -- 「空で書き通すと、何も言わずに「編集あり」' +
        'になる」',
    ).toBe(before)
    expect(built.view().confirmation, 'a question was asked about nothing').toBeNull()
  })

  it('and tells the reason, which is 表 T-233 の RS-27', () => {
    const built = rosterWith([])

    built.take('IC-66')

    const told = built.view().notices
    expect(
      told.length,
      'the press returned in silence -- FR-029 (MUST): 「押されたときに限り、行えない理由を通知' +
        'すること」',
    ).toBe(1)
    expect(told[0]?.text).toBe(reasonWords(RS_27))
    expect(told[0]?.manner).toBe(bare(rowOf(T_233, RS_27).by['作法'] ?? ''))
  })

  it('⭐ the control: with somebody chosen the same press is not answered with a telling', () => {
    // ⛔ THE CASE THAT KEEPS THE TWO ABOVE FROM PASSING ON AN ENTRANCE THAT
    // ALWAYS COMPLAINS. Same entrance, same document; only the choosing differs.
    const built = rosterWith([ANNA])

    built.take('IC-66')

    expect(built.view().notices, 'IC-66 complained although it had work to do').toEqual([])
    expect(built.view().confirmation).not.toBeNull()
  })
})
