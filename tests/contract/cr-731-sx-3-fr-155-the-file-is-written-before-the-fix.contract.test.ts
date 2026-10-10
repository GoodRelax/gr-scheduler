// CR-731 spec-only cases: IC-157 and IC-158 write first and fix only after a write, and the fix log (section 9 items 6, 7, 11, 15)

import { describe, expect, it } from 'vitest'

import {
  FR_155_LOG_ROWS_ADDED,
  FR_155_NOT_WRITTEN_NO_FIX,
  FR_155_SAVE_THEN_ONE_BUNDLE,
  T_340_NOTHING_MOVES_ON_FAILURE,
  T_340_SX_2_ROW,
  T_340_SX_3_ROW,
} from './cr-731-clauses'
import { CHAIN, ONE_PARENT } from './cr-731-documents'
import {
  LOG_ROLE,
  benchOver,
  bodyRowsOf,
  needContainer,
  diagnosisStarted,
  entryIn,
  pressEntry,
  proposalsShown,
  savedDocument,
  undoKey,
} from './cr-731-shell'
import { REQUIREMENTS, STATE_MACHINES_SOURCE, STATE_MACHINE_BOOK, dayOf, taskIn } from './cr-731-stage'
import { specTable } from './spec-table'

const parentFinish = (document: Parameters<typeof taskIn>[0]) => dayOf(taskIn(document, 1)['finish'])

describe('FR-155 / T-340 / T-290 -- the manuscript these cases read', () => {
  it('FR-155 and T-340 still write the order: write, then fix; nothing fixed when nothing was written', () => {
    expect(REQUIREMENTS).toContain(FR_155_SAVE_THEN_ONE_BUNDLE)
    expect(REQUIREMENTS).toContain(FR_155_NOT_WRITTEN_NO_FIX)
    expect(REQUIREMENTS).toContain(FR_155_LOG_ROWS_ADDED)
    expect(REQUIREMENTS).toContain(T_340_NOTHING_MOVES_ON_FAILURE)
  })

  it('T-340 holds SX-1, SX-2 and SX-3, and the backup moves none of the three things a save moves', () => {
    expect(specTable('T-340').rows.map((one) => one.id)).toEqual(['SX-1', 'SX-2', 'SX-3'])
    expect(REQUIREMENTS).toContain(T_340_SX_2_ROW)
    expect(REQUIREMENTS).toContain(T_340_SX_3_ROW)
  })

  it('T-290 names the backup event, the two forms of a write, the carried bundle and the effect', () => {
    const source = JSON.stringify(STATE_MACHINES_SOURCE)
    for (const word of ['diagnosticFixBackupSaved', 'beforeFixOverwrite', 'beforeFixBackup', 'fixBundle', 'issueDelayFixBundle']) {
      expect(source, word).toContain(word)
      expect(STATE_MACHINE_BOOK, word).toContain(word)
    }
  })
})

describe('item 15 -- FR-130: starting the diagnosis writes nothing', () => {
  it('the window opens over the document and nothing is left unsaved', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: false })
    const before = structuredClone(bench.built.loop.document().schedule)
    await diagnosisStarted(bench)
    expect(entryIn(bench.built, 'IC-140'), 'premise: the window stands').not.toBeNull()
    expect(bench.built.loop.hasUnsavedEdits()).toBe(false)
    expect(bench.built.loop.document().schedule).toEqual(before)
  })

  it('showing the proposals changes nothing either', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: false })
    const before = structuredClone(bench.built.loop.document().schedule)
    await proposalsShown(bench)
    expect(bench.built.loop.hasUnsavedEdits()).toBe(false)
    expect(bench.built.loop.document().schedule).toEqual(before)
  })
})

describe('item 6 -- IC-157: the file is written first, then one bundle is issued', () => {
  it('with no save target the chooser opens; the file holds the document as it was and the document is then mended', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: false })
    await proposalsShown(bench)
    const chosen = bench.built.file('chosen.json', new Uint8Array(0))
    bench.built.browser.toSave.push(chosen)
    await pressEntry(bench.built, 'IC-157')
    expect(bench.built.written).toEqual(['chosen.json'])
    expect(parentFinish(savedDocument(chosen)), 'the file was written before the fix').toBe('2027-05-21')
    expect(parentFinish(bench.built.loop.document()), 'the document was mended after the write').toBe('2027-05-26')
  })

  it('with a save target it writes over that file and asks nothing', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: true })
    await proposalsShown(bench)
    const asked = bench.built.browser.saveQuestions()
    await pressEntry(bench.built, 'IC-157')
    expect(bench.built.written).toEqual(['mine.json'])
    expect(bench.built.browser.saveQuestions()).toBe(asked)
    expect(parentFinish(savedDocument(bench.target!))).toBe('2027-05-21')
    expect(parentFinish(bench.built.loop.document())).toBe('2027-05-26')
  })

  it('what the bundle did stays unsaved, so the warning of FR-100 stands', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: true })
    await proposalsShown(bench)
    await pressEntry(bench.built, 'IC-157')
    expect(bench.built.loop.hasUnsavedEdits()).toBe(true)
  })

  it('one undo gives the document back, and what was written to the file is not undone (UN-21)', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: true })
    await proposalsShown(bench)
    await pressEntry(bench.built, 'IC-157')
    await bench.built.key(undoKey())
    expect(parentFinish(bench.built.loop.document())).toBe('2027-05-21')
    expect(bench.built.written).toEqual(['mine.json'])
  })

  it('a chooser closed with nothing chosen mends nothing', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: false })
    await proposalsShown(bench)
    bench.built.browser.toSave.push('closed')
    await pressEntry(bench.built, 'IC-157')
    expect(bench.built.written).toEqual([])
    expect(parentFinish(bench.built.loop.document())).toBe('2027-05-21')
    expect(bench.built.loop.hasUnsavedEdits()).toBe(false)
  })

  it('a write the file refuses mends nothing', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: false })
    await proposalsShown(bench)
    const refusing = bench.built.file('refusing.json', new Uint8Array(0))
    const handle = refusing.handle as unknown as { createWritable: () => Promise<never> }
    handle.createWritable = () => Promise.reject(new Error('the write is refused'))
    bench.built.browser.toSave.push(refusing)
    await pressEntry(bench.built, 'IC-157')
    expect(bench.built.written).toEqual([])
    expect(parentFinish(bench.built.loop.document())).toBe('2027-05-21')
  })
})

