// CR-551 items 10-12: the fit margins (FR-055), the status-date line (FR-046, FR-106) and the exclusive cursors

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { showDualCursorReadout } from '../../src/framework/dom-screen-surface/tooltips-drawing'
import { bare, specTable, unbroken } from '../contract/spec-table'
import {
  byRole,
  iconEntry,
  paintedGround,
  selfAndDescendants,
  stage,
  styleMap,
  surfaceOf,
  wire,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
import { pointerOf, rowDocument, taskOf, SCREEN } from './cr-541-stage'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

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
const lightOf = (id: string): string => {
  const found = /#[0-9a-fA-F]{6}/.exec(rowIn('T-236', id).by['明るいテーマ'] ?? '')
  if (found === null) throw new Error(`table T-236 row ${id} holds no light colour`)
  return found[0].toLowerCase()
}

// see S-332
const S_332 = numberOf(rowIn('T-206', 'S-332').by['既定'] ?? '')
// see S-333
const S_333 = numberOf(rowIn('T-206', 'S-333').by['既定'] ?? '')
// see S-194
const S_194 = numberOf(rowIn('T-206', 'S-194').by['既定'] ?? '')
// see S-334
const S_334 = numberOf(rowIn('T-206', 'S-334').by['既定'] ?? '')
// see S-340
const S_340 = numberOf(rowIn('T-206', 'S-340').by['既定'] ?? '')
// see S-163, S-195, S-183
const S_163 = lightOf('S-163')
const S_195 = lightOf('S-195')
const S_183 = lightOf('S-183')
// see S-30, LC-5
const LABEL_COEF = numberOf(rowIn('T-201', 'S-30').by['既定値'] ?? '')
// see S-66
const GUIDE_VALUES = [...(rowIn('T-202', 'S-66').by['型'] ?? '').matchAll(/'([a-z-]+)'/g)].map((one) => one[1] as string)
const [GUIDE_NONE, GUIDE_CROSSHAIR, GUIDE_SINGLE] = GUIDE_VALUES as [string, string, string]

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const partOn = (part: string, entry: string | null, extra: Record<string, unknown> = {}): ScreenPart =>
  ({ part, entry, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null, ...extra }) as unknown as ScreenPart

interface Bench {
  readonly loop: FrameLoop
  readonly built: Stage
  readonly shapes: unknown[]
  press(part: string, entry: string): void
  move(x: number, y: number, aimed?: ScreenPart | null): void
  click(x: number, y: number): void
  view(): ScreenView
  svg(): string
  settings(): Record<string, unknown>
}

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
  const shapes: unknown[] = []
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
  const loop = frameLoop(
    { showSvg: (svg: string) => svgs.push(svg) } as never,
    document as never,
    SCREEN,
    { surface, language: 'ja' },
    undefined,
    (shape) => shapes.push(shape),
  )
  drain()
  const send = (input: Parameters<FrameLoop['receiveInput']>[0]): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    built,
    shapes,
    press: (part, entry) => {
      aimed = partOn(part, entry)
      send(pointerOf('down', 80, 120))
      send(pointerOf('up', 80, 120))
      aimed = null
    },
    move: (x, y, part = null) => {
      aimed = part
      send(pointerOf('move', x, y))
      aimed = null
    },
    click: (x, y) => {
      send(pointerOf('down', x, y))
      send(pointerOf('up', x, y))
    },
    view: () => views[views.length - 1] as ScreenView,
    svg: () => svgs[svgs.length - 1] ?? '',
    settings: () => loop.document().documentSettings as unknown as Record<string, unknown>,
  }
}

interface Seed {
  readonly name: string
  readonly start: string
  readonly finish: string
}

function documentOf(seeds: readonly Seed[], settings: Record<string, unknown> = {}) {
  const rows = seeds.map((_one, index) => ({ id: `g${index + 1}`, parentId: null }))
  const document = rowDocument(rows, { progressMarkerVisible: false, ...settings })
  document.schedule.tasks = seeds.map((one, index) =>
    taskOf(index + 1, { name: one.name, start: `${one.start}T08:00:00`, finish: `${one.finish}T17:00:00` }),
  )
  return document
}

const SEEDS: readonly Seed[] = [
  { name: 'Alpha', start: '2026-04-06', finish: '2026-04-20' },
  { name: 'Beta', start: '2026-05-04', finish: '2026-05-29' },
  { name: 'Zeta, the task whose name ends the picture', start: '2026-06-15', finish: '2026-07-03' },
]

