// CR-582 spec-only cases: the row min height field of the property panel (FR-042, table T-338 MH-1 .. MH-6).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  WheelInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  PropertyField,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { propertiesPanelStyle } from '../../src/framework/dom-screen-surface/properties-panel-drawing'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import {
  byRole,
  matches,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  FakeText,
  type FakeElement,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const FR_042_BY_T_338 = '欄は 表 T-338 に従って出すこと（MUST）。'
const FR_042_WORDS = '欄の名・単位・現在の高さ・空の欄・行が描かれていないときの語は `FR-038` の辞書が持つ。'
const MH_1_UNIT = '値の入力の右に単位の語を置き、欄の名に基準のズームを含めること（MUST）'
const MH_2_EMPTY = '値が `null` のときは入力を空にし、下限の無いことを示す語を入力の中に薄く示すこと（MUST）。'
const MH_2_NOT_ZERO = '⛔ `0` と示してはならない（MUST NOT）'
const MH_2_NULL = '空にして確定したら `null` を書くこと（MUST）'
const MH_3_SHOW = '単位の右に、その行のいまの帯高を単位を添えて示すこと（MUST）。'
const MH_3_BAND = '示す値は行の帯高（`05-07-design.md` の 表 T-221 の `LF-2`・`LF-3`）であり、行と行のあいだ（`rowGap`）を含めない。'
const MH_3_ROUND = 'px の整数へ四捨五入して示すこと（MUST）。'
const MH_3_ALWAYS = '欄が空のときも、帯高が指定より高いときも示すこと（MUST）'
const MH_4_FOLLOW =
  '縦のズーム・表示の倍率・行の中身のどれかで帯高が変わったら、次に描く絵で現在の高さを書き換えること（MUST）。'
const MH_4_WHILE_EDITING = '欄を編集しているあいだも書き換えること（MUST）。'
const MH_4_KEEP_INPUT = '⛔ 編集している入力の字と焦点を動かしてはならない（MUST NOT）'
const MH_5_RULE = '単位と現在の高さのあいだを縦の罫 1 本で隔てること（MUST）。'
const MH_5_SIZES =
  '罫の太さは `_assets/tbl-settings.md` の 表 T-206 の `S-440`、罫の両脇の隔たりは同表の `S-441`、色は同書の 表 T-236 の `S-149` とする。'
const MH_5_NO_CHARACTER = '⛔ 区切りを字（縦棒など）で書いてはならない（MUST NOT）'
const MH_6_WORD_ONLY =
  '選んだ行が、いまの倍率で描かれていないとき（`FR-018` のグループ LOD で絵から外れたとき）は、現在の高さの語と数の代わりに、描かれていないことを示す語だけを示すこと（MUST）。'
const MH_6_NO_NUMBER = '⛔ 数を示してはならない（MUST NOT）'
const MH_6_BACK = '欄の形と位置は変えず、行がまた描かれたら、次に描く絵で現在の高さに戻すこと（MUST）'
const FR_042_HELD_AS_PX = 'のときの画面の px として持ち、描くときは `FR-039` の 表 T-252 の `DS-13` のとおり、縦のズームと表示の倍率に比例して伸縮させること（MUST）'

describe('CR-582 -- the manuscript these cases are driven by', () => {
  it.each([
    FR_042_BY_T_338,
    FR_042_WORDS,
    MH_1_UNIT,
    MH_2_EMPTY,
    MH_2_NOT_ZERO,
    MH_2_NULL,
    MH_3_SHOW,
    MH_3_BAND,
    MH_3_ROUND,
    MH_3_ALWAYS,
    MH_4_FOLLOW,
    MH_4_WHILE_EDITING,
    MH_4_KEEP_INPUT,
    MH_5_RULE,
    MH_5_SIZES,
    MH_5_NO_CHARACTER,
    MH_6_WORD_ONLY,
    MH_6_NO_NUMBER,
    MH_6_BACK,
    FR_042_HELD_AS_PX,
  ])('still says it, word for word: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-338 holds MH-1 .. MH-6, and table T-016 PR-20 is the minHeight of a TaskGroup', () => {
    expect(specTable('T-338').rows.map((row) => row.id)).toEqual(['MH-1', 'MH-2', 'MH-3', 'MH-4', 'MH-5', 'MH-6'])
    const pr20 = specTable('T-016').rows.find((row) => row.id === 'PR-20')
    expect(pr20?.cells.map(bare)).toEqual(expect.arrayContaining(['minHeight', 'TaskGroup']))
  })
})

