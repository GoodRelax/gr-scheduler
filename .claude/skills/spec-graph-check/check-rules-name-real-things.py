# -*- coding: utf-8 -*-
"""Check 77 -- a rule names only files, npm scripts and checks that exist.

WHY THIS EXISTS. A rule that tells the reader to run a tool that was deleted,
or to read a check that was renumbered, teaches the reader that the rules are
stale, after which the reader stops following them. Check 0 already keeps the
markdown LINKS of docs/development-rules/ resolving; the names a rule gives in
backticks and prose were not looked at. MEASURED 2026-09-26 on 0ad572f6, the
first run: 5 names in 3 files pointed at nothing -- README.md and 07 cited
check 26 for the job check 0 does, rule 03 sent the reader to
`review-standards.md` (the file is 07-review-standards.md), and 07 handed its
review-handling steps to `development-mode.md`, a file of the framework it was
imported from that this tree never had.

WHAT IS RED. In every .md at the top of docs/development-rules/ (the 08 folder
is an imported kit and answers for itself, as it does for check 0):
  1. a backticked repository path (`tools/x.py`, `docs/.../y.md`, a bare
     `name.py`) that no tracked file or folder matches and git does not ignore;
  2. `npm run <script>` whose script is not a key of package.json "scripts";
  3. "検査 N" whose N is no section number of check.sh (ranges such as 1-4 and
     lists such as "5-10, 15, 48" count every number they name).
A line that carries a dated record mark "⚠️ 実測（YYYY-MM-DD）" is skipped:
rule 04 section 6.6 makes such a sentence a record of that day, and a record
may name what no longer exists.

⚠️ A new file counts only once it is tracked: `git add` it before running
this, the same trap check 53 has (rule 04 section 6).

A name that git ignores, or inside which git would ignore a file, counts as
real: .gitignore declares it local on purpose (the MSPDI XSDs under
docs/reference/, StrictDoc's docs/spec/output/). It is asked about a file
inside the name because git reads an existing folder as a folder, and the
answer for the folder itself then depends on the disk (see ignored()).

WHAT IT DOES NOT SEE. Whether the named thing still does what the rule says
it does; a misspelt name inside an ignored tree (it counts as local); paths with a wildcard or a placeholder (`*`, `<name>`); names written
without backticks; a bare extension (`.html`); the 08 folder.

    python .claude/skills/spec-graph-check/check-rules-name-real-things.py [--self-test]

`--self-test` feeds an in-memory rule with one dead path, one dead npm script
and one dead check number, and is red unless all three are reported and the
same rule without them is green.
"""
import io
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
RULES = os.path.join(ROOT, 'docs', 'development-rules')

BACKTICK = re.compile(r'`([^`\n]+)`')
NPM_RUN = re.compile(r'npm run ([A-Za-z0-9:_.-]+)')
CHECK_NO = re.compile(r'検査\s*(\d+b?)(?!\d)')
RECORD = re.compile(r'⚠️\s*\**\s*実測（\d{4}-\d{2}-\d{2}）')
PATH_ROOTS = ('tools/', 'docs/', 'src/', 'tests/', '.claude/', 'change-request/',
              'previous-project-result/', 'sample-schedule/', 'dist/', 'scratch/')
FILE_EXT = re.compile(r'\.(py|mjs|js|ts|md|json|txt|sh|bat|jsonl|html|tsv|ya?ml|drawio|svg)$')
NOT_A_PATH = re.compile(r'[\s*<>{}$|…?]|\.\.\.')
SECTION = re.compile(r'^section "([^"]*)"', re.M)
PROBE_CHILD = 'check-77-probe.file'


def tracked_files():
    out = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True,
                         text=True, encoding='utf-8').stdout
    return set(out.splitlines())


def ignored(paths):
    if not paths:
        return set()
    # A name counts as deliberately local when git ignores it, or ignores a
    # FILE inside it. ⛔ Asking about the name alone is decided by the disk:
    # git reads an existing folder as a folder, and `!docs/reference/**/`
    # un-ignores folders, so docs/reference/mspdi answered "ignored" in a
    # worktree (no such folder) and "not ignored" in the root, where the XSDs
    # are. MEASURED 2026-09-26: green in the worktree, 4 reds in the root.
    # A file inside the name is never a folder on disk, so the answer is the
    # same everywhere.
    # ⚠️ Bytes, not text: a text pipe on Windows writes CRLF, and git then
    # reads every name but the last with a carriage return on its end.
    inside = {p + '/' + PROBE_CHILD: p for p in paths}
    asked = list(paths) + list(inside)
    run = subprocess.run(['git', 'check-ignore', '--no-index', '--stdin'], cwd=ROOT,
                         input='\n'.join(asked).encode('utf-8'), capture_output=True)
    said = set(run.stdout.decode('utf-8').splitlines())
    return {p for p in paths if p in said} | {inside[c] for c in inside if c in said}


