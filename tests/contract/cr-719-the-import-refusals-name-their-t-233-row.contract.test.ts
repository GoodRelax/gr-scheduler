// CR-719 spec-only cases: an import refusal that table T-220 has no row for names the T-233 row whose source is the limit or FR-012 (FR-076, FR-023, AG-9a).

import { describe, expect, it } from 'vitest'

import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import { bare } from './spec-table'
import {
  BYTES_PER_MEGABYTE,
  chainOfDepth,
  goodTask,
  LIMITS,
  refusalsOf,
  REQUIREMENTS,
  rowOf,
  rulesOf,
  taskOf,
  verdictOf,
} from './cr-719-stage'
import { settingNumber } from '../fixtures/setting-number'

const FR_023_LIMITS_CARRY_THEIR_ROW =
  '資源の上限（ファイルサイズ・件数・WBS のネストの深さ・解釈しない要素のネストの深さ）を `_assets/tbl-settings.md` の表 T-211 に従って持ち、超えた入力は取り込まず、超えた上限に当たる 表 T-233 の行を通知の仕組みへ運ぶこと（MUST）'
const FR_023_NO_PARTIAL_APPLY = '部分的に適用してはならない（MUST NOT）'
const FR_076_UNOWNED_REFUSALS_CARRY_THE_OWNING_ROW =
  '⭐ 同表に行を持たない取り込みの拒否（資源の上限（`_assets/tbl-settings.md` の 表 T-211）と、`start` か `finish` を持たない `Task`（`FR-012`））は、上の例外に当たらない —— 本表のうち出典の欄がその上限か `FR-012` を名指す行を運ぶこと（MUST）'
const AG_9A_THE_REASON_IS_THE_T_233_ROW_ID =
  '⭐ 同表に行を持たない拒否（資源の上限と、`start` か `finish` を持たない `Task`）では、理由の区分は `FR-076` が運ばせる 表 T-233 の行の行 ID である'
const AG_9A_NO_COLLAPSE = '⛔ 理由の区分を 1 つの値へ潰してはならない（MUST NOT）'
const FR_076_NO_FALL_TO_A_T_233_ROW =
  '⛔ その通知を本表の行（`RS-15` を含む）へ振り替えてはならない（MUST NOT）'
const NT_6_SAYS_WHAT_CAN_BE_DONE = '続けられないことと、いま何ができるかを示すこと（MUST）'
const FR_012_NO_TASK_WITHOUT_AN_END =
  '⚠️ `start` または `finish` を持たない `Task` を、画面に出す `Task` として受け付けてはならない（MUST NOT）'
const FR_012_EX_5_IS_EXEMPT = '⚠️ 表 T-033 の `EX-5` が定める「中身のない行」は、この禁止の対象外とすること（MUST）。'

const NEVER_THE_KEY_OF_A_SETTING_OR_A_REQUIREMENT = ['S-113', 'S-114', 'S-115', 'FR-012', 'FR-023', 'RS-15'] as const

describe('FR-023 / FR-076 / AG-9a -- the clauses this file is driven by still stand', () => {
  it.each([
    FR_023_LIMITS_CARRY_THEIR_ROW,
    FR_023_NO_PARTIAL_APPLY,
    FR_076_UNOWNED_REFUSALS_CARRY_THE_OWNING_ROW,
    AG_9A_THE_REASON_IS_THE_T_233_ROW_ID,
    AG_9A_NO_COLLAPSE,
    FR_076_NO_FALL_TO_A_T_233_ROW,
    FR_012_NO_TASK_WITHOUT_AN_END,
    FR_012_EX_5_IS_EXEMPT,
  ])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it(`${NT_6_SAYS_WHAT_CAN_BE_DONE} -- the limit rows RS-78 to RS-80 are written against NT-6`, () => {
    expect(REQUIREMENTS).toContain(NT_6_SAYS_WHAT_CAN_BE_DONE)
    for (const row of ['RS-78', 'RS-79', 'RS-80']) expect(bare(rowOf('T-233', row).cells[1] ?? ''), row).toBe('NT-6')
  })

  it('table T-233 names the setting each limit row is sourced from, and FR-012 for RS-81', () => {
    expect(rowOf('T-233', 'RS-78').by['正']).toContain('S-113')
    expect(rowOf('T-233', 'RS-79').by['正']).toContain('S-114')
    expect(rowOf('T-233', 'RS-80').by['正']).toContain('S-115')
    expect((rowOf('T-233', 'RS-81').by['正'] ?? '').trim()).toBe('`FR-012`')
    expect(bare(rowOf('T-233', 'RS-81').cells[1] ?? '')).toBe('NT-1')
  })

  it('the published limits are the numbers table T-211 states', () => {
    expect(LIMITS).toEqual({ bytes: settingNumber('S-113'), items: settingNumber('S-114'), depth: settingNumber('S-115') })
    expect(SETTINGS_CONSTANTS['importMaxBytes']).toBe(LIMITS.bytes)
  })
})

