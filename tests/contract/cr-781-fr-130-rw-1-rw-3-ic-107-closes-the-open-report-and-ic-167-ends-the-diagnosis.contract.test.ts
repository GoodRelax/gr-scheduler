// CR-781 / CR-797 spec-only contract over the shell: IC-107 with the report window open (minimized included) closes the window alone; with it closed it runs the diagnosis again and opens it; IC-40 ends the diagnosis (the End Diagnostics entry is retired); IC-168 re-runs it with the window kept open.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { iconEntry, selfAndDescendants, type FakeElement } from '../fixtures/fake-browser'
import { pointerOf } from '../unit/cr-541-stage'
import { ONE_PARENT } from './cr-731-documents'
import { FINISH_OF, FS, START_OF, WORDS, documentOf, type TaskSpec } from './cr-731-stage'
import { windowStage, type WindowStage } from './cr-760-stage'
import { specTable, unbroken } from './spec-table'

const FR_130_OPEN_CLOSES_ONLY_THE_WINDOW =
  '診断を出しているあいだに同じ入口を押したら、遅延診断レポートの窓（`FR-134` の 表 T-346 の `RW-1`）が開いていれば（最小化を含む）、窓の `IC-52` と同じく窓だけを閉じ、窓だけを閉じていれば（`IC-52`）いまの文書で診断をやり直し、その結果をマーカーと一覧に出して窓を開くこと（MUST）'
const FR_130_MARKS_STAY = '⭐ 窓が開いているときの押下は窓の `IC-52` と同じに働き、診断の印は残る'
const FR_130_ENDED_BY = '診断の表示を終えるのは、`IC-40`（`FR-049`）を押したときである（`RW-1`）'
const FR_130_RERUN_BY_IC_168 = '窓の `IC-168`（`RW-3`）を押したら、窓を開いたまま、いまの文書で診断をやり直し、その結果をマーカーと一覧に出すこと（MUST）'
const RW_1_OPEN_PRESS = '窓が開いているあいだ（最小化（`IC-129`）を含む）に `IC-107` を押したときは、`IC-52` と同じく窓だけを閉じる（`FR-130`）'
const RW_1_PRESSED_LOOK = '`IC-107` の押されている見た目（表 T-237 の `EN-2`）は、窓が開いていること'
const RW_1_UNPRESSED_WITH_MARKS = '窓だけを閉じて印が残っているあいだは押されていない見た目である'
const RW_1_ENDING = '診断の表示を終える入口は、進捗マーカーの表示の切替 `IC-40`（`FR-049`）である —— 終えると窓が閉じ、診断の印が消え、修正の記録を捨てる（`RW-16`）'
const RW_1_IC_168 = '窓の `IC-168`（`RW-3`）は、窓を開いたまま診断をやり直す（`FR-130`）—— 位置・大きさ・語・フィルタ・並べ替え・修正の記録を保つ（`RW-8`・`RW-16`）'
const RW_3_HEAD = '左から、`IC-168`（再診断 —— 語の入口、語は `_assets/tbl-settings.md` の 表 T-206 の `S-623` の太さ、`RW-1`）・`IC-140`（`[.md]`）・`IC-108`（クリップボードへコピーする）・入力欄。'
const RW_3_EVERY_TABLE = '`IC-168` は 3 つの表（`RW-11`）のどれを出しているときも置く。'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(specTable(table).rows.find((one) => one.id === id)?.by[heading] ?? '')

type Language = 'ja' | 'en'
const RE_WORD = (language: Language): string => {
  const found = (WORDS['icons'] as readonly Record<string, any>[]).find((one) => one['rowId'] === 'IC-168')
  const word = found?.['label']?.[language]
  if (typeof word !== 'string' || word === '') throw new Error(`the dictionary has no word for IC-168 in ${language}`)
  return word
}

// see T-315
// WHY: SELF depends on itself (DG-1); LATE is not started after its start (DG-2); PARENT is its ancestor (DG-3); PLAIN has no state.
const SELF = 40
const PARENT = 20
const LATE = 21
const PLAIN = 7

const span = (uid: number, from: string, to: string, extra: Partial<TaskSpec> = {}): TaskSpec => ({
  uid,
  start: START_OF(`2027-${from}`),
  finish: FINISH_OF(`2027-${to}`),
  ...extra,
})

