// The version of a build: the commit time of the source, in UTC (CR-799, design-mcp-relay.md section 6).
//
//     node tools/relay_version.mjs        -> {"builtAt":"2026-10-18T08:12:34Z","semver":"2026.1018.81234"}
//
// One instant, two spellings:
//   builtAt  the date-time people read: the head of the bundle's description and the download page.
//   semver   the same instant as manifest.json's `version` and the relay's serverInfo, which must
//            be semver: YEAR.MMDD.HHMMSS, each part a number without leading zeros (semver forbids
//            them), so 00:12:34 on 5 January is 2026.105.1234. The core is all numbers, not a
//            pre-release tag, so no installer reads the build as unstable, and comparing two
//            versions as semver orders them as their times.
// The same commit always gives the same version. Pages builds from the pushed commit, so the
// version is taken from git at build time; with no git the build stops rather than guess.

import { execFileSync } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const MS_PER_SECOND = 1000

/** @purity pure */
export function versionOfInstant(epochSeconds) {
  const iso = new Date(epochSeconds * MS_PER_SECOND).toISOString()
  const builtAt = `${iso.slice(0, 19)}Z`
  const [date, time] = builtAt.slice(0, -1).split('T')
  const [year, month, day] = date.split('-')
  const clock = time.split(':').join('')
  const semver = `${Number(year)}.${Number(`${month}${day}`)}.${Number(clock)}`
  return { builtAt, semver }
}

/** @purity non-pure */
export function buildVersion(root = ROOT) {
  const seconds = execFileSync('git', ['log', '-1', '--format=%ct', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  if (!/^\d+$/.test(seconds)) throw new Error(`relay_version: git gave no commit time (${JSON.stringify(seconds)})`)
  return versionOfInstant(Number(seconds))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write(`${JSON.stringify(buildVersion())}\n`)
}
