// Unit tests for NotifyChangeWatchers -- units UF-24 and UF-25 of table T-075.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.
//
// Everything asserted here comes from table T-035 of `FR-064` -- rows `AG-6`
// (what a watcher is told, and that a writer is not woken by its own write) and
// `AG-11` (the dialogue's own order, separate from the revision) -- together
// with `FR-063` (only a schedule-group write raises the revision) and Chapter
// 5.5 (the notice goes out after the swap, `WS-7`). Chapter 1.9 asks a test of
// a requirement that points at a table to be driven by fixed data copied out of
// that table, which is what `AG_6_CASES` below is.
//
// ⚠️ Neither unit answers with the `{ ok, refusals }` shape the editing units
// use, so the "assert a refusal both ways" idiom has nothing to bite on here:
// `AG-6`'s "not woken" is spelled as the absence of a notice (`null`), and that
// absence is the only value the row gives.
//
// ⛔ NOT ASSERTED, because the specification does not decide it:
//
//   * where a FRESH subscription starts. `AG-6` says only 「自分がまだ受け取っ
//     ていない」; the unit takes `since` from the caller, so every case below
//     spells its own starting mark rather than relying on one.
//   * what a second subscription under one watcher name means.
//   * what a subscriber that THROWS out of `deliver` should cause. Table T-035
//     and Chapter 5.5 are both silent; `FR-028`'s MUST NOT binds the `Agent
//     API`'s own members (table T-107), not this unit's, so pinning a shape
//     here would be pinning a decision the specification has not made.
//   * 「確定していない下書きで起きてはならない」 (`AG-6`, MUST NOT). A draft
//     never becomes a `DialogueMessage` in the first place -- `AG-11` puts that
//     rule on the log (`PI-33`), which admits only settled utterances -- so
//     this unit is handed no draft it could wake for.
//
// ⚠️ `AG-10` (a call outside table T-027 runs but is not recorded) belongs to
// `WS-4`, not here: this unit records nothing in the undo history, and "not
// recorded" is not "not announced".

import { afterEach, describe, expect, it } from 'vitest'

import {
  emptyDialogueLog,
  latestSequence,
  logWithMessage,
  type DialogueLog,
} from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  changeNoticeFor,
  type ConfirmedChange,
  type WatcherMark,
} from '../../src/use-case/notify-change-watchers/change-notice'
import {
  notifyChangeWatchers,
  unwatchChanges,
  watchChanges,
  type ChangeNotice,
} from '../../src/use-case/notify-change-watchers/notify-change-watchers'

// The watcher under test and the other writer. `AG-6` compares a watcher's name
// against `DocumentStamp.lastEditedBy` and `DialogueMessage.author`, so the two
// names have to be the same strings that land in those two fields.
const SELF = 'ai'
const OTHER = 'user'

// A whole Document is far more than these cases read -- `AG-6` selects schedule
// data by the revision alone -- so the fixture carries the stamp and the four
// other root keys of table T-052's `DR-1` / `DR-4`. Same idiom as the other
// unit files.
const documentOf = (
  revision: number,
  lastEditedBy: string,
  updatedAt = '2026-08-17T00:00:00',
): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: { title: 'A', statusDate: null, themeHue: 214, startDate: null },
      taskGroups: [],
      tasks: [],
    },
    documentSettings: {},
    revisionStamp: { revision, lastEditedBy, updatedAt },
    changeLog: [],
  }) as unknown as Document

/** A log of settled utterances, in the order they were settled (`AG-11`). */
const logOf = (...utterances: readonly (readonly [author: string, text: string])[]): DialogueLog =>
  utterances.reduce(
    (log, [author, text]) =>
      logWithMessage(log, { author, text, settledAt: '2026-08-17T00:00:01' }),
    emptyDialogueLog(),
  )

/** `{ document, dialogue }` -- side by side, because `FR-066` keeps the log out of the document. */
const confirmedOf = (
  document: Document,
  dialogue: DialogueLog = emptyDialogueLog(),
): ConfirmedChange => ({ document, dialogue })

