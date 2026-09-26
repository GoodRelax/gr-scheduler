// G12: FR-093 counting, four copies (bodies verbatim).
// row-title-panel.ts:40-49
function rtpCharUnits(ch: string): number { return ch.charCodeAt(0) < 0x100 ? 1 : 2 }
function rtpLabelUnits(text: string): number { let units = 0; for (const character of text) units += rtpCharUnits(character); return units }
// comment-box.ts:20-29
function cbCharUnits(ch: string): number { return ch.charCodeAt(0) < 0x100 ? 1 : 2 }
function cbLabelUnits(text: string): number { let units = 0; for (const character of text) units += cbCharUnits(character); return units }
// label-width.ts:10-14
function lwLabelUnits(text: string): number { let units = 0; for (const character of text) units += character.charCodeAt(0) < 0x100 ? 1 : 2; return units }
// name-label.ts:16-19 (the counting half of truncate)
function nlUnits(text: string): number { const unitsOf = (ch: string): number => (ch.charCodeAt(0) < 0x100 ? 1 : 2); let units = 0; for (const character of text) units += unitsOf(character); return units }
const inputs = ['', 'abc', '\u00ff', '\u0100', '\u3042\u3044', 'A\u{1F600}B', '\u{20BB7}', 'e\u0301', '\uD800', '\uFF21', '\t\n', '\u2026']
let differ = 0
for (const s of inputs) {
  const r = [rtpLabelUnits(s), cbLabelUnits(s), lwLabelUnits(s), nlUnits(s)]
  // per-character use in comment-box wrappedLines and name-label truncate
  const perChar = [...s].map((c) => [rtpCharUnits(c), cbCharUnits(c), lwLabelUnits(c)].join('/')).join(' ')
  if (new Set(r).size !== 1) differ++
  console.log(JSON.stringify(s), r.join(','), perChar)
}
console.log('G12 differing inputs:', differ)
