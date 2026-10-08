// Runs the presentation-group commands against the document.
// @unit      UF-18  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DERIVED,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import {
  compareDays,
  dayOf,
  textOfDayEnd,
  textOfDayStart,
} from '../../entity/document-model/schedule/schedule'
import { displayRatioOf } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'

// see FR-016, FR-052, T-206
export interface SettingsLimits {
  readonly zoomMin: number
  readonly zoomMax: number
  // TRAP: never rebuild this from a window width here; regionsFromScreen owns that arithmetic.
  readonly rowAreaWidthWithoutPanels: number
}

// see T-108
export type DocumentSettingsCommand =
  | { readonly kind: 'setStackDirection'; readonly direction: 'up' | 'down' }
  | { readonly kind: 'setElementVisible'; readonly element: VisibleElement; readonly visible: boolean }
  | { readonly kind: 'setFontScale'; readonly scale: 'S' | 'M' | 'L' }
  | { readonly kind: 'setDisplayScale'; readonly scale: DocumentSettings['displayScale'] }
  | { readonly kind: 'setThemeMonochrome'; readonly monochrome: boolean }
  | { readonly kind: 'setZoom'; readonly zoomX: number; readonly zoomY: number }
  | {
      readonly kind: 'setScrollPosition'
      readonly scrollDate: string | null
      readonly scrollGroupId: string | null
      readonly scrollDayOffset: number
      readonly scrollGroupOffset: number
    }
  | { readonly kind: 'setRowTitlePanelWidth'; readonly rowTitlePanelWidth: number }
  | { readonly kind: 'pinTaskGroup'; readonly groupId: string }
  | { readonly kind: 'unpinTaskGroup'; readonly groupId: string }
  | {
      readonly kind: 'fitScheduleToScreen'
      readonly zoomX: number
      readonly zoomY: number
      readonly scrollDate: string | null
      readonly scrollGroupId: string | null
      readonly scrollDayOffset: number
      readonly scrollGroupOffset: number
    }
  | {
      readonly kind: 'setLevelZeroTreeState'
      readonly levelZeroTreeState: DocumentSettings['levelZeroTreeState']
    }
  // see CM-88, CM-89, CM-90, FX-1, FX-4, FX-5
  | {
      readonly kind: 'setFitSpan'
      readonly fitSpanStart: string | null
      readonly fitSpanFinish: string | null
    }
  | { readonly kind: 'clearFitSpan' }
  // WHY: carries the shown span, so a fix entered over an empty span copies it in the same one step (FX-4).
  | {
      readonly kind: 'setFitSpanFixed'
      readonly fitSpanFixed: boolean
      readonly shownStart: string | null
      readonly shownFinish: string | null
    }
  // see CM-91, WF-1
  | { readonly kind: 'setRowTitlePanelWidthFixed'; readonly rowTitlePanelWidthFixed: boolean }

// WHY: a Record over the type, so a value added to S-418 fails to compile here.
const LEVEL_ZERO_TREE_STATES: Readonly<Record<DocumentSettings['levelZeroTreeState'], true>> = {
  auto: true,
  collapsed: true,
}

/** @purity pure */
function withSettings(document: Document, settings: DocumentSettings): Document {
  return { ...document, documentSettings: settings }
}

type SettingsPut = (part: Partial<DocumentSettings>) => EditResult

// see CM-67, FR-052
/** @purity pure */
function rowTitlePanelWidthEdited(
  settings: DocumentSettings,
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setRowTitlePanelWidth' }>,
  limits: SettingsLimits,
  put: SettingsPut,
): EditResult {
  // TRAP: test as !(w > 0), not w <= 0; AG-8 hands commands over as data and NaN fails both.
  if (!(command.rowTitlePanelWidth > 0)) {
    // WHY: S-79's formula floor is not applied; applying it here would own a second copy of that row.
    return refused([reject('CM-67', 'FR-052', 'the row title panel must be wider than zero')])
  }
  // TRAP: the limit is measured off the DRAWN regions, so the stored width has to be scaled to meet it.
  const rowArea = limits.rowAreaWidthWithoutPanels - command.rowTitlePanelWidth * displayRatioOf(settings)
  if (!(rowArea > 0)) {
    return refused([reject('CM-67', 'FR-052', 'the width would leave the Row Area at or below zero')])
  }
  return put({ rowTitlePanelWidth: command.rowTitlePanelWidth })
}

