// CR-571 on the shipped build: SK-24 and MK-10 (Ctrl+F), T-330 SV-2 / SV-14, IN-4 and IN-5a in the search field, T-076 EP-23.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { REQUIREMENTS, keyOf, openStage, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const SK_24_DOES = '検索パネルを出し、入力欄に焦点を置く（`FR-151`）'
const MK_10_CTRL_F =
  '⚠️ `Ctrl+F` は 表 T-036 の `SK-24` に割り当てたので、止める側である —— `GRS` の画面ではブラウザのページ内検索は使えず、代わりに検索パネル（`FR-151`）が日程の中を探す。'
const SV_2_FOCUS = 'パネルを開いたとき、焦点をここへ置くこと（MUST）。'
const SV_2_AGAIN = '`SK-24` を押したとき、パネルが出ていれば焦点をここへ戻し、打ってある語をすべて選ぶこと（MUST）'
const SV_14_ESC =
  '`IC-52`、または `Esc`（表 T-028 の `IN-4` の「開いているウィンドウ」の段 —— 焦点がパネルの外にあっても段に立ち、最小化しているあいだは立たない）。'
const IN_4_RUNG =
  '消費する階層は 出ている通知 → 確定していないその場の編集 → 開いている面 → 進行中のドラッグ・引きかけの矢印 → 開いているウィンドウ'
const IN_5A_FIELD =
  '⭐ 対話欄（`U-44`、`FR-066`）と検索パネルの入力欄（`FR-151` の 表 T-330 の `SV-2`・`SV-7`）はこの状態に数えず、キーの行き先で判じる —— 焦点がこれらの欄にある間、本行のキー（単文字キー・`Delete` / `Backspace`・下の `SK-4` / `SK-5` / `SK-2`）は欄への打鍵としてブラウザへ渡し、既定動作を止めず、ショートカットとしても扱わない。'
const EP_23_NOT_DRAWN = '探して飛ぶためのウィンドウであり、日程ではない。'
const EP_23_NO_ROOM = '⚠️ **場所は空けない** —— `EP-15` に同じ'

const T_103 = specTable('T-103')
const SEARCH_PANEL = `[data-role="${bare(rowOf(T_103, 'U-64').by['確定名（英）'] ?? '')}"]`
const SK_24_KEY = keyOf('SK-24')

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(rowOf(specTable(table), id).by[heading] ?? '')

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function stage(): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  return openStage(browser)
}

/** @purity semi-pure-b */
async function isPanelShown(page: Page): Promise<boolean> {
  return (await page.$(SEARCH_PANEL)) !== null
}

// WHY: SV-2's field is the one text entry inside the panel that holds focus after SK-24.
/** @purity semi-pure-b */
async function focusedField(page: Page): Promise<{ readonly inPanel: boolean; readonly value: string; readonly selected: string }> {
  return page.evaluate((panel: string) => {
    const active = document.activeElement as HTMLInputElement | null
    const inPanel = active !== null && document.querySelector(panel)?.contains(active) === true
    const value = active !== null && 'value' in active ? String(active.value) : ''
    const selected =
      active !== null && typeof active.selectionStart === 'number' && typeof active.selectionEnd === 'number'
        ? value.slice(active.selectionStart, active.selectionEnd)
        : ''
    return { inPanel, value, selected }
  }, SEARCH_PANEL)
}

/** @purity semi-pure-b */
async function exportedSvg(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const api = (window as unknown as { grSchedulerAgentApi?: { exportSvg(): unknown } }).grSchedulerAgentApi
    if (api === undefined) throw new Error('FR-065: the Agent API is not installed')
    const answer = (await api.exportSvg()) as { ok: boolean; value?: unknown }
    if (!answer.ok) throw new Error('AM-13 refused')
    return String(answer.value)
  })
}

