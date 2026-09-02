// Does GRS behave the way the sample behaves?
//
// ⭐ THE BOARD IS BUILT, NOT ASSUMED. The user's instruction: 「GRS のタスクグループ
// 名を変更したり、追加、削除すればよい」. The document GRS starts with is bigger than
// the sample's, so this empties it and stands the sample's tree up through the
// UI -- IC-82 to delete, IC-93 / IC-91 to add, and the entry HF-14 opens to name.
//
// ⛔ THE WINDOW IS TALL ON PURPOSE. Rows are 64..148px (FR-042), so a 1080-high
// window draws about eight of them and a row below the fold cannot be pressed.
//
// ⭐ WHY THIS LIVES IN tools/ AND NOT IN scratch/. scratch/ is gitignored, so a
// harness left there is gone by the next session -- and this one is the only
// thing that holds the product against the design sample the user approved.
// Run it with `npm run parity`.
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const asUrl = (relative) =>
  'file://' + path.resolve(HERE, relative).split(path.sep).join('/')
const SAMPLE = asUrl('../../previous-project-result/11-row-controls/row-controls-sample.html')
const APP = asUrl('../../dist/index.html')

const WINDOW = { width: 1400, height: 2000 }

// ---------------------------------------------------------------- sample ----

async function openSample(browser) {
  const tab = await browser.newPage({ viewport: WINDOW })
  await tab.goto(SAMPLE)
  await tab.waitForTimeout(300)
  return {
    tab,
    rows: () => tab.evaluate(() =>
      [...document.querySelectorAll('.row')].map((row) => {
        const indent = parseInt(getComputedStyle(row).paddingLeft, 10)
        return `${(indent - 6) / 16}:${row.querySelector('.nm')?.textContent ?? ''}`
      })),
    counts: () => tab.evaluate(() =>
      [...document.querySelectorAll('.row')]
        .filter((row) => row.querySelector('.cnt') !== null)
        .map((row) => `${row.querySelector('.nm')?.textContent ?? ''}=${
          (row.querySelector('.cnt')?.textContent ?? '').trim().replace(/^▾\s*/, '')}`)),
    faint: () => tab.evaluate(() => {
      const head = [...document.querySelectorAll('#phead button')]
        .map((one) => `head:${one.dataset.act}=${one.classList.contains('faint') ? 'faint' : 'armed'}`)
      const rows = [...document.querySelectorAll('.row')].flatMap((row) =>
        [...row.querySelectorAll('.ctl button')].map((one) =>
          `${row.querySelector('.nm')?.textContent}:${one.dataset.act}=${
            one.classList.contains('faint') ? 'faint' : 'armed'}`))
      return [...head, ...rows]
    }),
    pressRow: async (name, act) => {
      const found = await tab.evaluate(([wanted, which]) => {
        const row = [...document.querySelectorAll('.row')]
          .find((one) => one.querySelector('.nm')?.textContent === wanted)
        const button = row?.querySelector(`.ctl button[data-act="${which}"]`)
        if (button == null) return false
        button.click()
        return true
      }, [name, act])
      await tab.waitForTimeout(150)
      return found
    },
    pressHead: async (act) => {
      const found = await tab.evaluate((which) => {
        const button = document.querySelector(`#phead button[data-act="${which}"]`)
        if (button == null) return false
        button.click()
        return true
      }, act)
      await tab.waitForTimeout(150)
      return found
    },
    // Which rows are held at the top, in the order they are held there.
    pinned: () => tab.evaluate(() =>
      [...document.querySelectorAll('.row.pinnedTop')]
        .map((row) => row.querySelector('.nm')?.textContent ?? '')),
    reset: async () => { await tab.click('#reset'); await tab.waitForTimeout(150) },
  }
}

// ------------------------------------------------------------------- GRS ----

