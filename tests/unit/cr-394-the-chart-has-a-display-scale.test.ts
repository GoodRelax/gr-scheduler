// The chart's display scale: its steps, its drawn ratio, and the dimensions that ratio multiplies.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dateAtX,
  layoutFromSchedule,
  rulerTierOf,
  taskPlacement,
  zoomYAtRectangleLabelFont,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { rowTitleFontPxOf } from '../../src/adapter/screen-renderer/screen-renderer'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_039_STATEMENT =
  '**STATEMENT**: 読む人が文字サイズ・明暗テーマ・表示の倍率のいずれかを変えたとき、`GRS` は、その指定で描くこと。'

const FR_039_THE_RATIO =
  '描く比は、`S-234` を 100 で割り、同書の 表 T-206 の `S-236` を掛けた値とすること（MUST） —— 倍率 100 で 2026-09-16 の出荷ビルドの 2/3、既定の 50 でその 1/3 の大きさに立つ。'

const FR_039_WHAT_IT_MULTIPLIES = '描く比を掛ける寸法は 表 T-252 に従うこと（MUST）'

const FR_039_NEVER_REWRITES_THE_STORED_VALUE =
  '⛔ 保存する値（表 T-252 が名指す行と、同書の 表 T-203 の `S-76`）を描く比で書き換えてはならない（MUST NOT） —— 描くときに 1 度だけ掛ける。'

const FR_039_NEVER_TWICE =
  '⛔ 導く元と導いた値の両方に描く比を掛けてはならない（MUST NOT）'

const FR_039_THE_ENTRANCES =
  '⭐ 表示の倍率を 1 段ずつ縮める入口と拡げる入口を、`App Header` の明暗テーマの入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-16`）の左に、縮める入口を左にして置くこと（MUST）。'

const FR_039_NO_WRAP_AT_EITHER_END =
  '段の並びは `S-234` の型の欄の順とし、両端で巡らせてはならない（MUST NOT）'

const T_252_DRAG_STORES_THE_UNDIVIDED_WIDTH =
  '⭐ 人が境界のドラッグ（`FR-052`）で行見出しパネルの幅を決めたとき、保存する `S-79` は、描いた幅を描く比で割った値とすること（MUST）'

const T_252_THE_DRAWN_PANEL_HAS_A_FLOOR =
  '⭐ 描く行見出しパネルの幅は、`S-79` に描く比を掛けた値と、次の床の大きい方とすること（MUST）'

const T_252_THE_MIDDLE_IS_THE_ANCHOR =
  '⭐ 表示の倍率を変えたとき、`Row Area` の横の中点が指す日付と、縦の中点が指す行を動かさないこと（MUST）'

const T_252_ASK_PI_5_FOR_THE_ROW =
  '⭐ その倍率での行の位置は `FR-016` と同じく 表 T-064 の `PI-5` の `rowPlacesAtZoomY` に問い、倍率から算で求めてはならない（MUST NOT）。'

const FR_077_THE_FLOOR_IS_MULTIPLIED =
  '⭐ 可読の下限は、`_assets/tbl-settings.md` の 表 T-201 の `S-8` に、`FR-039` の表示の倍率の描く比を掛けた値とすること（MUST）'

const FR_016_BOTH_FONTS_ARE_MULTIPLIED =
  '⭐ 比べる 2 つの字は、どちらも `FR-039` の表示の倍率の描く比を掛けたあとの字とすること（MUST）'

const FR_016_THE_DAY_WIDTH_IS_MULTIPLIED =
  '⚠️ ここでいう等倍のときの 1 日の幅は、`FR-039` の表示の倍率の描く比を掛けたあとの `S-1` である'

const FR_017_THE_DAY_WIDTH_IS_MULTIPLIED =
  '⚠️ ここでいう `S-1` は、`FR-039` の表示の倍率の描く比を掛けたあとの値である（表 T-252 の `DS-4`）。'

const FR_017_THE_TIER_DOES_NOT_MOVE =
  '⭐ 2 つに同じ比が掛かるので、判定式の左辺は表示の倍率に依らず、目盛の段階は表示の倍率を変えても動かない。'

