// Contract tests: open, reload and save carry a hidden reason on a second press during a wait.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  ChosenFileWrite,
  FileReading,
  FileStore,
  FileWriting,
  OpenedFileState,
} from '../../src/adapter/file-gateway/file-store'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable, unbroken } from './spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fake host patches a browser global */

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const FR_029_TELL_ON_A_PRESS =
  '利用者が薄く描いた入口を押したときに限り、`GRS` は行えない理由を通知の仕組みへ運ぶこと（例外は `IMPS-1114`）。`GRS` は、行えない理由を運ぶ作法を `FR-076` の 表 T-037 の `NT-1` に従わせること。`GRS` は、運ぶ理由を、押された入口の場面に当たる `FR-076` の 表 T-233 の行とすること。'

// Spec: IMPS-1125
const T_233_ONLY_ITS_OWN_ROWS =
  '`GRS` は、通知が運ぶ理由を 表 T-233 の行とすること。`GRS` は、表 T-233 に無い理由を運ばないこと（例外は `IMPS-1134` の取り込みの検証の拒否の 1 つだけである）。'

// Spec: IMPS-1113
const FR_029_RS_27_IS_THE_FALLBACK = 'もし押された入口の場面に当たる行が 表 T-233 に無い場合、`GRS` は落ち先の `RS-27`（出さない）を運ぶこと。'

const OP_13_NOTHING_TO_REREAD = '開いているファイルが無いときは何もしないこと（MUST）'

const T_036: SpecTable = specTable('T-036')
const T_233: SpecTable = specTable('T-233')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

// Why: the keys are read from table T-036, not typed, so a press cannot miss the gate
// it means to reach.
function keyOf(id: string): KeyInput {
  const parts = ((rowOf(T_036, id).by['割当'] ?? '').split('/')[0] ?? '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/＋/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: {
      ctrl: named('Ctrl'),
      shift: named('Shift'),
      alt: named('Alt'),
      meta: named('Cmd'),
    } satisfies InputModifiers,
  }
}

const mannerOf = (reason: string): string => bare(rowOf(T_233, reason).by['作法'] ?? '')

interface ReasonWords {
  readonly specTableRowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
  readonly nextStep: Readonly<Record<DisplayLanguage, string>>
}

const REASON_WORDS: readonly ReasonWords[] = (
  JSON.parse(
    readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons: ReasonWords[] }
).reasons

function wordsFor(specTableRowId: string): ReasonWords {
  const found = REASON_WORDS.find((one) => one.specTableRowId === specTableRowId)
  if (found === undefined) throw new Error(`FR-038's dictionary holds no words for ${specTableRowId}`)
  return found
}

const RS_27 = 'RS-27'

interface Gate {
  readonly key: string
  readonly what: string
  // Why: OP-13 has a reread do nothing while no file is open, so the reload gate is driven
  // with one; else its silence would be OP-13's, not the gate's.
  readonly needsAnOpenedFile: boolean
}

const GATES: readonly Gate[] = [
  { key: 'SK-10', what: 'open', needsAnOpenedFile: false },
  { key: 'SK-21', what: 'reload', needsAnOpenedFile: true },
  { key: 'SK-11', what: 'save', needsAnOpenedFile: true },
]

interface StoreProbe {
  readonly store: FileStore
  pending(): number
}

// Summary: fileStore leaves every awaited road unresolved, so the loop stays in its wait.
function fileStore(opened: OpenedFileState): StoreProbe {
  const waiting: (() => void)[] = []
  const never = <T,>(): Promise<T> =>
    new Promise<T>(() => {
      waiting.push(() => undefined)
    })
  const store: FileStore = {
    askToWriteOver: async () => true,
    readFileToOpen: () => never<FileReading>(),
    // Why: answered at once: OP-13 must see whether a file is open and the FR-060 overwrite
    // needs a target; only the work is left hanging.
    readOpenedFileState: async () => opened,
    restoreOpenedFilePermission: async () => opened,
    overwriteOpenedFile: (_bytes: Uint8Array) => never<FileWriting>(),
    writeChosenFile: (_write: ChosenFileWrite) => never<FileWriting>(),
  } as unknown as FileStore
  return { store, pending: () => waiting.length }
}

const A_FILE_IS_OPEN: OpenedFileState = { kind: 'writable', fileName: 'here.grs.json' }
const NO_FILE_IS_OPEN: OpenedFileState = { kind: 'none' }

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
}

function host(): Host {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  last(): ScreenView | null
}

