// CR-550: the Dual Cursor readout beside the pointer (DC-3) and EZ-6 standing down in the mode.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { calendarSpanOf, type Schedule, type Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dateAtX,
  layoutFromSchedule,
  timeAxisOf,
  xFromDay,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { ScreenView, ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  dualCursorReadoutOf,
  guideCursorLabelOf,
  tooltipsFromScreenView,
} from '../../src/adapter/screen-renderer/tooltips'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { showPointTip } from '../../src/framework/dom-screen-surface/tooltips-drawing'
import { NOT_STORED_HELP_SIZES } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const DC_3_THREE_LINES = '本モードにいるあいだ、ポインタのそばに 3 行を小さく示すこと（MUST）'
const DC_3_BY_DATE =
  '⭐ 左と右は、カーソル A（`date1`）とカーソル B（`date2`）の別ではなく、日付の順で名づけること（MUST）'
const DC_3_FOLLOWING = '⭐ 追従している側の日付は、その線がいま立っている日とすること（MUST）'
const DC_3_DATE = '日付は、表 T-029 の `CU-3` の日付の札と同じ書き方で書くこと（MUST）'
const DC_3_SPAN =
  '⭐ 間隔は、2 つの日付のうち早いほうを E、遅いほうを L として、年・か月・日の数 y・m・d と暦日の数 n を 1 行に書くこと（MUST）'
const DC_3_ZEROS = '⭐ y・m・d は、0 のときも省かずに 3 つとも書くこと（MUST）'
const DC_3_ONE_DAY = 'n が 1 のときは `(1 day)` と書くこと（MUST）'
const DC_3_UNDECIDED =
  '日付が 1 つしか決まっていないときは、決まっている日付を左の行に示し、右の行と間隔の行を `—` で示すこと（MUST）'
const DC_3_PLACE =
  '⭐ 置き方は、表 T-028 の `IN-7` の後段（ポインタの点に出す説明）に従い、ポインタを受け取らせないこと（MUST）'
const IN_7_BELOW =
  '左上の隅を、ポインタの点と同じ横の位置で、点から `_assets/tbl-settings.md` の 表 T-206 の `S-460` だけ下に置く'
const IN_7_RIGHT =
  '右端が窓の右端から `S-339` の内側に収まらないときは、右端をポインタの点の横の位置に揃え、ポインタの左へ返すこと（MUST）'
const IN_7_LEFT =
  'それでも左端が窓の左端から `S-339` の内側に収まらないときは、左端を窓の左端から `S-339` の位置に置くこと（MUST）'
const IN_7_BOTTOM =
  '下端が窓の下端から `S-339` の内側に収まらないときに限り、下端を点から `S-460` だけ上に揃え、ポインタの上へ返すこと（MUST）'
const IN_7_NOT_ABOVE =
  '上へ返しても上端が窓の上端から `S-339` の内側に収まらないときは、返さずに下に置くこと（MUST）'
const DC_3_NO_EZ_6 = '⛔ 本モードにいるあいだ、`EZ-6` の説明を出してはならない（MUST NOT）'
const DC_3_NOT_EXPORTED = '⛔ 書き出し（表 T-076）に出してはならない（MUST NOT）'
const EZ_6_NOT_IN_MODE =
  '⛔ `Dual Cursor` のモード（表 T-029a の `DC-1` から `DC-4` のあいだ）にいるあいだは、出してはならない（MUST NOT）'

const CLAUSES = [
  DC_3_THREE_LINES,
  DC_3_BY_DATE,
  DC_3_FOLLOWING,
  DC_3_DATE,
  DC_3_SPAN,
  DC_3_ZEROS,
  DC_3_ONE_DAY,
  DC_3_UNDECIDED,
  DC_3_PLACE,
  IN_7_BELOW,
  IN_7_RIGHT,
  IN_7_LEFT,
  IN_7_BOTTOM,
  IN_7_NOT_ABOVE,
  DC_3_NO_EZ_6,
  DC_3_NOT_EXPORTED,
  EZ_6_NOT_IN_MODE,
]

