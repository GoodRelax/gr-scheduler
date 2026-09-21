// CR-423: a row-axis zoom input at an end of table T-262 writes nothing, raises no unsaved edit and shows the end message.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  WheelInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { selfAndDescendants, stage as fakeBrowser, wiringOf, type FakeElement } from '../fixtures/fake-browser'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_016_BY_T_262 = '⭐ 行の軸だけを動かす入力が端で絵を変えないときの扱いは、表 T-262 に従うこと（MUST）'
const ZE_1_THE_LOWER_END =
  '⭐ いまの `zoomY` が次の ① と ② をともに満たすとき、行の軸は縮める側の端にあるとすること（MUST）'
const ZE_2_NO_WRITE_AT_THE_END =
  '端にあるときに縮める入力（表 T-023 の `MK-4` の縮める向き、`_assets/tbl-glossary.md` の 表 T-109 の `IC-14`、表 T-036 の `SK-16c`）を受けたら、`zoomY` を書き換えてはならない（MUST NOT）'
const ZE_2_ENTERING_WRITES_THE_STEP =
  '⭐ 端の外から縮める入力で端の中へ入るときは、`S-53` で刻んだ値（`S-76` の下限で止める）を書くこと（MUST）'
const ZE_3_NO_WRITE_AT_THE_CEILING =
  '拡げる入力（`MK-4` の拡げる向き、`IC-15`、`SK-16a`）で、本要求の上限で止めた値がいまの `zoomY` と等しいときは、`zoomY` を書き換えてはならない（MUST NOT）'
const ZE_4_NO_UNSAVED_EDIT = '`ZE-2` と `ZE-3` で書き換えないときは、未保存の編集を立ててはならない（MUST NOT）'
const ZE_5_THE_MESSAGE = '`ZE-2` と `ZE-3` のときは、`FR-039` の 表 T-260 のメッセージを出すこと（MUST）'
const ZE_5_ITS_TEXT =
  '中身は、`zoomY` に 100 を掛けて小数点以下を四捨五入した数に `%` を付け、`ZE-2` では最小であることを示す語を、`ZE-3` では最大であることを示す語を添えたものとすること（MUST）'
const ZE_5_ONE_MESSAGE =
  '⭐ 消えるとき・続けて押したとき・通知との違いは同表の `SE-3`〜`SE-5` のとおりとし、表示の倍率を示すメッセージと同じ 1 つのメッセージとして扱うこと（MUST）'
const T_262_NOT_FOR_MK_2 = '⚠️ 本表は `MK-2`（両軸のズーム）に当てない'
const UN_8_ZOOM_IS_NO_STEP = '⚠️ 行の軸のズームは、もともと取り消しの対象外である（表 T-027 の `UN-8`）'

describe('CR-423 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-016 (MUST) -- an end is handled by table T-262', FR_016_BY_T_262],
    ['ZE-1 (MUST) -- the lower end is (1) and (2) together', ZE_1_THE_LOWER_END],
    ['ZE-2 (MUST NOT) -- no zoomY write at the lower end', ZE_2_NO_WRITE_AT_THE_END],
    ['ZE-2 (MUST) -- entering writes the S-53 step', ZE_2_ENTERING_WRITES_THE_STEP],
    ['ZE-3 (MUST NOT) -- no zoomY write at the ceiling', ZE_3_NO_WRITE_AT_THE_CEILING],
    ['ZE-4 (MUST NOT) -- no unsaved edit', ZE_4_NO_UNSAVED_EDIT],
    ['ZE-5 (MUST) -- the message of table T-260', ZE_5_THE_MESSAGE],
    ['ZE-5 (MUST) -- rounded percentage and the end word', ZE_5_ITS_TEXT],
    ['ZE-5 (MUST) -- one message with the display scale message', ZE_5_ONE_MESSAGE],
    ['T-262 -- not applied to MK-2', T_262_NOT_FOR_MK_2],
    ['ZE-4 -- the row zoom is no undo step (UN-8)', UN_8_ZOOM_IS_NO_STEP],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-262 holds ZE-1 .. ZE-5', () => {
    expect(specTable('T-262').rows.map((row) => row.id)).toEqual(['ZE-1', 'ZE-2', 'ZE-3', 'ZE-4', 'ZE-5'])
  })
})

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const numberIn = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