test.describe('CR-571 -- the clauses these cases are driven by', () => {
  test('SK-24, MK-10, SV-2, SV-14, IN-4, IN-5a and EP-23 still read this way', () => {
    expect(cellOf('T-036', 'SK-24', '操作')).toBe(SK_24_DOES)
    expect(SK_24_KEY).toBe('Control+f')
    expect(REQUIREMENTS).toContain(MK_10_CTRL_F)
    expect(cellOf('T-330', 'SV-2', '定め')).toContain(SV_2_FOCUS)
    expect(cellOf('T-330', 'SV-2', '定め')).toContain(SV_2_AGAIN)
    expect(cellOf('T-330', 'SV-14', '定め')).toContain(SV_14_ESC)
    expect(REQUIREMENTS).toContain(IN_4_RUNG)
    expect(REQUIREMENTS).toContain(IN_5A_FIELD)
    const ep23 = unbroken(rowOf(specTable('T-076'), 'EP-23').cells.join(' '))
    expect(ep23).toContain('`Search Panel`（`U-64`）')
    expect(ep23).toContain('描かない')
    expect(ep23).toContain(EP_23_NOT_DRAWN)
    expect(ep23).toContain(EP_23_NO_ROOM)
  })
})

test.describe(`SK-24 -- ${SK_24_DOES}`, () => {
  test(`opens the panel and puts the focus in its field (SV-2: ${SV_2_FOCUS})`, async () => {
    const one = await stage()
    try {
      expect(await isPanelShown(one.page)).toBe(false)
      await one.page.keyboard.press(SK_24_KEY)
      await settle(one.page)
      expect(await isPanelShown(one.page)).toBe(true)
      expect((await focusedField(one.page)).inPanel).toBe(true)
    } finally {
      await one.close()
    }
  })

  test(`MK-10 -- ${MK_10_CTRL_F}`, async () => {
    const one = await stage()
    try {
      const wasLeftToTheBrowser = await one.page.evaluate(() =>
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'f', code: 'KeyF', ctrlKey: true, bubbles: true, cancelable: true }),
        ),
      )
      expect(wasLeftToTheBrowser, 'dispatchEvent answers false once the default is stopped').toBe(false)
    } finally {
      await one.close()
    }
  })

  // WHY: Ctrl+F is none of the keys IN-5a hands to the field, so it stays SK-24 while typing.
  test(`pressed again with the panel out, returns the focus and selects the word -- ${SV_2_AGAIN}`, async () => {
    const one = await stage()
    try {
      await one.page.keyboard.press(SK_24_KEY)
      await settle(one.page)
      await one.page.keyboard.type('plan')
      await one.page.keyboard.press(SK_24_KEY)
      await settle(one.page)
      const field = await focusedField(one.page)
      expect(field.inPanel).toBe(true)
      expect(field.selected).toBe('plan')
    } finally {
      await one.close()
    }
  })
})

test.describe(`IN-5a -- ${IN_5A_FIELD}`, () => {
  test('f, p, Backspace and Delete are typing in the search field, not shortcuts', async () => {
    const one = await stage()
    try {
      await one.page.keyboard.press(SK_24_KEY)
      await settle(one.page)
      await one.page.keyboard.type('fpx')
      await one.page.keyboard.press('Backspace')
      await one.page.keyboard.press('ArrowLeft')
      await one.page.keyboard.press('Delete')
      await settle(one.page)
      const field = await focusedField(one.page)
      expect(field.inPanel).toBe(true)
      expect(field.value).toBe('f')
    } finally {
      await one.close()
    }
  })
})

test.describe(`IN-4 / SV-14 -- ${SV_14_ESC}`, () => {
  test('Esc with the focus in the panel closes the panel', async () => {
    const one = await stage()
    try {
      await one.page.keyboard.press(SK_24_KEY)
      await settle(one.page)
      expect(await isPanelShown(one.page)).toBe(true)
      await one.page.keyboard.press('Escape')
      await settle(one.page)
      expect(await isPanelShown(one.page)).toBe(false)
    } finally {
      await one.close()
    }
  })
})

test.describe(`EP-23 -- ${EP_23_NOT_DRAWN} ${EP_23_NO_ROOM}`, () => {
  test('the exported picture is the same with the panel out as with it closed', async () => {
    const one = await stage()
    try {
      const closed = await exportedSvg(one.page)
      await one.page.keyboard.press(SK_24_KEY)
      await settle(one.page)
      expect(await isPanelShown(one.page)).toBe(true)
      expect(await exportedSvg(one.page)).toBe(closed)
    } finally {
      await one.close()
    }
  })
})
