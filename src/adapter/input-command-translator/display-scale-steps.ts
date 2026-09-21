// InputCommandTranslator -- one display scale step, keeping the Row Area's middle (table T-252).
// @unit      UF-93   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { rowPlacesAtZoomY } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  displayRatioOf,
  drawnSettingsOf,
  regionsAtDisplayScale,
  type ScreenRect,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  DISPLAY_SCALE_STEPS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import type { DocumentCommand } from '../../use-case/edit-document/edit-document'
import {
  changed,
  dayAnchorAt,
  rowAnchorIn,
  scrolledAnchor,
  scrollingRowsOf,
  type InputContext,
  type TranslatedInput,
} from './input-command-translator'
import {
  rowPointIn,
  topEdgeIn,
  zoomOnScreen,
  zoomWrites,
} from './zoom-and-fit'

// see FR-039, S-234
/** @purity pure */
function steppedDisplayScale(
  current: DocumentSettings['displayScale'],
  towards: 1 | -1,
): DocumentSettings['displayScale'] {
  const at = DISPLAY_SCALE_STEPS.indexOf(current)
  if (at < 0) return current
  return DISPLAY_SCALE_STEPS[at + towards] ?? current
}

// see SE-1, SE-2
// TRAP: the end word follows the press, not the entrance; SK-17 at the default names no end.
/** @purity pure */
export function withDisplayScaleShown(
  answer: TranslatedInput,
  current: DocumentSettings['displayScale'],
  next: DocumentSettings['displayScale'],
  towards: 1 | -1 | 0,
): TranslatedInput {
  const isStuck = towards !== 0 && next === current
  const end = !isStuck ? null : towards === 1 ? 'max' : 'min'
  return { ...answer, displayScaleShown: { end } }
}

// see FR-039, SK-17
// TRAP: one bundle, so the two scales come back together on one undo step (CR-410 question 2).
/** @purity pure */
export function resetLookWrites(context: InputContext): readonly DocumentCommand[] {
  const settings = context.document.documentSettings
  const home = SETTINGS_DEFAULTS['displayScale'] as DocumentSettings['displayScale']
  const zoom = zoomOnScreen(context)
  const scale = displayScaleWrites(context, home)
  const zoomed = zoom.x === 1 && zoom.y === 1 && settings.zoomX === 1 && settings.zoomY === 1
    ? []
    : zoomWrites(context, 1, 1, null, null)
  return [...scale, ...zoomed]
}

// see FR-039, CM-74, SE-1
/** @purity pure */
export function displayScaleStep(context: InputContext, towards: 1 | -1): TranslatedInput {
  const current = context.document.documentSettings.displayScale
  const next = steppedDisplayScale(current, towards)
  return withDisplayScaleShown(changed(displayScaleWrites(context, next)), current, next, towards)
}

/** @purity pure */
export function pickShown(answer: TranslatedInput): Pick<TranslatedInput, 'displayScaleShown'> {
  return answer.displayScaleShown === undefined ? {} : { displayScaleShown: answer.displayScaleShown }
}

/** @purity pure */
function centreOf(area: ScreenRect): { readonly x: number; readonly y: number } {
  return { x: area.x + area.width / 2, y: area.y + area.height / 2 }
}

// see FR-039, DS-9
/** @purity pure */
function rowAreaWidthAt(context: InputContext, next: DocumentSettings['displayScale']): number {
  const settings = context.document.documentSettings
  const held = drawnSettingsOf(settings).rowTitlePanelWidth
  const moved = drawnSettingsOf({ ...settings, displayScale: next }).rowTitlePanelWidth
  return context.regions.rowArea.width + held - moved
}

// see FR-039, DS-1
/** @purity pure */
function displayScaleWrites(
  context: InputContext,
  next: DocumentSettings['displayScale'],
): readonly DocumentCommand[] {
  const settings = context.document.documentSettings
  if (next === settings.displayScale) return []
  const scale: DocumentCommand = { kind: 'setDisplayScale', scale: next }
  const before = displayRatioOf(settings)
  const after = displayRatioOf({ ...settings, displayScale: next })
  if (!(before > 0) || !(after > 0)) return [scale]
  const area = context.regions.rowArea
  const { x: centreX, y: centreY } = centreOf(area)
  const seat = scrolledAnchor(context, 0, 0)
  const day = dayAnchorAt(context, centreX - rowAreaWidthAt(context, next) / 2 / (after / before))
  const held = rowAnchorIn(scrollingRowsOf(context.layout), centreY, seat)
  const afterRegions = regionsAtDisplayScale(context.regions, settings, next)
  // TRAP: ask PI-5 at the new ratio; the band is not linear in it, so no arithmetic answers.
  const afterRows = rowPlacesAtZoomY(
    context.document.schedule,
    {
      ...settings,
      displayScale: next,
      scrollDate: seat.scrollDate,
      scrollDayOffset: seat.scrollDayOffset,
      scrollGroupId: seat.scrollGroupId,
      scrollGroupOffset: seat.scrollGroupOffset,
    },
    afterRegions,
    zoomOnScreen(context).y,
    context.isLevelZeroFolded,
    context.rowControlsHeightPx,
  ).filter((row) => row.isPinned !== true)
  const landed = rowPointIn(afterRows, held)
  const topEdge = topEdgeIn(afterRows, seat)
  const row =
    landed === null || topEdge === null
      ? null
      : rowAnchorIn(afterRows, topEdge + (landed - centreOf(afterRegions.rowArea).y), seat)
  return [
    scale,
    {
      kind: 'setScrollPosition',
      scrollDate: day.scrollDate,
      scrollDayOffset: day.scrollDayOffset,
      scrollGroupId: (row ?? seat).scrollGroupId,
      scrollGroupOffset: (row ?? seat).scrollGroupOffset,
    },
  ]
}
