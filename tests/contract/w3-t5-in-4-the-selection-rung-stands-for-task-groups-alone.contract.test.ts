// W3 spec-only tester 5: the IN-4 selection rung stands for chosen task groups alone (FR-085) and clears both selections (T-283 RG-6, T-293).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { escapeContextOf } from '../../src/adapter/input-command-translator/input-command-translator'
import type { Document } from '../../src/entity/document-model/document/document'
import { escapeTarget } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection, selectionWith } from '../../src/entity/document-model/selection/selection'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import { contextOf } from './cr-606-stage'
import { specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see IN-4
const IN_4_BOTH_SELECTIONS =
  '⭐ 段「選択」は、表 T-023c の対象を選んでいるときにも、タスクグループパネルのタスクグループだけを選んでいるとき（`FR-085`）にも立ち、両方の選択を解くこと（MUST）'

type Loose = Record<string, unknown>

const BUILT_VERSION: string = (startupTemplate as { schemaVersion: string }).schemaVersion

/** @purity pure */
function templateDocument(): Document {
  const read = documentFromJson(JSON.stringify(startupTemplate), BUILT_VERSION)
  if (!read.ok) throw new Error(`the startup template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const DOCUMENT = templateDocument()
const ROW_IDS = DOCUMENT.schedule.taskGroups.slice(0, 2).map((one) => one.id)
const FIRST_TASK = { kind: 'task', uid: DOCUMENT.schedule.tasks[0]?.uid ?? 0 } as const

/** @purity pure */
function selectionRegionOf(session: ScreenSession): Loose {
  return (session as unknown as Loose)['selection'] as Loose
}

/** @purity pure */
function sessionWith(selection: Loose): ScreenSession {
  const base = emptyScreenSession as unknown as Loose
  return { ...base, selection: { ...selectionRegionOf(emptyScreenSession), ...selection } } as unknown as ScreenSession
}

/** @purity pure */
function escapeOn(session: ScreenSession): ScreenSession {
  // WHY: the event carries the rung the caller has just found (T-293 selection/selectionEscapePressed).
  return advanceScreenSession(session, { type: 'selectionEscapePressed', rung: 'selection' } as unknown as SessionEvent).state
}

const OBJECTS = { items: [FIRST_TASK], ordered: true }

describe('W3-T5 -- the manuscript these cases are driven by', () => {
  it('01-04 IN-4 still says it, word for word', () => {
    expect(REQUIREMENTS).toContain(IN_4_BOTH_SELECTIONS)
  })

  it('table T-283 RG-6 is the Esc rung 選択 and names the chosen task groups of FR-085', () => {
    const row = specTable('T-283').rows.find((one) => one.id === 'RG-6')
    const text = row?.cells.join('|') ?? ''
    expect(text).toContain('選択')
    expect(text).toContain('chosenTaskGroups')
    expect(text).toContain('FR-085')
  })

  it('the template carries two task groups and a task to choose', () => {
    expect(ROW_IDS).toHaveLength(2)
    expect(FIRST_TASK.uid).toBeGreaterThan(0)
  })
})

describe(`IN-4 "${IN_4_BOTH_SELECTIONS}" -- the rung stands`, () => {
  it('task groups alone chosen in the Task Group Panel: Esc spends the 選択 rung, not the browser', () => {
    const context = { ...contextOf(DOCUMENT), selection: emptySelection(), chosenTaskGroups: ROW_IDS }
    expect(escapeTarget(escapeContextOf(context)), IN_4_BOTH_SELECTIONS).toBe('selection')
  })

  it('objects alone selected: Esc spends the 選択 rung', () => {
    const context = { ...contextOf(DOCUMENT), selection: selectionWith(emptySelection(), FIRST_TASK), chosenTaskGroups: [] }
    expect(escapeTarget(escapeContextOf(context))).toBe('selection')
  })

  it('nothing chosen at all: the 選択 rung does not stand (premise of the two cases above)', () => {
    const context = { ...contextOf(DOCUMENT), selection: emptySelection(), chosenTaskGroups: [] }
    expect(escapeTarget(escapeContextOf(context))).not.toBe('selection')
  })
})

describe(`IN-4 "${IN_4_BOTH_SELECTIONS}" -- the rung clears both`, () => {
  it('objects and task groups chosen together: one Esc on the 選択 rung clears the objects and the task groups', () => {
    const after = selectionRegionOf(escapeOn(sessionWith({ selectionState: { kind: 'objectsSelected', selectedObjects: OBJECTS }, chosenTaskGroups: ROW_IDS })))
    expect((after['selectionState'] as Loose)['kind'], IN_4_BOTH_SELECTIONS).toBe('nothingSelected')
    expect(after['chosenTaskGroups'], IN_4_BOTH_SELECTIONS).toEqual([])
  })

  it('task groups alone chosen: one Esc on the 選択 rung clears the task groups', () => {
    const after = selectionRegionOf(escapeOn(sessionWith({ chosenTaskGroups: ROW_IDS })))
    expect(after['chosenTaskGroups'], IN_4_BOTH_SELECTIONS).toEqual([])
  })
})
