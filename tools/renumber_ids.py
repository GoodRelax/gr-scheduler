# -*- coding: utf-8 -*-
"""Renumber row ids so parallel sessions never commit the same one.

    python tools/renumber_ids.py compact [--dry-run]
        every PROVISIONAL id of the working tree -> the next free number
    python tools/renumber_ids.py band DFC=1100-1109 [JDG=700-709 ...] [--dry-run]
        every id inside each band -> the next free number outside it
    python tools/renumber_ids.py clashes <base> <theirs> [--commit]
        the ids THEIRS defines anew that HEAD also defines anew; with --commit,
        a commit on top of THEIRS with its new ids renumbered (tools/merge_branch.py)
    python tools/renumber_ids.py --check
        exit 1 when a tracked file still holds a provisional id (check 68)

THE CONVENTION (docs/development-rules/09-tools.md, section 10):

  * While drafting, a NEW id is PROVISIONAL: its real prefix and a five-digit
    number that starts with 9 -- `DFC-90001`, `JDG-90002`, `T-90001`,
    `CR-90001` (the file name too: change-request/CR-90001-<slug>.md).
    No prefix of this tree reaches 90000 (measured 2026-09-26: the largest
    defined is DFC-1086), so a provisional id can never be read as a real
    one, and no look-alike prefix is ever invented to mark "not yet".
  * Before a commit, `compact` renumbers them to the maximum + 1 of the tree,
    per prefix, in numeric order. A tracked file holding a provisional id is
    red (check 68), so none reaches a commit.
  * Two sessions that compacted at the same time took the same numbers. At
    the merge, `clashes` finds them and tools/merge_branch.py merges a
    renumbered copy of the incoming branch instead.

TWO PHASES. Every old id is first replaced by a unique token and only then
each token by its new id, so a chain (1087 -> 1088 while 1088 -> 1089) can
never rename the same id twice.

WHAT AN ID IS. `PREFIX-N` with PREFIX of one to four capitals, not preceded
by a letter, digit or hyphen, and N not followed by a digit. A letter suffix
is kept (`T-90001a` -> `T-281a`), and a prefix that zero-pads (`T-023`) is
padded the same way.

WHAT "THE MAXIMUM" IS. The largest number the tree DEFINES -- the first cell
of a table row, a `**<table> T-nnn` heading, a change-request file name --
raised by any number the tree merely MENTIONS within NEAR of it, so a number
reserved in prose but not yet written is not reused. A mention farther away
is an example or an accident (measured 2026-09-26: `T-999` is an example in
two checks, and `CR-1773b` a hex-like word in a ledger cell) and is ignored,
and the run says how many it ignored. Provisional numbers never count.

WHAT IT CANNOT SEE: a range written with one prefix (`JDG-600..609`); it
prints every such range that touches a renumbered id instead, for a hand fix.
It never reads or rewrites dist/ (rebuilt by vite build), a binary file, or
this file (its examples above are provisional on purpose).
"""
import io
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REL_PREFIXES = 'docs/spec/_source/row-id-prefixes.json'
SELF = 'tools/renumber_ids.py'
SKIPPED = ('dist/', SELF)
PATHSPEC = ['--', '.', ':!dist', ':!' + SELF]
NEAR = 50

AN_ID = re.compile(r'(?<![A-Za-z0-9-])([A-Z]{1,4})-([0-9]+)(?![0-9])')
PROVISIONAL = re.compile(r'^9[0-9]{4}$')
RANGE_AFTER = re.compile(u'^\\s*(?:\\.\\.|〜|~|–)\\s*[0-9]+')
ROW_START = re.compile(r'^\|\s*`?([A-Z]{1,4})-([0-9]+)[a-z]?`?\s*\|')
TABLE_HEADING = re.compile(u'^\\*\\*表 (T)-([0-9]+)[a-z]?')
CR_FILE = re.compile(r'^change-request/(CR)-([0-9]+)-')


def say(message):
    sys.stdout.write(message + '\n')


def git(args, data=None, env=None, check=True):
    done = subprocess.run(['git'] + args, cwd=ROOT, input=data,
                          capture_output=True, env=env)
    if check and done.returncode != 0:
        raise SystemExit('git %s: %s' % (' '.join(args),
                                         done.stderr.decode('utf-8', 'replace')))
    return done.stdout


def lines_of(raw):
    return [one for one in raw.decode('utf-8', 'replace').split('\n') if one]


