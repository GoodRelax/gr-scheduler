// Contract tests: FR-033's copy and paste keys reach the document.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  Notice,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable, unbroken } from './spec-table'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fake host patches a browser global and the fixtures reach into loose shapes */

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const FR_033_STATEMENT =
  '作成者がタスクを選んでコピーし貼り付けたとき、`GRS` は、選ばれた `Task` だけを複製すること。'

const FR_033_SAME_TASK_GROUP = '`Task` を単独で（タスクグループごとではなく）貼り付けたとき、`GRS` は、`IMPS-287` の場合を除き、複製した各 `Task` を、複製元と同じタスクグループに載せること。'

const FR_033_NO_SAME_UID =
  '`GRS` は、複製した `Task` に、複製元と同じ `UID` を使わないこと。'

const FR_033_NO_TASK_ORIGIN = '`GRS` は、複製に `TaskOrigin` を付けないこと。'

const FR_033_PASTE_UNDER_THE_CHOSEN_TASK_GROUP = '`GRS` は、貼り付け先を、選んでいるタスクグループの子にすること。'

const FR_033_REFUSE_AT_THE_VALVE =
  'もし段が 表 T-014 の `ST-7` の安全弁に達した場合、`GRS` は、貼り付けを受け付けないこと。'

const T_233_ONLY_ITS_OWN_ROWS =
  '`GRS` は、通知が運ぶ理由を 表 T-233 の行とすること。`GRS` は、表 T-233 に無い理由を運ばないこと'

const T_036: SpecTable = specTable('T-036')
const T_037: SpecTable = specTable('T-037')
const T_103: SpecTable = specTable('T-103')
const T_223: SpecTable = specTable('T-223')
const T_233: SpecTable = specTable('T-233')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

// Why: not bare, which would answer Ctrl for an assignment spelled with a
// plus sign.
function keyOf(id: string): KeyInput {
  const parts = ((rowOf(T_036, id).by['割当'] ?? '').split('/')[0] ?? '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/＋/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: {
      ctrl: named('Ctrl'),
      shift: named('Shift'),
      alt: named('Alt'),
      meta: named('Cmd'),
    } satisfies InputModifiers,
  }
}

const COPY = keyOf('SK-4')
const PASTE = keyOf('SK-5')

const TASK_GROUP_PANEL = bare(rowOf(T_103, 'U-22').by['確定名（英）'] ?? '')

interface ReasonWords {
  readonly specTableRowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
  readonly nextStep: Readonly<Record<DisplayLanguage, string>>
}

const REASON_WORDS: readonly ReasonWords[] = (
  JSON.parse(
    readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons: ReasonWords[] }
).reasons

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

const PARENT_TASK_GROUP = 'aaaaaaaa-0000-4000-8000-000000000001'
const CHILD_TASK_GROUP = 'aaaaaaaa-0000-4000-8000-000000000002'

// Why: the parent's WBS child is not copied unless it is chosen too (DU-1).
const PARENT_TASK = 1
const CHILD_TASK = 2
// Summary: Filler Tasks, numbered from here, stand on the parent task group only to bring it near the valve.
const FIRST_FILLER = 100

function task(uid: number, parentUid: number | null): Record<string, unknown> {
  return {
    uid,
    parentTaskUid: parentUid,
    wbsOrder: uid,
    name: `Task ${uid}`,
    start: '2026-04-01T00:00:00',
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
  }
}

function group(id: string, parentId: string | null, order: number): Record<string, unknown> {
  return {
    id,
    parentId,
    name: id === PARENT_TASK_GROUP ? 'Parent row' : 'Child row',
    derivedFromTaskUid: null,
    order,
    treeState: 'auto', color: null,
    minHeightPx: null,
  }
}

