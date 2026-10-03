// CR-601 spec-only cases: which inputs keep the landing mark while the view moves, and which clear it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  isLandingMarkKeptBy,
  type HumanInput,
  type InputModifiers,
  type KeyInput,
  type PointerInput,
  type PointerPress,
  type WheelInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { regionsFromScreen, type ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from './spec-table'

const rowCells = (table: string, id: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' | ')
}

const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[column]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no column ${column}`)
  return cell
}

const flat = (text: string): string => text.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

const numberIn = (cell: string): number => {
  const found = cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/)
  if (found === null) throw new Error(`no number in ${cell}`)
  return Number(found[0])
}

const STATE_MACHINES = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8'),
)

const EL_17 = rowCells('T-303', 'EL-17')
const UN_8 = rowCells('T-027', 'UN-8')

const EL_17_CLEAR = '印が出ているあいだに、人が次のどれかを行ったら、印を消すこと（MUST）: 押下（どのボタンでも、画面のどこでも）、キーの押下。'
const EL_17_VIEW_ONLY =
  '⭐ ただし、見る位置と倍率だけを動かす操作 —— 表 T-027 の `UN-8`（ズーム・スクロール・パン）と、表示の倍率（`FR-039`）の操作 —— では消さないこと（MUST）'
const EL_17_WHEEL =
  'ホイール（表 T-023 の `MK-1` 〜 `MK-5`、面やパネルの上でその中を送るものを含め、ホイールはどれも消さない）'
const EL_17_PAN = 'パン（表 T-023a の `PTD-1`）の押下'
const EL_17_SCROLLBAR = 'スクロールバー（表 T-031 の `SC-4`）の押下'
const EL_17_ENTRIES = '`_assets/tbl-glossary.md` の 表 T-109 の `IC-12` 〜 `IC-15` ・ `IC-104` ・ `IC-105` の入口の押下'
const EL_17_KEYS = '表 T-036 の `SK-16` ・ `SK-16a` ・ `SK-16b` ・ `SK-16c` ・ `SK-22` ・ `SK-23` のキー'
const EL_17_MODIFIERS = '修飾キー（`Ctrl` ・ `Shift` ・ `Alt` ・ `Meta`）だけの押下でも消さないこと（MUST）'
const EL_17_FIT = '⚠️ 全体を収める（`FR-055`、表 T-036 の `SK-18`、表 T-109 の `IC-10`）では消す'
const EL_17_STAR = '⭐ 押して離したのが続きの印なら、押下で古い印を消し、離したときに新しい印を付ける。'
const EL_17_MOVE = '⚠️ ポインタを動かすだけでは消さない'
const UN_8_VIEW = 'ズーム・スクロール・パン'
const T_280_SOURCE =
  '入力（印が出ているあいだの押下・キーの押下。見る位置と倍率だけを動かす操作と修飾キーだけの押下（EL-17 の ⭐）、印を付けた押下の 2 回目（EL-18）を除く）: `EL-17`'

describe('CR-601 -- the manuscript these cases are driven by', () => {
  it.each([
    ['T-303 EL-17 (clear)', EL_17, EL_17_CLEAR],
    ['T-303 EL-17 (view only)', EL_17, EL_17_VIEW_ONLY],
    ['T-303 EL-17 (wheel)', EL_17, EL_17_WHEEL],
    ['T-303 EL-17 (pan)', EL_17, EL_17_PAN],
    ['T-303 EL-17 (scrollbar)', EL_17, EL_17_SCROLLBAR],
    ['T-303 EL-17 (entries)', EL_17, EL_17_ENTRIES],
    ['T-303 EL-17 (keys)', EL_17, EL_17_KEYS],
    ['T-303 EL-17 (modifiers)', EL_17, EL_17_MODIFIERS],
    ['T-303 EL-17 (fit)', EL_17, EL_17_FIT],
    ['T-303 EL-17 (star)', EL_17, EL_17_STAR],
    ['T-303 EL-17 (move)', EL_17, EL_17_MOVE],
    ['T-027 UN-8', UN_8, UN_8_VIEW],
  ] as const)('%s still says it', (_name, cell, clause) => {
    expect(flat(cell), clause).toContain(flat(clause))
  })

  it('table T-280 still names the source of landingMarkClearAsked', () => {
    expect(STATE_MACHINES, T_280_SOURCE).toContain(T_280_SOURCE)
  })
})

const T201 = (id: string): number => numberIn(cellOf('T-201', id, '既定値'))
const T206 = (id: string): number => numberIn(cellOf('T-206', id, '既定'))
const S_159_LIGHT = cellOf('T-236', 'S-159', '明るいテーマ').replace(/`/g, '').trim().toLowerCase()

