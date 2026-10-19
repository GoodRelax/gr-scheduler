# -*- coding: utf-8 -*-
u"""Check 62 -- an IN-FLIGHT change request's claim about the identifier
space, re-measured against the tree it will be applied to.

THE FAILURE THIS EXISTS FOR, measured 2026-09-21. Two sessions drafted a
change request at the same moment. Both read the tree to pick a free table
number, both concluded that the largest number the tree used was `T-274`, and
both wrote `T-275`. One landed. The other still says `T-275`, and the sentence
it says it for -- "the largest the tree uses is `T-274`" -- was true when it
was written and is false now.

  * An identifier picked from "the current maximum" is a claim with a shelf
    life of one commit.
  * The older answer to this -- hand out number bands in the brief -- reaches
    subagents inside ONE session. Two sessions cannot see each other's drafts
    at all, so no brief can carry it.
  * docs/development-rules/README.md section 2 measured what happens to an
    answer written as a note: a rule carried as a principle was followed 7
    times in 75. So this is a check and not a note.

WHAT IT READS, and what it deliberately does NOT read.

  IT READS a claim about the PRESENT STATE of the identifier space -- a
  sentence whose truth the tree can be asked about today:

    (A) FREE      a line saying an identifier is 空いて / 空き, for every
                  backticked identifier standing to the LEFT of that word.
                  (Everything to the right is usually the opposite list --
                  "`EG` `EP` `PE` are already registered" -- so reading the
                  whole line would fault the very names the line excludes.)
    (B) MAXIMUM   a line saying 表 ... 最大, for the first backticked
                  `T-nnn` standing AFTER that word.
    (C) REGISTRY  a line saying 接頭辞 / 登録簿 ... N 件, for N.

  IT DOES NOT READ section 5's 数の予測 -- `rows=` / `tables=` / `uids=` /
  `figures=`. ⛔ DO NOT ADD THEM. Measured on this tree: 66 `rows=`, 64
  `tables=` and 62 `uids=` across the change requests, and almost every one
  of them is correct history. A change request's 数の予測 records what was
  measured on the day it was drafted, and freezing it is the whole point --
  rule 02 section 2 holds the prediction against the measurement of that
  round. A check that compared those numbers against today would fault every
  change request in the folder and teach people to ignore red.

  ⭐ The dangerous form is narrow, and this is the whole of it: a number or a
  name used as the EVIDENCE for reserving an identifier the change request
  is about to create.

HOW IT SCOPES, and why the scoping is the load-bearing part.

  Only change requests that `git status --porcelain` reports as untracked or
  modified are read -- the same reader tools/precheck.py uses, for the same
  reason. ⛔ A LANDED change request MUST NOT be faulted: its identifiers are
  in the tree precisely because it landed, and its freedom claims were true
  at the moment they were applied. Run with `--all` to see what dropping the
  scoping would cost; that number is in check.sh's comment.

  ⭐ A RENAMED PATH IS NOT A NEW CLAIM (JDG-2945). A rename of a top-level
  path rewrites landed change requests, and git then reports them as
  modified. A modified change request whose whole diff against HEAD is
  explained by the rows of path-renames.txt is therefore NOT in flight: every
  removed line, with those rows applied, must equal the line added in its
  place. Any other change -- one added word, a line added or removed -- keeps
  it in flight exactly as before. `--self-test` breaks this on purpose.

  ⚠️ So on a clean tree this check passes having read nothing. That is
  correct and it is the same shape as check 41: it is the guard on the round
  that writes the change request, not an audit of the folder.

WHAT IT CANNOT SEE, printed on every run rather than left implied:

  * a reservation the change request makes without saying so in one of the
    three forms above -- it can only re-measure a claim somebody wrote;
  * an identifier another SESSION is about to take and has not committed;
  * whether the name is a GOOD one. R2 of the review standard decides that.

Usage:
    PYTHONIOENCODING=utf-8 python check-identifier-reservation.py
    PYTHONIOENCODING=utf-8 python check-identifier-reservation.py --all
    PYTHONIOENCODING=utf-8 python check-identifier-reservation.py <path> ...
    PYTHONIOENCODING=utf-8 python check-identifier-reservation.py --self-test
"""
import glob
import io
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

