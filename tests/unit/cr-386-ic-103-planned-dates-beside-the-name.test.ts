// CR-386 / FR-002 / DFC-605: planned dates written after the name label, switched by IC-103.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { commandPaletteFromSession } from '../../src/adapter/screen-renderer/command-palette'
import type { ScreenPart, ScreenSurface, ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_002_NAME_SPACE_DATES =
  '`_assets/tbl-settings.md` の 表 T-202 の `S-232` が真のとき、名称ラベルの文字は、打ち切った後の名前に半角空白 1 つを続け、その後に 表 T-251 の予定日の文字を続けたものとすること（MUST）'
const FR_002_T_273_MEASURES_THE_DATES =
  '`FR-109` の 表 T-273 が「入る」を判ずるラベルは、予定日の文字を含めたこの文字とすること（MUST）'
const FR_002_DATES_NOT_TRUNCATED = '予定日の文字を打ち切ってはならず、`S-35` の長さに数えてもならない（MUST NOT）'
const FR_002_EMPTY_NAME = '名前が空のときは、半角空白を置かず、予定日の文字から書くこと（MUST）'
const FR_002_NOT_FROM_THE_VIEW = '予定日の文字を、表示している範囲・基準日・実行日から決めてはならない（MUST NOT）'
const FR_002_ONLY_S_232 =
  '予定の表示（表 T-202 の `S-227`）を隠していても、予定日の文字を添えるかどうかは `S-232` だけで決めること（MUST）'
const FR_002_FINISH_NOT_SHIFTED = '予定の終了日は `finish` の日そのものとし、翌日にずらしてはならない（MUST NOT）'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-002 (MUST) -- name, one half-width space, then the T-251 dates', FR_002_NAME_SPACE_DATES],
  ['FR-002 (MUST) -- table T-273 measures the label with the dates', FR_002_T_273_MEASURES_THE_DATES],
  ['FR-002 (MUST NOT) -- the dates are not truncated nor counted in S-35', FR_002_DATES_NOT_TRUNCATED],
  ['FR-002 (MUST) -- an empty name starts at the dates', FR_002_EMPTY_NAME],
  ['FR-002 (MUST NOT) -- not decided from the view, status date or run date', FR_002_NOT_FROM_THE_VIEW],
  ['FR-002 (MUST) -- decided by S-232 alone, whatever S-227 says', FR_002_ONLY_S_232],
  ['FR-002 (MUST NOT) -- the finish is not moved to the next day', FR_002_FINISH_NOT_SHIFTED],
]

describe('CR-386 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds table T-251 with ND-1 to ND-5, and S-232 as a boolean planDatesVisible defaulting to false', () => {
    expect(specTable('T-251').rows.map((row) => row.id)).toEqual(['ND-1', 'ND-2', 'ND-3', 'ND-4', 'ND-5'])
    const s232 = specTable('T-202').rows.find((row) => row.id === 'S-232')
    expect(bare(s232?.by['キー'] ?? '')).toBe(PLAN_DATES_KEY)
    expect(bare(s232?.by['型'] ?? '')).toBe('真偽')
    expect(bare(s232?.by['既定'] ?? '')).toBe('false')
  })
})

const PLAN_DATES_KEY = 'planDatesVisible'
const PLAN_VISIBLE_KEY = 'planVisible'
const DATES_ENTRY = 'IC-103'
const STATUS_DATE_ENTRY = 'IC-44'

// see ND-2
const TASK_DATES_JOINER = ' - '
// see FR-002
const NAME_DATES_JOINER = ' '

interface Dated {
  readonly start: string
  readonly finish: string
  readonly milestone: boolean
}

const yearOf = (day: string): number => Number(day.slice(0, 4))

// see ND-4, ND-5
const dayText = (day: string, withYear: boolean): string => {
  const [year, month, date] = day.split('-').map(Number)
  const monthDay = `${month}/${date}`
  return withYear ? `${String(Number(year) % 100).padStart(2, '0')}/${monthDay}` : monthDay
}

// see ND-5
const spansYears = (all: readonly Dated[]): boolean =>
  new Set(all.flatMap((one) => [yearOf(one.start), yearOf(one.finish)])).size > 1

// see ND-1, ND-2, ND-3
const datesText = (one: Dated, all: readonly Dated[]): string => {
  const withYear = spansYears(all)
  if (one.milestone) return dayText(one.start, withYear)
  return dayText(one.start, withYear) + TASK_DATES_JOINER + dayText(one.finish, withYear)
}

