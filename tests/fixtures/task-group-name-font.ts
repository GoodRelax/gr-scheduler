// The size a task group name is drawn at, for the cases that build a TaskGroupTitle by hand.

import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'

const DEFAULT_TASK_GROUP_TITLE_FONT = SETTINGS_CONSTANTS.taskGroupTitleFont
const DEFAULT_TASK_GROUP_TITLE_TOP_SCALE = SETTINGS_CONSTANTS.taskGroupTitleTopScale

// see FR-094, T-201
/** @purity pure */
export function taskGroupNameFontPx(
  depth: number,
  taskGroupTitleFont: number = DEFAULT_TASK_GROUP_TITLE_FONT,
  taskGroupTitleTopScale: number = DEFAULT_TASK_GROUP_TITLE_TOP_SCALE,
): number {
  return depth === 1 ? taskGroupTitleFont * taskGroupTitleTopScale : taskGroupTitleFont
}

// see FR-094, T-201
/** @purity pure */
export function taskGroupNameFont(depth: number): { readonly fontPx: number } {
  return { fontPx: taskGroupNameFontPx(depth) }
}
