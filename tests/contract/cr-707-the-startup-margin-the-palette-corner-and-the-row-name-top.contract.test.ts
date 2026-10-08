// CR-707: the startup margin (OP-10, S-534), the palette's default corner (S-535) and the row name's top (FR-085).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { dayOf } from '../../src/entity/document-model/schedule/schedule'
import { dateAtX, timeAxisOf, xFromDay } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { heldViewPlaceOf } from '../../src/framework/single-html-shell/view-place'
import { selfAndDescendants, styleMap, surfaceOf, wire, type Stage } from '../fixtures/fake-browser'
import { settingNumber } from '../fixtures/setting-number'
import { specTable } from './spec-table'

const OP_10_MARGIN =
  'その最初の日の左端は、`Row Area` の左端から `_assets/tbl-settings.md` の 表 T-206 の `S-534` だけ右に置くこと（MUST）'
const OP_10_WRITTEN =
  '書く文書の `scrollDate`（`S-77`）と `S-177` に `Row Area` の左端が指す日とその日の中の位置を、`scrollGroupId`（`S-78`）に描いている行の木の先頭の行を、`S-176` に `0` を書くこと（MUST）'
const FR_053_CORNER = '既定の角は `_assets/tbl-settings.md` の 表 T-206 の `S-535` に従うこと（MUST）'
const FR_085_TOP = '行の名前は、行見出しパネルのその行の箱の上端に寄せて置くこと（MUST）'

const REQUIREMENTS = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')

const STARTUP_MARGIN_PX = settingNumber('S-134') / 2 + settingNumber('S-268') / 2

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

function template(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error(`the startup template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

function firstDayCovered(document: Document): string {
  const days = document.schedule.tasks
    .flatMap((one) => [one.start, one.actualStart])
    .filter((one): one is string => one !== null)
    .sort()
  const first = days[0]
  if (first === undefined) throw new Error('the startup template holds no dated Task')
  return first
}

const BAND = { width: 240, height: 30 }
const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  commandPaletteBandPx: BAND,
}

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

interface Bench {
  readonly loop: FrameLoop
  readonly built: Stage
  drain(): void
  view(): ScreenView
}

function bench(document: Document, fromTemplate: boolean): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': SCREEN.appHeaderHeight })
  const drawn = surfaceOf(built)
  const views: ScreenView[] = []
  const aimed: ScreenPart | null = null
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
      drawn.showScreenView(view)
    },
    readDialogueInput: () => drawn.readDialogueInput(),
    readFieldCommit: () => drawn.readFieldCommit(),
    readScreenPartAt: () => aimed,
  } as unknown as ScreenSurface
  const loop = frameLoop(
    { showSvg: () => undefined } as never,
    document,
    SCREEN,
    { surface, language: 'ja' },
    undefined,
    undefined,
    undefined,
    fromTemplate,
  )
  drain()
  return {
    loop,
    built,
    drain,
    view: () => {
      const last = views[views.length - 1]
      if (last === undefined) throw new Error('the loop showed no screen view')
      return last
    },
  }
}

function drawnNow(loop: FrameLoop) {
  const now = loop.current()
  if (now === null) throw new Error('the loop has drawn no frame')
  return now
}

describe('CR-707 -- the clauses this file holds are the manuscript\'s', () => {
  it('quotes four clauses that stand in 01-04-requirements.md', () => {
    for (const clause of [OP_10_MARGIN, OP_10_WRITTEN, FR_053_CORNER, FR_085_TOP]) {
      expect(REQUIREMENTS.includes(clause), clause).toBe(true)
    }
  })

  it('S-534 and S-535 are rows of table T-206', () => {
    const ids = specTable('T-206').rows.map((row) => row.id)
    expect(ids).toContain('S-534')
    expect(ids).toContain('S-535')
  })
})

describe(`表 T-024a OP-10 -- ${OP_10_MARGIN}`, () => {
  it('a boot from the startup template draws the first day covered S-534 right of the Row Area\'s left edge', () => {
    const document = template()
    const { loop } = bench(document, true)
    const now = drawnNow(loop)
    const first = dayOf(firstDayCovered(document))
    expect(first).not.toBeNull()
    expect(xFromDay(now.layout, first!)).toBeCloseTo(now.regions.rowArea.x + STARTUP_MARGIN_PX, 6)
  })

  it('the same document opened as a file (no BT-4) is not given the margin by this clause', () => {
    const document = template()
    const fromTemplate = drawnNow(bench(document, true).loop)
    const opened = drawnNow(bench(document, false).loop)
    expect(opened.layout.pxPerDay === fromTemplate.layout.pxPerDay && opened.layout.originX === fromTemplate.layout.originX).toBe(false)
  })
})

describe(`表 T-024a OP-10 -- ${OP_10_WRITTEN}`, () => {
  it('the written copy reopens on the same picture: its place names the day and fraction at the Row Area\'s left edge', () => {
    const document = template()
    const regions = drawnNow(bench(document, true).loop).regions
    const shell = heldViewPlaceOf({ readEnvironment: () => SCREEN }, true)
    const drawn = shell.viewSettingsOnce(document, document.documentSettings, regions).settings
    const written = shell.documentToWrite(document).documentSettings as DocumentSettings

    expect(written.scrollDate).toBe(drawn.scrollDate)
    expect(written.scrollDayOffset).toBe(drawn.scrollDayOffset)
    expect(written.scrollGroupOffset).toBe(0)
    expect(written.scrollGroupId).toBe(drawn.scrollGroupId)

    const axis = timeAxisOf(written, regions)
    const atMargin = dateAtX(axis, regions.rowArea.x + STARTUP_MARGIN_PX)
    expect(atMargin).toEqual(dayOf(firstDayCovered(document)))
    expect(dateAtX(axis, regions.rowArea.x)).not.toEqual(dayOf(firstDayCovered(document)))
  })

  it('the open document keeps its null place', () => {
    const document = template()
    expect(document.documentSettings.scrollDate).toBeNull()
  })
})

describe(`FR-053 -- ${FR_053_CORNER}`, () => {
  it('an undragged palette stands with its band\'s right end on the Row Area\'s right edge and its top on the Row Area\'s top', () => {
    const { loop, view } = bench(template(), true)
    const area = drawnNow(loop).regions.rowArea
    const palette = view().commandPalette
    expect(palette).not.toBeNull()
    expect(palette!.at.x + BAND.width).toBeCloseTo(area.x + area.width, 6)
    expect(palette!.at.y).toBeCloseTo(area.y, 6)
  })

  it('a narrower band (as when the palette is minimized) keeps its right end on the same edge', () => {
    const { loop, view, drain } = bench(template(), true)
    const narrow = { width: 90, height: BAND.height }
    loop.resize({ ...SCREEN, commandPaletteBandPx: narrow })
    drain()
    const area = drawnNow(loop).regions.rowArea
    expect(view().commandPalette!.at.x + narrow.width).toBeCloseTo(area.x + area.width, 6)
  })
})

describe(`FR-085 -- ${FR_085_TOP}`, () => {
  it('every drawn row heading starts its line at the top of its box and sets nothing down', () => {
    const { built } = bench(template(), true)
    const rows = selfAndDescendants(built.root()).filter(
      (one) => one.hasAttribute('data-group-id') && styleMap(one).has('align-items'),
    )
    expect(rows.length, 'the boot drew row headings').toBeGreaterThan(0)
    for (const row of rows) {
      expect(styleMap(row).get('align-items')).toBe('flex-start')
      expect(styleMap(row).get('padding-top')).toBeUndefined()
    }
  })
})
