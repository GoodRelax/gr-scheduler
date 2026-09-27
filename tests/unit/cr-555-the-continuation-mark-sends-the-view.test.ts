// CR-555: a double click on the continuation mark sends the view to the far end (T-303 EL-10 .. EL-12).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  type InputContext,
  type PointerInput,
  type PointerPress,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { commandFromGrab } from '../../src/adapter/input-command-translator/item-grab'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable } from '../contract/spec-table'

const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[column]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no column ${column}`)
  return cell
}

const numberIn = (cell: string): number => {
  const found = cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/)
  if (found === null) throw new Error(`no number in ${cell}`)
  return Number(found[0])
}

const commandKindOf = (commandRow: string): string => {
  const named = bare(cellOf('T-108', commandRow, '確定名'))
  if (named === '') throw new Error(`table T-108 row ${commandRow} names no command`)
  return named
}

const EL_10 = cellOf('T-303', 'EL-10', '規則')
const EL_11 = cellOf('T-303', 'EL-11', '規則')
const EL_12 = cellOf('T-303', 'EL-12', '規則')
const MK_13 = cellOf('T-023', 'MK-13', cellColumnOfMk13())
const PE_12 = specTable('T-270').rows.find((one) => one.id === 'PE-12')?.cells.join(' | ') ?? ''
const UN_8 = specTable('T-027').rows.find((one) => one.id === 'UN-8')?.cells.join(' | ') ?? ''

function cellColumnOfMk13(): string {
  const row = specTable('T-023').rows.find((one) => one.id === 'MK-13')
  if (row === undefined) throw new Error('table T-023 has no row MK-13')
  const column = Object.keys(row.by).find((key) => (row.by[key] ?? '').includes('依存線の続きの印'))
  if (column === undefined) throw new Error('table T-023 MK-13 no longer names 依存線の続きの印')
  return column
}

const EL_10_DEPTH =
  '印の先の端が `EL-2` の端のときは、縦の倍率を、その端の行の深さを描く最小の倍率（`FR-018` のしきい値、表 T-205 の `S-87` ／ `S-88`）にすること（MUST）。'
const EL_10_ZOOM_X = '横の倍率は変えない。'
const EL_10_UN_8 = '⚠️ 取り消しの対象ではない（表 T-027 の `UN-8`）'
const EL_11_SEND =
  '印の先の端の予定の形が `Row Area` の横の範囲に入っていないときは、倍率を変えずに、その形の横の中点が `Row Area` の横の中点に来るよう、表示位置を横に送ること（MUST） —— 基準日線を出す操作（`FR-046`）と同じ送り方である。'
const EL_11_STAY = '入っているときは横に送らない'
const EL_12_SEND =
  '印の先の端が `EL-1` の縦の範囲（その行を描く場所）に入っていないとき、または `EL-10` で縦の倍率を変えたときは、その端の行が帯の下の残りの上端に来るよう、表示位置を縦に送ること（MUST） —— `_assets/tbl-settings.md` の 表 T-203 の `S-78` をその行に、`S-176` を 0 にする（`Agent API` の `focusTask`、`_assets/tbl-glossary.md` の 表 T-107 の `AM-16` と同じ置き方）。'
const EL_12_STAY = '入っているときは縦に送らない。'
const EL_12_PINNED = '⚠️ ピン止めした行の端は、いつも縦の範囲に入っている'
const MK_13_MARK =
  '依存線の続きの印 ＝ `FR-009` の 表 T-303 の `EL-10` 〜 `EL-12` に従い、印の先の端が見える所まで表示を送ること（MUST）'
const MK_13_FIRST_PRESS = '⚠️ 1 回目の押下は、依存線を押して離したときと同じく、その依存線を選ぶ（表 T-270 の `PE-12`）'
const FR_018_DEPTH_ONE = '`FR-018` は深さ 1 を倍率で落とさない'

const REQUIREMENTS = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')

const S_87 = numberIn(cellOf('T-205', 'S-87', '既定'))
const S_88 = numberIn(cellOf('T-205', 'S-88', '既定'))
// see FR-018, T-205
const thresholdOf = (depth: number): number => S_87 * S_88 ** (depth - 2)

const S_53 = numberIn(cellOf('T-201', 'S-53', '既定値'))
const S_54 = numberIn(cellOf('T-201', 'S-54', '既定値'))
const S_55 = numberIn(cellOf('T-201', 'S-55', '既定値'))

const SET_ZOOM = commandKindOf('CM-65')
const SET_SCROLL = commandKindOf('CM-66')

type Loose = Record<string, unknown>
type Settings = Parameters<typeof layoutFromSchedule>[1]
type Schedule = Parameters<typeof layoutFromSchedule>[0]
type Environment = Parameters<typeof regionsFromScreen>[0]

interface Pt {
  readonly x: number
  readonly y: number
}

interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface Placement {
  readonly taskUid: number
  readonly x: number
  readonly width: number
  readonly y: number
  readonly planHeight: number
}

interface Line {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly elision?: string
  readonly continuation?: { readonly dots: readonly Pt[]; readonly farUid: number } | null
}

const ENVIRONMENT = { width: 1600, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const iso = (day: number): string => new Date(Date.UTC(2026, 1, 2) + day * 86400000).toISOString().slice(0, 10)
const HOME = iso(-7)
const FAR = 400

const taskOf = (uid: number, start: number, days: number, links: readonly number[] = []): Loose => ({
  uid,
  wbsParentUid: null,
  wbsOrder: null,
  name: `t${uid}`,
  start: iso(start),
  finish: iso(start + days),
  milestone: null,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: links.map((predecessorUid) => ({
    predecessorUid,
    linkType: 1,
    lag: null,
    lagFormat: null,
    carry: {},
    carryElements: [],
  })),
  carry: {},
})

type GroupSpec = readonly [string, string | null]

interface SceneSpec {
  readonly groups: readonly GroupSpec[]
  readonly tasks: readonly (readonly [Loose, string])[]
  readonly settings?: Loose
}

interface Scene {
  readonly spec: SceneSpec
  readonly settings: Loose
  readonly rowArea: Rect
  readonly placements: readonly Placement[]
  readonly lines: readonly Line[]
  readonly context: InputContext
}

const scheduleOf = (spec: SceneSpec): Schedule =>
  ({
    project: { ...structuredClone(TEMPLATE.schedule.project), calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks: spec.tasks.map(([task]) => task),
    taskGroups: spec.groups.map(([id, parentId], order) => ({
      id,
      parentId,
      order,
      minHeight: null,
      label: id,
      derivedFromTaskUid: null,
      treeState: 'auto',
      editGroup: null,
      color: null,
    })),
    taskGroupMembers: spec.tasks.map(([task, groupId]) => ({ groupId, taskUid: task['uid'], stackOrder: null })),
    taskVisuals: spec.tasks.map(([task]) => ({ taskUid: task['uid'], shapeKind: 'rectangle' })),
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const sceneOf = (spec: SceneSpec, override: Loose = {}): Scene => {
  const settings = { ...SETTINGS_DEFAULTS, scrollDate: HOME, zoomX: 1, ...spec.settings, ...override }
  const regions = regionsFromScreen(ENVIRONMENT as unknown as Environment, settings as unknown as Settings)
  const schedule = scheduleOf(spec)
  const layout = layoutFromSchedule(schedule, settings as unknown as Settings, regions)
  const geometry = geometryFromLayout(schedule, settings as unknown as Settings, layout, regions, emptySelection(), null)
  const document = {
    schemaVersion: TEMPLATE.schemaVersion,
    schedule,
    documentSettings: settings,
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }
  const context = {
    document,
    layout,
    geometry,
    regions,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    zoomStep: S_53,
    zoomMin: S_54,
    zoomMax: S_55,
    isPictureAtStoredZoom: true,
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as unknown as InputContext
  return {
    spec,
    settings,
    rowArea: (regions as unknown as { readonly rowArea: Rect }).rowArea,
    placements: (layout as unknown as { readonly placements: readonly Placement[] }).placements,
    lines: geometry.dependencies as unknown as readonly Line[],
    context,
  }
}

const lineOf = (scene: Scene, predecessorUid: number, successorUid: number): Line => {
  const found = scene.lines.find((one) => one.predecessorUid === predecessorUid && one.successorUid === successorUid)
  if (found === undefined) throw new Error(`geometry.dependencies holds no line ${predecessorUid} -> ${successorUid}`)
  return found
}

const placementOf = (scene: Scene, uid: number): Placement | undefined =>
  scene.placements.find((one) => one.taskUid === uid)

const markOf = (scene: Scene, predecessorUid: number, successorUid: number): Pt => {
  const dots = lineOf(scene, predecessorUid, successorUid).continuation?.dots ?? []
  if (dots.length !== 3) throw new Error(`premise: line ${predecessorUid} -> ${successorUid} carries no mark (EL-9)`)
  return dots[1]!
}

// WHY: the same day written with a time of day is the same view; only the day and its offset place it.
const dayOf = (value: unknown): unknown => (typeof value === 'string' ? value.slice(0, 10) : value)

const within = (low: number, high: number, from: number, to: number): boolean => low >= from && high <= to

const pointer = (phase: 'down' | 'up', at: Pt, clickCount: number): PointerInput =>
  ({
    kind: 'pointer',
    phase,
    button: 'left',
    x: at.x,
    y: at.y,
    modifiers: { ctrl: false, shift: false, alt: false, meta: false },
    clickCount,
  }) as unknown as PointerInput

// WHY: a second click is read with the double-click reading (the TRAP on PointerPress.hit).
const clickOn = (scene: Scene, at: Pt, clickCount: number): { readonly press: PointerPress; readonly out: TranslatedInput } => {
  const hit = itemAtPointer(scene.context.geometry, at.x, at.y, grabSizesOf(), clickCount >= 2 ? 'doubleClick' : 'press')
  const press = { at: pointer('down', at, clickCount), hit, on: null, pressRow: 'PTD-3' } as unknown as PointerPress
  const context = { ...scene.context, pressed: press } as InputContext
  return { press, out: commandFromGrab(pointer('up', at, clickCount), press, context) }
}

const doubleClickOn = (scene: Scene, at: Pt) => clickOn(scene, at, 2)

const writesOf = (out: TranslatedInput): readonly Loose[] => {
  const action = out.action as unknown as { readonly kind?: string; readonly writes?: readonly (readonly Loose[])[] } | null
  if (action === null || action.kind !== 'changeDocument') return []
  return (action.writes ?? []).flat()
}

const onlyOf = (writes: readonly Loose[], kind: string): Loose | undefined => {
  const found = writes.filter((one) => one['kind'] === kind)
  expect(found.length, `at most one ${kind} is written`).toBeLessThanOrEqual(1)
  return found[0]
}

// WHY: the settings the view would hold after the writes, laid out again to see where the far end lands.
const sceneAfter = (scene: Scene, writes: readonly Loose[]): Scene => {
  const next: Loose = {}
  for (const write of writes) {
    const { kind: _kind, ...fields } = write
    Object.assign(next, fields)
  }
  return sceneOf(scene.spec, { ...scene.settings, ...next })
}

interface Row {
  readonly groupId: string
  readonly y: number
  readonly height: number
  readonly isPinned?: boolean
}

const rowsOf = (scene: Scene): readonly Row[] =>
  (scene.context.layout as unknown as { readonly rows: readonly Row[] }).rows

// WHY: the row the view is drawn from -- the one crossing the top of the scroll area (under the pinned band),
// with the fraction of it scrolled past (S-176, 0 or more and under 1 per OP-10a).
const topRowOf = (scene: Scene): { readonly groupId: string; readonly offset: number } | undefined => {
  const band = (scene.context.layout as unknown as { readonly pinnedBandHeight?: number }).pinnedBandHeight ?? 0
  const edge = scene.rowArea.y + band
  const row = rowsOf(scene).find((one) => one.isPinned !== true && one.y <= edge && edge < one.y + one.height)
  return row === undefined ? undefined : { groupId: row.groupId, offset: (edge - row.y) / row.height }
}

const offRight = (): Scene =>
  sceneOf({
    groups: [['a', null], ['b', null]],
    tasks: [
      [taskOf(1, 0, 5), 'a'],
      [taskOf(2, FAR, 5, [1]), 'b'],
    ],
  })

const offLeft = (): Scene =>
  sceneOf({
    groups: [['a', null], ['b', null]],
    tasks: [
      [taskOf(1, 0, 5), 'a'],
      [taskOf(2, 110, 5, [1]), 'b'],
    ],
    settings: { scrollDate: iso(100) },
  })

const FILLERS = Array.from({ length: 60 }, (_one, at) => `f${at}`)
const below = (): Scene =>
  sceneOf({
    groups: [['a', null], ...FILLERS.map((id): GroupSpec => [id, null]), ['z', null]],
    tasks: [
      [taskOf(1, 0, 5), 'a'],
      ...FILLERS.map((id, at): readonly [Loose, string] => [taskOf(100 + at, 20, 3), id]),
      [taskOf(2, 8, 5, [1]), 'z'],
    ],
  })

// WHY: Task 2 stands clear of the mark across: its shape, hidden under the band, would otherwise lie under the dots.
const underTheBand = (): Scene =>
  sceneOf({
    groups: [['P', null], ['a', null], ['b', null], ['c', null]],
    tasks: [
      [taskOf(1, 0, 5), 'P'],
      [taskOf(2, 40, 5, [1]), 'a'],
    ],
    settings: { pinnedGroupIds: ['P'], scrollGroupId: 'b' },
  })

const DEEP_DEPTH = 3
const deep = (): Scene =>
  sceneOf({
    groups: [['a', null], ['a1', 'a'], ['a11', 'a1'], ['b', null]],
    tasks: [
      [taskOf(1, 0, 5), 'a'],
      [taskOf(2, 20, 5, [1]), 'a11'],
    ],
    settings: { zoomY: 0.4 },
  })

const pinnedOffRight = (): Scene =>
  sceneOf({
    groups: [['P', null], ['a', null]],
    tasks: [
      [taskOf(1, 0, 5), 'a'],
      [taskOf(2, FAR, 5, [1]), 'P'],
    ],
    settings: { pinnedGroupIds: ['P'] },
  })

describe('CR-555 -- the manuscript these cases are driven by', () => {
  it('T-303 EL-10 .. EL-12 still hold the words these cases quote', () => {
    for (const [cell, clause] of [
      [EL_10, EL_10_DEPTH],
      [EL_10, EL_10_ZOOM_X],
      [EL_10, EL_10_UN_8],
      [EL_11, EL_11_SEND],
      [EL_11, EL_11_STAY],
      [EL_12, EL_12_SEND],
      [EL_12, EL_12_STAY],
      [EL_12, EL_12_PINNED],
    ] as const) {
      expect(cell.replace(/<br\s*\/?>/g, '\n').replace(/\s*\n\s*/g, ''), clause).toContain(clause.replace(/\s*\n\s*/g, ''))
    }
  })

  it('T-023 MK-13 sends the mark to T-303 and leaves the first press to PE-12', () => {
    const flat = MK_13.replace(/<br\s*\/?>/g, '')
    expect(flat).toContain(MK_13_MARK)
    expect(flat).toContain(MK_13_FIRST_PRESS)
    expect(PE_12, 'T-270 PE-12 is the dependency line, mark included, and selects').toContain('続きの印を含む')
    expect(PE_12).toContain('選ぶ')
  })

  it('T-027 UN-8 keeps zoom and scroll outside the history', () => {
    expect(UN_8).toContain('対象外')
    expect(UN_8).toContain('ズーム・スクロール・パン')
  })

  it('FR-018 counts the shallowest level as depth 1, so a depth-3 row appears at threshold(3)', () => {
    expect(REQUIREMENTS).toContain(FR_018_DEPTH_ONE)
  })
})

describe(`EL-11 -- ${EL_11_SEND}`, () => {
  for (const [name, make, far, pair] of [
    ['(i) successor off to the right', offRight, 2, [1, 2]],
    ["(i') predecessor off to the left", offLeft, 1, [1, 2]],
  ] as const) {
    it(`${name}: the far end's plan midpoint is sent to the Row Area midpoint, zoom untouched`, () => {
      const scene = make()
      const line = lineOf(scene, pair[0], pair[1])
      expect(line.continuation?.farUid, 'premise: the mark leads to the far end').toBe(far)
      const before = placementOf(scene, far)!
      expect(
        before.x + before.width <= scene.rowArea.x || before.x >= scene.rowArea.x + scene.rowArea.width,
        'premise: the far end lies wholly outside the Row Area across',
      ).toBe(true)
      const { press, out } = doubleClickOn(scene, markOf(scene, pair[0], pair[1]))
      expect(press.hit?.grab, 'premise: the second press lands on GA-24').toBe('GA-24')
      const writes = writesOf(out)
      expect(onlyOf(writes, SET_ZOOM), `${EL_11_SEND} (倍率を変えずに)`).toBeUndefined()
      const scroll = onlyOf(writes, SET_SCROLL)
      expect(scroll, EL_11_SEND).toBeDefined()
      const after = sceneAfter(scene, writes)
      const moved = placementOf(after, far)
      expect(moved, 'the far end is laid out after the send').toBeDefined()
      const mid = moved!.x + moved!.width / 2
      expect(mid, EL_11_SEND).toBeCloseTo(after.rowArea.x + after.rowArea.width / 2, 2)
    })

    // WHY: the scene stores no row (S-78 null), so "not sent down" is read off the picture, not off the stored
    // value: the write names the row and offset already at the top of the scroll area, and every row stays put.
    it(`${name}: the far end's row is inside the vertical range, so the view is not sent down (${EL_12_STAY})`, () => {
      const scene = make()
      const top = topRowOf(scene)
      expect(top, 'premise: a row stands at the top of the scroll area').toBeDefined()
      const writes = writesOf(doubleClickOn(scene, markOf(scene, pair[0], pair[1])).out)
      const scroll = onlyOf(writes, SET_SCROLL)
      expect(scroll, 'premise: EL-11 sent the view across').toBeDefined()
      expect(scroll!['scrollGroupId'], `${EL_12_STAY} (S-78 names the row already at the top)`).toBe(top!.groupId)
      expect(scroll!['scrollGroupOffset'], `${EL_12_STAY} (S-176 keeps the offset already at the top)`).toBeCloseTo(
        top!.offset,
        6,
      )
      const after = sceneAfter(scene, writes)
      const rowsAfter = new Map(rowsOf(after).map((one) => [one.groupId, one.y]))
      for (const row of rowsOf(scene)) {
        expect(rowsAfter.get(row.groupId), `${EL_12_STAY} (row ${row.groupId} stays where it was drawn)`).toBeCloseTo(row.y, 6)
      }
    })
  }

  it(`(iv) pinned far end off to the right: sent across only -- ${EL_12_PINNED}`, () => {
    const scene = pinnedOffRight()
    expect(lineOf(scene, 1, 2).continuation?.farUid, 'premise: the mark leads to Task 2').toBe(2)
    const writes = writesOf(doubleClickOn(scene, markOf(scene, 1, 2)).out)
    const scroll = onlyOf(writes, SET_SCROLL)
    expect(scroll, EL_11_SEND).toBeDefined()
    expect(scroll!['scrollGroupId'], EL_12_PINNED).toBe(scene.settings['scrollGroupId'])
    expect(scroll!['scrollGroupOffset'], EL_12_PINNED).toBe(scene.settings['scrollGroupOffset'])
    const moved = placementOf(sceneAfter(scene, writes), 2)!
    expect(moved.x + moved.width / 2, EL_11_SEND).toBeCloseTo(scene.rowArea.x + scene.rowArea.width / 2, 2)
  })
})

