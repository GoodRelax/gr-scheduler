// CR-438 stage-5 spec-only cases for wheel input and the zoom limits: UF-91, UF-92 (T-023, FR-016, T-253, T-262).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import {
  commandFromInput,
  rowBandCeilingOf,
  type InputContext,
  type InputModifiers,
  type TranslatedInput,
  type WheelInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { bare, specTable } from '../contract/spec-table'

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
    scrollDate: '2026-01-01',
    scrollGroupId: 'g1',
    stackDirection: 'down',
    rulerHeight: 48,
    rulerFont: 12,
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    percentComplete: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const SCHEDULE = {
  project: { calendarUid: null, statusDate: null, themeHue: 214, title: null, uidHighWaterMark: 10 },
  calendars: [],
  tasks: [
    taskOf({ uid: 1, name: 'one', start: '2026-01-05', finish: '2026-01-09' }),
    taskOf({ uid: 2, name: 'two', start: '2026-02-10', finish: '2026-02-14' }),
  ],
  resources: [],
  assignments: [],
  taskGroups: Array.from({ length: 24 }, (_unused, index) => ({
    id: `g${index + 1}`,
    parentId: null,
    label: `row ${index + 1}`,
    order: index,
    height: null,
  })),
  taskGroupMembers: [
    { groupId: 'g1', taskUid: 1 },
    { groupId: 'g2', taskUid: 2 },
  ],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const documentOf = (settings: DocumentSettings): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule: SCHEDULE,
    documentSettings: settings,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const contextOf = (settingsPart: Record<string, unknown> = {}, part: Partial<InputContext> = {}): InputContext => {
  const settings = settingsOf(settingsPart)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(SCHEDULE, settings, regions)
  return {
    document: documentOf(settings),
    layout,
    geometry: geometryFromLayout(SCHEDULE, settings, layout, regions, emptySelection()),
    regions,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    zoomStep: 1.1,
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
    ...part,
  }
}

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const wheelOf = (context: InputContext, notches: number, mods: Partial<InputModifiers> = {}): WheelInput => {
  const area = context.regions.rowArea
  return {
    kind: 'wheel',
    x: area.x + area.width / 2,
    y: area.y + area.height / 2,
    modifiers: { ...NO_MODS, ...mods },
    notches,
    scrollPx: { x: notches * 60, y: notches * 100 },
  }
}

function commandsOf(answer: TranslatedInput): readonly DocumentCommand[] {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat()
}

const ofKind = (answer: TranslatedInput, kind: string): readonly Record<string, unknown>[] =>
  commandsOf(answer)
    .filter((one) => one.kind === kind)
    .map((one) => one as unknown as Record<string, unknown>)

const zoomOf = (answer: TranslatedInput): { readonly zoomX: number; readonly zoomY: number } | null => {
  const found = ofKind(answer, 'setZoom')
  if (found.length === 0) return null
  expect(found).toHaveLength(1)
  return { zoomX: found[0]!['zoomX'] as number, zoomY: found[0]!['zoomY'] as number }
}

const numberOf = (table: string, row: string, column: string): number => {
  const found = specTable(table).rows.find((one) => one.id === row)
  const value = Number(/-?\d+(?:\.\d+)?/.exec(bare(found?.by[column] ?? ''))?.[0] ?? Number.NaN)
  if (!Number.isFinite(value)) throw new Error(`table ${table} row ${row} column ${column} holds no number`)
  return value
}

const S_54 = numberOf('T-201', 'S-54', '既定値')
const S_55 = numberOf('T-201', 'S-55', '既定値')
const S_229 = numberOf('T-206', 'S-229', '既定')

const inSign = (mods: Partial<InputModifiers>, axis: 'zoomX' | 'zoomY'): number => {
  const context = contextOf({ zoomX: 1, zoomY: 1.2 })
  const plus = zoomOf(commandFromInput(wheelOf(context, 1, mods), context))
  const minus = zoomOf(commandFromInput(wheelOf(context, -1, mods), context))
  expect(plus).not.toBeNull()
  expect(minus).not.toBeNull()
  return plus![axis] > minus![axis] ? 1 : -1
}

describe('UF-91 table T-023 MK-1 .. MK-5 (FR-016) -- the wheel and its modifiers', () => {
  it('MK-1: a bare wheel scrolls and writes no zoom', () => {
    const context = contextOf({ zoomX: 1, zoomY: 1.2 })
    const answer = commandFromInput(wheelOf(context, 1), context)
    expect(zoomOf(answer)).toBeNull()
    expect(ofKind(answer, 'setScrollPosition')).toHaveLength(1)
  })

  it('MK-2: Ctrl+wheel zooms both axes by the same factor', () => {
    const context = contextOf({ zoomX: 1, zoomY: 1.2 })
    const zoomed = zoomOf(commandFromInput(wheelOf(context, -1, { ctrl: true }), context))
    expect(zoomed).not.toBeNull()
    expect(zoomed!.zoomX / 1).toBeCloseTo(zoomed!.zoomY / 1.2, 10)
    expect(zoomed!.zoomX).not.toBeCloseTo(1, 10)
  })

  it('MK-3: Shift+wheel zooms the time axis only', () => {
    const context = contextOf({ zoomX: 1, zoomY: 1.2 })
    const zoomed = zoomOf(commandFromInput(wheelOf(context, 1, { shift: true }), context))
    expect(zoomed!.zoomY).toBeCloseTo(1.2, 10)
    expect(zoomed!.zoomX).not.toBeCloseTo(1, 10)
  })

  it('MK-4: Alt+wheel zooms the row axis only', () => {
    const context = contextOf({ zoomX: 1, zoomY: 1.2 })
    const zoomed = zoomOf(commandFromInput(wheelOf(context, 1, { alt: true }), context))
    expect(zoomed!.zoomX).toBeCloseTo(1, 10)
    expect(zoomed!.zoomY).not.toBeCloseTo(1.2, 10)
  })

  it('MK-5: Ctrl+Shift+wheel scrolls sideways, writes no zoom and keeps the row at the top', () => {
    const context = contextOf({ zoomX: 1, zoomY: 1.2 })
    const answer = commandFromInput(wheelOf(context, 1, { ctrl: true, shift: true }), context)
    expect(zoomOf(answer)).toBeNull()
    const scrolled = ofKind(answer, 'setScrollPosition')
    expect(scrolled).toHaveLength(1)
    expect(scrolled[0]!['scrollGroupId']).toBe('g1')
  })

  it.each([
    ['MK-1', {}],
    ['MK-2', { ctrl: true }],
    ['MK-3', { shift: true }],
    ['MK-4', { alt: true }],
    ['MK-5', { ctrl: true, shift: true }],
  ] as const)('T-023 closing rule (MUST): while a surface stands, %s is handed to the browser', (_row, mods) => {
    const context = contextOf({ zoomX: 1, zoomY: 1.2 }, { isSurfaceStanding: true })
    const answer = commandFromInput(wheelOf(context, 1, mods), context)
    expect(answer.action).toBeNull()
    expect(answer.isBrowserDefaultStopped).toBe(false)
  })
})

describe('UF-92 FR-016 / table T-253 / table T-262 -- where zooming stops', () => {
  it('FR-016 (MUST): the row ceiling does not depend on the zoomY the zoom starts from', () => {
    const low = rowBandCeilingOf(contextOf({ zoomY: 0.3 }))
    expect(rowBandCeilingOf(contextOf({ zoomY: 1.2 }))).toBeCloseTo(low, 9)
    expect(rowBandCeilingOf(contextOf({ zoomY: 3 }))).toBeCloseTo(low, 9)
  })

  it('BC-1 / BC-3: the band-side ceiling lies inside the S-76 range S-54 .. S-55', () => {
    const ceiling = rowBandCeilingOf(contextOf())
    expect(ceiling).toBeGreaterThanOrEqual(S_54)
    expect(ceiling).toBeLessThanOrEqual(S_55)
  })

  it('ZE-3 / ZE-4 / ZE-5: zooming the row axis in stops, writes nothing at the end and says "max"', () => {
    const sign = inSign({ alt: true }, 'zoomY')
    let zoomY = 1
    let last: TranslatedInput | null = null
    for (let press = 0; press < 200; press += 1) {
      const context = contextOf({ zoomX: 1, zoomY })
      last = commandFromInput(wheelOf(context, sign, { alt: true }), context)
      const zoomed = zoomOf(last)
      if (zoomed === null) break
      expect(zoomed.zoomY).toBeGreaterThan(zoomY)
      zoomY = zoomed.zoomY
    }
    expect(zoomOf(last!)).toBeNull()
    expect(last!.rowZoomEndShown?.end).toBe('max')
    expect(last!.rowZoomEndShown?.zoomY).toBeCloseTo(zoomY, 9)
    expect(zoomY).toBeLessThanOrEqual(rowBandCeilingOf(contextOf({ zoomY })) + 1e-9)
  })

  it('ZE-2 / ZE-5: at the S-76 floor, zooming the row axis out writes nothing and says "min"', () => {
    const sign = -inSign({ alt: true }, 'zoomY')
    const context = contextOf({ zoomX: 1, zoomY: S_54 })
    const answer = commandFromInput(wheelOf(context, sign, { alt: true }), context)
    expect(zoomOf(answer)).toBeNull()
    expect(answer.rowZoomEndShown?.end).toBe('min')
  })

  it('FR-016 (MUST): zooming the time axis in stops where S-229 days are still in view', () => {
    const sign = inSign({ shift: true }, 'zoomX')
    let zoomX = 1
    for (let press = 0; press < 400; press += 1) {
      const context = contextOf({ zoomX, zoomY: 1.2 }, { zoomStep: 1.5 })
      const zoomed = zoomOf(commandFromInput(wheelOf(context, sign, { shift: true }), context))
      if (zoomed === null || zoomed.zoomX <= zoomX) break
      zoomX = zoomed.zoomX
    }
    const stopped = contextOf({ zoomX, zoomY: 1.2 })
    expect(stopped.regions.rowArea.width / stopped.layout.pxPerDay).toBeCloseTo(S_229, 6)
  })
})
