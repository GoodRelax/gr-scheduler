// CR-572: the viewer's screen values stay off the document, and the look the document keeps is saved and undoable.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type {
  ChosenFileWrite,
  FileReading,
  FileStore,
} from '../../src/adapter/file-gateway/file-gateway'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
} from '../../src/adapter/input-command-translator/input-source'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
} from '../../src/framework/single-html-shell/frame-loop'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable, unbroken, type SpecRow } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_039_STARTS_FROM_THE_BROWSER =
  '明暗テーマは文書に保存しない —— 起動したときにブラウザが伝える明暗（`prefers-color-scheme`）で描き、読めないときはライトで描くこと（MUST）'
const FR_039_REMEMBERED_NOWHERE =
  '押した切り替えは、そのページを閉じるまで効き、ファイルにもブラウザの保管庫にも覚えてはならない（MUST NOT）'
const FR_039_FONT_REACHES_THE_RULER = '文字サイズの変更は目盛にも及ぶこと（MUST）'
const FR_039_FONT_IS_AN_EDIT = '変更した結果は文書の編集として保存される'
const FR_041_ONLY_TWO_ARE_SAVED =
  '保存するのは `themeHue` / `themeMonochrome` の 2 つだけとし、明暗（`themePreference`）は画面の値とし（`FR-039`）'
const FR_052_STARTS_AT_S_171 =
  'プロパティパネルの幅は画面の値とし、起動のたびに `_assets/tbl-settings.md` の 表 T-206 の `S-171` から始めること（MUST）'
const FR_052_WRITES_NOWHERE = 'プロパティパネルの幅を、文書にもブラウザの保管庫にも書いてはならない（MUST NOT）'
const FR_063_SETTINGS_STAMP_MOVES =
  'どちらの群であれ動いた刻と、最後に書いた者は、見せ方の群だけを変えたときも更新すること（MUST）'
const FR_063_SCHEDULE_STAMP_STAYS = '見せ方の群だけを変える更新で、日程データの群の刻を動かしてはならない（MUST NOT）'
const FR_063_NOT_IN_THE_LOOK =
  '画面のどの操作も書き換えない値（道具の定数）と、見る人の画面の値（`_assets/tbl-settings.md` の 表 T-206）を見せ方に入れてはならない（MUST NOT）'
const FR_080_THE_SCREEN_SHRUNK = '`GRS` が占める画面の全体を'
const FR_041_SCREEN_AND_PICTURE_ALIKE = '画面と書き出した絵とで、同じ行を同じ値で塗ること（MUST）'
const DC_7_CLEARS = 'モードを出たら、置いた 2 本を消すこと（MUST）'
const DC_7_TO_NULL = '消したときは `dualCursor` を `null` へ戻すこと（MUST）'
const DC_6_NOT_IN_THE_DOCUMENT = '2 本の日付は画面の値であり（`_assets/tbl-settings.md` の 表 T-206 の `S-65`）、文書に入らない'
const T_108_IS_EVERY_COMMAND = '本表は `applyDocumentChange` が受け取る命令の全数である'

const BUILT_VERSION: string = (startupTemplate as { schemaVersion: string }).schemaVersion
const PREFERS_DARK = '(prefers-color-scheme: dark)'
const GLOBAL = globalThis as any

