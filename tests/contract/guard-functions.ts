// Test-side bodies of the named functions of guardLanguage (state-machines.json), written from the specification.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type GuardFunction = (...args: readonly unknown[]) => unknown

const ROSTER = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'notice-reasons.json'), 'utf8')) as {
    readonly reasons: readonly { readonly id: string; readonly display: string; readonly wordsOf?: string }[]
  }
).reasons

// see FR-076, NT-2, T-233
export function noticeDisplay(reason: unknown): string | null {
  return ROSTER.find((row) => row.id === reason)?.display ?? null
}

// see NT-3, T-233
export function wordsRow(reason: unknown): unknown {
  return ROSTER.find((row) => row.id === reason)?.wordsOf ?? reason
}

// see NT-8, NT-2
export function reasonsOf(standing: unknown): readonly unknown[] {
  if (standing === null) return []
  if (!Array.isArray(standing)) throw new Error(`reasonsOf: ${JSON.stringify(standing)} is not a list of notices`)
  return standing.map((card: unknown) => {
    const reason = (card as Record<string, unknown> | null)?.['reason']
    if (reason === undefined) throw new Error(`reasonsOf: a standing notice without a reason: ${JSON.stringify(card)}`)
    return reason
  })
}

// see NT-3
export function wordsRowsOf(standing: unknown): readonly unknown[] {
  return reasonsOf(standing).map(wordsRow)
}

const MINUTES_PER_DAY = 1440
const MINUTES_PER_HOUR = 60
const TIME_OF_DAY = /^(\d{1,2}):(\d{2})$/

function minutesOf(text: unknown, isEnd: boolean): number | null {
  const m = typeof text === 'string' ? TIME_OF_DAY.exec(text) : null
  if (m === null) return null
  const minutes = Number(m[1]) * MINUTES_PER_HOUR + Number(m[2])
  if (Number(m[2]) >= MINUTES_PER_HOUR || minutes > MINUTES_PER_DAY) return null
  return isEnd && minutes === 0 ? MINUTES_PER_DAY : minutes
}

// see WC-10, WC-8, IV-24, IV-17
// WHY: the time ranges and the weekdays of WC-10 are read here; an exception-day draft is refused
// loudly rather than half-read, so a scene must keep its exceptions empty.
export function calendarDraftRefusals(draft: unknown): readonly string[] {
  if (draft === null) return []
  const d = draft as { workingDayTypes?: readonly unknown[]; ranges?: readonly { start: unknown; end: unknown }[]; exceptions?: readonly unknown[] }
  if (d.workingDayTypes === undefined || d.ranges === undefined || d.exceptions === undefined) {
    throw new Error(`calendarDraftRefusals: a draft this test cannot read: ${JSON.stringify(draft)}`)
  }
  if (d.exceptions.length > 0) throw new Error('calendarDraftRefusals: exception days are outside what this test reads of WC-10')
  const refusals: string[] = []
  const spans: { start: number; end: number }[] = []
  for (const range of d.ranges) {
    const start = minutesOf(range.start, false)
    const end = minutesOf(range.end, true)
    if (start === null || end === null) {
      refusals.push('timeNotReadable')
      continue
    }
    if (start >= end) refusals.push('startNotBeforeEnd')
    else spans.push({ start, end })
  }
  for (const [i, a] of spans.entries()) {
    if (spans.slice(i + 1).some((b) => a.start < b.end && b.start < a.end)) refusals.push('rangesOverlap')
  }
  if (d.workingDayTypes.length === 0) refusals.push('noWorkingWeekday')
  return refusals
}

export type TreeRow = { readonly id: string; readonly parentId: string | null }

// see HR-3, HR-1a, SJ-2, HR-7, TD-6, S-418
export function treeFunctions(
  rows: readonly TreeRow[],
  settings: Readonly<Record<string, unknown>>,
): Readonly<Record<string, GuardFunction>> {
  return {
    ancestors: (id: unknown): readonly string[] => {
      const out: string[] = []
      let at = rows.find((r) => r.id === id)?.parentId ?? null
      while (at !== null) {
        out.push(at)
        const parentId: string | null = rows.find((r) => r.id === at)?.parentId ?? null
        at = parentId
      }
      return out
    },
    childTaskGroups: (id: unknown): readonly TreeRow[] => rows.filter((r) => r.parentId === id),
    setting: (row: unknown): unknown => {
      if (typeof row !== 'string' || !(row in settings)) throw new Error(`setting: no value given for ${String(row)}`)
      return settings[row]
    },
  }
}

export const GUARD_FUNCTIONS: Readonly<Record<string, GuardFunction>> = {
  noticeDisplay,
  wordsRow,
  reasonsOf,
  wordsRowsOf,
  calendarDraftRefusals,
}
