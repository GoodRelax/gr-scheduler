// The anchor for DFC-357's first half: a document written by a build newer than
// this one is OPENED and its unreadable columns are COUNTED, rather than the
// whole document being turned away over them.
//
// ⛔ WHY THIS FILE EXISTS RATHER THAN A NEW SUITE. Rule 04 section 6.2 of
// docs/development-rules/ asks that a repair be pinned where it was made, and
// the user's ruling of this round admits two kinds of case only -- a
// fix-confirmation anchor, and a count of what was already there. This is the
// first kind. ⛔ It is not a suite for `documentFromJson`; the cases below
// press one repair and nothing else.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL. Table T-218 row TS-6 gives
// these their place, tests/unit/, and vitest.config.ts is what runs them.
//
// WHAT WAS MEASURED BEFORE THE REPAIR (2026-09-09, shipped build, through
// `AM-8` with `{ text }`): a document whose only fault was a format version
// newer than this build's and one column no schema of this build carries came
// back `{"accepted":false,...,"reason":"malformedRequest"}` -- `documentFromJson`
// had refused it under `RS-25`, and `handedDocument` turned that into a
// refusal of the intake.
//
// The clauses these cases press, quoted from FR-073 of
// docs/spec/01-04-requirements.md:
//
//   ⛔⛔ 「読めない版」とは、この造りが知る最大の版より新しいことである（MUST）。
//   ⭐⭐ そのときは、受けて開くこと（MUST）
//   ⛔ 拒んではならない（MUST NOT）。黙って開いてもならない（MUST NOT）。
//   ⛔ 読めなかった列を具体的に並べて見せ、続けてよいかを問うこと（MUST）
//   ⛔⛔ 読めなかった列は、解釈せずに持ち回ること（MUST）。落としてはならない（MUST NOT）
//   ⭐ 判別は文字列の大小で行うこと（MUST）
//
// and from FR-022, which the same refusal broke on the way through:
//
//   ⛔ 合流を拒んではならない（MUST NOT）
//
// ⛔ WHAT IS STILL NOT PRESSED HERE, and it is the larger half: FR-073's
// 「並べて見せ」 is a SURFACE (`U-61` of table T-103) carrying `RS-48` of table
// T-233, and no unit of this component may draw one. `tests/system/
// fr-073-fr-022-the-difference-review-that-is-not-there.test.ts` is where that
// half is measured, and it is still red for it.

import { describe, expect, it } from 'vitest'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'

/**
 * The greatest format version this build knows -- FR-073's 「この造りが知る
 * 最大の版」, read off the bundled startup template rather than typed here, so
 * that moving the manuscript's version moves these cases with it.
 */
const GREATEST_KNOWN: string = (startupTemplate as { schemaVersion: string }).schemaVersion

/**
 * A column no schema of this build carries. The whole experiment rests on the
 * name being one nothing can have an opinion about.
 */
const COLUMN_FROM_THE_FUTURE = 'aColumnNoBuildOfThisToolCanRead'

/**
 * A format version strictly after `GREATEST_KNOWN` by the comparison FR-073
 * settles -- 「判別は文字列の大小で行うこと（MUST）」 -- built from that value
 * rather than written down, so it stays newer however far the version moves.
 */
const NEWER_THAN_KNOWN = `9${GREATEST_KNOWN.slice(1)}`

/** The template as a fresh mutable value, so no case can disturb another. */
function templateCopy(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(startupTemplate)) as Record<string, unknown>
}

/** The template with `schemaVersion` set and one unreadable column planted. */
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
    // 解釈せずに: the value is the one the file carried, untouched.
    const tasks = (read.document as unknown as { schedule: { tasks: Record<string, unknown>[] } })
      .schedule.tasks
    expect(tasks[0]?.[COLUMN_FROM_THE_FUTURE]).toBe('carried, not dropped')
  })

  // ⭐⭐ THE CONTRAST, and rule 04 section 2 asks for it: if the repair had gone
  // the other way -- forgiving an unknown key whatever the version said -- the
  // two cases below would pass while RS-25 stopped meaning anything. RS-25 of
  // table T-233 is 「読んだ `GRS JSON` の列が、決められた形に合わない」, and a
  // column invented by a writer of a version this build DOES know is exactly
  // that.
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
    // `uid` is an integer in every version of the shape; a string there is a
    // fault the version cannot excuse.
    first['uid'] = 'not an integer'
    const read = documentFromJson(JSON.stringify(root), GREATEST_KNOWN)
    expect(read.ok).toBe(false)
    if (read.ok) return
    expect(read.faults.some((one) => one.at.endsWith('/uid'))).toBe(true)
  })

  // ⛔ 「黙って開いてもならない（MUST NOT）」 has a second half this unit CAN
  // answer: a caller that named no version must not be told the document was
  // found readable. FR-073's own reading for that is `notCompared`.
  it('says nothing was compared when the caller named no version', () => {
    const read = documentFromJson(JSON.stringify(templateCopy()))
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.formatVersion).toBe('notCompared')
    expect(read.unreadColumns).toEqual([])
  })
})
