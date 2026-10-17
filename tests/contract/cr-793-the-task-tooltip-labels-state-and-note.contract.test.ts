// CR-793 (table T-348 TL-8 / TL-9 / TL-12 / TL-13 / TL-14, SQ-5, S-439 / S-621 / S-622): the task tooltip's state, note and two columns.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { ScreenView, ScreenViewReadings, Tooltip, TooltipRow } from '../../src/adapter/screen-renderer/screen-renderer'
import { taskStateWordOf } from '../../src/adapter/screen-renderer/search-panel'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { diagnoseDelay, workingCalendarOf, type Schedule } from '../../src/entity/document-model/schedule/schedule'
import { NOT_STORED_HELP_SIZES } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { keepTooltipsInside, tooltipElement } from '../../src/framework/dom-screen-surface/tooltips-drawing'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { selfAndDescendants, stage, styleMap, type FakeElement } from '../fixtures/fake-browser'
import { day, scheduleOf, taskOf } from '../unit/cr-430-cross-section-scene'
import { unbroken } from './spec-table'

type Language = 'ja' | 'en'
const LANGUAGES = ['ja', 'en'] as const

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const TL_8_FORM = '進捗の語、`:`、半角空白 1 つ、`percentComplete`、半角空白 1 つ、`(`、状態の語、`)` の順に書くこと（MUST）'
const TL_8_SAME_AS_SQ_5 = '⭐ 状態の語は、検索パネルの 表 T-331 の `SQ-5` と同じ判定で選んだ状態の語とすること（MUST）'
const TL_8_NO_NEW_WORD = '⛔ 状態のために新しい語を辞書に持ってはならない（MUST NOT）'
const TL_9_FORM = '期限の語、`:`、半角空白 1 つ、`deadline` の日（`TL-10`）の順に書くこと（MUST）'
const TL_12_FORM = '遅れの語、`:`、半角空白 1 つ、日数、半角空白 1 つ、稼働日の語 の順に、1 行で書くこと（MUST）'
const TL_13_TWO_COLUMNS =
  '語と `:` で始まる行（`TL-1` が挙げる）を、ラベル（語と `:`）の列と値（`:` の後ろの半角空白より後ろ）の列の 2 列に置き、ラベルは列の右に寄せ、値は列の左から書くこと（MUST）'
const TL_13_ALL_LANGUAGES = '⭐ 揃え方は言語によらず 1 つとすること（MUST）'
const TL_13_NO_PADDING = '⛔ 空白を詰めて揃えてはならない（MUST NOT）'
const TL_14_BODY = '`notes`（`_assets/fig-erd-detail.md` の `AT-32`）の本文を、語も `:` も付けずに書くこと（MUST）'
const TL_14_CLAMP =
  '⭐ 幅は `_assets/tbl-settings.md` の 表 T-206 の `S-621` で折り返し、画面に並ぶ行が `S-622` を超えるときは `S-622` 行で止め、最後の行の末尾を `…` で切ること（MUST）'
const TL_14_NO_LINE = '`notes` が `null`、空、または空白と改行だけのときは行を出さない'
const TL_1_NOTE_UNDER_PROGRESS = '`TL-8` の完了率・`TL-14` の備考・`TL-9` の期限を、この順に 1 行ずつ出すこと（MUST）'

interface Worded {
  readonly rowId?: string
  readonly part?: string
  readonly text?: Readonly<Record<Language, string>>
  readonly label?: Readonly<Record<Language, string>>
}
const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly delayReportColumns: readonly Worded[]
  readonly delayReportStatuses: readonly Worded[]
  readonly planActualStates: readonly Worded[]
  readonly properties: readonly Worded[]
  readonly propertyField: readonly Worded[]
}

const wordIn = (list: readonly Worded[], key: { rowId?: string; part?: string }, language: Language): string => {
  const found = list.find((one) => (key.rowId !== undefined ? one.rowId === key.rowId : one.part === key.part))
  const word = found?.text?.[language] ?? found?.label?.[language]
  if (word === undefined) throw new Error(`the dictionary has no ${key.rowId ?? key.part}`)
  return word
}

