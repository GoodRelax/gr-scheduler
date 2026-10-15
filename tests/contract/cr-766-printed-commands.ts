// CR-766 spec-only reader: table T-108 as _assets/tbl-document-commands.md prints it, one parsed row per line.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PRINTED = join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-document-commands.md')

export const PRINTED_TEXT: string = readFileSync(PRINTED, 'utf8').replace(/\r\n/g, '\n')

export const T_108_HEADINGS = ['行 ID', '群', '確定名', '組', '運ぶ値', '何を担うか', '正'] as const

const LINE_BREAK = /<br\s*\/?>/gi
const INDENT = '　　'
const VALUE_LINE = /^`([A-Za-z_$][\w$]*)`: (.*)$/
const VARIANT_LINE = /^`([A-Za-z_$][\w$]*)` が `'([^']+)'`:?$/
const SHAPE_LINE = /^`([A-Z][\w$]*)`:$/
const CHOICE_LINE = /^次の形のどちらか —— (.*)$/
const KEY_TEXT = /^鍵(の並び)?（`([\w.]+)`、`(AT-\d+)`）/
const COLUMN_TEXT = /^`([\w.]+)`（`((?:AT|S)-\d+)`）(の並び)?を書く/
const MEANING_MARK = ' —— '

export type ValueRole = 'key' | 'column' | 'own'

export interface PrintedValue {
  readonly name: string
  readonly text: string
  readonly head: string
  readonly role: ValueRole
  readonly pointer: string | null
  readonly writes: string | null
  readonly many: boolean
  readonly optional: boolean
  readonly nonNull: boolean
  readonly fields: readonly PrintedValue[]
  readonly variants: readonly PrintedVariant[]
}

export interface PrintedVariant {
  readonly discriminant: string
  readonly tag: string
  readonly fields: readonly PrintedValue[]
}

export interface PrintedShapeChoice {
  readonly meaning: string
  readonly shapes: readonly { readonly name: string; readonly fields: readonly PrintedValue[] }[]
}

export interface PrintedCommand {
  readonly id: string
  readonly group: string
  readonly name: string
  readonly bundleCell: string
  readonly valuesCell: string
  readonly values: readonly PrintedValue[]
  readonly choice: PrintedShapeChoice | null
  readonly notes: readonly string[]
  readonly carriesCell: string
  readonly carries: string
  readonly sourceCell: string
}

interface Line {
  readonly depth: number
  readonly text: string
}

const rawCells = (line: string): string[] =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())

const isSeparator = (line: string): boolean => /^\|[\s:|-]+\|$/.test(line.trim())

function linesOf(cell: string): Line[] {
  if (cell === '—') return []
  return cell.split(LINE_BREAK).map((raw) => {
    let depth = 0
    let text = raw
    while (text.startsWith(INDENT)) {
      depth += 1
      text = text.slice(INDENT.length)
    }
    return { depth, text: text.trim() }
  })
}

// WHY: a line's children are the lines after it that sit deeper, up to the next line at its own depth or shallower.
function childrenOf(lines: readonly Line[], at: number): Line[] {
  const own = lines[at]?.depth ?? 0
  const out: Line[] = []
  for (const line of lines.slice(at + 1)) {
    if (line.depth <= own) break
    out.push(line)
  }
  return out
}

function valuesOf(lines: readonly Line[], depth: number): PrintedValue[] {
  const out: PrintedValue[] = []
  lines.forEach((line, at) => {
    if (line.depth !== depth) return
    const found = VALUE_LINE.exec(line.text)
    if (found === null) return
    out.push(valueOf(found[1] ?? '', found[2] ?? '', childrenOf(lines, at), depth))
  })
  return out
}

function variantsOf(lines: readonly Line[], depth: number): PrintedVariant[] {
  const out: PrintedVariant[] = []
  lines.forEach((line, at) => {
    if (line.depth !== depth) return
    const found = VARIANT_LINE.exec(line.text)
    if (found === null) return
    out.push({ discriminant: found[1] ?? '', tag: found[2] ?? '', fields: valuesOf(childrenOf(lines, at), depth + 1) })
  })
  return out
}

