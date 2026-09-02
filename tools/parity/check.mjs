// Ask the sample and GRS the same questions, on the same board, and diff.
//
// ⭐ THE BOARD IS BUILT IN GRS THROUGH THE UI, which is what the user's
// instruction asks for: 「GRS のタスクグループ名を変更したり、追加、削除すればよい」.
// GRS starts with a bigger document than the sample seeds, so this empties it
// (IC-82 + the confirmation FR-046 raises) and stands the sample's tree up
// (IC-93 for a shallowest row, IC-91 for a child, then the entry HF-14 opens).
//
// ⛔ THE WINDOW IS TALL ON PURPOSE. A row is 64..148px (FR-042), so a 1080-high
// window draws about eight and a row below the fold cannot be pressed.
import { chromium, openSample, openApp, SAMPLE_TREE } from './sample-and-app.mjs'

const browser = await chromium.launch()
const sample = await openSample(browser)
const app = await openApp(browser)

// ------------------------------------------------------- build the board ----

/**
 * Take the document down to the ONE row it must always hold, one press at a time.
 *
 * ⛔ THE FIRST DRAWN ROW, WHATEVER ITS DEPTH -- not the first ROOT. HF-9 lets
 * the panel scroll, so a row above the viewport is not in the tree at all and
 * a loop that waits for a root to appear stops with rows still standing.
 * ⭐ Deleting any row takes its subtree with it (CD-2), so first-drawn is
 * enough: the document empties whatever order they are reached in.
 *
 * ⛔⛔ IT CANNOT REACH ZERO, AND MUST NOT TRY. From 2026-09-02 the paragraph
 * under table T-050 (MUST) has the document always hold at least one
 * `TaskGroup`: 「ある操作の結果として行が 0 になるときは、その操作の一部として、
 * 深さ `L1` の行を 1 つ作ること（MUST）」, named from the dictionary's
 * `defaultNames`/`row`. A loop that waited for no row at all threw
 * 「the document would not empty」 after 200 presses -- which is the product
 * obeying its specification, not a fault.
 *
 * ⛔⛔ SO IT STOPS AT A FIXED POINT, NOT AT A COUNT. "Stop when one row is
 * drawn" was tried and measured wrong: the drawn set is a SCROLLED WINDOW, and
 * the loop stopped with 「Quality And Release」 -- a row of the SAMPLE, 148px
 * tall because it carries tasks -- still standing. The board was then built
 * beside it, and the next `pressRow` could not find its own parent.
 * ⭐ The row the invariant makes is the one row a delete cannot remove: press
 * IC-82 on it and a row with the SAME identifier is there again. So the loop
 * presses until a press stops changing the set of `data-group-id` on screen,
 * which hard-codes no identifier and no word.
 */
/** The rows on screen right now, as identifiers -- the loop's fixed point. */
async function drawnRowIds() {
  return app.tab.evaluate(() =>
    [...document.querySelectorAll('[data-depth]')].map((row) => row.getAttribute('data-group-id')))
}

async function emptyTheApp() {
  let before = null
  for (let guard = 0; guard < 200; guard += 1) {
    const ids = await drawnRowIds()
    // ⛔ The fixed point: one row on screen AND the press before it changed
    // nothing. Only the invariant's row survives its own deletion.
    if (ids.length <= 1 && before !== null && before.join() === ids.join()) return true
    before = ids
    const top = await app.tab.evaluate(() => {
      const row = document.querySelector('[data-depth]')
      return row === null ? null : Math.round(row.getBoundingClientRect().y)
    })
    if (top === null) return true
    await app.hover(top)
    await app.pressEntry(top, 'IC-82')
    // FR-046 asks before a deletion that cannot be undone.
    // ⛔ THE ANSWER IS A WORD BUTTON, NOT AN ICON, from 2026-09-02 (NT-7 of
    // table T-037, the user's instruction of 2026-09-01). It carries
    // `data-confirmation-answer` and deliberately no `data-icon`: table T-109
    // and figure F-019 hold GLYPH entrances, and a word button has no glyph, so
    // `IC-69` and `IC-70` were retired. Selecting on `data-icon` here found
    // nothing and waved every confirmation through in silence.
    const asked = await app.tab.$('[data-confirmation-answer="proceed"]')
    if (asked !== null) {
      const box = await asked.boundingBox()
      await app.tab.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await app.tab.mouse.down(); await app.tab.mouse.up()
      await app.tab.waitForTimeout(350)
    }
    await app.away()
  }
  throw new Error('the document would not empty')
}

