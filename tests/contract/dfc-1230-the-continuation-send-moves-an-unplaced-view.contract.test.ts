// DFC-1230: one still click on the continuation mark sends a view whose document stores no place (T-303 EL-11 / EL-12 / EL-16, T-270 PE-12, T-024a OP-10).

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
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { dateAtX, layoutFromSchedule, timeAxisOf } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { FrameEnvironment } from '../../src/framework/single-html-shell/frame-loop'
import { heldViewPlaceOf } from '../../src/framework/single-html-shell/view-place'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable } from './spec-table'
import { settingNumber } from '../fixtures/setting-number'

const rowCells = (table: string, id: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' | ')
}

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

const flat = (cell: string): string => cell.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

const EL_11 = rowCells('T-303', 'EL-11')
const EL_12 = rowCells('T-303', 'EL-12')
const EL_16 = rowCells('T-303', 'EL-16')
const PE_12 = rowCells('T-270', 'PE-12')
const OP_10 = rowCells('T-024a', 'OP-10')
const S_77 = rowCells('T-203', 'S-77')
const S_78 = rowCells('T-203', 'S-78')
const S_176 = rowCells('T-203', 'S-176')

const EL_11_STAY = '入っているときは横に送らない'
const EL_12_SEND =
  '印の先の端が `EL-1` の縦の範囲（そのタスクグループを描く場所）に入っていないとき、または `EL-10` で縦の倍率を変えたとき、`EL-21` でタスクグループを開いたときは、その端のタスクグループが帯の下の残りの上端に来るよう、表示位置を縦に送ること（MUST）'
const EL_12_HOW = '`S-78` をそのタスクグループに、`S-176` を 0 にする'
const EL_16_MARK = '印の先の端の `Task` と、押した印の依存線（`EL-13` が応えた線）に、送った先の印を付けること（MUST）'
const PE_12_SEND = '続きの印では選ばず、選択を空にしたうえで `FR-009` の 表 T-303 の `EL-10` 〜 `EL-12` に従って印の先へ送り'
const OP_10_CHOICE = '人が倍率か表示位置を選んだときは、それを表示位置とすること（MUST）'
const OP_10_NOT_REDONE = '選んだ時点で「人がまだ場所を決めていない」ではなくなるので、本行の条件は成り立たなくなり、全体表示はやり直されない。'
const OP_10_TEMPLATE_HAS_NO_PLACE = '同梱のテンプレートは誰も一度も開いたことがないので必ず表示位置を持たず'
const OP_10_TEMPLATE_PLACE = 'そのときは、その文書が覆う最初の日と、タスクグループの木の先頭から描くこと（MUST）'
const OP_10_FIRST_DAY = '「その文書が覆う最初の日」とは、その文書の `Task` が持つ `start` と `actualStart` のうち最も早い日のことである（MUST）'
const S_77_NULL = '`null` は「人がまだ場所を決めていない」を表す'

const S_53 = numberIn(cellOf('T-201', 'S-53', '既定値'))
const S_54 = numberIn(cellOf('T-201', 'S-54', '既定値'))
const S_55 = numberIn(cellOf('T-201', 'S-55', '既定値'))

const commandKindOf = (commandRow: string): string => {
  const named = bare(cellOf('T-108', commandRow, '確定名'))
  if (named === '') throw new Error(`table T-108 row ${commandRow} names no command`)
  return named
}
const SET_ZOOM = commandKindOf('CM-65')
const SET_SCROLL = commandKindOf('CM-66')

type Loose = Record<string, unknown>
type Settings = Parameters<typeof layoutFromSchedule>[1]
type Schedule = Parameters<typeof layoutFromSchedule>[0]
type Environment = Parameters<typeof regionsFromScreen>[0]
type Regions = ReturnType<typeof regionsFromScreen>

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
}

interface Line {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly continuation?: { readonly dots: readonly Pt[]; readonly farUid: number } | null
}

const ENVIRONMENT = { width: 1600, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }
const FRAME_ENVIRONMENT: FrameEnvironment = {
  width: ENVIRONMENT.width,
  height: ENVIRONMENT.height,
  appHeaderHeight: ENVIRONMENT.appHeaderHeight,
  scrollbarThickness: ENVIRONMENT.scrollbarThickness,
}

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

// WHY: the startup template's own settings -- the case DFC-1230 reports -- over the defaults.
const TEMPLATE_SETTINGS: Loose = { ...SETTINGS_DEFAULTS, ...TEMPLATE.documentSettings }