// see CM-86, S-418, T-328
/** @purity pure */
function levelZeroTreeStateEdited(
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setLevelZeroTreeState' }>,
  put: SettingsPut,
): EditResult {
  // WHY: judged at run time, not left to the type; the Agent API hands commands over as data (AG-5).
  if (!Object.prototype.hasOwnProperty.call(LEVEL_ZERO_TREE_STATES, command.levelZeroTreeState)) {
    return refused([
      reject('CM-86', 'FR-004', `not a level zero tree state S-418 names: ${command.levelZeroTreeState}`),
    ])
  }
  return put({ levelZeroTreeState: command.levelZeroTreeState })
}

// see CM-62, FR-039, S-70
/** @purity pure */
function fontScaleEdited(
  settings: DocumentSettings,
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setFontScale' }>,
  put: SettingsPut,
): EditResult {
  const ruler = SETTINGS_DERIVED.rulerFont
  const rulerFont = SETTINGS_CONSTANTS[ruler.index][command.scale] * ruler.times
  const band = SETTINGS_DERIVED.rulerHeight
  const padded = { ...settings, rulerFont }
  return put({
    fontScale: command.scale,
    rulerFont,
    rulerHeight:
      padded[band.from] * band.times +
      band.plus +
      SETTINGS_CONSTANTS[band.plusFrom] * band.plusTimes,
  })
}

// see CM-68, FR-098
/** @purity pure */
function pinEdited(
  settings: DocumentSettings,
  command: Extract<DocumentSettingsCommand, { readonly kind: 'pinTaskGroup' }>,
  put: SettingsPut,
): EditResult {
  const held = settings.pinnedGroupIds
  if (held.includes(command.groupId)) return put({ pinnedGroupIds: held })
  if (held.length >= SETTINGS_CONSTANTS.pinnedRowMax) {
    return refused([
      reject('CM-68', 'FR-098', `already holding ${SETTINGS_CONSTANTS.pinnedRowMax} pinned rows`),
    ])
  }
  return put({ pinnedGroupIds: [...held, command.groupId] })
}

type FitSpanPair = { readonly span: Partial<DocumentSettings> } | { readonly refusal: EditResult }

// see FX-1, RS-58, WT-6, WT-7
/** @purity pure */
function fitSpanPairOf(command: 'CM-88' | 'CM-90', startIn: string | null, finishIn: string | null): FitSpanPair {
  const startText = startIn ?? finishIn
  const finishText = finishIn ?? startIn
  const start = dayOf(startText)
  const finish = dayOf(finishText)
  if (start === null || finish === null) {
    return { refusal: refused([reject(command, 'S-518', `not a pair of dates: ${startText} / ${finishText}`)]) }
  }
  // TRAP: refused, never pulled to the start; only a document read is settled that way (FX-1).
  if (compareDays(finish, start) < 0) {
    return { refusal: refused([reject(command, 'FX-1', 'the fit span finishes before it starts')]) }
  }
  return { span: { fitSpanStart: textOfDayStart(start), fitSpanFinish: textOfDayEnd(finish) } }
}

/** @purity pure */
function fitSpanEdited(
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setFitSpan' }>,
  put: SettingsPut,
): EditResult {
  const pair = fitSpanPairOf('CM-88', command.fitSpanStart, command.fitSpanFinish)
  return 'refusal' in pair ? pair.refusal : put(pair.span)
}

// see CM-90, FX-1, FX-4
/** @purity pure */
function fitSpanFixedEdited(
  settings: DocumentSettings,
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setFitSpanFixed' }>,
  put: SettingsPut,
): EditResult {
  const hasSpan = dayOf(settings.fitSpanStart) !== null && dayOf(settings.fitSpanFinish) !== null
  if (!command.fitSpanFixed || hasSpan) return put({ fitSpanFixed: command.fitSpanFixed })
  const pair = fitSpanPairOf('CM-90', command.shownStart, command.shownFinish)
  return 'refusal' in pair ? pair.refusal : put({ ...pair.span, fitSpanFixed: true })
}

type FitSpanCommand = Extract<DocumentSettingsCommand, { readonly kind: 'setFitSpan' | 'clearFitSpan' | 'setFitSpanFixed' }>

const FIT_SPAN_KINDS: Readonly<Record<FitSpanCommand['kind'], true>> = {
  setFitSpan: true,
  clearFitSpan: true,
  setFitSpanFixed: true,
}

/** @purity pure */
function isFitSpanCommand(command: DocumentSettingsCommand): command is FitSpanCommand {
  return Object.prototype.hasOwnProperty.call(FIT_SPAN_KINDS, command.kind)
}

