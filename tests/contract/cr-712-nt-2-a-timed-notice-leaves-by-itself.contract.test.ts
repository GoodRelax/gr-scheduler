// CR-712 wave 2 spec-only cases: NT-2 timed notices, S-542, and the notices machine of table T-286.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'

const ROOT = process.cwd()
const SPEC = join(ROOT, 'docs', 'spec')

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))

const CLOCK_WAKES = readFileSync(join(ROOT, 'src', 'framework', 'single-html-shell', 'frame-clock-wakes.ts'), 'utf8')

const NT_2_READ_BEFORE_IT_GOES = '読み終える前に消えないようにするか、止める・延ばす・無効にする手段を持つこと（MUST）'
const NT_2_ONLY_TIMED_ROWS = '時間で消すのは、表 T-233 の表示の仕方が「時間で消す」の理由の通知だけとする（MUST）'
const NT_2_GONE_AFTER_S_542 =
  'その通知は、立ってから `_assets/tbl-settings.md` の 表 T-206 の `S-542` が経ったら、人の操作を待たずに消すこと（MUST）'
const NT_2_NOT_COUNTED_UNDER_THE_POINTER = 'ポインタがその通知の箱の上にある間は数えないこと（MUST）'
const NT_2_COUNTED_AGAIN_AFTER_LEAVING = '箱から離れたら `S-542` を始めから数え直すこと（MUST）'
const NT_2_COUNTED_AGAIN_WHEN_BUNDLED = '同じ理由が上がって `NT-3` で束ねたときも、始めから数え直すこと（MUST）'
const NT_2_OK_STILL_DISMISSES = '`NT-8` の消し方（`OK`・`Enter`・`Esc`）はそのまま当たる —— 先に人が消してよい。'
const NT_2_THE_REPORT_IS_NOT_A_NOTICE =
  '`U-62` に並べる理由（表 T-233 の表示の仕方）は通知ではないので、本行に当たらない —— `U-62` は `OK` で閉じるまで立つ。'
const T_078_ONLY_WHILE_A_TIMED_CARD_STANDS =
  '通知の期限は、表示の仕方が「時間で消す」の通知が立っているときにだけ数える'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['NT-2 (MUST) read before it goes', NT_2_READ_BEFORE_IT_GOES],
  ['NT-2 (MUST) only the timed rows', NT_2_ONLY_TIMED_ROWS],
  ['NT-2 (MUST) gone after S-542', NT_2_GONE_AFTER_S_542],
  ['NT-2 (MUST) not counted under the pointer', NT_2_NOT_COUNTED_UNDER_THE_POINTER],
  ['NT-2 (MUST) counted again after leaving', NT_2_COUNTED_AGAIN_AFTER_LEAVING],
  ['NT-2 (MUST) counted again when bundled', NT_2_COUNTED_AGAIN_WHEN_BUNDLED],
  ['NT-2 the NT-8 dismissal stays', NT_2_OK_STILL_DISMISSES],
  ['NT-2 the Import Report is not a notice', NT_2_THE_REPORT_IS_NOT_A_NOTICE],
]

interface Branch {
  readonly to?: string
  readonly guard?: readonly { readonly name?: string; readonly not?: boolean }[]
}

interface Region {
  readonly region: string
  readonly events: readonly { readonly key: string; readonly carries: readonly { readonly name: string }[] }[]
  readonly machines: readonly {
    readonly name: string
    readonly transitions: Readonly<Record<string, Readonly<Record<string, Branch | readonly Branch[]>>>>
  }[]
}

const MACHINES = JSON.parse(readFileSync(join(SPEC, '_source', 'state-machines.json'), 'utf8')) as {
  readonly regions: readonly Region[]
}

/** @purity pure */
function regionOf(name: string): Region {
  const found = MACHINES.regions.find((one) => one.region === name)
  if (found === undefined) throw new Error(`state-machines.json has no region ${name}`)
  return found
}

/** @purity pure */
function guardNamesOf(cell: Branch | readonly Branch[] | undefined): readonly string[] {
  if (cell === undefined) return []
  const branches: readonly Branch[] = Array.isArray(cell) ? cell : [cell as Branch]
  return branches.flatMap((one) => (one.guard ?? []).flatMap((guard) => (guard.name === undefined ? [] : [guard.name])))
}

// see T-206, S-542
/** @purity pure */
function s542Ms(): number {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-542')
  if (row === undefined) throw new Error('table T-206 has no row S-542')
  const found = /(\d+)\s*ms/.exec(row.cells.join(' '))
  if (found === null) throw new Error('S-542 states no time in ms')
  return Number(found[1])
}

/** @purity pure */
function stepped(session: ScreenSession, events: readonly SessionEvent[]): ScreenSession {
  return events.reduce((now, event) => advanceScreenSession(now, event).state, session)
}

/** @purity pure */
function raised(reason: string): SessionEvent {
  return { type: 'noticeRaised', reason, affectedCount: null }
}

// WHY: the event is new in CR-712 and the generated union may not hold it yet; the cast keeps a missing name a red case, not a compile stop.
/** @purity pure */
function elapsed(reason: string): SessionEvent {
  return { type: 'noticeTimeElapsed', reason } as unknown as SessionEvent
}

