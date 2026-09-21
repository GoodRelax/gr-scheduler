// CR-548: palette colours stored by name, custom colours with light and dark sides (FR-007, T-017b).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_ZOOM_BOUNDS,
  editTask,
  type TaskCommand,
} from '../../src/use-case/edit-document/edit-document'
import type {
  FieldCommit,
  PropertiesPanel,
  PropertyControl,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import {
  commandFromFieldCommit,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { svgFromSchedule, swatchOf } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_007_CUSTOM = '⭐ パレットに無い色は、カスタムカラーとして選ばせること（MUST）'
const FR_007_T_017B = 'カスタムカラーとして選ばせること（MUST） —— 持ち方と描き方は 表 T-017b に従うこと（MUST）'
const FR_007_TRANSPARENT = '塗りと輪郭を同時に透明にすることを許してはならない（MUST NOT）'
const CV_1_NAME =
  'パレット色を選んだら、`_assets/tbl-settings.md` の 表 T-294 の「保存する綴り」の欄の名（例: `red`）を保存すること（MUST）'
const CV_1_NOT_VALUE = '描いた値（`#rrggbb`）を保存してはならない（MUST NOT）'
const CV_2_TWO = 'カスタムカラーは、明るいテーマの値と暗いテーマの値の 2 つを持つこと（MUST）'
const CV_2_NOT_BOTH = 'どちらも `#rrggbb`（16 進 6 桁）か未定義とする。2 つとも未定義にしてはならない（MUST NOT）'
const CV_3 = '未定義の側の明暗で描くときは、もう一方の側の値で描くこと（MUST）'
const CV_4_THIS_SIDE = 'いま描いている明暗（`FR-041`）の側の値だけを、選んだ値にすること（MUST）'
const CV_4_OTHER_SIDE = 'もう一方の側は、選ぶ前の色がカスタムカラーならその値を保ち、そうでなければ未定義とすること（MUST）'
const CV_5 = 'カスタムカラーを持つ欄でパレット色（透明を含む）を選んだら、2 つの値を両方捨てること（MUST）'
const CV_6_NAMED = 'パレット色は、表 T-294 がその名に持つ、いま描いている明暗の値で描くこと（MUST）'
const CV_6_CUSTOM = 'カスタムカラーは、実績バーの塗りを除くどの所にも、`CV-3` で決まった値をそのまま使うこと（MUST）'
const CV_6_ACTUAL = 'カスタムカラーの実績バーの塗りは、その値から試作の予定と実績の差で導くこと（MUST）'
const CV_7 = '`FR-041` のモノクロは、`CV-6` で決まった値を無彩色にして描くこと（MUST）'
const CV_8_T_294 =
  '表 T-294 の値は、白（`S-314`）と透明（`S-324`）を除き、表 T-017a の `CT-4` と `CT-5` を地（`_assets/tbl-settings.md` の `S-146`）に対して満たすこと（MUST）'
const CV_8_CT_3 = '実績の塗りの欄が自分の値を持つ行は、`CT-3` も満たすこと（MUST）'
const CV_8_NO_CORRECTION = '⛔ カスタムカラーの値を、明暗のどちらの側でも自動で補正してはならない（MUST NOT）'
const CV_8_NO_NOTICE = '未定義の側を `CV-3` で描いたことを通知してはならない（MUST NOT）'
const CV_9_FIELD = 'プロパティパネルの色の欄は、表 T-294 の名とカスタムカラーの入口を並べて選ばせること（MUST）'
const CV_9_SWATCH = '名の見本は、その欄が描く形（`CV-6`）の、いま描いている明暗の値で塗ること（MUST）'
const CV_9_BOTH_SIDES = '⭐ 欄には、選んでいる色の明るいテーマと暗いテーマの見本を並べて示すこと（MUST）'
const T_017A_ACTUAL = '実績の色は予定と同じ色相から導き、実績を濃く描くこと（MUST）'

const CLAUSES = [
  FR_007_CUSTOM,
  FR_007_T_017B,
  FR_007_TRANSPARENT,
  CV_1_NAME,
  CV_1_NOT_VALUE,
  CV_2_TWO,
  CV_2_NOT_BOTH,
  CV_3,
  CV_4_THIS_SIDE,
  CV_4_OTHER_SIDE,
  CV_5,
  CV_6_NAMED,
  CV_6_CUSTOM,
  CV_6_ACTUAL,
  CV_7,
  CV_8_T_294,
  CV_8_CT_3,
  CV_8_NO_CORRECTION,
  CV_8_NO_NOTICE,
  CV_9_FIELD,
  CV_9_SWATCH,
  CV_9_BOTH_SIDES,
  T_017A_ACTUAL,
]

describe('CR-548 -- the clauses still stand in the manuscript', () => {
  it.each(CLAUSES)('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

type Side = 'light' | 'dark'
type Form = 'fill' | 'outline' | 'actual' | 'band'

const COLUMN: Record<Side, Record<Form, string>> = {
  light: {
    fill: '明るいテーマの塗り',
    outline: '明るいテーマの縁',
    actual: '明るいテーマの実績の塗り',
    band: '明るいテーマの行の帯',
  },
  dark: {
    fill: '暗いテーマの塗り',
    outline: '暗いテーマの縁',
    actual: '暗いテーマの実績の塗り',
    band: '暗いテーマの行の帯',
  },
}

const HEX = /#[0-9a-fA-F]{6}/

interface PaletteRow {
  readonly id: string
  readonly spelling: string
  readonly cell: (side: Side, form: Form) => string | null
}

const T_294: readonly PaletteRow[] = specTable('T-294').rows.map((row) => ({
  id: row.id,
  spelling: (row.by['保存する綴り'] ?? '').replace(/`/g, '').trim(),
  cell: (side: Side, form: Form) => HEX.exec(row.by[COLUMN[side][form]] ?? '')?.[0].toLowerCase() ?? null,
}))

const rowNamed = (spelling: string): PaletteRow => {
  const found = T_294.find((one) => one.spelling === spelling)
  if (found === undefined) throw new Error(`table T-294 has no ${spelling}`)
  return found
}

type Rgb = readonly [number, number, number]

const hslToRgb = (h: number, s: number, l: number): Rgb => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

const rgbOf = (colour: string): Rgb => {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour.trim())
  if (hex !== null) return [parseInt(hex[1]!, 16), parseInt(hex[2]!, 16), parseInt(hex[3]!, 16)]
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(colour.trim())
  if (rgb !== null) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  const hsl = /^hsla?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/.exec(colour.trim())
  if (hsl === null) throw new Error(`the case cannot read the colour ${colour}`)
  return hslToRgb(Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100)
}

const hslOf = (colour: string): { h: number; s: number; l: number } => {
  const [r, g, b] = rgbOf(colour).map((one) => one / 255) as unknown as Rgb
  const high = Math.max(r, g, b)
  const low = Math.min(r, g, b)
  const l = (high + low) / 2
  const c = high - low
  const s = c === 0 ? 0 : c / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (c !== 0) {
    if (high === r) h = 60 * (((g - b) / c) % 6)
    else if (high === g) h = 60 * ((b - r) / c + 2)
    else h = 60 * ((r - g) / c + 4)
  }
  return { h: (h + 360) % 360, s: s * 100, l: l * 100 }
}

const luminance = (colour: string): number => {
  const [r, g, b] = rgbOf(colour).map((one) => {
    const v = one / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as unknown as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ratio = (a: string, b: string): number => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (high + 0.05) / (low + 0.05)
}

const LIGHT_GROUND = '#ffffff'
const DARK_GROUNDS = [...Array.from({ length: 360 }, (_unused, h) => `hsl(${h} 12% 9%)`), '#14161a']
const worstAgainstGround = (colour: string, side: Side): number =>
  side === 'light' ? ratio(colour, LIGHT_GROUND) : Math.min(...DARK_GROUNDS.map((ground) => ratio(colour, ground)))

const nested = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[path[path.length - 1] as string] = flat[key]
  }
  return out
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  nested({
    ...SETTINGS_DEFAULTS,
    scrollDate: '2026-01-01',
    scrollGroupId: 'g1',
    ...part,
  }) as unknown as DocumentSettings

const HUE = 214
const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
const THE_TASK = 1

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: null,
    name: 'alpha',
    start: '2026-01-03T08:00:00',
    finish: '2026-01-10T17:00:00',
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    stop: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...part,
  }) as unknown as Task

const groupOf = (part: Record<string, unknown> = {}): TaskGroup =>
  ({
    id: 'g1',
    parentId: null,
    label: 'row',
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

const visualOf = (part: Record<string, unknown>): Record<string, unknown> => ({
  taskUid: THE_TASK,
  nameAnchor: null,
  nameAlign: null,
  shapeKind: null,
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  lineWeight: null,
  ...part,
})

const scheduleOf = (visual: Record<string, unknown> | null, group: Record<string, unknown> = {}): Schedule =>
  ({
    project: {
      title: 'A',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      themeHue: HUE,
      uidHighWaterMark: 100,
      importSeq: 0,
      revision: 1,
      carry: {},
      carryElements: [],
    },
    calendars: [],
    tasks: [taskOf({ uid: THE_TASK })],
    resources: [],
    assignments: [],
    taskGroups: [groupOf(group)],
    taskGroupMembers: [{ taskUid: THE_TASK, groupId: 'g1', stackOrder: null }],
    taskVisuals: visual === null ? [] : [visualOf(visual)],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const documentOf = (schedule: Schedule, settings: DocumentSettings = settingsOf()): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule,
    documentSettings: settings,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const readingsOf = (side: Side, groupIds: readonly string[] = []): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    isAgentApiEnabled: false,
    pointer: null,
    pointerRestedMs: 0,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: side,
    themeHue: HUE,
    selectedGroupIds: groupIds,
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    rowBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }) as unknown as ScreenViewReadings

const SESSION: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    language: 'ja',
    propertiesPanelContentState: {
      kind: 'selectionDisplayed',
      subject: { selection: emptySelection(), groupIds: [] },
    },
  },
}

const holdingTask = (): Selection => selectionWith(emptySelection(), { kind: 'task', uid: THE_TASK } as ItemRef)

const panelOf = (schedule: Schedule, side: Side, selection: Selection, groupIds: readonly string[] = []) => {
  const panel = propertiesPanelFromSelection(
    schedule,
    settingsOf({ themePreference: side }),
    selection,
    SESSION,
    readingsOf(side, groupIds),
  )
  expect(panel, 'premise: the panel is described').not.toBe(null)
  return panel as PropertiesPanel
}

const colourControl = (panel: PropertiesPanel, column: string): PropertyControl => {
  const found = panel.fields
    .flatMap((field) => field.controls)
    .find((control) => (control.key as { column?: string }).column === column)
  expect(found, `premise: the panel has a control for ${column}`).toBeDefined()
  return found as PropertyControl
}

const contextOf = (schedule: Schedule, side: Side): InputContext => {
  const settings = settingsOf({ themePreference: side })
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection())
  return {
    document: documentOf(schedule, settings),
    layout,
    geometry,
    regions,
    screen: emptyScreenSession.screen,
    selection: holdingTask(),
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  }
}

const fillCommitted = (previous: string | null, text: string, side: Side): string | null => {
  const schedule = scheduleOf({ fillColor: previous })
  const control = colourControl(panelOf(schedule, side, holdingTask()), 'fillColor')
  const commit: FieldCommit = { row: 'PR-12', key: control.key, text } as FieldCommit
  const commands = commandFromFieldCommit(commit, contextOf(schedule, side))
  expect(commands.length, 'premise: the commit asks for an edit').toBeGreaterThan(0)
  let document = documentOf(schedule, settingsOf({ themePreference: side }))
  for (const command of commands) {
    const result = editTask(document, command as TaskCommand, 'row')
    expect(result.ok, `premise: ${command.kind} is accepted`).toBe(true)
    if (result.ok) document = result.document
  }
  const visual = document.schedule.taskVisuals.find((one) => one.taskUid === THE_TASK)
  return visual?.fillColor ?? null
}

const setColours = (fillColor: string | null, strokeColor: string | null) =>
  editTask(
    documentOf(scheduleOf(null)),
    { kind: 'setTaskVisualColors', uid: THE_TASK, fillColor, strokeColor },
    'row',
  )

const svgOf = (schedule: Schedule, settings: DocumentSettings): string => {
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection())
  return svgFromSchedule(schedule, settings, layout, geometry, regions, emptySelection(), 'screen')
}

const paintsOf = (svg: string): readonly string[] =>
  [...svg.matchAll(/\b(?:fill|stroke)="([^"]*)"/g)].map((hit) => hit[1] as string).filter((one) => one !== 'none')

const paint = (stored: string | null, form: Form, side: Side): string =>
  swatchOf(stored, form, HUE, side === 'dark').paint.toLowerCase()

const SIDES: readonly Side[] = ['light', 'dark']
const CUSTOM_LIGHT = '#c0504d'
const CUSTOM_DARK = '#102030'
const PICKED = '#123456'

describe('FR-007 -- a colour not on the palette is chosen as a custom colour', () => {
  it(FR_007_CUSTOM, () => {
    const control = colourControl(panelOf(scheduleOf(null), 'light', holdingTask()), 'fillColor')
    expect(control.colour, 'the colour field describes a custom entrance').toBeDefined()
    expect(control.colour!.customWord, 'the entrance is named by the dictionary (FR-038)').toBe('カスタムカラー')
    expect(fillCommitted(null, PICKED, 'light'), 'a value picked there is written').toBe(`${PICKED}/`)
  })

  it(FR_007_T_017B, () => {
    const accepted = setColours(`${CUSTOM_LIGHT}/`, null)
    expect(accepted.ok, 'the CV-2 form is accepted').toBe(true)
    expect(paint(`${CUSTOM_LIGHT}/`, 'fill', 'dark')).toBe(CUSTOM_LIGHT)
  })

  it(FR_007_TRANSPARENT, () => {
    expect(setColours('transparent', 'transparent').ok).toBe(false)
    expect(setColours('transparent', 'red').ok, 'one of the two alone may be transparent').toBe(true)
  })
})

describe('CV-1 -- a palette colour is stored by its name', () => {
  it(CV_1_NAME, () => {
    for (const side of SIDES) expect(fillCommitted(null, 'red', side), side).toBe('red')
  })

  it(CV_1_NOT_VALUE, () => {
    const drawnRed = rowNamed('red').cell('light', 'fill') as string
    expect(fillCommitted(null, 'red', 'light')).not.toBe(drawnRed)
    expect(setColours(drawnRed, null).ok, 'a bare drawn value is not a stored form').toBe(false)
  })
})

describe('CV-2 -- a custom colour holds two sides', () => {
  it(CV_2_TWO, () => {
    expect(setColours(`${CUSTOM_LIGHT}/${CUSTOM_DARK}`, null).ok).toBe(true)
    expect(paint(`${CUSTOM_LIGHT}/${CUSTOM_DARK}`, 'fill', 'light')).toBe(CUSTOM_LIGHT)
    expect(paint(`${CUSTOM_LIGHT}/${CUSTOM_DARK}`, 'fill', 'dark')).toBe(CUSTOM_DARK)
  })

  it(CV_2_NOT_BOTH, () => {
    expect(setColours('/', null).ok, 'both sides undefined').toBe(false)
    expect(setColours('#c0504/', null).ok, 'five hex digits').toBe(false)
    expect(setColours(`/${CUSTOM_DARK}`, null).ok, 'the light side undefined').toBe(true)
  })
})

describe('CV-3 -- an undefined side is drawn with the other', () => {
  it(CV_3, () => {
    expect(paint(`${CUSTOM_LIGHT}/`, 'fill', 'dark')).toBe(CUSTOM_LIGHT)
    expect(paint(`/${CUSTOM_DARK}`, 'outline', 'light')).toBe(CUSTOM_DARK)
  })
})

describe('CV-4 -- choosing a custom colour', () => {
  it(CV_4_THIS_SIDE, () => {
    expect(fillCommitted(null, PICKED, 'light')).toBe(`${PICKED}/`)
    expect(fillCommitted(null, PICKED, 'dark')).toBe(`/${PICKED}`)
  })

  it(CV_4_OTHER_SIDE, () => {
    expect(fillCommitted(`${CUSTOM_LIGHT}/`, PICKED, 'dark'), 'the custom light side is kept').toBe(
      `${CUSTOM_LIGHT}/${PICKED}`,
    )
    expect(fillCommitted('red', PICKED, 'dark'), 'a palette name before leaves the other side undefined').toBe(
      `/${PICKED}`,
    )
  })
})

describe('CV-5 -- back to a palette colour', () => {
  it(CV_5, () => {
    const before = `${CUSTOM_LIGHT}/${CUSTOM_DARK}`
    expect(fillCommitted(before, 'blue', 'light')).toBe('blue')
    expect(fillCommitted(before, 'transparent', 'dark')).toBe('transparent')
    expect(fillCommitted(before, '', 'light'), 'back to the theme').toBe(null)
  })
})

describe('CV-6 -- the value drawn', () => {
  it(CV_6_NAMED, () => {
    const forms: readonly Form[] = ['fill', 'outline', 'actual', 'band']
    for (const row of T_294) {
      if (row.spelling === 'transparent') continue
      for (const side of SIDES) {
        for (const form of forms) {
          const own = row.cell(side, form)
          if (own === null) continue
          expect(paint(row.spelling, form, side), `${row.id} ${side} ${form}`).toBe(own)
        }
      }
    }
  })

  it(CV_6_CUSTOM, () => {
    for (const form of ['fill', 'outline', 'band'] as const) {
      expect(paint(`${CUSTOM_LIGHT}/${CUSTOM_DARK}`, form, 'light'), form).toBe(CUSTOM_LIGHT)
      expect(paint(`${CUSTOM_LIGHT}/`, form, 'dark'), form).toBe(CUSTOM_LIGHT)
    }
  })

  it(CV_6_ACTUAL, () => {
    const clamp = (value: number): number => Math.min(100, Math.max(0, value))
    const base = hslOf(CUSTOM_LIGHT)
    for (const [side, ds, dl] of [
      ['light', 16, -46],
      ['dark', 30, 38],
    ] as const) {
      const drawn = hslOf(paint(`${CUSTOM_LIGHT}/`, 'actual', side))
      expect(Math.abs(drawn.h - base.h), `${side} hue`).toBeLessThanOrEqual(2)
      expect(Math.abs(drawn.s - clamp(base.s + ds)), `${side} saturation`).toBeLessThanOrEqual(1.5)
      expect(Math.abs(drawn.l - clamp(base.l + dl)), `${side} lightness`).toBeLessThanOrEqual(1.5)
    }
  })
})

describe('CV-7 -- monochrome', () => {
  it(CV_7, () => {
    const red = rowNamed('red')
    for (const side of SIDES) {
      const drawnFill = red.cell(side, 'fill') as string
      const coloured = paintsOf(svgOf(scheduleOf({ fillColor: 'red' }), settingsOf({ themePreference: side })))
      expect(coloured, `premise: ${side} draws the named fill`).toContain(drawnFill)
      const mono = paintsOf(
        svgOf(scheduleOf({ fillColor: 'red' }), settingsOf({ themePreference: side, themeMonochrome: true })),
      )
      expect(mono.map((one) => one.toLowerCase())).not.toContain(drawnFill)
      const target = hslOf(drawnFill).l
      const greyOfIt = mono.some((one) => {
        const hsl = hslOf(one)
        return hsl.s < 1 && Math.abs(hsl.l - target) <= 1
      })
      expect(greyOfIt, `${side}: the chosen value is drawn without chroma, at its own lightness`).toBe(true)
    }
  })
})

describe('CV-8 -- what the values satisfy', () => {
  it(CV_8_T_294, () => {
    for (const row of T_294) {
      if (row.spelling === 'white' || row.spelling === 'transparent') continue
      for (const side of SIDES) {
        const outline = row.cell(side, 'outline')
        const fill = row.cell(side, 'fill')
        expect(outline, `${row.id} ${side} outline`).not.toBe(null)
        expect(fill, `${row.id} ${side} fill`).not.toBe(null)
        expect(worstAgainstGround(outline!, side), `${row.id} ${side} CT-4`).toBeGreaterThanOrEqual(3)
        expect(worstAgainstGround(fill!, side), `${row.id} ${side} CT-5`).toBeGreaterThanOrEqual(1.3)
      }
    }
  })

  it(CV_8_CT_3, () => {
    let measured = 0
    for (const row of T_294) {
      for (const side of SIDES) {
        const actual = row.cell(side, 'actual')
        const fill = row.cell(side, 'fill')
        if (actual === null || fill === null) continue
        measured += 1
        expect(ratio(actual, fill), `${row.id} ${side} CT-3`).toBeGreaterThanOrEqual(3)
      }
    }
    expect(measured, 'premise: some rows hold an actual fill of their own').toBeGreaterThan(0)
  })

  it(CV_8_NO_CORRECTION, () => {
    const faint = '#fefefe'
    expect(worstAgainstGround(faint, 'light'), 'premise: it fails CT-5').toBeLessThan(1.3)
    for (const side of SIDES) {
      for (const form of ['fill', 'outline', 'band'] as const) expect(paint(`${faint}/`, form, side)).toBe(faint)
    }
  })

  it(CV_8_NO_NOTICE, () => {
    const result = setColours(`${CUSTOM_LIGHT}/`, `/${CUSTOM_DARK}`)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.report, 'the edit tells nothing').toEqual({ recountedTaskUids: [] })
    const control = colourControl(panelOf(result.document.schedule, 'dark', holdingTask()), 'fillColor')
    expect(control.colour?.dark.paint.toLowerCase(), 'drawn with the other side').toBe(CUSTOM_LIGHT)
  })
})

describe('CV-9 -- the colour field', () => {
  const spellingsOf = (control: PropertyControl): readonly string[] =>
    (control.choiceValues ?? control.choices ?? []).filter((one) => one !== '')

  it(CV_9_FIELD, () => {
    const task = panelOf(scheduleOf(null), 'light', holdingTask())
    for (const column of ['fillColor', 'strokeColor']) {
      const control = colourControl(task, column)
      expect(spellingsOf(control), `${column}: the names in T-294's order`).toEqual(T_294.map((row) => row.spelling))
      expect(control.colour?.customWord, `${column}: with the custom entrance`).toBe('カスタムカラー')
    }
    const group = panelOf(scheduleOf(null), 'light', emptySelection(), ['g1'])
    const band = colourControl(group, 'color')
    expect(spellingsOf(band), 'the row colour offers no black (S-315)').toEqual(
      T_294.map((row) => row.spelling).filter((one) => one !== 'black'),
    )
  })

  it(CV_9_SWATCH, () => {
    const formOf: Record<string, Form> = { fillColor: 'fill', strokeColor: 'outline' }
    for (const side of SIDES) {
      const task = panelOf(scheduleOf(null), side, holdingTask())
      for (const column of ['fillColor', 'strokeColor']) {
        const control = colourControl(task, column)
        const values = control.choiceValues ?? control.choices ?? []
        values.forEach((spelling, at) => {
          if (spelling === '' || spelling === 'transparent') return
          const expected = rowNamed(spelling).cell(side, formOf[column] as Form)
          expect(control.colour?.swatches[at]?.toLowerCase(), `${side} ${column} ${spelling}`).toBe(expected)
        })
      }
    }
  })

  it(CV_9_BOTH_SIDES, () => {
    const red = rowNamed('red')
    const named = colourControl(panelOf(scheduleOf({ fillColor: 'red' }), 'light', holdingTask()), 'fillColor')
    expect(named.colour?.light.paint.toLowerCase()).toBe(red.cell('light', 'fill'))
    expect(named.colour?.dark.paint.toLowerCase()).toBe(red.cell('dark', 'fill'))
    const custom = colourControl(
      panelOf(scheduleOf({ fillColor: `${CUSTOM_LIGHT}/` }), 'light', holdingTask()),
      'fillColor',
    )
    expect(custom.colour?.light.paint.toLowerCase()).toBe(CUSTOM_LIGHT)
    expect(custom.colour?.dark.paint.toLowerCase(), 'the undefined side shows the value CV-3 draws').toBe(CUSTOM_LIGHT)
    expect(custom.colour?.dark.note, 'and says which side it is the same as').toBe('（ライトと同じ）')
  })
})

describe('Table T-017a -- the actual derives from the plan', () => {
  it(T_017A_ACTUAL, () => {
    let measured = 0
    for (const row of T_294) {
      for (const side of SIDES) {
        const actual = row.cell(side, 'actual')
        const fill = row.cell(side, 'fill')
        if (actual === null || fill === null) continue
        measured += 1
        const a = hslOf(actual)
        const f = hslOf(fill)
        if (f.s > 1) {
          const gap = Math.min(Math.abs(a.h - f.h), 360 - Math.abs(a.h - f.h))
          expect(gap, `${row.id} ${side}: one hue`).toBeLessThanOrEqual(3)
        }
        expect(ratio(actual, side === 'light' ? LIGHT_GROUND : '#14161a'), `${row.id} ${side}: the actual stands out more`).toBeGreaterThan(
          ratio(fill, side === 'light' ? LIGHT_GROUND : '#14161a'),
        )
      }
    }
    expect(measured).toBeGreaterThan(0)
  })
})
