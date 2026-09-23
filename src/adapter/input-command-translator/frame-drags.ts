// InputCommandTranslator -- drags on the screen frame into position and width writes.
// @unit      UF-94   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import {
  displayRatioOf,
  drawnSettingsOf,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { ScreenPart } from '../screen-renderer/screen-renderer'
import type { PointerInput } from './input-source'
import {
  ENTRY,
  NOT_STORED_PROPERTIES_PANEL_FLOOR,
  UNASSIGNED,
  acted,
  changed,
  followingTravel,
  panTo,
  type InputContext,
  type PointerPress,
  type ScrollbarAxis,
  type TranslatedInput,
} from './input-command-translator'

// see FR-053, GR-19
/** @purity pure */
export function paletteFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  if (press === null || press.on === null) return UNASSIGNED
  if (press.on.entry !== ENTRY.paletteGrabBand) return UNASSIGNED
  if (press.followedTo === undefined) return UNASSIGNED
  return acted({ kind: 'moveCommandPalette', by: followingTravel(input, press) })
}

// see GR-21, T-038
/** @purity pure */
function scrollGearing(context: InputContext, axis: ScrollbarAxis): number {
  const area = context.regions.rowArea
  const lane = axis === 'horizontal' ? area.width : area.height
  const heldWidth = context.pressed?.horizontalWholeAtPress?.width ?? context.layout.contentWidth
  const whole = axis === 'horizontal' ? heldWidth : context.layout.contentHeight
  if (!(lane > 0) || !(whole > lane)) return 0
  return whole / lane
}

/** @purity pure */
function scrollbarTravel(
  context: InputContext,
  axis: ScrollbarAxis,
  by: { readonly dx: number; readonly dy: number },
): { readonly dx: number; readonly dy: number } {
  const gearing = scrollGearing(context, axis)
  return axis === 'horizontal'
    ? { dx: by.dx * gearing, dy: 0 }
    : { dx: 0, dy: by.dy * gearing }
}

// see FR-051, GR-21
/** @purity pure */
export function scrollbarFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  const axis = press?.on?.scrollbarAxis
  if (press === null || axis === undefined) return UNASSIGNED
  if (press.followedTo === undefined) return UNASSIGNED
  const by = scrollbarTravel(context, axis, followingTravel(input, press))
  return panTo(context, by.dx, by.dy)
}

// see FR-052, CM-67
/** @purity pure */
export function commandFromPanelDivider(
  panel: NonNullable<ScreenPart['dividerPanel']>,
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const settings = context.document.documentSettings
  const travelled = release.x - press.at.x
  return changed([
    {
      kind: 'setPanelWidths',
      rowTitlePanelWidth:
        panel === 'rowTitlePanel'
          ? rowTitlePanelWidthAfterDrag(settings, travelled)
          : settings.rowTitlePanelWidth,
      propertyPanelWidth:
        panel === 'propertiesPanel'
          ? propertyPanelWidthAfterDrag(settings, press, context, travelled)
          : settings.propertyPanelWidth,
    },
  ])
}

// see FR-052, S-80, S-171, S-248
/** @purity pure */
function propertyPanelWidthAfterDrag(
  settings: DocumentSettings,
  press: PointerPress,
  context: InputContext,
  travelled: number,
): number {
  if (travelled === 0) return settings.propertyPanelWidth
  const drawnAtPress = press.propertyPanelWidthAtPress ?? context.regions.propertiesPanel.width
  return Math.max(NOT_STORED_PROPERTIES_PANEL_FLOOR['S-248'], drawnAtPress - travelled)
}

// see FR-052, FR-039, T-252
/** @purity pure */
function rowTitlePanelWidthAfterDrag(settings: DocumentSettings, travelled: number): number {
  const stored = settings.rowTitlePanelWidth
  const ratio = displayRatioOf(settings)
  const drawnAtPress = drawnSettingsOf(settings).rowTitlePanelWidth
  const floor = drawnSettingsOf({ ...settings, rowTitlePanelWidth: 0 }).rowTitlePanelWidth
  const isWiderThanFloor = drawnAtPress + travelled > floor
  if (!isWiderThanFloor) return Math.min(stored, floor / ratio)
  const drawnTravel = drawnAtPress - stored * ratio + travelled
  return stored + drawnTravel / ratio
}

/** @purity pure */
export function commandFromScrollbar(
  axis: ScrollbarAxis,
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const by = scrollbarTravel(context, axis, followingTravel(release, press))
  return panTo(context, by.dx, by.dy)
}
