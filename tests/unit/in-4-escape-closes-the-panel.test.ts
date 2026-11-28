// Unit tests: on UF-48, Esc closes the Properties Panel and spends exactly one level doing it.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'
import { settingNumber } from '../fixtures/setting-number'

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
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fake host patches a browser global and the fixtures reach into loose shapes */

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const U_25 = bare(rowOf('T-103', 'U-25').by['確定名（英）'] ?? '')

const SURFACE_COLUMN = '面'
const ENTRY_COLUMN = '何の入口か'
const AUTHORITY_COLUMN = '正'

const surfacesOf = (cell: string): readonly string[] =>
  cell
    .split('/')
    .map((one) => one.replace(/[`*]/g, '').trim())
    .filter((one) => one.length > 0)

const PANEL_ENTRANCES = specTable('T-109').rows.filter((row) =>
  surfacesOf(row.by[SURFACE_COLUMN] ?? '').includes(U_25),
)

const IN_4 = rowOf('T-028', 'IN-4').cells.join(' ')
const IN_4A = rowOf('T-028', 'IN-4a').cells.join(' ')
const IN_4_LADDER = '開いている面 → 進行中のドラッグ・引きかけの矢印 → 開いているウィンドウ → プロパティパネル'

const HN_2 = '「開いているウィンドウ」の段に立たない —— ほかに段に立つウィンドウが無ければ、次の段へ渡す。'

const HELP_MODAL = surfacesOf(rowOf('T-109', 'IC-129').by[SURFACE_COLUMN] ?? '')[0] ?? ''

const S_99G = rowOf('T-206', 'S-99g').cells.join(' ')

// Why: taken from the generated constant, not typed, so a width re-decided in
// table T-206 moves this fixture with it.
const S_171 = settingNumber('S-171')

const S_602 = settingNumber('S-602')

const CLOSED_WIDTH = 0

// Why: the calendar, project and settings come from FR-027's template (BT-4);
// the task groups and Tasks are written out so what is drawn can be named.
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

// Why: the document carries no panel width: it is a screen value starting at
// the kind's default, so MK-13's Task panel is S-602 wide.
function openPanelDocument(edit: (draft: any) => void = () => {}): Document {
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
        task(THE_TASK, '2026-04-01T00:00:00', '2026-04-10T00:00:00', 'One'),
        task(2, '2026-05-06T00:00:00', '2026-05-20T00:00:00', 'Two'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, 'Alpha'), row(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: THE_TASK, taskGroupId: ALPHA },
        { taskUid: 2, taskGroupId: BETA },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
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

// Why: wide, so the bar stays inside the Task Group Lanes beside the open panel;
// FR-051 keeps the window size out of the settings, so this decides nothing.
const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

// Summary: The fake host shall drain the animation-frame queue and decide nothing about Esc.
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
      // Why: bounded, so a loop that asks for a frame from inside a frame (NFR-010
      // forbids it) ends the test instead of hanging it.
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
  // Summary: The fake shall answer readScreenPartAt with the part the case set last.
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

// Spec: SK-8
const ESCAPE = (): HumanInput => key('Esc')
// Spec: SK-13
const OPEN_HELP = (): HumanInput => key('F1')

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  panelIsUp(): boolean
  modalIsUp(): boolean
  helpWindow(): string | null
  aimAt(part: string, entry: string): void
  panelWidth(): number
  taskGroupAreaWidth(): number
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, openPanelDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  // Why: the first frame is owed by making the loop, not by FT-1, so it is
  // drained before any case reads a description.
  pen.runAnimationFrames()
  const regions = () => {
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame')
    return values.regions
  }
  return {
    loop,
    screen,
    send,
    panelIsUp: () => screen.last().propertiesPanel !== null,
    modalIsUp: () => ['normal', 'maximized'].includes(screen.last().helpModal?.windowState ?? ''),
    helpWindow: () => screen.last().helpModal?.windowState ?? null,
    aimAt: (part, entry) => {
      screen.drawAt({
        part,
        entry: entry as never,
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as ScreenPart)
    },
    panelWidth: () => regions().propertiesPanel.width,
    taskGroupAreaWidth: () => regions().taskGroupArea.width,
  }
}

// Why: not the bar's middle: GA-18's progress marker (FR-043, hung off GA-6)
// stands there, and a press on it, above GA-9, is a state cycle and not MK-13.
function middleOfTheBar(built: Stage): { readonly x: number; readonly y: number } {
  const values = built.loop.current()
  if (values === null) throw new Error('the loop has run no frame, so it has drawn no bar')
  const drawn = values.geometry.tasks.find((one) => one.taskUid === THE_TASK)
  if (drawn === undefined || drawn.plan === null) {
    throw new Error(`Task ${THE_TASK} has no plan bar in this frame`)
  }
  if (drawn.plan.form !== 'outline') {
    throw new Error(`Task ${THE_TASK} is drawn as a ${drawn.plan.form}, which has no body to press`)
  }
  const xs = drawn.plan.points.map((one) => one.x)
  const ys = drawn.plan.points.map((one) => one.y)
  const right = Math.max(...xs)
  const marker = drawn.marker
  const left =
    marker === null
      ? Math.min(...xs)
      : Math.max(Math.min(...xs), marker.center.x + marker.radius)
  if (left >= right) throw new Error(`Task ${THE_TASK} has no body the marker leaves free`)
  return { x: (left + right) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

// Why: pressed and released at one point, because IN-1 settles a pointer
// operation on release and a press left down is still IN-4's drag level.
function selectTheTask(built: Stage): void {
  const at = middleOfTheBar(built)
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('up', at.x, at.y))
}

// Why: both halves of the double click carry the count, since IN-1 settles a
// pointer operation on the release.
function openThePanel(built: Stage): void {
  const at = middleOfTheBar(built)
  built.send(pointer('down', at.x, at.y, { clickCount: 2 }))
  built.send(pointer('up', at.x, at.y, { clickCount: 2 }))
}

// Why: MK-13 is a double click whose first click already selected the Task, so
// a selection stands behind the panel as the next Esc rung.
function withThePanelUp(): Stage {
  const built = stage()
  openThePanel(built)
  return built
}

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: without this, a parse that lost the surface column would make every
    // case below agree with anything.
    expect(U_25).toBe('Properties Panel')
    expect(IN_4, 'IN-4 still fixes the order of the levels').toContain('1 階層')
    expect(IN_4A, 'IN-4a still hands the rest to the browser').toContain('ブラウザーへ渡すこと')
    expect(S_99G, 'S-99g still defines a 面 by what Esc closes').toContain('「開いている面」で閉じられるもの')
    expect(IN_4, 'IN-4 gives the panel its own rung after the drag and the open windows').toContain(
      '進行中のドラッグ・引きかけの矢印 → 開いているウィンドウ → プロパティパネル',
    )
  })

  it('⛔ table T-109 still calls the `Properties Panel` a 面 that IN-4 closes', () => {
    const entrance = PANEL_ENTRANCES.find((row) => bare(row.by[AUTHORITY_COLUMN] ?? '') === 'IN-4')
    expect(entrance, `a row of table T-109 stands on ${U_25} on IN-4's authority`).not.toBe(
      undefined,
    )
    expect(entrance?.by[ENTRY_COLUMN] ?? '').toContain('閉じる')
  })

  it('S-171 holds the width a shown panel starts at, and S-99h keeps being shown apart from it', () => {
    expect(rowOf('T-206', 'S-171').cells.join(' ')).toContain('`propertyPanelWidth`')
    expect(rowOf('T-206', 'S-99h').cells.join(' ')).toContain('幅（画面の値、初期値は')
    expect(rowOf('T-206', 'S-99h').cells.join(' ')).toContain('とは別に持つこと')
    expect(S_171, 'S-171 is the width the panel OPENS to').toBeGreaterThan(CLOSED_WIDTH)
  })

  it('the document these cases drive is a valid GRS JSON document that carries no panel width', () => {
    const made = openPanelDocument()
    const report = validateDocument(made)
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
    expect((made as any).documentSettings).not.toHaveProperty('propertyPanelWidth')
  })

  it('FR-052: the width chosen leaves the `Task Group Lanes` wider than zero', () => {
    // Why: a fixture failing this would be an unlawful document rather than a
    // case about Esc.
    expect(stage().taskGroupAreaWidth()).toBeGreaterThan(0)
  })

  it('MK-13: a double click on a Task puts the panel on the screen', () => {
    const built = withThePanelUp()
    expect(built.panelIsUp(), `${U_25} is described once a Task has been double clicked`).toBe(true)
  })

  it('⛔ FR-072 (MUST NOT): one plain press selects and does NOT put the panel up', () => {
    // Why: without this, a loop that put the panel up on every press would pass
    // every case here and prove nothing about MK-13.
    const built = stage()
    selectTheTask(built)
    expect(
      built.panelIsUp(),
      'FR-072 (MUST NOT): 選択が動いたことだけを理由にパネルを出し始めてはならない',
    ).toBe(false)
  })

  it('SK-13: `F1` puts the help up, and it is not the panel', () => {
    const built = withThePanelUp()
    built.send(OPEN_HELP())
    expect(built.modalIsUp()).toBe(true)
    expect(built.panelIsUp(), 'opening the help does not take the panel away').toBe(true)
  })
})