// WHY: the canvas starts before April, so every marker stands on the chart and clear of the report window below it.
function seeded(): Document {
  const made = documentOf(
    [
      span(SELF, '05-03', '05-04', { after: [[SELF, FS]], name: 'Self' }),
      span(PARENT, '04-05', '04-09', { name: 'Parent' }),
      span(LATE, '04-05', '04-09', { parent: PARENT, name: 'Late child' }),
      span(PLAIN, '06-07', '06-11', { name: 'Plain' }),
    ],
    { statusDate: '2027-04-21T00:00:00' },
  )
  return { ...made, documentSettings: { ...made.documentSettings, scrollDate: '2027-03-29T00:00:00' } } as Document
}

const staged = async (language: Language = 'ja'): Promise<WindowStage> => {
  const stage = await windowStage(seeded())
  // WHY: IC-21 chooses the screen language (FR-038); the stage starts in Japanese.
  if (language === 'en') await stage.press('IC-21')
  return stage
}

interface ReportSeen {
  readonly shown: string
}
const reportOf = (stage: WindowStage): ReportSeen | null =>
  ((stage.last() as unknown as { delayDiagnosticsReport?: ReportSeen | null }).delayDiagnosticsReport ?? null)
const needReport = (stage: WindowStage): ReportSeen => {
  const found = reportOf(stage)
  if (found === null) throw new Error('the report window is not described')
  return found
}

// WHY: a mark of the diagnosis is a DG- marker on the chart (FR-133, T-315).
const isDiagnosisDrawn = (stage: WindowStage): boolean =>
  (stage.loop.current()?.geometry.tasks ?? []).some((one) => /^DG-/.test(String(one.marker?.symbol ?? '')))
const symbolsOf = (stage: WindowStage, uids: readonly number[]): readonly string[] =>
  uids.map((uid) => String(stage.loop.current()?.geometry.tasks.find((one) => one.taskUid === uid)?.marker?.symbol ?? ''))

// WHY: the header entry looks pressed in the described screen and in the drawn DOM alike (EN-2).
const isPressedInView = (stage: WindowStage): boolean | undefined =>
  (stage.last() as unknown as { appHeaderItems: { commands: readonly { icon: string; isPressed: boolean }[] } }).appHeaderItems.commands.find(
    (one) => one.icon === 'IC-107',
  )?.isPressed
const isPressedInDom = (stage: WindowStage): boolean => iconEntry(stage.built.root(), 'IC-107').getAttribute('data-pressed') === 'true'
function expectPressed(stage: WindowStage, expected: boolean, what: string): void {
  expect(isPressedInView(stage), `${what} (described)`).toBe(expected)
  expect(isPressedInDom(stage), `${what} (data-pressed)`).toBe(expected)
}

const rediagnoseEntryOf = (stage: WindowStage): FakeElement | null => {
  const window = stage.window()
  return window === null ? null : (selfAndDescendants(window).find((one) => one.getAttribute('data-icon') === 'IC-168') ?? null)
}
const entryOf = (stage: WindowStage, icon: string): FakeElement | null =>
  selfAndDescendants(stage.window() ?? stage.built.root()).find((one) => one.getAttribute('data-icon') === icon) ?? null

async function pressMarker(stage: WindowStage, uid: number): Promise<void> {
  const drawn = stage.loop.current()?.geometry.tasks.find((one) => one.taskUid === uid)?.marker
  if (drawn === undefined || drawn === null) throw new Error(`premise: Task ${String(uid)} draws a progress marker`)
  await stage.key(pointerOf('down', drawn.center.x, drawn.center.y) as never)
  await stage.key(pointerOf('up', drawn.center.x, drawn.center.y) as never)
}

