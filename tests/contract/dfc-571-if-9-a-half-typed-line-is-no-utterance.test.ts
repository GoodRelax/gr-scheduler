// DFC-571: the surface hands back only a settled utterance, never a half-typed line (IF-9, AG-11).

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  DialogueField,
  ScreenFrame,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  descendants,
  oneByRole,
  surfaceOf,
  wire,
  type FakeElement,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const IF_9 = unbroken(rowOf('T-065', 'IF-9').cells.join(' '))
const AG_11 = unbroken(rowOf('T-035', 'AG-11').cells.join(' '))

const IF_9_SETTLED_UTTERANCE = '対話欄で確定した発話を返し、'
const IF_9_EDIT_NOTICES = '文字入力を受ける欄で編集が始まったことと終わったことを、その欄が名乗る行 ID とともに知らせ'
const IF_9_NO_CONTENT =
  '知らせが運ぶのは欄の行 ID だけとし、確定していない中身（打ちかけの文字）を返してはならない（MUST NOT）'
const AG_11_MUST_NOT = '確定していない入力途中の文字を読めてはならない（MUST NOT）'

const DIALOGUE_FIELD_ROLE = bare(rowOf('T-103', 'U-44').by['確定名（英）'] ?? '')

const THEME: ScreenTheme = {
  preference: 'light',
  hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')),
}

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const DIALOGUE: DialogueField = { messages: [] }

const VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: DIALOGUE,
  tooltips: [],
}

const HALF_LINE = 'half a thou'

function raise(built: Stage, node: FakeElement, type: string): void {
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

function drawn(): { built: Stage; surface: ScreenSurface; entry: FakeElement } {
  const built = wire(THEME, { 'App Header': 37 })
  const surface = surfaceOf(built)
  surface.showScreenView(VIEW)
  const field = oneByRole(built.root(), DIALOGUE_FIELD_ROLE)
  const entries = descendants(field).filter(
    (one) => one.tagName === 'INPUT' || one.tagName === 'TEXTAREA',
  )
  expect(entries).toHaveLength(1)
  return { built, surface, entry: entries[0] as FakeElement }
}

function typed(text: string): { surface: ScreenSurface } {
  const { built, surface, entry } = drawn()
  entry.value = text
  raise(built, entry, 'input')
  return { surface }
}

describe('DFC-571 -- IF-9 of 表 T-065 and AG-11 of 表 T-035', () => {
  it('the clauses these cases rest on still stand in IF-9 and AG-11', () => {
    expect(IF_9).toContain(IF_9_SETTLED_UTTERANCE)
    expect(IF_9).toContain(IF_9_EDIT_NOTICES)
    expect(IF_9).toContain(IF_9_NO_CONTENT)
    expect(AG_11).toContain(AG_11_MUST_NOT)
    expect(DIALOGUE_FIELD_ROLE).not.toBe('')
  })

  it('IF-9: 対話欄で確定した発話を返し、 -- a half-typed line hands back no utterance', () => {
    const { surface } = typed(HALF_LINE)

    expect(surface.readDialogueInput()).toBeNull()
  })

  it('AG-11: 確定していない入力途中の文字を読めてはならない（MUST NOT） -- no read carries the half-typed text', () => {
    const { surface } = typed(HALF_LINE)

    const first = surface.readDialogueInput()
    const second = surface.readDialogueInput()

    expect(JSON.stringify(first ?? null)).not.toContain(HALF_LINE)
    expect(JSON.stringify(second ?? null)).not.toContain(HALF_LINE)
  })

  // WHY: the surface still answers a boolean until it sends the begin and end notices (CR-500 wave B).
  it('IF-9: 文字入力を受ける欄で編集が始まったこと -- an empty field has begun no edit, and hands back no utterance', () => {
    const { surface } = drawn()

    expect(surface.hasUnsettledTextEntry()).toBe(false)
    expect(surface.readDialogueInput()).toBeNull()
  })
})
