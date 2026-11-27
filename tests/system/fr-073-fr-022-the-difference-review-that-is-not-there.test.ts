// System tests: a newer-version document and an unclear merge both stand the Difference Review.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { readRepoFile } from '../spec-files'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable, type SpecTable } from '../contract/spec-table'
import { DOWNLOAD_ADDRESS, DOWNLOAD_URL_SEAT } from '../fixtures/download-address'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const T025: SpecTable = specTable('T-025')
const T032A: SpecTable = specTable('T-032a')
const T103: SpecTable = specTable('T-103')
const T107: SpecTable = specTable('T-107')
const T109: SpecTable = specTable('T-109')
const T233: SpecTable = specTable('T-233')

// Spec: T-025, MC-6
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

// Spec: T-103, U-61, FR-022, FR-073
const DIFFERENCE_REVIEW = bare(rowOf(T103, 'U-61').cells[0] ?? '')

// Spec: T-103, U-57, T-233
const NOTIFICATION_AREA = bare(rowOf(T103, 'U-57').cells[0] ?? '')

// Spec: T-032a
const MERGE_CHOICES: readonly string[] = T032A.rows.map((row) => row.id)

// Spec: T-109, IC-95, IC-96, T-032a, MM-1, MM-2
// Why: IC-97 (MM-4) is left out: MG-6 puts the document back as it was, so the
// check that the unreadable column was dropped would go red for no breach.
const REVIEW_ANSWERS: readonly string[] = [rowOf(T109, 'IC-95').id, rowOf(T109, 'IC-96').id]

// Spec: T-233, RS-48
const REASON_NEWER_VERSION = rowOf(T233, 'RS-48').id

// Why: matched by its dictionary words in both languages (S-99 is not set here),
// never by the row ID, which FR-076 keeps out of what a person reads.
const REASON_WORDS: readonly string[] = (() => {
  const raw = JSON.parse(
    readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons?: { specTableRowId: string; text?: { ja?: string; en?: string } }[] }
  const found = (raw.reasons ?? []).find((one) => one.specTableRowId === REASON_NEWER_VERSION)
  const said = [found?.text?.ja ?? '', found?.text?.en ?? ''].filter((one) => one !== '')
  if (said.length === 0) {
    throw new Error(`the dictionary holds no words for ${REASON_NEWER_VERSION}`)
  }
  return said
})()

// Spec: T-107, AM-2, AM-3, AM-8, AM-11
const AM_2 = bare(rowOf(T107, 'AM-2').cells[1] ?? '')
const AM_3 = bare(rowOf(T107, 'AM-3').cells[1] ?? '')
const AM_8 = bare(rowOf(T107, 'AM-8').cells[1] ?? '')
const AM_11 = bare(rowOf(T107, 'AM-11').cells[1] ?? '')

const FR_073_DROP_ON_GOING_ON = 'FR-073 (MUST) drops the unread columns on going on, never writes them back'
const FR_024_OWN_VERSION = 'FR-024 (MUST) states this build s own format version'
const FR_073_LEAD_TO_THE_LATEST = 'FR-073 (MUST) leads to the place of the latest version'
const FR_073_A_LINK = 'FR-073 (MUST) shows that place as a link that opens a new tab'
const FR_073_NO_REFERENCE_PASSED = 'FR-073 (MUST NOT) passes the opened page no reference and no referrer'
const FR_073_NOT_COPIED_INTO_WORDS = 'FR-073 (MUST NOT) leaves no seat unfilled'

// Why: a name no schema of this build mentions is the only way to ask whether an
// unreadable column was dropped: absent from a write means dropped.
const COLUMN_FROM_THE_FUTURE = 'aColumnNoBuildOfThisToolCanRead'

