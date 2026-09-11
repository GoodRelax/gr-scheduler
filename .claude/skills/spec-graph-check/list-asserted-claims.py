# -*- coding: utf-8 -*-
"""Stage 3 of the comment cleanup -- list the comment sentences that ASSERT
something in the present tense and name a spec ID that no longer exists.

⛔⛔ THIS IS NOT A GATE, AND THE NAME SAYS SO. It is `list-...`, not
`check-...`, because `check.sh` collects `check-*.py` and a body that wired
this into the suite would be wiring in a heuristic whose precision is measured
at roughly two in three (see MEASURED PRECISION below). It always exits 0
unless it genuinely cannot run -- a missing `docs/spec`, an unreadable
retirement set. It prints candidates for a human to work down, and the human
is the check.

WHY IT EXISTS. Comments in this tree rot where nothing looks. Measured
2026-09-11: `src/` is 68 files and 76,506 lines, of which 48,736 -- 63.7%, two
lines in every three -- are comment lines; `tests/` is 227 files and 191,702
lines, 59,912 of them comment (31.3%). Nothing in the 39-check suite reads a
single one of them for truth. Meanwhile the specification retires rows: the
withdrawal set this file reads holds 54 IDs whose seats are burnt on purpose.
A comment that says, today, that a withdrawn row governs something is a lie
sitting in the tree, and it is worse in a test than in `src/` -- a wrong
comment in `src/` can be caught by pressing the shipped build, a wrong comment
in a test cannot.

⭐ THE DISTINCTION THIS FILE TURNS ON. An ASSERTION is a claim about how
things are now; a RECORD is a claim about a day that has passed.

    assertion  「〜である」「〜に従う」  "S-59, the plan half (FR-049)."
    record     「2026-09-10 に廃した」   "`S-82` was retired with the idea."

A record naming a withdrawn ID was true when it was written and stays true.
⛔ Flagging one is a false positive, and in this tree records are the
OVERWHELMING majority of withdrawn-ID mentions -- the people who retired those
rows mostly wrote the retirement down beside the code. So the whole difficulty
of this tool is the split, not the ID lookup.

HOW A COMMENT LINE IS COUNTED. First non-space characters are `//`, `*` or
`/*`. ⛔ That is the line's own first characters, not a parse -- a block
comment continued without a leading `*` keeps its lines out of the count. This
is deliberately the SAME rule `check-must-clause-coverage.py` counts by and the
same rule the rest of this cleanup counts by, so the numbers stay comparable.

HOW A SENTENCE IS CUT. Consecutive comment lines are one block; the markers
are stripped, the remainder joined with a space, and the join split at `。`
`．` `！` `？` and at ASCII `.` `!` `?` when the next character is whitespace or
the end. A sentence is reported at the line its FIRST character sat on. ⚠️ The
ASCII rule mis-cuts `e.g.` and `i.e.`; it does not mis-cut `frame-loop.ts` or
`05-07-design.md`, because the dot there is followed by a letter.

HOW THE SPLIT IS DECIDED -- a heuristic, stated so it can be refuted. RECORD
wins over ASSERTION whenever both fire, because a false positive costs a human
a wasted read and a false negative costs nothing this tool promises.

  RECORD if the sentence carries any of: an ISO date (`2026-09-10`); a
  Japanese past/perfective ending before a terminator or a quote close
  (`た` `だった` `ていた` `した`); a Japanese history word (`かつて` `以前`
  `廃止` `廃した` `撤回` `やめた` `もはや`); an English past or history marker
  (`was` `were` `used to` `until` `no longer` `previously` `formerly`
  `retired` `withdrawn` `is gone` `went with` `left table` `stays burnt`
  `as of` `the old`).

  ASSERTION otherwise, if the sentence carries a Japanese present copula or
  rule ending (`である` `とする` `すること` `に従う` `しなければならない`
  `してはならない` `がある` `はない`, or a plain u-row verb before `。` that is
  not `た`), or an English present-simple verb from a closed list (`is` `are`
  `has` `says` `owns` `holds` `must` `always` `never` `means` `draws` …).

  UNCLASSIFIED otherwise. Unclassified sentences are counted and never
  printed.

⭐ RETIREMENT TALK IS FILED AS RECORD ON PURPOSE. "IC-46 IS GONE" is
present-tense and TRUE, and so is 「その `S-93` は 2026-09-10 に廃した」. Both
name a withdrawn ID without lying about it. They are the single largest thing
that would otherwise be flagged, so `is gone` / `retired` / `廃止` push to
record even though the copula is present.

WHICH IDS ARE LOOKED AT. Tokens of the shape `FR-011` / `S-93` / `IC-46` /
`T-023d` ANYWHERE in the sentence, ⭐ INCLUDING OUTSIDE BACKTICKS. Measured
2026-09-11, 177 of 328 live references to withdrawn IDs in this tree sit
outside backticks, and every existing check -- check 7 among them -- matches
only `` `X-9` ``, so all 177 are invisible to the suite.

⚠️ A TOKEN WHOSE PREFIX THE SPECIFICATION NEVER USES IS NOT A SPEC ID. The
prefix universe is computed from the defined-plus-retired ID set itself, so
`UTF-8`, `ISO-8601` and `SHA-256` are dropped without a hand-written list.
⛔ THIS IS NOT A NARROWING TO FLATTER THE NUMBER: the count of dropped tokens
and their commonest prefixes is printed on the NOTE line, so the choice can be
refuted. `CR-` needs no entry -- the specification defines no `CR` prefix, so
the universe drops it already.

⚠️⚠️ PREFIX COLLISIONS, AND THE ONE PLACE THIS TOOL IS KNOWINGLY BLIND.
Three prefixes number rows in BOTH `docs/spec` and a document outside it, and
a token carrying one cannot be resolved without knowing which document the
comment meant:

    D-    `D-1` .. `D-5` are spec rows;  `D-254` is a ledger row of
          docs/development-records/defects.md          (380 tokens dropped)
    PD-   `PD-1` .. `PD-5` are spec rows; `PD-442` is a pending decision
                                                       (319 tokens dropped)
    R-    `R-1` .. `R-9` are spec rows;  `R-27` .. `R-40` are rulings of
          docs/development-records/rulings.md           (56 tokens dropped)

⛔ ALL THREE PREFIXES ARE DROPPED WHOLE, which means a genuinely dangling
`D-3` or `R-5` in a comment is invisible here. ⭐ The alternative -- keeping
them -- was measured on 2026-09-11 and cost 8 of the first 155 hits as pure
noise, every one of them a ruling or ledger row correctly cited. Resolving
this properly needs the other two documents' ID sets, which belong to a check
that reads them; ⛔ do not "fix" it by comparing the NUMBER against the highest
defined one, which would hide a real typo like `S-999`.

WHERE THE RETIREMENT SET COMES FROM: `retired.py`, imported, with the
defined-ID set still from `specindex.build(root)`.
⛔ IT WAS LIFTED WITH `ast` UNTIL 2026-09-11, and the reason is worth keeping
because it is the reason the module exists. This file first preferred
`check-spec-id-references.py` and fell back to `md-checks.py`, parsing whichever
it found and evaluating the literal, because every `check-*.py` and `md-checks.py`
in this directory runs its checks at import time and would have printed its own
report and exited on the way to one set. That workaround also had to choose
between two `RETIRED` sets that disagreed -- 61 entries against a subset of 8
frozen since 2026-08-25. ⭐ Both problems went away together: the set moved into
`retired.py`, which holds data and runs nothing, so there is one list and it can
simply be imported. The summary line still names where the set came from, so a
later reader never has to guess.

⚠️ THE SIBLING SOLVES THE COLLISION BELOW AND THIS FILE DOES NOT. It carries a
`load_elsewhere()` that reads `docs/development-records/` and
`change-request/`, which is the right answer to `D-` / `PD-` / `R-`. ⭐ When
it settles, replace FOREIGN_PREFIXES here with a call into it rather than
copying the reader.

⛔⛔ MEASURED PRECISION -- 2026-09-11, on all 69 hits, sampling 30 of them at
random (seed 20260911) and reading each one in its own file with five lines of
context either side. THIS IS THE DELIVERABLE; the code is not.

    25/30  (83%) were genuinely present-tense assertions, not records
    29/30  (97%) genuinely named a withdrawn or undefined spec ID
    24/30  (80%) were both
    19/30  (63%) were a claim that is actually STALE -- worth a human's edit

⭐ THE LAST NUMBER IS THE ONLY ONE THAT MATTERS TO A CLEANUP, and it is the
lowest because 5 of the 30 were TRUE present-tense statements ABOUT a
retirement -- 「⛔ `RS-17` IS NOT BELOW, AND IT IS THE ONE SEAT THIS UNION EVER
HELD THAT TABLE T-233 DID NOT」 names a withdrawn row in the present tense and
is exactly right. ⛔ Nothing mechanical separates "S-93 is the hit box" from
"S-93 is gone from these two rows" without reading the verb, and this tool
does not read verbs.

⭐ WHAT THE 19 BOUGHT, so the cost is judged against something. Among them:
`FR-061 (MUST) asks for the time to be shown beside the saved state` in
`dom-screen-surface.ts`, a requirement CR-280 retired with the autosave; `their
hit box is S-93` in `t-023d-double-click-only-rows.test.ts`, contradicting the
2026-09-10 ruling that the hit area IS the mark; and ``RS-47`, `RS-49` and
`RS-50` are rows of table T-233`` in `frame-loop.ts` -- three row IDs that
appear nowhere in `docs/spec`. ⛔ Every one of them sits OUTSIDE the reach of
check 7, which matches only backticked tokens in the manuscript and reads no
source file at all.

⛔ THE FOUR FALSE-POSITIVE CLASSES, named rather than tuned away. They were
found BY the sample, so silently patching the regexes against them would be
fitting the tool to its own measurement:

  1. A past-tense verb this list does not carry -- `took … out of that table`,
     `stood here`, `wanted`, `landed`. The classifier holds a closed list of
     history markers, and English has more verbs than that.
  2. A DATED measurement whose date sits in the PREVIOUS sentence, so the date
     rule never sees it. `r-28-the-resume-icon-beats-the-plan-bar.test.ts:77`
     is the type: 「⛔ MEASURED HERE, 2026-09-09」 ends one sentence and the
     measurement itself runs on into the next.
  3. A true present-tense statement about a retirement (the 5 above).
  4. A token that is a row of some OTHER project document -- `F-3` in
     `schedule.ts` is a review finding, not 図 F-003.

⇒ ⛔⛔ LISTER-ONLY, AND NOT CLOSE TO GATE-WORTHY. A gate at 63% would stop
better than one round in three for nothing, and classes 1 and 2 are open-ended
-- no finite regex list closes them. What would have to change before anyone
reconsiders: class 2 needs the date rule to look at the whole comment BLOCK
rather than the sentence (cheap, and would likely be a real gain); class 3
needs the verb read, which is not a `re` problem; class 1 needs the tense of an
arbitrary English verb. ⭐ At 63% it is a good afternoon's worth of cleanup
for one person -- 69 candidates, of which about 43 are real.

⛔ WHAT THIS DOES NOT CLAIM. Not that a flagged sentence is wrong -- only that
it reads as present tense and names an ID the specification no longer defines.
Not that an unflagged sentence is right; the date rule alone files every dated
sentence as a record, and a dated sentence can still carry a live lie -- ⚠️ THE
RECALL OF THIS TOOL HAS NOT BEEN MEASURED AT ALL. Not that the comment is
about the ID it mentions. And ⛔ NOT that the sentence cut is correct: a
mis-cut sentence can lose the very clause that made it a record.

    python .claude/skills/spec-graph-check/list-asserted-claims.py
    python .claude/skills/spec-graph-check/list-asserted-claims.py --all

`--all` prints every flagged sentence; the default prints at most 40 so the
summary stays visible. ⛔ Never calls a model and never touches the network:
`re` only. A non-deterministic listing could not be reproduced, and this file
exists to produce a number that is tracked across the cleanup.
"""
import io
import os
import re
import sys
import time
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
# ⛔ Imported, not parsed out of a sibling: the docstring above records why the
# two set literals this file used to choose between could not be imported, and
# why neither exists any more.
sys.path.insert(0, HERE)
from retired import RETIRED                         # noqa: E402

