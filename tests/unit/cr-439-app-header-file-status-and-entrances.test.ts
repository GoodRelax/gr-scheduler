// Pins what the spec asks of the App Header the DOM surface draws (CR-439).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  ScreenPart,
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
  iconEntry,
  oneByRole,
  paintedColour,
  selfAndDescendants,
  stage,
  styleMap,
  wiringOf,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

if (!Object.getOwnPropertyDescriptor(FakeElement.prototype, 'parentElement')) {
  Object.defineProperty(FakeElement.prototype, 'parentElement', {
    get(this: FakeElement): FakeElement | null {
      return this.parentNode
    },
  })
}

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

function rowOf(table: string, id: string) {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const englishName = (id: string): string => bare(rowOf('T-103', id).by['確定名（英）'] ?? '')

const FR_101_NAME_ABOVE = '**名前を時刻の上に置くこと（MUST）**'
const FR_101_NEVER_SAVED = 'まだ 1 度もファイルへ書いていないときは、時刻の代わりにその旨を示すこと（MUST）'
const FR_101_LOCAL = '画面に出す時刻は、読む人のローカル時刻とすること（MUST）'
const FR_101_SIZE = '更新日時の字の大きさは `_assets/tbl-settings.md` の 表 T-206 の `S-210` が定める係数で決めること（MUST）'
const FR_029_FAINT = 'その入口を押しても、いま文書にも画面にも何も変えられないときは、その入口を薄く描くこと（MUST）'
const FR_029_S_149 = '薄さは `_assets/tbl-settings.md` の 表 T-236 の `S-149` の色で示すこと（MUST）'
const FR_029_NOT_DISABLED = '薄く描いた入口を、宿主の意味で無効にしてはならない（MUST NOT）'
const IF_9_ENTRY_OR_FORMAT = '入口と形式は別の表の行であり、一方の上にあるとき他方は `null` である'
const IF_9_U_27 = 'ヘッダの文書名の欄は 表 T-103 の `U-27` を名乗る'
const FR_035 = '作成者が文書名を選んだとき、`GRS` は、その場で編集できるようにすること。'

const APP_HEADER = englishName('U-31')
const OPENED_FILE_NAME = englishName('U-58')
const FILE_SAVED_AT = englishName('U-59')
const DOCUMENT_TITLE = englishName('U-27')

const S_210 = Number.parseFloat(bare(rowOf('T-206', 'S-210').by['既定'] ?? ''))
const THEME: ScreenTheme = { preference: 'light', hue: 214 }
const S_149_LIGHT = bare(rowOf('T-236', 'S-149').by['明るいテーマ'] ?? '')
  .replace('H', String(THEME.hue))
  .replace(/\s+/g, '')
  .toLowerCase()

const SAVED_UTC = '2026-08-30T03:04:05Z'

const command = (icon: string, isEnabled: boolean) => ({
  icon,
  isEnabled,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: `label of ${icon}`,
})

function header(over: Partial<AppHeaderItems> = {}): AppHeaderItems {
  return {
    documentTitle: 'Plan of the year',
    openedFileName: 'plan.grs.json',
    fileSavedAt: SAVED_UTC,
    fileNeverSavedText: 'not written to a file yet',
    commands: [command('IC-5', false), command('IC-6', true)],
    language: 'ja',
    ...over,
  }
}

function viewWith(items: AppHeaderItems): ScreenView {
  return {
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: items,
    rowTitlePanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }
}

function drawn(items: AppHeaderItems = header()): { built: Stage; surface: ScreenSurface } {
  const built = stage({ 'App Header': 37 })
  const surface = domScreenSurface(wiringOf(built, THEME))
  surface.showScreenView(viewWith(items))
  return { built, surface }
}

function partOn(built: Stage, surface: ScreenSurface, node: FakeElement): ScreenPart | null {
  ;(built.host as unknown as { elementFromPoint: (x: number, y: number) => FakeElement }).elementFromPoint =
    () => node
  return surface.readScreenPartAt(1, 1)
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

const pad = (n: number): string => String(n).padStart(2, '0')

describe('CR-439 App Header -- the clauses still stand', () => {
  it('FR-101, FR-029, IF-9 and FR-035 still say what these cases test', () => {
    for (const clause of [
      FR_101_NAME_ABOVE,
      FR_101_NEVER_SAVED,
      FR_101_LOCAL,
      FR_101_SIZE,
      FR_029_FAINT,
      FR_029_S_149,
      FR_029_NOT_DISABLED,
      FR_035,
    ]) {
      expect(REQUIREMENTS).toContain(clause)
    }
    const ifNine = unbroken(rowOf('T-065', 'IF-9').cells.join(' '))
    expect(ifNine).toContain(IF_9_ENTRY_OR_FORMAT)
    expect(ifNine).toContain(IF_9_U_27)
    expect(Number.isFinite(S_210)).toBe(true)
    expect(S_149_LIGHT.startsWith('hsl(')).toBe(true)
  })
})

describe('FR-101 -- the opened file and when it was last written', () => {
  it('FR-101 名前を時刻の上に置くこと（MUST） -- the name comes first, in a column', () => {
    const { built } = drawn()
    const name = oneByRole(built.root(), OPENED_FILE_NAME)
    const time = oneByRole(built.root(), FILE_SAVED_AT)
    const order = selfAndDescendants(built.root())
    expect(order.indexOf(name)).toBeLessThan(order.indexOf(time))
    expect(name.textContent).toContain('plan.grs.json')
    const holder = name.parentNode as FakeElement
    expect(holder.contains(time)).toBe(true)
    const style = styleMap(holder)
    expect(style.get('flex-direction') ?? 'column-by-block').toMatch(/column/)
  })

  it('FR-101 まだ 1 度もファイルへ書いていないときは、時刻の代わりにその旨を示すこと（MUST）', () => {
    const { built } = drawn(header({ fileSavedAt: null }))
    const header_ = oneByRole(built.root(), APP_HEADER)
    expect(header_.textContent).toContain('not written to a file yet')
  })

  it('FR-101 画面に出す時刻は、読む人のローカル時刻とすること（MUST） -- and never the UTC spelling', () => {
    const { built } = drawn()
    const shown = oneByRole(built.root(), FILE_SAVED_AT).textContent
    const local = new Date(SAVED_UTC)
    expect(shown).not.toContain(SAVED_UTC)
    expect(shown).not.toContain('Z')
    expect(shown).toContain(`${pad(local.getMinutes())}`)
    expect(shown).toContain(`${pad(local.getSeconds())}`)
    expect(shown).toMatch(new RegExp(`(^|\\D)0?${local.getHours()}\\D`))
  })

  it('FR-101 S-210 が定める係数で決めること -- the file status is sized by the coefficient, not in px', () => {
    const { built } = drawn()
    const time = oneByRole(built.root(), FILE_SAVED_AT)
    let at: FakeElement | null = time
    let size: string | undefined
    while (at !== null && size === undefined) {
      size = styleMap(at).get('font-size')
      at = at.parentNode
    }
    expect(size).toBe(`${S_210}em`)
  })
})

describe('FR-029 -- an entrance that can change nothing is drawn faint, not disabled', () => {
  it('FR-029 薄さは S-149 の色で示すこと -- the faint entrance is painted S-149, the live one is not', () => {
    const { built } = drawn()
    const faint = iconEntry(built.root(), 'IC-5')
    const live = iconEntry(built.root(), 'IC-6')
    expect(paintedColour(built, faint)).toBe(S_149_LIGHT)
    expect(paintedColour(built, live)).not.toBe(S_149_LIGHT)
  })

  it('FR-029 薄く描いた入口を、宿主の意味で無効にしてはならない（MUST NOT） -- the press still arrives', () => {
    const { built, surface } = drawn()
    const faint = iconEntry(built.root(), 'IC-5')
    expect(faint.hasAttribute('disabled')).toBe(false)
    expect(faint.disabled).toBe(false)
    const part = partOn(built, surface, faint)
    expect(part?.entry).toBe('IC-5')
  })

  it('IF-9 入口と形式は別の表の行であり -- a header entrance answers its entry and no format', () => {
    const { built, surface } = drawn()
    const part = partOn(built, surface, iconEntry(built.root(), 'IC-6'))
    expect(part?.part).toBe(APP_HEADER)
    expect(part?.entry).toBe('IC-6')
    expect(part?.format ?? null).toBeNull()
  })
})

describe('FR-035 / IF-9 -- the Document Title (U-27) is edited in place', () => {
  it('the Document Title shows the title the description carries', () => {
    const { built } = drawn()
    expect(oneByRole(built.root(), DOCUMENT_TITLE).textContent).toContain('Plan of the year')
  })

  // WHY: the field stands only after F2 asks for it, so the case opens it the way the shell does.
  it('IF-9 ヘッダの文書名の欄は U-27 を名乗る -- once opened, a field named U-27 stands and its settled value names U-27', () => {
    const built = stage({ 'App Header': 37 })
    let focusField: ((row: string) => boolean) | undefined
    const surface = domScreenSurface({
      ...wiringOf(built, THEME),
      holdFocusPropertyField: (focus) => {
        focusField = focus
      },
    })
    surface.showScreenView(viewWith(header()))
    expect(focusField, 'the surface handed no field-focus function to its wiring').toBeDefined()
    const header_ = (): FakeElement => oneByRole(built.root(), APP_HEADER)
    const titleField = (): FakeElement | undefined =>
      descendants(header_()).find(
        (one) => (one.tagName === 'INPUT' || one.tagName === 'TEXTAREA') && one.getAttribute('data-field-row') === 'U-27',
      )
    expect(titleField(), 'no title field before it is asked for').toBeUndefined()
    focusField?.('U-27')
    surface.showScreenView(viewWith(header()))
    focusField?.('U-27')
    const entry = titleField()
    expect(entry, 'no field named U-27 stood in the header').toBeDefined()
    const field = entry as FakeElement
    field.focus()
    raise(built, field, 'focusin')
    field.value = 'Renamed plan'
    raise(built, field, 'input')
    raise(built, field, 'keydown', { key: 'Enter' })
    const commit = surface.readFieldCommit()
    expect(commit?.row).toBe('U-27')
    expect(commit?.text).toBe('Renamed plan')
  })
})
