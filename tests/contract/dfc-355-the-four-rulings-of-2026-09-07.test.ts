// Contract tests: the MUST clauses four rulings wrote into the spec, quoted and pressed.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'
import { generatedConstantOf } from '../fixtures/setting-number'

import {
  exportSvg,
  type ExportScene,
  type SvgExport,
} from '../../src/adapter/image-exporter/image-exporter'
import { brandingPlaceOf } from '../../src/adapter/screen-renderer/app-header-items'
import { openModalFromSession } from '../../src/adapter/screen-renderer/open-modals'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import type {
  AppHeaderItems,
  DisplayLanguage,
  OpenModal,
  TaskGroupPanel,
  ScreenFrame,
  ScreenViewReadings,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  fileSystemAccessFileStore,
  type FileHandle,
  type FileSystemAccessEnvironment,
  type ReadableFile,
  type WritableFileStream,
} from '../../src/framework/file-system-access-file-store/file-system-access-file-store'
import { bare, specTable, unbroken } from './spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the store watch patches untyped browser globals */

// Why: check 39 counts a clause held only when its text stands verbatim in a file under tests/,
// so the clauses are quoted here and each is asserted against the manuscript.

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const NOTICE_ROSTER = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-notice-reasons.md'),
  'utf8',
))

const FR_012_RECOUNT_ON_CALENDAR_EDIT =
  '稼働日の暦が変わったとき、`GRS` は、格納済みの完了率を数え直すこと。'

// Why: this is the clause as rewritten for FR-054 (instants, working time in minutes).
const FR_012_TELL_WITH_A_COUNT =
  '`GRS` が暦の編集で完了率を数え直したとき、`GRS` は、数え直したことを、値が変わった `Task` の件数を添えて告げること（作法は 表 T-037 の `NT-3`、理由は 表 T-233 の `RS-52`）。'

const FR_012_SAME_WRITE =
  '稼働日の暦が変わったとき、`GRS` は、完了率の数え直しを暦の変更と同じ書き込みの中で行うこと。'

const FR_012_NOT_A_SECOND_WRITE =
  '`GRS` は、完了率の数え直しを、暦の変更と別の書き込みに分けないこと。'

const RS_52_NEVER_SILENTLY =
  '`GRS JSON` を読んだとき（`FR-012`）である。⭐ **件数を添えること** —— **値が変わった `Task` の数である。**⛔ **黙って数え直してはならない（MUST NOT）'

const GR_21_LENGTH_IS_THE_VISIBLE_FRACTION =
  '`GRS` は、`Scroll Thumb` の長さを、帯の長さに対する「見えている範囲 ÷ 全体」の割合にすること。'

const GR_21_FLOOR_IS_S_205 =
  '`GRS` は、`Scroll Thumb` の長さの下限を `S-205` にすること。'

const FR_051_SCROLLBAR_MOVES_THE_VIEW =
  '`GRS` は、スクロールバーの操作でも表示位置を変えられるようにすること。'

const FR_020_THE_PLACE_IS_QN_9 =
  '**透かしがアクセス制御ではなく証跡であることを画面上でも示すこと（MUST）** —— 見えているものを守っていると誤解させない。⭐ **示す場所は 表 T-234 の `QN-9` の文とすること（MUST）'

const FR_020_NO_SECOND_DISPLAY_WORD =
  '文とすること（MUST）**—— 誤解が起きるのは「消せない」に会ったときであり、その場で読む文がすでに 1 つ決まっている。⛔ **このために新しい表示語を立ててはならない（MUST NOT）'

const EP_1_BAND_KEEPS_THE_SCREEN_HEIGHT =
  '`（`U-35`）／ `Opened File Name`（`U-58`）・`File Saved At`（`U-59`） | 帯と `Project Title` を描く。ほかは描かない | 帯の高さを画面のまま保つこと（MUST）'

const EP_1_NOT_COMPRESSED =
  'File Name`（`U-58`）・`File Saved At`（`U-59`） | 帯と `Project Title` を描く。ほかは描かない | 帯の高さを画面のまま保つこと（MUST）。詰めてはならない（MUST NOT）'