// see DT-3, PR-10
const PROGRESS_WORD = (language: Language): string => wordIn(WORDS.delayReportColumns, { rowId: 'DT-3' }, language)
const STATE_WORD = (rowId: string, language: Language): string =>
  wordIn(rowId.startsWith('PS-') ? WORDS.planActualStates : WORDS.delayReportStatuses, { rowId }, language)
const DEADLINE_WORD = (language: Language): string => wordIn(WORDS.properties, { rowId: 'PR-10' }, language)
const DAYS_UNIT = (language: Language): string => wordIn(WORDS.propertyField, { part: 'workingDaysUnit' }, language)

interface SettingsRow {
  readonly id?: string
  readonly value?: { readonly num?: string }
  readonly default?: { readonly num?: string; readonly suffix?: string }
}
const rowOfSettings = (id: string): SettingsRow => {
  const found: SettingsRow[] = []
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) node.forEach(walk)
    else if (node !== null && typeof node === 'object') {
      if ((node as SettingsRow).id === id) found.push(node as SettingsRow)
      Object.values(node).forEach(walk)
    }
  }
  walk(JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'settings.json'), 'utf8')))
  const [first] = found
  if (first === undefined) throw new Error(`settings.json has no row ${id}`)
  return first
}


const SETTINGS = SETTINGS_DEFAULTS as unknown as DocumentSettings
const STATUS_DATE = day(10)
const THE_UID = 3

const sessionIn = (language: Language): ScreenSession => ({
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: language, helpLanguage: language },
})

const readingsOn = (
  taskUid: number,
  diagnosedMarkers?: ReadonlyMap<number, 'DG-1' | 'DG-2' | 'DG-3'>,
): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer: { x: 500, y: 300 },
    pointerRestedMs: SETTINGS_CONSTANTS.taskHintDelayMs,
    hintTargetDwellMs: SETTINGS_CONSTANTS.taskHintDelayMs,
    hintHolderUnderPointer: { kind: 'task', taskUid },
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: 'light',
    themeHue: 214,
    selectedTaskGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
    ...(diagnosedMarkers === undefined ? {} : { diagnosedMarkers }),
  }) as unknown as ScreenViewReadings

interface Wish {
  readonly task?: Readonly<Record<string, unknown>>
  readonly assignees?: readonly string[]
  readonly statusDate?: string | null
  readonly diagnosed?: ReadonlyMap<number, 'DG-1' | 'DG-2' | 'DG-3'>
}

const BASE_TASK = { uid: THE_UID, name: 'a named task', start: day(2), finish: day(8) }
const IN_PROGRESS = { actualStart: day(2), percentComplete: 50 }

const scheduleFor = (wish: Wish): Schedule => {
  const task = taskOf({ ...BASE_TASK, ...wish.task })
  const base = scheduleOf({ tasks: [task], statusDate: wish.statusDate ?? null })
  const names = wish.assignees ?? []
  return {
    ...base,
    resources: names.map((name, index) => ({
      uid: 10 + index,
      name,
      resourceKind: 1,
      isCostResource: false,
      calendarUid: null,
      carry: {},
      carryElements: [],
    })),
    assignments: names.map((_name, index) => ({
      uid: 100 + index,
      taskUid: THE_UID,
      resourceUid: 10 + index,
      carry: {},
      carryElements: [],
    })),
  } as unknown as Schedule
}

const tipOf = (wish: Wish, language: Language): Tooltip => {
  const shown = { frame: { scrollbars: [] } } as unknown as Omit<ScreenView, 'tooltips'>
  const tip = tooltipsFromScreenView(
    shown,
    SETTINGS,
    sessionIn(language),
    readingsOn(THE_UID, wish.diagnosed),
    scheduleFor(wish),
  ).find((one) => one.anchor.kind === 'task')
  if (tip === undefined) throw new Error('no task tooltip was raised')
  return tip
}

const linesOf = (wish: Wish, language: Language): readonly string[] => tipOf(wish, language).text.split('\n')

