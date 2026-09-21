// DFC-685-a: EX-12's slack MUST NOT reaches a dateless pasted copy too, not only a dated one.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  accepted,
  pj12Fixture,
  edited,
  withTask,
  withTaskLeaves,
  writtenTask,
} from './cr-429-mspdi-fixtures'
import { leaf, mspdiText, type Spec, type XmlNode } from './cr-429-mspdi-schema'

// see EX-12
const EX_12_NO_SLACK =
  '余裕日数（`FreeSlack` / `TotalSlack` / `StartSlack` / `FinishSlack`）は書いてはならない（MUST NOT）—— 交換相手が開くときに計算し直す値であり、古い値を返すと日付と食い違う。'

const SLACKS = ['FreeSlack', 'TotalSlack', 'StartSlack', 'FinishSlack'] as const

const SOURCE_UID = 3

function slacksOf(task: XmlNode): readonly string[] {
  return task.children.map((each) => each.name).filter((name) => (SLACKS as readonly string[]).includes(name))
}

// WHY: removed outright, not blanked -- FR-023 reads a missing element as
// the column's null, an unparseable or blank value as a row to drop instead.
function withoutDate(root: Spec, uid: number, name: 'Start' | 'Finish'): Spec {
  return withTask(root, uid, (children) => children.filter((each) => each.name !== name))
}

function withAllFourSlacks(root: Spec, uid: number): Spec {
  return withTaskLeaves(root, uid, [
    leaf('FreeSlack', 0),
    leaf('TotalSlack', 0),
    leaf('StartSlack', 0),
    leaf('FinishSlack', 0),
  ])
}

function copyUidOf(before: Document, after: Document): number {
  const held = new Set(before.schedule.tasks.map((each) => each.uid))
  const found = after.schedule.tasks.find((each) => !held.has(each.uid))
  if (found === undefined) throw new Error('pasteTaskSubtree added no task')
  return found.uid
}

function dateless(missing: 'Start' | 'Finish'): Document {
  const built = withAllFourSlacks(withoutDate(pj12Fixture(), SOURCE_UID, missing), SOURCE_UID)
  return accepted(mspdiText(built)).document
}

describe(`CM-8, EX-12: ${EX_12_NO_SLACK}`, () => {
  it('a copy pasted from a task with no Start drops every carried slack value', () => {
    const document = dateless('Start')
    const source = document.schedule.tasks.find((each) => each.uid === SOURCE_UID)
    expect(source?.start).toBeNull()

    const pasted = edited(document, { kind: 'pasteTaskSubtree', sourceUid: SOURCE_UID })
    const copyUid = copyUidOf(document, pasted)
    const copy = pasted.schedule.tasks.find((each) => each.uid === copyUid)
    expect(copy?.start).toBeNull()

    expect(slacksOf(writtenTask(pasted, copyUid)), EX_12_NO_SLACK).toEqual([])
  })

  it('a copy pasted from a task with no Finish drops every carried slack value', () => {
    const document = dateless('Finish')
    const source = document.schedule.tasks.find((each) => each.uid === SOURCE_UID)
    expect(source?.finish).toBeNull()

    const pasted = edited(document, { kind: 'pasteTaskSubtree', sourceUid: SOURCE_UID })
    const copyUid = copyUidOf(document, pasted)
    const copy = pasted.schedule.tasks.find((each) => each.uid === copyUid)
    expect(copy?.finish).toBeNull()

    expect(slacksOf(writtenTask(pasted, copyUid)), EX_12_NO_SLACK).toEqual([])
  })

  it('control: pasting a dateless task does not change the source task`s own carried slack', () => {
    const document = dateless('Start')
    const pasted = edited(document, { kind: 'pasteTaskSubtree', sourceUid: SOURCE_UID })
    expect([...slacksOf(writtenTask(pasted, SOURCE_UID))].sort()).toEqual([...SLACKS].sort())
  })
})