describe('CR-550 -- the clauses still stand in the manuscript', () => {
  it.each(CLAUSES)('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const LEFT_WORD = '左: '
const RIGHT_WORD = '右: '
const SPAN_WORD = '間隔: '
const UNDECIDED = '—'
// WHY: the CU-3 form, written out from the manuscript's examples (2026/04/01 is a Wednesday).
const APRIL_2026: Readonly<Record<number, string>> = {
  1: '2026/04/01 (水)',
  2: '2026/04/02 (木)',
  3: '2026/04/03 (金)',
  10: '2026/04/10 (金)',
  15: '2026/04/15 (水)',
  20: '2026/04/20 (月)',
}

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
  nested({ ...SETTINGS_DEFAULTS, scrollDate: '2026-03-25', scrollGroupId: 'g1', ...part }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }

const TASK = {
  uid: 1,
  parentTaskUid: null,
  wbsOrder: null,
  name: 'alpha',
  start: '2026-04-01T08:00:00',
  finish: '2026-04-08T17:00:00',
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
} as unknown as Task

const SCHEDULE = {
  project: {
    title: 'A',
    calendarUid: null,
    statusDate: null,
    startDate: null,
    themeHue: 214,
    uidHighWaterMark: 100,
    importSeq: 0,
    revision: 1,
    carry: {},
    carryElements: [],
  },
  calendars: [],
  tasks: [TASK],
  resources: [],
  assignments: [],
  taskGroups: [
    {
      id: 'g1',
      parentId: null,
      label: 'row',
      derivedFromTaskUid: null,
      order: 0,
      treeState: 'auto', color: null,
      minHeight: null,
    },
  ],
  taskGroupMembers: [{ taskUid: 1, groupId: 'g1' }],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

type Mode = 'off' | 'placingDate1' | 'placingDate2'

type Placed = { readonly date1: string; readonly date2: string } | null

// WHY: DC-1 holds the two dates in the screen values (CR-572), no longer in the document.
const sessionIn = (mode: Mode, placed: Placed = null, language: 'ja' | 'en' = 'ja'): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage: language,
    helpLanguage: language,
    dualCursorModeState: mode === 'off' ? { kind: 'off' } : { kind: 'on', child: { kind: mode } },
    dualCursor: mode === 'off' ? null : placed,
  },
})

const readingsAt = (pointer: { x: number; y: number } | null, part: Record<string, unknown> = {}) =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer,
    pointerRestedMs: 0,
    hintTargetDwellMs: 0,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: 'light',
    themeHue: 214,
    selectedGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
    ...part,
  }) as unknown as ScreenViewReadings

const stageOf = (stored: Placed) => {
  const settings = settingsOf()
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(SCHEDULE, settings, regions)
  const axis = timeAxisOf(settings, regions)
  const middleY = regions.taskGroupArea.y + regions.taskGroupArea.height / 2
  const pointOn = (year: number, month: number, day: number) => {
    const x = xFromDay(layout, { year, month, day })
    expect(dateAtX(axis, x), 'premise: the point stands on that day').toEqual({ year, month, day })
    return { x, y: middleY }
  }
  const readout = (mode: Mode, pointer: { x: number; y: number } | null, language: 'ja' | 'en' = 'ja') =>
    dualCursorReadoutOf(regions, settings, sessionIn(mode, stored, language), readingsAt(pointer))
  return { settings, regions, layout, axis, pointOn, readout, middleY }
}

const STORED = { date1: '2026-04-01T00:00:00', date2: '2026-04-15T00:00:00' }

