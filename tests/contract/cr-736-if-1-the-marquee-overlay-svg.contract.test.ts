// CR-736 from docs/spec only: IF-1 has two mouths, and the marquee overlay holds ZO-6 and nothing else.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { marqueeOverlaySvg, svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { SCREEN as BENCH_SCREEN, day as benchDay, scheduleOf, sceneOf, taskOf } from '../unit/cr-430-cross-section-scene'
import { specTable, unbroken } from './spec-table'

const wholeRow = (table: string, id: string): string => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(found.cells.join(' ')).replace(/`/g, '')
}

const IF_1_ONLY_WHILE_NOT_EMPTY = '重ねの要素は、重ねの絵が空でないあいだだけ置き、空になったら外すこと（MUST）'
const IF_1_LAST_CHILD = '置くときは Schedule Canvas の宿主の最後の子とし、position:absolute で下の絵と同じ左上に載せること（MUST）'
const IF_1_ONLY_ON_A_CHANGE = 'SingleHtmlShell（CP-25）は重ねの絵の文字列を覚え（初めは空）、前と違うときだけ重ねの口を呼ぶこと（MUST）'

describe('CR-736 the manuscript these cases are driven by', () => {
  it('T-065 IF-1: two mouths, ZO-6 only in the overlay, same size and clip, in front, a same string is not written again, no pointer', () => {
    const supplies = wholeRow('T-065', 'IF-1')
    expect(supplies).toContain('口は 2 つ')
    expect(supplies).toContain('下の絵と同じ幅・高さ・viewBox')
    expect(supplies).toContain('Task Group Area の帯')
    expect(supplies).toContain('Schedule Canvas の中で下の絵の手前に載せること（MUST）')
    expect(supplies).toContain('重ねの絵に ZO-6 のほかの行を載せてはならない（MUST NOT）')
    expect(supplies).toContain('渡された文字列が前に載せたものと同じなら画面を書き換えないこと（MUST）')
    expect(supplies).toContain('重ねの絵は点を受けない')
    expect(supplies).toContain('IF-9')
  })

  it('T-065 IF-1 (a)-(c): the overlay element only while not empty, the last child and absolute, the shell calls the overlay mouth only on a change', () => {
    const supplies = wholeRow('T-065', 'IF-1')
    expect(supplies).toContain(IF_1_ONLY_WHILE_NOT_EMPTY)
    expect(supplies).toContain(IF_1_LAST_CHILD)
    expect(supplies).toContain(IF_1_ONLY_ON_A_CHANGE)
    expect(supplies).toContain('範囲選択をしないフレームは重ねの口に触れない')
  })

  it('T-075 UF-32 builds the picture beneath apart from ZO-6, and decides which layer goes to the overlay', () => {
    const does = wholeRow('T-075', 'UF-32')
    expect(does).toContain('ZO-6 だけは下の絵に入れず、重ねの絵の SVG')
  })

  it('T-064 PI-19 publishes marqueeOverlaySvg', () => {
    const rows = specTable('T-064').rows
    const row = rows.find((one) => one.id === 'PI-19')
    expect(row, 'table T-064 has PI-19').toBeDefined()
    expect(unbroken((row?.cells ?? []).join(' '))).toContain('marqueeOverlaySvg')
  })
})

const VIEWER_LIGHT = { themePreference: 'light', guideCursorMode: 'none' } as never
const VIEWER_DARK = { themePreference: 'dark', guideCursorMode: 'none' } as never
const MARQUEE = { x: 300, y: 95, width: 120, height: 40 } as never
const OTHER_MARQUEE = { x: 120, y: 140, width: 260, height: 90 } as never
const TASKS = [
  taskOf({ uid: 1, name: 'Anchor', start: benchDay(2), finish: benchDay(24) }),
  taskOf({ uid: 2, name: 'Second', start: benchDay(8), finish: benchDay(20) }),
]

interface Pieces {
  readonly beneath: (viewer?: never) => string
  readonly overlay: (marquee: never | null, viewer?: never) => string
}

function piecesOf(settings?: Readonly<Record<string, unknown>>): Pieces {
  const wish = { tasks: TASKS, ...(settings === undefined ? {} : { settings }) }
  const scene = sceneOf(wish)
  const schedule = scheduleOf(wish)
  const regions = regionsFromScreen(BENCH_SCREEN, scene.settings)
  const layout = layoutFromSchedule(schedule, scene.settings, regions)
  const geometry = geometryFromLayout(schedule, scene.settings, layout, regions, scene.selection, null)
  return {
    beneath: (viewer = VIEWER_LIGHT) =>
      (svgFromSchedule as unknown as (...args: unknown[]) => string)(
        schedule,
        scene.settings,
        layout,
        geometry,
        regions,
        scene.selection,
        'screen',
        viewer,
        null,
        [],
        null,
        null,
        null,
        null,
      ),
    overlay: (marquee, viewer = VIEWER_LIGHT) =>
      marqueeOverlaySvg(schedule, scene.settings, regions, viewer, marquee as never),
  }
}

const zoRows = (svg: string): readonly string[] => [...svg.matchAll(/data-zo="([^"]+)"/g)].map((one) => one[1] as string)

const rootOf = (svg: string): { width: string | null; height: string | null; viewBox: string | null } => {
  const open = /<svg\b[^>]*>/.exec(svg)
  if (open === null) throw new Error('no <svg> in this string')
  const at = (name: string): string | null => new RegExp(`\\s${name}="([^"]*)"`).exec(open[0])?.[1] ?? null
  return { width: at('width'), height: at('height'), viewBox: at('viewBox') }
}

