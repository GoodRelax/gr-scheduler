// Contract test: the owner column of table T-075, read as a function.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { bareAll, specTable, unbroken } from './spec-table'

const ROOT = process.cwd()

const OWNER_COLUMN = '負う要求'
const EMPTY_CELL = '—'
const SEPARATOR = '・'
const CLOSING_MARK = '**「負う要求」の欄の結び。**'

const REQUIREMENTS_PATH = join(ROOT, 'docs', 'spec', '01-04-requirements.md')
const DESIGN_PATH = join(ROOT, 'docs', 'spec', '05-07-design.md')

const BASELINE_REL = '.claude/skills/spec-graph-check/requirement-owner-baseline.txt'
const BASELINE_PATH = join(ROOT, ...BASELINE_REL.split('/'))

const BASELINE_FORMAT =
  'UTF-8 text. A blank line, or a line whose first non-space character is "#", is a comment. ' +
  'Exactly one other line, reading "unfilled=<n>", with <n> a non-negative decimal integer and ' +
  'no spaces around "=". <n> is how many of the requirements have no 表 T-075 「負う要求」 cell ' +
  'naming them yet -- ⛔ NOT counting the requirements the closing paragraph of 5.3 names as ' +
  'having no starting unit at all, which CR-435 section 6.2 takes out of this number by name.'

const BASELINE_RULE =
  'CR-435 section 6.2 shapes it as a ratchet: 「減る 埋めれば下がる。下がったら基準線を下げる ／ ' +
  '増える ⛔ 上がったら赤」. Only a RISE is red here -- the same section asks for 「途中でも緑で ' +
  'あり、後戻りは止まる」, and a two-way ratchet would redden every commit that fills a row until ' +
  'the user approved a new number, which is the carried-over red the ruling was given to avoid. ' +
  '⛔ The body that fills the column does not write this file: 「本書を当てる体は、基準線の' +
  'ファイルを書かない。未記入の件数を測って報告するところで止め、前に立つ者が利用者に見せてから' +
  '書く」 (memory: "Baseline moves need the user\'s OK").'

const requirementsText = readFileSync(REQUIREMENTS_PATH, 'utf8').replace(/\r\n/g, '\n')

const Q: readonly string[] = [...requirementsText.matchAll(/^\*\*UID\*\*: ((?:FR|NFR)-\d+)/gm)].map(
  (hit) => hit[1] ?? '',
)
const qSet = new Set(Q)

const T075 = specTable('T-075')
const T277 = specTable('T-277')

const C: readonly string[] = T277.rows.map((row) => row.id)

interface Pair {
  readonly row: string
  readonly requirement: string
  readonly kind: string
}

interface Segment {
  readonly row: string
  readonly text: string
}

const SEGMENT = /^`((?:FR|NFR)-\d+)`（`(OW-\d+)`）$/

const segments: Segment[] = []
for (const row of T075.rows) {
  const cell = (row.by[OWNER_COLUMN] ?? '').trim()
  if (cell === EMPTY_CELL || cell === '') continue
  for (const text of cell.split(SEPARATOR)) segments.push({ row: row.id, text: text.trim() })
}

// WHY: CR-435 6.1 says to open the cell with bareAll; on the cell the applying
// WHY: round wrote it stops at the first pair, so it opens a segment instead.
const P: Pair[] = []
const malformed: Segment[] = []
const disagreeing: string[] = []
for (const segment of segments) {
  const shape = SEGMENT.exec(segment.text)
  if (shape === null) {
    malformed.push(segment)
    continue
  }
  const requirement = shape[1] ?? ''
  const opened = bareAll(segment.text)
  if (opened.length !== 1 || opened[0] !== requirement) {
    disagreeing.push(`${segment.row} ${JSON.stringify(segment.text)} -> ${opened.join(', ')}`)
  }
  P.push({ row: segment.row, requirement, kind: shape[2] ?? '' })
}

const namedIds = P.map((pair) => pair.requirement)
const namedSet = new Set(namedIds)

const designText = unbroken(readFileSync(DESIGN_PATH, 'utf8').replace(/\r\n/g, '\n'))

const closingOf = (text: string): string => {
  const lines = text.split('\n')
  const at = lines.indexOf(CLOSING_MARK)
  if (at < 0) {
    throw new Error(
      `docs/spec/05-07-design.md has no line reading ${JSON.stringify(CLOSING_MARK)}. ` +
        '表 T-277 `OW-4` makes that paragraph the one place a requirement with no starting ' +
        'unit may be named, and every count below is read out of it.',
    )
  }
  const end = lines.slice(at + 1).findIndex((line) => line.startsWith('**表 '))
  return lines.slice(at + 1, end < 0 ? undefined : at + 1 + end).join('\n')
}

