// File: FileGateway: The FileStore seam FileGateway reads and writes files through.
// @unit      UF-42   (docs/spec/05-07-design.md, table T-075)
// @component FileGateway, layer Adapter (table T-062)
// @purity    n/a
// @seam      FileStore, implemented in another layer (LR-5)

export type OpenRoute = 'chooser' | 'drop' | 'reopen' | 'baseline'

export type FileStoreFaultReason =
  | 'canceled'
  | 'permissionLost'
  | 'noOpenedFile'
  | 'unavailable'

export interface FileStoreFault {
  readonly reason: FileStoreFaultReason
  readonly what: string
}

export interface OpenedFileContent {
  readonly bytes: Uint8Array
  readonly fileName: string
}

export type OpenedFileState =
  | { readonly kind: 'none' }
  | { readonly kind: 'writable'; readonly fileName: string }
  | { readonly kind: 'permissionLost'; readonly fileName: string }

export type FileReading =
  | {
      readonly ok: true
      readonly file: OpenedFileContent
      readonly ignoredFileCount?: number
    }
  | { readonly ok: false; readonly fault: FileStoreFault }

export type FileWriting =
  | { readonly ok: true; readonly openedFile: OpenedFileState }
  | { readonly ok: false; readonly fault: FileStoreFault }

export type ChosenWriteDestination =
  | { readonly kind: 'empty' }
  | {
      readonly kind: 'occupied'
      readonly fileName: string
      readonly bytes: Uint8Array
    }

export interface ChosenFileWrite {
  readonly bytes: Uint8Array
  readonly suggestedFileName: string
  readonly extension: string
  readonly shouldBecomeOpenedFile: boolean
  askToWriteOver(destination: ChosenWriteDestination): Promise<boolean>
}

export interface FileStore {
  readFileToOpen(route: OpenRoute): Promise<FileReading>

  adoptFileReadToOpen(): void

  forgetOpenedFile(): void

  readOpenedFileState(): Promise<OpenedFileState>

  restoreOpenedFilePermission(): Promise<OpenedFileState>

  overwriteOpenedFile(bytes: Uint8Array): Promise<FileWriting>

  writeChosenFile(write: ChosenFileWrite): Promise<FileWriting>

  // Why: optional: a host with no page (Node, a test's store) has no download to hand a file to.
  downloadFile?(fileName: string, bytes: Uint8Array): void
}
