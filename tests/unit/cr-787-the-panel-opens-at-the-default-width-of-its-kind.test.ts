// CR-787 (spec-only): FR-052 -- the property panel starts at the default width of the kind it shows, the widest of several, and resets only when the kind changes.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { HumanInput, InputModifiers } from '../../src/adapter/input-command-translator/input-command-translator'
import { panelFacesOf, type ScreenPart, type ScreenSurface, type ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Selection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { SCREEN, taskGroupDocument, taskOf } from './cr-541-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-052
const FR_052_STARTS =
  '⭐ プロパティパネルの幅は画面の値とし、出している中身の種の既定の幅から始めること（MUST）'
const FR_052_ROWS =
  '文書の設定の面は `S-171`、表 T-016 の `適用先` が `Task`・`TaskGroup`・`CommentBox`・`HighlightBox`・`Dependency` の物は `S-602`〜`S-606`（この順）。'
const FR_052_WIDEST = 'いくつもの種を一度に出しているときは、その種の既定の幅のうち最も広いものから始める。'
const FR_052_KIND_CHANGE = '⭐ 出す中身の種が変わったら、新しい種の既定の幅へ戻すこと（MUST）'
const FR_052_SAME_KIND = '同じ種の別の物を出したときと、パネルを閉じて同じ種で開き直したときは、人が境界で決めた幅を保つ。'
const FR_052_WRITES_NOTHING = '⛔ プロパティパネルの幅を、文書にもブラウザの保管庫にも書いてはならない（MUST NOT）'
// see FR-072
const FR_072_FOLLOWS = '⚠️ **出しているあいだは、選択が動けば中身がそれに移る**'

const settingOf = (id: string): number => {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  return Number(/-?\d+(?:\.\d+)?/.exec(bare(row.by['既定'] ?? ''))?.[0] ?? Number.NaN)
}

// see T-206
const S_171 = settingOf('S-171')
const S_602 = settingOf('S-602')
const S_604 = settingOf('S-604')
const S_605 = settingOf('S-605')
const S_606 = settingOf('S-606')
const S_248 = settingOf('S-248')

// see T-109, FR-072
const IC_17 = specTable('T-109').rows.find((one) => bare(one.by['正'] ?? '') === 'FR-072')?.id ?? 'IC-17'

describe('CR-787 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-052 (MUST) -- the width starts at the default of the kind shown', FR_052_STARTS],
    ['FR-052 -- the kinds and their rows', FR_052_ROWS],
    ['FR-052 -- several kinds start at the widest', FR_052_WIDEST],
    ['FR-052 (MUST) -- a kind change goes back to the new default', FR_052_KIND_CHANGE],
    ['FR-052 -- the same kind and a reopen keep the dragged width', FR_052_SAME_KIND],
    ['FR-052 (MUST NOT) -- the width is written nowhere', FR_052_WRITES_NOTHING],
    ['FR-072 -- while shown, the content follows the selection', FR_072_FOLLOWS],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-206: every default width is a number at or above S-248, and the dependency default is the narrowest kind', () => {
    for (const width of [S_171, S_602, S_604, S_605, S_606]) {
      expect(Number.isFinite(width)).toBe(true)
      expect(width).toBeGreaterThanOrEqual(S_248)
    }
    expect(S_606, 'premise: a Task and a dependency line have different defaults, so the widest is visible').toBeLessThan(S_602)
    expect(S_602, 'premise: the settings face and a Task have different defaults').not.toBe(S_171)
  })
})

