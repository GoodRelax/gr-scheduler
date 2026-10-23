// Map each top-level declaration of mspdi-codec.ts to a planned unit; print line sums and write unit texts.
import { readFileSync, writeFileSync } from 'node:fs'
import { parseAst } from 'rolldown/parseAst'
const [file, outDir] = process.argv.slice(2)
const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const lines = text.split('\n')
if (lines[lines.length - 1] === '') lines.pop()
const prog = parseAst(text, { lang: 'ts', sourceType: 'module' }, file)
const starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
const line = off => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= off) lo = m; else hi = m - 1 } return lo + 1 }
function nm(s) {
  const d = s.type.startsWith('Export') && s.declaration ? s.declaration : s
  if (d.id) return d.id.name
  if (d.declarations) return d.declarations.map(x => x.id.name).join(',')
  if (s.type === 'ImportDeclaration') return 'import:' + s.source.value
  if (s.source) return 'reexport:' + s.source.value
  return '?'
}
export const UNITS = {
  carry: 'CarrySplit carrySplit carriedElement keepFirstLeaf duplicateLeafCount splicedCarriedRows',
  durations: 'STOP_COUNTED_FROM minutesOfDuration durationOfMinutes withStopsFromActualDurations minutesOfActualDuration writtenStop writtenActualDuration',
  calendars: 'CALENDAR_CONSUMED WEEKDAY_CONSUMED EXCEPTION_CONSUMED CalendarsReading calendarsFromRoot weekDaysOfCalendar WORKING_TIMES workingTimesOf consumedWithWorkingTimes exceptionsOfCalendar ONE_OCCURRENCE ENDS_BY_FINISH_DATE writtenCalendar writtenWeekDay writtenException writtenWorkingTimes',
  resources: 'RESOURCE_CONSUMED ResourcesReading resourcesFromRoot writtenResources',
  assignments: 'ASSIGNMENT_CONSUMED AssignmentsReading assignmentsFromRoot WHOLE_UNITS writtenAssignment',
  tasks: 'TASK_CONSUMED DEPENDENCY_CONSUMED TasksReading outlineBaseOf tasksFromRoot lastIndexShallowerThan countOfChildrenSoFar TaskColumnsOfFile taskFromElement LinksReading linksOfTask writtenTasks tasksInWbsOrder rankOfSibling taskDepths outlineNumbers writtenTask CONSTRAINT_LEAVES MUST_START_ON writtenConstraintOfGrs writtenDependency',
}
const unitOf = {}
for (const [u, names] of Object.entries(UNITS)) for (const n of names.split(' ')) unitOf[n] = u
const rows = []
let prevEnd = 4 // header lines 1-4 belong to the entry
for (const s of prog.body) {
  const a = line(s.start), b = line(s.end), name = nm(s)
  rows.push({ name, from: prevEnd + 1, decl: a, to: b, unit: unitOf[name] ?? 'entry' })
  prevEnd = b
}
const sums = {}; const texts = { entry: lines.slice(0, 4) }
for (const r of rows) {
  sums[r.unit] = (sums[r.unit] ?? 0) + (r.to - r.from + 1)
  ;(texts[r.unit] ??= []).push(...lines.slice(r.from - 1, r.to))
}
sums.entry += 4
const trailing = lines.length - prevEnd
console.log('total lines', lines.length, 'trailing', trailing)
console.log(JSON.stringify(sums), 'sum', Object.values(sums).reduce((x, y) => x + y, 0))
for (const u of Object.keys(UNITS)) texts[u] = ['// header 1', '// @unit', '// @component', '// @purity    pure', ...texts[u]]
if (outDir) for (const [u, t] of Object.entries(texts)) writeFileSync(`${outDir}/${u}.ts`, t.join('\n') + '\n')
if (process.argv[4] === 'rows') for (const r of rows) console.log(`${r.from}-${r.to} ${r.unit} ${r.name}`)
for (const n of Object.keys(unitOf)) if (!rows.some(r => r.name === n)) console.log('MISSING', n)
