// DFC-357 / FR-073 fix-confirmation anchor: a newer document is opened, not refused.

import { describe, expect, it } from 'vitest'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'

// WHY: read off the bundled startup template rather than typed here, so
// moving the manuscript's version moves these cases with it.
const GREATEST_KNOWN: string = (startupTemplate as { schemaVersion: string }).schemaVersion

const COLUMN_FROM_THE_FUTURE = 'aColumnNoBuildOfThisToolCanRead'

// WHY: built from GREATEST_KNOWN by FR-073's string-comparison rule, rather
// than a literal, so it stays newer however far the version moves.
const NEWER_THAN_KNOWN = `9${GREATEST_KNOWN.slice(1)}`

function templateCopy(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(startupTemplate)) as Record<string, unknown>
}

function handed(version: string): string {
  const root = templateCopy()
  root['schemaVersion'] = version
  const schedule = root['schedule'] as { tasks: Record<string, unknown>[] }
  const first = schedule.tasks[0]
  if (first === undefined) throw new Error('the startup template holds no task to plant on')
  first[COLUMN_FROM_THE_FUTURE] = 'carried, not dropped'
  return JSON.stringify(root)
}

describe('DFC-357 / FR-073 -- a version newer than this build is opened, not refused', () => {
  it('sanity: the fixture is newer than the version this build knows', () => {
    expect(NEWER_THAN_KNOWN > GREATEST_KNOWN).toBe(true)
  })

  it('opens it (MUST), and does not refuse it (MUST NOT)', () => {
    const read = documentFromJson(handed(NEWER_THAN_KNOWN), GREATEST_KNOWN)
    expect(read.ok, read.ok ? '' : `refused: ${JSON.stringify(read.faults)}`).toBe(true)
    if (!read.ok) return
    expect(read.formatVersion).toBe('newerThanKnown')
  })

  it('names the column it could not read, so that the telling has something to lay out', () => {
    const read = documentFromJson(handed(NEWER_THAN_KNOWN), GREATEST_KNOWN)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.unreadColumns).toEqual([COLUMN_FROM_THE_FUTURE])
  })

  it('carries the unread column through, rather than dropping it (MUST NOT)', () => {
    const read = documentFromJson(handed(NEWER_THAN_KNOWN), GREATEST_KNOWN)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    const tasks = (read.document as unknown as { schedule: { tasks: Record<string, unknown>[] } })
      .schedule.tasks
    expect(tasks[0]?.[COLUMN_FROM_THE_FUTURE]).toBe('carried, not dropped')
  })

  // WHY: the contrast rule 04 section 2 asks for -- if the repair had gone
  // the other way, this case would wrongly pass while RS-25 stopped meaning anything.
  it('still refuses an invented column when the version is one this build knows', () => {
    const read = documentFromJson(handed(GREATEST_KNOWN), GREATEST_KNOWN)
    expect(read.ok).toBe(false)
    if (read.ok) return
    expect(read.reason).toBe('RS-25')
    expect(read.faults.some((one) => one.at.endsWith(COLUMN_FROM_THE_FUTURE))).toBe(true)
  })

  it('still refuses a newer document whose fault is not an unknown key', () => {
    const root = templateCopy()
    root['schemaVersion'] = NEWER_THAN_KNOWN
    const schedule = root['schedule'] as { tasks: Record<string, unknown>[] }
    const first = schedule.tasks[0]
    if (first === undefined) throw new Error('the startup template holds no task to spoil')
    // WHY: `uid` is an integer in every version of the shape, so a string
    // there is a fault no version can excuse.
    first['uid'] = 'not an integer'
    const read = documentFromJson(JSON.stringify(root), GREATEST_KNOWN)
    expect(read.ok).toBe(false)
    if (read.ok) return
    expect(read.faults.some((one) => one.at.endsWith('/uid'))).toBe(true)
  })

  // WHY: the second half of "must not open silently" this unit can answer --
  // an unversioned caller must not be told the document was found readable.
  it('says nothing was compared when the caller named no version', () => {
    const read = documentFromJson(JSON.stringify(templateCopy()))
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.formatVersion).toBe('notCompared')
    expect(read.unreadColumns).toEqual([])
  })
})
