// CR-607 wave 4: FR-153 GRS Reset through the frame loop and the drawn panel and confirmation.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import {
  KEY,
  type InputModifiers,
  type KeyInput,
  type PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  AppHeaderItems,
  Confirmation,
  DisplayLanguage,
  ScreenFrame,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { writeBrowserStored } from '../../src/framework/single-html-shell/browser-stored-values'
import {
  discardQuestionOf,
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import {
  descendants,
  FakeElement,
  FakeText,
  matches,
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  whatWasDrawn,
  type Stage as DrawnStage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const FR_153_PLACE =
  'その入口は、文書の設定の面（`FR-072`、面を出す入口は同表の `IC-17`）の頭、テーマ色の欄（`FR-041`）の上に置くこと（MUST）'
const FR_153_NOT_A_FIELD = '⚠️ この入口は面の欄ではない —— 値を持たないので、`FR-072` の「その欄は読むだけ」にも、`FR-041` の「先頭の欄」にも数えない。'
const FR_153_LABEL =
  '入口の行は、面のほかの行と同じく左に名、右に入口を置き、名は `FR-038` の辞書が同行に持つ語（`label`）とすること（MUST）'
const FR_153_NEVER_FAINT = '⚠️ この入口を薄く描かない（`FR-029`）'
const FR_153_QUESTION = '問い方は 表 T-037 の `NT-7` に従い、示す文は 表 T-234 の `QN-11` とすること（MUST）'
const FR_153_ASK_ALWAYS = '⭐ 未保存の編集が無くても問うこと（MUST）'
const FR_153_LINE_BREAKS =
  '⭐ その文の語に含まれる改行は、`Confirmation`（`_assets/tbl-glossary.md` の `U-55`）の中で、そこで行を改めて示すこと（MUST）'
const FR_153_ONLY_T_345 =
  '続けると答えられたときに消すのは、`localStorage` の `GRS` の鍵のうち、表 T-345 が「消す」とするものだけとすること（MUST）'
const FR_153_NEVER_WHOLE = '⛔ `localStorage` をまるごと消してはならない（MUST NOT）'
const FR_153_CLEAR_THEN_RELOAD = '⭐ 消してから読み直すこと（MUST）'
const FR_153_NO_AGENT_API = '⛔ `Agent API` にこの操作を与えてはならない（MUST NOT）'

const T_109 = specTable('T-109')
const T_234 = specTable('T-234')
const T_027 = specTable('T-027')
const T_036 = specTable('T-036')
const T_107 = specTable('T-107')
const T_103 = specTable('T-103')
const T_233 = specTable('T-233')

function rowOf(table: { readonly id: string; readonly rows: readonly { readonly id: string; readonly by: Readonly<Record<string, string>>; readonly cells: readonly string[] }[] }, id: string) {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const IC_139 = 'IC-139'
const IC_17 = 'IC-17'
const QN_11 = 'QN-11'
const RS_27 = 'RS-27'
const NT_7 = 'NT-7'
const K_60 = 'K-60'

const surfaceOfEntry = (id: string): string => bare(rowOf(T_109, id).by['面'] ?? '')
const settledName = (id: string): string => bare(rowOf(T_103, id).by['確定名（英）'] ?? '')

const PROPERTIES_PANEL = surfaceOfEntry(IC_139)
const SETTINGS_ENTRY_SURFACE = surfaceOfEntry(IC_17)
const CONFIRMATION = settledName('U-55')
const PANEL_ROLE = settledName('U-25')

interface Worded {
  readonly rowId: string
  readonly label?: Readonly<Record<DisplayLanguage, string>>
  readonly text?: Readonly<Record<DisplayLanguage, string>>
}

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly icons: readonly Worded[]
  readonly questions: readonly Worded[]
  readonly reasons: readonly Worded[]
  readonly confirmation: readonly { readonly answer: string; readonly text: Readonly<Record<DisplayLanguage, string>> }[]
}

const labelOf = (language: DisplayLanguage): string => {
  const held = WORDS.icons.find((one) => one.rowId === IC_139)?.label?.[language]
  if (held === undefined) throw new Error(`FR-038's dictionary holds no label for ${IC_139}`)
  return held
}

const sentenceOf = (language: DisplayLanguage): string => {
  const held = WORDS.questions.find((one) => one.rowId === QN_11)?.text?.[language]
  if (held === undefined) throw new Error(`FR-038's dictionary holds no sentence for ${QN_11}`)
  return held
}

const answerKeyOf = (spelled: string): string => {
  const held = WORDS.confirmation.find((one) => one.text.en === spelled)
  if (held === undefined) throw new Error(`the confirmation section holds no answer spelled ${spelled}`)
  return held.answer
}
const PROCEED = answerKeyOf('Yes')
const CANCEL = answerKeyOf('No')

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

interface RecordingStorage {
  readonly storage: Storage
  readonly calls: string[]
  readonly held: Map<string, string>
}

function recordingStorage(seed: Readonly<Record<string, string>> = {}): RecordingStorage {
  const held = new Map<string, string>(Object.entries(seed))
  const calls: string[] = []
  const methods = {
    getItem: (key: string): string | null => {
      calls.push(`getItem ${key}`)
      return held.has(key) ? (held.get(key) ?? null) : null
    },
    setItem: (key: string, value: string): void => {
      calls.push(`setItem ${key}`)
      held.set(String(key), String(value))
    },
    removeItem: (key: string): void => {
      calls.push(`removeItem ${key}`)
      held.delete(key)
    },
    key: (index: number): string | null => [...held.keys()][index] ?? null,
    clear: (): void => {
      calls.push('clear')
      held.clear()
    },
  }
  const storage = new Proxy(methods as unknown as Storage, {
    get(target, property, receiver): unknown {
      if (property === 'length') return held.size
      if (typeof property === 'string' && !(property in target) && held.has(property)) return held.get(property)
      return Reflect.get(target, property, receiver)
    },
    set(_target, property, value): boolean {
      calls.push(`setItem ${String(property)}`)
      held.set(String(property), String(value))
      return true
    },
    deleteProperty(_target, property): boolean {
      calls.push(`removeItem ${String(property)}`)
      held.delete(String(property))
      return true
    },
    ownKeys: (): string[] => [...held.keys()],
    getOwnPropertyDescriptor(_target, property): PropertyDescriptor | undefined {
      if (typeof property === 'string' && held.has(property)) {
        return { value: held.get(property), enumerable: true, configurable: true, writable: true }
      }
      return undefined
    },
    has: (target, property): boolean =>
      (typeof property === 'string' && held.has(property)) || property in target,
  })
  return { storage, calls, held }
}

const SAVED_STORAGE = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

function installStorage(descriptor: PropertyDescriptor): void {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descriptor })
}

