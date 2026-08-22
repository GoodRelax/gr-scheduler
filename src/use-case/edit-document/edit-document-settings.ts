// EditDocument -- the presentation-group aggregate.
//
// @unit      UF-18  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// The sixteen commands table T-108 puts in 見せ方の群: CM-56 to CM-71.
//
// ⚠️ Fifteen of the sixteen change the presentation group alone, so FR-063
// forbids them raising the revision. CM-71 is the exception and it is NOT
// decided by the group column: table T-051's HF-8 has fit discard what people
// collapsed, and `isCollapsed` is a TaskGroup column -- schedule-group data.
// The plan therefore reads WHAT CHANGED rather than which group the command
// was filed under.
//
// ⚠️ It is not the public entry of its component (Chapter 5.3, MUST NOT).

import type { Document } from '../../entity/document-model/document/document'
import {
  SETTINGS_DERIVED,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import { dayOf } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

/**
 * What the document does not hold, and so must arrive from outside.
 *
 * ⚠️ Table T-206 keeps `zoomMin` (S-97) and `zoomMax` (S-98) out of the
 * document on purpose -- they are "操作の速さであって結果ではない" -- yet
 * FR-016 still requires the zoom to be held inside them (MUST). The Row Area's
 * width is the same kind of value: FR-052 makes "the Row Area is wider than
 * zero" the test for a pair of panel widths, and the screen it is measured on
 * cannot be seen from the document alone.
 *
 * ⚠️ The clamp lives HERE rather than in the translator that reads the wheel,
 * because FR-028 requires the Agent API to be able to do what the screen can.
 * A clamp on the pointer path only would leave the other entrance unbounded.
 */
export interface SettingsLimits {
  readonly zoomMin: number
  readonly zoomMax: number
  /**
   * What the Row Area's width would be with both panel widths at zero.
   *
   * ⭐ FR-052's arithmetic is NOT written here. Its one implementation is
   * `regionsFromScreen` (PI-35 of ScreenRegions): the Schedule Canvas width,
   * less `canvasPadding` (S-56), less the two panel widths, less the vertical
   * scrollbar that the rule after table T-031 gives width to. The caller
   * already holds that frame's regions -- CS-1 gathers the screen's dimensions
   * once at the head of the frame -- so it hands back the sum
   *
   *     regions.rowArea.width + rowTitlePanelWidth + propertyPanelWidth
   *
   * and this file subtracts only the pair it is judging.
   *
   * ⛔ Do not rebuild it from a window width here. The copy that did dropped
   * the scrollbar term, and FR-052 counts it -- two copies, one wrong. The
   * import direction would allow reading ScreenRegions instead (LR-1 lets
   * UseCase reach inward to layoutEngine), but Chapter 5.2 keeps the
   * component-to-component edges in figures F-013 to F-017, and the only edge
   * they give EditDocument into that layer is `EditDocument -> ScheduleLayout`.
   * Adding a second one is a change request, not an implementation choice.
   */
  readonly rowAreaWidthWithoutPanels: number
}

/** The eight boolean rows of table T-202 -- the ones FR-049 calls toggles. */
export type VisibleElement =
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
  | { readonly kind: 'setPlanActualDisplay'; readonly display: 'both' | 'plan-only' | 'actual-only' }
  | { readonly kind: 'setElementVisible'; readonly element: VisibleElement; readonly visible: boolean }
  | {
      readonly kind: 'setGuideCursorMode'
      readonly mode: 'none' | 'crosshair' | 'single-vertical' | 'double-vertical'
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
    }
  | { readonly kind: 'setPanelWidths'; readonly rowTitlePanelWidth: number; readonly propertyPanelWidth: number }
  | { readonly kind: 'pinTaskGroup'; readonly groupId: string }
  | { readonly kind: 'unpinTaskGroup'; readonly groupId: string }
  | { readonly kind: 'setExportPngScale'; readonly scale: 1 | 2 }
  | {
      readonly kind: 'fitScheduleToScreen'
      readonly zoomX: number
      readonly zoomY: number
      readonly scrollDate: string | null
      readonly scrollGroupId: string | null
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
  const put = (part: Partial<DocumentSettings>): EditResult =>
    edited(withSettings(document, { ...settings, ...part }))

  switch (command.kind) {
    case 'setStackDirection': // CM-56
      return put({ stackDirection: command.direction })

    case 'setPlanActualDisplay': // CM-57
      // FR-049 forbids hiding both bars, which the three-valued enumeration
      // already makes impossible -- "OFF OFF は作らせない" is why it is an
      // enumeration and not two toggles.
      return put({ planActualDisplay: command.display })

    case 'setElementVisible': // CM-58
      return put({ [command.element]: command.visible } as Partial<DocumentSettings>)

    case 'setGuideCursorMode': // CM-59
      // ⚠️ DC-4 forbids this taking the Dual Cursor down with it (MUST NOT):
      // FR-048 keeps the three kinds independent, so one entrance may not
      // switch off two. Nothing here touches `dualCursor`.
      return put({ guideCursorMode: command.mode })

    case 'setDualCursor': { // CM-60
      // IV-13: while `dualCursor` is not null, BOTH dates are not null.
      if (dayOf(command.date1) === null || dayOf(command.date2) === null) {
        return refused([reject('CM-60', 'IV-13', 'both cursor dates must be dates')])
      }
      return put({ dualCursor: { date1: command.date1, date2: command.date2 } })
    }

    case 'clearDualCursor': // CM-61
      // DC-7: this is the ONLY way the two lines go away. Leaving the mode
      // does not clear them, so that a measurement can be read while doing
      // something else -- and without this entrance EP-6 would keep drawing
      // them into every export with no way to stop it.
      return put({ dualCursor: null })

    case 'setFontScale': { // CM-62
      // ⭐ S-2 and S-3 follow `fontScale` (FR-039), so the ruler's type and
      // band are recomputed here rather than stored independently: keeping
      // them as separate keys is what lets them drift -- FR-039 requires both
      // halves: they follow (MUST) and they stay separate keys (MUST).
      //
      // ⭐ The band height is NOT arithmetic this file owns. S-2 states it as
      // a rule over other keys, and CR-200 gave that rule a printed carrier
      // (SETTINGS_DERIVED), so the numbers live in the manuscript alone.
      // ⚠️ Before that, this line read `rulerFont * 3 + 6` -- and the 6 has
      // since become a row of its own (S-136), which a copy here could not
      // have followed.
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
      // FR-016: hold the zoom inside what S-75 and S-76 allow (MUST). This is
      // a CLAMP, not a refusal -- the requirement says 収める, and a wheel
      // notch past the end is an ordinary thing to do, not an error.
      const clamp = (value: number): number =>
        Math.max(limits.zoomMin, Math.min(limits.zoomMax, value))
      if (!Number.isFinite(command.zoomX) || !Number.isFinite(command.zoomY)) {
        return refused([reject('CM-65', 'FR-016', 'zoom must be a finite number')])
      }
      return put({ zoomX: clamp(command.zoomX), zoomY: clamp(command.zoomY) })
    }

    case 'setScrollPosition': { // CM-66
      if (command.scrollDate !== null && dayOf(command.scrollDate) === null) {
        return refused([reject('CM-66', 'S-77', `not a date: ${command.scrollDate}`)])
      }
      return put({ scrollDate: command.scrollDate, scrollGroupId: command.scrollGroupId })
    }

    case 'setPanelWidths': { // CM-67
      // FR-052 states the test between the two: the Row Area has to stay
      // wider than zero. It cannot be applied to either width on its own,
      // which is why clampedSettings deliberately leaves this pair alone.
      //
      // ⭐ The arithmetic that gets to a Row Area width is regionsFromScreen's
      // and stays there; `rowAreaWidthWithoutPanels` arrives already carrying
      // the padding and the scrollbar, and this branch subtracts only the pair
      // it is judging. See the field for why it is not read from layoutEngine.
      //
      // ⚠️ Each test below is the NEGATION of the rule's own wording rather
      // than its opposite (`!(w > 0)`, not `w <= 0`), because AG-8 hands a
      // command over as data: a width that is not a number answers false to
      // BOTH comparisons and would otherwise slip through the MUST NOT.
      if (!(command.rowTitlePanelWidth > 0)) {
        // FR-052 (MUST NOT): the row title panel may not be taken to zero --
        // SC-3 of table T-031 keeps it showing at every zoom, and a width of
        // zero breaks that. S-80 puts no such floor under the other panel.
        //
        // ⚠️ S-79 states a tighter floor -- `rowTitleIndent` * `maxGroupDepth`,
        // the width the deepest indent needs -- and this does NOT apply it:
        // that is a bound written as a formula over other keys, the same kind
        // SETTINGS_BOUNDS leaves out, so applying it here would own a second
        // copy of the row. It belongs in the same change request as S-2.
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
      // FR-098: at the cap, refuse and say so. Dropping the oldest pin is
      // forbidden (MUST NOT) -- a row someone fixed in place must not drift
      // away unannounced. Unlike ST-7's safety valve this is a limit people
      // reach in ordinary use, so it does not stop the run.
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

    case 'setExportPngScale': // CM-70
      return put({ exportPngScale: command.scale })

    case 'fitScheduleToScreen': { // CM-71
      // ⭐ The one command of this group that reaches the schedule: HF-8 drops
      // every collapse a person made. UN-17 makes that half undoable while
      // UN-8 leaves the zoom and the position outside, and FR-063 therefore
      // raises the revision for this command and no other one here.
      //
      // ⚠️ The zoom itself arrives as a value. FR-055's two passes need the
      // laid-out extent, which belongs to layoutEngine and to the frame that
      // ran it -- recomputing it here would put a second copy of table T-068
      // in the UseCase layer.
      const groups = document.schedule.taskGroups
      const opened = groups.map((one) => (one.isCollapsed === true ? { ...one, isCollapsed: false } : one))
      const changed = opened.some((one, index) => one !== groups[index])
      const next = changed
        ? { ...document, schedule: { ...document.schedule, taskGroups: opened } }
        : document
      return edited(
        withSettings(next, {
          ...settings,
          zoomX: command.zoomX,
          zoomY: command.zoomY,
          scrollDate: command.scrollDate,
          scrollGroupId: command.scrollGroupId,
        }),
      )
    }
  }
}
