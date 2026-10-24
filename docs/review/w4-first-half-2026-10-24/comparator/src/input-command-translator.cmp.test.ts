// Comparator part: src/adapter/input-command-translator/input-command-translator.ts.
//
// Inputs: data/translator-corpus.json.gz, the real (input, InputContext) pairs, presses and field commits
// the PRE-split frame loop handed the translator while the frame-loop scenarios ran (captured once by
// capture-translator.cmp.test.ts). Each captured call is replayed, then perturbed: the pointer moved by
// -4..+4 px (the drag threshold +-1), phases, buttons, modifiers and click counts swapped, other keys and
// wheel turns, and the context's flags flipped. Every exported function is called; one line per case.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'

import { it, vi } from 'vitest'

import { CaseLines, decodeGraph, guarded } from './canon'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any

const KIT = process.env['COMPARATOR_KIT'] ?? ''

interface Record0 {
  readonly fn: string
  readonly scenario: string
  readonly args: Any[]
}

const NO_MODS = { ctrl: false, shift: false, alt: false, meta: false }
const MOD_SETS: Any[] = [
  NO_MODS,
  { ...NO_MODS, ctrl: true },
  { ...NO_MODS, shift: true },
  { ...NO_MODS, alt: true },
  { ...NO_MODS, ctrl: true, shift: true },
  { ...NO_MODS, meta: true },
]
const OTHER_KEYS = ['Esc', 'Enter', 'Delete', 'Backspace', 'A', 'C', 'V', 'Z', 'Y', 'F', 'N', 'P', 'D', 'E', 'O', 'S', '+', '-', '0', 'F1', 'F2', 'F11', 'ArrowLeft', 'ArrowDown', 'Tab', 'X']
const ESCAPE_RUNGS = [null, 'notice', 'textEntry', 'confirmation', 'surface', 'gesture', 'searchPanel', 'delayDiagnosticsReport', 'resourceList', 'helpModal', 'propertiesPanel', 'armed', 'selection', 'dualCursorMode', 'tooltip', 'fullScreen']
const OFFSETS: [number, number][] = [[-4, 0], [-3, 0], [-1, 0], [1, 0], [3, 0], [4, 0], [0, -4], [0, -3], [0, 3], [0, 4], [5, 5], [-25, 0], [25, 0], [0, 40]]

function pointerVariants(input: Any): [string, Any][] {
  const out: [string, Any][] = [['same', input]]
  for (const [dx, dy] of OFFSETS) out.push([`d${dx},${dy}`, { ...input, x: input.x + dx, y: input.y + dy }])
  for (const phase of ['down', 'move', 'up', 'lost']) if (phase !== input.phase) out.push([`phase-${phase}`, { ...input, phase }])
  for (const [at, modifiers] of MOD_SETS.entries()) out.push([`mods${at}`, { ...input, modifiers }])
  out.push(['click2', { ...input, clickCount: input.clickCount === 2 ? 1 : 2 }])
  out.push(['click3', { ...input, clickCount: 3 }])
  for (const button of ['left', 'middle', 'right']) if (button !== input.button) out.push([`button-${button}`, { ...input, button }])
  return out
}

function keyVariants(input: Any): [string, Any][] {
  const out: [string, Any][] = [['same', input]]
  for (const [at, modifiers] of MOD_SETS.entries()) out.push([`mods${at}`, { ...input, modifiers }])
  for (const key of OTHER_KEYS) if (key !== input.key) out.push([`key-${key}`, { ...input, key }])
  out.push(['key-ctrl-z', { ...input, key: 'Z', modifiers: { ...NO_MODS, ctrl: true } }])
  out.push(['key-ctrl-shift-plus', { ...input, key: '+', modifiers: { ...NO_MODS, ctrl: true, shift: true } }])
  return out
}

