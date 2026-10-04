// Contract test: FR-151 SV-4 / SV-7 / SV-8 / SV-14 and T-028 IN-4 against the Search Panel filter seams (DFC-1362).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage, SearchPanelView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  searchPanelAfterFilterChange,
  searchPanelAfterFilterEntry,
  searchPanelFromSession,
  searchPanelWithFilterClosed,
  searchPanelWithFilterOpened,
  type SearchFilterChange,
} from '../../src/adapter/screen-renderer/search-panel'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { escapeTarget, type EscapeContext } from '../../src/entity/document-model/screen-state/screen-state'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { searchPanelBoxOf, searchPanelElement } from '../../src/framework/dom-screen-surface/search-panel-drawing'
import {
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  type ScreenSession,
  type SearchPanelSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { selfAndDescendants, stage, type FakeElement } from '../fixtures/fake-browser'
import { specTable, unbroken, type SpecRow } from './spec-table'


function rowOf(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(table, id).by[heading] ?? '')

const SV_4_MATCH =
  '語が、タスクの表では名前（`SQ-1`）か担当者名のどれか 1 つ（`SQ-2`）、コメントボックスの表では本文（`SQ-7`）の一部と一致する行を載せる。'
const SV_4_NFKC = '比べる前に両方を `NFKC` で正規化し、大文字と小文字を畳む —— 全角と半角、大文字と小文字を区別しない。'
const SV_4_KANA =
  'ひらがなとカタカナは区別する（例: 語「ｐｍ」は「PM レビュー」に当たり、語「れびゅー」は「レビュー」に当たらない）。'
// WHY: the three words of the SV-4 example, taken from that sentence so a changed example reddens the first case.
const EXAMPLE_FULL_WIDTH = 'ｐｍ'
const EXAMPLE_HIRAGANA = 'れびゅー'
const EXAMPLE_KATAKANA = 'レビュー'
const SV_4_EMPTY = '語が空のときはすべての行を載せる。'
const SV_4_NAMELESS = '名前が空のタスクも表に載るが、名前の側では空でない語に当たらない'
const FR_151_NOT_SEARCHED =
  '⛔ 探すものに `Task.notes`（`_assets/fig-erd-detail.md` の `AT-32`）と行の名前（`AT-53`）を含めてはならない（MUST NOT）'

const SV_7_ENTRY = 'どの列の見出しにも `IC-122` を置き、押すと絞り込みを開く。'
const SV_7_CONTENTS =
  '操作の段は、値の一覧を絞る入力欄と、`IC-125`（すべて入れる）・`IC-126`（すべて外す）・`IC-123`（昇順）・`IC-124`（降順）の行である。'
const SV_7_ITEMS =
  '値の一覧は、担当者名の列では 1 人ずつ、ほかの列ではセルの値ごとに 1 項目、空のセルは「（空白）」の 1 項目。'
const SV_7_DATES = '日付の列は、値の一覧と絞る入力欄の代わりに、操作の段（`IC-123`・`IC-124`）の下で「いつから」「いつまで」を宿主の日付の入力で選ばせる。'
const SV_7_ALL = '列の絞り込みどうし、語と絞り込みは、すべてを満たす行だけを残す。'
const SV_7_ASSIGNEES = '担当者名の列は、担当者のうち 1 人でも表示に入れた値なら残す。'
const SV_7_BLANK_DATES = '日付の列に「いつから」か「いつまで」を置くと、その日付の空の行は外す。'
const SV_7_ONE_OPEN = '開いている絞り込みは一度に 1 つ'

const SV_8_ONE = '並べ替える列は 1 つ。'
const SV_8_STATES =
  '状態の列（`SQ-5`）の昇順は ボトルネック → 未着手 → 進行中 → 完了 → 中断・再開予定あり → 中断・再開日未定、降順はその逆'
const SV_8_TIES = '同じ値の行は既定の並びを保ち、空の値は向きによらず末尾。'
const SV_8_DEFAULT =
  '既定の並びは、行の木の上からの並び → `SQ-3`（コメントボックスは `SQ-9`）→ `Task.uid`（コメントボックスは `id`）'

const SV_3_ONE = '表は一度に 1 つだけ出す。'
const SV_12_ONLY_TITLE = '`FR-036` の 表 T-335 の `WB-2`・`WB-5`（入口は `IC-129`）'

const SV_14_ESC = '列の絞り込みが開いていれば、`Esc` はまず絞り込みだけを閉じ、次の `Esc` でパネルを閉じる。'
const SV_14_REMEMBER = '語・表の切り替え・絞り込み・並べ替え・列の幅・位置・大きさは、同じ画面のあいだ覚え、開き直したときに戻す'

const IN_4_ORDER =
  '消費する階層は 出ている通知 → 確定していないその場の編集 → 開いている面 → 進行中のドラッグ・引きかけの矢印 → 開いているウインドウ → プロパティパネル → 構え → 選択 → `Dual Cursor` モード → 出ている説明 → 全画面表示 の順とすること（MUST）'
const IN_4_SEARCH =
  '⭐ 閉じる番の検索パネル（`FR-151`）は、列の絞り込みが開いていれば絞り込みだけを閉じ、次の `Esc` でパネルを閉じる（表 T-330 の `SV-14`）。'

const IC_WORDS: Readonly<Record<string, string>> = {
  'IC-122': '列の絞り込みと並べ替えを開く（列の見出しごとに 1 つ）',
  'IC-123': 'その列で昇順に並べる。プロパティパネルでは、担当者の欄の候補を名の昇順に並べる（`FR-008` の 表 T-225 の `AS-5`）',
  'IC-124': 'その列で降順に並べる。プロパティパネルでは、担当者の欄の候補を名の降順に並べる（`FR-008` の 表 T-225 の `AS-5`）',
  'IC-125': '値の一覧のすべてを表示に入れる',
  'IC-126': '値の一覧のすべてを表示から外す',
}

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))


