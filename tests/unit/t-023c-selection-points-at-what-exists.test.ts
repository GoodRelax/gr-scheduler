// The CLOSING RULE of table T-023c -- the paragraph that stands after the
// `SL-` rows: a selection may point only at things the document really has.
//
// Unit under test: UF-48 of table T-075 (`frame-loop.ts`, component CP-25 of
// table T-062). LY-5 of table T-060 makes it the only layer that may hold a
// current value, and UN-9 of table T-027 keeps the selection out of the
// document -- so the selection is a value THIS unit holds, and this unit is
// the only side that can be asked whether the invariant still stands after
// something has stopped existing.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1: 読んでよいのは冒頭の宣言・公開する型・署名まで).
// What was read under `src/`: the exported declarations of `frame-loop.ts`
// (`FrameEnvironment`, `FrameLoop`, `HeldDocumentCall`, `ScreenWiring`) and the
// signature `frameLoop(surface, first, env, screen?, …)`; the exported types of
// `screen-renderer.ts` (`DisplayLanguage`, `ScreenPart`, `ScreenSurface`,
// `ScreenView`), of `input-command-translator.ts` (`HumanInput`,
// `InputModifiers`, `KeyInput`), the `ItemRef` / `Selection` declarations of
// `selection.ts`, and the declaration of `AgentSnapshot.selection` in
// `snapshot-source.ts` (「AM-5」). ⛔ NO FUNCTION BODY WAS READ, and no expected
// value below was shaped from one.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. `host` / `screenPane` / `stage` / `key`
// and the template-based document are tests/unit/in-4-escape-closes-the-panel.
// test.ts's and tests/unit/uf-48-input.test.ts's, which drive this same unit
// through the same seams; the schedule that carries one of every SL-1 kind is
// tests/unit/uf-30-31.test.ts's `RICH_SCHEDULE`, written out here against the
// generated schema so that the loop is given a lawful document.
//
// ---------------------------------------------------------------------------
// THE RULE THESE CASES ANSWER TO (rule 03: name it, and read it at run time)
// ---------------------------------------------------------------------------
//
//   T-023c, the paragraph after the `SL-` rows (docs/spec/01-04-requirements.md):
//     「**選択は、文書に実在する対象だけを指すこと（MUST）。実在しなくなった対象を
//       選択に残してはならない（MUST NOT）**（利用者の裁定 2026-08-29）—— **選択は
//       文書の外の値である**ので（表 T-027 の `UN-9`）、`Task` や注記が消えても自動
//       では落ちない。⛔ **落とす場所を、消える入口ごとに定めてはならない（MUST
//       NOT）** —— **入口は 表 T-050 の連鎖・行の削除・取り消し／やり直し・別の文書を
//       開くこと（表 T-024a）と複数あり、入口ごとに書けば入口が増えるたびに規則が
//       増える。**⚠️ **いつ落とすかは本規則が定めない** —— 満たすべきは上の不変条件
//       だけである。」
//
//   T-023c SL-1  the five kinds a selection may hold -- 「タスク・依存線・ハイライト
//                ボックス・コメントボックス・基準日線」 -- and 「行（`TaskGroup`）は
//                対象に含めない」. EVERY ONE OF THE FIVE gets a case below.
//   T-036  SK-2  「選択できるものをすべて選択する（表 T-023c の SL-1）| `Ctrl+A`」 --
//                the one door a test outside the loop has for putting all five
//                kinds into a selection at once.
//   T-036  SK-3  「選択しているものを削除する（対象の全数は表 T-023c の SL-1）|
//                `Delete` / `Backspace`」 -- one of the entrances the rule names.
//   T-036  SK-6 / SK-7   `Ctrl+Z` / `Ctrl+Y` -- 取り消し／やり直し, two more.
//   T-036  SK-20 「**基準日線を出す / 消す**（`FR-046`。出すと本日が `statusDate` に
//                入り、消すと `null` になる）」 -- which is what makes the status
//                line stop existing, and what says how to ask whether it does.
//   T-027  UN-13 puts 基準日 (出す / 動かす / 消す) among the undoable, which is
//                what lets `Ctrl+Z` take the line away again.
//   T-230  RD-6  「起動時の文書 | 呼び手が持って来る」 -- the one row of that table
//                whose `WS-3` column lets a caller bring a whole document, and
//                so the only whole-document replacement drivable from here.
//   AM-5         `AgentSnapshot.selection` -- how the selection is read back.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   1. WHEN the dropping happens. The rule says so itself in as many words:
//      「⚠️ **いつ落とすかは本規則が定めない** —— 満たすべきは上の不変条件だけで
//      ある」. So every case below reads the selection only after the thing has
//      stopped existing, and never counts frames or names a moment.
//   2. WHERE in the code the dropping is decided. The second MUST NOT --
//      「落とす場所を、消える入口ごとに定めてはならない」 -- is about the shape of
//      the rule, not about a value, and no test can see a call site. ⭐ WHAT A
//      TEST CAN DO IS WALK THE ENTRANCES: the rule names four (表 T-050 の連鎖・
//      行の削除・取り消し／やり直し・別の文書を開くこと), and a build that had
//      written the drop per entrance would show it as one entrance that forgot.
//      Three of the four are driven below; 行の削除 is NOT -- see 5.
//   3. THAT THE SELECTION SURVIVES anything. Nothing in the manuscript says it
//      does, so no case here asserts that the items which still exist stay
//      selected: a build that emptied the whole selection every frame would
//      satisfy this closing rule. ⛔ Which means these cases could pass
//      vacuously against such a build, and the only guard against that is
//      section 2 of 04-verification -- each expectation below was inverted once
//      and seen to fail against this build.
//   4. UN-9 of table T-027 (「選択」 is 対象外 of the undo history). That is the
//      REASON the closing rule gives for existing -- 「選択は文書の外の値である」
//      -- and not a thing this file may assert: it says what the history does
//      NOT carry, and the undo case below asks only what the invariant is,
//      never whether a step was stacked.
//   5. 行の削除 as an entrance. FR-032 puts row deletion behind the row-title
//      panel and behind a confirmation, and table T-023c's own note says the
//      row set and the selection set are different sets -- so a case for it
//      would have to press through a panel this file draws nothing of.
//      REPORTED rather than approximated. ⚠️ CD-2 of table T-050 makes it the
//      entrance where a Task vanishes WITHOUT having been selected for deletion,
//      which is exactly the shape the second MUST NOT is about.
//   6. WHICH kinds a marquee (SL-3) or a click (SL-2) would have picked. SK-2 is
//      the only door used here, and SL-7b says a select-all makes no order, so
//      nothing below reads `ordered` either.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type {
  ItemRef,
  SelectableKind,
  Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type HeldDocumentCall,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// What the manuscript says, read at run time rather than copied
