// Reads and evaluates a guard condition of docs/spec/_source/state-machines.json in its guardLanguage, test side.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { GUARD_FUNCTIONS, type GuardFunction } from './guard-functions'

type Carried = { readonly name: string }
type ManuscriptState = { readonly key: string; readonly parent: string | null; readonly carries: readonly Carried[] }
type ManuscriptMachine = { readonly name: string; readonly states: readonly ManuscriptState[] }
type ManuscriptGuard = { readonly name: string; readonly condition: string }

export type GuardTerm = { readonly name?: string; readonly not?: boolean; readonly in?: string }

export interface GuardRegion {
  readonly region: string
  readonly typeStem: string
  readonly unit: string
  readonly holds?: string
  readonly root: { readonly carries: readonly Carried[] }
  readonly guards?: readonly ManuscriptGuard[]
  readonly machines: readonly ManuscriptMachine[]
}

const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8'),
) as {
  readonly guardLanguage: { readonly functions: readonly { readonly name: string; readonly parameters: readonly string[] }[] }
  readonly regions: readonly GuardRegion[]
}

export const GUARD_REGIONS: readonly GuardRegion[] = MANUSCRIPT.regions

const DECLARED_ARITY: ReadonlyMap<string, number> = new Map(
  MANUSCRIPT.guardLanguage.functions.map((f) => [f.name, f.parameters.length]),
)

export function guardRegion(name: string): GuardRegion {
  const region = GUARD_REGIONS.find((r) => r.region === name)
  if (region === undefined) throw new Error(`state-machines.json has no region "${name}"`)
  return region
}

export interface GuardScope {
  readonly region: string
  readonly values: Readonly<Record<string, unknown>>
  readonly event: Readonly<Record<string, unknown>>
  readonly after?: (machine: string) => unknown
  readonly taskGroup?: Readonly<Record<string, unknown>>
  readonly functions?: Readonly<Record<string, GuardFunction>>
}

type Node =
  | { readonly kind: 'literal'; readonly value: unknown }
  | { readonly kind: 'list'; readonly items: readonly Node[] }
  | { readonly kind: 'path'; readonly segments: readonly string[] }
  | { readonly kind: 'field'; readonly of: Node; readonly name: string }
  | { readonly kind: 'call'; readonly name: string; readonly args: readonly Node[] }
  | { readonly kind: 'state'; readonly after: boolean; readonly id: string }
  | { readonly kind: 'not'; readonly of: Node }
  | { readonly kind: 'binary'; readonly op: string; readonly left: Node; readonly right: Node }

type Token = { readonly kind: 'name' | 'text' | 'number' | 'op'; readonly text: string }

const TOKEN = /\s*(?:([A-Za-z_][A-Za-z0-9_]*)|'([^']*)'|(-?\d+)|(==|!=|<=|>=|&&|\|\||[!<>()[\],.]))/y

function tokensOf(condition: string): Token[] {
  const tokens: Token[] = []
  TOKEN.lastIndex = 0
  while (TOKEN.lastIndex < condition.length) {
    if (/^\s*$/.test(condition.slice(TOKEN.lastIndex))) break
    const at = TOKEN.lastIndex
    const m = TOKEN.exec(condition)
    if (m === null) throw new Error(`guard language: cannot read "${condition.slice(at)}" in "${condition}"`)
    if (m[1] !== undefined) tokens.push({ kind: 'name', text: m[1] })
    else if (m[2] !== undefined) tokens.push({ kind: 'text', text: m[2] })
    else if (m[3] !== undefined) tokens.push({ kind: 'number', text: m[3] })
    else tokens.push({ kind: 'op', text: m[4] as string })
  }
  return tokens
}

const COMPARISONS = new Set(['==', '!=', '<', '<=', '>', '>='])

// see SD-3
class Parser {
  private at = 0
  constructor(
    private readonly tokens: readonly Token[],
    private readonly source: string,
  ) {}

  parse(): Node {
    const node = this.or()
    if (this.at < this.tokens.length) this.fail(`unexpected "${this.peek()?.text}"`)
    return node
  }

