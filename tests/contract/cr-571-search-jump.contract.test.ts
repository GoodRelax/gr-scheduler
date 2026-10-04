// Contract test: FR-151 table T-332 (SJ-2, SJ-5 to SJ-8) against searchJumpWrites (PI-9), and the RS-66 row it tells with.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  searchJumpWrites,
  type SearchJumpPlan,
  type SearchJumpTarget,
} from '../../src/use-case/edit-document/edit-document'
import { specTable, unbroken, type SpecRow } from './spec-table'

function rowOf(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(table, id).by[heading] ?? '')

const SJ_2_OPENS =
  '飛ぶ先の行（タスクは `AT-61`、コメントボックスは `AT-114`）と、その祖先のすべての `treeState` を `expanded` にする —— 今の値が `hidden` でも、確かめを問わない。'
const SJ_2_LEVEL_ZERO = '段 0 が畳まれていれば開く。'
const SJ_2_NOTHING_CHANGED = '1 つも変わらなければ段を積まない'
const SJ_5_TOP = '`_assets/tbl-settings.md` の `S-78` をその行にし、行の中のずれを 0 にする'
const SJ_6_NO_ZOOM = '倍率を変えない。'
const SJ_6_NO_DATE = '日付が空なら横は動かさない'
const SJ_7_PINNED =
  '飛ぶ先の行がピン止めの行（`S-126`）で、ピン止めの帯（`FR-098`）に描かれているなら、`SJ-5` を行わず、`SJ-6` だけを行う'
const SJ_8_NO_ROOM =
  '飛ぶ先の行を画面に出せないときは、`SJ-5` と `SJ-6` を行わず、表 T-233 の `RS-66` を告げる。'
const SJ_8_STILL = '`SJ-2` と `SJ-4` は行う'
// see SJ-6
// WHY: a day is ten pixels wide, and nothing of the task reaches left of its date unless a case says so.
const NO_REACH = { pxPerDay: 10, leftReachPx: 0 }
const RS_66_SCENE = '**ピン止めした行が多く、検索パネルから飛ぶ先を画面に出せない**'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, unknown> & { readonly schedule: Record<string, unknown>; readonly documentSettings: Record<string, unknown> }
type Loose = Record<string, unknown>
const templateTasks = TEMPLATE.schedule['tasks'] as readonly Loose[]
const templateGroups = TEMPLATE.schedule['taskGroups'] as readonly Loose[]

const R1 = 'row-1'
const R11 = 'row-1-1'
const R12 = 'row-1-2'
const R2 = 'row-2'
const ROWS: readonly (readonly [string, string | null, number])[] = [
  [R1, null, 0],
  [R11, R1, 0],
  [R12, R1, 1],
  [R2, null, 1],
]

const task = (uid: number, start: string): Loose => ({
  ...(templateTasks[0] as Loose),
  uid,
  wbsParentUid: null,
  wbsOrder: uid,
  name: `task ${uid}`,
  start,
  finish: start,
  milestone: false,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  dependencies: [],
})

const commentBox = (id: string, anchorGroupId: string, anchorDate: string | null): Loose => ({
  id,
  leaderShapeKind: null,
  text: id,
  anchorDate,
  anchorGroupId,
  bodyOffsetPx: null,
  strokeColor: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
  textColor: null,
})

// WHY: the view starts somewhere else (R2, both fractions off zero) so a write to it shows.
const START_SCROLL = { scrollDate: '2026-03-02', scrollGroupId: R2, scrollDayOffset: 0.25, scrollGroupOffset: 0.5 }

interface Arranged {
  readonly treeStates?: Readonly<Record<string, string>>
  readonly levelZero?: 'auto' | 'collapsed'
  readonly pinned?: readonly string[]
}

function documentOf(arranged: Arranged = {}): Document {
  const taskGroups = ROWS.map(([id, parentId, order]) => ({
    ...(templateGroups[0] as Loose),
    id,
    parentId,
    order,
    label: id,
    derivedFromTaskUid: null,
    treeState: arranged.treeStates?.[id] ?? 'auto',
  }))
  const schedule = {
    ...TEMPLATE.schedule,
    tasks: [task(201, '2026-05-01T00:00:00')],
    taskGroups,
    taskGroupMembers: [{ taskUid: 201, groupId: R11 }],
    commentBoxes: [commentBox('c-dated', R12, '2026-04-20T00:00:00'), commentBox('c-undated', R12, null)],
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
    levelZeroTreeState: arranged.levelZero ?? 'auto',
    pinnedGroupIds: arranged.pinned ?? [],
  }
  return { ...TEMPLATE, schedule, documentSettings } as unknown as Document
}

