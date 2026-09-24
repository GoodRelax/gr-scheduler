// DFC-806 / JDG-410: a double click on a highlight box puts the panel up and focuses its frame colour field (MK-13, PR-22).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { domScreenSurface } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import {
  byRole,
  selfAndDescendants,
  stage,
  surfaceOf,
  wiringOf,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
import { pointerOf, rowDocument, taskOf, SCREEN } from './cr-541-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const rowIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// see T-023, MK-13
const MK_13 = rowIn('T-023', 'MK-13').cells.join(' ')
// see JDG-410, DFC-806
// TRAP: red until the MK-13 edit lands; the wording is the one the implementer was briefed to write.
const MK_13_HIGHLIGHT_BOX =
  'ハイライトボックス ＝ プロパティパネルを出し、枠の色の欄（表 T-016 の `PR-22`）に焦点を置くこと（MUST）'
const MK_13_COMMENT_BOX = '本文の欄（表 T-016 の `PR-21`）を編集できる状態にして焦点を置くこと（MUST）'

// see T-016, PR-21, PR-22
const PR_21 = rowIn('T-016', 'PR-21')
const PR_22 = rowIn('T-016', 'PR-22')
const BODY_ROW = PR_21.id
const FRAME_ROW = PR_22.id
// see T-103, U-25
const PROPERTIES_PANEL = bare(rowIn('T-103', 'U-25').by['確定名（英）'] ?? '')

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const ROWS = [
  { id: 'g1', parentId: null },
  { id: 'g2', parentId: null },
  { id: 'g3', parentId: null },
  { id: 'g4', parentId: null },
  { id: 'g5', parentId: null },
]
// WHY: tasks only on g1..g3; the comment box stands on g5, clear of every bar and of the highlight box.
const TASKED_ROWS = ROWS.slice(0, 3)
const OPENER_TASK_UID = 3

// WHY: the highlight box starts and ends outside the bars, so its left edge is not a bar's end (GA-3 / GA-4).
const HIGHLIGHT = {
  id: 'h1',
  startDate: '2026-04-02T08:00:00',
  endDate: '2026-05-06T17:00:00',
  topGroupId: 'g1',
  bottomGroupId: 'g2',
  strokeColor: null,
  cornerRadiusPx: null,
}
const COMMENT = {
  id: 'c1',
  leaderShapeKind: null,
  text: 'a body',
  anchorDate: '2026-04-20',
  anchorGroupId: 'g5',
  bodyOffsetPx: null,
}

function documentOf(strokeColor: string | null): Record<string, any> {
  const document = rowDocument(ROWS, { progressMarkerVisible: false }, {
    taskGroupMembers: TASKED_ROWS.map((one, index) => ({ taskUid: index + 1, groupId: one.id, stackOrder: null })),
    highlightBoxes: [{ ...HIGHLIGHT, strokeColor }],
    commentBoxes: [COMMENT],
  })
  document.schedule.tasks = TASKED_ROWS.map((_one, index) =>
    taskOf(index + 1, { name: `Task${index + 1}`, start: '2026-04-06T08:00:00', finish: '2026-04-30T17:00:00' }),
  )
  return document
}

interface Point {
  readonly x: number
  readonly y: number
}

interface Bench {
  readonly loop: FrameLoop
  readonly built: Stage
  // WHY: every row the focus seam was asked for, in order.
  readonly asked: string[]
  click(at: Point): void
  doubleClick(at: Point): void
  view(): ScreenView
}

function fieldDrawn(built: Stage, row: string): boolean {
  let root
  try {
    root = built.root()
  } catch {
    return false
  }
  const panel = byRole(root, PROPERTIES_PANEL)[0]
  return panel !== undefined && selfAndDescendants(panel).some((one) => one.getAttribute('data-field-row') === row)
}

interface BenchOptions {
  // WHY: false stands a fake host in for the seam; true wires the DOM surface's own focusPropertyField, as the shell does.
  readonly realFocus?: boolean
  readonly strokeColor?: string | null
}

