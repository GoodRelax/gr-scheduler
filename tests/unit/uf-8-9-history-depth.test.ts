// Unit test: undo history DEPTH (FR-031, S-94/S-95) through the real write path.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  NOT_STORED_LIMITS,
  emptyHistory,
  stepCount,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
import {
  applyDocumentChange,
  type ApplyOutcome,
  type ChangeAudience,
  type ChangeStep,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type SettingsLimits,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { redoEdit } from '../../src/use-case/redo-edit/redo-edit'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { bare, specTable } from '../contract/spec-table'

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const S_94_ROW = rowOf('T-206', 'S-94')
const S_95_ROW = rowOf('T-206', 'S-95')

const S_94 = Number.parseInt(bare(S_94_ROW.by['既定'] ?? '').replace(/[^\d]/g, ''), 10)

// WHY: the unit is read, not assumed -- FR-031 requires S-95 be counted in
// bytes, so a manuscript restating this row in another unit must reach here.
const S_95_STATED = /`?(\d+)`?\s*(MB|KB|GB|B)\b/.exec(S_95_ROW.by['既定'] ?? '')
if (S_95_STATED === null) {
  throw new Error(`table T-206 row S-95: no "<number> <unit>" in ${S_95_ROW.by['既定'] ?? ''}`)
}
const S_95_NUMBER = Number.parseInt(S_95_STATED[1] ?? '', 10)
const S_95_UNIT = S_95_STATED[2] ?? ''

// WHY: parsed rather than assumed -- this is the sentence the shipped
// defect walked past, so a hand-written *1024*1024 could agree with a wrong manuscript.
const MB_FACTOR = (() => {
  const said = /1\s*MB\s*=\s*(\d+)\s*×\s*(\d+)\s*バイト/.exec(S_95_ROW.by['保存しない理由'] ?? '')
  if (said === null) {
    throw new Error('table T-206 row S-95: its remark no longer states what one MB is')
  }
  return Number.parseInt(said[1] ?? '', 10) * Number.parseInt(said[2] ?? '', 10)
})()

const S_95_BYTES = S_95_NUMBER * MB_FACTOR

// WHY: manuscript-to-manuscript -- table T-027's UN-16 names FR- ids, and
// table T-108's own column says which command owns each one.
const UN_16_REQUIREMENTS = [
  ...new Set((rowOf('T-027', 'UN-16').by['操作'] ?? '').match(/FR-\d+/g) ?? []),
]

interface ExcludedCommand {
  readonly commandRow: string
  readonly kind: string
  readonly requirement: string
}

const UN_16_COMMANDS: readonly ExcludedCommand[] = specTable('T-108')
  .rows.filter((row) => UN_16_REQUIREMENTS.includes(bare(row.by['正'] ?? '')))
  .map((row) => ({
    commandRow: row.id,
    kind: bare(row.by['確定名'] ?? ''),
    requirement: bare(row.by['正'] ?? ''),
  }))

const CM_9 = bare(rowOf('T-108', 'CM-9').by['確定名'] ?? '')

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE_TEXT = readFileSync(TEMPLATE_PATH, 'utf8')

function templateDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) {
    throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const START = templateDocument()

// WHY: Buffer.byteLength(..., 'utf8') is the encoded length FR-031 asks
// for -- never .length, which counts characters, which the same clause forbids.
const STEP_BYTES = Buffer.byteLength(jsonFromDocument(START), 'utf8')

const FIRST_GROUP_ID = START.schedule.taskGroups[0]?.id ?? ''
const FIRST_TASK_UID = START.schedule.tasks[0]?.uid ?? 0

// WHY: LY-5 keeps these outside the three inner layers, so they arrive as
// arguments; the values are wide enough that no case below is refused by them.
const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: 0.02,
  zoomMax: 64,
  rowAreaWidthWithoutPanels: 982,
}

const REAL_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * MB_FACTOR,
}

const WRITER = 'the case at the keyboard'

const instantOf = (nth: number): string =>
  new Date(Date.UTC(2026, 7, 22, 0, 0, 0) + nth * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')

interface Bench {
  held: HeldDocument
  write(commands: readonly DocumentCommand[]): ApplyOutcome
  depth(): number
  json(): string
}

function bench(limits: HistoryLimits = REAL_LIMITS): Bench {
  // TRAP: resetting this per call of writeNames, not per bench, would let a
  // second call rewrite "edit 1" over "edit 1" and add no step at all.
  namesWritten = 0
  let held: HeldDocument = { document: START, history: emptyHistory<ChangeStep>() }
  let writes = 0

  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      held = next
    },
  }
  // WHY: nothing in this file watches WS-7's delivery, so the audience
  // only has to exist; what it is told is uf-27-28-29's case.
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
          historyLimits: limits,
          settingsLimits: SETTINGS_LIMITS,
          editedBy: WRITER,
          updatedUtc: instantOf(writes),
        },
        holder,
        audience,
      )
    },
    depth: () => stepCount(held.history),
    json: () => JSON.stringify(held.document),
  }
}