TREES = ('src', 'tests')
SUFFIXES = ('.ts', '.tsx', '.js', '.mjs')
SKIP_DIRS = {'node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__'}

# ⛔ The line's own first non-space characters. See the docstring: this is the
# rule the whole cleanup counts comment lines by, and changing it here would
# make this tool's number incomparable with every other stage's.
COMMENT_RE = re.compile(r'^\s*(?://|\*|/\*)')
MARKER_RE = re.compile(r'^\s*(?:/\*\*|/\*|\*/|\*|//+)\s?')

ROW_ID_RE = re.compile(r'^[A-Z]{1,3}-[0-9]+[a-z]?$')
# ⭐ No backticks in the pattern. The 177 references the docstring names are
# exactly the ones a backticked pattern cannot see.
TOKEN_RE = re.compile(r'(?<![0-9A-Za-z_-])([A-Z]{1,3}-[0-9]{1,4}[a-z]?)(?![0-9A-Za-z_])')

# Prefixes that ALSO number the rows of a document outside docs/spec, so a
# token carrying one cannot be resolved without knowing which document the
# comment meant. See the docstring's PREFIX COLLISIONS paragraph -- this is a
# measured loss, not a tidy-up.
FOREIGN_PREFIXES = {'D', 'PD', 'R'}

