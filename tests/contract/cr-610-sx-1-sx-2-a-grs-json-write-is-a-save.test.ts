// CR-610 spec-only tests: table T-340 -- what a successful write moves is decided by the form written, not the entrance.

import { describe, expect, it } from 'vitest'

import {
  REQUIREMENTS,
  STATE_MACHINES_SOURCE,
  mergeSomething,
  shellAppSource,
  shellStage,
  stageWithTarget,
} from './cr-610-file-flow-stage'
import { specTable } from './spec-table'

const T_340 = specTable('T-340')

const SX_1_MOVES_THE_TARGET =
  '書けたファイルが上書きする先になるかは、`FR-096` の 表 T-340 に従うこと（MUST）'
const FORM_NOT_ENTRANCE = '書けた後に何が動くかは、入口ではなく書いた形式で決まる'
// WHY: CR-731 added SX-3, so the note now says "every row" where it said "either row".
const NOTHING_MOVES_ON_FAILURE = '書けなかったときは、どの行でも何も動かさないこと（MUST）'

const PLAIN_SHELL =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<title>GRS</title></head><body><div id="app"></div>' +
  '<script type="module">boot()</script></body></html>\n'

const appShell = shellAppSource(PLAIN_SHELL)

function eventSource(key: string): readonly string[] {
  for (const region of STATE_MACHINES_SOURCE.regions) {
    const found = (region['events'] as any[] | undefined)?.find((one) => one.key === key)
    if (found !== undefined) return found.source.rows as string[]
  }
  throw new Error(`state-machines.json has no event ${key}`)
}

describe('T-340 / FR-060 / T-290 -- the manuscript still says it', () => {
  // WHY: CR-731 added SX-3 (the backup before a fix); SX-1 and SX-2 still lead the table unchanged.
  it('T-340 holds SX-1 and SX-2 first, a save that sends documentFileSaved and an export that sends documentFileWriteEnded', () => {
    expect(T_340.rows.map((one) => one.id)).toEqual(['SX-1', 'SX-2', 'SX-3'])
    expect(T_340.rows[0]?.cells.join(' ')).toContain('fileFlow/documentFileSaved')
    expect(T_340.rows[1]?.cells.join(' ')).toContain('fileFlow/documentFileWriteEnded')
  })

  it('FR-096 / FR-060 still hand the decision to table T-340', () => {
    expect(REQUIREMENTS).toContain(FORM_NOT_ENTRANCE)
    expect(REQUIREMENTS).toContain(SX_1_MOVES_THE_TARGET)
    expect(REQUIREMENTS).toContain(NOTHING_MOVES_ON_FAILURE)
  })

  it('T-290: documentFileSaved comes from SX-1 and documentFileWriteEnded from SX-2', () => {
    expect(eventSource('documentFileSaved')).toContain('SX-1')
    expect(eventSource('documentFileWriteEnded')).toContain('SX-2')
  })
})

describe('SX-1 (MUST) -- a GRS JSON written through IC-2 is a save', () => {
  it('SX-1: after IC-2 writes GRS JSON (IO-2), the header names the file written (FR-101, U-58)', async () => {
    const built = await shellStage()
    const chosen = built.file('chosen.json', new Uint8Array(0))
    await built.exportAs('IO-2', chosen)
    expect(built.written, 'precondition: IC-2 wrote nothing').toEqual(['chosen.json'])
    await built.repaint()
    expect(built.last().appHeaderItems.openedFileName, 'SX-1: the header did not take the written file').toBe(
      'chosen.json',
    )
  })

  it('SX-1: after IC-2 writes GRS JSON, the header states the moment it was written (U-59)', async () => {
    const built = await shellStage()
    await built.exportAs('IO-2', built.file('chosen.json', new Uint8Array(0)))
    await built.repaint()
    expect(built.last().appHeaderItems.fileSavedAt, 'SX-1: the header still says never saved').not.toBeNull()
  })

  it('SX-1: after IC-2 writes GRS JSON, the unsaved edits are none (FR-100, nothingUnsaved)', async () => {
    const { built } = await stageWithTarget()
    await mergeSomething(built)
    await built.exportAs('IO-2', built.file('chosen.json', new Uint8Array(0)))
    expect(built.written).toEqual(['chosen.json'])
    expect(built.loop.hasUnsavedEdits(), 'SX-1: documentFileSaved was not sent').toBe(false)
  })

  it('SX-1: a GRS JSON written by IC-2 replaces the name of the earlier save target in the header', async () => {
    const { built } = await stageWithTarget()
    await built.exportAs('IO-2', built.file('chosen.json', new Uint8Array(0)))
    await built.repaint()
    expect(built.last().appHeaderItems.openedFileName).toBe('chosen.json')
  })

  it('SX-1 / DI-5: the next SK-11 writes over the file IC-2 wrote, without a chooser (FR-060)', async () => {
    const { built } = await stageWithTarget()
    const questionsBefore = built.browser.saveQuestions()
    await built.exportAs('IO-2', built.file('chosen.json', new Uint8Array(0)))
    expect(built.browser.saveQuestions(), 'precondition: IC-2 opens one chooser').toBe(questionsBefore + 1)
    await built.save()
    expect(built.written, 'SX-1: SK-11 did not write the file IC-2 wrote').toEqual(['chosen.json', 'chosen.json'])
    expect(built.browser.saveQuestions(), 'SX-1: SK-11 asked again').toBe(questionsBefore + 1)
  })
})

