// Unit tests: HF-14 keeps a raised task group visible by tree state, never by rewriting zoomY.

import { readFileSync } from 'node:fs'
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
  TaskGroupTitle,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { groupDepthLimit } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { drawnSettingsOf } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture builds documents from the untyped template and patches requestAnimationFrame */

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

const TASK_GROUP_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

// Summary: entranceFor() returns the one Task Group Panel entrance whose T-109 column names the rule.
function entranceFor(rule: string): string {
  const onThePanel = specTable('T-109').rows.filter(
    (one) => bareAll(one.by['面'] ?? '').includes(TASK_GROUP_PANEL),
  )
  const found = onThePanel.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  const first = found[0]
  if (found.length !== 1 || first === undefined) {
    throw new Error(`表 T-109 gives ${rule} ${found.length} entrances on the panel, not one`)
  }
  return first.id
}

const ADD_CHILD_TASK_GROUP = entranceFor('HF-14')

const px = (table: string, id: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(rowOf(table, id).by['既定'] ?? '')
  if (found === null) throw new Error(`${id} states no number in its 既定 column`)
  return Number(found[0])
}

// Spec: S-125, FR-085
const MAX_GROUP_DEPTH = ((): number => {
  const value = SETTINGS_CONSTANTS['maxGroupDepth']
  if (typeof value !== 'number') throw new Error('SETTINGS_CONSTANTS.maxGroupDepth is not a number')
  return value
})()

// Why: a zoomY of exactly S-87's base clears depth 2 but not depth 3, since
// threshold(d) = base x ratio^(d - 2); it is read, never typed.
const GROUP_LOD_BASE = px('T-205', 'S-87')

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

// Why: AT-51 types TaskGroup.id as a UUID, so the fixture ids are UUIDs.
const uuidOf = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

interface GroupSpec {
  readonly id: string
  readonly parentId: string | null
  readonly name: string
  readonly treeState: 'auto' | 'collapsed'
}

function documentWith(groups: readonly GroupSpec[], zoomY: number): Document {
  const template = structuredClone(TEMPLATE) as any
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
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: groups.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        name: one.name,
        derivedFromTaskUid: null,
        order: index,
        treeState: one.treeState,
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...structuredClone(template.documentSettings), zoomY },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const taskGroupsOf = (
  document: Document,
): readonly { id: string; parentId: string | null; treeState: string }[] =>
  (document.schedule as any).taskGroups

function groupIn(document: Document, id: string): { id: string; parentId: string | null; treeState: string } {
  const found = taskGroupsOf(document).find((one) => one.id === id)
  if (found === undefined) throw new Error(`the document holds no TaskGroup ${id}`)
  return found
}

// Why: the raised id is the system's to choose, so it is found as the one id the
// press added, the difference table T-051 counts below HF-18.
function raisedRowId(before: Document, after: Document): string {
  const beforeIds = new Set(taskGroupsOf(before).map((one) => one.id))
  const added = taskGroupsOf(after).filter((one) => !beforeIds.has(one.id))
  if (added.length !== 1) {
    throw new Error(`the press raised ${added.length} task groups, expected exactly one`)
  }
  const only = added[0]
  if (only === undefined) throw new Error('unreachable')
  return only.id
}

const TASK_GROUP_CONTROLS_TALL = (px('T-206', 'S-138') + px('T-206', 'S-243') * 2) * 2

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  taskGroupControlsHeightPx: TASK_GROUP_CONTROLS_TALL,
}

const realRaf = (globalThis as any).requestAnimationFrame

// Summary: host() queues requestAnimationFrame callbacks and runs them on demand, deciding nothing itself.
function host(): { readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }; runAnimationFrames: () => void } {
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
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage): ScreenPane {
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

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left' as PointerButton,
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

const ON_THE_SURFACE = { x: 80, y: 120 }

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  press(entry: string, taskGroupId: string): void
  titleFor(taskGroupId: string): TaskGroupTitle | undefined
}

