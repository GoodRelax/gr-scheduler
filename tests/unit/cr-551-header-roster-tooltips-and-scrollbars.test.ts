// CR-551 items 6-9: the monochrome entrance in the App Header (IC-100), the roster's close entrance (RR-6),

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenPart, ScreenSurface, ScreenView, Tooltip } from '../../src/adapter/screen-renderer/screen-renderer'
import type { FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { keepTooltipsInside, tooltipElement } from '../../src/framework/dom-screen-surface/tooltips-drawing'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { byRole, selfAndDescendants, styleMap, surfaceOf, wire, type FakeElement, type Stage } from '../fixtures/fake-browser'
import { pointerOf, rowDocument, SCREEN } from './cr-541-stage'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const GLOSSARY = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8'))

const rowIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}
const numberOf = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

// see S-339
const S_339 = numberOf(rowIn('T-206', 'S-339').by['既定'] ?? '')

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

interface Bench {
  readonly loop: FrameLoop
  readonly built: Stage
  press(part: string, entry: string): void
  view(): ScreenView
  svg(): string
}

const partOn = (part: string, entry: string | null): ScreenPart =>
  ({ part, entry, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null }) as unknown as ScreenPart

function bench(document: Record<string, unknown>): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': SCREEN.appHeaderHeight })
  const drawn = surfaceOf(built)
  const views: ScreenView[] = []
  const svgs: string[] = []
  let aimed: ScreenPart | null = null
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
      drawn.showScreenView(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readFieldEditNotices: () => [],
    readScreenPartAt: () => aimed,
  } as unknown as ScreenSurface
  const loop = frameLoop({ showSvg: (svg: string) => svgs.push(svg) } as never, document as never, SCREEN, {
    surface,
    language: 'ja',
  })
  drain()
  return {
    loop,
    built,
    press: (part, entry) => {
      aimed = partOn(part, entry)
      loop.receiveInput(pointerOf('down', 80, 120))
      drain()
      loop.receiveInput(pointerOf('up', 80, 120))
      drain()
      aimed = null
    },
    view: () => views[views.length - 1] as ScreenView,
    svg: () => svgs[svgs.length - 1] ?? '',
  }
}

const oneRowDocument = (settings: Record<string, unknown> = {}) => rowDocument([{ id: 'g1', parentId: null }], settings)

const FR_041_PLACE =
  'モノクロを選ぶ入口を `App Header` の、明暗テーマの入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-16`）の左に置くこと（MUST）'
const IC_100_LEFT_OF_IC_16 = '本行は明暗テーマの入口（`IC-16`）の左に並べる（`FR-041`）'

describe('IC-100 -- the monochrome entrance', () => {
  it('FR-041 / IC-100 still say: App Header の、明暗テーマの入口（IC-16）の左に置く', () => {
    expect(REQUIREMENTS).toContain(FR_041_PLACE)
    expect(GLOSSARY).toContain(IC_100_LEFT_OF_IC_16)
    expect(bare(rowIn('T-109', 'IC-100').cells[0] ?? '')).toBe('App Header')
  })

  it('IC-100: App Header の IC-16 の左 -- the header lists IC-100 immediately before IC-16', () => {
    // see IC-100, FR-041
    const icons = bench(oneRowDocument()).view().appHeaderItems.commands.map((one) => one.icon)
    const at = icons.indexOf('IC-100')
    expect(at, `the header entrances: ${icons.join(' ')}`).toBeGreaterThanOrEqual(0)
    expect(icons[at + 1]).toBe('IC-16')
  })

  it('IC-100: not in the Command Palette (FR-041 moved it out of the palette)', () => {
    // see IC-100
    const built = bench(oneRowDocument({}))
    const palette = built.view().commandPalette
    const inPalette = (palette?.groups ?? []).flatMap((group) => group.commands.map((one) => one.icon))
    expect(inPalette).not.toContain('IC-100')
    const drawnPalette = byRole(built.built.root(), 'Command Palette')
    for (const one of drawnPalette) {
      expect(selfAndDescendants(one).some((node) => node.getAttribute('data-icon') === 'IC-100')).toBe(false)
    }
  })

  it('IC-100: the drawn App Header carries IC-100 as the entrance just before IC-16', () => {
    // see IC-100
    const built = bench(oneRowDocument())
    const header = byRole(built.built.root(), 'App Header')[0] as FakeElement
    const order = selfAndDescendants(header)
      .map((one) => one.getAttribute('data-icon'))
      .filter((icon): icon is string => icon !== null)
    const at = order.indexOf('IC-100')
    expect(at).toBeGreaterThanOrEqual(0)
    expect(order[at + 1]).toBe('IC-16')
  })
})

