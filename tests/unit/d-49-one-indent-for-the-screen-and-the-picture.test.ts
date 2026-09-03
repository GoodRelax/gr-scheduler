// D-49 of `docs/development-records/defects.md` -- the row that read
// 「行のインデントが、画面と書き出しで違う値を使っている」, closed by CR-287 and
// left with nothing holding it down. The user's instruction of 2026-08-26 that
// opened the row asked for one indent per tier on BOTH sides, and the fix was
// to stop each side working the indent out for itself: `RowTitle` now carries
// `indentPx`, the row title panel puts one product into it, and the screen and
// the picture each draw the number they were handed.
//
// ⭐ THE ROWS THESE CASES ANSWER TO (rule 03 section 3: name the row, do not
// copy it).
//   FR-085   (MUST) 「使える幅は、`rowTitlePanelWidth`（表 T-203 の `S-79`）から、
//            その行の深さぶんのインデント（`rowTitleIndent`。表 T-201 の `S-37`）
//            と、行の操作子に確保した場所と、行の掴み代（表 T-023d の `GR-20`）に
//            確保した場所（`S-138`）とその隔たり（同表の `S-218`）を引いた残りと
//            すること」 -- 「その行の深さぶんのインデント」 is the product both
//            halves of this file are about.
//   表 T-201 `S-37` `rowTitleIndent`, 「行見出しの字下げ。1 段深くなるごとにこの幅
//            だけ字下げする」（利用者の裁定 2026-09-01）.
//   表 T-203 `S-79` `rowTitlePanelWidth`, the width those four terms come out of.
//   表 T-206 `S-140` / `S-138` / `S-218`, the other three terms.
//   表 T-024 IO-3 -- the picture is assembled from a `ScreenView`, which is why
//            the indent has to REACH the exporter as a value rather than be
//            worked out there from settings that view does not carry.
//
// ⭐ WHY THIS FILE EXISTS -- the hole the neighbours leave.
//   - tests/unit/fr-085-room-for-the-name.test.ts measures the ROOM the four
//     terms leave, through where a name is cut. It never asks what `indentPx`
//     the same panel put on the same title, so the cut and the push could part
//     company again without a case going red.
//   - tests/unit/uf-71.test.ts asserts the SCREEN sets a row in by the
//     `indentPx` its description carries.
//   - tests/unit/uf-45-46.test.ts drives the exporter, but hands it a
//     `RowTitle` literal whose `indentPx` it wrote itself, so it cannot see the
//     picture ignoring that number.
//   ⇒ Nothing anywhere asks (a) that the panel's `indentPx` is depth x `S-37`,
//     (b) that it is the SAME product the room subtracts, or (c) that the
//     picture moves when it changes. Those are the three mismatches the ledger
//     measured before CR-287 (screen minus picture, depth 1..5:
//     -8 / -4 / 0 / +4 / +8 px), and they are what these cases hold shut.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED. The ledger's remaining 1px -- the
// user's wording 「全角 1 文字ぶん」 measured at 13.0px against `S-37` -- is a
// request to move a settings value, not a disagreement between the two sides.
// No case here reads a font size for the indent, and none would go red if
// `S-37` moved: every number is read out of the manuscript at read time.
//
// ⛔ WHAT WAS READ OF `src/` (docs/development-rules/04-verification.md §1):
// nothing. The two entries driven here are named by Chapter 5.3 -- PI-21's
// `exportSvg` and the row title panel's `rowTitlePanelFromSchedule` -- and
// their argument shapes were taken from the neighbouring test files named
// above, not from the units.

import { describe, expect, it } from 'vitest'