/** Which entrance of table T-109 answers which act of the sample. */
export const SAME_ENTRANCE = {
  hideSelf: 'IC-59',
  openOne: 'IC-90',
  foldAll: 'IC-77',
  openAll: 'IC-58',
  add: 'IC-91',
  del: 'IC-82',
  pin: 'IC-60',
  headOne: 'IC-92',
  headFoldAll: 'IC-78',
  headOpenAll: 'IC-74',
  addRoot: 'IC-93',
}

export const SAMPLE_TREE = [
  ['Whole Product', [['Phase Bars', []], ['Phase Gates', []]]],
  ['Mobile Client', [['Phone App', [['Phone Sign In', []], ['Phone Home Screen', []]]],
                     ['Tablet App', []]]],
  ['Back Office', [['Billing', []], ['Reporting', []]]],
]

/**
 * How far one drag on the `Panel Divider` widens the `Row Title Panel`.
 *
 * ⭐ A STEP AND NOT A COMPUTED WIDTH. FR-085 cuts the name against a formula
 * whose terms are settings values, and working the answer out here would copy
 * that formula into a tool -- the day a term changes, the copy would keep
 * cutting at the old place and say the names were whole. So this drags and
 * MEASURES, one step at a time, until the product itself reports nothing cut.
 */
const WIDEN_STEP_PX = 60

/** How many drags `showWholeNames` will make before it gives up. */
const WIDEN_TRIES = 8

