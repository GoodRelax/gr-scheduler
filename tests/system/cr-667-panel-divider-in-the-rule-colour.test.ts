// CR-667 on the shipped build: EP-9 draws the Panel Divider as thick as the Group Grid Lines and in S-149, not in S-165.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: the constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const EP_9_S_149 =
  ' | 操作子としては描かない。境界の線を描く | 境界が消えるとタスクグループ見出しと日程の境目が読めない。`Group Grid Lines`（`U-18`）と同じ太さの線を 1 本、表 T-236 の `S-149`（罫の色）で引くこと（MUST）'

const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const BASE_SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))
const T_236 = specTable('T-236')
const DIVIDER = `[data-role="${bare(rowOf(specTable('T-103'), 'U-24').by['確定名（英）'] ?? '')}"]`

// WHY: the hue of the document the shipped build opens with, which every hue-following row of T-236 takes as H.
const THEME_HUE = (
  JSON.parse(readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8')) as {
    readonly schedule: { readonly project: { readonly themeHue: number } }
  }
).schedule.project.themeHue

type Theme = 'light' | 'dark'
const COLUMN: Readonly<Record<Theme, string>> = { light: '明るいテーマ', dark: '暗いテーマ' }

const colourIn = (id: string, theme: Theme): string =>
  bare(rowOf(T_236, id).by[COLUMN[theme]] ?? '').replace(/\bH\b/g, String(THEME_HUE))

interface DividerReading {
  readonly lines: readonly { readonly width: number; readonly height: number; readonly colour: string }[]
  readonly s149: string
  readonly s165: string
  readonly ruleWidthsPx: readonly number[]
}

let browser: Browser | null = null

test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) throw new Error('build the shipped app first (dist/index.html)')
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

// see EP-9, U-24, U-18
/** @purity semi-pure-b */
async function readDivider(page: Page, theme: Theme): Promise<DividerReading> {
  return page.evaluate(
    (asked: { divider: string; s149: string; s165: string }) => {
      const painted = (css: string): string => {
        const probe = document.createElement('div')
        probe.style.background = css
        document.body.append(probe)
        const out = getComputedStyle(probe).backgroundColor
        probe.remove()
        return out
      }
      const band = document.querySelector(`${asked.divider}[data-panel="taskGroupPanel"]`)
      if (band === null) return { lines: [], s149: painted(asked.s149), s165: painted(asked.s165), ruleWidthsPx: [] }
      const around = band.getBoundingClientRect()
      const lines = [...document.querySelectorAll('div')]
        .filter((one) => one !== band && !band.contains(one) && !one.contains(band))
        .map((one) => ({ one, box: one.getBoundingClientRect(), colour: getComputedStyle(one).backgroundColor }))
        .filter(
          ({ box, colour }) =>
            colour !== 'rgba(0, 0, 0, 0)' &&
            box.width > 0 &&
            box.width < around.width &&
            box.left >= around.left - 0.5 &&
            box.right <= around.right + 0.5 &&
            box.height >= around.height * 0.5,
        )
        .map(({ box, colour }) => ({ width: box.width, height: box.height, colour }))
      const rules = [...document.querySelectorAll('[data-role="Schedule Canvas"] svg [data-figure$="-rule"]')].map((one) => {
        const matrix = (one as SVGGraphicsElement).getScreenCTM()
        const scale = matrix === null ? 1 : Math.hypot(matrix.c, matrix.d)
        return Number(one.getAttribute('stroke-width')) * scale
      })
      return { lines, s149: painted(asked.s149), s165: painted(asked.s165), ruleWidthsPx: rules }
    },
    { divider: DIVIDER, s149: colourIn('S-149', theme), s165: colourIn('S-165', theme) },
  )
}

test('CR-667 the manuscript this case is driven by: 01-04 still says EP-9, word for word', () => {
  expect(REQUIREMENTS).toContain(EP_9_S_149)
})

for (const theme of ['light', 'dark'] as const) {
  test(`EP-9 (MUST), ${theme} theme: ${EP_9_S_149}`, async () => {
    test.setTimeout(180_000)
    if (browser === null) throw new Error('the reference browser was not opened')
    const context = await browser.newContext({ viewport: BASE_SCREEN, colorScheme: theme })
    try {
      const page = await context.newPage()
      await page.goto(pathToFileURL(SHIPPED_BUILD).href)
      await readSettledDrawnSvg(page)
      const read = await readDivider(page, theme)
      expect(read.lines, 'one divider line is drawn along the task group panel band').toHaveLength(1)
      const line = read.lines[0]
      if (line === undefined) throw new Error('no divider line')
      expect(line.colour, 'the line is S-149').toBe(read.s149)
      expect(line.colour, 'the line is not S-165').not.toBe(read.s165)
      expect(read.ruleWidthsPx.length, 'premise: the canvas draws Group Grid Lines').toBeGreaterThan(0)
      for (const width of read.ruleWidthsPx) expect(line.width, 'as thick as the Group Grid Lines').toBeCloseTo(width, 1)
    } finally {
      await context.close()
    }
  })
}
