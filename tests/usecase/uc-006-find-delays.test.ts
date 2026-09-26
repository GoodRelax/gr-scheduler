// Use-case test for UC-006 (find delays), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, drag, enableAgentApi, figureBox, launch, openByDrop, press, readDocument, readSample, specMismatch, type GrsDocument } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const ERP = 'sample-large-erp-program.ja.xml'

const markerShapes = (page: Page): Promise<Record<string, string>> =>
  page.evaluate(() => {
    const shapes: Record<string, string[]> = {}
    for (const e of document.querySelectorAll('[data-figure$="-marker"]')) {
      const uid = (e.getAttribute('data-figure') ?? '').split('-')[1]!
      ;(shapes[uid] ??= []).push(e.tagName)
    }
    return Object.fromEntries(Object.entries(shapes).map(([k, v]) => [k, v.join('|')]))
  })

type Kind = 'late-running' | 'late-waiting' | 'running' | 'waiting' | 'other'
const kindOf = (task: Record<string, any>, statusDay: number): Kind => {
  const day = (iso: string | null) => (iso ? Date.parse(iso.slice(0, 10) + 'T00:00:00Z') : NaN)
  if (task.milestone) return 'other'
  if (task.actualStart === null) return day(task.start) < statusDay ? 'late-waiting' : 'waiting'
  if (task.actualFinish !== null || task.resumeValid === false || task.resume !== null) return 'other'
  return day(task.finish) < statusDay ? 'late-running' : 'running'
}
const statusDayOf = (doc: GrsDocument): number => Date.parse(String(doc.schedule.project['statusDate']).slice(0, 10) + 'T00:00:00Z')

test('UC-006 find delays (FR-046, FR-014 T-022, FR-013 PM-4 T-021b, FR-047, FR-015 OP-9)', async ({ page }) => {
  specMismatch('UC-006 step 4 / FR-047: no delay count in days is drawn; step 5 / FR-015: the overlaid pre-change plan loads into baselineTasks but IC-4 draws nothing')
  await launch(page)
  await enableAgentApi(page)
  await openByDrop(page, ERP, readSample(ERP))

  await test.step('UC-006 step 1: the viewer places the status date by dragging its line (FR-046, GR-16)', async () => {
    const before = await readDocument(page)
    const line = (await figureBox(page, 'status-line'))!
    await drag(page, { x: line.x, y: line.y + line.h / 2 }, { x: line.x + 60, y: line.y + line.h / 2 })
    const after = await readDocument(page)
    expect(statusDayOf(after)).toBeGreaterThan(statusDayOf(before))
    const moved = (await figureBox(page, 'status-line'))!
    expect(Math.abs(moved.x - (line.x + 60))).toBeLessThan(6)
  })

  await test.step('UC-006 step 2: one unbroken progress line runs from the top to the bottom with vertices off the status line (FR-014, T-022)', async () => {
    if (!(await readDocument(page)).documentSettings.progressLineVisible) await press(page, 'IC-39')
    const lines = page.locator('[data-figure="progress-line"]')
    await expect(lines).toHaveCount(1)
    const points = ((await lines.getAttribute('points')) ?? '').trim().split(/\s+/).map((p) => p.split(',').map(Number))
    const status = (await figureBox(page, 'status-line'))!
    expect(points[0]![1]!).toBeLessThanOrEqual(status.y + 1)
    expect(points.at(-1)![1]!).toBeGreaterThanOrEqual(status.y + status.h - 1)
    for (let i = 1; i < points.length; i++) expect(points[i]![1]!).toBeGreaterThanOrEqual(points[i - 1]![1]!)
    expect(points.some((p) => Math.abs(p[0]! - status.x) > 2)).toBe(true)
  })

  await test.step('UC-006 step 3: late tasks carry the delay mark, not-started ones included (FR-013 PM-4, T-021b DL-1 DL-2)', async () => {
    if (!(await readDocument(page)).documentSettings.progressMarkerVisible) await press(page, 'IC-40')
    const doc = await readDocument(page)
    const statusDay = statusDayOf(doc)
    const shapes = await markerShapes(page)
    const byKind: Record<Kind, Set<string>> = { 'late-running': new Set(), 'late-waiting': new Set(), running: new Set(), waiting: new Set(), other: new Set() }
    for (const task of doc.schedule.tasks) {
      const shape = shapes[String(task.uid)]
      if (shape) byKind[kindOf(task, statusDay)].add(shape)
    }
    expect(byKind['late-running'].size).toBe(1)
    expect(byKind['late-waiting'].size).toBe(1)
    const lateShape = [...byKind['late-running']][0]!
    expect([...byKind['late-waiting']][0]).toBe(lateShape)
    for (const shape of byKind.running) expect(shape).not.toBe(lateShape)
    for (const shape of byKind.waiting) expect(shape).not.toBe(lateShape)
  })

  await test.step('UC-006 step 4: the viewer reads how many working days a late task is behind (FR-047, T-021b, OC-8)', async () => {
    const doc = await readDocument(page)
    const statusDay = statusDayOf(doc)
    const late = doc.schedule.tasks.find((t) => kindOf(t, statusDay) === 'late-running')!
    const drawn = await page.locator('[data-figure^="task-' + late.uid + '-"]').allTextContents()
    const name = String(late.name)
    expect.soft(drawn.some((text) => text !== name && /\d/.test(text) && !text.includes(':'))).toBe(true)
  })

  await test.step('UC-006 step 5: the pre-change plan is overlaid to see how the plan moved (FR-015, OP-3 IC-73, OP-9, IC-4)', async () => {
    const before = await page.locator('[data-figure]').count()
    await openByDrop(page, ERP, readSample(ERP), 'IC-73')
    const doc = await readDocument(page)
    expect((doc.schedule['baselineTasks'] as unknown[]).length).toBeGreaterThan(0)
    if (!doc.documentSettings.baselineVisible) await press(page, 'IC-4')
    expect((await readDocument(page)).documentSettings.baselineVisible).toBe(true)
    expect.soft(await page.locator('[data-figure]').count()).toBeGreaterThan(before)
  })
})
