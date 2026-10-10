// DFC-2260 spec-only cases: FR-029 / T-280 -- while U-56 or U-61 awaits its answer, the palette entrances that would only be refused with RS-27 (IC-62, and IC-41 while the watermark shows) are drawn faint; pressing one tells RS-27 and changes no surface.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  HERE_TASK_GROUP,
  OPEN_CHOOSER,
  REQUIREMENTS,
  oneTaskGroupDocument,
  reasonWords,
} from './cr-610-file-flow-stage'
import { unbroken } from './spec-table'
import { jsonBytes, paletteStage, surfaceOfEntrance, there, type PaletteStage } from './wp-p1-palette-stage'

const MACHINES = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8'))

const FR_029_FAINT =
  'その入口を押しても、いま文書にも画面にも何も変えられないときは、その入口を薄く描くこと（MUST）'
const REFUSES_ANOTHER = '開く道の答えを待つ面（`flowSurfaceAnswered` で答える `U-56`・`U-61`）は差し替えない。押した入口が効かない理由として運ぶ'

const ROSTER_ENTRANCE = 'IC-62'
const WATERMARK_ENTRANCE = 'IC-41'
const EXPORT_ENTRANCE = 'IC-2'
const DIFFERENCE_REVIEW = 'Difference Review'
const KEEP_THE_FILE_VALUE = 'IC-95'
const MERGE = 'IC-72'
const REFUSAL = 'RS-27'

const toldReasons = (view: ScreenView): readonly string[] =>
  view.notices.flatMap((one) => one.raisedNotices.map((two) => two.reason))

async function withOpenChooser(): Promise<PaletteStage> {
  const built = await paletteStage()
  await built.open(built.file('theirs.json', jsonBytes(there())))
  expect(built.surfaceName(), 'precondition: SK-10 raised no U-56').toBe(OPEN_CHOOSER())
  return built
}

async function withDifferenceReview(): Promise<PaletteStage> {
  const built = await paletteStage()
  const renamed = oneTaskGroupDocument('Here', HERE_TASK_GROUP, 1) as unknown as { schedule: { tasks: { name: string }[] } }
  const first = renamed.schedule.tasks[0]
  if (first === undefined) throw new Error('the bench document holds no Task')
  first.name = 'Renamed by the import'
  await built.open(built.file('same.json', jsonBytes(renamed)))
  await built.press(OPEN_CHOOSER(), MERGE)
  expect(built.surfaceName(), 'precondition: a matched Task asks first').toBe(DIFFERENCE_REVIEW)
  return built
}

describe('DFC-2260 -- the manuscript these cases are driven by', () => {
  it('FR-029 still states the faint rule, and T-280 still refuses another surface while U-56 / U-61 awaits', () => {
    expect(REQUIREMENTS).toContain(FR_029_FAINT)
    const refusals = MACHINES.split(REFUSES_ANOTHER).length - 1
    expect(refusals, 'T-280: surfaceEntryPressed and watermarkEntryPressed each refuse with RS-27').toBeGreaterThanOrEqual(2)
  })
})

describe('DFC-2260 -- FR-029 the palette entrances beside a surface that awaits an answer', () => {
  it('control: with no surface standing, IC-62 and IC-41 are not faint', async () => {
    const built = await paletteStage()
    expect(built.item(ROSTER_ENTRANCE).isEnabled).toBe(true)
    expect(built.item(WATERMARK_ENTRANCE).isEnabled).toBe(true)
  })

  it('U-56 awaits: IC-41 (the watermark shows) is faint, IC-62 opens a window and is not (CR-722 RO-1)', async () => {
    const built = await withOpenChooser()
    expect(built.item(ROSTER_ENTRANCE).isEnabled).toBe(true)
    expect(built.item(WATERMARK_ENTRANCE).isEnabled).toBe(false)
  })

  it('U-56 awaits and the watermark is hidden: neither IC-62 (a window, CR-722 RO-1) nor IC-41 (pressing it shows the watermark) is faint', async () => {
    const built = await paletteStage()
    await built.hideWatermark()
    await built.open(built.file('theirs.json', jsonBytes(there())))
    expect(built.surfaceName(), 'precondition: SK-10 raised no U-56').toBe(OPEN_CHOOSER())
    expect(built.item(ROSTER_ENTRANCE).isEnabled).toBe(true)
    expect(built.item(WATERMARK_ENTRANCE).isEnabled).toBe(true)
  })

  it('U-61 awaits: IC-41 (the watermark shows) is faint, IC-62 opens a window and is not (CR-722 RO-1)', async () => {
    const built = await withDifferenceReview()
    expect(built.item(ROSTER_ENTRANCE).isEnabled).toBe(true)
    expect(built.item(WATERMARK_ENTRANCE).isEnabled).toBe(false)
  })

  it('control: a surface that awaits no flow answer (U-54) leaves IC-62 and IC-41 pressable, since they replace it', async () => {
    const built = await paletteStage()
    await built.press(surfaceOfEntrance(EXPORT_ENTRANCE), EXPORT_ENTRANCE)
    expect(built.surfaceName(), 'precondition: IC-2 raised no U-54').not.toBeNull()
    expect(built.item(ROSTER_ENTRANCE).isEnabled).toBe(true)
    expect(built.item(WATERMARK_ENTRANCE).isEnabled).toBe(true)
  })

  it('the answer ends the wait: after IC-95 closes U-61, IC-62 and IC-41 are pressable again', async () => {
    const built = await withDifferenceReview()
    await built.press(DIFFERENCE_REVIEW, KEEP_THE_FILE_VALUE)
    expect([null, 'Import Report'], 'precondition: the answer left a surface awaiting an answer').toContain(built.surfaceName())
    expect(built.item(ROSTER_ENTRANCE).isEnabled).toBe(true)
    expect(built.item(WATERMARK_ENTRANCE).isEnabled).toBe(true)
  })
})

describe('DFC-2260 -- T-280 pressing a faint entrance', () => {
  it('IC-62 while U-56 awaits: it is no surface entry (CR-722 RO-1), so nothing is told and U-56 stays', async () => {
    const built = await withOpenChooser()
    await built.press(surfaceOfEntrance(ROSTER_ENTRANCE), ROSTER_ENTRANCE)
    expect(toldReasons(built.last())).not.toContain(REFUSAL)
    expect(built.surfaceName()).toBe(OPEN_CHOOSER())
    expect(reasonWords(REFUSAL).text.ja.length).toBeGreaterThan(0)
  })

  it('IC-41 while U-56 awaits and the watermark shows: RS-27 is carried unseen (CR-712) and U-56 stays', async () => {
    const built = await withOpenChooser()
    await built.press(surfaceOfEntrance(WATERMARK_ENTRANCE), WATERMARK_ENTRANCE)
    expect(toldReasons(built.last())).not.toContain(REFUSAL)
    expect(built.surfaceName()).toBe(OPEN_CHOOSER())
  })
})