REL_CRS = 'change-request'
REL_PREFIXES = 'docs/spec/_source/row-id-prefixes.json'
REL_RENAMES = os.path.join(HERE, 'path-renames.txt')
SPEC_GLOBS = ('docs/spec/*.md', 'docs/spec/_assets/*.md')

# A backticked name, as every document of this tree writes an identifier.
BACKTICKED = re.compile(r'`([A-Z][A-Za-z0-9]*(?:-[0-9]+[a-z]?)?)`')
AN_ID = re.compile(r'^[A-Z]{1,4}-[0-9]+[a-z]?$')
A_PREFIX = re.compile(r'^[A-Z]{1,4}$')

# (A) the word a document uses to say a name is not taken.
FREE = re.compile(u'空いて|空き')
# (B) 表 ... 最大 -- the claim CR-432 and CR-433 both made, one commit apart.
MAXIMUM = re.compile(u'最大')
TABLE_WORD = u'表'
A_TABLE_ID = re.compile(r'`(T-[0-9]+[a-z]?)`')
# (C) how many prefixes the registry holds. ⛔ BOTH halves are needed. The
# line has to be ABOUT the registry (REGISTRY_SUBJECT), and the number has to
# stand DIRECTLY against a word that counts it (REGISTRY_SIZE). Measured: a
# loose reading that allowed 24 characters between them read 「登録簿が数える
# 行とずれた）の 1 件だけが赤」 -- a count of red checks -- as a registry size.
REGISTRY_SUBJECT = re.compile(u'接頭辞|登録簿')
REGISTRY_SIZE = re.compile(
    u'(?:接頭辞|登録簿|既存)'
    u'(?:は|が|の|に)?\\s*([0-9]+)\\s*件')

# A table number the specification defines, written as its own heading.
TABLE_HEADING = re.compile(u'^\\*\\*表 (T-[0-9]+[a-z]?)\\s*[—-]+')


def say(message):
    sys.stdout.write(message + '\n')


def path_of(relative):
    return os.path.join(ROOT, relative.replace('/', os.sep))


def read_text(path):
    """Normalized on read: this tree mixes CRLF and LF."""
    return io.open(path, encoding='utf-8', newline='').read().replace('\r\n', '\n')


def spec_files():
    found = []
    for pattern in SPEC_GLOBS:
        found.extend(sorted(glob.glob(path_of(pattern))))
    return found


def tree_state():
    """What the specification uses TODAY: its ids, its table numbers, its prefixes."""
    ids = set()
    tables = set()
    for path in spec_files():
        body = read_text(path)
        ids.update(re.findall(r'\b([A-Z]{1,4}-[0-9]+[a-z]?)\b', body))
        for line in body.split('\n'):
            match = TABLE_HEADING.match(line)
            if match:
                tables.add(match.group(1))
    registry = json.load(io.open(path_of(REL_PREFIXES), encoding='utf-8'))
    prefixes = set()
    for entry in registry['prefixes']:
        prefixes.add(entry['prefix'] if isinstance(entry, dict) else entry)
    return ids, tables, prefixes


def biggest_table(tables):
    if not tables:
        return None
    return max(tables, key=lambda name: int(re.match(r'T-([0-9]+)', name).group(1)))


def load_renames(path=REL_RENAMES):
    """The rows of path-renames.txt as (old, new) pairs, in file order."""
    rows = []
    for line in read_text(path).split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        change = line.split(' | ')[0]
        if ' -> ' not in change:
            continue
        old, new = change.split(' -> ', 1)
        rows.append((old.strip(), new.strip()))
    return rows


def apply_renames(text, renames):
    for old, new in renames:
        text = text.replace(old, new)
    return text


