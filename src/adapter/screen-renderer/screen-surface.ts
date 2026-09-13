// Declares the seam for what the screen shows and what the person entered on it.
// @unit      UF-70   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    n/a
// @seam      ScreenSurface, implemented in another layer (LR-5)

import type {
  ExportFormatId,
  IconId,
  PanelDivider,
  PropertyFieldKey,
  Scrollbar,
  ScreenView,
} from './screen-renderer'

export interface ScreenPart {
  readonly part: string
  readonly entry: IconId | null
  readonly format: ExportFormatId | null
  readonly rowGroupId: string | null
  readonly resourceUid: number | null
  readonly dividerPanel: PanelDivider['panel'] | null
  readonly isRowGrabStrip?: boolean
  readonly noticeDismissKey: string | null
  readonly confirmationAnswer?: string
  readonly isImportReportDismiss?: boolean
  readonly scrollbarAxis?: Scrollbar['axis']
}

export interface DialogueInput {
  readonly text: string
  readonly isSettled: boolean
  readonly author: string
  readonly settledAt: string
}

export interface FieldCommit {
  readonly row: string
  readonly key: PropertyFieldKey
  readonly text: string
}

// see IF-9
export interface ScreenSurface {
  /** @purity non-pure */
  showScreenView(view: ScreenView): void

  /** @purity semi-pure-b */
  readDialogueInput(): DialogueInput | null

  // TRAP: reading takes the commit; a commit answered twice is written twice.
  /** @purity semi-pure-b */
  readFieldCommit(): FieldCommit | null

  /** @purity semi-pure-b */
  readScreenPartAt(x: number, y: number): ScreenPart | null

  /** @purity semi-pure-b */
  hasUnsettledTextEntry(): boolean
}