describe('item 7 -- IC-158 and SX-3: a backup is written, the work file and the header stay', () => {
  const NAME_OF_A_BACKUP = /_before-fix_\d{4}-\d{2}-\d{2}-\d{4}\.json$/

  it('the chooser proposes a name that ends _before-fix_ and the minute, then .json', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: true })
    await proposalsShown(bench)
    bench.built.browser.toSave.push(bench.built.file('copy.json', new Uint8Array(0)))
    await pressEntry(bench.built, 'IC-158')
    const options = bench.built.browser.saveOptions.at(-1) as { suggestedName?: string }
    expect(options.suggestedName ?? '').toMatch(NAME_OF_A_BACKUP)
  })

  it('the backup holds the document as it was, and the document is then mended', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: true })
    await proposalsShown(bench)
    const backup = bench.built.file('copy.json', new Uint8Array(0))
    bench.built.browser.toSave.push(backup)
    await pressEntry(bench.built, 'IC-158')
    expect(bench.built.written).toEqual(['copy.json'])
    expect(parentFinish(savedDocument(backup))).toBe('2027-05-21')
    expect(parentFinish(bench.built.loop.document())).toBe('2027-05-26')
  })

  it('the header still names the work file and its save time, as an export leaves them (SX-3)', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: true })
    await bench.built.repaint()
    const before = bench.built.last().appHeaderItems
    await proposalsShown(bench)
    bench.built.browser.toSave.push(bench.built.file('copy.json', new Uint8Array(0)))
    await pressEntry(bench.built, 'IC-158')
    await bench.built.repaint()
    expect(bench.built.last().appHeaderItems.openedFileName).toBe(before.openedFileName)
    expect(bench.built.last().appHeaderItems.fileSavedAt).toBe(before.fileSavedAt)
  })

  it('the next save writes over the work file, not over the backup', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: true })
    await proposalsShown(bench)
    const asked = bench.built.browser.saveQuestions()
    bench.built.browser.toSave.push(bench.built.file('copy.json', new Uint8Array(0)))
    await pressEntry(bench.built, 'IC-158')
    await bench.built.save()
    expect(bench.built.written).toEqual(['copy.json', 'mine.json'])
    expect(bench.built.browser.saveQuestions()).toBe(asked + 1)
    expect(parentFinish(savedDocument(bench.target!))).toBe('2027-05-26')
  })

  it('a backup chooser closed with nothing chosen mends nothing', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: true })
    await proposalsShown(bench)
    bench.built.browser.toSave.push('closed')
    await pressEntry(bench.built, 'IC-158')
    expect(bench.built.written).toEqual([])
    expect(parentFinish(bench.built.loop.document())).toBe('2027-05-21')
  })
})

describe('item 11 -- the log of what was mended stands in the window only', () => {
  it('before any fix IC-156 is not there; after one it is, and the log holds the one mended row', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: true })
    await proposalsShown(bench)
    expect(entryIn(bench.built, 'IC-156'), 'RW-11 puts IC-156 only with a row').toBeNull()
    await pressEntry(bench.built, 'IC-157')
    expect(entryIn(bench.built, 'IC-156')).not.toBeNull()
    await pressEntry(bench.built, 'IC-156')
    expect(bodyRowsOf(needContainer(bench.built, LOG_ROLE))).toHaveLength(1)
  })

  it('a chain of two mends leaves two rows in the log', async () => {
    const bench = await benchOver(CHAIN(), { withTarget: true })
    await proposalsShown(bench)
    await pressEntry(bench.built, 'IC-157')
    await pressEntry(bench.built, 'IC-156')
    expect(bodyRowsOf(needContainer(bench.built, LOG_ROLE))).toHaveLength(2)
  })

  it('one undo takes the rows of that bundle out of the log and IC-156 goes with them (RW-16)', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: true })
    await proposalsShown(bench)
    await pressEntry(bench.built, 'IC-157')
    await bench.built.key(undoKey())
    expect(entryIn(bench.built, 'IC-156')).toBeNull()
  })

  it('the file the fix is saved in holds no trace of the proposal, the checks or the log', async () => {
    const bench = await benchOver(ONE_PARENT(), { withTarget: true })
    const plainKeys = Object.keys(JSON.parse(new TextDecoder().decode(bench.target!.bytes())) as object)
    await proposalsShown(bench)
    await pressEntry(bench.built, 'IC-157')
    await bench.built.save()
    const text = new TextDecoder().decode(bench.target!.bytes())
    expect(Object.keys(JSON.parse(text) as object)).toEqual(plainKeys)
    for (const trace of ['FA-11', 'fixBundle', 'before-fix', 'Delay Fix', 'proposal']) expect(text, trace).not.toContain(trace)
  })
})
