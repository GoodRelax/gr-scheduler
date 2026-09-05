// A document whose format version is newer than this build knows, and a merge
// that cannot tell one master from another, end at ONE surface -- `U-61`
// `Difference Review` of table T-103 -- and both must show what differs before
// anyone is asked to choose. This file presses that surface on the shipped
// build and measures whether it stands, whether it lists what could not be
// read, and -- the part that matters most -- whether what could not be read is
// still there after the document is written out again.
//
// ⛔⛔ THIS FILE IS EXPECTED TO GO RED, and that is its purpose. Measured
// 2026-09-05 on the shipped build: `[data-role]` names 21 parts and
// `Difference Review` is not among them, and `AM-8` `importDocument` of table
// T-107 -- the one road the specification gives a caller for import and merge
// -- answers `notAvailable`. A red case here is an anchor that keeps ringing
// until the clauses quoted below are built. ⛔ DO NOT LOWER AN EXPECTATION TO
// MAKE IT GREEN.
//
// ⛔ WHAT WAS READ OF `src/`: nothing. Every handle used here is one the
// neighbouring System files already lean on (`[data-role]`, `[data-icon]`), and
// the specification settles none of them -- `tests/system/live-app.ts` says so
// of `DRAWN_SVG`. The published identifier `grSchedulerAgentApi` IS settled:
// `_assets/tbl-glossary.md` names it above table T-107, and `AM-2` / `AM-3` /
// `AM-8` / `AM-11` name the four members this file reads and writes through.
//
// ⭐ THE CLAUSES PINNED HERE ARE QUOTED VERBATIM, in Japanese, beside the
// judgement that presses each one, with the row that carries it. Rule 03
// section 5 bans TRANSLATING the manuscript into the tree; a quotation is not a
// translation, and 164 of this project's 175 test files already carry the
// manuscript's own words. A clause is quoted only where a judgement below
// actually presses it.
//
// ⛔ NO `swsCase` IS DECLARED. Table T-219 row `TW-2` has Chapter 9's cases
// generated from those declarations and hung from an `SWS-xxx` node of Chapter
// 6.1, and none of today's nodes is about the difference review. The rows each
// judgement leans on are named in prose instead, as
// `tests/system/three-rows-read-from-the-spec-alone.test.ts` does.
//
// ⭐ ONE LAUNCH, ONE SWEEP. Every measurement below is taken in a single run of
// the shipped build, and the cases only judge what was measured.
// ⛔ The one case that can go red is the LAST in the file: a failure followed by
// another case has been measured in this project to leave the run unfinished.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

// ---------------------------------------------------------------------------
// What the specification says, read at read time
// ---------------------------------------------------------------------------

const T025: SpecTable = specTable('T-025')
const T032A: SpecTable = specTable('T-032a')
const T103: SpecTable = specTable('T-103')
const T107: SpecTable = specTable('T-107')
const T233: SpecTable = specTable('T-233')

/** The screen of the base environment: table T-025, row `MC-6`. */
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

/**
 * The settled name of the surface both `FR-022` and `FR-073` send the person
 * to -- row `U-61` of table T-103, read out of the glossary rather than spelled
 * here, so renaming the part moves this file with it.
 */
const DIFFERENCE_REVIEW = bare(rowOf(T103, 'U-61').cells[0] ?? '')

/** The `Notification Area` (row `U-57`), where a reason of table T-233 stands. */
const NOTIFICATION_AREA = bare(rowOf(T103, 'U-57').cells[0] ?? '')

/** The choices of table T-032a, by row ID, in the order the table writes them. */
const MERGE_CHOICES: readonly string[] = T032A.rows.map((row) => row.id)

/** `RS-48` -- the reason a newer-version document's telling carries. */
const REASON_NEWER_VERSION = rowOf(T233, 'RS-48').id

