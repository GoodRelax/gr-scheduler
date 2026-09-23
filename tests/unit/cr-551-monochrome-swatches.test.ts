// CR-551 DFC-910 / E-48: with monochrome on (S-74), the colour field paints its swatches as the drawing paints the colour (CV-9, CV-7).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import {
  byRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
import { pointerOf, rowDocument, taskOf, SCREEN } from './cr-541-stage'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  colourNames: { spelling: string; text: { ja: string } }[]
}

const rowIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const CV_9_MONO =
  '`FR-041` のモノクロ（`_assets/tbl-settings.md` の 表 T-203 の `S-74`）が入っているあいだは、名の見本と側ごとの見本を、同じ色を `CV-7` で無彩色にした値で塗ること（MUST）'
const CV_9_KEPT = '透明の市松と未定義の破線はそのまま'
const CV_7 = '`FR-041` のモノクロは、`CV-6` で決まった値を無彩色にして描くこと（MUST）'

// see S-74
const MONO_KEY = bare(rowIn('T-203', 'S-74').by['キー'] ?? '')
// see T-294
const TRANSPARENT = bare(rowIn('T-294', 'S-324').cells[1] ?? '')
const NAMED = specTable('T-294').rows.map((row) => bare(row.cells[1] ?? '')).filter((one) => one !== TRANSPARENT)
const RED = bare(rowIn('T-294', 'S-318').cells[1] ?? '')
const colourWord = (spelling: string): string => WORDS.colourNames.find((one) => one.spelling === spelling)?.text.ja ?? ''
// see T-016
const LINE_ROW = specTable('T-016').rows.find(
  (row) => bare(row.by['対象'] ?? '') === 'Task' && (row.by['列（`GRS JSON`）'] ?? '').includes('`strokeColor`'),
)?.id ?? ''
const PROPERTIES_PANEL = bare(rowIn('T-103', 'U-25').by['確定名（英）'] ?? '')

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

type Side = 'light' | 'dark'

interface Bench {
  readonly loop: FrameLoop
  readonly built: Stage
  doubleClick(x: number, y: number): void
  press(part: string, entry: string): void
  view(): ScreenView
  svg(): string
}

function bench(document: Record<string, unknown>, side: Side): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const built = wire({ preference: side, hue: 214 }, { 'App Header': SCREEN.appHeaderHeight })
  const drawn = surfaceOf(built)
  const views: ScreenView[] = []
  const svgs: string[] = []
  let aimed: ScreenPart | null = null
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
      drawn.showScreenView(view)
    },
    readDialogueInput: () => drawn.readDialogueInput(),
    readFieldCommit: () => drawn.readFieldCommit(),
    hasUnsettledTextEntry: () => drawn.hasUnsettledTextEntry(),
    readFieldEditNotices: () => (drawn as unknown as { readFieldEditNotices?: () => unknown[] }).readFieldEditNotices?.() ?? [],
    readScreenPartAt: () => aimed,
  } as unknown as ScreenSurface
  const loop = frameLoop({ showSvg: (svg: string) => svgs.push(svg) } as never, document as never, SCREEN, { surface, language: 'ja' })
  drain()
  const send = (input: Parameters<FrameLoop['receiveInput']>[0]): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    built,
    doubleClick: (x, y) => {
      send(pointerOf('down', x, y))
      send(pointerOf('up', x, y))
      send({ ...pointerOf('down', x, y), clickCount: 2 } as never)
      send({ ...pointerOf('up', x, y), clickCount: 2 } as never)
    },
    press: (part, entry) => {
      aimed = { part, entry, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as unknown as ScreenPart
      send(pointerOf('down', 80, 120))
      send(pointerOf('up', 80, 120))
      aimed = null
    },
    view: () => views[views.length - 1] as ScreenView,
    svg: () => svgs[svgs.length - 1] ?? '',
  }
}

