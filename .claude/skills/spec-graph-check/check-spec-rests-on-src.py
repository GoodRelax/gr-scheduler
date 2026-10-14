# -*- coding: utf-8 -*-
u"""Check 81 -- the specification never rests its authority on a name only src/ has.

THE RULE (JDG-2071, JDG-2127; rule 01 ⑤). The specification is the truth and
the code follows it. A manuscript sentence that hands its authority to a code
comment or a code name -- `DFC-470`: 「`groupDepthThresholdOf` の注が自ら 2 つ
目の写しを禁じている」 -- turns that around: tidy the comment and the
specification loses its reason.

WHAT IT LOOKS FOR. The places list-inverted-authority.py finds (a deferring
verb -- 定めている / 禁じている / が持つ / に従う / の注が ... -- right after a
backticked name that docs/spec mentions nowhere else and src/ holds), minus a
name right after 「表 T-nnn の」 (a row or cell of a specification table), minus
the lines of spec-rests-on-src-exempt.txt, each with its reason. An exemption
that no longer matches anything is red too, so it cannot sit there waiting to
hide the next real hit.

WHY A GATE NOW. The lister was kept out of check.sh at 1 true hit in 3. The
table refinement took today's 8 hits to 3, and those 3 are lines that DEFINE
the name (the ERD row of `fields`, the member list of table T-064); they are
exempted by name. Baseline 0.

WHAT IT DOES NOT SEE. Code that disagrees with the specification -- that is
the spec-only tester's job (rule 05 section 7) and GT-2's. A deferral phrased
with a verb outside DEFERS, or to a name the specification also mentions
elsewhere.

Usage:
    python check-spec-rests-on-src.py [repo-root] [--self-test]

`--self-test` feeds a manuscript with one deferral to a src-only name, one to
a table cell, and one exempted line, and expects exactly the first reported
and nothing stale.
"""
import importlib.util
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
EXEMPT = os.path.join(HERE, 'spec-rests-on-src-exempt.txt')


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def load_lister():
    path = os.path.join(HERE, 'list-inverted-authority.py')
    spec = importlib.util.spec_from_file_location('list_inverted_authority', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_exemptions(text):
    """{(path, identifier)} from the exemption file's lines."""
    found = set()
    for raw in text.split('\n'):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        parts = [one.strip() for one in line.split('|')]
        if len(parts) >= 3 and parts[2]:
            found.add((parts[0], parts[1]))
    return found


def judge(hits, exemptions, rel):
    """(findings, stale exemptions)."""
    seen = set()
    findings = []
    for path, n, name, window in hits:
        key = (rel(path), name)
        if key in exemptions:
            seen.add(key)
            continue
        findings.append((key[0], n, name, window))
    return findings, sorted(exemptions - seen)


def self_test(lister):
    books = {'a.md': u'前置き `selectionMoved` の行。\n'
                     u'⛔ 写しを持たせない —— `groupDepthThresholdOf` の注が自ら禁じている。\n'
                     u'表 T-293 の `selectionSettleKeyPressed` の升が持つ。\n'
                     u'| AT-1 | `carryFields` | その要素が持つ葉 |\n'}
    src = u'groupDepthThresholdOf selectionSettleKeyPressed carryFields'
    hits = lister.find(books, lambda: [], src)
    findings, stale = judge(hits, {('a.md', 'carryFields'), ('a.md', 'goneName')}, lambda p: p)
    names = [one[2] for one in findings]
    ok = names == ['groupDepthThresholdOf'] and stale == [('a.md', 'goneName')]
    say('%s  self-test: findings %s (want groupDepthThresholdOf), stale %s (want goneName)'
        % ('OK' if ok else 'FAIL', names, [one[1] for one in stale]))
    return 0 if ok else 1


def main(argv):
    lister = load_lister()
    if '--self-test' in argv:
        return self_test(lister)
    root = next((one for one in argv if not one.startswith('--')), lister.ROOT)

    def rel(path):
        return os.path.relpath(path, root).replace('\\', '/')

    with io.open(EXEMPT, encoding='utf-8') as handle:
        exemptions = read_exemptions(handle.read())
    findings, stale = judge(lister.find(lister.manuscripts(), lister.source_files), exemptions, rel)
    for path, n, name, window in findings:
        say('FAIL  %s:%d  rests on `%s`, which only src/ holds: %s' % (path, n, name, window.strip()[:120]))
    for path, name in stale:
        say('FAIL  exemption %s | %s matches nothing now: remove it from %s'
            % (path, name, os.path.basename(EXEMPT)))
    faults = len(findings) + len(stale)
    say('%s  check 81: %d deferral(s) to a src-only name, %d exempted, %d stale exemption(s). Baseline 0'
        % ('OK' if faults == 0 else 'FAIL', len(findings), len(exemptions) - len(stale), len(stale)))
    return 0 if faults == 0 else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
