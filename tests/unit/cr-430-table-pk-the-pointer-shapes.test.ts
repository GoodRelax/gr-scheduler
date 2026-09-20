// CR-430: table T-269 (PK-1..PK-9) -- the pointer shape each grab area shows, and the seam S7 that names it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { specTable, unbroken } from '../contract/spec-table'
import { grabAreaRows, pointAnswering, pointerRowFor, scanGrabAreas, sizePx, specRow } from './cr-430-bench'
import {
  BAR_UID,
  april,
  benchDocument,
  frameOf,
  pointer,
  restoreAnimationFrames,
  stage,
  xOfDay,
  type Stage,
} from './cr-430-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_106_HOLDS_WHILE_PRESSED = '押しているあいだは、掴んだときの形を保つこと（MUST）。'
const FR_106_MARKER_IS_A_FINGER =
  '⭐ 押す役と引く役を兼ねる進捗マーカー（表 T-270 の `PE-8` / `PE-9`）は、押す役の形（指）とすること（MUST）。'
const T_269_ONE_EDGE_WIDTH =
  '⭐ 縁の太さは形によらず 表 T-206 の `S-297` の 1 つとすること（MUST） —— 縁は形を地から切り離すためのものであり、形ごとに変える理由が無い。'
const T_269_WHITE_IS_PLAN = '⭐ 白 ＝ 予定、黒 ＝ 実績とダミー、の約束を、箱の矢印と円で揃えること（MUST）。'
const T_269_NO_DISPLAY_SCALE =
  '⛔ ポインタの画像に表示の倍率を掛けてはならない（MUST NOT） —— 画像は画面の点であり、日程の寸法ではない。'
const T_269_FALLBACKS =
  '⭐ 画像のポインタを描けない環境では、動く向きを示す環境の形に替えること（MUST） —— 端の箱の矢印・フェードの三角・マイルストーンの実績とダミーの ●・再開の折れ矢印は `ew-resize`、マイルストーンの予定の ○ は `move`（横にも縦にも動く）、依存線の線の矢印は `pointer`（押して選ぶだけ）とする。'
const T_269_ARMED_WINS = '⚠️ 依存線の道具を構えているあいだは、本表の形を当てないこと（MUST NOT）'
const T_269_TWO_HEADINGS =
  '幅の広い箱型の矢印（← ／ →）'
const T_269_CORNER_MEANS =
  '⭐ 縁の角とは、縁の線と線が出会う継ぎ目の描き方である —— 丸めは継ぎ目を丸く、角張りは継ぎ目を尖らせる。'
const T_269_MILESTONE_SIGN = '⭐ マイルストーンの上の「掴めることの合図」（同じく `IN-2`）は、`PK-5` と `PK-6` に置き換わる。'

const T_269 = specTable('T-269')
const NAME = '名前'
const INK = '中 ／ 縁'
const CORNER = '縁の角'
const SIZE = '大きさ'
const HOTSPOT = '押さえる点'

const cellOf = (row: string, heading: string): string => {
  const cell = specRow('T-269', row).by[heading]
  if (cell === undefined) throw new Error(`table T-269 has no column ${heading}`)
  return cell
}

const PK_ROWS = T_269.rows.map((one) => one.id)
const ENVIRONMENT_ROWS = PK_ROWS.filter((row) => cellOf(row, SIZE).includes('環境のまま'))
const IMAGE_ROWS = PK_ROWS.filter((row) => !ENVIRONMENT_ROWS.includes(row))

const INK_BY_WORD: Readonly<Record<string, string>> = { '白': '#ffffff', '黑': '#000000' }

const inksOf = (row: string): { readonly fill: string | null; readonly stroke: string | null } => {
  const parts = cellOf(row, INK).split('／').map((one) => one.trim())
  return { fill: INK_BY_WORD[parts[0] ?? ''] ?? null, stroke: INK_BY_WORD[parts[1] ?? ''] ?? null }
}

const sizeRowOf = (row: string): string => {
  const found = /`(S-\d+)`/.exec(cellOf(row, SIZE))
  if (found === null) throw new Error(`table T-269 row ${row} names no S row for its size`)
  return found[1] ?? ''
}

