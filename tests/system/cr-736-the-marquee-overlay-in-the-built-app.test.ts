// CR-736 on the shipped build, from docs/spec only: the marquee rides an overlay that sits last in Schedule Canvas and takes no point.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { DATE_ZOOM_OUT, pressEntrance, settle, type Stage } from './cr-570-tree-state-stage'
import { stageWith } from './cr-721-stage'
import { specTable, unbroken } from '../contract/spec-table'

const CANVAS = '[data-role="Schedule Canvas"]'
const GROUND = '^(task-group-|ruler-)|^non-working-days$|-mask$'
const SPAN = { width: 150, height: 90 }

interface Point {
  readonly x: number
  readonly y: number
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

const need = (): Browser => {
  if (browser === null) throw new Error('no browser')
  return browser
}

/** @purity non-pure */
async function frames(page: Page, count = 2): Promise<void> {
  for (let one = 0; one < count; one += 1) {
    await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
  }
  await page.waitForTimeout(60)
}

// WHY: a drag starts on empty ground and stays on ground, so nothing under the pointer changes the picture beneath (IF-1).
/** @purity semi-pure-b */
async function emptyGround(page: Page): Promise<Point> {
  const found = await page.evaluate(
    (asked: { canvas: string; ground: string; span: { width: number; height: number } }) => {
      const canvas = document.querySelector(asked.canvas)
      if (canvas === null) return null
      const box = canvas.getBoundingClientRect()
      const ground = new RegExp(asked.ground)
      const isGround = (x: number, y: number): boolean => {
        const hit = document.elementFromPoint(x, y)
        if (hit === null || !canvas.contains(hit) || hit.closest('[data-icon], input, button, select') !== null) return false
        const figure = hit.closest('[data-figure]')
        return figure === null || ground.test(figure.getAttribute('data-figure') ?? '')
      }
      for (let y = box.top + 200; y < box.bottom - asked.span.height - 30; y += 9) {
        for (let x = box.left + 40; x < box.right - asked.span.width - 40; x += 13) {
          const corners: readonly (readonly [number, number])[] = [
            [0, 0],
            [asked.span.width, 0],
            [0, asked.span.height],
            [asked.span.width, asked.span.height],
            [asked.span.width / 2, asked.span.height / 2],
            [asked.span.width / 2, 0],
            [0, asked.span.height / 2],
            [asked.span.width, asked.span.height / 2],
            [asked.span.width / 2, asked.span.height],
          ]
          if (corners.every(([dx, dy]) => isGround(x + (dx as number), y + (dy as number)))) return { x, y }
        }
      }
      return null
    },
    { canvas: CANVAS, ground: GROUND, span: SPAN },
  )
  if (found === null) throw new Error('premise: the large sample leaves some empty ground in Schedule Canvas')
  return found
}

/** @purity non-pure */
async function hold(page: Page, from: Point, to: Point): Promise<void> {
  await page.mouse.move(from.x, from.y)
  await frames(page)
  await page.mouse.down()
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 })
  await page.mouse.move(to.x, to.y, { steps: 4 })
  await frames(page)
}

interface CanvasReading {
  readonly children: number
  readonly lastIsSvg: boolean
  readonly lastIsFirstSvg: boolean
  readonly lastPointerEvents: string
  readonly lastPosition: string
  readonly lastZoRows: readonly string[]
  readonly firstZoRows: readonly string[]
  readonly lastDashedRects: number
  readonly canvasZoRows: readonly string[]
}

