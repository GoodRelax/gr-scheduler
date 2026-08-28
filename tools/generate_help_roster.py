# -*- coding: utf-8 -*-
"""Write the roster the help shows into src/.

    python tools/generate_help_roster.py
    python tools/generate_help_roster.py --check

FR-036 (MUST) names what the help has to show, by table and not by count:
the press order, the arms, the selection rules, the grab areas, the pointer
assignments, the shortcuts, and every Command Palette entry. None of those
tables reached `src/` before this script, which is what `open-modals.ts`
recorded in a STOP note for several rounds: listing them in that file would
have been the copy rule 03 section 1 forbids.

NOT ONE WORD IS CARRIED. FR-038 (MUST NOT) keeps every printed word in one
dictionary per language, so what travels here is the row IDs and the two facts
the dictionary cannot hold -- the key assignment and the icon. The help joins
them by row id, exactly as every other surface joins a word to a row.

THE ORDER IS FR-036'S OWN, table by table in the order that requirement names
them, and inside a table the order that table prints. Nothing here sorts.

THE KEY ASSIGNMENT BELONGS TO NO LANGUAGE, which is why it travels as data
rather than as a word: Ctrl+S and F1 read the same in every language, the same
reading `_source/settings.json` takes of a unit. Only table T-036 has the
column; every other row carries null.

AN ICON IS CARRIED ONLY WHERE TABLE T-109 PLACES EXACTLY ONE ENTRANCE FOR THE
ROW, and that rule is the table's rather than this script's:

  - a Command Palette row is its own entrance, so it carries itself;
  - an arm of table T-023b is carried by whatever entrances that table's
    arm column points at it, and it counts. AR-2 stands against four and AR-3
    against eight, so neither has AN icon -- picking one of four would be this
    script choosing what FR-029 (MUST NOT) reserves to the figure and the
    table. AR-4, AR-5 and AR-6 stand against one each and carry it;
  - every other row has no entrance at all and carries null.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REQUIREMENTS = os.path.join(ROOT, 'docs', 'spec', '01-04-requirements.md')
ROSTER = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer', 'icon-roster.json')
OUT = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer', 'help-roster.json')
REL_OUT = 'src/adapter/screen-renderer/help-roster.json'
REL_SELF = 'tools/generate_help_roster.py'
REL_REQUIREMENTS = 'docs/spec/01-04-requirements.md'

COMMAND_PALETTE = 'Command Palette'
ICON_TABLE = 'T-109'
ROW_ID_HEADING = '行 ID'
KEY_HEADING = '割当'
EM_DASH = '—'
# A cross-reference the assignment cell carries beside the key itself: SK-8
# reads Esc（規則は表 T-028 の IN-4）. That parenthetical is prose about where the
# rule lives, in one language, and the key is what a reader needs -- so it is
# dropped rather than shown. Only SK-8 has one (measured 2026-08-29).
ASIDE = re.compile(r'（[^）]*）')
CODE_FENCE = '`'

# The tables FR-036 names, in the order it names them, with the row id shape of
# each and the column that holds a key assignment where one exists.
TABLES = [
    ('T-023a', r'PD-\d+[a-z]?', None),
    ('T-023b', r'AR-\d+[a-z]?', None),
    ('T-023c', r'SL-\d+[a-z]?', None),
    ('T-023d', r'GR-\d+[a-z]?', None),
    ('T-023', r'MK-\d+[a-z]?', None),
    ('T-036', r'SK-\d+[a-z]?', KEY_HEADING),
]

BANNER = (
    'GENERATED from %s and the icon roster by %s -- do not edit by hand. '
    'Rebuild: npm run gen  |  npm run gen:check fails on drift. '
    'No printed word is here: FR-038 keeps those in display-words.json, under '
    'the same row ids.' % (REL_REQUIREMENTS, REL_SELF)
)


def say(message):
    """The cp932 guard every generator in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def cells(line):
    """The cells of one printed row."""
    return [c.strip() for c in line.strip().strip('|').split('|')]


def keys_of(written):
    """The key assignment a reader needs, out of the cell the table prints.

    The cell writes each key as code and joins them with the table's own
    characters -- a slash between alternatives, a full-width plus between the
    keys of one chord. Those joins are kept exactly as written: they are the
    table's and inventing a different separator here would put a second
    spelling of one assignment on the screen.
    """
    return ASIDE.sub('', written).replace(CODE_FENCE, '').strip()


def table_rows(table, row_shape, key_column):
    """Every row of one table, in the order it is printed.

    The caption has to have been seen first, which is what keeps a row id
    belonging to some other table from being read as this one's -- the same
    guard `tools/generate_display_words.py` takes.
    """
    caption = '表 %s —' % table
    row = re.compile(r'^\| (%s) \|' % row_shape)
    seen = False
    headings = []
    found = []
    for line in io.open(REQUIREMENTS, encoding='utf-8'):
        if caption in line:
            seen = True
            headings = []
            continue
        if not seen:
            continue
        if line.startswith('**表 '):
            break
        if line.strip().startswith('|') and not headings and ROW_ID_HEADING in line:
            headings = cells(line)
            continue
        match = row.match(line)
        if match is None:
            continue
        keys = None
        if key_column is not None:
            if key_column not in headings:
                sys.exit('%s: table %s has no %s column; its headings are %s'
                         % (REL_REQUIREMENTS, table, key_column, headings))
            written = keys_of(cells(line)[headings.index(key_column)])
            # The em dash is the table's own way of saying a row has no
            # assignment (SK-1 states that no keyboard route exists at all),
            # and null is what carries that rather than a dash on screen.
            keys = None if written in ('', EM_DASH) else written
        found.append((match.group(1), keys))
    if not found:
        sys.exit('%s: table %s has no rows -- the needle no longer matches'
                 % (REL_REQUIREMENTS, table))
    return found


def build():
    """The roster, as it is written out.

    @purity semi-pure-b
    """
    roster = json.load(io.open(ROSTER, encoding='utf-8'))['icons']
    entrances = {}
    for icon in roster:
        arm = icon.get('arms')
        if arm:
            entrances.setdefault(arm, []).append(icon['rowId'])

    entries = []
    for table, shape, key_column in TABLES:
        for row, keys in table_rows(table, shape, key_column):
            on = entrances.get(row, [])
            entries.append({
                'table': table,
                'row': row,
                'keys': keys,
                'icon': on[0] if len(on) == 1 else None,
            })
    for icon in roster:
        if COMMAND_PALETTE in icon['surfaces']:
            entries.append({
                'table': ICON_TABLE,
                'row': icon['rowId'],
                'keys': None,
                'icon': icon['rowId'],
            })
    return {'$comment': BANNER, 'entries': entries}


def main():
    """Write the roster, or say whether the one on disk still matches.

    @purity non-pure
    """
    built = build()
    body = json.dumps(built, ensure_ascii=False, indent=1) + '\n'
    count = len(built['entries'])
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % REL_OUT)
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body:
            say('PROBLEM  %s has drifted from its tables -- run `python %s`'
                % (REL_OUT, REL_SELF))
            return 1
        say('OK       the help roster matches its tables (%d entries)' % count)
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    say('wrote %s (%d entries, %d bytes)' % (REL_OUT, count, len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
