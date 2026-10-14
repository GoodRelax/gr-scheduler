// CR-740 from docs/spec only: FR-102 / T-263 IR-4 -- each frame line counts the picture beneath joined with the overlay, never the string (DFC-2447).

import { afterEach, describe, expect, it } from 'vitest'

import { elementCounts, pointer, REQUIREMENTS, restoreAnimationFrame, stage, wholeRow } from './cr-740-stage'

const IR_4 = wholeRow('T-263', 'IR-4')
const IR_4_COUNTS = '下の絵と重ねの絵（05-07-design.md の 表 T-065 の IF-1）をつないだ SVG の文字列について、字数と、要素の名ごとの数を、フレームごとに書くこと（MUST）'
const IR_4_THE_RECTANGLE_STAYS = '範囲選択のあいだも、重ねに出した矩形が記録から消えない'
const IR_4_NOT_THE_STRING = '文字列そのものを書いてはならない（MUST NOT）'
const RECORD_ENTRANCE = 'IC-76'

afterEach(restoreAnimationFrame)

describe('CR-740 the manuscript these cases are driven by', () => {
  it.each([IR_4_COUNTS, IR_4_THE_RECTANGLE_STAYS, IR_4_NOT_THE_STRING])('T-263 IR-4 holds %s', (clause) => {
    expect(IR_4).toContain(clause)
  })

  it('FR-102 points at IR-4 for the shape of the drawn picture, and records a frame line for every frame drawn', () => {
    expect(REQUIREMENTS).toContain('記録するのは、操作と、表 T-263 の画面の状態（描かれた絵の形は同表の `IR-4`）だけとする（MUST）')
    expect(REQUIREMENTS).toContain('画面の状態は、描いたフレームごとに書くこと（MUST）')
  })
})

interface FrameLine {
  readonly line: string
  readonly values: ReadonlyMap<string, string>
}

/** @purity pure */
function frameLinesOf(record: string): readonly FrameLine[] {
  return record
    .split('\n')
    .filter((line) => line.split('\t')[2] === 'frame')
    .map((line) => ({
      line,
      values: new Map(
        (line.split('\t')[3] ?? '')
          .split(' ')
          .map((token) => token.split('='))
          .filter((pair) => pair.length === 2)
          .map((pair) => [pair[0] as string, pair[1] as string] as [string, string]),
      ),
    }))
}

const OVERLAY_NAMES = ['svg', 'rect'] as const

/** @purity pure */
function writesTheLength(frame: FrameLine, svg: string): boolean {
  return [...frame.values.values()].includes(String(svg.length))
}

/** @purity pure */
function countsTheNames(frame: FrameLine, svg: string, names: readonly string[]): boolean {
  const counts = elementCounts(svg)
  return names.every((name) => frame.values.get(name) === String(counts.get(name) ?? 0))
}

/** @purity pure */
function namesMiscounted(frame: FrameLine, svg: string): readonly string[] {
  return [...elementCounts(svg)].filter(([name, count]) => frame.values.get(name) !== String(count)).map(([name]) => name)
}

interface Recorded {
  readonly record: string
  readonly beneath: string
  readonly overlays: readonly string[]
  readonly beneathAfterRelease: string
}

/** @purity non-pure */
function recordedRangeSelection(): Recorded {
  const one = stage()
  const [from, ...path] = one.ground()
  one.send(pointer('move', from!.x, from!.y))
  one.press(RECORD_ENTRANCE)
  one.send(pointer('move', from!.x, from!.y))
  one.send(pointer('down', from!.x, from!.y))
  for (const at of path) one.send(pointer('move', at.x, at.y))
  const beneath = one.beneathNow()
  const overlays = one.calls.filter((call) => call.mouth === 'showMarqueeOverlaySvg' && call.svg !== '').map((call) => call.svg)
  const end = path[path.length - 1]!
  one.send(pointer('up', end.x, end.y))
  one.send(pointer('move', end.x, end.y))
  const beneathAfterRelease = one.beneathNow()
  one.press(RECORD_ENTRANCE)
  const record = one.records[one.records.length - 1]
  if (record === undefined) throw new Error('premise: stopping the record handed it to the clipboard (FR-102)')
  return { record, beneath, overlays, beneathAfterRelease }
}

