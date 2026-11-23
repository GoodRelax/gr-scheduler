# -*- coding: utf-8 -*-
"""Check 92 -- rule 07 holds the perspectives of its master, no more and no fewer.

WHY THIS EXISTS. Rule 07 (docs/development-rules/07-review-standards.md) is a
derivative of process-rules/review-standards-ja.md in the gr-sw-maker
repository (rebuilt 2026-10-24, rebuilt again 2026-11-24 from the confirmed
copy of version 20261123T131438Z). 07 says: fix a perspective in the master
first, then bring 07 up to it. Nothing noticed when 07 fell behind.

THE MASTER IS NOT READ HERE. check.sh closes inside this repository, so this
check reads a COPY of the master's names, review-standards-master-names.tsv
beside this script, and never the other repository. The copy is refreshed by
hand (--refresh or --refresh-files, below; the procedure is in
docs/development-rules/09-tools.md). A refresh that brings in a changed name
turns this check red until 07 is brought up to it -- that red is the point.

WHAT IS COMPARED (each in order, by exact text):
  1. every heading of 07 at level 2, 3 or 4 ("## ", "### ", "#### ") outside
     a code fence, except the sections whose level-2 heading holds the word
     GRS (and every heading under them), against the copy's Japanese headings
     -- the master's whole outline: introduction, NDD, R1-R8, severity, the
     checklist and the appendices;
  2. the (chapter, perspective) pairs of the comprehensive checklist (every
     table row that starts "| NDD |" or "| R<n> |" INSIDE the checklist
     section -- the master's introduction has a table with the same first
     cells, and it is not a checklist) against the copy's Japanese pairs;
  3. the version 07's head names for the master (the backticked version or
     commit on the line that names the master) against the copy's version;
  4. every row of 07's old-number table names a pair of the checklist (or the
     chapter "-" of a number that left the rule).

WHAT IS RED. Any difference in 1-4, and a copy line without both a Japanese
and an English text. What 07 adds for GRS alone sits in a GRS section or
inside a perspective's body, so it is not compared.

WHAT IT DOES NOT SEE. The bodies of the perspectives (their bullet lines);
whether the master changed since the last refresh.

    python .claude/skills/spec-graph-check/check-review-standards-master.py [--self-test]
    python .claude/skills/spec-graph-check/check-review-standards-master.py --refresh <gr-sw-maker checkout> [--rev main]
    python .claude/skills/spec-graph-check/check-review-standards-master.py --refresh-files <ja.md> <en.md>
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
MASTER_WORD = '原本'  # "master", the word on 07's head line that names it
OLD_TABLE_HEADING = '## 旧番号の対応表'  # "## old number table"
# The checklist section's level-2 heading begins with one of these (ja, en).
CHECKLIST_HEADINGS = ('## 総合レビューチェックリスト',
                      '## Comprehensive Review Checklist')
GRS_WORD = 'GRS'
HEADING = re.compile(r'^#{2,4} ')
CHECKLIST_ROW = re.compile(r'^\| (NDD|R\d) \|')
OLD_ROW = re.compile(r'^\| R\d\.\d+[a-z]? \|')
# The version line at the head of the master: **<word>:** `20261123T131438Z`
MASTER_VERSION = re.compile(r'^\*\*[^*]+:\*\* `(\d{8}T\d{6}Z)`')
NAMED_VERSION = re.compile(r'`(\d{8}T\d{6}Z|[0-9a-f]{7,40})`')
NO_CHAPTER = ('—', '-')


def cells(line):
    return [c.strip() for c in line.strip().strip('|').split('|')]


def outside_fences(text):
    """The lines of text that are not inside a ``` code fence."""
    out = []
    fenced = False
    for line in text.splitlines():
        if line.startswith('```'):
            fenced = not fenced
            continue
        if not fenced:
            out.append(line)
    return out


def headings(text):
    """Every level 2-4 heading outside fences, skipping the GRS sections."""
    out = []
    skipping = False
    for line in outside_fences(text):
        if not HEADING.match(line):
            continue
        if line.startswith('## '):
            skipping = GRS_WORD in line
        if not skipping:
            out.append(line.strip())
    return out


