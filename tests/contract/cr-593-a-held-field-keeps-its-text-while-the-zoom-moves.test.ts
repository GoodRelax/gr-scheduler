// CR-593 spec-only cases, shell level: a half-typed field lets the zoom and scroll move and nothing else.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  WheelInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { byRole, selfAndDescendants, surfaceOf, wire, type FakeElement, type FakeEvent, type Stage } from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const WS_2_EXEMPT =
  '⚠️ 編集入力の確定前でも、`01-04-requirements.md` の 表 T-027 の `UN-8`（ズーム・スクロール・パン）だけから成る書き込みは拒否しない'
const WS_2_UNTOUCHED = '確定される欄の値にも取り消しの段にも触れず'
const WS_2_WHY_MH_4 = '同書の 表 T-338 の `MH-4` が欄を編集しながら倍率を変えることを求める'
const AG_9_EDITING = '人が編集入力を確定していない間（プロパティパネルで入力中など）も同じく拒否すること（MUST）'
const MH_4_WHILE_EDITING = '欄を編集しているあいだも書き換えること（MUST）。'
const MH_4_KEEP_INPUT = '⛔ 編集している入力の字と焦点を動かしてはならない（MUST NOT）'

describe('CR-593 shell -- the manuscript these cases are driven by', () => {
  it.each([WS_2_EXEMPT, WS_2_UNTOUCHED, WS_2_WHY_MH_4])('05-07 still says it, word for word: %s', (clause) => {
    expect(DESIGN).toContain(clause)
  })

  it.each([AG_9_EDITING, MH_4_WHILE_EDITING, MH_4_KEEP_INPUT])('01-04 still says it, word for word: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>
const BUILT_VERSION = TEMPLATE.schemaVersion as string

const A = 'cccccccc-0000-4000-8000-000000000001'
const B = 'cccccccc-0000-4000-8000-000000000002'

function taskOf(uid: number): Record<string, unknown> {
  return {
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name: `Task${uid}`,
    start: '2026-04-06T08:00:00',
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

function sceneOf(): Document {
  const rows = [A, B]
  const text = JSON.stringify({
    $schema: TEMPLATE['$schema'],
    schemaVersion: BUILT_VERSION,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: rows.map((_one, index) => taskOf(index + 1)),
      resources: [],
      assignments: [],
      taskGroups: rows.map((id, index) => ({
        id,
        parentId: null,
        label: `Row${index + 1}`,
        derivedFromTaskUid: null,
        order: index,
        treeState: 'auto',
        editGroup: null,
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: rows.map((id, index) => ({ taskUid: index + 1, groupId: id })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      scrollDate: '2026-04-01',
      scrollGroupId: A,
      scrollGroupOffset: 0,
      zoomY: 1,
      levelZeroTreeState: 'auto',
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  })
  const read = documentFromJson(text)
  if (!read.ok) throw new Error(`the case document is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const MODS = (part: Partial<InputModifiers> = {}): InputModifiers => ({ ctrl: false, shift: false, alt: false, meta: false, ...part })

const pointerAt = (phase: 'down' | 'up', x: number, y: number, clickCount = 1): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: MODS(),
  clickCount,
})

const partOn = (part: string, entry: string | null, taskGroupId: string | null = null): ScreenPart =>
  ({ part, entry, format: null, taskGroupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null }) as unknown as ScreenPart

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

const SK_19 = keyOfRow('SK-19')

// see U-25
const PROPERTIES_PANEL = bare(specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '')

// see T-108
function kindOf(row: string): string {
  const name = bare(specTable('T-108').rows.find((one) => one.id === row)?.by['確定名'] ?? '')
  if (name === '') throw new Error(`table T-108 has no ${row}`)
  return name
}

// WHY: the same event raiser the cr-582 cases use on this fake.
function raise(built: Stage, node: FakeElement, type: string, extra: Record<string, unknown> = {}): FakeEvent {
  const event = {
    type,
    key: '',
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: null,
    relatedTarget: null,
    defaultPrevented: false,
    preventDefault(): void {
      ;(this as { defaultPrevented: boolean }).defaultPrevented = true
    },
    stopPropagation(): void {},
    ...extra,
  } as unknown as FakeEvent
  let at: FakeElement | null = node
  while (at !== null) {
    for (const one of [...built.world.registrations]) {
      if (one.node === at && one.type === type) {
        ;(event as { currentTarget: FakeElement | null }).currentTarget = at
        one.listener(event)
      }
    }
    at = at.parentNode
  }
  return event
}

interface Bench {
  readonly loop: FrameLoop
  readonly built: Stage
  send(input: HumanInput): void
  drain(): void
  wheel(modifiers: Partial<InputModifiers>, notches: number): void
  openTaskGroup(groupId: string): void
  view(): ScreenView
}

function bench(document: Document): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': SCREEN.appHeaderHeight })
  const drawn = surfaceOf(built)
  const views: ScreenView[] = []
  let aimed: ScreenPart | null = null
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
      drawn.showScreenView(view)
    },
    readDialogueInput: () => drawn.readDialogueInput(),
    readFieldCommit: () => drawn.readFieldCommit(),
    readFieldEditNotices: () => (drawn as unknown as { readFieldEditNotices?: () => unknown[] }).readFieldEditNotices?.() ?? [],
    readScreenPartAt: () => aimed,
  } as unknown as ScreenSurface
  const loop = frameLoop({ showSvg: () => undefined } as never, document, SCREEN, { surface, language: 'ja' })
  drain()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  const view = (): ScreenView => {
    const last = views[views.length - 1]
    if (last === undefined) throw new Error('the loop showed no screen view')
    return last
  }
  return {
    loop,
    built,
    send,
    drain,
    wheel: (modifiers, notches) => {
      const now = loop.current()
      if (now === null) throw new Error('the loop has drawn no frame')
      const area = now.regions.taskGroupArea
      const input: WheelInput = {
        kind: 'wheel',
        x: area.x + area.width / 2,
        y: area.y + area.height / 2,
        modifiers: MODS(modifiers),
        notches,
        scrollPx: { x: notches * 100, y: notches * 100 },
      }
      send(input)
    },
    // see MK-13
    openTaskGroup: (groupId) => {
      const title = view().taskGroupPanel.titles.find((one) => one.groupId === groupId)
      if (title === undefined) throw new Error(`the task group title of ${groupId} is not drawn`)
      const x = title.box.x + title.box.width / 2
      const y = title.box.y + title.box.height / 2
      aimed = partOn('Task Group Panel', null, groupId)
      send(pointerAt('down', x, y))
      send(pointerAt('up', x, y))
      send(pointerAt('down', x, y, 2))
      send(pointerAt('up', x, y, 2))
      aimed = null
      if (view().propertiesPanel === null) throw new Error('premise: MK-13 put the property panel up on the row')
    },
    view,
  }
}

function inputOf(built: Bench, row: string): FakeElement {
  const panel = byRole(built.built.root(), PROPERTIES_PANEL)[0]
  if (panel === undefined) throw new Error('the property panel is not drawn')
  const lines = selfAndDescendants(panel).filter((one) => one.getAttribute('data-field-row') === row)
  const inputs = [...new Set(lines.flatMap((one) => selfAndDescendants(one)))].filter(
    (one) => one.tagName === 'INPUT' || one.tagName === 'TEXTAREA',
  )
  if (inputs.length !== 1) throw new Error(`the ${row} field drew ${inputs.length} inputs`)
  return inputs[0]!
}

function typeInto(built: Bench, row: string, text: string): FakeElement {
  const input = inputOf(built, row)
  input.focus()
  raise(built.built, input, 'focusin')
  input.value = text
  raise(built.built, input, 'input')
  return input
}

// WHY: the task group name field names AT-53, not PR-18 (PR-18 says MK-13 names AT-53); PR-20 is the min height.
const HALF_TYPED: readonly (readonly [string, string])[] = [
  ['AT-53', 'Row1 half-typ'],
  ['PR-20', '37'],
]

const settingsOf = (loop: FrameLoop): Record<string, unknown> => loop.document().documentSettings as unknown as Record<string, unknown>
const scrollOf = (loop: FrameLoop): string => {
  const held = settingsOf(loop)
  return JSON.stringify([held['scrollDate'], held['scrollDayOffset'], held['scrollGroupId'], held['scrollGroupOffset']])
}

function heldOn(row: string, text: string): { readonly built: Bench; readonly input: FakeElement; readonly label: unknown } {
  const built = bench(sceneOf())
  built.openTaskGroup(A)
  const label = built.loop.document().schedule.taskGroups.find((one) => one.id === A)?.label
  const input = typeInto(built, row, text)
  return { built, input, label }
}

function expectTheFieldKept(built: Bench, row: string, input: FakeElement, text: string, label: unknown): void {
  expect(inputOf(built, row), `${MH_4_KEEP_INPUT} -- the same input node`).toBe(input)
  expect(input.isConnected, MH_4_KEEP_INPUT).toBe(true)
  expect(input.value, MH_4_KEEP_INPUT).toBe(text)
  expect(built.built.world.activeElement, MH_4_KEEP_INPUT).toBe(input)
  const group = built.loop.document().schedule.taskGroups.find((one) => one.id === A) as unknown as Record<string, unknown>
  expect([group['label'], group['minHeight']], WS_2_UNTOUCHED).toEqual([label, null])
}

// WHY: the notch sign of MK-4 is not in the manuscript; cr-577 proves -1 raises zoomY.
const IN = -1

describe(`T-067 WS-2 "${WS_2_EXEMPT}" -- through the shell, a half-typed field`, () => {
  it.each(HALF_TYPED)(`%s: Alt + wheel (MK-4) moves zoomY; "${MH_4_KEEP_INPUT}"`, (row, text) => {
    const { built, input, label } = heldOn(row, text)
    const zoomBefore = settingsOf(built.loop)['zoomY']
    built.wheel({ alt: true }, IN)
    expect(settingsOf(built.loop)['zoomY'], WS_2_EXEMPT).not.toBe(zoomBefore)
    expectTheFieldKept(built, row, input, text, label)
  })

  it.each(HALF_TYPED)('%s: Ctrl + Shift + wheel (MK-5) moves the scroll position; the field keeps its text and focus', (row, text) => {
    const calm = bench(sceneOf())
    const calmBefore = scrollOf(calm.loop)
    calm.wheel({ ctrl: true, shift: true }, 1)
    expect(scrollOf(calm.loop), 'premise: MK-5 moves the scroll position with no field held').not.toBe(calmBefore)

    const { built, input, label } = heldOn(row, text)
    const before = scrollOf(built.loop)
    built.wheel({ ctrl: true, shift: true }, 1)
    expect(scrollOf(built.loop), WS_2_EXEMPT).not.toBe(before)
    expectTheFieldKept(built, row, input, text, label)
  })
})

// see AG-9, AG-9a, RS-8
describe(`T-035 AG-9 "${AG_9_EDITING}" -- through the Agent API while a field is half-typed`, () => {
  const agentOf = (built: Bench) =>
    installAgentApi({ ...built.loop.agentApiSeams(), writerName: 'cr-593-tester', schemaVersion: BUILT_VERSION } as never)

  const apply = (built: Bench, commands: readonly Record<string, unknown>[]) => {
    const api = agentOf(built)
    const outcome = api.applyCommands({ readStamp: api.readStamp(), commands: commands as never })
    built.drain()
    return outcome
  }

  // see CM-65, UN-8
  const ZOOM = { kind: kindOf('CM-65'), zoomX: 1, zoomY: 2 }
  // see CM-64, UN-13
  const MONOCHROME = { kind: kindOf('CM-64'), monochrome: true }
  // see CM-1, UN-13
  const TITLE = { kind: kindOf('CM-1'), title: 'CR-593 another title' }

  it.each(HALF_TYPED)(`%s: [setZoom] is accepted and moves zoomY; "${MH_4_KEEP_INPUT}"`, (row, text) => {
    const { built, input, label } = heldOn(row, text)
    const outcome = apply(built, [ZOOM])
    expect(outcome.accepted ? null : outcome.refusal.reason, WS_2_EXEMPT).toBeNull()
    expect(settingsOf(built.loop)['zoomY'], WS_2_EXEMPT).toBe(2)
    expectTheFieldKept(built, row, input, text, label)
  })

  it.each([
    ['setThemeMonochrome', [MONOCHROME]],
    ['setProjectTitle', [TITLE]],
    ['setZoom with setThemeMonochrome', [ZOOM, MONOCHROME]],
  ] as const)('%s is refused with editingInPlace while PR-20 is half-typed, and accepted once it is settled', (_name, commands) => {
    expect(apply(bench(sceneOf()), commands).accepted, 'premise: accepted with no field held').toBe(true)

    const { built, input, label } = heldOn('PR-20', '37')
    const document = JSON.stringify(built.loop.document())
    const outcome = apply(built, commands)
    expect(outcome.accepted ? null : outcome.refusal.reason, AG_9_EDITING).toBe('editingInPlace')
    expect(JSON.stringify(built.loop.document()), 'the refused write left the document as it was').toBe(document)
    expectTheFieldKept(built, 'PR-20', input, '37', label)

    raise(built.built, input, 'keydown', { key: SK_19.key })
    built.send(SK_19)
    expect(apply(built, commands).accepted, 'SK-19 settled the field, so the write passes').toBe(true)
  })
})
