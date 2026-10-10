// CR-608 tests 1-5 and 8: a task group added with IC-91 opens temporarily until the vertical axis shrinks.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/json-codec'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { taskGroupDocument, SCREEN, type TaskGroupSeed } from '../unit/cr-541-stage'
import { bare, bareAll, specTable, unbroken } from './spec-table'

type TreeState = 'auto' | 'collapsed' | 'expanded' | 'temporarilyExpanded' | 'hidden'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const HF_14_STANDS =
  '立てたタスクグループは `_assets/fig-erd-detail.md` の `AT-153` のとおり `temporarilyExpanded` で立ち、押した親は `_assets/tbl-state-machines.md` の 表 T-328 の `childTaskGroupAddPressed` の行のとおり、`auto` か `collapsed` なら `temporarilyExpanded` になる。'
const HF_14_DRAWS = '⇒ `FR-018` の 表 T-329 の `TD-6`・`TD-7` が、いまの倍率のまま、立てたタスクグループとその兄弟とその祖先を描く。'
const HF_14_NO_ZOOM = 'そのために縦の倍率を書き換えてはならない（MUST NOT）'
const HF_14_TEMPORARY = '縦を縮める最初の入力で、立てたタスクグループも押した親も `auto` へ戻る（同表の `verticalZoomShrinkPressed`）'
const HF_14_ONE_PARENT = '展開してよいのは押した親 1 つだけである'
const HF_14_NO_ANCESTOR = 'その先祖を書き換えてはならない（MUST NOT）'
const UN_14_ONE_STEP = '1 回の押下が書き換えるタスクグループの木の状態は、タスクグループがいくつでも同じ 1 段に入れること（MUST）'
const FR_018_ADDED = '足したタスクグループと、足した先の親も同じ値で立つ（`AT-153`、同表の `childTaskGroupAddPressed`、表 T-051 の `HF-14`）'

const TASK_GROUP_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

function entranceFor(rule: string): string {
  const found = specTable('T-109').rows.filter(
    (one) =>
      bareAll(one.by['面'] ?? '').includes(TASK_GROUP_PANEL) &&
      new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  if (found.length !== 1 || found[0] === undefined) throw new Error(`table T-109 gives ${rule} ${found.length} entrances`)
  return found[0].id
}

const ADD_CHILD_TASK_GROUP = entranceFor('HF-14')
const VERTICAL_ZOOM_SHRINK = rowOf('T-109', 'IC-14').id
const UNDO = rowOf('T-109', 'IC-5').id
const APP_HEADER = bare(rowOf('T-109', 'IC-5').cells[0] ?? '')

const thresholdOf = (depth: number): number =>
  SETTINGS_CONSTANTS.groupLevelOfDetailBase * SETTINGS_CONSTANTS.groupLevelOfDetailRatio ** (depth - 2)

const ZOOM_DEPTH_TWO = thresholdOf(2)

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

const NO_MODS = { ctrl: false, shift: false, alt: false, meta: false }
const pointer = (phase: 'down' | 'up') => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: 80,
  y: 120,
  modifiers: { ...NO_MODS },
  clickCount: 1,
})

interface Group {
  readonly id: string
  readonly parentId: string | null
  readonly treeState: TreeState
}

interface Stage {
  readonly loop: FrameLoop
  press(surface: string, entry: string, groupId: string | null): void
  drawn(): string[]
  groups(): Group[]
  stateOf(id: string): TreeState | undefined
  zoomY(): number
  drawnZoomY(): number | undefined
}

function stage(document: Record<string, unknown>): Stage {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  const run = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  let part: unknown = null
  const surface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  }
  const loop = frameLoop({ showSvg: () => undefined } as never, document as never, SCREEN, {
    surface: surface as never,
    language: 'ja',
  })
  run()
  const send = (input: unknown): void => {
    loop.receiveInput(input as never)
    run()
  }
  const groups = (): Group[] => (loop.document().schedule as unknown as { taskGroups: Group[] }).taskGroups
  return {
    loop,
    press: (surfaceName, entry, groupId) => {
      part = {
        part: surfaceName,
        entry,
        format: null,
        taskGroupId: groupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      }
      send(pointer('down'))
      send(pointer('up'))
      part = null
    },
    drawn: () => (loop.current()?.layout.taskGroups ?? []).map((one) => one.groupId),
    groups,
    stateOf: (id) => groups().find((one) => one.id === id)?.treeState,
    zoomY: () => loop.document().documentSettings.zoomY,
    drawnZoomY: () => loop.current()?.settingsMeasuredWith.zoomY,
  }
}

function addedTaskGroupOf(before: readonly Group[], after: readonly Group[]): string {
  const known = new Set(before.map((one) => one.id))
  const added = after.filter((one) => !known.has(one.id))
  if (added.length !== 1 || added[0] === undefined) throw new Error(`the press added ${added.length} task groups, not one`)
  return added[0].id
}

