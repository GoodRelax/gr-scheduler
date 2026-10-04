// CR-577 spec-only cases: a row-axis zoom-in below the FR-094 floor always changes the picture (T-262 ZE-6).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { documentFromMspdi } from '../../src/adapter/document-codec/mspdi-codec'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  WheelInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'
import { selfAndDescendants, stage as fakeBrowser, wiringOf, type FakeElement } from '../fixtures/fake-browser'
import { specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const ZE_6_RULE =
  '⭐ いまの `zoomY` で `ZE-1` の ① が成り立つとき、拡げる入力（表 T-023 の `MK-4` の拡げる向き、`_assets/tbl-glossary.md` の 表 T-109 の `IC-15`、表 T-036 の `SK-16a`）を受けたら、次の ① と ② のうち小さいほうを目標とし、`S-53` で刻んだ値と目標のうち大きいほうを書くこと（MUST）。'
const ZE_6_ONE =
  '① いまの `zoomY` より大きい、`FR-018` のしきい値（`_assets/tbl-settings.md` の 表 T-205 の `S-87` × `S-88`^(深さ − 2)）のうち、`FR-018` が描く行がいまと変わる最小のもの —— 描く行が変わらないしきい値は数えない。'
const ZE_6_TWO = '② `ZE-1` の ① が成り立たなくなる境目の倍率（表 T-201 の `S-6` ÷ `S-5` ÷ `S-4`）に `S-53` を掛けた値。'
const ZE_6_CLAMP = '書く値は本要求の上限で止めること（MUST）。'
const ZE_6_EQUAL = '止めた値がいまの `zoomY` と等しいときは `ZE-3` に従う。'
const ZE_6_NOT_MK_2 = '⛔ `MK-2` には当てない（表の後の注のとおり）'
const ZE_1_ONE =
  '① 形状の比を掛ける前の予定の縦幅が `FR-094` の床で止まっている —— `_assets/tbl-settings.md` の 表 T-201 の `S-4` × `zoomY` が、同表の `S-4` の下限（`S-6` ÷ `S-5`）以下である。'
const ZE_3_NO_WRITE =
  '拡げる入力（`MK-4` の拡げる向き、`IC-15`、`SK-16a`）で、本要求の上限で止めた値がいまの `zoomY` と等しいときは、`zoomY` を書き換えてはならない（MUST NOT）'
const ZE_4_NO_UNSAVED = '`ZE-2` と `ZE-3` で書き換えないときは、未保存の編集を立ててはならない（MUST NOT）'
const ZE_5_MESSAGE = '`ZE-2` と `ZE-3` のときは、`FR-039` の 表 T-260 のメッセージを出すこと（MUST）。'
const ZE_5_TEXT =
  '中身は、`zoomY` に 100 を掛けて小数点以下を四捨五入した数に `%` を付け、`ZE-2` では最小であることを示す語を、`ZE-3` では最大であることを示す語を添えたものとすること（MUST）'
const ZE_2_NO_WRITE =
  '端にあるときに縮める入力（表 T-023 の `MK-4` の縮める向き、`_assets/tbl-glossary.md` の 表 T-109 の `IC-14`、表 T-036 の `SK-16c`）を受けたら、`zoomY` を書き換えてはならない（MUST NOT）。'
const FR_016_ZE_6 = '⚠️ 行の軸の床より下で拡げるときは、表 T-262 の `ZE-6` が書く値を決める。'
const FR_016_ONE_NOTCH = '**1 ノッチで動く倍率は表 T-201 の `S-53` に従うこと。**'
const FR_016_CEILING_START_FREE = '⭐ 行の軸の上限は、拡大を始めた倍率に依らないこと（MUST）'
const FR_018_REPEAT =
  '入口を押し続けたときは、`_assets/tbl-settings.md` の 表 T-206 の `S-172` が定める待ち時間ののち、同表の `S-173` が定める間隔で倍率を刻み続けること（MUST）。'
const FR_018_ZE_6_HELD = '⚠️ 表 T-262 の `ZE-6` は 1 回押しにも押し続けにも同じく当たる'
const T_262_NOT_MK_2 = '⚠️ 本表は `MK-2`（両軸のズーム）に当てない'

describe('CR-577 -- the manuscript these cases are driven by', () => {
  it.each([
    ['ZE-6 (MUST) -- the rule', ZE_6_RULE],
    ['ZE-6 -- target (1)', ZE_6_ONE],
    ['ZE-6 -- target (2)', ZE_6_TWO],
    ['ZE-6 (MUST) -- clamped to the ceiling', ZE_6_CLAMP],
    ['ZE-6 -- an unchanged clamp falls to ZE-3', ZE_6_EQUAL],
    ['ZE-6 (MUST NOT) -- not MK-2', ZE_6_NOT_MK_2],
    ['ZE-1 (1)', ZE_1_ONE],
    ['ZE-3 (MUST NOT)', ZE_3_NO_WRITE],
    ['ZE-4 (MUST NOT)', ZE_4_NO_UNSAVED],
    ['ZE-5 (MUST)', ZE_5_MESSAGE],
    ['ZE-5 (MUST) -- text', ZE_5_TEXT],
    ['ZE-2 (MUST NOT)', ZE_2_NO_WRITE],
    ['FR-016 -- ZE-6 decides below the floor', FR_016_ZE_6],
    ['FR-016 -- one notch is S-53', FR_016_ONE_NOTCH],
    ['FR-016 (MUST) -- the ceiling does not depend on the start', FR_016_CEILING_START_FREE],
    ['FR-018 (MUST) -- the hold repeats', FR_018_REPEAT],
    ['FR-018 -- ZE-6 applies to a hold too', FR_018_ZE_6_HELD],
    ['T-262 note -- not MK-2', T_262_NOT_MK_2],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-262 holds ZE-6', () => {
    expect(specTable('T-262').rows.map((row) => row.id)).toContain('ZE-6')
  })
})

interface SettingRow {
  readonly id: string
  readonly default?: { readonly num?: string }
  readonly value?: { readonly num?: string }
}

const SETTING_ROWS: readonly SettingRow[] = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'settings.json'), 'utf8')) as {
    blocks: { rows?: SettingRow[] }[]
  }
).blocks.flatMap((block) => block.rows ?? [])