interface Clip {
  readonly id: string
  readonly box: string
}

const clipsOf = (svg: string): readonly Clip[] =>
  [...svg.matchAll(/<clipPath\b[^>]*\bid="([^"]*)"[^>]*>\s*<rect\b([^>]*)\/?>/g)].map((one) => {
    const attrs = one[2] as string
    const at = (name: string): string => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1] ?? ''
    return { id: one[1] as string, box: ['x', 'y', 'width', 'height'].map(at).join(' ') }
  })

describe('IF-1 / ZO-6: the overlay holds ZO-6 and nothing else, and the picture beneath holds no ZO-6', () => {
  it('the overlay of a held marquee carries the layer ZO-6 only (MUST NOT carry any other row)', () => {
    const overlay = piecesOf().overlay(MARQUEE)
    expect(overlay.length).toBeGreaterThan(0)
    expect(zoRows(overlay), 'table T-065 IF-1: 重ねの絵に `ZO-6` のほかの行を載せてはならない（MUST NOT）').toEqual(['ZO-6'])
  })

  it('the overlay of a marquee that is not held is the empty string', () => {
    expect(piecesOf().overlay(null)).toBe('')
  })

  it('the overlay is one complete SVG that draws the dashed rectangle SL-3 asks for', () => {
    const overlay = piecesOf().overlay(MARQUEE)
    expect(overlay.trimStart().startsWith('<svg')).toBe(true)
    expect(overlay.trimEnd().endsWith('</svg>')).toBe(true)
    const rects = [...overlay.matchAll(/<rect\b[^>]*stroke-dasharray="[^"]*"[^>]*>/g)]
    expect(rects.length, 'table T-023c SL-3: one dashed rectangle is the thing being taken').toBe(1)
  })

  it('the overlay follows the marquee: another rectangle makes another overlay', () => {
    const pieces = piecesOf()
    expect(pieces.overlay(MARQUEE)).not.toBe(pieces.overlay(OTHER_MARQUEE))
  })

  it('the picture beneath holds no ZO-6, whatever is in the document', () => {
    expect(zoRows(piecesOf().beneath())).not.toContain('ZO-6')
    expect(zoRows(piecesOf().beneath(VIEWER_DARK))).not.toContain('ZO-6')
  })

  it('the picture beneath still holds the layers it held (ZO-6 left, nothing else did)', () => {
    const rows = zoRows(piecesOf().beneath())
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((one) => /^ZO-\d+$/.test(one))).toBe(true)
  })

  it('the picture beneath is the same string whether or not a marquee will be laid over it', () => {
    const pieces = piecesOf()
    const first = pieces.beneath()
    pieces.overlay(MARQUEE)
    expect(pieces.beneath()).toBe(first)
  })

  it('the overlay is in front: ahead of the picture beneath in the order the screen reads them (ZO-6 is the front of T-020)', () => {
    const pieces = piecesOf()
    const beneath = pieces.beneath()
    const overlay = pieces.overlay(MARQUEE)
    const screen = beneath + overlay
    expect(screen.indexOf('data-zo="ZO-6"')).toBeGreaterThan(beneath.length - 1)
  })
})