/** "Only from now on": the two counters `AG-6` selects on, as they stand. */
const markAt = (confirmed: ConfirmedChange): WatcherMark => ({
  seenRevision: confirmed.document.revisionStamp.revision,
  seenSequence: latestSequence(confirmed.dialogue),
})

/**
 * Table T-035's `AG-6` copied out as the cases it names, one row at a time.
 *
 * 「監視は『自分がまだ受け取っていない、自分以外の書き手が確定した変更と発話
 * だけ』を通知すること。日程データの変更は版数で選び、確定した発話（`AG-11`）
 * は版数に依らず選ぶ（MUST）。自分の書き込みで自分が起きてはならない
 * （MUST NOT）。」
 *
 * The watcher is `SELF` and has already been told everything up to revision 4
 * and dialogue sequence 0. `raisedTo` is the revision the confirmed document
 * carries, `writer` is its `lastEditedBy` (`FR-063`: who wrote last), and
 * `spokenBy` is the author of the one utterance settled since, if any.
 */
const SEEN: WatcherMark = { seenRevision: 4, seenSequence: 0 }

const AG_6_CASES = [
  {
    case: 'someone else raised the revision',
    raisedTo: 5,
    writer: OTHER,
    spokenBy: null,
    woken: true,
    carriesDocument: true,
    messageCount: 0,
  },
  {
    case: 'my own write raised the revision (MUST NOT wake me)',
    raisedTo: 5,
    writer: SELF,
    spokenBy: null,
    woken: false,
    carriesDocument: false,
    messageCount: 0,
  },
  {
    case: 'someone else settled an utterance, which raises no revision (AG-11)',
    raisedTo: 4,
    writer: OTHER,
    spokenBy: OTHER,
    woken: true,
    carriesDocument: false,
    messageCount: 1,
  },
  {
    case: 'my own utterance (MUST NOT wake me)',
    raisedTo: 4,
    writer: OTHER,
    spokenBy: SELF,
    woken: false,
    carriesDocument: false,
    messageCount: 0,
  },
  {
    case: 'both halves at once: a change and an utterance by someone else',
    raisedTo: 5,
    writer: OTHER,
    spokenBy: OTHER,
    woken: true,
    carriesDocument: true,
    messageCount: 1,
  },
  {
    case: 'nothing new to me',
    raisedTo: 4,
    writer: OTHER,
    spokenBy: null,
    woken: false,
    carriesDocument: false,
    messageCount: 0,
  },
] as const satisfies readonly {
  case: string
  raisedTo: number
  writer: string
  spokenBy: string | null
  woken: boolean
  carriesDocument: boolean
  messageCount: number
}[]