// ===========================================================================

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').split('\n')

/**
 * The one line of the manuscript that carries the closing rule, found by the
 * words the rule itself opens with rather than by a line number.
 */
function closingRuleLine(): string {
  const found = REQUIREMENTS.find((line) =>
    line.startsWith('**選択は、文書に実在する対象だけを指すこと'),
  )
  if (found === undefined) {
    throw new Error('table T-023c no longer states the closing rule this file is about')
  }
  return found
}

/** SL-1's own cell, which names the kinds a selection may hold. */
const SL_1 = specTable('T-023c').rows.find((row) => row.id === 'SL-1')?.cells.join(' ') ?? ''

/**
 * SL-1's five kinds, each tied to the word the row spells it with.
 *
 * ⭐ THE WORDS ARE READ, THE SPELLINGS ARE THE UNION'S. `SelectableKind` is the
 * published type, so the left half cannot drift without a type error; the right
 * half is checked against SL-1's own cell by a premise below, so a kind that
 * left the row cannot go on being tested here.
 */
const SL_1_KINDS: readonly { readonly kind: SelectableKind; readonly word: string }[] = [
  { kind: 'task', word: 'タスク' },
  { kind: 'dependency', word: '依存線' },
  { kind: 'highlightBox', word: 'ハイライトボックス' },
  { kind: 'commentBox', word: 'コメントボックス' },
  { kind: 'statusLine', word: '基準日線' },
]

