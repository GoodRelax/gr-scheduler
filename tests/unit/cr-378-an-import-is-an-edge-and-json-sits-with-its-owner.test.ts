// Tables T-247 and T-248 (CR-378) read against the imports of src/.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, normalize, relative, sep } from 'node:path'

import { describe, expect, it } from 'vitest'

import * as documentCodec from '../../src/adapter/document-codec/document-codec'
import * as screenRenderer from '../../src/adapter/screen-renderer/screen-renderer'
import * as editDocument from '../../src/use-case/edit-document/edit-document'
import { bareAll, specTable } from '../contract/spec-table'

const rowText = (table: string, id: string): string => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found.cells.join(' ')
}

const LAYER_FOLDERS: readonly string[] = [
  ...rowText('T-247', 'EG-1').matchAll(/`([a-z-]+(?:\/[a-z-]+)*)\/`/g),
]
  .map((one) => one[1] ?? '')
  .filter((one) => one !== 'src')

// see T-060, LR-4
const INWARD_RANK: Readonly<Record<string, number>> = {
  'entity/document-model': 0,
  'entity/layout-engine': 1,
  'use-case': 2,
  adapter: 3,
  framework: 4,
}

const COMPONENT_NAMES: ReadonlySet<string> = new Set(
  specTable('T-062').rows.flatMap((row) => bareAll(row.by['コンポーネント'] ?? '')),
)

const pascalOf = (kebab: string): string =>
  kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

const SRC = join(process.cwd(), 'src')

function filesUnder(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...filesUnder(path))
    else out.push(path)
  }
  return out
}

interface Place {
  readonly layer: string
  readonly folder: string
  readonly stem: string
  readonly isJson: boolean
}

const keyOf = (place: Place): string => `${place.layer}/${place.folder}`

// see EG-1
function placeOf(path: string): Place | null {
  const parts = relative(SRC, path).split(sep)
  for (const layer of LAYER_FOLDERS) {
    const depth = layer.split('/').length
    if (parts.slice(0, depth).join('/') !== layer || parts.length < depth + 2) continue
    const file = parts[parts.length - 1] ?? ''
    return {
      layer,
      folder: parts[depth] ?? '',
      stem: file.replace(/\.(ts|json)$/, ''),
      isJson: file.endsWith('.json'),
    }
  }
  return null
}

const NAME = '[A-Za-z_$][\\w$]*'
const CLAUSE = `(?:${NAME}\\s*,\\s*)?(?:\\*\\s+as\\s+${NAME}|\\{[^{}]*\\}|${NAME})`
const IMPORT = new RegExp(
  `(?:^|\\n)[ \\t]*(?:import|export)\\b([ \\t]+type(?![\\w$]))?\\s*(${CLAUSE}|\\*)?\\s*from\\s*['"]([^'"]+)['"]` +
    `|(?:^|\\n)[ \\t]*import\\s*['"]([^'"]+)['"]`,
  'g',
)
// WHY: a second, looser pattern counts what is present, so a reader that
// skips a multi-line import shows up as a shortfall instead of a green run.
const SPECIFIER = /(?<![\w$])from\s*['"]([^'"]+)['"]|(?:^|\n)[ \t]*import\s*['"]([^'"]+)['"]/g

interface Site {
  readonly file: string
  readonly specifier: string
  readonly typeOnly: boolean
}

// see EG-3
function typeOnlyClause(typeKeyword: string | undefined, clause: string | undefined): boolean {
  if (typeKeyword !== undefined) return true
  if (clause === undefined || !/^\{[^{}]*\}$/.test(clause)) return false
  const items = clause
    .slice(1, -1)
    .split(',')
    .map((one) => one.trim())
    .filter((one) => one !== '')
  return items.length > 0 && items.every((one) => /^type\s/.test(one))
}

const SOURCE_FILES = filesUnder(SRC).filter((one) => one.endsWith('.ts'))

const READINGS = SOURCE_FILES.map((file) => {
  const text = readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, '')
  const sites: Site[] = [...text.matchAll(IMPORT)].map((hit) => ({
    file,
    specifier: hit[3] ?? hit[4] ?? '',
    typeOnly: hit[4] === undefined && typeOnlyClause(hit[1], hit[2]),
  }))
  return { file, sites, present: [...text.matchAll(SPECIFIER)].length }
})

interface Resolved {
  readonly site: Site
  readonly target: string
  readonly from: Place | null
  readonly to: Place | null
}

const RESOLVED: readonly Resolved[] = READINGS.flatMap((reading) => reading.sites)
  .filter((site) => site.specifier.startsWith('.'))
  .map((site) => {
    const joined = normalize(join(dirname(site.file), site.specifier))
    const target = site.specifier.endsWith('.json') || joined.endsWith('.ts') ? joined : `${joined}.ts`
    return { site, target, from: placeOf(site.file), to: placeOf(target) }
  })