describe(`T-263 IR-4 -- ${IR_4_COUNTS}`, () => {
  it(`${IR_4_THE_RECTANGLE_STAYS}: every rectangle drawn while held has a frame line counting the picture beneath joined with it`, () => {
    const { record, beneath, overlays } = recordedRangeSelection()
    const lines = frameLinesOf(record)
    expect(overlays.length, 'premise: the held rectangle reached the overlay mouth').toBeGreaterThan(0)
    for (const overlay of overlays) {
      const joined = beneath + overlay
      expect(
        lines.some((frame) => writesTheLength(frame, joined) && countsTheNames(frame, joined, OVERLAY_NAMES)),
        `${IR_4_COUNTS} -- no frame line counts ${joined.length} characters and the svg and rect elements of the two joined`,
      ).toBe(true)
    }
  })

  it('the ZO-6 rectangle is counted: a held frame counts more rect elements than the picture beneath alone holds', () => {
    const { record, beneath, overlays } = recordedRangeSelection()
    const rectsBeneath = elementCounts(beneath).get('rect') ?? 0
    const rectsOverlay = elementCounts(overlays[0] ?? '').get('rect') ?? 0
    expect(rectsOverlay, 'premise: SL-3 draws the rectangle as a rect').toBeGreaterThan(0)
    const counted = frameLinesOf(record).map((frame) => Number(frame.values.get('rect') ?? '0'))
    expect(counted, IR_4_THE_RECTANGLE_STAYS).toContain(rectsBeneath + rectsOverlay)
  })

  it('after release the overlay part is gone: the last frame line counts the picture beneath alone', () => {
    const { record, beneathAfterRelease, overlays } = recordedRangeSelection()
    const lines = frameLinesOf(record)
    const last = lines[lines.length - 1]
    expect(last, 'premise: frames were drawn after the release').toBeDefined()
    expect(
      writesTheLength(last as FrameLine, beneathAfterRelease) && countsTheNames(last as FrameLine, beneathAfterRelease, OVERLAY_NAMES),
      'ZO-6: the rectangle goes on release, and so does its count',
    ).toBe(true)
    const lastOverlay = overlays[overlays.length - 1] ?? ''
    expect([...(last as FrameLine).values.values()]).not.toContain(String((beneathAfterRelease + lastOverlay).length))
  })
})

describe(`T-263 IR-4 -- every element name of the joined string is counted (要素の名ごとの数)`, () => {
  it('a held frame line and the frame line after release each count every element name their picture holds', () => {
    const { record, beneath, overlays, beneathAfterRelease } = recordedRangeSelection()
    const lines = frameLinesOf(record)
    const joined = beneath + (overlays[overlays.length - 1] ?? '')
    const held = lines.find((frame) => writesTheLength(frame, joined))
    expect(held, 'premise: a frame line was written for the last held rectangle').toBeDefined()
    expect(namesMiscounted(held as FrameLine, joined), IR_4_COUNTS).toEqual([])
    expect(namesMiscounted(lines[lines.length - 1] as FrameLine, beneathAfterRelease), IR_4_COUNTS).toEqual([])
  })
})

describe(`T-263 IR-4 / FR-102 -- ${IR_4_NOT_THE_STRING}`, () => {
  it('the record holds no piece of either picture string', () => {
    const { record, beneath, overlays } = recordedRangeSelection()
    expect(record).not.toContain('<svg')
    expect(record).not.toContain('<rect')
    expect(record).not.toContain('viewBox')
    expect(record).not.toContain('stroke-dasharray')
    expect(record.includes(beneath)).toBe(false)
    for (const overlay of overlays) expect(record.includes(overlay)).toBe(false)
  })
})
