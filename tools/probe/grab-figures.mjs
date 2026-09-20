// tools/probe/grab-figures.mjs
//
// Draws the 6 CR-430 figures (change-request/CR-430-grab-margins-hit-order-pointers-and-labels.md
// section 4.4, steps 1-6) from the touchable sample
// previous-project-result/16-grab-area-sizing/grab-area-sizing-sample.html, and writes them as
// standalone SVG files under docs/spec/_assets/.
//
// ⛔ DO NOT DRAW THESE BY HAND. This probe is the only way they are produced.
//
// ⭐ SAFETY GATE (CR-430 4.4 step 3): the sample's own sliders already carry the NEW values this CR
// proposes (its "behavioural ground truth" role -- see previous-project-result/16-grab-area-sizing/
// README.md). Whether those values are safe to draw INTO THE SPEC's assets depends on whether
// docs/spec/_source/settings.json already carries them too. This probe reads a curated set of
// settings.json rows (chosen from CR-430 section 4.3 and the spec draft's section 5) and refuses to
// export anything if even one differs from the sample's baked-in default -- or if a row CR-430 needs
// does not exist in settings.json yet. It never invents a value to fill a gap.
//
// Usage:
//   node tools/probe/grab-figures.mjs
//
// Exit code 0 with 6 files written means the gate passed and the figures reflect the spec's current
// values. Exit code 1 means the gate stopped the run (printed as a table); no file under
// docs/spec/_assets is touched in that case.
//
// ⚠️ Node resolves `playwright` upward from this file to the repository's own node_modules, so this
// probe cannot live outside the repository (see tools/probe/README.md).
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')
const SAMPLE_PATH = path.resolve(
  REPO_ROOT, 'previous-project-result/16-grab-area-sizing/grab-area-sizing-sample.html')
const SAMPLE_URL = 'file://' + SAMPLE_PATH.split(path.sep).join('/')
const SETTINGS_PATH = path.resolve(REPO_ROOT, 'docs/spec/_source/settings.json')
const OUT_DIR = path.resolve(REPO_ROOT, 'docs/spec/_assets')

// ================================================================== settings.json

/** Flatten every row of every "table" block into a Map keyed by row id. */
function loadSettingsRows() {
  const raw = fs.readFileSync(SETTINGS_PATH, 'utf8')
  const data = JSON.parse(raw)
  const rows = new Map()
  for (const block of data.blocks || []) {
    if (!Array.isArray(block.rows)) continue
    for (const row of block.rows) rows.set(row.id, { ...row, block: block.id })
  }
  return rows
}

/** Read the plain numeric default of a settings.json row, or null when it is not a plain number
 *  (a reference like "`S-137`", a pair, a literal, or missing). */
function rowDefaultNumber(row) {
  if (!row) return null
  const d = row.default
  if (d && typeof d === 'object' && 'num' in d) return Number(d.num)
  return null
}

// The GA table (CR-430 section 4.4): 22 grab objects, 41 numeric values, settings.json rows
// S-250..S-290 in a fixed pattern (out/in/v, or w/v, one row per direction). Two objects (GA-9, GA-14,
// "the drawn shape itself") carry no value by design. Cross-checked here against the sample's own
// GRAB object -- not by ID number (a probe should not guess a row id), but by reading each row's own
// "value" text for the "GA-<n>" it names, so a renumbering would fail loud rather than silently check
// the wrong row.
const GA_FIELDS = [
  ['GA-1', 'planStart', ['out', 'in', 'v']], ['GA-2', 'planEnd', ['out', 'in', 'v']],
  ['GA-3', 'actualStart', ['out', 'in', 'v']], ['GA-4', 'actualEnd', ['out', 'in', 'v']],
  ['GA-5', 'dummyStart', ['out', 'in', 'v']], ['GA-6', 'dummyEnd', ['out', 'in', 'v']],
  ['GA-7', 'fadeIn', ['w']], ['GA-8', 'fadeOut', ['w']],
  ['GA-10', 'aPlanStart', ['w', 'v']], ['GA-11', 'aPlanEnd', ['w', 'v']],
  ['GA-12', 'aActualStart', ['w', 'v']], ['GA-13', 'aActualEnd', ['w', 'v']],
  ['GA-15', 'msPlan', ['w', 'v']], ['GA-16', 'msActual', ['out', 'v']], ['GA-17', 'msDummy', ['out', 'v']],
  ['GA-18', 'marker', ['out']], ['GA-19', 'dep', ['out']], ['GA-20', 'resume', ['out']],
  ['GA-21', 'aDummyStart', ['w', 'v']], ['GA-22', 'aDummyEnd', ['w', 'v']],
]
const FIELD_WORDS = {
  out: ['端の外側', '掴む箱の外側', '外接正方形の外側', '描いたマーカーの外側', '描いた線の縁'],
  in: ['端の内側'],
  v: ['帯から上下へ'],
  w: ['基準点に中央を合わせた幅', '正方形の一辺', '菱形の幅に対する比'],
}

