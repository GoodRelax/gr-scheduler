// ScreenRenderer: the panel dividers and scrollbar lanes of ScreenView's frame.
// @unit      UF-61   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
// Generated region at the end: docs/spec/_source/settings.json. Do not edit by hand; npm run gen.

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import { GROUP_GRID_LINE_WIDTH_PX } from '../svg-renderer/svg-renderer'
import type {
  PanelDivider,
  ScreenFrame,
  ScreenSession,
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

// see FR-051, FR-052, SC-4
/** @purity pure */
export function screenFrameFromRegions(
  regions: ScreenRegions,
  settings: DocumentSettings,
  state: ScreenState,
  session: ScreenSession,
): ScreenFrame {
  const rowArea = regions.rowArea

  // WHY: the lane, not canvasPadding, sits against the Row Area: FR-052 fixes no order
  // and FR-051 has the bar take its place from the Row Area.
  const gapRightOfRowArea = regions.propertiesPanel.x - (rowArea.x + rowArea.width)
  const scrollbarThickness = Math.max(0, gapRightOfRowArea - settings.canvasPadding)

  const horizontalTrack: ScreenRect = {
    x: rowArea.x,
    y: rowArea.y + rowArea.height,
    width: rowArea.width,
    height: scrollbarThickness,
  }
  const verticalTrack: ScreenRect = {
    x: rowArea.x + rowArea.width,
    y: rowArea.y,
    width: scrollbarThickness,
    height: rowArea.height,
  }

  return {
    isFullScreen: state.fullScreen,
    dividers: [
      dividerAt(
        'rowTitlePanel',
        regions.rowTitlePanel,
        regions.rowTitlePanel.x + regions.rowTitlePanel.width,
      ),
      dividerAt('propertiesPanel', regions.propertiesPanel, regions.propertiesPanel.x),
    ],
    scrollbars: [
      scrollbarIn(
        'horizontal',
        horizontalTrack,
        horizontalTrack.width,
        session.scrollExtent.contentWidth,
        session.scrollExtent.offsetX ?? 0,
      ),
      scrollbarIn(
        'vertical',
        verticalTrack,
        session.scrollExtent.visibleHeight,
        session.scrollExtent.contentHeight,
        session.scrollExtent.offsetY ?? 0,
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
export const NOT_STORED_SCROLLBAR_SIZES: {
  readonly 'S-205': number
} = {
  'S-205': 8,
}
// </generated>