const EP_1_TITLE_DOES_NOT_MOVE =
  '描く。ほかは描かない | 帯の高さを画面のまま保つこと（MUST）。詰めてはならない（MUST NOT） —— 詰めると帯より下の全部が上へずれる。`Project Title` の位置を動かしてはならない（MUST NOT）'

const EP_1_ONE_ROW_FOR_SIZE_AND_INSET =
  'UST NOT） —— 詰めると帯より下の全部が上へずれる。`Project Title` の位置を動かしてはならない（MUST NOT）⭐ **字の大きさと左の余白は、画面と書き出しが同じ 1 つの行を読むこと（MUST）'

const EP_1_NO_EXPORT_ONLY_CONSTANT =
  'T）**—— `_assets/tbl-settings.md` の 表 T-206 の `S-225`（字の大きさ）と `S-226`（左の余白）である。⚠️ 画面も書き出しも、どちらにも同書の 表 T-206 の `S-235` を掛けて描く（`FR-051`）。⛔ **書き出し専用の定数を持ってはならない（MUST NOT）'

const EP_1_DOES_NOT_MEASURE_THE_DOM =
  '（左の余白）である。⚠️ 画面も書き出しも、どちらにも同書の 表 T-206 の `S-235` を掛けて描く（`FR-051`）。⛔ **書き出し専用の定数を持ってはならない（MUST NOT）** —— **別の値を持てば、本行の MUST NOT を守っているかを問えない。**⛔ **DOM を直接測って揃えてはならない（MUST NOT）'

// Why: held at 28 characters, the check-39 floor: every longer window reaches back over a
// paragraph break, which one single-quoted literal cannot hold.
const FR_060_DOES_NOT_REMEMBER_THE_FILE = '`GRS` は、前回開いていたファイルを覚えないこと。'

// Spec: IMPS-970
const FR_060_NO_STARTUP_RESTORE_OFFER =
  '`GRS` は、起動時に権限の復帰を申し出ないこと。'

const FR_060_THE_PERSON_CHOOSES_AGAIN =
  '起動した直後の最初の保存のとき、`GRS` は、人にファイルを選び直させること'

const FR_060_NO_HANDLE_IN_BROWSER_STORAGE =
  '`GRS` は、ファイルの取っ手を `localStorage` や `IndexedDB` へ保存しないこと。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-012 (MUST) -- a calendar edit re-counts the stored percent complete', FR_012_RECOUNT_ON_CALENDAR_EDIT],
  ['FR-012 (MUST) -- the telling carries the count of Tasks whose value moved', FR_012_TELL_WITH_A_COUNT],
  ['FR-012 (MUST) -- inside the same write as the calendar change', FR_012_SAME_WRITE],
  ['FR-012 (MUST NOT) -- never split into a second write', FR_012_NOT_A_SECOND_WRITE],
  ['T-233 RS-52 (MUST NOT) -- never re-count silently', RS_52_NEVER_SILENTLY],
  ['T-023d GR-21 (MUST) -- the length is the visible fraction', GR_21_LENGTH_IS_THE_VISIBLE_FRACTION],
  ['T-023d GR-21 (MUST) -- the floor of that length is S-205', GR_21_FLOOR_IS_S_205],
  ['FR-051 (MUST) -- working the bar changes the display position', FR_051_SCROLLBAR_MOVES_THE_VIEW],
  ['FR-020 (MUST) -- the place it is shown is QN-9 of table T-234', FR_020_THE_PLACE_IS_QN_9],
  ['FR-020 (MUST NOT) -- no new display word for it', FR_020_NO_SECOND_DISPLAY_WORD],
  ['T-076 EP-1 (MUST) -- the band keeps the height it has on screen', EP_1_BAND_KEEPS_THE_SCREEN_HEIGHT],
  ['T-076 EP-1 (MUST NOT) -- the band is not compressed', EP_1_NOT_COMPRESSED],
  ['T-076 EP-1 (MUST NOT) -- the Project Title does not move', EP_1_TITLE_DOES_NOT_MOVE],
  ['T-076 EP-1 (MUST) -- screen and export read one row for size and inset', EP_1_ONE_ROW_FOR_SIZE_AND_INSET],
  ['T-076 EP-1 (MUST NOT) -- no export-only constant', EP_1_NO_EXPORT_ONLY_CONSTANT],
  ['T-076 EP-1 (MUST NOT) -- the DOM is not measured to line the two up', EP_1_DOES_NOT_MEASURE_THE_DOM],
  ['FR-060 (MUST NOT) -- the file opened last run is not remembered', FR_060_DOES_NOT_REMEMBER_THE_FILE],
  ['FR-060 (MUST NOT) -- no start-up offer to restore the permission', FR_060_NO_STARTUP_RESTORE_OFFER],
  ['FR-060 (MUST) -- the person chooses the file again, each run', FR_060_THE_PERSON_CHOOSES_AGAIN],
  ['FR-060 (MUST NOT) -- no handle in localStorage or IndexedDB', FR_060_NO_HANDLE_IN_BROWSER_STORAGE],
]

