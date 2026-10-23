// usage: node readers579.mjs <worktreeRoot>
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const root = process.argv[2];
const files = execSync('git ls-files src tests', { cwd: root, encoding: 'utf8' }).split('\n').filter(f => /\.(ts|mts|tsx|mjs|js)$/.test(f));
const byName = {};
const re = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]*input-command-translator(?:\/input-command-translator)?)['"]/g;
for (const f of files) {
  const t = readFileSync(root + '/' + f, 'utf8');
  let m;
  while ((m = re.exec(t))) {
    const src = m[3];
    if (!/input-command-translator$/.test(src) && !/\/input-command-translator\/input-command-translator$/.test(src)) continue;
    // entry only: './input-command-translator' or '.../input-command-translator/input-command-translator' or '.../input-command-translator' folder? folder import is not possible without index
    for (let n of m[2].split(',')) { n = n.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim(); if (!n) continue; (byName[n] ??= []).push(f.replace('src/adapter/input-command-translator/', './')); }
  }
}
for (const n of Object.keys(byName).sort()) console.log(n + '\t' + byName[n].length + '\t' + [...new Set(byName[n])].join(' '));
