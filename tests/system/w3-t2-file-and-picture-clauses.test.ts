// W3 spec-only tester 2: file and picture clauses of 01-04-requirements.md pressed on the built dist/index.html.
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { specTable, unbroken } from '../contract/spec-table'
import { VIEWPORT, elementBox, enableAgentApi, launch, openByDrop, press, readDocument, readSample, savedFiles, settle, type Box } from '../usecase/uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US', colorScheme: 'light' })

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-135
const ONLY_A_PERSON_WRITES_THE_PARENT =
  '`wbsParentUid` は、人が親定義のドラッグ（表 T-351）で結んだとき、または矢印の `Delete`（`WL-11`）かパネルの ×（`WL-17`）で外したときだけ書くこと（MUST）。⛔ `GRS` が候補から自動で書いてはならない（MUST NOT）'

// see IX-12, T-241
const SPAN_DOES_NOT_MOVE_THE_SCREEN =
  '—— 同じ文書から毎回同じ絵を出すことが、期間を保存する目的である。⛔ 期間で画面を動かしてはならない（MUST NOT）'

// see IX-13, T-241
const SPAN_DAY_WIDTH =
  '1 日の幅を、`Row Area` の幅 ÷ `S-518` の日から `S-519` の日までを両端を含めて数えた暦日の数とすること（MUST）'

// see IX-15, T-241
const SPAN_HEIGHT =
  '⭐ 高さは、区画を上から積んだ高さ（`App Header` の帯・`Time Ruler`・ピン止めの帯・`IX-14` の行）を、`IX-4` と同じく 0.01 px の格子へ四捨五入して次の整数の px へ切り上げた値と、`S-81` の高さのうち大きいほうとすること（MUST）'

// see OP-9, T-024a
const OVERLAY_ONLY_MATCHING_UIDS = '—— 理由は同要求が持つ。その枠へ入れるのは、現在の文書のタスクと `UID` が一致するものだけとすること（MUST）'

// see HS-11, T-337
const STAMP_OF_THE_WRITTEN_BYTES =
  '、ほかでは書くときに下段が示している時刻を入れること（MUST）。下段が `HS-5` のときは空とすること（MUST）'

// see EP-3, T-076
const ROW_NAME_BASELINE = '⭐ 縦は、書き出す行の名前のベースラインを、その行の行見出しの箱の上端から、その行の名前の字の大きさだけ下に置くこと（MUST）'

const CLAUSES = [
  ONLY_A_PERSON_WRITES_THE_PARENT,
  SPAN_DOES_NOT_MOVE_THE_SCREEN,
  SPAN_DAY_WIDTH,
  SPAN_HEIGHT,
  OVERLAY_ONLY_MATCHING_UIDS,
  STAMP_OF_THE_WRITTEN_BYTES,
  ROW_NAME_BASELINE,
]

const ERP = 'sample-large-erp-program.en.xml'
const MEDIUM = 'sample-medium-sfa-webapp.en.xml'
const DAY_MS = 86_400_000
const SPAN_START = '2026-04-06'
const SPAN_FINISH = '2026-04-19'

const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.by[column] ?? ''
}

const dayNumber = (isoDate: string): number => Math.round(Date.parse(isoDate.slice(0, 10) + 'T00:00:00Z') / DAY_MS)

const boxOf = async (page: Page, selector: string): Promise<Box> => {
  const box = await elementBox(page, selector)
  if (box === null) throw new Error(`nothing matches ${selector}`)
  return box
}

// see AG-1
const callApi = <T>(page: Page, body: string, arg?: unknown): Promise<T> =>
  page.evaluate(({ body, arg }) => new Function('api', 'arg', body)((window as any).grSchedulerAgentApi, arg), { body, arg }) as Promise<T>

const setSpan = async (page: Page, start: string | null, finish: string | null): Promise<void> => {
  const outcome = await callApi<{ accepted: boolean }>(
    page,
    'return api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: "setExportSpan", exportSpanStart: arg[0], exportSpanFinish: arg[1] }] })',
    [start === null ? null : start + 'T00:00:00', finish === null ? null : finish + 'T00:00:00'],
  )
  expect(outcome.accepted, 'precondition: CM-88 was accepted').toBe(true)
  await settle(page)
}

