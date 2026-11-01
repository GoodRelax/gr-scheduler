// CR-831 spec-only cases: every entry keeps a day outside T-214 (1984-01-01..2149-12-31) out of the document.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import {
  DATE_COLUMNS,
  dayOf,
  instantOf,
  scheduleViolations,
  textOfInstant,
} from '../../src/entity/document-model/schedule/schedule'
import { editDocument, type DocumentCommand, type EditResult } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import { validateImportedDocument, type ImportVerdict } from '../../src/use-case/validate-imported-document/validate-imported-document'
import { specTable } from '../contract/spec-table'
import {
  DESIGN,
  KNOWN_VERSION,
  REQUIREMENTS,
  S_482,
  S_483,
  april,
  asDocument,
  documentObject,
  mspdiTask,
  mspdiText,
  rowIdOf,
  taskRow,
  type DocumentParts,
} from './cr-646-stage'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, unknown>

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

const t214Row = (id: string): string => {
  const found = specTable('T-214').rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table T-214 has no row ${id}`)
  return found.cells.join(' | ')
}

const boundOf = (id: string): string => {
  const found = /\b\d{4}-\d{2}-\d{2}\b/.exec(t214Row(id))
  if (found === null) throw new Error(`table T-214 ${id} states no date`)
  return found[0]
}

const MIN_DAY = boundOf('S-119')
const MAX_DAY = boundOf('S-120')
const MIN_YEAR = Number(MIN_DAY.slice(0, 4))
const MAX_YEAR = Number(MAX_DAY.slice(0, 4))

const DAY_BEFORE_MIN = `${MIN_YEAR - 1}-12-31`
const DAY_AFTER_MAX = `${MAX_YEAR + 1}-01-01`
// WHY: a two-digit year padded to four digits names year 75, never 1975.
const PADDED_TWO_DIGIT_YEAR = '0075-03-03T08:00:00'

const S_119_EXPORT_NOTE =
  '⭐ 書き出しは範囲を確かめ直さない —— どの入口（画面の入力・ファイルを開く・`Agent API`）も範囲の外の日付を文書に入れないので、書き出す日付は範囲に収まっている'
const IV_14 = '日付と日時の列が、日時として読め（時刻は 1 分の単位）、受け入れる日付の範囲に収まること。'
const JUDGED_AFTER_EACH_OPERATION = '⭐ 本表の行は、操作が終わった文書について判ずること（MUST）'
const FR_023_RANGE = '受け入れる日付の範囲を表 T-214 に従って持つこと（MUST）。'

describe('CR-831 the manuscript as these cases read it', () => {
  it('T-214: S-119 importMinDate is 1984-01-01 and S-120 importMaxDate is 2149-12-31', () => {
    expect(t214Row('S-119')).toContain('`importMinDate`')
    expect(t214Row('S-120')).toContain('`importMaxDate`')
    expect([MIN_DAY, MAX_DAY]).toEqual(['1984-01-01', '2149-12-31'])
  })

  it('S-119: the range is MS Project\'s years, so the export need not check it again', () => {
    expect(t214Row('S-119')).toContain('Year object (Project)')
    expect(t214Row('S-119')).toContain(S_119_EXPORT_NOTE)
  })

  it('IV-14 (T-220), Chapter 6.1 and FR-023 still say what these cases drive', () => {
    expect(specTable('T-220').rows.find((one) => one.id === 'IV-14')?.cells.join(' ')).toContain(IV_14)
    expect(DESIGN).toContain(JUDGED_AFTER_EACH_OPERATION)
    expect(REQUIREMENTS).toContain(FR_023_RANGE)
  })

  it('DATE_COLUMNS (published Schedule) names the Task plan columns IV-14 covers', () => {
    expect(DATE_COLUMNS.Task).toEqual(expect.arrayContaining(['start', 'finish', 'deadline']))
    expect(DATE_COLUMNS.Project).toContain('statusDate')
  })
})

const SMALL = 1024

const verdictOf = (document: Document): ImportVerdict =>
  validateImportedDocument({ document, byteLength: SMALL, emptyRowTaskUids: [] })

const iv14Of = (verdict: ImportVerdict): readonly { at: string; what: string }[] =>
  verdict.ok ? [] : verdict.refusals.filter((one) => one.rule === 'IV-14')

const jsonText = (parts: DocumentParts): string =>
  JSON.stringify({ $schema: TEMPLATE['$schema'], ...documentObject(parts) })

const openedJson = (parts: DocumentParts): Document => {
  const read = documentFromJson(jsonText(parts), KNOWN_VERSION)
  if (!read.ok) throw new Error(`premise: the GRS JSON codec refused: ${JSON.stringify(read.faults).slice(0, 400)}`)
  return read.document
}

const oneTask = (start: string, finish: string): DocumentParts => ({ tasks: [taskRow(1, { start, finish })] })

describe('FR-023 / IV-14: a GRS JSON is opened only with Task dates inside T-214', () => {
  it(`a Task start on ${DAY_BEFORE_MIN} is refused under IV-14, naming the start column`, () => {
    const verdict = verdictOf(openedJson(oneTask(`${DAY_BEFORE_MIN}T${S_482}`, april(10, S_483))))
    expect(verdict.ok).toBe(false)
    const named = iv14Of(verdict)
    expect(named.length, JSON.stringify(verdict)).toBeGreaterThan(0)
    expect(named.some((one) => `${one.at} ${one.what}`.includes('start')), JSON.stringify(named)).toBe(true)
  })

  it(`a Task finish on ${DAY_AFTER_MAX} is refused under IV-14, naming the finish column`, () => {
    const verdict = verdictOf(openedJson(oneTask(april(6, S_482), `${DAY_AFTER_MAX}T${S_483}`)))
    expect(verdict.ok).toBe(false)
    const named = iv14Of(verdict)
    expect(named.length, JSON.stringify(verdict)).toBeGreaterThan(0)
    expect(named.some((one) => `${one.at} ${one.what}`.includes('finish')), JSON.stringify(named)).toBe(true)
  })

  it(`a Task from ${MIN_DAY} to ${MAX_DAY} is accepted`, () => {
    expect(verdictOf(openedJson(oneTask(`${MIN_DAY}T${S_482}`, `${MAX_DAY}T${S_483}`)))).toEqual({ ok: true })
  })

  it(`a Task on ${MIN_DAY} alone and one on ${MAX_DAY} alone are each accepted`, () => {
    expect(verdictOf(openedJson(oneTask(`${MIN_DAY}T${S_482}`, `${MIN_DAY}T${S_483}`)))).toEqual({ ok: true })
    expect(verdictOf(openedJson(oneTask(`${MAX_DAY}T${S_482}`, `${MAX_DAY}T${S_483}`)))).toEqual({ ok: true })
  })

  it(`FR-054: a start written ${PADDED_TWO_DIGIT_YEAR} is year 75, so it is refused under IV-14 (not read as 1975)`, () => {
    const verdict = verdictOf(openedJson(oneTask(PADDED_TWO_DIGIT_YEAR, april(10, S_483))))
    expect(verdict.ok).toBe(false)
    expect(iv14Of(verdict).some((one) => `${one.at} ${one.what}`.includes('start')), JSON.stringify(verdict)).toBe(true)
  })
})

type MspdiOutcome = { readonly stage: 'codec'; readonly faults: string } | { readonly stage: 'validation'; readonly verdict: ImportVerdict }

const openedMspdi = (start: string, finish: string): MspdiOutcome => {
  const read = documentFromMspdi(mspdiText({ tasks: mspdiTask(1, start, finish) }), asDocument())
  if (!read.ok) return { stage: 'codec', faults: JSON.stringify(read.faults) }
  return { stage: 'validation', verdict: verdictOf(read.document) }
}

// WHY: the spec does not pin which MSPDI stage refuses (codec or the shared validation); FR-023 forbids only
// a silent intake, so a codec refusal or an IV-14 refusal naming the column both pass.
const expectMspdiRefused = (outcome: MspdiOutcome, column: string): void => {
  if (outcome.stage === 'codec') {
    expect(outcome.faults.length).toBeGreaterThan(2)
    return
  }
  expect(outcome.verdict.ok, JSON.stringify(outcome)).toBe(false)
  const named = iv14Of(outcome.verdict)
  expect(named.length, JSON.stringify(outcome.verdict)).toBeGreaterThan(0)
  expect(named.some((one) => `${one.at} ${one.what}`.toLowerCase().includes(column)), JSON.stringify(named)).toBe(true)
}

describe('FR-023 / IV-14: an MSPDI is opened only with Task dates inside T-214', () => {
  it(`a Start on ${DAY_BEFORE_MIN} is refused`, () => {
    expectMspdiRefused(openedMspdi(`${DAY_BEFORE_MIN}T08:00:00`, '2026-04-10T17:00:00'), 'start')
  })

  it(`a Finish on ${DAY_AFTER_MAX} is refused`, () => {
    expectMspdiRefused(openedMspdi('2026-04-06T08:00:00', `${DAY_AFTER_MAX}T17:00:00`), 'finish')
  })

  it(`a Start of ${PADDED_TWO_DIGIT_YEAR} is refused (year 75, not 1975)`, () => {
    expectMspdiRefused(openedMspdi(PADDED_TWO_DIGIT_YEAR, '2026-04-10T17:00:00'), 'start')
  })

  it(`a Task from ${MIN_DAY} to ${MAX_DAY} is opened and accepted`, () => {
    const outcome = openedMspdi(`${MIN_DAY}T08:00:00`, `${MAX_DAY}T17:00:00`)
    expect(outcome.stage, JSON.stringify(outcome).slice(0, 400)).toBe('validation')
    if (outcome.stage === 'validation') expect(outcome.verdict).toEqual({ ok: true })
  })
})

const COMMENT_BOX_ID = '83100000-0000-4000-8000-000000000001'
const HIGHLIGHT_BOX_ID = '83100000-0000-4000-8000-000000000002'

const base = (): Document => asDocument({ tasks: [taskRow(1), taskRow(2)] })

const run = (command: DocumentCommand): EditResult => editDocument(base(), command, LIMITS, 'Task group')

const iv14RowsAfter = (document: Document): readonly string[] =>
  scheduleViolations(document.schedule, document.documentSettings as DocumentSettings)
    .filter((one) => one.row === 'IV-14')
    .map((one) => `${one.at}: ${one.what}`)

interface CommandCase {
  readonly name: string
  readonly at: (dateTime: string) => DocumentCommand
}

const CASES: readonly CommandCase[] = [
  { name: 'setStatusDate', at: (when) => ({ kind: 'setStatusDate', statusDate: when }) },
  {
    name: 'createCommentBox (anchor.date)',
    at: (when) => ({ kind: 'createCommentBox', commentBoxId: COMMENT_BOX_ID, anchor: { date: when, taskGroupId: rowIdOf(0) } }),
  },
  {
    name: 'createHighlightBox (range.start)',
    at: (when) => ({
      kind: 'createHighlightBox',
      highlightBoxId: HIGHLIGHT_BOX_ID,
      range: { start: when, finish: april(20, '00:00:00'), topTaskGroupId: rowIdOf(0), bottomTaskGroupId: rowIdOf(1) },
    }),
  },
  {
    name: 'createHighlightBox (range.finish)',
    at: (when) => ({
      kind: 'createHighlightBox',
      highlightBoxId: HIGHLIGHT_BOX_ID,
      range: { start: april(1, '00:00:00'), finish: when, topTaskGroupId: rowIdOf(0), bottomTaskGroupId: rowIdOf(1) },
    }),
  },
  { name: 'setTaskPlanDates (start)', at: (when) => ({ kind: 'setTaskPlanDates', taskUid: 1, start: when, finish: april(10, S_483) }) },
  { name: 'setTaskPlanDates (finish)', at: (when) => ({ kind: 'setTaskPlanDates', taskUid: 1, start: april(6, S_482), finish: when }) },
  { name: 'setTaskDeadline', at: (when) => ({ kind: 'setTaskDeadline', taskUid: 1, deadline: when }) },
]

// WHY: the plan-date cases need finish >= start (IV-10), so each case writes only the side it names;
// a start on the last day or a finish on the first would break IV-10 for a reason that is not IV-14.
const ACCEPTED: Readonly<Record<string, readonly string[]>> = {
  'setTaskPlanDates (start)': [`${MIN_DAY}T${S_482}`],
  'setTaskPlanDates (finish)': [`${MAX_DAY}T${S_483}`],
  'createHighlightBox (range.start)': [`${MIN_DAY}T00:00:00`],
  'createHighlightBox (range.finish)': [`${MAX_DAY}T23:59:00`],
}
const acceptedOf = (name: string): readonly string[] => ACCEPTED[name] ?? [`${MIN_DAY}T00:00:00`, `${MAX_DAY}T23:59:00`]

// WHY: likewise a refused day that is not IV-14's subject would pass for the wrong reason, so the
// "after" day goes to the finish side and the "before" day to the start side of a two-sided command.
const REFUSED: Readonly<Record<string, readonly string[]>> = {
  'setTaskPlanDates (start)': [`${DAY_BEFORE_MIN}T${S_482}`, PADDED_TWO_DIGIT_YEAR],
  'setTaskPlanDates (finish)': [`${DAY_AFTER_MAX}T${S_483}`],
  'createHighlightBox (range.start)': [`${DAY_BEFORE_MIN}T00:00:00`, PADDED_TWO_DIGIT_YEAR],
  'createHighlightBox (range.finish)': [`${DAY_AFTER_MAX}T00:00:00`],
}
const refusedOf = (name: string): readonly string[] =>
  REFUSED[name] ?? [`${DAY_BEFORE_MIN}T00:00:00`, `${DAY_AFTER_MAX}T00:00:00`, PADDED_TWO_DIGIT_YEAR]

describe('IV-14 / Chapter 6.1 / FR-023 (Agent API): a document command cannot put a day outside T-214 in', () => {
  for (const one of CASES) {
    it.each(refusedOf(one.name))(`${one.name} refuses %s under IV-14 (AG-9a: the T-220 row)`, (when) => {
      const result = run(one.at(when))
      expect(result.ok, JSON.stringify(result).slice(0, 400)).toBe(false)
      if (!result.ok) expect(result.refusals.map((refusal) => refusal.rule)).toContain('IV-14')
    })

    it.each(acceptedOf(one.name))(`${one.name} accepts %s and leaves no IV-14 row`, (when) => {
      const result = run(one.at(when))
      expect(result.ok, JSON.stringify(result).slice(0, 400)).toBe(true)
      if (result.ok) expect(iv14RowsAfter(result.document)).toEqual([])
    })
  }

  it('a control: the base document breaks no IV-14 row', () => {
    expect(iv14RowsAfter(base())).toEqual([])
  })
})

describe('FR-054: a typed date keeps its year as written', () => {
  it('instantOf("0075-03-03T10:00") turned back by textOfInstant is 0075-03-03T10:00:00', () => {
    const instant = instantOf('0075-03-03T10:00')
    expect(instant).not.toBeNull()
    expect(textOfInstant(instant as number)).toBe('0075-03-03T10:00:00')
  })

  it('dayOf("0075-03-03") is year 75, not 1975', () => {
    expect(dayOf('0075-03-03')).toEqual({ year: 75, month: 3, day: 3 })
  })

  it('dayOf("0004-02-29") is a day (year 4 is a proleptic Gregorian leap year)', () => {
    expect(dayOf('0004-02-29')).toEqual({ year: 4, month: 2, day: 29 })
  })

  it('dayOf("0100-02-29") is null (year 100 is not a leap year)', () => {
    expect(dayOf('0100-02-29')).toBeNull()
  })

  it(`the two boundary days read as themselves: ${MIN_DAY} and ${MAX_DAY}`, () => {
    expect(textOfInstant(instantOf(`${MIN_DAY}T00:00`) as number)).toBe(`${MIN_DAY}T00:00:00`)
    expect(textOfInstant(instantOf(`${MAX_DAY}T23:59`) as number)).toBe(`${MAX_DAY}T23:59:00`)
  })
})

const A_MOMENT = '2026-10-24T09:00:00'
const DATE_TIME_TEXT = /(-?\d{4,})-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/g

describe('S-119 note / EX: an MSPDI written from a document at the boundary days carries no year outside T-214', () => {
  const document = asDocument({
    tasks: [
      taskRow(1, { start: `${MIN_DAY}T${S_482}`, finish: `${MAX_DAY}T${S_483}`, deadline: `${MAX_DAY}T${S_483}` }),
      taskRow(2, { start: `${MIN_DAY}T${S_482}`, finish: `${MIN_DAY}T${S_483}` }),
      taskRow(3, { start: `${MAX_DAY}T${S_482}`, finish: `${MAX_DAY}T${S_483}`, milestone: false }),
    ],
    project: { statusDate: `${MAX_DAY}T00:00:00`, creationDate: `${MIN_DAY}T00:00:00` },
  })

  it('premise: the document breaks no IV-14 row', () => {
    expect(iv14RowsAfter(document)).toEqual([])
  })

  it('every xsd:dateTime-looking text in the written MSPDI has a year in 1984..2149', () => {
    const text = mspdiFromDocument(document, A_MOMENT).text
    const years = [...text.matchAll(DATE_TIME_TEXT)].map((one) => Number(one[1]))
    expect(years.length, 'premise: the export wrote dates').toBeGreaterThan(0)
    const outside = [...text.matchAll(DATE_TIME_TEXT)].map((one) => one[0]).filter((one) => {
      const year = Number(/^-?\d+/.exec(one)?.[0])
      return year < MIN_YEAR || year > MAX_YEAR
    })
    expect(outside).toEqual([])
  })

  it('the boundary days themselves are written', () => {
    const text = mspdiFromDocument(document, A_MOMENT).text
    expect(text).toContain(`${MIN_DAY}T`)
    expect(text).toContain(`${MAX_DAY}T`)
  })
})
