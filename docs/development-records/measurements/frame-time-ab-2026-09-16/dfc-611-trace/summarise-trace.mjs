// Split one Chrome trace of a held drag into per-frame stage times (DFC-611).
//
//   node summarise-trace.mjs <trace.json> [<trace.json> ...]      prints a table per file
//   import { summarise } from './summarise-trace.mjs'              used by dfc-611-trace.mjs
//
// A trace file is { traceEvents: [...] } (what dfc-611-trace.mjs writes, and what the
// DevTools Performance panel loads) or a bare array of events.
//
// ---------------------------------------------------------------------------
// What a "frame" is here
// ---------------------------------------------------------------------------
// The renderer main thread is the pid/tid carrying the most FireAnimationFrame events.
// FireAnimationFrame events that run back to back (the next starts within 1 ms of the
// previous one's end) are one frame. A frame WINDOW runs from one frame's first
// FireAnimationFrame start to the next frame's; its length is the frame interval as the
// trace clock sees it (wall clock at callback entry, not the rAF stamp the in-page probe
// uses). The first and the last window are dropped as partial. If the page emitted
// console.timeStamp('dfc611:<stretch>:start') / ':end', only windows starting between
// the two are kept.
//
// Every complete event (ph X, or a B/E pair) is nested by containment per thread; its
// SELF time (own dur less its direct children) is put in a stage by name (STAGE_OF) and
// charged to the window its start falls in. Per stage the per-window sums are reduced
// to a median and a mean over the windows. Means add up to the mean window; medians do
// not add up to anything.
//
// main.*     self time on the renderer main thread
// main.busy  sum of the top-level events on the main thread in the window
// main.idle  window length less main.busy
// off.*      self time on every other thread and process (raster workers, compositor,
//            GPU process), charged to the window its start falls in
// count.*    instant/complete events counted per window (DrawFrame, BeginFrame, ...)

import { readFileSync } from 'node:fs'

const STAGE_OF = new Map([
  // script
  ['FunctionCall', 'script'], ['EvaluateScript', 'script'], ['v8.compile', 'script'],
  ['v8.compileModule', 'script'], ['v8.evaluateModule', 'script'], ['V8.CompileCode', 'script'],
  ['v8.produceCache', 'script'], ['v8.produceModuleCache', 'script'], ['TimerFire', 'script'],
  ['FireAnimationFrame', 'script'], ['FireIdleCallback', 'script'], ['EventDispatch', 'script'],
  ['RunMicrotasks', 'script'], ['V8.Execute', 'script'], ['v8.callFunction', 'script'],
  ['MinorGC', 'script'], ['MajorGC', 'script'], ['BlinkGC.AtomicPhase', 'script'],
  ['XHRReadyStateChange', 'script'],
  // innerHTML and the like
  ['ParseHTML', 'parseHTML'],
  // style recalculation
  ['UpdateLayoutTree', 'style'], ['RecalculateStyles', 'style'], ['ParseAuthorStyleSheet', 'style'],
  // layout
  ['Layout', 'layout'],
  // hit testing (pointer moves ask it)
  ['HitTest', 'hitTest'],
  // paint and raster
  ['PrePaint', 'paint'], ['Paint', 'paint'], ['PaintImage', 'paint'], ['Decode Image', 'paint'],
  ['Decode LazyPixelRef', 'paint'], ['RasterTask', 'paint'], ['Rasterize', 'paint'],
  // layerize / commit / draw
  ['Layerize', 'composite'], ['UpdateLayer', 'composite'], ['UpdateLayerTree', 'composite'],
  ['CompositeLayers', 'composite'], ['Commit', 'composite'], ['ActivateLayerTree', 'composite'],
  ['DrawFrame', 'composite'],
  // GPU process
  ['GPUTask', 'gpu'],
])
const STAGES = ['script', 'parseHTML', 'style', 'layout', 'hitTest', 'paint', 'composite', 'gpu', 'other']
const COUNTED = ['BeginFrame', 'BeginMainThreadFrame', 'DrawFrame', 'DroppedFrame', 'Commit', 'HitTest', 'EventDispatch']

const stageOf = (name) => STAGE_OF.get(name) ?? (/^V8\.GC|^CppGC|^BlinkGC/.test(name) ? 'script' : 'other')

