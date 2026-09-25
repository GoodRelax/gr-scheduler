// CR-424: the property panel width never goes under S-248 by a drag, a saved width under it opens at S-171, and IC-17 after a close shows the settings.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  PropertiesPanel,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_052_COUNTED_FROM_THE_DRAWN_WIDTH =
  '描かれていた幅とは、`_assets/tbl-settings.md` の `S-80` が同書の 表 T-206 の `S-248` を下回るとき（0 を含む）は、`FR-072` が面を出すときに置く `S-171` の幅である。'
const FR_052_STOPS_AT_S_248 =
  '⭐ プロパティパネルの幅は、ポインタ位置が決める幅が `S-248` を下回るとき、`S-248` で止めて描くこと（MUST）'
const FR_052_STORES_THE_STOPPED_WIDTH = '離したときに保存する `S-80` は、止めて描いた幅とすること（MUST）'
const FR_052_OPENS_AT_S_171 =
  '⭐ 面を出すとき（`FR-072`）、保存された `S-80` が `S-248` を下回る文書（0 を含む）では、パネルを `S-171` の幅で描くこと（MUST）'
const FR_052_KEEPS_S_80 = '⛔ そのとき `S-80` を書き換えてはならない（MUST NOT）'
const FR_072_BACK_WHILE_SHOWN = '設定を開いても選択を解除せず、もう一度同じ入口を押したら直前の選択物へ戻すこと。'
const FR_072_ONLY_WHILE_SHOWN =
  '「もう一度同じ入口を押したら直前の選択物へ戻す」は、パネルが設定を出しているあいだの押しに限る。'
const FR_072_SETTINGS_AFTER_A_CLOSE =
  '⭐ 文書の設定を出したままパネルを閉じたあとに、設定を出す入口を押したときは、設定を出すこと（MUST）'
const FR_072_NOT_THE_SELECTION_AFTER_A_CLOSE = '⛔ 閉じたあとの押しで、中身を直前の選択物へ切り替えてはならない（MUST NOT）'
const FR_072_THE_PRESSED_STATE = 'いま何を出しているかを、入口の押下状態で示すこと（MUST）。'

describe('CR-424 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-052 -- the drawn width a press counts from', FR_052_COUNTED_FROM_THE_DRAWN_WIDTH],
    ['FR-052 (MUST) -- the held width stops at S-248', FR_052_STOPS_AT_S_248],
    ['FR-052 (MUST) -- the release stores the stopped width', FR_052_STORES_THE_STOPPED_WIDTH],
    ['FR-052 (MUST) -- a saved width under S-248 is drawn at S-171', FR_052_OPENS_AT_S_171],
    ['FR-052 (MUST NOT) -- and S-80 is not rewritten', FR_052_KEEPS_S_80],
    ['FR-072 -- a second press goes back to the selection', FR_072_BACK_WHILE_SHOWN],
    ['FR-072 -- only while the settings are shown', FR_072_ONLY_WHILE_SHOWN],
    ['FR-072 (MUST) -- after a close the entrance shows the settings', FR_072_SETTINGS_AFTER_A_CLOSE],
    ['FR-072 (MUST NOT) -- not the previous selection', FR_072_NOT_THE_SELECTION_AFTER_A_CLOSE],
    ['FR-072 (MUST) -- the pressed state says what is shown', FR_072_THE_PRESSED_STATE],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const H_DEFAULT = '既定'

const settingOf = (id: string): number => {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  return Number(/-?\d+(?:\.\d+)?/.exec(bare(row.by[H_DEFAULT] ?? ''))?.[0] ?? Number.NaN)
}

// see T-206
const S_171 = settingOf('S-171')
const S_248 = settingOf('S-248')

const settingsEntrance = (): string => {
  const row = specTable('T-109').rows.find((one) => bare(one.by['正'] ?? '') === 'FR-072')
  if (row === undefined) throw new Error('table T-109 names no entrance for FR-072')
  return row.id
}

// see T-109, FR-072
const IC_17 = settingsEntrance()
const APP_HEADER = bare(specTable('T-109').rows.find((one) => one.id === IC_17)?.by['面'] ?? '')

