// DFC-540 (7), 541 (1), 695, 696, 1651: what stays chosen, and what a standing question takes first, read from docs/spec.

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-renderer'
import { bareAll } from '../contract/spec-table'
import { keyOf, rowDocument, rowOf, shell, TEMPLATE, type ShellBench } from './cr-541-stage'

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const surfaceOf = (icon: string): string => bareAll(rowOf('T-109', icon).by['面'] ?? '')[0] ?? ''
const ROW_TITLE_PANEL = 'Row Title Panel'
const ROSTER = surfaceOf('IC-66')
const ASSIGNEE_CHOOSE = 'IC-68'
const ASSIGNEE_DELETE = 'IC-66'
const DELETE_EVERY_ROW = 'IC-106'

const part = (name: string, entry: string | null, rowGroupId: string | null, resourceUid: number | null = null): ScreenPart =>
  ({ part: name, entry, format: null, rowGroupId, resourceUid, dividerPanel: null, noticeDismissKey: null }) as ScreenPart

const take = (built: ShellBench, name: string, entry: string | null, rowGroupId: string | null = null, resourceUid: number | null = null): void => {
  built.aim(part(name, entry, rowGroupId, resourceUid))
  built.click(80, 120)
  built.aim(null)
}

const benchOf = (schedule: Record<string, unknown> = {}, rows = 2): ShellBench => {
  const built = shell(rowDocument(Array.from({ length: rows }, (_one, index) => ({ id: `g${index + 1}`, parentId: null })), {}, schedule))
  benches.push(built)
  return built
}

const selectedTasks = (built: ShellBench): readonly number[] =>
  (built.loop.agentApiSeams().source.readSnapshot().selection as unknown as { items: { kind: string; uid: number }[] }).items.map((one) => one.uid)

const chosenRows = (built: ShellBench): readonly string[] =>
  built.last().rowTitlePanel.titles.filter((one) => one.isSelected).map((one) => one.groupId)

const person = (uid: number, name: string): Record<string, unknown> => ({
  uid,
  name,
  resourceKind: null,
  isCostResource: null,
  calendarUid: null,
  carry: {},
  carryElements: [],
})
const seat = (uid: number, taskUid: number | null, resourceUid: number | null): Record<string, unknown> => ({
  uid,
  taskUid,
  resourceUid,
  carry: {},
  carryElements: [],
})

const rosterOf = (built: ShellBench): readonly any[] => {
  const modal: any = built.last().openModal
  return modal?.surface === ROSTER ? modal.resources : []
}

describe('FR-099 (DFC-541 1) -- the roster\'s chosen assignees follow the document', () => {
  it('after the chosen assignee is deleted, a second press of IC-66 finds nobody chosen and carries RS-27 unseen (CR-712), not a refusal naming a gone assignee', () => {
    const built = benchOf({ resources: [person(41, 'Anna'), person(42, 'Boris')] })
    take(built, 'Command Palette', 'IC-62')
    take(built, ROSTER, ASSIGNEE_CHOOSE, null, 41)
    expect(rosterOf(built).filter((one) => one.isSelected).map((one) => one.uid), 'premise: Anna is chosen').toEqual([41])
    take(built, ROSTER, ASSIGNEE_DELETE)
    expect(rosterOf(built).map((one) => one.uid), 'premise: Anna went').toEqual([42])
    take(built, ROSTER, ASSIGNEE_DELETE)
    expect(rosterOf(built).every((one) => !one.isSelected), 'nobody is chosen any more').toBe(true)
    const keys = built.last().notices.map((one: any) => one.dismissKey as string)
    expect(keys, 'FR-029: a press with nobody chosen carries RS-27, which is not shown').toEqual([])
    expect(rosterOf(built).map((one) => one.uid), 'the other assignee is untouched').toEqual([42])
  })
})

describe('CD-5 / FR-099 (DFC-540 7) -- the roster counts what an assignment points at', () => {
  it('an assignment without a Task still makes its assignee referenced, and no Task name is listed for it', () => {
    const built = benchOf({
      resources: [person(41, 'Anna'), person(42, 'Boris')],
      assignments: [seat(91, null, 41)],
    })
    take(built, 'Command Palette', 'IC-62')
    const [anna, boris] = rosterOf(built)
    expect(anna?.isReferenced, 'CD-5: the assignment points at Anna').toBe(true)
    expect(anna?.unassignedTaskNames, 'there is no Task to name').toEqual([])
    expect(boris?.isReferenced, 'control: nobody points at Boris').toBe(false)
  })

  it('a Task that is not in the document is not listed, a Task without a name is listed as null', () => {
    const unnamed = rowDocument([{ id: 'g1', parentId: null }, { id: 'g2', parentId: null }])
    unnamed.schedule.tasks[1].name = null
    unnamed.schedule.resources = [person(41, 'Anna'), person(42, 'Boris')]
    unnamed.schedule.assignments = [seat(91, 1, 41), seat(92, 77, 41), seat(93, 2, 42)]
    const built = shell(unnamed)
    benches.push(built)
    take(built, 'Command Palette', 'IC-62')
    const [anna, boris] = rosterOf(built)
    expect(anna?.unassignedTaskNames, 'Task 77 is not there, so it is not named').toEqual(['Task1'])
    expect(boris?.unassignedTaskNames, 'FR-099: an unnamed Task is told apart from a missing one').toEqual([null])
  })
})