// Why: raises the version the build states through AM-2, not a constant date, so
// the fixture stays newer however far the manuscript's version moves.
/** @purity pure */
function oneVersionNewerThan(known: string): string {
  const raised = `9${known.slice(1)}`
  if (!(raised > known)) {
    throw new Error(
      `this file could not build a version newer than ${JSON.stringify(known)} by string order`,
    )
  }
  return raised
}

// Spec: NFR-004, CN-1
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

// Spec: FR-065, IC-20
const AGENT_API_ENTRANCE = 'IC-20'

interface ImportOutcome {
  readonly shape: string
  readonly accepted: boolean
  readonly answer: string
}

interface Measured {
  readonly buildVersion: string
  readonly handedVersion: string
  readonly tasksBefore: number
  readonly tasksAfter: number
  readonly uidHeldBack: number
  readonly heldBackSurvived: boolean
  readonly uidsInBoth: readonly number[]
  readonly imports: readonly ImportOutcome[]
  readonly reviewStood: boolean
  readonly reviewText: string
  readonly uidsNamedOnTheSurface: readonly number[]
  readonly strangersOnTheSurface: number
  readonly noticeText: string
  readonly reasonNamed: boolean
  readonly columnSurvivedTheWrite: boolean
  readonly writtenAtBuildVersion: boolean
  readonly downloadLinks: readonly { readonly text: string; readonly target: string; readonly rel: string }[]
  readonly seatLeftOnThePage: boolean
  readonly writeAnswer: string
}

let browser: Browser | null = null
let measured: Measured | null = null
let sweepFailed: Error | null = null