describe('DFC-355 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    // Why: the only thing that keeps the copies honest: a reworded clause takes this case red.
    expect(`${REQUIREMENTS}\n${NOTICE_ROSTER}`).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    // Why: check 39 counts markers, not rules, so two constants on the same window would pay back
    // one clause instead of two.
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

// Summary: the stand-in handle holds one named file and nothing behind it but its bytes.
function standInHandle(name: string): FileHandle {
  const file: ReadableFile = {
    name,
    size: 2,
    arrayBuffer: async () => new Uint8Array([0x7b, 0x7d]).buffer,
  }
  const stream: WritableFileStream = {
    write: async () => undefined,
    close: async () => undefined,
    abort: async () => undefined,
  }
  return {
    kind: 'file',
    name,
    getFile: async () => file,
    createWritable: async () => stream,
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
  }
}

// Why: dropSurface listens and is never fired; OP-2 of table T-024a gives the drop its own
// route and no case here takes it.
function standInBrowser(handle: FileHandle): FileSystemAccessEnvironment {
  return {
    openFilePicker: async () => [handle],
    saveFilePicker: async () => handle,
    dropSurface: { addEventListener: () => undefined },
  }
}

interface StorageWatch {
  readonly touches: string[]
  restore(): void
}

// Why: a recorder, not a stub that answers nothing: FR-060 forbids a handle there at all, so
// any traffic to either store is the clause broken or being prepared for.
function watchBrowserStores(): StorageWatch {
  const touches: string[] = []
  const scope = globalThis as any
  const hadLocal = 'localStorage' in scope
  const hadIndexed = 'indexedDB' in scope
  const previousLocal = scope.localStorage
  const previousIndexed = scope.indexedDB

  const note =
    (where: string) =>
    (...args: unknown[]): null => {
      touches.push(`${where}(${String(args[0] ?? '')})`)
      return null
    }

  Object.defineProperty(scope, 'localStorage', {
    configurable: true,
    value: {
      getItem: note('localStorage.getItem'),
      setItem: note('localStorage.setItem'),
      removeItem: note('localStorage.removeItem'),
      clear: note('localStorage.clear'),
      key: note('localStorage.key'),
      length: 0,
    },
  })
  Object.defineProperty(scope, 'indexedDB', {
    configurable: true,
    value: { open: note('indexedDB.open'), deleteDatabase: note('indexedDB.deleteDatabase') },
  })

  return {
    touches,
    restore(): void {
      if (hadLocal) {
        Object.defineProperty(scope, 'localStorage', { configurable: true, value: previousLocal })
      } else {
        delete scope.localStorage
      }
      if (hadIndexed) {
        Object.defineProperty(scope, 'indexedDB', { configurable: true, value: previousIndexed })
      } else {
        delete scope.indexedDB
      }
    },
  }
}

describe('FR-060 -- the overwrite target is this run’s, and nobody else’s', () => {
  it('⛔ a second run does not remember the file the first one opened', async () => {
    // Spec: FR-060
    // Why: a run is a construction: the shell builds the store once per page load, so a second
    // call to the factory is the next run.
    const handle = standInHandle('plan.json')
    const environment = standInBrowser(handle)

    const firstRun = fileSystemAccessFileStore(environment)
    const opened = await firstRun.readFileToOpen('chooser')
    expect(opened.ok, 'the fixture hands over one readable file').toBe(true)
    firstRun.adoptFileReadToOpen()
    expect(
      (await firstRun.readOpenedFileState()).kind,
      'within the same run the opened file IS the overwrite target',
    ).toBe('writable')

    const secondRun = fileSystemAccessFileStore(environment)

    expect(
      (await secondRun.readOpenedFileState()).kind,
      'FR-060 (MUST NOT): a fresh run answered with an overwrite target it could ' +
        'only have carried over from the run before',
    ).toBe('none')
  })

  it('⛔ opening and overwriting put nothing into localStorage or IndexedDB', async () => {
    // Spec: FR-060
    const watch = watchBrowserStores()
    try {
      const store = fileSystemAccessFileStore(standInBrowser(standInHandle('plan.json')))
      await store.readFileToOpen('chooser')
      store.adoptFileReadToOpen()
      await store.readOpenedFileState()
      await store.overwriteOpenedFile(new Uint8Array([0x7b, 0x7d]))

      expect(
        watch.touches,
        'FR-060 (MUST NOT): the file store reached for a browser store, which is ' +
          'where a handle would have to be kept',
      ).toEqual([])
    } finally {
      watch.restore()
    }
  })

  it('⛔ nothing is offered back at start-up, because nothing was kept', async () => {
    // Spec: FR-060
    // Why: on a fresh run there is no file to offer, so an offer could only be about a file the
    // run invented.
    const store = fileSystemAccessFileStore(standInBrowser(standInHandle('plan.json')))

    expect((await store.readOpenedFileState()).kind).toBe('none')
    expect(
      (await store.restoreOpenedFilePermission()).kind,
      'FR-060 (MUST NOT): a fresh run produced a file whose permission could be ' +
        'offered back, which is the start-up offer the ruling of 2026-09-07 removed',
    ).toBe('none')
  })
})

const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const existing = built[head]
    const group = (typeof existing === 'object' && existing !== null ? existing : {}) as Record<
      string,
      unknown
    >
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

const SETTINGS = nestedFrom(SETTINGS_DEFAULTS) as unknown as DocumentSettings

// Spec: S-225, S-226
function settingsRowValue(specTableRowId: string): number {
  const row = specTable('T-206').rows.find((one) => one.id === specTableRowId)
  if (row === undefined) throw new Error(`table T-206 no longer has row ${specTableRowId}`)
  // Why: read by heading, never by position: the table's own convention lets a column move.
  const stated = bare(row.by['既定'] ?? '')
  const digits = /-?\d+(?:\.\d+)?/.exec(stated)
  if (digits === null) throw new Error(`table T-206 row ${specTableRowId} states no number: ${stated}`)
  return Number(digits[0])
}

const S_225_TITLE_FONT_PX = settingsRowValue('S-225')
const S_226_TITLE_INSET_PX = settingsRowValue('S-226')
const S_462_SEAT_OVER_GLYPH = settingsRowValue('S-462')
const S_490_BRANDING_FONT_PX = settingsRowValue('S-490')
const S_492_DIVIDER_WIDTH_PX = settingsRowValue('S-492')
const DIVIDER_SIDES = 2
const S_235_TWO_THIRDS = settingsRowValue('S-235')

const TITLE = 'DFC-355 fixture title'

// Spec: S-81
// Why: a screen exactly as wide as exportCanvas makes the export's ratio 1, so the numbers
// drawn are the two rows' numbers.
function regionsOf(appHeaderHeight: number): ScreenRegions {
  const width = SETTINGS_CONSTANTS.exportCanvas.width
  // Why: FR-080 draws the export with the properties panel closed, and the panel width is not
  // a document value.
  const panelWidth = 0
  const height = 800
  const header: ScreenRect = { x: 0, y: 0, width, height: appHeaderHeight }
  const canvas: ScreenRect = { x: 0, y: appHeaderHeight, width, height: height - appHeaderHeight }
  return {
    appHeader: header,
    scheduleCanvas: canvas,
    taskGroupPanel: {
      x: canvas.x,
      y: canvas.y,
      width: SETTINGS.taskGroupPanelWidthPx,
      height: canvas.height,
    },
    timeRuler: {
      x: canvas.x + SETTINGS.taskGroupPanelWidthPx,
      y: canvas.y,
      width: canvas.width - SETTINGS.taskGroupPanelWidthPx,
      height: SETTINGS.rulerHeightPx,
    },
    propertiesPanel: {
      x: canvas.x + canvas.width - panelWidth,
      y: canvas.y,
      width: panelWidth,
      height: canvas.height,
    },
    taskGroupArea: {
      x: canvas.x + SETTINGS.taskGroupPanelWidthPx,
      y: canvas.y + SETTINGS.rulerHeightPx,
      width: canvas.width - SETTINGS.taskGroupPanelWidthPx - panelWidth,
      height: canvas.height - SETTINGS.rulerHeightPx,
    },
  } as ScreenRegions
}

const VIEW_WITH_TITLE: ScreenView = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] } as ScreenFrame,
  appHeaderItems: {
    // Spec: BR-2, EP-1
    ...brandingPlaceOf(),
    documentTitle: TITLE,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  } as AppHeaderItems,
  taskGroupPanel: { pinnedTitles: [], titles: [] } as TaskGroupPanel,
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  tooltips: [],
}

