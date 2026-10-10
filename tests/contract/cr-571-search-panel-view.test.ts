// Contract test: FR-151 tables T-330, T-331 and T-333 against the Search Panel view and its drawing.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage, SearchPanelView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  nextSearchPanelTextSizeStep,
  searchPanelFromSession,
} from '../../src/adapter/screen-renderer/search-panel'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  focusSearchWordIn,
  searchPanelBoxOf,
  searchPanelElement,
  searchPanelFontPxOf,
} from '../../src/framework/dom-screen-surface/search-panel-drawing'
import {
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  type ScreenSession,
  type SearchPanelSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  selfAndDescendants,
  stage,
  styleMap,
  type FakeElement,
  type FakeNode,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken, type SpecRow } from './spec-table'

function rowOf(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(table, id).by[heading] ?? '')

const SV_1_ORDER =
  '左から、面の名（`FR-038` の辞書）・タスクの表の入口 `IC-118`・コメントボックスの表の入口 `IC-119`・列のフィルタと並べ替えを戻す入口 `IC-153`・スケジュールフィルタの入口 `IC-143`（表 T-353 —— タスクの表を出しているときだけ置き、スケジュールフィルタを掛けているあいだは押された状態を 表 T-237 の `EN-5` で示す）。'
const SV_1_RIGHT =
  '右端に、左から `IC-127`（字の大きさ）・`IC-129`（最小化）・`IC-130`（最大化 —— 最大化しているあいだは同じ場所に `IC-131`）・`IC-52`（閉じる）。'
const SV_1_TITLE_FONT = '見出しの行の面の名の字は `SV-16` の段に従う —— 入口の図形は段に従わない。'
const SV_1_GRAB = '見出しの行は掴んで動かす帯である（表 T-023d の `GR-24`）'
const SV_2_FIELD = '見出しの行の下に 1 行。'
const SV_2_REFOCUS = '`SK-24` を押したとき、パネルが出ていれば焦点をここへ戻し、打ってある語をすべて選ぶこと（MUST）'
const SV_3_ONE = '表は一度に 1 つだけ出す。'
const SV_3_DEFAULT = '既定はタスクの表。'
const SV_3_CHOSEN = '出している表の入口は 表 T-237 の `EN-6`（排他の選択のうち選ばれているもの）で示す'
const SV_6_FIXED = '横は、タスクの表は `SQ-1` まで（表 T-331 の並びで 表示・ステータス・進捗・タスク の 4 列）、コメントボックスの表は `SQ-7` までを左に固定し'
const SV_9_SIZE =
  '幅は `Schedule Canvas`（`U-32`）の幅に `_assets/tbl-settings.md` の 表 T-206 の `S-421` を、高さはその高さに `S-422` を掛けた大きさ。'
const SV_9_CORNER = '左下の角を `Schedule Canvas` の左下に合わせる。'
const SV_12_ONLY_TITLE = '`FR-036` の 表 T-335 の `WB-2`・`WB-5`（入口は `IC-129`）'
const SV_12_BOTTOM = '題の行を中身の幅に縮め、最小化する前の箱の下の縁に、右の端をそろえて置く（元の箱の右下の角）'
const SV_13_FILL = '範囲は `Schedule Canvas` いっぱい。'
const SV_13_LABEL = '最大化の入口は、`WB-3` のあいだだけ `IC-131` に替えて同じ場所に描く（`IC-67`・`IC-68` と同じ組み）'
const SV_16_PX = '表・入力欄・見出しの行の面の名の字は、`S-429` が選ぶ `_assets/tbl-settings.md` の 表 T-333 の段の px。'
const SV_16_CYCLE =
  '`IC-127` を押すたびに表 T-333 の並びの次の段へ移り、末尾の段の次は先頭の段へ戻る（`IC-99` と同じ巡り方）。'