// WHY: the cast is the price of reading CM_9 from the manuscript instead of
// typing it; a renamed row surfaces as a refused write, not a compile error.
let namesWritten = 0

function writeNames(one: Bench, nth: number): void {
  for (let i = 1; i <= nth; i += 1) {
    namesWritten += 1
    const outcome = one.write([
      { kind: CM_9, uid: FIRST_TASK_UID, name: `edit ${namesWritten}` } as unknown as DocumentCommand,
    ])
    if (!outcome.accepted) {
      throw new Error(`write ${i} was refused: ${JSON.stringify(outcome.refusal)}`)
    }
  }
}

// WHY: each value differs from the bundled document's own, so a command
// that changed nothing could not hide behind table T-027 for a different reason.
const PAYLOAD: Readonly<Record<string, DocumentCommand>> = {
  setPanelWidths: { kind: 'setPanelWidths', rowTitlePanelWidth: 200, propertyPanelWidth: 300 },
  pinTaskGroup: { kind: 'pinTaskGroup', groupId: FIRST_GROUP_ID },
  unpinTaskGroup: { kind: 'unpinTaskGroup', groupId: FIRST_GROUP_ID },
}

describe('表 T-206 -- the two values FR-031 says the bounds are', () => {
  it('S-94: the generated constant carries the 段数 the manuscript states', () => {
    expect(S_94).toBeGreaterThan(0)
    expect(NOT_STORED_LIMITS['S-94']).toBe(S_94)
  })

  it('S-95: the manuscript states it in MB, and the generated constant is that number', () => {
    expect(S_95_UNIT).toBe('MB')
    expect(NOT_STORED_LIMITS['S-95']).toBe(S_95_NUMBER)
  })

  it('S-95: its own remark settles the factor -- 「1 MB = 1024 × 1024 バイトとする」', () => {
    expect(MB_FACTOR).toBe(1024 * 1024)
    expect(S_95_BYTES).toBe(S_95_NUMBER * MB_FACTOR)
  })
})

describe('FR-031 / S-94 -- 段数の上限は、実際の書き込みを通して届くこと', () => {
  it('S-94: more real writes than S-94 through CP-8 leave exactly S-94 段', () => {
    const one = bench()
    writeNames(one, S_94 + 3)
    expect(one.depth()).toBe(S_94)
  })

  it('S-94 / WS-4: every write below the bound adds one 段, so depth counts writes', () => {
    const one = bench()
    for (let i = 1; i <= 5; i += 1) {
      writeNames(one, 1)
      expect(one.depth(), `after ${i} writes`).toBe(i)
    }
  })

  it('S-94: S-94 undos each change the document, and the next one does not', () => {
    const one = bench()
    writeNames(one, S_94 + 3)

    let held = one.held
    for (let i = 1; i <= S_94; i += 1) {
      const before = JSON.stringify(held.document)
      const back = undoEdit(held)
      expect(back.undone, `undo ${i} of ${S_94}`).toBe(true)
      held = back.next
      expect(JSON.stringify(held.document), `undo ${i} changed the document`).not.toBe(before)
    }

    const past = JSON.stringify(held.document)
    const beyond = undoEdit(held)
    expect(beyond.undone, `undo ${S_94 + 1}`).toBe(false)
    expect(JSON.stringify(beyond.next.document)).toBe(past)
  })

  it('S-94: 上限を超えたときは最も古い段から捨てる -- the OLDEST goes, so the newest still undoes', () => {
    const one = bench()
    writeNames(one, S_94 + 3)

    const back = undoEdit(one.held)
    expect(back.undone).toBe(true)
    const undoneTo = back.next.document.schedule.tasks.find((drawnText) => drawnText.uid === FIRST_TASK_UID)
    expect(undoneTo?.name).toBe(`edit ${S_94 + 2}`)
  })
})

