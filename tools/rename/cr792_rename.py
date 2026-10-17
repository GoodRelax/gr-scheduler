# -*- coding: utf-8 -*-
"""Survey (and, at stage 2, apply) the CR-792 rename of whole identifiers.

    PYTHONIOENCODING=utf-8 python tools/rename/cr792_rename.py --survey
    PYTHONIOENCODING=utf-8 python tools/rename/cr792_rename.py --apply

Reads docs/review/cr-792-rename-map.tsv (the ruled renames) and
docs/review/cr-792-related.tsv (the decision for every OTHER identifier that
contains an old name), and prints the dry-run tables CR-792 carries.

TWO KINDS OF MAP ROW.
  whole  the old name is specific: every token that IS the old name, on
         identifier boundaries, in a live hand-edited file is renamed.
         `assignTask` is never touched by a rename of `task`: a token is
         compared whole, never searched as a substring.
  sites  the old name is a common word (`uid`, `id`, `row`, `element`, ...):
         it is renamed only at the manuscript sites the survey lists (the
         command values and Agent API fields the ruling names), the types
         are regenerated from the manuscripts, and tsc lists every use that
         follows. A text replacement of `uid` would touch thousands of
         places that mean something else.

RELATED IDENTIFIERS. For each `whole` row the survey lists every token that
CONTAINS the old name as a run of its camelCase / snake / kebab parts
(`editGroupOf`, `SCROLL_DAY_OFFSET`, `data-edit-group`) but is not the old
name itself, with its count and files. Each needs a decision in
cr-792-related.tsv: `add` (rename it too, to the `new` given there) or
`keep` (with the reason). The survey marks a token with no decision as
UNDECIDED, and stage 2 refuses to write while any remains. A token is also
listed when it holds the run in the plural (`sourceProjectUids`) or, for an
old name of three parts or more, the run without its last part
(`withParentProgressTolerance`) -- the review of stage 1 found five such
identifiers the exact run had missed.

APPLY. --apply renames every `whole` old name and every `add` identifier,
compared whole with the same token reading as the survey, in every live
hand-edited file. It refuses while any token is UNDECIDED. It writes the
file's bytes back with each line ending as it was (an identifier never spans
a line), and prints the count per name so it can be compared with the survey.

SCOPE. The live prefixes of rename_common (src, tests, docs/spec, tools,
the rules, the guides, ...) plus sample-schedule/ and the four GRS JSON
documents outside them that the FR-073 test opens as current documents
(EXTRA_FILES). Generated files are
counted apart: they follow `npm run gen`, never an edit. History
(change-request/, docs/development-records/, previous-project-result/) is
never edited.
"""
import collections
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rename_common as rc  # noqa: E402

MAP_TSV = 'docs/review/cr-792-rename-map.tsv'
RELATED_TSV = 'docs/review/cr-792-related.tsv'
EXTRA_LIVE = ('sample-schedule/',)
# GRS JSON documents the current build must open (CURRENT_DOCUMENTS of the
# DFC-2950 contract test) that sit outside the live prefixes: an old key left
# in them is refused, since no older shape is read before official use.
EXTRA_FILES = (
    'docs/about/samples/sample-large-erp-program.en.json',
    'docs/about/samples/sample-large-erp-program.ja.json',
    'docs/development-records/project-plan.json',
    'docs/development-records/previous-plan.json',
)
# Files that name the old names as a RECORD -- the check-84 allow-list and
# the checks whose docstrings quote a measured mismatch. Renaming inside them
# would rewrite history; the allow-list lines go stale and are deleted by
# hand in the same change (check 84 reds a stale line).
SKIP = (
    '.claude/skills/spec-graph-check/source-names-allow.txt',
    '.claude/skills/spec-graph-check/check-source-names.py',
    '.claude/skills/spec-graph-check/check-source-references.py',
    '.claude/skills/spec-graph-check/source_refs.py',
)
TOKEN = re.compile(r'[A-Za-z_$][A-Za-z0-9_$]*(?:-[A-Za-z0-9_$]+)*')


def read_tsv(path):
    full = os.path.join(rc.ROOT, path)
    if not os.path.exists(full):
        return []
    lines = io.open(full, encoding='utf-8').read().splitlines()
    head = lines[0].split('\t')
    return [dict(zip(head, l.split('\t'))) for l in lines[1:] if l.strip()]


def live_files():
    out = []
    for path in rc.git_files():
        if path in SKIP:
            continue
        if rc.is_live(path) or path in EXTRA_FILES or (
                path.startswith(EXTRA_LIVE) and path.endswith(rc.TEXT_EXTENSIONS)):
            out.append(path)
    return out


def parts(token):
    return [p.lower() for p in rc.split_parts(token)]


def has_run(token_parts, run):
    n = len(run)
    return any(token_parts[i:i + n] == run for i in range(len(token_parts) - n + 1))


def contains_run(token_parts, run):
    """The run, the run in the plural, or (3+ parts) the run less its last part."""
    if has_run(token_parts, run):
        return True
    if has_run(token_parts, run[:-1] + [run[-1] + 's']):
        return True
    return len(run) >= 3 and has_run(token_parts, run[:-1])


