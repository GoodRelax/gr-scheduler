# -*- coding: utf-8 -*-
"""Check 42 -- a comment quoting a sentence the manuscripts do not contain.

⛔ WHY THIS EXISTS (`D-339`). A comment in `src/` quoted 「`HF-17`（段 0 へ
足す）には親が無いので当たらない」 as though it were a row of 表 T-051, and
built on it: the code did not unfold 段 0 because "the specification says the
rule does not apply here". ⚠️ NO SUCH SENTENCE IS IN `docs/spec`. It was a
paraphrase that had travelled out of the ledger and hardened into a citation,
and it kept `D-318` open -- a row a person could add and never see.

⭐⭐ THE RULE THIS ENFORCES IS ALREADY WRITTEN, and only as a principle:
「原稿を写すな、指させ」. A rule nothing measures is a rule that decays (the
reliability ladder). This is the measurement.

WHAT COUNTS AS A HIT. A 「…」 or 『…』 quotation, inside a comment of `src/` or
`tests/`, long enough to be a sentence rather than a name, whose text is not
found in any manuscript under `docs/spec/`.

⛔⛔ THE FALSE POSITIVES ARE THE WHOLE JOB, and a naive sweep is unusable --
`D-339` records one being written and thrown away. Four shapes defeat it, and
each is answered here:

  1. THE COMMENT WRAPS. A quotation crosses three `//` lines, so no single
     line holds it. ⇒ Contiguous comment lines are JOINED before quotations
     are looked for, with the leader (`//`, `*`, `/**`) removed.
  2. THE QUOTER ELIDES. 「`HF-17` は `HF-14` を ... 段 0 に対して行う」 cuts
     the middle out with … or ... or ~~. ⇒ A quotation is split on its
     elisions and each part must appear IN ORDER inside ONE manuscript.
  3. THE MARKS DIFFER. The manuscript writes `**bold**`, an ideographic
     space, a full-width bracket; the comment writes the same sentence with
     the emphasis dropped and the spaces squeezed. ⇒ Both sides are put
     through the same normalization -- emphasis, backticks, every kind of
     space, and the decorative marks ⭐⚠️⛔ removed.
  4. THE HAYSTACK IS SEVERAL FILES. Searching a concatenation of the
     manuscripts lets a quotation match across a seam that does not exist.
     ⇒ Each manuscript is searched on its own.

⭐ AND ONE MORE, WHICH IS WHY THE FLOOR IS NOT ZERO: a comment may quote
something that is NOT the specification -- the user's own words, a rule file,
a defect row, an error message the code itself prints. Those are honest and
they are not in `docs/spec`. So this check is held against a baseline the way
checks 29, 31 and 40 are: what it forbids is the number GROWING.

    python .claude/skills/spec-graph-check/check-quoted-source.py [--list]

Run with PYTHONIOENCODING=utf-8. `--list` prints every hit instead of the
first few, which is how the baseline is inspected.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SPEC = os.path.join(ROOT, 'docs', 'spec')
CHANGELOG = os.path.join(ROOT, 'docs', 'development-records', 'changelog.md')
BASELINE = os.path.join(HERE, 'quoted-source-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/quoted-source-baseline.txt'

TREES = ('src', 'tests')

# ⭐ A quotation shorter than this is a NAME, not a sentence -- 「未定」,
# 「行 ID」, 「置く」. Measured 2026-09-06: the count is flat either side of
# 10, and every hit under it was a single word.
SENTENCE = 10

QUOTED = re.compile(u'[「『]([^「」『』]{%d,})[」』]' % SENTENCE)
ELISION = re.compile(u'(?:…+|\\.{3}|〜+|~~+)')

# The decorations both sides carry, and the emphasis only one of them does.
NOISE = re.compile(u'[*`⭐⚠⛔️　\\s]+')

# ⭐ A quotation with no CJK in it is not a quotation of these manuscripts:
# they are written in Japanese, and an English sentence in 「」 is the code
# quoting ITSELF or an English rule.
CJK = re.compile(u'[぀-ヿ一-鿿]')

# ⛔ AND THE OTHER BOOKS. A comment block that names the ledger, a pending
# decision, a change request, the rule files or the user's own words is
# quoting one of THOSE, and none of them lives under docs/spec. Quoting them
# is correct, and faulting it would teach people to stop citing their sources.
#
# ⭐ How far back a citation reaches. A quotation is attributed by what stands
# just before it -- 「表 T-051 の `HF-17` は「…」と定める」 -- not by a heading
# ten sentences up.
ATTRIBUTION = 120

OTHER_BOOKS = re.compile(
    u'D-\\d+|PD-\\d+|CR-\\d+|規則 \\d|利用者の|defects\\.md|'
    u'development-rules|development-records|pending-decisions')


def flatten(text):
    """One text with the marks that differ between the two sides removed."""
    return NOISE.sub(u'', text)


def comment_blocks(source):
    """Contiguous runs of comment lines, joined into one string each.

    ⛔ Joined WITHOUT a separator: a quotation broken across two `//` lines is
    broken mid-sentence, and the manuscript has nothing there.
    """
    blocks = []
    current = []
    for line in source.split('\n'):
        stripped = line.strip()
        body = None
        if stripped.startswith('//'):
            body = stripped[2:]
        elif stripped.startswith('*/'):
            body = stripped[2:]
        elif stripped.startswith('/**'):
            body = stripped[3:]
        elif stripped.startswith('/*'):
            body = stripped[2:]
        elif stripped.startswith('*'):
            body = stripped[1:]
        if body is None:
            if current:
                blocks.append(u''.join(current))
                current = []
            continue
        current.append(body.strip())
    if current:
        blocks.append(u''.join(current))
    return blocks


def manuscripts():
    """Every manuscript under docs/spec, flattened, one string each.

    ⭐⭐ AND THE CHANGELOG, WHICH IS NO LONGER UNDER docs/spec. Cleanup P2-1
    (2026-09-11, ruling 5) moved the A.3 Changelog section of A-appendix.md to
    docs/development-records/changelog.md unchanged -- 183,208 characters, a
    record rather than a requirement. Measured the same day: 50 quotations in
    `src/` and `tests/` have their source in those rows and nowhere else, so
    dropping the file from this haystack would have taken the count from 469 to
    519 and called fifty honest citations fabricated. The sentence a comment
    quotes is the same sentence it was; only its address changed.
    """
    found = []
    for base, _dirs, names in os.walk(SPEC):
        for name in sorted(names):
            if not name.endswith('.md'):
                continue
            path = os.path.join(base, name)
            try:
                text = io.open(path, encoding='utf-8', errors='replace').read()
            except OSError:
                continue
            found.append((os.path.relpath(path, ROOT).replace('\\', '/'),
                          flatten(text)))
    try:
        moved = io.open(CHANGELOG, encoding='utf-8', errors='replace').read()
    except OSError:
        moved = None
    if moved is not None:
        found.append((os.path.relpath(CHANGELOG, ROOT).replace('\\', '/'),
                      flatten(moved)))
    return found


def somewhere_in(parts, haystacks):
    """True when one haystack holds every part, in order."""
    for _name, hay in haystacks:
        at = 0
        ok = True
        for part in parts:
            found = hay.find(part, at)
            if found < 0:
                ok = False
                break
            at = found + len(part)
        if ok:
            return True
    return False


def sources():
    for tree in TREES:
        root = os.path.join(ROOT, tree)
        for base, dirs, names in os.walk(root):
            dirs[:] = [d for d in dirs if d != 'node_modules']
            for name in sorted(names):
                if name.endswith('.ts') or name.endswith('.mjs'):
                    yield os.path.join(base, name)


def say(message):
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def find_unsourced():
    hay = manuscripts()
    hits = []
    for path in sources():
        try:
            text = io.open(path, encoding='utf-8', errors='replace').read()
        except OSError:
            continue
        rel = os.path.relpath(path, ROOT).replace('\\', '/')
        for block in comment_blocks(text):
            for found in QUOTED.finditer(block):
                quote = found.group(1)
                if CJK.search(quote) is None:
                    continue
                # ⛔ THE OTHER BOOKS ARE LOOKED FOR IN A WINDOW, NOT IN THE
                # WHOLE BLOCK. Rehearsed 2026-09-06: a fabricated citation
                # planted at the top of a test file went UNCAUGHT, because
                # that file's header names a `D-` row somewhere far above and
                # a block-wide test then exempted every quotation under it.
                # A block here is a whole doc comment, which is long.
                before = block[max(0, found.start() - ATTRIBUTION):found.start()]
                if OTHER_BOOKS.search(before):
                    continue
                parts = [flatten(p) for p in ELISION.split(quote)]
                parts = [p for p in parts if len(p) >= SENTENCE]
                if not parts:
                    continue
                if not somewhere_in(parts, hay):
                    hits.append((rel, quote))
    return hits


def read_baseline():
    if not os.path.exists(BASELINE):
        return None
    try:
        with io.open(BASELINE, encoding='utf-8') as handle:
            return int(handle.readline().strip())
    except (OSError, ValueError):
        return None


def main():
    listing = '--list' in sys.argv[1:]
    hits = find_unsourced()
    count = len(hits)
    held = read_baseline()

    if listing:
        for rel, quote in hits:
            say(u'%s\n    %s' % (rel, quote))
        say(u'-- %d quotation(s) with no source in docs/spec' % count)
        return 0

    if held is None:
        say('PROBLEM  %s has not been written yet' % REL_BASELINE)
        return 1

    if count > held:
        shown = u' | '.join(u'%s: %s' % (rel, quote[:60])
                            for rel, quote in hits[:5])
        say('FAIL     comments quoting a sentence docs/spec does not contain '
            'went %d -> %d. ⛔ A comment may POINT at a row (表 T-051 の '
            '`HF-17`) but may not put words in the specification\'s mouth: a '
            'paraphrase quoted as a citation is what kept D-318 open. Fix the '
            'quotation, or raise %s deliberately and say why in the commit.'
            % (held, count, REL_BASELINE))
        say('         %s' % shown)
        return 1

    if count < held:
        say('OK       %d quotation(s) with no source in docs/spec (was %d) '
            '-- ⭐ lower the baseline in %s to hold the ground'
            % (count, held, REL_BASELINE))
        return 0

    say('OK       %d quotation(s) with no source in docs/spec, which is the '
        'baseline' % count)
    return 0


if __name__ == '__main__':
    sys.exit(main())