describe(`RS-78 -- ${FR_023_LIMITS_CARRY_THEIR_ROW}: the file size`, () => {
  it('a file one byte over the limit is refused as RS-78 and as no setting or requirement', () => {
    const verdict = verdictOf([goodTask(1)], LIMITS.bytes * BYTES_PER_MEGABYTE + 1)
    expect(verdict.ok).toBe(false)
    const rules = rulesOf(verdict)
    expect(rules, JSON.stringify(rules)).toContain('RS-78')
    for (const key of NEVER_THE_KEY_OF_A_SETTING_OR_A_REQUIREMENT) expect(rules, `${key} is not a row of T-233`).not.toContain(key)
    expect(refusalsOf(verdict).find((one) => one.rule === 'RS-78')?.notice).toBe('NT-6')
  })

  it('a control: a file exactly at the limit is accepted', () => {
    expect(verdictOf([goodTask(1)], LIMITS.bytes * BYTES_PER_MEGABYTE)).toEqual({ ok: true })
  })

  it('a control: the unit is a megabyte of 1024 x 1024 bytes, so the limit in megabytes is not a byte count', () => {
    expect(verdictOf([goodTask(1)], LIMITS.bytes)).toEqual({ ok: true })
  })
})

describe(`RS-79 -- ${FR_023_NO_PARTIAL_APPLY}: the Task count`, () => {
  it('one Task over the limit is refused as RS-79 and as no setting or requirement', () => {
    const verdict = verdictOf(Array.from({ length: LIMITS.items + 1 }, (_, index) => goodTask(index + 1)))
    expect(verdict.ok).toBe(false)
    const rules = rulesOf(verdict)
    expect(rules, JSON.stringify(rules.slice(0, 5))).toContain('RS-79')
    for (const key of NEVER_THE_KEY_OF_A_SETTING_OR_A_REQUIREMENT) expect(rules, `${key} is not a row of T-233`).not.toContain(key)
    expect(refusalsOf(verdict).find((one) => one.rule === 'RS-79')?.notice).toBe('NT-6')
  })

  it('a control: exactly the limit is accepted', () => {
    expect(verdictOf(Array.from({ length: LIMITS.items }, (_, index) => goodTask(index + 1)))).toEqual({ ok: true })
  })
})

describe('RS-80 -- the WBS depth, the root counting as depth 1', () => {
  it('a chain one level deeper than the limit is refused as RS-80 and as no setting or requirement', () => {
    const verdict = verdictOf(chainOfDepth(LIMITS.depth + 1))
    expect(verdict.ok).toBe(false)
    const rules = rulesOf(verdict)
    expect(rules, JSON.stringify(rules)).toContain('RS-80')
    for (const key of NEVER_THE_KEY_OF_A_SETTING_OR_A_REQUIREMENT) expect(rules, `${key} is not a row of T-233`).not.toContain(key)
    expect(refusalsOf(verdict).find((one) => one.rule === 'RS-80')?.notice).toBe('NT-6')
  })

  it('a control: a chain exactly as deep as the limit is accepted', () => {
    expect(verdictOf(chainOfDepth(LIMITS.depth))).toEqual({ ok: true })
  })
})

describe(`RS-81 -- ${FR_012_NO_TASK_WITHOUT_AN_END}`, () => {
  it.each([
    ['no start', { finish: '2026-01-09' }],
    ['no finish', { start: '2026-01-05' }],
    ['neither', {}],
  ] as const)('a Task with %s is refused as RS-81 and as no requirement', (_name, part) => {
    const verdict = verdictOf([taskOf({ uid: 1, name: 't1', ...part })])
    expect(verdict.ok).toBe(false)
    const rules = rulesOf(verdict)
    expect(rules, JSON.stringify(rules)).toContain('RS-81')
    for (const key of NEVER_THE_KEY_OF_A_SETTING_OR_A_REQUIREMENT) expect(rules, `${key} is not a row of T-233`).not.toContain(key)
    expect(refusalsOf(verdict).find((one) => one.rule === 'RS-81')?.notice).toBe('NT-1')
  })

  it(`${FR_012_EX_5_IS_EXEMPT} -- an empty row of the file is not refused`, () => {
    const verdict = verdictOf([goodTask(1), taskOf({ uid: 2 })], 1024, [2])
    expect(rulesOf(verdict)).not.toContain('RS-81')
  })
})