describe('ChangeNotice (UF-25) -- what one watcher has not been told', () => {
  it('AG-6 wakes a watcher for the confirmed changes and utterances of OTHER writers only', () => {
    for (const row of AG_6_CASES) {
      const confirmed = confirmedOf(
        documentOf(row.raisedTo, row.writer),
        row.spokenBy === null ? emptyDialogueLog() : logOf([row.spokenBy, 'ま']),
      )
      const notice = changeNoticeFor(SELF, SEEN, confirmed)

      // "Not woken" is the absence of a notice: a notice existing at all is the
      // wake-up, so `AG-6`'s two MUST NOTs are answered with `null`.
      expect({ case: row.case, woken: notice !== null }).toEqual({
        case: row.case,
        woken: row.woken,
      })
      if (notice === null) continue

      expect(notice.watcher).toBe(SELF)
      // ⚠️ `null` here is "nothing about the SCHEDULE is new to you", which is
      // not the same as "no notice" -- the utterance-only row above is woken
      // with `document: null`.
      expect({ case: row.case, carries: notice.document !== null }).toEqual({
        case: row.case,
        carries: row.carriesDocument,
      })
      if (row.carriesDocument) {
        // 「確定した変更」 is the document `WS-6` already swapped in (Chapter
        // 5.5), so the notice hands over that very value, not a rebuild of it.
        expect(notice.document).toBe(confirmed.document)
      }
      expect(notice.messages).toHaveLength(row.messageCount)
      for (const message of notice.messages) expect(message.author).not.toBe(SELF)
    }
  })

  it('AG-6 selects schedule data BY THE REVISION, so FR-063 keeps a presentation write silent', () => {
    // `FR-063` (MUST NOT): 「見せ方の群だけを変える更新で版数を上げてはならない」,
    // while 「最後に書いた者と時刻は、見せ方の群だけを変えたときも更新する
    // こと（MUST）」. So a presentation-only write by someone else shows up as
    // a stamp whose revision stands still and whose other two fields moved --
    // and `AG-6` picks schedule data by the revision, not by the stamp.
    const confirmed = confirmedOf(documentOf(4, OTHER, '2026-08-17T09:00:00'))
    expect(changeNoticeFor(SELF, SEEN, confirmed)).toBeNull()

    // The same write with the revision moved IS a schedule change, which is
    // the distinction the row draws.
    const raised = confirmedOf(documentOf(5, OTHER, '2026-08-17T09:00:00'))
    expect(changeNoticeFor(SELF, SEEN, raised)).not.toBeNull()
  })

  it('AG-11 counts utterances in an order of their own, not by the revision', () => {
    // 「版数で選べないので、監視は発話を版数とは別の順序で数えること（MUST）」.
    // Three utterances settle while the revision never moves; a watcher that
    // has been told up to sequence 1 is owed the two after it, and no more.
    const dialogue = logOf([OTHER, 'a'], [OTHER, 'b'], [OTHER, 'c'])
    const confirmed = confirmedOf(documentOf(4, OTHER), dialogue)

    const notice = changeNoticeFor(SELF, { seenRevision: 4, seenSequence: 1 }, confirmed)
    expect(notice).not.toBeNull()
    if (notice === null) return
    expect(notice.messages.map((message) => message.text)).toEqual(['b', 'c'])
    // The revision did not move, so the schedule half selected nothing.
    expect(notice.document).toBeNull()
  })

  it('AG-6 tells a watcher only what it has NOT received: its mark silences the repeat', () => {
    // 「自分がまだ受け取っていない ... だけ」. Whatever the notice's mark is, it
    // has to be far enough along that the same confirmed change said twice is
    // not delivered twice.
    const confirmed = confirmedOf(documentOf(5, OTHER), logOf([OTHER, 'a'], [OTHER, 'b']))
    const first = changeNoticeFor(SELF, SEEN, confirmed)
    expect(first).not.toBeNull()
    if (first === null) return
    expect(first.document).not.toBeNull()
    expect(first.messages).toHaveLength(2)

    expect(changeNoticeFor(SELF, first.mark, confirmed)).toBeNull()

    // ...and the next change by someone else still gets through, so the mark
    // silences the repeat rather than the watcher.
    const next = confirmedOf(documentOf(6, OTHER), logOf([OTHER, 'a'], [OTHER, 'b'], [OTHER, 'c']))
    const second = changeNoticeFor(SELF, first.mark, next)
    expect(second).not.toBeNull()
    if (second === null) return
    expect(second.document).toBe(next.document)
    expect(second.messages.map((message) => message.text)).toEqual(['c'])
  })

  it('UT-3 is pure: the same two values always answer the same, and neither is touched', () => {
    // Table T-063's `UT-3`: 「値だけで決まる」. The selection is the pure half
    // of the component, so calling it twice cannot differ, and it cannot have
    // moved anything it was handed.
    const dialogue = logOf([OTHER, 'a'])
    const confirmed = confirmedOf(documentOf(5, OTHER), dialogue)
    const once = changeNoticeFor(SELF, SEEN, confirmed)
    const twice = changeNoticeFor(SELF, SEEN, confirmed)
    expect(once).toEqual(twice)
    expect(confirmed.dialogue).toEqual(dialogue)
    expect(confirmed.document.revisionStamp).toEqual({
      revision: 5,
      lastEditedBy: OTHER,
      updatedAt: '2026-08-17T00:00:00',
    })
  })
})

// ---- UF-24: the registry and the delivery (PI-15) ---------------------------

