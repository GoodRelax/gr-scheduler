const DUMMY = { 'S-180': 30, 'S-247': 0.5 } // generated, task-figures.ts:606 == schedule-layout.ts:640
function tfDummyWidth(d: number): number { return Math.min(d * DUMMY['S-247'], DUMMY['S-180']) } // task-figures.ts:472-475
function slDummyInkWidthOf(markerDiameter: number): number { return Math.min(markerDiameter * DUMMY['S-247'], DUMMY['S-180']) } // schedule-layout.ts:282
type K = 'rectangle' | 'chevron' | 'arrow' | 'endpointSpan' | 'milestone'
function isThinShape(k: K): boolean { return k === 'arrow' || k === 'endpointSpan' } // task-figures.ts:274
function laidBelow(k: K): boolean { return k === 'arrow' || k === 'endpointSpan' } // shape-cross-sections.ts:51
type S = { thinArrowHeadHeight: number; spanDotSize: number }
function lineEndHalfHeight(k: 'arrow' | 'endpointSpan', s: S): number { return (k === 'arrow' ? s.thinArrowHeadHeight : s.spanDotSize) / 2 } // task-figures.ts:235
function thinEndHalfHeightOf(k: K, s: S): number { return (k === 'arrow' ? s.thinArrowHeadHeight : s.spanDotSize) / 2 } // shape-cross-sections.ts:12
// S-196 lift: task-figures.ts:497-500 top = y - S196*ratio - height ; shape-cross-sections.ts:27-33 lift = font + S196*ratio
const S196 = 2
for (const d of [0, -4, 10, 59.999, 60, 61, NaN, Infinity]) console.log('dummy', d, tfDummyWidth(d), slDummyInkWidthOf(d), Object.is(tfDummyWidth(d), slDummyInkWidthOf(d)) ? 'equal' : 'DIFFER')
for (const k of ['rectangle', 'chevron', 'arrow', 'endpointSpan', 'milestone'] as K[]) console.log('thin', k, isThinShape(k), laidBelow(k))
const s = { thinArrowHeadHeight: 9, spanDotSize: 5 }
for (const k of ['arrow', 'endpointSpan'] as const) console.log('endHalf', k, lineEndHalfHeight(k, s), thinEndHalfHeightOf(k, s))
for (const [font, ratio] of [[12, 0.625], [7.5, 1], [0, 0]]) { const y = 100; const tfTop = y - S196 * ratio - font; const slTop = y - (font + S196 * ratio); console.log('lift', font, ratio, tfTop, slTop, Object.is(tfTop, slTop) ? 'equal' : 'DIFFER(ulp)') }
let ulp = 0; let first: number[] | null = null
for (let i = 0; i < 100000; i++) { const y = Math.random() * 5000; const font = 5 + Math.random() * 20; const ratio = [0.25, 0.3125, 0.46875, 0.5625, 0.625, 0.6875, 0.78125, 0.9375, 1.09375, 1.25][i % 10]; const a = y - S196 * ratio - font; const b = y - (font + S196 * ratio); if (a !== b) { ulp++; if (first === null) first = [y, font, ratio, a, b] } }
console.log('lift ulp mismatches in 100000 random:', ulp, first)
