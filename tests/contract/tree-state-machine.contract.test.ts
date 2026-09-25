// Contract test: table T-250 SD-3 -- the row-tree manuscript (T-328) against treeStateWritesFor.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Schedule, TaskGroup } from '../../src/entity/document-model/schedule/schedule-entities'
import {
  TREE_STATE_TRANSITIONS,
  treeStateWritesFor,
  type TreeStateEvent,
} from '../../src/use-case/edit-document/task-group-folding'
import { specTable, unbroken } from './spec-table'

type TreeState = TaskGroup['treeState']
type Guard = { readonly name: string; readonly not?: boolean }
type Branch = { readonly to: TreeState; readonly guard?: readonly Guard[] }
type Cell = Branch | readonly Branch[]
type RawRegion = {
  readonly region: string
  readonly events: readonly { readonly key: string; readonly carries: readonly { readonly name: string }[] }[]
  readonly machines: readonly {
    readonly name: string
    readonly states: readonly { readonly key: string; readonly initial: boolean }[]
    readonly transitions: Readonly<Record<string, Readonly<Record<string, Cell>>>>
  }[]
}

// WHY: the manuscript, not the generated table, is the single source; generated-vs-manuscript
// drift is gen:check's job, and the generated copy is compared below only as a second reader.
const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8'),
) as { readonly regions: readonly RawRegion[] }
const REGION = MANUSCRIPT.regions.find((r) => r.region === 'rowTree')
if (REGION === undefined) throw new Error('state-machines.json has no region "rowTree"')
const MACHINE = REGION.machines.find((m) => m.name === 'treeStateMachine')
if (MACHINE === undefined) throw new Error('region rowTree has no treeStateMachine')

const STATES = MACHINE.states.map((s) => s.key as TreeState)
const EVENTS = REGION.events

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_018_BY_T_328 =
  '値を書き換える入口と先の値は、段 0 の畳み（`_assets/tbl-settings.md` の 表 T-203 の `S-418`）を含めて、`_assets/tbl-state-machines.md` の 表 T-328 に従うこと（MUST）'
const FR_018_NO_OTHER_WRITER = '同表に無い操作で値を書き換えてはならない（MUST NOT）'
const FR_018_BY_T_329 =
  '行の木の状態（`_assets/fig-erd-detail.md` の `AT-153`、`TaskGroup.treeState`）によって、本要求の対象から外す行を 表 T-329 に従って決めること（MUST）'

// see T-328
// WHY: one tree reaches every guard of the table: an ancestor of the pressed row, the pressed row,
// a child that has children, a deeper row that has children, a leaf below, a leaf child, others.
const TREE: readonly { readonly id: string; readonly parentId: string | null }[] = [
  { id: 'R', parentId: null },
  { id: 'P', parentId: 'R' },
  { id: 'C', parentId: 'P' },
  { id: 'G', parentId: 'C' },
  { id: 'GG', parentId: 'G' },
  { id: 'L', parentId: 'P' },
  { id: 'S', parentId: 'R' },
  { id: 'A', parentId: null },
]
const PRESSED = 'P'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Schedule }
const TEMPLATE_GROUP: TaskGroup = ((): TaskGroup => {
  const first = TEMPLATE.schedule.taskGroups[0]
  if (first === undefined) throw new Error('the startup template holds no row')
  return first
})()

/** @purity pure */
function scheduleWith(states: Readonly<Record<string, TreeState>>): Schedule {
  const taskGroups: TaskGroup[] = TREE.map((row, order) => ({
    ...TEMPLATE_GROUP,
    id: row.id,
    parentId: row.parentId,
    label: row.id,
    order,
    treeState: states[row.id] ?? 'auto',
  }))
  return { ...TEMPLATE.schedule, taskGroups, taskGroupMembers: [], tasks: [] }
}

/** @purity pure */
function isBelow(id: string, ancestor: string): boolean {
  let at = TREE.find((row) => row.id === id)?.parentId ?? null
  while (at !== null) {
    if (at === ancestor) return true
    at = TREE.find((row) => row.id === at)?.parentId ?? null
  }
  return false
}

// see T-328
// WHY: the guard words of the manuscript read as CR-570 section 14.3 defines them; a guard the
// table names and this file cannot read fails loudly instead of passing as true.
/** @purity pure */
function guardHolds(guard: Guard, id: string, pressed: string | null): boolean {
  const row = TREE.find((one) => one.id === id)
  if (row === undefined) throw new Error(`no row ${id}`)
  const said = ((): boolean => {
    switch (guard.name) {
      case 'isPressedRow':
        return id === pressed
      case 'isChildOfPressedRow':
        return pressed !== null && row.parentId === pressed
      case 'isBelowPressedRow':
        return pressed !== null && isBelow(id, pressed)
      case 'isLeafRow':
        return !TREE.some((one) => one.parentId === id)
      case 'isTopLevelRow':
        return row.parentId === null
      default:
        throw new Error(`table T-328 names a guard this file cannot read: ${guard.name}`)
    }
  })()
  return guard.not === true ? !said : said
}

/** @purity pure */
function branchesOf(cell: Cell | undefined): readonly Branch[] {
  if (cell === undefined) return []
  return Array.isArray(cell) ? (cell as readonly Branch[]) : [cell as Branch]
}