describe('DC-3 -- the readout', () => {
  it(DC_3_THREE_LINES, () => {
    const stage = stageOf(STORED)
    const point = stage.pointOn(2026, 4, 10)
    const shown = stage.readout('placingDate1', point)
    expect(shown?.lines, 'three lines while the mode stands').toHaveLength(3)
    expect(shown?.at, 'beside the pointer').toEqual(point)
    expect(stage.readout('off', point), 'nothing outside the mode').toBe(null)
  })

  it(DC_3_FOLLOWING, () => {
    const stage = stageOf(STORED)
    const point = stage.pointOn(2026, 4, 10)
    const whileA = stage.readout('placingDate1', point)
    expect(whileA?.lines[0], 'A follows: its line stands under the pointer').toBe(`${LEFT_WORD}${APRIL_2026[10]}`)
    expect(whileA?.lines[1], 'B stays where it was placed').toBe(`${RIGHT_WORD}${APRIL_2026[15]}`)
    const whileB = stage.readout('placingDate2', point)
    expect(whileB?.lines[0]).toBe(`${LEFT_WORD}${APRIL_2026[1]}`)
    expect(whileB?.lines[1]).toBe(`${RIGHT_WORD}${APRIL_2026[10]}`)
  })

  it(DC_3_BY_DATE, () => {
    const reversed = stageOf({ date1: '2026-04-15T00:00:00', date2: STORED.date2 })
    const shown = reversed.readout('placingDate2', reversed.pointOn(2026, 4, 1))
    expect(shown?.lines[0], 'date2 is the earlier day, so it stands on the left line').toBe(`${LEFT_WORD}${APRIL_2026[1]}`)
    expect(shown?.lines[1]).toBe(`${RIGHT_WORD}${APRIL_2026[15]}`)
    const stage = stageOf(STORED)
    const before = stage.readout('placingDate1', stage.pointOn(2026, 4, 10))
    const past = stage.readout('placingDate1', stage.pointOn(2026, 4, 20))
    expect(before?.lines[0], 'the following day is the earlier one').toBe(`${LEFT_WORD}${APRIL_2026[10]}`)
    expect(past?.lines[0], 'past the standing day, the standing day moves to the left line').toBe(
      `${LEFT_WORD}${APRIL_2026[15]}`,
    )
    expect(past?.lines[1]).toBe(`${RIGHT_WORD}${APRIL_2026[20]}`)
  })

  it(DC_3_DATE, () => {
    const stage = stageOf(STORED)
    const point = stage.pointOn(2026, 4, 3)
    const shown = stage.readout('placingDate2', point)
    expect(shown?.lines[0], 'month and day padded to two digits').toBe(`${LEFT_WORD}${APRIL_2026[1]}`)
    const guided = sessionIn('off')
    const label = guideCursorLabelOf(
      stage.regions,
      stage.settings,
      { ...guided, screen: { ...guided.screen, guideCursorMode: 'single-vertical' } },
      readingsAt(point),
      [],
    )
    expect(label?.text, 'the CU-3 label of the same day').toBe(APRIL_2026[3])
    expect(shown?.lines[1], 'the readout writes the day as the CU-3 label does').toBe(`${RIGHT_WORD}${label?.text}`)
    const english = stage.readout('placingDate2', point, 'en')
    expect(english?.lines[1]).toBe('Right: 2026/04/03 (Fri)')
  })

  it(DC_3_SPAN, () => {
    const examples = [
      [[2026, 4, 1], [2026, 4, 15], [0, 0, 14, 14]],
      [[2026, 1, 31], [2026, 2, 28], [0, 1, 0, 28]],
      [[2026, 1, 31], [2026, 3, 1], [0, 1, 1, 29]],
      [[2024, 2, 29], [2025, 2, 28], [1, 0, 0, 365]],
      [[2024, 1, 1], [2026, 3, 4], [2, 2, 3, 793]],
      [[2026, 4, 1], [2026, 4, 1], [0, 0, 0, 0]],
    ] as const
    for (const [a, b, [years, months, days, dayCount]] of examples) {
      const e = { year: a[0], month: a[1], day: a[2] }
      const l = { year: b[0], month: b[1], day: b[2] }
      expect(calendarSpanOf(e, l), `${a} .. ${b}`).toEqual({ years, months, days, dayCount })
      expect(calendarSpanOf(l, e), `${b} .. ${a}`).toEqual({ years, months, days, dayCount })
    }
    const stage = stageOf(STORED)
    const at15 = stage.pointOn(2026, 4, 15)
    expect(stage.readout('placingDate2', at15)?.lines[2]).toBe(`${SPAN_WORD}0年 0か月 14日 (14 days)`)
    expect(stage.readout('placingDate2', at15, 'en')?.lines[2]).toBe('Interval: 0y 0m 14d (14 days)')
    const reversed = stageOf({ date1: '2026-04-15T00:00:00', date2: STORED.date2 })
    expect(reversed.readout('placingDate2', reversed.pointOn(2026, 4, 1))?.lines[2], 'A after B').toBe(
      `${SPAN_WORD}0年 0か月 14日 (14 days)`,
    )
  })

  it(DC_3_ZEROS, () => {
    const stage = stageOf(STORED)
    expect(stage.readout('placingDate2', stage.pointOn(2026, 4, 1))?.lines[2]).toBe(`${SPAN_WORD}0年 0か月 0日 (0 days)`)
  })

  it(DC_3_ONE_DAY, () => {
    const stage = stageOf(STORED)
    const at2 = stage.pointOn(2026, 4, 2)
    expect(stage.readout('placingDate2', at2)?.lines[2]).toBe(`${SPAN_WORD}0年 0か月 1日 (1 day)`)
    expect(stage.readout('placingDate2', at2, 'en')?.lines[2]).toBe('Interval: 0y 0m 1d (1 day)')
  })

  it(DC_3_UNDECIDED, () => {
    const stage = stageOf(null)
    const shown = stage.readout('placingDate1', stage.pointOn(2026, 4, 10))
    expect(shown?.lines).toEqual([`${LEFT_WORD}${APRIL_2026[10]}`, `${RIGHT_WORD}${UNDECIDED}`, `${SPAN_WORD}${UNDECIDED}`])
    const second = stage.readout('placingDate2', stage.pointOn(2026, 4, 10))
    expect(second?.lines[0], 'the one known day is on the left line, whichever cursor holds it').toBe(
      `${LEFT_WORD}${APRIL_2026[10]}`,
    )
  })
})

