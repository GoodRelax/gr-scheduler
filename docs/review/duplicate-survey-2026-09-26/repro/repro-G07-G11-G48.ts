// G07: task -> row. item-grab.ts:542 rowOfTask (find: first member wins) vs deletion-confirmations.ts:48 / task-group-order.ts:57 / edit-task-group.ts:267 (new Map: last member wins)
type Member = { taskUid: number; groupId: string }
const rowOfTaskFind = (members: Member[], uid: number) => { const m = members.find((one) => one.taskUid === uid); return m === undefined ? null : m.groupId }
const rowOfTaskMap = (members: Member[], uid: number) => new Map(members.map((one) => [one.taskUid, one.groupId])).get(uid) ?? null
for (const members of [[{ taskUid: 1, groupId: 'A' }], [], [{ taskUid: 1, groupId: 'A' }, { taskUid: 1, groupId: 'B' }]]) {
  const a = rowOfTaskFind(members, 1), b = rowOfTaskMap(members, 1)
  console.log('G07 members', JSON.stringify(members), 'find', a, 'map', b, a === b ? '' : '<-- DIFFER (IV-6 breach only)')
}
// G11: S-208 threshold. translator.ts:436 hasDraggedPastThreshold vs row-grab.ts:257 rowGrabAxisAt (settled axis absent)
const T = 4
type P = { x: number; y: number }
function hasDraggedPastThreshold(press: { at: P }, at: P): boolean { return Math.abs(at.x - press.at.x) > T || Math.abs(at.y - press.at.y) > T }
function rowGrabAxisAt(at: P, press: { at: P; rowGrabAxis?: string | null }): string | null {
  const settled = press.rowGrabAxis
  if (settled !== null && settled !== undefined) return settled
  const across = Math.abs(at.x - press.at.x)
  const down = Math.abs(at.y - press.at.y)
  if (across <= T && down <= T) return null
  if (across === down) return null
  return across > down ? 'depth' : 'position'
}
for (const at of [{ x: 3, y: 3 }, { x: 5, y: 0 }, { x: 0, y: 5 }, { x: 4, y: 4 }, { x: 6, y: 6 }, { x: NaN, y: 0 }, { x: 0, y: Infinity }]) {
  const past = hasDraggedPastThreshold({ at: { x: 0, y: 0 } }, at), axis = rowGrabAxisAt(at, { at: { x: 0, y: 0 } })
  const consistent = past === (axis !== null)
  console.log('G11 at', JSON.stringify(at), 'hasDraggedPastThreshold', past, 'rowGrabAxisAt', axis, consistent ? '' : '<-- DIFFER' + (at.x === at.y ? ' (by design: WHY row-grab.ts:264 diagonal)' : ''))
}
// G48: escape level. screen-state.ts:46 escapeTarget fed by translator.ts:1326 escapeContextOf vs frame-loop.ts:1080 escapeLevelOf
function escapeTarget(c: any): string | null {
  if (c.isNoticeStanding === true) return 'notice'
  if (c.isTextEntryUnsettled) return 'textEntry'
  if (c.isConfirmationStanding === true) return 'confirmation'
  if (c.isSurfaceOpen) return 'surface'
  if (c.gestureInFlight) return 'gesture'
  if (c.isPropertiesPanelOpen === true) return 'propertiesPanel'
  if (c.isArmed) return 'armed'
  if (c.isSelectionStanding === true) return 'selection'
  if (c.dualCursorMode) return 'dualCursorMode'
  if (c.isTooltipStanding === true) return 'tooltip'
  return null
}
const base = { isNoticeStanding: false, isTextEntryUnsettled: false, isSurfaceOpen: false, gestureInFlight: false, isArmed: false, dualCursorMode: false }
for (const [name, shell, sel, panel] of [['selection only', { c: false, t: false }, true, false], ['confirmation + selection', { c: true, t: false }, true, false], ['tooltip + selection', { c: false, t: true }, true, false], ['panel', { c: false, t: false }, false, true]] as [string, { c: boolean; t: boolean }, boolean, boolean][]) {
  const translator = escapeTarget({ ...base, isPropertiesPanelOpen: panel, isSelectionStanding: sel })
  const frameLoop = escapeTarget({ ...base, isConfirmationStanding: shell.c, isPropertiesPanelOpen: panel, isTooltipStanding: shell.t })
  console.log('G48', name.padEnd(26), 'translator', translator, '| frame-loop', frameLoop, translator === frameLoop ? '' : '<-- DIFFER (by design: screen-state.ts:29 TRAP)')
}
