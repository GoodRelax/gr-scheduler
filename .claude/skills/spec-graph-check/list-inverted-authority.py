# -*- coding: utf-8 -*-
"""List a place where the SPECIFICATION takes its authority from `src/`.

⛔⛔ NOT A GATE. Measure its precision before anyone adds it to check.sh.

⭐ WHY. `D-470`: a MUST NOT in `05-07-design.md` reads

    ⛔ 式を写して持たせてはならない（MUST NOT）
       —— `groupDepthThresholdOf` の注が自ら 2 つ目の写しを禁じている。

`groupDepthThresholdOf` appears in `docs/spec` exactly once -- on that line.
The "注" it defers to is a comment in
`src/adapter/input-command-translator/input-command-translator.ts`.

⛔ THE DIRECTION IS BACKWARDS. Section 6-3 of the cleanup prompt settles what
each is: the specification is the original, a comment is a copy, and a comment
is "腐っても誰も気づかない唯一の場所". An original that rests on a copy loses
its reason the day someone tidies the copy.

⚠️ THE NAIVE VERSION IS USELESS, and that is the whole design problem. The
manuscripts name code identifiers constantly and legitimately -- `actualStart`,
`wbsParentUid`, `documentSettings` -- because the ERD defines them. Flagging
"an identifier that also exists in src/" would flag hundreds of honest lines.

⭐ THE TELL IS NOT THE IDENTIFIER. IT IS THE DEFERRAL. What makes D-470 wrong
is that the sentence hands its authority to that identifier: 「…の注が自ら
禁じている」. So a hit needs all three:

  1. a backticked identifier that is NOT a specification id (FR-, T-, S-,
     AT-, U-, a row id) -- those are checked by other tools already;
  2. a deferring verb right after it -- 定めている / 禁じている / 求めている
     / 述べている / が持つ / の注が ... -- the sentence RESTS on it;
  3. and the identifier is defined nowhere else in `docs/spec`: it occurs
     on this line and no other.

⚠️ Point 3 is what keeps it quiet. An identifier the ERD or a settings table
defines occurs many times, so deferring to it is deferring to the manuscripts.

⛔⛔ AND POINT 3, WRITTEN AS "OCCURS ONCE IN TOTAL", EXCLUDED ITS OWN TARGET.
Measured 2026-09-12 against the pre-fix manuscript: the anchor was found, the
identifier behind it was found, and the hit was then thrown away because
`groupDepthThresholdOf` occurs TWICE on that page.

⭐ The two occurrences are not an accident -- THE SHAPE GUARANTEES THEM. A
sentence that defers to a name must first INTRODUCE it and then DEFER to it:

    `groupDepthThresholdOf`（その段を描くのに要る倍率。`FR-018`）
      ...
    ⛔ 式を写して持たせてはならない（MUST NOT）
       —— `groupDepthThresholdOf` の注が自ら 2 つ目の写しを禁じている。

⇒ THE COUNT MUST EXCLUDE THE DEFERRING LINE ITSELF. With that one change the
pre-fix tree yields 3 hits and `D-470` is one of them; before it, 2 and it was
not. ⚠️ 1 true of 3 is 33%, which is below `list-asserted-claims.py`'s 63% --
and that one was kept out of check.sh. ⛔ SO THIS IS NOT GATE MATERIAL, and
the corpus is now empty besides: `3b7fdf6` fixed the only instance.

USAGE
    python .claude/skills/spec-graph-check/list-inverted-authority.py

Exit code is 0 whatever it finds. ⛔ It is a list, not a verdict.
"""
from __future__ import print_function

import glob
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SPEC = os.path.join(ROOT, 'docs', 'spec')
SRC = os.path.join(ROOT, 'src')

# A specification id -- these have their own checks; not our business.
SPEC_ID = re.compile(r'^[A-Z]{1,3}-[0-9]+[a-z]?$')

# A code identifier as the manuscripts write it: camelCase or with a dot.
IDENT = re.compile(r'`([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)*)`')

# The sentence RESTS on what it just named.
DEFERS = re.compile(
    u'が(?:自ら)?(?:定めて|禁じて|求めて|述べて|書いて)いる|'
    u'が(?:定める|禁じる|求める|持つ)|'
    u'の注が|が自ら|に従う|が既に')

NEAR = 60


def manuscripts():
    out = {}
    for p in sorted(glob.glob(os.path.join(SPEC, '**', '*.md'), recursive=True)):
        if os.sep + 'output' + os.sep in p:
            continue
        with io.open(p, encoding='utf-8', errors='replace') as fh:
            out[p] = fh.read().replace('\r\n', '\n')
    return out


def source_files():
    out = []
    for ext in ('ts', 'tsx'):
        out.extend(glob.glob(os.path.join(SRC, '**', '*.' + ext), recursive=True))
    return out


def main():
    books = manuscripts()
    whole = u'\n'.join(books.values())
    src_text = None
    hits = []

    # ⛔ ANCHOR ON THE DEFERRAL, NOT THE IDENTIFIER. Measured on the first
    # run: this document introduces an identifier early in a very long line
    # and defers to it much later in the same line, so "identifier then a
    # verb within N characters" missed D-470, the case the tool exists for.
    # ⭐ It also removes a false positive: 「…は `FR-080` が持つ」 has a spec
    # id as its subject, and looking backward finds that id and skips it.
    for path, text in sorted(books.items()):
        for n, line in enumerate(text.split('\n'), 1):
            for d in DEFERS.finditer(line):
                back = line[max(0, d.start() - NEAR):d.start()]
                subjects = list(IDENT.finditer(back))
                if not subjects:
                    continue
                m = subjects[-1]
                name = m.group(1)
                if SPEC_ID.match(name) or len(name) < 6:
                    continue
                # Defined anywhere else in the manuscripts? Then the sentence
                # is deferring to docs/spec, which is fine.
                # ⛔ OUTSIDE THIS LINE, not in total -- see the docstring. A
                # deferral names its subject twice by construction, so a
                # total count of 1 can never be satisfied by a real hit.
                tick = u'`' + name + u'`'
                if whole.count(tick) - line.count(tick) > 0:
                    continue
                if src_text is None:
                    parts = []
                    for p in source_files():
                        with io.open(p, encoding='utf-8', errors='replace') as fh:
                            parts.append(fh.read())
                    src_text = u'\n'.join(parts)
                if name not in src_text:
                    continue
                hits.append((path, n, name,
                             line[max(0, d.start() - 90):d.end() + 30]))

    out = io.open(sys.stdout.fileno(), 'w', encoding='utf-8', errors='replace')
    out.write(u'%d place(s) where docs/spec rests on something only src/ has\n\n'
              % len(hits))
    for path, n, name, window in hits:
        rel = os.path.relpath(path, ROOT).replace('\\', '/')
        out.write(u'%s:%d\n  defers to: %s\n  context  : %s\n\n'
                  % (rel, n, name, window.strip()))
    out.flush()
    return 0


if __name__ == '__main__':
    sys.exit(main())