// WHY: one task per palette name, each drawn in that name for its fill and its line, so the drawing itself
// says what each name is painted as; task 1 carries the colour the field shows.
function documentOf(side: Side, mono: boolean, first: Record<string, unknown> = {}) {
  const rows = NAMED.map((_name, index) => ({ id: `g${index + 1}`, parentId: null }))
  const document = rowDocument(rows, { progressMarkerVisible: false, themePreference: side, [MONO_KEY]: mono })
  document.schedule.tasks = NAMED.map((_name, index) =>
    taskOf(index + 1, { name: `T${index + 1}`, start: '2026-04-06T08:00:00', finish: '2026-04-30T17:00:00' }),
  )
  document.schedule.taskVisuals = NAMED.map((name, index) => ({
    taskUid: index + 1,
    shapeKind: null,
    milestoneGlyph: null,
    fillColor: name,
    strokeColor: name,
    lineWeight: null,
    ...(index === 0 ? first : {}),
  }))
  return document
}

function panelOnTask(document: Record<string, unknown>, side: Side): Bench {
  const built = bench(document, side)
  const placement = built.loop.current()?.layout.placements.find((one) => one.taskUid === 1)
  if (placement === undefined) throw new Error('the task is not drawn')
  built.doubleClick(placement.x + placement.width / 2, placement.y + placement.height / 2)
  if (built.view().propertiesPanel === null) throw new Error('MK-13 did not put the property panel up')
  return built
}

