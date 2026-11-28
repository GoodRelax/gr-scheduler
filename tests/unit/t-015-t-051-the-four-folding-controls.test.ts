// Unit tests: the four folding controls of a task group and the five of the panel head.

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
  AppHeaderItems,
  DisplayLanguage,
  TaskGroupTitle,
  ScreenFrame,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import {
  oneByRole,
  selfAndDescendants,
  surfaceOf as domSurfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { taskGroupNameFont } from '../fixtures/task-group-name-font'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture builds documents and fake hosts as loose shapes */

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const partName = (row: string): string => bare(rowOf('T-103', row).by['確定名（英）'] ?? '')
const TASK_GROUP_PANEL = partName('U-22')
const TASK_GROUP_TITLE_TREE = partName('U-23')

const T_109 = specTable('T-109')
const T_051 = specTable('T-051')

// Why: derived from what the rows say about themselves, never listed: a
// list written here has already gone stale once.
const T_051_AT_THE_HEAD: readonly string[] = T_051.rows
  .filter((one) => {
    const said = one.cells.join(' ')
    return said.includes('タスクグループパネルの最上部') || said.includes('`HF-10` のボタン')
  })
  .map((one) => one.id)

const isHeadRule = (authority: string): boolean =>
  T_051_AT_THE_HEAD.some((rule) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(authority),
  )

// Spec: HF-20, IC-106
// Why: IC-106 shares its authority column (FR-032) with IC-82; only its entrance column names HF-20.
const namesHeadRule = (one: { readonly by: Readonly<Record<string, string>> }): boolean =>
  isHeadRule(one.by['正'] ?? '') || isHeadRule(one.by['何の入口か'] ?? '')

const T_109_ON_THE_PANEL = T_109.rows.filter(
  (one) => bareAll(one.by['面'] ?? '').includes(TASK_GROUP_PANEL),
)

const AT_THE_HEAD: readonly string[] = T_109_ON_THE_PANEL.filter(namesHeadRule).map((one) => one.id)

const ON_A_TASK_GROUP: readonly string[] = T_109_ON_THE_PANEL.filter((one) => !namesHeadRule(one)).map((one) => one.id)

// Why: table T-109's authority column names the rule that owns each
// entrance, so a case names the rule and survives a renumbered icon roster.
function entranceFor(rule: string, among: readonly string[] = [...AT_THE_HEAD, ...ON_A_TASK_GROUP]): string {
  const found = T_109_ON_THE_PANEL.filter(
    (one) =>
      among.includes(one.id) && new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  const first = found[0]
  if (found.length !== 1 || first === undefined) {
    throw new Error(`表 T-109 gives ${rule} ${found.length} entrances on the panel, not one`)
  }
  return first.id
}

// Spec: HF-1
const HIDE = entranceFor('HF-3')
const OPEN_ONE_LEVEL = entranceFor('HF-13')
const FOLD_BELOW = entranceFor('HF-11')
const OPEN_ALL_BELOW = entranceFor('HF-2')

const HEAD_OPEN_ONE_LEVEL = entranceFor('HF-16')
const HEAD_FOLD_EVERY_TASK_GROUP = entranceFor('HF-12')
const HEAD_OPEN_EVERY_TASK_GROUP = entranceFor('HF-10')
const HEAD_ADD_TASK_GROUP = entranceFor('HF-17')
// Spec: HF-20
const HEAD_DELETE_EVERY_TASK_GROUP = entranceFor('FR-032', AT_THE_HEAD)
const DELETE_THIS_TASK_GROUP = entranceFor('FR-032', ON_A_TASK_GROUP)

const ADD_CHILD_TASK_GROUP = entranceFor('HF-14')

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'
const GAMMA = '33333333-3333-4333-8333-333333333333'
const DELTA = '44444444-4444-4444-8444-444444444444'
const EPSILON = '55555555-5555-4555-8555-555555555555'
const ZETA = '66666666-6666-4666-8666-666666666666'
const ZETA_KID = '77777777-7777-4777-8777-777777777777'

// Why: four levels deep so HR-7's limit below the grandchildren is testable;
// Epsilon makes the direct children a set, Zeta gives a press an outside.
const TASK_GROUPS: readonly { readonly id: string; readonly parentId: string | null; readonly name: string }[] =
  [
    { id: ALPHA, parentId: null, name: 'Alpha' },
    { id: BETA, parentId: ALPHA, name: 'Beta' },
    { id: GAMMA, parentId: BETA, name: 'Gamma' },
    { id: DELTA, parentId: GAMMA, name: 'Delta' },
    { id: EPSILON, parentId: ALPHA, name: 'Epsilon' },
    { id: ZETA, parentId: null, name: 'Zeta' },
    { id: ZETA_KID, parentId: ZETA, name: 'ZetaKid' },
  ]

const EVERY_TASK_GROUP = TASK_GROUPS.map((one) => one.name)

const nameOf = (taskGroupId: string): string =>
  TASK_GROUPS.find((one) => one.id === taskGroupId)?.name ?? taskGroupId

interface Fixture {
  readonly folded?: readonly string[]
  readonly hidden?: readonly string[]
  // Why: OP-10 keeps the stored zoom 1, where FR-018 draws every depth.
  readonly atStoredZoom?: boolean
}

function documentWith(part: Fixture = {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const folded = new Set(part.folded ?? [])
  const hidden = new Set(part.hidden ?? [])
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
      tasks: TASK_GROUPS.map((_row, index) =>
        task(index + 1, '2026-04-01T00:00:00', '2026-04-10T00:00:00', `Task${index + 1}`),
      ),
      resources: [],
      assignments: [],
      taskGroups: TASK_GROUPS.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        name: one.name,
        derivedFromTaskUid: null,
        order: index,
        treeState: hidden.has(one.id) ? 'hidden' : folded.has(one.id) ? 'collapsed' : 'auto',
        editPermission: null,
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: TASK_GROUPS.map((one, index) => ({
        taskUid: index + 1,
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
      ...(part.atStoredZoom === true ? { scrollDate: '2026-04-01T00:00:00', scrollTaskGroupId: ALPHA } : {}),
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
}

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
  aim(entry: string, taskGroupId: string | null): void
  press(entry: string, taskGroupId: string | null): void
}

function stage(part: Fixture = {}): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, documentWith(part), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  const aim = (entry: string, taskGroupId: string | null): void => {
    screen.drawAt({
      part: TASK_GROUP_PANEL,
      entry: entry as any,
      format: null,
      taskGroupId: taskGroupId,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  }
  return {
    loop,
    screen,
    send,
    aim,
    press: (entry, taskGroupId) => {
      aim(entry, taskGroupId)
      // Why: IN-1 settles a pointer operation on release, so a press is down then up.
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
    },
  }
}

function drawnTaskGroups(built: Stage): readonly string[] {
  const panel = built.screen.last().taskGroupPanel
  return [...panel.pinnedTitles, ...panel.titles].map((one) => nameOf(one.taskGroupId))
}

function titleOf(built: Stage, taskGroupId: string): TaskGroupTitle {
  const panel = built.screen.last().taskGroupPanel
  const found = [...panel.pinnedTitles, ...panel.titles].find((one) => one.taskGroupId === taskGroupId)
  if (found === undefined) {
    throw new Error(`the panel drew no title for ${nameOf(taskGroupId)}: ${drawnTaskGroups(built).join(', ')}`)
  }
  return found
}

function storedTaskGroup(built: Stage, taskGroupId: string): TaskGroup {
  const found = (built.loop.document().schedule as any).taskGroups.find(
    (one: any) => one.id === taskGroupId,
  )
  if (found === undefined) throw new Error(`the document has no task group ${nameOf(taskGroupId)}`)
  return found as TaskGroup
}

// Spec: AT-153
const treeOf = (built: Stage, taskGroupId: string): TaskGroup['treeState'] =>
  storedTaskGroup(built, taskGroupId).treeState

const isFolded = (built: Stage, taskGroupId: string): boolean => treeOf(built, taskGroupId) === 'collapsed'

const isHiddenTaskGroup = (built: Stage, taskGroupId: string): boolean => treeOf(built, taskGroupId) === 'hidden'

const foldedCountOf = (built: Stage, taskGroupId: string): number =>
  ((titleOf(built, taskGroupId) as any).foldedTaskGroupCount as number | null | undefined) ?? 0

const noticeTexts = (built: Stage): readonly string[] =>
  built.screen.last().notices.map((one) => one.text)

// Why: FR-029 makes acting and telling a reason exclusive, so the absence of
// a telling shows the entrance was armed without naming a row of table T-233.
function actedRatherThanRefused(built: Stage, what: string): void {
  expect(noticeTexts(built), `${what} was answered with a reason instead of acting`).toEqual([])
}

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

const THEME: ScreenTheme = {
  preference: emptyScreenSession.screen.themePreference,
  hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')),
}

// Why: every control is armed so that no entrance is left undrawn for want
// of work.
const ONE_DRAWN_TASK_GROUP: TaskGroupTitle = {
  taskGroupId: 'TaskGroupAlpha',
  depth: 1,
  ...taskGroupNameFont(1),
  indentPx: SETTINGS_CONSTANTS['taskGroupTitleIndent'] as number,
  box: rect(0, 40, 220, 64),
  label: 'TaskGroupAlpha',
  wholeLabel: 'TaskGroupAlpha',
  isLabelTruncated: false,
  expander: { canOpen: true, canClose: true, canCloseBelow: true },
  isPinned: false,
  isSelected: false,
  canOpenOneLevel: true,
  canAddChildTaskGroup: true,
} as unknown as TaskGroupTitle

const PANEL_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  taskGroupPanel: {
    pinnedTitles: [],
    titles: [ONE_DRAWN_TASK_GROUP],
    canOpenEveryTaskGroup: true,
    canCloseEveryTaskGroup: true,
    canOpenLevelZero: true,
  },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  tooltips: [],
} as unknown as ScreenView

const iconsUnder = (node: FakeElement): readonly string[] =>
  selfAndDescendants(node)
    .map((one) => one.getAttribute('data-icon'))
    .filter((one): one is string => one !== null)
    .filter((one) => T_109_ON_THE_PANEL.some((row) => row.id === one))

// Spec: IMPS-1980, IMPS-1982, IMPS-1983, IMPS-1984, IMPS-1986, IMPS-1987, IMPS-1988, IMPS-1990
describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: a parse that lost a column would make every case below agree with
    // anything.
    expect(TASK_GROUP_PANEL).toBe('Task Group Panel')
    expect(TASK_GROUP_TITLE_TREE).toBe('Task Group Title Tree')
    expect(T_051_AT_THE_HEAD.slice().sort()).toEqual(['HF-10', 'HF-12', 'HF-16', 'HF-17', 'HF-20'])
    expect(new Set([HIDE, OPEN_ONE_LEVEL, FOLD_BELOW, OPEN_ALL_BELOW]).size).toBe(4)
    expect(
      new Set([
        HEAD_OPEN_ONE_LEVEL,
        HEAD_FOLD_EVERY_TASK_GROUP,
        HEAD_OPEN_EVERY_TASK_GROUP,
        HEAD_ADD_TASK_GROUP,
        HEAD_DELETE_EVERY_TASK_GROUP,
      ]).size,
    ).toBe(5)
    expect(HEAD_DELETE_EVERY_TASK_GROUP, 'the head delete is not the task group delete').not.toBe(DELETE_THIS_TASK_GROUP)
  })

  it('⛔ 表 T-015 still says what each of the four folding operations does', () => {
    // Why: pinned so a manuscript that went back on a sentence fails here, not in
    // a case asserting a rule nobody holds.
    expect(says('T-015', 'HR-3')).toContain(
      '子を全展開を押したとき、`GRS` は、選択した `TaskGroup` と配下のすべてから、折りたたみと格納を取り除くこと。',
    )
    expect(says('T-015', 'HR-3')).toContain('子を全展開を押したとき、`GRS` は、押したタスクグループ自身の折りたたみも解くこと（見本と同じ動作に揃える）。')
    expect(says('T-015', 'HR-4')).toContain('子を全折りたたみを押したとき、`GRS` は、選択した `TaskGroup` を折りたたむこと（見本と同じ動作に揃える）。')
    expect(says('T-015', 'HR-4')).toContain('子を全折りたたみを押したとき、`GRS` は、押したタスクグループ自身を親に格納しないこと。')
    expect(says('T-015', 'HR-7')).toContain('子を 1 階層展開を押したとき、`GRS` は、選択した `TaskGroup` の折りたたみだけを解くこと（見本と同じ動作に揃える）')
    expect(says('T-015', 'HR-7')).toContain('子を 1 階層展開を押したとき、`GRS` は、孫より下の折りたたみに触れないこと。')
    expect(says('T-015', 'HR-7')).toContain(
      '直下の子が `HR-6` で格納されているとき、子を 1 階層展開を押したとき、`GRS` は、直下の子の格納も解くこと。',
    )
    expect(says('T-015', 'HR-5')).toContain('`GRS` は、`HR-5` を `HR-4` と同じ操作として行うこと（見本と同じ動作に揃える）。')
    expect(says('T-051', 'HF-11')).toContain(
      '`GRS` は、`Collapse Below Button` で、表 T-015 の `HR-4` を行うこと（見本と同じ動作に揃える）。',
    )
    expect(says('T-051', 'HF-13')).toContain('`GRS` は、`Expand One Level Button` の職務を 表 T-015 の `HR-7` にすること（見本と同じ動作に揃える）。')
    expect(says('T-051', 'HF-2')).toContain('`GRS` は、`Expand Below Button` の職務を 表 T-015 の `HR-3` にすること。')
    expect(says('T-051', 'HF-3')).toContain('`GRS` は、`Retract Into Parent Button` の職務を 表 T-015 の `HR-6` にすること。')
  })

  it('⛔ the closing paragraphs still tie the family together', () => {
    expect(REQUIREMENTS).toContain(
      '`GRS` は、折りたたみの 4 つのボタンのどれでも、押したタスクグループそのものの状態を書き換えること（見本と同じ動作に揃える）。',
    )
    expect(REQUIREMENTS).toContain('`GRS` は、描かない向きへ働く値を、タスクグループ自身も描かない `hidden` と、タスクグループの配下を描かない `collapsed` の 2 つだけとすること（どちらも `_assets/fig-erd-detail.md` の `AT-153`）。')
    expect(REQUIREMENTS).toContain(
      '`GRS` は、段 0 に、`collapsed` に当たるものを `_assets/tbl-settings.md` の 表 T-203 の `S-418` に持たせること。`GRS` は、段 0 に、`hidden` に当たるものを持たせないこと。',
    )
    expect(REQUIREMENTS).toContain('`GRS` は、段 0 のために `TaskGroup` の列を足さないこと。')
    expect(REQUIREMENTS).toContain(
      '`GRS` は、タスクグループパネルの最上部の右寄せに、すべてのタスクグループを展開するボタンを 1 つ置くこと（表 T-015 の `HR-1`）。',
    )
    expect(REQUIREMENTS).toContain('`GRS` は、`Collapse Below Button` を `HF-3`（親に格納）と同じ働きにしないこと。')
    expect(REQUIREMENTS).toContain('`GRS` は、押したタスクグループの状態を書き換えずに、配下の状態だけを書き換えないこと。')
    expect(REQUIREMENTS).toContain('⭐ パネルの頭は段 0 であり、タスクグループではない（`HR-2`）。')
    // Spec: HF-20
    expect(REQUIREMENTS).toContain(
      '`GRS` は、頭が持つ入口を 5 つ、タスクグループが持つ入口を 7 つとすること。',
    )
    expect(REQUIREMENTS).toContain(
      '段 0 には格納する先の親が無いので格納できず（`HF-3`）、タスクグループでないので留められない（`FR-098`）。',
    )
    expect(REQUIREMENTS).toContain('`GRS` は、頭に、親に格納する入口とピン止めの入口を置かないこと。')
    expect(REQUIREMENTS).toContain(
      '`GRS` は、`HF-16` で `HF-13` を、`HF-12` で `HF-11` を、`HF-10` で `HF-2` を、`HF-17` で `HF-14` を、`HF-20` でタスクグループごとの削除（表 T-109 の `IC-82`）を、それぞれ段 0 に対して行うこと。',
    )
    expect(REQUIREMENTS).toContain(
      '`IMPS-1979` の操作で、描かれるタスクグループが 1 つも増減しないとき、`GRS` は、対象が 1 つも無いものとして扱うこと（数えるのは配下のタスクグループの数ではなく、操作の前後で描かれるタスクグループの差である）。',
    )
    expect(REQUIREMENTS).toContain(
      '数えるのは配下のタスクグループの数ではなく、操作の前後で描かれるタスクグループの差である',
    )
  })

  it('⛔ the one column that decides whether a task group is drawn is AT-153, and 段 0 holds S-418', () => {
    // Spec: FR-004, AT-153, S-418
    const detail = unbroken(readRepoFile(
      join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'),
      'utf8',
    ))
    expect(detail).toContain('| AT-153 | `TaskGroup` | `treeState` |')
    expect(REQUIREMENTS).toContain('描かない向きへ働く値を、タスクグループ自身も描かない `hidden` と、タスクグループの配下を描かない `collapsed` の 2 つだけとすること')
    expect(says('T-203', 'S-418')).toContain('`levelZeroTreeState`')
    expect(says('T-203', 'S-418')).toContain('段 0（タスクグループパネルの頭）の木の状態')
  })

  it('the document these cases drive is a valid GRS JSON document', () => {
    const report = validateDocument(documentWith())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('⭐ every task group of the fixture is drawn before anything is pressed', () => {
    // Why: otherwise a picture case could pass on a panel that never drew the
    // task group it says a press took away.
    expect(drawnTaskGroups(stage())).toEqual(EVERY_TASK_GROUP)
  })

  it('⭐ nothing is being told before anything is pressed', () => {
    expect(noticeTexts(stage())).toEqual([])
  })
})

// Why: the closing paragraph's MUST NOT is read as writing descendants
// instead of the pressed task group; HR-1a, HR-3 and HR-7 need the rest.
describe('表 T-051 の結び -- the press writes the pressed task group, not its children', () => {
  // Spec: IMPS-1972
  it('⛔ MUST: HF-11 folds the task group it was pressed on (HR-4, 指示 2026-08-31)', () => {
    const built = stage()

    built.press(FOLD_BELOW, BETA)

    expect(isFolded(built, BETA), 'HR-4 (MUST): the pressed task group was left open').toBe(true)
  })

  it('⛔ MUST NOT: HF-11 does not hide the task group it was pressed on (HR-4)', () => {
    // Why: hidden and collapsed both move the picture, so a fold that wrote the
    // wrong value would pass a case that only counted task groups.
    const built = stage()

    built.press(FOLD_BELOW, BETA)

    expect(isHiddenTaskGroup(built, BETA), 'HR-4 (MUST NOT): the fold hid the task group instead').toBe(false)
  })

  it('⛔ MUST: HF-3 hides the task group it was pressed on and NOT its children (HR-6)', () => {
    const built = stage()

    built.press(HIDE, BETA)

    expect(isHiddenTaskGroup(built, BETA), 'HR-6 (MUST): the pressed task group was not hidden').toBe(true)
    expect(isHiddenTaskGroup(built, GAMMA), 'the child was hidden as well as the task group').toBe(false)
    expect(isHiddenTaskGroup(built, DELTA), 'the grandchild was hidden as well as the task group').toBe(false)
    // Why: HR-6 folds the hidden task group too; T-328 holds that as the one value hidden, which the
    // parent's HF-13 turns into collapsed (oneLevelOpenPressed), so the task group comes back folded.
    built.press(OPEN_ONE_LEVEL, ALPHA)
    expect(treeOf(built, BETA), 'HR-6 (MUST): the hidden task group came back unfolded').toBe('collapsed')
  })

  it('⛔ MUST: HF-3 folds every task group under the task group it hid (HR-6)', () => {
    // Why: the fold is the way back: HR-7 opens no fold below the direct
    // children, so the hidden task group returns alone, not its whole subtree.
    const built = stage()

    built.press(HIDE, BETA)

    expect(isFolded(built, GAMMA), 'the task group beneath the hidden one was left open').toBe(true)
    expect(isFolded(built, DELTA), 'a task group two levels beneath was left open').toBe(true)
    expect(isHiddenTaskGroup(built, GAMMA), 'the hide wrote hidden below the task group it hid').toBe(false)
  })

  it('⛔ MUST: HF-13 unfolds the task group it was pressed on (HR-7)', () => {
    const built = stage({ folded: [ALPHA, BETA, GAMMA] })

    built.press(OPEN_ONE_LEVEL, ALPHA)

    expect(isFolded(built, ALPHA), 'HR-7 (MUST): the pressed task group is still folded').toBe(false)
  })

  it('⛔ MUST NOT: HF-13 does not touch the fold of anything below the direct children (HR-7)', () => {
    const built = stage({ folded: [ALPHA, BETA, GAMMA] })

    built.press(OPEN_ONE_LEVEL, ALPHA)

    expect(isFolded(built, GAMMA), 'HR-7 (MUST NOT): the grandchild was unfolded').toBe(true)
    // Why: the row unfolds one task group, the pressed one; unfolding the child
    // too would draw the grandchild and make one level two.
    expect(isFolded(built, BETA), 'HR-7: the direct child was unfolded too').toBe(true)
  })

  it('⛔ MUST: HF-2 unfolds the pressed task group ITSELF as well as everything below (HR-3, 指示 2026-08-31)', () => {
    const built = stage({ folded: [ALPHA, BETA, GAMMA, DELTA] })

    built.press(OPEN_ALL_BELOW, ALPHA)

    expect(isFolded(built, ALPHA), 'HR-3 (MUST): the pressed task group was left folded').toBe(false)
    expect(isFolded(built, BETA), 'HR-3 (MUST): a child was left folded').toBe(false)
    expect(isFolded(built, GAMMA), 'HR-3 (MUST): a grandchild was left folded').toBe(false)
    expect(isFolded(built, DELTA), 'HR-3 (MUST): a great-grandchild was left folded').toBe(false)
  })

  it('⛔ MUST NOT: HF-2 leaves task groups outside the pressed task group’s subtree alone (HR-3)', () => {
    const built = stage({ folded: [ALPHA, BETA, ZETA] })

    built.press(OPEN_ALL_BELOW, ALPHA)

    expect(isFolded(built, ZETA), 'HR-3: the press reached outside its own subtree').toBe(true)
  })

  it('⭐ MUST: a fold writes the state of the whole subtree, so no shape is remembered (HR-1a)', () => {
    // Why: writing the descendants as well as the pressed task group is allowed;
    // otherwise HR-1a, HR-3 and HR-7 could not be obeyed.
    const built = stage()

    built.press(FOLD_BELOW, ALPHA)

    expect(isFolded(built, ALPHA), 'HR-4: the pressed task group was left open').toBe(true)
    expect(isFolded(built, BETA), 'HR-1a (MUST): a descendant kept its open state').toBe(true)
    expect(isFolded(built, GAMMA), 'HR-1a (MUST): a descendant kept its open state').toBe(true)
    expect(isFolded(built, DELTA), 'HR-1a (MUST): a descendant kept its open state').toBe(true)
  })
})

describe('表 T-015 -- the picture each of the four controls leaves', () => {
  it('⭐ HF-11 on a middle task group takes its whole subtree off the picture and leaves the task group (HR-4)', () => {
    const built = stage()

    built.press(FOLD_BELOW, BETA)

    expect(drawnTaskGroups(built)).toEqual(['Alpha', 'Beta', 'Epsilon', 'Zeta', 'ZetaKid'])
  })

  it('⭐ HF-11 on the root leaves the root alone on its branch (HR-4)', () => {
    const built = stage()

    built.press(FOLD_BELOW, ALPHA)

    expect(drawnTaskGroups(built)).toEqual(['Alpha', 'Zeta', 'ZetaKid'])
  })

  it('⭐ HF-13 draws the DIRECT CHILDREN and nothing deeper (HR-7)', () => {
    const built = stage({ folded: [ALPHA, BETA, GAMMA, DELTA, EPSILON] })

    built.press(OPEN_ONE_LEVEL, ALPHA)

    expect(drawnTaskGroups(built)).toEqual(['Alpha', 'Beta', 'Epsilon', 'Zeta', 'ZetaKid'])
  })

  it('⭐ HF-2 draws the pressed task group’s whole subtree at once (HR-3)', () => {
    const built = stage({ folded: [ALPHA, BETA, GAMMA, DELTA, EPSILON], atStoredZoom: true })

    built.press(OPEN_ALL_BELOW, ALPHA)

    expect(drawnTaskGroups(built)).toEqual(EVERY_TASK_GROUP)
  })

  it('⭐ HF-3 takes the task group itself off the picture, and its subtree with it (HR-6)', () => {
    const built = stage()

    built.press(HIDE, BETA)

    expect(drawnTaskGroups(built)).toEqual(['Alpha', 'Epsilon', 'Zeta', 'ZetaKid'])
  })
})

describe('表 T-015 -- HR-3 and HR-4 are one pair on one task group', () => {
  it('⭐⭐ MUST: folding a task group and then opening it below restores the picture exactly', () => {
    const built = stage()
    const before = drawnTaskGroups(built)

    built.press(FOLD_BELOW, BETA)
    expect(drawnTaskGroups(built), 'the fold did not move the picture at all').not.toEqual(before)

    built.press(OPEN_ALL_BELOW, BETA)

    expect(drawnTaskGroups(built), 'HR-3 did not undo what HR-4 did on the same task group').toEqual(before)
  })

  it('⭐ and no task group of the document is left collapsed or hidden', () => {
    // Why: a matching picture with a value still set would come apart at the
    // next press, which reads treeState (AT-153).
    const built = stage()

    built.press(FOLD_BELOW, ALPHA)
    built.press(OPEN_ALL_BELOW, ALPHA)

    for (const row of TASK_GROUPS) {
      expect(isFolded(built, row.id), `${row.name} is still folded`).toBe(false)
      expect(isHiddenTaskGroup(built, row.id), `${row.name} is hidden`).toBe(false)
    }
  })

  // Spec: HR-5, HF-1
  it('⭐ HR-5 needs no entrance of its own: one press of HF-11 draws the same picture', () => {
    const built = stage()

    built.press(FOLD_BELOW, BETA)

    expect(drawnTaskGroups(built)).toContain('Beta')
    expect(drawnTaskGroups(built)).not.toContain('Gamma')
    expect(drawnTaskGroups(built)).not.toContain('Delta')
  })
})

describe('表 T-015 の HR-6 -- the two ways back from a hide, and their one difference', () => {
  it('⛔ the manuscript still names both doors and says the difference is only the range', () => {
    expect(says('T-015', 'HR-6')).toContain(
      '`GRS` は、格納したタスクグループを、親のタスクグループの `Expand One Level Button`（表 T-051 の `HF-13`）で戻せるようにすること。',
    )
    expect(says('T-015', 'HR-6')).toContain('`GRS` は、格納したタスクグループを、`Expand Below Button`（表 T-051 の `HF-2`）でも戻せるようにすること')
    expect(says('T-015', 'HR-6')).toContain('1 本は直下の子だけ、2 本は配下のすべて')
    expect(says('T-015', 'HR-6')).toContain(
      '`GRS` は、格納したタスクグループを戻すための専用の面やラベルを設けないこと。',
    )
  })

  it('⭐ MUST: the parent’s 1-階層 control brings a hidden child back (HR-6 through HF-13)', () => {
    const built = stage({ hidden: [BETA] })
    expect(drawnTaskGroups(built), 'the hidden task group was drawn to begin with').not.toContain('Beta')

    built.press(OPEN_ONE_LEVEL, ALPHA)

    expect(drawnTaskGroups(built), 'HR-6 (MUST): the hidden child did not come back').toContain('Beta')
    expect(isHiddenTaskGroup(built, BETA)).toBe(false)
  })

  it('⭐⭐ MUST: and it brings that task group ALONE, not its subtree (「1 本は直下の子だけ」)', () => {
    // Why: Beta is hidden and folded, so a one-level opener that also cleared
    // its fold would do HF-2's work at HF-13's entrance.
    const built = stage({ hidden: [BETA], folded: [BETA, GAMMA, DELTA] })

    built.press(OPEN_ONE_LEVEL, ALPHA)

    expect(drawnTaskGroups(built)).toEqual(['Alpha', 'Beta', 'Epsilon', 'Zeta', 'ZetaKid'])
  })

  it('⭐⭐ MUST: the parent’s 配下をすべて control brings the task group AND its subtree (HR-6 through HF-2)', () => {
    const built = stage({ hidden: [BETA], folded: [BETA, GAMMA, DELTA], atStoredZoom: true })

    built.press(OPEN_ALL_BELOW, ALPHA)

    expect(drawnTaskGroups(built)).toEqual(EVERY_TASK_GROUP)
  })

  it('⭐ MUST: a hidden task group anywhere below comes back too (「配下のどこにあろうとも」)', () => {
    const built = stage({ hidden: [DELTA], atStoredZoom: true })

    built.press(OPEN_ALL_BELOW, ALPHA)

    expect(isHiddenTaskGroup(built, DELTA), 'HR-3 (MUST): a hidden great-grandchild was left hidden').toBe(
      false,
    )
    expect(drawnTaskGroups(built)).toEqual(EVERY_TASK_GROUP)
  })

  it('⭐ the pairing itself: the same start, two ranges, two pictures', () => {
    // Why: without this the five above would all pass on a build that made the
    // two entrances one.
    const narrow = stage({ hidden: [BETA], folded: [BETA, GAMMA, DELTA], atStoredZoom: true })
    const wide = stage({ hidden: [BETA], folded: [BETA, GAMMA, DELTA], atStoredZoom: true })

    narrow.press(OPEN_ONE_LEVEL, ALPHA)
    wide.press(OPEN_ALL_BELOW, ALPHA)

    expect(drawnTaskGroups(narrow), 'the two entrances drew the same picture').not.toEqual(
      drawnTaskGroups(wide),
    )
    expect(drawnTaskGroups(wide).length).toBeGreaterThan(drawnTaskGroups(narrow).length)
  })
})

describe('表 T-051 の結び -- the head does at 段 0 what the paired control does on a task group', () => {
  it('⭐⭐ HF-12 is HF-11 at 段 0: pressing it can leave no task group drawn at all (HR-2)', () => {
    // Spec: HR-2, S-418, TD-1
    // Why: a task group's fold hides only its descendants, so only the head's own value S-418 can empty the panel.
    const built = stage()

    built.press(HEAD_FOLD_EVERY_TASK_GROUP, null)

    expect(drawnTaskGroups(built), 'HR-2 (MUST NOT): the shallowest level was kept').toEqual([])
    expect(
      built.loop.document().documentSettings.levelZeroTreeState,
      'HR-2: 段 0 was not folded in the document (S-418)',
    ).toBe('collapsed')
  })

  it('⭐⭐ HF-16 is HF-13 at 段 0: it brings the shallowest level back and nothing deeper', () => {
    const built = stage()

    built.press(HEAD_FOLD_EVERY_TASK_GROUP, null)
    built.press(HEAD_OPEN_ONE_LEVEL, null)

    expect(drawnTaskGroups(built), 'HF-16 opened more or less than one level').toEqual(['Alpha', 'Zeta'])
  })

  // Spec: HR-6, HF-16, FR-085
  it('⭐⭐ HF-16 also brings back a hidden TOP-LEVEL task group, as HF-13 does for a child (HR-6)', () => {
    const built = stage({ hidden: [ZETA] })
    expect(drawnTaskGroups(built)).not.toContain('Zeta')

    built.press(HEAD_OPEN_ONE_LEVEL, null)

    expect(drawnTaskGroups(built), 'HR-6 (MUST): the hidden top-level task group had no way back').toContain(
      'Zeta',
    )
  })

  it('⭐⭐ HF-10 is HF-2 at 段 0: it opens every level at once (HR-1)', () => {
    const built = stage()

    built.press(HEAD_FOLD_EVERY_TASK_GROUP, null)
    built.press(HEAD_OPEN_EVERY_TASK_GROUP, null)

    expect(drawnTaskGroups(built)).toEqual(EVERY_TASK_GROUP)
  })

  it('⭐⭐ HF-10 brings back what HF-3 hid, wherever it is (HR-1: HR-3 と同じく)', () => {
    const built = stage({ hidden: [ZETA, DELTA], folded: [ALPHA], atStoredZoom: true })

    built.press(HEAD_OPEN_EVERY_TASK_GROUP, null)

    expect(drawnTaskGroups(built)).toEqual(EVERY_TASK_GROUP)
  })

  it('⭐ the four head entrances are told apart: 1 階層 and すべて are not one control', () => {
    const oneLevel = stage()
    const everyTaskGroup = stage()

    oneLevel.press(HEAD_FOLD_EVERY_TASK_GROUP, null)
    oneLevel.press(HEAD_OPEN_ONE_LEVEL, null)
    everyTaskGroup.press(HEAD_FOLD_EVERY_TASK_GROUP, null)
    everyTaskGroup.press(HEAD_OPEN_EVERY_TASK_GROUP, null)

    expect(drawnTaskGroups(oneLevel), 'the head’s two openers answer alike').not.toEqual(
      drawnTaskGroups(everyTaskGroup),
    )
  })

  // Spec: HF-20
  it('⛔ MUST NOT: the head carries neither of the two a task group keeps to itself', () => {
    // Why: a press that names no task group can hide or pin nothing, so an
    // unmoved picture is all either entrance may leave.
    const taskGroupsBefore = drawnTaskGroups(stage())
    for (const rule of ['HF-3', 'FR-098']) {
      const built = stage()

      built.press(entranceFor(rule), null)

      expect(
        drawnTaskGroups(built),
        `the head answered ${rule}'s entrance and the picture moved`,
      ).toEqual(taskGroupsBefore)
      for (const row of TASK_GROUPS) {
        expect(isHiddenTaskGroup(built, row.id), `${rule} at the head hid ${row.name}`).toBe(false)
      }
    }
  })
})

// Spec: HF-20
describe('表 T-051 の結び -- the head has five entrances and a task group has seven', () => {
  it('⛔ the roster itself splits five and seven, and hide and pin stay on the task group', () => {
    expect(AT_THE_HEAD).toHaveLength(5)
    expect(ON_A_TASK_GROUP).toHaveLength(7)
    // Why: none of the seven is also at the head, so the split is the
    // manuscript's reason and not a coincidence of two counts.
    expect(ON_A_TASK_GROUP.filter((one) => !AT_THE_HEAD.includes(one))).toHaveLength(7)
    for (const rule of ['HF-3', 'FR-098']) {
      expect(ON_A_TASK_GROUP, `${rule}'s entrance left the task group`).toContain(entranceFor(rule))
      expect(AT_THE_HEAD, `${rule}'s entrance appeared at the head`).not.toContain(
        entranceFor(rule),
      )
    }
  })

  it('⛔ MUST: the panel draws seven entrances on a task group and five at its head', () => {
    // Why: nothing in ScreenView enumerates a task group's entrances, so this
    // one case is driven through the DOM surface.
    const built = wire(THEME, { 'App Header': 37 })
    domSurfaceOf(built).showScreenView(PANEL_VIEW)

    const tree = oneByRole(built.root(), TASK_GROUP_TITLE_TREE)
    const row = tree.children[0]
    if (row === undefined) throw new Error(`the tree drew no task group: ${whatWasDrawn(tree)}`)

    const onTheTaskGroup = new Set(iconsUnder(row))
    const inTheTree = new Set(iconsUnder(tree))
    const atTheHead = new Set(iconsUnder(built.root()).filter((one) => !inTheTree.has(one)))

    expect(
      [...onTheTaskGroup].sort(),
      `the task group drew ${onTheTaskGroup.size} of 表 T-109's entrances: ${whatWasDrawn(row)}`,
    ).toEqual([...ON_A_TASK_GROUP].sort())
    expect(
      [...atTheHead].sort(),
      `the head drew ${atTheHead.size} of 表 T-109's entrances`,
    ).toEqual([...AT_THE_HEAD].sort())
  })
})

describe('FR-029 -- the arming of every entrance the panel carries', () => {
  it('⛔ the manuscript still gives each of them its own condition', () => {
    expect(says('T-051', 'HF-2')).toContain(
      '`GRS` は、`Expand Below Button` を、押しても何も変わらないときだけ `FR-029` に従って薄く描くこと。',
    )
    expect(says('T-051', 'HF-2')).toContain(
      '`GRS` は、押したタスクグループの配下に `FR-018` の 表 T-329 で描かれていないタスクグループが 1 つでもあるとき、`Expand Below Button` の押しが何かを変えると判ずること',
    )
    expect(says('T-051', 'HF-10')).toContain(
      '`GRS` は、描かれていないタスクグループ（`FR-018` の 表 T-329）が 1 つも無いときだけ、`HF-10` のボタンを `FR-029` に従って薄く描くこと。',
    )
    expect(says('T-051', 'HF-3')).toContain(
      '描かれているタスクグループはいつでも親に格納できるので、本ボタンを薄く描く場面は無い',
    )
    expect(says('T-051', 'HF-13')).toContain(
      '展開できる直下の子が 1 つも無いとき、`GRS` は、`Expand One Level Button` を `FR-029` に従って薄く描くこと。',
    )
    expect(says('T-051', 'HF-16')).toContain(
      '展開できる段が無いとき、`GRS` は、`HF-16` のボタンを `FR-029` に従って薄く描くこと。',
    )
    expect(REQUIREMENTS).toContain(
      '`GRS` は、押してもいま文書にも画面にも何も変えられない入口を薄く描くこと',
    )
  })

  it('⛔ MUST: HF-3 is never faint on a drawn task group (「薄く描く場面は無い」)', () => {
    // Why: a drawn task group can always be hidden, so HF-3 has no spent state;
    // it is read through canClose, the panel's own statement of it.
    for (const fixture of [{}, { folded: [ALPHA] }, { folded: [BETA, GAMMA, DELTA] }]) {
      const built = stage(fixture)
      for (const name of drawnTaskGroups(built)) {
        const row = TASK_GROUPS.find((one) => one.name === name)
        if (row === undefined) continue
        expect(
          (titleOf(built, row.id).expander as any).canClose,
          `HF-3 was drawn faint on the drawn task group ${name}`,
        ).toBe(true)
      }
    }
  })

  it('⛔ MUST: HF-2 is armed exactly when some task group below it is not drawn', () => {
    // Spec: HF-2, RS-28, T-329
    const open = stage()
    expect(
      (titleOf(open, ALPHA).expander as any).canOpen,
      'nothing is folded under Alpha and its opener is armed',
    ).toBe(false)

    const held = stage({ folded: [BETA] })
    expect(
      (titleOf(held, ALPHA).expander as any).canOpen,
      'Beta is folded under Alpha and Alpha’s opener is faint',
    ).toBe(true)
  })

  it('⛔ MUST: HF-11 is faint on a task group whose press would move no task group (表 T-051 の結び)', () => {
    const built = stage()

    expect(
      (titleOf(built, DELTA).expander as any).canCloseBelow,
      'a leaf’s fold is armed although the picture cannot move',
    ).toBe(false)
    expect(
      (titleOf(built, GAMMA).expander as any).canCloseBelow,
      'a task group with a drawn child has its fold drawn faint',
    ).toBe(true)
  })

  it('⛔ MUST: HF-13 is faint when there is no direct child to open, and armed when there is', () => {
    const open = stage()
    expect(
      (titleOf(open, ALPHA) as any).canOpenOneLevel ?? false,
      'nothing is folded or hidden under Alpha and its one-level opener is armed',
    ).toBe(false)

    const folded = stage({ folded: [ALPHA] })
    expect(
      (titleOf(folded, ALPHA) as any).canOpenOneLevel,
      'Alpha is folded and its one-level opener is faint',
    ).toBe(true)

    const hiding = stage({ hidden: [BETA] })
    expect(
      (titleOf(hiding, ALPHA) as any).canOpenOneLevel,
      'Alpha’s child is hidden and its one-level opener is faint -- HR-6 has no way back',
    ).toBe(true)
  })

  it('⛔ MUST: HF-16 is faint with no level to open, and armed once 段 0 is folded', () => {
    const open = stage()
    expect(
      (open.screen.last().taskGroupPanel as any).canOpenLevelZero ?? false,
      'nothing is folded at 段 0 and the head’s one-level opener is armed',
    ).toBe(false)

    const built = stage()
    built.press(HEAD_FOLD_EVERY_TASK_GROUP, null)

    expect(
      (built.screen.last().taskGroupPanel as any).canOpenLevelZero,
      'HR-2 (MUST): 段 0 is folded and the way back is drawn faint',
    ).toBe(true)
  })

  it('⛔ MUST: the head’s すべて展開する and すべて折りたたむ follow the same rule (RS-31 / RS-32)', () => {
    // Spec: HF-10, HF-12, RS-31, RS-32, S-418
    // Why: head open is armed iff some task group is not drawn; head fold iff S-418 is still auto.
    const open = stage()
    expect(
      (open.screen.last().taskGroupPanel as any).canOpenEveryTaskGroup ?? false,
      'no task group is folded and the head’s opener is armed',
    ).toBe(false)
    expect(
      (open.screen.last().taskGroupPanel as any).canCloseEveryTaskGroup,
      'every task group is open and the head’s fold is faint',
    ).toBe(true)

    const folded = stage({ folded: [BETA] })
    expect(
      (folded.screen.last().taskGroupPanel as any).canOpenEveryTaskGroup,
      'a task group is folded and the head’s opener is faint',
    ).toBe(true)

    const headFolded = stage()
    headFolded.press(HEAD_FOLD_EVERY_TASK_GROUP, null)
    expect(
      (headFolded.screen.last().taskGroupPanel as any).canCloseEveryTaskGroup ?? false,
      'RS-32: 段 0 is already collapsed and the head’s fold is armed',
    ).toBe(false)
    expect(
      (headFolded.screen.last().taskGroupPanel as any).canOpenEveryTaskGroup,
      'RS-31: no task group is drawn and the head’s opener is faint',
    ).toBe(true)
  })

  it('⭐ MUST: a press on an armed entrance acts instead of telling a reason (FR-029)', () => {
    // Why: arming cases could pass on a build that drew the flag yet answered
    // with a reason; the HF-17/HF-14 pairing is held only this far here.
    const folded = stage({ folded: [BETA] })
    folded.press(OPEN_ALL_BELOW, ALPHA)
    actedRatherThanRefused(folded, 'HF-2 on a task group holding a folded child')

    const hiding = stage()
    hiding.press(HIDE, BETA)
    actedRatherThanRefused(hiding, 'HF-3 on a drawn task group')

    const adding = stage()
    adding.press(ADD_CHILD_TASK_GROUP, ALPHA)
    actedRatherThanRefused(adding, 'HF-14 on a task group')

    const addingAtLevelZero = stage()
    addingAtLevelZero.press(HEAD_ADD_TASK_GROUP, null)
    actedRatherThanRefused(addingAtLevelZero, 'HF-17 at 段 0')
  })
})

describe('表 T-051 の HF-18 -- the number a task group shows is the number that arms its opener', () => {
  it('⛔ the manuscript ties the count to the arming only where no zoom takes part', () => {
    expect(says('T-051', 'HF-18')).toContain(
      '配下に折りたたみ込んでいるタスクグループがあるとき、`GRS` は、折りたたみ込んでいるタスクグループの数をタスクグループに示すこと。',
    )
    expect(says('T-051', 'HF-18')).toContain(
      '`GRS` は、数えるのを人が折りたたんだ分だけとすること。`GRS` は、表示量（`FR-018`）が落としたタスクグループを数えないこと。',
    )
    expect(says('T-051', 'HF-2')).toContain('構えの条件は `HF-18` の数と同じではない')
    expect(says('T-051', 'HF-2')).toContain(
      '`HF-18` は人が折りたたんだ分だけを数え、倍率が落としたタスクグループを数えない',
    )
  })

  it('⛔ MUST: a task group holding nothing shows no count, and one holding task groups shows one', () => {
    const open = stage()
    expect(foldedCountOf(open, ALPHA), 'a task group holding nothing folded still shows a number').toBe(0)

    const held = stage({ folded: [BETA] })
    expect(foldedCountOf(held, ALPHA), 'HF-18 (MUST): the held task groups were not counted').toBeGreaterThan(
      0,
    )
  })

  it('⛔ MUST: with every task group drawn by the zoom, the number shown and the arming of HF-2 agree', () => {
    // Why: the count and the arming differ only through the zoom, so at the
    // stored zoom they agree; several shapes are walked so a split shows.
    const shapes: readonly Fixture[] = [
      {},
      { folded: [BETA] },
      { folded: [GAMMA] },
      { folded: [ALPHA] },
      { hidden: [BETA] },
      { hidden: [DELTA] },
      { folded: [BETA, ZETA] },
    ]
    const apart: string[] = []
    for (const shape of shapes) {
      const built = stage({ ...shape, atStoredZoom: true })
      for (const name of drawnTaskGroups(built)) {
        const row = TASK_GROUPS.find((one) => one.name === name)
        if (row === undefined) continue
        const armed = (titleOf(built, row.id).expander as any).canOpen === true
        if (armed !== foldedCountOf(built, row.id) > 0) {
          apart.push(
            `${JSON.stringify(shape)} ${name}: canOpen=${String(armed)} count=${String(
              foldedCountOf(built, row.id),
            )}`,
          )
        }
      }
    }
    expect(apart, 'HF-2 (MUST): the count and the arming came apart').toEqual([])
  })

  it('⛔ MUST: the number is the task groups that come back when that task group’s HF-2 is pressed', () => {
    // Why: the count is the difference in drawn task groups, so it is measured
    // by pressing the control and counting the task groups that arrived.
    const wrong: string[] = []
    const shapes: readonly Fixture[] = [
      { folded: [BETA] },
      { folded: [GAMMA] },
      { folded: [BETA, GAMMA] },
      { hidden: [BETA] },
      { hidden: [DELTA] },
    ]
    for (const shape of shapes) {
      for (const row of TASK_GROUPS) {
        const built = stage({ ...shape, atStoredZoom: true })
        if (!drawnTaskGroups(built).includes(row.name)) continue
        const shown = foldedCountOf(built, row.id)
        const before = drawnTaskGroups(built).length
        built.press(OPEN_ALL_BELOW, row.id)
        const arrived = drawnTaskGroups(built).length - before
        if (shown !== arrived) {
          wrong.push(
            `${JSON.stringify(shape)} ${row.name}: showed ${String(shown)}, ${String(
              arrived,
            )} task groups arrived`,
          )
        }
      }
    }
    expect(wrong, 'HF-18 / HF-2 (MUST): the number shown is not the number that came back').toEqual(
      [],
    )
  })
})