const rowAreaOf = (loop: FrameLoop) => {
  const area = loop.current()?.regions.rowArea
  if (area === undefined) throw new Error('the shell has no frame')
  return area
}

const FR_055_MARGIN =
  '横は、表 T-038 に従って測った実寸の左右に、`Row Area` の幅に `_assets/tbl-settings.md` の 表 T-206 の `S-332` を掛けた余白を片側ずつ残して収めること（MUST）'
const FR_055_PICTURE = '横の実寸は、採った段と、その段が着地する縦の倍率で描いた絵で測ること（MUST）'
const FR_055_NOT_SNAPPED = '日の境目へ切り捨ててはならない（MUST NOT）'

function fitted(settings: Record<string, unknown> = {}): Bench {
  const built = bench(documentOf(SEEDS, { zoomX: 4, scrollDate: '2026-03-01', ...settings }))
  built.press('App Header', 'IC-10')
  return built
}

const extentOf = (loop: FrameLoop): { left: number; right: number } => {
  const placements = loop.current()?.layout.placements ?? []
  return {
    left: Math.min(...placements.map((one) => one.occupiedX0)),
    right: Math.max(...placements.map((one) => one.occupiedX1)),
  }
}

describe('FR-055 -- the fit leaves a margin on each side', () => {
  it('FR-055 still says: S-332 を掛けた余白を片側ずつ / 着地する縦の倍率で描いた絵で測る / 日の境目へ切り捨ててはならない', () => {
    expect(REQUIREMENTS).toContain(FR_055_MARGIN)
    expect(REQUIREMENTS).toContain(FR_055_PICTURE)
    expect(REQUIREMENTS).toContain(FR_055_NOT_SNAPPED)
  })

  it('FR-055: Row Area の幅に S-332 を掛けた余白を片側ずつ残して収める -- left and right', () => {
    // see FR-055, S-332
    const built = fitted()
    const area = rowAreaOf(built.loop)
    const margin = area.width * S_332
    const { left, right } = extentOf(built.loop)
    expect(left - area.x, 'the left margin').toBeCloseTo(margin, 0)
    expect(area.x + area.width - right, 'the right margin').toBeCloseTo(margin, 0)
  })

  it('FR-055: no name label is cut at the right edge of the Row Area (the drawn label measured by LC-5)', () => {
    // see FR-055, LC-5
    const built = fitted()
    const area = rowAreaOf(built.loop)
    for (const found of built.svg().matchAll(/<text\b([^>]*)data-figure="task-\d+-label"[^>]*>([^<]*)</g)) {
      const attributes = found[1] ?? ''
      const x = Number(/\bx="([^"]+)"/.exec(attributes)?.[1])
      const size = Number(/\bfont-size="([^"]+)"/.exec(attributes)?.[1])
      const width = [...(found[2] ?? '')].length * size * LABEL_COEF
      expect(x + width, `label ${found[2]}`).toBeLessThanOrEqual(area.x + area.width + 0.5)
    }
  })

  it('FR-055: 着地する縦の倍率で描いた絵で測る -- the margins hold with the OC-2 labels and the markers shown', () => {
    // see FR-055, OC-2
    const built = fitted({ percentCompleteVisible: true, progressMarkerVisible: true, planDatesVisible: true })
    const area = rowAreaOf(built.loop)
    const margin = area.width * S_332
    const { left, right } = extentOf(built.loop)
    expect(left - area.x, 'the left margin').toBeCloseTo(margin, 0)
    expect(area.x + area.width - right, 'the right margin').toBeCloseTo(margin, 0)
  })

  it('FR-055: 日の境目へ切り捨ててはならない -- scrollDayOffset keeps the place inside the day', () => {
    // see FR-055, S-177
    const built = fitted()
    const layout = built.loop.current()?.layout
    const area = rowAreaOf(built.loop)
    const offset = Number(built.settings()['scrollDayOffset'])
    expect(offset).toBeGreaterThanOrEqual(0)
    expect(offset).toBeLessThan(1)
    const days = (area.x - (layout?.originX ?? 0)) / (layout?.pxPerDay ?? 1)
    const inside = days - Math.floor(days)
    expect(offset, 'the left edge lands inside a day, and the stored offset says where').toBeCloseTo(inside, 2)
    expect(offset, 'premise of this fixture: the fitted left edge is not on a day boundary').toBeGreaterThan(0)
  })
})