/** @purity semi-pure-b */
async function readCanvas(page: Page): Promise<CanvasReading> {
  return page.evaluate((selector: string) => {
    const canvas = document.querySelector(selector)
    if (canvas === null) throw new Error('no Schedule Canvas')
    const last = canvas.lastElementChild
    const first = canvas.querySelector('svg')
    const rows = (root: Element | null): string[] =>
      Array.from(root?.querySelectorAll('[data-zo]') ?? []).map((one) => one.getAttribute('data-zo') ?? '')
    const style = last === null ? null : getComputedStyle(last)
    return {
      children: canvas.childElementCount,
      lastIsSvg: last?.tagName.toLowerCase() === 'svg' || last?.querySelector('svg') !== null,
      lastIsFirstSvg: last === first,
      lastPointerEvents: style?.pointerEvents ?? '',
      lastPosition: style?.position ?? '',
      lastZoRows: rows(last),
      firstZoRows: rows(first),
      lastDashedRects: last?.querySelectorAll('rect[stroke-dasharray]').length ?? 0,
      canvasZoRows: rows(canvas),
    }
  }, CANVAS)
}

let stage: Stage | null = null

test.beforeEach(async () => {
  stage = await stageWith(need())
})

test.afterEach(async () => {
  await stage?.close()
  stage = null
})

const here = (): Page => {
  if (stage === null) throw new Error('no stage')
  return stage.page
}

const IF_1_ONLY_WHILE_NOT_EMPTY = '重ねの要素は、重ねの絵が空でないあいだだけ置き、空になったら外すこと（MUST）'
const IF_1_LAST_CHILD = '置くときは Schedule Canvas の宿主の最後の子とし、position:absolute で下の絵と同じ左上に載せること（MUST）'

test.describe('CR-736 the manuscript these cases are driven by', () => {
  test('T-065 IF-1 puts the overlay in front inside Schedule Canvas, takes no point, and writes nothing twice', () => {
    const row = specTable('T-065').rows.find((one) => one.id === 'IF-1')
    const text = unbroken((row?.cells ?? []).join(' ')).replace(/`/g, '')
    expect(text).toContain('Schedule Canvas の中で下の絵の手前に載せること（MUST）')
    expect(text).toContain('重ねの絵は点を受けない')
    expect(text).toContain('渡された文字列が前に載せたものと同じなら画面を書き換えないこと（MUST）')
  })

  test('T-065 IF-1 (a)-(c) keeps the overlay element only while it is not empty, as the last child, absolute, and called only on a change', () => {
    const row = specTable('T-065').rows.find((one) => one.id === 'IF-1')
    const text = unbroken((row?.cells ?? []).join(' ')).replace(/`/g, '')
    expect(text).toContain(IF_1_ONLY_WHILE_NOT_EMPTY)
    expect(text).toContain(IF_1_LAST_CHILD)
    expect(text).toContain('SingleHtmlShell（CP-25）は重ねの絵の文字列を覚え（初めは空）、前と違うときだけ重ねの口を呼ぶこと（MUST）')
  })
})