  private fail(why: string): never {
    throw new Error(`guard language: ${why} in "${this.source}"`)
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.at + offset]
  }

  private isOp(text: string, offset = 0): boolean {
    const t = this.peek(offset)
    return t !== undefined && t.kind === 'op' && t.text === text
  }

  private take(text: string): void {
    if (!this.isOp(text)) this.fail(`expected "${text}"`)
    this.at += 1
  }

  private name(): string {
    const t = this.peek()
    if (t === undefined || t.kind !== 'name') this.fail('expected a name')
    this.at += 1
    return t.text
  }

  private or(): Node {
    let left = this.and()
    while (this.isOp('||')) {
      this.at += 1
      left = { kind: 'binary', op: '||', left, right: this.and() }
    }
    return left
  }

  private and(): Node {
    let left = this.comparison()
    while (this.isOp('&&')) {
      this.at += 1
      left = { kind: 'binary', op: '&&', left, right: this.comparison() }
    }
    return left
  }

  private comparison(): Node {
    const left = this.unary()
    const t = this.peek()
    if (t !== undefined && t.kind === 'op' && COMPARISONS.has(t.text)) {
      this.at += 1
      return { kind: 'binary', op: t.text, left, right: this.unary() }
    }
    if (t !== undefined && t.kind === 'name' && t.text === 'in' && !this.isOp('(', 1)) {
      this.at += 1
      return { kind: 'binary', op: 'in', left, right: this.unary() }
    }
    return left
  }

  private unary(): Node {
    if (this.isOp('!')) {
      this.at += 1
      return { kind: 'not', of: this.unary() }
    }
    let node = this.primary()
    while (this.isOp('.')) {
      this.at += 1
      node = { kind: 'field', of: node, name: this.name() }
    }
    return node
  }

  private dotted(): string {
    const parts = [this.name()]
    while (this.isOp('.')) {
      this.at += 1
      parts.push(this.name())
    }
    return parts.join('.')
  }

  private primary(): Node {
    const t = this.peek()
    if (t === undefined) this.fail('the condition ends early')
    if (t.kind === 'text') {
      this.at += 1
      return { kind: 'literal', value: t.text }
    }
    if (t.kind === 'number') {
      this.at += 1
      return { kind: 'literal', value: Number(t.text) }
    }
    if (this.isOp('(')) {
      this.at += 1
      const inner = this.or()
      this.take(')')
      return inner
    }
    if (this.isOp('[')) {
      this.at += 1
      const items: Node[] = []
      while (!this.isOp(']')) {
        items.push(this.or())
        if (!this.isOp(']')) this.take(',')
      }
      this.take(']')
      return { kind: 'list', items }
    }
    if (t.kind !== 'name') this.fail(`unexpected "${t.text}"`)
    if (t.text === 'true' || t.text === 'false') {
      this.at += 1
      return { kind: 'literal', value: t.text === 'true' }
    }
    if (t.text === 'null') {
      this.at += 1
      return { kind: 'literal', value: null }
    }
    if (this.isOp('(', 1)) return this.call()
    return { kind: 'path', segments: this.dotted().split('.') }
  }

  private call(): Node {
    const name = this.name()
    this.take('(')
    if (name === 'in' || name === 'inAfter') {
      const id = this.dotted()
      this.take(')')
      return { kind: 'state', after: name === 'inAfter', id }
    }
    const arity = DECLARED_ARITY.get(name)
    if (arity === undefined) this.fail(`function ${name} is not in guardLanguage.functions`)
    const args: Node[] = []
    while (!this.isOp(')')) {
      args.push(this.or())
      if (!this.isOp(')')) this.take(',')
    }
    this.take(')')
    if (args.length !== arity) this.fail(`${name} takes ${arity} argument(s), given ${args.length}`)
    return { kind: 'call', name, args }
  }
}

const PARSED = new Map<string, Node>()

export function parseCondition(condition: string): Node {
  const known = PARSED.get(condition)
  if (known !== undefined) return known
  const node = new Parser(tokensOf(condition), condition).parse()
  PARSED.set(condition, node)
  return node
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a as object)
  const kb = Object.keys(b as object)
  if (ka.length !== kb.length) return false
  return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

