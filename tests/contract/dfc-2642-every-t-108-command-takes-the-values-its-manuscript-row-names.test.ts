// DFC-2642 spec-only cases: every command of table T-108 is taken in the shape its manuscript row names -- the values it carries, no more and no fewer -- by PI-20 commandShapeFaults and by applyCommands (AM-7).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi, type AgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { commandShapeFaults } from '../../src/adapter/document-codec/document-codec'
import { shell, taskGroupDocument, TEMPLATE, type ShellBench } from '../unit/cr-541-stage'
import { specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const readJson = (...parts: string[]): any => JSON.parse(readFileSync(join(SPEC, ...parts), 'utf8'))
const readText = (...parts: string[]): string => unbroken(readFileSync(join(SPEC, ...parts), 'utf8').replace(/\r\n/g, '\n'))

const MANUSCRIPT = readJson('_source', 'document-commands.json')
const ERD = readJson('_source', 'erd.json')
const SETTINGS = readJson('_source', 'settings.json')

// see T-108, PI-20, AV-4, AG-3
const T_108_HOLDS_THE_VALUES = '⭐ **命令が運ぶ値（名・型・意味）は本表が持つ**'
const T_108_COLUMN_RULES = '文書の列を書く値は、その列（表 T-058 の `AT-` の行、見せ方の群は 表 T-202 ・表 T-203 の `S-` の行）を指し、型と上下限はその行に従う。'
const T_108_OPTIONAL_WORD = '省いてよい'
const PI_20_SHAPE = '命令 1 つが 表 T-108 の形（種類・要る値・持てない値・値の型）に合うかを答える。'
const PI_20_USE = '`applyCommands` が外れた束を表 T-035 の `AG-9a` の `malformedRequest` で断るのに使う（`FR-028`）'
const AV_4_MALFORMED = "`'malformedRequest'` —— 呼び方の形が違う（`FR-028`）"
const AG_3_ATOMIC = '途中で 1 つでも拒否されたら全部を元に戻し、半端に適用された文書を残さない'
const UNIMPLEMENTED_WORD = '⚠️ まだ実装していない —— 受けても断る'

// WHY: a value name no row of the manuscript carries (asserted below), so adding it is a value the command may not have.
const NOT_CARRIED = 'notCarriedByT108'
const GROUP = 'aaaaaaaa-0000-4000-8000-000000000001'
const DATE_TIME = '2026-04-06T08:00:00'
const TIME = '08:00:00'
// WHY: a word every colour pattern of the document schema admits (table T-058 colour columns).
const COLOR = 'red'

interface ManuscriptValue {
  readonly name?: string
  readonly column?: string | readonly string[]
  readonly key?: string
  readonly type?: string
  readonly null?: boolean
  readonly list?: boolean
  readonly optional?: boolean
  readonly values?: readonly string[]
  readonly valuesOf?: readonly string[]
  readonly oneOf?: readonly string[]
}

interface ManuscriptRow {
  readonly id: string
  readonly name: string
  readonly union: string
  readonly values?: readonly ManuscriptValue[]
}

interface ManuscriptShape {
  readonly name: string
  readonly fields?: readonly ManuscriptValue[]
  readonly discriminant?: string
  readonly variants?: readonly { readonly tag: string; readonly row: string; readonly fields: readonly ManuscriptValue[] }[]
}

const ROWS: readonly ManuscriptRow[] = MANUSCRIPT.rows
const SHAPES: readonly ManuscriptShape[] = MANUSCRIPT.shapes
const EXTERNAL_TYPES = new Set(Object.keys(MANUSCRIPT.externalTypes))
const shapeNamed = (name: string): ManuscriptShape | undefined => SHAPES.find((shape) => shape.name === name)
const isUnimplemented = (row: ManuscriptRow): boolean => row.union === 'UnimplementedDocumentCommand'
const IMPLEMENTED = ROWS.filter((row) => !isUnimplemented(row))

// see T-058
// WHY: the AT- row id gives the entity and the column; erd.json holds the column's JSON kind.
const COLUMN_OF_AT = new Map<string, { entity: string; column: string }>(
  specTable('T-058').rows.map((row) => [
    row.id,
    { entity: (row.by['エンティティ'] ?? '').replace(/`/g, ''), column: (row.by['列'] ?? '').replace(/`/g, '') },
  ]),
)

const jsonOfAt = (id: string): any => {
  const where = COLUMN_OF_AT.get(id)
  if (where === undefined) throw new Error(`table T-058 has no row ${id}`)
  const entity = (ERD.entities as any[]).find((one) => one.name === where.entity)
  const column = (entity?.columns as any[] | undefined)?.find((one) => one.name === where.column)
  if (column?.json === undefined) throw new Error(`erd.json has no column ${where.entity}.${where.column} (${id})`)
  return column.json
}

// see T-202, T-203
// WHY: every S- row of settings.json, wherever its block nests it.
const SETTING_ROWS = new Map<string, any>()
const collectSettings = (node: unknown): void => {
  if (Array.isArray(node)) {
    node.forEach(collectSettings)
    return
  }
  if (node === null || typeof node !== 'object') return
  const one = node as Record<string, unknown>
  if (typeof one['id'] === 'string' && /^S-\d+$/.test(one['id'] as string)) SETTING_ROWS.set(one['id'] as string, one)
  Object.values(one).forEach(collectSettings)
}
collectSettings(SETTINGS)

// see T-376
// WHY: the standard-time keys a time-zone column takes.
const STANDARD_ZONE = specTable('T-376').rows.find((row) => (row.by['種'] ?? '').includes('標準時'))?.by['鍵']?.replace(/`/g, '')

// WHY: a default is by definition a value the setting takes (T-202 / T-203 default column).
const valueOfSetting = (id: string): unknown => {
  const row = SETTING_ROWS.get(id)
  if (row === undefined) throw new Error(`settings.json has no row ${id}`)
  const fallback = row.default
  if (typeof fallback?.num === 'string') return Number(fallback.num)
  if (typeof fallback?.lit === 'string') return JSON.parse(fallback.lit.replace(/'/g, '"'))
  throw new Error(`settings.json row ${id} has no literal default`)
}

const settingKey = (id: string): string => String(SETTING_ROWS.get(id)?.key ?? '').replace(/`/g, '')

const UNSYNTHESIZABLE = Symbol('unsynthesizable')

const valueOfColumnJson = (json: any): unknown => {
  switch (json.kind) {
    case 'string':
      if (json.isDate === true) return DATE_TIME
      if (json.isTime === true) return TIME
      if (json.format === 'uuid') return GROUP
      return 'x'
    case 'integer':
    case 'number':
      return typeof json.min === 'number' ? json.min : 1
    case 'boolean':
      return true
    case 'color':
      return COLOR
    case 'enum':
      if (Array.isArray(json.values)) return json.values[0]
      if (json.valuesFrom === 'T-376') return STANDARD_ZONE
      return UNSYNTHESIZABLE
    case 'array':
      return []
    case 'map':
      return {}
    case 'object':
      return Object.fromEntries(Object.entries(json.fields ?? {}).map(([name, field]) => [name, valueOfColumnJson(field)]))
    default:
      return UNSYNTHESIZABLE
  }
}

const valueOfColumnId = (id: string): unknown => (id.startsWith('S-') ? valueOfSetting(id) : valueOfColumnJson(jsonOfAt(id)))

const valueOfType = (value: ManuscriptValue): unknown => {
  const type = value.type ?? ''
  if (type === 'string') {
    // WHY: a typed string that also points at an enum column (CM-95 viewTimeZone, S-574) takes that column's value.
    if (typeof value.column === 'string' && value.column.startsWith('S-') && SETTING_ROWS.get(value.column)?.json?.kind === 'enum') {
      return value.null === true ? null : STANDARD_ZONE
    }
    return DATE_TIME
  }
  if (type === 'integer' || type === 'number') return 1
  if (type === 'boolean') return true
  if (type === 'map') return {}
  if (type === 'enum') {
    if (value.values !== undefined) return value.values[0]
    if (value.valuesOf !== undefined) return settingKey(value.valuesOf[0] ?? '')
    return UNSYNTHESIZABLE
  }
  if (EXTERNAL_TYPES.has(type)) return value.null === true ? null : UNSYNTHESIZABLE
  const shape = shapeNamed(type)
  if (shape !== undefined) return objectOfShape(shape)
  return UNSYNTHESIZABLE
}

const singleValueOf = (value: ManuscriptValue): unknown => {
  if (value.type !== undefined) return valueOfType(value)
  if (value.key !== undefined) return valueOfColumnId(value.key)
  if (typeof value.column === 'string') return valueOfColumnId(value.column)
  return UNSYNTHESIZABLE
}

const valueOf = (value: ManuscriptValue): unknown => {
  // WHY: an external type carried as a list (TableView.columnFilters) is an empty list -- no element to build.
  if (value.list === true && value.type !== undefined && EXTERNAL_TYPES.has(value.type)) return []
  const one = singleValueOf(value)
  if (one === UNSYNTHESIZABLE) return UNSYNTHESIZABLE
  return value.list === true ? [one] : one
}

const objectOf = (values: readonly ManuscriptValue[], withOptional: boolean): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const value of values) {
    if (value.oneOf !== undefined) {
      const first = shapeNamed(value.oneOf[0] ?? '')
      if (first === undefined) throw new Error(`no shape ${value.oneOf[0]}`)
      Object.assign(out, objectOf(first.fields ?? [], withOptional))
      continue
    }
    if (value.name === undefined) throw new Error('a carried value without a name or a choice')
    if (value.optional === true && !withOptional) continue
    const built = valueOf(value)
    if (built === UNSYNTHESIZABLE) {
      if (value.optional === true) continue
      throw new Error(`cannot build the required value ${value.name}`)
    }
    out[value.name] = built
  }
  return out
}

