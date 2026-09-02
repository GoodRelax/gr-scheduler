// FR-101's two rules about the moment in the `App Header`: it is shown in the
// READER'S local time, and its text is sized by a COEFFICIENT rather than by px.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062, published as PI-38 of table T-064). ⭐ IT IS THE RIGHT
// SIDE FOR BOTH. FR-101 hands the spelling of the moment to the host --
// 「⚠️ **時刻の綴りそのものは本書が定めない** —— **読む人の暗黙の綴りに従うのが
// この問いに合うからであり、表 T-028 の `IN-2` がカーソルの綴りを宿主に渡している
// のと同じ立場である。**」 -- and the host is reached at this seam and nowhere
// inside it (LY-5 of table T-060).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to, quoted
// ---------------------------------------------------------------------------
//
//   FR-101 「**画面に出す時刻は、読む人のローカル時刻とすること（MUST）。保管は
//          UTC のままとすること（MUST）**（利用者の指示 2026-08-27）—— **保管の綴り
//          は 図 F-011 の `AT-127` が持ち、本要求は動かさない。**⛔ **画面に UTC を
//          そのまま出してはならない（MUST NOT）** —— **書いたのが何時かを読むための
//          時刻であり、読む人の時計と違う時刻はその問いに答えていない。**」
//   FR-101 「**更新日時の字の大きさは `_assets/tbl-settings.md` の 表 T-206 の
//          `S-210` が定める係数で決めること（MUST）。px で持ってはならない（MUST
//          NOT）**（`NFR-007` の WCAG 1.4.4）。」
//   S-210  表 T-206:「ヘッダーの更新日時の文字の大きさの係数（`FR-101`）」, ⛔
//          「**px で持たない理由も、掛ける相手も `S-203` と同じである。**」 -- and
//          `S-203` says its multiplicand is 「宿主の地の文字」, the size the host
//          gives, NOT `fontScaleSizes`.
//   U-59   表 T-103, `File Saved At` -- the settled name W-4 of table T-006a
//          (MUST) carries into the DOM as a `data-role`.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above, and tests/ for the shared
// fake browser. ⛔ NO `src/` FILE WAS READ -- not how the moment is spelled, not
// which node carries the size. The instant and the two time zones below are this
// file's own and name nothing in the manuscript.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT THESE CASES DO AND DO NOT CLAIM
// ---------------------------------------------------------------------------
//
//   1. NO SPELLING IS ASSERTED. FR-101 says in as many words that the spelling
//      is the host's, so the case below reads whatever digits are drawn and asks
//      only WHICH MOMENT they name when read in the reader's own zone. A tool
//      that spelled it any other way passes, as it must.
//   2. THE SIZE IS ASKED AS A PRODUCT ALONG THE CHAIN, not of one node. Nothing
//      in docs/spec says which box states the size, and a font size inherits --
//      so what the rule can be asked of is the size the moment ENDS UP with
//      relative to the host's own, which is that product.
//   3. ⚠️ WHAT THE FILE NAME IS SIZED AT IS NOT ASSERTED, though `S-210`'s
//      remark does say 「⚠️ **ファイルの名前には掛けない**」. That sentence names
//      what the ROW governs; it is not written as a MUST NOT about the name's
//      size, and no other row gives the name a size at all. ⛔ A case demanding
//      one would be this file choosing it. REPORTED, not asserted.
//   4. NOTHING IS ASSERTED ABOUT WHERE THE TWO STAND. FR-101's 「名前を時刻の上に
//      置くこと（MUST）」 is already driven by
//      tests/unit/fr-101-the-name-stands-above-the-time.test.ts.

import { readFileSync } from 'node:fs'
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
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscripts, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** ⛔ The two sentences this file rests on, read rather than trusted. */
const THE_LOCAL_MUST = '画面に出す時刻は、読む人のローカル時刻とすること（MUST）'
const THE_SIZE_MUST = '表 T-206 の `S-210` が定める係数で決めること（MUST）'

