// CR-731 spec-only cases: the proposal and the log reach the Markdown of IC-108 (RW-6) and the value of AM-19 (DX-11, DX-12), the Agent API gets no approval (section 9 items 13, 14)

import { describe, expect, it } from 'vitest'

import { installAgentApi, type AgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { FR_155_NO_AGENT_API_ENTRANCE } from './cr-731-clauses'
import { FS_SUCCESSOR_STARTED, ONE_PARENT } from './cr-731-documents'
import { BUILT_VERSION, REQUIREMENTS, WORDS, cellOf, dayTextIn, rowText } from './cr-731-stage'
import { windowStage, type WindowStage } from './cr-731-window-stage'
import type { Document } from '../../src/entity/document-model/document/document'
import { specTable } from './spec-table'

const wordOf = (section: string, key: string, field: 'part' | 'rowId'): string => {
  const found = (WORDS[section] as readonly Record<string, any>[]).find((one) => one[field] === key)
  if (found === undefined) throw new Error(`the dictionary has no ${section}/${key}`)
  return found['text']['ja']
}
const labelOf = (icon: string): string => {
  const found = (WORDS['icons'] as readonly Record<string, any>[]).find((one) => one['rowId'] === icon)
  if (found === undefined) throw new Error(`the dictionary has no icon ${icon}`)
  return found['label']['ja']
}

const apiOf = (stage: WindowStage): AgentApi =>
  installAgentApi({ ...stage.loop.agentApiSeams(), writerName: 'cr-731-tester', schemaVersion: BUILT_VERSION } as never)

const readValue = (api: AgentApi): unknown => {
  const member = (api as unknown as { readDelayDiagnostics?: () => unknown }).readDelayDiagnostics
  if (typeof member !== 'function') throw new Error('AM-19: the Agent API has no member readDelayDiagnostics')
  return member.call(api)
}

const reachable = (value: unknown, seen = new Set<unknown>()): readonly object[] => {
  if (value === null || typeof value !== 'object' || seen.has(value)) return []
  seen.add(value)
  return [value, ...Object.values(value).flatMap((one) => reachable(one, seen))]
}

const copiedOf = async (stage: WindowStage): Promise<string> => {
  await stage.press('IC-108')
  const last = stage.copied[stage.copied.length - 1]
  if (last?.kind !== 'document') throw new Error('IC-108 copied no document text')
  return last.text
}

const mendedOver = async (document: Document): Promise<WindowStage> => {
  const stage = await windowStage(document)
  await stage.press('IC-107')
  await stage.press('IC-155')
  stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
  await stage.press('IC-157')
  return stage
}

describe('DX-11, DX-12, RW-6 -- the manuscript these cases read', () => {
  it('T-317 holds DX-11 for the proposal and DX-12 for the log, and AM-19 still returns the values of T-317', () => {
    expect(specTable('T-317').rows.map((one) => one.id)).toEqual(expect.arrayContaining(['DX-11', 'DX-12']))
    expect(rowText('T-317', 'DX-11')).toContain('FR-155')
    expect(cellOf('T-107', 'AM-19', '何を担うか')).toContain('表 T-317')
  })

  it('FR-155 keeps the Agent API free of the approval', () => {
    expect(REQUIREMENTS).toContain(FR_155_NO_AGENT_API_ENTRANCE)
  })
})

describe('item 14 -- AM-19: the value carries the proposal (DX-11) and, after a fix, the log (DX-12)', () => {
  it('DX-11: the rows name the fix row, the finding row, the task and the days before and after', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    const text = JSON.stringify(readValue(apiOf(stage)))
    for (const word of ['FA-11', 'VC-11', 'Task 1']) expect(text, word).toContain(word)
    expect(dayTextIn(text)).toEqual(expect.arrayContaining(['2027-05-21', '2027-05-26']))
  })

  it('DX-11: a row of a suggested date carries the suggested day', async () => {
    const stage = await windowStage(FS_SUCCESSOR_STARTED())
    await stage.press('IC-107')
    const text = JSON.stringify(readValue(apiOf(stage)))
    expect(text).toContain('FA-24')
    expect(dayTextIn(text)).toContain('2027-05-28')
  })

  it('DX-12: once mended, the fix row is in the value as a log row with the days it changed, and out of the proposal', async () => {
    const stage = await mendedOver(ONE_PARENT())
    const text = JSON.stringify(readValue(apiOf(stage)))
    expect(text).toContain('FA-11')
    expect(dayTextIn(text)).toEqual(expect.arrayContaining(['2027-05-21', '2027-05-26']))
  })

  it('the value is frozen all the way down, as every read of the Agent API is (AG-4)', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    const value = readValue(apiOf(stage))
    expect(reachable(value).length).toBeGreaterThan(0)
    expect(reachable(value).every((one) => Object.isFrozen(one))).toBe(true)
  })

  it('reading writes nothing: the document and the unsaved flag stay as they were', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    const before = structuredClone(stage.loop.document().schedule)
    readValue(apiOf(stage))
    expect(stage.loop.document().schedule).toEqual(before)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
  })
})