/** Name the row HF-14 just stood up with an empty name. */
async function nameIt(name) {
  const entry = await app.tab.waitForSelector('input:focus', { timeout: 5000 })
  await entry.fill(name)
  await app.tab.keyboard.press('Enter')
  await app.tab.waitForTimeout(320)
}

/**
 * Stand the sample's tree up beside the one row the document must keep, then
 * take that row away last.
 *
 * ⛔⛔ "THE PARENT VANISHES" WAS A MISREADING, AND IT IS WRITTEN DOWN HERE SO
 * NOBODY MEASURES IT AGAIN. With a row left standing, naming a newly added row
 * leaves `app.rows()` answering with the CHILD ALONE -- but `app.rows()` reads
 * `[data-depth]`, which is the DRAWN WINDOW and not the document. Measured
 * 2026-09-02: a wheel-up over the panel brought every row straight back
 * (「Quality And Release」@85, 「Whole Product」@241, 「Phase Bars」@277) and the
 * next press then landed. NOTHING IS EVER LOST.
 * ⚠️ What IS real is that the view parks below the content after that write, so
 * the panel builds DOM for a row whose ancestors are above its top edge. ⭐ It
 * reproduces with the T-050 invariant REVERTED (rebuilt from HEAD and measured),
 * so it predates that work and belongs in its own ledger row -- it needs a tall
 * leftover row and is invisible once `emptyTheApp` reaches its fixed point.
 *
 * ⚠️ THE LEFTOVER IS MATCHED BY THE WORD ON SCREEN, which FR-085 may have cut
 * with a `…`. That is what `pressRow` compares against, so a cut name still
 * resolves -- but it is why the name is read here rather than assumed.
 */
async function theOnlyRowsName() {
  const drawn = await app.rows()
  return drawn.length === 0 ? null : drawn[0].split(':').slice(1).join(':')
}

async function buildTheBoard() {
  await emptyTheApp()
  const leftover = await theOnlyRowsName()
  // ⛔ EVERY PRESS IS CHECKED. A row below the fold is not in the tree (HF-9),
  // so `pressRow` can find nothing and return quietly -- and the next `nameIt`
  // would then type into whatever field happened to be open, which is how two
  // rows landed under the wrong parent on the first run.
  const stand = async (parent, kids) => {
    for (const [name, grandKids] of kids) {
      const done = parent === null
        ? await app.pressHead('addRoot')
        : await app.pressRow(parent, 'add')
      if (done === false) {
        throw new Error(`could not press add for ${name} under ${parent ?? '段 0'} `
          + `-- drawn: ${JSON.stringify(await app.rows())}`)
      }
      await nameIt(name)
      await stand(name, grandKids)
    }
  }
  await stand(null, SAMPLE_TREE)

  // ⭐ NOW the leftover can go: the document holds the sample's rows, so taking
  // it away cannot drive the count to zero and cannot raise the invariant again.
  if (leftover !== null) {
    const gone = await app.pressRow(leftover, 'del')
    if (gone === false) {
      throw new Error(`could not delete the leftover row ${JSON.stringify(leftover)} `
        + `-- drawn: ${JSON.stringify(await app.rows())}`)
    }
    const asked = await app.tab.$('[data-confirmation-answer="proceed"]')
    if (asked !== null) {
      const box = await asked.boundingBox()
      await app.tab.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await app.tab.mouse.down(); await app.tab.mouse.up()
      await app.tab.waitForTimeout(350)
    }
    await app.away()
  }
}

// ------------------------------------------------------------- the diff ----

