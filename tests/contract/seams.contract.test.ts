// Contract test: the eight seams of table T-065.
//
// A contract test belongs to neither side of a seam. Both sides can be green on
// their own while the seam between them is broken, and the seam is where an
// application assembled from 68 separately written units actually falls over.
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
import { NOT_STORED_SIZES } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { NOT_STORED_LIMITS } from '../../src/entity/document-model/edit-history/edit-history'
import { NOT_STORED_LABEL_SIZES } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { NOT_STORED_ZOOM_STEP } from '../../src/adapter/input-command-translator/input-command-translator'
import { NOT_STORED_COMMAND_PALETTE_SIZES } from '../../src/adapter/screen-renderer/command-palette'
import { NOT_STORED_PROPERTY_CONTROL_SIZES } from '../../src/adapter/screen-renderer/properties-panel'
import { NOT_STORED_ROW_CONTROL_SIZES } from '../../src/adapter/screen-renderer/row-title-panel'
import { NOT_STORED_PANEL_DIVIDER_SIZES } from '../../src/adapter/screen-renderer/screen-frame'
import {
  NOT_STORED_DUAL_CURSOR_SIZES,
  NOT_STORED_DUMMY_SIZES,
  NOT_STORED_SELECTION_SIZES,
} from '../../src/adapter/svg-renderer/svg-renderer'

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
  // ⚠️ CR-280 retired the autosave, and `DocumentStore` -- the seam
  // `LocalStorageDocumentStore` implemented -- went with it: table T-065 fell
  // from nine rows to eight. Chapter 5.3's prose still says 「層をまたぐ 9 本」
  // while the table it points at holds eight, and the table is the 全数.
  it('has the eight rows table T-065 holds', () => {
    expect(seams).toHaveLength(8)
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

// Every settings table of `_assets/tbl-settings.md`, so a T-206 row whose
// 既定 cell names another row can be followed to the row that states the value.
// ⚠️ A roster and not a scan: a table added to that file and left out here makes
// a reference unresolvable, and an unresolvable reference fails loudly below
// rather than passing quietly.
const SETTINGS_TABLES = [
  'T-201', 'T-202', 'T-203', 'T-204', 'T-205', 'T-206',
  'T-207', 'T-208', 'T-209', 'T-210', 'T-217', 'T-236',
] as const

describe('the values table T-206 keeps out of the document', () => {
  // T-206 holds what the document does NOT store, so the value cannot travel
  // inside a document -- it reaches the unit that owns its type as a generated
  // constant, and the caller passes it in (CR-178). That makes the published
  // table and the constant two ends of one seam, and this is the test that
  // fails if only one of them moves. ⚠️ Before CR-178 the numbers existed only
  // in whatever a caller happened to type; CR-174 is the session where exactly
  // that let a changed value reach nothing at all.
  const numbersOf = (cell: string): number[] =>
    (cell.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

  // ⛔ A CELL THAT NAMES ANOTHER ROW IS FOLLOWED, NOT READ FOR DIGITS. S-96,
  // S-97 and S-98 hold no number of their own -- their 既定 cell is `S-53`,
  // `S-54` and `S-55`, the rows that DO state the zoom step and bounds -- and
  // reading the digits out of the reference turned `S-53` into the number -53.
  // ⚠️ Followed exactly one hop and only when the cell is a lone row id, so a
  // chain or a cell that merely mentions a row is left as it stands.
  const defaultsBySettingRow = new Map<string, string>()
  for (const table of SETTINGS_TABLES) {
    for (const row of specTable(table).rows) {
      const cell = row.by['既定'] ?? row.by['既定値'] ?? ''
      if (cell !== '' && !defaultsBySettingRow.has(row.id)) {
        defaultsBySettingRow.set(row.id, cell)
      }
    }
  }

  const statedBy = (cell: string): string => {
    const named = bare(cell).trim()
    return /^S-\d+[a-z]?$/.test(named) ? bare(defaultsBySettingRow.get(named) ?? '') : named
  }

  const published = new Map<string, number[]>()
  for (const row of specTable('T-206').rows) {
    published.set(row.id, numbersOf(statedBy(row.by['既定'] ?? '')))
  }

  // ⛔ EVERY `NOT_STORED_*` THIS SIDE OF IF-9, NOT A SAMPLE OF THEM. D-93 of the
  // defect ledger was raised as "S-140 has no test", and S-140 was one of 44
  // rows of table T-206 that nothing held: two constants were spread here and
  // eighteen were not, so a manuscript value could move and reach nothing while
  // this file stayed green -- which is the very accident CR-174 records and the
  // reason this test exists.
  // ⚠️ The four in `dom-screen-surface.ts` and the three in `frame-loop.ts` are
  // NOT here: those units are Framework and reach for the DOM at module scope,
  // so importing them into a node-environment test loads a browser they do not
  // have. They are the remaining debt of D-93, and the count below is what says
  // how much of the table is now held.
  const generated: Record<string, number | readonly [number, number]> = {
    ...NOT_STORED_SIZES,
    ...NOT_STORED_LIMITS,
    ...NOT_STORED_LABEL_SIZES,
    ...NOT_STORED_ZOOM_BOUNDS,
    ...NOT_STORED_ZOOM_STEP,
    ...NOT_STORED_COMMAND_PALETTE_SIZES,
    ...NOT_STORED_PROPERTY_CONTROL_SIZES,
    ...NOT_STORED_ROW_CONTROL_SIZES,
    ...NOT_STORED_PANEL_DIVIDER_SIZES,
    ...NOT_STORED_SELECTION_SIZES,
    ...NOT_STORED_DUMMY_SIZES,
    ...NOT_STORED_DUAL_CURSOR_SIZES,
  }

  it.each(Object.keys(generated))('%s says the same number as the table', (rowId) => {
    const value = generated[rowId]
    const mine = typeof value === 'number' ? [value] : [...(value as readonly number[])]
    expect(published.get(rowId), `table T-206 has no row ${rowId}`).toBeDefined()
    expect(published.get(rowId)).toEqual(mine)
  })

  it('generates no row the table does not state', () => {
    for (const rowId of Object.keys(generated)) {
      expect(published.has(rowId), `${rowId} is not a row of table T-206`).toBe(true)
    }
  })
})