describe('CR-781 -- the clauses this file is driven by', () => {
  it('FR-130, T-346 RW-1 and RW-3 still read this way', () => {
    expect(REQUIREMENTS).toContain(FR_130_OPEN_CLOSES_ONLY_THE_WINDOW)
    expect(REQUIREMENTS).toContain(FR_130_MARKS_STAY)
    expect(REQUIREMENTS).toContain(FR_130_ENDED_BY)
    expect(REQUIREMENTS).toContain(FR_130_RERUN_BY_IC_168)
    const rw1 = cellOf('T-346', 'RW-1', '定め')
    for (const clause of [RW_1_OPEN_PRESS, RW_1_PRESSED_LOOK, RW_1_UNPRESSED_WITH_MARKS, RW_1_ENDING, RW_1_IC_168]) expect(rw1, clause).toContain(clause)
    const rw3 = cellOf('T-346', 'RW-3', '定め')
    expect(rw3).toContain(RW_3_HEAD)
    expect(rw3).toContain(RW_3_EVERY_TABLE)
  })

  it('premise: before any press no window is open, no mark is drawn, and IC-107 is not pressed', async () => {
    const stage = await staged()
    expect(reportOf(stage)).toBeNull()
    expect(isDiagnosisDrawn(stage)).toBe(false)
    expectPressed(stage, false, 'IC-107 before the diagnosis')
  })
})

describe(`FR-130 / RW-1 / IC-107 -- ${RW_1_OPEN_PRESS}`, () => {
  it('with the window never opened, a press runs the diagnosis, draws the marks and opens the window; IC-107 looks pressed', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    expect(reportOf(stage), 'the window opens').not.toBeNull()
    expect(isDiagnosisDrawn(stage), 'the marks are drawn').toBe(true)
    expect(symbolsOf(stage, [SELF, LATE, PARENT])).toEqual(['DG-1', 'DG-2', 'DG-3'])
    expectPressed(stage, true, 'IC-107 while the window is open')
  })

  it('with the window open, a press closes the window alone: the marks stay and IC-107 is not pressed (RW-1)', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-107')
    expect(reportOf(stage), 'the window is gone').toBeNull()
    expect(stage.window(), 'nothing of the window is drawn').toBeNull()
    expect(isDiagnosisDrawn(stage), 'the marks stay (the diagnosis goes on)').toBe(true)
    expect(symbolsOf(stage, [SELF, LATE, PARENT])).toEqual(['DG-1', 'DG-2', 'DG-3'])
    expectPressed(stage, false, 'IC-107 once the window is closed, though the marks stay')
  })

  it('closed again, a press runs the diagnosis again and opens the window; IC-107 looks pressed again (FR-130)', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-107')
    await stage.press('IC-107')
    expect(reportOf(stage), 'the window opens again').not.toBeNull()
    expect(isDiagnosisDrawn(stage)).toBe(true)
    expectPressed(stage, true, 'IC-107 after the window opened again')
    await stage.press('IC-107')
    expect(reportOf(stage), 'and the next press closes it again').toBeNull()
    expect(isDiagnosisDrawn(stage)).toBe(true)
    expectPressed(stage, false, 'IC-107 after the second close')
  })

  it('a window closed by IC-52 is the same as one closed by IC-107: IC-107 is not pressed, and a press opens it (RW-1)', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-52')
    expect(reportOf(stage)).toBeNull()
    expect(isDiagnosisDrawn(stage), 'IC-52 keeps the marks (RW-1)').toBe(true)
    expectPressed(stage, false, 'IC-107 after IC-52')
    await stage.press('IC-107')
    expect(reportOf(stage), 'the window opens').not.toBeNull()
    expect(isDiagnosisDrawn(stage)).toBe(true)
    expectPressed(stage, true, 'IC-107 after the press that opened the window')
  })

  it('the result is the one of the document as it is now: a change made while the window was closed shows in the marks (FR-130)', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-107')
    const before = taskCountOfDocument(stage)
    await pressMarker(stage, PLAIN)
    await pressMarker(stage, PLAIN)
    expect(JSON.stringify(stage.loop.document().schedule.tasks), 'premise: the marker presses changed the document').not.toBe(before)
    await stage.press('IC-107')
    const fresh = await windowStage(stage.loop.document())
    await fresh.press('IC-107')
    const every = [SELF, PARENT, LATE, PLAIN]
    expect(symbolsOf(stage, every)).toEqual(symbolsOf(fresh, every))
  })

  it('diagnostics not shown (ended by IC-40): a press runs the diagnosis and opens the window (FR-130)', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-40')
    expect(reportOf(stage), 'IC-40 ends the display, window included (RW-1)').toBeNull()
    expect(isDiagnosisDrawn(stage), 'no mark is left').toBe(false)
    expectPressed(stage, false, 'IC-107 after IC-40')
    await stage.press('IC-107')
    expect(reportOf(stage)).not.toBeNull()
    expect(isDiagnosisDrawn(stage)).toBe(true)
    expectPressed(stage, true, 'IC-107 after it ran again')
  })
})

