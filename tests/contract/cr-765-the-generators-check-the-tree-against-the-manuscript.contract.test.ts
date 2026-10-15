// CR-765 spec-only tests: the generators of table T-107 print the code from one manuscript and go red when the two part.

import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

const ROOT = process.cwd()

const MANUSCRIPT = 'docs/spec/_source/agent-api-members.json'
const MEMBERS_UNIT = 'src/adapter/agent-api-endpoint/agent-api-members.ts'
const RELAYED_UNIT = 'src/adapter/agent-api-endpoint/relayed-call.ts'
const RELAY_UNIT = 'src/framework/mcp-relay-server/mcp-relay-server.ts'
const DESCRIPTIONS = 'src/adapter/mcp-tool-translator/mcp-tool-descriptions.json'
const GENERATOR = 'tools/generate_agent_api.py'
const DESCRIPTION_GENERATOR = 'tools/generate_mcp_tool_descriptions.py'
const TABLE_PRINTER = 'docs/spec/_source/agent_api_members_json_to_md.py'

// WHY: the description generator imports the command generator (CR-766), which reads the whole _source folder.
const SOURCE_DIR = 'docs/spec/_source'
const COMMAND_GENERATOR = 'tools/generate_document_commands.py'

const COPIED = [SOURCE_DIR, MEMBERS_UNIT, RELAYED_UNIT, RELAY_UNIT, DESCRIPTIONS, GENERATOR, DESCRIPTION_GENERATOR, COMMAND_GENERATOR]

interface Member {
  id: string
  arguments: { name: string; meaning: { ja: string } }[]
  mcpOnlyKeys?: { name: string; meaning: { ja: string } }[]
}

interface Manuscript {
  version: number
  members: { rows: Member[] }
}

interface Ran {
  readonly status: number | null
  readonly out: string
}

const scratches: string[] = []

const run = (cwd: string, script: string): Ran => {
  const ran = spawnSync('python', [join(cwd, script), '--check'], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  })
  expect(ran.error, 'python could not be started').toBeUndefined()
  return { status: ran.status, out: `${ran.stdout}${ran.stderr}` }
}

const scratchCopy = (): string => {
  const copy = mkdtempSync(join(tmpdir(), 'cr765-scratch-'))
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

const memberOf = (manuscript: Manuscript, id: string): Member => {
  const found = manuscript.members.rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`the manuscript has no member ${id}`)
  return found
}

afterAll(() => {
  for (const copy of scratches) rmSync(copy, { recursive: true, force: true })
})

describe('on the tree: the code, the tool descriptions and the printed table all match the manuscript', () => {
  it('generate_agent_api.py --check exits 0 and says the regions match', () => {
    const ran = run(ROOT, GENERATOR)
    expect(ran, ran.out).toMatchObject({ status: 0 })
    expect(ran.out).toContain('OK')
  })

  it('generate_mcp_tool_descriptions.py --check exits 0', () => {
    const ran = run(ROOT, DESCRIPTION_GENERATOR)
    expect(ran, ran.out).toMatchObject({ status: 0 })
  })

  it('the printer of tables T-107 and T-400 exits 0 on --check', () => {
    const ran = run(ROOT, TABLE_PRINTER)
    expect(ran, ran.out).toMatchObject({ status: 0 })
  })
})

describe('on a scratch copy outside the repository: an untouched copy is green, a planted change goes red', () => {
  it('control: the untouched copy exits 0', () => {
    const ran = run(scratchCopy(), GENERATOR)
    expect(ran, ran.out).toMatchObject({ status: 0 })
  })

  it('renaming the argument of readSearchRows in the manuscript leaves the AgentApi type and RelayedParams drifted', () => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      const argument = memberOf(manuscript, 'AM-25').arguments[0]
      if (argument === undefined) throw new Error('AM-25 has no argument')
      argument.name = 'words'
    })
    const ran = run(copy, GENERATOR)
    expect(ran.status).toBe(1)
    expect(ran.out).toContain(MEMBERS_UNIT)
    expect(ran.out).toContain(RELAYED_UNIT)
    expect(ran.out).not.toContain(RELAY_UNIT)
  })

  it('renaming the same argument also leaves the MCP tool descriptions drifted', () => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      const argument = memberOf(manuscript, 'AM-25').arguments[0]
      if (argument === undefined) throw new Error('AM-25 has no argument')
      argument.name = 'words'
    })
    const ran = run(copy, DESCRIPTION_GENERATOR)
    expect(ran.status).toBe(1)
    expect(ran.out).toContain(DESCRIPTIONS)
  })

  it('rewording what an argument means leaves the MCP tool descriptions drifted and the code alone', () => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      const argument = memberOf(manuscript, 'AM-25').arguments[0]
      if (argument === undefined) throw new Error('AM-25 has no argument')
      argument.meaning.ja = `${argument.meaning.ja} (planted)`
    })
    expect(run(copy, GENERATOR)).toMatchObject({ status: 0 })
    const ran = run(copy, DESCRIPTION_GENERATOR)
    expect(ran.status).toBe(1)
    expect(ran.out).toContain(DESCRIPTIONS)
  })

  it('renaming the MCP-only key of watchChanges leaves the relay server drifted', () => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      const key = memberOf(manuscript, 'AM-17').mcpOnlyKeys?.[0]
      if (key === undefined) throw new Error('AM-17 has no MCP-only key')
      key.name = 'waitMillis'
    })
    const ran = run(copy, GENERATOR)
    expect(ran.status).toBe(1)
    expect(ran.out).toContain(RELAY_UNIT)
  })

  it('raising the version of the manuscript leaves AGENT_API_VERSION drifted', () => {
    const copy = scratchCopy()
    editManuscript(copy, (manuscript) => {
      manuscript.version += 1
    })
    const ran = run(copy, GENERATOR)
    expect(ran.status).toBe(1)
    expect(ran.out).toContain(MEMBERS_UNIT)
  })

  it('a hand edit inside the generated region of the code is caught the same way', () => {
    const copy = scratchCopy()
    const unit = join(copy, MEMBERS_UNIT)
    const text = readFileSync(unit, 'utf8')
    expect(text).toContain('const AGENT_API_VERSION = 5')
    writeFileSync(unit, text.replace('const AGENT_API_VERSION = 5', 'const AGENT_API_VERSION = 6'), 'utf8')
    const ran = run(copy, GENERATOR)
    expect(ran.status).toBe(1)
    expect(ran.out).toContain(MEMBERS_UNIT)
  })
})