// Only a row's OWN "value" column names the GA row it belongs to (e.g. S-250's value is "表 T-266 の
// `GA-1`（矩形の予定の開始）の掴み代 -- 端の外側"); other rows sometimes MENTION a GA id in passing,
// inside their "note" column, as a cross-reference (S-49 explains minShapeWidth by pointing at GA-1's
// reach without being GA-1's own row). Matching on "value" only, never "note", avoids picking up S-49
// as if it were GA-1's own outside-reach row.
function gaSettingsRows(rows) {
  const found = []
  for (const row of rows.values()) {
    const v = row.value
    const t = v && typeof v === 'object' && typeof v.ja === 'string' ? v.ja : ''
    const m = t.match(/`GA-(\d+)`/)
    if (m) found.push({ row, ga: 'GA-' + m[1], text: t })
  }
  return found
}

function pickField(candidates, field) {
  const words = FIELD_WORDS[field]
  return candidates.find((c) => words.some((w) => c.text.includes(w)))
}

// The two headline value changes CR-430 names by id in its section 4.3 (existing rows, so it is fair
// to check them directly by id), plus the three grab areas that section 4.3 says are brand-new rows
// (checked by CONTENT below, in checkNewNoteRows, the same way as the GA table -- never by guessing an
// id for a row that might not exist).
const DIRECT_CHECKS = [
  {
    id: 'S-22', label: 'markerSize (progress marker diameter)',
    sampleValue: async (page) => page.evaluate(() => S.markerSize),
  },
  {
    id: 'S-249', label: 'pointer image side (S.cur, box/line arrow pointers)',
    sampleValue: async (page) => page.evaluate(() => S.cur),
  },
]

// Rows this probe's PREVIOUS run (before the CR-430 patch) found MISSING: the highlight-box frame and
// the comment-box leader-line / tip grabs (CR-430 section 4.3, "note-frame/comment-line/comment-tip
// split"). Found by content, same reasoning as the GA table.
const NOTE_CHECKS = [
  { phrase: '枠線から内と外へ', label: 'highlight-box frame grab (GRAB.noteFrame.out)', sampleValue: async (page) => page.evaluate(() => GRAB.noteFrame.out) },
  { phrase: '線から左右へ', label: 'comment-box leader-line grab (GRAB.commentLine.out)', sampleValue: async (page) => page.evaluate(() => GRAB.commentLine.out) },
  { phrase: '線先から', label: 'comment-box tip grab (GRAB.commentTip.out)', sampleValue: async (page) => page.evaluate(() => GRAB.commentTip.out) },
]

function rowText(row) {
  const parts = []
  for (const v of Object.values(row)) {
    if (v && typeof v === 'object' && typeof v.ja === 'string') parts.push(v.ja)
    if (v && typeof v === 'object' && v.prefix && typeof v.prefix.ja === 'string') parts.push(v.prefix.ja)
  }
  return parts.join(' | ')
}

