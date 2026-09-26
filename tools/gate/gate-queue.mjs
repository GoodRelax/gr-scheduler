// One gate at a time on this machine: a lock and a queue shared by every checkout of the repository.
//
//   node tools/gate/gate-queue.mjs list                    who holds the lock, what is queued, last results
//   node tools/gate/gate-queue.mjs enqueue GT-1|GT-2|PERF [--note text]
//                                                          queue a gate for the commit HEAD points at
//   node tools/gate/gate-queue.mjs drain [--once]          run the queue, one entry at a time (root only)
//   node tools/gate/gate-queue.mjs run -- <command ...>    run any command under the lock (vitest, e2e, parity)
//
// WHY. Two heavy runs at once lie: an e2e run beside another checkout's full vitest run gave four
// timeout reds that all passed alone (rule 04 section 6.8). Sessions cannot see each other's
// terminals, so the only thing that keeps them apart is a lock they all read.
//
// WHERE. The lock, the queue and the results live in the git COMMON directory (.git/grs-gate/),
// which the root checkout and every worktree share. A scratch clone has its own .git and its own
// lock -- it is not this repository.
//
// THE LOCK is a file created with O_EXCL. It records the holder's pid; a lock whose pid is no
// longer alive is taken over, so a killed run never blocks the machine forever.
//
// THE QUEUE is a JSON-lines file. An entry names the gate and the sha it was queued for. `drain`
// runs in the root checkout only (the MSPDI schemas are local to it, JDG-644), and an entry whose
// sha is no longer HEAD is dropped as stale rather than run against a different tree.
//
// PERF (JDG-605, JDG-643) runs only when it is queued BY NAME and the drain is started with
// GRS_PERF=1. GT-1 and GT-2 never carry GRS_PERF (run-gate.mjs removes it).

import { spawnSync } from 'node:child_process'
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const GATES = ['GT-1', 'GT-2', 'PERF']
const POLL_MS = 5000

const git = (...args) => {
  const done = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  if (done.status !== 0) throw new Error(`git ${args.join(' ')}: ${done.stderr.trim()}`)
  return done.stdout.trim()
}

export function places() {
  const common = resolve(ROOT, git('rev-parse', '--git-common-dir'))
  const own = resolve(ROOT, git('rev-parse', '--git-dir'))
  const folder = join(common, 'grs-gate')
  return {
    folder,
    lock: join(folder, 'lock.json'),
    queueLock: join(folder, 'queue-lock.json'),
    queue: join(folder, 'queue.jsonl'),
    results: join(folder, 'results.jsonl'),
    isRoot: common === own,
    repoTop: dirname(common),
  }
}

// ------------------------------------------------------------------ the lock ----

function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}

export function holder(where = places(), path = where.lock) {
  const held = readJson(path)
  if (held === undefined) return undefined
  return { ...held, alive: alive(held.pid) }
}

function tryLock(where, path, what) {
  mkdirSync(where.folder, { recursive: true })
  try {
    const fd = openSync(path, 'wx')
    writeFileSync(fd, JSON.stringify({
      pid: process.pid, what, checkout: relative(where.repoTop, ROOT) || '.', since: new Date().toISOString(),
    }))
    closeSync(fd)
    return true
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
  }
  const held = holder(where, path)
  if (held !== undefined && !held.alive) {
    console.log(`gate-queue: taking over the lock of pid ${held.pid} (${held.what}), which is no longer running`)
    rmSync(path, { force: true })
    return tryLock(where, path, what)
  }
  return false
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

// Waits until the lock is free, takes it, and returns a function that releases it. The queue has
// a lock of its own, so queueing a gate never waits behind a gate that is running.
export function acquire(what, { wait = true, queue = false } = {}) {
  const where = places()
  const path = queue ? where.queueLock : where.lock
  let told = false
  while (!tryLock(where, path, what)) {
    if (!wait) return undefined
    if (!told) {
      const held = holder(where, path)
      console.log(`gate-queue: waiting -- ${held?.what ?? 'a run'} holds the lock ` +
        `(pid ${held?.pid}, ${held?.checkout}, since ${held?.since})`)
      told = true
    }
    sleep(POLL_MS)
  }
  let released = false
  const release = () => {
    if (released) return
    released = true
    const held = readJson(path)
    if (held?.pid === process.pid) rmSync(path, { force: true })
  }
  process.once('exit', release)
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      release()
      process.exit(130)
    })
  }
  return release
}

// ----------------------------------------------------------------- the queue ----

function readQueue(where) {
  if (!existsSync(where.queue)) return []
  return readFileSync(where.queue, 'utf8').split('\n').filter((line) => line.trim() !== '').map((line) => JSON.parse(line))
}

function writeQueue(where, entries) {
  writeFileSync(where.queue, entries.map((one) => JSON.stringify(one) + '\n').join(''))
}

function record(where, entry, outcome) {
  appendFileSync(where.results, JSON.stringify({ ...entry, outcome, finished: new Date().toISOString() }) + '\n')
}

