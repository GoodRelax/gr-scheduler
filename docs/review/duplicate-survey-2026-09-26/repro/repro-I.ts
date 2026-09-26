// Repros for method-I groups I06, I08, I12, I14. Bodies copied from src at d65097b9 (paths in comments).

// ---- I06: Row Area width. screen-regions.ts:107-112,163-165; frame-loop.ts:1867-1874; edit-document-settings.ts:109-116
{
  const ratio = 1
  const rowTitleIndent = 16, maxGroupDepth = 5, grabStrip = 16, rowControls = 4 * 26 // S-138 * S-235, 4 entrances
  const drawnTitle = (stored: number) => Math.max(stored * ratio, rowTitleIndent * ratio * maxGroupDepth + grabStrip + rowControls)
  const canvas = 1920, padding = 0, bar = 18
  const rowAreaOf = (title: number, props: number) => canvas - padding - drawnTitle(title) - props - bar // screen-regions.ts:165
  // frame drawn with stored title 100 (below the floor 200), props 300
  const frame = { rowArea: rowAreaOf(100, 300), title: drawnTitle(100), props: 300 }
  const withoutPanels = frame.rowArea + frame.title + frame.props // frame-loop.ts:1871-1873
  const editAccepts = (title: number, props: number) => withoutPanels - title * ratio - props > 0 // edit-document-settings.ts:111-115
  const props = 1750 // properties divider dragged far left
  console.log('I06 floor', drawnTitle(0), 'withoutPanels', withoutPanels,
    '| CM-67 accepts (title 100, props', props, ') =', editAccepts(100, props),
    '| drawn Row Area width =', rowAreaOf(100, props))
}

// ---- I08: keys a text entry takes. shortcut-keys.ts:37-52 vs dom-input-source.ts:118-136
{
  type Mods = { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }
  const isCombo = (m: Mods, c: boolean, s: boolean, a: boolean) => m.ctrl === c && m.shift === s && m.alt === a && !m.meta
  // translator: returns true when IN-5a swallows the key (UNASSIGNED), keys already via keyOf (single chars upper-cased; code Minus -> '-', Equal -> '+')
  const translatorTakes = (key: string, m: Mods) => {
    const plain = isCombo(m, false, false, false), ctrl = isCombo(m, true, false, false)
    if (plain && key.length === 1) return true
    if (plain && (key === 'Delete' || key === 'Backspace')) return true
    if (ctrl && (key === 'C' || key === 'V' || key === 'A')) return true
    return false
  }
  const shiftZooms = (key: string, m: Mods) => isCombo(m, false, true, false) && (key === '+' || key === '-') // shortcut-keys.ts:93
  const domTakes = (eventKey: string, m: Mods) => {
    if (m.alt || m.meta) return false
    if (m.ctrl) { const l = eventKey.toUpperCase(); return l === 'C' || l === 'V' || l === 'A' }
    return eventKey.length === 1 || eventKey === 'Delete' || eventKey === 'Backspace'
  }
  const S: Mods = { ctrl: false, shift: true, alt: false, meta: false }
  const CS: Mods = { ctrl: true, shift: true, alt: false, meta: false }
  const rows: [string, string, string, Mods][] = [
    ['Shift+A', 'A', 'A', S], ['Shift+Delete', 'Delete', 'Delete', S],
    ['Shift+Minus (US "_", JIS "=")', '_', '-', S], ['Shift+Equal (US "+")', '+', '+', S], ['Ctrl+Shift+V', 'V', 'V', CS],
  ]
  for (const [name, eventKey, mapped, m] of rows) {
    console.log('I08', name.padEnd(32), 'dialogue field takes =', domTakes(eventKey, m), '| text entry (IN-5a) takes =', translatorTakes(mapped, m), '| SK-16 zoom fires =', shiftZooms(mapped, m))
  }
}

// ---- I12: TaskGroup colour 'black'. task-group-look.ts:24 / stored-colour.ts:46 / properties-panel.ts:759-762 / svg-renderer.ts:320-327
{
  const PALETTE = ['white', 'black', 'dimgray', 'lightgray', 'red', 'blue', 'yellow', 'green', 'orange', 'purple', 'transparent']
  const isStoredColour = (t: string, allowsTransparent: boolean) => PALETTE.includes(t) ? (allowsTransparent || t !== 'transparent') : false
  const offered = PALETTE.filter((n) => n !== 'transparent' && n !== 'black')
  const bandCell: Record<string, string | false> = { black: false, dimgray: '#e0e0e0' }
  const drawnBand = (stored: string) => { const cell = bandCell[stored]; return cell === false ? null : cell } // null -> caller's themed band (schedule-grid.ts:231)
  console.log('I12 black: CM-30 accepts =', isStoredColour('black', true), '| panel offers =', offered.includes('black'), '| drawn band =', drawnBand('black') ?? 'theme band (fallback)')
}

// ---- I14: last pick is not a Task. selection.ts:79-82 vs input-command-translator.ts:1226-1228
{
  type Ref = { kind: 'task'; uid: number } | { kind: 'dependency'; successorUid: number; ordinal: number }
  const sel = { ordered: true, items: [{ kind: 'task', uid: 1 }, { kind: 'task', uid: 2 }, { kind: 'dependency', successorUid: 2, ordinal: 0 }] as Ref[] }
  const lastPicked = (s: typeof sel) => (!s.ordered || s.items.length === 0 ? null : s.items[s.items.length - 1] ?? null)
  const alignAnchor = (s: typeof sel) => { const c = s.items.filter((o) => o.kind === 'task'); return c[c.length - 1] }
  console.log('I14 lastPicked =', JSON.stringify(lastPicked(sel)), '| align anchor =', JSON.stringify(alignAnchor(sel)))
}
