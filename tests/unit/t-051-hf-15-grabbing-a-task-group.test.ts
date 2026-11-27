// Unit tests: GR-20's strip on a task group is what HF-15's grab is taken on.

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture document and the frame are reached as loose shapes */

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readRepoFile(join(SPEC, '01-04-requirements.md'), 'utf8'))

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const saysOf = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

// Why: read, never copied, since a literal would keep passing after the value was
// re-decided.
function settingOf(table: string, id: string, column: string): number {
  const cell = bare(rowOf(table, id).by[column] ?? '')
  const found = /-?\d+(?:\.\d+)?/.exec(cell)
  if (found === null) throw new Error(`${id} of table ${table} states no number in ${column}`)
  return Number(found[0])
}

// Why: read from the default column, since T-206's value column names a row and would
// yield that row id's digits.
const S_208_CARRIES_PAST = settingOf('T-206', 'S-208', '既定')

const S_37_INDENT = settingOf('T-201', 'S-37', '既定値')

const S_125_MAX_DEPTH = settingOf('T-211', 'S-125', '値')

const U_22_PART = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

// Why: BT-4's template, which FR-027 keeps one of, gives the calendar, project and
// settings; the task groups are written here so what is drawn can be named.
const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

// Why: the ids are UUIDs because AT-51 is one.
const id = (n: number): string => `5a000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const ALPHA = id(1)
const A1 = id(2)
const A1X = id(3)
const A2 = id(4)
const A2A = id(5)
const BETA = id(6)
const B1 = id(7)
const GAMMA = id(8)
const G1 = id(9)
const DELTA = id(10)
const D1 = id(11)

// Why: every group has a child, as the spec leaves open whether a childless one offers a deeper place,
// A1's child tells last from first, and GAMMA is folded mid-panel where a counting walk lands in it.
const TASK_GROUPS: readonly { readonly id: string; readonly parent: string | null; readonly order: number }[] =
  [
    { id: ALPHA, parent: null, order: 0 },
    { id: A1, parent: ALPHA, order: 0 },
    { id: A1X, parent: A1, order: 0 },
    { id: A2, parent: ALPHA, order: 1 },
    { id: A2A, parent: A2, order: 0 },
    { id: BETA, parent: null, order: 1 },
    { id: B1, parent: BETA, order: 0 },
    { id: GAMMA, parent: null, order: 2 },
    { id: G1, parent: GAMMA, order: 0 },
    { id: DELTA, parent: null, order: 3 },
    { id: D1, parent: DELTA, order: 0 },
  ]

const NAME_OF = new Map<string, string>([
  [ALPHA, 'Alpha'],
  [A1, 'A1'],
  [A1X, 'A1X'],
  [A2, 'A2'],
  [A2A, 'A2A'],
  [BETA, 'Beta'],
  [B1, 'B1'],
  [GAMMA, 'Gamma'],
  [G1, 'G1'],
  [DELTA, 'Delta'],
  [D1, 'D1'],
])

const nameOf = (taskGroupId: string): string => NAME_OF.get(taskGroupId) ?? taskGroupId

interface Fixture {
  readonly rows?: readonly { readonly id: string; readonly parent: string | null; readonly order: number }[]
  readonly folded?: readonly string[]
  readonly pinned?: readonly string[]
}

function documentWith(part: Fixture = {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const rows = part.rows ?? TASK_GROUPS
  const folded = new Set(part.folded ?? [GAMMA])
  const task = (uid: number): Task =>
    ({
      uid,
      parentTaskUid: null,
      wbsOrder: uid,
      name: `T${uid}`,
      start: '2026-04-06T00:00:00',
      finish: '2026-04-10T00:00:00',
      milestone: false,
      deadline: null,
      notes: null,
      calendarUid: null,
      actualStart: null,
      actualDuration: null,
      actualFinish: null,
      resume: null,
      resumeValid: null,
      percentComplete: 0,
      fadeInDays: null,
      fadeOutDays: null,
      dependencies: [],
      carry: {},
      carryElements: [],
    }) as unknown as Task
  return {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 500,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: rows.map((_row, at) => task(at + 1)),
      resources: [],
      assignments: [],
      taskGroups: rows.map((one) => ({
        id: one.id,
        parentId: one.parent,
        name: nameOf(one.id),
        derivedFromTaskUid: null,
        order: one.order,
        treeState: folded.has(one.id) ? 'collapsed' : 'auto',
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: rows.map((one, at) => ({
        taskUid: at + 1,
        taskGroupId: one.id,
      })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      ...(part.pinned === undefined ? {} : { pinnedTaskGroupIds: [...part.pinned] }),
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 800,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

// Summary: When a case runs the frames, the host shall run the queued animation frames and decide nothing about presses, pictures or documents.
function host(): Host {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  aimAtTheStrip(taskGroupId: string): void
  aimAtTheName(taskGroupId: string): void
}

// Why: entry is null because table T-109 holds no row for a grab strip, so no IconId
// could be carried.
const onTheStrip = (taskGroupId: string): ScreenPart => ({
  part: U_22_PART,
  entry: null,
  format: null,
  taskGroupId: taskGroupId,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
  isTaskGroupGrabStrip: true,
})

const onTheName = (taskGroupId: string): ScreenPart => ({
  part: U_22_PART,
  entry: null,
  format: null,
  taskGroupId: taskGroupId,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
})

function stage(part: Fixture = {}): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface as any, documentWith(part), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  return {
    loop,
    screen,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    aimAtTheStrip: (taskGroupId) => screen.drawAt(onTheStrip(taskGroupId)),
    aimAtTheName: (taskGroupId) => screen.drawAt(onTheName(taskGroupId)),
  }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

function bandOf(loop: FrameLoop, taskGroupId: string): { readonly y: number; readonly height: number } {
  const found = (frameOf(loop).layout as any).taskGroups.find((one: any) => one.taskGroupId === taskGroupId)
  if (found === undefined) throw new Error(`the frame drew no band for task group ${nameOf(taskGroupId)}`)
  return { y: found.y as number, height: found.height as number }
}

function stripPoint(loop: FrameLoop, taskGroupId: string): { readonly x: number; readonly y: number } {
  const panel = frameOf(loop).regions.taskGroupPanel
  const band = bandOf(loop, taskGroupId)
  return { x: panel.x + 1, y: band.y + band.height / 2 }
}

interface Row {
  readonly id: string
  readonly parentId: string | null
  readonly order: number
}

const rowsOf = (loop: FrameLoop): readonly Row[] =>
  (loop.document().schedule as any).taskGroups as readonly Row[]

function storedTaskGroup(loop: FrameLoop, taskGroupId: string): Row {
  const found = rowsOf(loop).find((one) => one.id === taskGroupId)
  if (found === undefined) throw new Error(`the document has no task group ${nameOf(taskGroupId)}`)
  return found
}

function depthOf(loop: FrameLoop, taskGroupId: string): number {
  let at: string | null = taskGroupId
  let depth = 0
  for (let guard = 0; guard < 64 && at !== null; guard += 1) {
    depth += 1
    at = storedTaskGroup(loop, at).parentId
  }
  return depth
}

const PAST = S_208_CARRIES_PAST + 1

// Spec: HF-15, GR-20, UN-4, CM-73, HM-9, HM-3, FR-085, S-125
describe('the specification still says what these cases are driven by', () => {
  it('表 T-051 still holds HF-15, and every MUST these cases assert is still in it', () => {
    const hf15 = saysOf('T-051', 'HF-15')
    for (const clause of [
      '`GRS` は、タスクグループを掴んで動かせるようにすること（掴み代は 表 T-023d の `GR-20`）。',
      '`GRS` は、運んだタスクグループを配下ごと動かすこと。',
      '`GRS` は、上限を、掴んでいるタスクグループ自身が `FR-004` の深さの上限を超えないところまで下げること。',
      '`GRS` は、配下が深さの上限を超える段も選べるようにすること。',
      '配下が深さの上限を超える段で離したとき、`GRS` は、書き込む前に 表 T-234 の `QN-16` で問うこと。',
      '配下が深さの上限を超える段で離したとき、`GRS` は、黙って止めないこと。',
    ]) {
      expect(hf15, `表 T-051 の HF-15 no longer says 「${clause}」`).toContain(clause)
    }
  })

  it('表 T-051 HF-15 no longer counts the subtree into the cap, and no longer hides a gap without a place (CR-774)', () => {
    const hf15 = saysOf('T-051', 'HF-15')
    expect(hf15).not.toContain('配下を含めて `FR-004` の深さの上限')
    expect(hf15).not.toContain('置ける段が 1 つも無い隙間では差し込み線を引かず')
  })

  it('表 T-023d still holds GR-20, and it still refuses a pinned task group and points the width at S-138', () => {
    const gr20 = saysOf('T-023d', 'GR-20')
    expect(gr20).toContain('タスクグループの左端に敷く掴み代')
    expect(gr20).toContain('`S-138`')
    expect(gr20).toContain('掴み代を掴んだとき、`GRS` はタスクグループを動かすこと（表 T-051 の `HF-15`）。')
    expect(gr20, '表 T-023d no longer keeps a pinned task group out of the grab').toContain(
      '`GRS` は、ピン止めしているタスクグループの掴みを成立させないこと。',
    )
    expect(specTable('T-023d').rows.map((one) => one.id)).toContain('GR-20')
  })

  it('表 T-023d sends the following of GR-20 to HF-15 and forbids restating it', () => {
    expect(REQUIREMENTS).toContain(
      '`GR-20` は、表 T-051 の `HF-15` が追従を同じ MUST で既に求めている',
    )
    expect(REQUIREMENTS).toContain(
      '掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）',
    )
    expect(REQUIREMENTS).toContain('追従は絵であって編集ではない')
  })

  it('表 T-108 still holds CM-73, and UN-4 still makes one drag ONE 段 (FR-031)', () => {
    const cm73 = rowOf('T-108', 'CM-73')
    expect(bare(cm73.cells[1] ?? ''), '表 T-108 renamed the command HF-15 writes').toBe(
      'moveTaskGroup',
    )
    expect(cm73.cells.join(' ')).toContain('タスクグループの親と並びを変える')
    expect(cm73.cells.join(' ')).toContain('`HF-15`')
    expect(saysOf('T-027', 'UN-4')).toContain(
      '`GRS` は、掴んで動かす 1 回のドラッグを、親をまたいでも、またがなくても 1 段とすること。',
    )
  })

  it('表 T-015a still sends the reordered order into the WBS (HM-9), and still keeps the parent still (HM-3)', () => {
    const hm9 = saysOf('T-015a', 'HM-9')
    expect(hm9, '表 T-015a の HM-9 no longer sends the order to the WBS').toContain(
      '`GRS` は、並べ替えた順序も WBS へ伝えること。',
    )
    expect(hm9, 'HM-9 no longer decides the rank by the task group tree').toContain(
      '`GRS` は、各 `Task` の、同じ親タスクを持つ兄弟の中での順位を、`Task` を描いているタスクグループの、タスクグループの木における位置で決めること。',
    )

    const hm3 = saysOf('T-015a', 'HM-3')
    expect(hm3, 'HM-3 no longer forbids the parent task moving').toContain(
      '`GRS` は、タスクバーを別のタスクグループへ移す操作で、親タスクを変えないこと。',
    )
    expect(hm3, 'HM-3 no longer leaves the sibling order to HM-9').toContain(
      '同じ親の下での順序は `HM-9` に従い',
    )

    expect(REQUIREMENTS).toContain('掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）')
  })

  it('FR-085 still owns the depth cap, and S-125 still counts a root task group as depth 1', () => {
    expect(REQUIREMENTS).toContain('`GRS` は、作るタスクグループの深さの上限を `FR-004` に従わせること（値は表 T-211 の `S-125`）。')
    expect(saysOf('T-211', 'S-125')).toContain('根のタスクグループを深さ 1 と数える')
    expect(S_125_MAX_DEPTH).toBeGreaterThanOrEqual(3)
  })
})

describe('the fixture these cases drive', () => {
  it('draws the tree in the order the cases walk, and hides the folded group', () => {
    const built = stage()
    const drawn = (frameOf(built.loop).layout as any).taskGroups.map((one: any) => nameOf(one.taskGroupId))
    expect(drawn, 'the panel no longer draws the tree these cases were written against').toEqual([
      'Alpha',
      'A1',
      'A1X',
      'A2',
      'A2A',
      'Beta',
      'B1',
      'Gamma',
      'Delta',
      'D1',
    ])
    expect(depthOf(built.loop, A2)).toBe(2)
    expect(depthOf(built.loop, A2A)).toBe(3)
  })

  it('the press point these cases use is inside the Task Group Panel and on the task group it names', () => {
    const built = stage()
    const panel = frameOf(built.loop).regions.taskGroupPanel
    const at = stripPoint(built.loop, A2)
    const band = bandOf(built.loop, A2)
    expect(at.x).toBeGreaterThanOrEqual(panel.x)
    expect(at.x).toBeLessThan(panel.x + panel.width)
    expect(at.y).toBeGreaterThanOrEqual(band.y)
    expect(at.y).toBeLessThan(band.y + band.height)
  })
})

// Spec: GR-20, IN-1, FR-031, UN-4, CM-73, HM-9, HM-3, HM-5
describe('表 T-023d (MUST NOT) -- 掴んでいるあいだ値を文書へ書いてはならない。追従は絵であって編集ではない', () => {
  it('⛔ MUST NOT: nothing is written while a sideways carry is held', () => {
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const before = structuredClone(built.loop.document())

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + PAST, at.y))
    built.send(pointer('move', at.x + S_37_INDENT, at.y))
    built.send(pointer('move', at.x + S_37_INDENT * 2, at.y))

    expect(built.loop.document(), 'the document was written while the task group was held').toEqual(before)
  })

  it('⛔ MUST NOT: nothing is written while a downward carry is held', () => {
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const downToB1 = bandOf(built.loop, B1).y - bandOf(built.loop, A2).y
    const before = structuredClone(built.loop.document())

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + PAST))
    built.send(pointer('move', at.x, at.y + downToB1))

    expect(built.loop.document(), 'the document was written while the task group was held').toEqual(before)
  })

  // Spec: HM-7
  it('⭐ IN-1 / FR-031: the whole gesture writes ONCE, on the release, and only inside `schedule.taskGroups` and `Task.wbsOrder`', () => {
    // Why: FrameLoop publishes no history, so UN-4's one step is read as its other half:
    // all a single moveTaskGroup may not reach is left untouched.
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const downToB1 = bandOf(built.loop, B1).y - bandOf(built.loop, A2).y
    const before = structuredClone(built.loop.document()) as any

    built.aimAtTheStrip(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + PAST))
    built.send(pointer('move', at.x, at.y + downToB1))
    built.send(pointer('up', at.x, at.y + downToB1))

    const after = built.loop.document() as any
    expect(after.schedule.taskGroups, 'the release settled nothing').not.toEqual(
      before.schedule.taskGroups,
    )

    // Why: tasks is lifted out only so HM-9's one field can be read alone; every other task
    // field is compared below.
    const { taskGroups: _movedBefore, tasks: _tasksBefore, ...restBefore } = before.schedule
    const { taskGroups: _movedAfter, tasks: _tasksAfter, ...restAfter } = after.schedule
    expect(
      restAfter,
      'the release wrote outside `schedule.taskGroups` and `Task.wbsOrder`',
    ).toEqual(restBefore)
    expect(after.documentSettings).toEqual(before.documentSettings)
    expect(after.schemaVersion).toEqual(before.schemaVersion)

    const ranks = (doc: any) =>
      (doc.schedule.tasks as any[]).map((one) => [one.uid, one.wbsOrder])
    expect(ranks(after), 'the release did not carry the new order into `Task.wbsOrder`').not.toEqual(
      ranks(before),
    )

    const exceptTheRank = (doc: any) =>
      (doc.schedule.tasks as any[]).map(({ wbsOrder: _rank, ...rest }) => rest)
    expect(exceptTheRank(after), 'the release wrote a task field other than `wbsOrder`').toEqual(
      exceptTheRank(before),
    )

    // Why: the parent is checked on its own, so a later widening of the field list cannot let
    // it slip through.
    const parents = (doc: any) =>
      (doc.schedule.tasks as any[]).map((one) => [one.uid, one.parentTaskUid])
    expect(parents(after), 'the release moved a parent task (HM-3)').toEqual(parents(before))

    const shape = (doc: any) =>
      [...doc.schedule.taskGroups]
        .map((one: any) => ({
          id: one.id,
          name: one.label,
          color: one.color,
          minHeightPx: one.minHeight,
          treeState: one.treeState,
          derivedFromTaskUid: one.derivedFromTaskUid,
        }))
        .sort((a, b) => (a.id < b.id ? -1 : 1))
    expect(shape(after), 'the move rebuilt a task group instead of updating its parent').toEqual(
      shape(before),
    )
  })
})

describe('GR-20 of 表 T-023d (MUST NOT) -- ピン止めしているタスクグループは掴めないこと', () => {
  // Why: GR-20's MUST NOT is held where IF-9 puts it, on the side that drew the panel, in
  // the uf-72 screen-part cases.
  // Why: no case hands this loop a strip on a pinned task group: no row makes the reading
  // side re-check that answer, though this loop then moves the group.

  it('the premise the uf-72 cases rest on: FR-098 really does lift a pinned task group into the band', () => {
    const built = stage({ pinned: [A2] })
    const panel = built.screen.last().taskGroupPanel
    expect(
      panel.pinnedTitles.map((one) => one.taskGroupId),
      'FR-098 no longer lifts a pinned task group, so GR-20 has nothing to refuse',
    ).toEqual([A2])
    expect(panel.titles.map((one) => one.taskGroupId)).not.toContain(A2)
  })
})

describe('GR-20 -- the strip is what the drag is taken on, and nothing else on the task group is', () => {
  it('a press on the task group that is NOT on the strip does not move the task group, however far it travels', () => {
    const built = stage()
    const at = stripPoint(built.loop, A2)
    const before = structuredClone(built.loop.document())

    built.aimAtTheName(A2)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + PAST, at.y))
    built.send(pointer('move', at.x + S_37_INDENT * 2, at.y))
    built.send(pointer('up', at.x + S_37_INDENT * 2, at.y))

    expect(built.loop.document(), 'a press off the strip moved the task group').toEqual(before)
  })
})