def registered_prefixes():
    doc = json.load(io.open(os.path.join(ROOT, REL_PREFIXES), encoding='utf-8'))
    found = set(entry['prefix'] if isinstance(entry, dict) else entry
                for entry in doc['prefixes'])
    # Table numbers are not rows, but check 62 measures them and they are
    # taken the same way.
    return found | {'T', 'CR'}


def is_provisional(number):
    return bool(PROVISIONAL.match(str(number)))


# -------------------------------------------------------- reading a tree ----
# `ref` None is the working tree, untracked files included; otherwise a commit.

def grep_lines(ref, pattern, pathspec):
    # WHY: git reads a word after the pattern as a revision, so --untracked
    # has to come before it.
    args = ['grep', '-h', '-I'] + (['--untracked'] if ref is None else [])
    args += ['-E', pattern] + ([] if ref is None else [ref])
    done = subprocess.run(['git'] + args + pathspec, cwd=ROOT, capture_output=True)
    # git grep exits 1 when nothing matches, and 128 when it could not search.
    if done.returncode not in (0, 1):
        raise SystemExit('git %s: %s' % (' '.join(args), done.stderr.decode('utf-8', 'replace')))
    return lines_of(done.stdout)


def file_names(ref):
    if ref is None:
        names = lines_of(git(['ls-files', '--cached', '--others', '--exclude-standard']))
        return [one for one in names if os.path.isfile(os.path.join(ROOT, one))]
    return lines_of(git(['ls-tree', '-r', '--name-only', ref]))


def measure(ref):
    """(defined, mentioned, widths) of a tree, each {prefix: ...}."""
    defined, mentioned, widths = {}, {}, {}
    for line in grep_lines(ref, r'^\| *`?[A-Z]{1,4}-[0-9]+', ['--', '*.md']):
        match = ROW_START.match(line)
        if match:
            defined.setdefault(match.group(1), set()).add(int(match.group(2)))
    for line in grep_lines(ref, u'^\\*\\*表 T-[0-9]+', ['--', '*.md']):
        match = TABLE_HEADING.match(line)
        if match:
            defined.setdefault('T', set()).add(int(match.group(2)))
    names = file_names(ref)
    for name in names:
        match = CR_FILE.match(name)
        if match:
            defined.setdefault('CR', set()).add(int(match.group(2)))
    for line in grep_lines(ref, r'[A-Z]{1,4}-[0-9]+', PATHSPEC) + names:
        for match in AN_ID.finditer(line):
            prefix, digits = match.group(1), match.group(2)
            mentioned.setdefault(prefix, set()).add(int(digits))
            if len(digits) > 1 and digits[0] == '0':
                widths[prefix] = max(widths.get(prefix, 0), len(digits))
    return defined, mentioned, widths


def taken_numbers(defined, mentioned, prefixes, leave_out):
    """{prefix: numbers a new id must not take}, and how many far mentions
    were ignored. `leave_out` {prefix: numbers} are the ids being renumbered."""
    taken, ignored = {}, 0
    for prefix in prefixes:
        out = leave_out.get(prefix, set())
        defs = set(n for n in defined.get(prefix, set()) if not is_provisional(n)) - out
        seen = set(n for n in mentioned.get(prefix, set()) if not is_provisional(n)) - out
        top = max(defs) if defs else 0
        near = set(n for n in seen if n <= top + NEAR)
        ignored += len(seen - near)
        taken[prefix] = defs | near
    return taken, ignored


def plan(olds, taken, widths):
    """{(prefix, old int): new text} -- each prefix numbered from its max + 1."""
    mapping = {}
    for prefix in sorted(olds):
        following = max(taken.get(prefix) or {0}) + 1
        for old in sorted(olds[prefix]):
            mapping[(prefix, old)] = str(following).zfill(widths.get(prefix, 0))
            following += 1
    return mapping


# ----------------------------------------------------------- rewriting ----

def rewrite(text, mapping):
    """Two phases: old ids -> unique tokens -> new ids. Returns (text, count)."""
    tokens = {}

    def to_token(match):
        key = (match.group(1), int(match.group(2)))
        if key not in mapping:
            return match.group(0)
        token = '\0RENUMBER-%d\0' % len(tokens)
        tokens[token] = '%s-%s' % (match.group(1), mapping[key])
        return token

    marked = AN_ID.sub(to_token, text)
    for token, final in tokens.items():
        marked = marked.replace(token, final)
    return marked, len(tokens)


def decode(data):
    if b'\0' in data:
        return None
    try:
        return data.decode('utf-8')
    except UnicodeDecodeError:
        return None