const sceneWithBand = (appHeaderHeight: number): ExportScene => ({
  svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  regions: regionsOf(appHeaderHeight),
  screenView: VIEW_WITH_TITLE,
  settings: SETTINGS,
  themePreference: 'light',
  themeHue: 214,
})

function pictureOrThrow(answer: SvgExport): string {
  if (!answer.ok) throw new Error('the fixture is far under S-217, so a refusal is the fixture')
  return answer.svg
}

function titleText(svg: string): { fontSize: number; x: number } {
  const escaped = TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const found = new RegExp(
    `<text x="(-?[\\d.]+)" y="-?[\\d.]+" font-size="(-?[\\d.]+)"[^>]*>${escaped}</text>`,
  ).exec(svg)
  if (found === null) throw new Error('the export drew no Project Title for this scene')
  return { x: Number(found[1]), fontSize: Number(found[2]) }
}

describe('T-076 EP-1 -- the exported Project Title reads S-225 and S-226', () => {
  it('⭐ the size drawn is S-225 and the inset drawn is S-226, at ratio 1', () => {
    // Spec: EP-1, S-225, S-226
    const drawn = titleText(pictureOrThrow(exportSvg(sceneWithBand(56))))

    expect(
      drawn.fontSize,
      'EP-1 (MUST): the size is S-225 of table T-206, which CR-395 now draws at S-235 two thirds on screen AND in the export -- the picture writes every length to two decimals',
    ).toBeCloseTo(S_225_TITLE_FONT_PX * S_235_TWO_THIRDS, 2)
    expect(
      drawn.x,
      'EP-1 / BR-2 (MUST): the left inset is S-226, the Branding seat S-490 x S-462 and the divider gaps 2 x S-226 (BR-7 since CR-659) of table T-206 at that same S-235 two thirds, plus the divider S-492 -- the picture writes every length to two decimals',
    ).toBeCloseTo(
      (S_226_TITLE_INSET_PX + S_490_BRANDING_FONT_PX * S_462_SEAT_OVER_GLYPH + DIVIDER_SIDES * S_226_TITLE_INSET_PX) *
        S_235_TWO_THIRDS +
        S_492_DIVIDER_WIDTH_PX,
      2,
    )
  })

  it('⛔ neither number moves when the band’s height does', () => {
    // Spec: EP-1, S-226
    // Why: a title size or inset derived from the band's height, as the band fractions once were,
    // cannot survive this case.
    const short = titleText(pictureOrThrow(exportSvg(sceneWithBand(40))))
    const tall = titleText(pictureOrThrow(exportSvg(sceneWithBand(96))))

    expect(short.fontSize, 'EP-1 (MUST NOT): the size followed the band').toBe(tall.fontSize)
    expect(short.x, 'EP-1 (MUST NOT): the inset followed the band').toBe(tall.x)
  })

  it('⭐ the constants the export reads ARE table T-206’s two rows', () => {
    // Spec: EP-1
    // Why: the generated pair is asserted against the manuscript, not against itself.
    const printed = generatedConstantOf('src/adapter/image-exporter/image-exporter.ts', 'NOT_STORED_DOCUMENT_TITLE_SIZES')
    expect(printed['S-225']).toBe(S_225_TITLE_FONT_PX)
    expect(printed['S-226']).toBe(S_226_TITLE_INSET_PX)
  })

  it('⭐ the band keeps the height the screen handed over', () => {
    // Spec: EP-1
    const svg = pictureOrThrow(exportSvg(sceneWithBand(72)))

    expect(
      svg,
      'EP-1 (MUST): the band was painted at a height other than the screen’s',
    ).toContain('height="72"')
  })
})

