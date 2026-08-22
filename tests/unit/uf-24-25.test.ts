// Unit tests for NotifyChangeWatchers -- units UF-24 and UF-25 of table T-075.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.
//
// Everything asserted here comes from table T-035 of `FR-064` -- rows `AG-6`
// (what a watcher is told, and that a writer is not woken by its own write) and
// `AG-11` (the dialogue's own order, separate from the stamp) -- together with
// `FR-063` (only a schedule-group write moves the schedule-data instant) and
// Chapter 5.5 (the notice goes out after the swap, `WS-7`). Chapter 1.9 asks a
// test of a requirement that points at a table to be driven by fixed data
// copied out of that table, which is what `AG_6_CASES` below is.
//
// ⛔ NO CASE HERE ASKS WHICH OF TWO INSTANTS IS LATER. `FR-063` forbids reading
// the stamp as an order (MUST NOT) and makes every judgement on it an equality
// (MUST). The case named 「an undo returns the document to t1」 below is the one
// that goes red if an ordering comparison ever comes back.
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

// The three instants these cases stand on. ⛔ They are only ever compared for
// equality; `T1 < T2` appears exactly once below, in the undo case, and only to
// show that the case really is the backwards one.
const T0 = '2026-08-17T00:00:00Z'
const T1 = '2026-08-17T00:01:00Z'
const T2 = '2026-08-17T00:02:00Z'

// A whole Document is far more than these cases read -- `AG-6` looks at the
// schedule-data group's instant and at nothing else in the stamp -- so the
// fixture carries the stamp and the four other root keys of table T-052's
// `DR-1` / `DR-4`. Same idiom as the other unit files.
const documentOf = (
  scheduleUpdatedUtc: string,
  lastEditedBy: string,
  settingsUpdatedUtc = T0,
): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: { title: 'A', statusDate: null, themeHue: 214, startDate: null },
      taskGroups: [],
      tasks: [],
    },
    documentSettings: {},
    documentStamp: { scheduleUpdatedUtc, lastEditedBy, settingsUpdatedUtc },
    changeLog: [],
  }) as unknown as Document

/** A log of settled utterances, in the order they were settled (`AG-11`). */
const logOf = (...utterances: readonly (readonly [author: string, text: string])[]): DialogueLog =>
  utterances.reduce(
    (log, [author, text]) =>
      logWithMessage(log, { author, text, settledAt: '2026-08-17T00:00:01' }),
    emptyDialogueLog(),
  )

/**
 * `{ document, hasMovedSchedule, dialogue }` -- the document and the log side by
 * side, because `FR-066` keeps the conversation out of the document, and
 * `WS-5`'s judgement beside them because `AG-6` selects a live watcher by it
 * (「その書き込みが日程データの群を変えたかどうかで選ぶこと（MUST。判定は 表
 * T-067 の `WS-5` が既に下している）」).
 */
const confirmedOf = (
  document: Document,
  dialogue: DialogueLog = emptyDialogueLog(),
  hasMovedSchedule = false,
): ConfirmedChange => ({ document, hasMovedSchedule, dialogue })

/** "Only from now on": the two values `AG-6` selects on, as they stand. */
const markAt = (confirmed: ConfirmedChange): WatcherMark => ({
  seenScheduleUpdatedUtc: confirmed.document.documentStamp.scheduleUpdatedUtc,
  seenSequence: latestSequence(confirmed.dialogue),
})

/**
 * Table T-035's `AG-6` copied out as the cases it names, one row at a time.
 *
 * 「監視は『自分がまだ受け取っていない、自分以外の書き手が確定した変更と発話
 * だけ』を通知すること。日程データの変更は、その書き込みが日程データの群を変えた
 * かどうかで選ぶこと（MUST。判定は 表 T-067 の `WS-5` が既に下している）。購読し
 * 直したときは、最後に手渡した日程データの群の刻との等値で選ぶこと（MUST）。確定
 * した発話（`AG-11`）は刻に依らず選ぶ（MUST）。⛔ 見せ方の群だけが動いた書き込み
 * で起きてはならない（MUST NOT）。自分の書き込みで自分が起きてはならない
 * （MUST NOT）。」
 *
 * The watcher is `SELF` and has already been handed the document as it stood at
 * `T0`, with nothing said yet. `scheduleUtc` is the schedule-data instant the
 * confirmed document carries, `movedSchedule` is `WS-5`'s own judgement about
 * the write being announced, `writer` is the document's `lastEditedBy`
 * (`FR-063`: who wrote last), and `spokenBy` is the author of the one utterance
 * settled since, if any.
 */