// WHY: null when the cell leaves the row alone, the same reference SD-3 asks for.
/** @purity pure */
function manuscriptAnswer(event: string, from: TreeState, id: string, pressed: string | null): TreeState | null {
  const taken = branchesOf(MACHINE?.transitions[event]?.[from]).filter((b) =>
    (b.guard ?? []).every((g) => guardHolds(g, id, pressed)),
  )
  if (taken.length > 1) throw new Error(`table T-328 gives ${id} in ${from} on ${event} ${taken.length} branches`)
  const to = taken[0]?.to ?? null
  return to === from ? null : to
}

/** @purity pure */
function eventOf(key: string): TreeStateEvent {
  const carries = EVENTS.find((e) => e.key === key)?.carries ?? []
  const withRow = carries.some((c) => c.name === 'pressedRowId')
  return (withRow ? { type: key, pressedRowId: PRESSED } : { type: key }) as TreeStateEvent
}

type Written = { readonly id: string; readonly to: string }

/** @purity pure */
function writesOf(schedule: Schedule, event: TreeStateEvent): Written[] {
  return treeStateWritesFor(schedule, event)
    .map((command) => {
      const loose = command as unknown as { kind: string; taskGroupId?: string; treeState?: string }
      expect(loose.kind, 'CM-85: every write is setTaskGroupTreeState').toBe('setTaskGroupTreeState')
      return { id: String(loose.taskGroupId), to: String(loose.treeState) }
    })
    .sort((a, b) => a.id.localeCompare(b.id))
}

describe('table T-328 -- the manuscript this contract walks', () => {
  it('the rowTree region holds the five values of AT-153 and the ten events of CR-570 section 14', () => {
    expect(STATES).toEqual(['auto', 'collapsed', 'expanded', 'temporarilyExpanded', 'hidden'])
    expect(MACHINE.states.filter((s) => s.initial).map((s) => s.key)).toEqual(['auto'])
    expect(EVENTS.map((e) => e.key)).toEqual([
      'oneLevelOpenPressed',
      'allBelowOpenPressed',
      'hidePressed',
      'allBelowFoldPressed',
      'everyRowOpenPressed',
      'everyRowFoldPressed',
      'topLevelOpenPressed',
      'childRowAddPressed',
      'fitPressed',
      'rowZoomShrinkPressed',
    ])
    expect(specTable('T-329').rows.map((row) => row.id)).toEqual(['TD-1', 'TD-2', 'TD-3', 'TD-4', 'TD-5', 'TD-6', 'TD-7'])
  })

  it('FR-018 sends every write of a tree value to table T-328, and every drawing to table T-329', () => {
    expect(REQUIREMENTS).toContain(FR_018_BY_T_328)
    expect(REQUIREMENTS).toContain(`${FR_018_BY_T_328} —— ${FR_018_NO_OTHER_WRITER}`)
    expect(REQUIREMENTS).toContain(FR_018_BY_T_329)
  })

  it('the generated TREE_STATE_TRANSITIONS carries one row per branch of the machine cells', () => {
    const branchCount = Object.values(MACHINE.transitions).reduce(
      (sum, row) => sum + Object.values(row).reduce((inner, cell) => inner + branchesOf(cell).length, 0),
      0,
    )
    const machineRows = TREE_STATE_TRANSITIONS.filter((row) => row.state.startsWith('treeStateMachine.'))
    expect(machineRows).toHaveLength(branchCount)
    for (const row of machineRows) {
      const from = row.state.split('.')[1] as TreeState
      const to = row.to.split('.')[1] as TreeState
      const cell = branchesOf(MACHINE.transitions[row.event]?.[from])
      expect(cell.map((b) => b.to), `${row.event} x ${from}`).toContain(to)
    }
  })
})

describe('SD-3: every event x every value x every row relation equals table T-328', () => {
  for (const event of EVENTS) {
    for (const from of STATES) {
      it(`${event.key} from ${from}`, () => {
        const pressed = eventOf(event.key)
        const pressedId = 'pressedRowId' in pressed ? PRESSED : null
        for (const row of TREE) {
          // STEP: only this row holds the value under test; every other row is auto
          const schedule = scheduleWith({ [row.id]: from })
          const expected: Written[] = []
          for (const other of TREE) {
            const value = other.id === row.id ? from : 'auto'
            const to = manuscriptAnswer(event.key, value, other.id, pressedId)
            if (to !== null) expected.push({ id: other.id, to })
          }
          expected.sort((a, b) => a.id.localeCompare(b.id))
          // STEP: the writes are exactly the changed rows the manuscript names
          expect(writesOf(schedule, pressed), `${event.key}: row ${row.id} in ${from}`).toEqual(expected)
        }
      })
    }
  }
})

describe('SD-3: a cell the table leaves empty writes nothing (the same reference)', () => {
  it('a row-zoom shrink with no temporarilyExpanded row writes nothing (FR-031, ZE-2)', () => {
    const schedule = scheduleWith({ P: 'expanded', C: 'collapsed', G: 'hidden' })
    expect(writesOf(schedule, eventOf('rowZoomShrinkPressed'))).toEqual([])
  })

  it('fit leaves a hidden row hidden and an auto row alone (HF-8)', () => {
    const schedule = scheduleWith({ P: 'hidden', C: 'temporarilyExpanded', G: 'expanded', S: 'collapsed' })
    expect(writesOf(schedule, eventOf('fitPressed'))).toEqual([
      { id: 'C', to: 'auto' },
      { id: 'G', to: 'auto' },
      { id: 'S', to: 'auto' },
    ])
  })
})