function stage(document: Document, language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, document, SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  return {
    loop,
    screen,
    send,
    press: (entry, taskGroupId) => {
      screen.drawAt({
        part: TASK_GROUP_PANEL,
        entry: entry as any,
        format: null,
        taskGroupId: taskGroupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
      // Why: IN-1 settles a pointer operation on release, so a press is down then up.
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      screen.drawAt(null)
    },
    titleFor: (taskGroupId) => {
      const panel = screen.last().taskGroupPanel
      return [...panel.pinnedTitles, ...panel.titles].find((one) => one.taskGroupId === taskGroupId)
    },
  }
}

// Spec: HF-14, HF-7, S-87
describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    expect(TASK_GROUP_PANEL).toBe('Task Group Panel')
    expect(ADD_CHILD_TASK_GROUP).toBe('IC-91')
    expect(MAX_GROUP_DEPTH, 'the fixtures below assume room for at least 3 levels').toBeGreaterThanOrEqual(3)
    expect(GROUP_LOD_BASE).toBeGreaterThan(0)
  })

  it('⛔⛔ HF-14 keeps the raised task group visible by the tree state, never by rewriting the vertical zoom', () => {
    expect(says('T-051', 'HF-14')).toContain('`GRS` は、立てたタスクグループを見えるようにすること。')
    expect(says('T-051', 'HF-14')).toContain('`AT-153` のとおり `temporarilyExpanded` で立て')
    expect(says('T-051', 'HF-14')).toContain('`auto` か `collapsed` なら `temporarilyExpanded` にすること')
    expect(says('T-051', 'HF-14')).toContain('いまの倍率のまま、立てたタスクグループとその兄弟とその祖先を描く')
    expect(says('T-051', 'HF-14')).toContain('`GRS` は、立てたタスクグループを見せるために、縦の倍率を書き換えないこと。')
    expect(says('T-051', 'HF-14')).toContain('`GRS` は、立てたタスクグループを見せるのに、表示位置を送るだけで済ませないこと。')
    expect(says('T-051', 'HF-14')).toContain(
      'これは `HF-17` の「タスクグループが見える位置まで送ること（MUST）」と同じ 1 つの約束である',
    )
  })

  it('⛔⛔ HF-14 still opens only the one parent that was pressed', () => {
    expect(says('T-051', 'HF-14')).toContain('`GRS` は、展開するタスクグループを押した親 1 つだけとすること。')
    expect(says('T-051', 'HF-14')).toContain('`GRS` は、押した親の先祖を書き換えないこと。')
  })

  it('⭐ HF-14 scopes its open against HF-7, and HF-7 lets an added task group outrank the zoom', () => {
    expect(says('T-051', 'HF-14')).toContain(
      '`HF-7` の折りたたみは人が自分でしたことなので、製品が動かすのは押した親の折りたたみを展開するこの 1 つの場合に限る',
    )
    expect(says('T-051', 'HF-7')).toContain('`GRS` は、人が折りたたんだ状態を、表示量の増減（`FR-018`）より優先すること。')
    expect(says('T-051', 'HF-7')).toContain('人が足したタスクグループ（`HF-14`）も、表示量の増減より優先すること')
  })

  it('⭐ FR-018 still gives the group-LOD formula this file computes its zoomY from', () => {
    expect(says('T-205', 'S-87')).toContain('threshold(d) = base × ratio^(d − 2)')
    const stored = TEMPLATE['documentSettings'] as Record<string, unknown>
    const settings = { ...stored, zoomY: GROUP_LOD_BASE } as unknown as DocumentSettings
    expect(groupDepthLimit(drawnSettingsOf(settings))).toBe(2)
  })

  it('⛔ written down, not asserted: HR-1a makes a literal collapsed ANCESTOR unreachable here', () => {
    // Why: HR-1a hides a collapsed group's whole subtree, so a pressed task group never
    // has a collapsed ancestor; half 2 checks an unrelated collapsed group instead.
    expect(says('T-015', 'HR-1a')).toContain(
      '`GRS` は、折りたたんだ `TaskGroup` の配下のタスクグループと、配下のタスクグループに載っている `Task` を描かないこと。',
    )
  })

  // Spec: UN-14, UN-8, FR-055
  it('⛔ written down, not asserted: whether the add and the open share one undo step is unstated', () => {
    expect(says('T-027', 'UN-14')).toContain(
      'タスクグループ（`TaskGroup`）の追加・削除・名前の変更、タスクグループの色と高さの変更、タスクグループの木の状態（`treeState`）と段 0 の折りたたみ',
    )
    expect(says('T-027', 'UN-8')).toContain('ズーム・スクロール・パン')
    expect(REQUIREMENTS).toContain(
      '全体表示を 1 回押したとき、`GRS` は、押下を 2 つの書き込みに分けて行うこと。',
    )
    // Why: UN-1 and UN-14 count the add and the open, UN-8 never zoomY, but no row splits HF-14's
    // undo steps, so no case asserts an undo step count.
  })
})

