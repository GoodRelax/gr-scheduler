// DFC-1282 spec-only cases: T-332 SJ-7 / SJ-8 -- a jump to a pinned task group that the pinned band draws makes only the SJ-6 move, whatever room is left below the band; a pinned task group the band does not draw is told as RS-66.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { searchJumpWrites, type SearchJumpPlan, type SearchJumpTarget } from '../../src/use-case/edit-document/edit-document'
import { specTable, unbroken } from './spec-table'

const cellOf = (id: string): string => {
  const row = specTable('T-332').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-332 has no row ${id}`)
  return unbroken(row.by['定め'] ?? '')
}

// see SJ-7, SJ-8
const SJ_7_PINNED_DRAWN =
  '飛ぶ先のタスクグループがピン止めのタスクグループ（`S-126`）で、ピン止めの帯（`FR-098`）に描かれているなら、`SJ-5` を行わず、`SJ-6` だけを行う。'
const SJ_7_ROOM_IRRELEVANT = '帯の下に残る高さは問わない'
const SJ_8_NOT_DRAWN = 'ピン止めのタスクグループでは、帯に入りきらずに描かれていないこと'
const SJ_8_STILL_OPENS = '`SJ-2` と `SJ-4` は行う'

type Loose = Record<string, unknown>
const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Loose & { readonly schedule: Loose; readonly documentSettings: Loose }
const templateTasks = TEMPLATE.schedule['tasks'] as readonly Loose[]
const templateGroups = TEMPLATE.schedule['taskGroups'] as readonly Loose[]

const TASK_GROUP_A = 'task-group-a'
const TASK_GROUP_B = 'task-group-b'
const TARGET_UID = 301

// WHY: the view starts on task group B with both fractions off zero, so any write that moves the task group anchor shows.
const START_SCROLL = { scrollDate: '2026-03-02', scrollGroupId: TASK_GROUP_B, scrollDayOffset: 0.25, scrollGroupOffset: 0.5 }

function documentWithPinned(pinned: readonly string[]): Document {
  const task: Loose = {
    ...(templateTasks[0] as Loose),
    uid: TARGET_UID,
    parentTaskUid: null,
    wbsOrder: 1,
    name: 'target',
    start: '2026-05-01T00:00:00',
    finish: '2026-05-01T00:00:00',
    milestone: false,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    dependencies: [],
  }
  const groups = [TASK_GROUP_A, TASK_GROUP_B].map((id, order) => ({
    ...(templateGroups[0] as Loose),
    id,
    parentId: null,
    order,
    label: id,
    derivedFromTaskUid: null,
    treeState: 'expanded',
  }))
  const schedule = {
    ...TEMPLATE.schedule,
    tasks: [task],
    taskGroups: groups,
    taskGroupMembers: [{ taskUid: TARGET_UID, groupId: TASK_GROUP_A }],
    commentBoxes: [],
    resources: [],
    assignments: [],
    taskVisuals: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }
  const documentSettings = {
    ...TEMPLATE.documentSettings,
    ...START_SCROLL,
    levelZeroTreeState: 'auto',
    pinnedGroupIds: pinned,
  }
  return { ...TEMPLATE, schedule, documentSettings } as unknown as Document
}

const TO_TASK: SearchJumpTarget = { kind: 'task', taskUid: TARGET_UID }

// WHY: a day is ten pixels wide and nothing of the task reaches left of its date.
// see SJ-5, SJ-6 -- no picture is read (landing null): the cases here judge SJ-7 and SJ-8 alone
const reachWith = (drawnTaskGroups: readonly { groupId: string; isPinned?: boolean }[]) => ({
  pxPerDay: 10,
  leftReachPx: 0,
  drawnTaskGroups,
  areaWidth: 800,
  landing: null,
})
const PINNED_BAND_DRAWS_A = reachWith([{ groupId: TASK_GROUP_A, isPinned: true }])
const PINNED_BAND_DRAWS_NOTHING = reachWith([])

const scrollOf = (plan: SearchJumpPlan): Loose | null => plan.scrollWrite as unknown as Loose | null

describe('DFC-1282 premise -- the clauses these cases press still stand', () => {
  it('SJ-7 and SJ-8 still read this way', () => {
    expect(cellOf('SJ-7')).toContain(SJ_7_PINNED_DRAWN)
    expect(cellOf('SJ-7')).toContain(SJ_7_ROOM_IRRELEVANT)
    expect(cellOf('SJ-8')).toContain(SJ_8_NOT_DRAWN)
    expect(cellOf('SJ-8')).toContain(SJ_8_STILL_OPENS)
  })
})

describe(`T-332 SJ-7 -- ${SJ_7_PINNED_DRAWN} ${SJ_7_ROOM_IRRELEVANT}`, () => {
  it.each([
    ['with room below the band', true],
    ['with no room below the band', false],
  ] as const)('a pinned task group the band draws, %s: it is not told as no room', (_name, hasRoom) => {
    const plan = searchJumpWrites(documentWithPinned([TASK_GROUP_A]), TO_TASK, hasRoom, PINNED_BAND_DRAWS_A)
    expect(plan.isBlockedByPinnedTaskGroups, SJ_7_ROOM_IRRELEVANT).toBe(false)
  })

  it.each([
    ['with room below the band', true],
    ['with no room below the band', false],
  ] as const)('a pinned task group the band draws, %s: SJ-5 is not done, the task group anchor stays', (_name, hasRoom) => {
    const plan = searchJumpWrites(documentWithPinned([TASK_GROUP_A]), TO_TASK, hasRoom, PINNED_BAND_DRAWS_A)
    expect(scrollOf(plan), 'SJ-6 still moves the view across, so a scroll is written').not.toBeNull()
    expect(scrollOf(plan)).toMatchObject({
      kind: 'setScrollPosition',
      scrollGroupId: START_SCROLL.scrollGroupId,
      scrollGroupOffset: START_SCROLL.scrollGroupOffset,
    })
  })

  it('the SJ-6 move is the same whether or not room is left below the band', () => {
    const roomy = searchJumpWrites(documentWithPinned([TASK_GROUP_A]), TO_TASK, true, PINNED_BAND_DRAWS_A)
    const tight = searchJumpWrites(documentWithPinned([TASK_GROUP_A]), TO_TASK, false, PINNED_BAND_DRAWS_A)
    expect(scrollOf(tight)).toEqual(scrollOf(roomy))
  })
})

describe(`T-332 SJ-8 -- ${SJ_8_NOT_DRAWN}`, () => {
  it.each([
    ['with room below the band', true],
    ['with no room below the band', false],
  ] as const)('a pinned task group the band does not draw, %s: it is told as no room and nothing scrolls', (_name, hasRoom) => {
    const plan = searchJumpWrites(documentWithPinned([TASK_GROUP_A]), TO_TASK, hasRoom, PINNED_BAND_DRAWS_NOTHING)
    expect(plan.isBlockedByPinnedTaskGroups, SJ_8_NOT_DRAWN).toBe(true)
    expect(plan.scrollWrite).toBeNull()
  })

  it(`a pinned task group the band does not draw still gets nothing but the writes of SJ-2 (${SJ_8_STILL_OPENS})`, () => {
    const plan = searchJumpWrites(documentWithPinned([TASK_GROUP_A]), TO_TASK, false, PINNED_BAND_DRAWS_NOTHING)
    expect(plan.scrollWrite).toBeNull()
    for (const write of plan.treeStateWrites as unknown as readonly Loose[]) {
      expect(['setTaskGroupTreeState', 'setLevelZeroTreeState']).toContain(write['kind'])
    }
  })

  it('a task group that is not pinned and has no room below the band is told as no room (the plain SJ-8 case)', () => {
    const plan = searchJumpWrites(documentWithPinned([TASK_GROUP_B]), TO_TASK, false, reachWith([{ groupId: TASK_GROUP_B, isPinned: true }]))
    expect(plan.isBlockedByPinnedTaskGroups).toBe(true)
    expect(plan.scrollWrite).toBeNull()
  })
})