/** One row of table T-036, as the manuscript spells its assignment. */
const assignmentOf = (row: string): string => {
  const found = specTable('T-036').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  return bare(found.by['割当'] ?? '')
}

// ===========================================================================
// The document these cases drive
// ===========================================================================

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of. The calendar,
// the project and the settings come from it; the rows, the Tasks and the three
// annotations are written out here so that what vanishes can be named.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'

/** The Task the dependency ends at, and the one that owns the row it stands on. */
const PREDECESSOR = 1
const SUCCESSOR = 2
/** A third Task, so that one may vanish without taking the dependency with it. */
const SPARE = 3

const HIGHLIGHT = 'h1'
const COMMENT = 'c1'

/** A day inside the drawn schedule, spelled the way a date column is. */
const STATUS_DATE = '2026-05-01T00:00:00'

/**
 * A document carrying one of every kind SL-1 admits.
 *
 * ⚠️ Every nullable column is spelled `null`; leaving one `undefined` reads as
 * 「set」 to the generated schema, which a premise below runs over this value.
 */
function richDocument(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (uid: number, start: string, finish: string, name: string): Task =>
    ({
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
    }) as unknown as Task
  const row = (id: string, label: string, order: number) => ({
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
  const successor = task(SUCCESSOR, '2026-05-06T00:00:00', '2026-05-20T00:00:00', 'Two') as any
  successor.dependencies = [
    {
      predecessorUid: PREDECESSOR,
      linkType: 1,
      lag: null,
      lagFormat: null,
      carry: {},
      carryElements: [],
    },
  ]
  const draft = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: STATUS_DATE,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task(PREDECESSOR, '2026-04-01T00:00:00', '2026-04-10T00:00:00', 'One'),
        successor,
        task(SPARE, '2026-06-01T00:00:00', '2026-06-05T00:00:00', 'Three'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, 'Alpha', 0), row(BETA, 'Beta', 1)],
      taskGroupMembers: [
        { taskUid: PREDECESSOR, groupId: ALPHA, stackOrder: null },
        { taskUid: SUCCESSOR, groupId: BETA, stackOrder: null },
        { taskUid: SPARE, groupId: BETA, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [
        {
          id: COMMENT,
          leaderShapeKind: null,
          text: 'a note',
          anchorDate: '2026-04-02T00:00:00',
          anchorGroupId: ALPHA,
          bodyOffsetPx: null,
        },
      ],
      highlightBoxes: [
        {
          id: HIGHLIGHT,
          startDate: '2026-04-01T00:00:00',
          endDate: '2026-04-10T00:00:00',
          topGroupId: ALPHA,
          bottomGroupId: ALPHA,
          strokeColor: null,
          cornerRadiusPx: null,
        },
      ],
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

/**
 * The same document with ONE kind's only member taken out of it.
 *
 * ⭐ ONE AT A TIME, so that each case names one kind. Taking the Task out takes
 * its row membership with it -- a member pointing at a Task that is not there is
 * a document nobody may write -- and nothing else in the fixture refers to it.
 */
function documentWithout(kind: SelectableKind): Document {
  return richDocument((draft) => {
    const schedule = draft.schedule
    switch (kind) {
      case 'task':
        schedule.tasks = schedule.tasks.filter((one: any) => one.uid !== SPARE)
        schedule.taskGroupMembers = schedule.taskGroupMembers.filter(
          (one: any) => one.taskUid !== SPARE,
        )
        return
      case 'dependency':
        for (const one of schedule.tasks) one.dependencies = []
        return
      case 'highlightBox':
        schedule.highlightBoxes = []
        return
      case 'commentBox':
        schedule.commentBoxes = []
        return
      case 'statusLine':
        schedule.project.statusDate = null
        return
    }
  })
}

// ===========================================================================
// Whether one selected thing is still in the document
// ===========================================================================

/**
 * 「文書に実在する」 spelled out for each of SL-1's five kinds.
 *
 * ⭐ Each answer is the one the manuscript already gives for that kind: a Task
 * is a row of the schedule's Tasks (AT of the ERD keys it by `uid`, which is
 * also what `ItemRef` carries); a dependency is an entry of its successor's own
 * list, which is what `successorUid` + `ordinal` name; the two boxes are keyed
 * by `id`; and the status line exists exactly while `statusDate` is not `null`
 * -- SK-20 of table T-036 says so in as many words 「出すと本日が `statusDate` に
 * 入り、消すと `null` になる」.
 */
function itemExists(document: Document, item: ItemRef): boolean {
  const schedule = (document as any).schedule
  switch (item.kind) {
    case 'task':
      return schedule.tasks.some((one: any) => one.uid === item.uid)
    case 'dependency': {
      const successor = schedule.tasks.find((one: any) => one.uid === item.successorUid)
      return successor !== undefined && item.ordinal < successor.dependencies.length
    }
    case 'highlightBox':
      return schedule.highlightBoxes.some((one: any) => one.id === item.id)
    case 'commentBox':
      return schedule.commentBoxes.some((one: any) => one.id === item.id)
    case 'statusLine':
      return schedule.project.statusDate !== null
  }
}

/** The MUST, as one sentence: every selected thing is in the document. */
function ghostsIn(document: Document, selection: Selection): readonly ItemRef[] {
  return selection.items.filter((item) => !itemExists(document, item))
}

const holds = (selection: Selection, kind: SelectableKind): readonly ItemRef[] =>
  selection.items.filter((item) => item.kind === kind)

// ===========================================================================
// The host UF-48 is given
// ===========================================================================

/** BO-1 of table T-077 has already settled these by the time a loop exists. */
const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of table T-060 puts the browser
 * in this layer. ⛔ Nothing in this fake decides anything about a selection.
 */
function host() {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: (): void => {
      // Bounded, so a loop that asks for a frame from inside a frame -- which
      // NFR-010 forbids -- ends the test instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

function screenPane(language: DisplayLanguage = 'ja') {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    // IF-9's fifth answer. This fake draws no field, so nothing is unsettled.
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language } satisfies ScreenWiring,
    last: (): ScreenView => {
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

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const key = (which: string, modifiers: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key: which,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
})

/** The rows of table T-036 these cases press, spelled by the row's own words. */
const SELECT_ALL = (): HumanInput => key('A', { ctrl: true })
const DELETE = (): HumanInput => key('Delete')
const UNDO = (): HumanInput => key('Z', { ctrl: true })
const REDO = (): HumanInput => key('Y', { ctrl: true })
const STATUS_LINE_SWITCH = (): HumanInput => key('D', { ctrl: true, shift: true })

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  /** RD-6 of table T-230: a caller brings a whole document. */
  replace(document: Document): void
  document(): Document
  /** AM-5 of table T-107 -- the selection as it stands. */
  selection(): Selection
}

function stage(first: Document): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, first, SCREEN, screen.wiring)
  // The first frame is owed by the loop being made, so it is drained before any
  // case presses a key.
  pen.runAnimationFrames()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    replace: (document) => {
      loop.holdDocument({ row: 'RD-6', document } as unknown as HeldDocumentCall)
      pen.runAnimationFrames()
    },
    document: () => loop.document(),
    selection: () => loop.agentApiSeams().source.readSnapshot().selection,
  }
}

/** A loop whose selection holds one of every kind SL-1 admits. */
function withEverythingSelected(first: Document = richDocument()): Stage {
  const built = stage(first)
  built.send(SELECT_ALL())
  return built
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ table T-023c still closes with the rule this file is about', () => {
    // ⛔ WITHOUT THIS, A RULE THAT HAD BEEN REWORDED OR WITHDRAWN WOULD LEAVE
    // every case below testing a habit instead of a requirement.
    const rule = closingRuleLine()
    expect(rule, 'the MUST').toContain('文書に実在する対象だけを指すこと（MUST）')
    expect(rule, 'the MUST NOT').toContain('選択に残してはならない（MUST NOT）')
    expect(rule, 'the second MUST NOT, about where the dropping is decided').toContain(
      '落とす場所を、消える入口ごとに定めてはならない（MUST NOT）',
    )
    expect(rule, 'and it still leaves the moment open').toContain(
      'いつ落とすかは本規則が定めない',
    )
  })

  it('the rule still names more than one entrance, which is why more than one is walked', () => {
    // 「入口は 表 T-050 の連鎖・行の削除・取り消し／やり直し・別の文書を開くこと
    // （表 T-024a）と複数あり」. ⭐ Read rather than copied: an entrance added to
    // that sentence has to reach this file rather than slide past it.
    const rule = closingRuleLine()
    for (const entrance of ['表 T-050 の連鎖', '行の削除', '取り消し／やり直し', '別の文書を開く']) {
      expect(rule, `the rule still names ${entrance}`).toContain(entrance)
    }
  })

  it('SL-1 still names the five kinds these cases walk, and still excludes rows', () => {
    for (const one of SL_1_KINDS) {
      expect(SL_1, `SL-1 still names ${one.kind}`).toContain(one.word)
    }
    expect(SL_1_KINDS).toHaveLength(5)
    expect(SL_1, 'SL-1 still keeps rows out').toContain('行（`TaskGroup`）は対象に含めない')
  })

  it('the keys these cases press are still the ones table T-036 assigns', () => {
    expect(assignmentOf('SK-2')).toBe('Ctrl+A')
    expect(assignmentOf('SK-3')).toContain('Delete')
    expect(assignmentOf('SK-6')).toBe('Ctrl+Z')
    expect(assignmentOf('SK-7')).toContain('Ctrl+Y')
    // SK-20's cell spells the combination with the manuscript's own spacing.
    expect(specTable('T-036').rows.find((one) => one.id === 'SK-20')?.by['割当'] ?? '').toContain(
      'Shift',
    )
  })
})

