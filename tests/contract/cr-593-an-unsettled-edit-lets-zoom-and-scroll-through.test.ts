// CR-593 spec-only cases, use-case level: an unsettled edit lets only UN-8 writes through WS-2.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import type {
  ChangeStep,
  DocumentCommand,
  SettingsLimits,
  WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const WS_2_REFUSES = '**身振りの最中・編集入力の確定前・通知の配布中は拒否する**'
const WS_2_EXEMPT =
  '⚠️ 編集入力の確定前でも、`01-04-requirements.md` の 表 T-027 の `UN-8`（ズーム・スクロール・パン）だけから成る書き込みは拒否しない'
const WS_2_UNTOUCHED = '確定される欄の値にも取り消しの段にも触れず'
const AG_9_EDITING = '人が編集入力を確定していない間（プロパティパネルで入力中など）も同じく拒否すること（MUST）'
const CM_65_IS_UN_8 = '① 倍率を置く（表 T-108 の `CM-65`、表 T-027 の `UN-8` により段を積まない）'
const CM_71_IS_UN_8 = '① 倍率と表示位置を置く（表 T-108 の `CM-71`。表 T-027 の `UN-8` により段を積まない）'

describe('CR-593 -- the manuscript these cases are driven by', () => {
  it.each([WS_2_REFUSES, WS_2_EXEMPT, WS_2_UNTOUCHED])('table T-067 WS-2 still says it, word for word: %s', (clause) => {
    const row = specTable('T-067').rows.find((one) => one.id === 'WS-2')
    expect(unbroken(row?.cells.join('|') ?? '')).toContain(clause)
    expect(DESIGN).toContain(clause)
  })

  it.each([AG_9_EDITING, CM_65_IS_UN_8, CM_71_IS_UN_8])('01-04 still says it, word for word: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-027 UN-8 is outside the history and names zoom, scroll and pan; table T-233 RS-8 points at WS-2', () => {
    const un8 = specTable('T-027').rows.find((one) => one.id === 'UN-8')
    expect(un8?.cells.map(bare)).toEqual(['対象外', 'ズーム・スクロール・パン'])
    const rs8 = specTable('T-233').rows.find((one) => one.id === 'RS-8')
    expect(rs8?.cells[0]).toBe('その場の編集がまだ確定していない')
    expect(rs8?.cells.join('|')).toContain('`WS-2`')
  })
})

// see T-108
function kindOf(row: string): DocumentCommand['kind'] {
  const found = specTable('T-108').rows.find((one) => one.id === row)
  const name = bare(found?.by['確定名'] ?? '')
  if (name === '') throw new Error(`table T-108 has no ${row}`)
  return name as DocumentCommand['kind']
}

const BUILT_VERSION: string = (startupTemplate as { schemaVersion: string }).schemaVersion