/** @purity pure */
function rowOf(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** @purity pure */
function surfaceOf(entry: string): string {
  return bare(rowOf('T-109', entry).cells[0] ?? '')
}

/** @purity pure */
function keyOf(id: string): KeyInput {
  const first = (rowOf('T-036', id).by['割当'] ?? '').split('／')[0] ?? ''
  const parts = [...first.matchAll(/`([^`]+)`/g)].map((span) => span[1] as string)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: named('Cmd') },
  }
}

const SAVE = keyOf('SK-11')
const UNDO = keyOf('SK-6')

/** @purity pure */
function numberOfRow(table: string, id: string, column: string): number {
  const found = /(\d+(?:\.\d+)?)/.exec(rowOf(table, id).by[column] ?? '')
  if (found === null) throw new Error(`table ${table} row ${id} states no number in ${column}`)
  return Number(found[1])
}

const S_171 = numberOfRow('T-206', 'S-171', '既定')
const GUIDE_DEFAULT = /'([^']+)'/.exec(rowOf('T-206', 'S-66').by['既定'] ?? '')?.[1]

/** @purity pure */
function perScale(id: string): Readonly<Record<string, number>> {
  const cell = rowOf('T-202', id).by['既定'] ?? ''
  return Object.fromEntries([...cell.matchAll(/([SML]) = (\d+)/g)].map((found) => [found[1], Number(found[2])]))
}

const SCALE_ORDER: readonly string[] = specTable('T-215').rows.map((row) => {
  const found = /fontScaleSizes\.([SML])/.exec(row.by['名前'] ?? '')
  if (found === null) throw new Error(`table T-215 row ${row.id} names no step`)
  return found[1] as string
})

const SCREEN: FrameEnvironment = { width: 1200, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerInput['phase'], x: number, y: number): PointerInput => ({
  kind: 'pointer', phase, button: 'left', x, y, modifiers: NO_MODIFIERS, clickCount: 1,
})

/** @purity pure */
function templateDocument(): Document {
  const read = documentFromJson(JSON.stringify(startupTemplate), BUILT_VERSION)
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

/** @purity pure */
function reopened(text: string): Document {
  const read = documentFromJson(text, BUILT_VERSION)
  if (!read.ok) throw new Error(`the saved file does not open: ${JSON.stringify(read.faults)}`)
  return read.document
}

interface Storage {
  readonly writes: string[]
}

/** @purity non-pure */
function fakeStorage(into: string[], name: string): unknown {
  const held = new Map<string, string>()
  return {
    getItem: (key: string) => held.get(key) ?? null,
    setItem: (key: string, value: string) => {
      into.push(`${name}:${key}=${value}`)
      held.set(key, value)
    },
    removeItem: (key: string) => {
      into.push(`${name}:-${key}`)
      held.delete(key)
    },
    clear: () => held.clear(),
    key: () => null,
    get length() {
      return held.size
    },
  }
}

let storage: Storage = { writes: [] }
const saved = { raf: GLOBAL.requestAnimationFrame, matchMedia: GLOBAL.matchMedia, local: GLOBAL.localStorage, session: GLOBAL.sessionStorage }

/** @purity non-pure */
function browserPrefers(answer: 'dark' | 'light' | 'absent' | 'throws'): void {
  if (answer === 'absent') {
    delete GLOBAL.matchMedia
    return
  }
  GLOBAL.matchMedia = (query: string) => {
    if (answer === 'throws') throw new Error('matchMedia is not readable here')
    return { matches: query === PREFERS_DARK && answer === 'dark', media: query }
  }
}

beforeEach(() => {
  const writes: string[] = []
  storage = { writes }
  Object.defineProperty(GLOBAL, 'localStorage', { value: fakeStorage(writes, 'local'), configurable: true, writable: true })
  Object.defineProperty(GLOBAL, 'sessionStorage', { value: fakeStorage(writes, 'session'), configurable: true, writable: true })
  browserPrefers('light')
})

afterEach(() => {
  for (const [name, value] of [
    ['requestAnimationFrame', saved.raf],
    ['matchMedia', saved.matchMedia],
    ['localStorage', saved.local],
    ['sessionStorage', saved.session],
  ] as const) {
    if (value === undefined) delete GLOBAL[name]
    else Object.defineProperty(GLOBAL, name, { value, configurable: true, writable: true })
  }
})

/** @purity non-pure */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

interface Bench {
  readonly loop: FrameLoop
  press(entry: string): void
  send(input: HumanInput): void
  save(): Promise<string>
  view(): ScreenView
  chosen(entry: string): boolean | undefined
  drawnPanelWidth(): number
  dragPanelDividerBy(dx: number): void
}

/** @purity non-pure */
function bench(document: Document = templateDocument()): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL.requestAnimationFrame = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const views: ScreenView[] = []
  const written: ChosenFileWrite[] = []
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
      const divider = views[views.length - 1]?.frame.dividers.find(
        (one) => x >= one.band.x && x < one.band.x + one.band.width && y >= one.band.y && y < one.band.y + one.band.height,
      )
      if (divider === undefined) return null
      return { part: 'Panel Divider', entry: null, format: null, rowGroupId: null, resourceUid: null, dividerPanel: divider.panel, noticeDismissKey: null } as unknown as ScreenPart
    },
  }
  const store: FileStore = {
    readFileToOpen: () => new Promise<FileReading>(() => {}),
    adoptFileReadToOpen: () => undefined,
    readOpenedFileState: async () => ({ kind: 'none' }),
    restoreOpenedFilePermission: async () => ({ kind: 'none' }),
    overwriteOpenedFile: async () => ({ ok: false, fault: { reason: 'noOpenedFile', what: 'never in a file' } }),
    writeChosenFile: async (write) => {
      written.push(write)
      return { ok: true, openedFile: { kind: 'writable', fileName: write.suggestedFileName } }
    },
  }
  const loop = frameLoop({ showSvg: () => undefined } as any, document, SCREEN, { surface, language: 'ja' }, store)
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
  const drawnPanelWidth = (): number => {
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame')
    return values.regions.propertiesPanel.width
  }
  return {
    loop,
    send,
    view,
    press: (entry) => {
      aimed = { part: surfaceOf(entry), entry, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as unknown as ScreenPart
      send(pointer('down', 600, 20))
      send(pointer('up', 600, 20))
      aimed = null
    },
    save: async () => {
      const before = written.length
      send(SAVE)
      await settle()
      drain()
      const write = written[before]
      if (write === undefined) throw new Error('SK-11 wrote no file')
      return new TextDecoder().decode(write.bytes)
    },
    chosen: (entry) =>
      (view().commandPalette?.groups ?? []).flatMap((group) => group.commands).find((one) => one.icon === entry)?.isChosen,
    drawnPanelWidth,
    dragPanelDividerBy: (dx) => {
      const band = view().frame.dividers.find((one) => one.panel === 'propertiesPanel')?.band
      if (band === undefined) throw new Error('no Panel Divider band is drawn for the property panel')
      const at = { x: band.x + band.width / 2, y: band.y + band.height / 2 }
      send(pointer('down', at.x, at.y))
      send(pointer('move', at.x + dx / 2, at.y))
      send(pointer('move', at.x + dx, at.y))
      send(pointer('up', at.x + dx, at.y))
    },
  }
}

const settingsOf = (loop: FrameLoop): Record<string, unknown> =>
  loop.document().documentSettings as unknown as Record<string, unknown>
const stampOf = (loop: FrameLoop): Record<string, unknown> =>
  (loop.document() as unknown as { documentStamp: Record<string, unknown> }).documentStamp

/** @purity pure */
function keysAnywhere(text: string, keys: readonly string[]): string[] {
  const found: string[] = []
  const walk = (value: unknown, at: string): void => {
    if (Array.isArray(value)) {
      value.forEach((one, index) => walk(one, `${at}/${index}`))
      return
    }
    if (value === null || typeof value !== 'object') return
    for (const [key, inner] of Object.entries(value)) {
      if (keys.includes(key)) found.push(`${at}/${key}`)
      walk(inner, `${at}/${key}`)
    }
  }
  walk(JSON.parse(text), '')
  return found
}

const VIEWER_KEYS = ['themePreference', 'guideCursorMode', 'dualCursor', 'propertyPanelWidth']

describe('CR-572 -- the manuscript these cases are driven by', () => {
  it('FR-039, FR-041, FR-052, FR-063, FR-080, DC-6, DC-7 and table T-108 still say it word for word', () => {
    for (const sentence of [
      FR_039_STARTS_FROM_THE_BROWSER,
      FR_039_REMEMBERED_NOWHERE,
      FR_039_FONT_REACHES_THE_RULER,
      FR_039_FONT_IS_AN_EDIT,
      FR_041_ONLY_TWO_ARE_SAVED,
      FR_041_SCREEN_AND_PICTURE_ALIKE,
      FR_052_STARTS_AT_S_171,
      FR_052_WRITES_NOWHERE,
      FR_063_SETTINGS_STAMP_MOVES,
      FR_063_SCHEDULE_STAMP_STAYS,
      FR_063_NOT_IN_THE_LOOK,
      FR_080_THE_SCREEN_SHRUNK,
      DC_6_NOT_IN_THE_DOCUMENT,
      DC_7_CLEARS,
      DC_7_TO_NULL,
    ]) {
      expect(REQUIREMENTS, sentence).toContain(sentence)
    }
    expect(unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-glossary.md'), 'utf8'))).toContain(T_108_IS_EVERY_COMMAND)
  })

  it('the rows the cases press and read are where the tables put them', () => {
    expect([surfaceOf('IC-16'), surfaceOf('IC-100'), surfaceOf('IC-17'), surfaceOf('IC-7')]).toEqual(['App Header', 'App Header', 'App Header', 'App Header'])
    expect([surfaceOf('IC-47'), surfaceOf('IC-99'), surfaceOf('IC-45')]).toEqual(['Command Palette', 'Command Palette', 'Command Palette'])
    expect(rowOf('T-109', 'IC-16').cells.join(' ')).toContain('`S-72`')
    expect(rowOf('T-109', 'IC-100').cells.join(' ')).toContain('`S-74`')
    expect(S_171).toBeGreaterThan(0)
    expect(GUIDE_DEFAULT).toBe('none')
    expect(SCALE_ORDER).toEqual(['S', 'M', 'L'])
  })
})

describe('CR-572 item 4 -- light and dark start from the browser (FR-039)', () => {
  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['absent', 'light'],
    ['throws', 'light'],
  ] as const)(`FR-039 「${FR_039_STARTS_FROM_THE_BROWSER}」: prefers-color-scheme %s -> %s`, (browser, expected) => {
    browserPrefers(browser)
    expect(bench().loop.themePreference()).toBe(expected)
  })

  it('the document does not decide it: a template opened under a dark browser starts dark', () => {
    browserPrefers('dark')
    expect(bench(templateDocument()).loop.themePreference()).toBe('dark')
  })
})

describe('CR-572 item 4 -- switching light and dark touches nothing the document or the browser keeps', () => {
  it('IC-16 flips the screen value', () => {
    const built = bench()
    const before = built.loop.themePreference()
    built.press('IC-16')
    expect(built.loop.themePreference()).not.toBe(before)
  })

  it('FR-100: it is not an unsaved edit, and FR-063: neither stamp moves, the document is the same', () => {
    const built = bench()
    const document = JSON.stringify(built.loop.document())
    built.press('IC-16')
    expect(built.loop.hasUnsavedEdits()).toBe(false)
    expect(JSON.stringify(built.loop.document())).toBe(document)
  })

  it(`FR-039 「${FR_039_REMEMBERED_NOWHERE}」: nothing is written to the browser's storage`, () => {
    const built = bench()
    const before = storage.writes.length
    built.press('IC-16')
    built.press('IC-16')
    expect(storage.writes.slice(before)).toEqual([])
  })

  it('table T-027: it is no undo step -- an undo after it takes back the monochrome step before it, and leaves the theme', () => {
    const built = bench()
    built.press('IC-100')
    expect(settingsOf(built.loop)['themeMonochrome']).toBe(true)
    built.press('IC-16')
    const switched = built.loop.themePreference()
    built.send(UNDO)
    expect(settingsOf(built.loop)['themeMonochrome']).toBe(false)
    expect(built.loop.themePreference()).toBe(switched)
  })

  it('FR-039: the saved file does not carry it, and after a reload the browser decides again', async () => {
    browserPrefers('light')
    const built = bench()
    built.press('IC-16')
    expect(built.loop.themePreference()).toBe('dark')
    const text = await built.save()
    expect(keysAnywhere(text, ['themePreference'])).toEqual([])
    expect(bench(reopened(text)).loop.themePreference()).toBe('light')
  })
})