def ranges_touching(name, text, mapping):
    found = []
    for number, line in enumerate(text.split('\n'), start=1):
        for match in AN_ID.finditer(line):
            if (match.group(1), int(match.group(2))) in mapping \
                    and RANGE_AFTER.match(line[match.end():]):
                found.append('%s:%d  a range starts at %s -- fix it by hand'
                             % (name, number, match.group(0)))
    return found


def apply_to_working_tree(mapping, dry_run):
    changed, warnings = [], []
    for name in file_names(None):
        if name.startswith(SKIPPED):
            continue
        with open(os.path.join(ROOT, name), 'rb') as handle:
            text = decode(handle.read())
        if text is None:
            continue
        warnings.extend(ranges_touching(name, text, mapping))
        new_text, count = rewrite(text, mapping)
        new_name, renames = rewrite(name, mapping)
        if not count and not renames:
            continue
        changed.append((name, new_name, count))
        if dry_run:
            continue
        with open(os.path.join(ROOT, name), 'wb') as handle:
            handle.write(new_text.encode('utf-8'))
        if new_name != name:
            if git(['ls-files', '--', name]).strip():
                git(['mv', name, new_name])
            else:
                os.replace(os.path.join(ROOT, name), os.path.join(ROOT, new_name))
    return changed, warnings


def report(mapping, changed, warnings, ignored, dry_run):
    for (prefix, old), new in sorted(mapping.items()):
        say('  %s-%s -> %s-%s' % (prefix, old, prefix, new))
    for name, new_name, count in changed:
        say('  %s%s: %d id(s)' % (name, (' -> ' + new_name) if new_name != name else '', count))
    for one in warnings:
        say('  WARNING ' + one)
    say('%s %d id(s) in %d file(s); %d far mention(s) ignored for the maximum'
        % ('would renumber' if dry_run else 'renumbered', len(mapping), len(changed), ignored))


# -------------------------------------------------------------- the modes ----

def mode_compact(dry_run):
    prefixes = registered_prefixes()
    defined, mentioned, widths = measure(None)
    olds = {}
    for prefix, numbers in list(mentioned.items()) + list(defined.items()):
        if prefix in prefixes:
            found = set(n for n in numbers if is_provisional(n))
            if found:
                olds[prefix] = olds.get(prefix, set()) | found
    taken, ignored = taken_numbers(defined, mentioned, olds, olds)
    mapping = plan(olds, taken, widths)
    changed, warnings = apply_to_working_tree(mapping, dry_run)
    report(mapping, changed, warnings, ignored, dry_run)
    return 0


def mode_band(args, dry_run):
    bands = {}
    for one in args:
        match = re.match(r'^([A-Z]{1,4})=([0-9]+)-([0-9]+)$', one)
        if not match:
            raise SystemExit('a band is PREFIX=FIRST-LAST, not %r' % one)
        bands[match.group(1)] = (int(match.group(2)), int(match.group(3)))
    defined, mentioned, widths = measure(None)
    olds = {}
    for prefix, (first, last) in bands.items():
        numbers = mentioned.get(prefix, set()) | defined.get(prefix, set())
        olds[prefix] = set(n for n in numbers if first <= n <= last)
    # WHY: a band sits ABOVE the maximum by design, so its own members must
    # not count as mentions near the maximum.
    taken, ignored = taken_numbers(defined, mentioned, olds, olds)
    mapping = plan(olds, taken, widths)
    changed, warnings = apply_to_working_tree(mapping, dry_run)
    report(mapping, changed, warnings, ignored, dry_run)
    return 0


def clash_plan(base, theirs, ours='HEAD'):
    """The mapping that renumbers every id THEIRS defines anew, for each
    prefix in which THEIRS and OURS took at least one same new id."""
    _, in_base, _ = measure(base)
    measured = dict((side, measure(side)) for side in (ours, theirs))
    new = {}
    for side, (defined, _, _) in measured.items():
        new[side] = dict((prefix, numbers - in_base.get(prefix, set()))
                         for prefix, numbers in defined.items())
    olds = dict((prefix, numbers) for prefix, numbers in new[theirs].items()
                if numbers & new[ours].get(prefix, set()))
    if not olds:
        return {}
    defined, mentioned, widths = {}, {}, {}
    for side_defined, side_mentioned, side_widths in measured.values():
        for target, source in ((defined, side_defined), (mentioned, side_mentioned)):
            for prefix, numbers in source.items():
                target[prefix] = target.get(prefix, set()) | numbers
        for prefix, width in side_widths.items():
            widths[prefix] = max(widths.get(prefix, 0), width)
    taken, _ = taken_numbers(defined, mentioned, olds, olds)
    # WHY: OURS keeps the numbers the two sides share; only THEIRS moves.
    for prefix in olds:
        taken[prefix] |= new[ours].get(prefix, set())
    return plan(olds, taken, widths)