function bench(options: BenchOptions = {}): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const built = stage({ 'App Header': SCREEN.appHeaderHeight })
  let held: ((row: string) => boolean) | null = null
  built.surface = domScreenSurface({
    ...wiringOf(built, { preference: 'light', hue: 214 }),
    holdFocusPropertyField: (focus) => {
      held = focus
    },
  })
  const drawn = surfaceOf(built)
  const views: ScreenView[] = []
  const asked: string[] = []
  const aimed: ScreenPart | null = null
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
      drawn.showScreenView(view)
    },
    readDialogueInput: () => drawn.readDialogueInput(),
    readFieldCommit: () => drawn.readFieldCommit(),
    hasUnsettledTextEntry: () => drawn.hasUnsettledTextEntry(),
    readFieldEditNotices: () => (drawn as unknown as { readFieldEditNotices?: () => unknown[] }).readFieldEditNotices?.() ?? [],
    readScreenPartAt: () => aimed,
  } as unknown as ScreenSurface
  const loop = frameLoop({ showSvg: () => undefined } as never, documentOf(options.strokeColor ?? null) as never, SCREEN, {
    surface,
    language: 'ja',
    // WHY: stands in for the host: a drawn field takes the focus (true); a field the panel did not draw is not there (null).
    focusPropertyField: (row: string) => {
      asked.push(row)
      if (options.realFocus === true) return held === null ? null : (held as (row: string) => boolean)(row)
      return fieldDrawn(built, row) ? true : null
    },
  })
  drain()
  const send = (input: Parameters<FrameLoop['receiveInput']>[0]): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    built,
    asked,
    click: (at) => {
      send(pointerOf('down', at.x, at.y))
      send(pointerOf('up', at.x, at.y))
    },
    // WHY: both clicks are sent, as a browser delivers them: clickCount 1 chooses, clickCount 2 is MK-13's.
    doubleClick: (at) => {
      send(pointerOf('down', at.x, at.y))
      send(pointerOf('up', at.x, at.y))
      send({ ...pointerOf('down', at.x, at.y), clickCount: 2 } as never)
      send({ ...pointerOf('up', at.x, at.y), clickCount: 2 } as never)
    },
    view: () => views[views.length - 1] as ScreenView,
  }
}

const geometryOf = (built: Bench) => {
  const found = built.loop.current()?.geometry
  if (found === undefined) throw new Error('the loop drew no frame')
  return found
}

// see GR-14
// WHY: a highlight box is grabbed on its frame and corners, so the press lands on the left edge.
function onTheHighlightFrame(built: Bench): Point {
  const box = geometryOf(built).highlightBoxes.find((one) => one.id === HIGHLIGHT.id)?.box
  if (box === undefined) throw new Error('the highlight box is not drawn')
  return { x: box.x, y: box.y + box.height / 2 }
}

// see GR-14
// WHY: a comment box is grabbed on its body.
function onTheCommentBody(built: Bench): Point {
  const body = geometryOf(built).commentBoxes.find((one) => one.id === COMMENT.id)?.body
  if (body === undefined) throw new Error('the comment box is not drawn')
  return { x: body.x + body.width / 2, y: body.y + body.height / 2 }
}

function onTheOpenerTask(built: Bench): Point {
  const placement = built.loop.current()?.layout.placements.find((one) => one.taskUid === OPENER_TASK_UID)
  if (placement === undefined) throw new Error('the opener task is not drawn')
  return { x: placement.x + placement.width / 2, y: placement.y + placement.height / 2 }
}

const hitAt = (built: Bench, at: Point) => itemAtPointer(geometryOf(built), at.x, at.y, grabSizesOf())?.item ?? null
const panelRows = (built: Bench): string[] => built.view().propertiesPanel?.fields.map((one) => one.row) ?? []

describe('the manuscript and the ruling these cases read', () => {
  it('MK-13 still settles the comment box on 本文の欄 (PR-21), and PR-22 is HighlightBox.strokeColor', () => {
    expect(MK_13).toContain(MK_13_COMMENT_BOX)
    expect(bare(PR_21.by['対象'] ?? '')).toBe('CommentBox')
    expect(bare(PR_22.by['対象'] ?? '')).toBe('HighlightBox')
    expect(PR_22.by['列（`GRS JSON`）'] ?? '').toContain('`strokeColor`')
  })

  it(`MK-13 (JDG-410): ${MK_13_HIGHLIGHT_BOX}`, () => {
    // see JDG-410, DFC-806
    expect(REQUIREMENTS.includes(MK_13_HIGHLIGHT_BOX), 'the clause stands in 01-04-requirements.md').toBe(true)
    expect(MK_13, 'the clause stands in the MK-13 row itself').toContain(MK_13_HIGHLIGHT_BOX)
  })

  it('premise: the aimed points take the highlight box and the comment box', () => {
    const built = bench()
    expect(hitAt(built, onTheHighlightFrame(built))).toEqual({ kind: 'highlightBox', id: HIGHLIGHT.id })
    expect(hitAt(built, onTheCommentBody(built))).toEqual({ kind: 'commentBox', id: COMMENT.id })
    expect(built.asked, 'nothing asked for a field before any press').toEqual([])
  })
})

describe('MK-13 (JDG-410) -- a double click on a highlight box focuses its frame colour field', () => {
  it('MUST: the panel is put up and it draws the frame colour field', () => {
    // see MK-13, PR-22
    const built = bench()
    built.doubleClick(onTheHighlightFrame(built))
    expect(built.view().propertiesPanel, 'the panel is up').not.toBeNull()
    expect(panelRows(built)).toContain(FRAME_ROW)
    expect(fieldDrawn(built.built, FRAME_ROW), `data-field-row="${FRAME_ROW}" is drawn`).toBe(true)
  })

  it('MUST: the focus is asked for PR-22 and for no other field', () => {
    // see MK-13, PR-22, IN-5a
    const built = bench()
    built.doubleClick(onTheHighlightFrame(built))
    expect(built.asked.at(-1), 'the last field asked for').toBe(FRAME_ROW)
    expect([...new Set(built.asked)]).toEqual([FRAME_ROW])
  })
})

