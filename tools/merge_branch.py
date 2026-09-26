# -*- coding: utf-8 -*-
"""Merge one branch into the current branch, the way the coordinator does it.

    python tools/merge_branch.py <branch or sha> [--band DFC=1100-1109 ...]
                                 [--gate GT-1|GT-2|none] [--no-commit]

Run it in the checkout of the branch that receives the merge (refactor). It
NEVER pushes. It prints five lines; the full output of every step goes to
scratch/merge-branch/last-run.log.

WHAT IT DOES, in order, stopping at the first thing it cannot settle:

  1. refuses a dirty working tree or a merge already in progress, and
     (re)installs the merge drivers of tools/merge_driver.py;
  2. finds the ids both sides defined anew since the merge base and, when
     there are any, merges a copy of the branch with ITS new ids renumbered
     after ours (tools/renumber_ids.py clashes) instead of the branch itself;
  3. `git merge --no-ff --no-commit`. A conflicted file is settled only when
     it is GENERATED, and that is measured, not listed: every conflict hunk is
     resolved once to ours and once to theirs, the tree is regenerated after
     each, and when both runs leave the same bytes the file is whatever the
     manuscripts make it. Any other conflict stops the run with the file list
     and leaves the merge in progress for a person;
  4. regenerates (`npm run gen`, then tools/ledger_metrics.py when its counts
     drifted -- it stamps the minute, so it is not rerun for nothing), compacts any
     provisional id and every --band (tools/renumber_ids.py), and regenerates
     again when an id moved;
  5. runs check.sh (after removing ./output) and `npm run gen:check`, and
     counts the privacy items of everything the merge stages
     (tools/privacy_count.py --staged);
  6. commits the merge only when all of that is green (never with
     --no-commit), then queues the gate (default GT-2, the push gate of
     JDG-640) with tools/gate/gate-queue.mjs. Run the queue with
     `npm run gate:drain` in the root; it holds the machine-wide lock.

WHAT IT CANNOT SEE: whether the two sides AGREE. A clean textual merge of two
hand-written documents can still say two different things; the checks catch
some of that, a reader catches the rest.
"""
import io
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import merge_driver  # noqa: E402
import renumber_ids  # noqa: E402

LOG_DIR = os.path.join(ROOT, 'scratch', 'merge-branch')
LOG = os.path.join(LOG_DIR, 'last-run.log')
REGENERATE = ['npm', 'run', '-s', 'gen']
LEDGER_CHECK = ['python', 'tools/ledger_metrics.py', '--check']
LEDGER_WRITE = ['python', 'tools/ledger_metrics.py']
CHECKS = [('check.sh', ['bash', '.claude/skills/spec-graph-check/check.sh']),
          ('gen:check', ['npm', 'run', '-s', 'gen:check'])]
# ledger_metrics stamps the minute it ran; two regenerations a minute apart
# must still compare equal.
STAMP = re.compile(r'[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}')


class Stop(Exception):
    """The run cannot settle something; the message is its fourth line."""


class Run:
    def __init__(self):
        os.makedirs(LOG_DIR, exist_ok=True)
        self.log = io.open(LOG, 'w', encoding='utf-8')

    def note(self, text):
        self.log.write(text + '\n')
        self.log.flush()

    def call(self, args, check=False, env=None):
        """Run a command at the root; its output goes to the log only."""
        self.note('\n$ ' + ' '.join(args))
        full_env = dict(os.environ, PYTHONIOENCODING='utf-8', **(env or {}))
        done = subprocess.run(args, cwd=ROOT, capture_output=True, env=full_env,
                              shell=(os.name == 'nt' and args[0] == 'npm'))
        out = (done.stdout + done.stderr).decode('utf-8', 'replace')
        self.note(out.rstrip() + '\n(exit %d)' % done.returncode)
        if check and done.returncode != 0:
            raise Stop('%s exited %d -- see %s' % (' '.join(args[:3]), done.returncode, rel(LOG)))
        return done.returncode, done.stdout.decode('utf-8', 'replace')

    def git(self, *args, check=True):
        return self.call(['git'] + list(args), check=check)[1].strip()


def rel(path):
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


def read(name):
    with open(os.path.join(ROOT, name), 'rb') as handle:
        return handle.read()