const settingIn = (table: string, id: string, column: string): number => numberIn(rowOf(table, id).by[column] ?? '')

// see T-201
const S_4 = settingIn('T-201', 'S-4', '既定値')
const S_5 = settingIn('T-201', 'S-5', '既定値')
const S_6 = settingIn('T-201', 'S-6', '既定値')
const S_7 = settingIn('T-201', 'S-7', '既定値')
const S_8 = settingIn('T-201', 'S-8', '既定値')
const S_13 = settingIn('T-201', 'S-13', '既定値')
const S_36 = settingIn('T-201', 'S-36', '既定値')
const S_38 = settingIn('T-201', 'S-38', '既定値')
const S_53 = settingIn('T-201', 'S-53', '既定値')
const S_54 = settingIn('T-201', 'S-54', '既定値')
// see T-205
const S_87 = settingIn('T-205', 'S-87', '既定')
const S_88 = settingIn('T-205', 'S-88', '既定')
// see T-206
const S_244 = settingIn('T-206', 'S-244', '既定')

// see ZE-1, FR-094
const PLAN_FLOOR_LETS_GO_AT = S_6 / S_5 / S_4

// see FR-018
const thresholdOf = (depth: number): number => S_87 * S_88 ** (depth - 2)

// see FR-016
const TEXT_SIDE_CEILING = (S_36 * S_38) / (S_4 * S_13 * S_5 * S_7)

interface ScaleEcho {
  readonly end: string
  readonly text: Readonly<Record<'ja' | 'en', string>>
}

const SCALE_ECHO: readonly ScaleEcho[] = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
    scaleEcho: ScaleEcho[]
  }
).scaleEcho

const endWord = (end: 'min' | 'max'): string => {
  const found = SCALE_ECHO.find((one) => one.end === end)
  if (found === undefined) throw new Error(`the dictionary holds no scaleEcho word for ${end}`)
  return found.text.ja
}

const MIN_WORD = endWord('min')
const MAX_WORD = endWord('max')

// see ZE-5
const endMessage = (zoomY: number, word: string): string => `${Math.round(zoomY * 100)}%${word}`

