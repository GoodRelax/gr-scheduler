// W3 spec-only cases for FR-076 table T-037 NT-7: a standing question takes no write (RS-27 on the screen, AG-9 for the Agent API) and asks in a y / n form.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { openDocument, openStage, pressEntrance, reasonWords, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const NT_7_NO_WRITE =
  '画面からの書き込み（取り消し・やり直しを含む）は 表 T-233 の `RS-27` として捨て（同行は出さない —— 問いが画面に立っているので、受けなかったことは見える）、`Agent API` の書き込みは 表 T-035 の `AG-9` のとおり拒むこと（MUST）'
const NT_7_YES_NO = '（`05-07-design.md` の 表 T-067 の `WS-2` と同じ例外である）。⚠️ **問いの文は、`y` / `n` で答えられる形にすること（MUST）'

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly questions: readonly { readonly rowId: string; readonly text: { readonly ja: string; readonly en: string } }[]
}

const CONFIRMATION = `[data-role="${bare(rowOf(specTable('T-103'), 'U-55').cells[0] ?? '')}"]`
const NOTIFICATION_AREA = `[data-role="${bare(rowOf(specTable('T-103'), 'U-57').cells[0] ?? '')}"]`

// WHY: T-234 also holds the words of two surfaces that are not the y / n Confirmation -- a row that says so
// itself, and the row the Watermark Unlock surface (U-60, answered by typing) names as its question.
const NOT_ON_THE_CONFIRMATION = new Set([
  ...specTable('T-234')
    .rows.filter((row) => row.cells.join(' ').includes('`NT-7` の問いではない'))
    .map((row) => row.id),
  ...(rowOf(specTable('T-103'), 'U-60').cells.join(' ').match(/QN-\d+/g) ?? []),
])

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { $schema: string; schemaVersion: string; schedule: Record<string, any>; documentSettings: Record<string, unknown>; documentStamp: unknown }