def write(name, data):
    with open(os.path.join(ROOT, name), 'wb') as handle:
        handle.write(data)


# ------------------------------------------------------- conflict hunks ----

def side_of(data, side):
    """The file with every conflict hunk resolved to `side` ('ours' or
    'theirs'); None when the file carries no conflict markers."""
    text = data.decode('utf-8', 'replace')
    lines = text.splitlines(True)
    out, part, seen = [], None, False
    for line in lines:
        if line.startswith('<<<<<<< '):
            part, seen = 'ours', True
            continue
        if part is not None and line.startswith('||||||| '):
            part = 'base'
            continue
        if part is not None and line.startswith('=======') and line.rstrip('\r\n') == '=======':
            part = 'theirs'
            continue
        if part is not None and line.startswith('>>>>>>> '):
            part = None
            continue
        if part is None or part == side:
            out.append(line)
    return ''.join(out).encode('utf-8') if seen else None


def regenerate(run):
    """npm run gen, then the ledger counts -- only when they drifted, because
    the block carries the minute it was printed and would otherwise change on
    every merge."""
    if run.call(REGENERATE)[0] != 0:
        return False
    if run.call(LEDGER_CHECK)[0] == 0:
        return True
    return run.call(LEDGER_WRITE)[0] == 0


def settle_by_regeneration(run, conflicted):
    """Resolve every conflicted file that regeneration fully determines.

    Returns the files it could not settle."""
    variants, marked = {}, {}
    unsettled = []
    for name in conflicted:
        path = os.path.join(ROOT, name)
        data = read(name) if os.path.isfile(path) else None
        ours = side_of(data, 'ours') if data is not None else None
        theirs = side_of(data, 'theirs') if data is not None else None
        if ours is None or theirs is None:
            unsettled.append(name)      # modify/delete, binary, or no markers
        else:
            variants[name] = (ours, theirs)
            marked[name] = data
    if not variants:
        return unsettled
    results = {}
    for index, side in enumerate(('ours', 'theirs')):
        for name, pair in variants.items():
            write(name, pair[index])
        if not regenerate(run):
            run.note('regeneration failed with the %s side of the conflicts' % side)
            for name, data in marked.items():
                write(name, data)
            return sorted(set(unsettled) | set(variants))
        for name in variants:
            results.setdefault(name, []).append(STAMP.sub('', read(name).decode('utf-8', 'replace')))
    for name in sorted(variants):
        if results[name][0] == results[name][1]:
            run.note('settled by regeneration: %s' % name)
            run.git('add', '--', name)
        else:
            run.note('NOT generated (the two regenerations differ): %s' % name)
            write(name, marked[name])     # the markers go back, for a person
            unsettled.append(name)
    return sorted(unsettled)


# ------------------------------------------------------------ the steps ----

def preflight(run, target):
    if run.git('status', '--porcelain', '--untracked-files=no'):
        raise Stop('the working tree has changes -- commit or move them first')
    if os.path.exists(os.path.join(ROOT, '.git', 'MERGE_HEAD')) or \
            run.git('rev-parse', '-q', '--verify', 'MERGE_HEAD', check=False):
        raise Stop('a merge is already in progress')
    merge_driver.install(ROOT)
    run.note('merge drivers installed')
    sha = run.git('rev-parse', '--verify', target + '^{commit}', check=False)
    if not sha:
        raise Stop('%s is not a commit' % target)
    return sha


def renumber_clashes(run, base, sha):
    mapping = renumber_ids.clash_plan(base, sha)
    if not mapping:
        return sha, []
    moved = ['%s-%d->%s' % (prefix, old, new) for (prefix, old), new in sorted(mapping.items())]
    renumbered = renumber_ids.renumbered_commit(base, sha, mapping)
    run.note('clashing ids renumbered in %s: %s' % (renumbered, ', '.join(moved)))
    return renumbered, moved