# ⭐ specindex indexes `**表 T-nnn —` and row IDs and UIDs, and NOTHING ELSE --
# the eleven figures are defined by their own heading and are invisible to it.
# Measured 2026-09-11: leaving them out made `F-019`, a live figure named by
# FR-029 as the authority for every icon's shape, the single commonest
# "undefined" token in this listing at 73 of 155 hits. ⛔ Adding them is a
# repair of the defined set, not a narrowing of what the tool looks at.
FIGURE_HEAD_RE = re.compile(r'^\*\*図 (F-[0-9]+[a-z]?)\s*—')

# ⛔ A dot that follows a dot or a space is NOT a sentence end. This manuscript
# writes row ranges as `DI-1 .. DI-6` and `IC-53 .. IC-57`, and without the
# lookbehind the range's second dot cut the sentence in half and left a
# fragment starting `DI-6), OP-11 ...` reading as a rule of its own.
SENTENCE_END_RE = re.compile(r'[。．！？]|(?<![.\s])[.!?](?=\s|$)')

DATE_RE = re.compile(r'\b(?:19|20)[0-9]{2}-[0-9]{2}-[0-9]{2}\b')

# Japanese past/perfective immediately before a terminator, a quote close or a
# clause comma -- `〜した。` `〜だった」` `〜ていた、`. Matching a bare `た`
# anywhere would swallow `たとえば` and every noun containing the kana.
JA_PAST_RE = re.compile(
    r'(?:った|いた|えた|した|きた|けた|げた|せた|ねた|べた|めた|れた|'
    r'んだ|いだ|だった|かった|ました|でした|なった|あった)'
    r'(?=[。．、，」』）\)]|\s|$)')

