import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const R = process.cwd() + '/' // run from the repository root
const S = pathToFileURL(R).href
const dc = await import(S + 'src/adapter/document-codec/document-codec.ts')
const ed = await import(S + 'src/use-case/edit-document/edit-document.ts')
const sc = await import(S + 'src/entity/document-model/schedule/schedule.ts')
const vi = await import(S + 'src/use-case/validate-imported-document/validate-imported-document.ts')
const blank = dc.documentFromJson(readFileSync(R + 'sample-schedule/No Name.json', 'utf8'))
const m = dc.documentFromMspdi(readFileSync(R + 'sample-schedule/sample-small-website-renewal.en.xml', 'utf8'), blank.document)
const doc = m.document; const g = doc.schedule.taskGroups[0].id
console.log('importMaxDate', doc.documentSettings.importMaxDate)
const limits = { zoomMin: 0.02, zoomMax: 50, rowAreaWidthWithoutPanels: 1000 }
const hb = ed.editDocument(doc, { kind: 'createHighlightBox', id: 'hb1', range: { startDate: '2300-01-01', endDate: '2300-01-05', topGroupId: g, bottomGroupId: g } }, limits, 'Row')
console.log('createHighlightBox 2300 accepted:', hb.ok)
const cb = ed.editDocument(doc, { kind: 'createCommentBox', id: 'cb1', anchor: { date: '2300-01-01', groupId: g } }, limits, 'Row')
console.log('createCommentBox 2300 accepted:', cb.ok)
const t = doc.schedule.tasks.find((x: any) => x.start && x.wbsParentUid !== null)
const tk = ed.editDocument(doc, { kind: 'setTaskDeadline', uid: t.uid, deadline: '2300-01-01' } as any, limits, 'Row')
console.log('task deadline 2300 accepted:', tk.ok, tk.ok ? '' : JSON.stringify(tk.refusals ?? tk).slice(0, 200))
if (hb.ok) {
  const v = sc.scheduleViolations(hb.document.schedule, hb.document.documentSettings).filter((x: any) => x.row === 'IV-14' || JSON.stringify(x).includes('highlight'))
  console.log('scheduleViolations after edit:', JSON.stringify(v).slice(0, 300))
  const json = dc.jsonFromDocument(hb.document)
  const back = dc.documentFromJson(json)
  console.log('reopen decode ok:', back.ok)
  if (back.ok) {
    const verdict = vi.validateImportedDocument({ document: back.document, byteLength: json.length, emptyRowTaskUids: [] }, back.document.documentSettings)
    console.log('validateImportedDocument:', JSON.stringify(verdict).slice(0, 300))
  }
}
