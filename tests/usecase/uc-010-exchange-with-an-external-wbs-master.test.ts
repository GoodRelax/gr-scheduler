// Use-case test for UC-010 (exchange with an external WBS master), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, dropFile, enableAgentApi, figureBox, icon, launch, press, readDocument, readSample, savedFiles, settle, specMismatch } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const ERP = 'sample-large-erp-program.ja.xml'
const EDITED_UID = 2
const EDITED_NAME = 'Renamed in GRS'

// see T-228
const mspdiDifferences = (page: Page, left: string, right: string, namespaceBlind = false): Promise<string[]> =>
  page.evaluate(
    ({ left, right, namespaceBlind }) => {
      const parse = (text: string) => new DOMParser().parseFromString(text, 'application/xml').documentElement
      const duration = /^-?P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
      const leafValue = (text: string): string => {
        const d = text.match(duration)
        if (d && text !== 'P' && text !== 'PT') return 'duration:' + (Number(d[1] ?? 0) * 86400 + Number(d[2] ?? 0) * 3600 + Number(d[3] ?? 0) * 60 + Number(d[4] ?? 0))
        if (/^[+-]?\d+(\.\d+)?$/.test(text)) return 'number:' + Number(text)
        return text
      }
      const out: string[] = []
      const walk = (a: Element, b: Element, path: string): void => {
        if (out.length > 2000) return
        const kidsA = [...a.children]
        const kidsB = [...b.children]
        if (kidsA.length === 0 && kidsB.length === 0) {
          if (leafValue(a.textContent ?? '') !== leafValue(b.textContent ?? '')) out.push(path + ' = ' + a.textContent + ' | ' + b.textContent)
          return
        }
        const group = (kids: Element[]) => {
          const byName = new Map<string, Element[]>()
          for (const k of kids) {
            const key = (namespaceBlind ? '' : k.namespaceURI ?? '') + ' ' + k.localName
            byName.set(key, [...(byName.get(key) ?? []), k])
          }
          return byName
        }
        const ga = group(kidsA)
        const gb = group(kidsB)
        for (const name of new Set([...ga.keys(), ...gb.keys()])) {
          const la = ga.get(name) ?? []
          const lb = gb.get(name) ?? []
          if (la.length !== lb.length) out.push(path + '/' + name.split(' ')[1] + ' count ' + la.length + ' | ' + lb.length)
          for (let i = 0; i < Math.min(la.length, lb.length); i++) walk(la[i]!, lb[i]!, path + '/' + name.split(' ')[1] + '[' + i + ']')
        }
      }
      walk(parse(left), parse(right), '')
      return out
    },
    { left, right, namespaceBlind },
  )

const exportMspdiByUi = async (page: Page): Promise<string> => {
  const before = (await savedFiles(page)).length
  await press(page, 'IC-2')
  await page.click('[data-role="Export Chooser"] [data-format="IO-1"]')
  await expect.poll(async () => (await savedFiles(page)).length).toBe(before + 1)
  return (await savedFiles(page))[before]!.text
}

test('UC-010 exchange with an external WBS master (FR-087 OP-3 OP-5, FR-023, FR-021 T-228, T-053)', async ({ page }) => {
  test.setTimeout(120000)
  specMismatch('UC-010 extension 2a / FR-023, OP-5: a truncated MSPDI file dropped on the schedule is dropped silently, with no notice of where it failed; step 6 / FR-021 T-228 NR-3: the written file moves every element to the namespace http://schemas.microsoft.com/project/2007 while the input used http://schemas.microsoft.com/project, and a Stop element is added to tasks that had none')
  await launch(page)
  await enableAgentApi(page)
  const original = readSample(ERP)
  let unedited: string[] = []

  await test.step('UC-010 extension 2a: a broken file is not taken in and the place it failed is told (FR-023, OP-5)', async () => {
    const before = await readDocument(page)
    await page.evaluate((text) => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([text], 'broken.xml'))
      const target = document.querySelector('[data-role="Schedule Canvas"]') as Element
      for (const type of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }))
    }, original.slice(0, Math.floor(original.length / 2)))
    await settle(page)
    await expect(page.locator('[data-role="Open Chooser"]')).toHaveCount(0)
    await expect.soft(page.locator('[data-role="Notification Area"]')).not.toHaveText('')
    expect((await readDocument(page)).schedule.tasks.length).toBe(before.schedule.tasks.length)
    await page.keyboard.press('Escape')
    await settle(page)
  })

  await test.step('UC-010 step 1: the author opens an MSPDI file (FR-087 OP-2)', async () => {
    await dropFile(page, ERP, original)
  })

  await test.step('UC-010 step 3: GRS asks whether to replace or merge, and the author picks replace (OP-3, IC-71, IC-72)', async () => {
    await expect(page.locator(icon('IC-71', '[data-role="Open Chooser"]'))).toHaveCount(1)
    await expect(page.locator(icon('IC-72', '[data-role="Open Chooser"]'))).toHaveCount(1)
    await page.click(icon('IC-71', '[data-role="Open Chooser"]'))
    await page.waitForTimeout(200)
    if (await page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]').count()) await page.click('[data-role="Confirmation"] [data-confirmation-answer="proceed"]')
    await settle(page)
  })

  await test.step('UC-010 step 2: the input was checked, and items GRS does not use are held as they were (FR-023, T-053)', async () => {
    const doc = await readDocument(page)
    expect(doc.schedule.tasks.length).toBeGreaterThan(100)
    expect(doc.schedule.tasks.some((t) => Object.keys(t.carry ?? {}).length > 0 || (t.carryElements ?? []).length > 0)).toBe(true)
  })

  await test.step('UC-010 step 6 (no edit): writing back without an edit gives the same file after normalisation (FR-021, T-228)', async () => {
    const written = await exportMspdiByUi(page)
    unedited = await mspdiDifferences(page, original, written, true)
    expect.soft(unedited).toEqual([])
    expect.soft(await mspdiDifferences(page, original, written)).toEqual([])
  })

  await test.step('UC-010 step 4: the author edits the schedule (MK-13, PR-1)', async () => {
    await press(page, 'IC-7')
    const plan = (await figureBox(page, 'task-' + EDITED_UID + '-plan'))!
    await page.mouse.dblclick(plan.x + Math.min(plan.w / 2, 20), plan.y + plan.h / 2)
    await settle(page)
    await page.keyboard.press('Control+A')
    await page.keyboard.type(EDITED_NAME)
    await page.keyboard.press('Enter')
    await settle(page)
    expect((await readDocument(page)).schedule.tasks.find((t) => t.uid === EDITED_UID)!.name).toBe(EDITED_NAME)
  })

  await test.step('UC-010 steps 5-6: the author writes MSPDI and the held items come back around the edit (FR-021, FR-057)', async () => {
    const written = await exportMspdiByUi(page)
    const differences = (await mspdiDifferences(page, original, written, true)).filter((line) => !unedited.includes(line))
    expect(differences).toHaveLength(1)
    expect(differences[0]).toMatch(/\/Name\[0\] = .* \| Renamed in GRS$/)
  })
})
