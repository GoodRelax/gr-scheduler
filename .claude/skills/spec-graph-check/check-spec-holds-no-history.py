# -*- coding: utf-8 -*-
"""Check 54 -- the specification holds its reasons, not its history.

⛔ WHY THIS EXISTS. CR-375 removed from docs/spec every
attribution ("the user's ruling of <date>"), every dated quote and every
"until <date> this said ..." paragraph.
An overturned sentence left in the specification was read as a live rule more
than once, and an attribution adds nothing to whether a rule is right. The
reason a rule was chosen stays, as a sentence in its RATIONALE or its table's
closing; the ruling itself lives in docs/development-records/rulings.md.

WHAT IT COUNTS, over every file under docs/spec except output/ and
__pycache__/ (generated files included -- they are printed from a manuscript,
so a hit there names the manuscript to fix):

  * an ATTRIBUTION WITH A DATE: 利用者の裁定 / 指示 / 指摘 / 申し立て followed,
    within four characters, by YYYY-MM-DD;
  * an OVERTURNED-HISTORY MARKER: YYYY-MM-DD followed by まで.

⭐ The number must be 0. There is no baseline and no exclusion list: the
cleaning reached 0 before this check was wired in.

⚠️ WHAT IT DOES NOT SEE. The undated noun is allowed on purpose -- 「図形の決定は
利用者の裁定である」 states who decides, which is a live rule. A quote without
a date, and history written without まで (「以前は…と定めていた」), pass too;
spec-writing-rules.md carries that rule, and this check gates only the two
shapes that measured as unambiguous.

Usage:
    python check-spec-holds-no-history.py [repo-root]
"""
import io
import os
import re
import sys

SPEC = os.path.join('docs', 'spec')
SKIP_DIRS = {'output', '__pycache__'}
SUFFIXES = ('.md', '.json', '.py')

PATTERNS = [
    (u'attribution with a date',
     re.compile(u'利用者の(?:裁定|指示|指摘|申し立て)[^\\n。]{0,4}\\d{4}-\\d{2}-\\d{2}')),
    (u'overturned-history marker',
     re.compile(u'\\d{4}-\\d{2}-\\d{2}\\s*まで')),
]


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def main(argv):
    root = argv[1] if len(argv) > 1 else '.'
    base_dir = os.path.join(root, SPEC)
    hits = []
    scanned = 0
    for base, dirs, names in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in sorted(names):
            if not name.endswith(SUFFIXES):
                continue
            path = os.path.join(base, name)
            try:
                text = io.open(path, 'rb').read().decode('utf-8')
            except (IOError, OSError, UnicodeDecodeError):
                continue
            scanned += 1
            rel = os.path.relpath(path, root).replace(os.sep, '/')
            for number, line in enumerate(text.split('\n'), 1):
                for kind, pattern in PATTERNS:
                    for match in pattern.finditer(line):
                        hits.append((rel, number, kind, match.group(0)))

    if hits:
        say(u'FAIL     docs/spec holds history again: %d site(s) in %d file(s). '
            u'⛔ Write the rule and its reason, not who ruled or when, and not '
            u'what the text said before (CR-375; spec-writing-rules.md).'
            % (len(hits), len(set(h[0] for h in hits))))
        for rel, number, kind, text in hits[:40]:
            say(u'         %s:%d  %s  「%s」' % (rel, number, kind, text))
        if len(hits) > 40:
            say(u'         ... and %d more' % (len(hits) - 40))
        say(u'         ⭐ A generated file names its manuscript in its first '
            u'lines -- fix it there and run `npm run gen`.')
        return 1

    say(u'OK       docs/spec holds no dated attribution and no "until <date>" '
        u'history: %d file(s) scanned, 0 site(s).' % scanned)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