const labelText = (name: string, one: Dated, all: readonly Dated[]): string =>
  name === '' ? datesText(one, all) : name + NAME_DATES_JOINER + datesText(one, all)

describe('the derivation above, read against table T-251 by hand', () => {
  it('writes month/day unpadded, joins a task with space-dash-space, keeps the finish, and a milestone has one day', () => {
    const plain: Dated = { start: '2026-04-06', finish: '2026-04-08', milestone: false }
    const oneDay: Dated = { start: '2026-04-13', finish: '2026-04-13', milestone: false }
    const stone: Dated = { start: '2026-04-15', finish: '2026-04-15', milestone: true }
    const nextYear: Dated = { start: '2027-01-05', finish: '2027-01-06', milestone: false }
    expect(labelText('Alpha', plain, [plain])).toBe('Alpha 4/6 - 4/8')
    expect(labelText('Beta', oneDay, [oneDay])).toBe('Beta 4/13 - 4/13')
    expect(labelText('Gamma', stone, [stone])).toBe('Gamma 4/15')
    expect(labelText('', plain, [plain])).toBe('4/6 - 4/8')
    expect(labelText('Alpha', plain, [plain, nextYear])).toBe('Alpha 26/4/6 - 26/4/8')
    const early: Dated = { start: '2005-03-01', finish: '2005-03-01', milestone: true }
    expect(labelText('Delta', early, [early, nextYear])).toBe('Delta 05/3/1')
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const PX_PER_DAY_AT_1X = 20

interface Planned extends Dated {
  readonly uid: number
  readonly name: string
  readonly actual?: boolean
}

const ALPHA: Planned = { uid: 1, name: 'Alpha', start: '2026-04-06', finish: '2026-04-08', milestone: false }
const BETA: Planned = { uid: 2, name: 'Beta', start: '2026-04-13', finish: '2026-04-13', milestone: false }
const GAMMA: Planned = { uid: 3, name: 'Gamma', start: '2026-04-15', finish: '2026-04-15', milestone: true }
const NAMELESS: Planned = { uid: 4, name: '', start: '2026-04-20', finish: '2026-04-22', milestone: false }
// WHY: eight letters, not ten: CR-412's S-7 0.90 widens the name, and ten no longer fit inside the three days.
const NARROW: Planned = { uid: 5, name: 'abcdefgh', start: '2026-04-27', finish: '2026-04-29', milestone: false, actual: true }
const NEXT_YEAR: Planned = { uid: 6, name: 'Later', start: '2027-01-05', finish: '2027-01-06', milestone: false }

const SAME_YEAR: readonly Planned[] = [ALPHA, BETA, GAMMA, NAMELESS, NARROW]

const task = (one: Planned): Task =>
  ({
    uid: one.uid,
    wbsParentUid: null,
    wbsOrder: one.uid,
    name: one.name === '' ? null : one.name,
    start: one.start,
    finish: one.finish,
    milestone: one.milestone,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: one.actual === true ? one.start : null,
    stop: one.actual === true ? one.finish : null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  }) as unknown as Task

const rowIdOf = (uid: number): string => `0000000${uid}-0000-4000-8000-00000000000${uid}`

function fixtureDocument(planned: readonly Planned[], settings: Readonly<Record<string, unknown>>): Document {
  const template = structuredClone(TEMPLATE)
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
      tasks: planned.map(task),
      resources: [],
      assignments: [],
      taskGroups: planned.map((one, order) => ({
        id: rowIdOf(one.uid),
        parentId: null,
        label: `row ${order}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto', color: null,
        height: null,
      })),
      taskGroupMembers: planned.map((one) => ({ taskUid: one.uid, groupId: rowIdOf(one.uid), stackOrder: null })),
      taskVisuals: planned
        .filter((one) => one.milestone)
        .map((one) => ({
          taskUid: one.uid,
          shapeKind: 'milestone',
          milestoneGlyph: 'diamond',
          fillColor: null,
          strokeColor: null,
          lineWeight: null,
        })),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...template.documentSettings, pxPerDayAt1x: PX_PER_DAY_AT_1X, ...settings },
    documentStamp: template.documentStamp,
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }
const PALETTE_BOX: ScreenRect = { x: 8, y: SCREEN.height - 56, width: 120, height: 48 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const inside = (box: ScreenRect, at: Point): boolean =>
  at.x >= box.x && at.x < box.x + box.width && at.y >= box.y && at.y < box.y + box.height

const pointer = (phase: PointerPhase, at: Point): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

const realRaf = (globalThis as any).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  texts(): readonly string[]
}

const decoded = (text: string): string =>
  text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()

function stage(
  planned: readonly Planned[],
  settings: Readonly<Record<string, unknown>>,
  entry: string = DATES_ENTRY,
): Stage {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  const pictures: string[] = []
  const run = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (x, y): ScreenPart | null =>
      inside(PALETTE_BOX, { x, y })
        ? {
            part: 'Command Palette',
            entry,
            format: null,
            rowGroupId: null,
            resourceUid: null,
            dividerPanel: null,
            noticeDismissKey: null,
          }
        : null,
  }
  const loop = frameLoop(
    { showSvg: (svg: string) => void pictures.push(svg) } as any,
    fixtureDocument(planned, settings),
    SCREEN,
    { surface, language: 'en' },
  )
  run()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      run()
    },
    texts: () => {
      const svg = pictures[pictures.length - 1]
      if (svg === undefined) throw new Error('the loop never handed the surface a picture')
      return [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((hit) => decoded(hit[1] as string))
    },
  }
}

const settingOf = (loop: FrameLoop, key: string): unknown =>
  (loop.document().documentSettings as unknown as Record<string, unknown>)[key]

const pressDatesEntry = (built: Stage): void => {
  const at = { x: PALETTE_BOX.x + PALETTE_BOX.width / 2, y: PALETTE_BOX.y + PALETTE_BOX.height / 2 }
  built.send(pointer('down', at))
  built.send(pointer('up', at))
}

describe('T-109 IC-103 -- placed at the head of its group, left of IC-44', () => {
  it('the manuscript prints IC-103 directly before IC-44, in the same group, both on the Command Palette', () => {
    const rows = specTable('T-109').rows
    const at = rows.findIndex((row) => row.id === DATES_ENTRY)
    expect(rows[at + 1]?.id).toBe(STATUS_DATE_ENTRY)
    expect(bare(rows[at]?.by['群'] ?? '')).toBe(bare(rows[at + 1]?.by['群'] ?? ''))
    expect(rows[at]?.by['何の入口か'] ?? '').toContain('`S-232`')
  })

  it('the palette the renderer describes puts IC-103 immediately left of IC-44 in one group', () => {
    const settings = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings
    const root: ScreenSession = {
      ...emptyScreenSession,
      screen: {
        ...emptyScreenSession.screen,
        language: 'ja',
        dialogueFieldDisplayState: { kind: 'hidden' },
        milestoneListDisplayState: { kind: 'open' },
      },
    }
    const readings: ScreenViewReadings = {
      openedFileName: null,
      fileSavedAt: null,
      isAgentApiEnabled: false,
      pointer: null,
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
    }
    const palette = commandPaletteFromSession(root, settings, emptySelection(), readings)
    expect(palette, 'S-99e: the palette is showing').not.toBeNull()
    const group = palette?.groups.find((one) => one.commands.some((entry) => entry.icon === STATUS_DATE_ENTRY))
    const icons = (group?.commands ?? []).map((entry) => entry.icon as string)
    expect(icons.indexOf(DATES_ENTRY), `IC-103 stands left of IC-44 in ${JSON.stringify(icons)}`).toBe(
      icons.indexOf(STATUS_DATE_ENTRY) - 1,
    )
  })
})

describe('the bench -- a palette toggle that already exists is switched by the same press', () => {
  it('CONTROL: the Command Palette entry naming S-62 flips dependencyVisible through this harness', () => {
    const row = specTable('T-109').rows.find(
      (one) => (one.by['何の入口か'] ?? '').includes('`S-62`') && (one.by['面'] ?? '').includes('Command Palette'),
    )
    expect(row, 'table T-109 has a palette entry for S-62').toBeDefined()
    const built = stage(SAME_YEAR, { dependencyVisible: false }, row?.id ?? '')
    pressDatesEntry(built)
    expect(settingOf(built.loop, 'dependencyVisible'), `${row?.id} pressed once`).toBe(true)
  })
})

describe('FR-049 via IC-103 -- a press switches S-232', () => {
  it('turns planDatesVisible from false to true, and back on a second press', () => {
    const built = stage(SAME_YEAR, { [PLAN_DATES_KEY]: false })
    expect(settingOf(built.loop, PLAN_DATES_KEY), 'premise: S-232 starts false').toBe(false)
    pressDatesEntry(built)
    expect(settingOf(built.loop, PLAN_DATES_KEY), 'IC-103 pressed once').toBe(true)
    pressDatesEntry(built)
    expect(settingOf(built.loop, PLAN_DATES_KEY), 'IC-103 pressed twice').toBe(false)
  })

  it('writes the dates into the picture after the press, where none stood before', () => {
    const built = stage(SAME_YEAR, { [PLAN_DATES_KEY]: false })
    const wanted = labelText(ALPHA.name, ALPHA, SAME_YEAR)
    expect(built.texts()).not.toContain(wanted)
    pressDatesEntry(built)
    expect(built.texts(), FR_002_NAME_SPACE_DATES).toContain(wanted)
  })
})

describe(`FR-002 (MUST) -- ${FR_002_NAME_SPACE_DATES}`, () => {
  for (const one of SAME_YEAR.filter((each) => each.name !== '')) {
    it(`S-232 true: ${one.name} reads name, space, T-251 dates`, () => {
      const built = stage(SAME_YEAR, { [PLAN_DATES_KEY]: true })
      expect(built.texts(), `${FR_002_NAME_SPACE_DATES} / ${FR_002_FINISH_NOT_SHIFTED}`).toContain(
        labelText(one.name, one, SAME_YEAR),
      )
    })
  }

  it(`S-232 true, empty name: ${FR_002_EMPTY_NAME}`, () => {
    const built = stage(SAME_YEAR, { [PLAN_DATES_KEY]: true })
    expect(built.texts(), FR_002_EMPTY_NAME).toContain(labelText('', NAMELESS, SAME_YEAR))
  })

  it('S-232 true across two calendar years: every date carries its year (ND-5)', () => {
    const all = [...SAME_YEAR, NEXT_YEAR]
    const built = stage(all, { [PLAN_DATES_KEY]: true })
    expect(built.texts()).toContain(labelText(ALPHA.name, ALPHA, all))
    expect(built.texts()).toContain(labelText(GAMMA.name, GAMMA, all))
  })

  it('S-232 false: the name stands alone and no date text is added', () => {
    const built = stage(SAME_YEAR, { [PLAN_DATES_KEY]: false })
    const texts = built.texts()
    expect(texts, 'premise: the name label is drawn').toContain(ALPHA.name)
    for (const one of SAME_YEAR) {
      expect(texts.filter((text) => text.includes(datesText(one, SAME_YEAR))), one.name).toEqual([])
    }
  })

  it(`S-227 hidden, S-232 true: ${FR_002_ONLY_S_232}`, () => {
    const built = stage(SAME_YEAR, { [PLAN_DATES_KEY]: true, [PLAN_VISIBLE_KEY]: false })
    expect(built.texts(), FR_002_ONLY_S_232).toContain(labelText(ALPHA.name, ALPHA, SAME_YEAR))
  })
})

describe(`FR-002 (MUST) -- ${FR_002_T_273_MEASURES_THE_DATES}`, () => {
  const placementOf = (built: Stage) =>
    built.loop.current()?.layout.placements.find((one) => one.taskUid === NARROW.uid)?.labelPlacement

  // see FR-039, OP-10
  // WHY: a view held by the document, not the FR-055 fit -- since S-332 the fit spreads these four weeks
  // over the Row Area, and at that zoom the name and its dates fit inside the three days together.
  const AT_THE_DEFAULT_STEP = {
    displayScale: DEFAULT_DISPLAY_SCALE,
    zoomX: 2,
    zoomY: 1,
    scrollDate: '2026-04-01',
    scrollGroupId: rowIdOf(ALPHA.uid),
  }

  it('a name that fits inside its shape alone goes outside once the dates are added', () => {
    expect(
      placementOf(stage(SAME_YEAR, { ...AT_THE_DEFAULT_STEP, [PLAN_DATES_KEY]: false })),
      'premise: the bare name fits inside',
    ).toBe('inside')
    expect(
      placementOf(stage(SAME_YEAR, { ...AT_THE_DEFAULT_STEP, [PLAN_DATES_KEY]: true })),
      FR_002_T_273_MEASURES_THE_DATES,
    ).toBe('right')
  })
})
