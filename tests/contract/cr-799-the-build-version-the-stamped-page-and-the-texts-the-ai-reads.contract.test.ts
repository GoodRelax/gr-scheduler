// CR-799 spec-only tests: the build version (YEAR.MMDD.HHMMSS), the stamped download page, the refusal texts and the tool texts the AI reads.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

import { mcpInstructions, mcpToolList, pageNotConnectedResult } from '../../src/adapter/mcp-tool-translator/mcp-tool-translator'

type Json = Record<string, unknown>

interface Version {
  readonly builtAt: string
  readonly semver: string
}

// WHY: the build tools are plain .mjs files with no type declarations; they are loaded by path and typed here.
async function loadTool(name: string): Promise<Record<string, (...rest: never[]) => unknown>> {
  return (await import(pathToFileURL(join(process.cwd(), 'tools', name)).href)) as Record<string, (...rest: never[]) => unknown>
}

async function versionOfInstant(epochSeconds: number): Promise<Version> {
  const tool = await loadTool('relay_version.mjs')
  return (tool['versionOfInstant'] as unknown as (seconds: number) => Version)(epochSeconds)
}

const SEMVER_CORE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const BUILT_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

const partsOf = (semver: string): number[] => semver.split('.').map(Number)

function isLater(a: string, b: string): boolean {
  const left = partsOf(a)
  const right = partsOf(b)
  for (let at = 0; at < 3; at++) {
    if ((left[at] ?? 0) !== (right[at] ?? 0)) return (left[at] ?? 0) > (right[at] ?? 0)
  }
  return false
}

const epochOf = (iso: string): number => Date.parse(iso) / 1000

describe('CR-799 the version of a build is the commit instant: builtAt for people, a semver core for installers', () => {
  it('the specification example: 2026-01-05T00:12:34Z gives builtAt as written and semver 2026.105.1234', async () => {
    const version = await versionOfInstant(epochOf('2026-01-05T00:12:34Z'))
    expect(version.builtAt).toBe('2026-01-05T00:12:34Z')
    expect(version.semver).toBe('2026.105.1234')
  })

  it('the specification example: 2026-10-18T08:12:34Z gives semver 2026.1018.81234', async () => {
    const version = await versionOfInstant(epochOf('2026-10-18T08:12:34Z'))
    expect(version.builtAt).toBe('2026-10-18T08:12:34Z')
    expect(version.semver).toBe('2026.1018.81234')
  })

  it.each(['2026-01-05T00:12:34Z', '2026-10-18T08:12:34Z', '2027-12-31T23:59:59Z', '2026-03-01T00:00:00Z', '2026-11-09T09:05:07Z'])(
    '%s: builtAt has the form YYYY-MM-DDTHH:MM:SSZ and semver is three numbers without leading zeros',
    async (iso) => {
      const version = await versionOfInstant(epochOf(iso))
      expect(version.builtAt).toMatch(BUILT_AT)
      expect(version.builtAt).toBe(iso)
      expect(version.semver).toMatch(SEMVER_CORE)
      expect(version.semver).not.toContain('-')
      expect(version.semver).not.toContain('+')
    },
  )

  it('a later instant gives a larger semver, compared part by part as numbers', async () => {
    const instants = [
      '2026-01-05T00:12:34Z',
      '2026-01-05T00:12:35Z',
      '2026-01-05T00:13:00Z',
      '2026-01-05T09:00:00Z',
      '2026-01-05T10:00:00Z',
      '2026-01-06T00:00:00Z',
      '2026-02-01T00:00:00Z',
      '2026-10-18T08:12:34Z',
      '2026-12-31T23:59:59Z',
      '2027-01-01T00:00:00Z',
    ]
    const semvers: string[] = []
    for (const iso of instants) semvers.push((await versionOfInstant(epochOf(iso))).semver)
    for (let at = 1; at < semvers.length; at++) {
      expect(isLater(semvers[at] ?? '', semvers[at - 1] ?? ''), `${instants[at] ?? ''} after ${instants[at - 1] ?? ''}`).toBe(true)
    }
  })
})

const STAMP_VERSION: Version = { builtAt: '2026-10-18T08:12:34Z', semver: '2026.1018.81234' }

async function stampedPage(html: string, version: Version): Promise<string> {
  const tool = await loadTool('stamp_download_page.mjs')
  return (tool['stampedPage'] as unknown as (page: string, given: Version) => string)(html, version)
}

