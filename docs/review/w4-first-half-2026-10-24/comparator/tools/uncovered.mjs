// node tools/uncovered.mjs <coverage-final.json> [source-file]: uncovered functions and statement lines.
import { readFileSync } from 'node:fs'

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'))
for (const [file, cov] of Object.entries(data)) {
  const source = readFileSync(file, 'utf8').split('\n')
  console.log('==', file)
  const fns = Object.entries(cov.fnMap).filter(([id]) => cov.f[id] === 0).map(([, fn]) => `${fn.name}@${fn.loc.start.line}`)
  console.log('uncovered functions:', fns.length, fns.join(' '))
  const lines = new Set()
  for (const [id, loc] of Object.entries(cov.statementMap)) if (cov.s[id] === 0) lines.add(loc.start.line)
  const sorted = [...lines].sort((a, b) => a - b)
  const show = process.argv[3] === 'lines'
  if (show) for (const line of sorted) console.log(line, (source[line - 1] ?? '').trim().slice(0, 140))
  else console.log('uncovered statement lines:', sorted.length)
  let branches = 0
  let missed = 0
  for (const [id, counts] of Object.entries(cov.b)) {
    branches += counts.length
    missed += counts.filter((c) => c === 0).length
    if (process.argv[3] === 'branches' && counts.some((c) => c === 0)) {
      const loc = cov.branchMap[id].loc
      console.log('branch', loc.start.line, counts.join('/'), (source[loc.start.line - 1] ?? '').trim().slice(0, 120))
    }
  }
  console.log(`branches ${branches - missed}/${branches}`)
}
