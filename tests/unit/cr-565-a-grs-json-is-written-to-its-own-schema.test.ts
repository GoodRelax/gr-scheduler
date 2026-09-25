// CR-565: a GRS JSON is written to this build's own schema and read for what that schema knows (FR-024, OP-6, FR-073).

import { afterEach, describe, expect, it } from 'vitest'

import type { FileReading, FileStore } from '../../src/adapter/file-gateway/file-gateway'
import type {
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Notice, ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import { bare, specTable } from '../contract/spec-table'
import { DOWNLOAD_ADDRESS, DOWNLOAD_URL_SEAT, withDownloadAddress } from '../fixtures/download-address'
import { validateDocument } from '../fixtures/grs-document'
import { settingDefaultOf } from '../fixtures/setting-default'
import { DESIGN, DISPLAY_WORDS, REQUIREMENTS } from './cr-541-stage'

// see FR-024
const FR_024_FITS_THE_SCHEMA =
  '書き出す `GRS JSON` は、その造りが刊行するスキーマ（`_source/grs-document.schema.json`）に適合すること（MUST）'
const FR_024_NO_KEY_WRITTEN_BACK = '⛔ 読んだ文書が持っていた、スキーマに無い鍵を書き戻してはならない（MUST NOT）'
const FR_024_OWN_VERSION = '同じ造りのスキーマが拒む。⭐ 載せる形式の版は、この造りの版とすること（MUST）'
// see OP-6
const OP_6_DROPPED_NOT_WRITTEN_BACK = '範囲へ収める（表 T-233 の `RS-51`）。⛔ 捨てた鍵を書き戻してはならない（MUST NOT）'
// see FR-073
const FR_073_NOT_REFUSED_FOR_BEING_NEWER = '⛔ 版が新しいことを理由に拒んではならない（MUST NOT）'
const FR_073_NOT_OPENED_SILENTLY = '日程データの群が合わない場合だけである。黙って開いてもならない（MUST NOT）'
const FR_073_DROPPED_ON_GOING_ON = '⛔ 続けたときは、読めなかった列を捨てて開くこと（MUST）'
const FR_073_NOT_CARRIED = '開くこと（MUST）。持ち回って書き戻してはならない（MUST NOT）'
const FR_073_NOT_DROPPED_UNLISTED = '続ける前に並べて見せた一覧が告げている** —— 並べずに捨ててはならない（MUST NOT）'
const FR_073_RS_63 = '⭐ 読めなかった列が 1 つも無いときは、問わずに開き、表 T-233 の `RS-63` を告げること（MUST）'
const FR_073_SCHEDULE_REFUSED_WHOLE =
  '⛔ 日程データの群がこの造りのスキーマに合わない文書は、版によらず文書ごと拒むこと（MUST）'
const FR_073_LEAD_TO_THE_LATEST =
  'どの理由（`RS-48` ・ `RS-63` ・ `RS-64`）を告げるときも、最新版を入手する所を案内すること（MUST）'
const FR_073_NOT_COPIED_INTO_WORDS = '`S-350` が持つ。⛔ 所を語に書き写してはならない（MUST NOT）'
const FR_073_A_LINK = '1 か所にするためである。⭐ 差し込んだ所は、押せるリンクとして示すこと（MUST）'
const FR_073_NO_REFERENCE = '⛔ 開いた頁へ、この頁への参照と参照元を渡してはならない（MUST NOT）'
// see T-220
const SCHEMA_STAYS_STRICT =
  '`documentSettings` の群にも、欠けている鍵と知らない鍵を拒む条件と、鍵ごとの型・列挙・下限・上限を持たせたままとすること（MUST）'
const READER_DOES_NOT_REFUSE_SETTINGS =
  '⛔ 読む路では、`documentSettings` の群の鍵を理由に文書を拒んではならない（MUST NOT）'
const READER_LOOKS_AT_TYPE_AND_ENUM =
  '⭐ 読む路が同群の値について見るのは、鍵ごとの型と、原稿が値を綴った列挙だけとする（MUST）'
const NO_LENIENCY_FOR_SCHEDULE = '⛔ 日程データの群にこの寛さを当ててはならない（MUST NOT）'

const REQUIREMENT_CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-024 (MUST) the written document fits the published schema', FR_024_FITS_THE_SCHEMA],
  ['FR-024 (MUST NOT) no key outside the schema is written back', FR_024_NO_KEY_WRITTEN_BACK],
  ['FR-024 (MUST) the written version is this build s own', FR_024_OWN_VERSION],
  ['OP-6 (MUST NOT) a dropped key is not written back', OP_6_DROPPED_NOT_WRITTEN_BACK],
  ['FR-073 (MUST NOT) not refused for being newer', FR_073_NOT_REFUSED_FOR_BEING_NEWER],
  ['FR-073 (MUST NOT) not opened silently', FR_073_NOT_OPENED_SILENTLY],
  ['FR-073 (MUST) the unread columns are dropped on going on', FR_073_DROPPED_ON_GOING_ON],
  ['FR-073 (MUST NOT) they are not carried and written back', FR_073_NOT_CARRIED],
  ['FR-073 (MUST NOT) nothing is dropped unlisted', FR_073_NOT_DROPPED_UNLISTED],
  ['FR-073 (MUST) nothing unread opens unasked and tells RS-63', FR_073_RS_63],
  ['FR-073 (MUST) schedule data of the wrong shape refuses the whole document', FR_073_SCHEDULE_REFUSED_WHOLE],
  ['FR-073 (MUST) every one of the three reasons leads to the latest version', FR_073_LEAD_TO_THE_LATEST],
  ['FR-073 (MUST NOT) the place is not copied into the words', FR_073_NOT_COPIED_INTO_WORDS],
  ['FR-073 (MUST) the place is shown as a link', FR_073_A_LINK],
  ['FR-073 (MUST NOT) the opened page gets no reference', FR_073_NO_REFERENCE],
]

