// Contract tests: Esc puts a standing explanation away as the last rung before full screen.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  escapeTarget,
  type EscapeContext,
  type EscapeTarget,
} from '../../src/entity/document-model/screen-state/screen-state'
import type {
  CommandItem,
  IconId,
  ScreenView,
  ScreenViewReadings,
  Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  commandFromInput,
  selectionFromInput,
  type InputContext,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type {
  KeyInput,
  PointerInput,
} from '../../src/adapter/input-command-translator/input-source'
import {
  emptySelection,
  selectionWith,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import { specTable, unbroken } from './spec-table'

// Spec: IN-3, IN-4, IN-4a

// Why: the clauses are quoted to the character, so a re-wording of the
// manuscript takes this file red instead of leaving it holding a dead rule.
const IN_3_THE_TWO =
  '表 T-269 が画像で定める形は、本ツールが描いて宿主へ渡す | FR-040 |\n| IN-3 | ツールチップは、次の 2 つをすべて満たすこと（MUST）'

const IN_3_UNTIL_THE_TRIGGER_GOES =
  '手立てがあること。**引き金が外れるまで出ていること** —— ポインタまたはフォーカスがその対象から外れるか、人が消すか、その内容が有効でなくなるまで、消してはならない（MUST NOT）'

const IN_4_THE_LADDER =
  'ればブラウザへ渡すこと。消費する階層は 出ている通知 → 確定していないその場の編集 → 開いている面 → 進行中のドラッグ・引きかけの矢印 → 開いているウィンドウ → プロパティパネル → 構え → 選択 → `Dual Cursor` モード → 出ている説明 → 全画面表示 の順とすること（MUST）'

const IN_4_SELECTION_NOT_ABOVE_THE_ARM =
  '**構えより前に置いてはならない（MUST NOT）** —— **構えたまま何かを選んでいるとき、構えを解除する手立てが `Esc` から消える。**'

const IN_4_NO_PANEL_CONDITION =
  '**「パネルが出ていないとき」という条件は置かない**'

// Why: anchored on the row itself, not on what precedes it: the preceding
// cell (FR-031) was rewritten once and broke the anchor.
const IN_4A_TO_THE_BROWSER =
  '\n| IN-4a | **消費する対象が 1 つも無いときは、必ずブラウザへ渡すこと（MUST）**'

const IN_3_CAN_BE_PUT_AWAY = '**消せること** —— ポインタもフォーカスも動かさずに消す手立てがあること'

const IN_4_WHY_LAST =
  '説明を全画面表示の前に置くのは、`IN-3` が求める「消せること」を果たす手立てがほかに 1 つも無いからである'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const LADDER_AS_PRINTED = [
  '出ている通知',
  '確定していないその場の編集',
  '開いている面',
  '進行中のドラッグ・引きかけの矢印',
  '開いているウィンドウ',
  '構え',
  '選択',
  '`Dual Cursor` モード',
  '出ている説明',
  '全画面表示',
] as const

// Why: escapeTarget picks the rung and tooltipsFromScreenView answers the
// explanation; one without the other let a rung exist that nothing spent.

// Why: every optional member is left out on purpose: absence reads as not
// standing, which is the state IN-4a speaks about.
const QUIET: EscapeContext = {
  isTextEntryUnsettled: false,
  isSurfaceOpen: false,
  gestureInFlight: false,
  isArmed: false,
  dualCursorMode: false,
}

const contextOf = (part: Partial<EscapeContext> = {}): EscapeContext => ({ ...QUIET, ...part })

const ONLY_A_TOOLTIP = contextOf({ isTooltipStanding: true })

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf()

// Spec: EZ-2, FR-092
const WAIT_MS = SETTINGS_CONSTANTS.iconHintDelayMs

const ICON: IconId = 'IC-7'

const commandOf = (icon: IconId): CommandItem => ({
  icon,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: `the name of ${icon}`,
})

// Why: no task is rested on in this file, so the schedule the tooltips read holds none.
const NO_TASKS = { tasks: [], resources: [], assignments: [], baselineTasks: [] } as unknown as Schedule

const VIEW: Omit<ScreenView, 'tooltips'> = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [commandOf(ICON)],
    language: 'ja',
  },
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
}

const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: 'ja', helpLanguage: 'ja' },
}