describe('the fixture, and the one door these cases select through', () => {
  it('is a valid GRS JSON document carrying one of every SL-1 kind', () => {
    const made = richDocument()
    const report = validateDocument(made)
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
    const schedule = (made as any).schedule
    expect(schedule.tasks).toHaveLength(3)
    expect(schedule.tasks[1].dependencies).toHaveLength(1)
    expect(schedule.highlightBoxes).toHaveLength(1)
    expect(schedule.commentBoxes).toHaveLength(1)
    expect(schedule.project.statusDate).not.toBeNull()
  })

  it('SK-2: `Ctrl+A` puts one of every SL-1 kind into the selection', () => {
    // 「選択できるものをすべて選択する（表 T-023c の SL-1）」 -- the premise the
    // five cases below rest on. A kind that never got into the selection could
    // not be seen to fall out of it.
    const built = withEverythingSelected()
    for (const one of SL_1_KINDS) {
      expect(holds(built.selection(), one.kind).length, `${one.kind} was picked`).toBeGreaterThan(0)
    }
    expect(ghostsIn(built.document(), built.selection()), 'and all of them exist').toEqual([])
  })

  it('every document these cases replace with is lawful too', () => {
    for (const one of SL_1_KINDS) {
      const report = validateDocument(documentWithout(one.kind))
      expect(report.errors, `the document without the ${one.kind}`).toEqual([])
    }
  })
})

