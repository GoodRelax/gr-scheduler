// Unit tests: an add-child press at the depth cap is drawn faint and refused (HF-14).

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
  TaskGroupTitle,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture builds documents and fake hosts as loose shapes */

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const TASK_GROUP_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

// Why: table T-109's authority column names the rule that owns each
// entrance, so a case names the rule and survives a renumbered icon roster.
function entranceFor(rule: string): string {
  const onThePanel = specTable('T-109').rows.filter(
    (one) => bareAll(one.by['面'] ?? '').includes(TASK_GROUP_PANEL),
  )
  const found = onThePanel.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  const first = found[0]
  if (found.length !== 1 || first === undefined) {
    throw new Error(`表 T-109 gives ${rule} ${found.length} entrances on the panel, not one`)
  }
  return first.id
}

const ADD_CHILD_TASK_GROUP = entranceFor('HF-14')

const mannerOf = (reason: string): string => bare(rowOf('T-233', reason).by['作法'] ?? '')

const RS_46 = 'RS-46'
const RS_15 = 'RS-15'

interface ReasonWords {
  readonly specTableRowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
  readonly nextStep?: Readonly<Record<DisplayLanguage, string>>
}

// Why: the words are read from docs/spec/_source, where they are written,
// because these cases are driven from the specification, not from src/.
const REASON_WORDS: readonly ReasonWords[] = (
  JSON.parse(
    readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons: ReasonWords[] }
).reasons

function wordsFor(specTableRowId: string): ReasonWords {
  const found = REASON_WORDS.find((one) => one.specTableRowId === specTableRowId)
  if (found === undefined) throw new Error(`FR-038's dictionary holds no words for ${specTableRowId}`)
  return found
}

// Spec: S-125, FR-085
const MAX_GROUP_DEPTH = ((): number => {
  const value = SETTINGS_CONSTANTS['maxGroupDepth']
  if (typeof value !== 'number') throw new Error('SETTINGS_CONSTANTS.maxGroupDepth is not a number')
  return value
})()

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

// Why: AT-51 types TaskGroup.id as a UUID.
const uuidOf = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// Why: depth is counted from the root, so the last link is the task group at
// the cap and the one before it is the control: deep, yet it may take a child.
const CHAIN: readonly { readonly id: string; readonly depth: number }[] = Array.from(
  { length: MAX_GROUP_DEPTH },
  (_unused, index) => ({ id: uuidOf(index + 1), depth: index + 1 }),
)

const linkAt = (depth: number): string => {
  const found = CHAIN.find((one) => one.depth === depth)
  if (found === undefined) throw new Error(`the chain has no link at depth ${depth}`)
  return found.id
}

const AT_THE_CAP = linkAt(MAX_GROUP_DEPTH)
const ONE_ABOVE_THE_CAP = linkAt(MAX_GROUP_DEPTH - 1)

function chainDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: CHAIN.map((one, index) => ({
        id: one.id,
        parentId: index === 0 ? null : (CHAIN[index - 1] as (typeof CHAIN)[number]).id,
        name: `depth ${one.depth}`,
        derivedFromTaskUid: null,
        order: index,
        treeState: 'auto',
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const px = (table: string, id: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(rowOf(table, id).by['既定'] ?? '')
  if (found === null) throw new Error(`${id} states no number in its 既定 column`)
  return Number(found[0])
}

// Why: the host measures the controls' reserve, so a case that drives the
// loop hands one in; nothing in this file depends on the figure.
const TASK_GROUP_CONTROLS_TALL = (px('T-206', 'S-138') + px('T-206', 'S-243') * 2) * 2

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  taskGroupControlsHeightPx: TASK_GROUP_CONTROLS_TALL,
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

const ON_THE_SURFACE = { x: 80, y: 120 }

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  // Why: CS-2 freezes the aim at the press, so the aim is set before it.
  press(entry: string, taskGroupId: string): void
  titleOf(taskGroupId: string): TaskGroupTitle
  notices(): ScreenView['notices']
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, chainDocument(), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  return {
    loop,
    screen,
    send,
    press: (entry, taskGroupId) => {
      screen.drawAt({
        part: TASK_GROUP_PANEL,
        entry: entry as any,
        format: null,
        taskGroupId: taskGroupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
      // Why: IN-1 settles a pointer operation on release, so a press is down then up.
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      screen.drawAt(null)
    },
    titleOf: (taskGroupId) => {
      const panel = screen.last().taskGroupPanel
      const found = [...panel.pinnedTitles, ...panel.titles].find((one) => one.taskGroupId === taskGroupId)
      if (found === undefined) throw new Error(`the panel drew no title for ${taskGroupId}`)
      return found
    },
    notices: () => screen.last().notices,
  }
}

const taskGroupCount = (built: Stage): number =>
  ((built.loop.document().schedule as any).taskGroups as readonly unknown[]).length

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: a parse that lost a column would make every case below agree with
    // anything.
    expect(TASK_GROUP_PANEL).toBe('Task Group Panel')
    expect(ADD_CHILD_TASK_GROUP).toBe('IC-91')
    expect(MAX_GROUP_DEPTH, 'S-125 no longer leaves room for a task group above the cap').toBeGreaterThan(1)
    expect(CHAIN).toHaveLength(MAX_GROUP_DEPTH)
  })

  it('⛔ HF-14 still draws the capped entrance faint and still tells RS-46 when it is pressed', () => {
    // Why: pinned so a manuscript that went back on a sentence fails here, not in
    // a case asserting a rule nobody holds.
    expect(says('T-051', 'HF-14')).toContain(
      '押したタスクグループの深さが `FR-085` の上限に達しているとき、`GRS` は、配下に足す操作子を `FR-029` に従って薄く描くこと。',
    )
    expect(says('T-051', 'HF-14')).toContain(
      'もし薄い配下に足す操作子を押した場合、`GRS` は、押したタスクグループの配下に新しいタスクグループを立てないこと。もし薄い配下に足す操作子を押した場合、`GRS` は、運ぶ理由を 表 T-233 の `RS-46` とすること。',
    )
    // Why: raising the task group and refusing inside the panel would tell RS-46
    // and still be forbidden, so the cases read the count and the panel too.
    expect(says('T-051', 'HF-14')).toContain(
      '`GRS` は、タスクグループを立ててからパネルを開き、パネルで拒むことをしないこと。',
    )
  })

  it('⛔ HF-14 no longer holds the model that was withdrawn on 2026-09-04', () => {
    // Why: the guard against the withdrawn model: a case that reads an empty
    // name field again would be reading a rule nobody holds.
    expect(says('T-051', 'HF-14')).toContain(
      '配下に足す操作子を押したとき、`GRS` は、押した瞬間に既定の名前でタスクグループを立てること。配下に足す操作子を押したとき、`GRS` は、立てたタスクグループのプロパティパネルを出し、名前の欄で名づけさせること。',
    )
    expect(says('T-051', 'HF-14')).not.toContain('打ち込み口')
  })

  // Spec: NT-3a, NT-1
  it('⛔ 表 T-233 still holds RS-46, against NT-3a, and its words are in the dictionary', () => {
    // Why: a next step exists (add to a shallower task group), so the manner is
    // NT-3a and not NT-1; it is the half that is easy to get wrong.
    expect(rowOf('T-233', RS_46).by['場面']).toContain('これ以上深い段にはタスクグループを足せない')
    expect(mannerOf(RS_46)).toBe('NT-3a')
    expect(bare(rowOf('T-233', RS_46).by['正'] ?? '')).toBe('FR-085')
    for (const language of ['ja', 'en'] as const) {
      expect(wordsFor(RS_46).text[language].length, language).toBeGreaterThan(0)
      expect(wordsFor(RS_46).nextStep?.[language].length ?? 0, language).toBeGreaterThan(0)
    }
  })

  it('⛔ FR-029 still ties the faint drawing and the telling into one rule', () => {
    expect(REQUIREMENTS).toContain('利用者が薄く描いた入口を押したときに限り、`GRS` は行えない理由を通知の仕組みへ運ぶこと（例外は `IMPS-1114`）。')
    expect(REQUIREMENTS).toContain('押された入口の場面に当たる行が 表 T-233 にあるとき、`GRS` は落ち先を運ばないこと。')
  })
})

