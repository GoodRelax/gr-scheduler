// The row title panel held at its boundary: drawn at the pointer or at its floor, stored on release.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressRowOf,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPress,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  displayRatioOf,
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import { specTable, unbroken } from '../contract/spec-table'
import {
  DEFAULT_DISPLAY_SCALE,
  DISPLAY_SCALE_STEPS,
  S_235,
  S_236,
  displayRatioAt,
} from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_052_HELD_DRAWS_THE_POINTER =
  '境界を掴んでいるあいだ、その時点のポインタ位置が決める 2 つの幅で画面を描いて示すこと（MUST）'

const FR_052_HELD_STOPS_AT_THE_FLOOR =
  '⭐ ただし行見出しパネルの幅は、ポインタ位置が決める幅が `FR-039` の 表 T-252 の後の段が定める床を下回るとき、床で止めて描くこと（MUST）'

const FR_052_HELD_WRITES_NOTHING =
  '⛔ **掴んでいるあいだ、その幅を文書へ書いてはならない（MUST NOT）**'

const T_252_THE_RELEASE_STORES =
  '⭐ 人が境界のドラッグ（`FR-052`）で行見出しパネルの幅を決めたとき、保存する `S-79` は、離した時点で描いた幅が本段の床より広ければ、描いた幅を描く比で割った値とし、床と等しければ（`FR-052` が床で止めて描いているときを含む）、いま保存している `S-79` と、床を描く比で割った値の小さい方とすること（MUST）'

const T_252_NEVER_WIDER_THAN_BEFORE = '⇒ 左へ引いて離しても、保存値が掴む前より増えることは無い'

const T_252_THE_DRAWN_WIDTH =
  '⭐ 描く行見出しパネルの幅は、`S-79` に描く比を掛けた値と、次の床の大きい方とすること（MUST）'

const T_252_THE_FLOOR =
  '床 ＝ `S-37` × 描く比 × 同書の 表 T-211 の `S-125` ＋ 行の掴み代の幅（`S-138` × `S-235`）＋ 行の操作子の 4 列（表 T-051 の `HF-4`）ぶんの入口の外形の幅（`FR-029` が定める外形の幅 × `S-235`）。'

const T_252_THE_WORKED_INEQUALITY = '16 × 5 × 描く比 ＋ 10.6672 ≦ 300 × 描く比 − 53.336'

const T_252_HOLDS_AT_EVERY_STEP =
  '`S-234` のいちばん小さい段 50 の描く比 0.3125 から上のすべての段で成り立ち'

const T_252_THE_DEFAULT_STEP_SIDES = '既定の 100（描く比 0.625）では左辺 60.6672px に対し右辺 134.164px である'

const FR_029_THE_OUTER_WIDTH =
  '⭐ 入口の外形の幅は、箱の一辺（`S-138`）に、隙間（`S-141`、行見出しパネルでは `S-243`）と枠の線の太さ（`S-237`）を左右のぶん加えた値とすること（MUST）。'

const FR_039_THE_RATIO =
  '描く比は、`S-234` を 100 で割り、同書の 表 T-206 の `S-236` を掛けた値とすること（MUST）'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-052 (MUST) -- the held boundary is drawn where the pointer names', FR_052_HELD_DRAWS_THE_POINTER],
  ['FR-052 (MUST) -- the held row title panel stops at the floor', FR_052_HELD_STOPS_AT_THE_FLOOR],
  ['FR-052 (MUST NOT) -- nothing is written while the boundary is held', FR_052_HELD_WRITES_NOTHING],
  ['T-252 (MUST) -- what the release stores, above the floor and at it', T_252_THE_RELEASE_STORES],
  ['T-252 -- a pull to the left never stores a wider value than before', T_252_NEVER_WIDER_THAN_BEFORE],
  ['T-252 (MUST) -- the drawn width is the larger of S-79 x ratio and the floor', T_252_THE_DRAWN_WIDTH],
  ['T-252 -- the floor formula', T_252_THE_FLOOR],
  ['T-252 -- the worked inequality of the depth-5 grips against the row controls', T_252_THE_WORKED_INEQUALITY],
  ['T-252 -- the inequality holds from the lowest step up', T_252_HOLDS_AT_EVERY_STEP],
  ['FR-029 (MUST) -- the outer width of one entrance', FR_029_THE_OUTER_WIDTH],
  ['FR-039 (MUST) -- the drawn ratio', FR_039_THE_RATIO],
]