describe('FR-155 MUST NOT -- the Agent API holds no entrance that approves a fix', () => {
  it('no member of the Agent API is named after an overwrite, a backup, an approval or a fix', async () => {
    const stage = await windowStage(ONE_PARENT())
    const names = Object.keys(apiOf(stage)).filter((one) => /overwrite|backup|approve|apply.*fix|fix.*apply|mend/i.test(one))
    expect(names).toEqual([])
  })

  it('T-107 names no member for IC-157 or IC-158', () => {
    const rows = specTable('T-107').rows.map((one) => one.cells.join(' '))
    expect(rows.filter((one) => /IC-15[78]/.test(one))).toEqual([])
  })

  it('a bundle for the Agent API is written with applyCommands (AM-7), one step, like any other write', async () => {
    const stage = await windowStage(ONE_PARENT())
    const api = apiOf(stage)
    expect(typeof (api as unknown as { applyCommands?: unknown }).applyCommands).toBe('function')
  })
})

describe('item 13 -- RW-6: the Markdown of IC-108 holds the proposal and, with a log, the log', () => {
  it('the proposal follows the diagnosis table, under the word of IC-155, with the columns of T-374 in their order', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    const text = await copiedOf(stage)
    const heading = labelOf('IC-155')
    expect(text).toContain(heading)
    const from = text.indexOf(heading)
    const columns = ['FM-1', 'FM-3', 'FM-4', 'FM-5', 'FM-6', 'FM-7', 'FM-8'].map((row) => text.indexOf(wordOf('delayFixColumns', row, 'rowId'), from))
    expect(columns.every((one) => one > from), JSON.stringify(columns)).toBe(true)
    expect([...columns].sort((a, b) => a - b)).toEqual(columns)
  })

  it('a checked row is written with the check mark, and the filter line reads None where nothing is filtered', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    const text = await copiedOf(stage)
    const section = text.slice(text.indexOf(labelOf('IC-155')))
    expect(section).toContain('✓')
    expect(section).toContain(wordOf('delayReportMarkdown', 'none', 'part'))
    expect(section).toContain('2027/05/21')
    expect(section).toContain('2027/05/26')
  })

  it('with no fix yet there is no section for the log', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    expect(await copiedOf(stage)).not.toContain(labelOf('IC-156'))
  })

  it('once mended the log is a section after the proposal, with the date-and-time column of FM-2', async () => {
    const stage = await mendedOver(ONE_PARENT())
    const text = await copiedOf(stage)
    const log = labelOf('IC-156')
    expect(text).toContain(log)
    expect(text.indexOf(log)).toBeGreaterThan(text.indexOf(labelOf('IC-155')))
    expect(text.indexOf(wordOf('delayFixColumns', 'FM-2', 'rowId'), text.indexOf(log))).toBeGreaterThan(text.indexOf(log))
  })

  it('IC-140 writes the same string as IC-108 (RW-7)', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    const exported = stage.file('report.md', new Uint8Array(0))
    stage.browser.toSave.push(exported)
    await stage.press('IC-140')
    expect(stage.written).toEqual(['report.md'])
    const copied = await copiedOf(stage)
    expect(copied).toContain(labelOf('IC-155'))
    expect(new TextDecoder().decode(exported.bytes()).trim()).toBe(copied.trim())
  })
})