async function openApp(browser) {
  const tab = await browser.newPage({ viewport: WINDOW })
  await tab.goto(APP)
  await tab.waitForTimeout(1700)

  const rows = () => tab.evaluate(() =>
    [...document.querySelectorAll('[data-depth]')].map((row) =>
      `${Number(row.getAttribute('data-depth')) - 1}:${
        (row.querySelector('span')?.textContent ?? '').trim()}`))

  const panelRight = () => tab.evaluate(() =>
    Math.round(document.querySelector('[data-role="Row Title Panel"]').getBoundingClientRect().right))

  // ⛔⛔ THE NAMES THE PRODUCT CUT, AND WHY THIS TOOL MAY NOT READ ONE.
  //
  // FR-085 (MUST) cuts a row's name to the width the `Row Title Panel` leaves
  // it and closes it with `…`. From CR-336 the formula also subtracts the grab
  // strip GR-20 (`S-138`) and the gap after it (`S-218`), so at 1400x2000 a
  // depth-3 row gets 102px and 「Phone Home Screen」 genuinely does not fit --
  // the drawn word is 「Phone Home Sc…」. The sample cuts nothing, so `rows()`
  // on the two sides could never agree again.
  //
  // ⛔ AND IT MUST NOT BE MADE TO AGREE BY COMPARING LESS. Prefix matching,
  // stripping the mark, comparing lengths -- every one of them makes a CUT name
  // and a DIFFERENT name read alike, which is the one thing the board gate
  // exists to catch. A tree built under the wrong parent would then pass.
  //
  // ⭐ SO THE READER DOES WHAT THE SPECIFICATION SAYS A READER DOES. FR-085
  // ends 「全文を見たい者はパネルを広げる（`FR-052`）」 and HF-15 of table T-051
  // repeats it for the grab strip (利用者の裁定 2026-09-02): 「幅が足りないとき
  // は、読む人がパネルを広げる（`FR-052`）」. FR-052 widens the panel by a drag
  // on U-24 `Panel Divider`, and that is the whole of what happens below --
  // a real pointer on the real band, no member added to the product, no
  // specification rule invented.
  //
  // ⭐ WHICH ROWS WERE CUT IS THE PRODUCT'S OWN ANSWER, not this tool's guess:
  // `data-truncated` is written on every row from `RowTitle.isLabelTruncated`,
  // which FR-085 needs anyway for the tooltip that shows the whole name.
  const cutRows = () => tab.evaluate(() =>
    [...document.querySelectorAll('[data-depth][data-truncated="true"]')]
      .map((row) => (row.querySelector('span')?.textContent ?? '').trim()))

  /**
   * One drag on U-24 `Panel Divider`, rightwards -- FR-052.
   *
   * ⭐ THE BAND AND NOT THE LINE. `fillScreenFrame` draws a band that takes the
   * pointer and a hairline that does not, and the band is the one marked
   * `data-panel`. ⛔ THE TRAVEL IS WHAT COUNTS, not where the press landed:
   * `commandFromPanelDivider` moves the boundary by the difference between the
   * two points, so a press anywhere across the band widens by the same amount.
   */
  const widenRowTitlePanel = async (byPx) => {
    const band = await tab.evaluate(() => {
      const one = document.querySelector('[data-role="Panel Divider"][data-panel="rowTitlePanel"]')
      if (one === null) return null
      const box = one.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    })
    if (band === null) return false
    await tab.mouse.move(band.x, band.y)
    await tab.mouse.down()
    await tab.mouse.move(band.x + byPx, band.y, { steps: 8 })
    await tab.mouse.up()
    await tab.waitForTimeout(260)
    return true
  }

  /**
   * Widen the panel until the product says it is cutting no name, so that the
   * word `rows()` reads IS the row's whole name.
   *
   * ⚠️ IT CAN FAIL, AND THEN IT SAYS SO. `S-79` is bounded by 「`Row Area` の幅
   * > 0」 (FR-052) and `edit-document-settings.ts` holds that bound, so a drag
   * past it moves nothing. Returning `false` is how a caller learns that the
   * names it is about to read are NOT whole -- ⛔ it must not read them anyway.
   */
  const showWholeNames = async () => {
    for (let tries = 0; tries < WIDEN_TRIES; tries += 1) {
      if ((await cutRows()).length === 0) return true
      if ((await widenRowTitlePanel(WIDEN_STEP_PX)) === false) return false
    }
    return (await cutRows()).length === 0
  }

  const topOf = (name) => tab.evaluate((wanted) => {
    const row = [...document.querySelectorAll('[data-depth]')]
      .find((one) => (one.querySelector('span')?.textContent ?? '').trim() === wanted)
    return row === undefined ? null : Math.round(row.getBoundingClientRect().y)
  }, name)

  // ⛔ A REAL POINTER. HF-6 keeps a row's controls out of the picture until the
  // pointer is on that row's name, and a synthetic click reaches nothing.
  const hover = async (top) => {
    const at = await tab.evaluate((wanted) => {
      const row = [...document.querySelectorAll('[data-depth]')]
        .find((one) => Math.round(one.getBoundingClientRect().y) === wanted)
      if (row === undefined) return null
      const box = row.getBoundingClientRect()
      return { x: box.x + 30, y: box.y + box.height / 2 }
    }, top)
    if (at === null) return false
    await tab.mouse.move(at.x, at.y)
    await tab.waitForTimeout(140)
    return true
  }
  const away = async () => { await tab.mouse.move(4, WINDOW.height - 8); await tab.waitForTimeout(80) }

  const pressEntry = async (top, icon) => {
    const edge = await panelRight()
    const at = await tab.evaluate(([wantedTop, wantedIcon, rightEdge]) => {
      const inPanel = [...document.querySelectorAll(`[data-icon="${wantedIcon}"]`)]
        .filter((one) => one.getBoundingClientRect().x < rightEdge)
      const entry = wantedTop === null
        ? inPanel[0]
        : inPanel.find((one) => Math.abs(one.getBoundingClientRect().y - wantedTop) < 30)
      if (entry === undefined) return null
      const box = entry.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }, [top, icon, edge])
    if (at === null) return false
    await tab.mouse.move(at.x, at.y)
    await tab.mouse.down()
    await tab.mouse.up()
    await tab.waitForTimeout(220)
    return true
  }

  return {
    tab, rows, topOf, hover, away, pressEntry, cutRows, showWholeNames,
    // Which rows are held at the top, in the order they are held there.
    //
    // The shell writes `data-pinned` on every row, so this reads the same fact
    // the sample's `pinnedTop` class carries -- and it reads DOM order, which
    // is what FR-098 lifts.
    pinned: () => tab.evaluate(() =>
      [...document.querySelectorAll('[data-depth][data-pinned="true"]')]
        .map((row) => (row.querySelector('span')?.textContent ?? '').trim())),
    counts: () => tab.evaluate(() =>
      [...document.querySelectorAll('[data-depth]')]
        .filter((row) => row.querySelector('[data-folded-rows]') !== null)
        .map((row) => `${(row.querySelector('span')?.textContent ?? '').trim()}=${
          row.querySelector('[data-folded-rows]')?.getAttribute('data-folded-rows') ?? ''}`)),
    /**
     * Which entrances stand armed and which are drawn faint, keyed the way the
     * sample keys them -- `<row name>:<the sample's act>`.
     *
     * ⛔ THE ARMING IS AN ATTRIBUTE. FR-029 draws a spent entrance in `S-149`
     * and marks it `aria-disabled`; nothing else tells the two apart.
     */
    faint: async () => {
      const byAct = Object.fromEntries(
        Object.entries(SAME_ENTRANCE).map(([act, icon]) => [icon, act]))
      const edge = await panelRight()
      return tab.evaluate(([actOf, rightEdge]) => {
        const spent = (entry) => entry.getAttribute('aria-disabled') === 'true' ? 'faint' : 'armed'
        const head = [...document.querySelectorAll('[data-icon]')]
          .filter((one) => {
            const box = one.getBoundingClientRect()
            return box.x < rightEdge && box.y < 85
          })
          .map((one) => `head:${actOf[one.getAttribute('data-icon') ?? ''] ?? ''}=${spent(one)}`)
        const rows = [...document.querySelectorAll('[data-depth]')].flatMap((row) =>
          [...row.querySelectorAll('[data-icon]')].map((one) =>
            `${(row.querySelector('span')?.textContent ?? '').trim()}:${
              actOf[one.getAttribute('data-icon') ?? ''] ?? ''}=${spent(one)}`))
        return [...head, ...rows]
      }, [byAct, edge])
    },
    // ⛔⛔ RESOLVED BY NAME AT EVERY STEP, NEVER BY A REMEMBERED y. The panel
    // re-lays out after each press, so a `y` read before the hover can belong to
    // a different row by the time the entrance is looked for -- measured: an
    // `add` meant for 「Back Office」 landed on 「Tablet App」 and two rows were
    // built under the wrong parent, with no error raised.
    pressRow: async (name, act) => {
      const onName = await tab.evaluate((wanted) => {
        const row = [...document.querySelectorAll('[data-depth]')]
          .find((one) => (one.querySelector('span')?.textContent ?? '').trim() === wanted)
        if (row === undefined) return null
        const box = row.getBoundingClientRect()
        return { x: box.x + 30, y: box.y + box.height / 2 }
      }, name)
      if (onName === null) return false
      await tab.mouse.move(onName.x, onName.y)
      await tab.waitForTimeout(160)
      const edge = await panelRight()
      const onEntry = await tab.evaluate(([wanted, icon, rightEdge]) => {
        const row = [...document.querySelectorAll('[data-depth]')]
          .find((one) => (one.querySelector('span')?.textContent ?? '').trim() === wanted)
        if (row === undefined) return null
        // ⭐ THE ENTRANCE INSIDE THAT ROW, not one near its y.
        const entry = [...row.querySelectorAll(`[data-icon="${icon}"]`)]
          .find((one) => one.getBoundingClientRect().x < rightEdge)
        if (entry === undefined) return null
        const box = entry.getBoundingClientRect()
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      }, [name, SAME_ENTRANCE[act], edge])
      if (onEntry === null) { await away(); return false }
      await tab.mouse.move(onEntry.x, onEntry.y)
      await tab.mouse.down(); await tab.mouse.up()
      await tab.waitForTimeout(240)
      await away()
      return true
    },
    pressHead: async (act) => {
      const done = await pressEntry(37, SAME_ENTRANCE[act])
      await away()
      return done
    },
  }
}

export { openSample, openApp, chromium }
