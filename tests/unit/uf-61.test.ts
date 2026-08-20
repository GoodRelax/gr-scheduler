// Unit tests for `screenFrameFromRegions` (unit UF-61 of table T-075, component
// CP-37 of table T-062, `screen-frame.ts`).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT TAKING ANYTHING FROM THE UNIT'S BODY
// (docs/development-rules/04-verification.md, section 1). What drives every expected
// value below is docs/spec/ and the declarations a tester may read: the "nine
// unit contracts" section of `screen-renderer.ts`, which fixes this signature,
// and the entity types the arguments are made of. Nothing here was derived from
// how the unit computes its answer.
//
// The rules these cases answer to:
//   FR-051    the rules of table T-031; the `App Header` height and the
//             `Scrollbars` thickness are settled from the environment at
//             startup and no setting may hold them (MUST NOT); `Scrollbars`
//             take their place FROM the `Row Area` (MUST) and are half the
//             environment's default (MUST); the `Panel Divider` takes no place
//             from the `Row Area` (MUST NOT)
//   SC-4      of table T-031 (MUST): both bars are shown at all times and are
//             not taken away when the content fits; dragging the grip changes
//             the display position. The rule after the table gives the reason
//   FR-052    a drag on a panel boundary changes the two panel widths, and the
//             `Row Area`'s width is the canvas width less `canvasPadding`, the
//             two panel widths and the vertical bar
//   U-50      (table T-103) the `Row Area` is the canvas less the `Time Ruler`
//             band and the padding, with the two panels on either side
//   EP-9      of table T-076 (MUST): the boundary line is the same one line as
//             `Group Grid Lines` (U-18) -- ⛔ no new settled name and no new
//             settings key
//   FR-071    full screen is entered and left by the same entry; IN-4a of table
//             T-028 lets Esc through to the browser when nothing is consumed
//   S-99f     (table T-206) whether the view is full screen is not stored in
//             the document; `ScreenState` carries it (PI-36)
//   S-56      (table T-201) `canvasPadding`, read from the generated defaults
//   U-21/U-24 (table T-103) the settled names `Scrollbars` and `Panel Divider`
//   R7.1      table T-075 makes this unit `pure`, so it may not write to what
//             it was handed
//
// ⭐ THREE THINGS THIS FILE DELIBERATELY DOES NOT ASSERT, because the
// specification decides none of them. Each was searched for before being given
// up on:
//
//   1. How wide the grab band is and how thick the boundary line is. Searched
//      FR-051 and FR-052 (both say where the boundary is and what a drag does,
//      neither sizes it), table T-206 (every settled grab margin -- S-90 to
//      S-93 -- and no row for this one), table T-023d, tables T-201 / T-203 /
//      T-212, and EP-9 of table T-076, which forbids a settings key for the
//      line. ⚠️ The cases below therefore assert only that the band and the
//      line COVER the boundary, at whatever width. ⛔ But see the last group:
//      the requirement does say the band is a grab band, and zero is not one.
//   2. Which of the two strips the `Row Area` gives up on its right -- the lane
//      or `canvasPadding` -- touches it. FR-052 subtracts both in one
//      expression and fixes no order between them, and FR-051, U-50 and table
//      T-031 add nothing. So the lane is asserted to lie INSIDE that strip, and
//      never at one particular x.
//   3. How long the grip is and where in the lane it sits. SC-4 keeps it drawn
//      and says nothing more; S-77 and S-78 of table T-203 hold the display
//      position as a date and a row id, not as a fraction, and neither reaches
//      this function. So the grip is asserted to sit inside its lane and to be
//      grabbable, and never at a length.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_BOUNDS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  emptyScreenState,
  screenStateWithArmed,
  screenStateWithFullScreen,
  screenStateWithPalette,
  screenStateWithSurface,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type {
  PanelDivider,
  ScreenFrame,
  Scrollbar,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { screenFrameFromRegions } from '../../src/adapter/screen-renderer/screen-frame'

// ---------------------------------------------------------------------------
// Fixed copies of the specification the cases are driven by (Chapter 1.9).
// ---------------------------------------------------------------------------

/**
 * Table T-031, row `SC-4` -- the row this unit answers to. Both axes are shown at all
 * times, whether the content fits or not, and the grip is dragged to move the
 * display position. The axes are in the row's own printed order.
 */
const T_031_SC4 = { row: 'SC-4', axes: ['horizontal', 'vertical'] } as const

/**
 * FR-052's own order: the row title panel, then the properties panel. Each
 * value is the member `PanelDivider.panel` publishes for that boundary.
 */
const FR_052_PANELS = ['rowTitlePanel', 'propertiesPanel'] as const

// ---------------------------------------------------------------------------
// Inputs. A whole DocumentSettings is 100+ keys, so a case pins the ones it
// means and everything else comes from SETTINGS_DEFAULTS, which is generated
// from the manuscript -- ⛔ rule 03 forbids re-typing a value the
// specification holds.
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({})

/** `canvasPadding` (S-56), taken from the generated defaults rather than typed. */
const PADDING = SETTINGS.canvasPadding

const PADDING_BOUNDS = SETTINGS_BOUNDS['canvasPadding']

/**
 * What the shell measured this frame. ⚠️ FR-051 (MUST NOT) keeps both of the
 * last two out of the settings, and BO-1 of table T-077 settles them from the
 * environment at startup -- so no number here is a specification value, and no
 * case asserts one. What the cases assert is that the unit gives back the very
 * number the rectangles it was handed were cut with.
 */
interface MeasuredScreen {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly rulerHeight: number
  readonly rowTitlePanelWidth: number
  readonly propertyPanelWidth: number
  readonly canvasPadding: number
  readonly scrollbarThickness: number
}

const SCREEN: MeasuredScreen = {
  width: 1280,
  height: 800,
  appHeaderHeight: 56,
  rulerHeight: 48,
  rowTitlePanelWidth: 240,
  propertyPanelWidth: 280,
  canvasPadding: PADDING,
  scrollbarThickness: 8,
}

/**
 * The screen cut into table T-103's parts by FR-052's own expression, so that
 * every rectangle a case hands over comes from the requirement.
 *
 * ⭐ Built here rather than through `regionsFromScreen` (UF-58): that unit's
 * answer is this unit's INPUT, and driving the input from the other unit's code
 * would make a shared misreading invisible. The arithmetic is FR-052's -- the
 * canvas width less `canvasPadding`, the two panel widths and the vertical bar
 * is the `Row Area`'s width -- and U-50's, which takes the ruler band and the
 * padding off the canvas's height, with FR-051's horizontal bar after it.
 */
const regionsOf = (part: Partial<MeasuredScreen> = {}): ScreenRegions => {
  const screen: MeasuredScreen = { ...SCREEN, ...part }
  const canvas: ScreenRect = {
    x: 0,
    y: screen.appHeaderHeight,
    width: screen.width,
    height: screen.height - screen.appHeaderHeight,
  }
  const rowAreaWidth =
    canvas.width -
    screen.canvasPadding -
    screen.rowTitlePanelWidth -
    screen.propertyPanelWidth -
    screen.scrollbarThickness
  const rowAreaHeight =
    canvas.height - screen.rulerHeight - screen.canvasPadding - screen.scrollbarThickness

  return {
    appHeader: { x: 0, y: 0, width: screen.width, height: screen.appHeaderHeight },
    scheduleCanvas: canvas,
    rowTitlePanel: {
      x: canvas.x,
      y: canvas.y,
      width: screen.rowTitlePanelWidth,
      height: canvas.height,
    },
    timeRuler: {
      x: canvas.x + screen.rowTitlePanelWidth,
      y: canvas.y,
      width: rowAreaWidth,
      height: screen.rulerHeight,
    },
    propertiesPanel: {
      x: canvas.x + canvas.width - screen.propertyPanelWidth,
      y: canvas.y,
      width: screen.propertyPanelWidth,
      height: canvas.height,
    },
    rowArea: {
      x: canvas.x + screen.rowTitlePanelWidth,
      y: canvas.y + screen.rulerHeight,
      width: rowAreaWidth,
      height: rowAreaHeight,
    },
  }
}

const REGIONS = regionsOf()

const STATE = emptyScreenState()

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

const frameOf = (
  regions: ScreenRegions = REGIONS,
  settings: DocumentSettings = SETTINGS,
  state: ScreenState = STATE,
): ScreenFrame => screenFrameFromRegions(regions, settings, state)

const scrollbarOn = (frame: ScreenFrame, axis: Scrollbar['axis']): Scrollbar => {
  const found = frame.scrollbars.filter((bar) => bar.axis === axis)
  expect(found).toHaveLength(1)
  return found[0] as Scrollbar
}

const dividerOn = (frame: ScreenFrame, panel: PanelDivider['panel']): PanelDivider => {
  const found = frame.dividers.filter((divider) => divider.panel === panel)
  expect(found).toHaveLength(1)
  return found[0] as PanelDivider
}

const right = (rect: ScreenRect): number => rect.x + rect.width
const bottom = (rect: ScreenRect): number => rect.y + rect.height

/**
 * ⚠️ Closed on both edges, which R3.4 asks to be said in the name: a boundary is
 * a line rather than a span, so a band that ends exactly on it still covers it.
 */
const coversXInclusive = (rect: ScreenRect, x: number): boolean => rect.x <= x && x <= right(rect)

const holdsInclusive = (outer: ScreenRect, inner: ScreenRect): boolean =>
  inner.x >= outer.x &&
  right(inner) <= right(outer) &&
  inner.y >= outer.y &&
  bottom(inner) <= bottom(outer)

/** Every numeric key moved but the one FR-052 puts in the arithmetic. */
const everyOtherNumberMoved = (settings: DocumentSettings): DocumentSettings => {
  const moved: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(settings)) {
    moved[key] = typeof value === 'number' && key !== 'canvasPadding' ? value + 7 : value
  }
  return moved as unknown as DocumentSettings
}