/** The `Agent API` members of table T-107 this file goes through. */
const AM_2 = bare(rowOf(T107, 'AM-2').cells[1] ?? '')
const AM_3 = bare(rowOf(T107, 'AM-3').cells[1] ?? '')
const AM_8 = bare(rowOf(T107, 'AM-8').cells[1] ?? '')
const AM_11 = bare(rowOf(T107, 'AM-11').cells[1] ?? '')

// ---------------------------------------------------------------------------
// The fixture's two inventions
// ---------------------------------------------------------------------------

/**
 * A column no build of this tool can read, planted on a `Task` and on the
 * `Project` of the handed document.
 *
 * ⭐ THIS IS THE WHOLE EXPERIMENT. `FR-073` (MUST) has an unreadable column
 * carried, not interpreted and not dropped, and names `Carry` as the vessel
 * that already exists for it. A name no schema of this build mentions is the
 * only way to ask whether the vessel was used: if it survives a write of the
 * document, the column was carried; if it does not, it was dropped.
 */
const COLUMN_FROM_THE_FUTURE = 'aColumnNoBuildOfThisToolCanRead'

/**
 * A format version strictly greater than whatever the build states, by the
 * comparison `FR-073` settles.
 *
 * ⚠️ Not a constant date. The build states its own version through `AM-2`, and
 * this file raises THAT, so the fixture stays newer however far the manuscript's
 * version moves. The lexicographic order the requirement relies on is what
 * makes a plain string comparison enough.
 *
 * @purity pure
 */
function oneVersionNewerThan(known: string): string {
  const raised = `9${known.slice(1)}`
  if (!(raised > known)) {
    throw new Error(
      `this file could not build a version newer than ${JSON.stringify(known)} by string order`,
    )
  }
  return raised
}

// ---------------------------------------------------------------------------
// Driving the shipped build
// ---------------------------------------------------------------------------

/**
 * ⛔ THE DELIVERABLE, not the sources and not the dev server. `NFR-004` row
 * `CN-1` has `dist/` hold exactly one file and that file be the `.html`.
 */
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

/** `FR-065` keeps the `Agent API` shut until a person opens it -- row `IC-20`. */
const AGENT_API_ENTRANCE = 'IC-20'

interface ImportOutcome {
  readonly shape: string
  readonly accepted: boolean
  readonly answer: string
}

