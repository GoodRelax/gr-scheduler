// CR-710 wave 2 (spec-only): FO-13 / K-146 switches the time of day on the document settings face (FR-158), outside undo (UN-7), and FR-016 pulls the zoom back.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { commandFromFieldCommit, type HumanInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  FieldCommit,
  PropertyField,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { RATIO, notStored, stored } from '../unit/cr-430-cross-section-scene'
import { contextOf, documentOf, taskOf } from './cr-606-stage'
import { bare, specTable, unbroken } from './spec-table'
import { exportStage, restoreAnimationFrames, type ExportStage } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))
const GLOSSARY = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8').replace(/\r\n/g, '\n'))

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly settings: readonly { readonly rowId: string; readonly label: Record<DisplayLanguage, string> }[]
}

// see FR-158, FR-016, FR-072, UN-7
const FR_158_STORED = '保存する値（`GRS JSON`・MSPDI）は、切り替えによらず時刻まで書くこと（MUST）'
const FR_016_BACK = '時刻の表示を切ったとき、`zoomX` が日付の軸の上限を超えていれば、その上限へ戻すこと（MUST）'
const FR_072_ORDER = '⭐ 本面の欄の並びと欄の名は 表 T-369 に従うこと（MUST）'
const FO_13_ROW = '| FO-13 | 時刻を表示する | 表 T-104 の `K-146` | `FR-158` |'
const UN_7_ROW = '`FR-158` の「時刻を表示する」を含む'

// see T-108
const commandNameOf = (id: string): string => bare(specTable('T-108').rows.find((one) => one.id === id)?.by['確定名'] ?? '')
const CM_97 = commandNameOf('CM-97')

const K_146 = 'K-146'
const K_140 = 'K-140'
const SHOWS_TIME_OF_DAY = 'showsTimeOfDay'

const wordOf = (rowId: string, language: DisplayLanguage): string =>
  WORDS.settings.find((one) => one.rowId === rowId)?.label[language] ?? `(no dictionary word for ${rowId})`

describe('the clauses these cases are built from still read as quoted', () => {
  it.each([FR_158_STORED, FR_016_BACK, FR_072_ORDER, FO_13_ROW, UN_7_ROW])('%s', (clause) => {
    expect(`${REQUIREMENTS}\n${GLOSSARY}`).toContain(clause)
  })

  it('premise: CM-97 names a command', () => {
    expect(CM_97).not.toBe('')
  })
})

// WHY: two tasks on a screen narrow enough that the ceiling of the days is below the ceiling of the hours.
const TASKS = [taskOf(1), taskOf(2, { start: '2026-05-04T08:00:00', finish: '2026-05-15T17:00:00' })]
const documentWith = (settings: Readonly<Record<string, unknown>>): Document => {
  const base = documentOf({ tasks: TASKS })
  return { ...base, documentSettings: { ...base.documentSettings, ...settings } } as unknown as Document
}

async function settingsStage(document: Document, language: DisplayLanguage = 'ja'): Promise<ExportStage> {
  const stage = exportStage(document, undefined, language)
  await stage.take('IC-17')
  return stage
}

const fieldsOf = (view: ScreenView): readonly PropertyField[] => view.propertiesPanel?.fields ?? []

const fieldOf = (view: ScreenView, row: string): PropertyField => {
  const found = fieldsOf(view).filter((one) => one.row === row)
  if (found.length !== 1) throw new Error(`expected one field ${row} on the settings face, got ${found.length}`)
  return found[0] as PropertyField
}

const commitOf = (text: string): FieldCommit =>
  ({ row: K_146, key: { holder: 'documentSettings', column: SHOWS_TIME_OF_DAY }, text }) as FieldCommit

async function commitOn(stage: ExportStage, commit: FieldCommit): Promise<void> {
  stage.commitNext(commit)
  await stage.pointAt(1, 1)
}

const kindsOf = (commands: readonly unknown[]): string[] => commands.map((one) => String((one as { kind?: unknown }).kind))

const showsOf = (stage: ExportStage): unknown => (stage.loop.document().documentSettings as unknown as Record<string, unknown>)[SHOWS_TIME_OF_DAY]
const zoomXOf = (stage: ExportStage): number => stage.loop.document().documentSettings.zoomX

const dayCeilingOf = (stage: ExportStage): number => {
  const frame = stage.loop.current()
  if (frame === null) throw new Error('premise: a frame was drawn')
  // see FR-016, S-229, S-1, FR-039
  return frame.regions.taskGroupArea.width / (notStored('S-229') * stored('S-1') * RATIO)
}

