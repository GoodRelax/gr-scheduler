# gr-scheduler performance measurement, 2026-09-05

All numbers below were taken with Playwright driving a headless Chromium against
`file://.../dist/index.html`, viewport 1920x1080. Every clock is started **inside
the page** from the real `pointerdown` / `keydown`, so the driver's round trip is
not in any number. Scripts are in `scratch/perf-*.mjs`; the harness is
`scratch/perf-lib.mjs`.

## 0. How each column was measured

| name | what it is |
| --- | --- |
| `work` | wall time inside one `requestAnimationFrame` callback. `requestAnimationFrame` is wrapped in an init script, so the log is exactly the frames the shell asked for. **This is the number `NFR-003` is about.** |
| `ms` | the press's own `pointerdown`/`keydown` to the end of the burst it starts. Carries the rAF wait and event dispatch on top of `work`. This is what a person waits. |
| frames | how many frames the shell asked for. Also the census `NFR-010` needs. |
| nodes +/- | DOM nodes (with descendants) added and removed, from a `MutationObserver` on `document.body`. |
| gBCR | `Element.prototype.getBoundingClientRect`, wrapped by the harness to accumulate call count and wall time. |
| innerHTML | the `innerHTML` setter on `Element.prototype`, wrapped the same way. |

Nothing in `src/` was edited. The one thing replaced on the app's own path is
`window.showOpenFilePicker` / `showSaveFilePicker` (the OS dialogue); the decode,
the validation, the layout and the drawing all run for real.

### Deviations from table T-025 that must be recorded

| row | what T-025 asks | what was used |
| --- | --- | --- |
| MC-4 | **integrated GPU (Intel UHD)** | headless Chromium, software rasteriser. **This is not MC-4.** The JS and layout numbers are unaffected (they are CPU), but any GPU-bound paint cost is not represented. |
| MC-5 | Chrome (Edge allowed) | Chromium **151.0.7922.34** (Playwright 1.62.1). Recorded, as the prose under T-025 requires. |
| MC-6 | 1920x1080, full screen, 100% | 1920x1080 viewport. Matches. |
| MC-1..3 | Windows 11 Pro 26200, i7-12650H, 64GB | matches this machine. |
| MC-7 | **50 rows / 1000 `Task`** | the **bundled startup document is 1000 `Task` / 100 rows** -- it is the target scale, and it is what most of this report measures. |

---

## 1. What is in the samples

`.ja.xml` and `.en.xml` hold the same counts, line for line.

| file | bytes | lines | `Task` | `Resource` | `Assignment` | max `OutlineLevel` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `sample-small-website-renewal.ja.xml` | 337,447 | 9,434 | 46 | 9 | 65 | 2 |
| `sample-medium-sfa-webapp.ja.xml` | 1,068,494 | 29,955 | 135 | 21 | 267 | 3 |
| `sample-large-erp-program.ja.xml` | 2,207,611 | 61,632 | 257 | 48 | 581 | 3 |
| `sample-small-website-renewal.en.xml` | 341,317 | 9,434 | 46 | 9 | 65 | 2 |
| `sample-medium-sfa-webapp.en.xml` | 1,084,049 | 29,955 | 135 | 21 | 267 | 3 |
| `sample-large-erp-program.en.xml` | 2,238,300 | 61,632 | 257 | 48 | 581 | 3 |

GRS JSON:

| file | bytes | lines | `Task` | `TaskGroup` | `Resource` | `Assignment` | `taskVisuals` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `Three-Year Product Plan.json` | 895,415 | 41,039 | **1000** | **100** | 14 | 946 | 37 |
| `No Name.json` | 9,684 | 443 | 0 | 1 | 14 | 0 | 0 |

**Two facts that decide what the rest of this report measures.**

1. **No MSPDI sample reaches the target scale.** The largest is 257 `Task`;
   `MC-7` asks for 1000. Read into the tool they become 46 / 135 / 257 rows (one
   derived `TaskGroup` per `Task` -- MSPDI carries no second axis).
2. **`Three-Year Product Plan.json` and the bundled startup template hold a
   BYTE-IDENTICAL `schedule`** (verified: `JSON.stringify` equal). Only five
   display settings differ. So the shipped document already is `MC-7`'s target
   scale, and it is the subject the gates apply to.