describe(`EL-12 -- ${EL_12_SEND}`, () => {
  for (const [name, make, row] of [
    ['(ii) successor row below the scroll area', below, 'z'],
    ["(ii') successor row scrolled under the pinned band", underTheBand, 'a'],
  ] as const) {
    it(`${name}: S-78 becomes that row and S-176 becomes 0`, () => {
      const scene = make()
      expect(lineOf(scene, 1, 2).continuation?.farUid, 'premise: the mark leads to Task 2').toBe(2)
      const { press, out } = doubleClickOn(scene, markOf(scene, 1, 2))
      expect(press.hit?.grab, 'premise: the second press lands on GA-24').toBe('GA-24')
      const writes = writesOf(out)
      expect(onlyOf(writes, SET_ZOOM), 'the far end is drawn, so EL-10 does not apply').toBeUndefined()
      const scroll = onlyOf(writes, SET_SCROLL)
      expect(scroll, EL_12_SEND).toBeDefined()
      expect(scroll!['scrollGroupId'], `${EL_12_SEND} (S-78)`).toBe(row)
      expect(scroll!['scrollGroupOffset'], `${EL_12_SEND} (S-176)`).toBe(0)
    })

    it(`${name}: the far end is inside the Row Area across, so the view is not sent across (${EL_11_STAY})`, () => {
      const scene = make()
      const far = placementOf(scene, 2)!
      expect(
        within(far.x, far.x + far.width, scene.rowArea.x, scene.rowArea.x + scene.rowArea.width),
        'premise: Task 2 lies inside the Row Area across',
      ).toBe(true)
      const scroll = onlyOf(writesOf(doubleClickOn(scene, markOf(scene, 1, 2)).out), SET_SCROLL)
      expect(scroll, 'premise: EL-12 sent the view down').toBeDefined()
      expect(dayOf(scroll!['scrollDate']), EL_11_STAY).toBe(dayOf(scene.settings['scrollDate']))
      expect(scroll!['scrollDayOffset'], EL_11_STAY).toBe(scene.settings['scrollDayOffset'])
    })
  }
})