const FR_080_THE_EXPORT_FOLLOWS_THE_SCALE =
  '表示の切り替え・表示の倍率（`FR-039` の `S-234`）・ズームの段階・LOD による増減の結果を、書き出しでも同じにすること。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-039 STATEMENT -- the display scale is one of the three a reader changes', FR_039_STATEMENT],
  ['FR-039 (MUST) -- the drawn ratio is S-234 / 100 x S-236', FR_039_THE_RATIO],
  ['FR-039 (MUST) -- what the ratio multiplies is table T-252', FR_039_WHAT_IT_MULTIPLIES],
  ['FR-039 (MUST NOT) -- a stored value is never rewritten by the ratio', FR_039_NEVER_REWRITES_THE_STORED_VALUE],
  ['FR-039 (MUST NOT) -- never multiplied into both a source and what it derives', FR_039_NEVER_TWICE],
  ['FR-039 (MUST) -- the two entrances stand left of IC-16, the shrinking one on the left', FR_039_THE_ENTRANCES],
  ['FR-039 (MUST NOT) -- the steps do not wrap at either end', FR_039_NO_WRAP_AT_EITHER_END],
  ['T-252 (MUST) -- a dragged panel width is stored as the drawn width divided by the ratio', T_252_DRAG_STORES_THE_UNDIVIDED_WIDTH],
  ['T-252 (MUST) -- the drawn panel width has a floor', T_252_THE_DRAWN_PANEL_HAS_A_FLOOR],
  ['T-252 (MUST) -- the Row Area middle is the anchor when the scale changes', T_252_THE_MIDDLE_IS_THE_ANCHOR],
  ['T-252 (MUST NOT) -- the row is asked of rowPlacesAtZoomY, never computed from the scale', T_252_ASK_PI_5_FOR_THE_ROW],
  ['FR-077 (MUST) -- the readable floor is S-8 times the drawn ratio', FR_077_THE_FLOOR_IS_MULTIPLIED],
  ['FR-016 (MUST) -- both fonts of the row-axis ceiling are multiplied', FR_016_BOTH_FONTS_ARE_MULTIPLIED],
  ['FR-016 -- the day width of the zoomX ceiling is multiplied', FR_016_THE_DAY_WIDTH_IS_MULTIPLIED],
  ['FR-017 -- the day width the tier is decided from is multiplied', FR_017_THE_DAY_WIDTH_IS_MULTIPLIED],
  ['FR-017 -- so the tier does not move with the display scale', FR_017_THE_TIER_DOES_NOT_MOVE],
  ['FR-080 -- the export draws at the same display scale', FR_080_THE_EXPORT_FOLLOWS_THE_SCALE],
]

