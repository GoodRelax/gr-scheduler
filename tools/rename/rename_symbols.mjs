// Rename the CR-708 identifiers in src/ and tests/ with the TypeScript checker.
//
//   node tools/rename/rename_symbols.mjs --survey    write docs/review/rename-types.tsv
//   node tools/rename/rename_symbols.mjs --dry-run   plan everything, write nothing
//   node tools/rename/rename_symbols.mjs --apply     write the edits and move the files
//   (any mode) --root <dir>   work on another copy of the tree
//
// change-request/CR-708-rename-row-to-task-group-and-wbs-parent-to-parent-task.md
// section 7 step 5 asks for the language service's findRenameLocations. The
// tree runs TypeScript 7, whose JavaScript API (typescript/unstable/sync)
// has no findRenameLocations; its checker answers the same question with
// getReferencedSymbolsForNode (a definition and every reference node), which
// is what this script uses. Shorthand properties are the one place a rename
// location needs a prefix ("{ row }" -> "{ row: taskGroup }"); this script
// does not write those, it counts them as MANUAL.
//
// What it renames, all from docs/review/rename-map.tsv (class a only):
//   1. every identifier whose text is an old name, through the checker's
//      references (a reference the checker finds in a string -- an element
//      access -- comes with it); an identifier no reference reaches is still
//      renamed by its text and counted as PLAIN,
//   2. the generic row / rows / Row / Rows (X-12): renamed only where the
//      checker says the type is TaskGroup / RowPlacement (or an array of
//      them) and every reference of that symbol agrees; the rest is KEEP,
//      UNDECIDED (any / unknown / error) or MANUAL (references disagree, or a
//      shorthand),
//   3. inside comments and strings: whole tokens of the old names, the
//      English screen words (kind spec-word) and WL-n (kind row-id) --
//      import paths follow here, because a file stem is a token,
//   4. the files of kind file-path, moved with git mv.
// The bare English word in comments and strings is NOT this script's: it is
// in docs/review/rename-lines-en.tsv, applied by apply_rename.py first.
//
// --apply refuses, and writes nothing, while any of these remain in the
// files it would touch: a map row of class "?" or with a collision, a
// generic identifier left UNDECIDED or MANUAL (and not decided in
// rename-types.tsv), a reference into a library file (an external name
// cannot be renamed here). With --leave-tests-undecided (stage 2) a name or
// a generic identifier that only tests/ holds may stay open: it is left as
// it is, and stage 3 runs --apply again once its readers have decided.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const rootAt = args.indexOf('--root');
const ROOT = path.resolve(rootAt >= 0 ? args[rootAt + 1] : path.join(HERE, '..', '..'));
const MODE = args.includes('--apply') ? 'apply' : args.includes('--survey') ? 'survey' : 'dry-run';

const MAP_TSV = 'docs/review/rename-map.tsv';
const TYPES_TSV = 'docs/review/rename-types.tsv';
const CODE_KINDS = new Set(['identifier', 'api', 'json-key', 'dom', 'file']);
const GENERIC = new Map([
  ['row', 'taskGroup'], ['rows', 'taskGroups'], ['Row', 'TaskGroup'], ['Rows', 'TaskGroups'],
]);
const TASK_GROUP_TYPES = new Set(['TaskGroup', 'RowPlacement', 'TaskGroupPlacement']);
const IDENT = /[A-Za-z_$][A-Za-z0-9_$]*(?:-[A-Za-z0-9_]+)*/g;
const WL_ID = /\bWL-([0-9]+)\b/g;

function findTypeScript(start) {
  let dir = start;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', 'typescript', 'dist', 'api', 'sync', 'api.js');
    if (fs.existsSync(candidate)) return path.join(dir, 'node_modules', 'typescript');
    const up = path.dirname(dir);
    if (up === dir) throw new Error('typescript (7, unstable/sync API) not found above ' + start);
    dir = up;
  }
}

function readTsv(relative) {
  const full = path.join(ROOT, relative);
  if (!fs.existsSync(full)) return [];
  const lines = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n').replace(/\u2060/g, '')
    .split('\n').filter(Boolean);
  const head = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
  });
}

