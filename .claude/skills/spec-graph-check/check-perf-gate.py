# -*- coding: utf-8 -*-
"""Check 66 -- the performance gate still gates, and a landed per-frame change waits to be measured.

WHY THIS EXISTS (CR-573 sections 5 and 6, JDG-605 / JDG-643, RISK-001). The
frame-time tests of tests/nfr drive 1,000 tasks for minutes. They run only
when GRS_PERF=1, because playwright.config.ts leaves them out of every other
run through `testIgnore`. That gate is one line: deleting it, or adding a new
time-measuring file to tests/nfr without listing it, puts the measurement
back into every `npm run e2e` in silence, and the next overlapping run is
what finds out. Rule 04 section 5, row PW-2, also asks a machine to notice
when a landed change request touched the per-frame paths, so that it is
measured before `main` moves (PW-1).

WHAT IS RED.
  1. playwright.config.ts: `testIgnore` is not of the form
     `<flag> ? [] : <LIST>` with `<flag>` defined as
     `process.env['GRS_PERF'] === '1'`; or a file of tests/nfr that reads the
     clock (`performance.now(`) is missing from `<LIST>`; or `<LIST>` names a
     file that does not exist.
  2. A commit since the rule began (the commit that added
     docs/development-records/perf-pending.md) whose subject names a change
     request and whose diff touches a per-frame path of rule 04 section 5,
     while that change request is in no table row of perf-pending.md nor of
     docs/development-records/measurements/performance-runs.md.
The per-frame paths are read from rule 04 section 5 on every run (the
backticked `src/...` paths of its tables), so moving a unit there moves them
here. No baseline: the gate is held at 0.

WHAT IT PRINTS WITHOUT GATING. A tests/nfr file that raises `test.setTimeout`
but reads no clock (nfr-004 builds the deliverable and measures no time, and
runs every time on purpose), and a per-frame commit whose subject names no
change request (a defect fix is not a landing, PW-1).

    python .claude/skills/spec-graph-check/check-perf-gate.py [--since <sha>]

`--since` replaces the start of the rule with another commit, which is how the
second half was broken on purpose.
"""
import io
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

CONFIG = 'playwright.config.ts'
NFR = 'tests/nfr'
RULE = 'docs/development-rules/04-verification.md'
PENDING = 'docs/development-records/perf-pending.md'
RUNS = 'docs/development-records/measurements/performance-runs.md'

TEST_IGNORE = re.compile(r'testIgnore\s*:\s*([A-Za-z_$][\w$]*)\s*\?\s*\[\s*\]\s*:\s*([A-Za-z_$][\w$]*)')
FLAG_DEF = r'const\s+%s\s*=\s*process\.env(?:\[\s*[\'"]GRS_PERF[\'"]\s*\]|\.GRS_PERF)\s*===\s*[\'"]1[\'"]'
LIST_DEF = r'const\s+%s\s*=\s*\[([^\]]*)\]'
QUOTED = re.compile(r'[\'"]([^\'"]+)[\'"]')
CLOCK = re.compile(r'\bperformance\.now\s*\(')
SET_TIMEOUT = re.compile(r'test\.setTimeout\s*\(\s*([0-9_]+)')
DEFAULT_TIMEOUT_MS = 30000
CR_ID = re.compile(r'\bCR-\d+\b')
SRC_PATH = re.compile(r'`(src/[^`\s]+)`')


def say(message):
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def read(root, rel):
    try:
        with io.open(os.path.join(root, *rel.split('/')), encoding='utf-8') as handle:
            return handle.read()
    except OSError:
        return None


def git(*args):
    proc = subprocess.run(['git', '-C', ROOT] + list(args), capture_output=True,
                          text=True, encoding='utf-8', errors='replace')
    if proc.returncode != 0:
        raise RuntimeError('git %s: %s' % (' '.join(args), proc.stderr.strip()[-300:]))
    return proc.stdout


