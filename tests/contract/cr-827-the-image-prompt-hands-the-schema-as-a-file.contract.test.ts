// CR-827: IC-115 copies a three-part prompt with no schema in it and hands the schema to the download as IO-10.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { bare, specTable, unbroken } from './spec-table'
import { exportStage, restoreAnimationFrames, SMALL_SCREEN, templateDocument, type ExportStage } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const ROOT = process.cwd()
const SPEC = join(ROOT, 'docs', 'spec')
const read = (...path: string[]): string => readFileSync(join(...path), 'utf8').replace(/\r\n/g, '\n')
const REQUIREMENTS = unbroken(read(SPEC, '01-04-requirements.md'))
const DESIGN = unbroken(read(SPEC, '05-07-design.md'))

const FR_068_STATEMENT =
  '**STATEMENT**: 作成者が求めたとき、`GRS` は、日程の画像から `GRS JSON` を AI に作らせるプロンプトをクリップボードへコピーし、同時に `GRS JSON` のスキーマをファイルとしてダウンロードさせ、コピーしたことを告げること。'
const FR_068_THREE_PARTS =
  '⭐ コピーするプロンプトは、(1) 画面の言語の原稿、(2) 版の 1 行（`schemaVersion:` と 1 字の空白に、初期テンプレート（`FR-027`）の `schemaVersion` の値を続けたもの）、(3) 土台の文書、の 3 つをこの順に空行で区切って連ねた 1 つの文字列とすること（MUST）。'
const FR_068_ONE_FENCE = '(3) は空白を除いた 1 行の JSON とし、`json` の囲みに入れる。'
const FR_068_NO_SCHEMA =
  '⛔ コピーするプロンプトに `GRS JSON` のスキーマを入れてはならない（MUST NOT） —— スキーマは下のファイルで渡す。'
const FR_068_DOWNLOAD =
  '⭐ 同じ押下で、`GRS JSON` のスキーマ（`05-07-design.md` の 6.2 が起こす `_source/grs-document.schema.json`）を 表 T-024 の `IO-10` のファイルとして、閲覧環境のダウンロードに渡すこと（MUST） —— 保存の選択面（`FR-096`）を開かない。'
const FR_068_NAME = '名は `grs-document.schema.json` に固定し、中身はスキーマを空白を除いた 1 行の JSON にしたものとする。'
const FR_068_MANUSCRIPT_NAMES = '原稿は、そのファイルを日程の原本と一緒に AI へ渡すよう言い、ファイルの名を名指すこと（MUST）。'
const FR_068_ENTRANCE =
  '⭐ 入口は 表 T-109 の `IC-115` とし、押されたときに面を開かずにプロンプトをコピーし、スキーマのファイルをダウンロードに渡すこと（MUST）。'
const T_024_SHARED_EXTENSION =
  '⚠️ `IO-10` は `IO-2` と同じ `.json` を持つが、取り込まないので組を持たない —— 拡張子を分け合う行は、媒体の型も同じであること（MUST）。'
const T_024_NOT_ON_IC_2 =
  '`IO-10` はスキーマを運び、入口は `IC-115` なので出さない —— 保存の選択面を開かないので、媒体の型はファイルに付ける型としてだけ使う。'
const DESIGN_6_2_NO_COPY =
  '⛔ 原稿に `GRS JSON` のスキーマと土台の文書をコピーしてはならない（MUST NOT） —— 土台の文書は生成器が原稿の後ろへ連ね、スキーマは生成器が同じ生成物に入れて、押したときに 表 T-024 の `IO-10` のファイルとしてダウンロードに渡る（`FR-068`）。'
const IF_3_DOWNLOAD =
  '⭐ 選ばせる面を開かずに閲覧環境のダウンロードへ渡す書き出し（`01-04-requirements.md` の 表 T-024 の `IO-10`、`FR-068`）も担う —— ハンドルを持たず、上書きする先にも最後に読み書きしたファイルにもならない。'

