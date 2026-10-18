// CR-796 spec-only reader: the English (`en`) of the manuscripts the MCP descriptions are printed from (design-mcp-relay.md 3.1).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE = join(process.cwd(), 'docs', 'spec', '_source')

interface Cell {
  readonly ja?: string | readonly string[]
  readonly en?: string | readonly string[]
}

interface ManuscriptKey {
  readonly name: string
  readonly meaning: Cell
}

interface ManuscriptMember {
  readonly id: string
  readonly name: string
  readonly carries: Cell
  readonly arguments: readonly ManuscriptKey[]
  readonly mcpOnlyKeys?: readonly ManuscriptKey[]
}

interface ManuscriptCommand {
  readonly id: string
  readonly name: string
  readonly carries: Cell
}

// WHY: the generator joins the lines of an `en` cell with newlines after trimming each line and the whole.
export const englishOf = (cell: Cell): string => {
  const lines = typeof cell.en === 'string' ? [cell.en] : [...(cell.en ?? [])]
  return lines.map((line) => line.trim()).join('\n').trim()
}

export const englishLinesOf = (cell: Cell): string[] =>
  (typeof cell.en === 'string' ? [cell.en] : [...(cell.en ?? [])]).map((line) => line.trim())

const read = <T>(file: string): T => JSON.parse(readFileSync(join(SOURCE, file), 'utf8')) as T

export const manuscriptMembers = (): readonly ManuscriptMember[] =>
  read<{ members: { rows: ManuscriptMember[] } }>('agent-api-members.json').members.rows

export const manuscriptMember = (name: string): ManuscriptMember => {
  const found = manuscriptMembers().find((one) => one.name === name)
  if (found === undefined) throw new Error(`the manuscript has no member ${name}`)
  return found
}

// WHY: a key of an MCP tool is an argument or, for a member with MCP-only keys, one of those (AG-12 (5)).
export const keyMeaningEnglish = (member: string, key: string): string => {
  const row = manuscriptMember(member)
  const found = [...row.arguments, ...(row.mcpOnlyKeys ?? [])].find((one) => one.name === key)
  if (found === undefined) throw new Error(`the manuscript has no key ${key} of ${member}`)
  return englishOf(found.meaning)
}

export const manuscriptCommands = (): readonly ManuscriptCommand[] =>
  read<{ rows: ManuscriptCommand[] }>('document-commands.json').rows

export const commandEnglish = (name: string): string => {
  const found = manuscriptCommands().find((one) => one.name === name)
  if (found === undefined) throw new Error(`the manuscript has no command ${name}`)
  return englishOf(found.carries)
}