// see FR-039, T-252
const ratioAt = (displayScale: number): number => (T206('S-236') * displayScale) / 100
// see SL-8, EL-16, S-447
const EMPHASISED_WIDTH = (displayScale: number): number => T201('S-18') * ratioAt(displayScale) + T206('S-447')

// WHY: the SVG prints two decimals.
const SVG_EPS = 0.006

interface Pt {
  readonly x: number
  readonly y: number
}

interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface Line {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly points: readonly Pt[]
  readonly continuation?: { readonly dots: readonly Pt[]; readonly farUid: number } | null
}

interface Element {
  readonly tag: string
  readonly attrs: string
  readonly zo: string | null
}

const attrOf = (attrs: string, name: string): string | null => {
  const found = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  return found === null ? null : found[1]!
}

// see T-020
const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const groups: (string | null)[] = []
  const drawn = svg.replace(/<marker\b[\s\S]*?<\/marker>/g, '')
  for (const match of drawn.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') groups.push(attrOf(attrs!, 'data-zo'))
      continue
    }
    if (closing === '/') continue
    const zo = [...groups].reverse().find((one) => one !== null) ?? null
    out.push({ tag: tag!, attrs: attrs!, zo })
  }
  return out
}

const pointsAttr = (attrs: string): readonly Pt[] =>
  (attrOf(attrs, 'points') ?? '')
    .trim()
    .split(/\s+/)
    .filter((one) => one !== '')
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return { x: x!, y: y! }
    })

const samePath = (actual: readonly Pt[], expected: readonly Pt[]): boolean =>
  actual.length === expected.length &&
  actual.every((one, at) => Math.abs(one.x - expected[at]!.x) <= SVG_EPS && Math.abs(one.y - expected[at]!.y) <= SVG_EPS)

const strokeOf = (one: Element): string => (attrOf(one.attrs, 'stroke') ?? '').toLowerCase()

// see EL-16, SL-8
const emphasisedLines = (svg: string, displayScale: number): readonly Element[] =>
  elementsOf(svg).filter(
    (one) =>
      one.tag === 'polyline' &&
      strokeOf(one) === S_159_LIGHT &&
      Math.abs(Number(attrOf(one.attrs, 'stroke-width')) - EMPHASISED_WIDTH(displayScale)) <= SVG_EPS,
  )

// see EL-16, ZO-10
const outlinesOf = (svg: string): readonly Element[] =>
  elementsOf(svg).filter(
    (one) => one.zo === 'ZO-10' && strokeOf(one) === S_159_LIGHT && attrOf(one.attrs, 'stroke-dasharray') === null,
  )

const MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

type Loose = Record<string, unknown>

// see T-023
const wheelModifiersOf = (id: string): InputModifiers => {
  const said = cellOf('T-023', id, '操作')
  if (!said.includes('ホイール')) throw new Error(`table T-023 row ${id} is not a wheel row`)
  return { ctrl: /\bCtrl\b/.test(said), shift: /\bShift\b/.test(said), alt: /\bAlt\b/.test(said), meta: false }
}
const WHEEL_ROWS = ['MK-1', 'MK-2', 'MK-3', 'MK-4', 'MK-5'] as const

