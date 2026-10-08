// DFC-1280, DFC-1410: table T-280 / T-283 / T-290 name the Esc words, the close targets and the confirmation questions the screen sends.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable } from './spec-table'

const TABLES = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8')
const lineOf = (needle: string): string => TABLES.split('\n').find((line) => line.startsWith(needle)) ?? ''

describe('DFC-1280 -- the words of an Esc rung and of a close target are named', () => {
  it('surfaceCloseAsked carries a target, and its three words are surface, panel and helpModal', () => {
    const line = lineOf('| `screen/surfaceCloseAsked`')
    expect(line).not.toBe('')
    for (const word of ['`target`', '`surface`', '`panel`', '`helpModal`']) expect(line, word).toContain(word)
  })

  it('escapePressed carries a rung, and the rung words of the search panel, the help, the report and the dialogue field are named in table T-283', () => {
    expect(lineOf('| `screen/escapePressed`')).toContain('`rung`')
    const rungs = TABLES.split('\n').filter((line) => line.startsWith('| RG-'))
    const named = rungs.join('\n')
    for (const word of ['searchPanel', 'helpModal', 'delayDiagnosticsReport', 'dialogueField']) expect(named, word).toContain(word)
  })
})

describe('DFC-1410 -- every question a change can raise is named by the confirmation square', () => {
  const raised = lineOf('| `fileFlow/changeQuestionRaised`')

  it('changeQuestionRaised lists QN-10 with its entrances IC-106 and HF-20 beside QN-1, QN-2 and QN-3', () => {
    for (const word of ['QN-1', 'QN-2', 'QN-3', 'QN-10', 'IC-106', 'HF-20']) expect(raised, word).toContain(`\`${word}\``)
  })

  it('the question it carries names QN-10 as well', () => {
    expect(raised).toMatch(/`question`（[^）]*`QN-10`[^）]*）/)
  })

  it('the state questionAsked carries QN-10 among its questions', () => {
    const asked = TABLES.split('\n').find((line) => line.includes('confirmationStateMachine.questionAsked') && line.includes('QN-10'))
    expect(asked, 'no line names questionAsked together with QN-10').toBeDefined()
  })

  it('every question the table names is a row of table T-234 (a retired question is named nowhere)', () => {
    const named = new Set(TABLES.match(/QN-\d+/g) ?? [])
    const defined = new Set(specTable('T-234').rows.map((row) => row.id))
    expect([...named].filter((id) => !defined.has(id))).toEqual([])
  })
})