const FR_046_CENTRE = '基準日線を出す操作では、倍率を変えずに、基準日線が `Row Area` の横の中点に来るよう表示位置を横に送ること（MUST）'
const FR_046_NOT_VERTICAL = '縦の表示位置は動かさないこと（MUST）。'
const FR_046_INK = '基準日線は、色を `_assets/tbl-settings.md` の 表 T-236 の `S-163`、太さを同書の 表 T-206 の `S-333` で描くこと（MUST）'
const FR_046_EN_7 = '基準日線を描いているあいだ、基準日の入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-44`）を `FR-029` の 表 T-237 の `EN-7` で塗ること（MUST）'
const FR_106_PK_10 = '基準日線の掴み代（表 T-023d の `GR-16`）と、パネルの境界の掴み帯（同表の `GR-22`）では、表 T-269 の `PK-10` とすること（MUST）'

// see PK-10
const PK_10_SPELLING = /`([a-z-]+)`/.exec(rowIn('T-269', 'PK-10').cells[1] ?? '')?.[1] ?? ''

const localToday = (): string => {
  const now = new Date()
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const statusLineOf = (svg: string): string | undefined => /<line\b[^>]*data-figure="status-line"[^>]*>/.exec(svg)?.[0]
const attrOf = (tag: string, name: string): string => new RegExp(`\\b${name}="([^"]+)"`).exec(tag)?.[1] ?? ''

describe('FR-046 / FR-106 -- the status-date line', () => {
  it('FR-046 / FR-106 still say: 横の中点に来るよう / 縦の表示位置は動かさない / S-163 ・ S-333 / EN-7 / PK-10', () => {
    expect(REQUIREMENTS).toContain(FR_046_CENTRE)
    expect(REQUIREMENTS).toContain(FR_046_NOT_VERTICAL)
    expect(REQUIREMENTS).toContain(FR_046_INK)
    expect(REQUIREMENTS).toContain(FR_046_EN_7)
    expect(REQUIREMENTS).toContain(FR_106_PK_10)
    expect(PK_10_SPELLING).toBe('col-resize')
  })

  it('FR-046: 基準日線が Row Area の横の中点に来るよう表示位置を横に送る -- without changing the zoom', () => {
    // see FR-046
    const built = bench(documentOf(SEEDS, { zoomX: 1, zoomY: 1, scrollDate: '2020-01-06' }))
    const before = { ...built.settings() }
    built.press('Command Palette', 'IC-44')
    expect(String(built.loop.document().schedule.project.statusDate).slice(0, 10), 'premise: IC-44 wrote today').toBe(localToday())
    const line = statusLineOf(built.svg())
    expect(line, 'the line is drawn').toBeDefined()
    const area = rowAreaOf(built.loop)
    expect(Number(attrOf(line ?? '', 'x1'))).toBeCloseTo(area.x + area.width / 2, 0)
    expect(built.settings()['zoomX'], '倍率を変えずに').toBe(before['zoomX'])
    expect(built.settings()['zoomY'], '倍率を変えずに').toBe(before['zoomY'])
  })

  it('FR-046: 縦の表示位置は動かさない -- scrollGroupId and scrollGroupOffset stay', () => {
    // see FR-046
    const built = bench(documentOf(SEEDS, { scrollDate: '2020-01-06', scrollGroupId: 'g2', scrollGroupOffset: 0 }))
    const before = { ...built.settings() }
    built.press('Command Palette', 'IC-44')
    expect(built.settings()['scrollGroupId']).toBe(before['scrollGroupId'])
    expect(built.settings()['scrollGroupOffset']).toBe(before['scrollGroupOffset'])
  })

  it('FR-046: 色を S-163、太さを S-333 で描く', () => {
    // see FR-046, S-163, S-333
    const document = documentOf(SEEDS)
    document.schedule.project.statusDate = '2026-05-01'
    const line = statusLineOf(bench(document).svg()) ?? ''
    expect(attrOf(line, 'stroke').toLowerCase()).toBe(S_163)
    expect(Number(attrOf(line, 'stroke-width'))).toBeCloseTo(S_333, 3)
  })

  it('FR-046: 基準日線を描いているあいだ、IC-44 を EN-7 で塗る (S-183), and not while it is not drawn', () => {
    // see FR-046, EN-7
    expect(bare(rowIn('T-237', 'EN-7').cells[1] ?? '')).toBe('S-183')
    const shownDocument = documentOf(SEEDS)
    shownDocument.schedule.project.statusDate = '2026-05-01'
    const shown = bench(shownDocument)
    expect(paintedGround(shown.built, iconEntry(shown.built.root(), 'IC-44'))).toBe(S_183)
    const hidden = bench(documentOf(SEEDS))
    expect(paintedGround(hidden.built, iconEntry(hidden.built.root(), 'IC-44'))).not.toBe(S_183)
  })

  it('FR-106 E-17: GR-16 は PK-10 -- the pointer on the status-date line is col-resize', () => {
    // see FR-106, GR-16, PK-10
    const document = documentOf(SEEDS)
    document.schedule.project.statusDate = '2026-05-01'
    const built = bench(document)
    const line = statusLineOf(built.svg()) ?? ''
    const area = rowAreaOf(built.loop)
    // WHY: T-023d ranks GR-10 and GR-23 above GR-16, so the probe stands on the line below every task.
    built.move(Number(attrOf(line, 'x1')), area.y + area.height - 5)
    expect(String(built.shapes[built.shapes.length - 1])).toContain(PK_10_SPELLING)
  })

  it('FR-106 E-17: GR-22 は PK-10 -- the pointer on the Panel Divider band is col-resize', () => {
    // see FR-106, GR-22, PK-10
    const built = bench(documentOf(SEEDS))
    const divider = built.view().frame.dividers[0]
    expect(divider, 'premise: the Row Title Panel boundary has a band').toBeDefined()
    const band = divider?.band ?? { x: 0, y: 0, width: 0, height: 0 }
    built.move(band.x + band.width / 2, band.y + band.height / 2, partOn('Panel Divider', null, { dividerPanel: divider?.panel }))
    const told = String(built.shapes[built.shapes.length - 1] ?? '')
    const drawnBand = byRole(built.built.root(), 'Panel Divider')
    const drawnCursors = drawnBand.flatMap((one) => selfAndDescendants(one).map((node) => styleMap(node).get('cursor') ?? ''))
    expect([told, ...drawnCursors].some((one) => one.includes(PK_10_SPELLING)), `told ${told}; drawn ${drawnCursors.join(',')}`).toBe(true)
  })
})

const FR_048_EXCLUSIVE = '`Dual Cursor` のモード（`CU-2`）とガイドカーソル（`CU-3`）の 2 つの値は 1 つの排他の選択とし、1 つを選ぶと他を消すこと（MUST）'
const FR_048_INK = '`CU-2` と `CU-3` の線は、色を `_assets/tbl-settings.md` の 表 T-236 の `S-195`、太さを同書の 表 T-206 の `S-194` で描くこと（MUST）'
const DC_9_ENTER = '本モードに入るときは、`S-66` を `\'none\'` にすること（MUST）。'
const DC_9_GUIDE_PRESSED = '本モードにいるあいだにガイドカーソルの入口を押したときは、本モードを出て（`DC-7` が 2 本を消す）、押した値を `S-66` に書くこと（MUST）'
const DC_3_SIZE = '文字の大きさは `_assets/tbl-settings.md` の 表 T-206 の `S-334` とし、同表の `S-340` を下回らせない。'

// see T-109
const guideEntrance = (value: string): string => {
  const found = specTable('T-109').rows.filter((row) => (row.cells[2] ?? '').includes(`'${value}'`)).map((row) => row.id)
  if (found.length > 0) return found[0] as string
  // WHY: IC-48 says 'same as above' before its value, which the filter above already finds.
  throw new Error(`table T-109 names no entrance for ${value}`)
}
const IC_CROSSHAIR = guideEntrance(GUIDE_CROSSHAIR)
const IC_SINGLE = guideEntrance(GUIDE_SINGLE)
// see FR-082, IC-45
const IC_DUAL = 'IC-45'

const paletteItem = (view: ScreenView, icon: string) =>
  (view.commandPalette?.groups ?? []).flatMap((group) => group.commands).find((one) => one.icon === icon)

const cursorLines = (svg: string): string[] =>
  [...svg.matchAll(/<line\b[^>]*>/g)].map((one) => one[0]).filter((one) => attrOf(one, 'stroke').toLowerCase() === S_195)

describe('FR-048 / DC-9 -- the dual cursor and the guide cursor are one exclusive choice', () => {
  it('FR-048 / DC-9 / DC-3 still say: 1 つの排他の選択 / S-66 を none に / 押した値を S-66 に / S-195 ・ S-194 / S-334 ・ S-340', () => {
    expect(REQUIREMENTS).toContain(FR_048_EXCLUSIVE)
    expect(REQUIREMENTS).toContain(FR_048_INK)
    expect(REQUIREMENTS).toContain(DC_9_ENTER)
    expect(REQUIREMENTS).toContain(DC_9_GUIDE_PRESSED)
    expect(REQUIREMENTS).toContain(DC_3_SIZE)
    expect([IC_CROSSHAIR, IC_SINGLE]).toEqual(['IC-47', 'IC-48'])
  })

  it("DC-9: 本モードに入るときは、S-66 を 'none' にする", () => {
    // see DC-9, S-66
    const built = bench(documentOf(SEEDS))
    built.press('Command Palette', IC_CROSSHAIR)
    expect(built.settings()['guideCursorMode'], 'premise: IC-47 armed the crosshair').toBe(GUIDE_CROSSHAIR)
    built.press('Command Palette', IC_DUAL)
    expect(paletteItem(built.view(), IC_DUAL)?.isChosen, 'premise: the Dual Cursor mode is on').toBe(true)
    expect(built.settings()['guideCursorMode']).toBe(GUIDE_NONE)
  })

  for (const [icon, value] of [
    [IC_CROSSHAIR, GUIDE_CROSSHAIR],
    [IC_SINGLE, GUIDE_SINGLE],
  ] as const) {
    it(`DC-9 / DC-4: pressing ${icon} in the Dual Cursor mode leaves the mode, clears both lines (DC-7) and writes '${value}'`, () => {
      // see DC-9, DC-4, DC-7
      const built = bench(documentOf(SEEDS))
      built.press('Command Palette', IC_DUAL)
      const area = rowAreaOf(built.loop)
      built.move(area.x + 200, area.y + 40)
      built.click(area.x + 200, area.y + 40)
      built.move(area.x + 400, area.y + 40)
      built.click(area.x + 400, area.y + 40)
      expect(built.settings()['dualCursor'], 'premise: the two lines were placed').not.toBeNull()
      built.press('Command Palette', icon)
      expect(paletteItem(built.view(), IC_DUAL)?.isChosen, 'DC-9: 本モードを出て').toBe(false)
      expect(built.settings()['dualCursor'], 'DC-7: the two lines are cleared').toBeNull()
      expect(built.settings()['guideCursorMode'], 'DC-9: 押した値を S-66 に書く').toBe(value)
      expect(cursorLines(built.svg()).length <= 2, 'the two measuring lines are gone').toBe(true)
    })
  }

  it('FR-048: CU-2 の線は、色を S-195、太さを S-194 で描く (the fixed line; the following one is SL-8 thicker)', () => {
    // see FR-048, S-195, S-194, DC-8
    const built = bench(documentOf(SEEDS))
    built.press('Command Palette', IC_DUAL)
    const area = rowAreaOf(built.loop)
    built.move(area.x + 200, area.y + 40)
    built.click(area.x + 200, area.y + 40)
    built.move(area.x + 400, area.y + 40)
    const lines = cursorLines(built.svg())
    expect(lines.length, `lines painted S-195 in ${built.svg().length} chars of SVG`).toBeGreaterThanOrEqual(2)
    expect(Math.min(...lines.map((one) => Number(attrOf(one, 'stroke-width'))))).toBeCloseTo(S_194, 3)
  })

  it('FR-048: CU-3 の線は、色を S-195、太さを S-194 で描く (the guide cursor)', () => {
    // see FR-048, S-195, S-194
    const built = bench(documentOf(SEEDS))
    built.press('Command Palette', IC_SINGLE)
    const area = rowAreaOf(built.loop)
    built.move(area.x + 300, area.y + 60)
    const lines = cursorLines(built.svg())
    expect(lines.length, 'the guide line is painted S-195').toBeGreaterThanOrEqual(1)
    for (const one of lines) expect(Number(attrOf(one, 'stroke-width'))).toBeCloseTo(S_194, 3)
  })

  it('DC-3: 文字の大きさは S-334 とし、S-340 を下回らせない -- max(S-340 px, S-334 em)', () => {
    // see DC-3, S-334, S-340
    const built = stage()
    const layer = built.host.createElement('div') as unknown as FakeElement
    showDualCursorReadout(built.host, layer as unknown as HTMLElement, { lines: ['a', 'b', 'c'], at: { x: 10, y: 10 } })
    const box = layer.children[0] as FakeElement
    const size = (styleMap(box).get('font-size') ?? '').replace(/\s/g, '')
    expect(size).toBe(`max(${S_340}px,${S_334}em)`)
  })
})
