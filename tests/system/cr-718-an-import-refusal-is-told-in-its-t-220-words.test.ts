// CR-718 spec-only cases on the shipped build: a refused file is told in the words of its table T-220 row (IV-10, IV-14), never as RS-15 (FR-076).

import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { unbroken } from '../contract/spec-table'
import { VIEWPORT, enableAgentApi, icon, launch, readDocument, settle } from '../usecase/uc-harness'
import { rowsDocument } from './w3-t1-stage'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

interface Words {
  readonly ja: string
  readonly en: string
}

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly reasons: readonly { readonly rowId: string; readonly text: Words }[]
  readonly invariants: readonly { readonly rowId: string; readonly text: Words }[]
}

const AN_IMPORT_REFUSAL_CARRIES_ITS_T_220_ROW =
  '⭐ ⇒ 取り込みの検証が拒んだとき、`NT-1` の通知が運ぶ理由は、拒んだ 表 T-220 の行の行 ID とすること（MUST） —— 語と次の一手は `FR-038` の辞書が同表の行 ID で持つ。'
const NO_FALL_TO_A_T_233_ROW =
  '⛔ その通知を本表の行（`RS-15` を含む）へ振り替えてはならない（MUST NOT） —— 振り替えると、どの不変条件が破れたのかを人が読めず、`NT-1` の「なぜ誤りか」を果せない。'

const NOTIFICATION_AREA = '[data-role="Notification Area"]'
const OPEN_CHOOSER = '[data-role="Open Chooser"]'

// see S-119, T-214
// WHY: the first accepted day is read off the table, so the file below is one day short of it.
const IMPORT_MIN_DATE = (() => {
  const text = readFileSync(join(SPEC, '_assets', 'tbl-settings.md'), 'utf8')
  const found = /\| S-119 \| `importMinDate` \| `(\d{4}-\d{2}-\d{2})`/.exec(text)
  if (found === null) throw new Error('table T-214 S-119 states no date')
  return found[1]!
})()
const BEFORE_MIN_DATE = `${Number(IMPORT_MIN_DATE.slice(0, 4)) - 1}-12-31T00:00:00`

/** @purity pure */
function wordsOf(group: 'reasons' | 'invariants', rowId: string): readonly string[] {
  const found = WORDS[group].find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no ${rowId}`)
  return [found.text.ja, found.text.en]
}

/** @purity pure */
function saysAny(said: string, words: readonly string[]): boolean {
  return words.some((one) => one !== '' && said.includes(one))
}

/** @purity semi-pure-b */
async function textOf(page: Page, selector: string): Promise<string> {
  return page.evaluate(
    (wanted: string) => Array.from(document.querySelectorAll(wanted)).map((one) => one.textContent ?? '').join(' | '),
    selector,
  )
}

/** @purity non-pure */
async function waitForWords(page: Page, selector: string, words: readonly string[]): Promise<boolean> {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    if (saysAny(await textOf(page, selector), words)) return true
    await page.waitForTimeout(150)
  }
  return false
}

// see OP-2
/** @purity non-pure */
async function dropOpen(page: Page, name: string, text: string): Promise<void> {
  await page.evaluate(
    ({ name, text }) => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([text], name))
      const target = document.querySelector('[data-role="Schedule Canvas"]') as Element
      for (const type of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }))
    },
    { name, text },
  )
  await settle(page)
  if (await page.locator(OPEN_CHOOSER).count()) {
    await page.click(icon('IC-71', OPEN_CHOOSER))
    await settle(page)
  }
}

/** @purity pure */
function editedDocument(change: (built: { schedule: { project: Record<string, unknown>; tasks: Record<string, unknown>[] } }) => void): string {
  const built = JSON.parse(rowsDocument({ rows: 2, title: 'Refused file' })) as { schedule: { project: Record<string, unknown>; tasks: Record<string, unknown>[] } }
  change(built)
  return JSON.stringify(built)
}

const CASES: readonly (readonly [string, string, string])[] = [
  [
    'a Task that finishes before it starts',
    'IV-10',
    editedDocument((built) => {
      built.schedule.tasks[0]!['start'] = '2026-03-04T08:00:00'
      built.schedule.tasks[0]!['finish'] = '2026-03-02T17:00:00'
    }),
  ],
  [
    'a Project date before importMinDate',
    'IV-14',
    editedDocument((built) => {
      built.schedule.project['created'] = BEFORE_MIN_DATE
    }),
  ],
]

test.describe('the manuscript these cases are driven by', () => {
  test('the clauses this file presses still read word for word', () => {
    for (const clause of [AN_IMPORT_REFUSAL_CARRIES_ITS_T_220_ROW, NO_FALL_TO_A_T_233_ROW]) {
      expect(REQUIREMENTS).toContain(clause)
    }
  })
})

test.describe(`FR-076 (MUST): ${AN_IMPORT_REFUSAL_CARRIES_ITS_T_220_ROW.slice(0, 70)}`, () => {
  test.setTimeout(120_000)

  for (const [what, rowId, text] of CASES) {
    test(`${what} is told with the ${rowId} words, not with RS-15, and the open document is kept`, async ({ page }) => {
      await launch(page)
      await enableAgentApi(page)
      const titleBefore = (await readDocument(page)).schedule.project['title']
      await dropOpen(page, `cr-718-${rowId.toLowerCase()}.json`, text)
      expect(await waitForWords(page, NOTIFICATION_AREA, wordsOf('invariants', rowId)), `${rowId} words are told`).toBe(true)
      const told = await textOf(page, NOTIFICATION_AREA)
      expect(saysAny(told, wordsOf('reasons', 'RS-15')), `${NO_FALL_TO_A_T_233_ROW} -- RS-15 is not told`).toBe(false)
      expect(saysAny(told, wordsOf('reasons', 'RS-10')), 'RS-10 is not told').toBe(false)
      expect((await readDocument(page)).schedule.project['title'], 'the refused file did not replace the open document').toBe(titleBefore)
    })
  }
})
