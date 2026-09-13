# -*- coding: utf-8 -*-
"""Append one line of project statistics to
`docs/development-records/measurements/stats.jsonl`.

WHY THIS EXISTS -- ACCUMULATE FIRST, INTERPRET LATER. No outcome metric is
being fixed by this file, and the reason is that every candidate so far has
failed when it was measured.

  - The handover's cost metric, "33.9 lines per fixed line", does not reproduce
    under any definition tried. It is quoted here only as the claim that sent
    somebody looking, never as a number to compare against.
  - The obvious outcome metric -- defects closed per unit of work -- is
    unusable, because ledger rows are harvested in BATCHES rather than closed
    as they are fixed. Measured: three consecutive forty-commit windows closed
    32, 240 and 0 defects. A rate computed over any one of those windows says
    nothing about the round that produced it.

⇒ So this tool fixes no ratio and draws no conclusion. It records a fixed set
of counts, once a day, so that whoever DOES fix a metric later has a series to
fix it against rather than a single measurement taken on the day of the
argument. ⛔ A number in this file is not a target. Nothing here may be read as
saying which direction any of these counts should move.

WHAT IS COUNTED, EXACTLY, SO THAT A HUMAN CAN REPRODUCE IT BY HAND.

⚠️ A COMMENT LINE IS ONE WHOSE FIRST NON-SPACE CHARACTERS ARE `//`, `*` OR
`/*`. That is the whole rule, and it is deliberately the same rule the cleanup
already counts by and the same rule `check-must-clause-coverage.py` uses to
strip comments from the test corpus. ⛔ It is NOT a parse: a block comment
whose continuation lines carry no leading `*` counts those lines as executable,
and a `//` inside a string literal at the start of a line counts as a comment.
Keeping the rule wrong in the same way everywhere is what makes the numbers
comparable with everything already recorded; making it right here alone would
silently break the series.

  - a BLANK line is one with nothing but whitespace on it
  - an EXECUTABLE line is every line that is neither blank nor a comment
  - `lines + 0 == blank + comment + executable`, always, which is how a reader
    checks by hand that the three were counted off the same text

⚠️ WHICH FILES. `src/` and `tests/` each hold files that are not code --
`.json` under `src/`, `.md` under `tests/`. Counting
comment lines in those would be meaningless, so the line counts are taken over
the code extensions in CODE_EXTENSIONS only, and the row records both that
tuple and `files_all` (everything in the tree) so no file is hidden by the
choice.

⚠️ `docs/spec` EXCLUDES `output/`. That directory is StrictDoc's generated tree
-- see `tools/sweep_strictdoc_output.py` for why it exists and why nothing
should read it. Four of its `.md` files are stale copies of the manuscript, so
counting them would both inflate the count and make it jump the moment somebody
opens or sweeps the StrictDoc launcher. ⇒ The spec counts here are of the
manuscript only, whether or not the residue happens to be present.

  - characters are counted AFTER newline normalisation (the files are read in
    text mode, so a CRLF counts as one character, not two). ⚠️ This tree has
    MIXED line endings, so counting bytes instead would make the number depend
    on which files a round happened to rewrite.

  - a LEDGER ROW is a line matching `^| <PREFIX>-<digits> |` -- the shape the
    three ledgers under `docs/development-records/` write an entry's id in. It
    counts rows, not defects: a row may hold several, and a header or a
    separator row matches neither.

  - a BASELINE is the FIRST LINE of each `*-baseline.txt` under
    `.claude/skills/spec-graph-check/`. ⚠️ Not all of them are numbers --
    several open with a prose heading because their baseline is a LIST rather
    than a count. Those record `null`, which is a fact about that check, not a
    failure to read the file.

⛔⛔ WHAT THIS TOOL WILL NOT DO. It does not run `vitest`, `playwright` or
`check.sh`, and it never calls a model or the network. It runs from a
SessionStart hook, so it has a few seconds at most, and a gate timing that
costs minutes would either be skipped or would make session start unusable.
⇒ Gate timings are deliberately out of scope; every count here is a static read
of files plus three `git` calls.

HOW OFTEN A ROW IS WRITTEN. At most one row per calendar day per HEAD sha: if
the last line of the file already carries today's local date and the same sha,
it is REPLACED rather than appended. ⚠️ Session start fires many times a day,
and a file that grew a line each time would stop being readable within a week.

⭐ JSONL, NOT A MARKDOWN TABLE. One run is one new line, so a diff shows
exactly the run that was added. A table would have to be rewritten -- column
widths and all -- on every run, and every commit would carry a whole-file
change for one measurement.

    python tools/collect_stats.py [--print]
"""
import datetime
import io
import json
import os
import re
import statistics
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, 'docs', 'development-records', 'measurements')
OUT_FILE = os.path.join(OUT_DIR, 'stats.jsonl')
BASELINE_DIR = os.path.join(ROOT, '.claude', 'skills', 'spec-graph-check')

