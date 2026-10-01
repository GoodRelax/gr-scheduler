// CR-609 (wave 3): table T-280, the settings entry pressed while the settings are shown hides the panel; the selection stays.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-072
const FR_072_CLOSES_WHILE_SHOWN =
  '⭐ パネルが文書の設定を出しているあいだに、設定を出す入口をもう一度押したときは、プロパティパネルを閉じること（MUST）'
const FR_072_EITHER_WAY = '直前の選択物が在っても無くても同じとし、選択物へは戻さない'
const FR_072_OPENING_KEEPS_THE_SELECTION = '設定を開いても選択を解除しないこと。'
const FR_072_CLOSING_KEEPS_THE_SELECTION = '⛔ **パネルを出すのをやめても、選択を解いてはならない（MUST NOT）**'
const FR_072_SETTINGS_AFTER_A_CLOSE =
  '⭐ 文書の設定を出したままパネルを閉じたあとに、設定を出す入口を押したときは、設定を出すこと（MUST）'
const FR_072_A_CLOSE_IS_NOT_AGAIN = '閉じたあとの押しは、上の「もう一度」に数えない。'
const FR_072_NOT_THE_SELECTION_AFTER_A_CLOSE = '⛔ 閉じたあとの押しで、中身を直前の選択物へ切り替えてはならない（MUST NOT）'

