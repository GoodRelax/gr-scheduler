// CR-430: table T-268 orders the kinds of grab area, on a drawn shape and off it.

import { describe, expect, it } from 'vitest'

import {
  actualOf,
  boxOf,
  boxOfRect,
  cellOf,
  defaultOf,
  dummiesOf,
  fadeHandlesOf,
  grabAt,
  markerOf,
  PLAN_START,
  rowsOf,
  sceneOf,
  sizesWith,
} from './cr-430-scene'

const T_268_TOP_FIRST = '⭐ 上の行ほど先に応えること（MUST）。'
const T_268_ONE_DIFFERENCE = '⚠️ 2 つの列の違いは依存線の位置だけである。'
const T_268_FADE_BEFORE_LINE =
  '⭐ 形の外でもフェードの掴み点を依存線より先にするのは、掴み点が選んだタスクにだけ出る（`FR-075`）小さな 1 か所の的であり、線は長くてほかのどこでも選べるからである。'
const T_268_MARKER_IN_ACTUAL =
  '⭐ 実績の中に立つ進捗マーカーを実績の端より後に置くので、マーカーの左半分は実績の開始が、右半分はマーカーが応える。'
const T_268_RESUME_WITH_MARKER =
  '⭐ 再開アイコンを、実績の外に立つ進捗マーカーと同じ順に入れるのは、拡大すれば予定は編集できるが、拡大しても再開はできないからである。'

const COLUMN_ORDER = '順'
const COLUMN_ON_SHAPE = '形の上'
const COLUMN_OFF_SHAPE = '形の外（隙間・外側の帯）'

const EXPECTED_ROW_IDS = Array.from({ length: 9 }, (_one, at) => `TY-${at + 1}`)

const DEPENDENCY = '依存線'

