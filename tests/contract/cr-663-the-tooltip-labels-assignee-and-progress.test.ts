// CR-663 (table T-348 TL-7 / TL-8, S-513, DT-2 / DT-3): the task tooltip's assignee and progress lines.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { ScreenView, ScreenViewReadings, Tooltip } from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable, unbroken } from './spec-table'
import { day, taskOf } from '../unit/cr-430-cross-section-scene'

type Language = 'ja' | 'en'

const TL_7_ONE_LINE =
  '担当の語、`:`、半角空白 1 つ、名前の並び の順に、担当者が何人でも 1 行で書くこと（MUST）'
const TL_7_THE_WORD =
  '担当の語は、遅延診断レポートの担当の欄の見出しと同じ語（`FR-038` の辞書の `delayReportColumns` の `DT-2` の語）とすること（MUST）'
const TL_7_THE_ORDER =
  '`FR-059` と同じ順（資源名の昇順、同名は `UID` の昇順）に、`,` と半角空白 1 つで繋いだものとする'
const TL_7_CUT_AT_WHOLE_NAMES =
  '⭐ 名前の並びが `_assets/tbl-settings.md` の 表 T-206 の `S-513` の字数を超えるときは、先頭から名前を 1 人ずつ丸ごと残し、半角空白 1 つと `…` を続けて止めること（MUST）'
const TL_7_AS_MANY_AS_FIT = '残す名前は、残した並び・半角空白・`…` を合わせて `S-513` を超えない限り多くとる。'
const TL_7_CUT_INSIDE =
  '先頭の名前 1 つでも収まらないときは、その名前を先頭から `S-513` より 1 少ない字数だけ残し、`…` を続ける。'
const TL_7_CODE_POINTS = '字数は、文字（Unicode の符号位置）1 つを 1 と数える。'
const TL_7_NONE = '対象が 1 人もいなければ行を出さない。'
const TL_7_NO_COUNT_FORM =
  '⛔ 担当ラベルの `-`（表 T-225 の `AS-2`）も、先頭 1 名と残りの人数の形もコピーしてはならない（MUST NOT）'
const TL_8_LINE = '進捗の語、`:`、半角空白 1 つ、`percentComplete` の順に書くこと（MUST）'
const TL_8_THE_WORD =
  '進捗の語は、`FR-038` の辞書の `delayReportColumns` の `DT-3` の語とすること（MUST）'
const TL_8_UNROUNDED =
  '`percentComplete` は、`FR-090` の完了率ラベルと同じく整数と百分率の記号で、丸めずに書くこと（MUST）'
const TL_8_NO_LINE = '`percentComplete` が空のときと、未着手（`actualStart` が空）のときは行を出さない'
const FR_059_WORK_ONLY =
  '担当ラベルを描くとき、`GRS` は、**作業資源だけ**を対象とし、材料資源・費用資源・名前が空の資源を出さないこと。'

const cellOf = (table: string, id: string, heading: string): string => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found.by[heading] ?? ''
}

const TL_7_CELL = unbroken(cellOf('T-348', 'TL-7', '書き方'))
const TL_8_CELL = unbroken(cellOf('T-348', 'TL-8', '書き方'))

// see S-513
const S_513 = ((): number => {
  const found = /(\d+)/.exec(bare(cellOf('T-206', 'S-513', '既定')))
  if (found === null) throw new Error('table T-206 row S-513 states no number')
  return Number(found[1])
})()

// see S-439
const S_439_MS = ((): number => {
  const found = /(\d+(?:\.\d+)?)/.exec(bare(cellOf('T-212', 'S-439', '値')))
  if (found === null) throw new Error('table T-212 row S-439 states no number')
  return Number(found[1])
})()

const THEME_HUE = Number(bare(cellOf('T-216', 'S-73', '既定')))

// see DT-2, DT-3
const COLUMN_WORDS = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
    delayReportColumns: { rowId: string; text: Readonly<Record<Language, string>> }[]
  }
).delayReportColumns