function median(values) {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2
}
const mean = (values) => (values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length)
const r2 = (v) => (v === null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100)

/** Complete events per thread: X as they are, B/E paired by name (LIFO per name). */
function completeEvents(events) {
  const out = []
  const openByThread = new Map()
  for (const e of events) {
    if (e.ph === 'X') {
      if (typeof e.dur === 'number' && e.dur >= 0) out.push(e)
    } else if (e.ph === 'B' || e.ph === 'E') {
      const key = `${e.pid}/${e.tid}/${e.name}`
      if (e.ph === 'B') {
        if (!openByThread.has(key)) openByThread.set(key, [])
        openByThread.get(key).push(e)
      } else {
        const begin = openByThread.get(key)?.pop()
        if (begin !== undefined) out.push({ ...begin, ph: 'X', dur: e.ts - begin.ts })
      }
    }
  }
  return out
}

/** Self time of every complete event, per thread, by containment. */
function selfTimes(complete) {
  const byThread = new Map()
  for (const e of complete) {
    const key = `${e.pid}/${e.tid}`
    if (!byThread.has(key)) byThread.set(key, [])
    byThread.get(key).push(e)
  }
  const nodes = []
  for (const [thread, list] of byThread) {
    list.sort((a, b) => (a.ts === b.ts ? b.dur - a.dur : a.ts - b.ts))
    const open = []
    for (const e of list) {
      while (open.length > 0 && e.ts >= open[open.length - 1].ts + open[open.length - 1].dur) open.pop()
      const parent = open[open.length - 1]
      const node = { thread, pid: e.pid, name: e.name, ts: e.ts, dur: e.dur, childUs: 0, top: parent === undefined }
      if (parent !== undefined) parent.childUs += e.dur
      open.push(node)
      nodes.push(node)
    }
  }
  return nodes
}

/**
 * @param events raw trace events
 * @param stretch optional stretch name; windows are limited to its dfc611 timestamps
 */