// see CM-88, CM-89, CM-90, FX-1, FX-4, FX-5
/** @purity pure */
function fitSpanCommandEdited(settings: DocumentSettings, command: FitSpanCommand, put: SettingsPut): EditResult {
  if (command.kind === 'setFitSpan') return fitSpanEdited(command, put)
  if (command.kind === 'setFitSpanFixed') return fitSpanFixedEdited(settings, command, put)
  // WHY: a cleared span takes its fix with it in the same one step (FX-5).
  return put({ fitSpanStart: null, fitSpanFinish: null, fitSpanFixed: false })
}

// see T-108, FR-063
/** @purity pure */
export function editDocumentSettings(
  document: Document,
  command: DocumentSettingsCommand,
  limits: SettingsLimits,
): EditResult {
  const settings = document.documentSettings
  const put: SettingsPut = (part) => {
    const keys = Object.keys(part) as readonly (keyof DocumentSettings)[]
    if (keys.every((key) => settings[key] === part[key])) return edited(document)
    return edited(withSettings(document, { ...settings, ...part }))
  }
  const clamp = (value: number): number =>
    Math.max(limits.zoomMin, Math.min(limits.zoomMax, value))
  if (isFitSpanCommand(command)) return fitSpanCommandEdited(settings, command, put)

  switch (command.kind) {
    case 'setStackDirection':
      return put({ stackDirection: command.direction })

    case 'setElementVisible':
      return put({ [command.element]: command.visible } as Partial<DocumentSettings>)

    case 'setFontScale':
      return fontScaleEdited(settings, command, put)

    // see CM-74, FR-039
    case 'setDisplayScale':
      return put({ displayScale: command.scale })

    case 'setThemeMonochrome':
      return put({ themeMonochrome: command.monochrome })

    case 'setZoom': {
      // TRAP: refuse NaN here; it fails both comparisons, so the clamp alone would store it.
      if (!Number.isFinite(command.zoomX) || !Number.isFinite(command.zoomY)) {
        return refused([reject('CM-65', 'FR-016', 'zoom must be a finite number')])
      }
      return put({ zoomX: clamp(command.zoomX), zoomY: clamp(command.zoomY) })
    }

    case 'setScrollPosition': {
      if (command.scrollDate !== null && dayOf(command.scrollDate) === null) {
        return refused([reject('CM-66', 'S-77', `not a date: ${command.scrollDate}`)])
      }
      return put({
        scrollDate: command.scrollDate,
        scrollGroupId: command.scrollGroupId,
        scrollDayOffset: command.scrollDayOffset,
        scrollGroupOffset: command.scrollGroupOffset,
      })
    }

    case 'setRowTitlePanelWidth':
      return rowTitlePanelWidthEdited(settings, command, limits, put)

    case 'pinTaskGroup':
      return pinEdited(settings, command, put)

    case 'unpinTaskGroup': {
      const held = settings.pinnedGroupIds
      if (!held.includes(command.groupId)) return edited(document)
      return put({ pinnedGroupIds: held.filter((one) => one !== command.groupId) })
    }

    case 'fitScheduleToScreen': {
      // TRAP: keep CM-71 and CM-72 two writes in this order, or an undo rewinds the zoom (UN-8, UN-17).
      if (!Number.isFinite(command.zoomX) || !Number.isFinite(command.zoomY)) {
        return refused([reject('CM-71', 'FR-016', 'zoom must be a finite number')])
      }
      return put({
        zoomX: clamp(command.zoomX),
        zoomY: clamp(command.zoomY),
        scrollDate: command.scrollDate,
        scrollGroupId: command.scrollGroupId,
        scrollDayOffset: command.scrollDayOffset,
        scrollGroupOffset: command.scrollGroupOffset,
      })
    }

    case 'setLevelZeroTreeState':
      return levelZeroTreeStateEdited(command, put)

    case 'setRowTitlePanelWidthFixed':
      return put({ rowTitlePanelWidthFixed: command.rowTitlePanelWidthFixed })
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_assets/tbl-glossary.md (table T-109)
//   docs/spec/_source/settings.json (table T-202)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-109, T-202, FR-049
export type VisibleElement =
  | 'baselineVisible'
  | 'planVisible'
  | 'actualVisible'
  | 'progressLineVisible'
  | 'progressMarkerVisible'
  | 'dateGridLinesVisible'
  | 'groupGridLinesVisible'
  | 'assigneeVisible'
  | 'percentCompleteVisible'
  | 'dependencyVisible'
  | 'planDatesVisible'
// </generated>