CODE_EXTENSIONS = ('.ts', '.tsx', '.js', '.mjs', '.cjs')

# ⚠️ The same rule as `check-must-clause-coverage.py`'s COMMENT_RE. If one of
# the two ever changes, the numbers stop being comparable and the series breaks.
COMMENT_RE = re.compile(r'^\s*(?://|\*|/\*)')

LEDGER_ROW_RE = re.compile(r'^\| [A-Z]+-\d+ \|')

LEDGERS = (
    ('fixed_defects', 'fixed-defects.md'),
    ('defects', 'defects.md'),
    ('pending_decisions', 'pending-decisions.md'),
)

# ⛔ `docs/spec/output/` is StrictDoc's residue, not the manuscript.
SPEC_SKIP_DIRS = ('output',)


def read_text(path):
    """The file's text with newlines normalised, or None if it cannot be read."""
    try:
        with io.open(path, encoding='utf-8', errors='replace') as handle:
            return handle.read()
    except OSError:
        return None


def git(*args):
    """One `git` call's stdout, stripped, or None when git says nothing."""
    try:
        out = subprocess.run(
            ('git',) + args, cwd=ROOT, capture_output=True, text=True,
            timeout=20, errors='replace')
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        return None
    value = out.stdout.strip()
    return value or None


def walk_files(root):
    """Every file under root, as absolute paths, in a stable order."""
    found = []
    for base, dirs, names in os.walk(root):
        dirs.sort()
        for name in sorted(names):
            found.append(os.path.join(base, name))
    return found


def count_tree(root):
    """The five counts, plus the per-file line lengths, for one tree.

    Returns None when the tree is absent, so a missing `src/` records as null
    rather than as a row of convincing zeroes."""
    if not os.path.isdir(root):
        return None
    every = walk_files(root)
    code = [p for p in every if p.lower().endswith(CODE_EXTENSIONS)]

    lines = blank = comment = 0
    per_file = []
    for path in code:
        text = read_text(path)
        if text is None:
            continue
        own = text.split('\n')
        # ⚠️ A trailing newline makes a final empty element that is not a line.
        if own and own[-1] == '':
            own.pop()
        per_file.append(len(own))
        lines += len(own)
        for line in own:
            if not line.strip():
                blank += 1
            elif COMMENT_RE.match(line):
                comment += 1
    executable = lines - blank - comment
    return {
        'files': len(code),
        'files_all': len(every),
        'lines': lines,
        'blank_lines': blank,
        'comment_lines': comment,
        'executable_lines': executable,
        'comment_per_executable': (round(comment / executable, 4)
                                   if executable else None),
        '_per_file': per_file,
    }


def distribution(per_file):
    """median / mean / max of a list of per-file line counts."""
    if not per_file:
        return {'median': None, 'mean': None, 'max': None}
    return {
        'median': round(statistics.median(per_file), 1),
        'mean': round(statistics.fmean(per_file), 1),
        'max': max(per_file),
    }


def count_case_calls(root):
    """Literal occurrences of `it(` and `test(` under root.

    ⛔ A SUBSTRING COUNT, NOT A CASE COUNT. `it(` also appears inside words a
    reader would not call a test -- `wait(`, `submit(` -- and a skipped or
    commented-out case counts the same as a live one. It is recorded because it
    is cheap and stable, not because it is the number of tests."""
    it_calls = test_calls = 0
    if not os.path.isdir(root):
        return {'it_calls': None, 'test_calls': None}
    for path in walk_files(root):
        if not path.lower().endswith(CODE_EXTENSIONS):
            continue
        text = read_text(path)
        if text is None:
            continue
        it_calls += text.count('it(')
        test_calls += text.count('test(')
    return {'it_calls': it_calls, 'test_calls': test_calls}


