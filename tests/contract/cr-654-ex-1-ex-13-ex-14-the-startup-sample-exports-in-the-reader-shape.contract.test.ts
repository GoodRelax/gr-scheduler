// CR-654 (DFC-1963, PND-700): the startup template exported as MSPDI is valid, reader-shaped and round-trips.

import { describe, expect, it } from 'vitest'

import { documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/document-codec'
import { currentDocument } from '../unit/cr-429-mspdi-fixtures'
import { childrenNamed, nodeAt, parseXml, schemaFaults, textAt, type XmlNode } from '../unit/cr-429-mspdi-schema'

const A_MOMENT = '2026-10-04T09:00:00'

/** @purity pure */
function exported(): string {
  return mspdiFromDocument(currentDocument(), A_MOMENT).text
}

/** @purity pure */
function rowsAt(root: XmlNode, collectionPath: string, name: string): readonly XmlNode[] {
  const collection = nodeAt(root, collectionPath)
  return collection === null ? [] : childrenNamed(collection, name)
}

/** @purity pure */
function exceptionsOf(root: XmlNode): readonly XmlNode[] {
  return rowsAt(root, 'Calendars', 'Calendar').flatMap((calendar) => {
    const collection = nodeAt(calendar, 'Exceptions')
    return collection === null ? [] : childrenNamed(collection, 'Exception')
  })
}

describe('CR-654 the startup template exported as MSPDI', () => {
  it('EX-1: valid against pj12 and against pj15', () => {
    const text = exported()
    expect(schemaFaults(text, 'pj12')).toEqual([])
    expect(schemaFaults(text, 'pj15')).toEqual([])
  })

  it('EX-13: every exception goes out as Type 1, Occurrences 1, EnteredByOccurrences 0', () => {
    const exceptions = exceptionsOf(parseXml(exported()))
    expect(exceptions.length).toBeGreaterThan(0)
    const shapes = exceptions.map((one) => [textAt(one, 'Type'), textAt(one, 'Occurrences'), textAt(one, 'EnteredByOccurrences')])
    expect(new Set(shapes.map((shape) => shape.join(',')))).toEqual(new Set(['1,1,0']))
  })

  it('EX-14: every assignment goes out with Units', () => {
    const assignments = rowsAt(parseXml(exported()), 'Assignments', 'Assignment')
    expect(assignments.length).toBeGreaterThan(0)
    expect(assignments.filter((one) => textAt(one, 'Units') === null)).toEqual([])
  })

  it('FR-021: read back and written again, the text is the same, and no exception is told as repeating', () => {
    const first = exported()
    const read = documentFromMspdi(first, currentDocument())
    if (!read.ok) throw new Error(`the export was refused: ${JSON.stringify(read.faults)}`)
    expect(read.notices.filter((one) => one.what.startsWith('repeats'))).toEqual([])
    expect(mspdiFromDocument(read.document, A_MOMENT).text).toBe(first)
  })
})
