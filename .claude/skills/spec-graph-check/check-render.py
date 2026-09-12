# -*- coding: utf-8 -*-
"""check 49 -- what actually reached the published HTML.

WHY IT NEEDS A GATE

    Every other numbered check in check.sh reads the manuscript, or the JSON
    StrictDoc exports from it. None of them opens the page a reader sees, so
    a bold run the renderer refused, or a table caption docutils swallowed,
    is green everywhere and wrong on the page. This is the only check that
    reads the render.

    It could not go red until 2026-09-12. It printed `RESULT: FAIL` and
    returned 0, so check.sh and npm would both have read it as a pass -- and
    neither called it at all. That is the defect this file's own report in
    docs/development-rules/09-tools.md row 1 named.

WHAT IT FAULTS

    - a bold span emitted as literal asterisks, i.e. `**...**` surviving into
      the HTML outside a <code> span
    - a table or figure caption the manuscript writes as `**表 T-nnn —` or
      `**図 F-nnn —` that does not appear in that document's HTML

WHERE IT READS

    An HTML tree somebody else exported, by default scratch/spec-html-probe,
    the path docs/development-rules/04-verification.md section 4 names. A
    different root may be passed as the one argument. ⚠️ Nothing here writes
    that tree, so it has to be exported first:

        strictdoc export docs/spec --formats=html --output-dir scratch/spec-html-probe

WHAT IT CANNOT SEE

    Captions and bold. That is the whole of it. Every other way a render can
    go wrong -- a table that lost its columns, a list that came out as one
    paragraph, a heading at the wrong level, a link that resolves to nothing,
    an image that did not arrive -- passes here untouched.

    ⛔ The caption comparison covers 01-04-requirements and 05-07-design ONLY.
    08-10-test and A-appendix are read for literal asterisks and nothing else,
    because the two loops below run over different lists. A caption dropped
    from either of those two documents is invisible to this file.

    ⛔ The _assets tables -- tbl-settings.md, tbl-glossary.md,
    tbl-property-items.md -- are not read at all, in either loop.

    A caption written any other way than `**表 T-nnn —` / `**図 F-nnn —`, with
    that exact em dash, is not looked for. It is neither counted nor missed.

    A literal run is only found when it is 1 to 80 characters long and holds
    no `*` and no newline. A longer run, or one the renderer split over two
    lines, is not counted. And `<code>` spans are removed before the count, so
    asterisks a code span legitimately shows are never faulted.

    Whether the caption is the RIGHT text, whether the table it names is the
    table underneath it, whether the bold falls on the phrase the author
    meant: none of that is here. It compares strings for presence.

    That the export is CURRENT. It reads whatever is on disk. An export from
    last week passes for last week's manuscript, and nothing here notices.
    check.sh re-exports immediately before calling this; a hand run must.

    The `<table>` count it prints is printed only. Nothing faults it, so a
    document that lost every table still passes as long as no caption from
    the two compared documents went with them.

NOTE ON NON-ASCII: the caption patterns hold Japanese characters because the
specification is written in Japanese; those code points are data.

USAGE

    python .claude/skills/spec-graph-check/check-render.py
    python .claude/skills/spec-graph-check/check-render.py scratch/some-other-export
    Run with PYTHONIOENCODING=utf-8 -- a cp932 console mangles the captions.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

DEFAULT_EXPORT = 'scratch/spec-html-probe'

# Both loops below; the literal-asterisk count reads all four.
DOCS = ['01-04-requirements', '05-07-design', '08-10-test', 'A-appendix']
# ⛔ Only these two have their captions compared. See WHAT IT CANNOT SEE.
CAPTIONED = ['01-04-requirements', '05-07-design']

LITERAL = re.compile(r'\*\*[^*\n]{1,80}\*\*')
CODE_SPAN = re.compile(r'<code>.*?</code>', re.S)
TABLE_CAP = re.compile(u'\\*\\*表 (T-[0-9a-z]+) —')
FIGURE_CAP = re.compile(u'\\*\\*図 (F-[0-9a-z]+) —')


def say(message):
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def read(path):
    return io.open(path, encoding='utf-8').read()


def main(argv):
    export = argv[1] if len(argv) > 1 else DEFAULT_EXPORT
    html_dir = os.path.join(ROOT, export, 'html', 'spec')

    # ⛔ Never green on a missing export. The old file let open() raise, which
    # read as a crash rather than as a verdict; a caller that swallowed the
    # traceback learned nothing.
    absent = [n for n in DOCS
              if not os.path.exists(os.path.join(html_dir, n + '.html'))]
    if absent:
        say(u'PROBLEM  no published HTML to read at %s/html/spec' % export)
        say(u'         missing: %s' % ', '.join(n + '.html' for n in absent))
        say(u'         Export it first, then run this again:')
        say(u'           strictdoc export docs/spec --formats=html '
            u'--output-dir %s' % export)
        return 1

    total_literal = 0
    total_missing = 0

    for name in DOCS:
        page = read(os.path.join(html_dir, name + '.html'))
        literal = LITERAL.findall(CODE_SPAN.sub('', page))
        total_literal += len(literal)
        say(u'%-22s literal ** = %-3d  <table> = %d'
            % (name, len(literal), page.count('<table>')))
        for span in literal:
            say(u'      ' + span[:74])

    for name in CAPTIONED:
        src = read(os.path.join(ROOT, 'docs', 'spec', name + '.md'))
        page = read(os.path.join(html_dir, name + '.html'))
        caps = TABLE_CAP.findall(src)
        missing = [c for c in caps if (u'表 %s —' % c) not in page]
        figs = FIGURE_CAP.findall(src)
        fmiss = [f for f in figs if (u'図 %s —' % f) not in page]
        total_missing += len(missing) + len(fmiss)
        say(u'%-22s tables %d/%d  figures %d/%d  missing=%s%s'
            % (name, len(caps) - len(missing), len(caps),
               len(figs) - len(fmiss), len(figs), missing, fmiss))

    say(u'')
    if total_literal or total_missing:
        say(u'RESULT: FAIL  %d literal ** in the render, %d caption(s) that '
            u'never arrived' % (total_literal, total_missing))
        say(u'         ⛔ The manuscript reads correctly and the page does not.'
            u' Fix the manuscript, re-export, and run this again.')
        return 1

    say(u'RESULT: PASS  no literal ** in the render, every caption of %s '
        u'arrived' % ' and '.join(CAPTIONED))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