function restoreStorage(): void {
  if (SAVED_STORAGE === undefined) delete (globalThis as unknown as Record<string, unknown>)['localStorage']
  else Object.defineProperty(globalThis, 'localStorage', SAVED_STORAGE)
}

type StoredRow = Parameters<typeof writeBrowserStored>[0]
const ROWS_OF_T_206: readonly StoredRow[] = ['S-99', 'S-99a', 'S-99b', 'S-99c']

const KEYS: Readonly<Record<StoredRow, string>> = (() => {
  const probe = recordingStorage()
  installStorage({ value: probe.storage, writable: true })
  const keys: Partial<Record<StoredRow, string>> = {}
  for (const row of ROWS_OF_T_206) {
    const before = probe.held.size
    writeBrowserStored(row, `value of ${row}`)
    keys[row] = [...probe.held.keys()][before] ?? ''
  }
  restoreStorage()
  return keys as Record<StoredRow, string>
})()

const PREFIX = ((): string => {
  const all = ROWS_OF_T_206.map((row) => KEYS[row] ?? '')
  const first = all[0] ?? ''
  let length = first.length
  for (const one of all) {
    let at = 0
    while (at < length && one[at] === first[at]) at += 1
    length = at
  }
  return first.slice(0, length)
})()

const STALE_GRS_KEY = `${PREFIX}retiredByAnEarlierVersion`
const FOREIGN_KEYS: Readonly<Record<string, string>> = { 'another-page.setting': 'kept', theme: 'dark' }