// Why: groupDepthLimit only proves the raised task group lies past the drawn tier;
// HF-14 shows it by tree state alone (AT-153, T-328, TD-6, TD-7).
// Spec: HF-14, FR-018
describe('表 T-051 HF-14 (MUST): a task group raised past the drawn tier is drawn at the same zoom', () => {
  it('⛔⛔ a child raised past the currently-drawn tier is drawn, both task groups become temporarilyExpanded, and zoomY is unchanged', () => {
    // Why: two levels, neither collapsed, so FR-018's group LOD is the only obstacle.
    const root = uuidOf(1)
    const pressed = uuidOf(2)
    const before = documentWith(
      [
        { id: root, parentId: null, name: 'depth 1', treeState: 'auto' },
        { id: pressed, parentId: root, name: 'depth 2', treeState: 'auto' },
      ],
      GROUP_LOD_BASE,
    )

    // Why: the control that makes this a test: without HF-14, a depth-3 child of
    // pressed would not clear this tier.
    expect(groupDepthLimit(drawnSettingsOf(before.documentSettings)), 'the fixture must start below depth 3').toBe(2)

    const built = stage(before)
    expect(built.titleFor(pressed), 'the pressed task group itself must be drawn to be pressed').not.toBeUndefined()

    built.press(ADD_CHILD_TASK_GROUP, pressed)

    const after = built.loop.document()
    const raised = raisedRowId(before, after)
    expect(groupIn(after, raised).parentId, 'the raised task group is a depth-3 child of the pressed task group').toBe(
      pressed,
    )

    expect(groupIn(after, raised).treeState, 'AT-153: a task group CM-26 creates').toBe('temporarilyExpanded')
    expect(groupIn(after, pressed).treeState, 'T-328 childTaskGroupAddPressed: the pressed auto parent').toBe(
      'temporarilyExpanded',
    )
    expect(after.documentSettings.zoomY, 'HF-14 (MUST NOT): the vertical zoom is not rewritten').toBe(
      before.documentSettings.zoomY,
    )
    expect(groupIn(after, root).treeState, 'HF-14 (MUST NOT): the ancestor is not rewritten').toBe('auto')
    expect(
      built.titleFor(raised),
      'HF-14 (MUST): the raised task group is drawn by TD-6 / TD-7 at the current zoom',
    ).not.toBeUndefined()
  })

  it('control: a child raised INSIDE the already-drawn tier is drawn too', () => {
    // Why: the raised child lands at depth 2, inside the tier that excluded
    // depth 3 above, so a unit that never draws a raised task group fails here too.
    const root = uuidOf(3)
    const before = documentWith(
      [{ id: root, parentId: null, name: 'depth 1', treeState: 'auto' }],
      GROUP_LOD_BASE,
    )
    expect(groupDepthLimit(drawnSettingsOf(before.documentSettings))).toBe(2)

    const built = stage(before)
    built.press(ADD_CHILD_TASK_GROUP, root)

    const after = built.loop.document()
    const raised = raisedRowId(before, after)
    expect(groupIn(after, raised).parentId).toBe(root)
    expect(built.titleFor(raised), 'a task group already inside the tier is drawn').not.toBeUndefined()
  })
})

