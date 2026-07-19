# Performance Benchmark Harness (M1 / RISK-001 / ADR-009)

This document explains how to run the M1 walking-skeleton performance benchmark
and what it measures. The harness exists to support the **RISK-001** rendering
performance gate for **NFR-L1-002** (mid-size data: ~50 rows / ~1000 items,
60fps zoom/pan, initial render <= 1.5 s) per **DEC-001 / ADR-009**.

> IMPORTANT: The harness is a diagnostic tool, **not** an automated pass/fail
> gate. The authoritative measurement is performed **interactively with the user
> present**, on the target machine/browser. Numbers printed by the harness are
> informational and must not be treated as an acceptance decision on their own.

## What it measures

For a generated fixture (~50 rows and N items with varied importance):

1. **Initial render time (ms)** - wall-clock time to build the first
   virtualized SVG DOM set via a synchronous render (`performance.now()` around
   `setDocument` + `renderNow`). Compare against the 1500 ms target.
2. **Animated zoom/pan frame timing** - a scripted ~4 s animation oscillates
   `zoomX`, `zoomY`, `scrollX`, `scrollY` to force layout + virtualization churn,
   sampling `requestAnimationFrame` deltas. From the samples it reports:
   - **average FPS** (target ~60),
   - **p95 frame time (ms)** (60fps budget ~16.7 ms),
   - **worst frame time (ms)**.
3. **Live SVG node count after initial render** - evidence that virtualization
   is active: only the viewport-visible + LOD-passing items receive DOM nodes,
   so this number is far below N.

Results are shown in an on-screen panel (top-right of the stage) and logged as
structured JSON under the `grsch:bench` namespace in the dev console.

## How to run

Prerequisites: `npm install` has been run.

### Option A - dev server + on-screen button

```
npm run dev
```

Open the served URL (default http://localhost:5173). Click **Run benchmark** in
the toolbar. With no URL param the button uses the default N = 1000 items.

### Option B - URL parameter (auto-run)

Append `?bench=<N>` to the dev-server URL to generate N items and auto-run the
benchmark once on load:

```
http://localhost:5173/?bench=1000
http://localhost:5173/?bench=2000
```

`?bench` with no value or an invalid value falls back to N = 1000.

### Option C - built single file

```
npm run build
npm run preview
```

Open the preview URL and use the same button / `?bench=<N>` param. This exercises
the production single-file build (dev logger stripped).

## Manual interaction (for the user-present measurement)

Beyond the scripted animation you can measure real interaction feel:

- **Mouse wheel** - zoom. `Shift` = time-axis (horizontal) only, `Alt` =
  row-axis (vertical) only, no modifier = both axes (anisotropic zoom, ADR-004).
- **Click-drag** - pan (updates `scrollX` / `scrollY`).

Watch the browser devtools Performance panel while interacting to confirm the
60fps budget on the target hardware.

## Interpreting results

- Initial render well under 1500 ms and average FPS near 60 with p95 frame time
  under ~16.7 ms indicates the SVG + virtualization + LOD + diff/rAF approach
  (ADR-009) is on track for the target.
- If the numbers fall short, per DEC-001 the fallback is to record a new decision
  (e.g. Canvas-hybrid) and re-confirm with the user - do not silently accept.
