# -*- coding: utf-8 -*-
"""Git merge drivers for the files that collided on every merge.

    python tools/merge_driver.py install            write the drivers into git config
    python tools/merge_driver.py --check            check 67: the routing still holds
    python tools/merge_driver.py generated %O %A %B %P
    python tools/merge_driver.py ledger    %O %A %B %P

WHY. Two files collided on every merge of the 2026-09-26 round, and neither
collision was ever a disagreement between people:

  * docs/spec/_assets/tbl-row-id-prefixes.md -- a generated document whose row
    counts move whenever any branch adds a row to any table. Two branches that
    each add a DFC row both rewrite the same count cell.
  * the metrics block at the head of docs/development-records/defects.md --
    printed by tools/ledger_metrics.py, so the same count cells again.

A third one collided just as often and was just as empty: two branches that
each APPEND rows to the same ledger table conflict on the line after the last
row, although neither side changed a row the other wrote.

WHAT EACH DRIVER DOES. .gitattributes names the driver per path; the drivers
themselves live in git config, which is not tracked, so `install` writes them
(tools/merge_branch.py runs it on every merge, so a fresh clone heals itself).
A path whose driver is not configured falls back to git's ordinary text merge,
so a missing install costs a conflict, never a wrong file.

  generated   the file is rebuilt from other files, so its merge is thrown away
              anyway. Keep git's clean merge when there is one; otherwise keep
              OURS. Never a conflict. Exit 0.
  ledger      a hand-written ledger. (1) Every generated block (see BLOCKS) is
              replaced in BASE and THEIRS by OURS's copy before merging, so the
              block can never conflict. (2) A conflict hunk in which both sides
              only APPENDED table rows, with no row id in common, is resolved
              as base + ours' rows + theirs' rows. (3) Anything else stays a
              conflict, written with diff3 markers, and the driver exits 1.

WHAT IS LEFT TO DO AFTER THE MERGE. Both drivers leave the generated text
STALE on purpose -- regenerating inside a driver would read a working tree that
git has not finished writing. Checks 24 (ledger_metrics --check) and 27
(row_id_prefixes_json_to_md.py --check) turn red until it is rebuilt:

    npm run gen && python tools/ledger_metrics.py

tools/merge_branch.py does that for you.

WHAT IT CANNOT SEE: two branches that took the SAME new row id. That is a real
conflict and stays one; tools/renumber_ids.py is how ids stop colliding.
"""
import io
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

DRIVERS = {
    'grs-generated': ('GRS generated file: clean merge or ours, rebuild after',
                      'generated'),
    'grs-ledger': ('GRS ledger: generated blocks and appended rows merge alone',
                   'ledger'),
}

# (begin marker, end marker) of every generated block that sits INSIDE a
# hand-written ledger. The block is rebuilt after the merge, so the merge may
# keep any copy of it -- it keeps OURS.
BLOCKS = [
    ('<!-- ledger-metrics: begin', '<!-- ledger-metrics: end -->'),
]

# A ledger table row: `| DFC-123 | ...`, the id optionally backticked.
ROW = re.compile(r'^\|\s*`?([A-Z]{1,4}-[0-9]+[a-z]?)`?\s*\|')


def say(message):
    sys.stderr.write(message + '\n')


def read_bytes(path):
    with open(path, 'rb') as handle:
        return handle.read()


def write_bytes(path, data):
    with open(path, 'wb') as handle:
        handle.write(data)


def merge_file(ours, base, theirs, diff3=False):
    """git merge-file -p on three byte strings -> (merged bytes, conflicts).

    conflicts < 0 means git merge-file itself failed.
    """
    folder = tempfile.mkdtemp(prefix='grs-merge-')
    names = []
    try:
        for label, data in (('ours', ours), ('base', base), ('theirs', theirs)):
            name = os.path.join(folder, label)
            write_bytes(name, data)
            names.append(name)
        command = ['git', 'merge-file', '-p', '-L', 'ours', '-L', 'base',
                   '-L', 'theirs']
        if diff3:
            command.append('--diff3')
        done = subprocess.run(command + names, capture_output=True)
        return done.stdout, done.returncode
    finally:
        for name in names:
            os.remove(name)
        os.rmdir(folder)


