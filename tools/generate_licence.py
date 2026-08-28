# -*- coding: utf-8 -*-
"""Carry the licence, the copyright notice and the attributions into src/.

    python tools/generate_licence.py
    python tools/generate_licence.py --check

FR-069 (MUST) has the deliverable carry its own licence in full, its copyright
notice, and the attribution of every third-party library, and has the help be
where they are read. Its RATIONALE says why a link will not do: the product is
one file that runs with no network, so a reader who cannot fetch anything can
only read what is inside.

THE TEXT IS THE REPOSITORY'S OWN FILES AND IS NEVER RETYPED. LICENSE and
NOTICE are what the project is licensed by; a second copy in src/ would be a
licence that could drift from the one that governs, which is the one defect
this file exists to make impossible.

THE ATTRIBUTIONS ARE EMPTY, AND THAT IS MEASURED RATHER THAN ASSUMED. The
deliverable bundles no third-party runtime code -- package.json declares no
`dependencies` at all, and only the build tools are devDependencies, which do
not reach dist/index.html. This script FAILS if a runtime dependency is ever
added, because at that moment the empty list stops being true and FR-069 (MUST)
starts asking for a name that nobody has written.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LICENCE = os.path.join(ROOT, 'LICENSE')
NOTICE = os.path.join(ROOT, 'NOTICE')
PACKAGE = os.path.join(ROOT, 'package.json')
OUT = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer', 'licence.json')
REL_OUT = 'src/adapter/screen-renderer/licence.json'
REL_SELF = 'tools/generate_licence.py'

COPYRIGHT_MARK = 'Copyright'

BANNER = (
    'GENERATED from LICENSE and NOTICE by %s -- do not edit by hand. '
    'Rebuild: npm run gen  |  npm run gen:check fails on drift. '
    'FR-069 requires the full text inside the deliverable, so this is the '
    'licence that governs and not a copy of it.' % REL_SELF
)


def say(message):
    """The cp932 guard every generator in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def copyright_notice():
    """The one line of NOTICE that states the copyright.

    Read rather than typed, and looked for by the word `Copyright` so that the
    line may be reworded without this script having to be told.
    """
    for line in io.open(NOTICE, encoding='utf-8'):
        if COPYRIGHT_MARK in line:
            return line.strip()
    sys.exit('NOTICE holds no line with %r, so FR-069 has no copyright notice '
             'to show' % COPYRIGHT_MARK)


def attributions():
    """One line per third-party library the deliverable bundles.

    Empty while nothing is bundled, which package.json is asked rather than
    assumed. devDependencies are not read: they build the file and are not in
    it, which is the whole reason the list can be empty at all.
    """
    package = json.load(io.open(PACKAGE, encoding='utf-8'))
    runtime = package.get('dependencies') or {}
    if runtime:
        sys.exit('package.json now declares %d runtime dependency(ies) (%s), '
                 'and FR-069 (MUST) asks for an attribution of each. This '
                 'script has no text for them: add it here deliberately '
                 'rather than shipping a list that says none exists.'
                 % (len(runtime), ', '.join(sorted(runtime))))
    return []


def build():
    """The three FR-069 members, as they are written out.

    @purity semi-pure-b
    """
    return {
        '$comment': BANNER,
        'licenceText': io.open(LICENCE, encoding='utf-8').read(),
        'copyrightNotice': copyright_notice(),
        'attributions': attributions(),
    }


def main():
    """Write them, or say whether the ones on disk still match.

    @purity non-pure
    """
    built = build()
    body = json.dumps(built, ensure_ascii=False, indent=1) + '\n'
    lines = built['licenceText'].count('\n')
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % REL_OUT)
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body:
            say('PROBLEM  %s has drifted from LICENSE or NOTICE -- run '
                '`python %s`' % (REL_OUT, REL_SELF))
            return 1
        say('OK       the licence matches LICENSE and NOTICE (%d lines, %d '
            'attribution(s))' % (lines, len(built['attributions'])))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    say('wrote %s (%d licence lines, %d attribution(s))'
        % (REL_OUT, lines, len(built['attributions'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
