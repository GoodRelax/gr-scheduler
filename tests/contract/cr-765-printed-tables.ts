// CR-765 spec-only reader: tables T-107 and T-400 as _assets/tbl-agent-api-members.md prints them, one parsed row per line.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PRINTED = join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-agent-api-members.md')

export const PRINTED_TEXT: string = readFileSync(PRINTED, 'utf8').replace(/\r\n/g, '\n')

export const T_107_HEADINGS = ['行 ID', '群', '確定名', '品詞と純粋性', '引数', '戻り値', '何を担うか', '正'] as const
export const T_400_HEADINGS = ['行 ID', '型の名', '欄', '正'] as const

const MCP_ONLY_LABEL = '⚠️ MCP だけの鍵'
const LINE_BREAK = /<br\s*\/?>/gi
const ARGUMENT_LINE = /^(?:⚠️ MCP だけの鍵 )?`([A-Za-z_$][\w$]*)`: (.+?) —— (.*)$/
const CODE_SPAN = /`([^`]+)`/g
const PARENTHETICAL = /（([^（）]*)）/g
const ROW_ID_IN_CODE = /`([A-Z]{1,4}-\d+[a-z]?)`/g
const TABLE_ID = /T-\d+[a-z]?/g
const BUILT_IN_WORDS = new Set([
  'readonly',
  'null',
  'undefined',
  'string',
  'number',
  'boolean',
  'true',
  'false',
  'Promise',
  'Uint8Array',
])

export interface PrintedArgument {
  readonly name: string
  readonly typeText: string
  readonly pointsAt: readonly string[]
  readonly meaning: string
  readonly isMcpOnly: boolean
}

export interface PrintedMember {
  readonly id: string
  readonly group: string
  readonly name: string
  readonly kindCell: string
  readonly isProperty: boolean
  readonly purity: string
  readonly argumentsCell: string
  readonly arguments: readonly PrintedArgument[]
  readonly returnsCell: string
  readonly returnsType: string
  readonly returnsPointsAt: readonly string[]
  readonly carries: string
  readonly sourceCell: string
}

export interface PrintedValueType {
  readonly id: string
  readonly typeName: string
  readonly bareName: string
  readonly fieldsCell: string
  readonly sourceCell: string
}

export interface PrintedMemberTable {
  readonly caption: string
  readonly headings: readonly string[]
  readonly members: readonly PrintedMember[]
}

export interface PrintedValueTable {
  readonly caption: string
  readonly headings: readonly string[]
  readonly values: readonly PrintedValueType[]
}

const rawCells = (line: string): string[] =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())

const isSeparator = (line: string): boolean => /^\|[\s:|-]+\|$/.test(line.trim())

const codeSpansOf = (text: string): string[] => [...text.matchAll(CODE_SPAN)].map((found) => found[1] ?? '')

const parenthesesOf = (text: string): string[] => [...text.matchAll(PARENTHETICAL)].map((found) => found[1] ?? '')

const withoutParentheses = (text: string): string => text.replace(PARENTHETICAL, '')

const pointsAtOf = (parentheses: readonly string[]): string[] =>
  parentheses.flatMap((inside) => [
    ...[...inside.matchAll(ROW_ID_IN_CODE)].map((found) => found[1] ?? ''),
    ...(inside.match(TABLE_ID) ?? []),
  ])

interface RawTable {
  readonly caption: string
  readonly headings: readonly string[]
  readonly rows: readonly (readonly string[])[]
}

function rawTable(id: string): RawTable {
  const lines = PRINTED_TEXT.split('\n')
  const at = lines.findIndex((line) => line.startsWith('**表 ' + id + ' '))
  if (at < 0) throw new Error(`${id} is not printed in tbl-agent-api-members.md`)
  const body: string[] = []
  for (const line of lines.slice(at + 1)) {
    if (line.trim().startsWith('|')) body.push(line)
    else if (body.length > 0) break
  }
  const [head, separator, ...rest] = body
  if (head === undefined || !isSeparator(separator ?? '')) throw new Error(`${id} has no heading and separator rows`)
  return { caption: lines[at] ?? '', headings: rawCells(head), rows: rest.map(rawCells) }
}

function argumentOf(line: string): PrintedArgument {
  const found = ARGUMENT_LINE.exec(line.trim())
  if (found === null) throw new Error(`an argument line of T-107 does not read "name: type -- meaning": ${line}`)
  const typeAndPointer = found[2] ?? ''
  return {
    name: found[1] ?? '',
    typeText: codeSpansOf(withoutParentheses(typeAndPointer)).join(' | '),
    pointsAt: pointsAtOf(parenthesesOf(typeAndPointer)),
    meaning: found[3] ?? '',
    isMcpOnly: line.trim().startsWith(MCP_ONLY_LABEL),
  }
}

function memberOf(cells: readonly string[]): PrintedMember {
  const [id = '', group = '', name = '', kindCell = '', argumentsCell = '', returnsCell = '', carries = '', sourceCell = ''] =
    cells
  const lines = argumentsCell === '—' ? [] : argumentsCell.split(LINE_BREAK)
  return {
    id,
    group,
    name: name.replace(/`/g, ''),
    kindCell,
    isProperty: kindCell.startsWith('プロパティ'),
    purity: codeSpansOf(kindCell)[0] ?? '',
    argumentsCell,
    arguments: lines.map(argumentOf),
    returnsCell,
    returnsType: codeSpansOf(withoutParentheses(returnsCell))[0] ?? '',
    returnsPointsAt: pointsAtOf(parenthesesOf(returnsCell)),
    carries: carries.split(LINE_BREAK).join('\n').trim(),
    sourceCell,
  }
}

