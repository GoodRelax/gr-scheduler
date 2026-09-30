# -*- coding: utf-8 -*-
u"""Check 74 -- no tracked text file holds a git conflict marker.

WHY THIS EXISTS. The b3 merge committed docs/development-records/rulings.md
with a diff3 conflict hunk still inside it -- `<<<<<<<`, `|||||||`,
`=======` and `>>>>>>>` all landed in the tracked file, and no check caught
it before `dfa36886` removed the hunk by hand. JDG-778, the coordinator's
handoff of 2026-10-01: a machine check belongs beside the other content
checks, not left to a reviewer's eye.

WHAT IT LOOKS FOR, over every file `git ls-files` tracks except anything
under `docs/reference/` (checked-in third-party schema, out of scope for
this tree's own conflicts) and files that do not decode as UTF-8 text
(binaries):
  * a line starting with `<<<<<<< ` (conflict start);
  * a line starting with `>>>>>>> ` (conflict end);
  * a line starting with `||||||| ` (diff3 common-ancestor marker);
  * a line that is EXACTLY `=======`, and ONLY while it sits between a
    `<<<<<<<` line and the `>>>>>>>` line that closes it.
⚠️ The bare `=======` line is qualified on purpose: a Markdown setext H1
underline is also a run of `=` characters (docs/spec and the ledgers both
use the style), and without the span condition this check would fire on
ordinary prose. Inside an open conflict span it is never a heading
underline, so it is always a hit there.

WHAT IT DOES NOT SEE. A conflict hunk using a non-default marker length (git
always writes exactly seven characters, so this is not a real gap); a
`<<<<<<<` line with no closing `>>>>>>>` before end of file (it is still
reported at the point it opens); a file docs/reference/ or a binary file
hides a marker inside.

Usage:
    python check-conflict-markers.py [repo-root] [--self-test]

`--self-test` runs the scanner over one in-memory conflict hunk (a merge
hunk and a diff3 hunk) and expects every marker line reported, then over a
clean file with an ordinary setext heading and expects zero; it is red
unless both hold.
"""
import io
import os
import subprocess
import sys

SKIP_TREES = ('docs/reference/',)


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def find_conflicts(text):
    """[(line_no, line)] for every conflict-marker line in text (str)."""
    hits = []
    in_span = False
    for line_no, raw in enumerate(text.split('\n'), 1):
        line = raw.rstrip('\r')
        if line.startswith('<<<<<<< '):
            hits.append((line_no, line))
            in_span = True
        elif line.startswith('>>>>>>> '):
            hits.append((line_no, line))
            in_span = False
        elif line.startswith('||||||| '):
            hits.append((line_no, line))
        elif in_span and line == '=======':
            hits.append((line_no, line))
    return hits


def tracked(root):
    out = subprocess.check_output(['git', 'ls-files'], cwd=root)
    return [p for p in out.decode('utf-8').split('\n') if p.strip()]


def self_test():
    merge_hunk = (
        'before the hunk\n'
        '<<<<<<< HEAD\n'
        'our line\n'
        '=======\n'
        'their line\n'
        '>>>>>>> feature-branch\n'
        'after the hunk\n'
    )
    diff3_hunk = (
        '<<<<<<< HEAD\n'
        'our line\n'
        '||||||| merged common ancestors\n'
        'base line\n'
        '=======\n'
        'their line\n'
        '>>>>>>> feature-branch\n'
    )
    clean = (
        'A Heading\n'
        '=========\n'
        'ordinary prose, never a conflict -- the row-id prefix is DFC, not '
        'a marker\n'
    )
    merge_hits = find_conflicts(merge_hunk)
    diff3_hits = find_conflicts(diff3_hunk)
    clean_hits = find_conflicts(clean)
    ok = len(merge_hits) == 3 and len(diff3_hits) == 4 and len(clean_hits) == 0
    say(u'%s  self-test: merge hunk gave %d (want 3), diff3 hunk gave %d '
        u'(want 4), the clean setext heading gave %d (want 0)'
        % (u'OK      ' if ok else u'PROBLEM ',
           len(merge_hits), len(diff3_hits), len(clean_hits)))
    return 0 if ok else 1


def main(argv):
    if '--self-test' in argv:
        return self_test()
    positional = [a for a in argv[1:] if not a.startswith('--')]
    root = positional[0] if positional else '.'

    hits, scanned, skipped_binary = [], 0, 0
    for rel in tracked(root):
        if any(rel.startswith(t) for t in SKIP_TREES):
            continue
        try:
            data = io.open(os.path.join(root, rel), 'rb').read()
        except (IOError, OSError):
            continue
        try:
            text = data.decode('utf-8')
        except UnicodeDecodeError:
            skipped_binary += 1
            continue
        scanned += 1
        for line_no, line in find_conflicts(text):
            hits.append((rel, line_no, line))

    if hits:
        say(u'FAIL     %d git conflict marker line(s) in %d file(s). ⛔ A '
            u'merge landed without resolving every hunk -- this is what '
            u'DFC-1461 records.'
            % (len(hits), len(set(h[0] for h in hits))))
        for rel, line_no, line in hits[:40]:
            say(u'         %s:%d  %s' % (rel, line_no, line.strip()[:100]))
        if len(hits) > 40:
            say(u'         ... and %d more' % (len(hits) - 40))
        return 1

    say(u'OK       no git conflict markers in tracked text: %d file(s) '
        u'scanned, %d binary file(s) skipped, docs/reference/ excluded'
        % (scanned, skipped_binary))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