async function checkGaTable(page, rows) {
  const gaRows = gaSettingsRows(rows)
  const results = []
  for (const [ga, ownerKey, fields] of GA_FIELDS) {
    const candidates = gaRows.filter((r) => r.ga === ga)
    const sampleObj = await page.evaluate((k) => GRAB[k], ownerKey)
    for (const field of fields) {
      const row = pickField(candidates, field)
      let settingsValue = rowDefaultNumber(row && row.row)
      const sampleValue = sampleObj ? sampleObj[field] : undefined
      // GA-15's width is stored as a x100 ratio in settings.json (1.15x) vs a percent in the sample
      // (115), per CR-430 4.4's own row: "菱形の幅に対する比" / GRAB.msPlan.w. Documented conversion,
      // not a guess: S-278's own text says "x", the sample's own comment says "% of the diamond's
      // width" for this one field.
      if (ga === 'GA-15' && field === 'w' && settingsValue !== null) settingsValue = Math.round(settingsValue * 100)
      const present = row !== undefined && settingsValue !== null && sampleValue !== undefined
      const ok = present && Math.abs(settingsValue - sampleValue) < 1e-9
      results.push({ id: row ? row.row.id : '(none)', label: `${ga} ${ownerKey}.${field}`, settingsValue, sampleValue, present, ok })
    }
  }
  return results
}

async function runSettingsGate(page) {
  const rows = loadSettingsRows()
  const results = []
  for (const check of DIRECT_CHECKS) {
    const row = rows.get(check.id)
    const settingsValue = rowDefaultNumber(row)
    const sampleValue = await check.sampleValue(page)
    const present = row !== undefined && settingsValue !== null
    results.push({ id: check.id, label: check.label, settingsValue, sampleValue, present, ok: present && settingsValue === sampleValue })
  }
  for (const check of NOTE_CHECKS) {
    const row = [...rows.values()].find((r) => rowText(r).includes(check.phrase))
    const settingsValue = rowDefaultNumber(row)
    const sampleValue = await check.sampleValue(page)
    const present = row !== undefined && settingsValue !== null
    results.push({ id: row ? row.id : '(none)', label: check.label, settingsValue, sampleValue, present, ok: present && settingsValue === sampleValue })
  }
  results.push(...await checkGaTable(page, rows))
  const mismatches = results.filter((r) => !r.ok)
  return { results, ok: mismatches.length === 0, mismatches }
}

function printGateReport(gate) {
  console.log('[settings-gate] docs/spec/_source/settings.json vs. the sample defaults, ' + gate.results.length + ' check(s)')
  for (const r of gate.results) {
    const status = !r.present ? 'MISSING ' : r.ok ? 'match   ' : 'MISMATCH'
    if (status !== 'match   ') {
      console.log('  ' + [status, r.id, r.label, 'settings=' + JSON.stringify(r.settingsValue), 'sample=' + JSON.stringify(r.sampleValue)].join(' | '))
    }
  }
  console.log('[settings-gate] ' + (gate.results.length - gate.mismatches.length) + ' match, ' + gate.mismatches.length + ' mismatch/missing')
  if (gate.ok) {
    console.log('[settings-gate] PASS: settings.json already carries every value this figure set depends on. Drawing.')
  } else {
    console.log('[settings-gate] STOP: refusing to export any of the 6 docs/spec/_assets/fig-*.svg files.')
    console.log('  Not inventing a settings.json value to close the gap above. Fix settings.json or the sample,')
    console.log('  then re-run this probe.')
  }
}

// ================================================================== page setup

async function openSample(browser) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(SAMPLE_URL)
  // the sample remembers the right pane's width in localStorage; clear it so layout is reproducible
  await page.evaluate(() => { try { localStorage.clear() } catch (_) { /* ignore */ } })
  await page.reload()
  await page.waitForSelector('#stage')
  return page
}

/** CR-430 4.4 step 3: display scale 100, day width 12, every display toggle on. Set explicitly so the
 *  figures do not depend on the sample file's own current defaults happening to already be these. */