// see FR-052, JDG-2466
describe('FR-052 -- panelFacesOf names the kinds the panel shows, each once, in table T-016 order', () => {
  const selectionOf = (items: Selection['items']): Selection => ({ items, isOrdered: true })
  const shown = (selection: Selection, taskGroupIds: readonly string[] = []) =>
    panelFacesOf({ kind: 'selectionDisplayed', subject: { selection, taskGroupIds } } as never, selection, taskGroupIds)

  it('FR-052: a hidden panel shows no kind', () => {
    expect(panelFacesOf({ kind: 'hidden' } as never, selectionOf([]), [])).toEqual([])
  })

  it('FR-052 (MUST): the settings face is its own kind (S-171)', () => {
    expect(panelFacesOf({ kind: 'documentSettingsDisplayed' } as never, selectionOf([{ kind: 'task', uid: 1 }]), [])).toEqual(['documentSettings'])
  })

  it('FR-052 (MUST): each T-016 kind alone is one face', () => {
    expect(shown(selectionOf([{ kind: 'task', uid: 1 }]))).toEqual(['task'])
    expect(shown(selectionOf([]), ['g1'])).toEqual(['taskGroup'])
    expect(shown(selectionOf([{ kind: 'commentBox', id: 'c1' }]))).toEqual(['commentBox'])
    expect(shown(selectionOf([{ kind: 'highlightBox', id: 'h1' }]))).toEqual(['highlightBox'])
    expect(shown(selectionOf([{ kind: 'dependency', successorUid: 2, ordinal: 0 }]))).toEqual(['dependency'])
  })

  it('FR-052: several kinds come back once each, in the order Task, TaskGroup, CommentBox, HighlightBox, Dependency', () => {
    const selection = selectionOf([
      { kind: 'dependency', successorUid: 2, ordinal: 0 },
      { kind: 'highlightBox', id: 'h1' },
      { kind: 'task', uid: 1 },
      { kind: 'commentBox', id: 'c1' },
      { kind: 'task', uid: 2 },
    ])
    expect(shown(selection)).toEqual(['task', 'commentBox', 'highlightBox', 'dependency'])
  })
})

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const TASK_GROUPS = [
  { id: 'g1', parentId: null },
  { id: 'g2', parentId: null },
  { id: 'g3', parentId: null },
  { id: 'g4', parentId: null },
  { id: 'g5', parentId: null },
  { id: 'g6', parentId: null },
]
const HIGHLIGHT = {
  id: 'h1', start: '2026-04-02T08:00:00', finish: '2026-04-28T17:00:00', topTaskGroupId: 'g4', bottomTaskGroupId: 'g5',
  strokeColor: null, cornerRadiusPx: null,
}
const COMMENT = { id: 'c1', leaderShapeKind: null, text: 'a body', anchorDate: '2026-04-20', anchorTaskGroupId: 'g6', bodyOffsetPx: null }
const LINK = { predecessorUid: 1, linkType: 1, linkLag: null, lagFormat: null, carry: {}, carryElements: [] }

function documentOf(): Record<string, any> {
  const document = taskGroupDocument(TASK_GROUPS, { isProgressMarkerVisible: false }, {
    taskGroupMembers: [1, 2, 3].map((uid) => ({ taskUid: uid, taskGroupId: `g${String(uid)}` })),
    highlightBoxes: [HIGHLIGHT],
    commentBoxes: [COMMENT],
  })
  document.schedule.tasks = [
    taskOf(1, { start: '2026-04-06T08:00:00', finish: '2026-04-10T17:00:00' }),
    taskOf(2, { start: '2026-04-20T08:00:00', finish: '2026-04-24T17:00:00', dependencies: [LINK] }),
    taskOf(3, { start: '2026-04-06T08:00:00', finish: '2026-04-24T17:00:00' }),
  ]
  return document
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

interface Point {
  readonly x: number
  readonly y: number
}

interface Bench {
  readonly loop: FrameLoop
  click(at: Point, modifiers?: Partial<InputModifiers>): void
  doubleClick(at: Point): void
  key(which: string): void
  pressIc17(): void
  dragBoundaryBy(dx: number): void
  view(): ScreenView
  width(): number
  isWidthStored(): boolean
}

function bench(): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const views: ScreenView[] = []
  let aimed: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: (x, y) => {
      if (aimed !== null) return aimed
      const view = views[views.length - 1]
      const divider = view?.frame.dividers.find(
        (one) => x >= one.band.x && x < one.band.x + one.band.width && y >= one.band.y && y < one.band.y + one.band.height,
      )
      if (divider === undefined) return null
      return {
        part: 'Panel Divider', entry: null, format: null, taskGroupId: null, resourceUid: null,
        dividerPanel: divider.panel, noticeDismissKey: null,
      } as unknown as ScreenPart
    },
  }
  const loop = frameLoop({ showSvg: () => undefined } as never, documentOf() as never, SCREEN, {
    surface,
    language: 'ja',
    // WHY: stands in for the host that focuses the field MK-13 names; this bench does not draw the DOM.
    focusPropertyField: () => true,
  })
  drain()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  const pointer = (phase: 'down' | 'move' | 'up', at: Point, clickCount = 1, modifiers: Partial<InputModifiers> = {}): HumanInput =>
    ({ kind: 'pointer', phase, button: 'left', x: at.x, y: at.y, modifiers: { ...NO_MODIFIERS, ...modifiers }, clickCount }) as HumanInput
  const view = (): ScreenView => {
    const last = views[views.length - 1]
    if (last === undefined) throw new Error('the surface was given no description')
    return last
  }
  return {
    loop,
    click: (at, modifiers = {}) => {
      send(pointer('down', at, 1, modifiers))
      send(pointer('up', at, 1, modifiers))
    },
    doubleClick: (at) => {
      send(pointer('down', at))
      send(pointer('up', at))
      send(pointer('down', at, 2))
      send(pointer('up', at, 2))
    },
    key: (which) => send({ kind: 'key', key: which, modifiers: NO_MODIFIERS }),
    pressIc17: () => {
      aimed = { part: 'App Header', entry: IC_17, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as unknown as ScreenPart
      send(pointer('down', { x: 700, y: 20 }))
      send(pointer('up', { x: 700, y: 20 }))
      aimed = null
    },
    dragBoundaryBy: (dx) => {
      const band = view().frame.dividers.find((one) => one.panel === 'propertiesPanel')?.band
      if (band === undefined) throw new Error('no Panel Divider band is drawn for the property panel')
      const at = { x: band.x + band.width / 2, y: band.y + band.height / 2 }
      send(pointer('down', at))
      send(pointer('move', { x: at.x + dx / 2, y: at.y }))
      send(pointer('move', { x: at.x + dx, y: at.y }))
      send(pointer('up', { x: at.x + dx, y: at.y }))
    },
    view,
    width: () => loop.current()?.regions.propertiesPanel.width ?? Number.NaN,
    isWidthStored: () => Object.prototype.hasOwnProperty.call(loop.document().documentSettings, 'propertyPanelWidth'),
  }
}