def explained_by_renames(diff_text, renames):
    """True when every changed line of a `git diff -U0` is only a rename.

    The removed lines and the added lines of each hunk must pair one to one,
    and each removed line with the rows applied must equal its added line. An
    empty diff is not explained: there is nothing to explain, and the caller
    keeps such a file in flight.
    """
    hunks = []
    removed, added = [], []
    for line in diff_text.replace('\r', '').split('\n'):
        if line.startswith('@@'):
            hunks.append((removed, added))
            removed, added = [], []
        elif line.startswith('---') or line.startswith('+++'):
            continue
        elif line.startswith('-'):
            removed.append(line[1:])
        elif line.startswith('+'):
            added.append(line[1:])
    hunks.append((removed, added))
    changed = 0
    for gone, came in hunks:
        if len(gone) != len(came):
            return False
        for before, after in zip(gone, came):
            changed += 1
            if apply_renames(before, renames) != after:
                return False
    return changed > 0


def only_a_rename(relative):
    """A tracked, modified change request whose diff against HEAD is only a rename."""
    diff = subprocess.run(
        ['git', 'diff', 'HEAD', '-U0', '--no-renames', '--', relative],
        cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace',
    ).stdout
    return explained_by_renames(diff, load_renames())


def in_flight():
    """Change requests git reports as untracked or modified -- precheck.py's reader.

    A tracked file whose whole diff is a path rename (path-renames.txt) is left out.
    """
    out = subprocess.run(
        ['git', 'status', '--porcelain', '--', REL_CRS],
        cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace',
    ).stdout
    found = []
    for line in out.splitlines():
        if len(line) < 4:
            continue
        name = line[3:].strip().strip('"')
        if ' -> ' in name:
            name = name.split(' -> ', 1)[1]
        # git collapses an untracked DIRECTORY into one entry.
        if name.endswith('/'):
            for base, _dirs, names in os.walk(path_of(name)):
                for one in names:
                    full = os.path.join(base, one)
                    found.append(os.path.relpath(full, ROOT).replace(os.sep, '/'))
            continue
        if line[:2].strip() in ('M', 'MM') and only_a_rename(name):
            continue
        found.append(name)
    return [one for one in found
            if one.endswith('.md') and os.path.exists(path_of(one))]


def every_change_request():
    found = sorted(glob.glob(path_of(REL_CRS + '/*.md')))
    return [os.path.relpath(one, ROOT).replace(os.sep, '/') for one in found]


def claims_of(line):
    """Every claim one line makes about the present state of the identifier space.

    Yields (kind, subject, quoted line) -- nothing is decided here, so the
    reading can be read back from the output without re-running the file.
    """
    free = FREE.search(line)
    if free:
        for name in BACKTICKED.findall(line[:free.start()]):
            if AN_ID.match(name) or A_PREFIX.match(name):
                yield ('FREE', name)
    big = MAXIMUM.search(line)
    if big and TABLE_WORD in line[:big.end()]:
        after = A_TABLE_ID.search(line[big.end():])
        if after:
            yield ('MAXIMUM', after.group(1))
    if REGISTRY_SUBJECT.search(line):
        for size in REGISTRY_SIZE.finditer(line):
            yield ('REGISTRY', size.group(1))


def judge(relative, ids, tables, prefixes, largest):
    """The faults one change request carries, and how many claims were read."""
    faults = []
    read = 0
    for number, line in enumerate(read_text(path_of(relative)).split('\n'), 1):
        for kind, subject in claims_of(line):
            read += 1
            where = '%s:%d' % (relative, number)
            if kind == 'FREE':
                taken = subject in prefixes if A_PREFIX.match(subject) else subject in ids
                if taken:
                    faults.append(
                        '%s says `%s` is free; the tree already uses it'
                        % (where, subject))
            elif kind == 'MAXIMUM':
                if largest is not None and subject != largest:
                    faults.append(
                        '%s says the largest table number is `%s`; the tree '
                        'now defines `%s`' % (where, subject, largest))
            elif kind == 'REGISTRY':
                if int(subject) != len(prefixes):
                    faults.append(
                        '%s says the prefix registry holds %s; it holds %d'
                        % (where, subject, len(prefixes)))
    return faults, read


