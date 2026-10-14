# -*- coding: utf-8 -*-
"""Count the ledger row ids on both sides of a merge and in its result.

    python tools/ledger_id_count.py                  # a merge in progress (HEAD, MERGE_HEAD, the work tree),
                                                     # else the HEAD commit when it is a merge, else nothing
    python tools/ledger_id_count.py --commit <sha>   # a merge commit against its two parents
    python tools/ledger_id_count.py <ours> <theirs>  # two revisions against the work tree

It prints one line per id prefix (DFC, JDG, PND):

    ledger ids DFC: ours 1268, theirs 1270, merged 1270, lost 0

and exits 1 when any `lost` is not 0.

THE RULE (JDG-2122). A merge keeps every ledger row either side holds. The
ledgers are the four files of LEDGERS, read as ONE set, because a row moves
from defects.md to fixed-defects.md when it closes. A row id is the head cell
of a table row in its one canonical form, `| DFC-123 |`; check 78 reds any row
whose head cell is an id in another form, which is how rows hid before.

HOW `lost` IS COUNTED, per prefix:
    expected = (ours | theirs) - (base - ours) - (base - theirs)
               -- every id either side holds, less what either side deleted
                  since the merge base on purpose;
    lost     = |expected - merged| - |merged - (ours | theirs)|
               -- an id renumbered at the merge (tools/renumber_ids.py) leaves
                  one id and brings another, so it nets to 0; a row that
                  vanished does not.

WHY. 2026-10-08: a body's script wrote ten defects.md rows as `|  DFC-n |`
(two spaces). Every reader skipped them, check.sh stayed green, and only the
coordinator counting ids by hand saw "HEAD missing 10". The count was a habit
in memory; this makes it a number every merge prints (tools/merge_branch.py
step 5, and check 78 while a merge is in progress or HEAD is one).

WHAT IT CANNOT SEE: a row kept with its id but with its text cut short, and
two rows that swapped ids.
"""
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LEDGERS = [
    'docs/development-records/rulings.md',
    'docs/development-records/defects.md',
    'docs/development-records/fixed-defects.md',
    'docs/development-records/pending-decisions.md',
]
ROW_ID = re.compile(r'^\| ([A-Z]+)-(\d+) \|', re.M)
RULE = 'JDG-2122'


def git(args, root=ROOT):
    done = subprocess.run(['git'] + args, cwd=root, capture_output=True)
    return done.returncode, done.stdout.decode('utf-8', 'replace').strip()


def text_at(rev, path, root=ROOT):
    """The file at a revision, or in the work tree when rev is None; '' when absent."""
    if rev is None:
        full = os.path.join(root, path.replace('/', os.sep))
        if not os.path.isfile(full):
            return ''
        with open(full, encoding='utf-8', errors='replace') as handle:
            return handle.read()
    status, out = git(['show', '%s:%s' % (rev, path)], root)
    return out if status == 0 else ''


def ids_of(text):
    return {'%s-%s' % found for found in ROW_ID.findall(text)}


def ids_at(rev, root=ROOT):
    found = set()
    for path in LEDGERS:
        found |= ids_of(text_at(rev, path, root))
    return found


def prefix_of(one):
    return one.split('-', 1)[0]


def tally(base, ours, theirs, merged):
    """{prefix: (ours, theirs, merged, lost)} over the id sets."""
    expected = (ours | theirs) - (base - ours) - (base - theirs)
    vanished = expected - merged
    arrived = merged - (ours | theirs)
    rows = {}
    for prefix in sorted({prefix_of(one) for one in ours | theirs | merged}):
        def of(ids):
            return {one for one in ids if prefix_of(one) == prefix}
        lost = len(of(vanished)) - len(of(arrived))
        rows[prefix] = (len(of(ours)), len(of(theirs)), len(of(merged)), max(lost, 0), sorted(of(vanished)))
    return rows


def revisions(argv, root=ROOT):
    """(label, base, ours, theirs, merged) revisions; merged None is the work tree. None when no merge."""
    if '--commit' in argv:
        sha = argv[argv.index('--commit') + 1]
        _, parents = git(['rev-list', '--parents', '-n', '1', sha], root)
        parts = parents.split()
        if len(parts) < 3:
            return None
        ours, theirs = parts[1], parts[2]
        return ('merge %s' % sha[:8], ours, theirs, sha)
    named = [one for one in argv if not one.startswith('--')]
    if len(named) >= 2:
        return ('%s + %s into the work tree' % (named[0], named[1]), named[0], named[1], None)
    status, merge_head = git(['rev-parse', '-q', '--verify', 'MERGE_HEAD'], root)
    if status == 0 and merge_head:
        return ('merge in progress', 'HEAD', merge_head, None)
    _, parents = git(['rev-list', '--parents', '-n', '1', 'HEAD'], root)
    parts = parents.split()
    if len(parts) >= 3:
        return ('HEAD merge %s' % parts[0][:8], parts[1], parts[2], parts[0])
    return None


def count(argv, root=ROOT):
    """(exit code, lines)."""
    found = revisions(argv, root)
    if found is None:
        return 0, ['ledger ids: no merge in progress and HEAD is not a merge -- nothing to count']
    label, ours_rev, theirs_rev, merged_rev = found
    status, base_rev = git(['merge-base', ours_rev, theirs_rev], root)
    base = ids_at(base_rev, root) if status == 0 and base_rev else set()
    rows = tally(base, ids_at(ours_rev, root), ids_at(theirs_rev, root), ids_at(merged_rev, root))
    lines = ['ledger ids (%s, %s):' % (label, RULE)]
    worst = 0
    for prefix, (ours, theirs, merged, lost, vanished) in rows.items():
        lines.append('ledger ids %s: ours %d, theirs %d, merged %d, lost %d' % (prefix, ours, theirs, merged, lost))
        if lost:
            worst = 1
            lines.append('    missing from the merged ledgers: %s' % ' '.join(vanished[:20]))
    return worst, lines


def main(argv):
    if '-h' in argv or '--help' in argv:
        sys.stdout.write(__doc__)
        return 0
    status, lines = count(argv)
    for line in lines:
        print(line)
    return status


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
