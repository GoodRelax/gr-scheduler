// The close entrance of the `Properties Panel` (U-25 of table T-103) -- the
// entry table T-109 places on that panel, and what the manuscript settles about
// the panel once it has been pressed.
//
// Unit under test: UF-64 of table T-075 (`properties-panel.ts`, component CP-37
// of table T-062), whose answer fills `ScreenView.propertiesPanel`.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   table T-109  the whole of the icons. Its 面 column is where an entrance
//                STANDS, and the row that closes an open surface names the
//                `Properties Panel` among the six surfaces it stands on. Its 正
//                column points at IN-4 of table T-028.
//   FR-029       「アイコンの名簿と置き場は `_assets/tbl-glossary.md` の 表 T-109
//                に、各アイコンの図形は同書の 図 F-019 に従うこと（MUST）」 --
//                the ROSTER AND ITS PLACEMENT are the table's, so an entrance
//                the table places on the panel has to be drawn on the panel, and
//                one it does not place there may not be.
//                ⛔ 「同じ機能の入口を画面上の 2 か所に置いてはならない（MUST
//                NOT）」 -- so the panel carries it ONCE. The same requirement
//                lists its one exception in as many words: 「例外は表示言語の切替
//                だけである」, which is IC-21 and not this row.
//   IN-4         table T-028: `Esc` spends one level per press and the FIRST
//                level is 「開いている面」 -- the authority the roster gives the
//                closing entry.
//   S-99h        table T-206, 「プロパティパネルを出しているか（`選択` ／ `文書
//                全体の設定` ／ 出していない）」, 既定 「出していない」. ⭐ THIS
//                IS THE ANSWER TO "where does the showing state live": 「⛔ **幅
//                （`S-80`）とは別に持つこと**（利用者の裁定 2026-08-30）—— ⚠️ **幅
//                `0` は「まだ広げていない」であって「出していない」ではない。**」
//                ⭐ The row says why that default: 「**既定が「出していない」なの
//                は `FR-080` の基準環境である。**」 and FR-080 spells that
//                environment out: 「本表にいう「書き出しの基準環境」とは、表 T-025
//                の `MC-5` が定める基準ブラウザと `MC-6` が定める画面環境で、プロパ
//                ティパネルとコマンドパレットを閉じた状態をいう。」
//   S-80         table T-203, `propertyPanelWidth`: 「⛔ **本行は幅だけを持ち、面
//                を出しているかどうかは持たない**（利用者の裁定 2026-08-30）——
//                **出しているかは 表 T-206 の `S-99h` が持つ。**⚠️ **`0` は「まだ
//                広げていない」であって「閉じている」ではない** —— `FR-052` は境界
//                のドラッグで幅を 0 まで畳めると定めており、0 は正当な幅である」.
//   S-171        table T-206, 「プロパティパネルが開いたときに取る幅」, 既定 280px
//                🔎 -- NOT a document setting, and its own note says why: 「⭐
//                **`S-80` は文書が保つ幅であり、面を出しているかどうかは 表 T-206
//                の `S-99h` が持つ**（利用者の裁定 2026-08-30）—— 本値は**面を出す
//                ときに置く幅**である。⚠️ **人が境界をドラッグした後は `S-80` が
//                勝つ**（`FR-052`）」.
//   FR-052       「利用者がパネルの境界をドラッグしたとき、`GRS` は、行見出しパネル
//                とプロパティパネルの幅を変えること」 -- the requirement that makes
//                a width of `0` a lawful width rather than a state. ⚠️ Only the
//                ROW TITLE panel is forbidden to reach 0: 「**行見出しパネルの幅を
//                0 にできてはならない（MUST NOT）**」.
//
// ---------------------------------------------------------------------------
// ⭐ SETTLED 2026-08-30 (CR-291): WHAT SAYS THE PANEL IS UP IS S-99h, NOT S-80
// ---------------------------------------------------------------------------
//
// The earlier reading of this file -- that a width of `0` IS the closed panel --
// was the arguable one, and the ruling went the other way. Two rows now divide
// the question: S-99h holds WHETHER the panel is showing (and which of FR-072's
// two contents), S-80 holds only HOW WIDE it is, and S-171 the width to put it
// at when it is shown. ⛔ So no case here may read a width as a state.
//
// ⚠️ THE POSITIVE HALF IS tests/unit/uf-64.test.ts's, which already drives 「is
// absent while the panel is closed」 and 「is described for either of the two the
// session names」 with S-80 at its default of `0`. ⛔ NOT REPEATED HERE. What the
// case below adds is the other side of the same ruling: a WIDENED document whose
// S-99h says 「出していない」 still has no panel, so the width decides nothing in
// either direction.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule named above, docs/development-rules/,
// and in `properties-panel.ts` and `screen-renderer.ts` nothing but the exported
// signature, the declared types and the argument list -- never a body. The shape
// of the fixture below (`nested` / `settingsOf` / `taskOf` / `visualOf` /
// `scheduleOf` / `holding` / the whole `ScreenSession`) is copied from
// tests/unit/uf-64.test.ts, which drives the same unit.
//
// ⛔ NO ROW ID IS TYPED OUT. Which entrance closes the panel is table T-109's
// own fact, so the cases read the table at run time and compare against what it
// says -- rule 03 of docs/development-rules forbids re-typing a value the
// manuscript holds, and an entrance renumbered in the manuscript has to fail
// here rather than go stale.
//
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED:
//   1. THE SHAPE the entrance is drawn with. 図 F-019 is the sole authority for
//      every shape and FR-029 (MUST NOT) forbids writing one out in words.
//   2. WHERE ON THE PANEL it sits. No table holds a rectangle for an entry --
//      `ScreenSession.iconUnderPointer`'s own note records that gap (PD-141) --
//      so "at the top right" is not a claim the manuscript can be quoted for.
//   3. THAT `Esc` ALSO CLOSES THE PANEL. ⛔ TWO ROWS NOW DISAGREE, so no case
//      here picks between them. Table T-109's entry stands on the panel among
//      six surfaces, its 何の入口か column reads 「開いている面を閉じる」 and its
//      正 column names IN-4, whose FIRST level is 「開いている面」; but S-99h,
//      ruled the same day the state moved off the width, says the panel is not
//      one of those surfaces: 「⚠️ **`S-99g` の「面」ではない** —— パネルは画面の
//      上に重ねず、`Esc` の第 1 階層でも閉じない（表 T-028 の `IN-4` が別の段を与
//      えている）」. ⛔ IN-4's six levels hold no other step this panel could be,
//      so which 段 that is cannot be quoted. Reported.
//   4. WHICH ACT WRITES S-99h. The rows say what the value MEANS -- the panel is
//      showing, and which of FR-072's two contents -- and no requirement names
//      the operation that sets it to 「出していない」, nor what a re-shown panel
//      does with S-171 and S-80. The case below asserts the reading S-99h
//      states, not a write it does not.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  Schedule,
  Task,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import type {
  PropertiesPanel,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

/** 表 T-103's U-25 -- the settled spelling of the panel, letter for letter. */
const U_25 = 'Properties Panel'

const T_109 = specTable('T-109')

/** The columns the cases read. A rename has to fail loudly, not silently. */
const SURFACE_COLUMN = '面'
const ENTRY_COLUMN = '何の入口か'
const AUTHORITY_COLUMN = '正'

for (const column of [SURFACE_COLUMN, ENTRY_COLUMN, AUTHORITY_COLUMN]) {
  if (!T_109.headings.includes(column)) {
    throw new Error(`table T-109 no longer has a ${column} column: ${T_109.headings.join(' | ')}`)
  }
}

/**
 * The surfaces one row of table T-109 places its entrance on.
 *
 * ⚠️ Several to a cell, written with ` / ` between them -- the closing row is the
 * one cell of that table that names six.
 */
const surfacesOf = (cell: string): readonly string[] =>
  cell
    .split('/')
    .map((one) => one.replace(/[`*]/g, '').trim())
    .filter((one) => one.length > 0)

/** Every row of table T-109 whose 面 column places an entrance on the panel. */
const PANEL_ENTRANCES = T_109.rows.filter((row) =>
  surfacesOf(row.by[SURFACE_COLUMN] ?? '').includes(U_25),
)

const PANEL_ENTRANCE_IDS = PANEL_ENTRANCES.map((row) => row.id)

/** 表 T-203's S-80 -- the width the document keeps, and NOTHING ELSE (CR-291). */
const S_80 = specTable('T-203').rows.find(
  (row) => bare(row.by['キー'] ?? '') === 'propertyPanelWidth',
)
if (S_80 === undefined) throw new Error('table T-203 no longer has a row for `propertyPanelWidth`')

/** The width a fresh document keeps -- 「まだ広げていない」, out of the 既定 column. */
const UNWIDENED = Number(bare(S_80.by['既定'] ?? ''))

const T_206 = specTable('T-206')

/** 表 T-206's S-171 -- the width a panel is put at when it is shown. */
const S_171 = T_206.rows.find((row) => row.id === 'S-171')
if (S_171 === undefined) throw new Error('table T-206 no longer has row S-171')

/**
 * That width as a number. ⛔ NOT TYPED OUT: the 既定 column writes it with its
 * unit and its 🔎, so the digits are taken from the cell and a row that stopped
 * carrying a number fails here rather than going stale.
 */
const SHOWN_WIDTH = Number(/\d+/.exec(S_171.by['既定'] ?? '')?.[0] ?? Number.NaN)
if (!Number.isFinite(SHOWN_WIDTH) || SHOWN_WIDTH <= UNWIDENED) {
  throw new Error(`S-171 no longer carries a width above ${UNWIDENED}: ${S_171.by['既定'] ?? ''}`)
}

/**
 * 表 T-206's S-99h -- the row the ruling of 2026-08-30 added, which holds
 * WHETHER the panel is showing, apart from the width.
 */
const S_99H = T_206.rows.find((row) => row.id === 'S-99h')
if (S_99H === undefined) throw new Error('table T-206 no longer has row S-99h')

/** 表 T-216's S-73, so no case types the hue out. */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

// ---------------------------------------------------------------------------
// Inputs. The shape of everything below is tests/unit/uf-64.test.ts's.
// ---------------------------------------------------------------------------

/**
 * `SETTINGS_DEFAULTS` is printed with the dotted keys `_assets/tbl-settings.md`
 * writes, while `DocumentSettings` is the nested shape.
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

/**
 * A document whose boundary has been dragged, so that the cases about the
 * ENTRANCE are not also cases about S-80.
 *
 * ⚠️ The number is the manuscript's own default, moved off it -- FR-052 lets a
 * person drag the boundary, so any width from `0` up is a lawful document and no
 * requirement fixes which one. ⛔ It is NOT what makes the panel show: that is
 * S-99h, which the session carries.
 */
const SETTINGS_WIDENED = settingsOf({ propertyPanelWidth: UNWIDENED + 1 })

const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  // The members no case here varies: `iconUnderPointer` is EZ-2's place
  // condition (`null` -- the pointer rests on no icon, so no tooltip anywhere
  // names an entrance), `themePreference` is S-72 and `isMilestoneListOpen`
  // S-142 at the manuscript's defaults, `themeHue` is S-73 read from the
  // manuscript, `selectedGroupIds` is FR-085's set of rows and
  // `selectedResourceUids` FR-099's set of people (both empty), and
  // `propertiesSubject` is FR-072's remembered subject (`null` -- no operation
  // has chosen one yet).
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

/** ET-11, likewise. */
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

const scheduleOf = (part: Record<string, unknown> = {}): Schedule =>
  ({
    project: { title: null, themeHue: THEME_HUE, uidHighWaterMark: 0, minutesPerDay: null },
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

/** The one task every case here describes. */
const THE_TASK = 1

/**
 * ⛔ Named so that no value in the document can be mistaken for an entrance:
 * `iconsIn` below reads every string of the description, and a task NAMED after
 * a row of table T-109 would read as one.
 */
const THE_TASK_NAME = 'a task'

const ONE_TASK = scheduleOf({
  tasks: [taskOf({ uid: THE_TASK, name: THE_TASK_NAME })],
  taskVisuals: [visualOf({ taskUid: THE_TASK })],
})

const holding = (...items: readonly ItemRef[]): Selection =>
  items.reduce((selection, item) => selectionWith(selection, item), emptySelection())

const TASK_REF: ItemRef = { kind: 'task', uid: THE_TASK }

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

const panelOf = (
  settings: DocumentSettings = SETTINGS_WIDENED,
  selection: Selection = holding(TASK_REF),
  session: ScreenSession = SESSION,
): PropertiesPanel => {
  const panel = propertiesPanelFromSelection(ONE_TASK, settings, selection, session)
  expect(panel, 'the panel is described while `propertiesShowing` names one of the two').not.toBe(
    null,
  )
  return panel as PropertiesPanel
}

/**
 * Every row of table T-109 named anywhere in a description, however it is
 * carried.
 *
 * ⭐ READ OFF THE WHOLE VALUE AND NOT OFF A DECLARED MEMBER. The panel has no
 * member for its entrances today, so a case written against one would not
 * compile and could never go red; walking the value asks the question the
 * requirement asks -- is the entrance THERE -- without settling where it is
 * carried, which is Chapter 5's to decide.
 */
const iconsIn = (value: unknown): readonly string[] => {
  if (typeof value === 'string') return /^IC-\d+$/.test(value) ? [value] : []
  if (Array.isArray(value)) return value.flatMap(iconsIn)
  if (typeof value === 'object' && value !== null) {
    return Object.values(value as Record<string, unknown>).flatMap(iconsIn)
  }
  return []
}

const countOf = (icons: readonly string[], id: string): number =>
  icons.filter((one) => one === id).length

// ---------------------------------------------------------------------------

describe('table T-109 -- the entrance the manuscript places on the panel', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST THE 面 COLUMN WOULD MAKE EVERY CASE
    // BELOW AGREE WITH ANYTHING -- rule 04 section 2: a mechanism is not
    // verified until it has been broken on purpose and seen to fail.
    const first = T_109.rows[0]
    expect(first, 'table T-109 has rows').not.toBe(undefined)
    expect(
      surfacesOf(first?.by[SURFACE_COLUMN] ?? '').length,
      'the 面 column parsed into at least one surface',
    ).toBeGreaterThan(0)
    expect(
      T_109.rows.some((row) => surfacesOf(row.by[SURFACE_COLUMN] ?? '').length > 1),
      'at least one row places its entrance on more than one surface',
    ).toBe(true)
  })

  it('⛔ FR-029 (MUST NOT): places exactly ONE entrance on the panel', () => {
    // 「同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）」, and the
    // one exception the requirement admits is the display language (IC-21),
    // which table T-109 does not place on this panel.
    expect(PANEL_ENTRANCE_IDS, `rows of table T-109 placed on ${U_25}`).toHaveLength(1)
  })

  it('and that one entrance closes an open surface, on IN-4\'s authority', () => {
    // The 何の入口か column says what it is FOR and the 正 column says which rule
    // it answers to. Both are read rather than typed: an entrance whose meaning
    // moved has to fail here.
    const entrance = PANEL_ENTRANCES[0]
    expect(entrance, `table T-109 places an entrance on ${U_25}`).not.toBe(undefined)
    expect(entrance?.by[ENTRY_COLUMN] ?? '').toContain('閉じる')
    expect(bare(entrance?.by[AUTHORITY_COLUMN] ?? '')).toBe('IN-4')
  })
})

describe('FR-029 -- the entrance table T-109 places on the panel is drawn on it', () => {
  it('⛔ MUST carry every entrance the table places on it', () => {
    // 「アイコンの名簿と置き場は … 表 T-109 に … 従うこと（MUST）」. The 面 column
    // IS the placement, so an entrance the table stands on this panel and the
    // panel does not draw is a MUST unmet -- and with no way to close it the
    // panel is a surface a reader cannot put away.
    const drawn = new Set(iconsIn(panelOf()))
    expect([...drawn].sort()).toEqual([...PANEL_ENTRANCE_IDS].sort())
  })

  it('⛔ MUST NOT draw one of them twice', () => {
    // 「同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）」 -- one
    // press, one place. ⚠️ This is the same red as the case above while the count
    // is zero, and it is a different claim all the same: that one fails for an
    // entrance that is missing, this one for an entrance that is doubled.
    const drawn = iconsIn(panelOf())
    for (const id of PANEL_ENTRANCE_IDS) {
      expect(countOf(drawn, id), `${id} on ${U_25}`).toBe(1)
    }
  })

  it('draws no entrance the table places somewhere else', () => {
    // The other half of 「置き場は … 表 T-109 に従うこと（MUST）」: a panel that
    // drew IC-17 -- FR-072's entrance, which that table stands on the
    // `App Header` -- would put one operation in two places.
    for (const id of iconsIn(panelOf())) {
      expect(PANEL_ENTRANCE_IDS, `${id} is drawn on ${U_25}`).toContain(id)
    }
  })

  it('shows the same entrance whichever of FR-072\'s two contents is up', () => {
    // FR-072 turns the panel between the selection and the document's settings.
    // ⛔ Neither is a reason to take away the way out: table T-109 places the
    // entrance on the SURFACE, and the surface is the same panel either way.
    for (const showing of ['selection', 'documentSettings'] as const) {
      const session = sessionWith({ propertiesShowing: showing })
      const drawn = iconsIn(panelOf(SETTINGS_WIDENED, holding(TASK_REF), session))
      expect([...new Set(drawn)].sort(), showing).toEqual([...PANEL_ENTRANCE_IDS].sort())
    }
  })
})

describe('S-99h -- what says the panel is showing, kept apart from S-80', () => {
  it('a fresh document is 「まだ広げていない」, which S-80 spells as a width of zero', () => {
    // S-80 of table T-203, after CR-291: 「⚠️ **`0` は「まだ広げていない」であって
    // 「閉じている」ではない**」. ⭐ The row is a key of `documentSettings`, so the
    // width is saved WITH the document -- and the value that reaches the code has
    // to be the manuscript's, not a second copy of it.
    // ⛔ THE CLAIM IS ABOUT THE WIDTH ALONE: 「**本行は幅だけを持ち、面を出している
    // かどうかは持たない**」.
    expect(SETTINGS_DEFAULTS['propertyPanelWidth']).toBe(UNWIDENED)
    expect(UNWIDENED, 'S-80 still hands a fresh document a width of zero').toBe(0)
  })

  it('⭐ S-99h holds the three states, and the width row holds none of them', () => {
    // The row the ruling of 2026-08-30 added, read rather than copied: its 値
    // column names 「プロパティパネルを出しているか（`選択` ／ `文書全体の設定` ／
    // 出していない）」 and its 既定 is the third of those.
    // ⛔ WITHOUT THIS, THE CASE BELOW WOULD PASS AGAINST A SPECIFICATION THAT NEVER
    // SPLIT THE TWO -- rule 04 section 2: the mechanism is checked, not assumed.
    for (const state of ['選択', '文書全体の設定', '出していない']) {
      expect(S_99H.by['値'] ?? '', `S-99h names ${state}`).toContain(state)
    }
    expect(S_99H.by['既定'] ?? '').toContain('出していない')
    expect(
      S_80.by['意味・範囲の理由'] ?? '',
      'S-80 hands the showing state to S-99h instead of holding it',
    ).toContain('S-99h')
  })

  it('⛔ MUST NOT describe a panel while S-99h says 「出していない」, at any width', () => {
    // ⭐ S-99h (利用者の裁定 2026-08-30): 「⛔ **幅（`S-80`）とは別に持つこと** ——
    // ⚠️ **幅 `0` は「まだ広げていない」であって「出していない」ではない。**」 So the
    // width cannot say the panel is up, and it cannot say it is down either: with
    // the session's S-99h at its default the panel is absent however wide the
    // document is, and `ScreenView.propertiesPanel` is `null` for exactly that.
    // ⚠️ THE WIDTHS ARE THE TWO THE MANUSCRIPT ITSELF NAMES ABOVE ZERO -- one past
    // S-80's default, which FR-052 lets a person drag to, and S-171's 「面を出した
    // ときに置く幅」, the one width a shown panel is put at. ⛔ S-80's own default
    // is left to tests/unit/uf-64.test.ts, which already drives it.
    const notShowing = sessionWith({ propertiesShowing: null })
    for (const width of [UNWIDENED + 1, SHOWN_WIDTH]) {
      expect(
        propertiesPanelFromSelection(
          ONE_TASK,
          settingsOf({ propertyPanelWidth: width }),
          holding(TASK_REF),
          notShowing,
        ),
        `S-80 at ${width}`,
      ).toBe(null)
    }
  })
})