const TO_TASK: SearchJumpTarget = { kind: 'task', taskUid: 201 }
const TO_UNDATED_BOX: SearchJumpTarget = { kind: 'commentBox', commentBoxId: 'c-undated' }
const TO_DATED_BOX: SearchJumpTarget = { kind: 'commentBox', commentBoxId: 'c-dated' }

type Written = { readonly kind: string; readonly id: string; readonly to: string }

/** @purity pure */
function treeWritesOf(plan: SearchJumpPlan): readonly Written[] {
  return plan.treeStateWrites
    .map((command) => {
      const loose = command as unknown as Loose
      const kind = String(loose['kind'])
      if (kind === 'setTaskGroupTreeState') return { kind, id: String(loose['groupId']), to: String(loose['treeState']) }
      if (kind === 'setLevelZeroTreeState') return { kind, id: 'level 0', to: String(loose['levelZeroTreeState']) }
      return { kind, id: '?', to: '?' }
    })
    .sort((a, b) => a.id.localeCompare(b.id))
}

const scrollOf = (plan: SearchJumpPlan): Loose | null => plan.scrollWrite as unknown as Loose | null

const everyWrite = (plan: SearchJumpPlan): readonly Loose[] =>
  [...plan.treeStateWrites, ...(plan.scrollWrite === null ? [] : [plan.scrollWrite])] as unknown as readonly Loose[]

describe('table T-332 and RS-66 -- the clauses these cases are driven by', () => {
  it('SJ-2, SJ-5 to SJ-8 still read this way', () => {
    expect(cellOf('T-332', 'SJ-2', '定め')).toContain(SJ_2_OPENS)
    expect(cellOf('T-332', 'SJ-2', '定め')).toContain(SJ_2_LEVEL_ZERO)
    expect(cellOf('T-332', 'SJ-2', '定め')).toContain(SJ_2_NOTHING_CHANGED)
    expect(cellOf('T-332', 'SJ-5', '定め')).toContain(SJ_5_TOP)
    expect(cellOf('T-332', 'SJ-6', '定め')).toContain(SJ_6_NO_ZOOM)
    expect(cellOf('T-332', 'SJ-6', '定め')).toContain(SJ_6_NO_DATE)
    expect(cellOf('T-332', 'SJ-7', '定め')).toContain(SJ_7_PINNED)
    expect(cellOf('T-332', 'SJ-8', '定め')).toContain(SJ_8_NO_ROOM)
    expect(cellOf('T-332', 'SJ-8', '定め')).toContain(SJ_8_STILL)
  })

  it('table T-233 holds RS-66, told with NT-3a, owned by SJ-8', () => {
    const rs66 = rowOf('T-233', 'RS-66')
    expect(rs66.cells[0]).toBe(RS_66_SCENE)
    expect(rs66.cells).toContain('`NT-3a`')
    expect(unbroken(rs66.cells.join(' '))).toContain('`SJ-8`')
  })
})

describe(`T-332 SJ-2 -- ${SJ_2_OPENS}`, () => {
  it('opens the task\'s row and its ancestor, a hidden one without asking, and level 0 when it is folded', () => {
    const plan = searchJumpWrites(
      documentOf({ treeStates: { [R1]: 'collapsed', [R11]: 'hidden', [R2]: 'collapsed' }, levelZero: 'collapsed' }),
      TO_TASK,
      true, NO_REACH,
    )
    expect(treeWritesOf(plan)).toEqual([
      { kind: 'setLevelZeroTreeState', id: 'level 0', to: 'auto' },
      { kind: 'setTaskGroupTreeState', id: R1, to: 'expanded' },
      { kind: 'setTaskGroupTreeState', id: R11, to: 'expanded' },
    ])
  })

  it('opens the AT-114 row of a comment box and its ancestor', () => {
    const plan = searchJumpWrites(documentOf({ treeStates: { [R1]: 'temporarilyExpanded', [R12]: 'collapsed' } }), TO_DATED_BOX, true, NO_REACH)
    expect(treeWritesOf(plan)).toEqual([
      { kind: 'setTaskGroupTreeState', id: R1, to: 'expanded' },
      { kind: 'setTaskGroupTreeState', id: R12, to: 'expanded' },
    ])
  })

  it(`writes nothing to the tree when nothing would change -- ${SJ_2_NOTHING_CHANGED}`, () => {
    const plan = searchJumpWrites(documentOf({ treeStates: { [R1]: 'expanded', [R11]: 'expanded' } }), TO_TASK, true, NO_REACH)
    expect(plan.treeStateWrites).toEqual([])
  })
})