def checklist_pairs(text):
    """(chapter, perspective) of every checklist row inside the checklist section."""
    out = []
    inside = False
    for line in outside_fences(text):
        if line.startswith('## '):
            inside = line.startswith(CHECKLIST_HEADINGS)
        elif inside and CHECKLIST_ROW.match(line):
            out.append(tuple(cells(line)[:2]))
    return out


def old_table_pairs(text):
    """(old number, chapter, perspective) of the old-number table."""
    start = text.find('\n' + OLD_TABLE_HEADING)
    if start < 0:
        return []
    return [tuple(cells(line)[:3]) for line in text[start:].splitlines() if OLD_ROW.match(line)]


def named_version(text):
    """The backticked version (or commit) on the head line of 07 that names the master."""
    for line in text.splitlines()[:12]:
        if MASTER_WORD in line and MASTER_JA in line:
            found = NAMED_VERSION.findall(line)
            return found[0] if found else None
    return None


def master_version(text):
    """The version on the master's own head line, or None."""
    for line in text.splitlines()[:10]:
        found = MASTER_VERSION.match(line)
        if found:
            return found.group(1)
    return None


def read_copy(path=COPY):
    """{'version': {lang: version}, 'heading': [(ja, en)], 'pair': [(chapter, ja, en)]}"""
    copy = {'version': {}, 'heading': [], 'pair': [], 'bad': []}
    for number, line in enumerate(io.open(path, encoding='utf-8'), 1):
        line = line.rstrip('\n')
        if not line or line.startswith('#'):
            continue
        parts = line.split('\t')
        kind = parts[0]
        if kind == 'version' and len(parts) == 4:
            copy['version'][parts[1]] = parts[3]
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
    version = copy['version'].get('ja')
    named = named_version(rule_text)
    if not version or named is None or not (version.startswith(named) or named.startswith(version)):
        problems.append('07 names the master at %s, the copy was taken at %s' % (named, version))
    diff = first_difference(headings(rule_text), [ja for ja, _en in copy['heading']])
    if diff:
        problems.append('heading %d differs: 07 %r, master %r' % diff)
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


def read_file(path):
    with io.open(path, encoding='utf-8') as f:
        return f.read().replace('\r\n', '\n')


def write_copy(ja, en, source_ja, source_en):
    """Write the copy from the master's two languages; refuse when they disagree."""
    heads_ja, heads_en = headings(ja), headings(en)
    pairs_ja, pairs_en = checklist_pairs(ja), checklist_pairs(en)
    ver_ja, ver_en = master_version(ja), master_version(en)
    if len(heads_ja) != len(heads_en) or len(pairs_ja) != len(pairs_en) \
            or [c for c, _n in pairs_ja] != [c for c, _n in pairs_en] or not ver_ja or ver_ja != ver_en:
        print('REFUSED  the master disagrees with itself: %d/%d headings, %d/%d checklist rows, '
              'version %s/%s (ja/en) -- bring the English version up first'
              % (len(heads_ja), len(heads_en), len(pairs_ja), len(pairs_en), ver_ja, ver_en))
        return 1
    with io.open(COPY, 'w', encoding='utf-8', newline='\n') as f:
        f.write('# check 92: the perspective names of rule 07\'s master. Written by --refresh; never by hand.\n')
        f.write('# kind TAB fields. version: language, source, the version on the master\'s head line.\n')
        f.write('version\tja\t%s\t%s\n' % (source_ja, ver_ja))
        f.write('version\ten\t%s\t%s\n' % (source_en, ver_en))
        for a, b in zip(heads_ja, heads_en):
            f.write('heading\t%s\t%s\n' % (a, b))
        for (chapter, a), (_c, b) in zip(pairs_ja, pairs_en):
            f.write('pair\t%s\t%s\t%s\n' % (chapter, a, b))
    print('wrote %s: version %s, %d headings, %d checklist rows'
          % (os.path.basename(COPY), ver_ja, len(heads_ja), len(pairs_ja)))
    return 0


