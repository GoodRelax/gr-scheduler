// DomScreenSurface -- the App Header contents: document title, file name and saved time, entries.
// @unit      UF-104  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type { AppHeaderItems, DisplayLanguage } from '../../adapter/screen-renderer/screen-renderer'
import {
  NOT_STORED_DOCUMENT_TITLE_SIZES,
  ROLE,
  STYLE,
  anchorKey,
  chromeScaledPx,
  commandEntry,
  made,
  part,
} from './dom-screen-surface'

const DISPLAY_LANGUAGE_ENTRY = 'IC-21'

// see EP-1, FR-051
/** @purity pure */
export function appHeaderStyle(): string {
  const inset = chromeScaledPx(NOT_STORED_DOCUMENT_TITLE_SIZES['S-226'])
  return `${STYLE.appHeader}padding-left:${inset}px;`
}

// see EP-1, FR-051
/** @purity pure */
function documentTitleStyle(): string {
  const size = chromeScaledPx(NOT_STORED_DOCUMENT_TITLE_SIZES['S-225'])
  return `${STYLE.documentTitle}font-size:${size}px;`
}

// see FR-101
// STOP: spec does not decide how a local stamp spells its zone offset. Looked in FR-101, AT-129
// @provisional PND-325
/** @purity semi-pure-b */
function readableStamp(utc: string): string {
  const foundAt = new Date(utc)
  if (Number.isNaN(foundAt.getTime())) return utc
  const padded = (part: number, width: number): string => String(part).padStart(width, '0')
  const year = padded(foundAt.getFullYear(), 4)
  const month = padded(foundAt.getMonth() + 1, 2)
  const day = padded(foundAt.getDate(), 2)
  const hour = padded(foundAt.getHours(), 2)
  const minute = padded(foundAt.getMinutes(), 2)
  const second = padded(foundAt.getSeconds(), 2)
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

// see FR-038, IC-21
/** @purity non-pure */
function drawLanguageReading(host: Document, entry: HTMLElement, language: DisplayLanguage): void {
  entry.setAttribute('data-language', language)
  const code = made(host, 'span', STYLE.languageCode)
  code.textContent = language
  entry.append(code)
}

// see U-31, FR-101
/** @purity non-pure */
export function fillAppHeader(
  host: Document,
  header: HTMLElement,
  items: AppHeaderItems,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const title = part(host, 'span', ROLE.documentTitle, documentTitleStyle())
  title.textContent = items.documentTitle

  const fileStatus = part(host, 'span', ROLE.fileStatus, STYLE.fileStatus)
  const fileName = part(host, 'span', ROLE.openedFileName, STYLE.openedFileName)
  fileName.textContent = items.openedFileName
  fileStatus.append(fileName)
  const savedAt = part(host, 'span', ROLE.fileSavedAt, STYLE.fileSavedAt)
  savedAt.textContent =
    items.fileSavedAt === null
      ? items.fileNeverSavedText
      : readableStamp(items.fileSavedAt)
  fileStatus.append(savedAt)

  const commands = part(host, 'span', ROLE.headerCommands, STYLE.headerCommands)
  for (const item of items.commands) {
    const entry = commandEntry(host, item)
    // TRAP: after commandEntry, never before: fillEntry replaces the body and drops the code.
    if (item.icon === DISPLAY_LANGUAGE_ENTRY) {
      drawLanguageReading(host, entry, items.language)
    }
    anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
    commands.append(entry)
  }

  header.replaceChildren(title, fileStatus, commands)
  return title
}