// see T-036
function keyOfRow(id: string): KeyInput {
  const spans = [...(rowOf('T-036', id).by['割当'] ?? '').matchAll(/`([^`]+)`/g)].map((one) => one[1]!)
  if (spans.length === 0) throw new Error(`table T-036 ${id} states no key`)
  const held = new Set(spans.slice(0, -1))
  return {
    kind: 'key',
    key: spans[spans.length - 1]!,
    modifiers: { ctrl: held.has('Ctrl'), shift: held.has('Shift'), alt: held.has('Alt'), meta: false },
  }
}

describe('CR-423 -- the premises read from the manuscript', () => {
  it('(1) lets go at (S-6 / S-5) / S-4, the 0.999875 of the paragraph after table T-262', () => {
    expect(PLAN_FLOOR_LETS_GO_AT).toBeCloseTo(0.999875, 6)
    expect(REQUIREMENTS).toContain('① は `zoomY` ≦ 16 ÷ 0.5715 ÷ 28 ＝ 0.999875… で成り立つ')
  })

  it('the depth-2 threshold is S-87 (0.32) and depth 3 is 0.48', () => {
    expect(thresholdOf(2)).toBeCloseTo(0.32, 12)
    expect(thresholdOf(3)).toBeCloseTo(0.48, 12)
  })

  it('the text side of the ceiling rounds to the example of ZE-5', () => {
    const example = /（例: `([^`]+)`）/.exec(rowOf('T-262', 'ZE-5').cells.join(' '))?.[1]
    expect(example).toBeDefined()
    expect(endMessage(TEXT_SIDE_CEILING, MAX_WORD)).toBe(example)
  })

  it('reads SK-16a, SK-16c and SK-22 as Alt + plus, Alt + minus and Ctrl + Shift + plus', () => {
    expect(keyOfRow('SK-16a')).toEqual({ kind: 'key', key: '+', modifiers: { ctrl: false, shift: false, alt: true, meta: false } })
    expect(keyOfRow('SK-16c')).toEqual({ kind: 'key', key: '-', modifiers: { ctrl: false, shift: false, alt: true, meta: false } })
    expect(keyOfRow('SK-22').modifiers).toEqual({ ctrl: true, shift: true, alt: false, meta: false })
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

interface RowSpec {
  readonly id: string
  readonly parentId: string | null
  readonly isKeptOpen?: boolean
}

const A = 'bbbbbbbb-0000-4000-8000-000000000001'
const B = 'bbbbbbbb-0000-4000-8000-000000000002'
const C = 'bbbbbbbb-0000-4000-8000-000000000003'
const Z = 'bbbbbbbb-0000-4000-8000-000000000004'

const DEEP: readonly RowSpec[] = [
  { id: A, parentId: null },
  { id: B, parentId: A },
  { id: C, parentId: B },
  { id: Z, parentId: null },
]

const FLAT: readonly RowSpec[] = [
  { id: A, parentId: null },
  { id: Z, parentId: null },
]

const KEPT_OPEN: readonly RowSpec[] = [
  { id: A, parentId: null },
  { id: B, parentId: A, isKeptOpen: true },
  { id: C, parentId: B },
  { id: Z, parentId: null },
]

// see ZE-1, FR-094, FR-018, FR-016
function documentOf(rows: readonly RowSpec[], zoomY: number): Document {
  const task = (uid: number) => ({
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name: `Task${uid}`,
    start: '2026-04-01T08:00:00',
    finish: '2026-04-10T17:00:00',
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
  })
  return {
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: rows.map((_one, index) => task(index + 1)),
      resources: [],
      assignments: [],
      taskGroups: rows.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: `Row${index + 1}`,
        derivedFromTaskUid: null,
        order: index,
        isCollapsed: false,
        isHidden: false,
        isKeptOpen: one.isKeptOpen === true,
        editGroup: null,
        color: null,
        height: null,
      })),
      taskGroupMembers: rows.map((one, index) => ({ taskUid: index + 1, groupId: one.id, stackOrder: null })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      basePlanHeight: S_4,
      actualOfPlan: S_5,
      actualMin: S_6,
      fontOfActual: S_7,
      fontMin: S_8,
      shapeHeightOf: { ...structuredClone(TEMPLATE.documentSettings.shapeHeightOf), rectangle: S_13 },
      rowTitleFont: S_36,
      rowTitleTopScale: S_38,
      groupLevelOfDetailBase: S_87,
      groupLevelOfDetailRatio: S_88,
      pinnedGroupIds: [],
      displayScale: DEFAULT_DISPLAY_SCALE,
      scrollDate: '2026-04-01',
      scrollGroupId: A,
      zoomX: 1,
      zoomY,
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }
const THEME: ScreenTheme = { preference: 'light', hue: 214 }

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
    now: Date.UTC(2026, 8, 18, 3, 0, 0),
  })
})

afterEach(() => {
  vi.useRealTimers()
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

const MODS = (part: Partial<InputModifiers> = {}): InputModifiers => ({
  ctrl: false,
  shift: false,
  alt: false,
  meta: false,
  ...part,
})

const SK_16A = keyOfRow('SK-16a')
const SK_16C = keyOfRow('SK-16c')
const SK_22 = keyOfRow('SK-22')
const SK_6 = keyOfRow('SK-6')
const ESC = keyOfRow('SK-8')

const pointer = (phase: 'down' | 'up'): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: 500,
  y: 20,
  modifiers: MODS(),
  clickCount: 1,
})

