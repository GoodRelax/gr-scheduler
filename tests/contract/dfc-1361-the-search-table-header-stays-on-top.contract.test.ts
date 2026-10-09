// DFC-1361: the Search Panel table's heading row stays fixed and readable while rows scroll under it (FR-151, table T-330 SV-6).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { SearchPanelView } from '../../src/adapter/screen-renderer/screen-renderer'
import { searchPanelFromSession } from '../../src/adapter/screen-renderer/search-panel'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { searchTableElement } from '../../src/framework/dom-screen-surface/search-panel-drawing'
import {
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  type ScreenSession,
  type SearchPanelSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { selfAndDescendants, stage, styleMap, type FakeElement } from '../fixtures/fake-browser'
import { bare, specTable, unbroken, type SpecRow } from './spec-table'

function rowOf(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(table, id).by[heading] ?? '')

const SV_6_HEADING = '見出しの行を縦に固定する。'
const SV_6_FIXED = '横は、タスクの表は `SQ-1` まで（表 T-331 の並びで 表示・ステータス・進捗・タスク の 4 列）、コメントボックスの表は `SQ-7` までを左に固定し'
const SV_6_UNDER = '残りの列はその下を送る（表 T-257 の `RR-4` と同じ形）'
const RR_4_UNDER = '⭐ ほかの欄はその下を通って送られる'
const S_146_ROLE = '地'
const S_150_ROLE = '行見出しパネル・プロパティパネル・パレットの地'

// see T-331
const T_331 = specTable('T-331').rows
const columnsOf = (table: string): readonly string[] => T_331.filter((row) => row.by['表'] === table).map((row) => row.id)
const TASK_COLUMNS = columnsOf('タスク')
const COMMENT_COLUMNS = columnsOf('コメントボックス')

// WHY: SV-6 names the last fixed column of each table; the fixed ones are those up to it in table T-331 order.
const fixedUpTo = (columns: readonly string[], last: string): readonly string[] => columns.slice(0, columns.indexOf(last) + 1)
const TASK_FIXED = fixedUpTo(TASK_COLUMNS, 'SQ-1')
const COMMENT_FIXED = fixedUpTo(COMMENT_COLUMNS, 'SQ-7')

// see T-206, T-333
const T_333 = specTable('T-333').rows.map((row) => ({ id: row.id, px: Number(bare(row.by['値'] ?? '')) }))
const S_429_ROW = bare(rowOf('T-206', 'S-429').by['既定'] ?? '')
const FONT_PX = T_333.find((row) => row.id === S_429_ROW)?.px ?? Number.NaN

type Loose = Record<string, unknown>
const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Loose }
const firstOf = (key: string): Loose => ((TEMPLATE.schedule[key] as readonly Loose[])[0] ?? {}) as Loose

const TOP = 'task-group-top'
const TASK_COUNT = 8
const COMMENT_COUNT = 5

const task = (uid: number): Loose => ({
  ...firstOf('tasks'),
  uid,
  parentTaskUid: null,
  wbsOrder: uid,
  name: `task ${uid}`,
  start: `2026-01-${String(uid).padStart(2, '0')}T00:00:00`,
  finish: `2026-01-${String(uid + 5).padStart(2, '0')}T00:00:00`,
  milestone: false,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  dependencies: [],
})

const comment = (at: number): Loose => ({
  id: `c-${at}`,
  leaderShapeKind: null,
  text: `comment ${at}`,
  anchorDate: `2026-03-${String(at).padStart(2, '0')}T00:00:00`,
  anchorGroupId: TOP,
  bodyOffsetPx: null,
  strokeColor: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
  textColor: null,
})

const UIDS = Array.from({ length: TASK_COUNT }, (_unused, at) => at + 1)

