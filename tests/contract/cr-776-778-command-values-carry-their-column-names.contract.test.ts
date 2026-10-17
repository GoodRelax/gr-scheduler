// CR-776 / CR-778: command values carry their column names; PI-39 drops the grab axis type.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi, type AgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { shell, taskGroupDocument, taskOf, TEMPLATE, type ShellBench } from '../unit/cr-541-stage'

const SOURCE = join(process.cwd(), 'docs', 'spec', '_source')
const readJson = (name: string): any => JSON.parse(readFileSync(join(SOURCE, name), 'utf8'))

const COMMANDS = readJson('document-commands.json')
const ERD = readJson('erd.json')
const SETTINGS = readJson('settings.json')
const PUBLISHED = readJson('published-entries.json')
const MACHINES = readJson('state-machines.json')

// see T-058
const AT_NAMES = new Map<string, string>()
for (const entity of ERD.entities) {
  for (const column of entity.columns ?? []) AT_NAMES.set(`AT-${column.seat}`, column.name)
}

// see T-202
const S_NAMES = new Map<string, string>()
for (const block of SETTINGS.blocks) {
  if (block.id !== 'T-202' && block.id !== 'T-203') continue
  for (const row of block.rows ?? []) S_NAMES.set(row.id, String(row.key).replace(/`/g, '').split('.').pop() as string)
}

const columnNameOf = (row: string): string | undefined => AT_NAMES.get(row) ?? S_NAMES.get(row)

// see CR-776
const NOT_RENAMED = new Set([
  // WHY: JDG-2685 -- the command that makes a box names it as every command on that box does.
  'CM-46.commentBoxId',
  'CM-52.highlightBoxId',
  'CM-39.workingDayTypes',
  'CM-51.dx',
  'CM-51.dy',
  'AnnotationAnchor.date',
  'AnnotationAnchor.taskGroupId',
  'AnnotationAnchor.bandFraction',
  'AnnotationAnchor.taskUid',
  'AnnotationAnchor.taskFigure',
  'AnnotationAnchor.highlightBoxId',
  'AnnotationAnchor.snapPoint',
])

interface CommandValue {
  readonly where: string
  readonly name: string
  readonly column: unknown
}

function valuesOfManuscript(): CommandValue[] {
  const found: CommandValue[] = []
  for (const row of COMMANDS.rows) {
    for (const value of row.values) found.push({ where: row.id, name: value.name, column: value.column })
  }
  for (const shape of COMMANDS.shapes) {
    const fields = shape.variants !== undefined ? shape.variants.flatMap((v: any) => v.fields) : shape.fields
    for (const field of fields) found.push({ where: shape.name, name: field.name, column: field.column })
  }
  return found
}

describe('CR-776 -- the manuscript: a value that writes one column carries that column name', () => {
  const values = valuesOfManuscript()
  const oneColumn = values.filter((v) => typeof v.column === 'string')

  it('the manuscripts are read: every single-column value points at a row the sources hold', () => {
    expect(oneColumn.length).toBeGreaterThan(100)
    for (const value of oneColumn) {
      expect(columnNameOf(value.column as string), `${value.where}.${value.name} points at ${String(value.column)}`).toBeDefined()
    }
  })

  it('every value naming exactly one AT-/S- row is named after it, but for the CR-776 section 4 words', () => {
    const wrong: string[] = []
    for (const value of oneColumn) {
      if (NOT_RENAMED.has(`${value.where}.${value.name}`)) continue
      const expected = columnNameOf(value.column as string)
      if (value.name !== expected) wrong.push(`${value.where}.${value.name} writes ${String(value.column)} = ${expected}`)
    }
    expect(wrong).toEqual([])
  })

  it('the words section 4 leaves alone still exist (so the exception list is not stale)', () => {
    for (const word of NOT_RENAMED) {
      expect(
        values.find((v) => `${v.where}.${v.name}` === word),
        word,
      ).toBeDefined()
    }
  })

  it('a value writing several columns (a list of rows) is out of scope and exists only in that form', () => {
    expect(values.filter((v) => Array.isArray(v.column)).length).toBeGreaterThan(0)
  })

  it('CR-776 section 2: the 19 renamed values carry their new names and point at the named column', () => {
    const renamed: [string, string, string, string][] = [
      ['CM-3', 'date', 'statusDate', 'AT-13'],
      ['CM-5', 'hue', 'themeHue', 'AT-19'],
      ['CM-16', 'days', 'fadeInDays', 'AT-40'],
      ['CM-17', 'days', 'fadeOutDays', 'AT-41'],
      ['CM-18', 'parentUid', 'parentTaskUid', 'AT-25'],
      ['CM-21', 'glyph', 'milestoneGlyph', 'AT-101'],
      ['CM-26', 'label', 'name', 'AT-53'],
      ['CM-29', 'label', 'name', 'AT-53'],
      ['CM-32', 'minHeight', 'minHeightPx', 'AT-59'],
      ['CM-56', 'direction', 'stackDirection', 'S-58'],
      ['CM-62', 'scale', 'fontSizeStep', 'S-70'],
      ['CM-64', 'monochrome', 'isThemeMonochrome', 'S-74'],
      ['CM-74', 'scale', 'displayScale', 'S-234'],
      ['CM-87', 'workingDays', 'parentTaskProgressToleranceDays', 'AT-156'],
      ['CM-94', 'timeZone', 'scheduleDataTimeZone', 'AT-157'],
      ['CM-95', 'timeZone', 'viewTimeZone', 'S-574'],
      ['CM-96', 'timeZones', 'displayTimeZones', 'S-575'],
      ['HighlightRange', 'startDate', 'start', 'AT-117'],
      ['HighlightRange', 'endDate', 'finish', 'AT-118'],
    ]
    for (const [where, oldName, newName, column] of renamed) {
      const names = values.filter((v) => v.where === where).map((v) => v.name)
      expect(names, `${where} carries ${newName}`).toContain(newName)
      expect(names, `${where} no longer carries ${oldName}`).not.toContain(oldName)
      expect(values.find((v) => v.where === where && v.name === newName)?.column, `${where}.${newName}`).toBe(column)
    }
  })
})

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

function stage(): { api: AgentApi; bench: ShellBench } {
  const document = taskGroupDocument([
    { id: 'g1', parentId: null },
    { id: 'g2', parentId: null },
  ])
  const tasks = document.schedule.tasks as Record<string, unknown>[]
  document.schedule.tasks = [tasks[0], taskOf(2)]
  const bench = shell(document)
  benches.push(bench)
  const api = installAgentApi({
    ...bench.loop.agentApiSeams(),
    writerName: 'cr-776 tester',
    $schema: TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
  } as never)
  return { api, bench }
}

const write = (api: AgentApi, commands: readonly unknown[]) =>
  api.applyCommands({ expectedStamp: api.readStamp(), commands: commands as never })

const documentOf = (bench: ShellBench): any => bench.loop.document()
const groupName = (bench: ShellBench): unknown => documentOf(bench).schedule.taskGroups.find((g: any) => g.id === 'g1').name
const fadeIn = (bench: ShellBench): unknown => documentOf(bench).schedule.tasks.find((t: any) => t.uid === 1).fadeInDays

interface Sample {
  readonly title: string
  readonly kind: string
  readonly target: Record<string, unknown>
  readonly newName: string
  readonly oldName: string
  readonly value: unknown
  readonly read: (bench: ShellBench) => unknown
}

const SAMPLES: Sample[] = [
  { title: 'setTaskGroupName (name, was label) -> AT-53', kind: 'setTaskGroupName', target: { taskGroupId: 'g1' }, newName: 'name', oldName: 'label', value: 'Renamed group', read: groupName },
  { title: 'setStatusDate (statusDate, was date) -> AT-13', kind: 'setStatusDate', target: {}, newName: 'statusDate', oldName: 'date', value: '2026-04-08T00:00:00', read: (b) => documentOf(b).schedule.project.statusDate },
  { title: 'setThemeHue (themeHue, was hue) -> AT-19', kind: 'setThemeHue', target: {}, newName: 'themeHue', oldName: 'hue', value: 123, read: (b) => documentOf(b).schedule.project.themeHue },
  { title: 'setTaskFadeInDays (fadeInDays, was days) -> AT-40', kind: 'setTaskFadeInDays', target: { taskUid: 1 }, newName: 'fadeInDays', oldName: 'days', value: 2, read: fadeIn },
  { title: 'setDisplayScale (displayScale, was scale) -> S-234', kind: 'setDisplayScale', target: {}, newName: 'displayScale', oldName: 'scale', value: 125, read: (b) => documentOf(b).documentSettings.displayScale },
]

describe('CR-776 -- applyCommands (AM-7): the new name is accepted and lands, the old name is refused', () => {
  it.each(SAMPLES)('$title: the new name is accepted and the column holds the value', (sample) => {
    const { api, bench } = stage()
    expect(sample.read(bench), 'the sample value differs from the starting one').not.toEqual(sample.value)
    const outcome = write(api, [{ kind: sample.kind, ...sample.target, [sample.newName]: sample.value }])
    expect(outcome.ok).toBe(true)
    expect(sample.read(bench)).toEqual(sample.value)
  })

  it.each(SAMPLES)('$title: the old name is refused as malformedRequest and the document is unchanged', (sample) => {
    const { api, bench } = stage()
    const documentBefore = JSON.stringify(documentOf(bench))
    const stampBefore = JSON.stringify(api.readStamp())
    const outcome = write(api, [{ kind: sample.kind, ...sample.target, [sample.oldName]: sample.value }])
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.refusal.reason).toBe('malformedRequest')
    expect(JSON.stringify(documentOf(bench))).toBe(documentBefore)
    expect(JSON.stringify(api.readStamp())).toBe(stampBefore)
  })

  it('both names at once are refused too (the old name is a value the command does not carry)', () => {
    const { api, bench } = stage()
    const documentBefore = JSON.stringify(documentOf(bench))
    const outcome = write(api, [{ kind: 'setTaskGroupName', taskGroupId: 'g1', name: 'New', label: 'Old' }])
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.refusal.reason).toBe('malformedRequest')
    expect(JSON.stringify(documentOf(bench))).toBe(documentBefore)
  })
})

describe('CR-778 -- table T-064 PI-39 drops GrabbedVerticalAxis; the grab state machine carries no axis', () => {
  it('no entry of PI-39 is named GrabbedVerticalAxis, and the printed table does not mention it', () => {
    const row = PUBLISHED.rows.find((one: any) => one.id === 'PI-39')
    expect(row, 'PI-39 still exists').toBeDefined()
    expect(row.members.map((m: any) => m.name)).not.toContain('GrabbedVerticalAxis')
    expect(JSON.stringify(PUBLISHED)).not.toContain('GrabbedVerticalAxis')
    const table = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-published-entries.md'), 'utf8')
    expect(table).not.toContain('GrabbedVerticalAxis')
  })

  it('taskGroupGrabStateMachine has three states, carries no value, and names no axis', () => {
    let machine: any = null
    for (const region of MACHINES.regions) {
      for (const one of region.machines ?? []) if (one.name === 'taskGroupGrabStateMachine') machine = one
    }
    expect(machine, 'taskGroupGrabStateMachine is in state-machines.json').not.toBeNull()
    expect(machine.states.map((s: any) => s.key)).toEqual(['notGrabbed', 'grabPressed', 'carrying'])
    for (const state of machine.states) expect(state.carries, state.key).toEqual([])
    expect(JSON.stringify(machine).toLowerCase()).not.toContain('axis')
  })
})
