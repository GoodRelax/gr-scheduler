// Unit test: NotifyChangeWatchers (UF-24/UF-25) -- who a watcher wakes, table T-035 AG-6/AG-11.

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
  emptyChangeWatchers,
  notifyChangeWatchers,
  unwatchChanges,
  watchChanges,
  type ChangeNotice,
} from '../../src/use-case/notify-change-watchers/notify-change-watchers'

// WHY: AG-6 compares a watcher's name against DocumentStamp.lastEditedBy and
// DialogueMessage.author, so these must be the same strings that land there.
const SELF = 'ai'
const OTHER = 'user'

// WHY: these are only ever compared for equality; T1 < T2 appears exactly
// once below, only to prove the undo case really is the backwards one.
const T0 = '2026-08-17T00:00:00Z'
const T1 = '2026-08-17T00:01:00Z'
const T2 = '2026-08-17T00:02:00Z'

// WHY: AG-6 reads only the schedule-data group's instant, so this fixture
// carries just the stamp and the four other root keys DR-1/DR-4 need.
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

const logOf = (...utterances: readonly (readonly [author: string, text: string])[]): DialogueLog =>
  utterances.reduce(
    (log, [author, text]) =>
      logWithMessage(log, { author, text, settledAt: '2026-08-17T00:00:01' }),
    emptyDialogueLog(),
  )

// WHY: document and dialogue sit side by side because FR-066 keeps the
// conversation out of the document; hasMovedSchedule is WS-5's own judgement.
const confirmedOf = (
  document: Document,
  dialogue: DialogueLog = emptyDialogueLog(),
  hasMovedSchedule = false,
): ConfirmedChange => ({ document, hasMovedSchedule, dialogue })

const markAt = (confirmed: ConfirmedChange): WatcherMark => ({
  seenScheduleUpdatedUtc: confirmed.document.documentStamp.scheduleUpdatedUtc,
  seenSequence: latestSequence(confirmed.dialogue),
})

