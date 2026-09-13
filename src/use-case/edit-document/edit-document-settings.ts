// EditDocument -- the presentation-group aggregate: CM-56 to CM-71 of table T-108.
//
// @unit      UF-18  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// Every command here writes the presentation group alone (FR-063). Fit's
// row-opening half is CM-72 (`expandAllTaskGroups`, in edit-task-group.ts); the
// plan reads what changed rather than the group column, so nothing here relies
// on the two agreeing.

import type { Document } from '../../entity/document-model/document/document'
import {
  SETTINGS_DERIVED,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import { dayOf } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

/**
 * What the document does not hold, and so must arrive from outside (table T-206
 * keeps S-97 / S-98 out of it; FR-016, FR-052).
 *
 * The clamp lives here rather than in the wheel translator so the Agent API
 * entrance is bounded too (FR-028).
 */
export interface SettingsLimits {
  readonly zoomMin: number
  readonly zoomMax: number
  /**
   * What the Row Area's width would be with both panel widths at zero:
   * `regions.rowArea.width + rowTitlePanelWidth + propertyPanelWidth`, so this
   * file subtracts only the pair it is judging.
   *
   * ⛔ Do not rebuild it from a window width here: the arithmetic belongs to
   * `regionsFromScreen` (PI-35), and a copy that dropped the scrollbar term was
   * wrong. Reading ScreenRegions directly would add an edge figures F-013 to
   * F-017 do not draw (EditDocument's only edge there is to ScheduleLayout).
   */
  readonly rowAreaWidthWithoutPanels: number
}

/**
 * The boolean rows of table T-202 that FR-049 calls toggles.
 *
 * ⛔ Written by hand: `tools/generate_entity_types.py` does not target this file.
 *
 * ⛔ `watermarkVisible` (S-144) may not be added: CM-58 writes every member into
 * `DocumentSettings`, and that row is table T-206's (FR-020, MUST NOT). The
 * screen's copy is `ScreenState.watermarkVisible`.
 */
export type VisibleElement =
  // S-227 / S-228: independent (FR-049); nothing here reads one to decide the other.
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

/** CM-56 to CM-71 of table T-108. */
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
      /**
       * S-176 / S-177: fractions of the anchor's own extent, not px (FR-080).
       * They travel with the anchors because a position is the pair.
       */
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
      /**
       * The same pair CM-66 carries. ⛔ Without them a fraction left over from
       * the previous pan would slide FR-055's anchor by up to one row and one day.
       */
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

/**
 * Runs one presentation command against the document.
 *
 * @purity pure
 */
export function editDocumentSettings(
  document: Document,
  command: DocumentSettingsCommand,
  limits: SettingsLimits,
): EditResult {
  const settings = document.documentSettings
  // Compares only the keys the arm writes, by value: rebuilding the group for a
  // value already held would give frame-loop.ts a new document reference and
  // re-stamp the trail for nothing (FR-020).
  // ⛔ Object-valued keys compare by reference, so CM-60 (a fresh `dualCursor`)
  // makes its own test before reaching this.
  const put = (part: Partial<DocumentSettings>): EditResult => {
    const keys = Object.keys(part) as readonly (keyof DocumentSettings)[]
    if (keys.every((key) => settings[key] === part[key])) return edited(document)
    return edited(withSettings(document, { ...settings, ...part }))
  }
  // FR-016: a clamp, not a refusal -- a wheel notch past the end is ordinary.
  // Shared by CM-65 and CM-71 so a change to the bound cannot move only one arm.
  const clamp = (value: number): number =>
    Math.max(limits.zoomMin, Math.min(limits.zoomMax, value))

  switch (command.kind) {
    case 'setStackDirection': // CM-56
      return put({ stackDirection: command.direction })

    case 'setElementVisible': // CM-58
      return put({ [command.element]: command.visible } as Partial<DocumentSettings>)

    case 'setGuideCursorMode': // CM-59
      // ⛔ Does not touch `dualCursor` (DC-4, MUST NOT; FR-048). Leaving the Dual
      // Cursor mode emits CM-61 from `input-command-translator.ts` instead.
      //
      // A re-press meaning `'none'` (FR-048) is decided by the translator
      // (`commandFromGuideCursorEntry`), which reads what stands; this case puts
      // whatever it is given (R2.7).
      return put({ guideCursorMode: command.mode })

    case 'setDualCursor': { // CM-60
      // IV-13
      if (dayOf(command.date1) === null || dayOf(command.date2) === null) {
        return refused([reject('CM-60', 'IV-13', 'both cursor dates must be dates')])
      }
      // `put` compares by reference, and the value written here is a fresh object.
      const held = settings.dualCursor
      if (held !== null && held.date1 === command.date1 && held.date2 === command.date2) {
        return edited(document)
      }
      return put({ dualCursor: { date1: command.date1, date2: command.date2 } })
    }

    case 'clearDualCursor': // CM-61
      // DC-7: reached by leaving the Dual Cursor mode.
      return put({ dualCursor: null })

    case 'setFontScale': { // CM-62
      // FR-039: S-2 and S-3 follow `fontScale` yet stay separate keys, so they are
      // recomputed here. The band height comes from SETTINGS_DERIVED (the rule
      // S-2 states), not from arithmetic written in this file.
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

    case 'setThemePreference': // CM-63
      return put({ themePreference: command.preference })

    case 'setThemeMonochrome': // CM-64
      return put({ themeMonochrome: command.monochrome })

    case 'setZoom': { // CM-65
      // FR-016. ⚠️ Refused, not clamped: NaN fails both comparisons, so the clamp
      // alone would store it.
      if (!Number.isFinite(command.zoomX) || !Number.isFinite(command.zoomY)) {
        return refused([reject('CM-65', 'FR-016', 'zoom must be a finite number')])
      }
      return put({ zoomX: clamp(command.zoomX), zoomY: clamp(command.zoomY) })
    }

    case 'setScrollPosition': { // CM-66
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

    case 'setPanelWidths': { // CM-67
      // FR-052's test is on the pair, which is why clampedSettings leaves both
      // widths alone. The Row Area arithmetic stays in regionsFromScreen; see
      // `rowAreaWidthWithoutPanels`.
      //
      // ⚠️ Each test is written `!(w > 0)`, not `w <= 0`: AG-8 hands commands over
      // as data, and a NaN width fails both comparisons.
      if (!(command.rowTitlePanelWidth > 0)) {
        // FR-052 (MUST NOT); S-80 puts no such floor under the other panel.
        //
        // ⚠️ S-79's formula floor (`rowTitleIndent` * `maxGroupDepth`) is not
        // applied: SETTINGS_BOUNDS leaves out bounds written over other keys, and
        // applying it here would own a second copy of the row.
        return refused([reject('CM-67', 'FR-052', 'the row title panel must be wider than zero')])
      }
      if (!(command.propertyPanelWidth >= 0)) {
        // S-80 is the row with the floor of 0 under this one, not FR-052.
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

    case 'pinTaskGroup': { // CM-68
      const held = settings.pinnedGroupIds
      if (held.includes(command.groupId)) return edited(document)
      // FR-098: refuse at the cap, never drop the oldest pin. A refusal, not a
      // stop: unlike ST-7, this limit is reached in ordinary use.
      if (held.length >= settings.pinnedRowMax) {
        return refused([
          reject('CM-68', 'FR-098', `already holding ${settings.pinnedRowMax} pinned rows`),
        ])
      }
      return put({ pinnedGroupIds: [...held, command.groupId] })
    }

    case 'unpinTaskGroup': { // CM-69
      const held = settings.pinnedGroupIds
      if (!held.includes(command.groupId)) return edited(document)
      return put({ pinnedGroupIds: held.filter((one) => one !== command.groupId) })
    }

    case 'fitScheduleToScreen': { // CM-71
      // The first of FR-031's two writes; CM-72 opens the collapsed rows second.
      // ⛔ Do not fold the two into one write or one bundle (AG-3): WS-4 pushes the
      // document from before a write, so only this order lets an undo restore the
      // collapses without rewinding the zoom (UN-8, UN-17).
      //
      // The zoom arrives measured, because FR-055's extent is layoutEngine's
      // (table T-068); the range is FR-016's, so it is clamped like CM-65's.
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