describe('CR-609 -- FR-072 still says it, word for word', () => {
  it.each([
    ['(MUST) a second press while the settings are shown closes the panel', FR_072_CLOSES_WHILE_SHOWN],
    ['with or without a selection shown before, never back to it', FR_072_EITHER_WAY],
    ['opening the settings keeps the selection', FR_072_OPENING_KEEPS_THE_SELECTION],
    ['(MUST NOT) putting the panel away keeps the selection', FR_072_CLOSING_KEEPS_THE_SELECTION],
    ['(MUST) after a close the entrance shows the settings', FR_072_SETTINGS_AFTER_A_CLOSE],
    ['a press after a close is not the second press', FR_072_A_CLOSE_IS_NOT_AGAIN],
    ['(MUST NOT) after a close, not the previous selection', FR_072_NOT_THE_SELECTION_AFTER_A_CLOSE],
  ])('%s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

type RawCell = { readonly to?: string; readonly guard?: readonly unknown[]; readonly effect?: string }
type RawMachine = {
  readonly name: string
  readonly states: readonly { readonly key: string; readonly carries: readonly { readonly name: string }[] }[]
  readonly transitions: Readonly<Record<string, Readonly<Record<string, RawCell | readonly RawCell[]>>>>
}
type RawRegion = {
  readonly region: string
  readonly root: { readonly transitions: Readonly<Record<string, unknown>> }
  readonly events: readonly { readonly key: string; readonly carries: readonly unknown[] }[]
  readonly machines: readonly RawMachine[]
}

// WHY: the manuscript is the single source of table T-280 (Chapter 1.9: the cases are fixed
// data copied from the table, here read from it).
const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8'),
) as { readonly regions: readonly RawRegion[] }

const SCREEN_REGION = MANUSCRIPT.regions.find((one) => one.region === 'screen')
if (SCREEN_REGION === undefined) throw new Error('state-machines.json has no region "screen"')
const REGION: RawRegion = SCREEN_REGION

const MACHINE_NAME = 'propertiesPanelContentStateMachine'
const EVENT = 'settingsEntryPressed'

const FOUND_MACHINE = REGION.machines.find((one) => one.name === MACHINE_NAME)
if (FOUND_MACHINE === undefined) throw new Error(`table T-280 has no machine ${MACHINE_NAME}`)
const MACHINE: RawMachine = FOUND_MACHINE

const ROW = MACHINE.transitions[EVENT]
if (ROW === undefined) throw new Error(`table T-280 ${MACHINE_NAME} has no row for ${EVENT}`)

// see T-280
function cellOf(from: string): RawCell {
  const cell = ROW?.[from]
  if (cell === undefined) throw new Error(`table T-280 has no cell ${from} x ${EVENT}`)
  if (Array.isArray(cell)) throw new Error(`table T-280 cell ${from} x ${EVENT} has branches; this file reads one`)
  return cell as RawCell
}

function carriesOf(state: string): readonly string[] {
  const row = MACHINE.states.find((one) => one.key === state)
  if (row === undefined) throw new Error(`table T-280 ${MACHINE_NAME} has no state ${state}`)
  return row.carries.map((one) => one.name)
}

const HIDDEN = 'hidden'
const SELECTION_DISPLAYED = 'selectionDisplayed'
const SETTINGS_DISPLAYED = 'documentSettingsDisplayed'

describe('CR-609 -- the premises read from table T-280', () => {
  it('the settingsEntryPressed row has the three cells E-03 leaves, and none of them has a guard or an effect', () => {
    const cells = Object.fromEntries(
      [HIDDEN, SELECTION_DISPLAYED, SETTINGS_DISPLAYED].map((from) => [from, cellOf(from).to]),
    )
    expect(cells).toEqual({
      [HIDDEN]: SETTINGS_DISPLAYED,
      [SELECTION_DISPLAYED]: SETTINGS_DISPLAYED,
      [SETTINGS_DISPLAYED]: HIDDEN,
    })
    for (const from of [HIDDEN, SELECTION_DISPLAYED, SETTINGS_DISPLAYED]) {
      expect(cellOf(from).guard, `${from} x ${EVENT}: no guard`).toBeUndefined()
      expect(cellOf(from).effect, `${from} x ${EVENT}: no effect`).toBeUndefined()
    }
  })

  it('documentSettingsDisplayed and hidden carry nothing; only selectionDisplayed carries the subject', () => {
    expect(carriesOf(SETTINGS_DISPLAYED)).toEqual([])
    expect(carriesOf(HIDDEN)).toEqual([])
    expect(carriesOf(SELECTION_DISPLAYED)).toEqual(['subject'])
  })

  it('the event carries nothing and no other machine and no root cell of the region takes it', () => {
    expect(REGION.events.find((one) => one.key === EVENT)?.carries).toEqual([])
    expect(REGION.machines.filter((one) => EVENT in one.transitions).map((one) => one.name)).toEqual([MACHINE_NAME])
    expect(Object.keys(REGION.root.transitions)).not.toContain(EVENT)
  })
})

// see T-280, T-293, FR-072
const TASK_1 = { kind: 'task', uid: 1 } as const
const CHOICE = { selection: { items: [TASK_1], ordered: false }, groupIds: [] as readonly string[] }

type Loose = Record<string, unknown>

// WHY: a state that carries nothing is its kind alone (R4.4), so the value a cell lands on is
// built from the table's state row, never from the code.
function panelValue(state: string): Loose {
  if (state === SELECTION_DISPLAYED) return { kind: state, subject: CHOICE }
  if (carriesOf(state).length > 0) throw new Error(`no sample for the carried values of ${state}`)
  return { kind: state }
}

function sessionWith(panelState: string, isSomethingSelected: boolean): ScreenSession {
  const selection = isSomethingSelected
    ? {
        ...emptyScreenSession.selection,
        selectionState: { kind: 'objectsSelected', selectedObjects: { items: [TASK_1], ordered: false } },
      }
    : emptyScreenSession.selection
  return {
    ...emptyScreenSession,
    screen: { ...emptyScreenSession.screen, propertiesPanelContentState: panelValue(panelState) },
    selection,
  } as unknown as ScreenSession
}

const PRESS = { type: EVENT } as unknown as SessionEvent

function panelOf(session: ScreenSession): Loose {
  return (session.screen as unknown as Loose)['propertiesPanelContentState'] as Loose
}

function press(session: ScreenSession): ScreenSession {
  const result = advanceScreenSession(session, PRESS)
  expect(result.effects, `table T-280 names no effect for ${EVENT}`).toHaveLength(0)
  return result.state
}

const CELLS: readonly (readonly [string, boolean])[] = [
  [HIDDEN, false],
  [HIDDEN, true],
  [SELECTION_DISPLAYED, true],
  [SETTINGS_DISPLAYED, false],
  [SETTINGS_DISPLAYED, true],
]

describe('CR-609 -- each cell of the settingsEntryPressed row, against advanceScreenSession', () => {
  it.each(CELLS)('%s x settingsEntryPressed, something selected: %s', (from, isSomethingSelected) => {
    const before = sessionWith(from, isSomethingSelected)
    const after = press(before)
    const to = cellOf(from).to as string
    const clause = from === SETTINGS_DISPLAYED ? FR_072_CLOSES_WHILE_SHOWN : FR_072_SETTINGS_AFTER_A_CLOSE
    expect(panelOf(after), `${clause} -- ${from} lands on ${to}, carrying nothing`).toStrictEqual(panelValue(to))
    expect(after.selection, `${FR_072_OPENING_KEEPS_THE_SELECTION} -- the selection region is not touched`).toBe(
      before.selection,
    )
    const screenBefore = before.screen as unknown as Loose
    const screenAfter = after.screen as unknown as Loose
    for (const key of Object.keys(screenBefore).filter((one) => one !== 'propertiesPanelContentState')) {
      expect(screenAfter[key], `no other cell of table T-280 takes ${EVENT}: ${key} is kept`).toBe(screenBefore[key])
    }
  })
})

describe('CR-609 section 8 wave 3 -- pressing the settings entry again while the settings are shown', () => {
  it('(a) after a selection was shown: the first press shows the settings, the second hides the panel, and the selection stays', () => {
    const start = sessionWith(SELECTION_DISPLAYED, true)
    const shown = press(start)
    expect(panelOf(shown)['kind'], 'premise: the settings are shown').toBe(SETTINGS_DISPLAYED)
    const closed = press(shown)
    expect(panelOf(closed), `${FR_072_CLOSES_WHILE_SHOWN} -- ${FR_072_EITHER_WAY}`).toStrictEqual({ kind: HIDDEN })
    expect(closed.selection, FR_072_CLOSING_KEEPS_THE_SELECTION).toBe(start.selection)
  })

  it('(b) when no selection was shown before (nothing selected): the second press hides the panel', () => {
    const start = sessionWith(HIDDEN, false)
    const shown = press(start)
    expect(panelOf(shown)['kind'], 'premise: the settings are shown').toBe(SETTINGS_DISPLAYED)
    const closed = press(shown)
    expect(panelOf(closed), `${FR_072_CLOSES_WHILE_SHOWN} -- ${FR_072_EITHER_WAY}`).toStrictEqual({ kind: HIDDEN })
    expect(closed.selection, FR_072_CLOSING_KEEPS_THE_SELECTION).toBe(start.selection)
  })

  it('(c) opened from a closed panel while a selection stays: one press shows the settings, the next hides the panel, the selection stays', () => {
    const start = sessionWith(HIDDEN, true)
    const shown = press(start)
    expect(panelOf(shown)['kind'], `${FR_072_SETTINGS_AFTER_A_CLOSE} -- in one event`).toBe(SETTINGS_DISPLAYED)
    const closed = press(shown)
    expect(panelOf(closed), `${FR_072_CLOSES_WHILE_SHOWN} -- ${FR_072_EITHER_WAY}`).toStrictEqual({ kind: HIDDEN })
    expect(closed.selection, FR_072_CLOSING_KEEPS_THE_SELECTION).toBe(start.selection)
  })

  it('a press after the closing press shows the settings again, not the selection shown before', () => {
    const start = sessionWith(SELECTION_DISPLAYED, true)
    const closed = press(press(start))
    expect(panelOf(closed)['kind'], 'premise: the panel is hidden').toBe(HIDDEN)
    const again = press(closed)
    expect(panelOf(again)['kind'], `${FR_072_SETTINGS_AFTER_A_CLOSE} -- ${FR_072_A_CLOSE_IS_NOT_AGAIN}`).toBe(
      SETTINGS_DISPLAYED,
    )
    expect(again.selection, FR_072_OPENING_KEEPS_THE_SELECTION).toBe(start.selection)
  })
})
