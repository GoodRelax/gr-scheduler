// DFC-3102 / DFC-3103 (spec-only): IN-5a counts a Shift-only character as a single key; IN-6 settles a keyed date late.

import { describe, expect, it } from 'vitest'

import { commandFromInput, type InputContext } from '../../src/adapter/input-command-translator/input-command-translator'
import type { KeyInput } from '../../src/adapter/input-command-translator/input-source'
import type { FieldCommit, PropertiesPanel, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { domScreenSurface } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { contextOf, documentOf, panelOf, REQUIREMENTS, taskItem, taskOf } from '../contract/cr-606-stage'
import { selfAndDescendants, stage, wiringOf, type FakeElement, type FakeEvent, type Stage } from '../fixtures/fake-browser'

const IN_5A_SHIFTED =
  '⭐ `Shift` だけを添えて打つ 1 字（大文字、`+`・`_` など）も単文字キーに数えること（MUST） —— 鍵盤によって `+` は `Shift` を要し、数えないと `SK-16`・`SK-16b` に取られて欄に届かない。'
const IN_6_KEYED_DATE =
  '⭐ 日付・日時の欄に鍵盤で打っているあいだは、打っている途中の値を書かず、`Enter`・欄の外の押下・焦点が欄を離れたときに確定すること（MUST）'
const IN_6_CALENDAR = '宿主のカレンダーで選んだ日付は、選んだときに確定する —— 選んだ値は途中の値ではない。'

const TASK = 20
const DOCUMENT = documentOf({ tasks: [taskOf(TASK, { start: '2026-04-06T08:00:00', finish: '2026-04-10T17:00:00' })] })

describe('DFC-3102 / DFC-3103 -- the clauses these cases press', () => {
  it.each([IN_5A_SHIFTED, IN_6_KEYED_DATE, IN_6_CALENDAR])('01-04 holds %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const shifted = (key: string): KeyInput => ({ kind: 'key', key, modifiers: { ctrl: false, shift: true, alt: false, meta: false } })

const contextWith = (isTextEntryUnsettled: boolean): InputContext => ({
  ...contextOf(DOCUMENT),
  selection: emptySelection(),
  isTextEntryUnsettled,
})

describe(`IN-5a -- ${IN_5A_SHIFTED}`, () => {
  it.each(['+', '_', 'A', 'Z'])('IN-5a (MUST): Shift + "%s" while a text entry is unsettled assigns nothing and is left to the field', (key) => {
    const translated = commandFromInput(shifted(key), contextWith(true))
    expect(translated.action).toBeNull()
    expect(translated.isBrowserDefaultStopped).toBe(false)
  })

  it('control: outside a text entry, Shift + "+" is still SK-16', () => {
    expect(commandFromInput(shifted('+'), contextWith(false)).action).not.toBeNull()
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

// WHY: the shared fake fires no events of its own; a browser runs the document's capturing listeners, then bubbles.
function fire(built: Stage, target: FakeElement, init: Readonly<Record<string, unknown>>): void {
  const event = {
    relatedTarget: null,
    isComposing: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...init,
    target,
    currentTarget: null as FakeElement | null,
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

interface DateBench {
  readonly built: Stage
  readonly entry: FakeElement
  readonly atFocus: string
  key(which: string): void
  typed(value: string): void
  picked(value: string): void
  commit(): FieldCommit | null
}

// WHY: the first date entry of the Task panel, focused the way a browser does it (focus, then focusin).
function dateBench(): DateBench {
  const built = stage({ 'App Header': 37 })
  built.surface = domScreenSurface(wiringOf(built, { preference: 'light', hue: 214 }))
  built.surface.showScreenView(viewOf(panelOf(DOCUMENT, taskItem(TASK))))
  const entry = selfAndDescendants(built.root()).find(
    (one) => one.tagName === 'INPUT' && ['date', 'datetime-local'].includes(one.getAttribute('type') ?? ''),
  )
  if (entry === undefined) throw new Error('the Task panel draws no date entry')
  // WHY: a browser mirrors the type attribute as the type property; the shared fake keeps only the attribute.
  Object.defineProperty(entry, 'type', { get: () => entry.getAttribute('type') ?? '', configurable: true })
  entry.focus()
  fire(built, entry, { type: 'focusin' })
  const atFocus = entry.value
  return {
    built,
    entry,
    atFocus,
    key: (which) => fire(built, entry, { type: 'keydown', key: which, code: which }),
    typed: (value) => {
      entry.value = value
      fire(built, entry, { type: 'input' })
      fire(built, entry, { type: 'change' })
    },
    picked: (value) => {
      entry.value = value
      fire(built, entry, { type: 'input' })
      fire(built, entry, { type: 'change' })
    },
    commit: () => built.surface?.readFieldCommit() ?? null,
  }
}

// WHY: a value the date entry can hold, different from the one it showed at the focus, in the entry's own form.
const movedOf = (atFocus: string): string => atFocus.replace(/^\d{4}-\d{2}-\d{2}/, '2026-05-12')
const halfTypedOf = (atFocus: string): string => atFocus.replace(/^\d{4}/, '0002')

describe(`IN-6 -- ${IN_6_KEYED_DATE}`, () => {
  it('premise: the entry shows the Task date at the focus', () => {
    expect(dateBench().atFocus).toMatch(/^2026-04-/)
  })

  it('IN-6 (MUST): a digit keyed and the half-typed value changed in writes nothing yet', () => {
    const bench = dateBench()
    bench.key('2')
    bench.typed(halfTypedOf(bench.atFocus))
    expect(bench.commit()).toBeNull()
  })

  it('IN-6 (MUST): Enter settles the keyed value as one commit of the final value', () => {
    const bench = dateBench()
    bench.key('2')
    bench.typed(halfTypedOf(bench.atFocus))
    bench.key('2')
    bench.typed(movedOf(bench.atFocus))
    bench.key('Enter')
    const commit = bench.commit()
    expect(commit?.text).toBe(movedOf(bench.atFocus))
    expect(bench.commit(), 'one commit only').toBeNull()
  })

  it('IN-6 (MUST): a press outside the entry settles the keyed value', () => {
    const bench = dateBench()
    bench.key('5')
    bench.typed(movedOf(bench.atFocus))
    fire(bench.built, bench.built.root(), { type: 'pointerdown', button: 0 })
    expect(bench.commit()?.text).toBe(movedOf(bench.atFocus))
  })

  it('IN-6 (MUST): the focus leaving the entry settles the keyed value', () => {
    const bench = dateBench()
    bench.key('5')
    bench.typed(movedOf(bench.atFocus))
    bench.entry.blur()
    fire(bench.built, bench.entry, { type: 'focusout' })
    expect(bench.commit()?.text).toBe(movedOf(bench.atFocus))
  })

  it('IN-6 (MUST NOT): keyed back to the value at the focus, Enter writes nothing', () => {
    const bench = dateBench()
    bench.key('2')
    bench.typed(halfTypedOf(bench.atFocus))
    bench.key('6')
    bench.typed(bench.atFocus)
    bench.key('Enter')
    expect(bench.commit()).toBeNull()
  })
})

describe(`IN-6 -- ${IN_6_CALENDAR}`, () => {
  it('IN-6: a date picked with no key pressed before it commits at once', () => {
    const bench = dateBench()
    bench.picked(movedOf(bench.atFocus))
    expect(bench.commit()?.text).toBe(movedOf(bench.atFocus))
  })
})