describe('CR-572 item 5 -- monochrome stays in the file (FR-041, UN-13)', () => {
  it(`FR-041 「${FR_041_ONLY_TWO_ARE_SAVED}」: IC-100 writes themeMonochrome and is an unsaved edit`, () => {
    const built = bench()
    expect(settingsOf(built.loop)['themeMonochrome']).toBe(false)
    built.press('IC-100')
    expect(settingsOf(built.loop)['themeMonochrome']).toBe(true)
    expect(built.loop.hasUnsavedEdits()).toBe(true)
  })

  it(`FR-063 「${FR_063_SETTINGS_STAMP_MOVES}」 and 「${FR_063_SCHEDULE_STAMP_STAYS}」`, () => {
    const built = bench()
    const before = stampOf(built.loop)
    built.press('IC-100')
    const after = stampOf(built.loop)
    expect(after['settingsUpdatedUtc']).not.toBe(before['settingsUpdatedUtc'])
    expect(after['scheduleUpdatedUtc']).toBe(before['scheduleUpdatedUtc'])
  })

  it('UN-13: it is an undo step', () => {
    const built = bench()
    built.press('IC-100')
    built.send(UNDO)
    expect(settingsOf(built.loop)['themeMonochrome']).toBe(false)
  })

  it('WY-1: a saved file reopens monochrome', async () => {
    const built = bench()
    built.press('IC-100')
    const text = await built.save()
    expect(reopened(text).documentSettings.themeMonochrome).toBe(true)
    expect(settingsOf(bench(reopened(text)).loop)['themeMonochrome']).toBe(true)
  })
})

