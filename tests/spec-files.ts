// File: SpecFiles: read a split specification document (docs/spec/_source/spec-files.json) whole, by its old name

import { readFileSync as readFileSyncFromDisk, readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

const SPEC_DIR = join(process.cwd(), 'docs', 'spec')
const MANIFEST = join(SPEC_DIR, '_source', 'spec-files.json')

interface SpecPart {
  readonly file: string
  readonly uid: string
  readonly title?: string
  readonly startsAt: string | null
}

interface SplitDocument {
  readonly name: string
  readonly parts: readonly SpecPart[]
}

interface SpecFilesManifest {
  readonly marker: string
  readonly documents: readonly SplitDocument[]
}

let manifestRead: SpecFilesManifest | undefined
const documentsRead = new Map<string, string>()

function manifest(): SpecFilesManifest {
  manifestRead ??= JSON.parse(readFileSyncFromDisk(MANIFEST, 'utf8')) as SpecFilesManifest
  return manifestRead
}

function splitDocument(name: string): SplitDocument | undefined {
  return manifest().documents.find((one) => one.name === name)
}

export function splitDocumentNames(): readonly string[] {
  return manifest().documents.map((one) => one.name)
}

export function specDocumentParts(name: string): readonly string[] {
  const document = splitDocument(basename(name))
  if (document === undefined) throw new Error(`${name} is not a split document of ${MANIFEST}`)
  return document.parts.map((part) => join(SPEC_DIR, part.file))
}

function bodyOf(text: string, marker: string, path: string): string {
  const needle = `\n${marker}\n\n`
  const at = text.indexOf(needle)
  if (at < 0) throw new Error(`${path} has no marker line ${JSON.stringify(marker)} followed by a blank line`)
  return text.slice(at + needle.length)
}

export function readSpecDocument(name: string): string {
  const key = basename(name)
  const held = documentsRead.get(key)
  if (held !== undefined) return held
  const document = splitDocument(key)
  if (document === undefined) throw new Error(`${name} is not a split document of ${MANIFEST}`)
  const marker = manifest().marker.replace('{first}', document.parts[0]?.file ?? '')
  const whole = document.parts
    .map((part, index) => {
      const path = join(SPEC_DIR, part.file)
      const text = readFileSyncFromDisk(path, 'utf8')
      return index === 0 ? text : bodyOf(text, marker, path)
    })
    .join('')
  documentsRead.set(key, whole)
  return whole
}

export function isSplitDocumentPath(path: string): boolean {
  return resolve(dirname(String(path))) === resolve(SPEC_DIR) && splitDocument(basename(String(path))) !== undefined
}

// Summary: When a path names a split document by its old path, readRepoFile shall return the whole document; else it shall read the file.
export function readRepoFile(path: string, encoding: BufferEncoding): string
export function readRepoFile(path: string, options: { encoding: BufferEncoding; flag?: string }): string
export function readRepoFile(path: string): Buffer
export function readRepoFile(
  path: string,
  options?: BufferEncoding | { encoding: BufferEncoding; flag?: string },
): string | Buffer {
  if (isSplitDocumentPath(path)) {
    const whole = readSpecDocument(path)
    return options === undefined ? Buffer.from(whole, 'utf8') : whole
  }
  return options === undefined ? readFileSyncFromDisk(path) : readFileSyncFromDisk(path, options)
}

export function specMarkdownNames(): readonly string[] {
  const parts = new Set(manifest().documents.flatMap((one) => one.parts.map((part) => part.file)))
  const others = readdirSync(SPEC_DIR).filter((name) => name.endsWith('.md') && !parts.has(name))
  return [...others, ...splitDocumentNames()].sort()
}
