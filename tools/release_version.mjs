// Write a release's version and print its tag (CR-822). The rule -- the forms, the stages and the
// release steps -- is docs/development-rules/10-versions.md sections 1, 2 and 2.1.
//
//     node tools/release_version.mjs <Alpha|Beta|Release>
//
// Step 1 of a release: the version is the build version of what is released (grsRelayBuiltAt in
// tools/artifact-versions.json), written in the compact form into package.json and both places of
// package-lock.json. Prints the tag, the two release-note files to write and the tag command.
// Refuses when a release of the same instant exists: nothing was built since.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { artifactBuiltAt } from './relay_version.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
export const STAGES = ['Alpha', 'Beta', 'Release']
export const RELEASE_NOTES = 'docs/release-notes'
const RELEASE_NOTE_NAME = /^(Alpha|Beta|Release)-(\d{8}T\d{6}Z)(-ja)?\.md$/
const VERSION_LINE = /("version": )"[^"]*"/

/** @purity pure */
export function compactOf(instant) {
  return instant.replace(/[-:]/g, '')
}

/** @purity pure */
export function releaseNoteOf(fileName) {
  const found = RELEASE_NOTE_NAME.exec(fileName)
  if (found === null) return null
  return { stage: found[1], compact: found[2], isJapanese: found[3] !== undefined, tag: `${found[1]}-${found[2]}` }
}

/** @purity semi-pure-b */
export function releaseNotesIn(root = ROOT) {
  return readdirSync(join(root, RELEASE_NOTES)).map((name) => ({ name, note: releaseNoteOf(name) }))
}

/** @purity pure */
export function newestRelease(notes) {
  const known = notes.filter((one) => one.note !== null).map((one) => one.note)
  if (known.length === 0) return null
  return known.reduce((newest, one) => (one.compact > newest.compact ? one : newest))
}

/** @purity pure */
export function withVersion(text, version, count) {
  let left = count
  const out = text.replace(new RegExp(VERSION_LINE.source, 'g'), (whole, head) => {
    if (left === 0) return whole
    left -= 1
    return `${head}"${version}"`
  })
  if (left !== 0) throw new Error(`found fewer than ${count} "version" lines`)
  return out
}

/** @purity non-pure */
function main() {
  const [stage] = process.argv.slice(2)
  if (!STAGES.includes(stage)) {
    process.stderr.write(`usage: node tools/release_version.mjs ${STAGES.join('|')}\n`)
    return 2
  }
  const compact = compactOf(artifactBuiltAt('grsRelayBuiltAt'))
  const same = releaseNotesIn().find((one) => one.note !== null && one.note.compact === compact)
  if (same) {
    process.stderr.write(`release_version: ${same.name} already names ${compact} -- nothing was built since that release\n`)
    return 1
  }
  const pkg = readFileSync(join(ROOT, 'package.json'), 'utf8')
  const lock = readFileSync(join(ROOT, 'package-lock.json'), 'utf8')
  // WHY: package.json has one version line at its top; the lock has its own and packages[""]'s, the first two.
  const nextPkg = withVersion(pkg, compact, 1)
  const nextLock = withVersion(lock, compact, 2)
  const parsedLock = JSON.parse(nextLock)
  if (JSON.parse(nextPkg).version !== compact || parsedLock.version !== compact || parsedLock.packages[''].version !== compact) {
    throw new Error('the first version lines are not the package own versions')
  }
  writeFileSync(join(ROOT, 'package.json'), nextPkg)
  writeFileSync(join(ROOT, 'package-lock.json'), nextLock)
  const tag = `${stage}-${compact}`
  process.stdout.write(
    [
      `version   ${compact} (package.json, package-lock.json)`,
      `tag       ${tag}`,
      `write     ${RELEASE_NOTES}/${tag}.md  ${RELEASE_NOTES}/${tag}-ja.md  and the version line of README.md and README-ja.md`,
      `then      GT-2, the develop -> main PR; after the user merges it: git tag ${tag} origin/main`,
      '',
    ].join('\n'),
  )
  return 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main())
