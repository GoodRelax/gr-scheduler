// Hold each published artifact's version to its inputs (CR-820, design-mcp-relay.md section 6).
//
//     node tools/artifact_versions.mjs check         red when an input changed after the version did
//     node tools/artifact_versions.mjs bump <key>    write the time the inputs last changed (grsRelay | serverSyncDemo)
//
// tools/artifact-versions.json holds, per artifact, `<key>BuiltAt` (the version) and `<key>Inputs`
// (the paths that make its bytes). CHECK: the newest commit touching an input must be an ancestor
// of (or the same as) the newest commit that changed the `<key>BuiltAt` line, and an uncommitted
// input change must come with an uncommitted change of that line. BUMP: the line becomes the commit
// time of the newest input commit, or the present time while an input change is still uncommitted
// (commit the two together).

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const FILE = 'tools/artifact-versions.json'
const KEYS = ['grsRelay', 'serverSyncDemo']
const MS_PER_SECOND = 1000

/** @purity non-pure */
function git(args, root) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}

/** @purity semi-pure-b */
function inputsOf(key, root) {
  const inputs = JSON.parse(readFileSync(join(root, FILE), 'utf8'))[`${key}Inputs`]
  if (!Array.isArray(inputs) || inputs.length === 0) throw new Error(`${FILE} holds no ${key}Inputs`)
  return inputs
}

/** @purity non-pure */
function problemOf(key, root) {
  const inputs = inputsOf(key, root)
  const line = `"${key}BuiltAt"`
  const isTracked = git(['ls-files', '--', FILE], root) !== ''
  if (!isTracked || git(['diff', 'HEAD', '-G', line, '--name-only', '--', FILE], root) !== '') return null
  if (git(['status', '--porcelain', '--', ...inputs], root) !== '') {
    return `an input of ${key} is changed but ${key}BuiltAt is not -- run node tools/artifact_versions.mjs bump ${key}`
  }
  const lastInput = git(['log', '-1', '--format=%H', '--', ...inputs], root)
  const lastBump = git(['log', '-1', '--format=%H', '-G', line, '--', FILE], root)
  if (lastInput === '') return null
  if (lastBump === '') return `${key}BuiltAt was never written -- run node tools/artifact_versions.mjs bump ${key}`
  try {
    git(['merge-base', '--is-ancestor', lastInput, lastBump], root)
    return null
  } catch {
    return `${lastInput.slice(0, 9)} changed an input of ${key} after ${key}BuiltAt last moved (${lastBump.slice(0, 9)}) -- run node tools/artifact_versions.mjs bump ${key} and commit it`
  }
}

/** @purity non-pure */
function bump(key, root) {
  const inputs = inputsOf(key, root)
  const pending = git(['status', '--porcelain', '--', ...inputs], root) !== ''
  const seconds = pending ? Math.floor(Date.now() / MS_PER_SECOND) : Number(git(['log', '-1', '--format=%ct', '--', ...inputs], root))
  const builtAt = `${new Date(seconds * MS_PER_SECOND).toISOString().slice(0, 19)}Z`
  const text = readFileSync(join(root, FILE), 'utf8')
  const next = text.replace(new RegExp(`("${key}BuiltAt": )"[^"]*"`), `$1"${builtAt}"`)
  writeFileSync(join(root, FILE), next)
  return builtAt
}

/** @purity non-pure */
function main() {
  const [mode, key] = process.argv.slice(2)
  const root = process.env.GRS_ARTIFACT_ROOT || ROOT
  if (mode === 'bump' && KEYS.includes(key)) {
    process.stdout.write(`${key}BuiltAt = ${bump(key, root)}\n`)
    return 0
  }
  if (mode !== 'check') {
    process.stderr.write(`usage: node tools/artifact_versions.mjs check | bump ${KEYS.join('|')}\n`)
    return 2
  }
  const problems = KEYS.map((one) => problemOf(one, root)).filter((one) => one !== null)
  for (const one of problems) process.stdout.write(`FAIL     ${one}\n`)
  if (problems.length === 0) process.stdout.write(`OK       ${KEYS.length} artifact version(s) moved with their inputs (${FILE})\n`)
  return problems.length === 0 ? 0 : 1
}

process.exit(main())