const sizeNumbersOf = (row: string): readonly number[] => {
  const id = sizeRowOf(row)
  const cell = specRow('T-206', id).by['既定'] ?? ''
  return (cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

// see T-269
const FALLBACK_BY_ROW = ((): Readonly<Record<string, string>> => {
  const out: Record<string, string> = {}
  for (const found of T_269_FALLBACKS.matchAll(/([^、—]+?)は `([a-z-]+)`/g)) {
    const words = found[1] ?? ''
    const keyword = found[2] ?? ''
    for (const row of IMAGE_ROWS) {
      // WHY: any part of the name, not the first: the clause tells the two circles apart by their
      // WHY: sign alone, so a row keyed on its leading word would reach neither of them.
      const parts = cellOf(row, NAME)
        .split(/[\s／]+/)
        .filter((one) => one !== '')
      if (parts.some((one) => words.includes(one))) out[row] = keyword
    }
  }
  return out
})()

afterEach(restoreAnimationFrames)

interface Cursor {
  readonly svg: string
  readonly hotspot: Point
  readonly fallback: string
}

// WHY: the seam does not spell its return type, so a string and an object that
// WHY: carries one both read here; what is asserted is the cursor it states.
const cursorTextOf = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  if (value === null || typeof value !== 'object') return null
  for (const held of Object.values(value as Record<string, unknown>)) {
    if (typeof held === 'string' && held.includes('url(')) return held
  }
  return null
}

const cursorOf = (written: string | null): Cursor | null => {
  if (written === null) return null
  const found =
    /^url\((['"]?)(data:image\/svg\+xml[^)]*?)\1\)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*,\s*([\w-]+)\s*$/.exec(
      written.trim(),
    )
  if (found === null) return null
  const data = found[2] ?? ''
  const comma = data.indexOf(',')
  const head = data.slice(0, comma)
  const body = data.slice(comma + 1)
  const svg = head.endsWith(';base64') ? Buffer.from(body, 'base64').toString('utf8') : decodeURIComponent(body)
  return { svg, hotspot: { x: Number(found[3]), y: Number(found[4]) }, fallback: found[5] ?? '' }
}

const attributeOf = (tag: string, name: string): string | null =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? new RegExp(`\\s${name}='([^']*)'`).exec(tag)?.[1] ?? null

const paintOf = (tag: string, name: 'fill' | 'stroke'): string | null => {
  const style = attributeOf(tag, 'style') ?? ''
  const fromStyle = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(style)?.[1]?.trim()
  const raw = (fromStyle ?? attributeOf(tag, name) ?? '').toLowerCase()
  const named: Readonly<Record<string, string>> = {
    white: '#ffffff',
    black: '#000000',
    '#fff': '#ffffff',
    '#000': '#000000',
  }
  return raw === '' ? null : (named[raw] ?? raw)
}

const drawnTagsOf = (svg: string): readonly string[] =>
  [...svg.matchAll(/<(path|polygon|polyline|line|rect|circle|ellipse)\b[^>]*>/g)].map((one) => one[0])

const sidesOf = (svg: string): readonly number[] => {
  const root = /<svg\b[^>]*>/.exec(svg)?.[0] ?? ''
  return [Number(attributeOf(root, 'width') ?? Number.NaN), Number(attributeOf(root, 'height') ?? Number.NaN)]
}

// WHY: an image authored on a grid of its own renders its stroke at the grid's scale, so the
// WHY: attribute is read back through that scale -- S-297 is a width on the screen, not in the grid.
const drawnScaleOf = (svg: string): number => {
  const root = /<svg\b[^>]*>/.exec(svg)?.[0] ?? ''
  const box = (attributeOf(root, 'viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  const [width] = sidesOf(svg)
  const across = box.length === 4 ? (box[2] ?? Number.NaN) : Number.NaN
  return Number.isFinite(across) && across > 0 ? (width ?? Number.NaN) / across : 1
}

const roundedTo = (value: number, places: number): number => Number(value.toFixed(places))

const seamOf = async (name: string): Promise<(...args: never[]) => unknown> => {
  const loaded = (await import('../../src/framework/single-html-shell/frame-loop')) as unknown as Record<
    string,
    unknown
  >
  const found = loaded[name]
  if (typeof found !== 'function') {
    throw new Error(`seam S7: frame-loop.ts exports no ${name} (it is the pure function table T-269 is read through)`)
  }
  return found as (...args: never[]) => unknown
}

const imageOf = async (row: string): Promise<Cursor | null> => {
  const pointerImageOf = await seamOf('pointerImageOf')
  return cursorOf(cursorTextOf(pointerImageOf(row as never)))
}

const built = (): Stage => stage(benchDocument())

const hover = (one: Stage, place: Point): string | null => {
  one.send(pointer('move', place.x, place.y))
  const all = one.shown()
  return all.length === 0 ? null : (all[all.length - 1] ?? null)
}

const planEndPoint = (one: Stage): Point => {
  const frame = frameOf(one.loop)
  return pointAnswering(scanGrabAreas(frame.geometry, BAR_UID, frame.rowArea), 'GA-2')
}

const planStartPoint = (one: Stage): Point => {
  const frame = frameOf(one.loop)
  return pointAnswering(scanGrabAreas(frame.geometry, BAR_UID, frame.rowArea), 'GA-1')
}

describe('CR-430 -- the manuscript these cases are driven by', () => {
  it.each([
    FR_106_HOLDS_WHILE_PRESSED,
    FR_106_MARKER_IS_A_FINGER,
    T_269_ONE_EDGE_WIDTH,
    T_269_WHITE_IS_PLAN,
    T_269_NO_DISPLAY_SCALE,
    T_269_FALLBACKS,
    T_269_ARMED_WINS,
    T_269_MILESTONE_SIGN,
  ])('still says it, word for word: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-269 holds PK-1 to PK-9', () => {
    expect(PK_ROWS).toEqual(['PK-1', 'PK-2', 'PK-3', 'PK-4', 'PK-5', 'PK-6', 'PK-7', 'PK-8', 'PK-9'])
  })

  it('two of the nine take the environment shape, and the seven others name an S row', () => {
    expect(ENVIRONMENT_ROWS).toEqual(['PK-7', 'PK-8'])
    for (const row of IMAGE_ROWS) expect(sizeNumbersOf(row).length, `${row}: ${cellOf(row, SIZE)}`).toBeGreaterThan(0)
  })
})

describe('control -- a quotation this file leans on can go red', () => {
  it('one character off the edge-width rule is not in the manuscript', () => {
    expect(REQUIREMENTS).not.toContain(T_269_ONE_EDGE_WIDTH.replace('S-297', 'S-298'))
  })
})

describe('table T-269 -- the image each row draws', () => {
  it.each(IMAGE_ROWS)(`%s: its side is the size table T-269 names`, async (row) => {
    const cursor = await imageOf(row)
    expect(cursor, `${row}: ${cellOf(row, SIZE)}`).not.toBeNull()
    const wanted = sizeNumbersOf(row)
    for (const side of sidesOf(cursor!.svg)) {
      expect(wanted, `${row}: ${cellOf(row, SIZE)} (${sizeRowOf(row)})`).toContain(side)
    }
  })

  it.each(IMAGE_ROWS)(`%s: the paint is what 中 ／ 縁 says: ${T_269_WHITE_IS_PLAN}`, async (row) => {
    const inks = inksOf(row)
    const cursor = await imageOf(row)
    expect(cursor, `${row}: ${cellOf(row, INK)}`).not.toBeNull()
    const tags = drawnTagsOf(cursor!.svg)
    const fills = new Set(tags.map((tag) => paintOf(tag, 'fill')).filter((one) => one !== null && one !== 'none'))
    const strokes = new Set(tags.map((tag) => paintOf(tag, 'stroke')).filter((one) => one !== null && one !== 'none'))
    if (inks.fill !== null) expect(fills, `${row}: ${cellOf(row, INK)}`).toEqual(new Set([inks.fill]))
    if (inks.stroke !== null) expect(strokes, `${row}: ${cellOf(row, INK)}`).toEqual(new Set([inks.stroke]))
  })

  it.each(IMAGE_ROWS)(`%s: one edge width for every shape: ${T_269_ONE_EDGE_WIDTH}`, async (row) => {
    const cursor = await imageOf(row)
    expect(cursor, row).not.toBeNull()
    const scale = drawnScaleOf(cursor!.svg)
    const widths = new Set(
      drawnTagsOf(cursor!.svg)
        .map((tag) => attributeOf(tag, 'stroke-width'))
        .filter((one): one is string => one !== null)
        .map((one) => roundedTo(Number(one) * scale, 6)),
    )
    expect([...widths], `${row}: ${T_269_ONE_EDGE_WIDTH}`).toEqual([roundedTo(sizePx('S-297'), 6)])
  })

  it.each(IMAGE_ROWS.filter((row) => cellOf(row, HOTSPOT) === '中心'))(
    '%s: the hotspot is the centre of the image',
    async (row) => {
      const cursor = await imageOf(row)
      expect(cursor, row).not.toBeNull()
      const [width, height] = sidesOf(cursor!.svg)
      expect([cursor!.hotspot.x, cursor!.hotspot.y], `${row}: ${cellOf(row, HOTSPOT)}`).toEqual([
        (width ?? 0) / 2,
        (height ?? 0) / 2,
      ])
    },
  )

  it.each(IMAGE_ROWS.filter((row) => cellOf(row, HOTSPOT) !== '中心'))(
    '%s: the hotspot is a point of the image, not off it',
    async (row) => {
      const cursor = await imageOf(row)
      expect(cursor, `${row}: ${cellOf(row, HOTSPOT)}`).not.toBeNull()
      const [width, height] = sidesOf(cursor!.svg)
      expect(cursor!.hotspot.x, `${row}: ${cellOf(row, HOTSPOT)}`).toBeLessThanOrEqual(width ?? 0)
      expect(cursor!.hotspot.y, `${row}: ${cellOf(row, HOTSPOT)}`).toBeLessThanOrEqual(height ?? 0)
    },
  )

  it.each(IMAGE_ROWS)(`%s: the environment shape it falls back to: ${T_269_FALLBACKS}`, async (row) => {
    const wanted = FALLBACK_BY_ROW[row]
    expect(wanted, `${row}: the closing clause of table T-269 names no fallback`).toBeDefined()
    const cursor = await imageOf(row)
    expect(cursor, row).not.toBeNull()
    expect(cursor!.fallback, `${row}: ${T_269_FALLBACKS}`).toBe(wanted)
  })

  it.each(ENVIRONMENT_ROWS)('%s: no image is drawn -- the environment keeps its own', async (row) => {
    const pointerImageOf = await seamOf('pointerImageOf')
    const written = cursorTextOf(pointerImageOf(row as never))
    expect(cursorOf(written), `${row}: ${cellOf(row, SIZE)}`).toBeNull()
  })

  it(`the 縁の角 column: ${T_269_CORNER_MEANS}`, async () => {
    expect(REQUIREMENTS, T_269_CORNER_MEANS).toContain(T_269_CORNER_MEANS)
    const corners = new Set(IMAGE_ROWS.map((row) => cellOf(row, CORNER)))
    expect([...corners].sort(), T_269_CORNER_MEANS).toEqual(['—', '丸め', '角張り'])
    for (const row of IMAGE_ROWS) {
      const corner = cellOf(row, CORNER)
      if (corner !== '丸め' && corner !== '角張り') continue
      const cursor = await imageOf(row)
      expect(cursor, row).not.toBeNull()
      const joins = new Set(
        drawnTagsOf(cursor!.svg)
          .map((tag) => attributeOf(tag, 'stroke-linejoin'))
          .filter((one): one is string => one !== null),
      )
      expect([...joins], `${row}: ${T_269_CORNER_MEANS}`).toEqual([corner === '丸め' ? 'round' : 'miter'])
    }
  })
})

describe('table T-266 -- the pointer row each grab area shows', () => {
  it.each(grabAreaRows())('%s shows the table T-269 row that table T-266 names', async (grabArea) => {
    const pointerRowOf = await seamOf('pointerRowOf')
    const hit = { item: { kind: 'task', taskUid: BAR_UID }, grab: grabArea }
    expect(pointerRowOf(hit as never, false as never), `${grabArea}: table T-266 names ${pointerRowFor(grabArea)}`).toBe(
      pointerRowFor(grabArea),
    )
  })

  it(`GA-18 is a finger: ${FR_106_MARKER_IS_A_FINGER}`, () => {
    expect(pointerRowFor('GA-18'), FR_106_MARKER_IS_A_FINGER).toBe('PK-7')
  })

  it(`the milestone rows show the circles: ${T_269_MILESTONE_SIGN}`, () => {
    expect([pointerRowFor('GA-15'), pointerRowFor('GA-16'), pointerRowFor('GA-17')], T_269_MILESTONE_SIGN).toEqual([
      'PK-5',
      'PK-6',
      'PK-6',
    ])
  })

  it(`${T_269_ARMED_WINS}`, async () => {
    const pointerRowOf = await seamOf('pointerRowOf')
    const hit = { item: { kind: 'task', taskUid: BAR_UID }, grab: 'GA-2' }
    expect(pointerRowOf(hit as never, true as never), T_269_ARMED_WINS).toBeNull()
  })
})

describe('FR-106 -- what the product writes under the pointer', () => {
  it('the image a hover over GA-2 writes is the PK row table T-266 names, facing the way it names', async () => {
    const one = built()
    const atEnd = cursorOf(hover(one, planEndPoint(one)))
    const atStart = cursorOf(hover(built(), planStartPoint(one)))
    const seam = await imageOf(pointerRowFor('GA-2'))
    expect(seam, `seam S7 for ${pointerRowFor('GA-2')}`).not.toBeNull()
    expect(atEnd, 'the loop wrote no image for GA-2').not.toBeNull()
    expect(atStart, 'the loop wrote no image for GA-1').not.toBeNull()
    expect(pointerRowFor('GA-1'), T_269_TWO_HEADINGS).toBe(pointerRowFor('GA-2'))
    expect(sidesOf(atEnd!.svg), `GA-2 shows ${pointerRowFor('GA-2')}`).toEqual(sidesOf(seam!.svg))
    expect(atEnd!.fallback, `GA-2 shows ${pointerRowFor('GA-2')}`).toBe(seam!.fallback)
    expect(atStart!.svg, T_269_TWO_HEADINGS).toBe(seam!.svg)
    expect(atEnd!.svg, T_269_TWO_HEADINGS).not.toBe(atStart!.svg)
  })

  it(`${T_269_NO_DISPLAY_SCALE}`, () => {
    const shapes = [50, 200].map((displayScale) => {
      const one = stage(benchDocument({ displayScale }))
      return cursorOf(hover(one, planEndPoint(one)))
    })
    expect(shapes[0], 'the loop wrote no image at display scale 50').not.toBeNull()
    expect(shapes[1], 'the loop wrote no image at display scale 200').not.toBeNull()
    expect(sidesOf(shapes[1]!.svg), T_269_NO_DISPLAY_SCALE).toEqual(sidesOf(shapes[0]!.svg))
  })

  it(`${FR_106_HOLDS_WHILE_PRESSED}`, () => {
    const one = built()
    const place = planEndPoint(one)
    const before = cursorOf(hover(one, place))
    expect(before, 'the loop wrote no image for GA-2').not.toBeNull()
    one.send(pointer('down', place.x, place.y))
    one.send(pointer('move', xOfDay(one.loop, april(2)), frameOf(one.loop).rowArea.y1 - 2))
    const during = one.shown()
    expect(cursorOf(during[during.length - 1] ?? null)?.svg, FR_106_HOLDS_WHILE_PRESSED).toBe(before!.svg)
  })
})
