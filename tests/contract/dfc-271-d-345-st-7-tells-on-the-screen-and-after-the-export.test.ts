// Contract tests: ST-7's safety valve is told on the screen road and again after a picture export.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  Clipboard,
  ClipboardContent,
  ClipboardWriting,
} from '../../src/adapter/clipboard-gateway/clipboard-gateway'
import type {
  ChosenFileWrite,
  FileReading,
  FileStore,
} from '../../src/adapter/file-gateway/file-store'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  Notice,
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
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture document and the fakes are built as loose shapes */

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

// Why: Japanese in code: these strings are the clauses, the exception rule 03 section 5
// admits, and matching them against the manuscript ties the cases to the spec.
const ST_7_STOP_AND_TELL_ON_A_VALUE =
  '段数が安全弁に達したとき、`GRS` は、達したところで処理を止めること。段数が安全弁に達したとき、`GRS` は、達したことを判別できる値で返すこと。段数が安全弁に達したとき、`GRS` は、達したことを人に通知すること。'

const ST_7_NO_EXCEPTION = '段数が安全弁に達したとき、`GRS` は例外を投げないこと。'

const ST_7_NOT_ONLY_THE_SCREEN_ROAD =
  '`GRS` は、安全弁の通知先を画面を描く経路に限らないこと。'

const ST_7_TELL_AFTER_THE_EXPORT =
  '絵を書き出す経路（`FR-080`）で安全弁に達したとき、`GRS` は、書き出しを終えたあとで同じ通知を画面に上げること。'

const ST_7_CAP_IS_THE_HIGHEST_ALLOWED =
  '`GRS` は、安全弁の値（`_assets/tbl-settings.md` の `S-89`）を「許される段数の上限」として扱うこと。'

// Spec: IMPS-962
const FR_025_IC_3_SENDS_AT_ONCE =
  '`GRS` は、`IO-6`（クリップボード）の入口を 表 T-109 の `IC-3` とすること。`IC-3` が押されたとき、`GRS` は、選択面を開かずに直ちに送ること。'

const SK_19_DISMISSES_ONE =
  '出ている通知がある間、 `Enter` を押したとき、`GRS` は、出ている通知を 1 つ消すこと（作法は 表 T-037 の `NT-8`）。'

const T_036: SpecTable = specTable('T-036')
const T_037: SpecTable = specTable('T-037')
const T_109: SpecTable = specTable('T-109')
const T_233: SpecTable = specTable('T-233')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const RS_24 = 'RS-24'

const MANNER_OF_RS_24 = bare(rowOf(T_233, RS_24).by['作法'] ?? '')

// Why: the cell is parsed here rather than by bare, since for SK-21's Ctrl + R bare would
// answer Ctrl.
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

// Spec: SK-12, FR-096
const SK_12 = keyOf('SK-12')
// Spec: SK-19
const SK_19 = keyOf('SK-19')

const surfaceOf = (entry: string): string => bare(rowOf(T_109, entry).by['面'] ?? '')

const EXPORT_CHOOSER = bare(rowOf(specTable('T-103'), 'U-54').by['確定名（英）'] ?? '')

// Why: the manuscript's copy is read, since the cases are driven from docs/spec; the
// src/ copy is held to it by npm run words:check, not here.
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
  if (found === undefined) {
    throw new Error(
      `FR-076 (MUST): table T-233 row ${specTableRowId} has no entry in FR-038's dictionary, so a notice ` +
        'carrying it cannot be told in words',
    )
  }
  return found
}

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

// Why: S-89 is a tool constant no document can lower, so the fixture stacks that many Tasks.
const CAP = SETTINGS_CONSTANTS.stackSafetyCap

const ROW_ID = '11111111-2222-3333-4444-555555555555'

