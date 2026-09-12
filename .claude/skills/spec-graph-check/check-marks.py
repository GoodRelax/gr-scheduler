# -*- coding: utf-8 -*-
"""check 47 -- the marks are used once, and bold marks a phrase.

THE MARKS

    docs/development-rules/03-implementation.md gives three, and one meaning
    each:

        ⛔  禁止・欠落・本物の欠陥
        ⚠️  注意・過去に踏んだ罠
        ⭐  要点

    ⛔ A DOUBLED MARK IS NOT IN THAT RULE. `⛔⛔` was written 135 times and
    `⭐⭐` 151 times before 2026-09-12, and neither ever meant anything the
    single mark does not -- there is no rule that says what the second one
    adds, so a reader cannot tell. One mark, once.

    Two more marks are used and are NOT in the rule above. Both are left
    alone here because each is defined where it is used, which is the test
    this check applies: `🔎` is defined by tbl-settings.md itself (「🔎 を
    付けた既定値は、由来が記録されていない」), and `⇒` / `→` read as ordinary
    punctuation. Nothing here faults a mark that carries its own definition.

BOLD

    ⛔ THERE IS NO WRITTEN RULE FOR BOLD, and that is how 46.9% of
    01-04-requirements.md came to be inside a `**…**` run. Emphasis that
    covers half a page marks nothing.

    The rule this check holds is the narrow one: A BOLD RUN MAY NOT SWALLOW A
    SENTENCE END. Bold marks a phrase inside a sentence, or a label such as
    「表 T-206 — 保存しないもの」; a run that carries 「A。B」 is not emphasis, it
    is a paragraph wearing asterisks.

    A character count was tried first and rejected by measurement: it faulted
    long table captions, which are one phrase however long they run.

WHAT IT CANNOT SEE

    Whether the thing marked deserves the mark. A ⛔ on a preference and a ⭐
    on a triviality both pass.

USAGE

    python .claude/skills/spec-graph-check/check-marks.py
    python .claude/skills/spec-graph-check/check-marks.py --list
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

BOOKS = [
    'docs/spec/01-04-requirements.md',
    'docs/spec/05-07-design.md',
    'docs/spec/08-10-test.md',
    'docs/spec/A-appendix.md',
    'docs/spec/_assets/tbl-settings.md',
    'docs/spec/_assets/tbl-glossary.md',
    'docs/spec/_assets/tbl-property-items.md',
    'docs/spec/_assets/fig-erd-detail.md',
    'docs/spec/_assets/fig-erd-overview.md',
]

STOP = u'⛔'
STAR = u'⭐'
WARN = u'⚠'
VS = u'️'
FULL_STOP = u'。'

DOUBLED = [
    re.compile(u'%s\\s*%s' % (STOP, STOP)),
    re.compile(u'%s\\s*%s' % (STAR, STAR)),
    re.compile(u'%s%s?\\s*%s%s?' % (WARN, VS, WARN, VS)),
]
MARK = re.compile(r'\*\*')
BREAK = re.compile(r'<br\s*/?>', re.I)


def say(message):
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def bold_runs(text):
    """(start, end, run) for each `**…**` the renderer would pair."""
    out, depth, last = [], 0, None
    for m in MARK.finditer(text):
        a, b = m.start(), m.end()
        prev = text[a - 1] if a else u' '
        nxt = text[b] if b < len(text) else u' '
        if depth:
            if not prev.isspace():
                depth = 0
                out.append((last, a, text[last:a]))
        elif not nxt.isspace() and nxt != u'*':
            depth, last = 1, b
    return out


def swallows_a_sentence(run):
    """True when the run carries a full stop that more of the run follows."""
    body = BREAK.sub(u'', run).replace(u'\n', u'')
    at = body.find(FULL_STOP)
    return at >= 0 and bool(body[at + 1:].strip())


def scan():
    doubles, swallowed = [], []
    for rel in BOOKS:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        text = io.open(path, encoding='utf-8').read()
        for n, line in enumerate(text.split('\n'), 1):
            for pattern in DOUBLED:
                for m in pattern.finditer(line):
                    doubles.append((rel, n, line[max(0, m.start() - 20):m.end() + 20]))
        for _a, _b, run in bold_runs(text):
            if swallows_a_sentence(run):
                swallowed.append((rel, run))
    return doubles, swallowed


def main():
    doubles, swallowed = scan()
    if '--list' in sys.argv:
        for rel, n, around in doubles:
            say(u'%s:%d  doubled  %s' % (rel.split('/')[-1], n, around))
        for rel, run in swallowed:
            say(u'%s  bold over a sentence end  %s'
                % (rel.split('/')[-1], BREAK.sub(u'', run)[:70]))

    if doubles or swallowed:
        if doubles:
            say(u'FAIL     %d doubled mark(s). One mark, once -- '
                u'docs/development-rules/03-implementation.md gives ⛔ / ⚠️ / ⭐ '
                u'one meaning each and says nothing about a second one.' % len(doubles))
        if swallowed:
            say(u'FAIL     %d bold run(s) swallow a sentence end. Bold marks a '
                u'phrase inside a sentence, not a passage: a run carrying 「A。B」 '
                u'is a paragraph wearing asterisks.' % len(swallowed))
        say(u'         Run with --list to see them.')
        return 1

    say(u'OK       no doubled mark, and no bold run swallows a sentence end')
    return 0


if __name__ == '__main__':
    sys.exit(main())
