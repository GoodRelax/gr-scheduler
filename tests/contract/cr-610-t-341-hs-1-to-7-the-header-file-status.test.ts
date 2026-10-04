// CR-610 spec-only tests: table T-341 -- the two lines of the header's file status, read off the drawn DOM.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { FakeElement } from '../fixtures/fake-browser'
import { oneByRole, styleMap } from '../fixtures/fake-browser'
import {
  OPEN_CHOOSER,
  REQUIREMENTS,
  jsonBytes,
  partName,
  replaceWith,
  settingNumber,
  shellStage,
  sizeSpelling,
  stampSpelling,
  here,
  templateDocument,
  there,
  type ShellStage,
} from './cr-610-file-flow-stage'
import { specTable } from './spec-table'

const T_341 = specTable('T-341')
const NAME = partName('U-58')
const SAVED_AT = partName('U-59')
const S_235 = settingNumber('S-235')
const S_449 = settingNumber('S-449')
const S_210 = settingNumber('S-210')

const LOWER_LINE = /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) {2}(\d+\.\d\[kB\])$/
const OPENED_STAMP = '2026-05-04T03:02:01Z'
const TO_THE_TABLE =
  '名前と時刻の 2 段の並べ方、時刻と大きさの綴り、字の大きさ、`App Header` の高さとの関係は、表 T-341 に従うこと（MUST）'

const lowerText = (built: ShellStage): string => oneByRole(built.domRoot(), SAVED_AT).textContent
const upperText = (built: ShellStage): string => oneByRole(built.domRoot(), NAME).textContent

async function savedOnce(document: Document = templateDocument()): Promise<{ built: ShellStage; bytes: number }> {
  const built = await shellStage({ document, dom: true })
  const chosen = built.file('chosen.json', new Uint8Array(0))
  built.browser.toSave.push(chosen)
  await built.save()
  expect(built.written, 'precondition: SK-11 wrote nothing').toEqual(['chosen.json'])
  await built.repaint()
  return { built, bytes: chosen.bytes().byteLength }
}

function factorUpTo(node: FakeElement, top: FakeElement): number | null {
  let factor = 1
  let at: FakeElement | null = node
  while (at !== null) {
    const written = (styleMap(at).get('font-size') ?? '').trim().toLowerCase()
    if (written !== '') {
      const asEm = /^([\d.]+)em$/.exec(written)
      const asPercent = /^([\d.]+)%$/.exec(written)
      if (asEm !== null) factor *= Number.parseFloat(asEm[1] as string)
      else if (asPercent !== null) factor *= Number.parseFloat(asPercent[1] as string) / 100
      else return null
    }
    if (at === top) return factor
    at = at.parentNode
  }
  return factor
}

const openedWithStamp = (stamp: string | null): unknown => {
  const document = JSON.parse(JSON.stringify(there())) as Record<string, any>
  document['documentStamp']['fileSavedUtc'] = stamp
  return document
}

describe('T-341 / FR-101 / T-206 -- the manuscript still says it', () => {
  it('T-341 holds HS-1 to HS-11 and FR-101 hands the two lines to it', () => {
    expect(T_341.rows.map((one) => one.id)).toEqual(
      ['HS-1', 'HS-2', 'HS-3', 'HS-4', 'HS-5', 'HS-6', 'HS-7', 'HS-8', 'HS-9', 'HS-10', 'HS-11'],
    )
    expect(REQUIREMENTS).toContain(TO_THE_TABLE)
  })

  it('HS-7: S-449 sizes the upper line, S-210 the lower, and S-210 is not larger than S-449', () => {
    expect(S_449).toBe(1.125)
    expect(S_210).toBe(0.9375)
    expect(S_210).toBeLessThan(S_449)
  })
})

describe('HS-1 / HS-2 / HS-3 / HS-4 -- after one save', () => {
  it('HS-1: the name stands on the upper line, above the time', async () => {
    const { built } = await savedOnce()
    expect(upperText(built)).toBe('chosen.json')
    const all: FakeElement[] = []
    const walk = (node: FakeElement): void => {
      all.push(node)
      for (const child of node.children) walk(child as FakeElement)
    }
    walk(built.domRoot())
    expect(all.indexOf(oneByRole(built.domRoot(), NAME))).toBeLessThan(all.indexOf(oneByRole(built.domRoot(), SAVED_AT)))
  })

  it('HS-1: the lower line is the time, two spaces, then the size', async () => {
    const { built } = await savedOnce()
    expect(lowerText(built), 'HS-1 / HS-2 / HS-3: the lower line is not `yyyy/mm/dd hh:mm:ss  n.n[kB]`').toMatch(
      LOWER_LINE,
    )
  })

  it('HS-2: the time is yyyy/mm/dd hh:mm:ss of the moment written, in the local time of the reader', async () => {
    const { built } = await savedOnce()
    const stored = built.last().appHeaderItems.fileSavedAt
    expect(stored, 'precondition: the save recorded no moment').not.toBeNull()
    expect(LOWER_LINE.exec(lowerText(built))?.[1]).toBe(stampSpelling(stored as string))
  })

  it('HS-3 / HS-4: the size is the bytes written divided by 1000, rounded half up to one decimal, then [kB]', async () => {
    const { built, bytes } = await savedOnce()
    expect(bytes, 'precondition: the template is large enough to tell 1000 from 1024').toBeGreaterThan(100000)
    expect(LOWER_LINE.exec(lowerText(built))?.[2]).toBe(sizeSpelling(bytes))
  })

  it('HS-3 (MUST NOT): the size is not divided by 1024 and carries no digit separator', async () => {
    const { built, bytes } = await savedOnce()
    const kibi = `${(Math.round(bytes / 102.4) / 10).toFixed(1)}[kB]`
    expect(lowerText(built)).not.toContain(kibi)
    expect(lowerText(built)).not.toMatch(/\d,\d/)
    expect(lowerText(built)).toContain('[kB]')
  })
})

