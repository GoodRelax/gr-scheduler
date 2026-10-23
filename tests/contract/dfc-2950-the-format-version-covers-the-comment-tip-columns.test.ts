// DFC-2950 spec-only cases: the format version (DR-4 schemaVersion) that the spec's published schema records, the shipped documents carry and a written GRS JSON carries is newer than the version that lacked the comment tip columns AT-163 .. AT-167, and a document saved with those columns opens (FR-073, FR-024).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import { validateDocument } from '../fixtures/grs-document'
import { ERD_DETAIL, REQUIREMENTS, documentObject } from '../unit/cr-646-stage'
import { BAR_UID, COMMENT_ID, HIGHLIGHT_ID, OTHER_COMMENT_ID, april, commentRow, groupOf, highlightRow, tasksOf } from './cr-777-stage'

const FR_073_RAISE =
  '文書の形（`_assets/fig-erd-detail.md` の 表 T-058 の列と、表 T-052 の鍵）が変われば、形式の版は、それまでのどの版よりも新しい時刻になること（MUST）'
const FR_073_ONE_PLACE = '値の置き場は 表 T-052 の `DR-4` の 1 か所である'
const FR_073_OLDER_READABLE = '⛔ **「読めない版」とは、この造りが知る最大の版より新しいことである（MUST）。**'
const DR_4_CONST = '刊行するスキーマは `schemaVersion` を、その造りの版の `const` で示すこと（MUST）'
const DR_4_TEMPLATE = '値は `FR-027` のテンプレートが載せる版と同じ 1 か所から採る。'
const FR_024_BUILD_VERSION = '載せる形式の版は、この造りの版とすること（MUST）'

// WHY: AT-163 .. AT-167, the comment tip columns whose addition is the shape change DFC-2950 is about.
const TIP_COLUMNS = ['AT-163', 'AT-164', 'AT-165', 'AT-166', 'AT-167'] as const

// WHY: the version the builds before the tip columns carried (ledger row DFC-2950: the CR-769 version); a later shape must be newer.
const VERSION_WITHOUT_TIP_COLUMNS = '2026-10-15T05:52:20Z'

const INSTANT_FORM = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

const ROOT = process.cwd()
const readJson = (...parts: string[]): Record<string, any> => JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8')) as Record<string, any>

// see DR-4
const SCHEMA = readJson('docs', 'spec', '_source', 'grs-document.schema.json')
const SPEC_VERSION = String(SCHEMA['properties']['schemaVersion']['const'])