def renumbered_commit(base, theirs, mapping):
    """A commit on top of THEIRS with `mapping` applied to every file THEIRS
    changed since BASE. Built with a private index; the working tree and the
    real index are never touched."""
    theirs_sha = git(['rev-parse', theirs]).decode().strip()
    changed = lines_of(git(['diff', '--name-only', '--no-renames', base, theirs_sha]))
    handle, index = tempfile.mkstemp(prefix='grs-renumber-index-')
    os.close(handle)
    os.remove(index)
    env = dict(os.environ, GIT_INDEX_FILE=index)
    try:
        git(['read-tree', theirs_sha], env=env)
        for name in changed:
            listed = git(['ls-tree', theirs_sha, '--', name]).decode().split()
            if not listed or name.startswith(SKIPPED):
                continue
            text = decode(git(['cat-file', 'blob', '%s:%s' % (theirs_sha, name)]))
            if text is None:
                continue
            new_text, count = rewrite(text, mapping)
            new_name, renames = rewrite(name, mapping)
            if not count and not renames:
                continue
            blob = git(['hash-object', '-w', '--stdin'], data=new_text.encode('utf-8')).decode().strip()
            if new_name != name:
                git(['update-index', '--force-remove', '--', name], env=env)
            git(['update-index', '--add', '--cacheinfo', '%s,%s,%s' % (listed[0], blob, new_name)],
                env=env)
        tree = git(['write-tree'], env=env).decode().strip()
    finally:
        if os.path.exists(index):
            os.remove(index)
    lines = ['Renumber the new ids of %s that clashed at the merge' % theirs_sha[:8], '']
    lines += ['%s-%d -> %s-%s' % (prefix, old, prefix, new)
              for (prefix, old), new in sorted(mapping.items())]
    return git(['commit-tree', tree, '-p', theirs_sha, '-m', '\n'.join(lines)]).decode().strip()


def mode_clashes(args):
    if len(args) < 2:
        raise SystemExit('usage: renumber_ids.py clashes <base> <theirs> [--commit]')
    base, theirs = args[0], args[1]
    mapping = clash_plan(base, theirs)
    if not mapping:
        say('no clashing ids between HEAD and %s since %s' % (theirs, base[:8]))
        return 0
    for (prefix, old), new in sorted(mapping.items()):
        say('  %s-%d -> %s-%s' % (prefix, old, prefix, new))
    if '--commit' in args:
        say('renumbered commit %s' % renumbered_commit(base, theirs, mapping))
    return 0


def mode_check():
    """Check 68: no tracked file holds a provisional id or a provisional CR file name."""
    prefixes = registered_prefixes()
    found = []
    for name in lines_of(git(['ls-files'])):
        match = CR_FILE.match(name)
        if match and is_provisional(match.group(2)):
            found.append('%s  a provisional change-request number in the file name' % name)
    done = subprocess.run(['git', 'grep', '-n', '-I', '-E', r'[A-Z]{1,4}-9[0-9]{4}'] + PATHSPEC,
                          cwd=ROOT, capture_output=True)
    if done.returncode not in (0, 1):
        raise SystemExit('git grep: %s' % done.stderr.decode('utf-8', 'replace'))
    for line in lines_of(done.stdout):
        name, number, body = (line.split(':', 2) + ['', ''])[:3]
        for hit in AN_ID.finditer(body):
            if hit.group(1) in prefixes and is_provisional(hit.group(2)):
                found.append('%s:%s  %s is provisional' % (name, number, hit.group(0)))
    for one in found:
        say('  ' + one)
    if found:
        say('PROVISIONAL  %d provisional id(s) in tracked files -- run '
            'python tools/renumber_ids.py compact before the commit' % len(found))
        return 1
    say('OK       no provisional id (PREFIX-9NNNN) in a tracked file')
    return 0


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        encoding = sys.stdout.encoding or 'utf-8'
        sys.stdout.write(__doc__.encode(encoding, 'replace').decode(encoding))
        return 0 if argv else 2
    dry_run = '--dry-run' in argv
    rest = [one for one in argv[1:] if one != '--dry-run']
    if argv[0] == 'compact':
        return mode_compact(dry_run)
    if argv[0] == 'band':
        return mode_band(rest, dry_run)
    if argv[0] == 'clashes':
        return mode_clashes(rest)
    if argv[0] == '--check':
        return mode_check()
    say('unknown mode %r -- see --help' % argv[0])
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