def scan():
    """token -> {path: count}, and the generated paths, over live files."""
    where = collections.defaultdict(collections.Counter)
    generated = set()
    for path in live_files():
        try:
            text, _crlf = rc.read_text(path)
        except (UnicodeDecodeError, OSError):
            continue
        if rc.is_generated(path, text):
            generated.add(path)
        for token in TOKEN.findall(text):
            where[token][path] += 1
    return where, generated


def survey():
    rows = read_tsv(MAP_TSV)
    related = {r['identifier']: r for r in read_tsv(RELATED_TSV)}
    where, generated = scan()
    whole = [r for r in rows if r['how'] == 'whole']
    olds = {r['old'] for r in whole}
    # WHY: after --apply a new name such as setFontSizeStep holds the run less
    # its last part of setFontScale; a name the table writes is never related.
    olds |= set(rename_table().values())
    out = []
    out.append('## Whole identifiers\n')
    out.append('| old | new | ruling | hand-edited count | files | generated count |')
    out.append('| --- | --- | --- | ---: | ---: | ---: |')
    total = 0
    for r in whole:
        hits = where.get(r['old'], {})
        hand = {p: n for p, n in hits.items() if p not in generated}
        gen = sum(n for p, n in hits.items() if p in generated)
        total += sum(hand.values())
        out.append('| `%s` | `%s` | %s | %d | %d | %d |'
                   % (r['old'], r['new'], r['ruling'], sum(hand.values()),
                      len(hand), gen))
    out.append('\nTotal hand-edited occurrences: %d\n' % total)

    out.append('## Related identifiers (contain an old name, are not one)\n')
    out.append('| identifier | contains | count | files | decision | new / reason |')
    out.append('| --- | --- | ---: | ---: | --- | --- |')
    undecided = 0
    seen = set()
    for r in whole:
        run = parts(r['old'])
        for token in sorted(where):
            if token in olds or token in seen:
                continue
            if contains_run(parts(token), run):
                seen.add(token)
                hits = where[token]
                d = related.get(token)
                decision = d['decision'] if d else 'UNDECIDED'
                why = (d.get('new') or d.get('reason', '')) if d else ''
                if d and d['decision'] == 'keep':
                    why = d.get('reason', '')
                if not d:
                    undecided += 1
                out.append('| `%s` | `%s` | %d | %d | %s | %s |'
                           % (token, r['old'], sum(hits.values()), len(hits),
                              decision, why))
    out.append('\nUndecided: %d\n' % undecided)

    out.append('## Common words renamed at listed sites only\n')
    out.append('| old | new | ruling | where (from the ruling) | whole-token count, for scale |')
    out.append('| --- | --- | --- | --- | ---: |')
    for r in rows:
        if r['how'] != 'sites':
            continue
        n = sum(where.get(r['old'], {}).values())
        out.append('| `%s` | `%s` | %s | %s | %d |'
                   % (r['old'], r['new'], r['ruling'], r['note'], n))
    return '\n'.join(out) + '\n', undecided


def rename_table():
    """old token -> new token: the `whole` rows and the `add` decisions."""
    table = {r['old']: r['new'] for r in read_tsv(MAP_TSV) if r['how'] == 'whole'}
    for r in read_tsv(RELATED_TSV):
        if r['decision'] == 'add':
            table[r['identifier']] = r['new']
    return table


def apply():
    _text, undecided = survey()
    if undecided:
        sys.stdout.write('REFUSED: %d undecided identifiers (run --survey)\n' % undecided)
        return 1
    table = rename_table()
    counts = collections.Counter()
    files = 0
    for path in live_files():
        full = os.path.join(rc.ROOT, path)
        try:
            text = io.open(full, 'rb').read().decode('utf-8')
        except (UnicodeDecodeError, OSError):
            continue
        if rc.is_generated(path, text.replace('\r\n', '\n')):
            continue
        hits = []

        def swap(match):
            token = match.group(0)
            if token in table:
                hits.append(token)
                return table[token]
            return token
        new = TOKEN.sub(swap, text)
        if hits:
            assert new.count('\r\n') == text.count('\r\n'), path
            io.open(full, 'wb').write(new.encode('utf-8'))
            files += 1
            counts.update(hits)
    for old in sorted(counts):
        print('%5d %s -> %s' % (counts[old], old, table[old]))
    print('Total: %d occurrences in %d files' % (sum(counts.values()), files))
    return 0


def files_of(name):
    where, generated = scan()
    for path, n in sorted(where.get(name, {}).items()):
        print('%5d %s%s' % (n, path, '  (generated)' if path in generated else ''))


def main(argv):
    if '--survey' in argv:
        text, undecided = survey()
        sys.stdout.write(text)
        return 1 if undecided else 0
    if '--apply' in argv:
        return apply()
    if '--files' in argv:
        files_of(argv[argv.index('--files') + 1])
        return 0
    sys.stdout.write(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