// WHY: colours are compared as numbers, whatever notation each side writes them in.
function rgbOf(written: string): readonly [number, number, number] | null {
  const text = written.trim().toLowerCase()
  const hex = /^#([0-9a-f]{6})$/.exec(text)
  if (hex !== null) {
    const value = parseInt(hex[1] as string, 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(text)
  if (rgb !== null) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  const hsl = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(text)
  if (hsl !== null) {
    const h = Number(hsl[1]) / 360
    const s = Number(hsl[2]) / 100
    const l = Number(hsl[3]) / 100
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const channel = (t0: number): number => {
      const t = t0 < 0 ? t0 + 1 : t0 > 1 ? t0 - 1 : t0
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255]
  }
  return null
}

const sameColour = (a: string, b: string): boolean => {
  const x = rgbOf(a)
  const y = rgbOf(b)
  return x !== null && y !== null && x.every((one, index) => Math.abs(one - (y[index] as number)) <= 1.5)
}

// see CV-6
function drawnPaint(built: Bench, uid: number, name: 'fill' | 'stroke'): string {
  const plan = new RegExp(`<[a-z]+\\b[^>]*data-figure="task-${uid}-plan"[^>]*>`).exec(built.svg())?.[0] ?? ''
  return new RegExp(`\\b${name}="([^"]+)"`).exec(plan)?.[1] ?? ''
}

const panelNodes = (built: Bench): FakeElement[] => {
  const panel = byRole(built.built.root(), PROPERTIES_PANEL)[0]
  if (panel === undefined) return []
  return [...new Set(selfAndDescendants(panel).filter((one) => one.getAttribute('data-field-row') === LINE_ROW).flatMap((one) => selfAndDescendants(one)))]
}
// see T-016, PR-12
const palettes = (built: Bench): FakeElement[] => panelNodes(built).filter((one) => /grid/.test(styleMap(one).get('display') ?? ''))
const groundOf = (node: FakeElement): string => styleMap(node).get('background-color') ?? styleMap(node).get('background') ?? ''
const sideSwatches = (built: Bench): FakeElement[] => panelNodes(built).filter((one) => one.getAttribute('data-colour-swatch') !== null)
const sidesText = (built: Bench): string =>
  panelNodes(built)
    .filter((one) => one.getAttribute('data-colour-sides') !== null)
    .map((one) => selfAndDescendants(one).map((node) => (node.children.length === 0 ? node.textContent ?? '' : '')).join(''))
    .join(' | ')

function namesPaintedAsDrawn(built: Bench): string[] {
  const [line, fill] = palettes(built)
  if (line === undefined || fill === undefined) throw new Error('the line colour field lays out no two palettes')
  const wrong: string[] = []
  NAMED.forEach((name, index) => {
    for (const [grid, paint] of [
      [line, 'stroke'],
      [fill, 'fill'],
    ] as const) {
      const swatch = grid.children.find((one) => one.getAttribute('data-colour-choice') === name)
      const drawn = drawnPaint(built, index + 1, paint)
      if (swatch === undefined || !sameColour(groundOf(swatch), drawn)) {
        wrong.push(`${paint} ${name}: swatch ${swatch === undefined ? '(none)' : groundOf(swatch)} vs drawn ${drawn}`)
      }
    }
  })
  return wrong
}

const isGrey = (written: string): boolean => {
  const rgb = rgbOf(written)
  return rgb !== null && Math.max(...rgb) - Math.min(...rgb) <= 1.5
}

describe('CV-9 E-48 -- the colour field in monochrome', () => {
  it('CV-9 / CV-7 still say: 名の見本と側ごとの見本を、同じ色を CV-7 で無彩色にした値で塗る / 透明の市松と未定義の破線はそのまま', () => {
    expect(REQUIREMENTS).toContain(CV_9_MONO)
    expect(REQUIREMENTS).toContain(CV_9_KEPT)
    expect(REQUIREMENTS).toContain(CV_7)
    expect(MONO_KEY).toBe('themeMonochrome')
  })

  it('CV-9 / CV-7: with S-74 on, every name swatch is painted as the drawing paints that name in monochrome', () => {
    // see CV-9, CV-7, S-74
    const built = panelOnTask(documentOf('light', true), 'light')
    expect(isGrey(drawnPaint(built, NAMED.indexOf(RED) + 1, 'fill')), 'premise: the drawing is monochrome').toBe(true)
    expect(namesPaintedAsDrawn(built)).toEqual([])
  })

  it('CV-9 / CV-7: with S-74 on, both side swatches are the drawing monochrome value of that side, and the words stay the stored name', () => {
    // see CV-9, CV-7, S-74
    const light = panelOnTask(documentOf('light', true), 'light')
    const dark = bench(documentOf('dark', true), 'dark')
    const [lightSide, darkSide] = sideSwatches(light).slice(2, 4)
    expect(sameColour(groundOf(lightSide as FakeElement), drawnPaint(light, 1, 'fill')), 'the light side').toBe(true)
    expect(sameColour(groundOf(darkSide as FakeElement), drawnPaint(dark, 1, 'fill')), 'the dark side').toBe(true)
    expect(sidesText(light)).toContain(colourWord(NAMED[0] as string))
  })

  it('CV-9: with S-74 on, a custom colour keeps its uppercase hex in the words while its swatch turns grey', () => {
    // see CV-9, CV-7
    const built = panelOnTask(documentOf('light', true, { fillColor: '#c0504d/' }), 'light')
    expect(sidesText(built)).toContain('#C0504D')
    const fillLight = sideSwatches(built)[2] as FakeElement
    expect(isGrey(groundOf(fillLight)), groundOf(fillLight)).toBe(true)
    expect(sameColour(groundOf(fillLight), drawnPaint(built, 1, 'fill'))).toBe(true)
  })

  it('CV-9: turning S-74 off (IC-100) restores the colours the drawing paints', () => {
    // see CV-9, S-74, IC-100
    const built = panelOnTask(documentOf('light', true), 'light')
    built.press('App Header', 'IC-100')
    expect(built.loop.document().documentSettings[MONO_KEY as 'themeMonochrome'], 'premise: IC-100 turned S-74 off').toBe(false)
    expect(isGrey(drawnPaint(built, NAMED.indexOf(RED) + 1, 'fill')), 'premise: the drawing is in colour').toBe(false)
    expect(namesPaintedAsDrawn(built)).toEqual([])
  })

  it('CV-9: 透明の市松と未定義の破線はそのまま -- the same with S-74 on as off', () => {
    // see CV-9
    const style = (mono: boolean): string[] => {
      const built = panelOnTask(documentOf('light', mono, { fillColor: '#c0504d/', strokeColor: TRANSPARENT }), 'light')
      return sideSwatches(built).map((one) => {
        const held = styleMap(one)
        return `${held.get('background') ?? ''}|${held.get('border') ?? ''}`
      })
    }
    const off = style(false)
    const on = style(true)
    const checker = (all: string[]): string[] => all.filter((one) => /gradient\(/.test(one))
    const dashed = (all: string[]): string[] => all.filter((one) => /dashed/.test(one))
    expect(checker(off).length, 'premise: the transparent line shows a checkerboard').toBeGreaterThan(0)
    expect(dashed(off).length, 'premise: the unset dark side shows a dashed edge').toBeGreaterThan(0)
    expect(checker(on)).toEqual(checker(off))
    expect(dashed(on)).toEqual(dashed(off))
  })
})
