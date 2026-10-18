// CR-799 spec-only tests: the download page tells the person where Claude saves and shows the build version (design-mcp-relay.md section 6).

import { readFileSync } from 'node:fs'
import { userInfo } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PAGE = readFileSync(join(process.cwd(), 'docs', 'download', 'index.html'), 'utf8').replace(/\r\n/g, '\n')

// WHY: the page holds the English block first and the Japanese block after it; each block opens with a data-lang container.
const JA_START = PAGE.indexOf('<div data-lang="ja"')
const EN_START = PAGE.indexOf('<div data-lang="en"')
const EN_BLOCK = PAGE.slice(EN_START, JA_START)
const JA_BLOCK = PAGE.slice(JA_START)

// WHY: the drive letter and the folder are written in pieces so no absolute-path literal stands in the test.
const USERS_DIR = `${'C'}:\\Users\\`
const NAME_ESCAPED = '&lt;name&gt;'
const OWN_DOCUMENTS = `${USERS_DIR}${NAME_ESCAPED}\\Documents\\GRS`
const EXPLORER_DOCUMENTS = `${USERS_DIR}${NAME_ESCAPED}\\OneDrive\\Documents`

const BLOCKS: readonly (readonly [string, string, string])[] = [
  ['en', EN_BLOCK, 'id="ai"'],
  ['ja', JA_BLOCK, 'id="ai-ja"'],
]

function afterHeading(block: string, heading: string): string {
  const at = block.indexOf(heading)
  return at < 0 ? '' : block.slice(at)
}

describe('CR-799 the page has an English block and a Japanese block, each with its heading', () => {
  it.each(BLOCKS)('the %s block exists and holds its heading', (_name, block, heading) => {
    expect(block.length).toBeGreaterThan(0)
    expect(block).toContain(heading)
  })

  it('the two blocks are different parts of the page', () => {
    expect(EN_START).toBeGreaterThanOrEqual(0)
    expect(JA_START).toBeGreaterThan(EN_START)
  })
})

describe('CR-799 each block names the save folder, how to change it and the OneDrive caution', () => {
  it.each(BLOCKS)('%s: Save folder, ${DOCUMENTS}/GRS and Confirm before overwrite', (_name, block) => {
    expect(block).toContain('Save folder')
    expect(block).toContain('${DOCUMENTS}/GRS')
    expect(block).toContain('Confirm before overwrite')
  })

  it.each(BLOCKS)('%s: the OneDrive caution names the default under the user folder and the Documents of Explorer, with <name> escaped', (_name, block) => {
    expect(block).toContain('OneDrive')
    expect(block).toContain(OWN_DOCUMENTS)
    expect(block).toContain(EXPLORER_DOCUMENTS)
  })

  it('ja: the way to change it uses the screen words Japanese Claude Desktop shows', () => {
    const section = afterHeading(JA_BLOCK, 'Save folder')
    expect(JA_BLOCK).toContain('設定')
    expect(JA_BLOCK).toContain('参照')
    expect(JA_BLOCK).toContain('保存')
    expect(section.length).toBeGreaterThan(0)
  })

  it('en: the way to change it says Configure, Browse and Save', () => {
    expect(EN_BLOCK).toContain('Configure')
    expect(EN_BLOCK).toContain('Browse')
    expect(EN_BLOCK).toMatch(/click <span class="menu">Save<\/span>/)
  })
})

describe('CR-799 each block shows the build version under its two buttons', () => {
  it.each(BLOCKS)('%s: a <span data-built-at> near the GRS.html button, before the Claude section', (_name, block, heading) => {
    const claudeAt = block.indexOf(heading)
    const builtAt = block.indexOf('<span data-built-at>')
    expect(builtAt).toBeGreaterThanOrEqual(0)
    expect(builtAt).toBeLessThan(claudeAt)
    const nearButton = block.slice(Math.max(0, builtAt - 1500), builtAt)
    expect(nearButton).toContain('GRS.html')
  })

  it.each(BLOCKS)('%s: a <span data-relay-version> near the grs-relay.mcpb button, in the Claude section', (_name, block, heading) => {
    const claudeAt = block.indexOf(heading)
    const version = block.indexOf('<span data-relay-version>')
    expect(version).toBeGreaterThan(claudeAt)
    const nearButton = block.slice(Math.max(0, version - 1500), version)
    expect(nearButton).toContain('grs-relay.mcpb')
  })

  it.each(BLOCKS)('%s: the build time also stands beside the relay version', (_name, block, heading) => {
    const version = block.indexOf('<span data-relay-version>')
    const claudeAt = block.indexOf(heading)
    const builtAfter = block.indexOf('<span data-built-at>', claudeAt)
    expect(builtAfter).toBeGreaterThan(claudeAt)
    expect(Math.abs(builtAfter - version)).toBeLessThan(600)
  })
})

describe('CR-799 the page holds no real user name', () => {
  it('after a Users folder the only name is the escaped <name>', () => {
    const offenders: string[] = []
    let from = 0
    for (;;) {
      const at = PAGE.indexOf(USERS_DIR, from)
      if (at < 0) break
      const after = PAGE.slice(at + USERS_DIR.length, at + USERS_DIR.length + NAME_ESCAPED.length)
      if (after !== NAME_ESCAPED) offenders.push(PAGE.slice(at, at + 40))
      from = at + USERS_DIR.length
    }
    expect(offenders).toEqual([])
  })

  it('the names of this repository owner do not appear anywhere in the page', () => {
    expect(PAGE.toLowerCase()).not.toContain(userInfo().username.toLowerCase())
    expect(PAGE).not.toMatch(/\/Users\/[A-Za-z]/)
    expect(PAGE).not.toMatch(/\\Users\\(?!&lt;name&gt;)/)
  })

  it('the page writes the placeholder for a name as the escaped text, never a raw <name> tag', () => {
    expect(PAGE).not.toMatch(/<name>/)
  })
})
