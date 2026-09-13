// DFC-578: a press whose screen part is the Dialogue Field must not stop the browser default (FR-066, AG-11, MK-10).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable, unbroken } from '../contract/spec-table'

const CHAPTER_1_4 = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')

const plain = (text: string): string => text.replace(/\*/g, '')

function statementOf(uid: string): string {
  const lines = CHAPTER_1_4.split('\n')
  const at = lines.findIndex((line) => line.trim() === `**UID**: ${uid}`)
  if (at < 0) throw new Error(`Chapter 1-4 has no requirement ${uid}`)
  const from = lines.slice(at).findIndex((line) => line.startsWith('**STATEMENT**:'))
  if (from < 0) throw new Error(`${uid} has no STATEMENT`)
  const said: string[] = []
  for (const line of lines.slice(at + from)) {
    if (line.trim() === '') break
    said.push(line.trim())
  }
  return plain(said.join(''))
}

const FR_066 = statementOf('FR-066')
const FR_066_FIELD = '`Agent API` が有効であるあいだ、`GRS` は、画面上で AI と言葉をやり取りする欄を表示すること。'

const AG_11 = specTable('T-035').rows.find((one) => one.id === 'AG-11')
if (AG_11 === undefined) throw new Error('table T-035 has no row AG-11')
const AG_11_TEXT = unbroken(AG_11.cells.join(' '))
const AG_11_READS_SETTLED = '対話欄で人が確定した発話を読めること（MUST）。'
const AG_11_NOT_UNSETTLED = '確定していない入力途中の文字を読めてはならない（MUST NOT）'

const MK_10 = specTable('T-023').rows.find((one) => one.id === 'MK-10')
if (MK_10 === undefined) throw new Error('table T-023 has no row MK-10')
const MK_10_SUBJECT = MK_10.by['操作'] ?? ''
const MK_10_RULE = MK_10.by['動作'] ?? ''
const MK_10_ASSIGNED_ONLY = '本ツールが割り当てた'
const MK_10_STOPS_ASSIGNED = 'ブラウザの既定動作を画面全体で止めること（MUST）。'
const MK_10_KEEPS_UNASSIGNED = '割り当てていない組合せを止めてはならない（MUST NOT）'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  return {
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...(schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100 },
      calendars: schedule['calendars'],
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...(template['documentSettings'] as Record<string, unknown>) },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const DIALOGUE_FIELD_PART: ScreenPart = {
  part: 'Dialogue Field',
  entry: null,
  format: null,
  rowGroupId: null,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
}

interface Stage {
  readonly loop: FrameLoop
  showPart(next: ScreenPart | null): void
  currentPart(): ScreenPart | null
  rowArea(): ScreenRect
  stops(input: HumanInput): boolean
}

function stage(): Stage {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => part,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const loop = frameLoop({ showSvg: () => undefined } as never, fixtureDocument(), SCREEN, wiring)
  drain()
  return {
    loop,
    showPart: (next) => {
      part = next
    },
    currentPart: () => part,
    rowArea: () => {
      const values = loop.current()
      if (values === null) throw new Error('the loop has run no frame')
      return values.regions.rowArea
    },
    stops: (input) => loop.isBrowserDefaultStopped(input),
  }
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointerDown = (x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase: 'down',
  button: 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

describe('DFC-578 premises: FR-066, AG-11 and MK-10 still read this way', () => {
  it('the clauses this file rests on still stand verbatim', () => {
    expect(FR_066).toContain(FR_066_FIELD)
    expect(AG_11_TEXT).toContain(AG_11_READS_SETTLED)
    expect(AG_11_TEXT).toContain(AG_11_NOT_UNSETTLED)
    expect(MK_10_SUBJECT).toContain(MK_10_ASSIGNED_ONLY)
    expect(MK_10_RULE).toContain(MK_10_STOPS_ASSIGNED)
    expect(MK_10_RULE).toContain(MK_10_KEEPS_UNASSIGNED)
  })
})

describe('DFC-578: MK-10 (MUST NOT) -- only an assigned input may stop the browser default', () => {
  it(`${FR_066_FIELD} -- a press whose screen part is the Dialogue Field does not stop it`, () => {
    const built = stage()
    const at = built.rowArea()
    built.showPart(DIALOGUE_FIELD_PART)

    const press = pointerDown(at.x + at.width - 20, at.y + at.height - 20)

    expect(built.stops(press)).toBe(false)
  })

  it('control: the same spot with nothing floating over it is not the Dialogue Field', () => {
    const built = stage()
    const at = built.rowArea()
    built.showPart(null)

    const press = pointerDown(at.x + at.width - 20, at.y + at.height - 20)
    const observedStops = built.stops(press)

    // WHY: MK-10's own subject is modifier-keyed input; a bare press is not
    // decided by it, so no browser-default value is claimed for open ground.
    expect(built.currentPart(), `screen part must differ from the Dialogue Field (observed stops=${observedStops})`).toBeNull()
  })
})