const exportedSvg = async (page: Page): Promise<string> => {
  const answer = await callApi<{ ok: boolean; value?: string }>(page, 'return api.exportSvg()')
  expect(answer.ok, 'precondition: the picture was exported').toBe(true)
  return answer.value ?? ''
}

const numberAttr = (tag: string, name: string): number => Number(new RegExp(`\\s${name}="(-?[\\d.]+)"`).exec(tag)?.[1] ?? NaN)

const tagsWithFigure = (svg: string, pattern: RegExp): readonly string[] => [...svg.matchAll(/<[a-z]+ [^>]*data-figure="[^"]+"[^>]*>/g)].map((m) => m[0]).filter((tag) => pattern.test(/data-figure="([^"]+)"/.exec(tag)?.[1] ?? ''))

const figureName = (tag: string): string => /data-figure="([^"]+)"/.exec(tag)?.[1] ?? ''

test('the clauses are the specification words', () => {
  for (const clause of CLAUSES) expect(REQUIREMENTS, clause).toContain(clause)
})

test(`FR-135: ${ONLY_A_PERSON_WRITES_THE_PARENT}`, async ({ page }) => {
  test.setTimeout(120_000)
  await launch(page)
  await enableAgentApi(page)
  await openByDrop(page, ERP, readSample(ERP))
  const exported = await callApi<{ ok: boolean; value: string }>(page, 'return api.exportJson()')
  expect(exported.ok, 'precondition: the document was exported as GRS JSON').toBe(true)
  const json = JSON.parse(exported.value) as { schedule: { tasks: Record<string, unknown>[] } }
  // STEP: drop the stated parent of every child whose parent wraps it, so table T-318 has a candidate to derive
  const byUid = new Map(json.schedule.tasks.map((one) => [one['uid'], one]))
  const cleared: unknown[] = []
  for (const task of json.schedule.tasks) {
    const parent = byUid.get(task['wbsParentUid'])
    if (parent === undefined || parent['milestone'] === true) continue
    if (String(parent['start']) <= String(task['start']) && String(task['finish']) <= String(parent['finish'])) {
      task['wbsParentUid'] = null
      cleared.push(task['uid'])
    }
    if (cleared.length >= 40) break
  }
  expect(cleared.length, 'precondition: some children lost their stated parent').toBeGreaterThan(0)
  await openByDrop(page, 'unstated-parents.json', JSON.stringify(json))
  const parentsOf = async (): Promise<unknown[]> => {
    const document = await readDocument(page)
    return cleared.map((uid) => document.schedule.tasks.find((one) => one['uid'] === uid)?.['wbsParentUid'])
  }
  expect(await parentsOf(), 'precondition: the opened document states no parent for them').toEqual(cleared.map(() => null))
  // STEP: the places that use a derived parent -- the diagnosis, the pointer over a task, the parent hint (IC-141)
  await callApi(page, 'return api.readDelayDiagnostics()')
  const first = await elementBox(page, `[data-figure="task-${String(cleared[0])}-plan"]`)
  if (first !== null) {
    await page.mouse.move(first.x + first.w / 2, first.y + first.h / 2)
    await page.waitForTimeout(400)
  }
  if ((await page.locator('[data-icon="IC-141"]').count()) > 0) await press(page, 'IC-141')
  // STEP: an unrelated edit and a save write the document again
  const other = (await readDocument(page)).schedule.tasks.find((one) => !cleared.includes(one['uid']))?.['uid']
  await callApi(page, 'return api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: "setTaskName", uid: arg, name: "Renamed" }] })', other)
  await settle(page)
  expect(await parentsOf()).toEqual(cleared.map(() => null))
  const written = await callApi<{ ok: boolean; value: string }>(page, 'return api.exportJson()')
  const writtenTasks = (JSON.parse(written.value) as { schedule: { tasks: Record<string, unknown>[] } }).schedule.tasks
  expect(cleared.map((uid) => writtenTasks.find((one) => one['uid'] === uid)?.['wbsParentUid'])).toEqual(cleared.map(() => null))
})