function setting(id: string): number {
  const row = SETTING_ROWS.find((one) => one.id === id)
  const value = Number(row?.default?.num ?? row?.value?.num ?? Number.NaN)
  if (!Number.isFinite(value)) throw new Error(`settings.json holds no number for ${id}`)
  return value
}

const S_4 = setting('S-4')
const S_5 = setting('S-5')
const S_6 = setting('S-6')
const S_53 = setting('S-53')
const S_54 = setting('S-54')
const S_87 = setting('S-87')
const S_88 = setting('S-88')
const S_125 = setting('S-125')
const S_172 = setting('S-172')
const S_173 = setting('S-173')

// see ZE-1, FR-094
const isOnTheFloor = (zoomY: number): boolean => S_4 * zoomY <= S_6 / S_5
const PAST_THE_FLOOR = (S_6 / S_5 / S_4) * S_53
// see FR-018
const thresholdOf = (depth: number): number => S_87 * S_88 ** (depth - 2)

interface RowSpec {
  readonly id: string
  readonly parentId: string | null
  readonly treeState?: 'auto' | 'collapsed' | 'expanded' | 'temporarilyExpanded' | 'hidden'
}

const OPEN_STATES = new Set(['expanded', 'temporarilyExpanded'])

// see FR-018, T-329
function drawnRowsAt(rows: readonly RowSpec[], levelZero: string, zoomY: number): readonly string[] {
  if (levelZero === 'collapsed') return []
  const byId = new Map(rows.map((one) => [one.id, one]))
  const stateOf = (one: RowSpec): string => one.treeState ?? 'auto'
  const ancestorsOf = (one: RowSpec): RowSpec[] => {
    const out: RowSpec[] = []
    for (let up = one.parentId === null ? undefined : byId.get(one.parentId); up !== undefined; ) {
      out.push(up)
      up = up.parentId === null ? undefined : byId.get(up.parentId)
    }
    return out
  }
  const allowed = (one: RowSpec): boolean =>
    stateOf(one) !== 'hidden' && ancestorsOf(one).every((up) => stateOf(up) !== 'collapsed' && stateOf(up) !== 'hidden')
  const depthOf = (one: RowSpec): number => ancestorsOf(one).length + 1
  let drawDepth = 1
  for (let depth = 2; depth <= S_125; depth += 1) if (thresholdOf(depth) <= zoomY) drawDepth = depth
  const descendantsOf = (one: RowSpec): RowSpec[] => rows.filter((other) => ancestorsOf(other).includes(one))
  return rows
    .filter((one) => {
      if (!allowed(one)) return false
      const byDepth = Math.min(depthOf(one), S_125) <= drawDepth
      const parent = one.parentId === null ? undefined : byId.get(one.parentId)
      const byOpenParent = parent !== undefined && OPEN_STATES.has(stateOf(parent))
      const byOpenBelow = [one, ...descendantsOf(one)].some((each) => allowed(each) && OPEN_STATES.has(stateOf(each)))
      return byDepth || byOpenParent || byOpenBelow
    })
    .map((one) => one.id)
    .sort()
}