const progressLineOf = (wish: Wish, language: Language): string | undefined =>
  linesOf(wish, language).find((one) => one.startsWith(`${PROGRESS_WORD(language)}: `))

// see DX-10
const lateDaysOf = (wish: Wish): number | undefined => {
  const schedule = scheduleFor(wish)
  return diagnoseDelay({ schedule }, workingCalendarOf(schedule)).lateDays.find((one) => one.uid === THE_UID)?.days
}


describe('CR-793 -- the manuscript these cases are driven by', () => {
  it.each([
    TL_8_FORM,
    TL_8_SAME_AS_SQ_5,
    TL_8_NO_NEW_WORD,
    TL_9_FORM,
    TL_12_FORM,
    TL_13_TWO_COLUMNS,
    TL_13_ALL_LANGUAGES,
    TL_13_NO_PADDING,
    TL_14_BODY,
    TL_14_CLAMP,
    TL_14_NO_LINE,
    TL_1_NOTE_UNDER_PROGRESS,
  ])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(unbroken(clause))
  })

  it('TL-1 still puts the note right under the progress line, the deadline after it', () => {
    expect(REQUIREMENTS).toContain('`TL-8` の完了率')
    expect(REQUIREMENTS).toContain('`TL-14` の備考')
    expect(REQUIREMENTS).toContain('⚠️ 備考の行を完了率の行の直下に置くのは利用者の指示である')
  })

  it('premise: the two languages print different words', () => {
    expect(PROGRESS_WORD('ja')).not.toBe(PROGRESS_WORD('en'))
    expect(STATE_WORD('PS-5', 'ja')).not.toBe(STATE_WORD('PS-5', 'en'))
    expect(DAYS_UNIT('ja')).not.toBe(DAYS_UNIT('en'))
  })
})

describe('CR-793 -- the settings rows S-439, S-621 and S-622', () => {
  it('S-439 is 500 ms in settings.json, and the build waits that long', () => {
    expect(rowOfSettings('S-439').value?.num).toBe('500')
    expect(SETTINGS_CONSTANTS.taskHintDelayMs).toBe(500)
  })

  it('S-621 is 40 em and S-622 is 10 lines in settings.json, and the build holds the same numbers', () => {
    const wide = rowOfSettings('S-621').default
    expect(wide?.num).toBe('40')
    expect(wide?.suffix?.trim()).toBe('em')
    expect(rowOfSettings('S-622').default?.num).toBe('10')
    expect(NOT_STORED_HELP_SIZES['S-621']).toBe(40)
    expect(NOT_STORED_HELP_SIZES['S-622']).toBe(10)
  })

  it('the tooltip is not yet there one millisecond before S-439, and is there at S-439', () => {
    const shown = { frame: { scrollbars: [] } } as unknown as Omit<ScreenView, 'tooltips'>
    const at = (rested: number): number =>
      tooltipsFromScreenView(
        shown,
        SETTINGS,
        sessionIn('ja'),
        { ...readingsOn(THE_UID), pointerRestedMs: rested, hintTargetDwellMs: rested },
        scheduleFor({ task: IN_PROGRESS }),
      ).length
    expect(at(499)).toBe(0)
    expect(at(500)).toBe(1)
  })
})

