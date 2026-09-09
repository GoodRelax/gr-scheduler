// Anchor for one ledger row about the LENGTH of GR-21's grip.
//
//   D-405 -- measured 2026-09-08 by breaking the unit on purpose: halving the
//            grip's length took ZERO cases red, taking the floor away took ZERO
//            red, and returning the grip to the whole lane took ZERO red. Only
//            a length of nought turned anything red (two cases), so the ONE
//            thing held about GR-21's length was that it is not zero.
//
// Unit under test:
//   UF-61  `screen-frame.ts` (CP-37 of table T-062) -- `screenFrameFromRegions`,
//          where the grip's rectangle is decided.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// THE ROW THIS FILE ANSWERS TO (rule 03 section 3: name the row; the clause is
// quoted because holding it verbatim is the point)
// ---------------------------------------------------------------------------
//
//   T-023d GR-21  the grip is 「帯の中の、いま見えている範囲を表す区間」, and:
//                 ⭐ 「長さは、帯の長さに対する『見えている範囲 ÷ 全体』の割合と
//                    すること（MUST）」 -- 「新しい設定値を立てない（割合は既に
//                    ある値から導ける）」
//                 ⭐ 「ただし長さの下限を `S-205` とすること（MUST）」 -- 「帯の
//                    太さの下限と同じ値を使うのは、最小のつまみを正方形にするため
//                    であり、新しい値を発明しないためである」
//                 ⛔ 「下限を置かなければ、行の多い文書でつまみが 0px になり、
//                    掛ける手が無くなる」
//   T-206 S-205   the floor that clause names, read out of the manuscript here
//   FR-098        the pinned band, and LF-14 of table T-221, which leave the
//                 SCROLLING rows the remainder of the `Row Area` -- so 「見えて
//                 いる範囲」 downwards is that remainder and not the lane
//   T-031 SC-4    both bars are drawn whether the content fits or not
//   FR-052        what the `Row Area` gives up on its right is the lane plus
//                 `canvasPadding`, which is how the fixture below cuts a lane
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - WHERE along the lane the grip sits. That is the 区間's start, and
//     `tests/unit/d-298-d-420-gr-21-the-grip-starts-and-follows.test.ts` holds
//     it. ⛔ These cases read `thumb.width` / `thumb.height` and never a corner.
//   - What a press on the LANE OUTSIDE the grip does. GR-21 says of itself
//     「つまみの外の帯を押したときの振る舞いは、本行は定めない（未決）」.
//   - The lane's THICKNESS. FR-051 settles that from the environment, and
//     `tests/unit/uf-61.test.ts` holds it.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it } from 'vitest'

import { screenFrameFromRegions } from '../../src/adapter/screen-renderer/screen-frame'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable, type SpecTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at read time rather than copied (Chapter 1.9)
// ---------------------------------------------------------------------------

const T_206: SpecTable = specTable('T-206')

/** The default one row of table T-206 states, as a number of pixels. */
function settingOf(id: string): number {
  const row = T_206.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  // ⚠️ THE CELL CARRIES MORE THAN THE NUMBER. Table T-206 prints a unit and, on
  // some rows, a mark beside it, so the figure is taken and the rest left --
  // ⛔ never the whole cell coerced, which would answer `NaN` in silence.
  const spelled = bare(row.cells[1] ?? '')
  const figure = /-?\d+(?:\.\d+)?/.exec(spelled)
  if (figure === null) {
    throw new Error(`table T-206 row ${id} no longer states a number: ${spelled}`)
  }
  return Number(figure[0])
}

/** `S-205` -- the floor GR-21 (MUST) gives the grip's length. */
const GRIP_FLOOR_PX = settingOf('S-205')

// ---------------------------------------------------------------------------
// The regions, cut the way FR-052's arithmetic reads backwards
// ---------------------------------------------------------------------------

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

const LANE_THICKNESS = 10
const CANVAS_PADDING = 4
const ROW_AREA = rect(200, 100, 800, 400)

const REGIONS: ScreenRegions = {
  appHeader: rect(0, 0, 1400, 40),
  rowTitlePanel: rect(20, 100, 180, 400),
  timeRuler: rect(200, 60, 800, 40),
  rowArea: ROW_AREA,
  scheduleCanvas: rect(20, 60, 1180, 440),
  propertiesPanel: rect(
    ROW_AREA.x + ROW_AREA.width + LANE_THICKNESS + CANVAS_PADDING,
    100,
    186,
    400,
  ),
}

const SETTINGS = { canvasPadding: CANVAS_PADDING } as unknown as DocumentSettings
const STATE = { fullScreen: false } as unknown as ScreenState

/**
 * A session carrying one `ScrollExtent`.
 *
 * ⚠️ Only the members the frame reads are filled. ⛔ The fake decides nothing:
 * every expected number below is worked out from GR-21's own clause.
 */
const sessionWith = (extent: {
  contentWidth: number
  contentHeight: number
  visibleHeight: number
  offsetX?: number
  offsetY?: number
}): any => ({
  notices: [],
  mergeCandidates: [],
  droppedTaskNames: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: extent,
})

const barOf = (session: any, axis: 'horizontal' | 'vertical') => {
  const found = screenFrameFromRegions(REGIONS, SETTINGS, STATE, session).scrollbars.find(
    (one) => one.axis === axis,
  )
  if (found === undefined) throw new Error(`SC-4 of table T-031 draws no ${axis} bar`)
  return found
}

