
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  emptyScreenState,
  screenStateWithArmed,
  screenStateWithPalette,
  type Armed,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection, type Selection } from '../../src/entity/document-model/selection/selection'
import type {
  CommandPalette,
  DisplayLanguage,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { commandPaletteFromScreenState } from '../../src/adapter/screen-renderer/command-palette'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { specTable, unbroken } from '../contract/spec-table'

const SETTINGS: DocumentSettings = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings


const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const BAND_ALONE = '最小化しているあいだに出すのは掴み帯だけとし、ほかは何も出さないこと（MUST）'

const NO_ARMED_READING_WHILE_MINIMISED =
  'いま構えているものの表示を、最小化しているあいだ出してはならない（MUST NOT）'

const ARMED_IS_READABLE = 'いま構えているものが画面上で読めること（MUST）'
const THE_ONE_EXCEPTION = 'ただしパレットを最小化しているあいだ'

const THE_OVERRIDDEN_2026_08_28 =
  '⛔ **最小化しているあいだも、掴み帯と、いま構えているものの表示は残すこと（MUST）** ——'

const T_023b_ROWS: readonly string[] = specTable('T-023b').rows.map((row) => row.id)


const SHOWN: ScreenState = screenStateWithPalette(emptyScreenState(), true)

const EVERY_ARM: readonly { readonly what: string; readonly armed: Armed }[] = [
  { what: 'AR-1, nothing armed', armed: { kind: 'none' } },
  { what: 'AR-2, a task shape', armed: { kind: 'taskShape', shapeKind: 'SH-1' } },
  { what: 'AR-3, a milestone shape', armed: { kind: 'milestoneShape', glyph: 'SH-5' } },
  { what: 'AR-4, a dependency', armed: { kind: 'dependency' } },
  { what: 'AR-5, a comment box', armed: { kind: 'commentBox' } },
  { what: 'AR-6, a highlight box', armed: { kind: 'highlightBox' } },
]

const NOTHING_ARMED: Armed = { kind: 'none' }
const A_DEPENDENCY_ARMED: Armed = { kind: 'dependency' }

const sessionOf = (part: Partial<ScreenSession> = {}): ScreenSession =>
  ({
    language: 'ja' as DisplayLanguage,
    openedFileName: null,
    fileSavedAt: null,
    isAgentApiEnabled: false,
    isDialogueFieldVisible: true,
    pointer: null,
    pointerRestedMs: 0,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: 'light',
    themeHue: 214,
    isMilestoneListOpen: true,
    isPaletteMinimised: false,
    dualCursorFollowing: null,
    selectedGroupIds: [],
    selectedResourceUids: [],
    propertiesSubject: null,
    propertiesShowing: null,
    notices: [],
    confirmation: null,
    rowBoxes: [],
    ...part,
  }) as unknown as ScreenSession

const describedWith = (
  session: ScreenSession = sessionOf(),
  state: ScreenState = SHOWN,
  selection: Selection = emptySelection(),
): CommandPalette => {
  const palette = commandPaletteFromScreenState(state, SETTINGS, selection, session)
  expect(palette, 'S-99e: the palette is showing, so one is described').not.toBeNull()
  return palette as CommandPalette
}

const minimisedWith = (armed: Armed): CommandPalette =>
  describedWith(sessionOf({ isPaletteMinimised: true }), screenStateWithArmed(SHOWN, armed))

const shownWith = (armed: Armed): CommandPalette =>
  describedWith(sessionOf(), screenStateWithArmed(SHOWN, armed))


describe('the manuscript still says what these cases read', () => {
  it('⛔ FR-053 says the band alone is what a minimised palette shows', () => {
    expect(REQUIREMENTS).toContain(BAND_ALONE)
    expect(REQUIREMENTS).toContain(NO_ARMED_READING_WHILE_MINIMISED)
  })

  it('⛔ the sentence the 2026-09-01 ruling replaced does not stand as a rule again', () => {
    expect(REQUIREMENTS).not.toContain(THE_OVERRIDDEN_2026_08_28)
  })

  it('⭐ the readable-armed MUST still stands, with the minimised state as its one exception', () => {
    expect(REQUIREMENTS).toContain(ARMED_IS_READABLE)
    expect(REQUIREMENTS).toContain(THE_ONE_EXCEPTION)
  })

  it('⭐ every arm of table T-023b is driven below', () => {
    expect(EVERY_ARM).toHaveLength(T_023b_ROWS.length)
  })
})

describe('FR-053 (MUST NOT): a minimised palette carries no armed reading', () => {
  it('⛔ says nothing about what is armed, whatever is armed', () => {
    for (const { what, armed } of EVERY_ARM) {
      expect(minimisedWith(armed).armedText, `${what}: minimised, so nothing is read`).toBeNull()
    }
  })

  it('⛔ null and not an empty word, so nothing is laid out for it', () => {
    expect(minimisedWith(NOTHING_ARMED).armedText).not.toBe('')
  })
})

describe('FR-053 (MUST): the grab band survives the minimise', () => {
  it('⭐ the band keeps its height and the minimise entrance rides on it', () => {
    const palette = minimisedWith(NOTHING_ARMED)
    expect(palette.isMinimised).toBe(true)
    expect(palette.grabBandHeight, 'S-135a still states the band').toBeGreaterThan(0)
    expect(palette.minimise.icon, 'IC-75 rides on the band in both states').toBe('IC-75')
  })

  it('⚠️ the entrances stay withdrawn, which is what minimised means', () => {
    expect(minimisedWith(NOTHING_ARMED).groups).toHaveLength(0)
  })
})

describe('FR-053 (MUST): every other state still reads what is armed', () => {
  it('⭐ a palette that is not minimised says what it has armed', () => {
    for (const { what, armed } of EVERY_ARM) {
      const said = shownWith(armed).armedText
      expect(said, `${what}: shown, so the arm is readable`).not.toBeNull()
      expect((said ?? '').length, `${what}`).toBeGreaterThan(0)
    }
  })

  it('⭐ restoring the palette brings the reading back', () => {
    const armed = A_DEPENDENCY_ARMED
    const before = shownWith(armed).armedText
    expect(minimisedWith(armed).armedText).toBeNull()
    expect(shownWith(armed).armedText).toBe(before)
  })
})
