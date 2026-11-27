// Unit tests: the closing rule of table T-023c, a selection points only at what the document holds.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type {
  ItemRef,
  SelectableKind,
  Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type HeldDocumentCall,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any -- the cases read document fields no public type names */

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readRepoFile(join(SPEC, '01-04-requirements.md'), 'utf8')).split('\n')

function closingRuleLine(): string {
  const found = REQUIREMENTS.find((line) =>
    line.startsWith('選択は、文書に実在する対象だけを指すこと'),
  )
  if (found === undefined) {
    throw new Error('table T-023c no longer states the closing rule this file is about')
  }
  return found
}

const SL_1 = specTable('T-023c').rows.find((row) => row.id === 'SL-1')?.cells.join(' ') ?? ''

// Why: the kinds are the published union, so the left half cannot drift without a type
// error; a premise checks the words against SL-1's own cell.
const SL_1_KINDS: readonly { readonly kind: SelectableKind; readonly word: string }[] = [
  { kind: 'task', word: 'タスク' },
  { kind: 'dependency', word: '依存線' },
  { kind: 'highlightBox', word: 'ハイライトボックス' },
  { kind: 'commentBox', word: 'コメントボックス' },
  { kind: 'statusLine', word: '基準日線' },
]

// Why: a list, because the column enumerates (SK-3 and SK-7 assign two each); reading only
// the first span answered for one spelling of two.
const assignmentOf = (row: string): readonly (readonly string[])[] => {
  const found = specTable('T-036').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  return (found.by['割当'] ?? '')
    .split('\uff0f')
    .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
    .filter((keys) => keys.length > 0)
}

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readRepoFile(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'

const PREDECESSOR = 1
const SUCCESSOR = 2
// Why: a third Task, so that one may vanish without taking the dependency with it.
const SPARE = 3

const HIGHLIGHT = 'h1'
const COMMENT = 'c1'

const STATUS_DATE = '2026-05-01T00:00:00'

// Why: every nullable column is spelled null, because one left undefined reads as set to
// the generated schema, which a premise runs over this value.
function richDocument(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (uid: number, start: string, finish: string, name: string): Task =>
    ({
      uid,
      parentTaskUid: null,
      wbsOrder: uid,
      name,
      start,
      finish,
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
    }) as unknown as Task
  const row = (id: string, label: string, order: number) => ({
    id,
    parentId: null,
    name: label,
    derivedFromTaskUid: null,
    order,
    treeState: 'auto', editPermission: null,
    color: null,
    minHeightPx: null,
  })
  const successor = task(SUCCESSOR, '2026-05-06T00:00:00', '2026-05-20T00:00:00', 'Two') as any
  successor.dependencies = [
    {
      predecessorUid: PREDECESSOR,
      linkType: 1,
      linkLag: null,
      lagFormat: null,
      carry: {},
      carryElements: [],
    },
  ]
  const draft = {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: STATUS_DATE,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task(PREDECESSOR, '2026-04-01T00:00:00', '2026-04-10T00:00:00', 'One'),
        successor,
        task(SPARE, '2026-06-01T00:00:00', '2026-06-05T00:00:00', 'Three'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, 'Alpha', 0), row(BETA, 'Beta', 1)],
      taskGroupMembers: [
        { taskUid: PREDECESSOR, taskGroupId: ALPHA },
        { taskUid: SUCCESSOR, taskGroupId: BETA },
        { taskUid: SPARE, taskGroupId: BETA },
      ],
      taskVisuals: [],
      commentBoxes: [
        {
          id: COMMENT,
          leaderShapeKind: null,
          text: 'a note',
          anchorDate: '2026-04-02T00:00:00',
          anchorTaskGroupId: ALPHA,
          anchorBandFraction: null,
          anchorTaskUid: null,
          anchorTaskFigure: null,
          anchorHighlightBoxId: null,
          anchorSnapPoint: null,
          bodyOffsetPx: null,
          strokeColor: null,
          strokeWidthPx: null,
          fillColor: null,
          fillTransparencyPercent: null,
          textColor: null,
          fontSizePx: null,
        },
      ],
      highlightBoxes: [
        {
          id: HIGHLIGHT,
          start: '2026-04-01T00:00:00',
          finish: '2026-04-10T00:00:00',
          topTaskGroupId: ALPHA,
          bottomTaskGroupId: ALPHA,
          strokeColor: null,
          cornerRadiusPx: null,
          strokeWidthPx: null,
          fillColor: null,
          fillTransparencyPercent: null,
        },
      ],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  edit(draft)
  return draft as unknown as Document
}

// Why: one kind at a time, so each case names one kind; the Task leaves with its task group
// membership, since a member pointing at no Task is a document nobody may write.
function documentWithout(kind: SelectableKind): Document {
  return richDocument((draft) => {
    const schedule = draft.schedule
    switch (kind) {
      case 'task':
        schedule.tasks = schedule.tasks.filter((one: any) => one.uid !== SPARE)
        schedule.taskGroupMembers = schedule.taskGroupMembers.filter(
          (one: any) => one.taskUid !== SPARE,
        )
        return
      case 'dependency':
        for (const one of schedule.tasks) one.dependencies = []
        return
      case 'highlightBox':
        schedule.highlightBoxes = []
        return
      case 'commentBox':
        schedule.commentBoxes = []
        return
      case 'statusLine':
        schedule.project.statusDate = null
        return
    }
  })
}

// Summary: Whether one selected item is in the document, the status line existing exactly while statusDate is not null.
function itemExists(document: Document, item: ItemRef): boolean {
  const schedule = (document as any).schedule
  switch (item.kind) {
    case 'task':
      return schedule.tasks.some((one: any) => one.uid === item.uid)
    case 'dependency': {
      const successor = schedule.tasks.find((one: any) => one.uid === item.successorUid)
      return successor !== undefined && item.ordinal < successor.dependencies.length
    }
    case 'highlightBox':
      return schedule.highlightBoxes.some((one: any) => one.id === item.id)
    case 'commentBox':
      return schedule.commentBoxes.some((one: any) => one.id === item.id)
    case 'statusLine':
      return schedule.project.statusDate !== null
    case 'parentTaskLink':
      return schedule.tasks.some((one: any) => one.uid === item.childUid && one.parentTaskUid !== null)
  }
}

function ghostsIn(document: Document, selection: Selection): readonly ItemRef[] {
  return selection.items.filter((item) => !itemExists(document, item))
}

const holds = (selection: Selection, kind: SelectableKind): readonly ItemRef[] =>
  selection.items.filter((item) => item.kind === kind)

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

// Summary: The host drains the animation-frame queue node lacks and decides nothing about a selection.
function host() {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    runAnimationFrames: (): void => {
      // Why: bounded, so a loop that asks for a frame from inside a frame (NFR-010 forbids it)
      // ends the test instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

function screenPane(language: DisplayLanguage = 'ja') {
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
    wiring: { surface, language } satisfies ScreenWiring,
    last: (): ScreenView => {
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

const key = (which: string, modifiers: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key: which,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
})

const SELECT_ALL = (): HumanInput => key('A', { ctrl: true })
const DELETE = (): HumanInput => key('Delete')
const UNDO = (): HumanInput => key('Z', { ctrl: true })
const REDO = (): HumanInput => key('Y', { ctrl: true })
const STATUS_LINE_SWITCH = (): HumanInput => key('D', { ctrl: true, shift: true })

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  replace(document: Document): void
  document(): Document
  selection(): Selection
}

function stage(first: Document): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, first, SCREEN, screen.wiring)
  // Why: the first frame is owed by making the loop, so it is drained before any case
  // presses a key.
  pen.runAnimationFrames()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    replace: (document) => {
      loop.holdDocument({ row: 'RD-6', document } as unknown as HeldDocumentCall)
      pen.runAnimationFrames()
    },
    document: () => loop.document(),
    selection: () => loop.agentApiSeams().source.readSnapshot().selection,
  }
}