interface PartWord {
  readonly part: string
  readonly text: Record<DisplayLanguage, string>
}

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly properties: readonly { readonly rowId: string; readonly label: Record<DisplayLanguage, string> }[]
  readonly rowMinHeightField: readonly PartWord[]
}

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']
const PR_20 = 'PR-20'
const PX_SLOT = '{px}'

const partWord = (part: string, language: DisplayLanguage): string => {
  const found = WORDS.rowMinHeightField.find((one) => one.part === part)?.text[language]
  if (found === undefined) throw new Error(`display-words.json rowMinHeightField has no ${part} word in ${language}`)
  return found
}
const labelOf = (language: DisplayLanguage): string =>
  WORDS.properties.find((one) => one.rowId === PR_20)?.label[language] ?? `(no dictionary label for ${PR_20})`
const readoutOf = (heightPx: number, language: DisplayLanguage): string =>
  partWord('current', language).replace(PX_SLOT, String(Math.floor(heightPx + 1 / 2)))
const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const anyReadout = (language: DisplayLanguage): RegExp =>
  new RegExp(escaped(partWord('current', language)).replace(escaped(PX_SLOT), '\\d+'))

interface SettingRow {
  readonly id: string
  readonly default?: { readonly num?: string }
}

const SETTING_ROWS: readonly SettingRow[] = (
  JSON.parse(readFileSync(join(SPEC, '_source', 'settings.json'), 'utf8')) as { blocks: { rows?: SettingRow[] }[] }
).blocks.flatMap((block) => block.rows ?? [])

function setting(id: string): number {
  const value = Number(SETTING_ROWS.find((one) => one.id === id)?.default?.num ?? Number.NaN)
  if (!Number.isFinite(value)) throw new Error(`settings.json holds no number for ${id}`)
  return value
}

const S_53 = setting('S-53')
const S_87 = setting('S-87')
const S_440 = setting('S-440')
const S_441 = setting('S-441')

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const A = 'bbbbbbbb-0000-4000-8000-000000000001'
const B = 'bbbbbbbb-0000-4000-8000-000000000002'
const C = 'bbbbbbbb-0000-4000-8000-000000000003'