interface FakeNode {
  style: string
  text: string
  children: FakeNode[]
  size: { width: number; height: number }
}

const drawnReadout = (at: { x: number; y: number }, room: { width: number; height: number }) => {
  const made: FakeNode[] = []
  const box = { width: 200, height: 60 }
  const element = (): FakeNode & Record<string, unknown> => {
    const node: FakeNode & Record<string, unknown> = { style: '', text: '', children: [], size: box }
    node.setAttribute = (name: string, value: string) => {
      if (name === 'style') node.style = value
    }
    node.getAttribute = (name: string) => (name === 'style' ? node.style : null)
    node.append = (...kids: FakeNode[]) => node.children.push(...kids)
    node.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, ...node.size })
    Object.defineProperty(node, 'textContent', {
      set: (value: string) => {
        node.text = value
      },
      get: () => node.text,
    })
    return node
  }
  const host = {
    createElement: () => {
      const node = element()
      made.push(node)
      return node
    },
  }
  const layer = element()
  layer.size = room
  layer.replaceChildren = (...kids: FakeNode[]) => {
    layer.children = kids
  }
  Object.defineProperty(layer, 'firstElementChild', { get: () => layer.children[0] ?? null })
  const readout: ScreenView['dualCursorReadout'] = { lines: ['a', 'b', 'c'], at }
  showPointTip(host as unknown as Document, layer as unknown as HTMLElement, readout)
  const shown = layer.children[0] as FakeNode | undefined
  expect(shown, 'premise: the readout is in the layer').toBeDefined()
  const style = shown!.style.replace(/\s/g, '')
  const px = (name: string): number => Number(new RegExp(`(?:^|;)${name}:(-?[\\d.]+)px`).exec(style)?.[1])
  return { style, left: px('left'), top: px('top'), box }
}

