// DFC-579: IN-5a routes a key by where it lands (the Dialogue Field), not by IF-9's editing state (T-028, T-065, PND-350).

import { describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  InputSource,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  domInputSource,
  type InputHost,
  type PointerCaptureTarget,
} from '../../src/framework/dom-input-source/dom-input-source'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import type { DialogueField, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  descendants,
  oneByRole,
  surfaceOf,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken, type SpecRow } from './spec-table'

function rowOf(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const IN_5A = unbroken(rowOf('T-028', 'IN-5a').cells.join(' '))
const IN_5A_MUST_NOT =
  '単文字キーと `Delete` / `Backspace` は、文字入力を確定していない間は効かないこと（MUST NOT）'
const IN_5A_COPY_PASTE = '`SK-4` / `SK-5`（`Ctrl+C` / `Ctrl+V`）も同様に効かせず'

const IF_9 = unbroken(rowOf('T-065', 'IF-9').cells.join(' '))
const IF_9_DIALOGUE_LEFT_OUT = '対話欄（`U-44`）は編集の始まりも終わりも知らせない'

const IN_4 = unbroken(rowOf('T-028', 'IN-4').cells.join(' '))

const SK_14_KEY = bare(rowOf('T-036', 'SK-14').by['割当'] ?? '')
const SK_18_KEY = bare(rowOf('T-036', 'SK-18').by['割当'] ?? '')

const DIALOGUE_FIELD_ROLE = bare(rowOf('T-103', 'U-44').by['確定名（英）'] ?? '')

describe('DFC-579 premises: IN-5a, IF-9 and IN-4 still read this way', () => {
  it('IN-5a still shuts single-character keys, Delete/Backspace and Ctrl+C/V while unsettled', () => {
    expect(IN_5A).toContain(IN_5A_MUST_NOT)
    expect(IN_5A).toContain(IN_5A_COPY_PASTE)
  })

  it('IF-9 still leaves the Dialogue Field out of the editing state', () => {
    expect(IF_9).toContain(IF_9_DIALOGUE_LEFT_OUT)
  })

  it('IN-4 is a different rung of Esc, untouched by this file', () => {
    expect(IN_4.length).toBeGreaterThan(0)
  })

  it('SK-14 is P (Command Palette) and SK-18 is F (Fit) -- why f/p are chosen here', () => {
    expect(SK_14_KEY).toBe('P')
    expect(SK_18_KEY).toBe('F')
  })

  it('the Dialogue Field carries U-44\'s confirmed English name as its data-role', () => {
    expect(DIALOGUE_FIELD_ROLE).toBe('Dialogue Field')
  })
})

function dialogueFieldEntry(): FakeElement {
  const built = wire({ preference: 'light', hue: 214 } as ScreenTheme)
  const field = oneByRole(built.root(), DIALOGUE_FIELD_ROLE)
  const entries = descendants(field).filter(
    (one) => one.tagName === 'INPUT' || one.tagName === 'TEXTAREA',
  )
  expect(entries).toHaveLength(1)
  return entries[0] as FakeElement
}

interface Registration {
  readonly type: string
  readonly listener: EventListenerOrEventListenerObject
}

function fakeHost(): { host: InputHost; send(type: string, event: object): void } {
  const registered: Registration[] = []
  const capture: PointerCaptureTarget = {
    setPointerCapture(): void {},
    releasePointerCapture(): void {},
    hasPointerCapture: () => false,
  }
  const host: InputHost = {
    addEventListener(type, listener): void {
      registered.push({ type, listener })
    },
    removeEventListener(type, listener): void {
      const at = registered.findIndex((one) => one.type === type && one.listener === listener)
      if (at >= 0) registered.splice(at, 1)
    },
    innerWidth: 1280,
    innerHeight: 800,
    document: { documentElement: capture },
  }
  return {
    host,
    send(type, event): void {
      for (const one of [...registered].filter((each) => each.type === type)) {
        if (typeof one.listener === 'function') one.listener(event as unknown as Event)
        else one.listener.handleEvent(event as unknown as Event)
      }
    },
  }
}

type FakeKeyEvent = {
  readonly key: string
  readonly code: string
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
  readonly timeStamp: number
  readonly target: FakeElement
  preventDefault(): void
  preventedCount(): number
}

function keyEventAt(target: FakeElement, over: Partial<InputModifiers> & { key: string; code: string }): FakeKeyEvent {
  let prevented = 0
  return {
    key: over.key,
    code: over.code,
    ctrlKey: over.ctrl ?? false,
    shiftKey: over.shift ?? false,
    altKey: over.alt ?? false,
    metaKey: over.meta ?? false,
    timeStamp: 1000,
    target,
    preventDefault(): void {
      prevented += 1
    },
    preventedCount(): number {
      return prevented
    },
  }
}

interface Harness {
  readonly source: InputSource
  readonly heard: HumanInput[]
  send(target: FakeElement, over: Partial<InputModifiers> & { key: string; code: string }): FakeKeyEvent
}

function harness(alwaysStop: boolean): Harness {
  const fake = fakeHost()
  const heard: HumanInput[] = []
  const source = domInputSource(fake.host, () => alwaysStop)
  source.watchInput((input) => heard.push(input))
  return {
    source,
    heard,
    send(target, over): FakeKeyEvent {
      const event = keyEventAt(target, over)
      fake.send('keydown', event)
      return event
    },
  }
}

const heardKeys = (run: Harness): string[] =>
  run.heard.filter((one): one is Extract<HumanInput, { kind: 'key' }> => one.kind === 'key').map((one) => one.key)

const IN_5A_KEYS = [
  { why: 'a bare letter with no shortcut row', key: 'a', code: 'KeyA', mods: {} },
  { why: 'SK-18, bare F', key: 'f', code: 'KeyF', mods: {} },
  { why: 'SK-14, bare P', key: 'p', code: 'KeyP', mods: {} },
  { why: 'Delete', key: 'Delete', code: 'Delete', mods: {} },
  { why: 'Backspace', key: 'Backspace', code: 'Backspace', mods: {} },
  { why: 'SK-4, Ctrl+C', key: 'c', code: 'KeyC', mods: { ctrl: true } },
  { why: 'SK-5, Ctrl+V', key: 'v', code: 'KeyV', mods: { ctrl: true } },
] as const

describe('IN-5a (MUST NOT) -- these keys reach the field, not the watcher, when the field is the target', () => {
  for (const row of IN_5A_KEYS) {
    for (const fieldText of ['', 'already typed text']) {
      it(`${row.why}, field text ${JSON.stringify(fieldText)}: not reported, default not prevented`, () => {
        const entry = dialogueFieldEntry()
        entry.value = fieldText
        entry.focus()
        const run = harness(true)

        const event = run.send(entry, { key: row.key, code: row.code, ...row.mods })

        expect(heardKeys(run)).toEqual([])
        expect(event.preventedCount()).toBe(0)
      })
    }
  }
})

describe("IN-4 -- Esc still reaches the watcher with the Dialogue Field as the target", () => {
  it('Escape is reported, and stopped exactly when the shell answers so', () => {
    const entry = dialogueFieldEntry()
    entry.focus()
    const run = harness(true)

    const event = run.send(entry, { key: 'Escape', code: 'Escape' })

    expect(heardKeys(run)).toEqual(['Esc'])
    expect(event.preventedCount()).toBe(1)
  })
})

describe('control: a target outside the Dialogue Field keeps the ordinary MK-10 answer', () => {
  it('bare P with the row tree as target is reported, and stopped as the shell answers', () => {
    const built = wire({ preference: 'light', hue: 214 } as ScreenTheme)
    const outside = built.root()
    const run = harness(true)

    const event = run.send(outside, { key: 'p', code: 'KeyP' })

    expect(heardKeys(run)).toEqual(['P'])
    expect(event.preventedCount()).toBe(1)
  })
})

describe('IF-9 -- hasUnsettledTextEntry() does not count the focused Dialogue Field', () => {
  const EMPTY_VIEW: ScreenView = {
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: {
      documentTitle: null,
      openedFileName: null,
      fileSavedAt: null,
      fileNeverSavedText: '',
      commands: [],
      language: 'ja',
    },
    rowTitlePanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: { messages: [] } as DialogueField,
    tooltips: [],
  }

  it('stays false with the field focused and a half-typed line inside it', () => {
    const built = wire({ preference: 'light', hue: 214 } as ScreenTheme)
    const surface = surfaceOf(built)
    surface.showScreenView(EMPTY_VIEW)
    const field = oneByRole(built.root(), DIALOGUE_FIELD_ROLE)
    const entry = descendants(field).find(
      (one) => one.tagName === 'INPUT' || one.tagName === 'TEXTAREA',
    ) as FakeElement
    entry.focus()
    entry.value = 'half a thou'

    expect(surface.hasUnsettledTextEntry()).toBe(false)
  })
})
