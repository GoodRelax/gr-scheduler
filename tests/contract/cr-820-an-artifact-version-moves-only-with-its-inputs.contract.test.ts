// CR-820 spec-only tests (design-mcp-relay section 6): an artifact version moves only with its inputs.

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

interface Version {
  readonly builtAt: string
  readonly semver: string
}

interface RelayVersionTool {
  readonly artifactBuiltAt: (key: string, root?: string) => string
  readonly buildVersion: (root?: string) => Version
}

const TOOLS = join(process.cwd(), 'tools')
const VERSIONS_TOOL = join(TOOLS, 'artifact_versions.mjs')
const RELAY_VERSION_TOOL = join(TOOLS, 'relay_version.mjs')
const VERSIONS_FILE = join('tools', 'artifact-versions.json')
const BUILT_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

// WHY: the build tools are plain .mjs files with no type declarations; they are loaded by path and typed here.
async function relayVersion(): Promise<RelayVersionTool> {
  return (await import(pathToFileURL(RELAY_VERSION_TOOL).href)) as RelayVersionTool
}

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function temporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'grs-cr820-'))
  roots.push(root)
  return root
}

function versionsText(relayAt: string, demoAt: string): string {
  return `${JSON.stringify(
    {
      grsRelayBuiltAt: relayAt,
      grsRelayInputs: ['src', 'package-lock.json'],
      serverSyncDemoBuiltAt: demoAt,
      serverSyncDemoInputs: ['demo/server-sync'],
    },
    null,
    1,
  )}\n`
}

function put(root: string, path: string, text: string): void {
  const full = join(root, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, text, 'utf8')
}