// Why: pressing IC-52 is not asserted here: FR-029 makes it one operation with
// Esc, and one rule held in two files rots.
describe('IN-4 of table T-028 -- `Esc` closes the `Properties Panel`', () => {
  it('⛔ MUST: one press of `Esc` takes the panel off the screen', () => {
    const built = withThePanelUp()

    built.send(ESCAPE())

    expect(built.panelIsUp(), 'IN-4: 消費する階層は … 開いている面 …の順とすること').toBe(false)
  })

  it('⛔ MUST: with the panel up, `Esc` is consumed and does NOT reach the browser', () => {
    // Why: asked without sending: isBrowserDefaultStopped answers before the
    // watcher hears the press, so it reports the screen as it stands (MK-10).
    const built = withThePanelUp()

    expect(
      built.loop.isBrowserDefaultStopped(ESCAPE()),
      'the open panel is IN-4のいう「開いている面」, so the press has something to spend',
    ).toBe(true)
  })

  it('⛔ IN-4 / IN-4a (MUST): 面, then 選択, then the browser -- one rung per press', () => {
    // Why: the rungs are asserted in order so a failure says which side broke; no
    // drag or stance stands, as the gesture was released.
    const built = withThePanelUp()

    // Step: the first Esc spends the panel's rung.
    expect(
      built.loop.isBrowserDefaultStopped(ESCAPE()),
      'the open panel is IN-4のいう「開いている面」, so the first press has something to spend',
    ).toBe(true)
    built.send(ESCAPE())
    expect(built.panelIsUp(), 'IN-4: 消費する階層は … 開いている面 …の順とすること').toBe(false)

    // Step: the second Esc spends the selection, which closing the panel kept.
    expect(
      built.loop.isBrowserDefaultStopped(ESCAPE()),
      'FR-072 (MUST NOT): パネルを出すのをやめても、選択を解除してはならない -- so 選択 is still a rung',
    ).toBe(true)
    built.send(ESCAPE())

    // Step: the third Esc finds no rung and reaches the browser.
    expect(
      built.loop.isBrowserDefaultStopped(ESCAPE()),
      'IN-4a: `GRS` が何もしない `Esc` を止めると、ブラウザーが `Esc` に持たせた働きを奪う',
    ).toBe(false)
  })

})

