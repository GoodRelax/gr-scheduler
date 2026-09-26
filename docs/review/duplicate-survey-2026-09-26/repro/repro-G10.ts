// G10: the S-97/S-98 clamp. zoom-and-fit.ts:351 zoomWithinBounds == edit-document-settings.ts:151 clamp  vs fit-zoom.ts:48 clampedZoom
function zoomWithinBounds(c: { zoomMin: number; zoomMax: number }, value: number): number { return Math.max(c.zoomMin, Math.min(c.zoomMax, value)) }
function clampedZoom(value: number, zoom: { min: number; max: number }): number {
  const lifted = Number.isFinite(zoom.min) ? Math.max(zoom.min, value) : value
  return Number.isFinite(zoom.max) ? Math.min(zoom.max, lifted) : lifted
}
const cases: [number, number, number][] = [[0.5, 0.02, 64], [0.001, 0.02, 64], [100, 0.02, 64], [NaN, 0.02, 64], [Infinity, 0.02, 64], [-Infinity, 0.02, 64],
  [5, NaN, 64], [5, 0.02, NaN], [100, 0.02, Infinity], [5, 10, 1], [0.01, -Infinity, 64]]
for (const [v, min, max] of cases) {
  const a = zoomWithinBounds({ zoomMin: min, zoomMax: max }, v), b = clampedZoom(v, { min, max })
  console.log(`value ${v} min ${min} max ${max}`.padEnd(34), 'zoomWithinBounds', a, '| clampedZoom', b, Object.is(a, b) ? '' : '<-- DIFFER')
}
