// CR-719 spec-only cases: opening a file past a limit tells RS-78 to RS-81 in the dictionary's words, the limit filled in, no brace left, and the open document unchanged (FR-076, FR-023).

import { describe, expect, it } from 'vitest'

import { OPEN_CHOOSER, shellStage, UTF8, type ShellStage } from './cr-610-file-flow-stage'
import { assertReadable, filled, firstTask, grsJsonOf, LIMITS, BYTES_PER_MEGABYTE, REQUIREMENTS, settleLoop, templateDocument, wordsOf } from './cr-719-stage'
import { specTable } from './spec-table'

const FR_076_NO_COPIED_SETTING_VALUE = '設定値を理由の語に書き写してはならない（MUST NOT）'
const FR_023_NO_PARTIAL_APPLY = '部分的に適用してはならない（MUST NOT）'
const NT_1_SAYS_WHY_IN_WORDS = 'どの項目が、なぜ誤りかを文字で示すこと（MUST）'

describe('FR-076 / FR-023 -- the clauses this file is driven by still stand', () => {
  it.each([FR_076_NO_COPIED_SETTING_VALUE, FR_023_NO_PARTIAL_APPLY, NT_1_SAYS_WHY_IN_WORDS])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('the dictionary writes each limit as the name of a setting, not as a number', () => {
    expect(wordsOf('RS-78').ja).toContain('{importMaxBytes}')
    expect(wordsOf('RS-79').ja).toContain('{importMaxItems}')
    expect(wordsOf('RS-80').ja).toContain('{importMaxDepth}')
    expect(wordsOf('RS-87').nextStepJa).toContain('{importMinDate}')
    expect(wordsOf('RS-87').nextStepJa).toContain('{importMaxDate}')
  })
})

interface Told {
  readonly text: string
  readonly mannerText: string
  readonly nextSteps: readonly string[]
  readonly dismissText: string
}

const everyWordOf = (notice: Told): readonly string[] => [notice.text, notice.mannerText, notice.dismissText, ...notice.nextSteps]

/** @purity non-pure */
async function opened(built: ShellStage, name: string, text: string): Promise<void> {
  await built.open(built.file(name, UTF8.encode(text)))
  if (built.last().openModal !== null) await built.press(OPEN_CHOOSER(), 'IC-71')
  if (built.last().confirmation !== null) await built.answer('proceed')
}

const BEYOND = [
  {
    row: 'RS-78',
    file: (): string => `${grsJsonOf(1)}${' '.repeat((LIMITS.bytes + 1) * BYTES_PER_MEGABYTE)}`,
  },
  {
    row: 'RS-79',
    file: (): string => grsJsonOf(LIMITS.items + 1),
  },
  {
    row: 'RS-80',
    file: (): string =>
      grsJsonOf(LIMITS.depth + 1, (task, index) => {
        task['parentTaskUid'] = index === 0 ? null : index
      }),
  },
  {
    row: 'RS-81',
    file: (): string =>
      grsJsonOf(2, (task, index) => {
        if (index === 1) task['start'] = null
      }),
  },
] as const

describe(`opening a file past a limit -- ${FR_023_NO_PARTIAL_APPLY}`, () => {
  it.each(BEYOND)('$row: the words are the dictionarys with the limit filled in, no brace is left, and the open document does not change', async ({ row, file }) => {
    const text = file()
    if (row !== 'RS-78') assertReadable(text)
    const built = await shellStage()
    const before = JSON.stringify(built.loop.document())
    await opened(built, 'beyond.json', text)
    const told = built.last().notices as unknown as readonly Told[]
    expect(told.length, `${NT_1_SAYS_WHY_IN_WORDS} -- one notice stands`).toBe(1)
    expect(told[0]?.text).toBe(filled(wordsOf(row).ja))
    expect(told[0]?.nextSteps, 'the next step is the dictionarys, filled in').toContain(filled(wordsOf(row).nextStepJa))
    for (const word of everyWordOf(told[0] as Told)) expect(word, `${FR_076_NO_COPIED_SETTING_VALUE} -- ${word}`).not.toContain('{')
    expect(JSON.stringify(built.loop.document()), 'the refused file changed nothing').toBe(before)
  })

  it('RS-78 names the limit in megabytes, as table T-211 states it', () => {
    expect(filled(wordsOf('RS-78').ja)).toContain(String(LIMITS.bytes))
    expect(filled(wordsOf('RS-79').ja)).toContain(String(LIMITS.items))
    expect(filled(wordsOf('RS-80').ja)).toContain(String(LIMITS.depth))
  })
})

// see S-119, S-120, T-214
const dateOf = (row: string): string => {
  const found = /\d{4}-\d{2}-\d{2}/.exec(specTable('T-214').rows.find((one) => one.id === row)?.cells.join(' ') ?? '')
  if (found === null) throw new Error(`table T-214 ${row} states no date`)
  return found[0]
}

describe('a date outside the dates that can be handled -- RS-87 fills both of its limits in', () => {
  it('typing a date before the first handled day tells RS-87 with importMinDate and importMaxDate filled in', () => {
    const document = templateDocument()
    const task = firstTask(document)
    const first = dateOf('S-119')
    const before = `${Number(first.slice(0, 4)) - 1}-12-31`
    const one = settleLoop(document)
    one.settle({ row: 'PR-47', key: { holder: 'task', uid: task.uid, column: 'finish' }, text: before })
    const told = one.notices() as unknown as readonly Told[]
    expect(told.length, 'one notice stands').toBe(1)
    expect(told[0]?.text).toBe(filled(wordsOf('RS-87').ja))
    expect(told[0]?.nextSteps).toContain(filled(wordsOf('RS-87').nextStepJa))
    for (const word of everyWordOf(told[0] as Told)) expect(word, `${FR_076_NO_COPIED_SETTING_VALUE} -- ${word}`).not.toContain('{')
  })
})