const SCHEDULE = {
  ...TEMPLATE.schedule,
  tasks: UIDS.map(task),
  taskGroups: [{ ...firstOf('taskGroups'), id: TOP, parentId: null, order: 0, label: 'Program', derivedFromTaskUid: null, treeState: 'expanded' }],
  taskGroupMembers: UIDS.map((uid) => ({ taskUid: uid, groupId: TOP })),
  resources: [{ ...firstOf('resources'), uid: 301, name: 'Aki Yamashita' }],
  assignments: UIDS.map((uid) => ({ ...firstOf('assignments'), uid: 400 + uid, taskUid: uid, resourceUid: 301 })),
  commentBoxes: Array.from({ length: COMMENT_COUNT }, (_unused, at) => comment(at + 1)),
  taskVisuals: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const CANVAS: ScreenRect = { x: 0, y: 56, width: 1000, height: 600 }

function shownSession(): ScreenSession {
  const shown = advanceScreenSession(emptyScreenSession, { type: 'searchEntryPressed' } as unknown as SessionEvent).state
  return { ...shown, screen: { ...shown.screen, screenLanguage: 'ja', helpLanguage: 'ja' } } as unknown as ScreenSession
}

function viewOf(panel: Partial<SearchPanelSession>): SearchPanelView {
  const view = searchPanelFromSession(shownSession(), { ...emptySearchPanelSession, ...panel }, SCHEDULE, CANVAS)
  if (view === null) throw new Error('premise: a shown panel has a view')
  return view
}

interface Drawn {
  readonly box: FakeElement
  readonly heads: readonly FakeElement[]
  readonly bodyRows: readonly (readonly FakeElement[])[]
}

function drawn(panel: Partial<SearchPanelSession>): Drawn {
  const built = stage()
  const box = searchTableElement(built.host, viewOf(panel), FONT_PX) as unknown as FakeElement
  const all = selfAndDescendants(box)
  const thead = all.find((one) => one.tagName === 'THEAD')
  const tbody = all.find((one) => one.tagName === 'TBODY')
  if (thead === undefined || tbody === undefined) throw new Error('premise: the table has a thead and a tbody')
  const heads = selfAndDescendants(thead).filter((one) => one.tagName === 'TH')
  const bodyRows = selfAndDescendants(tbody)
    .filter((one) => one.tagName === 'TR')
    .map((line) => selfAndDescendants(line).filter((one) => one.tagName === 'TD'))
  return { box, heads, bodyRows }
}

// WHY: the fake browser has no layout, so paint order is read from inline styles by the CSS stacking rules.
const isFixed = (cell: FakeElement): boolean => cell.getAttribute('data-fixed-column') === 'true'

const POSITIONED = new Set(['relative', 'absolute', 'fixed', 'sticky'])

const isPositioned = (element: FakeElement): boolean => POSITIONED.has((styleMap(element).get('position') ?? '').trim())

// WHY: a missing or non-integer z-index is auto.
function zIndexOf(element: FakeElement): number | 'auto' {
  const written = (styleMap(element).get('z-index') ?? 'auto').trim()
  return /^-?\d+$/.test(written) ? Number(written) : 'auto'
}

// WHY: only the common CSS triggers of a stacking context are read.
function formsStackingContext(element: FakeElement): boolean {
  const style = styleMap(element)
  const position = (style.get('position') ?? '').trim()
  if (position === 'fixed' || position === 'sticky') return true
  if (isPositioned(element) && zIndexOf(element) !== 'auto') return true
  const opacity = Number.parseFloat(style.get('opacity') ?? '1')
  if (!Number.isNaN(opacity) && opacity < 1) return true
  const transform = (style.get('transform') ?? 'none').trim()
  if (transform !== '' && transform !== 'none') return true
  if ((style.get('isolation') ?? '').trim() === 'isolate') return true
  return false
}

// WHY: an unpositioned box paints below every positioned box of z-index 0 or auto and above negative ones.
const UNPOSITIONED_LEVEL = -0.5

function levelOf(element: FakeElement): number {
  if (!isPositioned(element)) return UNPOSITIONED_LEVEL
  const z = zIndexOf(element)
  return z === 'auto' ? 0 : z
}

function pathFrom(root: FakeElement, element: FakeElement): readonly FakeElement[] {
  const path: FakeElement[] = []
  let at: FakeElement | null = element
  while (at !== null && at !== root) {
    path.unshift(at)
    at = at.parentNode
  }
  if (at !== root) throw new Error('premise: the cell sits under the scrolling box')
  return path
}

// WHY: a path is ranked by its outermost stacking context, else its outermost positioned box, else the cell.
function representativeOf(path: readonly FakeElement[]): FakeElement {
  const context = path.find(formsStackingContext)
  if (context !== undefined) return context
  const positioned = path.find(isPositioned)
  return positioned ?? (path[path.length - 1] as FakeElement)
}

// WHY: in the nearest shared stacking context the higher level wins, and on a tie the later box in tree order.
function paintsAbove(root: FakeElement, upper: FakeElement, lower: FakeElement): boolean {
  const order = selfAndDescendants(root)
  let upperPath = pathFrom(root, upper)
  let lowerPath = pathFrom(root, lower)
  for (;;) {
    const upperRep = representativeOf(upperPath)
    const lowerRep = representativeOf(lowerPath)
    if (upperRep !== lowerRep) {
      const upperLevel = levelOf(upperRep)
      const lowerLevel = levelOf(lowerRep)
      if (upperLevel !== lowerLevel) return upperLevel > lowerLevel
      return order.indexOf(upperRep) > order.indexOf(lowerRep)
    }
    if (upperRep === upper || upperRep === lower) return upperRep === upper
    upperPath = upperPath.slice(upperPath.indexOf(upperRep) + 1)
    lowerPath = lowerPath.slice(lowerPath.indexOf(lowerRep) + 1)
  }
}

const nameOf = (cell: FakeElement): string => {
  const style = styleMap(cell)
  return (
    `${cell.tagName.toLowerCase()} "${cell.textContent.trim()}" [${cell.getAttribute('data-column') ?? '?'}] ` +
    `(position:${style.get('position') ?? '-'}, z-index:${style.get('z-index') ?? 'auto'})`
  )
}

function coverings(root: FakeElement, uppers: readonly FakeElement[], lowers: readonly FakeElement[]): readonly string[] {
  const wrong: string[] = []
  for (const upper of uppers) {
    for (const lower of lowers) {
      if (!paintsAbove(root, upper, lower)) wrong.push(`${nameOf(lower)} covers ${nameOf(upper)}`)
    }
  }
  return wrong
}

// WHY: FR-041 forbids a fallback inside var(), so a colour is either one bare custom property or an opaque literal.
function isOpaqueGround(written: string): boolean {
  const flat = written.trim().toLowerCase()
  if (flat === '' || flat === 'transparent' || flat === 'none' || flat === 'inherit' || flat === 'initial') return false
  if (/^var\(--gr-[a-z0-9-]+\)$/.test(flat)) return true
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(flat)) return true
  if (/^(rgb|hsl)\([^/)]*\)$/.test(flat)) return true
  return false
}