describe('CR-424 -- the premises read from the manuscript', () => {
  it('S-248 is 160 and S-171 is 280, with S-248 under S-171', () => {
    expect([S_248, S_171]).toEqual([160, 280])
    expect(S_248).toBeLessThan(S_171)
  })

  it('table T-109 gives FR-072 the IC-17 entrance on the App Header', () => {
    expect([IC_17, APP_HEADER]).toEqual(['IC-17', 'App Header'])
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const ROW_ID = '11111111-1111-4111-8111-111111111111'
const TASK_UID = 1

function documentWithPanelWidth(propertyPanelWidth: number): Document {
  return {
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
        { id: ROW_ID, parentId: null, label: 'Alpha', derivedFromTaskUid: null, order: 0, treeState: 'auto', editGroup: null, color: null, height: null },
      ],
      taskGroupMembers: [{ taskUid: TASK_UID, groupId: ROW_ID, stackOrder: null }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...structuredClone(TEMPLATE.documentSettings), propertyPanelWidth },
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
  readonly loop: FrameLoop
  send(input: HumanInput): void
  view(): ScreenView
  pressIc17(): void
  openBySelectingTheTask(): void
  panel(): PropertiesPanel | null
  isIc17Pressed(): boolean | undefined
  storedWidth(): number
  drawnWidth(): number
}

function bench(propertyPanelWidth: number): Bench {
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
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (x, y) => {
      if (aimed !== null) return aimed
      const view = views[views.length - 1]
      const divider = view?.frame.dividers.find(
        (one) => x >= one.band.x && x < one.band.x + one.band.width && y >= one.band.y && y < one.band.y + one.band.height,
      )
      if (divider === undefined) return null
      return {
        part: 'Panel Divider', entry: null, format: null, rowGroupId: null, resourceUid: null,
        dividerPanel: divider.panel, noticeDismissKey: null,
      } as unknown as ScreenPart
    },
  }
  const loop = frameLoop(
    { showSvg: () => undefined } as unknown as Parameters<typeof frameLoop>[0],
    documentWithPanelWidth(propertyPanelWidth),
    SCREEN,
    { surface, language: 'ja' },
  )
  drain()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  const frame = () => {
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame')
    return values
  }
  const view = (): ScreenView => {
    const last = views[views.length - 1]
    if (last === undefined) throw new Error('the surface was given no description')
    return last
  }
  return {
    loop,
    send,
    view,
    pressIc17: () => {
      aimed = { part: APP_HEADER, entry: IC_17, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as unknown as ScreenPart
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      aimed = null
    },
    openBySelectingTheTask: () => {
      const task = frame().geometry.tasks.find((one) => one.taskUid === TASK_UID)
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
    storedWidth: () =>
      (loop.document() as unknown as { documentSettings: { propertyPanelWidth: number } }).documentSettings.propertyPanelWidth,
    drawnWidth: () => frame().regions.propertiesPanel.width,
  }
}

function boundaryOf(built: Bench): { x: number; y: number } {
  const band = built.view().frame.dividers.find((one) => one.panel === 'propertiesPanel')?.band
  if (band === undefined) throw new Error('no Panel Divider band is drawn for the property panel')
  return { x: band.x + band.width / 2, y: band.y + band.height / 2 }
}

// see FR-052, IN-1
function dragTo(built: Bench, x: number): { readonly held: number; readonly storedWhileHeld: number } {
  const at = boundaryOf(built)
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('move', (at.x + x) / 2, at.y))
  built.send(pointer('move', x, at.y))
  const held = built.drawnWidth()
  const storedWhileHeld = built.storedWidth()
  built.send(pointer('up', x, at.y))
  return { held, storedWhileHeld }
}

const OPENINGS: readonly (readonly [string, (built: Bench) => void])[] = [
  ['MK-13', (built) => built.openBySelectingTheTask()],
  ['IC-17', (built) => built.pressIc17()],
]

describe('FR-052 -- a drag stops the property panel at S-248', () => {
  it('⭐ プロパティパネルの幅は、ポインタ位置が決める幅が `S-248` を下回るとき、`S-248` で止めて描くこと（MUST） -- the boundary pulled to the right edge of the window', () => {
    const built = bench(0)
    built.openBySelectingTheTask()
    expect(built.drawnWidth(), 'premise: the panel opens at S-171').toBeCloseTo(S_171, 6)
    const { held, storedWhileHeld } = dragTo(built, SCREEN.width - 1)
    expect(held, FR_052_STOPS_AT_S_248).toBeCloseTo(S_248, 6)
    expect(storedWhileHeld, 'FR-052 (MUST NOT): nothing is written while held').toBe(0)
  })

  it('離したときに保存する `S-80` は、止めて描いた幅とすること（MUST） -- released at the right edge, and past it, S-80 is S-248', () => {
    for (const x of [SCREEN.width - 1, SCREEN.width + 200]) {
      const built = bench(0)
      built.openBySelectingTheTask()
      dragTo(built, x)
      expect(built.storedWidth(), `${FR_052_STORES_THE_STOPPED_WIDTH} -- released at x ${x}`).toBeCloseTo(S_248, 6)
      expect(built.drawnWidth(), 'the picture after the release is the stopped width').toBeCloseTo(S_248, 6)
    }
  })

  it('a pointer naming 10 px under S-248 draws and stores S-248, and one naming 10 px over it follows the pointer', () => {
    const under = bench(0)
    under.openBySelectingTheTask()
    const underAt = boundaryOf(under)
    const underDrag = dragTo(under, underAt.x + (S_171 - (S_248 - 10)))
    expect(underDrag.held, FR_052_STOPS_AT_S_248).toBeCloseTo(S_248, 6)
    expect(under.storedWidth(), FR_052_STORES_THE_STOPPED_WIDTH).toBeCloseTo(S_248, 6)

    const over = bench(0)
    over.openBySelectingTheTask()
    const overAt = boundaryOf(over)
    const overDrag = dragTo(over, overAt.x + (S_171 - (S_248 + 10)))
    expect(overDrag.held, 'FR-052 (MUST): the held width follows the pointer above S-248').toBeCloseTo(S_248 + 10, 6)
    expect(over.storedWidth()).toBeCloseTo(S_248 + 10, 6)
  })
})

describe('FR-052 -- a saved width under S-248 opens at S-171 and stays saved', () => {
  it.each(OPENINGS)(
    '⭐ 面を出すとき（`FR-072`）、保存された `S-80` が `S-248` を下回る文書（0 を含む）では、パネルを `S-171` の幅で描くこと（MUST） -- S-80 12, opened by %s',
    (_name, open) => {
      const built = bench(12)
      open(built)
      expect(built.drawnWidth(), FR_052_OPENS_AT_S_171).toBeCloseTo(S_171, 6)
    },
  )

  it.each(OPENINGS)(
    '⛔ そのとき `S-80` を書き換えてはならない（MUST NOT） -- S-80 12 stays 12 and no unsaved edit stands, opened by %s',
    (_name, open) => {
      const built = bench(12)
      open(built)
      expect(built.storedWidth(), FR_052_KEEPS_S_80).toBe(12)
      expect(built.loop.hasUnsavedEdits(), `${FR_052_KEEPS_S_80} -- FR-100`).toBe(false)
    },
  )

  it.each([
    [0, S_171],
    [S_248 - 1, S_171],
    [S_248, S_248],
    [S_248 + 1, S_248 + 1],
  ])('S-80 %d opens at %d', (stored, drawn) => {
    const built = bench(stored)
    built.pressIc17()
    expect(built.drawnWidth(), FR_052_OPENS_AT_S_171).toBeCloseTo(drawn, 6)
    expect(built.storedWidth(), FR_052_KEEPS_S_80).toBe(stored)
  })

  it('S-80 12, pulled left by 10 px, is drawn and stored at S-171 + 10 (counted from the drawn width)', () => {
    const built = bench(12)
    built.openBySelectingTheTask()
    const at = boundaryOf(built)
    const { held } = dragTo(built, at.x - 10)
    expect(held, FR_052_COUNTED_FROM_THE_DRAWN_WIDTH).toBeCloseTo(S_171 + 10, 6)
    expect(built.storedWidth(), FR_052_COUNTED_FROM_THE_DRAWN_WIDTH).toBeCloseTo(S_171 + 10, 6)
  })
})

const CLOSINGS: readonly (readonly [string, KeyInput])[] = [
  ['Esc (IN-4)', key('Esc')],
  ['Enter (SK-19)', key('Enter')],
]

describe('FR-072 -- the settings entrance after a close shows the settings', () => {
  it.each(CLOSINGS)(
    '⭐ 文書の設定を出したままパネルを閉じたあとに、設定を出す入口を押したときは、設定を出すこと（MUST） -- the settings shown, closed by %s, IC-17 pressed again',
    (_name, close) => {
      const built = bench(S_171)
      built.pressIc17()
      expect(built.panel()?.showing, 'premise: IC-17 shows the settings').toBe('documentSettings')
      built.send(close)
      expect(built.panel(), 'premise: the panel is closed').toBeNull()
      built.pressIc17()
      expect(built.panel()?.showing, FR_072_SETTINGS_AFTER_A_CLOSE).toBe('documentSettings')
      expect(built.isIc17Pressed(), FR_072_THE_PRESSED_STATE).toBe(true)
    },
  )

  it.each(CLOSINGS)(
    '⛔ 閉じたあとの押しで、中身を直前の選択物へ切り替えてはならない（MUST NOT） -- a Task shown by MK-13, then the settings, closed by %s, IC-17 pressed again',
    (_name, close) => {
      const built = bench(S_171)
      built.openBySelectingTheTask()
      expect(built.panel()?.showing, 'premise: MK-13 shows the Task').toBe('selection')
      built.pressIc17()
      expect(built.panel()?.showing, 'premise: IC-17 shows the settings').toBe('documentSettings')
      built.send(close)
      expect(built.panel(), 'premise: the panel is closed').toBeNull()
      built.pressIc17()
      expect(built.panel()?.showing, FR_072_NOT_THE_SELECTION_AFTER_A_CLOSE).toBe('documentSettings')
      expect(built.isIc17Pressed(), FR_072_THE_PRESSED_STATE).toBe(true)
    },
  )

  it('IC-17 pressed while the settings are shown goes back to the Task shown before', () => {
    const built = bench(S_171)
    built.openBySelectingTheTask()
    built.pressIc17()
    expect(built.panel()?.showing, 'premise: IC-17 shows the settings').toBe('documentSettings')
    expect(built.isIc17Pressed(), FR_072_THE_PRESSED_STATE).toBe(true)
    built.pressIc17()
    expect(built.panel()?.showing, FR_072_BACK_WHILE_SHOWN).toBe('selection')
    expect(built.isIc17Pressed(), FR_072_THE_PRESSED_STATE).toBe(false)
  })
})

describe('CR-424 section 9 -- returned questions', () => {
  it.skip('a window so narrow that S-248 leaves the Row Area at 0 or less -- open: CR-424 question 1 (JDG-78, DFC-586)', () => {})
})