/** The settled name one row of table T-103 gives, which reaches the DOM as `data-role`. */
function settledName(rowId: string): string {
  const table = specTable('T-103')
  const COLUMN = '確定名（英）'
  if (!table.headings.includes(COLUMN)) {
    throw new Error(`table T-103 no longer has a ${COLUMN} column: ${table.headings.join(' | ')}`)
  }
  const row = table.rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-103 no longer has row ${rowId}`)
  return bare(row.by[COLUMN] ?? '')
}

/** U-59 -- the moment the open file was last written to. */
const U_59 = settledName('U-59')

/** U-31 -- the surface it stands on. */
const U_31 = settledName('U-31')

/** The 既定 cell of one row of table T-206, as the table writes it. */
function cellOf(rowId: string): string {
  const table = specTable('T-206')
  const COLUMN = '既定'
  const row = table.rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-206 no longer has row ${rowId}`)
  const held = row.by[COLUMN]
  if (held === undefined) {
    throw new Error(`table T-206 no longer has a ${COLUMN} column: ${table.headings.join(' | ')}`)
  }
  return bare(held)
}

/** The first number a cell states, however the cell decorates it. */
function numberIn(written: string, where: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(written)
  if (found === null) throw new Error(`${where} states no number: ${written}`)
  return Number.parseFloat(found[0] as string)
}

const S_210_CELL = cellOf('S-210')

/** `S-210` -- the coefficient FR-101 makes a MUST. */
const S_210 = numberIn(S_210_CELL, "table T-206's S-210")

// ---------------------------------------------------------------------------
// The description to draw
// ---------------------------------------------------------------------------

/**
 * The moment the file was last written to, spelled the way it is STORED.
 *
 * ⭐ UTC, because FR-101 keeps the storage there --「保管は UTC のままとすること
 * （MUST）」-- and the whole point of the case is that what is SHOWN is not this.
 * ⚠️ The hour is deliberately near a day boundary so that a zone either side of
 * UTC moves the DATE as well as the clock, and a case cannot pass on the digits
 * of the day alone.
 */
const STORED_AT = '2026-08-29T22:30:15Z'

/**
 * Two zones, east and west of UTC.
 *
 * ⭐ TWO, AND ON OPPOSITE SIDES, so that no fixed correction can satisfy both:
 * a tool that added one zone's offset to UTC would answer the other wrongly.
 * ⛔ NEITHER IS A VALUE OF THE SPECIFICATION -- FR-101 says 「読む人のローカル」
 * and names no zone, so these are the reader's environment and this file's own.
 */
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
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

/**
 * ⚠️ The name is not the `Document Title`: U-58 says the two are different
 * values and that differing is normal, so all three words here are unlike.
 */
const HEADER_WITH_A_SAVED_FILE: AppHeaderItems = {
  ...EMPTY_HEADER,
  documentTitle: 'DocumentTitleHere',
  openedFileName: 'OpenedFileNameHere.grs.json',
  fileSavedAt: STORED_AT,
  fileNeverSavedText: 'FileNeverSavedHere',
}

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

/** The App Header measures to something, so BO-1's dimension is settled. */
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

// ---------------------------------------------------------------------------
// Reading the answer back
// ---------------------------------------------------------------------------

/**
 * How much bigger or smaller than the host's own text this node ends up, given
 * the declarations between it and the `App Header`.
 *
 * ⭐ A RATIO AND NOT A LENGTH. `em` and `%` are the two ways a declaration says
 * "this much of what I inherit", and both multiply along the chain; a bare
 * number after `font-size` is not a size at all. ⛔ Anything that resolves to a
 * fixed length comes back `null`, and the case reports it as the px FR-101
 * forbids rather than folding it into a factor.
 */
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

/**
 * The moment the drawn digits name, read in the zone the reader is in.
 *
 * ⭐ SPELLING-TOLERANT ON PURPOSE (point 1 of the head comment): any separators
 * are accepted between the six numbers, and the seconds may be absent. What is
 * asked is only which instant the numbers name once read LOCALLY.
 */
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