JA_HISTORY_RE = re.compile(
    r'かつて|以前|旧|廃止|廃した|廃され|撤回|やめた|もはや|過去|'
    r'までは|だったが|退役|取り下げ|消えた|無くなった|なくなった')

EN_HISTORY_RE = re.compile(
    r'\b(?:was|were|used\s+to|until|no\s+longer|previously|formerly|'
    r'retired|retirement|withdrawn|withdrew|deprecated|obsolete|'
    r'had\s+been|has\s+been\s+retired|is\s+gone|are\s+gone|went\s+with|'
    r'went\s+on|left\s+table|stays?\s+burnt|as\s+of|the\s+old\b|'
    r'discarded|superseded|removed\s+on|ran\s+to|read\s+.{0,40}\buntil)\b',
    re.IGNORECASE)

JA_ASSERT_RE = re.compile(
    r'である|であり|とする|すること|しなければならない|してはならない|'
    r'に従う|を持つ|がある|はない|ではない|となる|に当たる|とみなす|'
    r'[うくぐすつぬぶむるい](?=[。．])')

EN_ASSERT_RE = re.compile(
    r'\b(?:is|are|has|have|says?|owns?|holds?|gives?|returns?|must|'
    r'always|never|means?|keeps?|draws?|reads?|writes?|makes?|does|'
    r'requires?|carries|lives|sits|belongs|takes?|uses?|shows?|puts?|'
    r'calls?|names?|counts?|the\s+only)\b',
    re.IGNORECASE)


