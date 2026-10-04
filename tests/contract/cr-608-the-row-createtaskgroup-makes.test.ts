// CR-608 tests 6-7: rows made by createTaskGroup stand temporarilyExpanded; other writers keep theirs.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { documentFromMspdi } from '../../src/adapter/document-codec/mspdi-codec'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../src/entity/document-model/schedule/schedule-entities'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { editTaskGroup } from '../../src/use-case/edit-document/edit-task-group'
import {
  levelZeroWritesFor,
  treeStateWritesFor,
  type TreeStateEvent,
} from '../../src/use-case/edit-document/task-group-folding'
import { rowDocument, SCREEN, TEMPLATE } from '../unit/cr-541-stage'
import { unbroken } from './spec-table'

type TreeState = TaskGroup['treeState']

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const ERD_DETAIL = unbroken(readFileSync(join(SPEC, '_assets', 'fig-erd-detail.md'), 'utf8'))

const AT_153_MADE =
  '`createTaskGroup`（`_assets/tbl-glossary.md` の 表 T-108 の `CM-26`）で作る行と、行が 0 になったときに `01-04-requirements.md` の 表 T-050 の後の段が作る行は `temporarilyExpanded`'
const AT_153_DEFAULT =
  '既定の `auto` は、この値を持たずに読んだ行と、`CM-26` を通らずにできる行（MSPDI から取り込んだ行、`createTask` が行とともに作る行）が取る。'
const AT_153_DU_2 = '貼り付けた写しは `01-04-requirements.md` の 表 T-223 の `DU-2` に従う'
const DU_2_VALUE =
  '複製元が `collapsed` か `hidden` ならその値とし、`expanded` か `temporarilyExpanded` なら `auto` とすること（MUST）'
const FR_018_NO_OTHER_WRITER = '同表に無い操作で値を書き換えてはならない（MUST NOT）'

type Guard = { readonly name: string; readonly not?: boolean }
type Branch = { readonly to: TreeState; readonly guard?: readonly Guard[] }
type RootCell = { readonly guard?: readonly Guard[]; readonly effect?: string }
type RawRegion = {
  readonly region: string
  readonly root: { readonly transitions: Readonly<Record<string, RootCell>> }
  readonly events: readonly { readonly key: string; readonly source: { readonly rows: readonly string[] } }[]
  readonly machines: readonly {
    readonly name: string
    readonly states: readonly { readonly key: string; readonly initial: boolean }[]
    readonly transitions: Readonly<Record<string, Readonly<Record<string, Branch | readonly Branch[]>>>>
  }[]
}

const MANUSCRIPT = JSON.parse(readFileSync(join(SPEC, '_source', 'state-machines.json'), 'utf8')) as {
  readonly regions: readonly RawRegion[]
}
const REGION = ((): RawRegion => {
  const found = MANUSCRIPT.regions.find((one) => one.region === 'rowTree')
  if (found === undefined) throw new Error('state-machines.json has no region rowTree')
  return found
})()
const MACHINE = ((): RawRegion['machines'][number] => {
  const found = REGION.machines.find((one) => one.name === 'treeStateMachine')
  if (found === undefined) throw new Error('region rowTree has no treeStateMachine')
  return found
})()

const thresholdOf = (depth: number): number =>
  SETTINGS_CONSTANTS.groupLevelOfDetailBase * SETTINGS_CONSTANTS.groupLevelOfDetailRatio ** (depth - 2)

describe('CR-608 -- the manuscript these cases are driven by', () => {
  it.each([AT_153_MADE, AT_153_DEFAULT, AT_153_DU_2])('AT-153: %s', (clause) => {
    expect(ERD_DETAIL).toContain(clause)
  })

  it('DU-2 and FR-018 still say it', () => {
    expect(REQUIREMENTS).toContain(DU_2_VALUE)
    expect(REQUIREMENTS).toContain(FR_018_NO_OTHER_WRITER)
  })

  it('table T-328: the initial state of treeStateMachine is temporarilyExpanded', () => {
    expect(MACHINE.states.filter((one) => one.initial).map((one) => one.key)).toEqual(['temporarilyExpanded'])
  })

  it('table T-328: childRowAddPressed sends auto and collapsed to temporarilyExpanded on the pressed row, and has no other cell', () => {
    const cells = MACHINE.transitions['childRowAddPressed'] ?? {}
    expect(Object.keys(cells).sort()).toEqual(['auto', 'collapsed'])
    for (const from of ['auto', 'collapsed']) {
      const branches = ([] as Branch[]).concat(cells[from] as Branch | Branch[])
      expect(branches.map((one) => one.to), from).toEqual(['temporarilyExpanded'])
      expect(branches.flatMap((one) => (one.guard ?? []).map((guard) => guard.name)), from).toEqual(['isPressedRow'])
    }
  })

  it('table T-328: everyRowDeletePressed comes from IC-106 / HF-20, and its root cell opens level zero', () => {
    expect(REGION.events.find((one) => one.key === 'everyRowDeletePressed')?.source.rows).toEqual(['IC-106', 'HF-20'])
    const cell = REGION.root.transitions['everyRowDeletePressed']
    expect(cell?.effect).toBe('writeLevelZeroAuto')
    expect((cell?.guard ?? []).map((one) => one.name)).toEqual(['isLevelZeroCollapsed'])
    expect(REGION.root.transitions['childRowAddPressed']?.effect).toBe('writeLevelZeroAuto')
    expect(MACHINE.transitions['everyRowDeletePressed'], 'no treeStateMachine cell').toBeUndefined()
  })
})