// ===========================================================================
// The closing rule, walked over every kind SL-1 admits
// ===========================================================================

describe('表 T-023c の結び -- a thing that stops existing does not stay selected', () => {
  for (const one of SL_1_KINDS) {
    it(`SL-1 ${one.kind}: it falls out of the selection when the document loses it`, () => {
      // 「実在しなくなった対象を選択に残してはならない（MUST NOT）」. The route is
      // 別の文書を開くこと -- a whole document arriving in place of the one the
      // loop holds, which table T-230 admits on row RD-6.
      // ⚠️ THE STATUS LINE IS THE ONE WITH NO ID. `ItemRef` gives it no field at
      // all, so a build that decided existence by looking an id up in a list
      // would keep it selected for ever; here 「実在する」 is `statusDate` not
      // being `null`, which SK-20 of table T-036 states.
      const built = withEverythingSelected()
      const before = holds(built.selection(), one.kind)
      expect(before.length, `${one.kind} was selected to begin with`).toBeGreaterThan(0)

      const next = documentWithout(one.kind)
      // ⭐ WHICH of the selected ones the replacement really took away, asked of
      // the arriving document rather than assumed: the fixture keeps two other
      // Tasks, so 「the ones that stopped existing」 is a smaller set than
      // 「the ones of this kind」 for exactly one of the five.
      const vanished = before.filter((item) => !itemExists(next, item))
      expect(vanished.length, `the replacement really took a ${one.kind} away`).toBeGreaterThan(0)

      built.replace(next)

      const after = built.selection()
      for (const gone of vanished) {
        expect(
          after.items.some((held) => JSON.stringify(held) === JSON.stringify(gone)),
          `${JSON.stringify(gone)} is no longer in the document, so it may not be in the selection`,
        ).toBe(false)
      }
      // The MUST, read over the whole selection and not only over the one kind.
      expect(ghostsIn(built.document(), after)).toEqual([])
    })
  }
})

