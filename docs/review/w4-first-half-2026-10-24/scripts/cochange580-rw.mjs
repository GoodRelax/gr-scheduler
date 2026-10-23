// Co-change between planned units of mspdi-codec.ts: map -U0 hunks to the enclosing top-level declaration.
import { execFileSync } from 'node:child_process'
import { parseAst } from 'rolldown/parseAst'
const FILE = 'src/adapter/document-codec/mspdi-codec.ts'
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 })
const UNITS = {
  write: 'writtenProjectColumns writtenProjectChildren writtenTasks writtenTask writtenConstraintOfGrs writtenStop writtenActualDuration writtenDependency writtenResources writtenAssignment writtenCalendar writtenWeekDay writtenException writtenWorkingTimes tasksInWbsOrder rankOfSibling taskDepths outlineNumbers splicedCarriedRows durationOfMinutes collection latestTaskFinish mspdiFromDocument optionalLeaf leaf absentLeaf withoutLeaves CONSTRAINT_LEAVES MUST_START_ON GRS_SAVE_VERSION UNSTATED_CURRENCY_CODE isCarriedRow ExportRun WHOLE_UNITS ONE_OCCURRENCE ENDS_BY_FINISH_DATE MspdiEncoding',
  read: 'documentFromMspdi scheduleFromRoot projectFromRoot withSourceNamespace timeColumn tasksFromRoot taskFromElement linksOfTask dependenciesFromTask resourcesFromRoot assignmentsFromRoot calendarsFromRoot weekDaysOfCalendar workingTimesOf consumedWithWorkingTimes exceptionsOfCalendar carrySplit carriedElement keepFirstLeaf duplicateLeafCount withStopsFromActualDurations minutesOfActualDuration minutesOfDuration tellRoundedActualDurations workingDaysOfActualDuration outlineBaseOf lastIndexShallowerThan countOfChildrenSoFar summaryTargetOf isProjectSummary TASK_CONSUMED RESOURCE_CONSUMED ASSIGNMENT_CONSUMED CALENDAR_CONSUMED WEEKDAY_CONSUMED EXCEPTION_CONSUMED DEPENDENCY_CONSUMED PROJECT_CONSUMED TasksReading ResourcesReading AssignmentsReading CalendarsReading LinksReading TaskColumnsOfFile ImportRun CarrySplit MspdiDecoding textColumn integerColumn booleanColumn isTrue childOf leafText wholeNumberOf',
  movedOut: 'CHILD_ORDER CUSTOM_FIELD_FRAMES ChildAnchors ClaimedFrame CustomFieldFrame EXTENDED_ATTRIBUTES_AT FadeColumn FadeDefinitions FadeReading ImportedRows MspdiFault NAMED_REFERENCES NAME_REST NAME_START OpenElement PARENT_ORDERS ParentOrder ParentPath PlacedChild RankedChild StartTagReading UndeclaredPlaces XmlElement XmlReading aliasOfColumn aliasesOfDefinitions assignmentFieldCodes carriedDefinitions claimedFrames declaredRank decodedText deepestAncestorRow definitionOfFrame escapedText fadeColumnOf fadeColumnsByFieldId fadeOfCarried fault heldInArrivalOrder inSchemaOrder isAliasUsable localName mergedInArrival placedChildren placesByNeighbour readStartTag readXml rowIdOfTask rowsFromTasks undeclaredByNeighbour writtenCarriedElement writtenChildren writtenFadeDefinitions writtenFadeValues writtenXml',
}
const unitOf = {}
for (const [u, n] of Object.entries(UNITS)) for (const x of n.split(' ')) unitOf[x] = u
function decls(text) {
  if (!text) return []
  const starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  const line = off => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= off) lo = m; else hi = m - 1 } return lo + 1 }
  let prog; try { prog = parseAst(text, { lang: 'ts', sourceType: 'module' }, 'x.ts') } catch { return null }
  let prev = 0; const out = []
  for (const s of prog.body) {
    const d = s.type.startsWith('Export') && s.declaration ? s.declaration : s
    const name = d.id ? d.id.name : d.declarations ? d.declarations.map(x => x.id.name).join(',') : (s.type === 'ImportDeclaration' || s.source) ? '(imports)' : '?'
    out.push({ name, from: prev + 1, to: line(s.end) }); prev = line(s.end)
  }
  return out
}
const at = (ds, n) => ds.find(d => n >= d.from && n <= d.to)?.name ?? '(tail)'
const commits = git('log', '--no-merges', '--format=%H %s', '-n', '80', '--', FILE).trim().split('\n')
const unknown = new Set(); const rows = []
for (const c of commits) {
  const [sha, ...subj] = c.split(' ')
  let before = ''; try { before = git('show', `${sha}^:${FILE}`) } catch {}
  let after = ''; try { after = git('show', `${sha}:${FILE}`) } catch {}
  const diff = git('diff', '-U0', `${sha}^`, sha, '--', FILE)
  const dB = decls(before), dA = decls(after)
  const total = Math.max(before.split('\n').length, 1)
  let changed = 0; const touched = new Set(); let codeChanged = false
  let oldN = 0, newN = 0
  for (const l of diff.split('\n')) {
    const h = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(l)
    if (h) { oldN = +h[1]; newN = +h[3]; if (h[2] === '0') oldN += 0.5; if (h[4] === '0') newN += 0.5; continue }
    if (l.startsWith('---') || l.startsWith('+++')) continue
    if (l.startsWith('-') || l.startsWith('+')) {
      const body = l.slice(1).trim()
      const isComment = body === '' || body.startsWith('//') || body.startsWith('*') || body.startsWith('/*')
      changed += 1
      const name = l.startsWith('-') ? at(dB ?? [], Math.floor(oldN)) : at(dA ?? [], Math.floor(newN))
      if (l.startsWith('-')) oldN = Math.floor(oldN) + 1; else newN = Math.floor(newN) + 1
      if (isComment) continue
      codeChanged = true
      if (name === '(imports)' || name === '(tail)' || unitOf[name] === 'movedOut') continue
      const u = unitOf[name] ?? 'entry'
      if (!(name in unitOf)) unknown.add(name)
      touched.add(u)
    }
  }
  const big = before === '' || changed >= total / 2
  rows.push({ sha: sha.slice(0, 9), subj: subj.join(' ').slice(0, 70), units: [...touched].sort(), big, codeChanged, changed })
}
for (const r of rows) console.log(`${r.sha} ${r.big ? 'BIG ' : ''}${r.codeChanged ? '' : 'COMMENT-ONLY '}[${r.units.join(',')}] ${r.subj}`)
const SKIP = new Set((process.env.SKIP ?? '').split(' ').filter(Boolean))
const kept = rows.filter(r => !r.big && r.codeChanged && r.units.length > 0 && !SKIP.has(r.sha))
const names = ['entry', ...Object.keys(UNITS).filter(n => n !== 'movedOut')]
const count = Object.fromEntries(names.map(n => [n, kept.filter(r => r.units.includes(n)).length]))
console.log('\nkept commits', kept.length, JSON.stringify(count))
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
  const a = names[i], b = names[j]; const both = kept.filter(r => r.units.includes(a) && r.units.includes(b)).length
  const small = Math.min(count[a], count[b]); console.log(`${a} ~ ${b}: ${both}/${small}${small ? ' = ' + (both / small).toFixed(2) : ''}`)
}
console.log('\nentry-mapped names seen:', [...unknown].sort().join(' '))