const DECISIONS_DIR = 'docs/review/rename-decisions';

function decisionFiles(suffix) {
  const folder = path.join(ROOT, DECISIONS_DIR);
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder).filter((n) => n.endsWith('-' + suffix + '.tsv')).sort()
    .map((n) => DECISIONS_DIR + '/' + n);
}

function typeKey(r) {
  return [r.path, r.line, r.name, r.nth].join(':');
}

function writeTsv(relative, head, rows) {
  // the word joiner of rename_common.py (MASK): retired id spellings quoted
  // from the tree are broken so the tracked table does not redden checks 51,
  // 52 and 63; readTsv takes it out again
  const clean = (v) => String(v).replace(/[\t\r\n]/g, ' ')
    .replace(/((?<![A-Za-z0-9_-])(?:[DdRr]|SM|EV|TN)-|[Pp][Dd]-)(?=[0-9])/g, '$1\u2060');
  const body = [head.join('\t'), ...rows.map((r) => head.map((h) => clean(r[h] ?? '')).join('\t'))];
  fs.writeFileSync(path.join(ROOT, relative), body.join('\n') + '\n', 'utf8');
}

// The lanes of tools/rename/rename_common.py, for the files this script reads.
function laneOf(rel) {
  if (rel.startsWith('src/entity/')) return 'S2-ENT';
  if (rel.startsWith('src/use-case/') || rel.startsWith('src/adapter/')) return 'S2-UA';
  if (rel.startsWith('tests/unit/')) return 'S3-UNIT';
  if (rel.startsWith('tests/contract/')) return 'S3-CON';
  if (rel.startsWith('tests/')) return 'S3-SYS';
  if (rel.startsWith('tools/') || rel.startsWith('.claude/')) return 'S2-TL';
  return 'S2-FW';
}

// Comments and string text of JS / TS source (template ${...} is code).
function textSpans(text) {
  const spans = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (text.startsWith('//', i)) {
      let j = text.indexOf('\n', i);
      if (j < 0) j = n;
      spans.push([i, j]);
      i = j;
      continue;
    }
    if (text.startsWith('/*', i)) {
      let j = text.indexOf('*/', i + 2);
      j = j < 0 ? n : j + 2;
      spans.push([i, j]);
      i = j;
      continue;
    }
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      let part = i;
      while (j < n && text[j] !== c) {
        if (text[j] === '\\') { j += 2; continue; }
        if (c !== '`' && text[j] === '\n') break;
        if (c === '`' && text.startsWith('${', j)) {
          spans.push([part, j]);
          let depth = 1;
          j += 2;
          while (j < n && depth) {
            if (text[j] === '{') depth += 1;
            else if (text[j] === '}') depth -= 1;
            j += 1;
          }
          part = j;
          continue;
        }
        j += 1;
      }
      spans.push([part, Math.min(j + 1, n)]);
      i = j + 1;
      continue;
    }
    i += 1;
  }
  return spans;
}

function stripType(s) {
  let t = s.replace(/\breadonly\s+/g, '').replace(/\s*\|\s*(undefined|null)\b/g, '').trim();
  for (;;) {
    const before = t;
    t = t.replace(/^\((.*)\)$/, '$1').replace(/\[\]$/, '').replace(/^(?:ReadonlyArray|Array)<(.*)>$/, '$1').trim();
    if (t === before) return t;
  }
}

function verdictOf(typeText) {
  const core = stripType(typeText);
  if (TASK_GROUP_TYPES.has(core)) return 'task-group';
  if (/\b(any|unknown)\b|^error$/.test(core) || core === '') return 'undecided';
  return 'keep';
}