def driver_generated(base, ours, theirs, path):
    merged, conflicts = merge_file(read_bytes(ours), read_bytes(base),
                                   read_bytes(theirs))
    if conflicts == 0:
        write_bytes(ours, merged)
        say('grs-generated: %s merged cleanly; rebuild it anyway '
            '(npm run gen)' % path)
    else:
        say('grs-generated: %s conflicted; kept ours -- rebuild it '
            '(npm run gen)' % path)
    return 0


def block_span(text, begin, end):
    i = text.find(begin)
    if i < 0:
        return None
    j = text.find(end, i)
    if j < 0:
        return None
    return i, j + len(end)


def with_blocks_of(text, donor):
    """`text` with every generated block replaced by `donor`'s copy."""
    for begin, end in BLOCKS:
        mine, theirs = block_span(text, begin, end), block_span(donor, begin, end)
        if mine is None or theirs is None:
            continue
        text = text[:mine[0]] + donor[theirs[0]:theirs[1]] + text[mine[1]:]
    return text


def row_id(line):
    match = ROW.match(line.rstrip('\r\n'))
    return match.group(1) if match else None


def resolve_appends(base, ours, theirs):
    """The lines of one conflict hunk, or None when it is a real conflict.

    Resolvable only when BOTH sides kept the base lines as a prefix and added
    nothing but table rows after them, and no row id is on both sides.
    """
    if ours[:len(base)] != base or theirs[:len(base)] != base:
        return None
    ours_added, theirs_added = ours[len(base):], theirs[len(base):]
    ours_ids = [row_id(line) for line in ours_added]
    theirs_ids = [row_id(line) for line in theirs_added]
    if None in ours_ids or None in theirs_ids:
        return None
    if set(ours_ids) & set(theirs_ids):
        return None
    ending = '\r\n' if ours_added and ours_added[-1].endswith('\r\n') else '\n'
    out = list(base) + list(ours_added) + list(theirs_added)
    # A side's last line may lack its newline at end of file.
    return [line if line.endswith('\n') else line + ending for line in out]


def settle_hunks(merged):
    """Resolve the append-only hunks of a diff3-marked text.

    Returns (text, conflicts left).
    """
    lines = merged.splitlines(True)
    out = []
    left = 0
    i = 0
    while i < len(lines):
        if not lines[i].startswith('<<<<<<< '):
            out.append(lines[i])
            i += 1
            continue
        start = i
        ours, base, theirs = [], [], []
        part = ours
        i += 1
        while i < len(lines) and not lines[i].startswith('>>>>>>> '):
            if lines[i].startswith('||||||| '):
                part = base
            elif lines[i].startswith('=======') and part is not theirs:
                part = theirs
            else:
                part.append(lines[i])
            i += 1
        end = i
        i += 1
        settled = resolve_appends(base, ours, theirs)
        if settled is None:
            out.extend(lines[start:end + 1])
            left += 1
        else:
            out.extend(settled)
    return ''.join(out), left


def driver_ledger(base, ours, theirs, path):
    decode = lambda data: data.decode('utf-8')
    ours_text = decode(read_bytes(ours))
    base_text = with_blocks_of(decode(read_bytes(base)), ours_text)
    theirs_text = with_blocks_of(decode(read_bytes(theirs)), ours_text)
    merged, conflicts = merge_file(ours_text.encode('utf-8'),
                                   base_text.encode('utf-8'),
                                   theirs_text.encode('utf-8'), diff3=True)
    if conflicts < 0:
        say('grs-ledger: %s: git merge-file failed (%d)' % (path, conflicts))
        return 1
    text = decode(merged)
    left = 0
    if conflicts > 0:
        text, left = settle_hunks(text)
    write_bytes(ours, text.encode('utf-8'))
    if left:
        say('grs-ledger: %s: %d conflict(s) are not appended rows -- resolve '
            'by hand' % (path, left))
        return 1
    say('grs-ledger: %s merged (%d appended-row hunk(s) joined); rebuild the '
        'counts (python tools/ledger_metrics.py)' % (path, conflicts))
    return 0