describe('CR-793 TL-8 -- the progress line ends with the SQ-5 state word in parentheses', () => {
  for (const language of LANGUAGES) {
    it(`TL-8 「${TL_8_FORM}」: an in-progress task tells the PS-5 word (${language})`, () => {
      const wish: Wish = { task: IN_PROGRESS }
      expect(progressLineOf(wish, language)).toBe(`${PROGRESS_WORD(language)}: 50% (${STATE_WORD('PS-5', language)})`)
      const task = taskOf({ ...BASE_TASK, ...IN_PROGRESS })
      expect(progressLineOf(wish, language)).toContain(`(${taskStateWordOf(task, null, undefined, language)})`)
    })

    it(`TL-8 「${TL_8_SAME_AS_SQ_5}」: a finished task tells the PS-2 word (${language})`, () => {
      const finished = { actualStart: day(2), actualFinish: day(6), percentComplete: 100 }
      const task = taskOf({ ...BASE_TASK, ...finished })
      expect(progressLineOf({ task: finished }, language)).toBe(
        `${PROGRESS_WORD(language)}: 100% (${STATE_WORD('PS-2', language)})`,
      )
      expect(STATE_WORD('PS-2', language)).toBe(taskStateWordOf(task, null, undefined, language))
    })

    it(`TL-8 「${TL_8_SAME_AS_SQ_5}」: a late task (PM-4) tells the DG-4 word, with no diagnostics shown (${language})`, () => {
      const late = { start: day(1), finish: day(3), actualStart: day(1), percentComplete: 50 }
      const wish: Wish = { task: late, statusDate: STATUS_DATE }
      expect(lateDaysOf(wish), 'premise: the task is late').toBeGreaterThan(0)
      const task = taskOf({ ...BASE_TASK, ...late })
      const statusDay = { year: 2026, month: 3, day: 10 }
      expect(STATE_WORD('DG-4', language)).toBe(taskStateWordOf(task, statusDay, undefined, language))
      expect(progressLineOf(wish, language)).toBe(`${PROGRESS_WORD(language)}: 50% (${STATE_WORD('DG-4', language)})`)
    })

    it(`TL-8 「${TL_8_SAME_AS_SQ_5}」: a diagnosed DG-2 task tells the DG-2 word only while diagnostics are shown (${language})`, () => {
      const task = taskOf({ ...BASE_TASK, ...IN_PROGRESS })
      const diagnosed = new Map<number, 'DG-1' | 'DG-2' | 'DG-3'>([[THE_UID, 'DG-2']])
      const shown = progressLineOf({ task: IN_PROGRESS, diagnosed }, language)
      expect(shown).toBe(`${PROGRESS_WORD(language)}: 50% (${STATE_WORD('DG-2', language)})`)
      expect(STATE_WORD('DG-2', language)).toBe(taskStateWordOf(task, null, 'DG-2', language))
      const closed = progressLineOf({ task: IN_PROGRESS }, language)
      expect(closed, 'with diagnostics closed the task goes back to its plan/actual state word').toBe(
        `${PROGRESS_WORD(language)}: 50% (${STATE_WORD('PS-5', language)})`,
      )
    })

    it(`TL-8: a diagnosed marker of another task leaves this one on its PS word (${language})`, () => {
      const diagnosed = new Map<number, 'DG-1' | 'DG-2' | 'DG-3'>([[99, 'DG-3']])
      expect(progressLineOf({ task: IN_PROGRESS, diagnosed }, language)).toBe(
        `${PROGRESS_WORD(language)}: 50% (${STATE_WORD('PS-5', language)})`,
      )
    })

    it(`TL-8: the progress line is still absent for a task not started or without a percent (${language})`, () => {
      expect(progressLineOf({ task: { actualStart: null, percentComplete: 30 } }, language)).toBeUndefined()
      expect(progressLineOf({ task: { actualStart: day(2), percentComplete: null } }, language)).toBeUndefined()
    })
  }

  it('TL-8 e.g. 進捗: 30% (ボトルネック) / Progress: 30% (Bottleneck)', () => {
    const diagnosed = new Map<number, 'DG-1' | 'DG-2' | 'DG-3'>([[THE_UID, 'DG-2']])
    const task = { actualStart: day(2), percentComplete: 30 }
    expect(progressLineOf({ task, diagnosed }, 'ja')).toBe('進捗: 30% (ボトルネック)')
    expect(progressLineOf({ task, diagnosed }, 'en')).toBe('Progress: 30% (Bottleneck)')
  })
})

