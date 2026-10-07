// W3 tester 4: FR-135 with table T-318 IP-4 -- the candidates that get a numbered frame never include the child's own descendants.

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { rowDocument, taskOf } from '../unit/cr-541-stage'
import { REQUIREMENTS } from './cr-610-file-flow-stage'

const FR_135_NO_DESCENDANT =
  'M-18`（`setTaskWbsParent`）で行い、取り消しの 1 段とし、未保存の編集を立てること（MUST）。番号の枠を付ける候補から、その子の子孫を除くこと（MUST）'
const IP_4_NO_DESCENDANT = '⛔ 子の子孫を並べない —— 子孫を親に選ぶと WBS の輪になる'

// WHY: two bars above that both enclose the child leave its parent undecided (IP-3), so the frames are numbered.
const ABOVE_ONE = 1
const CHILD = 2
const ABOVE_TWO = 3
const GRANDCHILD = 4
const GREAT_GRANDCHILD = 5

type Candidates = (document: Document, taskUid: number) => readonly number[]

// see PI-1, IP-4
/** @purity pure */
function candidatesOf(document: Document, taskUid: number): readonly number[] {
  const seam = (scheduleEntry as unknown as { parentCandidatesOf?: Candidates }).parentCandidatesOf
  if (typeof seam !== 'function') throw new Error('the Schedule entry publishes no parentCandidatesOf')
  return seam(document, taskUid)
}

// see IP-1, IP-4
/** @purity pure */
function familyDocument(descendantsAbove: boolean): Document {
  const draft = rowDocument([
    { id: 'top', parentId: null },
    { id: 'below', parentId: 'top' },
  ])
  const schedule = draft['schedule']
  const visual = schedule.taskVisuals[0]
  const wide = { start: '2026-04-01T08:00:00', finish: '2026-04-30T17:00:00' }
  schedule.tasks = [
    taskOf(ABOVE_ONE, wide),
    taskOf(CHILD, { start: '2026-04-06T08:00:00', finish: '2026-04-10T17:00:00' }),
    taskOf(ABOVE_TWO, wide),
    taskOf(GRANDCHILD, { ...wide, wbsParentUid: CHILD }),
    taskOf(GREAT_GRANDCHILD, { start: '2026-04-07T08:00:00', finish: '2026-04-08T17:00:00', wbsParentUid: GRANDCHILD }),
  ]
  const above = new Set(descendantsAbove ? [ABOVE_ONE, ABOVE_TWO, GRANDCHILD, GREAT_GRANDCHILD] : [ABOVE_ONE, ABOVE_TWO])
  const rowOf = (uid: number): string => (above.has(uid) ? 'top' : 'below')
  schedule.taskGroupMembers = schedule.tasks.map((one: { uid: number }) => ({ taskUid: one.uid, groupId: rowOf(one.uid) }))
  schedule.taskVisuals = schedule.tasks.map((one: { uid: number }) => ({ ...visual, taskUid: one.uid }))
  schedule.project.uidHighWaterMark = 100
  const read = documentFromJson(JSON.stringify(draft))
  if (!read.ok) throw new Error(`the bench document is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

describe('FR-135 -- the manuscript these cases are driven by', () => {
  it.each([FR_135_NO_DESCENDANT, IP_4_NO_DESCENDANT])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe(`FR-135 -- ${FR_135_NO_DESCENDANT}`, () => {
  it('the control: with the descendants on the child row, both enclosing bars above are numbered', () => {
    expect([...candidatesOf(familyDocument(false), CHILD)].sort()).toEqual([ABOVE_ONE, ABOVE_TWO])
  })

  it("a grandchild and a great-grandchild drawn on the row above, enclosing the child, are not among its candidates", () => {
    const found = candidatesOf(familyDocument(true), CHILD)
    expect(found, IP_4_NO_DESCENDANT).toContain(ABOVE_ONE)
    expect(found, IP_4_NO_DESCENDANT).toContain(ABOVE_TWO)
    expect(found, FR_135_NO_DESCENDANT).not.toContain(GRANDCHILD)
    expect(found, FR_135_NO_DESCENDANT).not.toContain(GREAT_GRANDCHILD)
  })
})
