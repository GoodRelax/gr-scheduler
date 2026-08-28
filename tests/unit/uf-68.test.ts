// Unit tests for `dialogueFieldFromLog` (unit UF-68 of table T-075, component
// CP-37 of table T-062, `dialogue-field.ts`).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT TAKING ANYTHING FROM THE UNIT'S BODY
// (docs/development-rules/04-verification.md, §1). What drives every expected
// value below is docs/spec/ and the two declarations a tester may read: the
// "nine unit contracts" section of `screen-renderer.ts`, which fixes this
// signature, and the `DialogueField` / `DialogueLog` types it is written
// against. Nothing here was derived from how the unit computes its answer.
//
// The rules these cases answer to:
//   FR-066    the field is put up while the `Agent API` is enabled, and the
//             conversation is not kept in the document
//   FR-065    the person turns the API on, and S-99b of table T-206 keeps that
//             record in the environment -- so the flag arrives in the session
//   AG-11     (table T-035, under FR-064) MUST: the utterances a person settled
//             in the dialogue field can be read; the count runs in an order of
//             its own, apart from the stamp. MUST NOT: nothing reads what has
//             not been settled
//   AG-6      (table T-035) the watcher's own writes are dropped from a WATCH.
//             ⛔ Deliberately not applied to this field -- see the group below
//   FR-063    an utterance is not schedule data, so it does not move the
//             schedule-data group's instant, which is why AG-11 needs an order
//             of its own
//   AM-6/AM-18 (table T-107) the API reads settled utterances, and the AI posts
//             its own into the same field -- so both sides stand in it
//   U-44      (table T-103) the settled name `Dialogue Field`
//   LY-1      (table T-060) the log is a not-stored runtime value, held
//             immutably and replaced whole
//   R7.1      (docs/development-rules/07-review-standards.md) table T-075 makes
//             this unit `pure`, so it may not write to what it was handed
//
// ⭐ NO CASE ASSERTS A BOUND ON HOW MANY UTTERANCES THE FIELD CARRIES, because
// the specification decides none. Searched: FR-066 (puts the field up, keeps
// the conversation out of the document, and states no count); AG-11 (states the
// order only); AM-6 and AM-18 of table T-107 (read and post settled utterances,
// with no count); table T-220 of Chapter 6.1 (document invariants -- the log is
// not in the document, so it has no row); `_assets/tbl-settings.md` in full,
// including table T-206 (not stored), table T-211 (save and import limits) and
// table T-212 (screen sizes and delays), none of which holds a dialogue row.
// ⚠️ So the counts below are deliberately small: a case that walked hundreds of
// utterances would be asserting the absence of a bound, which is a decision the
// specification has not taken either way.

import { describe, expect, it } from 'vitest'

import {
  emptyDialogueLog,
  logWithMessage,
  type DialogueLog,
  type DialogueMessage,
} from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { DialogueField, ScreenSession } from '../../src/adapter/screen-renderer/screen-renderer'
import { dialogueFieldFromLog } from '../../src/adapter/screen-renderer/dialogue-field'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Inputs.
// ---------------------------------------------------------------------------

/**
 * S-73's default hue, read out of table T-216 rather than written here.
 *
 * DR-5 of table T-052 keeps the hue on `Project` rather than in the settings,
 * so no generated constant carries it and a number typed here would be the
 * only copy in this file.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

/**
 * ⚠️ Every member of `ScreenSession` is spelled out, so that a case which means
 * to vary one of them varies exactly one. `isAgentApiEnabled` is on here
 * because FR-066's condition is the thing most cases hold steady.
 */
const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: true,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  // The seven members `ScreenSession` requires that no case here varies:
  // `iconUnderPointer` is EZ-2's place condition (`null` -- the pointer rests
  // on no icon), `themePreference` is S-72 and `isMilestoneListOpen` S-142
  // (both the manuscript's default -- the dialogue field carries neither),
  // `themeHue` is S-73 read from the manuscript, `selectedGroupIds` is FR-085's
  // set of rows and `selectedResourceUids` FR-099's set of resources (both
  // empty -- none chosen), and `propertiesSubject` is FR-072's remembered
  // subject (`null` -- no operation has chosen one yet).
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

const sessionWith = (part: Partial<ScreenSession>): ScreenSession => ({ ...SESSION, ...part })

const utterance = (
  sequence: number,
  author: string,
  text: string,
  settledAt: string,
): DialogueMessage => ({ sequence, author, text, settledAt })

/**
 * A log holding exactly these messages, in exactly this array order.
 *
 * ⚠️ Built by hand rather than through `logWithMessage` (PI-33) wherever a case
 * needs the array order to disagree with the sequence: PI-33 appends, so it can
 * only ever produce an array that is already in sequence order, and an order
 * rule cannot be tested against inputs that always satisfy it.
 */
const logOf = (messages: readonly DialogueMessage[]): DialogueLog => ({
  messages,
  nextSequence: messages.reduce((next, message) => Math.max(next, message.sequence + 1), 1),
})

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

