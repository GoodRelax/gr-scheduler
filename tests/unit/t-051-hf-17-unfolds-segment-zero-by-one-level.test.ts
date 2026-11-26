// Unit tests: adding a task group at level 0 unfolds a folded level 0 by one level only.

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

/* eslint-disable @typescript-eslint/no-explicit-any -- the host stubs an untyped global and the panel reads fields the types close */

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const HF_17_OPENS_ONE_LEVEL =
  '`HF-17` でタスクグループを足すとき、段 0 が折りたたまれていれば（`_assets/tbl-settings.md` の `S-418`）、`GRS` は、段 0 を 1 階層だけ展開すること。`HF-17` でタスクグループを足すとき、`GRS` は、段 0 をすべて展開しないこと。'

const HR_2_FOLDS_LEVEL_ZERO_TOO = '全折りたたみを押したとき、`GRS` は、最も浅い段のタスクグループも折りたたむこと。'

// Spec: HF-17, HR-2
describe('the manuscript this file is driven by', () => {
  it('still asks HF-17 to open exactly one level, never every fold', () => {
    expect(REQUIREMENTS).toContain(HF_17_OPENS_ONE_LEVEL)
  })

  it('still lets HR-2 (全折りたたみ) fold 段 0 itself, which is the premise these cases fold with', () => {
    expect(REQUIREMENTS).toContain(HR_2_FOLDS_LEVEL_ZERO_TOO)
  })
})

const TASK_GROUP_PANEL = bare(
  specTable('T-103').rows.find((one) => one.id === 'U-22')?.by['確定名（英）'] ?? '',
)

const T_109_ON_THE_PANEL = specTable('T-109').rows.filter(
  (one) => bareAll(one.by['面'] ?? '').includes(TASK_GROUP_PANEL),
)

function entranceFor(rule: string): string {
  const found = T_109_ON_THE_PANEL.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  const first = found[0]
  if (found.length !== 1 || first === undefined) {
    throw new Error(`表 T-109 gives ${rule} ${found.length} entrances on the panel, not one`)
  }
  return first.id
}

const HEAD_FOLD_EVERY_TASK_GROUP = entranceFor('HF-12')
const HEAD_ADD_TASK_GROUP = entranceFor('HF-17')

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'
const GAMMA = '33333333-3333-4333-8333-333333333333'
const ZETA = '44444444-4444-4444-8444-444444444444'

// Why: two roots, one of them a grandparent, so a fold at level 0 hides everything
// and a one-level reopen brings back the roots only.
const TASK_GROUPS: readonly { readonly id: string; readonly parentId: string | null; readonly name: string }[] = [
  { id: ALPHA, parentId: null, name: 'Alpha' },
  { id: BETA, parentId: ALPHA, name: 'Beta' },
  { id: GAMMA, parentId: BETA, name: 'Gamma' },
  { id: ZETA, parentId: null, name: 'Zeta' },
]

const nameOf = (taskGroupId: string): string => TASK_GROUPS.find((one) => one.id === taskGroupId)?.name ?? taskGroupId

function task(uid: number, name: string): Task {
  return {
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name,
    start: '2026-04-01',
    finish: '2026-04-10',
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
  } as unknown as Task
}

function documentWith(): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100 },
      calendars: structuredClone(template.schedule.calendars),
      tasks: TASK_GROUPS.map((_row, index) => task(index + 1, `Task${index + 1}`)),
      resources: [],
      assignments: [],
      taskGroups: TASK_GROUPS.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        name: one.name,
        derivedFromTaskUid: null,
        order: index,
        treeState: 'auto',
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
    documentSettings: structuredClone(template.documentSettings),
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

function host(): { readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }; runAnimationFrames(): void } {
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
  press(entry: string, taskGroupId: string | null): void
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, documentWith(), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  return {
    loop,
    screen,
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
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      screen.drawAt(null)
    },
  }
}

function drawnTaskGroups(built: Stage): readonly string[] {
  const panel = built.screen.last().taskGroupPanel
  return [...panel.pinnedTitles, ...panel.titles].map((one) => nameOf(one.taskGroupId))
}

const canOpenLevelZero = (built: Stage): boolean | undefined =>
  (built.screen.last().taskGroupPanel as any).canOpenLevelZero

