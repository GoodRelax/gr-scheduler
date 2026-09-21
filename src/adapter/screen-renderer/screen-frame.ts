// ScreenRenderer: the panel dividers and scrollbar lanes of ScreenView's frame.
// @unit      UF-61   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
// Generated region at the end: docs/spec/_source/settings.json. Do not edit by hand; npm run gen.

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import { GROUP_GRID_LINE_WIDTH_PX } from '../svg-renderer/svg-renderer'
import type {
  PanelDivider,
  ScreenFrame,
  ScreenViewReadings,
  Scrollbar,
} from './screen-renderer'

/** @purity pure */
function dividerAt(
  panel: PanelDivider['panel'],
  panelBox: ScreenRect,
  boundaryX: number,
): PanelDivider {
  const bandWidth = NOT_STORED_PANEL_DIVIDER_SIZES['S-134']
  return {
    panel,
    band: {
      x: boundaryX - bandWidth / 2,
      y: panelBox.y,
      width: bandWidth,
      height: panelBox.height,
    },
    line: {
      x: boundaryX,
      y: panelBox.y,
      width: GROUP_GRID_LINE_WIDTH_PX,
      height: panelBox.height,
    },
  }
}

/** @purity pure */
function scrollbarIn(
  axis: Scrollbar['axis'],
  track: ScreenRect,
  visible: number,
  whole: number,
  offset: number,
): Scrollbar {
  const along = axis === 'horizontal' ? track.width : track.height
  const share = whole > 0 ? Math.min(1, visible / whole) : 1
  const least = Math.min(along, NOT_STORED_SCROLLBAR_SIZES['S-205'])
  const length = Math.max(least, along * share)
  const start = Math.max(0, Math.min(along - length, whole > 0 ? (along * offset) / whole : 0))
  return {
    axis,
    track,
    thumb:
      axis === 'horizontal'
        ? { x: track.x + start, y: track.y, width: length, height: track.height }
        : { x: track.x, y: track.y + start, width: track.width, height: length },
  }
}

// see FR-052, GR-22, S-99h
// WHY: a put-away panel's boundary is the screen's right edge, the only place to grab the vertical bar.
/** @purity pure */
function dividersOf(regions: ScreenRegions, session: ScreenSession): readonly PanelDivider[] {
  const rowTitle = dividerAt(
    'rowTitlePanel',
    regions.rowTitlePanel,
    regions.rowTitlePanel.x + regions.rowTitlePanel.width,
  )
  if (session.screen.propertiesPanelContentState.kind === 'hidden') return [rowTitle]
  const properties = dividerAt('propertiesPanel', regions.propertiesPanel, regions.propertiesPanel.x)
  return [rowTitle, properties]
}

// see FR-051, FR-052, SC-4
/** @purity pure */
export function screenFrameFromRegions(
  regions: ScreenRegions,
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
): ScreenFrame {
  const rowArea = regions.rowArea

  const gapRightOfRowArea = regions.propertiesPanel.x - (rowArea.x + rowArea.width)
  const scrollbarThickness = Math.max(0, gapRightOfRowArea - settings.canvasPadding)

  const horizontalTrack: ScreenRect = {
    x: rowArea.x,
    y: rowArea.y + rowArea.height,
    width: rowArea.width,
    height: scrollbarThickness,
  }
  // see FR-051
  // TRAP: read the panel's left edge, not rowArea's right: canvasPadding lies between
  // the two, and putting the bar at rowArea's edge leaves that gap against the panel.
  const verticalTrack: ScreenRect = {
    x: regions.propertiesPanel.x - scrollbarThickness,
    y: rowArea.y,
    width: scrollbarThickness,
    height: rowArea.height,
  }

  return {
    isFullScreen: session.screen.fullScreenModeState.kind === 'full',
    dividers: dividersOf(regions, session),
    scrollbars: [
      scrollbarIn(
        'horizontal',
        horizontalTrack,
        horizontalTrack.width,
        readings.scrollExtent.contentWidth,
        readings.scrollExtent.offsetX ?? 0,
      ),
      scrollbarIn(
        'vertical',
        verticalTrack,
        readings.scrollExtent.visibleHeight,
        readings.scrollExtent.contentHeight,
        readings.scrollExtent.offsetY ?? 0,
      ),
    ],
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_PANEL_DIVIDER_SIZES: {
  readonly 'S-134': number
} = {
  'S-134': 8,
}

// see T-206
const NOT_STORED_SCROLLBAR_SIZES: {
  readonly 'S-205': number
} = {
  'S-205': 8,
}
// </generated>