function objectOfShape(shape: ManuscriptShape): Record<string, unknown> {
  if (shape.discriminant !== undefined) {
    const first = shape.variants?.[0]
    if (first === undefined) throw new Error(`shape ${shape.name} has no variant`)
    return { [shape.discriminant]: first.tag, ...objectOf(first.fields, false) }
  }
  return objectOf(shape.fields ?? [], false)
}

const minimalCommand = (row: ManuscriptRow): Record<string, unknown> => ({ kind: row.name, ...objectOf(row.values ?? [], false) })

// see T-108
// WHY: a value the row prints without the optional word must be there.
const requiredNames = (row: ManuscriptRow): readonly string[] =>
  (row.values ?? []).filter((value) => value.name !== undefined && value.optional !== true).map((value) => value.name as string)

const optionalValues = (row: ManuscriptRow): readonly ManuscriptValue[] =>
  (row.values ?? []).filter((value) => value.optional === true && valueOf(value) !== UNSYNTHESIZABLE)

const allValueNames = (): ReadonlySet<string> => {
  const names = new Set<string>()
  const walk = (values: readonly ManuscriptValue[] | undefined): void => {
    for (const value of values ?? []) if (value.name !== undefined) names.add(value.name)
  }
  ROWS.forEach((row) => walk(row.values))
  SHAPES.forEach((shape) => {
    walk(shape.fields)
    shape.variants?.forEach((variant) => walk(variant.fields))
  })
  return names
}

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

