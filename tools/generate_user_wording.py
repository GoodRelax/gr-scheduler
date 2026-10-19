# -*- coding: utf-8 -*-
"""Write the user wording table from its JSON manuscript.

The table lists, Japanese and English side by side, the everyday words for
text a user reads outside the screen, and the developer words to avoid there.
It is a harness for Claude; the product glossary (tbl-glossary.md and
display-words.json) owns every word shown on the screen and wins over it.

READS   docs/development-rules/user-wording.json
WRITES  docs/development-rules/user-wording.md

WHAT IT CHECKS. Each row has every field, its id is UW-<n> and unique, and
every appliesTo value is a key of the manuscript's appliesTo map.

WHAT IT DOES NOT SEE. Whether a page still uses an avoided word, and whether
a row restates a word the product glossary already owns.

Usage:
    python tools/generate_user_wording.py           write the table
    python tools/generate_user_wording.py --check   exit 1 when it differs
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_REL = 'docs/development-rules/user-wording.json'
TABLE_REL = 'docs/development-rules/user-wording.md'
SOURCE = os.path.join(ROOT, *SOURCE_REL.split('/'))
TABLE = os.path.join(ROOT, *TABLE_REL.split('/'))

PREAMBLE_KEYS = ('preamble', 'appliesToHeading', 'appliesToHeader')
FIELDS = ('id', 'ja', 'en', 'meaning', 'avoidJa', 'avoidEn', 'appliesTo', 'remark')
ROW_ID = re.compile(r'^UW-[1-9][0-9]*$')
JA_JOINER = chr(0x30fb)  # the Japanese middle dot
EN_JOINER = u', '


def say(message):
    """Print ASCII whatever the console's code page."""
    sys.stdout.write(message.encode('ascii', 'backslashreplace').decode('ascii') + '\n')


def problems_of(manuscript):
    places = manuscript.get('appliesTo') or {}
    found, seen = [], set()
    found += ['the manuscript lacks %s' % key for key in PREAMBLE_KEYS if key not in manuscript]
    for position, row in enumerate(manuscript.get('rows') or []):
        missing = [name for name in FIELDS if name not in row]
        if missing:
            found.append('row %d lacks %s' % (position, ', '.join(missing)))
            continue
        if not ROW_ID.match(row['id']) or row['id'] in seen:
            found.append('row %d has a bad or repeated id %r' % (position, row['id']))
        seen.add(row['id'])
        for place in row['appliesTo']:
            if place not in places:
                found.append('%s applies to %r, which appliesTo does not define' % (row['id'], place))
    return found


def cell(text):
    return text.replace(u'|', u'\\|') if text else u'-'


def render(manuscript):
    places = manuscript['appliesTo']
    lines = [
        u'<!-- generated from %s by tools/generate_user_wording.py -- do not edit by hand; '
        u'rebuild with npm run wording -->' % SOURCE_REL,
        u'',
    ] + manuscript['preamble'] + [
        u'',
        u'| id | ja | en | meaning | avoid-ja | avoid-en | applies-to | remark |',
        u'|---|---|---|---|---|---|---|---|',
    ]
    for row in manuscript['rows']:
        lines.append(u'| %s |' % u' | '.join([
            row['id'], cell(row['ja']), cell(row['en']), cell(row['meaning']),
            cell(JA_JOINER.join(row['avoidJa'])), cell(EN_JOINER.join(row['avoidEn'])),
            cell(u', '.join(u'`%s`' % place for place in row['appliesTo'])), cell(row['remark']),
        ]))
    lines += [u'', manuscript['appliesToHeading'], u'', manuscript['appliesToHeader'], u'|---|---|']
    for key, where in places.items():
        lines.append(u'| `%s` | %s |' % (key, cell(where)))
    return u'\n'.join(lines) + u'\n'


def main(argv):
    with io.open(SOURCE, encoding='utf-8') as handle:
        manuscript = json.load(handle)
    found = problems_of(manuscript)
    if found:
        for one in found:
            say('FAIL     %s: %s' % (SOURCE_REL, one))
        return 1
    text = render(manuscript)
    current = None
    if os.path.isfile(TABLE):
        with io.open(TABLE, encoding='utf-8', newline='') as handle:
            current = handle.read().replace(u'\r\n', u'\n')
    if '--check' in argv:
        if current != text:
            say('FAIL     %s differs from %s -- run npm run wording' % (TABLE_REL, SOURCE_REL))
            return 1
        say('OK       %s is current (%d rows)' % (TABLE_REL, len(manuscript['rows'])))
        return 0
    with io.open(TABLE, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(text)
    say('wrote    %s (%d rows)' % (TABLE_REL, len(manuscript['rows'])))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