describe('HS-5 -- nothing written yet', () => {
  it('HS-5: the lower line holds the never-saved words alone and no size', async () => {
    const built = await shellStage({ dom: true })
    await built.repaint()
    const words = built.last().appHeaderItems.fileNeverSavedText
    expect(words.length).toBeGreaterThan(0)
    expect(lowerText(built).trim()).toBe(words)
    expect(lowerText(built)).not.toContain('[kB]')
  })
})

describe('HS-6 -- after a replace-open, before any write to that file', () => {
  it('HS-6: the upper line names the file read (U-58)', async () => {
    const built = await shellStage({ dom: true })
    await replaceWith(built, built.file('theirs.json', jsonBytes(openedWithStamp(OPENED_STAMP))))
    await built.repaint()
    expect(built.last().appHeaderItems.openedFileName).toBe('theirs.json')
    expect(upperText(built)).toBe('theirs.json')
  })

  it('HS-6: the lower line is AT-140 of the opened document and the bytes read', async () => {
    const built = await shellStage({ dom: true })
    const bytes = jsonBytes(openedWithStamp(OPENED_STAMP))
    await replaceWith(built, built.file('theirs.json', bytes))
    await built.repaint()
    expect(built.last().appHeaderItems.fileSavedAt).toBe(OPENED_STAMP)
    expect(lowerText(built)).toBe(`${stampSpelling(OPENED_STAMP)}  ${sizeSpelling(bytes.byteLength)}`)
  })

  it('HS-6 -> HS-5: an opened document whose AT-140 is empty shows the never-saved words and no size', async () => {
    const built = await shellStage({ dom: true })
    await replaceWith(built, built.file('theirs.json', jsonBytes(openedWithStamp(null))))
    await built.repaint()
    expect(built.last().appHeaderItems.openedFileName).toBe('theirs.json')
    expect(built.last().appHeaderItems.fileSavedAt).toBeNull()
    expect(lowerText(built)).not.toContain('[kB]')
  })

  it('HS-6 (MUST): a merge (IC-72) changes neither line', async () => {
    const { built } = await savedOnce(here())
    const upper = upperText(built)
    const lower = lowerText(built)
    await built.open(built.file('theirs.json', jsonBytes(openedWithStamp(OPENED_STAMP))))
    await built.press(OPEN_CHOOSER(), 'IC-72')
    expect(built.last().openModal, 'precondition: IC-72 did not land').toBeNull()
    await built.repaint()
    expect(upperText(built)).toBe(upper)
    expect(lowerText(built)).toBe(lower)
  })
})

describe('HS-7 -- the size of the two lines', () => {
  it('HS-7: the upper line is the host ground times S-235 times S-449', async () => {
    const { built } = await savedOnce()
    const factor = factorUpTo(oneByRole(built.domRoot(), NAME), built.dom?.mount as FakeElement)
    expect(factor, 'HS-7: the name is sized in px or by no coefficient').not.toBeNull()
    expect(factor as number).toBeCloseTo(S_235 * S_449, 3)
  })

  it('HS-7: the lower line is the host ground times S-235 times S-210', async () => {
    const { built } = await savedOnce()
    const factor = factorUpTo(oneByRole(built.domRoot(), SAVED_AT), built.dom?.mount as FakeElement)
    expect(factor, 'HS-7: the time is sized in px or by no coefficient').not.toBeNull()
    expect(factor as number).toBeCloseTo(S_235 * S_210, 3)
  })

  it('HS-7 (MUST NOT): the lower line is not larger than the upper', async () => {
    const { built } = await savedOnce()
    const top = built.dom?.mount as FakeElement
    const upper = factorUpTo(oneByRole(built.domRoot(), NAME), top) as number
    const lower = factorUpTo(oneByRole(built.domRoot(), SAVED_AT), top) as number
    expect(lower).toBeLessThanOrEqual(upper)
  })
})