const U_60 = (() => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-60')
  if (row === undefined) throw new Error('table T-103 no longer has row U-60')
  return bare(row.cells[0] ?? '')
})()

const U_60_ROW = 'U-60'

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

const EMPTY_SCHEDULE = {
  project: { themeHue: 214, carry: {}, carryElements: [] },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  iconUnderPointer: null,
  commandPaletteAt: { x: 0, y: 0 },
  themePreference: 'light',
  themeHue: 214,
  selectedTaskGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const rootOn = (surface: string, language: DisplayLanguage): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage: language,
    helpLanguage: language,
    openSurfaceState: { kind: 'open', surfaceName: surface },
  },
})

function unlockSurface(language: DisplayLanguage): OpenModal {
  const modal = openModalFromSession(rootOn(U_60_ROW, language), EMPTY_SCHEDULE, READINGS, SETTINGS)
  if (modal === null) throw new Error(`S-99g holds ${U_60_ROW}, so a surface is described`)
  return modal
}

function everyWordIn(language: DisplayLanguage): string[] {
  const found: string[] = []
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const one of value) walk(one)
      return
    }
    if (typeof value !== 'object' || value === null) return
    const record = value as Record<string, unknown>
    const text = record.text
    if (typeof text === 'object' && text !== null) {
      const word = (text as Record<string, unknown>)[language]
      if (typeof word === 'string') found.push(word)
    }
    for (const one of Object.values(record)) walk(one)
  }
  walk(displayWords)
  return found
}