---

## 2. Reading (measure 1)

### Startup -- `NFR-001` / `PG-1`

One cold browser and a fresh page per reading. "domStill" is the DOM going quiet
(the boot draws with **no** `requestAnimationFrame` at all -- zero frames), "fcp"
is the browser's own first-contentful-paint entry.

| reading | DOM still (ms) | DCL (ms) | FCP (ms) | mutation records |
| --- | ---: | ---: | ---: | ---: |
| 1 | 160.9 | 160.9 | (not emitted) | 61 |
| 2 | 167.5 | 167.5 | 188 | 61 |
| 3 | 174.0 | 174.1 | 196 | 61 |
| 4 (throttle run) | 161.3 | -- | -- | -- |

**median 164 ms, min 160.9, max 174.0. NFR-001's ceiling is 1500 ms -- INSIDE,
by a factor of 9.**

### Reading a file (press IC-71 "replace" / the unsaved-edits Yes, to the picture)

| sample | `Task` | ms (repeat readings) |
| --- | ---: | --- |
| small | 46 | 27.0, 15.8, 15.9 |
| medium | 135 | 70.8, 26.7, 25.2 |
| large | 257 | 58.6, 38.0, 42.4 |
| `Three-Year Product Plan.json` | 1000 | 40.9, 28.9, 27.1 |
| `No Name.json` | 0 | 15.7, 14.7, 15.2 |

The first reading of each is the cold one. Nothing here is near a gate.

### Growth with the task count (`MC-9`, three readings each, median)

Documents built by `scratch/make-scales.mjs` from the shipped one -- smaller ones
by trimming whole `TaskGroup` subtrees (ancestors kept), larger by replicating the
whole schedule with offset uids and re-minted group ids.

| size | `Task` | `TaskGroup` | bytes | read ms | shapes at rest | scroll `work`/frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| x0.125 | 115 | 13 | 78 KB | 18.3 | 279 | 4.2 |
| x0.25 | 226 | 25 | 152 KB | 20.7 | 322 | 6.6 |
| x0.5 | 467 | 50 | 309 KB | 22.7 | 223 | 14.9 |
| **x1** | **1000** | **100** | 656 KB | **26.1** | 439 | **33.7** |
| x2 | 2000 | 200 | 1.3 MB | 41.6 | 802 | 64.1 |
| x4 | 4000 | 400 | 2.7 MB | 58.6 | 1520 | 117.1 |
| x8 | 8000 | 800 | 5.3 MB | 104.9 | 2956 | 233.3 |

8x the `Task` count costs **4.0x** the read and **6.9x** the frame. An
`O(n log n)` bound would allow 10.7x for the frame at this ratio; `O(n^2)` would
demand 64x. **`NFR-013` / `PG-14` -- INSIDE.** The exponent fitted over the whole
range is about **n^0.93** for the frame and **n^0.42** for the read.

---

## 3. Zoom (measure 2)

⚠️ The brief named `IC-15` / `IC-16` as the detail steps. The roster
(`src/adapter/screen-renderer/icon-roster.json`) says otherwise: **`IC-14` /
`IC-15` are the row axis (`S-76`)** -- the detail tier -- **`IC-12` / `IC-13` are
the time axis (`S-75`)**, and `IC-16` is the light/dark theme.

At the target scale (bundled document, 5041 shapes on the canvas):

| act | n | `work` med | min | p95 | max | `ms` med |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `IC-15` row zoom in | 8 | **41.0** | 34.8 | 48.0 | 48.0 | 44.2 |
| `IC-14` row zoom out | 8 | **36.6** | 27.4 | 39.4 | 39.4 | 36.9 |
| `IC-13` time zoom in | 8 | **30.4** | 19.2 | 33.3 | 33.3 | 30.9 |
| `IC-12` time zoom out | 8 | **31.0** | 17.6 | 51.9 | 51.9 | 31.3 |
| shift+wheel zoom x60 | 61 | **19.7** | 11.4 | 35.7 | 39.3 | -- |
| `IC-15`/`IC-14` alternating x20 | 21 | **35.6** (mean) | -- | -- | -- | -- |
| `IC-10` fit whole | 8 | 1.6 | 1.5 | 9.3 | 9.3 | 28.8 |

