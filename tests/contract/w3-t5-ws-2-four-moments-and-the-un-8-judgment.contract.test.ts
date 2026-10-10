// W3 spec-only tester 5: table T-067 WS-2 -- the four moments the caller hands in, and the UN-8 judgment only WS-2 makes.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { emptyHistory } from '../../src/entity/document-model/edit-history/edit-history'
import {
  applyDocumentChange,
  type ApplyOutcome,
  type ChangeStep,
  type DocumentCommand,
  type HeldDocument,
  type SettingsLimits,
  type WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import { bare, specTable, unbroken } from './spec-table'

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

// see WS-2
const WS_2_FOUR_MOMENTS =
  ' 4 つの真偽 —— 身振りの最中・編集入力の確定前・確認の問いが立っている・通知の配布中 —— で見ること（MUST）'
const WS_2_FIRST_IN_ORDER = '拒否の理由は、この順で最初に当たったものとし、`01-04-requirements.md` の 表 T-233 の `RS-7`・`RS-8`・`RS-74`・`RS-9` とする'
const WS_2_ONLY_THIS_ROW_JUDGES =
  '`UN-8` だけから成るかの判じは本行だけが持ち、呼び手が前もって判じて書き込みを止めてはならない（MUST NOT）'
const WS_2_UN_8_DURING_A_QUESTION = '上の `UN-8` だけから成る書き込みは、問いが立っている間も拒否しない'

// WHY: the moment's member names are the public type WriteMoment (PI-8); the order and the words are WS-2's and table T-233's.
const ORDER: readonly { readonly key: keyof WriteMoment; readonly rs: string; readonly word: string }[] = [
  { key: 'gestureInFlight', rs: 'RS-7', word: '身振りの最中' },
  { key: 'editingInPlace', rs: 'RS-8', word: '確定していない' },
  { key: 'questionAsked', rs: 'RS-74', word: '確認の問い' },
  { key: 'deliveringNotices', rs: 'RS-9', word: '通知を配っている' },
]

// see T-108
function kindOf(row: string): string {
  const found = specTable('T-108').rows.find((one) => one.id === row)
  const name = bare(found?.by['確定名'] ?? '')
  if (name === '') throw new Error(`table T-108 has no ${row}`)
  return name
}

const BUILT_VERSION: string = (startupTemplate as { schemaVersion: string }).schemaVersion

/** @purity pure */
function templateDocument(): Document {
  const read = documentFromJson(JSON.stringify(startupTemplate), BUILT_VERSION)
  if (!read.ok) throw new Error(`the startup template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const START = templateDocument()
const FIRST_TASK_UID = START.schedule.tasks[0]?.uid ?? 0

// see CM-65, UN-8
const ZOOM = { kind: kindOf('CM-65'), zoomX: 2, zoomY: 2 } as unknown as DocumentCommand
// see CM-9, UN-13
const RENAME = { kind: kindOf('CM-9'), uid: FIRST_TASK_UID, name: 'w3-t5 renamed' } as unknown as DocumentCommand

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }

/** @purity non-pure */
function write(commands: readonly DocumentCommand[], moment: WriteMoment): ApplyOutcome {
  let held: HeldDocument = { document: START, history: emptyHistory<ChangeStep>() }
  return applyDocumentChange(
    {
      defaultTaskGroupName: 'w3-t5 default task group name',
      readStamp: START.documentStamp,
      commands,
      moment,
      historyLimits: HISTORY_LIMITS,
      settingsLimits: LIMITS,
      editedBy: 'w3-t5',
      updatedUtc: '2026-10-07T00:00:00Z',
    },
    {
      read: () => held,
      replace: (next) => {
        held = next
      },
    },
    { deliver: () => {} },
  )
}

/** @purity pure */
function refusalOf(outcome: ApplyOutcome): unknown {
  return outcome.accepted ? null : outcome.refusal
}

/** @purity pure */
function everyMoment(): readonly WriteMoment[] {
  const all: WriteMoment[] = []
  for (let bits = 0; bits < 16; bits += 1) {
    all.push({
      gestureInFlight: (bits & 1) !== 0,
      editingInPlace: (bits & 2) !== 0,
      questionAsked: (bits & 4) !== 0,
      deliveringNotices: (bits & 8) !== 0,
    })
  }
  return all
}

/** @purity pure */
function describeMoment(moment: WriteMoment): string {
  const on = ORDER.filter((one) => moment[one.key]).map((one) => one.key)
  return on.length === 0 ? 'nothing standing' : on.join(' + ')
}

describe('W3-T5 -- the manuscript these cases are driven by', () => {
  it.each([WS_2_FOUR_MOMENTS, WS_2_FIRST_IN_ORDER, WS_2_ONLY_THIS_ROW_JUDGES, WS_2_UN_8_DURING_A_QUESTION])(
    '05-07 table T-067 WS-2 still says: %s',
    (clause) => {
      expect(DESIGN).toContain(clause)
    },
  )

  it.each(ORDER)('table T-233 $rs is the reason for $key: its first cell names it', ({ rs, word }) => {
    const row = specTable('T-233').rows.find((one) => one.id === rs)
    expect(row?.cells[0] ?? '').toContain(word)
    expect(row?.cells.join('|') ?? '').toContain('`WS-2`')
  })
})

describe(`T-067 WS-2 "${WS_2_FOUR_MOMENTS}"`, () => {
  it.each(everyMoment().map((moment) => [describeMoment(moment), moment] as const))(
    'a write outside UN-8 with %s: refused for the first moment in the order, accepted when none stands',
    (_name, moment) => {
      const first = ORDER.find((one) => moment[one.key])
      const outcome = write([RENAME], moment)
      if (first === undefined) {
        expect(refusalOf(outcome), WS_2_FOUR_MOMENTS).toBeNull()
        return
      }
      expect(refusalOf(outcome), `${WS_2_FIRST_IN_ORDER} (${first.rs})`).toEqual({ step: 'WS-2', reason: first.key })
    },
  )
})

describe(`T-067 WS-2 "${WS_2_ONLY_THIS_ROW_JUDGES}"`, () => {
  // WHY: the caller hands the raw moments in; WS-2 alone lets an UN-8-only batch through an unsettled edit or a question.
  it.each([
    ['an unsettled edit', { ...CALM, editingInPlace: true }],
    ['a standing question', { ...CALM, questionAsked: true }],
    ['an unsettled edit and a standing question', { ...CALM, editingInPlace: true, questionAsked: true }],
  ] as const)('[setZoom] handed in with %s is accepted by WS-2 itself', (_name, moment) => {
    const outcome = write([ZOOM], moment)
    expect(refusalOf(outcome), `${WS_2_ONLY_THIS_ROW_JUDGES} / ${WS_2_UN_8_DURING_A_QUESTION}`).toBeNull()
  })

  it('[setZoom, setTaskName] with a standing question is refused for the question (RS-74)', () => {
    expect(refusalOf(write([ZOOM, RENAME], { ...CALM, questionAsked: true }))).toEqual({ step: 'WS-2', reason: 'questionAsked' })
  })

  it('[setZoom] with a gesture in flight or notice delivery is still refused: the exemption is not theirs', () => {
    expect(refusalOf(write([ZOOM], { ...CALM, gestureInFlight: true }))).toEqual({ step: 'WS-2', reason: 'gestureInFlight' })
    expect(refusalOf(write([ZOOM], { ...CALM, deliveringNotices: true }))).toEqual({ step: 'WS-2', reason: 'deliveringNotices' })
  })
})