// see T-036
const keyOf = (id: string): KeyInput => {
  const first = (specTable('T-036').rows.find((row) => row.id === id)?.by['割当'] ?? '').split('／')[0] ?? ''
  const parts = [...first.matchAll(/`([^`]+)`/g)].map((span) => span[1] as string)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return { kind: 'key', key: last, modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: false } }
}
const VIEW_KEY_ROWS = ['SK-16', 'SK-16a', 'SK-16b', 'SK-16c', 'SK-22', 'SK-23'] as const

const MODIFIER_KEYS: readonly (readonly [string, Partial<InputModifiers>])[] = [
  ['Control', { ctrl: true }],
  ['Shift', { shift: true }],
  ['Alt', { alt: true }],
  ['Meta', { meta: true }],
]

const modifierKey = (key: string, held: Partial<InputModifiers>): KeyInput => ({
  kind: 'key',
  key,
  modifiers: { ...MODS, ...held },
})

const partOf = (part: string, entry: string | null, extra: Loose = {}): ScreenPart =>
  ({
    part,
    entry,
    format: null,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
    ...extra,
  }) as unknown as ScreenPart

const pointerAt = (
  phase: PointerInput['phase'],
  at: Pt,
  button: PointerInput['button'] = 'left',
  held: Partial<InputModifiers> = {},
  clickCount = 1,
): PointerInput =>
  ({ kind: 'pointer', phase, button, x: at.x, y: at.y, modifiers: { ...MODS, ...held }, clickCount }) as unknown as PointerInput

const wheelAt = (at: Pt, modifiers: InputModifiers, notches = 1): WheelInput => ({
  kind: 'wheel',
  x: at.x,
  y: at.y,
  modifiers,
  notches,
  scrollPx: { x: 0, y: notches * 40 },
})

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }
const HEADER_AT: Pt = { x: 200, y: 20 }
const REAL_RAF = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (REAL_RAF === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = REAL_RAF
})

const uuid = (n: number): string => `dddddddd-0000-4000-8000-${String(n).padStart(12, '0')}`
const ROW_A = uuid(1)
const ROW_B = uuid(2)
const ROW_C = uuid(3)
const ROW_Z = uuid(9)

const shellTask = (uid: number, start: string, finish: string, links: readonly number[] = []): Loose => ({
  uid,
  wbsParentUid: null,
  wbsOrder: uid,
  name: `Task${uid}`,
  start: `${start}T08:00:00`,
  finish: `${finish}T17:00:00`,
  milestone: false,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: 0,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: links.map((predecessorUid) => ({
    predecessorUid,
    linkType: 1,
    lag: null,
    lagFormat: null,
    carry: {},
    carryElements: [],
  })),
  carry: {},
  carryElements: [],
})

const shellDocument = (rows: readonly string[], tasks: readonly (readonly [Loose, string])[]): Document =>
  ({
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 1000, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: tasks.map(([task]) => task),
      resources: [],
      assignments: [],
      taskGroups: rows.map((id, index) => ({
        id,
        parentId: null,
        label: `Row${index + 1}`,
        derivedFromTaskUid: null,
        order: index,
        treeState: 'auto',
        editGroup: null,
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: tasks.map(([task, groupId]) => ({ taskUid: task['uid'], groupId })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      pinnedGroupIds: [],
      scrollDate: '2026-03-30',
      scrollDayOffset: 0,
      scrollGroupId: rows[0]!,
      scrollGroupOffset: 0,
      zoomX: 1,
      zoomY: 1,
      levelZeroTreeState: 'auto',
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }) as unknown as Document

// see EL-4
const PLAIN = (): Document =>
  shellDocument(
    [ROW_A, ROW_B, ROW_Z],
    [
      [shellTask(1, '2026-04-01', '2026-04-03'), ROW_A],
      [shellTask(2, '2027-06-01', '2027-06-03', [1]), ROW_B],
    ],
  )

// WHY: rows enough below the two ends that the vertical grip has somewhere to go.
const TALL = (): Document =>
  shellDocument(
    [ROW_A, ROW_B, ...Array.from({ length: 40 }, (_unused, at) => uuid(100 + at))],
    [
      [shellTask(1, '2026-04-01', '2026-04-03'), ROW_A],
      [shellTask(2, '2027-06-01', '2027-06-03', [1]), ROW_B],
    ],
  )

// WHY: the second line leaves the first landing's far end for a far end of its own, so its mark stands beside the landing.
const CHAIN = (): Document =>
  shellDocument(
    [ROW_A, ROW_B, ROW_C, ROW_Z],
    [
      [shellTask(1, '2026-04-01', '2026-04-03'), ROW_A],
      [shellTask(2, '2027-06-01', '2027-06-03', [1]), ROW_B],
      [shellTask(3, '2029-01-01', '2029-01-03', [2]), ROW_C],
    ],
  )

interface Shell {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  aim(part: ScreenPart | null): void
  svg(): string
  view(): ScreenView
  lines(): readonly Line[]
  rowArea(): Rect
}

const shellOf = (document: Document): Shell => {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  let shown = ''
  let aimed: ScreenPart | null = null
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => void views.push(view),
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => aimed,
  }
  const loop = frameLoop({ showSvg: (svg: string) => void (shown = svg) } as never, document, SCREEN, { surface, language: 'en' })
  drain()
  const frame = () => {
    const now = loop.current()
    if (now === null) throw new Error('the loop has drawn no frame')
    return now
  }
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    aim: (part) => {
      aimed = part
    },
    svg: () => shown,
    view: () => {
      const last = views[views.length - 1]
      if (last === undefined) throw new Error('the surface was given no description')
      return last
    },
    lines: () => frame().geometry.dependencies as unknown as readonly Line[],
    rowArea: () => frame().regions.rowArea as unknown as Rect,
  }
}

const markOf = (shell: Shell, predecessorUid: number, successorUid: number): Pt => {
  const found = shell.lines().find((one) => one.predecessorUid === predecessorUid && one.successorUid === successorUid)
  const dots = found?.continuation?.dots ?? []
  if (dots.length !== 3) throw new Error(`premise: the line ${predecessorUid} -> ${successorUid} carries a mark (EL-9)`)
  return dots[1]!
}

const routeOf = (shell: Shell, predecessorUid: number, successorUid: number): readonly Pt[] => {
  const found = shell.lines().find((one) => one.predecessorUid === predecessorUid && one.successorUid === successorUid)
  if (found === undefined) throw new Error(`the frame holds no line ${predecessorUid} -> ${successorUid}`)
  return found.points
}

const clickAt = (shell: Shell, at: Pt, button: PointerInput['button'] = 'left'): void => {
  shell.send(pointerAt('down', at, button))
  shell.send(pointerAt('up', at, button))
}

const displayScaleOf = (shell: Shell): number => Number(shell.loop.document().documentSettings.displayScale ?? 100)

// see EL-16
const isLandingShown = (shell: Shell): boolean => emphasisedLines(shell.svg(), displayScaleOf(shell)).length > 0

const emptyPlace = (shell: Shell): Pt => {
  const area = shell.rowArea()
  return { x: area.x + area.width - 30, y: area.y + area.height - 30 }
}

const middleOf = (area: Rect): Pt => ({ x: area.x + area.width / 2, y: area.y + area.height / 2 })

const viewOf = (shell: Shell): string => {
  const settings = shell.loop.document().documentSettings as unknown as Loose
  return JSON.stringify([
    settings['scrollDate'],
    settings['scrollDayOffset'],
    settings['scrollGroupId'],
    settings['scrollGroupOffset'],
    settings['zoomX'],
    settings['zoomY'],
    settings['displayScale'],
  ])
}

const landedShell = (document: Document = PLAIN()): Shell => {
  const shell = shellOf(document)
  expect(isLandingShown(shell), 'premise: no landing before the click').toBe(false)
  clickAt(shell, markOf(shell, 1, 2))
  expect(isLandingShown(shell), 'premise: one click on the mark shows the landing (EL-16)').toBe(true)
  expect(outlinesOf(shell.svg()).length, 'premise: the landed end is outlined (EL-16)').toBeGreaterThan(0)
  return shell
}

const dragFrom = (shell: Shell, from: Pt, by: Pt, button: PointerInput['button'], held: Partial<InputModifiers> = {}): void => {
  shell.send(pointerAt('down', from, button, held))
  shell.send(pointerAt('move', { x: from.x + by.x / 2, y: from.y + by.y / 2 }, button, held))
  shell.send(pointerAt('move', { x: from.x + by.x, y: from.y + by.y }, button, held))
  shell.send(pointerAt('up', { x: from.x + by.x, y: from.y + by.y }, button, held))
}

const pressEntry = (shell: Shell, part: ScreenPart): void => {
  shell.aim(part)
  shell.send(pointerAt('down', HEADER_AT))
  shell.send(pointerAt('up', HEADER_AT))
  shell.aim(null)
}

const isInRowArea = (shell: Shell, uid: number): boolean => {
  const area = shell.rowArea()
  return (shell.loop.current()?.layout.placements ?? []).some(
    (one) =>
      one.taskUid === uid &&
      one.x >= area.x &&
      one.x + one.width <= area.x + area.width &&
      one.y >= area.y &&
      one.y + one.planHeight <= area.y + area.height,
  )
}

// WHY: an end the view has moved off is not outlined, so the outline is asked of an end inside the Row Area only.
const keepsIt = (shell: Shell, clause: string): void => {
  expect(isLandingShown(shell), `${clause} (the emphasised line stays)`).toBe(true)
  if (isInRowArea(shell, 1) || isInRowArea(shell, 2)) {
    expect(outlinesOf(shell.svg()).length, `${clause} (the end outline stays)`).toBeGreaterThan(0)
  }
}

describe(`(a) the shell -- EL-17: ${EL_17_VIEW_ONLY}`, () => {
  it.each(WHEEL_ROWS)(`${EL_17_WHEEL} -- a %s wheel keeps it`, (row) => {
    const shell = landedShell()
    shell.send(wheelAt(middleOf(shell.rowArea()), wheelModifiersOf(row)))
    keepsIt(shell, EL_17_WHEEL)
  })

  it(`${EL_17_WHEEL} -- a wheel with Alt and Ctrl together (no row of T-023) keeps it`, () => {
    const shell = landedShell()
    shell.send(wheelAt(middleOf(shell.rowArea()), { ...MODS, ctrl: true, alt: true }))
    keepsIt(shell, EL_17_WHEEL)
  })

  it(`${EL_17_WHEEL} -- a wheel over the search panel keeps it`, () => {
    const shell = landedShell()
    // STEP: open the panel by its key, then land again (that key cleared the first landing)
    shell.send(keyOf('SK-24'))
    clickAt(shell, markOf(shell, 1, 2))
    expect(isLandingShown(shell), 'premise: the landing is shown with the panel open').toBe(true)
    shell.aim(partOf('Search Panel', null))
    shell.send(wheelAt(middleOf(shell.rowArea()), MODS))
    shell.aim(null)
    keepsIt(shell, EL_17_WHEEL)
  })

  it(`${EL_17_PAN} -- a middle press and drag on the Row Area keeps it`, () => {
    const shell = landedShell()
    const before = viewOf(shell)
    dragFrom(shell, emptyPlace(shell), { x: -120, y: 0 }, 'middle')
    expect(viewOf(shell), 'premise: the pan moved the view').not.toBe(before)
    keepsIt(shell, EL_17_PAN)
  })

  it(`${EL_17_PAN} -- a Ctrl+left press and drag on an empty place of the Row Area keeps it`, () => {
    const shell = landedShell()
    const before = viewOf(shell)
    dragFrom(shell, emptyPlace(shell), { x: -120, y: 0 }, 'left', { ctrl: true })
    expect(viewOf(shell), 'premise: the pan moved the view').not.toBe(before)
    keepsIt(shell, EL_17_PAN)
  })

  it(`${EL_17_PAN} -- a middle press released without moving keeps it`, () => {
    const shell = landedShell()
    clickAt(shell, emptyPlace(shell), 'middle')
    keepsIt(shell, EL_17_PAN)
  })

  it.each(MODIFIER_KEYS)(`${EL_17_MODIFIERS} -- a %s-only key down keeps it`, (key, held) => {
    const shell = landedShell()
    shell.send(modifierKey(key, held))
    keepsIt(shell, EL_17_MODIFIERS)
  })

  it.each(['horizontal', 'vertical'] as const)(`${EL_17_SCROLLBAR} -- a press and drag on the %s scrollbar keeps it`, (axis) => {
    const shell = landedShell(TALL())
    const bar = shell.view().frame.scrollbars.find((one) => one.axis === axis)
    if (bar === undefined) throw new Error(`SC-4 draws no ${axis} bar`)
    const from = { x: bar.thumb.x + bar.thumb.width / 2, y: bar.thumb.y + bar.thumb.height / 2 }
    const before = viewOf(shell)
    shell.aim(partOf('Scrollbars', null, { scrollbarAxis: axis }))
    dragFrom(shell, from, axis === 'horizontal' ? { x: -30, y: 0 } : { x: 0, y: 30 }, 'left')
    shell.aim(null)
    expect(viewOf(shell), 'premise: the grip moved the view').not.toBe(before)
    keepsIt(shell, EL_17_SCROLLBAR)
  })

  it.each(['IC-13', 'IC-15', 'IC-105'] as const)(`${EL_17_ENTRIES} -- a press on %s keeps it`, (entry) => {
    const shell = landedShell()
    const before = viewOf(shell)
    pressEntry(shell, partOf('App Header', entry))
    expect(viewOf(shell), `premise: ${entry} changed the zoom or the display scale`).not.toBe(before)
    keepsIt(shell, EL_17_ENTRIES)
  })

  it.each(['SK-16', 'SK-16a', 'SK-22'] as const)(`${EL_17_KEYS} -- the key of %s keeps it`, (row) => {
    const shell = landedShell()
    const before = viewOf(shell)
    shell.send(keyOf(row))
    expect(viewOf(shell), `premise: ${row} changed the zoom or the display scale`).not.toBe(before)
    keepsIt(shell, EL_17_KEYS)
  })
})

describe(`(b) the shell -- EL-17: ${EL_17_CLEAR}`, () => {
  it(`${EL_17_CLEAR} -- a plain left press on an empty place clears it`, () => {
    const shell = landedShell()
    clickAt(shell, emptyPlace(shell))
    expect(isLandingShown(shell), EL_17_CLEAR).toBe(false)
  })

  it(`${EL_17_CLEAR} -- a right press clears it`, () => {
    const shell = landedShell()
    clickAt(shell, emptyPlace(shell), 'right')
    expect(isLandingShown(shell), EL_17_CLEAR).toBe(false)
  })

  it(`${EL_17_CLEAR} -- a press on a row's fold entry (IC-77) clears it`, () => {
    const shell = landedShell()
    pressEntry(shell, partOf('Row Title Panel', 'IC-77', { rowGroupId: ROW_A }))
    expect(isLandingShown(shell), EL_17_CLEAR).toBe(false)
  })

  it(`${EL_17_CLEAR} -- a plain key (Enter) clears it`, () => {
    const shell = landedShell()
    shell.send({ kind: 'key', key: 'Enter', modifiers: MODS })
    expect(isLandingShown(shell), EL_17_CLEAR).toBe(false)
  })

  it(`${EL_17_CLEAR} -- a modifier held, then a key with no assignment, clears it`, () => {
    const shell = landedShell()
    shell.send(modifierKey('Control', { ctrl: true }))
    expect(isLandingShown(shell), 'premise: the modifier alone kept it').toBe(true)
    shell.send({ kind: 'key', key: 'Q', modifiers: { ...MODS, ctrl: true } })
    expect(isLandingShown(shell), EL_17_CLEAR).toBe(false)
  })

  it(`${EL_17_FIT} -- F (SK-18) clears it`, () => {
    const shell = landedShell()
    shell.send(keyOf('SK-18'))
    expect(isLandingShown(shell), EL_17_FIT).toBe(false)
  })

  it(`${EL_17_FIT} -- a press on IC-10 clears it`, () => {
    const shell = landedShell()
    pressEntry(shell, partOf('App Header', 'IC-10'))
    expect(isLandingShown(shell), EL_17_FIT).toBe(false)
  })

  it(`${EL_17_MOVE} -- control: a pointer move alone keeps it`, () => {
    const shell = landedShell()
    const place = emptyPlace(shell)
    shell.send(pointerAt('move', place))
    shell.send(pointerAt('move', { x: place.x - 200, y: place.y - 100 }))
    keepsIt(shell, EL_17_MOVE)
  })
})