function questionWord(row: string, language: DisplayLanguage): string {
  const entry = displayWords.questions.find((one) => one.specTableRowId === row)
  if (entry === undefined) throw new Error(`the dictionary holds no question ${row}`)
  return entry.text[language]
}

describe('FR-020 -- where "evidence, not access control" is shown', () => {
  it('⭐ the place is QN-9’s own sentence, on the surface that raises the misreading', () => {
    // Spec: FR-020, QN-9
    // Why: the misreading arises at U-60, where a person was just asked for a password, so the
    // QN-9 sentence has to reach that surface.
    for (const language of LANGUAGES) {
      const shown = unlockSurface(language) as { question?: string }
      expect(shown.question, `${U_60} shows QN-9 in ${language}`).toBe(
        questionWord('QN-9', language),
      )
    }
  })

  it('⛔ no second display word says it, in either language', () => {
    // Spec: FR-020, FR-038
    // Why: a minted second word is a second dictionary entry carrying the sentence, so the whole
    // dictionary is swept, not just the questions.
    for (const language of LANGUAGES) {
      const sentence = questionWord('QN-9', language)
      const carriers = everyWordIn(language).filter((word) => word === sentence)

      expect(
        carriers.length,
        `FR-020 (MUST NOT): ${carriers.length} display words carry QN-9's sentence ` +
          `in ${language}; the ruling of 2026-09-07 allows exactly the one`,
      ).toBe(1)
    }
  })

  it('⭐ the sentence is a real word and not the stand-in for a missing one', () => {
    // Why: without this, a dictionary that had lost the row would satisfy both cases above with
    // the same stand-in.
    for (const language of LANGUAGES) {
      const sentence = questionWord('QN-9', language)
      expect(sentence.length, `QN-9 holds a sentence in ${language}`).toBeGreaterThan(0)
    }
    expect(
      questionWord('QN-9', 'ja'),
      'FR-038 (MUST): one dictionary per language, so neither may be the other',
    ).not.toBe(questionWord('QN-9', 'en'))
  })
})
