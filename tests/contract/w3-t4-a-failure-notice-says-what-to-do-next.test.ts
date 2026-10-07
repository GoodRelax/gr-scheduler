// W3 tester 4: FR-076 table T-037 NT-3a -- a failure notice carries the next thing the person can do.

import { describe, expect, it } from 'vitest'

import { REQUIREMENTS, SPEC_WORDS, shellStage, surfaceOfEntrance } from './cr-610-file-flow-stage'
import { bare, specTable } from './spec-table'

const NT_3A = '敗の通知 | **次に取れる手段を添えること（MUST）'
const NT_3A_NOT_BARE = '失敗したことだけを伝えて手段を示さない通知を出してはならない（MUST NOT）'

const T_233 = specTable('T-233')
const UNLOCK_SURFACE = 'Watermark Unlock'

// see T-233
const FAILURE_ROWS: readonly string[] = T_233.rows.filter((row) => bare(row.cells[1] ?? '') === 'NT-3a').map((row) => row.id)

interface Words {
  readonly rowId: string
  readonly nextStep?: { readonly ja?: string; readonly en?: string }
}

const WORDS = SPEC_WORDS['reasons'] as readonly Words[]

describe('NT-3a -- the manuscript these cases are driven by', () => {
  it.each([NT_3A, NT_3A_NOT_BARE])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-233 writes at least one reason against NT-3a', () => {
    expect(FAILURE_ROWS.length).toBeGreaterThan(0)
  })
})

describe(`NT-3a -- ${NT_3A}`, () => {
  it.each(FAILURE_ROWS.map((row) => [row]))('%s: the dictionary gives a next step in both languages', (row) => {
    const found = WORDS.find((one) => one.rowId === row)
    expect(found?.nextStep?.ja ?? '', `${row}: ${NT_3A_NOT_BARE}`).not.toBe('')
    expect(found?.nextStep?.en ?? '', `${row}: ${NT_3A_NOT_BARE}`).not.toBe('')
  })

  it('a watermark password that does not match is told as a failure that carries its next step on the screen', async () => {
    const built = await shellStage()
    await built.press(surfaceOfEntrance('IC-41'), 'IC-41')
    expect((built.last().openModal as { surface?: string } | null)?.surface, 'premise: IC-41 raised the unlock surface').toBe(
      UNLOCK_SURFACE,
    )
    await built.press(UNLOCK_SURFACE, null, { confirmationAnswer: 'proceed' })
    const told = built.last().notices as readonly { manner?: string; nextSteps?: readonly string[]; text?: string }[]
    const failures = told.filter((one) => one.manner === 'NT-3a')
    expect(failures.length, `premise: the empty password was told as a failure (NT-3a): ${JSON.stringify(told)}`).toBeGreaterThan(0)
    for (const one of failures) {
      expect((one.nextSteps ?? []).filter((step) => step.length > 0).length, `${NT_3A} -- ${one.text ?? ''}`).toBeGreaterThan(0)
    }
  })
})
