// CR-753 spec-only cases: a Ctrl drag copy (PTD-7, CY-5, CY-9) lands where the body move (PE-1) lands, keeping its time.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressRowOf,
  type HumanInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPhase,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { Selection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer, type Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { BarGeometry, Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { snapMinutesOf } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NOT_STORED_ZOOM_BOUNDS, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const flat = (text: string): string => text.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const rowText = (table: string, id: string): string => flat(rowOf(table, id).cells.join(' | '))

const numberOf = (table: string, id: string, heading: string): number => {
  const numbers = bare(rowOf(table, id).by[heading] ?? '').match(/\d+(?:\.\d+)?/g) ?? []
  if (numbers.length !== 1) throw new Error(`${id} of table ${table} does not hold one number`)
  return Number(numbers[0])
}

// WHY: every number below is read from the settings tables, never held here.
const S_1 = numberOf('T-201', 'S-1', '既定値')
const S_8 = numberOf('T-201', 'S-8', '既定値')
const S_85 = numberOf('T-205', 'S-85', '既定')
const S_577 = numberOf('T-205', 'S-577', '既定')
const S_578 = numberOf('T-205', 'S-578', '既定')
const S_208 = numberOf('T-206', 'S-208', '既定')
const S_229 = numberOf('T-206', 'S-229', '既定')

const timeOfRow = (id: string): string => {
  const found = bare(rowOf('T-209', id).by['値'] ?? '').match(/\d{2}:\d{2}:\d{2}/)
  if (found === null) throw new Error(`${id} of table T-209 holds no time`)
  return found[0]
}
// WHY: the default times a day snap writes (T-350 WT-1 / WT-2) are read from T-209, never held here.
const S_482 = timeOfRow('S-482')
const S_483 = timeOfRow('S-483')

describe('CR-753 -- the spec sentences these cases are driven by', () => {
  it('CY-5: the amount is counted and snapped as the body move counts it (PE-1 / PE-6, T-378)', () => {
    const text = rowText('T-308', 'CY-5')
    expect(text).toContain('すべてのコピーの予定を、引いた量だけずらすこと（MUST）')
    expect(text).toContain('本体を引いて動かすとき（表 T-270 の `PE-1` ・ `PE-6`）と同じとする')
    expect(text).toContain('押した点の下のタスクの開始で寄せた量を求め、その 1 つの量をすべてのコピーに当てる')
  })

  it('CY-5: with the time shown and a day snap, the copy lands on the day the body move lands on', () => {
    const text = rowText('T-308', 'CY-5')
    expect(text).toContain('離した位置に最も近い日の境')
    expect(text).toContain('同じ引きは、移しても写しても同じ日に着く')
  })

  it('CY-5: hour, 30 minutes and 1 minute shift by the snapped minutes; the copy keeps its time and length', () => {
    const text = rowText('T-308', 'CY-5')
    expect(text).toContain('時・30 分・1 分で寄せるとき（`SG-2` 〜 `SG-4`）は、寄せた分だけずらすこと（MUST）')
    expect(text).toContain('同じ日の中にも写せる')
    expect(text).toContain('コピーはコピー元の時刻と長さを保つ')
    expect(text).toContain('着いた日に既定の時刻（表 T-350）を書かない')
    expect(text).toContain('`Shift` も伴って押したときは量を 0 とし、コピーの予定をコピー元と同じ日時とすること（MUST）')
  })

  it('CY-7: a copy has no actual', () => {
    expect(rowText('T-308', 'CY-7')).toContain('コピーは実績を持たない')
  })

  it('CY-9: a release with amount 0 and 0 task groups copies nothing and keeps the selection', () => {
    const text = rowText('T-308', 'CY-9')
    expect(text).toContain('引いた量（`CY-5`）とタスクグループ数がともに 0 である')
    expect(text).toContain('いずれも文書に書かず、選択も変えないこと（MUST）')
  })

  it('PTD-7: the copy is drawn while held where the release puts it, on the same day', () => {
    const text = rowText('T-023a', 'PTD-7')
    expect(text).toContain('押しているあいだ、コピーを置くことになる所にコピーを描き、コピー元はそのまま描くこと（MUST）')
    expect(text).toContain('置くことになる所の日数は、離したときと同じ 表 T-308 の `CY-5` の日数である')
    expect(text).toContain('描いた所と離して置かれる所はずれない')
  })

  it('FR-103 / T-378: the day of a day snap with the time shown is the nearest day boundary', () => {
    expect(REQUIREMENTS).toContain('離した位置は、表 T-378 の単位で寄せた瞬間として読むこと（MUST）')
    expect(REQUIREMENTS).toContain('離した位置に最も近い日の境（`00:00`）を `FR-054` の側で読んだ日とすること（MUST）')
    expect(REQUIREMENTS).toContain('時刻を表示しないときは、離した位置が落ちる日の列の日とする')
    expect(rowText('T-378', 'SG-1')).toContain('目盛が時の段（`FR-017` の 表 T-238 の `TM-5`）に達していない')
    expect(rowText('T-378', 'SG-2')).toContain('時刻を表示し、目盛が時の段にある')
    expect(rowText('T-378', 'SG-3')).toContain('1 日の幅が `_assets/tbl-settings.md` の 表 T-205 の `S-578` 以上')
  })

  it('T-350 / T-209: the default times are read from S-482 and S-483', () => {
    expect(rowText('T-350', 'WT-1')).toContain('既定の開始時刻')
    expect(rowText('T-350', 'WT-2')).toContain('既定の終了時刻')
    expect(S_482).toMatch(/^\d{2}:\d{2}:00$/)
    expect(S_483).toMatch(/^\d{2}:\d{2}:00$/)
  })

  it('FR-017: the tier is judged on pxPerDay over (ruler font / S-8)', () => {
    expect(REQUIREMENTS).toContain('判定式は `pxPerDay ÷ (実効フォントサイズ ÷ `S-8`) ≧ しきい値` とする')
  })
})

// WHY: two task groups, one task in the first; 2026-10-12 is a Monday, 10/14 a Wednesday, 10/15 a Thursday.

const TASK_GROUP_A = '75300000-0000-4000-8000-00000000000a'
const TASK_GROUP_B = '75300000-0000-4000-8000-00000000000b'
const SOURCE = 1
const SOURCE_NAME = 'Source'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const RULER_FONT = SETTINGS_DEFAULTS['rulerFont'] as number

// WHY: FR-017 judges pxPerDay / (rulerFont * ratio / S-8) and pxPerDay = S-1 * ratio * zoomX, so the ratio cancels:
// a zoomX for a wanted judged width is judged * rulerFont / (S-1 * S-8).
const zoomXFor = (judged: number): number => (judged * RULER_FONT) / (S_1 * S_8)

interface Scene {
  readonly start: string
  readonly finish: string
  readonly showsTimeOfDay: boolean
  readonly zoomX: number
  readonly scrollDate: string
  readonly scrollDayOffset: number
}

function fixtureDocument(scene: Scene): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  const source = {
    uid: SOURCE,
    parentTaskUid: null,
    wbsOrder: 1,
    name: SOURCE_NAME,
    start: scene.start,
    finish: scene.finish,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  }
  return {
    '$schema': template['$schema'],
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: {
        ...(schedule['project'] as Record<string, unknown>),
        startDate: '2026-10-12T08:00:00',
        statusDate: null,
        uidHighWaterMark: 100,
      },
      calendars: schedule['calendars'],
      tasks: [source],
      resources: [],
      assignments: [],
      taskGroups: [TASK_GROUP_A, TASK_GROUP_B].map((id, order) => ({
        id,
        parentId: null,
        label: `task group ${order}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: [{ taskUid: SOURCE, groupId: TASK_GROUP_A }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      showsTimeOfDay: scene.showsTimeOfDay,
      // WHY: the progress marker (GA-18) of an unstarted task would cover the middle of a short body.
      progressMarkerVisible: false,
      zoomX: scene.zoomX,
      scrollDate: scene.scrollDate,
      scrollDayOffset: scene.scrollDayOffset,
      scrollGroupId: TASK_GROUP_A,
      scrollGroupOffset: 0,
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

// WHY: SG-1 with the time shown -- judged between S-85 (day tier) and S-577 (hour tier).
const DAY_SNAP_TIME_SHOWN: Scene = {
  start: '2026-10-14T06:00:00',
  finish: '2026-10-14T10:00:00',
  showsTimeOfDay: true,
  zoomX: zoomXFor((S_85 + S_577) * 0.6),
  scrollDate: '2026-10-14',
  scrollDayOffset: 0,
}

// WHY: SG-1 with the time hidden -- the FR-016 day ceiling is area / (S-229 * S-1 * ratio); a third of it is safe.
const DAY_SNAP_TIME_HIDDEN: Scene = {
  start: '2026-10-12T06:00:00',
  finish: '2026-10-12T10:00:00',
  showsTimeOfDay: false,
  zoomX: 1100 / (S_229 * S_1) / 2,
  scrollDate: '2026-10-11',
  scrollDayOffset: 0,
}

// WHY: SG-2 -- judged between S-577 and S-578.
const HOUR_SNAP: Scene = {
  start: '2026-10-14T09:00:00',
  finish: '2026-10-14T12:00:00',
  showsTimeOfDay: true,
  zoomX: zoomXFor((S_577 + S_578) / 2),
  scrollDate: '2026-10-14',
  scrollDayOffset: 0.25,
}

// WHY: SG-3 -- judged over S-578, kept under the FR-016 zoomX ceiling S-55 by staying near S-578.
const HALF_HOUR_SNAP: Scene = {
  ...HOUR_SNAP,
  zoomX: zoomXFor(S_578 * 1.3),
}

const SCREEN: FrameEnvironment = { width: 1400, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  selection(): Selection
  tasks(): readonly Task[]
}

function stage(scene: Scene): Stage {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const loop = frameLoop({ showSvg: () => undefined } as never, fixtureDocument(scene), SCREEN, wiring, undefined, () => undefined)
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    selection: () => loop.agentApiSeams().source.readSnapshot().selection as unknown as Selection,
    tasks: () => loop.document().schedule.tasks,
  }
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const CTRL: Partial<InputModifiers> = { ctrl: true }
const CTRL_SHIFT: Partial<InputModifiers> = { ctrl: true, shift: true }
const PLAIN: Partial<InputModifiers> = {}

const pointer = (phase: PointerPhase, at: Point, modifiers: Partial<InputModifiers> = {}): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
  clickCount: 1,
})

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

function boxOf(bar: BarGeometry | null, what: string): ScreenRect {
  if (bar === null) throw new Error(`${what} was not drawn`)
  const points: readonly Point[] = bar.form === 'outline' ? bar.points : [bar.from, bar.to]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

const planBox = (loop: FrameLoop, uid: number): ScreenRect => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not drawn`)
  return boxOf(found.plan, `the plan of Task ${uid}`)
}

const hitAt = (loop: FrameLoop, at: Point): Hit | null => itemAtPointer(frameOf(loop).geometry, at.x, at.y, grabSizesOf())

// WHY: the three grabs of a task body -- table T-270 PE-1 / PE-6 through T-266 GA-9 / GA-14 / GA-15.
const BODY_GRABS = ['GA-9', 'GA-14', 'GA-15']

const bodyOf = (loop: FrameLoop, uid: number): Point => {
  const box = planBox(loop, uid)
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const hit = hitAt(loop, at)
  expect(hit?.item.kind, `the body point of task ${uid} hits a task`).toBe('task')
  expect(BODY_GRABS, `the body point of task ${uid} is a body grab`).toContain(hit?.grab as string)
  return at
}

const pxPerDay = (loop: FrameLoop): number => frameOf(loop).layout.pxPerDay

const groupY = (loop: FrameLoop, groupId: string): number => {
  const found = frameOf(loop).layout.taskGroups.find((one) => one.groupId === groupId)
  if (found === undefined) throw new Error(`the frame drew no task group ${groupId}`)
  return found.y
}

// WHY: a travel of a number of calendar days (fractions allowed) across, and from task group A to `to` down.
const travel = (loop: FrameLoop, days: number, to: string = TASK_GROUP_A): Point => ({
  x: days * pxPerDay(loop),
  y: groupY(loop, to) - groupY(loop, TASK_GROUP_A),
})

const MINUTES_PER_DAY = 24 * 60
const hours = (count: number): number => count / 24

const click = (built: Stage, at: Point): void => {
  built.send(pointer('move', at))
  built.send(pointer('down', at))
  built.send(pointer('up', at))
}

function drag(built: Stage, from: Point, by: Point, modifiers: Partial<InputModifiers>): void {
  const to = { x: from.x + by.x, y: from.y + by.y }
  built.send(pointer('move', from, modifiers))
  built.send(pointer('down', from, modifiers))
  built.send(pointer('move', to, modifiers))
  built.send(pointer('up', to, modifiers))
}

const taskOf = (built: Stage, uid: number): Task => {
  const found = built.tasks().find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`no task ${uid}`)
  return found
}

const newTasks = (before: readonly Task[], after: readonly Task[]): readonly Task[] => {
  const old = new Set(before.map((one) => one.uid))
  return after.filter((one) => !old.has(one.uid))
}

const theCopy = (before: readonly Task[], after: readonly Task[]): Task => {
  const found = newTasks(before, after)
  if (found.length !== 1) throw new Error(`expected one copy; found ${found.length}`)
  return found[0] as Task
}

const groupOf = (built: Stage, uid: number): string | undefined =>
  built.loop.document().schedule.taskGroupMembers.find((one) => one.taskUid === uid)?.groupId

const day = (value: string | null): string | null => (value === null ? null : value.slice(0, 10))
const clock = (value: string | null): string | null => (value === null ? null : value.slice(11, 19))
const planOf = (one: Task) => ({ start: one.start, finish: one.finish })

const selectedUids = (built: Stage): number[] =>
  (built.selection() as unknown as { readonly items: readonly { kind: string; uid: number }[] }).items
    .filter((one) => one.kind === 'task')
    .map((one) => one.uid)

const selectSource = (built: Stage): void => {
  click(built, bodyOf(built.loop, SOURCE))
  expect(selectedUids(built), 'SL-2: a click on the body picks the task').toEqual([SOURCE])
}

function copyThroughShell(scene: Scene, days: number, modifiers: Partial<InputModifiers>, to: string = TASK_GROUP_A) {
  const built = stage(scene)
  selectSource(built)
  const before = built.tasks()
  drag(built, bodyOf(built.loop, SOURCE), travel(built.loop, days, to), modifiers)
  return { built, before, after: built.tasks() }
}

const PICKED_SOURCE: Selection = { items: [{ kind: 'task', uid: SOURCE }], ordered: true } as unknown as Selection

function contextOf(built: Stage): InputContext {
  const values = frameOf(built.loop)
  return {
    document: built.loop.document(),
    layout: values.layout,
    geometry: values.geometry,
    regions: values.regions,
    screen: emptyScreenSession.screen,
    selection: PICKED_SOURCE,
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-10-01',
    newGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as unknown as InputContext
}

function writesOfRelease(scene: Scene, days: number, modifiers: Partial<InputModifiers>, to: string = TASK_GROUP_A) {
  const built = stage(scene)
  const context = contextOf(built)
  const from = bodyOf(built.loop, SOURCE)
  const by = travel(built.loop, days, to)
  const down = pointer('down', from, modifiers)
  const hit = hitAt(built.loop, from)
  const press: PointerPress = { at: down, hit, on: null, pressRow: pressRowOf({ at: down, hit }, context) }
  expect(press.pressRow, 'premise: the press is PTD-7').toBe('PTD-7')
  const up = pointer('up', { x: from.x + by.x, y: from.y + by.y }, modifiers) as HumanInput
  const action = commandFromInput(up, { ...context, pressed: press }).action as unknown as {
    kind?: string
    writes?: readonly (readonly DocumentCommand[])[]
  } | null
  return action?.kind === 'changeDocument' && action.writes !== undefined ? action.writes.flat() : []
}

interface Landing {
  readonly shiftMinutes: number
  readonly groupIdOf: Readonly<Record<number, string>>
}

const landingOf = (writes: readonly DocumentCommand[]): Landing => {
  expect(writes.map((one) => (one as unknown as { kind: string }).kind), 'S1: one pasteTasks').toEqual(['pasteTasks'])
  return (writes[0] as unknown as { landing: Landing }).landing
}

const settingsOf = (scene: Scene): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, showsTimeOfDay: scene.showsTimeOfDay, zoomX: scene.zoomX }) as unknown as DocumentSettings

describe('premise: each scene sits on the T-378 row it is named after', () => {
  it.each([
    ['SG-1 with the time shown', DAY_SNAP_TIME_SHOWN, MINUTES_PER_DAY, 0.2],
    ['SG-1 with the time hidden', DAY_SNAP_TIME_HIDDEN, MINUTES_PER_DAY, 3],
    ['SG-2', HOUR_SNAP, 60, hours(3)],
    ['SG-3', HALF_HOUR_SNAP, 30, hours(1 + 20 / 60)],
  ])('%s', (_name, scene, minutes, smallestDays) => {
    const built = stage(scene)
    expect(snapMinutesOf(pxPerDay(built.loop), settingsOf(scene), false)).toBe(minutes)
    expect(smallestDays * pxPerDay(built.loop), 'premise: the smallest travel used is past S-208').toBeGreaterThan(S_208)
  })
})

describe('case 1 -- CY-5 / SG-1, time shown: a Ctrl drag of 0.6 day lands the copy on the day the body move lands on', () => {
  it('S5: 10/14 06:00 + 14.4 h = 20:24, nearest boundary 10/15 00:00 -- the copy starts on 10/15', () => {
    const { before, after } = copyThroughShell(DAY_SNAP_TIME_SHOWN, 0.6, CTRL)
    expect(day(theCopy(before, after).start)).toBe('2026-10-15')
    expect(day(theCopy(before, after).finish)).toBe('2026-10-15')
  })

  it('S5 contrast: the same drag without Ctrl moves the body to 10/15 too (PE-1)', () => {
    const built = stage(DAY_SNAP_TIME_SHOWN)
    selectSource(built)
    drag(built, bodyOf(built.loop, SOURCE), travel(built.loop, 0.6), PLAIN)
    expect(day(taskOf(built, SOURCE).start)).toBe('2026-10-15')
  })

  it('S5: the source stays and the copy is unstarted (CY-7)', () => {
    const { built, before, after } = copyThroughShell(DAY_SNAP_TIME_SHOWN, 0.6, CTRL)
    expect(taskOf(built, SOURCE)).toEqual(before[0])
    const copy = theCopy(before, after)
    expect(groupOf(built, copy.uid), 'CY-6: 0 task groups pulled, the copy sits in the source task group').toBe(TASK_GROUP_A)
    expect({ actualStart: copy.actualStart, stop: copy.stop, actualFinish: copy.actualFinish, resume: copy.resume }).toEqual({
      actualStart: null,
      stop: null,
      actualFinish: null,
      resume: null,
    })
  })

  it('S1: the release writes one pasteTasks with shiftMinutes of one day', () => {
    const landing = landingOf(writesOfRelease(DAY_SNAP_TIME_SHOWN, 0.6, CTRL))
    expect(landing.shiftMinutes).toBe(MINUTES_PER_DAY)
  })
})

describe('case 2 -- CY-9 (2): a Ctrl drag of 0.2 day snaps back to the same day and copies nothing', () => {
  it('S5: 10/14 06:00 + 4.8 h = 10:48, nearest boundary 10/14 00:00 -- no copy, document and selection unchanged', () => {
    const { built, before, after } = copyThroughShell(DAY_SNAP_TIME_SHOWN, 0.2, CTRL)
    expect(after).toEqual(before)
    expect(selectedUids(built)).toEqual([SOURCE])
  })

  // WHY: SPEC-READ -- a body move landing on its own day may rewrite the times (FR-103); only the day is pinned.
  it('S5 contrast: the plain move does not move the body to another day', () => {
    const built = stage(DAY_SNAP_TIME_SHOWN)
    selectSource(built)
    drag(built, bodyOf(built.loop, SOURCE), travel(built.loop, 0.2), PLAIN)
    expect(day(taskOf(built, SOURCE).start)).toBe('2026-10-14')
    expect(day(taskOf(built, SOURCE).finish)).toBe('2026-10-14')
  })

  it('S1: the release writes no pasteTasks', () => {
    const writes = writesOfRelease(DAY_SNAP_TIME_SHOWN, 0.2, CTRL)
    expect(writes.map((one) => (one as unknown as { kind: string }).kind)).not.toContain('pasteTasks')
  })
})

describe('case 3 -- PTD-7: while held at 0.6 day, the copy is drawn on the day the release puts it', () => {
  it('S5: the held copy stands where the released copy stands, one day right of the source', () => {
    const built = stage(DAY_SNAP_TIME_SHOWN)
    selectSource(built)
    const before = built.tasks()
    const sourceBox = planBox(built.loop, SOURCE)
    const from = bodyOf(built.loop, SOURCE)
    const by = travel(built.loop, 0.6)
    const to = { x: from.x + by.x, y: from.y + by.y }
    built.send(pointer('move', from, CTRL))
    built.send(pointer('down', from, CTRL))
    built.send(pointer('move', to, CTRL))
    expect(built.tasks(), 'FR-031: nothing is written while held').toEqual(before)
    const held = frameOf(built.loop).geometry.tasks.filter((one) => one.taskUid !== SOURCE)
    expect(held.length, 'PTD-7: one copy is drawn while held').toBe(1)
    const heldBox = boxOf((held[0] as { plan: BarGeometry | null }).plan, 'the held copy')
    // WHY: with the time shown a bar stands on its instants (RV-1); one day later is one day width to the right.
    expect(Math.abs(heldBox.x - (sourceBox.x + pxPerDay(built.loop))), 'the held copy is drawn on 10/15 06:00').toBeLessThan(1)
    expect(Math.abs(planBox(built.loop, SOURCE).x - sourceBox.x), 'the source is drawn where it was').toBeLessThan(1)
    built.send(pointer('up', to, CTRL))
    const copy = theCopy(before, built.tasks())
    expect(day(copy.start)).toBe('2026-10-15')
    expect(Math.abs(planBox(built.loop, copy.uid).x - heldBox.x), 'drawn and placed do not part').toBeLessThan(1)
  })
})

describe('case 4 -- CY-5 / SG-1, time hidden: the copy shifts by the dropped day-column count', () => {
  it('S5: 3 columns right moves the copy from Monday 10/12 to Thursday 10/15', () => {
    const { before, after } = copyThroughShell(DAY_SNAP_TIME_HIDDEN, 3, CTRL)
    const copy = theCopy(before, after)
    expect(day(copy.start)).toBe('2026-10-15')
    expect(day(copy.finish)).toBe('2026-10-15')
  })

  // WHY: SPEC-READ -- the CY-5 sentence that the copy keeps the source time and length is read to hold with the time hidden.
  it('S5: the copy keeps the source time and length with the time hidden', () => {
    const { before, after } = copyThroughShell(DAY_SNAP_TIME_HIDDEN, 3, CTRL)
    expect(planOf(theCopy(before, after))).toEqual({ start: '2026-10-15T06:00:00', finish: '2026-10-15T10:00:00' })
  })

  it('S1: shiftMinutes is three days', () => {
    expect(landingOf(writesOfRelease(DAY_SNAP_TIME_HIDDEN, 3, CTRL)).shiftMinutes).toBe(3 * MINUTES_PER_DAY)
  })
})

describe('case 5 -- CY-5: Ctrl + Shift copies with an amount of 0 whatever the pull', () => {
  it('S5: 0.6 day right and one task group down -- the copy keeps the source date and time, in task group B', () => {
    const { built, before, after } = copyThroughShell(DAY_SNAP_TIME_SHOWN, 0.6, CTRL_SHIFT, TASK_GROUP_B)
    const copy = theCopy(before, after)
    expect(planOf(copy)).toEqual({ start: '2026-10-14T06:00:00', finish: '2026-10-14T10:00:00' })
    expect(groupOf(built, copy.uid), 'CY-6').toBe(TASK_GROUP_B)
  })

  it('S5: the same with the hour tier and 3 hours of pull -- still the source date and time', () => {
    const { before, after } = copyThroughShell(HOUR_SNAP, hours(3), CTRL_SHIFT, TASK_GROUP_B)
    expect(planOf(theCopy(before, after))).toEqual({ start: '2026-10-14T09:00:00', finish: '2026-10-14T12:00:00' })
  })

  it('S1: shiftMinutes is 0 and the task group is B', () => {
    const landing = landingOf(writesOfRelease(DAY_SNAP_TIME_SHOWN, 2.6, CTRL_SHIFT, TASK_GROUP_B))
    expect(landing.shiftMinutes).toBe(0)
    expect(landing.groupIdOf[SOURCE]).toBe(TASK_GROUP_B)
  })

  // WHY: SPEC-READ -- with Shift the CY-5 amount is 0, so a pull across only (0 task groups) is CY-9 (2).
  it('S5: a Ctrl + Shift pull across only (no task group) copies nothing (CY-9 (2))', () => {
    const { built, before, after } = copyThroughShell(DAY_SNAP_TIME_SHOWN, 2.6, CTRL_SHIFT)
    expect(after).toEqual(before)
    expect(selectedUids(built)).toEqual([SOURCE])
  })
})

describe('case 6 -- JDG-2068 / CY-5: a day snap with the time shown keeps the source time and length', () => {
  it('S5: 06:00-10:00 is copied to 10/15 06:00-10:00', () => {
    const { before, after } = copyThroughShell(DAY_SNAP_TIME_SHOWN, 0.6, CTRL)
    expect(planOf(theCopy(before, after))).toEqual({ start: '2026-10-15T06:00:00', finish: '2026-10-15T10:00:00' })
  })

  it('S5: the copy does not carry the default times of T-350 (S-482 / S-483)', () => {
    const { before, after } = copyThroughShell(DAY_SNAP_TIME_SHOWN, 0.6, CTRL)
    const copy = theCopy(before, after)
    expect(clock(copy.start)).not.toBe(S_482)
    expect(clock(copy.finish)).not.toBe(S_483)
  })
})

describe('case 7 -- JDG-2069 / CY-5: the hour and 30-minute snaps shift by the snapped minutes, inside one day', () => {
  it('S5, SG-2: 09:00-12:00 pulled 3 hours right is copied to 12:00-15:00 on the same day', () => {
    const { built, before, after } = copyThroughShell(HOUR_SNAP, hours(3), CTRL)
    expect(planOf(theCopy(before, after))).toEqual({ start: '2026-10-14T12:00:00', finish: '2026-10-14T15:00:00' })
    expect(planOf(taskOf(built, SOURCE)), 'the source stays').toEqual({ start: HOUR_SNAP.start, finish: HOUR_SNAP.finish })
  })

  it('S5, SG-2 contrast: the plain move of the same pull starts at 12:00 too', () => {
    const built = stage(HOUR_SNAP)
    selectSource(built)
    drag(built, bodyOf(built.loop, SOURCE), travel(built.loop, hours(3)), PLAIN)
    expect(taskOf(built, SOURCE).start).toBe('2026-10-14T12:00:00')
  })

  it('S1, SG-2: shiftMinutes is 180', () => {
    expect(landingOf(writesOfRelease(HOUR_SNAP, hours(3), CTRL)).shiftMinutes).toBe(180)
  })

  it('S5, SG-3: a pull of 1 h 20 lands on the nearest 30 minutes -- 09:00 + 1:30 = 10:30-13:30', () => {
    const { before, after } = copyThroughShell(HALF_HOUR_SNAP, hours(1 + 20 / 60), CTRL)
    expect(planOf(theCopy(before, after))).toEqual({ start: '2026-10-14T10:30:00', finish: '2026-10-14T13:30:00' })
  })

  it('S5, SG-3 contrast: the plain move of the same pull starts where the copy starts', () => {
    const copied = copyThroughShell(HALF_HOUR_SNAP, hours(1 + 20 / 60), CTRL)
    const copyStart = theCopy(copied.before, copied.after).start
    const built = stage(HALF_HOUR_SNAP)
    selectSource(built)
    drag(built, bodyOf(built.loop, SOURCE), travel(built.loop, hours(1 + 20 / 60)), PLAIN)
    expect(taskOf(built, SOURCE).start).toBe(copyStart)
    expect(taskOf(built, SOURCE).start).toBe('2026-10-14T10:30:00')
  })

  it('S1, SG-3: shiftMinutes is 90', () => {
    expect(landingOf(writesOfRelease(HALF_HOUR_SNAP, hours(1 + 20 / 60), CTRL)).shiftMinutes).toBe(90)
  })
})