const isShown = (one: FakeElement): boolean =>
  one.getAttribute('hidden') === null &&
  !/display\s*:\s*none/.test(one.getAttribute('style') ?? '') &&
  one.textContent.trim() !== ''

interface Bench {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  pressEntrance(icon: string): void
  wheel(part: Partial<InputModifiers>, notches: number): void
  wait(ms: number): void
  messages(): readonly string[]
  notices(): number
  zoomX(): number
  zoomY(): number
  drawnRows(): readonly string[]
}

function bench(document: Document): Bench {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(performance.now())
    }
  }
  const browser = fakeBrowser({ 'App Header': 37 })
  const real = domScreenSurface({ ...wiringOf(browser, THEME), readClockMs: () => Date.now() })
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
      real.showScreenView(view)
    },
    readDialogueInput: () => real.readDialogueInput(),
    readFieldCommit: () => real.readFieldCommit(),
    hasUnsettledTextEntry: () => real.hasUnsettledTextEntry(),
    readScreenPartAt: () => part,
  }
  const loop = frameLoop({ showSvg: () => undefined } as never, document, SCREEN, { surface, language: 'ja' })
  drain()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    send,
    pressEntrance: (icon) => {
      part = { part: 'App Header', entry: icon, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as ScreenPart
      loop.receiveInput(pointer('down'))
      loop.receiveInput(pointer('up'))
      part = null
      drain()
    },
    wheel: (modifiers, notches) => {
      const area = loop.current()?.regions.rowArea
      if (area === undefined) throw new Error('the loop has drawn no frame')
      const input: WheelInput = {
        kind: 'wheel',
        x: area.x + area.width / 2,
        y: area.y + area.height / 2,
        modifiers: MODS(modifiers),
        notches,
        scrollPx: { x: 0, y: notches * 100 },
      }
      send(input)
    },
    wait: (ms) => {
      vi.advanceTimersByTime(ms)
      drain()
    },
    messages: () =>
      selfAndDescendants(browser.mount)
        .filter((one) => one.getAttribute('data-scale-message') !== null && isShown(one))
        .map((one) => one.textContent.trim()),
    notices: () => views[views.length - 1]?.notices.length ?? 0,
    zoomX: () => loop.document().documentSettings.zoomX as number,
    zoomY: () => loop.document().documentSettings.zoomY as number,
    drawnRows: () => (loop.current()?.layout.rows ?? []).map((one) => one.groupId),
  }
}

// WHY: MK-4's notch sign is not in the manuscript; a control case below proves +1 lowers zoomY off the end.
const OUT = 1
const IN = -1

type RowInput = readonly [string, (built: Bench) => void]

const ZOOM_OUT_INPUTS: readonly RowInput[] = [
  ['MK-4 (Alt + wheel, lowering)', (built) => built.wheel({ alt: true }, OUT)],
  ['SK-16c', (built) => built.send(SK_16C)],
  ['IC-14', (built) => built.pressEntrance('IC-14')],
]

const ZOOM_IN_INPUTS: readonly RowInput[] = [
  ['MK-4 (Alt + wheel, raising)', (built) => built.wheel({ alt: true }, IN)],
  ['SK-16a', (built) => built.send(SK_16A)],
  ['IC-15', (built) => built.pressEntrance('IC-15')],
]

const AT_THE_LOWER_END = 0.3