describe('CR-400 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const numberIn = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

const settingIn = (table: string, id: string, column: string): number =>
  numberIn(rowOf(table, id).by[column] ?? '')

// see T-201, T-203, T-206, T-211
const S_37 = settingIn('T-201', 'S-37', '既定値')
const S_79 = settingIn('T-203', 'S-79', '既定')
const S_125 = settingIn('T-211', 'S-125', '値')
const S_138 = settingIn('T-206', 'S-138', '既定')
const S_243 = settingIn('T-206', 'S-243', '既定')
const S_237 = settingIn('T-206', 'S-237', '既定')

// see HF-4, T-252
const ROW_CONTROL_COLUMNS = Number(/行の操作子の (\d+) 列/.exec(T_252_THE_FLOOR)?.[1])

// see FR-029
const ENTRANCE_OUTER_WIDTH = S_138 + 2 * S_243 + 2 * S_237

// see T-252
const floorAt = (displayScale: number): number =>
  S_37 * displayRatioAt(displayScale) * S_125 +
  S_138 * S_235 +
  ROW_CONTROL_COLUMNS * ENTRANCE_OUTER_WIDTH * S_235

const TOP_SCALE = Math.max(...DISPLAY_SCALE_STEPS)

const SCALES: readonly number[] = [DEFAULT_DISPLAY_SCALE, TOP_SCALE]

describe('CR-400 -- the premises: the two steps, the ratio, and the floor read from the manuscript', () => {
  it('drives the default step and the top step of table T-202 S-234, which differ', () => {
    expect(DISPLAY_SCALE_STEPS).toContain(DEFAULT_DISPLAY_SCALE)
    expect(SCALES[0]).toBeLessThan(SCALES[1]!)
  })

  it('reads the floor terms the formula names, with four control columns', () => {
    expect(ROW_CONTROL_COLUMNS, T_252_THE_FLOOR).toBe(4)
    expect(ENTRANCE_OUTER_WIDTH, `${FR_029_THE_OUTER_WIDTH} -- S-138 + 2 x S-243 + 2 x S-237`).toBe(20)
    expect(S_79, 'table T-203 S-79 default').toBe(300)
  })

  it('agrees with the ratio PI-35 answers at both steps (FR-039)', () => {
    for (const step of SCALES) {
      expect(displayRatioOf(settingsOf({ displayScale: step })), `${FR_039_THE_RATIO} -- step ${step}`).toBeCloseTo(
        (step / 100) * S_236,
        10,
      )
    }
  })

  it('puts the default S-79 x ratio at or above the floor at every step of S-234, so the scenes below place the panel by fractions of the floor', () => {
    for (const step of DISPLAY_SCALE_STEPS) {
      expect(floorAt(step), `${T_252_THE_WORKED_INEQUALITY} -- ${T_252_HOLDS_AT_EVERY_STEP} -- step ${step}`).toBeLessThanOrEqual(
        S_79 * displayRatioAt(step),
      )
    }
    const ratio = displayRatioAt(DEFAULT_DISPLAY_SCALE)
    const left = S_37 * S_125 * ratio + S_138 * S_235
    const right = S_79 * ratio - ROW_CONTROL_COLUMNS * ENTRANCE_OUTER_WIDTH * S_235
    expect(REQUIREMENTS).toContain(T_252_THE_DEFAULT_STEP_SIDES)
    expect([left, right], T_252_THE_DEFAULT_STEP_SIDES).toEqual([
      expect.closeTo(60.6672, 9),
      expect.closeTo(134.164, 9),
    ])
  })
})

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

function settingsOf(part: Record<string, unknown> = {}): DocumentSettings {
  return {
    ...nestedFrom(SETTINGS_DEFAULTS),
    rulerHeight: 48,
    rulerFont: 12,
    scrollDate: '2026-01-01',
    stackDirection: 'down',
    propertyPanelWidth: 0,
    ...part,
  } as unknown as DocumentSettings
}

const ENV: ScreenEnvironment = {
  width: 1400,
  height: 900,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const ONE_TASK = {
  uid: 1,
  name: 'alpha',
  start: '2026-01-05',
  finish: '2026-01-25',
  milestone: null,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
} as unknown as Task

const ONE_ROW = {
  project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
  calendars: [],
  resources: [],
  assignments: [],
  highlightBoxes: [],
  commentBoxes: [],
  tasks: [ONE_TASK],
  taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
  taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
  taskVisuals: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointerAt = (phase: PointerInput['phase'], x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

// see FR-052, S-134
const ROW_TITLE_DIVIDER: ScreenPart = {
  part: 'Panel Divider',
  entry: null,
  format: null,
  rowGroupId: null,
  resourceUid: null,
  dividerPanel: 'rowTitlePanel',
  noticeDismissKey: null,
}

const contextFor = (settings: DocumentSettings, pressed: PointerPress | null): InputContext => {
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(ONE_ROW, settings, regions)
  return {
    document: { schemaVersion: '1', schedule: ONE_ROW, documentSettings: settings },
    layout,
    geometry: geometryFromLayout(ONE_ROW, settings, layout, regions, emptySelection()),
    regions,
    screenState: emptyScreenState(),
    selection: emptySelection(),
    zoomStep: 3,
    pressed,
    isTextEntryUnsettled: false,
    isSurfaceStanding: true,
    isPictureAtStoredZoom: true,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-minted-outside',
    newHighlightBoxId: 'highlight-minted-outside',
  } as unknown as InputContext
}

type SetPanelWidths = Extract<DocumentCommand, { readonly kind: 'setPanelWidths' }>

const writesOf = (answer: TranslatedInput): readonly DocumentCommand[] => {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat()
}

const isPanelWidths = (write: DocumentCommand): write is SetPanelWidths =>
  write.kind === 'setPanelWidths'

interface Drag {
  readonly ratio: number
  readonly floor: number
  readonly drawnBefore: number
  readonly pointerWidth: number
  readonly heldWrites: readonly DocumentCommand[]
  readonly storedAfter: number
}

const drawnWidthOf = (displayScale: number, stored: number): number =>
  regionsFromScreen(ENV, settingsOf({ displayScale, rowTitlePanelWidth: stored })).rowTitlePanel.width

// WHY: the press lands on the drawn boundary, the centre of the S-134 band, so the width the
// pointer names is its x less the panel's left edge under either reading of FR-052.
function dragRowTitleBoundary(displayScale: number, stored: number, travel: number): Drag {
  const settings = settingsOf({ displayScale, rowTitlePanelWidth: stored })
  const idle = contextFor(settings, null)
  const panel = idle.regions.rowTitlePanel
  const down = pointerAt('down', panel.x + panel.width, panel.y + panel.height / 2)
  const pressed: PointerPress = {
    at: down,
    hit: null,
    on: ROW_TITLE_DIVIDER,
    pressRow: pressRowOf({ at: down, hit: null }, idle),
  }
  const held = contextFor(settings, pressed)
  const to = down.x + travel
  const heldWrites = [
    ...writesOf(commandFromInput(down, held)),
    ...writesOf(commandFromInput(pointerAt('move', down.x + travel / 2, down.y), held)),
    ...writesOf(commandFromInput(pointerAt('move', to, down.y), held)),
  ]
  const widths = writesOf(commandFromInput(pointerAt('up', to, down.y), held)).filter(isPanelWidths)
  const last = widths[widths.length - 1]
  return {
    ratio: displayRatioAt(displayScale),
    floor: floorAt(displayScale),
    drawnBefore: panel.width,
    pointerWidth: to - panel.x,
    heldWrites,
    storedAfter: last === undefined ? stored : last.rowTitlePanelWidth,
  }
}

// WHY: every scene is placed by fractions of the floor F and of F / ratio, so no pixel is typed in;
// the fractions only keep each pointer well clear of F, where float noise could pick either rule.
const floorOverRatioAt = (displayScale: number): number =>
  floorAt(displayScale) / displayRatioAt(displayScale)

const STORED_UNDER_FLOOR = 0.6
const STORED_OVER_FLOOR = 1.25

describe('FR-052 (MUST) + PI-35 -- the width a held pointer names is drawn, and stops at the floor', () => {
  it.each(SCALES)('draws the pointer\'s width when it is wider than the floor -- step %i', (step) => {
    const ratio = displayRatioAt(step)
    const floor = floorAt(step)
    const pointerWidth = 1.5 * floor
    expect(drawnWidthOf(step, pointerWidth / ratio), FR_052_HELD_DRAWS_THE_POINTER).toBeCloseTo(pointerWidth, 6)
  })

  it.each(SCALES)('draws the floor, not the pointer, when the pointer is narrower -- step %i', (step) => {
    const ratio = displayRatioAt(step)
    const floor = floorAt(step)
    const pointerWidth = 0.75 * floor
    const drawn = drawnWidthOf(step, pointerWidth / ratio)
    expect(drawn, FR_052_HELD_STOPS_AT_THE_FLOOR).toBeCloseTo(floor, 6)
    expect(drawn, 'control: a picture that follows the pointer past the floor').not.toBeCloseTo(pointerWidth, 3)
  })

  it.each(SCALES)('draws a stored S-79 at the larger of S-79 x ratio and the floor -- step %i', (step) => {
    const q = floorOverRatioAt(step)
    const floor = floorAt(step)
    expect(drawnWidthOf(step, STORED_UNDER_FLOOR * q), T_252_THE_DRAWN_WIDTH).toBeCloseTo(floor, 6)
    expect(drawnWidthOf(step, STORED_OVER_FLOOR * q), T_252_THE_DRAWN_WIDTH).toBeCloseTo(
      STORED_OVER_FLOOR * floor,
      6,
    )
  })
})

describe('FR-052 (MUST NOT) + PI-18 -- the held boundary writes nothing', () => {
  it.each(SCALES)('answers the press and every move with no document write -- step %i', (step) => {
    const q = floorOverRatioAt(step)
    const floor = floorAt(step)
    for (const [stored, travel] of [
      [STORED_UNDER_FLOOR * q, 0.5 * floor],
      [STORED_UNDER_FLOOR * q, -0.25 * floor],
      [STORED_OVER_FLOOR * q, -0.5 * floor],
    ] as const) {
      expect(dragRowTitleBoundary(step, stored, travel).heldWrites, FR_052_HELD_WRITES_NOTHING).toEqual([])
    }
  })
})

describe('T-252 (MUST) + PI-18 -- released wider than the floor, S-79 is the drawn width over the ratio', () => {
  it.each(SCALES)('pulled right from a panel standing on its floor -- step %i', (step) => {
    const q = floorOverRatioAt(step)
    const drag = dragRowTitleBoundary(step, STORED_UNDER_FLOOR * q, 0.5 * floorAt(step))
    expect(drag.drawnBefore, 'premise: the press starts on the floor, not at S-79 x ratio').toBeCloseTo(drag.floor, 6)
    expect(drag.pointerWidth / drag.floor, 'premise: released well above the floor').toBeCloseTo(1.5, 6)

    const wanted = drag.pointerWidth / drag.ratio
    const storedPlusTravel = STORED_UNDER_FLOOR * q + (drag.pointerWidth - drag.drawnBefore) / drag.ratio
    expect(wanted, 'control: S-79 + travel / ratio stores another value here').not.toBeCloseTo(storedPlusTravel, 3)
    // WHY: only where the ratio is not 1: at the top step 200 the ratio is 1, and dividing by it cannot be told apart.
    if (Math.abs(drag.ratio - 1) > 1e-9) {
      expect(wanted, 'control: the undivided drawn width stores another value here').not.toBeCloseTo(
        drag.pointerWidth,
        3,
      )
    }
    expect(drag.storedAfter, T_252_THE_RELEASE_STORES).toBeCloseTo(wanted, 6)
  })

  it.each(SCALES)('pulled left a little, staying above the floor -- step %i', (step) => {
    const q = floorOverRatioAt(step)
    const stored = STORED_OVER_FLOOR * q
    const drag = dragRowTitleBoundary(step, stored, -0.1 * floorAt(step))
    expect(drag.drawnBefore, 'premise: the press starts above the floor').toBeCloseTo(STORED_OVER_FLOOR * drag.floor, 6)
    expect(drag.pointerWidth, 'premise: released above the floor').toBeGreaterThan(drag.floor)

    const wanted = drag.pointerWidth / drag.ratio
    expect(wanted, 'control: min(S-79, floor / ratio) stores another value here').not.toBeCloseTo(q, 3)
    expect(wanted, 'control: leaving S-79 alone stores another value here').not.toBeCloseTo(stored, 3)
    expect(drag.storedAfter, T_252_THE_RELEASE_STORES).toBeCloseTo(wanted, 6)
    expect(drag.storedAfter, T_252_NEVER_WIDER_THAN_BEFORE).toBeLessThan(stored)
  })
})

describe('T-252 (MUST) + PI-18 -- released at the floor, S-79 is the smaller of itself and floor / ratio', () => {
  it.each(SCALES)('keeps S-79 when it is already under floor / ratio -- step %i', (step) => {
    const q = floorOverRatioAt(step)
    const stored = STORED_UNDER_FLOOR * q
    const drag = dragRowTitleBoundary(step, stored, -0.25 * floorAt(step))
    expect(drag.pointerWidth, 'premise: the pointer ends left of the floor').toBeLessThan(drag.floor)

    expect(q, 'control: storing floor / ratio would widen the panel').toBeGreaterThan(stored)
    expect(drag.pointerWidth / drag.ratio, 'control: pointer / ratio stores another value here').not.toBeCloseTo(
      stored,
      3,
    )
    expect(
      stored + (drag.pointerWidth - drag.drawnBefore) / drag.ratio,
      'control: S-79 + travel / ratio stores another value here',
    ).not.toBeCloseTo(stored, 3)
    expect(drag.storedAfter, T_252_THE_RELEASE_STORES).toBeCloseTo(stored, 6)
  })

  it.each(SCALES)('lowers S-79 to floor / ratio when it stood above it -- step %i', (step) => {
    const q = floorOverRatioAt(step)
    const stored = STORED_OVER_FLOOR * q
    const drag = dragRowTitleBoundary(step, stored, -0.5 * floorAt(step))
    expect(drag.drawnBefore, 'premise: the press starts above the floor').toBeGreaterThan(drag.floor)
    expect(drag.pointerWidth, 'premise: the pointer ends left of the floor').toBeLessThan(drag.floor)

    expect(q, 'control: leaving S-79 alone stores another value here').not.toBeCloseTo(stored, 3)
    expect(q, 'control: pointer / ratio stores another value here').not.toBeCloseTo(
      drag.pointerWidth / drag.ratio,
      3,
    )
    expect(drag.storedAfter, T_252_THE_RELEASE_STORES).toBeCloseTo(q, 6)
  })
})

describe('T-252 + FR-052 -- what the release stores draws the very width the held picture showed', () => {
  it.each(SCALES)('does not jump on release, above or at the floor -- step %i', (step) => {
    const q = floorOverRatioAt(step)
    const floor = floorAt(step)
    for (const [stored, travel] of [
      [STORED_UNDER_FLOOR * q, 0.5 * floor],
      [STORED_OVER_FLOOR * q, -0.1 * floor],
      [STORED_UNDER_FLOOR * q, -0.25 * floor],
      [STORED_OVER_FLOOR * q, -0.5 * floor],
    ] as const) {
      const drag = dragRowTitleBoundary(step, stored, travel)
      const heldPicture = Math.max(drag.pointerWidth, drag.floor)
      expect(
        drawnWidthOf(step, drag.storedAfter),
        `${FR_052_HELD_STOPS_AT_THE_FLOOR} -- S-79 ${stored}, travel ${travel}`,
      ).toBeCloseTo(heldPicture, 6)
    }
  })
})

describe('T-252 + PI-18 -- a pull to the left never stores a wider S-79 than before', () => {
  it.each(SCALES)('holds over a sweep of stored widths and left pulls -- step %i', (step) => {
    const q = floorOverRatioAt(step)
    const floor = floorAt(step)
    const storedWidths = [S_79, 0.3 * q, STORED_UNDER_FLOOR * q, 0.9 * q, 1.1 * q, STORED_OVER_FLOOR * q, 2 * q, 3 * q]
    const pulls = [-0.05, -0.2, -0.5, -1, -3].map((share) => share * floor)
    expect(
      storedWidths.some((stored) => q > stored),
      'control: some point would widen under a release that stores floor / ratio',
    ).toBe(true)
    for (const stored of storedWidths) {
      for (const travel of pulls) {
        const drag = dragRowTitleBoundary(step, stored, travel)
        expect(drag.storedAfter, `${T_252_NEVER_WIDER_THAN_BEFORE} -- S-79 ${stored}, travel ${travel}`).toBeLessThanOrEqual(
          stored,
        )
        expect(drag.storedAfter, 'FR-052: the row title panel is never 0').toBeGreaterThan(0)
      }
    }
  })
})