/** The field, with the `null` FR-066 admits ruled out first. */
const fieldOf = (log: DialogueLog, session: ScreenSession = SESSION): DialogueField => {
  const field = dialogueFieldFromLog(log, session)
  expect(field).not.toBeNull()
  return field as DialogueField
}

const sequencesOf = (field: DialogueField): readonly number[] =>
  field.messages.map((message) => message.sequence)

// ---------------------------------------------------------------------------

describe('UF-68 -- FR-066: the field stands while the `Agent API` is enabled', () => {
  const settled = logOf([
    utterance(1, 'person', 'move the milestone', '2026-08-19T09:00:00Z'),
    utterance(2, 'ai', 'moved it to the 21st', '2026-08-19T09:00:04Z'),
  ])

  it('answers a field while the API is on', () => {
    expect(dialogueFieldFromLog(settled, SESSION)).not.toBeNull()
  })

  it('answers null while the API is off, although utterances were settled', () => {
    expect(dialogueFieldFromLog(settled, sessionWith({ isAgentApiEnabled: false }))).toBeNull()
  })

  it('answers null rather than a field holding nothing while the API is off', () => {
    // ⛔ An empty field is not the same answer as no field: it would draw an
    // empty conversation over an API FR-066 says is not open.
    const field = dialogueFieldFromLog(emptyDialogueLog(), sessionWith({ isAgentApiEnabled: false }))
    expect(field).toBeNull()
  })

  it('puts the field up before anything has been said', () => {
    // FR-066 conditions the field on the API alone, so an empty log is a field
    // with no utterances in it -- not the absence of a field.
    expect(fieldOf(emptyDialogueLog()).messages).toEqual([])
  })

  it('turns on nothing but the flag S-99b keeps in the environment (FR-065)', () => {
    // The two sessions differ in that one member only, and the answer differs.
    // ⭐ The document cannot hold this: S-99b of table T-206 records it against
    // the document's identifier, in `localStorage`.
    expect(dialogueFieldFromLog(settled, sessionWith({ isAgentApiEnabled: true }))).not.toBeNull()
    expect(dialogueFieldFromLog(settled, sessionWith({ isAgentApiEnabled: false }))).toBeNull()
  })
})

describe('UF-68 -- AG-11 of table T-035: an order of its own', () => {
  it('carries the settled utterances oldest first', () => {
    const log = [
      { author: 'person', text: 'first', settledAt: '2026-08-19T09:00:00Z' },
      { author: 'ai', text: 'second', settledAt: '2026-08-19T09:00:01Z' },
      { author: 'person', text: 'third', settledAt: '2026-08-19T09:00:02Z' },
    ].reduce(logWithMessage, emptyDialogueLog())

    expect(fieldOf(log).messages.map((message) => message.text)).toEqual([
      'first',
      'second',
      'third',
    ])
  })

  it('orders by sequence although the log handed the array over in another order', () => {
    // ⭐ `DialogueLog` publishes the counter AG-11 requires but declares no order
    // for its `messages` array, so taking the array order would lean on an
    // invariant the entity never states.
    const log = logOf([
      utterance(3, 'person', 'third', '2026-08-19T09:00:02Z'),
      utterance(1, 'person', 'first', '2026-08-19T09:00:00Z'),
      utterance(2, 'ai', 'second', '2026-08-19T09:00:01Z'),
    ])

    expect(sequencesOf(fieldOf(log))).toEqual([1, 2, 3])
  })

  it('does not order by settledAt, which is a clock reading and not the count', () => {
    // ⛔ AM-18 of table T-107 has the AI settle an utterance while a person
    // settles another, so the two stamps come off different machines. The stamps
    // here run backwards against the sequence; the sequence still decides.
    const log = logOf([
      utterance(1, 'person', 'asked', '2026-08-19T09:00:09Z'),
      utterance(2, 'ai', 'answered', '2026-08-19T09:00:03Z'),
      utterance(3, 'person', 'thanked', '2026-08-19T09:00:06Z'),
    ])

    expect(fieldOf(log).messages.map((message) => message.text)).toEqual([
      'asked',
      'answered',
      'thanked',
    ])
  })

  it('keeps the count apart from the stamp when two utterances share a second', () => {
    // AT-129 spells the stamp to the second, so a tie is ordinary and cannot be
    // what separates one utterance from the next.
    const log = logOf([
      utterance(2, 'ai', 'later', '2026-08-19T09:00:00Z'),
      utterance(1, 'person', 'earlier', '2026-08-19T09:00:00Z'),
    ])

    expect(fieldOf(log).messages.map((message) => message.text)).toEqual(['earlier', 'later'])
  })

  it('carries one settled utterance', () => {
    const log = logOf([utterance(1, 'person', 'only', '2026-08-19T09:00:00Z')])

    expect(sequencesOf(fieldOf(log))).toEqual([1])
  })

  it('carries every settled utterance the log holds', () => {
    // AG-11 (MUST) requires a settled utterance to be readable. Dropping one
    // would hide something a person settled.
    const log = logOf([
      utterance(4, 'ai', 'd', '2026-08-19T09:00:03Z'),
      utterance(1, 'person', 'a', '2026-08-19T09:00:00Z'),
      utterance(3, 'person', 'c', '2026-08-19T09:00:02Z'),
      utterance(2, 'ai', 'b', '2026-08-19T09:00:01Z'),
    ])

    expect(sequencesOf(fieldOf(log))).toEqual([1, 2, 3, 4])
  })

  it('carries an utterance the log counter has not caught up with', () => {
    // ⚠️ `nextSequence` says which number the NEXT message takes; it is not a
    // filter over the ones already settled. Dropping one because the counter
    // disagrees would hide a settled utterance, which AG-11 forbids.
    const log: DialogueLog = {
      messages: [
        utterance(1, 'person', 'a', '2026-08-19T09:00:00Z'),
        utterance(2, 'ai', 'b', '2026-08-19T09:00:01Z'),
      ],
      nextSequence: 1,
    }

    expect(sequencesOf(fieldOf(log))).toEqual([1, 2])
  })
})

