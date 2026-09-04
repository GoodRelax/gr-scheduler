// Unit tests for `svgFromSchedule` (unit UF-32 of table T-075, component
// CP-19 of table T-062, published as PI-19 of table T-064) -- table T-020a's
// `GD-6`, read together with `FR-098`'s pinned band.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their
// place: TS-6, tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, 1.). What was read: docs/spec/ in full for the rows
// below, and the two neighbouring files this one's imports, fixtures and
// readers are copied from --
//   tests/unit/uf-32.test.ts (the `GD-6` describe block: `elementsOf`,
//   `attribute`, and the "matched marker-end resolves to a real `id`" check)
//   tests/unit/fr-098-nothing-scrolling-under-the-band.test.ts (`taskOf` /
//   `groupOf` / `settingsOf` / the `pinnedGroupIds` wiring, and the whole
//   chain PI-35 -> PI-5 -> PI-6 -> PI-19 the `draw` helper below repeats)
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   表 T-020a `GD-6`  「依存線は実線で矢じりを持ち、補助線は点線で矢じりを持たない
//                     （MUST）。色だけで区別してはならない（`FR-030`）。太さと
//                     刻みをズームに追随させてはならない（MUST NOT）」
//   表 T-018a `RT-6`  「端点の一方がピン止めした行（`FR-098`）にあるときも、依存線
//                     を描くこと（MUST）」 -- ピン止めした行は描かれているので
//                     `RT-4a`（端点が描かれていないときは描かない）の対象外
//   表 T-018a `RT-4a` 「端点のいずれかが描かれていないときは、その依存線を描かない
//                     （MUST NOT）」 -- the row `RT-6` carves its exception out of
//   `FR-098` (2026-09-01 amendment) 「依存線だけは 2 つの行のために描かれるので、
//                     「その行」がどちらを指すかを別に定める（MUST）—— 両端とも
//                     ピン止めした行にあるときに限り帯の中に描いてよく、片方でも
//                     スクロールする行にあるときは残りの領域で切ること（MUST）。
//                     ⛔ 片端が帯に届くことを理由に線を丸ごと通してはならない
//                     （MUST NOT）」
//   表 T-203          `S-126` `pinnedGroupIds` -- the rows FR-098 lifts to the
//                     head of the panel
//
// ⭐⭐ WHY THIS FILE EXISTS, MEASURED 2026-09-05: pinning a single row -- ANY
// row, not only one that a dependency line touches -- silently drops the
// arrowhead's `<marker>` definition from the picture while every dependency
// line's `marker-end="url(#...)"` reference survives unchanged. One marker
// and every reference resolving before a row is pinned; zero markers and
// every one of those same references left dangling afterwards (258
// references measured against one build). `GD-6`'s MUST does not read
// "unless a row is pinned" anywhere -- table T-020a states the rule with no
// condition on pinning at all, and `RT-6` (MUST) requires the line itself to
// still be drawn in exactly the case that broke. ⇒ The rule this file checks
// is: the arrowhead's presence must not depend on whether any row, or which
// row, is pinned.
//
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY -- reported rather than
// guessed. `GD-6`'s own distinction between 依存線 and 補助線 (a stroke that
// appears only when `dependencyVisible` is on, vs. one that appears either
// way) is uf-32.test.ts's business and is not repeated here in full; this
// file's scenes carry no `actualStart` at all, except the one scene built
// on purpose to reach `GD-1`, so that every `polyline` outside that one
// scene is a 依存線 and nothing else competes with what pinning is being
// asked about.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'

// ---------------------------------------------------------------------------
// What the manuscript says, read at run time rather than trusted to memory
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

// ⚠️ GD-6's cell bolds two separate spans with a plain clause between them
// («**依存線は…（MUST）。**色だけで…。**太さと…（MUST NOT）**»), so the row is
// read here as the three raw runs the markdown actually leaves contiguous,
// rather than as one string that would have to cross a `**` boundary.
const GD_6_ARROWHEAD_RULE = '依存線は実線で矢じりを持ち、補助線は点線で矢じりを持たない（MUST）。'
const GD_6_NOT_COLOR_ALONE = '色だけで区別してはならない（`FR-030`）。'
const GD_6_NO_ZOOM_FOLLOW = '太さと刻みをズームに追随させてはならない（MUST NOT）'
const RT_6 =
  '端点の一方がピン止めした行（`FR-098`）にあるときも、依存線を描くこと（MUST）'
