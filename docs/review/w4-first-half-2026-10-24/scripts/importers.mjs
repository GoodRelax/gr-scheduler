import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
const files = execSync('git ls-files src tests tools', { encoding: 'utf8' }).split('\n').filter(f => /\.(ts|tsx|mts|mjs|js)$/.test(f))
const byName = new Map(); let fileCount = 0; const rawReaders = []
for (const f of files) {
  const t = readFileSync(f, 'utf8')
  const re = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]*frame-loop(?:\.ts)?)['"]/g
  let m, hit = false
  while ((m = re.exec(t))) {
    if (!/single-html-shell\/frame-loop|\.\/frame-loop/.test(m[3])) continue
    hit = true
    for (let n of m[2].split(',')) { n = n.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]; if (!n) continue; if (!byName.has(n)) byName.set(n, new Set()); byName.get(n).add(f) }
  }
  if (/frame-loop\.ts/.test(t) && /readFileSync|\?raw/.test(t)) rawReaders.push(f)
  if (hit) fileCount++
}
console.log('importing files', fileCount)
for (const [n, s] of [...byName].sort()) { const src = [...s].filter(x => x.startsWith('src')); console.log(n, s.size, 'src:' + src.map(x => x.replace('src/framework/single-html-shell/', '')).join(',')) }
console.log('RAW', rawReaders.join('\n'))
