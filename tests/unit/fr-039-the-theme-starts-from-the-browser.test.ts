// FR-039 (01-04-requirements.md:7675) and S-72 (tbl-settings.md:396): startupThemePreference follows prefers-color-scheme, light when unreadable.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { startupThemePreference } from '../../src/framework/single-html-shell/browser-stored-values'

const FR_039_STARTS_FROM_THE_BROWSER =
  '明暗テーマは文書に保存しない —— 起動したときにブラウザが伝える明暗（`prefers-color-scheme`）で描き、読めないときはライトで描くこと（MUST）'

const S_72_CANNOT_READ = "起動時にブラウザが伝える明暗（`prefers-color-scheme`）。読めないときは `'light'`"

type BrowserAnswer = 'dark' | 'light' | 'absent' | 'throws'

function browserPrefers(answer: BrowserAnswer): void {
  if (answer === 'absent') {
    vi.stubGlobal('matchMedia', undefined)
    return
  }
  vi.stubGlobal('matchMedia', (query: string) => {
    if (answer === 'throws') throw new Error('matchMedia is not readable here')
    return { matches: query.includes('prefers-color-scheme') && query.includes('dark') && answer === 'dark', media: query }
  })
}

beforeEach(() => {
  browserPrefers('light')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe(`FR-039 「${FR_039_STARTS_FROM_THE_BROWSER}」 / S-72 「${S_72_CANNOT_READ}」`, () => {
  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['absent', 'light'],
    ['throws', 'light'],
  ] as const)('prefers-color-scheme %s -> startupThemePreference() is %s', (browser, expected) => {
    browserPrefers(browser)
    expect(startupThemePreference()).toBe(expected)
  })
})
