import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const R = process.cwd() + '/' // run from the repository root
const S = pathToFileURL(R).href
const dc = await import(S + 'src/adapter/document-codec/document-codec.ts')
const ed = await import(S + 'src/use-case/edit-document/edit-document.ts')
const blank = dc.documentFromJson(readFileSync(R + 'sample-schedule/No Name.json', 'utf8'))
const m = dc.documentFromMspdi(readFileSync(R + 'sample-schedule/sample-small-website-renewal.en.xml', 'utf8'), blank.document)
if (!m.ok) throw new Error('import')
const doc = m.document, sch = doc.schedule
// a leaf row (no child rows) whose one member task carries FreeSlack
const childless = new Set(sch.taskGroups.map((g: any) => g.id)); for (const g of sch.taskGroups) if (g.parentId) childless.delete(g.parentId)
const member = sch.taskGroupMembers.find((mm: any) => childless.has(mm.groupId) && sch.tasks.find((t: any) => t.uid === mm.taskUid)?.carry?.FreeSlack !== undefined && sch.tasks.find((t:any)=>t.uid===mm.taskUid).dependencies.length>0)
  ?? sch.taskGroupMembers.find((mm: any) => childless.has(mm.groupId) && sch.tasks.find((t: any) => t.uid === mm.taskUid)?.carry?.FreeSlack !== undefined)
const src = sch.tasks.find((t: any) => t.uid === member.taskUid)
console.log('row', member.groupId, 'task', src.uid, 'carry FreeSlack', src.carry.FreeSlack, 'TotalSlack', src.carry.TotalSlack)
const limits = { zoomMin: 0.02, zoomMax: 50, rowAreaWidthWithoutPanels: 1000 }
const res = ed.editDocument(doc, { kind: 'pasteTaskGroupSubtree', sourceGroupId: member.groupId, targetGroupId: null, newGroupIds: { [member.groupId]: 'fresh-row' } }, limits, 'Row')
if (!res.ok) { console.log('refused', JSON.stringify(res)); process.exit(0) }
const after = res.document.schedule
const copy = after.tasks[after.tasks.length - 1]
console.log('row paste copy uid', copy.uid, 'carry FreeSlack', copy.carry.FreeSlack, 'TotalSlack', copy.carry.TotalSlack)
const x = dc.mspdiFromDocument(res.document).text
const block = x.split('<Task>').find((b: string) => b.includes(`<UID>${copy.uid}</UID>`)) ?? ''
console.log('exported copy has FreeSlack:', /<FreeSlack>/.test(block), (block.match(/<FreeSlack>[^<]*<\/FreeSlack>|<TotalSlack>[^<]*<\/TotalSlack>/g) ?? []).join(' '))
const res2 = ed.editDocument(doc, { kind: 'pasteTaskSubtree', sourceUids: [src.uid] } as any, limits, 'Row')
console.log('task paste ok', res2.ok, res2.ok ? JSON.stringify(res2.document.schedule.tasks.at(-1).carry.FreeSlack) : JSON.stringify(res2).slice(0,300))