describe('ZE-1 -- the scenes stand where the manuscript puts the ends', () => {
  it('a depth-2 row document at zoomY 0.3 draws what it draws at S-54, and its plan height stands on the floor', () => {
    expect(AT_THE_LOWER_END * S_4, 'ZE-1 (1)').toBeLessThanOrEqual(S_6 / S_5)
    const here = bench(documentOf(DEEP, AT_THE_LOWER_END))
    const lowest = bench(documentOf(DEEP, S_54))
    expect(here.drawnRows(), 'ZE-1 (2)').toEqual(lowest.drawnRows())
    expect(here.drawnRows(), 'premise: FR-018 drops the depth-2 row').not.toContain(B)
  })

  it('the same document at 0.33 still draws its depth-2 row, so it is not at the end', () => {
    const built = bench(documentOf(DEEP, 0.33))
    expect(built.drawnRows()).toContain(B)
  })

  it('control: off the end, each zoom-out input writes zoomY / S-53', () => {
    for (const [name, press] of ZOOM_OUT_INPUTS) {
      const built = bench(documentOf(DEEP, 0.5))
      press(built)
      expect(built.zoomY(), `${name} lowers zoomY by one S-53 step`).toBeCloseTo(0.5 / S_53, 12)
    }
  })
})

describe('ZE-2 / ZE-4 -- at the lower end a zoom-out input writes nothing', () => {
  it.each(ZOOM_OUT_INPUTS)(
    '端にあるときに縮める入力（表 T-023 の `MK-4` の縮める向き、`_assets/tbl-glossary.md` の 表 T-109 の `IC-14`、表 T-036 の `SK-16c`）を受けたら、`zoomY` を書き換えてはならない（MUST NOT） -- %s at zoomY 0.3 with a depth-2 row',
    (_name, press) => {
      const built = bench(documentOf(DEEP, AT_THE_LOWER_END))
      expect(built.loop.hasUnsavedEdits(), 'premise: a document just opened has no unsaved edit').toBe(false)
      press(built)
      expect(built.zoomY(), `${FR_016_BY_T_262} -- ${ZE_2_NO_WRITE_AT_THE_END}`).toBe(AT_THE_LOWER_END)
      expect(built.loop.hasUnsavedEdits(), ZE_4_NO_UNSAVED_EDIT).toBe(false)
    },
  )

  it.each(ZOOM_OUT_INPUTS)(
    '`ZE-2` と `ZE-3` で書き換えないときは、未保存の編集を立ててはならない（MUST NOT） -- %s pressed five times, then undo takes nothing back',
    (_name, press) => {
      const built = bench(documentOf(DEEP, AT_THE_LOWER_END))
      const before = JSON.stringify(built.loop.document().documentSettings)
      for (let turn = 0; turn < 5; turn += 1) press(built)
      expect(built.loop.hasUnsavedEdits(), ZE_4_NO_UNSAVED_EDIT).toBe(false)
      built.send(SK_6)
      expect(JSON.stringify(built.loop.document().documentSettings), UN_8_ZOOM_IS_NO_STEP).toBe(before)
      expect(built.loop.hasUnsavedEdits(), ZE_4_NO_UNSAVED_EDIT).toBe(false)
    },
  )

  it.each(ZOOM_OUT_INPUTS)(
    '⭐ 端の外から縮める入力で端の中へ入るときは、`S-53` で刻んだ値（`S-76` の下限で止める）を書くこと（MUST） -- %s from 0.33 writes 0.33 / S-53, not the 0.32 edge, and the next input writes nothing',
    (_name, press) => {
      const built = bench(documentOf(DEEP, 0.33))
      press(built)
      const entered = 0.33 / S_53
      expect(built.zoomY(), ZE_2_ENTERING_WRITES_THE_STEP).toBeCloseTo(entered, 12)
      expect(built.zoomY(), 'ZE-2: the value is not moved onto the S-87 threshold').not.toBeCloseTo(thresholdOf(2), 6)
      expect(built.drawnRows(), 'FR-018: the depth-2 row is no longer drawn').not.toContain(B)
      const written = built.zoomY()
      press(built)
      expect(built.zoomY(), ZE_2_NO_WRITE_AT_THE_END).toBe(written)
    },
  )
})

