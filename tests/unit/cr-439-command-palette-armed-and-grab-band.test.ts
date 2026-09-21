// Pins what the spec asks of the Command Palette the DOM surface draws (CR-439).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  CommandItem,
  CommandPalette,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  domScreenSurface,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  FakeElement,
  iconEntry,
  oneByRole,
  paintedGround,
  selfAndDescendants,
  stage,
  styleMap,
  wiringOf,
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

const FR_053_FAINT = '**ポインタが乗っていないあいだは薄く透明に描くこと。**'
const FR_053_ARMED = '**いま構えている入口を、構えていない入口と見分けられるように描くこと（MUST）**'
const FR_053_EN_1 = '見分けさせ方は `FR-029` の 表 T-237 の `EN-1` に従うこと（MUST）'
const FR_053_NOT_PRESSED = '**押されている形にしてはならない（MUST NOT）**'
const IC_53_NOT_BUTTON = '**ボタンではない**'
const SC_6 = '**流れない**（画面に対して位置を保つ）'

const COMMAND_PALETTE = bare(rowOf('T-103', 'U-26').by['確定名（英）'] ?? '')
const THEME: ScreenTheme = { preference: 'light', hue: 214 }
const S_183_LIGHT = bare(rowOf('T-236', 'S-183').by['明るいテーマ'] ?? '').toLowerCase()

const command = (icon: string, isArmed: boolean): CommandItem => ({
  icon,
  isEnabled: true,
  isPressed: false,
  isArmed,
  isChosen: false,
  label: `label of ${icon}`,
})

const PALETTE: CommandPalette = {
  at: { x: 300, y: 120 },
  grabBandHeight: 10,
  minimise: command('IC-99', false),
  isMinimised: false,
  groups: [{ name: 'place', commands: [command('IC-23', true), command('IC-24', false)] }],
  armedText: 'Rectangle armed',
}

function viewWith(palette: CommandPalette | null): ScreenView {
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
    commandPalette: palette,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }
}

function drawn(palette: CommandPalette | null = PALETTE): Stage {
  const built = stage({ 'App Header': 37 })
  domScreenSurface(wiringOf(built, THEME)).showScreenView(viewWith(palette))
  return built
}

function sheetText(built: Stage): string {
  return selfAndDescendants(built.root())
    .filter((one) => one.tagName === 'STYLE')
    .map((one) => one.textContent)
    .join('\n')
}

describe('CR-439 Command Palette -- the clauses still stand', () => {
  it('FR-053, T-109 IC-53 and SC-6 still say what these cases test', () => {
    for (const clause of [FR_053_FAINT, FR_053_ARMED, FR_053_EN_1, FR_053_NOT_PRESSED]) {
      expect(REQUIREMENTS).toContain(clause)
    }
    expect(unbroken(rowOf('T-109', 'IC-53').cells.join(' '))).toContain(IC_53_NOT_BUTTON)
    expect(unbroken(rowOf('T-031', 'SC-6').cells.join(' '))).toContain(SC_6)
    expect(S_183_LIGHT.startsWith('#')).toBe(true)
  })
})

describe('FR-053 -- the armed entrance', () => {
  it('FR-053 / EN-1 -- the armed entrance is filled with S-183, the unarmed one is not', () => {
    const built = drawn()
    const armed = selfAndDescendants(iconEntry(built.root(), 'IC-23')).map((one) => paintedGround(built, one))
    const unarmed = selfAndDescendants(iconEntry(built.root(), 'IC-24')).map((one) => paintedGround(built, one))
    expect(armed).toContain(S_183_LIGHT)
    expect(unarmed).not.toContain(S_183_LIGHT)
  })

  it('FR-053 押されている形にしてはならない（MUST NOT） -- the armed entrance does not say it is pressed', () => {
    const built = drawn()
    const armed = iconEntry(built.root(), 'IC-23')
    expect(armed.getAttribute('aria-pressed')).not.toBe('true')
    expect(armed.getAttribute('data-pressed')).not.toBe('true')
  })

  it('the palette carries the words of what is armed', () => {
    const built = drawn()
    expect(oneByRole(built.root(), COMMAND_PALETTE).textContent).toContain('Rectangle armed')
  })
})

describe('FR-053 -- the floating palette', () => {
  it('FR-053 ポインタが乗っていないあいだは薄く透明に描くこと -- a rule fades the palette while the pointer is off it', () => {
    const built = drawn()
    const palette = oneByRole(built.root(), COMMAND_PALETTE)
    const inline = styleMap(palette).get('opacity')
    const rule = new RegExp(
      `\\[data-role=\\\\?"${COMMAND_PALETTE}\\\\?"\\]:not\\(:hover\\)\\s*\\{[^}]*opacity:\\s*(0?\\.\\d+|0)`,
    )
    const fadedByRule = rule.test(sheetText(built))
    const fadedInline = inline !== undefined && Number.parseFloat(inline) < 1
    expect(fadedByRule || fadedInline).toBe(true)
  })

  it('SC-6 流れない（画面に対して位置を保つ） -- the palette stands at the corner the description gives', () => {
    const built = drawn()
    const style = styleMap(oneByRole(built.root(), COMMAND_PALETTE))
    expect(style.get('left')).toBe(`${PALETTE.at.x}px`)
    expect(style.get('top')).toBe(`${PALETTE.at.y}px`)
    expect(['absolute', 'fixed']).toContain(style.get('position'))
  })

  it('T-109 IC-53 ボタンではない -- the grab band is drawn inside the palette, as tall as asked, and is not a button', () => {
    const built = drawn()
    const palette = oneByRole(built.root(), COMMAND_PALETTE)
    const band = iconEntry(palette, 'IC-53')
    expect(band.tagName).not.toBe('BUTTON')
    expect(band.getAttribute('role')).not.toBe('button')
    expect(styleMap(band).get('height')).toBe(`${PALETTE.grabBandHeight}px`)
  })

  it('no palette in the description, none on the screen', () => {
    const built = drawn(null)
    const drawnPalettes = selfAndDescendants(built.root()).filter(
      (one) => one.getAttribute('data-role') === COMMAND_PALETTE && styleMap(one).get('display') !== 'none',
    )
    expect(drawnPalettes.filter((one: FakeElement) => one.children.length > 0)).toHaveLength(0)
  })
})
