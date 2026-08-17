// Unit tests for UF-12, the `TaskGroup` aggregate of EditDocument.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.
//
// Every expectation below is read off docs/spec -- CM-26 to CM-35 of table
// T-108 and the requirements those rows point at (FR-085, FR-032 with table
// T-050, FR-033 with table T-223, FR-042, FR-058, FR-004 with table T-015,
// FR-005 with table T-015a) -- never off the implementation.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type {
  Assignment,
  CommentBox,
  HighlightBox,
  Resource,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskOrigin,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import { editTaskGroup, type TaskGroupCommand } from '../../src/use-case/edit-document/edit-document'

// ---------------------------------------------------------------- fixtures --
//
// ⚠️ Every nullable column of table T-058 is spelled `null` here. Leaving one
// `undefined` reads as "set" and would let a case pass for the wrong reason.

const groupOf = (part: Partial<TaskGroup> & { readonly id: string }): TaskGroup => ({
  parentId: null,
  label: 'row',
  derivedFromTaskUid: null,
  order: 0,
  isCollapsed: null,
  isHidden: null,
  color: null,
  height: null,
  ...part,
})

const taskOf = (part: Partial<Task> & { readonly uid: number }): Task => ({
  wbsParentUid: null,
  wbsOrder: null,
  name: 'task',
  start: null,
  finish: null,
  milestone: null,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  actualDuration: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
  carry: {},
  carryElements: [],
  ...part,
})

const memberOf = (taskUid: number, groupId: string): TaskGroupMember => ({
  taskUid,
  groupId,
  stackOrder: null,
})

const visualOf = (taskUid: number): TaskVisual => ({
  taskUid,
  nameAnchor: null,
  nameAlign: null,
  shapeKind: null,
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  lineWeight: null,
})

const originOf = (taskUid: number): TaskOrigin => ({
  taskUid,
  sourceProjectUid: null,
  sourceUid: taskUid,
  lastSeenImportSeq: 0,
  importSessionId: null,
})

const resourceOf = (uid: number): Resource => ({
  uid,
  name: 'someone',
  resourceKind: 1,
  isCostResource: null,
  calendarUid: null,
  carry: {},
  carryElements: [],
})

const assignmentOf = (uid: number, taskUid: number, resourceUid: number): Assignment => ({
  uid,
  taskUid,
  resourceUid,
  carry: {},
  carryElements: [],
})

const commentOf = (id: string, anchorGroupId: string | null): CommentBox => ({
  id,
  leaderShapeKind: null,
  text: null,
  anchorDate: null,
  anchorGroupId,
  bodyOffsetPx: null,
})

const highlightOf = (
  id: string,
  topGroupId: string | null,
  bottomGroupId: string | null,
): HighlightBox => ({
  id,
  startDate: null,
  endDate: null,
  topGroupId,
  bottomGroupId,
  strokeColor: null,
  cornerRadiusPx: null,
})

interface DocumentParts {
  readonly project?: Record<string, unknown>
  readonly schedule?: Partial<Schedule>
  readonly documentSettings?: Record<string, unknown>
}

// A whole Document is far more than these cases read, so the fixture carries
// the keys this aggregate touches: the schedule group in full, plus the four
// settings rows table T-050's CD-2 and table T-211's S-125 name.
const documentOf = (part: DocumentParts = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: {
        id: null,
        name: null,
        title: 'A',
        subject: null,
        category: null,
        company: null,
        manager: null,
        author: null,
        created: null,
        revision: null,
        lastSaved: null,
        startDate: null,
        statusDate: null,
        minutesPerDay: null,
        minutesPerWeek: null,
        daysPerMonth: null,
        weekStartDay: null,
        calendarUid: null,
        themeHue: 214,
        // AT-20: the highest uid already issued. FR-033's copies number from it.
        uidHighWaterMark: 100,
        importSeq: 0,
        carry: {},
        carryElements: [],
        ...(part.project ?? {}),
      },
      calendars: [],
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
      ...(part.schedule ?? {}),
    },
    documentSettings: {
      maxGroupDepth: 5, // S-125
      pinnedGroupIds: [], // S-126
      pinnedRowMax: 5, // S-127
      scrollDate: null,
      scrollGroupId: null, // S-78
      stackSafetyCap: 255, // S-89
      ...(part.documentSettings ?? {}),
    },
    revisionStamp: { revision: 3, lastEditedBy: 'user', updatedAt: '2026-08-17T00:00:00' },
    changeLog: [],
  }) as unknown as Document

/**
 * A chain of rows d1 .. dN, d1 at the top. Depth is 1-based: FR-018 speaks of
 * 深さ 1 as the rows with no parent ("最小倍率で深さ 1 も消え"), so a chain of
 * five is exactly S-125's limit of 5.
 */