// Why: SK-2 is the only door used, and SL-7b gives a select-all no order, so no case reads
// ordered or what a click (SL-2) or a marquee (SL-3) would pick.
function withEverythingSelected(first: Document = richDocument()): Stage {
  const built = stage(first)
  built.send(SELECT_ALL())
  return built
}

// Spec: T-023c
describe('the manuscript still says what these cases read', () => {
  it('⭐ table T-023c still closes with the rule this file is about', () => {
    // Why: without this, a rule reworded or withdrawn would leave every case below testing a habit.
    const rule = closingRuleLine()
    expect(rule, 'the MUST').toContain('文書に実在する対象だけを指すこと（MUST）')
    expect(rule, 'the MUST NOT').toContain('選択に残してはならない（MUST NOT）')
    expect(rule, 'the second MUST NOT, about where the dropping is decided').toContain(
      '落とす場所を、消える入口ごとに定めてはならない（MUST NOT）',
    )
    expect(rule, 'and it still leaves the moment open').toContain(
      'いつ落とすかは本規則が定めない',
    )
  })

  it('the rule still names more than one entrance, which is why more than one is walked', () => {
    // Why: read rather than copied, so an entrance added to that sentence reaches this file.
    const rule = closingRuleLine()
    for (const entrance of ['表 T-050 の連鎖', 'タスクグループの削除', '取り消し／やり直し', '別の文書を開く']) {
      expect(rule, `the rule still names ${entrance}`).toContain(entrance)
    }
  })

  it('SL-1 still names the five kinds these cases walk, and still excludes task groups', () => {
    for (const one of SL_1_KINDS) {
      expect(SL_1, `SL-1 still names ${one.kind}`).toContain(one.word)
    }
    expect(SL_1_KINDS).toHaveLength(5)
    expect(SL_1, 'SL-1 still keeps task groups out').toContain('`GRS` は、タスクグループ（`TaskGroup`）を選択の対象に含めないこと。')
  })

  it('the keys these cases press are still the ones table T-036 assigns', () => {
    expect(assignmentOf('SK-2')).toEqual([['Ctrl', 'A']])
    // Why: both spellings, not the first, because SK-3 and SK-7 each assign two.
    expect(assignmentOf('SK-3')).toEqual([['Delete'], ['Backspace']])
    expect(assignmentOf('SK-6')).toEqual([['Ctrl', 'Z']])
    expect(assignmentOf('SK-7')).toEqual([
      ['Ctrl', 'Y'],
      ['Ctrl', 'Shift', 'Z'],
    ])
    expect(specTable('T-036').rows.find((one) => one.id === 'SK-20')?.by['割当'] ?? '').toContain(
      'Shift',
    )
  })
})