// ===========================================================================
// The manuscript still says what these cases read
// ===========================================================================

describe('the row this file is driven by is still in the manuscript', () => {
  it('⭐ S-205 reaches the manuscript as a positive number of pixels', () => {
    expect(GRIP_FLOOR_PX).toBeGreaterThan(0)
  })

  it('⭐ the lane these cases cut is longer than that floor', () => {
    // ⚠️ WITHOUT THIS THE FIRST CASE IS VACUOUS: a lane shorter than the floor
    // would put every grip AT the floor, and the fraction would never be seen.
    expect(ROW_AREA.width).toBeGreaterThan(GRIP_FLOOR_PX)
    expect(ROW_AREA.height).toBeGreaterThan(GRIP_FLOOR_PX)
  })
})

// ===========================================================================
// D-405 -- the three things about the length that nothing held
// ===========================================================================

describe('D-405 / GR-21 (MUST): the grip is 見えている範囲 ÷ 全体 of its lane', () => {
  it('⭐⭐ ① an overflowing document gets a grip of exactly that fraction', () => {
    // ⛔⛔ THE TWO BREAKAGES THIS CASE IS WRITTEN FOR, both measured as taking
    // ZERO cases red on 2026-09-08: HALVING the length, and giving the grip the
    // WHOLE lane. A quarter of the content is on screen in each direction, so a
    // quarter of the lane is the grip -- 200px sideways and 100px downwards.
    const session = sessionWith({
      contentWidth: ROW_AREA.width * 4,
      contentHeight: ROW_AREA.height * 4,
      visibleHeight: ROW_AREA.height,
    })
    const sideways = barOf(session, 'horizontal')
    const downwards = barOf(session, 'vertical')

    expect(sideways.thumb.width).toBeCloseTo(sideways.track.width / 4, 6)
    expect(downwards.thumb.height).toBeCloseTo(downwards.track.height / 4, 6)
  })

  it('⭐⭐ ② a document of many rows still gets a grip of at least S-205', () => {
    // ⛔⛔ THE THIRD BREAKAGE, also ZERO red: taking the floor away. GR-21 says
    // why in as many words -- 「下限を置かなければ、行の多い文書でつまみが 0px に
    // なり、掛ける手が無くなる」. A thousand screenfuls of rows is that document.
    const session = sessionWith({
      contentWidth: ROW_AREA.width,
      contentHeight: ROW_AREA.height * 1000,
      visibleHeight: ROW_AREA.height,
    })
    const downwards = barOf(session, 'vertical')

    // ⚠️ THE FRACTION ALONE WOULD BE 0.4px HERE, which is what makes this case
    // the floor's and not the fraction's.
    expect(downwards.track.height * (1 / 1000)).toBeLessThan(GRIP_FLOOR_PX)
    expect(downwards.thumb.height).toBe(GRIP_FLOOR_PX)
  })

  it('⭐⭐ ③ pinning rows does not GROW the downwards fraction', () => {
    // ⛔⛔ FR-098 AND LF-14 OF TABLE T-221: the pinned band stands inside the
    // `Row Area` and the scrolling rows get the remainder, so 「見えている範囲」
    // downwards SHRINKS as rows are pinned while 「全体」 does not move. ⛔ A
    // build that read the lane's own height for it would answer the same grip
    // however much of the `Row Area` the band had taken -- overstating the
    // fraction by exactly the band.
    const whole = ROW_AREA.height * 4
    const nonePinned = barOf(
      sessionWith({
        contentWidth: ROW_AREA.width,
        contentHeight: whole,
        visibleHeight: ROW_AREA.height,
      }),
      'vertical',
    )
    const bandTakesHalf = barOf(
      sessionWith({
        contentWidth: ROW_AREA.width,
        contentHeight: whole,
        visibleHeight: ROW_AREA.height / 2,
      }),
      'vertical',
    )

    expect(bandTakesHalf.thumb.height).toBeLessThan(nonePinned.thumb.height)
    expect(bandTakesHalf.thumb.height).toBeCloseTo(nonePinned.thumb.height / 2, 6)
    // ⚠️ THE LANE ITSELF DID NOT MOVE, which is what makes the line above about
    // the fraction rather than about the rectangle it is measured in.
    expect(bandTakesHalf.track.height).toBe(nonePinned.track.height)
  })

  it('⛔ THE CONTROL: a document that fits gets the whole lane, and no more', () => {
    // ⚠️ WITHOUT THIS, A BUILD THAT ALWAYS ANSWERED A QUARTER WOULD PASS ①.
    // SC-4 of table T-031 keeps the bar drawn when everything fits, and 「見えて
    // いる範囲 ÷ 全体」 is then one -- ⛔ never more, which would run the grip
    // past the end of the lane it has to be grabbed in.
    const session = sessionWith({
      contentWidth: ROW_AREA.width,
      contentHeight: ROW_AREA.height,
      visibleHeight: ROW_AREA.height,
    })
    const sideways = barOf(session, 'horizontal')
    const downwards = barOf(session, 'vertical')

    expect(sideways.thumb.width).toBe(sideways.track.width)
    expect(downwards.thumb.height).toBe(downwards.track.height)
  })
})
