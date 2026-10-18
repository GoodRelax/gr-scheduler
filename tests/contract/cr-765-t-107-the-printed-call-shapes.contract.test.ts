// CR-765 spec-only tests: table T-107 as _assets/tbl-agent-api-members.md prints it, with its argument and return columns.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  PRINTED_TEXT,
  T_107_HEADINGS,
  printedMembers,
  type PrintedMember,
} from './cr-765-printed-tables'
import { specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')

const { caption, headings, members } = printedMembers()

const memberNamed = (name: string): PrintedMember => {
  const found = members.find((one) => one.name === name)
  if (found === undefined) throw new Error(`T-107 has no member ${name}`)
  return found
}

const GLOSSARY = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8'))

const GLOSSARY_POINTER = '表 T-107（`Agent API` のメンバ）と、その呼び方（引数・型・戻り値）は `_assets/tbl-agent-api-members.md` が持つ'
const VERSION_SENTENCE = 'いまの版は `2026-10-17T15:27:48Z` である（`AM-1` が返す値）。'
const CHANGE_RAISES_VERSION = '呼び方を変える変更は、版をその変更を当てる時刻へ上げる（表 T-035 の `AG-1`）。'
const TWENTY_TWO = '**`Agent API` は 1 つの面に 22 のメンバをフラットに並べる。**'
const CALL_SHAPES_ARE_GENERATED =
  '呼び方（引数の名・型・意味と戻り値）は本表と 表 T-400 が持つ** —— コードの `AgentApi` の型と、MCP の道具の入力の形は本表の原稿から生成し、手で書かない'

const AM_25_STATUS = 'ステータス（`SQ-5`）は、遅延診断を出していないときの値（`PM-4` か 表 T-019a の状態）で返す'
const AM_25_DIAGNOSIS_ELSEWHERE = '診断の値（表 T-315 の `DG-1` 〜 `DG-3`）は `AM-19` の 表 T-317 の `DX-8` が返す'
const AM_25_NO_DIAGNOSIS = '遅延診断はしない'
const AM_25_POINTS_AT_19 = '正確な遅延の解析には遅延診断（`readDelayDiagnostics`、`AM-19`）が要る'
const AM_19_RETURNS_ANALYSIS = '正確な遅延の解析（信用できない値・ボトルネック・ボトルネック経路）はこの命令が返す。'
const AM_19_POINTS_AT_25 = '`readSearchRows`（`AM-25`）の遅れは基準日との比べだけである'

// see T-107
const EXPECTED_ROWS: readonly (readonly [string, string, readonly string[], string])[] = [
  ['AM-1', 'agentApiVersion', [], 'string'],
  ['AM-2', 'schemaVersion', [], 'string'],
  ['AM-3', 'readDocument', [], 'Document'],
  ['AM-4', 'readStamp', [], 'DocumentStamp'],
  ['AM-5', 'readSelection', [], 'Selection'],
  ['AM-6', 'readDialogueMessages', [], 'readonly DialogueMessage[]'],
  ['AM-25', 'readSearchRows', ['word: string'], 'SearchRows'],
  ['AM-26', 'readShownTasks', [], 'AgentShownTasks'],
  ['AM-19', 'readDelayDiagnostics', [], 'AgentDelayDiagnostics'],
  ['AM-7', 'applyCommands', ['request: AgentWriteRequest'], 'AgentWriteOutcome'],
  ['AM-8', 'importDocument', ['source: AgentImportSource'], 'Promise<AgentImportOutcome>'],
  ['AM-9', 'undoEdit', [], 'AgentWriteOutcome'],
  ['AM-10', 'redoEdit', [], 'AgentWriteOutcome'],
  ['AM-11', 'exportJson', [], 'AgentExport<string>'],
  ['AM-12', 'exportMspdi', [], 'AgentExport<string>'],
  ['AM-13', 'exportSvg', [], 'AgentExport<string>'],
  ['AM-14', 'exportPng', [], 'Promise<AgentExport<Uint8Array>>'],
  ['AM-15', 'exportEmbeddedHtml', [], 'Promise<AgentExport<string>>'],
  ['AM-16', 'focusTask', ['taskUid: number'], 'AgentFocusOutcome'],
  ['AM-27', 'showOnlyTasks', ['taskUids: readonly number[]'], 'AgentWriteOutcome'],
  ['AM-17', 'watchChanges', ['receive: AgentChangeReceiver'], 'AgentWatch'],
  ['AM-18', 'postDialogueMessage', ['text: string'], 'AgentDialogueMessageOutcome'],
]

describe('T-107 is printed in one place, with the two columns CR-765 adds', () => {
  it('the shared table reader finds T-107 in tbl-agent-api-members.md and nowhere in the glossary', () => {
    expect(specTable('T-107').file).toBe(join('_assets', 'tbl-agent-api-members.md'))
    expect(GLOSSARY).not.toContain('**表 T-107 —')
    expect(GLOSSARY).toContain(GLOSSARY_POINTER)
  })

  it('the columns are the row id, group, confirmed name, kind and purity, arguments, return value, what it carries, source', () => {
    expect(headings).toEqual([...T_107_HEADINGS])
    expect(caption).toContain('表 T-107 — `Agent API` のメンバ')
  })

  it('the prose above the table says 22 members on one flat surface, the version is a date-time and a change of call shape raises it', () => {
    const prose = unbroken(PRINTED_TEXT)
    expect(prose).toContain(TWENTY_TWO)
    expect(prose).toContain(VERSION_SENTENCE)
    expect(prose).toContain(CHANGE_RAISES_VERSION)
    expect(prose).toContain(CALL_SHAPES_ARE_GENERATED)
  })

  it('22 rows, each a distinct row id AM-n and a distinct confirmed name, in the printed order', () => {
    expect(members).toHaveLength(22)
    expect(new Set(members.map((one) => one.id)).size).toBe(22)
    expect(new Set(members.map((one) => one.name)).size).toBe(22)
    expect(members.map((one) => one.id)).toEqual(EXPECTED_ROWS.map(([id]) => id))
    expect(members.map((one) => one.name)).toEqual(EXPECTED_ROWS.map(([, name]) => name))
  })

  it('the shared reader and this reader agree on the ids and names', () => {
    const shared = specTable('T-107').rows
    expect(shared.map((row) => row.id)).toEqual(members.map((one) => one.id))
    expect(shared.map((row) => (row.cells[1] ?? '').replace(/`/g, ''))).toEqual(members.map((one) => one.name))
  })
})

describe('T-107 arguments and return values, row by row', () => {
  it.each(EXPECTED_ROWS)('%s %s takes %j and returns %s', (id, name, argumentsTyped, returns) => {
    const one = memberNamed(name)
    expect(one.id).toBe(id)
    expect(one.arguments.filter((argument) => !argument.isMcpOnly).map((a) => `${a.name}: ${a.typeText}`)).toEqual(
      argumentsTyped,
    )
    expect(one.returnsType).toBe(returns)
  })

  it('a property takes no argument, a method line is written name: type -- meaning with a meaning that is not empty', () => {
    for (const one of members) {
      if (one.isProperty) {
        expect(one.argumentsCell, one.id).toBe('—')
        expect(one.arguments, one.id).toEqual([])
      }
      for (const argument of one.arguments) {
        expect(argument.typeText.length, `${one.id} ${argument.name}`).toBeGreaterThan(0)
        expect(argument.meaning.trim().length, `${one.id} ${argument.name}`).toBeGreaterThan(0)
      }
      expect(new Set(one.arguments.map((argument) => argument.name)).size, one.id).toBe(one.arguments.length)
    }
  })

  it('exactly the first two rows are properties; every other row is a verb plus object', () => {
    expect(members.filter((one) => one.isProperty).map((one) => one.name)).toEqual(['agentApiVersion', 'schemaVersion'])
    expect(members.filter((one) => !one.isProperty).every((one) => one.kindCell.startsWith('動詞＋目的語'))).toBe(true)
  })

  it('every row has one of the three purities the table names and a source', () => {
    for (const one of members) {
      expect(['semi-pure-a', 'semi-pure-b', 'non-pure'], one.id).toContain(one.purity)
      expect(one.sourceCell.length, one.id).toBeGreaterThan(0)
      expect(one.carries.length, one.id).toBeGreaterThan(0)
    }
  })

  it('the argument columns name seven members that take an argument; the rest print a dash', () => {
    const taking = members.filter((one) => one.arguments.length > 0).map((one) => one.name)
    expect(taking).toEqual([
      'readSearchRows',
      'applyCommands',
      'importDocument',
      'focusTask',
      'showOnlyTasks',
      'watchChanges',
      'postDialogueMessage',
    ])
    expect(members.filter((one) => one.arguments.length === 0).every((one) => one.argumentsCell === '—')).toBe(true)
  })
})

describe('AM-17 and AG-12 (5): the one key only the MCP tool takes', () => {
  it('watchChanges prints its receiver and then waitMs, a number of milliseconds, marked as an MCP-only key', () => {
    const watch = memberNamed('watchChanges')
    expect(watch.id).toBe('AM-17')
    expect(watch.arguments.map((argument) => [argument.name, argument.typeText, argument.isMcpOnly])).toEqual([
      ['receive', 'AgentChangeReceiver', false],
      ['waitMs', 'number', true],
    ])
    const waitMs = watch.arguments[1]
    expect(waitMs?.meaning).toContain('待つ長さ（ミリ秒）')
    expect(waitMs?.meaning).toContain('切れたら「まだ無い」を値で返す（`AG-12` の ⑤）')
  })

  it('no other row prints an MCP-only key', () => {
    const marked = members.flatMap((one) => one.arguments.filter((argument) => argument.isMcpOnly).map(() => one.name))
    expect(marked).toEqual(['watchChanges'])
  })

  it('AG-12 (5) says the wait is the caller\'s argument and an expired wait answers a value', () => {
    const requirements = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
    expect(requirements).toContain('待つ長さは呼ぶ側が道具の引数で渡し、切れたときは「まだ無い」を値で返すこと（MUST）')
  })
})

describe('AM-25 and AM-19 divide the delay analysis between them, and say so in their own sentences', () => {
  it('AM-25 returns the status without a diagnosis and points at AM-19 for the exact analysis', () => {
    const search = memberNamed('readSearchRows')
    expect(search.id).toBe('AM-25')
    for (const sentence of [AM_25_STATUS, AM_25_DIAGNOSIS_ELSEWHERE, AM_25_NO_DIAGNOSIS, AM_25_POINTS_AT_19]) {
      expect(search.carries, sentence).toContain(sentence)
    }
  })

  it('AM-19 returns the exact analysis and points back at AM-25 for the lateness by base date only', () => {
    const diagnostics = memberNamed('readDelayDiagnostics')
    expect(diagnostics.id).toBe('AM-19')
    for (const sentence of [AM_19_RETURNS_ANALYSIS, AM_19_POINTS_AT_25]) {
      expect(diagnostics.carries, sentence).toContain(sentence)
    }
  })

  it('each row id a "what it carries" cell writes after a member name belongs to that member', () => {
    const pair = /`([A-Za-z]+)`[（(，、]*(?:`[A-Za-z]+`、)?`(AM-\d+)`/g
    let checked = 0
    for (const one of members) {
      for (const found of one.carries.matchAll(pair)) {
        const named = members.find((other) => other.id === found[2])
        expect(named?.name, `${one.id} writes ${found[0]}`).toBe(found[1])
        checked += 1
      }
    }
    expect(checked).toBe(2)
  })
})