const SCRIPT = [
  ['head', 'headFoldAll'],
  ['head', 'headOne'],
  ['head', 'headOne'],
  ['head', 'headOpenAll'],
  ['row', 'Mobile Client', 'foldAll'],
  ['row', 'Mobile Client', 'openOne'],
  ['row', 'Phone App', 'openOne'],
  ['row', 'Mobile Client', 'foldAll'],
  ['row', 'Mobile Client', 'openAll'],
  ['row', 'Phone App', 'hideSelf'],
  ['row', 'Mobile Client', 'openOne'],
  ['row', 'Phone App', 'foldAll'],
  ['row', 'Whole Product', 'hideSelf'],
  ['head', 'headOne'],
  ['head', 'headOpenAll'],
  ['row', 'Phase Bars', 'foldAll'],
  ['row', 'Phase Bars', 'openOne'],
  ['row', 'Back Office', 'foldAll'],
  ['row', 'Back Office', 'openOne'],
  // ⭐ PINNING, WHICH THE FOLD FAMILY ABOVE NEVER TOUCHES. FR-098 lifts a
  // pinned row out of the scrolling flow to the top, so every reading below
  // moves: `rows` because the order changes, `pinned` because the set does.
  // ⛔ The sample lifts only while its `pinTop` box is ticked, and it is
  // ticked by default -- do not untick it, or the two stop being comparable.
  ['row', 'Back Office', 'pin'],
  ['row', 'Mobile Client', 'pin'],
  // ⭐ A PINNED ROW MUST SURVIVE THE FOLD FAMILY (FR-098: only a folded or a
  // hidden ancestor may stop it being drawn).
  ['head', 'headFoldAll'],
  ['head', 'headOpenAll'],
  // ⭐ THE SAME ENTRANCE TAKES THE PIN OFF AGAIN (FR-098 puts both on one).
  ['row', 'Mobile Client', 'pin'],
  ['row', 'Back Office', 'pin'],
]

const say = (step) => step[0] === 'head' ? `head:${step[1]}` : `${step[1]}:${step[2]}`

/**
 * Readings where the sample and GRS are MEANT to differ, and why.
 *
 * ⛔⛔ THE SAMPLE IS NOT THE AUTHORITY -- the specification is. The sample is a
 * design reference the user approved for look and behaviour, and where a
 * requirement decides something the sample got another way, the requirement
 * wins. ⚠️ Without this list a justified difference prints as ⛔ for ever, and
 * the obvious way to make the number go up is to break the requirement.
 *
 * ⭐ Measured 2026-09-01: pinning `Back Office` then `Mobile Client` gives
 *    the sample ["Mobile Client","Back Office"] -- its document order
 *    GRS        ["Back Office","Mobile Client"] -- the order they were fixed
 * FR-098 (MUST NOT) 「ピン止めした行どうしに優劣を設けてはならない —— 固定した
 * 順に上から並べる」, so GRS is right and the sample keeps tree order.
 * `S-126` is an array for exactly this reason.
 */
const KNOWN_DIVERGENCES = [
  {
    reading: 'rows  ',
    why: 'FR-098: pinned rows stack in the order they were fixed, not tree order',
  },
  {
    reading: 'pinned',
    why: 'FR-098: pinned rows stack in the order they were fixed, not tree order',
  },
]

/** Is this an ordering difference the specification has already settled? */
const isKnown = (what, onlySample, onlyApp) =>
  onlySample.length === 0 &&
  onlyApp.length === 0 &&
  KNOWN_DIVERGENCES.some((one) => one.reading === what)

const whyKnown = (what) =>
  KNOWN_DIVERGENCES.find((one) => one.reading === what)?.why ?? ''

// ------------------------------ the second list, and it is not the first ----