const rootWithTooltipDismissed = (dismissed: boolean): ScreenSession => ({
  ...ROOT,
  screen: { ...ROOT.screen, tooltipDisplayState: { kind: dismissed ? 'dismissed' : 'allowed' } },
})

const EMPTY_READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  selectedTaskGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  // Why: nothing here asks for the grip; a whole of zero is everything fits.
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const readingsOf = (part: Partial<ScreenViewReadings> = {}): ScreenViewReadings => ({
  ...EMPTY_READINGS,
  ...part,
})

const RESTING_ON_THE_ICON = readingsOf({
  pointer: { x: 5, y: 5 },
  pointerRestedMs: WAIT_MS + 1,
  // Why: EZ-2's icon wait counts from entering the icon.
  hintTargetDwellMs: WAIT_MS + 1,
  iconUnderPointer: ICON,
})

const shownFor = (readings: ScreenViewReadings, root: ScreenSession = ROOT): readonly Tooltip[] =>
  tooltipsFromScreenView(VIEW, SETTINGS, root, readings, NO_TASKS)

describe('DFC-307 -- the manuscript these cases are driven by', () => {
  it('still asks (MUST) that a standing explanation can be put away', () => {
    expect(REQUIREMENTS).toContain(IN_3_THE_TWO)
    expect(REQUIREMENTS).toContain(IN_3_CAN_BE_PUT_AWAY)
    expect(REQUIREMENTS).toContain(IN_3_UNTIL_THE_TRIGGER_GOES)
  })

  it('still puts 出ている説明 at the FOOT of the ladder, above 全画面表示 alone, and still says why', () => {
    expect(REQUIREMENTS).toContain(IN_4_THE_LADDER)
    expect(REQUIREMENTS).toContain(IN_4_WHY_LAST)
    // Why: the order is read out of the row, so a moved last rung takes this
    // red before any behavior case runs.
    const at = LADDER_AS_PRINTED.map((rung) => IN_4_THE_LADDER.indexOf(rung))
    expect(at.every((where) => where >= 0), IN_4_THE_LADDER).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual([...at])
    expect(LADDER_AS_PRINTED[LADDER_AS_PRINTED.length - 2]).toBe('出ている説明')
    expect(LADDER_AS_PRINTED[LADDER_AS_PRINTED.length - 1]).toBe('全画面表示')
    expect(IN_4_THE_LADDER).toContain('`Dual Cursor` モード → 出ている説明 → 全画面表示')
  })

  it('still puts 選択 between 構え and the Dual Cursor mode, and still forbids it above 構え', () => {
    expect(IN_4_THE_LADDER).toContain('構え → 選択 → `Dual Cursor` モード')
    expect(REQUIREMENTS).toContain(IN_4_SELECTION_NOT_ABOVE_THE_ARM)
    expect(REQUIREMENTS).toContain(IN_4_NO_PANEL_CONDITION)
  })

  it('still requires the press to reach the browser when there is nothing to spend', () => {
    expect(REQUIREMENTS).toContain(IN_4A_TO_THE_BROWSER)
  })

  it('still holds the three rows in table T-028', () => {
    const rows = specTable('T-028').rows.map((one) => one.id)
    expect(rows).toContain('IN-3')
    expect(rows).toContain('IN-4')
    expect(rows).toContain('IN-4a')
  })
})

describe('T-028 IN-4 (MUST) -- the standing explanation is the foot of the ladder', () => {
  it('answers tooltip when an explanation is the only thing standing', () => {
    expect(escapeTarget(ONLY_A_TOOLTIP)).toBe(
      'tooltip' satisfies EscapeTarget,
    )
  })

  it('is spent AFTER the Dual Cursor mode, which is the rung above it', () => {
    const both = contextOf({ dualCursorMode: true, isTooltipStanding: true })
    expect(escapeTarget(both)).toBe('dualCursorMode')
    expect(escapeTarget(contextOf({ isTooltipStanding: true }))).toBe(
      'tooltip',
    )
  })

  it('is spent after every rung the row prints above it, not only the nearest', () => {
    // Why: one press takes one rung; an explanation reached while something
    // above it stood would spend two things with one press.
    const standing: ReadonlyArray<{
      readonly rung: EscapeTarget
      readonly context: EscapeContext
    }> = [
      {
        rung: 'notice',
        context: contextOf({ isNoticeStanding: true, isTooltipStanding: true }),
      },
      {
        rung: 'textEntry',
        context: contextOf({ isTextEntryUnsettled: true, isTooltipStanding: true }),
      },
      {
        rung: 'surface',
        context: contextOf({ isSurfaceOpen: true, isTooltipStanding: true }),
      },
      {
        rung: 'gesture',
        context: contextOf({ gestureInFlight: true, isTooltipStanding: true }),
      },
      {
        rung: 'armed',
        context: contextOf({ isArmed: true, isTooltipStanding: true }),
      },
      {
        rung: 'selection',
        context: contextOf({ isSelectionStanding: true, isTooltipStanding: true }),
      },
      {
        rung: 'dualCursorMode',
        context: contextOf({ dualCursorMode: true, isTooltipStanding: true }),
      },
    ]
    for (const { rung, context } of standing) {
      expect(escapeTarget(context), rung).toBe(rung)
    }
  })
})