def compact(run, bands):
    before = run.git('status', '--porcelain')
    status, out = run.call(['python', 'tools/renumber_ids.py', 'compact'])
    if status != 0:
        raise Stop('renumber_ids.py compact exited %d' % status)
    moved = [line.strip() for line in out.splitlines() if '->' in line and ':' not in line]
    if bands:
        status, out = run.call(['python', 'tools/renumber_ids.py', 'band'] + bands)
        if status != 0:
            raise Stop('renumber_ids.py band exited %d' % status)
        moved += [line.strip() for line in out.splitlines() if '->' in line and ':' not in line]
    return moved, before != run.git('status', '--porcelain')


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        sys.stdout.write(__doc__)
        return 0 if argv else 2
    target = argv[0]
    bands = [argv[i + 1] for i, one in enumerate(argv) if one == '--band' and i + 1 < len(argv)]
    gate = argv[argv.index('--gate') + 1] if '--gate' in argv else 'GT-2'
    commit = '--no-commit' not in argv
    run = Run()
    lines = ['', '', '', '', '']
    branch = '?'
    try:
        sha = preflight(run, target)
        branch = run.git('rev-parse', '--abbrev-ref', 'HEAD')
        head = run.git('rev-parse', 'HEAD')
        lines[0] = 'merge: %s (%s) into %s at %s' % (target, sha[:8], branch, head[:8])
        base = run.git('merge-base', 'HEAD', sha)
        incoming, moved = renumber_clashes(run, base, sha)

        status, _ = run.call(['git', 'merge', '--no-ff', '--no-commit', incoming])
        conflicted = [one for one in run.git('diff', '--name-only', '--diff-filter=U').split('\n') if one]
        if status != 0 and not conflicted:
            raise Stop('git merge exited %d without a conflict -- see %s' % (status, rel(LOG)))
        unsettled = settle_by_regeneration(run, conflicted) if conflicted else []
        if unsettled:
            lines[1] = 'conflicts: %d, settled by regeneration %d; STOPPED on %d: %s' % (
                len(conflicted), len(conflicted) - len(unsettled), len(unsettled), ' '.join(unsettled))
            raise Stop('resolve the files above by hand; the merge is left in progress')

        if not regenerate(run):
            raise Stop('regeneration failed -- see %s' % rel(LOG))
        renumbered, changed = compact(run, bands)
        if changed and not regenerate(run):
            raise Stop('regeneration after renumbering failed -- see %s' % rel(LOG))
        moved += renumbered
        run.git('add', '-u')
        lines[1] = 'conflicts: %d, settled by regeneration %d; renumbered: %s' % (
            len(conflicted), len(conflicted), ', '.join(moved) if moved else 'none')

        shutil.rmtree(os.path.join(ROOT, 'output'), ignore_errors=True)
        results = [(name, run.call(args)[0]) for name, args in CHECKS]
        lines[2] = 'checks: ' + ', '.join('%s exit %d' % one for one in results)
        status, out = run.call(['python', 'tools/privacy_count.py', '--staged'])
        lines[3] = out.strip() or 'privacy: (no output, exit %d)' % status
        if any(code for _, code in results) or status != 0:
            raise Stop('not committed: a check or the privacy count is not clean; '
                       'the merge is left in progress -- see %s' % rel(LOG))
        if not commit:
            lines[4] = 'not committed (--no-commit); the merge is staged and in progress'
            return 0
        message = ['Merge %s (%s) into %s' % (target, sha[:8], branch)]
        if moved:
            message += ['', 'Renumbered at the merge: ' + ', '.join(moved)]
        run.git('commit', '--no-verify', '-q', '-m', '\n'.join(message))
        new_head = run.git('rev-parse', 'HEAD')
        lines[0] += ' -> %s' % new_head[:8]
        if gate == 'none':
            lines[4] = 'gate: not queued (--gate none); nothing was pushed'
        else:
            status, out = run.call(['node', 'tools/gate/gate-queue.mjs', 'enqueue', gate,
                                    '--note', 'merge %s' % target])
            lines[4] = ('gate: ' + out.strip().replace('gate-queue: ', '') + '; run it with '
                        'npm run gate:drain; nothing was pushed') if status == 0 else \
                'gate: queueing %s failed (exit %d); nothing was pushed' % (gate, status)
        return 0
    except Stop as stopped:
        filled = [i for i, one in enumerate(lines) if one]
        at = max(filled) + 1 if filled else 0
        lines[min(at, 4)] = 'STOPPED: %s' % stopped
        return 1
    finally:
        if not lines[0]:
            lines[0] = 'merge: %s into %s' % (target, branch)
        for one in lines:
            print(one if one else '-')
        run.note('\n'.join(lines))
        run.log.close()


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
