// DFC-1287 spec-only cases: with the Search Panel and another surface standing together, each IC-52 close shows its own explanation under itself (IN-3, EZ-2, IN-7, UZ-6, UZ-7, UZ-13).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  screenViewFromRegions,
  type ScreenView,
  type ScreenViewReadings,
  type Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { anchorKey } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { byRole, selfAndDescendants, surfaceOf, wire, type FakeElement } from '../fixtures/fake-browser'
import { REGIONS, SCHEDULE, SETTINGS } from './cr-727-stage'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const GLOSSARY = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8'))
const MACHINES = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-state-machines.md'), 'utf8'))

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// WHY: the clauses the cases rely on, word for word.
const EZ_2_SHOW = 'ポインタがアイコンに入ってから `_assets/tbl-settings.md` の `S-124` が経ったら、そのアイコンの説明を出すこと（MUST）。'
const EZ_2_STAYS = '⭐ 出した説明は、ポインタがそのアイコンの上にあるあいだ、消さず、置き場も動かさないこと（MUST）'
const EZ_2_EVERY_SURFACE = '載る面によって説明を出さない行があってはならない（MUST NOT）'
const IN_7_LEFT_EDGE = '⭐ 対象の左端に揃えて出すと窓の右端から `S-339` の内側に収まらないときは、説明の右端を対象の右端に揃えて出すこと（MUST）'
const UZ_7_STAYS = 'ほかの面を開いても閉じない'
const IC_52_SURFACES = '| IC-52 | `Help Modal` / `Resource List` / `Export Chooser` / `Open Chooser` / `Properties Panel` / `Search Panel` /'
const SEARCH_EVENT = '| `screen/searchEntryPressed` | 入力: `IC-117` ・ `SK-24` |'
const HELP_EVENT = '| `screen/helpEntryPressed` | 入力: `IC-22` ・ `SK-13` |'
const SURFACE_EVENT = '| `screen/surfaceEntryPressed` | 入力（`IC-132` は `surfaceName` に `U-65` を運ぶ）: `IC-2` ・ `SK-12` ・ `IC-132` | `surfaceName` |'

const CLOSE = 'IC-52'
const SEARCH_SURFACE = bare(rowOf('T-103', 'U-64').cells[0] ?? '')
const HELP_SURFACE = bare(rowOf('T-103', 'U-30').cells[0] ?? '')
const EXPORT_SURFACE = bare(rowOf('T-103', 'U-54').cells[0] ?? '')

describe('DFC-1287 -- the manuscript these cases are driven by', () => {
  it.each([EZ_2_SHOW, EZ_2_STAYS, EZ_2_EVERY_SURFACE, IN_7_LEFT_EDGE])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('UZ-6 holds the Search Panel, UZ-13 the Export Chooser, UZ-7 keeps the Help open beside other surfaces', () => {
    expect(rowOf('T-337', 'UZ-6').cells.join(' ')).toContain('`Search Panel`')
    expect(rowOf('T-337', 'UZ-13').cells.join(' ')).toContain('`Export Chooser`')
    expect(rowOf('T-337', 'UZ-7').cells.join(' ')).toContain(UZ_7_STAYS)
  })

  it('table T-109 IC-52 is the close of the Help, the Export Chooser and the Search Panel; T-103 names them', () => {
    expect(GLOSSARY).toContain(IC_52_SURFACES)
    expect([SEARCH_SURFACE, HELP_SURFACE, EXPORT_SURFACE]).toEqual(['Search Panel', 'Help Modal', 'Export Chooser'])
  })

  it.each([SEARCH_EVENT, HELP_EVENT, SURFACE_EVENT])('table T-280 still opens a window with: %s', (row) => {
    expect(MACHINES).toContain(row)
  })
})

// WHY: table T-280 names the events; the session reducer takes them without their region prefix.
const step = (session: ScreenSession, event: Record<string, unknown>): ScreenSession =>
  advanceScreenSession(session, event as unknown as SessionEvent).state

const SEATED: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: 'ja', helpLanguage: 'ja' },
}
const WITH_SEARCH = step(SEATED, { type: 'searchEntryPressed' })

type Other = 'help' | 'exportChooser'
type Place = 'searchPanel' | Other

const SCENES: Readonly<Record<Other, { readonly session: ScreenSession; readonly surface: string }>> = {
  help: { session: step(WITH_SEARCH, { type: 'helpEntryPressed' }), surface: HELP_SURFACE },
  exportChooser: { session: step(WITH_SEARCH, { type: 'surfaceEntryPressed', surfaceName: 'U-54' }), surface: EXPORT_SURFACE },
}

// WHY: a rested pointer on IC-52 (EZ-2: past S-124 since it entered); the flags say which window the pointer is over.
const readingsOn = (place: Place): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer: { x: 400, y: 300 },
    pointerRestedMs: SETTINGS_CONSTANTS.iconHintDelayMs,
    hintTargetDwellMs: SETTINGS_CONSTANTS.iconHintDelayMs,
    iconUnderPointer: CLOSE,
    isPointerOnHelp: place === 'help',
    isPointerOnSearchPanel: place === 'searchPanel',
    commandPaletteAt: { x: 500, y: 300 },
    themePreference: 'light',
    themeHue: 214,
    selectedTaskGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }) as unknown as ScreenViewReadings