describe('ZE-1 -- a document with no depth-2 row the threshold drops', () => {
  it('⭐ いまの `zoomY` が次の ① と ② をともに満たすとき、行の軸は縮める側の端にあるとすること（MUST） -- depth-1 rows only, zoomY 0.9: SK-16c writes nothing', () => {
    expect(0.9, 'premise: (1) holds at 0.9').toBeLessThanOrEqual(PLAN_FLOOR_LETS_GO_AT)
    const built = bench(documentOf(FLAT, 0.9))
    built.send(SK_16C)
    expect(built.zoomY(), ZE_1_THE_LOWER_END).toBe(0.9)
    expect(built.loop.hasUnsavedEdits(), ZE_4_NO_UNSAVED_EDIT).toBe(false)
  })

  it('from 1.2 it lowers by S-53 until the first step under the plan floor, and stops there', () => {
    let expected = 1.2
    const steps: number[] = []
    while (expected > PLAN_FLOOR_LETS_GO_AT) {
      expected /= S_53
      steps.push(expected)
    }
    expect(steps.length, 'premise: 1.2 is off the end').toBeGreaterThan(0)
    const built = bench(documentOf(FLAT, 1.2))
    for (const step of steps) {
      built.send(SK_16C)
      expect(built.zoomY(), ZE_2_ENTERING_WRITES_THE_STEP).toBeCloseTo(step, 12)
    }
    built.send(SK_16C)
    expect(built.zoomY(), ZE_1_THE_LOWER_END).toBeCloseTo(expected, 12)
  })

  it('a depth-2 row held open by hand (table T-254) at zoomY 0.5: a zoom-out writes nothing', () => {
    const kept = bench(documentOf(KEPT_OPEN, 0.5))
    const lowest = bench(documentOf(KEPT_OPEN, S_54))
    expect(kept.drawnRows(), 'premise: ZE-1 (2), the mark draws the same rows at S-54').toEqual(lowest.drawnRows())
    kept.send(SK_16C)
    expect(kept.zoomY(), ZE_1_THE_LOWER_END).toBe(0.5)
    expect(kept.loop.hasUnsavedEdits(), ZE_4_NO_UNSAVED_EDIT).toBe(false)
  })

  it('control: the same rows without the mark at 0.5 are off the end, and SK-16c writes', () => {
    const plain = bench(documentOf(DEEP, 0.5))
    plain.send(SK_16C)
    expect(plain.zoomY()).toBeCloseTo(0.5 / S_53, 12)
  })
})

// see FR-016, ZE-3
function ceilingReachedBySk16a(): number {
  const built = bench(documentOf(FLAT, 1.5))
  let last = built.zoomY()
  for (let press = 0; press < 30; press += 1) {
    built.send(SK_16A)
    const now = built.zoomY()
    if (now === last) return now
    last = now
  }
  throw new Error('SK-16a had not stopped after 30 presses')
}

describe('ZE-3 / ZE-4 -- at the ceiling a zoom-in input writes nothing', () => {
  it('premise: the raise stops at the text side of the FR-016 ceiling in this window', () => {
    expect(ceilingReachedBySk16a()).toBeCloseTo(TEXT_SIDE_CEILING, 6)
  })

  it.each(ZOOM_IN_INPUTS)(
    '拡げる入力（`MK-4` の拡げる向き、`IC-15`、`SK-16a`）で、本要求の上限で止めた値がいまの `zoomY` と等しいときは、`zoomY` を書き換えてはならない（MUST NOT） -- %s',
    (_name, press) => {
      const ceiling = ceilingReachedBySk16a()
      const built = bench(documentOf(FLAT, ceiling))
      press(built)
      expect(built.zoomY(), ZE_3_NO_WRITE_AT_THE_CEILING).toBe(ceiling)
      expect(built.loop.hasUnsavedEdits(), ZE_4_NO_UNSAVED_EDIT).toBe(false)
    },
  )
})