describe(`RW-1 -- IC-107 and a minimized window: ${RW_1_OPEN_PRESS}`, () => {
  it('a minimized window counts as open: IC-107 looks pressed', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-129')
    expect(needReport(stage).shown).toBe('minimized')
    expectPressed(stage, true, 'IC-107 while the window is minimized')
  })

  it('a press with the window minimized closes the window and leaves the marks; IC-107 is not pressed', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-129')
    expect(needReport(stage).shown, 'premise').toBe('minimized')
    await stage.press('IC-107')
    expect(reportOf(stage), 'the window is gone, not restored').toBeNull()
    expect(isDiagnosisDrawn(stage), 'the marks stay').toBe(true)
    expectPressed(stage, false, 'IC-107 after the minimized window was closed')
  })
})

describe(`RW-1 / IC-40 -- ${RW_1_ENDING}`, () => {
  it('the line under the title of the window starts with IC-168, IC-140 and IC-108 (RW-3)', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    const line = entryOf(stage, 'IC-140')?.parentNode ?? null
    expect(line, 'the window draws a line holding IC-140').not.toBeNull()
    const icons = ((line as FakeElement).children as readonly FakeElement[]).map((one) => one.getAttribute('data-icon') ?? '').filter((one) => one !== '')
    expect(icons.slice(0, 3)).toEqual(['IC-168', 'IC-140', 'IC-108'])
  })

  it('pressing IC-40 ends the diagnosis: the window is gone, the marks are gone, IC-107 is not pressed', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-40')
    expect(reportOf(stage), 'the window is gone').toBeNull()
    expect(stage.window()).toBeNull()
    expect(isDiagnosisDrawn(stage), 'the marks are gone').toBe(false)
    expect(symbolsOf(stage, [SELF, LATE, PARENT]).filter((one) => one.startsWith('DG-'))).toEqual([])
    expectPressed(stage, false, 'IC-107 after IC-40')
  })

  it('after IC-40 a press of IC-107 runs the diagnosis and opens the window (the display was ended, not toggled)', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-40')
    await stage.press('IC-107')
    expect(reportOf(stage)).not.toBeNull()
    expect(isDiagnosisDrawn(stage)).toBe(true)
    expectPressed(stage, true, 'IC-107 after the new run')
  })

  it('IC-40 also ends the display from a minimized window', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-129')
    expect(needReport(stage).shown, 'premise').toBe('minimized')
    await stage.press('IC-40')
    expect(reportOf(stage)).toBeNull()
    expect(isDiagnosisDrawn(stage)).toBe(false)
    expectPressed(stage, false, 'IC-107 after IC-40 from a minimized window')
  })

  it('IC-40 ends the display from a window closed alone (the marks stay until then)', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-52')
    expect(isDiagnosisDrawn(stage), 'premise: IC-52 keeps the marks').toBe(true)
    await stage.press('IC-40')
    expect(isDiagnosisDrawn(stage)).toBe(false)
  })

  it('the log of fixes is dropped with the display: after IC-40 and a new diagnosis there is no IC-156 (RW-16)', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    await stage.press('IC-155')
    stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
    await stage.press('IC-157')
    expect(entryOf(stage, 'IC-156'), 'premise: a fix has been made, so the log has its entrance').not.toBeNull()
    await stage.press('IC-40')
    expect(reportOf(stage)).toBeNull()
    await stage.press('IC-107')
    expect(reportOf(stage), 'premise: the window is open again').not.toBeNull()
    expect(entryOf(stage, 'IC-156'), 'the log of the earlier fixes is gone').toBeNull()
  })
})

