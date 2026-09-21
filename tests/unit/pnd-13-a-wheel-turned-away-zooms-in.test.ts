// PND-13 -- which way a wheel turn magnifies: turned away from the user, it zooms in (MK-2 .. MK-4).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import {
  commandFromInput,
  type InputContext,
  type InputModifiers,
  type WheelInput,
} from '../../src/adapter/input-command-translator/input-command-translator'

const settingsOf = (): DocumentSettings => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const group = (built[head] ?? {}) as Record<string, unknown>
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return { ...built, scrollDate: '2026-01-01', scrollGroupId: 'g1', zoomX: 1, zoomY: 1.2 } as unknown as DocumentSettings
}

const SCHEDULE = {
  project: { calendarUid: null, statusDate: null, themeHue: 214, title: null, uidHighWaterMark: 1 },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: [
    { id: 'g1', parentId: null, label: 'one', order: 0, height: null, isKeptOpen: false },
    { id: 'g2', parentId: null, label: 'two', order: 1, height: null, isKeptOpen: false },
  ],
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }

const contextOf = (): InputContext => {
  const settings = settingsOf()
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(SCHEDULE, settings, regions)
  return {
    document: { schedule: SCHEDULE, documentSettings: settings } as unknown as Document,
    layout,
    geometry: geometryFromLayout(SCHEDULE, settings, layout, regions, emptySelection()),
    regions,
    screenState: emptyScreenState(),
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
  }
}

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

// WHY: a wheel turned away is reported with a negative deltaY, so -100 is one notch away.
const turnedAway = (context: InputContext, mods: Partial<InputModifiers>): WheelInput => {
  const area = context.regions.rowArea
  return {
    kind: 'wheel',
    x: area.x + area.width / 2,
    y: area.y + area.height / 2,
    modifiers: { ...NO_MODS, ...mods },
    notches: -1,
    scrollPx: { x: 0, y: -100 },
  }
}

const zoomAfter = (mods: Partial<InputModifiers>): { readonly zoomX: number; readonly zoomY: number } => {
  const context = contextOf()
  const action = commandFromInput(turnedAway(context, mods), context).action
  if (action === null || action.kind !== 'changeDocument') throw new Error('the wheel wrote nothing')
  const zoom = action.writes.flat().find((one) => one.kind === 'setZoom')
  if (zoom === undefined || zoom.kind !== 'setZoom') throw new Error('the wheel wrote no zoom')
  return { zoomX: zoom.zoomX ?? 1, zoomY: zoom.zoomY ?? 1.2 }
}

describe('PND-13 -- a wheel turned away from the user zooms in', () => {
  it('MK-2: Ctrl + wheel away enlarges both axes', () => {
    const zoom = zoomAfter({ ctrl: true })
    expect(zoom.zoomX).toBeGreaterThan(1)
    expect(zoom.zoomY).toBeGreaterThan(1.2)
  })

  it('MK-3: Shift + wheel away enlarges the time axis', () => {
    expect(zoomAfter({ shift: true }).zoomX).toBeGreaterThan(1)
  })

  it('MK-4: Alt + wheel away enlarges the row axis', () => {
    expect(zoomAfter({ alt: true }).zoomY).toBeGreaterThan(1.2)
  })
})