function documentOf(): Document {
  const read = documentFromJson(JSON.stringify(startupTemplate), BUILT_VERSION)
  if (!read.ok) throw new Error(`the startup template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const DOCUMENT = documentOf()
const FIRST_TASK_GROUP = DOCUMENT.schedule.taskGroups[0]?.id ?? null

// see CM-65, UN-8
const ZOOM = { kind: kindOf('CM-65'), zoomX: 2, zoomY: 2 } as unknown as DocumentCommand
// see CM-66, UN-8
const SCROLL = {
  kind: kindOf('CM-66'),
  scrollDate: '2026-03-02',
  scrollGroupId: FIRST_TASK_GROUP,
  scrollDayOffset: 0,
  scrollGroupOffset: 0,
} as unknown as DocumentCommand
// see CM-71, UN-8
const FIT = {
  kind: kindOf('CM-71'),
  zoomX: 2,
  zoomY: 2,
  scrollDate: '2026-03-02',
  scrollGroupId: FIRST_TASK_GROUP,
  scrollDayOffset: 0,
  scrollGroupOffset: 0,
} as unknown as DocumentCommand

// WHY: not UN-8, each one a write a widened exemption might admit: the view group, UN-7, the document name.
const NOT_UN_8: readonly (readonly [string, DocumentCommand])[] = [
  // see UN-13
  ['CM-64 (UN-13, the view group)', { kind: kindOf('CM-64'), monochrome: true } as unknown as DocumentCommand],
  // see UN-7
  ['CM-58 (UN-7, also outside the history)', { kind: kindOf('CM-58'), element: 'baselineVisible', visible: true } as unknown as DocumentCommand],
  // see UN-13
  ['CM-1 (UN-13, the document name)', { kind: kindOf('CM-1'), title: 'CR-593 another title' } as unknown as DocumentCommand],
]

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }
const EDITING: WriteMoment = { ...CALM, editingInPlace: true }
const GESTURE: WriteMoment = { ...CALM, gestureInFlight: true }
const DELIVERING: WriteMoment = { ...CALM, deliveringNotices: true }

const planOf = (commands: readonly DocumentCommand[], moment: WriteMoment) =>
  planDocumentChange({
    defaultTaskGroupName: 'cr-593 default task group name',
    document: DOCUMENT,
    readStamp: DOCUMENT.documentStamp,
    commands,
    moment,
    history: EMPTY_HISTORY,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'cr-593-tester',
    updatedUtc: '2026-09-27T01:00:00Z',
  })

function passesAsWhenCalm(commands: readonly DocumentCommand[]): void {
  const calm = planOf(commands, CALM)
  if (!calm.ok) throw new Error(`premise: the batch is accepted when calm; refused ${JSON.stringify(calm.refusal)}`)
  expect(calm.document, 'premise: the batch moves the document').not.toBe(DOCUMENT)
  const held = planOf(commands, EDITING)
  expect(held.ok ? null : held.refusal, WS_2_EXEMPT).toBeNull()
  if (!held.ok) return
  expect(held.document.documentSettings, WS_2_EXEMPT).toEqual(calm.document.documentSettings)
  expect(held.document.schedule, WS_2_UNTOUCHED).toEqual(DOCUMENT.schedule)
  expect(held.history, WS_2_UNTOUCHED).toEqual(EMPTY_HISTORY)
}

const EDITING_REFUSAL = { ok: false, refusal: { step: 'WS-2', reason: 'editingInPlace' } }

describe(`T-067 WS-2 "${WS_2_EXEMPT}"`, () => {
  it('[setZoom] passes while an edit in place is unsettled', () => {
    passesAsWhenCalm([ZOOM])
  })

  it('[setScrollPosition] passes while an edit in place is unsettled', () => {
    passesAsWhenCalm([SCROLL])
  })

  it('[setZoom, setScrollPosition] passes: every command of the batch is UN-8', () => {
    passesAsWhenCalm([ZOOM, SCROLL])
  })

  it(`[fitScheduleToScreen] passes: "${CM_71_IS_UN_8}"`, () => {
    passesAsWhenCalm([FIT])
  })
})

describe(`T-067 WS-2 "${WS_2_REFUSES}" -- AG-9 "${AG_9_EDITING}" still holds for every other write (RS-8)`, () => {
  it.each(NOT_UN_8)('a single %s is refused with editingInPlace', (_name, command) => {
    const calm = planOf([command], CALM)
    expect(calm.ok, 'premise: the command is accepted when calm').toBe(true)
    expect(planOf([command], EDITING)).toEqual(EDITING_REFUSAL)
  })

  it.each(NOT_UN_8)('[setZoom, %s] is refused: one command outside UN-8 is enough', (_name, command) => {
    expect(planOf([ZOOM, command], CALM).ok, 'premise: the batch is accepted when calm').toBe(true)
    expect(planOf([ZOOM, command], EDITING)).toEqual(EDITING_REFUSAL)
    expect(planOf([command, ZOOM], EDITING), 'the order of the batch does not matter').toEqual(EDITING_REFUSAL)
    expect(planOf([ZOOM, SCROLL, command], EDITING)).toEqual(EDITING_REFUSAL)
  })

  // WHY: the seam keeps the empty batch as it was; an empty batch was refused while editing.
  it('an empty batch is refused while an edit in place is unsettled, as before CR-593', () => {
    expect(planOf([], EDITING)).toEqual(EDITING_REFUSAL)
  })
})

describe(`T-067 WS-2 "${WS_2_REFUSES}" -- the exemption belongs to the unsettled edit only`, () => {
  it.each([
    ['a gesture in flight (RS-7)', GESTURE, 'gestureInFlight'],
    ['notice delivery (RS-9)', DELIVERING, 'deliveringNotices'],
  ] as const)('%s still refuses [setZoom] and [setZoom, setScrollPosition]', (_name, moment, reason) => {
    expect(planOf([ZOOM], CALM).ok, 'premise').toBe(true)
    expect(planOf([ZOOM], moment)).toEqual({ ok: false, refusal: { step: 'WS-2', reason } })
    expect(planOf([ZOOM, SCROLL], moment)).toEqual({ ok: false, refusal: { step: 'WS-2', reason } })
  })

  // WHY: WS-2 does not say which reason wins when two moments hold at once, so only the refusal is read.
  it.each([
    ['a gesture in flight with an unsettled edit', { ...GESTURE, editingInPlace: true }],
    ['notice delivery with an unsettled edit', { ...DELIVERING, editingInPlace: true }],
  ] as const)('%s still refuses [setZoom]', (_name, moment) => {
    const plan = planOf([ZOOM], moment)
    expect(plan.ok).toBe(false)
    expect(plan.ok ? null : plan.refusal.step).toBe('WS-2')
  })
})
