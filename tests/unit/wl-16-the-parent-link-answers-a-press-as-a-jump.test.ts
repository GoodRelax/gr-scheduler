// PTL-16 seam (implementer's wiring check): a press on the panel's parent link answers as the jump target T-332 follows.

import { describe, expect, it } from 'vitest'

import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-renderer'
import { withPropertyLinkJump } from '../../src/framework/dom-screen-surface/properties-panel-drawing'

const LINK_TASK_ATTRIBUTE = 'data-link-task-uid'

const PANEL_ANSWER: ScreenPart = {
  part: 'Properties Panel',
  entry: null,
  format: null,
  taskGroupId: null,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
} as unknown as ScreenPart

/** @purity pure */
function elementWith(attributes: Readonly<Record<string, string>>): Element {
  return { getAttribute: (name: string) => attributes[name] ?? null } as unknown as Element
}

describe('PTL-16 / SJ-1: the parent link is answered as a task jump', () => {
  it('a press on the link names the parent Task as the jump target', () => {
    const answer = withPropertyLinkJump(PANEL_ANSWER, elementWith({ [LINK_TASK_ATTRIBUTE]: '7' }))
    expect(answer?.searchJumpTarget).toEqual({ kind: 'task', taskUid: 7 })
  })

  it('a press anywhere else in the panel is left as it was', () => {
    expect(withPropertyLinkJump(PANEL_ANSWER, elementWith({}))).toBe(PANEL_ANSWER)
    expect(withPropertyLinkJump(PANEL_ANSWER, null)).toBe(PANEL_ANSWER)
    expect(withPropertyLinkJump(null, elementWith({ [LINK_TASK_ATTRIBUTE]: '7' }))).toBeNull()
  })

  it('a jump target already answered by a table window is kept', () => {
    const held = { ...PANEL_ANSWER, searchJumpTarget: { kind: 'task', taskUid: 3 } } as ScreenPart
    expect(withPropertyLinkJump(held, elementWith({ [LINK_TASK_ATTRIBUTE]: '7' }))?.searchJumpTarget).toEqual({ kind: 'task', taskUid: 3 })
  })
})