const closing = closingOf(designText)

const idsIn = (text: string): readonly string[] =>
  [...text.matchAll(/`((?:FR|NFR)-\d+)`/g)].map((hit) => hit[1] ?? '')

const numberOf = (pattern: RegExp, what: string): number => {
  const hit = pattern.exec(closing)
  if (hit === null) {
    throw new Error(
      `the closing paragraph of 5.3 no longer states ${what}: nothing in it matches ${String(
        pattern,
      )}`,
    )
  }
  return Number(hit[1])
}

const statedTotal = numberOf(
  /`01-04-requirements\.md` が持つ要求は (\d+) 件である/,
  'how many requirements 01-04-requirements.md holds',
)
const statedFr = numberOf(/（`FR` が (\d+) 件、/, 'how many of them are FR')
const statedNfr = numberOf(/`NFR` が (\d+) 件）/, 'how many of them are NFR')
const statedNamed = numberOf(
  /そのうち (\d+) 件は、上の欄が起点のユニットを名指している/,
  'how many requirements the column names',
)
const statedUnfilled = numberOf(
  /起点をまだ書いていない要求が (\d+) 件ある/,
  'how many requirements have no starting unit written yet',
)

const NO_OWNER_SENTENCE = /起点のユニットを持たない要求が (\d+) 件ある/
const UNFILLED_SENTENCE = /起点をまだ書いていない要求が (\d+) 件ある/

const closingLines = closing.split('\n')
const noOwnerAt = closingLines.findIndex((line) => NO_OWNER_SENTENCE.test(line))
const unfilledAt = closingLines.findIndex((line) => UNFILLED_SENTENCE.test(line))
if (noOwnerAt < 0 || unfilledAt < 0 || noOwnerAt > unfilledAt) {
  throw new Error(
    'the closing paragraph of 5.3 no longer carries its two sentences in order -- ' +
      '「起点のユニットを持たない要求が N 件ある」 then 「起点をまだ書いていない要求が ' +
      'N 件ある」. 表 T-277 `OW-5` makes the first of them the only place a requirement ' +
      'whose starting point is a means of verification may be named, and the block ' +
      'between the two is read as that list.',
  )
}

const statedNoOwner = Number(NO_OWNER_SENTENCE.exec(closing)?.[1])

interface NoOwner {
  readonly id: string
  readonly block: string
}

const NO_OWNER_BULLET = /^- `((?:FR|NFR)-\d+)`/

const noOwners: NoOwner[] = []
for (const line of closingLines.slice(noOwnerAt + 1, unfilledAt)) {
  const hit = NO_OWNER_BULLET.exec(line)
  if (hit !== null) {
    noOwners.push({ id: hit[1] ?? '', block: line })
    continue
  }
  const last = noOwners[noOwners.length - 1]
  if (last !== undefined && line.trim() !== '') {
    noOwners[noOwners.length - 1] = { id: last.id, block: `${last.block}\n${line}` }
  }
}

const X: readonly string[] = noOwners.map((one) => one.id)