export function printedMembers(): PrintedMemberTable {
  const table = rawTable('T-107')
  return { caption: table.caption, headings: table.headings, members: table.rows.map(memberOf) }
}

export function printedValueTypes(): PrintedValueTable {
  const table = rawTable('T-400')
  return {
    caption: table.caption,
    headings: table.headings,
    values: table.rows.map((cells): PrintedValueType => {
      const typeName = (cells[1] ?? '').replace(/`/g, '')
      return {
        id: cells[0] ?? '',
        typeName,
        bareName: typeName.replace(/<.*>$/, ''),
        fieldsCell: cells[2] ?? '',
        sourceCell: cells[3] ?? '',
      }
    }),
  }
}

export const namedTypesOf = (typeText: string): string[] =>
  // WHY: a quoted literal such as 'text' is a value, not a named type (AV-17)
  (typeText.replace(/'[^']*'/g, '').match(/[A-Za-z_$][\w$]*/g) ?? []).filter((word) => !BUILT_IN_WORDS.has(word))

export const valueRowsPointedAt = (text: string): string[] =>
  [...text.matchAll(/`(AV-\d+)`/g)].map((found) => found[1] ?? '')

export const pointersIn = (text: string): string[] => pointsAtOf(parenthesesOf(text))

export function quotedReasonsOf(fieldsCell: string): string[] {
  return fieldsCell.split(LINE_BREAK).flatMap((line) => {
    const found = /^`'([A-Za-z]+)'`/.exec(line.trim())
    return found?.[1] === undefined ? [] : [found[1]]
  })
}

export function fieldAlternativesOf(fieldsCell: string): string[][] {
  const groups: string[][] = [[]]
  for (const line of fieldsCell.split(LINE_BREAK)) {
    const text = line.trim()
    if (text.startsWith('**')) {
      if ((groups[groups.length - 1] ?? []).length > 0) groups.push([])
      continue
    }
    const field = /^`([A-Za-z_$][\w$]*)(?:\(\))?`:/.exec(text)
    if (field?.[1] !== undefined) groups[groups.length - 1]?.push(field[1])
  }
  return groups.filter((group) => group.length > 0)
}

export interface TypedLine {
  readonly named: readonly string[]
  readonly pointsAt: readonly string[]
}

export function typedLinesOf(fieldsCell: string): TypedLine[] {
  return fieldsCell.split(LINE_BREAK).flatMap((line): TypedLine[] => {
    const text = line.replace(/\s+/g, ' ').trim()
    const field = /^`[A-Za-z_$][\w$]*(?:\(\))?`: (.+?)(?: —— .*)?$/.exec(text)
    const bare = /^(`[A-Z][\w$<>]*`(?:（[^）]*）)?)(?: —— .*)?$/.exec(text)
    const written = field?.[1] ?? bare?.[1]
    if (written === undefined) return []
    return [
      {
        named: namedTypesOf(codeSpansOf(withoutParentheses(written)).join(' | ')),
        pointsAt: pointersIn(written),
      },
    ]
  })
}
