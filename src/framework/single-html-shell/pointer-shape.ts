// SingleHtmlShell frame loop -- draws the pointer shape of table T-269 for the grab area under the pointer.
// @unit      UF-157  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { itemAtPointer } from '../../entity/layout-engine/item-hit-area/item-hit-area'
import { regionAtPointer } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { PointerPress } from '../../adapter/input-command-translator/input-command-translator'
import type { ScreenPart } from '../../adapter/screen-renderer/screen-renderer'
import { dualCursorFollowingIn, type FrameLoopHands, type FrameValues } from './frame-loop'

// see T-269
type PointerFallback = 'ew-resize' | 'move' | 'pointer' | 'grab'

type DrawnPointer = `url(data:image/svg+xml,${string}) ${number} ${number}, ${PointerFallback}`

export type PointerShape =
  | 'default'
  | 'copy'
  | 'grabbing'
  | 'grab'
  | 'pointer'
  | 'col-resize'
  | DrawnPointer

export type ShowPointerShape = (shape: PointerShape | null) => void

export type Grabbed = NonNullable<ReturnType<typeof itemAtPointer>>

export type GrabbedArea = Grabbed['grab']

// see T-269
export type PointerRow =
  | 'PK-1'
  | 'PK-3'
  | 'PK-4'
  | 'PK-5'
  | 'PK-7'
  | 'PK-8'
  | 'PK-9'
  | 'PK-10'

// see T-266, T-269
export type PointerFacing = 'start' | 'end'

type PointerGrabArea = GrabbedArea

// see T-269
interface PointerOfGrab {
  readonly row: PointerRow
  readonly facing: PointerFacing
  readonly ink?: PointerInk
}

// see T-266, T-269
const POINTER_BY_GRAB: Readonly<Record<PointerGrabArea, PointerOfGrab | null>> = {
  'GA-1': { row: 'PK-1', facing: 'start' },
  'GA-2': { row: 'PK-1', facing: 'end' },
  'GA-3': { row: 'PK-1', facing: 'start', ink: 'filled' },
  'GA-4': { row: 'PK-1', facing: 'end', ink: 'filled' },
  'GA-5': { row: 'PK-1', facing: 'start', ink: 'filled' },
  'GA-6': { row: 'PK-1', facing: 'end', ink: 'filled' },
  'GA-7': { row: 'PK-3', facing: 'start' },
  'GA-8': { row: 'PK-3', facing: 'end' },
  'GA-9': { row: 'PK-8', facing: 'start' },
  'GA-10': { row: 'PK-1', facing: 'start' },
  'GA-11': { row: 'PK-1', facing: 'end' },
  'GA-12': { row: 'PK-1', facing: 'start', ink: 'filled' },
  'GA-13': { row: 'PK-1', facing: 'end', ink: 'filled' },
  'GA-14': { row: 'PK-8', facing: 'start' },
  'GA-15': { row: 'PK-5', facing: 'start' },
  'GA-16': { row: 'PK-5', facing: 'start', ink: 'filled' },
  'GA-17': { row: 'PK-5', facing: 'start', ink: 'filled' },
  'GA-18': { row: 'PK-7', facing: 'start' },
  'GA-19': { row: 'PK-4', facing: 'end' },
  'GA-20': { row: 'PK-9', facing: 'start' },
  'GA-21': { row: 'PK-1', facing: 'start', ink: 'filled' },
  'GA-22': { row: 'PK-1', facing: 'end', ink: 'filled' },
  'GR-10': null,
  'GR-11': null,
  'GR-14': null,
  'GR-16': { row: 'PK-10', facing: 'start' },
}

// WHY: read by row ID: the map above is exhaustive over the grab rows, and a row outside it has none.
const POINTER_BY_ROW_ID: Readonly<Record<string, PointerOfGrab | null | undefined>> =
  POINTER_BY_GRAB

type PointerInk = 'hollow' | 'filled'

// see T-269
const POINTER_INKS: Readonly<
  Record<PointerInk, { readonly fill: string; readonly outline: string }>
> = {
  hollow: { fill: '#ffffff', outline: '#000000' },
  filled: { fill: '#000000', outline: '#ffffff' },
}

// WHY: the square shapes are drawn on this one grid and stretched to their row's side, so a changed
// side keeps the drawing.
const POINTER_GRID = 24

// WHY: the head's point and the shaft's far end sit inside the grid by more than the outline's half width.
const BOX_ARROW_START_PATH = 'M2 12 L11 3 V8 H22 V16 H11 V21 Z'

// WHY: a thin shaft and a thin triangular head, traced as one outline so the edge runs all the way round.
const LINE_ARROW_END_PATH = 'M2 11 H13 V6 L22 12 L13 18 V13 H2 Z'

// WHY: traced as one outline, so the edge runs all the way round.
const RESUME_ARROW_PATH = 'M2 3 H6 V10 H15 V6 L22 12 L15 18 V14 H6 V21 H2 Z'

