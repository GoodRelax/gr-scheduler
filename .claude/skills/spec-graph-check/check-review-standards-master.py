# -*- coding: utf-8 -*-
"""Check 92 -- rule 07 holds the perspectives of its master, no more and no fewer.

WHY THIS EXISTS. Rule 07 (docs/development-rules/07-review-standards.md) is a
derivative of process-rules/review-standards-ja.md in the gr-sw-maker
repository (rebuilt 2026-10-24). 07 says: fix a perspective in the master
first, then bring 07 up to it. Nothing noticed when 07 fell behind.

THE MASTER IS NOT READ HERE. check.sh closes inside this repository, so this
check reads a COPY of the master's names, review-standards-master-names.tsv
beside this script, and never the other repository. The copy is refreshed by
hand from a checkout of gr-sw-maker (--refresh, below; the procedure is in
docs/development-rules/09-tools.md). A refresh that brings in a changed name
turns this check red until 07 is brought up to it -- that red is the point.

WHAT IS COMPARED (each in order, by exact text):
  1. the headings of chapters R1-R8 (every "## R<n>" heading and each "###"
     heading under it) of 07 against the copy's Japanese headings;
  2. the (chapter, perspective) pairs of the comprehensive checklist (every
     table row that starts "| R<n> |") of 07 against the copy's Japanese pairs;
  3. the commit 07's head names for the master (the backticked hash on the
     line that names the master) against the copy's Japanese commit;
  4. every row of 07's old-number table names a pair of the checklist (or the
     chapter "-" of a number that left the rule).

WHAT IS RED. Any difference in 1-4, and a copy line without both a Japanese
and an English text. What 07 adds for GRS alone (the DRY procedure, the row-id
section, the finding ledger, the old-number table) sits outside R1-R8 or
inside a perspective's body, so it is not compared.

WHAT IT DOES NOT SEE. The bodies of the perspectives (their bullet lines);
whether the master changed since the last refresh.

    python .claude/skills/spec-graph-check/check-review-standards-master.py [--self-test]
    python .claude/skills/spec-graph-check/check-review-standards-master.py --refresh <gr-sw-maker checkout> [--rev main]
"""
import io
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
RULE = 'docs/development-rules/07-review-standards.md'
COPY = os.path.join(HERE, 'review-standards-master-names.tsv')
MASTER_REPO = 'gr-sw-maker'
MASTER_JA = 'process-rules/review-standards-ja.md'
MASTER_EN = 'process-rules/review-standards-en.md'
MASTER_WORD = '\u539f\u672c'  # "master", the word on 07's head line that names it
OLD_TABLE_HEADING = '## \u65e7\u756a\u53f7\u306e\u5bfe\u5fdc\u8868'  # "## old number table"
CHAPTER_HEADING = re.compile(r'^## R\d')
CHECKLIST_ROW = re.compile(r'^\| (R\d) \|')
OLD_ROW = re.compile(r'^\| R\d\.\d+[a-z]? \|')
NO_CHAPTER = ('\u2014', '-')


def cells(line):
    return [c.strip() for c in line.strip().strip('|').split('|')]


def chapter_headings(text):
    """Every '## R<n>' heading and each '###' heading under one, in order."""
    out = []
    inside = False
    for line in text.splitlines():
        if line.startswith('## '):
            inside = bool(CHAPTER_HEADING.match(line))
            if inside:
                out.append(line.strip())
        elif inside and line.startswith('### '):
            out.append(line.strip())
    return out


def checklist_pairs(text):
    """(chapter, perspective) of every table row that starts '| R<n> |'."""
    return [tuple(cells(line)[:2]) for line in text.splitlines() if CHECKLIST_ROW.match(line)]


def old_table_pairs(text):
    """(old number, chapter, perspective) of the old-number table."""
    start = text.find('\n' + OLD_TABLE_HEADING)
    if start < 0:
        return []
    return [tuple(cells(line)[:3]) for line in text[start:].splitlines() if OLD_ROW.match(line)]


def named_commit(text):
    """The backticked hash on the head line of 07 that names the master."""
    for line in text.splitlines()[:12]:
        if MASTER_WORD in line and MASTER_JA in line:
            found = re.findall(r'`([0-9a-f]{7,40})`', line)
            return found[0] if found else None
    return None


def read_copy(path=COPY):
    """{'commit': {lang: sha}, 'heading': [(ja, en)], 'pair': [(chapter, ja, en)]}"""
    copy = {'commit': {}, 'heading': [], 'pair': [], 'bad': []}
    for number, line in enumerate(io.open(path, encoding='utf-8'), 1):
        line = line.rstrip('\n')
        if not line or line.startswith('#'):
            continue
        parts = line.split('\t')
        kind = parts[0]
        if kind == 'commit' and len(parts) == 4:
            copy['commit'][parts[1]] = parts[3]
        elif kind == 'heading' and len(parts) == 3 and parts[1] and parts[2]:
            copy['heading'].append((parts[1], parts[2]))
        elif kind == 'pair' and len(parts) == 4 and all(parts[1:]):
            copy['pair'].append((parts[1], parts[2], parts[3]))
        else:
            copy['bad'].append(number)
    return copy


def first_difference(mine, theirs):
    for i in range(max(len(mine), len(theirs))):
        a = mine[i] if i < len(mine) else '(none)'
        b = theirs[i] if i < len(theirs) else '(none)'
        if a != b:
            return i + 1, a, b
    return None


