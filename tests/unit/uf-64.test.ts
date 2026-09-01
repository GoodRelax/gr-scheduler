// Unit tests for `propertiesPanelFromSelection` (unit UF-64 of table T-075,
// component CP-37 of table T-062, `properties-panel.ts`).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, and the declarations a tester may read -- the "nine unit contracts"
// section of `screen-renderer.ts`, which fixes this signature, the view types
// it publishes, and the entity types the arguments are made of. Nothing here
// was taken from how the unit computes its answer.
//
// The rules these cases answer to:
//   FR-072    the last operation decides which of the two the panel shows;
//             ⛔ clearing the selection does NOT move it to the settings
//             (MUST NOT); a cleared selection KEEPS what the panel had (MUST);
//             ⛔ no heading row stands at the head of the panel (MUST NOT), and
//             which of the two is showing is the ENTRANCE's to say through its
//             pressed state (MUST) -- that entrance is IC-17 in the `App
//             Header`, which is UF-62's and is driven by tests/unit/uf-62.test.ts
//             ⚠️ CR-272 dropped the heading on 2026-08-27. Three cases in this
//             file were written against it and are gone; what replaced them is
//             the MUST NOT, and the RATIONALE's own record of what that costs:
//             「**選択が解除されても、パネルは直前の中身を出したまま「これは直前
//             のものである」と示さない。**⛔ **利用者はそれを承知で「無用」と述べ
//             た。**」
//   FR-006    the items of table T-016 stand in the panel, and everything the
//             table does not mark read-only can be edited
//   表 T-016  the roster, its printed order, its item names, its ' / ' between
//             the several columns of one row, and the one read-only row (PR-9,
//             derived by FR-012). ⚠️ PR-16 is editable after CR-186
//             (A-appendix 0.63) and AS-5 makes that a MUST
//   the paragraph under 表 T-016 (2026-08-26): the printed order is a MUST and
//             ⛔ scrolling for the most-touched values is a MUST NOT; the form
//             of an input follows the table's own 入力の型 column (MUST); ⛔ the
//             candidates, the bounds and which columns are dates may NOT be
//             copied into that table (MUST NOT), so no case here asserts them
//             from it either
//   FR-038    menus and panels follow the chosen language, and ⛔ task names,
//             row names and table T-016's item names are NOT translated
//   FR-054    the day is the LEXICAL date part (MUST) and no zone is converted
//             (MUST NOT)
//   AS-5/6/9  of table T-225 (FR-008): the panel's assignee is editable (MUST),
//             what a person is shown is the NAME and never the `uid` (MUST
//             NOT), and the name is looked up in the roster by the `uid` (MUST)
//   FR-009    a selected dependency shows kind, lag and both ends (MUST) --
//             the requirement says in as many words that table T-016 carries no
//             dependency row and that FR-072 resolves to this
//   SL-1/SL-7b of table T-023c: what may be selected, and that a selection made
//             all at once carries no order to rely on (MUST NOT)
//   IC-17     of table T-109 (_assets/tbl-glossary.md): the document's drawing
//             settings go into this panel
//   DR-3      of table T-052: the presentation group is what those settings are
//   UN-13     of table T-027: a settings change is undone, so it is edited
//   R7.1      table T-075 makes this unit `pure`, so it may not write to what
//             it was handed
//
// ⭐ Chapter 1.9 asks a test of a requirement that points at a table to be
// driven by a fixed copy of the table. `T_016` below is that copy, and every
// roster case walks it. ⛔ IT IS NOT WRITTEN OUT HERE -- it is read from
// `docs/spec` at run time, for the reason recorded above the constant.
//
// ⭐ WHAT THIS FILE DELIBERATELY DOES NOT ASSERT, because the specification
// decides none of it. Each was searched for before being given up on:
//
//   1. THAT ANYTHING AT ALL TELLS A CLEARED SELECTION FROM A HELD ONE. ⛔ The
//      requirement now says the opposite in as many words, and says it is a
//      price the reader chose: 「⚠️ **見出しを落とした代償を書き残す**（利用者の
//      指示 2026-08-27）—— **選択が解除されても、パネルは直前の中身を出したまま
//      「これは直前のものである」と示さない。**」 So no case here asks the panel
//      to read differently once the subject is gone. ⚠️ `isSubjectGone` is still
//      asserted -- it is the state the unit REPORTS, and the cases stop there;
//      whether anything on the screen may be built from it is not this unit's.
//      ⭐ The one place a reader is told anything is the entrance's pressed
//      state, and FR-072's RATIONALE limits even that to the other question:
//      「⭐ **押下状態は「選択物を出しているか、設定を出しているか」だけを担い、
//      「その選択物がまだ選ばれているか」は担わない** —— **この 2 つは別の問いで
//      ある。**」 That entrance is IC-17 and lives in UF-62.
//   2. How a number, a truth value, a list or a nested settings group is
//      spelled. Table T-016 fixes the items and the one read-only mark and no
//      spelling; `_assets/tbl-settings.md` holds values, not renderings. So a
//      case asserts that two unlike stored values REACH THE SCREEN UNLIKE --
//      an item drawn the same either way is not shown at all -- and never the
//      text itself. The one exception is a date, which FR-054 does fix.
//   3. Which fields the panel KEEPS when the selection is cleared. FR-072
//      (MUST) says the ones it had; nothing this unit is handed remembers
//      them. Searched `ScreenSession` (it carries `propertiesShowing` for the
//      other half of the same requirement and no fields), table T-203 (S-80
//      keeps the panel's width alone), table T-206 and FR-072 itself. The
//      cases therefore assert only the half the unit CAN keep: `showing` does
//      not move and `isSubjectGone` is raised.
//   4. The `row` a settings field names. `PropertyField.row` asks for a `K-n`
//      of table T-104, and that table reaches no generated roster in `src/`;
//      measured, it does not even cover the group -- `carryMaxDepth`,
//      `importMaxDate`, `importMinDate` and the `fontScaleSizes` leaves have no
//      row, and `watermarkOpacity` / `importSeq` / `themeHue` /
//      `planActualGuideColor` are rows with no key in this group. A copied map
//      would be wrong on arrival, so the cases assert only that a settings
//      field names something, not what.
//   5. The order the settings side lists its keys in, and how `ordinal` counts
//      a dependency inside its successor. Table T-104's printed order reaches
//      no roster in `src/`, and no row anywhere fixes the ordinal; the cases
//      compare the settings keys as a SET, and use a successor holding exactly
//      one dependency at the array position the rest of the product counts
//      from (AT-72's ordinal, which `import-document` issues from 0).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  Assignment,
  Dependency,
  Resource,
  Schedule,
  Task,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionOfAll,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import type {
  PropertiesPanel,
  PropertyControlKind,
  PropertyField,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Table T-016, READ OUT OF THE MANUSCRIPT AT RUN TIME rather than copied here.
//
// ⭐ WHY IT IS READ AND NOT RETYPED. The paragraph under the table makes its
// PRINTED order a MUST -- 「表 T-016 は印刷順に出すこと（MUST）。よく使う項目を
// 上に置いてある」 -- and it goes on to forbid the scrolling that a wrong order
// costs: 「最も頻繁に触る値のためにスクロールさせてはならない（MUST NOT）」.
// ⛔ An order the TABLE owns cannot be pinned by a list kept here: the table was
// reordered on 2026-08-26 and a hand-written copy at this spot went stale in the
// same commit, reporting the panel as wrong when the panel was right. Chapter
// 1.9 (:275) asks for "fixed data copied from that table"; `tests/contract/
// spec-table.ts` takes that literally and makes the copy at read time.
//
// ⚠️ The row ids are NOT in numeric order and are not meant to be -- PR-3 and
// PR-16 stand second and third, and PR-15 is last. That is the table's judgement
// about what a person touches most, and a case here may not have an opinion.
//
// ⚠️ The column headings are the manuscript's own Japanese and cannot be spelled
// in English (rule 03 section 5 admits Japanese where the Japanese itself is
// what is being handled -- the same exception `S_73` below already relies on).
// ---------------------------------------------------------------------------

/**
 * The heading of the column that holds the GRS JSON column names.
 *
 * ⛔ NOT THE NAME THE SCREEN SHOWS, AND THAT IS THE CHANGE CR-278 MADE. Table
 * T-016 carried an 項目名（英語・画面表示） column until 2026-08-28 and the panel
 * drew it verbatim, which is how `strokeColor` and `fadeInDays` reached a
 * reader (the user's reports D-81 and D-84). FR-038 (MUST NOT) now keeps the
 * shown name in the dictionary, under the same row id -- `SHOWN_NAME` below.
 */
const NAME_COLUMN = '列（`GRS JSON`）'

/**
 * The name each row of table T-016 shows, read out of the dictionary
 * MANUSCRIPT, which FR-038 (MUST NOT) makes the one place it may live.
 *
 * ⭐ THE MANUSCRIPT AND NOT THE COPY IN `src/`: reading the file beside the unit
 * would let this agree with a drift `npm run gen:check` exists to catch.
 */
const SHOWN_NAME: Readonly<Record<string, { readonly ja: string; readonly en: string }>> =
  Object.fromEntries(
    (
      JSON.parse(
        readFileSync(join(process.cwd(), 'docs/spec/_source/display-words.json'), 'utf8'),
      ) as { properties: { rowId: string; label: { ja: string; en: string } }[] }
    ).properties.map((item) => [item.rowId, item.label]),
  )

/** The heading of the column added on 2026-08-26, which FR-006's panel obeys. */
const INPUT_KIND_COLUMN = '入力の型'

/**
 * The heading of the column added on 2026-09-02 (CR-325), and the value that
 * puts a row on a selected TASK's panel.
 *
 * ⛔ FR-006 (MUST): 「いま選ばれているものと同じ「対象」を持つ行だけを出すこと」,
 * and (MUST NOT) 「対象の違う行を出してはならない」. ⚠️ THE CASES BELOW DRIVE A
 * SELECTED TASK, so the roster they hold the panel against is the `Task` half --
 * holding it against the whole table would be asserting the very thing that
 * MUST NOT forbids.
 */
const APPLIES_TO_COLUMN = '対象'
const ON_A_TASK = 'Task'
const ON_A_ROW = 'TaskGroup'

/**
 * FR-006 (MUST): 「同表が読み取り専用と記した項目を除いて」編集できること.
 * The MARK is looked for wherever the row writes it, so moving it from the
 * remark column into 入力の型 -- which is what happened on 2026-08-26 -- does
 * not silently turn a read-only item editable here.
 */
const READ_ONLY_MARK = '読み取り専用'

const T_016 = specTable('T-016').rows.map((row) => {
  const nameCell = row.by[NAME_COLUMN]
  if (nameCell === undefined) {
    throw new Error(
      `table T-016 has no ${JSON.stringify(NAME_COLUMN)} column; its headings are ` +
        `${JSON.stringify(specTable('T-016').headings)}`,
    )
  }
  const appliesToCell = row.by[APPLIES_TO_COLUMN]
  if (appliesToCell === undefined) {
    throw new Error(
      `table T-016 has no ${JSON.stringify(APPLIES_TO_COLUMN)} column; its headings are ` +
        `${JSON.stringify(specTable('T-016').headings)}`,
    )
  }
  return {
    row: row.id,
    appliesTo: appliesToCell.replace(/`/g, '').trim(),
    // ⚠️ The table's OWN ' / ' between the several columns of one row is kept;
    // only the manuscript's code spans come off.
    // The COLUMN, kept for the cases that name a field by what it edits.
    columns: nameCell.replace(/`/g, '').trim(),
    // What the panel prints, which is the dictionary's and not this table's.
    name: SHOWN_NAME[row.id]?.ja ?? '',
    nameInEnglish: SHOWN_NAME[row.id]?.en ?? '',
    readOnly: row.cells.some((cell) => cell.includes(READ_ONLY_MARK)),
    inputKinds: (row.by[INPUT_KIND_COLUMN] ?? '')
      .split('/')
      .map((one) => one.replace(/`|\*/g, '').replace(/（[^）]*）/g, '').trim())
      .filter((one) => one.length > 0),
  }
})

/**
 * The half of table T-016 a selected `Task` puts up, in the table's own order.
 *
 * ⚠️ The whole table is kept above, and the cases that say what the panel does
 * NOT show go on using it: a dependency's panel and a comment box's may not
 * carry a `TaskGroup` row either.
 */
const T_016_ON_A_TASK = T_016.filter((item) => item.appliesTo === ON_A_TASK)

/**
 * Table T-016's 入力の型 column against the members of `PropertyControlKind`.
 *
 * ⭐ THE WORDS ARE THE TABLE'S AND THE SPELLINGS ARE THE DECLARATION'S:
 * `PropertyControlKind` in `screen-renderer.ts` names that very column as what
 * it is and gives each of its seven members the table's word in a comment. A
 * tester may read a published type (rule 04 section 1).
 */
const KIND_OF_INPUT: Readonly<Record<string, PropertyControlKind>> = {
  文字: 'text',
  複数行: 'multiline',
  日付: 'date',
  数値: 'number',
  真偽: 'boolean',
  選択: 'choice',
  色: 'color',
}

/** FR-009 (MUST): kind, lag and BOTH ends. Table T-016 carries no such row. */
const DEPENDENCY_ITEMS = ['lag', 'linkType', 'predecessorUid', 'successorUid'] as const

// ---------------------------------------------------------------------------
// Inputs.
// ---------------------------------------------------------------------------

/**
 * `SETTINGS_DEFAULTS` is printed with the dotted keys `_assets/tbl-settings.md`
 * writes, while `DocumentSettings` is the nested shape. Expanding the roster is
 * what keeps a case from re-typing a value the manuscript already holds.
 */
const nested = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    const last = path[path.length - 1] as string
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[last] = flat[key]
  }
  return out
}

/** A case pins the dotted keys it means; every other value is the manuscript's. */
const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  nested({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf()

/**
 * S-73's default hue, read out of table T-216 rather than written here.
 *
 * DR-5 of table T-052 keeps the hue on `Project`, so `SETTINGS_DEFAULTS` --
 * which is where every other manuscript value in this file comes from -- does
 * not carry it.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  // The seven members `ScreenSession` requires that no case here varies:
  // `iconUnderPointer` is EZ-2's place condition (`null` -- the pointer rests
  // on no icon), `themePreference` is S-72 and `isMilestoneListOpen` S-142
  // (both the manuscript's default -- a property field carries neither),
  // `themeHue` is S-73 read from the manuscript, `selectedGroupIds` is FR-085's
  // set of rows and `selectedResourceUids` FR-099's set of resources (both
  // empty -- none chosen), and `propertiesSubject` is FR-072's remembered
  // subject (`null` -- no operation has chosen one yet).
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: 'selection',
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

const sessionWith = (part: Partial<ScreenSession>): ScreenSession => ({ ...SESSION, ...part })

/** ET-2 with every nullable column spelled out; leaving one `undefined` reads as "set". */
const taskOf = (part: Record<string, unknown>): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...part,
  }) as unknown as Task

/** ET-11, likewise. Four rows of table T-016 read their columns from here. */
const visualOf = (part: Record<string, unknown>): TaskVisual =>
  ({
    nameAnchor: null,
    nameAlign: null,
    shapeKind: null,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
    ...part,
  }) as unknown as TaskVisual

const resourceOf = (uid: number, name: string | null): Resource =>
  ({
    uid,
    name,
    resourceKind: null,
    isCostResource: null,
    calendarUid: null,
    carry: {},
    carryElements: [],
  }) as unknown as Resource

const assignmentOf = (uid: number, taskUid: number | null, resourceUid: number | null): Assignment =>
  ({ uid, taskUid, resourceUid, carry: {}, carryElements: [] }) as unknown as Assignment

const dependencyOf = (part: Record<string, unknown>): Dependency =>
  ({
    predecessorUid: 1,
    linkType: 1,
    lag: null,
    lagFormat: null,
    carry: {},
    carryElements: [],
    ...part,
  }) as unknown as Dependency

const scheduleOf = (part: Record<string, unknown> = {}): Schedule =>
  ({
    project: { title: null, themeHue: 214, uidHighWaterMark: 0, minutesPerDay: null },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
    ...part,
  }) as unknown as Schedule

/** The one task every selection case describes. */
const THE_TASK = 1

const oneTaskSchedule = (
  task: Record<string, unknown> = {},
  visual: Record<string, unknown> = {},
  rest: Record<string, unknown> = {},
): Schedule =>
  scheduleOf({
    tasks: [taskOf({ uid: THE_TASK, ...task })],
    taskVisuals: [visualOf({ taskUid: THE_TASK, ...visual })],
    ...rest,
  })

const holding = (...items: readonly ItemRef[]): Selection =>
  items.reduce((selection, item) => selectionWith(selection, item), emptySelection())

const TASK_REF: ItemRef = { kind: 'task', uid: THE_TASK }

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

const panelOf = (
  schedule: Schedule,
  selection: Selection = holding(TASK_REF),
  session: ScreenSession = SESSION,
  settings: DocumentSettings = SETTINGS,
): PropertiesPanel => {
  const panel = propertiesPanelFromSelection(schedule, settings, selection, session)
  expect(panel, 'the panel is described while `propertiesShowing` names one of the two').not.toBe(
    null,
  )
  return panel as PropertiesPanel
}

const fieldsOfTask = (
  task: Record<string, unknown> = {},
  visual: Record<string, unknown> = {},
  rest: Record<string, unknown> = {},
): readonly PropertyField[] => panelOf(oneTaskSchedule(task, visual, rest)).fields

const fieldAt = (fields: readonly PropertyField[], row: string): PropertyField => {
  const found = fields.filter((field) => field.row === row)
  expect(found.length, `exactly one field for ${row}`).toBe(1)
  return found[0] as PropertyField
}

const textAt = (
  row: string,
  task: Record<string, unknown> = {},
  visual: Record<string, unknown> = {},
  rest: Record<string, unknown> = {},
): string => fieldAt(fieldsOfTask(task, visual, rest), row).text

const settingsPanel = (settings: DocumentSettings = SETTINGS): PropertiesPanel =>
  panelOf(
    oneTaskSchedule(),
    emptySelection(),
    sessionWith({ propertiesShowing: 'documentSettings' }),
    settings,
  )

// ---------------------------------------------------------------------------

describe('UF-64 -- whether the panel is described at all', () => {
  it('is absent while the panel is closed', () => {
    // `ScreenSession.propertiesShowing` is `null` for exactly that state, and
    // `ScreenView.propertiesPanel` is `null` when the panel is closed.
    const closed = sessionWith({ propertiesShowing: null })
    expect(
      propertiesPanelFromSelection(oneTaskSchedule(), SETTINGS, holding(TASK_REF), closed),
    ).toBe(null)
  })

  it('is described for either of the two the session names', () => {
    for (const showing of ['selection', 'documentSettings'] as const) {
      const panel = panelOf(
        oneTaskSchedule(),
        holding(TASK_REF),
        sessionWith({ propertiesShowing: showing }),
      )
      expect(panel.showing).toBe(showing)
    }
  })
})

describe('FR-072 -- which of the two is showing', () => {
  it('⛔ MUST NOT move to the settings when the selection is cleared', () => {
    const panel = panelOf(oneTaskSchedule(), emptySelection())
    expect(panel.showing).toBe('selection')
  })

  it('⛔ MUST NOT move to the settings when what the selection named is gone', () => {
    // The selection still names a task; the document no longer holds it.
    const panel = panelOf(scheduleOf(), holding(TASK_REF))
    expect(panel.showing).toBe('selection')
  })

  it('raises the state a cleared selection leaves the panel in (FR-072, MUST)', () => {
    // 「選択が解除されたときは、直前に出していた中身を残すこと（MUST）。」
    // ⚠️ WHICH FIELDS ARE KEPT IS STILL NOT ASKED -- note 3 of the head comment
    // says why nothing this unit is handed could answer it.
    // ⛔ WHAT IS NO LONGER ASKED, and was until CR-272: that the panel READ any
    // differently for it. The RATIONALE now records the silence as the price the
    // reader took -- 「**選択が解除されても、パネルは直前の中身を出したまま「これ
    // は直前のものである」と示さない。**」 -- so the case stops at the state the
    // unit reports, and asserts nothing about a word.
    expect(panelOf(oneTaskSchedule(), emptySelection()).isSubjectGone).toBe(true)
  })

  it('says nothing has gone while the selection still names something in the document', () => {
    expect(panelOf(oneTaskSchedule()).isSubjectGone).toBe(false)
  })

  it('raises the same state when the selection names a task the document has lost', () => {
    expect(panelOf(scheduleOf(), holding(TASK_REF)).isSubjectGone).toBe(true)
  })

  it('⛔ MUST NOT put a heading row at the head of the panel', () => {
    // 「⛔ **パネルの先頭に見出しの行を置いてはならない（MUST NOT）**（利用者の指示
    // 2026-08-27）—— **押下状態が同じことを既に示しており、見出しは同じ答えを 2 か
    // 所で言っていた。**」 ⭐ THIS CASE REPLACED THREE (CR-272), all of which read
    // a heading off the description: that it was non-empty, that a cleared
    // selection read unlike a held one, and that the three states were pairwise
    // distinct. The requirement now forbids the row all three were about.
    //
    // ⛔ THE MEMBER IS READ WITHOUT BEING NAMED IN A TYPE, and that is the point:
    // if the published description still declares one, this case is what falls,
    // rather than the compiler taking the whole file down before any case runs
    // (rule 04 section 1 -- 「落ちた試験は「手間」ではなく「発見」である」).
    //
    // ⚠️ WHERE THE ROW ITSELF IS ASKED ABOUT: this seam publishes a description,
    // not a screen, so the strongest thing it can say is that no heading is
    // handed on. What is DRAWN at the head of the panel is UF-71's, and
    // tests/unit/fr-006-panel-fields-drawn.test.ts asks it there.
    const states: readonly [string, PropertiesPanel][] = [
      ['a held selection', panelOf(oneTaskSchedule())],
      ['a cleared selection', panelOf(oneTaskSchedule(), emptySelection())],
      ['the document settings', settingsPanel()],
    ]
    for (const [what, panel] of states) {
      expect(
        (panel as unknown as Record<string, unknown>)['heading'],
        `FR-072 (MUST NOT): the panel hands on a heading while it shows ${what}`,
      ).toBeUndefined()
    }
  })

  it('describes the settings whatever the selection holds, and says nothing has gone', () => {
    const withNothing = settingsPanel()
    const withTask = panelOf(
      oneTaskSchedule(),
      holding(TASK_REF),
      sessionWith({ propertiesShowing: 'documentSettings' }),
    )

    expect(withTask.isSubjectGone).toBe(false)
    expect(withNothing.isSubjectGone).toBe(false)
    expect(withTask.fields.map((field) => field.name)).toEqual(
      withNothing.fields.map((field) => field.name),
    )
  })
})

describe('FR-006 and table T-016 -- the items of a selected task', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT QUIETLY LOST A COLUMN WOULD MAKE THE ROSTER
    // CASES AGREE WITH ANYTHING. Rule 04 section 2: a mechanism that carries a
    // value out of the manuscript is only verified once it is seen to fall. The
    // fall that matters here cannot be staged from a test -- it needs the
    // manuscript edited -- so what is guarded instead is that every cell those
    // cases lean on actually arrived: a heading that moved throws where `T_016`
    // is built, and a cell that emptied is caught here.
    expect(T_016.length).toBeGreaterThan(1)
    for (const item of T_016) {
      expect(item.row, 'row id').toMatch(/^PR-\d+$/)
      expect(item.name, item.row).not.toBe('')
      expect(item.inputKinds.length, `${item.row} 入力の型`).toBeGreaterThan(0)
    }
    // ⭐ The read-only mark is the table's, and the table still writes one.
    expect(T_016.some((item) => item.readOnly), 'the 読み取り専用 mark').toBe(true)
  })

  it('stands one field per row of the table, in the table\'s printed order', () => {
    // ⭐ BOTH THE MEMBERSHIP AND THE ORDER, because two rules stand behind them.
    // FR-006 (MUST) puts 「表 T-016 の項目」 on the panel -- that is the roster --
    // and the paragraph under the table adds 「表 T-016 は印刷順に出すこと
    // （MUST）。よく使う項目を上に置いてある」 with 「最も頻繁に触る値のために
    // スクロールさせてはならない（MUST NOT）」 for its reason. A case that
    // compared sets would let the panel put the most-touched value last and stay
    // green, which is the very thing that MUST NOT forbids.
    const fields = fieldsOfTask()
    expect(fields.map((field) => field.row)).toEqual(T_016_ON_A_TASK.map((item) => item.row))
  })

  it('carries the name the dictionary holds for each row, not the column', () => {
    // ⭐ CR-278 SPLIT THE TWO (the user's instruction of 2026-08-27:
    // 「別のデータとして紐づけて管理しろ」). The panel shows the dictionary's word
    // and the file keeps its own column names, so a row may be shown as
    // 「fade in/out days」 while `fadeInDays` and `fadeOutDays` are untouched.
    const fields = fieldsOfTask()
    expect(fields.map((field) => field.name)).toEqual(T_016_ON_A_TASK.map((item) => item.name))
  })

  it('⛔ MUST NOT show a GRS JSON column name where the two differ', () => {
    // The half of the split with a defect behind it: D-81 (「`Color` を省略しろ」)
    // and D-84 (「1 行で入るように `fade in/out days` としろ」) are both rows whose
    // shown name the manuscript deliberately makes unlike the column.
    // ⚠️ Where the two agree this says nothing -- most rows show their own
    // column name and always did.
    const fields = fieldsOfTask()
    const differing = T_016_ON_A_TASK.filter((item) => item.name !== item.columns)
    expect(differing.length, 'the manuscript parts no name from its column').toBeGreaterThan(0)
    for (const item of differing) {
      expect(fieldAt(fields, item.row).name, item.row).not.toBe(item.columns)
    }
  })

  it('MUST follow the display language, which the dictionary is keyed by', () => {
    // ⛔ THE OPPOSITE OF WHAT STOOD HERE. Table T-016 required 「項目名は英語表記
    // とすること（MUST）」 until CR-278, and this case asserted the panel read the
    // same in either language. That MUST is gone: the name is a word of the
    // dictionary now, and FR-038 (MUST) puts every printed word in the reader's
    // own language.
    const inEnglish = panelOf(
      oneTaskSchedule({ name: 'alpha' }),
      holding(TASK_REF),
      sessionWith({ language: 'en' }),
    )
    const inJapanese = panelOf(oneTaskSchedule({ name: 'alpha' }))
    expect(inEnglish.fields.map((field) => field.name)).toEqual(
      T_016_ON_A_TASK.map((item) => item.nameInEnglish),
    )
    expect(inJapanese.fields.map((field) => field.name)).toEqual(
      T_016_ON_A_TASK.map((item) => item.name),
    )
  })

  it('MUST let every item be edited but the ones the table marks read-only', () => {
    const fields = fieldsOfTask()
    for (const item of T_016_ON_A_TASK) {
      expect(fieldAt(fields, item.row).isEditable, `${item.row} ${item.name}`).toBe(!item.readOnly)
    }
  })

  it('MUST show the assignee as editable (AS-5 of table T-225, after CR-186)', () => {
    expect(fieldAt(fieldsOfTask(), 'PR-16').isEditable).toBe(true)
  })

  it('MUST give an editable item the form its 入力の型 column names', () => {
    // 「入力の形は同表の「入力の型」の欄に従うこと（MUST）」 -- the paragraph
    // under table T-016, added 2026-08-26 with the column itself.
    //
    // ⭐ THE WORDS ARE THE TABLE'S AND THE SPELLINGS ARE THE DECLARATION'S.
    // `PropertyControlKind` in `screen-renderer.ts` names that very column as
    // what it is, and gives each of its seven members the table's word in a
    // comment; the map below is that pairing and nothing else. A tester may read
    // a published type (rule 04 section 1).
    //
    // ⛔ NOT ASSERTED, and deliberately: the candidates of a 選択, the bounds of
    // a 数値, and which columns are dates. The same paragraph forbids the table
    // to hold them (MUST NOT) and names `_source/grs-document.schema.json` and
    // `DATE_COLUMNS` as where they are, so a case that read them off this table
    // would be asserting a value the table is not allowed to have.
    //
    // ⛔ READ-ONLY ROWS ARE OUT OF SCOPE. FR-006 excepts them from being edited
    // and the table writes PR-9's kind as 「数値（読み取り専用）」; whether a row
    // nobody may edit still offers a control is settled nowhere, so the case
    // walks the editable rows alone rather than inventing an answer.
    //
    // ⛔ THIS CASE IS RED ON PR-16 AND IS MEANT TO STAY RED UNTIL THE PANEL
    // OFFERS A CONTROL FOR THE ASSIGNEE. Sixteen of the seventeen editable rows
    // follow the column; PR-16 alone comes back with no control at all, while
    // the table writes its 入力の型 as 選択. Three rows say it has to be there:
    // FR-006 (MUST) 「同表が読み取り専用と記した項目を除いて編集できるように
    // すること」 and the table does not mark PR-16 read-only; the paragraph under
    // the table (MUST) 「入力の形は同表の「入力の型」の欄に従うこと」; and AS-5
    // of table T-225 (FR-008) 「プロパティパネルの担当者（表 T-016 の PR-16）…
    // **編集できること（MUST）。** 名簿から選ばせる形とし、**ドロップダウンと
    // 部分一致の検索を添えること（MUST）**」. ⚠️ `PropertyField.controls` is
    // declared as what a field is EDITED THROUGH and its own doc says an empty
    // list means this side has no control to offer -- so an empty list against
    // PR-16 is the panel saying the assignee cannot be edited on it, which is
    // what AS-5 forbids. `isEditable` being true does not repair that: the case
    // above already asserts the mark, and the mark is not a control.
    const kindOf = (row: string, word: string): PropertyControlKind => {
      const kind = KIND_OF_INPUT[word]
      if (kind === undefined) {
        throw new Error(
          `table T-016 row ${row} writes 入力の型 ${JSON.stringify(word)}, which ` +
            'PropertyControlKind has no member for',
        )
      }
      return kind
    }

    // ⭐ One comparison over every row rather than one per row, so a run names
    // ALL the items whose form does not follow the column instead of the first.
    const fields = fieldsOfTask()
    const editable = T_016_ON_A_TASK.filter((item) => !item.readOnly)
    const wanted = editable.map((item) => ({
      row: item.row,
      kinds: item.inputKinds.map((word) => kindOf(item.row, word)),
    }))
    const given = editable.map((item) => ({
      row: item.row,
      kinds: fieldAt(fields, item.row).controls.map((one) => one.kind),
    }))

    expect(given).toEqual(wanted)
  })

  it('⛔ describes no OTHER subject once the selection is cleared', () => {
    // ⛔ LEFT UNASSERTED ON PURPOSE: what the fields hold here. FR-072 (MUST)
    // says the panel keeps the ones it had, and no argument this unit is handed
    // remembers them (see the head of this file, 3.). Writing the fallback down
    // as the expected answer would put the unmet MUST beyond a test's reach, so
    // the case asserts only what cannot be argued: with nothing selected, the
    // panel may not describe some task the person did not choose.
    const twoTasks = scheduleOf({
      tasks: [taskOf({ uid: 1, name: 'alpha' }), taskOf({ uid: 2, name: 'beta' })],
    })
    const texts = panelOf(twoTasks, emptySelection()).fields.map((field) => field.text)
    expect(texts).not.toContain('alpha')
    expect(texts).not.toContain('beta')
  })

  it('describes the one task a range selection caught, although it carries no order', () => {
    // SL-7b withholds an ORDER from a marquee (SL-3); it does not withhold the
    // one thing caught, and FR-006 does not ask how a task came to be selected.
    const panel = panelOf(oneTaskSchedule({ name: 'alpha' }), selectionOfAll([TASK_REF]))
    expect(panel.isSubjectGone).toBe(false)
    expect(fieldAt(panel.fields, 'PR-1').text).toContain('alpha')
  })

  it('stays on the selection when several things are held at once', () => {
    const two = holding(TASK_REF, { kind: 'task', uid: 2 })
    const panel = panelOf(
      scheduleOf({ tasks: [taskOf({ uid: 1 }), taskOf({ uid: 2 })] }),
      two,
    )
    expect(panel.showing).toBe('selection')
  })
})

describe('table T-016 -- every item actually reaches the screen', () => {
  // ⭐ An item drawn the same whatever it holds is not shown at all. The
  // specification fixes no spelling for a number, a truth value or an
  // enumeration, so each row is checked by the one thing it does fix: FR-006
  // puts the item ON the panel, so two unlike stored values must read unlike.
  const APART: readonly {
    readonly row: string
    readonly a: readonly [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>]
    readonly b: readonly [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>]
  }[] = [
    { row: 'PR-1', a: [{ name: 'alpha' }, {}, {}], b: [{ name: 'beta' }, {}, {}] },
    { row: 'PR-2', a: [{ notes: 'one' }, {}, {}], b: [{ notes: 'two' }, {}, {}] },
    {
      row: 'PR-3',
      a: [{ start: '2026-03-05T00:00:00', finish: '2026-03-09T00:00:00' }, {}, {}],
      b: [{ start: '2026-03-06T00:00:00', finish: '2026-03-09T00:00:00' }, {}, {}],
    },
    {
      row: 'PR-4',
      a: [{ actualStart: '2026-03-05T00:00:00' }, {}, {}],
      b: [{ actualStart: '2026-03-06T00:00:00' }, {}, {}],
    },
    { row: 'PR-5', a: [{ actualDuration: 3 }, {}, {}], b: [{ actualDuration: 4 }, {}, {}] },
    {
      row: 'PR-6',
      a: [{ actualFinish: '2026-03-05T00:00:00' }, {}, {}],
      b: [{ actualFinish: '2026-03-06T00:00:00' }, {}, {}],
    },
    {
      row: 'PR-7',
      a: [{ resume: '2026-03-05T00:00:00' }, {}, {}],
      b: [{ resume: '2026-03-06T00:00:00' }, {}, {}],
    },
    { row: 'PR-8', a: [{ resumeValid: true }, {}, {}], b: [{ resumeValid: false }, {}, {}] },
    { row: 'PR-9', a: [{ percentComplete: 40 }, {}, {}], b: [{ percentComplete: 60 }, {}, {}] },
    {
      row: 'PR-10',
      a: [{ deadline: '2026-03-05T00:00:00' }, {}, {}],
      b: [{ deadline: '2026-03-06T00:00:00' }, {}, {}],
    },
    {
      row: 'PR-17',
      a: [{}, { milestoneGlyph: 'hexagon' }, {}],
      b: [{}, { milestoneGlyph: 'star' }, {}],
    },
    {
      row: 'PR-12',
      a: [{}, { strokeColor: 'red', fillColor: 'blue', lineWeight: 'thin' }, {}],
      b: [{}, { strokeColor: 'green', fillColor: 'blue', lineWeight: 'thin' }, {}],
    },
    {
      row: 'PR-13',
      a: [{}, { nameAnchor: 1, nameAlign: 'left' }, {}],
      b: [{}, { nameAnchor: 1, nameAlign: 'right' }, {}],
    },
    {
      row: 'PR-14',
      a: [{ fadeInDays: 1, fadeOutDays: 5 }, {}, {}],
      b: [{ fadeInDays: 2, fadeOutDays: 5 }, {}, {}],
    },
    { row: 'PR-15', a: [{ wbsParentUid: 11 }, {}, {}], b: [{ wbsParentUid: 12 }, {}, {}] },
    {
      row: 'PR-16',
      a: [{}, {}, { resources: [resourceOf(7, 'Ann')], assignments: [assignmentOf(90, 1, 7)] }],
      b: [{}, {}, { resources: [resourceOf(8, 'Bob')], assignments: [assignmentOf(90, 1, 8)] }],
    },
  ]

  it('tells two unlike values apart on every row the table holds', () => {
    // ⚠️ COVERAGE, NOT ORDER. `APART` is this file's own fixture and its
    // sequence is nobody's rule; the table's PRINTED order is asserted where it
    // belongs, against the panel. Comparing the two sequences here would make
    // this fixture a second hand-written copy of the print order -- exactly the
    // copy that went stale when the table was reordered on 2026-08-26.
    //
    // ⛔ NO COUNT IS NAMED, in the title or here. This fixture has to name a
    // stored column per row, so it cannot be read out of the manuscript the way
    // `T_016` is; the roster it is held against can only be the table's own.
    // ⚠️ A count in the title went stale the moment the table lost the shape
    // item and the milestone truth value (2026-08-27) -- and a title that
    // states the answer is a second copy of the table on top of the fixture.
    const sorted = (rows: readonly string[]): string[] => [...rows].sort()
    expect(sorted(APART.map((one) => one.row))).toEqual(
      sorted(T_016_ON_A_TASK.map((item) => item.row)),
    )
    for (const one of APART) {
      expect(textAt(one.row, ...one.a), one.row).not.toBe(textAt(one.row, ...one.b))
    }
  })

  it('shows every row of the table even for a task holding nothing at all', () => {
    const fields = fieldsOfTask()
    expect(fields.length).toBe(T_016_ON_A_TASK.length)
  })
})

describe('FR-054 -- how a date column is written', () => {
  const DATE_ROWS = [
    { row: 'PR-4', column: 'actualStart' },
    { row: 'PR-6', column: 'actualFinish' },
    { row: 'PR-7', column: 'resume' },
    { row: 'PR-10', column: 'deadline' },
  ] as const

  it('MUST take the lexical date part and MUST NOT convert a zone', () => {
    for (const one of DATE_ROWS) {
      // Late in the day and with an offset: any zone conversion moves the day.
      const stored = '2026-03-05T23:30:00+09:00'
      const text = textAt(one.row, { [one.column]: stored })
      expect(text, `${one.row} ${one.column}`).toContain('2026-03-05')
      expect(text, `${one.row} keeps no clock reading`).not.toContain('23:30')
    }
  })

  it('writes both halves of PR-3 from the same rule', () => {
    const text = textAt('PR-3', {
      start: '2026-03-05T09:00:00',
      finish: '2026-12-31T18:45:00',
    })
    expect(text).toContain('2026-03-05')
    expect(text).toContain('2026-12-31')
    expect(text).not.toContain('09:00')
  })

  it('leaves a date column that holds nothing without a date', () => {
    // FR-007's "chosen" against "never set": a column holding null must not
    // read as a day somebody put there.
    expect(textAt('PR-4', { actualStart: null })).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })
})

describe('table T-225 -- the assignee (PR-16)', () => {
  const withPeople = (
    resources: readonly Resource[],
    assignments: readonly Assignment[],
  ): string => textAt('PR-16', {}, {}, { resources, assignments })

  it('MUST show the name and MUST NOT show the uid (AS-6)', () => {
    const text = withPeople([resourceOf(7, 'Ann')], [assignmentOf(90, THE_TASK, 7)])
    expect(text).toContain('Ann')
    expect(text, 'AS-6 (MUST NOT): a person is never made to remember a uid').not.toContain('7')
  })

  it('MUST look the name up in the roster by the assignment\'s uid (AS-9)', () => {
    const assignments = [assignmentOf(90, THE_TASK, 7)]
    const before = withPeople([resourceOf(7, 'Ann')], assignments)
    const after = withPeople([resourceOf(7, 'Bob')], assignments)

    expect(before).toContain('Ann')
    expect(after).toContain('Bob')
    expect(after).not.toContain('Ann')
  })

  it('shows every assignee when several are on one task', () => {
    const text = withPeople(
      [resourceOf(7, 'Zoe'), resourceOf(8, 'Ann')],
      [assignmentOf(90, THE_TASK, 7), assignmentOf(91, THE_TASK, 8)],
    )
    expect(text).toContain('Zoe')
    expect(text).toContain('Ann')
  })

  it('leaves out the people assigned to another task', () => {
    const text = withPeople(
      [resourceOf(7, 'Ann'), resourceOf(8, 'Bob')],
      [assignmentOf(90, THE_TASK, 7), assignmentOf(91, 2, 8)],
    )
    expect(text).toContain('Ann')
    expect(text).not.toContain('Bob')
  })

  it('still stands the row for a task nobody is on', () => {
    // FR-006 puts every row of table T-016 on the panel; AS-2's `-` belongs to
    // the assignee LABEL, and AS-3 makes `-` the signal that CLEARS one.
    const field = fieldAt(fieldsOfTask(), 'PR-16')
    // ⚠️ THE SHOWN NAME AND NOT THE COLUMN, since CR-278: `fieldsOfTask` is
    // asked for in ja here, and the dictionary is what answers.
    expect(field.name).toBe(SHOWN_NAME['PR-16']?.ja)
    expect(field.isEditable).toBe(true)
  })

  it('MUST NOT fall back to the uid when the roster has lost the resource', () => {
    const text = withPeople([], [assignmentOf(90, THE_TASK, 7)])
    expect(text).not.toContain('7')
  })

  it('MUST NOT fall back to the uid when an assignment names no resource at all', () => {
    const text = withPeople([resourceOf(7, 'Ann')], [assignmentOf(90, THE_TASK, null)])
    expect(text).not.toContain('90')
  })
})

describe('FR-009 -- a selected dependency', () => {
  /** DF-4 of table T-053 keeps a dependency under its SUCCESSOR. */
  const linked = (part: Record<string, unknown> = {}): Schedule =>
    scheduleOf({
      tasks: [
        taskOf({ uid: 1, name: 'before' }),
        taskOf({ uid: 2, name: 'after', dependencies: [dependencyOf(part)] }),
      ],
    })

  const LINK: ItemRef = { kind: 'dependency', successorUid: 2, ordinal: 0 }

  it('MUST show the kind, the lag and both ends -- and nothing else', () => {
    const fields = panelOf(linked({ linkType: 3, lag: 5 }), holding(LINK)).fields
    expect([...fields.map((field) => field.name)].sort()).toEqual([...DEPENDENCY_ITEMS])
  })

  it('does not stand table T-016\'s items against a dependency', () => {
    // FR-009 says in as many words that table T-016 is the `Task` attribute
    // table and carries no dependency row.
    const rows = panelOf(linked({ lag: 5 }), holding(LINK)).fields.map((field) => field.row)
    for (const item of T_016) expect(rows).not.toContain(item.row)
  })

  it('names the two ends it was drawn between', () => {
    const fields = panelOf(linked({ predecessorUid: 1, lag: 0 }), holding(LINK)).fields
    const of = (name: string): string =>
      (fields.find((field) => field.name === name) as PropertyField).text
    expect(of('predecessorUid')).toContain('1')
    expect(of('successorUid')).toContain('2')
  })

  it('tells two unlike kinds and two unlike lags apart', () => {
    const textOf = (part: Record<string, unknown>, name: string): string =>
      (
        panelOf(linked(part), holding(LINK)).fields.find(
          (field) => field.name === name,
        ) as PropertyField
      ).text

    expect(textOf({ linkType: 1 }, 'linkType')).not.toBe(textOf({ linkType: 3 }, 'linkType'))
    expect(textOf({ lag: 2 }, 'lag')).not.toBe(textOf({ lag: 5 }, 'lag'))
  })

  it('stays on the selection when the successor is gone', () => {
    const panel = panelOf(scheduleOf(), holding(LINK))
    expect(panel.showing).toBe('selection')
    expect(panel.isSubjectGone).toBe(true)
  })
})

describe('IC-17 and DR-3 -- the document\'s drawing settings', () => {
  it('carries every key of the presentation group, once each', () => {
    const names = settingsPanel().fields.map((field) => field.name)
    expect([...names].sort()).toEqual(Object.keys(SETTINGS_DEFAULTS).sort())
  })

  it('MUST mark them editable (UN-13 of table T-027 undoes a settings change)', () => {
    for (const field of settingsPanel().fields) expect(field.isEditable, field.name).toBe(true)
  })

  it('names a row for each of them', () => {
    for (const field of settingsPanel().fields) expect(field.row.length, field.name).toBeGreaterThan(0)
  })

  it('reads the value out of the document it was handed, not out of the roster', () => {
    // ⚠️ 04-verification section 2: a value that reaches nothing is a value
    // nobody notices going stale. S-80 is `propertyPanelWidth`.
    const moved = settingsOf({ propertyPanelWidth: 999 })
    const field = settingsPanel(moved).fields.find((one) => one.name === 'propertyPanelWidth')
    expect(field?.text).toContain('999')
    expect(field?.text).not.toBe(
      settingsPanel().fields.find((one) => one.name === 'propertyPanelWidth')?.text,
    )
  })

  it('reaches a key that lives inside a group of its own', () => {
    const moved = settingsOf({ 'exportCanvas.width': 4321 })
    const field = settingsPanel(moved).fields.find((one) => one.name === 'exportCanvas.width')
    expect(field?.text).toContain('4321')
  })

  it('keeps the settings the same in either language (FR-038 holds no store of strings)', () => {
    const inEnglish = panelOf(
      oneTaskSchedule(),
      emptySelection(),
      sessionWith({ propertiesShowing: 'documentSettings', language: 'en' }),
    )
    expect(inEnglish.fields).toEqual(settingsPanel().fields)
  })

  it('keeps the editing route open for what a toggle hides', () => {
    // The rule after table T-202 (MUST): hiding an element may not close the
    // route that edits it. Every visibility toggle is itself a settings key,
    // so none of them may filter this panel.
    const hidden = settingsOf({
      assigneeVisible: false,
      dependencyVisible: false,
      progressMarkerVisible: false,
      percentCompleteVisible: false,
      baselineVisible: false,
      progressLineVisible: false,
    })
    expect(settingsPanel(hidden).fields.map((field) => field.name)).toEqual(
      settingsPanel().fields.map((field) => field.name),
    )
  })

  it('shows table T-016\'s items for a task even while every toggle is off', () => {
    const hidden = settingsOf({ assigneeVisible: false, percentCompleteVisible: false })
    const panel = panelOf(oneTaskSchedule(), holding(TASK_REF), SESSION, hidden)
    expect(panel.fields.map((field) => field.row)).toEqual(
      T_016_ON_A_TASK.map((item) => item.row),
    )
  })
})

describe("FR-006 (MUST) -- only the rows whose 対象 matches what is selected", () => {
  // ⛔ THE RULE, VERBATIM (the user's ruling of 2026-09-02, CR-325):
  // 「いま選ばれているものと同じ「対象」を持つ行だけを出すこと（MUST）。対象の違う
  // 行を出してはならない（MUST NOT）」, with 「同じ対象の行どうしの相対順は変わら
  // ない —— 絞るだけであって、並べ替えではない」.
  //
  // ⭐ WHY IT EXISTS, in the ruling's own words: 「同表の並びは印刷順そのものなので、
  // 対象を見ないと `TaskGroup` の `height` が `Task` のパネルにも出る」.

  /** The other value of the 対象 column, and the rows that carry it. */
  const T_016_ON_A_ROW = T_016.filter((item) => item.appliesTo === ON_A_ROW)

  /**
   * The row of table T-058 a `TaskGroup` item's field DECLARES.
   *
   * ⭐ Table T-016's note for PR-18 says which of the two names the field --
   * 「実体は `fig-erd-detail.md` の `AT-53` である —— 表 T-023 の `MK-13` が名指す
   * のはそちら」 -- and FR-085 (MUST) calls it 「名前の欄（`AT-53`）」. ⛔ Read out
   * of the table rather than typed, for the reason `T_016` itself is.
   */
  const T_058 = specTable('T-058')
  const attributeRowOf = (column: string): string => {
    const found = T_058.rows.find(
      (row) => bare(row.by['エンティティ'] ?? '') === ON_A_ROW && bare(row.by['列'] ?? '') === column,
    )
    if (found === undefined) throw new Error(`table T-058 has no row for ${ON_A_ROW}.${column}`)
    return found.id
  }

  const THE_ROW = '11111111-1111-4111-8111-111111111111'

  const withARow = (part: Record<string, unknown> = {}): Schedule =>
    scheduleOf({
      tasks: [taskOf({ uid: THE_TASK, name: 'alpha' })],
      taskVisuals: [visualOf({ taskUid: THE_TASK })],
      taskGroups: [
        {
          id: THE_ROW,
          parentId: null,
          label: 'a row',
          derivedFromTaskUid: null,
          order: 0,
          isCollapsed: false,
          isHidden: false,
          color: null,
          height: null,
          ...part,
        },
      ],
    })

  const rowPanel = (part: Record<string, unknown> = {}, language: 'ja' | 'en' = 'ja'): PropertiesPanel =>
    panelOf(withARow(part), emptySelection(), sessionWith({ selectedGroupIds: [THE_ROW], language }))

  it('⭐ the manuscript really parts the two, so the cases below are not vacuous', () => {
    // ⛔ WITHOUT THIS, A 対象 COLUMN THAT STOPPED PARSING WOULD MAKE EVERY CASE
    // HERE AGREE WITH ANYTHING (rule 04 section 2).
    expect(T_016_ON_A_TASK.length, '対象 = Task').toBeGreaterThan(0)
    expect(T_016_ON_A_ROW.length, '対象 = TaskGroup').toBeGreaterThan(0)
    expect(T_016_ON_A_TASK.length + T_016_ON_A_ROW.length).toBe(T_016.length)
  })

  it("⛔ MUST NOT put a `TaskGroup` row on a selected task's panel", () => {
    // GOES RED IF: the roster stops being filtered -- which is the state the
    // ruling names, the row s `height` standing on a task s panel.
    const rows = fieldsOfTask().map((field) => field.row)
    for (const item of T_016_ON_A_ROW) {
      expect(rows, item.row).not.toContain(item.row)
      expect(rows, `${item.row} ${item.columns}`).not.toContain(attributeRowOf(item.columns))
    }
  })

  it("⛔ MUST NOT put a `Task` row on a picked row's panel", () => {
    // GOES RED IF: the `TaskGroup` half stops being filtered and a task s
    // `notes` is offered against a row that has none.
    const rows = rowPanel().fields.map((field) => field.row)
    for (const item of T_016_ON_A_TASK) expect(rows, item.row).not.toContain(item.row)
  })

  it("⭐ MUST put every `TaskGroup` row on a picked row's panel, in the table's order", () => {
    const rows = rowPanel().fields.map((field) => field.row)
    expect(rows).toEqual(T_016_ON_A_ROW.map((item) => attributeRowOf(item.columns)))
  })

  it('⭐ carries the name the dictionary holds, not the GRS JSON column (D-185)', () => {
    // ⛔ THE USER S REPORT OF 2026-09-01: the shipped panel drew `label` /
    // `color` / `height` -- the column names themselves -- where FR-038 (MUST)
    // puts the shown name in the dictionary under table T-016 s row id.
    // GOES RED IF: the panel goes back to naming a field by its column.
    const inJapanese = rowPanel().fields.map((field) => field.name)
    expect(inJapanese).toEqual(T_016_ON_A_ROW.map((item) => item.name))
    for (const item of T_016_ON_A_ROW) {
      expect(inJapanese, `${item.row} shows its column`).not.toContain(item.columns)
    }
    const inEnglish = rowPanel({}, 'en').fields.map((field) => field.name)
    expect(inEnglish).toEqual(T_016_ON_A_ROW.map((item) => item.nameInEnglish))
  })

  it('⭐ gives each of them the form its 入力の型 column names', () => {
    const fields = rowPanel().fields
    const wanted = T_016_ON_A_ROW.map((item) => item.inputKinds.map((word) => KIND_OF_INPUT[word]))
    expect(fields.map((field) => field.controls.map((one) => one.kind))).toEqual(wanted)
  })
})

describe('table T-023c -- the other kinds SL-1 admits', () => {
  const OTHERS: readonly ItemRef[] = [
    { kind: 'highlightBox', id: 'h1' },
    { kind: 'commentBox', id: 'c1' },
    { kind: 'statusLine' },
  ]

  it('stays on the selection and stands no `Task` row against them', () => {
    // ⛔ Neither table T-016 nor FR-009 carries a row for these three, and
    // FR-072 forbids falling through to the settings.
    for (const item of OTHERS) {
      const panel = panelOf(
        scheduleOf({
          commentBoxes: [{ id: 'c1' }],
          highlightBoxes: [{ id: 'h1' }],
        }),
        holding(item),
      )
      expect(panel.showing, item.kind).toBe('selection')
      for (const row of T_016) expect(panel.fields.map((f) => f.row), item.kind).not.toContain(row.row)
    }
  })
})

describe('R7.1 -- table T-075 makes this unit `pure`', () => {
  it('writes to nothing it was handed', () => {
    const schedule = oneTaskSchedule(
      { name: 'alpha', start: '2026-03-05T00:00:00' },
      { shapeKind: 'chevron' },
      { resources: [resourceOf(7, 'Ann')], assignments: [assignmentOf(90, THE_TASK, 7)] },
    )
    const selection = holding(TASK_REF)
    const before = [schedule, SETTINGS, selection, SESSION].map((one) => JSON.stringify(one))

    propertiesPanelFromSelection(schedule, SETTINGS, selection, SESSION)
    propertiesPanelFromSelection(
      schedule,
      SETTINGS,
      selection,
      sessionWith({ propertiesShowing: 'documentSettings' }),
    )

    expect([schedule, SETTINGS, selection, SESSION].map((one) => JSON.stringify(one))).toEqual(
      before,
    )
  })

  it('answers the same thing twice for the same arguments', () => {
    const schedule = oneTaskSchedule({ name: 'alpha' })
    expect(panelOf(schedule)).toEqual(panelOf(schedule))
  })
})
