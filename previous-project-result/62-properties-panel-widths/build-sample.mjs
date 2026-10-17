// Builds index.html of sample 62: bundles sample-entry.ts (the shipped panel drawing code) into one file.
// Run from the repository root: node previous-project-result/62-properties-panel-widths/build-sample.mjs
// (a worktree without node_modules passes the rolldown path: ROLLDOWN=../../../node_modules/rolldown/dist/index.mjs)

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const rolldownAt = process.env.ROLLDOWN ?? 'rolldown'
const { rolldown } = await import(rolldownAt.startsWith('.') ? pathToFileURL(join(process.cwd(), rolldownAt)).href : rolldownAt)

// WHY: the startup sample holds 1000 tasks; the first ones and their task groups are enough for the panels.
const KEPT_TASKS = 40
const template = JSON.parse(readFileSync(join(here, '../../src/framework/single-html-shell/startup-template.json'), 'utf8'))
const kept = new Set(template.schedule.tasks.slice(0, KEPT_TASKS).map((one) => one.uid))
const members = template.schedule.taskGroupMembers.filter((one) => kept.has(one.taskUid))
const groups = new Set(members.map((one) => one.taskGroupId))
const schedule = {
  ...template.schedule,
  tasks: template.schedule.tasks.filter((one) => kept.has(one.uid)),
  taskGroupMembers: members,
  taskVisuals: template.schedule.taskVisuals.filter((one) => kept.has(one.taskUid)),
  assignments: template.schedule.assignments.filter((one) => kept.has(one.taskUid)),
  taskGroups: template.schedule.taskGroups.filter((one) => groups.has(one.id)),
}
const SAMPLE_DOCUMENT = 'sample-document'
const sampleDocument = {
  name: SAMPLE_DOCUMENT,
  resolveId: (id) => (id === SAMPLE_DOCUMENT ? id : null),
  load: (id) => (id === SAMPLE_DOCUMENT ? `export default ${JSON.stringify({ ...template, schedule })}` : null),
}

const bundle = await rolldown({ input: join(here, 'sample-entry.ts'), platform: 'browser', plugins: [sampleDocument] })
const { output } = await bundle.generate({ format: 'iife', minify: true })
const code = output[0].code.replace(/<\/script/gi, '<\\/script')

const page = readFileSync(join(here, 'page-shell.html'), 'utf8').replace('/*BUNDLE*/', () => code)
writeFileSync(join(here, 'index.html'), page)
console.log(`index.html written, ${Math.round(page.length / 1024)} KiB`)