// Spec: HF-14, HF-13, FR-085, FR-029, RS-46
// Why: no press here raises a task group, so the detail tier (FR-018) and a
// carried task group's silent stop at the cap (HF-15) are not asserted.

describe('表 T-051 HF-14 (MUST): a task group at FR-085s cap has no child to add', () => {
  // Spec: IMPS-1953
  it('⛔ the task group AT the cap is described as having nothing to add, and the one above it is not', () => {
    // Why: faintness is the surface's; this unit owes the answer it draws from,
    // read the way HF-13 reads it. The shallower task group is the control.
    const built = stage()
    expect(
      (built.titleOf(ONE_ABOVE_THE_CAP) as any).canAddChildTaskGroup,
      `the task group at depth ${MAX_GROUP_DEPTH - 1} may still take a child, so it is not faint`,
    ).toBe(true)
    expect(
      (built.titleOf(AT_THE_CAP) as any).canAddChildTaskGroup,
      `the task group at depth ${MAX_GROUP_DEPTH} has reached S-125, so HF-14 (MUST) draws it faint`,
    ).toBe(false)
  })

  for (const language of ['ja', 'en'] as const) {
    it(`⭐ a press at the cap shows none of RS-46's or RS-15's words (${language})`, () => {
      const built = stage(language)

      built.press(ADD_CHILD_TASK_GROUP, AT_THE_CAP)

      const texts = built.notices().map((one) => one.text)
      expect(texts, 'RS-46 is hidden (表 T-233 の表示の仕方)').not.toContain(
        wordsFor(RS_46).text[language],
      )
      expect(texts, 'RS-15 is for a reason 表 T-233 has no row for').not.toContain(
        wordsFor(RS_15).text[language],
      )
    })
  }

  it('⭐ RS-46 keeps its NT-3a manner and its words, and table T-233 does not show it (CR-712)', () => {
    const built = stage()
    built.press(ADD_CHILD_TASK_GROUP, AT_THE_CAP)
    expect(built.notices(), 'a hidden reason put a notice up').toEqual([])
    expect(mannerOf(RS_46)).toBe('NT-3a')
    expect(bare(rowOf('T-233', RS_46).by['表示の仕方'] ?? '')).toBe('出さない')
  })

  // Spec: IMPS-1973, IMPS-1954
  it('⛔ the refused press leaves the document exactly as it was', () => {
    const built = stage()
    const before = JSON.stringify(built.loop.document())
    const taskGroupsBefore = taskGroupCount(built)

    built.press(ADD_CHILD_TASK_GROUP, AT_THE_CAP)

    expect(taskGroupCount(built), 'a task group was added past S-125').toBe(taskGroupsBefore)
    expect(JSON.stringify(built.loop.document())).toBe(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
    // Why: the ordinary press opens the properties panel, so a refusal that
    // opened it too would be the very shape HF-14 forbids.
    expect(
      built.screen.last().propertiesPanel,
      'the capped press opened the panel it was refused in',
    ).toBeNull()
  })

  it('⛔ the control: the same press one level above the cap is NOT answered with a reason', () => {
    // Why: without this, a unit that told RS-46 on every press of IC-91 would
    // pass every case above.
    const built = stage()

    built.press(ADD_CHILD_TASK_GROUP, ONE_ABOVE_THE_CAP)

    expect(
      built.notices().map((one) => one.text),
      'a task group that may still take a child was told it may not',
    ).not.toContain(wordsFor(RS_46).text.ja)
  })
})
