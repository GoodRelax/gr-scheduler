// CR-624 part 2: the hint holder under the pointer picks the tooltip, its anchor and its ink; CU-3 stands down for it.

import { describe, expect, it } from 'vitest'

import type { ScreenView, ScreenViewReadings, Tooltip } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  baselineHint,
  deadlineHint,
  guideCursorLabelOf,
  tooltipsFromScreenView,
} from '../../src/adapter/screen-renderer/tooltips'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { PAINT, anchorKey } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { keepTooltipsInside, tooltipElement } from '../../src/framework/dom-screen-surface/tooltips-drawing'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { stage, type FakeElement } from '../fixtures/fake-browser'

const TASK = {
  uid: 7,
  name: 'a named task',
  start: '2026-04-01T08:00:00',
  finish: '2026-04-08T17:00:00',
  milestone: null,
  deadline: '2026-04-20T17:00:00',
  actualStart: null,
  actualFinish: null,
  percentComplete: null,
} as unknown as Task

const BASELINE = { uid: 7, name: 'the name before', start: '2026-03-30T08:00:00', finish: '2026-04-06T17:00:00', milestone: false }

const SCHEDULE = {
  tasks: [TASK],
  resources: [],
  assignments: [],
  baselineTasks: [BASELINE],
} as unknown as Schedule

const VIEW = { frame: { scrollbars: [] } } as unknown as Omit<ScreenView, 'tooltips'>

const SETTINGS = SETTINGS_DEFAULTS as unknown as DocumentSettings

const POINTER = { x: 420, y: 300 }

// WHY: the defaults are flat dotted keys; the time axis reads the nested document settings.
const nested = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[path[path.length - 1] as string] = flat[key]
  }
  return out
}

const sessionIn = (language: 'ja' | 'en', guide: 'none' | 'single-vertical' = 'none'): ScreenSession => ({
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: language, helpLanguage: language, guideCursorMode: guide },
})

const restingOn = (part: Partial<ScreenViewReadings>): ScreenViewReadings =>
  ({
    pointer: POINTER,
    pointerRestedMs: SETTINGS_CONSTANTS.taskHintDelayMs,
    hintTargetDwellMs: SETTINGS_CONSTANTS.taskHintDelayMs,
    iconUnderPointer: null,
    ...part,
  }) as unknown as ScreenViewReadings

const tipsFor = (readings: ScreenViewReadings, language: 'ja' | 'en' = 'ja'): readonly Tooltip[] =>
  tooltipsFromScreenView(VIEW, SETTINGS, sessionIn(language), readings, SCHEDULE)

describe('EZ-6 / T-023d -- the holder the hint walk found is the one the tooltip tells', () => {
  for (const language of ['ja', 'en'] as const) {
    it(`GR-26 / TL-2: resting on the deadline mark tells the mark's line at the pointer (${language})`, () => {
      const tips = tipsFor(restingOn({ hintHolderUnderPointer: { kind: 'deadline', taskUid: TASK.uid } }), language)
      expect(tips).toEqual([
        { anchor: { kind: 'deadline', taskUid: TASK.uid }, text: deadlineHint(TASK, SCHEDULE, language), assignment: null, at: POINTER },
      ])
      expect(tips[0]?.text.includes(TASK.name ?? '')).toBe(true)
    })

    it(`GR-27 / TL-3: resting on the outline tells the BaselineTask's name and plan (${language})`, () => {
      const tips = tipsFor(restingOn({ hintHolderUnderPointer: { kind: 'baseline', taskUid: TASK.uid } }), language)
      expect(tips.map((one) => one.anchor)).toEqual([{ kind: 'baseline', taskUid: TASK.uid }])
      expect(tips[0]?.text).toBe(baselineHint(BASELINE, SCHEDULE, language))
      expect(tips[0]?.text.split('\n')[0]).toBe(BASELINE.name)
    })
  }

  it('GR-23 / TL-1: resting on the bar tells the task lines, the deadline line last', () => {
    const tips = tipsFor(restingOn({ hintHolderUnderPointer: { kind: 'task', taskUid: TASK.uid } }))
    const lines = tips[0]?.text.split('\n') ?? []
    expect(tips[0]?.anchor).toEqual({ kind: 'task', taskUid: TASK.uid })
    expect(lines[0]).toBe(TASK.name)
    expect(lines.at(-1)).toBe(deadlineHint({ ...TASK, name: '' }, SCHEDULE, 'ja'))
  })

  it('a holder the schedule does not hold tells nothing, and no holder tells nothing', () => {
    expect(tipsFor(restingOn({ hintHolderUnderPointer: { kind: 'task', taskUid: 99 } }))).toEqual([])
    expect(tipsFor(restingOn({ hintHolderUnderPointer: { kind: 'baseline', taskUid: 99 } }))).toEqual([])
    expect(tipsFor(restingOn({ hintHolderUnderPointer: null }))).toEqual([])
  })

  it('S-439: before the wait has passed, no holder tells anything', () => {
    const early = restingOn({
      hintHolderUnderPointer: { kind: 'deadline', taskUid: TASK.uid },
      pointerRestedMs: SETTINGS_CONSTANTS.taskHintDelayMs - 1,
    })
    expect(tipsFor(early)).toEqual([])
  })

  it('DFC-1720: an icon on a row carries that row in its anchor; one off a row carries none', () => {
    const onRow = tipsFor(restingOn({ iconUnderPointer: 'IC-58', iconRowUnderPointer: 'g2', hintTargetDwellMs: 1e6 }))
    const offRow = tipsFor(restingOn({ iconUnderPointer: 'IC-5', iconRowUnderPointer: null, hintTargetDwellMs: 1e6 }))
    expect(onRow.find((one) => one.anchor.kind === 'icon')?.anchor).toEqual({ kind: 'icon', icon: 'IC-58', groupId: 'g2' })
    expect(offRow.find((one) => one.anchor.kind === 'icon')?.anchor).toEqual({ kind: 'icon', icon: 'IC-5' })
  })
})