interface Measured {
  /** `AM-2`: the format version this build reads and writes. */
  readonly buildVersion: string
  /** The raised version the handed document declares. */
  readonly handedVersion: string
  /** How many tasks the document held before the merge was handed over. */
  readonly tasksBefore: number
  /** How many it holds after. */
  readonly tasksAfter: number
  /** A UID left out of the handed document, which a merge may not delete. */
  readonly uidHeldBack: number
  /** Whether that UID is still in the document after the hand-over. */
  readonly heldBackSurvived: boolean
  /** The UIDs the handed document and the open one share. */
  readonly uidsInBoth: readonly number[]
  /** What `AM-8` answered, for each argument shape tried. */
  readonly imports: readonly ImportOutcome[]
  /** Whether a part named `Difference Review` stood after the hand-over. */
  readonly reviewStood: boolean
  /** Everything that surface said, or `''` while it does not stand. */
  readonly reviewText: string
  /** Which shared UIDs that surface named. */
  readonly uidsNamedOnTheSurface: readonly number[]
  /** How many numbers the surface printed that are no shared UID at all. */
  readonly strangersOnTheSurface: number
  /** Everything the `Notification Area` said after the hand-over. */
  readonly noticeText: string
  /** Whether the reason `RS-48` was named anywhere on the screen. */
  readonly reasonNamed: boolean
  /** Whether `AM-11`'s written document still carries the unreadable column. */
  readonly columnSurvivedTheWrite: boolean
  /** The beginning of `AM-11`'s answer, for the message when it wrote nothing. */
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
  // ⛔ THE HOOK'S OWN ALLOWANCE, NOT AN ASSERTION'S. `CLEARING_UP_MS` of
  // `./live-app` carries the measurements and the reason.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** Press an entrance of table T-109 with a real pointer. @purity non-pure */
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

/** What the page hands back; every field is plain JSON. */
interface SweepArgs {
  readonly members: { readonly read: string; readonly merge: string; readonly write: string }
  readonly parts: { readonly review: string; readonly notices: string }
  readonly marks: { readonly column: string; readonly reason: string }
  readonly handedVersion: string
}

/**
 * The whole experiment, in one visit: read the open document, hand back a
 * newer-version copy of it that is missing one task and carries a column no
 * build can read, then look at what stands and at what a write still holds.
 *
 * @purity non-pure
 */
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
  }

  const seen = await page.evaluate(async (given: SweepArgs) => {
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
    /** Drop every array member that points at a UID this fixture removed. */
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

    const open = call(given.members.read)
    const before = tasksOf(open)
    if (before.length < 2) throw new Error('the open document holds fewer than two tasks')
    const uidHeldBack = Number(before[before.length - 1]?.uid)

    // The handed document: the same schedule with the last task held back, a
    // raised format version, and a column no build can read on the first task
    // and on the project.
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

    // ⚠️ THE ARGUMENT SHAPE IS NOT SETTLED BY THE SPECIFICATION. `AM-8` is
    // named as "import and merge" and paired with `AM-3`, so the document
    // itself is tried first and the wrapped form second; whichever is accepted
    // is the one reported.
    const imports: { shape: string; accepted: boolean; answer: string }[] = []
    for (const [shape, arg] of [
      ['the document itself', handed],
      ['{ document }', { document: handed }],
    ] as [string, unknown][]) {
      const answer = (await Promise.resolve(call(given.members.merge, arg))) as {
        accepted?: unknown
        ok?: unknown
      } | null
      const accepted =
        typeof answer === 'object' &&
        answer !== null &&
        answer.accepted !== false &&
        answer.ok !== false
      imports.push({ shape, accepted, answer: JSON.stringify(answer).slice(0, 400) })
      if (accepted) break
    }

    await new Promise((settle) => window.setTimeout(settle, 1500))

    const textOf = (role: string): string =>
      Array.from(document.querySelectorAll(`[data-role="${role}"]`))
        .map((node) => (node.textContent ?? '').trim())
        .join(' | ')
    const reviewStood = document.querySelector(`[data-role="${given.parts.review}"]`) !== null
    const reviewText = textOf(given.parts.review)
    const shared = new Set(uidsInBoth)
    const printed = (reviewText.match(/\d+/g) ?? []).map(Number)
    const uidsNamedOnTheSurface = uidsInBoth.filter((uid) => printed.includes(uid))
    const strangersOnTheSurface = printed.filter((n) => !shared.has(n)).length
    const noticeText = textOf(given.parts.notices)
    const onScreen = document.body.textContent ?? ''
    const reasonNamed =
      onScreen.includes(given.marks.reason) ||
      document.querySelector(`[data-reason="${given.marks.reason}"]`) !== null

    const after = tasksOf(call(given.members.read))
    const written = JSON.stringify(await Promise.resolve(call(given.members.write)))

    return {
      buildVersion: '',
      handedVersion: given.handedVersion,
      tasksBefore: before.length,
      tasksAfter: after.length,
      uidHeldBack,
      heldBackSurvived: after.some((task) => Number(task.uid) === uidHeldBack),
      uidsInBoth,
      imports,
      reviewStood,
      reviewText,
      uidsNamedOnTheSurface,
      strangersOnTheSurface,
      noticeText,
      reasonNamed,
      columnSurvivedTheWrite: written.includes(given.marks.column),
      writeAnswer: written.slice(0, 300),
    }
  }, args)

  return { ...seen, buildVersion }
}

/** What was measured, or a loud failure if the sweep never ran. @purity pure */
function taken(): Measured {
  if (sweepFailed !== null) throw sweepFailed
  if (measured === null) throw new Error('the sweep did not run')
  return measured
}