const viewOf = (other: Other, place: Place): ScreenView =>
  screenViewFromRegions(REGIONS, SCHEDULE, SETTINGS, emptySelection(), SCENES[other].session, readingsOn(place))

const closeIn = (root: FakeElement, surface: string): FakeElement => {
  const window = byRole(root, surface)[0]
  if (window === undefined) throw new Error(`premise: nothing is drawn under data-role="${surface}"`)
  const found = selfAndDescendants(window).filter((one) => one.getAttribute('data-icon') === CLOSE)
  if (found.length !== 1) throw new Error(`premise: ${surface} draws ${String(found.length)} IC-52 entrances`)
  return found[0] as FakeElement
}

// WHY: each close is given a box of its own, so where the tooltip lands says which entrance it was drawn under.
const SEARCH_CLOSE_LEFT = 300
const OTHER_CLOSE_LEFT = 700
const CLOSE_SIDE = 20

function tooltipLeft(other: Other, place: Place): number {
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': 56 })
  const drawn = surfaceOf(built)
  const view = viewOf(other, place)
  drawn.showScreenView({ ...view, tooltips: [] })
  const boxAt = (left: number, bottom: number) => () => ({
    x: left,
    y: bottom - CLOSE_SIDE,
    left,
    top: bottom - CLOSE_SIDE,
    right: left + CLOSE_SIDE,
    bottom,
    width: CLOSE_SIDE,
    height: CLOSE_SIDE,
  })
  ;(closeIn(built.root(), SEARCH_SURFACE) as unknown as { getBoundingClientRect: unknown }).getBoundingClientRect = boxAt(SEARCH_CLOSE_LEFT, 400)
  ;(closeIn(built.root(), SCENES[other].surface) as unknown as { getBoundingClientRect: unknown }).getBoundingClientRect = boxAt(OTHER_CLOSE_LEFT, 60)
  drawn.showScreenView(view)
  const layer = byRole(built.root(), 'Tooltip')[0]
  const tip = layer?.children[0] as FakeElement | undefined
  if (tip === undefined) throw new Error('premise: a tooltip is drawn')
  const style = (tip.getAttribute('style') ?? '').replace(/\s/g, '')
  return Number(/(?:^|;)left:(-?[\d.]+)px/.exec(style)?.[1])
}

const OTHERS: readonly Other[] = ['help', 'exportChooser']

describe('IN-3 / EZ-2 / IN-7 (MUST): the explanation of IC-52 shows under the close the pointer rests on (DFC-1287, Search Panel part)', () => {
  it.each(OTHERS)('premise (UZ-6, UZ-7, UZ-13): the Search Panel and the %s stand together, each with one IC-52', (other) => {
    const view = viewOf(other, 'searchPanel')
    expect(view.searchPanel ?? null, 'the Search Panel stands').not.toBeNull()
    if (other === 'help') expect(view.helpModal ?? null, 'UZ-7: the Help stands beside it').not.toBeNull()
    else expect(view.openModal, 'UZ-13: the Export Chooser stands beside it').not.toBeNull()
    const built = wire({ preference: 'light', hue: 214 }, { 'App Header': 56 })
    surfaceOf(built).showScreenView({ ...view, tooltips: [] })
    expect(closeIn(built.root(), SEARCH_SURFACE)).toBeDefined()
    expect(closeIn(built.root(), SCENES[other].surface)).toBeDefined()
  })

  it.each(OTHERS)('EZ-2: with the %s, resting on either close gives one explanation, and the two do not share an anchor', (other) => {
    const onSearch = viewOf(other, 'searchPanel').tooltips
    const onOther = viewOf(other, other).tooltips
    expect(onSearch).toHaveLength(1)
    expect(onOther).toHaveLength(1)
    expect(anchorKey((onSearch[0] as Tooltip).anchor)).not.toBe(anchorKey((onOther[0] as Tooltip).anchor))
  })

  it.each(OTHERS)('IN-3 / IN-7: with the %s, resting on the Search Panel close, the explanation stands under the Search Panel close', (other) => {
    const left = tooltipLeft(other, 'searchPanel')
    expect(left, `within the Search Panel close, x ${String(SEARCH_CLOSE_LEFT)} to ${String(SEARCH_CLOSE_LEFT + CLOSE_SIDE)}`).toBeGreaterThanOrEqual(SEARCH_CLOSE_LEFT)
    expect(left).toBeLessThanOrEqual(SEARCH_CLOSE_LEFT + CLOSE_SIDE)
  })

  it.each(OTHERS)('IN-3 / IN-7: resting on the %s close, the explanation stands under that close, not the Search Panel close', (other) => {
    const left = tooltipLeft(other, other)
    expect(left, `within the other close, x ${String(OTHER_CLOSE_LEFT)} to ${String(OTHER_CLOSE_LEFT + CLOSE_SIDE)}`).toBeGreaterThanOrEqual(OTHER_CLOSE_LEFT)
    expect(left).toBeLessThanOrEqual(OTHER_CLOSE_LEFT + CLOSE_SIDE)
  })
})