const sameRows = (a: readonly string[], b: readonly string[]): boolean => JSON.stringify(a) === JSON.stringify(b)

// see ZE-6
function targetOf(rows: readonly RowSpec[], levelZero: string, zoomY: number): number {
  const now = drawnRowsAt(rows, levelZero, zoomY)
  let one = Number.POSITIVE_INFINITY
  for (let depth = 2; depth <= S_125; depth += 1) {
    const threshold = thresholdOf(depth)
    if (threshold > zoomY && !sameRows(drawnRowsAt(rows, levelZero, threshold), now)) one = Math.min(one, threshold)
  }
  return Math.min(one, PAST_THE_FLOOR)
}

// see ZE-6, FR-016
const ze6Write = (rows: readonly RowSpec[], levelZero: string, zoomY: number, ceiling: number): number =>
  Math.min(Math.max(zoomY * S_53, targetOf(rows, levelZero, zoomY)), ceiling)

const TEMPLATE_TEXT = readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8')
const TEMPLATE = JSON.parse(TEMPLATE_TEXT) as Record<string, any>

const idOf = (n: number): string => `cccccccc-0000-4000-8000-${String(n).padStart(12, '0')}`
const A = idOf(1)
const B = idOf(2)
const C = idOf(3)
const D = idOf(4)
const E = idOf(5)
const Z = idOf(9)

const SHALLOW: readonly RowSpec[] = [
  { id: A, parentId: null },
  { id: Z, parentId: null },
]
const DEEP_3: readonly RowSpec[] = [
  { id: A, parentId: null },
  { id: B, parentId: A },
  { id: C, parentId: B },
  { id: Z, parentId: null },
]
const LADDER: readonly RowSpec[] = [
  { id: A, parentId: null },
  { id: B, parentId: A },
  { id: C, parentId: B },
  { id: D, parentId: C },
  { id: E, parentId: D },
  { id: Z, parentId: null },
]
const DEPTH_3_UNDER = (treeState: NonNullable<RowSpec['treeState']>): readonly RowSpec[] => [
  { id: A, parentId: null },
  { id: B, parentId: A, treeState },
  { id: C, parentId: B },
  { id: Z, parentId: null },
]

function taskOf(uid: number): Record<string, unknown> {
  return {
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
  }
}

