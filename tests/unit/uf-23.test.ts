// Unit tests for ChooseStartupDocument (unit UF-23, component CP-14).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.
//
// The unit is step BO-2 of table T-077 -- 「表 T-034 の順で最初に開く文書を決め
// る」-- so every rule below comes from table T-034 and FR-062, with FR-067 for
// the embedded row (BT-1), FR-026 for the autosaved one (BT-3) and FR-027 for
// the template (BT-4). Nothing here was read off the implementation: Chapter
// 1.9 requires a test that verifies a requirement pointing at a table to be
// driven by a fixed copy of that table, which is what `T_034` below is.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentStamp } from '../../src/entity/document-model/document-stamp/document-stamp'
import {
  chooseStartupDocument,
  type StartupCandidates,
  type StartupChoice,
  type StartupNoticeCode,
  type StartupRow,
} from '../../src/use-case/choose-startup-document/choose-startup-document'

// A whole Document is far more than this unit reads -- it compares stamps
// (PI-3's `isNewerStamp`, which table T-034 asks for) and hands the winner on
// -- so the fixture carries the root keys of table T-052 and a name that tells
// the four candidates apart in a failure message.
const documentOf = (name: string, stamp: Partial<DocumentStamp> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: { title: name, statusDate: null, themeHue: 214, startDate: null },
      taskGroups: [],
      tasks: [],
    },
    documentSettings: {},
    revisionStamp: {
      revision: 3,
      lastEditedBy: 'user',
      updatedAt: '2026-08-17T00:00:00',
      ...stamp,
    },
    changeLog: [],
  }) as unknown as Document

/**
 * Table T-034 copied out, one row at a time, in the table's order. The second
 * column is 「順」 (1 to 4) and the third is 「出どころ」.
 */
const T_034 = [
  { row: 'BT-1', order: 1, source: 'the document embedded in the file (FR-067)' },
  { row: 'BT-2', order: 2, source: 'the document handed at startup (R-1 of table T-008)' },
  { row: 'BT-3', order: 3, source: 'the autosaved document (FR-026)' },
  { row: 'BT-4', order: 4, source: 'the template for the first screen (FR-027)' },
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
        embedded:
          rank <= 0
            ? { kind: 'read', document: documents[0]!, documentKey: 'key-embedded' }
            : { kind: 'none' },
        handed:
          rank <= 1
            ? { kind: 'read', document: documents[1]!, documentKey: 'key-handed' }
            : { kind: 'none' },
        autosave:
          rank <= 2
            ? { kind: 'read', document: documents[2]!, documentKey: 'key-autosave' }
            : { kind: 'none' },
        template: documents[3]!,
      }
      const choice = chooseStartupDocument(candidates)
      expect({ order: entry.order, row: choice.row }).toEqual({ order: entry.order, row: entry.row })
      expect(choice.document).toBe(documents[rank])
      // Nothing was turned away, so nothing is told (FR-076, table T-037).
      expect(choice.notices).toEqual([])
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
      autosave: { kind: 'none' },
      template,
    })
    expect(choice.row).toBe('BT-4')
    expect(choice.document).toBe(template)
    expect(choice.autosave).toEqual({ kind: 'none' })
  })
})

describe('ChooseStartupDocument (UF-23) -- BT-1, the embedded document (FR-067)', () => {
  // FR-067: 「埋め込まれた文書が読み取れないとき、または入れ口が 1 つでない
  // ときは、黙って捨てずに知らせること（MUST）。そのうえで表 T-034 の次の順位
  // へ降りる —— 空で起動するのではない。」 Two failures, one rule, one
  // treatment: tell, then descend.
  const belowBt1 = {
    handed: {
      kind: 'read',
      document: documentOf('handed'),
      documentKey: 'key-handed',
    },
    autosave: { kind: 'none' },
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
      autosave: { kind: 'none' },
      template,
    })
    expect(choice.row).toBe('BT-4')
    expect(choice.document).toBe(template)
    expect(codesOf(choice)).toEqual(['embeddedUnreadable'])
  })
})