describe('CR-793 TL-9 -- the deadline line inside the task tip is labelled', () => {
  for (const language of LANGUAGES) {
    it(`TL-9 「${TL_9_FORM}」 (${language})`, () => {
      const lines = linesOf({ task: { ...IN_PROGRESS, deadline: day(20) } }, language)
      const friday = language === 'ja' ? '3/20 (金)' : '3/20 (Fri)'
      expect(lines.at(-1)).toBe(`${DEADLINE_WORD(language)}: ${friday}`)
    })
  }

  it('TL-9: with no deadline there is no deadline line', () => {
    const lines = linesOf({ task: { ...IN_PROGRESS, deadline: null } }, 'ja')
    expect(lines.some((one) => one.startsWith(`${DEADLINE_WORD('ja')}`))).toBe(false)
  })
})

describe('CR-793 TL-12 -- the late line is the DG-4 word, the days and the working-days word', () => {
  const LATE: Wish = {
    task: { start: day(1), finish: day(3), actualStart: day(1), percentComplete: 50, deadline: day(20) },
    statusDate: STATUS_DATE,
  }

  for (const language of LANGUAGES) {
    it(`TL-12 「${TL_12_FORM}」 (${language})`, () => {
      const days = lateDaysOf(LATE) ?? 0
      expect(days, 'premise: late by DX-10').toBeGreaterThan(0)
      const lines = linesOf(LATE, language)
      expect(lines.at(-1)).toBe(`${STATE_WORD('DG-4', language)}: ${days} ${DAYS_UNIT(language)}`)
    })
  }

  it('TL-12 e.g. 遅れ: N 稼働日 / Late: N working days', () => {
    const days = lateDaysOf(LATE) ?? 0
    expect(linesOf(LATE, 'ja').at(-1)).toBe(`遅れ: ${days} 稼働日`)
    expect(linesOf(LATE, 'en').at(-1)).toBe(`Late: ${days} working days`)
  })
})

describe('CR-793 TL-14 -- the note line', () => {
  const NOTE = 'first line\nsecond line'

  for (const language of LANGUAGES) {
    it(`TL-14 「${TL_14_BODY}」 / TL-1: right under the progress line, the deadline after it (${language})`, () => {
      const lines = linesOf({ task: { ...IN_PROGRESS, notes: 'remember this', deadline: day(20) } }, language)
      const progress = lines.findIndex((one) => one.startsWith(`${PROGRESS_WORD(language)}: `))
      expect(progress).toBeGreaterThanOrEqual(0)
      expect(lines[progress + 1], 'no word and no colon in front of the note').toBe('remember this')
      expect(lines[progress + 2]?.startsWith(`${DEADLINE_WORD(language)}: `)).toBe(true)
    })
  }

  it('TL-14: a note of several lines keeps its line breaks', () => {
    const lines = linesOf({ task: { ...IN_PROGRESS, notes: NOTE } }, 'ja')
    const at = lines.indexOf('first line')
    expect(at).toBeGreaterThanOrEqual(0)
    expect(lines[at + 1]).toBe('second line')
  })

  it('TL-14: CRLF and a lone CR read as line breaks', () => {
    const crlf = linesOf({ task: { ...IN_PROGRESS, notes: 'one\r\ntwo' } }, 'en')
    expect(crlf.join('\n')).not.toContain('\r')
    expect(crlf.indexOf('two')).toBe(crlf.indexOf('one') + 1)
    const cr = linesOf({ task: { ...IN_PROGRESS, notes: 'one\rtwo' } }, 'en')
    expect(cr.join('\n')).not.toContain('\r')
    expect(cr.indexOf('two')).toBe(cr.indexOf('one') + 1)
  })

  it.each([[null], [''], ['   '], ['\r\n \n']])('TL-14 「%j」: a null, empty or blank note gives no line at all', (notes) => {
    const without = linesOf({ task: { ...IN_PROGRESS, notes: null } }, 'ja')
    const lines = linesOf({ task: { ...IN_PROGRESS, notes } }, 'ja')
    expect(lines, 'the tip is the tip without notes, no empty line left').toEqual(without)
    expect(lines.every((one) => one.trim() !== '')).toBe(true)
  })

  it('TL-14: with no progress line (not started) the note stands after the assignee line and before the deadline', () => {
    const lines = linesOf(
      { task: { actualStart: null, percentComplete: null, notes: 'a note', deadline: day(20) }, assignees: ['Ada'] },
      'en',
    )
    expect(lines.some((one) => one.startsWith(`${PROGRESS_WORD('en')}: `))).toBe(false)
    const assignee = lines.findIndex((one) => one.startsWith('Assignee: '))
    expect(assignee).toBeGreaterThanOrEqual(0)
    expect(lines[assignee + 1]).toBe('a note')
    expect(lines[assignee + 2]).toBe(`${DEADLINE_WORD('en')}: 3/20 (Fri)`)
  })
})