// see AT-163, AT-164, AT-165, AT-166, AT-167
const columnNameOf = (id: string): string => {
  const line = ERD_DETAIL.split('\n').find((one) => one.startsWith(`| ${id} |`))
  if (line === undefined) throw new Error(`fig-erd-detail.md has no row ${id}`)
  const cells = line.split('|').map((one) => one.trim())
  return cells[3]!.replace(/`/g, '')
}

// WHY: one box snapped to a task and one snapped to a highlight box, so every tip column holds a value.
const savedText = (version: string): string => {
  const root = documentObject({
    tasks: tasksOf(),
    commentBoxes: [
      commentRow({
        anchorDate: april(6, '00:00:00'),
        anchorTaskGroupId: groupOf(BAR_UID),
        anchorBandFraction: 0.2,
        anchorTaskUid: BAR_UID,
        anchorTaskFigure: 'plannedBar',
        anchorSnapPoint: 'topLeftCorner',
      }),
      commentRow({
        id: OTHER_COMMENT_ID,
        anchorDate: april(8, '00:00:00'),
        anchorTaskGroupId: groupOf(2),
        anchorBandFraction: 0,
        anchorHighlightBoxId: HIGHLIGHT_ID,
        anchorSnapPoint: 'bottomRightCorner',
      }),
    ],
    highlightBoxes: [highlightRow()],
  })
  return JSON.stringify({ $schema: SCHEMA['$id'], ...root, schemaVersion: version })
}

const opened = (version: string) => {
  const reading = documentFromJson(savedText(version), SPEC_VERSION)
  if (!reading.ok) throw new Error(`the saved document did not open: ${JSON.stringify(reading)}`)
  return reading
}

describe('DFC-2950 -- the clauses these cases hold are the manuscript words', () => {
  it('FR-073, DR-4 and FR-024 still say what the cases press', () => {
    for (const clause of [FR_073_RAISE, FR_073_ONE_PLACE, FR_073_OLDER_READABLE, DR_4_CONST, DR_4_TEMPLATE, FR_024_BUILD_VERSION]) {
      expect(REQUIREMENTS).toContain(clause)
    }
  })
})

describe('FR-073 / DR-4: the version the spec records is newer than the shape without the tip columns', () => {
  it('DR-4: the published schema records the version as an RFC 3339 UTC instant', () => {
    expect(SPEC_VERSION).toMatch(INSTANT_FORM)
  })

  it('FR-073 / AT-163 .. AT-167: the published CommentBox holds every tip column', () => {
    const properties = Object.keys(SCHEMA['$defs']['CommentBox']['properties'] as Record<string, unknown>)
    for (const id of TIP_COLUMNS) expect(properties, id).toContain(columnNameOf(id))
  })

  it('FR-073: the recorded version is newer than the version that lacked the tip columns (string order is time order)', () => {
    expect(SPEC_VERSION > VERSION_WITHOUT_TIP_COLUMNS).toBe(true)
  })
})

describe('DR-4 / FR-027: the shipped documents carry the version the spec records', () => {
  for (const file of ['startup-template.json', 'empty-document.json'] as const) {
    it(`DR-4 / FR-027: ${file} carries the spec version`, () => {
      const shipped = readJson('src', 'framework', 'single-html-shell', file)
      expect(shipped['schemaVersion']).toBe(SPEC_VERSION)
    })
  }
})

describe('FR-073 / FR-024: a document saved with the tip columns opens and is written at the build version', () => {
  it('FR-073 / RS-25: a document at the spec version holding all five tip columns opens with every column kept', () => {
    const reading = opened(SPEC_VERSION)
    expect(reading.formatVersion).not.toBe('newerThanKnown')
    const boxes = reading.document.schedule.commentBoxes
    const task = boxes.find((one) => one.id === COMMENT_ID)!
    const box = boxes.find((one) => one.id === OTHER_COMMENT_ID)!
    expect([task.anchorBandFraction, task.anchorTaskUid, task.anchorTaskFigure, task.anchorHighlightBoxId, task.anchorSnapPoint]).toEqual([
      0.2,
      BAR_UID,
      'plannedBar',
      null,
      'topLeftCorner',
    ])
    expect([box.anchorBandFraction, box.anchorTaskUid, box.anchorTaskFigure, box.anchorHighlightBoxId, box.anchorSnapPoint]).toEqual([
      0,
      null,
      null,
      HIGHLIGHT_ID,
      'bottomRightCorner',
    ])
  })

  it('FR-024 / DR-4: writing the opened document gives the spec version and fits the published schema', () => {
    const written = JSON.parse(jsonFromDocument(opened(SPEC_VERSION).document)) as Record<string, unknown>
    expect(written['schemaVersion']).toBe(SPEC_VERSION)
    const check = validateDocument(written)
    expect(check.errors).toEqual([])
  })

  it('FR-073: a document stamped with the older version but holding the tip columns is a readable version and opens', () => {
    const reading = opened(VERSION_WITHOUT_TIP_COLUMNS)
    expect(reading.formatVersion).not.toBe('newerThanKnown')
    expect(reading.document.schedule.commentBoxes).toHaveLength(2)
  })

  it('FR-024: a document read at the older version is written at the build version, not the version it was read with', () => {
    const written = JSON.parse(jsonFromDocument(opened(VERSION_WITHOUT_TIP_COLUMNS).document)) as Record<string, unknown>
    expect(written['schemaVersion']).toBe(SPEC_VERSION)
  })
})
