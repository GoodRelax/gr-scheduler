// Contract test: SV-2 and SV-5 against the Search Panel word field under IME composition (DFC-3302).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { searchPanelFromSession } from '../../src/adapter/screen-renderer/search-panel'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  searchPanelPainter,
  SEARCH_WORD_FIELD_ATTRIBUTE,
  typedWordWatch,
  wordFieldElement,
  type TableWindowView,
} from '../../src/framework/dom-screen-surface/search-panel-drawing'
import {
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  EVERY_ROW_SHOWN,
  type ScreenSession,
  type SessionEvent,
  type TableView,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { FakeElement, stage, type FakeEvent, type Stage } from '../fixtures/fake-browser'

type Loose = Record<string, unknown>
const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Loose }
const SCHEDULE = {
  ...TEMPLATE.schedule,
  project: { ...(TEMPLATE.schedule['project'] as Loose), statusDate: null },
} as unknown as Schedule

// WHY: the fake element has no parentElement, which the painter's filter listener climbs; a browser answers the parent node.
Object.defineProperty(FakeElement.prototype, 'parentElement', {
  get(this: FakeElement): FakeElement | null {
    return this.parentNode
  },
})

const CANVAS: ScreenRect = { x: 0, y: 56, width: 1000, height: 600 }
const NO_VIEW: TableView = { visibility: EVERY_ROW_SHOWN, columnFilters: [], sort: null }
const SHOWN: ScreenSession = advanceScreenSession(emptyScreenSession, { type: 'searchEntryPressed' } as unknown as SessionEvent)
  .state

// WHY: "dezain" typed on a Japanese IME ends as these characters; the in-between strings are what the IME puts in the field.
const COMPOSING_STEPS = ['d', 'で', 'でz', 'でza', 'でざ', 'でざi', 'でざい', 'でざいn', 'でざいん'] as const
const COMMITTED = 'デザイン'

interface Wired {
  readonly built: Stage
  readonly layer: FakeElement
  readonly wordFieldIn: () => FakeElement
  readonly typedCount: () => number
  readonly readWord: () => string | null
}

// WHY: events are delivered the way the browser does -- to every listener the unit registered on the layer for that type.
function fire(built: Stage, layer: FakeElement, type: string, target: FakeElement, extra: Record<string, unknown> = {}): void {
  const event = { type, target, currentTarget: layer, defaultPrevented: false, ...extra } as unknown as FakeEvent
  for (const registration of built.world.registrations) {
    if (registration.node === layer && registration.type === type) registration.listener(event)
  }
}

const wordFieldOf = (layer: FakeElement): FakeElement => {
  const field = layer.querySelector(`[${SEARCH_WORD_FIELD_ATTRIBUTE}]`)
  if (field === null) throw new Error('the layer holds no word field')
  return field
}

// WHY: the unit alone -- typedWordWatch on a layer that holds the real word field (wordFieldElement).
function watchedField(): Wired {
  const built = stage()
  const layer = built.host.createElement('div') as unknown as FakeElement
  layer.append(wordFieldElement(built.host, '', 16) as unknown as FakeElement)
  let typed = 0
  const watch = typedWordWatch(layer as unknown as HTMLElement, () => {
    typed += 1
  })
  return { built, layer, wordFieldIn: () => wordFieldOf(layer), typedCount: () => typed, readWord: watch.read }
}

// WHY: the painter -- the field comes from a drawn Search Panel, as in the app.
function paintedField(): Wired & { readonly draw: (word: string) => void } {
  const built = stage()
  const layer = built.host.createElement('div') as unknown as FakeElement
  const viewOf = (word: string): TableWindowView =>
    searchPanelFromSession(SHOWN, { ...emptySearchPanelSession, table: 'tasks', word }, NO_VIEW, SCHEDULE, CANVAS) as unknown as TableWindowView
  let typed = 0
  const painter = searchPanelPainter(built.host, layer as unknown as HTMLElement, () => {
    typed += 1
  })
  const draw = (word: string): void => painter.draw(viewOf(word), true, () => new Map<string, HTMLElement>())
  draw('')
  return { built, layer, wordFieldIn: () => wordFieldOf(layer), typedCount: () => typed, readWord: painter.readWord, draw }
}