describe(`EL-10 -- ${EL_10_DEPTH}`, () => {
  it('(iii) premise: the group LOD does not draw the successor, and its line carries a mark to it (EL-2)', () => {
    const scene = deep()
    expect(placementOf(scene, 2), 'premise: the LOD hides Task 2').toBeUndefined()
    expect(lineOf(scene, 1, 2).continuation?.farUid).toBe(2)
  })

  it(`(iii) zoomY becomes the threshold of depth ${DEEP_DEPTH}, zoomX stays (${EL_10_ZOOM_X})`, () => {
    const scene = deep()
    const { press, out } = doubleClickOn(scene, markOf(scene, 1, 2))
    expect(press.hit?.grab, 'premise: the second press lands on GA-24').toBe('GA-24')
    const zoom = onlyOf(writesOf(out), SET_ZOOM)
    expect(zoom, EL_10_DEPTH).toBeDefined()
    expect(zoom!['zoomY'] as number, EL_10_DEPTH).toBeCloseTo(thresholdOf(DEEP_DEPTH), 12)
    expect(zoom!['zoomX'], EL_10_ZOOM_X).toBe(scene.settings['zoomX'])
  })

  it('(iii) at the zoom written, the far end is drawn -- the threshold is reached, not approached', () => {
    const scene = deep()
    const writes = writesOf(doubleClickOn(scene, markOf(scene, 1, 2)).out)
    expect(onlyOf(writes, SET_ZOOM), 'premise: EL-10 wrote a zoom').toBeDefined()
    expect(placementOf(sceneAfter(scene, writes), 2), EL_10_DEPTH).toBeDefined()
  })

  it(`(iii) the zoom changed, so the far end's row is sent to the top: ${EL_12_SEND}`, () => {
    const scene = deep()
    const scroll = onlyOf(writesOf(doubleClickOn(scene, markOf(scene, 1, 2)).out), SET_SCROLL)
    expect(scroll, EL_12_SEND).toBeDefined()
    expect(scroll!['scrollGroupId'], `${EL_12_SEND} (S-78)`).toBe('a11')
    expect(scroll!['scrollGroupOffset'], `${EL_12_SEND} (S-176)`).toBe(0)
  })

  it(`(iii) the far end stands inside the Row Area across by its dates, so the view is not sent across (${EL_11_STAY})`, () => {
    const scene = deep()
    const scroll = onlyOf(writesOf(doubleClickOn(scene, markOf(scene, 1, 2)).out), SET_SCROLL)
    expect(scroll, 'premise: EL-12 sent the view down').toBeDefined()
    expect(dayOf(scroll!['scrollDate']), EL_11_STAY).toBe(dayOf(scene.settings['scrollDate']))
    expect(scroll!['scrollDayOffset'], EL_11_STAY).toBe(scene.settings['scrollDayOffset'])
  })
})

describe(`UN-8 / MK-13 -- the double click writes the view only (${EL_10_UN_8})`, () => {
  it.each([
    ['(i)', offRight],
    ['(ii)', below],
    ['(iii)', deep],
  ] as const)('%s writes nothing but CM-65 / CM-66', (_name, make) => {
    const scene = make()
    const writes = writesOf(doubleClickOn(scene, markOf(scene, 1, 2)).out)
    expect(writes.length, MK_13_MARK).toBeGreaterThan(0)
    expect(writes.map((one) => one['kind']).filter((kind) => kind !== SET_ZOOM && kind !== SET_SCROLL), EL_10_UN_8).toEqual([])
  })

  it(`a single press and release on the mark sends nothing: ${MK_13_FIRST_PRESS}`, () => {
    const scene = offRight()
    const { press, out } = clickOn(scene, markOf(scene, 1, 2), 1)
    expect(press.hit?.grab, 'premise: the first press lands on GA-24').toBe('GA-24')
    const kinds = writesOf(out).map((one) => one['kind'])
    expect(kinds, MK_13_FIRST_PRESS).not.toContain(SET_ZOOM)
    expect(kinds, MK_13_FIRST_PRESS).not.toContain(SET_SCROLL)
  })
})
