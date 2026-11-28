// CR-719 spec-only system test on the built dist/index.html: opening a GRS JSON of 20001 tasks tells RS-79 and leaves the open document alone (FR-023, FR-076).
import { expect, test } from '@playwright/test'
import { readRepoFile } from '../spec-files'
import { resolve } from 'node:path'
import { settingNumber } from '../fixtures/setting-number'
import { VIEWPORT, answerConfirmation, enableAgentApi, icon, launch, notificationText, press, readDocument, settle } from '../use-case/uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const SPEC = resolve('docs', 'spec')
const REQUIREMENTS = readRepoFile(resolve(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n')
const WORDS = JSON.parse(readRepoFile(resolve(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  reasons: { specTableRowId: string; text: { ja: string; en: string }; nextStep: { ja: string; en: string } }[]
}
const TEMPLATE = JSON.parse(readRepoFile(resolve('src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8')) as Record<string, any>

const FR_023_OVER_THE_LIMIT_IS_NOT_TAKEN =
  'もし入力が資源の上限（ファイルサイズ・件数・WBS のネストの深さ・解釈しない要素のネストの深さ）を超える場合、`GRS` は、その入力を取り込まないこと。\n\n**表 T-648 — 資源の上限を超えた入力を取り込まないことの実装仕様**\n\n| 行 ID | 何についてか | 実装仕様 | traces |\n| --- | --- | --- | --- |\n| IMPS-938 | 資源の上限 | `GRS` は、資源の上限を `_assets/tbl-settings.md` の表 T-211 に従って持つこと。 | FR-342 |\n| IMPS-939 | 超えたときの通知 | もし入力が資源の上限を超える場合、`GRS` は、超えた上限に当たる 表 T-233 の行を通知の仕組みへ運ぶこと'
const FR_023_NO_PARTIAL_APPLY = '`GRS` は、取り込まない入力を部分的に適用しないこと。'
const NT_1_SAYS_WHY_IN_WORDS = 'どの項目が、なぜ誤りかを文字で示すこと（MUST）'

const LIMIT = settingNumber('S-114')
const RS_79 = WORDS.reasons.find((one) => one.specTableRowId === 'RS-79')

// Spec: S-114
const spelled = (words: string): string => words.replace('{importMaxItems}', String(LIMIT))

// Why: the shipped template already holds 1000 Tasks on its task groups; clones of its first Task and its first membership bring the count one past the limit.
const oneTaskOverTheLimit = (): string => {
  const schedule = structuredClone(TEMPLATE['schedule']) as Record<string, any[]> & { project: Record<string, unknown> }
  const task = schedule['tasks']![0]
  const member = schedule['taskGroupMembers']![0]
  const visual = schedule['taskVisuals']![0]
  let uid = Math.max(...schedule['tasks']!.map((one) => one['uid'] as number))
  while (schedule['tasks']!.length < LIMIT + 1) {
    uid += 1
    schedule['tasks']!.push({ ...structuredClone(task), uid, name: `Extra ${uid}` })
    schedule['taskGroupMembers']!.push({ ...member, taskUid: uid })
    schedule['taskVisuals']!.push({ ...structuredClone(visual), taskUid: uid })
  }
  schedule.project['uidHighWaterMark'] = uid
  return JSON.stringify({ ...TEMPLATE, schedule })
}

test('the clauses this test is driven by still stand', () => {
  for (const clause of [FR_023_OVER_THE_LIMIT_IS_NOT_TAKEN, FR_023_NO_PARTIAL_APPLY, NT_1_SAYS_WHY_IN_WORDS]) expect(REQUIREMENTS.replace(/<br>/g, '')).toContain(clause)
  expect(RS_79, 'the dictionary holds RS-79').toBeDefined()
})

test(`${FR_023_NO_PARTIAL_APPLY}: a GRS JSON of ${LIMIT + 1} tasks opened through IC-1 tells RS-79 and the open document does not change`, async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  const before = JSON.stringify(await readDocument(page))
  const text = oneTaskOverTheLimit()
  await page.evaluate((given: string) => {
    ;(window as unknown as { __grsNextOpen: unknown }).__grsNextOpen = { name: 'over-the-limit.json', text: given }
  }, text)
  await press(page, 'IC-1')
  if (await page.locator('[data-role="Open File Dialog"]').count()) {
    await page.click(icon('IC-71', '[data-role="Open File Dialog"]'))
    await settle(page)
  }
  if (await page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]').count()) await answerConfirmation(page, 'proceed')
  await settle(page)
  const told = await notificationText(page)
  expect(told, `${NT_1_SAYS_WHY_IN_WORDS} -- what stands: ${told.slice(0, 200)}`).toContain(spelled(RS_79?.text.en ?? ''))
  expect(told, 'the limit value is filled in and no brace is left').not.toContain('{')
  expect(JSON.stringify(await readDocument(page)), 'the refused file changed nothing').toBe(before)
})
