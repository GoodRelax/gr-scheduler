// G29: open surface name, and which surface an event opens
const WATERMARK_UNLOCK = 'Watermark Unlock'
const WATERMARK_UNLOCK_ROW = 'U-60'
// open-modals.ts:266-273
function openSurfaceNameOf(session: any): string | null {
  const open = session.screen.openSurfaceState
  if (open.kind === 'closed') return null
  return open.surfaceName === WATERMARK_UNLOCK_ROW ? WATERMARK_UNLOCK : open.surfaceName
}
// frame-loop.ts:830-834
function openSurfaceNameIn(session: any): string | null {
  const open = session.screen.openSurfaceState
  return open.kind === 'open' ? open.surfaceName : null
}
const surfaces = [{ kind: 'closed' }, { kind: 'open', surfaceName: 'Help Modal' }, { kind: 'open', surfaceName: 'U-60' }]
for (const st of surfaces) {
  const s = { screen: { openSurfaceState: st } }
  console.log('openSurfaceState', JSON.stringify(st), '-> open-modals:', JSON.stringify(openSurfaceNameOf(s)), '| frame-loop:', JSON.stringify(openSurfaceNameIn(s)))
}

// frame-loop.ts:888-893 surfaceOpenedBy
function surfaceOpenedBy(event: any, screen: any): string | null {
  if (event.type === 'surfaceEntryPressed' || event.type === 'surfaceRaisedByFlow') return event.surfaceName
  if (event.type !== 'watermarkEntryPressed') return null
  return screen.watermarkDisplayState.kind === 'shown' ? WATERMARK_UNLOCK_ROW : null
}
// screen-values.ts:926-933 moved, 981-987 onSurfaceOpened, 1098-1102 onWatermarkEntryPressed, 998-1006 (close) modelled as closed
function moved(values: any, patch: any) { return { ...values, ...patch } }
function reduce(values: any, event: any) {
  if (event.type === 'surfaceEntryPressed' || event.type === 'surfaceRaisedByFlow') {
    if (values.openSurfaceState.kind === 'open') return values
    return moved(values, { openSurfaceState: { kind: 'open', surfaceName: event.surfaceName } })
  }
  if (event.type === 'watermarkEntryPressed') {
    if (values.watermarkDisplayState.kind === 'hidden') return moved(values, { watermarkDisplayState: { kind: 'shown' } })
    if (values.openSurfaceState.kind === 'open') return values
    return moved(values, { openSurfaceState: { kind: 'open', surfaceName: WATERMARK_UNLOCK_ROW } })
  }
  if (event.type === 'surfaceCloseAsked') return moved(values, { openSurfaceState: { kind: 'closed' } })
  return values
}
// what the use case opens when started from a closed surface (the question surfaceOpenedBy predicts)
let d = 0, n = 0
const events = [
  { type: 'surfaceEntryPressed', surfaceName: 'Help Modal' },
  { type: 'surfaceRaisedByFlow', surfaceName: 'Export Chooser' },
  { type: 'watermarkEntryPressed' },
  { type: 'paletteToggled' },
]
for (const wm of ['shown', 'hidden']) for (const st of surfaces) for (const ev of events) {
  n++
  const values = { watermarkDisplayState: { kind: wm }, openSurfaceState: st }
  const predicted = surfaceOpenedBy(ev, values)
  const after = reduce({ ...values, openSurfaceState: { kind: 'closed' } }, ev)
  const actual = after.openSurfaceState.kind === 'open' ? after.openSurfaceState.surfaceName : null
  if (predicted !== actual) { d++; console.log('DIFF', wm, JSON.stringify(st), ev.type, predicted, actual) }
}
console.log(`surfaceOpenedBy vs use-case opening: ${n} inputs, ${d} differ`)