describe('the fixture, and the one door these cases select through', () => {
  it('is a valid GRS JSON document carrying one of every SL-1 kind', () => {
    const made = richDocument()
    const report = validateDocument(made)
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
    const schedule = (made as any).schedule
    expect(schedule.tasks).toHaveLength(3)
    expect(schedule.tasks[1].dependencies).toHaveLength(1)
    expect(schedule.highlightBoxes).toHaveLength(1)
    expect(schedule.commentBoxes).toHaveLength(1)
    expect(schedule.project.statusDate).not.toBeNull()
  })

  it('SK-2: `Ctrl+A` puts one of every SL-1 kind into the selection', () => {
    // Why: a kind that never got into the selection could not be seen to fall out of it.
    const built = withEverythingSelected()
    for (const one of SL_1_KINDS) {
      expect(holds(built.selection(), one.kind).length, `${one.kind} was picked`).toBeGreaterThan(0)
    }
    expect(ghostsIn(built.document(), built.selection()), 'and all of them exist').toEqual([])
  })

  it('every document these cases replace with is lawful too', () => {
    for (const one of SL_1_KINDS) {
      const report = validateDocument(documentWithout(one.kind))
      expect(report.errors, `the document without the ${one.kind}`).toEqual([])
    }
  })
})

// Spec: T-023c, SL-1
// Why: no case asserts that items still in the document stay selected, because no rule says
// so; a build that emptied the whole selection would pass here, and that is not a defect.
describe('表 T-023c の結び -- a thing that stops existing does not stay selected', () => {
  for (const one of SL_1_KINDS) {
    it(`SL-1 ${one.kind}: it falls out of the selection when the document loses it`, () => {
      // Why: the status line has no id in ItemRef, so a build that looked ids up in a list would
      // keep it selected for ever; here it exists while statusDate is not null.
      const built = withEverythingSelected()
      const before = holds(built.selection(), one.kind)
      expect(before.length, `${one.kind} was selected to begin with`).toBeGreaterThan(0)

      const next = documentWithout(one.kind)
      // Why: which items vanished is asked of the arriving document, because the fixture keeps
      // two other Tasks and for one kind the vanished set is smaller than the kind.
      const vanished = before.filter((item) => !itemExists(next, item))
      expect(vanished.length, `the replacement really took a ${one.kind} away`).toBeGreaterThan(0)

      built.replace(next)

      const after = built.selection()
      for (const gone of vanished) {
        expect(
          after.items.some((held) => JSON.stringify(held) === JSON.stringify(gone)),
          `${JSON.stringify(gone)} is no longer in the document, so it may not be in the selection`,
        ).toBe(false)
      }
      expect(ghostsIn(built.document(), after)).toEqual([])
    })
  }
})