# The paths that collided on every merge before the drivers existed, and the
# driver each must keep. Check 67 holds .gitattributes to this list.
REQUIRED = {
    'docs/spec/_assets/tbl-row-id-prefixes.md': 'grs-generated',
    'docs/development-records/defects.md': 'grs-ledger',
}


def check():
    """Check 67: .gitattributes still routes the colliding files to a driver
    this file defines, every path it names is tracked, and every generated
    block the ledger driver neutralises is still where it looks for it."""
    faults = []
    attributes = io.open(os.path.join(ROOT, '.gitattributes'), encoding='utf-8').read()
    for number, line in enumerate(attributes.split('\n'), start=1):
        fields = line.split()
        if len(fields) < 2 or line.startswith('#'):
            continue
        drivers = [one[len('merge='):] for one in fields[1:] if one.startswith('merge=')]
        for driver in drivers:
            if driver.startswith('grs-') and driver not in DRIVERS:
                faults.append('.gitattributes:%d  merge=%s is not a driver of '
                              'tools/merge_driver.py' % (number, driver))
            listed = subprocess.run(['git', 'ls-files', '--error-unmatch', fields[0]],
                                    cwd=ROOT, capture_output=True)
            if listed.returncode != 0:
                faults.append('.gitattributes:%d  %s is not a tracked file -- '
                              'renamed?' % (number, fields[0]))
    for path, driver in sorted(REQUIRED.items()):
        said = subprocess.run(['git', 'check-attr', 'merge', '--', path], cwd=ROOT,
                              capture_output=True, text=True).stdout.strip()
        if not said.endswith(': merge: %s' % driver):
            faults.append('%s  must merge with %s, and .gitattributes says: %s'
                          % (path, driver, said.split(': ')[-1]))
    for path, driver in sorted(REQUIRED.items()):
        if driver != 'grs-ledger':
            continue
        text = io.open(os.path.join(ROOT, path), encoding='utf-8').read()
        for begin, end in BLOCKS:
            if block_span(text, begin, end) is None:
                faults.append('%s  has no block between %r and %r -- the ledger '
                              'driver would merge the counts as text' % (path, begin, end))
    for one in faults:
        print('  ' + one)
    if faults:
        print('DRIFTED  %d fault(s) in the merge-driver routing' % len(faults))
        return 1
    print('OK       .gitattributes routes %d colliding file(s) to %s'
          % (len(REQUIRED), ', '.join(sorted(DRIVERS))))
    return 0


def install(cwd=ROOT):
    """Write both drivers into the repository's git config. Idempotent."""
    script = 'tools/merge_driver.py'
    for name, (label, kind) in sorted(DRIVERS.items()):
        # git runs a merge driver from the top of the work tree, so a
        # relative path to the tracked script is enough.
        command = 'python %s %s %%O %%A %%B %%P' % (script, kind)
        for key, value in (('name', label), ('driver', command)):
            subprocess.run(['git', 'config', 'merge.%s.%s' % (name, key), value],
                           cwd=cwd, check=True)
    return 0


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        encoding = sys.stdout.encoding or 'utf-8'
        sys.stdout.write(__doc__.encode(encoding, 'replace').decode(encoding))
        return 0 if argv else 2
    if argv[0] == '--check' and len(argv) == 1:
        return check()
    if argv[0] == 'install' and len(argv) == 1:
        install()
        print('installed merge drivers: %s' % ', '.join(sorted(DRIVERS)))
        return 0
    if argv[0] in ('generated', 'ledger') and len(argv) == 5:
        base, ours, theirs, path = argv[1:]
        if argv[0] == 'generated':
            return driver_generated(base, ours, theirs, path)
        return driver_ledger(base, ours, theirs, path)
    say('usage: merge_driver.py install | generated|ledger %O %A %B %P')
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