def load_withdrawn():
    """(withdrawn set, which file it came from).

    The pair is still returned so the summary keeps naming its source: a reader
    who distrusts the number has to be able to find the list without reading
    this code."""
    return RETIRED, 'retired.py'


def load_defined():
    sys.path.insert(0, HERE)
    import specindex
    idx = specindex.build(ROOT)
    got = {t for t in (idx.all_rows | idx.uids | idx.all_tables)
           if ROW_ID_RE.match(t)}
    for rel_path, lines in idx.lines.items():
        del rel_path
        for line in lines:
            m = FIGURE_HEAD_RE.match(line)
            if m:
                got.add(m.group(1))
    return got


def source_files():
    for tree in TREES:
        base = os.path.join(ROOT, tree)
        if not os.path.isdir(base):
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
            for name in sorted(filenames):
                if name.endswith(SUFFIXES):
                    yield os.path.join(dirpath, name)


def rel(path):
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


def comment_blocks(lines):
    """Yields [(lineno, stripped_text), ...] for each run of comment lines."""
    block = []
    for i, line in enumerate(lines, 1):
        if COMMENT_RE.match(line):
            block.append((i, MARKER_RE.sub('', line).rstrip()))
            continue
        if block:
            yield block
            block = []
    if block:
        yield block


def sentences_of(block):
    """Yields (lineno, sentence) -- the line the sentence's first character
    sat on, and the sentence with its terminator kept."""
    text_parts = []
    line_at = []
    for lineno, body in block:
        if text_parts:
            text_parts.append(' ')
            line_at.append(lineno)
        text_parts.append(body)
        line_at.extend([lineno] * len(body))
    text = ''.join(text_parts)

    start = 0
    for m in SENTENCE_END_RE.finditer(text):
        end = m.end()
        piece = text[start:end].strip()
        if piece:
            at = start + (len(text[start:end]) - len(text[start:end].lstrip()))
            yield line_at[min(at, len(line_at) - 1)], piece
        start = end
    tail = text[start:].strip()
    if tail:
        at = min(start, len(line_at) - 1) if line_at else 0
        yield (line_at[at] if line_at else block[0][0]), tail


def classify(sentence):
    """'record', 'assertion' or 'unclassified'. Record wins ties."""
    if (DATE_RE.search(sentence) or JA_PAST_RE.search(sentence)
            or JA_HISTORY_RE.search(sentence) or EN_HISTORY_RE.search(sentence)):
        return 'record'
    if JA_ASSERT_RE.search(sentence) or EN_ASSERT_RE.search(sentence):
        return 'assertion'
    return 'unclassified'


