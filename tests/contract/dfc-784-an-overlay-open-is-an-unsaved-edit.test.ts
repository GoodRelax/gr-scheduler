// DFC-784: FR-100 counts an overlay open (OP-9, IC-73) as an unsaved edit, and closing the chooser unanswered counts for nothing.

import { describe, expect, it } from 'vitest'

import { here, jsonBytes, oneTaskGroupDocument, OPEN_CHOOSER, shellStage, THERE_TASK_GROUP } from './cr-610-file-flow-stage'

const OVERLAY_ENTRANCE = 'IC-73'
const CLOSE_ENTRANCE = 'IC-52'
const SAME_TASK_UID = 1

describe('FR-100 / OP-9 (DFC-784) -- the overlay open lands as an unsaved edit', () => {
  it('after IC-73 the pre-change plan is in the document and hasUnsavedEdits is true', async () => {
    const built = await shellStage({ document: here() })
    expect(built.loop.hasUnsavedEdits(), 'premise: a document just started has no unsaved edit').toBe(false)
    const theirs = built.file('overlay.json', jsonBytes(oneTaskGroupDocument('There', THERE_TASK_GROUP, SAME_TASK_UID)))
    await built.open(theirs)
    expect(built.last().openModal, 'premise: the open chooser stands').not.toBeNull()
    await built.press(OPEN_CHOOSER(), OVERLAY_ENTRANCE)
    expect(built.loop.document().schedule.baselineTasks.length, 'premise: the overlay landed').toBeGreaterThan(0)
    expect(built.loop.hasUnsavedEdits(), 'FR-100: the overlaid plan and S-69 are saved values, so the open is an unsaved edit').toBe(true)
  })

  it('closing the chooser unanswered leaves nothing unsaved', async () => {
    const built = await shellStage({ document: here() })
    const theirs = built.file('overlay.json', jsonBytes(oneTaskGroupDocument('There', THERE_TASK_GROUP, SAME_TASK_UID)))
    await built.open(theirs)
    await built.press(OPEN_CHOOSER(), CLOSE_ENTRANCE)
    expect(built.loop.document().schedule.baselineTasks.length).toBe(0)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })
})