function taskOf(uid: number): Record<string, unknown> {
  return {
    uid,
    wbsParentUid: null,
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

interface SceneOptions {
  readonly minHeightOf?: Readonly<Record<string, number | null>>
  readonly zoomY?: number
  readonly displayScale?: number
}

function sceneOf(options: SceneOptions = {}): Document {
  const rows = [
    { id: A, parentId: null },
    { id: B, parentId: A },
    { id: C, parentId: null },
  ]
  const text = JSON.stringify({
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: rows.map((_one, index) => taskOf(index + 1)),
      resources: [],
      assignments: [],
      taskGroups: rows.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: `Row${index + 1}`,
        derivedFromTaskUid: null,
        order: index,
        treeState: 'auto',
        editGroup: null,
        color: null,
        minHeight: options.minHeightOf?.[one.id] ?? null,
      })),
      taskGroupMembers: rows.map((one, index) => ({ taskUid: index + 1, groupId: one.id })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      ...(options.displayScale === undefined ? {} : { displayScale: options.displayScale }),
      scrollDate: '2026-04-01',
      scrollGroupId: A,
      scrollGroupOffset: 0,
      zoomY: options.zoomY ?? 1,
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
const THEME_HUE = 214

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

const partOn = (part: string, entry: string | null, rowGroupId: string | null = null): ScreenPart =>
  ({ part, entry, format: null, rowGroupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null }) as unknown as ScreenPart

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

// WHY: the same event raiser the cr-551 cases use on this fake.
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
  wheel(notches: number): void
  pressEntrance(icon: string): void
  openRow(groupId: string): void
  view(): ScreenView
  band(groupId: string): number | null
  zoomY(): number
}

function bench(document: Document, language: DisplayLanguage = 'ja'): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const built = wire({ preference: 'light', hue: THEME_HUE }, { 'App Header': SCREEN.appHeaderHeight })
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
  const loop = frameLoop({ showSvg: () => undefined } as never, document, SCREEN, { surface, language })
  drain()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  const frame = () => {
    const now = loop.current()
    if (now === null) throw new Error('the loop has drawn no frame')
    return now
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
    wheel: (notches) => {
      const area = frame().regions.rowArea
      const input: WheelInput = {
        kind: 'wheel',
        x: area.x + area.width / 2,
        y: area.y + area.height / 2,
        modifiers: MODS({ alt: true }),
        notches,
        scrollPx: { x: 0, y: notches * 100 },
      }
      send(input)
    },
    pressEntrance: (icon) => {
      aimed = partOn('App Header', icon)
      loop.receiveInput(pointerAt('down', 500, 20))
      loop.receiveInput(pointerAt('up', 500, 20))
      aimed = null
      drain()
    },
    // see MK-13
    openRow: (groupId) => {
      const title = view().rowTitlePanel.titles.find((one) => one.groupId === groupId)
      if (title === undefined) throw new Error(`the row title of ${groupId} is not drawn`)
      const x = title.box.x + title.box.width / 2
      const y = title.box.y + title.box.height / 2
      aimed = partOn('Row Title Panel', null, groupId)
      send(pointerAt('down', x, y))
      send(pointerAt('up', x, y))
      send(pointerAt('down', x, y, 2))
      send(pointerAt('up', x, y, 2))
      aimed = null
      if (view().propertiesPanel === null) throw new Error('premise: MK-13 put the property panel up on the row')
    },
    view,
    band: (groupId) => frame().layout.rows.find((one) => one.groupId === groupId)?.height ?? null,
    zoomY: () => loop.document().documentSettings.zoomY as number,
  }
}

// WHY: the notch sign of MK-4 is not in the manuscript; cr-577 proves -1 raises zoomY.
const IN = -1
const OUT = 1

function describedField(built: Bench): PropertyField {
  const field = built.view().propertiesPanel?.fields.find((one) => one.row === PR_20)
  if (field === undefined) {
    const rows = built.view().propertiesPanel?.fields.map((one) => one.row).join(' ')
    throw new Error(`the row panel describes no ${PR_20} field; fields: ${rows}`)
  }
  return field
}

function drawnLine(built: Bench): FakeElement {
  const panel = byRole(built.built.root(), PROPERTIES_PANEL)[0]
  if (panel === undefined) throw new Error('the property panel is not drawn')
  const lines = selfAndDescendants(panel).filter(
    (one) => one.getAttribute('data-field-row') === PR_20 && one.parentNode?.getAttribute('data-field-row') !== PR_20,
  )
  const top = lines.filter((one) => !lines.some((other) => other !== one && selfAndDescendants(other).includes(one)))
  if (top.length !== 1) throw new Error(`the panel drew ${top.length} ${PR_20} fields`)
  return top[0]!
}

function inputOf(built: Bench): FakeElement {
  const inputs = selfAndDescendants(drawnLine(built)).filter((one) => one.tagName === 'INPUT')
  if (inputs.length !== 1) throw new Error(`the ${PR_20} field drew ${inputs.length} inputs`)
  return inputs[0]!
}

interface TextAt {
  readonly text: string
  readonly path: string
}

function textsOf(line: FakeElement): readonly TextAt[] {
  const out: TextAt[] = []
  const walk = (node: FakeElement, path: string): void => {
    node.childNodes.forEach((child, index) => {
      if (child instanceof FakeText) {
        if (child.data.trim() !== '') out.push({ text: child.data.trim(), path: `${path}/${index}` })
      } else walk(child, `${path}/${index}`)
    })
  }
  walk(line, '')
  return out
}

const drawnTexts = (built: Bench): readonly string[] => textsOf(drawnLine(built)).map((one) => one.text)

const placeholderOf = (input: FakeElement): string | null =>
  input.getAttribute('placeholder') ?? (input as unknown as { placeholder?: string }).placeholder ?? null

function typeInto(built: Bench, text: string): FakeElement {
  const input = inputOf(built)
  input.focus()
  raise(built.built, input, 'focusin')
  input.value = text
  raise(built.built, input, 'input')
  return input
}

function settle(built: Bench, text: string): void {
  const input = typeInto(built, text)
  raise(built.built, input, 'keydown', { key: SK_19.key })
  built.send(SK_19)
}

const minHeightIn = (document: Document, groupId: string): unknown =>
  (document.schedule.taskGroups.find((one) => one.id === groupId) as unknown as Record<string, unknown>)['minHeight']

function openedOn(options: SceneOptions, groupId = A, language: DisplayLanguage = 'ja'): Bench {
  const built = bench(sceneOf(options), language)
  built.openRow(groupId)
  return built
}

const bandNow = (built: Bench, groupId = A): number => {
  const band = built.band(groupId)
  if (band === null) throw new Error(`row ${groupId} is not placed`)
  return band
}

describe(`T-338 MH-3 -- "${MH_3_SHOW}"`, () => {
  it.each([
    ['the field is empty', null],
    ['the content is taller than the minimum', 1],
  ] as const)(`"${MH_3_ALWAYS}" "${MH_3_ROUND}" -- %s`, (_name, minHeight) => {
    const built = openedOn({ minHeightOf: { [A]: minHeight } })
    const expected = readoutOf(bandNow(built), 'ja')
    expect(describedField(built).readout, MH_3_BAND).toBe(expected)
    expect(drawnTexts(built), MH_3_SHOW).toContain(expected)
  })

  it(`"${MH_3_BAND}" -- a minimum above the content reads as the band it draws`, () => {
    const probe = openedOn({})
    const typed = Math.ceil(bandNow(probe)) * 3
    const built = openedOn({ minHeightOf: { [A]: typed } })
    expect(bandNow(built), 'premise: DS-13 at display scale 100, zoomY 1').toBeCloseTo(typed, 9)
    expect(describedField(built).readout).toBe(readoutOf(typed, 'ja'))
    expect(drawnTexts(built)).toContain(readoutOf(typed, 'ja'))
  })

  it(`"${MH_1_UNIT}" "${MH_3_SHOW}" -- the input, then the unit, then the readout`, () => {
    const built = openedOn({})
    const line = drawnLine(built)
    const order = selfAndDescendants(line)
    const input = inputOf(built)
    const unitText = textsOf(line).find((one) => one.text === partWord('unit', 'ja'))
    const readoutText = textsOf(line).find((one) => one.text === readoutOf(bandNow(built), 'ja'))
    expect(unitText, 'the unit word is drawn').toBeDefined()
    expect(readoutText, 'the readout is drawn').toBeDefined()
    const holderOf = (path: string): FakeElement => {
      let at = line
      for (const step of path.split('/').filter((one) => one !== '').slice(0, -1)) at = at.childNodes[Number(step)] as FakeElement
      return at
    }
    const unitAt = order.indexOf(holderOf(unitText!.path))
    const readoutAt = order.indexOf(holderOf(readoutText!.path))
    expect(order.indexOf(input), 'the input stands before the unit').toBeLessThan(unitAt)
    expect(unitAt, 'the unit stands before the readout').toBeLessThan(readoutAt)
    expect(describedField(built).unit).toBe(partWord('unit', 'ja'))
  })
})

describe(`T-338 MH-4 -- "${MH_4_FOLLOW}"`, () => {
  const TALL = (): number => Math.ceil(bandNow(openedOn({}))) * 3

  it.each([
    ['Alt + wheel, lowering', OUT],
    ['Alt + wheel, raising', IN],
  ] as const)('%s: the readout is rewritten without reopening the panel', (_name, notches) => {
    const built = openedOn({ minHeightOf: { [A]: TALL() } })
    const before = describedField(built).readout
    const zoomBefore = built.zoomY()
    built.wheel(notches)
    expect(built.zoomY(), 'premise: MK-4 moved zoomY').not.toBe(zoomBefore)
    const expected = readoutOf(bandNow(built), 'ja')
    expect(expected, 'premise: the band changed').not.toBe(before)
    expect(describedField(built).readout, MH_4_FOLLOW).toBe(expected)
    expect(drawnTexts(built), MH_4_FOLLOW).toContain(expected)
  })

  it(`"${MH_4_WHILE_EDITING}" "${MH_4_KEEP_INPUT}" -- a half-typed number stays, keeps the focus and the node`, () => {
    const built = openedOn({ minHeightOf: { [A]: TALL() } })
    const typed = String(TALL() + 1)
    const input = typeInto(built, typed)
    const zoomBefore = built.zoomY()
    built.wheel(OUT)
    expect(built.zoomY(), 'premise: MK-4 moved zoomY while the field was held').not.toBe(zoomBefore)
    const expected = readoutOf(bandNow(built), 'ja')
    expect(drawnTexts(built), MH_4_WHILE_EDITING).toContain(expected)
    expect(inputOf(built), `${MH_4_KEEP_INPUT} -- the same input node`).toBe(input)
    expect(input.isConnected).toBe(true)
    expect(input.value, MH_4_KEEP_INPUT).toBe(typed)
    expect(built.built.world.activeElement, MH_4_KEEP_INPUT).toBe(input)
  })
})

describe(`T-338 MH-2 -- "${MH_2_EMPTY}"`, () => {
  it.each(LANGUAGES)(`"${MH_2_EMPTY}" "${MH_2_NOT_ZERO}" -- %s`, (language) => {
    const built = openedOn({}, A, language)
    const input = inputOf(built)
    expect(input.value, MH_2_EMPTY).toBe('')
    expect(placeholderOf(input), MH_2_EMPTY).toBe(partWord('none', language))
    const control = describedField(built).controls.find((one) => one.key.column === 'minHeight')
    expect(control?.placeholder).toBe(partWord('none', language))
    expect(control?.text ?? '', MH_2_NOT_ZERO).not.toBe('0')
    expect(drawnTexts(built).filter((one) => /^0\b/.test(one)), MH_2_NOT_ZERO).toEqual([])
  })

  it(`"${MH_2_NULL}" -- the exported GRS JSON carries minHeight null and no height key`, () => {
    const built = openedOn({ minHeightOf: { [A]: Math.ceil(bandNow(openedOn({}))) * 2 } })
    settle(built, '')
    expect(minHeightIn(built.loop.document(), A), MH_2_NULL).toBeNull()
    const written = (JSON.parse(jsonFromDocument(built.loop.document())) as { schedule: { taskGroups: Record<string, unknown>[] } })
      .schedule.taskGroups
    const row = written.find((one) => one['id'] === A)
    expect(row?.['minHeight']).toBeNull()
    expect(written.filter((one) => Object.hasOwn(one, 'height'))).toEqual([])
  })

  it(`FR-042 "${FR_042_HELD_AS_PX}" -- a number typed at another zoom and scale is written as typed`, () => {
    const zoomY = S_53 * S_53
    const built = openedOn({ zoomY })
    const typed = Math.ceil(bandNow(built)) * 2
    settle(built, String(typed))
    expect(minHeightIn(built.loop.document(), A)).toBe(typed)
    expect(built.zoomY(), 'the zoom stayed').toBe(zoomY)
  })
})

// see T-236
function s149Rgb(): readonly [number, number, number] {
  const cell = bare(specTable('T-236').rows.find((one) => one.id === 'S-149')?.by['明るいテーマ'] ?? '')
  const found = /^hsl\(H\s+([\d.]+)%\s+([\d.]+)%\)$/.exec(cell)
  if (found === null) throw new Error(`table T-236 S-149 is not an hsl(H s% l%) formula: ${cell}`)
  return rgbOfHsl(THEME_HUE, Number(found[1]), Number(found[2]))
}

function rgbOfHsl(hue: number, saturationPercent: number, lightnessPercent: number): readonly [number, number, number] {
  const s = saturationPercent / 100
  const l = lightnessPercent / 100
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number): number => {
    const k = (n + hue / 30) % 12
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255
  }
  return [channel(0), channel(8), channel(4)]
}

