// Unit tests for ChooseStartupDocument (unit UF-23, component CP-14).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  chooseStartupDocument,
  type StartupCandidates,
  type StartupChoice,
  type StartupNoticeCode,
  type StartupRow,
} from '../../src/use-case/choose-startup-document/choose-startup-document'

const documentOf = (name: string): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: { title: name, statusDate: null, themeHue: 214, startDate: null },
      taskGroups: [],
      tasks: [],
    },
    documentSettings: {},
    changeLog: [],
  }) as unknown as Document

// see T-034
const T_034 = [
  { row: 'BT-1', order: 1, source: 'the document embedded in the file (FR-067)' },
  { row: 'BT-2', order: 2, source: 'the document handed at startup (CHN-1 of table T-008, FR-087)' },
  { row: 'BT-4', order: 3, source: 'the template for the first screen (FR-027)' },
] as const satisfies readonly { row: StartupRow; order: number; source: string }[]

const noticeFor = (choice: StartupChoice, code: StartupNoticeCode) =>
  choice.notices.find((notice) => notice.code === code)

const codesOf = (choice: StartupChoice): readonly StartupNoticeCode[] =>
  choice.notices.map((notice) => notice.code)

describe('ChooseStartupDocument (UF-23) -- the order of table T-034', () => {
  it('T-034 opens the first row that yields a document, and never a lower one', () => {
    for (const [rank, entry] of T_034.entries()) {
      const documents = T_034.map((row) => documentOf(row.row))
      const candidates: StartupCandidates = {
        embedded: rank <= 0 ? { kind: 'read', document: documents[0]! } : { kind: 'none' },
        handed: rank <= 1 ? { kind: 'read', document: documents[1]! } : { kind: 'none' },
        template: documents[2]!,
      }
      const choice = chooseStartupDocument(candidates)
      expect({ order: entry.order, row: choice.row }).toEqual({ order: entry.order, row: entry.row })
      expect(choice.document).toBe(documents[rank])
      expect(choice.notices).toEqual([])
    }
  })

  it('T-034 holds three rows and never answers with the seat CR-280 retired', () => {
    expect(T_034.map((entry) => entry.row)).toEqual(['BT-1', 'BT-2', 'BT-4'])
    expect(T_034.map((entry) => entry.order)).toEqual([1, 2, 3])
    for (const embedded of [{ kind: 'none' }, { kind: 'unreadable' }] as const) {
      const choice = chooseStartupDocument({
        embedded,
        handed: { kind: 'none' },
        template: documentOf('template'),
      })
      expect(T_034.map((entry) => entry.row)).toContain(choice.row)
    }
  })

  it('BT-4 always yields a document, so the order never ends empty (FR-027)', () => {
    const template = documentOf('template')
    const choice = chooseStartupDocument({
      embedded: { kind: 'none' },
      handed: { kind: 'none' },
      template,
    })
    expect(choice.row).toBe('BT-4')
    expect(choice.document).toBe(template)
  })
})

describe('ChooseStartupDocument (UF-23) -- BT-1, the embedded document (FR-067)', () => {
  const belowBt1 = {
    handed: {
      kind: 'read',
      document: documentOf('handed'),
    },
    template: documentOf('template'),
  } as const satisfies Omit<StartupCandidates, 'embedded'>

  it('FR-067 tells about an embedding it cannot read and descends to the next rank', () => {
    const choice = chooseStartupDocument({ ...belowBt1, embedded: { kind: 'unreadable' } })
    expect(choice.row).toBe('BT-2')
    expect(choice.document).toBe(belowBt1.handed.document)
    expect(noticeFor(choice, 'embeddedUnreadable')).toEqual({
      row: 'BT-1',
      rule: 'FR-067',
      code: 'embeddedUnreadable',
    })
  })

  it('FR-067 treats an entry count other than one the same way, above and below one', () => {
    for (const entryCount of [0, 2, 7]) {
      const choice = chooseStartupDocument({
        ...belowBt1,
        embedded: { kind: 'entryCountNotOne', entryCount },
      })
      expect(choice.row).toBe('BT-2')
      expect(noticeFor(choice, 'embeddedEntryCountNotOne')).toEqual({
        row: 'BT-1',
        rule: 'FR-067',
        code: 'embeddedEntryCountNotOne',
      })
    }
  })

  it('FR-067 still tells when the descent runs all the way to the template', () => {
    const template = documentOf('template')
    const choice = chooseStartupDocument({
      embedded: { kind: 'unreadable' },
      handed: { kind: 'none' },
      template,
    })
    expect(choice.row).toBe('BT-4')
    expect(choice.document).toBe(template)
    expect(codesOf(choice)).toEqual(['embeddedUnreadable'])
  })
})

describe('ChooseStartupDocument (UF-23) -- BT-2, the document handed at startup', () => {
  it('a handed document that cannot be read descends to BT-4 and is not dropped silently', () => {
    const template = documentOf('template')
    const choice = chooseStartupDocument({
      embedded: { kind: 'none' },
      handed: { kind: 'unreadable' },
      template,
    })
    expect(choice.row).toBe('BT-4')
    expect(choice.document).toBe(template)
    expect(codesOf(choice)).toEqual(['handedUnreadable'])
  })
})

describe('ChooseStartupDocument (UF-23) -- what the startup has to tell', () => {
  it('carries every failure out at once, for the one screen NT-4 asks for', () => {
    const template = documentOf('template')
    const choice = chooseStartupDocument({
      embedded: { kind: 'entryCountNotOne', entryCount: 2 },
      handed: { kind: 'unreadable' },
      template,
    })
    expect(choice.row).toBe('BT-4')
    expect(choice.document).toBe(template)
    expect([...codesOf(choice)].sort()).toEqual(['embeddedEntryCountNotOne', 'handedUnreadable'])
  })

  it('is pure: the same candidates give the same answer and none of them is touched', () => {
    const candidates: StartupCandidates = {
      embedded: { kind: 'unreadable' },
      handed: { kind: 'read', document: documentOf('handed') },
      template: documentOf('template'),
    }
    const before = JSON.parse(JSON.stringify(candidates))
    const first = chooseStartupDocument(candidates)
    const second = chooseStartupDocument(candidates)
    expect(second).toEqual(first)
    expect(JSON.parse(JSON.stringify(candidates))).toEqual(before)
  })
})