function wheelVariants(input: Any): [string, Any][] {
  const out: [string, Any][] = [['same', input]]
  for (const notches of [-3, -1, 0, 1, 3]) if (notches !== input.notches) out.push([`n${notches}`, { ...input, notches, scrollPx: { x: 0, y: notches * 100 } }])
  for (const [at, modifiers] of MOD_SETS.entries()) out.push([`mods${at}`, { ...input, modifiers }])
  out.push(['sideways', { ...input, scrollPx: { x: 120, y: 0 } }])
  out.push(['tiny', { ...input, notches: 0, scrollPx: { x: 0, y: 0.5 } }])
  for (const [dx, dy] of OFFSETS.slice(0, 4)) out.push([`d${dx},${dy}`, { ...input, x: input.x + dx, y: input.y + dy }])
  return out
}

function contextVariants(context: Any): [string, Any][] {
  const out: [string, Any][] = [
    ['text-entry', { ...context, isTextEntryUnsettled: true }],
    ['field-focus', { ...context, isTextFieldFocusWanted: true }],
    ['search-word', { ...context, isSearchWordFocused: true, focusedWindow: 'searchPanel' }],
    ['panel-focus', { ...context, isFocusInPropertiesPanel: true, isPropertiesPanelShowing: true }],
    ['surface', { ...context, isSurfaceStanding: true }],
    ['notice', { ...context, isNoticeStanding: true }],
    ['dual-a', { ...context, dualCursorFollowing: 'cursorA' }],
    ['no-selection', { ...context, selection: { items: [], isOrdered: true } }],
    ['all-tasks', { ...context, selection: { items: (context.document?.schedule?.tasks ?? []).map((task: Any) => ({ kind: 'task', uid: task.uid })), isOrdered: true } }],
    ['all-tasks-reversed', { ...context, selection: { items: (context.document?.schedule?.tasks ?? []).map((task: Any) => ({ kind: 'task', uid: task.uid })).reverse(), isOrdered: false } }],
    ['resources', { ...context, chosenResources: (context.document?.schedule?.resources ?? []).map((r: Any) => r.uid), resourceList: { shown: 'normal', isInFront: true } }],
    ['groups', { ...context, chosenTaskGroups: (context.document?.schedule?.taskGroups ?? []).slice(0, 2).map((g: Any) => g.id) }],
    ['stored-zoom', { ...context, isPictureAtStoredZoom: !context.isPictureAtStoredZoom }],
    ['report', { ...context, delayDiagnosticsReport: { shown: 'normal', isInFront: true, markedRowTaskUid: null } }],
  ]
  if (context.pressed !== null && context.pressed !== undefined) {
    out.push(['no-press', { ...context, pressed: null }])
    out.push(['press-ctrl', { ...context, pressed: { ...context.pressed, at: { ...context.pressed.at, modifiers: { ...NO_MODS, ctrl: true } } } }])
    out.push(['press-carried', { ...context, pressed: { ...context.pressed, isTaskGroupGrabCarried: !context.pressed.isTaskGroupGrabCarried } }])
  }
  return out
}

