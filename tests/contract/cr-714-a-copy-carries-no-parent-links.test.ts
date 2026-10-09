// CR-714 (JDG-1736, DFC-2270): a copy carries no parent task link -- T-223 DU-1 and DU-2, at the use-case seam.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { editTaskGroup, type TaskGroupCommand } from '../../src/use-case/edit-document/edit-document'
import { editTask } from '../../src/use-case/edit-document/edit-task'

const PAIRED =
  'コピー元の親もコピーするときは、コピーの親タスクをその親のコピーとすること（MUST）'
const INFERRED =
  'コピー元の親をコピーしないとき（コピー元が親を持たないときを含む）は、コピーの親タスクを、コピーを載せたタスクグループから推定すること（MUST）'
const OWN_TASK_GROUP =
  '⚠️ コピーを載せたタスクグループの導出元がコピー自身かコピー元であるときは、そのタスクグループの親のタスクグループからたどる'
const DERIVED_TASK_GROUP =
  '導出元を持つタスクグループをコピーしたとき、導出元の `Task` も一緒にコピーするならコピーのタスクグループの導出元をそのコピーとし、コピーしないならコピーのタスクグループ名を確定させて導出元を空にすること（MUST）'

const REQUIREMENTS = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')
const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)
const DEFAULT_TASK_GROUP_NAME = 'Row'