Shapes drawn move with the row zoom: 5041 at `zoomY` 1.00, 5238 at 1.61 (time
axis), 6716 at `zoomY` 1.61, 6572 after eight `IC-15` presses.

Each press is **one** frame. Every row above except `IC-10` is over the 16.7 ms
frame budget.

The outliers in `ms` (307, 341, 359, 397 ms) are machine load, not the act: the
same press's `work` in the same run stayed at 33-48 ms. This is the trap the
brief warned about, and it is why `work` is reported beside `ms` everywhere.

---

## 4. Editing (measure 3)

Target scale, heavy state, 12 repetitions where the act allows.

| act | n | `work` med | p95 | `ms` med | p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| select one `Task` (click) | 8 | -- | -- | **21.5** | 24.4 |
| delete one `Task` (`SK-3`) | 8 | **29.3** | 34.1 | 40.1 | 397.9* |
| undo the delete (`Ctrl+Z`) | 8 | **29.8** | 33.9 | 47.7 | 56.4 |
| fold / unfold a row | 8 | **10.3** | 17.2 | 10.7 | 18.2 |
| drag a bar, per frame | 252 | **16.6** | 20.9 | (max 28.7) | |
| range-select drag, per frame | 61 | **16.7** | 18.8 | (max 19.2) | |

\* the 397.9 ms is machine load; the same act's `work` was 34.1 ms at its worst.

**The brief's prior finding is refined, not confirmed.** One delete is **one**
frame costing 29.3 ms, and it does replace the picture whole -- but so does
**every** frame of a scroll or a zoom. The delete is not special; the whole-picture
rebuild is the standing cost of any frame at this scale (section 6).

Adding a `Task` was not measured: no entrance for it was found from the header
roster within the time available. Reported as not done.

---

## 5. Writing (measure 4)

Timed in the page from the press to the moment the file handle is closed. The
export chooser marks its rows `data-format="IO-n"`; the press must be a real one
(a scripted `element.click()` does not reach the road).

| act | `Task` | n | med | min | p95 | bytes written |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| save GRS JSON `Ctrl+S` (`SK-11`) | 1000 | 10 | **17.4** | 12.2 | 22.0 | 895,422 |
| export MSPDI (`IC-2` -> `IO-1`) | 1000 | 10 | **39.4** | 30.9 | 64.2 | 645,459 |
| save GRS JSON | 4000 | 6 | 67.0 | 58.8 | 73.0 | 3,612,279 |
| export MSPDI | 4000 | 6 | 118.1 | 108.0 | 143.1 | 2,595,050 |
| save GRS JSON | 8000 | 6 | **118.4** | 113.2 | 122.5 | 7,234,755 |
| export MSPDI | 8000 | 6 | **181.8** | 172.2 | 184.3 | 5,194,526 |

Earlier runs of the same `Ctrl+S` at 1000 `Task` gave medians of 7.0, 16.9 and
19.6 ms -- the spread is machine load, and 17.4 (n=10) is the settled figure.

8x the `Task` count costs **6.8x** the JSON save and **4.6x** the MSPDI export.
Both are sub-linear, both are far from any gate, and neither is a bottleneck.
`T-043` has no row for either (`PG-13`, autosave, was retired with the feature).

Build size (`PG-7`, record only): `dist/index.html` = **1,137,109 bytes**
(gzip 184.3 KB), 71 modules. Verified reproducible: a second `npx vite build` at
the end of the run produced the same byte count.

---

## 6. Scrolling (measure 5), and where the time goes

Target scale. Wheel events 8 ms apart, so the interval column is set by the
driver and only `work` is a property of the app.

