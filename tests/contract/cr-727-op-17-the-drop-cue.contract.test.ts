// CR-727 spec-only contract: the Drop Cue (U-68) shown while a file is dragged over the window (FR-087 T-024a OP-17, OP-2, T-337 UZ-1, T-280 dropCueDisplayStateMachine).

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  GENERATED_WORDS,
  LANGUAGES,
  MANUSCRIPT_WORDS,
  REGIONS,
  inLanguage,
  rowLine,
  specText,
  viewOf,
} from './cr-727-stage'
import { specTable, unbroken } from './spec-table'

const opCell = (id: string): string => unbroken(specTable('T-024a').rows.find((one) => one.id === id)?.by['規則'] ?? '')
const uzRow = (): string => unbroken((specTable('T-337').rows.find((one) => one.id === 'UZ-1')?.cells ?? []).join(' | '))

const OP_17_SHOW =
  'ファイルを持つドラッグ（閲覧環境が渡す `dataTransfer.types` に `Files` が在るもの）がウィンドウの上に来たら、ドロップの案内（`_assets/tbl-glossary.md` の `U-68`）を出すこと（MUST）'
const OP_17_HIDE =
  '重ね順は `FR-152` の 表 T-337 の `UZ-1` とし、押下を受けない —— ドロップを受けるのは今どおりウィンドウ全体である（`OP-2`）。ドラッグがウィンドウの外へ出たとき、とドロップしたときは消すこと（MUST）'
const OP_17_REFUSED =
  '⚠️ ドロップしても受け付けないあいだ —— ファイルの操作が進行中、または問いが開いている（`OP-8`、`_assets/tbl-state-machines.md` の 表 T-290 の `fileFlow/documentOpenAsked` が `RS-27` で断る状態） —— は出してはならない（MUST NOT）'
const OP_17_NOT_SAVED =
  '⚠️ 2 つ以上のファイルでも案内は 1 つとする（ドロップした後は `OP-11`）。⛔ 案内を文書に保存してはならず、取り消しの対象にしてはならない（MUST NOT）'
const OP_17_AREA = '案内は `Schedule Canvas`（`U-32`）の範囲を覆い'
const OP_17_SAME_UI = '⚠️ ドラッグがウィンドウの中の別の UI パーツへ移るだけでは消さない。'
const OP_2_LAST = '⭐ ファイルをドラッグしているあいだ、ドロップすれば開くことを `OP-17` の案内で示す'
const UZ_1_MUST = '押下を受けず、下へ通すこと（MUST）'
const UZ_1_PART = 'ドロップの案内（`_assets/tbl-glossary.md` の `U-68`、`FR-087` の 表 T-024a の `OP-17`）'
const T_280_ENTERED = '| `screen/fileDragEntered` | → `shown` [`isOpenAccepted`]'
const T_280_LEFT = '| `screen/fileDragLeft` | — | → `hidden` |'

const entered = (isOpenAccepted: boolean) => ({ type: 'fileDragEntered', isOpenAccepted }) as const
const LEFT = { type: 'fileDragLeft' } as const

const step = (session: ScreenSession, event: unknown) => advanceScreenSession(session, event as never)
const shownSession = (): ScreenSession => step(emptyScreenSession, entered(true)).state
const wordOf = (words: typeof GENERATED_WORDS, language: string): string | undefined =>
  words['dropCue']?.find((one) => one.part === 'dropToOpen')?.text?.[language]

describe('CR-727 the manuscript these cases are driven by', () => {
  it('T-024a OP-17 still says it, word for word', () => {
    for (const clause of [OP_17_SHOW, OP_17_HIDE, OP_17_REFUSED, OP_17_NOT_SAVED, OP_17_AREA, OP_17_SAME_UI]) {
      expect(opCell('OP-17')).toContain(clause)
    }
  })

  it('T-024a OP-2 ends by pointing at the OP-17 cue', () => {
    expect(opCell('OP-2').endsWith(OP_2_LAST)).toBe(true)
  })

  it('T-337 UZ-1 holds the Drop Cue and lets the press through', () => {
    expect(uzRow()).toContain(UZ_1_PART)
    expect(uzRow()).toContain(UZ_1_MUST)
  })

  it('T-103 U-68 names the Drop Cue and T-280 holds dropCueDisplayStateMachine', () => {
    expect(rowLine(specText('_assets', 'tbl-glossary.md'), 'U-68')).toContain('`Drop Cue`')
    const machines = specText('_assets', 'tbl-state-machines.md')
    expect(machines).toContain('### 状態機械 `dropCueDisplayStateMachine`')
    expect(machines).toContain(T_280_ENTERED)
    expect(machines).toContain(T_280_LEFT)
    expect(machines).toContain('表に無い出来事は `dropCueDisplayStateMachine` を変えない（同じ参照）。')
  })

  it('S-553 and S-214 name OP-17; the dictionary holds dropCue.dropToOpen in ja and en, generated unchanged', () => {
    const settings = specText('_assets', 'tbl-settings.md')
    expect(rowLine(settings, 'S-553')).toContain('`OP-17`')
    expect(rowLine(settings, 'S-553')).toContain('| 3px')
    expect(rowLine(settings, 'S-214')).toContain('`OP-17` がドロップの案内に敷く地')
    for (const language of LANGUAGES) {
      expect(wordOf(MANUSCRIPT_WORDS, language), language).toBeTruthy()
      expect(wordOf(GENERATED_WORDS, language), language).toBe(wordOf(MANUSCRIPT_WORDS, language))
    }
    expect(wordOf(MANUSCRIPT_WORDS, 'ja')).toBe('ここに落とすと開きます')
    expect(wordOf(MANUSCRIPT_WORDS, 'en')).toBe('Drop the file to open it')
  })

  it('the IC-1 hint says a file dropped on the schedule opens too', () => {
    const hint = MANUSCRIPT_WORDS['icons']?.find((one) => one.rowId === 'IC-1')?.hint
    expect(hint?.['ja']).toContain('日程表にファイルを落としても開ける')
    expect(hint?.['en']).toContain('drop one onto the schedule')
  })
})