/**
 * Moves that fail today because a DEFECT IS OPEN.
 *
 * ⛔⛔ THIS LIST IS NOT `KNOWN_DIVERGENCES`, AND THE TWO MUST NEVER BE MERGED.
 * That list says "the specification says the two differ" and the difference is
 * correct. This one says "the product is broken" and the difference is a bug
 * somebody still owes a fix for. Excusing a defect on the divergence list is
 * how a defect quietly turns into a design decision nobody ever took.
 *
 * ⭐ WHAT AN ENTRY BUYS. A green baseline. A step that is known to fail stops
 * hiding a NEW regression behind it, because the new one is the only ⛔ left.
 *
 * ⭐ WHAT AN ENTRY COSTS. A promise that it goes away the day the defect does.
 * ⛔ SO AN ENTRY WHOSE MOVE UNEXPECTEDLY AGREES FAILS THE RUN -- see
 * `agreedIn` and the stale-pin block at the end. A list that silently keeps
 * passing entries is exactly how a pin rots into decoration.
 *
 * ⛔ AN ENTRY IS NOT A PLACE TO PARK A MOVE THAT MERELY FAILS. It must name a
 * row of `docs/development-records/defects.md`, and `theDefectListIsUsable`
 * fails the run when the move is not one this script makes, when the reading
 * is not one of the four taken, or when the reading is ALREADY excused by
 * `KNOWN_DIVERGENCES` -- a pin that can never be reached says nothing.
 *
 * ⚠️ A MOVE THAT CANNOT BE PRESSED AT ALL IS NOT EXCUSED BY THIS LIST. That
 * path stays exactly as it was: an entrance that is not there is a failure.
 * Nothing here is allowed to soften it.
 *
 * ⚠️ EMPTY TODAY, AND MEASURED SO. The one defect still pressed out of the
 * shipped build cannot be asked of THIS board:
 *
 *   D-147  the watermark entrance is inert -- this sample has no watermark
 *
 * ⭐ THE OTHER THREE CLOSED ON 2026-09-02 and are named here so nobody re-adds
 * them from an older note:
 *   D-06   a comment box could not be placed. One seam was missing: the armed
 *          comment-box entrance planned no command at all. Fixed and measured.
 *   D-181  never a defect. The row bands do not move; two LANES inside one band
 *          trade, which is table T-014's ST-2 ordering and ST-3's greedy pass
 *          doing what they say, and Ctrl+Y reproduces the trade with no pointer
 *          in it -- so it belongs to the document, not to holding the grab.
 *   D-182  a bar's dummy ignored where it was dropped. FR-043 now says the
 *          dropped day is the actual start, and the code writes it.
 *
 * ⭐ `previous-project-result/11-row-controls/row-controls-sample.html` is a
 * ROW CONTROLS sample: it has rows, and nothing else. All four are pinned in
 * `tests/system/open-defect-pins.test.ts` instead, against the running
 * application, where the questions can actually be asked.
 *
 * ⭐ THE MECHANISM IS STILL EXERCISED ON EVERY RUN -- `theMechanismWorks`
 * below drives it over a pretend entry -- so that an empty list cannot quietly
 * decay into a no-op that would wave a real entry through.
 */
const KNOWN_DEFECTS = [
  // {
  //   move: 'Phone App:hideSelf',  // spelled exactly as `say(step)` spells it
  //   reading: 'rows  ',           // one of READINGS
  //   ledger: 'D-000',             // the row of docs/development-records/defects.md
  //   wrong: 'one line saying what the product does instead',
  // },
]

/** The four readings a step takes, spelled as the step prints them. */
const READINGS = ['rows  ', 'counts', 'arming', 'pinned']

/** The entry of `list` that excuses this move's reading, or `null`. */
const defectIn = (list, move, what) =>
  list.find((one) => one.move === move && one.reading === what) ?? null

const defectFor = (move, what) => defectIn(KNOWN_DEFECTS, move, what)

/**
 * Entries of `list` for this move whose reading did NOT differ -- the pins
 * that have stopped being true.
 */
const agreedIn = (list, move, whatDiffered) =>
  list.filter((one) => one.move === move && !whatDiffered.includes(one.reading))

const agreedDespiteThePin = (move, whatDiffered) =>
  agreedIn(KNOWN_DEFECTS, move, whatDiffered)

/**
 * Drive the mechanism over a pretend entry, so that it is measured and not
 * merely present.
 *
 * ⭐ WHY THIS EXISTS AT ALL. `KNOWN_DEFECTS` is empty, and an empty list makes
 * every line that reads it unreachable -- a rename or a bad edit could turn
 * the whole thing into a no-op and no run would notice until the day somebody
 * added a real entry and it was waved through. Six assertions cost nothing and
 * keep the list honest while it is empty.
 */