describe(`(c) the shell -- ${EL_17_STAR}`, () => {
  it('after scrolling and zooming with the mark kept, one click on another line\'s mark moves the mark to that line', () => {
    const shell = landedShell(CHAIN())
    const before = viewOf(shell)
    // STEP: scroll sideways and zoom both axes with the mark kept
    shell.send(wheelAt(middleOf(shell.rowArea()), wheelModifiersOf('MK-5')))
    shell.send(wheelAt(middleOf(shell.rowArea()), wheelModifiersOf('MK-2')))
    expect(viewOf(shell), 'premise: the view moved').not.toBe(before)
    keepsIt(shell, EL_17_VIEW_ONLY)
    expect(
      emphasisedLines(shell.svg(), displayScaleOf(shell)).some((one) => samePath(pointsAttr(one.attrs), routeOf(shell, 1, 2))),
      'premise: 1 -> 2 is the landed line',
    ).toBe(true)
    // STEP: one click on the mark of 2 -> 3
    clickAt(shell, markOf(shell, 2, 3))
    const emphasised = emphasisedLines(shell.svg(), displayScaleOf(shell))
    expect(emphasised.length, EL_17_STAR).toBe(1)
    expect(samePath(pointsAttr(emphasised[0]!.attrs), routeOf(shell, 2, 3)), EL_17_STAR).toBe(true)
  })
})

