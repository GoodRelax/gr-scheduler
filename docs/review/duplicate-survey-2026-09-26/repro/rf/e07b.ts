import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const R = process.cwd() + '/' // run from the repository root
const S = pathToFileURL(R).href
const dc = await import(S + 'src/adapter/document-codec/document-codec.ts')
const blank = dc.documentFromJson(readFileSync(R + 'sample-schedule/No Name.json', 'utf8'))
let xml = readFileSync(R + 'sample-schedule/sample-medium-sfa-webapp.en.xml', 'utf8')
const parts = xml.split('<Task>')
const lvl = (p: string) => Number(/<OutlineLevel>(\d+)<\/OutlineLevel>/.exec(p)?.[1] ?? -1)
const uid = (p: string) => /<UID>(\d+)<\/UID>/.exec(p)![1]
// find a level-1 task i followed by a level-3 descendant j before the next level-1
let i = -1, j = -1
for (let a = 1; a < parts.length && j < 0; a++) if (lvl(parts[a]) === 1) for (let b = a + 1; b < parts.length && lvl(parts[b]) > 1; b++) if (lvl(parts[b]) === 3) { i = a; j = b; break }
console.log('level-1 uid', uid(parts[i]), 'level-3 uid', uid(parts[j]), '-> give the level-3 task the level-1 uid')
const dupUid = uid(parts[i])
parts[j] = parts[j].replace(/<UID>\d+<\/UID>/, `<UID>${dupUid}</UID>`)
const m = dc.documentFromMspdi(parts.join('<Task>'), blank.document)
console.log('import ok', m.ok)
const rows = m.document.schedule.taskGroups
const out = dc.mspdiFromDocument(m.document).text
const levels = out.split('<Task>').filter((p: string) => new RegExp(`<UID>${dupUid}</UID>`).test(p)).map(lvl)
console.log('exported OutlineLevel of the two uid', dupUid, 'tasks:', levels, '(imported levels 1 and 3)')
