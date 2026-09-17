// The chart's display scale: its steps, its drawn ratio, and the dimensions that ratio multiplies.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
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
  regionsAtDisplayScale,
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { rowTitleFontPxOf } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  commandFromInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_039_STATEMENT =
  '**STATEMENT**: 読む人が文字サイズ・明暗テーマ・表示の倍率のいずれかを変えたとき、`GRS` は、その指定で描くこと。'

const FR_039_THE_RATIO =
  '描く比は、`S-234` を 100 で割り、同書の 表 T-206 の `S-236` を掛けた値とすること（MUST） —— 既定の 100 で 2026-09-16 の出荷ビルドの 5/8（100 ÷ 100 × 0.625）、200 で出荷ビルドの 5/4（200 ÷ 100 × 0.625 ＝ 1.25）に立つ。'

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
  '⭐ 人が境界のドラッグ（`FR-052`）で行見出しパネルの幅を決めたとき、保存する `S-79` は、離した時点で描いた幅が本段の床より広ければ、描いた幅を描く比で割った値とし、床と等しければ（`FR-052` が床で止めて描いているときを含む）、いま保存している `S-79` と、床を描く比で割った値の小さい方とすること（MUST）'

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
  ['T-252 (MUST) -- a dragged panel width is stored as the drawn width divided by the ratio above the floor, and at the floor as the smaller of the stored width and the floor divided by the ratio', T_252_DRAG_STORES_THE_UNDIVIDED_WIDTH],
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

const LOWEST_STEP = S_234_STEPS[0] as number