describe('IF-1: the overlay has the size, viewBox and clip of the picture beneath for the same input', () => {
  const inputs: readonly (readonly [string, Pieces, never])[] = [
    ['light', piecesOf(), VIEWER_LIGHT],
    ['dark', piecesOf(), VIEWER_DARK],
    ['zoomed out', piecesOf({ zoomX: 4 }), VIEWER_LIGHT],
    ['zoomed in', piecesOf({ zoomX: 16 }), VIEWER_LIGHT],
  ]
  for (const [name, pieces, viewer] of inputs) {
    it(`${name}: width, height and viewBox are the same`, () => {
      const beneath = rootOf(pieces.beneath(viewer))
      const overlay = rootOf(pieces.overlay(MARQUEE, viewer))
      expect(overlay.width).not.toBeNull()
      expect(overlay.height).not.toBeNull()
      expect(overlay.viewBox).not.toBeNull()
      expect(overlay, 'table T-065 IF-1: 下の絵と同じ幅・高さ・`viewBox`').toEqual(beneath)
    })

    it(`${name}: the clip is the box the picture beneath clips ZO-6 with (the Task Group Area band, JDG-365)`, () => {
      const beneath = clipsOf(pieces.beneath(viewer))
      const overlay = clipsOf(pieces.overlay(MARQUEE, viewer))
      expect(overlay.length, 'the overlay clips the rectangle').toBeGreaterThan(0)
      for (const clip of overlay) {
        expect(
          beneath.map((one) => one.box),
          `the overlay clip ${clip.id} is a box the picture beneath clips with`,
        ).toContain(clip.box)
      }
    })

    it(`${name}: no id of the overlay stands twice in one document with an id of the picture beneath`, () => {
      const ids = (svg: string): readonly string[] => [...svg.matchAll(/\bid="([^"]+)"/g)].map((one) => one[1] as string)
      const beneathIds = new Set(ids(pieces.beneath(viewer)))
      const clash = ids(pieces.overlay(MARQUEE, viewer)).filter((one) => beneathIds.has(one))
      expect(clash, 'table T-065 IF-1: the overlay and the picture sit in one document').toEqual([])
    })
  }

  it('the clip is a real clip: the rectangle drawn in the overlay refers to it', () => {
    const overlay = piecesOf().overlay(MARQUEE)
    const clips = clipsOf(overlay)
    expect(clips.length).toBeGreaterThan(0)
    expect(overlay).toContain(`url(#${clips[0]?.id})`)
  })
})

interface Template {
  readonly $schema: unknown
  readonly schemaVersion: unknown
  readonly schedule: { readonly project: object; readonly calendars: unknown }
  readonly documentSettings: object
  readonly documentStamp: unknown
}

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Template

const GROUPS = [1, 2, 3, 4, 5, 6].map((n) => `4a000000-0000-4000-8000-00000000000${n}`)
const ALPHA_UID = 1

const shellDay = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

function shellTask(uid: number, name: string, start: number, finish: number): Task {
  return {
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name,
    start: shellDay(start),
    finish: shellDay(finish),
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  } as unknown as Task
}

