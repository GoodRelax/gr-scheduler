// CR-576 section 8 claims 5 (contract half) and 6a: the dismissed hint comes back only on a new hint target, and the icon and task waits are two keys.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CommandItem, IconId, ScreenView, ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const SETTINGS_TABLES = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-settings.md'), 'utf8'))
const MACHINE_TABLES = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8'))

const EZ_2_WAIT = 'ポインタがアイコンに入ってから `_assets/tbl-settings.md` の `S-124` が経ったら、そのアイコンの説明を出すこと（MUST）。'
const EZ_2_FROM_ENTERING = '⭐ 待ちは、ポインタがそのアイコンに入った時から数えること（MUST）。'
const EZ_6_WAIT =
  'タスクの上でポインタが `_assets/tbl-settings.md` の `S-439` のあいだ止まったら、そのタスクの名前と、`start` と `finish` の 2 つの日付を出すこと（MUST）。'
const EZ_6_TWO_VALUES = '⚠️ 待ち時間は `S-439` とし、`EZ-2` の待ち（`S-124`）とは別の値として持つこと（MUST）'
const EZ_6_FROM_THE_STOP = '⚠️ 待ちを数え始めるのは、`EZ-2` と違い、ポインタが止まった時である'
const S_439_APART = '⚠️ **`S-124` とは別の値である** —— 片方を選び直しても、もう片方は動かない（`EZ-6`）。'
const S_124_ICON_ONLY = '⚠️ **アイコンの説明だけの待ちである** —— タスクの説明（`EZ-6`）の待ちは `S-439` が持つ。'
const IN_3_CAN_BE_PUT_AWAY = '**消せること** —— ポインタもフォーカスも動かさずに消す手立てがあること。'
const MACHINE_ROW_ESCAPE = '| `screen/escapePressed` | → `dismissed` [`isRungTooltip`]それ以外 → — | — |'
const MACHINE_ROW_TARGET = '| `screen/hintTargetChanged` | — | → `allowed` |'
const MACHINE_UNLISTED = '表に無い出来事は `tooltipDisplayStateMachine` を変えない（同じ参照）。'
const EVENT_ROW_TARGET = '| `screen/hintTargetChanged` | 入力: `EZ-2` ・ `EZ-6` ・ `FR-037` ・ `IN-3` | — | `tooltipDisplayStateMachine` |'

// see T-212
const T_212 = specTable('T-212')