describe('CR-394 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// see T-202, S-234
const S_234_STEPS: readonly number[] = bareAll(rowOf('T-202', 'S-234').by['型'] ?? '').map(Number)

const S_234_DEFAULT = Number(bare(rowOf('T-202', 'S-234').by['既定'] ?? ''))

// see T-206, S-236
const S_236 = Number(bare(rowOf('T-206', 'S-236').by['既定'] ?? ''))

// see FR-039
const ratioOf = (displayScale: number): number => (displayScale / 100) * S_236

const num = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

const S_1 = num('pxPerDayAt1x')
const S_8 = num('fontMin')
const S_37 = num('rowTitleIndent')
const S_56 = num('canvasPadding')
const S_79 = num('rowTitlePanelWidth')

const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const held = built[head]
    const group = (typeof held === 'object' && held !== null ? held : {}) as Record<string, unknown>
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...nestedFrom(SETTINGS_DEFAULTS),
    rulerHeight: 48,
    rulerFont: 12,
    scrollDate: '2026-01-01',
    stackDirection: 'down',
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1400,
  height: 900,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const spanning = (uid: number, from: string, days: number, part: Record<string, unknown> = {}): Task => {
  const finish = new Date(new Date(`${from}T00:00:00Z`).getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

const rowsOf = (rows: readonly (readonly Task[])[]): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks: rows.flat(),
    taskGroups: rows.map((_tasks, index) => ({
      id: `g${index + 1}`,
      parentId: null,
      order: index,
      height: null,
    })),
    taskGroupMembers: rows.flatMap((tasks, index) =>
      tasks.map((task) => ({ groupId: `g${index + 1}`, taskUid: task.uid })),
    ),
    taskVisuals: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const NAMED_ROWS = rowsOf([
  [spanning(1, '2026-01-05', 20, { name: 'alpha', percentComplete: 40 })],
  [spanning(2, '2026-02-05', 20, { name: 'beta', percentComplete: 10 })],
])

interface Scene {
  readonly settings: DocumentSettings
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
}

const sceneAt = (displayScale: number, part: Record<string, unknown> = {}): Scene => {
  const settings = settingsOf({ displayScale, ...part })
  const regions = regionsFromScreen(ENV, settings)
  return { settings, regions, layout: layoutFromSchedule(NAMED_ROWS, settings, regions) }
}

describe('S-234 displayScale -- the steps and the default (table T-202)', () => {
  it('spells exactly the six steps the user named, in the table\'s own order', () => {
    expect(S_234_STEPS).toEqual([33, 50, 66, 75, 85, 100])
  })

  it('defaults to 50, and the generated defaults carry that same value', () => {
    expect(S_234_DEFAULT).toBe(50)
    expect(SETTINGS_DEFAULTS['displayScale']).toBe(S_234_DEFAULT)
  })

  it('is a document setting: the GRS JSON schema holds it in documentSettings, with the six steps as its enum', () => {
    const schema = JSON.parse(
      readFileSync(
        join(process.cwd(), 'docs', 'spec', '_source', 'grs-document.schema.json'),
        'utf8',
      ),
    ) as {
      readonly properties: Record<string, { readonly properties?: Record<string, unknown> }>
    }
    const settings = schema.properties['documentSettings']?.properties ?? {}
    const held = settings['displayScale'] as { readonly enum?: readonly number[] } | undefined
    expect(held, 'FR-039: the display scale is saved in the document').toBeDefined()
    expect(held?.enum, 'the schema admits exactly the steps table T-202 spells').toEqual([
      ...S_234_STEPS,
    ])
  })

  it('is NOT written to MSPDI -- no custom field names it (the display group has none)', () => {
    const custom = readFileSync(
      join(process.cwd(), 'docs', 'spec', '_source', 'mspdi-custom-fields.json'),
      'utf8',
    )
    expect(custom).not.toContain('displayScale')
  })
})

describe('FR-039 (MUST) -- the drawn ratio is S-234 / 100 x S-236', () => {
  it('S-236 is the two thirds the user named, and stands in table T-206', () => {
    expect(S_236).toBeCloseTo(0.6667, 10)
    expect(rowOf('T-206', 'S-236').by['値'], 'S-236 is the ratio AT display scale 100').toContain(
      '表示の倍率が 100 のときの描く比',
    )
  })

  it('puts the default at a third of the shipped build and the top step at two thirds', () => {
    expect(ratioOf(100), FR_039_THE_RATIO).toBeCloseTo(S_236, 10)
    expect(ratioOf(S_234_DEFAULT), FR_039_THE_RATIO).toBeCloseTo(S_236 / 2, 10)
  })

  it('rises with every step and never repeats a ratio', () => {
    const ratios = S_234_STEPS.map(ratioOf)
    expect(new Set(ratios).size).toBe(S_234_STEPS.length)
    for (let at = 1; at < ratios.length; at += 1) {
      expect(ratios[at]!, `step ${S_234_STEPS[at]}`).toBeGreaterThan(ratios[at - 1]!)
    }
  })
})

describe('table T-252 -- the rows that say what the display scale reaches', () => {
  const T_252 = specTable('T-252')

  it('holds DS-1 .. DS-9 and nothing else', () => {
    expect(T_252.rows.map((row) => row.id)).toEqual([
      'DS-1',
      'DS-2',
      'DS-3',
      'DS-4',
      'DS-5',
      'DS-6',
      'DS-7',
      'DS-8',
      'DS-9',
    ])
  })

  it('multiplies DS-1 .. DS-4 and DS-9, and does not multiply DS-5 .. DS-7', () => {
    const answerOf = (id: string): string => bare(rowOf('T-252', id).by['掛けるか'] ?? '')
    for (const id of ['DS-1', 'DS-2', 'DS-3', 'DS-4', 'DS-9']) {
      expect(answerOf(id), `${id} is multiplied`).toBe('掛ける')
    }
    for (const id of ['DS-5', 'DS-6', 'DS-7']) {
      expect(answerOf(id), `${id} is NOT multiplied`).toBe('掛けない')
    }
    expect(answerOf('DS-8'), 'the row axis zoom is laid over it, not replaced by it').toBe(
      '掛け算で重ねる',
    )
  })

  it('DS-1 reaches every px row of table T-201 except the zoom group, which DS-5 takes', () => {
    const pxRows = specTable('T-201').rows.filter((row) => bare(row.by['単位'] ?? '') === 'px')
    const groupsOutsideZoom = new Set(
      pxRows.map((row) => bare(row.by['群'] ?? '')).filter((group) => group !== 'ズーム'),
    )
    const ds1 = rowOf('T-252', 'DS-1').by['何に'] ?? ''
    for (const group of groupsOutsideZoom) {
      expect(ds1, `DS-1 names the ${group} group of table T-201`).toContain(group)
    }
    expect(bare(rowOf('T-201', 'S-56').by['群'] ?? ''), 'canvasPadding is the zoom group').toBe(
      'ズーム',
    )
    expect(rowOf('T-252', 'DS-5').by['何に'] ?? '').toContain('S-56')
  })

  it('DS-7 keeps the grips and the entrance boxes out of the scale', () => {
    const ds7 = rowOf('T-252', 'DS-7').by['何に'] ?? ''
    for (const id of ['S-90', 'S-91', 'S-92', 'S-137', 'S-180', 'S-230', 'S-138']) {
      expect(ds7, `DS-7 names ${id}`).toContain(id)
    }
  })
})

describe('FR-039 (MUST) -- every dimension table T-252 multiplies moves with the ratio', () => {
  const HIGH_ENOUGH_TO_CLEAR_EVERY_FLOOR = 20

  it('the day width is S-1 x zoomX x the drawn ratio (DS-4)', () => {
    for (const step of S_234_STEPS) {
      const { layout } = sceneAt(step, { zoomX: 2 })
      expect(layout.pxPerDay, `${FR_016_THE_DAY_WIDTH_IS_MULTIPLIED} -- step ${step}`).toBeCloseTo(
        S_1 * 2 * ratioOf(step),
        6,
      )
    }
  })

  it('the row band, the name font and the row-title font are all proportional to the ratio (DS-1, DS-8)', () => {
    const zoomY = HIGH_ENOUGH_TO_CLEAR_EVERY_FLOOR
    const low = sceneAt(33, { zoomY })
    const high = sceneAt(100, { zoomY })
    const factor = ratioOf(100) / ratioOf(33)

    expect(high.layout.rows[0]!.height / low.layout.rows[0]!.height, 'the band').toBeCloseTo(
      factor,
      6,
    )
    expect(
      taskPlacement(high.layout, 1)!.labelFontSize / taskPlacement(low.layout, 1)!.labelFontSize,
      'the task name font',
    ).toBeCloseTo(factor, 6)
    expect(
      rowTitleFontPxOf(1, high.settings) / rowTitleFontPxOf(1, low.settings),
      'the depth-1 row name font',
    ).toBeCloseTo(factor, 6)
  })

  it('the row-title panel and its indent are drawn multiplied, and the stored numbers are not (DS-9, DS-1)', () => {
    const wide = settingsOf({ displayScale: 100, rowTitlePanelWidth: 600 })
    const narrow = settingsOf({ displayScale: 50, rowTitlePanelWidth: 600 })
    const drawnWide = regionsFromScreen(ENV, wide).rowTitlePanel.width
    const drawnNarrow = regionsFromScreen(ENV, narrow).rowTitlePanel.width

    expect(drawnWide, 'the drawn panel is S-79 x the ratio').toBeCloseTo(600 * ratioOf(100), 6)
    expect(drawnNarrow, 'the drawn panel is S-79 x the ratio').toBeCloseTo(600 * ratioOf(50), 6)
    expect(wide.rowTitlePanelWidth, FR_039_NEVER_REWRITES_THE_STORED_VALUE).toBe(600)
    expect(narrow.rowTitlePanelWidth, FR_039_NEVER_REWRITES_THE_STORED_VALUE).toBe(600)
  })

  it('canvasPadding is NOT multiplied, so the Row Area gives up the same strip at every step (DS-5)', () => {
    const at = (step: number): { readonly width: number; readonly panel: number } => {
      const regions = regionsFromScreen(ENV, settingsOf({ displayScale: step }))
      return { width: regions.rowArea.width, panel: regions.rowTitlePanel.width }
    }
    const low = at(33)
    const high = at(100)
    expect(
      low.width + low.panel,
      'canvas width less padding, the properties panel and the bar -- none of them scaled',
    ).toBeCloseTo(high.width + high.panel, 6)
    expect(SETTINGS_DEFAULTS['canvasPadding'], 'and the stored padding never moves').toBe(S_56)
  })
})

describe('FR-039 (MUST NOT) -- drawing never writes back', () => {
  it('leaves every stored setting untouched after a layout, a geometry and an export at each step', () => {
    for (const step of S_234_STEPS) {
      const settings = settingsOf({ displayScale: step })
      const before = structuredClone(settings)
      const regions = regionsFromScreen(ENV, settings)
      const layout = layoutFromSchedule(NAMED_ROWS, settings, regions)
      const geometry = geometryFromLayout(NAMED_ROWS, settings, layout, regions, emptySelection())
      svgFromSchedule(
        NAMED_ROWS,
        settings,
        layout,
        geometry,
        regions,
        emptySelection(),
        'screen',
      )
      expect(settings, `${FR_039_NEVER_REWRITES_THE_STORED_VALUE} -- step ${step}`).toEqual(before)
    }
  })

  it('returns the very same drawing when the scale is stepped away and back (MUST NOT)', () => {
    const first = sceneAt(50)
    const away = sceneAt(100)
    const back = sceneAt(50)
    expect(away.layout.pxPerDay).not.toBeCloseTo(first.layout.pxPerDay, 6)
    expect(back.layout.pxPerDay, FR_039_NEVER_REWRITES_THE_STORED_VALUE).toBeCloseTo(
      first.layout.pxPerDay,
      10,
    )
    expect(back.layout.rows.map((row) => row.height)).toEqual(
      first.layout.rows.map((row) => row.height),
    )
  })
})

describe('T-252 (MUST) -- the panel width a drag stores is the drawn width divided by the ratio', () => {
  it('round-trips: storing drawn / ratio draws that very width again', () => {
    for (const step of S_234_STEPS) {
      const ratio = ratioOf(step)
      const drawnWanted = 420
      const stored = drawnWanted / ratio
      const regions = regionsFromScreen(
        ENV,
        settingsOf({ displayScale: step, rowTitlePanelWidth: stored }),
      )
      expect(
        regions.rowTitlePanel.width,
        `${T_252_DRAG_STORES_THE_UNDIVIDED_WIDTH} -- step ${step}`,
      ).toBeCloseTo(drawnWanted, 6)
    }
  })

  it('holds the drawn panel at a floor no smaller than the depth-5 grips and the four row controls', () => {
    const S_125 = num('maxGroupDepth')
    const S_235 = Number(bare(rowOf('T-206', 'S-235').by['既定'] ?? ''))
    const S_138 = Number(/(-?\d+(?:\.\d+)?)/.exec(bare(rowOf('T-206', 'S-138').by['既定'] ?? ''))?.[1])
    for (const step of S_234_STEPS) {
      const ratio = ratioOf(step)
      const floor = S_37 * ratio * S_125 + S_138 * S_235 + 26 * S_235 * 4
      const drawn = regionsFromScreen(
        ENV,
        settingsOf({ displayScale: step, rowTitlePanelWidth: S_79 }),
      ).rowTitlePanel.width
      expect(drawn, `${T_252_THE_DRAWN_PANEL_HAS_A_FLOOR} -- step ${step}`).toBeCloseTo(
        Math.max(S_79 * ratio, floor),
        6,
      )
    }
  })
})

describe('FR-077 (MUST) -- the readable floor is S-8 times the drawn ratio', () => {
  it('lets the name font fall to S-8 x the ratio and no further, at every step', () => {
    for (const step of S_234_STEPS) {
      const { layout } = sceneAt(step, { zoomY: 0.05 })
      expect(
        taskPlacement(layout, 1)!.labelFontSize,
        `${FR_077_THE_FLOOR_IS_MULTIPLIED} -- step ${step}`,
      ).toBeCloseTo(S_8 * ratioOf(step), 6)
    }
  })

  it('puts the default document\'s floor at a third of the shipped build\'s 12px', () => {
    const { layout } = sceneAt(S_234_DEFAULT, { zoomY: 0.05 })
    expect(taskPlacement(layout, 1)!.labelFontSize, FR_077_THE_FLOOR_IS_MULTIPLIED).toBeCloseTo(
      S_8 * ratioOf(50),
      6,
    )
  })
})

describe('FR-016 (MUST) -- the row-axis ceiling does not move with the display scale', () => {
  it('solves to the same zoomY at every step, because both fonts carry the same ratio', () => {
    const ceilingAt = (step: number): number => {
      const settings = settingsOf({ displayScale: step })
      return zoomYAtRectangleLabelFont(rowTitleFontPxOf(1, settings), settings)
    }
    const first = ceilingAt(S_234_STEPS[0]!)
    for (const step of S_234_STEPS) {
      expect(ceilingAt(step), `${FR_016_BOTH_FONTS_ARE_MULTIPLIED} -- step ${step}`).toBeCloseTo(
        first,
        6,
      )
    }
  })
})

describe('FR-017 -- the ruler tier does not move with the display scale', () => {
  it('answers the same tier at every step, for the same zoomX', () => {
    for (const zoomX of [0.25, 1, 4]) {
      const tiers = S_234_STEPS.map((step) => {
        const { layout, settings } = sceneAt(step, { zoomX })
        return rulerTierOf(layout.pxPerDay, settings)
      })
      expect(new Set(tiers).size, `${FR_017_THE_TIER_DOES_NOT_MOVE} -- zoomX ${zoomX}`).toBe(1)
    }
  })
})

describe('FR-080 -- the export draws at the same display scale as the screen', () => {
  const pictureAt = (step: number, picture: 'screen' | 'export'): string => {
    const { settings, regions, layout } = sceneAt(step, { zoomY: 20 })
    const geometry = geometryFromLayout(NAMED_ROWS, settings, layout, regions, emptySelection())
    return svgFromSchedule(
      NAMED_ROWS,
      settings,
      layout,
      geometry,
      regions,
      emptySelection(),
      picture,
    )
  }

  it('draws a different picture at a different step', () => {
    expect(pictureAt(33, 'export'), FR_080_THE_EXPORT_FOLLOWS_THE_SCALE).not.toBe(
      pictureAt(100, 'export'),
    )
  })

  it('carries the step into the exported picture, not only into the screen', () => {
    const fontOf = (svg: string): number => {
      const found = /data-figure="task-1-label"/.exec(svg)
      if (found === null) throw new Error('the name label was not drawn')
      const opened = svg.lastIndexOf('<text ', found.index)
      const size = /font-size="([\d.]+)"/.exec(svg.slice(opened, found.index))
      if (size === null) throw new Error('the name label states no font-size')
      return Number(size[1])
    }
    const ratioOnScreen = fontOf(pictureAt(100, 'screen')) / fontOf(pictureAt(33, 'screen'))
    const ratioOnExport = fontOf(pictureAt(100, 'export')) / fontOf(pictureAt(33, 'export'))
    expect(ratioOnExport, FR_080_THE_EXPORT_FOLLOWS_THE_SCALE).toBeCloseTo(ratioOnScreen, 6)
    expect(
      ratioOnScreen,
      'and that ratio is the two steps\' drawn ratios -- read at a zoom where the font is far above the S-8 floor, and to the two decimals the picture writes a length with',
    ).toBeCloseTo(ratioOf(100) / ratioOf(33), 3)
  })
})

describe('T-252 (MUST) -- the Row Area middle is what stands still when the scale changes', () => {
  it('keeps the date under the horizontal middle of the Row Area', () => {
    const middleDateAt = (scene: Scene): string | null => {
      const middle = scene.regions.rowArea.x + scene.regions.rowArea.width / 2
      const day = dateAtX(scene.layout, middle)
      return day === null ? null : JSON.stringify(day)
    }
    const before = sceneAt(50)
    const wanted = middleDateAt(before)
    expect(wanted, 'premise: a date stands under the middle before the scale moves').not.toBeNull()

    for (const step of S_234_STEPS) {
      const after = sceneAt(step)
      expect(middleDateAt(after), `${T_252_THE_MIDDLE_IS_THE_ANCHOR} -- step ${step}`).toBe(wanted)
    }
  })
})
