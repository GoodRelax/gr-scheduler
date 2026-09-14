// FR-066 (MUST / MUST NOT): the dialogue field's VISIBILITY is a value of its

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  emptyDialogueLog,
  logWithMessage,
  type DialogueLog,
} from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import type {
  AppHeaderItems,
  CommandItem,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { appHeaderItemsFromDocument } from '../../src/adapter/screen-renderer/app-header-items'
import { dialogueFieldFromLog } from '../../src/adapter/screen-renderer/dialogue-field'
import { bare, specTable, unbroken } from '../contract/spec-table'


const CHAPTER_1_4 = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const plain = (text: string): string => text.replace(/\*/g, '')

function statementOf(uid: string): string {
  const lines = CHAPTER_1_4.split('\n')
  const at = lines.findIndex((line) => line.trim() === `**UID**: ${uid}`)
  if (at < 0) throw new Error(`Chapter 1-4 has no requirement ${uid}`)
  const from = lines.slice(at).findIndex((line) => line.startsWith('**STATEMENT**:'))
  if (from < 0) throw new Error(`${uid} has no STATEMENT`)
  const said: string[] = []
  for (const line of lines.slice(at + from)) {
    if (line.trim() === '') break
    said.push(line.trim())
  }
  return plain(said.join(''))
}

const FR_066 = statementOf('FR-066')
const FR_065 = statementOf('FR-065')

const FR_066_NOT_WHILE_HIDDEN = '閲覧者がその欄を非表示にしているあいだは表示しないこと（MUST）'
const FR_066_S_99I_HOLDS_THE_LOOK =
  '見え方は `_assets/tbl-settings.md` の 表 T-206 の `S-99i` が持ち、切り替えの入口は `_assets/tbl-glossary.md` の 表 T-109 の `IC-18` である'
const FR_066_NOT_ONE_VALUE =
  '`Agent API` の有効・無効（`FR-065`）と 1 つの値で兼ねてはならない（MUST NOT）'
const FR_066_WHY_NOT_ONE_VALUE =
  '兼ねると `Agent API` を有効にしただけで `IC-18` が押された状態になる'
const FR_066_FAINT_WHILE_OFF = '`Agent API` が無効のあいだ `IC-18` は薄く描かれる'
const FR_066_RS_35_TELLS_WHY = '告げる理由は同要求の 表 T-233 の `RS-35` が持つ'

const FR_065_SHOW_THAT_IT_IS_ON = '有効であるあいだ、そのことを画面上に示すこと（MUST）'


const S_99I = specTable('T-206').rows.find((row) => row.id === 'S-99i')
if (S_99I === undefined) {
  throw new Error('表 T-206 has no row S-99i: the row DFC-149 added is gone')
}
const S_99B = specTable('T-206').rows.find((row) => row.id === 'S-99b')
if (S_99B === undefined) throw new Error('表 T-206 has no row S-99b')

const S_99I_VALUE = plain(S_99I.by['値'] ?? '')
const S_99I_NOTE = plain(S_99I.by['保存しない理由'] ?? '')
const S_99I_DEFAULT_CELL = plain(S_99I.by['既定'] ?? '').trim()

const SHOWN_WORD = '表示'
const HIDDEN_WORD = '非表示'
const visibilityOf = (cell: string): boolean => {
  if (cell === HIDDEN_WORD) return false
  if (cell === SHOWN_WORD) return true
  throw new Error(`表 T-206 の S-99i writes a default this file cannot read: ${JSON.stringify(cell)}`)
}

const S_99I_DEFAULT = visibilityOf(S_99I_DEFAULT_CELL)

const S_99I_NOT_ONE_VALUE =
  '`Agent API` が有効かどうか（`S-99b`）とは別の値として持つこと。1 つの値で兼ねてはならない'
const S_99I_WHAT_WAS_MEASURED =
  '兼ねると、`Agent API` を有効にしただけで `IC-18` の押下状態が立つ'
const S_99I_WHY_THE_DEFAULT =
  '既定が「表示」なのは、`FR-066` が有効なあいだ欄を表示すると定めているからである'


const IC_DIALOGUE_FIELD = 'IC-18'
const IC_AGENT_API = 'IC-20'

const T_109 = specTable('T-109')
const t109 = (icon: string): { readonly duty: string; readonly rule: string } => {
  const row = T_109.rows.find((one) => one.id === icon)
  if (row === undefined) throw new Error(`表 T-109 has no row ${icon}`)
  return { duty: plain(row.by['何の入口か'] ?? ''), rule: plain(row.by['正'] ?? '') }
}

const IC_18_DUTY = 'AI との対話欄を表示する・非表示にする'
const IC_20_DUTY = '`Agent API` を有効にする・無効にする'
const THE_RETIRED_WORDING = '出す・しまう'


const STATE_COLUMN = '何が効いているか'
const FILL_COLUMN = '塗りの色'
const OWNER_COLUMN = '定める要求'

const T_237 = specTable('T-237')

function t237(enRow: string): { readonly by: Readonly<Record<string, string>> } {
  const found = T_237.rows.find((one) => one.id === enRow)
  if (found === undefined) throw new Error(`表 T-237 has no row ${enRow}`)
  return found
}

const EN_5_SHOWS_IT_NOW = 'その入口が表示・非表示を切り替えるものを、いま表示している'


const RS_35 = specTable('T-233').rows.find((row) => row.id === 'RS-35')
if (RS_35 === undefined) throw new Error('表 T-233 has no row RS-35')


const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('表 T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

const SETTINGS: DocumentSettings = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings

const SCHEDULE: Schedule = {
  project: { title: null },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const STATE: ScreenState = emptyScreenState()

const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const sessionWith = (part: Partial<ScreenSession>): ScreenSession => ({ ...SESSION, ...part })

const LOG: DialogueLog = [
  { author: 'person', text: 'move the milestone', settledAt: '2026-08-19T09:00:00Z' },
  { author: 'ai', text: 'moved it to the 21st', settledAt: '2026-08-19T09:00:04Z' },
].reduce(logWithMessage, emptyDialogueLog())


interface Pair {
  readonly name: string
  readonly apiEnabled: boolean
  readonly fieldVisible: boolean
}

const PAIRS: readonly Pair[] = [
  { name: 'the API on, the field shown', apiEnabled: true, fieldVisible: true },
  { name: 'the API on, the field hidden', apiEnabled: true, fieldVisible: false },
  { name: 'the API off, the field shown', apiEnabled: false, fieldVisible: true },
  { name: 'the API off, the field hidden', apiEnabled: false, fieldVisible: false },
]

const sessionOf = (pair: Pair): ScreenSession =>
  sessionWith({ isAgentApiEnabled: pair.apiEnabled, isDialogueFieldVisible: pair.fieldVisible })

const fieldIsUp = (pair: Pair): boolean => pair.apiEnabled && pair.fieldVisible


const itemsOf = (session: ScreenSession): AppHeaderItems =>
  appHeaderItemsFromDocument(SCHEDULE, SETTINGS, STATE, session)

const commandFor = (items: AppHeaderItems, icon: string): CommandItem => {
  const found = items.commands.filter((command) => command.icon === icon)
  expect(found, `表 T-109's ${icon} has exactly one entry (FR-029, MUST NOT)`).toHaveLength(1)
  return found[0] as CommandItem
}

const entryOf = (pair: Pair, icon: string): CommandItem => commandFor(itemsOf(sessionOf(pair)), icon)

const fieldShownFor = (pair: Pair): boolean => dialogueFieldFromLog(LOG, sessionOf(pair)) !== null


describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    expect(FR_066.length).toBeGreaterThan(0)
    expect(S_99I_VALUE.length).toBeGreaterThan(0)
    expect(S_99I_NOTE.length).toBeGreaterThan(0)
    expect(t109(IC_DIALOGUE_FIELD).duty.length).toBeGreaterThan(0)
    expect(T_237.rows.length).toBeGreaterThan(0)
  })

  it('⛔ 表 T-206 still holds `S-99i`, and holds it APART from `S-99b`', () => {
    expect(S_99I_VALUE, 'S-99i is the dialogue field U-44, and it points at FR-066').toContain(
      'FR-066',
    )
    expect(S_99I_VALUE).toContain('U-44')
    expect(S_99I_NOTE, 'the MUST NOT that forbids one value for both').toContain(
      S_99I_NOT_ONE_VALUE,
    )
    expect(S_99I_NOTE, 'and what was measured when they were one').toContain(
      S_99I_WHAT_WAS_MEASURED,
    )
    expect(plain(S_99B.by['値'] ?? '')).toContain('Agent API')
  })

  it('⭐ 表 T-206 still makes the default 「表示」, and still says why', () => {
    expect(S_99I_DEFAULT_CELL).toBe(SHOWN_WORD)
    expect(S_99I_DEFAULT).toBe(true)
    expect(S_99I_NOTE).toContain(S_99I_WHY_THE_DEFAULT)
  })

  it('⛔ and the reader of that default is not a constant `true`', () => {
    expect(visibilityOf(SHOWN_WORD)).toBe(true)
    expect(visibilityOf(HIDDEN_WORD)).toBe(false)
    expect(HIDDEN_WORD).toContain(SHOWN_WORD)
    expect(() => visibilityOf('出している')).toThrow()
  })

  it('⛔ FR-066 still states both conditions, and the MUST NOT between them', () => {
    expect(FR_066, 'the field is not up while the reader has hidden it').toContain(
      FR_066_NOT_WHILE_HIDDEN,
    )
    expect(FR_066, 'the look is S-99i and the entrance is IC-18').toContain(
      FR_066_S_99I_HOLDS_THE_LOOK,
    )
    expect(FR_066, 'and the two may not be one value').toContain(FR_066_NOT_ONE_VALUE)
    expect(FR_066).toContain(FR_066_WHY_NOT_ONE_VALUE)
  })

  it('⚠️ FR-066 still draws `IC-18` faint while the API is off, and points at `RS-35`', () => {
    expect(FR_066).toContain(FR_066_FAINT_WHILE_OFF)
    expect(FR_066).toContain(FR_066_RS_35_TELLS_WHY)
    expect(plain(RS_35.by['作法'] ?? '')).toContain('NT-1')
    expect(plain(RS_35.by['正'] ?? '')).toContain('FR-066')
  })

  it('⛔ FR-065 still makes `IC-20` answerable for the capability and nothing else', () => {
    expect(FR_065).toContain(FR_065_SHOW_THAT_IT_IS_ON)
  })

  it('⭐ 表 T-237 still holds `EN-5`, in `S-183`, defined by FR-029 itself', () => {
    expect(T_237.rows.map((row) => row.id)).toContain('EN-5')
    expect(plain(t237('EN-5').by[STATE_COLUMN] ?? '')).toContain(EN_5_SHOWS_IT_NOW)
    expect(plain(t237('EN-5').by[STATE_COLUMN] ?? ''), 'and the value is one of 表 T-206').toContain(
      'T-206',
    )
    expect(bare(t237('EN-5').by[FILL_COLUMN] ?? '')).toBe('S-183')
    expect(plain(t237('EN-5').by[OWNER_COLUMN] ?? '')).toBe('本要求')
  })

  it('⛔ 表 T-109 still gives the two entrances two duties and two requirements', () => {
    expect(t109(IC_DIALOGUE_FIELD).duty).toContain(IC_18_DUTY)
    expect(t109(IC_DIALOGUE_FIELD).duty).not.toContain(THE_RETIRED_WORDING)
    expect(t109(IC_AGENT_API).duty).toContain(IC_20_DUTY)

    expect(t109(IC_DIALOGUE_FIELD).rule).toContain('FR-066')
    expect(t109(IC_AGENT_API).rule).toContain('FR-065')
    expect(t109(IC_DIALOGUE_FIELD).rule).not.toBe(t109(IC_AGENT_API).rule)
  })
})


