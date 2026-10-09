// CR-612 spec-only tests: FR-027 / MC-10 -- the shipped page carries the template in a non-running JSON container.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { REQUIREMENTS, TEMPLATE_TEXT } from './cr-610-file-flow-stage'
import { specTable } from './spec-table'

interface ScriptElement {
  readonly attributes: string
  readonly text: string
}

const DIST = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf8')
const TEMPLATE = JSON.parse(TEMPLATE_TEXT) as { schedule: { project: { name: string }; tasks: unknown[]; taskGroups: unknown[] } }
const FIXTURES = join(process.cwd(), 'tests', 'fixtures')
const EMBEDDED_ID = 'embedded-document'

const CONTAINER_MUST =
  'スクリプトとは別の、走らない JSON の容れ物として置くこと（MUST）'
const NOT_BUNDLED = 'スクリプトに束ねてはならない（MUST NOT）'

function numberIn(id: string): number {
  const cell = specTable('T-226').rows.find((one) => one.id === id)?.cells[1] ?? ''
  const found = /\d+/.exec(cell)
  if (found === null) throw new Error(`table T-226 row ${id} states no number`)
  return Number(found[0])
}

function scriptElements(html: string): readonly ScriptElement[] {
  const found: ScriptElement[] = []
  let at = 0
  for (;;) {
    const open = html.indexOf('<script', at)
    if (open < 0) return found
    const tagEnd = html.indexOf('>', open)
    const close = html.indexOf('</script>', tagEnd)
    if (tagEnd < 0 || close < 0) return found
    found.push({ attributes: html.slice(open + '<script'.length, tagEnd), text: html.slice(tagEnd + 1, close) })
    at = close + '</script>'.length
  }
}

const SCRIPTS = scriptElements(DIST)
const isJson = (one: ScriptElement): boolean => /type="application\/json"/.test(one.attributes)
const isModule = (one: ScriptElement): boolean => /type="module"/.test(one.attributes)

describe('FR-027 / MC-10 -- the manuscript still says it', () => {
  it('FR-027 puts the template in a non-running JSON container and forbids bundling it', () => {
    expect(REQUIREMENTS).toContain(CONTAINER_MUST)
    expect(REQUIREMENTS).toContain(NOT_BUNDLED)
    expect(specTable('T-025').rows.map((one) => one.id)).toContain('MC-10')
  })
})

describe('FR-027 (MUST / MUST NOT) -- the shipped dist/index.html', () => {
  it('FR-027: exactly one non-module JSON container is shipped, and it is not the BT-1 container', () => {
    const containers = SCRIPTS.filter(isJson)
    expect(containers, 'FR-027: the shipped page holds no template container').toHaveLength(1)
    expect(containers[0]?.attributes).not.toContain(`id="${EMBEDDED_ID}"`)
    expect(containers[0]?.attributes).toMatch(/\sid="[^"]+"/)
  })

  it('FR-027 / T-226: the container holds the template -- 100 task groups (TP-5) and 1000 Task (TP-6)', () => {
    const container = SCRIPTS.find(isJson)
    expect(container, 'FR-027: the shipped page holds no template container').toBeDefined()
    const document = JSON.parse(container?.text ?? 'null') as typeof TEMPLATE
    expect(document.schedule.taskGroups).toHaveLength(numberIn('TP-5'))
    expect(document.schedule.tasks).toHaveLength(numberIn('TP-6'))
  })

  it('FR-027 (MUST NOT): no module script carries the template', () => {
    const name = TEMPLATE.schedule.project.name
    expect(name.length).toBeGreaterThan(0)
    for (const script of SCRIPTS.filter(isModule)) {
      expect(script.text.includes(name), 'FR-027: the template is still bundled into the script').toBe(false)
    }
  })
})

describe('MC-10 (MUST) -- the measuring document', () => {
  it('MC-10: tests/fixtures holds a GRS JSON document of 100 task groups and 1000 Task, made by the template generator', () => {
    const measuring = readdirSync(FIXTURES)
      .filter((name) => name.endsWith('.json'))
      .map((name) => {
        try {
          return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8')) as Partial<typeof TEMPLATE>
        } catch {
          return {}
        }
      })
      .filter((one) => Array.isArray(one.schedule?.tasks) && one.schedule?.tasks.length === numberIn('TP-6'))
    expect(measuring, 'MC-10: no measuring document under tests/fixtures').toHaveLength(1)
    expect(measuring[0]?.schedule?.taskGroups).toHaveLength(numberIn('TP-5'))
  })
})
