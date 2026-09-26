// E29: grs-json-schema.ts:1250 stringFaults length test vs mspdi-fade-frames.ts:48 isAliasUsable length test (copied)
const overByStringFaults = (value: string, maxLength: number) => value.length > maxLength
const overByIsAliasUsable = (alias: string, max: number) => !([...alias].length <= max)
for (const v of ['ABCDEFGHIJKLMNOP', 'ABCDEFGHIJKLMNOPQ', '😀'.repeat(8), '😀'.repeat(9), '😀'.repeat(16), '工程'.repeat(8)]) {
  console.log(JSON.stringify(v), `units=${v.length} codepoints=${[...v].length}`,
    `maxLength 16: stringFaults ${overByStringFaults(v, 16) ? 'FAULT' : 'ok'}, code-point count ${overByIsAliasUsable(v, 16) ? 'FAULT' : 'ok'}`)
}
