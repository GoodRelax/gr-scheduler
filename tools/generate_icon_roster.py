# -*- coding: utf-8 -*-
"""Write the roster of icons of table T-109 into src/.

    python tools/generate_icon_roster.py
    python tools/generate_icon_roster.py --check

Table T-109 is the whole of the icons (FR-029). UF-62 needs the rows whose
surface column reads `App Header`, and UF-65 needs the rows whose surface reads
`Command Palette` together with the group each one sits in -- and neither may
type them out. Rule 03 of docs/development-rules forbids re-typing a value the
specification holds, and screen-renderer.ts records this exact hole: nothing
generated that table into src/ the way settings.json is generated, so a copy
would have gone stale in silence. This script is the way the roster arrives,
and `npm run gen:check` is what fails when the manuscript moves on without it.

⛔ No English name is minted for a row here. Table T-109 says in as many words
that it has NO English column, because one would settle dozens of names the
glossary has not settled and the eight milestone spellings are still open; it
has no shape column for the same reason, the figure being figure F-019. The
only join the table admits is the row id, so the row id is what this file
carries. ⚠️ The Japanese it does copy -- the group column and the "what it is
an entry to" column -- is the manuscript's own wording rather than a
translation invented here, which is why it may travel as data.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GLOSSARY = os.path.join(ROOT, 'docs', 'spec', '_assets', 'tbl-glossary.md')
OUT = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer', 'icon-roster.json')

REL_GLOSSARY = 'docs/spec/_assets/tbl-glossary.md'
REL_OUT = 'src/adapter/screen-renderer/icon-roster.json'
REL_SELF = 'tools/generate_icon_roster.py'

ICON_TABLE = 'T-109'
SURFACE_TABLE = 'T-103'

# ⭐ The two tables are found by the shape of their row ids rather than by
# their captions, which keeps the needles ASCII. The caption is then checked
# to name the table, so a renumbered or moved table fails loudly instead of
# being read as the wrong one.
ICON_ROW = re.compile(r'^\| (IC-\d+[a-z]?) \|')
SURFACE_ROW = re.compile(r'^\| (U-\d+[a-z]?) \|')
CODE_SPAN = re.compile(r'`([^`]+)`')

# ⚠️ The one Japanese needle in this script, and rule 03 section 5 allows it
# because the thing being parsed IS Japanese: the manuscript states the height
# of table T-109 in a sentence of its own prose, and FR-029 forbids a
# requirement to repeat that number, so there is nowhere else to read it from.
# ⛔ Writing the number here instead is the drift this script exists to stop.
STATED_COUNT = re.compile(r'(\d+)\s*行ある')

# The keys this file gives the six columns, in the manuscript's own order.
# ⭐ Their Japanese headings travel with the artifact (see `columns` below),
# read from the table rather than typed out, so no key here has to explain
# itself in a second language.
FIELDS = ('rowId', 'surfaces', 'group', 'entryTo', 'authority', 'arms')

# ⛔ THE ARM COLUMN EXISTS FOR LR-3. Which entry arms which row of table
# T-023b is stated in the glossary and nowhere the renderer may import: the
# one map that held it sits in another component, and table T-061's LR-3
# forbids reaching for it. Carrying the column in this roster is the only
# road the layering leaves, which is why FR-053 can ask the screen to show
# what is armed at all. ⚠️ An entry that arms nothing writes the em dash,
# and becomes None here the way `group` already does.

# Table T-109 writes an em dash in the group column for a row that belongs to
# no group. ⭐ JSON has a word for absent, so the roster uses it, the way
# tools/generate_unit_tree.py turns the same dash into a purity of 'n/a'.
EM_DASH = u'—'

BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s, table %s (the whole '
    'of the icons, FR-029). Rebuild: npm run gen -- npm run gen:check fails on '
    'drift. The generator is %s. An icon is carried by its row id alone: table '
    '%s deliberately has no English column and no shape column, and the shapes '
    'are figure F-019.' % (REL_GLOSSARY, ICON_TABLE, REL_SELF, ICON_TABLE))


def cells(line):
    """The cells of one Markdown table row."""
    # @purity pure
    return [c.strip() for c in line.strip().strip('|').split('|')]


def code_spans(cell):
    """The names a cell writes as `code`."""
    # @purity pure
    return CODE_SPAN.findall(cell)


def read_lines():
    """The glossary, line by line."""
    # @purity semi-pure-b
    return io.open(GLOSSARY, encoding='utf-8').read().split('\n')


def table_rows(lines, row_pattern, table_id):
    """The header, the body rows and the caption line of one table.

    Fails when the table is absent, when its rows are not one unbroken run, or
    when the caption above them names something else -- all three of which mean
    the reader below would be guessing at which table it has.
    """
    # @purity pure
    body = [i for i, line in enumerate(lines) if row_pattern.match(line)]
    if not body:
        sys.exit('generate_icon_roster: %s holds no row of table %s'
                 % (REL_GLOSSARY, table_id))
    first, last = body[0], body[-1]
    if body != list(range(first, last + 1)):
        sys.exit('generate_icon_roster: the rows of table %s do not form one '
                 'run of lines in %s' % (table_id, REL_GLOSSARY))
    if first < 3:
        sys.exit('generate_icon_roster: table %s starts at line %d of %s, with '
                 'no room above it for a header and a caption'
                 % (table_id, first + 1, REL_GLOSSARY))
    ruler = set(lines[first - 1].replace('|', '').replace(' ', ''))
    if ruler != set('-'):
        sys.exit('generate_icon_roster: table %s has no header ruler above its '
                 'first row in %s' % (table_id, REL_GLOSSARY))
    caption = first - 3
    while caption > 0 and not lines[caption].strip():
        caption -= 1
    if table_id not in lines[caption]:
        sys.exit('generate_icon_roster: the rows that look like table %s sit '
                 'under a caption that does not name it (line %d of %s)'
                 % (table_id, caption + 1, REL_GLOSSARY))
    header = cells(lines[first - 2])
    rows = []
    for i in body:
        row = cells(lines[i])
        if len(row) != len(header):
            sys.exit('generate_icon_roster: line %d of %s has %d cell(s) where '
                     'table %s has %d column(s)'
                     % (i + 1, REL_GLOSSARY, len(row), table_id, len(header)))
        rows.append(row)
    return header, rows, caption


def stated_row_count(lines, caption):
    """The height table T-109 claims for itself, from the prose above it."""
    # @purity pure
    start = caption
    while start > 0 and not lines[start].startswith('## '):
        start -= 1
    found = STATED_COUNT.findall('\n'.join(lines[start:caption]))
    if len(found) != 1:
        sys.exit('generate_icon_roster: the prose above table %s in %s states a '
                 'row count %d time(s), and exactly one sentence must'
                 % (ICON_TABLE, REL_GLOSSARY, len(found)))
    return int(found[0])


def settled_surfaces(lines):
    """Every UI part name table T-103 settles."""
    # @purity pure
    _header, rows, _caption = table_rows(lines, SURFACE_ROW, SURFACE_TABLE)
    names = set()
    for row in rows:
        names.update(code_spans(row[1]))
    if not names:
        sys.exit('generate_icon_roster: table %s settles no name, so no surface '
                 'of table %s can be checked' % (SURFACE_TABLE, ICON_TABLE))
    return names


def icon_of(row, surfaces):
    """One row of table T-109, with its surface checked against table T-103."""
    # @purity pure
    row_id, surface_cell, group = row[0], row[1], row[2]
    names = code_spans(surface_cell)
    if ' / '.join('`%s`' % name for name in names) != surface_cell:
        sys.exit('generate_icon_roster: %s writes its surface as %r, which is '
                 'not a list of names that table %s can be asked about'
                 % (row_id, surface_cell, SURFACE_TABLE))
    unsettled = [name for name in names if name not in surfaces]
    if unsettled:
        # ⛔ ASCII only in what this prints: a console that cannot encode the
        # mark shows the escape instead of the message (rule 03 section 5).
        sys.exit('generate_icon_roster: %s names the surface(s) %s, which table '
                 '%s does not settle, and the manuscript forbids a new surface '
                 'name' % (row_id, ', '.join(unsettled), SURFACE_TABLE))
    return {
        'rowId': row_id,
        'surfaces': names,
        'group': None if group == EM_DASH else group,
        'entryTo': row[3],
        'authority': row[4],
        'arms': None if row[5] == EM_DASH else code_spans(row[5])[0],
    }


def build():
    """The roster, as it is written out."""
    # @purity semi-pure-b
    lines = read_lines()
    surfaces = settled_surfaces(lines)
    header, rows, caption = table_rows(lines, ICON_ROW, ICON_TABLE)
    if len(header) != len(FIELDS):
        sys.exit('generate_icon_roster: table %s now has %d column(s) and this '
                 'script names %d' % (ICON_TABLE, len(header), len(FIELDS)))
    wanted = stated_row_count(lines, caption)
    if len(rows) != wanted:
        sys.exit('generate_icon_roster: table %s holds %d row(s), and the '
                 'sentence above it in %s says %d'
                 % (ICON_TABLE, len(rows), REL_GLOSSARY, wanted))
    icons = [icon_of(row, surfaces) for row in rows]
    seen = sorted(set(icon['rowId'] for icon in icons))
    if len(seen) != len(icons):
        sys.exit('generate_icon_roster: table %s uses %d row id(s) for %d row(s)'
                 % (ICON_TABLE, len(seen), len(icons)))
    return {
        '$comment': BANNER,
        'columns': dict(zip(FIELDS, header)),
        'icons': icons,
    }


def main():
    """Write the roster, or say whether the one on disk still matches."""
    # @purity non-pure
    roster = build()
    body = json.dumps(roster, ensure_ascii=False, indent=1) + '\n'
    count = len(roster['icons'])
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            sys.stdout.write('PROBLEM  %s has not been written yet\n' % REL_OUT)
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body:
            sys.stdout.write('PROBLEM  %s has drifted from its manuscript -- '
                             'run `python %s`\n' % (REL_OUT, REL_SELF))
            return 1
        sys.stdout.write('OK       the icon roster matches its manuscript '
                         '(%d icon(s))\n' % count)
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    sys.stdout.write('wrote %s (%d icon(s), %d byte(s))\n'
                     % (REL_OUT, count, len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
