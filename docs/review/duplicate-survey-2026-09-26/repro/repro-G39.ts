// G39: document-settings.ts:467 expressionValueOf (+ reach :452) vs schedule-invariants.ts:272 boundValueOf (+ settingNumberOf :260, rowOf :207)
type Tok = { key: string } | { num: number } | { op: '+' | '-' | '*' | '/' }
function reach(value: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>(
    (at, key) => (at !== null && typeof at === 'object' ? (at as Record<string, unknown>)[key] : undefined),
    value,
  )
}
function expressionValueOf(expression: readonly Tok[], held: unknown): number | null {
  const stack: number[] = []
  for (const token of expression) {
    if ('key' in token) {
      const value = reach(held, token.key.split('.'))
      if (typeof value !== 'number' || !Number.isFinite(value)) return null
      stack.push(value)
      continue
    }
    if ('num' in token) { stack.push(token.num); continue }
    const right = stack.pop()
    const left = stack.pop()
    if (left === undefined || right === undefined) return null
    stack.push(token.op === '+' ? left + right : token.op === '-' ? left - right : token.op === '*' ? left * right : left / right)
  }
  const answer = stack.length === 1 ? stack[0] : undefined
  return answer === undefined || !Number.isFinite(answer) ? null : answer
}
function rowOf(held: unknown): Readonly<Record<string, unknown>> | null {
  if (held === null || typeof held !== 'object' || Array.isArray(held)) return null
  return held as Readonly<Record<string, unknown>>
}
function settingNumberOf(settings: unknown, key: string): number | null {
  let at: unknown = settings
  for (const step of key.split('.')) {
    const bag = rowOf(at)
    if (bag === null) return null
    at = bag[step]
  }
  if (Array.isArray(at)) return (at as readonly unknown[]).length
  return typeof at === 'number' && Number.isFinite(at) ? at : null
}
function boundValueOf(expression: readonly Tok[], settings: unknown): number | null {
  const stack: number[] = []
  for (const token of expression) {
    if ('key' in token) {
      const held = settingNumberOf(settings, token.key)
      if (held === null) return null
      stack.push(held)
      continue
    }
    if ('num' in token) { stack.push(token.num); continue }
    const right = stack.pop()
    const left = stack.pop()
    if (left === undefined || right === undefined) return null
    stack.push(token.op === '+' ? left + right : token.op === '-' ? left - right : token.op === '*' ? left * right : left / right)
  }
  const answer = stack.length === 1 ? stack[0] : undefined
  return answer === undefined || !Number.isFinite(answer) ? null : answer
}
const settings = {
  fontMin: 8, fontOfActual: 0.5, pinnedRowMax: 3, pinnedGroupIds: ['a', 'b'], sizes: [10, 20],
  fontScaleSizes: { S: 10, M: 12, L: 14 }, zero: 0, str: '5', nan: NaN,
}
const cases: [string, Tok[]][] = [
  ['fontMin/fontOfActual', [{ key: 'fontMin' }, { key: 'fontOfActual' }, { op: '/' }]],
  ['nested fontScaleSizes.M', [{ key: 'fontScaleSizes.M' }]],
  ['divide by zero', [{ key: 'fontMin' }, { key: 'zero' }, { op: '/' }]],
  ['missing key', [{ key: 'nope' }]],
  ['string value', [{ key: 'str' }]],
  ['NaN value', [{ key: 'nan' }]],
  ['stack underflow', [{ num: 1 }, { op: '+' }]],
  ['two left on stack', [{ num: 1 }, { num: 2 }]],
  ['empty expression', []],
  ['key naming a list', [{ key: 'pinnedGroupIds' }]],
  ['key stepping into a list', [{ key: 'sizes.1' }]],
]
let diff = 0
for (const [name, e] of cases) {
  const a = expressionValueOf(e, settings), b = boundValueOf(e, settings)
  if (!Object.is(a, b)) { diff++; console.log('DIFF', name, 'expressionValueOf =', a, ' boundValueOf =', b) } else console.log('eq  ', name, a)
}
console.log('differences:', diff)
