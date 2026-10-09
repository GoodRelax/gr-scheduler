// CR-716 on the shipped build: the large sample's VS-6 parents are DG-1 in readDelayDiagnostics (T-315 DG-1, DX-7, DX-8).
import { expect, test, type Page } from '@playwright/test'

import { VIEWPORT, enableAgentApi, launch, openByDrop, readSample } from '../usecase/uc-harness'
import { REQUIREMENTS } from './cr-570-tree-state-stage'

test.use({ viewport: VIEWPORT, locale: 'en-US', colorScheme: 'light' })

const ERP = 'sample-large-erp-program.ja.xml'

// WHY: the VS-6 parents of the large sample at S-487 = 1: four named ones and six inside uids 125 .. 145.
const NAMED_PARENTS = [208, 200, 182, 181]
const RANGE_FIRST = 125
const RANGE_LAST = 145
const RANGE_PARENTS = 6

// see AG-1
const callApi = <T>(page: Page, body: string): Promise<T> =>
  page.evaluate((code) => new Function('api', code)((window as any).grSchedulerAgentApi), body) as Promise<T>

interface Report {
  readonly findings: readonly { row: string; uid: number }[]
  readonly markerStates: readonly { uid: number; row: string }[]
  readonly unanalysedCount: number
}

const reportOf = (answer: unknown): Report => {
  const wrapped = answer as { value?: Report }
  return wrapped.value ?? (answer as Report)
}

test('the clauses are the specification words', () => {
  for (const clause of [
    '表 T-311 の `VS-6` の指摘を持つ',
    '本行の親は 表 T-315 の `DG-1`（`?`）とする',
    '紫（`DG-1`）の `Task` の数',
  ]) {
    expect(REQUIREMENTS, clause).toContain(clause)
  }
})

test('DX-8 / T-315 DG-1: on the shipped build every VS-6 parent of the large sample is DG-1 and DX-7 counts them', async ({ page }) => {
  test.setTimeout(120_000)
  await launch(page)
  await enableAgentApi(page)
  await openByDrop(page, ERP, readSample(ERP))
  const report = reportOf(await callApi<unknown>(page, 'return api.readDelayDiagnostics()'))
  const parents = report.findings.filter((one) => one.row === 'VS-6').map((one) => one.uid)
  expect(parents, 'precondition: VS-6 finds the ten parents').toHaveLength(NAMED_PARENTS.length + RANGE_PARENTS)
  for (const uid of NAMED_PARENTS) expect(parents, `uid ${uid}`).toContain(uid)
  const others = parents.filter((uid) => !NAMED_PARENTS.includes(uid))
  expect(others).toHaveLength(RANGE_PARENTS)
  for (const uid of others) {
    expect(uid, `uid ${uid}`).toBeGreaterThanOrEqual(RANGE_FIRST)
    expect(uid, `uid ${uid}`).toBeLessThanOrEqual(RANGE_LAST)
  }
  const marked = (uid: number): string | undefined => report.markerStates.find((one) => one.uid === uid)?.row
  for (const uid of parents) expect(marked(uid), `uid ${uid}`).toBe('DG-1')
  expect(report.unanalysedCount).toBe(report.markerStates.filter((one) => one.row === 'DG-1').length)
  expect(report.unanalysedCount).toBeGreaterThanOrEqual(parents.length)
})