function stage(): { api: AgentApi; bench: ShellBench } {
  const bench = shell(taskGroupDocument([{ id: GROUP, parentId: null }]))
  benches.push(bench)
  const api = installAgentApi({
    ...bench.loop.agentApiSeams(),
    writerName: 'dfc-2642 tester',
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
  } as never)
  return { api, bench }
}

const write = (api: AgentApi, commands: readonly unknown[]) =>
  api.applyCommands({ expectedStamp: api.readStamp(), commands: commands as never })

describe('DFC-2642 -- the specification these cases are driven by', () => {
  const COMMANDS_TEXT = readText('_assets', 'tbl-document-commands.md')
  const PUBLISHED_TEXT = readText('_assets', 'tbl-published-entries.md')
  const MEMBERS_TEXT = readText('_assets', 'tbl-agent-api-members.md')
  const REQUIREMENTS_TEXT = readText('01-04-requirements.md')

  it('T-108 still says it holds the values each command carries, pointing a column value at its T-058 / S- row', () => {
    expect(COMMANDS_TEXT).toContain(T_108_HOLDS_THE_VALUES)
    expect(COMMANDS_TEXT).toContain(T_108_COLUMN_RULES)
    expect(MANUSCRIPT.words.optional.ja).toBe(T_108_OPTIONAL_WORD)
    expect(MANUSCRIPT.words.unimplemented.ja).toBe(UNIMPLEMENTED_WORD)
  })

  it('PI-20 still publishes commandShapeFaults for the shape of one T-108 command, AV-4 names malformedRequest, AG-3 is atomic', () => {
    expect(PUBLISHED_TEXT).toContain(PI_20_SHAPE)
    expect(PUBLISHED_TEXT).toContain(PI_20_USE)
    expect(MEMBERS_TEXT).toContain(AV_4_MALFORMED)
    expect(REQUIREMENTS_TEXT).toContain(AG_3_ATOMIC)
  })

  it('the manuscript holds 93 commands, one of them (CM-76) not implemented, and no value is named notCarriedByT108', () => {
    expect(ROWS).toHaveLength(93)
    expect(ROWS.filter(isUnimplemented).map((row) => row.id)).toEqual(['CM-76'])
    expect(allValueNames().has(NOT_CARRIED)).toBe(false)
  })

  it('every implemented command can be built from its row: every required value has a value', () => {
    for (const row of IMPLEMENTED) {
      const built = minimalCommand(row)
      for (const name of requiredNames(row)) expect(Object.keys(built), `${row.id} ${row.name}`).toContain(name)
    }
  })
})