type Words = Record<DisplayLanguage, string>
const WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as {
  readonly searchPanel: readonly { readonly part: string; readonly text: Words }[]
  readonly planActualStates: readonly { readonly rowId: string; readonly text: Words }[]
}

function found<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`missing: ${what}`)
  return value
}

const panelWordOf = (part: string, language: DisplayLanguage): string =>
  found(WORDS.searchPanel.find((one) => one.part === part), `search panel word ${part}`).text[language]
const stateWordOf = (row: string, language: DisplayLanguage): string =>
  found(WORDS.planActualStates.find((one) => one.rowId === row), `state word ${row}`).text[language]

const BLANK_JA = panelWordOf('blank', 'ja')
const NO_NAME_JA = panelWordOf('noName', 'ja')

// see T-331
const TASK_COLUMNS = specTable('T-331').rows.filter((row) => row.by['表'] === 'タスク').map((row) => row.id)
const COMMENT_COLUMNS = specTable('T-331')
  .rows.filter((row) => row.by['表'] === 'コメントボックス')
  .map((row) => row.id)
const DATE_COLUMNS = ['SQ-3', 'SQ-4', 'SQ-12', 'SQ-13', 'SQ-9']


type Loose = Record<string, unknown>
const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Loose }
const firstOf = (key: string): Loose => ((TEMPLATE.schedule[key] as readonly Loose[])[0] ?? {}) as Loose

const D = (day: string): string => `${day}T00:00:00`
// WHY: T-331 writes a date "as yyyy/mm/dd (2026/01/01)", so a nameless row is told apart by its start cell.
const written = (day: string): string => {
  const [y, m, d] = day.split('-')
  return `${y}/${m}/${d}`
}

type State = 'notStarted' | 'inProgress' | 'finished' | 'resumePlanned' | 'resumeUnknown'

// WHY: T-019a -- PS-1 no actualStart, PS-2 actualFinish, PS-3 resumeValid false, PS-4 resume, PS-5 otherwise.
const STATE_FIELDS: Readonly<Record<State, Loose>> = {
  notStarted: { actualStart: null, stop: null, actualFinish: null, resume: null, resumeValid: null },
  inProgress: { actualStart: D('2026-03-30'), stop: null, actualFinish: null, resume: null, resumeValid: null },
  finished: { actualStart: D('2026-03-30'), stop: null, actualFinish: D('2026-04-08'), resume: null, resumeValid: null },
  resumePlanned: {
    actualStart: D('2026-03-30'),
    stop: D('2026-04-02'),
    actualFinish: null,
    resume: D('2026-05-01'),
    resumeValid: true,
  },
  resumeUnknown: { actualStart: D('2026-03-30'), stop: D('2026-04-02'), actualFinish: null, resume: null, resumeValid: false },
}

interface TaskSpec {
  readonly uid: number
  readonly name: string
  readonly start: string | null
  readonly state: State
  readonly group: string
}

const G_PROGRAMME = 'g-programme'
const G_STEERING = 'g-steering'
const G_REVIEW = 'g-review'
const G_ARCHIVE = 'g-archive'
const PROGRAMME = 'Programme'
const STEERING = 'Steering'
const REVIEW = 'Review'
const ARCHIVE = 'Archive'

// WHY: uids 2 and 5 tie on start, 3 and 6 have no name, 7 has no date and sits alone on its row;
// the default order (SV-8) is Programme [1, 2], Steering [3], Review [5, 6, 4], Archive [7].
const TASKS: readonly TaskSpec[] = [
  { uid: 1, name: 'PM review', start: '2026-04-01', state: 'inProgress', group: G_PROGRAMME },
  { uid: 2, name: 'Beta', start: '2026-04-10', state: 'notStarted', group: G_PROGRAMME },
  { uid: 3, name: '', start: '2026-04-05', state: 'finished', group: G_STEERING },
  { uid: 4, name: 'Gamma', start: '2026-04-20', state: 'resumePlanned', group: G_REVIEW },
  { uid: 5, name: EXAMPLE_KATAKANA, start: '2026-04-10', state: 'resumeUnknown', group: G_REVIEW },
  { uid: 6, name: '', start: '2026-04-15', state: 'notStarted', group: G_REVIEW },
  { uid: 7, name: 'Delta', start: null, state: 'notStarted', group: G_ARCHIVE },
]
const DEFAULT_ORDER = [1, 2, 3, 5, 6, 4, 7]

const ANN = 'Ann'
const BOB = 'Bob'
const CID = 'Cid'
const PEOPLE: readonly (readonly [number, string])[] = [
  [301, ANN],
  [302, BOB],
  [303, CID],
]
// WHY: task uid -> resource uid, in assignment order.
const ASSIGNED: readonly (readonly [number, number])[] = [
  [1, 301],
  [1, 302],
  [2, 303],
  [4, 302],
  [5, 301],
]
const HIDDEN_NOTE = 'zzhiddennote'

const taskOf = (spec: TaskSpec): Loose => ({
  ...firstOf('tasks'),
  uid: spec.uid,
  wbsParentUid: null,
  wbsOrder: spec.uid,
  name: spec.name,
  start: spec.start === null ? null : D(spec.start),
  finish: spec.start === null ? null : D(spec.start),
  milestone: false,
  percentComplete: null,
  dependencies: [],
  notes: spec.uid === 2 ? HIDDEN_NOTE : null,
  ...STATE_FIELDS[spec.state],
})

