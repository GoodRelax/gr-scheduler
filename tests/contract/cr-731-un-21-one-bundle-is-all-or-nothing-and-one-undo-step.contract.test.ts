// CR-731 spec-only cases: the bundle of the checked rows is atomic, one undo step, and writes no view of a table (section 9 items 6, 8, 15)

import { describe, expect, it } from 'vitest'

import { FR_155_NOTHING_IN_THE_DOCUMENT, FR_155_REFUSED_NONE_APPLIED, FR_155_SAVE_THEN_ONE_BUNDLE } from './cr-731-clauses'
import { CHAIN, CHAIN_ROOT_READ_ONLY, ONE_PARENT } from './cr-731-documents'
import {
  REQUIREMENTS,
  cellOf,
  commandsOf,
  diagnosed,
  heldOf,
  machineRows,
  planned,
  proposed,
  redone,
  stepsOf,
  taskIn,
  undone,
  written,
} from './cr-731-stage'

const bundleOf = (make: () => ReturnType<typeof CHAIN>) => commandsOf(machineRows(proposed(make())))

describe('FR-155 / UN-21 -- the manuscript these cases read', () => {
  it('FR-155 still names the bundle, the refusal of all and the things never written to the document', () => {
    expect(REQUIREMENTS).toContain(FR_155_SAVE_THEN_ONE_BUNDLE)
    expect(REQUIREMENTS).toContain(FR_155_REFUSED_NONE_APPLIED)
    expect(REQUIREMENTS).toContain(FR_155_NOTHING_IN_THE_DOCUMENT)
  })

  it('UN-21 makes what one approval mended one step, apart from the step of a table view (UN-20)', () => {
    const cell = cellOf('T-027', 'UN-21', '操作')
    expect(cell).toContain('1 回の了承で発行した束を 1 段とする')
    expect(cell).toContain('1 度の取り消しでまとめて戻る')
    expect(cell).toContain('直しの束は表の見え方を書かない')
  })
})

describe('item 6 (undo) -- UN-21: what one approval mended comes back with one undo', () => {
  it('the bundle is one step of the history', () => {
    const held = written(heldOf(CHAIN()), bundleOf(CHAIN))
    expect(stepsOf(held)).toBe(1)
  })

  it('one undo gives back the schedule and the settings as they were, and one redo mends again', () => {
    const before = CHAIN()
    const mended = written(heldOf(before), bundleOf(CHAIN))
    const back = undone(mended)
    expect(back.document.schedule).toEqual(before.schedule)
    expect(back.document.documentSettings).toEqual(before.documentSettings)
    const again = redone(back)
    expect(again.document.schedule).toEqual(mended.document.schedule)
  })

  it('the bundle writes no view of a table: the settings come out as they went in', () => {
    const before = ONE_PARENT()
    const mended = written(heldOf(before), bundleOf(ONE_PARENT))
    expect(mended.document.documentSettings).toEqual(before.documentSettings)
    expect(taskIn(mended.document, 1)['finish']).not.toEqual(taskIn(before, 1)['finish'])
  })
})

// WHY: DFC-730 -- the write path does not refuse an edit in a read-only task group yet (GP-1), so this bundle is not refused.
describe('item 8 -- all or nothing: a command the document refuses stops the whole bundle', () => {
  it.fails('the bundle of the first document is refused on a document that cannot take its second command', () => {
    const commands = bundleOf(CHAIN)
    expect(commands.length, 'premise: a bundle of at least two commands').toBeGreaterThanOrEqual(2)
    const target = CHAIN_ROOT_READ_ONLY()
    const plan = planned(heldOf(target), commands)
    expect(plan.ok, 'GP-1 refuses the root, so the bundle is refused').toBe(false)
  })

  it.fails('the refusal leaves nothing applied: no document and no step come out of it', () => {
    const target = CHAIN_ROOT_READ_ONLY()
    const plan = planned(heldOf(target), bundleOf(CHAIN)) as unknown as Record<string, unknown>
    expect(plan['document']).toBeUndefined()
    expect(plan['history']).toBeUndefined()
    expect(taskIn(target, 1)['finish']).toEqual(taskIn(CHAIN_ROOT_READ_ONLY(), 1)['finish'])
  })
})

describe('item 15 -- FR-130: making the proposal changes nothing', () => {
  it('the diagnosis and the proposal leave the document as it was', () => {
    const document = CHAIN()
    const copy = structuredClone(document)
    diagnosed(document)
    proposed(document)
    expect(document).toEqual(copy)
  })

  it('two proposals made of the same document are the same (same document, same proposal)', () => {
    expect(proposed(CHAIN())).toEqual(proposed(CHAIN()))
  })
})