test(`IX-12: ${SPAN_DOES_NOT_MOVE_THE_SCREEN}`, async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  const screen = async (): Promise<{ view: Record<string, unknown>; figures: string[] }> => {
    const settings = (await readDocument(page)).documentSettings
    const view = Object.fromEntries(['scrollDate', 'scrollDayOffset', 'scrollGroupId', 'scrollGroupOffset', 'zoomX', 'zoomY'].map((key) => [key, settings[key]]))
    const figures = await page.evaluate(() =>
      [...document.querySelectorAll('[data-figure$="-plan"], [data-figure*="-tick-"]')].map((e) => {
        const r = e.getBoundingClientRect()
        return `${e.getAttribute('data-figure')} ${r.x.toFixed(2)} ${r.y.toFixed(2)} ${r.width.toFixed(2)}`
      }),
    )
    return { view, figures }
  }
  const before = await screen()
  await setSpan(page, SPAN_START, SPAN_FINISH)
  expect((await readDocument(page)).documentSettings['exportSpanStart'], 'precondition: the span is set').not.toBeNull()
  expect(await screen()).toEqual(before)
})

test(`IX-13: ${SPAN_DAY_WIDTH}`, async ({ page }) => {
  const S_81 = cellOf('T-204', 'S-81', '既定')
  expect(S_81.replace(/\s/g, ''), 'precondition: the test window is the S-81 canvas').toContain(`${VIEWPORT.width}×${VIEWPORT.height}`)
  await launch(page)
  await enableAgentApi(page)
  // WHY: with the window at S-81 and both panels closed, the screen's Row Area is the one IX-13 lays out for the picture.
  const area = await boxOf(page, '[data-role="Scrollbars"][data-axis="horizontal"]')
  await setSpan(page, SPAN_START, SPAN_FINISH)
  const svg = await exportedSvg(page)
  const ticks = tagsWithFigure(svg, /-tick-\d+$/)
    .map((tag) => ({ day: Number(figureName(tag).split('-tick-')[1]), x: numberAttr(tag, 'x1') }))
    .filter((one) => Number.isFinite(one.x))
    .sort((a, b) => a.day - b.day)
  expect(ticks.length, 'precondition: the picture draws ruler ticks').toBeGreaterThan(1)
  const a = ticks[0]!
  const b = ticks[ticks.length - 1]!
  const perDay = (b.x - a.x) / (b.day - a.day)
  const days = dayNumber(SPAN_FINISH) - dayNumber(SPAN_START) + 1
  const xOf = (day: number): number => a.x + (day - a.day) * perDay
  expect(perDay).toBeCloseTo(area.w / days, 2)
  expect(xOf(dayNumber(SPAN_START))).toBeCloseTo(area.x, 1)
  expect(xOf(dayNumber(SPAN_FINISH) + 1)).toBeCloseTo(area.x + area.w, 1)
})

test(`IX-15: ${SPAN_HEIGHT}`, async ({ page }) => {
  const S_81_HEIGHT = VIEWPORT.height
  await launch(page)
  await enableAgentApi(page)
  await setSpan(page, SPAN_START, SPAN_FINISH)
  const svg = await exportedSvg(page)
  const height = numberAttr(/<svg [^>]*>/.exec(svg)?.[0] ?? '', 'height')
  const bands = tagsWithFigure(svg, /^row-.+-band$/)
  expect(bands.length, 'precondition: the picture draws row bands').toBeGreaterThan(0)
  // WHY: IX-14 stacks every row, so the lowest row band ends the stack of the four sections.
  const stacked = Math.max(...bands.map((tag) => numberAttr(tag, 'y') + numberAttr(tag, 'height')))
  expect(stacked, 'precondition: the template stacks taller than S-81').toBeGreaterThan(S_81_HEIGHT)
  const onGrid = Math.round(stacked * 100) / 100
  expect(height).toBe(Math.max(Math.ceil(onGrid), S_81_HEIGHT))
})

test(`OP-9: ${OVERLAY_ONLY_MATCHING_UIDS}`, async ({ page }) => {
  test.setTimeout(120_000)
  await launch(page)
  await enableAgentApi(page)
  await openByDrop(page, MEDIUM, readSample(MEDIUM))
  const current = new Set((await readDocument(page)).schedule.tasks.map((one) => one['uid']))
  const overlayUids = [...readSample(ERP).matchAll(/<Task>\s*<UID>(\d+)<\/UID>/g)].map((m) => Number(m[1]))
  expect(overlayUids.some((uid) => !current.has(uid)), 'precondition: the overlaid file holds UIDs the current document lacks').toBe(true)
  await openByDrop(page, ERP, readSample(ERP), 'IC-73')
  const overlaid = ((await readDocument(page)).schedule['baselineTasks'] as Record<string, unknown>[]).map((one) => one['uid'])
  expect(overlaid.length, 'precondition: the overlay holds tasks').toBeGreaterThan(0)
  expect(overlaid.filter((uid) => !current.has(uid))).toEqual([])
})