describe('ZE-5 -- the end message', () => {
  it.each(ZOOM_OUT_INPUTS)(
    '`ZE-2` と `ZE-3` のときは、`FR-039` の 表 T-260 のメッセージを出すこと（MUST） -- %s at 0.3 shows one message with the minimum word',
    (_name, press) => {
      const built = bench(documentOf(DEEP, AT_THE_LOWER_END))
      expect(built.messages(), 'premise: no message before a press').toEqual([])
      press(built)
      expect(built.messages(), `${ZE_5_THE_MESSAGE} -- ${ZE_5_ITS_TEXT}`).toEqual([endMessage(AT_THE_LOWER_END, MIN_WORD)])
    },
  )

  it('中身は、`zoomY` に 100 を掛けて小数点以下を四捨五入した数に `%` を付け、`ZE-2` では最小であることを示す語を、`ZE-3` では最大であることを示す語を添えたものとすること（MUST） -- 30% and 176% with the dictionary words', () => {
    const low = bench(documentOf(DEEP, AT_THE_LOWER_END))
    low.send(SK_16C)
    expect(low.messages(), ZE_5_ITS_TEXT).toEqual([`30%${MIN_WORD}`])
    const ceiling = ceilingReachedBySk16a()
    const high = bench(documentOf(FLAT, ceiling))
    high.send(SK_16A)
    expect(high.messages(), ZE_5_ITS_TEXT).toEqual([endMessage(ceiling, MAX_WORD)])
    expect(high.messages(), `${ZE_5_ITS_TEXT} -- the text side ${TEXT_SIDE_CEILING}`).toEqual([`176%${MAX_WORD}`])
  })

  it.each(ZOOM_IN_INPUTS)('%s at the ceiling shows one message with the maximum word', (_name, press) => {
    const ceiling = ceilingReachedBySk16a()
    const built = bench(documentOf(FLAT, ceiling))
    press(built)
    expect(built.messages(), `${ZE_5_THE_MESSAGE} -- ${ZE_5_ITS_TEXT}`).toEqual([endMessage(ceiling, MAX_WORD)])
  })

  it('shows no end message where the row axis is off the end and the press wrote zoomY', () => {
    const built = bench(documentOf(DEEP, 0.5))
    built.send(SK_16C)
    expect(built.messages().filter((one) => one.includes(MIN_WORD) || one.includes(MAX_WORD))).toEqual([])
  })
})

const nextStep = (scale: number): number => DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.indexOf(scale) + 1]!

describe('ZE-5 / SE-3 / SE-4 -- one message shared with the display scale message', () => {
  it('⭐ 消えるとき・続けて押したとき・通知との違いは同表の `SE-3`〜`SE-5` のとおりとし、表示の倍率を示すメッセージと同じ 1 つのメッセージとして扱うこと（MUST） -- a display scale press while the end message stands rewrites the one message', () => {
    const built = bench(documentOf(DEEP, AT_THE_LOWER_END))
    built.send(SK_16C)
    expect(built.messages(), 'premise: the end message stands').toEqual([endMessage(AT_THE_LOWER_END, MIN_WORD)])
    built.send(SK_22)
    expect(built.messages(), ZE_5_ONE_MESSAGE).toEqual([`${nextStep(DEFAULT_DISPLAY_SCALE)}%`])
  })

  it('an end press while the display scale message stands rewrites it to the end message', () => {
    const built = bench(documentOf(DEEP, AT_THE_LOWER_END))
    built.send(SK_22)
    expect(built.messages(), 'premise: the display scale message stands').toEqual([`${nextStep(DEFAULT_DISPLAY_SCALE)}%`])
    built.send(SK_16C)
    expect(built.messages(), ZE_5_ONE_MESSAGE).toEqual([endMessage(AT_THE_LOWER_END, MIN_WORD)])
  })

  it('SE-3: the end message goes by itself after S-244', () => {
    const built = bench(documentOf(DEEP, AT_THE_LOWER_END))
    built.send(SK_16C)
    built.wait(S_244 - 1)
    expect(built.messages(), ZE_5_ONE_MESSAGE).toHaveLength(1)
    built.wait(1)
    expect(built.messages(), ZE_5_ONE_MESSAGE).toEqual([])
  })

  it('SE-4: presses at the end keep one message and count S-244 from the last press', () => {
    const built = bench(documentOf(DEEP, AT_THE_LOWER_END))
    const half = Math.floor(S_244 / 2)
    built.send(SK_16C)
    built.wait(half)
    built.send(SK_16C)
    built.wait(half)
    built.send(SK_16C)
    expect(built.messages(), ZE_5_ONE_MESSAGE).toEqual([endMessage(AT_THE_LOWER_END, MIN_WORD)])
    built.wait(S_244 - 1)
    expect(built.messages(), ZE_5_ONE_MESSAGE).toHaveLength(1)
    built.wait(1)
    expect(built.messages(), ZE_5_ONE_MESSAGE).toEqual([])
  })
})

