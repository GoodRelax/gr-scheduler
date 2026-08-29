// Unit tests for ChooseStartupDocument (unit UF-23, component CP-14).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.
//
// The unit is step BO-2 of table T-077 -- 「表 T-034 の順で最初に開く文書を決め
// る」-- so every rule below comes from table T-034 and FR-062, with FR-067 for
// the embedded row (BT-1), FR-087 for the handed one (BT-2) and FR-027 for the
// template (BT-4). Nothing here was read off the implementation: Chapter 1.9
// requires a test that verifies a requirement pointing at a table to be driven
// by a fixed copy of that table, which is what `T_034` below is.
//
// ⚠️ Table T-034 lost its BT-3 row in CR-280 (appendix version 1.33):
// 「行 ID は席の番号であり、詰めない —— BT-3 は自動保存された文書の席で、
// CR-280 で退いた」. The seats are not closed up, so BT-4 still holds rank 3.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  chooseStartupDocument,
  type StartupCandidates,
  type StartupChoice,
  type StartupNoticeCode,
  type StartupRow,
} from '../../src/use-case/choose-startup-document/choose-startup-document'

// A whole Document is far more than this unit reads -- it only hands the
// winner on -- so the fixture carries the root keys of table T-052 and a name
// that tells the three candidates apart in a failure message.
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

/**
 * Table T-034 copied out, one row at a time, in the table's order. The second
 * column is 「順」 (1 to 3) and the third is 「出どころ」.
 */
const T_034 = [
  { row: 'BT-1', order: 1, source: 'the document embedded in the file (FR-067)' },
  { row: 'BT-2', order: 2, source: 'the document handed at startup (R-1 of table T-008, FR-087)' },
  { row: 'BT-4', order: 3, source: 'the template for the first screen (FR-027)' },
] as const satisfies readonly { row: StartupRow; order: number; source: string }[]

const noticeFor = (choice: StartupChoice, code: StartupNoticeCode) =>
  choice.notices.find((notice) => notice.code === code)

const codesOf = (choice: StartupChoice): readonly StartupNoticeCode[] =>
  choice.notices.map((notice) => notice.code)

describe('ChooseStartupDocument (UF-23) -- the order of table T-034', () => {
  it('T-034 opens the first row that yields a document, and never a lower one', () => {
    // FR-062: 「起動したとき、GRS は、表 T-034 の順で最初に開く文書を決めるこ
    // と」. One pass per row: every row ABOVE it yields nothing and every row
    // from it down yields a document, so the row under test is the first one
    // that can be opened -- and the rows below it prove the order is an order.
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
      // Nothing was turned away, so nothing is told (FR-076, table T-037).
      expect(choice.notices).toEqual([])
    }
  })

  it('T-034 holds three rows and never answers with the seat CR-280 retired', () => {
    // The table is BT-1, BT-2, BT-4 in ranks 1, 2, 3. BT-3 is not a row of it,
    // so no startup -- clean or failed -- can come back with that row.
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
    // FR-027 keeps exactly one template 「初期表示用のテンプレートを 1 つ出す
    // こと」, and FR-067 says in as many words that a lost candidate descends
    // rather than starting empty -- 「空で起動するのではない」.
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
  // FR-067: 「埋め込まれた文書が読み取れないとき、または入れ口が 1 つでない
  // ときは、黙って捨てずに通知すること（MUST）。そのうえで表 T-034 の次の順位
  // へ降りる —— 空で起動するのではない。」 Two failures, one rule, one
  // treatment: tell, then descend.
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
    // 「空で起動するのではない」 -- the descent reaches BT-4, and the telling
    // is not lost on the way down.
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
  // FR-062's rationale hands each losing row to its own requirement: 「順に負け
  // た出どころをどう扱うかは、その出どころ自身の要求が持つ（BT-1 は FR-067、
  // BT-2 は FR-087）」. FR-087's OP-5 puts every route through the FR-023
  // validation, so a handed file that cannot be read yields no document -- and
  // FR-027 keeps the rank below it from being empty.
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
    // NT-4 of table T-037: 「起動時の保留中の用件は 1 枚に集約して出すこと（全
    // 数）」. Both rows above the template failed in one startup; both leave in
    // the same answer.
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
    // Table T-075 marks UF-23 `pure`, and LY-5 leaves every outside value to
    // the Framework, so the call is a function of its argument alone.
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
