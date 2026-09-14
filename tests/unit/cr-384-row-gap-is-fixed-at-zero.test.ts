// CR-384: rowGap (S-12) is fixed at 0; a stored non-zero value reads as 0 and RS-51 does not count it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { bare, specTable } from '../contract/spec-table'

const ROOT = process.cwd()

const TEMPLATE = JSON.parse(
  readFileSync(join(ROOT, 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const numberOf = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell))
  if (found === null) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return Number(found[0])
}

const S12 = rowOf('T-201', 'S-12')
const S12_DEFAULT = numberOf(S12.by['既定値'] ?? '')
const S12_FLOOR = numberOf(S12.by['下限'] ?? '')
const S12_CEILING = numberOf(S12.by['上限'] ?? '')

const S124 = rowOf('T-212', 'S-124')
const S124_FLOOR = numberOf(S124.by['下限'] ?? '')
const S124_CEILING = numberOf(S124.by['上限'] ?? '')

const documentTextWith = (settings: Record<string, unknown>): string => {
  const template = structuredClone(TEMPLATE)
  const body = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 500, statusDate: null },
      calendars: template.schedule.calendars,
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
    },
    documentSettings: { ...template.documentSettings, ...settings },
    documentStamp: template.documentStamp,
    changeLog: [],
  }
  return JSON.stringify(body)
}

const decode = (settings: Record<string, unknown>) => {
  const read = documentFromJson(documentTextWith(settings))
  if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults)}`)
  return read
}

describe('the specification still fixes S-12 at 0 and excludes it from RS-51', () => {
  it('T-201 S-12 (rowGap) still has its default, floor and ceiling all at 0', () => {
    expect(S12_DEFAULT, '表 T-201 の S-12 の既定値').toBe(0)
    expect(S12_FLOOR, '表 T-201 の S-12 の下限').toBe(0)
    expect(S12_CEILING, '表 T-201 の S-12 の上限').toBe(0)
  })

  it('T-201 S-12 still says a stored non-zero value is read as 0, silently', () => {
    const reason = S12.by['範囲の理由'] ?? ''
    expect(reason).toContain('固定')
    expect(reason).toContain('行の帯と帯のあいだに隙間を置かない')
    expect(reason).toContain(
      '読み込んだ文書が 0 以外を持つときは、黙って 0 として読む',
    )
    expect(reason).toContain('表 T-233 の `RS-51` で告げない')
  })

  it('T-233 RS-51 still excludes S-12 (rowGap) from its own count (MUST)', () => {
    const rs51 = rowOf('T-233', 'RS-51')
    const scene = rs51.by['場面'] ?? ''
    expect(scene).toContain(
      '`_assets/tbl-settings.md` の 表 T-201 の `S-12`（`rowGap`）は本行の対象に数えないこと（MUST）',
    )
    expect(scene).toContain('件数にも入れない')
  })

  it('T-212 S-124, the contrast row, still keeps a real floor and ceiling apart', () => {
    expect(S124_CEILING, 'S-124 must keep a real span for the contrast below to be genuine').toBeGreaterThan(S124_FLOOR)
  })
})

describe('CR-384 -- a document with rowGap 8 reads rowGap 0, and RS-51 does not count it', () => {
  it('reads rowGap as 0, not 8, and the clamp is not counted', () => {
    const read = decode({ rowGap: 8 })
    expect(read.document.documentSettings.rowGap, 'S-12 was not silently fixed at 0').toBe(0)
    expect(read.clampedCount, 'RS-51 was told about S-12, which it must not count').toBe(0)
  })

  it('reads rowGap as 0 from any other out-of-bounds value too, not only 8', () => {
    const read = decode({ rowGap: 56 })
    expect(read.document.documentSettings.rowGap, 'S-12 is fixed at 0 for every out-of-bounds value, not only 8').toBe(0)
    expect(read.clampedCount).toBe(0)
  })

  it('reads rowGap already at 0 as 0, uncounted, same as any in-range value', () => {
    const read = decode({ rowGap: 0 })
    expect(read.document.documentSettings.rowGap).toBe(0)
    expect(read.clampedCount).toBe(0)
  })
})

describe('CR-384 -- a genuinely out-of-range setting still counts toward RS-51, unlike S-12', () => {
  it('clamps an out-of-range S-124 to its ceiling and counts it', () => {
    const read = decode({ iconHintDelayMs: S124_CEILING + 1000 })
    expect(read.document.documentSettings.iconHintDelayMs).toBe(S124_CEILING)
    expect(read.clampedCount, 'a real out-of-range setting must still be counted').toBe(1)
  })

  it('clamps an out-of-range S-124 to its floor and counts it', () => {
    const read = decode({ iconHintDelayMs: S124_FLOOR - 100 })
    expect(read.document.documentSettings.iconHintDelayMs).toBe(S124_FLOOR)
    expect(read.clampedCount).toBe(1)
  })

  it('together with an out-of-range rowGap, counts only S-124 -- S-12 stays out', () => {
    const read = decode({ rowGap: 8, iconHintDelayMs: S124_CEILING + 1000 })
    expect(read.document.documentSettings.rowGap, 'S-12 was not fixed at 0 alongside another clamp').toBe(0)
    expect(read.document.documentSettings.iconHintDelayMs).toBe(S124_CEILING)
    expect(read.clampedCount, 'RS-51 counted S-12 alongside the real clamp, not only S-124').toBe(1)
  })
})