export function enqueue(gate, note = '') {
  if (!GATES.includes(gate)) throw new Error(`unknown gate ${gate} -- one of ${GATES.join(', ')}`)
  const where = places()
  mkdirSync(where.folder, { recursive: true })
  const release = acquire('queue edit', { queue: true })
  try {
    const entries = readQueue(where)
    const entry = {
      id: `${Date.now().toString(36)}-${process.pid}`, gate,
      sha: git('rev-parse', 'HEAD'), branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
      checkout: relative(where.repoTop, ROOT) || '.', note, queued: new Date().toISOString(),
    }
    entries.push(entry)
    writeQueue(where, entries)
    return { entry, position: entries.length }
  } finally {
    release()
  }
}

function take(where) {
  const release = acquire('queue edit', { queue: true })
  try {
    const entries = readQueue(where)
    const first = entries.shift()
    writeQueue(where, entries)
    return first
  } finally {
    release()
  }
}

function drain(once) {
  const where = places()
  if (!where.isRoot) {
    console.log('gate-queue: drain runs in the root checkout only -- the MSPDI schemas are local to it (JDG-644)')
    return 1
  }
  let worst = 0
  for (let entry = take(where); entry !== undefined; entry = once ? undefined : take(where)) {
    const head = git('rev-parse', 'HEAD')
    if (entry.sha !== head) {
      console.log(`gate-queue: dropped ${entry.gate} for ${entry.sha.slice(0, 8)} -- HEAD is ${head.slice(0, 8)} now`)
      record(where, entry, 'stale')
      continue
    }
    if (entry.gate === 'PERF' && process.env.GRS_PERF !== '1') {
      console.log('gate-queue: PERF skipped -- start the drain with GRS_PERF=1 to measure (JDG-605)')
      record(where, entry, 'skipped: GRS_PERF unset')
      continue
    }
    console.log(`gate-queue: running ${entry.gate} for ${entry.sha.slice(0, 8)} (${entry.branch})`)
    const done = spawnSync(process.execPath, [join(ROOT, 'tools', 'gate', 'run-gate.mjs'), entry.gate],
      { cwd: ROOT, stdio: 'inherit', env: process.env })
    const outcome = done.status === 0 ? 'passed' : `failed (exit ${done.status})`
    record(where, entry, outcome)
    console.log(`gate-queue: ${entry.gate} ${entry.sha.slice(0, 8)} ${outcome}`)
    if (done.status !== 0) worst = 1
  }
  return worst
}

function list() {
  const where = places()
  const held = holder(where)
  console.log(held === undefined ? 'lock: free'
    : `lock: ${held.what} (pid ${held.pid}${held.alive ? '' : ', NOT RUNNING'}, ${held.checkout}, since ${held.since})`)
  const entries = readQueue(where)
  console.log(`queue: ${entries.length}`)
  entries.forEach((one, index) =>
    console.log(`  ${index + 1}. ${one.gate} ${one.sha.slice(0, 8)} ${one.branch} ${one.note}`))
  if (existsSync(where.results)) {
    const last = readFileSync(where.results, 'utf8').trim().split('\n').slice(-5)
    console.log('last results:')
    for (const line of last) {
      const one = JSON.parse(line)
      console.log(`  ${one.gate} ${one.sha.slice(0, 8)} ${one.outcome} ${one.finished}`)
    }
  }
  return 0
}

function runUnderLock(command) {
  if (command.length === 0) {
    console.log('usage: gate-queue.mjs run -- <command ...>')
    return 2
  }
  const release = acquire(`run: ${command.join(' ')}`)
  try {
    let done = spawnSync(command[0], command.slice(1), { cwd: process.cwd(), stdio: 'inherit' })
    // WHY: on Windows npm, npx and friends are .cmd files, which only a shell can start.
    if (done.error !== undefined && process.platform === 'win32') {
      const quoted = command.map((one) => (/[\s"]/.test(one) ? `"${one.replaceAll('"', '\\"')}"` : one))
      done = spawnSync(quoted.join(' '), { cwd: process.cwd(), stdio: 'inherit', shell: true })
    }
    if (done.error !== undefined) throw done.error
    return done.status ?? 1
  } finally {
    release()
  }
}

function main(argv) {
  const [verb, ...rest] = argv
  if (verb === 'list') return list()
  if (verb === 'drain') return drain(rest.includes('--once'))
  if (verb === 'run') return runUnderLock(rest[0] === '--' ? rest.slice(1) : rest)
  if (verb === 'enqueue') {
    const note = rest.includes('--note') ? rest[rest.indexOf('--note') + 1] ?? '' : ''
    const { entry, position } = enqueue(rest[0], note)
    console.log(`gate-queue: queued ${entry.gate} for ${entry.sha.slice(0, 8)} (${entry.branch}) at position ${position}`)
    return 0
  }
  console.log('usage: gate-queue.mjs list | enqueue GT-1|GT-2|PERF [--note text] | drain [--once] | run -- <command ...>')
  return verb === undefined || verb === '--help' || verb === '-h' ? 0 : 2
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = main(process.argv.slice(2))
}