const FR_098_LINE_RULE =
  '両端ともピン止めした行にあるときに限り帯の中に描いてよく、片方でもスクロールする行にあるときは残りの領域で切ること（MUST）'

describe('the manuscript still says what these cases read', () => {
  it('GD-6 (table T-020a) still requires the 依存線 arrowhead, unconditionally', () => {
    // GOES RED IF: GD-6 gains a condition (e.g. "unless a row is pinned") or
    // is otherwise reworded away from an unconditional MUST.
    expect(REQUIREMENTS).toContain(GD_6_ARROWHEAD_RULE)
    expect(REQUIREMENTS).toContain(GD_6_NOT_COLOR_ALONE)
    expect(REQUIREMENTS).toContain(GD_6_NO_ZOOM_FOLLOW)
  })

  it('RT-6 (table T-018a) still draws the line through a pinned endpoint', () => {
    expect(REQUIREMENTS).toContain(RT_6)
  })

  it('FR-098 still admits a dependency line touching a pinned row', () => {
    expect(REQUIREMENTS).toContain(FR_098_LINE_RULE)
  })
})

// ---------------------------------------------------------------------------
// Settings and screen. Copied from
// tests/unit/fr-098-nothing-scrolling-under-the-band.test.ts, which already
// drives the same PI-35 -> PI-5 -> PI-6 -> PI-19 chain with `pinnedGroupIds`.
// ---------------------------------------------------------------------------

const FLAT = SETTINGS_DEFAULTS as unknown as Record<string, number>

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: {
    arrow: FLAT['shapeHeightOf.arrow'],
    chevron: FLAT['shapeHeightOf.chevron'],
    endpointSpan: FLAT['shapeHeightOf.endpointSpan'],
    milestone: FLAT['shapeHeightOf.milestone'],
    rectangle: FLAT['shapeHeightOf.rectangle'],
  },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    ...NESTED,
    scrollDate: '2026-01-01', // S-77, so the time axis has an origin
    scrollGroupId: null, // S-78
    scrollGroupOffset: 0, // S-176
    stackDirection: 'down', // S-58, so every y reads from the top
    // S-64: kept off so a `polyline` cannot be the イナズマ線 -- see the header
    // note on what this file deliberately leaves to uf-32.test.ts.
    progressLineVisible: false,
    pinnedGroupIds: [], // S-126, overridden per case below
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

// ---------------------------------------------------------------------------
// The fixture: four rows, one week apart, `g1` .. `g4`.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86400000
const dayAfter = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10)

/** Every nullable column spelled `null`; leaving one `undefined` reads as "set". */
const taskOf = (part: Record<string, unknown>): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    ...part,
  }) as unknown as Task

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

const IDS = ['g1', 'g2', 'g3', 'g4'] as const

/**
 * One root row per id, top to bottom, one Task on each, with a single
 * dependency `from` -> `to`. Neither Task carries `actualStart`, so `GD-1`
 * never holds and the picture's only `polyline` is the 依存線 itself.
 *
 * ⚠️ THE LINK CARRIES BOTH `type` AND `linkType`. uf-32.test.ts's fixture
 * spells the field `type`; fr-098-nothing-scrolling-under-the-band.test.ts's
 * spells it `linkType`. Neither file was read for its body, so which of the
 * two the entity actually declares is not knowable from the specification --
 * both are given so the case does not depend on guessing right.
 */
// `IDS` is a tuple of literals, so its `indexOf` only takes one of them.
type RowId = (typeof IDS)[number]