describe('ChooseStartupDocument (UF-23) -- the losing autosave, table T-034 note', () => {
  // 「負けた自動保存の扱い: 同じ文書で自動保存のほうが新しければ確認を求める。
  // 別の文書なら触らない。壊れていれば知らせたうえで退避する。」
  // FR-062 adds the MUST NOT that guards all three: 「負けた自動保存を黙って
  // 捨ててはならない」.
  const WINNER_STAMP: DocumentStamp = {
    revision: 3,
    lastEditedBy: 'user',
    updatedAt: '2026-08-17T00:00:00',
  }
  const winner = documentOf('embedded', WINNER_STAMP)

  const startedWith = (
    autosaveKey: string,
    autosaveStamp: Partial<DocumentStamp>,
    stored = documentOf('autosave', autosaveStamp),
  ): StartupChoice =>
    chooseStartupDocument({
      embedded: { kind: 'read', document: winner, documentKey: 'key-a' },
      handed: { kind: 'none' },
      autosave: { kind: 'read', document: stored, documentKey: autosaveKey },
      template: documentOf('template'),
    })

  it('T-034 asks to recover when it is the same document and the autosave is newer', () => {
    // The comparison is PI-3's `isNewerStamp` (table T-064: 「起動時の比較。表
    // T-034」): a higher revision is newer.
    const stored = documentOf('autosave', { ...WINNER_STAMP, revision: 4 })
    const choice = startedWith('key-a', {}, stored)
    expect(choice.row).toBe('BT-1')
    expect(choice.autosave).toEqual({ kind: 'askToRecover', document: stored })
  })

  it('T-034 asks to recover at the same revision when the autosave was written later', () => {
    // FR-063 leaves the revision alone for a write to the presentation group,
    // so `isNewerStamp` falls through to `updatedAt`. Without that half, an
    // autosave of exactly the work FR-062 exists to protect would look equal.
    const stored = documentOf('autosave', { ...WINNER_STAMP, updatedAt: '2026-08-17T00:30:00' })
    const choice = startedWith('key-a', {}, stored)
    expect(choice.autosave).toEqual({ kind: 'askToRecover', document: stored })
  })

  it('T-034 leaves a different document alone, however much newer it is', () => {
    // 「別の文書なら触らない」 -- and FR-061 makes never confusing two of them
    // a MUST NOT, so the newness of an unrelated autosave decides nothing.
    const choice = startedWith('key-b', { revision: 99, updatedAt: '2026-12-31T00:00:00' })
    expect(choice.row).toBe('BT-1')
    expect(choice.autosave).toEqual({ kind: 'leaveAlone' })
  })

  it('T-034 does not ask about the same document when the autosave is not newer', () => {
    // The note conditions the confirmation on 「自動保存のほうが新しければ」,
    // which is why PI-3 publishes a comparison at all; and FR-062's MUST NOT
    // keeps the loser from being dropped on the floor. That leaves neither a
    // question nor a discard, and `quarantine` is reserved for the broken one
    // -- so `leaveAlone` is what is left.
    const older = startedWith('key-a', { ...WINNER_STAMP, revision: 2 })
    expect(older.autosave).toEqual({ kind: 'leaveAlone' })
    const equal = startedWith('key-a', WINNER_STAMP)
    expect(equal.autosave).toEqual({ kind: 'leaveAlone' })
  })

  it('T-034 and FR-026 tell about a broken autosave and set it aside', () => {
    // 「壊れていれば知らせたうえで退避する」, and FR-026: 「保存された内容が
    // 壊れているとき、黙って破棄してはならない（MUST NOT）—— 復旧できないこと
    // を人に知らせること」. A broken autosave can never win, so BT-4 opens.
    const template = documentOf('template')
    const choice = chooseStartupDocument({
      embedded: { kind: 'none' },
      handed: { kind: 'none' },
      autosave: { kind: 'broken' },
      template,
    })
    expect(choice.row).toBe('BT-4')
    expect(choice.document).toBe(template)
    expect(choice.autosave).toEqual({ kind: 'quarantine' })
    // ⚠️ The rule is not asserted to a single UID: the specification names two
    // for this telling -- FR-026 (「壊れているとき…知らせること」) and table
    // T-034's own note under FR-062 -- and neither is the lesser one.
    const notice = noticeFor(choice, 'autosaveBroken')
    expect(notice?.row).toBe('BT-3')
    expect(['FR-026', 'FR-062']).toContain(notice?.rule)
  })

  it('T-034 weighs the autosave against whichever row won, not against BT-1 alone', () => {
    // The note says 「同じ文書で」 without naming a row: the winner is the
    // document the autosave is the same as, or a different one from. Here BT-2
    // wins after BT-1 was turned away (FR-067), and the autosave stands under
    // the winner's key.
    const handed = documentOf('handed', WINNER_STAMP)
    const stored = documentOf('autosave', { ...WINNER_STAMP, revision: 5 })
    const choice = chooseStartupDocument({
      embedded: { kind: 'unreadable' },
      handed: { kind: 'read', document: handed, documentKey: 'key-handed' },
      autosave: { kind: 'read', document: stored, documentKey: 'key-handed' },
      template: documentOf('template'),
    })
    expect(choice.row).toBe('BT-2')
    expect(choice.autosave).toEqual({ kind: 'askToRecover', document: stored })
    // A different key at the same rank is the other half of the branch.
    const elsewhere = chooseStartupDocument({
      embedded: { kind: 'unreadable' },
      handed: { kind: 'read', document: handed, documentKey: 'key-handed' },
      autosave: { kind: 'read', document: stored, documentKey: 'key-other' },
      template: documentOf('template'),
    })
    expect(elsewhere.autosave).toEqual({ kind: 'leaveAlone' })
  })

  it('leaves no losing autosave when BT-3 is the row that won', () => {
    // The note is about 「負けた自動保存」. When BT-3 wins there is no loser,
    // and the document opened is the autosave itself.
    const stored = documentOf('autosave')
    const choice = chooseStartupDocument({
      embedded: { kind: 'none' },
      handed: { kind: 'none' },
      autosave: { kind: 'read', document: stored, documentKey: 'key-a' },
      template: documentOf('template'),
    })
    expect(choice.row).toBe('BT-3')
    expect(choice.document).toBe(stored)
    expect(choice.autosave).toEqual({ kind: 'none' })
  })
})

