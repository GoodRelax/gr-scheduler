// File: ScreenRenderer: Declares the seam for what the screen shows and what the person entered on it.
// @unit      UF-70   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    n/a
// @seam      ScreenSurface, implemented in another layer (LR-5)

import type { WindowName } from '../../use-case/advance-screen-session/advance-screen-session'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type {
  ExportFormatId,
  IconId,
  PanelDivider,
  PropertyFieldKey,
  Scrollbar,
  ScreenView,
} from './screen-renderer'
import type { SearchRowView } from './search-panel'
import type { WindowFloor, WindowGrabRegion } from './window-box'

// Spec: WB-10, GR-24
// Why: the save and open surfaces move by their title band but are no window of table T-335 (WindowName).
export type GrabbedWindowName = WindowName | 'closeOnlyTitledSurface'

// Spec: IF-9, GR-24, GR-25, GR-28
// Why: the box, range and floor ride on the answer: only the surface reads the drawn box and the generated sizes.
export type WindowGrab =
  | {
      readonly window: GrabbedWindowName
      readonly region: WindowGrabRegion
      readonly windowBox: ScreenRect
      readonly range: ScreenRect
      readonly floor: WindowFloor
    }
  | {
      readonly window: WindowName
      readonly region: 'columnBorder'
      readonly column: string
      readonly widthAtPress: number
      readonly widthFloor: number
      readonly widthCeiling: number
    }

export interface ScreenPart {
  readonly part: string
  readonly entry: IconId | null
  readonly format: ExportFormatId | null
  readonly taskGroupId: string | null
  readonly resourceUid: number | null
  readonly dividerPanel: PanelDivider['panel'] | null
  readonly isTaskGroupGrabStrip?: boolean
  readonly noticeDismissKey: string | null
  readonly confirmationAnswer?: string
  readonly isImportReportDismiss?: boolean
  // Spec: NT-2
  // Why: the reasons of the notice box under the pointer, whose timed waits stand still while it is there.
  readonly noticeBoxReasons?: readonly string[]
  readonly scrollbarAxis?: Scrollbar['axis']
  // Spec: IF-9, SJ-1
  readonly searchJumpTarget?: SearchRowView['target'] | null
  readonly windowGrab?: WindowGrab
  // Spec: IF-9, SV-7, IC-122
  // Why: every column heading carries IC-122, so the entry alone does not say which column's filter to open.
  readonly searchFilterColumn?: string | null
  // Spec: IF-9, SV-7, IC-125, IC-126
  readonly searchFilterListed?: readonly string[] | null
  // Spec: SV-7
  readonly isInFilterMenu?: boolean
  // Spec: IF-9, WC-2, WC-4, WC-8, IC-133, IC-136, IC-137, IC-164
  // Why: the weekday's AT-73 code or the row's place in the draft a repeated Holiday Settings entrance means.
  readonly holidaySettingsTarget?: string
}

export interface FieldCommit {
  readonly row: string
  readonly key: PropertyFieldKey
  readonly text: string
  // Spec: AS-5, AS-7, IC-125, IC-126
  // Why: how the assignee field was settled: a person checked (text is its uid), the add item chosen
  // (text is the name to create), every shown person checked or unchecked (text is their uids), or absent.
  readonly pick?: 'candidate' | 'add' | 'all' | 'none'
  // Spec: FX-5, UN-13
  // Why: a row of several entrances settles once, with every entrance's key and text in drawn order.
  readonly entrances?: readonly { readonly key: PropertyFieldKey; readonly text: string }[]
}

// Spec: IF-9
// Why: the row the field names, not which control: the field-edit machine carries rows (T-292).
export interface FieldEditNotice {
  readonly kind: 'began' | 'ended'
  readonly row: string
}

// Spec: IF-9
export interface ScreenSurface {
  /** @purity non-pure */
  showScreenView(view: ScreenView): void

  // Trap: reading takes the commit; a commit answered twice is written twice.
  /** @purity semi-pure-mutable */
  readFieldCommit(): FieldCommit | null

  /** @purity semi-pure-mutable */
  readScreenPartAt(x: number, y: number): ScreenPart | null

  // Trap: reading takes the notices, in the order the host raised them; a surface without this
  // seam reports no edit, so the shell reads no field as being edited.
  /** @purity semi-pure-mutable */
  readFieldEditNotices?(): readonly FieldEditNotice[]

  // Spec: IF-9, SV-2, SV-5
  // Trap: reading takes the change; null when the word has not changed since the last read.
  /** @purity semi-pure-mutable */
  readSearchWord?(): string | null
}
