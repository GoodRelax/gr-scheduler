# -*- coding: utf-8 -*-
"""Check 83 -- every reference between the JSON files of docs/spec/_source/
resolves, and lands where its field says it may.

JDG-2692 (2026-10-17): the user keeps the GRS JSON keys, the screen words,
the Agent API names and the document commands in docs/spec/_source, and asked
for a script that proves those files agree with each other. This is its first
half: a reference that points at nothing, or at the wrong kind of thing. The
second half (a name that does not match what it points at) is check 84.

WHAT IS READ. source_refs.references(): every STRUCTURED reference (a field
whose whole value names a row, a table, an erd.json entity or column, a value
shape of settings.json or a node of components.json -- the FIELDS table there)
and every PROSE reference (a token shaped like a row id or a table number, in
a code span or bare, in any other string or dict key) of every manuscript and
hand-written schema of _source, `$schema` pointers included.

WHAT IS RED.
  - unresolved: a reference that resolves nowhere (a bare token counts only
    when its prefix is one the specification registered);
  - malformed: a pointing field whose value is not an id at all
    (`"column": "parentProgressToleranceDays"`);
  - wrong-family: an id of another table where the field allows only some
    (`valuesOf` takes `S-` rows; `PR-1` there is red);
  - wrong-entity: a command's `column` on an entity its union does not write
    (CM-26, a TaskGroupCommand, pointing at a Task column);
  - an id document-commands.json lists as retired that retired.py lacks;
  - an exemption that no longer matches a reference (it would hide a later
    real break under the same token).
WHAT IS PRINTED, NOT RED. A citation of a RETIRED id (retired.py): a
withdrawal is recorded by the text that names the withdrawn row.

⚠️ WHAT IT DOES NOT SEE. A pointing field missing from FIELDS is read as
prose: its ids count, but a non-id value in it passes. A name with no id
shape (an Agent API member, a command's own name) is check 84's or nobody's.

MEASURED 2026-10-17 on d4eb2573 plus this change: 7,766 references from 15
manuscripts and 11 schemas; 5 exempted with a reason; 3 retired ids cited
(printed). The review of 585b29cc broke a copy ten ways (its breaktest.py);
B (a dangling id in state-machines `rows`), C (a dangling `manner`), D (a
dangling PA `tag`), E (CM-26's column on a Task), F (a name where `column`
wants an id) and J (`valuesOf` naming a PR row) were green before this change
and are each 1 red now. --self-test feeds one reference of every red status,
an exempted and a retired one, and a stale exemption.

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
WHY = {
    'unresolved': 'resolves nowhere',
    'malformed': 'is not an id, where the field wants one',
    'wrong-family': 'lands in a table family the field does not allow',
    'wrong-entity': 'is a column of an entity this command does not write',
}


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


def problems(refs, exempt, retired_missing=()):
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
        red.append('%s %s: %s %r %s'
                   % (r.source, r.path, r.field, r.token, WHY[r.status]))
    for rid in retired_missing:
        red.append('document-commands.json lists %s as retired and retired.py '
                   'does not -- add it there with its reason' % rid)
    for key in sorted(set(exempt) - used):
        red.append('stale exemption %s | %s -- nothing it covers is left; '
                   'delete the line' % key)
    return red, notes


def self_test():
    def ref(token, status, field='column'):
        return sr.Ref('docs/spec/_source/a.json', '/rows[0]/' + field, field,
                      token, 'row', None, status)
    refs = [ref('AT-9999', 'unresolved'), ref('name', 'malformed'),
            ref('PR-1', 'wrong-family'), ref('AT-27', 'wrong-entity'),
            ref('Task.x', 'unresolved'), ref('S-440', 'retired', 'ja'),
            ref('AT-1', 'ok')]
    exempt = {('docs/spec/_source/a.json', 'Task.x'): 'by design',
              ('docs/spec/_source/a.json', 'gone'): 'stale'}
    red, notes = problems(refs, exempt, ['CM-99'])
    want_red = 6            # four statuses, the retired list and the stale line
    if len(red) != want_red or len(notes) != 1:
        sys.stdout.write('FAIL     check 83 self-test: %d red (want %d), '
                         '%d notes (want 1)\n' % (len(red), want_red,
                                                   len(notes)))
        for line in red + notes:
            sys.stdout.write('  %s\n' % line)
        return 1
    sys.stdout.write('OK       check 83 self-test: each red status, a retired '
                     'id missing from retired.py and a stale exemption red; an '
                     'exempted reference passes; a retired citation is a note\n')
    return 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    os.chdir(ROOT)
    refs = sr.references(sr.Definitions())
    exempt = read_exempt()
    red, notes = problems(refs, exempt, sr.retired_disagreements())
    for line in notes:
        sys.stdout.write('  NOTE %s\n' % line)
    for line in red:
        sys.stdout.write('  %s\n' % line)
    if red:
        sys.stdout.write('FAIL     %d reference(s) between the _source JSON '
                         'files are broken\n' % len(red))
        return 1
    sys.stdout.write('OK       %d references from %d manuscripts and %d schemas '
                     'resolve where their field allows (%d exempted, %d '
                     'retired ids cited)\n'
                     % (len(refs), len(sr.manuscripts()), len(sr.schemas()),
                        len(exempt), len(notes)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