/** @purity pure */
function standingReasons(session: ScreenSession): readonly string[] {
  const shown = session.notices.noticeDisplayState
  return shown.kind === 'shown' ? shown.standing.map((one) => one.reason) : []
}

describe('NT-2 and table T-078 read as CR-712 E-04 wrote them', () => {
  it.each(CLAUSES)('%s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('NT-5 no longer gives MG-10 as an example of a told notice', () => {
    const nt5 = specTable('T-037').rows.find((one) => one.id === 'NT-5')
    expect(nt5, 'table T-037 has NT-5').toBeDefined()
    expect((nt5?.cells ?? []).join(' ')).not.toContain('表 T-032 の `MG-10`')
  })

  it('table T-078 says the deadline counts only while a timed card stands', () => {
    expect(DESIGN).toContain(T_078_ONLY_WHILE_A_TIMED_CARD_STANDS)
  })
})

describe(`S-542 -- ${NT_2_GONE_AFTER_S_542}`, () => {
  it('table T-206 holds S-542 at 3000 ms (JDG-1755)', () => {
    expect(s542Ms()).toBe(3000)
  })

  it('the generated not-stored notice time in src is the table value', () => {
    const generated = /const NOT_STORED_NOTICE_TIMES[\s\S]*?'S-542':\s*(\d+)/.exec(CLOCK_WAKES)
    expect(generated, 'frame-clock-wakes.ts holds NOT_STORED_NOTICE_TIMES with S-542').not.toBeNull()
    expect(Number(generated?.[1])).toBe(s542Ms())
  })
})

describe('table T-286 manuscript carries the elapsed deadline and the hidden reasons', () => {
  const notices = regionOf('notices')
  const display = notices.machines.find((one) => one.name === 'noticeDisplayStateMachine')

  it('notices/noticeTimeElapsed is an event carrying reason', () => {
    const event = notices.events.find((one) => one.key === 'noticeTimeElapsed')
    expect(event, 'the notices region defines noticeTimeElapsed').toBeDefined()
    expect(event?.carries.map((one) => one.name)).toEqual(['reason'])
  })

  it('noticeRaised is guarded by isHiddenReason, and noticeTimeElapsed by isTimedCard and isOnlyOneStanding', () => {
    expect(guardNamesOf(display?.transitions['noticeRaised']?.['hidden'])).toContain('isHiddenReason')
    expect(guardNamesOf(display?.transitions['noticeRaised']?.['shown'])).toContain('isHiddenReason')
    const onElapsed = guardNamesOf(display?.transitions['noticeTimeElapsed']?.['shown'])
    expect(onElapsed).toContain('isTimedCard')
    expect(onElapsed).toContain('isOnlyOneStanding')
  })
})

describe('a hidden reason stands no card (the T-233 display column, FR-076)', () => {
  it('RS-27 raised on an empty area leaves it hidden', () => {
    const after = stepped(emptyScreenSession, [raised('RS-27')])
    expect(after.notices.noticeDisplayState.kind).toBe('hidden')
  })

  it.each(['RS-44', 'RS-46', 'RS-55', 'RS-62', 'RS-74'])('%s raised over a standing card changes nothing', (reason) => {
    const before = stepped(emptyScreenSession, [raised('RS-1')])
    const after = stepped(before, [raised(reason)])
    expect(standingReasons(after)).toEqual(['RS-1'])
  })

  it('a shown reason still stands', () => {
    expect(standingReasons(stepped(emptyScreenSession, [raised('RS-1')]))).toEqual(['RS-1'])
  })
})

describe(`a timed card leaves on its deadline -- ${NT_2_GONE_AFTER_S_542}`, () => {
  it('the only standing card, RS-65, goes when its time has elapsed', () => {
    const after = stepped(emptyScreenSession, [raised('RS-65'), elapsed('RS-65')])
    expect(after.notices.noticeDisplayState.kind).toBe('hidden')
  })

  it('with another card standing, only the timed one goes', () => {
    const after = stepped(emptyScreenSession, [raised('RS-1'), raised('RS-65'), elapsed('RS-65')])
    expect(standingReasons(after)).toEqual(['RS-1'])
  })

  it('RS-77, the new timed row, goes the same way', () => {
    const after = stepped(emptyScreenSession, [raised('RS-77'), elapsed('RS-77')])
    expect(after.notices.noticeDisplayState.kind).toBe('hidden')
  })

  it(`a shown card is not a timed card and stays -- ${NT_2_ONLY_TIMED_ROWS}`, () => {
    const after = stepped(emptyScreenSession, [raised('RS-1'), elapsed('RS-1')])
    expect(standingReasons(after)).toEqual(['RS-1'])
  })
})

describe('a riding reason is the same reason as its head (NT-3)', () => {
  it.each([
    ['RS-6', 'RS-7'],
    ['RS-11', 'RS-13'],
    ['RS-15', 'RS-42'],
    ['RS-21', 'IV-17'],
  ])('%s standing and %s raised make one card', (head, rider) => {
    const after = stepped(emptyScreenSession, [raised(head), raised(rider)])
    expect(standingReasons(after)).toHaveLength(1)
  })
})