const R = 'a6080000-0000-4000-8000-000000000001'
const P = 'a6080000-0000-4000-8000-000000000002'
const K1 = 'a6080000-0000-4000-8000-000000000003'
const K2 = 'a6080000-0000-4000-8000-000000000004'
const Q = 'a6080000-0000-4000-8000-000000000005'
const QK = 'a6080000-0000-4000-8000-000000000006'

function droppedTierDocument(pressedParent: TreeState = 'auto'): Record<string, unknown> {
  const rows: TaskGroupSeed[] = [
    { id: R, parentId: null },
    { id: P, parentId: R, treeState: pressedParent },
    { id: K1, parentId: P },
    { id: K2, parentId: P },
    { id: Q, parentId: R },
    { id: QK, parentId: Q },
  ]
  return taskGroupDocument(rows, { zoomY: ZOOM_DEPTH_TWO, scrollGroupId: R })
}

describe('CR-608 -- the manuscript still says what these cases read', () => {
  it.each([HF_14_STANDS, HF_14_DRAWS, HF_14_NO_ZOOM, HF_14_TEMPORARY, HF_14_ONE_PARENT, HF_14_NO_ANCESTOR])(
    'HF-14: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )

  it('UN-14 and FR-018 still say it', () => {
    expect(REQUIREMENTS).toContain(UN_14_ONE_STEP)
    expect(REQUIREMENTS).toContain(FR_018_ADDED)
  })

  it('the entrances this file presses are IC-91, IC-14 and IC-5', () => {
    expect(ADD_CHILD_TASK_GROUP).toBe('IC-91')
    expect(VERTICAL_ZOOM_SHRINK).toBe('IC-14')
    expect(UNDO).toBe('IC-5')
    expect(APP_HEADER).toBe('App Header')
  })

  it('premise: at the fixture zoom the drawn tier stops at depth 2', () => {
    const built = stage(droppedTierDocument())
    expect(built.drawnZoomY(), 'the picture is drawn at the stored zoom').toBe(ZOOM_DEPTH_TWO)
    expect(built.drawn().sort()).toEqual([P, Q, R].sort())
  })
})

describe(`CR-608 test 1 -- ${HF_14_DRAWS}`, () => {
  it('the added task group and its siblings are drawn, the zoom does not change, and both task groups are temporarilyExpanded', () => {
    const built = stage(droppedTierDocument('auto'))
    const before = built.groups()
    const zoomBefore = built.zoomY()

    built.press(TASK_GROUP_PANEL, ADD_CHILD_TASK_GROUP, P)

    const added = addedTaskGroupOf(before, built.groups())
    expect(built.groups().find((one) => one.id === added)?.parentId, 'the added task group is a child of P').toBe(P)
    expect(built.stateOf(added), HF_14_STANDS).toBe('temporarilyExpanded')
    expect(built.stateOf(P), HF_14_STANDS).toBe('temporarilyExpanded')
    expect(built.zoomY(), HF_14_NO_ZOOM).toBe(zoomBefore)
    expect(built.drawnZoomY(), HF_14_NO_ZOOM).toBe(zoomBefore)
    expect(built.drawn(), HF_14_DRAWS).toEqual(expect.arrayContaining([R, P, K1, K2, added, Q]))
    expect(built.drawn(), 'the unrelated branch keeps the tier picture').not.toContain(QK)
  })
})

describe(`CR-608 tests 2 and 3 -- ${HF_14_ONE_PARENT}`, () => {
  const A = 'a6080000-0000-4000-8000-000000000011'
  const B = 'a6080000-0000-4000-8000-000000000012'
  const PP = 'a6080000-0000-4000-8000-000000000013'
  const PK = 'a6080000-0000-4000-8000-000000000014'
  const X = 'a6080000-0000-4000-8000-000000000015'
  const XK = 'a6080000-0000-4000-8000-000000000016'

  const documentWith = (pressed: TreeState) =>
    taskGroupDocument(
      [
        { id: A, parentId: null, treeState: 'expanded' },
        { id: B, parentId: A, treeState: 'temporarilyExpanded' },
        { id: PP, parentId: B, treeState: pressed },
        { id: PK, parentId: PP },
        { id: X, parentId: null, treeState: 'collapsed' },
        { id: XK, parentId: X },
      ],
      { zoomY: 1, scrollGroupId: A },
    )

  const cases: readonly [TreeState, TreeState][] = [
    ['collapsed', 'temporarilyExpanded'],
    ['auto', 'temporarilyExpanded'],
    ['expanded', 'expanded'],
    ['temporarilyExpanded', 'temporarilyExpanded'],
  ]

  it.each(cases)('the pressed parent %s becomes %s; the ancestors and the folded task group elsewhere keep theirs', (from, to) => {
    const built = stage(documentWith(from))
    const before = built.groups()
    expect(built.drawn(), 'premise: the pressed task group is drawn').toContain(PP)

    built.press(TASK_GROUP_PANEL, ADD_CHILD_TASK_GROUP, PP)

    const added = addedTaskGroupOf(before, built.groups())
    expect(built.stateOf(PP), `T-328 childTaskGroupAddPressed: ${from}`).toBe(to)
    expect(built.stateOf(added), HF_14_STANDS).toBe('temporarilyExpanded')
    for (const id of [A, B, PK, X, XK]) {
      expect(built.stateOf(id), `${HF_14_NO_ANCESTOR} (${id})`).toBe(before.find((one) => one.id === id)?.treeState)
    }
    expect(built.drawn(), 'the added task group is drawn').toContain(added)
    expect(built.drawn(), 'the folded task group elsewhere still hides its child').not.toContain(XK)
  })
})

describe(`CR-608 test 4 -- ${HF_14_TEMPORARY}`, () => {
  it('one shrink returns the added task group and the pressed parent to auto, and the tier picture comes back', () => {
    const built = stage(droppedTierDocument('auto'))
    const before = built.groups()
    built.press(TASK_GROUP_PANEL, ADD_CHILD_TASK_GROUP, P)
    const added = addedTaskGroupOf(before, built.groups())
    expect(built.drawn(), 'premise: the added task group is drawn').toContain(added)
    const zoomBefore = built.zoomY()

    built.press(APP_HEADER, VERTICAL_ZOOM_SHRINK, null)

    expect(built.zoomY(), 'premise: IC-14 shrank the vertical axis').toBeLessThan(zoomBefore)
    expect(built.stateOf(added), HF_14_TEMPORARY).toBe('auto')
    expect(built.stateOf(P), HF_14_TEMPORARY).toBe('auto')
    expect(built.groups().filter((one) => one.treeState === 'temporarilyExpanded')).toEqual([])
    expect(built.zoomY()).toBeLessThan(thresholdOf(3))
    const drawn = built.drawn()
    for (const id of [added, K1, K2, QK]) expect(drawn, 'back to the picture of the zoom').not.toContain(id)
    const depthTwoDrawn = built.zoomY() >= thresholdOf(2)
    expect(drawn, 'the depth-1 task group is always drawn').toContain(R)
    for (const id of [P, Q]) {
      expect(drawn.includes(id), `depth 2 at zoomY ${built.zoomY()} follows the tier`).toBe(depthTwoDrawn)
    }
  })
})

describe(`CR-608 test 5 -- ${UN_14_ONE_STEP}`, () => {
  it.each(['auto', 'collapsed'] as const)('pressed parent %s: one undo removes the added task group and gives the parent its value back', (from) => {
    const built = stage(droppedTierDocument(from))
    const before = built.groups().map((one) => ({ id: one.id, treeState: one.treeState }))
    const zoomBefore = built.zoomY()

    built.press(TASK_GROUP_PANEL, ADD_CHILD_TASK_GROUP, P)
    expect(built.groups().length, 'premise: a task group was added').toBe(before.length + 1)
    expect(built.stateOf(P), 'premise: the parent was written').toBe('temporarilyExpanded')

    built.press(APP_HEADER, UNDO, null)

    expect(built.groups().map((one) => ({ id: one.id, treeState: one.treeState })), UN_14_ONE_STEP).toEqual(before)
    expect(built.zoomY(), HF_14_NO_ZOOM).toBe(zoomBefore)
  })
})

describe('CR-608 test 8 -- the added task group is saved temporarilyExpanded, and reopens that way', () => {
  it('a JSON round trip keeps the added task group and the pressed parent temporarilyExpanded, and the reopened picture draws them', () => {
    const built = stage(droppedTierDocument('auto'))
    const before = built.groups()
    built.press(TASK_GROUP_PANEL, ADD_CHILD_TASK_GROUP, P)
    const added = addedTaskGroupOf(before, built.groups())

    const reopened = documentFromJson(jsonFromDocument(built.loop.document()))
    expect(reopened.ok).toBe(true)
    if (!reopened.ok) return
    const groups = (reopened.document.schedule as unknown as { taskGroups: Group[] }).taskGroups
    expect(groups.find((one) => one.id === added)?.treeState, HF_14_STANDS).toBe('temporarilyExpanded')
    expect(groups.find((one) => one.id === P)?.treeState, HF_14_STANDS).toBe('temporarilyExpanded')

    const again = stage(reopened.document as unknown as Record<string, unknown>)
    expect(again.drawn(), HF_14_DRAWS).toEqual(expect.arrayContaining([P, K1, K2, added]))
  })
})
