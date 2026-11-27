// Unit tests: an annotation placed where no task group is refused, not created (FR-019).

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  Notice,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture builds documents and fake hosts as loose shapes */

const SURFACE_COLUMN = '面'
const ARM_COLUMN = '構え'

const COMMENT_BOX_ARM = 'AR-5'

const ARMING_ENTRY = ((): { readonly row: string; readonly surface: string } => {
  const found = specTable('T-109').rows.filter(
    (row) => bare(row.by[ARM_COLUMN] ?? '') === COMMENT_BOX_ARM,
  )
  if (found.length !== 1) {
    throw new Error(`table T-109 arms ${COMMENT_BOX_ARM} from ${found.length} entrances`)
  }
  const row = found[0] as (typeof found)[number]
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
})()

// Spec: FR-038
const wordsOf = (specTableRowId: string): { readonly ja: string; readonly en: string } => {
  const found = (displayWords as any).reasons.find((one: any) => one.specTableRowId === specTableRowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${specTableRowId}`)
  return found.text
}

const RS_44 = 'RS-44'
const RS_15 = 'RS-15'

const RS_44_MANNER = ((): string => {
  const row = specTable('T-233').rows.find((one) => one.id === RS_44)
  if (row === undefined) throw new Error('table T-233 no longer has row RS-44')
  return bare(row.cells[1] ?? '')
})()

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))
const FR_019_REFUSES_AND_SAYS_WHY =
  'もし作成者が、指す `TaskGroup` が無い縦位置で注記を置こうとした場合、`GRS` は、注記を作らないこと。'

const RS_44_DISPLAY = bare(specTable('T-233').rows.find((one) => one.id === 'RS-44')?.by['表示の仕方'] ?? '')

// Why: the document has no task group at all, so every point in the Task
// Group Area is a point with no TaskGroup under it.

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

function emptyDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
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
    documentSettings: template.documentSettings,
    documentStamp: template.documentStamp,
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

// Why: Vitest runs under node with no requestAnimationFrame, so the host is
// a fake; nothing in it decides anything about a telling.
function host(): { readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }; runAnimationFrames(): void } {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left' as PointerButton,
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  view(): ScreenView
  notices(): readonly Notice[]
  // Why: CS-2 freezes the aim at the press, so the aim is set before it.
  pressEntry(surface: string, entry: string): void
  pressGround(x: number, y: number): void
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, emptyDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  pen.runAnimationFrames()
  return {
    loop,
    send,
    view: () => screen.last(),
    notices: () => screen.last().notices,
    pressEntry: (surface, entry) => {
      screen.drawAt({
        part: surface,
        entry: entry as any,
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      screen.drawAt(null)
    },
    pressGround: (x, y) => {
      screen.drawAt(null)
      send(pointer('down', x, y))
      send(pointer('up', x, y))
    },
  }
}

const GROUND = { x: 700, y: 400 }

describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-019 still refuses the placement and still says why', () => {
    expect(REQUIREMENTS).toContain(FR_019_REFUSES_AND_SAYS_WHY)
  })

  it('⭐ table T-233 still writes RS-44 against NT-1, and the words are there', () => {
    // Why: the manner is the half that is easy to get wrong: the person's input
    // was refused and nothing of ours failed, so NT-1 and not NT-3a.
    expect(RS_44_MANNER).toBe('NT-1')
    expect(wordsOf(RS_44).ja.length).toBeGreaterThan(0)
    expect(wordsOf(RS_44).en.length).toBeGreaterThan(0)
  })

  it('⭐ IC-35 is the one entrance that arms AR-5', () => {
    // Why: a second entrance with the same arm, which FR-029 forbids, would
    // make the press below ambiguous.
    expect(ARMING_ENTRY.row).toBe('IC-35')
    expect(ARMING_ENTRY.surface).toBe('Command Palette')
  })
})

describe('FR-019 (MUST): an annotation with no task group under it is refused, and told why', () => {
  it('⛔ the control: with nothing armed, the same press tells nothing', () => {
    // Why: without this, a unit that told RS-44 on every press would pass the
    // cases below; FR-029 tells a reason only when a press attempts something.
    const built = stage()
    built.pressGround(GROUND.x, GROUND.y)
    expect(built.notices().length).toBe(0)
  })

  for (const language of ['ja', 'en'] as const) {
    it(`⭐ carries RS-44, which table T-233 does not show, so neither RS-44's nor RS-15's words appear (${language}, CR-712)`, () => {
      // Why: with no entry for the situation the dictionary falls back to RS-15,
      // a lie about a press that can never act there.
      const built = stage(language)
      built.pressEntry(ARMING_ENTRY.surface, ARMING_ENTRY.row)
      built.pressGround(GROUND.x, GROUND.y)
      const told = built.notices().map((one) => one.text)
      expect(told).not.toContain(wordsOf(RS_44)[language])
      expect(told).not.toContain(wordsOf(RS_15)[language])
      expect(RS_44_DISPLAY).toBe('出さない')
    })
  }

  it('⭐ RS-44 keeps NT-1 in table T-233, and the press puts no notice up (CR-712)', () => {
    // Why: NT-3a would say something untrue: that manner is an operation's
    // failure, and here the place was simply not one an annotation can stand on.
    const built = stage()
    built.pressEntry(ARMING_ENTRY.surface, ARMING_ENTRY.row)
    built.pressGround(GROUND.x, GROUND.y)
    expect(built.notices()).toEqual([])
    expect(RS_44_MANNER).toBe('NT-1')
  })

  it('⛔ creates nothing -- タスクグループを 1 つ作って載せてはならない (MUST NOT)', () => {
    // Why: a task group minted for an annotation would carry neither a name nor
    // a derivation source, so the refusal may not borrow FR-001's answer.
    const built = stage()
    const before = JSON.stringify(built.loop.document())
    built.pressEntry(ARMING_ENTRY.surface, ARMING_ENTRY.row)
    built.pressGround(GROUND.x, GROUND.y)
    expect(JSON.stringify(built.loop.document())).toBe(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })
})