function rgbOfPaint(paint: string): readonly [number, number, number] | null {
  const text = paint.trim().toLowerCase()
  const hex = /^#([0-9a-f]{6})$/.exec(text)
  if (hex !== null) {
    const value = Number.parseInt(hex[1] ?? '', 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  }
  const hsl = /^hsl\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/.exec(text)
  if (hsl !== null) return rgbOfHsl(((Number(hsl[1]) % 360) + 360) % 360, Number(hsl[2]), Number(hsl[3]))
  const rgb = /^rgb\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*\)$/.exec(text)
  if (rgb !== null) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  return null
}

// WHY: a declaration may be inline or in the panel's style sheet; both are read the way cr-557 reads them.
function declared(element: FakeElement, property: string): string | undefined {
  const inline = styleMap(element).get(property)
  if (inline !== undefined) return inline
  let found: string | undefined
  for (const rule of propertiesPanelStyle().split('}')) {
    const [selectors, body] = rule.split('{')
    if (selectors === undefined || body === undefined) continue
    const value = new RegExp(`(?:^|[;\\s])${escaped(property)}\\s*:\\s*([^;]+)`).exec(body)
    if (value === null) continue
    const selected = selectors.split(',').some((one) => {
      const last = one.trim().split(/\s+/).pop() ?? ''
      const parts = last.match(/\[[^\]]+\]|\.[\w-]+|^[a-z]+/gi) ?? []
      return parts.length > 0 && parts.every((part) => matches(element, part))
    })
    if (selected) found = value[1]?.trim()
  }
  return found
}