describe('CR-572 item 6 -- the guide cursor and the property panel width are screen values (FR-048, FR-052)', () => {
  it('IC-47 sets the guide cursor without an unsaved edit or a change to the document', () => {
    const built = bench()
    const document = JSON.stringify(built.loop.document())
    built.press('IC-47')
    expect(built.chosen('IC-47'), 'premise: the palette marks the chosen guide cursor').toBe(true)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
    expect(JSON.stringify(built.loop.document())).toBe(document)
  })

  it('table T-206 S-66: after a save and a reload the guide cursor is none again', async () => {
    const built = bench()
    built.press('IC-47')
    built.press('IC-100')
    const text = await built.save()
    expect(keysAnywhere(text, ['guideCursorMode'])).toEqual([])
    const reloaded = bench(reopened(text))
    expect(reloaded.chosen('IC-47')).toBe(false)
    expect(reloaded.chosen('IC-48')).toBe(false)
  })

  it(`FR-052 「${FR_052_STARTS_AT_S_171}」: a dragged width is not in the saved file, and a reload starts at S-171`, async () => {
    const built = bench()
    built.press('IC-17')
    expect(built.drawnPanelWidth()).toBeCloseTo(S_171, 6)
    built.dragPanelDividerBy(-40)
    expect(built.drawnPanelWidth(), 'premise: the drag moved the width').toBeCloseTo(S_171 + 40, 6)
    expect(built.loop.hasUnsavedEdits(), FR_052_WRITES_NOWHERE).toBe(false)
    built.press('IC-100')
    const text = await built.save()
    expect(keysAnywhere(text, ['propertyPanelWidth'])).toEqual([])
    const reloaded = bench(reopened(text))
    reloaded.press('IC-17')
    expect(reloaded.drawnPanelWidth()).toBeCloseTo(S_171, 6)
  })

  it(`FR-052 「${FR_052_WRITES_NOWHERE}」: nothing reaches the browser's storage either`, () => {
    const built = bench()
    built.press('IC-17')
    const before = storage.writes.length
    built.dragPanelDividerBy(-40)
    expect(storage.writes.slice(before)).toEqual([])
  })
})

