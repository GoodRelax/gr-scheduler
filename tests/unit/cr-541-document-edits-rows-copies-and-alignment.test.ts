// CR-541: the document edits whose MUST clauses CR-541 added: new rows, the last row, copies, alignment.

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressRowOf,
  type InputContext,
  type PointerInput,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import type { ChangeStep, WriteMoment } from '../../src/use-case/apply-document-change/apply-document-change'
import {
  planDocumentChange,
  planDocumentReplacement,
} from '../../src/use-case/apply-document-change/document-change-plan'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { emptySelection, selectionWith, type Selection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  editTask,
  NOT_STORED_ZOOM_BOUNDS,
  type EditResult,
} from '../../src/use-case/edit-document/edit-document'
import { bare, bareAll, specTable } from '../contract/spec-table'
import {
  keyOf,
  REQUIREMENTS,
  rowDocument,
  rowOf,
  SCREEN,
  shell,
  taskOf,
  type ShellBench,
} from './cr-541-stage'

const Q01 = '下へドラッグすれば、行の無い縦位置を指せる。⭐ 作る行は、最も浅い段の末子とすること（MUST）'
const Q09 = '⭐ その行の id は、表 T-108 の `CM-26` が行を作るときと同じく、新しく採ること（MUST）'
const Q10_FULL = '新しく採ること（MUST）。⛔ 決まった値を使ってはならない（MUST NOT）'
const Q11 = '⛔ **取り消しの単位を分けてはならない（MUST NOT）'
const Q12 = '⭐ `Task` が 2 つ以上選ばれているときは、選ばれた `Task` をすべて複製し、それぞれを上の段のとおり複製元と同じ行に載せること（MUST）'
const Q13 = '⭐ 選ばれた `Task` のうち、ほかの選ばれた `Task` の WBS の子孫であるものは、その祖先の部分木として 1 度だけ複製すること（MUST）'
const Q14 = '⭐ 複製の根（選ばれた `Task` の複製）は、複製元と同じ WBS の親の下に兄弟として置き、部分木の内側の親子は複製どうしへ付け替えること（MUST）'
const Q15 = '⛔ 貼り付け先として行が 2 つ以上選ばれているときは、貼り付けを受け付けずに通知すること（MUST）'
const Q16 = '**揃えるほうの端を動かすときは、もう一方の端も同じ暦日の数だけ動かし、期間を保つこと（MUST）'

const DEFAULT_ROW_NAME = 'fixture default row name'