// WHY: the `stacked` extra tasks share the first row's dates, so FR-003 stacks them into one tall band;
// that band is how a case gets an FR-016 ceiling below the ZE-6 target without typing a ceiling.
function documentOf(rows: readonly RowSpec[], zoomY: number, stacked = 0): Document {
  const members = rows.map((one, index) => ({ taskUid: index + 1, groupId: one.id }))
  const extra = Array.from({ length: stacked }, (_unused, index) => rows.length + index + 1)
  return {
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 1000, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: [...rows.map((_one, index) => taskOf(index + 1)), ...extra.map((uid) => taskOf(uid))],
      resources: [],
      assignments: [],
      taskGroups: rows.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: `Row${index + 1}`,
        derivedFromTaskUid: null,
        order: index,
        treeState: one.treeState ?? 'auto',
        editGroup: null,
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: [...members, ...extra.map((uid) => ({ taskUid: uid, groupId: rows[0]!.id }))],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      pinnedGroupIds: [],
      displayScale: DEFAULT_DISPLAY_SCALE,
      scrollDate: '2026-04-01',
      scrollGroupId: rows[0]!.id,
      scrollGroupOffset: 0,
      zoomX: 1,
      zoomY,
      levelZeroTreeState: 'auto',
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const ERP_TEXT = readFileSync(join(process.cwd(), 'sample-schedule', 'sample-large-erp-program.ja.xml'), 'utf8')

// WHY: null leaves the sample as imported, so OP-10 opens it at the FR-055 fit (T1); a number also
// places the view on the first row, since a null place would refit and drop the zoom given.
function erpDocument(zoomY: number | null): Document {
  const current = documentFromJson(TEMPLATE_TEXT)
  if (!current.ok) throw new Error('the bundled template is not a GRS JSON document')
  const read = documentFromMspdi(ERP_TEXT, current.document)
  if (!read.ok) throw new Error(`the ERP sample was refused: ${JSON.stringify(read.faults)}`)
  const document = read.document as unknown as Record<string, any>
  if (zoomY === null) return document as unknown as Document
  const tasks = document.schedule.tasks as readonly { start: string | null }[]
  const first = tasks.map((one) => one.start ?? '').filter((one) => one !== '').sort()[0] ?? '2026-04-01'
  const place = { scrollDate: first.slice(0, 10), scrollGroupId: document.schedule.taskGroups[0].id, scrollGroupOffset: 0 }
  return { ...document, documentSettings: { ...document.documentSettings, ...place, zoomY } } as unknown as Document
}

const rowsOf = (document: Document): readonly RowSpec[] =>
  (document.schedule as unknown as { taskGroups: RowSpec[] }).taskGroups.map((one) => ({
    id: one.id,
    parentId: one.parentId,
    treeState: one.treeState ?? 'auto',
  }))
const levelZeroOf = (document: Document): string =>
  String((document.documentSettings as unknown as Record<string, unknown>)['levelZeroTreeState'] ?? 'auto')

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }
const THEME: ScreenTheme = { preference: 'light', hue: 214 }

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
    now: Date.UTC(2026, 8, 27, 3, 0, 0),
  })
})