describe('ZE-5 / SE-5 -- the end message is not a notice', () => {
  it('adds nothing to the notices the screen view carries', () => {
    const built = bench(documentOf(DEEP, AT_THE_LOWER_END))
    const before = built.notices()
    built.send(SK_16C)
    expect(built.messages(), 'premise: the message stands').toHaveLength(1)
    expect(built.notices(), ZE_5_ONE_MESSAGE).toBe(before)
  })

  it('is not taken away by Esc', () => {
    const built = bench(documentOf(DEEP, AT_THE_LOWER_END))
    built.send(SK_16C)
    built.send(ESC)
    expect(built.messages(), ZE_5_ONE_MESSAGE).toEqual([endMessage(AT_THE_LOWER_END, MIN_WORD)])
  })

  it('lets Esc dismiss a standing notice and leaves the end message', () => {
    const built = bench(documentOf(DEEP, AT_THE_LOWER_END))
    built.loop.raiseStartupNotice('RS-25')
    built.wait(0)
    expect(built.notices(), 'premise: one notice stands').toBe(1)
    built.send(SK_16C)
    built.send(ESC)
    expect(built.notices(), 'Esc takes the notice (SK-19 / IN-4)').toBe(0)
    expect(built.messages(), ZE_5_ONE_MESSAGE).toEqual([endMessage(AT_THE_LOWER_END, MIN_WORD)])
  })
})

describe('T-262 is not applied to MK-2', () => {
  it('⚠️ 本表は `MK-2`（両軸のズーム）に当てない -- Ctrl + wheel at the row-axis lower end still writes zoomX, by the same factor as zoomY, and shows no message', () => {
    const built = bench(documentOf(DEEP, AT_THE_LOWER_END))
    built.wheel({ ctrl: true }, OUT)
    expect(built.zoomX(), T_262_NOT_FOR_MK_2).not.toBe(1)
    expect(built.zoomY() / AT_THE_LOWER_END, 'MK-2: both axes by the same factor').toBeCloseTo(built.zoomX(), 10)
    expect(built.messages(), T_262_NOT_FOR_MK_2).toEqual([])
  })
})

describe('CR-423 section 9 -- returned questions', () => {
  it.skip('the zoomY a fit-all writes when it picks depth 1 -- open: PND-204 (CR-423 question 1)', () => {})
  it.skip('whether an IC-14 / IC-15 pressed at an end also raises the FR-029 reason notice beside the message -- open: CR-423 question 2', () => {})
  it.skip('a zoom-in from above the row-axis ceiling -- open: DFC-641 item 1 (CR-423 question 3)', () => {})
  it.skip('whether a row-axis press that did change zoomY shows a message -- open: CR-423 question 4', () => {})
})