const RESUME_ARROW_BEND = { x: 4, y: 12 }

const URL_UNSAFE_LEFT_BY_ENCODING = /['()]/g

/** @purity pure */
function pointerCursor(
  picture: string,
  hotspotX: number,
  hotspotY: number,
  fallback: PointerFallback,
): DrawnPointer {
  const encoded = encodeURIComponent(picture).replace(
    URL_UNSAFE_LEFT_BY_ENCODING,
    (one) => `%${one.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `url(data:image/svg+xml,${encoded}) ${hotspotX} ${hotspotY}, ${fallback}`
}

// see T-269
/** @purity pure */
function squarePointer(
  side: number,
  path: string,
  ink: PointerInk,
  join: 'round' | 'miter',
  mirrored: boolean,
  hotspot: { readonly x: number; readonly y: number },
  fallback: PointerFallback,
): DrawnPointer {
  const { fill, outline } = POINTER_INKS[ink]
  // WHY: S-297 is in the image's own pixels, so the grid's units carry it back up by the stretch's ratio.
  const edge = (NOT_STORED_END_POINTER_SIZES['S-297'] * POINTER_GRID) / side
  const mirror = mirrored ? ` transform='matrix(-1 0 0 1 ${POINTER_GRID} 0)'` : ''
  const picture =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${side}' height='${side}' ` +
    `viewBox='0 0 ${POINTER_GRID} ${POINTER_GRID}'>` +
    `<path d='${path}'${mirror} fill='${fill}' stroke='${outline}' ` +
    `stroke-width='${edge}' stroke-linejoin='${join}'/></svg>`
  const across = (mirrored ? POINTER_GRID - hotspot.x : hotspot.x) * (side / POINTER_GRID)
  const down = hotspot.y * (side / POINTER_GRID)
  return pointerCursor(picture, across, down, fallback)
}

// see PK-1
/** @purity pure */
function boxArrowPointer(ink: PointerInk, facing: PointerFacing): DrawnPointer {
  const side = NOT_STORED_END_POINTER_SIZES['S-249']
  const middle = POINTER_GRID / 2
  return squarePointer(
    side,
    BOX_ARROW_START_PATH,
    ink,
    'round',
    facing === 'end',
    { x: middle, y: middle },
    'ew-resize',
  )
}

// see PK-4
/** @purity pure */
function lineArrowPointer(): DrawnPointer {
  const side = NOT_STORED_END_POINTER_SIZES['S-249']
  const middle = POINTER_GRID / 2
  return squarePointer(
    side,
    LINE_ARROW_END_PATH,
    'hollow',
    'miter',
    false,
    { x: middle, y: middle },
    'pointer',
  )
}

// see PK-9
/** @purity pure */
function resumeArrowPointer(): DrawnPointer {
  return squarePointer(
    NOT_STORED_END_POINTER_SIZES['S-296'],
    RESUME_ARROW_PATH,
    'filled',
    'miter',
    false,
    RESUME_ARROW_BEND,
    'ew-resize',
  )
}

// see PK-3
// WHY: the triangle is set in by half the outline, so the edge stands inside S-294, not past it.
/** @purity pure */
function fadeTrianglePointer(facing: PointerFacing): DrawnPointer {
  const [across, down] = NOT_STORED_END_POINTER_SIZES['S-294']
  const half = NOT_STORED_END_POINTER_SIZES['S-297'] / 2
  const right = across - half
  const bottom = down - half
  const { fill, outline } = POINTER_INKS.hollow
  const corner = facing === 'start' ? { x: right, y: bottom } : { x: half, y: half }
  const points =
    facing === 'start'
      ? `${right},${bottom} ${half},${bottom} ${right},${half}`
      : `${half},${half} ${right},${half} ${half},${bottom}`
  const picture =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${across}' height='${down}' ` +
    `viewBox='0 0 ${across} ${down}'>` +
    `<polygon points='${points}' fill='${fill}' stroke='${outline}' ` +
    `stroke-width='${NOT_STORED_END_POINTER_SIZES['S-297']}' stroke-linejoin='round'/></svg>`
  return pointerCursor(picture, corner.x, corner.y, 'ew-resize')
}

// see PK-5
// WHY: S-295 is the circle across, outline and all, so the radius gives the outline back its half.
/** @purity pure */
function discPointer(ink: PointerInk, fallback: PointerFallback): DrawnPointer {
  const [hollowAcross, filledAcross] = NOT_STORED_END_POINTER_SIZES['S-295']
  const across = ink === 'hollow' ? hollowAcross : filledAcross
  const edge = NOT_STORED_END_POINTER_SIZES['S-297']
  const middle = across / 2
  const { fill, outline } = POINTER_INKS[ink]
  const picture =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${across}' height='${across}' ` +
    `viewBox='0 0 ${across} ${across}'>` +
    `<circle cx='${middle}' cy='${middle}' r='${middle - edge / 2}' fill='${fill}' ` +
    `stroke='${outline}' stroke-width='${edge}'/></svg>`
  return pointerCursor(picture, middle, middle, fallback)
}

// see T-269
/** @purity pure */
export function pointerImageOf(
  row: PointerRow,
  facing: PointerFacing = 'start',
  ink: PointerInk = 'hollow',
): PointerShape {
  switch (row) {
    case 'PK-1':
      return boxArrowPointer(ink, facing)
    case 'PK-3':
      return fadeTrianglePointer(facing)
    case 'PK-4':
      return lineArrowPointer()
    case 'PK-5':
      return discPointer(ink, ink === 'hollow' ? 'move' : 'ew-resize')
    case 'PK-7':
      return 'pointer'
    case 'PK-8':
      return 'grab'
    case 'PK-9':
      return resumeArrowPointer()
    case 'PK-10':
      return 'col-resize'
  }
}

// see IN-2, FR-106
/** @purity pure */
export function pointerRowOf(hit: Grabbed | null, armed: boolean): PointerRow | null {
  if (armed || hit === null) return null
  return POINTER_BY_ROW_ID[hit.grab]?.row ?? null
}

// see T-266
/** @purity pure */
function pointerFacingOf(hit: Grabbed): PointerFacing {
  return POINTER_BY_ROW_ID[hit.grab]?.facing ?? 'start'
}

// see T-266, T-269
/** @purity pure */
function pointerInkOf(hit: Grabbed): PointerInk {
  return POINTER_BY_ROW_ID[hit.grab]?.ink ?? 'hollow'
}

export type PointerShapeHands = Pick<FrameLoopHands, 'readPressed' | 'readSession'>

/** @purity non-pure */
export function pressedPointerShapeOf(hands: PointerShapeHands) {
  let pointerShapeOfPress: {
    readonly at: PointerPress['at']
    readonly shape: PointerShape | null
  } | null = null

  // see FR-106
  // WHY: keyed on the press's own point, which every rebuild of the press carries over unchanged.
  // WHY: read off what the press grabbed, so a press whose happening returned early still keeps its shape.
  /** @purity non-pure */
  function pointerShapeAt(
    frame: FrameValues,
    x: number,
    y: number,
    on: ScreenPart | null,
    hit: Grabbed | null,
  ): PointerShape | null {
    const pressed = hands.readPressed()
    if (pressed === null) {
      pointerShapeOfPress = null
      return pointerShapeUnder(hands, frame, { x, y }, on, hit)
    }
    if (pointerShapeOfPress === null || pointerShapeOfPress.at !== pressed.at) {
      const { at } = pressed
      pointerShapeOfPress = { at, shape: pointerShapeUnder(hands, frame, at, pressed.on, pressed.hit) }
    }
    return pointerShapeOfPress.shape
  }

  return { pointerShapeAt }
}

export type PressedPointerShape = ReturnType<typeof pressedPointerShapeOf>

// see IN-2
/** @purity semi-pure-b */
function pointerShapeUnder(
  hands: PointerShapeHands,
  frame: FrameValues,
  point: { readonly x: number; readonly y: number },
  on: ScreenPart | null,
  hit: Grabbed | null,
): PointerShape | null {
  const pressed = hands.readPressed()
  const session = hands.readSession()
  if (pressed !== null && pressed.pressRow === 'PTD-1') return 'grabbing'
  if (on !== null) return null
  if (regionAtPointer(frame.regions, point.x, point.y) !== 'rowArea') return null
  if (dualCursorFollowingIn(session) !== null) return null
  const armed = session.screen.armModeState
  const isArmedDependency = armed.kind === 'dependencyArmed'
  const row = pointerRowOf(hit, isArmedDependency)
  if (row !== null && hit !== null) return pointerImageOf(row, pointerFacingOf(hit), pointerInkOf(hit))
  if (isArmedDependency) {
    // WHY: an armed dependency applies no T-023d row (PTD-3), so an end, a dummy,
    // a body or a figure must not promise a move; IN-2 asks for the plain arrow.
    if (hit !== null) return 'default'
    // DEVIATION: spec says an armed pointer shows drawing (IN-2); here an armed dependency shows none (DFC-556)
    return null
  }
  if (hit !== null) return null
  if (armed.kind === 'notArmed') return 'default'
  return 'copy'
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_END_POINTER_SIZES: {
  readonly 'S-249': number
  readonly 'S-294': readonly [number, number]
  readonly 'S-295': readonly [number, number]
  readonly 'S-296': number
  readonly 'S-297': number
} = {
  'S-249': 16,
  'S-294': [10, 7.5],
  'S-295': [12, 8],
  'S-296': 12,
  'S-297': 0.47,
}
// </generated>
