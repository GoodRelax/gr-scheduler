// E17: frame-loop.ts:1930 collectPress hit vs :1963 grabAtPointer vs pointer-shape.ts:331 guards. Stubs: region + item + dual cursor.
type Region = 'rowArea' | 'timeRuler' | 'scheduleCanvas' | 'header'
let dualCursorFollowing: object | null = null
let regionHere: Region = 'rowArea'
const regionAtPointer = (_r: unknown, _x: number, _y: number): Region => regionHere
const itemAtPointer = (_g: unknown, _x: number, _y: number, _s: unknown, _res?: string) => ({ grab: 'GA-1', item: 'bar' })
function collectPressHit(at: { x: number; y: number; clickCount: number }, on: object | null) {
  const resolving = at.clickCount >= 2 ? 'doubleClick' : 'press'
  return on === null && regionAtPointer(null, at.x, at.y) === 'rowArea' ? itemAtPointer(null, at.x, at.y, null, resolving) : null
}
function grabAtPointer(x: number, y: number, on: object | null) {
  if (on !== null) return null
  if (regionAtPointer(null, x, y) !== 'rowArea') return null
  if (dualCursorFollowing !== null) return null
  return itemAtPointer(null, x, y, null)
}
for (const dc of [null, {}]) for (const on of [null, {}]) for (const region of ['rowArea', 'timeRuler'] as Region[]) {
  dualCursorFollowing = dc; regionHere = region
  const a = collectPressHit({ x: 1, y: 1, clickCount: 1 }, on), b = grabAtPointer(1, 1, on)
  if ((a === null) !== (b === null)) console.log('E17 DIFFER dualCursor', dc !== null, 'on', on !== null, region, 'collectPress hit', a, 'grabAtPointer', b)
}
// E18: input-command-translator.ts:884 isOnTheChart vs frame-loop.ts:1953 startsNoTextSelection.
type P = { kind: 'pointer'; phase: 'down' | 'move' | 'up'; button: 'left' | 'middle' | 'right'; x: number; y: number }
function isOnTheChart(pressed: { on: object | null; at: P } | null, input: P, regionOf: (p: P) => Region): boolean {
  const at = pressed === null || pressed.on !== null ? input : pressed.at
  if (at.button === 'right') return false
  const region = regionOf(at)
  return region === 'rowArea' || region === 'timeRuler'
}
function startsNoTextSelection(pressed: { on: object | null; at: P } | null, input: P, regionOf: (p: P) => Region): boolean {
  if (input.kind !== 'pointer') return false
  const down = input.phase === 'down' && input.button === 'left'
  const drag = input.phase === 'move' && pressed !== null && pressed.at.button === 'left'
  if (!down && !drag) return false
  const region = regionOf(input)
  return region === 'rowArea' || region === 'timeRuler' || region === 'scheduleCanvas'
}
const regionOfX = (p: P): Region => (p.x < 100 ? 'rowArea' : p.x < 200 ? 'scheduleCanvas' : 'header')
const cases: [string, { on: object | null; at: P } | null, P][] = [
  ['left down on canvas margin', null, { kind: 'pointer', phase: 'down', button: 'left', x: 150, y: 0 }],
  ['middle down on row area', null, { kind: 'pointer', phase: 'down', button: 'middle', x: 50, y: 0 }],
  ['left drag from row area to header', { on: null, at: { kind: 'pointer', phase: 'down', button: 'left', x: 50, y: 0 } }, { kind: 'pointer', phase: 'move', button: 'left', x: 250, y: 0 }],
  ['left down on row area', null, { kind: 'pointer', phase: 'down', button: 'left', x: 50, y: 0 }],
]
for (const [name, pressed, input] of cases) {
  const a = isOnTheChart(pressed, input, regionOfX), b = startsNoTextSelection(pressed, input, regionOfX)
  console.log('E18', name, '| translator isOnTheChart', a, '| frame-loop startsNoTextSelection', b, '| union (isBrowserDefaultStopped)', a || b, a === b ? 'equal' : 'DIFFER')
}
