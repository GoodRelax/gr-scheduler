// `FR-035` (docs/spec/01-04-requirements.md:1818) and 表 T-036 の `SK-9`
// (:2515):
//
//   FR-035 STATEMENT 「作成者が文書名を選んだとき、`GRS` は、その場で編集できる
//                    ようにすること。」
//   T-036 SK-9       「文書名を編集する | `F2` | — |」
//   FR-035 RATIONALE 「**`title` に空文字を受け付けてはならない（MUST NOT）**」
//   T-028 IN-4       「⛔ **取り消したときは、編集を始める前の値へ戻すこと
//                    （MUST）。書きかけの文字を文書へ書いてはならない
//                    （MUST NOT）**（`FR-031`）」
//   T-036 SK-19      「ほかに何も出ていないときは、**その場の編集を確定する**
//                    （名称・担当者名・行名・文書名・プロパティの入力）」
//   T-065 IF-9       「編集できる欄で確定した値を、その欄が名乗る行 ID とともに
//                    返し（⭐ **行 ID は 表 T-016 の行に限らない。****ヘッダの
//                    文書名の欄は 表 T-103 の `U-27` を名乗る**）」
//                    (docs/spec/05-07-design.md:378, 利用者の裁定 2026-09-06)
//
// ---------------------------------------------------------------------------
// ⛔⛔ WHAT THIS FILE DOES NOT ASSERT, AND WHY -- READ THIS FIRST
// ---------------------------------------------------------------------------
// The ledger's summary of D-322 says the field opens 「焦点が入り、既存の文字が
// 全選択され」. ⛔ NO ROW OF THE SPECIFICATION SAYS THAT ABOUT THE DOCUMENT
// NAME. Searched 2026-09-06 for 全選択 / 焦点を置 across 01-04-requirements.md,
// 05-07-design.md and _assets/: the clause 「編集できる状態にして焦点を置き、
// **既にある文字をすべて選んだ状態にすること（MUST）**」 appears TWICE, in
// `MK-13` of 表 T-023 (:2331) and in `FR-085` (:1281), and both times it is
// about a TASK's name (表 T-016 の `PR-1`) or a ROW's name (`AT-53`). `SK-9`
// carries no such sentence and neither does `FR-035`.
// ⇒ Asserting focus-and-select-all for the document name here would be this
// file inventing a rule (rule 04 section 1: 仕様を読んで、それが述べることを
// 主張する). It is reported instead; if the user wants it, it is a change
// request against `FR-035`, and the day it lands this file gains the case.
// ⚠️ Nothing about the browser TAB heading is in scope either -- FR-035 carries
// two MUST clauses about it and they belong to whatever drives the host title.
//
// ---------------------------------------------------------------------------
// THE UNITS THIS DRIVES
// ---------------------------------------------------------------------------
//   `commandFromInput`        UF-30/31 `input-command-translator` (CP-18 of
//                             table T-062, PI-18 of T-064) -- what `F2` asks
//                             for, and what `Esc` does not ask for.
//   `commandFromFieldCommit`  PI-18's fourth member -- the settled value
//                             arriving back with the row id its field names.
//   `editProject`             PI-9 `EditDocument` -- the aggregate that owns
//                             `CM-1` and FR-035's MUST NOT.
// ⭐ ALL THREE, BECAUSE THE ROW IS ABOUT A PATH AND NOT A FUNCTION. D-322's
// two measurements (2026-09-05 and 2026-09-06) are of a key press producing a
// field and a typed name reaching `Project.title`; a case that stopped at the
// translator would have gone green on the very build the sweep found broken,
// since `editInPlace{documentTitle}` was already being planned there
// (input-command-translator.ts:3768 as the ledger records it) and the shell was
// dropping it.
//
// ---------------------------------------------------------------------------
// WHERE TABLE T-218 PUTS THIS FILE
// ---------------------------------------------------------------------------
// `TS-6`, tests/unit/ -- decided by values alone (vitest.config.ts lists the
// three Vitest places). Chapter 9 does not admit Unit as a TEST_LEVEL.
// ⚠️ THE HALF THAT IS NOT HERE IS THE SHELL'S. Whether the header really draws
// an editable field, and whether a caret lands in it, is DOM and belongs in
// tests/system/. This file holds every part that is a value.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1.)
//
// Exported declarations read, and nothing else:
//   input-command-translator.ts  `commandFromInput`, `commandFromFieldCommit`,
//                                `InputContext`, `InputAction`, `InPlaceTarget`,
//                                `TranslatedInput`
//   screen-renderer.ts           `FieldCommit`, `PropertyFieldKey`
//   edit-document.ts             `editProject`, `ProjectCommand`, `EditResult`
//   input-source.ts              `KeyInput`, `InputModifiers`
// ⛔ NOT READ: any body. In particular the `case 'project'` arm of
// `commandFromFieldCommit` and the `setProjectTitle` arm of `editProject` were
// not opened; what they must do is read above, out of FR-035 and IF-9.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { FieldCommit } from '../../src/adapter/screen-renderer/screen-surface'
import {
  commandFromFieldCommit,
  commandFromInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  editProject,
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import { specTable, unbroken } from '../contract/spec-table'

// ===========================================================================
// 1. The sentences, read out of the manuscript rather than believed
// ===========================================================================

/**
 * ⚠️ Japanese literals in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- these strings ARE the
 * clauses.
 */
const FR_035_STATEMENT = '**STATEMENT**: 作成者が文書名を選んだとき、`GRS` は、その場で編集できるようにすること。'

const FR_035_NO_EMPTY_STRING =
  'にも、いま開いている日程表が判る文書名を出すこと（MUST）** —— 同じ機で 2 つの文書を同時に開くことが実際に起きる構成なので、タブの見出しが同じだと選べない。 **`title` に空文字を受け付けてはならない（MUST NOT）'

const IN_4_NOTHING_HALF_TYPED_IS_WRITTEN =
  'S-8` の次の一手が「確定するか取り消すか」と既に述べており、取り消す手立てが 1 つも定まっていなかった。⛔ 取り消したときは、編集を始める前の値へ戻すこと（MUST）。書きかけの文字を文書へ書いてはならない（MUST NOT）'

const SK_19_SETTLES_THE_IN_PLACE_EDIT =
  'さない。** ほかに何も出ていないときは、**その場の編集を確定する**（名称・担当者名・行名・文書名・プロパティの入力）。確定していないその場の編集が 1 つも無いときは、プロパティパネルを出しているならば出すのをやめること（MUST）'

/** IF-9's widening, the ruling CR-361 rests on. Its file is Chapter 5-7. */
const IF_9_THE_FIELD_NAMES_U_27 = 'ヘッダの文書名の欄は 表 T-103 の `U-27` を名乗る'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

/** `U-27` of 表 T-103 -- the row the header's field names itself by. */
const U_27 = 'U-27'

/** The key 表 T-036 assigns to SK-9, read from the table rather than typed. */
const SK_9_KEY = ((): string => {
  const row = specTable('T-036').rows.find((one) => one.id === 'SK-9')
  if (row === undefined) throw new Error('table T-036 has no row SK-9')
  const cell = row.cells.find((text) => /`F\d+`/.test(text))
  const key = cell === undefined ? undefined : /`(F\d+)`/.exec(cell)?.[1]
  if (key === undefined) throw new Error(`table T-036 SK-9 assigns no function key: ${row.cells}`)
  return key
})()

// ===========================================================================
// 2. The bench
// ===========================================================================

const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...NESTED, ...part }) as unknown as DocumentSettings

