import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const R = process.cwd() + '/' // run from the repository root
const S = pathToFileURL(R).href
const dc = await import(S + 'src/adapter/document-codec/document-codec.ts')
const ed = await import(S + 'src/use-case/edit-document/edit-document.ts')
const raw = JSON.parse(readFileSync(R + 'sample-schedule/No Name.json', 'utf8'))
const wide = process.env.DEFAULT ? raw : { ...raw, documentSettings: { ...raw.documentSettings, importMaxDate: '2400-12-31' } }
const blank = dc.documentFromJson(JSON.stringify(wide))
console.log('open with importMaxDate', wide.documentSettings.importMaxDate, '->', blank.ok, blank.ok ? blank.document.documentSettings.importMaxDate : JSON.stringify(blank.faults))
const m = dc.documentFromMspdi(readFileSync(R + 'sample-schedule/sample-small-website-renewal.en.xml', 'utf8'), blank.document)
const doc = { ...m.document, documentSettings: blank.document.documentSettings }
const t = doc.schedule.tasks.find((x: any) => x.start && !doc.schedule.tasks.some((c: any) => c.wbsParentUid === x.uid))
const limits = { zoomMin: 0.02, zoomMax: 50, rowAreaWidthWithoutPanels: 1000 }
try {
  const r = ed.editDocument(doc, { kind: 'setTaskPlanActualState', uid: t.uid, place: { row: 'PA-5', actualStart: '1970-01-02', actualFinish: '2300-12-31' } } as any, limits, 'Row')
  console.log('edit actual 1970-01-02..2300-12-31:', r.ok, r.ok ? 'percent ' + r.document.schedule.tasks.find((x: any) => x.uid === t.uid).percentComplete : JSON.stringify(r.refusals).slice(0, 200))
} catch (e) { console.log('edit THROWS', (e as Error).name, (e as Error).message) }