function seededStorage(): RecordingStorage {
  // WHY: S-99 and S-99b are left out of the seed so the loop's own boot reads
  // cannot move the starting picture.
  const seed: Record<string, string> = { ...FOREIGN_KEYS, [STALE_GRS_KEY]: 'stale' }
  seed[KEYS['S-99a']] = 'value of S-99a'
  seed[KEYS['S-99c']] = 'value of S-99c'
  return recordingStorage(seed)
}

const LEFT_AFTER_RESET = [KEYS['S-99c'], ...Object.keys(FOREIGN_KEYS)].sort()

const MUTATING = /^(setItem|removeItem|clear)\b/

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: 'down' | 'up', x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

const keyOf = (key: string): KeyInput => ({ kind: 'key', key, modifiers: { ...NO_MODIFIERS } })
const ENTER = keyOf(KEY.enter)
const ESCAPE = keyOf(KEY.escape)
// WHY: HumanInput spells a letter key in upper case (exported KEY has y: 'Y' and no n),
// so the y and n keys of NT-7 arrive as Y and N.
const KEY_N = 'N'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Document

const firstTaskUid = (document: Document): number =>
  Number((document as unknown as { schedule: { tasks: { uid: unknown }[] } }).schedule.tasks[0]?.uid)

const firstTaskName = (document: Document): string =>
  String((document as unknown as { schedule: { tasks: { name: unknown }[] } }).schedule.tasks[0]?.name)

// WHY: widened so the 13th argument pageReload compiles before and after it lands;
// a loop that ignores it never reloads, and the cases report that.
const startLoop = frameLoop as unknown as (...args: unknown[]) => FrameLoop

const realRaf = (globalThis as unknown as { requestAnimationFrame?: unknown }).requestAnimationFrame

afterEach(() => {
  const scope = globalThis as unknown as { requestAnimationFrame?: unknown }
  if (realRaf === undefined) delete scope.requestAnimationFrame
  else scope.requestAnimationFrame = realRaf
  restoreStorage()
})

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

interface Bench {
  readonly loop: FrameLoop
  readonly storage: RecordingStorage | null
  readonly reloads: (readonly string[])[]
  last(): ScreenView
  take(surface: string, entry: string | null, answer?: string): Promise<void>
  send(input: KeyInput): Promise<void>
  rename(text: string): Promise<void>
}

async function bench(
  language: DisplayLanguage = 'ja',
  storage: 'recording' | 'unreachable' | 'refusing' = 'recording',
): Promise<Bench> {
  let recorded: RecordingStorage | null = null
  if (storage === 'recording') {
    recorded = seededStorage()
    installStorage({ value: recorded.storage, writable: true })
  } else if (storage === 'unreachable') {
    installStorage({
      get: (): never => {
        throw new Error('SecurityError: the host refuses localStorage')
      },
    })
  } else {
    const refusing = (): never => {
      throw new Error('the host refuses this call')
    }
    installStorage({
      value: { getItem: refusing, setItem: refusing, removeItem: refusing, key: refusing, clear: refusing },
      writable: true,
    })
  }

  const waiting: ((time: number) => void)[] = []
  ;(globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = (
    callback: (time: number) => void,
  ): number => {
    waiting.push(callback)
    return waiting.length
  }
  const frames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  let commit: unknown = null
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => {
      const one = commit
      commit = null
      return one as never
    },
    readScreenPartAt: () => part,
  } as unknown as ScreenSurface
  const wiring = { surface, language } as unknown as ScreenWiring
  const reloads: (readonly string[])[] = []
  const pageReload = (): void => {
    reloads.push(recorded === null ? [] : [...recorded.held.keys()].sort())
  }
  const document = structuredClone(TEMPLATE)
  const uid = firstTaskUid(document)
  const loop = startLoop(
    { showSvg: () => undefined },
    document,
    SCREEN,
    wiring,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    structuredClone(TEMPLATE),
    undefined,
    pageReload,
  )
  const turn = async (): Promise<void> => {
    frames()
    await settle()
    frames()
  }
  await turn()
  const send = async (input: KeyInput | PointerInput): Promise<void> => {
    loop.receiveInput(input)
    await turn()
  }
  return {
    loop,
    storage: recorded,
    reloads,
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    take: async (surfaceName, entry, answer) => {
      part = {
        part: surfaceName,
        entry,
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
        ...(answer === undefined ? {} : { confirmationAnswer: answer }),
      } as unknown as ScreenPart
      loop.receiveInput(pointer('down', 500, 300))
      frames()
      loop.receiveInput(pointer('up', 500, 300))
      frames()
      part = null
      await turn()
    },
    send,
    rename: async (text) => {
      commit = { row: 'PR-1', key: { holder: 'task', uid, column: 'name' }, text }
      await send(ENTER)
    },
  }
}