const ROW_ID = 'r-alfa'

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01',
  scrollGroupId: ROW_ID,
  stackDirection: 'down',
})

/** The name the document starts every case with. ⭐ Never the empty string. */
const NAME_BEFORE = 'the name it started with'

const scheduleWithTitle = (title: string | null): Schedule =>
  ({
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title,
      uidHighWaterMark: 0,
      outlineBase: 1,
    },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [{ id: ROW_ID, parentId: null, label: 'row', order: 0, height: null }],
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const documentWithTitle = (title: string | null): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule: scheduleWithTitle(title),
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)

const contextFor = (document: Document, part: Partial<InputContext> = {}): InputContext => {
  const layout = layoutFromSchedule(document.schedule, SETTINGS, REGIONS)
  return {
    document,
    layout,
    geometry: geometryFromLayout(
      document.schedule,
      SETTINGS,
      layout,
      REGIONS,
      emptySelection(),
    ),
    regions: REGIONS,
    screenState: emptyScreenState(),
    selection: emptySelection(),
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
    ...part,
  }
}

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const keyOf = (key: string, modifiers: InputModifiers = NO_MODS): KeyInput => ({
  kind: 'key',
  key,
  modifiers,
})

const pressing = (key: string, part: Partial<InputContext> = {}): TranslatedInput =>
  commandFromInput(keyOf(key), contextFor(documentWithTitle(NAME_BEFORE), part))

/** The rows of 表 T-108 one input plans, flattened. Empty when it plans none. */
const writesOf = (answer: TranslatedInput): readonly DocumentCommand[] => {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat()
}

