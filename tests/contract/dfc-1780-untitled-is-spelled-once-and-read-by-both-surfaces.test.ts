// DFC-1780: `Untitled` (FR-035 tab heading, OP-16 step 3) is spelled in one place in src/, published by ScreenRenderer (T-064 PI-37), and read by both.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import * as screenRenderer from '../../src/adapter/screen-renderer/screen-renderer'
import { oneByRole } from '../fixtures/fake-browser'
import {
  OPEN_CHOOSER,
  jsonBytes,
  shellStage,
  surfaceOfEntrance,
  there,
} from './cr-610-file-flow-stage'
import { specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each clause is cut from the manuscript as check 39 reads it, so the cases cannot drift from the words they test.
const FR_035_UNTITLED = '`title` が `null` のときは、タブの見出しを `Untitled` とすること（MUST）'
const FR_035_NOT_TRANSLATED = '⚠️ **画面の言語で切り替えない**'
const PI_37_ONE_PLACE = '公開したのは、綴りを `src/` の 2 か所に置かないためである'

describe('DFC-1780 the manuscript these cases are driven by', () => {
  it('FR-035 still gives the tab heading Untitled and keeps it out of the screen language', () => {
    expect(REQUIREMENTS).toContain(FR_035_UNTITLED)
    expect(REQUIREMENTS).toContain(FR_035_NOT_TRANSLATED)
  })

  it('T-064 PI-37 still publishes UNTITLED_DOCUMENT_TITLE from ScreenRenderer, to keep the spelling in one place', () => {
    const row = specTable('T-064').rows.find((one) => one.id === 'PI-37')
    expect(row, 'premise: table T-064 has PI-37').toBeDefined()
    const text = unbroken((row?.cells ?? []).join(' '))
    expect(text).toContain('ScreenRenderer')
    expect(text).toContain('UNTITLED_DOCUMENT_TITLE')
    expect(text).toContain(PI_37_ONE_PLACE)
  })
})

const WORD = 'Untitled'

describe('R2.21 / PI-37 (MUST): ScreenRenderer publishes the word, and src/ spells it in one place (DFC-1780)', () => {
  it('the ScreenRenderer entry publishes UNTITLED_DOCUMENT_TITLE as the FR-035 word', () => {
    expect((screenRenderer as unknown as Record<string, unknown>)['UNTITLED_DOCUMENT_TITLE']).toBe(WORD)
  })

  // WHY: the ledger counts the spelling as a quoted literal in src/ (two quotes, not a comment or a doc word).
  it('the quoted spelling appears once under src/', () => {
    const found: string[] = []
    const walk = (folder: string): void => {
      for (const name of readdirSync(folder)) {
        const path = join(folder, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.tsx?$/.test(name)) {
          for (const [at, line] of readFileSync(path, 'utf8').split('\n').entries()) {
            if (/^\s*\/\//.test(line)) continue
            if (/(['"`])Untitled\1/.test(line)) found.push(`${path}:${at + 1}`)
          }
        }
      }
    }
    walk(join(process.cwd(), 'src'))
    expect(found, 'one spelling, so the tab heading and the Open Chooser cannot drift apart').toHaveLength(1)
  })
})

describe('OP-16 step 3 (MUST): the Open Chooser shows Untitled for a document with no title, in either screen language (DFC-1780)', () => {
  async function chooserText(switchLanguage: boolean): Promise<string> {
    const built = await shellStage({ dom: true })
    if (switchLanguage) await built.press(surfaceOfEntrance('IC-21'), 'IC-21')
    const document = there()
    const untitled = { ...document, schedule: { ...document.schedule, project: { ...document.schedule.project, title: null } } }
    await built.open(built.file('theirs.json', jsonBytes(untitled)))
    expect(built.last().openModal, 'premise: the open raised the chooser').not.toBeNull()
    return oneByRole(built.domRoot(), OPEN_CHOOSER()).textContent
  }

  it('on the first screen language', async () => {
    expect(await chooserText(false)).toContain(WORD)
  })

  it('after the screen language is switched (FR-035: not translated)', async () => {
    expect(await chooserText(true)).toContain(WORD)
  })
})
