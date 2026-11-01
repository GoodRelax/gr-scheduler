import { readFileSync } from 'node:fs';
import { parseAst } from 'rolldown/parseAst';
const [file, inner] = process.argv.slice(2);
const text = readFileSync(file, 'utf8');
const prog = parseAst(text, { lang: 'ts', sourceType: 'module' }, file);
const starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
const line = off => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= off) lo = m; else hi = m - 1; } return lo + 1; };
function nm(s) {
  const d = s.type.startsWith('Export') && s.declaration ? s.declaration : s;
  if (d.id) return d.id.name;
  if (d.declarations) return d.declarations.map(x => x.id.name || '{..}').join(',');
  if (s.type === 'ImportDeclaration') return 'import ' + s.source.value;
  if (s.source) return 'reexport ' + s.source.value;
  return '';
}
function walk(list, ind) { for (const s of list) { const a = line(s.start), b = line(s.end); const d = s.declaration || s; console.log(`${ind}${a}-${b} (${b - a + 1}) ${s.type.startsWith('Export') ? 'E' : ' '} ${d.type.replace('Declaration','')}${d.kind ? ':' + d.kind : ''} ${nm(s)}`); } }
walk(prog.body, '');
if (inner) { for (const s of prog.body) { const d = s.declaration || s; if (d.id && d.id.name === inner) { console.log('--- inside ' + inner); walk(d.body.body, '  '); } } }