describe('UF-62 IC-20: the Agent API, and only the Agent API (FR-065, MUST)', () => {
  it('presses exactly while the capability is on, whatever the field is doing', () => {
    for (const pair of PAIRS) {
      expect(entryOf(pair, IC_AGENT_API).isPressed, pair.name).toBe(pair.apiEnabled)
    }
  })

  it('stays usable both ways, since the same entrance turns it off (表 T-109 の IC-20)', () => {
    for (const pair of PAIRS) {
      expect(entryOf(pair, IC_AGENT_API).isEnabled, pair.name).toBe(true)
    }
  })
})

describe('UF-62 IC-18: pressing IC-20 does not press it (FR-066, MUST NOT)', () => {
  it('⛔⛔ turning the Agent API on does not by itself press IC-18 -- THIS IS DFC-149', () => {
    const hidden = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: false })
    const items = itemsOf(hidden)

    expect(
      commandFor(items, IC_AGENT_API).isPressed,
      'FR-065 (MUST): IC-20 does say the capability is on',
    ).toBe(true)
    expect(
      commandFor(items, IC_DIALOGUE_FIELD).isPressed,
      'FR-066 (MUST NOT): and IC-18 says nothing of the sort while the field is hidden',
    ).toBe(false)
  })

  it('⭐ presses exactly while the field is up -- 表 T-237 の EN-5, 「いま表示している」', () => {
    for (const pair of PAIRS) {
      expect(entryOf(pair, IC_DIALOGUE_FIELD).isPressed, pair.name).toBe(fieldIsUp(pair))
    }
  })

  it('⛔ answers differently where one value could not, and alike where it must', () => {
    const on = PAIRS.filter((pair) => pair.apiEnabled)
    expect(on).toHaveLength(2)

    const ic18 = on.map((pair) => entryOf(pair, IC_DIALOGUE_FIELD).isPressed)
    const ic20 = on.map((pair) => entryOf(pair, IC_AGENT_API).isPressed)

    expect(new Set(ic18).size, 'IC-18 tells the two states apart').toBe(2)
    expect(new Set(ic20).size, 'while IC-20 says the same thing in both').toBe(1)
  })

  it('⚠️ and FOUR distinct answers is NOT asked for -- 表 T-237 forbids it', () => {
    const off = PAIRS.filter((pair) => !pair.apiEnabled)
    expect(off).toHaveLength(2)

    const answers = off.map((pair) => {
      const entry = entryOf(pair, IC_DIALOGUE_FIELD)
      return [entry.isEnabled, entry.isPressed].join('/')
    })
    expect(new Set(answers).size, `both API-off states are faint and unfilled: ${answers.join(' ')}`).toBe(
      1,
    )
    expect(answers[0]).toBe([false, false].join('/'))
  })

  it('⭐ has a working 「非表示にする」 half: hiding the field lifts the press', () => {
    const shown = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: true })
    const hidden = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: false })

    expect(commandFor(itemsOf(shown), IC_DIALOGUE_FIELD).isPressed).toBe(true)
    expect(commandFor(itemsOf(hidden), IC_DIALOGUE_FIELD).isPressed).toBe(false)
  })
})