import { exportSvg, type ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import { rowTitlePanelFromSchedule } from '../../src/adapter/screen-renderer/row-title-panel'
import type {
  RowTitle,
  RowTitlePanel,
  ScreenSession,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at read time rather than copied
// ---------------------------------------------------------------------------

/** One row of a numbered table, or a failure that names the table. @purity pure */
const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** The first number written in a cell. @purity pure */
const numberIn = (cell: string, what: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

/**
 * The heading the settings tables give their default column.
 *
 * ⚠️ Built from its code points: rule 03 section 5 keeps this tree ASCII, and
 * `tests/system/live-app.ts` gives the same reason for the one character it
 * needs -- a literal would be invisible in a diff.
 */
const DEFAULT_COLUMN = String.fromCharCode(0x65e2, 0x5b9a)

/** The default a settings row states. @purity pure */
const settingOf = (table: string, id: string): number =>
  numberIn(rowOf(table, id).by[DEFAULT_COLUMN] ?? '', `table ${table} row ${id}`)

/** `S-140` -- the room FR-085 keeps for the row controls. */
const S_140 = settingOf('T-206', 'S-140')
/** `S-138` -- the side of the box an entrance draws in; `GR-20`'s grab strip. */
const S_138 = settingOf('T-206', 'S-138')
/** `S-218` -- the gap between that grab strip and the name. */
const S_218 = settingOf('T-206', 'S-218')
/** `S-73`'s hue: `Project` carries it, so a fixture has to state one. */
const THEME_HUE = settingOf('T-216', 'S-73')

// ---------------------------------------------------------------------------
// The fixture the panel is driven with
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/**
 * A panel wide enough that nothing is cut by accident, with the font and the
 * coefficient chosen so FR-093's estimate lands on whole characters (10px
 * each). ⛔ `rowTitleIndent` is NOT written here: it is the value under test,
 * and every case reads it back off the settings it drove.
 */
const PANEL = settingsOf({
  rowTitlePanelWidth: 400, // S-79
  rowTitleFont: 20, // S-36
  rowTitleTopScale: 1, // S-38
  labelCoef: 0.5, // S-30
  maxGroupDepth: 5, // S-125
  truncateUnits: 120, // S-35, held clear: FR-085 forbids cutting by it
  pinnedGroupIds: [], // S-126
  pinnedRowMax: 5, // S-127
})

const panelWith = (part: Record<string, unknown>): DocumentSettings =>
  settingsOf({ ...(PANEL as unknown as Record<string, unknown>), ...part })

/** One settings key, whatever the manuscript left it at. @purity pure */
const keyOf = (settings: DocumentSettings, key: string): number =>
  (settings as unknown as Record<string, number>)[key] as number

const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    parentId: null,
    label: null,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

const scheduleOf = (groups: readonly TaskGroup[]): Schedule =>
  ({
    project: { title: null, themeHue: THEME_HUE, uidHighWaterMark: 0 },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: groups,
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const boxAt = (index: number): ScreenRect => ({ x: 0, y: index * 24, width: 400, height: 24 })

/**
 * Every title of a chain of `depth` rows, one inside the next, as the panel
 * built them.
 *
 * @purity pure
 */
const titlesOfChain = (
  depth: number,
  label: string,
  settings: DocumentSettings,
): readonly RowTitle[] => {
  const ids = Array.from({ length: depth }, (_unused, index) => `g${index + 1}`)
  const groups = ids.map((id, index) =>
    groupOf({ id, parentId: index === 0 ? null : `g${index}`, label, order: index }),
  )
  const panel: RowTitlePanel = rowTitlePanelFromSchedule(
    scheduleOf(groups),
    settings,
    emptySelection(),
    { ...SESSION, rowBoxes: ids.map((groupId, index) => ({ groupId, box: boxAt(index) })) },
  )
  return [...panel.pinnedTitles, ...panel.titles]
}

/** The title of the deepest row of such a chain. @purity pure */
const deepestTitle = (depth: number, label: string, settings: DocumentSettings): RowTitle => {
  const found = titlesOfChain(depth, label, settings).filter((one) => one.groupId === `g${depth}`)
  expect(found.length, `exactly one title for g${depth}`).toBe(1)
  return found[0] as RowTitle
}

/**
 * The longest half-width name this depth is shown WHOLE -- the panel's own
 * answer to 「使える幅」, read back through the one thing FR-085 makes
 * observable, which is where the cut lands.
 *
 * @purity pure
 */
const keptOf = (settings: DocumentSettings, depth: number): number => {
  for (let length = 1; length <= 400; length += 1) {
    if (deepestTitle(depth, 'x'.repeat(length), settings).isLabelTruncated) return length - 1
  }
  throw new Error('no half-width name of any length was cut by this panel')
}

const DEPTHS = [1, 2, 3, 4, 5] as const

// ---------------------------------------------------------------------------
// The panel: one product, put where both sides can read it
// ---------------------------------------------------------------------------

describe('D-49 / FR-085 -- the row title panel works the indent out once', () => {
  // GOES RED IF: the panel stops multiplying the depth by `S-37`, or starts
  // counting tiers from zero again -- the second of the two mismatches the
  // ledger measured, 「`(depth - 1)` と `depth` のずれ」.
  it.each(DEPTHS)(
    'gives a depth %i row `indentPx` of depth x `S-37`, and no other number',
    (depth) => {
      const indent = keyOf(PANEL, 'rowTitleIndent')
      expect(deepestTitle(depth, 'a row', PANEL).indentPx).toBe(depth * indent)
    },
  )

  // GOES RED IF: any tier stops being one step of `S-37` from the next -- the
  // shape of the ledger's own measurement, which found the screen 4px per tier
  // away from the picture.
  it('sets each tier of a chain exactly one `S-37` further in than its parent', () => {
    const indent = keyOf(PANEL, 'rowTitleIndent')
    const byDepth = [...titlesOfChain(DEPTHS.length, 'a row', PANEL)].sort(
      (one, two) => one.depth - two.depth,
    )
    const steps = byDepth
      .slice(1)
      .map((one, index) => one.indentPx - (byDepth[index] as RowTitle).indentPx)
    expect(steps).toEqual(byDepth.slice(1).map(() => indent))
  })

  // GOES RED IF: the number the row is PUSHED IN by and the number the room is
  // SHORTENED by part company -- the third mismatch the ledger measured
  // (「名前を切る幅と実際に押し出される幅も食い違う」). The room asserted is
  // FR-085's own four terms with the title's OWN `indentPx` standing in for the
  // first of them, so the case can only pass while the two are one number.
  // ⚠️ Whole characters: FR-093 estimates a name at `S-36` x `S-30` each, so
  // the cut lands on the last character that fits, not on the pixel.
  it.each(DEPTHS)(
    'cuts a depth %i name at the room `indentPx`, `S-140`, `S-138` and `S-218` leave',
    (depth) => {
      const perCharacter = keyOf(PANEL, 'rowTitleFont') * keyOf(PANEL, 'labelCoef')
      const room =
        keyOf(PANEL, 'rowTitlePanelWidth') -
        deepestTitle(depth, 'a row', PANEL).indentPx -
        S_140 -
        S_138 -
        S_218
      expect(keptOf(PANEL, depth)).toBe(Math.floor(room / perCharacter))
    },
  )

  // GOES RED IF: either half stops reading `S-37`. Moving the setting has to
  // move BOTH the push and the cut, by the same depth-many steps.
  // ⭐ The step is one character wide, so the cut moves by whole characters and
  // the flooring above cannot absorb the change.
  it.each(DEPTHS)('moves the push and the cut together when `S-37` moves, at depth %i', (depth) => {
    const perCharacter = keyOf(PANEL, 'rowTitleFont') * keyOf(PANEL, 'labelCoef')
    const wider = panelWith({ rowTitleIndent: keyOf(PANEL, 'rowTitleIndent') + perCharacter })

    expect(
      deepestTitle(depth, 'a row', wider).indentPx - deepestTitle(depth, 'a row', PANEL).indentPx,
    ).toBe(depth * perCharacter)
    expect(keptOf(wider, depth) - keptOf(PANEL, depth)).toBe(-depth)
  })
})

// ---------------------------------------------------------------------------
// The picture: it draws the number it was handed, and no product of its own
// ---------------------------------------------------------------------------

/** The settings the exporter is driven with -- the manuscript's own defaults. */
const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const existing = built[head]
    const group = (typeof existing === 'object' && existing !== null ? existing : {}) as Record<
      string,
      unknown
    >
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

const EXPORT_SETTINGS = nestedFrom(SETTINGS_DEFAULTS) as unknown as DocumentSettings

const EXPORT_SCREEN = { width: 1000, height: 800, appHeaderHeight: 56 } as const

const EXPORT_REGIONS: ScreenRegions = (() => {
  const canvasHeight = EXPORT_SCREEN.height - EXPORT_SCREEN.appHeaderHeight
  const rowAreaWidth =
    EXPORT_SCREEN.width - EXPORT_SETTINGS.canvasPadding - EXPORT_SETTINGS.rowTitlePanelWidth
  return {
    appHeader: { x: 0, y: 0, width: EXPORT_SCREEN.width, height: EXPORT_SCREEN.appHeaderHeight },
    scheduleCanvas: {
      x: 0,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: EXPORT_SCREEN.width,
      height: canvasHeight,
    },
    rowTitlePanel: {
      x: 0,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: EXPORT_SETTINGS.rowTitlePanelWidth,
      height: canvasHeight,
    },
    timeRuler: {
      x: EXPORT_SETTINGS.rowTitlePanelWidth,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: rowAreaWidth,
      height: EXPORT_SETTINGS.rulerHeight,
    },
    // FR-080 (MUST): the properties panel goes into an export CLOSED.
    propertiesPanel: {
      x: EXPORT_SCREEN.width,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: 0,
      height: canvasHeight,
    },
    rowArea: {
      x: EXPORT_SETTINGS.rowTitlePanelWidth,
      y: EXPORT_SCREEN.appHeaderHeight + EXPORT_SETTINGS.rulerHeight,
      width: rowAreaWidth,
      height: canvasHeight - EXPORT_SETTINGS.rulerHeight - EXPORT_SETTINGS.canvasPadding,
    },
  }
})()

/** The name the one row of the exported picture carries. */
const PICTURE_ROW_NAME = 'a row that reaches the picture'

/** A picture of one row, set in by `indentPx` and by nothing else. @purity pure */
const sceneIndentedBy = (indentPx: number): ExportScene => {
  const view: ScreenView = {
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: {
      documentTitle: 'a document on its way to a picture',
      openedFileName: null,
      fileSavedAt: null,
      fileNeverSavedText: '',
      commands: [],
      language: 'ja',
    },
    rowTitlePanel: {
      pinnedTitles: [],
      titles: [
        {
          groupId: 'g1',
          depth: 1,
          indentPx,
          box: {
            x: 0,
            y: 120,
            width: EXPORT_SETTINGS.rowTitlePanelWidth,
            height: 60,
          },
          label: PICTURE_ROW_NAME,
          wholeLabel: PICTURE_ROW_NAME,
          isLabelTruncated: false,
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
          isPinned: false,
          isSelected: false,
        },
      ],
    },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }
  return {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" data-from="svg-renderer"><circle cx="7" cy="11" r="3"/></svg>',
    regions: EXPORT_REGIONS,
    screenView: view,
    settings: EXPORT_SETTINGS,
  }
}

/**
 * Where the picture drew the one row's name.
 *
 * ⭐ Found by the NAME rather than by a position written here: the element that
 * carries the row's own text is the one thing about the picture's markup this
 * file is willing to lean on, and it fails loudly when the name is not drawn.
 *
 * @purity pure
 */
const nameDrawnAt = (svg: string): number => {
  const found = new RegExp(`<text([^<>]*)>${PICTURE_ROW_NAME}</text>`).exec(svg)
  if (found === null) {
    throw new Error('the picture drew no element carrying the row name this scene handed it')
  }
  const x = Number.parseFloat(/\bx="([^"]*)"/.exec(found[1] ?? '')?.[1] ?? 'NaN')
  if (!Number.isFinite(x)) throw new Error('the row name the picture drew states no x')
  return x
}

/** The picture, or a failure -- CR-337 lets `exportSvg` refuse past `S-217`. @purity pure */
const pictureOf = (scene: ExportScene): string => {
  const answer = exportSvg(scene)
  if (!answer.ok) {
    throw new Error('exportSvg refused a picture this fixture is nowhere near the ceiling of')
  }
  return answer.svg
}

describe('D-49 -- the picture sets a row in by the `indentPx` it was handed', () => {
  /**
   * What FR-080 scales a picture by: `S-81`'s width over the screen's.
   *
   * ⭐ Read out of the manuscript's own defaults, not measured off the picture
   * -- FR-025 (MUST) fixes the width at `S-81`, so the factor is a quotient of
   * two numbers this file already holds.
   */
  const PICTURE_SCALE = EXPORT_SETTINGS.exportCanvas.width / EXPORT_SCREEN.width

  // GOES RED IF: the exporter goes back to working the indent out for itself
  // (`title.depth x settings.rowTitleIndent`, which is what `image-exporter.ts`
  // did while the row was open). Then the pictures below would all be drawn at
  // one and the same x, because the scenes differ in NOTHING ELSE.
  it.each([8, 40])('moves the drawn name by the `indentPx` it is given (+%i)', (extra) => {
    const base = nameDrawnAt(pictureOf(sceneIndentedBy(0)))
    expect(nameDrawnAt(pictureOf(sceneIndentedBy(extra))) - base).toBeCloseTo(extra * PICTURE_SCALE)
  })

  // GOES RED IF: the picture reads `rowTitleIndent` out of the settings it is
  // handed. ⭐ The `ScreenView` is the seam CR-287 settled on, and the settings
  // travelling beside it must not be a second road to the same number.
  it('does not move when `S-37` moves in the settings but the `indentPx` does not', () => {
    const scene = sceneIndentedBy(0)
    const moved: ExportScene = {
      ...scene,
      settings: {
        ...(scene.settings as unknown as Record<string, unknown>),
        rowTitleIndent: keyOf(scene.settings, 'rowTitleIndent') + 24,
      } as unknown as DocumentSettings,
    }
    expect(nameDrawnAt(pictureOf(moved))).toBe(nameDrawnAt(pictureOf(scene)))
  })
})