describe('UF-68 -- AG-6 governs the watch, not this field', () => {
  // ⛔ `messagesSince` (PI-33) drops what the watcher itself wrote, because AG-6
  // wakes a watcher only for the other writers. A field built that way would
  // show one side of a dialogue -- and AM-18 of table T-107 puts the AI's own
  // settled utterances into this very field, so both sides belong in it.
  const bothSides = logOf([
    utterance(1, 'person', 'move it', '2026-08-19T09:00:00Z'),
    utterance(2, 'ai', 'moved', '2026-08-19T09:00:01Z'),
    utterance(3, 'person', 'thanks', '2026-08-19T09:00:02Z'),
  ])

  it('carries both sides of the conversation, whoever settled each utterance', () => {
    expect(fieldOf(bothSides).messages.map((message) => message.author)).toEqual([
      'person',
      'ai',
      'person',
    ])
  })

  it('drops nothing when every utterance has one and the same author', () => {
    const oneSpeaker = logOf([
      utterance(1, 'person', 'a', '2026-08-19T09:00:00Z'),
      utterance(2, 'person', 'b', '2026-08-19T09:00:01Z'),
    ])

    expect(sequencesOf(fieldOf(oneSpeaker))).toEqual([1, 2])
  })

  it('carries author, text and settledAt across untouched, for the surface to attribute with', () => {
    const one = utterance(1, 'person', 'move the milestone', '2026-08-19T09:00:00Z')

    expect(fieldOf(logOf([one])).messages[0]).toEqual(one)
  })
})

describe('UF-68 -- table T-075: the unit is `pure`', () => {
  it('leaves the log it was handed in the order it came (R7.1)', () => {
    // ⭐ LY-1 of table T-060 holds the log as an immutable value that is
    // replaced whole. Reordering the caller's array in place would be a side
    // effect, and a `pure` unit may not have one.
    const messages = [
      utterance(3, 'person', 'third', '2026-08-19T09:00:02Z'),
      utterance(1, 'person', 'first', '2026-08-19T09:00:00Z'),
      utterance(2, 'ai', 'second', '2026-08-19T09:00:01Z'),
    ]
    const log = logOf(messages)

    fieldOf(log)

    expect(log.messages.map((message) => message.sequence)).toEqual([3, 1, 2])
    expect(messages.map((message) => message.sequence)).toEqual([3, 1, 2])
  })

  it('leaves the counter of the log alone', () => {
    const log = logOf([utterance(1, 'person', 'a', '2026-08-19T09:00:00Z')])

    fieldOf(log)

    expect(log.nextSequence).toBe(2)
  })

  it('answers the same value for the same values', () => {
    const log = logOf([
      utterance(2, 'ai', 'b', '2026-08-19T09:00:01Z'),
      utterance(1, 'person', 'a', '2026-08-19T09:00:00Z'),
    ])

    expect(dialogueFieldFromLog(log, SESSION)).toEqual(dialogueFieldFromLog(log, SESSION))
  })

  it('reads no member of the session but the one FR-066 conditions on', () => {
    // UF-68's row of table T-075 gives it one member of `ScreenView` to fill.
    // Everything else the session carries belongs to the other eight units, so
    // moving all of it must not move this answer.
    const log = logOf([
      utterance(1, 'person', 'a', '2026-08-19T09:00:00Z'),
      utterance(2, 'ai', 'b', '2026-08-19T09:00:01Z'),
    ])
    const other = sessionWith({
      language: 'en',
      openedFileName: null,
      fileSavedAt: null,
      pointer: { x: 12, y: 34 },
      pointerRestedMs: 4000,
      commandPaletteAt: { x: 80, y: 90 },
      propertiesShowing: 'documentSettings',
      notices: [{ manner: 'NT-1', reason: 'refused', affectedCount: 2 }],
      rowBoxes: [{ groupId: 'g1', box: { x: 0, y: 0, width: 100, height: 20 } }],
    })

    expect(dialogueFieldFromLog(log, other)).toEqual(dialogueFieldFromLog(log, SESSION))
  })
})