describe('the invariant holds at every entrance this file can drive', () => {
  it('SK-3 / 表 T-050: deleting the selection leaves no ghost behind', () => {
    const built = withEverythingSelected()
    built.send(DELETE())
    expect(ghostsIn(built.document(), built.selection())).toEqual([])
  })

  it('SK-6 / RD-1: undoing what put the status line up drops it from the selection', () => {
    // Why: driven through the status line, whose existence is a column: SK-20 sets statusDate
    // (FR-046) and UN-13 makes that undoable, so Ctrl+Z takes the selected line away.
    const built = stage(richDocument((draft) => {
      draft.schedule.project.statusDate = null
    }))
    built.send(STATUS_LINE_SWITCH())
    expect(
      (built.document() as any).schedule.project.statusDate,
      'SK-20 put the line up',
    ).not.toBeNull()

    built.send(SELECT_ALL())
    expect(holds(built.selection(), 'statusLine').length, 'and it was selected').toBe(1)

    built.send(UNDO())
    expect(
      (built.document() as any).schedule.project.statusDate,
      'the undo took the line away again',
    ).toBeNull()
    expect(holds(built.selection(), 'statusLine')).toEqual([])
    expect(ghostsIn(built.document(), built.selection())).toEqual([])
  })

  it('SK-7 / RD-2: redoing a deletion leaves no ghost behind either', () => {
    // Why: the selection is made again after the undo, so the redo takes things away from a
    // selection that holds them at that moment.
    const built = withEverythingSelected()
    built.send(DELETE())
    built.send(UNDO())
    const back = (built.document() as any).schedule
    expect(back.tasks.length, 'the undo put the Tasks back').toBe(3)

    built.send(SELECT_ALL())
    expect(built.selection().items.length, 'and they could be selected again').toBeGreaterThan(0)

    built.send(REDO())
    expect((built.document() as any).schedule.tasks, 'the redo took them away again').toEqual([])
    expect(ghostsIn(built.document(), built.selection())).toEqual([])
  })

  it('別の文書を開くこと: a document with nothing in common leaves no ghost behind', () => {
    // Why: driven on RD-6, the only row of table T-230 whose WS-3 column lets a caller bring a
    // whole document, so the only replacement reachable from outside the loop.
    const built = withEverythingSelected()
    expect(built.selection().items.length).toBeGreaterThan(0)
    built.replace(
      richDocument((draft) => {
        draft.schedule.tasks = []
        draft.schedule.taskGroupMembers = []
        draft.schedule.commentBoxes = []
        draft.schedule.highlightBoxes = []
        draft.schedule.project.statusDate = null
      }),
    )
    expect(ghostsIn(built.document(), built.selection())).toEqual([])
    for (const one of SL_1_KINDS) {
      expect(holds(built.selection(), one.kind), `no ${one.kind} may remain`).toEqual([])
    }
  })
})