const scheduleWith = (from: RowId, to: RowId): Schedule =>
  ({
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title: null,
      uidHighWaterMark: IDS.length + 1,
    },
    calendars: [],
    tasks: IDS.map((id, index) =>
      taskOf({
        uid: index + 1,
        name: `task ${id}`,
        start: dayAfter('2026-01-05', index * 7),
        finish: dayAfter('2026-01-05', index * 7 + 5),
        dependencies:
          id === to
            ? [{ predecessorUid: IDS.indexOf(from) + 1, type: 1, linkType: 1, lag: 0 }]
            : [],
      }),
    ),
    resources: [],
    assignments: [],
    taskGroups: IDS.map((id, index) => groupOf({ id, order: index })),
    taskGroupMembers: IDS.map((id, index) => ({
      groupId: id,
      taskUid: index + 1,
      stackOrder: null,
    })),
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

/**
 * The same four rows and the same `from` -> `to` dependency, but `g3` also
 * carries a plan/actual gap, so `GD-1` holds and the picture carries a
 * 補助線 alongside the 依存線 -- the scene the last case below needs to ask
 * whether pinning also keeps `GD-6`'s OTHER half true (a 補助線 never gains
 * an arrowhead).
 */
const sceneWithGuideLine = (from: RowId, to: RowId): Schedule => {
  const base = scheduleWith(from, to) as unknown as { tasks: Task[] } & Record<string, unknown>
  const tasks = base.tasks.map((task, index) => {
    if (IDS[index] !== 'g3') return task
    return taskOf({
      ...(task as unknown as Record<string, unknown>),
      actualStart: dayAfter('2026-01-05', index * 7 - 30),
      actualDuration: 3,
      percentComplete: 40,
    })
  })
  return { ...base, tasks } as unknown as Schedule
}

interface Drawn {
  readonly svg: string
}

/** One pass of the chain the picture comes off: PI-35 -> PI-5 -> PI-6 -> PI-19. */
const draw = (schedule: Schedule, part: Record<string, unknown> = {}): Drawn => {
  const settings = settingsOf(part)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection)
  const svg = svgFromSchedule(schedule, settings, layout, geometry, regions, selection, 'screen')
  return { svg }
}

// ---------------------------------------------------------------------------
// Reading the picture. Copied from tests/unit/uf-32.test.ts's GD-6 block.
// ---------------------------------------------------------------------------

interface Element {
  readonly tag: string
  readonly at: number
  readonly text: string
}

const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const scan = /<([a-zA-Z][\w-]*)\b[^>]*>/g
  let hit: RegExpExecArray | null = scan.exec(svg)
  while (hit !== null) {
    out.push({ tag: hit[1] as string, at: hit.index, text: hit[0] })
    hit = scan.exec(svg)
  }
  return out
}

const attribute = (element: string, name: string): string | null => {
  const hit = new RegExp(`\\b${name}="([^"]*)"`).exec(element)
  return hit === null ? null : (hit[1] as string)
}

const polylinesOf = (svg: string): readonly Element[] =>
  elementsOf(svg).filter((one) => one.tag === 'polyline')

/** Every `id` a `<marker>` element in the picture declares. */
const definedMarkerIds = (svg: string): ReadonlySet<string> => {
  const ids = new Set<string>()
  for (const marker of elementsOf(svg).filter((one) => one.tag === 'marker')) {
    const id = attribute(marker.text, 'id')
    if (id !== null) ids.add(id)
  }
  return ids
}