const SEEN: WatcherMark = { seenScheduleUpdatedUtc: T0, seenSequence: 0 }

const AG_6_CASES = [
  {
    case: 'someone else moved the schedule-data group',
    scheduleUtc: T1,
    movedSchedule: true,
    writer: OTHER,
    spokenBy: null,
    woken: true,
    carriesDocument: true,
    messageCount: 0,
  },
  {
    case: 'my own write moved the schedule-data group (MUST NOT wake me)',
    scheduleUtc: T1,
    movedSchedule: true,
    writer: SELF,
    spokenBy: null,
    woken: false,
    carriesDocument: false,
    messageCount: 0,
  },
  {
    case: 'someone else settled an utterance, which moves no instant (AG-11)',
    scheduleUtc: T0,
    movedSchedule: false,
    writer: OTHER,
    spokenBy: OTHER,
    woken: true,
    carriesDocument: false,
    messageCount: 1,
  },
  {
    case: 'my own utterance (MUST NOT wake me)',
    scheduleUtc: T0,
    movedSchedule: false,
    writer: OTHER,
    spokenBy: SELF,
    woken: false,
    carriesDocument: false,
    messageCount: 0,
  },
  {
    case: 'both halves at once: a change and an utterance by someone else',
    scheduleUtc: T1,
    movedSchedule: true,
    writer: OTHER,
    spokenBy: OTHER,
    woken: true,
    carriesDocument: true,
    messageCount: 1,
  },
  {
    case: 'nothing new to me',
    scheduleUtc: T0,
    movedSchedule: false,
    writer: OTHER,
    spokenBy: null,
    woken: false,
    carriesDocument: false,
    messageCount: 0,
  },
] as const satisfies readonly {
  case: string
  scheduleUtc: string
  movedSchedule: boolean
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
        documentOf(row.scheduleUtc, row.writer),
        row.spokenBy === null ? emptyDialogueLog() : logOf([row.spokenBy, 'ま']),
        row.movedSchedule,
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

  it('AG-6 MUST NOT wake a watcher for a write that moved the presentation group ONLY', () => {
    // ⛔ 「見せ方の群だけが動いた書き込みで起きてはならない（MUST NOT）—— 見せ方の
    // 群は 1 秒に何十回も動くので、起きると『だけ』が意味を失う。」
    // `FR-063` (MUST NOT): 「見せ方の群だけを変える更新で、日程データの群の刻を
    // 動かしてはならない」, while 「どちらの群であれ動いた刻と、最後に書いた者
    // は、見せ方の群だけを変えたときも更新すること（MUST）」. So a
    // presentation-only write by someone else shows up as a stamp whose SCHEDULE
    // instant stands still and whose other two fields moved.
    const presentationOnly = confirmedOf(
      documentOf(T0, OTHER, '2026-08-17T09:00:00Z'),
      emptyDialogueLog(),
      false,
    )
    expect(changeNoticeFor(SELF, SEEN, presentationOnly)).toBeNull()

    // ⭐ And it stays silent however many times it happens -- a wheel turn puts
    // dozens of these through WS-1 〜 WS-7, which is why the row says 「だけ」.
    for (let n = 1; n <= 30; n += 1) {
      const again = confirmedOf(
        documentOf(T0, OTHER, `2026-08-17T09:00:${String(n).padStart(2, '0')}Z`),
        emptyDialogueLog(),
        false,
      )
      expect(changeNoticeFor(SELF, SEEN, again), `presentation write ${n}`).toBeNull()
    }

    // The same write with the schedule-data group moved IS a schedule change,
    // which is the distinction the row draws.
    const moved = confirmedOf(documentOf(T1, OTHER, '2026-08-17T09:00:00Z'), emptyDialogueLog(), true)
    expect(changeNoticeFor(SELF, SEEN, moved)).not.toBeNull()
  })

  it('AG-6 MUST NOT wake a writer for its OWN write, whatever moved and however far behind it is', () => {
    // ⛔ 「自分の書き込みで自分が起きてはならない（MUST NOT）。」 The veto is on
    // the writer's identity, so neither half of the selection may talk round it:
    // not `WS-5`'s live judgement, and not the re-subscription equality (here
    // the watcher is holding an instant the document does not carry, which is
    // the one case that WOULD have selected).
    for (const movedSchedule of [true, false]) {
      for (const held of [T0, T2]) {
        const confirmed = confirmedOf(documentOf(T1, SELF), emptyDialogueLog(), movedSchedule)
        const notice = changeNoticeFor(
          SELF,
          { seenScheduleUpdatedUtc: held, seenSequence: 0 },
          confirmed,
        )
        expect(notice, `movedSchedule=${movedSchedule} held=${held}`).toBeNull()
      }
    }
  })

  it('AG-6 wakes a watcher holding t2 when an UNDO returns the document to t1', () => {
    // ⛔ THE DEFECT CR-205 EXISTS FOR, and the one case that goes red if the
    // ordering read ever comes back.
    //
    // 取り消しは以前の `Document` を刻印ごと復元する（`FR-031`）, so the document
    // comes back carrying `t1` while this watcher was last handed `t2`.
    // `FR-063`: 「刻印を順序として読んではならない（MUST NOT）。どの判定も等値で
    // 行うこと（MUST）」 —— 「順序で読むと『戻った文書』を『新しくない』と読み、
    // `AG-6` が通知を落とす。」
    const held: WatcherMark = { seenScheduleUpdatedUtc: T2, seenSequence: 0 }

    // ⚠️ The ONE place these instants are compared for order, and only to show
    // that the restored one really does read as the older of the two.
    expect(T1 < T2).toBe(true)

    // The restored document is announced WITHOUT any claim that a fresh
    // schedule edit happened, so the equality against the instant the watcher
    // holds is the only thing that can wake it.
    const restored = confirmedOf(documentOf(T1, OTHER), emptyDialogueLog(), false)
    const notice = changeNoticeFor(SELF, held, restored)

    expect(notice).not.toBeNull()
    if (notice === null) return
    expect(notice.document).toBe(restored.document)
    // 「最後に手渡した日程データの群の刻」 now IS `t1`: the watcher holds what it
    // was handed, not the high-water mark of everything it ever saw.
    expect(notice.mark.seenScheduleUpdatedUtc).toBe(T1)

    // And announcing the same restore as a schedule move wakes it too -- the
    // row admits both routes in, and neither is an order.
    const asAMove = confirmedOf(documentOf(T1, OTHER), emptyDialogueLog(), true)
    expect(changeNoticeFor(SELF, held, asAMove)).not.toBeNull()

    // Case B of the same table: a watcher already holding `t1` is NOT woken by
    // the restore, because there is nothing in it that it has not received.
    const alreadyThere: WatcherMark = { seenScheduleUpdatedUtc: T1, seenSequence: 0 }
    expect(changeNoticeFor(SELF, alreadyThere, restored)).toBeNull()
  })

  it('AG-11 counts utterances in an order of their own, separate from the stamp', () => {
    // 「刻で選べないので、監視は発話を刻印とは別の順序で数えること（MUST）。この
    // 順序は購読ごとの数え上げであり、刻印の一部ではない」. Three utterances
    // settle while no instant moves; a watcher that has been told up to sequence
    // 1 is owed the two after it, and no more.
    const dialogue = logOf([OTHER, 'a'], [OTHER, 'b'], [OTHER, 'c'])
    const confirmed = confirmedOf(documentOf(T0, OTHER), dialogue, false)

    const notice = changeNoticeFor(
      SELF,
      { seenScheduleUpdatedUtc: T0, seenSequence: 1 },
      confirmed,
    )
    expect(notice).not.toBeNull()
    if (notice === null) return
    expect(notice.messages.map((message) => message.text)).toEqual(['b', 'c'])
    // The schedule-data group did not move, so that half selected nothing.
    expect(notice.document).toBeNull()
    // ⭐ AG-11: the utterance moved the dialogue's own counter and left the
    // schedule instant exactly where it was.
    expect(notice.mark.seenSequence).toBe(3)
    expect(notice.mark.seenScheduleUpdatedUtc).toBe(T0)
    expect(confirmed.document.documentStamp.scheduleUpdatedUtc).toBe(T0)
  })

  it('AG-6 tells a watcher only what it has NOT received: its mark silences the repeat', () => {
    // 「自分がまだ受け取っていない ... だけ」. Whatever the notice's mark is, it
    // has to be far enough along that the same confirmed change said twice is
    // not delivered twice.
    const confirmed = confirmedOf(
      documentOf(T1, OTHER),
      logOf([OTHER, 'a'], [OTHER, 'b']),
      true,
    )
    const first = changeNoticeFor(SELF, SEEN, confirmed)
    expect(first).not.toBeNull()
    if (first === null) return
    expect(first.document).not.toBeNull()
    expect(first.messages).toHaveLength(2)

    // ⚠️ Said again with `hasMovedSchedule` false, because a second announcement
    // of the SAME write is not a second write: what is left to select on is the
    // equality, and the watcher now matches it.
    const saidAgain = confirmedOf(confirmed.document, confirmed.dialogue, false)
    expect(changeNoticeFor(SELF, first.mark, saidAgain)).toBeNull()

    // ...and the next change by someone else still gets through, so the mark
    // silences the repeat rather than the watcher.
    const next = confirmedOf(
      documentOf(T2, OTHER),
      logOf([OTHER, 'a'], [OTHER, 'b'], [OTHER, 'c']),
      true,
    )
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
    const confirmed = confirmedOf(documentOf(T1, OTHER), dialogue, true)
    const once = changeNoticeFor(SELF, SEEN, confirmed)
    const twice = changeNoticeFor(SELF, SEEN, confirmed)
    expect(once).toEqual(twice)
    expect(confirmed.dialogue).toEqual(dialogue)
    expect(confirmed.hasMovedSchedule).toBe(true)
    expect(confirmed.document.documentStamp).toEqual({
      scheduleUpdatedUtc: T1,
      lastEditedBy: OTHER,
      settingsUpdatedUtc: T0,
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
    const start = confirmedOf(documentOf(T0, OTHER))
    const heardBySelf: ChangeNotice[] = []
    const heardByOther: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heardBySelf)
    subscribe(OTHER, markAt(start), heardByOther)

    const confirmed = confirmedOf(documentOf(T1, OTHER), emptyDialogueLog(), true)
    const outcome = notifyChangeWatchers(confirmed)

    expect([...outcome.notified].sort()).toEqual([SELF])
    expect(heardBySelf).toHaveLength(1)
    expect(heardBySelf[0]!.document).toBe(confirmed.document)
    // MUST NOT: 「自分の書き込みで自分が起きてはならない」.
    expect(heardByOther).toHaveLength(0)
  })

  it('AG-11 wakes the watchers for an utterance although no instant moved (FT-5)', () => {
    // Table T-078's `FT-5` is delivered by `PostDialogueMessage` (`CP-16`)
    // through this same entry, and `AG-11` makes waking for it a MUST: 「発話は
    // 日程データではないので日程データの群の刻を動かさない（`FR-063`）。それでも
    // 監視は起きること（`AG-6`）。」
    const start = confirmedOf(documentOf(T0, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    const spoken = confirmedOf(
      documentOf(T0, OTHER),
      logOf([OTHER, 'なぜそうしたか']),
      false,
    )
    expect([...notifyChangeWatchers(spoken).notified]).toEqual([SELF])
    expect(heard).toHaveLength(1)
    expect(heard[0]!.messages.map((message) => message.text)).toEqual(['なぜそうしたか'])
    // ⭐ `AG-11` (MUST): the utterance did NOT move the schedule-data instant --
    // the stamp is the same one the watcher started on -- and the watcher woke
    // all the same.
    expect(spoken.document.documentStamp.scheduleUpdatedUtc).toBe(
      start.document.documentStamp.scheduleUpdatedUtc,
    )
    expect(spoken.hasMovedSchedule).toBe(false)
    // `FR-063`: an utterance is not schedule data, so nothing about the
    // schedule is new to this watcher.
    expect(heard[0]!.document).toBeNull()
    expect(heard[0]!.mark.seenScheduleUpdatedUtc).toBe(T0)
  })

  it('AG-6 delivers the UNDO to a watcher that already took t2, all the way through the registry', () => {
    // ⛔ The same defect as the UF-25 case above, told end to end: the mark the
    // registry is holding is the one that was actually TAKEN, so after the t2
    // notice the watcher stands on t2 -- and the undo hands it a document
    // carrying t1. 「自分がまだ受け取っていない ... だけ」 is satisfied by t1
    // BECAUSE the two differ, not because either is later (FR-063, MUST NOT).
    const start = confirmedOf(documentOf(T1, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    const moved = confirmedOf(documentOf(T2, OTHER), emptyDialogueLog(), true)
    expect([...notifyChangeWatchers(moved).notified]).toEqual([SELF])
    expect(heard).toHaveLength(1)
    expect(heard[0]!.mark.seenScheduleUpdatedUtc).toBe(T2)

    // 取り消しは以前の `Document` を刻印ごと復元する（FR-031）: the earlier
    // document comes back, stamp and all, and it is announced as a change like
    // any other.
    const undone = confirmedOf(start.document, emptyDialogueLog(), false)
    expect([...notifyChangeWatchers(undone).notified]).toEqual([SELF])
    expect(heard).toHaveLength(2)
    expect(heard[1]!.document).toBe(start.document)
    expect(heard[1]!.document?.documentStamp.scheduleUpdatedUtc).toBe(T1)
  })

  it('AG-2 settles a same-instant collision as last-writer-wins: the watcher ends on the SECOND', () => {
    // 「同じ刻に 2 度書かれたときは後から来たほうが残る —— `FR-063` が『最後に書い
    // た者』と定め、`WS-6` が差し替えを 1 つの参照の置き換えと定めているためであ
    // る。」 Both writes carry the SAME `scheduleUpdatedUtc`, so nothing in the
    // stamp can tell them apart; `AG-6` selects on `WS-5`'s judgement instead,
    // which is why the second one still gets through.
    const SECOND_WRITER = 'user-2'
    const start = confirmedOf(documentOf(T0, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    const first = confirmedOf(documentOf(T1, OTHER), emptyDialogueLog(), true)
    const second = confirmedOf(documentOf(T1, SECOND_WRITER), emptyDialogueLog(), true)
    expect(first.document.documentStamp.scheduleUpdatedUtc).toBe(
      second.document.documentStamp.scheduleUpdatedUtc,
    )

    expect([...notifyChangeWatchers(first).notified]).toEqual([SELF])
    expect([...notifyChangeWatchers(second).notified]).toEqual([SELF])

    expect(heard).toHaveLength(2)
    // ⭐ What the watcher is left holding is the SECOND document, by reference.
    expect(heard.at(-1)!.document).toBe(second.document)
    expect(heard.at(-1)!.document?.documentStamp.lastEditedBy).toBe(SECOND_WRITER)
    expect(heard.at(-1)!.document).not.toBe(first.document)
  })

  it('AG-6 tells each watcher once: the registry holds the mark of the notice taken', () => {
    const start = confirmedOf(documentOf(T0, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    const confirmed = confirmedOf(documentOf(T1, OTHER), logOf([OTHER, 'a']), true)
    expect([...notifyChangeWatchers(confirmed).notified]).toEqual([SELF])
    // 「自分がまだ受け取っていない ... だけ」: said again as the same write (not
    // as a second one), the second round has nothing left for it, so nobody is
    // woken and nothing is delivered again.
    const saidAgain = confirmedOf(confirmed.document, confirmed.dialogue, false)
    expect(notifyChangeWatchers(saidAgain).notified).toEqual([])
    expect(heard).toHaveLength(1)
  })

  it('AM-17 stops at unwatchChanges: a subscription that was dropped hears nothing', () => {
    const start = confirmedOf(documentOf(T0, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    expect(
      [...notifyChangeWatchers(confirmedOf(documentOf(T1, OTHER), emptyDialogueLog(), true))
        .notified],
    ).toEqual([SELF])
    unwatchChanges(REGISTERED.pop()!)
    expect(
      notifyChangeWatchers(confirmedOf(documentOf(T2, OTHER), emptyDialogueLog(), true)).notified,
    ).toEqual([])
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