def refresh(checkout, rev):
    """Write the copy from a checkout of the master at a revision."""
    return write_copy(git_show(checkout, rev, MASTER_JA), git_show(checkout, rev, MASTER_EN),
                      '%s:%s@%s' % (MASTER_REPO, MASTER_JA, rev), '%s:%s@%s' % (MASTER_REPO, MASTER_EN, rev))


def refresh_files(path_ja, path_en):
    """Write the copy from two files of the master (a confirmed copy not yet on main).

    Only the file names go into the copy -- never the folder, which holds a
    local user path."""
    return write_copy(read_file(path_ja), read_file(path_en),
                      os.path.basename(path_ja), os.path.basename(path_en))


def self_test():
    master_line = '> x %s `%s` (`20261123T131438Z`)' % (MASTER_WORD, MASTER_JA)
    intro = '## intro\n\n| ch | p |\n|---|---|\n| NDD | not-a-checklist-row |\n| R1 | nor-this |\n\n'
    rule = ('# t\n\n%s\n\n%s## R1: one\n\n### R1a: a\n\n#### R1a-1: deep\n\n'
            '```\n## fenced, not a heading\n```\n\n'
            '## other GRS section\n\n### not compared\n\n'
            '%s (n)\n\n| ch | p |\n|---|---|\n| NDD | n1 |\n| R1 | p1 |\n| R2 | p2 |\n\n'
            '%s (GRS)\n\n'
            # R9.x: no rule-07 number, so check 91 does not count this file.
            '| R9.1 | R1 | p1 |\n| R9.2 | — | moved |\n'
            % (master_line, intro, CHECKLIST_HEADINGS[0], OLD_TABLE_HEADING))
    heads = ['## intro', '## R1: one', '### R1a: a', '#### R1a-1: deep', '%s (n)' % CHECKLIST_HEADINGS[0]]
    copy = {'version': {'ja': '20261123T131438Z', 'en': '20261123T131438Z'}, 'bad': [],
            'heading': [(h, 'E') for h in heads],
            'pair': [('NDD', 'n1', 'm1'), ('R1', 'p1', 'q1'), ('R2', 'p2', 'q2')]}
    behind = dict(copy, pair=[('NDD', 'n1', 'm1'), ('R1', 'p1', 'q1'), ('R2', 'p2-renamed', 'q2')])
    stale = dict(copy, version={'ja': '20260101T000000Z'})
    broken = rule.replace('| R9.1 | R1 | p1 |', '| R9.1 | R1 | gone |')
    extra = rule.replace('## other GRS section', '## other section')
    master = '# m\n\n**V:** `20261123T131438Z`\n\n' + intro
    ok = (compare(rule, copy) == []
          and len(compare(rule, behind)) == 1
          and len(compare(rule, stale)) == 1
          and len(compare(broken, copy)) == 1
          and len(compare(extra, copy)) == 1
          and headings(rule) == heads
          and checklist_pairs(rule) == [('NDD', 'n1'), ('R1', 'p1'), ('R2', 'p2')]
          and master_version(master) == '20261123T131438Z'
          and named_version(rule) == '20261123T131438Z')
    print('self-test %s' % ('passed' if ok else 'FAILED'))
    return 0 if ok else 1


def main(argv):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', newline='\n')
    if '--self-test' in argv:
        return self_test()
    if '--refresh-files' in argv:
        at = argv.index('--refresh-files')
        return refresh_files(argv[at + 1], argv[at + 2])
    if '--refresh' in argv:
        checkout = argv[argv.index('--refresh') + 1]
        rev = argv[argv.index('--rev') + 1] if '--rev' in argv else 'main'
        return refresh(checkout, rev)
    rule_text = read_file(os.path.join(ROOT, RULE))
    copy = read_copy()
    problems = compare(rule_text, copy)
    for problem in problems:
        print('FAIL check 92: %s (copy: %s)' % (problem, os.path.basename(COPY)))
    if not problems:
        print('OK   check 92: 07 holds the master\'s %d headings and %d checklist perspectives '
              '(master %s at %s)' % (len(copy['heading']), len(copy['pair']), MASTER_JA, copy['version'].get('ja')))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
