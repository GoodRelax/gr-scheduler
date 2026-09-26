function rounded(value: number): string { return (Math.round(value * 100) / 100).toString() }
function achromatic(colour: string): string { // svg-renderer.ts:124 verbatim
  const asHsl = /^hsla?\(\s*[\d.]+\s*[, ]\s*[\d.]+%\s*[, ]\s*([\d.]+)%/.exec(colour.trim())
  if (asHsl !== null) return `hsl(0 0% ${asHsl[1] as string}%)`
  const asHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(colour.trim())
  if (asHex === null) return colour
  const digits = asHex[1] as string
  const wide = digits.length === 3 ? digits.replace(/./g, (one) => one + one) : digits
  const channels = [0, 2, 4].map((at) => parseInt(wide.slice(at, at + 2), 16) / 255)
  const lightness = (Math.max(...channels) + Math.min(...channels)) / 2
  return `hsl(0 0% ${rounded(lightness * 100)}%)`
}
type Row = { light: string; dark: string; followsHue: boolean }
// svg-renderer.ts:138 colourOf (row passed in instead of looked up)
function colourOf(row: Row, hue: number, dark: boolean, monochrome: boolean): string { const written = dark ? row.dark : row.light; if (!row.followsHue) return written; const substituted = written.replace(/\bH\b/g, rounded(hue)); return monochrome ? achromatic(substituted) : substituted }
// dom-screen-surface.ts:411 hued (used by themeStyle :417, which has no monochrome input)
function hued(written: string, followsHue: boolean, hue: number): string { return followsHue ? written.replace('H', String(hue)) : written }
const S150: Row = { light: 'hsl(H 20% 97%)', dark: 'hsl(H 14% 13%)', followsHue: true } // generated cell, identical at dom-screen-surface.ts:1145 and svg-renderer.ts:756
for (const [hue, dark, mono] of [[214, false, false], [214, true, false], [214, false, true], [0, false, true], [359, true, true]] as [number, boolean, boolean][]) {
  const svg = colourOf(S150, hue, dark, mono); const dom = hued(dark ? S150.dark : S150.light, S150.followsHue, hue)
  console.log('hue', hue, 'dark', dark, 'mono', mono, '| svg/export:', svg, '| DOM screen:', dom, svg === dom ? 'equal' : 'DIFFER')
}
console.log('non-integer hue (schema forbids: grs-json-schema.ts:108 integer):', colourOf(S150, 214.123, false, false), hued(S150.light, true, 214.123))
// G18 header metrics: image-exporter.ts:127-129 vs app-header-drawing.ts:23,30 (+ chromeScaledPx dom-screen-surface.ts:137)
const S225 = 20, S226 = 12, S235 = 0.6667
const chromeScaledPx = (px: number) => px * S235
for (const ratio of [1, 0.5, 1.37]) { const ieFont = S225 * S235 * ratio; const domFont = chromeScaledPx(S225) * ratio; const ieInset = (0 + S226 * S235) * ratio; const domInset = chromeScaledPx(S226) * ratio; console.log('header ratio', ratio, ieFont, domFont, ieInset, domInset, ieFont === domFont && ieInset === domInset ? 'equal' : 'DIFFER') }
// G20 entrance outer size: screen-regions.ts:85,90 (unscaled; callers x S-235) vs dom-screen-surface.ts:159,168 (scaled) at gapRow S-243
const E = { 'S-138': 16, 'S-237': 1, 'S-243': 1, 'S-141': 4 }
const srH = () => E['S-138'] + E['S-243'] * 2; const srW = () => srH() + E['S-237'] * 2
const domW = (g: 'S-141' | 'S-243') => chromeScaledPx(E['S-138'] + (E[g] + E['S-237']) * 2); const domH = (g: 'S-141' | 'S-243') => chromeScaledPx(E['S-138'] + E[g] * 2)
console.log('entrance S-243: sr W*chrome', srW() * S235, 'dom W', domW('S-243'), '| sr H*chrome', srH() * S235, 'dom H', domH('S-243'), srW() * S235 === domW('S-243') && srH() * S235 === domH('S-243') ? 'equal' : 'DIFFER')