const SV_16_RULE = '罫線は表 T-257 の `RR-5` と同じく、すべての欄のあいだに画面の 1px で引く。'
const SV_17_ELLIPSIS = 'セルの字は折り返さず、入らない分を省略記号で切る。'
const IC_127_CYCLE = '押すたびに `tbl-settings.md` の 表 T-333 の並びの次の段へ移り、末尾の次は先頭へ戻る'
const T_333_ORDER = '⭐ 段の並びは本表の上からの順であり、`IC-127` はこの順に巡る。'
const S_442_DEFAULT = '出していない'

const SETTINGS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-settings.md'), 'utf8'))

type Words = Record<DisplayLanguage, string>
const WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as {
  readonly surfaces: readonly { readonly name: string; readonly heading: Words }[]
  readonly icons: readonly { readonly rowId: string; readonly label: Words }[]
  readonly searchColumns: readonly { readonly rowId: string; readonly text: Words }[]
  readonly searchPanel: readonly { readonly part: string; readonly text: Words }[]
  readonly planActualStates: readonly { readonly rowId: string; readonly text: Words }[]
}

function found<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`the dictionary has no ${what}`)
  return value
}

const panelNameOf = (language: DisplayLanguage): string =>
  found(WORDS.surfaces.find((one) => one.name === 'Search Panel'), 'Search Panel heading').heading[language]
const iconLabelOf = (icon: string, language: DisplayLanguage): string =>
  found(WORDS.icons.find((one) => one.rowId === icon), `label for ${icon}`).label[language]
const columnWordOf = (column: string, language: DisplayLanguage): string =>
  found(WORDS.searchColumns.find((one) => one.rowId === column), `heading for ${column}`).text[language]
const panelWordOf = (part: string, language: DisplayLanguage): string =>
  found(WORDS.searchPanel.find((one) => one.part === part), `search panel word ${part}`).text[language]

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

// see T-331
const TASK_COLUMNS = specTable('T-331').rows.filter((row) => row.by['表'] === 'タスク').map((row) => row.id)
const COMMENT_COLUMNS = specTable('T-331')
  .rows.filter((row) => row.by['表'] === 'コメントボックス')
  .map((row) => row.id)

// see T-333
const T_333 = specTable('T-333').rows.map((row) => ({ id: row.id, px: Number(bare(row.by['値'] ?? '')) }))
const T_333_SIZES: Readonly<Record<string, number>> = Object.fromEntries(T_333.map((row) => [row.id, row.px]))

// see T-206, T-333
const S_429_ROW = bare(rowOf('T-206', 'S-429').by['既定'] ?? '')
const S_429_STEP = T_333.findIndex((row) => row.id === S_429_ROW)

// see T-206
const ratioOf = (id: string): number => Number.parseFloat(rowOf('T-206', id).by['既定'] ?? '')
const DEFAULT_RATIO = { width: ratioOf('S-421'), height: ratioOf('S-422') }

type Loose = Record<string, unknown>
const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Loose }
const firstOf = (key: string): Loose => ((TEMPLATE.schedule[key] as readonly Loose[])[0] ?? {}) as Loose

const TOP = 'task-group-top'
const INNER = 'task-group-inner'
const TOP_NAME = 'Program'
const INNER_NAME = 'Steering'
const NAMED_UID = 101
const NAMELESS_UID = 102
const NAMED = 'PM review'
const FIRST_ASSIGNEE = 'Aki Yamashita'
const SECOND_ASSIGNEE = 'Naoko Ito'
const COMMENT_LINES = ['first line', 'second line'] as const

const task = (uid: number, name: string, start: string, finish: string): Loose => ({
  ...firstOf('tasks'),
  uid,
  parentTaskUid: null,
  wbsOrder: uid,
  name,
  start,
  finish,
  milestone: false,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  dependencies: [],
})

const row = (id: string, parentId: string | null, label: string): Loose => ({
  ...firstOf('taskGroups'),
  id,
  parentId,
  order: 0,
  label,
  derivedFromTaskUid: null,
  treeState: 'expanded',
})