async function applyBaselineDisplay(page) {
  await page.evaluate(() => {
    S.scale = 100; S.dayPx = 12
    document.getElementById('scale').value = '100'
    document.getElementById('dayPx').value = '12'
    for (const id of ['showZones', 'showPlan', 'showActual', 'showMarker', 'showName', 'showPercent',
                       'showAssignee', 'msActual', 'showDeps', 'showNote']) {
      document.getElementById(id).checked = true
    }
    tieRunIn(); tieMarker(); showOutputs(); draw()
  })
}

// Task A-F / Milestone A / Assignee A-C, per section 1 item 1 of this task's brief: never ship the
// sample's own industry-flavoured example names into a figure that lands in the specification.
// The two places the ORIGINAL data reused the same real assignee (task & arrow: '設計担当') map to the
// same neutral label, so the figures still show that two tasks share one assignee.
const NEUTRAL = {
  task: { name: 'タスク A', assignee: '担当 A' },
  unset: { name: 'タスク B', assignee: '担当 B' },
  arrow: { name: 'タスク C', assignee: '担当 A' },
  ms: { name: 'マイルストーン A', assignee: '担当 C' },
  k1: { name: 'タスク D', assignee: '担当 A' },
  k2: { name: 'タスク E', assignee: '担当 B' },
  k3: { name: 'タスク F', assignee: '担当 C' },
}

async function applyNeutralNames(page) {
  await page.evaluate((neutral) => {
    for (const [key, v] of Object.entries(neutral)) {
      if (!M[key]) continue
      M[key].name = v.name
      if ('assignee' in M[key]) M[key].assignee = v.assignee
    }
    draw()
  }, NEUTRAL)
}

// ================================================================== SVG assembly

// Copied verbatim from the sample's own <style> :root block (grab-area-sizing-sample.html lines 7-11):
// the shapes reference these as var(--plan) etc, so a standalone file needs them re-declared.
const ROOT_VARS = `--ink:#16181d; --ink2:#55606f; --rule:#d7dde7; --ground:#fdfdfd;
    --plan:#bcd8f5; --plan-edge:#3b6fb5; --actual:#4a8fe0; --actual-edge:#2d5f9e;
    --ms:#f0b429; --ms-edge:#946200; --dummy:#8e44ad; --dummy-edge:#5b2c6f; --ms-dummy:#e3c496;
    --arrow-plan:#5390d4; --arrow-actual:#10366b; --ms-actual:#8a5a00;
    --dep:#4b5563; --dep-picked:#d0342c;`

