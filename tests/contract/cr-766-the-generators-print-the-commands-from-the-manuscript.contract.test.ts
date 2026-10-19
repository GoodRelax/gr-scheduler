// CR-766 spec-only tests: the command unions, table T-108 and the AM-7 input are printed from one manuscript and go red when they part.

import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, describe, expect, it, vi } from 'vitest'

const GENERATOR_RUN_TIMEOUT_MS = 20_000
vi.setConfig({ testTimeout: GENERATOR_RUN_TIMEOUT_MS })

const ROOT = process.cwd()

const MANUSCRIPT = 'docs/spec/_source/document-commands.json'
const SOURCE_DIR = 'docs/spec/_source'
const PRINTED = 'docs/spec/_assets/tbl-document-commands.md'
const UNIT_DIR = 'src/use-case/edit-document'
const TASK_UNIT = 'src/use-case/edit-document/edit-task.ts'
const CALENDAR_UNIT = 'src/use-case/edit-document/edit-calendar.ts'
const DESCRIPTIONS = 'src/adapter/mcp-tool-translator/mcp-tool-descriptions.json'
const GENERATOR = 'tools/generate_document_commands.py'
const DESCRIPTION_GENERATOR = 'tools/generate_mcp_tool_descriptions.py'
const AGENT_GENERATOR = 'tools/generate_agent_api.py'
const TABLE_PRINTER = 'docs/spec/_source/document_commands_json_to_md.py'

// WHY: the generator also writes the one-line letters of a length (TX-10) into these two units outside UNIT_DIR.
const LENGTH_LETTER_UNITS = ['src/entity/layout-engine/schedule-layout/name-label.ts', 'src/adapter/screen-renderer/properties-panel.ts']

// WHY: the generator also prints each command's shape into the codec's schema walker, through its printer (DFC-2856).
const SHAPE_UNIT = 'src/adapter/document-codec/grs-json-schema.ts'
const SHAPE_PRINTER = 'tools/generate_json_schema_validator.py'
const COPIED = [
  SOURCE_DIR, PRINTED, UNIT_DIR, ...LENGTH_LETTER_UNITS, DESCRIPTIONS, GENERATOR, DESCRIPTION_GENERATOR, AGENT_GENERATOR,
  SHAPE_UNIT, SHAPE_PRINTER,
]

interface Value {
  name?: string
  column?: string
  key?: string
}

interface Row {
  id: string
  name: string
  agent?: boolean
  values: Value[]
}

interface Manuscript {
  rows: Row[]
}

interface Ran {
  readonly status: number | null
  readonly out: string
}

const scratches: string[] = []

const python = (cwd: string, args: readonly string[]): Ran => {
  const ran = spawnSync('python', [...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  })
  expect(ran.error, 'python could not be started').toBeUndefined()
  return { status: ran.status, out: `${ran.stdout}${ran.stderr}` }
}

const check = (cwd: string, script: string): Ran => python(cwd, [join(cwd, script), '--check'])

// WHY: the seams are called the way a generator calls them, with tools/ and _source/ on the path of the copy.
const seam = (cwd: string, body: string): Ran =>
  python(cwd, [
    '-c',
    [
      'import json, sys',
      "sys.path.insert(0, 'tools')",
      "sys.path.insert(0, 'docs/spec/_source')",
      'import document_commands_json_to_md as printer',
      'import generate_document_commands as generator',
      body,
    ].join('\n'),
  ])

const scratchCopy = (): string => {
  const copy = mkdtempSync(join(tmpdir(), 'cr766-scratch-'))
  scratches.push(copy)
  for (const rel of COPIED) {
    mkdirSync(dirname(join(copy, rel)), { recursive: true })
    cpSync(join(ROOT, rel), join(copy, rel), { recursive: true })
  }
  return copy
}

const editManuscript = (copy: string, edit: (manuscript: Manuscript) => void): void => {
  const path = join(copy, MANUSCRIPT)
  const manuscript = JSON.parse(readFileSync(path, 'utf8')) as Manuscript
  edit(manuscript)
  writeFileSync(path, JSON.stringify(manuscript, null, 1), 'utf8')
}

