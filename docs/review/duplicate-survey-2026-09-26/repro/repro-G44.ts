// G44: release-on-pressed-part guards. frame-loop.ts:1245-1277 (4 copies) vs one merged reader,
// and the translator's use of the same guard in screen-state-input.ts:139-144.
function entrySettledOnRelease(input: any, context: any) {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.entry
}
function answerSettledOnRelease(input: any, context: any) {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.confirmationAnswer ?? null
}
function surfaceSettledOnRelease(input: any, context: any) {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.part
}
function formatSettledOnRelease(input: any, context: any) {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.format
}
// merged proposal
function pressedPartOnRelease(input: any, context: any) {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  return context.pressed?.on ?? null
}
// screen-state-input.ts:139-144 entry path (the part that reads on.entry)
function translatorEntryOnRelease(input: any, context: any) {
  if (input.kind === 'key') return 'key-path'
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const on = context.pressed === null ? null : context.pressed.on
  if (on?.isImportReportDismiss === true) return 'import-report-dismiss'
  if (on === null) return 'marker-path'
  return on.entry === null ? null : on.entry
}
const inputs = [{ kind: 'key' }, { kind: 'pointer', phase: 'down' }, { kind: 'pointer', phase: 'move' }, { kind: 'pointer', phase: 'up' }, { kind: 'pointer', phase: 'lost' }]
const ons = [null, { entry: null, part: null, format: null }, { entry: 'IC-5', part: 'Help Modal', format: 'EF-1', confirmationAnswer: 'proceed' }, { entry: 'IC-5', part: null, format: null, isImportReportDismiss: true }]
let n = 0, d = 0, t = 0
for (const input of inputs) for (const pressed of [null, ...ons.map((on) => ({ on }))]) {
  n++
  const ctx = { pressed }
  const m = pressedPartOnRelease(input, ctx)
  const ok = entrySettledOnRelease(input, ctx) === (m === null ? null : m.entry)
    && answerSettledOnRelease(input, ctx) === (m === null ? null : m.confirmationAnswer ?? null)
    && surfaceSettledOnRelease(input, ctx) === (m === null ? null : m.part)
    && formatSettledOnRelease(input, ctx) === (m === null ? null : m.format)
  if (!ok) { d++; console.log('DIFF', JSON.stringify(input), JSON.stringify(pressed)) }
  const tr = translatorEntryOnRelease(input, ctx)
  const fl = entrySettledOnRelease(input, ctx)
  if (typeof tr === 'string' && tr.endsWith('-path') || tr === 'import-report-dismiss') continue
  if (tr !== fl) { t++; console.log('translator vs frame-loop entry DIFF', JSON.stringify(input), JSON.stringify(pressed), tr, fl) }
}
console.log(`4 frame-loop copies vs merged reader: ${n} inputs, ${d} differ; translator entry read vs entrySettledOnRelease: ${t} differ`)