describe('UF-62 IC-18: faint while the API is off (FR-066 ⚠️, through FR-029)', () => {
  it('⭐ is faint exactly while the capability is off -- the half that never broke', () => {
    for (const pair of PAIRS) {
      expect(entryOf(pair, IC_DIALOGUE_FIELD).isEnabled, pair.name).toBe(pair.apiEnabled)
    }
  })

  it('⛔ does not become usable just because `S-99i` says 「表示」', () => {
    const off = sessionWith({ isAgentApiEnabled: false, isDialogueFieldVisible: true })
    expect(commandFor(itemsOf(off), IC_DIALOGUE_FIELD).isEnabled).toBe(false)
  })

  it('⛔ is never faint AND filled at once (FR-029, MUST NOT)', () => {
    for (const pair of PAIRS) {
      const entry = entryOf(pair, IC_DIALOGUE_FIELD)
      if (!entry.isEnabled) expect(entry.isPressed, pair.name).toBe(false)
    }
  })

  it('⚠️ is the entry FR-029 leaves pressable so that `RS-35` can be told', () => {
    const off = sessionWith({ isAgentApiEnabled: false, isDialogueFieldVisible: false })
    const icons = itemsOf(off).commands.map((command) => command.icon)
    expect(icons).toContain(IC_DIALOGUE_FIELD)
  })
})


