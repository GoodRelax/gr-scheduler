// CR-722 spec-only contract: the Schedule Filter Bar (U-67) says which tables narrow the schedule, in a fixed order, with N of the document and M drawn (TV-11, JDG-1829).

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { scheduleFilterBarOf } from '../../src/adapter/screen-renderer/screen-renderer'
import { ALL_SHOWN, ALL_TASKS, SCHEDULE, SURFACE_OF, visibility, wordOf, type VisibilityTable } from './cr-722-stage'
import { specTable, unbroken } from './spec-table'

const cellOf = (id: string): string => unbroken(specTable('T-353').rows.find((one) => one.id === id)?.by['定め'] ?? '')

const TV_11_WORDS = '語は「{表の名}のスケジュールフィルタを掛けています（N 件中 M 件）」と、語の入口「スケジュールフィルタを解除」（どちらも `FR-038` の辞書）。'
const TV_11_ORDER = '表の名は、スケジュールフィルタを掛けている表のウィンドウの名（辞書の面の名）を、検索パネル・遅延診断レポート・担当リストの順に、辞書のつなぎの語でつなぐ（利用者が「絞っている表の名を添える」と定めた）。'
const TV_11_COUNTS = 'N は文書のタスクの数、M は描いているタスクの数（積）。'

describe('CR-722 the manuscript these cases are driven by', () => {
  it('T-353 TV-11 still says it, word for word', () => {
    expect(cellOf('TV-11')).toContain(TV_11_WORDS)
    expect(cellOf('TV-11')).toContain(TV_11_ORDER)
    expect(cellOf('TV-11')).toContain(TV_11_COUNTS)
  })
})

const ORDER: readonly VisibilityTable[] = ['searchPanel', 'delayDiagnosticsReport', 'resourceList']

// WHY: section 5.1 names the first argument `tables` without its shape; this value is the list of the tables that are on and the record of all three.
function tablesOn(on: readonly VisibilityTable[]): readonly VisibilityTable[] {
  const record = Object.fromEntries(ORDER.map((name) => [name, on.includes(name) ? visibility({ isApplied: true }) : ALL_SHOWN]))
  return Object.assign([...on], record)
}

function sentenceOf(on: readonly VisibilityTable[], total: number, shown: number, language: DisplayLanguage): string {
  const names = ORDER.filter((name) => on.includes(name)).map((name) => wordOf('surfaces', SURFACE_OF[name], language))
  return wordOf('searchPanel', 'scheduleFilterBar', language)
    .replace('{tables}', names.join(wordOf('searchPanel', 'tableNameSeparator', language)))
    .replace('{total}', String(total))
    .replace('{shown}', String(shown))
}

const said = (view: unknown): string => JSON.stringify(view)

describe(`FR-151 T-353 TV-11 -- ${TV_11_WORDS.slice(0, 40)}`, () => {
  it('no table on: no bar', () => {
    expect(scheduleFilterBarOf(tablesOn([]) as never, SCHEDULE, ALL_TASKS.length, 'ja')).toBeNull()
  })

  it.each(['ja', 'en'] as const)('one table on (%s): the bar names it and counts N of the document and M drawn', (language) => {
    const view = scheduleFilterBarOf(tablesOn(['searchPanel']) as never, SCHEDULE, 2, language)
    expect(view).not.toBeNull()
    expect(said(view)).toContain(JSON.stringify(sentenceOf(['searchPanel'], ALL_TASKS.length, 2, language)).slice(1, -1))
  })

  it.each(['ja', 'en'] as const)('the bar carries the word entrance that turns every Schedule Filter off (%s)', (language) => {
    const view = scheduleFilterBarOf(tablesOn(['resourceList']) as never, SCHEDULE, 3, language)
    expect(said(view)).toContain(JSON.stringify(wordOf('searchPanel', 'scheduleFilterOff', language)).slice(1, -1))
  })

  it.each(['ja', 'en'] as const)(`${TV_11_ORDER.slice(0, 30)} (%s) -- whatever order they are given in`, (language) => {
    const given: readonly VisibilityTable[] = ['resourceList', 'searchPanel']
    const view = scheduleFilterBarOf(tablesOn(given) as never, SCHEDULE, 1, language)
    expect(said(view)).toContain(JSON.stringify(sentenceOf(given, ALL_TASKS.length, 1, language)).slice(1, -1))
  })

  it('all three on name all three, search panel, report, Resource List, joined by the dictionary separator', () => {
    const view = scheduleFilterBarOf(tablesOn(['resourceList', 'delayDiagnosticsReport', 'searchPanel']) as never, SCHEDULE, 0, 'ja')
    expect(said(view)).toContain(JSON.stringify(sentenceOf(ORDER, ALL_TASKS.length, 0, 'ja')).slice(1, -1))
  })
})