function git(root: string, args: string[], at?: string): string {
  const env: NodeJS.ProcessEnv = { ...process.env }
  if (at !== undefined) {
    env['GIT_AUTHOR_DATE'] = at
    env['GIT_COMMITTER_DATE'] = at
  }
  const done = spawnSync('git', ['-c', 'user.name=cr820', '-c', 'user.email=cr820@example.invalid', '-c', 'commit.gpgsign=false', ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
  })
  if (done.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${done.stderr}`)
  return done.stdout
}

function commitAll(root: string, message: string, at: string): void {
  git(root, ['add', '-A'])
  git(root, ['commit', '-q', '-m', message], at)
}

function tool(root: string, args: string[]): { status: number | null; output: string } {
  const done = spawnSync(process.execPath, [VERSIONS_TOOL, ...args], {
    cwd: root,
    env: { ...process.env, GRS_ARTIFACT_ROOT: root },
    encoding: 'utf8',
  })
  return { status: done.status, output: `${done.stdout}${done.stderr}` }
}

const read = (root: string, path: string): string => readFileSync(join(root, path), 'utf8')

// WHY: a first commit holds inputs and a version together, so the starting state is the one a bump leaves behind.
function repoWithBumpedVersions(): string {
  const root = temporaryRoot()
  git(root, ['init', '-q'])
  put(root, 'src/main.ts', 'export const one = 1\n')
  put(root, 'package-lock.json', '{}\n')
  put(root, 'demo/server-sync/start.txt', 'start\n')
  put(root, 'docs/readme.md', 'first\n')
  put(root, VERSIONS_FILE, versionsText('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'))
  commitAll(root, 'inputs and versions', '2026-01-01T00:00:00Z')
  return root
}

describe('CR-820 relay_version reads the file, never git', () => {
  it('buildVersion(root) is the file time and its semver, in a folder that is not a git repository', async () => {
    const root = temporaryRoot()
    put(root, VERSIONS_FILE, versionsText('2026-10-18T08:12:34Z', '2026-01-05T00:12:34Z'))
    const { buildVersion } = await relayVersion()
    expect(buildVersion(root)).toEqual({ builtAt: '2026-10-18T08:12:34Z', semver: '2026.1018.81234' })
  })

  it('artifactBuiltAt reads each key of the file by its own name', async () => {
    const root = temporaryRoot()
    put(root, VERSIONS_FILE, versionsText('2026-10-18T08:12:34Z', '2026-01-05T00:12:34Z'))
    const { artifactBuiltAt } = await relayVersion()
    expect(artifactBuiltAt('grsRelayBuiltAt', root)).toBe('2026-10-18T08:12:34Z')
    expect(artifactBuiltAt('serverSyncDemoBuiltAt', root)).toBe('2026-01-05T00:12:34Z')
  })

  it('semver drops the leading zeros of the month-day and the time-of-day numbers (2026-01-05T00:12:34Z gives 2026.105.1234)', async () => {
    const root = temporaryRoot()
    put(root, VERSIONS_FILE, versionsText('2026-01-05T00:12:34Z', '2026-01-05T00:12:34Z'))
    const { buildVersion } = await relayVersion()
    expect(buildVersion(root).semver).toBe('2026.105.1234')
  })

  it('a missing value throws', async () => {
    const root = temporaryRoot()
    put(root, VERSIONS_FILE, `${JSON.stringify({ grsRelayInputs: ['src'], serverSyncDemoBuiltAt: '2026-01-05T00:12:34Z' })}\n`)
    const { artifactBuiltAt, buildVersion } = await relayVersion()
    expect(() => artifactBuiltAt('grsRelayBuiltAt', root)).toThrow()
    expect(() => buildVersion(root)).toThrow()
  })

  it.each(['2026-10-18 08:12:34', '2026-10-18T08:12:34', '2026-10-18T08:12Z', 'yesterday', ''])('a malformed value (%j) throws', async (bad) => {
    const root = temporaryRoot()
    put(root, VERSIONS_FILE, versionsText(bad, '2026-01-05T00:12:34Z'))
    const { artifactBuiltAt, buildVersion } = await relayVersion()
    expect(() => artifactBuiltAt('grsRelayBuiltAt', root)).toThrow()
    expect(() => buildVersion(root)).toThrow()
  })

  it('a folder with no tools/artifact-versions.json throws', async () => {
    const root = temporaryRoot()
    const { buildVersion } = await relayVersion()
    expect(() => buildVersion(root)).toThrow()
  })

  it('running node tools/relay_version.mjs prints the JSON of buildVersion() for the repository file', async () => {
    const done = spawnSync(process.execPath, [RELAY_VERSION_TOOL], { cwd: process.cwd(), encoding: 'utf8' })
    expect(done.status).toBe(0)
    const printed = JSON.parse(done.stdout) as Version
    const { buildVersion } = await relayVersion()
    expect(printed).toEqual(buildVersion())
    const file = JSON.parse(readFileSync(join(process.cwd(), VERSIONS_FILE), 'utf8')) as { grsRelayBuiltAt: string }
    expect(printed.builtAt).toBe(file.grsRelayBuiltAt)
    expect(printed.builtAt).toMatch(BUILT_AT)
  })

  it('the repository file lists the relay inputs and the demo inputs the specification names', () => {
    const file = JSON.parse(readFileSync(join(process.cwd(), VERSIONS_FILE), 'utf8')) as {
      grsRelayInputs: string[]
      serverSyncDemoBuiltAt: string
      serverSyncDemoInputs: string[]
    }
    expect([...file.grsRelayInputs].sort()).toEqual(
      [
        'src',
        'dist/index.html',
        'vite.relay.config.ts',
        'tools/build_relay_bundle.mjs',
        'tools/relay_version.mjs',
        'docs/spec/_source/grs-document.schema.json',
        'docs/spec/_source/grs-commands.schema.json',
        'package-lock.json',
      ].sort(),
    )
    expect(file.serverSyncDemoBuiltAt).toMatch(BUILT_AT)
    expect(file.serverSyncDemoInputs).toContain('demo/server-sync')
    expect(file.serverSyncDemoInputs).toContain('dist/index.html')
  })
})

describe('CR-820 check is green until an input changes without a bump', () => {
  it('inputs and a version committed together are green', () => {
    const root = repoWithBumpedVersions()
    const answer = tool(root, ['check'])
    expect(answer.status, answer.output).toBe(0)
    expect(answer.output).toMatch(/^OK/m)
    expect(answer.output).not.toMatch(/^FAIL/m)
  })

  it('a docs-only commit stays green and moves neither the version nor the version file', async () => {
    const root = repoWithBumpedVersions()
    const { buildVersion } = await relayVersion()
    const before = buildVersion(root)
    const fileBefore = read(root, VERSIONS_FILE)
    put(root, 'docs/readme.md', 'changed\n')
    put(root, 'docs/another.md', 'new\n')
    commitAll(root, 'docs only', '2026-02-01T00:00:00Z')
    const answer = tool(root, ['check'])
    expect(answer.status, answer.output).toBe(0)
    expect(buildVersion(root)).toEqual(before)
    expect(read(root, VERSIONS_FILE)).toBe(fileBefore)
  })

  it('an input changed in a commit with no bump is red, and a FAIL line names the artifact', () => {
    const root = repoWithBumpedVersions()
    put(root, 'src/main.ts', 'export const one = 2\n')
    commitAll(root, 'input without bump', '2026-02-01T00:00:00Z')
    const answer = tool(root, ['check'])
    expect(answer.status, answer.output).toBe(1)
    expect(answer.output).toMatch(/^FAIL.*grsRelay/m)
  })

  it('a demo input changed with no bump is red for the demo, and the relay key is not blamed', () => {
    const root = repoWithBumpedVersions()
    put(root, 'demo/server-sync/start.txt', 'changed\n')
    commitAll(root, 'demo input without bump', '2026-02-01T00:00:00Z')
    const answer = tool(root, ['check'])
    expect(answer.status, answer.output).toBe(1)
    expect(answer.output).toMatch(/^FAIL.*serverSyncDemo/m)
    expect(answer.output).not.toMatch(/^FAIL.*grsRelay/m)
  })

  it('a new file under an input folder counts as an input change', () => {
    const root = repoWithBumpedVersions()
    put(root, 'src/added/deep.ts', 'export const two = 2\n')
    commitAll(root, 'new input file', '2026-02-01T00:00:00Z')
    const answer = tool(root, ['check'])
    expect(answer.status, answer.output).toBe(1)
    expect(answer.output).toMatch(/^FAIL.*grsRelay/m)
  })

  it('bump then commit is green, and the written time is the input commit committer time', async () => {
    const root = repoWithBumpedVersions()
    put(root, 'src/main.ts', 'export const one = 2\n')
    commitAll(root, 'input change', '2026-05-06T07:08:09Z')
    const bumped = tool(root, ['bump', 'grsRelay'])
    expect(bumped.status, bumped.output).toBe(0)
    expect(bumped.output).toContain('grsRelayBuiltAt = 2026-05-06T07:08:09Z')
    const { buildVersion } = await relayVersion()
    expect(buildVersion(root)).toEqual({ builtAt: '2026-05-06T07:08:09Z', semver: '2026.506.70809' })
    commitAll(root, 'bump', '2026-05-07T00:00:00Z')
    const answer = tool(root, ['check'])
    expect(answer.status, answer.output).toBe(0)
  })

  it('bump grsRelay rewrites only that key BuiltAt line and leaves the demo version and the input lists alone', () => {
    const root = repoWithBumpedVersions()
    put(root, 'src/main.ts', 'export const one = 2\n')
    commitAll(root, 'input change', '2026-05-06T07:08:09Z')
    const before = read(root, VERSIONS_FILE).split('\n')
    expect(tool(root, ['bump', 'grsRelay']).status).toBe(0)
    const after = read(root, VERSIONS_FILE).split('\n')
    expect(after).toHaveLength(before.length)
    const changed = after.filter((line, at) => line !== before[at])
    expect(changed).toHaveLength(1)
    expect(changed[0]).toContain('grsRelayBuiltAt')
  })

  it('bumping the relay does not clear a stale demo: the demo key still goes red until it is bumped itself', () => {
    const root = repoWithBumpedVersions()
    put(root, 'src/main.ts', 'export const one = 2\n')
    put(root, 'demo/server-sync/start.txt', 'changed\n')
    commitAll(root, 'both inputs', '2026-05-06T07:08:09Z')
    expect(tool(root, ['bump', 'grsRelay']).status).toBe(0)
    commitAll(root, 'bump relay', '2026-05-07T00:00:00Z')
    const half = tool(root, ['check'])
    expect(half.status, half.output).toBe(1)
    expect(half.output).toMatch(/^FAIL.*serverSyncDemo/m)
    const bumped = tool(root, ['bump', 'serverSyncDemo'])
    expect(bumped.status, bumped.output).toBe(0)
    expect(bumped.output).toContain('serverSyncDemoBuiltAt = 2026-05-06T07:08:09Z')
    commitAll(root, 'bump demo', '2026-05-08T00:00:00Z')
    const done = tool(root, ['check'])
    expect(done.status, done.output).toBe(0)
  })

  it('an uncommitted input change is red, and an uncommitted bump (the present time) makes it green', () => {
    const root = repoWithBumpedVersions()
    put(root, 'src/main.ts', 'export const one = 3\n')
    const red = tool(root, ['check'])
    expect(red.status, red.output).toBe(1)
    expect(red.output).toMatch(/^FAIL.*grsRelay/m)
    const askedAfter = Date.now() - 2000
    const bumped = tool(root, ['bump', 'grsRelay'])
    const askedBefore = Date.now() + 2000
    expect(bumped.status, bumped.output).toBe(0)
    const written = /grsRelayBuiltAt = (\S+)/.exec(bumped.output)?.[1] ?? ''
    expect(written).toMatch(BUILT_AT)
    const writtenMs = Date.parse(written)
    expect(writtenMs).toBeGreaterThanOrEqual(askedAfter - 1000)
    expect(writtenMs).toBeLessThanOrEqual(askedBefore)
    expect(read(root, VERSIONS_FILE)).toContain(written)
    const green = tool(root, ['check'])
    expect(green.status, green.output).toBe(0)
  })

  it('an uncommitted change to a file that is not an input stays green', () => {
    const root = repoWithBumpedVersions()
    put(root, 'docs/readme.md', 'dirty\n')
    const answer = tool(root, ['check'])
    expect(answer.status, answer.output).toBe(0)
  })
})

describe('CR-820 bad usage exits 2', () => {
  it('bump with an unknown artifact name exits 2 and leaves the file as it was', () => {
    const root = repoWithBumpedVersions()
    const before = read(root, VERSIONS_FILE)
    const answer = tool(root, ['bump', 'nope'])
    expect(answer.status, answer.output).toBe(2)
    expect(read(root, VERSIONS_FILE)).toBe(before)
  })

  it('bump with no artifact name exits 2', () => {
    const root = repoWithBumpedVersions()
    const answer = tool(root, ['bump'])
    expect(answer.status, answer.output).toBe(2)
  })
})
