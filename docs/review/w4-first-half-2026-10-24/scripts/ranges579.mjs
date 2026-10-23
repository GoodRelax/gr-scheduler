// usage: node ranges579.mjs <file> ; prints name<TAB>start<TAB>end<TAB>lines where start includes leading comments/blank lines after the previous statement
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module'; import { pathToFileURL } from 'node:url';
const req = createRequire(new URL('../../../../package.json', import.meta.url));
const { parseAst } = await import(pathToFileURL(req.resolve('rolldown/parseAst')).href);
const file = process.argv[2];
const text = readFileSync(file, 'utf8');
const prog = parseAst(text, { lang: 'ts', sourceType: 'module' }, file);
const starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
const line = off => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= off) lo = m; else hi = m - 1; } return lo + 1; };
const genAt = text.split('\n').findIndex(l => l.includes('<generated -- do not edit by hand>')) + 1 || Infinity;
function nm(s) {
  const d = s.type.startsWith('Export') && s.declaration ? s.declaration : s;
  if (d.id) return d.id.name;
  if (d.declarations) return d.declarations.map(x => x.id.name || '{..}').join(',');
  if (s.type === 'ImportDeclaration') return 'import:' + s.source.value;
  if (s.source) return 'reexport:' + s.source.value;
  return '?';
}
let prevEnd = 0;
for (const s of prog.body) {
  const a = line(s.start), b = line(s.end);
  if (a >= genAt) break;
  console.log(`${nm(s)}\t${prevEnd + 1}\t${b}\t${b - prevEnd}`);
  prevEnd = b;
}
console.log(`__tail\t${prevEnd + 1}\t${genAt - 1}\t${genAt - 1 - prevEnd}`);
