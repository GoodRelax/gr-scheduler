type P = { x: number; y: number }
function xlMarqueeRect(from: P, to: P) { return { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y), width: Math.abs(to.x - from.x), height: Math.abs(to.y - from.y) } } // selection-input.ts:104
function shMarqueeRect(pressAt: P, at: P) { const width = Math.abs(at.x - pressAt.x); const height = Math.abs(at.y - pressAt.y); if (width === 0 && height === 0) return null; return { x: Math.min(pressAt.x, at.x), y: Math.min(pressAt.y, at.y), width, height } } // held-press-preview.ts:66 (press gating stripped)
const pairs: [P, P][] = [[{ x: 10, y: 10 }, { x: 50, y: 40 }], [{ x: 50, y: 40 }, { x: 10, y: 10 }], [{ x: 5, y: 5 }, { x: 5, y: 5 }], [{ x: 5, y: 5 }, { x: 5, y: 9 }], [{ x: -0, y: 0 }, { x: 0, y: -0 }], [{ x: NaN, y: 0 }, { x: 1, y: 1 }]]
for (const [a, b] of pairs) { const x = xlMarqueeRect(a, b); const s = shMarqueeRect(a, b); const zeroX = x.width === 0 && x.height === 0; console.log('marquee', JSON.stringify([a, b]), JSON.stringify(x), JSON.stringify(s), s === null ? (zeroX ? 'equal (both treat as no marquee: selection-input.ts:166)' : 'DIFFER') : (JSON.stringify(s) === JSON.stringify(x) ? 'equal' : 'DIFFER')) }
// G16 centreOf: display-scale-steps.ts:64 vs item-hit-area.ts:97 (identical text)
const c1 = (a: { x: number; y: number; width: number; height: number }) => ({ x: a.x + a.width / 2, y: a.y + a.height / 2 })
const c2 = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
for (const r of [{ x: 0, y: 0, width: 0, height: 0 }, { x: 1, y: 2, width: 3, height: 5 }, { x: -1e300, y: 0, width: 1e308, height: NaN }]) console.log('centre', JSON.stringify(c1(r)) === JSON.stringify(c2(r)) ? 'equal' : 'DIFFER')
// G42: properties-panel.ts:239 textOfDateColumn vs tooltips.ts:77 dateText; dayOf/textOfDay simplified to the entity bodies
function dayOf(text: string | null): { year: number; month: number; day: number } | null { if (text === null) return null; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text); return m ? { year: +m[1], month: +m[2], day: +m[3] } : null }
function textOfDay(d: { year: number; month: number; day: number }): string { const pad = (n: number, w: number) => String(n).padStart(w, '0'); return `${pad(d.year, 4)}-${pad(d.month, 2)}-${pad(d.day, 2)}T00:00:00` }
function textOfDateColumn(stored: unknown): string { const day = typeof stored === 'string' ? dayOf(stored) : null; if (day === null) return ''; return textOfDay(day).split('T')[0] ?? '' }
function dateText(stored: string | null): string { const day = dayOf(stored); if (day === null) return ''; return textOfDay(day).split('T')[0] ?? '' }
for (const s of [null, '', '2026-09-26', '2026-09-26T08:00:00', 'garbage']) console.log('date', JSON.stringify(s), textOfDateColumn(s), dateText(s), textOfDateColumn(s) === dateText(s) ? 'equal' : 'DIFFER')
// G19: schedule-grid.ts:253 vs svg-renderer.ts:641 -- same expression text
const S108 = 1
for (const w of [null, 0, 6, undefined]) console.log('weekStart', w, (w ?? S108), (w ?? S108))