const groundOf = (cell: FakeElement): string => {
  const style = styleMap(cell)
  return style.get('background-color') ?? style.get('background') ?? ''
}

const TABLES = [
  { name: 'the tasks table', panel: {}, columns: TASK_COLUMNS, fixed: TASK_FIXED, rows: TASK_COUNT },
  { name: 'the comment box table', panel: { table: 'commentBoxes' }, columns: COMMENT_COLUMNS, fixed: COMMENT_FIXED, rows: COMMENT_COUNT },
] as const

describe('DFC-1361 -- the manuscript these cases are driven by', () => {
  it('SV-6 and RR-4 still read this way', () => {
    const sv6 = cellOf('T-330', 'SV-6', '定め')
    for (const clause of [SV_6_HEADING, SV_6_FIXED, SV_6_UNDER]) expect(sv6).toContain(clause)
    expect(cellOf('T-257', 'RR-4', '定め')).toContain(RR_4_UNDER)
  })

  it('S-146 and S-150 are grounds with no transparency in either theme', () => {
    const rows = [
      { id: 'S-146', role: S_146_ROLE },
      { id: 'S-150', role: S_150_ROLE },
    ]
    for (const { id, role } of rows) {
      const row = rowOf('T-236', id)
      expect(unbroken(row.by['備考'] ?? ''), `${id} note`).toContain(role)
      for (const theme of ['明るいテーマ', '暗いテーマ']) {
        const value = bare(row.by[theme] ?? '')
        expect(isOpaqueGround(value), `${id} ${theme} is opaque: ${value}`).toBe(true)
      }
    }
  })
})

describe.each(TABLES)(`DFC-1361 -- SV-6 ${SV_6_FIXED}: $name`, ({ panel, columns, fixed, rows }) => {
  it('premise: the heading row carries every column and the body enough rows to scroll', () => {
    const { heads, bodyRows } = drawn(panel)
    expect(heads.map((cell) => cell.getAttribute('data-column'))).toEqual(columns)
    expect(bodyRows.length).toBe(rows)
    for (const line of bodyRows) expect(line.length).toBe(columns.length)
  })

  it(`premise: the columns up to the last one SV-6 names are fixed on the left, heading and body alike (${fixed.join(', ')})`, () => {
    const { heads, bodyRows } = drawn(panel)
    expect(fixed.length, 'the stacking cases below are not vacuous').toBeGreaterThan(0)
    expect(heads.filter(isFixed).map((cell) => cell.getAttribute('data-column'))).toEqual(fixed)
    for (const line of bodyRows) expect(line.map(isFixed)).toEqual(columns.map((column) => fixed.includes(column)))
  })

  it(`${SV_6_HEADING} -- every heading cell is sticky at top 0 on an opaque ground`, () => {
    const { heads } = drawn(panel)
    for (const cell of heads) {
      const style = styleMap(cell)
      expect(style.get('position'), nameOf(cell)).toBe('sticky')
      expect(style.get('top'), nameOf(cell)).toMatch(/^0(px)?$/)
      expect(isOpaqueGround(groundOf(cell)), `${nameOf(cell)} has an opaque ground, got "${groundOf(cell)}"`).toBe(true)
    }
  })

  it('the body rows pass under the heading row: every heading cell paints above every body cell', () => {
    const { box, heads, bodyRows } = drawn(panel)
    expect(coverings(box, heads, bodyRows.flat())).toEqual([])
  })

  it(`${SV_6_UNDER} -- in the heading row, every fixed heading cell paints above every other heading cell`, () => {
    const { box, heads } = drawn(panel)
    expect(
      coverings(
        box,
        heads.filter(isFixed),
        heads.filter((cell) => !isFixed(cell)),
      ),
    ).toEqual([])
  })

  it(`${SV_6_UNDER} -- in each body row, every fixed cell paints above every other cell`, () => {
    const { box, bodyRows } = drawn(panel)
    for (const line of bodyRows) {
      expect(line.filter(isFixed).length, 'premise: each body row marks its fixed cells, so this case is not vacuous').toBe(
        fixed.length,
      )
    }
    const wrong = bodyRows.flatMap((line) =>
      coverings(
        box,
        line.filter(isFixed),
        line.filter((cell) => !isFixed(cell)),
      ),
    )
    expect(wrong).toEqual([])
  })
})