// ---------------------------------------------------------------------------
// The format version this build states -- and the fixture rests on it
// ---------------------------------------------------------------------------

test('FR-073 -- the format version is a date, to the minute at finest, with no seconds', () => {
  // 書式は
  // `YYYY-MM-DD` とし、同じ日に 2 度改めるときだけ `YYYY-MM-DDTHH:MM` を許す（MUST）
  // 2 度改めるときだけ `YYYY-MM-DDTHH:MM` を許す（MUST）。秒を書いてはならない（MUST NOT）
  //   -- `FR-073` (docs/spec/01-04-requirements.md), the paragraph under its
  //   RATIONALE, read here off `AM-2` of table T-107.
  //
  // ⭐ WHAT WOULD MAKE THIS RED: the build stating a version that is neither
  // shape, or one carrying seconds -- at which point the string comparison the
  // same requirement relies on stops ordering versions by time.
  const seen = taken().buildVersion
  expect(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(seen),
    `AM-2 states the format version as ${JSON.stringify(seen)}, which is neither ` +
      'YYYY-MM-DD nor YYYY-MM-DDTHH:MM',
  ).toBe(true)
  expect(seen.split(':').length, `the version ${JSON.stringify(seen)} writes seconds`).toBeLessThan(
    3,
  )
})

// ---------------------------------------------------------------------------
// The one case that can go red -- every unmet clause is gathered into it
// ---------------------------------------------------------------------------