const RR_6 = '閉じる入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-52`）を、面の見出しの行の右端（面の右上）に置くこと（MUST）'

const ROSTER = bare(rowIn('T-103', 'U-49')?.by['確定名（英）'] ?? '') || 'Resource Roster'

interface HeadingRow {
  readonly row: FakeElement
  readonly close: FakeElement
}

// WHY: the heading row is the element holding the heading's words; the close entrance must be a child of it.
function headingRowOf(root: FakeElement, heading: string): HeadingRow {
  const holders = selfAndDescendants(root).filter((one) => one.textContent === heading && one.children.length === 0)
  const head = holders[0]
  if (head === undefined) throw new Error(`no element carries the heading ${heading}`)
  const row = head.parentNode as FakeElement
  const close = selfAndDescendants(root).find((one) => one.getAttribute('data-icon') === 'IC-52')
  if (close === undefined) throw new Error('the surface drew no IC-52')
  return { row, close }
}

const elementChildren = (element: FakeElement): FakeElement[] => element.children.filter((one) => one.tagName !== undefined)

describe('RR-6 -- the roster closes from the right end of its heading row', () => {
  it('RR-6 still says: 面の見出しの行の右端（面の右上）に置く', () => {
    expect(REQUIREMENTS).toContain(RR_6)
  })

  it('RR-6: 面の見出しの行の右端 -- IC-52 is the last entrance in the roster heading row', () => {
    // see RR-6
    const built = bench(oneRowDocument())
    built.press('Command Palette', 'IC-62')
    const modal = built.view().openModal
    expect(modal?.surface, 'premise: IC-62 opened the roster').toBe(ROSTER)
    const roster = byRole(built.built.root(), ROSTER)[0] as FakeElement
    const { row, close } = headingRowOf(roster, modal?.heading ?? '')
    expect(close.parentNode === row || row.contains?.(close as never) === true, 'RR-6: IC-52 sits in the heading row').toBe(true)
    const kids = elementChildren(row)
    expect(kids[kids.length - 1] === close || kids[kids.length - 1]?.contains?.(close as never) === true, 'RR-6: at the right end').toBe(true)
  })

  it('RR-6: FR-036 がヘルプの題の行に定める置き方と同じ -- in both, the heading row pushes IC-52 to its right end', () => {
    // see RR-6, FR-036
    // WHY: in a flex row, the last child reaches the right end only when something before or on it takes the
    // free room (an auto left margin or a growing sibling); the Help heading row is the reference FR-036 sets.
    const pushedRight = (row: FakeElement, close: FakeElement): boolean => {
      const kids = elementChildren(row)
      const upTo = kids.slice(0, kids.indexOf(close) + 1)
      const isFlex = /flex/.test(styleMap(row).get('display') ?? '')
      const justified = /(space-between|flex-end|end)/.test(styleMap(row).get('justify-content') ?? '')
      const takesRoom = upTo.some((one) => {
        const style = styleMap(one)
        return style.get('margin-left') === 'auto' || /^[1-9]/.test(style.get('flex-grow') ?? '') || /^[1-9]/.test(style.get('flex') ?? '')
      })
      return isFlex && (justified || takesRoom) && kids[kids.length - 1] === close
    }

    const help = bench(oneRowDocument())
    help.press('App Header', 'IC-22')
    const helpModal = help.view().openModal
    const helpRoot = byRole(help.built.root(), helpModal?.surface ?? '')[0] as FakeElement
    const helpRow = headingRowOf(helpRoot, helpModal?.heading ?? '')
    expect(pushedRight(helpRow.row, helpRow.close), 'premise: the Help heading row sets IC-52 at its right end').toBe(true)

    const roster = bench(oneRowDocument())
    roster.press('Command Palette', 'IC-62')
    const rosterRoot = byRole(roster.built.root(), ROSTER)[0] as FakeElement
    const rosterRow = headingRowOf(rosterRoot, roster.view().openModal?.heading ?? '')
    expect(pushedRight(rosterRow.row, rosterRow.close), RR_6).toBe(true)
  })
})

