// CR-401 / CR-402 / CR-403: the band side of FR-016's row-axis ceiling, sought by an oracle that walks table T-253.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  fitZoom,
  layoutFromSchedule,
  rowPlacesAtZoomY,
  zoomYAtRectangleLabelFont,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { rowTitleFontPxOf } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  commandFromInput,
  rowBandCeilingOf,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { bare, specTable, unbroken } from '../contract/spec-table'

type Settings = Parameters<typeof regionsFromScreen>[1]
type Plan = Parameters<typeof layoutFromSchedule>[0]

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_016_SOUGHT_BY_T_253 =
  'いちばん高い行の帯の高さが、初めて `Row Area` の高さ以上になった倍率とし、その倍率を 表 T-253 の手順で探すこと（MUST）'

const FR_016_NOT_FROM_THE_START = '⭐ 行の軸の上限は、拡大を始めた倍率に依らないこと（MUST）'

const FR_016_THE_SMALLER = '⭐ 行の軸の上限は、上の倍率と、次の倍率の小さい方とすること（MUST）'

const FR_016_ASK_PI_5_FOR_THE_BAND =
  '⭐ いちばん高い行の帯も、同表の `PI-5` の `rowPlacesAtZoomY` に問うて求めること（MUST）'

const FR_016_THE_BAND_MOVES_WITH_THE_SCALE = '⚠️ 帯の側の上限の倍率は、表示の倍率で動く'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-016 (MUST) -- the band side is the first zoom whose band reaches, sought by T-253', FR_016_SOUGHT_BY_T_253],
  ['FR-016 (MUST) -- the ceiling does not depend on where the raise starts', FR_016_NOT_FROM_THE_START],
  ['FR-016 (MUST) -- the ceiling is the smaller of the band side and the text side', FR_016_THE_SMALLER],
  ['FR-016 (MUST) -- the tallest band is asked of PI-5 rowPlacesAtZoomY', FR_016_ASK_PI_5_FOR_THE_BAND],
  ['FR-016 -- the band side moves with the display scale', FR_016_THE_BAND_MOVES_WITH_THE_SCALE],
]

describe('CR-403 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-253 holds BC-1 to BC-5', () => {
    expect(specTable('T-253').rows.map((row) => row.id)).toEqual(['BC-1', 'BC-2', 'BC-3', 'BC-4', 'BC-5'])
  })
})

const numberIn = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.by[column] ?? ''
}

const S_54 = numberIn(cellOf('T-201', 'S-54', '既定値'))
const S_55 = numberIn(cellOf('T-201', 'S-55', '既定値'))
const S_53 = numberIn(cellOf('T-201', 'S-53', '既定値'))
const S_238 = numberIn(cellOf('T-206', 'S-238', '既定'))
const S_239 = numberIn(cellOf('T-206', 'S-239', '既定'))

// see T-253
/** @purity pure */
function probeSequence(): readonly number[] {
  const points = [S_54]
  for (;;) {
    const next = points[points.length - 1]! * S_238
    if (next >= S_55) {
      points.push(S_55)
      return points
    }
    points.push(next)
  }
}

// see FR-016, T-253
function bandCeilingByT253(bandAt: (zoomY: number) => number, rowAreaHeight: number): number {
  const reaches = (zoomY: number): boolean => bandAt(zoomY) >= rowAreaHeight
  const points = probeSequence()
  if (reaches(points[0]!)) return points[0]!
  let lower = Number.NaN
  let upper = Number.NaN
  for (let index = 1; index < points.length; index++) {
    if (reaches(points[index]!)) {
      lower = points[index - 1]!
      upper = points[index]!
      break
    }
  }
  if (Number.isNaN(upper)) return S_55
  while (upper - lower > S_239) {
    const middle = (lower + upper) / 2
    if (reaches(middle)) upper = middle
    else lower = middle
  }
  return upper
}

interface Env {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly scrollbarThickness: number
}

const FULL_HD: Env = { width: 1920, height: 1080, appHeaderHeight: 56, scrollbarThickness: 17 }

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const SOME_DAY = '2026-01-05'

const ordinaryDocument = (): Record<string, any> => structuredClone(TEMPLATE)