// WHY: January 2026 runs Mon 5 .. Fri 9, Sat 10; the template calendar works Mon-Fri and has no January exception.
const day = (dayOfMonth: number, time = '08:00:00'): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}T${time}`
const ROW = '5c000000-0000-4000-8000-000000072021'

/** @purity pure */
function fixture(): string {
  const built = {
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      ...TEMPLATE.schedule,
      project: { ...TEMPLATE.schedule['project'], statusDate: null, uidHighWaterMark: 100 },
      tasks: [
        {
          uid: 1,
          wbsParentUid: null,
          wbsOrder: 1,
          name: 'Alpha',
          start: day(5),
          finish: day(7, '17:00:00'),
          milestone: false,
          deadline: null,
          notes: null,
          calendarUid: null,
          actualStart: null,
          actualFinish: null,
          stop: null,
          resume: null,
          resumeValid: null,
          percentComplete: 0,
          fadeInDays: null,
          fadeOutDays: null,
          dependencies: [],
          carry: {},
          carryElements: [],
        },
      ],
      resources: [],
      assignments: [],
      taskGroups: [{ ...TEMPLATE.schedule['taskGroups'][0], id: ROW, parentId: null, label: 'Row A', order: 0, treeState: 'auto', minHeight: null }],
      taskGroupMembers: [{ taskUid: 1, groupId: ROW }],
      taskVisuals: [{ taskUid: 1, shapeKind: null, milestoneGlyph: null, fillColor: null, strokeColor: null, strokeWidthPx: null }],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...TEMPLATE.documentSettings, zoomX: 6, scrollDate: '2025-12-20T00:00:00', scrollDayOffset: 0, scrollGroupId: ROW, scrollGroupOffset: 0 },
    documentStamp: TEMPLATE.documentStamp,
    changeLog: [],
  }
  expect(validateDocument(built).errors, 'the fixture is a document the schema accepts').toEqual([])
  return JSON.stringify(built)
}

interface Held {
  readonly name: string
  readonly tasks: number
  readonly stamp: unknown
}

/** @purity semi-pure-b */
async function readHeld(page: Page): Promise<Held> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi: { readDocument(): any; readStamp(): unknown } }).grSchedulerAgentApi
    const held = api.readDocument()
    return { name: String(held.schedule.tasks[0].name), tasks: Number(held.schedule.tasks.length), stamp: api.readStamp() }
  })
}

/** @purity non-pure */
async function rename(page: Page, name: string): Promise<{ accepted: boolean }> {
  return page.evaluate((wanted: string) => {
    const api = (window as unknown as { grSchedulerAgentApi: { readStamp(): unknown; applyCommands(request: unknown): { accepted: boolean } } })
      .grSchedulerAgentApi
    return api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: 'setTaskName', uid: 1, name: wanted }] })
  }, name)
}

/** @purity semi-pure-b */
async function textOf(page: Page, selector: string): Promise<string | null> {
  return page.evaluate((wanted: string) => {
    const found = document.querySelector(wanted)
    return found === null ? null : (found.textContent ?? '')
  }, selector)
}

// see FR-032, QN-10, IC-106
// WHY: deleting every row owes a write bundle, so the question it raises holds the document as NT-7 says.
/** @purity non-pure */
async function askToDeleteEveryRow(page: Page): Promise<void> {
  expect(await pressEntrance(page, 'IC-106'), 'IC-106 is on the screen').toBe(true)
  await settle(page)
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function askedStage(): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  const opened = await openStage(browser)
  await openDocument(opened.page, 'w3-t1-question.json', fixture())
  expect((await rename(opened.page, 'Renamed')).accepted, 'premise: one undoable edit stands in the history').toBe(true)
  await settle(opened.page)
  await askToDeleteEveryRow(opened.page)
  expect(await textOf(opened.page, CONFIRMATION), 'premise: QN-10 stands').not.toBeNull()
  return opened
}

test.describe('W3-T1 the manuscript these cases are driven by', () => {
  test('NT-7 still reads this way', () => {
    for (const clause of [NT_7_NO_WRITE, NT_7_YES_NO]) expect(REQUIREMENTS, clause).toContain(clause)
    expect([...NOT_ON_THE_CONFIRMATION].sort(), 'premise: the two rows that are not y / n questions').toEqual(['QN-12', 'QN-9'])
  })
})

test.describe(`NT-7 (MUST): ${NT_7_YES_NO.slice(-30)}`, () => {
  test('every Confirmation question in table T-234 is a yes / no question in both languages', () => {
    const asked = WORDS.questions.filter((one) => !NOT_ON_THE_CONFIRMATION.has(one.rowId))
    expect(asked.length, 'premise: the dictionary holds the questions').toBeGreaterThan(5)
    for (const one of asked) {
      expect(one.text.ja, `${one.rowId} ja asks with ...ka?`).toMatch(/か？/)
      expect(one.text.en, `${one.rowId} en asks a closed question`).toMatch(/\?/)
      expect(one.text.en, `${one.rowId} en is not an open question`).not.toMatch(/^(What|Which|Where|When|Who|How|Why)\b/)
    }
  })

  test('on the shipped build, the QN-10 question on the screen ends its asking sentence with a question mark', async () => {
    const opened = await askedStage()
    try {
      const said = (await textOf(opened.page, CONFIRMATION)) ?? ''
      expect(said).toMatch(/[?？]/)
      await opened.page.keyboard.press('n')
      await settle(opened.page)
    } finally {
      await opened.close()
    }
  })
})

test.describe(`NT-7 (MUST): ${NT_7_NO_WRITE.slice(-40)}`, () => {
  test.setTimeout(180_000)

  test('a screen undo while QN-10 stands is told by RS-27 and writes nothing', async () => {
    const opened = await askedStage()
    try {
      const before = await readHeld(opened.page)
      await opened.page.keyboard.press('Control+z')
      await settle(opened.page)
      const after = await readHeld(opened.page)
      expect(after.name, 'the undo is thrown away: the name stays').toBe('Renamed')
      expect(after.tasks, 'the rows are not deleted either').toBe(before.tasks)
      const told = (await textOf(opened.page, NOTIFICATION_AREA)) ?? ''
      expect(reasonWords('RS-27').some((words) => told.includes(words)), `RS-27 is told; the area said: ${told}`).toBe(true)
      expect(await textOf(opened.page, CONFIRMATION), 'the question still stands').not.toBeNull()
      await opened.page.keyboard.press('n')
      await settle(opened.page)
    } finally {
      await opened.close()
    }
  })

  test('an Agent API write while QN-10 stands is refused and writes nothing', async () => {
    const opened = await askedStage()
    try {
      const answer = await rename(opened.page, 'Agent')
      expect(answer.accepted).toBe(false)
      expect((await readHeld(opened.page)).name).toBe('Renamed')
      await opened.page.keyboard.press('n')
      await settle(opened.page)
    } finally {
      await opened.close()
    }
  })
})
