// DFC-567 part 4 spec-only cases: FR-029 -- a Resource List entrance (IC-63, IC-64, IC-65) that would change nothing is drawn faint, and a press on it tells RS-27 (T-233 holds no roster row) and changes no choice; a pressable one tells nothing.

import { describe, expect, it } from 'vitest'

import type { OpenModal, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { documentOf, personOf, seatOf, taskOf } from './cr-606-stage'
import { REQUIREMENTS } from './cr-610-file-flow-stage'
import { specTable } from './spec-table'
import { paletteStage, surfaceOfEntrance, type PaletteStage } from './wp-p1-palette-stage'

const FR_029_FAINT =
  'その入口を押しても、いま文書にも画面にも何も変えられないときは、その入口を薄く描くこと（MUST）'
const FR_029_ONLY_WHEN_PRESSED = '押されたときに限り、行えない理由を通知の仕組みへ運ぶこと（MUST）'
const FR_029_FALLBACK = 'どの入口にも当たる行が無いときの落ち先が `RS-27` である'

const ROSTER_ENTRANCE = 'IC-62'
const SELECT_ALL = 'IC-63'
const CLEAR_ALL = 'IC-64'
const SELECT_UNREFERENCED = 'IC-65'
const FALLBACK = 'RS-27'
const ROSTER = 'Resource List'

const ADA = 11
const BOB = 12

const noResources = () => documentOf({ tasks: [taskOf(1)] })
const adaAndBob = () =>
  documentOf({
    tasks: [taskOf(1)],
    resources: [personOf(ADA, 'Ada'), personOf(BOB, 'Bob')],
    assignments: [seatOf(21, 1, ADA)],
  })

const rosterOf = (view: ScreenView): Extract<OpenModal, { surface: 'Resource List' }> => {
  const modal = view.openModal as { surface?: string } | null
  if (modal === null || modal.surface !== ROSTER) throw new Error('the Resource List is not standing')
  return modal as Extract<OpenModal, { surface: 'Resource List' }>
}
const chosenUids = (built: PaletteStage): readonly number[] =>
  rosterOf(built.last()).resources.filter((one) => one.isSelected).map((one) => one.uid)
const entranceOf = (built: PaletteStage, icon: string) => {
  const found = rosterOf(built.last()).commands.filter((one) => one.icon === icon)
  if (found.length !== 1) throw new Error(`the roster carries ${found.length} items for ${icon}`)
  return found[0]
}
const refusals = (view: ScreenView): number =>
  view.notices.flatMap((one) => one.raisedNotices).filter((one) => one.reason === FALLBACK).length

async function rosterWith(document: ReturnType<typeof noResources>): Promise<PaletteStage> {
  const built = await paletteStage({ document: document as never })
  await built.press(surfaceOfEntrance(ROSTER_ENTRANCE), ROSTER_ENTRANCE)
  expect(built.surfaceName(), 'precondition: IC-62 raised no roster').toBe(ROSTER)
  return built
}

describe('DFC-567 -- the manuscript these cases are driven by', () => {
  it('FR-029 still states the faint rule, the press-only reason and the RS-27 fallback', () => {
    expect(REQUIREMENTS).toContain(FR_029_FAINT)
    expect(REQUIREMENTS).toContain(FR_029_ONLY_WHEN_PRESSED)
    expect(REQUIREMENTS).toContain(FR_029_FALLBACK)
  })

  it('T-233 holds no row whose situation is the roster, so the fallback is the reason', () => {
    const rows = specTable('T-233').rows.filter((one) => /担当リスト/.test(one.cells.join(' ')) && one.id !== FALLBACK)
    expect(rows.map((one) => one.id)).toEqual([])
  })
})

describe('DFC-567 -- FR-029 a roster with nobody in it', () => {
  it.each([SELECT_ALL, CLEAR_ALL, SELECT_UNREFERENCED])('%s is faint', async (icon) => {
    const built = await rosterWith(noResources())
    expect(entranceOf(built, icon)?.isEnabled).toBe(false)
  })

  it.each([SELECT_ALL, CLEAR_ALL, SELECT_UNREFERENCED])('a press on %s carries RS-27 unseen and chooses nothing', async (icon) => {
    const built = await rosterWith(noResources())
    const before = refusals(built.last())
    await built.press(ROSTER, icon)
    expect(refusals(built.last())).toBe(before)
    expect(chosenUids(built)).toEqual([])
  })
})

describe('DFC-567 -- FR-029 a roster whose choice already is what the entrance would make', () => {
  it('control: nothing chosen, IC-63 and IC-65 are pressable and IC-64 is faint', async () => {
    const built = await rosterWith(adaAndBob())
    expect(entranceOf(built, SELECT_ALL)?.isEnabled).toBe(true)
    expect(entranceOf(built, SELECT_UNREFERENCED)?.isEnabled).toBe(true)
    expect(entranceOf(built, CLEAR_ALL)?.isEnabled).toBe(false)
  })

  it('control: a pressable IC-63 chooses everybody and tells nothing', async () => {
    const built = await rosterWith(adaAndBob())
    await built.press(ROSTER, SELECT_ALL)
    expect([...chosenUids(built)].sort()).toEqual([ADA, BOB])
    expect(refusals(built.last())).toBe(0)
  })

  it('everybody chosen: IC-63 is faint and a press carries RS-27 unseen', async () => {
    const built = await rosterWith(adaAndBob())
    await built.press(ROSTER, SELECT_ALL)
    expect(entranceOf(built, SELECT_ALL)?.isEnabled).toBe(false)
    await built.press(ROSTER, SELECT_ALL)
    expect(refusals(built.last())).toBe(0)
    expect([...chosenUids(built)].sort()).toEqual([ADA, BOB])
  })

  it('only the unreferenced person chosen: IC-65 is faint and a press carries RS-27 unseen', async () => {
    const built = await rosterWith(adaAndBob())
    await built.press(ROSTER, SELECT_UNREFERENCED)
    expect(chosenUids(built)).toEqual([BOB])
    expect(entranceOf(built, SELECT_UNREFERENCED)?.isEnabled).toBe(false)
    await built.press(ROSTER, SELECT_UNREFERENCED)
    expect(refusals(built.last())).toBe(0)
    expect(chosenUids(built)).toEqual([BOB])
  })

  it('control: with a choice standing IC-64 is pressable, clears it and tells nothing', async () => {
    const built = await rosterWith(adaAndBob())
    await built.press(ROSTER, SELECT_ALL)
    expect(entranceOf(built, CLEAR_ALL)?.isEnabled).toBe(true)
    await built.press(ROSTER, CLEAR_ALL)
    expect(chosenUids(built)).toEqual([])
    expect(refusals(built.last())).toBe(0)
  })
})