function theMechanismWorks() {
  const pretend = [{
    move: 'head:headOne',
    reading: 'counts',
    ledger: 'D-000',
    wrong: 'a pretend entry, used by this self-check and nowhere else',
  }]
  const complaints = []
  const ok = (claim, why) => { if (claim !== true) complaints.push(why) }
  ok(defectIn(pretend, 'head:headOne', 'counts') !== null,
    'a move and reading that ARE pinned were not recognised')
  ok(defectIn(pretend, 'head:headOne', 'rows  ') === null,
    'a pin leaked onto a reading it does not name')
  ok(defectIn(pretend, 'head:headOpenAll', 'counts') === null,
    'a pin leaked onto a move it does not name')
  ok(agreedIn(pretend, 'head:headOne', ['counts']).length === 0,
    'a pin was called stale while the reading it names still differs')
  ok(agreedIn(pretend, 'head:headOne', ['rows  ']).length === 1,
    'a pin whose reading now agrees was not caught')
  ok(agreedIn(pretend, 'head:headOne', []).length === 1,
    'a pin on a step where nothing differs at all was not caught')
  // ⛔ The end-of-run verdict keeps the entries themselves in a Set, so it
  // depends on OBJECT IDENTITY surviving the loop. A future edit that mapped
  // or copied an entry on the way in would silently call every pin stale.
  const failed = new Set([pretend[0]])
  ok(pretend.filter((one) => !failed.has(one)).length === 0,
    'a pin that DID fail was still counted as never having failed')
  ok(pretend.filter((one) => !new Set().has(one)).length === 1,
    'a pin that never failed was not counted as stale')
  if (complaints.length === 0) {
    console.log('⭐ the known-defect mechanism was driven over a pretend entry: 8/8 hold')
    return true
  }
  console.log('⛔⛔ THE KNOWN-DEFECT MECHANISM IS BROKEN -- it cannot be trusted '
    + 'to hold a real entry')
  for (const why of complaints) console.log(`    ${why}`)
  return false
}

/** Is every entry one this run could actually reach? */
function theDefectListIsUsable() {
  const moves = new Set(SCRIPT.map(say))
  const complaints = []
  for (const one of KNOWN_DEFECTS) {
    const who = `${one.ledger ?? '(no ledger row)'} ${one.move ?? '(no move)'}`
    if (typeof one.ledger !== 'string' || /^D-\d+$/.test(one.ledger) === false) {
      complaints.push(`${who} names no row of docs/development-records/defects.md`)
    }
    if (typeof one.wrong !== 'string' || one.wrong.trim() === '') {
      complaints.push(`${who} says nothing about what the product does instead`)
    }
    if (!moves.has(one.move)) {
      complaints.push(`${who} names a move this script never makes`)
    }
    if (!READINGS.includes(one.reading)) {
      complaints.push(`${who} names the reading ${JSON.stringify(one.reading)}, `
        + `which is not one of ${JSON.stringify(READINGS)}`)
    }
    if (KNOWN_DIVERGENCES.some((other) => other.reading === one.reading)) {
      complaints.push(`${who} pins a reading KNOWN_DIVERGENCES already excuses, `
        + 'so the pin can never be reached')
    }
  }
  if (complaints.length === 0) return true
  console.log('⛔⛔ THE KNOWN-DEFECT LIST CANNOT BE USED AS WRITTEN')
  for (const why of complaints) console.log(`    ${why}`)
  return false
}

/** Print the list, loudly, whether or not it holds anything. */
function sayTheDefects(when) {
  console.log('')
  console.log('=============================================================')
  console.log(`⛔⛔ KNOWN DEFECTS -- moves excused because THE PRODUCT IS BROKEN (${when})`)
  if (KNOWN_DEFECTS.length === 0) {
    console.log('    none: no move on THIS board is excused by an open defect.')
    console.log('    ⚠️  That is not a claim that the product has none. The four')
    console.log('    pressed out of the shipped build on 2026-09-01 -- D-06, D-147,')
    console.log('    D-181, D-182 -- cannot be asked of a ROW CONTROLS sample, and')
    console.log('    are pinned in tests/system/open-defect-pins.test.ts instead.')
  }
  for (const one of KNOWN_DEFECTS) {
    console.log(`    ⛔⛔ ${one.ledger}  ${one.move}  [${one.reading}]`)
    console.log(`         ${one.wrong}`)
  }
  console.log('=============================================================')
  console.log('')
}

