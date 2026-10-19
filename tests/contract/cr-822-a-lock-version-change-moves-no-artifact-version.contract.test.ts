// CR-822 / JDG-2986: a package-lock.json change of its own version alone is no input change (check 85).

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

const VERSIONS_TOOL = join(process.cwd(), 'tools', 'artifact_versions.mjs')

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function put(root: string, path: string, text: string): void {
  const full = join(root, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, text, 'utf8')
}

function git(root: string, args: string[], at: string): void {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at }
  const done = spawnSync('git', ['-c', 'user.name=cr822', '-c', 'user.email=cr822@example.invalid', '-c', 'commit.gpgsign=false', ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
  })
  if (done.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${done.stderr}`)
}

function commitAll(root: string, at: string): void {
  git(root, ['add', '-A'], at)
  git(root, ['commit', '-q', '-m', at], at)
}

function check(root: string): { status: number | null; output: string } {
  const done = spawnSync('node', [VERSIONS_TOOL, 'check'], { env: { ...process.env, GRS_ARTIFACT_ROOT: root }, encoding: 'utf8' })
  return { status: done.status, output: `${done.stdout}${done.stderr}` }
}

function lockText(version: string, dependency: string): string {
  const lock = { name: 'x', version, lockfileVersion: 3, packages: { '': { name: 'x', version }, 'node_modules/dep': { version: dependency } } }
  return `${JSON.stringify(lock, null, 2)}\n`
}

// WHY: a repository whose relay version was written with its last input change, so check 85 starts green.
function greenRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'grs-cr822-'))
  roots.push(root)
  git(root, ['init', '-q'], '2026-01-01T00:00:00Z')
  put(root, 'src/a.ts', 'export const a = 1\n')
  put(root, 'package-lock.json', lockText('0.0.0', '1.0.0'))
  const versions = { grsRelayBuiltAt: '2026-01-01T00:00:00Z', grsRelayInputs: ['src', 'package-lock.json'], serverSyncDemoBuiltAt: '2026-01-01T00:00:00Z', serverSyncDemoInputs: ['demo'] }
  put(root, 'tools/artifact-versions.json', `${JSON.stringify(versions, null, 1)}\n`)
  put(root, 'demo/b.txt', 'b\n')
  commitAll(root, '2026-01-01T00:00:00Z')
  return root
}

describe('CR-822 check 85 and the version of package-lock.json', () => {
  it('starts green', () => {
    expect(check(greenRoot()).status).toBe(0)
  })

  it('an uncommitted change of only the lock own versions asks for no bump', () => {
    const root = greenRoot()
    put(root, 'package-lock.json', lockText('20261019T022508Z', '1.0.0'))
    expect(check(root).status).toBe(0)
  })

  it('a committed change of only the lock own versions asks for no bump', () => {
    const root = greenRoot()
    put(root, 'package-lock.json', lockText('20261019T022508Z', '1.0.0'))
    commitAll(root, '2026-01-02T00:00:00Z')
    expect(check(root).status).toBe(0)
  })

  it('a dependency version change in the lock still asks for a bump, committed or not', () => {
    const root = greenRoot()
    put(root, 'package-lock.json', lockText('0.0.0', '1.0.1'))
    expect(check(root).status).toBe(1)
    commitAll(root, '2026-01-02T00:00:00Z')
    const after = check(root)
    expect(after.status).toBe(1)
    expect(after.output).toContain('grsRelay')
  })
})