const SCHEMA_FILE_NAME = 'grs-document.schema.json'
const COPY_PROMPT = 'IC-115'
const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']
const FENCE = '```'
const JSON_FENCE = `${FENCE}json\n`
const METASCHEMA = 'https://json-schema.org/draft/2020-12/schema'

const SCHEMA_ONE_LINE = JSON.stringify(JSON.parse(read(SPEC, '_source', SCHEMA_FILE_NAME)))
const TEMPLATE = JSON.parse(read(ROOT, 'src', 'framework', 'single-html-shell', 'startup-template.json')) as {
  readonly schemaVersion: string
  readonly documentSettings: unknown
}

const T_024 = specTable('T-024')
const row = (id: string): Readonly<Record<string, string>> => {
  const found = T_024.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table T-024 has no ${id}`)
  return found.by
}
const EXTENSION = '拡張子'
const MEDIA_TYPE = '保存の選択面に渡す媒体の型'

/** @purity non-pure */
function promptLinesOf(language: DisplayLanguage): readonly string[] {
  return read(SPEC, '_source', `image-to-grs-json-prompt.${language}.md`).split('\n').slice(1)
}

/** @purity non-pure */
async function pressed(language: DisplayLanguage): Promise<{ stage: ExportStage; text: string }> {
  const stage = exportStage(templateDocument(), SMALL_SCREEN, language)
  await stage.take(COPY_PROMPT)
  const last = stage.clipped[stage.clipped.length - 1]
  if (last === undefined || last.kind !== 'document') throw new Error(`${COPY_PROMPT} copied no text`)
  return { stage, text: last.text }
}

describe('CR-827 -- the manuscript these cases are driven by', () => {
  it.each([
    FR_068_STATEMENT,
    FR_068_THREE_PARTS,
    FR_068_ONE_FENCE,
    FR_068_NO_SCHEMA,
    FR_068_DOWNLOAD,
    FR_068_NAME,
    FR_068_MANUSCRIPT_NAMES,
    FR_068_ENTRANCE,
    T_024_SHARED_EXTENSION,
    T_024_NOT_ON_IC_2,
  ])('01-04 still says it: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each([DESIGN_6_2_NO_COPY, IF_3_DOWNLOAD])('05-07 still says it: %s', (clause) => {
    expect(DESIGN).toContain(clause)
  })
})

describe('CR-827 -- table T-024 row IO-10 and channel CHN-2', () => {
  it('IO-10 is a JSON Schema written only, as .json and application/json, not offered on IC-2, with no first character', () => {
    const io10 = row('IO-10')
    expect(io10['形式']).toContain('JSON Schema 2020-12')
    expect(bare(io10['方向'] ?? '')).toBe('書出のみ')
    expect(bare(io10[EXTENSION] ?? '')).toBe('.json')
    expect(bare(io10[MEDIA_TYPE] ?? '')).toBe('application/json')
    expect(bare(io10['`IC-2` に出す'] ?? '')).toBe('出さない')
    expect(bare(io10['先頭の非空白 1 文字'] ?? '')).toBe('—')
    expect(io10['備考']).toContain(`名は \`${SCHEMA_FILE_NAME}\` に固定する`)
  })

  it(`${T_024_SHARED_EXTENSION} -- every two rows that share an extension share the media type`, () => {
    const typeByExtension = new Map<string, Set<string>>()
    for (const one of T_024.rows) {
      const extension = bare(one.by[EXTENSION] ?? '')
      if (extension === '—' || extension === '') continue
      const types = typeByExtension.get(extension) ?? new Set<string>()
      types.add(bare(one.by[MEDIA_TYPE] ?? ''))
      typeByExtension.set(extension, types)
    }
    expect(bare(row('IO-2')[EXTENSION] ?? ''), 'premise: IO-2 shares .json with IO-10').toBe('.json')
    for (const [extension, types] of typeByExtension) expect([...types], extension).toHaveLength(1)
  })

  it('CHN-2, the download channel, carries the schema of IO-10', () => {
    const chn2 = specTable('T-008').rows.find((one) => one.id === 'CHN-2')
    expect(chn2?.cells.join(' | ')).toContain('`GRS JSON` のスキーマ（表 T-024 の `IO-10`）')
  })
})

