// W3 spec-only cases for FR-041 on the shipped build: GRS paints its own ground (S-146), never the browser's system colour, and saves no solved colour (CF-1).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { colourOf } from '../../src/adapter/svg-renderer/svg-renderer'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { BASE_SCREEN, pressEntrance, settle, SHIPPED_BUILD } from './cr-570-tree-state-stage'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import { rowOf } from './sws-case'
import { applyCommandsOf } from './w3-t1-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_041_OWN_GROUND = '地の色を自分で塗ること（MUST）。閲覧環境のシステム色に委ねてはならない（MUST NOT）'
const CF_1_NOT_SAVED = '| CF-1 | 解くとき | テーマ色（`themeHue`）・明暗（`themePreference`）・モノクロ（`themeMonochrome`）のどれかが変わったら、描く前に `CF-2` 〜 `CF-4` を、この順に 1 回解くこと（MUST）。解いた値を保存してはならない（MUST NOT）'

const THEME_TOGGLE = rowOf(specTable('T-109'), 'IC-16').id
const AGENT_API = rowOf(specTable('T-109'), 'IC-20').id
const SCHEDULE_CANVAS = `[data-role="${bare(rowOf(specTable('T-103'), 'U-32').cells[0] ?? '')}"]`
const HUE = 214

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

// WHY: the system colour scheme is the context's; the shell stage cannot choose it, so this opens its own context.
/** @purity non-pure */
async function openUnder(scheme: 'light' | 'dark'): Promise<Opened> {
  if (browser === null) throw new Error('no browser')
  const context = await browser.newContext({ viewport: BASE_SCREEN, colorScheme: scheme })
  const page = await context.newPage()
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  return { page, close: async () => context.close() }
}

// WHY: what shows behind the Schedule Canvas is the nearest ancestor that paints an opaque background;
// when none does, the browser's own canvas colour (the system colour) shows through.
/** @purity semi-pure-b */
async function groundBehind(page: Page, want: string): Promise<{ want: string; behind: string; painter: string }> {
  return page.evaluate(
    ({ colour, canvas }: { colour: string; canvas: string }) => {
      const probe = document.createElement('div')
      probe.style.backgroundColor = colour
      document.body.appendChild(probe)
      const wanted = getComputedStyle(probe).backgroundColor
      probe.remove()
      for (let at: Element | null = document.querySelector(canvas); at !== null; at = at.parentElement) {
        const painted = getComputedStyle(at).backgroundColor
        if (painted !== 'rgba(0, 0, 0, 0)' && painted !== 'transparent') return { want: wanted, behind: painted, painter: at.tagName }
      }
      return { want: wanted, behind: 'the system colour', painter: 'none' }
    },
    { colour: want, canvas: SCHEDULE_CANVAS },
  )
}

/** @purity semi-pure-b */
async function exportedJson(page: Page): Promise<any> {
  const text = await page.evaluate(async () => {
    const answer = (await (window as unknown as { grSchedulerAgentApi: { exportJson(): unknown } }).grSchedulerAgentApi.exportJson()) as unknown
    if (typeof answer === 'string') return answer
    const held = answer as { value?: unknown }
    return typeof held.value === 'string' ? held.value : JSON.stringify(held.value)
  })
  return JSON.parse(text)
}

test.describe('W3-T1 the manuscript these cases are driven by', () => {
  test('FR-041 and CF-1 still read this way', () => {
    for (const clause of [FR_041_OWN_GROUND, CF_1_NOT_SAVED]) expect(REQUIREMENTS, clause).toContain(clause)
  })
})

test.describe(`FR-041 (MUST NOT): ${FR_041_OWN_GROUND}`, () => {
  test.setTimeout(120_000)

  for (const [system, chosen] of [
    ['light', 'dark'],
    ['dark', 'light'],
  ] as const) {
    test(`the system says ${system}, the viewer chooses ${chosen}: the page ground is S-146 ${chosen}`, async () => {
      const opened = await openUnder(system)
      try {
        expect(await pressEntrance(opened.page, THEME_TOGGLE), 'IC-16 is on the screen').toBe(true)
        await settle(opened.page)
        const said = await groundBehind(opened.page, colourOf('S-146', HUE, chosen === 'dark', false))
        expect(said.behind, `the ground behind the Schedule Canvas (painted by ${said.painter})`).toBe(said.want)
      } finally {
        await opened.close()
      }
    })
  }
})

test.describe(`CF-1 (MUST NOT): ${CF_1_NOT_SAVED.slice(-40)}`, () => {
  test.setTimeout(120_000)

  test('a new hue and a new light / dark choice change nothing in the saved bytes but themeHue itself', async () => {
    const opened = await openUnder('light')
    try {
      expect(await pressEntrance(opened.page, AGENT_API), 'IC-20 opens the Agent API').toBe(true)
      const before = await exportedJson(opened.page)
      expect(before.schedule.project.themeHue, 'premise: the template hue').toBe(HUE)
      const answer = await applyCommandsOf(opened.page, [{ kind: 'setThemeHue', hue: 52 }])
      expect(answer.accepted, 'premise: the hue is written').toBe(true)
      expect(await pressEntrance(opened.page, THEME_TOGGLE)).toBe(true)
      await settle(opened.page)
      const after = await exportedJson(opened.page)
      expect(after.schedule.project.themeHue).toBe(52)
      const strip = (held: any): unknown => ({
        ...held,
        documentStamp: null,
        changeLog: null,
        schedule: { ...held.schedule, project: { ...held.schedule.project, themeHue: null } },
      })
      expect(strip(after), 'nothing solved from the hue or the light / dark choice is saved').toEqual(strip(before))
    } finally {
      await opened.close()
    }
  })
})
