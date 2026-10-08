// CR-609 (wave 3): through the shell, IC-17 pressed again while the settings are shown closes the panel and drops EN-4.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { PropertiesPanel, ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop, type FrameEnvironment } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-072
const FR_072_CLOSES_WHILE_SHOWN =
  '⭐ パネルが文書の設定を出しているあいだに、設定を出す入口をもう一度押したときは、プロパティパネルを閉じること（MUST）'
const FR_072_EITHER_WAY = '直前の選択物が在っても無くても同じとし、選択物へは戻さない'
const FR_072_SETTINGS_AFTER_A_CLOSE =
  '⭐ 文書の設定を出したままパネルを閉じたあとに、設定を出す入口を押したときは、設定を出すこと（MUST）'
const FR_072_NOT_THE_SELECTION_AFTER_A_CLOSE = '⛔ 閉じたあとの押しで、中身を直前の選択物へ切り替えてはならない（MUST NOT）'
const FR_072_THE_PRESSED_STATE = 'いま何を出しているかを、入口の押下状態で示すこと（MUST）。'
const FR_072_THE_PRESSED_LOOK = 'その押下状態の見せ方は `FR-029` の 表 T-237 の `EN-4` に従うこと（MUST）。'

describe('CR-609 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-072 (MUST) -- a second press while the settings are shown closes the panel', FR_072_CLOSES_WHILE_SHOWN],
    ['FR-072 -- with or without a selection shown before', FR_072_EITHER_WAY],
    ['FR-072 (MUST) -- after a close the entrance shows the settings', FR_072_SETTINGS_AFTER_A_CLOSE],
    ['FR-072 (MUST NOT) -- after a close, not the previous selection', FR_072_NOT_THE_SELECTION_AFTER_A_CLOSE],
    ['FR-072 (MUST) -- the pressed state says what is shown', FR_072_THE_PRESSED_STATE],
    ['FR-072 (MUST) -- the pressed look is EN-4', FR_072_THE_PRESSED_LOOK],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-109 gives FR-072 the IC-17 entrance on the App Header, and table T-237 row EN-4 is what the panel shows', () => {
    expect([IC_17, APP_HEADER]).toEqual(['IC-17', 'App Header'])
    const en4 = specTable('T-237').rows.find((one) => one.id === 'EN-4')
    expect(en4?.cells[0]).toBe('プロパティパネルがそれを出している')
    expect(bare(en4?.cells[2] ?? '')).toBe('FR-072')
  })
})

const settingsEntrance = (): string => {
  const row = specTable('T-109').rows.find((one) => bare(one.by['正'] ?? '') === 'FR-072')
  if (row === undefined) throw new Error('table T-109 names no entrance for FR-072')
  return row.id
}

// see T-109, FR-072
const IC_17 = settingsEntrance()
const APP_HEADER = bare(specTable('T-109').rows.find((one) => one.id === IC_17)?.by['面'] ?? '')

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const ROW_ID = '11111111-1111-4111-8111-111111111111'
const TASK_UID = 1