/** How the stored instant reads in UTC, which is what MUST NOT be shown. */
const utcClockOf = (iso: string): string => new Date(iso).toISOString().slice(11, 19)

/** How it reads on the reader's clock, computed from the reader's own zone. */
function localClockOf(iso: string): string {
  const at = new Date(iso)
  const two = (one: number): string => String(one).padStart(2, '0')
  return `${two(at.getHours())}:${two(at.getMinutes())}:${two(at.getSeconds())}`
}

// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⭐ FR-101 still puts the moment in local time and sizes it by S-210', () => {
    // ⛔ WITHOUT THIS, A REQUIREMENT REWRITTEN OUT FROM UNDER THESE CASES WOULD
    // LEAVE THEM PASSING ON NOTHING (rule 04 section 2).
    expect(REQUIREMENTS, 'FR-101 no longer makes the shown time local').toContain(THE_LOCAL_MUST)
    expect(REQUIREMENTS, 'FR-101 no longer sizes the moment by S-210').toContain(THE_SIZE_MUST)
    expect(REQUIREMENTS, 'FR-101 no longer forbids UTC on the screen').toContain(
      '画面に UTC をそのまま出してはならない（MUST NOT）',
    )
  })

  it('⭐ S-210 is a coefficient and states no px of its own', () => {
    // `S-210`: ⛔「**px で持たない理由も、掛ける相手も `S-203` と同じである。**」
    expect(S_210_CELL, 'S-210 has grown a px').not.toContain('px')
    expect(S_210, 'S-210 is a coefficient between 0 and 1').toBeGreaterThan(0)
    expect(S_210).toBeLessThan(1)
  })

  it('⭐ the settled names are still the ones the cases look for', () => {
    expect(U_59).toBe('File Saved At')
    expect(U_31).toBe('App Header')
  })
})

describe('FR-101 (MUST / MUST NOT) -- the moment is sized by S-210 and not by px', () => {
  it('⛔ MUST: the moment ends up `S-210` of the size the host gives', () => {
    // FR-101:「**更新日時の字の大きさは …… `S-210` が定める係数で決めること
    // （MUST）**」. ⭐ Asked as the product along the chain from the moment up to
    // the `App Header`, because a font size inherits and no row says which box
    // states it (point 2 of the head comment).
    const { header, moment } = drawn()
    const { factor, stated } = scaleUpTo(moment, header)

    expect(factor, `stated: ${stated.join(' <- ') || 'nothing'}`).not.toBeNull()
    expect(factor as number, `stated: ${stated.join(' <- ') || 'nothing'}`).toBeCloseTo(S_210, 6)
  })

  it('⛔ MUST NOT: no size on that chain is held as px', () => {
    // FR-101:「**px で持ってはならない（MUST NOT）**（`NFR-007` の WCAG 1.4.4）」.
    // ⭐ A px anywhere between the moment and the header pins the moment to a
    // length, whichever box states it -- so the whole chain is read.
    const { header, moment } = drawn()
    const { stated } = scaleUpTo(moment, header)

    expect(
      stated.filter((one) => /\d\s*(px|pt|cm|mm|in|pc)\b/.test(one)),
      whatWasDrawn(header),
    ).toEqual([])
  })
})

describe("FR-101 (MUST / MUST NOT) -- the moment is the reader's local time", () => {
  for (const zone of ZONES) {
    it(`⛔ MUST: names the stored instant on a clock in ${zone}`, () => {
      // FR-101:「**画面に出す時刻は、読む人のローカル時刻とすること（MUST）。保管は
      // UTC のままとすること（MUST）**」.
      process.env.TZ = zone
      const offset = new Date(STORED_AT).getTimezoneOffset()
      // ⛔ WITHOUT THIS THE CASE COULD PASS ON A HOST THAT IGNORED THE ZONE: at
      // an offset of zero, local and UTC are the same reading and the claim
      // below is empty.
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
      // FR-101:「⛔ **画面に UTC をそのまま出してはならない（MUST NOT）**」.
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