const DESIGN_CLAUSES: readonly (readonly [string, string])[] = [
  ['Chapter 6.1 (MUST) the published schema stays strict', SCHEMA_STAYS_STRICT],
  ['Chapter 6.1 (MUST NOT) the reader refuses no document for a settings key', READER_DOES_NOT_REFUSE_SETTINGS],
  ['Chapter 6.1 (MUST) the reader looks at type and enum only', READER_LOOKS_AT_TYPE_AND_ENUM],
  ['Chapter 6.1 (MUST NOT) no leniency for the schedule data', NO_LENIENCY_FOR_SCHEDULE],
]

type Group = Record<string, unknown>

// WHY: this build states its own version through the bundled template (AM-2);
// no table of the manuscript holds the value.
const THIS_BUILD: string = (startupTemplate as { schemaVersion: string }).schemaVersion
const NEWER = `9${THIS_BUILD.slice(1)}`
const OLDER = '2000-01-01'
const UNKNOWN_KEY = 'keyFromALaterVersion'
const UNKNOWN_COLUMN = 'aColumnNoBuildOfThisToolCanRead'
const NESTED_KEY = 'exportCanvas'

const templateCopy = (): Group => structuredClone(startupTemplate) as unknown as Group
const settingsOf = (root: Group): Group => root['documentSettings'] as Group
const firstTaskOf = (root: Group): Group => {
  const tasks = (root['schedule'] as { tasks: Group[] }).tasks
  const first = tasks[0]
  if (first === undefined) throw new Error('the startup template holds no task')
  return first
}

const handed = (version: string, change: (root: Group) => void = () => undefined): string => {
  const root = templateCopy()
  root['schemaVersion'] = version
  change(root)
  return JSON.stringify(root)
}

