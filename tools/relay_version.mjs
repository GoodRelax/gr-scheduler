// The version of a published artifact: the UTC time its inputs last changed, read from
// tools/artifact-versions.json (CR-820, docs/development-rules/10-versions.md).
//
//     node tools/relay_version.mjs        -> {"builtAt":"2026-10-19T19:51:01Z","semver":"2026.1019.195101"}
//
// One instant, two spellings:
//   builtAt  the date-time people read: the head of the bundle's description and the download page.
//   semver   the same instant as manifest.json's `version` and the relay's serverInfo, which must
//            be semver: YEAR.MMDD.HHMMSS, each part a number without leading zeros (semver forbids
//            them), so 00:12:34 on 5 January is 2026.105.1234. The core is all numbers, not a
//            pre-release tag, so no installer reads the build as unstable, and comparing two
//            versions as semver orders them as their times.
// The time is written in the file and committed, never asked of git at build time: a commit
// that touches none of the inputs (a docs-only commit) builds the same version and the same
// bytes, and the shallow Pages checkout needs no history. `node tools/artifact_versions.mjs`
// moves the time (bump) and holds it to the inputs (check).

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const MS_PER_SECOND = 1000
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

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

/** @purity semi-pure-b */
export function artifactBuiltAt(key, root = ROOT) {
  const held = JSON.parse(readFileSync(join(root, 'tools', 'artifact-versions.json'), 'utf8'))[key]
  if (typeof held !== 'string' || !INSTANT.test(held)) {
    throw new Error(`relay_version: tools/artifact-versions.json holds no ${key} of the form YYYY-MM-DDTHH:MM:SSZ`)
  }
  return held
}

/** @purity semi-pure-b */
export function buildVersion(root = ROOT) {
  return versionOfInstant(Date.parse(artifactBuiltAt('grsRelayBuiltAt', root)) / MS_PER_SECOND)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write(`${JSON.stringify(buildVersion())}\n`)
}