function fontFamilyFromSettings() {
  const rows = loadSettingsRows()
  const row = rows.get('S-246') // "画面と書き出す絵の字の書体の並び" -- named for exactly this use
  const ja = row && row.default && row.default.ja
  if (typeof ja === 'string') return ja.replace(/`/g, '')
  return '"Yu Gothic UI", "Yu Gothic", YuGothic, "BIZ UDPGothic", sans-serif'
}

function provenanceComment(figureFile) {
  // NOTE: XML/SVG comments may not contain "--" anywhere in their content, so this text avoids the
  // double-hyphen dash style used elsewhere in this file's own (non-XML) comments.
  return `<!-- GENERATED ARTIFACT: do not hand-edit.
     source: previous-project-result/16-grab-area-sizing/grab-area-sizing-sample.html (behaviour)
             + docs/spec/_source/settings.json (values, gated: see the probe's settings-gate)
     regenerate: node tools/probe/grab-figures.mjs
     produced this file: docs/spec/_assets/${figureFile}
-->`
}

function svgDocument({ file, title, width, height, viewBox, ariaLabel, body, extraStyle = '' }) {
  const fontFamily = fontFamilyFromSettings()
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}" role="img" aria-label="${ariaLabel}">
  <title>${title}</title>
  ${provenanceComment(file)}
  <style>
    :root { ${ROOT_VARS} }
    svg { background: var(--ground); }
    text { font-family: ${fontFamily}; fill: var(--ink); }
    .band-bg { fill: var(--ground); }
    ${extraStyle}
  </style>
${body}
</svg>
`
}

/** The markup of #stage's paint layers, restricted to the direct children whose own getBBox()
 *  intersects the crop window -- coordinates stay absolute against the original 900x500 canvas (a
 *  child kept in full, not re-clipped), so this is just "drop what cannot show through this viewBox"
 *  rather than a re-derivation of the drawing. Keeps a small per-task window (figure 5) from dragging
 *  in the other 59 unrelated day gridlines and every other task's bars. */
async function filteredStageMarkup(page, { x0, y0, x1, y1 }) {
  return page.evaluate(({ x0, y0, x1, y1 }) => {
    const stage = document.getElementById('stage')
    const intersects = (b) => !(b.x + b.width < x0 || b.x > x1 || b.y + b.height < y0 || b.y > y1)
    let out = ''
    for (const layer of stage.children) {
      const attrs = Array.from(layer.attributes).map((a) => `${a.name}="${a.value}"`).join(' ')
      let inner = ''
      for (const child of layer.children) {
        let bb = null
        try { bb = child.getBBox() } catch (_) { bb = null }
        if (!bb || intersects(bb)) inner += child.outerHTML
      }
      out += `<g ${attrs}>${inner}</g>`
    }
    return out
  }, { x0, y0, x1, y1 })
}

/** Bounding box (screen px, on the 900x500 canvas) of everything belonging to the given owner keys:
 *  drawn shapes, name/assignee label boxes, and grab-area zones. Used to fit a crop around a row. */
async function ownerBBox(page, owners, margin = 4) {
  const box = await page.evaluate((owners) => {
    const pts = []
    for (const s of shapes) if (owners.includes(s.owner)) {
      if (s.kind === 'diamond') pts.push([s.cx - s.r, s.cy - s.r], [s.cx + s.r, s.cy + s.r])
      else pts.push([s.x, s.y], [s.x + s.w, s.y + s.h])
    }
    for (const b of labelBoxes) if (owners.includes(b.owner)) pts.push([b.x, b.y], [b.x + b.w, b.y + b.h])
    for (const z of zones) if (z.fill && owners.includes(z.id.split('-')[0])) pts.push([z.x, z.y], [z.x + z.w, z.y + z.h])
    if (!pts.length) return null
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  }, owners)
  if (!box) throw new Error('ownerBBox: no shapes/zones found for owners ' + owners.join(','))
  return { x0: box.x0 - margin, x1: box.x1 + margin, y0: box.y0 - margin, y1: box.y1 + margin }
}

/** Figures 1-3: crop to a full-width horizontal band (a "row"), per CR-430 4.4 step 5 ("viewBox を行
 *  の帯に絞り"). Only the Y extent is derived from the row's content; X stays the full 900 canvas. */
async function buildRowMapFigure(page, { file, title, ariaLabel, owners, note }) {
  const bbox = await ownerBBox(page, owners, 6)
  const y0 = Math.max(0, Math.floor(bbox.y0)), y1 = Math.ceil(bbox.y1)
  const width = 900, height = y1 - y0
  const inner = await filteredStageMarkup(page, { x0: 0, y0, x1: width, y1 })
  const body = `  <rect class="band-bg" x="0" y="${y0}" width="${width}" height="${height}"/>\n  ${inner}`
  return { file, svg: svgDocument({ file, title, width, height, viewBox: `0 ${y0} ${width} ${height}`, ariaLabel, body }), note }
}

/** Figure 4 (fig-hit-stacked-row.svg): CR-430 4.4 decision 6 -- hitAt() sampled every 1 screen px
 *  across the stacked row, horizontally-adjacent pixels with the SAME resolved answer merged into one
 *  rect, painted with that zone's own grab-area colour (z.fill, straight from the sample -- not a
 *  colour table this probe maintains separately). Painted on top of the ordinary drawing, same as the
 *  sample's own "掴み代の面" toggle already does (zones is the topmost paint layer), except here every
 *  rect is the RESOLVED single winner rather than every raw, possibly-overlapping declared box. */
async function buildHitStackedFigure(page) {
  const owners = ['k1', 'k2', 'k3', 'note']
  const bbox = await ownerBBox(page, owners, 8)
  const x0 = Math.max(0, Math.floor(bbox.x0)), x1 = Math.min(900, Math.ceil(bbox.x1))
  const y0 = Math.max(0, Math.floor(bbox.y0)), y1 = Math.ceil(bbox.y1)
  // draw the row without the sample's own raw-zone wash; this figure supplies its own resolved one
  await page.evaluate(() => { document.getElementById('showZones').checked = false; draw() })
  const inner = await filteredStageMarkup(page, { x0: 0, y0, x1: 900, y1 })
  const raster = await page.evaluate(({ x0, x1, y0, y1 }) => {
    const rects = []
    for (let y = y0; y < y1; y++) {
      let run = null
      for (let x = x0; x < x1; x++) {
        const z = hitAt(x, y)
        const key = z ? z.id : null
        const fill = z ? z.fill : null
        if (run && run.key === key) { run.x1 = x + 1 }
        else { if (run && run.fill) rects.push({ x: run.x0, y, w: run.x1 - run.x0, h: 1, fill: run.fill })
          run = { x0: x, x1: x + 1, key, fill } }
      }
      if (run && run.fill) rects.push({ x: run.x0, y, w: run.x1 - run.x0, h: 1, fill: run.fill })
    }
    return rects
  }, { x0, x1, y0, y1 })
  await page.evaluate(() => { document.getElementById('showZones').checked = true; draw() })
  const rasterMarkup = raster.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}"/>`).join('')
  const width = 900, height = y1 - y0
  const body = `  <rect class="band-bg" x="0" y="${y0}" width="${width}" height="${height}"/>\n  ${inner}\n  <g data-layer="hit-raster">${rasterMarkup}</g>`
  return {
    file: 'fig-hit-stacked-row.svg',
    svg: svgDocument({
      file: 'fig-hit-stacked-row.svg', title: '図 F-023 -- 積んだ行の応え方（hitAt を 1px 刻みで塗る）',
      width, height, viewBox: `0 ${y0} ${width} ${height}`,
      ariaLabel: 'stacked row hit-test raster, 1px steps, coloured by the resolved grab area',
      body,
    }),
    note: `raster rects: ${raster.length}`,
  }
}

/** Figure 5 (fig-label-placement.svg): the 8 rows of table LP, in 8 small windows. Reuses tasks
 *  already in the sample rather than inventing new scenarios -- see the mapping table in the report:
 *  LP-1/3 = task (=== , name fits), LP-2/4 = unset (===, name does not fit), LP-5/6 = arrow (--->),
 *  LP-7/8 = ms (milestone); the /odd,/even pairs differ only by the global marker toggle, which is
 *  exactly the axis LP-1..4 and LP-5/6 and LP-7/8 vary on. */
async function buildLabelPlacementFigure(page) {
  const windows = []
  const shots = [
    { marker: true, cells: [['LP-1', ['task']], ['LP-2', ['unset']], ['LP-5', ['arrow']], ['LP-7', ['ms', 'ms2']]] },
    { marker: false, cells: [['LP-3', ['task']], ['LP-4', ['unset']], ['LP-6', ['arrow']], ['LP-8', ['ms', 'ms2']]] },
  ]
  for (const shot of shots) {
    await page.evaluate((marker) => { document.getElementById('showMarker').checked = marker; draw() }, shot.marker)
    for (const [lpId, owners] of shot.cells) {
      const bbox = await ownerBBox(page, owners, 6)
      const inner = await filteredStageMarkup(page, bbox)
      windows.push({ lpId, bbox, inner })
    }
  }
  await page.evaluate(() => { document.getElementById('showMarker').checked = true; draw() })

  const cols = 4, pad = 8, cellPad = 4
  const cellW = Math.max(...windows.map((w) => w.bbox.x1 - w.bbox.x0)) + 2 * cellPad
  const cellH = Math.max(...windows.map((w) => w.bbox.y1 - w.bbox.y0)) + 2 * cellPad + 14 // +label strip
  const rows = Math.ceil(windows.length / cols)
  const width = cols * cellW + (cols + 1) * pad
  const height = rows * cellH + (rows + 1) * pad
  let body = ''
  windows.forEach((w, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const cx = pad + col * (cellW + pad), cy = pad + row * (cellH + pad)
    const bw = w.bbox.x1 - w.bbox.x0, bh = w.bbox.y1 - w.bbox.y0
    body += `  <g transform="translate(${cx} ${cy})">
    <rect x="0" y="0" width="${cellW}" height="${cellH}" fill="none" stroke="var(--rule)"/>
    <text x="${cellPad}" y="11" font-size="10" font-weight="600">${w.lpId}</text>
    <svg x="${cellPad}" y="14" width="${bw}" height="${bh - 0}" viewBox="${w.bbox.x0} ${w.bbox.y0} ${bw} ${bh}">
      <rect x="${w.bbox.x0}" y="${w.bbox.y0}" width="${bw}" height="${bh}" fill="var(--ground)"/>
      ${w.inner}
    </svg>
  </g>\n`
  })
  return {
    file: 'fig-label-placement.svg',
    svg: svgDocument({
      file: 'fig-label-placement.svg', title: '図 F-024 -- 表 LP（札の配置）の 8 行を 8 つの小窓に',
      width, height, viewBox: `0 0 ${width} ${height}`,
      ariaLabel: '8 small windows, one per table LP row',
      body,
    }),
    note: `windows: ${windows.length}`,
  }
}

/** Figure 6 (fig-pointer-shapes.svg): the 9 rows of table PK, actual size and a true 4x optical zoom
 *  (same generated markup, width/height scaled -- NOT re-invoked at 4x the px argument, because
 *  several glyph functions hold their rim to a constant PHYSICAL width via rimUnits(px), so a fresh
 *  call at a larger px would change the shape's proportions rather than just magnify it). Rows 7/8
 *  (finger / open hand) have no drawn glyph in the sample -- they are the environment's native cursor
 *  -- so this figure says so in words instead of inventing artwork for them. */
function scaleGlyph(svg, factor) {
  return svg.replace(/width="([\d.]+)" height="([\d.]+)"/, (_, w, h) =>
    `width="${Number(w) * factor}" height="${Number(h) * factor}"`)
}

async function buildPointerShapesFigure(page) {
  const glyphs = await page.evaluate(() => ({
    'PK-1': { label: '箱の矢印 白', svg: blockArrowGlyph('left', false, S.cur) },
    'PK-2': { label: '箱の矢印 黒', svg: blockArrowGlyph('left', true, S.cur) },
    'PK-3a': { label: '三角 入', svg: fadeGlyph('in', fadeCursorPx()) },
    'PK-3b': { label: '三角 出', svg: fadeGlyph('out', fadeCursorPx()) },
    'PK-4': { label: '線の矢印', svg: lineArrowGlyph(S.cur) },
    'PK-5': { label: '円 〇', svg: discGlyph(false, S.msCur) },
    'PK-6': { label: '円 ●', svg: discGlyph(true, S.msActCur) },
    'PK-9': { label: '再開の折れ矢印', svg: resumeGlyph(S.resumeCur) },
  }))
  const NATIVE = { 'PK-7': '指（環境の既定カーソル。描いた図形を持たない）', 'PK-8': 'てのひら（環境の既定カーソル。描いた図形を持たない）' }

  const rowH = 84, labelW = 220, cellW = 140, pad = 8, headerH = 16
  const glyphRows = Object.entries(glyphs)
  const totalRows = glyphRows.length + Object.keys(NATIVE).length
  const width = pad * 3 + labelW + cellW * 2
  const height = headerH + pad * (totalRows + 1) + rowH * totalRows
  let body = `  <text x="${labelW + pad}" y="${headerH - 4}" font-size="10" fill="var(--ink2)">実寸</text>
  <text x="${labelW + cellW + pad}" y="${headerH - 4}" font-size="10" fill="var(--ink2)">4 倍</text>\n`
  let y = headerH + pad
  for (const [id, g] of glyphRows) {
    const at1 = g.svg, at4 = scaleGlyph(g.svg, 4)
    body += `  <g transform="translate(${pad} ${y})">
    <text x="0" y="${rowH / 2}" font-size="11">${id} ${g.label}</text>
    <g transform="translate(${labelW} ${(rowH - 24) / 2})">${at1}</g>
    <g transform="translate(${labelW + cellW} ${(rowH - 64) / 2})">${at4}</g>
  </g>\n`
    y += rowH + pad
  }
  for (const [id, label] of Object.entries(NATIVE)) {
    body += `  <g transform="translate(${pad} ${y})">
    <text x="0" y="${rowH / 2}" font-size="11">${id} ${label}</text>
  </g>\n`
    y += rowH + pad
  }
  return {
    file: 'fig-pointer-shapes.svg',
    svg: svgDocument({
      file: 'fig-pointer-shapes.svg', title: '図 F-025 -- 表 PK（ポインタの形）9 種、実寸と 4 倍',
      width, height, viewBox: `0 0 ${width} ${height}`,
      ariaLabel: '9 pointer glyphs at actual size and 4x magnification',
      body,
    }),
    note: `glyph rows: ${glyphRows.length} drawn + ${Object.keys(NATIVE).length} native`,
  }
}

// ================================================================== main

/** The whole pipeline. `skipGate` exists ONLY for this module's own self-test (see
 *  scratch/probe/, gitignored) so the drawing code can be exercised without waiting on the other
 *  session's settings.json edit -- the shipped CLI entry point below never sets it. When skipped, the
 *  gate report still prints, it just does not stop the run. */
export async function run({ outDir = OUT_DIR, skipGate = false } = {}) {
  const browser = await chromium.launch()
  try {
    const page = await openSample(browser)
    await applyBaselineDisplay(page)
    const gate = await runSettingsGate(page)
    printGateReport(gate)
    if (!gate.ok && !skipGate) return { ok: false, gate }

    await applyNeutralNames(page)

    const figures = []
    figures.push(await buildRowMapFigure(page, {
      file: 'fig-grab-map-bar.svg', title: '図 F-020 -- === の掴み代の地図（① ②）',
      ariaLabel: 'grab-area map for the === bar tasks (rows 1 and 2)', owners: ['task', 'unset'],
    }))
    figures.push(await buildRowMapFigure(page, {
      file: 'fig-grab-map-arrow.svg', title: '図 F-021 -- ---> の掴み代の地図（③ 3 段）',
      ariaLabel: 'grab-area map for the ---> line-only task, 3 stacked stages', owners: ['arrow'],
    }))
    figures.push(await buildRowMapFigure(page, {
      file: 'fig-grab-map-milestone.svg', title: '図 F-022 -- ◆ の掴み代の地図（④、隣接を含む）',
      ariaLabel: 'grab-area map for a milestone, including its neighbour', owners: ['ms', 'ms2'],
    }))
    figures.push(await buildHitStackedFigure(page))
    figures.push(await buildLabelPlacementFigure(page))
    figures.push(await buildPointerShapesFigure(page))

    fs.mkdirSync(outDir, { recursive: true })
    const written = []
    for (const fig of figures) {
      const dest = path.join(outDir, fig.file)
      fs.writeFileSync(dest, fig.svg, 'utf8')
      written.push({ file: fig.file, bytes: Buffer.byteLength(fig.svg, 'utf8'), note: fig.note })
    }
    console.log('[grab-figures] wrote ' + written.length + ' file(s) to ' + outDir)
    for (const w of written) console.log('  ' + w.file + '  ' + w.bytes + ' bytes  ' + (w.note || ''))
    return { ok: true, gate, written }
  } finally {
    await browser.close()
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const result = await run()
  process.exitCode = result.ok ? 0 : 1
}
