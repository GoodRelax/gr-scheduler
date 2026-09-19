// Shared by the cr-429 cases: reads both MSPDI schemas at run time, judges written text, builds fixtures.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type SchemaVersion = 'pj12' | 'pj15'

export const MSPDI_URI = 'http://schemas.microsoft.com/project/2007'

const XSD_PATHS: Readonly<Record<SchemaVersion, string>> = {
  pj12: join(process.cwd(), 'docs', 'reference', 'mspdi', 'pj12', 'mspdi_pj12.xsd'),
  pj15: join(process.cwd(), 'docs', 'reference', 'mspdi', 'pj15', 'mspdi_pj15.xsd'),
}

export function xsdPathOf(version: SchemaVersion): string {
  return XSD_PATHS[version]
}

export interface XmlNode {
  readonly name: string
  readonly uri: string | null
  readonly attributes: Readonly<Record<string, string>>
  readonly text: string
  readonly children: readonly XmlNode[]
}

interface OpenNode {
  name: string
  uri: string | null
  attributes: Record<string, string>
  text: string
  children: OpenNode[]
  scope: Map<string, string>
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
}

export function parseXml(source: string): XmlNode {
  const cleaned = source.replace(/<!--[\s\S]*?-->/g, '')
  const open: OpenNode[] = []
  let root: OpenNode | null = null
  const tag = /<([^>]*)>/g
  let cursor = 0
  let hit: RegExpExecArray | null
  while ((hit = tag.exec(cleaned)) !== null) {
    const between = cleaned.slice(cursor, hit.index)
    cursor = tag.lastIndex
    const top = open[open.length - 1]
    if (top !== undefined) top.text += decodeEntities(between)
    const body = hit[1] ?? ''
    if (body.startsWith('?') || body.startsWith('!')) continue
    if (body.startsWith('/')) {
      open.pop()
      continue
    }
    const selfClosing = body.endsWith('/')
    const inner = selfClosing ? body.slice(0, -1) : body
    const qName = inner.trim().split(/\s+/)[0] ?? ''
    const attributes: Record<string, string> = {}
    const attribute = /([A-Za-z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g
    let found: RegExpExecArray | null
    while ((found = attribute.exec(inner)) !== null) {
      attributes[found[1] ?? ''] = decodeEntities(found[3] ?? found[4] ?? '')
    }
    const scope = new Map(top?.scope ?? [])
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'xmlns') scope.set('', value)
      else if (key.startsWith('xmlns:')) scope.set(key.slice('xmlns:'.length), value)
    }
    const colon = qName.indexOf(':')
    const prefix = colon < 0 ? '' : qName.slice(0, colon)
    const local = colon < 0 ? qName : qName.slice(colon + 1)
    const node: OpenNode = {
      name: local,
      uri: scope.get(prefix) ?? null,
      attributes,
      text: '',
      children: [],
      scope,
    }
    if (top !== undefined) top.children.push(node)
    else if (root === null) root = node
    if (!selfClosing) open.push(node)
  }
  if (root === null) throw new Error('the text has no root element')
  return root as XmlNode
}

export function childrenNamed(node: XmlNode, name: string): readonly XmlNode[] {
  return node.children.filter((each) => each.name === name)
}

export function nodeAt(node: XmlNode, path: string): XmlNode | null {
  let here: XmlNode | null = node
  for (const step of path.split('/')) {
    if (here === null) return null
    here = childrenNamed(here, step)[0] ?? null
  }
  return here
}

export function textAt(node: XmlNode, path: string): string | null {
  const found = nodeAt(node, path)
  return found === null ? null : found.text.trim()
}

export function pathsIn(node: XmlNode, path: string = node.name): readonly string[] {
  return [path, ...node.children.flatMap((child) => pathsIn(child, `${path}/${child.name}`))]
}

export interface SimpleContent {
  readonly kind: 'simple'
  readonly base: string
  readonly enumerations: readonly string[]
  readonly maxLength: number | null
}