const levelZeroOf = (built: Stage): string =>
  built.loop.document().documentSettings.levelZeroTreeState

// Spec: HR-2, S-418
describe('premise -- HEAD_FOLD_EVERY_TASK_GROUP (HR-2) folds 段 0 itself', () => {
  it('before folding, every task group is drawn', () => {
    const built = stage()
    expect(drawnTaskGroups(built)).toEqual(['Alpha', 'Beta', 'Gamma', 'Zeta'])
  })

  it('⭐⭐ after HEAD_FOLD_EVERY_TASK_GROUP, 段 0 is folded and nothing is drawn (HR-2, MUST)', () => {
    const built = stage()

    built.press(HEAD_FOLD_EVERY_TASK_GROUP, null)

    expect(
      drawnTaskGroups(built),
      'HR-2 (MUST): 最も浅い段のタスクグループも折りたたむこと -- the roots should have gone with everything else',
    ).toEqual([])
    expect(canOpenLevelZero(built), 'HF-16 should now be armed to open the fold this made').toBe(
      true,
    )
    expect(levelZeroOf(built), 'HR-2: S-418 should now hold the fold').toBe('collapsed')
  })
})

// Spec: HF-17, HF-16, S-418
describe('HF-17 (MUST) -- adding a task group at 段 0 opens the fold by exactly one level', () => {
  it('⭐⭐ the roots reappear, the new task group among them, once 段 0 is folded and HF-17 is pressed', () => {
    const built = stage()
    built.press(HEAD_FOLD_EVERY_TASK_GROUP, null)
    expect(drawnTaskGroups(built)).toEqual([])

    built.press(HEAD_ADD_TASK_GROUP, null)

    const after = drawnTaskGroups(built)
    expect(
      after,
      'HF-17 (MUST): 段 0 が折りたたまれていれば 1 階層だけ展開すること -- pressing the ' +
        'entrance at 段 0 while it stood folded left nothing visible, including the task group it just made',
    ).not.toEqual([])
    expect(after, 'Alpha and Zeta are both 段 0’s own children -- both come back').toEqual(
      expect.arrayContaining(['Alpha', 'Zeta']),
    )
    expect(after.length, 'exactly one task group was added to the two roots').toBe(3)
  })

  it('⛔⛔ MUST NOT: Beta and Gamma stay folded away -- only 段 0 opened, not everything (not HF-10’s shape)', () => {
    // Why: HF-12 also folded Alpha by its own treeState, which HF-17 leaves alone,
    // so Beta (Alpha's child) staying hidden tells one level from every level.
    const built = stage()
    built.press(HEAD_FOLD_EVERY_TASK_GROUP, null)

    built.press(HEAD_ADD_TASK_GROUP, null)

    const after = drawnTaskGroups(built)
    expect(
      after,
      'HF-17 (MUST NOT): すべて展開してはならない -- Beta reappeared, which is HF-10’s ' +
        'shape and not the one level this row allows',
    ).not.toContain('Beta')
    expect(after).not.toContain('Gamma')
  })

  it('⭐ S-418 itself is cleared: HF-16 is no longer armed once HF-17 opened it', () => {
    const built = stage()
    built.press(HEAD_FOLD_EVERY_TASK_GROUP, null)
    expect(canOpenLevelZero(built)).toBe(true)

    built.press(HEAD_ADD_TASK_GROUP, null)

    expect(
      canOpenLevelZero(built),
      'S-418 should have come off the fold HF-17 just opened, so HF-16 has nothing left to do',
    ).not.toBe(true)
    expect(levelZeroOf(built), 'HF-17 (MUST): S-418 still holds the fold').toBe('auto')
  })

  it('control: pressing HF-17 while 段 0 is NOT folded changes nothing about the fold', () => {
    const built = stage()
    expect(canOpenLevelZero(built)).not.toBe(true)
    expect(levelZeroOf(built)).toBe('auto')

    built.press(HEAD_ADD_TASK_GROUP, null)

    const after = drawnTaskGroups(built)
    expect(after).toEqual(expect.arrayContaining(['Alpha', 'Beta', 'Gamma', 'Zeta']))
    expect(after.length).toBe(5)
    expect(levelZeroOf(built)).toBe('auto')
  })
})