// ---------------------------------------------------------------------------

describe('UF-61 -- FR-071 and S-99f: full screen is carried, not decided', () => {
  it('answers the ordinary view for the state S-99f gives as its default', () => {
    expect(frameOf().isFullScreen).toBe(false)
  })

  it('answers full screen while the state says so', () => {
    expect(frameOf(REGIONS, SETTINGS, screenStateWithFullScreen(STATE, true)).isFullScreen).toBe(
      true,
    )
  })

  it('leaves by the entry it entered by', () => {
    // FR-071: the same entry enters and leaves, so no transition belongs here --
    // the answer is whatever the state carries, both ways round.
    const on = screenStateWithFullScreen(STATE, true)
    const off = screenStateWithFullScreen(on, false)

    expect(frameOf(REGIONS, SETTINGS, on).isFullScreen).toBe(true)
    expect(frameOf(REGIONS, SETTINGS, off).isFullScreen).toBe(false)
  })

  it('reads no other member of the screen state', () => {
    // ⛔ IN-4 of table T-028 gives the armed shape and the open surface to Esc,
    // not to this unit. Moving all three must not move the answer.
    const busy = screenStateWithSurface(
      screenStateWithPalette(
        screenStateWithArmed(STATE, { kind: 'taskShape', shapeKind: 'rectangle' }),
        false,
      ),
      'Help Modal',
    )

    expect(frameOf(REGIONS, SETTINGS, busy)).toEqual(frameOf(REGIONS, SETTINGS, STATE))
  })

  it('holds an open surface without letting it stand for full screen', () => {
    // `OpenSurface` is `string | null`; both are ordinary states here.
    expect(frameOf(REGIONS, SETTINGS, screenStateWithSurface(STATE, 'Resource Roster')).isFullScreen)
      .toBe(false)
  })
})