const ENVIRONMENT = { width: 1600, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }
const REGIONS = regionsFromScreen(
  ENVIRONMENT as unknown as Parameters<typeof regionsFromScreen>[0],
  SETTINGS_DEFAULTS as unknown as Parameters<typeof regionsFromScreen>[1],
) as ScreenRegions
const IN_ROW_AREA = middleOf((REGIONS as unknown as { readonly rowArea: Rect }).rowArea)

type Press = Pick<PointerPress, 'on' | 'pressRow'>
const pressOf = (on: ScreenPart | null, pressRow: string): Press => ({ on, pressRow }) as unknown as Press
const down = (button: PointerInput['button'] = 'left', held: Partial<InputModifiers> = {}): HumanInput =>
  pointerAt('down', IN_ROW_AREA, button, held)

const kept = (input: HumanInput, press: Press | null = null): boolean => isLandingMarkKeptBy(input, press, REGIONS)

describe('(d) the translator seam -- isLandingMarkKeptBy', () => {
  it.each(WHEEL_ROWS)(`${EL_17_WHEEL} -- the %s wheel is kept`, (row) => {
    expect(kept(wheelAt(IN_ROW_AREA, wheelModifiersOf(row))), EL_17_WHEEL).toBe(true)
  })

  it.each(MODIFIER_KEYS)(`${EL_17_MODIFIERS} -- %s alone is kept`, (key, held) => {
    expect(kept(modifierKey(key, held)), EL_17_MODIFIERS).toBe(true)
  })

  it.each(VIEW_KEY_ROWS)(`${EL_17_KEYS} -- the key of %s is kept`, (row) => {
    expect(kept(keyOf(row)), EL_17_KEYS).toBe(true)
  })

  it.each([
    ['Enter', { kind: 'key', key: 'Enter', modifiers: MODS } as KeyInput],
    ['F (SK-18)', keyOf('SK-18')],
    ['Ctrl + Q (no assignment)', { kind: 'key', key: 'Q', modifiers: { ...MODS, ctrl: true } } as KeyInput],
    ['+ with no modifier (no assignment)', { kind: 'key', key: '+', modifiers: MODS } as KeyInput],
  ] as const)(`${EL_17_CLEAR} -- the key %s is not kept`, (_name, input) => {
    expect(kept(input), EL_17_CLEAR).toBe(false)
  })

  it(`${EL_17_PAN} -- a middle press read as PTD-1 is kept`, () => {
    expect(kept(down('middle'), pressOf(null, 'PTD-1')), EL_17_PAN).toBe(true)
  })

  it(`${EL_17_PAN} -- a Ctrl-only left press read as PTD-1 is kept`, () => {
    expect(kept(down('left', { ctrl: true }), pressOf(null, 'PTD-1')), EL_17_PAN).toBe(true)
  })

  it(`${EL_17_CLEAR} -- a Ctrl-only left press on a selected Task body (PTD-7) is not kept`, () => {
    expect(kept(down('left', { ctrl: true }), pressOf(null, 'PTD-7')), EL_17_CLEAR).toBe(false)
  })

  it.each(['horizontal', 'vertical'] as const)(`${EL_17_SCROLLBAR} -- a press on the %s scrollbar is kept`, (axis) => {
    expect(kept(down(), pressOf(partOf('Scrollbars', null, { scrollbarAxis: axis }), 'PTD-5')), EL_17_SCROLLBAR).toBe(true)
  })

  it.each(['IC-12', 'IC-13', 'IC-14', 'IC-15', 'IC-104', 'IC-105'] as const)(
    `${EL_17_ENTRIES} -- a press on %s in the App Header is kept`,
    (entry) => {
      expect(kept(down(), pressOf(partOf('App Header', entry), 'PTD-5')), EL_17_ENTRIES).toBe(true)
    },
  )

  it(`${EL_17_ENTRIES} -- a press on IC-13 in the Command Palette is kept (wherever the entry sits)`, () => {
    expect(kept(down(), pressOf(partOf('Command Palette', 'IC-13'), 'PTD-5')), EL_17_ENTRIES).toBe(true)
  })

  it.each([
    ['a plain left press on an empty place', down(), pressOf(null, 'PTD-5')],
    ['a right press', down('right'), pressOf(null, 'PTD-5')],
    ['a press on IC-10', down(), pressOf(partOf('App Header', 'IC-10'), 'PTD-5')],
    ['a press on a row\'s fold entry (IC-77)', down(), pressOf(partOf('Row Title Panel', 'IC-77', { rowGroupId: ROW_A }), 'PTD-5')],
  ] as const)(`${EL_17_CLEAR} -- %s is not kept`, (_name, input, press) => {
    expect(kept(input, press), EL_17_CLEAR).toBe(false)
  })
})