const geometryOf = (built: Bench) => {
  const found = built.loop.current()?.geometry
  if (found === undefined) throw new Error('the loop drew no frame')
  return found
}

const hitAt = (built: Bench, at: Point) => itemAtPointer(geometryOf(built), at.x, at.y, grabSizesOf())?.item ?? null

function onTask(built: Bench, uid: number): Point {
  const placement = built.loop.current()?.layout.placements.find((one) => one.taskUid === uid)
  if (placement === undefined) throw new Error(`Task ${String(uid)} is not placed`)
  return { x: placement.x + placement.width / 2, y: placement.y + placement.height / 2 }
}

// see GR-14
// WHY: a comment box is grabbed on its body.
function onComment(built: Bench): Point {
  const body = geometryOf(built).commentBoxes.find((one) => one.id === COMMENT.id)?.body
  if (body === undefined) throw new Error('the comment box is not drawn')
  return { x: body.x + body.width / 2, y: body.y + body.height / 2 }
}

// see GR-14
// WHY: a highlight box is grabbed on its frame; the press lands on the middle of its top edge.
function onHighlight(built: Bench): Point {
  const box = geometryOf(built).highlightBoxes.find((one) => one.id === HIGHLIGHT.id)?.box
  if (box === undefined) throw new Error('the highlight box is not drawn')
  return { x: box.x + box.width / 2, y: box.y }
}

// WHY: walk the drawn path of the one line until the hit test answers the line, so the press lands on it.
function onDependency(built: Bench): Point {
  const line = geometryOf(built).dependencies.find((one) => one.successorUid === 2)
  if (line === undefined) throw new Error('the dependency line is not drawn')
  const points = (line.drawnPoints.length > 1 ? line.drawnPoints : line.points) as readonly Point[]
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as Point
    const b = points[i] as Point
    for (const t of [0.5, 0.25, 0.75, 0.1, 0.9]) {
      const at = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
      if (hitAt(built, at)?.kind === 'dependency') return at
    }
  }
  throw new Error('no point of the dependency line answers the hit test')
}

describe('CR-787 -- the premises of the bench', () => {
  it('the aimed points take the Task, the comment box, the highlight box and the dependency line', () => {
    const built = bench()
    expect(hitAt(built, onTask(built, 1))).toMatchObject({ kind: 'task', taskUid: 1 })
    expect(hitAt(built, onComment(built))).toMatchObject({ kind: 'commentBox', id: COMMENT.id })
    expect(hitAt(built, onHighlight(built))).toMatchObject({ kind: 'highlightBox', id: HIGHLIGHT.id })
    expect(hitAt(built, onDependency(built))).toMatchObject({ kind: 'dependency', successorUid: 2 })
    expect(built.view().propertiesPanel, 'the panel starts hidden (S-99h)').toBeNull()
  })
})

