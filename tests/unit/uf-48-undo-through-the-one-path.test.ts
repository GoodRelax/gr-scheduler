// Unit tests: an undo or redo walks the one road of table T-230 and owes that road's consequences.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
} from '../../src/framework/single-html-shell/frame-loop'
import {
  unwatchChanges,
  watchChanges,
  type ChangeNotice,
} from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture edits a cloned template and the host fakes browser globals */

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const sameSpelling = (cell: string): string =>
  cell.replace(/`/g, '').replace(/＋/g, '+').replace(/\s+/g, '')

// Spec: ED-1
const ED_1_WORD = bare(rowOf('T-229', 'ED-1').by['書く語'] ?? '')

// Why: the calendar, project and settings come from BT-4 (FR-027); the task groups and Tasks are written out
// here so that what is drawn can be named task group by task group.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'

// Why: far from the edit's instant and signed by ED-3's word, neither the screen's nor the watcher's, so a re-signed
// undo is caught, and AG-6's ban on waking a watcher with its own write cannot excuse a silence.
const OPENED_STAMP = {
  scheduleUpdatedAt: '2026-03-04T05:06:07Z',
  settingsUpdatedAt: '2026-03-04T05:06:07Z',
  lastEditedBy: 'template',
  fileSavedAt: null,
} as const

// Why: statusDate null is a premise: SK-20 shows the line on that value (FR-046), and UN-13 makes that one
// keystroke a step in the history the cases walk; a stored status date would drive the clearing half.
function twoTaskGroupDocument(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (uid: number, start: string, finish: string, name: string): Task => ({
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
  })
  const row = (id: string, parentId: string | null, label: string) => ({
    id,
    parentId,
    name: label,
    derivedFromTaskUid: null,
    order: 0,
    treeState: 'auto', editPermission: null,
    color: null,
    minHeightPx: null,
  })
  const draft = {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task(1, '2026-04-01T00:00:00', '2026-04-10T00:00:00', 'One'),
        task(2, '2026-05-06T00:00:00', '2026-05-20T00:00:00', 'Two'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, 'Alpha'), row(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: 1, taskGroupId: ALPHA },
        { taskUid: 2, taskGroupId: BETA },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: { ...OPENED_STAMP },
    changeLog: [],
  }
  edit(draft)
  return draft as unknown as Document
}

const projectOf = (document: Document): any => (document as any).schedule.project
const stampOf = (document: Document): any => (document as any).documentStamp

// Why: BO-1 settles these before a frame loop exists, and FR-051 keeps the last two out of the settings
// because they differ from one machine to the next.
const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly drawn: string[]
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

// Summary: the fake host runs a frame only when a case says so, and never otherwise.
function host(): Host {
  const drawn: string[] = []
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    drawn,
    surface: {
      showMarqueeOverlaySvg: () => undefined,
      showSvg: (svg: string) => {
        drawn.push(svg)
      },
    },
    runAnimationFrames: () => {
      // Why: bounded, so a loop that asks for a frame from inside a frame (NFR-010 forbids it) ends the test instead of hanging.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

const INSTANT = '2026-08-21T13:00:00Z'

// Summary: a host whose clock stands still at INSTANT, so the instant a write stamps is known.
function frozenHost(): Host {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(INSTANT))
  return host()
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const key = (which: string, modifiers: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key: which,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
})

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton; readonly clickCount?: number } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: options.clickCount ?? 1,
})

// Spec: SK-20, SK-6, SK-7, UN-13
const THE_ONE_EDIT: HumanInput = key('D', { ctrl: true, shift: true })
const UNDO: HumanInput = key('Z', { ctrl: true })
const REDO: HumanInput = key('Y', { ctrl: true })

// Spec: FR-046, UN-8
// Why: showing the status line slides the view to center it, and undo leaves the view where it is;
// Task 1 spans INSTANT, so its bar stays under the pointer after the one edit.
function underTheStatusLine(draft: any): void {
  draft.schedule.tasks[0].start = '2026-08-14T00:00:00'
  draft.schedule.tasks[0].finish = '2026-08-28T00:00:00'
}

function planCenter(loop: ReturnType<typeof frameLoop>, uid: number): { x: number; y: number } {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame, so it has drawn no bar')
  const drawn = values.geometry.tasks.find((one) => one.taskUid === uid)
  if (drawn === undefined || drawn.plan === null) {
    throw new Error(`Task ${uid} has no plan bar in this frame`)
  }
  if (drawn.plan.form !== 'outline') {
    throw new Error(`Task ${uid} is drawn as a ${drawn.plan.form}, which has no body to grab`)
  }
  const xs = drawn.plan.points.map((onePoint) => onePoint.x)
  const ys = drawn.plan.points.map((onePoint) => onePoint.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

// Why: neither ED-1's word nor the word OPENED_STAMP carries, so AG-6's own-write ban never silences it.
const WATCHER = 'agent-under-test'

const REGISTERED: (() => void)[] = []

// Summary: the watcher subscribes from where the document stands now, so only changes after this point are owed.
function watching(loop: ReturnType<typeof frameLoop>): ChangeNotice[] {
  const taken: ChangeNotice[] = []
  const watchers = loop.agentApiSeams().changeWatchers
  watchChanges(watchers, {
    watcher: WATCHER,
    since: {
      seenScheduleUpdatedAt: stampOf(loop.document()).scheduleUpdatedAt,
    },
    deliver: (notice) => void taken.push(notice),
  })
  REGISTERED.push(() => unwatchChanges(watchers, WATCHER))
  return taken
}

afterEach(() => {
  while (REGISTERED.length > 0) REGISTERED.pop()!()
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
  vi.useRealTimers()
})

// Spec: BT-4, UN-13
describe('the document these cases drive', () => {
  it('is a valid GRS JSON document', () => {
    const report = validateDocument(twoTaskGroupDocument())
    expect(report.errors, report.errors.join('\n')).toEqual([])
  })

  it('carries no base date line and a stamp of its own, so one keystroke makes one step', () => {
    const document = twoTaskGroupDocument()
    expect(projectOf(document).statusDate).toBeNull()
    expect(stampOf(document)).toEqual({ ...OPENED_STAMP })
    expect(stampOf(document).lastEditedBy).not.toBe(ED_1_WORD)
    expect(stampOf(document).lastEditedBy).not.toBe(WATCHER)
  })
})

// Spec: RD-1, RD-2, FR-028, FR-031, FR-063, WS-5
describe('表 T-230 RD-1 / RD-2 -- 刻印: 入ってきたまま', () => {
  it('a document stamped by someone else, one screen edit on top -> Ctrl+Z -> the restored document carries the stamp it was opened with', () => {
    // Why: the cases assert the consequences the one road owes, never which call reached replaceDocument,
    // so an undo that steps back and assigns the pair itself fails them; FR-063 restores all three stamp values.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    expect(
      stampOf(loop.document()),
      'the edit itself must move the stamp, or there is nothing for the undo to restore',
    ).not.toEqual({ ...OPENED_STAMP })

    loop.receiveInput(UNDO)

    expect(stampOf(loop.document())).toEqual({ ...OPENED_STAMP })
    expect(projectOf(loop.document()).statusDate).toBeNull()
  })

  it('an undone edit -> Ctrl+Y -> the redone document carries the stamp that document was written with', () => {
    // Why: the stamp coming back is the one the edit wrote, ED-1's word at the write's instant, not one signed at the redo.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    const written = structuredClone(stampOf(loop.document()))
    loop.receiveInput(UNDO)
    loop.receiveInput(REDO)

    expect(stampOf(loop.document())).toEqual(written)
    expect(stampOf(loop.document()).lastEditedBy).toBe(ED_1_WORD)
    expect(projectOf(loop.document()).statusDate).not.toBeNull()
  })
})

// Spec: RD-1, RD-2, WS-4, AG-10, FR-031
describe('表 T-230 RD-1 / RD-2 -- 取り消しの 1 段: 積まない', () => {
  it('one edit and one undo -> a second Ctrl+Z with nothing earlier to reach -> the document does not move', () => {
    // Why: one edit and one undo spend the history; had the walk pushed a step, a second Ctrl+Z would hand the edited
    // document back, and WS-6 replaces one reference, so an unmoved document is the same value.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    loop.receiveInput(UNDO)
    const restored = loop.document()

    loop.receiveInput(UNDO)

    expect(loop.document()).toBe(restored)
    expect(projectOf(loop.document()).statusDate).toBeNull()
    expect(stampOf(loop.document())).toEqual({ ...OPENED_STAMP })
  })

  it('one edit and one undo -> Ctrl+Y -> the edit comes back, so the walk left the history where it found it', () => {
    // Why: a step pushed by the walk itself would stand on top of the history and leave nothing to redo.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    const edited = loop.document()
    loop.receiveInput(UNDO)
    loop.receiveInput(REDO)

    expect(projectOf(loop.document()).statusDate).toEqual(projectOf(edited).statusDate)
    expect(stampOf(loop.document())).toEqual(structuredClone(stampOf(edited)))
  })
})

// Spec: WS-2, AG-9, CS-2, IN-1a
describe('表 T-067 WS-2 -- the moment refuses the walk as it refuses any other write', () => {
  it('an edit in the history and a press in flight on a bar -> Ctrl+Z -> the document does not move', () => {
    // Why: CS-2 starts a gesture at the press, not the first move, and T-230 changes only history, stamp and undo step,
    // so WS-2 refuses the walk as it refuses any other write.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(underTheStatusLine), SCREEN)
    pane.runAnimationFrames()

    loop.receiveInput(THE_ONE_EDIT)
    pane.runAnimationFrames()
    const edited = loop.document()

    const center = planCenter(loop, 1)
    const taskGroupArea = loop.current()!.regions.taskGroupArea
    expect(center.x, 'premise: the bar is still in the Task Group Area').toBeGreaterThan(taskGroupArea.x)
    expect(center.x, 'premise: the bar is still in the Task Group Area').toBeLessThan(taskGroupArea.x + taskGroupArea.width)
    loop.receiveInput(pointer('down', center.x, center.y))
    loop.receiveInput(UNDO)

    expect(loop.document()).toBe(edited)
    expect(projectOf(loop.document()).statusDate).not.toBeNull()
  })

  it('... and once IN-1a has ended that gesture -> the same Ctrl+Z moves it', () => {
    // Why: the pair makes the case above about the moment, not an empty history; an abort (IN-1a) writes nothing,
    // so the step the refused undo could not spend is still there.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(underTheStatusLine), SCREEN)
    pane.runAnimationFrames()

    loop.receiveInput(THE_ONE_EDIT)
    pane.runAnimationFrames()
    const center = planCenter(loop, 1)

    loop.receiveInput(pointer('down', center.x, center.y))
    loop.receiveInput(UNDO)
    loop.receiveInput(pointer('lost', center.x, center.y))
    loop.receiveInput(UNDO)

    expect(projectOf(loop.document()).statusDate).toBeNull()
    expect(stampOf(loop.document())).toEqual({ ...OPENED_STAMP })
  })
})

// Spec: WS-7, AG-6, RD-1, RD-2
describe('表 T-067 WS-7 and AG-6 -- the watchers are told', () => {
  it('a subscriber of its own name, one edit -> Ctrl+Z -> it is handed the restored document', () => {
    // Why: the undo moves the schedule instant back to a different value, so the equality says the schedule moved,
    // and the restored stamp is signed template, not this watcher, so AG-6 selects it.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    const taken = watching(loop)

    loop.receiveInput(UNDO)

    expect(taken).toHaveLength(1)
    // Why: the notice carries the stamp, not the document; the restored document is the one the loop holds (see AV-14, AG-6)
    expect(taken[0]?.stamp).toEqual({ ...OPENED_STAMP })
    expect(projectOf(loop.document()).statusDate).toBeNull()
  })

  it('the same subscriber, an undone edit -> Ctrl+Y -> it is handed the redone document', () => {
    // Why: RD-2 keeps the stamp too, so the instant coming back is the one the edit wrote, unequal to the watcher's last.
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    loop.receiveInput(THE_ONE_EDIT)
    const written = structuredClone(stampOf(loop.document()))
    loop.receiveInput(UNDO)
    const taken = watching(loop)

    loop.receiveInput(REDO)

    expect(taken).toHaveLength(1)
    expect(taken[0]?.stamp).toEqual(written)
    expect(projectOf(loop.document()).statusDate).not.toBeNull()
  })
})

// Spec: FT-2, WS-6, NFR-011
describe('表 T-078 FT-2 -- the landing owes a frame', () => {
  it('an edit already drawn -> Ctrl+Z -> a further frame runs, and it is drawn from the restored document', () => {
    // Spec: UN-8, FR-046
    // Why: showing the status line also slid the view, which undo leaves alone, so the picture owed
    // is the one a fresh loop draws from the restored document (ADR-001, CA-2 of table T-071).
    const pane = frozenHost()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    pane.runAnimationFrames()
    const opened = pane.drawn[pane.drawn.length - 1]

    loop.receiveInput(THE_ONE_EDIT)
    pane.runAnimationFrames()
    const afterEdit = pane.drawn.length
    const editPicture = pane.drawn[pane.drawn.length - 1]
    expect(editPicture, 'the edit must reach the picture, or the undo has nothing to undraw').not.toBe(
      opened,
    )

    loop.receiveInput(UNDO)
    pane.runAnimationFrames()

    expect(pane.drawn.length).toBeGreaterThan(afterEdit)
    expect(pane.drawn[pane.drawn.length - 1]).not.toBe(editPicture)
    const fresh = frozenHost()
    frameLoop(fresh.surface, loop.document(), SCREEN)
    fresh.runAnimationFrames()
    expect(pane.drawn[pane.drawn.length - 1]).toBe(fresh.drawn[fresh.drawn.length - 1])
  })
})

describe('the specification still says what these cases copy', () => {
  it('表 T-230 still gives RD-1 and RD-2 the three columns these cases assert', () => {
    for (const row of ['RD-1', 'RD-2'] as const) {
      const cells = rowOf('T-230', row).by
      expect(cells['刻印'], `${row} 刻印`).toBe('入ってきたまま')
      expect(cells['取り消しの 1 段'], `${row} 取り消しの 1 段`).toBe('積まない')
      expect(cells['履歴'], `${row} 履歴`).toBe('問う先が答えたものを据える')
    }
    expect(rowOf('T-230', 'RD-1').by['呼び手']).toBe('取り消し（人の押下と `Agent API` の `undoEdit`）')
    expect(rowOf('T-230', 'RD-2').by['呼び手']).toBe('やり直し（人の押下と `Agent API` の `redoEdit`）')
    expect(rowOf('T-230', 'RD-1').by['`WS-3` の位置に立つもの']).toContain('UndoEdit')
    expect(rowOf('T-230', 'RD-2').by['`WS-3` の位置に立つもの']).toContain('RedoEdit')
  })

  it('表 T-036 still spells the two keys these cases press', () => {
    expect(sameSpelling(rowOf('T-036', 'SK-6').by['割当'] ?? '')).toContain('Ctrl+Z')
    expect(sameSpelling(rowOf('T-036', 'SK-7').by['割当'] ?? '')).toContain('Ctrl+Y')
    expect(sameSpelling(rowOf('T-036', 'SK-20').by['割当'] ?? '')).toContain('Ctrl+Shift+D')
  })

  it('表 T-067 still puts the refusal at WS-2 and the notice after the swap at WS-7', () => {
    expect(rowOf('T-067', 'WS-2').by['すること']).toContain('身振りの最中')
    expect(rowOf('T-067', 'WS-6').by['すること']).toContain('現在値を差し替える')
    expect(rowOf('T-067', 'WS-7').by['すること']).toContain('差し替えの後に通知を配る')
    expect(bare(rowOf('T-067', 'WS-7').by['正'] ?? '')).toBe('AG-6')
  })

  it('表 T-078 still makes the replacement of the current value a trigger', () => {
    expect(rowOf('T-078', 'FT-2').by['契機']).toContain('現在値の差し替え')
    expect(rowOf('T-078', 'FT-2').by['気づくもの']).toContain('SingleHtmlShell')
  })

  it('表 T-027 still puts the base date line among the undo targets', () => {
    expect(rowOf('T-027', 'UN-13').by['区分']).toBe('対象')
    expect(rowOf('T-027', 'UN-13').by['操作']).toContain('基準日')
  })
})