describe('UF-68: the field is described only while both conditions hold (FR-066)', () => {
  it('⭐ describes it while the API is on and the field is shown', () => {
    expect(dialogueFieldFromLog(LOG, sessionOf(PAIRS[0] as Pair))).not.toBeNull()
  })

  it('⛔ describes nothing while the API is on and the reader has hidden it (MUST)', () => {
    const hidden = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: false })
    expect(dialogueFieldFromLog(LOG, hidden)).toBeNull()
  })

  it('⛔ describes nothing while the API is off, whichever way `S-99i` stands', () => {
    for (const pair of PAIRS.filter((one) => !one.apiEnabled)) {
      expect(dialogueFieldFromLog(LOG, sessionOf(pair)), pair.name).toBeNull()
    }
  })

  it('⭐ answers for all four states as FR-066 states them', () => {
    for (const pair of PAIRS) {
      expect(fieldShownFor(pair), pair.name).toBe(fieldIsUp(pair))
    }
  })

  it('⛔ answers `null` and not an empty field when the field is hidden', () => {
    const hidden = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: false })
    expect(dialogueFieldFromLog(LOG, hidden)).toBeNull()
    expect(dialogueFieldFromLog(emptyDialogueLog(), hidden)).toBeNull()
  })

  it('⚠️ reads `S-99i` and not the log: a hidden field with things said stays hidden', () => {
    const hidden = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: false })
    const spoken = logWithMessage(LOG, {
      author: 'ai',
      text: 'and moved the next one too',
      settledAt: '2026-08-19T09:00:09Z',
    })
    expect(dialogueFieldFromLog(spoken, hidden)).toBeNull()
  })
})


