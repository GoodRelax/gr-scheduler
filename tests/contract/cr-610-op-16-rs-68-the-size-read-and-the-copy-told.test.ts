// CR-610 spec-only tests: OP-16 spells the size read as HS-3 does; FR-025 / RS-68 tells a picture copied to the clipboard.

import { describe, expect, it } from 'vitest'

import type { Clipboard, ClipboardContent } from '../../src/adapter/clipboard-gateway/clipboard'
import type { Rasterizer } from '../../src/adapter/image-exporter/rasterizer'
import { oneByRole } from '../fixtures/fake-browser'
import {
  OPEN_CHOOSER,
  REQUIREMENTS,
  jsonBytes,
  reasonWords,
  shellStage,
  sizeSpelling,
  surfaceOfEntrance,
  there,
  type ShellStage,
} from './cr-610-file-flow-stage'
import { specTable } from './spec-table'

const RS_68 = reasonWords('RS-68')
const ONE_SPELLING = '大きさは読んだ中身のバイト数とし、`FR-101` の 表 T-341 の `HS-3` のとおり綴ること（MUST）'
const COPY_TOLD = 'クリップボードへ送れたときは、送ったことを告げること（MUST） —— 運ぶ理由は 表 T-233 の `RS-68` とする。'
const NOT_TOLD = '送れなかったときは、この知らせを出してはならない（MUST NOT）'
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const rasterizer: Rasterizer = { rasterizePng: async () => ({ ok: true, pngBytes: PNG_BYTES }) }

function clipboard(answer: 'ok' | 'refused'): { readonly clipboard: Clipboard; readonly sent: ClipboardContent[] } {
  const sent: ClipboardContent[] = []
  return {
    sent,
    clipboard: {
      writeClipboardContent: async (content) => {
        sent.push(content)
        return answer === 'ok' ? { ok: true } : { ok: false, fault: 'notPermitted' }
      },
    },
  }
}

const told = (built: ShellStage): readonly string[] => built.last().notices.map((one) => one.text)

describe('OP-16 / FR-025 / RS-68 -- the manuscript still says it', () => {
  it('OP-16 spells the size read by HS-3; FR-025 tells a copy with RS-68 and only a copy that happened', () => {
    expect(REQUIREMENTS).toContain(ONE_SPELLING)
    expect(REQUIREMENTS).toContain(COPY_TOLD)
    expect(REQUIREMENTS).toContain(NOT_TOLD)
    expect(specTable('T-233').rows.find((one) => one.id === 'RS-68')?.cells.join(' ')).toContain('NT-5')
  })
})

describe('OP-16 (MUST) -- U-56 shows the file read and its size, spelled as HS-3', () => {
  it('OP-16 / HS-3: the file row of U-56 holds the name and the bytes read in parentheses', async () => {
    const built = await shellStage({ dom: true })
    const bytes = jsonBytes(there())
    await built.open(built.file('theirs.json', bytes))
    expect(built.last().openModal, 'precondition: SK-10 raised no U-56').not.toBeNull()
    const shown = oneByRole(built.domRoot(), OPEN_CHOOSER()).textContent
    expect(shown).toContain('theirs.json')
    expect(shown, 'OP-16: the size read is not spelled as HS-3').toContain(`(${sizeSpelling(bytes.byteLength)})`)
  })
})

describe('FR-025 (MUST / MUST NOT) / RS-68 -- a picture copied through IC-3', () => {
  it('RS-68: a picture the clipboard took is told (NT-5)', async () => {
    const copy = clipboard('ok')
    const built = await shellStage({ clipboard: copy.clipboard, rasterizer })
    await built.press(surfaceOfEntrance('IC-3'), 'IC-3')
    expect(copy.sent.map((one) => one.kind), 'precondition: IC-3 sent no picture').toEqual(['picture'])
    expect(told(built), 'FR-025: the copy was not told').toContain(RS_68.text.ja)
  })

  it('RS-68 (MUST NOT): a picture the clipboard refused is not told as copied', async () => {
    const copy = clipboard('refused')
    const built = await shellStage({ clipboard: copy.clipboard, rasterizer })
    await built.press(surfaceOfEntrance('IC-3'), 'IC-3')
    expect(copy.sent).toHaveLength(1)
    expect(told(built)).not.toContain(RS_68.text.ja)
  })
})