def self_test():
    """The rename rule, broken on purpose: every case runs on an in-memory diff."""
    renames = [('old-dir/', 'new-dir/'), ('old-dir', 'new-dir')]

    def diff(*pairs):
        out = ['--- a/x.md', '+++ b/x.md']
        for number, (gone, came) in enumerate(pairs, 1):
            out.append('@@ -%d +%d @@' % (number, number))
            out.extend('-' + one for one in gone)
            out.extend('+' + one for one in came)
        return '\n'.join(out)

    cases = [
        ('a pure rename is explained',
         explained_by_renames(diff((['see `old-dir/a.md`'], ['see `new-dir/a.md`'])), renames), True),
        ('a bare-name rename is explained',
         explained_by_renames(diff((['the old-dir folder'], ['the new-dir folder'])), renames), True),
        ('two hunks of pure renames are explained',
         explained_by_renames(diff((['a old-dir/x'], ['a new-dir/x']),
                                   (['b old-dir'], ['b new-dir'])), renames), True),
        ('a CRLF diff of a pure rename is explained',
         explained_by_renames(diff((['see old-dir/a\r'], ['see new-dir/a\r'])), renames), True),
        ('a rename plus one added word is NOT explained',
         explained_by_renames(diff((['see `old-dir/a.md`'], ['see `new-dir/a.md` now'])), renames), False),
        ('a line that changes without any rename is NOT explained',
         explained_by_renames(diff((['`T-275` is free'], ['`T-276` is free'])), renames), False),
        ('a pure added line is NOT explained',
         explained_by_renames(diff(([], ['a new line'])), renames), False),
        ('a pure removed line is NOT explained',
         explained_by_renames(diff((['a gone line'], [])), renames), False),
        ('an empty diff is NOT explained',
         explained_by_renames('', renames), False),
        ('the real table renames previous-project-result/ to studies/',
         apply_renames('see previous-project-result/01-x', load_renames()) == 'see studies/01-x', True),
        ('the real table renames the bare name too',
         apply_renames('the previous-project-result folder', load_renames()) == 'the studies folder', True),
    ]
    wrong = 0
    for label, got, want in cases:
        if got != want:
            wrong += 1
            say('WRONG    %s: got %s, wanted %s' % (label, got, want))
    say('%s  %d case(s), %d wrong' % ('OK' if not wrong else 'FAIL', len(cases), wrong))
    return 1 if wrong else 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    everything = '--all' in argv
    named = [one for one in argv if not one.startswith('--')]

    ids, tables, prefixes = tree_state()
    largest = biggest_table(tables)

    if named:
        targets = [one.replace(os.sep, '/') for one in named]
        scope = '%d change request(s) named on the command line' % len(targets)
    elif everything:
        targets = every_change_request()
        scope = ('ALL %d change request(s) -- the in-flight scoping is OFF, so '
                 'landed ones are faulted too' % len(targets))
    else:
        targets = in_flight()
        scope = ('%d change request(s) in flight (untracked or modified under '
                 '%s/)' % (len(targets), REL_CRS))

    faults = []
    claims = 0
    for relative in targets:
        one, read = judge(relative, ids, tables, prefixes, largest)
        faults.extend(one)
        claims += read

    say('COVERAGE %s; %d claim(s) about the present identifier space read, '
        'against %d id(s) and %d table number(s) of docs/spec (largest %s) and '
        '%d registered prefix(es). Section 5\'s rows= / tables= / uids= are '
        'frozen history and are never read. A reservation nobody wrote a claim '
        'for, and a name another session has not committed yet, are invisible '
        'to this.'
        % (scope, claims, len(ids), len(tables), largest, len(prefixes)))

    for one in faults:
        say('  ' + one)
    if faults:
        say('FAIL     %d identifier reservation(s) whose evidence no longer '
            'holds. Re-measure NOW and rewrite the change request, or pick '
            'another name (docs/development-rules/02-changing-the-spec.md '
            'section 2.5).' % len(faults))
        return 1
    say('OK       every identifier reservation read still holds')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
