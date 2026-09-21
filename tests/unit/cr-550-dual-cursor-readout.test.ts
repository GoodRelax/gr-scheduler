// CR-550: the Dual Cursor readout beside the pointer (DC-3) and EZ-6 standing down in the mode.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
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
import { dualCursorReadoutOf, tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { showDualCursorReadout } from '../../src/framework/dom-screen-surface/tooltips-drawing'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const DC_3_THREE_LINES = '本モードにいるあいだ、ポインタのそばに 3 行を小さく示すこと（MUST）'
const DC_3_FOLLOWING = '⭐ 追従している側の日付は、その線がいま立っている日とすること（MUST）'
const DC_3_DATE = '線と字が同じ日を指す。日付は `yyyy/m/d` と書くこと（MUST）'
const DC_3_SPAN = '⭐ 期間は、2 つの日付のうち早いほうを E、遅いほうを L として、`y/m/d (n days)` の形で書くこと（MUST）'
const DC_3_ONE_DAY = 'n が 1 のときは `(1 day)` と書くこと（MUST）'
const DC_3_UNDECIDED = '日付が決まっていない側は、その行の日付と期間の行を `—` で示すこと（MUST）'
const DC_3_PLACE = '⭐ 置き方は、表 T-028 の `IN-3` が `FR-092` の `EZ-6` の説明に定める例外と同じとすること（MUST）'
const DC_3_RIGHT = '⭐ ポインタの右に置くと画面の右端に収まらないときは、ポインタの左へ返すこと（MUST）'
const DC_3_BOTTOM = 'ポインタの下に置くと画面の下端に収まらないときは、ポインタの上へ返すこと（MUST）'
const DC_3_NO_EZ_6 = '⛔ 本モードにいるあいだ、`EZ-6` の説明を出してはならない（MUST NOT）'
const DC_3_NOT_EXPORTED = '⛔ 書き出し（表 T-076）に出してはならない（MUST NOT）'
const EZ_6_NOT_IN_MODE =
  '⛔ `Dual Cursor` のモード（表 T-029a の `DC-1` から `DC-4` のあいだ）にいるあいだは、出してはならない（MUST NOT）'

const CLAUSES = [
  DC_3_THREE_LINES,
  DC_3_FOLLOWING,
  DC_3_DATE,
  DC_3_SPAN,
  DC_3_ONE_DAY,
  DC_3_UNDECIDED,
  DC_3_PLACE,
  DC_3_RIGHT,
  DC_3_BOTTOM,
  DC_3_NO_EZ_6,
  DC_3_NOT_EXPORTED,
  EZ_6_NOT_IN_MODE,
]

describe('CR-550 -- the clauses still stand in the manuscript', () => {
  it.each(CLAUSES)('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const A_WORD = 'カーソルAの日付: '
const B_WORD = 'カーソルBの日付: '
const SPAN_WORD = 'カーソルA-Bの期間: '
const UNDECIDED = '—'

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

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }

const TASK = {
  uid: 1,
  wbsParentUid: null,
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
      isCollapsed: null,
      isHidden: null,
      color: null,
      height: null,
    },
  ],
  taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

type Mode = 'off' | 'placingDate1' | 'placingDate2'

const sessionIn = (mode: Mode): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    language: 'ja',
    dualCursorModeState: mode === 'off' ? { kind: 'off' } : { kind: 'on', child: { kind: mode } },
  },
})

const readingsAt = (pointer: { x: number; y: number } | null, part: Record<string, unknown> = {}) =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    isAgentApiEnabled: false,
    pointer,
    pointerRestedMs: 0,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: 'light',
    themeHue: 214,
    selectedGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    rowBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
    ...part,
  }) as unknown as ScreenViewReadings

