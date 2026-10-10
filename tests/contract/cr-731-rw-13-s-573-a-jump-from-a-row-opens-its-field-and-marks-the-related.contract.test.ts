// CR-731 spec-only cases: RW-13 opens the field of the row, SJ-4 stays for the other jumps, S-573 marks the related tasks (section 9 items 18, 19)

import { describe, expect, it } from 'vitest'

import { FS_SUCCESSOR_STARTED, NOT_STARTED_AFTER_START, ONE_PARENT } from './cr-731-documents'
import { PROPOSALS_ROLE } from './cr-731-shell'
import { REQUIREMENTS, WORDS, cellOf, rowText } from './cr-731-stage'
import { smallestWithText, windowStage, type WindowStage } from './cr-731-window-stage'
import { keyOfRow } from './cr-610-file-flow-stage'
import { selfAndDescendants, type FakeElement } from '../fixtures/fake-browser'
import type { Document } from '../../src/entity/document-model/document/document'

const suggestedWord = (WORDS['delayFixes'] as readonly Record<string, any>[]).find((one) => one['part'] === 'suggestedDate')?.['text']['ja'] as string

const LIGHT = cellOf('T-236', 'S-573', '明るいテーマ').replace(/`/g, '').trim().toLowerCase()
const DARK = cellOf('T-236', 'S-573', '暗いテーマ').replace(/`/g, '').trim().toLowerCase()

const proposalsOver = async (document: Document): Promise<WindowStage> => {
  const stage = await windowStage(document)
  await stage.press('IC-107')
  await stage.press('IC-155')
  return stage
}

const rowsOf = (stage: WindowStage): FakeElement[] => {
  const container = stage.inside(PROPOSALS_ROLE)
  if (container === null) throw new Error('no proposals are drawn')
  const head = new Set(selfAndDescendants(container).filter((one) => one.tagName === 'THEAD').flatMap((one) => selfAndDescendants(one)))
  return selfAndDescendants(container).filter((one) => one.tagName === 'TR' && !head.has(one))
}

const nameIn = (row: FakeElement, name: string): FakeElement => {
  const found = smallestWithText(row, name)
  if (found === null) throw new Error(`the row names no ${name}: ${row.textContent}`)
  return found
}

const selectedUids = (stage: WindowStage): number[] =>
  ((stage.loop.agentApiSeams().source.readSnapshot().selection as unknown as { items: { uid: number }[] }).items ?? []).map((one) => one.uid)

