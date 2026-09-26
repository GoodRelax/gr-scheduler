// G52: step helpers of src/use-case/advance-screen-session
const NO_EFFECTS: readonly never[] = Object.freeze([])
function unchanged(state: any) { return { state, effects: NO_EFFECTS } } // session-step.ts:14-16

// field-entry-values.ts:240-250
function combinedField(values: any, naming: any, edit: any, effects: any) {
  const isKept = naming === values.createdTaskNamingState && edit === values.fieldEditState
  const state = isKept ? values : { ...values, createdTaskNamingState: naming, fieldEditState: edit }
  return isKept && effects.length === 0 ? unchanged(values) : { state, effects }
}
// file-flow-values.ts:714-719
function combinedFile(values: any, moves: any, effects: any) {
  const keys = Object.keys(moves)
  if (keys.some((key) => moves[key] !== values[key])) return { state: { ...values, ...moves }, effects }
  if (effects.length === 0) return unchanged(values)
  return { state: values, effects }
}
// gesture-values.ts:297-307
function combinedGesture(values: any, press: any, rowGrab: any, effects: any) {
  if (press === values.pointerPressState && rowGrab === values.rowGrabState) {
    return effects.length === 0 ? unchanged(values) : { state: values, effects }
  }
  return { state: { ...values, pointerPressState: press, rowGrabState: rowGrab }, effects }
}
// screen-values.ts:926-937
function moved(values: any, patch: any, effects: any = NO_EFFECTS) { return { state: { ...values, ...patch }, effects } }

function same(a: any, b: any) { return a.state === b.state && a.effects.length === b.effects.length && a.effects.every((e: any, i: number) => e === b.effects[i]) && (a.state === b.state || JSON.stringify(a.state) === JSON.stringify(b.state)) }
const x = { kind: 'a' }, y = { kind: 'b' }, z = { kind: 'c' }
const eff = [{ type: 'raiseNotice' }]
let n = 0, d = 0
for (const p of [x, y]) for (const q of [x, z]) for (const e of [NO_EFFECTS, [], eff]) {
  n++
  const fv = { createdTaskNamingState: x, fieldEditState: x, other: 1 }
  const a = combinedField(fv, p, q, e)
  const b = combinedFile(fv, { createdTaskNamingState: p, fieldEditState: q }, e)
  const gv = { pointerPressState: x, rowGrabState: x, other: 1 }
  const c = combinedGesture(gv, p, q, e)
  const cf = combinedFile(gv, { pointerPressState: p, rowGrabState: q }, e)
  const keptA = a.state === fv, keptB = b.state === fv, keptC = c.state === gv, keptCF = cf.state === gv
  if (keptA !== keptB || keptC !== keptCF || a.effects !== b.effects && !(a.effects.length === 0 && b.effects.length === 0 && a.effects === NO_EFFECTS) ) { d++; console.log('DIFF', p.kind, q.kind, e.length, keptA, keptB, keptC, keptCF) }
}
console.log(`combined x3: ${n} inputs, ${d} differ (reference kept / effects)`)

// screen-values moved vs the combined rule: the patch equals the current value
const sv = { language: 'ja', other: 1 }
const m = moved(sv, { language: 'ja' }, [{ type: 'storeLanguage', language: 'ja' }])
const c2 = combinedFile(sv, { language: 'ja' }, [{ type: 'storeLanguage', language: 'ja' }])
console.log('displayLanguageChosen ja on language ja -> screen-values moved keeps reference:', m.state === sv, '| combined keeps reference:', c2.state === sv)
const m0 = moved(sv, { language: 'ja' })
const c0 = combinedFile(sv, { language: 'ja' }, NO_EFFECTS)
console.log('same patch, no effects -> moved keeps reference:', m0.state === sv, '| combined keeps reference:', c0.state === sv)
