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
]

const say = (step) => step[0] === 'head' ? `head:${step[1]}` : `${step[1]}:${step[2]}`

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
    if (step[0] === 'head') {
      await sample.pressHead(step[1])
      await app.pressHead(step[1])
    } else {
      await sample.pressRow(step[1], step[2])
      await app.pressRow(step[1], step[2])
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
    ]
    const wrong = readings
      .filter(([, left, right]) => JSON.stringify(left) !== JSON.stringify(right))
      .map(([what, left, right]) => [
        what,
        left.filter((one) => !right.includes(one)),
        right.filter((one) => !left.includes(one)),
      ])
    if (wrong.length > 0) diverged += 1
    console.log(`${wrong.length === 0 ? '✅' : '⛔'} ${say(step)}`)
    for (const [what, onlySample, onlyApp] of wrong) {
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