describe('UF-61 -- SC-4 of table T-031: both bars, at all times', () => {
  it(`describes exactly the axes ${T_031_SC4.row} names, in that order`, () => {
    expect(frameOf().scrollbars.map((bar) => bar.axis)).toEqual([...T_031_SC4.axes])
  })

  it('does not take a bar away when the content fits', () => {
    // ⭐ The rule after table T-031 gives the reason: a bar that came and went
    // would change the canvas width and re-run the layout. ⚠️ Nothing in the
    // arguments says whether the content fits, which is what makes a
    // fit-dependent branch impossible rather than merely unwanted -- so what a
    // case can show is that no shape of screen empties the list.
    const shapes: readonly Partial<MeasuredScreen>[] = [
      {},
      { width: 400, height: 300 },
      { width: 4000, height: 3000 },
      { rowTitlePanelWidth: 1, propertyPanelWidth: 1 },
      { rulerHeight: 0 },
    ]

    for (const shape of shapes) {
      expect(frameOf(regionsOf(shape)).scrollbars.map((bar) => bar.axis)).toEqual([
        ...T_031_SC4.axes,
      ])
    }
  })

  it('keeps both bars while the view is full screen', () => {
    const frame = frameOf(REGIONS, SETTINGS, screenStateWithFullScreen(STATE, true))

    expect(frame.scrollbars).toHaveLength(T_031_SC4.axes.length)
  })

  it('keeps the grip grabbable, since dragging it is what moves the display position', () => {
    const frame = frameOf()

    for (const axis of T_031_SC4.axes) {
      const bar = scrollbarOn(frame, axis)
      expect(bar.thumb.width).toBeGreaterThan(0)
      expect(bar.thumb.height).toBeGreaterThan(0)
    }
  })

  it('keeps the grip inside its own lane', () => {
    const frame = frameOf()

    for (const axis of T_031_SC4.axes) {
      const bar = scrollbarOn(frame, axis)
      expect(holdsInclusive(bar.track, bar.thumb)).toBe(true)
    }
  })
})