export interface ComplexContent {
  readonly kind: 'sequence' | 'all'
  readonly children: readonly ElementDecl[]
}

export interface ElementDecl {
  readonly name: string
  readonly minOccurs: number
  readonly maxOccurs: number
  readonly content: SimpleContent | ComplexContent
}

export interface SchemaModel {
  readonly version: SchemaVersion
  readonly root: ElementDecl
  readonly byPath: ReadonlyMap<string, ElementDecl>
  readonly documentation: readonly string[]
}

function occurs(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  return value === 'unbounded' ? Number.POSITIVE_INFINITY : Number(value)
}

function childOf(node: XmlNode, name: string): XmlNode | null {
  return node.children.find((each) => each.name === name) ?? null
}

function simpleOf(node: XmlNode | null, base: string): SimpleContent {
  const restriction = node === null ? null : childOf(node, 'restriction')
  if (restriction === null) return { kind: 'simple', base, enumerations: [], maxLength: null }
  const facetBase = (restriction.attributes['base'] ?? `xsd:${base}`).replace(/^xsd:/, '')
  const enumerations = childrenNamed(restriction, 'enumeration').map((each) => each.attributes['value'] ?? '')
  const length = childOf(restriction, 'maxLength')
  return {
    kind: 'simple',
    base: facetBase,
    enumerations,
    maxLength: length === null ? null : Number(length.attributes['value']),
  }
}

function flattened(
  compositor: XmlNode,
  named: ReadonlyMap<string, XmlNode>,
  minFactor: number,
  maxFactor: number,
): ElementDecl[] {
  const min = minFactor * occurs(compositor.attributes['minOccurs'], 1)
  const max = maxFactor * occurs(compositor.attributes['maxOccurs'], 1)
  const alternatives = compositor.name === 'choice' ? compositor.children.length : 1
  return compositor.children.flatMap((child) => {
    if (child.name === 'element') {
      const own = declOf(child, named)
      const lowest = alternatives > 1 ? 0 : own.minOccurs * min
      return [{ ...own, minOccurs: lowest, maxOccurs: own.maxOccurs * max }]
    }
    if (child.name === 'sequence' || child.name === 'choice' || child.name === 'all') {
      return flattened(child, named, alternatives > 1 ? 0 : min, max)
    }
    return []
  })
}

function complexOf(complexType: XmlNode, named: ReadonlyMap<string, XmlNode>): ComplexContent {
  const compositor = complexType.children.find((each) =>
    ['sequence', 'all', 'choice'].includes(each.name),
  )
  if (compositor === undefined) return { kind: 'sequence', children: [] }
  return {
    kind: compositor.name === 'all' ? 'all' : 'sequence',
    children: flattened(compositor, named, 1, 1),
  }
}

function declOf(node: XmlNode, named: ReadonlyMap<string, XmlNode>): ElementDecl {
  const name = node.attributes['name'] ?? ''
  const minOccurs = occurs(node.attributes['minOccurs'], 1)
  const maxOccurs = occurs(node.attributes['maxOccurs'], 1)
  const typeName = node.attributes['type']
  if (typeName !== undefined && typeName.startsWith('xsd:')) {
    return { name, minOccurs, maxOccurs, content: simpleOf(null, typeName.slice(4)) }
  }
  if (typeName !== undefined) {
    const shared = named.get(typeName)
    if (shared === undefined) throw new Error(`the schema names an undeclared type ${typeName}`)
    return { name, minOccurs, maxOccurs, content: complexOf(shared, named) }
  }
  const complexType = childOf(node, 'complexType')
  if (complexType !== null) return { name, minOccurs, maxOccurs, content: complexOf(complexType, named) }
  return { name, minOccurs, maxOccurs, content: simpleOf(childOf(node, 'simpleType'), 'string') }
}

