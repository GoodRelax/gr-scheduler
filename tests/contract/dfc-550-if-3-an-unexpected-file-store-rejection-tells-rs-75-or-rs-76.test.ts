// DFC-550 spec-only cases: IF-3 -- when a FileStore read or write rejects unexpectedly, the caller tells it at the end of the path as RS-75 (read) or RS-76 (write) of T-233, and the file operation's wait (T-290 fileOperationStateMachine) still ends.

import { describe, expect, it, vi } from 'vitest'

import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  DESIGN,
  OPEN_CHOOSER,
  STATE_MACHINES_SOURCE,
  jsonBytes,
  keyOfRow,
  reasonWords,
  shellStage,
  stageWithTarget,
  there,
} from './cr-610-file-flow-stage'
import { specTable } from './spec-table'

// WHY: the bench builds its FileStore (IF-3, CP-28) from this public entry; wrapping the factory
// hands the shell a store whose chosen methods reject, with no src internals touched.
const control = vi.hoisted(() => ({ rejecting: new Set<string>(), rejected: [] as string[] }))

vi.mock('../../src/framework/file-system-access-file-store/file-system-access-file-store', async (importOriginal) => {
  const real =
    await importOriginal<typeof import('../../src/framework/file-system-access-file-store/file-system-access-file-store')>()
  return {
    ...real,
    fileSystemAccessFileStore: (...args: Parameters<typeof real.fileSystemAccessFileStore>) => {
      const store = real.fileSystemAccessFileStore(...args) as unknown as Record<string, unknown>
      return new Proxy(store, {
        get(target, property, receiver) {
          const value = Reflect.get(target, property, receiver)
          if (typeof value !== 'function' || typeof property !== 'string') return value
          return (...given: unknown[]) => {
            if (control.rejecting.has(property)) {
              control.rejected.push(property)
              return Promise.reject(new Error(`DFC-550 stand-in: ${property} failed for an unexpected reason`))
            }
            return (value as (...a: unknown[]) => unknown).apply(target, given)
          }
        },
      })
    },
  }
})

const IF_3_TELLS =
  '⭐ 読み書きの道が思いがけず失敗したとき（`Promise` の拒否）は、呼ぶ側がその道の終わりで、読む道は `01-04-requirements.md` の 表 T-233 の `RS-75`、書く道は同表の `RS-76` として告げること（MUST） —— どの操作が失敗したかを告げ、黙って捨てない'

const READ_FAILED = 'RS-75'
const WRITE_FAILED = 'RS-76'
const NOTHING_TO_DO = 'RS-27'

const READ = 'readFileToOpen'
const OVERWRITE = 'overwriteOpenedFile'
const WRITE_CHOSEN = 'writeChosenFile'

const reasonsOf = (view: ScreenView): readonly string[] =>
  view.notices.flatMap((one) => one.raisedNotices.map((two) => two.reason))
const shownTexts = (view: ScreenView): readonly string[] => view.notices.map((one) => one.text)

function rejectFrom(...methods: string[]): void {
  control.rejecting.clear()
  control.rejected.length = 0
  for (const one of methods) control.rejecting.add(one)
}

function rejectNothing(): void {
  control.rejecting.clear()
}

async function withRejections<T>(body: () => Promise<T>): Promise<T> {
  try {
    return await body()
  } finally {
    control.rejecting.clear()
    control.rejected.length = 0
  }
}

describe('DFC-550 -- the manuscript these cases are driven by', () => {
  it('IF-3 (table T-065) still makes the caller tell a rejected read as RS-75 and a rejected write as RS-76', () => {
    expect(DESIGN).toContain(IF_3_TELLS)
  })

  it.each([READ_FAILED, WRITE_FAILED])('table T-233 holds %s as an NT-3a notice that is shown, sourced from IF-3', (id) => {
    const row = specTable('T-233').rows.find((one) => one.id === id)
    expect(row, `table T-233 has no row ${id}`).toBeDefined()
    const cells = (row?.cells ?? []).join(' | ')
    expect(cells).toContain('`NT-3a`')
    expect(cells).toContain('出す')
    expect(cells).toContain('`IF-3`')
  })

  it('T-290 fileOperationStateMachine leaves the read state on documentOpenFailed and the write state on documentFileWriteEnded, both to idle', () => {
    const machine = STATE_MACHINES_SOURCE.regions
      .flatMap((one) => (one['machines'] ?? []) as Record<string, any>[])
      .find((one) => one['name'] === 'fileOperationStateMachine')
    expect(machine?.['transitions']?.['documentOpenFailed']?.['readingDocumentFile']?.['to']).toBe('idle')
    expect(machine?.['transitions']?.['documentFileWriteEnded']?.['writingDocumentFile']?.['to']).toBe('idle')
    expect(machine?.['transitions']?.['documentOpenAsked']?.['readingDocumentFile']?.['effectArgument']).toBe(NOTHING_TO_DO)
    expect(machine?.['transitions']?.['documentFileWriteAsked']?.['writingDocumentFile']?.['effectArgument']).toBe(NOTHING_TO_DO)
  })
})

