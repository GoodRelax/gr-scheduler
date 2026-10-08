// DFC-709 spec-only cases: PI-18 / T-280 / SK-15 / IC-11 -- an input that is the full-screen entrance (the F11 key, or a press on IC-11) makes the screen-value event fullScreenEntryPressed; F11 is stopped for the browser and changes no document.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  commandFromInput,
  screenEventFromInput,
  type InputModifiers,
  type KeyInput,
  type PointerInput,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-renderer'
import { contextOf, documentOf } from './cr-606-stage'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')

// see T-280
const MACHINES = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-state-machines.md'), 'utf8'))
const EVENT_ROW = /\| `screen\/fullScreenEntryPressed` \| ([^|]*) \|/

// see PI-18
const PI_18 = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-published-entries.md'), 'utf8'))
const PI_18_NULL_WHEN_NONE = '作るものが無ければ `null`。'
const PI_18_SOURCE_IS_INPUT = '作るのは、出どころが入力の出来事だけである。'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// see T-036, SK-15
const SK_15_KEY = bare(rowOf('T-036', 'SK-15').by['割当'] ?? '')
const SK_15_ENTRANCE = bare(rowOf('T-036', 'SK-15').by['入口'] ?? '')
const FULL_SCREEN_ENTRANCE = 'IC-11'

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const keyOf = (key: string, modifiers: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
})
const pointerUp: PointerInput = {
  kind: 'pointer',
  phase: 'up',
  button: 'left',
  x: 1,
  y: 1,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
}

const document = documentOf({ tasks: [] })
const context = contextOf(document)

const entryPress = (entry: string): PointerPress => {
  const on = {
    part: bare(rowOf('T-109', entry).by['面'] ?? ''),
    entry,
    format: null,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  } as unknown as ScreenPart
  return { at: { ...pointerUp, phase: 'down' }, hit: null, on, pressRow: 'PTD-5' }
}

describe('DFC-709 -- the manuscript these cases are driven by', () => {
  it('T-036 SK-15: the F11 key moves the full-screen entrance IC-11', () => {
    expect(SK_15_KEY).toBe('F11')
    expect(SK_15_ENTRANCE).toBe(FULL_SCREEN_ENTRANCE)
  })

  it('T-280: screen/fullScreenEntryPressed comes from the input IC-11 and SK-15', () => {
    const source = EVENT_ROW.exec(MACHINES)?.[1] ?? ''
    expect(source).toContain(FULL_SCREEN_ENTRANCE)
    expect(source).toContain('SK-15')
  })

  it('PI-18: screenEventFromInput makes the events whose source is an input, and null when it makes none', () => {
    expect(PI_18).toContain(PI_18_NULL_WHEN_NONE)
    expect(PI_18).toContain(PI_18_SOURCE_IS_INPUT)
  })
})

describe('DFC-709 -- PI-18 screenEventFromInput on the full-screen entrance', () => {
  it('SK-15: the F11 key makes fullScreenEntryPressed', () => {
    expect(screenEventFromInput(keyOf(SK_15_KEY), context)).toEqual({ type: 'fullScreenEntryPressed' })
  })

  // see DFC-709, T-280
  it.fails('DFC-709: IC-11 (T-280 names it beside SK-15): a press released on the entrance makes the same event', () => {
    const pressed = { ...context, pressed: entryPress(FULL_SCREEN_ENTRANCE) }
    expect(screenEventFromInput(pointerUp, pressed)).toEqual({ type: 'fullScreenEntryPressed' })
  })

  it('SK-15 assigns F11 alone: F11 with Ctrl makes no full-screen event (MK-10 stops only what the tool assigned)', () => {
    expect(screenEventFromInput(keyOf(SK_15_KEY, { ctrl: true }), context)).toBeNull()
  })

  it('SK-15: another function key makes no full-screen event', () => {
    expect(screenEventFromInput(keyOf('F10'), context)).toBeNull()
  })
})

describe('DFC-709 -- FR-071 / MK-10 the F11 key itself', () => {
  it('FR-071 (MUST): the browser default of F11 is stopped', () => {
    expect(commandFromInput(keyOf(SK_15_KEY), context).isBrowserDefaultStopped).toBe(true)
  })

  it('SK-15: F11 plans no document change (the full screen is a screen value, not a document edit)', () => {
    const translated = commandFromInput(keyOf(SK_15_KEY), context)
    expect(translated.action === null || translated.action.kind !== 'changeDocument').toBe(true)
  })

  it('MK-10 (MUST NOT): F11 with Ctrl is not assigned, so the browser keeps it', () => {
    expect(commandFromInput(keyOf(SK_15_KEY, { ctrl: true }), context).isBrowserDefaultStopped).toBe(false)
  })
})