/**
 * What IF-9 hands back when the header's field settles: the row id the field
 * names itself by (`U-27`), the subject it is about, and the text as typed.
 *
 * ⛔ THE KEY IS THE DOCUMENT'S OWN `Project`, not a row of 表 T-016. FR-074
 * (MUST NOT) keeps 文書名 out of 文書の基本情報 and names FR-035 as its one
 * entrance, so no row of that table could carry it.
 */
const commitOf = (text: string): FieldCommit => ({
  row: U_27,
  key: { holder: 'project', column: 'title' },
  text,
})

/** IF-9's value in, `Project.title` out -- the whole of what CR-361 wired. */
const titleAfterCommitting = (text: string, from: string | null = NAME_BEFORE): string | null => {
  let document = documentWithTitle(from)
  for (const command of commandFromFieldCommit(commitOf(text), contextFor(document))) {
    // ⚠️ Only the Project aggregate is asked, because only its commands can
    // reach `Project.title` -- and a command from any other row arriving here
    // would be a defect this case should surface rather than route around.
    const result = editProject(document, command as never)
    if (result.ok) document = result.document
  }
  return document.schedule.project.title
}

// ===========================================================================
// 3. The premises every case below stands on
// ===========================================================================

describe('D-322 -- the manuscript these cases are driven by', () => {
  it('still asks FR-035 for an in-place edit of the document name', () => {
    expect(REQUIREMENTS).toContain(FR_035_STATEMENT)
  })

  it('still assigns F2 to SK-9, and still calls it 文書名を編集する', () => {
    const row = specTable('T-036').rows.find((one) => one.id === 'SK-9')
    expect(row?.cells.join(' ')).toContain('文書名を編集する')
    expect(SK_9_KEY).toBe('F2')
  })

  it('still forbids the empty string as a document name', () => {
    expect(REQUIREMENTS).toContain(FR_035_NO_EMPTY_STRING)
  })

  it('still forbids half-typed text reaching the document when the edit is cancelled', () => {
    expect(REQUIREMENTS).toContain(IN_4_NOTHING_HALF_TYPED_IS_WRITTEN)
  })

  it('still names 文書名 among what Enter settles', () => {
    expect(REQUIREMENTS).toContain(SK_19_SETTLES_THE_IN_PLACE_EDIT)
    expect(SK_19_SETTLES_THE_IN_PLACE_EDIT).toContain('文書名')
  })

  it('still has IF-9 admit a field that names U-27 rather than a row of table T-016', () => {
    expect(DESIGN).toContain(IF_9_THE_FIELD_NAMES_U_27)
  })
})

// ===========================================================================
// 4. SK-9 -- F2 opens the document name in place
// ===========================================================================

describe('T-036 SK-9 / FR-035 -- F2 opens the document name for editing in place', () => {
  it('answers editInPlace with the documentTitle target', () => {
    expect(pressing(SK_9_KEY).action).toEqual({
      kind: 'editInPlace',
      target: { kind: 'documentTitle' },
    })
  })

  it('opens the field and writes NOTHING by itself', () => {
    // ⭐ FR-035 asks for an EDIT, and an edit that had already written would
    // leave IN-4's 「取り消したときは、編集を始める前の値へ戻すこと」 with
    // nothing to return to.
    expect(writesOf(pressing(SK_9_KEY))).toEqual([])
  })

  it('opens it whatever the document name is now, including none at all', () => {
    // FR-035 gives `null` a meaning of its own (「`title` が `null` のときは」),
    // so a document that has never been named is still one whose name F2 opens.
    for (const before of [NAME_BEFORE, null]) {
      const answer = commandFromInput(
        keyOf(SK_9_KEY),
        contextFor(documentWithTitle(before)),
      )
      expect(answer.action, String(before)).toEqual({
        kind: 'editInPlace',
        target: { kind: 'documentTitle' },
      })
    }
  })

  it('does not open it while a field is already unsettled (IN-5a)', () => {
    // 「**単文字キーと `Delete` / `Backspace` は、文字入力を確定していない間は
    // 効かないこと（MUST NOT）**」 is about single characters, and `F2` is not
    // one -- ⭐ so this case asserts only that F2 does not plan a WRITE while a
    // field stands, which is the half IN-4 and FR-031 both turn on.
    expect(writesOf(pressing(SK_9_KEY, { isTextEntryUnsettled: true }))).toEqual([])
  })
})

