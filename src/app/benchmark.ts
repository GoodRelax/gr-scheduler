/**
 * Benchmark harness for the RISK-001 / ADR-009 performance gate.
 *
 * IMPORTANT: this harness is LAUNCH-READY but is NOT an automated acceptance
 * gate. The real measurement is performed interactively with the user present.
 * It measures, for a mid-size fixture (~50 rows, N items):
 *   1. initial render time (ms) -- time to build the first virtualized DOM set,
 *   2. animated zoom/pan frame timing over a few seconds, from which it reports
 *      average FPS and p95 frame time (a proxy for the 60fps target).
 *
 * Trigger: URL param `?bench=<N>` (default N=1000) or the on-screen
 * "Run benchmark" button wired in main.ts.
 */

import type { ViewState } from '../domain/model/schedule-model.js';
import { SvgRenderer } from '../adapters/render/svg-renderer.js';
import { generateSampleDocument, DEFAULT_ITEM_COUNT } from './sample-data.js';
import { createLogger } from './logger.js';

const log = createLogger('grsch:bench');

/** Duration of the animated zoom/pan sampling phase in milliseconds. */
const ANIMATION_DURATION_MS = 4000;

/** Result of one benchmark run. */
export interface BenchmarkResult {
  readonly itemCount: number;
  readonly rowCount: number;
  readonly initialRenderMs: number;
  readonly initialLiveNodeCount: number;
  readonly sampledFrameCount: number;
  readonly averageFps: number;
  readonly p95FrameTimeMs: number;
  readonly worstFrameTimeMs: number;
}

/**
 * Read the requested item count from the `?bench=<N>` URL param.
 *
 * @param search - The location search string (e.g. "?bench=2000").
 * @returns The parsed item count, or null when `bench` is absent.
 */
export function parseBenchParam(search: string): number | null {
  const params = new URLSearchParams(search);
  if (!params.has('bench')) {
    return null;
  }
  const raw = params.get('bench');
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ITEM_COUNT;
  }
  return parsed;
}

/** Compute the p-th percentile of a numeric sample (nearest-rank). */
function percentile(sortedAscending: readonly number[], fraction: number): number {
  if (sortedAscending.length === 0) {
    return 0;
  }
  const rank = Math.ceil(fraction * sortedAscending.length) - 1;
  const clampedRank = Math.min(sortedAscending.length - 1, Math.max(0, rank));
  return sortedAscending[clampedRank] ?? 0;
}

/**
 * Run the benchmark against a live renderer bound to a host element.
 *
 * @param renderer - The SVG renderer to drive.
 * @param itemCount - Number of items in the fixture.
 * @returns A promise resolving to the measured result.
 */
export async function runBenchmark(
  renderer: SvgRenderer,
  itemCount: number = DEFAULT_ITEM_COUNT,
): Promise<BenchmarkResult> {
  const document = generateSampleDocument(itemCount);
  const rowCount = document.rows.length;

  // 1. Initial render timing (synchronous DOM construction).
  const initialStart = performance.now();
  renderer.setDocument(document);
  renderer.renderNow();
  const initialRenderMs = performance.now() - initialStart;
  const initialLiveNodeCount = renderer.getLastMetrics().liveNodeCount;

  log.info('benchmark_initial_render', {
    item_count: itemCount,
    row_count: rowCount,
    initial_render_ms: Math.round(initialRenderMs * 100) / 100,
    initial_live_node_count: initialLiveNodeCount,
  });

  // 2. Animated zoom/pan while sampling frame deltas.
  const frameTimesMs = await sampleAnimatedFrames(renderer);
  const sorted = [...frameTimesMs].sort((left, right) => left - right);
  const totalMs = frameTimesMs.reduce((sum, value) => sum + value, 0);
  const averageFps = frameTimesMs.length > 0 ? 1000 / (totalMs / frameTimesMs.length) : 0;

  const result: BenchmarkResult = {
    itemCount,
    rowCount,
    initialRenderMs,
    initialLiveNodeCount,
    sampledFrameCount: frameTimesMs.length,
    averageFps,
    p95FrameTimeMs: percentile(sorted, 0.95),
    worstFrameTimeMs: sorted[sorted.length - 1] ?? 0,
  };

  log.info('benchmark_complete', {
    average_fps: Math.round(result.averageFps * 10) / 10,
    p95_frame_time_ms: Math.round(result.p95FrameTimeMs * 100) / 100,
    worst_frame_time_ms: Math.round(result.worstFrameTimeMs * 100) / 100,
    sampled_frame_count: result.sampledFrameCount,
  });

  return result;
}

/**
 * Drive a scripted zoom/pan animation, sampling requestAnimationFrame deltas.
 *
 * @param renderer - The renderer to animate.
 * @returns The collected per-frame durations in milliseconds.
 */
function sampleAnimatedFrames(renderer: SvgRenderer): Promise<number[]> {
  return new Promise((resolve) => {
    const frameTimesMs: number[] = [];
    const startTime = performance.now();
    let previousTime = startTime;
    const baseView = renderer.getViewState();

    const step = (now: number): void => {
      const deltaMs = now - previousTime;
      previousTime = now;
      const elapsed = now - startTime;
      if (elapsed > 0) {
        frameTimesMs.push(deltaMs);
      }

      // Oscillate zoom and scroll to exercise layout + virtualization churn.
      const phase = elapsed / ANIMATION_DURATION_MS;
      const zoomPulse = 1 + 0.6 * Math.sin(phase * Math.PI * 4);
      const nextView: ViewState = {
        ...baseView,
        zoomX: baseView.zoomX * zoomPulse,
        zoomY: baseView.zoomY * (1 + 0.3 * Math.sin(phase * Math.PI * 3)),
        scrollX: baseView.scrollX + 800 * Math.sin(phase * Math.PI * 2),
        scrollY: baseView.scrollY + 400 * Math.sin(phase * Math.PI * 2),
      };
      renderer.setViewState(nextView);
      renderer.renderNow();

      if (elapsed < ANIMATION_DURATION_MS) {
        requestAnimationFrame(step);
      } else {
        resolve(frameTimesMs);
      }
    };
    requestAnimationFrame(step);
  });
}

/**
 * Format a result into a short human-readable multi-line report for on-screen
 * display. This is a diagnostic view, not a pass/fail verdict.
 *
 * @param result - The benchmark result.
 * @returns Formatted report lines joined by newlines.
 */
export function formatBenchmarkReport(result: BenchmarkResult): string {
  return [
    `items: ${result.itemCount}   rows: ${result.rowCount}`,
    `initial render: ${result.initialRenderMs.toFixed(1)} ms  (target <= 1500 ms)`,
    `live SVG nodes after initial render: ${result.initialLiveNodeCount} (virtualized)`,
    `average FPS: ${result.averageFps.toFixed(1)}  (target ~60)`,
    `p95 frame time: ${result.p95FrameTimeMs.toFixed(2)} ms  (60fps budget ~16.7 ms)`,
    `worst frame time: ${result.worstFrameTimeMs.toFixed(2)} ms`,
    `sampled frames: ${result.sampledFrameCount}`,
    '',
    'NOTE: diagnostic only; not an automated acceptance gate (measure with user).',
  ].join('\n');
}
