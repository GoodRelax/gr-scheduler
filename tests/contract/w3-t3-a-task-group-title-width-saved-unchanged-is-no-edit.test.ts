// W3 tester 3: FR-039 -- a divider release that saves the S-79 already stored does not count as rewriting the document.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type { Document } from '../../src/entity/document-model/document/document'
import { taskGroupDocument } from '../unit/cr-541-stage'
import { unbroken } from './spec-table'
import { exportStage, restoreAnimationFrames, type ExportStage } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'),
)

const CLAUSE_SAME_VALUE_IS_NO_EDIT =
  '⭐ 保存する `S-79` が、いま保存している値と等しいとき（床で離して掴む前の値が残るときを含む）は、文書を書き換えたことにしてはならない（MUST NOT）'

const TASK_GROUP_TITLE_DIVIDER = 'taskGroupPanel'

const documentOf = (): Document =>
  taskGroupDocument([
    { id: 'task-group-a', parentId: null },
    { id: 'task-group-b', parentId: null },
  ]) as unknown as Document

const storedWidth = (stage: ExportStage): number => stage.loop.document().documentSettings.taskGroupPanelWidth

function dividerOf(stage: ExportStage): { readonly x: number; readonly y: number } {
  const divider = stage.lastView().frame.dividers.find((one) => one.panel === TASK_GROUP_TITLE_DIVIDER)
  if (divider === undefined) throw new Error('premise: the Task Group Panel divider is drawn')
  return { x: divider.line.x + divider.line.width / 2, y: divider.line.y + divider.line.height / 2 }
}

const stampOf = (stage: ExportStage, document: Document): unknown =>
  installAgentApi({ ...stage.loop.agentApiSeams(), writerName: 'w3-t3-tester', schemaVersion: document.schemaVersion } as never).readStamp()

describe('W3-T3 -- the manuscript still says what these cases read', () => {
  it(CLAUSE_SAME_VALUE_IS_NO_EDIT, () => {
    expect(REQUIREMENTS).toContain(CLAUSE_SAME_VALUE_IS_NO_EDIT)
  })
})

describe('FR-039 -- a release that saves the stored S-79 rewrites nothing', () => {
  it(`"${CLAUSE_SAME_VALUE_IS_NO_EDIT}" -- held and let go where it was`, async () => {
    const document = documentOf()
    const stage = exportStage(document)
    const before = storedWidth(stage)
    const at = dividerOf(stage)
    await stage.dragDivider(TASK_GROUP_TITLE_DIVIDER, at.x, at.x, at.y)
    expect(storedWidth(stage)).toBe(before)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
  })

  it(`"${CLAUSE_SAME_VALUE_IS_NO_EDIT}" -- let go at the floor a second time keeps the value and writes nothing`, async () => {
    const document = documentOf()
    const stage = exportStage(document)
    const at = dividerOf(stage)
    await stage.dragDivider(TASK_GROUP_TITLE_DIVIDER, at.x, 1, at.y)
    const atFloor = storedWidth(stage)
    expect(atFloor, 'premise: the first release at the floor narrowed the panel').toBeLessThan(documentOf().documentSettings.taskGroupPanelWidth)
    const stamp = stampOf(stage, document)
    const again = dividerOf(stage)
    await stage.dragDivider(TASK_GROUP_TITLE_DIVIDER, again.x, 1, again.y)
    expect(storedWidth(stage)).toBe(atFloor)
    expect(stampOf(stage, document)).toEqual(stamp)
  })
})
