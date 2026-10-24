// DFC-2280 spec-only cases: T-280 -- S-99g open on a value that is no U row openSurfaceStateMachine.open carries draws no open surface, and the Search Panel, the Delay Diagnostics Report and the Properties Panel reach the screen through their own views, never as the open surface.

import { describe, expect, it } from 'vitest'

import { emptySearchPanelSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { OPENED_DELAY_DIAGNOSTICS_REPORT } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { specText } from './cr-727-stage'
import {
  LANGUAGES,
  OPEN_SURFACE_ROWS,
  SURFACE_HEADINGS,
  T_103_ROWS,
  namesOfRow,
  sessionOpenOn,
  sessionWith,
  viewOf,
} from './dfc-721-open-surface-stage'

const T_280_OPEN_CARRIES = '`openSurfaceStateMachine.open` —— 運ぶ値 `surfaceName`'
const S_99G_PANEL_IS_NO_SURFACE = '⚠️ プロパティパネルは面ではない'
const S_99G_HELP_IS_NO_SURFACE = '⭐ **ヘルプ（`U-30` の `Help Modal`）は面ではない**'
const FR_072_NO_TITLE_BAR = '⛔ **パネルの先頭にタイトルバーを置いてはならない（MUST NOT）**'

const SEARCH_PANEL = 'Search Panel'
const DELAY_REPORT = 'Delay Diagnostics Report'

// WHY: values the code once drew as surfaces (FR-074, FR-088) and window names the focus names; none is a T-280 row.
const NAMED_NON_ROWS: readonly string[] = ['FR-074', 'FR-088', SEARCH_PANEL, DELAY_REPORT, 'Properties Panel', 'Dialogue Field']

// see T-280, T-103
// WHY: every U row T-280 does not carry, and the settled name of every T-103 row (a name is not a row id)
const NON_ROWS: readonly string[] = [
  ...new Set([
    ...NAMED_NON_ROWS,
    ...T_103_ROWS.filter((row) => !OPEN_SURFACE_ROWS.includes(row)),
    ...T_103_ROWS.flatMap(namesOfRow),
  ]),
]

// see S-451, RW-1
// WHY: an empty diagnosis still raises the window
const NO_DELAY_FOUND = {
  outcome: 'diagnosed',
  statusDate: null,
  findings: [],
  bottlenecks: [],
  terminalPushOuts: [],
  walls: [],
  unreliableCount: 0,
  markerStates: [],
  settledPushOuts: [],
  derivedParentTasks: [],
  lateDays: [],
}

describe('DFC-2280 -- the manuscript these cases are driven by', () => {
  it('T-280, S-99g and FR-072 still state the carried rows, that panel and help are no surface, and the panel has no title bar', () => {
    expect(specText('_assets', 'tbl-state-machines.md')).toContain(T_280_OPEN_CARRIES)
    expect(specText('_assets', 'tbl-settings.md')).toContain(S_99G_PANEL_IS_NO_SURFACE)
    expect(specText('_assets', 'tbl-settings.md')).toContain(S_99G_HELP_IS_NO_SURFACE)
    expect(specText('01-04-requirements.md')).toContain(FR_072_NO_TITLE_BAR)
  })

  it('T-280 / T-103: none of the walked values is a carried row, and U-30 (Help Modal) is among them', () => {
    for (const value of NON_ROWS) expect(OPEN_SURFACE_ROWS, value).not.toContain(value)
    expect(NON_ROWS).toContain('U-30')
    expect(NON_ROWS).toContain('Holiday Settings')
  })
})

describe('DFC-2280 -- T-280 openSurfaceStateMachine.open: a value that is no carried row draws nothing', () => {
  it('S-99g open on every value outside the T-280 rows (FR-074, FR-088, Search Panel, U-30, ...) draws no open surface', () => {
    for (const value of NON_ROWS) {
      for (const language of LANGUAGES) {
        expect(viewOf(sessionOpenOn(value, language)).openModal, `${value} ${language}`).toBeNull()
      }
    }
  })

  it('control: S-99g open on each T-280 row does draw a surface, so the nulls above are not a blank stage', () => {
    for (const row of OPEN_SURFACE_ROWS) expect(viewOf(sessionOpenOn(row, 'ja')).openModal, row).not.toBeNull()
  })
})

describe('DFC-2280 -- T-280 / FR-038: the windows carry their headings through their own views', () => {
  it('Search Panel: shown by searchPanelDisplayState, headed by its dictionary word in view.searchPanel, with no open surface', () => {
    for (const language of LANGUAGES) {
      const view = viewOf(sessionWith(language, { searchPanelDisplayState: { kind: 'shown', child: { kind: 'normal' } } }), {
        searchPanel: emptySearchPanelSession,
      })
      expect(view.searchPanel?.heading, language).toBe(SURFACE_HEADINGS.get(SEARCH_PANEL)?.[language])
      expect(view.openModal, language).toBeNull()
    }
  })

  it('Delay Diagnostics Report: raised by the shell reading (S-451), headed by its dictionary word in view.delayDiagnosticsReport, with no open surface', () => {
    for (const language of LANGUAGES) {
      const view = viewOf(sessionWith(language, {}), {
        delayDiagnosticsReport: {
          window: OPENED_DELAY_DIAGNOSTICS_REPORT,
          report: NO_DELAY_FOUND,
          fixTables: { proposals: [], log: [] },
        },
      })
      expect(view.delayDiagnosticsReport?.heading, language).toBe(SURFACE_HEADINGS.get(DELAY_REPORT)?.[language])
      expect(view.openModal, language).toBeNull()
    }
  })

  it('control: with neither window shown, neither window view carries a heading', () => {
    const view = viewOf(sessionWith('ja', {}))
    expect(view.searchPanel?.heading ?? null).toBeNull()
    expect(view.delayDiagnosticsReport?.heading ?? null).toBeNull()
  })

  it('S-99g / FR-072: the Properties Panel shows in view.propertiesPanel, never as the open surface', () => {
    for (const language of LANGUAGES) {
      const view = viewOf(
        sessionWith(language, {
          propertiesPanelContentState: { kind: 'selectionDisplayed', subject: { selection: emptySelection(), taskGroupIds: [] } },
        }),
      )
      expect(view.propertiesPanel, language).not.toBeNull()
      expect(view.openModal, language).toBeNull()
    }
  })
})