test.describe('CR-736 IF-1 in the shipped build', () => {
  test('T-065 IF-1 (b): while a marquee is held the last child of Schedule Canvas is the overlay: ZO-6 only, in front, no pointer', async () => {
    const page = here()
    const from = await emptyGround(page)
    await hold(page, from, { x: from.x + SPAN.width, y: from.y + SPAN.height })
    const held = await readCanvas(page)
    expect(held.lastIsSvg, `table T-065 IF-1: ${IF_1_LAST_CHILD}`).toBe(true)
    expect(held.lastIsFirstSvg, 'the overlay is not the picture beneath').toBe(false)
    expect(held.lastZoRows, 'table T-065 IF-1: the overlay holds ZO-6 only').toEqual(['ZO-6'])
    expect(held.firstZoRows, 'the picture beneath holds no ZO-6').not.toContain('ZO-6')
    expect(held.lastDashedRects, 'table T-023c SL-3: one rectangle is being taken').toBe(1)
    expect(held.lastPointerEvents, 'table T-065 IF-1: 重ねの絵は点を受けない').toBe('none')
    expect(held.lastPosition, `table T-065 IF-1: ${IF_1_LAST_CHILD}`).toBe('absolute')
    await page.mouse.up()
    await settle(page)
  })

  test('T-065 IF-1 (a): on release the rectangle is gone from Schedule Canvas, and what is left in front takes no point', async () => {
    const page = here()
    const from = await emptyGround(page)
    await hold(page, from, { x: from.x + SPAN.width, y: from.y + SPAN.height })
    await page.mouse.up()
    await settle(page)
    const released = await readCanvas(page)
    expect(released.canvasZoRows, `table T-023c SL-3, table T-065 IF-1: ${IF_1_ONLY_WHILE_NOT_EMPTY}`).not.toContain('ZO-6')
    expect(released.lastIsFirstSvg ? 'beneath' : released.lastPointerEvents).toMatch(/^(beneath|none)$/)
  })

  test('IF-9: the part under any point is the same with and without the overlay', async () => {
    const page = here()
    const from = await emptyGround(page)
    const to = { x: from.x + SPAN.width, y: from.y + SPAN.height }
    await hold(page, from, to)
    const answers = await page.evaluate(
      (asked: { canvas: string; from: Point; to: Point }) => {
        const canvas = document.querySelector(asked.canvas)
        const overlay = canvas?.lastElementChild
        if (canvas === null || overlay === null || overlay === undefined) throw new Error('no overlay to take away')
        const points: Point[] = []
        for (let step = 0; step <= 12; step += 1) {
          const share = step / 12
          points.push({ x: asked.from.x + (asked.to.x - asked.from.x) * share, y: asked.from.y })
          points.push({ x: asked.to.x, y: asked.from.y + (asked.to.y - asked.from.y) * share })
          points.push({ x: asked.from.x, y: asked.from.y + (asked.to.y - asked.from.y) * share })
          points.push({ x: asked.from.x + (asked.to.x - asked.from.x) * share, y: asked.to.y })
        }
        const name = (at: Point): string => {
          const hit = document.elementFromPoint(at.x, at.y)
          return hit === null ? '(nothing)' : `${hit.tagName}|${hit.getAttribute('data-figure') ?? ''}|${hit.getAttribute('data-role') ?? ''}|${overlay.contains(hit) ? 'in-overlay' : 'outside'}`
        }
        const withOverlay = points.map(name)
        const shown = (overlay as HTMLElement).style.display
        ;(overlay as HTMLElement).style.display = 'none'
        const without = points.map(name)
        ;(overlay as HTMLElement).style.display = shown
        return { withOverlay, without }
      },
      { canvas: CANVAS, from, to },
    )
    expect(answers.withOverlay.some((one) => one.endsWith('in-overlay')), 'nothing under a point is the overlay').toBe(false)
    expect(answers.withOverlay).toEqual(answers.without)
    await page.mouse.up()
    await settle(page)
  })

  test('T-065 IF-1 (c): while the marquee is dragged only the overlay is rewritten; a held still pointer rewrites nothing', async () => {
    const page = here()
    const from = await emptyGround(page)
    await page.mouse.move(from.x, from.y)
    await frames(page)
    await page.mouse.down()
    await page.mouse.move(from.x + 30, from.y + 20, { steps: 3 })
    await frames(page)
    await page.evaluate((selector: string) => {
      const canvas = document.querySelector(selector) as Element
      const beneath = canvas.querySelector('svg') as Element
      const overlay = canvas.lastElementChild as Element
      const watch = { beneath: 0, overlay: 0, canvas: 0, beneathMoved: 0 }
      const options = { subtree: true, childList: true, attributes: true, characterData: true }
      const w = window as unknown as Record<string, unknown>
      w['grsCr736'] = {
        watch,
        beneath,
        overlay,
        observers: [
          new MutationObserver((records) => (watch.beneath += records.length)),
          new MutationObserver((records) => (watch.overlay += records.length)),
          new MutationObserver((records) => {
            watch.canvas += records.length
            for (const record of records) {
              for (const node of [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)]) if (node === beneath) watch.beneathMoved += 1
            }
          }),
        ],
      }
      const held = w['grsCr736'] as { observers: MutationObserver[] }
      held.observers[0]?.observe(beneath, options)
      held.observers[1]?.observe(overlay, options)
      held.observers[2]?.observe(canvas, { childList: true })
    }, CANVAS)
    for (let step = 1; step <= 8; step += 1) {
      await page.mouse.move(from.x + 30 + step * 12, from.y + 20 + step * 8)
      await frames(page)
    }
    const dragged = await page.evaluate(() => {
      const held = (window as unknown as Record<string, { watch: Record<string, number> }>)['grsCr736']
      return { ...(held?.watch ?? {}) }
    })
    expect(dragged['beneath'], 'table T-065 IF-1: the picture beneath is not rewritten while the marquee moves').toBe(0)
    expect(dragged['beneathMoved'], 'the picture beneath is not taken out of Schedule Canvas and put back').toBe(0)
    expect(dragged['canvas'] ?? 0, 'the overlay is what changes: Schedule Canvas sees it come and go or the overlay is rewritten in place').toBeGreaterThan(0)
    await frames(page, 6)
    const still = await page.evaluate(() => {
      const held = (window as unknown as Record<string, { watch: Record<string, number> }>)['grsCr736']
      return { ...(held?.watch ?? {}) }
    })
    expect(still['canvas'], 'table T-065 IF-1: a same string is not written again').toBe(dragged['canvas'])
    expect(still['overlay']).toBe(dragged['overlay'])
    expect(still['beneath']).toBe(0)
    await page.mouse.up()
    await settle(page)
  })

  test('a new picture beneath leaves the overlay in front: a resize while the marquee is held rewrites the picture, and the overlay follows its size', async () => {
    const page = here()
    const from = await emptyGround(page)
    await hold(page, from, { x: from.x + SPAN.width, y: from.y + SPAN.height })
    const size = (): Promise<{ beneath: string; overlay: string }> =>
      page.evaluate((selector: string) => {
        const canvas = document.querySelector(selector) as Element
        const of = (svg: Element | null): string => `${svg?.getAttribute('width')}x${svg?.getAttribute('height')} ${svg?.getAttribute('viewBox')}`
        return { beneath: of(canvas.querySelector('svg')), overlay: of(canvas.lastElementChild) }
      }, CANVAS)
    const before = await size()
    expect(before.overlay, 'table T-065 IF-1: the overlay has the size of the picture beneath').toBe(before.beneath)
    const viewport = page.viewportSize()
    if (viewport === null) throw new Error('premise: a viewport')
    await page.setViewportSize({ width: viewport.width - 200, height: viewport.height - 120 })
    await frames(page, 6)
    const after = await size()
    expect(after.beneath, 'premise: a resize changes the picture beneath').not.toBe(before.beneath)
    expect(after.overlay, 'the overlay follows the new size').toBe(after.beneath)
    const held = await readCanvas(page)
    expect(held.lastZoRows, 'table T-065 IF-1: the overlay survives a new picture beneath').toEqual(['ZO-6'])
    expect(held.lastIsFirstSvg).toBe(false)
    expect(held.lastPointerEvents).toBe('none')
    expect(held.firstZoRows).not.toContain('ZO-6')
    await page.mouse.up()
    await settle(page)
  })

  test('a zoom through its entrance leaves no rectangle behind, and the next marquee is drawn in the overlay again', async () => {
    const page = here()
    expect(await pressEntrance(page, DATE_ZOOM_OUT), 'IC-12 is on the screen').toBe(true)
    const afterZoom = await readCanvas(page)
    expect(afterZoom.canvasZoRows).not.toContain('ZO-6')
    const from = await emptyGround(page)
    await hold(page, from, { x: from.x + SPAN.width, y: from.y + SPAN.height })
    const held = await readCanvas(page)
    expect(held.lastZoRows).toEqual(['ZO-6'])
    expect(held.lastIsFirstSvg).toBe(false)
    await page.mouse.up()
    await settle(page)
    expect((await readCanvas(page)).canvasZoRows).not.toContain('ZO-6')
  })
})
