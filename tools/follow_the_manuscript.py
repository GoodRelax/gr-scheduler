# -*- coding: utf-8 -*-
"""Make a test's quotation follow the manuscript it quotes.

A spec-driven test holds the manuscript's words verbatim. When the manuscript
moves -- a line break, a mark collapsed, a bold run dropped -- the quotation
stops matching and the test goes red, and the temptation is to edit the words
until it passes. ⛔ THAT IS BACKWARDS. The manuscript is the source; the
quotation follows it.

WHAT IT DOES

    For each string literal that holds Japanese and is no longer found in any
    specification document, it looks the passage up by the literal's own text
    with the `**` removed, and -- when exactly one passage matches -- writes
    the passage back EXACTLY AS THE MANUSCRIPT NOW HAS IT.

    ⭐ Read back, never re-typed. A human editing 61 quotations by hand is how
    a quotation quietly stops being a quotation.

HOW IT READS THE MANUSCRIPT

    The way tests/contract/spec-table.ts does: `<br>` removed and hard breaks
    joined, because a break stands where the text had NO character (check 46).

WHAT IT WILL NOT TOUCH

    A literal that is still found; one whose text matches two passages or
    none; one whose replacement would carry the quote character, a newline or
    a backslash. Those are left red on purpose -- they need a person.

    ⚠️ A literal inside a file whose earlier backticks confuse the scanner is
    also skipped. Run `npx vitest run` after this: what is still red is what
    this could not do.

NOTE ON NON-ASCII: the patterns hold Japanese characters because the
specification is written in Japanese; those code points are data.

USAGE

    python tools/follow_the_manuscript.py tests/unit/some.test.ts ...
    python tools/follow_the_manuscript.py --all
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

BOOKS = [
    'docs/spec/01-04-requirements.md',
    'docs/spec/05-07-design.md',
    'docs/spec/08-10-test.md',
    'docs/spec/A-appendix.md',
    'docs/spec/_assets/tbl-settings.md',
    'docs/spec/_assets/tbl-glossary.md',
    'docs/spec/_assets/tbl-property-items.md',
    'docs/spec/_assets/fig-erd-detail.md',
]
# ⛔ tests/ ONLY. A comment under src/ may quote the manuscript too, but
# check 42 flattens emphasis away before comparing, so a comment that lost a
# `**` still matches -- and putting markdown back INTO a comment is noise.
TREES = ('tests',)

NL = chr(10)
BREAK = re.compile(u'<br[ ]*/?>', re.I)
HARD = re.compile(u'  ' + NL + u'(?:[ ]*>[ ]?)?')
CJK = re.compile(u'[ぁ-鿿]')
LITERAL = re.compile(r"'[^'\n]*'|\"[^\"\n]*\"|`[^`]*`")


def manuscripts():
    out = []
    for rel in BOOKS:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        text = HARD.sub(u'', BREAK.sub(u'', io.open(path, encoding='utf-8').read()))
        keep = [i for i, c in enumerate(text) if c != u'*']
        out.append((text, u''.join(text[i] for i in keep), keep))
    return out


BOOK = manuscripts()


def held(body):
    return any(body in text for text, _flat, _keep in BOOK)


def as_it_stands(body):
    """The passage this quotation names, exactly as the manuscript has it."""
    plain = body.replace(u'**', u'')
    if len(plain) < 8:
        return None
    for text, flat, keep in BOOK:
        at = flat.find(plain)
        if at < 0 or flat.find(plain, at + 1) >= 0:
            continue
        return text[keep[at]:keep[at + len(plain) - 1] + 1]
    return None


def follow(path):
    source = io.open(path, encoding='utf-8', newline='').read()
    count = [0]

    def one(match):
        whole = match.group(0)
        quote, body = whole[0], whole[1:-1]
        if not CJK.search(body) or held(body):
            return whole
        fresh = as_it_stands(body)
        if fresh is None or fresh == body:
            return whole
        if quote in fresh or NL in fresh or chr(92) in fresh:
            return whole
        count[0] += 1
        return quote + fresh + quote

    out = LITERAL.sub(one, source)
    if count[0]:
        io.open(path, 'w', encoding='utf-8', newline='').write(out)
    return count[0]


def every_file():
    for tree in TREES:
        for base, dirs, names in os.walk(os.path.join(ROOT, tree)):
            dirs[:] = [d for d in dirs if d != 'node_modules']
            for name in sorted(names):
                if name.endswith(('.ts', '.tsx')):
                    yield os.path.join(base, name)


def main(argv):
    paths = []
    for arg in argv:
        if arg == '--all':
            paths += list(every_file())
        elif not arg.startswith('--'):
            paths.append(arg)
    if not paths:
        sys.stdout.write(__doc__.split('USAGE')[-1].strip() + NL)
        return 2
    total = 0
    for path in paths:
        moved = follow(path)
        if moved:
            total += moved
            print('%-58s followed %d' % (os.path.basename(path), moved))
    print('%d quotation(s) now read as the manuscript reads. '
          u'⛔ Now run: npx vitest run' % total)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