const chainOf = (depth: number): TaskGroup[] =>
  Array.from({ length: depth }, (_, at) =>
    groupOf({ id: `d${at + 1}`, parentId: at === 0 ? null : `d${at}`, label: `level ${at + 1}` }),
  )

const groupById = (schedule: Schedule, id: string): TaskGroup | undefined =>
  schedule.taskGroups.find((one) => one.id === id)

const idsOf = (groups: readonly TaskGroup[]): string[] => groups.map((one) => one.id)

/** The children of one parent, in the order AT-55 puts them. */
const childrenOf = (schedule: Schedule, parentId: string | null): string[] =>
  idsOf(
    [...schedule.taskGroups]
      .filter((one) => one.parentId === parentId)
      .sort((a, b) => a.order - b.order),
  )

const run = (document: Document, command: TaskGroupCommand) => editTaskGroup(document, command)

const CREATE: Omit<Extract<TaskGroupCommand, { kind: 'createTaskGroup' }>, 'kind' | 'id'> = {
  parentId: null,
  label: 'new row',
  derivedFromTaskUid: null,
  order: 0,
}

describe('EditTaskGroup (UF-12) -- CM-26 createTaskGroup', () => {
  it('FR-085 makes a row at the top level and under any existing row', () => {
    // FR-085 (MUST): 作った行は既存のどの TaskGroup の子にもでき、どこにも属さ
    // ない最上位にもできること。
    const document = documentOf({ schedule: { taskGroups: [groupOf({ id: 'g1' })] } })

    const top = run(document, { kind: 'createTaskGroup', id: 'n1', ...CREATE, order: 4 })
    expect(top.ok).toBe(true)
    if (top.ok) {
      expect(groupById(top.document.schedule, 'n1')?.parentId).toBeNull()
      // AT-55 is the place among the siblings, and the command carries it.
      expect(groupById(top.document.schedule, 'n1')?.order).toBe(4)
      expect(groupById(top.document.schedule, 'n1')?.label).toBe('new row')
    }

    const child = run(document, { kind: 'createTaskGroup', id: 'n2', ...CREATE, parentId: 'g1' })
    expect(child.ok).toBe(true)
    if (child.ok) expect(groupById(child.document.schedule, 'n2')?.parentId).toBe('g1')
  })

  it('FR-085 refuses a child under a parent already at S-125, and takes one below it', () => {
    // FR-085 (MUST NOT): 上限に達している親の下に作らせてはならない。
    // The limit is maxGroupDepth = 5 (S-125), so d5 has reached it and d4 has
    // one level left.
    const document = documentOf({ schedule: { taskGroups: chainOf(5) } })

    const full = run(document, { kind: 'createTaskGroup', id: 'n1', ...CREATE, parentId: 'd5' })
    expect(full.ok).toBe(false)
    if (!full.ok) expect(full.refusals[0]!.rule).toBe('FR-085')

    const room = run(document, { kind: 'createTaskGroup', id: 'n2', ...CREATE, parentId: 'd4' })
    expect(room.ok).toBe(true)
  })

  it('AT-54 refuses a row with neither a name nor a derivation source', () => {
    // FR-058 (MUST NOT): 指定も導出元も無い行を作ってはならない。The column
    // rule is AT-54 and the invariant is IV-8 of table T-220; the three say the
    // same thing, and the specification does not fix which one a refusal names.
    const document = documentOf()
    const bare = run(document, {
      kind: 'createTaskGroup',
      id: 'n1',
      ...CREATE,
      label: null,
      derivedFromTaskUid: null,
    })
    expect(bare.ok).toBe(false)
    if (!bare.ok) expect(['AT-54', 'IV-8', 'FR-058']).toContain(bare.refusals[0]!.rule)

    // FR-058 (MUST): a row with no name of its own shows the name of the Task
    // it derives from, so the derivation source alone is enough.
    const derived = documentOf({ schedule: { tasks: [taskOf({ uid: 1 })] } })
    const source = run(derived, {
      kind: 'createTaskGroup',
      id: 'n2',
      ...CREATE,
      label: null,
      derivedFromTaskUid: 1,
    })
    expect(source.ok).toBe(true)
  })

  it('refuses an id already in the document (IV-1) and references that lead nowhere (IV-2)', () => {
    const document = documentOf({ schedule: { taskGroups: [groupOf({ id: 'g1' })] } })
    // IV-1: 主キーの値が、それが並ぶ配列の中で重複しないこと。
    expect(run(document, { kind: 'createTaskGroup', id: 'g1', ...CREATE }).ok).toBe(false)
    // IV-2: 外部キーが非 null のとき、それが指す先の行が同じ文書にあること --
    // AT-52 (parentId) and AT-54 (derivedFromTaskUid) are both FK columns.
    expect(
      run(document, { kind: 'createTaskGroup', id: 'n1', ...CREATE, parentId: 'nowhere' }).ok,
    ).toBe(false)
    expect(
      run(document, {
        kind: 'createTaskGroup',
        id: 'n2',
        ...CREATE,
        label: null,
        derivedFromTaskUid: 404,
      }).ok,
    ).toBe(false)
  })
})

