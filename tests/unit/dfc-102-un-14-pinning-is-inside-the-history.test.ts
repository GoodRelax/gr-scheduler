// Unit tests for pinning's UN-14 half, table T-027, via ApplyDocumentChange.

// WHY: some cases here are red on purpose -- the build still files pinning
// under UN-16 while table T-027 moved it to UN-14 (CR-277); see DFC-102.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { type Document } from '../../src/entity/document-model/document/document'
import {
  NOT_STORED_LIMITS,
  emptyHistory,
  stepCount,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
import {
  applyDocumentChange,
  replaceDocument,
  type ApplyOutcome,
  type ChangeAudience,
  type ChangeStep,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type ReplaceOutcome,
  type SettingsLimits,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { bare, specTable } from '../contract/spec-table'

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// WHY: read at run time so renaming the manuscript's command row reaches here.
const commandKindOf = (commandRow: string): string => {
  const named = bare(rowOf('T-108', commandRow).by['確定名'] ?? '')
  if (named === '') throw new Error(`table T-108 row ${commandRow} names no command`)
  return named
}

const settingKeyOf = (settingRow: string): string => {
  const named = bare(rowOf('T-203', settingRow).by['キー'] ?? '')
  if (named === '') throw new Error(`table T-203 row ${settingRow} names no key`)
  return named
}

// WHY: read as Japanese because the classification is the exact cell value
// (rule 03 section 5's one exception: parsing a classification column).
const undoClassOf = (undoRow: string): string => bare(rowOf('T-027', undoRow).by['区分'] ?? '')

const INSIDE = '対象'
const OUTSIDE = '対象外'

const UN_14 = rowOf('T-027', 'UN-14').cells.join(' ')
const UN_16 = rowOf('T-027', 'UN-16').cells.join(' ')

const PINNED_KEY = settingKeyOf('S-126')

// WHY: BT-4 (table T-034) is the one template FR-027 keeps.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) {
    throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const START = templateDocument()

const FIRST_GROUP_ID = START.schedule.taskGroups[0]?.id ?? ''
const FIRST_TASK_UID = START.schedule.tasks[0]?.uid ?? 0

const pinnedIn = (document: Document): readonly string[] =>
  ((document.documentSettings as unknown as Record<string, unknown>)[PINNED_KEY] ??
    []) as readonly string[]

const firstTaskNameIn = (document: Document): string | null =>
  document.schedule.tasks[0]?.name ?? null

// WHY: LY-5 keeps these outside the three inner layers, so they arrive as
// arguments; rowAreaWidthWithoutPanels is wide enough that FR-052 never binds.
const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  rowAreaWidthWithoutPanels: 982,
}

// WHY: FR-031 measures a step as the JSON-serialized document, UTF-8 bytes.
const STEP_BYTES = Buffer.byteLength(JSON.stringify(START), 'utf8')

// WHY: S-94 as the caller must state it, with a memory bound wider than
// anything this file pushes -- no case here is about the bounds.
const ROOMY_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: STEP_BYTES * (NOT_STORED_LIMITS['S-94'] + 2),
}

const WRITER = 'the case at the keyboard'

// WHY: FR-063 keeps every stamp to ISO 8601 UTC seconds; one second per write.
const instantOf = (nth: number): string =>
  new Date(Date.UTC(2026, 7, 28, 0, 0, 0) + nth * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')

interface Bench {
  held: HeldDocument
  write(commands: readonly DocumentCommand[]): ApplyOutcome
  // WHY: undo goes through RD-1 (table T-230) and replaceDocument (PI-8),
  // not undo-edit.ts, which declines table T-027 in its own header.
  undo(): ReplaceOutcome
  depth(): number
}

function bench(): Bench {
  let held: HeldDocument = { document: START, history: emptyHistory<ChangeStep>() }
  let writes = 0

  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      held = next
    },
  }
  // WHY: WS-7 runs after the swap; nothing here watches, so the audience
  // only has to exist.
  const audience: ChangeAudience = { deliver: () => {} }

  return {
    get held() {
      return held
    },
    write: (commands) => {
      writes += 1
      return applyDocumentChange(
        {
          defaultRowName: DEFAULT_ROW_NAME_FIXTURE,
          readStamp: held.document.documentStamp,
          commands,
          moment: { gestureInFlight: false, editingInPlace: false, deliveringNotices: false },
          historyLimits: ROOMY_LIMITS,
          settingsLimits: SETTINGS_LIMITS,
          editedBy: WRITER,
          updatedUtc: instantOf(writes),
        },
        holder,
        audience,
      )
    },
    undo: () =>
      replaceDocument(
        {
          defaultRowName: DEFAULT_ROW_NAME_FIXTURE,
          readStamp: held.document.documentStamp,
          moment: { gestureInFlight: false, editingInPlace: false, deliveringNotices: false },
          // WHY: table T-230 forbids a replacement naming no row; RD-1 is the undo row.
          call: { row: 'RD-1' },
        },
        holder,
        audience,
      ),
    depth: () => stepCount(held.history),
  }
}

function mustWrite(one: Bench, commands: readonly DocumentCommand[], why: string): void {
  const outcome = one.write(commands)
  if (!outcome.accepted) {
    throw new Error(`${why} was refused: ${JSON.stringify(outcome.refusal)}`)
  }
}