function singleRowDocument(taskCount: number): Record<string, any> {
  const doc = structuredClone(TEMPLATE)
  const schedule = doc.schedule
  const row = schedule.taskGroups[0]
  const members = schedule.taskGroupMembers.slice(0, taskCount)
  const kept = new Set(members.map((one: any) => one.taskUid))
  schedule.taskGroups = [{ ...row, height: null }]
  schedule.taskGroupMembers = members.map((one: any) => ({ ...one, groupId: row.id }))
  schedule.tasks = schedule.tasks.filter((task: any) => kept.has(task.uid))
  schedule.taskVisuals = (schedule.taskVisuals ?? []).filter((one: any) => kept.has(one.taskUid))
  return doc
}

const withSettings = (doc: Record<string, any>, part: Record<string, unknown>): Record<string, any> => ({
  ...doc,
  documentSettings: { ...doc.documentSettings, ...part },
})

const namingAPlace = (doc: Record<string, any>, part: Record<string, unknown> = {}): Record<string, any> =>
  withSettings(doc, {
    scrollDate: SOME_DAY,
    scrollGroupId: doc.schedule.taskGroups[0].id,
    ...part,
  })

const namingNoPlace = (doc: Record<string, any>, part: Record<string, unknown> = {}): Record<string, any> =>
  withSettings(doc, { scrollDate: null, scrollGroupId: null, ...part })

interface Built {
  readonly context: any
  readonly settings: Settings
  readonly schedule: Plan
  readonly rowAreaHeight: number
  readonly drawnZoomX: number
}