function screenPane(language: DisplayLanguage): ScreenPane {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => null as ScreenPart | null,
  } as unknown as ScreenSurface
  return {
    wiring: { surface, language } as unknown as ScreenWiring,
    last: () => views[views.length - 1] ?? null,
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

interface Stage {
  readonly loop: FrameLoop
  readonly files: StoreProbe
  press(input: HumanInput): Promise<void>
  notices(): ScreenView['notices']
}

function stage(opened: OpenedFileState, language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const files = fileStore(opened)
  const loop = frameLoop(
    pen.surface,
    structuredClone(TEMPLATE),
    SCREEN,
    screen.wiring,
    files.store,
  )
  pen.runAnimationFrames()
  return {
    loop,
    files,
    press: async (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
      await settle()
      pen.runAnimationFrames()
    },
    notices: () => screen.last()?.notices ?? [],
  }
}

const openedFor = (gate: Gate): OpenedFileState =>
  gate.needsAnOpenedFile ? A_FILE_IS_OPEN : NO_FILE_IS_OPEN

// Spec: FR-029, FR-076, T-233, RS-27, NT-1, T-036, SK-10, SK-11, SK-21, OP-13
describe('FR-029 / 表 T-233 -- the manuscript this file is driven by', () => {
  it('still ties the telling to a press and to the MATCHING row, and still names RS-27 as the fall-through', () => {
    expect(REQUIREMENTS).toContain(FR_029_TELL_ON_A_PRESS)
    expect(REQUIREMENTS).toContain(FR_029_RS_27_IS_THE_FALLBACK)
    expect(REQUIREMENTS).toContain(T_233_ONLY_ITS_OWN_ROWS)
  })

  it('表 T-233 still holds RS-27 with FR-029 for its 正 and NT-1 for its 作法', () => {
    expect(rowOf(T_233, RS_27).cells.join(' ')).toContain('いま行えることを持たない')
    expect(mannerOf(RS_27)).toBe('NT-1')
    expect(bare(rowOf(T_233, RS_27).by['正'] ?? '')).toBe('FR-029')
  })

  it('⭐ RS-27 says something no other row of 表 T-233 says', () => {
    // Why: with shared words, 'the telling carried RS-27' would pass on a loop carrying any row.
    const mine = wordsFor(RS_27).text.ja
    const others = T_233.rows
      .filter((one) => one.id !== RS_27)
      .map((one) => REASON_WORDS.find((word) => word.specTableRowId === one.id)?.text.ja)
      .filter((one): one is string => one !== undefined)
    expect(mine.length).toBeGreaterThan(0)
    expect(others).not.toContain(mine)
    expect(wordsFor(RS_27).text.en.length).toBeGreaterThan(0)
    expect(wordsFor(RS_27).text.en).not.toBe(mine)
  })

  it('表 T-036 still assigns the three keys DFC-337 corrected itself about', () => {
    expect(keyOf('SK-10')).toEqual({
      kind: 'key',
      key: 'O',
      modifiers: { ctrl: true, shift: false, alt: false, meta: false },
    })
    expect(keyOf('SK-11').modifiers.ctrl).toBe(true)
    expect(keyOf('SK-21')).toEqual({
      kind: 'key',
      key: 'R',
      modifiers: { ctrl: true, shift: false, alt: false, meta: false },
    })
    expect(rowOf(T_036, 'SK-21').cells.join(' ')).toContain('読み直す')
  })

  it('表 T-024a OP-13 still refuses to reread while no file is open', () => {
    expect(REQUIREMENTS).toContain(OP_13_NOTHING_TO_REREAD)
  })

  it('nothing is being told before anything is pressed', () => {
    for (const gate of GATES) {
      expect(stage(openedFor(gate)).notices(), gate.what).toEqual([])
    }
  })
})

// Spec: FR-029
describe('FR-029 -- the first press is answered by doing the work, not by a telling', () => {
  for (const gate of GATES) {
    it(`${gate.key} (${gate.what}): one press raises no telling and leaves a road in flight`, async () => {
      const built = stage(openedFor(gate))

      await built.press(keyOf(gate.key))

      expect(
        built.notices(),
        `${gate.key} told the person something on the first press -- FR-029 raises a reason only ` +
          'where the press can do nothing',
      ).toEqual([])
      expect(
        built.files.pending(),
        `${gate.key} started no file operation at all, so the second press below is not measuring ` +
          'a wait',
      ).toBeGreaterThan(0)
    })
  }
})

// Spec: FR-029, T-233, RS-27
describe('FR-029 (MUST) -- a second press while a write is pending carries RS-27, which is not shown', () => {
  for (const gate of GATES) {
    it(`${gate.key} (${gate.what}): the second press starts nothing and puts no notice up`, async () => {
      const built = stage(openedFor(gate))

      await built.press(keyOf(gate.key))
      expect(built.notices(), 'the first press was not silent').toEqual([])
      const pending = built.files.pending()
      await built.press(keyOf(gate.key))

      expect(built.notices(), `${gate.key}: RS-27 is a hidden reason (表 T-233 の表示の仕方)`).toEqual([])
      expect(built.files.pending(), `${gate.key}: the second press started a second operation`).toBe(pending)
    })
  }

  it('⭐ the row it carries is RS-27, and table T-233 does not show it', () => {
    expect(bare(T_233.rows.find((one) => one.id === RS_27)?.by['表示の仕方'] ?? '')).toBe('出さない')
  })

  it('⭐⭐ the control: the same key on a loop with no store raises no RS-27 for THIS reason', async () => {
    // Why: a press with work to do must be silent; this keeps the cases above from passing
    // on a gate that tells at every press.
    const first = stage(NO_FILE_IS_OPEN)
    await first.press(keyOf('SK-10'))

    expect(
      first.notices(),
      'the gate answered a press that had work to do with a telling, which FR-029 does not ask for',
    ).toEqual([])
  })

  it('⭐ the control: the three gates are three roads, not one', async () => {
    // Why: the second press is a different gate, so a loop that guards only a repeat of the
    // same key, or keeps a private flag per gate, starts a write here and fails.
    const built = stage(A_FILE_IS_OPEN)

    await built.press(keyOf('SK-10'))
    expect(built.notices(), 'the opening press was not silent').toEqual([])
    const pending = built.files.pending()
    await built.press(keyOf('SK-11'))

    expect(built.files.pending(), 'a save pressed while an open was in flight started a write').toBe(pending)
    expect(built.notices(), 'RS-27 is not shown (CR-712)').toEqual([])
  })
})
