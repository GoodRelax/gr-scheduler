// CR-727 spec-only contract: the shell turns "a file is dragged over the window" into the Drop Cue (U-68) only while a drop would be taken (FR-087 T-024a OP-17, OP-8, T-280 dropCueDisplayStateMachine, T-290).

import { describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { byRole } from '../fixtures/fake-browser'
import { TEMPLATE } from '../unit/cr-541-stage'
import { GENERATED_WORDS } from './cr-727-stage'
import {
  HERE_TASK_GROUP,
  OPEN_CHOOSER,
  jsonBytes,
  settle,
  surfaceOfEntrance,
  there,
  shellStage,
  type ShellStage,
} from './cr-610-file-flow-stage'
import { specTable, unbroken } from './spec-table'

const opCell = (): string => unbroken(specTable('T-024a').rows.find((one) => one.id === 'OP-17')?.by['規則'] ?? '')

const OP_17_SHOW =
  'ファイルを持つドラッグ（閲覧環境が渡す `dataTransfer.types` に `Files` が在るもの）がウィンドウの上に来たら、ドロップの案内（`_assets/tbl-glossary.md` の `U-68`）を出すこと（MUST）'
const OP_17_REFUSED =
  '⚠️ ドロップしても受け付けないあいだ —— ファイルの操作が進行中、または問いが開いている（`OP-8`、`_assets/tbl-state-machines.md` の 表 T-290 の `fileFlow/documentOpenAsked` が `RS-27` で断る状態） —— は出してはならない（MUST NOT）'
const OP_17_HIDE_ON_DROP =
  'ドラッグがウィンドウの外へ出たとき、とドロップしたときは消すこと（MUST）'
const OP_17_NO_JUDGMENT = '⚠️ ドラッグのあいだはファイルの形式を判じない —— 閲覧環境はドラッグのあいだファイルの名前を見せない。'
const T_280_IS_OPEN_ACCEPTED =
  '`isOpenAccepted` は、表 T-290 の `fileOperationStateMachine` が `idle` で、`confirmationStateMachine` が `notAsked` のとき真'

const CUE_ROLE = 'Drop Cue'
const dropWord = GENERATED_WORDS['dropCue']?.find((one) => one.part === 'dropToOpen')?.text?.['ja'] ?? ''

const cueViewed = (built: ShellStage) => built.last().dropCue
const cueDrawn = (built: ShellStage): number => byRole(built.domRoot(), CUE_ROLE).length

async function dragIs(built: ShellStage, isOver: boolean): Promise<void> {
  built.loop.fileDragMoved(isOver)
  await settle()
  // WHY: any input wakes a frame, and the cue is read from the frame that follows the event.
  await built.repaint()
}

describe('CR-727 the manuscript these cases are driven by', () => {
  it('OP-17 and T-280 still say when the cue is shown and refused, word for word', () => {
    for (const clause of [OP_17_SHOW, OP_17_REFUSED, OP_17_HIDE_ON_DROP, OP_17_NO_JUDGMENT]) {
      expect(opCell()).toContain(clause)
    }
  })
})

describe(`FR-087 OP-17 -- ${OP_17_SHOW.slice(-60)}`, () => {
  it('with no file operation and no question, a drag over the window shows one cue over the Schedule Canvas', async () => {
    const built = await shellStage({ dom: true })
    await dragIs(built, true)
    const cue = cueViewed(built)
    expect(cue, 'OP-17: the drag brought no cue').toBeDefined()
    expect(cue?.area).toEqual(built.loop.current()?.regions.scheduleCanvas)
    expect(cue?.text).toBe(dropWord)
    expect(cueDrawn(built), 'the DOM surface drew no [data-role="Drop Cue"]').toBe(1)
  })

  it('a second drag-over (the drag moving onto another part inside the window) keeps the same single cue', async () => {
    const built = await shellStage({ dom: true })
    await dragIs(built, true)
    await dragIs(built, true)
    expect(cueViewed(built)).toBeDefined()
    expect(cueDrawn(built)).toBe(1)
  })

  it(`${OP_17_HIDE_ON_DROP} -- the drag leaving the window takes the cue down`, async () => {
    const built = await shellStage({ dom: true })
    await dragIs(built, true)
    await dragIs(built, false)
    expect(cueViewed(built)).toBeUndefined()
    expect(cueDrawn(built)).toBe(0)
  })

  it('the cue comes again for a second drag after the first one left', async () => {
    const built = await shellStage({ dom: true })
    await dragIs(built, true)
    await dragIs(built, false)
    await dragIs(built, true)
    expect(cueViewed(built)).toBeDefined()
  })

  it('a drag that leaves without ever entering changes nothing', async () => {
    const built = await shellStage({ dom: true })
    await dragIs(built, false)
    expect(cueViewed(built)).toBeUndefined()
    expect(cueDrawn(built)).toBe(0)
  })
})

describe(`FR-087 OP-17 -- ${OP_17_HIDE_ON_DROP} -- the drop`, () => {
  it('dropping the file takes the cue down, and the drop opens the file as before (OP-2)', async () => {
    const built = await shellStage({ dom: true })
    await dragIs(built, true)
    expect(cueViewed(built), 'premise: the cue is up').toBeDefined()
    // WHY: the shell sends the drag as left and then the drop, in this order, for one drop.
    built.loop.fileDragMoved(false)
    await built.drop(built.file('theirs.json', jsonBytes(there())))
    expect(cueViewed(built)).toBeUndefined()
    expect(cueDrawn(built)).toBe(0)
    expect(built.last().openModal?.surface, 'OP-2: the dropped file was not offered the open chooser').toBe(OPEN_CHOOSER())
  })
})

describe(`FR-087 OP-17 -- ${OP_17_REFUSED}`, () => {
  it(`T-280 ${T_280_IS_OPEN_ACCEPTED} -- an open chooser stands (a file operation is in progress): no cue`, async () => {
    const built = await shellStage({ dom: true })
    await built.drop(built.file('theirs.json', jsonBytes(there())))
    expect(built.last().openModal?.surface, 'premise: the open chooser stands').toBe(OPEN_CHOOSER())
    await dragIs(built, true)
    expect(cueViewed(built), 'OP-17 (MUST NOT): the cue invites a drop the app would refuse (RS-27)').toBeUndefined()
    expect(cueDrawn(built)).toBe(0)
  })

  it('the refusal is only for the entering: after the chooser is answered the next drag shows the cue', async () => {
    const built = await shellStage({ dom: true })
    await built.drop(built.file('theirs.json', jsonBytes(there())))
    await dragIs(built, true)
    await dragIs(built, false)
    await built.press(OPEN_CHOOSER(), 'IC-71')
    await settle()
    await built.repaint()
    expect(built.last().openModal, 'premise: the chooser was answered').toBeNull()
    await dragIs(built, true)
    expect(cueViewed(built)).toBeDefined()
  })

  it(`T-280 ${T_280_IS_OPEN_ACCEPTED} -- a question stands (QN-5 over unsaved edits): no cue`, async () => {
    const built = await shellStage({ dom: true })
    const api = installAgentApi({
      ...built.loop.agentApiSeams(),
      writerName: 'cr-727-tester',
      schemaVersion: TEMPLATE.schemaVersion as string,
    } as never)
    const outcome = api.applyCommands({
      readStamp: api.readStamp(),
      commands: [
        {
          kind: 'createTaskGroup',
          id: 'a7270000-0000-4000-8000-000000000001',
          parentId: HERE_TASK_GROUP,
          label: 'From the tester',
          derivedFromTaskUid: null,
          order: 99,
        },
      ] as never,
    })
    await settle()
    expect(outcome.accepted, 'premise: the edit landed').toBe(true)
    expect(built.loop.hasUnsavedEdits(), 'premise: the edit is unsaved').toBe(true)
    await built.press(surfaceOfEntrance('IC-98'), 'IC-98')
    expect(built.last().confirmation?.question, 'premise: a question stands').toBe('QN-5')
    await dragIs(built, true)
    expect(cueViewed(built), 'OP-17 (MUST NOT): the cue is up while a question is open').toBeUndefined()
    expect(cueDrawn(built)).toBe(0)
  })
})