const iso = (day: number): string => new Date(Date.UTC(2026, 1, 2) + day * 86400000).toISOString().slice(0, 10)

const taskOf = (uid: number, start: number, days: number, links: readonly number[] = []): Loose => ({
  uid,
  parentTaskUid: null,
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

// WHY: Task 1 on the head task group starts the first day covered (OP-10); Task 2 lies below 60 task groups, inside across.
const FILLERS = Array.from({ length: 60 }, (_one, at) => `f${at}`)
const GROUPS: readonly string[] = ['a', ...FILLERS, 'z']
const TASKS: readonly (readonly [Loose, string])[] = [
  [taskOf(1, 0, 5), 'a'],
  ...FILLERS.map((id, at): readonly [Loose, string] => [taskOf(100 + at, 20, 3), id]),
  [taskOf(2, 8, 5, [1]), 'z'],
]
const HEAD_TASK_GROUP = 'a'
const FAR_TASK_GROUP = 'z'
const FIRST_DAY = iso(0)

const SCHEDULE = {
  project: { ...structuredClone(TEMPLATE.schedule.project), calendarUid: null, statusDate: null, title: null, themeHue: 214 },
  calendars: [],
  resources: [],
  assignments: [],
  highlightBoxes: [],
  commentBoxes: [],
  tasks: TASKS.map(([task]) => task),
  taskGroups: GROUPS.map((id, order) => ({
    id,
    parentId: null,
    order,
    minHeight: null,
    label: id,
    derivedFromTaskUid: null,
    treeState: 'auto',
    editGroup: null,
    color: null,
  })),
  taskGroupMembers: TASKS.map(([task, groupId]) => ({ groupId, taskUid: task['uid'] })),
  taskVisuals: TASKS.map(([task]) => ({ taskUid: task['uid'], shapeKind: 'rectangle' })),
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const documentOf = (settings: Loose): Document =>
  ({
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: SCHEDULE,
    documentSettings: settings,
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }) as unknown as Document

const REGIONS: Regions = regionsFromScreen(ENVIRONMENT as unknown as Environment, TEMPLATE_SETTINGS as unknown as Settings)

interface Scene {
  readonly stored: Loose
  readonly drawn: Loose
  readonly taskGroupArea: Rect
  readonly placements: readonly Placement[]
  readonly lines: readonly Line[]
  readonly context: InputContext
}

// WHY: the picture is laid out at the place the view is drawn from (`drawn`), while the document the
// translator reads holds what is stored (`stored`) -- for the template, no place at all.
const sceneOf = (stored: Loose, drawn: Loose): Scene => {
  const regions = regionsFromScreen(ENVIRONMENT as unknown as Environment, drawn as unknown as Settings)
  const layout = layoutFromSchedule(SCHEDULE, drawn as unknown as Settings, regions)
  const geometry = geometryFromLayout(SCHEDULE, drawn as unknown as Settings, layout, regions, emptySelection(), null)
  const context = {
    document: documentOf(stored),
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
    newGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as unknown as InputContext
  return {
    stored,
    drawn,
    taskGroupArea: (regions as unknown as { readonly taskGroupArea: Rect }).taskGroupArea,
    placements: (layout as unknown as { readonly placements: readonly Placement[] }).placements,
    lines: geometry.dependencies as unknown as readonly Line[],
    context,
  }
}

// see OP-10
const TEMPLATE_PLACE: Loose = { scrollDate: FIRST_DAY, scrollDayOffset: 0, scrollGroupId: HEAD_TASK_GROUP, scrollGroupOffset: 0 }

// WHY: the template stores nothing, yet its picture is drawn at OP-10's place.
const unplaced = (): Scene => sceneOf(TEMPLATE_SETTINGS, { ...TEMPLATE_SETTINGS, ...TEMPLATE_PLACE })
// WHY: the control is the same view with the place stored.
const placed = (): Scene => {
  const stored = { ...TEMPLATE_SETTINGS, ...TEMPLATE_PLACE }
  return sceneOf(stored, stored)
}

const lineOf = (scene: Scene): Line => {
  const found = scene.lines.find((one) => one.predecessorUid === 1 && one.successorUid === 2)
  if (found === undefined) throw new Error('geometry.dependencies holds no line 1 -> 2')
  return found
}

const markOf = (scene: Scene): Pt => {
  const dots = lineOf(scene).continuation?.dots ?? []
  if (dots.length !== 3) throw new Error('premise: line 1 -> 2 carries no mark (EL-9)')
  return dots[1]!
}

const dayOf = (value: unknown): unknown => (typeof value === 'string' ? value.slice(0, 10) : value)

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

// WHY: PE-12 sends on one still press and release (clickCount 1), read with the press reading
// (the TRAP on PointerPress.hit); MK-13 gives the mark no double-click destination.
const stillClickOn = (scene: Scene): { readonly press: PointerPress; readonly out: TranslatedInput } => {
  const at = markOf(scene)
  const hit = itemAtPointer(scene.context.geometry, at.x, at.y, grabSizesOf(), 'press')
  const press = { at: pointer('down', at, 1), hit, on: null, pressRow: 'PTD-3' } as unknown as PointerPress
  const context = { ...scene.context, pressed: press } as InputContext
  return { press, out: commandFromGrab(pointer('up', at, 1), press, context) }
}

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

// WHY: the stored settings after the writes land in the document.
const storedAfter = (stored: Loose, writes: readonly Loose[]): Loose => {
  const next: Loose = { ...stored }
  for (const write of writes) {
    const { kind: _kind, ...fields } = write
    Object.assign(next, fields)
  }
  return next
}

describe('DFC-1230 -- the manuscript these cases are driven by', () => {
  it('T-303 EL-11 / EL-12 / EL-16, T-270 PE-12, T-024a OP-10 and T-203 S-77 / S-78 / S-176 still hold the words quoted', () => {
    for (const [cell, clause] of [
      [EL_11, EL_11_STAY],
      [EL_12, EL_12_SEND],
      [EL_12, EL_12_HOW],
      [EL_16, EL_16_MARK],
      [PE_12, PE_12_SEND],
      [OP_10, OP_10_CHOICE],
      [OP_10, OP_10_NOT_REDONE],
      [OP_10, OP_10_TEMPLATE_HAS_NO_PLACE],
      [OP_10, OP_10_TEMPLATE_PLACE],
      [OP_10, OP_10_FIRST_DAY],
      [S_77, S_77_NULL],
    ] as const) {
      expect(flat(cell), clause).toContain(flat(clause))
    }
    expect(S_77).toContain('`scrollDate`')
    expect(S_78).toContain('`scrollGroupId`')
    expect(S_176).toContain('`scrollGroupOffset`')
  })

  it(`the startup template stores no place: ${OP_10_TEMPLATE_HAS_NO_PLACE}`, () => {
    expect(TEMPLATE_SETTINGS['scrollDate'], OP_10_TEMPLATE_HAS_NO_PLACE).toBeNull()
    expect(TEMPLATE_SETTINGS['scrollGroupId'], OP_10_TEMPLATE_HAS_NO_PLACE).toBeNull()
  })
})

describe(`(a) translator -- EL-12: ${EL_12_SEND}`, () => {
  for (const [name, make] of [
    ['template, no place stored', unplaced],
    ['control, the place stored', placed],
  ] as const) {
    it(`${name}: premise -- the mark leads to Task 2, whose task group lies below and whose shape lies inside across`, () => {
      const scene = make()
      expect(lineOf(scene).continuation?.farUid, 'premise: the mark leads to Task 2').toBe(2)
      const far = scene.placements.find((one) => one.taskUid === 2)
      expect(far, 'premise: Task 2 is laid out (depth 1, not hidden by the LOD)').toBeDefined()
      expect(
        far!.x >= scene.taskGroupArea.x && far!.x + far!.width <= scene.taskGroupArea.x + scene.taskGroupArea.width,
        'premise: Task 2 lies inside the Task Group Area across',
      ).toBe(true)
      const { press } = stillClickOn(scene)
      expect(press.hit?.grab, `premise: the still press lands on GA-24 (${PE_12_SEND})`).toBe('GA-24')
    })

    it(`${name}: ${EL_12_HOW}`, () => {
      const scene = make()
      const writes = writesOf(stillClickOn(scene).out)
      expect(onlyOf(writes, SET_ZOOM), 'the far end is drawn, so EL-10 does not apply').toBeUndefined()
      const scroll = onlyOf(writes, SET_SCROLL)
      expect(scroll, EL_12_SEND).toBeDefined()
      expect(scroll!['scrollGroupId'], `${EL_12_HOW} (S-78)`).toBe(FAR_TASK_GROUP)
      expect(scroll!['scrollGroupOffset'], `${EL_12_HOW} (S-176)`).toBe(0)
    })

    it(`${name}: the write names a whole place, not a null day -- ${OP_10_CHOICE}`, () => {
      const scroll = onlyOf(writesOf(stillClickOn(make()).out), SET_SCROLL)
      expect(scroll, EL_12_SEND).toBeDefined()
      expect(scroll!['scrollDate'], `${OP_10_CHOICE} / ${S_77_NULL}`).not.toBeNull()
      expect(scroll!['scrollDate'], OP_10_CHOICE).toBeDefined()
    })

    it(`${name}: the far end is inside across, so the view keeps the day it is drawn from (${EL_11_STAY})`, () => {
      const scene = make()
      const scroll = onlyOf(writesOf(stillClickOn(scene).out), SET_SCROLL)
      expect(scroll, 'premise: EL-12 sent the view down').toBeDefined()
      expect(dayOf(scroll!['scrollDate']), `${EL_11_STAY}; drawn from ${OP_10_TEMPLATE_PLACE}`).toBe(
        dayOf(scene.drawn['scrollDate']),
      )
      expect(scroll!['scrollDayOffset'], EL_11_STAY).toBe(scene.drawn['scrollDayOffset'])
    })
  }
})

describe(`(b) shell view place -- ${OP_10_CHOICE}`, () => {
  const bootShell = () => heldViewPlaceOf({ readEnvironment: () => FRAME_ENVIRONMENT }, true)

  it(`premise: the template, opened, is drawn from the first day covered and the head task group (${OP_10_TEMPLATE_PLACE})`, () => {
    const shell = bootShell()
    const view = shell.viewSettingsOnce(documentOf(TEMPLATE_SETTINGS), TEMPLATE_SETTINGS as unknown as DocumentSettings, REGIONS)
    const margin = settingNumber('S-134') / 2 + settingNumber('S-268') / 2
    const drawnFirst = dateAtX(timeAxisOf(view.settings, REGIONS), REGIONS.taskGroupArea.x + margin)
    const drawnText = drawnFirst === null ? null : new Date(Date.UTC(drawnFirst.year, drawnFirst.month - 1, drawnFirst.day)).toISOString()
    expect(dayOf(drawnText), OP_10_FIRST_DAY).toBe(FIRST_DAY)
    expect(view.settings.scrollGroupId, OP_10_TEMPLATE_PLACE).toBe(HEAD_TASK_GROUP)
  })

  for (const [name, make] of [
    ['template, no place stored', unplaced],
    ['control, the place stored', placed],
  ] as const) {
    it(`${name}: after the still click, the view's top task group is the far task group (${EL_12_HOW}), not discarded`, () => {
      const scene = make()
      const shell = bootShell()
      shell.viewSettingsOnce(documentOf(scene.stored), scene.stored as unknown as DocumentSettings, REGIONS)
      const stored = storedAfter(scene.stored, writesOf(stillClickOn(scene).out))
      const view = shell.viewSettingsOnce(documentOf(stored), stored as unknown as DocumentSettings, REGIONS)
      expect(view.settings.scrollGroupId, `${OP_10_CHOICE}; ${EL_12_HOW} (S-78)`).toBe(FAR_TASK_GROUP)
      expect(view.settings.scrollGroupOffset, `${EL_12_HOW} (S-176)`).toBe(0)
      expect(dayOf(view.settings.scrollDate), `${EL_11_STAY}`).toBe(dayOf(scene.drawn['scrollDate']))
    })

    it(`${name}: the next frame, with nothing pressed, keeps it (${OP_10_NOT_REDONE})`, () => {
      const scene = make()
      const shell = bootShell()
      shell.viewSettingsOnce(documentOf(scene.stored), scene.stored as unknown as DocumentSettings, REGIONS)
      const stored = storedAfter(scene.stored, writesOf(stillClickOn(scene).out))
      shell.viewSettingsOnce(documentOf(stored), stored as unknown as DocumentSettings, REGIONS)
      const again = shell.viewSettingsOnce(documentOf(stored), stored as unknown as DocumentSettings, REGIONS)
      expect(again.settings.scrollGroupId, OP_10_NOT_REDONE).toBe(FAR_TASK_GROUP)
    })
  }
})