function composeAll(wired: Wired, field: FakeElement): void {
  fire(wired.built, wired.layer, 'compositionstart', field)
  for (const text of COMPOSING_STEPS) {
    field.value = text
    fire(wired.built, wired.layer, 'input', field, { isComposing: true })
    // WHY: SV-2 -- the very same node is still the word field, with the composed text in it.
    expect(wired.wordFieldIn()).toBe(field)
    expect(field.value).toBe(text)
  }
}

describe.each([
  ['typedWordWatch on a word field', watchedField],
  ['searchPanelPainter on a drawn Search Panel', paintedField],
] as const)('DFC-3302 SV-2 -- IME composition in the word field (%s)', (_name, build) => {
  it('SV-2: during composition the field stays the same node, keeps the composed text, and no word is sent', () => {
    const wired = build()
    const field = wired.wordFieldIn()
    const before = wired.typedCount()
    composeAll(wired, field)
    expect(wired.typedCount()).toBe(before)
    expect(wired.readWord()).not.toBe(COMPOSING_STEPS[COMPOSING_STEPS.length - 1])
    expect(wired.wordFieldIn()).toBe(field)
  })

  it('SV-2: compositionend sends the committed word once', () => {
    const wired = build()
    const field = wired.wordFieldIn()
    const before = wired.typedCount()
    composeAll(wired, field)
    field.value = COMMITTED
    fire(wired.built, wired.layer, 'compositionend', field)
    expect(wired.typedCount()).toBe(before + 1)
    expect(wired.readWord()).toBe(COMMITTED)
  })

  it('SV-2: an input event flagged isComposing is not sent even when no compositionstart was seen', () => {
    const wired = build()
    const field = wired.wordFieldIn()
    const before = wired.typedCount()
    field.value = 'で'
    fire(wired.built, wired.layer, 'input', field, { isComposing: true })
    expect(wired.typedCount()).toBe(before)
    expect(wired.wordFieldIn()).toBe(field)
    expect(field.value).toBe('で')
  })

  it('SV-5: a plain input event (isComposing=false) still sends the word at once', () => {
    const wired = build()
    const field = wired.wordFieldIn()
    const before = wired.typedCount()
    field.value = 'a'
    fire(wired.built, wired.layer, 'input', field, { isComposing: false })
    expect(wired.typedCount()).toBe(before + 1)
    expect(wired.readWord()).toBe('a')
    field.value = 'ab'
    fire(wired.built, wired.layer, 'input', field, { isComposing: false })
    expect(wired.typedCount()).toBe(before + 2)
    expect(wired.readWord()).toBe('ab')
  })

  it('SV-5: after a composition has ended, plain typing sends the word per character again', () => {
    const wired = build()
    const field = wired.wordFieldIn()
    composeAll(wired, field)
    field.value = COMMITTED
    fire(wired.built, wired.layer, 'compositionend', field)
    const sent = wired.typedCount()
    field.value = `${COMMITTED}x`
    fire(wired.built, wired.layer, 'input', field, { isComposing: false })
    expect(wired.typedCount()).toBe(sent + 1)
    expect(wired.readWord()).toBe(`${COMMITTED}x`)
  })
})

describe('DFC-3302 SV-2 -- the painter keeps the composing field through the app redraw path', () => {
  it('SV-2: nothing redraws the panel while composing, so the field is the same node at every step', () => {
    const wired = paintedField()
    const field = wired.wordFieldIn()
    composeAll(wired, field)
    expect(wired.typedCount()).toBe(0)
    expect(wired.layer.children.length).toBe(1)
  })
})