function machineOf(region: GuardRegion, name: string): ManuscriptMachine | undefined {
  return region.machines.find((m) => m.name === name)
}

function machineValue(scope: GuardScope, machine: ManuscriptMachine, useAfter: boolean): unknown {
  if (useAfter) {
    if (scope.after === undefined) throw new Error(`guard language: ${machine.name} after the step is asked, but the scope cannot tell it`)
    return scope.after(machine.name)
  }
  // WHY: the machine is named `...StateMachine` and the value holding its current state `...State` (R4.4).
  const value = scope.values[machine.name.replace(/Machine$/, '')]
  if (value === undefined) throw new Error(`guard language: region ${scope.region} values hold no ${machine.name}`)
  return value
}

function kindPath(value: unknown): string[] {
  const path: string[] = []
  let at = value as Record<string, unknown> | undefined
  while (at !== undefined && at !== null && typeof at === 'object') {
    path.push(String(at['kind']))
    at = at['child'] as Record<string, unknown> | undefined
  }
  return path
}

// see SD-1
function carriedOf(machine: ManuscriptMachine, value: unknown, carry: string): unknown {
  if (!machine.states.some((s) => s.carries.some((c) => c.name === carry))) {
    throw new Error(`guard language: no state of ${machine.name} carries ${carry}`)
  }
  let member = value as Record<string, unknown> | undefined
  const path: string[] = []
  while (member !== undefined && member !== null && typeof member === 'object') {
    path.push(String(member['kind']))
    const state = machine.states.find((s) => s.key === path.join('.'))
    if (state === undefined) throw new Error(`guard language: ${machine.name} has no state ${path.join('.')}`)
    if (state.carries.some((c) => c.name === carry)) {
      if (!(carry in member) || member[carry] === undefined) {
        throw new Error(`guard language: ${machine.name}.${path.join('.')} carries ${carry}, but the value holds none`)
      }
      return member[carry]
    }
    member = member['child'] as Record<string, unknown> | undefined
  }
  return null
}

function fieldOf(of: unknown, name: string, where: string): unknown {
  if (of === null) return null
  if (Array.isArray(of)) {
    if (name === 'length') return of.length
    throw new Error(`guard language: a list has no field ${name} (${where})`)
  }
  if (typeof of !== 'object') throw new Error(`guard language: ${String(of)} has no field ${name} (${where})`)
  const record = of as Record<string, unknown>
  if (!(name in record) || record[name] === undefined) throw new Error(`guard language: no field ${name} (${where})`)
  return record[name]
}

function pathValue(scope: GuardScope, region: GuardRegion, segments: readonly string[], useAfter: boolean): unknown {
  const [head, ...rest] = segments
  if (head === undefined) throw new Error('guard language: an empty path')
  let value: unknown
  let fields = rest
  if (head === 'event') value = scope.event
  else if (head === 'taskGroup') {
    if (scope.taskGroup === undefined) throw new Error(`guard language: taskGroup is read outside the documentData region`)
    value = scope.taskGroup
  } else if (head === 'root') {
    const [carry, ...more] = rest
    if (carry === undefined || !region.root.carries.some((c) => c.name === carry)) {
      throw new Error(`guard language: the root of ${region.region} carries no ${String(carry)}`)
    }
    value = fieldOf(scope.values, carry, `root.${carry}`)
    fields = more
  } else {
    const machine = machineOf(region, head)
    if (machine === undefined) throw new Error(`guard language: "${head}" is no term of region ${region.region}`)
    const [carry, ...more] = rest
    if (carry === undefined) throw new Error(`guard language: ${head} names no carried value`)
    value = carriedOf(machine, machineValue(scope, machine, useAfter), carry)
    fields = more
  }
  for (const f of fields) value = fieldOf(value, f, segments.join('.'))
  return value
}