const TEMPLATE_GROUP = (TEMPLATE.schedule.taskGroups as TaskGroup[])[0] as TaskGroup

function scheduleOf(rows: readonly { id: string; parentId: string | null; treeState: TreeState }[]): Schedule {
  const taskGroups: TaskGroup[] = rows.map((one, order) => ({ ...TEMPLATE_GROUP, ...one, label: one.id, order }))
  return { ...(TEMPLATE.schedule as Schedule), taskGroups, taskGroupMembers: [], tasks: [] }
}

const writesOf = (schedule: Schedule, event: TreeStateEvent) =>
  treeStateWritesFor(schedule, event).map((command) => {
    const loose = command as unknown as { groupId: string; treeState: string }
    return { id: loose.groupId, to: loose.treeState }
  })

describe('CR-608 seam -- the pressed parent (childRowAddPressed), and no ancestor is written', () => {
  it.each([
    ['auto', [{ id: 'P', to: 'temporarilyExpanded' }]],
    ['collapsed', [{ id: 'P', to: 'temporarilyExpanded' }]],
    ['expanded', []],
    ['temporarilyExpanded', []],
  ] as const)('the pressed row %s', (from, expected) => {
    const schedule = scheduleOf([
      { id: 'A', parentId: null, treeState: 'expanded' },
      { id: 'B', parentId: 'A', treeState: 'auto' },
      { id: 'P', parentId: 'B', treeState: from },
      { id: 'C', parentId: 'P', treeState: 'collapsed' },
      { id: 'X', parentId: null, treeState: 'collapsed' },
    ])
    expect(writesOf(schedule, { type: 'childRowAddPressed', pressedRowId: 'P' })).toEqual(expected)
  })

  it('everyRowDeletePressed opens a collapsed level zero, and writes nothing when it is open', () => {
    expect(levelZeroWritesFor('collapsed', { type: 'everyRowDeletePressed' })).toHaveLength(1)
    expect(levelZeroWritesFor('auto', { type: 'everyRowDeletePressed' })).toHaveLength(0)
  })
})

const R = 'b6080000-0000-4000-8000-000000000001'
const P = 'b6080000-0000-4000-8000-000000000002'
const K = 'b6080000-0000-4000-8000-000000000003'
const S = 'b6080000-0000-4000-8000-000000000004'
const FRESH = 'b6080000-0000-4000-8000-0000000000f1'

const groupsOf = (document: unknown): TaskGroup[] =>
  (document as { schedule: { taskGroups: TaskGroup[] } }).schedule.taskGroups
const stateIn = (document: unknown, id: string): TreeState | undefined =>
  groupsOf(document).find((one) => one.id === id)?.treeState

describe(`CR-608 -- ${AT_153_MADE}`, () => {
  it('createTaskGroup (CM-26) through editTaskGroup makes a temporarilyExpanded row and writes no other row', () => {
    const document = rowDocument([
      { id: R, parentId: null, treeState: 'expanded' },
      { id: P, parentId: R },
      { id: K, parentId: P, treeState: 'collapsed' },
    ])
    const result = editTaskGroup(
      document as never,
      { kind: 'createTaskGroup', id: FRESH, parentId: P, label: 'New', derivedFromTaskUid: null, order: 99 },
      'Row',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(stateIn(result.document, FRESH), AT_153_MADE).toBe('temporarilyExpanded')
    for (const id of [R, P, K]) expect(stateIn(result.document, id), FR_018_NO_OTHER_WRITER).toBe(stateIn(document, id))
  })
})

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

function loopOf(document: Record<string, unknown>): { loop: FrameLoop; drain(): void } {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const surface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: () => null,
  }
  const loop = frameLoop({ showSvg: () => undefined } as never, document as never, SCREEN, {
    surface: surface as never,
    language: 'ja',
  })
  drain()
  return { loop, drain }
}