| act | frames | `work`/frame | innerHTML/frame | gBCR/frame | nodes +/- per frame | unaccounted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| vertical wheel x25 (startup) | 25 | **33.4 ms** | **9.6 ms, 527k chars, 1 write** | **12.3 ms, 15.1 calls** | +5307 / -5307 | 11.6 ms |
| vertical wheel x25 (after a read) | 25 | 32.2 ms | 8.9 ms, 527k chars, 1 write | 12.4 ms, 15.2 calls | +5308 / -5121 | 10.9 ms |
| vertical wheel x25, **8000 `Task`** | 25 | **231.2 ms** | 67.5 ms, **4,183k chars** | 90.0 ms, 15.2 calls | +39356 / -37911 | 73.6 ms |
| shift+wheel zoom x40 | 41 | 25.4 ms | 10.9 ms, 635k chars | 4.3 ms, 6.8 calls | +5787 / -5760 | -- |
| `IC-15`/`IC-14` x20 | 21 | 35.6 ms | 9.7 ms, 651k chars | 12.8 ms, 23.8 calls | +6100 / -6100 | -- |
| **horizontal wheel x40** | 40 | **12.6 ms** | **0 ms, 0 writes** | **0 ms, 0 calls** | **+0 / -0** | 12.6 ms |
| pointer move over the canvas x40 | **0** | -- | -- | -- | -- | -- |
| idle 3000-4000 ms | **0-1** | -- | -- | -- | -- | -- |

Distribution of `work` over a 60-event vertical scroll: med **30.9**, min 27.9,
p95 **42.0**, max **50.0** (n=60). Horizontal: med 11.0, p95 16.6, max 18.7.

### The three costs, named

**(a) The whole picture is serialised to a string and re-parsed, every frame.**
`src/framework/dom-svg-surface/dom-svg-surface.ts:41` --

```ts
showSvg(svg: string): void {
  if (svg === last) return
  last = svg
  host.innerHTML = svg          // <- the whole picture, every frame
}
```

Measured: **one write of 527,000 characters per frame at 1000 `Task`, 4,183,000
at 8000**, replacing ~5,300 (resp. ~39,000) DOM nodes. Cost inside the setter
alone: **9.6 ms** and **67.5 ms**. The string is built by
`src/adapter/svg-renderer/svg-renderer.ts`, and building it is most of the
"unaccounted" column (11.6 ms / 73.6 ms).

**(b) A forced synchronous layout, every frame.**
`src/framework/dom-screen-surface/dom-screen-surface.ts:6138`, in
`reportRowControlsHeight` --

```ts
for (const box of rowTitleTree.querySelectorAll(stacked)) {
  tallest = Math.max(tallest, box.getBoundingClientRect().height)
}
```

plus `reportHeaderHeight` at :6104 and the anchor read at :6258. Measured
**15.1-15.2 `getBoundingClientRect` calls per frame costing 12.3 ms -- 37% of the
frame** at 1000 `Task`, and **90 ms** at 8000. Each call flushes style and layout
for a tree that (a) has just thrown away and rebuilt.

**The control experiment is in the table.** A horizontal wheel takes the same
frame path but makes **zero** `getBoundingClientRect` calls and **zero** DOM
changes, and costs 12.6 ms instead of 33.4 ms. The 21 ms difference is (a)+(b).

Sampling profiler agrees (`scratch/perf-14-profile.mjs`, CDP `Profiler`,
50 microsecond interval, vertical scroll x40): of the busy JS,
`getBoundingClientRect` **18.4%** and `showSvg` **13.2%** are the top two entries;
on a horizontal scroll `getBoundingClientRect` is **0%**.

### CPU throttling -- work, not waiting

| rate | startup DOM still | startup FCP | scroll `work` med | p95 | row-zoom `work` med | save med |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| x1 | 161.3 ms | -- | 31.3 | 38.1 | 31.5 | 16.9 |
| x4 | 767.7 ms | 804 ms | 156.1 (5.0x) | 199.8 | 158.6 | 73.5 |
| x8 | 2057.6 ms | 2140 ms | 391.4 (12.5x) | 552.1 | 310.5 | 118.7 |
| x20 | 5733.9 ms | 5948 ms | 1149.6 (36.7x) | 2951.7 | 1230.9 | 95.0 |

Linear to slightly super-linear throughout: **the cost is work, not waiting.**
Note also that `NFR-001` (1500 ms) is passed at x1 and x4 and **failed from x8**
(2058 ms) -- so the initial-draw margin against a slower office machine is about
6x, not 9x.

---

## 7. Verdict against Chapter 7

Tables **T-042** (milestones) and **T-043** (what to measure at each milestone)
both exist, in `docs/spec/05-07-design.md` around lines 1029 and 1042. **T-043
carries no numbers of its own** -- Chapter 7 says in as many words that it must
not (「本章に数値を書いてはならない（MUST NOT）」) and sends the pass values to
`NFR-001`..`NFR-003`, `NFR-010`, `NFR-011`, `NFR-013` and the conditions to table
T-025. So the gates below are read through those requirements.