function shellDocument(): Document {
  const template = structuredClone(TEMPLATE)
  return {
    $schema: template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [shellTask(ALPHA_UID, 'Alpha', 8, 16)],
      resources: [],
      assignments: [],
      taskGroups: GROUPS.map((id, order) => ({
        id,
        parentId: null,
        name: `R${order + 1}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: [{ taskUid: ALPHA_UID, taskGroupId: GROUPS[2] }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      zoomX: 20 / SETTINGS_CONSTANTS.pxPerDayAt1x,
      stackDirection: 'down',
      scrollDate: '2026-04-01',
      scrollDateFraction: 0,
      scrollTaskGroupId: GROUPS[0],
      scrollTaskGroupFraction: 0,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

interface Call {
  readonly mouth: 'showSvg' | 'showMarqueeOverlaySvg'
  readonly svg: string
}

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  readonly calls: Call[]
  runAnimationFrames(): void
}

const globals = globalThis as unknown as { requestAnimationFrame?: (callback: (time: number) => void) => number }
const realRaf = globals.requestAnimationFrame

function host(): Host {
  const waiting: ((time: number) => void)[] = []
  const calls: Call[] = []
  let handle = 0
  globals.requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: {
      showSvg: (svg) => {
        calls.push({ mouth: 'showSvg', svg })
      },
      showMarqueeOverlaySvg: (svg) => {
        calls.push({ mouth: 'showMarqueeOverlaySvg', svg })
      },
    },
    calls,
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(0)
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete globals.requestAnimationFrame
  else globals.requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

const screenPane = (): ScreenWiring => {
  const surface: ScreenSurface = {
    showScreenView: (_view: ScreenView) => {},
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  return { surface, language: 'en' }
}

interface Stage {
  readonly loop: FrameLoop
  readonly calls: Call[]
  send(input: HumanInput): void
  beneathNow(): string
  overlayNow(): string
  mark(): number
}

function stage(): Stage {
  const pen = host()
  const loop = frameLoop(pen.surface as never, shellDocument(), SCREEN, screenPane())
  pen.runAnimationFrames()
  const last = (mouth: Call['mouth']): string =>
    [...pen.calls].reverse().find((one) => one.mouth === mouth)?.svg ?? ''
  return {
    loop,
    calls: pen.calls,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    beneathNow: () => last('showSvg'),
    overlayNow: () => last('showMarqueeOverlaySvg'),
    mark: () => pen.calls.length,
  }
}

interface FrameValues {
  readonly layout: { readonly taskGroups: readonly { readonly taskGroupId: string; readonly y: number; readonly height: number }[] }
  readonly geometry: {
    readonly tasks: readonly {
      readonly taskUid: number
      readonly plan: { readonly form: string; readonly points: readonly { x: number }[]; readonly from: { x: number }; readonly to: { x: number } } | null
    }[]
  }
}

const frameOf = (loop: FrameLoop): FrameValues => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values as unknown as FrameValues
}

const bandOf = (loop: FrameLoop, taskGroupId: string): { y: number; height: number } => {
  const found = frameOf(loop).layout.taskGroups.find((one) => one.taskGroupId === taskGroupId)
  if (found === undefined) throw new Error(`no band for ${taskGroupId}`)
  return { y: found.y as number, height: found.height as number }
}

const barLeft = (loop: FrameLoop): number => {
  const plan = frameOf(loop).geometry.tasks.find((one) => one.taskUid === ALPHA_UID)?.plan
  if (plan === undefined || plan === null) throw new Error('Alpha is not drawn')
  return Math.min(...(plan.form === 'outline' ? plan.points : [plan.from, plan.to]).map((one) => one.x))
}

function emptyGround(loop: FrameLoop): readonly { x: number; y: number }[] {
  const left = barLeft(loop)
  const mid = (id: string): number => {
    const band = bandOf(loop, id)
    return band.y + band.height / 2
  }
  return [
    { x: left - 90, y: mid(GROUPS[0] as string) },
    { x: left - 90, y: mid(GROUPS[1] as string) },
    { x: left - 100, y: mid(GROUPS[1] as string) + 4 },
    { x: left - 110, y: mid(GROUPS[3] as string) },
  ]
}

describe('IF-1 on the shell: the marquee reaches the overlay mouth and the picture beneath is left alone', () => {
  it('T-065 IF-1 (a): before any press the overlay shows nothing (the empty string) and holds no ZO-6', () => {
    const built = stage()
    expect(built.overlayNow()).toBe('')
    expect(zoRows(built.beneathNow())).not.toContain('ZO-6')
  })

  it('while a marquee is dragged the overlay holds ZO-6 only and the picture beneath holds none', () => {
    const built = stage()
    const [from, ...path] = emptyGround(built.loop)
    built.send(pointer('down', from!.x, from!.y))
    built.send(pointer('move', path[0]!.x, path[0]!.y))
    expect(zoRows(built.overlayNow()), 'table T-065 IF-1: the overlay is ZO-6 only').toEqual(['ZO-6'])
    expect(zoRows(built.beneathNow())).not.toContain('ZO-6')
  })

  it('while a marquee is dragged the picture beneath does not change, and only the overlay does', () => {
    const built = stage()
    const [from, ...path] = emptyGround(built.loop)
    const beneathBefore = built.beneathNow()
    built.send(pointer('down', from!.x, from!.y))
    const overlays = new Set<string>()
    for (const at of path) {
      built.send(pointer('move', at.x, at.y))
      expect(built.beneathNow(), 'table T-065 IF-1: 範囲選択のあいだ下の絵の文字列は変わらない').toBe(beneathBefore)
      overlays.add(built.overlayNow())
    }
    expect(overlays.size, 'the overlay follows the pointer: each move is a new rectangle').toBe(path.length)
    expect([...overlays].every((one) => one.length > 0)).toBe(true)
  })

  it('the overlay rectangle matches the one the pure renderer draws for the same drag', () => {
    const built = stage()
    const [from, ...path] = emptyGround(built.loop)
    built.send(pointer('down', from!.x, from!.y))
    built.send(pointer('move', path[0]!.x, path[0]!.y))
    const rect = /<rect\b[^>]*stroke-dasharray="[^"]*"[^>]*>/.exec(built.overlayNow())?.[0] ?? ''
    const at = (name: string): number => Number(new RegExp(`\\b${name}="([^"]*)"`).exec(rect)?.[1])
    expect(Math.abs(at('x') - Math.min(from!.x, path[0]!.x))).toBeLessThanOrEqual(1)
    expect(Math.abs(at('y') - Math.min(from!.y, path[0]!.y))).toBeLessThanOrEqual(1)
    expect(Math.abs(at('width') - Math.abs(path[0]!.x - from!.x))).toBeLessThanOrEqual(1)
    expect(Math.abs(at('height') - Math.abs(path[0]!.y - from!.y))).toBeLessThanOrEqual(1)
  })

  it('T-065 IF-1 (a): on release the overlay is the empty string again and the picture beneath still has no ZO-6', () => {
    const built = stage()
    const [from, ...path] = emptyGround(built.loop)
    built.send(pointer('down', from!.x, from!.y))
    built.send(pointer('move', path[0]!.x, path[0]!.y))
    expect(built.overlayNow().length).toBeGreaterThan(0)
    built.send(pointer('up', path[0]!.x, path[0]!.y))
    expect(built.overlayNow(), `table T-023c SL-3, table T-065 IF-1: ${IF_1_ONLY_WHILE_NOT_EMPTY}`).toBe('')
    expect(zoRows(built.beneathNow())).not.toContain('ZO-6')
  })

  it('T-065 IF-1 (c): frames that carry no marquee never hand the overlay mouth anything but the empty string', () => {
    const built = stage()
    const [from, ...path] = emptyGround(built.loop)
    for (const at of path) built.send(pointer('move', at.x, at.y))
    built.send(pointer('down', from!.x, from!.y))
    built.send(pointer('up', from!.x, from!.y))
    const overlayCalls = built.calls.filter((one) => one.mouth === 'showMarqueeOverlaySvg')
    expect(overlayCalls.every((one) => one.svg === '' || one.svg.includes('data-zo="ZO-6"'))).toBe(true)
    expect(overlayCalls.filter((one) => one.svg !== '').length, 'a press that never moved takes no rectangle').toBe(0)
  })

  it('T-065 IF-1 (c): the overlay mouth is called only when the overlay string changed', () => {
    const built = stage()
    const [from, ...path] = emptyGround(built.loop)
    built.send(pointer('down', from!.x, from!.y))
    for (const at of path) {
      built.send(pointer('move', at.x, at.y))
      built.send(pointer('move', at.x, at.y))
    }
    built.send(pointer('up', path[path.length - 1]!.x, path[path.length - 1]!.y))
    const strings = built.calls.filter((one) => one.mouth === 'showMarqueeOverlaySvg').map((one) => one.svg)
    for (let i = 1; i < strings.length; i += 1) {
      expect(strings[i], `table T-065 IF-1: ${IF_1_ONLY_ON_A_CHANGE} -- call ${i} repeats call ${i - 1}`).not.toBe(strings[i - 1])
    }
  })

  it('a second marquee after the first is released is again carried by the overlay alone', () => {
    const built = stage()
    const [from, ...path] = emptyGround(built.loop)
    built.send(pointer('down', from!.x, from!.y))
    built.send(pointer('move', path[0]!.x, path[0]!.y))
    built.send(pointer('up', path[0]!.x, path[0]!.y))
    const beneathMid = built.beneathNow()
    built.send(pointer('down', from!.x, from!.y))
    built.send(pointer('move', path[2]!.x, path[2]!.y))
    expect(zoRows(built.overlayNow())).toEqual(['ZO-6'])
    expect(zoRows(built.beneathNow())).not.toContain('ZO-6')
    expect(built.beneathNow()).toBe(beneathMid)
  })
})