// see OP-10, FR-055
function build(doc: Record<string, any>, env: Env, atStoredZoom: boolean | undefined, zoomStep = S_53): Built {
  const settings = doc.documentSettings as Settings
  const schedule = doc.schedule as Plan
  const regions = regionsFromScreen(env, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const context = {
    document: doc as never,
    layout,
    geometry: geometryFromLayout(schedule, settings, layout, regions, emptySelection()),
    regions,
    screenState: emptyScreenState(),
    selection: emptySelection(),
    zoomStep,
    zoomMin: S_54,
    zoomMax: S_55,
    ...(atStoredZoom === undefined ? {} : { isPictureAtStoredZoom: atStoredZoom }),
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
    isLevelZeroFolded: false,
  }
  const drawnZoomX =
    atStoredZoom === true
      ? settings.zoomX
      : fitZoom(schedule, settings, regions, { step: zoomStep, min: S_54, max: S_55 }).zoomX
  return { context, settings, schedule, rowAreaHeight: regions.rowArea.height, drawnZoomX }
}

// see FR-016, PI-5
function bandFunctionOf(built: Built, zoomX: number = built.drawnZoomX): (zoomY: number) => number {
  const measuredWith = { ...built.settings, zoomX } as Settings
  const regions = built.context.regions
  return (zoomY: number): number =>
    Math.max(...rowPlacesAtZoomY(built.schedule, measuredWith, regions, zoomY, false).map((row) => row.height))
}

const oracleOf = (built: Built, zoomX?: number): number =>
  bandCeilingByT253(bandFunctionOf(built, zoomX), built.rowAreaHeight)

const textCeilingOf = (settings: Settings): number =>
  zoomYAtRectangleLabelFont(rowTitleFontPxOf(1, settings), settings)

const RAISE_ROWS = {
  kind: 'key',
  key: '+',
  modifiers: { ctrl: false, shift: false, alt: true, meta: false },
}

function zoomYAfterOneRaise(built: Built): number {
  const action = commandFromInput(RAISE_ROWS as never, built.context).action as any
  const before = built.settings.zoomY
  if (action === null || action.kind !== 'changeDocument') return before
  const zooms = (action.writes as readonly (readonly any[])[]).flat().filter((one) => one.kind === 'setZoom')
  if (zooms.length === 0) return before
  return Number(zooms[zooms.length - 1].zoomY ?? before)
}

function raiseUntilItStops(
  doc: Record<string, any>,
  env: Env,
  start: number,
  zoomStep: number,
): { readonly stop: number; readonly highest: number } {
  let zoomY = start
  let highest = start
  for (let press = 0; press < 60; press++) {
    const built = build(withSettings(doc, { zoomY }), env, true, zoomStep)
    const next = zoomYAfterOneRaise(built)
    highest = Math.max(highest, next)
    if (next === zoomY) return { stop: next, highest }
    zoomY = next
  }
  throw new Error(`the raise from ${start} had not stopped after 60 presses`)
}

// WHY: a step coarser than S-53 keeps the presses few; FR-016's ceiling may not
// depend on S-53, so the stop it reaches is the same one.
const COARSE_STEP = 2

// WHY: this many tasks in one row puts the band side under the text side at FULL_HD while the band no longer
// reaches at S-55; the premises re-measure both (after CR-417 / CR-418, 310 to 380 hold, 390 reaches at S-54).
const DENSE_ROW_TASKS = 340

describe('T-253 BC-1 -- the probe sequence the oracle walks', () => {
  it('BC-1: starts at S-54, grows by S-238, and ends on S-55 exactly once (86 points at the defaults, CR-403 7.1)', () => {
    const points = probeSequence()
    expect(points[0]).toBe(S_54)
    expect(points[points.length - 1]).toBe(S_55)
    expect(points.filter((one) => one === S_55)).toHaveLength(1)
    for (let index = 1; index < points.length - 1; index++) {
      expect(points[index]! / points[index - 1]!).toBeCloseTo(S_238, 9)
    }
    expect(points[points.length - 2]!).toBeLessThan(S_55)
    if (S_54 === 0.02 && S_238 === 1.1 && S_55 === 64) expect(points).toHaveLength(86)
  })
})

describe('FR-016 / T-253 (MUST) -- rowBandCeilingOf answers what the table finds', () => {
  it('FR-016 / BC-4 / BC-5 (MUST): the ordinary document at 1920x1080 -- within S-239 of the oracle, on the reaching (upper) side', () => {
    const built = build(namingAPlace(ordinaryDocument()), FULL_HD, true)
    const expected = oracleOf(built)
    const band = bandFunctionOf(built)
    expect(expected, 'premise: the band first reaches inside the range').toBeLessThan(S_55)
    expect(expected, 'premise: not at the lower end').toBeGreaterThan(S_54)
    const answered = rowBandCeilingOf(built.context)
    expect(Math.abs(answered - expected), FR_016_SOUGHT_BY_T_253).toBeLessThanOrEqual(S_239)
    expect(band(answered), 'BC-5: the band at the answer reaches the Row Area').toBeGreaterThanOrEqual(
      built.rowAreaHeight,
    )
  })

  it('FR-016 / BC-3 / BC-5 (MUST): a document folded to a single row at 1920x1080 answers the oracle, not S-55 although the band does not reach at S-55', () => {
    const built = build(namingAPlace(singleRowDocument(DENSE_ROW_TASKS)), FULL_HD, true)
    const band = bandFunctionOf(built)
    const expected = oracleOf(built)
    expect(band(S_55), 'premise: at S-55 the band does not reach').toBeLessThan(built.rowAreaHeight)
    expect(band(S_54), 'premise: at S-54 the band does not reach').toBeLessThan(built.rowAreaHeight)
    expect(expected, 'premise: the band reaches somewhere inside the range').toBeLessThan(S_55)
    const answered = rowBandCeilingOf(built.context)
    expect(answered, FR_016_SOUGHT_BY_T_253).not.toBe(S_55)
    expect(Math.abs(answered - expected), FR_016_SOUGHT_BY_T_253).toBeLessThanOrEqual(S_239)
    expect(band(answered), 'BC-5: the band at the answer reaches the Row Area').toBeGreaterThanOrEqual(
      built.rowAreaHeight,
    )
  })

  it('FR-016 / BC-3 third line (MUST): a band that never reaches, even at S-55, answers S-55', () => {
    const tall: Env = { ...FULL_HD, height: 6000 }
    const built = build(namingAPlace(singleRowDocument(1)), tall, true)
    const band = bandFunctionOf(built)
    for (const point of probeSequence()) {
      expect(band(point), `premise: no BC-1 point reaches (zoomY ${point})`).toBeLessThan(built.rowAreaHeight)
    }
    expect(oracleOf(built)).toBe(S_55)
    expect(rowBandCeilingOf(built.context), FR_016_SOUGHT_BY_T_253).toBe(S_55)
  })

  it('FR-016 / BC-3 second line (MUST): a band that already reaches at S-54 answers S-54', () => {
    const built = build(namingAPlace(singleRowDocument(1000)), FULL_HD, true)
    const band = bandFunctionOf(built)
    expect(band(S_54), 'premise: the band reaches at the lower end').toBeGreaterThanOrEqual(built.rowAreaHeight)
    expect(oracleOf(built)).toBe(S_54)
    expect(rowBandCeilingOf(built.context), FR_016_SOUGHT_BY_T_253).toBe(S_54)
  })

  it('FR-016 / BC-2 (MUST): a band exactly as tall as the Row Area counts as reached', () => {
    const doc = namingAPlace(singleRowDocument(DENSE_ROW_TASKS))
    const first = build(doc, FULL_HD, true)
    const atLowerEnd = bandFunctionOf(first)(S_54)
    let env: Env = { ...FULL_HD, scrollbarThickness: FULL_HD.scrollbarThickness + first.rowAreaHeight - atLowerEnd }
    let built = build(doc, env, true)
    for (let tries = 0; tries < 4 && built.rowAreaHeight !== atLowerEnd; tries++) {
      env = { ...env, scrollbarThickness: env.scrollbarThickness + built.rowAreaHeight - atLowerEnd }
      built = build(doc, env, true)
    }
    expect(built.rowAreaHeight, 'premise: the Row Area height equals the band at S-54').toBe(atLowerEnd)
    expect(bandFunctionOf(built)(S_54), 'premise: the band is unchanged by the narrower bar').toBe(atLowerEnd)
    expect(oracleOf(built)).toBe(S_54)
    expect(rowBandCeilingOf(built.context), FR_016_SOUGHT_BY_T_253).toBe(S_54)
  })
})

describe('FR-016 / T-024a OP-10 (MUST) -- the band is measured at the drawn zoomX', () => {
  it('OP-10: a document naming no place is drawn at the fit-all zoomX, not at its saved zoomX 10, and the ceiling follows the drawn one', () => {
    const doc = namingNoPlace(singleRowDocument(DENSE_ROW_TASKS), { zoomX: 10 })
    const built = build(doc, FULL_HD, undefined)
    expect(built.drawnZoomX, 'premise: fit-all is not the saved zoomX').not.toBeCloseTo(10, 3)
    const atDrawn = oracleOf(built)
    const atSaved = oracleOf(built, 10)
    expect(Math.abs(atDrawn - atSaved), 'premise: the two zoomX give different ceilings').toBeGreaterThan(
      100 * S_239,
    )
    const answered = rowBandCeilingOf(built.context)
    expect(Math.abs(answered - atDrawn), FR_016_SOUGHT_BY_T_253).toBeLessThanOrEqual(S_239)
  })

  it.skip('OP-10 with scrollDate null but scrollGroupId naming a row -- DFC-641 item 5 is open, no expectation is set', () => {})
})

describe('FR-016 (MUST) -- the raise stops at the same zoomY wherever it starts', () => {
  // WHY: every notch re-solves the band ceiling (T-253) without a remembered value; DFC-610
  it('FR-016 (MUST): the single-row document at 1920x1080, raised from ten starts under the ceiling, stops at one and the same zoomY, min(text side, band side), never passing it', () => {
    const doc = namingAPlace(singleRowDocument(DENSE_ROW_TASKS))
    const reference = build(withSettings(doc, { zoomY: S_54 }), FULL_HD, true)
    const bandSide = oracleOf(reference)
    const textSide = textCeilingOf(reference.settings)
    const ceiling = Math.min(bandSide, textSide)
    expect(bandSide, 'premise: the band side is the smaller here').toBeLessThan(textSide)
    const starts = [
      S_54,
      0.05,
      0.1,
      0.25,
      0.5,
      0.8,
      ceiling * 0.9,
      ceiling / COARSE_STEP + 1e-3,
      ceiling - 1e-3,
      ceiling - 10 * S_239,
    ]
    const band = bandFunctionOf(reference)
    const stops = starts.map((start) => {
      expect(start, 'premise: every start is under the ceiling').toBeLessThan(ceiling)
      const reached = raiseUntilItStops(doc, FULL_HD, start, COARSE_STEP)
      expect(reached.highest, `${FR_016_THE_SMALLER} -- from ${start}`).toBeLessThanOrEqual(ceiling + S_239)
      return reached.stop
    })
    for (const [index, stop] of stops.entries()) {
      expect(stop, `${FR_016_NOT_FROM_THE_START} -- from ${starts[index]}`).toBe(stops[0])
      expect(Math.abs(stop - ceiling), `${FR_016_SOUGHT_BY_T_253} -- from ${starts[index]}`).toBeLessThanOrEqual(S_239)
    }
    expect(band(stops[0]!), 'BC-5: the band at the stop reaches the Row Area').toBeGreaterThanOrEqual(
      reference.rowAreaHeight,
    )
  }, 30000)

  // WHY: every notch re-solves the band ceiling (T-253) without a remembered value; DFC-610
  it('FR-016 (MUST): the ordinary document at 1920x1080 stops at one and the same zoomY from eight starts', () => {
    const doc = namingAPlace(ordinaryDocument())
    const reference = build(withSettings(doc, { zoomY: S_54 }), FULL_HD, true)
    const ceiling = Math.min(oracleOf(reference), textCeilingOf(reference.settings))
    const starts = [S_54, 0.1, 0.3, 0.6, 0.9, 1.0, ceiling - 1e-2, ceiling - 10 * S_239]
    const stops = starts.map((start) => raiseUntilItStops(doc, FULL_HD, start, COARSE_STEP).stop)
    for (const [index, stop] of stops.entries()) {
      expect(stop, `${FR_016_NOT_FROM_THE_START} -- from ${starts[index]}`).toBe(stops[0])
      expect(Math.abs(stop - ceiling), `${FR_016_SOUGHT_BY_T_253} -- from ${starts[index]}`).toBeLessThanOrEqual(
        S_239,
      )
    }
  }, 30000)

  it.skip('FR-016: a raise that starts above the ceiling -- DFC-641 item 1 is open, no expectation is set', () => {})
})

describe('FR-016 (MUST) -- a ceiling measured at one display scale is not the answer at another', () => {
  it('FR-016: the single-row document answers the oracle at display scales 33, 50 and 100, and those answers differ (asked of rowBandCeilingOf, not of a remembered value)', () => {
    const doc = namingAPlace(singleRowDocument(DENSE_ROW_TASKS))
    const answers = [33, 50, 100].map((displayScale) => {
      const built = build(withSettings(doc, { displayScale }), FULL_HD, true)
      const expected = oracleOf(built)
      expect(expected, `premise: the band side is under S-55 at ${displayScale}`).toBeLessThan(S_55)
      const answered = rowBandCeilingOf(built.context)
      expect(
        Math.abs(answered - expected),
        `${FR_016_THE_BAND_MOVES_WITH_THE_SCALE} -- ${displayScale}`,
      ).toBeLessThanOrEqual(S_239)
      return expected
    })
    expect(Math.abs(answers[0]! - answers[2]!), 'premise: the band side moves with the scale').toBeGreaterThan(
      100 * S_239,
    )
  })

  it('FR-016: a raise stops at a different zoomY at display scale 50 and 100, each at that scale\'s min(text side, band side)', () => {
    const doc = namingAPlace(singleRowDocument(DENSE_ROW_TASKS))
    const stopAt = (displayScale: number) => {
      const scaled = withSettings(doc, { displayScale })
      const reference = build(withSettings(scaled, { zoomY: S_54 }), FULL_HD, true)
      const bandSide = oracleOf(reference)
      const ceiling = Math.min(bandSide, textCeilingOf(reference.settings))
      const stop = raiseUntilItStops(scaled, FULL_HD, ceiling * 0.9, COARSE_STEP).stop
      if (bandSide === ceiling) {
        expect(bandFunctionOf(reference)(stop), `BC-5: reached at the stop -- ${displayScale}`).toBeGreaterThanOrEqual(
          reference.rowAreaHeight,
        )
      }
      return { ceiling, stop }
    }
    const at50 = stopAt(50)
    const at100 = stopAt(100)
    expect(Math.abs(at50.ceiling - at100.ceiling), 'premise: the two ceilings differ').toBeGreaterThan(100 * S_239)
    expect(Math.abs(at50.stop - at50.ceiling), `${FR_016_THE_BAND_MOVES_WITH_THE_SCALE} -- 50`).toBeLessThanOrEqual(S_239)
    expect(Math.abs(at100.stop - at100.ceiling), `${FR_016_THE_BAND_MOVES_WITH_THE_SCALE} -- 100`).toBeLessThanOrEqual(
      S_239,
    )
  })
})