// ===========================================================================
// The entrances -- the second MUST NOT, walked rather than inspected
// ===========================================================================

describe('the invariant holds at every entrance this file can drive', () => {
  it('SK-3 / 表 T-050: deleting the selection leaves no ghost behind', () => {
    // 「選択しているものを削除する（対象の全数は表 T-023c の SL-1）」 -- the
    // entrance the closing rule names first (表 T-050 の連鎖).
    const built = withEverythingSelected()
    built.send(DELETE())
    expect(ghostsIn(built.document(), built.selection())).toEqual([])
  })

  it('SK-6 / RD-1: undoing what put the status line up drops it from the selection', () => {
    // The 取り消し half of 「取り消し／やり直し」, driven through the one kind
    // whose existence is a column rather than a row: SK-20 puts today into
    // `statusDate` (FR-046), UN-13 of table T-027 makes that undoable, and
    // `Ctrl+Z` therefore takes the line away again while it is selected.
    const built = stage(richDocument((draft) => {
      draft.schedule.project.statusDate = null
    }))
    built.send(STATUS_LINE_SWITCH())
    expect(
      (built.document() as any).schedule.project.statusDate,
      'SK-20 put the line up',
    ).not.toBeNull()

    built.send(SELECT_ALL())
    expect(holds(built.selection(), 'statusLine').length, 'and it was selected').toBe(1)

    built.send(UNDO())
    expect(
      (built.document() as any).schedule.project.statusDate,
      'the undo took the line away again',
    ).toBeNull()
    expect(holds(built.selection(), 'statusLine')).toEqual([])
    expect(ghostsIn(built.document(), built.selection())).toEqual([])
  })

  it('SK-7 / RD-2: redoing a deletion leaves no ghost behind either', () => {
    // The やり直し half. ⭐ The selection is made again AFTER the undo has put
    // everything back, so the redo is a step that takes things away from a
    // selection that is holding them at that moment.
    const built = withEverythingSelected()
    built.send(DELETE())
    built.send(UNDO())
    const back = (built.document() as any).schedule
    expect(back.tasks.length, 'the undo put the Tasks back').toBe(3)

    built.send(SELECT_ALL())
    expect(built.selection().items.length, 'and they could be selected again').toBeGreaterThan(0)

    built.send(REDO())
    expect((built.document() as any).schedule.tasks, 'the redo took them away again').toEqual([])
    expect(ghostsIn(built.document(), built.selection())).toEqual([])
  })

  it('別の文書を開くこと: a document with nothing in common leaves no ghost behind', () => {
    // The fourth entrance, at its widest: every one of the five kinds stops
    // existing at once. ⚠️ Driven on RD-6 of table T-230, which is the only row
    // whose `WS-3` column says 「呼び手が持って来る」 and so the only whole-document
    // replacement reachable from outside the loop.
    const built = withEverythingSelected()
    expect(built.selection().items.length).toBeGreaterThan(0)
    built.replace(
      richDocument((draft) => {
        draft.schedule.tasks = []
        draft.schedule.taskGroupMembers = []
        draft.schedule.commentBoxes = []
        draft.schedule.highlightBoxes = []
        draft.schedule.project.statusDate = null
      }),
    )
    expect(ghostsIn(built.document(), built.selection())).toEqual([])
    for (const one of SL_1_KINDS) {
      expect(holds(built.selection(), one.kind), `no ${one.kind} may remain`).toEqual([])
    }
  })
})