function indexed(decl: ElementDecl, path: string, into: Map<string, ElementDecl>): void {
  into.set(path, decl)
  if (decl.content.kind === 'simple') return
  for (const child of decl.content.children) indexed(child, `${path}/${child.name}`, into)
}

function documentationOf(node: XmlNode): string[] {
  const own = node.name === 'documentation' ? [node.text.trim()] : []
  return [...own, ...node.children.flatMap(documentationOf)]
}

const MODELS = new Map<SchemaVersion, SchemaModel>()

export function schemaModel(version: SchemaVersion): SchemaModel {
  const held = MODELS.get(version)
  if (held !== undefined) return held
  const schema = parseXml(readFileSync(XSD_PATHS[version], 'utf8'))
  const named = new Map<string, XmlNode>()
  for (const each of childrenNamed(schema, 'complexType')) {
    named.set(each.attributes['name'] ?? '', each)
  }
  const top = childrenNamed(schema, 'element').find((each) => each.attributes['name'] === 'Project')
  if (top === undefined) throw new Error(`${version} declares no Project element`)
  const root = declOf(top, named)
  const byPath = new Map<string, ElementDecl>()
  indexed(root, 'Project', byPath)
  const model: SchemaModel = { version, root, byPath, documentation: documentationOf(schema) }
  MODELS.set(version, model)
  return model
}

// see EX-1, AT-143
export function pj15OnlyPaths(): readonly string[] {
  const older = schemaModel('pj12').byPath
  return [...schemaModel('pj15').byPath.keys()].filter((path) => !older.has(path))
}

export function holdsPj15OnlyElement(root: XmlNode): boolean {
  const only = new Set(pj15OnlyPaths())
  return pathsIn(root).some((path) => only.has(path))
}

const DATE_TIME = /^-?\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/
const TIME = /^\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/
const DURATION = /^-?P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/

