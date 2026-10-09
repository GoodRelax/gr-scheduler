// CR-712 wave 2 spec-only cases on the shipped build: report rows in U-62, the U-61 note, import refusals by T-220 row, QN-5 and RS-27.

import { expect, test, type Page } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { unbroken } from '../contract/spec-table'
import { VIEWPORT, enableAgentApi, icon, launch, openByDrop, press, readDocument, savedFiles, settle } from '../usecase/uc-harness'
import { rowsDocument } from './w3-t1-stage'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

interface Words {
  readonly ja: string
  readonly en: string
}

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly reasons: readonly { readonly rowId: string; readonly text: Words; readonly nextStep?: Words }[]
  readonly invariants: readonly { readonly rowId: string; readonly text: Words }[]
  readonly differenceReview?: readonly { readonly part: string; readonly text: Words }[]
}

const FR_076_REPORT_ROWS_GO_TO_U_62 =
  '表示の仕方が「`U-62` に並べる」の理由は、1 回の読込（開く・開き直す・合流させる・重ねる、起動時に渡された文書を読む 表 T-024a の `OP-14` を含む）の中で上がったら、通知の欄に立てず、読込が着地したときに `_assets/tbl-glossary.md` の `U-62` に 1 行として並べること（MUST）'
const MG_10_ALWAYS_ON_U_61 =
  '「別のものとして取り込む」を選ばせる面（`_assets/tbl-glossary.md` の `U-61`）に、そのタスクが元の外部 WBS マスタへ戻せなくなることを、選ぶ前から常に示すこと（MUST）'
const T_233_REFUSAL_CARRIES_THE_ROW =
  '取り込みの検証が拒んだとき、`NT-1` の通知が運ぶ理由は、拒んだ 表 T-220 の行の行 ID とすること（MUST）'
const FR_095_ASK_ONLY_WITH_EDITS = '捨てる前に、保存していない編集があるときは、表 T-024a の `OP-4` と同じ確認を求めること（MUST）'
const NT_7_DROPPED_AS_RS_27 =
  '画面からの書き込み（取り消し・やり直しを含む）は 表 T-233 の `RS-27` として捨て（同行は出さない —— 問いが画面に立っているので、受けなかったことは見える）、`Agent API` の書き込みは 表 T-035 の `AG-9` のとおり拒むこと（MUST）'

const NOTIFICATION_AREA = '[data-role="Notification Area"]'
const IMPORT_REPORT = '[data-role="Import Report"]'
const DIFFERENCE_REVIEW = '[data-role="Difference Review"]'
const OPEN_CHOOSER = '[data-role="Open Chooser"]'
const CONFIRMATION = '[data-role="Confirmation"]'
const EMBEDDED = /(<script[^>]*id="embedded-document"[^>]*>)([\s\S]*?)(<\/script>)/

// WHY: above the schema maximum of documentSettings.zoomX, so the reader brings it back in range (RS-51).
const OUT_OF_RANGE_ZOOM = 100

