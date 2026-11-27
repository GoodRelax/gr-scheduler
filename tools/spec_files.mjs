// File: read a split specification document whole, by its old name (the .mjs mirror of tools/spec_files.py)
//
// docs/spec/_source/spec-files.json names the part files of each split document. A later part
// opens with its own header and a marker line; its body is everything after the marker line and
// the blank line that follows it. The bodies joined are the old file byte for byte.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SPEC_DIR = 'docs/spec'
const MANIFEST = `${SPEC_DIR}/_source/spec-files.json`

/** @purity semi-pure-mutable */
function manifestOf(root) {
  return JSON.parse(readFileSync(join(root, MANIFEST), 'utf8'))
}

/** The split documents as { path, parts } with repository-relative paths. @purity semi-pure-mutable */
export function splitDocuments(root) {
  return manifestOf(root).documents.map((one) => ({
    path: `${SPEC_DIR}/${one.name}`,
    parts: one.parts.map((part) => `${SPEC_DIR}/${part.file}`),
  }))
}

/** The whole document at its old repository-relative PATH: its part bodies joined. @purity semi-pure-mutable */
export function readSpecDocument(root, path) {
  const manifest = manifestOf(root)
  const document = manifest.documents.find((one) => `${SPEC_DIR}/${one.name}` === path)
  if (document === undefined) throw new Error(`${path} is not a split document of ${MANIFEST}`)
  const marker = manifest.marker.replace('{first}', document.parts[0].file)
  const needle = `\n${marker}\n\n`
  return document.parts
    .map((part, index) => {
      const text = readFileSync(join(root, SPEC_DIR, part.file), 'utf8')
      if (index === 0) return text
      const at = text.indexOf(needle)
      if (at < 0) throw new Error(`${SPEC_DIR}/${part.file} has no marker line followed by a blank line`)
      return text.slice(at + needle.length)
    })
    .join('')
}

/** NAMES (repository-relative paths) with each split document's parts replaced by its old path. @purity semi-pure-mutable */
export function listedPaths(root, names) {
  const owner = new Map()
  for (const document of splitDocuments(root)) for (const part of document.parts) owner.set(part, document.path)
  const out = new Set()
  for (const name of names) out.add(owner.get(name) ?? name)
  return [...out]
}