const IN_7_ONE_LINE = 'ツールチップは、説明の各行を折り返さずに 1 行で出すこと（MUST）。'
const IN_7_CAP =
  '説明の幅は中身の幅とし、その上限を閲覧環境の窓の幅から両側に `_assets/tbl-settings.md` の 表 T-206 の `S-339` を引いた幅とすること（MUST）。'
const IN_7_TURN_BACK =
  '対象の左端に揃えて出すと窓の右端から `S-339` の内側に収まらないときは、説明の右端を対象の右端に揃えて出すこと（MUST）'
const IN_7_FLOOR = 'それでも左端が窓の左端から `S-339` の内側に収まらないときは、左端を窓の左端から `S-339` の位置に置くこと（MUST）。'

interface FakeNode {
  style: string
  text: string
  children: FakeNode[]
  width: number
  rect: { left: number; top: number; right: number; bottom: number } | null
}

const pxOf = (style: string, name: string): number =>
  Number(new RegExp(`(?:^|;)${name}:(-?[\\d.]+)px`).exec(style.replace(/\s/g, ''))?.[1])

// WHY: the same fake node tests/unit/ez-2-tooltip-one-line-inside-the-window.test.ts drives these two exports with.
const nodeOf = (width: number): FakeNode & Record<string, unknown> => {
  const node: FakeNode & Record<string, unknown> = { style: '', text: '', children: [], width, rect: null }
  node.setAttribute = (name: string, value: string) => {
    if (name === 'style') node.style = value
  }
  node.getAttribute = (name: string) => (name === 'style' ? node.style : null)
  node.append = (...kids: FakeNode[]) => node.children.push(...kids)
  node.getBoundingClientRect = () => {
    if (node.rect !== null) {
      return { ...node.rect, x: node.rect.left, y: node.rect.top, width: node.rect.right - node.rect.left, height: node.rect.bottom - node.rect.top }
    }
    const left = pxOf(node.style, 'left')
    const top = pxOf(node.style, 'top')
    return { x: left, y: top, left, top, right: left + node.width, bottom: top + 20, width: node.width, height: 20 }
  }
  Object.defineProperty(node, 'textContent', {
    set: (value: string) => {
      node.text = value
    },
    get: () => node.text,
  })
  return node
}

const ANCHOR_WIDTH = 24

function shown(anchorLeft: number, windowWidth: number, tipWidth: number): FakeNode {
  const host = { createElement: () => nodeOf(tipWidth) }
  const anchor = nodeOf(ANCHOR_WIDTH)
  anchor.rect = { left: anchorLeft, top: 10, right: anchorLeft + ANCHOR_WIDTH, bottom: 34 }
  const tip: Tooltip = { anchor: { kind: 'icon', icon: 'IC-22' }, text: 'a description of the icon', assignment: null }
  const element = tooltipElement(host as unknown as Document, tip, () => anchor as unknown as HTMLElement) as unknown as FakeNode
  const layer = nodeOf(windowWidth)
  layer.rect = { left: 0, top: 0, right: windowWidth, bottom: 700 }
  layer.children = [element]
  keepTooltipsInside(layer as unknown as HTMLElement)
  return element
}

const flat = (style: string): string => style.replace(/\s/g, '').toLowerCase()