describe('IN-3 -- each anchor kind has a key of its own', () => {
  it('task, deadline and baseline of one Task, and an icon on two rows, never share a key', () => {
    const keys = [
      anchorKey({ kind: 'task', taskUid: 7 }),
      anchorKey({ kind: 'deadline', taskUid: 7 }),
      anchorKey({ kind: 'baseline', taskUid: 7 }),
      anchorKey({ kind: 'icon', icon: 'IC-58' }),
      anchorKey({ kind: 'icon', icon: 'IC-58', groupId: 'g1' }),
      anchorKey({ kind: 'icon', icon: 'IC-58', groupId: 'g2' }),
      anchorKey({ kind: 'icon', icon: 'IC-58', surface: 'Help Modal' }),
    ]
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('TL-3 -- the outline tip is drawn in S-148', () => {
  const drawn = (kind: 'baseline' | 'task'): FakeElement => {
    const built = stage()
    const tip: Tooltip = { anchor: { kind, taskUid: 7 }, text: 'a\nb', assignment: null, at: POINTER }
    const element = tooltipElement(built.host, tip, () => undefined) as unknown as FakeElement
    const layer = built.host.createElement('div') as unknown as FakeElement
    layer.append(element)
    keepTooltipsInside(layer as unknown as HTMLElement)
    return element
  }

  it('TL-3: the baseline tip carries the S-148 ink, after it is placed inside the window too', () => {
    expect(drawn('baseline').getAttribute('style')).toContain(`color:${PAINT.quiet};`)
  })

  it('control: a task tip keeps the tooltip ink', () => {
    expect(drawn('task').getAttribute('style')).not.toContain(`color:${PAINT.quiet};`)
  })
})

describe('CU-3 / DC-9 -- the guide label stands down in the frame an EZ-6 tip shows', () => {
  it('the label is there with no tip, and absent while the task tip stands', () => {
    const settings = nested({ ...SETTINGS_DEFAULTS, scrollDate: '2026-03-25' }) as unknown as DocumentSettings
    const regions = regionsFromScreen(
      { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 },
      settings,
    )
    const middle = { x: regions.rowArea.x + regions.rowArea.width / 2, y: regions.rowArea.y + regions.rowArea.height / 2 }
    const session = sessionIn('ja', 'single-vertical')
    const resting = restingOn({ pointer: middle, hintHolderUnderPointer: { kind: 'task', taskUid: TASK.uid } })
    const moving = restingOn({ pointer: middle, hintHolderUnderPointer: { kind: 'task', taskUid: TASK.uid }, pointerRestedMs: 0 })
    const shownTips = tooltipsFromScreenView(VIEW, settings, session, resting, SCHEDULE)
    const noTips = tooltipsFromScreenView(VIEW, settings, session, moving, SCHEDULE)
    expect(shownTips.length, 'premise: the task tip stands').toBe(1)
    expect(noTips, 'premise: no tip before S-439').toEqual([])
    expect(guideCursorLabelOf(regions, settings, session, moving, noTips)?.at).toEqual(middle)
    expect(guideCursorLabelOf(regions, settings, session, resting, shownTips)).toBeNull()
  })
})