describe('EditTaskGroup (UF-12) -- CM-27 deleteTaskGroup', () => {
  // g1 holds task 1 and has the child row g2, which holds task 2. g9 survives
  // and holds task 3 and task 4; task 4 is a WBS child of task 1 sitting on
  // another row, which table T-015a's HM-10 allows.
  const cascadeDocument = () =>
    documentOf({
      schedule: {
        taskGroups: [
          groupOf({ id: 'g1' }),
          groupOf({ id: 'g2', parentId: 'g1' }),
          groupOf({ id: 'g9' }),
        ],
        tasks: [
          taskOf({ uid: 1 }),
          taskOf({ uid: 2 }),
          // task 3 depends on task 2, which CD-2 is about to take.
          taskOf({ uid: 3, dependencies: [{ predecessorUid: 2, linkType: 1, lag: null,
            lagFormat: null, carry: {}, carryElements: [] }] }),
          taskOf({ uid: 4, wbsParentUid: 1 }),
          // ... and task 5 is a WBS child of task 4, one level further down.
          taskOf({ uid: 5, wbsParentUid: 4 }),
        ],
        taskGroupMembers: [memberOf(1, 'g1'), memberOf(2, 'g2'), memberOf(3, 'g9'),
          memberOf(4, 'g9'), memberOf(5, 'g9')],
        taskVisuals: [visualOf(1), visualOf(2), visualOf(3), visualOf(4), visualOf(5)],
        taskOrigins: [originOf(1), originOf(3)],
        resources: [resourceOf(7)],
        assignments: [assignmentOf(50, 1, 7), assignmentOf(51, 3, 7)],
      },
    })

  it('CD-2 takes the rows beneath and every Task on them, each with its CD-1 cascade', () => {
    const document = cascadeDocument()
    const result = run(document, { kind: 'deleteTaskGroup', groupId: 'g1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.document.schedule

    // CD-2: the row, 配下の行, and その行に載っているすべての Task.
    expect(idsOf(after.taskGroups)).toEqual(['g9'])
    // Tasks 4 and 5 go with them: CD-1 takes その Task の WBS の子孫 all the
    // way down, and the row they sit on makes no difference -- "CD-2 が消す範囲
    // は、その行に載る各 Task に CD-1 を適用した和と一致すること（MUST）".
    expect(after.tasks.map((one) => one.uid)).toEqual([3])
    expect(after.taskGroupMembers.map((one) => one.taskUid)).toEqual([3])
    expect(after.taskVisuals.map((one) => one.taskUid)).toEqual([3])
    expect(after.taskOrigins.map((one) => one.taskUid)).toEqual([3])
    // CD-1: その Task を端点とする依存 -- the surviving task 3 pointed at 2.
    expect(after.tasks[0]!.dependencies).toEqual([])
    // CD-1: その Task を指す割当. CD-5 is the other direction, so the Resource
    // itself stays ("タスクは消えない" reads the same way round here).
    expect(after.assignments.map((one) => one.uid)).toEqual([51])
    expect(after.resources.map((one) => one.uid)).toEqual([7])

    // @purity pure: the document handed in is not the one that changed.
    expect(document.schedule.taskGroups).toHaveLength(3)
    expect(document.schedule.tasks).toHaveLength(5)
  })

  it('CD-2 takes the annotations pointing at the row and the pin S-126', () => {
    const document = documentOf({
      schedule: {
        taskGroups: [groupOf({ id: 'g1' }), groupOf({ id: 'g2', parentId: 'g1' }),
          groupOf({ id: 'g9' })],
        commentBoxes: [commentOf('c1', 'g1'), commentOf('c2', 'g9'), commentOf('c3', 'g2')],
        highlightBoxes: [highlightOf('h1', 'g1', 'g9'), highlightOf('h2', 'g9', 'g9')],
      },
      documentSettings: { pinnedGroupIds: ['g1', 'g2', 'g9'] },
    })
    const result = run(document, { kind: 'deleteTaskGroup', groupId: 'g1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // CD-2: その行を指す注記（CommentBox / HighlightBox）。c3 points at the
    // child row, which goes with the parent.
    expect(result.document.schedule.commentBoxes.map((one) => one.id)).toEqual(['c2'])
    expect(result.document.schedule.highlightBoxes.map((one) => one.id)).toEqual(['h2'])
    // CD-2: その行を指すピン止め（S-126）-- 残すと、指す先の無い参照が文書に
    // 残る。The pin at the child row goes for the same reason: IV-3 requires
    // ピン止めした行が、実在する TaskGroup を指すこと, and g2 is gone too. The
    // pin at the surviving row is not touched.
    expect(result.document.documentSettings.pinnedGroupIds).toEqual(['g9'])
  })

  it('CD-2 turns the scroll position S-78 to null rather than deleting it', () => {
    const document = documentOf({
      schedule: { taskGroups: [groupOf({ id: 'g1' })] },
      documentSettings: { scrollGroupId: 'g1', scrollDate: '2026-01-01' },
    })
    const result = run(document, { kind: 'deleteTaskGroup', groupId: 'g1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // CD-2: その行を指す表示位置（S-78）は消さず null へ戻す -- null means
    // "人がまだ場所を決めていない", so the key stays and holds that value.
    expect('scrollGroupId' in result.document.documentSettings).toBe(true)
    expect(result.document.documentSettings.scrollGroupId).toBeNull()
    expect(result.document.documentSettings.scrollDate).toBe('2026-01-01')
  })

  it('FR-032 settles the name of a surviving row before its derivation source goes', () => {
    // g9 has no name of its own and derives it from task 4, a WBS child of
    // task 1; deleting g1 takes task 1 and, by CD-1, task 4 with it.
    // FR-032 (MUST): Task を消す前に、その Task を名前の導出元にしている行の
    // 名前を確定させ、derivedFromTaskUid を空にすること。
    // FR-032: 行そのものは消さない。
    const document = documentOf({
      schedule: {
        taskGroups: [
          groupOf({ id: 'g1' }),
          groupOf({ id: 'g9', label: null, derivedFromTaskUid: 4 }),
        ],
        tasks: [taskOf({ uid: 1 }), taskOf({ uid: 4, wbsParentUid: 1, name: 'Detail A' })],
        taskGroupMembers: [memberOf(1, 'g1'), memberOf(4, 'g9')],
      },
    })
    const result = run(document, { kind: 'deleteTaskGroup', groupId: 'g1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const kept = groupById(result.document.schedule, 'g9')
    expect(kept).toBeDefined()
    // FR-058: 器の名前を指定しなかった行は、その行の導出元となったタスクの名前
    // を表示する -- so the settled name is that Task's name.
    expect(kept?.label).toBe('Detail A')
    expect(kept?.derivedFromTaskUid).toBeNull()
  })

  it('FR-032 can leave the document with no rows at all', () => {
    // FR-001 states it plainly: 「FR-032 は行を 1 つも無い状態にできる」。
    const document = documentOf({
      schedule: {
        taskGroups: [groupOf({ id: 'g1' })],
        tasks: [taskOf({ uid: 1 })],
        taskGroupMembers: [memberOf(1, 'g1')],
      },
    })
    const result = run(document, { kind: 'deleteTaskGroup', groupId: 'g1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.schedule.taskGroups).toEqual([])
    // IV-6: どの Task も、ちょうど 1 つの TaskGroupMember から指されること --
    // so no Task may outlive the last row it sat on.
    expect(result.document.schedule.tasks).toEqual([])
  })

  it('refuses a row id the document does not hold', () => {
    expect(run(documentOf(), { kind: 'deleteTaskGroup', groupId: 'nowhere' }).ok).toBe(false)
  })
})

describe('EditTaskGroup (UF-12) -- CM-28 pasteTaskGroupSubtree', () => {
  // The row `src` holds task 1 and has the child row `kid`, which holds task 2.
  const pasteDocument = (part: DocumentParts = {}) =>
    documentOf({
      ...part,
      schedule: {
        taskGroups: [
          groupOf({ id: 'src', label: 'source' }),
          groupOf({ id: 'kid', parentId: 'src', label: 'source child' }),
          groupOf({ id: 'target', label: 'target' }),
        ],
        tasks: [taskOf({ uid: 1, name: 'one' }), taskOf({ uid: 2, name: 'two' })],
        taskGroupMembers: [memberOf(1, 'src'), memberOf(2, 'kid')],
        ...(part.schedule ?? {}),
      },
    })

  const PASTE = {
    kind: 'pasteTaskGroupSubtree',
    sourceGroupId: 'src',
    targetGroupId: 'target',
    newGroupIds: { src: 'c1', kid: 'c2' },
  } as const satisfies TaskGroupCommand

  it('DU-2 copies the subtree of rows and lands under the selected row', () => {
    const result = run(pasteDocument(), PASTE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.document.schedule

    // FR-033 (MUST): 貼り付け先は、選んでいる行の子とすること。
    expect(groupById(after, 'c1')?.parentId).toBe('target')
    // DU-2: 配下の行 -- the shape of the subtree is kept, and so is what makes
    // each row itself (AT-53's name here).
    expect(groupById(after, 'c2')?.parentId).toBe('c1')
    expect(groupById(after, 'c1')?.label).toBe('source')
    expect(groupById(after, 'c2')?.label).toBe('source child')
    // The source is untouched.
    expect(groupById(after, 'src')?.parentId).toBeNull()
    expect(groupById(after, 'kid')?.parentId).toBe('src')
  })

  it('DU-2 puts the copied Tasks on the COPIED rows, not on the source rows', () => {
    const result = run(pasteDocument(), PASTE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.document.schedule

    // DU-2: その行に載っているすべての Task ... 複製した Task は複製した行に
    // 載せる。FR-033 says why: applying "複製元と同じ行" here would leave the
    // new row empty.
    const copiedUids = after.tasks.filter((one) => one.uid > 100).map((one) => one.uid)
    expect(copiedUids).toHaveLength(2)
    const rowOf = (uid: number) =>
      after.taskGroupMembers.find((one) => one.taskUid === uid)?.groupId
    const copyOfOne = after.tasks.find((one) => one.uid > 100 && one.name === 'one')!.uid
    const copyOfTwo = after.tasks.find((one) => one.uid > 100 && one.name === 'two')!.uid
    expect(rowOf(copyOfOne)).toBe('c1')
    expect(rowOf(copyOfTwo)).toBe('c2')
    // The originals stay where they were.
    expect(rowOf(1)).toBe('src')
    expect(rowOf(2)).toBe('kid')
  })

  it('FR-033 numbers the copies from AT-20 and gives them no TaskOrigin', () => {
    const document = pasteDocument({ schedule: { taskOrigins: [originOf(1), originOf(2)] } })
    const result = run(document, PASTE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.document.schedule

    // FR-033 (MUST NOT): 複製した Task に、複製元と同じ UID を使ってはならない。
    // AT-20 is the highest uid already issued (100 in the fixture) and FR-001
    // forbids numbering from the highest uid that exists (2), so the two copies
    // are 101 and 102 and the mark moves with them.
    const copies = after.tasks.map((one) => one.uid).filter((uid) => uid > 2).sort()
    expect(copies).toEqual([101, 102])
    expect(after.project.uidHighWaterMark).toBe(102)
    // DU-1 (MUST NOT): TaskOrigin は複製してはならない。
    expect(after.taskOrigins.map((one) => one.taskUid).sort()).toEqual([1, 2])
  })

  it('DU-1 copies the TaskVisual and the Assignment', () => {
    const document = pasteDocument({
      schedule: {
        taskVisuals: [visualOf(1), visualOf(2)],
        resources: [resourceOf(7)],
        assignments: [assignmentOf(50, 1, 7)],
      },
    })
    const result = run(document, PASTE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.document.schedule

    // DU-1: TaskVisual ... その Task を指す割当（Assignment）。
    expect(after.taskVisuals).toHaveLength(4)
    expect(after.assignments).toHaveLength(2)
    const copyOfOne = after.tasks.find((one) => one.uid > 100 && one.name === 'one')!.uid
    expect(after.taskVisuals.some((one) => one.taskUid === copyOfOne)).toBe(true)
    const copied = after.assignments.find((one) => one.uid !== 50)
    expect(copied?.taskUid).toBe(copyOfOne)
    expect(copied?.resourceUid).toBe(7)
    // FR-008 (MUST): 新しい Resource と Assignment の uid も
    // Project.uidHighWaterMark に従って採ること -- so the copy is not 50 again.
    expect(copied?.uid).not.toBe(50)
  })

  it('DU-2 copies neither the annotations pointing at the row nor the pin', () => {
    const document = pasteDocument({
      schedule: {
        commentBoxes: [commentOf('c', 'src')],
        highlightBoxes: [highlightOf('h', 'src', 'kid')],
      },
      documentSettings: { pinnedGroupIds: ['src'] },
    })
    const result = run(document, PASTE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // DU-2 (MUST NOT): その行を指す注記とピン止めは複製してはならない。
    expect(result.document.schedule.commentBoxes).toHaveLength(1)
    expect(result.document.schedule.highlightBoxes).toHaveLength(1)
    expect(result.document.documentSettings.pinnedGroupIds).toEqual(['src'])
  })

  it('FR-033 copies a dependency closed inside the subtree and drops one leaving it', () => {
    const outside = taskOf({ uid: 9, name: 'outside' })
    const document = pasteDocument({
      schedule: {
        taskGroups: [
          groupOf({ id: 'src', label: 'source' }),
          groupOf({ id: 'kid', parentId: 'src', label: 'source child' }),
          groupOf({ id: 'target', label: 'target' }),
        ],
        tasks: [
          // task 1 follows task 9, which is not in the subtree.
          taskOf({ uid: 1, name: 'one', dependencies: [{ predecessorUid: 9, linkType: 1,
            lag: null, lagFormat: null, carry: {}, carryElements: [] }] }),
          // task 2 follows task 1, and both are inside the subtree.
          taskOf({ uid: 2, name: 'two', dependencies: [{ predecessorUid: 1, linkType: 1,
            lag: null, lagFormat: null, carry: {}, carryElements: [] }] }),
          outside,
        ],
        taskGroupMembers: [memberOf(1, 'src'), memberOf(2, 'kid'), memberOf(9, 'target')],
      },
    })
    const result = run(document, PASTE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.document.schedule
    const copyOfOne = after.tasks.find((one) => one.uid > 100 && one.name === 'one')!
    const copyOfTwo = after.tasks.find((one) => one.uid > 100 && one.name === 'two')!

    // FR-033 (MUST NOT): 部分木の外へ出る依存を複製してはならない -- 貼り付ける
    // たびに同じ先行へ依存線が増える。
    expect(copyOfOne.dependencies).toEqual([])
    // FR-033 (MUST): 複製した部分木の内側で閉じている依存だけを複製すること --
    // and it points at the COPY, not at the original predecessor.
    expect(copyOfTwo.dependencies.map((one) => one.predecessorUid)).toEqual([copyOfOne.uid])
  })

  it('FR-033 refuses a paste whose deepest copied row would pass S-125', () => {
    // The subtree is two rows deep. Under d4 the copies land at depth 5 and 6,
    // and FR-033 (MUST NOT) measures 貼り付け後の最深部.
    const document = documentOf({
      schedule: {
        taskGroups: [
          ...chainOf(4),
          groupOf({ id: 'src' }),
          groupOf({ id: 'kid', parentId: 'src' }),
        ],
      },
    })
    const tooDeep = run(document, { ...PASTE, targetGroupId: 'd4' })
    expect(tooDeep.ok).toBe(false)
    if (!tooDeep.ok) expect(tooDeep.refusals[0]!.rule).toBe('FR-033')

    // Under d3 the deepest copy is at 5, which S-125 still admits.
    const fits = run(document, { ...PASTE, targetGroupId: 'd3' })
    expect(fits.ok).toBe(true)
  })

  it('FR-033 puts the copy at the top level when no row is selected', () => {
    // FR-033 (MUST): 何も選んでいないときは最上位に置くこと。
    const result = run(pasteDocument(), { ...PASTE, targetGroupId: null })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(groupById(result.document.schedule, 'c1')?.parentId).toBeNull()
  })

  it('refuses a source row the document does not hold, and an id map missing a row', () => {
    expect(run(pasteDocument(), { ...PASTE, sourceGroupId: 'nowhere' }).ok).toBe(false)
    expect(run(pasteDocument(), { ...PASTE, newGroupIds: { src: 'c1' } }).ok).toBe(false)
  })
})

describe('EditTaskGroup (UF-12) -- CM-29 setTaskGroupLabel', () => {
  it('FR-085 renames a row, and AT-54 refuses clearing the last of the two names', () => {
    const document = documentOf({
      schedule: {
        taskGroups: [
          groupOf({ id: 'g1', label: 'old' }),
          groupOf({ id: 'g2', label: 'derived too', derivedFromTaskUid: 1 }),
        ],
        tasks: [taskOf({ uid: 1 })],
        taskGroupMembers: [memberOf(1, 'g2')],
      },
    })

    // FR-085: 名前を付け、あとから名前を変えられるようにすること。
    const renamed = run(document, { kind: 'setTaskGroupLabel', groupId: 'g1', label: 'new' })
    expect(renamed.ok).toBe(true)
    if (renamed.ok) expect(groupById(renamed.document.schedule, 'g1')?.label).toBe('new')

    // AT-54: label と derivedFromTaskUid を同時に null にできない。
    const emptied = run(document, { kind: 'setTaskGroupLabel', groupId: 'g1', label: null })
    expect(emptied.ok).toBe(false)
    if (!emptied.ok) expect(['AT-54', 'IV-8', 'FR-058']).toContain(emptied.refusals[0]!.rule)

    // With a derivation source in place, null is the legitimate "show the
    // Task's name" state of FR-058.
    const derived = run(document, { kind: 'setTaskGroupLabel', groupId: 'g2', label: null })
    expect(derived.ok).toBe(true)
    if (derived.ok) expect(groupById(derived.document.schedule, 'g2')?.label).toBeNull()
  })
})

describe('EditTaskGroup (UF-12) -- CM-30 / CM-31, the row colour', () => {
  it('FR-042 stores the stated colour and CM-31 puts the row back on the theme', () => {
    const document = documentOf({ schedule: { taskGroups: [groupOf({ id: 'g1' })] } })
    // P-19 of table T-104 names `'transparent'` as a value TaskGroup.color may
    // take, and says it is a different thing from null.
    const painted = run(document, { kind: 'setTaskGroupColor', groupId: 'g1',
      color: 'transparent' })
    expect(painted.ok).toBe(true)
    if (!painted.ok) return
    expect(groupById(painted.document.schedule, 'g1')?.color).toBe('transparent')

    // FR-042: 色の指定が無い行は ... テーマ色に基づいて解いた帯色で描く, and
    // FR-007: 色を指定しなければテーマ色に追随する. So the reset is null, not
    // some resolved colour written into the column.
    const reset = run(painted.document, { kind: 'resetTaskGroupColor', groupId: 'g1' })
    expect(reset.ok).toBe(true)
    if (reset.ok) expect(groupById(reset.document.schedule, 'g1')?.color).toBeNull()
  })
})

describe('EditTaskGroup (UF-12) -- CM-32 setTaskGroupHeight', () => {
  it('FR-042 takes a stated height as a floor, neither refusing nor raising it', () => {
    // Three Tasks on the row, so the drawn band will need far more than 1.
    // FR-042 (MUST): 指定した高さは下限として扱うこと ... 段数がそれより高い帯
    // を要するときは、指定を超えて広げること -- the widening is the drawing's
    // business, so the stored value is what was asked for. The reason the row
    // gives is exactly this: 上限や固定値として受け取ると、開いた時点では正し
    // かった高さが、編集しただけで拒まれる値に変わる。
    const document = documentOf({
      schedule: {
        taskGroups: [groupOf({ id: 'g1', height: 40 })],
        tasks: [taskOf({ uid: 1 }), taskOf({ uid: 2 }), taskOf({ uid: 3 })],
        taskGroupMembers: [memberOf(1, 'g1'), memberOf(2, 'g1'), memberOf(3, 'g1')],
      },
    })
    const tight = run(document, { kind: 'setTaskGroupHeight', groupId: 'g1', height: 1 })
    expect(tight.ok).toBe(true)
    if (tight.ok) expect(groupById(tight.document.schedule, 'g1')?.height).toBe(1)

    // FR-042: 高さの指定が無い行は、段数から自動で決めること -- AT-59's null.
    const auto = run(document, { kind: 'setTaskGroupHeight', groupId: 'g1', height: null })
    expect(auto.ok).toBe(true)
    if (auto.ok) expect(groupById(auto.document.schedule, 'g1')?.height).toBeNull()
  })
})

describe('EditTaskGroup (UF-12) -- CM-33 / CM-34, collapse and hidden', () => {
  const nested = () =>
    documentOf({
      schedule: {
        taskGroups: [groupOf({ id: 'g1' }), groupOf({ id: 'g2', parentId: 'g1' })],
        tasks: [taskOf({ uid: 1 }), taskOf({ uid: 2 })],
        taskGroupMembers: [memberOf(1, 'g1'), memberOf(2, 'g2')],
      },
    })

  it('HR-1a collapses a row without moving the Tasks beneath it onto it', () => {
    const closed = run(nested(), { kind: 'setTaskGroupCollapsed', groupId: 'g1', collapsed: true })
    expect(closed.ok).toBe(true)
    if (!closed.ok) return
    expect(groupById(closed.document.schedule, 'g1')?.isCollapsed).toBe(true)
    // HR-1a (MUST NOT): 配下の Task を親の行に載せ替えて描いてはならない -- the
    // row beneath and its member are untouched, since collapsing is a drawing
    // state and not a move.
    expect(idsOf(closed.document.schedule.taskGroups).sort()).toEqual(['g1', 'g2'])
    expect(closed.document.schedule.taskGroupMembers.find((one) => one.taskUid === 2)?.groupId)
      .toBe('g2')

    const opened = run(closed.document, { kind: 'setTaskGroupCollapsed', groupId: 'g1',
      collapsed: false })
    expect(opened.ok).toBe(true)
    if (opened.ok) expect(groupById(opened.document.schedule, 'g1')?.isCollapsed).toBe(false)
  })

  it('HR-6 saves the hidden state in the document and re-homes nothing', () => {
    // HR-6 (MUST): 隠した状態を文書に保存すること -- 保存しないと、書き出して
    // 読み直したときに隠した行が戻り、WY-1 が成立しない。
    const hidden = run(nested(), { kind: 'setTaskGroupHidden', groupId: 'g1', hidden: true })
    expect(hidden.ok).toBe(true)
    if (!hidden.ok) return
    expect(groupById(hidden.document.schedule, 'g1')?.isHidden).toBe(true)
    // HR-6 (MUST NOT): 配下の Task を親の行に載せ替えてはならない。
    expect(idsOf(hidden.document.schedule.taskGroups).sort()).toEqual(['g1', 'g2'])
    expect(hidden.document.schedule.taskGroupMembers.find((one) => one.taskUid === 2)?.groupId)
      .toBe('g2')
    // Hiding is not collapsing: table T-015 keeps HR-1a and HR-6 apart, and
    // the note under HR-6 says the two do not even agree on group LOD.
    expect(groupById(hidden.document.schedule, 'g1')?.isCollapsed).toBeNull()

    const shown = run(hidden.document, { kind: 'setTaskGroupHidden', groupId: 'g1',
      hidden: false })
    expect(shown.ok).toBe(true)
    if (shown.ok) expect(groupById(shown.document.schedule, 'g1')?.isHidden).toBe(false)
  })
})

describe('EditTaskGroup (UF-12) -- CM-35 reorderTaskGroupSiblings', () => {
  const siblings = () =>
    documentOf({
      schedule: {
        taskGroups: [
          groupOf({ id: 'p', order: 0 }),
          groupOf({ id: 'z', order: 1 }),
          groupOf({ id: 'a', parentId: 'p', order: 0, label: 'A', color: 'transparent',
            height: 40, isCollapsed: true }),
          groupOf({ id: 'b', parentId: 'p', order: 1 }),
          groupOf({ id: 'c', parentId: 'p', order: 2 }),
        ],
      },
    })

  it('HM-8 reorders the children of one parent and leaves the other rows alone', () => {
    // HM-8 (MUST): 兄弟どうしの並べ替えができること -- 親子の変更だけでは、同じ
    // 親の下の順番を直せない。
    const result = run(siblings(), {
      kind: 'reorderTaskGroupSiblings',
      parentId: 'p',
      orderedIds: ['c', 'a', 'b'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(childrenOf(result.document.schedule, 'p')).toEqual(['c', 'a', 'b'])
    // The top level is a different set of siblings and did not move.
    expect(childrenOf(result.document.schedule, null)).toEqual(['p', 'z'])
  })

  it('HM-6 keeps the name, colour, height and collapsed state through a reorder', () => {
    // HM-6 (MUST): 行の名前・色・高さ・畳み状態を保つこと。HM-5 adds that the
    // row must not be rebuilt at all.
    const result = run(siblings(), {
      kind: 'reorderTaskGroupSiblings',
      parentId: 'p',
      orderedIds: ['c', 'a', 'b'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const moved = groupById(result.document.schedule, 'a')
    expect(moved?.label).toBe('A')
    expect(moved?.color).toBe('transparent')
    expect(moved?.height).toBe(40)
    expect(moved?.isCollapsed).toBe(true)
    expect(moved?.parentId).toBe('p')
  })

  it('HM-8 reorders the top level, whose parent is null', () => {
    const result = run(siblings(), {
      kind: 'reorderTaskGroupSiblings',
      parentId: null,
      orderedIds: ['z', 'p'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(childrenOf(result.document.schedule, null)).toEqual(['z', 'p'])
    // The children of `p` are a different set and keep their own order.
    expect(childrenOf(result.document.schedule, 'p')).toEqual(['a', 'b', 'c'])
  })

  it('refuses an ordering that is not exactly the children of that parent', () => {
    // HM-8 reorders siblings; it is not an entry for changing a parent, so an
    // ordering that leaves a child out or names a row from elsewhere describes
    // no reordering at all.
    expect(
      run(siblings(), { kind: 'reorderTaskGroupSiblings', parentId: 'p',
        orderedIds: ['c', 'a'] }).ok,
    ).toBe(false)
    expect(
      run(siblings(), { kind: 'reorderTaskGroupSiblings', parentId: 'p',
        orderedIds: ['c', 'a', 'b', 'z'] }).ok,
    ).toBe(false)
  })
})
