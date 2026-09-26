import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const R = process.cwd() + '/' // run from the repository root
const S = pathToFileURL(R).href
const dc = await import(S + 'src/adapter/document-codec/document-codec.ts')
const vi = await import(S + 'src/use-case/validate-imported-document/validate-imported-document.ts')
const sc = await import(S + 'src/entity/document-model/schedule/schedule.ts')
const blank = dc.documentFromJson(readFileSync(R + 'sample-schedule/No Name.json', 'utf8'))
let xml = readFileSync(R + 'sample-schedule/sample-small-website-renewal.en.xml', 'utf8')
// make the 3rd <Task> reuse the 2nd <Task>'s UID
const parts = xml.split('<Task>')
const uidOf = (p: string) => /<UID>(\d+)<\/UID>/.exec(p)![1]
console.log('task uids head', parts.slice(1, 5).map(uidOf))
parts[3] = parts[3].replace(/<UID>\d+<\/UID>/, `<UID>${uidOf(parts[2])}</UID>`)
xml = parts.join('<Task>')
const m = dc.documentFromMspdi(xml, blank.document)
console.log('import ok', m.ok, m.ok ? '' : JSON.stringify(m.faults).slice(0, 300))
if (m.ok) {
  const uids = m.document.schedule.tasks.map((t: any) => t.uid)
  console.log('duplicate uids held:', uids.length - new Set(uids).size)
  const v = vi.validateImportedDocument({ document: m.document, byteLength: xml.length, emptyRowTaskUids: [] }, blank.document.documentSettings)
  console.log('validateImportedDocument', JSON.stringify(v).slice(0, 300))
  console.log('scheduleViolations', JSON.stringify(sc.scheduleViolations(m.document.schedule, m.document.documentSettings).map((x: any) => x.row)).slice(0, 200))
}