const NO_MODS = { ctrl: false, shift: false, alt: false, meta: false } as const

// Spec: SK-8
const ESCAPE_KEY = {
  kind: 'key',
  key: 'Esc',
  modifiers: NO_MODS,
} as unknown as KeyInput

const selectionWithOneTask = (): Selection => selectionWith(emptySelection(), { kind: 'task', uid: 7 })

// Why: a key input reads only the selection, the screen state and the
// escape questions, so the schedule here can be empty.
const contextWithSelection = (
  selection: Selection,
  part: Partial<InputContext> = {},
): InputContext =>
  ({
    document: { schedule: { tasks: [], commentBoxes: [], highlightBoxes: [] } },
    layout: { rows: [], pxPerDay: 0 },
    geometry: { items: [] },
    regions: {},
    screen: emptyScreenSession.screen,
    selection,
    zoomStep: 0.1,
    zoomMin: 0.2,
    zoomMax: 5,
    newCommentBoxId: 'a',
    newHighlightBoxId: 'b',
    pressed: null,
    isTextEntryUnsettled: false,
    dualCursorFollowing: null,
    ...part,
  }) as unknown as InputContext

describe('T-028 IN-4 (MUST, 利用者の裁定 2026-09-08) -- the selection is a rung', () => {
  it('answers selection when something is selected and nothing above it stands', () => {
    expect(escapeTarget(contextOf({ isSelectionStanding: true }))).toBe(
      'selection' satisfies EscapeTarget,
    )
  })

  it('leaves the arm reachable while something is selected (MUST NOT: 構えより前に置いてはならない)', () => {
    expect(escapeTarget(contextOf({ isSelectionStanding: true, isArmed: true }))).toBe('armed')
    // Why: the other way round makes the case above mean something: with
    // nothing armed, the same selection is what the press finds.
    expect(escapeTarget(contextOf({ isSelectionStanding: true }))).toBe(
      'selection',
    )
  })

  it('is spent before the Dual Cursor mode, which is the rung below it', () => {
    const both = contextOf({ isSelectionStanding: true, dualCursorMode: true })
    expect(escapeTarget(both)).toBe('selection')
  })

  it('lets the open panel take the press first, so one press never spends two rungs', () => {
    // Why: the panel's rung stands above the selection, so FR-072's rule to keep
    // the selection is held by the order, not by a second question.
    const withPanel = contextOf({ isSelectionStanding: true, isPropertiesPanelOpen: true })
    expect(escapeTarget(withPanel)).toBe('propertiesPanel')
    // Why: the selection must still be there for the next press; the defect
    // measured was a second press that found nothing and fell to IN-4a.
    expect(escapeTarget(contextOf({ isSelectionStanding: true }))).toBe(
      'selection',
    )
  })

  it('answers null when nothing is selected, so IN-4a still hands the key over', () => {
    expect(escapeTarget(contextOf({ isSelectionStanding: false }))).toBeNull()
    expect(escapeTarget(QUIET)).toBeNull()
  })

  it('and the rung is actually SPENT: the press that names it clears the selection', () => {
    // Why: without this the cases above prove only that a name was answered;
    // selectionFromInput answers the selection, so the rung is spent here.
    const held = selectionWithOneTask()
    expect(held.items.length, 'the control: something IS selected before the press').toBe(1)
    expect(selectionFromInput(ESCAPE_KEY, contextWithSelection(held)).items).toEqual([])
  })

  it('⛔ FR-072 (MUST NOT): the press that puts the panel away leaves the selection alone', () => {
    const held = selectionWithOneTask()
    const answered = selectionFromInput(
      ESCAPE_KEY,
      contextWithSelection(held, { isPropertiesPanelShowing: true }),
    )
    expect(answered).toBe(held)
  })

  it('a press with nothing selected changes nothing, so no write is invented', () => {
    const empty = emptySelection()
    expect(selectionFromInput(ESCAPE_KEY, contextWithSelection(empty))).toBe(empty)
  })
})