describe('CR-799 the download page is stamped with the version at publish time', () => {
  const PLACEHOLDER = '(placeholder)'
  const page =
    `<p>A <span data-built-at>${PLACEHOLDER}</span> and <span data-relay-version>${PLACEHOLDER}</span></p>` +
    `<p>B <span data-built-at>${PLACEHOLDER}</span> and <span data-relay-version>${PLACEHOLDER}</span></p>`

  it('every <span data-built-at> gets builtAt and every <span data-relay-version> gets semver', async () => {
    const out = await stampedPage(page, STAMP_VERSION)
    expect(out.match(/<span data-built-at>2026-10-18T08:12:34Z<\/span>/g)).toHaveLength(2)
    expect(out.match(/<span data-relay-version>2026\.1018\.81234<\/span>/g)).toHaveLength(2)
    expect(out).not.toContain(PLACEHOLDER)
  })

  it('the rest of the page is left as it was', async () => {
    const out = await stampedPage(page, STAMP_VERSION)
    expect(out.replace(/<span data-[a-z-]+>[^<]*<\/span>/g, '')).toBe(page.replace(/<span data-[a-z-]+>[^<]*<\/span>/g, ''))
  })

  it('a page without the placeholders throws', async () => {
    await expect(stampedPage('<p>no stamps here</p>', STAMP_VERSION)).rejects.toThrow()
  })

  it('a page with only one of the two kinds of placeholder throws', async () => {
    await expect(stampedPage('<span data-built-at>x</span>', STAMP_VERSION)).rejects.toThrow()
    await expect(stampedPage('<span data-relay-version>x</span>', STAMP_VERSION)).rejects.toThrow()
  })

  it('the page source holds the placeholders and no hand-written version', () => {
    const source = readFileSync(join(process.cwd(), 'docs', 'download', 'index.html'), 'utf8')
    expect(source).not.toMatch(/<span data-built-at>\s*\d{4}-\d{2}-\d{2}T/)
    expect(source).not.toMatch(/<span data-relay-version>\s*\d{4}\.\d+\.\d+</)
  })
})

const descriptions = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'adapter', 'mcp-tool-translator', 'mcp-tool-descriptions.json'), 'utf8'),
) as { tools: { name: string; description: string; inputSchema: unknown }[]; relayRefusals: Record<string, string> }

const ROW_ID = /\b[A-Z]{1,4}-\d+[a-z]?\b/g

function descriptionsIn(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const one of value) descriptionsIn(one, found)
  } else if (value !== null && typeof value === 'object') {
    for (const [key, one] of Object.entries(value as Json)) {
      if (key === 'description' && typeof one === 'string') found.push(one)
      else descriptionsIn(one, found)
    }
  }
  return found
}

describe('CR-799 the tool texts the AI reads carry no specification row id', () => {
  it('no tool description, and no description inside an input shape, holds a row id', () => {
    const offenders: string[] = []
    for (const tool of descriptions.tools) {
      for (const text of [tool.description, ...descriptionsIn(tool.inputSchema)]) {
        for (const hit of text.match(ROW_ID) ?? []) offenders.push(`${tool.name}: ${hit}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('the tools the relay lists carry no row id either', () => {
    const offenders: string[] = []
    for (const tool of mcpToolList()) {
      for (const text of [tool.description, ...descriptionsIn(tool.inputSchema)]) {
        for (const hit of text.match(ROW_ID) ?? []) offenders.push(`${tool.name}: ${hit}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('the instructions and the relay refusal texts hold no row id', () => {
    const texts = [mcpInstructions(), ...Object.values(descriptions.relayRefusals)]
    expect(texts.flatMap((one) => one.match(ROW_ID) ?? [])).toEqual([])
  })

  it('the instructions name readSchema as the way for a client that cannot read resources, not exportJson', () => {
    const text = mcpInstructions()
    expect(text).toContain('readSchema')
    expect(text).not.toMatch(/call exportJson/)
  })

  it('readSchema is among the tools and its text names both choices of which', () => {
    const tool = mcpToolList().find((one) => one.name === 'readSchema')
    expect(tool).toBeDefined()
    expect(JSON.stringify(tool)).toContain('document')
    expect(JSON.stringify(tool)).toContain('commands')
  })
})

describe('CR-799 refusal texts say what the person does and cite no table', () => {
  const ADDRESS = 'http://127.0.0.1:50123/#some-key-after-the-hash'

  it('pageNotConnected names the Agent API button in the page header', () => {
    const what = String(((pageNotConnectedResult(ADDRESS).structuredContent as Json)['refusal'] as Json)['what'])
    expect(what).toContain('Agent API button')
    expect(what).toContain('page header')
  })

  it('pageNotConnected carries the whole address, the part after # included', () => {
    const refusal = (pageNotConnectedResult(ADDRESS).structuredContent as Json)['refusal'] as Json
    expect(String(refusal['what'])).toContain(ADDRESS)
    expect(String(refusal['what'])).toMatch(/whole address|part after #/)
  })

  it('no refusal what the relay or the generated texts hold cites a table', () => {
    const texts = [...Object.values(descriptions.relayRefusals), String(((pageNotConnectedResult(ADDRESS).structuredContent as Json)['refusal'] as Json)['what'])]
    for (const text of texts) expect(text).not.toMatch(/table T-/i)
  })

  it('no string the page writes for a malformedRequest cites "table T-"', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'adapter', 'agent-api-endpoint', 'agent-api-members.ts'), 'utf8')
    const code = source
      .split(/\r?\n/)
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n')
    expect(code).not.toMatch(/table T-\d+/)
  })
})
