# -*- coding: utf-8 -*-
"""Which generated fences a size or restatement check may leave uncounted.

Coordinator ruling of 2026-10-23 (CR-767 wave 3): checks 60 and 69 judge
hand-written code. A judgment the generator compiles from a manuscript
condition is as big as that condition -- shrinking it is the specification's
work -- and the lists inside it are operands, not published sets. So a fence
is PROVEN, and what lies inside it may go uncounted, only when all three hold:

  (a) the fence's `// Rebuild: ... (tools/<generator>.py)` line names a
      generator that exists under tools/;
  (b) that generator says it writes this file -- it answers `--units` with
      one repository-relative path per line (a generator whose source does
      not mention `--units` is never run with it, so it proves nothing);
  (c) that generator's `--check` is green, so the fence holds exactly what
      the generator writes.

A fence that names a generator answering `--units` in a file that generator
does not write is a PROBLEM: a hand-written fence must not buy an exemption.
A fence naming any other generator is neither proven nor a problem -- it is
counted like hand code, as before.
"""
import os
import re
import subprocess
import sys

OPEN = '// <generated -- do not edit by hand>'
CLOSE = '// </generated>'
REBUILD = re.compile(r'^//\s*Rebuild:.*\((tools/[\w./-]+\.py)\)')
# How many lines after the opening fence the Rebuild line may stand.
HEAD_LINES = 4


def fences(text):
    """[(first line, last line, generator or None)], 1-based and inclusive."""
    out = []
    start, generator = None, None
    for no, line in enumerate(text.split('\n'), 1):
        stripped = line.strip()
        if stripped.startswith(OPEN):
            start, generator = no, None
            continue
        if start is None:
            continue
        if stripped.startswith(CLOSE):
            out.append((start, no, generator))
            start = None
            continue
        found = REBUILD.match(stripped)
        if found and generator is None and no - start <= HEAD_LINES:
            generator = found.group(1)
    return out


class Provenance(object):
    """Runs each generator at most twice (`--units`, `--check`) per process.

    statuses, for self-tests: {generator: (set of units, is check green)}
    stands in for running anything.
    """

    def __init__(self, root, statuses=None):
        self.root = root
        self.statuses = dict(statuses) if statuses is not None else None
        self.cache = {}

    def status(self, generator):
        """(units or None when the generator proves nothing, is check green)."""
        if self.statuses is not None:
            return self.statuses.get(generator, (None, False))
        if generator not in self.cache:
            self.cache[generator] = self.run(generator)
        return self.cache[generator]

    def run(self, generator):
        path = os.path.join(self.root, *generator.split('/'))
        if not os.path.isfile(path):
            return None, False
        with open(path, encoding='utf-8', errors='replace') as handle:
            if '--units' not in handle.read():
                return None, False
        env = dict(os.environ, PYTHONIOENCODING='utf-8')
        units = subprocess.run([sys.executable, path, '--units'], cwd=self.root, env=env,
                               capture_output=True, text=True, encoding='utf-8')
        if units.returncode != 0:
            return None, False
        check = subprocess.run([sys.executable, path, '--check'], cwd=self.root, env=env,
                               capture_output=True, text=True, encoding='utf-8')
        listed = set(line.strip() for line in units.stdout.splitlines() if line.strip())
        return listed, check.returncode == 0

    def proven(self, rel, text):
        """([(first, last)] of the proven fences of one file, [problem, ...])."""
        ranges, problems = [], []
        for first, last, generator in fences(text):
            if generator is None:
                continue
            units, green = self.status(generator)
            if units is None:
                continue
            if rel not in units:
                problems.append('%s:%d: a fence names %s, which does not write this file -- a '
                                'hand-written fence buys no exemption' % (rel, first, generator))
                continue
            if green:
                ranges.append((first, last))
        return ranges, problems


def inside(line, ranges):
    return any(first <= line <= last for first, last in ranges)
