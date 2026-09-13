// Reads and writes document files through the FileStore seam.
// @unit      UF-41   (docs/spec/05-07-design.md, table T-075)
// @component FileGateway, layer Adapter (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-22

import type {
  ChosenFileWrite,
  ChosenWriteDestination,
  FileStore,
  FileStoreFault,
  FileStoreFaultReason,
  FileWriting,
  OpenedFileContent,
  OpenedFileState,
  OpenRoute,
} from './file-store'

export type {
  ChosenFileWrite,
  ChosenWriteDestination,
  FileReading,
  FileStore,
  FileStoreFault,
  FileStoreFaultReason,
  FileWriting,
  OpenedFileContent,
  OpenedFileState,
  OpenRoute,
} from './file-store'

export type DocumentFileFaultReason =
  | FileStoreFaultReason
  | 'notUtf8'
  | 'notAnOverwriteTarget'

export interface DocumentFileFault {
  readonly reason: DocumentFileFaultReason
  readonly what: string
}

export interface OpenedDocumentFile {
  readonly text: string
  readonly byteLength: number
  readonly fileName: string
}

export type DocumentFileOpening =
  | {
      readonly ok: true
      readonly file: OpenedDocumentFile
      readonly ignoredFileCount: number
    }
  | { readonly ok: false; readonly fault: DocumentFileFault }

export type SaveFileForm = 'grsJson' | 'mspdi' | 'svg' | 'png' | 'singleHtml'

export type SaveFileContent =
  | { readonly text: string }
  | { readonly bytes: Uint8Array }

export interface ProjectIdentity {
  readonly projectName: string | null
  readonly projectId: string | null
}

export interface DocumentIdentity extends ProjectIdentity {
  readonly fileName: string | null
}

export type DocumentFileSaveRequest =
  | {
      readonly destination: 'openedFile'
      readonly content: SaveFileContent
      readonly form: SaveFileForm
    }
  | ChosenFileSaveRequest

export interface ChosenFileSaveRequest {
  readonly destination: 'chosenFile'
  readonly content: SaveFileContent
  readonly form: SaveFileForm
  readonly suggestedFileName: string
  readonly extension: string
  readonly identity: DocumentIdentity
  projectIdentityFromText(text: string): ProjectIdentity | null
  confirmOverwrite(): Promise<boolean>
}

export type DocumentFileSaving =
  | { readonly ok: true; readonly openedFile: OpenedFileState }
  | { readonly ok: false; readonly fault: DocumentFileFault }

const ROUND_TRIP_FORMS: readonly SaveFileForm[] = ['grsJson', 'mspdi']

/** @purity pure */
function isRoundTripForm(form: SaveFileForm): boolean {
  return ROUND_TRIP_FORMS.includes(form)
}

/** @purity pure */
function bytesOfContent(content: SaveFileContent): Uint8Array {
  return 'text' in content ? new TextEncoder().encode(content.text) : content.bytes
}

// TRAP: ignoreBOM keeps a leading BOM for the codecs to drop; change them together.
/** @purity pure */
function textOfBytes(
  bytes: Uint8Array,
): { readonly ok: true; readonly text: string } | { readonly ok: false; readonly what: string } {
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
  try {
    return { ok: true, text: decoder.decode(bytes) }
  } catch (why) {
    return { ok: false, what: why instanceof Error ? why.message : String(why) }
  }
}

/** @purity pure */
function fault(reason: DocumentFileFaultReason, what: string): DocumentFileFault {
  return { reason, what }
}

/** @purity pure */
function faultOfStore(storeFault: FileStoreFault): DocumentFileFault {
  return fault(storeFault.reason, storeFault.what)
}

/** @purity pure */
function savingOfWriting(writing: FileWriting): DocumentFileSaving {
  return writing.ok
    ? { ok: true, openedFile: writing.openedFile }
    : { ok: false, fault: faultOfStore(writing.fault) }
}

/** @purity pure */
function openedOf(file: OpenedFileContent, text: string): OpenedDocumentFile {
  return { text, byteLength: file.bytes.byteLength, fileName: file.fileName }
}

// see DI-1, DI-2
/** @purity pure */
function isSameDocument(here: DocumentIdentity, there: DocumentIdentity): boolean {
  const isEitherProjectUnnamed =
    here.projectName === null ||
    here.projectId === null ||
    there.projectName === null ||
    there.projectId === null
  if (isEitherProjectUnnamed) return false
  if (here.fileName === null || there.fileName === null) return false

  return (
    here.fileName === there.fileName &&
    here.projectName === there.projectName &&
    here.projectId === there.projectId
  )
}

// see DI-6
// WHY: judged by byte count, not by arm: a file a chooser just created looks empty.
/** @purity pure */
function isDestinationAlreadyThere(destination: ChosenWriteDestination): boolean {
  return destination.kind === 'occupied' && destination.bytes.byteLength > 0
}

// see DI-3
/** @purity pure */
function destinationIdentity(
  destination: ChosenWriteDestination,
  projectIdentityFromText: (text: string) => ProjectIdentity | null,
): DocumentIdentity | null {
  if (destination.kind === 'empty') return null

  const decoded = textOfBytes(destination.bytes)
  if (!decoded.ok) return null

  const project = projectIdentityFromText(decoded.text)
  if (project === null) return null

  return {
    fileName: destination.fileName,
    projectName: project.projectName,
    projectId: project.projectId,
  }
}

// see OP-2, OP-11
/** @purity semi-pure-b */
export async function openDocumentFile(
  store: FileStore,
  route: OpenRoute,
): Promise<DocumentFileOpening> {
  const reading = await store.readFileToOpen(route)
  if (!reading.ok) return { ok: false, fault: faultOfStore(reading.fault) }

  const decoded = textOfBytes(reading.file.bytes)
  if (!decoded.ok) return { ok: false, fault: fault('notUtf8', decoded.what) }

  return {
    ok: true,
    file: openedOf(reading.file, decoded.text),
    ignoredFileCount: reading.ignoredFileCount ?? 0,
  }
}

// see T-227
/** @purity non-pure */
async function askToWriteOver(
  request: ChosenFileSaveRequest,
  destination: ChosenWriteDestination,
): Promise<boolean> {
  if (!isDestinationAlreadyThere(destination)) return true

  const there = destinationIdentity(destination, request.projectIdentityFromText)
  if (there !== null && isSameDocument(request.identity, there)) return true

  return await request.confirmOverwrite()
}

// see FR-060, FR-096
/** @purity non-pure */
export async function saveDocumentFile(
  store: FileStore,
  request: DocumentFileSaveRequest,
): Promise<DocumentFileSaving> {
  const bytes = bytesOfContent(request.content)

  if (request.destination === 'chosenFile') {
    const write: ChosenFileWrite = {
      bytes,
      suggestedFileName: request.suggestedFileName,
      extension: request.extension,
      // STOP: spec does not decide if a chosen-file save becomes the opened file. Looked in FR-060
      // @provisional PND-20
      shouldBecomeOpenedFile: isRoundTripForm(request.form),
      // WHY: asked by the store once the destination is open, so it is read only once.
      askToWriteOver: (destination) => askToWriteOver(request, destination),
    }
    return savingOfWriting(await store.writeChosenFile(write))
  }

  if (!isRoundTripForm(request.form)) {
    return {
      ok: false,
      fault: fault(
        'notAnOverwriteTarget',
        'table T-024 gives this form no import direction, so it cannot stand as the file FR-060 writes over',
      ),
    }
  }
  return savingOfWriting(await store.overwriteOpenedFile(bytes))
}
