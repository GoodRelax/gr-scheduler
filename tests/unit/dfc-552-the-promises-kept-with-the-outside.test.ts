// DFC-552 (3)(4): a newer-version document handed to the Agent API is opened and told, and the browser clipboard never throws.

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-renderer'
import { browserClipboard } from '../../src/framework/browser-clipboard/browser-clipboard'
import { keyOf, rowDocument, shell, TEMPLATE, type ShellBench } from './cr-541-stage'

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const NEWER_VERSION = '999.0'
const REPLACE_ENTRANCE = 'IC-71'
const PROCEED_KEY = 'Y'
const NO_UNREADABLE_COLUMN_REASON = 'RS-63'

const later = (): Promise<void> => new Promise((done) => setTimeout(done, 30))

const takeOnChooser = (built: ShellBench, icon: string): void => {
  built.aim({ part: 'Open Chooser', entry: icon, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as ScreenPart)
  built.click(80, 120)
  built.aim(null)
}

const newerDocument = (): Record<string, any> => {
  const document = rowDocument([{ id: 'g1', parentId: null }])
  document['schemaVersion'] = NEWER_VERSION
  document['schedule'].project.title = 'A plan from a newer build'
  return document
}

describe('FR-073 / FR-022 / AM-8 (DFC-552 3) -- a newer version handed to importDocument is received and opened, in every shape', () => {
  const shapes: readonly (readonly [string, (document: Record<string, any>) => unknown])[] = [
    ['{ text }', (document) => ({ text: JSON.stringify(document) })],
    ['{ document }', (document) => ({ document })],
    ['the bare document', (document) => document],
  ]

  it.each(shapes)('%s: not refused for its version, opened on the person\'s Replace, and RS-63 told', async (_name, shape) => {
    const built = shell(rowDocument([{ id: 'g1', parentId: null }]))
    benches.push(built)
    const api = installAgentApi({ ...built.loop.agentApiSeams(), writerName: 'dfc-552', schemaVersion: TEMPLATE.schemaVersion } as never)
    let outcome: any = 'pending'
    void api.importDocument(shape(newerDocument()) as never).then((value) => {
      outcome = value
    })
    await later()
    built.send(keyOf('x'))
    expect(outcome, 'FR-073 MUST NOT: refusing for a newer version').toBe('pending')
    expect((built.last().openModal as { surface?: string } | null)?.surface, 'the document waits at the Open Chooser').toBe('Open Chooser')
    takeOnChooser(built, REPLACE_ENTRANCE)
    await later()
    built.send(keyOf(PROCEED_KEY))
    await later()
    built.send(keyOf('x'))
    expect(outcome.accepted, JSON.stringify(outcome)).toBe(true)
    expect(built.loop.document().schedule.project.title).toBe('A plan from a newer build')
    expect(
      built.last().notices.some((one: any) => String(one.dismissKey).includes(NO_UNREADABLE_COLUMN_REASON)),
      'FR-073: nothing unreadable, so it opens without asking and tells RS-63',
    ).toBe(true)
  })
})

describe('IF-5 / IO-6 / CHN-9 (DFC-552 4) -- the browser clipboard answers a refusal and does not throw', () => {
  const text = { kind: 'text', text: 'hello' } as never

  it('a write the browser accepts answers ok', async () => {
    const written: string[] = []
    const clipboard = browserClipboard({ writeText: async (value) => void written.push(value) })
    expect((await clipboard.writeClipboardContent(text)).ok).toBe(true)
    expect(written).toEqual(['hello'])
  })

  it('a write refused for want of a user gesture, and a write that failed otherwise, are both answered and told apart', async () => {
    const refusal = Object.assign(new Error('not allowed'), { name: 'NotAllowedError' })
    const refused = await browserClipboard({ writeText: () => Promise.reject(refusal) }).writeClipboardContent(text)
    const failed = await browserClipboard({ writeText: () => Promise.reject(new Error('disk full')) }).writeClipboardContent(text)
    expect(refused.ok).toBe(false)
    expect(failed.ok).toBe(false)
    expect((refused as { fault: string }).fault, 'a refusal is not a failure').not.toBe((failed as { fault: string }).fault)
  })

  it('a browser with no clipboard at all answers a fault', async () => {
    const answer = await browserClipboard(undefined).writeClipboardContent(text)
    expect(answer.ok).toBe(false)
  })
})