interface Rule {
  readonly element: FakeElement
  readonly thickness: number
  readonly colour: string
}

const pxIn = (text: string | undefined): number | null => {
  const found = /(-?\d*\.?\d+)px/.exec(text ?? '')
  return found === null ? null : Number(found[1])
}

// WHY: the fixture's resolver drops the spaces an hsl() colour needs to be read back.
function paintOf(built: Bench, written: string): string {
  const named = /^var\((--[a-z0-9-]+)\)$/.exec(written.trim().toLowerCase())
  if (named === null) return written.trim()
  return styleMap(built.built.root()).get(named[1]!) ?? `(the root declares no ${named[1]})`
}

function rulesIn(built: Bench, line: FakeElement): readonly Rule[] {
  const out: Rule[] = []
  for (const element of selfAndDescendants(line)) {
    for (const side of ['border-left', 'border-right', 'border-inline-start', 'border-inline-end']) {
      const value = declared(element, side)
      const thickness = pxIn(value)
      if (value === undefined || thickness === null) continue
      const colour = value.replace(/-?\d*\.?\d+px/, '').replace(/\b(solid|dashed|dotted)\b/, '').trim()
      out.push({ element, thickness, colour: paintOf(built, colour) })
    }
    const thickness = pxIn(declared(element, 'width') ?? declared(element, 'inline-size'))
    const ground = declared(element, 'background-color') ?? declared(element, 'background')
    if (thickness !== null && ground !== undefined) out.push({ element, thickness, colour: paintOf(built, ground) })
  }
  return out
}