describe('IN-7 (table T-028) -- tooltips', () => {
  it('IN-7 still says: 折り返さずに 1 行 / 窓の幅から両側に S-339 を引いた幅 / 右端を対象の右端に / 左端を S-339 の位置に', () => {
    expect(REQUIREMENTS).toContain(IN_7_ONE_LINE)
    expect(REQUIREMENTS).toContain(IN_7_CAP)
    expect(REQUIREMENTS).toContain(IN_7_TURN_BACK)
    expect(REQUIREMENTS).toContain(IN_7_FLOOR)
  })

  it('IN-7: 説明の幅は中身の幅とし、その上限を ... 窓の幅から両側に S-339 を引いた幅 -- written against the window', () => {
    // see IN-7, S-339
    const style = flat(shown(100, 1000, 240).style)
    expect(style).toMatch(/(?:^|;)width:max-content(?:;|$)/)
    expect(style).toContain(`max-width:calc(100vw-${2 * S_339}px)`)
  })

  it('IN-7: with room on the right it stands at the anchor left edge', () => {
    // see IN-7
    expect(pxOf(shown(100, 1000, 240).style, 'left')).toBe(100)
  })

  it('IN-7: 窓の右端から S-339 の内側に収まらないとき ... 説明の右端を対象の右端に揃えて出す (the S-339 margin counts)', () => {
    // see IN-7, S-339
    // WHY: 1000 - S-339 < anchorLeft + width <= 1000: inside the window, but not S-339 inside it.
    const anchorLeft = 1000 - S_339 - 240 + 1
    const left = pxOf(shown(anchorLeft, 1000, 240).style, 'left')
    expect(left).toBe(anchorLeft + ANCHOR_WIDTH - 240)
  })

  it('IN-7: それでも左端が ... S-339 の内側に収まらないときは、左端を窓の左端から S-339 の位置に置く', () => {
    // see IN-7, S-339
    const left = pxOf(shown(900, 1000, 990).style, 'left')
    expect(left).toBe(S_339)
  })
})

const FR_051_BAND_TO_BAR = 'その余白にも、行の帯の地を、縦の `Scrollbars` の左端まで続けて塗ること（MUST）'
const FR_051_NOT_IN_VERTICAL = '行の帯の地も日程の形も、縦の `Scrollbars` の帯の中へ描いてはならない（MUST NOT）。'
const FR_051_BOTTOM = '横の `Scrollbars` は、`GRS` が占める画面の下端に接して置くこと（MUST）。'
const FR_051_NOT_IN_HORIZONTAL = '日程（行の帯・形・罫線）を横の `Scrollbars` の帯の中へ描いてはならない（MUST NOT）'

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const numberAttr = (tag: string, name: string): number => Number(new RegExp(`\\b${name}="([^"]+)"`).exec(tag)?.[1])

// WHY: a clip on an enclosing group is what the viewer sees, so the clip rectangle bounds what was drawn.
function drawnBoxes(svg: string, figure: RegExp): Box[] {
  const clips = new Map<string, Box>()
  for (const found of svg.matchAll(/<clipPath\b[^>]*id="([^"]+)"[^>]*>\s*<rect\b([^>]*)>/g)) {
    const tag = found[2] ?? ''
    clips.set(found[1] ?? '', { x: numberAttr(tag, 'x'), y: numberAttr(tag, 'y'), width: numberAttr(tag, 'width'), height: numberAttr(tag, 'height') })
  }
  const boxes: Box[] = []
  const openClips: (Box | null)[] = []
  for (const found of svg.matchAll(/<(\/?)(g|rect|line)\b([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attributes = '', selfClosing] = found
    if (tag === 'g') {
      if (closing === '/') openClips.pop()
      else {
        const clipId = /clip-path="url\(#([^)]+)\)"/.exec(attributes)?.[1]
        openClips.push(clipId === undefined ? null : clips.get(clipId) ?? null)
        if (selfClosing === '/') openClips.pop()
      }
      continue
    }
    if (closing === '/' || !figure.test(/data-figure="([^"]+)"/.exec(attributes)?.[1] ?? '')) continue
    let box: Box =
      tag === 'rect'
        ? { x: numberAttr(attributes, 'x'), y: numberAttr(attributes, 'y'), width: numberAttr(attributes, 'width'), height: numberAttr(attributes, 'height') }
        : (() => {
            const x1 = numberAttr(attributes, 'x1')
            const x2 = numberAttr(attributes, 'x2')
            const y1 = numberAttr(attributes, 'y1')
            const y2 = numberAttr(attributes, 'y2')
            return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) }
          })()
    for (const clip of openClips) {
      if (clip === null) continue
      const x0 = Math.max(box.x, clip.x)
      const y0 = Math.max(box.y, clip.y)
      const x1 = Math.min(box.x + box.width, clip.x + clip.width)
      const y1 = Math.min(box.y + box.height, clip.y + clip.height)
      box = { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) }
    }
    if (box.width > 0 || box.height > 0) boxes.push(box)
  }
  return boxes
}