const LEXICAL: Readonly<Record<string, RegExp>> = {
  integer: /^[+-]?\d+$/,
  boolean: /^(true|false|1|0)$/,
  decimal: /^[+-]?(\d+(\.\d*)?|\.\d+)$/,
  float: /^([+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?|-?INF|NaN)$/,
  dateTime: DATE_TIME,
  time: TIME,
  duration: DURATION,
}

function valueFaults(node: XmlNode, content: SimpleContent, path: string): string[] {
  const raw = node.text
  const value = content.base === 'string' ? raw : raw.replace(/\s+/g, ' ').trim()
  const faults: string[] = []
  const lexical = LEXICAL[content.base]
  if (lexical !== undefined && !lexical.test(value)) {
    faults.push(`${path}: "${value}" is not an xsd:${content.base}`)
  }
  if (content.enumerations.length > 0 && !content.enumerations.includes(value)) {
    faults.push(`${path}: "${value}" is not one of the enumerated values`)
  }
  if (content.maxLength !== null && [...value].length > content.maxLength) {
    faults.push(`${path}: longer than ${content.maxLength}`)
  }
  return faults
}

function collapsed(names: readonly string[]): readonly string[] {
  return names.filter((name, index) => name !== names[index - 1])
}

function isSubsequence(part: readonly string[], whole: readonly string[]): boolean {
  let at = 0
  for (const name of part) {
    const found = whole.indexOf(name, at)
    if (found < 0) return false
    at = found + 1
  }
  return true
}

function complexFaults(
  node: XmlNode,
  content: ComplexContent,
  path: string,
  tolerated: ReadonlySet<string>,
): string[] {
  const faults: string[] = []
  if (node.text.trim() !== '') faults.push(`${path}: holds text among its elements`)
  const declared = new Map(content.children.map((each) => [each.name, each]))
  const known: XmlNode[] = []
  for (const child of node.children) {
    const decl = declared.get(child.name)
    if (decl === undefined) {
      if (!tolerated.has(child.name)) faults.push(`${path}/${child.name}: not declared here`)
      continue
    }
    known.push(child)
    faults.push(...elementFaults(child, decl, `${path}/${child.name}`, tolerated))
  }
  for (const decl of content.children) {
    const count = known.filter((each) => each.name === decl.name).length
    if (count < decl.minOccurs) faults.push(`${path}/${decl.name}: required, missing`)
    if (count > decl.maxOccurs) faults.push(`${path}/${decl.name}: ${count} written, at most ${decl.maxOccurs}`)
  }
  if (content.kind === 'sequence') {
    const order = content.children.map((each) => each.name)
    const written = collapsed(known.map((each) => each.name))
    if (!isSubsequence(written, order)) faults.push(`${path}: children out of order (${written.join(', ')})`)
  }
  return faults
}

function elementFaults(
  node: XmlNode,
  decl: ElementDecl,
  path: string,
  tolerated: ReadonlySet<string>,
): string[] {
  if (decl.content.kind === 'simple') {
    if (node.children.length > 0) return [`${path}: a leaf that holds elements`]
    return valueFaults(node, decl.content, path)
  }
  return complexFaults(node, decl.content, path, tolerated)
}

// see EX-1
// WHY: no XSD validator is a dependency, so structure, occurrence and the simple types are judged here.
export function schemaFaults(
  text: string,
  version: SchemaVersion,
  tolerated: readonly string[] = [],
): readonly string[] {
  const root = parseXml(text)
  const faults: string[] = []
  if (root.name !== 'Project') faults.push(`the root is ${root.name}, not Project`)
  if (root.uri !== MSPDI_URI) faults.push(`the root is in ${String(root.uri)}, not ${MSPDI_URI}`)
  return [...faults, ...elementFaults(root, schemaModel(version).root, 'Project', new Set(tolerated))]
}

function canonicalInteger(value: string): string {
  const match = /^([+-]?)0*(\d+)$/.exec(value)
  if (match === null) return value
  const digits = match[2] ?? '0'
  return match[1] === '-' && digits !== '0' ? `-${digits}` : digits
}

function canonicalDecimal(value: string): string {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(value)
  if (match === null) return value
  const whole = (match[2] ?? '').replace(/^0+/, '') || '0'
  const fraction = (match[3] ?? '').replace(/0+$/, '') || '0'
  const negative = match[1] === '-' && !(whole === '0' && fraction === '0')
  return `${negative ? '-' : ''}${whole}.${fraction}`
}

function canonicalFloat(value: string): string {
  if (value === 'INF' || value === '-INF' || value === 'NaN') return value
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value
  if (amount === 0) return '0.0E0'
  const [mantissa = '', exponent = '0'] = amount.toExponential().split('e')
  const withPoint = mantissa.includes('.') ? mantissa : `${mantissa}.0`
  return `${withPoint}E${Number(exponent)}`
}

function canonicalMoment(value: string): string {
  const match = /^(.*?)(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.exec(value)
  if (match === null) return value
  const fraction = (match[2] ?? '').replace(/0+$/, '')
  const zone = match[3] ?? ''
  const head = `${match[1] ?? ''}${fraction === '.' ? '' : fraction}`
  if (zone === '' || zone === 'Z') return `${head}${zone}`
  if (zone === '+00:00' || zone === '-00:00') return `${head}Z`
  return `${head}${zone}`
}

function durationAmount(value: string): string {
  const match = DURATION.exec(value)
  if (match === null || match[1] !== undefined || match[2] !== undefined) return value
  const number = (part: string | undefined): number => (part === undefined ? 0 : parseFloat(part))
  const seconds =
    number(match[3]) * 86400 + number(match[5]) * 3600 + number(match[6]) * 60 + number(match[7])
  return `amount:${value.startsWith('-') ? -seconds : seconds}`
}

function typedValue(value: string, decl: ElementDecl | undefined): string {
  if (decl === undefined || decl.content.kind !== 'simple') return value
  const collapsedValue = value.replace(/\s+/g, ' ').trim()
  switch (decl.content.base) {
    case 'integer':
      return canonicalInteger(collapsedValue)
    case 'boolean':
      return collapsedValue === '1' ? 'true' : collapsedValue === '0' ? 'false' : collapsedValue
    case 'decimal':
      return canonicalDecimal(collapsedValue)
    case 'float':
      return canonicalFloat(collapsedValue)
    case 'dateTime':
    case 'time':
      return canonicalMoment(collapsedValue)
    case 'duration':
      return durationAmount(collapsedValue)
    default:
      return value
  }
}

export interface Normalized {
  readonly name: string
  readonly uri: string | null
  readonly attributes: readonly (readonly [string, string])[]
  readonly text: string | null
  readonly groups: readonly (readonly [string, readonly Normalized[]])[]
}

function normalizedNode(node: XmlNode, path: string, keepOrder: boolean): Normalized {
  const decl = schemaModel('pj15').byPath.get(path)
  const attributes = Object.entries(node.attributes)
    .filter(([key]) => key !== 'xmlns' && !key.startsWith('xmlns:'))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  if (node.children.length === 0) {
    return { name: node.name, uri: node.uri, attributes, text: typedValue(node.text, decl), groups: [] }
  }
  const children = node.children.map((child) => normalizedNode(child, `${path}/${child.name}`, keepOrder))
  if (keepOrder) {
    return { name: node.name, uri: node.uri, attributes, text: null, groups: children.map((child) => [child.name, [child]] as const) }
  }
  const byName = new Map<string, Normalized[]>()
  for (const child of children) byName.set(child.name, [...(byName.get(child.name) ?? []), child])
  const groups = [...byName.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return { name: node.name, uri: node.uri, attributes, text: null, groups }
}

// see T-228, NR-1, NR-2, NR-3, NR-4, NR-5, NR-6
export function normalizedMspdi(text: string): Normalized {
  const root = parseXml(text)
  return normalizedNode(root, root.name, false)
}

// WHY: NR-6 forgets the order EX-10 decides, so outputs that must be written alike are compared ordered.
export function orderedMspdi(text: string): Normalized {
  const root = parseXml(text)
  return normalizedNode(root, root.name, true)
}

export interface Spec {
  readonly name: string
  readonly text?: string
  readonly children?: readonly Spec[]
}

export function leaf(name: string, text: string | number): Spec {
  return { name, text: String(text) }
}

export function node(name: string, ...children: readonly Spec[]): Spec {
  return { name, children }
}

function escaped(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function written(spec: Spec, indent: string): string {
  if (spec.children === undefined) return `${indent}<${spec.name}>${escaped(spec.text ?? '')}</${spec.name}>`
  const inner = spec.children.map((child) => written(child, `${indent}  `)).join('\n')
  return `${indent}<${spec.name}>\n${inner}\n${indent}</${spec.name}>`
}

export function mspdiText(root: Spec): string {
  const inner = (root.children ?? []).map((child) => written(child, '  ')).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Project xmlns="${MSPDI_URI}">\n${inner}\n</Project>\n`
}

function declAt(path: string): ElementDecl | undefined {
  return schemaModel('pj15').byPath.get(path)
}

function mapTree(spec: Spec, path: string, change: (children: readonly Spec[], path: string) => readonly Spec[]): Spec {
  if (spec.children === undefined) return spec
  const children = spec.children.map((child) => mapTree(child, `${path}/${child.name}`, change))
  return { ...spec, children: change(children, path) }
}

function isSequenceParent(path: string): boolean {
  const decl = declAt(path)
  return decl !== undefined && decl.content.kind === 'sequence'
}

function nameGroups(children: readonly Spec[]): Spec[][] {
  const order: string[] = []
  const groups = new Map<string, Spec[]>()
  for (const child of children) {
    if (!groups.has(child.name)) order.push(child.name)
    groups.set(child.name, [...(groups.get(child.name) ?? []), child])
  }
  return order.map((name) => groups.get(name) ?? [])
}

// see EX-10
export function inSchemaOrder(root: Spec): Spec {
  return mapTree(root, 'Project', (children, path) => {
    const decl = declAt(path)
    if (decl === undefined || decl.content.kind !== 'sequence') return children
    const rank = new Map(decl.content.children.map((each, index) => [each.name, index]))
    return nameGroups(children)
      .sort((a, b) => (rank.get(a[0]?.name ?? '') ?? 1e9) - (rank.get(b[0]?.name ?? '') ?? 1e9))
      .flat()
  })
}

// see MR-1, MR-2
// WHY: an xsd:all parent keeps its arrived order (EX-10), so shuffling it would move the expected output too.
export function reversedByName(root: Spec): Spec {
  return mapTree(root, 'Project', (children, path) =>
    isSequenceParent(path) ? nameGroups(children).reverse().flat() : children,
  )
}

export function changedAt(
  root: Spec,
  parentPath: string,
  change: (children: readonly Spec[]) => readonly Spec[],
): Spec {
  return mapTree(root, 'Project', (children, path) => (path === parentPath ? change(children) : children))
}

// see MR-2
export function reversedWithinName(children: readonly Spec[]): readonly Spec[] {
  const groups = nameGroups(children).map((group) => [...group].reverse())
  const next = new Map(groups.map((group) => [group[0]?.name ?? '', [...group]]))
  return children.map((child) => next.get(child.name)?.shift() ?? child)
}

export function everyDeclaredLeaf(path: string): readonly Spec[] {
  const decl = declAt(path)
  if (decl === undefined || decl.content.kind === 'simple') throw new Error(`${path} is not a parent in pj15`)
  return decl.content.children
    .filter((child) => child.content.kind === 'simple')
    .map((child) => leaf(child.name, sampleValue(`${path}/${child.name}`)))
}

export function isDeclaredAnywhere(name: string): boolean {
  const ends = (path: string): boolean => path === name || path.endsWith(`/${name}`)
  return [...schemaModel('pj12').byPath.keys(), ...schemaModel('pj15').byPath.keys()].some(ends)
}

export function insertedAfter(children: readonly Spec[], afterName: string, added: Spec): readonly Spec[] {
  const at = children.findIndex((child) => child.name === afterName)
  if (at < 0) throw new Error(`no ${afterName} to put ${added.name} after`)
  return [...children.slice(0, at + 1), added, ...children.slice(at + 1)]
}

export function sampleValue(path: string): string {
  const decl = declAt(path)
  if (decl === undefined || decl.content.kind !== 'simple') throw new Error(`${path} is not a leaf of pj15`)
  const first = decl.content.enumerations[0]
  if (first !== undefined) return first
  const byBase: Readonly<Record<string, string>> = {
    boolean: '1',
    integer: '1',
    decimal: '1',
    float: '1',
    dateTime: '2026-04-06T00:00:00',
    time: '08:00:00',
    duration: 'PT8H0M0S',
  }
  return byBase[decl.content.base] ?? 'carried'
}

export function withLeafAt(root: Spec, parentPath: string, added: Spec): Spec {
  let placed = false
  const visit = (spec: Spec, path: string): Spec => {
    if (spec.children === undefined) return spec
    if (!placed && path === parentPath) {
      placed = true
      return { ...spec, children: [...spec.children, added] }
    }
    return { ...spec, children: spec.children.map((child) => visit(child, `${path}/${child.name}`)) }
  }
  const out = visit(root, 'Project')
  if (!placed) throw new Error(`the fixture has no element at ${parentPath}`)
  return out
}

// see AT-143, EX-10
export function withEveryPj15OnlyElement(root: Spec): Spec {
  let out = root
  for (const path of pj15OnlyPaths()) {
    const cut = path.lastIndexOf('/')
    out = withLeafAt(out, path.slice(0, cut), leaf(path.slice(cut + 1), sampleValue(path)))
  }
  return inSchemaOrder(out)
}
