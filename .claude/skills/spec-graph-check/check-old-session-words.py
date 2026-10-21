# -*- coding: utf-8 -*-
"""Check 87 -- no new use of the retired session words in the living documents.

WHY THIS EXISTS. The user fixed one set of names for parent and child
sessions on 2026-10-22 (JDG-3042) and retired three old words. A word that is
only "not used" in a rule comes back in the next note somebody writes, so the
words are stopped here. MEASURED 2026-10-22 on 5dd50095c, the first run: the
counts in old-session-words-baseline.txt (one line per file that has any).

WHERE THE WORDS COME FROM. The first column of the table headed by the word
for "old word" in docs/development-rules/session-names.md section 2 -- the
script holds no copy of them. A one-character word counts only when no CJK
ideograph stands right before or after it, so compounds ("whole", "seat" in
other senses) are not counted.

WHAT IS RED. A file in SCOPE whose count is above its baseline line (a file
without a line has baseline 0). A count BELOW the baseline is printed, not
red: lowering it is welcome and must not redden another session's work; run
--update to lower the lines.

NOT COUNTED. Text inside Japanese corner brackets (quotations and the names
of the words themselves), text inside backticks, and the verbatim records in
EXEMPT.

WHAT IT DOES NOT SEE. Whether a counted word really means a session (a
standalone character can mean something else); files outside SCOPE; English
words.

    python .claude/skills/spec-graph-check/check-old-session-words.py [--self-test | --update | --count]
"""
import io
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
GLOSSARY = 'docs/development-rules/session-names.md'
BASELINE = os.path.join(HERE, 'old-session-words-baseline.txt')
OLD_WORD_HEADER = '\u65e7\u3044\u8a9e'  # "old word", the header of the table in section 2
SCOPE = ('docs/', 'tools/', '.claude/', 'README', 'CONTRIBUTING', 'CLAUDE')
EXEMPT = (
    'docs/development-records/rulings.md',
    'docs/development-records/defects.md',
    'docs/development-records/fixed-defects.md',
    'docs/development-records/changelog.md',
    'docs/development-records/pending-decisions.md',
    'docs/development-records/history/',
    'docs/development-records/measurements/',
    'docs/review/',
    'docs/spec/',
    'docs/reference/',
    '.claude/worktrees/',
    GLOSSARY,
)
SUFFIXES = ('.md', '.json', '.py', '.mjs', '.sh', '.txt', '.yml', '.bat')
IDEOGRAPH = '\u4e00-\u9fff\u3005'
QUOTED = re.compile('\u300c[^\u300d\n]*\u300d|`[^`\n]*`')


def old_words(text):
    """The first column of the old-word table."""
    words = []
    in_table = False
    for line in text.splitlines():
        cells = [c.strip() for c in line.strip().strip('|').split('|')] if line.startswith('|') else None
        if cells is None:
            in_table = False
            continue
        if cells[0] == OLD_WORD_HEADER:
            in_table = True
            continue
        if in_table and cells[0] and not set(cells[0]) <= set('-: '):
            words.append(cells[0])
    return words


def patterns(words):
    out = []
    for word in words:
        if len(word) == 1:
            out.append(re.compile('(?<![' + IDEOGRAPH + '])' + re.escape(word) + '(?![' + IDEOGRAPH + '])'))
        else:
            out.append(re.compile(re.escape(word)))
    return out


def count(text, pats):
    stripped = QUOTED.sub('', text)
    return sum(len(p.findall(stripped)) for p in pats)


def in_scope(path):
    return path.startswith(SCOPE) and not path.startswith(EXEMPT) and path.endswith(SUFFIXES)


def tracked_files():
    out = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    return [p for p in out.stdout.splitlines() if in_scope(p)]


def counts(pats):
    found = {}
    for path in tracked_files():
        try:
            with open(os.path.join(ROOT, path), encoding='utf-8') as f:
                n = count(f.read(), pats)
        except (OSError, UnicodeDecodeError):
            continue
        if n:
            found[path] = n
    return found


def read_baseline():
    base = {}
    if os.path.exists(BASELINE):
        for line in open(BASELINE, encoding='utf-8'):
            if line.strip() and not line.startswith('#'):
                path, n = line.rstrip('\n').split('\t')
                base[path] = int(n)
    return base


def write_baseline(found):
    with open(BASELINE, 'w', encoding='utf-8', newline='\n') as f:
        f.write('# check 87: retired session words per file (path TAB count). Lower only; see the script.\n')
        for path in sorted(found):
            f.write('%s\t%d\n' % (path, found[path]))


def self_test():
    table = '| %s | x |\n|---|---|\n| \u5e2d | a |\n| \u6307\u4ee4\u5f79 | b |\n\ntext\n' % OLD_WORD_HEADER
    words = old_words(table)
    pats = patterns(words)
    sample = ('\u5e2d\u3092\u8d77\u3053\u3059 \u5ea7\u5e2d \u300c\u5e2d\u300d `\u5e2d` '
              '\u6307\u4ee4\u5f79\u304c')
    ok = (words == ['\u5e2d', '\u6307\u4ee4\u5f79'] and count(sample, pats) == 2
          and in_scope('docs/development-rules/05-working-method.md')
          and not in_scope('docs/development-records/rulings.md'))
    print('self-test %s' % ('passed' if ok else 'FAILED'))
    return 0 if ok else 1


def main(argv):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', newline='\n')
    if '--self-test' in argv:
        return self_test()
    with open(os.path.join(ROOT, GLOSSARY), encoding='utf-8') as f:
        words = old_words(f.read())
    if not words:
        print('FAIL check 87: no old-word table found in %s' % GLOSSARY)
        return 1
    found = counts(patterns(words))
    if '--update' in argv:
        write_baseline(found)
        print('baseline written: %d files, %d words' % (len(found), sum(found.values())))
        return 0
    if '--count' in argv:
        for path in sorted(found, key=lambda p: -found[p]):
            print('%6d  %s' % (found[path], path))
        print('%6d  total in %d files' % (sum(found.values()), len(found)))
        return 0
    base = read_baseline()
    red = [(p, n, base.get(p, 0)) for p, n in sorted(found.items()) if n > base.get(p, 0)]
    lower = [(p, found.get(p, 0), n) for p, n in sorted(base.items()) if found.get(p, 0) < n]
    for path, n, b in red:
        print('FAIL check 87: %s has %d retired session words, baseline %d (see %s)' % (path, n, b, GLOSSARY))
    for path, n, b in lower:
        print('note check 87: %s is down to %d from %d; --update lowers the baseline' % (path, n, b))
    if not red:
        print('OK   check 87: no new retired session words (%d in %d files at or under the baseline)'
              % (sum(found.values()), len(found)))
    return 1 if red else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