const opened = (text: string): Extract<ReturnType<typeof documentFromJson>, { ok: true }> => {
  const read = documentFromJson(text, THIS_BUILD)
  if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults).slice(0, 300)}`)
  return read
}

const writtenOf = (document: Document): Group => JSON.parse(jsonFromDocument(document)) as Group

describe('CR-565 -- the manuscript these cases are driven by', () => {
  it.each(REQUIREMENT_CLAUSES)('01-04 still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each(DESIGN_CLAUSES)('05-07 still says it, word for word: %s', (_name, clause) => {
    expect(DESIGN).toContain(clause)
  })

  it('premise: the fixture versions order around this build s version', () => {
    expect(NEWER > THIS_BUILD).toBe(true)
    expect(OLDER < THIS_BUILD).toBe(true)
  })
})

describe('FR-024 (MUST) -- what is written fits this build s own schema, at this build s version', () => {
  it.each([
    ['a newer document', NEWER],
    ['an older document', OLDER],
  ])('%s, once written, carries this build s schemaVersion', (_name, version) => {
    const written = writtenOf(opened(handed(version)).document)
    expect(written['schemaVersion'], FR_024_OWN_VERSION).toBe(THIS_BUILD)
    expect(validateDocument(written).errors, FR_024_FITS_THE_SCHEMA).toEqual([])
  })

  it('a document read with unknown, retired and wrong-typed settings and an unread column writes strictly valid', () => {
    const text = handed(NEWER, (root) => {
      const settings = settingsOf(root)
      settings[UNKNOWN_KEY] = 7
      settings['exportPngScale'] = 2
      settings[NESTED_KEY] = { ...(settings[NESTED_KEY] as Group), laterWidth: 3 }
      settings['displayScale'] = 'not a step'
      firstTaskOf(root)[UNKNOWN_COLUMN] = 'from a later build'
    })
    const out = jsonFromDocument(opened(text).document)
    const written = JSON.parse(out) as Group
    expect(validateDocument(written).errors, FR_024_FITS_THE_SCHEMA).toEqual([])
    for (const key of [UNKNOWN_KEY, 'exportPngScale', 'laterWidth', UNKNOWN_COLUMN]) {
      expect(out.includes(key), `${FR_024_NO_KEY_WRITTEN_BACK} -- ${key}`).toBe(false)
    }
  })
})

describe('OP-6 (MUST) -- documentSettings is read for what this build s schema knows', () => {
  it('an unknown key is dropped, not written back, and not told on a document that is not newer', () => {
    const read = opened(handed(THIS_BUILD, (root) => void (settingsOf(root)[UNKNOWN_KEY] = 7)))
    expect(Object.hasOwn(read.document.documentSettings, UNKNOWN_KEY)).toBe(false)
    expect(read.unreadColumns).toEqual([])
    expect(Object.hasOwn(settingsOf(writtenOf(read.document)), UNKNOWN_KEY), OP_6_DROPPED_NOT_WRITTEN_BACK).toBe(false)
  })

  it('a wrong-typed item falls back to its default, and every other item is kept', () => {
    const read = opened(
      handed(THIS_BUILD, (root) => {
        settingsOf(root)['displayScale'] = 'not a step'
        settingsOf(root)['fontScale'] = 'L'
      }),
    )
    const settings = read.document.documentSettings as unknown as Group
    expect(settings['displayScale']).toEqual(settingDefaultOf('displayScale'))
    expect(settings['fontScale']).toBe('L')
    expect(read.unreadColumns, 'OP-6: not told on a document that is not newer').toEqual([])
  })

  it('an unknown key inside a nested item is dropped, and the rest of that item is kept', () => {
    const read = opened(
      handed(THIS_BUILD, (root) => {
        settingsOf(root)[NESTED_KEY] = { width: 1200, height: 800, laterWidth: 3 }
      }),
    )
    expect((read.document.documentSettings as unknown as Group)[NESTED_KEY]).toEqual({ width: 1200, height: 800 })
  })

  it.each([
    ['of the wrong type inside', { width: 'wide', height: 800 }],
    ['missing a key inside', { width: 1200 }],
  ])('a nested item %s falls back to its whole default', (_name, value) => {
    const read = opened(handed(THIS_BUILD, (root) => void (settingsOf(root)[NESTED_KEY] = value)))
    expect((read.document.documentSettings as unknown as Group)[NESTED_KEY]).toEqual(settingDefaultOf(NESTED_KEY))
  })

  it('on a newer document, a dropped key and a key put back to its default are listed as unread (OP-6, FR-073)', () => {
    const read = opened(
      handed(NEWER, (root) => {
        settingsOf(root)[UNKNOWN_KEY] = 7
        settingsOf(root)['displayScale'] = 'not a step'
      }),
    )
    expect(read.unreadColumns.some((one) => one.includes(UNKNOWN_KEY)), FR_073_NOT_DROPPED_UNLISTED).toBe(true)
    expect(read.unreadColumns.some((one) => one.includes('displayScale')), FR_073_NOT_DROPPED_UNLISTED).toBe(true)
  })

  it('no settings key refuses the document, however many are wrong at once (Chapter 6.1, MUST NOT)', () => {
    const read = documentFromJson(
      handed(THIS_BUILD, (root) => {
        const settings = settingsOf(root)
        for (const key of Object.keys(settings).slice(0, 12)) settings[key] = { notThisShape: true }
        settings[UNKNOWN_KEY] = 7
      }),
      THIS_BUILD,
    )
    expect(read.ok, READER_DOES_NOT_REFUSE_SETTINGS).toBe(true)
  })
})

describe('FR-073 (MUST) -- schedule data of the wrong shape refuses the whole document', () => {
  const spoiled = (version: string): string => handed(version, (root) => void (firstTaskOf(root)['uid'] = 'not an integer'))

  it('a document this build knows is refused with RS-25', () => {
    const read = documentFromJson(spoiled(THIS_BUILD), THIS_BUILD)
    expect(read.ok, FR_073_SCHEDULE_REFUSED_WHOLE).toBe(false)
    if (!read.ok) expect(read.reason).toBe('RS-25')
  })

  it('a newer document is refused with RS-64', () => {
    const read = documentFromJson(spoiled(NEWER), THIS_BUILD)
    expect(read.ok, FR_073_SCHEDULE_REFUSED_WHOLE).toBe(false)
    if (!read.ok) expect(read.reason).toBe('RS-64')
  })

  it('an unknown schedule column of a document that is not newer is refused, not dropped (Chapter 6.1)', () => {
    const read = documentFromJson(handed(THIS_BUILD, (root) => void (firstTaskOf(root)[UNKNOWN_COLUMN] = 1)), THIS_BUILD)
    expect(read.ok, NO_LENIENCY_FOR_SCHEDULE).toBe(false)
  })
})

describe('FR-073 -- the reason words name the place of the latest version by its seat', () => {
  const reasons = (DISPLAY_WORDS as { reasons: { rowId: string; nextStep?: { ja: string; en: string } }[] }).reasons
  it.each(['RS-48', 'RS-63', 'RS-64'])('%s holds the {downloadUrl} seat in both languages, and never S-350 itself', (row) => {
    const next = reasons.find((one) => one.rowId === row)?.nextStep
    expect(next, `${row} has no next step`).toBeDefined()
    for (const said of [next?.ja ?? '', next?.en ?? '']) {
      expect(said, FR_073_LEAD_TO_THE_LATEST).toContain(DOWNLOAD_URL_SEAT)
      expect(said, FR_073_NOT_COPIED_INTO_WORDS).not.toContain(DOWNLOAD_ADDRESS)
    }
  })

  it('premise: S-350 holds an address', () => {
    expect(DOWNLOAD_ADDRESS).toMatch(/^https:\/\//)
  })
})

const T_036 = specTable('T-036')
const T_103 = specTable('T-103')

const keyOf = (id: string): KeyInput => {
  const cell = T_036.rows.find((one) => one.id === id)?.by['割当'] ?? ''
  const parts = [...cell.split('／')[0]!.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? '')
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: named('Cmd') },
  }
}

const partNameOf = (id: string): string => {
  const name = bare(T_103.rows.find((one) => one.id === id)?.by['確定名（英）'] ?? '')
  if (name === '') throw new Error(`table T-103 row ${id} names no UI part`)
  return name
}

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const pointer = (phase: PointerPhase): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: 500,
  y: 300,
  modifiers: NO_MODS,
  clickCount: 1,
})

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  else (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
})

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

interface Bench {
  readonly loop: FrameLoop
  readonly saved: Uint8Array[]
  last(): ScreenView
  openAndReplace(text: string): Promise<void>
  save(): Promise<void>
}

function bench(): Bench {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as unknown as { requestAnimationFrame: (callback: (time: number) => void) => number }).requestAnimationFrame =
    (callback) => waiting.push(callback)
  const frames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => void views.push(view),
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  const answers: ((reading: FileReading) => void)[] = []
  const saved: Uint8Array[] = []
  const file = { kind: 'writable', fileName: 'incoming.json' } as const
  const store: FileStore = {
    readFileToOpen: () => new Promise<FileReading>((resolve) => void answers.push(resolve)),
    readOpenedFileState: async () => file,
    restoreOpenedFilePermission: async () => file,
    overwriteOpenedFile: async (bytes: Uint8Array) => {
      saved.push(bytes)
      return { ok: true, openedFile: file } as never
    },
    writeChosenFile: async (write) => {
      const bytes = (write as unknown as { bytes?: Uint8Array }).bytes
      if (bytes !== undefined) saved.push(bytes)
      return { ok: true, openedFile: { kind: 'writable', fileName: write.suggestedFileName } } as never
    },
  }
  const loop = frameLoop({ showSvg: () => undefined }, templateCopy() as unknown as Document, { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }, { surface, language: 'ja' }, store)
  frames()
  const pressOn = async (at: Partial<ScreenPart> & { part: string }): Promise<void> => {
    part = { entry: null, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null, ...at } as ScreenPart
    loop.receiveInput(pointer('down'))
    loop.receiveInput(pointer('up'))
    part = null
    await settle()
    frames()
  }
  return {
    loop,
    saved,
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    openAndReplace: async (text) => {
      loop.receiveInput(keyOf('SK-10'))
      frames()
      await settle()
      const answer = answers.shift()
      if (answer === undefined) throw new Error('SK-10 asked the store for no file')
      answer({ ok: true, file: { bytes: new TextEncoder().encode(text), fileName: 'incoming.json' } })
      await settle()
      frames()
      await pressOn({ part: partNameOf('U-56'), entry: 'IC-71' })
      await pressOn({ part: partNameOf('U-55'), confirmationAnswer: 'proceed' } as never)
    },
    save: async () => {
      loop.receiveInput(keyOf('SK-11'))
      frames()
      await settle()
      frames()
    },
  }
}

const wordsOf = (row: string): { text: string; next: string } => {
  const entry = (DISPLAY_WORDS as { reasons: { rowId: string; text: { ja: string }; nextStep?: { ja: string } }[] }).reasons.find(
    (one) => one.rowId === row,
  )
  if (entry === undefined) throw new Error(`the dictionary holds no ${row}`)
  return { text: entry.text.ja, next: entry.nextStep?.ja ?? '' }
}

const HANDED_TITLE = 'Handed over'
const titled = (root: Group): void => {
  ;((root['schedule'] as Group)['project'] as Group)['title'] = HANDED_TITLE
}
const titleOf = (document: Document): unknown => (document.schedule.project as unknown as Group)['title']

const toldOf = (view: ScreenView, row: string): Notice | undefined =>
  view.notices.find((one) => one.text === wordsOf(row).text)

describe('FR-073 through the shell -- a newer document opened and saved', () => {
  it('a newer document with nothing unread opens unasked and tells RS-63, its next step naming S-350', async () => {
    const run = bench()
    await run.openAndReplace(handed(NEWER, titled))
    expect(titleOf(run.loop.document()), 'the handed document replaced the open one').toBe(HANDED_TITLE)
    const told = toldOf(run.last(), 'RS-63')
    expect(told, FR_073_RS_63).toBeDefined()
    expect(told?.manner).toBe(bare(specTable('T-233').rows.find((one) => one.id === 'RS-63')?.by['作法'] ?? ''))
    expect(told?.nextSteps, FR_073_LEAD_TO_THE_LATEST).toEqual([withDownloadAddress(wordsOf('RS-63').next)])
    expect(JSON.stringify(told), FR_073_NOT_COPIED_INTO_WORDS).not.toContain(DOWNLOAD_URL_SEAT)
    expect(run.last().openModal ?? null, 'RS-63: nothing is asked').toBeNull()
  })

  it('a document that is not newer tells no RS-63', async () => {
    const run = bench()
    await run.openAndReplace(handed(THIS_BUILD, titled))
    expect(titleOf(run.loop.document()), 'the handed document replaced the open one').toBe(HANDED_TITLE)
    expect(toldOf(run.last(), 'RS-63'), FR_073_NOT_OPENED_SILENTLY).toBeUndefined()
  })

  it('a newer document whose schedule data does not fit is refused and tells RS-64, its next step naming S-350', async () => {
    const run = bench()
    const before = JSON.stringify(run.loop.document())
    await run.openAndReplace(handed(NEWER, (root) => void (firstTaskOf(root)['uid'] = 'not an integer')))
    expect(JSON.stringify(run.loop.document()), FR_073_SCHEDULE_REFUSED_WHOLE).toBe(before)
    const told = toldOf(run.last(), 'RS-64')
    expect(told, 'FR-073: RS-64 is the reason a refused newer document carries').toBeDefined()
    expect(told?.nextSteps, FR_073_LEAD_TO_THE_LATEST).toEqual([withDownloadAddress(wordsOf('RS-64').next)])
  })

  it('a newer document, once saved, carries this build s schemaVersion and fits the schema', async () => {
    const run = bench()
    await run.openAndReplace(
      handed(NEWER, (root) => {
        titled(root)
        settingsOf(root)[UNKNOWN_KEY] = 7
      }),
    )
    expect(titleOf(run.loop.document()), 'the handed document replaced the open one').toBe(HANDED_TITLE)
    await run.save()
    const bytes = run.saved[run.saved.length - 1]
    expect(bytes, 'SK-11 wrote nothing').toBeDefined()
    const written = JSON.parse(new TextDecoder().decode(bytes)) as Group
    expect(written['schemaVersion'], FR_024_OWN_VERSION).toBe(THIS_BUILD)
    expect(validateDocument(written).errors, FR_024_FITS_THE_SCHEMA).toEqual([])
    expect(Object.hasOwn(settingsOf(written), UNKNOWN_KEY), FR_073_NOT_CARRIED).toBe(false)
  })
})