describe('UF-61 -- FR-051 (MUST NOT): no setting holds the thickness', () => {
  it('gives back the thickness the rectangles were cut with', () => {
    const frame = frameOf()

    expect(scrollbarOn(frame, 'vertical').track.width).toBe(SCREEN.scrollbarThickness)
    expect(scrollbarOn(frame, 'horizontal').track.height).toBe(SCREEN.scrollbarThickness)
  })

  it('follows the environment rather than a number of its own', () => {
    // ⭐ BO-1 of table T-077 settles the thickness from the environment at
    // startup, and it differs from one machine to the next -- so two screens
    // cut with two thicknesses must answer with two.
    for (const thickness of [3, 13, 17]) {
      const frame = frameOf(regionsOf({ scrollbarThickness: thickness }))

      expect(scrollbarOn(frame, 'vertical').track.width).toBe(thickness)
      expect(scrollbarOn(frame, 'horizontal').track.height).toBe(thickness)
    }
  })

  it('does not halve or round what the environment already halved', () => {
    // FR-051 (MUST) makes the thickness half the environment's own default.
    // That halving happens at BO-1, out of reach of a `pure` unit, so an odd
    // number has to survive this one untouched.
    const frame = frameOf(regionsOf({ scrollbarThickness: 9 }))

    expect(scrollbarOn(frame, 'vertical').track.width).toBe(9)
  })

  it('moves for no settings key but `canvasPadding`', () => {
    // ⛔ FR-051 (MUST NOT) forbids any setting to hold the thickness, and EP-9
    // of table T-076 (MUST) forbids a settings key for the boundary line. So
    // moving every number the presentation group holds -- ⚠️ except S-56, which
    // FR-052 does put in the arithmetic -- must leave the whole frame alone.
    expect(frameOf(REGIONS, everyOtherNumberMoved(SETTINGS))).toEqual(frameOf())
  })
})

describe('UF-61 -- FR-052 and S-56: the lane is what the expression left', () => {
  it('reads `canvasPadding` out of the settings rather than carrying a copy', () => {
    // ⭐ With the rectangles held still, the strip right of the `Row Area` is
    // fixed at `canvasPadding` plus the lane. Raising the padding the caller
    // passes therefore has to take exactly that much off the lane; a unit that
    // had typed S-56's value would answer the same both times.
    const raised = 5
    const frame = frameOf(REGIONS, settingsOf({ canvasPadding: PADDING + raised }))

    expect(scrollbarOn(frame, 'vertical').track.width).toBe(SCREEN.scrollbarThickness - raised)
  })

  it('holds at S-56 lower bound', () => {
    // The bounds come from the generated table, so a change to the manuscript
    // reaches this case rather than going unnoticed.
    expect(PADDING_BOUNDS?.min).toBeDefined()
    const padding = PADDING_BOUNDS?.min as number
    const frame = frameOf(regionsOf({ canvasPadding: padding }), settingsOf({ canvasPadding: padding }))

    expect(scrollbarOn(frame, 'vertical').track.width).toBe(SCREEN.scrollbarThickness)
  })

  it('holds at S-56 upper bound', () => {
    expect(PADDING_BOUNDS?.max).toBeDefined()
    const padding = PADDING_BOUNDS?.max as number
    const frame = frameOf(regionsOf({ canvasPadding: padding }), settingsOf({ canvasPadding: padding }))

    expect(scrollbarOn(frame, 'vertical').track.width).toBe(SCREEN.scrollbarThickness)
  })

  it('still describes two bars when the environment left them no thickness', () => {
    // ⚠️ A thickness of zero is what the arithmetic gives when the strip right
    // of the `Row Area` is all padding. SC-4 still asks for both bars, so the
    // list may not shorten with the number.
    const frame = frameOf(regionsOf({ scrollbarThickness: 0 }))

    expect(frame.scrollbars.map((bar) => bar.axis)).toEqual([...T_031_SC4.axes])
    expect(scrollbarOn(frame, 'vertical').track.width).toBe(0)
    expect(scrollbarOn(frame, 'horizontal').track.height).toBe(0)
  })

  it('never gives a lane a negative thickness', () => {
    // A lane is a rectangle, and a rectangle's width is a size. ⚠️ The strip
    // can only come out short of the padding when the caller hands over a pair
    // the requirement already refuses, so this pins the answer for an input
    // FR-052 does not admit rather than a case the screen can reach.
    const frame = frameOf(regionsOf({ canvasPadding: 0, scrollbarThickness: 0 }), SETTINGS)

    expect(scrollbarOn(frame, 'vertical').track.width).toBeGreaterThanOrEqual(0)
    expect(scrollbarOn(frame, 'horizontal').track.height).toBeGreaterThanOrEqual(0)
  })
})

