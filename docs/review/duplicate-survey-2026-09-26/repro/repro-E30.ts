// E30: document-change-plan.ts:143 utf8Length (copied) vs TextEncoder (document-file-flow.ts:653, file-gateway.ts:103)
function utf8Length(text: string): number {
  let bytes = 0
  for (const character of text) { const point = character.codePointAt(0) ?? 0; bytes += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4 }
  return bytes
}
for (const t of ['abc', 'é', '工程', '😀', '\uD800', 'a\uDC00b', '\uDBFF\uDFFF', JSON.stringify({ n: '\uD83D' })])
  console.log(JSON.stringify(t), utf8Length(t), new TextEncoder().encode(t).length)