export function summarise(events, stretch = null) {
  const fafPerThread = new Map()
  for (const e of events) {
    if (e.name === 'FireAnimationFrame' && (e.ph === 'X' || e.ph === 'B')) {
      const key = `${e.pid}/${e.tid}`
      fafPerThread.set(key, (fafPerThread.get(key) ?? 0) + 1)
    }
  }
  const busiest = [...fafPerThread.entries()].sort((a, b) => b[1] - a[1])[0]
  if (busiest === undefined) return { ok: false, reason: 'no FireAnimationFrame in the trace' }
  const main = busiest[0]
  const mainPid = Number(main.split('/')[0])

  // the stretch's own bounds, from console.timeStamp
  let lo = -Infinity
  let hi = Infinity
  let boundsFound = false
  const stampOf = (e) => e.args?.data?.message ?? e.args?.data?.name ?? ''
  for (const e of events) {
    if (e.name !== 'TimeStamp') continue
    const msg = stampOf(e)
    const m = /^dfc611:(.+):(start|end)$/.exec(msg)
    if (m === null || (stretch !== null && m[1] !== stretch)) continue
    if (m[2] === 'start') { lo = e.ts; boundsFound = true } else hi = e.ts
  }

  const complete = completeEvents(events)
  const fafs = complete.filter((e) => e.name === 'FireAnimationFrame' && `${e.pid}/${e.tid}` === main)
    .sort((a, b) => a.ts - b.ts)
  const frames = []
  for (const f of fafs) {
    const last = frames[frames.length - 1]
    if (last !== undefined && f.ts <= last.end + 1000) last.end = Math.max(last.end, f.ts + f.dur)
    else frames.push({ start: f.ts, end: f.ts + f.dur })
  }
  const starts = frames.map((f) => f.start)
  // windows [starts[i], starts[i+1]), drop the first and the last (partial), keep those inside the bounds
  const windows = []
  for (let i = 1; i + 1 < starts.length - 1; i += 1) {
    if (starts[i] < lo || starts[i + 1] > hi) continue
    windows.push({ start: starts[i], end: starts[i + 1] })
  }
  if (windows.length === 0) return { ok: false, reason: 'no whole frame window inside the stretch', mainThread: main }

  const rows = windows.map((w) => ({
    intervalMs: (w.end - w.start) / 1000,
    main: Object.fromEntries(STAGES.map((s) => [s, 0])),
    off: Object.fromEntries(STAGES.map((s) => [s, 0])),
    busy: 0,
    count: Object.fromEntries(COUNTED.map((c) => [c, 0])),
  }))
  const firstStart = windows[0].start
  const lastEnd = windows[windows.length - 1].end
  const windowAt = (ts) => {
    if (ts < firstStart || ts >= lastEnd) return -1
    let a = 0
    let b = windows.length - 1
    while (a < b) {
      const m = (a + b + 1) >> 1
      if (windows[m].start <= ts) a = m
      else b = m - 1
    }
    return a
  }

  const offTop = new Map()
  for (const n of selfTimes(complete)) {
    const i = windowAt(n.ts)
    if (i < 0) continue
    const own = Math.max(0, n.dur - n.childUs) / 1000
    const stage = stageOf(n.name)
    if (n.thread === main) {
      rows[i].main[stage] += own
      if (n.top) rows[i].busy += n.dur / 1000
    } else {
      rows[i].off[stage] += own
      const where = n.pid === mainPid ? 'renderer' : `pid ${n.pid}`
      const key = `${where}: ${n.name}`
      offTop.set(key, (offTop.get(key) ?? 0) + own)
    }
  }
  for (const e of events) {
    if (!COUNTED.includes(e.name) || (e.ph === 'E')) continue
    const i = windowAt(e.ts)
    if (i >= 0) rows[i].count[e.name] += 1
  }

  const metric = (pick) => {
    const values = rows.map(pick)
    return { medianMs: r2(median(values)), meanMs: r2(mean(values)) }
  }
  const table = { 'frame interval': metric((r) => r.intervalMs) }
  for (const s of STAGES) table[`main.${s}`] = metric((r) => r.main[s])
  table['main.busy'] = metric((r) => r.busy)
  table['main.idle'] = metric((r) => Math.max(0, r.intervalMs - r.busy))
  for (const s of STAGES) table[`off.${s}`] = metric((r) => r.off[s])
  const counts = {}
  for (const c of COUNTED) {
    const values = rows.map((r) => r.count[c])
    counts[`count.${c}`] = { median: r2(median(values)), mean: r2(mean(values)) }
  }
  const offTopPerFrame = [...offTop.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, ms]) => ({ name, msPerFrame: r2(ms / rows.length) }))
  return {
    ok: true,
    mainThread: main,
    boundsFromTimeStamp: boundsFound,
    frames: rows.length,
    spanMs: r2((lastEnd - firstStart) / 1000),
    table,
    counts,
    offMainTopSelfPerFrame: offTopPerFrame,
  }
}

export function formatSummary(name, s) {
  const lines = [`== ${name}`]
  if (!s.ok) { lines.push(`  not summarised: ${s.reason}`); return lines.join('\n') }
  lines.push(`  main thread ${s.mainThread}, ${s.frames} frame windows over ${s.spanMs} ms` +
    (s.boundsFromTimeStamp ? ' (bounded by dfc611 timestamps)' : ' (whole trace)'))
  lines.push(`  ${'row'.padEnd(18)} ${'median ms'.padStart(10)} ${'mean ms'.padStart(10)}`)
  for (const [row, v] of Object.entries(s.table)) {
    lines.push(`  ${row.padEnd(18)} ${String(v.medianMs).padStart(10)} ${String(v.meanMs).padStart(10)}`)
  }
  for (const [row, v] of Object.entries(s.counts)) {
    lines.push(`  ${row.padEnd(26)} median ${v.median} mean ${v.mean} per frame`)
  }
  lines.push('  off-main top self time per frame:')
  for (const t of s.offMainTopSelfPerFrame) lines.push(`    ${String(t.msPerFrame).padStart(7)} ms  ${t.name}`)
  return lines.join('\n')
}

const isMain = process.argv[1] !== undefined &&
  import.meta.url.toLowerCase().endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop().toLowerCase())
if (isMain) {
  const files = process.argv.slice(2)
  if (files.length === 0) {
    process.stderr.write('usage: node summarise-trace.mjs <trace.json> [...]\n')
    process.exit(2)
  }
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    const events = Array.isArray(parsed) ? parsed : parsed.traceEvents
    const stretch = parsed.metadata?.stretch ?? null
    process.stdout.write(formatSummary(file, summarise(events, stretch)) + '\n')
  }
}