// Why: a unit that opened every collapsed task group on the way down would still
// raise the child, but fails on the unrelated collapsed group.
// Spec: HF-14, HR-1a, HR-4, HR-6
describe('表 T-051 HF-14 half 2 (折りたたみ, MUST / MUST NOT): only the one pressed parent opens', () => {
  it('⛔⛔ the pressed, human-collapsed parent opens, and an unrelated collapsed task group elsewhere does not', () => {
    const root = uuidOf(4)
    const pressed = uuidOf(5)
    const elsewhere = uuidOf(6)
    const before = documentWith(
      [
        { id: root, parentId: null, name: 'root', treeState: 'auto' },
        { id: pressed, parentId: root, name: 'pressed, folded by a person', treeState: 'collapsed' },
        { id: elsewhere, parentId: root, name: 'elsewhere, also folded', treeState: 'collapsed' },
      ],
      // Why: the default zoomY puts no LOD obstacle in this half.
      SETTINGS_DEFAULTS['zoomY'] as number,
    )
    expect(groupDepthLimit(drawnSettingsOf(before.documentSettings)), 'depth 3 must clear the tier in this half').toBeGreaterThanOrEqual(
      3,
    )
    expect(groupIn(before, pressed).treeState, 'fixture sanity: the pressed task group starts folded').toBe('collapsed')
    expect(groupIn(before, elsewhere).treeState, 'fixture sanity: the other task group starts folded too').toBe(
      'collapsed',
    )

    const built = stage(before)
    expect(built.titleFor(pressed), 'a folded task group is still drawn; only its children are hidden').not.toBeUndefined()

    built.press(ADD_CHILD_TASK_GROUP, pressed)

    const after = built.loop.document()
    const raised = raisedRowId(before, after)
    expect(groupIn(after, raised).parentId).toBe(pressed)

    expect(groupIn(after, pressed).treeState, 'HF-14 / T-328 (MUST): the pressed parent opens for now').toBe(
      'temporarilyExpanded',
    )
    expect(
      groupIn(after, elsewhere).treeState,
      'HF-14 (MUST NOT): opening reaches no further than the pressed parent',
    ).toBe('collapsed')
    expect(groupIn(after, root).treeState, 'the untouched root stays exactly as it was').toBe('auto')

    expect(built.titleFor(raised), 'HF-14 (MUST): the raised task group must be drawn once its parent opens').not.toBeUndefined()
    expect(taskGroupsOf(after).map((one) => one.id).sort()).toEqual(
      [...taskGroupsOf(before).map((one) => one.id), raised].sort(),
    )
  })
})

describe('表 T-051 HF-14: both obstacles together still end with the task group visible', () => {
  it('⛔⛔ a child raised under a folded parent past the tier opens the parent for now and keeps zoomY', () => {
    const root = uuidOf(7)
    const pressed = uuidOf(8)
    const before = documentWith(
      [
        { id: root, parentId: null, name: 'root', treeState: 'auto' },
        { id: pressed, parentId: root, name: 'pressed, folded AND past the tier', treeState: 'collapsed' },
      ],
      GROUP_LOD_BASE,
    )
    expect(groupDepthLimit(drawnSettingsOf(before.documentSettings))).toBe(2)
    expect(groupIn(before, pressed).treeState).toBe('collapsed')

    const built = stage(before)
    expect(built.titleFor(pressed), 'the pressed task group is inside the tier, so it can be pressed').not.toBeUndefined()

    built.press(ADD_CHILD_TASK_GROUP, pressed)

    const after = built.loop.document()
    const raised = raisedRowId(before, after)
    expect(groupIn(after, raised).parentId).toBe(pressed)

    expect(groupIn(after, pressed).treeState, 'the folded parent opens for now').toBe('temporarilyExpanded')
    expect(groupIn(after, raised).treeState, 'AT-153: a task group CM-26 creates').toBe('temporarilyExpanded')
    expect(after.documentSettings.zoomY, 'HF-14 (MUST NOT): the vertical zoom is not rewritten').toBe(
      before.documentSettings.zoomY,
    )
    expect(built.titleFor(raised), 'both obstacles resolved, the task group is drawn').not.toBeUndefined()
  })
})
