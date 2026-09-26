// G13 escaping; G14 rounding. Bodies verbatim.
function ieEscaped(text: string): string { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') } // image-exporter.ts:80
function srEscaped(text: string): string { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') } // svg-renderer.ts:59
function mxEscapedText(value: string): string { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') } // mspdi-xml.ts:244
function ieRounded(value: number): string { return (Math.round(value * 100) / 100).toString() } // image-exporter.ts:69
function srRounded(value: number): string { return (Math.round(value * 100) / 100).toString() } // svg-renderer.ts:69
const texts = ['', 'a&b', '<x>', 'say "hi"', "it's", '&amp;', '\u{1F600}&', ']]>', '\u0000']
for (const t of texts) console.log('esc', JSON.stringify(t), ieEscaped(t) === srEscaped(t) ? 'ie==sr' : 'IE!=SR', JSON.stringify(srEscaped(t)), JSON.stringify(mxEscapedText(t)))
const nums = [0, -0, 0.005, 0.015, 1.005, -0.005, -1.005, 2.675, 1e21, NaN, Infinity, -Infinity, 123.456, 1e-7]
for (const n of nums) console.log('round', n, ieRounded(n), srRounded(n), ieRounded(n) === srRounded(n) ? 'equal' : 'DIFFER')