/** @purity pure */
function rowOfT212(id: string): { key: string; ms: number } {
  const row = T_212.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-212 has no row ${id}`)
  const found = /(\d+(?:\.\d+)?)/.exec(bare(row.by['値'] ?? ''))
  if (found === null) throw new Error(`table T-212 row ${id} states no number`)
  return { key: bare(row.by['名前'] ?? ''), ms: Number(found[1]) }
}

const ICON_WAIT = rowOfT212('S-124')
const TASK_WAIT = rowOfT212('S-439')

// see SD-5
type Machine = {
  readonly name: string
  readonly states: readonly { readonly key: string; readonly initial: boolean }[]
  readonly transitions: Readonly<Record<string, Readonly<Record<string, { readonly to: string; readonly guard?: unknown }>>>>
}
const TOOLTIP_MACHINE: Machine | undefined = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8')) as {
    readonly regions: readonly { readonly machines: readonly Machine[] }[]
  }
).regions
  .flatMap((region) => region.machines)
  .find((machine) => machine.name === 'tooltipDisplayStateMachine')

const sessionWith = (kind: 'allowed' | 'dismissed'): ScreenSession => ({
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: 'ja', helpLanguage: 'ja', tooltipDisplayState: { kind } },
})

describe('CR-576 -- the manuscript these cases are driven by', () => {
  it.each([EZ_2_WAIT, EZ_2_FROM_ENTERING, EZ_6_WAIT, EZ_6_TWO_VALUES, EZ_6_FROM_THE_STOP, IN_3_CAN_BE_PUT_AWAY])(
    '01-04 still says: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )

  it.each([S_439_APART, S_124_ICON_ONLY])('table T-212 still says: %s', (clause) => {
    expect(SETTINGS_TABLES).toContain(clause)
  })

  it.each([MACHINE_ROW_ESCAPE, MACHINE_ROW_TARGET, MACHINE_UNLISTED, EVENT_ROW_TARGET])(
    'the state-machine tables still say: %s',
    (clause) => {
      expect(MACHINE_TABLES).toContain(clause)
    },
  )
})

describe('CR-576 claim 6a -- S-124 and S-439 are two rows with two keys, and the build holds both (EZ-6)', () => {
  it(`${EZ_6_TWO_VALUES}: the two rows of table T-212 carry different keys`, () => {
    expect(ICON_WAIT.key, 'premise: S-124 names a key').not.toBe('')
    expect(TASK_WAIT.key, 'premise: S-439 names a key').not.toBe('')
    expect(TASK_WAIT.key, S_439_APART).not.toBe(ICON_WAIT.key)
  })

  it('the generated constants hold each row under its own key, at the value table T-212 states', () => {
    const constants = SETTINGS_CONSTANTS as unknown as Readonly<Record<string, unknown>>
    expect(constants[ICON_WAIT.key], `S-124 ${ICON_WAIT.key}`).toBe(ICON_WAIT.ms)
    expect(constants[TASK_WAIT.key], `S-439 ${TASK_WAIT.key}`).toBe(TASK_WAIT.ms)
  })
})

// WHY: claim 6a as behaviour -- the generated constants are replaced for one import of the tooltip queries.

const ICON: IconId = 'IC-7'

const COMMAND: CommandItem = { icon: ICON, isEnabled: true, isPressed: false, isArmed: false, isChosen: false, label: 'IC-7' }

const VIEW: Omit<ScreenView, 'tooltips'> = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [COMMAND],
    language: 'ja',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
}

const TASK = {
  uid: 1,
  wbsParentUid: null,
  wbsOrder: null,
  name: 'alpha',
  start: '2026-04-01T08:00:00',
  finish: '2026-04-08T17:00:00',
  milestone: null,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  actualDuration: null,
  actualFinish: null,
  stop: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
  carry: {},
  carryElements: [],
} as unknown as Task

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

const SETTINGS = nested({ ...SETTINGS_DEFAULTS }) as unknown as DocumentSettings

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: { x: 5, y: 5 },
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

// WHY: a pointer that entered the target and stopped at once has rested as long as it has dwelt.
const onTheIcon = (ms: number): ScreenViewReadings => ({ ...READINGS, iconUnderPointer: ICON, pointerRestedMs: ms, hintTargetDwellMs: ms })
const onTheTask = (ms: number): ScreenViewReadings =>
  ({ ...READINGS, taskUnderPointer: TASK, pointerRestedMs: ms, hintTargetDwellMs: ms }) as unknown as ScreenViewReadings

type Counted = { readonly icon: (ms: number) => number; readonly task: (ms: number) => number }

/** @purity non-pure */
async function queriesWith(replaced: Readonly<Record<string, number>>): Promise<Counted> {
  vi.resetModules()
  vi.doMock('../../src/entity/document-model/document-settings/document-settings', async (original) => {
    const real = await original<Record<string, unknown>>()
    return { ...real, SETTINGS_CONSTANTS: { ...(real['SETTINGS_CONSTANTS'] as object), ...replaced } }
  })
  const { tooltipsFromScreenView } = await import('../../src/adapter/screen-renderer/tooltips')
  const kindCount = (readings: ScreenViewReadings, kind: string): number =>
    tooltipsFromScreenView(VIEW, SETTINGS, sessionWith('allowed'), readings).filter((one) => one.anchor.kind === kind).length
  return { icon: (ms) => kindCount(onTheIcon(ms), 'icon'), task: (ms) => kindCount(onTheTask(ms), 'task') }
}

afterEach(() => {
  vi.doUnmock('../../src/entity/document-model/document-settings/document-settings')
  vi.resetModules()
})

describe(`CR-576 claim 6a -- ${S_439_APART}`, () => {
  it('premise: with the table values, the icon shows at S-124 and the task at S-439, and neither a millisecond earlier', async () => {
    const at = await queriesWith({})
    expect(at.icon(ICON_WAIT.ms - 1), 'EZ-2 before S-124').toBe(0)
    expect(at.icon(ICON_WAIT.ms), EZ_2_WAIT).toBe(1)
    expect(at.task(TASK_WAIT.ms - 1), 'EZ-6 before S-439').toBe(0)
    expect(at.task(TASK_WAIT.ms), EZ_6_WAIT).toBe(1)
  })

  it(`re-choosing ${ICON_WAIT.key} moves the icon wait and leaves the task wait at S-439`, async () => {
    const chosen = TASK_WAIT.ms + ICON_WAIT.ms
    const at = await queriesWith({ [ICON_WAIT.key]: chosen })
    expect(at.icon(chosen - 1), `premise: the re-chosen ${ICON_WAIT.key} reached the icon wait`).toBe(0)
    expect(at.icon(chosen), `premise: the re-chosen ${ICON_WAIT.key} reached the icon wait`).toBe(1)
    expect(at.task(TASK_WAIT.ms - 1), S_439_APART).toBe(0)
    expect(at.task(TASK_WAIT.ms), S_439_APART).toBe(1)
  })

  it(`re-choosing ${TASK_WAIT.key} moves the task wait and leaves the icon wait at S-124`, async () => {
    const chosen = TASK_WAIT.ms + ICON_WAIT.ms
    const at = await queriesWith({ [TASK_WAIT.key]: chosen })
    expect(at.task(chosen - 1), `premise: the re-chosen ${TASK_WAIT.key} reached the task wait`).toBe(0)
    expect(at.task(chosen), `premise: the re-chosen ${TASK_WAIT.key} reached the task wait`).toBe(1)
    expect(at.icon(ICON_WAIT.ms - 1), S_439_APART).toBe(0)
    expect(at.icon(ICON_WAIT.ms), S_439_APART).toBe(1)
  })
})

describe('CR-576 claim 5 (contract) -- a dismissed hint comes back only on screen/hintTargetChanged (IN-3, IN-4)', () => {
  it('the manuscript machine: escapePressed and hintTargetChanged are its only two events', () => {
    expect(TOOLTIP_MACHINE, 'tooltipDisplayStateMachine is in state-machines.json').toBeDefined()
    expect(Object.keys(TOOLTIP_MACHINE?.transitions ?? {}).sort()).toEqual(['escapePressed', 'hintTargetChanged'])
  })

  it(`the manuscript machine: ${MACHINE_ROW_TARGET}`, () => {
    const row = TOOLTIP_MACHINE?.transitions['hintTargetChanged'] ?? {}
    expect(Object.keys(row)).toEqual(['dismissed'])
    expect(row['dismissed']?.to).toBe('allowed')
  })

  it(`the manuscript machine: ${MACHINE_ROW_ESCAPE}`, () => {
    const row = TOOLTIP_MACHINE?.transitions['escapePressed'] ?? {}
    expect(Object.keys(row)).toEqual(['allowed'])
    expect(row['allowed']?.to).toBe('dismissed')
  })

  it('the step: hintTargetChanged takes dismissed to allowed', () => {
    const after = advanceScreenSession(sessionWith('dismissed'), { type: 'hintTargetChanged' } as SessionEvent)
    expect(after.state.screen.tooltipDisplayState).toEqual({ kind: 'allowed' })
  })

  it(`the step: hintTargetChanged leaves allowed as it is -- ${MACHINE_UNLISTED}`, () => {
    const before = sessionWith('allowed')
    const after = advanceScreenSession(before, { type: 'hintTargetChanged' } as SessionEvent)
    expect(after.state.screen.tooltipDisplayState).toBe(before.screen.tooltipDisplayState)
  })

  it('the query: while dismissed, a pointer still on the same icon past any wait raises no icon hint', async () => {
    vi.resetModules()
    const { tooltipsFromScreenView } = await import('../../src/adapter/screen-renderer/tooltips')
    const long = 10 * (ICON_WAIT.ms + TASK_WAIT.ms)
    expect(tooltipsFromScreenView(VIEW, SETTINGS, sessionWith('allowed'), onTheIcon(long)).length, 'premise').toBe(1)
    expect(tooltipsFromScreenView(VIEW, SETTINGS, sessionWith('dismissed'), onTheIcon(long)), IN_3_CAN_BE_PUT_AWAY).toEqual([])
  })
})
