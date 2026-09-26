// E27: row-title-panel.ts:79 labelCutToFit (px) vs name-label.ts:16 truncate (units), bodies copied.
// Question: is labelCutToFit(text, avail, font, s) === truncate(text, avail / (font * labelCoef))?
const TRUNCATION_MARK = '…', TRUNCATION_MARK_UNITS = 2
const charUnits = (ch: string) => (ch.charCodeAt(0) < 0x100 ? 1 : 2)
function labelUnits(text: string): number { let u = 0; for (const c of text) u += charUnits(c); return u }
const labelWidthPx = (t: string, f: number, s: { labelCoef: number }) => labelUnits(t) * f * s.labelCoef
function labelCutToFit(text: string, availableWidthPx: number, fontSizePx: number, settings: { labelCoef: number }): string {
  if (labelWidthPx(text, fontSizePx, settings) <= availableWidthPx) return text
  const unitWidthPx = fontSizePx * settings.labelCoef
  const widthForKeptPx = availableWidthPx - labelWidthPx(TRUNCATION_MARK, fontSizePx, settings)
  let units = 0, kept = ''
  for (const character of text) { const grown = units + charUnits(character); if (grown * unitWidthPx > widthForKeptPx) break; units = grown; kept += character }
  return kept + TRUNCATION_MARK
}
function truncate(text: string, limit: number): string {
  const unitsOf = (ch: string): number => (ch.charCodeAt(0) < 0x100 ? 1 : 2)
  let units = 0; for (const character of text) units += unitsOf(character)
  if (units <= limit) return text
  const room = limit - TRUNCATION_MARK_UNITS
  let kept = '', taken = 0
  for (const character of text) { const next = taken + unitsOf(character); if (next > room) break; taken = next; kept += character }
  return kept + TRUNCATION_MARK
}
let n = 0, d = 0, first = ''
const texts = ['abcdefghijklmnopqrstuvwxyz', '工程表の名前がとても長い行', 'ab工程cd表ef', 'x', '😀😀😀abc']
for (const text of texts) for (const coef of [0.55, 0.6, 0.5, 0.7]) for (const font of [11, 12, 13.2, 14, 16.5])
  for (let k = 0; k <= 60; k++) {
    const unit = font * coef
    for (const avail of [k * unit, k * unit + 1e-9, k * unit - 1e-9, k * 7.3]) {
      n++
      const a = labelCutToFit(text, avail, font, { labelCoef: coef }), b = truncate(text, avail / unit)
      if (a !== b) { d++; if (!first) first = `text="${text}" font=${font} labelCoef=${coef} avail=${avail}: labelCutToFit="${a}" truncate="${b}"` }
    }
  }
console.log(`cases ${n}, differ ${d}`); console.log(first)