def gate_findings(root):
    """Part 1. Returns (faults, notes)."""
    faults, notes = [], []
    text = read(root, CONFIG)
    if text is None:
        return ['%s is missing' % CONFIG], notes
    m = TEST_IGNORE.search(text)
    if not m:
        return ['%s: `testIgnore` is no longer `<flag> ? [] : <LIST>` -- the '
                'frame-time tests would run in every e2e run' % CONFIG], notes
    flag, listed_name = m.group(1), m.group(2)
    if not re.search(FLAG_DEF % re.escape(flag), text):
        faults.append("%s: `%s` is not defined as process.env['GRS_PERF'] === '1'"
                      % (CONFIG, flag))
    lm = re.search(LIST_DEF % re.escape(listed_name), text)
    if not lm:
        faults.append('%s: the list `%s` is not an array literal this check can read'
                      % (CONFIG, listed_name))
        return faults, notes
    listed = set(QUOTED.findall(lm.group(1)))
    for entry in sorted(listed):
        if not os.path.exists(os.path.join(root, 'tests', *entry.split('/'))):
            faults.append('%s: `%s` names tests/%s, which does not exist'
                          % (CONFIG, listed_name, entry))
    nfr_dir = os.path.join(root, *NFR.split('/'))
    names = sorted(n for n in os.listdir(nfr_dir) if n.endswith('.ts')) \
        if os.path.isdir(nfr_dir) else []
    for name in names:
        body = read(root, NFR + '/' + name) or ''
        key = 'nfr/' + name
        if CLOCK.search(body):
            if key not in listed:
                faults.append('%s/%s reads the clock and is not in `%s`: it would '
                              'measure performance in every e2e run' % (NFR, name, listed_name))
        else:
            longest = max([int(v.replace('_', '')) for v in SET_TIMEOUT.findall(body)] or [0])
            if longest > DEFAULT_TIMEOUT_MS:
                notes.append('%s/%s raises test.setTimeout to %d ms but reads no '
                             'clock -- not a performance gate, runs every time'
                             % (NFR, name, longest))
    return faults, notes


def per_frame_paths(root):
    text = read(root, RULE)
    if text is None:
        return None
    at = text.find('\n## 5.')
    if at < 0:
        return None
    end = text.find('\n## ', at + 1)
    section = text[at:end if end > 0 else len(text)]
    paths = []
    for line in section.split('\n'):
        if line.startswith('|'):
            paths.extend(SRC_PATH.findall(line))
    return paths


def touches(path, patterns):
    for pattern in patterns:
        if pattern.endswith('/**'):
            if path.startswith(pattern[:-2]):
                return True
        elif path == pattern:
            return True
    return False


def table_crs(root, rel):
    text = read(root, rel) or ''
    found = set()
    seen_rule = False
    for line in text.split('\n'):
        if not line.startswith('|'):
            continue
        if re.match(r'^\|[\s|:-]+\|?\s*$', line):
            seen_rule = True
            continue
        if seen_rule:
            found.update(CR_ID.findall(line))
    return found


def landing_findings(root, since):
    """Part 2. Returns (faults, notes)."""
    faults, notes = [], []
    patterns = per_frame_paths(root)
    if not patterns:
        return ['%s section 5 holds no backticked src/ path -- the per-frame '
                'paths are read from there' % RULE], notes
    if since is None:
        added = git('log', '--diff-filter=A', '--format=%H', '--', PENDING).split()
        if not added:
            notes.append('%s is not committed yet, so no landing falls under PW-2 '
                         'yet' % PENDING)
            return faults, notes
        since = added[-1]
    log = git('log', '--no-merges', '--format=%x1e%h%x1f%s', '--name-only',
              '%s..HEAD' % since)
    waiting = table_crs(root, PENDING) | table_crs(root, RUNS)
    commits = 0
    for chunk in log.split('\x1e'):
        if not chunk.strip():
            continue
        head, _, files = chunk.partition('\n')
        sha, _, subject = head.partition('\x1f')
        commits += 1
        hit = [f for f in files.split('\n') if f.strip() and touches(f.strip(), patterns)]
        if not hit:
            continue
        crs = sorted(set(CR_ID.findall(subject)))
        if not crs:
            notes.append('%s touches %s but its subject names no change request '
                         '(not gated)' % (sha, hit[0]))
            continue
        for cr in crs:
            if cr not in waiting:
                faults.append('%s (%s) touched %s, and %s is neither in %s nor in %s'
                              % (cr, sha, hit[0], cr, PENDING, RUNS))
    notes.append('%d commit(s) since %s read against %d per-frame path(s)'
                 % (commits, since[:8], len(patterns)))
    return faults, notes


def main(argv):
    root = ROOT
    since = None
    if '--root' in argv:
        at = argv.index('--root')
        if at + 1 < len(argv):
            root = argv[at + 1]
    if '--since' in argv:
        at = argv.index('--since')
        if at + 1 < len(argv):
            since = argv[at + 1]
    faults, notes = gate_findings(root)
    try:
        more, more_notes = landing_findings(root, since)
    except RuntimeError as exc:
        say('PROBLEM  %s' % exc)
        return 2
    faults += more
    notes += more_notes
    if faults:
        say('FAIL     %d finding(s): the performance gate (JDG-605 / JDG-643) or '
            'the measuring-waits list (rule 04, PW-2)' % len(faults))
        for fault in faults:
            say('         %s' % fault)
    else:
        say('OK       the frame-time tests run only under GRS_PERF=1, and no '
            'landed per-frame change request is missing from the waits list')
    for note in notes:
        say('   NOTE  %s' % note)
    say('   NOT COVERED  a time-measuring file that reads no performance.now '
        '(Date.now, a frame counter); a per-frame change landed under a subject '
        'that names no CR; a change to a per-frame path the table of rule 04 '
        'section 5 does not list')
    return 1 if faults else 0


for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