function stateHolds(scope: GuardScope, region: GuardRegion, id: string, useAfter: boolean): boolean {
  const [name, ...path] = id.split('.')
  const machine = machineOf(region, name ?? '')
  if (machine === undefined) throw new Error(`guard language: in(${id}) names no machine of region ${region.region}`)
  if (!machine.states.some((s) => s.key === path.join('.'))) throw new Error(`guard language: ${machine.name} has no state ${path.join('.')}`)
  const now = kindPath(machineValue(scope, machine, useAfter))
  return path.every((segment, i) => now[i] === segment)
}

function asBoolean(value: unknown, what: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`guard language: ${what} is ${JSON.stringify(value)}, not true or false`)
  return value
}

// see SD-3
function evaluate(node: Node, scope: GuardScope, region: GuardRegion, useAfter: boolean): unknown {
  switch (node.kind) {
    case 'literal':
      return node.value
    case 'list':
      return node.items.map((item) => evaluate(item, scope, region, useAfter))
    case 'path':
      return pathValue(scope, region, node.segments, useAfter)
    case 'field':
      return fieldOf(evaluate(node.of, scope, region, useAfter), node.name, node.name)
    case 'state':
      return stateHolds(scope, region, node.id, useAfter || node.after)
    case 'not':
      return !asBoolean(evaluate(node.of, scope, region, useAfter), 'the operand of !')
    case 'call': {
      if (node.name === 'after') return evaluate(node.args[0] as Node, scope, region, true)
      const fn = scope.functions?.[node.name] ?? GUARD_FUNCTIONS[node.name]
      if (fn === undefined) throw new Error(`guard language: no test-side body for function ${node.name}`)
      return fn(...node.args.map((a) => evaluate(a, scope, region, useAfter)))
    }
    case 'binary':
      return binary(node, scope, region, useAfter)
  }
}

function binary(node: Extract<Node, { kind: 'binary' }>, scope: GuardScope, region: GuardRegion, useAfter: boolean): unknown {
  const left = (): unknown => evaluate(node.left, scope, region, useAfter)
  const right = (): unknown => evaluate(node.right, scope, region, useAfter)
  switch (node.op) {
    case '||':
      return asBoolean(left(), 'the left of ||') || asBoolean(right(), 'the right of ||')
    case '&&':
      return asBoolean(left(), 'the left of &&') && asBoolean(right(), 'the right of &&')
    case '==':
      return deepEqual(left(), right())
    case '!=':
      return !deepEqual(left(), right())
    case 'in': {
      const x = left()
      const list = right()
      if (!Array.isArray(list)) throw new Error(`guard language: the right of in is ${JSON.stringify(list)}, not a list`)
      return list.some((item) => deepEqual(item, x))
    }
    default: {
      const a = left()
      const b = right()
      if (a === null || b === null) return false
      if (typeof a !== 'number' || typeof b !== 'number') throw new Error(`guard language: ${node.op} compares ${JSON.stringify(a)} and ${JSON.stringify(b)}`)
      if (node.op === '<') return a < b
      if (node.op === '<=') return a <= b
      if (node.op === '>') return a > b
      return a >= b
    }
  }
}

export function evaluateCondition(condition: string, scope: GuardScope): unknown {
  return evaluate(parseCondition(condition), scope, guardRegion(scope.region), false)
}

export function guardHolds(scope: GuardScope, name: string): boolean {
  const guard = guardRegion(scope.region).guards?.find((g) => g.name === name)
  if (guard === undefined) throw new Error(`region ${scope.region} defines no guard ${name}`)
  return asBoolean(evaluateCondition(guard.condition, scope), `guard ${name}`)
}

export function termHolds(scope: GuardScope, term: GuardTerm): boolean {
  if (term.in !== undefined) return stateHolds(scope, guardRegion(scope.region), term.in, false)
  if (term.name === undefined) throw new Error(`a guard term with neither name nor in: ${JSON.stringify(term)}`)
  return guardHolds(scope, term.name) !== (term.not === true)
}

export function branchHolds(scope: GuardScope, branch: { readonly guard?: readonly GuardTerm[] }): boolean {
  return (branch.guard ?? []).every((term) => termHolds(scope, term))
}
