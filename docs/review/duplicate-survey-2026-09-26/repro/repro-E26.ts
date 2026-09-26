// E26: svg-renderer.ts:139 colourOf substitution vs dom-screen-surface.ts:411 hued (bodies copied)
function rounded(value: number): string { return (Math.round(value * 100) / 100).toString() }
const sub = (written: string, hue: number) => written.replace(/\bH\b/g, rounded(hue))
function hued(written: string, followsHue: boolean, hue: number): string { return followsHue ? written.replace('H', String(hue)) : written }
const rows = ['hsl(H 12% 9%)', 'hsl(H 14% 87%)', 'hsl(H 59% 32%)']
let eq = 0, n = 0
for (let h = 0; h <= 359; h++) for (const r of rows) { n++; if (sub(r, h) === hued(r, true, h)) eq++ }
console.log(`integer hue 0..359 x ${rows.length} rows: equal ${eq}/${n}`)
console.log('hue 210.123:', sub(rows[0], 210.123), 'vs', hued(rows[0], true, 210.123))
console.log('two H "hsl(H 10% 10%) / H":', sub('hsl(H 10% 10%) H', 5), 'vs', hued('hsl(H 10% 10%) H', true, 5))
