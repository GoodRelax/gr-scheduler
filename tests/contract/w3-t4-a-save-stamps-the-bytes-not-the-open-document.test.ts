// W3 tester 4: FR-101 table T-341 HS-11 -- the bytes a save writes carry the save time in AT-140; the open document keeps the AT-140 it was opened with.

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { REQUIREMENTS, jsonBytes, replaceWith, shellStage, there, type StandInFile } from './cr-610-file-flow-stage'

const HS_11_NO_REWRITE =
  '時刻を入れること（MUST）。下段が `HS-5` のときは空とすること（MUST）。⛔ 開いている文書の `AT-140` を書けた時刻へ書き換えてはならない（MUST NOT）'
const HS_11_KEEP = '⇒ 開いている文書の `AT-140` は開いたときに読んだ値のまま動かず、'

const OPENED_STAMP = '2026-01-02T03:04:05Z'

/** @purity pure */
function stampIn(file: StandInFile): string | null {
  const read = documentFromJson(new TextDecoder().decode(file.bytes()))
  if (!read.ok) throw new Error(`the saved bytes are not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document.documentStamp.fileSavedUtc ?? null
}

describe('HS-11 -- the manuscript these cases are driven by', () => {
  it.each([HS_11_NO_REWRITE, HS_11_KEEP])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe(`HS-11 -- ${HS_11_NO_REWRITE}`, () => {
  it('after a save, the saved bytes carry a newer AT-140 and the open document still carries the one it was opened with', async () => {
    const built = await shellStage()
    const stamped = there() as unknown as { documentStamp: Record<string, unknown> }
    stamped.documentStamp['fileSavedUtc'] = OPENED_STAMP
    const opened = built.file('stamped.json', jsonBytes(stamped))
    await replaceWith(built, opened)
    expect(built.loop.document().documentStamp.fileSavedUtc, 'premise: the opened AT-140 was read').toBe(OPENED_STAMP)

    built.browser.toSave.push(opened)
    await built.save()
    expect(built.written, 'premise: SK-11 wrote the opened file').toContain('stamped.json')
    const written = stampIn(opened)
    expect(written, 'HS-11 (MUST): the saved bytes carry the time of that save').not.toBeNull()
    expect(written, 'HS-11 (MUST): a later time than the one opened').not.toBe(OPENED_STAMP)

    expect(built.loop.document().documentStamp.fileSavedUtc, `${HS_11_NO_REWRITE} -- ${HS_11_KEEP}`).toBe(OPENED_STAMP)
  })
})
