// Runs the presentation-group commands against the document.
// @unit      UF-18  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import {
  SETTINGS_DERIVED,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import { dayOf } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

// see FR-016, FR-052, T-206
export interface SettingsLimits {
  readonly zoomMin: number
  readonly zoomMax: number
  // TRAP: never rebuild this from a window width here; regionsFromScreen owns that arithmetic.
  readonly rowAreaWidthWithoutPanels: number
}

// see FR-049, T-202
// TRAP: never add watermarkVisible; CM-58 would write a T-206 row into DocumentSettings (FR-020).
export type VisibleElement =
  | 'planVisible'
  | 'actualVisible'
  | 'assigneeVisible'
  | 'percentCompleteVisible'
  | 'dependencyVisible'
  | 'progressMarkerVisible'
  | 'progressLineVisible'
  | 'dateGridLinesVisible'
  | 'groupGridLinesVisible'
  | 'baselineVisible'

// see T-108
export type DocumentSettingsCommand =
  | { readonly kind: 'setStackDirection'; readonly direction: 'up' | 'down' }
  | { readonly kind: 'setElementVisible'; readonly element: VisibleElement; readonly visible: boolean }
  | {
      readonly kind: 'setGuideCursorMode'
      readonly mode: 'none' | 'crosshair' | 'single-vertical'
    }
  | { readonly kind: 'setDualCursor'; readonly date1: string; readonly date2: string }
  | { readonly kind: 'clearDualCursor' }
  | { readonly kind: 'setFontScale'; readonly scale: 'S' | 'M' | 'L' }
  | { readonly kind: 'setThemePreference'; readonly preference: 'light' | 'dark' }
  | { readonly kind: 'setThemeMonochrome'; readonly monochrome: boolean }
  | { readonly kind: 'setZoom'; readonly zoomX: number; readonly zoomY: number }
  | {
      readonly kind: 'setScrollPosition'
      readonly scrollDate: string | null
      readonly scrollGroupId: string | null
      readonly scrollDayOffset: number
      readonly scrollGroupOffset: number
    }
  | { readonly kind: 'setPanelWidths'; readonly rowTitlePanelWidth: number; readonly propertyPanelWidth: number }
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

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}

/** @purity pure */
function withSettings(document: Document, settings: DocumentSettings): Document {
  return { ...document, documentSettings: settings }
}

// see T-108, FR-063
/** @purity pure */
export function editDocumentSettings(
  document: Document,
  command: DocumentSettingsCommand,
  limits: SettingsLimits,
): EditResult {
  const settings = document.documentSettings
  // TRAP: put compares by reference, so an object-valued key (dualCursor) needs its own test first.
  const put = (part: Partial<DocumentSettings>): EditResult => {
    const keys = Object.keys(part) as readonly (keyof DocumentSettings)[]
    if (keys.every((key) => settings[key] === part[key])) return edited(document)
    return edited(withSettings(document, { ...settings, ...part }))
  }
  const clamp = (value: number): number =>
    Math.max(limits.zoomMin, Math.min(limits.zoomMax, value))

  switch (command.kind) {
    case 'setStackDirection':
      return put({ stackDirection: command.direction })

    case 'setElementVisible':
      return put({ [command.element]: command.visible } as Partial<DocumentSettings>)

    case 'setGuideCursorMode':
      return put({ guideCursorMode: command.mode })

    case 'setDualCursor': {
      if (dayOf(command.date1) === null || dayOf(command.date2) === null) {
        return refused([reject('CM-60', 'IV-13', 'both cursor dates must be dates')])
      }
      const held = settings.dualCursor
      if (held !== null && held.date1 === command.date1 && held.date2 === command.date2) {
        return edited(document)
      }
      return put({ dualCursor: { date1: command.date1, date2: command.date2 } })
    }

    case 'clearDualCursor':
      return put({ dualCursor: null })

    case 'setFontScale': {
      const rulerFont = settings.fontScaleSizes[command.scale]
      const band = SETTINGS_DERIVED.rulerHeight
      const padded = { ...settings, rulerFont }
      return put({
        fontScale: command.scale,
        rulerFont,
        rulerHeight:
          padded[band.from] * band.times +
          band.plus +
          padded[band.plusFrom] * band.plusTimes,
      })
    }

    case 'setThemePreference':
      return put({ themePreference: command.preference })

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

    case 'setPanelWidths': {
      // TRAP: test as !(w > 0), not w <= 0; AG-8 hands commands over as data and NaN fails both.
      if (!(command.rowTitlePanelWidth > 0)) {
        // WHY: S-79's formula floor is not applied; applying it here would own a second copy of that row.
        return refused([reject('CM-67', 'FR-052', 'the row title panel must be wider than zero')])
      }
      if (!(command.propertyPanelWidth >= 0)) {
        return refused([reject('CM-67', 'S-80', 'a panel width may not be negative')])
      }
      const rowArea =
        limits.rowAreaWidthWithoutPanels -
        command.rowTitlePanelWidth -
        command.propertyPanelWidth
      if (!(rowArea > 0)) {
        return refused([reject('CM-67', 'FR-052', 'the pair would leave the Row Area at or below zero')])
      }
      return put({
        rowTitlePanelWidth: command.rowTitlePanelWidth,
        propertyPanelWidth: command.propertyPanelWidth,
      })
    }

    case 'pinTaskGroup': {
      const held = settings.pinnedGroupIds
      if (held.includes(command.groupId)) return edited(document)
      if (held.length >= settings.pinnedRowMax) {
        return refused([
          reject('CM-68', 'FR-098', `already holding ${settings.pinnedRowMax} pinned rows`),
        ])
      }
      return put({ pinnedGroupIds: [...held, command.groupId] })
    }

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
  }
}