function mustUndo(one: Bench, why: string): Document {
  const outcome = one.undo()
  if (!outcome.accepted) {
    throw new Error(`${why}: the undo was refused: ${JSON.stringify(outcome.refusal)}`)
  }
  return outcome.document
}

const pin = (groupId: string): DocumentCommand =>
  ({ kind: commandKindOf('CM-68'), groupId }) as unknown as DocumentCommand

const unpin = (groupId: string): DocumentCommand =>
  ({ kind: commandKindOf('CM-69'), groupId }) as unknown as DocumentCommand

// WHY: the unrelated edit (CM-9) writes into the schedule-data group only,
// so it cannot move S-126 -- every post-undo assertion is the history's alone.
const rename = (name: string): DocumentCommand =>
  ({ kind: commandKindOf('CM-9'), uid: FIRST_TASK_UID, name }) as unknown as DocumentCommand

const NAME_BEFORE = firstTaskNameIn(START)
const NAME_AFTER = 'RenamedWhileARowWasPinned'

describe('表 T-027 -- pinning is 対象, and the neighbouring row says so too', () => {
  it('⭐ files UN-14 under 対象, which is the whole premise of this file', () => {
    expect(undoClassOf('UN-14')).toBe(INSIDE)
  })

  it('⭐ UN-14 is the row that names pinning, and names FR-098 as its authority', () => {
    expect(UN_14).toContain('ピン止め')
    expect(UN_14).toContain('FR-098')
  })

  it('⛔ UN-16 is still 対象外 and still says pinning is NOT its row', () => {
    expect(undoClassOf('UN-16')).toBe(OUTSIDE)
    expect(UN_16).toContain('ピン止めは本行ではない')
  })

  it('⭐ UN-14 states the cost this file measures: pinning pushes a 段', () => {
    expect(UN_14).toContain('ピン止めとピン外しが取り消しの 1 段を積む')
  })

  it('⭐ table T-203 still gives S-126 the key these cases watch', () => {
    expect(PINNED_KEY).not.toBe('')
    expect(pinnedIn(START)).toEqual([])
    expect(FIRST_GROUP_ID).not.toBe('')
  })
})

describe('表 T-067 WS-4 -- a write UN-14 files under 対象 pushes one 段', () => {
  it('⭐ CM-68 pins the row and leaves exactly one 段', () => {
    // WHY: UN-14 is filed inside the history, so WS-4 pushes the step.
    const one = bench()
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')

    expect(pinnedIn(one.held.document)).toEqual([FIRST_GROUP_ID])
    expect(one.depth()).toBe(1)
  })

  it('⭐ CM-69 takes the pin off and leaves a second 段', () => {
    const one = bench()
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')
    mustWrite(one, [unpin(FIRST_GROUP_ID)], 'CM-69')

    expect(pinnedIn(one.held.document)).toEqual([])
    expect(one.depth()).toBe(2)
  })
})

describe('FR-031 / 表 T-027 UN-14 -- an undo takes a pin back', () => {
  it('⭐ one undo after CM-68 leaves the row unpinned again', () => {
    const one = bench()
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')
    expect(pinnedIn(one.held.document)).toEqual([FIRST_GROUP_ID])

    const after = mustUndo(one, 'the undo of CM-68')

    expect(after.documentSettings).toBeDefined()
    expect(pinnedIn(after)).toEqual([])
    expect(pinnedIn(one.held.document)).toEqual([])
  })

  it('⭐ one undo after CM-69 puts the pin back', () => {
    const one = bench()
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')
    mustWrite(one, [unpin(FIRST_GROUP_ID)], 'CM-69')
    expect(pinnedIn(one.held.document)).toEqual([])

    const after = mustUndo(one, 'the undo of CM-69')

    expect(pinnedIn(after)).toEqual([FIRST_GROUP_ID])
  })

  // WHY: this is what tells UN-14 apart from UN-16 -- a UN-14 step carries
  // the document as it stood before the pin, so undoing it must remove the pin.
  it('⛔ an unrelated edit made BEFORE the pin is not what the undo takes back', () => {
    const one = bench()
    mustWrite(one, [rename(NAME_AFTER)], 'CM-9')
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')
    expect(one.depth()).toBe(2)

    const after = mustUndo(one, 'the undo of CM-68 over an earlier CM-9')

    expect(pinnedIn(after)).toEqual([])
    expect(firstTaskNameIn(after)).toBe(NAME_AFTER)
    expect(one.depth()).toBe(1)
  })

  it('⛔ the pin outlives the undo of a LATER edit, and the next undo takes it back', () => {
    // WHY: the step CM-9 pushed carries the document as it stood before that
    // rename, and it was already pinned, so this undo hands the pin back.
    const one = bench()
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')
    mustWrite(one, [rename(NAME_AFTER)], 'CM-9')
    expect(one.depth()).toBe(2)

    const afterFirst = mustUndo(one, 'the undo of the unrelated CM-9')
    expect(firstTaskNameIn(afterFirst)).toBe(NAME_BEFORE)
    expect(pinnedIn(afterFirst)).toEqual([FIRST_GROUP_ID])

    const afterSecond = mustUndo(one, 'the undo of CM-68 itself')
    expect(pinnedIn(afterSecond)).toEqual([])
    expect(firstTaskNameIn(afterSecond)).toBe(NAME_BEFORE)
  })
})
