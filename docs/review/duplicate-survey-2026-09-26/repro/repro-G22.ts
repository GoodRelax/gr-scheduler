type K = 'rectangle' | 'chevron' | 'arrow' | 'endpointSpan' | 'milestone'
type Task = { uid: number; milestone: boolean | null }
type TaskVisual = { taskUid: number; shapeKind: K | null }
// schedule-layout.ts:220 shapeKindOf
function shapeKindOf(visualByUid: ReadonlyMap<number, TaskVisual>, task: Task): K {
  const kind = visualByUid.get(task.uid)?.shapeKind ?? null
  if (kind !== null) return kind
  return task.milestone === true ? 'milestone' : 'rectangle'
}
// edit-task.ts:170 isMilestone
function isMilestone(task: Task, visual: TaskVisual): boolean { return visual.shapeKind === null ? task.milestone === true : visual.shapeKind === 'milestone' }
// screen-state-input.ts:112 isDrawnAsMilestone (context inlined: geometry tasks + schedule tasks)
function isDrawnAsMilestone(geometryTasks: { taskUid: number; shapeKind: K }[], tasks: Task[], uid: number): boolean {
  const drawn = geometryTasks.find((one) => one.taskUid === uid)
  if (drawn !== undefined) return drawn.shapeKind === 'milestone'
  const task = tasks.find((t) => t.uid === uid) ?? null
  return task !== null && task.milestone === true
}
// name-label.ts:66 planDatesOf milestone branch; task-plan-actual.ts:175 cycle default
const nameLabelMilestone = (t: Task) => t.milestone === true
const cycleDefault = (t: Task) => t.milestone === true
const cases: [string, Task, K | null][] = [
  ['plain', { uid: 1, milestone: false }, null],
  ['milestone column', { uid: 1, milestone: true }, null],
  ['visual milestone, column false', { uid: 1, milestone: false }, 'milestone'],
  ['visual rectangle, column true', { uid: 1, milestone: true }, 'rectangle'],
  ['visual arrow, column null', { uid: 1, milestone: null }, 'arrow'],
]
for (const [name, task, kind] of cases) {
  const v: TaskVisual = { taskUid: 1, shapeKind: kind }
  const layout = shapeKindOf(new Map([[1, v]]), task) === 'milestone'
  const useCase = isMilestone(task, v)
  const translatorDrawn = isDrawnAsMilestone([{ taskUid: 1, shapeKind: shapeKindOf(new Map([[1, v]]), task) }], [task], 1)
  const translatorUndrawn = isDrawnAsMilestone([], [task], 1)
  const r = [layout, useCase, translatorDrawn, translatorUndrawn, nameLabelMilestone(task), cycleDefault(task)]
  console.log(name.padEnd(32), 'layout/useCase/xlatorDrawn/xlatorUndrawn/nameLabel/cycleDefault =', r.join(','), new Set(r).size === 1 ? 'equal' : 'DIFFER')
}