describe('UF-61 -- FR-051 (MUST): the bars take their place from the `Row Area`', () => {
  it('puts the vertical lane in the strip the `Row Area` gave up on its right', () => {
    const lane = scrollbarOn(frameOf(), 'vertical').track

    expect(lane.x).toBeGreaterThanOrEqual(right(REGIONS.rowArea))
    expect(right(lane)).toBeLessThanOrEqual(REGIONS.propertiesPanel.x)
  })

  it('puts the horizontal lane in the strip the `Row Area` gave up at its foot', () => {
    const lane = scrollbarOn(frameOf(), 'horizontal').track

    expect(lane.y).toBeGreaterThanOrEqual(bottom(REGIONS.rowArea))
    expect(bottom(lane)).toBeLessThanOrEqual(bottom(REGIONS.scheduleCanvas))
  })

  it('takes the lanes out of the `Row Area` rather than out of a panel', () => {
    // ⛔ A lane laid over either panel would be taking its place from that
    // panel, whose width FR-052 has the person set.
    const frame = frameOf()

    expect(scrollbarOn(frame, 'vertical').track.x).toBeGreaterThanOrEqual(
      right(REGIONS.rowTitlePanel),
    )
    expect(right(scrollbarOn(frame, 'vertical').track)).toBeLessThanOrEqual(
      REGIONS.propertiesPanel.x,
    )
  })

  it('follows the `Row Area` when the person changes a panel width', () => {
    const widened = regionsOf({ rowTitlePanelWidth: 400 })
    const lane = scrollbarOn(frameOf(widened), 'vertical').track

    expect(lane.x).toBeGreaterThanOrEqual(right(widened.rowArea))
    expect(right(lane)).toBeLessThanOrEqual(widened.propertiesPanel.x)
  })
})

describe('UF-61 -- FR-052 and EP-9: one divider per panel boundary', () => {
  it("describes both boundaries, in FR-052's own order", () => {
    expect(frameOf().dividers.map((divider) => divider.panel)).toEqual([...FR_052_PANELS])
  })

  it('describes the properties panel boundary whatever the screen state says', () => {
    // ⚠️ Whether the panel is open reaches UF-64 through the session and does
    // not reach this unit at all, and ScreenRegions gives the panel a rectangle
    // either way -- so the boundary is described every frame.
    const busy = screenStateWithSurface(screenStateWithFullScreen(STATE, true), 'Help Modal')

    expect(frameOf(REGIONS, SETTINGS, busy).dividers.map((divider) => divider.panel)).toEqual([
      ...FR_052_PANELS,
    ])
  })

  it('puts each band on the edge whose width a drag on it changes', () => {
    const frame = frameOf()

    expect(
      coversXInclusive(dividerOn(frame, 'rowTitlePanel').band, right(REGIONS.rowTitlePanel)),
    ).toBe(true)
    expect(
      coversXInclusive(dividerOn(frame, 'propertiesPanel').band, REGIONS.propertiesPanel.x),
    ).toBe(true)
  })

  it('puts the line on the same boundary as the band', () => {
    // EP-9 (MUST) keeps the line in the export although the control does not go:
    // the line and the band mark one and the same boundary.
    const frame = frameOf()

    expect(
      coversXInclusive(dividerOn(frame, 'rowTitlePanel').line, right(REGIONS.rowTitlePanel)),
    ).toBe(true)
    expect(
      coversXInclusive(dividerOn(frame, 'propertiesPanel').line, REGIONS.propertiesPanel.x),
    ).toBe(true)
  })

  it('draws the line down the whole boundary', () => {
    // EP-9's reason is that the eye loses the join between the row titles and
    // the schedule when the line goes, so a line that covered part of the
    // boundary would leave that join unreadable for the rest of it.
    const frame = frameOf()

    for (const panel of FR_052_PANELS) {
      const line = dividerOn(frame, panel).line
      expect(line.y).toBeLessThanOrEqual(REGIONS[panel].y)
      expect(bottom(line)).toBeGreaterThanOrEqual(bottom(REGIONS[panel]))
    }
  })

  it('moves both boundaries when the person changes both widths', () => {
    const dragged = regionsOf({ rowTitlePanelWidth: 400, propertyPanelWidth: 160 })
    const frame = frameOf(dragged)

    expect(
      coversXInclusive(dividerOn(frame, 'rowTitlePanel').band, right(dragged.rowTitlePanel)),
    ).toBe(true)
    expect(
      coversXInclusive(dividerOn(frame, 'propertiesPanel').band, dragged.propertiesPanel.x),
    ).toBe(true)
  })
})