const CTRL_Z = { kind: 'key', key: 'z', modifiers: { ctrl: true, shift: false, alt: false, meta: false } } as unknown as HumanInput

describe('FR-158, FR-072 T-369 FO-13: the field of the switch', () => {
  it.each(['ja', 'en'] as const)('K-146 is one check box named by the dictionary -- %s', async (language) => {
    const field = fieldOf((await settingsStage(documentWith({}), language)).lastView(), K_146)
    expect(field.name).toBe(wordOf(K_146, language))
    expect(field.controls.map((one) => one.kind)).toEqual(['boolean'])
  })

  it('sits after FO-12 (K-140) in the order of table T-369', async () => {
    const rows = fieldsOf((await settingsStage(documentWith({}))).lastView()).map((one) => one.row)
    expect(rows).toContain(K_140)
    expect(rows).toContain(K_146)
    expect(rows.indexOf(K_146)).toBeGreaterThan(rows.indexOf(K_140))
  })

  it('is not on the panel of a chosen task: it is a setting of the document', async () => {
    const stage = exportStage(documentWith({}))
    expect(fieldsOf(stage.lastView()).filter((one) => one.row === K_146)).toEqual([])
  })
})

describe('FR-158, CM-97: pressing the check box issues one setShowsTimeOfDay', () => {
  it('turns the time on with one command of the name T-108 gives CM-97', () => {
    const document = documentWith({ [SHOWS_TIME_OF_DAY]: false })
    expect(kindsOf(commandFromFieldCommit(commitOf('true'), contextOf(document)))).toEqual([CM_97])
  })

  it('turns the time off with one command of the same name', () => {
    const document = documentWith({ [SHOWS_TIME_OF_DAY]: true })
    expect(kindsOf(commandFromFieldCommit(commitOf('false'), contextOf(document)))).toEqual([CM_97])
  })

  it('writes the value to the document settings, on and then off', async () => {
    const stage = await settingsStage(documentWith({ [SHOWS_TIME_OF_DAY]: false }))
    expect(showsOf(stage)).toBe(false)
    await commitOn(stage, commitOf('true'))
    expect(showsOf(stage)).toBe(true)
    await commitOn(stage, commitOf('false'))
    expect(showsOf(stage)).toBe(false)
  })
})

describe('UN-7: the switch is a display toggle and stands outside undo', () => {
  it('an undo after the switch does not turn the time back off', async () => {
    const stage = await settingsStage(documentWith({ [SHOWS_TIME_OF_DAY]: false }))
    await commitOn(stage, commitOf('true'))
    await stage.press(CTRL_Z)
    expect(showsOf(stage)).toBe(true)
  })

  it('an undo after switching it off does not turn the time back on', async () => {
    const stage = await settingsStage(documentWith({ [SHOWS_TIME_OF_DAY]: true }))
    await commitOn(stage, commitOf('false'))
    await stage.press(CTRL_Z)
    expect(showsOf(stage)).toBe(false)
  })
})

describe('FR-016: turning the time off pulls a zoomX that is over the ceiling of the days back to it', () => {
  const ZOOM_OVER_THE_DAYS = 200
  const ZOOM_UNDER_THE_DAYS = 2

  it('a zoomX above the ceiling of the days goes back to that ceiling', async () => {
    const stage = await settingsStage(documentWith({ [SHOWS_TIME_OF_DAY]: true, zoomX: ZOOM_OVER_THE_DAYS }))
    const ceiling = dayCeilingOf(stage)
    expect(ceiling).toBeLessThan(ZOOM_OVER_THE_DAYS)
    await commitOn(stage, commitOf('false'))
    expect(zoomXOf(stage)).toBeCloseTo(ceiling, 6)
  })

  it('a zoomX that is already under the ceiling of the days is left as it is', async () => {
    const stage = await settingsStage(documentWith({ [SHOWS_TIME_OF_DAY]: true, zoomX: ZOOM_UNDER_THE_DAYS }))
    expect(dayCeilingOf(stage)).toBeGreaterThan(ZOOM_UNDER_THE_DAYS)
    await commitOn(stage, commitOf('false'))
    expect(zoomXOf(stage)).toBe(ZOOM_UNDER_THE_DAYS)
  })

  it('turning the time on moves no zoom', async () => {
    const stage = await settingsStage(documentWith({ [SHOWS_TIME_OF_DAY]: false, zoomX: ZOOM_UNDER_THE_DAYS }))
    await commitOn(stage, commitOf('true'))
    expect(zoomXOf(stage)).toBe(ZOOM_UNDER_THE_DAYS)
  })
})