describe('CR-572 item 7 -- the dual cursor dates are never in the file, and leaving the mode clears them', () => {
  const entered = (): ScreenSession => {
    const events: SessionEvent[] = [
      { type: 'dualCursorEntryPressed', date: '2026-03-02', hasDaysToPlace: true },
      { type: 'dualCursorPlaced', date: '2026-03-04' },
      { type: 'dualCursorPlaced', date: '2026-03-09' },
    ]
    return events.reduce((session, event) => advanceScreenSession(session, event).state, emptyScreenSession)
  }

  it('premise: placing the two sets the screen value', () => {
    expect(entered().screen.dualCursor).not.toBeNull()
  })

  it.each([
    ['the same entrance again (DC-4)', { type: 'dualCursorEntryPressed', date: '2026-03-02', hasDaysToPlace: true }],
    ['Esc (DC-4)', { type: 'escapePressed', rung: 'dualCursorMode' }],
    ['a guide cursor entrance (DC-9)', { type: 'guideCursorEntryPressed', guideCursor: 'crosshair' }],
  ] as const)(`DC-7 「${DC_7_CLEARS}」 「${DC_7_TO_NULL}」: left by %s`, (_name, event) => {
    const left = advanceScreenSession(entered(), event as SessionEvent)
    expect(left.state.screen.dualCursor).toBeNull()
  })

  it(`DC-6 「${DC_6_NOT_IN_THE_DOCUMENT}」: entering and placing through the shell leaves the document and the unsaved mark alone`, async () => {
    const built = bench()
    const document = JSON.stringify(built.loop.document())
    built.press('IC-45')
    const rowArea = built.loop.current()?.regions.rowArea
    if (rowArea === undefined) throw new Error('no frame')
    built.send(pointer('down', rowArea.x + rowArea.width / 3, rowArea.y + 10))
    built.send(pointer('up', rowArea.x + rowArea.width / 3, rowArea.y + 10))
    expect(built.loop.hasUnsavedEdits()).toBe(false)
    expect(JSON.stringify(built.loop.document())).toBe(document)
    built.press('IC-100')
    const text = await built.save()
    expect(keysAnywhere(text, ['dualCursor', 'date1', 'date2'])).toEqual([])
  })
})