describe('CR-793 TL-13 -- Tooltip.rows: the labelled lines as label and value, the name and the note across', () => {
  const FULL: Wish = {
    task: {
      ...IN_PROGRESS,
      start: day(1),
      finish: day(3),
      actualStart: day(1),
      notes: 'a note',
      deadline: day(20),
    },
    assignees: ['Ada', 'Bob'],
    statusDate: STATUS_DATE,
  }

  const joined = (rows: readonly TooltipRow[]): string =>
    rows.map((one) => (one.kind === 'labeled' ? `${one.label} ${one.value}` : one.text)).join('\n')

  for (const language of LANGUAGES) {
    it(`rows: the name is whole, the note is a note, the rest carry a label and a value (${language})`, () => {
      const tip = tipOf(FULL, language)
      const rows = tip.rows
      expect(rows).toBeDefined()
      const list = rows ?? []
      expect(list[0]).toEqual({ kind: 'whole', text: 'a named task' })
      expect(list.filter((one) => one.kind === 'note')).toEqual([{ kind: 'note', text: 'a note' }])
      const labeled = list.filter((one): one is Extract<TooltipRow, { kind: 'labeled' }> => one.kind === 'labeled')
      expect(labeled.length, 'plan, actual, assignee, progress, deadline, late').toBe(6)
      for (const one of labeled) {
        expect(one.label.endsWith(':'), `the label is the word and the colon: ${one.label}`).toBe(true)
        expect(one.label.endsWith(' '), 'no trailing space in the label').toBe(false)
        expect(one.value.startsWith(' '), 'no leading space in the value').toBe(false)
      }
      const find = (label: string): string | undefined => labeled.find((one) => one.label === label)?.value
      expect(find(`${PROGRESS_WORD(language)}:`)).toBe(`50% (${STATE_WORD('DG-4', language)})`)
      expect(find(`${DEADLINE_WORD(language)}:`)).toBe(language === 'ja' ? '3/20 (金)' : '3/20 (Fri)')
      expect(find(`${STATE_WORD('DG-4', language)}:`)).toBe(`${lateDaysOf(FULL)} ${DAYS_UNIT(language)}`)
      expect(find(`${wordIn(WORDS.delayReportColumns, { rowId: 'DT-2' }, language)}:`)).toBe('Ada, Bob')
    })

    it(`rows: text is the rows joined, one line each, labelled ones as "word: value" (${language})`, () => {
      const tip = tipOf(FULL, language)
      expect(tip.text).toBe(joined(tip.rows ?? []))
      expect(tip.text.split('\n')).toContain(`${PROGRESS_WORD(language)}: 50% (${STATE_WORD('DG-4', language)})`)
    })
  }

  it('rows: the order is name, plan, actual, assignee, progress, note, deadline, late', () => {
    const rows = tipOf(FULL, 'en').rows ?? []
    expect(rows.map((one) => (one.kind === 'labeled' ? one.label : one.kind))).toEqual([
      'whole',
      'Plan:',
      'Actual:',
      'Assignee:',
      'Progress:',
      'note',
      'Deadline:',
      'Late:',
    ])
  })
})

