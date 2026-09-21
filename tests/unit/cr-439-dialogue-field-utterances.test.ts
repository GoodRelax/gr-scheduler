// Pins what the spec asks of the Dialogue Field the DOM surface draws (CR-439).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  DialogueField,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  domScreenSurface,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  descendants,
  FakeElement,
  oneByRole,
  stage,
  styleMap,
  wiringOf,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

function rowOf(table: string, id: string) {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const rowText = (table: string, id: string): string => unbroken(rowOf(table, id).cells.join(' '))

const FR_066_SHOW = '`Agent API` が有効であるあいだ、`GRS` は、画面上で AI と言葉をやり取りする欄を表示すること。'
const FR_066_HIDDEN = '**閲覧者がその欄を非表示にしているあいだは表示しないこと（MUST）**'
const IF_9_UTTERANCE = '対話欄で確定した発話を返し、'
const IF_9_NO_EDIT_NOTICE = '対話欄（`U-44`）は編集の始まりも終わりも知らせない'
const AG_11_MUST_NOT = '**確定していない入力途中の文字を読めてはならない（MUST NOT）**'

const DIALOGUE_FIELD = bare(rowOf('T-103', 'U-44').by['確定名（英）'] ?? '')
const SK_19_KEY = bare(rowOf('T-036', 'SK-19').by['割当'] ?? '')

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

const WITH_MESSAGES: DialogueField = {
  messages: [
    { sequence: 1, author: 'Ann', text: 'Move the review to Friday', settledAt: '2026-08-30T03:04:05Z' },
    { sequence: 2, author: 'Agent', text: 'Moved it', settledAt: '2026-08-30T03:04:09Z' },
  ],
}

function viewWith(dialogueField: DialogueField | null): ScreenView {
  return {
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
    dialogueField,
    tooltips: [],
  }
}

function drawn(dialogueField: DialogueField | null): { built: Stage; surface: ScreenSurface } {
  const built = stage({ 'App Header': 37 })
  const surface = domScreenSurface(wiringOf(built, THEME))
  surface.showScreenView(viewWith(dialogueField))
  return { built, surface }
}

function raise(built: Stage, node: FakeElement, type: string, extra: Record<string, unknown> = {}): void {
  const event = {
    type,
    key: '',
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: null,
    defaultPrevented: false,
    preventDefault(): void {
      ;(this as { defaultPrevented: boolean }).defaultPrevented = true
    },
    stopPropagation(): void {},
    ...extra,
  } as unknown as FakeEvent
  let at: FakeElement | null = node
  while (at !== null) {
    for (const one of [...built.world.registrations]) {
      if (one.node === at && one.type === type) {
        ;(event as { currentTarget: FakeElement | null }).currentTarget = at
        one.listener(event)
      }
    }
    at = at.parentNode
  }
}

function entryOf(built: Stage): FakeElement {
  const field = oneByRole(built.root(), DIALOGUE_FIELD)
  const entries = descendants(field).filter((one) => one.tagName === 'INPUT' || one.tagName === 'TEXTAREA')
  expect(entries).toHaveLength(1)
  return entries[0] as FakeElement
}

function type(built: Stage, entry: FakeElement, text: string): void {
  entry.focus()
  raise(built, entry, 'focusin')
  entry.value = text
  raise(built, entry, 'input')
}

describe('CR-439 Dialogue Field -- the clauses still stand', () => {
  it('FR-066, IF-9 and AG-11 still say what these cases test', () => {
    expect(REQUIREMENTS).toContain(FR_066_SHOW)
    expect(REQUIREMENTS).toContain(FR_066_HIDDEN)
    expect(rowText('T-065', 'IF-9')).toContain(IF_9_UTTERANCE)
    expect(rowText('T-065', 'IF-9')).toContain(IF_9_NO_EDIT_NOTICE)
    expect(rowText('T-035', 'AG-11')).toContain(AG_11_MUST_NOT)
    expect(DIALOGUE_FIELD).toBe('Dialogue Field')
  })
})

describe('FR-066 -- the field is shown, and hidden when the reader hides it', () => {
  it('FR-066 画面上で AI と言葉をやり取りする欄を表示すること -- every message is drawn with its author', () => {
    const { built } = drawn(WITH_MESSAGES)
    const field = oneByRole(built.root(), DIALOGUE_FIELD)
    expect(styleMap(field).get('display')).not.toBe('none')
    expect(field.textContent).toContain('Move the review to Friday')
    expect(field.textContent).toContain('Moved it')
    expect(field.textContent).toContain('Ann')
    const order = field.textContent
    expect(order.indexOf('Move the review to Friday')).toBeLessThan(order.indexOf('Moved it'))
  })

  it('FR-066 閲覧者がその欄を非表示にしているあいだは表示しないこと -- no field in the description, nothing shown', () => {
    const { built } = drawn(null)
    const field = oneByRole(built.root(), DIALOGUE_FIELD)
    expect(styleMap(field).get('display')).toBe('none')
  })
})

describe('IF-9 / AG-11 -- what the field hands back', () => {
  it('AG-11 確定していない入力途中の文字を読めてはならない -- a half-typed line reads back as nothing', () => {
    const { built, surface } = drawn(WITH_MESSAGES)
    type(built, entryOf(built), 'half a thou')
    expect(surface.readDialogueInput()).toBeNull()
  })

  it('IF-9 対話欄で確定した発話を返し -- a settled line comes back with its author and the moment it was settled', () => {
    const { built, surface } = drawn(WITH_MESSAGES)
    built.author = 'Watcher'
    const entry = entryOf(built)
    type(built, entry, 'Shift the launch by a week')
    raise(built, entry, 'keydown', { key: SK_19_KEY })
    const said = surface.readDialogueInput()
    expect(said?.text).toBe('Shift the launch by a week')
    expect(said?.isSettled).toBe(true)
    expect(said?.author).toBe('Watcher')
    expect(Math.abs(Date.parse(said?.settledAt ?? '') - built.clockMs)).toBeLessThan(1000)
    // WHY: no assertion that a read takes the utterance; the spec does not say.
  })

  it('IF-9 対話欄は編集の始まりも終わりも知らせない -- typing in the field raises no unsettled-text state', () => {
    const { built, surface } = drawn(WITH_MESSAGES)
    type(built, entryOf(built), 'half a thou')
    expect(surface.hasUnsettledTextEntry()).toBe(false)
  })
})