const attr = (tag: string, name: string): string | null => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null
const tagsOf = (svg: string, name: string): string[] => svg.match(new RegExp(`<${name}\\b[^>]*>`, 'g')) ?? []
const boxOf = (tag: string) => {
  const points = attr(tag, 'points')
  if (points === null) {
    return { x: Number(attr(tag, 'x')), y: Number(attr(tag, 'y')), right: Number(attr(tag, 'x')) + Number(attr(tag, 'width')), bottom: Number(attr(tag, 'y')) + Number(attr(tag, 'height')) }
  }
  const pairs = points.trim().split(/\s+/).map((one) => one.split(',').map(Number))
  const xs = pairs.map((one) => one[0] as number)
  const ys = pairs.map((one) => one[1] as number)
  return { x: Math.min(...xs), y: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
}
const related = (svg: string): string[] =>
  tagsOf(svg, 'rect').filter((one) => [LIGHT, DARK].includes((attr(one, 'stroke') ?? '').toLowerCase()))
const rings = (svg: string): string[] => tagsOf(svg, 'rect').filter((one) => attr(one, 'data-role') === 'Jump Landing Ring')
const planOf = (svg: string, uid: number): string => {
  const found = (svg.match(/<[a-z]+\b[^>]*>/g) ?? []).find((one) => attr(one, 'data-figure') === `task-${String(uid)}-plan`)
  if (found === undefined) throw new Error(`task ${String(uid)} draws no plan figure`)
  return found
}
const encloses = (outer: string, inner: string): boolean => {
  const a = boxOf(outer)
  const b = boxOf(inner)
  return a.x < b.x && a.y < b.y && a.right > b.right && a.bottom > b.bottom
}

describe('RW-13 / SJ-4 -- the manuscript these cases read', () => {
  it('SJ-4 keeps its MUST NOT and names RW-13 as its only exception', () => {
    expect(rowText('T-332', 'SJ-4')).toContain('表 T-346 の `RW-13` だけである')
    expect(REQUIREMENTS).toContain('飛ぶことを理由に、プロパティパネル（`_assets/tbl-settings.md` の `S-99h`）を出したり閉じたりしてはならない（MUST NOT）')
  })

  it('S-573 is a color of its own, neither of the two colors of the landing ring (S-151)', () => {
    expect(LIGHT).toMatch(/^#[0-9a-f]{6}$/)
    expect(DARK).toMatch(/^#[0-9a-f]{6}$/)
    expect(cellOf('T-236', 'S-151', '明るいテーマ')).not.toContain(LIGHT)
  })
})

describe('item 18 -- a name pressed in the proposals opens the panel on the field of the row', () => {
  it('FA-22: the panel is closed before, up after, and the focus is asked for PR-4 and for no other field', async () => {
    const stage = await proposalsOver(NOT_STARTED_AFTER_START())
    expect(stage.last().propertiesPanel, 'premise: the panel is closed').toBeNull()
    await stage.clickOn(nameIn(rowsOf(stage)[0]!, 'Task 1'))
    expect(selectedUids(stage)).toEqual([1])
    expect(stage.last().propertiesPanel, 'RW-13 puts the panel up').not.toBeNull()
    expect([...new Set(stage.asked)]).toEqual(['PR-4'])
  })

  it('FA-22: the focus really lands in the PR-4 field of the panel', async () => {
    const stage = await proposalsOver(NOT_STARTED_AFTER_START())
    await stage.clickOn(nameIn(rowsOf(stage)[0]!, 'Task 1'))
    expect(stage.focusedRow()).toBe('PR-4')
  })

  it('a row with no field to open (FA-11) jumps, leaves the panel closed and asks for no focus', async () => {
    const stage = await proposalsOver(ONE_PARENT())
    await stage.clickOn(nameIn(rowsOf(stage)[0]!, 'Task 1'))
    expect(selectedUids(stage)).toEqual([1])
    expect(stage.last().propertiesPanel).toBeNull()
    expect(stage.asked).toEqual([])
  })

  it('SJ-4 regression: a name pressed in the diagnosis table puts no panel up', async () => {
    const stage = await windowStage(NOT_STARTED_AFTER_START())
    await stage.press('IC-107')
    await stage.clickOn(smallestWithText(stage.window()!, 'Task 1')!)
    expect(selectedUids(stage)).toEqual([1])
    expect(stage.last().propertiesPanel).toBeNull()
    expect(stage.asked).toEqual([])
  })

  it('SJ-4 regression: a row of the Search Panel puts no panel up either', async () => {
    const stage = await windowStage(NOT_STARTED_AFTER_START())
    await stage.key(keyOfRow('SK-24'))
    const panel = selfAndDescendants(stage.built.root()).find((one) => one.getAttribute('data-role') === 'Search Panel')
    expect(panel, 'premise: the Search Panel is drawn').toBeDefined()
    await stage.clickOn(smallestWithText(panel!, 'Task 1')!)
    expect(selectedUids(stage)).toEqual([1])
    expect(stage.last().propertiesPanel).toBeNull()
  })
})

describe('item 19 -- S-573 marks the related tasks and the landing ring (S-151) marks the target', () => {
  const landed = async (): Promise<WindowStage> => {
    const stage = await proposalsOver(FS_SUCCESSOR_STARTED())
    const row = rowsOf(stage).find((one) => one.textContent.includes(suggestedWord))
    if (row === undefined) throw new Error('no row of a suggested date: VO-3 is not proposed')
    await stage.clickOn(nameIn(row, 'Task 1'))
    return stage
  }

  it('VO-3: the target is the predecessor, ringed; the successor carries one frame in the S-573 color', async () => {
    const stage = await landed()
    const svg = stage.svg()
    expect(rings(svg), 'one landing ring').toHaveLength(1)
    expect(encloses(rings(svg)[0]!, planOf(svg, 1)), 'the ring is around task 1').toBe(true)
    expect(related(svg), 'one related frame').toHaveLength(1)
    expect(encloses(related(svg)[0]!, planOf(svg, 2)), 'the frame is around task 2').toBe(true)
  })

  it('the related frame has the shape of the ring, without a fill', async () => {
    const stage = await landed()
    const frame = related(stage.svg())[0]!
    const ring = rings(stage.svg())[0]!
    expect(attr(frame, 'fill')).toBe(attr(ring, 'fill'))
    expect(attr(frame, 'stroke-width')).toBe(attr(ring, 'stroke-width'))
    expect(attr(frame, 'stroke-dasharray')).toBe(attr(ring, 'stroke-dasharray'))
  })

  it('a press anywhere clears the ring and the related frame together (EL-17)', async () => {
    const stage = await landed()
    await stage.clickOn(stage.built.root())
    expect(rings(stage.svg())).toHaveLength(0)
    expect(related(stage.svg())).toHaveLength(0)
  })

  it('a jump with no related task draws no frame in the S-573 color (FA-22)', async () => {
    const stage = await proposalsOver(NOT_STARTED_AFTER_START())
    await stage.clickOn(nameIn(rowsOf(stage)[0]!, 'Task 1'))
    expect(rings(stage.svg())).toHaveLength(1)
    expect(related(stage.svg())).toHaveLength(0)
  })

  it('a jump from the diagnosis table draws no related frame (RW-13 is the proposals only)', async () => {
    const stage = await windowStage(FS_SUCCESSOR_STARTED())
    await stage.press('IC-107')
    await stage.clickOn(smallestWithText(stage.window()!, 'Task 1')!)
    expect(related(stage.svg())).toHaveLength(0)
  })
})