describe('SX-2 (MUST NOT) -- any other form written through IC-2 is an export', () => {
  it('SX-2 (IO-1 MSPDI): the header keeps the name of the save target', async () => {
    const { built } = await stageWithTarget()
    await built.repaint()
    const before = built.last().appHeaderItems
    await built.exportAs('IO-1', built.file('plan.xml', new Uint8Array(0)))
    expect(built.written, 'precondition: IC-2 wrote no MSPDI').toEqual(['plan.xml'])
    await built.repaint()
    expect(built.last().appHeaderItems.openedFileName).toBe(before.openedFileName)
    expect(built.last().appHeaderItems.fileSavedAt).toBe(before.fileSavedAt)
  })

  it('SX-2 (IO-1 MSPDI): the unsaved edits stay', async () => {
    const { built } = await stageWithTarget()
    await mergeSomething(built)
    await built.exportAs('IO-1', built.file('plan.xml', new Uint8Array(0)))
    expect(built.written).toEqual(['plan.xml'])
    expect(built.loop.hasUnsavedEdits(), 'SX-2: an MSPDI export cleared the unsaved edits').toBe(true)
  })

  it('SX-2 (IO-1 MSPDI): the next SK-11 still writes over the earlier save target, asking nothing', async () => {
    const { built } = await stageWithTarget()
    const questionsBefore = built.browser.saveQuestions()
    await built.exportAs('IO-1', built.file('plan.xml', new Uint8Array(0)))
    await built.save()
    expect(built.written, 'SX-2: the MSPDI export moved the save target').toEqual(['plan.xml', 'mine.json'])
    expect(built.browser.saveQuestions(), 'SX-2: SK-11 asked after an MSPDI export').toBe(questionsBefore + 1)
  })

  it('SX-2 (IO-1 MSPDI): a document never saved still says so, and the next SK-11 asks for a file', async () => {
    const built = await shellStage()
    await built.exportAs('IO-1', built.file('plan.xml', new Uint8Array(0)))
    await built.repaint()
    expect(built.last().appHeaderItems.openedFileName).toBeNull()
    expect(built.last().appHeaderItems.fileSavedAt).toBeNull()
    built.browser.toSave.push(built.file('fresh.json', new Uint8Array(0)))
    await built.save()
    expect(built.browser.saveQuestions(), 'SX-2: SK-11 wrote the .xml instead of asking').toBe(2)
    expect(built.written).toEqual(['plan.xml', 'fresh.json'])
  })

  it('SX-2 (IO-7 single .html): header, unsaved edits and save target all stay', async () => {
    const { built } = await stageWithTarget({ appShell })
    await mergeSomething(built)
    await built.repaint()
    const before = built.last().appHeaderItems
    const questionsBefore = built.browser.saveQuestions()
    await built.exportAs('IO-7', built.file('plan.html', new Uint8Array(0)))
    expect(built.written, 'precondition: IC-2 wrote no single .html').toEqual(['plan.html'])
    await built.repaint()
    expect(built.last().appHeaderItems.openedFileName).toBe(before.openedFileName)
    expect(built.loop.hasUnsavedEdits()).toBe(true)
    await built.save()
    expect(built.written).toEqual(['plan.html', 'mine.json'])
    expect(built.browser.saveQuestions()).toBe(questionsBefore + 1)
  })
})

describe('T-340 note (MUST) -- a write that did not happen moves nothing', () => {
  it('SX-1 not reached: an IC-2 GRS JSON write whose chooser is closed moves no header, edit or target', async () => {
    const { built } = await stageWithTarget()
    await mergeSomething(built)
    await built.repaint()
    const before = built.last().appHeaderItems
    await built.exportAs('IO-2', 'closed')
    expect(built.written).toEqual([])
    await built.repaint()
    expect(built.last().appHeaderItems.openedFileName).toBe(before.openedFileName)
    expect(built.last().appHeaderItems.fileSavedAt).toBe(before.fileSavedAt)
    expect(built.loop.hasUnsavedEdits()).toBe(true)
    await built.save()
    expect(built.written).toEqual(['mine.json'])
  })
})