describe(`RW-1 / IC-168 -- ${RW_1_IC_168}`, () => {
  it('pressing IC-168 keeps the window open, keeps the marks and keeps IC-107 looking pressed', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-168')
    expect(reportOf(stage), 'the window stays open').not.toBeNull()
    expect(symbolsOf(stage, [SELF, LATE, PARENT])).toEqual(['DG-1', 'DG-2', 'DG-3'])
    expectPressed(stage, true, 'IC-107 after IC-168')
  })

  it('the button the window draws does the same when it is clicked', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    const button = rediagnoseEntryOf(stage)
    expect(button, 'the window draws data-icon="IC-168"').not.toBeNull()
    await stage.clickOn(button as FakeElement)
    expect(reportOf(stage)).not.toBeNull()
    expect(isDiagnosisDrawn(stage)).toBe(true)
    expectPressed(stage, true, 'IC-107 after the click on IC-168')
  })

  it('IC-168 from a minimized window keeps it open', async () => {
    const stage = await staged()
    await stage.press('IC-107')
    await stage.press('IC-129')
    expect(needReport(stage).shown, 'premise').toBe('minimized')
    await stage.press('IC-168')
    expect(reportOf(stage), 'the window is still there').not.toBeNull()
    expect(isDiagnosisDrawn(stage)).toBe(true)
  })

  it('the log of fixes is kept across IC-168 (RW-16)', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    await stage.press('IC-155')
    stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
    await stage.press('IC-157')
    expect(entryOf(stage, 'IC-156'), 'premise: a fix has been made').not.toBeNull()
    await stage.press('IC-168')
    expect(reportOf(stage), 'the window is open').not.toBeNull()
    expect(entryOf(stage, 'IC-156'), 'the log of the earlier fixes is kept').not.toBeNull()
  })
})

describe(`RW-3 -- ${RW_3_HEAD} ${RW_3_EVERY_TABLE}`, () => {
  const lineOf = (stage: WindowStage): FakeElement => {
    const tool = entryOf(stage, 'IC-140')
    const line = tool?.parentNode ?? null
    if (line === null) throw new Error('the window draws no line holding IC-140')
    return line as FakeElement
  }

  it.each<[Language]>([['ja'], ['en']])('IC-168 is a button with its word, the first child of the line holding IC-140 (%s)', async (language) => {
    const stage = await staged(language)
    await stage.press('IC-107')
    const button = rediagnoseEntryOf(stage)
    expect(button, 'IC-168 is drawn in the window').not.toBeNull()
    expect(button?.tagName).toBe('BUTTON')
    expect(button?.textContent.trim(), `the word of IC-168 in ${language}`).toBe(RE_WORD(language))
    const line = lineOf(stage)
    expect(line.children[0], 'IC-168 stands at the left end of the line').toBe(button)
    expect(line.children.indexOf(entryOf(stage, 'IC-140') as FakeElement), 'IC-140 follows it').toBeGreaterThan(0)
    const icons = line.children.map((one) => one.getAttribute('data-icon') ?? '')
    expect(icons.filter((one) => one !== '').slice(0, 3)).toEqual(['IC-168', 'IC-140', 'IC-108'])
  })

  it('the words are the two of the dictionary: the ja and en words of IC-168', () => {
    expect(RE_WORD('ja')).toBe('再診断')
    expect(RE_WORD('en')).toBe('Diagnose Again')
  })

  it('IC-168 is there in the diagnosis table, in the proposals table and in the log table', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    expect(rediagnoseEntryOf(stage), 'IC-154 (the diagnosis table)').not.toBeNull()
    await stage.press('IC-155')
    expect(rediagnoseEntryOf(stage), 'IC-155 (the proposals)').not.toBeNull()
    expect(lineOf(stage).children[0]).toBe(rediagnoseEntryOf(stage))
    stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
    await stage.press('IC-157')
    await stage.press('IC-156')
    expect(entryOf(stage, 'IC-156'), 'premise: the log has its entrance').not.toBeNull()
    expect(rediagnoseEntryOf(stage), 'IC-156 (the log)').not.toBeNull()
    expect(lineOf(stage).children[0]).toBe(rediagnoseEntryOf(stage))
  })
})

function taskCountOfDocument(stage: WindowStage): string {
  return JSON.stringify(stage.loop.document().schedule.tasks)
}
