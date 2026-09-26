// JDG-644: the files that read the local-only MSPDI schema are named, and each is reported as skipped when it is absent.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const THIS_FILE = 'tests/contract/mspdi-xsd-local-only.test.ts'

const LIST = JSON.parse(readFileSync(join(process.cwd(), 'tests', 'fixtures', 'mspdi-xsd.json'), 'utf8')) as {
  readonly schemas: readonly string[]
  readonly readers: readonly string[]
}

const READER_MARKS: readonly string[] = [
  "cr-429-mspdi-schema'",
  "cr-429-mspdi-fixtures'",
  "'reference', 'mspdi'",
  'reference/mspdi/',
]

const testFilesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return testFilesUnder(path)
    return entry.name.endsWith('.test.ts') ? [relative(process.cwd(), path).split('\\').join('/')] : []
  })

const missing = LIST.schemas.filter((path) => !existsSync(join(process.cwd(), path)))

describe('JDG-644 -- a case that reads the MSPDI schema skips, naming why, where the schema is absent', () => {
  it('names every test file that reads the schema, and no other', () => {
    const readers = testFilesUnder(join(process.cwd(), 'tests'))
      .filter((file) => file !== THIS_FILE)
      .filter((file) => READER_MARKS.some((mark) => readFileSync(file, 'utf8').includes(mark)))
      .sort()
    expect(readers).toEqual([...LIST.readers].sort())
  })

  for (const file of missing.length === 0 ? [] : LIST.readers) {
    it.skip(
      `${file} -- the MSPDI schema is local-only (gitignored) and absent here (${missing.join(', ')}); ` +
        'run it in the root checkout',
      () => {},
    )
  }
})