describe('ChooseStartupDocument (UF-23) -- what the startup has to tell', () => {
  it('carries every failure out at once, for the one screen NT-4 asks for', () => {
    // NT-4 of table T-037: 「起動時の保留中の用件は 1 枚に集約して出すこと（全
    // 数）」. Two rows failed in one startup; both leave in the same answer.
    const choice = chooseStartupDocument({
      embedded: { kind: 'entryCountNotOne', entryCount: 2 },
      handed: { kind: 'read', document: documentOf('handed'), documentKey: 'key-handed' },
      autosave: { kind: 'broken' },
      template: documentOf('template'),
    })
    expect(choice.row).toBe('BT-2')
    expect([...codesOf(choice)].sort()).toEqual(['autosaveBroken', 'embeddedEntryCountNotOne'])
    expect(choice.autosave).toEqual({ kind: 'quarantine' })
  })

  it('is pure: the same candidates give the same answer and none of them is touched', () => {
    // Table T-075 marks UF-23 `pure`, and LY-5 leaves every outside value to
    // the Framework, so the call is a function of its argument alone.
    const candidates: StartupCandidates = {
      embedded: { kind: 'unreadable' },
      handed: { kind: 'read', document: documentOf('handed'), documentKey: 'key-handed' },
      autosave: {
        kind: 'read',
        document: documentOf('autosave', { revision: 9 }),
        documentKey: 'key-handed',
      },
      template: documentOf('template'),
    }
    const before = JSON.parse(JSON.stringify(candidates))
    const first = chooseStartupDocument(candidates)
    const second = chooseStartupDocument(candidates)
    expect(second).toEqual(first)
    expect(JSON.parse(JSON.stringify(candidates))).toEqual(before)
  })
})