/** @purity pure */
function reasonWords(rowId: string): readonly string[] {
  const found = WORDS.reasons.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no ${rowId}`)
  return [found.text.ja, found.text.en]
}

/** @purity pure */
function nextStepWords(rowId: string): readonly string[] {
  const found = WORDS.reasons.find((one) => one.rowId === rowId)?.nextStep
  return found === undefined ? [] : [found.ja, found.en]
}

/** @purity semi-pure-b */
async function textOf(page: Page, selector: string): Promise<string> {
  return page.evaluate(
    (wanted: string) => Array.from(document.querySelectorAll(wanted)).map((one) => one.textContent ?? '').join(' | '),
    selector,
  )
}

/** @purity pure */
function saysAny(said: string, words: readonly string[]): boolean {
  return words.some((one) => one !== '' && said.includes(one))
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

/** @purity pure */
function clampedDocument(): string {
  const built = JSON.parse(rowsDocument({ rows: 2 })) as { documentSettings: Record<string, unknown> }
  built.documentSettings['zoomX'] = OUT_OF_RANGE_ZOOM
  return JSON.stringify(built)
}

// see OP-2
/** @purity non-pure */
async function dropOnly(page: Page, name: string, text: string): Promise<void> {
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
}

// see IC-2, IO-7, FR-067
/** @purity non-pure */
async function writeOutHtml(page: Page): Promise<string> {
  const before = (await savedFiles(page)).length
  await press(page, 'IC-2')
  await page.click('[data-role="Export Chooser"] [data-format="IO-7"]')
  await expect.poll(async () => (await savedFiles(page)).length).toBe(before + 1)
  return (await savedFiles(page))[before]!.text
}

/** @purity non-pure */
async function editOneTask(page: Page): Promise<void> {
  await enableAgentApi(page)
  const uid = (await readDocument(page)).schedule.tasks[0]?.['uid'] as number | undefined
  expect(uid, 'premise: the opened document has a task to rename').toBeDefined()
  const accepted = await page.evaluate((taskUid: number) => {
    const api = (window as any).grSchedulerAgentApi
    return api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: 'setTaskName', uid: taskUid, name: 'Changed here' }] }).accepted
  }, uid!)
  expect(accepted, 'premise: the rename was accepted').toBe(true)
  await settle(page)
}

// WHY: a mouse press at the icon, not page.click, which would wait out a standing question that covers the header.
/** @purity non-pure */
async function pressThrough(page: Page, id: string): Promise<void> {
  const at = await page.evaluate((wanted: string) => {
    const box = document.querySelector(`[data-icon="${wanted}"]`)?.getBoundingClientRect()
    return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, id)
  expect(at, `${id} is on the screen`).not.toBeNull()
  await page.mouse.move(at!.x, at!.y)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

test.describe('the manuscript these cases are driven by', () => {
  test('the clauses this file presses read as CR-712 section 4 wrote them', () => {
    for (const clause of [
      FR_076_REPORT_ROWS_GO_TO_U_62,
      MG_10_ALWAYS_ON_U_61,
      T_233_REFUSAL_CARRIES_THE_ROW,
      FR_095_ASK_ONLY_WITH_EDITS,
      NT_7_DROPPED_AS_RS_27,
    ]) {
      expect(REQUIREMENTS.replace(/\*\*/g, '')).toContain(clause)
    }
  })
})

test.describe(`FR-076 (MUST): ${FR_076_REPORT_ROWS_GO_TO_U_62.slice(-60)}`, () => {
  test.setTimeout(120_000)

  test('a dropped file with a setting out of range lists RS-51 in U-62, with its next step, and raises no notice', async ({ page }) => {
    await launch(page)
    await openByDrop(page, 'cr-712-clamped.json', clampedDocument())
    expect(await waitForWords(page, IMPORT_REPORT, reasonWords('RS-51')), 'RS-51 is a line of U-62').toBe(true)
    const report = await textOf(page, IMPORT_REPORT)
    if (nextStepWords('RS-51').length > 0) expect(saysAny(report, nextStepWords('RS-51')), 'the line carries the next step').toBe(true)
    expect(saysAny(await textOf(page, NOTIFICATION_AREA), reasonWords('RS-51')), 'RS-51 is not a notice').toBe(false)
  })

  test('a document handed at start-up reports RS-51 in U-62 as well (JDG-1764)', async ({ page }) => {
    await launch(page)
    const written = await writeOutHtml(page)
    const found = EMBEDDED.exec(written)
    expect(found, 'premise: the written .html embeds its document').not.toBeNull()
    const embedded = JSON.parse(found![2]!) as { documentSettings: Record<string, unknown> }
    embedded.documentSettings['zoomX'] = OUT_OF_RANGE_ZOOM
    const handed = written.replace(EMBEDDED, `$1${JSON.stringify(embedded).replace(/</g, '\\u003c')}$3`)
    const path = test.info().outputPath('cr-712-handed.html')
    writeFileSync(path, handed)
    await page.goto(pathToFileURL(path).href)
    await page.waitForSelector('[data-role="Schedule Canvas"]')
    await settle(page)
    expect(await waitForWords(page, IMPORT_REPORT, reasonWords('RS-51')), 'RS-51 is a line of U-62 at start-up').toBe(true)
    expect(saysAny(await textOf(page, NOTIFICATION_AREA), reasonWords('RS-51')), 'RS-51 is not in the start-up notice').toBe(false)
  })
})

test.describe(`MG-10 (MUST): ${MG_10_ALWAYS_ON_U_61}`, () => {
  test.setTimeout(120_000)

  test('the Difference Review shows the separate-task note before anything is chosen', async ({ page }) => {
    const note = WORDS.differenceReview?.find((one) => one.part === 'separateNote')?.text
    expect(note, 'the dictionary holds differenceReview.separateNote').toBeDefined()
    await launch(page)
    await enableAgentApi(page)
    await openByDrop(page, 'cr-712-current.json', rowsDocument({ rows: 3 }))
    const renamed = await page.evaluate(() => {
      const api = (window as any).grSchedulerAgentApi
      return api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: 'setTaskName', uid: 2, name: 'Changed here' }] }).accepted
    })
    expect(renamed, 'premise: task 2 differs from the incoming file').toBe(true)
    await dropOnly(page, 'cr-712-incoming.json', rowsDocument({ rows: 3 }))
    await page.click(icon('IC-72', OPEN_CHOOSER))
    await settle(page)
    await expect(page.locator(DIFFERENCE_REVIEW), 'premise: the Difference Review asks about task 2').toHaveCount(1)
    expect(saysAny(await textOf(page, DIFFERENCE_REVIEW), [note!.ja, note!.en]), MG_10_ALWAYS_ON_U_61).toBe(true)
  })
})

test.describe(`T-233 closing (MUST): ${T_233_REFUSAL_CARRIES_THE_ROW}`, () => {
  test.setTimeout(120_000)

  test('a file whose tasks form a parent loop is refused with the IV-4 words, not with RS-10', async ({ page }) => {
    const iv4 = WORDS.invariants.find((one) => one.rowId === 'IV-4')?.text
    expect(iv4?.en ?? '', 'the dictionary words IV-4').not.toBe('')
    await launch(page)
    await dropOnly(page, 'cr-712-loop.json', rowsDocument({ rows: 2, wbsParentOf: { 1: 2, 2: 1 } }))
    if (await page.locator(OPEN_CHOOSER).count()) {
      await page.click(icon('IC-71', OPEN_CHOOSER))
      await settle(page)
    }
    expect(await waitForWords(page, NOTIFICATION_AREA, [iv4!.ja, iv4!.en]), 'the IV-4 words are told').toBe(true)
    expect(saysAny(await textOf(page, NOTIFICATION_AREA), reasonWords('RS-10')), 'not folded into RS-10').toBe(false)
  })
})

test.describe(`FR-095 (MUST): ${FR_095_ASK_ONLY_WITH_EDITS}`, () => {
  test.setTimeout(120_000)

  test('with nothing unsaved, IC-98 starts the new document without asking', async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    await press(page, 'IC-98')
    await expect(page.locator(CONFIRMATION), 'no question stands').toHaveCount(0)
    expect((await readDocument(page)).schedule.tasks, 'the empty document of table T-342').toEqual([])
  })

  test('with an unsaved edit, IC-98 asks QN-5 first', async ({ page }) => {
    await launch(page)
    await editOneTask(page)
    await press(page, 'IC-98')
    await expect(page.locator(CONFIRMATION), 'QN-5 stands').toHaveCount(1)
  })

  test(`while QN-5 stands, IC-1 is dropped as RS-27 and nothing is told -- ${NT_7_DROPPED_AS_RS_27.slice(0, 60)}`, async ({ page }) => {
    await launch(page)
    await editOneTask(page)
    await press(page, 'IC-98')
    await expect(page.locator(CONFIRMATION), 'premise: QN-5 stands').toHaveCount(1)
    await pressThrough(page, 'IC-1')
    expect(saysAny(await textOf(page, NOTIFICATION_AREA), reasonWords('RS-27')), 'RS-27 is carried, not shown').toBe(false)
  })
})