// WHY: table T-035's AG-6, copied here as fixed cases per Chapter 1.9 --
// the watcher is SELF, already handed the document as it stood at T0.
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

      // WHY: "not woken" is the absence of a notice -- a notice existing at
      // all is the wake-up, so AG-6's MUST NOTs are both answered with null.
      expect({ case: row.case, woken: notice !== null }).toEqual({
        case: row.case,
        woken: row.woken,
      })
      if (notice === null) continue

      expect(notice.watcher).toBe(SELF)
      // WHY: null here means "nothing about the SCHEDULE is new", not "no
      // notice" -- the utterance-only row above is woken with document: null.
      expect({ case: row.case, carries: notice.document !== null }).toEqual({
        case: row.case,
        carries: row.carriesDocument,
      })
      if (row.carriesDocument) {
        // WHY: the confirmed document is what WS-6 already swapped in, so
        // the notice hands over that same reference rather than rebuilding it.
        expect(notice.document).toBe(confirmed.document)
      }
      expect(notice.messages).toHaveLength(row.messageCount)
      for (const message of notice.messages) expect(message.author).not.toBe(SELF)
    }
  })

  it('AG-6 MUST NOT wake a watcher for a write that moved the presentation group ONLY', () => {
    // WHY: a presentation-only write leaves the SCHEDULE instant standing
    // still while the other two stamp fields move (FR-063 MUST NOT).
    const presentationOnly = confirmedOf(
      documentOf(T0, OTHER, '2026-08-17T09:00:00Z'),
      emptyDialogueLog(),
      false,
    )
    expect(changeNoticeFor(SELF, SEEN, presentationOnly)).toBeNull()

    // WHY: stays silent however many times it happens -- a wheel turn puts
    // dozens of these through WS-1..WS-7, which is why the row says "only".
    for (let n = 1; n <= 30; n += 1) {
      const again = confirmedOf(
        documentOf(T0, OTHER, `2026-08-17T09:00:${String(n).padStart(2, '0')}Z`),
        emptyDialogueLog(),
        false,
      )
      expect(changeNoticeFor(SELF, SEEN, again), `presentation write ${n}`).toBeNull()
    }

    const moved = confirmedOf(documentOf(T1, OTHER, '2026-08-17T09:00:00Z'), emptyDialogueLog(), true)
    expect(changeNoticeFor(SELF, SEEN, moved)).not.toBeNull()
  })

  it('AG-6 MUST NOT wake a writer for its OWN write, whatever moved and however far behind it is', () => {
    // WHY: the veto is on the writer's identity, so neither half of the
    // selection can talk round it -- not WS-5's judgement, not the mark equality.
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
    // WHY: this is the one case that goes red if an ordering read of the
    // stamp ever comes back (FR-063 MUST NOT); CR-205 was raised against it.
    const held: WatcherMark = { seenScheduleUpdatedUtc: T2, seenSequence: 0 }

    expect(T1 < T2).toBe(true)

    // WHY: the restore claims no fresh schedule edit, so only the mark
    // equality against the watcher's held instant can wake it here.
    const restored = confirmedOf(documentOf(T1, OTHER), emptyDialogueLog(), false)
    const notice = changeNoticeFor(SELF, held, restored)

    expect(notice).not.toBeNull()
    if (notice === null) return
    expect(notice.document).toBe(restored.document)
    // WHY: the mark is now t1 -- the watcher holds what it was handed, not
    // the high-water mark of everything it ever saw.
    expect(notice.mark.seenScheduleUpdatedUtc).toBe(T1)

    const asAMove = confirmedOf(documentOf(T1, OTHER), emptyDialogueLog(), true)
    expect(changeNoticeFor(SELF, held, asAMove)).not.toBeNull()

    const alreadyThere: WatcherMark = { seenScheduleUpdatedUtc: T1, seenSequence: 0 }
    expect(changeNoticeFor(SELF, alreadyThere, restored)).toBeNull()
  })

  it('AG-11 counts utterances in an order of their own, separate from the stamp', () => {
    // WHY: AG-11 counts utterances in their own sequence, separate from the
    // stamp; a watcher told up to sequence 1 is owed the two after it.
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
    expect(notice.document).toBeNull()
    expect(notice.mark.seenSequence).toBe(3)
    expect(notice.mark.seenScheduleUpdatedUtc).toBe(T0)
    expect(confirmed.document.documentStamp.scheduleUpdatedUtc).toBe(T0)
  })

  it('AG-6 tells a watcher only what it has NOT received: its mark silences the repeat', () => {
    // WHY: whatever the notice's mark is, it must be far enough along that
    // the same confirmed change said twice is not delivered twice.
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

    // WHY: hasMovedSchedule is false here because a second announcement of
    // the SAME write is not a second write -- only the mark equality is left to select on.
    const saidAgain = confirmedOf(confirmed.document, confirmed.dialogue, false)
    expect(changeNoticeFor(SELF, first.mark, saidAgain)).toBeNull()

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
    // WHY: UT-3 (table T-063) -- the selection is pure, so calling it twice
    // cannot differ and cannot mutate anything it was handed.
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

// WHY: one registry serves the whole file, so a case that leaves a subscription
// behind would be heard by the next one.
const REGISTERED: string[] = []
const WATCHERS = emptyChangeWatchers()

const subscribe = (watcher: string, since: WatcherMark, taken: ChangeNotice[]): void => {
  REGISTERED.push(watcher)
  watchChanges(WATCHERS, { watcher, since, deliver: (notice) => void taken.push(notice) })
}

afterEach(() => {
  while (REGISTERED.length > 0) unwatchChanges(WATCHERS, REGISTERED.pop()!)
})

describe('NotifyChangeWatchers (UF-24 / PI-15) -- registering, dropping, delivering', () => {
  it('AM-17 delivers a confirmed change to other writers, and AG-6 skips the writer', () => {
    const start = confirmedOf(documentOf(T0, OTHER))
    const heardBySelf: ChangeNotice[] = []
    const heardByOther: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heardBySelf)
    subscribe(OTHER, markAt(start), heardByOther)

    const confirmed = confirmedOf(documentOf(T1, OTHER), emptyDialogueLog(), true)
    const outcome = notifyChangeWatchers(WATCHERS, confirmed)

    expect([...outcome.notified].sort()).toEqual([SELF])
    expect(heardBySelf).toHaveLength(1)
    expect(heardBySelf[0]!.document).toBe(confirmed.document)
    expect(heardByOther).toHaveLength(0)
  })

  it('AG-11 wakes the watchers for an utterance although no instant moved (FT-5)', () => {
    const start = confirmedOf(documentOf(T0, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    const spoken = confirmedOf(
      documentOf(T0, OTHER),
      logOf([OTHER, 'なぜそうしたか']),
      false,
    )
    expect([...notifyChangeWatchers(WATCHERS, spoken).notified]).toEqual([SELF])
    expect(heard).toHaveLength(1)
    expect(heard[0]!.messages.map((message) => message.text)).toEqual(['なぜそうしたか'])
    expect(spoken.document.documentStamp.scheduleUpdatedUtc).toBe(
      start.document.documentStamp.scheduleUpdatedUtc,
    )
    expect(spoken.hasMovedSchedule).toBe(false)
    expect(heard[0]!.document).toBeNull()
    expect(heard[0]!.mark.seenScheduleUpdatedUtc).toBe(T0)
  })

  it('AG-6 delivers the UNDO to a watcher that already took t2, all the way through the registry', () => {
    // WHY: the registry holds the mark that was actually TAKEN, so after the
    // t2 notice the watcher stands on t2 before the undo hands it t1.
    const start = confirmedOf(documentOf(T1, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    const moved = confirmedOf(documentOf(T2, OTHER), emptyDialogueLog(), true)
    expect([...notifyChangeWatchers(WATCHERS, moved).notified]).toEqual([SELF])
    expect(heard).toHaveLength(1)
    expect(heard[0]!.mark.seenScheduleUpdatedUtc).toBe(T2)

    const undone = confirmedOf(start.document, emptyDialogueLog(), false)
    expect([...notifyChangeWatchers(WATCHERS, undone).notified]).toEqual([SELF])
    expect(heard).toHaveLength(2)
    expect(heard[1]!.document).toBe(start.document)
    expect(heard[1]!.document?.documentStamp.scheduleUpdatedUtc).toBe(T1)
  })

  it('AG-2 settles a same-instant collision as last-writer-wins: the watcher ends on the SECOND', () => {
    // WHY: both writes carry the SAME scheduleUpdatedUtc, so the stamp alone
    // cannot tell them apart; AG-6 selects on WS-5's judgement instead.
    const SECOND_WRITER = 'user-2'
    const start = confirmedOf(documentOf(T0, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    const first = confirmedOf(documentOf(T1, OTHER), emptyDialogueLog(), true)
    const second = confirmedOf(documentOf(T1, SECOND_WRITER), emptyDialogueLog(), true)
    expect(first.document.documentStamp.scheduleUpdatedUtc).toBe(
      second.document.documentStamp.scheduleUpdatedUtc,
    )

    expect([...notifyChangeWatchers(WATCHERS, first).notified]).toEqual([SELF])
    expect([...notifyChangeWatchers(WATCHERS, second).notified]).toEqual([SELF])

    expect(heard).toHaveLength(2)
    expect(heard.at(-1)!.document).toBe(second.document)
    expect(heard.at(-1)!.document?.documentStamp.lastEditedBy).toBe(SECOND_WRITER)
    expect(heard.at(-1)!.document).not.toBe(first.document)
  })

  it('AG-6 tells each watcher once: the registry holds the mark of the notice taken', () => {
    const start = confirmedOf(documentOf(T0, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    const confirmed = confirmedOf(documentOf(T1, OTHER), logOf([OTHER, 'a']), true)
    expect([...notifyChangeWatchers(WATCHERS, confirmed).notified]).toEqual([SELF])
    // WHY: said again as the same write, not a second one, so the second
    // round has nothing left to select and nobody is woken twice.
    const saidAgain = confirmedOf(confirmed.document, confirmed.dialogue, false)
    expect(notifyChangeWatchers(WATCHERS, saidAgain).notified).toEqual([])
    expect(heard).toHaveLength(1)
  })

  it('AM-17 stops at unwatchChanges: a subscription that was dropped hears nothing', () => {
    const start = confirmedOf(documentOf(T0, OTHER))
    const heard: ChangeNotice[] = []
    subscribe(SELF, markAt(start), heard)

    expect(
      [...notifyChangeWatchers(WATCHERS, confirmedOf(documentOf(T1, OTHER), emptyDialogueLog(), true))
        .notified],
    ).toEqual([SELF])
    unwatchChanges(WATCHERS, REGISTERED.pop()!)
    expect(
      notifyChangeWatchers(WATCHERS, confirmedOf(documentOf(T2, OTHER), emptyDialogueLog(), true)).notified,
    ).toEqual([])
    expect(heard).toHaveLength(1)
  })

  it('Chapter 5.5 keeps the delivering-notices window OUT of this unit (MUST)', () => {
    // WHY: the delivery flag is not a parameter; the unit takes the shell-held
    // registrations (SF-10) and the confirmed change, so a subscriber cannot fake it.
    expect(notifyChangeWatchers.length).toBe(2)
  })
})
