// Anchors for the two ledger rows closed on 2026-09-08, each measured on the
// shipped build before it was written here (docs/development-rules/
// 04-verification.md section 3.5: a unit case is written to STOP A FIX COMING
// BACK, and only for something that was measured).
//
//   DFC-298 -- GR-21's grip had no START. It was laid at the lane's own corner
//            whatever the display position was, so a document scrolled to its
//            far end drew the grip at the near one.
//   DFC-420 -- the picture did not FOLLOW while the grip was held. Measured with
//            FR-102's own record (IC-76), shipped build, 1920x1080: three moves
//            of 40px each answered `act=changeDocument doc=same notices=1` --
//            every mid-drag write was refused and a telling raised in its place
//            -- and the release then answered `doc=changed`. The schedule stood
//            still through the drag and jumped when the button came up.
//
// Units under test:
//   UF-61  `screen-frame.ts` (CP-19 of table T-062) -- `screenFrameFromRegions`,
//          which is where the grip's rectangle is decided.
//   UF-48  `frame-loop.ts` (CP-25) -- the shell, which is where the mid-drag
//          write was being turned away.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES ANSWER TO (rule 03 section 3: name the row; the two
// clauses quoted below are quoted because holding them verbatim is the point)
// ---------------------------------------------------------------------------
//
//   T-023d GR-21  the grip is 「帯の中の、いま見えている範囲を表す区間」, its
//                 length is 「見えている範囲 ÷ 全体」 of the lane's, and the
//                 floor is `S-205`. A 区間 has a start as well as a length.
//   T-023d        its closing paragraph, which names GR-21 among the grabs
//                 whose picture follows the pointer while held.
//   FR-051        「スクロールバーの操作でも表示位置を変えられるようにすること
//                 （MUST）」, and 「表示位置が変わったときは ... `S-77` と `S-78`
//                 が新しい表示位置を指すようにすること（MUST）」.
//   T-035 AG-9    「パンと範囲選択は文書を変えないので拒否しない —— 対象は表
//                 T-027 の取り消し対象行と一致させる」 -- the sentence that says
//                 which drags a mid-gesture write may not be refused during.
//   T-027 UN-8    「ズーム・スクロール・パン」 -- the rows AG-9 points at, which
//                 is what puts a scrollbar drag among the spared.
//   T-031 SC-4    both bars are drawn whether the content fits or not.
//   T-206 S-205   the lane's thickness floor, reused as the grip's length floor.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - What a press on the LANE OUTSIDE the grip does. GR-21 says of itself
//     「つまみの外の帯を押したときの振る舞いは、本行は定めない（未決）」.
//   - The grip's exact length.
//     `tests/unit/d-405-gr-21-the-grip-is-a-fraction-of-its-lane.test.ts` holds
//     that half. ⚠️ THIS LINE USED TO NAME `tests/unit/uf-61.test.ts`, AND THAT
//     WAS FALSE (台帳 DFC-405, measured 2026-09-08): that file asserts only that
//     the grip is wider and taller than nought, so halving the length, taking
//     the floor away and returning the grip to the whole lane each took ZERO
//     cases red.
//   - How far one pixel of pointer carries the picture. That is the
//     translator's gearing, and no row of docs/spec fixes a number for it --
//     these cases assert only THAT the picture moved and that it moved ONCE.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { screenFrameFromRegions } from '../../src/adapter/screen-renderer/screen-frame'
import type {
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import type { ScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'

// ---------------------------------------------------------------------------
// Part one -- UF-61: where along the lane the 区間 begins (DFC-298)
// ---------------------------------------------------------------------------

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

/**
 * Regions whose `Row Area` leaves a lane of `thickness` on its right, which is
 * FR-052's arithmetic read backwards -- the gap between the `Row Area` and the
 * `Properties Panel` is the lane plus `canvasPadding`.
 */
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

describe('DFC-298 -- GR-21 is 帯の中の、いま見えている範囲を表す区間, so it has a start', () => {
  // Four times the lane, so a quarter of the lane is on screen and three
  // quarters of the travel is available to be somewhere in.
  const WHOLE_WIDTH = ROW_AREA.width * 4
  const WHOLE_HEIGHT = ROW_AREA.height * 4

  it('lays the grip at the lane 1 corner while nothing has been scrolled', () => {
    const bar = barOf(
      sessionWith({
        contentWidth: WHOLE_WIDTH,
        contentHeight: WHOLE_HEIGHT,
        visibleHeight: ROW_AREA.height,
        offsetX: 0,
        offsetY: 0,
      }),
      'horizontal',
    )
    expect(bar.thumb.x).toBe(bar.track.x)
  })

  it('moves the grip by the same fraction of the lane that the view has moved of the whole', () => {
    // A quarter of the way through the content, so a quarter of the way along
    // the lane -- the SAME denominator GR-21 gives the length.
    const offsetX = WHOLE_WIDTH / 4
    const offsetY = WHOLE_HEIGHT / 4
    const session = sessionWith({
      contentWidth: WHOLE_WIDTH,
      contentHeight: WHOLE_HEIGHT,
      visibleHeight: ROW_AREA.height,
      offsetX,
      offsetY,
    })
    const sideways = barOf(session, 'horizontal')
    const downwards = barOf(session, 'vertical')
    expect(sideways.thumb.x - sideways.track.x).toBeCloseTo(sideways.track.width / 4, 6)
    expect(downwards.thumb.y - downwards.track.y).toBeCloseTo(downwards.track.height / 4, 6)
  })

  it('never lets the grip hang out of the lane it has to be grabbed in', () => {
    // The far end of the travel: everything but one screenful is behind.
    const session = sessionWith({
      contentWidth: WHOLE_WIDTH,
      contentHeight: WHOLE_HEIGHT,
      visibleHeight: ROW_AREA.height,
      offsetX: WHOLE_WIDTH - ROW_AREA.width,
      offsetY: WHOLE_HEIGHT - ROW_AREA.height,
    })
    const sideways = barOf(session, 'horizontal')
    const downwards = barOf(session, 'vertical')
    expect(sideways.thumb.x).toBeGreaterThanOrEqual(sideways.track.x)
    expect(sideways.thumb.x + sideways.thumb.width).toBeCloseTo(
      sideways.track.x + sideways.track.width,
      6,
    )
    expect(downwards.thumb.y + downwards.thumb.height).toBeLessThanOrEqual(
      downwards.track.y + downwards.track.height + 1e-6,
    )
  })

  it('leaves the grip at the corner for a session that carries no offset at all', () => {
    // ⭐ THE CONTROL FOR THE OTHER DIRECTION. The pair is optional, and absent
    // has to read as NOT SCROLLED -- a build that read it as anything else
    // would move the grip on a description that says nothing about the place.
    const bar = barOf(
      sessionWith({
        contentWidth: WHOLE_WIDTH,
        contentHeight: WHOLE_HEIGHT,
        visibleHeight: ROW_AREA.height,
      }),
      'horizontal',
    )
    expect(bar.thumb.x).toBe(bar.track.x)
  })
})

// ---------------------------------------------------------------------------
// Part two -- UF-48: the picture follows while the grip is held (DFC-420)
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

/** BT-4 of table T-034 -- the template FR-027 starts a reader with. */
const fixtureDocument = (): Document =>
  JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as unknown as Document

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 40,
  // ⚠️ NOT ZERO. FR-051 (MUST) has the bar take its place from the `Row Area`,
  // and a lane of no thickness is one no press could land on.
  scrollbarThickness: 12,
}

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`. ⛔ Nothing in it decides anything.
 */
function host(): Host {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
    },
  }
}

/**
 * A stand-in for IF-9's surface that answers `readScreenPartAt` FROM WHAT IT WAS
 * TOLD TO DRAW.
 *
 * ⭐ Chapter 5.3 (MUST) makes the side that DREW a part the side that says where
 * it is, so the lanes are read out of the `ScreenFrame` handed over rather than
 * invented here -- ⛔ this fake never decides where a lane stands.
 */
interface Pane {
  readonly wiring: ScreenWiring
  last(): ScreenView
}

function pane(): Pane {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (x, y): ScreenPart | null => {
      const view = views[views.length - 1]
      if (view === undefined) return null
      for (const bar of view.frame.scrollbars) {
        const lane = bar.track
        const inside =
          x >= lane.x && x < lane.x + lane.width && y >= lane.y && y < lane.y + lane.height
        if (inside) {
          return {
            part: 'Scrollbars',
            entry: null,
            format: null,
            rowGroupId: null,
            resourceUid: null,
            dividerPanel: null,
            noticeDismissKey: null,
            scrollbarAxis: bar.axis,
          }
        }
      }
      return null
    },
  }
  return {
    wiring: { surface, language: 'en' },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  readonly pane: Pane
  send(input: HumanInput): void
}

function stage(): Stage {
  const drawn = pane()
  const pen = host()
  const loop = frameLoop(pen.surface as any, fixtureDocument(), SCREEN, drawn.wiring)
  pen.runAnimationFrames()
  return {
    loop,
    pane: drawn,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
  }
}

/** S-77 / S-177 and S-78 / S-176 -- where FR-051 (MUST) has the place kept. */
const placeOf = (loop: FrameLoop): string => {
  const settings = (loop.document() as any).documentSettings
  return JSON.stringify([
    settings.scrollDate,
    settings.scrollDayOffset,
    settings.scrollGroupId,
    settings.scrollGroupOffset,
  ])
}

/** The middle of one lane's grip, read off the picture that was drawn. */
function gripCentreOf(shown: Pane, axis: 'horizontal' | 'vertical'): { x: number; y: number } {
  const bar = shown.last().frame.scrollbars.find((one) => one.axis === axis)
  if (bar === undefined) throw new Error(`SC-4 of table T-031 draws no ${axis} bar`)
  return { x: bar.thumb.x + bar.thumb.width / 2, y: bar.thumb.y + bar.thumb.height / 2 }
}

describe('DFC-420 -- table T-023d has GR-21 follow the pointer while it is held', () => {
  const TRAVEL = 60

  it.each(['horizontal', 'vertical'] as const)(
    'moves the display position on the MOVE and not only on the release (%s)',
    (axis) => {
      const one = stage()
      const from = gripCentreOf(one.pane, axis)
      one.send(pointer('down', from.x, from.y))
      const atPress = placeOf(one.loop)
      one.send(
        pointer(
          'move',
          axis === 'horizontal' ? from.x + TRAVEL : from.x,
          axis === 'horizontal' ? from.y : from.y + TRAVEL,
        ),
      )
      // ⛔ THE HALF THAT WAS RED. AG-9 of table T-035 spares 「パンと範囲選択」 and
      // points at table T-027, whose UN-8 reads 「ズーム・スクロール・パン」 -- so
      // WS-2 may not refuse this write, and FR-051 (MUST) requires S-77 / S-78
      // to point at the place the picture has moved to.
      expect(placeOf(one.loop)).not.toBe(atPress)
    },
  )

  it.each(['horizontal', 'vertical'] as const)(
    'keeps the grip under the pointer, piece after piece (%s)',
    (axis) => {
      // ⭐⭐ THE CONTROL FOR THE OTHER DIRECTION, AND IT IS GR-21's OWN
      // ARITHMETIC. A grip 「見えている範囲 ÷ 全体」 of its lane long, on a
      // picture that follows the pointer, runs the length of its lane exactly
      // while the picture runs the length of the whole -- so the grip stays
      // under the hand that is holding it, one pixel for one pixel.
      // ⛔ RED IN BOTH WRONG DIRECTIONS. A build that does not follow leaves
      // the grip where it was (0 instead of 60); one that follows but does not
      // record what it applied measures every piece from the press, so the
      // second move of 60 carries the picture 120 further and the grip runs
      // away ahead of the pointer (180 instead of 120).
      // ⚠️ THIS IS ALSO WHY THE TWO ROWS ARE ANCHORED IN ONE FILE: without
      // DFC-298's start there is no grip position to measure DFC-420's follow by.
      const along = (point: { x: number; y: number }): number =>
        axis === 'horizontal' ? point.x : point.y
      const to = (from: { x: number; y: number }, by: number) =>
        axis === 'horizontal'
          ? pointer('move', from.x + by, from.y)
          : pointer('move', from.x, from.y + by)

      const one = stage()
      // ⚠️ ONE DRAG IS SPENT FIRST, AND IT IS NOT PART OF THE MEASUREMENT.
      // OP-10 of table T-024a draws FR-055's fit while the document names no
      // place, so the FIRST write to reach S-77 / S-78 also takes the picture
      // off the fit and onto the document's own zoom -- a change of scale this
      // case is not about. Everything below is measured after that has
      // happened, where one pixel of pointer means one pixel of grip.
      const warm = gripCentreOf(one.pane, axis)
      one.send(pointer('down', warm.x, warm.y))
      one.send(to(warm, TRAVEL))
      one.send(
        axis === 'horizontal'
          ? pointer('up', warm.x + TRAVEL, warm.y)
          : pointer('up', warm.x, warm.y + TRAVEL),
      )

      const from = gripCentreOf(one.pane, axis)
      const began = along(from)
      one.send(pointer('down', from.x, from.y))
      one.send(to(from, TRAVEL))
      // ⚠️ ONE PIXEL OF SLACK, and it is the drawn rectangle's rounding rather
      // than a tolerance on the rule: the place is kept in days and rows
      // (S-77 / S-177, S-78 / S-176) and comes back as a fraction of one.
      expect(Math.abs(along(gripCentreOf(one.pane, axis)) - began - TRAVEL)).toBeLessThan(1)
      one.send(to(from, TRAVEL * 2))
      expect(Math.abs(along(gripCentreOf(one.pane, axis)) - began - TRAVEL * 2)).toBeLessThan(1)
    },
  )

  it('raises no telling for a write it made while the grip was held', () => {
    // ⚠️ THIS IS HOW THE DEFECT ANNOUNCED ITSELF. Every refused mid-drag write
    // raised one (FR-076), so the record read `doc=same notices=1` -- and a
    // telling standing over the schedule is what the reader actually saw.
    const one = stage()
    const from = gripCentreOf(one.pane, 'horizontal')
    one.send(pointer('down', from.x, from.y))
    one.send(pointer('move', from.x + TRAVEL, from.y))
    expect(one.pane.last().notices.length).toBe(0)
  })
})