const valueOf = (manuscript: Manuscript, id: string, name: string): Value => {
  const found = manuscript.rows.find((row) => row.id === id)?.values.find((value) => value.name === name)
  if (found === undefined) throw new Error(`the manuscript has no value ${name} on ${id}`)
  return found
}

// WHY: a row number far past every row the file holds, so the planted pointer names no row.
const unheldRow = (prefix: string, file: string): string => {
  const rowLine = new RegExp('^\\| ' + prefix + '-(\\d+) ', 'gm')
  const numbers = [...readFileSync(join(ROOT, file), 'utf8').matchAll(rowLine)].map((found) => Number(found[1]))
  return `${prefix}-${Math.max(...numbers) * 10}`
}

afterAll(() => {
  for (const copy of scratches) rmSync(copy, { recursive: true, force: true })
})

describe('on the tree: the units, the printed table and the MCP input all match the manuscript', () => {
  it('generate_document_commands.py --check exits 0 and says the unit regions match', () => {
    const ran = check(ROOT, GENERATOR)
    expect(ran, ran.out).toMatchObject({ status: 0 })
    expect(ran.out).toContain('OK')
  })

  it('the printer of table T-108 exits 0 on --check and counts 93 commands', () => {
    const ran = check(ROOT, TABLE_PRINTER)
    expect(ran, ran.out).toMatchObject({ status: 0 })
    expect(ran.out).toContain('93 command(s)')
  })

  it('generate_mcp_tool_descriptions.py --check exits 0', () => {
    const ran = check(ROOT, DESCRIPTION_GENERATOR)
    expect(ran, ran.out).toMatchObject({ status: 0 })
  })
})

describe('the seams: load_valid, command_schemas and with_command_shapes', () => {
  it('load_valid() reads the manuscript of the tree as valid, 93 rows', () => {
    const ran = seam(ROOT, 'doc, columns = printer.load_valid()\nprint(len(doc["rows"]) if doc else columns)')
    expect(ran, ran.out).toMatchObject({ status: 0 })
    expect(ran.out.trim()).toBe('93')
  })

  it('command_schemas() gives 93 alternatives: every command but CM-76, setDependencyLag twice', () => {
    const ran = seam(
      ROOT,
      [
        'doc, columns = printer.load_valid()',
        'schema = generator.document_schema()',
        'kinds = [one["properties"]["kind"]["const"] for one in generator.command_schemas(doc, columns, schema)]',
        'print(json.dumps([len(kinds), kinds.count("setDependencyLag"), "setTaskGroupEditPermission" in kinds]))',
      ].join('\n'),
    )
    expect(ran, ran.out).toMatchObject({ status: 0 })
    expect(JSON.parse(ran.out.trim())).toEqual([93, 2, false])
  })

  it('with_command_shapes() leaves the input of a member that takes no write request as it was', () => {
    const ran = seam(
      ROOT,
      [
        "given = {'type': 'object', 'properties': {'uid': {'type': 'integer'}}}",
        "member = {'arguments': [{'name': 'uid', 'type': 'number'}]}",
        'print(json.dumps(generator.with_command_shapes(given, member, {}) == given))',
      ].join('\n'),
    )
    expect(ran, ran.out).toMatchObject({ status: 0 })
    expect(ran.out.trim()).toBe('true')
  })
})

