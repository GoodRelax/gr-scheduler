// CR-786 spec-only tests: CM-100 bringCommentBoxToFront and CM-101 bringHighlightBoxToFront (FR-019, FR-031).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import { commentRow, documentWith, highlightRow } from './cr-777-stage'
import {
  CM_100,
  CM_101,
  FR_019_FRONT,
  FR_031_NO_STEP,
  REQUIREMENTS,
  accepted,
  bench,
  commentIdsOf,
  highlightIdsOf,
  run,
} from './cr-786-stage'
import { bare, specTable } from './spec-table'

const COMMENT_IDS = ['78600000-0000-4000-8000-000000000001', '78600000-0000-4000-8000-000000000002', '78600000-0000-4000-8000-000000000003']
const HIGHLIGHT_IDS = ['78600000-0000-4000-8000-0000000000a1', '78600000-0000-4000-8000-0000000000a2', '78600000-0000-4000-8000-0000000000a3']
const UNKNOWN_ID = '78600000-0000-4000-8000-0000000000ff'
const [FIRST, MIDDLE, LAST] = [0, 1, 2]

const threeOfEach = (): Document =>
  documentWith(
    COMMENT_IDS.map((id) => commentRow({ id })),
    HIGHLIGHT_IDS.map((id) => highlightRow({ id })),
  )

const idAt = (ids: readonly string[], index: number): string => ids[index] as string

const cmName = (id: string): string => bare(specTable('T-108').rows.find((one) => one.id === id)?.by['確定名'] ?? '')

describe('CR-786 premise -- T-108 names the two commands and FR-019 says what they do', () => {
  it('T-108 CM-100 is bringCommentBoxToFront and CM-101 is bringHighlightBoxToFront', () => {
    expect([cmName('CM-100'), cmName('CM-101')]).toEqual([CM_100, CM_101])
  })

  it('FR-019 and FR-031 hold the clauses these cases quote', () => {
    expect(REQUIREMENTS).toContain(FR_019_FRONT)
    expect(REQUIREMENTS).toContain(FR_031_NO_STEP)
  })
})

describe(`CM-100 -- ${FR_019_FRONT}`, () => {
  it('CM-100 moves the first comment box to the end; the others keep their relative order', () => {
    const moved = accepted(run(threeOfEach(), { kind: CM_100, id: idAt(COMMENT_IDS, FIRST) }))
    expect(commentIdsOf(moved)).toEqual([idAt(COMMENT_IDS, MIDDLE), idAt(COMMENT_IDS, LAST), idAt(COMMENT_IDS, FIRST)])
  })

  it('CM-100 moves the middle comment box to the end', () => {
    const moved = accepted(run(threeOfEach(), { kind: CM_100, id: idAt(COMMENT_IDS, MIDDLE) }))
    expect(commentIdsOf(moved)).toEqual([idAt(COMMENT_IDS, FIRST), idAt(COMMENT_IDS, LAST), idAt(COMMENT_IDS, MIDDLE)])
  })

  it('CM-100 touches only the comment boxes: the highlight boxes keep their order', () => {
    const moved = accepted(run(threeOfEach(), { kind: CM_100, id: idAt(COMMENT_IDS, FIRST) }))
    expect(highlightIdsOf(moved)).toEqual(HIGHLIGHT_IDS)
  })

  it('CM-100 rewrites no column of the moved box (FR-019: the order is the array order, the shape does not change)', () => {
    const before = threeOfEach()
    const moved = accepted(run(before, { kind: CM_100, id: idAt(COMMENT_IDS, FIRST) }))
    const find = (document: Document) => document.schedule.commentBoxes.find((one) => one.id === idAt(COMMENT_IDS, FIRST))
    expect(find(moved)).toEqual(find(before))
  })

  it('CM-100 refuses an id no comment box holds', () => {
    expect(run(threeOfEach(), { kind: CM_100, id: UNKNOWN_ID }).ok).toBe(false)
  })

  it('CM-100 refuses a highlight box id (same kind of boxes only)', () => {
    expect(run(threeOfEach(), { kind: CM_100, id: idAt(HIGHLIGHT_IDS, FIRST) }).ok).toBe(false)
  })

  it('CM-100 on the box already last returns the same document object', () => {
    const before = threeOfEach()
    expect(accepted(run(before, { kind: CM_100, id: idAt(COMMENT_IDS, LAST) }))).toBe(before)
  })
})

describe(`CM-101 -- ${FR_019_FRONT}`, () => {
  it('CM-101 moves the first highlight box to the end; the others keep their relative order', () => {
    const moved = accepted(run(threeOfEach(), { kind: CM_101, id: idAt(HIGHLIGHT_IDS, FIRST) }))
    expect(highlightIdsOf(moved)).toEqual([idAt(HIGHLIGHT_IDS, MIDDLE), idAt(HIGHLIGHT_IDS, LAST), idAt(HIGHLIGHT_IDS, FIRST)])
  })

  it('CM-101 touches only the highlight boxes: the comment boxes keep their order', () => {
    const moved = accepted(run(threeOfEach(), { kind: CM_101, id: idAt(HIGHLIGHT_IDS, MIDDLE) }))
    expect(commentIdsOf(moved)).toEqual(COMMENT_IDS)
  })

  it('CM-101 refuses an id no highlight box holds', () => {
    expect(run(threeOfEach(), { kind: CM_101, id: UNKNOWN_ID }).ok).toBe(false)
  })

  it('CM-101 refuses a comment box id (same kind of boxes only)', () => {
    expect(run(threeOfEach(), { kind: CM_101, id: idAt(COMMENT_IDS, FIRST) }).ok).toBe(false)
  })

  it('CM-101 on the box already last returns the same document object', () => {
    const before = threeOfEach()
    expect(accepted(run(before, { kind: CM_101, id: idAt(HIGHLIGHT_IDS, LAST) }))).toBe(before)
  })
})

describe(`FR-019 / FR-031 -- one command, so one undo brings the order back`, () => {
  const cases: readonly (readonly [string, string, (document: Document) => readonly string[]])[] = [
    [CM_100, idAt(COMMENT_IDS, FIRST), commentIdsOf],
    [CM_101, idAt(HIGHLIGHT_IDS, FIRST), highlightIdsOf],
  ]

  it.each(cases)('%s writes one undo step and one undo restores the order', (kind, id, idsOf) => {
    const start = threeOfEach()
    const held = bench(start)
    const outcome = held.write([{ kind, id } as unknown as DocumentCommand])
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true)
    expect(held.depth()).toBe(1)
    expect(idsOf(held.document())).not.toEqual(idsOf(start))
    expect(idsOf(held.undo())).toEqual(idsOf(start))
  })

  it.each([
    [CM_100, idAt(COMMENT_IDS, LAST)],
    [CM_101, idAt(HIGHLIGHT_IDS, LAST)],
  ])(`%s on the box already last leaves no undo step -- ${FR_031_NO_STEP}`, (kind, id) => {
    const held = bench(threeOfEach())
    held.write([{ kind, id } as unknown as DocumentCommand])
    expect(held.depth()).toBe(0)
  })
})