async function openSettings(built: Bench): Promise<void> {
  await built.take(SETTINGS_ENTRY_SURFACE, IC_17)
  expect(built.last().propertiesPanel?.showing, 'premise: IC-17 shows the document settings face').toBe(
    'documentSettings',
  )
}

async function pressReset(built: Bench): Promise<void> {
  await built.take(PROPERTIES_PANEL, IC_139)
}

async function askedBench(language: DisplayLanguage = 'ja', withEdit = false): Promise<Bench> {
  const built = await bench(language)
  if (withEdit) {
    await built.rename('Edited before the reset')
    expect(built.loop.hasUnsavedEdits(), 'premise: the settled name edit is an unsaved edit').toBe(true)
  }
  await openSettings(built)
  await pressReset(built)
  return built
}

const writesIn = (storage: RecordingStorage | null): string[] =>
  (storage?.calls ?? []).filter((one) => MUTATING.test(one))

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

function drawn(part: Partial<ScreenView>, language: DisplayLanguage): DrawnStage {
  const view = {
    language,
    frame: EMPTY_FRAME,
    appHeaderItems: { ...EMPTY_HEADER, language },
    taskGroupPanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
    ...part,
  } as unknown as ScreenView
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': 37 })
  surfaceOf(built).showScreenView(view)
  return built
}

const isFaint = (node: FakeElement): boolean =>
  node.getAttribute('aria-disabled') === 'true' ||
  node.getAttribute('data-enabled') === 'false' ||
  node.getAttribute('disabled') !== null

function textOf(node: FakeElement, skip: FakeElement | null = null): string {
  if (node === skip) return ''
  return node.childNodes.map((one) => (one instanceof FakeText ? one.data : textOf(one, skip))).join('')
}

function styleRules(built: DrawnStage): (readonly [string, string])[] {
  const rules: (readonly [string, string])[] = []
  for (const sheet of built.world.created.filter((one) => one.tagName === 'STYLE')) {
    for (const chunk of sheet.textContent.split('}')) {
      const [selectors, body] = chunk.split('{')
      if (selectors !== undefined && body !== undefined) rules.push([selectors, body] as const)
    }
  }
  return rules
}

