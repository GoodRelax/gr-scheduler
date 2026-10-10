// CR-551: the Agent API import (AM-8) refuses a document the codec refuses, whatever shape it is handed in (AG-9a, RS-25).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { installAgentApi, type AgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { unbroken } from '../contract/spec-table'
import { taskGroupDocument, shell, taskOf, TEMPLATE, type ShellBench } from './cr-541-stage'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const GLOSSARY = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8'))
const NOTICE_ROSTER = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-notice-reasons.md'), 'utf8'))

const AG_9A_REASON =
  '取り込みの検証（`FR-023`）が拒んだときの理由の区分は、拒んだ `05-07-design.md` の 表 T-220 の行の行 ID とすること（MUST）'
const AG_9A_NOT_ONE = '理由の区分を 1 つの値へ潰してはならない（MUST NOT）'
const RS_25 = '| RS-25 | 読んだ `GRS JSON` の列が、決められた形に合わない |'
const CV_1 = '描いた値（`#rrggbb`）を保存してはならない（MUST NOT）'
const AM_8 = '| AM-8 | 書く | `importDocument` |'

// WHY: a drawn value in a color column, which CV-1 forbids and the column's shape does not take.
const FORBIDDEN_COLOR = 'rgb(255,0,0)'

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

function documentOf(fillColor: string | null): Record<string, any> {
  const document = taskGroupDocument([{ id: 'g1', parentId: null }])
  document.schedule.tasks = [taskOf(1, { name: 'Imported', start: '2026-05-04T08:00:00', finish: '2026-05-15T17:00:00' })]
  document.schedule.taskVisuals = [
    { taskUid: 1, shapeKind: null, milestoneGlyph: null, fillColor, strokeColor: null, strokeWidthPx: null },
  ]
  return document
}

function apiOn(): { api: AgentApi; bench: ShellBench } {
  const bench = shell(taskGroupDocument([{ id: 'g1', parentId: null }]))
  benches.push(bench)
  const api = installAgentApi({
    ...bench.loop.agentApiSeams(),
    writerName: 'cr-551 import',
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
  } as never)
  return { api, bench }
}

const shapesOf = (document: Record<string, any>) =>
  [
    ['{ text }', { text: JSON.stringify(document) }],
    ['{ document }', { document }],
    ['the bare document', document],
  ] as const

describe('AM-8 -- importDocument checks the document whatever shape it comes in', () => {
  it('AG-9a / RS-25 / CV-1 / AM-8 still say: 表 T-220 の行の行 ID / 1 つの値へ潰さない / 決められた形に合わない / 描いた値を保存しない', () => {
    expect(REQUIREMENTS).toContain(AG_9A_REASON)
    expect(REQUIREMENTS).toContain(AG_9A_NOT_ONE)
    expect(NOTICE_ROSTER).toContain(RS_25)
    expect(REQUIREMENTS).toContain(CV_1)
    expect(GLOSSARY).toContain(AM_8)
  })

  it('premise: the codec refuses the document carrying a drawn color value, and accepts the same document with a palette name', () => {
    // see CV-1, RS-25
    const refused = documentFromJson(JSON.stringify(documentOf(FORBIDDEN_COLOR)))
    expect(refused.ok).toBe(false)
    expect(documentFromJson(JSON.stringify(documentOf('red'))).ok).toBe(true)
  })

  for (const [shape, source] of shapesOf(documentOf(FORBIDDEN_COLOR))) {
    it(`AM-8 / AG-9a: a document with ${FORBIDDEN_COLOR} handed as ${shape} is refused with the codec's reason, and nothing lands`, async () => {
      // see AM-8, AG-9a, RS-25, CV-1
      const codec = documentFromJson(JSON.stringify(documentOf(FORBIDDEN_COLOR)))
      const codecReason = codec.ok ? '' : codec.reason
      const { api, bench } = apiOn()
      const before = JSON.stringify(bench.loop.document().schedule)
      const outcome = await api.importDocument(source as never)
      expect(outcome.accepted).toBe(false)
      if (outcome.accepted) return
      expect(outcome.refusal.reason).toBe(codecReason)
      expect(JSON.stringify(bench.loop.document().schedule), 'nothing lands').toBe(before)
    })
  }
})