function sideGapsOf(element: FakeElement): readonly [number | null, number | null] {
  let left = pxIn(declared(element, 'margin-left') ?? declared(element, 'margin-inline-start'))
  let right = pxIn(declared(element, 'margin-right') ?? declared(element, 'margin-inline-end'))
  const inline = declared(element, 'margin-inline')?.split(/\s+/)
  if (inline !== undefined) {
    left ??= pxIn(inline[0])
    right ??= pxIn(inline[1] ?? inline[0])
  }
  const margin = declared(element, 'margin')?.split(/\s+/)
  if (margin !== undefined) {
    left ??= pxIn(margin[3] ?? margin[1] ?? margin[0])
    right ??= pxIn(margin[1] ?? margin[0])
  }
  if (left === null && right === null && element.parentNode !== null) {
    const gap = (declared(element.parentNode, 'column-gap') ?? declared(element.parentNode, 'gap'))?.split(/\s+/)
    if (gap !== undefined) {
      left = pxIn(gap[1] ?? gap[0])
      right = left
    }
  }
  return [left, right]
}

const sameRgb = (left: readonly number[], right: readonly number[]): boolean =>
  left.every((value, index) => Math.abs(value - (right[index] ?? Number.NaN)) <= 1)

describe(`T-338 MH-5 -- "${MH_5_RULE}"`, () => {
  it(`"${MH_5_NO_CHARACTER}" -- the field draws the name, the unit and the readout, and no other character`, () => {
    const built = openedOn({})
    const allowed = new Set([labelOf('ja'), partWord('unit', 'ja'), readoutOf(bandNow(built), 'ja')])
    expect(drawnTexts(built).filter((one) => !allowed.has(one)), MH_5_NO_CHARACTER).toEqual([])
  })

  it(`"${MH_5_SIZES}" -- one rule of S-440 px in S-149, with S-441 px on both sides`, () => {
    const built = openedOn({})
    const rules = rulesIn(built, drawnLine(built)).filter((one) => one.thickness === S_440)
    const painted = rules.filter((one) => {
      const rgb = rgbOfPaint(one.colour)
      return rgb !== null && sameRgb(rgb, s149Rgb())
    })
    expect(painted.length, `${MH_5_RULE} rules found: ${JSON.stringify(rules.map((one) => [one.thickness, one.colour]))}`).toBe(1)
    expect(sideGapsOf(painted[0]!.element), MH_5_SIZES).toEqual([S_441, S_441])
  })

  it('JDG-716 -- the field carries no explanation: no title attribute and no hint word', () => {
    const built = openedOn({})
    expect(selfAndDescendants(drawnLine(built)).filter((one) => one.getAttribute('title') !== null)).toEqual([])
    expect(WORDS.rowMinHeightField.map((one) => one.part).sort(), FR_042_WORDS).toEqual(
      ['current', 'currentlyHidden', 'none', 'unit'],
    )
  })
})