const groupOf = (id: string, parentId: string | null, order: number, label: string): Loose => ({
  ...firstOf('taskGroups'),
  id,
  parentId,
  order,
  label,
  derivedFromTaskUid: null,
  treeState: 'expanded',
})

const commentOf = (id: string, text: string, anchorGroupId: string, anchorDate: string | null): Loose => ({
  id,
  leaderShapeKind: null,
  text,
  anchorDate: anchorDate === null ? null : D(anchorDate),
  anchorGroupId,
  bodyOffsetPx: null,
  strokeColor: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
  textColor: null,
})

// WHY: the default order (SV-8) is c-1 (Steering), c-2 (Review), c-3 (Archive).
const COMMENT_DEFAULT = ['c-1', 'c-2', 'c-3']
const COMMENT_TEXT: Readonly<Record<string, string>> = { 'c-1': 'PM note', 'c-2': 'other', 'c-3': 'memo' }

const SCHEDULE = {
  ...TEMPLATE.schedule,
  tasks: TASKS.map(taskOf),
  taskGroups: [
    groupOf(G_PROGRAMME, null, 0, PROGRAMME),
    groupOf(G_STEERING, G_PROGRAMME, 0, STEERING),
    groupOf(G_REVIEW, null, 1, REVIEW),
    groupOf(G_ARCHIVE, null, 2, ARCHIVE),
  ],
  taskGroupMembers: TASKS.map((one) => ({ taskUid: one.uid, groupId: one.group })),
  resources: PEOPLE.map(([uid, name]) => ({ ...firstOf('resources'), uid, name })),
  assignments: ASSIGNED.map(([taskUid, resourceUid], at) => ({
    ...firstOf('assignments'),
    uid: 401 + at,
    taskUid,
    resourceUid,
  })),
  commentBoxes: [
    commentOf('c-1', COMMENT_TEXT['c-1'] ?? '', G_STEERING, '2026-05-02'),
    commentOf('c-2', COMMENT_TEXT['c-2'] ?? '', G_REVIEW, '2026-04-01'),
    commentOf('c-3', COMMENT_TEXT['c-3'] ?? '', G_ARCHIVE, null),
  ],
  taskVisuals: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const CANVAS: ScreenRect = { x: 0, y: 56, width: 1000, height: 600 }


const step = (session: ScreenSession, type: string): ScreenSession =>
  advanceScreenSession(session, { type } as unknown as SessionEvent).state

function sessionIn(language: DisplayLanguage, ...events: readonly string[]): ScreenSession {
  const shown = events.reduce(step, step(emptyScreenSession, 'searchEntryPressed'))
  return {
    ...shown,
    screen: { ...shown.screen, screenLanguage: language, helpLanguage: language },
  } as unknown as ScreenSession
}

const JA = sessionIn('ja')
const TASK_PANEL: SearchPanelSession = { ...emptySearchPanelSession, table: 'tasks' }
const COMMENT_PANEL: SearchPanelSession = { ...emptySearchPanelSession, table: 'commentBoxes' }

function viewOf(panel: SearchPanelSession, session: ScreenSession = JA): SearchPanelView {
  return found(searchPanelFromSession(session, panel, SCHEDULE, CANVAS), 'a view of a shown panel')
}

const opened = (column: string, panel: SearchPanelSession = TASK_PANEL, session: ScreenSession = JA): SearchPanelSession =>
  found(searchPanelWithFilterOpened(session, panel, column), `the panel after IC-122 on ${column}`)

const changed = (panel: SearchPanelSession, change: SearchFilterChange): SearchPanelSession =>
  found(searchPanelAfterFilterChange(JA, panel, change), `the panel after ${JSON.stringify(change)}`)

const pressed = (panel: SearchPanelSession, entry: string): SearchPanelSession =>
  found(searchPanelAfterFilterEntry(JA, panel, entry, SCHEDULE), `the panel after ${entry}`)

type Menu = NonNullable<SearchPanelView['filterMenu']>
type ValuesMenu = Extract<Menu, { kind: 'values' }>

const menuOf = (panel: SearchPanelSession, session: ScreenSession = JA): Menu =>
  found(viewOf(panel, session).filterMenu, 'an open filter in the view')

function valuesOf(panel: SearchPanelSession, session: ScreenSession = JA): ValuesMenu {
  const menu = menuOf(panel, session)
  if (menu.kind !== 'values') throw new Error(`the open filter of ${menu.column} is ${menu.kind}, not values`)
  return menu
}

// WHY: the seam does not say how a value is spelled, so the case finds it by the label it is shown with.
const valueLabelled = (panel: SearchPanelSession, label: string): string =>
  found(
    valuesOf(panel).values.find((one) => one.label === label),
    `an item labelled ${label} in ${menuOf(panel).column}`,
  ).value

const untick = (panel: SearchPanelSession, label: string): SearchPanelSession =>
  changed(panel, { kind: 'value', column: menuOf(panel).column, value: valueLabelled(panel, label), isShown: false })

const tick = (panel: SearchPanelSession, label: string): SearchPanelSession =>
  changed(panel, { kind: 'value', column: menuOf(panel).column, value: valueLabelled(panel, label), isShown: true })

const bound = (panel: SearchPanelSession, which: 'since' | 'until', day: string | null): SearchPanelSession =>
  changed(panel, { kind: 'bound', column: menuOf(panel).column, bound: which, day })

const isShownOf = (panel: SearchPanelSession, label: string): boolean =>
  found(valuesOf(panel).values.find((one) => one.label === label), `item ${label}`).isShown

// WHY: a task row is named by its SQ-1 cell; the two nameless tasks by their SQ-3 cell as well.
const TASK_KEYS = new Map<string, number>(
  TASKS.map((one) => [one.name === '' ? `${NO_NAME_JA}@${written(one.start ?? '')}` : one.name, one.uid]),
)
const COMMENT_KEYS = new Map<string, string>(Object.entries(COMMENT_TEXT).map(([id, text]) => [text, id]))

const uidsOf = (panel: SearchPanelSession): readonly number[] =>
  viewOf(panel).rows.map((line) => {
    const name = line.cells[TASK_COLUMNS.indexOf('SQ-1')] ?? ''
    const key = name === NO_NAME_JA ? `${name}@${line.cells[TASK_COLUMNS.indexOf('SQ-3')] ?? ''}` : name
    return found(TASK_KEYS.get(key), `a fixture task for the row ${JSON.stringify(line.cells)}`)
  })

const idsOf = (panel: SearchPanelSession): readonly string[] =>
  viewOf(panel).rows.map((line) =>
    found(COMMENT_KEYS.get(line.cells[0] ?? ''), `a fixture comment box for the row ${JSON.stringify(line.cells)}`),
  )

const labelsOf = (panel: SearchPanelSession): readonly string[] => valuesOf(panel).values.map((one) => one.label)
const iconsOf = (menu: Menu): readonly string[] => menu.entries.map((one) => one.icon)


describe('FR-151 / T-330 / T-331 / T-109 / T-028 -- the clauses this file is driven by', () => {
  it('SV-4, SV-7, SV-8, SV-14 and IN-4 still read this way', () => {
    const say = (id: string): string => cellOf('T-330', id, '定め')
    for (const clause of [SV_4_MATCH, SV_4_NFKC, SV_4_KANA, SV_4_EMPTY, SV_4_NAMELESS]) expect(say('SV-4')).toContain(clause)
    for (const word of [EXAMPLE_FULL_WIDTH, EXAMPLE_HIRAGANA, EXAMPLE_KATAKANA]) expect(SV_4_KANA).toContain(`「${word}」`)
    for (const clause of [
      SV_7_ENTRY,
      SV_7_CONTENTS,
      SV_7_ITEMS,
      SV_7_DATES,
      SV_7_ALL,
      SV_7_ASSIGNEES,
      SV_7_BLANK_DATES,
      SV_7_ONE_OPEN,
    ]) {
      expect(say('SV-7')).toContain(clause)
    }
    for (const clause of [SV_8_ONE, SV_8_STATES, SV_8_TIES, SV_8_DEFAULT]) expect(say('SV-8')).toContain(clause)
    expect(say('SV-3')).toContain(SV_3_ONE)
    expect(say('SV-12')).toContain(SV_12_ONLY_TITLE)
    expect(say('SV-14')).toContain(SV_14_ESC)
    expect(say('SV-14')).toContain(SV_14_REMEMBER)
    expect(cellOf('T-028', 'IN-4', '作法')).toContain(IN_4_ORDER)
    expect(cellOf('T-028', 'IN-4', '作法')).toContain(IN_4_SEARCH)
    expect(REQUIREMENTS).toContain(FR_151_NOT_SEARCHED)
  })

  it('T-331 names the filter each column takes, and T-109 what IC-122..IC-126 do', () => {
    expect(cellOf('T-331', 'SQ-1', '絞り込み')).toBe('値の一覧（空の名前は「（空白）」）')
    expect(cellOf('T-331', 'SQ-2', '絞り込み')).toBe('値の一覧（1 人ずつ）')
    for (const id of ['SQ-3', 'SQ-9']) expect(cellOf('T-331', id, '絞り込み')).toBe('いつから・いつまで')
    expect(cellOf('T-331', 'SQ-4', '絞り込み')).toBe('同上')
    for (const id of ['SQ-5', 'SQ-6', 'SQ-7', 'SQ-8']) expect(cellOf('T-331', id, '絞り込み')).toBe('値の一覧')
    for (const [icon, words] of Object.entries(IC_WORDS)) expect(cellOf('T-109', icon, '何の入口か'), icon).toBe(words)
    expect(BLANK_JA).toBe('（空白）')
    expect(TASK_COLUMNS).toEqual(['SQ-5', 'SQ-11', 'SQ-1', 'SQ-2', 'SQ-3', 'SQ-4', 'SQ-12', 'SQ-13', 'SQ-6'])
    expect(COMMENT_COLUMNS).toEqual(['SQ-7', 'SQ-8', 'SQ-9'])
  })
})


describe('T-330 SV-7 -- IC-122 on every heading opens the filter of that column, one at a time', () => {
  it('SV-7: every column heading of the tasks table carries the IC-122 entrance', () => {
    const columns = viewOf(TASK_PANEL).columns
    expect(columns.map((one) => one.column)).toEqual(TASK_COLUMNS)
    for (const one of columns) expect(one.filterEntry.icon, one.column).toBe('IC-122')
  })

  it('SV-7: every column heading of the comment box table carries the IC-122 entrance', () => {
    const columns = viewOf(COMMENT_PANEL).columns
    expect(columns.map((one) => one.column)).toEqual(COMMENT_COLUMNS)
    for (const one of columns) expect(one.filterEntry.icon, one.column).toBe('IC-122')
  })

  it('SV-7: until IC-122 is pressed no filter is open', () => {
    expect(viewOf(TASK_PANEL).filterMenu).toBeNull()
    expect(viewOf(COMMENT_PANEL).filterMenu).toBeNull()
  })

  it.each([...TASK_COLUMNS])('SV-7: pressing IC-122 on %s opens that column\'s filter', (column) => {
    const panel = opened(column)
    expect(panel.filters.open).toBe(column)
    expect(menuOf(panel).column).toBe(column)
  })

  it.each([...COMMENT_COLUMNS])('SV-7: pressing IC-122 on %s of the comment box table opens that column\'s filter', (column) => {
    const panel = opened(column, COMMENT_PANEL)
    expect(panel.filters.open).toBe(column)
    expect(menuOf(panel).column).toBe(column)
  })

  it('SV-7: only one filter is open at a time -- opening another column\'s filter replaces the first', () => {
    const first = opened('SQ-1')
    const second = opened('SQ-3', first)
    expect(second.filters.open).toBe('SQ-3')
    expect(menuOf(second).column).toBe('SQ-3')
    const third = opened('SQ-2', second)
    expect(third.filters.open).toBe('SQ-2')
    expect(menuOf(third).column).toBe('SQ-2')
  })

  it('SV-3: a column of the table not shown has no heading to press', () => {
    expect(searchPanelWithFilterOpened(JA, TASK_PANEL, 'SQ-7')).toBeNull()
    expect(searchPanelWithFilterOpened(JA, COMMENT_PANEL, 'SQ-1')).toBeNull()
  })

  it('SV-12: a minimised panel shows only its heading row, so no filter opens', () => {
    expect(searchPanelWithFilterOpened(sessionIn('ja', 'searchPanelMinimiseToggled'), TASK_PANEL, 'SQ-1')).toBeNull()
  })

  it('SV-7: a hidden panel opens no filter', () => {
    expect(searchPanelWithFilterOpened(emptyScreenSession, TASK_PANEL, 'SQ-1')).toBeNull()
  })
})


describe('T-330 SV-7 -- the value list of the open filter, and the date bounds instead of it', () => {
  it('SV-7: the name column offers each name once and one blank item labelled with the dictionary word', () => {
    const panel = opened('SQ-1')
    const menu = valuesOf(panel)
    const labels = labelsOf(panel)
    expect(new Set(menu.values.map((one) => one.value)).size).toBe(menu.values.length)
    expect(labels).toEqual(expect.arrayContaining(['PM review', 'Beta', 'Gamma', EXAMPLE_KATAKANA, 'Delta', BLANK_JA]))
    expect(labels, 'the two nameless tasks are one item').toHaveLength(6)
    const blanks = menu.values.filter((one) => one.value === '')
    expect(blanks).toHaveLength(1)
    expect(blanks[0]?.label).toBe(BLANK_JA)
    expect(labels, 'the no-name word of SQ-1 is not the blank item').not.toContain(NO_NAME_JA)
  })

  it.each(['ja', 'en'] as const)('SV-7: %s: the blank item is labelled with the dictionary word for blank', (language) => {
    const session = sessionIn(language)
    const panel = opened('SQ-1', TASK_PANEL, session)
    const blank = found(
      valuesOf(panel, session).values.find((one) => one.value === ''),
      'the blank item',
    )
    expect(blank.label).toBe(panelWordOf('blank', language))
  })

  it('SV-7: the assignee column offers one item per person, never the joined cell, and one blank item', () => {
    const panel = opened('SQ-2')
    const labels = labelsOf(panel)
    expect(labels).toEqual(expect.arrayContaining([ANN, BOB, CID, BLANK_JA]))
    expect(labels).not.toContain(`${ANN}, ${BOB}`)
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels).toHaveLength(4)
  })

  it('SV-7: the state column offers each state word of table T-019a once', () => {
    const labels = labelsOf(opened('SQ-5'))
    for (const row of ['PS-1', 'PS-2', 'PS-3', 'PS-4', 'PS-5']) {
      expect(labels.filter((one) => one === stateWordOf(row, 'ja')), row).toHaveLength(1)
    }
  })

  it('SV-7: the path column offers each path once, written as table T-331 SQ-6 writes it', () => {
    const labels = labelsOf(opened('SQ-6'))
    expect(labels).toEqual(expect.arrayContaining([PROGRAMME, `${PROGRAMME} → ${STEERING}`, REVIEW, ARCHIVE]))
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('SV-7: the comment box columns SQ-7 and SQ-8 offer each value once', () => {
    const bodies = labelsOf(opened('SQ-7', COMMENT_PANEL))
    expect(bodies).toEqual(expect.arrayContaining(['PM note', 'other', 'memo']))
    const rows = labelsOf(opened('SQ-8', COMMENT_PANEL))
    expect(rows).toEqual(expect.arrayContaining([STEERING, REVIEW, ARCHIVE]))
    expect(new Set(rows).size).toBe(rows.length)
  })

  it('SV-7: every item of a fresh filter is ticked (shown)', () => {
    for (const column of ['SQ-1', 'SQ-2', 'SQ-5', 'SQ-6']) {
      for (const item of valuesOf(opened(column)).values) expect(item.isShown, `${column} ${item.label}`).toBe(true)
    }
  })

  it.each(DATE_COLUMNS)('SV-7: the date column %s offers since / until bounds instead of a value list', (column) => {
    const panel = column === 'SQ-9' ? opened(column, COMMENT_PANEL) : opened(column)
    const menu = menuOf(panel)
    expect(menu.kind).toBe('dates')
    if (menu.kind !== 'dates') return
    expect(menu.from).toBeNull()
    expect(menu.to).toBeNull()
  })

  it.each(['SQ-1', 'SQ-2', 'SQ-5', 'SQ-6'])('SV-7: the column %s offers a value list', (column) => {
    expect(menuOf(opened(column)).kind).toBe('values')
  })

  it('SV-7: a value filter holds IC-125, IC-126, IC-123 and IC-124', () => {
    expect(iconsOf(menuOf(opened('SQ-1')))).toEqual(expect.arrayContaining(['IC-125', 'IC-126', 'IC-123', 'IC-124']))
  })

  it('SV-7: a date filter still holds the sort entries IC-123 and IC-124', () => {
    expect(iconsOf(menuOf(opened('SQ-3')))).toEqual(expect.arrayContaining(['IC-123', 'IC-124']))
  })
})


describe('T-330 SV-7 -- check marks and bounds decide which rows stay', () => {
  it('SV-7: with no filter every row is in the table, in the default order', () => {
    expect(uidsOf(TASK_PANEL)).toEqual(DEFAULT_ORDER)
    expect(idsOf(COMMENT_PANEL)).toEqual(COMMENT_DEFAULT)
  })

  it('SV-7: unticking a value clears its mark and hides its rows; ticking it again brings them back', () => {
    const hidden = untick(opened('SQ-1'), 'Beta')
    expect(isShownOf(hidden, 'Beta')).toBe(false)
    expect(isShownOf(hidden, 'Gamma')).toBe(true)
    expect(uidsOf(hidden)).toEqual([1, 3, 5, 6, 4, 7])
    const back = tick(hidden, 'Beta')
    expect(isShownOf(back, 'Beta')).toBe(true)
    expect(uidsOf(back)).toEqual(DEFAULT_ORDER)
  })

  it('SV-7: unticking the blank item hides every row whose cell is empty', () => {
    expect(uidsOf(untick(opened('SQ-1'), BLANK_JA))).toEqual([1, 2, 5, 4, 7])
  })

  it('SV-7: the assignee column keeps a row while at least one of its people is still ticked', () => {
    const noAnn = untick(opened('SQ-2'), ANN)
    expect(uidsOf(noAnn), 'task 1 keeps Bob').toEqual([1, 2, 3, 6, 4, 7])
    const noAnnNoBob = untick(noAnn, BOB)
    expect(uidsOf(noAnnNoBob)).toEqual([2, 3, 6, 7])
    expect(uidsOf(untick(opened('SQ-2'), BLANK_JA)), 'rows with no assignee').toEqual([1, 2, 5, 4])
  })

  it('SV-7: the state column hides the rows of an unticked state word', () => {
    expect(uidsOf(untick(opened('SQ-5'), stateWordOf('PS-1', 'ja')))).toEqual([1, 3, 5, 4])
  })

  it('SV-7: a comment box column filters the comment box table', () => {
    expect(idsOf(untick(opened('SQ-8', COMMENT_PANEL), STEERING))).toEqual(['c-2', 'c-3'])
  })

  it('SV-7: a date filter keeps the rows inside its bounds and drops the rows whose date is empty', () => {
    const both = bound(bound(opened('SQ-3'), 'since', '2026-04-06'), 'until', '2026-04-16')
    expect(uidsOf(both)).toEqual([2, 5, 6])
    expect(uidsOf(bound(opened('SQ-3'), 'since', '2026-04-12')), 'task 7 has no start').toEqual([6, 4])
    expect(uidsOf(bound(opened('SQ-3'), 'until', '2026-04-07')), 'task 7 has no start').toEqual([1, 3])
    expect(uidsOf(bound(opened('SQ-4'), 'since', '2026-04-12')), 'task 7 has no finish').toEqual([6, 4])
  })

  it('SV-7: the open date filter shows the bounds that are set', () => {
    const menu = menuOf(bound(opened('SQ-3'), 'since', '2026-04-06'))
    expect(menu.kind).toBe('dates')
    if (menu.kind !== 'dates') return
    expect(menu.from).not.toBeNull()
    expect(menu.to).toBeNull()
  })

  it('SV-7: clearing both bounds of a date filter brings back every row, the dateless one too', () => {
    const set = bound(bound(opened('SQ-3'), 'since', '2026-04-06'), 'until', '2026-04-16')
    const cleared = bound(bound(set, 'since', null), 'until', null)
    expect(uidsOf(cleared)).toEqual(DEFAULT_ORDER)
  })

  it('SV-7: a comment box date bound drops the comment box with no date', () => {
    expect(idsOf(bound(opened('SQ-9', COMMENT_PANEL), 'since', '2026-04-15'))).toEqual(['c-1'])
    expect(idsOf(bound(opened('SQ-9', COMMENT_PANEL), 'until', '2026-04-15'))).toEqual(['c-2'])
  })

  it('SV-7: filters on two columns and the word must all hold', () => {
    const noBeta = untick(opened('SQ-1'), 'Beta')
    const alsoSince = bound(opened('SQ-3', noBeta), 'since', '2026-04-06')
    expect(uidsOf(alsoSince), 'the SQ-1 filter still holds after another filter opens').toEqual([5, 6, 4])
    expect(uidsOf({ ...alsoSince, word: EXAMPLE_KATAKANA.slice(0, 1) })).toEqual([5])
  })

  it('SV-7: a change for a column whose filter is not the open one is refused', () => {
    const panel = opened('SQ-1')
    expect(searchPanelAfterFilterChange(JA, panel, { kind: 'value', column: 'SQ-2', value: ANN, isShown: false })).toBeNull()
  })
})


describe('T-330 SV-7 / T-109 -- IC-125 shows every value, IC-126 hides every value', () => {
  it('SV-7 IC-125: show all ticks every item and brings every row back', () => {
    const some = untick(untick(opened('SQ-2'), ANN), CID)
    const all = pressed(some, 'IC-125')
    for (const item of valuesOf(all).values) expect(item.isShown, item.label).toBe(true)
    expect(uidsOf(all)).toEqual(DEFAULT_ORDER)
  })

  it('SV-7 IC-126: hide all unticks every item and leaves no row', () => {
    const none = pressed(opened('SQ-2'), 'IC-126')
    for (const item of valuesOf(none).values) expect(item.isShown, item.label).toBe(false)
    expect(uidsOf(none)).toEqual([])
  })

  it('SV-7 IC-126 then one tick: only the rows of that value come back', () => {
    expect(uidsOf(tick(pressed(opened('SQ-2'), 'IC-126'), CID))).toEqual([2])
    expect(uidsOf(tick(pressed(opened('SQ-1'), 'IC-126'), BLANK_JA))).toEqual([3, 6])
  })

  it('SV-7: an entry pressed with no filter open is refused', () => {
    expect(searchPanelAfterFilterEntry(JA, TASK_PANEL, 'IC-125', SCHEDULE)).toBeNull()
    expect(searchPanelAfterFilterEntry(JA, TASK_PANEL, 'IC-123', SCHEDULE)).toBeNull()
  })
})


describe('T-330 SV-8 -- IC-123 / IC-124 sort by one column, blanks last, ties in the default order', () => {
  it('SV-8 IC-123: sorts the table by the open column, ascending; ties keep the default order, a blank date last', () => {
    const panel = pressed(opened('SQ-3'), 'IC-123')
    expect(panel.sort).toEqual({ column: 'SQ-3', direction: 'ascending' })
    expect(uidsOf(panel)).toEqual([1, 3, 2, 5, 6, 4, 7])
  })

  it('SV-8 IC-124: sorts the table by the open column, descending; ties keep the default order, a blank date last', () => {
    const panel = pressed(opened('SQ-3'), 'IC-124')
    expect(panel.sort).toEqual({ column: 'SQ-3', direction: 'descending' })
    expect(uidsOf(panel)).toEqual([4, 6, 2, 5, 3, 1, 7])
  })

  it('SV-8: a name sort puts the nameless rows last in both directions, in the default order', () => {
    expect(uidsOf(pressed(opened('SQ-1'), 'IC-123'))).toEqual([2, 7, 4, 1, 5, 3, 6])
    expect(uidsOf(pressed(opened('SQ-1'), 'IC-124'))).toEqual([5, 1, 4, 7, 2, 3, 6])
  })

  it('SV-8: the state column ascends not started, in progress, finished, resume planned, resume unknown', () => {
    expect(uidsOf(pressed(opened('SQ-5'), 'IC-123'))).toEqual([2, 6, 7, 1, 3, 4, 5])
  })

  it('SV-8: the state column descends in the reverse order, ties still in the default order', () => {
    expect(uidsOf(pressed(opened('SQ-5'), 'IC-124'))).toEqual([5, 4, 3, 1, 2, 6, 7])
  })

  it('SV-8: one sort column -- a new sort replaces the old one, and its ties fall back to the default order', () => {
    const byName = pressed(opened('SQ-1'), 'IC-124')
    const byState = pressed(opened('SQ-5', byName), 'IC-123')
    expect(byState.sort).toEqual({ column: 'SQ-5', direction: 'ascending' })
    expect(uidsOf(byState), 'not started ties are 2, 6, 7 by default, not 7, 2, 6 by the old name sort').toEqual([
      2, 6, 7, 1, 3, 4, 5,
    ])
  })

  it('SV-8: the comment box date sorts either way with the dateless box last', () => {
    expect(idsOf(pressed(opened('SQ-9', COMMENT_PANEL), 'IC-123'))).toEqual(['c-2', 'c-1', 'c-3'])
    expect(idsOf(pressed(opened('SQ-9', COMMENT_PANEL), 'IC-124'))).toEqual(['c-1', 'c-2', 'c-3'])
  })

  it('SV-8: a sort orders the rows the filters left', () => {
    const noBeta = untick(opened('SQ-1'), 'Beta')
    expect(uidsOf(pressed(noBeta, 'IC-124'))).toEqual([5, 1, 4, 7, 3, 6])
  })
})


describe('T-330 SV-4 -- the word matches a part of the name, an assignee or the body', () => {
  const withWord = (word: string, panel: SearchPanelSession = TASK_PANEL): SearchPanelSession => ({ ...panel, word })

  it('SV-4: an empty word keeps every row', () => {
    expect(uidsOf(withWord(''))).toEqual(DEFAULT_ORDER)
    expect(idsOf(withWord('', COMMENT_PANEL))).toEqual(COMMENT_DEFAULT)
  })

  it('SV-4: a part of the name matches, full-width and case folded (the spec example: pm hits PM)', () => {
    expect(uidsOf(withWord(EXAMPLE_FULL_WIDTH))).toEqual([1])
    expect(uidsOf(withWord('REVIEW'))).toEqual([1])
  })

  it('SV-4: hiragana does not match katakana (the spec example)', () => {
    expect(uidsOf(withWord(EXAMPLE_HIRAGANA))).toEqual([])
    expect(uidsOf(withWord(EXAMPLE_KATAKANA.slice(1, 3)))).toEqual([5])
  })

  it('SV-4: any one assignee name matches, case folded', () => {
    expect(uidsOf(withWord('ann'))).toEqual([1, 5])
    expect(uidsOf(withWord('BO'))).toEqual([1, 4])
  })

  it('SV-4: a nameless task is never matched on its name side', () => {
    expect(uidsOf(withWord(NO_NAME_JA))).toEqual([])
    expect(uidsOf(withWord(NO_NAME_JA.slice(1, 3)))).toEqual([])
  })

  it('FR-151: a row name and Task.notes are not searched', () => {
    expect(uidsOf(withWord(PROGRAMME))).toEqual([])
    expect(uidsOf(withWord(HIDDEN_NOTE))).toEqual([])
  })

  it('SV-4: the comment box table matches a part of the body', () => {
    expect(idsOf(withWord('OT', COMMENT_PANEL))).toEqual(['c-1', 'c-2'])
    expect(idsOf(withWord('memo', COMMENT_PANEL))).toEqual(['c-3'])
  })
})


describe('T-330 SV-14 / T-028 IN-4 -- Esc closes the open filter first, then the panel', () => {
  const context = (over: Partial<Record<string, boolean>>): EscapeContext =>
    ({
      isTextEntryUnsettled: false,
      isSurfaceOpen: false,
      gestureInFlight: false,
      isArmed: false,
      dualCursorMode: false,
      isSearchPanelStanding: false,
      ...over,
    }) as unknown as EscapeContext

  it('IN-4: a shown panel stands on the open-window rung, with or without the focus in it', () => {
    expect(escapeTarget(context({ isSearchPanelStanding: true }))).toBe('searchPanel')
    expect(escapeTarget({ ...context({ isSearchPanelStanding: true }), focusedWindow: 'searchPanel' })).toBe('searchPanel')
  })

  it('IN-4: the window step comes after an unsettled edit, an open surface and a drag, before an arm and Dual Cursor', () => {
    const below = context({ isSearchPanelStanding: true, isArmed: true, dualCursorMode: true })
    expect(escapeTarget(below)).toBe('searchPanel')
    expect(escapeTarget(context({ isSearchPanelStanding: true, isTextEntryUnsettled: true }))).toBe('textEntry')
    expect(escapeTarget(context({ isSearchPanelStanding: true, isSurfaceOpen: true }))).toBe('surface')
    expect(escapeTarget(context({ isSearchPanelStanding: true, gestureInFlight: true }))).toBe('gesture')
  })

  it('IN-4: with no panel standing, Esc does not go to the search panel step', () => {
    expect(escapeTarget(context({ isSurfaceOpen: true }))).not.toBe('searchPanel')
  })

  it('SV-14: the first Esc closes only the open filter; the panel stays and the filter itself still holds', () => {
    const filtering = untick(opened('SQ-1'), 'Beta')
    const closed = found(searchPanelWithFilterClosed(JA, filtering), 'the panel after the first Esc')
    expect(closed.filters.open).toBeNull()
    const view = viewOf(closed)
    expect(view.filterMenu).toBeNull()
    expect(uidsOf(closed), 'the SQ-1 filter is remembered (SV-14)').toEqual([1, 3, 5, 6, 4, 7])
  })

  it('SV-14: the second Esc finds no filter open, so it closes the panel', () => {
    const closed = found(searchPanelWithFilterClosed(JA, opened('SQ-1')), 'the panel after the first Esc')
    expect(searchPanelWithFilterClosed(JA, closed)).toBeNull()
    const after = advanceScreenSession(JA, { type: 'escapePressed', rung: 'searchPanel' } as unknown as SessionEvent).state
    expect(searchPanelFromSession(after, closed, SCHEDULE, CANVAS)).toBeNull()
  })

  it('SV-14: with no filter open, the first Esc already closes the panel', () => {
    expect(searchPanelWithFilterClosed(JA, TASK_PANEL)).toBeNull()
  })
})


// WHY: the painter (searchPanelPainter) does not run on tests/fixtures/fake-browser.ts, so the drawing is read
// through searchPanelElement, as cr-571-search-panel-view.test.ts does; the change events are not driven here.
function drawn(panel: SearchPanelSession): FakeElement {
  const built = stage()
  const view = viewOf(panel)
  const box = searchPanelBoxOf(view, { width: 0.5, height: 0.5 })
  return searchPanelElement(built.host, view, { box, fontPx: 16 }, new Map<string, HTMLElement>()) as unknown as FakeElement
}

describe('T-330 SV-7 -- the drawn entrance, host check boxes and host date inputs', () => {
  it('SV-7: each drawn heading holds its IC-122 entrance', () => {
    const root = drawn(TASK_PANEL)
    for (const column of TASK_COLUMNS) {
      const heading = found(
        selfAndDescendants(root).find((one) => one.tagName === 'TH' && one.getAttribute('data-column') === column),
        `a drawn heading for ${column}`,
      )
      const entry = selfAndDescendants(heading).find(
        (one) => one.getAttribute('data-icon') === 'IC-122' && one.getAttribute('data-search-filter-column') === column,
      )
      expect(entry, column).toBeDefined()
    }
  })

  it('SV-7: the open value filter is drawn with one host check box per item, ticked as the item is shown', () => {
    const panel = untick(opened('SQ-2'), ANN)
    const filter = found(
      selfAndDescendants(drawn(panel)).find(
        (one) => one.tagName === 'DIV' && one.getAttribute('data-search-filter-column') === 'SQ-2',
      ),
      'the drawn filter of SQ-2',
    )
    const boxes = selfAndDescendants(filter).filter(
      (one) => one.tagName === 'INPUT' && one.getAttribute('type') === 'checkbox',
    )
    const items = valuesOf(panel).values
    expect(boxes.map((one) => one.getAttribute('data-search-filter-value')).sort()).toEqual(
      items.map((one) => one.value).sort(),
    )
    for (const item of items) {
      const box = found(
        boxes.find((one) => one.getAttribute('data-search-filter-value') === item.value),
        `the check box of ${item.label}`,
      )
      expect(Boolean((box as unknown as { checked?: boolean }).checked), item.label).toBe(item.isShown)
    }
  })

  it('SV-7: the open date filter is drawn with a host date input for since and one for until', () => {
    const filter = found(
      selfAndDescendants(drawn(opened('SQ-3'))).find(
        (one) => one.tagName === 'DIV' && one.getAttribute('data-search-filter-column') === 'SQ-3',
      ),
      'the drawn filter of SQ-3',
    )
    const bounds = selfAndDescendants(filter)
      .filter((one) => one.tagName === 'INPUT' && one.getAttribute('type') === 'date')
      .map((one) => one.getAttribute('data-search-filter-bound'))
    expect([...bounds].sort()).toEqual(['since', 'until'])
  })
})