describe(`T-332 SJ-5 -- ${SJ_5_TOP}`, () => {
  it('puts the task\'s row at the top of the view with no offset inside it', () => {
    const plan = searchJumpWrites(documentOf(), TO_TASK, true, NO_REACH)
    expect(plan.isBlockedByPinnedRows).toBe(false)
    expect(scrollOf(plan)).toMatchObject({ kind: 'setScrollPosition', scrollGroupId: R11, scrollGroupOffset: 0 })
  })

  it('SJ-6: what the task reaches left of its date moves the view left by that much (CR-629)', () => {
    const atDate = scrollOf(searchJumpWrites(documentOf(), TO_TASK, true, NO_REACH)) as Loose
    const reached = scrollOf(searchJumpWrites(documentOf(), TO_TASK, true, { pxPerDay: 10, leftReachPx: 25 })) as Loose
    const daysBack =
      (Date.parse(String(atDate['scrollDate'])) - Date.parse(String(reached['scrollDate']))) / 86_400_000
      + Number(atDate['scrollDayOffset']) - Number(reached['scrollDayOffset'])
    expect(daysBack).toBeCloseTo(2.5, 9)
  })

  it(`a comment box with no date moves the row only -- SJ-6: ${SJ_6_NO_DATE}`, () => {
    const plan = searchJumpWrites(documentOf(), TO_UNDATED_BOX, true, NO_REACH)
    expect(scrollOf(plan)).toMatchObject({
      kind: 'setScrollPosition',
      scrollGroupId: R12,
      scrollGroupOffset: 0,
      scrollDate: START_SCROLL.scrollDate,
      scrollDayOffset: START_SCROLL.scrollDayOffset,
    })
  })

  it(`SJ-6: ${SJ_6_NO_ZOOM} -- no write of the plan touches the zoom`, () => {
    for (const target of [TO_TASK, TO_DATED_BOX, TO_UNDATED_BOX]) {
      for (const write of everyWrite(searchJumpWrites(documentOf({ levelZero: 'collapsed' }), target, true, NO_REACH))) {
        expect(['setTaskGroupTreeState', 'setLevelZeroTreeState', 'setScrollPosition'], JSON.stringify(target)).toContain(
          write['kind'],
        )
      }
    }
  })
})

describe(`T-332 SJ-7 -- ${SJ_7_PINNED}`, () => {
  it('leaves the row anchor where it was when the task\'s row is pinned, and still writes the SJ-6 move', () => {
    // WHY: the view starts two months before the task, so SJ-6 has to write; its date is not
    // asserted because S-428 is still undecided.
    const plan = searchJumpWrites(documentOf({ pinned: [R11] }), TO_TASK, true, NO_REACH)
    expect(plan.isBlockedByPinnedRows).toBe(false)
    expect(scrollOf(plan)).toMatchObject({
      kind: 'setScrollPosition',
      scrollGroupId: START_SCROLL.scrollGroupId,
      scrollGroupOffset: START_SCROLL.scrollGroupOffset,
    })
  })

  it('an undated comment box on a pinned row moves nothing at all', () => {
    const scroll = scrollOf(searchJumpWrites(documentOf({ pinned: [R12] }), TO_UNDATED_BOX, true, NO_REACH))
    if (scroll !== null) expect(scroll).toMatchObject({ kind: 'setScrollPosition', ...START_SCROLL })
  })
})

describe(`T-332 SJ-8 -- ${SJ_8_NO_ROOM}`, () => {
  it(`no room below the pinned rows: no scroll, the plan says it was blocked, and ${SJ_8_STILL}`, () => {
    const plan = searchJumpWrites(
      documentOf({ pinned: [R2], treeStates: { [R1]: 'collapsed' }, levelZero: 'collapsed' }),
      TO_TASK,
      false, NO_REACH,
    )
    expect(plan.isBlockedByPinnedRows).toBe(true)
    expect(plan.scrollWrite).toBeNull()
    expect(treeWritesOf(plan)).toEqual([
      { kind: 'setLevelZeroTreeState', id: 'level 0', to: 'auto' },
      { kind: 'setTaskGroupTreeState', id: R1, to: 'expanded' },
      { kind: 'setTaskGroupTreeState', id: R11, to: 'expanded' },
    ])
  })

  it('with room below the pinned rows it is not blocked', () => {
    expect(searchJumpWrites(documentOf({ pinned: [R2] }), TO_TASK, true, NO_REACH).isBlockedByPinnedRows).toBe(false)
  })
})
