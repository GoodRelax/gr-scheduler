// DFC-3100 (spec-only): AS-5 -- the assignee filter is a text entry; while it holds the focus, its keys are its own.

import { describe, expect, it } from 'vitest'

import { commandFromInput, type InputContext } from '../../src/adapter/input-command-translator/input-command-translator'
import type { KeyInput } from '../../src/adapter/input-command-translator/input-source'
import type { PropertiesPanel, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptySelection, selectionWith } from '../../src/entity/document-model/selection/selection'
import { domScreenSurface } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { contextOf, documentOf, panelOf, personOf, REQUIREMENTS, seatOf, taskItem, taskOf } from '../contract/cr-606-stage'
import { selfAndDescendants, stage, wiringOf, type FakeElement, type FakeEvent, type Stage } from '../fixtures/fake-browser'

const AS_5_FILTER_TAKES_ITS_KEYS =
  '⭐ 絞り込みの欄は文字入力の欄であり、焦点があるあいだに打ったキーは欄が取ること（MUST） —— 単独のキーの割当（表 T-036）も `Backspace` の削除（`SK-3`）も働かない。'

const ASSIGNEE_ROW = 'PR-16'
const TASK = 20
const ALPHA = { uid: 1, name: 'Alpha' }
const BRAVO = { uid: 2, name: 'Bravo' }

const DOCUMENT = documentOf({
  tasks: [taskOf(TASK)],
  resources: [ALPHA, BRAVO].map((one) => personOf(one.uid, one.name)),
  assignments: [seatOf(30, TASK, ALPHA.uid)],
})

describe('DFC-3100 -- the clause these cases press', () => {
  it('01-04 T-225 AS-5 holds the filter clause word for word', () => {
    expect(REQUIREMENTS).toContain(AS_5_FILTER_TAKES_ITS_KEYS)
  })
})

const viewOf = (panel: PropertiesPanel): ScreenView =>
  ({
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: { documentTitle: null, openedFileName: null, fileSavedAt: null, fileNeverSavedText: '', commands: [], language: 'ja' },
    taskGroupPanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: panel,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }) as unknown as ScreenView

// WHY: the shared fake has no dispatchEvent and fires no focus events; a browser bubbles from the target up, after the
// capturing listeners of the document.
function fire(built: Stage, target: FakeElement, init: Readonly<Record<string, unknown>>): void {
  const event = {
    ...init,
    target,
    currentTarget: null as FakeElement | null,
    relatedTarget: null,
    defaultPrevented: false,
    preventDefault: (): void => undefined,
    stopPropagation: (): void => undefined,
    stopImmediatePropagation: (): void => undefined,
  } as unknown as FakeEvent
  for (const one of [...(built.hostListeners ?? [])]) if (one.type === event.type) one.listener(event)
  for (let at: FakeElement | null = target; at !== null; at = at.parentNode) {
    const node = at
    ;(event as { currentTarget: FakeElement | null }).currentTarget = node
    for (const one of [...built.world.registrations]) if (one.node === node && one.type === event.type) one.listener(event)
  }
}

// WHY: each element is given its own dispatchEvent, so no prototype changes for any other file.
function armed(built: Stage): void {
  for (const node of selfAndDescendants(built.root())) {
    const record = node as unknown as Record<string, unknown>
    if (typeof record['dispatchEvent'] === 'function') continue
    Object.defineProperty(node, 'dispatchEvent', { value: (event: Event): boolean => (fire(built, node, { type: event.type }), true), configurable: true })
    Object.defineProperty(node, 'parentElement', { get: () => node.parentNode, configurable: true })
  }
}

interface Opened {
  readonly built: Stage
  readonly filter: FakeElement
}

function openedFilter(): Opened {
  const built = stage({ 'App Header': 37 })
  built.surface = domScreenSurface(wiringOf(built, { preference: 'light', hue: 214 }))
  built.surface.showScreenView(viewOf(panelOf(DOCUMENT, taskItem(TASK))))
  armed(built)
  const field = selfAndDescendants(built.root()).find((one) => one.getAttribute('data-assignee-field') === ASSIGNEE_ROW)
  if (field === undefined) throw new Error('no data-assignee-field is drawn')
  const listOf = (): FakeElement | undefined => selfAndDescendants(field).find((one) => one.hasAttribute('data-assignee-list'))
  if (listOf() === undefined) fire(built, field.children.find((one) => one.tagName === 'BUTTON') as FakeElement, { type: 'click' })
  armed(built)
  const filter = selfAndDescendants(listOf() as FakeElement).find((one) => one.hasAttribute('data-assignee-filter'))
  if (filter === undefined) throw new Error('the open list holds no filter')
  built.surface.readFieldEditNotices?.()
  return { built, filter }
}

function focused(opened: Opened): void {
  opened.filter.focus()
  fire(opened.built, opened.filter, { type: 'focusin' })
}

describe(`IF-9 -- focusing the filter begins a field edit (fieldEditBegan)`, () => {
  it('AS-5 (MUST): the focus entering the filter raises a began notice naming PR-16', () => {
    const opened = openedFilter()
    focused(opened)
    expect(opened.built.surface?.readFieldEditNotices?.()).toContainEqual({ kind: 'began', row: ASSIGNEE_ROW })
  })

  it('AS-5: typing in the filter writes nothing to the document on its own', () => {
    const opened = openedFilter()
    focused(opened)
    for (const text of ['f', 'fn', 'fnp', 'fnpy', 'fnp']) {
      opened.filter.value = text
      fire(opened.built, opened.filter, { type: 'input' })
    }
    expect(opened.built.surface?.readFieldCommit()).toBeNull()
  })
})

const keyOf = (key: string): KeyInput => ({ kind: 'key', key, modifiers: { ctrl: false, shift: false, alt: false, meta: false } })

// WHY: a selected Task stands behind the panel, so SK-3 would have something to delete if the key reached it.
const contextWith = (isTextEntryUnsettled: boolean): InputContext => ({
  ...contextOf(DOCUMENT),
  selection: selectionWith(emptySelection(), taskItem(TASK)),
  isTextEntryUnsettled,
})

describe(`T-225 AS-5 -- ${AS_5_FILTER_TAKES_ITS_KEYS}`, () => {
  it.each(['f', 'F', 'n', 'N', 'p', 'P', 'y', 'Y', 'Backspace', 'Delete'])('AS-5 (MUST): "%s" while the filter is being edited assigns nothing and is left to the field', (key) => {
    const translated = commandFromInput(keyOf(key), contextWith(true))
    expect(translated.action).toBeNull()
    expect(translated.isBrowserDefaultStopped).toBe(false)
  })

  it('control: outside a text entry, "F" is SK-18 and Backspace is SK-3 on the selected Task', () => {
    expect(commandFromInput(keyOf('F'), contextWith(false)).action).not.toBeNull()
    expect(commandFromInput(keyOf('Backspace'), contextWith(false)).action).not.toBeNull()
  })
})
