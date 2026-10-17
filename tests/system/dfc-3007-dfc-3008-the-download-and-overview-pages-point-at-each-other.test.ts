// DFC-3007, DFC-3008: the download page (S-350) and the overview page (S-583) point at each other, read from the committed pages.

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { expect, test } from '@playwright/test'

const DOWNLOAD = pathToFileURL(resolve('docs/download/index.html')).href
const ABOUT = pathToFileURL(resolve('docs/about/index.html')).href
const OVERVIEW_ADDRESS = /^https:\/\/goodrelax\.github\.io\/gr-scheduler\/about\//
const DOWNLOAD_ADDRESS = 'https://goodrelax.github.io/gr-scheduler/download/'

test.describe('DFC-3007: the download page wording and the install steps (JDG-2507..2510, JDG-2513, JDG-2517)', () => {
  test('the overview button replaces GitHub, Chat or Claude Code, drag and drop only, no coming soon', async ({ page }) => {
    await page.goto(DOWNLOAD)
    const text = await page.evaluate(() => document.body.textContent ?? '')
    const links = await page.evaluate(() => [...document.querySelectorAll('a')].map((a) => ({ text: (a.textContent ?? '').trim(), href: a.getAttribute('href') ?? '', target: a.target })))
    for (const word of ['技術紹介', 'GRS technical overview']) {
      const found = links.find((one) => one.text === word)
      expect(found?.href, `① [${word}] opens the overview page`).toMatch(OVERVIEW_ADDRESS)
      expect(found?.target, `① [${word}] opens a new tab`).toBe('_blank')
    }
    expect(links.some((one) => /github\.com/.test(one.href)), '① the GitHub link is gone').toBe(false)
    expect(text, '③ ja').toContain('Chat（チャット）か Claude Code で使います。※デスクトップ版 Claude Code は動作確認済み。')
    expect(text, '③ en').toContain('Use the Chat tab or Claude Code of the Claude desktop app. (Checked with Claude Code in the desktop app.)')
    expect(text, '④ drag and drop is the only way to install').not.toContain('Install Extension')
    expect(text, '⑤ ja').toContain('Chat タブか Code タブで新しい会話を始め')
    expect(text, '⑥ ja').not.toContain('となる予定')
    expect(text.toLowerCase(), '⑥ en').not.toContain('coming soon')
    const headings = await page.evaluate(() => [...document.querySelectorAll('h2, h3, h4')].map((one) => (one.textContent ?? '').trim()))
    expect(headings, '⑤ the last section says it is for the command line (JDG-2513)').toEqual(expect.arrayContaining(['コマンドラインの Claude Code から使う', 'Use it from Claude Code on the command line']))
  })
})

test.describe('DFC-3008: the overview cover holds a download button (JDG-2515, JDG-2516, JDG-2518)', () => {
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1454, height: 709 }]) {
    for (const language of ['ja', 'en'] as const) {
      for (const colorScheme of ['light', 'dark'] as const) {
        test(`${String(viewport.width)}x${String(viewport.height)} ${language} ${colorScheme}: the button stands right of the OSS line and the cover fits one screen`, async ({ browser }) => {
          const page = await browser.newPage({ viewport, colorScheme })
          await page.goto(`${ABOUT}?lang=${language}`)
          const seen = await page.evaluate((address) => {
            const button = [...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === address)!
            const oss = button.previousElementSibling!
            const b = button.getBoundingClientRect()
            const o = oss.getBoundingClientRect()
            let clipped = 0
            for (const one of document.querySelectorAll('body *')) {
              const r = one.getBoundingClientRect()
              if (r.width > 0 && r.height > 0 && (one as HTMLElement).offsetParent !== null && r.bottom > innerHeight + 0.5) clipped += 1
            }
            return {
              text: (button.textContent ?? '').trim(),
              target: button.getAttribute('target'),
              rightOf: b.left > o.right,
              sameLine: Math.abs((b.top + b.bottom) / 2 - (o.top + o.bottom) / 2) < 12,
              oss: (oss.textContent ?? '').includes('Apache License 2.0'),
              clipped,
              scrolls: document.documentElement.scrollHeight > innerHeight,
            }
          }, DOWNLOAD_ADDRESS)
          expect(seen).toEqual({
            text: language === 'ja' ? 'GRS.htmlをダウンロード' : 'Download GRS.html',
            target: '_blank',
            rightOf: true,
            sameLine: true,
            oss: true,
            clipped: 0,
            scrolls: false,
          })
          await page.close()
        })
      }
    }
  }
})