function task(uid: number): Record<string, unknown> {
  return {
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name: `Task ${uid}`,
    start: '2026-04-01T00:00:00',
    finish: '2026-04-10T00:00:00',
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
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

// Why: the tasks overlap outright, not merely touch (ST-10), so ST-3's greedy assignment
// opens one stack per task and the stack count is howMany.
function documentOfOverlaps(howMany: number): Document {
  const template = structuredClone(TEMPLATE) as any
  const uids = Array.from({ length: howMany }, (_, index) => index + 1)
  return {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        title: 'A row that reaches the valve',
        uidHighWaterMark: 1000,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: uids.map((uid) => task(uid)),
      resources: [],
      assignments: [],
      taskGroups: [
        {
          id: ROW_ID,
          parentId: null,
          name: 'One row',
          derivedFromTaskUid: null,
          order: 0,
          treeState: 'auto', color: null,
          minHeightPx: null,
        },
      ],
      taskGroupMembers: uids.map((uid) => ({ taskUid: uid, taskGroupId: ROW_ID })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
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
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
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

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  } as unknown as ScreenSurface
  return {
    wiring: { surface, language } as unknown as ScreenWiring,
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

interface StoreProbe {
  readonly store: FileStore
  readonly written: ChosenFileWrite[]
}

function fileStore(): StoreProbe {
  const written: ChosenFileWrite[] = []
  const store: FileStore = {
    readFileToOpen: () => new Promise<FileReading>(() => undefined),
    readOpenedFileState: async () => ({ kind: 'none' }),
    restoreOpenedFilePermission: async () => ({ kind: 'none' }),
    overwriteOpenedFile: async () => ({
      ok: false,
      fault: { reason: 'noOpenedFile', what: 'this document has never been in a file' },
    }),
    writeChosenFile: async (write: ChosenFileWrite) => {
      written.push(write)
      return { ok: true, openedFile: { kind: 'writable', fileName: write.suggestedFileName } }
    },
  } as unknown as FileStore
  return { store, written }
}

interface ClipboardProbe {
  readonly clipboard: Clipboard
  readonly received: ClipboardContent[]
}

function clipboardProbe(): ClipboardProbe {
  const received: ClipboardContent[] = []
  return {
    received,
    clipboard: {
      writeClipboardContent: (content: ClipboardContent): Promise<ClipboardWriting> => {
        received.push(content)
        return Promise.resolve({ ok: true })
      },
    },
  }
}

interface RasterProbe {
  readonly rasterizer: {
    rasterizePng(
      svg: string,
      sizePx: { readonly widthPx: number; readonly heightPx: number },
    ): Promise<{ readonly ok: true; readonly pngBytes: Uint8Array }>
  }
  readonly asked: string[]
}

// Spec: FR-025
function rasterProbe(): RasterProbe {
  const asked: string[] = []
  return {
    asked,
    rasterizer: {
      rasterizePng: (svg: string) => {
        asked.push(svg)
        return Promise.resolve({ ok: true as const, pngBytes: new Uint8Array([137, 80, 78, 71]) })
      },
    },
  }
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

const partAt = (part: string, entry: string | null, format: string | null): ScreenPart =>
  ({
    part,
    entry,
    format,
    taskGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  }) as unknown as ScreenPart

interface Stage {
  readonly loop: FrameLoop
  readonly written: ChosenFileWrite[]
  readonly clipped: ClipboardContent[]
  press(input: HumanInput): Promise<void>
  take(entry: string): Promise<void>
  takeFormat(format: string): Promise<void>
  notices(): readonly Notice[]
  clearNotices(): Promise<void>
}

function stage(document: Document, language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const files = fileStore()
  const board = clipboardProbe()
  const paint = rasterProbe()
  const loop = frameLoop(
    pen.surface,
    document,
    SCREEN,
    screen.wiring,
    files.store,
    undefined,
    board.clipboard,
    undefined,
    paint.rasterizer,
  )
  pen.runAnimationFrames()
  const press = async (input: HumanInput): Promise<void> => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
    await settle()
    pen.runAnimationFrames()
  }
  const pressAt = async (part: ScreenPart): Promise<void> => {
    // Why: the part is drawn before the press and cleared after, since CS-2 settles a gesture
    // on what was drawn at the press.
    screen.drawAt(part)
    loop.receiveInput(pointer('down', 500, 300))
    loop.receiveInput(pointer('up', 500, 300))
    screen.drawAt(null)
    pen.runAnimationFrames()
    await settle()
    pen.runAnimationFrames()
  }
  const notices = (): readonly Notice[] => screen.last().notices
  return {
    loop,
    written: files.written,
    clipped: board.received,
    press,
    take: (entry) => pressAt(partAt(surfaceOf(entry), entry, null)),
    takeFormat: (format) => pressAt(partAt(EXPORT_CHOOSER, null, format)),
    notices,
    clearNotices: async () => {
      for (let turn = 0; turn < 8 && notices().length > 0; turn += 1) await press(SK_19)
    },
  }
}

const isTheValve = (notice: Notice, language: DisplayLanguage): boolean =>
  notice.text === wordsFor(RS_24).text[language]

describe('表 T-014 の ST-7 -- the manuscript this file is driven by', () => {
  it('still asks for a VALUE and a TELLING, and still forbids the exception', () => {
    expect(REQUIREMENTS).toContain(ST_7_STOP_AND_TELL_ON_A_VALUE)
    expect(REQUIREMENTS).toContain(ST_7_NO_EXCEPTION)
  })

  it('⭐⭐ still forbids the telling being the screen road’s alone, and asks for it after an export', () => {
    expect(REQUIREMENTS).toContain(ST_7_NOT_ONLY_THE_SCREEN_ROAD)
    expect(REQUIREMENTS).toContain(ST_7_TELL_AFTER_THE_EXPORT)
  })

  it('still makes S-89 the HIGHEST ALLOWED count, so the boundary below is the row’s', () => {
    expect(REQUIREMENTS).toContain(ST_7_CAP_IS_THE_HIGHEST_ALLOWED)
  })

  it('表 T-233 still holds RS-24 with NT-3a and ST-7 for its 正, and the dictionary holds its words', () => {
    expect(rowOf(T_233, RS_24).cells.join(' ')).toContain('安全弁')
    expect(MANNER_OF_RS_24).toBe('NT-3a')
    expect(rowOf(T_233, RS_24).by['正'] ?? '').toContain('ST-7')
    expect(T_037.rows.map((one) => one.id)).toContain(MANNER_OF_RS_24)
    expect(wordsFor(RS_24).text.ja.length).toBeGreaterThan(0)
    expect(wordsFor(RS_24).text.en.length).toBeGreaterThan(0)
  })

  it('⭐ RS-24 says something no other row of 表 T-233 says', () => {
    // Why: without this, the RS-24 check would pass on a loop carrying any row, as the words
    // would collide.
    const mine = wordsFor(RS_24).text.ja
    const others = T_233.rows
      .filter((one) => one.id !== RS_24)
      .map((one) => REASON_WORDS.find((word) => word.specTableRowId === one.id)?.text.ja)
      .filter((one): one is string => one !== undefined)
    expect(others).not.toContain(mine)
    expect(wordsFor(RS_24).text.en).not.toBe(mine)
  })

  it('FR-025 still sends the picture to the clipboard through IC-3, with no chooser', () => {
    expect(REQUIREMENTS).toContain(FR_025_IC_3_SENDS_AT_ONCE)
    expect(surfaceOf('IC-3').length).toBeGreaterThan(0)
    expect(rowOf(T_109, 'IC-3').by['正'] ?? '').toContain('IO-6')
  })

  it('SK-19 still takes one standing telling down, which is how a road is started clean', () => {
    expect(REQUIREMENTS).toContain(SK_19_DISMISSES_ONE)
  })

  it('nothing is told about a document that does not reach the valve', () => {
    // Why: the control every case leans on: a telling standing on any document would make
    // them all pass for nothing.
    expect(stage(documentOfOverlaps(1)).notices()).toEqual([])
  })
})

// Spec: ST-7, RS-24, NT-3a, S-89
// Why: how often the screen road tells is not asserted: RS-24 names NT-3a alone, and the
// rule on piling a reason up is NT-3's, for destructive results.
describe('ST-7 (MUST) -- a task group that reaches the valve is TOLD, not merely stopped', () => {
  it('⭐⭐ a document past the cap puts a telling carrying RS-24 on the screen', async () => {
    const built = stage(documentOfOverlaps(CAP + 1))

    const told = built.notices()
    expect(
      told.length,
      'a task group went past the safety valve and the screen said nothing -- ST-7 (MUST) asks for the ' +
        'person to be told, and 表 T-233 の RS-24 is the reason it names',
    ).toBeGreaterThan(0)
    expect(told.some((one) => isTheValve(one, 'ja'))).toBe(true)
  })

  it('and it follows NT-3a: the manner is the row’s, and a next step travels with it', () => {
    const told = stage(documentOfOverlaps(CAP + 1))
      .notices()
      .find((one) => isTheValve(one, 'ja'))

    expect(told, 'no telling carried RS-24, so its manner cannot be read').toBeDefined()
    expect(told?.manner).toBe(MANNER_OF_RS_24)
    expect(
      told?.nextSteps ?? [],
      'NT-3a (MUST NOT): a failure told with no next step',
    ).toContain(wordsFor(RS_24).nextStep.ja)
  })

  it('⭐ the boundary: exactly at S-89 nothing is told, and one stack past it something is', () => {
    expect(
      stage(documentOfOverlaps(CAP)).notices(),
      'the screen told the person about a task group that stacked exactly to the cap, which ST-7 allows',
    ).toEqual([])
    expect(stage(documentOfOverlaps(CAP + 1)).notices().length).toBeGreaterThan(0)
  })

  it('⭐ the words follow the display language, so a ROW traveled and not a sentence', () => {
    // Why: a loop writing the Japanese sentence where it raises would pass the cases above;
    // the English words show the row travelled, not a sentence.
    const told = stage(documentOfOverlaps(CAP + 1), 'en').notices()
    expect(told.some((one) => isTheValve(one, 'en'))).toBe(true)
  })
})

// Spec: ST-7, FR-080, FR-025, IO-6, IO-3, SK-19, SK-16
// Why: every case takes the screen road's tellings down with SK-19 first, so a silent
// export road cannot pass on a telling left standing.
// Why: only the picture roads are pressed: ST-7 names the FR-080 road and says nothing of
// IO-1, IO-2 or IO-7; the picture's own content is FR-025's and WY-2's.
describe('ST-7 (MUST NOT) -- the telling is not the screen road’s alone', () => {
  it('the premise: SK-19 does take the screen road’s telling down', async () => {
    // Why: without this, every case below would pass on a screen that cannot be quietened.
    const built = stage(documentOfOverlaps(CAP + 1))
    expect(built.notices().length).toBeGreaterThan(0)

    await built.clearNotices()

    expect(
      built.notices(),
      'SK-19 (MUST): 「出ている通知があるときは、それを 1 つ消すこと」 -- the tellings would not go down',
    ).toEqual([])
  })

  it('⭐⭐ the premise that makes the two roads two: a dismissed telling does not come back on its own', async () => {
    // Why: a drawing road raising the valve every frame would put RS-24 back during an export;
    // SK-16 makes frames and exports nothing, so it measures the drawing road alone.
    const built = stage(documentOfOverlaps(CAP + 1))
    await built.clearNotices()

    await built.press(keyOf('SK-16'))

    expect(
      built.notices().some((one) => isTheValve(one, 'ja')),
      'the drawing road puts RS-24 back up on every frame, so the export cases below cannot tell ' +
        'the two roads apart -- report them rather than believe them',
    ).toBe(false)
  })

  it('⭐⭐ IO-6: after the picture goes to the clipboard, the valve is told again', async () => {
    const built = stage(documentOfOverlaps(CAP + 1))
    await built.clearNotices()

    await built.take('IC-3')

    expect(
      built.clipped.length,
      'IC-3 sent nothing to the clipboard, so no export finished and this case measured nothing',
    ).toBeGreaterThan(0)
    expect(
      built.notices().some((one) => isTheValve(one, 'ja')),
      'the picture left by IO-6 with a task group past the safety valve and the person was told nothing ' +
        'afterwards -- ST-7 (MUST NOT) forbids the telling being the drawing road’s alone',
    ).toBe(true)
  })

  it('⭐ IO-6 control: a document under the cap sends the picture and tells nobody', async () => {
    // Why: keeps the case above from passing on an export that tells every time.
    const built = stage(documentOfOverlaps(CAP))
    await built.clearNotices()

    await built.take('IC-3')

    expect(built.clipped.length).toBeGreaterThan(0)
    expect(
      built.notices().some((one) => isTheValve(one, 'ja')),
      'IO-6 told the person the valve was reached on a document that stacked exactly to the cap',
    ).toBe(false)
  })

  it('⭐ IO-6: the words are the dictionary’s in English too', async () => {
    const built = stage(documentOfOverlaps(CAP + 1), 'en')
    await built.clearNotices()

    await built.take('IC-3')

    expect(built.notices().some((one) => isTheValve(one, 'en'))).toBe(true)
  })

  it('⭐⭐ IO-3: after the picture is written to a file, the valve is told again', async () => {
    const built = stage(documentOfOverlaps(CAP + 1))
    await built.press(SK_12)
    await built.clearNotices()

    await built.takeFormat('IO-3')

    expect(
      built.written.length,
      'choosing IO-3 wrote no file, so no export finished and this case measured nothing',
    ).toBeGreaterThan(0)
    expect(
      built.notices().some((one) => isTheValve(one, 'ja')),
      'a picture was written to a file with a task group past the safety valve and the person was told ' +
        'nothing afterwards -- ST-7 (MUST)',
    ).toBe(true)
  })

  it('⭐ IO-3 control: a document under the cap writes the picture and tells nobody', async () => {
    const built = stage(documentOfOverlaps(CAP))
    await built.press(SK_12)
    await built.clearNotices()

    await built.takeFormat('IO-3')

    expect(built.written.length).toBeGreaterThan(0)
    expect(
      built.notices().some((one) => isTheValve(one, 'ja')),
      'IO-3 told the person the valve was reached on a document that stacked exactly to the cap',
    ).toBe(false)
  })
})
