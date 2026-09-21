// Unit tests for dialogueFieldFromLog (UF-68, table T-075, CP-37, dialogue-field.ts).

import { describe, expect, it } from 'vitest'

import {
  emptyDialogueLog,
  logWithMessage,
  type DialogueLog,
  type DialogueMessage,
} from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { DialogueField, ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import { dialogueFieldFromLog } from '../../src/adapter/screen-renderer/dialogue-field'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable } from '../contract/spec-table'

// WHY: DR-5 keeps the hue on Project, not settings, so no generated constant
// carries it; read table T-216 rather than typing a number.
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

// WHY: every ScreenViewReadings member is spelled out, so a case that varies one
// member varies exactly one; most cases hold isAgentApiEnabled steady here.
const SESSION: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: true,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const sessionWith = (part: Partial<ScreenViewReadings>): ScreenViewReadings => ({
  ...SESSION,
  ...part,
})

const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, language: 'ja' },
}

const rootWith = (part: Partial<ScreenSession['screen']>): ScreenSession => ({
  ...ROOT,
  screen: { ...ROOT.screen, ...part },
})

const utterance = (
  sequence: number,
  author: string,
  text: string,
  settledAt: string,
): DialogueMessage => ({ sequence, author, text, settledAt })

// WHY: built by hand, not via logWithMessage (PI-33), for cases needing the
// array order to disagree with the sequence -- PI-33 always appends in order.
const logOf = (messages: readonly DialogueMessage[]): DialogueLog => ({
  messages,
  nextSequence: messages.reduce((next, message) => Math.max(next, message.sequence + 1), 1),
})

// see FR-066
const fieldOf = (log: DialogueLog, readings: ScreenViewReadings = SESSION): DialogueField => {
  const field = dialogueFieldFromLog(log, ROOT, readings)
  expect(field).not.toBeNull()
  return field as DialogueField
}

const sequencesOf = (field: DialogueField): readonly number[] =>
  field.messages.map((message) => message.sequence)

// WHY: no case bounds the utterance count -- the spec states no limit, so
// asserting one would decide what it never did.
describe('UF-68 -- FR-066: the field stands while the `Agent API` is enabled', () => {
  const settled = logOf([
    utterance(1, 'person', 'move the milestone', '2026-08-19T09:00:00Z'),
    utterance(2, 'ai', 'moved it to the 21st', '2026-08-19T09:00:04Z'),
  ])

  it('answers a field while the API is on', () => {
    expect(dialogueFieldFromLog(settled, ROOT, SESSION)).not.toBeNull()
  })

  it('answers null while the API is off, although utterances were settled', () => {
    expect(dialogueFieldFromLog(settled, ROOT, sessionWith({ isAgentApiEnabled: false }))).toBeNull()
  })

  it('answers null rather than a field holding nothing while the API is off', () => {
    // WHY: an empty field is not "no field" -- it would draw an empty
    // conversation over an API FR-066 says is not open.
    const field = dialogueFieldFromLog(emptyDialogueLog(), ROOT, sessionWith({ isAgentApiEnabled: false }))
    expect(field).toBeNull()
  })

  it('puts the field up before anything has been said', () => {
    // WHY: FR-066 conditions the field on the API alone, so an empty log is
    // a field with no utterances, not the absence of a field.
    expect(fieldOf(emptyDialogueLog()).messages).toEqual([])
  })

  it('turns on nothing but the flag S-99b keeps in the environment (FR-065)', () => {
    // WHY: S-99b keeps this flag in localStorage, keyed by the document's
    // id, because the document itself cannot hold it.
    expect(dialogueFieldFromLog(settled, ROOT, sessionWith({ isAgentApiEnabled: true }))).not.toBeNull()
    expect(dialogueFieldFromLog(settled, ROOT, sessionWith({ isAgentApiEnabled: false }))).toBeNull()
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
    // WHY: DialogueLog declares no order for its messages array, so reading
    // array order would lean on an invariant the entity never states.
    const log = logOf([
      utterance(3, 'person', 'third', '2026-08-19T09:00:02Z'),
      utterance(1, 'person', 'first', '2026-08-19T09:00:00Z'),
      utterance(2, 'ai', 'second', '2026-08-19T09:00:01Z'),
    ])

    expect(sequencesOf(fieldOf(log))).toEqual([1, 2, 3])
  })

  it('does not order by settledAt, which is a clock reading and not the count', () => {
    // WHY: AM-18 has the AI settle one utterance while a person settles
    // another, so stamps can run backwards; sequence still decides.
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
    // WHY: AT-129 spells the stamp to the second, so a tie is ordinary and
    // cannot be what separates one utterance from the next.
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
    // WHY: AG-11 requires a settled utterance to be readable; dropping one
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
    // WHY: nextSequence names the NEXT message's number, not a filter over
    // settled ones; dropping one because it disagrees would hide it (AG-11).
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
  // WHY: messagesSince (PI-33) drops the watcher's own writes for AG-6, but
  // AM-18 puts the AI's own utterances into this field, so both sides belong.
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
    // WHY: LY-1 holds the log as an immutable value replaced whole;
    // reordering the caller's array would be a side effect a pure unit may not have.
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

    expect(dialogueFieldFromLog(log, ROOT, SESSION)).toEqual(dialogueFieldFromLog(log, ROOT, SESSION))
  })

  it('reads no member of the session but the one FR-066 conditions on', () => {
    // WHY: table T-075's row gives UF-68 one ScreenSession member to read;
    // moving every other member must not move this answer.
    const log = logOf([
      utterance(1, 'person', 'a', '2026-08-19T09:00:00Z'),
      utterance(2, 'ai', 'b', '2026-08-19T09:00:01Z'),
    ])
    const otherRoot = rootWith({
      language: 'en',
      propertiesPanelContentState: { kind: 'documentSettingsDisplayed', returnSubject: null },
    })
    const otherReadings = sessionWith({
      openedFileName: null,
      fileSavedAt: null,
      pointer: { x: 12, y: 34 },
      pointerRestedMs: 4000,
      commandPaletteAt: { x: 80, y: 90 },
      notices: [{ manner: 'NT-1', reason: 'refused', affectedCount: 2 }],
      rowBoxes: [{ groupId: 'g1', box: { x: 0, y: 0, width: 100, height: 20 } }],
    })

    expect(dialogueFieldFromLog(log, otherRoot, otherReadings)).toEqual(
      dialogueFieldFromLog(log, ROOT, SESSION),
    )
  })
})
