// Unit tests: a moved selection does not by itself put the Properties Panel up (FR-072).

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  FieldEditNotice,
  PropertiesPanel,
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
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture document and the loop are reached as loose shapes */

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const U_25 = bare(rowOf('T-103', 'U-25').by['確定名（英）'] ?? '')

const APP_HEADER = bare(rowOf('T-109', 'IC-17').by['面'] ?? '')

const MK_13 = rowOf('T-023', 'MK-13').cells.join(' ')
const SK_19 = rowOf('T-036', 'SK-19').cells.join(' ')
const SK_3 = rowOf('T-036', 'SK-3').cells.join(' ')

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

// Why: cut to FR-072's own statement, since a toContain over the whole manuscript would
// keep passing if the sentences drifted into another requirement.
function fr072Statement(): string {
  const start = REQUIREMENTS.indexOf('**UID**: FR-072')
  if (start < 0) throw new Error('the manuscript holds no requirement FR-072')
  const end = REQUIREMENTS.indexOf('**ORIGIN**', start)
  if (end < 0) throw new Error('FR-072 has no ORIGIN, so its STATEMENT has no end')
  return REQUIREMENTS.slice(start, end)
}

const FR_072 = fr072Statement()

const FR_072_NOT_FROM_A_SELECTION =
  '`GRS` は、表 T-023c の選択が動いたことだけを理由に、プロパティパネルを出し始めないこと。'
const FR_072_ONLY_A_NAMED_PRESS =
  '`GRS` は、パネルを出すことを求める要求が名指した押下のときだけ、プロパティパネルを出し始めること。'
const FR_072_MUST_NOT_ENUMERATE = 'その入口を本要求が数え上げてはならない（MUST NOT）'
const FR_072_MOVES_WITH_THE_SELECTION = 'プロパティパネルを出している間、選択が動いたとき、`GRS` は、中身を動いた先の選択へ移すこと（STATEMENT の「最後の操作」）。'
const FR_072_KEEPS_THE_SELECTION =
  'プロパティパネルを出すのをやめたとき、`GRS` は、選択を解除しないこと。'
const T_036_NOT_WHILE_A_SURFACE_STANDS = '`Confirmation`（`U-55`）または `ScreenState` が持つ面（`S-99g`）が立っている間、`GRS` は、`SK-19` の 2 段目（プロパティパネルを出すのをやめる）を当てないこと。'


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

const THE_TASK = 1
// Why: a second Task, so a moved selection can be told from a standing one.
const THE_OTHER_TASK = 2