describe('IN-4 (DFC-1651) -- one Esc answers a standing question and leaves the selection', () => {
  it('Esc on QN-10 answers No; the tasks stay selected; the next Esc clears the selection', () => {
    const built = benchOf()
    built.send(keyOf('A', { ctrl: true }))
    expect(selectedTasks(built), 'premise: both tasks are selected').toEqual([1, 2])
    take(built, surfaceOf(DELETE_EVERY_ROW), DELETE_EVERY_ROW)
    expect(built.last().confirmation?.question, 'premise: QN-10 stands').toBe('QN-10')
    built.send(keyOf('Esc'))
    expect(built.last().confirmation, 'IN-4: the question was spent first').toBeNull()
    expect(selectedTasks(built), 'IN-4: one press spends one level, the selection is not touched').toEqual([1, 2])
    built.send(keyOf('Esc'))
    expect(selectedTasks(built), 'the next press spends the selection').toEqual([])
  })
})

describe('FR-085 / IN-4 / SK-19 (DFC-695) -- a chosen row is a selection Esc and Enter spend', () => {
  // WHY: red on 2e16d0c4 (the second Esc was taken yet the row stayed chosen, and Enter did nothing); green since DFC-695 was fixed.
  it('DFC-695: with only a row chosen and its panel put away, Esc is taken and the row is no longer chosen', () => {
    const built = benchOf()
    take(built, ROW_TITLE_PANEL, null, 'g1')
    expect(chosenRows(built), 'premise').toEqual(['g1'])
    built.send(keyOf('Esc'))
    expect(built.last().propertiesPanel, 'premise: the first Esc put the panel away (IN-4: the panel rung is above the selection)').toBeNull()
    expect(built.loop.isBrowserDefaultStopped(keyOf('Esc')), 'IN-4a: there is a level to spend').toBe(true)
    built.send(keyOf('Esc'))
    expect(chosenRows(built), 'IN-4 / RG-6: the second Esc spends the choice').toEqual([])
    expect(built.loop.isBrowserDefaultStopped(keyOf('Esc')), 'IN-4a: nothing left, the key goes to the browser').toBe(false)
  })

  it('DFC-695: with only a row chosen and no panel up, Enter clears the choice', () => {
    const built = benchOf()
    take(built, ROW_TITLE_PANEL, null, 'g2')
    built.send(keyOf('Esc'))
    expect(chosenRows(built), 'premise: the panel is away and the row is still chosen').toEqual(['g2'])
    built.send(keyOf('Enter'))
    expect(chosenRows(built), 'SK-19 / RG-12: the choice is settled and released').toEqual([])
  })
})

describe('FR-085 (DFC-696) -- a row that left the document is no longer chosen', () => {
  it('after a chosen row is deleted by a write, a new row that takes its id is not chosen', () => {
    const built = benchOf()
    take(built, ROW_TITLE_PANEL, null, 'g1')
    expect(chosenRows(built), 'premise').toEqual(['g1'])
    const api = installAgentApi({ ...built.loop.agentApiSeams(), writerName: 'dfc-696', schemaVersion: TEMPLATE.schemaVersion } as never)
    const written = (command: unknown): any => api.applyCommands({ readStamp: api.readStamp(), commands: [command] } as never)
    expect(written({ kind: 'deleteTaskGroup', groupId: 'g1', newGroupId: 'g-replacement' }).accepted, 'premise: the row was deleted').toBe(true)
    built.send(keyOf('x'))
    expect(built.last().rowTitlePanel.titles.some((one) => one.groupId === 'g1'), 'premise: the row is gone').toBe(false)
    expect(chosenRows(built), 'FR-085 MUST: the row left the choice with the document').toEqual([])
    const again = written({ kind: 'createTaskGroup', id: 'g1', parentId: null, label: 'again', derivedFromTaskUid: null, order: 9 })
    built.send(keyOf('x'))
    expect(again.accepted, JSON.stringify(again)).toBe(true)
    expect(built.last().rowTitlePanel.titles.some((one) => one.groupId === 'g1'), 'premise: a row with that id is back').toBe(true)
    expect(chosenRows(built), 'a stale id would choose the new row').toEqual([])
  })
})
