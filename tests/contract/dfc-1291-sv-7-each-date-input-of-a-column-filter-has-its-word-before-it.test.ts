// DFC-1291 spec-only cases: T-330 SV-7 -- the two date inputs of a column filter each carry the dictionary word ("from" / "until") as a label to their left.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { searchPanelFromSession, searchPanelWithFilterOpened } from '../../src/adapter/screen-renderer/search-panel'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { searchPanelBoxOf, searchPanelElement } from '../../src/framework/dom-screen-surface/search-panel-drawing'
import {
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { FakeText, selfAndDescendants, stage, type FakeElement, type FakeNode } from '../fixtures/fake-browser'
import { specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see SV-7
const SV_7_LABELS =
  '2 つの日付の入力には、それぞれの左に、`FR-038` の辞書が持つ語「いつから」「いつまで」を札として置くこと（MUST）'

type Words = Record<DisplayLanguage, string>
const WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as { readonly searchPanel: readonly { readonly part: string; readonly text: Words }[] }

const wordOf = (part: string, language: DisplayLanguage): string => {
  const found = WORDS.searchPanel.find((one) => one.part === part)
  if (found === undefined) throw new Error(`the dictionary's searchPanel holds no ${part}`)
  return found.text[language]
}

// WHY: the task table's date columns and the comment box table's, as table T-331 lists them.
const DATE_COLUMNS = specTable('T-331')
  .rows.filter((row) => (row.by['フィルタ'] ?? '').includes('いつから'))
  .map((row) => [row.id, row.by['表'] === 'コメントボックス' ? 'commentBoxes' : 'tasks'] as const)

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: unknown }
const SCHEDULE = TEMPLATE.schedule as Schedule
const CANVAS: ScreenRect = { x: 0, y: 56, width: 1000, height: 600 }

const step = (session: ScreenSession, type: string): ScreenSession =>
  advanceScreenSession(session, { type } as unknown as SessionEvent).state

function sessionIn(language: DisplayLanguage): ScreenSession {
  const shown = step(emptyScreenSession, 'searchEntryPressed')
  return { ...shown, screen: { ...shown.screen, screenLanguage: language, helpLanguage: language } } as unknown as ScreenSession
}

function drawnFilter(column: string, table: 'tasks' | 'commentBoxes', language: DisplayLanguage): FakeElement {
  const session = sessionIn(language)
  const panel = searchPanelWithFilterOpened(session, { ...emptySearchPanelSession, table }, column)
  if (panel === null) throw new Error(`premise: IC-122 on ${column} opens its filter`)
  const view = searchPanelFromSession(session, panel, SCHEDULE, CANVAS)
  if (view === null) throw new Error('premise: the shown panel has a view')
  const built = stage()
  const box = searchPanelBoxOf(view, { width: 0.5, height: 0.5 })
  const root = searchPanelElement(built.host, view, { box, fontPx: 16 }, new Map<string, HTMLElement>()) as unknown as FakeElement
  const filter = selfAndDescendants(root).find(
    (one) => one.tagName === 'DIV' && one.getAttribute('data-search-filter-column') === column,
  )
  if (filter === undefined) throw new Error(`premise: the drawn filter of ${column}`)
  return filter
}

type Piece = { readonly kind: 'text'; readonly text: string } | { readonly kind: 'date'; readonly bound: string }

// WHY: the left of an input is what comes before it in reading order, so the filter is flattened in document order.
function piecesOf(node: FakeNode, into: Piece[] = []): Piece[] {
  if (node instanceof FakeText) {
    if (node.data.trim() !== '') into.push({ kind: 'text', text: node.data.trim() })
    return into
  }
  if (node.tagName === 'INPUT' && node.getAttribute('type') === 'date') {
    into.push({ kind: 'date', bound: node.getAttribute('data-search-filter-bound') ?? '' })
    return into
  }
  for (const child of node.childNodes) piecesOf(child, into)
  return into
}

function wordBefore(pieces: readonly Piece[], bound: string): string | null {
  const at = pieces.findIndex((one) => one.kind === 'date' && one.bound === bound)
  const before = pieces[at - 1]
  return before !== undefined && before.kind === 'text' ? before.text : null
}

describe('DFC-1291 premise -- the clause these cases press still stands', () => {
  it(SV_7_LABELS, () => {
    expect(REQUIREMENTS).toContain(SV_7_LABELS)
  })

  it('the dictionary holds the two words, and they differ', () => {
    for (const language of ['ja', 'en'] as const) {
      expect(wordOf('dateFrom', language).length).toBeGreaterThan(0)
      expect(wordOf('dateTo', language)).not.toBe(wordOf('dateFrom', language))
    }
    expect(wordOf('dateFrom', 'ja')).toBe('いつから')
    expect(wordOf('dateTo', 'ja')).toBe('いつまで')
  })

  it('table T-331 lists date columns of both tables', () => {
    expect(DATE_COLUMNS.some(([, table]) => table === 'tasks')).toBe(true)
    expect(DATE_COLUMNS.some(([, table]) => table === 'commentBoxes')).toBe(true)
  })
})

describe(`T-330 SV-7 -- ${SV_7_LABELS}`, () => {
  for (const language of ['ja', 'en'] as const) {
    it.each(DATE_COLUMNS)(`%s of the %s table, in ${language}: the word "from" stands directly before the start input`, (column, table) => {
      const pieces = piecesOf(drawnFilter(column, table, language))
      expect(pieces.filter((one) => one.kind === 'date').map((one) => (one as { bound: string }).bound).sort()).toEqual(['since', 'until'])
      expect(wordBefore(pieces, 'since'), SV_7_LABELS).toBe(wordOf('dateFrom', language))
    })

    it.each(DATE_COLUMNS)(`%s of the %s table, in ${language}: the word "until" stands directly before the end input`, (column, table) => {
      const pieces = piecesOf(drawnFilter(column, table, language))
      expect(wordBefore(pieces, 'until'), SV_7_LABELS).toBe(wordOf('dateTo', language))
    })
  }
})