// Spec: MK-13, T-023d, T-266
const MK_13_THE_ACTUAL =
  '`GRS` は、実績（実績バー、および未着手のダミー）のダブルクリックの宛先を、タスクの項と同じにすること。'

const T_023D_MK_13_FIRST =
  '`GRS` は、ダブルクリックの宛先を、表 T-023d の優先順より先に表 T-023 の `MK-13` から読むこと。'
// Spec: IMPS-1522
const T_023D_NOT_BY_THE_ORDER =
  '`GRS` は、表 T-023d の順でダブルクリックの宛先を決めないこと。'

const THE_ACTUALS_ROWS = ['GA-3', 'GA-4', 'GA-16', 'GA-5', 'GA-6', 'GA-17'] as const

const THE_ACTUALS_GRABS = ['GA-3', 'GA-4', 'GA-16', 'GA-5', 'GA-6', 'GA-17'] as const

const THE_BODY_ROW = 'GA-9'

const THE_BODY = 'GA-9'

const pointerAt = (phase: PointerInput['phase'], clicks: number): PointerInput =>
  ({
    kind: 'pointer',
    phase,
    button: 'left',
    x: 100,
    y: 50,
    modifiers: NO_MODS,
    clickCount: clicks,
  }) as unknown as PointerInput

const hitOn = (grab: string): Hit =>
  ({ item: { kind: 'task', taskUid: 7 }, grab }) as unknown as Hit

// Spec: PTD-3
// Why: the empty schedule and zero-width day make every grab arm below MK-13
// find nothing, so no editInPlace answer means MK-13 was not reached.
const releaseOn = (grab: string, clicks: number): TranslatedInput => {
  const at = pointerAt('down', clicks)
  const context = {
    document: { schedule: { tasks: [], commentBoxes: [], highlightBoxes: [] } } as never,
    layout: { rows: [], pxPerDay: 0 } as never,
    geometry: { items: [] } as never,
    regions: {} as never,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    zoomStep: 0.1,
    zoomMin: 0.2,
    zoomMax: 5,
    newCommentBoxId: 'a',
    newHighlightBoxId: 'b',
    pressed: { at, hit: hitOn(grab), on: null },
    isTextEntryUnsettled: false,
    dualCursorFollowing: null,
  } as unknown as InputContext
  return commandFromInput(pointerAt('up', clicks), context)
}

const inPlaceKindOf = (answer: TranslatedInput): string | null => {
  const action = answer.action
  if (action === null || action.kind !== 'editInPlace') return null
  return action.target.kind
}

describe('T-023 MK-13 / table T-023d (MUST, 利用者の裁定 2026-09-08) -- the actual is part of the Task', () => {
  it('still sends the actual to the Task entry, and still reads MK-13 before the priority order', () => {
    expect(REQUIREMENTS).toContain(MK_13_THE_ACTUAL)
    expect(REQUIREMENTS).toContain(T_023D_MK_13_FIRST)
    expect(REQUIREMENTS).toContain(T_023D_NOT_BY_THE_ORDER)
    const rows = specTable('T-266').rows.map((row) => row.id)
    for (const row of THE_ACTUALS_ROWS) expect(rows, row).toContain(row)
    expect(rows).toContain(THE_BODY_ROW)
  })

  it('⛔ THE CONTROL: the body (GA-9) already reached the name field, so an empty answer means nothing', () => {
    expect(inPlaceKindOf(releaseOn(THE_BODY, 2))).toBe('taskName')
  })

  it('every region the actual is grabbed by opens the Task name field on a double click', () => {
    for (const grab of THE_ACTUALS_GRABS) {
      expect(inPlaceKindOf(releaseOn(grab, 2)), grab).toBe('taskName')
    }
  })

  it('⛔ the plain press is untouched: 「素の押下の順は 1 文字も変わらない」', () => {
    for (const grab of THE_ACTUALS_GRABS) {
      expect(inPlaceKindOf(releaseOn(grab, 1)), grab).toBe(null)
    }
  })
})