const columnWord = (row: string, language: Language): string => {
  const found = COLUMN_WORDS.find((one) => one.rowId === row)?.text[language]
  if (found === undefined) throw new Error(`the dictionary's delayReportColumns has no ${row}`)
  return found
}

const ASSIGNEE = (language: Language): string => `${columnWord('DT-2', language)}: `
const PROGRESS = (language: Language): string => `${columnWord('DT-3', language)}: `

const CUT_MARK = '…'
const codePoints = (text: string): number => Array.from(text).length

const VIEW: Omit<ScreenView, 'tooltips'> = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  },
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
} as unknown as Omit<ScreenView, 'tooltips'>

const sessionIn = (language: Language): ScreenSession => ({
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: language, helpLanguage: language },
})

const restingOn = (task: Task): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer: { x: 300, y: 200 },
    pointerRestedMs: S_439_MS + 1,
    hintTargetDwellMs: S_439_MS + 1,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    hintHolderUnderPointer: { kind: 'task', taskUid: task.uid },
    themePreference: 'light',
    themeHue: THEME_HUE,
    selectedGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }) as unknown as ScreenViewReadings

interface Person {
  readonly uid: number
  readonly name: string | null
  readonly kind?: number
  readonly cost?: boolean
}

const WORK = 1
const MATERIAL = 0

const THE_TASK = { uid: 3, name: 'a named task', start: day(2), finish: day(8) }

const tipOf = (over: Readonly<Record<string, unknown>>, people: readonly Person[], language: Language): string => {
  const task = taskOf({ ...THE_TASK, ...over })
  const schedule = {
    tasks: [task],
    resources: people.map((one) => ({
      uid: one.uid,
      name: one.name,
      resourceKind: one.kind ?? WORK,
      isCostResource: one.cost ?? false,
      calendarUid: null,
      carry: {},
      carryElements: [],
    })),
    assignments: people.map((one, index) => ({
      uid: 500 + index,
      taskUid: task.uid,
      resourceUid: one.uid,
      carry: {},
      carryElements: [],
    })),
    baselineTasks: [],
  } as unknown as Schedule
  const tips = tooltipsFromScreenView(
    { ...VIEW, language },
    SETTINGS_DEFAULTS as unknown as DocumentSettings,
    sessionIn(language),
    restingOn(task),
    schedule,
  ).filter((one) => one.anchor.kind === 'task')
  if (tips.length !== 1) throw new Error(`EZ-6: ${tips.length} task tooltips after resting S-439 on a task`)
  return (tips[0] as Tooltip).text
}

const linesOf = (text: string): readonly string[] => text.split('\n')

const assigneeLinesOf = (text: string, language: Language): readonly string[] =>
  linesOf(text).filter((one) => one.startsWith(ASSIGNEE(language)))

const progressLinesOf = (text: string, language: Language): readonly string[] =>
  linesOf(text).filter((one) => one.startsWith(PROGRESS(language)))

const namesPart = (line: string, language: Language): string => line.slice(ASSIGNEE(language).length)

// WHY: a name of a given length in code points, built of one wide character so its count is plain.
const nameOf = (head: string, length: number): string => head + '鈴'.repeat(Math.max(0, length - codePoints(head)))

const STARTED = { actualStart: day(2), percentComplete: 50 }

describe('CR-663 -- the words the cases below are written against', () => {
  it('TL-7 and TL-8 still say what the cases press', () => {
    for (const said of [
      TL_7_ONE_LINE,
      TL_7_THE_WORD,
      TL_7_THE_ORDER,
      TL_7_CUT_AT_WHOLE_NAMES,
      TL_7_AS_MANY_AS_FIT,
      TL_7_CUT_INSIDE,
      TL_7_CODE_POINTS,
      TL_7_NONE,
      TL_7_NO_COUNT_FORM,
    ]) {
      expect(TL_7_CELL, said).toContain(unbroken(said))
    }
    for (const said of [TL_8_LINE, TL_8_THE_WORD, TL_8_UNROUNDED, TL_8_NO_LINE]) {
      expect(TL_8_CELL, said).toContain(unbroken(said))
    }
    expect(S_513, 'S-513 states a positive count').toBeGreaterThan(1)
  })

  it('premise: the two languages print different words, so a fixed word fails one of them', () => {
    expect(columnWord('DT-2', 'ja')).not.toBe(columnWord('DT-2', 'en'))
    expect(columnWord('DT-3', 'ja')).not.toBe(columnWord('DT-3', 'en'))
  })
})