it('input-command-translator comparator', async () => {
  const lines = new CaseLines(process.env['COMPARATOR_OUT'] ?? '')
  vi.useFakeTimers({ now: Date.UTC(2026, 9, 24, 9, 0, 0), toFake: ['Date', 'performance'] })
  let uuid = 0
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}` as `${string}-${string}-${string}-${string}-${string}`)
  const t = (await import('../../../src/adapter/input-command-translator/input-command-translator')) as Any
  lines.putValue('exports', Object.keys(t).sort())
  for (const name of Object.keys(t).sort()) if (typeof t[name] !== 'function') lines.putValue(`const.${name}`, t[name])

  // --- Pure helpers over generated values -------------------------------------------------------
  const days = [
    { year: 2026, month: 1, day: 1 }, { year: 2026, month: 2, day: 28 }, { year: 2028, month: 2, day: 29 }, { year: 2026, month: 12, day: 31 },
    { year: 1970, month: 1, day: 1 }, { year: 1969, month: 12, day: 31 }, { year: 2026, month: 2, day: 30 }, { year: 2026, month: 13, day: 1 },
    { year: 2026, month: 0, day: 0 }, { year: 9999, month: 12, day: 31 },
  ]
  days.forEach((day, i) => {
    lines.putValue(`serialOfDay.${i}`, guarded(() => t.serialOfDay(day)))
    for (const shift of [-366, -31, -1, 0, 1, 30, 365, 0.5]) lines.putValue(`dayShifted.${i}.${shift}`, guarded(() => t.dayShifted(day, shift)))
    days.forEach((other, j) => lines.putValue(`compareDay.${i}.${j}`, guarded(() => t.compareDay(day, other))))
  })
  for (const serial of [-1, 0, 1, 20000, 20567, 2932896, -719528, 0.5, -0.5, 1e9]) lines.putValue(`dayFromSerial.${serial}`, guarded(() => t.dayFromSerial(serial)))
  const keys = ['', 'a', 'A', 'Esc', 'Enter', ' ', 'ab', '+', 'あ', '\u{1F600}', 'F1']
  keys.forEach((key, i) => lines.putValue(`isSingleCharacterKey.${i}`, t.isSingleCharacterKey(key)))
  const shapeNames = ['rectangle', 'chevron', 'arrow', 'endpointSpan', 'milestone', 'circle', 'hexagon', 'pentagon', 'diamond', 'square', 'star', 'triangleUp', 'triangleDown', 'file', 'box', 'floppyDisk', 'cylinder', 'person', 'smile', 'beerMug', '', 'toString', '__proto__', 'Rectangle', 'constructor']
  for (const name of shapeNames) {
    lines.putValue(`taskShapeKindOf.${name || 'empty'}`, guarded(() => t.taskShapeKindOf(name)))
    lines.putValue(`milestoneGlyphOf.${name || 'empty'}`, guarded(() => t.milestoneGlyphOf(name)))
  }
  for (let ic = 0; ic <= 175; ic += 1) {
    lines.putValue(`guideCursorModeOfEntry.IC-${ic}`, guarded(() => t.guideCursorModeOfEntry(`IC-${ic}`)))
    lines.putValue(`armedByEntry.IC-${ic}`, guarded(() => t.armedByEntry(`IC-${ic}`)))
  }
  for (const odd of ['', 'IC-', 'ic-23', 'IC-023', 'X']) {
    lines.putValue(`guideCursorModeOfEntry.odd.${odd || 'empty'}`, guarded(() => t.guideCursorModeOfEntry(odd)))
    lines.putValue(`armedByEntry.odd.${odd || 'empty'}`, guarded(() => t.armedByEntry(odd)))
  }
  for (let m = 0; m < 16; m += 1) {
    const modifiers = { ctrl: (m & 1) > 0, shift: (m & 2) > 0, alt: (m & 4) > 0, meta: (m & 8) > 0 }
    for (let want = 0; want < 8; want += 1) lines.putValue(`isCombo.${m}.${want}`, t.isCombo(modifiers, (want & 1) > 0, (want & 2) > 0, (want & 4) > 0))
  }
  const sampleCommands = [{ kind: 'setTaskName', taskUid: 1, name: 'x' }]
  lines.putValue('acted', guarded(() => t.acted({ kind: 'undoEdit' })))
  lines.putValue('changed', guarded(() => t.changed(sampleCommands)))
  lines.putValue('changed.empty', guarded(() => t.changed([])))
  lines.putValue('changedAndCreated', guarded(() => t.changedAndCreated([sampleCommands], { kind: 'task', uid: 9 })))
  for (const situation of [null, 'noFoldedTaskGroupBelow', 'milestoneCannotBeAParent']) {
    lines.putValue(`nothingToDo.${situation}`, guarded(() => t.nothingToDo(situation)))
    lines.putValue(`foldsOrNothing.some.${situation}`, guarded(() => t.foldsOrNothing(sampleCommands, situation)))
    lines.putValue(`foldsOrNothing.none.${situation}`, guarded(() => t.foldsOrNothing([], situation)))
  }
  for (const writes of [[], [[]], [sampleCommands], [[], sampleCommands], [sampleCommands, sampleCommands]]) {
    lines.putValue(`changedInOrder.${JSON.stringify(writes).length}.${writes.length}`, guarded(() => t.changedInOrder(writes)))
  }
  const boxes = [{ id: 'a' }, { id: 'b' }, { id: 'a', second: true }]
  for (const id of ['a', 'b', 'c', '']) lines.putValue(`boxById.${id || 'empty'}`, guarded(() => t.boxById(boxes, id)))
  for (const [fromY, toY] of [[0, 0], [0, 100], [100, 0], [25, 26], [-10, 1000]]) {
    const groups = [{ taskGroupId: 'a', y: 10, height: 20 }, { taskGroupId: 'b', y: 30, height: 20 }, { taskGroupId: 'c', y: 50, height: 40 }]
    lines.putValue(`drawnTaskGroupsCrossed.${fromY}.${toY}`, guarded(() => t.drawnTaskGroupsCrossed(groups, fromY, toY)))
  }

  // --- The captured corpus ------------------------------------------------------------------------
  const text = gunzipSync(readFileSync(join(KIT, 'data', 'translator-corpus.json.gz'))).toString('utf8')
  const records = decodeGraph(text) as Record0[]
  lines.putValue('corpus.size', records.length)
  const contexts: Any[] = []
  const seenContext = new Set<unknown>()
  const presses: Any[] = []
  const seenPress = new Set<unknown>()
  const noteContext = (context: Any): void => {
    // WHY: some callers hand a part of a context (pressedRowOf takes a Pick); only whole ones are walked.
    if (context === null || typeof context !== 'object' || seenContext.has(context)) return
    if (context.document === undefined || context.layout === undefined || context.regions === undefined) return
    seenContext.add(context)
    contexts.push(context)
    if (context.pressed !== null && context.pressed !== undefined && !seenPress.has(context.pressed)) {
      seenPress.add(context.pressed)
      presses.push({ press: context.pressed, context })
    }
  }
  const callAll = (input: Any, context: Any): Any => {
    const isEscape = input.kind === 'key' && input.key === 'Esc'
    return {
      command: guarded(() => t.commandFromInput(input, context)),
      screen: guarded(() => t.screenEventFromInput(input, context)),
      selection: guarded(() => t.selectionFromInput(input, context)),
      selectionRungs: isEscape ? ESCAPE_RUNGS.map((rung) => guarded(() => t.selectionFromInput(input, context, rung))) : null,
      typed: guarded(() => t.isTypedIntoSearchWord(input, context)),
      diagnosis: guarded(() => t.diagnosisRowAskedOf(input, context)),
      marker: guarded(() => t.markerOperatedTaskUidOf(input, context)),
      landing: guarded(() => t.isLandingMarkKeptBy(input, context.pressed ?? null, context.regions)),
    }
  }

  records.forEach((record, index) => {
    const args = record.args
    switch (record.fn) {
      case 'commandFromInput': {
        const [input, context] = args
        noteContext(context)
        const variants = input.kind === 'pointer' ? pointerVariants(input) : input.kind === 'key' ? keyVariants(input) : wheelVariants(input)
        for (const [id, variant] of variants) lines.putValue(`cfi.${index}.${id}`, callAll(variant, context))
        for (const [id, variant] of contextVariants(context)) lines.putValue(`cfi.${index}.ctx-${id}`, callAll(input, variant))
        break
      }
      case 'commandFromFieldCommit':
      case 'screenEventFromFieldCommit': {
        const [commit, context] = args
        noteContext(context)
        const texts = [commit.text, '', ' ', '0', '-1', '1.5', 'abc', '2026-04-03', '2026-04-03T10:30', '#123456', 'true', '99999999', commit.text + commit.text]
        texts.forEach((textValue, at) => {
          const changedCommit = { ...commit, text: textValue }
          lines.putValue(`commit.${index}.${at}`, {
            command: guarded(() => t.commandFromFieldCommit(changedCommit, context)),
            screen: guarded(() => t.screenEventFromFieldCommit(changedCommit, context)),
          })
        })
        lines.putValue(`commit.${index}.dark`, guarded(() => t.commandFromFieldCommit(commit, { ...context, screen: { ...context.screen, themePreference: 'dark' } })))
        break
      }
      case 'pressedRowOf': {
        const [press, context] = args
        noteContext(context)
        const results: unknown[] = [guarded(() => t.pressedRowOf(press, context))]
        for (const modifiers of MOD_SETS) results.push(guarded(() => t.pressedRowOf({ ...press, at: { ...press.at, modifiers } }, context)))
        results.push(guarded(() => t.pressedRowOf({ ...press, hit: null }, context)))
        results.push(guarded(() => t.pressedRowOf({ ...press, at: { ...press.at, clickCount: 2 } }, context)))
        results.push(guarded(() => t.pressedRowOf(press, { ...context, dualCursorFollowing: 'cursorB' })))
        lines.putValue(`pressedRowOf.${index}`, results)
        if (press.hit !== null && press.hit !== undefined) lines.putValue(`grabTaskGroupOf.${index}`, guarded(() => t.grabTaskGroupOf(press.hit)))
        break
      }
      default: {
        const context = args[0]
        noteContext(context)
        lines.putValue(`${record.fn}.${index}`, guarded(() => (t[record.fn] as (...a: unknown[]) => unknown)(...args)))
      }
    }
  })

  // --- Every context once: the context-only helpers over boundary grids ----------------------------
  contexts.forEach((context, index) => {
    const area = context.regions?.taskGroupArea ?? { x: 0, y: 0, width: 100, height: 100 }
    const xs = [area.x - 1, area.x, area.x + 1, area.x + area.width / 3, area.x + area.width / 2, area.x + area.width - 1, area.x + area.width, area.x + area.width + 1]
    const ys = [area.y - 1, area.y, area.y + 1, area.y + area.height / 2, area.y + area.height - 1, area.y + area.height, area.y + area.height + 1]
    const layout = context.layout
    const out: Record<string, unknown> = {
      escape: guarded(() => t.escapeContextOf(context)),
      zoomYCeiling: guarded(() => t.zoomYCeiling(context)),
      scrollAreaTop: guarded(() => t.scrollAreaTopOf(context)),
      drawn: guarded(() => t.drawnTaskGroupsOf(layout)),
      scrolling: guarded(() => t.scrollingTaskGroupsOf(layout)),
      rank: guarded(() => [...t.taskGroupRankById(context.document.schedule.taskGroups)]),
      next: guarded(() => t.nextIssuedUid(context.document.schedule)),
      placements: context.document.schedule.tasks.slice(0, 12).map((task: Any) => guarded(() => t.placementAt(task))),
      remembered: context.document.schedule.tasks.slice(0, 12).map((task: Any) => guarded(() => t.rememberedActualIn(context, task.uid))),
      depths: context.document.schedule.taskGroups.slice(0, 12).map((group: Any) => guarded(() => t.taskGroupDepthOfGroup(context, group.id))),
      grabDepths: context.document.schedule.taskGroups.slice(0, 12).map((group: Any) => guarded(() => t.taskGroupGrabDepthOf(new Map(context.document.schedule.taskGroups.map((g: Any) => [g.id, g])), group))),
      dayAtX: xs.map((x) => guarded(() => t.dayAtX(layout, x))),
      pointerDaySerial: xs.map((x) => guarded(() => t.pointerDaySerial(layout, x))),
      dayAnchorAt: xs.map((x) => guarded(() => t.dayAnchorAt(context, x))),
      taskGroupAtY: ys.map((y) => guarded(() => t.taskGroupAtY(layout, y))),
      onArea: xs.slice(0, 4).flatMap((x) => ys.slice(0, 4).map((y) => guarded(() => t.isOnTaskGroupArea(context, x, y)))),
      commentAnchor: xs.slice(2, 6).flatMap((x) => ys.slice(2, 5).map((y) => guarded(() => t.commentAnchorAt(layout, context.geometry, x, y)))),
      pan: [[0, 0], [10, 0], [0, 10], [-500, -500], [5000, 5000]].map(([dx, dy]) => [guarded(() => t.panTo(context, dx, dy)), guarded(() => t.scrolledAnchor(context, dx, dy))]),
      dayShift: [[area.x, area.x], [area.x, area.x + 1], [area.x, area.x + 50], [area.x + 50, area.x], [area.x, area.x + 1000]].map(([a, b]) => guarded(() => t.dayShift(context, a, b))),
      zoomY: [0.5, 1, 1.5, 3].map((zoomY) => guarded(() => t.taskGroupsAtZoomY(context, context.document.documentSettings, zoomY))),
      ceiling: [guarded(() => t.taskGroupBandCeilingOf(context)), guarded(() => t.taskGroupBandCeilingOf(context, 3, 2))],
    }
    if (index < 600) {
      out['fit'] = guarded(() => t.fitWrites(context))
      out['zoomEnds'] = guarded(() => t.zoomEntranceEndsOf(context))
      const settings = context.document.documentSettings
      out['scrollInForce'] = [
        { kind: 'setScrollPosition', scrollDate: settings.scrollDate, scrollDateFraction: settings.scrollDateFraction, scrollTaskGroupId: settings.scrollTaskGroupId, scrollTaskGroupFraction: settings.scrollTaskGroupFraction },
        { kind: 'setScrollPosition', scrollDate: '2026-04-01T00:00:00', scrollDateFraction: 0, scrollTaskGroupId: null, scrollTaskGroupFraction: 0 },
        { kind: 'setScrollPosition', scrollDate: settings.scrollDate, scrollDateFraction: 0.5, scrollTaskGroupId: settings.scrollTaskGroupId, scrollTaskGroupFraction: 0.25 },
      ].map((to) => guarded(() => t.isScrollPositionInForce(context, to)))
    }
    lines.putValue(`context.${index}`, out)
  })

  // --- Every captured press: the press helpers around the drag threshold ---------------------------
  presses.forEach(({ press, context }, index) => {
    const at = press.at
    const out: Record<string, unknown> = {
      threshold: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].flatMap((d) => [guarded(() => t.hasDraggedPastThreshold(press, { x: at.x + d, y: at.y })), guarded(() => t.hasDraggedPastThreshold(press, { x: at.x, y: at.y + d }))]),
      parentPick: [0, 2, 10].map((d) => guarded(() => t.isParentPickingCtrlClick(press, { x: at.x + d, y: at.y }, context))),
      swallowed: guarded(() => t.isSwallowedSecondPress(press, context)),
      dateKeeping: guarded(() => t.isDateKeepingDrag(press)),
      dateKeepingShift: guarded(() => t.isDateKeepingDrag({ at: { ...at, modifiers: { ...NO_MODS, shift: true } } })),
      travel: [[0, 0], [7, 0], [0, 7], [-30, 12]].map(([dx, dy]) => guarded(() => t.followingTravel({ ...at, phase: 'move', x: at.x + dx, y: at.y + dy }, press))),
      snap: [[0, 0], [3, 0], [17, 0], [-17, 0]].map(([dx]) => guarded(() => t.releasedSnapOf(context, { ...at, phase: 'up', x: at.x + dx }))),
      landing: ['down', 'move', 'up'].map((phase) => guarded(() => t.isLandingMarkKeptBy({ ...at, phase }, press, context.regions))),
    }
    lines.putValue(`press.${index}`, out)
  })

  vi.useRealTimers()
  vi.restoreAllMocks()
  lines.write()
  console.log(`input-command-translator cases: ${lines.size()} (records ${records.length}, contexts ${contexts.length}, presses ${presses.length})`)
})
