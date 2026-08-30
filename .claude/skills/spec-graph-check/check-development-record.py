# -*- coding: utf-8 -*-
"""Check 24: the development record agrees with the tree.

`docs/development-records/` holds what git cannot answer -- where the work is
and what may be depended on yet (docs/development-rules/05-working-method.md).
⛔ A record that drifts from the tree is worse than none: the next session reads
it after a power cut and starts from a state that is not true.

⭐ "Not started" is decided EXACTLY, not by a heuristic: a unit is untouched
when its file is byte for byte what tools/generate_unit_tree.py writes for it.
That generator can render the stub, so this asks it rather than guessing from
line counts or exports -- which was tried first and separated nothing, because
a stub public entry already re-exports its seam.

    python check-development-record.py

Each record declares the folder it covers, so this file holds no second list
of waves to fall out of step with the records themselves.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
RECORDS = os.path.join(ROOT, 'docs', 'development-records')

sys.path.insert(0, os.path.join(ROOT, 'tools'))

# The four stages of 05-working-method.md. ⛔ Only the first is decidable from
# the tree; the rest say "someone has worked on this", which is the half a
# machine can hold against reality.
NOT_STARTED = '⬜'
STAGES = (NOT_STARTED, '🔧', '🧪', '✅')

TARGET = re.compile(r'\*\*対象\*\*:\s*`([^`]+)`')
ROW = re.compile(r'^\|\s*(UF-\d+|—)\s*\|\s*`([^`]+\.ts)`\s*\|.*\|\s*(' +
                 '|'.join(STAGES) + r')\s')


def stub_text(unit, publishes, entries):
    import generate_unit_tree as tree
    return tree.body(unit, publishes, entries)


def units_of(folder):
    """Every unit the generator would write under `folder`, with its stub."""
    import generate_unit_tree as tree
    units, entries, declares, publishes, problems = tree.build()
    if problems:
        return None, ['tools/generate_unit_tree.py cannot read table T-075: %s'
                      % problems[0]]
    for component, declared in declares.items():
        entry = entries.get(component)
        if entry is not None:
            entry['reexports'] = [name for _row, name in declared]
    out = {}
    for unit in units:
        path = unit['path'].replace('\\', '/')
        if path.startswith(folder.rstrip('/') + '/'):
            out[os.path.basename(path)] = (path, stub_text(unit, publishes, entries))
    return out, []


def main():
    if not os.path.isdir(RECORDS):
        sys.stdout.write('OK       no development record yet\n')
        return 0

    problems, checked = [], 0
    for name in sorted(os.listdir(RECORDS)):
        # ⚠️ Not every file here is a wave record. The index, the
        # pending-decision list and the defect ledger live beside them: the
        # first answers to nothing, the second to check 25, the third is
        # keyed by the user's report rather than by a folder of units,
        # and the fourth is the handing over itself.
        # ⭐ handoff.md is the fourth: it is what one round hands the next, and
        # it answers to the whole tree rather than to a folder of units.
        if not name.endswith('.md') or name in (
            'README.md', 'pending-decisions.md', 'defects.md', 'handoff.md'
        ):
            continue
        path = os.path.join(RECORDS, name)
        body = io.open(path, encoding='utf-8').read()
        found = TARGET.search(body)
        if not found:
            problems.append('%s does not declare the folder it covers -- add a '
                            'line "**対象**: `src/…`"' % name)
            continue
        folder = found.group(1).rstrip('/')
        expected, failed = units_of(folder)
        if failed:
            problems.extend(failed)
            continue
        if not expected:
            problems.append('%s covers %s, which holds no unit of table T-075'
                            % (name, folder))
            continue

        listed = {}
        for line in body.split('\n'):
            row = ROW.match(line)
            if row:
                listed.setdefault(row.group(2), []).append(row.group(3))

        for base in sorted(set(listed) - set(expected)):
            problems.append('%s lists %s, which is not a unit of %s'
                            % (name, base, folder))
        for base in sorted(set(expected) - set(listed)):
            problems.append('%s does not list %s -- every unit of %s needs a '
                            'row, or the record is a partial picture that reads '
                            'like a whole one' % (name, base, folder))
        for base, stages in sorted(listed.items()):
            if len(stages) > 1:
                problems.append('%s lists %s %d times' % (name, base, len(stages)))
            if base not in expected:
                continue
            unit_path, stub = expected[base]
            on_disk = io.open(os.path.join(ROOT, unit_path), encoding='utf-8',
                              newline='').read()
            untouched = on_disk == stub
            stage = stages[0]
            if stage == NOT_STARTED and not untouched:
                problems.append('%s calls %s not started, but the file is no '
                                'longer the stub' % (name, base))
            if stage != NOT_STARTED and untouched:
                problems.append('%s puts %s past not-started, but the file is '
                                'still exactly the stub' % (name, base))
            checked += 1

    if problems:
        for p in problems:
            sys.stdout.write('PROBLEM  %s\n' % p)
        return 1
    sys.stdout.write('OK       every development record matches the tree '
                     '(%d unit row(s) held against their files)\n' % checked)
    return 0


if __name__ == '__main__':
    sys.exit(main())