const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width - 0.01 && b.x < a.x + a.width - 0.01 && a.y < b.y + b.height - 0.01 && b.y < a.y + a.height - 0.01

function manyRows(): Bench {
  const rows = Array.from({ length: 60 }, (_one, index) => ({ id: `g${index + 1}`, parentId: null }))
  return bench(rowDocument(rows))
}

describe('FR-051 -- the scrollbar bands', () => {
  it('FR-051 still says: 縦の Scrollbars の左端まで続けて塗る / 帯の中へ描いてはならない / 画面の下端に接して置く', () => {
    expect(REQUIREMENTS).toContain(FR_051_BAND_TO_BAR)
    expect(REQUIREMENTS).toContain(FR_051_NOT_IN_VERTICAL)
    expect(REQUIREMENTS).toContain(FR_051_BOTTOM)
    expect(REQUIREMENTS).toContain(FR_051_NOT_IN_HORIZONTAL)
  })

  it('FR-051: 横の Scrollbars は、GRS が占める画面の下端に接して置く', () => {
    // see FR-051
    const bars = manyRows().view().frame.scrollbars
    const horizontal = bars.find((one) => one.axis === 'horizontal')
    expect(horizontal).toBeDefined()
    expect((horizontal?.track.y ?? 0) + (horizontal?.track.height ?? 0)).toBeCloseTo(SCREEN.height, 3)
  })

  it('FR-051: 行の帯の地を、縦の Scrollbars の左端まで続けて塗る', () => {
    // see FR-051
    const built = manyRows()
    const vertical = built.view().frame.scrollbars.find((one) => one.axis === 'vertical')
    const bands = drawnBoxes(built.svg(), /^row-.*-band$/)
    expect(bands.length, 'premise: row bands are drawn').toBeGreaterThan(0)
    for (const band of bands) expect(band.x + band.width).toBeCloseTo(vertical?.track.x ?? Number.NaN, 2)
  })

  it('FR-051: 行の帯の地も日程の形も、縦の Scrollbars の帯の中へ描いてはならない', () => {
    // see FR-051
    const built = manyRows()
    const vertical = built.view().frame.scrollbars.find((one) => one.axis === 'vertical')?.track as Box
    const drawn = drawnBoxes(built.svg(), /^(row-.*|task-.*)$/)
    const inside = drawn.filter((one) => overlaps(one, vertical))
    expect(inside, JSON.stringify(inside.slice(0, 3))).toEqual([])
  })

  it('FR-051: 日程（行の帯・形・罫線）を横の Scrollbars の帯の中へ描いてはならない', () => {
    // see FR-051
    const built = manyRows()
    const horizontal = built.view().frame.scrollbars.find((one) => one.axis === 'horizontal')?.track as Box
    const drawn = drawnBoxes(built.svg(), /^(row-.*|task-.*)$/)
    expect(drawn.length, 'premise: the rows reach past the bottom of the screen').toBeGreaterThan(0)
    const inside = drawn.filter((one) => overlaps(one, horizontal))
    expect(inside, JSON.stringify(inside.slice(0, 3))).toEqual([])
  })
})