def count_spec():
    """`.md` files, characters and lines under docs/spec, minus output/."""
    root = os.path.join(ROOT, 'docs', 'spec')
    if not os.path.isdir(root):
        return None
    files = chars = lines = 0
    for base, dirs, names in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in SPEC_SKIP_DIRS)
        for name in sorted(names):
            if not name.lower().endswith('.md'):
                continue
            text = read_text(os.path.join(base, name))
            if text is None:
                continue
            files += 1
            chars += len(text)
            lines += len(text.splitlines())
    return {'md_files': files, 'chars': chars, 'lines': lines}


def count_ledgers():
    counts = {}
    for key, name in LEDGERS:
        text = read_text(os.path.join(ROOT, 'docs', 'development-records', name))
        if text is None:
            counts[key] = None
            continue
        counts[key] = sum(1 for line in text.split('\n')
                          if LEDGER_ROW_RE.match(line))
    return counts


def read_baselines():
    """name -> the first line's integer, or null when it is not a number."""
    found = {}
    if not os.path.isdir(BASELINE_DIR):
        return found
    for name in sorted(os.listdir(BASELINE_DIR)):
        if not name.endswith('-baseline.txt'):
            continue
        text = read_text(os.path.join(BASELINE_DIR, name))
        key = name[:-len('-baseline.txt')]
        if text is None:
            found[key] = None
            continue
        head = text.split('\n')[0].strip()
        try:
            found[key] = int(head)
        except ValueError:
            found[key] = None
    return found


def build_row():
    now = datetime.datetime.now()
    src = count_tree(os.path.join(ROOT, 'src'))
    tests = count_tree(os.path.join(ROOT, 'tests'))

    src_distribution = distribution((src or {}).get('_per_file') or [])
    for tree in (src, tests):
        if tree is not None:
            tree.pop('_per_file', None)
    if tests is not None:
        tests.update(count_case_calls(os.path.join(ROOT, 'tests')))

    return {
        'timestamp': now.isoformat(timespec='seconds'),
        'date': now.strftime('%Y-%m-%d'),
        'sha': git('rev-parse', '--short', 'HEAD'),
        'branch': git('rev-parse', '--abbrev-ref', 'HEAD'),
        'tag': git('describe', '--tags', '--abbrev=0'),
        'counting': {
            'code_extensions': list(CODE_EXTENSIONS),
            'comment_rule': 'first non-space characters are // or * or /*',
            'spec_excludes': list(SPEC_SKIP_DIRS),
        },
        'src': src,
        'src_file_lines': src_distribution,
        'tests': tests,
        'spec': count_spec(),
        'ledgers': count_ledgers(),
        'baselines': read_baselines(),
    }


def last_line(path):
    text = read_text(path)
    if not text:
        return None, []
    kept = [line for line in text.split('\n') if line.strip()]
    return (kept[-1] if kept else None), kept


def write_row(row):
    """Append the row, or replace the last one when it is today's, same sha."""
    os.makedirs(OUT_DIR, exist_ok=True)
    previous, kept = last_line(OUT_FILE)
    replaced = False
    if previous:
        try:
            old = json.loads(previous)
            if (old.get('date') == row['date'] and old.get('sha') == row['sha']):
                kept.pop()
                replaced = True
        except ValueError:
            # ⚠️ A line that will not parse is left exactly where it is: this
            # tool records history and must not quietly discard somebody's.
            pass
    kept.append(json.dumps(row, ensure_ascii=False, sort_keys=True))
    with io.open(OUT_FILE, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write('\n'.join(kept) + '\n')
    return replaced, len(kept)


def main(argv):
    only_print = '--print' in argv[1:]
    unknown = [a for a in argv[1:] if a != '--print']
    if unknown:
        print('PROBLEM  unrecognised argument(s): %s' % (' '.join(unknown),))
        return 1

    row = build_row()
    if only_print:
        print(json.dumps(row, ensure_ascii=False, sort_keys=True))
        return 0

    replaced, total = write_row(row)
    print('OK       stats %s docs/development-records/measurements/stats.jsonl '
          '(%d row(s)) -- %s %s' %
          ('replaced the last row of' if replaced else 'appended to',
           total, row['date'], row['sha']))
    return 0


# ⛔ A Windows console defaults to cp932 and cannot encode the ⛔ / ⭐ / ⚠️
# this project writes. Reconfigure the stream rather than asking a SessionStart
# hook to remember PYTHONIOENCODING.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

if __name__ == '__main__':
    try:
        sys.exit(main(sys.argv))
    except Exception as _problem:  # noqa: BLE001
        # ⛔ A statistics collector on a SessionStart hook may not take the
        # session down with it.
        print('PROBLEM  collect_stats.py failed: %r' % (_problem,))
        sys.exit(0)