const stageOf = (stored: { date1: string; date2: string } | null) => {
  const settings = settingsOf({ dualCursor: stored })
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(SCHEDULE, settings, regions)
  const axis = timeAxisOf(settings, regions)
  const middleY = regions.rowArea.y + regions.rowArea.height / 2
  const pointOn = (year: number, month: number, day: number) => {
    const x = xFromDay(layout, { year, month, day })
    expect(dateAtX(axis, x), 'premise: the point stands on that day').toEqual({ year, month, day })
    return { x, y: middleY }
  }
  const readout = (mode: Mode, pointer: { x: number; y: number } | null) =>
    dualCursorReadoutOf(regions, settings, sessionIn(mode), readingsAt(pointer))
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
    expect(whileA?.lines[0], 'A follows: its line stands under the pointer').toBe(`${A_WORD}2026/4/10`)
    expect(whileA?.lines[1], 'B stays where it was placed').toBe(`${B_WORD}2026/4/15`)
    const whileB = stage.readout('placingDate2', point)
    expect(whileB?.lines[0]).toBe(`${A_WORD}2026/4/1`)
    expect(whileB?.lines[1]).toBe(`${B_WORD}2026/4/10`)
  })

  it(DC_3_DATE, () => {
    const stage = stageOf(STORED)
    const shown = stage.readout('placingDate2', stage.pointOn(2026, 4, 3))
    for (const line of (shown?.lines ?? []).slice(0, 2)) {
      expect(line).toMatch(/: \d{4}\/[1-9]\d?\/[1-9]\d?$/)
    }
    expect(shown?.lines[0], 'no zero padding: 2026/4/1').toBe(`${A_WORD}2026/4/1`)
  })

  it(DC_3_SPAN, () => {
    const examples = [
      [[2026, 4, 1], [2026, 4, 15], [0, 0, 14, 14]],
      [[2026, 1, 31], [2026, 2, 28], [0, 1, 0, 28]],
      [[2026, 1, 31], [2026, 3, 1], [0, 1, 1, 29]],
      [[2024, 2, 29], [2025, 2, 28], [1, 0, 0, 365]],
      [[2026, 4, 1], [2026, 4, 1], [0, 0, 0, 0]],
    ] as const
    for (const [a, b, [years, months, days, dayCount]] of examples) {
      const e = { year: a[0], month: a[1], day: a[2] }
      const l = { year: b[0], month: b[1], day: b[2] }
      expect(calendarSpanOf(e, l), `${a} .. ${b}`).toEqual({ years, months, days, dayCount })
      expect(calendarSpanOf(l, e), `${b} .. ${a}`).toEqual({ years, months, days, dayCount })
    }
    const stage = stageOf(STORED)
    expect(stage.readout('placingDate2', stage.pointOn(2026, 4, 15))?.lines[2]).toBe(`${SPAN_WORD}0/0/14 (14 days)`)
    const reversed = stageOf({ date1: '2026-04-15T00:00:00', date2: STORED.date2 })
    expect(reversed.readout('placingDate2', reversed.pointOn(2026, 4, 1))?.lines[2], 'A after B').toBe(
      `${SPAN_WORD}0/0/14 (14 days)`,
    )
  })

  it(DC_3_ONE_DAY, () => {
    const stage = stageOf(STORED)
    expect(stage.readout('placingDate2', stage.pointOn(2026, 4, 2))?.lines[2]).toBe(`${SPAN_WORD}0/0/1 (1 day)`)
  })

  it(DC_3_UNDECIDED, () => {
    const stage = stageOf(null)
    const shown = stage.readout('placingDate1', stage.pointOn(2026, 4, 10))
    expect(shown?.lines).toEqual([`${A_WORD}2026/4/10`, `${B_WORD}${UNDECIDED}`, `${SPAN_WORD}${UNDECIDED}`])
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
  showDualCursorReadout(host as unknown as Document, layer as unknown as HTMLElement, readout)
  const shown = layer.children[0] as FakeNode | undefined
  expect(shown, 'premise: the readout is in the layer').toBeDefined()
  const style = shown!.style.replace(/\s/g, '')
  const px = (name: string): number => Number(new RegExp(`(?:^|;)${name}:(-?[\\d.]+)px`).exec(style)?.[1])
  return { style, left: px('left'), top: px('top'), box }
}

describe('DC-3 -- where the readout stands', () => {
  it(DC_3_PLACE, () => {
    const { style, left, top } = drawnReadout({ x: 100, y: 120 }, { width: 1000, height: 700 })
    expect(left).toBe(100)
    expect(top).toBe(120)
    expect(style).toContain('pointer-events:none')
  })

  it(DC_3_RIGHT, () => {
    const { left, top, box } = drawnReadout({ x: 900, y: 120 }, { width: 1000, height: 700 })
    expect(left, 'turned to the left of the pointer').toBe(900 - box.width)
    expect(top).toBe(120)
  })

  it(DC_3_BOTTOM, () => {
    const { left, top, box } = drawnReadout({ x: 100, y: 680 }, { width: 1000, height: 700 })
    expect(top, 'turned above the pointer').toBe(680 - box.height)
    expect(left).toBe(100)
  })
})

const taskTooltips = (mode: Mode): number => {
  const stage = stageOf(STORED)
  const settings = stage.settings
  const readings = readingsAt(
    { x: stage.pointOn(2026, 4, 3).x, y: stage.middleY },
    { pointerRestedMs: settings.iconHintDelayMs, taskUnderPointer: TASK },
  )
  const shown = { frame: { scrollbars: [] } } as unknown as Omit<ScreenView, 'tooltips'>
  return tooltipsFromScreenView(shown, settings, sessionIn(mode), readings).filter(
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
    const geometry = geometryFromLayout(SCHEDULE, stage.settings, stage.layout, stage.regions, emptySelection())
    const svg = svgFromSchedule(
      SCHEDULE,
      stage.settings,
      stage.layout,
      geometry,
      stage.regions,
      emptySelection(),
      'export',
    )
    for (const word of [A_WORD, B_WORD, SPAN_WORD, '2026/4/1', '(14 days)']) expect(svg).not.toContain(word)
  })
})