describe('FR-031 / S-95 -- 合計メモリの上限は MB で書かれ、バイトで数えられる', () => {
  it('S-95: one 段 of the bundled document already exceeds S-95 read as a bare byte count', () => {
    // WHY: a document too small would make S-95-as-bytes and S-95-as-MB
    // keep the same depth, hiding the defect -- which is why BT-4 is used.
    expect(STEP_BYTES).toBeGreaterThan(NOT_STORED_LIMITS['S-95'])
  })

  it('S-95 / S-94: the 段数 that fits is min(S-94, S-95 バイト ÷ 1 段の保存形)', () => {
    const fitsByMemory = Math.floor(S_95_BYTES / STEP_BYTES)
    const expected = Math.min(S_94, fitsByMemory)

    const one = bench()
    writeNames(one, S_94 + 3)
    expect(one.depth()).toBe(expected)
  })

  it('S-95: handed over unconverted, the bound is S-95 バイト and the history collapses below S-94', () => {
    // TRAP: FR-031 says the COUNT is bytes; it does not say the VALUE is,
    // and S-95's own default cell says MB -- confusing the two silently regresses this.
    const one = bench({ maxSteps: S_94, maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] })
    writeNames(one, S_94 + 3)
    expect(one.depth()).toBeLessThan(S_94)
  })

  it('S-95: the 合計 is measured against the document, so a wider bound keeps more 段', () => {
    // WHY: exact counts are not asserted because FR-031 leaves the serial
    // form of a step open; only the shape (wider bound, more steps) is settled.
    const narrow = bench({ maxSteps: S_94, maxTotalSizeBytes: STEP_BYTES * 3 })
    writeNames(narrow, 20)
    const wide = bench({ maxSteps: S_94, maxTotalSizeBytes: STEP_BYTES * 12 })
    writeNames(wide, 20)

    expect(narrow.depth()).toBeGreaterThan(1)
    expect(narrow.depth()).toBeLessThan(wide.depth())
    expect(wide.depth()).toBeLessThan(S_94)
  })
})

describe('FR-031 / 表 T-027 -- 対象と対象外を、同じ書き込みの経路で', () => {
  it('UN-3 / CM-9: a `Task` property change (PR-1 `name`) leaves one 段', () => {
    const one = bench()
    const before = one.json()
    writeNames(one, 1)
    expect(one.json()).not.toBe(before)
    expect(one.depth()).toBe(1)
  })

  it('UN-16 names one requirement, and table T-108 gives it one command', () => {
    expect(UN_16_REQUIREMENTS.sort()).toEqual(['FR-052'])
    expect(UN_16_COMMANDS.map((oneCell) => oneCell.commandRow)).toEqual(['CM-67'])
  })

  describe('UN-16 対象外 -- 見る場所の割り付け', () => {
    for (const command of UN_16_COMMANDS) {
      it(`UN-16 / ${command.commandRow} \`${command.kind}\` (${command.requirement}): changes the document and leaves NO 段`, () => {
        const one = bench()
        // WHY: unpinning needs something pinned first; pinning is itself
        // out of scope, so the history is still empty for this case's own write.
        if (command.kind === 'unpinTaskGroup') {
          const pinned = one.write([PAYLOAD['pinTaskGroup'] as DocumentCommand])
          expect(pinned.accepted, 'the precondition write').toBe(true)
        }

        const payload = PAYLOAD[command.kind]
        expect(payload, `no payload for ${command.kind}`).toBeDefined()

        const before = one.json()
        const outcome = one.write([payload as DocumentCommand])

        expect(outcome.accepted, JSON.stringify(outcome)).toBe(true)
        expect(one.json(), 'the command really did change the document').not.toBe(before)
        expect(one.depth()).toBe(0)
      })
    }
  })

  it('UN-16 / WS-4: an out-of-scope write cannot bury the 段 the edit before it left', () => {
    const one = bench()
    writeNames(one, 1)
    expect(one.depth()).toBe(1)
    one.write([PAYLOAD['setPanelWidths'] as DocumentCommand])
    expect(one.depth()).toBe(1)

    const back = undoEdit(one.held)
    expect(back.undone).toBe(true)
  })
})

describe('FR-031 -- 取り消して、やり直して、元の文書へ戻る', () => {
  it('undoing every 段 lands byte-identically on the document the writes started from', () => {
    const one = bench()
    const started = JSON.stringify(START)
    writeNames(one, 5)
    expect(one.json()).not.toBe(started)

    let held = one.held
    for (let i = 1; i <= 5; i += 1) {
      const back = undoEdit(held)
      expect(back.undone, `undo ${i}`).toBe(true)
      held = back.next
    }
    expect(JSON.stringify(held.document)).toBe(started)
  })

  it('redoing every 段 lands byte-identically on the document the undos started from', () => {
    const one = bench()
    writeNames(one, 5)
    const afterWrites = one.json()

    let held = one.held
    for (let i = 1; i <= 5; i += 1) held = undoEdit(held).next
    for (let i = 1; i <= 5; i += 1) {
      const forward = redoEdit(held)
      expect(forward.redone, `redo ${i}`).toBe(true)
      held = forward.next
    }
    expect(JSON.stringify(held.document)).toBe(afterWrites)
  })

  it('S-94: the full round trip holds at the bound too -- S-94 undos, then S-94 redos', () => {
    const one = bench()
    writeNames(one, S_94 + 3)
    const afterWrites = one.json()

    let held = one.held
    for (let i = 1; i <= S_94; i += 1) {
      const back = undoEdit(held)
      expect(back.undone, `undo ${i} of ${S_94}`).toBe(true)
      held = back.next
    }
    for (let i = 1; i <= S_94; i += 1) {
      const forward = redoEdit(held)
      expect(forward.redone, `redo ${i} of ${S_94}`).toBe(true)
      held = forward.next
    }
    expect(JSON.stringify(held.document)).toBe(afterWrites)
  })
})
