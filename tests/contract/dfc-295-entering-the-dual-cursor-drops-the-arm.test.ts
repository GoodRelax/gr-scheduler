// Contract tests: entering the Dual Cursor mode drops the arm (table T-023b closing paragraph).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { type DualCursorSide } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-surface'
import {
  screenEventFromInput,
  type Armed,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenValues,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { specTable, unbroken } from './spec-table'

// Why: Japanese in code: these strings are the clauses, the exception rule 03 section 5
// admits, and matching them against the manuscript ties the cases to the spec.
const THE_CLAUSE =
  '`Dual Cursor` モード（表 T-029a）に入るとき、`GRS` は構えを外すこと。'

const THE_REASON = '`IMPS-1503` —— `Dual Cursor` モードは作成・移動・編集を受け付けないので、構えたまま入れると何も起きない構えが残る。'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const T_109 = specTable('T-109')

const IC_45 = 'IC-45'

const armRowOfEntry = (entry: string): string => {
  const row = T_109.rows.find((one) => one.id === entry)
  if (row === undefined) throw new Error(`table T-109 has no row ${entry}`)
  const last = row.cells[row.cells.length - 1] ?? ''
  return last.replace(/[`*\s]/g, '')
}

// Why: inert numbers, not the manuscript's: the layout exists only because InputContext
// needs ADR-001's three values, and the member under test reads none of them.
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontSizeStepSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...NESTED, ...part }) as unknown as DocumentSettings

const ROW_ID = 'r-alfa'

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01',
  scrollTaskGroupId: ROW_ID,
  stackDirection: 'down',
})

const SCHEDULE = {
  project: {
    calendarUid: null,
    statusDate: null,
    themeHue: 214,
    title: null,
    uidHighWaterMark: 0,
    outlineBase: 1,
  },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: [{ id: ROW_ID, parentId: null, label: 'task group', order: 0, minHeight: null }],
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  propertyPanelWidth: 0,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection(), null)

const DOCUMENT = {
  schemaVersion: '2026-01-01',
  schedule: SCHEDULE,
  documentSettings: SETTINGS,
  documentStamp: {
    scheduleUpdatedAt: '2026-01-01T00:00:00Z',
    lastEditedBy: 'test',
    settingsUpdatedAt: '2026-01-01T00:00:00Z',
  },
  changeLog: [],
} as unknown as Document

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointerOf = (phase: PointerInput['phase']): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  // Why: inert coordinates: the palette has no rectangle in ScreenRegions, so the entry
  // the press landed on is read, never x or y.
  x: 1,
  y: 1,
  modifiers: NO_MODS,
  clickCount: 1,
})

const COMMAND_PALETTE = 'Command Palette'

const partOf = (entry: string): ScreenPart => ({
  part: COMMAND_PALETTE,
  entry,
  format: null,
  taskGroupId: null,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
})

// Why: pressRow is inert here: T-023a's order applies to the schedule area only and every
// press lands on the palette; PTD-5 only fills the type.
const pressOn = (entry: string): PointerPress => ({
  at: pointerOf('down'),
  hit: null,
  on: partOf(entry),
  pressRow: 'PTD-5',
})

const BASE: InputContext = {
  document: DOCUMENT,
  layout: LAYOUT,
  geometry: GEOMETRY,
  regions: REGIONS,
  screen: emptyScreenSession.screen,
  selection: emptySelection(),
  zoomStep: 3,
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  pressed: null,
  isTextEntryUnsettled: false,
  isSurfaceStanding: false,
  dualCursorFollowing: null,
  today: '2026-03-01T00:00:00',
  newTaskGroupId: 'task-group-minted-outside',
  newCommentBoxId: 'comment-box-minted-outside',
  newHighlightBoxId: 'highlight-box-minted-outside',
}

// Spec: IN-1
// Why: the release is handed in, since IN-1 settles a pointer operation there; the press
// travels in InputContext.pressed.
const pressing = (
  entry: string,
  given: ScreenValues,
  dualCursorFollowing: DualCursorSide | null = null,
): ScreenValues => {
  // Why: the mode lives in the screen values (T-280); the following side the shell hands in is read off it.
  const screen = inTheMode(given, dualCursorFollowing)
  const event = screenEventFromInput(pointerOf('up'), {
    ...BASE,
    screen,
    pressed: pressOn(entry),
    dualCursorFollowing,
  })
  if (event === null) return screen
  return advanceScreenSession({ ...emptyScreenSession, screen }, event).state.screen
}

const inTheMode = (screen: ScreenValues, side: DualCursorSide | null): ScreenValues =>
  side === null
    ? screen
    : {
        ...screen,
        dualCursorModeState: { kind: 'on', child: { kind: side === 'cursorA' ? 'placingCursorA' : 'placingCursorB' } },
        dualCursor: { cursorADate: '2026-03-02', cursorBDate: '2026-03-05' },
      }

const ARMS: ReadonlyArray<{ readonly row: string; readonly armed: Armed }> = [
  { row: 'AR-2', armed: { kind: 'taskShapeArmed', shapeKind: 'SH-1' } },
  { row: 'AR-3', armed: { kind: 'milestoneShapeArmed', glyph: 'IC-30' } },
  { row: 'AR-4', armed: { kind: 'dependencyArmed' } },
  { row: 'AR-5', armed: { kind: 'commentBoxArmed' } },
  { row: 'AR-6', armed: { kind: 'highlightBoxArmed' } },
  { row: 'AR-7', armed: { kind: 'parentTaskArmed' } },
]

const armState = (armed: Armed): ScreenValues['armModeState'] => ({ kind: 'armed', child: armed })

const armedWith = (armed: Armed): ScreenValues => ({ ...emptyScreenSession.screen, armModeState: armState(armed) })

describe('DFC-295 -- the manuscript this file is driven by', () => {
  it("still closes table T-023b with the sentence about entering the mode", () => {
    expect(REQUIREMENTS).toContain(THE_CLAUSE)
    expect(REQUIREMENTS).toContain(THE_REASON)
  })

  it('still puts the Dual Cursor entrance on IC-45, and still arms nothing with it', () => {
    // Why: if IC-45 itself armed something, entering would drop its own arm, so it must arm
    // nothing.
    const row = T_109.rows.find((one) => one.id === IC_45)
    expect(row, 'table T-109 has no row IC-45').toBeDefined()
    expect(row?.cells.join(' ')).toContain('FR-082')
    expect(armRowOfEntry(IC_45)).toBe('—')
  })

  it('still names the same entrance as the way in AND the way out (DC-1 / DC-4)', () => {
    // Why: DC-4 makes the same press the exit, so a build un-arming on every IC-45 press would
    // obey the clause and break DC-4's case.
    const t029a = specTable('T-029a')
    const dc1 = t029a.rows.find((one) => one.id === 'DC-1')
    const dc4 = t029a.rows.find((one) => one.id === 'DC-4')
    expect(dc1?.cells.join(' ')).toContain('パレットの `Dual Cursor` の入口を押す')
    expect(dc4?.cells.join(' ')).toContain('同じ入口の再押下')
  })

  it('still gives the arm six values other than AR-1, and this file drives all of them', () => {
    const t023b = specTable('T-023b')
    const rows = t023b.rows.map((one) => one.id)
    expect(rows).toEqual(['AR-1', 'AR-2', 'AR-3', 'AR-4', 'AR-5', 'AR-6', 'AR-7'])
    expect(ARMS.map((one) => one.row)).toEqual(['AR-2', 'AR-3', 'AR-4', 'AR-5', 'AR-6', 'AR-7'])
  })
})

// Spec: T-023b, DC-1, IC-45
describe('T-023b closing paragraph (MUST) -- entering the Dual Cursor drops the arm', () => {
  it.each(ARMS)('drops $row when IC-45 is pressed and the mode is not up', ({ armed }) => {
    const after = pressing(IC_45, armedWith(armed), null)
    expect(after.armModeState).toEqual({ kind: 'notArmed' })
  })

  it('leaves the rest of the screen state alone while it drops the arm', () => {
    // Why: a build answering a freshly emptied state would pass the case above while closing
    // an open surface, the palette or full screen.
    const before: ScreenValues = {
      ...emptyScreenSession.screen,
      armModeState: armState({ kind: 'dependencyArmed' }),
      paletteDisplayState: { kind: 'hidden' },
      fullScreenModeState: { kind: 'full' },
      openSurfaceState: { kind: 'open', surfaceName: 'U-53' },
    }
    const after = pressing(IC_45, before, null)
    expect(after.armModeState).toEqual({ kind: 'notArmed' })
    // Why: entering is itself a move of the mode and its two dates (DC-1, T-280); nothing else may move.
    const rest = (one: ScreenValues) => ({ ...one, armModeState: null, dualCursorModeState: null, dualCursor: null })
    expect(after.dualCursorModeState.kind, 'IC-45 entered the mode').toBe('on')
    expect(rest(after)).toEqual(rest(before))
  })

  it('is idempotent: pressing IC-45 with nothing armed still answers AR-1', () => {
    expect(pressing(IC_45, emptyScreenSession.screen, null).armModeState).toEqual({ kind: 'notArmed' })
  })
})

// Spec: DC-4, DC-2
describe('T-029a DC-4 -- going out leaves the arm alone', () => {
  it.each(ARMS)('keeps $row when IC-45 is pressed while a side is following', ({ armed }) => {
    // Why: dualCursorFollowing set means in the mode, and DC-4's exit says nothing of the arm,
    // so un-arming on the way out would add a rule.
    const before = armedWith(armed)
    const after = pressing(IC_45, before, 'cursorA')
    expect(after.armModeState).toEqual(armState(armed))
  })

  it('answers the same whichever side is following', () => {
    // Why: DC-2 swaps the following side on every click, so both are reachable at DC-4's press.
    for (const side of ['cursorA', 'cursorB'] as const satisfies readonly DualCursorSide[]) {
      expect(pressing(IC_45, armedWith({ kind: 'commentBoxArmed' }), side).armModeState, side).toEqual(
        armState({ kind: 'commentBoxArmed' }),
      )
    }
  })
})

// Spec: FR-083, SP-1, SP-4
// Why: every case above passes on a build that answers AR-1 to every press, so these must
// move the other way.
describe('FR-083 SP-1 / SP-4 -- the arming entrances still arm and still un-arm', () => {
  const ARMING_ENTRIES = T_109.rows
    .map((one) => one.id)
    .filter((id) => /^AR-[2-7]$/.test(armRowOfEntry(id)))

  it('drives at least one entrance per arming row of table T-023b', () => {
    // Why: if table T-109 stopped marking an entrance, the cases below would pass over an
    // empty list.
    const rowsCovered = new Set(ARMING_ENTRIES.map(armRowOfEntry))
    expect([...rowsCovered].sort()).toEqual(['AR-2', 'AR-3', 'AR-4', 'AR-5', 'AR-6', 'AR-7'])
    expect([...rowsCovered].sort()).toEqual(ARMS.map((one) => one.row))
    expect(ARMING_ENTRIES.length).toBeGreaterThan(4)
  })

  it('SP-1: a press with nothing selected arms that entrance, and does NOT answer none', () => {
    for (const entry of ARMING_ENTRIES) {
      const after = pressing(entry, emptyScreenSession.screen, null)
      expect(after.armModeState.kind, `${entry} (${armRowOfEntry(entry)}) armed nothing`).not.toBe('notArmed')
    }
  })

  it('SP-4: pressing the entrance that is already armed un-arms it', () => {
    // Why: Esc's half of the clause (IN-4) is not driven here, and every press has an empty
    // selection, so the toggle's widened half is left to the milestone-entrance cases.
    for (const entry of ARMING_ENTRIES) {
      const armed = pressing(entry, emptyScreenSession.screen, null)
      const again = pressing(entry, armed, null)
      expect(again.armModeState, `${entry} did not un-arm on the second press`).toEqual({ kind: 'notArmed' })
    }
  })

  // Spec: IMPS-860, DC-5, FR-048
  it('the guide-cursor entrances touch the arm at neither end (FR-048)', () => {
    // Why: the guide-cursor entrances are IC-45's nearest neighbours that must not drop the
    // arm, so a rule that any cursor entrance clears it cannot pass.
    // Why: the family is read from the table, and the exact pair guards against a re-worded
    // column emptying the loop.
    const guideCursorEntries = T_109.rows
      .filter((one) => (one.by['正'] ?? '').replace(/[`*\s]/g, '') === 'FR-048')
      .map((one) => one.id)
    expect(guideCursorEntries, 'table T-109 hands no entrance to FR-048').toEqual([
      'IC-47',
      'IC-48',
    ])
    for (const entry of guideCursorEntries) {
      expect(armRowOfEntry(entry), `${entry} is no longer a bare cursor entrance`).toBe('—')
      const after = pressing(entry, armedWith({ kind: 'highlightBoxArmed' }), null)
      expect(after.armModeState, entry).toEqual(armState({ kind: 'highlightBoxArmed' }))
    }
  })
})