const OFFSET = NOT_STORED_HELP_SIZES['S-460']
const MARGIN = NOT_STORED_HELP_SIZES['S-339']

describe('DC-3 / IN-7 -- where the readout stands', () => {
  it(`${DC_3_PLACE} / ${IN_7_BELOW}`, () => {
    const { style, left, top } = drawnReadout({ x: 100, y: 120 }, { width: 1000, height: 700 })
    expect(left).toBe(100)
    expect(top, 'S-460 below the point').toBe(120 + OFFSET)
    expect(style).toContain('pointer-events:none')
  })

  it(IN_7_RIGHT, () => {
    const { left, top, box } = drawnReadout({ x: 900, y: 120 }, { width: 1000, height: 700 })
    expect(left, 'turned to the left of the pointer').toBe(900 - box.width)
    expect(top).toBe(120 + OFFSET)
  })

  it(IN_7_LEFT, () => {
    const { left } = drawnReadout({ x: 100, y: 20 }, { width: 150, height: 700 })
    expect(left, 'neither side fits: the left edge stands S-339 in').toBe(MARGIN)
  })

  it(IN_7_BOTTOM, () => {
    const { left, top, box } = drawnReadout({ x: 100, y: 680 }, { width: 1000, height: 700 })
    expect(top, 'turned above the pointer').toBe(680 - OFFSET - box.height)
    expect(left).toBe(100)
  })

  it(IN_7_NOT_ABOVE, () => {
    const { top } = drawnReadout({ x: 100, y: 60 }, { width: 1000, height: 100 })
    expect(top, 'neither fits: it stays below').toBe(60 + OFFSET)
  })
})

const taskTooltips = (mode: Mode): number => {
  const stage = stageOf(STORED)
  const settings = stage.settings
  const readings = readingsAt(
    { x: stage.pointOn(2026, 4, 3).x, y: stage.middleY },
    // WHY: EZ-6, S-439 -- the task wait is its own value, not S-124 (CR-576)
    {
      pointerRestedMs: SETTINGS_CONSTANTS.taskHintDelayMs,
      hintTargetDwellMs: SETTINGS_CONSTANTS.taskHintDelayMs,
      hintHolderUnderPointer: { kind: 'task', taskUid: TASK.uid },
    },
  )
  const shown = { frame: { scrollbars: [] } } as unknown as Omit<ScreenView, 'tooltips'>
  return tooltipsFromScreenView(shown, settings, sessionIn(mode, STORED), readings, SCHEDULE).filter(
    (one) => one.anchor.kind === 'task',
  ).length
}

describe('EZ-6 -- not while the Dual Cursor mode stands', () => {
  it(DC_3_NO_EZ_6, () => {
    expect(taskTooltips('off'), 'premise: out of the mode the task tooltip is due').toBe(1)
    expect(taskTooltips('placingDate1')).toBe(0)
  })

  it(EZ_6_NOT_IN_MODE, () => {
    expect(taskTooltips('off'), 'premise').toBe(1)
    expect(taskTooltips('placingDate2')).toBe(0)
  })
})

describe('DC-3 -- the export', () => {
  it(DC_3_NOT_EXPORTED, () => {
    const stage = stageOf(STORED)
    const geometry = geometryFromLayout(SCHEDULE, stage.settings, stage.layout, stage.regions, emptySelection(), STORED)
    const svg = svgFromSchedule(
      SCHEDULE,
      stage.settings,
      stage.layout,
      geometry,
      stage.regions,
      emptySelection(),
      'export',
      sessionIn('placingDate2', STORED).screen,
    )
    for (const word of [LEFT_WORD, RIGHT_WORD, SPAN_WORD, APRIL_2026[1] as string, '(14 days)']) {
      expect(svg).not.toContain(word)
    }
  })
})