describe('EN-5: the press on IC-18 says what the screen is actually doing', () => {
  it('⭐ IC-18 is pressed in exactly the states in which a field is described', () => {
    for (const pair of PAIRS) {
      expect(entryOf(pair, IC_DIALOGUE_FIELD).isPressed, pair.name).toBe(fieldShownFor(pair))
    }
  })
})


describe('the default of `S-99i` -- one press, not two (表 T-206)', () => {
  const atTheDefault = (isAgentApiEnabled: boolean): ScreenSession =>
    sessionWith({ isAgentApiEnabled, isDialogueFieldVisible: S_99I_DEFAULT })

  it('⭐ turning the API on puts the field up, with no second press', () => {
    expect(S_99I_DEFAULT, 'the manuscript still says 「表示」').toBe(true)
    expect(dialogueFieldFromLog(LOG, atTheDefault(true))).not.toBeNull()
  })

  it('⭐ and IC-18 is pressed at once, because the field really is up', () => {
    expect(commandFor(itemsOf(atTheDefault(true)), IC_DIALOGUE_FIELD).isPressed).toBe(true)
  })

  it('⛔ but the default does not put a field up while the API is off', () => {
    expect(dialogueFieldFromLog(LOG, atTheDefault(false))).toBeNull()
    expect(commandFor(itemsOf(atTheDefault(false)), IC_DIALOGUE_FIELD).isPressed).toBe(false)
    expect(commandFor(itemsOf(atTheDefault(false)), IC_DIALOGUE_FIELD).isEnabled).toBe(false)
  })
})


describe('the wiring DFC-149 measured fails these cases', () => {
  const pressedUnderTheDefect = (pair: Pair): boolean => pair.apiEnabled

  const fieldUnderTheDefect = (pair: Pair): boolean => pair.apiEnabled

  const required = (pair: Pair): boolean => fieldIsUp(pair)

  it('⛔ presses IC-18 in a state FR-066 forbids -- and in exactly that one', () => {
    const wrong = PAIRS.filter((pair) => pressedUnderTheDefect(pair) !== required(pair))
    expect(wrong.map((pair) => pair.name)).toEqual(['the API on, the field hidden'])
  })

  it('⛔ leaves the field up in that same state, so the 「非表示」 half does nothing', () => {
    const wrong = PAIRS.filter((pair) => fieldUnderTheDefect(pair) !== required(pair))
    expect(wrong.map((pair) => pair.name)).toEqual(['the API on, the field hidden'])
  })

  it('⛔ cannot tell the two API-on states apart, because it has nothing to tell them with', () => {
    const on = PAIRS.filter((pair) => pair.apiEnabled)
    expect(new Set(on.map(pressedUnderTheDefect)).size).toBe(1)
    expect(new Set(on.map(required)).size, 'while FR-066 asks for two').toBe(2)
  })

  it('⭐ agrees with the specification in the other three states, which is why it was missed', () => {
    const agreed = PAIRS.filter((pair) => pressedUnderTheDefect(pair) === required(pair))
    expect(agreed).toHaveLength(3)
  })
})
