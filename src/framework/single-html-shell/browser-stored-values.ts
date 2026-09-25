// SingleHtmlShell frame loop -- reads and writes the values kept in the browser (table T-206, S-99 to S-99c).
// @unit      UF-159  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { DisplayLanguage } from '../../adapter/screen-renderer/screen-renderer'

const WEB_STORAGE_KEY_PREFIX = 'grsched.'

const BROWSER_STORED_KEY: Readonly<Record<BrowserStoredRow, string>> = {
  'S-99': `${WEB_STORAGE_KEY_PREFIX}language`,
  'S-99a': `${WEB_STORAGE_KEY_PREFIX}openedBy`,
  'S-99b': `${WEB_STORAGE_KEY_PREFIX}agentApiEnabled`,
  'S-99c': `${WEB_STORAGE_KEY_PREFIX}unlockPasswordSha256`,
}

type BrowserStoredRow = 'S-99' | 'S-99a' | 'S-99b' | 'S-99c'

const DISPLAY_LANGUAGES: Readonly<Record<DisplayLanguage, true>> = { ja: true, en: true }

// see FR-038
/** @purity pure */
function isDisplayLanguage(value: string): value is DisplayLanguage {
  return Object.prototype.hasOwnProperty.call(DISPLAY_LANGUAGES, value)
}

/** @purity semi-pure-b */
export function readBrowserStored(row: BrowserStoredRow): string | null {
  try {
    // TRAP: a refusing host throws on the property itself; keep the access inside the try.
    return globalThis.localStorage?.getItem(BROWSER_STORED_KEY[row]) ?? null
  } catch {
    return null
  }
}

/** @purity non-pure */
export function writeBrowserStored(row: BrowserStoredRow, value: string): void {
  try {
    globalThis.localStorage?.setItem(BROWSER_STORED_KEY[row], value)
  } catch {
  }
}

// see FR-038, S-99
/** @purity semi-pure-b */
export function startupDisplayLanguage(): DisplayLanguage {
  const stored = readBrowserStored('S-99')
  if (stored !== null && isDisplayLanguage(stored)) return stored
  return globalThis.navigator?.language?.toLowerCase().startsWith('ja') === true ? 'ja' : 'en'
}

// see FR-065, S-99b
/** @purity semi-pure-b */
export function startupAgentApiEnabled(): boolean {
  return readBrowserStored('S-99b') === String(true)
}