// Why: a Task with a descendant that stays behind and a task group with one
// under it are what the STATEMENT's two halves ask about.
// Why: S-89 is a constant, so a fixture reaches the valve by overlapping Tasks, never by a document cap.
function documentOfTwoTaskGroups(fillers = 0): Document {
  const template = structuredClone(TEMPLATE) as any
  const settings = { ...structuredClone(template.documentSettings) }
  const filled = Array.from({ length: fillers }, (_, index) => FIRST_FILLER + index)
  return {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        title: 'A document to copy from',
        uidHighWaterMark: 1000,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [task(PARENT_TASK, null), task(CHILD_TASK, PARENT_TASK), ...filled.map((uid) => task(uid, null))],
      resources: [],
      assignments: [],
      taskGroups: [group(PARENT_TASK_GROUP, null, 0), group(CHILD_TASK_GROUP, PARENT_TASK_GROUP, 0)],
      taskGroupMembers: [
        { taskUid: PARENT_TASK, taskGroupId: PARENT_TASK_GROUP },
        { taskUid: CHILD_TASK, taskGroupId: CHILD_TASK_GROUP },
        ...filled.map((uid) => ({ taskUid: uid, taskGroupId: PARENT_TASK_GROUP })),
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: settings,
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
}

function host(): Host {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
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
    showScreenView: (view: ScreenView) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  } as unknown as ScreenSurface
  return {
    wiring: { surface, language } as unknown as ScreenWiring,
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

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  // Spec: SL-2
  pressTask(uid: number): void
  pressRow(taskGroupId: string): void
  taskUids(): readonly number[]
  taskGroupIds(): readonly string[]
  taskGroupOfTask(uid: number): string | undefined
  taskOriginCount(): number
  notices(): readonly Notice[]
  documentText(): string
}

function stage(document: Document, env: FrameEnvironment = SCREEN): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, document, env, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  const schedule = (): any => (loop.document() as any).schedule
  const middleOfTheBar = (uid: number): { readonly x: number; readonly y: number } => {
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame, so it has drawn no bar')
    const drawn = values.geometry.tasks.find((one: any) => one.taskUid === uid)
    if (drawn === undefined || drawn.plan === null) {
      throw new Error(`Task ${uid} has no plan bar in this frame`)
    }
    if (drawn.plan.form !== 'outline') {
      throw new Error(`Task ${uid} is drawn as a ${drawn.plan.form}, which has no body to press`)
    }
    const xs = drawn.plan.points.map((one: any) => one.x)
    const ys = drawn.plan.points.map((one: any) => one.y)
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    }
  }
  return {
    loop,
    send,
    pressTask: (uid) => {
      const at = middleOfTheBar(uid)
      // Why: IN-1 settles a pointer operation on the release, so a press left down
      // would be a drag rather than a choice.
      send(pointer('down', at.x, at.y))
      send(pointer('up', at.x, at.y))
    },
    pressRow: (taskGroupId) => {
      // Why: CS-2 settles a gesture on what was drawn at the press.
      screen.drawAt({
        part: TASK_GROUP_PANEL,
        entry: null,
        format: null,
        taskGroupId: taskGroupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as unknown as ScreenPart)
      send(pointer('down', 60, 300))
      send(pointer('up', 60, 300))
      screen.drawAt(null)
    },
    taskUids: () => schedule().tasks.map((one: any) => one.uid),
    taskGroupIds: () => schedule().taskGroups.map((one: any) => one.id),
    taskGroupOfTask: (uid) =>
      schedule().taskGroupMembers.find((one: any) => one.taskUid === uid)?.taskGroupId,
    taskOriginCount: () => schedule().taskOrigins.length,
    notices: () => screen.last().notices,
    documentText: () => JSON.stringify(loop.document()),
  }
}

describe('FR-033 -- the manuscript this file is driven by', () => {
  it('still states the two subtrees, and still keeps a copy on its original task group', () => {
    expect(REQUIREMENTS).toContain(FR_033_STATEMENT)
    expect(REQUIREMENTS).toContain(FR_033_SAME_TASK_GROUP)
  })

  it('still forbids a copy wearing its original’s UID or a TaskOrigin', () => {
    expect(REQUIREMENTS).toContain(FR_033_NO_SAME_UID)
    expect(REQUIREMENTS).toContain(FR_033_NO_TASK_ORIGIN)
  })

  it('still lands a pasted task group under the chosen one, and still refuses a paste at the valve', () => {
    expect(REQUIREMENTS).toContain(FR_033_PASTE_UNDER_THE_CHOSEN_TASK_GROUP)
    expect(REQUIREMENTS).toContain(FR_033_REFUSE_AT_THE_VALVE)
  })

  it('表 T-223 still copies no WBS descendant that was not chosen, and cascades a task group to the task groups below it', () => {
    expect(rowOf(T_223, 'DU-1').cells.join(' ')).toContain('`GRS` は、選ばれていない子孫タスクを複製しないこと。')
    expect(rowOf(T_223, 'DU-2').cells.join(' ')).toContain('配下のタスクグループ')
  })

  it('the fixture really holds the two subtrees the STATEMENT speaks of', () => {
    // Why: without this, a subtree case could pass on a fixture whose subtree was
    // one node deep.
    const built = stage(documentOfTwoTaskGroups())
    expect(built.taskUids()).toEqual([PARENT_TASK, CHILD_TASK])
    expect(built.taskGroupIds()).toEqual([PARENT_TASK_GROUP, CHILD_TASK_GROUP])
    expect(built.notices()).toEqual([])
  })
})

// Spec: IMPS-286
// Why: the keys are pressed through the shell because the NFR-004 sweep found
// pressing them moved neither the document nor the picture (DFC-321).
describe('FR-033 -- SK-4 then SK-5 on a chosen Task duplicates that Task only', () => {
  it('⭐⭐ the pair of keys leaves one more Task in the document', () => {
    const built = stage(documentOfTwoTaskGroups())
    built.pressTask(PARENT_TASK)

    built.send(COPY)
    built.send(PASTE)

    expect(
      built.taskUids().length,
      'SK-4 then SK-5 on a chosen Task did not add exactly its one copy -- FR-033’s STATEMENT ' +
        'asks for the chosen Task alone to be duplicated',
    ).toBe(3)
  })

  // Spec: IMPS-295
  it('and the copies wear UIDs of their own (MUST NOT)', () => {
    const built = stage(documentOfTwoTaskGroups())
    built.pressTask(PARENT_TASK)

    built.send(COPY)
    built.send(PASTE)

    const uids = built.taskUids()
    expect(new Set(uids).size, 'a copy was given a UID the document already held').toBe(uids.length)
  })

  it('and the copied Task sits on the task group its original sits on (MUST)', () => {
    const built = stage(documentOfTwoTaskGroups())
    built.pressTask(PARENT_TASK)

    built.send(COPY)
    built.send(PASTE)

    const copies = built.taskUids().filter((uid) => uid !== PARENT_TASK && uid !== CHILD_TASK)
    expect(copies.length).toBe(1)
    const rows = copies.map((uid) => built.taskGroupOfTask(uid))
    expect(rows, 'the copy landed on a task group its original is not on').toEqual([PARENT_TASK_GROUP])
  })

  // Spec: IMPS-296
  it('and no TaskOrigin is put on a copy (MUST NOT)', () => {
    const built = stage(documentOfTwoTaskGroups())
    built.pressTask(PARENT_TASK)

    built.send(COPY)
    built.send(PASTE)

    expect(built.taskOriginCount()).toBe(0)
  })
})

// Spec: IMPS-285
describe('FR-033 -- SK-4 then SK-5 on a chosen task group duplicates the task group subtree', () => {
  it('⭐⭐ the pair of keys leaves two more task groups in the document', () => {
    const built = stage(documentOfTwoTaskGroups())
    built.pressRow(PARENT_TASK_GROUP)

    built.send(COPY)
    built.send(PASTE)

    expect(
      built.taskGroupIds().length,
      'SK-4 then SK-5 on a chosen task group left the document exactly as it was -- FR-033’s STATEMENT ' +
        'asks for the task group and the task groups under it to be duplicated 部分木ごと',
    ).toBe(4)
  })

  // Spec: IMPS-297
  it('and the Tasks on the copied task groups come with them (DU-2)', () => {
    const built = stage(documentOfTwoTaskGroups())
    built.pressRow(PARENT_TASK_GROUP)

    built.send(COPY)
    built.send(PASTE)

    const newTaskGroups = built.taskGroupIds().filter((id) => id !== PARENT_TASK_GROUP && id !== CHILD_TASK_GROUP)
    expect(newTaskGroups.length).toBe(2)
    const carried = built
      .taskUids()
      .filter((uid) => newTaskGroups.includes(built.taskGroupOfTask(uid) ?? ''))
    expect(
      carried.length,
      'the copied task groups came up empty, which DU-2 (「そのタスクグループに載っているすべての `Task`」) forbids',
    ).toBe(2)
  })
})

describe('FR-033 -- what does NOT change the document', () => {
  it('⭐ SK-5 with nothing ever copied leaves the document exactly as it was', () => {
    // Why: without this, a loop that duplicated on Ctrl+V regardless of any copy
    // would pass every case above; what it tells is not asserted.
    const built = stage(documentOfTwoTaskGroups())
    const before = built.documentText()

    built.pressTask(PARENT_TASK)
    built.send(PASTE)

    expect(built.documentText()).toBe(before)
  })

  it('⭐ SK-4 on its own leaves the document exactly as it was -- a copy is not an edit', () => {
    // Why: FR-031 counts an undo step from a write, and taking a copy writes
    // nothing, so the document must not move.
    const built = stage(documentOfTwoTaskGroups())
    built.pressTask(PARENT_TASK)
    const before = built.documentText()

    built.send(COPY)

    expect(built.documentText()).toBe(before)
  })
})

// Spec: FR-076, IMPS-288
// Why: S-89 is a tool constant no document can lower, so the fixture stacks
// the parent task group to one under it and reads the cap from the constants.
describe('FR-033 (MUST) -- a paste that would pass the safety valve is refused AND told', () => {
  // Why: one Task under the cap, so one paste stands exactly at it.
  const AT_THE_CAP = SETTINGS_CONSTANTS.stackSafetyCap - 2
  // Why: a window tall enough that the whole stacked task group is drawn, so the parent Task can be pressed.
  const TALL: FrameEnvironment = { ...SCREEN, height: 40000 }

  it('the premise: the parent task group stands one under the valve and is not yet past it', () => {
    const built = stage(documentOfTwoTaskGroups(AT_THE_CAP), TALL)
    expect(built.notices()).toEqual([])
    expect(built.taskUids().length).toBe(2 + AT_THE_CAP)
  })

  it('⭐⭐ the paste that would make a third stack on one task group is not taken', async () => {
    // Why: the first paste is lawful and asserted so, so that a loop which refuses
    // every paste cannot pass this case.
    const built = stage(documentOfTwoTaskGroups(AT_THE_CAP), TALL)
    built.pressTask(PARENT_TASK)
    built.send(COPY)

    built.send(PASTE)
    const afterTheLawfulOne = built.taskUids().length
    expect(
      afterTheLawfulOne,
      'the first paste, which stacks exactly TO the cap, was refused -- ST-7 allows it',
    ).toBe(2 + AT_THE_CAP + 1)

    built.send(PASTE)

    expect(
      built.taskUids().length,
      'a paste that would put a stack past the safety valve was taken -- FR-033 (MUST): ' +
        '「段が表 T-014 の `ST-7` の安全弁に達したときは、貼り付けを受け付けず、表 T-233 の `RS-24` として通知の仕組みへ運ぶこと」',
    ).toBe(afterTheLawfulOne)
  })

  it('⭐ and the refusal is TOLD, in the words FR-038 holds for a row of 表 T-233', () => {
    // Why: which row is told is not asserted, only that it is a row of table T-233
    // in the words FR-038's dictionary holds for it.
    expect(REQUIREMENTS).toContain(T_233_ONLY_ITS_OWN_ROWS)
    const built = stage(documentOfTwoTaskGroups(AT_THE_CAP), TALL)
    built.pressTask(PARENT_TASK)
    built.send(COPY)
    built.send(PASTE)
    built.send(PASTE)

    const told = built.notices()
    expect(
      told.length,
      'the paste was refused in silence -- FR-033 (MUST) asks for the person to be told',
    ).toBeGreaterThan(0)
    const known = REASON_WORDS.map((one) => one.text.ja)
    for (const notice of told) {
      expect(known, `a telling carried words FR-038’s dictionary does not hold`).toContain(
        notice.text,
      )
      expect(
        T_037.rows.map((one) => one.id),
        `the manner ${JSON.stringify(notice.manner)} is not a row of table T-037`,
      ).toContain(notice.manner)
      expect(
        T_233.rows.length,
        'table T-233 is empty, so nothing above can be a row of it',
      ).toBeGreaterThan(0)
    }
  })
})