const accepted = (result: EditResult): Document => {
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

describe('CR-541 -- the clauses still stand in the manuscript', () => {
  it.each([Q01, Q09, Q10_FULL, Q11, Q12, Q13, Q14, Q15, Q16])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('TC-3 -- the made row is the last child of the shallowest level', () => {
  it(Q01, () => {
    const document = rowDocument([
      { id: 'row-a', parentId: null },
      { id: 'row-b', parentId: 'row-a' },
      { id: 'row-z', parentId: null },
    ]) as unknown as Document
    const after = accepted(
      editTask(
        document,
        { kind: 'createTask', shapeKind: 'rectangle', start: '2026-04-13T08:00:00', finish: '2026-04-17T17:00:00', groupId: 'row-fresh' },
        DEFAULT_ROW_NAME,
      ),
    )
    const groups = after.schedule.taskGroups
    const made = groups.find((one) => one.id === 'row-fresh')
    expect(made, 'TC-3: a row is made').toBeDefined()
    expect(made!.parentId, 'the shallowest level').toBeNull()
    const topOrders = groups.filter((one) => one.parentId === null && one.id !== 'row-fresh').map((one) => one.order)
    for (const order of topOrders) expect(made!.order, 'the last child of that level').toBeGreaterThan(order)
    const member = after.schedule.taskGroupMembers.find((one) => one.groupId === 'row-fresh')
    expect(member, 'the task is carried on the made row').toBeDefined()
  })
})

const oneRow = (): Document => rowDocument([{ id: 'only-row', parentId: null }]) as unknown as Document
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, deliveringNotices: false }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

// WHY: through the change plan, the one road every write takes; T-050 forbids a copy per road.
const deleteLastPlanned = (newGroupId: string) => {
  const document = oneRow()
  const plan = planDocumentChange({
    document,
    readStamp: document.documentStamp,
    commands: [{ kind: 'deleteTaskGroup', groupId: 'only-row', newGroupId } as never],
    moment: CALM,
    history: EMPTY_HISTORY,
    historyLimits: { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 },
    settingsLimits: { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 },
    defaultRowName: DEFAULT_ROW_NAME,
    editedBy: 'cr-541 row deleter',
    updatedUtc: '2026-09-22T01:00:00Z',
  })
  if (!plan.ok) throw new Error(`the delete was refused: ${JSON.stringify(plan.refusal)}`)
  return plan
}
const deleteLast = (newGroupId: string): Document => deleteLastPlanned(newGroupId).document

describe('T-050 -- the row made when the last row goes', () => {
  it(Q09, () => {
    const after = deleteLast('bbbbbbbb-0000-4000-8000-00000000000f')
    expect(after.schedule.taskGroups.map((one) => one.id)).toEqual(['bbbbbbbb-0000-4000-8000-00000000000f'])
    expect(after.schedule.taskGroups[0]!.parentId).toBeNull()
  })

  it(Q10_FULL, () => {
    const one = deleteLast('cccccccc-0000-4000-8000-000000000001').schedule.taskGroups[0]!.id
    const other = deleteLast('cccccccc-0000-4000-8000-000000000002').schedule.taskGroups[0]!.id
    expect(one, 'two documents emptied apart do not share a row id').not.toBe(other)
  })

  it(`${Q11} -- one undo brings the deleted row back`, () => {
    const before = JSON.stringify(oneRow().schedule.taskGroups)
    const deleted = deleteLastPlanned('dddddddd-0000-4000-8000-000000000001')
    expect(deleted.document.schedule.taskGroups.map((one) => one.id)).toEqual([
      'dddddddd-0000-4000-8000-000000000001',
    ])
    const undone = planDocumentReplacement({
      held: { document: deleted.document, history: deleted.history },
      readStamp: deleted.document.documentStamp,
      moment: CALM,
      call: { row: 'RD-1' },
      defaultRowName: DEFAULT_ROW_NAME,
      newGroupId: 'dddddddd-0000-4000-8000-000000000002',
    })
    expect(undone.ok).toBe(true)
    if (!undone.ok) return
    expect(JSON.stringify(undone.next.document.schedule.taskGroups)).toBe(before)
  })
})

const copyDocument = (): Document =>
  rowDocument([{ id: 'row-1', parentId: null }, { id: 'row-2', parentId: null }], {}, {
    tasks: [
      taskOf(1, { name: 'P' }),
      taskOf(2, { name: 'A', wbsParentUid: 1 }),
      taskOf(3, { name: 'A1', wbsParentUid: 2 }),
      taskOf(4, { name: 'B' }),
    ],
    taskGroupMembers: [
      { taskUid: 1, groupId: 'row-1', stackOrder: null },
      { taskUid: 2, groupId: 'row-1', stackOrder: null },
      { taskUid: 3, groupId: 'row-1', stackOrder: null },
      { taskUid: 4, groupId: 'row-2', stackOrder: null },
    ],
  }) as unknown as Document

const paste = (sourceUids: readonly number[]): Document =>
  accepted(editTask(copyDocument(), { kind: 'pasteTaskSubtree', sourceUids } as never, DEFAULT_ROW_NAME))

const copiesIn = (document: Document) => document.schedule.tasks.filter((one) => one.uid > 4)
const rowOfTask = (document: Document, uid: number): string | undefined =>
  document.schedule.taskGroupMembers.find((one) => one.taskUid === uid)?.groupId

describe('FR-033 -- several selected tasks', () => {
  it(Q12, () => {
    const after = paste([2, 4])
    const copies = copiesIn(after)
    const byName = new Map(copies.map((one) => [one.name, one]))
    expect(copies.map((one) => one.name).sort()).toEqual(['A', 'A1', 'B'])
    expect(rowOfTask(after, byName.get('A')!.uid), 'the copy of A rides A\'s row').toBe('row-1')
    expect(rowOfTask(after, byName.get('A1')!.uid)).toBe('row-1')
    expect(rowOfTask(after, byName.get('B')!.uid), 'the copy of B rides B\'s row').toBe('row-2')
  })

  it(Q13, () => {
    const copies = copiesIn(paste([2, 3]))
    expect(copies.map((one) => one.name).sort(), 'A1 is copied once, inside A\'s subtree').toEqual(['A', 'A1'])
  })

  it(Q14, () => {
    const after = paste([2])
    const copies = copiesIn(after)
    const root = copies.find((one) => one.name === 'A')
    const child = copies.find((one) => one.name === 'A1')
    expect(root?.wbsParentUid, 'the copy root is a sibling under the source\'s WBS parent').toBe(1)
    expect(child?.wbsParentUid, 'inside the subtree the parent is the copy').toBe(root?.uid)
  })
})

const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')
const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

describe('FR-033 -- the paste target', () => {
  it(Q15, () => {
    // WHY: no row names the modifier that adds a row to the picked rows, so each one is tried;
    // the premise fails only when none of them picks two rows.
    let built: ShellBench | null = null
    for (const modifier of ['ctrl', 'shift', 'meta'] as const) {
      const trial = shell(
        rowDocument([
          { id: 'row-1', parentId: null },
          { id: 'row-2', parentId: null },
          { id: 'row-3', parentId: null },
        ]),
      )
      benches.push(trial)
      const pickRow = (groupId: string, adding: boolean): void => {
        trial.aim({ part: ROW_TITLE_PANEL, entry: null, format: null, rowGroupId: groupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as never)
        trial.click(60, 120, adding ? { [modifier]: true } : {})
        trial.aim(null)
      }
      pickRow('row-1', false)
      trial.send(keyOf('C', { ctrl: true }))
      pickRow('row-2', false)
      pickRow('row-3', true)
      const selected = trial.last().rowTitlePanel.titles.filter((one) => one.isSelected).map((one) => one.groupId)
      if (selected.length === 2) {
        built = trial
        break
      }
    }
    expect(built, 'premise: some modifier picks two rows (FR-085)').not.toBeNull()
    const before = JSON.stringify(built!.groups())
    built!.send(keyOf('V', { ctrl: true }))
    expect(JSON.stringify(built!.groups()), 'the paste is not accepted').toBe(before)
    expect(built!.notices().length, 'and it is told').toBeGreaterThan(0)
  })
})

const ALIGN_ENTRANCES = specTable('T-109')
  .rows.filter((one) => bare(one.by['正'] ?? '') === 'FR-034')
  .map((one) => ({ row: one.id, end: (one.by['何の入口か'] ?? '').includes('開始日') ? ('start' as const) : ('finish' as const) }))
const PALETTE = bareAll(rowOf('T-109', ALIGN_ENTRANCES[0]!.row).by['面'] ?? '')[0] ?? ''

const alignDocument = (): Document =>
  rowDocument([{ id: 'row-1', parentId: null }, { id: 'row-2', parentId: null }], { scrollDate: '2026-02-01' }, {
    tasks: [
      taskOf(1, { name: 'follower', start: '2026-02-10T08:00:00', finish: '2026-02-20T17:00:00' }),
      taskOf(2, { name: 'anchor', start: '2026-02-12T08:00:00', finish: '2026-02-16T17:00:00' }),
    ],
  }) as unknown as Document

function pressAlign(entry: string, selection: Selection): TranslatedInput {
  const document = alignDocument()
  const settings = document.documentSettings
  const regions = regionsFromScreen(SCREEN as never, settings)
  const layout = layoutFromSchedule(document.schedule, settings, regions)
  const context: InputContext = {
    document,
    layout,
    geometry: geometryFromLayout(document.schedule, settings, layout, regions, emptySelection()),
    regions,
    screen: emptyScreenSession.screen,
    selection,
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-02-15T00:00:00',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as InputContext
  const at = (phase: 'down' | 'up'): PointerInput => ({
    kind: 'pointer',
    phase,
    button: 'left',
    x: 420,
    y: 320,
    modifiers: { ctrl: false, shift: false, alt: false, meta: false },
    clickCount: 1,
  })
  const pressed = {
    at: at('down'),
    hit: null,
    on: { part: PALETTE, entry, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null },
    pressRow: pressRowOf({ at: at('down'), hit: null }, context),
  }
  return commandFromInput(at('up'), { ...context, pressed } as InputContext)
}

const DAY_MS = 24 * 60 * 60 * 1000
const calendarDays = (from: string, to: string): number =>
  Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / DAY_MS)

describe('FR-034 -- alignment moves the other end by the same calendar days', () => {
  it('premise: table T-109 gives FR-034 one start entrance and one finish entrance', () => {
    expect(ALIGN_ENTRANCES.map((one) => one.end).sort()).toEqual(['finish', 'start'])
  })

  it.each(ALIGN_ENTRANCES.map((one) => [one.row, one.end] as const))(`${Q16} -- %s (%s)`, (entry, end) => {
    const picked = selectionWith(selectionWith(emptySelection(), { kind: 'task', uid: 1 }), { kind: 'task', uid: 2 })
    const answer = pressAlign(entry, picked)
    const writes =
      answer.action !== null && answer.action.kind === 'changeDocument'
        ? answer.action.writes.flat().filter((one: any) => one.kind === 'setTaskPlanDates' && one.uid === 1)
        : []
    expect(writes, 'premise: one write of the follower\'s plan dates').toHaveLength(1)
    const written = writes[0] as unknown as { start: string; finish: string }
    const anchorEnd = end === 'start' ? '2026-02-12' : '2026-02-16'
    expect(written[end].slice(0, 10), 'the aligned end lands on the anchor').toBe(anchorEnd)
    expect(calendarDays(written.start, written.finish), 'the duration in calendar days is kept').toBe(
      calendarDays('2026-02-10', '2026-02-20'),
    )
  })
})
