// Contract test: the nine seams of table T-065.
//
// A contract test belongs to neither side of a seam. Both sides can be green on
// their own while the seam between them is broken, and the seam is where an
// application assembled from 71 separately written units actually falls over.
// So this file is driven by the table, once, rather than by either component.
//
// Table T-065 fixes, for every interface that crosses a layer boundary:
//   - the component that declares it, and
//   - the component in the outer layer that implements it.
// Chapter 5.3 then fixes where the declaration lives and requires the public
// entry to re-export it, so that the implementing layer never has to reach past
// that entry (which its own MUST NOT forbids).
//
// A failure names the row of table T-065, so it points at one line of the
// specification.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bare, specTable } from './spec-table'

const T065 = specTable('T-065')
const T062 = specTable('T-062')

const LAYER_FOLDER: Record<string, string> = {
  documentModel: join('entity', 'document-model'),
  layoutEngine: join('entity', 'layout-engine'),
  UseCase: 'use-case',
  Adapter: 'adapter',
  Framework: 'framework',
}

const kebab = (name: string): string =>
  name.replace(/(?<!^)(?=[A-Z])/g, '-').toLowerCase()

const layerOf = (component: string): string => {
  const row = T062.rows.find((r) => bare(r.by['コンポーネント'] ?? '') === component)
  if (row === undefined) throw new Error(`table T-062 has no component ${component}`)
  return bare(row.by['層'] ?? '')
}

const folderOf = (component: string): string => {
  const layer = layerOf(component)
  const folder = LAYER_FOLDER[layer]
  if (folder === undefined) throw new Error(`Chapter 5.3 draws no folder for layer ${layer}`)
  return join('src', folder, kebab(component))
}

const read = (path: string): string => readFileSync(path, 'utf8')

const seams = T065.rows.map((row) => ({
  id: row.id,
  name: bare(row.by['インターフェース'] ?? ''),
  declaredBy: bare(row.by['宣言するコンポーネント'] ?? ''),
  implementedBy: bare(row.by['実装するコンポーネント'] ?? ''),
}))

describe('table T-065 -- the interfaces that cross a layer boundary', () => {
  it('has the nine rows the design chapter counts', () => {
    expect(seams).toHaveLength(9)
    expect(seams.every((s) => s.name && s.declaredBy && s.implementedBy)).toBe(true)
  })

  it.each(seams)(
    '$id $name is declared by $declaredBy in a file of its own',
    ({ name, declaredBy }) => {
      // Chapter 5.3 (MUST): the declaration sits in the folder of the component
      // that declares it, under the stem of the interface name.
      const path = join(folderOf(declaredBy), `${kebab(name)}.ts`)
      expect(existsSync(path), `${path} does not exist`).toBe(true)
      expect(read(path)).toMatch(new RegExp(`export interface ${name}\\b`))
    },
  )

  it.each(seams)(
    '$id $name leaves through the public entry of $declaredBy',
    ({ name, declaredBy }) => {
      // Chapter 5.3 (MUST): the public entry re-exports it, so the layer that
      // implements it never reads any other file in the folder.
      const entry = join(folderOf(declaredBy), `${kebab(declaredBy)}.ts`)
      expect(existsSync(entry), `${entry} does not exist`).toBe(true)
      expect(read(entry)).toMatch(
        new RegExp(`export type \\{[^}]*\\b${name}\\b[^}]*\\} from '\\./${kebab(name)}'`),
      )
    },
  )

  it.each(seams)(
    '$id $name is implemented by $implementedBy, which sits further out',
    ({ implementedBy, declaredBy }) => {
      // LR-5: the implementation lives in the outer layer. LR-1 then makes the
      // edge from the implementation to the declaration an inward one.
      const rank: Record<string, number> = {
        documentModel: 0,
        layoutEngine: 1,
        UseCase: 2,
        Adapter: 3,
        Framework: 4,
      }
      const outer = rank[layerOf(implementedBy)]
      const inner = rank[layerOf(declaredBy)]
      expect(outer).toBeDefined()
      expect(inner).toBeDefined()
      expect(outer!).toBeGreaterThan(inner!)
      expect(existsSync(join(folderOf(implementedBy), `${kebab(implementedBy)}.ts`))).toBe(true)
    },
  )
})
