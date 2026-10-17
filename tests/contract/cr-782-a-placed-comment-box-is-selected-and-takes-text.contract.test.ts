// CR-782 spec-only tests: placing a comment box (AR-5) selects it, puts the panel up and focuses PR-21.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressedRowOf,
  type InputContext,
  type PointerInput,
  type PointerPhase,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { leaderOf } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { editDocument, NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { NO_MODIFIERS, restoreAnimationFrames } from '../unit/cr-646-stage'
import { april, bandOf, columnLeft, COMMENT_ID, commentDrawn, commentRow, documentWith, frameOf, groupOf, LIMITS } from './cr-777-stage'
import { specTable, unbroken } from './spec-table'

afterEach(restoreAnimationFrames)

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-019, AR-5, PR-21
const PLACED_IS_SELECTED_AND_FOCUSED =
  '置いたコメントボックスを選び、プロパティパネルを出して本文の欄（`_assets/tbl-property-items.md` の 表 T-016 の `PR-21`）に焦点を置くこと（MUST）'
const BODY_FIELD_ROW = 'PR-21'

// see FR-019, CM-46, S-600
const PLACED_OFFSET_CLAUSE = 'は、本文のずれを `{ dx: S-600, dy: −S-600 }` とすること（MUST）'

// see T-217, S-600
const S_600 = ((): number => {
  const row = specTable('T-217').rows.find((one) => one.id === 'S-600')
  const found = /[0-9]+/.exec((row?.by['既定'] ?? '').replace(/`/g, ''))
  if (found === null) throw new Error('table T-217 row S-600 holds no number')
  return Number(found[0])
})()

type Loose = Record<string, unknown>

const FREE_ROW = groupOf(3)

// see AR-5
function pointerAt(phase: PointerPhase, x: number, y: number): PointerInput {
  return { kind: 'pointer', phase, button: 'left', x, y, modifiers: { ...NO_MODIFIERS }, clickCount: 1 }
}

// WHY: a free point in the band of task group 3, clear of every figure point (the AR-5 snap reach).
function freePointOf(loop: FrameLoop): { x: number; y: number } {
  const band = bandOf(loop, FREE_ROW)
  return { x: columnLeft(loop, april(27)) + 0.25 * frameOf(loop).layout.pxPerDay, y: band.y + 0.3 * band.height }
}

function armedPressAt(document: Document, loop: FrameLoop, at: { x: number; y: number }): TranslatedInput {
  const values = frameOf(loop)
  const base: InputContext = {
    document,
    layout: values.layout,
    geometry: values.geometry,
    regions: values.regions,
    screen: { ...emptyScreenSession.screen, armModeState: { kind: 'commentBoxArmed' } },
    selection: emptySelection(),
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: april(1),
    newTaskGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  }
  const down = pointerAt('down', at.x, at.y)
  const pressed = { at: down, hit: null, on: null, pressRow: pressedRowOf({ at: down, hit: null }, base) }
  return commandFromInput(pointerAt('up', at.x, at.y), { ...base, pressed })
}

describe(`FR-019: ${PLACED_IS_SELECTED_AND_FOCUSED}`, () => {
  it('the clause stands verbatim in the requirements', () => {
    expect(REQUIREMENTS).toContain(PLACED_IS_SELECTED_AND_FOCUSED)
  })
})

describe(`AR-5: ${PLACED_IS_SELECTED_AND_FOCUSED} -- the press hands the placed box over as created`, () => {
  it('a press on empty ground with the comment box armed writes one createCommentBox and names that box as created', () => {
    const document = documentWith([])
    const built = stageFor(document)
    const answer = armedPressAt(built.loop.document(), built.loop, freePointOf(built.loop))
    const action = answer.action
    if (action === null || action.kind !== 'changeDocument') throw new Error('premise: the press changed the document')
    const writes = action.writes.flat()
    const placed = writes.filter((one) => one.kind === 'createCommentBox')
    expect(placed, 'one comment box is placed').toHaveLength(1)
    const placedId = (placed[0] as unknown as Loose)['commentBoxId']
    expect(placedId).toBe('comment-box-minted-outside')
    expect(action.created, 'created names the placed box').toEqual({ kind: 'commentBox', id: placedId })
  })
})

// see SD-3, T-293
function sessionWith(selectionState: Loose): ScreenSession {
  const base = emptyScreenSession as unknown as Loose
  return { ...base, selection: { ...(base['selection'] as Loose), selectionState } } as unknown as ScreenSession
}

function selectionStateOf(session: ScreenSession): Loose {
  return ((session as unknown as Loose)['selection'] as Loose)['selectionState'] as Loose
}

const CREATED = { type: 'createdCommentBoxSelected', createdCommentBoxId: 'box-new' } as unknown as SessionEvent

// see SL-7b
const OTHER_PICK = { items: [{ kind: 'task', uid: 3 }, { kind: 'commentBox', id: 'box-old' }], isOrdered: true }

describe(`selection region: createdCommentBoxSelected -- ${PLACED_IS_SELECTED_AND_FOCUSED}`, () => {
  it('nothingSelected becomes objectsSelected holding exactly the placed box', () => {
    const before = sessionWith({ kind: 'nothingSelected' })
    const after = selectionStateOf(advanceScreenSession(before, CREATED).state)
    expect(after['kind']).toBe('objectsSelected')
    expect((after['selectedObjects'] as Loose)['items']).toEqual([{ kind: 'commentBox', id: 'box-new' }])
  })

  it('objectsSelected stays objectsSelected and the placed box replaces the whole selection', () => {
    const before = sessionWith({ kind: 'objectsSelected', selectedObjects: OTHER_PICK })
    const after = selectionStateOf(advanceScreenSession(before, CREATED).state)
    expect(after['kind']).toBe('objectsSelected')
    expect((after['selectedObjects'] as Loose)['items']).toEqual([{ kind: 'commentBox', id: 'box-new' }])
  })

  it('names no effect', () => {
    const before = sessionWith({ kind: 'nothingSelected' })
    expect(advanceScreenSession(before, CREATED).effects).toEqual(advanceScreenSession(before, { type: 'selectionCleared' } as unknown as SessionEvent).effects)
  })
})

// WHY: this stage is the cr-646 one with the property-field focus seam added; the seam answers true only for a row the panel draws.
interface Bench {
  readonly loop: FrameLoop
  readonly asked: string[]
  pressEntry(surface: string, entry: string): void
  click(x: number, y: number): void
  lastView(): ScreenView | null
}

const SCREEN: FrameEnvironment = { width: 1400, height: 900, appHeaderHeight: 0, scrollbarThickness: 0 }
const PX_PER_DAY = 20

function stageFor(document: Document): Bench {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  let part: ScreenPart | null = null
  const views: ScreenView[] = []
  const asked: string[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => void views.push(view),
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => part,
  }
  const wiring: ScreenWiring = {
    surface,
    language: 'en',
    focusPropertyField: (row: string) => {
      asked.push(row)
      const panel = views[views.length - 1]?.propertiesPanel ?? null
      return panel !== null && panel.fields.some((one) => one.row === row) ? true : null
    },
  }
  const drawn = structuredClone(document) as unknown as Loose
  drawn['documentSettings'] = { ...(drawn['documentSettings'] as Loose), zoomX: PX_PER_DAY / 50 }
  const loop = frameLoop({ showSvg: () => undefined } as never, drawn as unknown as Document, SCREEN, wiring)
  drain()
  const send = (input: PointerInput): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    asked,
    pressEntry: (surfaceName, entry) => {
      part = { part: surfaceName, entry, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as unknown as ScreenPart
      send(pointerAt('down', 700, 20))
      send(pointerAt('up', 700, 20))
      part = null
    },
    click: (x, y) => {
      part = null
      send(pointerAt('down', x, y))
      send(pointerAt('up', x, y))
    },
    lastView: () => views[views.length - 1] ?? null,
  }
}

describe(`FR-019 through the shell: ${PLACED_IS_SELECTED_AND_FOCUSED}`, () => {
  function placed(): Bench {
    const built = stageFor(documentWith([]))
    built.pressEntry('Command Palette', 'IC-35')
    const at = freePointOf(built.loop)
    built.click(at.x, at.y)
    return built
  }

  it('premise: the press placed one comment box', () => {
    expect(placed().loop.document().schedule.commentBoxes).toHaveLength(1)
  })

  it('the properties panel is up, shows the selection, and draws the body field', () => {
    const panel = placed().lastView()?.propertiesPanel ?? null
    expect(panel, 'the panel is up').not.toBeNull()
    expect(panel?.showing).toBe('selection')
    expect(panel?.fields.map((one) => one.row)).toContain(BODY_FIELD_ROW)
  })

  it('the field focus asked for is PR-21 and no other', () => {
    const built = placed()
    expect(built.asked.at(-1)).toBe(BODY_FIELD_ROW)
    expect([...new Set(built.asked)]).toEqual([BODY_FIELD_ROW])
  })

  it('control: arming the comment box alone asks for no field', () => {
    const built = stageFor(documentWith([]))
    built.pressEntry('Command Palette', 'IC-35')
    expect(built.asked).toEqual([])
  })
})

describe(`FR-019: ${PLACED_OFFSET_CLAUSE}`, () => {
  it('the clause stands verbatim in the requirements', () => {
    expect(REQUIREMENTS).toContain(PLACED_OFFSET_CLAUSE)
  })

  it('premise: S-600 is a positive number in table T-217', () => {
    expect(S_600).toBeGreaterThan(0)
  })

  it('CM-46 writes bodyOffsetPx as { dx: S-600, dy: -S-600 }', () => {
    const made = editDocument(
      documentWith([]),
      { kind: 'createCommentBox', commentBoxId: COMMENT_ID, anchor: { date: april(15, '12:00:00'), taskGroupId: FREE_ROW } },
      LIMITS,
      'row',
    )
    if (!made.ok) throw new Error(`premise: accepted, was ${JSON.stringify(made.refusals)}`)
    const placed = made.document.schedule.commentBoxes.find((one) => one.id === COMMENT_ID)
    expect(placed?.bodyOffsetPx).toEqual({ dx: S_600, dy: -S_600 })
  })

  it('a box placed by the armed press stores the same offset', () => {
    const built = stageFor(documentWith([]))
    built.pressEntry('Command Palette', 'IC-35')
    const at = freePointOf(built.loop)
    built.click(at.x, at.y)
    expect(built.loop.document().schedule.commentBoxes[0]?.bodyOffsetPx).toEqual({ dx: S_600, dy: -S_600 })
  })
})

// see LF-17, FR-019
describe('FR-019 with LF-17: right after placing, the tip and the leader stand out at the lower left of the box', () => {
  const placedBox = () => {
    const built = stageFor(documentWith([]))
    built.pressEntry('Command Palette', 'IC-35')
    const at = freePointOf(built.loop)
    built.click(at.x, at.y)
    const box = commentDrawn(built.loop, built.loop.document().schedule.commentBoxes[0]?.id)
    if (box === null) throw new Error('premise: the placed box is drawn')
    return box
  }

  it('the bottom-left corner of the body stands S-600 right of and S-600 above the tip', () => {
    const box = placedBox()
    expect(box.body.x - box.anchor.x).toBeCloseTo(S_600, 1)
    expect(box.anchor.y - (box.body.y + box.body.height)).toBeCloseTo(S_600, 1)
  })

  it('a leader is drawn and runs from the tip to the bottom-left corner of the body', () => {
    const box = placedBox()
    const leader = leaderOf(box)
    expect(leader, 'a leader is drawn').not.toBeNull()
    const first = leader![0]!
    const last = leader![leader!.length - 1]!
    expect([first.x, first.y]).toEqual([box.anchor.x, box.anchor.y])
    expect(last.x).toBeCloseTo(box.body.x, 1)
    expect(last.y).toBeCloseTo(box.body.y + box.body.height, 1)
  })

  it('control: a box with offset zero draws no leader', () => {
    const built = stageFor(documentWith([commentRow({ bodyOffsetPx: { dx: 0, dy: 0 } })]))
    const box = commentDrawn(built.loop)
    expect(box).not.toBeNull()
    expect(leaderOf(box!)).toBeNull()
  })
})
