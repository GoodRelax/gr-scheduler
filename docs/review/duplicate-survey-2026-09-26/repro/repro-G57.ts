// G57: icon buttons in src/framework/dom-screen-surface, with a fake DOM that records attributes
function fakeHost() {
  return { createElement: (tag: string) => { const attrs: Record<string, string> = {}; return { tag, attrs, setAttribute(k: string, v: string) { attrs[k] = v }, append() {}, replaceChildren() {} } } }
}
function made(host: any, tag: string, _style: string) { return host.createElement(tag) }
function fillEntry(_h: any, _e: any, _i: string) {}
const entryStyle = () => '', entryFaintStyle = () => '', entranceStateFill = (_: any) => ''
// dom-screen-surface.ts:582-601
function commandEntry(host: any, item: any) {
  const base = item.isEnabled ? entryStyle() : entryFaintStyle()
  const standing: string[] = []
  if (item.isEnabled && item.isArmed) standing.push('EN-1')
  if (item.isEnabled && item.isPressed) standing.push('EN-2')
  if (item.isEnabled && item.isChosen) standing.push('EN-6')
  const entry = made(host, 'button', base + entranceStateFill(standing))
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', item.icon)
  entry.setAttribute('data-enabled', String(item.isEnabled))
  entry.setAttribute('data-pressed', String(item.isPressed))
  entry.setAttribute('data-armed', String(item.isArmed))
  if (!item.isEnabled) entry.setAttribute('aria-disabled', 'true')
  if (item.isPressed) entry.setAttribute('aria-pressed', 'true')
  entry.setAttribute('aria-label', item.label === '' ? item.icon : item.label)
  fillEntry(host, entry, item.icon)
  return entry
}
// open-modals-drawing.ts:82-90
function rosterSelectionEntry(host: any, icon: string) {
  const entry = made(host, 'button', entryStyle())
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', icon)
  entry.setAttribute('aria-label', icon)
  fillEntry(host, entry, icon)
  return entry
}
// row-title-panel-drawing.ts:410-422
function panelCornerEntryElement(host: any, icon: string) {
  const entry = made(host, 'button', '')
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', icon)
  entry.setAttribute('aria-label', icon)
  fillEntry(host, entry, icon)
  return entry
}
const host = fakeHost()
const icon = 'IC-5'
const viaCommand = commandEntry(host, { icon, isEnabled: true, isPressed: false, isArmed: false, isChosen: false, label: 'Undo' })
console.log('commandEntry          ', JSON.stringify(viaCommand.attrs))
console.log('rosterSelectionEntry  ', JSON.stringify(rosterSelectionEntry(host, icon).attrs))
console.log('panelCornerEntryElement', JSON.stringify(panelCornerEntryElement(host, icon).attrs))

// assignment text: tooltips.ts:53-64 vs open-modals-drawing.ts:70,134-137
const SEP = ' ／ '
function tooltipAssignment(keys: string | null, press: string | null) {
  const written = [keys, press].filter((one): one is string => one !== null).join(SEP)
  return written === '' ? null : written
}
function helpAssignment(keys: string | null, press: string | null) {
  const written = [keys, press].filter((one): one is string => one !== null).join(SEP)
  return written !== '' ? written : null
}
let d = 0
for (const k of [null, '', 'Ctrl+Z']) for (const p of [null, 'Click']) if (tooltipAssignment(k, p) !== helpAssignment(k, p)) d++
console.log(`assignment join: 6 inputs, ${d} differ`)
