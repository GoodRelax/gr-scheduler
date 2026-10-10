// CR-731 spec-only cases: RW-11 switch, RW-12 footer, RW-14 previous and next, IC-143 only on the diagnosis table (section 9 items 11, 12, 17)

import { describe, expect, it } from 'vitest'

import { ACTUAL_AGAINST_LINK, FS_SUCCESSOR_STARTED, MIXED, NOT_STARTED_AFTER_START, ONE_PARENT } from './cr-731-documents'
import { FOOTER_ROLE, LOG_ROLE, PROPOSALS_ROLE, isInert, undoKey } from './cr-731-shell'
import { SETTINGS_BOOK, WORDS, dayTextIn, proposed, REQUIREMENTS, cellOf } from './cr-731-stage'
import { windowStage, type WindowStage } from './cr-731-window-stage'
import type { Document } from '../../src/entity/document-model/document/document'
import { selfAndDescendants, type FakeElement } from '../fixtures/fake-browser'

const wordOf = (section: string, key: string, field: 'part' | 'rowId'): string => {
  const found = (WORDS[section] as readonly Record<string, any>[]).find((one) => one[field] === key)
  if (found === undefined) throw new Error(`the dictionary has no ${section}/${key}`)
  return found['text']['ja']
}
const fixWord = (part: string): string => wordOf('delayFixes', part, 'part')
const columnWord = (row: string): string => wordOf('delayFixColumns', row, 'rowId')
const filled = (text: string, values: Record<string, number>): string =>
  Object.entries(values).reduce((made, [key, value]) => made.replace(`{${key}}`, String(value)), text)

const opened = async (document: Document): Promise<WindowStage> => {
  const stage = await windowStage(document)
  await stage.press('IC-107')
  return stage
}

const entryOf = (stage: WindowStage, icon: string): FakeElement | null =>
  selfAndDescendants(stage.window() ?? stage.built.root()).find((one) => one.getAttribute('data-icon') === icon) ?? null

const needEntryOf = (stage: WindowStage, icon: string): FakeElement => {
  const found = entryOf(stage, icon)
  if (found === null) throw new Error(`the window draws no entrance data-icon="${icon}"`)
  return found
}

const rowsIn = (container: FakeElement): FakeElement[] => {
  const head = new Set(selfAndDescendants(container).filter((one) => one.tagName === 'THEAD').flatMap((one) => selfAndDescendants(one)))
  return selfAndDescendants(container).filter((one) => one.tagName === 'TR' && !head.has(one))
}

const selectedUids = (stage: WindowStage): number[] =>
  ((stage.loop.agentApiSeams().source.readSnapshot().selection as unknown as { items: { uid: number }[] }).items ?? []).map((one) => one.uid)