describe('the controls -- what a repair that went too far would break', () => {
  it('a single click on the highlight box, with no panel up, asks for no field', () => {
    // see MK-13
    // WHY: only the double click places the focus.
    const built = bench()
    built.click(onTheHighlightFrame(built))
    expect(built.asked).toEqual([])
  })

  it('a single click on the highlight box while the panel is up shows PR-22 but does not move the focus into it', () => {
    // see MK-13, FR-072
    const built = bench()
    built.doubleClick(onTheOpenerTask(built))
    const before = [...built.asked]
    expect(built.view().propertiesPanel, 'premise: the task double click put the panel up').not.toBeNull()
    built.click(onTheHighlightFrame(built))
    expect(panelRows(built), 'premise: the panel now shows the highlight box').toContain(FRAME_ROW)
    expect(built.asked, 'no field asked for by the single click').toEqual(before)
  })

  it('a double click on a comment box still focuses its body field (PR-21), not PR-22', () => {
    // see MK-13, PR-21, FR-097
    const built = bench()
    built.doubleClick(onTheCommentBody(built))
    expect(built.view().propertiesPanel, 'the panel is up').not.toBeNull()
    expect([...new Set(built.asked)]).toEqual([BODY_ROW])
  })
})

// see T-016
// WHY: the field row an element belongs to, read off itself or the nearest ancestor that carries one.
function fieldRowOf(element: FakeElement | null): string | null {
  for (let at = element; at !== null; at = at.parentNode) {
    const row = at.getAttribute('data-field-row')
    if (row !== null) return row
  }
  return null
}

const inPanel = (built: Bench, element: FakeElement | null): boolean => {
  const panel = byRole(built.built.root(), PROPERTIES_PANEL)[0]
  return panel !== undefined && element !== null && selfAndDescendants(panel).includes(element)
}

const swatchesOf = (built: Bench, row: string): FakeElement[] => {
  const panel = byRole(built.built.root(), PROPERTIES_PANEL)[0]
  if (panel === undefined) return []
  return selfAndDescendants(panel).filter(
    (one) => fieldRowOf(one) === row && (one.getAttribute('data-colour-choice') ?? '') !== '',
  )
}
const pressedIn = (built: Bench, row: string): FakeElement[] => {
  const panel = byRole(built.built.root(), PROPERTIES_PANEL)[0]
  if (panel === undefined) return []
  return selfAndDescendants(panel).filter((one) => fieldRowOf(one) === row && one.getAttribute('aria-pressed') === 'true')
}
const TEXT_CONTROL_TAGS = ['TEXTAREA', 'INPUT']
const CUSTOM_STROKE = '#123456'

describe('MK-13 (JDG-410) through the real seam -- the focus lands in the frame colour field', () => {
  it('no stroke colour set: the focus lands on the pressed control of the PR-22 field', () => {
    // see MK-13, PR-22, CV-9
    const built = bench({ realFocus: true })
    built.doubleClick(onTheHighlightFrame(built))
    const active = built.built.world.activeElement
    expect(fieldRowOf(active), 'the focused element belongs to PR-22').toBe(FRAME_ROW)
    expect(inPanel(built, active), 'and stands in the panel').toBe(true)
    const pressed = pressedIn(built, FRAME_ROW)
    expect(pressed.length, 'premise: the field marks the value it holds').toBeGreaterThan(0)
    expect(pressed, 'the focused control is the pressed one').toContain(active)
  })

  it('a custom stroke colour: the focus lands on the first swatch of the PR-22 field', () => {
    // see MK-13, PR-22, CV-9
    const built = bench({ realFocus: true, strokeColor: CUSTOM_STROKE })
    built.doubleClick(onTheHighlightFrame(built))
    const active = built.built.world.activeElement
    expect(fieldRowOf(active), 'the focused element belongs to PR-22').toBe(FRAME_ROW)
    expect(inPanel(built, active), 'and stands in the panel').toBe(true)
    expect(active, 'the first swatch').toBe(swatchesOf(built, FRAME_ROW)[0])
  })

  it('control: a double click on a comment box puts the focus on the PR-21 text control', () => {
    // see MK-13, PR-21, FR-097
    const built = bench({ realFocus: true })
    built.doubleClick(onTheCommentBody(built))
    const active = built.built.world.activeElement
    expect(fieldRowOf(active), 'the focused element belongs to PR-21').toBe(BODY_ROW)
    expect(inPanel(built, active), 'and stands in the panel').toBe(true)
    expect(TEXT_CONTROL_TAGS, `the focused tag is ${active?.tagName ?? 'none'}`).toContain(active?.tagName ?? '')
  })

  it('control: a single click on the highlight box moves no focus into the panel', () => {
    // see MK-13
    const built = bench({ realFocus: true })
    built.click(onTheHighlightFrame(built))
    const active = built.built.world.activeElement
    expect(active === null || !inPanel(built, active), 'nothing in the panel is focused').toBe(true)
  })
})
