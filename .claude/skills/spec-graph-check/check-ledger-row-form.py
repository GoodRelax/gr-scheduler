# -*- coding: utf-8 -*-
u"""Check 78 -- every ledger row is readable by its id, and a merge lost none.

WHY THIS EXISTS. 2026-10-08: a body's script wrote ten rows of
docs/development-records/defects.md as `|  DFC-n |` (two spaces). Every reader
of the ledgers matches `| DFC-n |`, so the ten rows dropped out of the metrics,
the state counts and the checklist, and check.sh stayed ALL GREEN. Only the
coordinator, counting ids of both sides by hand, saw "HEAD missing 10". The
count lived in memory (JDG-2122 lowered it into this check and into
tools/ledger_id_count.py).

WHAT IT LOOKS FOR, over the four ledgers of tools/ledger_id_count.py LEDGERS:
  (a) a table line whose head cell, with spaces, backticks and asterisks taken
      away, starts with an id (`DFC-12`, `JDG-3`, `PND-4`, any `ABC-<digits>`),
      but which is not in the one canonical form `| ABC-123 |`;
  (b) one id heading two rows across the four ledgers;
  (c) while a merge is in progress, or when HEAD is a merge commit: an id of
      either side that the merged ledgers no longer hold
      (tools/ledger_id_count.py; renumbered ids net to 0).

WHAT IT DOES NOT SEE. A row whose head cell holds no id at all, a row cut
short with its id kept, and any other file than the four ledgers.

Usage:
    python check-ledger-row-form.py [repo-root] [--self-test]

`--self-test` feeds a ledger with one canonical row, one `|  DFC-` row, one
backticked id, one bolded id and one duplicate, and expects exactly the three
malformed lines and the one duplicate reported, then a clean ledger and expects
none; it is red unless both hold.
"""
import importlib.util
import os
import re
import sys

HEAD_CELL_ID = re.compile(r'^[A-Z][A-Z0-9]*-\d+')
CANONICAL = re.compile(r'^\| [A-Z][A-Z0-9]*-\d+ \|')


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def load_counter(root):
    path = os.path.join(root, 'tools', 'ledger_id_count.py')
    spec = importlib.util.spec_from_file_location('ledger_id_count', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def malformed(text):
    """[(line_no, line)] for every table line whose head cell is an id in a non-canonical form."""
    hits = []
    for line_no, raw in enumerate(text.split('\n'), 1):
        line = raw.rstrip('\r')
        if not line.startswith('|') or line.count('|') < 2:
            continue
        head = line.split('|')[1].strip().strip('`*').strip()
        if HEAD_CELL_ID.match(head) and not CANONICAL.match(line):
            hits.append((line_no, line))
    return hits


def duplicates(texts, row_id):
    """{id: [path, ...]} for every id heading more than one row."""
    seen = {}
    for path, text in texts:
        for found in row_id.findall(text):
            seen.setdefault('%s-%s' % found, []).append(path)
    return {one: paths for one, paths in seen.items() if len(paths) > 1}


def self_test(counter):
    broken = ('| # | text |\n|---|---|\n| DFC-1 | fine |\n|  DFC-2 | two spaces |\n'
              '| `DFC-3` | backticked |\n| **DFC-4** | bold |\n| DFC-1 | again |\n| 1 | not an id |\n')
    clean = '| # | text |\n|---|---|\n| DFC-1 | fine |\n| JDG-2 | fine |\n'
    form_broken = len(malformed(broken))
    dup_broken = len(duplicates([('a.md', broken)], counter.ROW_ID))
    form_clean = len(malformed(clean))
    dup_clean = len(duplicates([('a.md', clean)], counter.ROW_ID))
    ok = (form_broken, dup_broken, form_clean, dup_clean) == (3, 1, 0, 0)
    say('%s  self-test: broken ledger %d malformed (want 3), %d duplicate (want 1); '
        'clean ledger %d, %d (want 0, 0)' % ('OK' if ok else 'FAIL', form_broken, dup_broken,
                                             form_clean, dup_clean))
    return 0 if ok else 1


def main(argv):
    root = next((one for one in argv if not one.startswith('--')), os.getcwd())
    counter = load_counter(root)
    if '--self-test' in argv:
        return self_test(counter)
    texts = [(path, counter.text_at(None, path, root)) for path in counter.LEDGERS]
    faults = 0
    for path, text in texts:
        for line_no, line in malformed(text):
            say('FAIL  %s:%d  head cell is an id but not `| ID |`: %s' % (path, line_no, line[:80]))
            faults += 1
    for one, paths in sorted(duplicates(texts, counter.ROW_ID).items()):
        say('FAIL  %s heads %d rows: %s' % (one, len(paths), ' '.join(paths)))
        faults += 1
    status, lines = counter.count([], root)
    for line in lines:
        say(('FAIL  ' if status and 'lost' in line and not line.endswith('lost 0') else '      ') + line)
    faults += status
    rows = sum(len(counter.ROW_ID.findall(text)) for _, text in texts)
    say('%s  check 78: %d ledger rows read in %d files; %d fault(s). Baseline 0'
        % ('OK' if faults == 0 else 'FAIL', rows, len(texts), faults))
    return 0 if faults == 0 else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