function oneTaskDocument(): Document {
  return {
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      ...structuredClone(TEMPLATE.schedule),
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: null },
      tasks: [
        {
          uid: TASK_UID, wbsParentUid: null, wbsOrder: 1, name: 'Held', start: '2026-04-06', finish: '2026-04-20',
          milestone: false, deadline: null, notes: null, calendarUid: null, actualStart: null, stop: null,
          actualFinish: null, resume: null, resumeValid: null, percentComplete: 0, fadeInDays: null,
          fadeOutDays: null, dependencies: [], carry: {}, carryElements: [],
        },
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        { id: ROW_ID, parentId: null, label: 'Alpha', derivedFromTaskUid: null, order: 0, treeState: 'auto', editGroup: null, color: null, minHeight: null },
      ],
      taskGroupMembers: [{ taskUid: TASK_UID, groupId: ROW_ID }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(TEMPLATE.documentSettings),
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerInput['phase'], x: number, y: number, clickCount = 1): PointerInput => ({
  kind: 'pointer', phase, button: 'left', x, y, modifiers: NO_MODIFIERS, clickCount,
})

const key = (which: string): KeyInput => ({ kind: 'key', key: which, modifiers: NO_MODIFIERS })

interface Bench {
  send(input: HumanInput): void
  // WHY: returns every description the surface was given during the press, so a case can say
  // that no frame showed the previous selection on the way to the settings.
  pressIc17(): readonly ScreenView[]
  openBySelectingTheTask(): void
  panel(): PropertiesPanel | null
  isIc17Pressed(): boolean | undefined
}

function bench(): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const views: ScreenView[] = []
  let aimed: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: () => aimed,
  }
  const loop = frameLoop(
    { showSvg: () => undefined } as unknown as Parameters<typeof frameLoop>[0],
    oneTaskDocument(),
    SCREEN,
    { surface, language: 'ja' },
  )
  drain()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  const view = (): ScreenView => {
    const last = views[views.length - 1]
    if (last === undefined) throw new Error('the surface was given no description')
    return last
  }
  return {
    send,
    pressIc17: () => {
      const from = views.length
      aimed = { part: APP_HEADER, entry: IC_17, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as unknown as ScreenPart
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      aimed = null
      return views.slice(from)
    },
    openBySelectingTheTask: () => {
      const values = loop.current()
      if (values === null) throw new Error('the loop has run no frame')
      const task = values.geometry.tasks.find((one) => one.taskUid === TASK_UID)
      if (task === undefined || task.plan === null || task.plan.form !== 'outline') throw new Error('the task bar is not drawn')
      const xs = task.plan.points.map((one) => one.x)
      const ys = task.plan.points.map((one) => one.y)
      const right = Math.max(...xs)
      const left = task.marker === null ? Math.min(...xs) : Math.max(Math.min(...xs), task.marker.centre.x + task.marker.radius)
      const at = { x: (left + right) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
      send(pointer('down', at.x, at.y, 2))
      send(pointer('up', at.x, at.y, 2))
      if (view().propertiesPanel === null) throw new Error('MK-13 did not put the panel up')
    },
    panel: () => view().propertiesPanel,
    isIc17Pressed: () => view().appHeaderItems.commands.find((one) => one.icon === IC_17)?.isPressed,
  }
}

function expectSettingsShown(built: Bench, what: string): void {
  expect(built.panel()?.showing, what).toBe('documentSettings')
  expect(built.isIc17Pressed(), `${FR_072_THE_PRESSED_STATE} -- EN-4 is up while the settings are shown`).toBe(true)
}

function expectClosedByTheSecondPress(built: Bench): void {
  built.pressIc17()
  expect(built.panel(), `${FR_072_CLOSES_WHILE_SHOWN} -- ${FR_072_EITHER_WAY}`).toBeNull()
  expect(built.isIc17Pressed(), `${FR_072_THE_PRESSED_STATE} -- EN-4 drops after the closing press`).toBe(false)
}

describe('CR-609 section 8 wave 3 -- IC-17 pressed again while the settings are shown closes the panel', () => {
  it('(a) a Task shown by MK-13 just before: IC-17 shows the settings, IC-17 again closes the panel', () => {
    const built = bench()
    built.openBySelectingTheTask()
    expect(built.panel()?.showing, 'premise: MK-13 shows the Task').toBe('selection')
    built.pressIc17()
    expectSettingsShown(built, 'premise: IC-17 shows the settings')
    expectClosedByTheSecondPress(built)
  })

  it('(b) nothing shown or selected before: IC-17 shows the settings, IC-17 again closes the panel', () => {
    const built = bench()
    expect(built.panel(), 'premise: the panel starts closed (S-99h hidden is initial)').toBeNull()
    built.pressIc17()
    expectSettingsShown(built, 'premise: IC-17 shows the settings')
    expectClosedByTheSecondPress(built)
  })

  it('(c) opened from a closed panel after a Task was shown: the settings come in one press, and IC-17 again closes the panel', () => {
    const built = bench()
    built.openBySelectingTheTask()
    built.send(key('Esc'))
    expect(built.panel(), 'premise: Esc (IN-4) closed the panel').toBeNull()
    const during = built.pressIc17()
    expectSettingsShown(built, FR_072_SETTINGS_AFTER_A_CLOSE)
    expect(
      during.map((one) => one.propertiesPanel?.showing ?? null),
      `${FR_072_NOT_THE_SELECTION_AFTER_A_CLOSE} -- no frame of the press shows the Task first`,
    ).not.toContain('selection')
    expectClosedByTheSecondPress(built)
  })

  it.each([
    ['(a) after a Task was shown', true],
    ['(b) with nothing shown before', false],
  ] as const)('a press after the closing press shows the settings again -- %s', (_name, isTaskShownFirst) => {
    const built = bench()
    if (isTaskShownFirst) built.openBySelectingTheTask()
    built.pressIc17()
    built.pressIc17()
    expect(built.panel(), 'premise: the second press closed the panel').toBeNull()
    built.pressIc17()
    expectSettingsShown(built, `${FR_072_SETTINGS_AFTER_A_CLOSE} -- ${FR_072_NOT_THE_SELECTION_AFTER_A_CLOSE}`)
  })
})