| row | what it measures | source | measured | inside? |
| --- | --- | --- | --- | --- |
| `PG-1` | initial draw | `NFR-001` <= 1500 ms | **164 ms** median of 4 cold browsers | **INSIDE** |
| `PG-2` | mean frame rate in `MC-8` intervals | `NFR-002` >= 60 fps | frame **work alone** is 30.9-33.5 ms median while scrolling -> ceiling **~30 fps** | **OUTSIDE** |
| `PG-3` | frame time p95 | `NFR-003` <= 16.7 ms | scroll **42.0**; row zoom **48.0**; time zoom **51.9**; bar drag **20.9**; range select **18.8** | **OUTSIDE on every one** |
| `PG-4` | no torn first picture | `NFR-011` | not falsified (boot builds the tree in 61 mutation records, FCP 188-196 ms with DOM still at 167 ms) but **not checked paint by paint** | **NOT MEASURED to the standard** |
| `PG-5` | redraws while idle | `NFR-010` | **0 frames** in 4000 ms idle; **0 frames** for 40 pointer moves over the canvas | **INSIDE** |
| `PG-6` | shapes actually drawn (record only) | `FR-018` | 5,041 at rest at target scale, 6,716 zoomed in, 439 fitted; **~5,300 nodes rebuilt per frame** | recorded |
| `PG-7` | build bytes (record only) | `NFR-004` | **1,137,109** bytes, gzip 184 KB | recorded |
| `PG-8` | frame time while dragging | `NFR-002`/`NFR-003` | bar drag med **16.6**, p95 **20.9**, max 28.7 (n=252) | **OUTSIDE** |
| `PG-9` | hit-testing while hovering | `NFR-002` | a pointer move that changes nothing asks for **0 frames**, so there is no denominator -- exactly what `MC-8` says to exclude | nothing to measure |
| `PG-10` | dependency routing when dense | `NFR-002` | **NOT MEASURED** | -- |
| `PG-11` | rebuilding the overlay layer | `NFR-002` | **NOT MEASURED** | -- |
| `PG-12` | dense long labels | `NFR-002` | **NOT MEASURED** | -- |
| `PG-14` | growth with scale | `NFR-013` `O(n log n)` | 8x `Task` -> **6.9x** frame, **4.0x** read (the bound allows 10.7x) | **INSIDE** |

**Summary: `PG-1`, `PG-5` and `PG-14` are inside. `PG-2`, `PG-3` and `PG-8` are
outside, on the shipped document at the target scale `MC-7` names.** Four rows
were not measured.

---

## 8. Three defects found while measuring

### D-1. The same document draws two different pictures depending on how it arrived

The bundled document at startup: **5,041 shapes**, day-granular ruler, about ten
months on screen. **The same file read through `IC-1`: 439 shapes**, year-granular
ruler, three years on screen.

Proven by elimination in `scratch/perf-08-same-doc.mjs`: the five display settings
that differ between `Three-Year Product Plan.json` and the shipped template were
substituted one at a time and then all together -- **no change**. Then the shipped
template file *itself* was read through `IC-1`: **439 shapes**. So it is the road,
not the document.

### D-2. After a read, the zoom entrances write the setting but the picture does not follow

`scratch/perf-11-zoom-ab.mjs`, on the identical document:

| | canvas hash | canvas nodes | `zoomX` | `zoomY` |
| --- | ---: | ---: | ---: | ---: |
| startup, before | 847722845 | 5041 | 1 | 1 |
| startup, after `IC-13` x5 | -1006458086 | 5238 | 1.611 | 1 |
| startup, after `IC-15` x5 | 2081623133 | 6716 | 1.611 | 1.611 |
| **after a read**, before | -175881987 | 439 | 1 | 1 |
| **after a read**, after `IC-13` x5 | **-175881987** | **439** | 1.611 | 1 |
| **after a read**, after `IC-15` x5 | **-175881987** | **439** | 1.611 | 1.611 |
| then one wheel on the canvas | -1470266295 | **6714** | 1.611 | 1.611 |

