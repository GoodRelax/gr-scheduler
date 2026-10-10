// W3 tester 4: FR-020 table T-242 WM-9 -- closing the watermark unlock surface without the password leaves the watermark drawn.

// WHY: the Esc route is pressed on the running application in tests/system/w3-t4-the-file-surfaces-and-the-title-on-the-built-page.test.ts;
// this file closes the surface with its No answer through the frame loop and reads the picture from the export scene.

import { describe, expect, it } from 'vitest'

import { REQUIREMENTS, shellStage, surfaceOfEntrance } from './cr-610-file-flow-stage'

const WM_9_KEEP =
  ' の「面」である（MUST） —— `Esc` の「開いている面」の段で閉じる（表 T-028 の `IN-4`）。⛔ **閉じたときに透かしを非表示にしてはならない（MUST NOT）'
const WM_6_SURFACE = '透かしを非表示にする入口（表 T-109 の `IC-41`）が押されたとき、透かし解除の面（`_assets/tbl-glossary.md` の 表 T-103 の `U-60`）を立てること（MUST）。'

const UNLOCK_SURFACE = 'Watermark Unlock'

/** @purity pure */
function watermarkLayers(svg: string): number {
  return [...svg.matchAll(/data-role="Watermark"/g)].length
}

describe('WM-9 -- the manuscript these cases are driven by', () => {
  it.each([WM_9_KEEP, WM_6_SURFACE])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe(`WM-9 -- ${WM_9_KEEP}`, () => {
  it('IC-41 raises the unlock surface; closing it unanswered with No leaves the drawn watermark exactly as it was', async () => {
    const built = await shellStage()
    const before = built.loop.exportScene()?.svg ?? ''
    expect(watermarkLayers(before), 'premise: the watermark is drawn before the surface is raised').toBeGreaterThan(0)

    await built.press(surfaceOfEntrance('IC-41'), 'IC-41')
    expect((built.last().openModal as { surface?: string } | null)?.surface, WM_6_SURFACE).toBe(UNLOCK_SURFACE)

    await built.press(UNLOCK_SURFACE, null, { confirmationAnswer: 'cancel' })
    expect(built.last().openModal, 'premise: No closed the surface').toBeNull()
    const after = built.loop.exportScene()?.svg ?? ''
    expect(watermarkLayers(after), WM_9_KEEP).toBe(watermarkLayers(before))
    expect(after.length, `${WM_9_KEEP}: the picture lost nothing`).toBe(before.length)
  })
})