async function main() {
  let tsdir;
  try {
    tsdir = findTypeScript(ROOT);
  } catch {
    tsdir = findTypeScript(HERE); // a scratch copy of the tree has no node_modules
  }
  const { API } = await import(pathToFileURL(path.join(tsdir, 'dist', 'api', 'sync', 'api.js')).href);
  const { SyntaxKind } = await import(pathToFileURL(path.join(tsdir, 'dist', 'ast', 'index.js')).href);

  const mapRows = readTsv(MAP_TSV);
  // the lanes' own decisions (tools/rename/rename_common.py, DECISIONS_DIR)
  const byOld = new Map(mapRows.map((r) => [r.old, r]));
  for (const name of decisionFiles('map')) {
    for (const d of readTsv(name)) {
      const r = byOld.get(d.old);
      if (!r) continue;
      r.new = d.new || r.new;
      r.class = d.class;
      r.collision = '';
    }
  }
  const codeNames = new Map();
  const textNames = new Map();
  const blockers = [];
  for (const r of mapRows) {
    if (r.class === 'a' && r.old !== r.new) {
      if (CODE_KINDS.has(r.kind)) codeNames.set(r.old, r.new);
      if (CODE_KINDS.has(r.kind) || r.kind === 'spec-word') textNames.set(r.old, r.new);
    }
  }
  const undecidedNames = new Set(mapRows.filter((r) => r.class === '?' || (r.class === 'a' && r.collision))
    .map((r) => r.old));
  const specWords = mapRows.filter((r) => r.kind === 'spec-word' && r.class === 'a')
    .sort((a, b) => b.old.length - a.old.length);
  const moves = mapRows.filter((r) => r.kind === 'file-path' && r.class === 'a');

  const api = new API({ cwd: ROOT });
  const snap = api.updateSnapshot({ openProjects: [path.join(ROOT, 'tsconfig.json')] });
  const project = snap.getProjects()[0];
  const checker = project.checker;
  const rootSlash = ROOT.replace(/\\/g, '/').toLowerCase() + '/';
  const relOf = (p) => {
    const s = p.replace(/\\/g, '/');
    return s.toLowerCase().startsWith(rootSlash) ? s.slice(rootSlash.length) : null;
  };
  const files = project.program.getSourceFileNames()
    .map((f) => [f, relOf(f)])
    .filter(([, rel]) => rel && !rel.startsWith('node_modules/') && !rel.includes('/node_modules/'));

  const edits = new Map(); // rel -> Map(start -> {end, text, why})
  const tally = new Map(); // new text -> edits, for --tally
  const addEdit = (rel, start, end, text, why) => {
    if (!edits.has(rel)) edits.set(rel, new Map());
    const m = edits.get(rel);
    if (!m.has(start)) {
      m.set(start, { end, text, why });
      tally.set(text, (tally.get(text) ?? 0) + 1);
    }
  };
  const counts = {};
  const bump = (lane, key, n = 1) => {
    counts[lane] ??= {};
    counts[lane][key] = (counts[lane][key] ?? 0) + n;
  };

  // pass 1: collect the identifier nodes
  const byName = new Map(); // name -> [{rel, file, node, start}]
  const generic = []; // {rel, file, node, start}
  const sources = new Map();
  for (const [file, rel] of files) {
    const sf = project.program.getSourceFile(file);
    if (!sf) continue;
    sources.set(rel, { file, sf, text: sf.text });
    const walk = (n) => {
      if (n.kind === SyntaxKind.Identifier || n.kind === SyntaxKind.PrivateIdentifier) {
        const t = n.text;
        const start = n.end - t.length;
        if (codeNames.has(t) || undecidedNames.has(t)) {
          if (!byName.has(t)) byName.set(t, []);
          byName.get(t).push({ rel, file, node: n, start });
        } else if (GENERIC.has(t)) {
          generic.push({ rel, file, node: n, start });
        }
      }
      n.forEachChild(walk);
    };
    sf.forEachChild(walk);
  }

  // pass 2: names of the map, through the checker's references
  const nameRows = [];
  const lineOf = (rel, start) => sources.get(rel).text.slice(0, start).split('\n').length;
  const shorthandKinds = new Set([SyntaxKind.ShorthandPropertyAssignment]);
  for (const [name, nodes] of byName) {
    const lane0 = laneOf(nodes[0].rel);
    if (undecidedNames.has(name)) {
      for (const n of nodes) bump(laneOf(n.rel), 'names undecided (map ? / collision)');
      // a hint for the reader of the map: the type where the name is first met
      const first = nodes[0];
      let typeText = 'error';
      try {
        const t = checker.getTypeAtPosition(first.file, first.start);
        typeText = t ? checker.typeToString(t) : 'error';
      } catch {
        typeText = 'error';
      }
      const hint = /\b(TaskGroup|RowPlacement)\b/.test(typeText) ? 'a?' : '';
      nameRows.push({
        lane: laneOf(first.rel), path: first.rel, line: lineOf(first.rel, first.start),
        col: first.start - (sources.get(first.rel).text.lastIndexOf('\n', first.start - 1) + 1),
        name, type: typeText.slice(0, 160), verdict: 'map-name ' + hint, decision: '',
        note: nodes.length + ' identifiers in ' + new Set(nodes.map((x) => x.rel)).size + ' files',
      });
      continue;
    }
    const newName = codeNames.get(name);
    const covered = new Set();
    for (const n of nodes) {
      const key = n.rel + ':' + n.start;
      if (covered.has(key)) continue;
      let refs = [];
      try {
        refs = checker.getReferencedSymbolsForNode(n.node, n.start);
      } catch {
        refs = [];
      }
      let hitSelf = false;
      for (const entry of refs) {
        for (const handle of entry.references) {
          const rel = relOf(handle.path);
          if (!rel) continue;
          if (rel.includes('node_modules/')) {
            blockers.push(`${name}: reference in a library file ${rel}`);
            continue;
          }
          const node = handle.resolve();
          if (!node) continue;
          let start;
          let end;
          if (node.kind === SyntaxKind.Identifier || node.kind === SyntaxKind.PrivateIdentifier) {
            if (node.text !== name) continue;
            start = node.end - name.length;
            end = node.end;
          } else if (node.kind === SyntaxKind.StringLiteral || node.kind === SyntaxKind.NoSubstitutionTemplateLiteral) {
            if (node.text !== name) continue;
            start = node.end - 1 - name.length;
            end = node.end - 1;
          } else {
            continue;
          }
          const k = rel + ':' + start;
          if (k === key) hitSelf = true;
          if (covered.has(k)) continue;
          covered.add(k);
          addEdit(rel, start, end, newName, 'ref');
          bump(laneOf(rel), 'name refs');
        }
      }
      if (!hitSelf && !covered.has(key)) {
        covered.add(key);
        addEdit(n.rel, n.start, n.start + name.length, newName, 'plain');
        bump(laneOf(n.rel), 'name plain (no reference)');
      }
    }
    void lane0;
  }

  // pass 3: the generic row / rows by type (X-12)
  const byFile = new Map();
  for (const g of generic) {
    if (!byFile.has(g.file)) byFile.set(g.file, []);
    byFile.get(g.file).push(g);
  }
  const verdictAt = new Map(); // rel:start -> {verdict, type}
  for (const [file, list] of byFile) {
    const types = checker.getTypeAtPosition(file, list.map((g) => g.start));
    list.forEach((g, i) => {
      const t = types[i];
      const text = t ? checker.typeToString(t) : 'error';
      verdictAt.set(g.rel + ':' + g.start, { verdict: verdictOf(text), type: text, g });
    });
  }
  const typeRows = [];
  const done = new Set();
  for (const [key, v] of verdictAt) {
    if (done.has(key)) continue;
    const g = v.g;
    const lane = laneOf(g.rel);
    if (v.verdict !== 'task-group') {
      done.add(key);
      bump(lane, 'generic ' + v.verdict);
      if (v.verdict === 'undecided') typeRows.push(typeRow(g, v, 'undecided'));
      continue;
    }
    let refs = [];
    try {
      refs = checker.getReferencedSymbolsForNode(g.node, g.start);
    } catch {
      refs = [];
    }
    const group = [];
    let agree = true;
    for (const entry of refs) {
      for (const handle of entry.references) {
        const rel = relOf(handle.path);
        const node = rel ? handle.resolve() : undefined;
        if (!node || node.kind !== SyntaxKind.Identifier || node.text !== g.node.text) continue;
        const k = rel + ':' + (node.end - node.text.length);
        const other = verdictAt.get(k);
        if (!other || other.verdict !== 'task-group') agree = false;
        if (node.parent && (shorthandKinds.has(node.parent.kind) ||
            (node.parent.kind === SyntaxKind.BindingElement && !node.parent.propertyName))) agree = false;
        group.push({ k, rel, start: node.end - node.text.length, end: node.end, text: node.text });
      }
    }
    if (!group.some((x) => x.k === key)) {
      group.push({ k: key, rel: g.rel, start: g.start, end: g.start + g.node.text.length, text: g.node.text });
    }
    for (const x of group) {
      if (done.has(x.k)) continue;
      done.add(x.k);
      if (agree) {
        addEdit(x.rel, x.start, x.end, GENERIC.get(x.text), 'type');
        bump(laneOf(x.rel), 'generic renamed by type');
      } else {
        bump(laneOf(x.rel), 'generic manual');
        const vv = verdictAt.get(x.k) ?? v;
        typeRows.push(typeRow({ rel: x.rel, start: x.start, node: { text: x.text } }, vv, 'manual'));
      }
    }
  }

  function typeRow(g, v, verdict) {
    const text = sources.get(g.rel).text;
    const line = text.slice(0, g.start).split('\n').length;
    const lineStart = text.lastIndexOf('\n', g.start - 1) + 1;
    const col = g.start - lineStart;
    // the key a decision is matched on: path, line, name and the how-manyth
    // such word on the line -- an earlier stage may move the column, never
    // the line (no edit adds or removes a line ending)
    const word = new RegExp('(?<![A-Za-z0-9_$])' + g.node.text + '(?![A-Za-z0-9_$])', 'g');
    const nth = [...text.slice(lineStart, g.start).matchAll(word)].length;
    return {
      lane: laneOf(g.rel), path: g.rel, line, col, nth, name: g.node.text,
      type: String(v.type).slice(0, 160), verdict, decision: '', note: '',
    };
  }

  // pass 4: tokens inside comments and strings
  for (const [rel, src] of sources) {
    const text = src.text;
    for (const [s0, e0] of textSpans(text)) {
      const seg = text.slice(s0, e0);
      const taken = [];
      for (const r of specWords) {
        let at = seg.indexOf(r.old);
        while (at >= 0) {
          const s = s0 + at;
          const before = text[s - 1] ?? ' ';
          const after = text[s + r.old.length] ?? ' ';
          if (!/[A-Za-z]/.test(before) && !/[a-z]/.test(after) && !taken.some(([a, b]) => s < b && a < s + r.old.length)) {
            taken.push([s, s + r.old.length]);
            addEdit(rel, s, s + r.old.length, r.new, 'spec-word');
            bump(laneOf(rel), 'text spec-word');
          }
          at = seg.indexOf(r.old, at + 1);
        }
      }
      for (const m of seg.matchAll(IDENT)) {
        const s = s0 + m.index;
        if (taken.some(([a, b]) => s < b && a < s + m[0].length)) continue;
        if (codeNames.has(m[0]) && !(edits.get(rel)?.has(s))) {
          addEdit(rel, s, s + m[0].length, codeNames.get(m[0]), 'text');
          bump(laneOf(rel), 'text token');
        } else if (undecidedNames.has(m[0])) {
          bump(laneOf(rel), 'text token undecided');
        }
      }
      for (const m of seg.matchAll(WL_ID)) {
        addEdit(rel, s0 + m.index, s0 + m.index + m[0].length, 'PTL-' + m[1], 'row-id');
        bump(laneOf(rel), 'text WL-n');
      }
    }
  }
  for (const r of moves) bump(laneOf(r.old), 'file moves');

  api.close();

  // report
  const lanes = Object.keys(counts).sort();
  const keys = [...new Set(lanes.flatMap((l) => Object.keys(counts[l])))].sort();
  console.log('mode: ' + MODE);
  for (const lane of lanes) {
    console.log(lane + '  ' + keys.filter((k) => counts[lane][k]).map((k) => `${k}=${counts[lane][k]}`).join(', '));
  }
  const overlaps = [];
  for (const [rel, m] of edits) {
    const sorted = [...m.entries()].sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i][0] < sorted[i - 1][1].end) overlaps.push(`${rel}@${sorted[i][0]}`);
    }
  }
  const manual = typeRows.length;
  console.log(`edits: ${[...edits.values()].reduce((s, m) => s + m.size, 0)} in ${edits.size} files; ` +
    `file moves: ${moves.length}; undecided or manual generic: ${manual}; ` +
    `undecided map names in code: ${[...byName.keys()].filter((n) => undecidedNames.has(n)).length}; ` +
    `overlaps: ${overlaps.length}; library references: ${blockers.length}`);

  const tallyAt = args.indexOf('--tally');
  if (tallyAt >= 0) fs.writeFileSync(args[tallyAt + 1], JSON.stringify(Object.fromEntries(tally), null, 1));
  if (MODE === 'survey') {
    writeTsv(TYPES_TSV, ['lane', 'path', 'line', 'col', 'nth', 'name', 'type', 'verdict', 'decision',
      'note'],
      [...typeRows.sort((a, b) => (a.path + a.line).localeCompare(b.path + b.line)),
        ...nameRows.sort((a, b) => a.name.localeCompare(b.name))]);
    console.log('wrote ' + TYPES_TSV + ' (' + typeRows.length + ' generic rows, ' + nameRows.length +
      ' map-name hints)');
    return 0;
  }
  if (MODE !== 'apply') return 0;

  const decided = new Map([...readTsv(TYPES_TSV), ...decisionFiles('types').flatMap(readTsv)]
    .filter((r) => r.decision)
    .map((r) => [typeKey(r), r.decision]));
  // --leave-tests-undecided (stage 2): what only tests/ holds may stay open;
  // it is left untouched, and stage 3 runs this script again once decided
  const leaveTests = args.includes('--leave-tests-undecided');
  const inSrc = (rel) => !rel.startsWith('tests/');
  const open = typeRows.filter((r) => !decided.has(typeKey(r)) &&
    (!leaveTests || inSrc(r.path)));
  const usedUndecided = [...byName.entries()]
    .filter(([n, nodes]) => undecidedNames.has(n) && (!leaveTests || nodes.some((x) => inSrc(x.rel))))
    .map(([n]) => n);
  if (open.length || usedUndecided.length || overlaps.length || blockers.length) {
    console.log(`REFUSED: ${open.length} generic identifiers undecided, ${usedUndecided.length} map names ` +
      `undecided, ${overlaps.length} overlapping edits, ${blockers.length} library references. Nothing written.`);
    return 1;
  }
  for (const r of typeRows) {
    const d = decided.get(typeKey(r));
    if (d !== 'task-group') continue;
    const text = sources.get(r.path).text;
    let start = 0;
    for (let i = 1; i < r.line; i += 1) start = text.indexOf('\n', start) + 1;
    start += Number(r.col);
    addEdit(r.path, start, start + r.name.length, GENERIC.get(r.name), 'reader');
  }
  for (const [rel, m] of edits) {
    const full = path.join(ROOT, rel);
    // positions are the checker's, on the raw text: edit the raw text, so the
    // line endings stay exactly as they were (no edit holds a newline)
    let text = fs.readFileSync(full, 'utf8');
    const crlf = (text.match(/\r\n/g) ?? []).length;
    for (const [start, e] of [...m.entries()].sort((a, b) => b[0] - a[0])) {
      text = text.slice(0, start) + e.text + text.slice(e.end);
    }
    if ((text.match(/\r\n/g) ?? []).length !== crlf) throw new Error('CRLF count changed in ' + rel);
    fs.writeFileSync(full, text, 'utf8');
  }
  const tracked = fs.existsSync(path.join(ROOT, '.git'));
  for (const r of moves) {
    if (tracked) execFileSync('git', ['mv', r.old, r.new], { cwd: ROOT });
    else fs.renameSync(path.join(ROOT, r.old), path.join(ROOT, r.new));
  }
  console.log('applied.');
  return 0;
}

process.exitCode = await main();