26 presses of `IC-13` (`zoomX` x10.8) left the drawing **byte-identical**
(`scratch/perf-09-ruler.mjs`), and the screenshots `scratch/shot-2-after-read.png`
and `scratch/shot-3-zoomed.png` are the same picture. The accumulated zoom then
lands all at once on the next wheel event. `scrollDate` / `scrollGroupId` are
`null` until that wheel, which is the likely discriminator.

### D-3. A frame is run for an input that changes nothing

A plain horizontal wheel asks for **40 frames** at **12.6 ms each** and produces
**zero** `innerHTML` writes and **zero** DOM changes. 500 ms of CPU for no pixel.
`NFR-010` is about the idle case and is not violated, but the work is waste.

---

## 9. Proposals -- not implemented

Ordered by measured effect per file touched. **None of these was applied.**

### P-1. Do not rewrite the picture to scroll it. (effect: large, cost: 2-3 files)

A scroll changes no geometry, only which part is looked at. Draw once into a
group and move a `transform` (or the SVG `viewBox`) while scrolling, redrawing
only when the detail tier actually changes.

* Files: `src/framework/dom-svg-surface/dom-svg-surface.ts` (the seam),
  `src/adapter/svg-renderer/svg-surface.ts` (its contract),
  `src/adapter/svg-renderer/svg-renderer.ts` (emit a stable outer group).
* Expected: vertical-scroll frames from **33.4 ms toward the 2.8 ms** already
  measured when the picture does not change; removes the 527k-char serialise and
  re-parse (9.6 ms) and most of the style/layout the new tree forces.
* Risk: `FR-024`'s "same JSON, same picture" must still hold -- the transform road
  must produce the identical tree when the tier does change.

### P-2. Stop forcing a synchronous layout every frame. (effect: 37% of the frame, cost: 1 file)

`reportRowControlsHeight` (`dom-screen-surface.ts:6138`) measures every row-control
lattice box on **every** frame; the boxes only move when the font size, the row
template or the viewport changes. Measure on those events, cache otherwise. Same
for `reportHeaderHeight` (:6104).

* Files: `src/framework/dom-screen-surface/dom-screen-surface.ts` only.
* Expected: **-12.3 ms per frame at 1000 `Task`, -90 ms at 8000** -- 37% of the
  frame, measured directly through the wrapped `getBoundingClientRect`.
* Evidence it is separable: the horizontal-scroll path takes the same frame road
  with zero such calls.
* Risk: `HF-19`'s reason for measuring rather than computing (the reader's font
  size moves it) is preserved -- a font-size change is one of the events that
  re-measures.

### P-3. Do not run a frame that produces the picture already on screen. (effect: moderate, cost: 1 file)

`showSvg` already declines to write an identical string, but by then the string
has been built (11.6 ms) and the layout has been forced (12.3 ms). Decide earlier:
compare a cheap key of the frame's inputs in `frame-loop.ts` and skip the frame.

* Files: `src/framework/single-html-shell/frame-loop.ts`.
* Expected: removes the 40 x 12.6 ms measured for the horizontal wheel, and every
  other input that resolves to the same picture.
* Risk: the key must include everything `table T-066` feeds a frame, or a real
  change is dropped. A wrong key is worse than the cost.

### P-4. Split the picture into a still layer and a moving layer. (effect: large, cost: 3-4 files)

The ruler, the grid and the row bands do not change while a bar is dragged; the
bar and its dependency lines do. Emit two sibling groups and rewrite only the
second.

* Files: the renderer, the surface contract, the SVG surface, and the frame loop's
  call site.
* Expected: bar-drag frames (med 16.6, p95 20.9) fall under the 16.7 ms budget,
  which is what `PG-8` gates.
* Risk: the largest change of the four; two layers can drift out of register.

**P-2 first** -- one file, 37% of the frame, and the control experiment already
proves the calls are separable from the rest of the frame. **P-1 next.** Together
they are the only two that get a target-scale scroll under 16.7 ms.

---

## 10. What was not done

* **`PG-10` / `PG-11` / `PG-12`** -- dependency routing when dense, overlay-layer
  rebuild, dense long labels. No scene was built for any of them.
* **`PG-4` / `NFR-011`** -- not falsified, but not checked paint by paint.
* **Adding a `Task`** -- no entrance for it was found from the header roster.
* **`MC-4`** -- measured on a software rasteriser, not the integrated GPU.
