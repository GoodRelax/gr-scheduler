// DFC-724 spec-only cases: FR-029 / T-237 EN-5 -- IC-41 is drawn in effect (S-183) exactly while the watermark it toggles is shown (S-144).

import { describe, expect, it } from 'vitest'

import { bare, specTable } from './spec-table'
import { paletteStage, surfaceOfEntrance } from './wp-p1-palette-stage'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const WATERMARK_ENTRANCE = 'IC-41'
const EN_5_FILL = bare(rowOf('T-237', 'EN-5').by['塗りの色'] ?? '')
const EN_5_CONDITION = rowOf('T-237', 'EN-5').cells[0] ?? ''
const S_144_ENTRANCE = rowOf('T-206', 'S-144').cells.join(' ')

describe('DFC-724 -- the manuscript these cases are driven by', () => {
  it('T-237 EN-5: an entrance that toggles a shown / hidden thing is filled with S-183 while the thing is shown', () => {
    expect(EN_5_CONDITION).toContain('表示・非表示を切り替えるものを、いま表示している')
    expect(EN_5_FILL).toBe('S-183')
  })

  it('T-206 S-144: the watermark the palette toggles is shown by default and its entrance is IC-41', () => {
    expect(S_144_ENTRANCE).toContain(WATERMARK_ENTRANCE)
    expect(rowOf('T-206', 'S-144').cells.join(' ')).toContain('出す')
  })

  it('T-109 IC-41: the entrance is on the Command Palette', () => {
    expect(bare(rowOf('T-109', WATERMARK_ENTRANCE).by['面'] ?? '')).toBe('Command Palette')
  })
})

describe('DFC-724 -- EN-5 on IC-41 (in effect reaches the screen as the entrance being pressed)', () => {
  it('EN-5: while the watermark is shown, IC-41 is in effect', async () => {
    const built = await paletteStage()
    expect(built.item(WATERMARK_ENTRANCE).isPressed).toBe(true)
  })

  it('EN-5: once the watermark is hidden, IC-41 is not in effect', async () => {
    const built = await paletteStage()
    await built.hideWatermark()
    expect(built.surfaceName(), 'precondition: the unlock question was answered').toBeNull()
    expect(built.item(WATERMARK_ENTRANCE).isPressed).toBe(false)
  })

  it('EN-5: pressing IC-41 again puts the watermark back and IC-41 is in effect again', async () => {
    const built = await paletteStage()
    await built.hideWatermark()
    await built.press(surfaceOfEntrance(WATERMARK_ENTRANCE), WATERMARK_ENTRANCE)
    expect(built.item(WATERMARK_ENTRANCE).isPressed).toBe(true)
  })
})
