# -*- coding: utf-8 -*-
"""Check 21: every generated artifact says where it came from.

A generated file that does not name its manuscript gets edited by hand. The
edit then survives until the next `npm run gen` throws it away, and nothing in
between says a word -- so the person who made it learns nothing and does it
again. Worse, tbl-settings.md used to OPEN with "本書が設定値の正である",
which was true until CR-175 made it a generated artifact and false afterwards.

So each artifact must carry three things near its top:

  1. that it is generated and must not be edited by hand
  2. the manuscript it is generated FROM, by path
  3. how to rebuild it

⚠️ Add a row here when you add a generated artifact. The list is the point:
a new generator that forgets the banner is exactly what this catches.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))

# artifact -> the manuscript path its banner has to name.
ARTIFACTS = [
    ('docs/spec/_assets/tbl-settings.md', 'settings.json'),
    ('docs/spec/_assets/fig-erd-detail.md', 'erd.json'),
    ('docs/spec/_assets/fig-erd-overview.md', 'erd.json'),
    ('docs/spec/_assets/grs-document.schema.json', 'erd.json'),
    ('docs/review/components/components.md', 'components.json'),
    ('src/entity/document-model/schedule/schedule.ts', 'erd.json'),
    ('src/entity/document-model/document-stamp/document-stamp.ts', 'erd.json'),
    ('src/entity/document-model/document-settings/document-settings.ts',
     'settings.json'),
]

# How far into the file the banner may sit. Long enough for a StrictDoc header
# (title, UID, Version) or a JSON Schema's $schema and $id, and no longer.
HEAD_CHARS = 1400

GENERATED = ('生成物', 'generated', 'Generated')
NO_HAND = ('手で直さない', 'do not edit by hand', 'Do not edit by hand',
           'Never edit by hand')
REBUILD = ('npm run gen', 'build.py')


def main():
    problems = []
    for rel, manuscript in ARTIFACTS:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            problems.append('%s is missing' % rel)
            continue
        head = io.open(path, encoding='utf-8').read(HEAD_CHARS)
        if not any(w in head for w in GENERATED):
            problems.append('%s does not say it is generated' % rel)
        if not any(w in head for w in NO_HAND):
            problems.append('%s does not say not to edit it by hand' % rel)
        if manuscript not in head:
            problems.append('%s does not name its manuscript (%s)'
                            % (rel, manuscript))
        if not any(w in head for w in REBUILD):
            problems.append('%s does not say how to rebuild it' % rel)

    for p in problems:
        sys.stdout.write('  %s\n' % p)
    if problems:
        sys.stdout.write('FAIL     %d generated artifact(s) cannot be traced '
                         'back to a manuscript\n' % len(problems))
        return 1
    sys.stdout.write('OK       all %d generated artifacts name their '
                     'manuscript and how to rebuild\n' % len(ARTIFACTS))
    return 0


if __name__ == '__main__':
    sys.exit(main())