function declared(built: DrawnStage, node: FakeElement, property: string): string | undefined {
  const inline = styleMap(node).get(property)
  if (inline !== undefined) return inline.trim().toLowerCase()
  let found: string | undefined
  for (const [selectors, body] of styleRules(built)) {
    const value = new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;]+)`).exec(body)
    if (value === null) continue
    const applies = selectors.split(',').some((one) => {
      const text = one.trim()
      return text !== '' && !text.includes(':') && matches(node, text)
    })
    if (applies) found = (value[1] ?? '').trim().toLowerCase()
  }
  return found
}

const KEEPS_NEWLINES = new Set(['pre', 'pre-line', 'pre-wrap', 'break-spaces'])
const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'SECTION', 'HEADER', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'TABLE', 'TR'])
const BLOCK_DISPLAYS = new Set(['block', 'flex', 'grid', 'list-item', 'table', 'table-row', 'flow-root'])

function visibleLines(built: DrawnStage, part: FakeElement): string[] {
  const walk = (node: FakeElement, keeps: boolean): string => {
    if (declared(built, node, 'display') === 'none') return ''
    const own = declared(built, node, 'white-space')
    const keepsHere = own === undefined ? keeps : KEEPS_NEWLINES.has(own)
    if (node.tagName === 'BR') return '\n'
    const display = declared(built, node, 'display')
    const isBlock = display === undefined ? BLOCK_TAGS.has(node.tagName) : BLOCK_DISPLAYS.has(display)
    const inside = node.childNodes
      .map((one) => (one instanceof FakeText ? (keepsHere ? one.data : one.data.replace(/\n/g, ' ')) : walk(one, keepsHere)))
      .join('')
    return isBlock ? `\n${inside}\n` : inside
  }
  return walk(part, false)
    .split('\n')
    .map((one) => one.replace(/[ \t]+/g, ' ').trim())
    .filter((one) => one !== '')
}

describe('CR-607 -- the manuscript still says what these cases read', () => {
  it.each([
    FR_153_PLACE,
    FR_153_NOT_A_FIELD,
    FR_153_LABEL,
    FR_153_NEVER_FAINT,
    FR_153_QUESTION,
    FR_153_ASK_ALWAYS,
    FR_153_LINE_BREAKS,
    FR_153_ONLY_T_345,
    FR_153_NEVER_WHOLE,
    FR_153_CLEAR_THEN_RELOAD,
    FR_153_NO_AGENT_API,
  ])('FR-153: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-109 IC-139 stands on the Properties Panel; table T-234 QN-11 names the document only with unsaved edits', () => {
    expect(PROPERTIES_PANEL).toBe(PANEL_ROLE)
    expect(bare(rowOf(T_109, IC_139).by['正'] ?? '')).toBe('FR-153')
    expect((rowOf(T_234, QN_11).by['名前を挙げるか'] ?? '').trim().startsWith('挙げる')).toBe(true)
    expect(rowOf(T_234, QN_11).by['名前を挙げるか']).toContain('保存していない編集があるときだけ、捨てる文書の名前（`QN-5` と同じ）')
  })

  it('table T-027 UN-19: the reset is outside undo', () => {
    expect(rowOf(T_027, 'UN-19').cells.join(' ')).toContain('対象外')
    expect(rowOf(T_027, 'UN-19').cells.join(' ')).toContain('GRS リセット')
  })

  it('premise: the dictionary sentence of QN-11 holds line breaks in both languages', () => {
    for (const language of LANGUAGES) expect(sentenceOf(language).split('\n').length).toBeGreaterThan(1)
  })

  it('premise: the GRS keys share a prefix the foreign keys do not have', () => {
    expect(PREFIX.length).toBeGreaterThan(0)
    for (const key of Object.keys(FOREIGN_KEYS)) expect(key.startsWith(PREFIX)).toBe(false)
  })
})

describe(`FR-153 "${FR_153_PLACE}" -- the entry row heads the settings face`, () => {
  it.each(LANGUAGES)(`"${FR_153_NOT_A_FIELD}" -- IC-139 is no field of the face, and K-60 is still its first field (%s)`, async (language) => {
    const built = await bench(language)
    await openSettings(built)
    const panel = built.last().propertiesPanel
    expect(panel?.fields.some((one) => one.row === IC_139), 'IC-139 holds no value, so it is not a field').toBe(false)
    expect(panel?.fields[0]?.row).toBe(K_60)
  })

  it.each(LANGUAGES)('the IC-139 entry is drawn once, above the theme color field K-60 (%s)', async (language) => {
    const built = await bench(language)
    await openSettings(built)
    const stage = drawn({ propertiesPanel: built.last().propertiesPanel }, language)
    const panel = oneByRole(stage.root(), PANEL_ROLE)
    const order = descendants(panel)
    const entries = order.filter((one) => one.getAttribute('data-icon') === IC_139)
    expect(entries, `no ${IC_139} entry on the settings face: ${whatWasDrawn(panel)}`).toHaveLength(1)
    const fields = order.filter((one) => one.getAttribute('data-field-row') !== null)
    expect(fields[0]?.getAttribute('data-field-row'), 'the first field drawn is the theme color field').toBe(K_60)
    const entry = entries[0] as FakeElement
    const firstField = fields[0] as FakeElement
    expect(order.indexOf(entry), `${IC_139} must be drawn before (above) the ${K_60} field`).toBeLessThan(
      order.indexOf(firstField),
    )
    expect(selfAndDescendants(firstField).includes(entry), `${IC_139} is not inside the ${K_60} field`).toBe(false)
  })

  it.each(LANGUAGES)(`"${FR_153_LABEL}" -- the dictionary label stands to the left of the entry (%s)`, async (language) => {
    const built = await bench(language)
    await openSettings(built)
    const stage = drawn({ propertiesPanel: built.last().propertiesPanel }, language)
    const panel = oneByRole(stage.root(), PANEL_ROLE)
    const entry = descendants(panel).find((one) => one.getAttribute('data-icon') === IC_139)
    if (entry === undefined) throw new Error(`no ${IC_139} entry on the settings face: ${whatWasDrawn(panel)}`)
    const label = labelOf(language)
    let row: FakeElement | null = entry.parentNode
    while (row !== null && row !== panel && !textOf(row, entry).includes(label)) row = row.parentNode
    expect(row !== null && row !== panel, `no row shows "${label}" beside ${IC_139}: ${whatWasDrawn(panel)}`).toBe(true)
    const theRow = row as FakeElement
    expect(
      selfAndDescendants(theRow).some((one) => one.getAttribute('data-field-row') !== null),
      'the entry row holds no field',
    ).toBe(false)
    const order = selfAndDescendants(theRow)
    const insideEntry = selfAndDescendants(entry)
    const labelHolder = order.find(
      (one) =>
        !insideEntry.includes(one) &&
        one.childNodes.some((child) => child instanceof FakeText && child.data.includes(label)),
    )
    expect(labelHolder, `the label "${label}" is not drawn as text in the row`).toBeDefined()
    expect(order.indexOf(labelHolder as FakeElement), 'the label is left of the entry').toBeLessThan(order.indexOf(entry))
  })

  it(`"${FR_153_NEVER_FAINT}" -- the entry is drawn usable, with and without unsaved edits`, async () => {
    for (const withEdit of [false, true]) {
      const built = await bench('ja')
      if (withEdit) await built.rename('Edited')
      await openSettings(built)
      const stage = drawn({ propertiesPanel: built.last().propertiesPanel }, 'ja')
      const panel = oneByRole(stage.root(), PANEL_ROLE)
      const entry = descendants(panel).find((one) => one.getAttribute('data-icon') === IC_139)
      if (entry === undefined) throw new Error(`no ${IC_139} entry on the settings face: ${whatWasDrawn(panel)}`)
      expect(isFaint(entry), `IC-139 drawn faint (withEdit=${withEdit})`).toBe(false)
    }
  })
})

describe(`FR-153 "${FR_153_QUESTION}"`, () => {
  it.each(LANGUAGES)(`"${FR_153_ASK_ALWAYS}" -- with no unsaved edit, QN-11 stands and names nothing (%s)`, async (language) => {
    const built = await bench(language)
    expect(built.loop.hasUnsavedEdits(), 'premise: a fresh loop has no unsaved edit').toBe(false)
    await openSettings(built)
    await pressReset(built)
    const asked = built.last().confirmation
    expect(asked?.question, 'pressing IC-139 raises QN-11').toBe(QN_11)
    expect(asked?.manner).toBe(NT_7)
    expect(asked?.items).toEqual([])
    expect(asked?.text).toBe(sentenceOf(language))
  })

  it('with an unsaved edit, QN-11 names the open document -- the same item QN-5 names', async () => {
    const built = await askedBench('ja', true)
    const asked = built.last().confirmation
    expect(asked?.question).toBe(QN_11)
    const expected = discardQuestionOf(built.loop.document()).items
    expect(expected).toHaveLength(1)
    expect(asked?.items).toEqual(expected)
  })

  it('a second press while the question stands carries RS-27 (not shown) and leaves QN-11 standing', async () => {
    const built = await askedBench('ja')
    expect(built.last().notices, 'premise: the first press raised no notice').toEqual([])
    await pressReset(built)
    expect(built.last().notices, 'RS-27 is a hidden reason (表示の仕方「出さない」)').toEqual([])
    expect(bare(rowOf(T_233, RS_27).by['表示の仕方'] ?? '')).toBe('出さない')
    expect(built.last().confirmation?.question).toBe(QN_11)
  })

  it('nothing is removed and nothing reloads merely because the question was asked', async () => {
    const built = await askedBench('ja')
    expect(writesIn(built.storage).filter((one) => !one.startsWith('setItem'))).toEqual([])
    expect(built.reloads).toEqual([])
  })
})

describe('FR-153 -- calling it off (No, n, Esc) changes nothing', () => {
  const ways: readonly (readonly [string, (built: Bench) => Promise<void>])[] = [
    ['the No button', (built) => built.take(CONFIRMATION, null, CANCEL)],
    ['the n key', (built) => built.send(keyOf(KEY_N))],
    ['the Esc key', (built) => built.send(ESCAPE)],
  ]

  it.each(ways)('%s: no key removed, no reload, the document and its edit stay', async (_name, answer) => {
    const built = await askedBench('ja', true)
    expect(built.last().confirmation?.question, 'premise: QN-11 stands').toBe(QN_11)
    const writesBefore = writesIn(built.storage).length
    const keysBefore = [...(built.storage?.held.keys() ?? [])].sort()
    await answer(built)
    expect(built.last().confirmation, 'the answer takes the question down').toBeNull()
    expect(writesIn(built.storage).slice(writesBefore).filter((one) => !one.startsWith('setItem'))).toEqual([])
    expect([...(built.storage?.held.keys() ?? [])].sort()).toEqual(keysBefore)
    expect(built.reloads, 'calling it off must not reload').toEqual([])
    expect(firstTaskName(built.loop.document())).toBe('Edited before the reset')
    expect(built.loop.hasUnsavedEdits()).toBe(true)
  })
})

describe(`FR-153 "${FR_153_ONLY_T_345}" -- going on (Yes, y)`, () => {
  const ways: readonly (readonly [string, (built: Bench) => Promise<void>])[] = [
    ['the Yes button', (built) => built.take(CONFIRMATION, null, PROCEED)],
    ['the y key', (built) => built.send(keyOf(KEY.y))],
  ]

  it.each(ways)(`%s: "${FR_153_CLEAR_THEN_RELOAD}" -- the page reloads once, after the keys T-345 clears are gone`, async (_name, answer) => {
    const built = await askedBench('ja')
    await answer(built)
    expect(built.reloads, 'going on reloads the page exactly once').toHaveLength(1)
    expect(built.reloads[0], 'at the reload only the S-99c key and the foreign keys are left').toEqual(LEFT_AFTER_RESET)
    expect(built.last().confirmation).toBeNull()
  })

  it.each(ways)(`%s: "${FR_153_NEVER_WHOLE}" -- clear() is never called, no foreign key is touched`, async (_name, answer) => {
    const built = await askedBench('ja')
    await answer(built)
    const writes = writesIn(built.storage)
    expect(writes).not.toContain('clear')
    for (const one of writes) {
      const key = one.replace(/^\w+ /, '')
      expect(key.startsWith(PREFIX), `${one} touches a key that is not GRS's (WP-6)`).toBe(true)
    }
    for (const [key, value] of Object.entries(FOREIGN_KEYS)) expect(built.storage?.held.get(key)).toBe(value)
    expect(built.storage?.held.get(KEYS['S-99c'])).toBe('value of S-99c')
    expect(built.storage?.held.has(STALE_GRS_KEY), 'WP-5: an unnamed GRS key goes too').toBe(false)
    expect(built.storage?.held.has(KEYS['S-99a']), 'WP-2: S-99a goes').toBe(false)
  })

  it('with unsaved edits the reset still goes on and reloads once (the question already named the document)', async () => {
    const built = await askedBench('ja', true)
    await built.take(CONFIRMATION, null, PROCEED)
    expect(built.reloads).toHaveLength(1)
    expect(built.reloads[0]).toEqual(LEFT_AFTER_RESET)
  })

  it.each(['unreachable', 'refusing'] as const)(
    'a localStorage that throws (%s) is skipped silently and the page still reloads once',
    async (kind) => {
      const built = await bench('ja', kind)
      await openSettings(built)
      await pressReset(built)
      expect(built.last().confirmation?.question, 'premise: QN-11 stands').toBe(QN_11)
      await built.take(CONFIRMATION, null, PROCEED)
      expect(built.reloads).toHaveLength(1)
    },
  )
})