describe(`FR-052 -- ${FR_052_STARTS}`, () => {
  it('FR-052 (MUST): IC-17 opens the settings face at S-171', () => {
    const built = bench()
    built.pressIc17()
    expect(built.view().propertiesPanel?.showing).toBe('documentSettings')
    expect(built.width()).toBeCloseTo(S_171, 6)
  })

  it('FR-052 (MUST): MK-13 on a Task opens the panel at S-602', () => {
    const built = bench()
    built.doubleClick(onTask(built, 1))
    expect(built.width()).toBeCloseTo(S_602, 6)
  })

  it('FR-052 (MUST): MK-13 on a comment box opens the panel at S-604', () => {
    const built = bench()
    built.doubleClick(onComment(built))
    expect(built.view().propertiesPanel, 'premise: MK-13 put the panel up').not.toBeNull()
    expect(built.width()).toBeCloseTo(S_604, 6)
  })

  it('FR-052 (MUST): MK-13 on a highlight box opens the panel at S-605', () => {
    const built = bench()
    built.doubleClick(onHighlight(built))
    expect(built.view().propertiesPanel, 'premise: MK-13 put the panel up').not.toBeNull()
    expect(built.width()).toBeCloseTo(S_605, 6)
  })

  it('FR-052 (MUST): a dependency line chosen while the panel shows a Task is shown at S-606', () => {
    const built = bench()
    built.doubleClick(onTask(built, 1))
    built.click(onDependency(built))
    expect(built.width()).toBeCloseTo(S_606, 6)
  })

  it(`FR-052: ${FR_052_WIDEST} -- a Task added to a shown dependency line starts at the wider S-602`, () => {
    const built = bench()
    built.doubleClick(onTask(built, 1))
    built.click(onDependency(built))
    expect(built.width(), 'premise: the dependency line alone is S-606').toBeCloseTo(S_606, 6)
    built.click(onTask(built, 3), { shift: true })
    expect(Math.max(S_602, S_606)).toBe(S_602)
    expect(built.width()).toBeCloseTo(Math.max(S_602, S_606), 6)
  })

  it('FR-052 (MUST NOT): moving between kinds writes no width to the document and makes no edit', () => {
    const built = bench()
    built.doubleClick(onTask(built, 1))
    built.click(onDependency(built))
    built.doubleClick(onComment(built))
    expect(built.isWidthStored(), FR_052_WRITES_NOTHING).toBe(false)
    expect(built.loop.hasUnsavedEdits(), `${FR_052_WRITES_NOTHING} -- FR-100`).toBe(false)
  })
})

describe(`FR-052 -- ${FR_052_KIND_CHANGE}`, () => {
  it('FR-052 (MUST): a dragged Task width goes back to S-604 when a comment box is shown', () => {
    const built = bench()
    built.doubleClick(onTask(built, 1))
    built.dragBoundaryBy(-30)
    expect(built.width(), 'premise: the drag moved the width').toBeCloseTo(S_602 + 30, 6)
    built.doubleClick(onComment(built))
    expect(built.width()).toBeCloseTo(S_604, 6)
  })

  it('FR-052 (MUST): a dragged Task width goes back to S-606 when the selection moves to a dependency line', () => {
    const built = bench()
    built.doubleClick(onTask(built, 1))
    built.dragBoundaryBy(-30)
    built.click(onDependency(built))
    expect(built.width()).toBeCloseTo(S_606, 6)
  })

  it('FR-052 (MUST): a dragged settings-face width goes back to S-602 when a Task is chosen (FR-072 moves the content)', () => {
    const built = bench()
    built.pressIc17()
    built.dragBoundaryBy(-30)
    expect(built.width(), 'premise: the drag moved the width').toBeCloseTo(S_171 + 30, 6)
    built.click(onTask(built, 1))
    expect(built.view().propertiesPanel?.showing, 'premise: the content moved to the selection').toBe('selection')
    expect(built.width()).toBeCloseTo(S_602, 6)
  })

  it('FR-052 (MUST): a dragged Task width goes back to S-171 when IC-17 shows the settings face', () => {
    const built = bench()
    built.doubleClick(onTask(built, 1))
    built.dragBoundaryBy(-30)
    built.pressIc17()
    expect(built.width()).toBeCloseTo(S_171, 6)
  })
})

describe(`FR-052 -- ${FR_052_SAME_KIND}`, () => {
  it('FR-052: another Task shown after a drag keeps the dragged width', () => {
    const built = bench()
    built.doubleClick(onTask(built, 1))
    built.dragBoundaryBy(-30)
    built.click(onTask(built, 3))
    expect(hitAt(built, onTask(built, 3)), 'premise: the press took Task 3').toMatchObject({ kind: 'task', taskUid: 3 })
    expect(built.width()).toBeCloseTo(S_602 + 30, 6)
  })

  it('FR-052: closed by Esc and opened again on a Task, the panel keeps the dragged width', () => {
    const built = bench()
    built.doubleClick(onTask(built, 1))
    built.dragBoundaryBy(-30)
    built.key('Esc')
    expect(built.view().propertiesPanel, 'premise: the panel is closed').toBeNull()
    built.doubleClick(onTask(built, 3))
    expect(built.width()).toBeCloseTo(S_602 + 30, 6)
  })

  it('FR-052: closed and opened again on the settings face, the panel keeps the dragged settings width', () => {
    const built = bench()
    built.pressIc17()
    built.dragBoundaryBy(-30)
    built.pressIc17()
    expect(built.view().propertiesPanel, 'premise: a second IC-17 press closed the panel (FR-072)').toBeNull()
    built.pressIc17()
    expect(built.width()).toBeCloseTo(S_171 + 30, 6)
  })
})