describe('DFC-550 -- IF-3 a rejected read is told as RS-75 (table T-233)', () => {
  it('IF-3, RS-75: SK-10 (OP-2, the chooser) whose read rejects tells RS-75 and not RS-76', async () =>
    withRejections(async () => {
      const built = await shellStage()
      rejectFrom(READ)
      await built.open(built.file('incoming.json', jsonBytes(there())))
      expect(control.rejected, 'precondition: SK-10 never asked the store to read').toContain(READ)
      expect(reasonsOf(built.last())).toContain(READ_FAILED)
      expect(reasonsOf(built.last())).not.toContain(WRITE_FAILED)
      expect(shownTexts(built.last())).toContain(reasonWords(READ_FAILED).text.ja)
    }))

  it('IF-3, RS-75: a dropped file (OP-2) whose read rejects tells RS-75', async () =>
    withRejections(async () => {
      const built = await shellStage()
      rejectFrom(READ)
      await built.drop(built.file('dropped.json', jsonBytes(there())))
      expect(control.rejected, 'precondition: the drop never asked the store to read').toContain(READ)
      expect(reasonsOf(built.last())).toContain(READ_FAILED)
      expect(reasonsOf(built.last())).not.toContain(WRITE_FAILED)
    }))

  it('IF-3, RS-75: SK-21 (OP-13, reading the opened file again) whose read rejects tells RS-75', async () =>
    withRejections(async () => {
      const { built } = await stageWithTarget()
      rejectFrom(READ)
      await built.key(keyOfRow('SK-21'))
      expect(control.rejected, 'precondition: SK-21 never asked the store to read').toContain(READ)
      expect(reasonsOf(built.last())).toContain(READ_FAILED)
      expect(reasonsOf(built.last())).not.toContain(WRITE_FAILED)
    }))

  it('IF-3, T-290 documentOpenFailed: after a rejected read the wait ends, so the next SK-10 raises U-56 and is not refused with RS-27 (OP-8)', async () =>
    withRejections(async () => {
      const built = await shellStage()
      rejectFrom(READ)
      await built.open(built.file('incoming.json', jsonBytes(there())))
      expect(control.rejected, 'precondition: SK-10 never asked the store to read').toContain(READ)
      rejectNothing()
      const refusedBefore = reasonsOf(built.last()).filter((one) => one === NOTHING_TO_DO).length
      const failedBefore = reasonsOf(built.last()).filter((one) => one === READ_FAILED).length
      await built.open(built.file('second.json', jsonBytes(there())))
      expect(built.last().openModal?.surface).toBe(OPEN_CHOOSER())
      expect(reasonsOf(built.last()).filter((one) => one === NOTHING_TO_DO).length).toBe(refusedBefore)
      expect(reasonsOf(built.last()).filter((one) => one === READ_FAILED).length, 'a read that resolves is not RS-75').toBe(failedBefore)
    }))
})

describe('DFC-550 -- IF-3 a rejected write is told as RS-76 (table T-233)', () => {
  it('IF-3, RS-76: SK-11 over the opened file (FR-060) whose write rejects tells RS-76 and not RS-75', async () =>
    withRejections(async () => {
      const { built } = await stageWithTarget()
      rejectFrom(OVERWRITE)
      await built.save()
      expect(control.rejected, 'precondition: SK-11 never asked the store to overwrite').toContain(OVERWRITE)
      expect(reasonsOf(built.last())).toContain(WRITE_FAILED)
      expect(reasonsOf(built.last())).not.toContain(READ_FAILED)
      expect(shownTexts(built.last())).toContain(reasonWords(WRITE_FAILED).text.ja)
    }))

  it('IF-3, RS-76: the first SK-11, writing to a chosen file, whose write rejects tells RS-76', async () =>
    withRejections(async () => {
      const built = await shellStage()
      rejectFrom(WRITE_CHOSEN)
      built.browser.toSave.push(built.file('mine.json', new Uint8Array(0)))
      await built.save()
      expect(control.rejected, 'precondition: SK-11 never asked the store to write a chosen file').toContain(WRITE_CHOSEN)
      expect(reasonsOf(built.last())).toContain(WRITE_FAILED)
      expect(reasonsOf(built.last())).not.toContain(READ_FAILED)
    }))

  it('IF-3, RS-76: an export through U-54 (IC-2) whose write rejects tells RS-76', async () =>
    withRejections(async () => {
      const built = await shellStage()
      rejectFrom(WRITE_CHOSEN)
      await built.exportAs('IO-2', built.file('exported.json', new Uint8Array(0)))
      expect(control.rejected, 'precondition: the export never asked the store to write a chosen file').toContain(WRITE_CHOSEN)
      expect(reasonsOf(built.last())).toContain(WRITE_FAILED)
      expect(reasonsOf(built.last())).not.toContain(READ_FAILED)
    }))

  it('IF-3, T-290 documentFileWriteEnded: after a rejected write the wait ends, so the next SK-11 writes the file and is not refused with RS-27', async () =>
    withRejections(async () => {
      const { built } = await stageWithTarget()
      rejectFrom(OVERWRITE)
      await built.save()
      expect(control.rejected, 'precondition: SK-11 never asked the store to overwrite').toContain(OVERWRITE)
      rejectNothing()
      built.written.length = 0
      const refusedBefore = reasonsOf(built.last()).filter((one) => one === NOTHING_TO_DO).length
      const failedBefore = reasonsOf(built.last()).filter((one) => one === WRITE_FAILED).length
      await built.save()
      expect(built.written).toEqual(['mine.json'])
      expect(reasonsOf(built.last()).filter((one) => one === NOTHING_TO_DO).length).toBe(refusedBefore)
      expect(reasonsOf(built.last()).filter((one) => one === WRITE_FAILED).length, 'a write that resolves is not RS-76').toBe(failedBefore)
    }))
})
