// DFC-707 spec-only cases: FR-102 / T-280 -- the record's frame lines tell the palette as minimised only while it is shown and minimised; a hidden palette has no fold to tell.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Clipboard, ClipboardContent } from '../../src/adapter/clipboard-gateway/clipboard'
import { keyOfRow, shellStage, surfaceOfEntrance, type ShellStage } from './cr-610-file-flow-stage'
import { unbroken } from './spec-table'

const MACHINES = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8'))
const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see T-280
const HIDDEN_HAS_NO_CHILD = /paletteDisplayStateMachine_hidden : hidden\n/
const SHOWN_MINIMISED_STATE = 'paletteDisplayStateMachine_shown_minimised'
const FR_102_SHOWN_BY_BAND = '掴み帯に載せた `IC-76` の押下状態で読ませる'

const RECORD_ENTRANCE = 'IC-76'
const MINIMISE_ENTRANCE = 'IC-75'
const TOGGLE_KEY = 'SK-14'

function recordingClipboard(): { readonly clipboard: Clipboard; readonly sent: ClipboardContent[] } {
  const sent: ClipboardContent[] = []
  return {
    sent,
    clipboard: {
      writeClipboardContent: async (content) => {
        sent.push(content)
        return { ok: true }
      },
    },
  }
}

// see IC-76, IC-75, SK-14
async function recordWithPaletteStates(): Promise<{ readonly shownThenMinimised: string[]; readonly hidden: string[] }> {
  const copy = recordingClipboard()
  const built: ShellStage = await shellStage({ clipboard: copy.clipboard })
  await built.press(surfaceOfEntrance(RECORD_ENTRANCE), RECORD_ENTRANCE)
  await built.press(surfaceOfEntrance(MINIMISE_ENTRANCE), MINIMISE_ENTRANCE)
  await built.key(keyOfRow(TOGGLE_KEY))
  await built.repaint()
  await built.key(keyOfRow(TOGGLE_KEY))
  await built.press(surfaceOfEntrance(RECORD_ENTRANCE), RECORD_ENTRANCE)
  const handed = copy.sent.find((one) => one.kind === 'record')
  if (handed === undefined) throw new Error('precondition: stopping the record handed nothing to the clipboard')
  const lines = handed.text.split('\n').slice(3)
  const shownThenMinimised: string[] = []
  const hidden: string[] = []
  let hiding = false
  let hides = 0
  for (const line of lines) {
    const cells = line.split('\t')
    if (cells[2] === 'in.key') {
      hides += 1
      hiding = hides === 1
      continue
    }
    if (cells[2] !== 'frame') continue
    if (hiding) hidden.push(cells[3] ?? '')
    else if (hides === 0) shownThenMinimised.push(cells[3] ?? '')
  }
  return { shownThenMinimised, hidden }
}

describe('DFC-707 -- the manuscript these cases are driven by', () => {
  it('T-280: the hidden state of the palette machine holds no child; the minimised fold is a child of shown', () => {
    expect(MACHINES).toMatch(HIDDEN_HAS_NO_CHILD)
    expect(MACHINES).toContain(SHOWN_MINIMISED_STATE)
  })

  it('FR-102: a minimised palette is read from IC-76 on the grab band', () => {
    expect(REQUIREMENTS).toContain(FR_102_SHOWN_BY_BAND)
  })
})

describe('DFC-707 -- FR-102 the record while the palette is hidden', () => {
  it('T-280 control: frames drawn while the palette is shown and minimised say minimised', async () => {
    const { shownThenMinimised } = await recordWithPaletteStates()
    expect(shownThenMinimised.length, 'precondition: no frame line before the hide').toBeGreaterThan(0)
    expect(shownThenMinimised[shownThenMinimised.length - 1]).toContain('minimised=true')
  })

  it('T-280: frames drawn while the palette is hidden never say minimised', async () => {
    const { hidden } = await recordWithPaletteStates()
    expect(hidden.length, 'precondition: no frame line while hidden').toBeGreaterThan(0)
    for (const detail of hidden) expect(detail).toContain('minimised=false')
  })
})