describe('RW-11 -- three tables, one at a time, the diagnosis first', () => {
  it('the window opens with IC-154 and IC-155 beside each other, no IC-156, and no proposals drawn', async () => {
    const stage = await opened(ONE_PARENT())
    expect(entryOf(stage, 'IC-154'), 'IC-154').not.toBeNull()
    expect(entryOf(stage, 'IC-155'), 'IC-155').not.toBeNull()
    expect(entryOf(stage, 'IC-156'), 'IC-156 stands only with a log').toBeNull()
    expect(stage.inside(PROPOSALS_ROLE)).toBeNull()
    expect(stage.inside(LOG_ROLE)).toBeNull()
    expect(stage.inside(FOOTER_ROLE)).toBeNull()
  })

  it('IC-155 draws the proposals under their role, and IC-154 draws them away again', async () => {
    const stage = await opened(ONE_PARENT())
    await stage.press('IC-155')
    expect(stage.inside(PROPOSALS_ROLE)).not.toBeNull()
    await stage.press('IC-154')
    expect(stage.inside(PROPOSALS_ROLE)).toBeNull()
  })

  it('the word of IC-155 carries the number of rows, all of them, in brackets', async () => {
    for (const make of [ONE_PARENT, MIXED, FS_SUCCESSOR_STARTED]) {
      const document = make()
      const stage = await opened(document)
      const count = proposed(document).length
      expect(entryOf(stage, 'IC-155')?.textContent ?? '', make.name).toMatch(new RegExp(`[(（]${String(count)}[)）]`))
    }
  })

  it('the table draws one row for each row of the proposal', async () => {
    for (const make of [ONE_PARENT, MIXED]) {
      const document = make()
      const stage = await opened(document)
      await stage.press('IC-155')
      expect(rowsIn(stage.need(PROPOSALS_ROLE))).toHaveLength(proposed(document).length)
    }
  })

  it('the headings are the words of FM-1, FM-3, FM-4, FM-5, FM-6, FM-7 and FM-8, in that order', async () => {
    const stage = await opened(ONE_PARENT())
    await stage.press('IC-155')
    const text = stage.need(PROPOSALS_ROLE).textContent
    const at = ['FM-1', 'FM-3', 'FM-4', 'FM-5', 'FM-6', 'FM-7', 'FM-8'].map((row) => text.indexOf(columnWord(row)))
    expect(at.every((one) => one >= 0), `every heading is drawn: ${JSON.stringify(at)}`).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    expect(text.indexOf(columnWord('FM-2')), 'FM-2 belongs to the log').toBe(-1)
  })

  it('a machine row reads the day before and the day after, the word of its fix type and the name of its task', async () => {
    const stage = await opened(ONE_PARENT())
    await stage.press('IC-155')
    const text = stage.need(PROPOSALS_ROLE).textContent
    expect(text).toContain('2027/05/21')
    expect(text).toContain('2027/05/26')
    expect(text).toContain(fixWord('automatic'))
    expect(text).toContain('Task 1')
  })

  it('a suggested date row says Suggested beside the day (FA-24), and a choice row says to choose', async () => {
    const stage = await opened(FS_SUCCESSOR_STARTED())
    await stage.press('IC-155')
    const text = stage.need(PROPOSALS_ROLE).textContent
    expect(text).toContain(fixWord('suggested'))
    expect(dayTextIn(text.replace(/\//g, '-'))).toContain('2027-05-28')
    expect(text).toContain(fixWord('choosePlaceholder'))
  })

  it('a row to mend by hand says to click the name, and draws no box to check', async () => {
    const stage = await opened(ACTUAL_AGAINST_LINK())
    await stage.press('IC-155')
    const container = stage.need(PROPOSALS_ROLE)
    expect(container.textContent).toContain(fixWord('openFieldHint'))
    const boxes = selfAndDescendants(container).filter((one) => one.tagName === 'INPUT' && one.getAttribute('type') === 'checkbox')
    expect(boxes).toHaveLength(0)
  })

  it('the proposals can be copied: IC-108 puts the proposals and, with a log, the log after the diagnosis table (RW-6)', async () => {
    const stage = await opened(ONE_PARENT())
    await stage.press('IC-108')
    const first = stage.copied[0]
    expect(first?.kind).toBe('document')
    const text = first?.kind === 'document' ? first.text : ''
    const heading = (WORDS['icons'] as readonly Record<string, any>[]).find((one) => one['rowId'] === 'IC-155')?.['label']?.['ja'] as string
    expect(text).toContain(heading)
    expect(text.indexOf(heading)).toBeGreaterThan(text.indexOf('2027'))
    expect(text).toContain('2027/05/21')
    expect(text).toContain('2027/05/26')
  })
})

describe('RW-12 -- the strip under the proposals', () => {
  it('stands under the proposals only, holds IC-157 and IC-158, and says how many rows will be mended', async () => {
    const stage = await opened(ONE_PARENT())
    expect(stage.inside(FOOTER_ROLE)).toBeNull()
    await stage.press('IC-155')
    const footer = stage.need(FOOTER_ROLE)
    expect(footer).not.toBeNull()
    const icons = selfAndDescendants(footer).map((one) => one.getAttribute('data-icon'))
    expect(icons).toContain('IC-157')
    expect(icons).toContain('IC-158')
    expect(footer.textContent).toContain(filled(fixWord('fixCount'), { n: 1 }))
  })

  it('with no row checked the number is 0 and neither entry acts (FR-092)', async () => {
    const stage = await opened(NOT_STARTED_AFTER_START())
    await stage.press('IC-155')
    const footer = stage.need(FOOTER_ROLE)
    expect(footer.textContent).toContain(filled(fixWord('fixCount'), { n: 0 }))
    for (const icon of ['IC-157', 'IC-158']) {
      const entry = selfAndDescendants(footer).find((one) => one.getAttribute('data-icon') === icon)
      expect(entry, icon).toBeDefined()
      expect(isInert(entry!), `${icon} is inert`).toBe(true)
    }
  })

  it('with one row checked both entries act', async () => {
    const stage = await opened(ONE_PARENT())
    await stage.press('IC-155')
    for (const icon of ['IC-157', 'IC-158']) {
      const entry = selfAndDescendants(stage.need(FOOTER_ROLE)).find((one) => one.getAttribute('data-icon') === icon)
      expect(isInert(entry!), `${icon} acts`).toBe(false)
    }
  })

  it('pressing IC-157 with no row checked writes nothing', async () => {
    const stage = await opened(NOT_STARTED_AFTER_START())
    await stage.press('IC-155')
    stage.browser.toSave.push(stage.file('none.json', new Uint8Array(0)))
    await stage.press('IC-157')
    expect(stage.written).toEqual([])
  })
})

describe('item 12 -- RW-14: previous and next walk the rows a person mends, and stop at the ends', () => {
  const humanRows = (): number => proposed(MIXED()).filter((one) => one.fixType !== 'automatic').length
  const counterText = (k: number): string => filled(fixWord('humanCounter'), { k, m: humanRows() })

  it('premise: one machine row and three rows for a person', () => {
    const rows = proposed(MIXED())
    expect(rows.filter((one) => one.fixType === 'automatic')).toHaveLength(1)
    expect(humanRows()).toBe(3)
  })

  it('the window shows IC-159, IC-160 and the counter at 0 of the number of rows for a person', async () => {
    const stage = await opened(MIXED())
    expect(entryOf(stage, 'IC-159')).not.toBeNull()
    expect(entryOf(stage, 'IC-160')).not.toBeNull()
    expect(stage.window()!.textContent).toContain(counterText(0))
  })

  it('next counts 1, 2, 3, never lands on the machine row, shows the proposals, and stops at the end', async () => {
    const stage = await opened(MIXED())
    const landed: number[][] = []
    for (let k = 1; k <= humanRows(); k += 1) {
      await stage.press('IC-160')
      expect(stage.window()!.textContent, `k ${String(k)}`).toContain(counterText(k))
      landed.push(selectedUids(stage))
    }
    expect(stage.inside(PROPOSALS_ROLE), 'next shows the proposals').not.toBeNull()
    expect(landed.flat().every((uid) => uid === 5 || uid === 6), `only the tasks of the rows for a person: ${JSON.stringify(landed)}`).toBe(true)
    expect(isInert(needEntryOf(stage, 'IC-160')), 'the end: IC-160 does not act').toBe(true)
    await stage.press('IC-160')
    expect(stage.window()!.textContent).toContain(counterText(humanRows()))
  })

  it('previous goes back one at a time and stops at the first (the walk is not a ring)', async () => {
    const stage = await opened(MIXED())
    for (let k = 1; k <= humanRows(); k += 1) await stage.press('IC-160')
    await stage.press('IC-159')
    expect(stage.window()!.textContent).toContain(counterText(humanRows() - 1))
    await stage.press('IC-159')
    expect(stage.window()!.textContent).toContain(counterText(1))
    expect(isInert(needEntryOf(stage, 'IC-159')), 'the start: IC-159 does not act').toBe(true)
    await stage.press('IC-159')
    expect(stage.window()!.textContent).toContain(counterText(1))
  })

  it('a row that opens a field puts the focus into that field of the properties panel (RW-13)', async () => {
    const stage = await opened(MIXED())
    for (let k = 1; k <= humanRows(); k += 1) await stage.press('IC-160')
    const opens = cellOf('T-373', 'FA-24', '開く欄')
    expect(opens).toContain('PR-6')
    expect(stage.last().propertiesPanel, 'the panel is up').not.toBeNull()
    expect(stage.asked.length, 'the focus was asked for').toBeGreaterThan(0)
  })
})

describe('item 17 -- RW-2: IC-143 stands on the diagnosis table only, and the filter goes on across a switch', () => {
  const planDrawn = (stage: WindowStage, uid: number): boolean => stage.svg().includes(`data-figure="task-${String(uid)}-plan"`)

  it('the manuscript says IC-143 is placed only with the diagnosis table', () => {
    expect(REQUIREMENTS).toContain('`IC-143` は診断結果の表を出しているときだけ置く')
  })

  it('IC-143 is there on the diagnosis table, gone on the proposals, back on the diagnosis again', async () => {
    const stage = await opened(ONE_PARENT())
    expect(entryOf(stage, 'IC-143')).not.toBeNull()
    await stage.press('IC-155')
    expect(entryOf(stage, 'IC-143')).toBeNull()
    await stage.press('IC-154')
    expect(entryOf(stage, 'IC-143')).not.toBeNull()
  })

  it('a Schedule Filter that is on stays on while the proposals are shown, and a switch is no edit of its own', async () => {
    const stage = await opened(ONE_PARENT())
    expect(planDrawn(stage, 2), 'premise: every task is drawn before the filter').toBe(true)
    await stage.press('IC-143')
    expect(planDrawn(stage, 2), 'the filter draws only what the report lists').toBe(false)
    expect(planDrawn(stage, 1)).toBe(true)
    await stage.press('IC-155')
    expect(planDrawn(stage, 2), 'still filtered on the proposals').toBe(false)
    await stage.press('IC-154')
    expect(planDrawn(stage, 2), 'still filtered back on the diagnosis').toBe(false)
  })

  it('the switches added no step: one undo takes the filter off', async () => {
    const stage = await opened(ONE_PARENT())
    await stage.press('IC-143')
    await stage.press('IC-155')
    await stage.press('IC-154')
    await stage.key(undoKey())
    expect(planDrawn(stage, 2)).toBe(true)
  })
})

describe('item 16 -- FR-155: nothing of the fix window is written to the document, and the diagnosis table keeps its UN-20 step', () => {
  it('showing the proposals and coming back changes neither the settings nor the unsaved flag', async () => {
    const stage = await opened(ONE_PARENT())
    const settings = structuredClone(stage.loop.document().documentSettings)
    await stage.press('IC-155')
    await stage.press('IC-154')
    expect(stage.loop.document().documentSettings).toEqual(settings)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
  })

  it('a fix writes no view of any table: the settings come out of the bundle as they went in', async () => {
    const stage = await opened(ONE_PARENT())
    await stage.press('IC-155')
    const settings = structuredClone(stage.loop.document().documentSettings)
    stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
    await stage.press('IC-157')
    expect(stage.written).toEqual(['chosen.json'])
    expect(stage.loop.document().documentSettings).toEqual(settings)
  })

  it('regression: the Schedule Filter of the diagnosis table is an edit, one step of UN-20', async () => {
    const stage = await opened(ONE_PARENT())
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
    await stage.press('IC-143')
    expect(stage.loop.hasUnsavedEdits()).toBe(true)
  })

  it('T-372 names the rows of T-331, T-347 and T-371 as the only columns a view may name, and none of T-374', () => {
    const block = SETTINGS_BOOK.slice(SETTINGS_BOOK.indexOf('**表 T-372'), SETTINGS_BOOK.indexOf('## 5a.'))
    expect(block).toContain('表 T-331（検索の表）・表 T-347（遅延診断レポートの表）・表 T-371（担当リストの表）の行')
    expect(block).not.toMatch(/T-374|FM-[0-9]/)
  })

  it.todo('a column filter and a sort on the proposals table stay out of the document and add no step (FR-155): the specification names no way to press a filter menu in a test')
})
