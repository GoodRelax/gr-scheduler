# -*- coding: utf-8 -*-
"""Check 83 -- every reference between the JSON files of docs/spec/_source/
resolves.

JDG-2692 (2026-10-17): the user keeps the GRS JSON keys, the screen words,
the Agent API names and the document commands in docs/spec/_source, and asked
for a script that proves those files agree with each other. This is its first
half: a reference that points at nothing. The second half (a name that does
not match what it points at) is check 84.

WHAT IS READ. source_refs.references(): every STRUCTURED reference (a field
whose whole value names a row, a table, an erd.json entity or column, a value
shape of settings.json or a node of components.json -- the FIELDS table there)
and every PROSE reference (a row id in a code span, or 表 T-nnn, in any string)
of every JSON manuscript, `$schema` pointers included.

WHAT IS RED.
  - a reference that resolves nowhere and is not exempted;
  - an exemption that no longer matches a reference (it would hide a later
    real break under the same token).
WHAT IS PRINTED, NOT RED. A prose citation of a RETIRED id (retired.py): a
withdrawal is recorded by the text that names the withdrawn row.

⚠️ WHAT IT DOES NOT SEE. A reference written in a form neither reader knows
-- a bare `FR-131` without its code span, a field the FIELDS table does not
list. Check 7 of md-checks.py already reds a backticked id that resolves
nowhere in the GENERATED Markdown; this check reads the manuscripts, and
covers the fields that never reach any Markdown (display-words.json,
erd.json's `defaultFrom`, ...).

MEASURED 2026-10-17 on e5d2b794 plus this change: 6,738 references read, 6
not ok -- 4 property-items columns that are no column by design (exempted,
source-references-exempt.txt) and 2 retired settings rows cited in prose.
Planting `"column": "AT-9999"` in CM-87's value gives 1 red.
--self-test feeds a broken, an exempted and a retired reference and a stale
exemption.

Usage: python check-source-references.py [--self-test]
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import source_refs as sr  # noqa: E402

EXEMPT = os.path.join(HERE, 'source-references-exempt.txt')


def read_exempt(path=EXEMPT):
    """<file> | <token> | <reason>  ->  {(file, token): reason}"""
    out = {}
    for line in io.open(path, encoding='utf-8').read().splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        parts = [p.strip() for p in line.split('|')]
        if len(parts) != 3 or not parts[2]:
            raise SystemExit('source-references-exempt.txt: a line needs '
                             '<file> | <token> | <reason>: %r' % line)
        out[(parts[0], parts[1])] = parts[2]
    return out


def problems(refs, exempt):
    """(red lines, retired notes) for these references."""
    red, notes, used = [], [], set()
    for r in refs:
        if r.status == 'ok':
            continue
        key = (r.source, r.token)
        if key in exempt:
            used.add(key)
            continue
        if r.status == 'retired':
            notes.append('%s %s: cites retired %s' % (r.source, r.path, r.token))
            continue
        red.append('%s %s: %s %r resolves nowhere'
                   % (r.source, r.path, r.field, r.token))
    for key in sorted(set(exempt) - used):
        red.append('stale exemption %s | %s -- nothing it covers is left; '
                   'delete the line' % key)
    return red, notes


def self_test():
    def ref(token, status, field='column'):
        return sr.Ref('docs/spec/_source/a.json', '/rows[0]/' + field, field,
                      token, 'row', None, status)
    refs = [ref('AT-9999', 'unresolved'), ref('Task.x', 'unresolved'),
            ref('S-440', 'retired', 'ja'), ref('AT-1', 'ok')]
    exempt = {('docs/spec/_source/a.json', 'Task.x'): 'by design',
              ('docs/spec/_source/a.json', 'gone'): 'stale'}
    red, notes = problems(refs, exempt)
    want_red = 2                                    # AT-9999 and the stale line
    if len(red) != want_red or len(notes) != 1:
        sys.stdout.write('FAIL     check 83 self-test: %d red (want %d), '
                         '%d notes (want 1)\n' % (len(red), want_red,
                                                   len(notes)))
        for line in red + notes:
            sys.stdout.write('  %s\n' % line)
        return 1
    sys.stdout.write('OK       check 83 self-test: a broken reference and a '
                     'stale exemption red, an exempted one passes, a retired '
                     'citation is a note\n')
    return 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    os.chdir(ROOT)
    refs = sr.references(sr.Definitions())
    red, notes = problems(refs, read_exempt())
    for line in notes:
        sys.stdout.write('  NOTE %s\n' % line)
    for line in red:
        sys.stdout.write('  %s\n' % line)
    if red:
        sys.stdout.write('FAIL     %d reference(s) between the _source JSON '
                         'files resolve nowhere\n' % len(red))
        return 1
    sys.stdout.write('OK       %d references from %d JSON manuscripts resolve '
                     '(%d exempted, %d retired ids cited in prose)\n'
                     % (len(refs), len(sr.manuscripts()),
                        len(read_exempt()), len(notes)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