const SCHEDULE = {
  ...TEMPLATE.schedule,
  tasks: [
    task(NAMED_UID, NAMED, '2026-01-01T00:00:00', '2026-01-09T00:00:00'),
    task(NAMELESS_UID, '', '2026-02-01T00:00:00', '2026-02-03T00:00:00'),
  ],
  taskGroups: [row(TOP, null, TOP_NAME), row(INNER, TOP, INNER_NAME)],
  taskGroupMembers: [
    { taskUid: NAMED_UID, groupId: INNER },
    { taskUid: NAMELESS_UID, groupId: TOP },
  ],
  resources: [
    { ...firstOf('resources'), uid: 301, name: FIRST_ASSIGNEE },
    { ...firstOf('resources'), uid: 302, name: SECOND_ASSIGNEE },
  ],
  assignments: [
    { ...firstOf('assignments'), uid: 401, taskUid: NAMED_UID, resourceUid: 301 },
    { ...firstOf('assignments'), uid: 402, taskUid: NAMED_UID, resourceUid: 302 },
  ],
  commentBoxes: [
    {
      id: 'c-1',
      leaderShapeKind: null,
      text: COMMENT_LINES.join('\n'),
      anchorDate: '2026-05-02T00:00:00',
      anchorGroupId: INNER,
      bodyOffsetPx: null,
      strokeColor: null,
      strokeWidthPx: null,
      fillColor: null,
      fillTransparencyPercent: null,
      textColor: null,
    },
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

function viewOf(session: ScreenSession, panel: Partial<SearchPanelSession> = {}): SearchPanelView {
  const view = searchPanelFromSession(session, { ...emptySearchPanelSession, ...panel }, SCHEDULE, CANVAS)
  if (view === null) throw new Error('premise: a shown panel has a view')
  return view
}

// WHY: the seam names no member for the entries, so every object with an icon is collected.
function entriesOf(value: unknown): readonly { readonly icon: string; readonly [key: string]: unknown }[] {
  if (value === null || typeof value !== 'object') return []
  const own =
    typeof (value as { icon?: unknown }).icon === 'string'
      ? [value as { readonly icon: string; readonly [key: string]: unknown }]
      : []
  return [...own, ...Object.values(value).flatMap(entriesOf)]
}

const entryOf = (view: SearchPanelView, icon: string): { readonly [key: string]: unknown } =>
  found(
    entriesOf(view).find((one) => one.icon === icon),
    `entry ${icon} in the view`,
  )

interface Drawn {
  readonly built: Stage
  readonly panel: FakeElement
}

function drawn(view: SearchPanelView, fontPx = T_333[S_429_STEP]?.px ?? Number.NaN): Drawn {
  const built = stage()
  const box = searchPanelBoxOf(view, DEFAULT_RATIO)
  const panel = searchPanelElement(
    built.host,
    view,
    { box, fontPx },
    new Map<string, HTMLElement>(),
  ) as unknown as FakeElement
  return { built, panel }
}

const byTag = (root: FakeElement, tag: string): FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.tagName === tag)

const textOf = (node: FakeElement): string => node.textContent.trim()

const namesOf = (node: FakeElement): readonly string[] => [textOf(node), ...node.attributes.values()]

function nodesInOrder(root: FakeElement): readonly FakeNode[] {
  const out: FakeNode[] = [root]
  for (const child of root.childNodes) {
    if ('tagName' in child) out.push(...nodesInOrder(child))
    else out.push(child)
  }
  return out
}

// WHY: a browser gives a field its own font size unless told to inherit, so a field
// that declares none does not take its parent's.
function fontSizeOf(node: FakeElement): string {
  const style = styleMap(node)
  const declared = style.get('font-size') ?? (/\b(\d+(?:\.\d+)?px)\b/.exec(style.get('font') ?? '')?.[1] ?? null)
  const inherits = declared === 'inherit' || style.get('font') === 'inherit'
  if (declared !== null && !inherits) return declared
  if (!inherits && node.tagName === 'INPUT') return '(the browser default for a field)'
  return node.parentNode === null ? '(none declared)' : fontSizeOf(node.parentNode)
}

function titleRowOf(panel: FakeElement): FakeElement {
  // WHY: the nearest element holding both ends of the SV-1 row is the row itself.
  const first = found(
    selfAndDescendants(panel).find((one) => one.getAttribute('data-icon') === 'IC-118'),
    'drawn IC-118',
  )
  const last = found(
    selfAndDescendants(panel).find((one) => one.getAttribute('data-icon') === 'IC-52'),
    'drawn IC-52',
  )
  let at: FakeElement | null = first.parentNode
  while (at !== null && !at.contains(last)) at = at.parentNode
  return found(at ?? undefined, 'an element holding the whole heading row')
}

const wordFieldOf = (panel: FakeElement): FakeElement =>
  found(
    byTag(panel, 'INPUT').find((one) => (one.getAttribute('type') ?? 'text') !== 'checkbox'),
    'drawn input field',
  )

describe('FR-151 tables T-330 / T-331 / T-333 -- the clauses these cases are driven by', () => {
  it('SV-1, SV-2, SV-3, SV-6, SV-9, SV-12, SV-13, SV-16 and SV-17 still read this way', () => {
    const say = (id: string): string => cellOf('T-330', id, '定め')
    expect(say('SV-1')).toContain(SV_1_ORDER)
    expect(say('SV-1')).toContain(SV_1_RIGHT)
    expect(say('SV-1')).toContain(SV_1_TITLE_FONT)
    expect(say('SV-1')).toContain(SV_1_GRAB)
    expect(say('SV-2')).toContain(SV_2_FIELD)
    expect(say('SV-2')).toContain(SV_2_REFOCUS)
    for (const clause of [SV_3_ONE, SV_3_DEFAULT, SV_3_CHOSEN]) expect(say('SV-3')).toContain(clause)
    expect(say('SV-6')).toContain(SV_6_FIXED)
    expect(say('SV-9')).toContain(SV_9_SIZE)
    expect(say('SV-9')).toContain(SV_9_CORNER)
    expect(say('SV-12')).toContain(SV_12_ONLY_TITLE)
    expect(cellOf('T-335', 'WB-2', '置き場と大きさ')).toContain(SV_12_BOTTOM)
    expect(say('SV-13')).toContain(SV_13_FILL)
    expect(cellOf('T-335', 'WB-4', '描くもの')).toContain(SV_13_LABEL)
    for (const clause of [SV_16_PX, SV_16_CYCLE, SV_16_RULE]) expect(say('SV-16')).toContain(clause)
    expect(say('SV-17')).toContain(SV_17_ELLIPSIS)
  })

  it('IC-127 cycles table T-333 in its own order, and S-442 starts the panel hidden', () => {
    expect(cellOf('T-109', 'IC-127', '何の入口か')).toContain(IC_127_CYCLE)
    expect(SETTINGS).toContain(T_333_ORDER)
    expect(cellOf('T-206', 'S-442', '既定')).toBe(S_442_DEFAULT)
  })

  it('table T-333 holds ascending steps and S-429 names one of them', () => {
    expect(T_333.map((one) => one.px)).toEqual([...T_333.map((one) => one.px)].sort((a, b) => a - b))
    expect(T_333.every((one) => Number.isFinite(one.px))).toBe(true)
    expect(S_429_STEP).toBeGreaterThanOrEqual(0)
  })

  it('table T-331 writes each column heading as the dictionary word FR-038 holds for it', () => {
    for (const column of [...TASK_COLUMNS, ...COMMENT_COLUMNS]) {
      expect(bare(rowOf('T-331', column).by['列の見出し（辞書）'] ?? ''), column).toBe(columnWordOf(column, 'ja'))
    }
  })
})

describe(`S-442 -- the panel starts ${S_442_DEFAULT}`, () => {
  it('a session that never pressed SK-24 / IC-117 has no panel to draw', () => {
    expect(searchPanelFromSession(emptyScreenSession, emptySearchPanelSession, SCHEDULE, CANVAS)).toBeNull()
  })

  it('after searchEntryPressed it has one', () => {
    expect(searchPanelFromSession(sessionIn('ja'), emptySearchPanelSession, SCHEDULE, CANVAS)).not.toBeNull()
  })
})

describe(`T-330 SV-3 -- ${SV_3_DEFAULT} ${SV_3_CHOSEN}`, () => {
  it('the tasks table is the one shown by default, and its entry IC-118 is the chosen one', () => {
    expect(emptySearchPanelSession.table).toBe('tasks')
    const view = viewOf(sessionIn('ja'))
    expect(entryOf(view, 'IC-118')['isChosen']).toBe(true)
    expect(entryOf(view, 'IC-119')['isChosen']).toBe(false)
  })

  it('showing the comment box table moves the choice to IC-119', () => {
    const view = viewOf(sessionIn('ja'), { table: 'commentBoxes' })
    expect(entryOf(view, 'IC-119')['isChosen']).toBe(true)
    expect(entryOf(view, 'IC-118')['isChosen']).toBe(false)
  })
})

describe(`T-335 WB-4 -- ${SV_13_LABEL}`, () => {
  it.each(LANGUAGES)('%s: IC-131 stands where IC-130 stood while maximised, and IC-130 otherwise', (language) => {
    const icons = (view: SearchPanelView): readonly string[] => view.titleEntries.map((one) => one.icon)
    expect(icons(viewOf(sessionIn(language, 'searchPanelMaximiseToggled')))).toEqual(['IC-127', 'IC-129', 'IC-131', 'IC-52'])
    expect(icons(viewOf(sessionIn(language)))).toEqual(['IC-127', 'IC-129', 'IC-130', 'IC-52'])
  })
})

describe(`T-330 SV-16 -- ${SV_16_CYCLE}`, () => {
  it('S-429: a fresh panel stands on the step table T-206 names', () => {
    expect(emptySearchPanelSession.textSizeStep).toBe(S_429_STEP)
    expect(searchPanelFontPxOf(emptySearchPanelSession.textSizeStep, T_333_SIZES)).toBe(T_333[S_429_STEP]?.px)
  })

  it('IC-127 goes to the next row of table T-333, and after the last comes the first', () => {
    for (let at = 0; at < T_333.length; at += 1) {
      expect(nextSearchPanelTextSizeStep(at), `after ${T_333[at]?.id}`).toBe((at + 1) % T_333.length)
    }
  })

  it('pressing IC-127 from the default walks every px of table T-333 once and comes back', () => {
    const walked: number[] = []
    let at = emptySearchPanelSession.textSizeStep
    for (let press = 0; press < T_333.length; press += 1) {
      at = nextSearchPanelTextSizeStep(at)
      walked.push(searchPanelFontPxOf(at, T_333_SIZES))
    }
    expect(at).toBe(S_429_STEP)
    expect([...walked].sort((a, b) => a - b)).toEqual(T_333.map((one) => one.px))
  })
})

describe(`T-330 SV-9 -- ${SV_9_SIZE} ${SV_9_CORNER}`, () => {
  it('a panel never moved nor resized takes the S-421 / S-422 share of the Schedule Canvas, at its lower left', () => {
    const box = searchPanelBoxOf(viewOf(sessionIn('ja')), DEFAULT_RATIO)
    expect(box.width).toBeCloseTo(CANVAS.width * DEFAULT_RATIO.width)
    expect(box.height).toBeCloseTo(CANVAS.height * DEFAULT_RATIO.height)
    expect(box.x).toBeCloseTo(CANVAS.x)
    expect(box.y + box.height).toBeCloseTo(CANVAS.y + CANVAS.height)
  })

  it(`SV-13: ${SV_13_FILL}`, () => {
    const box = searchPanelBoxOf(viewOf(sessionIn('ja', 'searchPanelMaximiseToggled')), DEFAULT_RATIO)
    expect(box).toEqual(CANVAS)
  })

  it(`SV-12: ${SV_12_BOTTOM}`, () => {
    const normal = searchPanelBoxOf(viewOf(sessionIn('ja')), DEFAULT_RATIO)
    const minimised = searchPanelBoxOf(viewOf(sessionIn('ja', 'searchPanelMinimiseToggled')), DEFAULT_RATIO)
    expect(minimised.y + minimised.height).toBeCloseTo(normal.y + normal.height)
    expect(minimised.height).toBeLessThan(normal.height)
  })
})

describe(`T-330 SV-1 -- ${SV_1_ORDER}`, () => {
  it.each(LANGUAGES)('%s: the name, then IC-118, IC-119, IC-153 and IC-143, then IC-127, IC-129, IC-130 and IC-52', (language) => {
    const { panel } = drawn(viewOf(sessionIn(language)))
    const title = titleRowOf(panel)
    const order = nodesInOrder(title)
    const icons = order.flatMap((node) => {
      const icon = 'tagName' in node ? node.getAttribute('data-icon') : null
      return icon === null ? [] : [icon]
    })
    expect(icons).toEqual(['IC-118', 'IC-119', 'IC-153', 'IC-143', 'IC-127', 'IC-129', 'IC-130', 'IC-52'])
    const nameAt = order.findIndex((node) => !('tagName' in node) && node.data.trim() === panelNameOf(language))
    const firstEntryAt = order.findIndex((node) => 'tagName' in node && node.getAttribute('data-icon') === 'IC-118')
    expect(nameAt, `the panel name ${panelNameOf(language)} is drawn in the heading row`).toBeGreaterThanOrEqual(0)
    expect(nameAt).toBeLessThan(firstEntryAt)
  })

  it.each(LANGUAGES)('%s: every entry of the heading row is called by its dictionary word', (language) => {
    const { panel } = drawn(viewOf(sessionIn(language)))
    for (const icon of ['IC-118', 'IC-119', 'IC-127', 'IC-129', 'IC-130', 'IC-52']) {
      const entry = found(
        selfAndDescendants(panel).find((one) => one.getAttribute('data-icon') === icon),
        `drawn ${icon}`,
      )
      expect(namesOf(entry), icon).toContain(iconLabelOf(icon, language))
    }
  })

  it(`CR-648 SV-1: ${SV_1_TITLE_FONT} -- the surface name, the table and the field all follow the step`, () => {
    const view = viewOf(sessionIn('ja'))
    const headingOf = (panel: FakeElement): FakeElement =>
      found(
        selfAndDescendants(titleRowOf(panel)).find((one) => one.tagName === 'SPAN' && textOf(one) === view.heading),
        'drawn surface name',
      )
    for (const step of T_333) {
      const { panel } = drawn(view, step.px)
      expect(fontSizeOf(headingOf(panel)), step.id).toBe(`${step.px}px`)
      expect(fontSizeOf(wordFieldOf(panel)), step.id).toBe(`${step.px}px`)
    }
  })
})

describe(`T-330 SV-2 -- ${SV_2_FIELD} / SV-16 -- ${SV_16_PX}`, () => {
  it.each(T_333.map((one) => [one.id, one.px] as const))(
    '%s: the field and every cell of the table are drawn at %i px, as screen px',
    (_id, px) => {
      const { panel } = drawn(viewOf(sessionIn('ja'), { word: '' }), px)
      expect(fontSizeOf(wordFieldOf(panel))).toBe(`${px}px`)
      const cells = [...byTag(panel, 'TH'), ...byTag(panel, 'TD')]
      expect(cells.length).toBeGreaterThan(0)
      for (const cell of cells) expect(fontSizeOf(cell), textOf(cell)).toBe(`${px}px`)
    },
  )

  it('the field holds the word typed so far, and sits below the heading row', () => {
    const { panel } = drawn(viewOf(sessionIn('ja'), { word: 'pm' }))
    const field = wordFieldOf(panel)
    expect(field.value).toBe('pm')
    const order = selfAndDescendants(panel)
    expect(order.indexOf(field)).toBeGreaterThan(order.indexOf(titleRowOf(panel)))
    expect(titleRowOf(panel).contains(field)).toBe(false)
  })
})

describe(`T-330 SV-2 -- ${SV_2_REFOCUS}`, () => {
  it('focusSearchWordIn puts the focus on the field and selects every character of the word', () => {
    const { built, panel } = drawn(viewOf(sessionIn('ja'), { word: 'pm' }))
    const field = wordFieldOf(panel)
    let selections = 0
    Object.assign(field, {
      select: (): void => {
        selections += 1
      },
    })
    focusSearchWordIn(panel as unknown as HTMLElement)
    expect(built.world.activeElement).toBe(field)
    expect(selections).toBe(1)
  })
})

describe(`T-330 SV-3 -- ${SV_3_ONE} / table T-331 -- the column headings`, () => {
  it.each(LANGUAGES)('%s: the tasks table shows SQ-1..SQ-6 in order, headed by the dictionary words', (language) => {
    const { panel } = drawn(viewOf(sessionIn(language)))
    // WHY: SQ-10's heading cell is its box and IC-122; at the S-496 width SV-18 cuts the word first, so it rides as the title.
    const cells = byTag(panel, 'TH')
    expect(cells.map(textOf)).toEqual(TASK_COLUMNS.map((column) => (column === 'SQ-10' ? '' : columnWordOf(column, language))))
    const show = cells[TASK_COLUMNS.indexOf('SQ-10')]
    expect(show?.getAttribute('title')).toBe(columnWordOf('SQ-10', language))
    expect(byTag(show as FakeElement, 'INPUT').map((one) => one.getAttribute('type'))).toEqual(['checkbox'])
  })

  it.each(LANGUAGES)('%s: the comment box table shows SQ-7..SQ-9 only', (language) => {
    const { panel } = drawn(viewOf(sessionIn(language), { table: 'commentBoxes' }))
    expect(byTag(panel, 'TH').map(textOf)).toEqual(COMMENT_COLUMNS.map((column) => columnWordOf(column, language)))
  })
})

describe('table T-331 -- the way each column writes its value (書き方)', () => {
  const taskCells = (language: DisplayLanguage, uid: number): readonly string[] => {
    const { panel } = drawn(viewOf(sessionIn(language)))
    const rows = byTag(panel, 'TR').filter((one) => byTag(one, 'TD').length > 0)
    const want = uid === NAMED_UID ? NAMED : panelWordOf('noName', language)
    const nameAt = TASK_COLUMNS.indexOf('SQ-1')
    const hit = found(
      rows.find((one) => textOf(byTag(one, 'TD')[nameAt] as FakeElement) === want),
      `a drawn row for task ${uid}`,
    )
    const cells = byTag(hit, 'TD').map(textOf)
    return ['SQ-1', 'SQ-2', 'SQ-3', 'SQ-4', 'SQ-5', 'SQ-6'].map((column) => cells[TASK_COLUMNS.indexOf(column)] ?? '')
  }

  it('SQ-1 writes the name as it is', () => {
    expect(taskCells('ja', NAMED_UID)[0]).toBe(NAMED)
  })

  it.each(LANGUAGES)('%s: SQ-1 writes 「（名前なし）」 (the dictionary word) for a nameless task', (language) => {
    expect(taskCells(language, NAMELESS_UID)[0]).toBe(panelWordOf('noName', language))
  })

  it('SQ-2 joins the assignees with 「, 」 in the order of the assignments', () => {
    expect(taskCells('ja', NAMED_UID)[1]).toBe(`${FIRST_ASSIGNEE}, ${SECOND_ASSIGNEE}`)
  })

  it('SQ-3 and SQ-4 write the date as yyyy/mm/dd (例: 2026/01/01)', () => {
    const cells = taskCells('ja', NAMED_UID)
    expect(cells[2]).toBe('2026/01/01')
    expect(cells[3]).toBe('2026/01/09')
  })

  it.each(LANGUAGES)('%s: SQ-5 writes one of the state words of table T-019a', (language) => {
    const words = WORDS.planActualStates.map((one) => one.text[language])
    expect(words).toContain(taskCells(language, NAMED_UID)[4])
  })

  it('SQ-6 writes the task groups from the top down, joined with 「 → 」', () => {
    expect(taskCells('ja', NAMED_UID)[5]).toBe(`${TOP_NAME} → ${INNER_NAME}`)
  })

  it('SQ-7 turns each line break into one space; SQ-8 is the task group name; SQ-9 the date with its year', () => {
    const { panel } = drawn(viewOf(sessionIn('ja'), { table: 'commentBoxes' }))
    const rows = byTag(panel, 'TR').filter((one) => byTag(one, 'TD').length > 0)
    expect(rows).toHaveLength(1)
    expect(byTag(rows[0] as FakeElement, 'TD').map(textOf)).toEqual([COMMENT_LINES.join(' '), INNER_NAME, '2026/05/02'])
  })
})

describe(`T-330 SV-6 -- ${SV_6_FIXED}`, () => {
  const stuckLeft = (cell: FakeElement): boolean => {
    const style = styleMap(cell)
    return style.get('position') === 'sticky' && (style.get('left') ?? '') !== ''
  }

  const stuckInEveryTaskGroup = (panel: FakeElement): readonly (readonly boolean[])[] =>
    byTag(panel, 'TR').map((line) => [...byTag(line, 'TH'), ...byTag(line, 'TD')].map(stuckLeft))

  it('the tasks table holds the columns up to SQ-1 (SQ-5, SQ-11, SQ-1) at the left, and no other column, in every row', () => {
    const { panel } = drawn(viewOf(sessionIn('ja')))
    const rows = stuckInEveryTaskGroup(panel)
    expect(rows.length).toBeGreaterThan(1)
    for (const line of rows) expect(line).toEqual(TASK_COLUMNS.map((_column, at) => at <= TASK_COLUMNS.indexOf('SQ-1')))
  })

  it('the comment box table holds SQ-7 at the left, and no other column, in every row', () => {
    const { panel } = drawn(viewOf(sessionIn('ja'), { table: 'commentBoxes' }))
    const rows = stuckInEveryTaskGroup(panel)
    expect(rows.length).toBeGreaterThan(1)
    for (const line of rows) expect(line).toEqual(COMMENT_COLUMNS.map((_column, at) => at < 1))
  })
})

describe(`T-330 SV-17 -- ${SV_17_ELLIPSIS} / SV-16 -- ${SV_16_RULE}`, () => {
  it('every heading and every cell stays on one line, cuts with an ellipsis, and is ruled at 1px', () => {
    const { panel } = drawn(viewOf(sessionIn('ja')))
    const cells = [...byTag(panel, 'TH'), ...byTag(panel, 'TD')]
    expect(cells.length).toBeGreaterThan(TASK_COLUMNS.length)
    for (const cell of cells) {
      const style = styleMap(cell)
      expect(style.get('white-space'), textOf(cell)).toBe('nowrap')
      expect(style.get('text-overflow'), textOf(cell)).toBe('ellipsis')
      expect(style.get('border') ?? '', textOf(cell)).toMatch(/(^|\s)1px(\s|$)/)
    }
  })
})

describe(`T-330 SV-12 -- ${SV_12_ONLY_TITLE}`, () => {
  it('a minimised panel draws its heading row and neither the field nor the table', () => {
    const { panel } = drawn(viewOf(sessionIn('ja', 'searchPanelMinimiseToggled')))
    expect(titleRowOf(panel)).toBeDefined()
    expect(byTag(panel, 'INPUT')).toHaveLength(0)
    expect(byTag(panel, 'TABLE')).toHaveLength(0)
  })
})