describe(`CR-827 -- ${FR_068_MANUSCRIPT_NAMES}`, () => {
  it.each(LANGUAGES)('the %s manuscript names the schema file in the prompt itself', (language) => {
    expect(promptLinesOf(language).join('\n')).toContain(SCHEMA_FILE_NAME)
  })
})

describe(`CR-827 -- ${FR_068_THREE_PARTS}`, () => {
  it.each(LANGUAGES)('%s: the copy is the manuscript, the version line and one json fence holding the base', async (language) => {
    const { text } = await pressed(language)
    const firstLine = promptLinesOf(language).find((one) => one.trim() !== '') ?? ''
    expect(text.startsWith(firstLine), 'part (1) is the screen language manuscript').toBe(true)
    expect(text).toContain(SCHEMA_FILE_NAME)
    expect(text.split(JSON_FENCE)).toHaveLength(2)
    const versionAt = text.indexOf(`\n\nschemaVersion: ${TEMPLATE.schemaVersion}\n\n${JSON_FENCE}`)
    expect(versionAt, 'part (2) follows part (1) and precedes part (3), each after a blank line').toBeGreaterThan(0)
    const fenced = text.slice(text.indexOf(JSON_FENCE) + JSON_FENCE.length)
    const body = fenced.slice(0, fenced.indexOf(`\n${FENCE}`))
    expect(fenced.slice(body.length).trimEnd(), 'the fence closes the prompt').toBe(`\n${FENCE}`)
    expect(body, FR_068_ONE_FENCE).toBe(JSON.stringify(JSON.parse(body)))
    const base = JSON.parse(body) as { schemaVersion: string; documentSettings: unknown; schedule: { tasks: unknown[] } }
    expect(base.schemaVersion).toBe(TEMPLATE.schemaVersion)
    expect(base.documentSettings).toEqual(TEMPLATE.documentSettings)
    expect(base.schedule.tasks).toEqual([])
  })

  it.each(LANGUAGES)(`%s: ${FR_068_NO_SCHEMA}`, async (language) => {
    const { text } = await pressed(language)
    expect(text).not.toContain(SCHEMA_ONE_LINE)
    expect(text).not.toContain(METASCHEMA)
    expect(text).not.toContain('"$defs"')
  })
})

describe(`CR-827 -- ${FR_068_DOWNLOAD}`, () => {
  it.each(LANGUAGES)(`%s: one press hands one file, ${FR_068_NAME}`, async (language) => {
    const { stage } = await pressed(language)
    expect(stage.downloaded.map((one) => one.fileName)).toEqual([SCHEMA_FILE_NAME])
    const content = new TextDecoder().decode(stage.downloaded[0]?.bytes)
    // WHY: one line of JSON may end with its line end; FR-068 fixes the one line, not whether it is terminated.
    expect(content.replace(/\n$/, '')).toBe(SCHEMA_ONE_LINE)
    expect(stage.written, 'the save chooser (FR-096) is not opened').toEqual([])
  })

  it('a second press hands the same file again', async () => {
    const { stage } = await pressed('ja')
    await stage.take(COPY_PROMPT)
    expect(stage.downloaded.map((one) => one.fileName)).toEqual([SCHEMA_FILE_NAME, SCHEMA_FILE_NAME])
    expect(new TextDecoder().decode(stage.downloaded[1]?.bytes).replace(/\n$/, '')).toBe(SCHEMA_ONE_LINE)
  })
})
