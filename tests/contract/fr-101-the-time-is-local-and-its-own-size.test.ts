// Contract tests: the App Header moment is shown in local time and sized by a coefficient.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  oneByRole,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const THE_LOCAL_MUST = '`GRS` は、画面に出す時刻を、読む人のローカル時刻とすること。'
const THE_SIZE_MUST = '`GRS` は、更新日時の字の大きさを `_assets/tbl-settings.md` の 表 T-206 の `S-210` が定める係数で決めること。'

function settledName(specTableRowId: string): string {
  const table = specTable('T-103')
  const COLUMN = '確定名（英）'
  if (!table.headings.includes(COLUMN)) {
    throw new Error(`table T-103 no longer has a ${COLUMN} column: ${table.headings.join(' | ')}`)
  }
  const row = table.rows.find((one) => one.id === specTableRowId)
  if (row === undefined) throw new Error(`table T-103 no longer has row ${specTableRowId}`)
  return bare(row.by[COLUMN] ?? '')
}

const U_59 = settledName('U-59')

const U_31 = settledName('U-31')

function cellOf(specTableRowId: string): string {
  const table = specTable('T-206')
  const COLUMN = '既定'
  const row = table.rows.find((one) => one.id === specTableRowId)
  if (row === undefined) throw new Error(`table T-206 no longer has row ${specTableRowId}`)
  const held = row.by[COLUMN]
  if (held === undefined) {
    throw new Error(`table T-206 no longer has a ${COLUMN} column: ${table.headings.join(' | ')}`)
  }
  return bare(held)
}

function numberIn(written: string, where: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(written)
  if (found === null) throw new Error(`${where} states no number: ${written}`)
  return Number.parseFloat(found[0] as string)
}

const S_210_CELL = cellOf('S-210')

const S_210 = numberIn(S_210_CELL, "table T-206's S-210")

const S_235 = numberIn(cellOf('S-235'), "table T-206's S-235")

const HS_7_CHROME_FIRST =
  '宿主の地の文字に `_assets/tbl-settings.md` の 表 T-206 の `S-235` を掛け（`FR-051`）、上段にはさらに同表の `S-449` を、下段には本要求の上の段のとおり `S-210` を掛けること（MUST）'

// Why: stored in UTC near a day boundary, so a zone either side moves the date as well as the clock
// and a case cannot pass on the digits of the day alone.
const STORED_AT = '2026-08-29T22:30:15Z'

// Why: two zones on opposite sides of UTC, so no fixed correction satisfies both;
// neither is a value of the spec, which names no zone.
const ZONES = ['Asia/Tokyo', 'America/Denver'] as const

const HOST_ZONE = process.env.TZ

afterAll(() => {
  if (HOST_ZONE === undefined) delete process.env.TZ
  else process.env.TZ = HOST_ZONE
})

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  tooltips: [],
}

// Why: U-58 makes the name and the Project Title different values, so all three words are unlike.
const HEADER_WITH_A_SAVED_FILE: AppHeaderItems = {
  ...EMPTY_HEADER,
  documentTitle: 'DocumentTitleHere',
  openedFileName: 'OpenedFileNameHere.grs.json',
  fileSavedAt: STORED_AT,
  fileSavedByteLength: 48213,
  fileNeverSavedText: 'FileNeverSavedHere',
}

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

// Why: the App Header must measure to something, or the dimension of BO-1 stays unsettled.
const HEADER_HEIGHT = { 'App Header': 37 }

function drawn(): { readonly header: FakeElement; readonly moment: FakeElement } {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({
    ...EMPTY_VIEW,
    appHeaderItems: HEADER_WITH_A_SAVED_FILE,
  })
  const root = built.root()
  return { header: oneByRole(root, U_31), moment: oneByRole(root, U_59) }
}

// Summary: the helper returns the em/% product from the node up to the top, or null where a fixed length is stated.
function scaleUpTo(
  node: FakeElement,
  top: FakeElement,
): { readonly factor: number | null; readonly stated: string[] } {
  let factor = 1
  const stated: string[] = []
  let at: FakeElement | null = node
  let reachedTop = false
  while (at !== null) {
    const written = (styleMap(at).get('font-size') ?? '').trim().toLowerCase()
    if (written !== '') {
      stated.push(`${at.tagName}[${at.getAttribute('data-role') ?? '-'}] font-size: ${written}`)
      const asEm = /^([\d.]+)em$/.exec(written)
      const asPercent = /^([\d.]+)%$/.exec(written)
      if (asEm !== null) factor *= Number.parseFloat(asEm[1] as string)
      else if (asPercent !== null) factor *= Number.parseFloat(asPercent[1] as string) / 100
      else return { factor: null, stated }
    }
    if (at === top) {
      reachedTop = true
      break
    }
    at = at.parentNode
  }
  if (!reachedTop) throw new Error('the moment does not stand inside the App Header at all')
  return { factor, stated }
}