describe('CR-793 TL-13 -- tooltipElement draws one box per line, the labels aligned', () => {
  const EN: Tooltip = {
    anchor: { kind: 'task', taskUid: THE_UID },
    text: 'a named task\nPlan: 3/1 (Sun) - 3/3 (Tue)\nAssignee: Ada\nProgress: 50% (In progress)\nshort note',
    rows: [
      { kind: 'whole', text: 'a named task' },
      { kind: 'labeled', label: 'Plan:', value: '3/1 (Sun) - 3/3 (Tue)' },
      { kind: 'labeled', label: 'Assignee:', value: 'Ada' },
      { kind: 'labeled', label: 'Progress:', value: '50% (In progress)' },
      { kind: 'note', text: 'short note' },
    ],
    assignment: null,
    at: { x: 200, y: 150 },
  }

  const drawn = (tip: Tooltip): FakeElement => {
    const built = stage()
    return tooltipElement(built.host, tip, () => undefined) as unknown as FakeElement
  }
  const cellWith = (root: FakeElement, text: string): FakeElement => {
    const found = selfAndDescendants(root).filter(
      (one) => one.children.length === 0 && (one.textContent ?? '').trim().startsWith(text),
    )
    expect(found.length, `exactly one cell starts with ${text}`).toBe(1)
    return found[0] as FakeElement
  }

  it('the labelled row holds a label box right-aligned and unwrapped, then the value', () => {
    const root = drawn(EN)
    const label = cellWith(root, 'Plan:')
    expect(styleMap(label).get('text-align')).toBe('right')
    expect(styleMap(label).get('white-space')).toBe('pre')
    expect((label.textContent ?? '').trim()).toBe('Plan:')
    const line = label.parentNode as FakeElement
    expect(line.textContent).toBe('Plan: 3/1 (Sun) - 3/3 (Tue)')
  })

  it('one child element per row, in order, the labelled line reading "<label> <value>" like the tip.text line', () => {
    const root = drawn(EN)
    const lines = root.children as FakeElement[]
    expect(lines).toHaveLength((EN.rows ?? []).length)
    expect(lines.map((one) => one.textContent)).toEqual(EN.text.split('\n'))
  })

  it('the name and the note lines keep their text whole, with no label box in them', () => {
    const lines = drawn(EN).children as FakeElement[]
    expect(lines[0]?.children).toHaveLength(0)
    expect(lines[4]?.children).toHaveLength(0)
  })

  it('after keepTooltipsInside every label box of one tip gets the width of the widest label, and stays right-aligned', () => {
    const built = stage()
    const root = tooltipElement(built.host, EN, () => undefined) as unknown as FakeElement
    const layer = built.host.createElement('div') as unknown as FakeElement
    layer.append(root)
    const widths: Record<string, number> = { 'Plan:': 40, 'Assignee:': 72, 'Progress:': 64 }
    const labels = ['Plan:', 'Assignee:', 'Progress:'].map((word) => cellWith(root, word))
    labels.forEach((label, at) => {
      const width = Object.values(widths)[at] as number
      ;(label as unknown as { getBoundingClientRect: () => unknown }).getBoundingClientRect = () => ({
        x: 0, y: 0, width, height: 10, top: 0, left: 0, right: width, bottom: 10,
      })
    })
    keepTooltipsInside(layer as unknown as HTMLElement)
    for (const label of labels) {
      expect(styleMap(label).get('width'), (label.textContent ?? '').trim()).toBe('72px')
      expect(styleMap(label).get('text-align')).toBe('right')
      expect(styleMap(label).get('white-space')).toBe('pre')
    }
  })

  it('the note line is clamped to S-621 em wide and S-622 lines, its line breaks kept', () => {
    const style = styleMap(cellWith(drawn(EN), 'short note'))
    expect(style.get('white-space')).toBe('pre-wrap')
    expect(style.get('max-width')).toBe(`${NOT_STORED_HELP_SIZES['S-621']}em`)
    expect(style.get('-webkit-line-clamp')).toBe(String(NOT_STORED_HELP_SIZES['S-622']))
  })

  it('a tip without rows still draws one element per text line (the old form)', () => {
    const plain: Tooltip = { anchor: { kind: 'task', taskUid: THE_UID }, text: 'one\ntwo', assignment: null, at: { x: 1, y: 1 } }
    const all = selfAndDescendants(drawn(plain))
    expect(all.some((one) => one.textContent === 'one')).toBe(true)
    expect(all.some((one) => one.textContent === 'two')).toBe(true)
  })
})
