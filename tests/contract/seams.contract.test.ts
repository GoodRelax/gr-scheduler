// Contract test: the eight seams of table T-065.

import { existsSync } from 'node:fs'
import { readRepoFile } from '../spec-files'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bare, specTable } from './spec-table'
import { NOT_STORED_LIMITS } from '../../src/entity/document-model/edit-history/edit-history'
import * as scheduleLayout from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { NOT_STORED_ZOOM_STEP } from '../../src/adapter/input-command-translator/input-command-translator'
import {
  NOT_STORED_DUAL_CURSOR_SIZES,
  NOT_STORED_SELECTION_SIZES,
} from '../../src/adapter/svg-renderer/svg-renderer'
import { generatedConstantOf } from '../fixtures/setting-number'

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

const read = (path: string): string => readRepoFile(path, 'utf8')

const seams = T065.rows.map((row) => ({
  id: row.id,
  name: bare(row.by['インターフェース'] ?? ''),
  declaredBy: bare(row.by['宣言するコンポーネント'] ?? ''),
  implementedBy: bare(row.by['実装するコンポーネント'] ?? ''),
}))

describe('table T-065 -- the interfaces that cross a layer boundary', () => {
  it('has the eight rows table T-065 holds', () => {
    expect(seams).toHaveLength(8)
    expect(seams.every((s) => s.name && s.declaredBy && s.implementedBy)).toBe(true)
  })

  it.each(seams)(
    '$id $name is declared by $declaredBy in a file of its own',
    ({ name, declaredBy }) => {
      const path = join(folderOf(declaredBy), `${kebab(name)}.ts`)
      expect(existsSync(path), `${path} does not exist`).toBe(true)
      expect(read(path)).toMatch(new RegExp(`export interface ${name}\\b`))
    },
  )

  it.each(seams)(
    '$id $name leaves through the public entry of $declaredBy',
    ({ name, declaredBy }) => {
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
      // Spec: LR-5, LR-1
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

// Why: a roster of every settings table, so a T-206 default that names another row can be followed;
// a table left out makes that reference fail loudly below rather than pass quietly.
const SETTINGS_TABLES = [
  'T-201', 'T-202', 'T-203', 'T-204', 'T-205', 'T-206',
  'T-207', 'T-208', 'T-209', 'T-210', 'T-217', 'T-236',
] as const

describe('the values table T-206 keeps out of the document', () => {
  // Why: a T-206 value never travels in a document, so the published table and the generated constant
  // are two ends of one seam; this test fails when only one of them moves.
  const numbersOf = (cell: string): number[] =>
    (cell.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

  // Trap: reading the digits of a cell that names another row (S-96 holds `S-53`) yields -53;
  // the reference is followed one hop, and only when the cell is a lone row id.
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

  // Why: every NOT_STORED_* constant and not a sample, or a row nothing holds moves and reaches nothing;
  // the Framework ones (dom-screen-surface.ts, frame-loop.ts) need a DOM at module scope and stay out.
  const generated: Record<string, number | readonly [number, number]> = {
    ...generatedConstantOf('src/entity/layout-engine/item-hit-area/item-hit-area.ts', 'NOT_STORED_SIZES'),
    ...NOT_STORED_LIMITS,
    ...((scheduleLayout as Record<string, unknown>)['NOT_STORED_LABEL_SIZES'] as Record<string, number> | undefined),
    ...NOT_STORED_ZOOM_BOUNDS,
    ...NOT_STORED_ZOOM_STEP,
    ...generatedConstantOf('src/adapter/screen-renderer/command-palette.ts', 'NOT_STORED_COMMAND_PALETTE_SIZES'),
    ...generatedConstantOf('src/adapter/screen-renderer/properties-panel.ts', 'NOT_STORED_PROPERTY_CONTROL_SIZES'),
    ...generatedConstantOf('src/adapter/screen-renderer/task-group-panel.ts', 'NOT_STORED_TASK_GROUP_CONTROL_SIZES'),
    ...generatedConstantOf('src/adapter/screen-renderer/screen-frame.ts', 'NOT_STORED_PANEL_DIVIDER_SIZES'),
    ...NOT_STORED_SELECTION_SIZES,
    ...generatedConstantOf('src/entity/layout-engine/schedule-layout/schedule-layout.ts', 'NOT_STORED_DUMMY_SIZES'),
    ...NOT_STORED_DUAL_CURSOR_SIZES,
  }

  it.each(Object.keys(generated))('%s says the same number as the table', (specTableRowId) => {
    const value = generated[specTableRowId]
    const mine = typeof value === 'number' ? [value] : [...(value as readonly number[])]
    expect(published.get(specTableRowId), `table T-206 has no row ${specTableRowId}`).toBeDefined()
    expect(published.get(specTableRowId)).toEqual(mine)
  })

  it('generates no row the table does not state', () => {
    for (const specTableRowId of Object.keys(generated)) {
      expect(published.has(specTableRowId), `${specTableRowId} is not a row of table T-206`).toBe(true)
    }
  })
})