// Why: spelling-tolerant on purpose: FR-101 hands the spelling to the host as IN-2 does the cursor's,
// so only the instant the six numbers name, read in the local zone, is asked.
function momentNamedLocally(written: string): number | null {
  const found = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+(\d{1,2})\D+(\d{2})(?:\D+(\d{2}))?/.exec(written)
  if (found === null) return null
  const [, year, month, day, hour, minute, second] = found
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? '0'),
  ).getTime()
}

const utcClockOf = (iso: string): string => new Date(iso).toISOString().slice(11, 19)

function localClockOf(iso: string): string {
  const at = new Date(iso)
  const two = (one: number): string => String(one).padStart(2, '0')
  return `${two(at.getHours())}:${two(at.getMinutes())}:${two(at.getSeconds())}`
}

// Spec: FR-101, S-210, HS-7, IMPS-992
describe('the manuscripts still say what these cases read', () => {
  it('⭐ FR-101 still puts the moment in local time and sizes it by S-210', () => {
    // Why: without this, a requirement rewritten from under these cases leaves them passing on nothing.
    expect(REQUIREMENTS, 'FR-101 no longer makes the shown time local').toContain(THE_LOCAL_MUST)
    expect(REQUIREMENTS, 'FR-101 no longer sizes the moment by S-210').toContain(THE_SIZE_MUST)
    expect(REQUIREMENTS, 'HS-7 no longer multiplies S-235 in first').toContain(HS_7_CHROME_FIRST)
    expect(REQUIREMENTS, 'FR-101 no longer forbids UTC on the screen').toContain(
      '`GRS` は、画面に UTC をそのまま出さないこと。',
    )
  })

  it('⭐ S-210 is a coefficient and states no px of its own', () => {
    expect(S_210_CELL, 'S-210 has grown a px').not.toContain('px')
    expect(S_210, 'S-210 is a coefficient between 0 and 1').toBeGreaterThan(0)
    expect(S_210).toBeLessThan(1)
  })

  it('⭐ the settled names are still the ones the cases look for', () => {
    expect(U_59).toBe('File Saved At')
    expect(U_31).toBe('App Header')
  })
})

// Spec: FR-101, S-210, NFR-007
describe('FR-101 (MUST / MUST NOT) -- the moment is sized by S-210 and not by px', () => {
  it('⛔ MUST: the moment ends up `S-210` of the size the host gives', () => {
    // Why: asked as the product along the chain up to the App Header, because a font size inherits
    // and no row says which box states it.
    const { header, moment } = drawn()
    const { factor, stated } = scaleUpTo(moment, header)

    expect(factor, `stated: ${stated.join(' <- ') || 'nothing'}`).not.toBeNull()
    expect(factor as number, `stated: ${stated.join(' <- ') || 'nothing'} -- ${HS_7_CHROME_FIRST}`).toBeCloseTo(
      S_235 * S_210,
      6,
    )
  })

  it('⛔ MUST NOT: no size on that chain is held as px', () => {
    // Why: a px anywhere on the chain pins the moment to a length, whichever box states it.
    const { header, moment } = drawn()
    const { stated } = scaleUpTo(moment, header)

    expect(
      stated.filter((one) => /\d\s*(px|pt|cm|mm|in|pc)\b/.test(one)),
      whatWasDrawn(header),
    ).toEqual([])
  })
})

// Spec: FR-101, U-59
describe("FR-101 (MUST / MUST NOT) -- the moment is the reader's local time", () => {
  for (const zone of ZONES) {
    it(`⛔ MUST: names the stored instant on a clock in ${zone}`, () => {
      process.env.TZ = zone
      const offset = new Date(STORED_AT).getTimezoneOffset()
      // Why: at an offset of zero, local and UTC read the same and the claim below is empty.
      expect(offset, `${zone} is not the same clock as UTC on this host`).not.toBe(0)

      const { moment } = drawn()
      const shown = moment.textContent

      const named = momentNamedLocally(shown)
      expect(named, `${zone}: the moment drawn no digits to read: ${JSON.stringify(shown)}`)
        .not.toBeNull()
      expect(named as number, `${zone}: drew ${JSON.stringify(shown)} for ${STORED_AT}`).toBe(
        Date.parse(STORED_AT),
      )
    })

    it(`⛔ MUST NOT: draws no UTC reading of it in ${zone}`, () => {
      process.env.TZ = zone
      expect(new Date(STORED_AT).getTimezoneOffset()).not.toBe(0)

      const { moment } = drawn()
      const shown = moment.textContent

      expect(shown, `${zone}: the stored spelling itself is on the screen`).not.toContain(STORED_AT)
      expect(shown, `${zone}: the UTC clock is on the screen`).not.toContain(utcClockOf(STORED_AT))
      expect(shown, `${zone}: the reader's own clock is what is drawn`).toContain(
        localClockOf(STORED_AT),
      )
    })
  }
})