def check_numbers():
    body = io.open(os.path.join(HERE, 'check.sh'), encoding='utf-8').read()
    numbers = set()
    for heading in SECTION.findall(body):
        head = re.match(r'^((?:\d+b?(?:-\d+)?)(?:,\s*\d+b?(?:-\d+)?)*)\s', heading + ' ')
        if not head:
            continue
        for part in head.group(1).split(','):
            part = part.strip()
            span = re.match(r'^(\d+)-(\d+)$', part)
            if span:
                numbers.update(str(n) for n in range(int(span.group(1)), int(span.group(2)) + 1))
            elif part:
                numbers.add(part)
    return numbers


def npm_scripts():
    return set(json.load(io.open(os.path.join(ROOT, 'package.json'), encoding='utf-8'))['scripts'])


def path_candidate(span):
    token = span.split()[0] if span.split() else ''
    if span != token and not token.startswith(PATH_ROOTS) and not FILE_EXT.search(token):
        return None
    token = re.sub(r':\d+(?:[-~]\d+)?$', '', token).split('#')[0].rstrip('/')
    if token.startswith('./'):
        token = token[2:]
    # A bare extension (`.html`, `.schema.json`) names a kind of file, not a file.
    if (not token or NOT_A_PATH.search(token) or ('/' not in token and token.startswith('.'))
            or token.startswith(('~', 'http', '.claude/worktrees'))):
        return None
    if token.startswith(PATH_ROOTS) or ('/' not in token and FILE_EXT.search(token)):
        return token
    return None


def problems_in(name, text, files, dirs, scripts, numbers):
    """(line, message) for every name in one rule that resolves to nothing."""
    found = []
    wanted_paths = []
    for line_no, line in enumerate(text.splitlines(), 1):
        if RECORD.search(line):
            continue
        for span in BACKTICK.findall(line):
            token = path_candidate(span)
            if token:
                wanted_paths.append((line_no, token))
        for script in NPM_RUN.findall(line):
            if script not in scripts:
                found.append((line_no, '`npm run %s` -- package.json has no such script' % script))
        for number in CHECK_NO.findall(line):
            if number not in numbers:
                found.append((line_no, '検査 %s -- check.sh has no section with that number' % number))
    basenames = {os.path.basename(f) for f in files}
    missing = []
    for line_no, token in wanted_paths:
        if '/' in token:
            if token in files or token in dirs:
                continue
            local = os.path.normpath(os.path.join('docs/development-rules', token)).replace(os.sep, '/')
            if local in files or local in dirs:
                continue
        elif token in basenames:
            continue
        missing.append((line_no, token))
    quiet = ignored([t for _, t in missing])
    for line_no, token in missing:
        if token not in quiet:
            found.append((line_no, '`%s` -- no tracked file or folder of that name' % token))
    return sorted(found)


def folders_of(files):
    dirs = set()
    for f in files:
        parts = f.split('/')[:-1]
        for i in range(1, len(parts) + 1):
            dirs.add('/'.join(parts[:i]))
    return dirs


def self_test(files, dirs, scripts, numbers):
    # The clean rule also names trees .gitignore keeps local on purpose, so the
    # test holds the folder-vs-file trap of ignored() whichever way the disk
    # looks (MEASURED 2026-09-26: green with docs/reference/mspdi present and
    # with it absent).
    clean = ('Run `npm run check` and read 検査 0 and `docs/development-rules/README.md`.\n'
             'The XSDs stay local in `docs/reference/mspdi` and `docs/spec/output/`.\n')
    broken = clean + ('Run `tools/no-such-tool-at-all.py`, then `npm run no-such-script`,\n'
                      'then read 検査 999.\n')
    ok = not problems_in('clean', clean, files, dirs, scripts, numbers)
    got = problems_in('broken', broken, files, dirs, scripts, numbers)
    ok = ok and len(got) == 3
    sys.stdout.write('%s  self-test: the clean rule gave %d, the broken one %d of 3\n'
                     % ('OK      ' if ok else 'PROBLEM ',
                        len(problems_in('clean', clean, files, dirs, scripts, numbers)), len(got)))
    return 0 if ok else 1


def main():
    files = tracked_files()
    dirs = folders_of(files)
    scripts = npm_scripts()
    numbers = check_numbers()
    if '--self-test' in sys.argv:
        return self_test(files, dirs, scripts, numbers)
    total = 0
    read = 0
    for name in sorted(os.listdir(RULES)):
        whole = os.path.join(RULES, name)
        if not name.endswith('.md') or os.path.isdir(whole):
            continue
        read += 1
        text = io.open(whole, encoding='utf-8').read()
        for line_no, message in problems_in(name, text, files, dirs, scripts, numbers):
            sys.stdout.write('PROBLEM  docs/development-rules/%s:%d  %s\n' % (name, line_no, message))
            total += 1
    if total:
        sys.stdout.write('%d name(s) in the rules point at nothing -- fix the rule, or '
                         'delete it if what it named is gone\n' % total)
        return 1
    sys.stdout.write('OK       %d rule files name only files, npm scripts and checks that exist '
                     '(not read: the 08 folder)\n' % read)
    return 0


if __name__ == '__main__':
    sys.exit(main())
