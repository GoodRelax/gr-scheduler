// Canonical serialization, hashing and case-line output shared by every comparator part.
// Node builtins only: this file is copied next to the part files and must resolve nothing else.

import { createHash } from 'node:crypto'
import { appendFileSync, writeFileSync } from 'node:fs'

// WHY: object keys are sorted so that a split that builds the same record in another key order
// stays green; array and Set order is kept, because order is behaviour.
export function canon(value: unknown): string {
  const seen = new WeakSet<object>()
  const walk = (one: unknown): unknown => {
    if (one === undefined) return '$undefined'
    if (one === null) return null
    if (typeof one === 'number') {
      if (Number.isNaN(one)) return '$NaN'
      if (one === Infinity) return '$Infinity'
      if (one === -Infinity) return '$-Infinity'
      if (Object.is(one, -0)) return '$-0'
      return one
    }
    if (typeof one === 'bigint') return '$bigint:' + one.toString()
    if (typeof one === 'function') return '$function'
    if (typeof one === 'symbol') return '$symbol:' + String(one.description)
    if (typeof one !== 'object') return one
    if (one instanceof Uint8Array) return { $u8: Buffer.from(one).toString('base64') }
    if (one instanceof Error) return { $error: one.constructor.name, message: one.message }
    if (seen.has(one)) return '$cycle'
    seen.add(one)
    let out: unknown
    if (Array.isArray(one)) out = one.map(walk)
    else if (one instanceof Set) out = { $set: [...one].map(walk) }
    else if (one instanceof Map) out = { $map: [...one].map(([k, v]) => [walk(k), walk(v)]) }
    else {
      const record: Record<string, unknown> = {}
      for (const key of Object.keys(one).sort()) {
        const held = (one as Record<string, unknown>)[key]
        // WHY: an absent key and a key holding undefined read the same through every caller's `?.` / `??`.
        if (held === undefined) continue
        record[key] = walk(held)
      }
      out = record
    }
    seen.delete(one)
    return out
  }
  return JSON.stringify(walk(value))
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export function errorRecord(error: unknown): { readonly threw: string; readonly message: string } {
  if (error instanceof Error) return { threw: error.constructor.name, message: error.message }
  return { threw: typeof error, message: String(error) }
}

// One running hash per case: entries are fed as they come, so a case never holds its whole log.
export class CaseHash {
  private readonly hash = createHash('sha256')
  count = 0
  trace: string[] | null = null
  add(...entry: unknown[]): void {
    const text = canon(entry)
    this.hash.update(text)
    this.hash.update('\n')
    this.count += 1
    if (this.trace !== null) this.trace.push(text.length > 600 ? text.slice(0, 600) + '...' : text)
  }
  digest(): string {
    return this.hash.digest('hex')
  }
}

export class CaseLines {
  private readonly lines: string[] = []
  private readonly ids = new Set<string>()
  constructor(private readonly outFile: string) {}
  put(rawId: string, digest: string): void {
    const id = rawId.replace(/\s/g, '_')
    if (this.ids.has(id)) throw new Error(`duplicate case id: ${id}`)
    this.ids.add(id)
    this.lines.push(`${id} ${digest}`)
  }
  putValue(id: string, value: unknown): void {
    this.put(id, sha256(canon(value)))
  }
  size(): number {
    return this.lines.length
  }
  write(): void {
    writeFileSync(this.outFile, '')
    appendFileSync(this.outFile, this.lines.join('\n') + '\n')
  }
}

// Calls `run` and returns its value, or the thrown error as a value: one throw never stops a run.
export function guarded<T>(run: () => T): T | { readonly threw: string; readonly message: string } {
  try {
    return run()
  } catch (error) {
    return errorRecord(error)
  }
}

export async function guardedAsync<T>(
  run: () => Promise<T>,
): Promise<T | { readonly threw: string; readonly message: string }> {
  try {
    return await run()
  } catch (error) {
    return errorRecord(error)
  }
}

// Tagged JSON that keeps Sets, Maps, undefined, odd numbers, byte arrays and shared references,
// so a captured value comes back with the same object graph it was taken with.
export function encodeGraph(value: unknown): string {
  const ids = new Map<object, number>()
  let next = 0
  const walk = (one: unknown): unknown => {
    if (one === undefined) return { $u: 1 }
    if (one === null) return null
    if (typeof one === 'number') {
      if (Number.isNaN(one)) return { $n: 'NaN' }
      if (one === Infinity) return { $n: 'Infinity' }
      if (one === -Infinity) return { $n: '-Infinity' }
      if (Object.is(one, -0)) return { $n: '-0' }
      return one
    }
    if (typeof one === 'function') return { $fn: 1 }
    if (typeof one !== 'object') return one
    const known = ids.get(one)
    if (known !== undefined) return { $ref: known }
    const id = next++
    ids.set(one, id)
    if (one instanceof Uint8Array) return { $id: id, $u8: Buffer.from(one).toString('base64') }
    if (Array.isArray(one)) return { $id: id, $a: one.map(walk) }
    if (one instanceof Set) return { $id: id, $set: [...one].map(walk) }
    if (one instanceof Map) return { $id: id, $map: [...one].map(([k, v]) => [walk(k), walk(v)]) }
    const record: Record<string, unknown> = {}
    for (const [key, held] of Object.entries(one)) record[key] = walk(held)
    return { $id: id, $o: record }
  }
  return JSON.stringify(walk(value))
}

export function decodeGraph(text: string): unknown {
  const byId = new Map<number, unknown>()
  const walk = (one: unknown): unknown => {
    if (one === null || typeof one !== 'object') return one
    const tagged = one as Record<string, unknown>
    if ('$u' in tagged) return undefined
    if ('$n' in tagged) return Number(tagged['$n'] === '-0' ? -0 : tagged['$n'])
    if ('$fn' in tagged) return undefined
    if ('$ref' in tagged) {
      const found = byId.get(tagged['$ref'] as number)
      if (found === undefined) throw new Error('dangling ref ' + String(tagged['$ref']))
      return found
    }
    const id = tagged['$id'] as number
    if ('$u8' in tagged) {
      const bytes = new Uint8Array(Buffer.from(tagged['$u8'] as string, 'base64'))
      byId.set(id, bytes)
      return bytes
    }
    if ('$a' in tagged) {
      const array: unknown[] = []
      byId.set(id, array)
      for (const held of tagged['$a'] as unknown[]) array.push(walk(held))
      return array
    }
    if ('$set' in tagged) {
      const set = new Set<unknown>()
      byId.set(id, set)
      for (const held of tagged['$set'] as unknown[]) set.add(walk(held))
      return set
    }
    if ('$map' in tagged) {
      const map = new Map<unknown, unknown>()
      byId.set(id, map)
      for (const [k, v] of tagged['$map'] as [unknown, unknown][]) map.set(walk(k), walk(v))
      return map
    }
    const record: Record<string, unknown> = {}
    byId.set(id, record)
    for (const [key, held] of Object.entries(tagged['$o'] as Record<string, unknown>)) {
      const value = walk(held)
      // WHY: a function in a captured value comes back absent, as the reader of that member defaults it.
      if (value === undefined && (held as Record<string, unknown> | null)?.['$fn'] !== undefined) continue
      record[key] = value
    }
    return record
  }
  return walk(JSON.parse(text))
}