describe('UF-61 -- FR-051 (MUST NOT): the divider takes no place from the `Row Area`', () => {
  it('hands the `Row Area` back exactly as it arrived', () => {
    // ⭐ The MUST NOT is about the arithmetic: the rectangle arrives already
    // settled, and a band that widened it -- or narrowed it to make room for
    // itself -- would eat the drawing area for the sake of the hand.
    const regions = regionsOf()
    const before = structuredClone(regions)

    frameOf(regions)

    expect(regions).toEqual(before)
  })

  it('leaves the `Row Area` the width FR-052 already gave it, band or no band', () => {
    const narrow = regionsOf({ rowTitlePanelWidth: 100 })
    const wide = regionsOf({ rowTitlePanelWidth: 400 })

    // The two lanes are the only thing this unit lays over the `Row Area`'s
    // strip, and the band adds nothing to it: the same screen minus 300px of
    // panel gives the same lane thickness.
    expect(scrollbarOn(frameOf(narrow), 'vertical').track.width).toBe(
      scrollbarOn(frameOf(wide), 'vertical').track.width,
    )
  })
})

describe('UF-61 -- table T-075 makes the unit `pure`', () => {
  it('writes to none of the three values it was handed (R7.1)', () => {
    const regions = regionsOf()
    const settings = settingsOf({})
    const state = screenStateWithFullScreen(emptyScreenState(), true)
    const before = {
      regions: structuredClone(regions),
      settings: structuredClone(settings),
      state: structuredClone(state),
    }

    screenFrameFromRegions(regions, settings, state)

    expect(regions).toEqual(before.regions)
    expect(settings).toEqual(before.settings)
    expect(state).toEqual(before.state)
  })

  it('answers the same value for the same values', () => {
    expect(frameOf()).toEqual(frameOf())
  })
})

describe('UF-61 -- ⛔ LEFT FAILING: FR-051 calls the divider a grab band', () => {
  // ⛔ THIS CASE IS EXPECTED TO FAIL AND IS DELIBERATELY NOT DELETED.
  //
  // docs/spec/01-04-requirements.md:2366 says of the `Panel Divider`:
  // it is a grab band lying over the panel boundary, and taking place from the
  // `Row Area` would mean "the band WIDENED for the sake of grabbability eats
  // the drawing area". FR-052 (:2379) then has the person DRAG that boundary.
  //
  // ⚠️ The requirement never gives the width a number -- table T-206 holds every
  // settled grab margin (S-90 to S-93) and has no row for this one -- so no
  // case here asserts one. But zero is not a width the specification leaves
  // open: a band of zero width holds no point under the half-open convention
  // R3.4 sets, so nothing can be grabbed and FR-052's drag has no target.
  //
  // ⭐ The resolution is a decision, not a guess: rule 01 clause 8 of
  // docs/development-rules sends an unanswerable value to the user. Until one
  // is settled this case stands, because a green suite here would say the
  // boundary can be dragged when it cannot.
  it('gives the band a width a pointer can land in', () => {
    const frame = frameOf()

    for (const panel of FR_052_PANELS) {
      expect(dividerOn(frame, panel).band.width).toBeGreaterThan(0)
    }
  })
})