// The registry is module-scoped, so a case that leaves a subscription behind
// would be heard in the next one.
const REGISTERED: string[] = []

const subscribe = (watcher: string, since: WatcherMark, taken: ChangeNotice[]): void => {
  REGISTERED.push(watcher)
  watchChanges({ watcher, since, deliver: (notice) => void taken.push(notice) })
}

afterEach(() => {
  while (REGISTERED.length > 0) unwatchChanges(REGISTERED.pop()!)
})

describe('NotifyChangeWatchers (UF-24 / PI-15) -- registering, dropping, delivering', () => {
  it('AM-17 delivers a confirmed change to other writers, and AG-6 skips the writer', () => {
    // Table T-107's `AM-17`: 「自分以外が確定した変更と発話を待つ」.
    const start = confirmedOf(documentOf(4, OTHER))
    const heardBySelf: ChangeNotice[] = []
    const heardByOther: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heardBySelf)
    subscribe(OTHER, markAt(start), heardByOther)

    const confirmed = confirmedOf(documentOf(5, OTHER))
    const outcome = notifyChangeWatchers(confirmed)

    expect([...outcome.notified].sort()).toEqual([SELF])
    expect(heardBySelf).toHaveLength(1)
    expect(heardBySelf[0]!.document).toBe(confirmed.document)
    // MUST NOT: 「自分の書き込みで自分が起きてはならない」.
    expect(heardByOther).toHaveLength(0)
  })

  it('AG-11 wakes the watchers for an utterance although the revision stood still (FT-5)', () => {
    // Table T-078's `FT-5` 「版数を上げずに届いた発話」 is delivered by
    // `PostDialogueMessage` (`CP-16`) through this same entry, and `AG-11`
    // makes waking for it a MUST.
    const start = confirmedOf(documentOf(4, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    const spoken = confirmedOf(documentOf(4, OTHER), logOf([OTHER, 'なぜそうしたか']))
    expect([...notifyChangeWatchers(spoken).notified]).toEqual([SELF])
    expect(heard).toHaveLength(1)
    expect(heard[0]!.messages.map((message) => message.text)).toEqual(['なぜそうしたか'])
    // `FR-063`: an utterance is not schedule data, so nothing about the
    // schedule is new to this watcher.
    expect(heard[0]!.document).toBeNull()
  })

  it('AG-6 tells each watcher once: the registry holds the mark of the notice taken', () => {
    const start = confirmedOf(documentOf(4, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    const confirmed = confirmedOf(documentOf(5, OTHER), logOf([OTHER, 'a']))
    expect([...notifyChangeWatchers(confirmed).notified]).toEqual([SELF])
    // 「自分がまだ受け取っていない ... だけ」: the second round has nothing left
    // for it, so nobody is woken and nothing is delivered again.
    expect(notifyChangeWatchers(confirmed).notified).toEqual([])
    expect(heard).toHaveLength(1)
  })

  it('AM-17 stops at unwatchChanges: a subscription that was dropped hears nothing', () => {
    const start = confirmedOf(documentOf(4, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    expect([...notifyChangeWatchers(confirmedOf(documentOf(5, OTHER))).notified]).toEqual([SELF])
    unwatchChanges(REGISTERED.pop()!)
    expect(notifyChangeWatchers(confirmedOf(documentOf(6, OTHER))).notified).toEqual([])
    expect(heard).toHaveLength(1)
  })

  it('Chapter 5.5 keeps the delivering-notices window OUT of this unit (MUST)', () => {
    // 「通知を配っているあいだの書き込みは拒否すること（MUST）」 and 「拒否は
    // `WS-2` で行う」 -- the flag belongs to the site running `WS-7`, which is
    // `ApplyDocumentChange`. This unit is the audience inside that window, so
    // its entry takes the confirmed change and nothing else: a boolean handed
    // in by a caller says only what that caller knows, and a subscriber writing
    // back from inside `deliver` builds its own `WriteMoment` answering false
    // in good faith. That is how the MUST stopped holding once before.
    expect(notifyChangeWatchers.length).toBe(1)
  })
})