const HIGHEST_STEP = S_234_STEPS[S_234_STEPS.length - 1] as number

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
const S_6 = num('actualMin')
const S_7 = num('fontOfActual')
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
  it('spells the steps in rising order, with the default among them', () => {
    expect(S_234_STEPS.length).toBeGreaterThan(1)
    expect([...S_234_STEPS].sort((a, b) => a - b)).toEqual([...S_234_STEPS])
    expect(S_234_STEPS).toContain(S_234_DEFAULT)
  })

  it('generates the default the table prints', () => {
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
  it('S-236 is a ratio above 0 and no larger than 1, and stands in table T-206', () => {
    expect(S_236).toBeGreaterThan(0)
    expect(S_236).toBeLessThanOrEqual(1)
    expect(rowOf('T-206', 'S-236').by['値'], 'S-236 is the ratio AT display scale 100').toContain(
      '表示の倍率が 100 のときの描く比',
    )
  })

  it('puts step 100 at S-236 and the top step at S-236 x top / 100', () => {
    const top = S_234_STEPS[S_234_STEPS.length - 1] as number
    expect(ratioOf(100), FR_039_THE_RATIO).toBeCloseTo(S_236, 10)
    expect(ratioOf(top), FR_039_THE_RATIO).toBeCloseTo((S_236 * top) / 100, 10)
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

  it('holds DS-1 .. DS-10 and nothing else', () => {
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
      'DS-10',
    ])
  })

  it('multiplies DS-1 .. DS-4 and DS-9, and does not multiply DS-5 .. DS-7 or DS-10', () => {
    const answerOf = (id: string): string => bare(rowOf('T-252', id).by['掛けるか'] ?? '')
    for (const id of ['DS-1', 'DS-2', 'DS-3', 'DS-4', 'DS-9']) {
      expect(answerOf(id), `${id} is multiplied`).toBe('掛ける')
    }
    for (const id of ['DS-5', 'DS-6', 'DS-7', 'DS-10']) {
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
    const low = sceneAt(LOWEST_STEP, { zoomY })
    const high = sceneAt(HIGHEST_STEP, { zoomY })
    const factor = ratioOf(HIGHEST_STEP) / ratioOf(LOWEST_STEP)

    // STEP: DS-10 keeps S-11 out of the ratio, so the band less its two S-11 (one lane, VG-2) is what scales.
    const unscaledOf = (scene: Scene): number => scene.settings.stackGap * 2
    expect(
      (high.layout.rows[0]!.height - unscaledOf(high)) / (low.layout.rows[0]!.height - unscaledOf(low)),
      'the band',
    ).toBeCloseTo(factor, 6)
    expect(high.layout.rows[0]!.height / low.layout.rows[0]!.height, 'DS-10: the whole band is not').not.toBeCloseTo(factor, 6)
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

  it('draws the S-79 default table T-203 prints, 300, at 300 x 0.625 = 187.5px at the default step (CR-418)', () => {
    const printed = Number(/\d+(?:\.\d+)?/.exec(bare(rowOf('T-203', 'S-79').by['既定'] ?? '').replace(/`/g, ''))?.[0])
    expect(printed, 'CR-418: S-79 is 200 x 1.5').toBe(300)
    expect(S_79, 'the generated default is the printed one').toBe(printed)
    const drawn = regionsFromScreen(ENV, settingsOf({ displayScale: S_234_DEFAULT })).rowTitlePanel.width
    expect(drawn, T_252_THE_DRAWN_PANEL_HAS_A_FLOOR).toBeCloseTo(printed * ratioOf(S_234_DEFAULT), 6)
    expect(drawn, 'CR-418 section 7: 300 x 0.625').toBeCloseTo(187.5, 6)
  })

  it('canvasPadding is NOT multiplied, so the Row Area gives up the same strip at every step (DS-5)', () => {
    const at = (step: number): { readonly width: number; readonly panel: number } => {
      const regions = regionsFromScreen(ENV, settingsOf({ displayScale: step }))
      return { width: regions.rowArea.width, panel: regions.rowTitlePanel.width }
    }
    const low = at(LOWEST_STEP)
    const high = at(HIGHEST_STEP)
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

describe('T-252 (MUST) -- above the floor, the panel width a drag stores is the drawn width divided by the ratio', () => {
  it('round-trips: storing drawn / ratio draws that very width again, for a drawn width above every step\'s floor', () => {
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
    const pxIn = (id: string): number =>
      Number(/(-?\d+(?:\.\d+)?)/.exec(bare(rowOf('T-206', id).by['既定'] ?? ''))?.[1])
    const S_138 = pxIn('S-138')
    const PANEL_ENTRANCE_OUTER_WIDTH = S_138 + (pxIn('S-243') + pxIn('S-237')) * 2
    // WHY: at S-79 300 and S-236 0.625 the default panel clears the floor at every step (CR-418), so the width the
    // S-79 note says depth 5 needs before the ratio, 16d+16 plus four outer widths, is swept as well.
    const DEPTH_5_NEEDS = S_37 * (S_125 + 1) + PANEL_ENTRANCE_OUTER_WIDTH * 4
    const reached = new Set<string>()
    for (const stored of [S_79, DEPTH_5_NEEDS]) {
      for (const step of S_234_STEPS) {
        const ratio = ratioOf(step)
        const floor = S_37 * ratio * S_125 + S_138 * S_235 + PANEL_ENTRANCE_OUTER_WIDTH * S_235 * 4
        const drawn = regionsFromScreen(
          ENV,
          settingsOf({ displayScale: step, rowTitlePanelWidth: stored }),
        ).rowTitlePanel.width
        expect(drawn, `${T_252_THE_DRAWN_PANEL_HAS_A_FLOOR} -- S-79 ${stored}, step ${step}`).toBeCloseTo(
          Math.max(stored * ratio, floor),
          6,
        )
        reached.add(stored * ratio < floor ? 'the floor' : 'the stored width')
      }
    }
    expect([...reached].sort(), 'premise: the sweep draws the floor at some step and the stored width at another').toEqual([
      'the floor',
      'the stored width',
    ])
  })
})

describe('FR-077 (MUST) -- the readable floor is S-8 times the drawn ratio', () => {
  // WHY: at zoomY 0.05 the actual strip already stands on its S-6 floor, so the font is
  // max(S-6 x S-7, S-8) x ratio (T-201, DS-1); S-8 alone binds only with S-6 on its S-8 / S-7 bound.
  const chainFloorAt = (step: number, actualMin: number): number =>
    Math.max(actualMin * S_7, S_8) * ratioOf(step)

  it('lets the name font fall to the chain floor x the ratio and no further, never under S-8 x the ratio, at every step', () => {
    for (const step of S_234_STEPS) {
      const { layout } = sceneAt(step, { zoomY: 0.05 })
      const font = taskPlacement(layout, 1)!.labelFontSize
      expect(font, `${FR_077_THE_FLOOR_IS_MULTIPLIED} -- step ${step}`).toBeCloseTo(
        chainFloorAt(step, S_6),
        6,
      )
      expect(font, `${FR_077_THE_FLOOR_IS_MULTIPLIED} -- step ${step}`).toBeGreaterThanOrEqual(
        S_8 * ratioOf(step) - 1e-9,
      )
    }
  })

  it('puts the floor at S-8 x the ratio where S-6 sits on its S-8 / S-7 bound, at every step', () => {
    const actualMinOnItsBound = S_8 / S_7
    expect(chainFloorAt(S_234_DEFAULT, actualMinOnItsBound)).toBeCloseTo(S_8 * ratioOf(S_234_DEFAULT), 9)
    expect(S_8 * ratioOf(S_234_DEFAULT), 'CR-417 section 7: the floor at the default step is 12 x 0.625').toBeCloseTo(7.5, 9)
    for (const step of S_234_STEPS) {
      const { layout } = sceneAt(step, { zoomY: 0.05, actualMin: actualMinOnItsBound })
      expect(
        taskPlacement(layout, 1)!.labelFontSize,
        `${FR_077_THE_FLOOR_IS_MULTIPLIED} -- step ${step}`,
      ).toBeCloseTo(S_8 * ratioOf(step), 6)
    }
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
    expect(pictureAt(LOWEST_STEP, 'export'), FR_080_THE_EXPORT_FOLLOWS_THE_SCALE).not.toBe(
      pictureAt(HIGHEST_STEP, 'export'),
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
    const ratioOnScreen = fontOf(pictureAt(HIGHEST_STEP, 'screen')) / fontOf(pictureAt(LOWEST_STEP, 'screen'))
    const ratioOnExport = fontOf(pictureAt(HIGHEST_STEP, 'export')) / fontOf(pictureAt(LOWEST_STEP, 'export'))
    expect(ratioOnExport, FR_080_THE_EXPORT_FOLLOWS_THE_SCALE).toBeCloseTo(ratioOnScreen, 6)
    expect(
      ratioOnScreen,
      'and that ratio is the two steps\' drawn ratios -- read at a zoom where the font is far above the S-8 floor, and to the two decimals the picture writes a length with',
    ).toBeCloseTo(ratioOf(HIGHEST_STEP) / ratioOf(LOWEST_STEP), 3)
  })
})

// see IC-104, IC-105
const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

// see FR-039
const pointerPhase = (phase: 'down' | 'up'): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: 0,
  y: 0,
  modifiers: NO_MODS,
  clickCount: 1,
})

// see IC-104, IC-105
const pressOnEntrance = (entry: string): PointerPress => ({
  at: pointerPhase('down'),
  hit: null,
  on: {
    part: 'App Header',
    entry,
    format: null,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  },
  pressRow: 'PTD-5',
})

// see FR-039, CM-74
const scaleWritesOf = (
  settings: DocumentSettings,
  entry: string,
  schedule: Schedule = NAMED_ROWS,
): readonly DocumentCommand[] => {
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const context = {
    document: { schemaVersion: '1', schedule, documentSettings: settings },
    layout,
    geometry: geometryFromLayout(schedule, settings, layout, regions, emptySelection()),
    regions,
    screenState: emptyScreenState(),
    selection: emptySelection(),
    zoomStep: 3,
    pressed: pressOnEntrance(entry),
    isTextEntryUnsettled: false,
    isSurfaceStanding: true,
    isPictureAtStoredZoom: true,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-minted-outside',
    newHighlightBoxId: 'highlight-minted-outside',
  } as unknown as InputContext

  const answer = commandFromInput(pointerPhase('up'), context)
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') {
    throw new Error(`${entry} owes a changeDocument and this press did not ask for one`)
  }
  return (action.writes as readonly (readonly DocumentCommand[])[]).flat()
}

// see FR-039, CM-74
const afterPressing = (
  settings: DocumentSettings,
  entry: string,
  schedule: Schedule = NAMED_ROWS,
): DocumentSettings => {
  let next: Record<string, unknown> = { ...(settings as unknown as Record<string, unknown>) }
  for (const write of scaleWritesOf(settings, entry, schedule)) {
    const one = write as unknown as Record<string, unknown>
    if (one['kind'] === 'setDisplayScale') next = { ...next, displayScale: one['scale'] }
    if (one['kind'] === 'setScrollPosition') {
      next = {
        ...next,
        scrollDate: one['scrollDate'],
        scrollDayOffset: one['scrollDayOffset'],
        scrollGroupId: one['scrollGroupId'],
        scrollGroupOffset: one['scrollGroupOffset'],
      }
    }
  }
  return settingsOf(next)
}

describe('T-252 (MUST) -- the Row Area middle is what stands still when the scale changes', () => {
  it('keeps the date under the horizontal middle of the Row Area', () => {
    const middleDateOf = (settings: DocumentSettings): string | null => {
      const regions = regionsFromScreen(ENV, settings)
      const layout = layoutFromSchedule(NAMED_ROWS, settings, regions)
      const day = dateAtX(layout, regions.rowArea.x + regions.rowArea.width / 2)
      return day === null ? null : JSON.stringify(day)
    }

    const start = settingsOf({ displayScale: S_234_DEFAULT })
    const wanted = middleDateOf(start)
    expect(wanted, 'premise: a date stands under the middle before the scale moves').not.toBeNull()

    const lowest = S_234_STEPS[0] as number
    const highest = S_234_STEPS[S_234_STEPS.length - 1] as number
    const seen: number[] = [S_234_DEFAULT]

    let down = start
    while ((down['displayScale'] as number) > lowest) {
      down = afterPressing(down, 'IC-104')
      seen.push(down['displayScale'] as number)
      expect(
        middleDateOf(down),
        `${T_252_THE_MIDDLE_IS_THE_ANCHOR} -- IC-104 down to step ${down['displayScale']}`,
      ).toBe(wanted)
    }

    let up = start
    while ((up['displayScale'] as number) < highest) {
      up = afterPressing(up, 'IC-105')
      seen.push(up['displayScale'] as number)
      expect(
        middleDateOf(up),
        `${T_252_THE_MIDDLE_IS_THE_ANCHOR} -- IC-105 up to step ${up['displayScale']}`,
      ).toBe(wanted)
    }

    expect(
      [...seen].sort((a, b) => a - b),
      'the presses did not walk every step table T-202 spells, so this case asked less than it says',
    ).toEqual([...S_234_STEPS].sort((a, b) => a - b))
  })
})

// see FR-039
const TALL_ROW_COUNT = 40

// TRAP: the seat needs room on BOTH sides. Seated at the first row, a step down cannot hold the
// middle -- the view would have to stand above the top of the document, and no such place exists.
const SEATED_WITH_ROOM = { scrollGroupId: 'g15', scrollGroupOffset: 0 }

// see S-76
const TALL_ZOOM_Y = 6

// see FR-039, DS-1, DS-8
const TALL_ROWS = rowsOf(
  Array.from({ length: TALL_ROW_COUNT }, (_none, at) => [
    spanning(at + 1, `2026-01-${String((at % 20) + 1).padStart(2, '0')}`, 10, {
      name: `row ${at + 1}`,
    }),
  ]),
)

const tallSettings = (displayScale: number): DocumentSettings =>
  settingsOf({ displayScale, zoomY: TALL_ZOOM_Y, ...SEATED_WITH_ROOM })

// see FR-039
const middleRowOf = (settings: DocumentSettings) => {
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(TALL_ROWS, settings, regions)
  const rows = layout.rows.filter((row) => row.isPinned !== true)
  const middle = regions.rowArea.y + regions.rowArea.height / 2
  const at = rows.findIndex((row) => middle >= row.y && middle < row.y + row.height)
  const row = rows[at]
  if (row === undefined) throw new Error('no row stands under the vertical middle of the Row Area')
  return {
    groupId: row.groupId,
    into: (middle - row.y) / row.height,
    at,
    height: row.height,
    above: rows.filter((one) => one.y < regions.rowArea.y).length,
  }
}

describe('T-252 (MUST) -- the row under the vertical middle is what stands still', () => {
  it('stands on a document where that row is neither the first nor at a band the ratio leaves alone', () => {
    const seen = middleRowOf(tallSettings(S_234_DEFAULT))
    expect(seen.at, 'premise: rows stand before the one under the middle').toBeGreaterThan(0)
    expect(
      seen.above,
      'premise: rows stand above the Row Area, so the view has room to move either way',
    ).toBeGreaterThan(0)

    const low = middleRowOf(tallSettings(S_234_STEPS[0] as number)).height
    const high = middleRowOf(tallSettings(S_234_STEPS[S_234_STEPS.length - 1] as number)).height
    expect(
      high,
      'premise: the row band really moves with the drawn ratio, so holding the middle is not free',
    ).toBeGreaterThan(low * 2)
  })

  it('keeps that row, and the place inside it, under the middle at every step', () => {
    const start = tallSettings(S_234_DEFAULT)
    const wanted = middleRowOf(start)
    const lowest = S_234_STEPS[0] as number
    const highest = S_234_STEPS[S_234_STEPS.length - 1] as number
    const walked: number[] = [S_234_DEFAULT]

    let down = start
    while ((down['displayScale'] as number) > lowest) {
      down = afterPressing(down, 'IC-104', TALL_ROWS)
      walked.push(down['displayScale'] as number)
      const landed = middleRowOf(down)
      const step = `IC-104 down to step ${down['displayScale']}`
      expect(landed.groupId, `${T_252_THE_MIDDLE_IS_THE_ANCHOR} -- ${step}`).toBe(wanted.groupId)
      expect(landed.into, `${T_252_ASK_PI_5_FOR_THE_ROW} -- ${step}`).toBeCloseTo(wanted.into, 9)
    }

    let up = start
    while ((up['displayScale'] as number) < highest) {
      up = afterPressing(up, 'IC-105', TALL_ROWS)
      walked.push(up['displayScale'] as number)
      const landed = middleRowOf(up)
      const step = `IC-105 up to step ${up['displayScale']}`
      expect(landed.groupId, `${T_252_THE_MIDDLE_IS_THE_ANCHOR} -- ${step}`).toBe(wanted.groupId)
      expect(landed.into, `${T_252_ASK_PI_5_FOR_THE_ROW} -- ${step}`).toBeCloseTo(wanted.into, 9)
    }

    expect(
      [...walked].sort((a, b) => a - b),
      'the presses did not walk every step table T-202 spells, so this case asked less than it says',
    ).toEqual([...S_234_STEPS].sort((a, b) => a - b))
  })
})

describe('PI-35 -- ScreenRegions answers the rectangles a given display scale draws', () => {
  // TRAP: the seam is given the drawn regions, the settings behind them and a scale -- no screen.
  // The property panel's width comes from those regions, never from the settings beside them.
  const askedAt = (step: number) => {
    const settings = tallSettings(S_234_DEFAULT)
    return regionsAtDisplayScale(
      regionsFromScreen(ENV, settings),
      settings,
      step as DocumentSettings['displayScale'],
    )
  }

  it('answers what the screen builds at that very step, for every step', () => {
    for (const step of S_234_STEPS) {
      expect(askedAt(step), `the regions at step ${step}`).toEqual(
        regionsFromScreen(ENV, tallSettings(step)),
      )
    }
  })

  it('sits the Row Area below the ruler band that step draws (DS-1)', () => {
    const bandHeight = tallSettings(S_234_DEFAULT).rulerHeight
    for (const step of S_234_STEPS) {
      const asked = askedAt(step)
      expect(
        asked.rowArea.y - asked.scheduleCanvas.y,
        `${FR_039_WHAT_IT_MULTIPLIES} -- the drawn ruler band at step ${step}`,
      ).toBeCloseTo(bandHeight * ratioOf(step), 6)
    }
  })
})