/** The `id` a `marker-end="url(#id)"` names, or `null` where there is none. */
const markerRefOf = (element: Element): string | null => {
  const value = attribute(element.text, 'marker-end')
  if (value === null) return null
  return /url\(#([^)]+)\)/.exec(value)?.[1] ?? null
}

// ===========================================================================
// The cases
// ===========================================================================

describe('GD-6 (table T-020a, MUST): the 依存線 arrowhead survives pinning', () => {
  it('CONTROL -- with nothing pinned, the dependency line carries a defined arrowhead', () => {
    // The baseline uf-32.test.ts already covers, repeated here so a failure
    // below is read against a picture already known to hold the rule.
    const drawn = draw(scheduleWith('g1', 'g2'), { pinnedGroupIds: [] })
    const links = polylinesOf(drawn.svg).filter((one) => markerRefOf(one) !== null)
    expect(links.length, 'FR-009: the dependency is drawn with an arrowhead').toBeGreaterThan(0)
    const ids = definedMarkerIds(drawn.svg)
    for (const link of links) {
      expect(ids.has(markerRefOf(link) as string), 'the referenced marker is defined').toBe(true)
    }
  })

  it('MEASURED 2026-09-05: pinning a row the dependency does not even touch keeps the arrowhead defined', () => {
    // `g4` is pinned; the dependency runs `g1` -> `g2`, neither of them
    // pinned. GD-6 names no exception for "a row somewhere is pinned", so the
    // arrowhead must survive regardless.
    const drawn = draw(scheduleWith('g1', 'g2'), { pinnedGroupIds: ['g4'] })
    const links = polylinesOf(drawn.svg).filter((one) => markerRefOf(one) !== null)
    expect(links.length, 'the dependency is still drawn').toBeGreaterThan(0)
    expect(
      elementsOf(drawn.svg).some((one) => one.tag === 'marker'),
      'GOES RED IF: pinning any row drops the <marker> definition (measured 2026-09-05)',
    ).toBe(true)
    const ids = definedMarkerIds(drawn.svg)
    for (const link of links) {
      const id = markerRefOf(link)
      expect(ids.has(id as string), `marker-end references ${id}, which must be defined`).toBe(
        true,
      )
    }
  })

  it('RT-6 (table T-018a, MUST): one endpoint pinned still draws the line, arrowhead and all', () => {
    const drawn = draw(scheduleWith('g1', 'g2'), { pinnedGroupIds: ['g1'] })
    const links = polylinesOf(drawn.svg).filter((one) => markerRefOf(one) !== null)
    expect(links.length, 'RT-6: the line is drawn even with one end pinned').toBeGreaterThan(0)
    const ids = definedMarkerIds(drawn.svg)
    for (const link of links) {
      expect(ids.has(markerRefOf(link) as string)).toBe(true)
    }
  })

  it('FR-098 block (c): both endpoints pinned still draws the line, arrowhead and all', () => {
    const drawn = draw(scheduleWith('g1', 'g2'), { pinnedGroupIds: ['g1', 'g2'] })
    const links = polylinesOf(drawn.svg).filter((one) => markerRefOf(one) !== null)
    expect(
      links.length,
      'FR-098: both ends pinned may draw inside the band, but must still draw',
    ).toBeGreaterThan(0)
    const ids = definedMarkerIds(drawn.svg)
    for (const link of links) {
      expect(ids.has(markerRefOf(link) as string)).toBe(true)
    }
  })

  it('no marker-end reference is left dangling, in any of the pinning scenes above', () => {
    // ⭐⭐ THE EXACT SHAPE OF THE MEASUREMENT: not "no arrowhead", but "an
    // arrowhead reference with nothing behind it" -- 258 of them in one build.
    // This case re-reads every scene above from that angle: whatever the
    // picture draws, every `marker-end="url(#id)"` it writes must resolve.
    const scenes: readonly (readonly string[])[] = [[], ['g4'], ['g1'], ['g2'], ['g1', 'g2']]
    for (const pinnedGroupIds of scenes) {
      const drawn = draw(scheduleWith('g1', 'g2'), { pinnedGroupIds })
      const ids = definedMarkerIds(drawn.svg)
      for (const line of polylinesOf(drawn.svg)) {
        const ref = markerRefOf(line)
        if (ref === null) continue
        expect(
          ids.has(ref),
          `pinnedGroupIds=${JSON.stringify(pinnedGroupIds)}: marker-end names ` +
            `${ref}, which no <marker id="${ref}"> defines`,
        ).toBe(true)
      }
    }
  })

  it('GD-6 (MUST NOT half): a pinned scene still draws the 補助線 with no arrowhead of its own', () => {
    // The regression measured 2026-09-05 was the marker going missing, never
    // a 補助線 gaining one it should not have -- but GD-6 states both halves
    // as one rule, so the pinned regime is checked against both.
    const drawn = draw(sceneWithGuideLine('g1', 'g2'), { pinnedGroupIds: ['g1', 'g2', 'g3'] })
    const lines = polylinesOf(drawn.svg)
    const links = lines.filter((one) => markerRefOf(one) !== null)
    const guides = lines.filter((one) => markerRefOf(one) === null)
    expect(links.length, 'the 依存線 is still among the pinned rows').toBeGreaterThan(0)
    expect(guides.length, 'GD-1: g3 carries a plan/actual gap, so a 補助線 is drawn').toBeGreaterThan(
      0,
    )
    for (const guide of guides) {
      expect(attribute(guide.text, 'marker-end'), '補助線は矢じりを持たない').toBeNull()
    }
    const ids = definedMarkerIds(drawn.svg)
    for (const link of links) {
      expect(ids.has(markerRefOf(link) as string)).toBe(true)
    }
  })
})