describe('T-028 IN-4a (MUST) -- a second Esc still reaches the browser', () => {
  it('answers null once the explanation is no longer standing', () => {
    // Why: the rung is a question, not a latch: once the explanation is away the
    // next frame answers false, and IN-4a hands the key to the browser.
    const first = escapeTarget(ONLY_A_TOOLTIP)
    expect(first).toBe('tooltip')
    const second = escapeTarget(contextOf({ isTooltipStanding: false }))
    expect(second, 'the second Esc was swallowed').toBeNull()
  })

  it('answers null when the caller cannot see explanations at all', () => {
    // Why: a rung that consumed on undefined would swallow every Esc in a build
    // whose Framework never raised the member.
    expect(escapeTarget(QUIET)).toBeNull()
  })
})

// Why: the words of an explanation are not compared; FR-038's dictionary
// holds them, so a text case here would measure the wrong member.
describe('T-028 IN-3 (MUST) -- a shown explanation goes away without moving anything', () => {
  it('is a live case: the same view and pointer DO raise an explanation', () => {
    // Why: the control: everything below asserts an empty answer, which a
    // broken renderer gives too.
    const shown = shownFor(RESTING_ON_THE_ICON)
    expect(shown.length, 'EZ-2 raised no explanation, so no case below holds anything').toBe(1)
    expect(shown[0]?.anchor).toEqual({ kind: 'icon', icon: ICON })
  })

  it('answers with nothing once the person has put it away', () => {
    expect(shownFor(RESTING_ON_THE_ICON, rootWithTooltipDismissed(true))).toEqual([])
  })

  it('puts it away WITHOUT the pointer or the focus moving', () => {
    // Why: the two readings differ in one member only, neither place nor rest:
    // a build that cleared only when the pointer left would fail IN-3.
    const standing = RESTING_ON_THE_ICON
    const away = RESTING_ON_THE_ICON
    expect(away.pointer).toEqual(standing.pointer)
    expect(away.pointerRestedMs).toBe(standing.pointerRestedMs)
    expect(away.hintTargetDwellMs).toBe(standing.hintTargetDwellMs)
    expect(away.iconUnderPointer).toBe(standing.iconUnderPointer)
    expect(shownFor(standing).length).toBe(1)
    expect(shownFor(away, rootWithTooltipDismissed(true))).toEqual([])
  })

  it('can be raised again after it was put away', () => {
    expect(shownFor(RESTING_ON_THE_ICON, rootWithTooltipDismissed(true))).toEqual([])
    expect(shownFor(RESTING_ON_THE_ICON, rootWithTooltipDismissed(false)).length).toBe(1)
  })

  it('the dismissal is one answer for whatever stands, not one per raiser', () => {
    // Why: IN-3 does not divide explanations and IN-4 gives them one rung, so
    // one member must silence FR-037's scrollbar hint as well as EZ-2's.
    const lanes: Omit<ScreenView, 'tooltips'> = {
      ...VIEW,
      frame: {
        isFullScreen: false,
        dividers: [],
        scrollbars: [
          {
            axis: 'vertical',
            track: { x: 100, y: 0, width: 10, height: 600 },
            thumb: { x: 100, y: 0, width: 10, height: 10 },
          },
        ],
      },
    }
    const onTheLane = readingsOf({ pointer: { x: 105, y: 300 }, pointerRestedMs: WAIT_MS * 10, hintTargetDwellMs: WAIT_MS * 10 })
    const standing = tooltipsFromScreenView(lanes, SETTINGS, ROOT, onTheLane, NO_TASKS)
    expect(standing.length, 'FR-037 raised no hint, so this case holds nothing').toBeGreaterThan(0)
    const away = tooltipsFromScreenView(lanes, SETTINGS, rootWithTooltipDismissed(true), onTheLane, NO_TASKS)
    expect(away).toEqual([])
  })
})

describe('T-028 IN-4 -- one press spends one rung', () => {
  it('with a surface open and an explanation standing, the surface goes first', () => {
    expect(escapeTarget(contextOf({ isTooltipStanding: true, isSurfaceOpen: true }))).toBe('surface')
    expect(escapeTarget(contextOf({ isTooltipStanding: true }))).toBe(
      'tooltip',
    )
  })
})
