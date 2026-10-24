// DFC-3006 spec-only cases: table T-109 -- the App Header holds the entrances whose surface is App Header and no retired one (the dialogue entrance); its AI group is IC-115 then IC-20.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { LANGUAGES, T_109_ROWS, viewOf } from './dfc-3000-help-stage'
import { unbroken } from './spec-table'

const GLOSSARY = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-glossary.md'), 'utf8').replace(/\r\n/g, '\n'))

const T_109_ORDER =
  '入口を並べる順は、面ごとに、本表の `群` の欄と行の順が決める —— 同じ面で同じ `群` の行を 1 つの塊に寄せ、塊どうしは塊の最初の行が本表に現れる順に、塊の中は本表の行の順に並べること（MUST）'

const HEADER = 'App Header'
const AI_GROUP = 'AI'

const headerRows = T_109_ROWS.filter((one) => one.surfaces.includes(HEADER))
const AI_ROWS: readonly string[] = headerRows.filter((one) => one.group === AI_GROUP).map((one) => one.id)

const headerIcons = (language: (typeof LANGUAGES)[number]): string[] =>
  viewOf(language, language, false).appHeaderItems.commands.map((one) => String(one.icon))

describe('DFC-3006 -- the manuscript these cases are driven by', () => {
  it('T-109 still orders a surface by its groups', () => {
    expect(GLOSSARY).toContain(T_109_ORDER)
  })

  it('the App Header AI group of T-109 is IC-115 then IC-20', () => {
    expect(AI_ROWS).toEqual(['IC-115', 'IC-20'])
  })
})

describe('DFC-3006 -- T-109 the App Header entrances', () => {
  it.each(LANGUAGES)('%s: the header holds no IC entrance table T-109 does not hold', (language) => {
    const ids = new Set(T_109_ROWS.map((one) => one.id))
    expect(headerIcons(language).filter((one) => /^IC-\d+$/.test(one) && !ids.has(one))).toEqual([])
  })

  it.each(LANGUAGES)('%s: the AI group stands together as the T-109 AI rows of the App Header, in table order', (language) => {
    const icons = headerIcons(language)
    const first = icons.indexOf(AI_ROWS[0] ?? '')
    expect(first).toBeGreaterThanOrEqual(0)
    expect(icons.slice(first, first + AI_ROWS.length)).toEqual(AI_ROWS)
  })

  it.each(LANGUAGES)('%s: every T-109 entrance in the header is a row whose surface is App Header', (language) => {
    const allowed = new Set(headerRows.map((one) => one.id))
    expect(headerIcons(language).filter((one) => /^IC-\d+$/.test(one) && !allowed.has(one))).toEqual([])
  })

  it.each(LANGUAGES)('%s: every T-109 row whose surface is App Header stands in the header', (language) => {
    const icons = new Set(headerIcons(language))
    expect(headerRows.map((one) => one.id).filter((one) => !icons.has(one))).toEqual([])
  })
})