afterEach(() => {
  waiting.splice(0, waiting.length)
  vi.useRealTimers()
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

const MODS = (part: Partial<InputModifiers> = {}): InputModifiers => ({ ctrl: false, shift: false, alt: false, meta: false, ...part })

// see T-036
function keyOfRow(id: string): KeyInput {
  const row = specTable('T-036').rows.find((one) => one.id === id)
  const spans = [...(row?.by['割当'] ?? '').matchAll(/`([^`]+)`/g)].map((one) => one[1]!)
  if (spans.length === 0) throw new Error(`table T-036 ${id} states no key`)
  const held = new Set(spans.slice(0, -1))
  return {
    kind: 'key',
    key: spans[spans.length - 1]!,
    modifiers: { ctrl: held.has('Ctrl'), shift: held.has('Shift'), alt: held.has('Alt'), meta: false },
  }
}

const SK_16A = keyOfRow('SK-16a')
const SK_16C = keyOfRow('SK-16c')

interface ScaleEcho {
  readonly end: string
  readonly text: Readonly<Record<'ja' | 'en', string>>
}

const SCALE_ECHO: readonly ScaleEcho[] = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
    scaleEcho: ScaleEcho[]
  }
).scaleEcho
const MAX_WORD = SCALE_ECHO.find((one) => one.end === 'max')?.text.ja ?? 'no scaleEcho max word'
// see ZE-5
const endMessage = (zoomY: number, word: string): string => `${Math.round(zoomY * 100)}%${word}`

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
  one.getAttribute('hidden') === null && !/display\s*:\s*none/.test(one.getAttribute('style') ?? '') && one.textContent.trim() !== ''

interface Bench {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  pressEntrance(icon: string): void
  holdEntrance(icon: string): () => void
  wheel(part: Partial<InputModifiers>, notches: number): void
  wait(ms: number): void
  messages(): readonly string[]
  zoomX(): number
  zoomY(): number
  zoomYDrawn(): number
  drawnRows(): readonly string[]
  picture(): string
  tallestBand(): number
  rowAreaHeight(): number
}

// WHY: one queue for every bench of a case; a queue per bench loses the frames of an earlier bench
// once a later one (a ceiling probe) replaces requestAnimationFrame.
const waiting: ((time: number) => void)[] = []

function bench(document: Document): Bench {
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(performance.now())
    }
  }
  const browser = fakeBrowser({ 'App Header': 37 })
  const real = domScreenSurface({ ...wiringOf(browser, THEME), readClockMs: () => Date.now() })
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => real.showScreenView(view),
    readDialogueInput: () => real.readDialogueInput(),
    readFieldCommit: () => real.readFieldCommit(),
    readScreenPartAt: () => part,
  }
  const loop = frameLoop({ showSvg: () => undefined } as never, document, SCREEN, { surface, language: 'ja' })
  drain()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  const aimAt = (icon: string): void => {
    part = { part: 'App Header', entry: icon, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as ScreenPart
  }
  const frame = () => {
    const now = loop.current()
    if (now === null) throw new Error('the loop has drawn no frame')
    return now
  }
  const drawnRows = (): readonly string[] => [...new Set(frame().layout.rows.map((one) => one.groupId))].sort()
  const planHeights = (): readonly string[] =>
    [
      ...new Set(
        frame().geometry.tasks.flatMap((one) => {
          if (one.plan === null || one.plan.form !== 'outline') return []
          const ys = one.plan.points.map((point) => point.y)
          return [(Math.max(...ys) - Math.min(...ys)).toFixed(6)]
        }),
      ),
    ].sort()
  return {
    loop,
    send,
    pressEntrance: (icon) => {
      aimAt(icon)
      loop.receiveInput(pointer('down'))
      loop.receiveInput(pointer('up'))
      part = null
      drain()
    },
    holdEntrance: (icon) => {
      aimAt(icon)
      loop.receiveInput(pointer('down'))
      drain()
      return () => {
        loop.receiveInput(pointer('up'))
        part = null
        drain()
      }
    },
    wheel: (modifiers, notches) => {
      const area = frame().regions.rowArea
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
    zoomX: () => loop.document().documentSettings.zoomX as number,
    zoomY: () => loop.document().documentSettings.zoomY as number,
    zoomYDrawn: () => frame().settingsMeasuredWith.zoomY as number,
    drawnRows,
    picture: () =>
      JSON.stringify({ rows: drawnRows(), plans: planHeights(), bands: frame().layout.rows.map((one) => one.height.toFixed(6)) }),
    tallestBand: () => Math.max(...frame().layout.rows.map((one) => one.height)),
    rowAreaHeight: () => frame().regions.rowArea.height,
  }
}

// WHY: the notch sign of MK-4 / MK-2 is not in the manuscript; the T7 cases prove -1 raises zoomY
// off the floor, so a wrong sign reads red there first.
const IN = -1
const OUT = 1

type Press = readonly [string, (built: Bench) => void]

const ZOOM_IN: readonly Press[] = [
  ['IC-15', (built) => built.pressEntrance('IC-15')],
  ['SK-16a', (built) => built.send(SK_16A)],
  ['MK-4 (Alt + wheel, raising)', (built) => built.wheel({ alt: true }, IN)],
]

const ZOOM_OUT: readonly Press[] = [
  ['IC-14', (built) => built.pressEntrance('IC-14')],
  ['SK-16c', (built) => built.send(SK_16C)],
  ['MK-4 (Alt + wheel, lowering)', (built) => built.wheel({ alt: true }, OUT)],
]

const ABOVE_THE_FLOOR = 1.2
const JUST_OFF_THE_FLOOR = 1

// see FR-016, ZE-3
function ceilingFrom(document: Document): number {
  const built = bench(document)
  let last = built.zoomY()
  for (let press = 0; press < 60; press += 1) {
    built.send(SK_16A)
    const now = built.zoomY()
    if (now === last) return now
    last = now
  }
  throw new Error('SK-16a had not stopped after 60 presses')
}

const ceilings = new Map<string, number>()
const ceilingOf = (name: string, make: (zoomY: number) => Document): number => {
  const known = ceilings.get(name)
  if (known !== undefined) return known
  const found = ceilingFrom(make(ABOVE_THE_FLOOR))
  ceilings.set(name, found)
  return found
}

interface Scene {
  readonly name: string
  readonly make: (zoomY: number) => Document
}

const SCENES: readonly Scene[] = [
  { name: 'depth 1 only', make: (zoomY) => documentOf(SHALLOW, zoomY) },
  { name: 'depth 1 .. 3', make: (zoomY) => documentOf(DEEP_3, zoomY) },
  { name: 'depth 1 .. S-125', make: (zoomY) => documentOf(LADDER, zoomY) },
  { name: 'sample-large-erp-program.ja.xml', make: erpDocument },
]
const sceneNamed = (name: string): Scene => SCENES.find((one) => one.name === name)!

function expectedAfterOnePress(scene: Scene, zoomY: number): number {
  const document = scene.make(zoomY)
  return ze6Write(rowsOf(document), levelZeroOf(document), zoomY, ceilingOf(scene.name, scene.make))
}

describe('the scenes stand where the manuscript puts them', () => {
  it('premise: the floor border is below 1 and the depth-2 threshold is on the floor', () => {
    expect(isOnTheFloor(thresholdOf(2))).toBe(true)
    expect(isOnTheFloor(JUST_OFF_THE_FLOOR)).toBe(false)
    expect(PAST_THE_FLOOR).toBeLessThan(ceilingOf('depth 1 only', sceneNamed('depth 1 only').make))
  })

  it.each(SCENES.map((one) => [one.name, one] as const))(
    'premise: %s -- the drawn rows at zoomY 0.3 are the ones table T-329 names',
    (_name, scene) => {
      const document = scene.make(0.3)
      const built = bench(document)
      expect(built.drawnRows()).toEqual(drawnRowsAt(rowsOf(document), levelZeroOf(document), 0.3))
    },
  )
})

describe('T1 / T2 -- sample-large-erp-program.ja.xml opened at the FR-055 fit', () => {
  const erp = sceneNamed('sample-large-erp-program.ja.xml')
  // WHY: the fit OP-10 opens at is not in the stored zoomY; IC-10 is the same FR-055 fit and writes it,
  // so the case knows the zoomY the press starts from.
  const fitOf = (): number => {
    const probe = bench(erpDocument(null))
    probe.pressEntrance('IC-10')
    return probe.zoomY()
  }

  it(`${ZE_6_RULE} -- T1: one IC-15 press from the fit writes the larger of the S-53 step and the target`, () => {
    const fit = fitOf()
    expect(isOnTheFloor(fit), 'premise: the fit is on the floor').toBe(true)
    expect(fit, 'premise: the fit is below the depth-2 threshold').toBeLessThan(thresholdOf(2))
    const built = bench(erpDocument(null))
    const before = built.drawnRows()
    built.pressEntrance('IC-15')
    expect(built.zoomY(), ZE_6_RULE).toBeCloseTo(Math.max(fit * S_53, thresholdOf(2)), 12)
    expect(built.zoomY()).toBeCloseTo(expectedAfterOnePress(erp, fit), 12)
    expect(built.drawnRows().length, 'depth-2 rows appear').toBeGreaterThan(before.length)
  })

  it(`${ZE_6_ONE} -- T2: the second press goes to the next threshold that changes the rows, or (2)`, () => {
    const built = bench(erpDocument(null))
    built.pressEntrance('IC-15')
    const second = built.zoomY()
    const expected = expectedAfterOnePress(erp, second)
    const before = built.picture()
    built.pressEntrance('IC-15')
    expect(built.zoomY(), `${ZE_6_ONE} ${ZE_6_TWO}`).toBeCloseTo(expected, 12)
    expect(built.picture(), 'the picture changed').not.toBe(before)
  })
})

describe('T3 -- a document of depth-1 rows at zoomY 0.3', () => {
  it.each(ZOOM_IN)(`${ZE_6_TWO} -- %s writes (S-6 / S-5 / S-4) x S-53 and leaves the floor`, (_name, press) => {
    const built = bench(documentOf(SHALLOW, 0.3))
    const before = built.picture()
    press(built)
    expect(built.zoomY(), ZE_6_RULE).toBeCloseTo(PAST_THE_FLOOR, 12)
    expect(isOnTheFloor(built.zoomY()), ZE_1_ONE).toBe(false)
    expect(built.picture(), 'the plan height is off the floor').not.toBe(before)
  })
})

const T4_STARTS: readonly number[] = [S_54, 0.2, 0.291, 0.3, thresholdOf(2), thresholdOf(3), thresholdOf(4), 0.9]

describe('T4 -- every press below the floor changes the picture', () => {
  const cases = SCENES.flatMap((scene) =>
    T4_STARTS.filter((start) => isOnTheFloor(start)).map((start) => [scene.name, start, scene] as const),
  )
  it.each(cases)(`${FR_016_ZE_6} -- %s from zoomY %d, IC-15 until off the floor`, (_name, start, scene) => {
    const built = bench(scene.make(start))
    for (let press = 0; press < 12 && isOnTheFloor(built.zoomY()); press += 1) {
      const from = built.zoomY()
      const before = built.picture()
      built.pressEntrance('IC-15')
      expect(built.zoomY(), `${ZE_6_RULE} -- from ${from}`).toBeCloseTo(expectedAfterOnePress(scene, from), 12)
      expect(built.picture(), `the picture did not change on the press from ${from}`).not.toBe(before)
    }
    expect(isOnTheFloor(built.zoomY()), 'left the floor within 12 presses').toBe(false)
  })
})

describe('T5 -- a threshold that changes no drawn row is not counted', () => {
  const START = 0.35

  it.each([
    ['collapsed', PAST_THE_FLOOR],
    ['expanded', PAST_THE_FLOOR],
    ['auto', thresholdOf(3)],
  ] as const)(`${ZE_6_ONE} -- the depth-3 row under a %s parent`, (state, expected) => {
    expect(thresholdOf(2), 'premise: depth 2 is drawn at the start').toBeLessThanOrEqual(START)
    const rows = DEPTH_3_UNDER(state)
    const built = bench(documentOf(rows, START))
    expect(built.drawnRows(), 'premise: T-329').toEqual(drawnRowsAt(rows, 'auto', START))
    const before = built.picture()
    built.pressEntrance('IC-15')
    expect(built.zoomY(), ZE_6_ONE).toBeCloseTo(expected, 12)
    expect(built.picture()).not.toBe(before)
  })
})

describe('T6 -- the FR-016 ceiling below the ZE-6 target', () => {
  const stackedBelowTarget = (): { readonly stacked: number; readonly ceiling: number } => {
    for (let stacked = 0; stacked <= 60; stacked += 1) {
      const probe = bench(documentOf(SHALLOW, JUST_OFF_THE_FLOOR, stacked))
      probe.send(SK_16A)
      const moved = probe.zoomY()
      if (moved <= JUST_OFF_THE_FLOOR) continue
      probe.send(SK_16A)
      if (probe.zoomY() === moved && moved < PAST_THE_FLOOR) return { stacked, ceiling: moved }
    }
    throw new Error('no stacked band put the ceiling between 1 and the ZE-6 target (2)')
  }

  const stackedAtTheFloor = (): number => {
    for (let stacked = 0; stacked <= 80; stacked += 1) {
      const probe = bench(documentOf(SHALLOW, S_54, stacked))
      if (probe.tallestBand() >= probe.rowAreaHeight()) return stacked
    }
    throw new Error('no stacked band reached the row area at S-54')
  }

  it.each([0.3, 0.5])(`${ZE_6_CLAMP} -- from zoomY %d the write is the ceiling, not the target`, (start) => {
    const { stacked, ceiling } = stackedBelowTarget()
    const built = bench(documentOf(SHALLOW, start, stacked))
    built.pressEntrance('IC-15')
    expect(built.zoomY(), `${ZE_6_CLAMP} ${FR_016_CEILING_START_FREE}`).toBeCloseTo(ceiling, 12)
  })

  it(`${ZE_6_EQUAL} -- the press after the clamped write is the ZE-3 press`, () => {
    const { stacked } = stackedBelowTarget()
    const built = bench(documentOf(SHALLOW, 0.3, stacked))
    built.pressEntrance('IC-15')
    const clamped = built.zoomY()
    built.pressEntrance('IC-15')
    expect(built.zoomY(), ZE_3_NO_WRITE).toBe(clamped)
    expect(built.messages(), ZE_5_TEXT).toEqual([endMessage(clamped, MAX_WORD)])
  })

  it.each(ZOOM_IN)(`${ZE_6_EQUAL} -- %s at S-54 where the band already fills the row area`, (_name, press) => {
    const built = bench(documentOf(SHALLOW, S_54, stackedAtTheFloor()))
    expect(isOnTheFloor(S_54), 'premise: ZE-1 (1) holds').toBe(true)
    press(built)
    expect(built.zoomY(), ZE_3_NO_WRITE).toBe(S_54)
    expect(built.loop.hasUnsavedEdits(), ZE_4_NO_UNSAVED).toBe(false)
    expect(built.messages(), `${ZE_5_MESSAGE} ${ZE_5_TEXT}`).toEqual([endMessage(S_54, MAX_WORD)])
  })
})

describe('T7 -- above the floor ZE-6 does not apply', () => {
  it.each(ZOOM_IN)(`${FR_016_ONE_NOTCH} -- %s at zoomY 1.2 writes one S-53 step`, (_name, press) => {
    expect(isOnTheFloor(ABOVE_THE_FLOOR), 'premise: off the floor').toBe(false)
    const built = bench(documentOf(DEEP_3, ABOVE_THE_FLOOR))
    press(built)
    expect(built.zoomY()).toBeCloseTo(ABOVE_THE_FLOOR * S_53, 12)
  })
})

describe('T8 -- MK-2 below the floor', () => {
  it(`${ZE_6_NOT_MK_2} -- Ctrl + wheel at zoomY 0.3 steps both axes by S-53`, () => {
    const built = bench(documentOf(SHALLOW, 0.3))
    built.wheel({ ctrl: true }, IN)
    expect(built.zoomY(), `${ZE_6_NOT_MK_2} ${FR_016_ONE_NOTCH}`).toBeCloseTo(0.3 * S_53, 12)
    expect(built.zoomX(), T_262_NOT_MK_2).toBeCloseTo(S_53, 12)
  })
})

describe('T9 -- the shrinking inputs below the floor are unchanged', () => {
  it.each(ZOOM_OUT)(`${FR_016_ONE_NOTCH} -- %s off the ZE-1 end writes zoomY / S-53`, (_name, press) => {
    const built = bench(documentOf(DEEP_3, 0.5))
    press(built)
    expect(built.zoomY()).toBeCloseTo(0.5 / S_53, 12)
  })

  it.each(ZOOM_OUT)(`${ZE_2_NO_WRITE} -- %s at the end`, (_name, press) => {
    const built = bench(documentOf(SHALLOW, 0.3))
    press(built)
    expect(built.zoomY()).toBe(0.3)
  })
})

describe('T10 -- holding IC-15', () => {
  it(`${FR_018_ZE_6_HELD} -- each repeat after S-172, then every S-173, goes to the ZE-6 value`, () => {
    const scene = sceneNamed('depth 1 .. S-125')
    const built = bench(scene.make(0.2))
    const release = built.holdEntrance('IC-15')
    let previous = built.zoomY()
    expect([0.2, expectedAfterOnePress(scene, 0.2)], 'the press itself steps at most once').toContainEqual(previous)
    const seen: number[] = []
    for (let tick = 0; tick < 5; tick += 1) {
      const expected = isOnTheFloor(previous)
        ? expectedAfterOnePress(scene, previous)
        : Math.min(previous * S_53, ceilingOf(scene.name, scene.make))
      built.wait(tick === 0 ? S_172 : S_173)
      expect(built.zoomY(), `${FR_018_REPEAT} -- repeat ${tick + 1} from ${previous}`).toBeCloseTo(expected, 12)
      previous = built.zoomY()
      seen.push(previous)
    }
    release()
    expect(seen.some((one) => !isOnTheFloor(one)), 'premise: the hold left the floor').toBe(true)
    expect(seen.filter((one) => Math.abs(one - thresholdOf(3)) < 1e-12), 'the hold stopped on the depth-3 threshold').toHaveLength(1)
  })
})
