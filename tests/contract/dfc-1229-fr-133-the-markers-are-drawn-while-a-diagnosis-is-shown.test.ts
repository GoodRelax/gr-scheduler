// DFC-1229: while a delay diagnosis is shown the progress markers are drawn though S-63 is false, and S-63 is not written (FR-133, FR-049).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop, type FrameEnvironment } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from './spec-table'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

// see FR-130, T-109
const DIAGNOSE_ENTRY = specTable('T-109').rows.find((one) => (one.cells.join(' ')).includes('遅延診断を行う'))?.id ?? ''
const APP_HEADER = bare(specTable('T-109').rows.find((one) => one.id === DIAGNOSE_ENTRY)?.by['面'] ?? '')

const ROW_ID = '11111111-1111-4111-8111-111111111111'

const documentWith = (progressMarkerVisible: boolean): Document => {
  const settings = { ...structuredClone(TEMPLATE.documentSettings), progressMarkerVisible }
  return {
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      ...structuredClone(TEMPLATE.schedule),
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: '2026-04-15T17:00:00' },
      tasks: [
        {
          uid: 1, wbsParentUid: null, wbsOrder: 1, name: 'Held', start: '2026-04-06', finish: '2026-04-20',
          milestone: false, deadline: null, notes: null, calendarUid: null, actualStart: null, stop: null,
          actualFinish: null, resume: null, resumeValid: null, percentComplete: 0, fadeInDays: null,
          fadeOutDays: null, dependencies: [], carry: {}, carryElements: [],
        },
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        { id: ROW_ID, parentId: null, label: 'Alpha', derivedFromTaskUid: null, order: 0, treeState: 'auto', editGroup: null, color: null, minHeight: null },
      ],
      taskGroupMembers: [{ taskUid: 1, groupId: ROW_ID }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: settings,
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }
const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerInput['phase'], x: number, y: number): PointerInput => ({
  kind: 'pointer', phase, button: 'left', x, y, modifiers: NO_MODIFIERS, clickCount: 1,
})

const benchOf = (progressMarkerVisible: boolean) => {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  let aimed: ScreenPart | null = null
  let shown = ''
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: () => aimed,
  }
  const loop = frameLoop({ showSvg: (svg: string) => void (shown = svg) } as never, documentWith(progressMarkerVisible), SCREEN, { surface, language: 'ja' })
  drain()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    svg: () => shown,
    settings: () => loop.document().documentSettings as unknown as Record<string, unknown>,
    pressDiagnose: (): void => {
      aimed = { part: APP_HEADER, entry: DIAGNOSE_ENTRY, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as unknown as ScreenPart
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      aimed = null
    },
  }
}

const hasMarkers = (svg: string): boolean => svg.includes('data-figure="task-1-marker"')

describe('DFC-1229: a diagnosis draws the progress markers whatever S-63 holds (FR-133, FR-049)', () => {
  it('FR-130 premise: the entrance that starts a diagnosis is found in table T-109', () => {
    expect(DIAGNOSE_ENTRY).not.toBe('')
    expect(APP_HEADER).toBe('App Header')
  })

  it('FR-049 premise: with S-63 false and no diagnosis the markers are not drawn', () => {
    const bench = benchOf(false)
    expect(hasMarkers(bench.svg())).toBe(false)
  })

  it('FR-133 starting a diagnosis draws the markers although S-63 is false (DFC-1229)', () => {
    const bench = benchOf(false)
    bench.pressDiagnose()
    expect(hasMarkers(bench.svg())).toBe(true)
  })

  it('FR-133 starting a diagnosis does not write S-63 (MUST NOT)', () => {
    const bench = benchOf(false)
    bench.pressDiagnose()
    expect(bench.settings()['progressMarkerVisible']).toBe(false)
  })

  it('FR-133 ending the diagnosis takes the markers away again, S-63 being false', () => {
    const bench = benchOf(false)
    bench.pressDiagnose()
    bench.pressDiagnose()
    expect(hasMarkers(bench.svg())).toBe(false)
  })

  it('FR-133 with S-63 true the markers stay drawn through a diagnosis', () => {
    const bench = benchOf(true)
    bench.pressDiagnose()
    expect(hasMarkers(bench.svg())).toBe(true)
  })
})
