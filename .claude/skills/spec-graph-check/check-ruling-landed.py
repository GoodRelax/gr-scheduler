# -*- coding: utf-8 -*-
"""Check 43 -- a ruling the book calls applied whose words nothing holds.

⛔ WHY THIS EXISTS. The user's instruction of 2026-09-08, verbatim:
「これまでも同じ裁定を繰り返している。 何とかしてくれ。非効率すぎ」 -- the
same question was put to them twice, and more than twice. The cause is not
forgetfulness: it is that a ruling had no single place to live. It was
recorded in `pending-decisions.md`, or in a `defects.md` cell, or in a change
request, or nowhere at all, and nothing could say out loud "this is already
decided".

⭐ `docs/development-records/rulings.md` is that single place, written the same
day. ⚠️⚠️ A book that is merely ASKED FOR is a book that decays -- this
tree measured a rule written as a principle being followed 7 times in 75, and
the same rule written into a procedure running every time (the reliability
ladder, docs/development-rules/README.md section 2). This is the rung below
that: a machine reads the book on every run.

WHAT IT JUDGES, one row of rulings.md at a time.

  ② 状態 = 適用済  -> the 逐語 must be FOUND. ⛔ FAIL if it is not, because
     the row is then claiming a landing that nothing in the tree can show.
  ③ 状態 holding 未着地 -> counted and printed, held against the first line
     of the baseline file. ⭐ It may fall freely (and the run says to lower
     the baseline); it may only rise deliberately.
  ④ 着地先 empty -> ⛔ FAIL. Rule ③ of rulings.md's own preamble:
     「⛔ 空欄のまま巡を閉じるな —— それは「裁定は下りたが誰も書いていない」
     状態である」.

⭐ THE TWO TABLES ARE READ DIFFERENTLY, and that is the file's own shape. The
dated table carries five columns (逐語 / 読み / 着地先 / 状態); the older
table below it carries four (逐語 / 日付 / 着地先) and NO 状態 at all, because
its rows were copied in before this book existed and the file's own heading
says their verbatim must be confirmed one at a time. ⇒ A four-column row is
gated by ④ only. Widening ② over them would fault the file for being honest
about what it has not yet confirmed.

⛔⛔ WHERE THE WORDS ARE LOOKED FOR. `docs/spec/` always, plus the place the
row's own 着地先 names when that cell names a file. ⚠️ MEASURED 2026-09-09:
of the eight 適用済 rows, three landed OUTSIDE docs/spec and say so in their
own 着地先 -- `JDG-01` in `docs/development-rules/05-working-method.md`, `JDG-12`
and `JDG-13` in `docs/development-records/handoff.md`. A check that read only
docs/spec would fault all three for landing exactly where the row says they
did. ⭐ 「同上」 in a 着地先 inherits the row above it, which is how the file
writes `JDG-13`.

⛔ `docs/spec/output/` IS SKIPPED, deliberately and unlike check 42. It is a
StrictDoc HTML export, it is gitignored, and it holds four `.md` copies of
the manuscripts under `_assets`. Check 42's baseline file records what that
costs: its count reads three lower in a worktree than on the trunk, forever,
because no worktree can resolve the quotations living there. This check is
run by bodies inside worktrees, so it reads only what a worktree has.

⭐⭐ HOW THE VERBATIM IS COMPARED, and why it is loose. Both sides are put
through ONE normalization -- `*`, backticks, EVERY kind of whitespace
including newlines and the ideographic space, and the decorative marks ⭐⚠⛔
are struck -- and the outer 「」/『』 are peeled off the quotation. Three
measured reasons, not taste:

  1. THE BOOK EMPHASISES AND THE MANUSCRIPT DOES NOT, or the other way. This
     tree writes `**bold**` around most of its prose and the same sentence
     appears both ways.
  2. THE MANUSCRIPT WRAPS. ⚠️ MEASURED in the round of 2026-09-08: of eleven
     fabricated citations hunted in `src/`, FOUR were invisible to `grep`
     because the sentence was broken across two lines. Striking newlines is
     what makes those four findable.
  3. THE SPACING DIFFERS. 「1 日」 and 「1日」 are the same ruling.

⛔ NOTHING ELSE IS RELAXED. No elision, no substring, no paraphrase: the
whole verbatim must be present. A ruling half-quoted is a ruling half-applied,
and this repository has a defect row for exactly that shape (an abbreviated
clause that dropped the half saying where the number lives).

⭐ THE HELD LINES, and why ② is not simply zero-or-red. A ruling can land
CORRECTLY and still leave no verbatim anywhere, because the user did not speak
a sentence a document could carry. ⚠️ MEASURED 2026-09-09, both cases in the
book already:

  - `JDG-08` 「A：場所を常に空ける（体が書いたもの）」 -- the user chose an
    option by its letter. 表 T-038 does hold the ruling (`OC-3`/`OC-4` are
    excluded so that toggling display cannot move a task), but no manuscript
    can contain the word "A".
  - `JDG-06` -- the user quoted the clause BACK in their own spacing, and
    `FR-055` already carried it; the ruling was that nothing changes.

⇒ A line reading `HELD JDG-06  <reason>` in the baseline file exempts that one
row. This is the shape check 26b already uses (published-members-baseline.txt)
and it is held the same way in BOTH directions: an unheld miss is red, and a
HELD row that is no longer a miss is ALSO red, so an exemption cannot rot into
a permission. ⛔ A held line is a debt. Adding one means writing down why.

    python .claude/skills/spec-graph-check/check-ruling-landed.py [--list]
    python .claude/skills/spec-graph-check/check-ruling-landed.py <rulings.md>

Run with PYTHONIOENCODING=utf-8. `--list` prints every row it read and what
it found, which is how the baseline is inspected. A path argument points the
run at a different copy of the book -- a scratch copy, to rehearse a FAIL
without touching the real one.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

RULINGS = os.path.join(ROOT, 'docs', 'development-records', 'rulings.md')
SPEC = os.path.join(ROOT, 'docs', 'spec')
BASELINE = os.path.join(HERE, 'ruling-landed-baseline.txt')

REL = 'docs/development-records/rulings.md'
REL_BASELINE = '.claude/skills/spec-graph-check/ruling-landed-baseline.txt'

# ⛔ The generated StrictDoc export. Gitignored, so a worktree does not have
# it -- see the docstring for what including it costs check 42.
SKIP_DIRS = ('output',)

DATED_CELLS = 7          # | R | 逐語 | 読み | 着地先 | 状態 |   -> 5 columns
OLDER_CELLS = 6          # | R | 逐語 | 日付 | 着地先 |          -> 4 columns

APPLIED = u'適用済'
UNLANDED = u'未着地'
OVERTURNED = u'覆された'
DITTO = u'同上'
THIS_BOOK = u'本書'

# The marks that differ between the book and a manuscript. Same set as check
# 42 uses, for the same reason.
NOISE = re.compile(u'[*`⭐⚠⛔️　\\s]+')
QUOTE_ENDS = u'「」『』'          # 「」『』

# A path written in the 着地先 cell, with or without backticks.
PATH_IN_CELL = re.compile(u'[A-Za-z0-9_./-]+\\.(?:md|json|ts|py|sh|xml)')

HELD_LINE = re.compile(u'^HELD\\s+(JDG-\\d+)\\s*(.*)$')


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def flatten(text):
    """One text with the marks that differ between the two sides removed."""
    return NOISE.sub(u'', text)


def read(path):
    try:
        return io.open(path, encoding='utf-8', errors='replace').read()
    except OSError:
        return u''


def rel_of(path):
    return os.path.relpath(path, ROOT).replace('\\', '/')


def manuscripts():
    """Every manuscript under docs/spec, flattened, one string each.

    ⛔ Searched one file at a time, never as a concatenation: a quotation must
    not be allowed to match across a seam between two files that does not
    exist in either of them.
    """
    found = []
    for base, dirs, names in os.walk(SPEC):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in sorted(names):
            if name.endswith('.md'):
                path = os.path.join(base, name)
                found.append((rel_of(path), flatten(read(path))))
    return found


def named_places(cell, book_path, own_line):
    """Files the 着地先 cell names, as (relative path, flattened text)."""
    places = []
    seen = set()
    for candidate in PATH_IN_CELL.findall(cell):
        path = os.path.join(ROOT, candidate.replace('/', os.sep))
        if candidate in seen or not os.path.isfile(path):
            continue
        seen.add(candidate)
        places.append((candidate, flatten(read(path))))
    # ⭐ 「本書」 is rulings.md itself. `JDG-02` -- the ruling that this book
    # should exist -- landed as the book, and there is nowhere else it could.
    # ⛔ THE ROW'S OWN LINE IS STRUCK FIRST. Without that, any row could name
    # 本書 as its 着地先 and pass on its own 逐語 cell, which proves nothing.
    # `JDG-02` passes because the file's PREAMBLE quotes the instruction as the
    # reason the book exists -- a second, independent copy.
    if THIS_BOOK in cell:
        lines = io.open(book_path, encoding='utf-8').read().split('\n')
        if 0 < own_line <= len(lines):
            lines[own_line - 1] = u''
        places.append((REL, flatten(u'\n'.join(lines))))
    return places


def rows(path):
    """Every ruling row of the book.

    Yields (row id, verbatim, 着地先 cell, 状態 cell or None, line number).
    ⭐ 「同上」 inherits the 着地先 of the row above, which is how the file
    writes `JDG-13`.
    """
    previous_where = u''
    for number, line in enumerate(io.open(path, encoding='utf-8'), start=1):
        if not line.startswith('| JDG-'):
            continue
        cells = line.rstrip('\n').split('|')
        if len(cells) == DATED_CELLS:
            row_id, quote, where, state = (cells[1].strip(), cells[2].strip(),
                                           cells[4].strip(), cells[5].strip())
        elif len(cells) == OLDER_CELLS:
            row_id, quote, where, state = (cells[1].strip(), cells[2].strip(),
                                           cells[4].strip(), None)
        else:
            continue
        if DITTO in where:
            where = where.replace(DITTO, previous_where)
        previous_where = where
        yield row_id, quote, where, state, number


def bare(quote):
    """The verbatim, normalized and stripped of its quotation marks."""
    return flatten(quote).strip(QUOTE_ENDS)


def judge(path):
    """(applied, unlanded, empty, misses, read_rows).

    misses -- (row id, line number, verbatim) for every 適用済 row whose
              words are in neither docs/spec nor the place it names.
    """
    spec = manuscripts()
    applied = []
    unlanded = []
    empty = []
    misses = []
    read_rows = 0

    for row_id, quote, where, state, number in rows(path):
        read_rows += 1
        if not flatten(where):
            empty.append((row_id, number))
        if state is None:
            continue                       # the older table carries no 状態
        flat_state = flatten(state)
        if UNLANDED in flat_state:
            # ⭐ 「一部未着地」 counts here too: part of the ruling has not
            # landed, which is the thing being counted.
            unlanded.append((row_id, number))
            continue
        if OVERTURNED in flat_state:
            continue                       # rule ① of the book's preamble
        if APPLIED not in flat_state:
            continue
        applied.append(row_id)
        needle = bare(quote)
        if not needle:
            misses.append((row_id, number, quote))
            continue
        haystacks = spec + named_places(where, path, number)
        if not any(needle in text for _name, text in haystacks):
            misses.append((row_id, number, quote))

    return applied, unlanded, empty, misses, read_rows


def read_baseline():
    """(count, {row id: reason}) or (None, {}) when the file is missing."""
    if not os.path.exists(BASELINE):
        return None, {}
    held = {}
    count = None
    with io.open(BASELINE, encoding='utf-8') as handle:
        for line in handle:
            line = line.strip()
            if count is None:
                try:
                    count = int(line)
                except ValueError:
                    return None, {}
                continue
            found = HELD_LINE.match(line)
            if found:
                held[found.group(1)] = found.group(2).strip()
    return count, held


def main():
    argv = [a for a in sys.argv[1:] if a != '--list']
    listing = '--list' in sys.argv[1:]
    path = argv[0] if argv else RULINGS

    if not os.path.exists(path):
        say('PROBLEM  %s is missing -- it is the ONE place a ruling lives, '
            'and without it nothing can say "this is already decided"' % REL)
        return 1

    applied, unlanded, empty, misses, read_rows = judge(path)

    if not read_rows:
        say('PROBLEM  %s yielded no ruling row -- the table shape changed, '
            'and this check would silently pass forever' % REL)
        return 1

    held_count, held = read_baseline()
    if held_count is None:
        say('PROBLEM  %s has not been written yet, or its first line is not '
            'a number' % REL_BASELINE)
        return 1

    if listing:
        for row_id, number, quote in misses:
            say(u'MISS  %s (line %d)\n      %s' % (row_id, number, quote))
        say(u'-- %d row(s) read, %d 適用済, %d 未着地, %d with an empty 着地先, '
            u'%d 適用済 whose words are nowhere'
            % (read_rows, len(applied), len(unlanded), len(empty),
               len(misses)))
        return 0

    fail = 0

    # ④ -- the book's own preamble rule 3.
    if empty:
        say('FAIL     %s: %d row(s) close with an empty 着地先 -- %s. ⛔ The '
            'book\'s own rule 3 says 「空欄のまま巡を閉じるな —— それは「裁定'
            'は下りたが誰も書いていない」状態である」. Write where the ruling '
            'landed, or mark the row 未着地 and let the baseline hold it.'
            % (REL, len(empty),
               u' '.join(u'%s(line %d)' % pair for pair in empty)))
        fail = 1

    # ② -- 適用済 with nothing to show for it.
    unheld = [m for m in misses if m[0] not in held]
    stale = sorted(set(held) - set(m[0] for m in misses))
    if unheld:
        say('FAIL     %s: %d row(s) say 適用済 while neither docs/spec nor '
            'the place their own 着地先 names holds their 逐語. ⛔ The row is '
            'claiming a landing nothing in the tree can show. Either write '
            'the ruling into the specification, or correct the 着地先, or -- '
            'if the words are ones no document can carry (a chosen option, a '
            'clause quoted back in the user\'s own spacing) -- add a HELD '
            'line for the row to %s and say why there. ⛔ Do NOT reword the '
            '逐語: rule 2 of the book forbids it.' % (REL, len(unheld),
                                                      REL_BASELINE))
        for row_id, number, quote in unheld[:6]:
            say(u'         %s (line %d) %s' % (row_id, number, quote[:70]))
        fail = 1
    if stale:
        say('FAIL     %s holds a HELD line for %s, and that row is no longer '
            'a miss -- its words are in the tree now. ⛔ A held line is a '
            'debt, not a permission: strike it, so the exemption cannot rot '
            'into one.' % (REL_BASELINE, u' '.join(stale)))
        fail = 1

    # ③ -- the un-landed rulings, counted against the baseline.
    count = len(unlanded)
    listing_text = u' '.join(u'%s(line %d)' % pair for pair in unlanded)
    if count > held_count:
        say('FAIL     %s: rulings still 未着地 went %d -> %d. ⛔ A ruling that '
            'has come down and is written nowhere is what makes the user '
            'answer the same question twice -- 「これまでも同じ裁定を繰り返し'
            'ている。 何とかしてくれ。非効率すぎ」. Land it, or raise the '
            'number in %s deliberately and say why in the commit.'
            % (REL, held_count, count, REL_BASELINE))
        fail = 1
    elif count < held_count:
        say('OK       %s: %d ruling(s) still 未着地 (was %d) -- ⭐ lower the '
            'baseline in %s to hold the ground'
            % (REL, count, held_count, REL_BASELINE))
    else:
        say('OK       %s: %d ruling(s) still 未着地, which is the baseline'
            % (REL, count))
    if listing_text:
        say(u'         %s' % listing_text)

    if not fail:
        say('OK       %s: %d row(s) read, %d 適用済 with their 逐語 found '
            '(%d held), 0 with an empty 着地先'
            % (REL, read_rows, len(applied) - len(misses), len(held)))
    return fail


if __name__ == '__main__':
    sys.exit(main())