describe(`FR-042 "${FR_042_WORDS}"`, () => {
  it('premise: the current word carries the {px} slot in every language', () => {
    for (const language of LANGUAGES) expect(partWord('current', language)).toContain(PX_SLOT)
  })

  it.each(LANGUAGES)(`"${MH_1_UNIT}" -- the name, the unit and the readout, %s`, (language) => {
    const built = openedOn({}, A, language)
    const field = describedField(built)
    expect(field.name).toBe(labelOf(language))
    expect(field.unit).toBe(partWord('unit', language))
    expect(field.readout).toBe(readoutOf(bandNow(built), language))
    const texts = drawnTexts(built)
    expect(texts).toContain(labelOf(language))
    expect(texts).toContain(partWord('unit', language))
    expect(texts).toContain(readoutOf(bandNow(built), language))
  })
})

function zoomUntil(built: Bench, notches: number, placed: boolean): void {
  for (let turn = 0; turn < 40 && (built.band(B) !== null) !== placed; turn += 1) built.wheel(notches)
  if ((built.band(B) !== null) !== placed) throw new Error(`row B did not become ${placed ? 'placed' : 'unplaced'} in 40 notches`)
}

const readoutPathOf = (built: Bench, text: string): string | undefined =>
  textsOf(drawnLine(built)).find((one) => one.text === text)?.path