// ===========================================================================
// 5. ⛔ THE CONTROL. Every case above would pass on a build that answered
//    `editInPlace{documentTitle}` to every key ever pressed.
// ===========================================================================

describe('T-036 -- F2 and only F2 opens the document name', () => {
  /** Every other function key 表 T-036 assigns, read from the table. */
  const OTHER_FUNCTION_KEYS = specTable('T-036')
    .rows.filter((one) => one.id !== 'SK-9')
    .flatMap((one) => one.cells.flatMap((cell) => [...cell.matchAll(/`(F\d+)`/g)].map((m) => m[1]!)))

  it('table T-036 still assigns function keys other than F2', () => {
    // ⭐ The premise of the control: an empty list would make the case below
    // vacuous. F1 (SK-13, help) and F11 (SK-15, full screen) are the two.
    expect(new Set(OTHER_FUNCTION_KEYS).size).toBeGreaterThan(1)
    expect(OTHER_FUNCTION_KEYS).not.toContain(SK_9_KEY)
  })

  it('no other function key of table T-036 opens the document name', () => {
    for (const key of new Set(OTHER_FUNCTION_KEYS)) {
      const action = pressing(key).action
      const opensTheName =
        action !== null &&
        action.kind === 'editInPlace' &&
        action.target.kind === 'documentTitle'
      expect(opensTheName, `${key} opened the document name`).toBe(false)
    }
  })

  it('Esc does not open it, and Esc does not write it either', () => {
    // 表 T-028 の IN-4: Esc CONSUMES a rung. ⛔ 「書きかけの文字を文書へ書いては
    // ならない（MUST NOT）」 -- so a cancel plans no row of 表 T-108 at all.
    const answer = pressing('Esc', { isTextEntryUnsettled: true })
    expect(answer.action).not.toEqual({
      kind: 'editInPlace',
      target: { kind: 'documentTitle' },
    })
    expect(writesOf(answer), 'Esc planned a write').toEqual([])
  })
})

// ===========================================================================
// 6. IF-9 / SK-19 -- what the settled value does
// ===========================================================================

describe('IF-9 + FR-035 -- a settled name reaches Project.title', () => {
  it('writes the typed name', () => {
    expect(titleAfterCommitting('a new name')).toBe('a new name')
  })

  it('plans exactly the row of table T-108 that owns the document name', () => {
    const planned = commandFromFieldCommit(
      commitOf('a new name'),
      contextFor(documentWithTitle(NAME_BEFORE)),
    )
    expect(planned).toEqual([{ kind: 'setProjectTitle', title: 'a new name' }])
  })

  it('writes a name that differs from the one it started with -- not a no-op', () => {
    // ⛔ THE CONTROL FOR THIS SECTION. A `commandFromFieldCommit` that answered
    // `[]` for everything would pass "the title is never empty" below and write
    // nothing at all.
    expect(titleAfterCommitting('a new name')).not.toBe(NAME_BEFORE)
  })
})

// ===========================================================================
// 7. 「`title` に空文字を受け付けてはならない（MUST NOT）」
// ===========================================================================

describe('FR-035 (MUST NOT) -- an emptied name is never committed', () => {
  it('leaves the name it started with when the field is settled empty', () => {
    // ⭐ THE WHOLE PATH, not one member of it. Whether the translator declines
    // to plan the command or the aggregate refuses it is the build's business;
    // what FR-035 forbids is the RESULT, and the result is what is asked for.
    expect(titleAfterCommitting('')).toBe(NAME_BEFORE)
  })

  it('never leaves the empty string behind, from any starting name', () => {
    for (const before of [NAME_BEFORE, null]) {
      expect(titleAfterCommitting('', before), String(before)).not.toBe('')
    }
  })

  it('the aggregate refuses CM-1 with an empty title, naming FR-035', () => {
    const refused = editProject(documentWithTitle(NAME_BEFORE), {
      kind: 'setProjectTitle',
      title: '',
    })
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.refusals.map((one) => one.rule)).toContain('FR-035')
  })

  it('still accepts null, which FR-035 gives a meaning of its own', () => {
    // 「**`title` が `null` のときは、タブの見出しを `Untitled` とすること
    // （MUST）**」 -- so `null` is a state the document may hold, and only the
    // empty string is forbidden. ⚠️ The tab heading itself is out of scope
    // here; what this case holds is that the two absences are NOT the same.
    const cleared = editProject(documentWithTitle(NAME_BEFORE), {
      kind: 'setProjectTitle',
      title: null,
    })
    expect(cleared.ok).toBe(true)
    if (cleared.ok) expect(cleared.document.schedule.project.title).toBeNull()
  })
})
