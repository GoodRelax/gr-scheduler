// DFC-540 (1), 551 (1)(3)(4), 555, 686, 781, 1651: the shell's notice order, counts, first frame, edit mark and release, read from docs/spec.

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi, type AgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-renderer'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { keyOf, taskGroupDocument, SCREEN, shell, TEMPLATE, type ShellBench } from './cr-541-stage'

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const benchOf = (rows = 2): ShellBench => {
  const built = shell(taskGroupDocument(Array.from({ length: rows }, (_one, index) => ({ id: `g${index + 1}`, parentId: null }))))
  benches.push(built)
  return built
}

const noticeKeys = (built: ShellBench): readonly string[] => built.last().notices.map((one: any) => one.dismissKey)

const OLD_REASON = 'RS-15'
const NEW_REASON = 'RS-21'
const raiseBoth = (built: ShellBench): void => {
  built.loop.raiseStartupNotice(OLD_REASON, null)
  built.loop.raiseStartupNotice(NEW_REASON, null)
  built.send(keyOf('x'))
}

describe('NT-8 (DFC-540 1) -- one Esc or one Enter dismisses ONE notice, the newest first', () => {
  it('Esc with two notices up leaves the older one', () => {
    const built = benchOf()
    raiseBoth(built)
    expect(noticeKeys(built), 'premise: two notices stand').toHaveLength(2)
    const [older] = noticeKeys(built)
    built.send(keyOf('Esc'))
    expect(noticeKeys(built), 'NT-8: the newest goes first, and only it').toEqual([older])
  })

  it('Enter with two notices up leaves the older one, and the next Enter takes the last', () => {
    const built = benchOf()
    raiseBoth(built)
    const [older] = noticeKeys(built)
    built.send(keyOf('Enter'))
    expect(noticeKeys(built)).toEqual([older])
    built.send(keyOf('Enter'))
    expect(noticeKeys(built)).toEqual([])
  })

  it('with no notice up, Esc is not taken by the notice rung: the browser is handed the key (NT-8 MUST NOT, IN-4a)', () => {
    const built = benchOf()
    built.send(keyOf('x'))
    expect(built.loop.isBrowserDefaultStopped(keyOf('Esc'))).toBe(false)
  })
})

describe('NT-3 (DFC-551 3) -- a notice raised again for the same reason is one notice with a larger count', () => {
  it('two raisings without a count stand as one notice that counts 2', () => {
    const built = benchOf()
    built.loop.raiseStartupNotice(OLD_REASON, null)
    built.loop.raiseStartupNotice(OLD_REASON, null)
    built.send(keyOf('x'))
    expect(built.last().notices, 'NT-3: no second notice is stacked').toHaveLength(1)
    expect(built.last().notices[0]?.affectedCount, 'NT-3: a notice without a count counts as 1').toBe(2)
  })

  it('a notice without a count plus a notice that counts 3 stands as 4', () => {
    const built = benchOf()
    built.loop.raiseStartupNotice(OLD_REASON, null)
    built.loop.raiseStartupNotice(OLD_REASON, 3)
    built.send(keyOf('x'))
    expect(built.last().notices).toHaveLength(1)
    expect(built.last().notices[0]?.affectedCount).toBe(4)
  })
})

describe('BO-1 (DFC-551 1) -- no picture before the dimensions settle, and one right after they do', () => {
  it('settleFirstFrameEnvironment returns with the first frame drawn, without waiting for an animation frame', () => {
    const real = (globalThis as any).requestAnimationFrame
    ;(globalThis as any).requestAnimationFrame = () => 0
    try {
      const views: unknown[] = []
      const surface = {
        showScreenView: (view: unknown) => void views.push(view),
        readDialogueInput: () => null,
        readFieldCommit: () => null,
        readFieldEditNotices: () => [],
        readScreenPartAt: () => null,
      }
      const loop = frameLoop({ showSvg: () => undefined } as never, taskGroupDocument([{ id: 'g1', parentId: null }]) as never, SCREEN, {
        surface: surface as never,
        language: 'ja',
      })
      const settled = { ...SCREEN, width: 1000 }
      loop.settleFirstFrameEnvironment(settled)
      const area = loop.current()?.regions.taskGroupArea
      expect(area, 'BO-1: the settled frame is drawn when the call returns').toBeDefined()
      expect((area?.x ?? 0) + (area?.width ?? Infinity), 'BO-1: and it is drawn at the settled width').toBeLessThanOrEqual(settled.width)
      expect(views.length).toBeGreaterThan(0)
    } finally {
      if (real === undefined) delete (globalThis as any).requestAnimationFrame
      else (globalThis as any).requestAnimationFrame = real
    }
  })
})

describe('FR-100 (DFC-551 4) -- Undo and Redo with nothing to undo make no unsaved edit', () => {
  it('Ctrl+Z, then Ctrl+Y on a document nobody has edited leave hasUnsavedEdits false', () => {
    const built = benchOf()
    expect(built.loop.hasUnsavedEdits()).toBe(false)
    built.send(keyOf('Z', { ctrl: true }))
    expect(built.loop.hasUnsavedEdits(), 'FR-100 MUST NOT: nothing was undone').toBe(false)
    built.send(keyOf('Y', { ctrl: true }))
    expect(built.loop.hasUnsavedEdits(), 'FR-100 MUST NOT: nothing was redone').toBe(false)
  })
})

describe('FR-100 (DFC-781) -- an Agent API write is an unsaved edit like a person\'s', () => {
  const apiOf = (built: ShellBench): AgentApi =>
    installAgentApi({ ...built.loop.agentApiSeams(), writerName: 'dfc-781', schemaVersion: TEMPLATE.schemaVersion } as never)

  it('a write that changed the title makes hasUnsavedEdits true', () => {
    const built = benchOf()
    const api = apiOf(built)
    expect(built.loop.hasUnsavedEdits(), 'premise: nothing has been written').toBe(false)
    api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: 'setProjectTitle', title: 'Written by an agent' }] } as never)
    expect(built.loop.document().schedule.project.title, 'premise: the write landed').toBe('Written by an agent')
    expect(built.loop.hasUnsavedEdits(), 'FR-100 MUST: AI-made edits are lost with the tab as well').toBe(true)
  })
})

const dismissPart = (key: string): ScreenPart =>
  ({ part: 'Notification Area', entry: null, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: key }) as ScreenPart

describe('NT-8 / IN-1 (DFC-555, DFC-686) -- the dismiss entrance of a notice', () => {
  it('releasing on the dismiss entrance of the older notice removes that notice and not the newer one', () => {
    const built = benchOf()
    raiseBoth(built)
    const [older, newer] = noticeKeys(built)
    built.aim(dismissPart(older as string))
    built.click(40, 40)
    built.aim(null)
    expect(noticeKeys(built), 'NT-8: the entrance of a notice dismisses that notice').toEqual([newer])
  })

  it('the press ends at the release: an Agent API write is not held back as if a gesture were running (IN-1, WS-2)', () => {
    const built = benchOf()
    raiseBoth(built)
    const [older] = noticeKeys(built)
    const api = installAgentApi({ ...built.loop.agentApiSeams(), writerName: 'dfc-686', schemaVersion: TEMPLATE.schemaVersion } as never)
    built.aim(dismissPart(older as string))
    built.click(40, 40)
    built.aim(null)
    built.send(keyOf('Enter'))
    expect(noticeKeys(built), 'premise: both notices are gone').toEqual([])
    const outcome: any = api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: 'setProjectTitle', title: 'After the dismissal' }] } as never)
    expect(outcome.accepted, JSON.stringify(outcome)).toBe(true)
  })
})