test.beforeAll(async () => {
  test.setTimeout(240_000)
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error(
      'the shipped build this file presses is not there; run `npx vite build` first ' +
        '(dist/index.html)',
    )
  }
  browser = await launchReferenceBrowser()
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  const page = await context.newPage()
  try {
    await page.goto(pathToFileURL(SHIPPED_BUILD).href)
    await readSettledDrawnSvg(page)
    await openTheAgentApi(page)
    measured = await sweep(page)
  } catch (thrown) {
    sweepFailed = thrown instanceof Error ? thrown : new Error(String(thrown))
  } finally {
    await context.close()
  }
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function openTheAgentApi(page: Page): Promise<void> {
  const at = await page.evaluate((icon: string) => {
    const entry = document.querySelector(`[data-icon="${icon}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, AGENT_API_ENTRANCE)
  if (at === null) {
    throw new Error(
      `the entrance ${AGENT_API_ENTRANCE} that FR-065 has open the Agent API is not on the screen`,
    )
  }
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(800)
  const opened = await page.evaluate(
    () => typeof (window as unknown as Record<string, unknown>).grSchedulerAgentApi,
  )
  if (opened !== 'object') {
    throw new Error(`pressing ${AGENT_API_ENTRANCE} did not publish grSchedulerAgentApi`)
  }
}

// Why: not page.click, which waits on a selector and throws: an absent part is
// one of the things this file measures, so it must come back as an answer.
/** @purity non-pure */
async function pressIfThere(page: Page, icon: string): Promise<boolean> {
  const at = await page.evaluate((one: string) => {
    const entry = document.querySelector(`[data-icon="${one}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  return true
}

interface SweepArgs {
  readonly members: { readonly read: string; readonly merge: string; readonly write: string }
  readonly parts: { readonly review: string; readonly notices: string }
  readonly marks: { readonly column: string; readonly reason: string }
  readonly handedVersion: string
  readonly patienceMs: number
}

interface Begun {
  readonly tasksBefore: number
  readonly uidHeldBack: number
  readonly uidsInBoth: readonly number[]
  readonly imports: readonly ImportOutcome[]
  readonly awaiting: string
}

interface OnScreen {
  readonly reviewStood: boolean
  readonly reviewText: string
  readonly uidsNamedOnTheSurface: readonly number[]
  readonly strangersOnTheSurface: number
  readonly noticeText: string
  readonly reasonNamed: boolean
  readonly downloadLinks: readonly { readonly text: string; readonly target: string; readonly rel: string }[]
  readonly seatLeftOnThePage: boolean
}

interface Finished {
  readonly tasksAfter: number
  readonly heldBackSurvived: boolean
  readonly columnSurvivedTheWrite: boolean
  readonly writtenAtBuildVersion: boolean
  readonly writeAnswer: string
  readonly awaited: { readonly settled: boolean; readonly accepted: boolean; readonly answer: string } | null
}

// Why: three visits, because FR-022 has AM-8 wait on a person, and no person can
// press while a page.evaluate runs; awaiting AM-8 inside one is a deadlock.
/** @purity non-pure */
async function sweep(page: Page): Promise<Measured> {
  const buildVersion = await page.evaluate((member: string) => {
    const api = (window as unknown as Record<string, Record<string, unknown> | undefined>)
      .grSchedulerAgentApi
    return String(api?.[member] ?? '')
  }, AM_2)
  const handedVersion = oneVersionNewerThan(buildVersion)

  const args: SweepArgs = {
    members: { read: AM_3, merge: AM_8, write: AM_11 },
    parts: { review: DIFFERENCE_REVIEW, notices: NOTIFICATION_AREA },
    marks: { column: COLUMN_FROM_THE_FUTURE, reason: REASON_NEWER_VERSION },
    handedVersion,
    // Why: a ceiling, not a delay: every wait races it, so a promise that never
    // settles is reported rather than left to hang the hook.
    patienceMs: 4_000,
  }

  const begun: Begun = await page.evaluate(async (given: SweepArgs) => {
    type Bag = Record<string, unknown>
    const api = (window as unknown as Record<string, Bag | undefined>).grSchedulerAgentApi ?? {}
    const call = (member: string, arg?: unknown): unknown => {
      const fn = api[member]
      if (typeof fn !== 'function') return { notAFunction: member }
      try {
        return (fn as (a?: unknown) => unknown).call(api, arg)
      } catch (thrown) {
        return { threw: String(thrown) }
      }
    }
    const tasksOf = (doc: unknown): Bag[] => {
      const schedule = (doc as { schedule?: { tasks?: unknown } } | null)?.schedule
      const tasks = schedule?.tasks
      return Array.isArray(tasks) ? (tasks as Bag[]) : []
    }
    // Summary: drops every array member that points at a UID this fixture removed.
    const forget = (node: unknown, gone: number): unknown => {
      if (Array.isArray(node)) {
        return node
          .filter(
            (item) =>
              !(
                item !== null &&
                typeof item === 'object' &&
                Object.entries(item as Bag).some(
                  ([key, value]) => /uid$/i.test(key) && value === gone,
                )
              ),
          )
          .map((item) => forget(item, gone))
      }
      if (node !== null && typeof node === 'object') {
        const out: Bag = {}
        for (const [key, value] of Object.entries(node as Bag)) out[key] = forget(value, gone)
        return out
      }
      return node
    }

    // Why: AM-3 leaves out the required carry fields unless includeCarry is true (CR-796);
    // without them the handed document no longer fits the schema and FR-073 refuses it with RS-64.
    const open = call(given.members.read, true)
    const before = tasksOf(open)
    if (before.length < 2) throw new Error('the open document holds fewer than two tasks')
    const uidHeldBack = Number(before[before.length - 1]?.uid)

    const handed = forget(JSON.parse(JSON.stringify(open)), uidHeldBack) as Bag & {
      schedule?: { project?: Bag }
    }
    handed.schemaVersion = given.handedVersion
    const handedTasks = tasksOf(handed)
    const first = handedTasks[0]
    if (first !== undefined) first[given.marks.column] = 'carried, not dropped'
    const project = handed.schedule?.project
    if (project !== undefined) project[given.marks.column] = 'carried, not dropped'
    const uidsInBoth = handedTasks.map((task) => Number(task.uid))

    const reading = (answer: unknown): { accepted: boolean; answer: string } => {
      const bag = answer as { accepted?: unknown; ok?: unknown } | null
      return {
        accepted:
          typeof bag === 'object' && bag !== null && bag.accepted !== false && bag.ok !== false,
        // Trap: JSON.stringify returns undefined for an undefined answer, and .slice on
        // that throws inside the page where nothing catches it.
        answer: String(JSON.stringify(answer) ?? 'undefined').slice(0, 400),
      }
    }

    // Why: the argument shape is not settled by the spec, so the bare document is
    // tried first and the wrapped form second.
    // Why: the answer is raced, not awaited: FR-022 has AM-8 wait on a person, so
    // an unsettled promise is handed on to the third visit.
    const imports: { shape: string; accepted: boolean; answer: string }[] = []
    let awaiting = ''
    for (const [shape, arg] of [
      ['the document itself', handed],
      ['{ document }', { document: handed }],
    ] as [string, unknown][]) {
      // Why: the rejection is taken on the call; a promise left unhandled would be
      // reported by the page before the third visit reaches it.
      const asked = Promise.resolve(call(given.members.merge, arg)).then(
        (value: unknown) => ({ settled: true, value }),
        (thrown: unknown) => ({ settled: true, value: { threw: String(thrown) } }),
      )
      const raced = (await Promise.race([
        asked,
        new Promise((settle) =>
          window.setTimeout(() => settle({ settled: false, value: null }), given.patienceMs),
        ),
      ])) as { settled: boolean; value: unknown }
      if (!raced.settled) {
        awaiting = shape
        ;(window as unknown as Record<string, unknown>).__grsAwaitedMerge = asked
        break
      }
      const seen = reading(raced.value)
      imports.push({ shape, accepted: seen.accepted, answer: seen.answer })
      if (seen.accepted) break
    }

    return { tasksBefore: before.length, uidHeldBack, uidsInBoth, imports, awaiting }
  }, args)

  // Spec: OP-3, IC-72
  await page.waitForTimeout(1_500)
  await pressIfThere(page, rowOf(T109, 'IC-72').id)

  // Why: the surface is given time to draw outside the evaluate: a frame is
  // painted between two visits and never during one.
  await page.waitForTimeout(1_500)

  const onScreen: OnScreen = await page.evaluate(
    (given: {
      review: string
      notices: string
      reasonWords: string[]
      uidsInBoth: number[]
      address: string
      seat: string
    }) => {
      const textOf = (role: string): string =>
        Array.from(document.querySelectorAll(`[data-role="${role}"]`))
          .map((node) => (node.textContent ?? '').trim())
          .join(' | ')
      // Trap: textContent over the whole surface runs leaf words together, so a name
      // ending in 1 above UID 133 reads as 1133; each leaf is read on its own.
      const leafWordsOf = (role: string): string[] => {
        const words: string[] = []
        for (const surface of Array.from(document.querySelectorAll(`[data-role="${role}"]`))) {
          const leaves = Array.from(surface.querySelectorAll('*')).filter(
            (node) => node.childElementCount === 0,
          )
          const read = leaves.length === 0 ? [surface] : leaves
          for (const node of read) words.push((node.textContent ?? '').trim())
        }
        return words
      }
      const reviewText = textOf(given.review)
      const shared = new Set(given.uidsInBoth)
      const printed = leafWordsOf(given.review).flatMap((said) =>
        (said.match(/\d+/g) ?? []).map(Number),
      )
      const onPage = document.body.textContent ?? ''
      return {
        reviewStood: document.querySelector(`[data-role="${given.review}"]`) !== null,
        reviewText,
        uidsNamedOnTheSurface: given.uidsInBoth.filter((uid) => printed.includes(uid)),
        strangersOnTheSurface: printed.filter((n) => !shared.has(n)).length,
        noticeText: textOf(given.notices),
        reasonNamed: given.reasonWords.some((said) => onPage.includes(said)),
        downloadLinks: Array.from(document.querySelectorAll('a'))
          .filter((link) => link.getAttribute('href') === given.address)
          .map((link) => ({
            text: (link.textContent ?? '').trim(),
            target: link.getAttribute('target') ?? '',
            rel: link.getAttribute('rel') ?? '',
          })),
        seatLeftOnThePage: onPage.includes(given.seat),
      }
    },
    {
      review: DIFFERENCE_REVIEW,
      notices: NOTIFICATION_AREA,
      reasonWords: [...REASON_WORDS],
      uidsInBoth: [...begun.uidsInBoth],
      address: DOWNLOAD_ADDRESS,
      seat: DOWNLOAD_URL_SEAT,
    },
  )

  // Why: a real pointer press on a T-109 entrance, the road a person has; this
  // only records which entrance answered and asserts nothing.
  let answeredThrough = ''
  if (begun.awaiting !== '') {
    for (const entrance of REVIEW_ANSWERS) {
      if (await pressIfThere(page, entrance)) {
        answeredThrough = entrance
        break
      }
    }
    await page.waitForTimeout(1_000)
  }

  const finished: Finished = await page.evaluate(
    async (given: {
      members: { read: string; write: string }
      column: string
      uidHeldBack: number
      patienceMs: number
      buildVersion: string
      handedVersion: string
    }) => {
      type Bag = Record<string, unknown>
      const api = (window as unknown as Record<string, Bag | undefined>).grSchedulerAgentApi ?? {}
      const call = (member: string): unknown => {
        const fn = api[member]
        if (typeof fn !== 'function') return { notAFunction: member }
        try {
          return (fn as () => unknown).call(api)
        } catch (thrown) {
          return { threw: String(thrown) }
        }
      }
      const tasksOf = (doc: unknown): Bag[] => {
        const schedule = (doc as { schedule?: { tasks?: unknown } } | null)?.schedule
        const tasks = schedule?.tasks
        return Array.isArray(tasks) ? (tasks as Bag[]) : []
      }

      const stashed = (window as unknown as Record<string, unknown>).__grsAwaitedMerge as
        | Promise<{ settled: boolean; value: unknown }>
        | undefined
      let awaited: { settled: boolean; accepted: boolean; answer: string } | null = null
      if (stashed !== undefined) {
        const raced = (await Promise.race([
          stashed,
          new Promise((settle) =>
            window.setTimeout(() => settle({ settled: false, value: null }), given.patienceMs),
          ),
        ])) as { settled: boolean; value: unknown }
        const bag = raced.value as { accepted?: unknown; ok?: unknown } | null
        awaited = {
          settled: raced.settled,
          accepted:
            raced.settled &&
            typeof bag === 'object' &&
            bag !== null &&
            bag.accepted !== false &&
            bag.ok !== false,
          answer: String(JSON.stringify(raced.value) ?? 'undefined').slice(0, 400),
        }
      }

      const after = tasksOf(call(given.members.read))
      const written = String(JSON.stringify(call(given.members.write)) ?? 'undefined')
      return {
        tasksAfter: after.length,
        heldBackSurvived: after.some((task) => Number(task.uid) === given.uidHeldBack),
        columnSurvivedTheWrite: written.includes(given.column),
        writtenAtBuildVersion: written.includes(given.buildVersion) && !written.includes(given.handedVersion),
        writeAnswer: written.slice(0, 300),
        awaited,
      }
    },
    {
      members: { read: AM_3, write: AM_11 },
      column: COLUMN_FROM_THE_FUTURE,
      uidHeldBack: begun.uidHeldBack,
      patienceMs: args.patienceMs,
      buildVersion,
      handedVersion,
    },
  )

  const imports: ImportOutcome[] = [...begun.imports]
  if (begun.awaiting !== '') {
    const late = finished.awaited
    imports.push({
      shape: begun.awaiting,
      accepted: late !== null && late.settled && late.accepted,
      answer:
        late !== null && late.settled
          ? late.answer
          : `it raised no answer of its own and is still waiting on a person; ` +
            (answeredThrough === ''
              ? `no entrance of ${REVIEW_ANSWERS.join(' / ')} was on the screen to answer through`
              : `${answeredThrough} was pressed and the answer still did not come`),
    })
  }

  return {
    buildVersion,
    handedVersion,
    tasksBefore: begun.tasksBefore,
    tasksAfter: finished.tasksAfter,
    uidHeldBack: begun.uidHeldBack,
    heldBackSurvived: finished.heldBackSurvived,
    uidsInBoth: begun.uidsInBoth,
    imports,
    reviewStood: onScreen.reviewStood,
    reviewText: onScreen.reviewText,
    uidsNamedOnTheSurface: onScreen.uidsNamedOnTheSurface,
    strangersOnTheSurface: onScreen.strangersOnTheSurface,
    noticeText: onScreen.noticeText,
    reasonNamed: onScreen.reasonNamed,
    columnSurvivedTheWrite: finished.columnSurvivedTheWrite,
    writtenAtBuildVersion: finished.writtenAtBuildVersion,
    downloadLinks: onScreen.downloadLinks,
    seatLeftOnThePage: onScreen.seatLeftOnThePage,
    writeAnswer: finished.writeAnswer,
  }
}

/** @purity pure */
function taken(): Measured {
  if (sweepFailed !== null) throw sweepFailed
  if (measured === null) throw new Error('the sweep did not run')
  return measured
}

// Spec: FR-073, FR-024, T-107, AM-2
test('FR-073 -- the format version is a UTC instant to the second, in one fixed shape', () => {
  const seen = taken().buildVersion
  expect(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(seen),
    `AM-2 states the format version as ${JSON.stringify(seen)}, which is not YYYY-MM-DDTHH:MM:SSZ`,
  ).toBe(true)
})

// Spec: FR-073, FR-022, T-032, MG-1, T-103, U-61, T-233, RS-48, S-350
// Why: no swsCase is declared: no SWS node is about the difference review (TW-2),
// so the rows are named here instead.
// Trap: keep this case, the one that can go red, last in the file: a failure
// followed by another case was measured to leave the run unfinished.
test('FR-073 / FR-022 / MG-1 -- a newer document is shown, asked about, and dropped on going on', () => {
  const m = taken()
  const unmet: string[] = []

  if (!(m.handedVersion > m.buildVersion)) {
    unmet.push(
      `the handed version ${m.handedVersion} did not order after the build's ${m.buildVersion}`,
    )
  }

  const accepted = m.imports.find((outcome) => outcome.accepted)
  if (accepted === undefined) {
    unmet.push(
      `${AM_8} refused a document whose only fault is a newer format version; it answered ` +
        m.imports.map((outcome) => `${outcome.shape} -> ${outcome.answer}`).join(' ;; '),
    )
  }

  if (!m.reviewStood) {
    unmet.push(
      `no part named ${JSON.stringify(DIFFERENCE_REVIEW)} (U-61) stood after a newer-version ` +
        `document was handed over; the ${NOTIFICATION_AREA} said ${JSON.stringify(m.noticeText)}`,
    )
  }

  if (!m.reviewText.includes(COLUMN_FROM_THE_FUTURE)) {
    unmet.push(
      `the surface did not name the column it could not read (${COLUMN_FROM_THE_FUTURE}); it ` +
        `said ${JSON.stringify(m.reviewText.slice(0, 200))}`,
    )
  }

  if (!m.reasonNamed) {
    unmet.push(
      `nothing on the screen told ${REASON_NEWER_VERSION} of table T-233 in either of its ` +
        `words (${REASON_WORDS.map((said) => JSON.stringify(said)).join(' / ')}); the ` +
        `${NOTIFICATION_AREA} said ${JSON.stringify(m.noticeText.slice(0, 200))}`,
    )
  }

  if (m.columnSurvivedTheWrite) {
    unmet.push(
      `${FR_073_DROP_ON_GOING_ON} -- the column that could not be read was written back by ${AM_11}: ` +
        `the written document carries ${COLUMN_FROM_THE_FUTURE} (answer began ${JSON.stringify(m.writeAnswer)})`,
    )
  }
  if (!m.writtenAtBuildVersion) {
    unmet.push(
      `${FR_024_OWN_VERSION} -- ${AM_11} did not state the build's version ${m.buildVersion} ` +
        `(answer began ${JSON.stringify(m.writeAnswer)})`,
    )
  }
  const link = m.downloadLinks[0]
  if (m.downloadLinks.length === 0 || link === undefined) {
    unmet.push(`${FR_073_LEAD_TO_THE_LATEST} -- no link on the page has S-350 as its href`)
  } else {
    if (link.text !== DOWNLOAD_ADDRESS) {
      unmet.push(`${FR_073_A_LINK} -- the link reads ${JSON.stringify(link.text)}, not S-350`)
    }
    if (link.target !== '_blank') {
      unmet.push(`${FR_073_A_LINK} -- the link opens in ${JSON.stringify(link.target)}, not a new tab`)
    }
    const rel = link.rel.split(/\s+/)
    if (!rel.includes('noopener') || !rel.includes('noreferrer')) {
      unmet.push(`${FR_073_NO_REFERENCE_PASSED} -- the link's rel is ${JSON.stringify(link.rel)}`)
    }
  }
  if (m.seatLeftOnThePage) {
    unmet.push(`${FR_073_NOT_COPIED_INTO_WORDS} -- the seat ${DOWNLOAD_URL_SEAT} is printed on the page`)
  }

  // Why: choices only is measured as a surface that names none of the tasks that
  // could correspond, whatever it shows of the T-032a choices.
  if (m.uidsNamedOnTheSurface.length === 0) {
    unmet.push(
      `the surface listed none of the ${m.uidsInBoth.length} tasks that could correspond before ` +
        `asking; table T-032a offers ${MERGE_CHOICES.length} choices ` +
        `(${MERGE_CHOICES.join(', ')}) and the surface said ` +
        JSON.stringify(m.reviewText.slice(0, 200)),
    )
  }

  // Why: candidates are gathered by UID match, so a number that is no shared UID
  // is a stranger on the surface.
  if (m.strangersOnTheSurface > 0) {
    unmet.push(
      `${m.strangersOnTheSurface} number(s) on the surface are no UID the two documents share, ` +
        'so the candidates were not gathered by UID match',
    )
  }

  // Why: a merge accepted with no surface standing means the tool settled
  // sameness itself; a refusal is the separate breach recorded above.
  if (accepted !== undefined && !m.reviewStood) {
    unmet.push(
      `${AM_8} accepted the merge (${accepted.shape}) with no ${DIFFERENCE_REVIEW} standing, ` +
        'so sameness was settled without anyone being asked',
    )
  }

  if (!m.heldBackSurvived) {
    unmet.push(
      `the task with UID ${m.uidHeldBack}, which the handed document left out, is gone: ` +
        `${m.tasksBefore} tasks before, ${m.tasksAfter} after`,
    )
  }

  if (!m.reviewStood) {
    unmet.push(
      "MG-1 could not tell the handed file's provenance apart and asked no one: the " +
        `${DIFFERENCE_REVIEW} surface it must ask on is not in the page`,
    )
  }

  expect(
    unmet,
    `the shipped build did not meet ${unmet.length} clause(s) of FR-073 / FR-022 / MG-1:\n  - ` +
      unmet.join('\n  - '),
  ).toEqual([])
})