const PATH_IN_TEXT = /`([A-Za-z0-9_][A-Za-z0-9_./-]*\.(?:ts|mjs|py|md|json|sh|xml))/g

const pathsIn = (text: string): readonly string[] =>
  [...text.matchAll(PATH_IN_TEXT)].map((hit) => hit[1] ?? '')

interface Reason {
  readonly line: string
  readonly stated: number
  readonly ids: readonly string[]
}

const REASON = /^- \*\*.*（(\d+) 件）\*\* —— (.*)$/
const reasons: Reason[] = closingLines
  .slice(unfilledAt)
  .map((line) => ({ line, hit: REASON.exec(line) }))
  .filter((one): one is { line: string; hit: RegExpExecArray } => one.hit !== null)
  .map(({ line, hit }) => ({ line, stated: Number(hit[1]), ids: idsIn(hit[2] ?? '') }))

const accountedFor = new Set<string>([...X, ...reasons.flatMap((reason) => reason.ids)])

const unfilled: readonly string[] = Q.filter((id) => !namedSet.has(id) && !X.includes(id))

const BASELINE_VALUE = /^unfilled=(\d+)$/

const readBaseline = (): { held: number } | { problem: string } => {
  if (!existsSync(BASELINE_PATH)) {
    return {
      problem:
        `PROBLEM  ${BASELINE_REL} has not been written yet; measured unfilled=` +
        `${unfilled.length} of ${Q.length} requirement(s) -- show the user (memory: ` +
        `"Baseline moves need the user's OK"), and write the file on purpose. ` +
        `FORMAT: ${BASELINE_FORMAT} ${BASELINE_RULE}`,
    }
  }
  const lines = readFileSync(BASELINE_PATH, 'utf8')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
  if (lines.length !== 1) {
    return {
      problem:
        `PROBLEM  ${BASELINE_REL} holds ${lines.length} value line(s), not 1. ` +
        `FORMAT: ${BASELINE_FORMAT}`,
    }
  }
  const value = BASELINE_VALUE.exec(lines[0] ?? '')
  if (value === null) {
    return {
      problem:
        `PROBLEM  the value line of ${BASELINE_REL} is not "unfilled=<n>": ` +
        `${JSON.stringify((lines[0] ?? '').slice(0, 80))}. FORMAT: ${BASELINE_FORMAT}`,
    }
  }
  return { held: Number(value[1]) }
}

const baseline = readBaseline()

describe('CR-435 -- a requirement names the unit that owns it', () => {
  it('reads every 「負う要求」 cell whole, or says which segment it could not', () => {
    expect(
      malformed.map((one) => `${one.row} ${JSON.stringify(one.text)}`),
      'a 「負う要求」 segment reads 「`FR-nnn`（`OW-n`）」 (CR-435 section 4); one that does ' +
        'not cannot be read, and the pair it carries would be dropped in silence',
    ).toEqual([])
    expect(segments.length, 'the column states no pairs at all').toBeGreaterThan(0)
  })

  it('opens each segment with bareAll and gets the requirement its shape gives', () => {
    expect(
      disagreeing,
      'bareAll and the segment shape must name the same requirement; where they do not, ' +
        'one of the two is reading the cell wrongly (CR-435 section 6.1, step 2)',
    ).toEqual([])
  })

  it('uses only the kinds 表 T-277 defines, whatever they are', () => {
    expect(C.length, '表 T-277 defines no kind at all').toBeGreaterThan(0)
    expect(
      C.filter((kind) => !/^OW-\d+$/.test(kind)),
      'CR-435 section 6.1, step 3 reads the kinds out of 表 T-277 itself; a row ID outside ' +
        'the registered `OW` prefix would mean the table is no longer the one being read',
    ).toEqual([])
    expect(new Set(C).size, '表 T-277 writes one row ID twice').toBe(C.length)
    expect(
      P.filter((pair) => !C.includes(pair.kind)).map((p) => `${p.row} ${p.requirement} ${p.kind}`),
      `CR-435 section 6.1, step 5: the column may not invent a kind 表 T-277 does not ` +
        `define. It defines ${C.join(' ')}`,
    ).toEqual([])
  })

  it('names only requirements 01-04-requirements.md holds', () => {
    expect(
      P.filter((pair) => !qSet.has(pair.requirement)).map((p) => `${p.row} ${p.requirement}`),
      'CR-435 section 6.1, step 6: a requirement ID in the column that no requirement has',
    ).toEqual([])
    expect(Q.length, 'a requirement UID is written twice in 01-04-requirements.md').toBe(qSet.size)
  })

  it('names each requirement at most once, so the relation is single-valued', () => {
    const rowsOf = new Map<string, string[]>()
    for (const pair of P) {
      rowsOf.set(pair.requirement, [...(rowsOf.get(pair.requirement) ?? []), pair.row])
    }
    expect(
      [...rowsOf.entries()]
        .filter(([, rows]) => rows.length > 1)
        .map(([id, rows]) => `${id} in ${rows.join(' and ')}`),
      '5.3 (MUST NOT) 「同じ要求を 2 つ以上の行に書いてはならない」 -- two rows for one ' +
        'requirement means neither says which file to open first (CR-435 6.1, step 7)',
    ).toEqual([])
    expect(namedSet.size).toBe(P.length)
  })

  it('counts Q in its closing paragraph, and counts it truly', () => {
    expect(statedTotal, 'CR-435 section 6.1, step 9: a requirement was added in silence').toBe(
      Q.length,
    )
    expect(statedFr).toBe(Q.filter((id) => id.startsWith('FR-')).length)
    expect(statedNfr).toBe(Q.filter((id) => id.startsWith('NFR-')).length)
    expect(statedFr + statedNfr).toBe(statedTotal)
    expect(statedNamed, 'the closing paragraph counts what the column names').toBe(namedSet.size)
    expect(
      statedNamed + statedNoOwner + statedUnfilled,
      'CR-435 section 6.2 does this sum itself -- 121 - 99 - 5 = 17. The three numbers the ' +
        'closing states must partition the requirements, or the baseline is measuring a set ' +
        'nobody can name',
    ).toBe(statedTotal)
  })

  it('names the requirements with no starting unit truly, and outside the column', () => {
    expect(X.length, 'the count the closing states and the IDs it lists must agree').toBe(
      statedNoOwner,
    )
    expect(new Set(X).size, 'the closing lists a requirement twice').toBe(X.length)
    expect(
      X.filter((id) => !qSet.has(id)),
      'the closing names something that is not a requirement',
    ).toEqual([])
    expect(
      X.filter((id) => namedSet.has(id)),
      '表 T-277 `OW-5` 「本欄には立たない。確かめる手立てを、本節の結びが名指す」 ' +
        '-- it cannot be in both places',
    ).toEqual([])
  })

  it('names, for each of them, a means of verification that exists', () => {
    expect(
      noOwners
        .filter((one) => !pathsIn(one.block).some((path) => existsSync(join(ROOT, path))))
        .map((one) => one.id),
      '表 T-277 `OW-5` makes the starting point a means of verification -- 「その要求を' +
        '確かめる手立て（試験・関門・検査）」 -- and the closing paragraph is the one place ' +
        'it is named. A requirement listed there whose means names no file that exists is a ' +
        'claim nothing can be opened from',
    ).toEqual([])
  })

  it('accounts for every requirement the column does not name', () => {
    for (const reason of reasons) {
      expect(
        reason.ids.length,
        `a reason in the closing paragraph counts 「${reason.stated} 件」 and then lists ` +
          `${reason.ids.length}: ${reason.line.slice(0, 60)}`,
      ).toBe(reason.stated)
    }
    const listed = reasons.flatMap((reason) => reason.ids)
    expect(new Set(listed).size, 'a requirement is listed under two reasons').toBe(listed.length)
    expect(listed.length, 'the reasons must add up to the count the closing states').toBe(
      statedUnfilled,
    )
    expect(
      listed.filter((id) => namedSet.has(id)),
      'a requirement cannot both be named by the column and be listed as not written yet',
    ).toEqual([])
    expect(
      listed.filter((id) => X.includes(id)),
      'a requirement cannot be listed both as having a means of verification and as still ' +
        'waiting for one -- when a means is written, the requirement MOVES out of its reason ' +
        'and that reason count falls by one, which is what makes the baseline fall by one',
    ).toEqual([])
    expect(
      Q.filter((id) => !namedSet.has(id) && !accountedFor.has(id)),
      'every requirement the column does not name must be accounted for BY NAME in the ' +
        'closing paragraph of 5.3 -- as having no starting unit, or under one of its three ' +
        'reasons. These are in neither place, so they went missing in silence',
    ).toEqual([])
    expect(
      [...accountedFor].filter((id) => !qSet.has(id)),
      'the closing paragraph accounts for something that is not a requirement',
    ).toEqual([])
  })

  it('holds the count of unwritten cells to a ratchet that only falls', () => {
    expect('problem' in baseline ? baseline.problem : null, BASELINE_RULE).toBeNull()
    if ('problem' in baseline) return
    expect(
      unfilled.length,
      `the unwritten count ROSE from ${baseline.held} to ${unfilled.length}. ${BASELINE_RULE} ` +
        `A filled 「負う要求」 cell cannot be emptied, and a requirement with no starting unit ` +
        `cannot be added in silence. Not written yet: ${unfilled.join(' ')}`,
    ).toBeLessThanOrEqual(baseline.held)
    if (unfilled.length < baseline.held) {
      console.log(
        `NOTE     the unwritten count is ${unfilled.length}, below the ${baseline.held} held ` +
          `in ${BASELINE_REL}. Lower the baseline in this commit; a fall is not red.`,
      )
    }
  })

  it('claims the relation is total only once the baseline is 0', () => {
    if ('problem' in baseline || baseline.held !== 0) {
      expect(
        unfilled.length,
        'CR-435 section 6.2 「全域性の主張は、基準線が 0 になるまで成り立たない」 -- while the ' +
          'baseline is above 0 this file must not say the relation is total',
      ).toBeGreaterThanOrEqual(0)
      return
    }
    const covered = new Set([...namedSet, ...X])
    expect(
      Q.filter((id) => !covered.has(id)),
      'CR-435 section 6.1, step 8: P の要求 ID ∪ X == Q -- hand the relation a requirement ' +
        'ID and exactly one file comes back',
    ).toEqual([])
    expect(covered.size).toBe(Q.length)
  })
})
