// CR-760 spec-only cases: readSearchRows (AM-25) answers the marker without the diagnosis and Task.milestone, and its MCP description sends exact delay analysis to readDelayDiagnostics (AM-19)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { cellOf } from './cr-731-stage'
import { AM_19_EXACT, AM_19_SEARCH_ONLY, AM_25_NO_DIAGNOSIS, AM_25_POINTS_TO, AM_25_STATUS } from './cr-760-clauses'
import {
  MARKER_TASKS,
  agentApiOf,
  diagnosisRowsOf,
  markerDocument,
  markerTask,
  markerWithoutDiagnosis,
  readSearchRowsOf,
  searchShown,
  stageIn,
  type WindowStage,
} from './cr-760-stage'

const DESCRIPTIONS = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'adapter', 'mcp-tool-translator', 'mcp-tool-descriptions.json'), 'utf8'),
) as { readonly tools: readonly { readonly name: string; readonly description: string }[] }

const descriptionOf = (name: string): string => {
  const found = DESCRIPTIONS.tools.find((one) => one.name === name)
  if (found === undefined) throw new Error(`the MCP descriptions hold no ${name}`)
  return found.description
}

const AGENT_API_MEMBER_LINES = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-agent-api-members.md'), 'utf8').split(/\r?\n/)

// WHY: the generated description reads each <br> of the T-107 cell as a newline, and the parsed table has dropped them.
const linesOfAgentCell = (id: string, opening: string): readonly string[] => {
  const line = AGENT_API_MEMBER_LINES.find((one) => one.startsWith(`| ${id} |`))
  const cell = line?.split(' | ').find((one) => one.startsWith(opening))
  if (cell === undefined) throw new Error(`table T-107 has no cell of ${id} opening with ${opening}`)
  return cell.split(/<br\s*\/?>/i).map((one) => one.trim()).filter((one) => one !== '')
}

interface Row {
  readonly taskUid: number
  readonly progressMarker: unknown
  readonly milestone: unknown
}

const rowsOf = (stage: WindowStage): readonly Row[] =>
  readSearchRowsOf(agentApiOf(stage), '').taskRows.map((one) => ({
    taskUid: Number(one['taskUid']),
    progressMarker: one['progressMarker'],
    milestone: one['milestone'],
  }))

function expectMarkersWithoutDiagnosis(rows: readonly Row[]): void {
  expect(rows.map((one) => one.taskUid).sort((a, b) => a - b)).toEqual(MARKER_TASKS.map((one) => one.uid).sort((a, b) => a - b))
  for (const row of rows) {
    const task = markerTask(row.taskUid)
    expect(row.progressMarker, `${task.name}: the marker without the diagnosis`).toBe(markerWithoutDiagnosis(task))
    expect(row.milestone, `${task.name}: Task.milestone`).toBe(task.spec.milestone === true)
  }
}

describe('T-107 AM-25 / AM-19 -- the manuscript these cases read', () => {
  it('AM-25 answers the status without the diagnosis, does no diagnosis, and points to readDelayDiagnostics', () => {
    const does = cellOf('T-107', 'AM-25', '何を担うか')
    for (const clause of [AM_25_STATUS, AM_25_NO_DIAGNOSIS, AM_25_POINTS_TO]) expect(does).toContain(clause)
  })

  it('AM-19 is where the exact delay analysis is read, and says readSearchRows only compares with the status date', () => {
    const does = cellOf('T-107', 'AM-19', '何を担うか')
    for (const clause of [AM_19_EXACT, AM_19_SEARCH_ONLY]) expect(does).toContain(clause)
  })

  it('premise: the document holds late tasks, a milestone, and tasks the diagnosis names DG-1 .. DG-3', () => {
    expect(MARKER_TASKS.some((one) => one.late !== null)).toBe(true)
    expect(MARKER_TASKS.some((one) => one.spec.milestone === true)).toBe(true)
    expect(new Set(diagnosisRowsOf(markerDocument()).byUid.values())).toEqual(new Set(['DG-1', 'DG-2', 'DG-3']))
  })
})

describe(`T-107 AM-25 readSearchRows -- ${AM_25_STATUS}`, () => {
  it('without the diagnosis each task row carries progressMarker (PM-4 when late) and milestone', async () => {
    expectMarkersWithoutDiagnosis(rowsOf(await stageIn(markerDocument(), 'ja')))
  })

  it('while the diagnosis is shown the rows are the same: no DG-1, DG-2 or DG-3 ever', async () => {
    const stage = await stageIn(markerDocument(), 'ja')
    await stage.press('IC-107')
    expect(stage.last().searchPanel ?? null, 'premise: the Search Panel is not needed for AM-25').toBeNull()
    const rows = rowsOf(stage)
    expect(rows.filter((one) => String(one.progressMarker).startsWith('DG-'))).toEqual([])
    expectMarkersWithoutDiagnosis(rows)
  })

  it('with the Search Panel open beside the diagnosis, the panel shows DG rows and readSearchRows still does not', async () => {
    const stage = await stageIn(markerDocument(), 'ja')
    await stage.press('IC-107')
    await searchShown(stage)
    const glyphs = (stage.last().searchPanel?.rows ?? []).map((one) => String(one.glyph))
    expect(glyphs.some((one) => one.startsWith('DG-')), 'premise: the panel shows the diagnosis').toBe(true)
    expectMarkersWithoutDiagnosis(rowsOf(stage))
  })
})

describe(`T-107 AM-25 -- the MCP description says ${AM_25_NO_DIAGNOSIS}`, () => {
  it('the description of readSearchRows is the AM-25 cell, line for line', () => {
    const description = descriptionOf('readSearchRows')
    const lines = linesOfAgentCell('AM-25', '語を 1 つ受け')
    expect(lines.length, 'premise: the cell has its lines').toBeGreaterThan(3)
    for (const line of lines) expect(description).toContain(line)
  })

  it('it says no delay diagnosis is done, and names readDelayDiagnostics for the exact analysis', () => {
    const description = descriptionOf('readSearchRows')
    expect(description).toContain(AM_25_NO_DIAGNOSIS)
    expect(description).toContain('readDelayDiagnostics')
  })

  it('the description of readDelayDiagnostics says it returns the exact analysis', () => {
    expect(descriptionOf('readDelayDiagnostics')).toContain(AM_19_EXACT)
  })
})
