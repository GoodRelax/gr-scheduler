// CR-430: the pointer column of table T-266 hands every grab area one row of table T-269.

import { describe, expect, it } from 'vitest'

import { cellOf, grabRow, grabRows, pointerIdsIn, rowsOf } from './cr-430-scene'

const FR_106_TELLS_WHAT = 'どの掴み代でどの形かは表 T-266 のポインタの欄、形そのものは表 T-269 に従うこと。'
const FR_106_MARKER_IS_A_FINGER =
  '⭐ 押す役と引く役を兼ねる進捗マーカー（表 T-270 の `PE-8`）は、押す役の形（指）とすること（MUST）。'
const FR_106_HELD_KEEPS_SHAPE = '押しているあいだは、掴んだときの形を保つこと（MUST）。'
const T_269_WHITE_IS_PLAN = '⭐ 白 ＝ 予定、黒 ＝ 実績とダミー、の約束を、箱の矢印と円で揃えること（MUST）。'
const T_269_ARMED_TOOL_WINS =
  '⚠️ 依存線の道具を構えているあいだは、本表の形を当てないこと（MUST NOT） —— 構えている合図は 表 T-028 の `IN-2` が持つ。'

const EXPECTED_ROW_IDS = Array.from({ length: 22 }, (_one, at) => `GA-${at + 1}`)
// WHY: not a run of nine -- the white and black of PK-1 and PK-5 are two fills of one row each.
const EXPECTED_POINTER_IDS = ['PK-1', 'PK-3', 'PK-4', 'PK-5', 'PK-7', 'PK-8', 'PK-9']

const frameLoopModule = async (): Promise<Record<string, unknown>> =>
  (await import('../../src/framework/single-html-shell/frame-loop')) as unknown as Record<string, unknown>

const seam = async (name: string): Promise<(...given: unknown[]) => unknown> => {
  const module = await frameLoopModule()
  const found = module[name]
  if (typeof found !== 'function') throw new Error(`frame-loop.ts exports no ${name}() yet`)
  return found as (...given: unknown[]) => unknown
}

describe('table T-269 -- the manuscript shape of the nine pointers', () => {
  it('holds exactly the seven rows PK-1, PK-3, PK-4, PK-5, PK-7, PK-8, PK-9', () => {
    expect(rowsOf('T-269').map((row) => row.id)).toEqual(EXPECTED_POINTER_IDS)
  })

  it(`keeps white for the plan and black for the actual: ${T_269_WHITE_IS_PLAN}`, () => {
    expect(cellOf('T-269', 'PK-1', '中 ／ 縁')).toContain('予定は 白 ／ 黒')
    expect(cellOf('T-269', 'PK-1', '中 ／ 縁')).toContain('実績とダミーは 黒 ／ 白')
    expect(cellOf('T-269', 'PK-5', '中 ／ 縁')).toContain('予定は ○（白 ／ 黒）')
    expect(cellOf('T-269', 'PK-5', '中 ／ 縁')).toContain('実績とダミーは ●（黒 ／ 白）')
  })
})

describe(`the pointer column of table T-266: ${FR_106_TELLS_WHAT}`, () => {
  it.each(EXPECTED_ROW_IDS)('%s names exactly one row of table T-269', (id) => {
    const named = pointerIdsIn(grabRow(id).pointer)
    expect(named, `${id}: ${FR_106_TELLS_WHAT}`).toHaveLength(1)
    expect(EXPECTED_POINTER_IDS, `${id}: ${FR_106_TELLS_WHAT}`).toContain(named[0])
  })

  it(`gives the progress marker the finger: ${FR_106_MARKER_IS_A_FINGER}`, () => {
    expect(pointerIdsIn(grabRow('GA-18').pointer), FR_106_MARKER_IS_A_FINGER).toEqual(['PK-7'])
    expect(cellOf('T-269', 'PK-7', '名前'), FR_106_MARKER_IS_A_FINGER).toContain('指')
  })

  it('gives every plan end a white pointer and every actual or dummy end a black one', () => {
    const white = ['GA-1', 'GA-2', 'GA-10', 'GA-11']
    const black = ['GA-3', 'GA-4', 'GA-5', 'GA-6', 'GA-12', 'GA-13', 'GA-21', 'GA-22']
    for (const id of [...white, ...black]) {
      expect(pointerIdsIn(grabRow(id).pointer), `${id}: ${T_269_WHITE_IS_PLAN}`).toEqual(['PK-1'])
    }
    for (const id of white) expect(grabRow(id).pointer, `${id}: ${T_269_WHITE_IS_PLAN}`).toContain('白')
    for (const id of black) expect(grabRow(id).pointer, `${id}: ${T_269_WHITE_IS_PLAN}`).toContain('黒')
  })

  it('uses every one of the nine pointers at least once across the 22 rows', () => {
    const used = new Set(grabRows().flatMap((row) => pointerIdsIn(row.pointer)))
    expect([...used].sort(), FR_106_TELLS_WHAT).toEqual(
      EXPECTED_POINTER_IDS.filter((id) => used.has(id)).sort(),
    )
    expect(used.size, FR_106_TELLS_WHAT).toBe(EXPECTED_POINTER_IDS.length)
  })
})

describe(`pointerRowOf and pointerImageOf -- the seam that carries the pointer column`, () => {
  it.each(EXPECTED_ROW_IDS)('answers %s with the table T-269 row its pointer column names', async (id) => {
    const pointerRowOf = await seam('pointerRowOf')
    expect(pointerRowOf({ grab: id }, false), `${id}: ${FR_106_TELLS_WHAT}`).toBe(pointerIdsIn(grabRow(id).pointer)[0])
  })

  it(`draws an image for every row of table T-269: ${FR_106_TELLS_WHAT}`, async () => {
    const pointerImageOf = await seam('pointerImageOf')
    for (const id of EXPECTED_POINTER_IDS) {
      const written = pointerImageOf(id)
      expect(typeof written, `${id} has no pointer image`).toBe('string')
      expect(String(written).length, `${id} has an empty pointer image`).toBeGreaterThan(0)
    }
    // WHY: PK-1 and PK-5 each draw two fills (T-269's closing white/black rule), so the two are two images.
    for (const id of ['PK-1', 'PK-5']) {
      expect(pointerImageOf(id, 'start', 'filled'), `${id}: ${T_269_WHITE_IS_PLAN}`).not.toBe(pointerImageOf(id, 'start', 'hollow'))
    }
  })

  it(`answers nothing while the dependency tool is armed: ${T_269_ARMED_TOOL_WINS}`, async () => {
    const pointerRowOf = await seam('pointerRowOf')
    for (const id of ['GA-1', 'GA-9', 'GA-18']) {
      expect(pointerRowOf({ grab: id }, true), `${id}: ${T_269_ARMED_TOOL_WINS}`).toBeNull()
    }
  })

  it(`answers nothing when the pointer is over no grab area: ${FR_106_HELD_KEEPS_SHAPE}`, async () => {
    const pointerRowOf = await seam('pointerRowOf')
    expect(pointerRowOf(null, false)).toBeNull()
  })
})
