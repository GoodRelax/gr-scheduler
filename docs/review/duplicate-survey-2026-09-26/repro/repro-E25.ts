// E25: dom-input-source.ts:139 pixelsPerUnit vs open-modals-drawing.ts:241 wheelUnitPx (bodies copied; DOM reads stubbed)
const DELTA_IN_LINES = 1, DELTA_IN_PAGES = 2, PIXELS_PER_LINE = 40
function pixelsPerUnit(deltaMode: number, pageSize: number): number {
  if (deltaMode === DELTA_IN_LINES) return PIXELS_PER_LINE
  if (deltaMode === DELTA_IN_PAGES) return pageSize
  return 1
}
type Ev = { deltaMode: number; DOM_DELTA_PAGE: 2; DOM_DELTA_LINE: 1 }
type Sc = { clientWidth: number; fontSize: string | null }
function wheelUnitPx(event: Ev, scroller: Sc): number {
  if (event.deltaMode === event.DOM_DELTA_PAGE) return scroller.clientWidth
  if (event.deltaMode !== event.DOM_DELTA_LINE) return 1
  const lineHeight = scroller.fontSize === null ? Number.NaN : Number.parseFloat(scroller.fontSize)
  return Number.isFinite(lineHeight) ? lineHeight : 1
}
for (const mode of [0, 1, 2]) {
  const sc: Sc = { clientWidth: 600, fontSize: '16px' }
  const a = 3 * pixelsPerUnit(mode, sc.clientWidth), b = 3 * wheelUnitPx({ deltaMode: mode, DOM_DELTA_PAGE: 2, DOM_DELTA_LINE: 1 }, sc)
  console.log(`deltaMode=${mode} delta=3 fontSize=16px width=600: chart ${a}px, roster ${b}px ${a === b ? 'equal' : 'DIFFER'}`)
}
console.log('no defaultView: roster', wheelUnitPx({ deltaMode: 1, DOM_DELTA_PAGE: 2, DOM_DELTA_LINE: 1 }, { clientWidth: 600, fontSize: null }), 'chart', pixelsPerUnit(1, 600))
