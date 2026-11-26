// Spec: T-062, EG-1

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bare, specTable } from './spec-table'

const REQUIREMENTS = join(process.cwd(), 'docs', 'spec', '01-04-requirements.md')
const USE_CASE_FOLDER = join(process.cwd(), 'src', 'use-case')
const ALLOWED_SUFFIXES = ['', 'UseCase', 'Interactor'] as const
const USE_CASE_LAYER = 'UseCase'

interface SpecUseCase {
  readonly uid: string
  readonly name: string
}

// Why: the name comes from the heading itself, so renaming a use case without its component fails here.
const HEADING = /^#### .+（([A-Z][A-Za-z0-9]*)）$/
const UID_LINE = /^\*\*UID\*\*: (UC-\d+)$/
const LINES_TO_THE_UID = 4

const kebab = (name: string): string => name.replace(/(?<!^)(?=[A-Z])/g, '-').toLowerCase()

/** @purity pure */
function specUseCasesOf(text: string): readonly SpecUseCase[] {
  const lines = text.split(/\r?\n/)
  const found: SpecUseCase[] = []
  lines.forEach((line, at) => {
    const heading = HEADING.exec(line)
    if (heading === null) return
    for (const next of lines.slice(at + 1, at + 1 + LINES_TO_THE_UID)) {
      const uid = UID_LINE.exec(next)
      if (uid !== null) found.push({ uid: uid[1] ?? '', name: heading[1] ?? '' })
    }
  })
  return found
}

const USE_CASES = specUseCasesOf(readFileSync(REQUIREMENTS, 'utf8'))
// Unimplemented: OPQ-26
const AWAITING_USE_CASES: ReadonlySet<string> = new Set(['UC-013'])
const caseOf = (useCase: SpecUseCase) => (AWAITING_USE_CASES.has(useCase.uid) ? it.fails : it)
const USE_CASE_COMPONENTS = specTable('T-062')
  .rows.filter((row) => bare(row.by['層'] ?? '') === USE_CASE_LAYER)
  .map((row) => ({ id: row.id, component: bare(row.by['コンポーネント'] ?? '') }))

const componentsNamedAfter = (useCase: SpecUseCase) =>
  USE_CASE_COMPONENTS.filter((row) => ALLOWED_SUFFIXES.some((suffix) => row.component === useCase.name + suffix))

describe('each use case of Chapter 3.2 has one UseCase component of the same name (T-062, EG-1)', () => {
  it('reads the use cases and their English names from the headings', () => {
    expect(USE_CASES.length).toBeGreaterThan(0)
    expect(new Set(USE_CASES.map((one) => one.uid)).size).toBe(USE_CASES.length)
    expect(new Set(USE_CASES.map((one) => one.name)).size).toBe(USE_CASES.length)
  })

  for (const useCase of USE_CASES) {
    caseOf(useCase)(`${useCase.uid} names exactly one UseCase row of table T-062`, () => {
      expect(componentsNamedAfter(useCase).map((row) => row.component)).toEqual([useCase.name])
    })

    caseOf(useCase)(`${useCase.uid} has its folder and public entry in src/use-case`, () => {
      const folder = kebab(useCase.name)
      const entry = join(USE_CASE_FOLDER, folder, `${folder}.ts`)
      expect(existsSync(entry)).toBe(true)
      expect(readFileSync(entry, 'utf8')).toContain(`// @component ${useCase.name}, layer UseCase (table T-062)`)
    })
  }

  it('every UseCase folder in src/use-case is a component of table T-062', () => {
    const folders = readdirSync(USE_CASE_FOLDER, { withFileTypes: true })
      .filter((one) => one.isDirectory())
      .map((one) => one.name)
      .sort()
    expect(folders).toEqual(USE_CASE_COMPONENTS.map((row) => kebab(row.component)).sort())
  })
})