describe('T-223 DU-1 / DU-2 -- the clauses this file is driven by still stand', () => {
  it.each([PAIRED, INFERRED, OWN_TASK_GROUP, DERIVED_TASK_GROUP])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// WHY: Q holds P, P holds C (C is a leaf, so it rides on P's row, FR-058); X holds Y; D derives row G_D but
// rides on X's row; M is a hand-made row. Q, P and X ride on the rows they derive.
const Q = 1
const P = 2
const C = 3
const X = 4
const Y = 5
const D = 6
const G_Q = 'task-group-q'
const G_P = 'task-group-p'
const G_X = 'task-group-x'
const G_D = 'task-group-d'
const G_M = 'task-group-m'

function baseDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error('the bundled template is not a GRS JSON document')
  const sample = read.document.schedule.tasks[0] as Task
  const task = (uid: number, parentTaskUid: number | null, name: string): Task => ({
    ...sample,
    uid,
    parentTaskUid,
    wbsOrder: uid,
    name,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    dependencies: [],
  })
  const sampleTaskGroup = read.document.schedule.taskGroups[0] as TaskGroup
  const row = (id: string, parentId: string | null, derivedFromTaskUid: number | null, order: number): TaskGroup => ({
    ...sampleTaskGroup,
    id,
    parentId,
    label: derivedFromTaskUid === null ? 'Phase 2' : null,
    derivedFromTaskUid,
    order,
  })
  const ridesOn: [number, string][] = [[Q, G_Q], [P, G_P], [C, G_P], [X, G_X], [Y, G_X], [D, G_X]]
  return {
    ...read.document,
    schedule: {
      ...read.document.schedule,
      project: { ...read.document.schedule.project, uidHighWaterMark: 100 },
      tasks: [task(Q, null, 'Design'), task(P, Q, 'Screens'), task(C, P, 'Login screen'), task(X, null, 'Build'),
        task(Y, X, 'Backend'), task(D, X, 'Database')],
      assignments: [],
      taskGroups: [row(G_Q, null, Q, 0), row(G_P, G_Q, P, 0), row(G_X, null, X, 1), row(G_D, null, D, 2),
        row(G_M, null, null, 3)],
      taskGroupMembers: ridesOn.map(([taskUid, groupId]) => ({ taskUid, groupId })),
      taskVisuals: [],
      taskOrigins: [],
      commentBoxes: [],
      highlightBoxes: [],
      baselineTasks: [],
    },
  }
}

function pasted(document: Document, sourceUids: number[], groupIdOf: Record<number, string> = {}): Document {
  const landing = { dayShift: 0, groupIdOf }
  const result = editTask(document, { kind: 'pasteTasks', sourceUids, landing }, DEFAULT_TASK_GROUP_NAME)
  if (!result.ok) throw new Error(`the paste was refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

function grouped(document: Document, command: TaskGroupCommand): Document {
  const result = editTaskGroup(document, command, DEFAULT_TASK_GROUP_NAME)
  if (!result.ok) throw new Error(`the row edit was refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

const parentOf = (document: Document, uid: number): number | null | undefined =>
  document.schedule.tasks.find((one) => one.uid === uid)?.parentTaskUid
const madeIn = (before: Document, after: Document): Task[] =>
  after.schedule.tasks.filter((one) => !before.schedule.tasks.some((old) => old.uid === one.uid))
const copyNamed = (before: Document, after: Document, name: string): Task => {
  const found = madeIn(before, after).find((one) => one.name === name)
  if (found === undefined) throw new Error(`no copy of ${name}`)
  return found
}
const taskGroupNamed = (document: Document, id: string): TaskGroup => {
  const found = document.schedule.taskGroups.find((one) => one.id === id)
  if (found === undefined) throw new Error(`no row ${id}`)
  return found
}

describe('DU-1 PAIRED: a parent copied with its child pairs up with the child copy', () => {
  it('Ctrl+C on P and C, Ctrl+V -> the copy of C sits under the copy of P', () => {
    const before = baseDocument()
    const after = pasted(before, [P, C])
    expect(copyNamed(before, after, 'Login screen').parentTaskUid).toBe(copyNamed(before, after, 'Screens').uid)
  })
})

describe('DU-1 INFERRED: a copy whose parent is not copied takes its parent from where it lands', () => {
  it('a leaf pasted in place rides on P\'s row -> P, the same parent as before', () => {
    const before = baseDocument()
    expect(copyNamed(before, pasted(before, [C]), 'Login screen').parentTaskUid).toBe(P)
  })

  it('OWN_TASK_GROUP: P pasted in place rides on the row P derives -> the walk starts above it, so Q', () => {
    const before = baseDocument()
    expect(copyNamed(before, pasted(before, [P]), 'Screens').parentTaskUid).toBe(Q)
  })

  it('a Ctrl+drag that drops C on X\'s row -> X', () => {
    const before = baseDocument()
    expect(copyNamed(before, pasted(before, [C], { [C]: G_X }), 'Login screen').parentTaskUid).toBe(X)
  })

  it('dropped on a hand-made row at the top -> no derived row on the way up, so the root', () => {
    const before = baseDocument()
    expect(copyNamed(before, pasted(before, [C], { [C]: G_M }), 'Login screen').parentTaskUid).toBeNull()
  })

  it('a root Task (no parent at all) dropped on P\'s row -> P', () => {
    const before = baseDocument()
    expect(copyNamed(before, pasted(before, [X], { [X]: G_P }), 'Build').parentTaskUid).toBe(P)
  })

  it('no original Task changes its parent', () => {
    const before = baseDocument()
    const after = pasted(before, [C, X], { [C]: G_X, [X]: G_P })
    for (const one of before.schedule.tasks) expect(parentOf(after, one.uid), `Task ${one.uid}`).toBe(one.parentTaskUid)
  })
})

describe('DU-2 DERIVED_TASK_GROUP: a copied derived row follows its Task\'s copy, or settles its name', () => {
  const NEW_P = 'task-group-p-copy'
  const NEW_D = 'task-group-d-copy'

  it('row P copied under X: the copy row derives from the copy of P, whose parent is inferred as X', () => {
    const before = baseDocument()
    const after = grouped(before, { kind: 'pasteTaskGroupSubtree', sourceGroupId: G_P, targetGroupId: G_X, newGroupIds: { [G_P]: NEW_P } })
    const copyOfP = copyNamed(before, after, 'Screens')
    expect(taskGroupNamed(after, NEW_P).derivedFromTaskUid).toBe(copyOfP.uid)
    expect(copyOfP.parentTaskUid, 'inferred from X\'s row, above the copy\'s own row').toBe(X)
    expect(copyNamed(before, after, 'Login screen').parentTaskUid, 'PAIRED inside the copied row').toBe(copyOfP.uid)
  })

  it('row D copied without D (D rides on X\'s row) -> the copy keeps the name and derives from nothing', () => {
    const before = baseDocument()
    const after = grouped(before, { kind: 'pasteTaskGroupSubtree', sourceGroupId: G_D, targetGroupId: null, newGroupIds: { [G_D]: NEW_D } })
    expect(taskGroupNamed(after, NEW_D).derivedFromTaskUid).toBeNull()
    expect(taskGroupNamed(after, NEW_D).label).toBe('Database')
  })

  it('DFC-2270: moving either copy row never changes an original Task\'s parent', () => {
    const before = baseDocument()
    let after = grouped(before, { kind: 'pasteTaskGroupSubtree', sourceGroupId: G_P, targetGroupId: G_X, newGroupIds: { [G_P]: NEW_P } })
    after = grouped(after, { kind: 'pasteTaskGroupSubtree', sourceGroupId: G_D, targetGroupId: null, newGroupIds: { [G_D]: NEW_D } })
    after = grouped(after, { kind: 'moveTaskGroup', groupId: NEW_P, parentId: G_M, order: 0 })
    after = grouped(after, { kind: 'moveTaskGroup', groupId: NEW_D, parentId: G_P, order: 0 })
    for (const one of before.schedule.tasks) expect(parentOf(after, one.uid), `Task ${one.uid}`).toBe(one.parentTaskUid)
    expect(copyNamed(before, after, 'Screens').parentTaskUid, 'the copy of P followed its row to the top').toBeNull()
  })
})