interface Crossing {
  readonly site: Site
  readonly from: Place
  readonly to: Place
}

// see EG-2, EG-4
const CROSSINGS: readonly Crossing[] = RESOLVED.flatMap((one) =>
  one.from !== null && one.to !== null && keyOf(one.from) !== keyOf(one.to)
    ? [{ site: one.site, from: one.from, to: one.to }]
    : [],
)

// see EG-2
function edgesOf(crossings: readonly Crossing[]): ReadonlyMap<string, readonly Crossing[]> {
  const edges = new Map<string, Crossing[]>()
  for (const one of crossings) {
    const key = `${keyOf(one.from)} -> ${keyOf(one.to)}`
    edges.set(key, [...(edges.get(key) ?? []), one])
  }
  return edges
}

const EDGES = edgesOf(CROSSINGS)

const relativeName = (path: string): string => relative(process.cwd(), path).split(sep).join('/')

const siteName = (site: Site): string => `${relativeName(site.file)} -> ${site.specifier}`

const rankOf = (place: Place): number => {
  const rank = INWARD_RANK[place.layer]
  if (rank === undefined) throw new Error(`no rank for layer folder ${place.layer}`)
  return rank
}

describe('CR-378 table T-247: what a component edge is, read against src/', () => {
  it('the premises: EG-1 names the five layer folders the ranks are kept for', () => {
    expect(LAYER_FOLDERS).toEqual(Object.keys(INWARD_RANK))
    expect(COMPONENT_NAMES.size).toBeGreaterThan(0)
  })

  it('EG-1: の直下のフォルダを、1 つのコンポーネントのフォルダとして読むこと（MUST）。その名は、フォルダ名に 表 T-006a の `W-11` を逆向きに当てたもの（kebab-case から PascalCase）とし、表 T-062 のコンポーネント名と一致すること（MUST）', () => {
    const strangers: string[] = []
    for (const layer of LAYER_FOLDERS) {
      const folders = readdirSync(join(SRC, ...layer.split('/')), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
      expect(folders.length, `layer folder ${layer} holds no component folder`).toBeGreaterThan(0)
      for (const folder of folders) {
        if (!COMPONENT_NAMES.has(pascalOf(folder))) strangers.push(`${layer}/${folder} -> ${pascalOf(folder)}`)
      }
    }
    expect(strangers, 'component folders whose PascalCase name is not a component of table T-062').toEqual([])
    expect(SOURCE_FILES.filter((file) => placeOf(file) === null).map(relativeName)).toEqual([])
  })

  it('EG-2: コンポーネント A のフォルダの `.ts` が、`.` で始まる指定子で、別のコンポーネント B のフォルダの `.ts` または `.json` を読むとき、A から B への辺が 1 本あるとすること（MUST）', () => {
    const short = READINGS.filter((one) => one.sites.length < one.present).map(
      (one) => `${relativeName(one.file)}: read ${one.sites.length} of ${one.present}`,
    )
    expect(short).toEqual([])
    expect(RESOLVED.filter((one) => !existsSync(one.target)).map((one) => siteName(one.site))).toEqual([])
    expect(RESOLVED.filter((one) => one.to === null).map((one) => siteName(one.site))).toEqual([])
    expect(
      RESOLVED.filter((one) => one.to?.isJson === true).length,
      'no `.json` read was resolved to a component folder',
    ).toBeGreaterThan(0)
    expect(EDGES.size).toBeGreaterThan(0)
    expect(EDGES.size).toBeLessThan(CROSSINGS.length)
  })

  it('EG-3: 型だけを読む import（`import type` ・ `export type` ・ 波括弧の中がすべて `type` のもの）も辺に数えること（MUST）', () => {
    const typeOnlyEdges = [...EDGES.entries()].filter(([, reads]) => reads.every((one) => one.site.typeOnly))
    expect(typeOnlyEdges.length, 'src/ holds no edge made of type-only imports').toBeGreaterThan(0)
    const withoutTypes = edgesOf(CROSSINGS.filter((one) => !one.site.typeOnly))
    for (const [key] of typeOnlyEdges) {
      expect(withoutTypes.has(key)).toBe(false)
      expect(EDGES.has(key)).toBe(true)
    }
  })

  it('EG-8: 表 T-061 の規則は、本表で数えた辺のすべてに掛かること（MUST） -- LR-1 / LR-4 / LR-3 over every edge, `.json` and type-only reads included; LR-2 over `.ts` reads (a `.json` read is JF-1)', () => {
    const violations: string[] = []
    for (const one of CROSSINGS) {
      if (rankOf(one.to) > rankOf(one.from)) {
        const rule = one.from.layer.startsWith('entity/') && one.to.layer.startsWith('entity/') ? 'LR-4' : 'LR-1'
        violations.push(`${rule}: ${siteName(one.site)} reaches outward from ${one.from.layer} to ${one.to.layer}`)
        continue
      }
      if (!one.to.isJson && one.to.stem !== one.to.folder) {
        violations.push(`LR-2: ${siteName(one.site)} lands on ${one.to.stem}.ts, not ${one.to.folder}.ts`)
      }
    }
    const sameLayer = new Map<string, Set<string>>()
    for (const one of CROSSINGS) {
      if (rankOf(one.to) !== rankOf(one.from)) continue
      const next = sameLayer.get(keyOf(one.from)) ?? new Set<string>()
      next.add(keyOf(one.to))
      sameLayer.set(keyOf(one.from), next)
    }
    const colour = new Map<string, 'open' | 'done'>()
    const visit = (node: string, trail: readonly string[]): void => {
      colour.set(node, 'open')
      for (const next of [...(sameLayer.get(node) ?? [])].sort()) {
        if (colour.get(next) === 'open') violations.push(`LR-3: ${[...trail, next].join(' -> ')}`)
        else if (colour.get(next) === undefined) visit(next, [...trail, next])
      }
      colour.set(node, 'done')
    }
    for (const node of [...sameLayer.keys()].sort()) if (colour.get(node) === undefined) visit(node, [node])
    expect(violations).toEqual([])
  })
})

const JSON_CROSSINGS = CROSSINGS.filter((one) => one.to.isJson)

describe('CR-378 table T-248: where a `.json` under src/ sits, read against src/', () => {
  it('JF-1: 置かれたフォルダのコンポーネントに属し、公開エントリにはならない（表 T-074 の `SU-1`）。⇒ 他のコンポーネントのフォルダの `.json` を読んではならない（MUST NOT）', () => {
    expect(
      JSON_CROSSINGS.map((one) => siteName(one.site)),
      'a .ts reads a .json out of another component folder',
    ).toEqual([])
  })

  it('JF-3: 持ち主と同じ層か、それより外側の層のコンポーネントが中身を要するときは、持ち主の公開エントリが公開する名前（表 T-064）を介して読むこと（MUST）', () => {
    const extensionOfFormat = (documentCodec as Record<string, unknown>)['extensionOfFormat']
    expect(typeof extensionOfFormat, 'DocumentCodec publishes no extensionOfFormat').toBe('function')
    const answer = extensionOfFormat as (rowId: string) => unknown
    let rowsWithAnExtension = 0
    for (const row of specTable('T-024').rows) {
      const found = /`([^`]+)`/.exec(row.by['拡張子'] ?? '')
      if (found === null) continue
      rowsWithAnExtension += 1
      expect(answer(row.id), `table T-024 row ${row.id}`).toBe(found[1])
    }
    expect(rowsWithAnExtension).toBeGreaterThan(1)
    expect(
      JSON_CROSSINGS.filter((one) => rankOf(one.to) <= rankOf(one.from)).map((one) => siteName(one.site)),
    ).toEqual([])
  })

  it('JF-4: 持ち主より内側の層のコンポーネントが中身を要するときは、その値を引数で受け取ること（MUST）', () => {
    expect(
      JSON_CROSSINGS.filter((one) => rankOf(one.to) > rankOf(one.from)).map((one) => siteName(one.site)),
    ).toEqual([])
  })
})

describe('CR-378 section 5.3: DEFAULT_ROW_NAME is published by ScreenRenderer', () => {
  const manuscriptRowWord = ((): string => {
    const words = JSON.parse(
      readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
    ) as { defaultNames?: readonly { use: string; text: Record<string, string> }[] }
    const found = (words.defaultNames ?? []).find((one) => one.use === 'row')
    if (found === undefined) throw new Error('the dictionary has no defaultNames entry for `row`')
    return found.text['en'] ?? ''
  })()

  it('PI-37: ScreenRenderer publishes DEFAULT_ROW_NAME, the dictionary word for a row (HF-14)', () => {
    expect(manuscriptRowWord).not.toBe('')
    expect((screenRenderer as Record<string, unknown>)['DEFAULT_ROW_NAME']).toBe(manuscriptRowWord)
  })

  it('PI-9: EditDocument no longer publishes DEFAULT_ROW_NAME', () => {
    expect(Object.keys(editDocument)).not.toContain('DEFAULT_ROW_NAME')
  })
})
