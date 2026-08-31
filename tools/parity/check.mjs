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
 * Take the document down to nothing, one press at a time.
 *
 * ⛔ THE FIRST DRAWN ROW, WHATEVER ITS DEPTH -- not the first ROOT. HF-9 lets
 * the panel scroll, so a row above the viewport is not in the tree at all and
 * a loop that waits for a root to appear stops with rows still standing.
 * ⭐ Deleting any row takes its subtree with it (CD-2), so first-drawn is
 * enough: the document empties whatever order they are reached in.
 */
async function emptyTheApp() {
  for (let guard = 0; guard < 200; guard += 1) {
    const top = await app.tab.evaluate(() => {
      const row = document.querySelector('[data-depth]')
      return row === null ? null : Math.round(row.getBoundingClientRect().y)
    })
    if (top === null) return true
    await app.hover(top)
    await app.pressEntry(top, 'IC-82')
    // FR-046 asks before a deletion that cannot be undone
    const asked = await app.tab.$('[data-icon="IC-69"]')
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

async function buildTheBoard() {
  await emptyTheApp()
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


async function run() {
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
    const unexplained = wrong.filter(([what, onlySample, onlyApp]) =>
      !isKnown(what, onlySample, onlyApp))
    if (unexplained.length > 0) diverged += 1
    const mark = unexplained.length > 0 ? '⛔' : (wrong.length > 0 ? '⚠️ ' : '✅')
    console.log(`${mark} ${say(step)}`)
    for (const [what, onlySample, onlyApp] of wrong) {
      if (isKnown(what, onlySample, onlyApp)) {
        console.log(`    ${what} differs as the specification says it should`
          + ` -- ${whyKnown(what)}`)
      }
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
  console.log(`\n${SCRIPT.length - diverged}/${SCRIPT.length} steps agree`)
  return diverged === 0 ? 0 : 1
}

const code = await run()
await browser.close()
process.exit(code)