describe(`FR-087 OP-17 -- ${OP_17_SHOW.slice(-60)}`, () => {
  it('starts hidden (T-280: hidden is the initial state)', () => {
    expect(emptyScreenSession.screen.dropCueDisplayState.kind).toBe('hidden')
  })

  it('a file drag entering the window while an open would be accepted shows the cue', () => {
    const next = step(emptyScreenSession, entered(true))
    expect(next.state.screen.dropCueDisplayState.kind).toBe('shown')
  })

  it(`${OP_17_SAME_UI} -- a second fileDragEntered while shown keeps it shown, same reference`, () => {
    const shown = shownSession()
    for (const accepted of [true, false]) {
      const next = step(shown, entered(accepted))
      expect(next.state.screen.dropCueDisplayState.kind).toBe('shown')
      expect(next.state.screen.dropCueDisplayState).toBe(shown.screen.dropCueDisplayState)
    }
  })
})

describe(`FR-087 OP-17 -- ${OP_17_REFUSED.slice(-60)}`, () => {
  it('fileDragEntered with isOpenAccepted false leaves the cue hidden, same reference', () => {
    const next = step(emptyScreenSession, entered(false))
    expect(next.state.screen.dropCueDisplayState.kind).toBe('hidden')
    expect(next.state.screen.dropCueDisplayState).toBe(emptyScreenSession.screen.dropCueDisplayState)
    expect(next.effects).toEqual([])
  })

  it('the view carries no cue after a refused entry', () => {
    expect(viewOf(step(emptyScreenSession, entered(false)).state).dropCue).toBeUndefined()
  })
})

describe(`FR-087 OP-17 -- ${OP_17_HIDE.slice(-60)}`, () => {
  it('fileDragLeft (out of the window, or dropped) hides a shown cue', () => {
    const next = step(shownSession(), LEFT)
    expect(next.state.screen.dropCueDisplayState.kind).toBe('hidden')
    expect(viewOf(next.state).dropCue).toBeUndefined()
  })

  it('fileDragLeft while hidden changes nothing (same reference)', () => {
    const next = step(emptyScreenSession, LEFT)
    expect(next.state.screen.dropCueDisplayState).toBe(emptyScreenSession.screen.dropCueDisplayState)
    expect(next.effects).toEqual([])
  })
})

describe(`FR-087 OP-17 -- ${OP_17_NOT_SAVED.slice(-60)}`, () => {
  it.each([
    ['fileDragEntered', () => step(emptyScreenSession, entered(true))],
    ['fileDragLeft', () => step(shownSession(), LEFT)],
  ] as const)('%s yields no effect, so no document command and no undo step', (_name, run) => {
    expect(run().effects).toEqual([])
  })

  it('only the screen value dropCueDisplayState moves; every other region of the session is the same reference', () => {
    const before = emptyScreenSession
    const after = step(before, entered(true)).state
    for (const key of Object.keys(before) as (keyof ScreenSession)[]) {
      if (key === 'screen') continue
      expect(after[key], String(key)).toBe(before[key])
    }
    const { dropCueDisplayState: _a, ...screenAfter } = after.screen
    const { dropCueDisplayState: _b, ...screenBefore } = before.screen
    expect(screenAfter).toEqual(screenBefore)
  })
})

describe(`FR-087 OP-17 -- ${OP_17_AREA} (U-32), one cue whatever the file count, the dictionary word`, () => {
  it('the view has no cue while hidden', () => {
    expect(viewOf(emptyScreenSession).dropCue).toBeUndefined()
  })

  it.each(LANGUAGES)('while shown (%s) the view carries one cue over the Schedule Canvas with the dictionary word', (language) => {
    const cue = viewOf(inLanguage(shownSession(), language)).dropCue
    expect(cue).toBeDefined()
    expect(Array.isArray(cue)).toBe(false)
    expect(cue?.area).toEqual(REGIONS.scheduleCanvas)
    expect(cue?.text).toBe(wordOf(GENERATED_WORDS, language))
  })
})