test('FR-073 / FR-022 / MG-1 -- a newer document is shown, asked about, and carried', () => {
  const m = taken()
  const unmet: string[] = []

  // The fixture is what makes the rest of this case about an UNREADABLE
  // version rather than an ordinary one:
  // ない版であればその旨を通知すること。⛔⛔ **「読めない版」とは、この造りが知る最大の版より新しいことである（MUST）
  // and, in the same requirement's third paragraph:
  //  `GRS` が知っている最大の版より新しい版を読めない版とすること（MUST）
  if (!(m.handedVersion > m.buildVersion)) {
    unmet.push(
      `the handed version ${m.handedVersion} did not order after the build's ${m.buildVersion}`,
    )
  }

  // い版」とは、この造りが知る最大の版より新しいことである（MUST）。**⭐⭐ **そのときは、受けて開くこと（MUST）
  // -09-05「② ただし、具体的に差分を表示してユーザーの確認を受ける」）。⛔ **拒んではならない（MUST NOT）
  const accepted = m.imports.find((outcome) => outcome.accepted)
  if (accepted === undefined) {
    unmet.push(
      `${AM_8} refused a document whose only fault is a newer format version; it answered ` +
        m.imports.map((outcome) => `${outcome.shape} -> ${outcome.answer}`).join(' ;; '),
    )
  }

  // してユーザーの確認を受ける」）。⛔ **拒んではならない（MUST NOT）。黙って開いてもならない（MUST NOT）
  // and the surface `FR-022` sends the same scene to:
  // ⛔⛔ **選ばせる面は 表 T-103 の `U-61`（`Difference Review`）とすること（MUST）
  if (!m.reviewStood) {
    unmet.push(
      `no part named ${JSON.stringify(DIFFERENCE_REVIEW)} (U-61) stood after a newer-version ` +
        `document was handed over; the ${NOTIFICATION_AREA} said ${JSON.stringify(m.noticeText)}`,
    )
  }

  // 開いてもならない（MUST NOT）。**⛔ **読めなかった列を具体的に並べて見せ、続けてよいかを問うこと（MUST）
  if (!m.reviewText.includes(COLUMN_FROM_THE_FUTURE)) {
    unmet.push(
      `the surface did not name the column it could not read (${COLUMN_FROM_THE_FUTURE}); it ` +
        `said ${JSON.stringify(m.reviewText.slice(0, 200))}`,
    )
  }

  // The reason such a telling carries -- row `RS-48` of table T-233, which
  // `FR-073` names for exactly this scene.
  if (!m.reasonNamed) {
    unmet.push(
      `nothing on the screen named the reason ${REASON_NEWER_VERSION} of table T-233; the ` +
        `${NOTIFICATION_AREA} said ${JSON.stringify(m.noticeText.slice(0, 200))}`,
    )
  }

  // ⛔⛔ THE ONE THAT MATTERS MOST. Showing the person what could not be read
  // and then losing it at the write is still losing it:
  // 1`、運ぶ理由は 表 T-233 の `RS-48`。**⛔⛔ **読めなかった列は、解釈せずに持ち回ること（MUST）
  // RS-48`。**⛔⛔ **読めなかった列は、解釈せずに持ち回ること（MUST）。落としてはならない（MUST NOT）
  if (!m.columnSurvivedTheWrite) {
    unmet.push(
      `the column that could not be read did not survive ${AM_11}: the written document does ` +
        `not carry ${COLUMN_FROM_THE_FUTURE} (answer began ${JSON.stringify(m.writeAnswer)})`,
    )
  }

  // 05）—— **入口は 表 T-109 の `IC-94`。**⛔ **選択肢だけを出してはならない（MUST NOT）
  // 選択肢だけを出してはならない（MUST NOT）。選ばせる前に、対応するかもしれないタスクを並べて見せること（MUST）
  //
  // ⭐ HOW "CHOICES ONLY" IS MEASURED: a surface that carries the four row IDs
  // of table T-032a, or their words, but names not one of the tasks that could
  // correspond, has shown the choices alone.
  if (m.uidsNamedOnTheSurface.length === 0) {
    unmet.push(
      `the surface listed none of the ${m.uidsInBoth.length} tasks that could correspond before ` +
        `asking; table T-032a offers ${MERGE_CHOICES.length} choices ` +
        `(${MERGE_CHOICES.join(', ')}) and the surface said ` +
        JSON.stringify(m.reviewText.slice(0, 200)),
    )
  }

  // 無かったタスクを消してはならない（MUST NOT）。** **対応の候補は `UID` の一致で集めること（MUST）
  //
  // ⭐ The candidates are gathered by UID match, so nothing whose UID is absent
  // from the handed document may appear among them.
  if (m.strangersOnTheSurface > 0) {
    unmet.push(
      `${m.strangersOnTheSurface} number(s) on the surface are no UID the two documents share, ` +
        'so the candidates were not gathered by UID match',
    )
  }

  // 違うかを並べ、続けてよいかを問う」である。****同じか別かを`GRS` が自動で確定してはならない（MUST NOT）
  //
  // ⭐ HOW IT IS MEASURED: if the merge went through while no surface stood,
  // the tool settled sameness on its own. A refusal is not that -- it is the
  // separate breach recorded above -- so this speaks only when it was accepted.
  if (accepted !== undefined && !m.reviewStood) {
    unmet.push(
      `${AM_8} accepted the merge (${accepted.shape}) with no ${DIFFERENCE_REVIEW} standing, ` +
        'so sameness was settled without anyone being asked',
    )
  }

  // `GRS` が自動で確定してはならない（MUST NOT）。取込側に無かったタスクを消してはならない（MUST NOT）
  if (!m.heldBackSurvived) {
    unmet.push(
      `the task with UID ${m.uidHeldBack}, which the handed document left out, is gone: ` +
        `${m.tasksBefore} tasks before, ${m.tasksAfter} after`,
    )
  }

  // 表 T-032 の `MG-1` -- the handed file carries no record tying it to this
  // document, so its provenance cannot be told apart:
  // ルの出自 | 同じ外部 WBS マスタの再取込か、別のマスタかを判別する。**判別できないときは人に問うこと（MUST）
  //  —— 選択肢と選ばせ方は `FR-022`。**問う先は 表 T-103 の `U-61` の面とすること（MUST）
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