def main(argv):
    show_all = '--all' in argv
    started = time.time()

    withdrawn, from_file = load_withdrawn()
    if not withdrawn:
        print('PROBLEM  retired.py holds an empty retirement set, so every '
              'withdrawn ID would read as live')
        return 1
    try:
        defined = load_defined()
    except Exception as exc:                        # noqa: BLE001 -- reported
        print('PROBLEM  the specification index could not be built: %s' % exc)
        return 1
    if not defined:
        print('PROBLEM  docs/spec/ defined no IDs -- nothing to check against')
        return 1

    universe = defined | withdrawn
    prefixes = {t.split('-')[0] for t in universe} - FOREIGN_PREFIXES

    files = 0
    comment_lines = 0
    counts = collections.Counter()
    dropped = collections.Counter()
    hits = []                                       # (rel, lineno, sentence, ids)
    withdrawn_refs = 0
    undefined_refs = 0

    for path in source_files():
        files += 1
        try:
            lines = io.open(path, encoding='utf-8', errors='replace').read().split('\n')
        except OSError:
            continue
        where = rel(path)
        for block in comment_blocks(lines):
            comment_lines += len(block)
            for lineno, sentence in sentences_of(block):
                kind = classify(sentence)
                counts[kind] += 1
                if kind != 'assertion':
                    continue
                bad = []
                for tok in TOKEN_RE.findall(sentence):
                    head = tok.split('-')[0]
                    if head not in prefixes:
                        dropped[head] += 1
                        continue
                    if tok in withdrawn:
                        bad.append((tok, 'withdrawn'))
                    elif tok not in defined:
                        bad.append((tok, 'undefined'))
                if bad:
                    seen = []
                    for item in bad:
                        if item not in seen:
                            seen.append(item)
                    withdrawn_refs += sum(1 for _, w in seen if w == 'withdrawn')
                    undefined_refs += sum(1 for _, w in seen if w == 'undefined')
                    hits.append((where, lineno, sentence, seen))

    hits.sort(key=lambda h: (h[0], h[1]))

    shown = hits if show_all else hits[:40]
    last_file = None
    for where, lineno, sentence, bad in shown:
        if where != last_file:
            print('')
            print('  %s' % where)
            last_file = where
        marks = ', '.join('%s (%s)' % (t, w) for t, w in bad)
        body = sentence if len(sentence) <= 220 else sentence[:217] + '...'
        print('    %s:%d  %s' % (where, lineno, marks))
        print('        %s' % body)
    if not show_all and len(hits) > len(shown):
        print('')
        print('    … and %d more; pass --all to see them' % (len(hits) - len(shown)))

    total = sum(counts.values())
    top = ', '.join('%s-* x%d' % (p, n) for p, n in dropped.most_common(5))
    print('')
    print('SUMMARY  src/+tests/: %d files, %d comment line(s), %d comment '
          'sentence(s) -- %d assertion / %d record / %d unclassified; %d '
          'assertion sentence(s) in %d file(s) name %d withdrawn and %d '
          'undefined ID reference(s). Retirement set: %d ID(s) from %s. '
          '⛔ NOT A GATE -- 19 of a 30-sample were actually stale; always '
          'exits 0.'
          % (files, comment_lines, total, counts['assertion'], counts['record'],
             counts['unclassified'], len(hits), len({h[0] for h in hits}),
             withdrawn_refs, undefined_refs, len(withdrawn), from_file))
    print('NOTE     %d token(s) dropped for a prefix docs/spec never defines '
          '(%s); D-*, PD-* and R-* dropped whole because they number rows in '
          'two documents at once -- see PREFIX COLLISIONS. Wall clock %.1fs.'
          % (sum(dropped.values()), top or 'none', time.time() - started))
    return 0


# ⛔ A Windows console defaults to cp932 and cannot encode the star and stop
# characters this project writes, and the output below is Japanese-heavy.
# Reconfigure the stream rather than asking every caller to remember
# PYTHONIOENCODING.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
