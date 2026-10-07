// Guard cases for DFC-974: a drawn pointer of table T-269 carries its whole picture inside an unquoted url().

import { describe, expect, it } from 'vitest'

import { pointerImageOf, type PointerRow } from '../../src/framework/single-html-shell/pointer-shape'
import { specTable } from '../contract/spec-table'

const FACINGS = ['start', 'end'] as const
const INKS = ['hollow', 'filled'] as const
const SVG_DATA_HEAD = 'data:image/svg+xml,'

// WHY: an unquoted CSS url() ends at a bare quote, parenthesis, whitespace or backslash,
// so none of them may stand inside its body.
const UNQUOTED_URL_BREAKERS = /['"()\s\\]/

const DRAWN_SHAPE = /^url\((?<body>.*)\) (?<x>-?[\d.]+) (?<y>-?[\d.]+), (?<fallback>[a-z-]+)$/

interface DrawnCase {
  readonly name: string
  readonly value: string
}

// see T-269
const drawnCases = (): readonly DrawnCase[] =>
  specTable('T-269').rows.flatMap((row) =>
    FACINGS.flatMap((facing) =>
      INKS.map((ink) => ({
        name: `${row.id} ${facing} ${ink}`,
        value: String(pointerImageOf(row.id as PointerRow, facing, ink) ?? ''),
      })),
    ),
  ).filter((one) => one.value.startsWith('url('))

const pictureOf = (value: string): string => {
  const body = DRAWN_SHAPE.exec(value)?.groups?.['body'] ?? ''
  return decodeURIComponent(body.slice(SVG_DATA_HEAD.length))
}

describe('DFC-974 / FR-106, T-269, IN-2 -- a drawn pointer survives an unquoted url()', () => {
  it('premise: table T-269 has drawn rows, and a picture among them holds quotes and parentheses', () => {
    const pictures = drawnCases().map((one) => pictureOf(one.value))
    expect(pictures.length).toBeGreaterThan(0)
    expect(pictures.some((one) => one.includes("'"))).toBe(true)
    expect(pictures.some((one) => one.includes('(') && one.includes(')'))).toBe(true)
  })

  it.each(drawnCases().map((one) => [one.name, one.value] as const))(
    '%s: the url() body holds no character that ends an unquoted url()',
    (_name, value) => {
      const body = DRAWN_SHAPE.exec(value)?.groups?.['body']
      expect(body, `not url(...) x y, fallback: ${value}`).toBeDefined()
      expect(body!.startsWith(SVG_DATA_HEAD)).toBe(true)
      expect(UNQUOTED_URL_BREAKERS.test(body!), body).toBe(false)
    },
  )

  it.each(drawnCases().map((one) => [one.name, one.value] as const))(
    '%s: the url() body decodes to one whole svg picture',
    (_name, value) => {
      const picture = pictureOf(value)
      expect(picture.startsWith('<svg ')).toBe(true)
      expect(picture.endsWith('</svg>')).toBe(true)
    },
  )
})
