// The size a row name is drawn at, for the cases that build a RowTitle by hand.

import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'

const DEFAULT_ROW_TITLE_FONT = SETTINGS_DEFAULTS['rowTitleFont'] as number
const DEFAULT_ROW_TITLE_TOP_SCALE = SETTINGS_DEFAULTS['rowTitleTopScale'] as number

// see FR-094, T-201
/** @purity pure */
export function rowNameFontPx(
  depth: number,
  rowTitleFont: number = DEFAULT_ROW_TITLE_FONT,
  rowTitleTopScale: number = DEFAULT_ROW_TITLE_TOP_SCALE,
): number {
  return depth === 1 ? rowTitleFont * rowTitleTopScale : rowTitleFont
}

// see FR-094, T-201
/** @purity pure */
export function rowNameFont(depth: number): { readonly fontPx: number } {
  return { fontPx: rowNameFontPx(depth) }
}