describe(`T-338 MH-6 -- "${MH_6_WORD_ONLY}"`, () => {
  it.each(LANGUAGES)(`"${MH_6_NO_NUMBER}" "${MH_6_BACK}" -- depth-2 row B, lowered past S-87, %s`, (language) => {
    const built = openedOn({}, B, language)
    const shown = readoutOf(bandNow(built, B), language)
    const numberAt = readoutPathOf(built, shown)
    expect(numberAt, 'premise: the readout is drawn while B is drawn').toBeDefined()

    zoomUntil(built, OUT, false)
    expect(built.zoomY(), 'premise: FR-018 took B out below the depth-2 threshold').toBeLessThan(S_87)
    const hidden = partWord('currentlyHidden', language)
    expect(describedField(built).readout, MH_6_WORD_ONLY).toBe(hidden)
    const texts = drawnTexts(built)
    expect(texts, MH_6_WORD_ONLY).toContain(hidden)
    expect(texts.filter((one) => anyReadout(language).test(one)), MH_6_WORD_ONLY).toEqual([])
    expect(texts.filter((one) => one !== labelOf(language) && /\d/.test(one)), MH_6_NO_NUMBER).toEqual([])
    expect(readoutPathOf(built, hidden), MH_6_BACK).toBe(numberAt)
    expect(inputOf(built).isConnected, MH_6_BACK).toBe(true)
    expect(texts, MH_6_BACK).toContain(partWord('unit', language))

    zoomUntil(built, IN, true)
    const back = readoutOf(bandNow(built, B), language)
    expect(describedField(built).readout, MH_6_BACK).toBe(back)
    expect(readoutPathOf(built, back), MH_6_BACK).toBe(numberAt)
    expect(drawnTexts(built)).not.toContain(hidden)
  })
})

describe(`FR-042 "${FR_042_HELD_AS_PX}" -- through the shell`, () => {
  it('Alt + wheel draws the floored band anew and leaves the stored minHeight as typed', () => {
    const typed = Math.ceil(bandNow(openedOn({}))) * 3
    const built = bench(sceneOf({ minHeightOf: { [A]: typed } }))
    const before = bandNow(built)
    built.wheel(OUT)
    expect(bandNow(built)).toBeCloseTo(before / S_53, 6)
    expect(minHeightIn(built.loop.document(), A)).toBe(typed)
  })

  it('IC-10 fits the view, and lowering the row zoom afterwards shrinks the tall row too', () => {
    const tall = Math.ceil(bandNow(openedOn({}))) * 12
    const built = bench(sceneOf({ minHeightOf: { [A]: tall } }))
    built.pressEntrance('IC-10')
    const fitted = built.zoomY()
    const before = bandNow(built)
    built.wheel(OUT)
    expect(built.zoomY(), 'premise: MK-4 lowered zoomY after the fit').toBeLessThan(fitted)
    expect(bandNow(built), 'the tall row shrank').toBeLessThan(before)
    expect(minHeightIn(built.loop.document(), A)).toBe(tall)
  })
})
