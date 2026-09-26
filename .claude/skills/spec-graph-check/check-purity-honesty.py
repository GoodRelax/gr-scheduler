# -*- coding: utf-8 -*-
"""Check 64 -- a function tagged `pure` or `semi-pure-a` does what its tag says.

WHY THIS EXISTS (CR-573 section 5, JDG-635 / JDG-636). Rule 04 section 3.5,
table UO, row UO-1: a function tagged `@purity pure` or `semi-pure-a` needs no
unit test of its own; the tag check and the tests above it hold it. That
bargain is only as good as the tag. A tag is a comment, and a comment nothing
reads is a comment that drifts: a `pure` function that starts reading the
clock keeps its tag, keeps its exemption, and is tested by nobody.

WHAT IS RED. A function tagged `pure` or `semi-pure-a` (rule 07, R7.6) whose
body -- nested functions included, except a nested function with a tag of its
own, which answers for itself --

  1. calls or constructs a function whose declaration is tagged
     `semi-pure-b` or `non-pure`. The callee is resolved by the TypeScript
     checker through imports and re-exports, and ITS tag is read;
  2. touches `document`, `window`, `Date.now` or `Math.random` as the
     browser's or the language's own. A local variable named `document` (the
     GRS document model is called that all over src/) resolves to its own
     declaration and is not counted;
  3. awaits or is async (`await`, `for await`, an `async` modifier).

src/ only, and not the generated blocks
(`// <generated -- do not edit by hand>` .. `// </generated>`). The reading is
done by purity-calls.mjs; this script owns the count and the baseline.

THE BASELINE. purity-honesty-baseline.txt, line 1: the number of lying
functions. CR-573 section 5: the coordinator registers the first-run number
and only lowers it (JDG-520); raising it is the user's call. `--write-baseline`
writes the file from this run's own count, and only when no file exists yet,
so it can seed the number but never raise it.

    python .claude/skills/spec-graph-check/check-purity-honesty.py [--list]
    python .claude/skills/spec-graph-check/check-purity-honesty.py --write-baseline

Run with PYTHONIOENCODING=utf-8 like its neighbours.
"""
import io
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MJS = os.path.join(HERE, 'purity-calls.mjs')
BASELINE = os.path.join(HERE, 'purity-honesty-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/purity-honesty-baseline.txt'

# Printed on every run, green or red (CR-573 section 5).
NOT_COVERED = (
    'NOT COVERED  a call through a function passed in as an argument (its '
    'declaration is a parameter, so there is no tag to read); `new Date()` '
    'and `performance.now()` (no ruling names them); an argument written to '
    '(R7.1 forbids it, outside CR-573); a method called on an object whose '
    'type carries no @purity tag'
)


def say(message):
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def run_node(root=None):
    node = shutil.which('node') or 'node'
    command = [node, MJS, 'honesty']
    if root:
        command += ['--root', root]
    try:
        proc = subprocess.run(command, capture_output=True, text=True,
                              encoding='utf-8', errors='replace', timeout=600)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RuntimeError('could not run purity-calls.mjs: %s' % exc)
    try:
        data = json.loads(proc.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        raise RuntimeError('purity-calls.mjs printed no JSON (exit %d): %s'
                           % (proc.returncode, (proc.stderr or '')[-400:]))
    if 'problem' in data:
        raise RuntimeError(data['problem'])
    if proc.returncode != 0:
        raise RuntimeError('purity-calls.mjs exited %d' % proc.returncode)
    return data


def read_baseline():
    try:
        with io.open(BASELINE, encoding='utf-8') as handle:
            return int(handle.readline().strip())
    except (OSError, ValueError):
        return None


def write_baseline(count):
    if os.path.exists(BASELINE):
        say('PROBLEM  %s already exists; --write-baseline only seeds a '
            'missing file (CR-573 section 5: lowering is the coordinator\'s, '
            'raising is the user\'s)' % REL_BASELINE)
        return 1
    with io.open(BASELINE, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write('%d\n' % count)
        handle.write('# Check 64 -- functions tagged pure / semi-pure-a whose body '
                     'calls a semi-pure-b / non-pure function,\n'
                     '# touches document / window / Date.now / Math.random, or '
                     'awaits. Line 1 is the count.\n'
                     '# Seeded by check-purity-honesty.py --write-baseline from '
                     'its own first run (CR-573 section 5).\n'
                     '# The coordinator lowers it (JDG-520); raising it is the '
                     'user\'s call.\n')
    say('WROTE    %s = %d' % (REL_BASELINE, count))
    return 0


def main(argv):
    root = None
    if '--root' in argv:
        at = argv.index('--root')
        root = argv[at + 1] if at + 1 < len(argv) else None
    try:
        data = run_node(root)
    except RuntimeError as exc:
        say('PROBLEM  %s' % exc)
        return 2
    lies = data.get('lies', [])
    count = len(lies)
    examined = data.get('examined', 0)

    if '--list' in argv:
        for lie in lies:
            say('%s:%d  %s  (%s)  %s' % (lie['file'], lie['line'], lie['name'],
                                         lie['tag'], '; '.join(lie['reasons'])))
        say('-- %d of %d tagged function(s) lie' % (count, examined))
        return 0
    if '--write-baseline' in argv:
        return write_baseline(count)

    held = read_baseline()
    shown = lies[:8]
    if held is None:
        say('PROBLEM  %s has not been written yet -- %d of %d function(s) '
            'tagged pure / semi-pure-a lie. Seed it with --write-baseline.'
            % (REL_BASELINE, count, examined))
        for lie in shown:
            say('         %s:%d %s: %s' % (lie['file'], lie['line'], lie['name'],
                                          '; '.join(lie['reasons'])))
        say('   ' + NOT_COVERED)
        return 1
    if count > held:
        say('FAIL     functions whose @purity tag lies went %d -> %d (%d '
            'examined). A pure / semi-pure-a function is excused from a '
            'unit test (table UO, UO-1) only because it is what it says: fix '
            'the tag or the body, never the baseline.' % (held, count, examined))
        for lie in shown:
            say('         %s:%d %s: %s' % (lie['file'], lie['line'], lie['name'],
                                          '; '.join(lie['reasons'])))
        if count > len(shown):
            say('         ... and %d more (--list)' % (count - len(shown)))
        say('   ' + NOT_COVERED)
        return 1
    if count < held:
        say('OK       %d of %d tagged function(s) lie (was %d) -- lower %s '
            'to hold the ground' % (count, examined, held, REL_BASELINE))
    else:
        say('OK       %d of %d function(s) tagged pure / semi-pure-a lie, which '
            'is the baseline' % (count, examined))
    say('   ' + NOT_COVERED)
    return 0


for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