describe('CR-608 test 6 -- the Agent API createTaskGroup makes a deep row temporarilyExpanded, drawn whatever the zoom', () => {
  it('a depth-3 row made at a zoom that draws only depth 2 stands temporarilyExpanded and is drawn; the zoom and the other rows stay', () => {
    const zoomY = thresholdOf(2)
    const { loop, drain } = loopOf(
      rowDocument(
        [
          { id: R, parentId: null },
          { id: P, parentId: R },
          { id: K, parentId: P },
          { id: S, parentId: R },
        ],
        { zoomY, scrollGroupId: R },
      ),
    )
    const drawn = (): string[] => (loop.current()?.layout.rows ?? []).map((one) => one.groupId)
    expect(drawn(), 'premise: depth 3 is dropped by the zoom').not.toContain(K)
    const before = groupsOf(loop.document())

    const api = installAgentApi({
      ...loop.agentApiSeams(),
      writerName: 'cr-608-tester',
      schemaVersion: TEMPLATE.schemaVersion as string,
    } as never)
    const outcome = api.applyCommands({
      readStamp: api.readStamp(),
      commands: [
        { kind: 'createTaskGroup', id: FRESH, parentId: P, label: 'From the agent', derivedFromTaskUid: null, order: 99 },
      ] as never,
    })
    drain()

    expect(outcome.accepted, 'the agent write was accepted').toBe(true)
    expect(stateIn(loop.document(), FRESH), AT_153_MADE).toBe('temporarilyExpanded')
    expect(loop.document().documentSettings.zoomY, 'the zoom does not change').toBe(zoomY)
    for (const one of before) expect(stateIn(loop.document(), one.id), FR_018_NO_OTHER_WRITER).toBe(one.treeState)
    expect(drawn(), 'no ancestor is collapsed, so the new row is drawn whatever the zoom').toEqual(
      expect.arrayContaining([R, P, FRESH]),
    )
  })
})

describe(`CR-608 test 7 -- ${AT_153_DU_2}: ${DU_2_VALUE}`, () => {
  it('a pasted subtree: temporarilyExpanded and expanded copies are auto, collapsed and hidden copies keep theirs', () => {
    const T = 'b6080000-0000-4000-8000-000000000010'
    const S1 = 'b6080000-0000-4000-8000-000000000011'
    const S2 = 'b6080000-0000-4000-8000-000000000012'
    const S3 = 'b6080000-0000-4000-8000-000000000013'
    const S4 = 'b6080000-0000-4000-8000-000000000014'
    const document = rowDocument([
      { id: S, parentId: null, treeState: 'temporarilyExpanded' },
      { id: S1, parentId: S, treeState: 'expanded' },
      { id: S2, parentId: S, treeState: 'collapsed' },
      { id: S3, parentId: S, treeState: 'hidden' },
      { id: S4, parentId: S1, treeState: 'temporarilyExpanded' },
      { id: T, parentId: null },
    ])
    const copies: Record<string, string> = {
      [S]: 'c6080000-0000-4000-8000-000000000000',
      [S1]: 'c6080000-0000-4000-8000-000000000001',
      [S2]: 'c6080000-0000-4000-8000-000000000002',
      [S3]: 'c6080000-0000-4000-8000-000000000003',
      [S4]: 'c6080000-0000-4000-8000-000000000004',
    }
    const result = editTaskGroup(
      document as never,
      { kind: 'pasteTaskGroupSubtree', sourceGroupId: S, targetGroupId: T, newGroupIds: copies },
      'Row',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const expected: Record<string, TreeState> = {
      [S]: 'auto',
      [S1]: 'auto',
      [S2]: 'collapsed',
      [S3]: 'hidden',
      [S4]: 'auto',
    }
    for (const [source, copy] of Object.entries(copies)) {
      expect(stateIn(result.document, copy), `${DU_2_VALUE} (${stateIn(document, source)})`).toBe(expected[source])
    }
  })

  it.each(['sample-small-website-renewal.en.xml', 'sample-medium-sfa-webapp.ja.xml'])(
    `MSPDI import (%s): every row takes the column default auto -- ${AT_153_DEFAULT}`,
    (file) => {
      const current = documentFromJson(
        readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
      )
      if (!current.ok) throw new Error('the bundled template is not a GRS JSON document')
      const read = documentFromMspdi(readFileSync(join(process.cwd(), 'sample-schedule', file), 'utf8'), current.document)
      expect(read.ok).toBe(true)
      if (!read.ok) return
      const states = new Set(groupsOf(read.document).map((one) => one.treeState))
      expect(groupsOf(read.document).length, 'premise: the import made rows').toBeGreaterThan(1)
      expect([...states], AT_153_DEFAULT).toEqual(['auto'])
    },
  )
})