for (const language of ['ja', 'en'] as const) {
  describe(`CR-663 TL-7 -- the assignee line (${language})`, () => {
    it(`TL-7 「${TL_7_ONE_LINE}」 / 「${TL_7_THE_WORD}」: two assignees, one line`, () => {
      const tip = tipOf(STARTED, [
        { uid: 11, name: 'Bea' },
        { uid: 12, name: 'Ada' },
      ], language)
      expect(assigneeLinesOf(tip, language)).toEqual([`${ASSIGNEE(language)}Ada, Bea`])
      expect(linesOf(tip).filter((one) => one === 'Ada' || one === 'Bea'), 'no name stands on a line of its own').toEqual([])
    })

    it(`TL-7 「${TL_7_THE_ORDER}」 / FR-059 「${FR_059_WORK_ONLY}」`, () => {
      const tip = tipOf(STARTED, [
        { uid: 21, name: 'Cid' },
        { uid: 22, name: 'Ada' },
        { uid: 23, name: 'a material', kind: MATERIAL },
        { uid: 24, name: 'a cost', cost: true },
        { uid: 25, name: '' },
        { uid: 26, name: 'Bea' },
      ], language)
      expect(assigneeLinesOf(tip, language)).toEqual([`${ASSIGNEE(language)}Ada, Bea, Cid`])
    })

    it(`TL-7 「${TL_7_NONE}」`, () => {
      const nobody = tipOf(STARTED, [], language)
      expect(assigneeLinesOf(nobody, language)).toEqual([])
      const onlyMaterial = tipOf(STARTED, [{ uid: 31, name: 'a material', kind: MATERIAL }], language)
      expect(assigneeLinesOf(onlyMaterial, language), 'no work resource is no one').toEqual([])
      expect(linesOf(onlyMaterial).some((one) => one.trim() === '-'), 'TL-7: the AS-2 hyphen is not copied').toBe(false)
    })

    it(`TL-7 「${TL_7_NO_COUNT_FORM}」: every name that fits is written, never a count`, () => {
      const tip = tipOf(STARTED, [
        { uid: 41, name: 'Ada' },
        { uid: 42, name: 'Bea' },
        { uid: 43, name: 'Cid' },
      ], language)
      const line = assigneeLinesOf(tip, language)[0] ?? ''
      expect(namesPart(line, language)).toBe('Ada, Bea, Cid')
      expect(line).not.toMatch(/\+\s*\d/)
    })

    it(`TL-7 「${TL_7_CUT_AT_WHOLE_NAMES}」 / 「${TL_7_AS_MANY_AS_FIT}」`, () => {
      const third = Math.floor(S_513 / 3)
      const people = [
        { uid: 51, name: nameOf('A', third) },
        { uid: 52, name: nameOf('B', third) },
        { uid: 53, name: nameOf('C', third) },
        { uid: 54, name: nameOf('D', third) },
      ]
      const whole = people.map((one) => one.name).join(', ')
      expect(codePoints(whole), 'premise: the names together pass S-513').toBeGreaterThan(S_513)
      const line = assigneeLinesOf(tipOf(STARTED, people, language), language)
      expect(line).toHaveLength(1)
      const written = namesPart(line[0] ?? '', language)
      expect(written.endsWith(` ${CUT_MARK}`), `stopped with a half-width space and the mark: ${written}`).toBe(true)
      expect(codePoints(written), 'the kept names, the space and the mark stay within S-513').toBeLessThanOrEqual(S_513)
      const kept = written.slice(0, -2).split(', ')
      expect(kept, 'whole names from the head').toEqual(people.slice(0, kept.length).map((one) => one.name))
      const oneMore = [...kept, people[kept.length]?.name ?? ''].join(', ')
      expect(codePoints(`${oneMore} ${CUT_MARK}`), 'as many as fit: one more name would pass S-513').toBeGreaterThan(S_513)
    })

    it(`TL-7: names that fit S-513 exactly are written whole, with no mark`, () => {
      const head = nameOf('A', S_513 - 5)
      const people = [
        { uid: 61, name: head },
        { uid: 62, name: 'Bea' },
      ]
      expect(codePoints(`${head}, Bea`)).toBe(S_513)
      const written = namesPart(assigneeLinesOf(tipOf(STARTED, people, language), language)[0] ?? '', language)
      expect(written).toBe(`${head}, Bea`)
    })

    it(`TL-7 「${TL_7_CUT_INSIDE}」 / 「${TL_7_CODE_POINTS}」`, () => {
      const long = nameOf('A', S_513 + 10)
      const written = namesPart(
        assigneeLinesOf(tipOf(STARTED, [{ uid: 71, name: long }, { uid: 72, name: 'Bea' }], language), language)[0] ?? '',
        language,
      )
      expect(written).toBe(`${Array.from(long).slice(0, S_513 - 1).join('')}${CUT_MARK}`)
      expect(codePoints(written)).toBe(S_513)
    })

    it(`TL-7 「${TL_7_CODE_POINTS}」: a character outside the basic plane counts as one`, () => {
      const wide = '\u{20BB7}'
      const long = wide.repeat(S_513 + 3)
      const written = namesPart(assigneeLinesOf(tipOf(STARTED, [{ uid: 81, name: long }], language), language)[0] ?? '', language)
      expect(written).toBe(`${wide.repeat(S_513 - 1)}${CUT_MARK}`)
    })
  })

  describe(`CR-663 TL-8 -- the progress line (${language})`, () => {
    it(`TL-8 「${TL_8_LINE}」 / 「${TL_8_THE_WORD}」`, () => {
      const tip = tipOf({ actualStart: day(2), percentComplete: 50 }, [], language)
      expect(progressLinesOf(tip, language)).toEqual([`${PROGRESS(language)}50%`])
      expect(linesOf(tip), 'the bare percent line is gone').not.toContain('50%')
    })

    it(`TL-8 「${TL_8_UNROUNDED}」: a started task at 0 writes 0%`, () => {
      const tip = tipOf({ actualStart: day(2), percentComplete: 0 }, [], language)
      expect(progressLinesOf(tip, language)).toEqual([`${PROGRESS(language)}0%`])
    })

    it(`TL-8 「${TL_8_NO_LINE}」`, () => {
      const notStarted = tipOf({ actualStart: null, percentComplete: 50 }, [], language)
      expect(progressLinesOf(notStarted, language)).toEqual([])
      const empty = tipOf({ actualStart: day(2), percentComplete: null }, [], language)
      expect(progressLinesOf(empty, language)).toEqual([])
    })

    it('TL-1: the assignee line stands right above the progress line', () => {
      const lines = linesOf(tipOf(STARTED, [{ uid: 91, name: 'Ada' }], language))
      const assignee = lines.findIndex((one) => one.startsWith(ASSIGNEE(language)))
      expect(assignee).toBeGreaterThanOrEqual(0)
      expect(lines[assignee + 1]).toBe(`${PROGRESS(language)}50%`)
    })
  })
}

describe('CR-663 -- the English words', () => {
  it('en: "Assignee: " and "Progress: "', () => {
    const tip = tipOf(STARTED, [{ uid: 95, name: 'Ada' }], 'en')
    expect(linesOf(tip)).toContain('Assignee: Ada')
    expect(linesOf(tip)).toContain('Progress: 50%')
  })
})