describe('IN-4 of table T-028 -- one press spends exactly ONE level', () => {
  it('⛔ MUST: with the help AND the panel up, the first `Esc` takes exactly one of them -- the help', () => {
    // Why: IN-4 puts the open-window rung, where the normal help stands, above the properties panel.
    expect(IN_4).toContain(IN_4_LADDER)
    const built = withThePanelUp()
    built.send(OPEN_HELP())
    expect(built.modalIsUp() && built.panelIsUp(), 'both are up before the press').toBe(true)

    built.send(ESCAPE())

    const stillUp = [built.modalIsUp(), built.panelIsUp()].filter((one) => one)
    expect(stillUp, 'IN-4 (MUST): 1 階層ぶん消費し -- one press, one level').toHaveLength(1)
    expect(built.panelIsUp(), `IN-4 (MUST): ${IN_4_LADDER}`).toBe(true)
  })

  it(`HN-2 of table T-336: ${HN_2}`, () => {
    // Why: IC-129 takes the help to WB-2, which S-99g does not count as standing.
    expect(rowOf('T-336', 'HN-2').cells.join(' ')).toContain(HN_2)
    const built = withThePanelUp()
    built.send(OPEN_HELP())
    built.aimAt(HELP_MODAL, 'IC-129')
    built.send(pointer('down', 700, 20))
    built.send(pointer('up', 700, 20))
    built.screen.drawAt(null)
    expect(built.helpWindow(), 'premise: IC-129 minimized the help').toBe('minimized')

    built.send(ESCAPE())

    expect(built.panelIsUp(), 'HN-2: the rung is skipped and the next one is spent').toBe(false)
    expect(built.helpWindow(), 'HN-2: ヘルプは閉じない').toBe('minimized')
  })

  it('⛔ MUST: the second press takes the other one', () => {
    const built = withThePanelUp()
    built.send(OPEN_HELP())

    built.send(ESCAPE())
    built.send(ESCAPE())

    expect(built.modalIsUp()).toBe(false)
    expect(built.panelIsUp()).toBe(false)
  })

  it('⛔ IN-4 / IN-4a (MUST): with both 面 spent, 選択 is the last rung before the browser', () => {
    const built = withThePanelUp()
    built.send(OPEN_HELP())

    built.send(ESCAPE())
    built.send(ESCAPE())
    expect(built.modalIsUp() || built.panelIsUp(), 'both 面 are spent').toBe(false)

    // Step: the third Esc spends the selection, which the panel's closing kept.
    expect(
      built.loop.isBrowserDefaultStopped(ESCAPE()),
      'IN-4: 面 の次に残っているのは 選択 の段である',
    ).toBe(true)
    built.send(ESCAPE())

    expect(built.loop.isBrowserDefaultStopped(ESCAPE())).toBe(false)
  })
})

// Why: no case asks whether closing leaves an undo step (UN-16): with no edit
// before it, a Ctrl+Z here would pass whether or not the step existed.
describe('FR-052 and S-99h -- a closed panel leaves no gap at the right edge', () => {
  it('⛔ MUST: the panel takes no room once `Esc` has taken it', () => {
    const built = withThePanelUp()
    expect(built.panelWidth(), 'the panel has a width before the press: S-602, a Task (FR-052)').toBe(S_602)

    built.send(ESCAPE())

    expect(built.panelWidth()).toBe(CLOSED_WIDTH)
  })

  it('the `Task Group Lanes` grows by exactly what the panel had', () => {
    // Why: the two widths move together by arithmetic, so this case shows the
    // closing reached the width and not only the drawing.
    const built = withThePanelUp()
    const before = built.taskGroupAreaWidth()

    built.send(ESCAPE())

    expect(built.taskGroupAreaWidth() - before, 'FR-052: the残り is what the Task Group Lanes gets').toBe(S_602)
  })
})