def compare(rule_text, copy):
    """The list of findings; empty when 07 holds the copy's perspectives."""
    problems = []
    if copy['bad']:
        problems.append('the copy has malformed line(s) %s' % copy['bad'][:5])
    sha = copy['commit'].get('ja')
    named = named_commit(rule_text)
    if not sha or named is None or not (sha.startswith(named) or named.startswith(sha)):
        problems.append('07 names the master at %s, the copy was taken at %s' % (named, sha))
    diff = first_difference(chapter_headings(rule_text), [ja for ja, _en in copy['heading']])
    if diff:
        problems.append('chapter heading %d differs: 07 %r, master %r' % diff)
    pairs = checklist_pairs(rule_text)
    diff = first_difference(pairs, [(ch, ja) for ch, ja, _en in copy['pair']])
    if diff:
        problems.append('checklist row %d differs: 07 %r, master %r' % diff)
    known = set(pairs)
    for number, chapter, name in old_table_pairs(rule_text):
        if chapter not in NO_CHAPTER and (chapter, name) not in known:
            problems.append('old number %s points at %s / %s, which the checklist does not hold'
                            % (number, chapter, name))
    return problems


def git_show(checkout, rev, path):
    out = subprocess.run(['git', '-C', checkout, 'show', '%s:%s' % (rev, path)],
                         capture_output=True, encoding='utf-8')
    if out.returncode:
        sys.exit('cannot read %s at %s: %s' % (path, rev, out.stderr.strip()))
    return out.stdout.replace('\r\n', '\n')


def last_commit(checkout, rev, path):
    out = subprocess.run(['git', '-C', checkout, 'log', '-1', '--format=%h', '--abbrev=7', rev, '--', path],
                         capture_output=True, encoding='utf-8')
    return out.stdout.strip()


def refresh(checkout, rev):
    """Write the copy from a checkout of the master; refuse when its two languages disagree."""
    ja = git_show(checkout, rev, MASTER_JA)
    en = git_show(checkout, rev, MASTER_EN)
    heads_ja, heads_en = chapter_headings(ja), chapter_headings(en)
    pairs_ja, pairs_en = checklist_pairs(ja), checklist_pairs(en)
    if len(heads_ja) != len(heads_en) or len(pairs_ja) != len(pairs_en) \
            or [c for c, _n in pairs_ja] != [c for c, _n in pairs_en]:
        print('REFUSED  the master disagrees with itself at %s: %d/%d headings, %d/%d checklist rows '
              '(ja/en) -- bring the English version up first' % (rev, len(heads_ja), len(heads_en),
                                                                 len(pairs_ja), len(pairs_en)))
        return 1
    with io.open(COPY, 'w', encoding='utf-8', newline='\n') as f:
        f.write('# check 92: the perspective names of rule 07\'s master. Written by --refresh; never by hand.\n')
        f.write('# kind TAB fields. commit: language, repository, file, last commit of that file.\n')
        f.write('commit\tja\t%s:%s\t%s\n' % (MASTER_REPO, MASTER_JA, last_commit(checkout, rev, MASTER_JA)))
        f.write('commit\ten\t%s:%s\t%s\n' % (MASTER_REPO, MASTER_EN, last_commit(checkout, rev, MASTER_EN)))
        for a, b in zip(heads_ja, heads_en):
            f.write('heading\t%s\t%s\n' % (a, b))
        for (chapter, a), (_c, b) in zip(pairs_ja, pairs_en):
            f.write('pair\t%s\t%s\t%s\n' % (chapter, a, b))
    print('wrote %s: %d headings, %d checklist rows' % (os.path.basename(COPY), len(heads_ja), len(pairs_ja)))
    return 0


def self_test():
    rule = ('# t\n\n> x %s `%s` (main, `abc1234`)\n\n## R1: one\n\n### R1a: a\n\n## other\n\n### not\n\n'
            '## R2: two\n\n| ch | p |\n|---|---|\n| R1 | p1 |\n| R2 | p2 |\n\n%s\n\n'
            # R9.x: no rule-07 number, so check 91 does not count this file.
            '| R9.1 | R1 | p1 |\n| R9.2 | \u2014 | moved |\n' % (MASTER_WORD, MASTER_JA, OLD_TABLE_HEADING))
    copy = {'commit': {'ja': 'abc1234', 'en': 'def5678'}, 'bad': [],
            'heading': [('## R1: one', 'E1'), ('### R1a: a', 'Ea'), ('## R2: two', 'E2')],
            'pair': [('R1', 'p1', 'q1'), ('R2', 'p2', 'q2')]}
    behind = dict(copy, pair=[('R1', 'p1', 'q1'), ('R2', 'p2-renamed', 'q2')])
    stale = dict(copy, commit={'ja': 'fff0000'})
    broken = rule.replace('| R9.1 | R1 | p1 |', '| R9.1 | R1 | gone |')
    ok = (compare(rule, copy) == []
          and len(compare(rule, behind)) == 1
          and len(compare(rule, stale)) == 1
          and len(compare(broken, copy)) == 1
          and chapter_headings(rule) == ['## R1: one', '### R1a: a', '## R2: two'])
    print('self-test %s' % ('passed' if ok else 'FAILED'))
    return 0 if ok else 1


def main(argv):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', newline='\n')
    if '--self-test' in argv:
        return self_test()
    if '--refresh' in argv:
        checkout = argv[argv.index('--refresh') + 1]
        rev = argv[argv.index('--rev') + 1] if '--rev' in argv else 'main'
        return refresh(checkout, rev)
    with io.open(os.path.join(ROOT, RULE), encoding='utf-8') as f:
        rule_text = f.read().replace('\r\n', '\n')
    copy = read_copy()
    problems = compare(rule_text, copy)
    for problem in problems:
        print('FAIL check 92: %s (copy: %s)' % (problem, os.path.basename(COPY)))
    if not problems:
        print('OK   check 92: 07 holds the master\'s %d chapter headings and %d checklist perspectives '
              '(master %s at %s)' % (len(copy['heading']), len(copy['pair']), MASTER_JA, copy['commit'].get('ja')))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