function twoTaskDocument(): Document {
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
  return {
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
        task(THE_TASK, '2026-04-01T00:00:00', '2026-04-10T00:00:00', 'One'),
        task(THE_OTHER_TASK, '2026-05-06T00:00:00', '2026-05-20T00:00:00', 'Two'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, 'Alpha'), row(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: THE_TASK, taskGroupId: ALPHA },
        { taskUid: THE_OTHER_TASK, taskGroupId: BETA },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    // Why: the panel's width is a screen value starting at S-171, so the document carries none;
    // the width a drag settles is FR-052's.
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

// Why: wide enough that the bars stay in the Task Group Lanes beside a panel of S-171.
const SCREEN: FrameEnvironment = {
  width: 2400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

// Summary: When a case runs the frames, the host shall run the queued animation frames and decide nothing about the panel.
function host(): Host {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
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
  // Why: starts or ends an edit in the name field, SK-19's own condition; IF-9 tells the
  // shell by a begin or end notice.
  leaveAnEditUnsettled(unsettled: boolean): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  let unsettled = false
  // Why: IF-9's notices raised since the shell last read them, in order.
  const pending: FieldEditNotice[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readFieldEditNotices: () => pending.splice(0, pending.length),
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    leaveAnEditUnsettled: (next) => {
      if (next === unsettled) return
      unsettled = next
      // Why: PR-1 is the row the name field names (table T-016).
      pending.push({ kind: next ? 'began' : 'ended', row: 'PR-1' })
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

// Spec: SK-19
const ENTER = (): HumanInput => key('Enter')
// Spec: SK-8, IN-4
const ESCAPE = (): HumanInput => key('Esc')
// Spec: SK-13
const OPEN_HELP = (): HumanInput => key('F1')
// Spec: SK-3, SL-1
const DELETE_SELECTION = (): HumanInput => key(deleteSpelling())

// Why: read from SK-3, never typed, since table T-036 keeps one home for each spelling.
function deleteSpelling(): string {
  // Why: the cell is read as a list; splitting its first span on '/' took the whole of it
  // (DFC-351).
  const spellings = bareAll(rowOf('T-036', 'SK-3').by['割当'] ?? '')
  const first = spellings[0]?.trim() ?? ''
  if (first === '') throw new Error('table T-036 SK-3 states no assignment')
  return first
}

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  panel(): PropertiesPanel | null
  panelIsUp(): boolean
  modalIsUp(): boolean
  taskUids(): readonly number[]
  aimAt(part: string, entry: string): void
  aimAtNothing(): void
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, twoTaskDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  pen.runAnimationFrames()
  return {
    loop,
    screen,
    send,
    panel: () => screen.last().propertiesPanel,
    panelIsUp: () => screen.last().propertiesPanel !== null,
    modalIsUp: () => (screen.last().helpModal ?? null) !== null,
    taskUids: () => (loop.document() as any).schedule.tasks.map((one: Task) => one.uid),
    aimAt: (part, entry) => {
      screen.drawAt({
        part,
        entry: entry as any,
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
    },
    aimAtNothing: () => {
      screen.drawAt(null)
    },
  }
}

// Why: not the bar's middle: an unstarted Task's GA-18 marker sits outside GA-6's hold,
// and GA-18, above GA-9 in table T-023d, cycles the state instead of selecting.
function middleOfTheBar(built: Stage, uid: number): { readonly x: number; readonly y: number } {
  const values = built.loop.current()
  if (values === null) throw new Error('the loop has run no frame, so it has drawn no bar')
  const drawn = values.geometry.tasks.find((one) => one.taskUid === uid)
  if (drawn === undefined || drawn.plan === null) {
    throw new Error(`Task ${uid} has no plan bar in this frame`)
  }
  if (drawn.plan.form !== 'outline') {
    throw new Error(`Task ${uid} is drawn as a ${drawn.plan.form}, which has no body to press`)
  }
  const xs = drawn.plan.points.map((one) => one.x)
  const ys = drawn.plan.points.map((one) => one.y)
  // Why: only the part the Task Group Lanes shows can be pressed; a shown panel covers the rest.
  const area = values.regions.taskGroupArea
  const right = Math.min(Math.max(...xs), area.x + area.width - 1)
  const marker = drawn.marker
  const left =
    marker === null
      ? Math.min(...xs)
      : Math.max(Math.min(...xs), marker.center.x + marker.radius)
  if (left >= right) throw new Error(`Task ${uid} has no body the marker leaves free`)
  return { x: (left + right) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

// Why: pressed and released at one point, since IN-1 settles a pointer operation on the
// release and a press left down would be a drag.
function pressTask(built: Stage, uid: number): void {
  const at = middleOfTheBar(built, uid)
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('up', at.x, at.y))
}

// Spec: MK-13
function doubleClickTask(built: Stage, uid: number): void {
  const at = middleOfTheBar(built, uid)
  built.send(pointer('down', at.x, at.y, { clickCount: 2 }))
  built.send(pointer('up', at.x, at.y, { clickCount: 2 }))
}

// Spec: IC-17
function pressIc17(built: Stage): void {
  built.aimAt(APP_HEADER, 'IC-17')
  built.send(pointer('down', 700, 20))
  built.send(pointer('up', 700, 20))
  built.aimAtNothing()
}

function subjectUidsOf(panel: PropertiesPanel): readonly number[] {
  const uids = new Set<number>()
  for (const field of panel.fields) {
    for (const control of field.controls) {
      const holder = control.key as { readonly holder: string; readonly uid?: number }
      if ((holder.holder === 'task' || holder.holder === 'taskVisual') && holder.uid !== undefined) {
        uids.add(holder.uid)
      }
    }
  }
  return [...uids]
}

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: a parse that lost a column would make every case below agree with anything.
    expect(U_25).toBe('Properties Panel')
    expect(APP_HEADER).toBe('App Header')
    expect(MK_13, 'MK-13 still opens the panel for a Task').toContain('プロパティパネルを出し')
    expect(SK_19, 'SK-19 still carries its second stage').toContain(
      '出ている通知も確定していないその場の編集も無く、プロパティパネルを出している間、 `Enter` を押したとき、`GRS` は、プロパティパネルを出すのをやめること（焦点が名称の欄の外にあるときも含む）。',
    )
    expect(SK_3, 'SK-3 still deletes what is selected').toContain('選択しているものを削除する')
  })

  it('⛔ FR-072 opens the panel only on a press a requirement named, and may not count them', () => {
    // Why: no count of entrances is asserted: the old two-entrance sentence was false when
    // written, so this guards the rule of when and the MUST NOT on counting instead.
    expect(FR_072.match(/\*\*UID\*\*:/g)?.length, 'the cut holds one requirement, not the file').toBe(
      1,
    )
    expect(FR_072, 'FR-072 (MUST NOT): 選択が動いたことだけを理由に出し始めない').toContain(
      FR_072_NOT_FROM_A_SELECTION,
    )
    expect(FR_072, 'FR-072 (MUST): 出すのは、要求が名指した押下のときだけである').toContain(
      FR_072_ONLY_A_NAMED_PRESS,
    )
    expect(
      FR_072,
      'FR-072 (MUST NOT): 入口を数え上げない —— 員数を 2 か所に置けば必ず離れていく',
    ).toContain(FR_072_MUST_NOT_ENUMERATE)
    expect(FR_072, 'FR-072: 出しているあいだは、選択が動けば中身がそれに移る').toContain(
      FR_072_MOVES_WITH_THE_SELECTION,
    )
    expect(FR_072, 'FR-072 (MUST NOT): 出すのをやめても、選択を解かない').toContain(
      FR_072_KEEPS_THE_SELECTION,
    )
  })

  it('⛔ table T-036 still keeps SK-19’s second stage off while a 面 stands', () => {
    expect(REQUIREMENTS).toContain(T_036_NOT_WHILE_A_SURFACE_STANDS)
    expect(REQUIREMENTS).toContain('`Confirmation`（`U-55`）または `ScreenState` が持つ面（`S-99g`）が立っている間も、`GRS` は、`SK-19` の 1 段目（その場の編集の確定）を当てること。')
  })

  it('table T-109 still puts IC-17 on the App Header, on FR-072’s authority', () => {
    const ic17 = rowOf('T-109', 'IC-17')
    expect(bare(ic17.by['正'] ?? '')).toBe('FR-072')
    expect(ic17.by['何の入口か'] ?? '').toContain('プロパティパネル')
  })

  it('the document these cases drive is a valid GRS JSON document', () => {
    const report = validateDocument(twoTaskDocument())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('the panel is not up before anything has been pressed', () => {
    // Why: without this premise, an entrance putting the panel up says nothing.
    expect(stage().panelIsUp()).toBe(false)
  })

  it('both Tasks are drawn with a body to press', () => {
    const built = stage()
    expect(middleOfTheBar(built, THE_TASK).x).toBeGreaterThan(0)
    expect(middleOfTheBar(built, THE_OTHER_TASK).x).toBeGreaterThan(0)
  })
})

describe('FR-072 (MUST NOT) -- one press chooses, and does not put the panel up', () => {
  it('⛔ MUST NOT: a plain press on a Task leaves the panel off the screen', () => {
    const built = stage()

    pressTask(built, THE_TASK)

    expect(
      built.panelIsUp(),
      'FR-072 (MUST NOT): 選択が動いたことだけを理由にパネルを出し始めてはならない',
    ).toBe(false)
  })

  it('⭐ and the press really did choose it -- SK-3 still has something to delete', () => {
    // Why: a loop that ignored the press would pass the case above, so this shows the press
    // chose the Task.
    const built = stage()

    pressTask(built, THE_TASK)
    built.send(DELETE_SELECTION())

    expect(built.taskUids(), 'SL-2 of table T-023c: the press chose the Task').toEqual([
      THE_OTHER_TASK,
    ])
  })

  it('⭐ and a `Delete` with nothing chosen removes nothing', () => {
    // Why: the control for the case above: a loop that deleted on every Delete would make the
    // selection cases agree with anything.
    const built = stage()

    built.send(DELETE_SELECTION())

    expect(built.taskUids().length, 'SK-3 acts on a selection, and there is none').toBe(2)
  })

  it('⛔ MUST NOT: a press that moves the selection to ANOTHER Task does not open it either', () => {
    // Why: the second press is the move the rule is about; refusing only the first press
    // would pass the case above.
    const built = stage()

    pressTask(built, THE_TASK)
    pressTask(built, THE_OTHER_TASK)

    expect(built.panelIsUp()).toBe(false)
  })

  it('DFC-541 3, MUST NOT: a panel put away stays away when a later press moves the selection', () => {
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.send(ESCAPE())
    expect(built.panelIsUp(), 'premise: Esc put the panel away').toBe(false)

    pressTask(built, THE_OTHER_TASK)

    expect(built.panelIsUp(), 'FR-072: only a press a requirement named may bring the panel back').toBe(false)
  })
})

// Spec: MK-13, IC-17, FR-006
// Why: two named roads, never the set: FR-072 forbids counting its entrances, and FR-042,
// FR-091 and HF-14 name more.
// Why: without a road that opens the panel, the refusals above pass on a loop that never
// opens it.
describe('table T-023 MK-13 and table T-109 IC-17 -- two roads that do put it up', () => {
  it('⛔ MUST: a double click on a Task puts the panel up, showing that Task', () => {
    // Why: MK-13's focus and selected text are not asserted: no member of ScreenView or
    // ScreenSurface carries a focus or a caret.
    const built = stage()

    doubleClickTask(built, THE_TASK)

    const panel = built.panel()
    expect(panel, `MK-13 (MUST): ${U_25} is described once a Task is double clicked`).not.toBeNull()
    expect(panel?.showing).toBe('selection')
    expect(subjectUidsOf(panel as PropertiesPanel)).toEqual([THE_TASK])
  })

  it('⛔ MUST: IC-17 puts it up showing the document’s own drawing settings', () => {
    const built = stage()

    pressIc17(built)

    expect(built.panel(), '表 T-109 IC-17: 文書の描画設定をプロパティパネルに出す').not.toBeNull()
    expect(built.panel()?.showing).toBe('documentSettings')
  })

  it('⚠️ while it is up, a moved selection moves what it shows', () => {
    const built = stage()

    doubleClickTask(built, THE_TASK)
    pressTask(built, THE_OTHER_TASK)

    expect(built.panelIsUp(), 'the panel was up, and a press does not take it away').toBe(true)
    expect(subjectUidsOf(built.panel() as PropertiesPanel)).toEqual([THE_OTHER_TASK])
  })
})

describe('FR-072 (DFC-706) -- the document settings give way to a moved selection', () => {
  it('while IC-17 shows the settings, a press that chooses a Task moves the panel to that Task', () => {
    const built = stage()
    pressIc17(built)
    expect(built.panel()?.showing, 'premise: the settings are shown').toBe('documentSettings')

    pressTask(built, THE_TASK)

    expect(built.panel()?.showing, 'FR-072: 選択が動けば中身は選んだものへ移る').toBe('selection')
    expect(subjectUidsOf(built.panel() as PropertiesPanel)).toEqual([THE_TASK])
  })
})

describe('table T-036 SK-19 -- `Enter` closes a panel with nothing left to settle', () => {
  it('⛔ MUST: one `Enter` with no unsettled edit takes the panel off the screen', () => {
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.screen.leaveAnEditUnsettled(false)

    built.send(ENTER())

    expect(
      built.panelIsUp(),
      'SK-19 (MUST): 確定していないその場の編集が 1 つも無いときは…出すのをやめること',
    ).toBe(false)
  })

  it('⚠️ the same when the focus is nowhere near the name field -- IC-17’s panel closes too', () => {
    // Why: an IC-17 panel shows the document's settings, which hold no name field, so the
    // focus is surely outside it.
    const built = stage()
    pressIc17(built)
    expect(built.panel()?.showing, 'the premise: this panel is not showing a Task').toBe(
      'documentSettings',
    )

    built.send(ENTER())

    expect(built.panelIsUp(), 'SK-19: 焦点が名称の欄の外にあるときも同じである').toBe(false)
  })

  it('⛔ an `Enter` with an edit still unsettled does NOT reach the second stage', () => {
    // Why: SK-19's second stage needs no edit unsettled, so this press only settles; when it
    // settles is not asserted, as no row says when readFieldCommit is read.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.screen.leaveAnEditUnsettled(true)

    built.send(ENTER())

    expect(
      built.panelIsUp(),
      'SK-19: the second stage is for when NO in-place edit is left unsettled',
    ).toBe(true)
  })

  it('⭐ and the press after the edit is settled does take it away -- two presses in all', () => {
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.screen.leaveAnEditUnsettled(true)
    built.send(ENTER())

    built.screen.leaveAnEditUnsettled(false)
    built.send(ENTER())

    expect(built.panelIsUp(), 'A-appendix 1.58: `Enter` 2 度で閉じる').toBe(false)
  })
})

describe('table T-036’s closing rule -- the second stage is off while a 面 stands', () => {
  it('⛔ MUST NOT: with the help up, `Enter` does not take the panel away', () => {
    // Why: T-036 bars the second stage of SK-19 while a surface stands, and S-99g counts the normal help as one.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.send(OPEN_HELP())
    built.screen.leaveAnEditUnsettled(false)
    expect(built.modalIsUp() && built.panelIsUp(), 'both are up before the press').toBe(true)

    built.send(ENTER())

    expect(
      built.panelIsUp(),
      'T-036 (MUST NOT): 面が立っているあいだ、`SK-19` の 2 段目を当ててはならない',
    ).toBe(true)
  })

  it('⭐ and once the 面 is gone, the same press does take it away', () => {
    // Why: without this pair the case above would pass on a loop whose Enter never closes
    // anything.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.send(OPEN_HELP())
    built.screen.leaveAnEditUnsettled(false)

    built.send(ENTER())
    // Step: Esc takes the help away first, by IN-4's first level.
    built.send(ESCAPE())
    expect(built.modalIsUp(), 'the 面 has been taken off the screen').toBe(false)
    built.send(ENTER())

    expect(built.panelIsUp()).toBe(false)
  })

  it('⚠️ and the 面 itself is not what `Enter` took', () => {
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.send(OPEN_HELP())
    built.screen.leaveAnEditUnsettled(false)

    built.send(ENTER())

    expect(built.modalIsUp(), '`Enter` is not the key that closes a 面').toBe(true)
  })
})

describe('FR-072 (MUST NOT) -- a closed panel leaves the selection where it was', () => {
  it('⛔ MUST NOT: after `Esc` has taken the panel, SK-3 still has the Task to delete', () => {
    // Why: FrameLoop publishes no selection and SK-3 acts on one, so the Task going is the
    // selection saying it stood.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.send(ESCAPE())
    expect(built.panelIsUp(), 'the panel is off the screen before the question is asked').toBe(false)

    built.send(DELETE_SELECTION())

    expect(
      built.taskUids(),
      'FR-072 (MUST NOT): パネルを出すのをやめても、選択を解除してはならない',
    ).toEqual([THE_OTHER_TASK])
  })

  it('⛔ MUST NOT: the same after `SK-19` has taken it', () => {
    // Why: both roads out, since a loop that cleared the selection on one of them would break
    // the same MUST NOT while passing the other case.
    const built = stage()
    doubleClickTask(built, THE_TASK)
    built.screen.leaveAnEditUnsettled(false)
    built.send(ENTER())
    expect(built.panelIsUp()).toBe(false)

    built.send(DELETE_SELECTION())

    expect(built.taskUids()).toEqual([THE_OTHER_TASK])
  })
})