describe('table T-027 UN-19 -- the reset stacks no undo step', () => {
  // WHY: the person's undo key (table T-036 SK-6), not the Agent API's AM-9,
  // which this build answers with notAvailable.
  const undoKey = (): KeyInput => {
    const parts = (rowOf(T_036, 'SK-6').by['割当'] ?? '')
      .replace(/`/g, '')
      .replace(/＋/g, '+')
      .split('+')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
    const last = parts[parts.length - 1]
    if (last === undefined) throw new Error('table T-036 SK-6 states no assignment')
    const named = (name: string): boolean => parts.slice(0, -1).includes(name)
    return {
      kind: 'key',
      key: last,
      modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: named('Cmd') },
    }
  }

  it('premise: the undo key takes back a settled name edit', async () => {
    const built = await bench('ja')
    const original = firstTaskName(built.loop.document())
    await built.rename('Edited before the reset')
    await built.send(undoKey())
    expect(firstTaskName(built.loop.document())).toBe(original)
  })

  it('after an edit and a reset, the first undo takes back the edit -- no reset step sits on top', async () => {
    const built = await bench('ja')
    const original = firstTaskName(built.loop.document())
    await built.rename('Edited before the reset')
    await openSettings(built)
    await pressReset(built)
    expect(built.last().confirmation?.question, 'premise: QN-11 stands').toBe(QN_11)
    await built.take(CONFIRMATION, null, PROCEED)
    expect(built.reloads, 'premise: the reset was carried out').toHaveLength(1)
    await built.send(undoKey())
    expect(firstTaskName(built.loop.document()), 'the first undo after the reset').toBe(original)
  })
})

describe(`FR-153 "${FR_153_NO_AGENT_API}"`, () => {
  const NAMES = T_107.rows.map((row) => bare(row.by['確定名'] ?? ''))

  it('table T-107 has no member whose 正 is FR-153, and no member named for a reset', () => {
    expect(T_107.rows.filter((row) => (row.by['正'] ?? '').includes('FR-153'))).toEqual([])
    expect(NAMES.filter((name) => /reset|reload|clearStored/i.test(name))).toEqual([])
  })

  it('the installed Agent API carries no reset: every member is a row of table T-107', async () => {
    const built = await bench('ja')
    const api = installAgentApi({
      ...built.loop.agentApiSeams(),
      writerName: 'cr-607-tester',
      schemaVersion: (TEMPLATE as unknown as { schemaVersion: string }).schemaVersion,
    } as never)
    const members = Object.keys(api)
    expect(members.filter((name) => /reset|reload|clear/i.test(name))).toEqual([])
    expect(members.filter((name) => !NAMES.includes(name))).toEqual([])
  })
})

describe('CR-607 -- no palette entry and no key binding for the reset', () => {
  it('table T-036 assigns no key to IC-139 or FR-153', () => {
    expect(T_036.rows.filter((row) => row.cells.join(' ').includes(IC_139) || row.cells.join(' ').includes('FR-153'))).toEqual([])
  })

  it('table T-109 places IC-139 on the Properties Panel only', () => {
    expect(rowOf(T_109, IC_139).by['面']).not.toContain('Command Palette')
  })

  it('outside the Properties Panel, nothing on the screen carries IC-139', async () => {
    const built = await bench('ja')
    await openSettings(built)
    const view = built.last()
    expect(JSON.stringify({ ...view, propertiesPanel: null })).not.toContain(`"${IC_139}"`)
  })
})

describe(`FR-153 "${FR_153_LINE_BREAKS}"`, () => {
  it.each(LANGUAGES)('each line of the QN-11 sentence is its own line inside the Confirmation (%s)', async (language) => {
    const built = await askedBench(language)
    const confirmation = built.last().confirmation as Confirmation | null
    expect(confirmation?.question, 'premise: QN-11 stands').toBe(QN_11)
    const stage = drawn({ confirmation }, language)
    const part = oneByRole(stage.root(), CONFIRMATION)
    const shown = visibleLines(stage, part)
    const wanted = sentenceOf(language)
      .split('\n')
      .map((one) => one.replace(/[ \t]+/g, ' ').trim())
      .filter((one) => one !== '')
    for (const line of wanted) {
      expect(shown.some((one) => one.includes(line)), `"${line}" is not shown: ${JSON.stringify(shown)}`).toBe(true)
    }
    for (let at = 0; at + 1 < wanted.length; at += 1) {
      const one = wanted[at] as string
      const next = wanted[at + 1] as string
      expect(
        shown.some((drawnLine) => drawnLine.includes(one) && drawnLine.includes(next)),
        `"${one}" and "${next}" run together on one line: ${JSON.stringify(shown)}`,
      ).toBe(false)
    }
  })
})
