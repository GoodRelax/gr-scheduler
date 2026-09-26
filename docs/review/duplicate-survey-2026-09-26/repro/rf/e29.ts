import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const S = pathToFileURL(process.cwd() + '/').href // run from the repository root
const dc = await import(S + 'src/adapter/document-codec/document-codec.ts')
const root = process.cwd() + '/'
const blank = dc.documentFromJson(readFileSync(root + 'sample-schedule/No Name.json', 'utf8'))
if (!blank.ok) { console.log('blank refused', blank.faults); process.exit(1) }
let xml = readFileSync(root + 'sample-schedule/sample-small-website-renewal.en.xml', 'utf8')
const emoji = process.env.ASCII ? 'A'.repeat(20) : String.fromCodePoint(0x1F600).repeat(9)
xml = xml.replace(/(<Project[^>]*>)/, `$1\n  <UID>${emoji}</UID>`)
const m = dc.documentFromMspdi(xml, blank.document)
console.log('mspdi import ok:', m.ok, 'project.id =', m.ok ? JSON.stringify(m.document.schedule.project.id) : m.faults, 'codepoints', [...emoji].length, 'units', emoji.length)
if (!m.ok) process.exit(0)
const json = dc.jsonFromDocument(m.document)
const back = dc.documentFromJson(json)
console.log('reopen saved GRS JSON ok:', back.ok, back.ok ? '' : JSON.stringify(back.faults), back.ok ? '' : back.reason)