describe('CR-572 item 8 -- the font size stays in the file and the ruler follows it (FR-039)', () => {
  it(`FR-039 「${FR_039_FONT_REACHES_THE_RULER}」: IC-99 moves fontScale to the next step of T-215, and S-3 / S-2 follow`, () => {
    const built = bench()
    const from = settingsOf(built.loop)['fontScale'] as string
    const next = SCALE_ORDER[(SCALE_ORDER.indexOf(from) + 1) % SCALE_ORDER.length] as string
    built.press('IC-99')
    const after = settingsOf(built.loop)
    expect(after['fontScale']).toBe(next)
    expect(after['rulerFont']).toBe(perScale('S-3')[next])
    expect(after['rulerHeight']).toBe(perScale('S-2')[next])
  })

  it(`FR-039 「${FR_039_FONT_IS_AN_EDIT}」: an unsaved edit, an undo step (UN-13), and in the saved file`, async () => {
    const built = bench()
    const from = settingsOf(built.loop)['fontScale']
    built.press('IC-99')
    expect(built.loop.hasUnsavedEdits()).toBe(true)
    const moved = { ...settingsOf(built.loop) }
    const text = await built.save()
    const written = (JSON.parse(text) as { documentSettings: Record<string, unknown> }).documentSettings
    expect([written['fontScale'], written['rulerFont'], written['rulerHeight']]).toEqual([moved['fontScale'], moved['rulerFont'], moved['rulerHeight']])
    built.send(UNDO)
    expect(settingsOf(built.loop)['fontScale']).toBe(from)
  })
})

describe('CR-572 item 9 -- the Agent API sends CM-64 and none of the four retired commands (table T-108)', () => {
  const RETIRED = ['setGuideCursorMode', 'setDualCursor', 'clearDualCursor', 'setThemePreference']

  const agentOf = (built: Bench) =>
    installAgentApi({ ...built.loop.agentApiSeams(), writerName: 'cr-572-tester', schemaVersion: BUILT_VERSION } as never)

  it('premise: T-108 names setThemeMonochrome as CM-64 and does not name the four', () => {
    const names = specTable('T-108').rows.map((row) => bare(row.by['確定名'] ?? ''))
    expect(bare(rowOf('T-108', 'CM-64').by['確定名'] ?? '')).toBe('setThemeMonochrome')
    expect(RETIRED.filter((name) => names.includes(name))).toEqual([])
  })

  it('CM-64: an Agent can still switch monochrome, and it lands in the document', () => {
    const built = bench()
    const api = agentOf(built)
    const outcome = api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: 'setThemeMonochrome', monochrome: true } as never] })
    expect(outcome.accepted).toBe(true)
    expect(settingsOf(built.loop)['themeMonochrome']).toBe(true)
  })

  it.each(RETIRED)(`「${T_108_IS_EVERY_COMMAND}」: %s is refused and the document is unchanged`, (kind) => {
    const built = bench()
    const api = agentOf(built)
    const document = JSON.stringify(built.loop.document())
    const outcome = api.applyCommands({
      readStamp: api.readStamp(),
      commands: [{ kind, themePreference: 'dark', guideCursorMode: 'crosshair', date1: '2026-03-02', date2: '2026-03-04' } as never],
    })
    expect(outcome.accepted).toBe(false)
    expect(JSON.stringify(built.loop.document())).toBe(document)
    expect(keysAnywhere(JSON.stringify(built.loop.document()), VIEWER_KEYS)).toEqual([])
  })
})

describe('CR-572 item 10 -- the exported picture uses the exporter\'s light/dark and the document\'s monochrome', () => {
  it(`FR-080 「${FR_080_THE_SCREEN_SHRUNK}」 / FR-041 「${FR_041_SCREEN_AND_PICTURE_ALIKE}」`, () => {
    browserPrefers('light')
    const built = bench()
    built.press('IC-16')
    built.press('IC-100')
    const scene = built.loop.exportScene()
    if (scene === null) throw new Error('no export scene')
    expect(scene.themePreference).toBe(built.loop.themePreference())
    expect(scene.themePreference).toBe('dark')
    expect(scene.settings.themeMonochrome).toBe(true)
  })

  it('control: the other way round -- light exporter, colour document', () => {
    browserPrefers('dark')
    const built = bench()
    built.press('IC-16')
    const scene = built.loop.exportScene()
    if (scene === null) throw new Error('no export scene')
    expect(scene.themePreference).toBe('light')
    expect(scene.settings.themeMonochrome).toBe(false)
  })
})