describe('on a scratch copy outside the repository: an untouched copy is green, a planted change goes red', () => {
  it('control: the untouched copy exits 0 for the generator, the printer and the MCP descriptions', () => {
    const copy = scratchCopy()
    for (const script of [GENERATOR, TABLE_PRINTER, DESCRIPTION_GENERATOR]) {
      const ran = check(copy, script)
      expect(ran, `${script}: ${ran.out}`).toMatchObject({ status: 0 })
    }
  })

  it('renaming the fadeInDays value of CM-16 to days leaves TaskCommand drifted, and no other unit', () => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      valueOf(manuscript, 'CM-16', 'fadeInDays').name = 'days'
    })
    const ran = check(copy, GENERATOR)
    expect(ran.status).toBe(1)
    expect(ran.out).toContain(TASK_UNIT)
    expect(ran.out).not.toContain(CALENDAR_UNIT)
  })

  it('the same rename leaves the printed table T-108 drifted', () => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      valueOf(manuscript, 'CM-16', 'fadeInDays').name = 'days'
    })
    const ran = check(copy, TABLE_PRINTER)
    expect(ran.status).toBe(1)
    expect(ran.out).toContain('tbl-document-commands.md')
  })

  // see AM-7, AG-12
  // WHY: the keys of a command are no longer in the MCP tool input; they moved into grs-commands.schema.json, which the command generator checks.
  it('the same rename no longer reaches the MCP tool descriptions but leaves grs-commands.schema.json drifted', () => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      valueOf(manuscript, 'CM-16', 'fadeInDays').name = 'days'
    })
    expect(check(copy, DESCRIPTION_GENERATOR).status).toBe(0)
    const ran = check(copy, GENERATOR)
    expect(ran.status).toBe(1)
    expect(ran.out).toContain('grs-commands.schema.json')
  })

  it('renaming the kind of a command leaves the MCP tool descriptions drifted, the kind enum being in them', () => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      const row = manuscript.rows.find((one) => one.id === 'CM-16')
      if (row === undefined) throw new Error('the manuscript has no CM-16')
      row.name = 'setTaskFadeInDaysRenamed'
    })
    const ran = check(copy, DESCRIPTION_GENERATOR)
    expect(ran.status).toBe(1)
    expect(ran.out).toContain(DESCRIPTIONS)
  })

  it('the generator writes the rename into TaskCommand, and its check is green again', () => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      valueOf(manuscript, 'CM-16', 'fadeInDays').name = 'days'
    })
    const wrote = python(copy, [join(copy, GENERATOR)])
    expect(wrote, wrote.out).toMatchObject({ status: 0 })
    const unit = readFileSync(join(copy, TASK_UNIT), 'utf8')
    expect(unit).toContain("readonly kind: 'setTaskFadeInDays'; readonly taskUid: Task['uid']; readonly days: Task['fadeInDays']")
    expect(check(copy, GENERATOR).status).toBe(0)
  })

  it.each([
    ['an AT- row erd.json does not hold', unheldRow('AT', 'docs/spec/_assets/fig-erd-detail.md')],
    ['an S- row tables T-202 / T-203 do not hold', unheldRow('S', 'docs/spec/_assets/tbl-settings.md')],
  ])('a value that points at %s is refused by load_valid, and nothing is printed from it', (_label, row) => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      valueOf(manuscript, 'CM-16', 'fadeInDays').column = row
    })
    const loaded = seam(copy, 'doc, found = printer.load_valid()\nprint(doc is None)\nprint("\\n".join(found or []))')
    expect(loaded, loaded.out).toMatchObject({ status: 0 })
    expect(loaded.out).toMatch(/^True/)
    expect(loaded.out).toContain(row)
    const ran = check(copy, GENERATOR)
    expect(ran.status).toBe(1)
    expect(ran.out).toContain('not valid')
  })

  it('a row the manuscript holds from the Agent API drops out of the MCP alternatives', () => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      const row = manuscript.rows.find((one) => one.id === 'CM-9')
      if (row === undefined) throw new Error('the manuscript has no CM-9')
      row.agent = false
    })
    const ran = seam(
      copy,
      [
        'doc, columns = printer.load_valid()',
        'kinds = [one["properties"]["kind"]["const"] for one in generator.command_schemas(doc, columns, generator.document_schema())]',
        'print(json.dumps([len(kinds), "setTaskName" in kinds]))',
      ].join('\n'),
    )
    expect(ran, ran.out).toMatchObject({ status: 0 })
    expect(JSON.parse(ran.out.trim())).toEqual([92, false])
  })
})