test(`HS-11: ${STAMP_OF_THE_WRITTEN_BYTES}`, async ({ page }) => {
  await launch(page)
  const writeOut = async (format: string): Promise<string> => {
    const before = (await savedFiles(page)).length
    await press(page, 'IC-2')
    await page.click(`[data-role="Export Chooser"] [data-format="${format}"]`)
    await expect.poll(async () => (await savedFiles(page)).length).toBe(before + 1)
    await settle(page)
    return (await savedFiles(page))[before]!.text
  }
  const embeddedStamp = (html: string): unknown => {
    const found = /<script type="application\/json" id="embedded-document">([\s\S]*?)<\/script>/.exec(html)
    expect(found, 'precondition: the single .html embeds the document').not.toBeNull()
    return (JSON.parse(found![1]!) as { documentStamp: Record<string, unknown> }).documentStamp['fileSavedUtc']
  }
  const shownMoment = (): Promise<string> => page.evaluate(() => (document.querySelector('[data-role="File Saved At"]')?.textContent ?? '').trim())
  // see HS-5
  const neverWritten = embeddedStamp(await writeOut('IO-7'))
  expect(neverWritten === null || neverWritten === '', `the never-saved document carried ${String(neverWritten)}`).toBe(true)
  const saved = JSON.parse(await writeOut('IO-2')) as { documentStamp: Record<string, unknown> }
  const lower = await shownMoment()
  const localOf = (utc: unknown): Promise<string> =>
    page.evaluate((utc) => {
      const at = new Date(String(utc))
      const two = (n: number): string => String(n).padStart(2, '0')
      return `${at.getFullYear()}/${two(at.getMonth() + 1)}/${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}:${two(at.getSeconds())}`
    }, utc)
  expect(lower.startsWith(await localOf(saved.documentStamp['fileSavedUtc'])), `SX-1: the saved stamp ${String(saved.documentStamp['fileSavedUtc'])} is not the moment "${lower}" shows`).toBe(true)
  const embedded = embeddedStamp(await writeOut('IO-7'))
  expect(lower.startsWith(await localOf(embedded)), `the single .html carried ${String(embedded)} while the lower line shows "${lower}"`).toBe(true)
})

test(`EP-3: ${ROW_NAME_BASELINE}`, async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  const document = await readDocument(page)
  const names = new Map(document.schedule.taskGroups.map((one) => [String(one['label']), String(one['id'])]))
  const svg = await exportedSvg(page)
  const bandTop = new Map(tagsWithFigure(svg, /^row-.+-band$/).map((tag) => [figureName(tag).slice(4, -5), numberAttr(tag, 'y')]))
  const rowTitleRight = numberAttr(/<rect x="0" y="[\d.]+" width="([\d.]+)"[^>]*>/.exec(svg)?.[0] ?? '', 'width')
  const misplaced: string[] = []
  let checked = 0
  for (const match of svg.matchAll(/<text ([^>]*)>([^<]*)<\/text>/g)) {
    const attributes = ` ${match[1] ?? ''}`
    const name = (match[2] ?? '').replace(/&amp;/g, '&')
    const groupId = names.get(name)
    if (groupId === undefined) continue
    const x = numberAttr(attributes, 'x')
    if (!(x < rowTitleRight)) continue
    const top = bandTop.get(groupId)
    if (top === undefined) continue
    checked += 1
    const expected = top + numberAttr(attributes, 'font-size')
    if (Math.abs(numberAttr(attributes, 'y') - expected) > 0.02) misplaced.push(`${name}: y ${numberAttr(attributes, 'y')} vs ${expected}`)
  }
  expect(checked, 'precondition: the picture writes row names in the Row Title Panel').toBeGreaterThan(0)
  expect(misplaced).toEqual([])
})
