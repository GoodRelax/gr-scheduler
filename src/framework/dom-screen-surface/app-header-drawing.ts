// DomScreenSurface -- the App Header contents: document title, file name, saved time and size, entries.
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

// see EP-1, FR-051, FR-039
/** @purity pure */
function documentTitleStyle(): string {
  const size = chromeScaledPx(NOT_STORED_DOCUMENT_TITLE_SIZES['S-225'])
  return `${STYLE.documentTitle}font-size:${size}px;font-weight:${NOT_STORED_DOCUMENT_TITLE_SIZES['S-463']};`
}

// see HS-2, FR-101
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
  return `${year}/${month}/${day} ${hour}:${minute}:${second}`
}

const BYTES_PER_TENTH_OF_KB = 100

const TENTHS_PER_KB = 10

// see HS-3
// WHY: whole tenths in integers, so the half-up rounding never meets a binary fraction.
/** @purity pure */
export function spelledFileSize(byteLength: number): string {
  const tenths = Math.floor((byteLength + BYTES_PER_TENTH_OF_KB / 2) / BYTES_PER_TENTH_OF_KB)
  return `${Math.floor(tenths / TENTHS_PER_KB)}.${tenths % TENTHS_PER_KB}[kB]`
}

// see HS-1, HS-5
/** @purity semi-pure-b */
function fileSavedLine(items: AppHeaderItems): string {
  if (items.fileSavedAt === null) return items.fileNeverSavedText
  const stamp = readableStamp(items.fileSavedAt)
  return items.fileSavedByteLength === null ? stamp : `${stamp}  ${spelledFileSize(items.fileSavedByteLength)}`
}

// see HS-7, FR-051
/** @purity pure */
function fileStatusLineStyle(base: string, lineRow: 'S-210' | 'S-449'): string {
  return `${base}font-size:${chromeScaledPx(NOT_STORED_FILE_STATUS_SIZES[lineRow])}em;`
}

// see FR-038, IC-21, IC-128
/** @purity non-pure */
export function drawLanguageReading(host: Document, entry: HTMLElement, language: DisplayLanguage): void {
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
  const fileName = part(host, 'span', ROLE.openedFileName, fileStatusLineStyle(STYLE.openedFileName, 'S-449'))
  fileName.textContent = items.openedFileName
  fileStatus.append(fileName)
  const savedAt = part(host, 'span', ROLE.fileSavedAt, fileStatusLineStyle(STYLE.fileSavedAt, 'S-210'))
  savedAt.textContent = fileSavedLine(items)
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

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_FILE_STATUS_SIZES: {
  readonly 'S-210': number
  readonly 'S-449': number
} = {
  'S-210': 0.9375,
  'S-449': 1.125,
}
// </generated>