const plain = (cell: string): string =>
  cell
    .replace(/`/g, '')
    .replace(/\*/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\s/g, '')

const kindsIn = (cell: string): readonly string[] => plain(cell).split('・').filter((one) => one !== '')

const columnKinds = (column: string): readonly string[] =>
  rowsOf('T-268').flatMap((row) => kindsIn(row.by[column] ?? ''))

// see S-63
const SCENE = sceneOf('rectangle', { progressMarkerVisible: true })
const MILESTONE = sceneOf('milestone', { progressMarkerVisible: true })

describe('table T-268 -- the manuscript shape of the nine rows', () => {
  it(`holds exactly TY-1 through TY-9: ${T_268_TOP_FIRST}`, () => {
    expect(rowsOf('T-268').map((row) => row.id)).toEqual(EXPECTED_ROW_IDS)
  })

  it(`numbers them 1 to 9 down the page: ${T_268_TOP_FIRST}`, () => {
    expect(rowsOf('T-268').map((row) => (row.by[COLUMN_ORDER] ?? '').trim())).toEqual(
      EXPECTED_ROW_IDS.map((_one, at) => String(at + 1)),
    )
  })

  it.each(EXPECTED_ROW_IDS)('%s names a kind in both columns', (id) => {
    expect(kindsIn(cellOf('T-268', id, COLUMN_ON_SHAPE)).length, `${id} names nothing on a drawn shape`).toBeGreaterThan(
      0,
    )
    expect(kindsIn(cellOf('T-268', id, COLUMN_OFF_SHAPE)).length, `${id} names nothing off a shape`).toBeGreaterThan(0)
  })

  it(`differs between the two columns only in where the dependency line sits: ${T_268_ONE_DIFFERENCE}`, () => {
    const onShape = columnKinds(COLUMN_ON_SHAPE).filter((one) => one !== DEPENDENCY)
    const offShape = columnKinds(COLUMN_OFF_SHAPE).filter((one) => one !== DEPENDENCY)
    expect(onShape, T_268_ONE_DIFFERENCE).toEqual(offShape)
  })

  it(`moves the dependency line from fifth on a shape to second off it: ${T_268_ONE_DIFFERENCE}`, () => {
    expect(kindsIn(cellOf('T-268', 'TY-5', COLUMN_ON_SHAPE)), T_268_ONE_DIFFERENCE).toEqual([DEPENDENCY])
    expect(kindsIn(cellOf('T-268', 'TY-2', COLUMN_OFF_SHAPE)), T_268_ONE_DIFFERENCE).toEqual([DEPENDENCY])
  })

  it(`keeps the fade grab point ahead of the dependency line in both columns: ${T_268_FADE_BEFORE_LINE}`, () => {
    for (const column of [COLUMN_ON_SHAPE, COLUMN_OFF_SHAPE]) {
      const kinds = columnKinds(column)
      expect(kinds.indexOf('フェードの掴み点'), T_268_FADE_BEFORE_LINE).toBeLessThan(kinds.indexOf(DEPENDENCY))
    }
  })

  it(`keeps the resume icon beside the marker that stands outside the actual: ${T_268_RESUME_WITH_MARKER}`, () => {
    expect(kindsIn(cellOf('T-268', 'TY-2', COLUMN_ON_SHAPE)), T_268_RESUME_WITH_MARKER).toEqual([
      '進捗マーカー',
      '再開アイコン',
    ])
    expect(kindsIn(cellOf('T-268', 'TY-3', COLUMN_OFF_SHAPE)), T_268_RESUME_WITH_MARKER).toEqual([
      '進捗マーカー',
      '再開アイコン',
    ])
  })

  it(`puts the marker that stands inside the actual after the actual end: ${T_268_MARKER_IN_ACTUAL}`, () => {
    for (const column of [COLUMN_ON_SHAPE, COLUMN_OFF_SHAPE]) {
      const kinds = columnKinds(column)
      expect(kinds.lastIndexOf('進捗マーカー'), T_268_MARKER_IN_ACTUAL).toBeGreaterThan(kinds.indexOf('実績の端'))
    }
  })

  it(`puts the body last in both columns: ${T_268_TOP_FIRST}`, () => {
    for (const column of [COLUMN_ON_SHAPE, COLUMN_OFF_SHAPE]) {
      expect(columnKinds(column).at(-1), T_268_TOP_FIRST).toBe('本体')
    }
  })
})

describe(`TY-1 -- the fade grab point answers before anything else: ${T_268_TOP_FIRST}`, () => {
  it('answers at its own point although the plan end grab covers the same pixel', () => {
    const points = [...fadeHandlesOf(SCENE.started)].sort((a, b) => a.y - b.y)
    expect(points, 'premise: the selected Task has its two fade points').toHaveLength(2)
    expect(grabAt(SCENE, points[0]!.x, points[0]!.y), T_268_TOP_FIRST).toBe('GA-7')
    expect(grabAt(SCENE, points[1]!.x, points[1]!.y), T_268_TOP_FIRST).toBe('GA-8')
  })
})

describe(`TY-2 / TY-3 -- the marker outside the actual and the resume icon answer before the plan end`, () => {
  // WHY: a one-day actual, so table T-273's LP-2 stands the marker just right of the base's end --
  // WHY: on the default actual the label fits, the marker stands at its start and TY-7 applies instead.
  it('gives the marker the pixel it shares with the plan end grab', () => {
    const SHORT = sceneOf(
      'rectangle',
      { progressMarkerVisible: true },
      { stop: PLAN_START, resume: null, resumeValid: null },
    )
    const marker = markerOf(SHORT.started)
    const plan = boxOf((SHORT.started as unknown as { plan: unknown }).plan)
    expect(marker, 'premise: a marker is drawn').not.toBeNull()
    const reaching = sizesWith(SHORT.sizes, 'S-254', plan.right - marker!.centre.x + marker!.radius)
    expect(grabAt(SHORT, marker!.centre.x, marker!.centre.y, reaching), T_268_TOP_FIRST).toBe('GA-18')
  })
})

describe('TY-3 / TY-4 -- the dummy answers before the actual end and before the body', () => {
  it('gives the drawn mark to the dummy, not to the plan body under it', () => {
    const dummies = dummiesOf(SCENE.unstarted)
    expect(dummies.length, 'premise: a dummy is drawn').toBeGreaterThan(0)
    const ink = boxOfRect(dummies[0]!.ink)
    expect(grabAt(SCENE, ink.middleX, ink.middleY), T_268_TOP_FIRST).not.toBe('GA-9')
  })
})

describe('TY-4 / TY-6 -- the actual end answers before the plan end where the two overlap', () => {
  it('hands the shared pixel to the actual once the actual end reaches outside its bar', () => {
    const plan = boxOf((SCENE.started as unknown as { plan: unknown }).plan)
    const actual = boxOf(actualOf(SCENE.started))
    const wide = sizesWith(SCENE.sizes, 'S-259', plan.right - actual.right + defaultOf('S-253'))
    // WHY: off the mid-line, where the dependency leaves this Task's plan end -- off a drawn shape
    // WHY: table T-268 puts the line (TY-2) ahead of an actual end (TY-5), and the line would answer.
    expect(grabAt(SCENE, plan.right + 1, actual.bottom - 1, wide), T_268_TOP_FIRST).toBe('GA-4')
  })
})

describe('TY-5 -- the dependency line falls behind the shapes on a drawn shape and rises off it', () => {
  it('never takes a pixel of a drawn plan bar', () => {
    const plan = boxOf((SCENE.downstream as unknown as { plan: unknown }).plan)
    const seen: string[] = []
    for (let x = plan.left + 1; x < plan.right; x += 3) {
      const grab = grabAt(SCENE, x, plan.middleY)
      if (grab !== null) seen.push(grab)
    }
    expect(seen, T_268_TOP_FIRST).not.toContain('GA-19')
  })
})

describe('TY-8 / TY-9 -- the milestone plan and the body answer last', () => {
  it('gives the centre of a started milestone to the actual, not to the plan', () => {
    const actual = boxOf(actualOf(MILESTONE.started))
    expect(grabAt(MILESTONE, actual.middleX, actual.middleY), T_268_TOP_FIRST).toBe('GA-16')
  })

  it('gives a plain pixel of a plan bar to the body, nothing else being there', () => {
    const plan = boxOf((SCENE.started as unknown as { plan: unknown }).plan)
    expect(grabAt(SCENE, plan.left + plan.width * 0.75, plan.middleY), T_268_TOP_FIRST).toBe('GA-9')
  })
})