describe('PI-20 commandShapeFaults, T-108 row by row', () => {
  it.each(IMPLEMENTED.map((row) => [row.id, row.name, row] as const))(
    '%s %s (T-108): the command its row prints, required values only, has no fault',
    (_id, _name, row) => {
      expect(commandShapeFaults(minimalCommand(row))).toEqual([])
    },
  )

  it.each(IMPLEMENTED.map((row) => [row.id, row.name, row] as const))(
    '%s %s (T-108, PI-20 "持てない値"): one value the row does not print is a fault',
    (_id, _name, row) => {
      expect(commandShapeFaults({ ...minimalCommand(row), [NOT_CARRIED]: 1 }).length).toBeGreaterThan(0)
    },
  )

  const required = IMPLEMENTED.flatMap((row) => requiredNames(row).map((name) => [row.id, row.name, name, row] as const))
  it.each(required)('%s %s (T-108, PI-20 "要る値"): leaving out %s is a fault', (_id, _name, name, row) => {
    const command = minimalCommand(row)
    delete command[name]
    expect(commandShapeFaults(command).length).toBeGreaterThan(0)
  })

  const optional = IMPLEMENTED.flatMap((row) => optionalValues(row).map((value) => [row.id, row.name, value.name ?? '', row, value] as const))
  it.each(optional)('%s %s (T-108 "省いてよい"): %s may also be carried', (_id, _name, name, row, value) => {
    expect(commandShapeFaults({ ...minimalCommand(row), [name]: valueOf(value) })).toEqual([])
  })

  it('CM-13 (T-108, T-019): each PA- row of PlanActualPlacement is a placement the command takes', () => {
    const row = ROWS.find((one) => one.id === 'CM-13')
    const shape = shapeNamed('PlanActualPlacement')
    if (row === undefined || shape?.variants === undefined || shape.discriminant === undefined) throw new Error('CM-13 or its shape is gone')
    expect(shape.variants.map((variant) => variant.row)).toEqual(['PA-1', 'PA-2', 'PA-3', 'PA-4', 'PA-5'])
    for (const variant of shape.variants) {
      const place = { [shape.discriminant]: variant.tag, ...objectOf(variant.fields, false) }
      expect(commandShapeFaults({ ...minimalCommand(row), place }), variant.row).toEqual([])
    }
  })

  it('CM-38 (T-108): each of the two lag shapes the row offers is taken', () => {
    const row = ROWS.find((one) => one.id === 'CM-38')
    const choice = row?.values?.find((value) => value.oneOf !== undefined)?.oneOf
    expect(choice).toEqual(['WorkingDayLag', 'TypedLag'])
    const keys = Object.fromEntries((row?.values ?? []).filter((value) => value.name !== undefined).map((value) => [value.name, valueOf(value)]))
    for (const name of choice ?? []) {
      const shape = shapeNamed(name)
      if (shape === undefined) throw new Error(`no shape ${name}`)
      expect(commandShapeFaults({ kind: 'setDependencyLag', ...keys, ...objectOfShape(shape) }), name).toEqual([])
    }
  })
})

describe('AM-7 applyCommands, T-108 row by row (AG-9a, AG-3, FR-028)', () => {
  it.each(IMPLEMENTED.map((row) => [row.id, row.name, row] as const))(
    '%s %s (T-108, AV-4): the command its row prints is never refused as malformedRequest',
    (_id, _name, row) => {
      const { api } = stage()
      const outcome = write(api, [minimalCommand(row)])
      const reason = outcome.ok ? null : outcome.refusal.reason
      expect(reason).not.toBe('malformedRequest')
    },
  )

  it.each(IMPLEMENTED.map((row) => [row.id, row.name, row] as const))(
    '%s %s (T-108, AV-4, AG-3): with one value the row does not print it is refused as malformedRequest and nothing changes',
    (_id, _name, row) => {
      const { api, bench } = stage()
      const documentBefore = JSON.stringify(bench.loop.document())
      const stampBefore = JSON.stringify(api.readStamp())
      const outcome = write(api, [{ ...minimalCommand(row), [NOT_CARRIED]: 1 }])
      expect(outcome.ok).toBe(false)
      if (outcome.ok) return
      expect(outcome.refusal.reason).toBe('malformedRequest')
      expect(JSON.stringify(bench.loop.document())).toBe(documentBefore)
      expect(JSON.stringify(api.readStamp())).toBe(stampBefore)
    },
  )

  it('CM-76 (T-108 "受けても断る"): setTaskGroupEditPermission through applyCommands is refused and nothing changes', () => {
    const row = ROWS.find((one) => one.id === 'CM-76')
    if (row === undefined) throw new Error('CM-76 is gone')
    const { api, bench } = stage()
    const documentBefore = JSON.stringify(bench.loop.document())
    const outcome = write(api, [{ kind: row.name, taskGroupId: GROUP, editPermission: null }])
    expect(outcome.ok).toBe(false)
    expect(JSON.stringify(bench.loop.document())).toBe(documentBefore)
  })
})