function valueOf(name: string, text: string, children: readonly Line[], depth: number): PrintedValue {
  const head = text.split(MEANING_MARK)[0] ?? text
  const key = KEY_TEXT.exec(text)
  const column = COLUMN_TEXT.exec(text)
  const role: ValueRole = key !== null ? 'key' : column !== null ? 'column' : 'own'
  return {
    name,
    text,
    head,
    role,
    pointer: key?.[3] ?? column?.[2] ?? null,
    writes: key?.[2] ?? column?.[1] ?? null,
    many: key !== null ? key[1] !== undefined : column !== null ? column[3] !== undefined : false,
    optional: head.includes('省いてよい'),
    nonNull: head.includes('`null` は受けない'),
    fields: valuesOf(children, depth + 1),
    variants: variantsOf(children, depth + 1),
  }
}

function choiceOf(lines: readonly Line[]): PrintedShapeChoice | null {
  const at = lines.findIndex((line) => line.depth === 0 && CHOICE_LINE.test(line.text))
  if (at < 0) return null
  const children = childrenOf(lines, at)
  const shapes: { name: string; fields: PrintedValue[] }[] = []
  children.forEach((line, index) => {
    if (line.depth !== 1) return
    const found = SHAPE_LINE.exec(line.text)
    if (found === null) return
    shapes.push({ name: found[1] ?? '', fields: valuesOf(childrenOf(children, index), 2) })
  })
  return { meaning: CHOICE_LINE.exec(lines[at]?.text ?? '')?.[1] ?? '', shapes }
}

function commandOf(cells: readonly string[]): PrintedCommand {
  const [id = '', group = '', name = '', bundleCell = '', valuesCell = '', carriesCell = '', sourceCell = ''] = cells
  const lines = linesOf(valuesCell)
  return {
    id,
    group,
    name: name.replace(/`/g, ''),
    bundleCell,
    valuesCell,
    values: valuesOf(lines, 0),
    choice: choiceOf(lines),
    notes: lines.filter((line) => line.depth === 0 && line.text.startsWith('⚠️')).map((line) => line.text),
    carriesCell,
    carries: carriesCell.split(LINE_BREAK).join('\n').trim(),
    sourceCell,
  }
}

export interface PrintedCommandTable {
  readonly caption: string
  readonly headings: readonly string[]
  readonly commands: readonly PrintedCommand[]
}

export function printedCommands(): PrintedCommandTable {
  const lines = PRINTED_TEXT.split('\n')
  const at = lines.findIndex((line) => line.startsWith('**表 T-108 '))
  if (at < 0) throw new Error('T-108 is not printed in tbl-document-commands.md')
  const body: string[] = []
  for (const line of lines.slice(at + 1)) {
    if (line.trim().startsWith('|')) body.push(line)
    else if (body.length > 0) break
  }
  const [head, separator, ...rest] = body
  if (head === undefined || !isSeparator(separator ?? '')) throw new Error('T-108 has no heading and separator rows')
  return { caption: lines[at] ?? '', headings: rawCells(head), commands: rest.map((line) => commandOf(rawCells(line))) }
}

// WHY: the carried values of one command as a reader counts them -- each named value, and a choice of shapes as one.
export const carriedCountOf = (command: PrintedCommand): number => command.values.length + (command.choice === null ? 0 : 1)

// WHY: the shapes the table names -- a value typed by a backticked capitalised name, a nested one, or a choice.
export function shapeNamesOf(commands: readonly PrintedCommand[]): string[] {
  const found = new Set<string>()
  const visit = (value: PrintedValue): void => {
    const typed = /^`([A-Z][A-Za-z]+)`/.exec(value.head)
    if (typed?.[1] !== undefined && value.role === 'own' && (value.fields.length > 0 || value.variants.length > 0)) {
      found.add(typed[1])
    }
    value.fields.forEach(visit)
    value.variants.forEach((variant) => variant.fields.forEach(visit))
  }
  for (const command of commands) {
    command.values.forEach(visit)
    for (const shape of command.choice?.shapes ?? []) {
      found.add(shape.name)
      shape.fields.forEach(visit)
    }
  }
  return [...found].sort()
}

// WHY: the CM- rows a command does not offer the Agent API -- the table says it is not implemented and refused.
export const isUnimplemented = (command: PrintedCommand): boolean =>
  command.notes.some((note) => note.includes('まだ実装していない'))
