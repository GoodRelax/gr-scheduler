// W3 spec-only tester 2: EX-15, EX-16 and FR-021's Stop rule of 01-04-requirements.md, through the DocumentCodec public entry (PI-20).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { currentDocument, day, hours, pj12Fixture, templateDocument, withTask, withTaskLeaves } from '../unit/cr-429-mspdi-fixtures'
import { childrenNamed, leaf, mspdiText, node, nodeAt, parseXml, textAt, type Spec, type XmlNode } from '../unit/cr-429-mspdi-schema'
import { unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see EX-15, T-033
const EX_15_GRS_MADE =
  'MSPDI を取り込まずに作った文書では、pj12 の `targetNamespace`（`http://schemas.microsoft.com/project/2007`）を書くこと（MUST）'

// see EX-16, T-033
const EX_16_SAME_PLACE =
  '取り込んだフェード日数の値（`Task` の子の `ExtendedAttribute` のうち、`EX-6` の見分け方でフェードの枠と分かったもの）は、取り込んだときの位置へ書き戻すこと（MUST）'
const EX_16_MARKER =
  '⭐ 位置は、値を解釈した要素の代わりに、値（`Value`）を持たない同じ名前の印をその `Task` の `carryElements` に残して持つこと（MUST）'

// see FR-021
const NO_STOP_UNTIL_EDITED =
  '⛔ 取り込み元が `Stop` を持たなかった `Task` では、人がそのタスクの実績を編集していないあいだ、書き出しに `Stop` を書いてはならない（MUST NOT）'

const PJ12_NAMESPACE = 'http://schemas.microsoft.com/project/2007'
const SAVED_AT = '2026-10-07T09:00:00'

// see EX-6
const ROSTER = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'mspdi-custom-fields.json'), 'utf8')) as {
  readonly frames: readonly { readonly name: string; readonly fieldId: number; readonly prefers: string; readonly alias: string }[]
}
const FADE_IN_FRAME = ROSTER.frames.find((one) => one.prefers === 'fadeInDays')
const TEXT1_FIELD = 188743731
const FADE_TASK = 2
const FADE_DAYS = 3

const written = (document: Document): XmlNode => parseXml(mspdiFromDocument(document, SAVED_AT).text)

const taskIn = (root: XmlNode, uid: number): XmlNode => {
  const found = childrenNamed(nodeAt(root, 'Tasks') as XmlNode, 'Task').find((one) => textAt(one, 'UID') === String(uid))
  if (found === undefined) throw new Error(`no Task with UID ${uid} was written`)
  return found
}

const read = (root: Spec): Document => {
  const decoded = documentFromMspdi(mspdiText(root), currentDocument())
  if (!decoded.ok) throw new Error(`the fixture was refused: ${JSON.stringify(decoded.faults)}`)
  return decoded.document
}

const withDefinition = (root: Spec, definition: Spec): Spec => ({
  ...root,
  children: (root.children ?? []).map((child) => (child.name === 'ExtendedAttributes' ? { ...child, children: [definition, ...(child.children ?? [])] } : child)),
})

const attributeOrder = (task: XmlNode): readonly string[] =>
  childrenNamed(task, 'ExtendedAttribute').map((one) => `${textAt(one, 'FieldID') ?? ''}=${textAt(one, 'Value') ?? ''}`)

describe('the clauses are the specification words', () => {
  it.each([EX_15_GRS_MADE, EX_16_SAME_PLACE, EX_16_MARKER, NO_STOP_UNTIL_EDITED])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('EX-15: a document GRS made writes the pj12 namespace', () => {
  it(EX_15_GRS_MADE, () => {
    const document = templateDocument()
    expect(document.schedule.project.sourceFormat, 'precondition: the template is not an MSPDI import').toBe('grs')
    expect(written(document).uri).toBe(PJ12_NAMESPACE)
  })
})

describe('FR-021: a Task imported without Stop is written without Stop while its actual is untouched', () => {
  const actualWithoutStop: readonly Spec[] = [leaf('PercentComplete', 40), leaf('ActualStart', day(6)), leaf('ActualDuration', hours(16))]

  it(NO_STOP_UNTIL_EDITED, () => {
    const document = read(withTaskLeaves(pj12Fixture(), 2, actualWithoutStop))
    const task = document.schedule.tasks.find((one) => one.uid === 2)
    expect(task?.actualStart, 'precondition: the actual start was read').not.toBeNull()
    expect(task?.stop, 'precondition: FR-021 places stop from ActualDuration').not.toBeNull()
    const out = taskIn(written(document), 2)
    expect(childrenNamed(out, 'Stop'), 'a Stop was added to a task whose actual nobody edited').toHaveLength(0)
    expect(textAt(out, 'ActualStart')).toBe(day(6))
  })
})

describe('EX-16: an imported fade value goes back to where it was read', () => {
  // WHY: the fade value is put BEFORE the Text1 value, so moving it behind the carried ExtendedAttribute changes the order.
  const fixture = (): Spec => {
    if (FADE_IN_FRAME === undefined) throw new Error('the roster names no fadeInDays frame')
    const definition = node('ExtendedAttribute', leaf('FieldID', FADE_IN_FRAME.fieldId), leaf('FieldName', 'Number1'), leaf('Alias', FADE_IN_FRAME.alias))
    const fade = node('ExtendedAttribute', leaf('FieldID', FADE_IN_FRAME.fieldId), leaf('Value', FADE_DAYS))
    const withFade = withTask(pj12Fixture(), FADE_TASK, (children) => {
      const first = children.findIndex((one) => one.name === 'ExtendedAttribute')
      return [...children.slice(0, first), fade, ...children.slice(first)]
    })
    return withDefinition(withFade, definition)
  }

  it(EX_16_SAME_PLACE, () => {
    const source = taskIn(parseXml(mspdiText(fixture())), FADE_TASK)
    const before = attributeOrder(source)
    expect(before, 'precondition: the fixture puts the fade value first').toEqual([`${FADE_IN_FRAME?.fieldId}=${FADE_DAYS}`, `${TEXT1_FIELD}=N-1`])
    const after = attributeOrder(taskIn(written(read(fixture())), FADE_TASK))
    expect(after).toEqual(before)
  })

  it(EX_16_MARKER, () => {
    const document = read(fixture())
    const task = document.schedule.tasks.find((one) => one.uid === FADE_TASK)
    // WHY: the clause binds only a value EX-6 recognized; an unrecognized one is carried whole (DF-2), and then no marker is due.
    const recognized = task?.fadeInDays === FADE_DAYS
    const kept = (task?.carryElements ?? []).filter((one) => one.name === 'ExtendedAttribute')
    if (recognized) {
      const markers = kept.filter((one) => !('Value' in one.fields))
      expect(markers, 'the interpreted fade value left no marker without Value').toHaveLength(1)
      expect(markers[0]?.fields['FieldID']).toBe(String(FADE_IN_FRAME?.fieldId))
    } else {
      expect(kept.some((one) => one.fields['FieldID'] === String(FADE_IN_FRAME?.fieldId) && one.fields['Value'] === String(FADE_DAYS))).toBe(true)
    }
  })
})