async function run() {
  // ⛔ BEFORE ANY BOARD IS BUILT. A broken or unusable list would decide which
  // of the steps below counts, so it is judged first and the run stops here.
  const listIsSound = theMechanismWorks() && theDefectListIsUsable()
  sayTheDefects('opening')
  if (listIsSound !== true) return 1

  console.log('building the sample’s board in GRS through the UI ...')
  await buildTheBoard()
  const built = await app.rows()
  const seeded = await sample.rows()
  console.log('sample seed :', JSON.stringify(seeded))
  console.log('GRS built   :', JSON.stringify(built))
  if (JSON.stringify(built) !== JSON.stringify(seeded)) {
    console.log('⛔ THE BOARDS DO NOT MATCH -- nothing after this is comparable')
    return 1
  }
  console.log('✅ the boards match\n')

  let diverged = 0
  // Steps whose only unexplained readings are ones an OPEN DEFECT owns.
  let onOpenDefects = 0
  // ⭐ WHICH PINS ACTUALLY EARNED THEIR KEEP. A pin is live when the move it
  // names failed AT LEAST ONCE in this run. ⛔ It is judged over the WHOLE run
  // and not step by step, because `SCRIPT` makes several moves twice -- pinning
  // and unpinning are the same entrance (FR-098) -- so one occurrence agreeing
  // says nothing on its own. Measured: a per-step verdict called one live pin
  // stale because the second press took the pin off again.
  const pinsThatFailed = new Set()
  for (const step of SCRIPT) {
    // ⛔⛔ A PRESS THAT LANDS ON NOTHING IS A FAILURE, NOT A PASS. Both sides
    // return false when the entrance is not there, and until this was checked
    // an unpressable step compared two UNCHANGED boards and printed ✅ -- the
    // step tested nothing and said it agreed.
    const landed = step[0] === 'head'
      ? [await sample.pressHead(step[1]), await app.pressHead(step[1])]
      : [await sample.pressRow(step[1], step[2]), await app.pressRow(step[1], step[2])]
    if (landed[0] === false || landed[1] === false) {
      diverged += 1
      console.log(`⛔ ${say(step)} -- could not be pressed `
        + `(sample: ${landed[0]}, GRS: ${landed[1]})`)
      continue
    }
    // ⭐ THREE READINGS, NOT ONE. The drawn rows say what happened; the counts
    // say what each row is holding away (HF-18); the arming says which
    // entrances FR-029 spends. A build could match on any one and differ on
    // the others.
    // ⛔ THE ARMING IS COMPARED AS A SET. The two draw their entrances in
    // different orders inside a row -- the sample by its own print order, GRS by
    // HF-4's right-to-left placement -- and the ORDER is HF-4's business, not
    // this comparison's. ⭐ The rows and the counts ARE compared in order,
    // because the order rows stand in is exactly what the fold family decides.
    const sorted = (list) => [...list].sort()
    const readings = [
      ['rows  ', await sample.rows(), await app.rows()],
      ['counts', sorted(await sample.counts()), sorted(await app.counts())],
      ['arming', sorted(await sample.faint()), sorted(await app.faint())],
      // ⭐ COMPARED IN ORDER. FR-098 says pinned rows are stacked in the order
      // they were fixed, so the order IS the rule being checked.
      ['pinned', await sample.pinned(), await app.pinned()],
    ]
    let wrong = readings
      .filter(([, left, right]) => JSON.stringify(left) !== JSON.stringify(right))
      .map(([what, left, right]) => [
        what,
        left.filter((one) => !right.includes(one)),
        right.filter((one) => !left.includes(one)),
        left,
        right,
      ])
    // ⭐ A DIFFERENCE THE SPECIFICATION HAS ALREADY SETTLED IS NOT A FAILURE,
    // but it is never silent either -- it prints its reason every run.
    const settled = wrong.filter(([what, onlySample, onlyApp]) =>
      isKnown(what, onlySample, onlyApp))
    const rest = wrong.filter(([what, onlySample, onlyApp]) =>
      !isKnown(what, onlySample, onlyApp))
    // ⭐ THE THIRD CATEGORY, AND IT IS KEPT APART FROM THE SECOND ON PURPOSE.
    // `settled` is "the specification says they differ". `broken` is "a defect
    // is open". Only `unexplained` decides the exit code, so a NEW regression
    // still stands out against a green baseline.
    const move = say(step)
    const broken = rest.filter(([what]) => defectFor(move, what) !== null)
    const unexplained = rest.filter(([what]) => defectFor(move, what) === null)
    if (unexplained.length > 0) diverged += 1
    else if (broken.length > 0) onOpenDefects += 1
    // ⛔⛔ A PIN THAT NOW AGREES IS A FAILURE. The move was listed because a
    // defect made it fail; if it passes, either the defect is fixed and the
    // entry must go, or the entry never described this move in the first place.
    const stale = agreedDespiteThePin(move, wrong.map(([what]) => what))
    const mark = unexplained.length > 0
      ? '⛔'
      : (broken.length > 0 ? '⛔⛔' : (settled.length > 0 ? '⚠️ ' : '✅'))
    console.log(`${mark} ${move}`)
    for (const [what] of settled) {
      console.log(`    ${what} differs as the specification says it should`
        + ` -- ${whyKnown(what)}`)
    }
    for (const [what, onlySample, onlyApp, left, right] of broken) {
      const one = defectFor(move, what)
      pinsThatFailed.add(one)
      console.log(`    ⛔⛔ OPEN DEFECT ${one.ledger} -- ${one.wrong}`)
      console.log(`    ⛔⛔ ${what} the sample:`, JSON.stringify(left))
      console.log(`    ⛔⛔ ${what} GRS       :`, JSON.stringify(right))
      console.log(`    ⛔⛔ only in the sample: ${JSON.stringify(onlySample)}`
        + ` / only in GRS: ${JSON.stringify(onlyApp)}`)
      console.log(`    ⛔⛔ not counted as a failure. It is counted the day `
        + `${one.ledger} is fixed and this entry is still here.`)
    }
    for (const one of stale) {
      console.log(`    ⛔⛔ ${one.ledger} PINS THIS MOVE, AND THIS PRESS AGREED `
        + `[${one.reading}]. The verdict is at the end of the run.`)
    }
    wrong = unexplained
    for (const [what, onlySample, onlyApp, left, right] of wrong) {
      // ⛔⛔ AN EMPTY PAIR OF "only in" LISTS IS NOT "NO DIFFERENCE". It means
      // the two hold the SAME items in a DIFFERENT ORDER, and for `rows` and
      // `pinned` the order IS the rule -- FR-098 stacks pinned rows in the
      // order they were fixed. ⭐ Measured: without this, two real order
      // divergences printed as ⛔ with four empty lists and said nothing.
      if (onlySample.length === 0 && onlyApp.length === 0) {
        console.log(`    ${what} same items, DIFFERENT ORDER`)
        console.log(`    ${what} the sample:`, JSON.stringify(left))
        console.log(`    ${what} GRS       :`, JSON.stringify(right))
        continue
      }
      console.log(`    ${what} only in the sample:`, JSON.stringify(onlySample))
      console.log(`    ${what} only in GRS       :`, JSON.stringify(onlyApp))
    }
  }
  console.log(`\n${SCRIPT.length - diverged - onOpenDefects}/${SCRIPT.length} steps agree`)
  console.log(`${onOpenDefects}/${SCRIPT.length} steps fail on an OPEN DEFECT `
    + '(named above, not counted as failures)')
  console.log(`${diverged}/${SCRIPT.length} steps diverge with no entry on either list`)
  sayTheDefects('closing')
  // ⛔⛔ A STALE PIN IS FATAL. Nothing else in this file may report green while
  // an entry claims a move fails and the move never failed once.
  const stalePins = KNOWN_DEFECTS.filter((one) => !pinsThatFailed.has(one))
  if (stalePins.length > 0) {
    console.log(`⛔⛔ ${stalePins.length} KNOWN-DEFECT ENTRY / ENTRIES NEVER FAILED IN `
      + 'THIS RUN. THE MOVES AGREE -- THESE ARE FIXED.')
    console.log('⛔⛔ TAKE THEM OFF KNOWN_DEFECTS IN tools/parity/check.mjs, and move the')
    console.log('⛔⛔ ledger rows on. A pin that keeps passing is a pin that has rotted.')
    for (const one of stalePins) {
      console.log(`    ⛔⛔ ${one.ledger}  ${one.move}  [${one.reading}]  -- ${one.wrong}`)
    }
  }
  return diverged === 0 && stalePins.length === 0 ? 0 : 1
}

const code = await run()
await browser.close()
process.exit(code)
