# -*- coding: utf-8 -*-
"""Write the roster the help shows into src/.

    python tools/generate_help_roster.py
    python tools/generate_help_roster.py --check

FR-036 (MUST) has the help list the shortcut keys and the icons: every row of
table T-109, the rows of table T-036 whose entrance is an em dash and whose
assignment is not, and MK-2 / MK-5 / MK-7 of table T-023. Tables T-023a,
T-023b, T-023c and T-023d are (MUST NOT) never listed -- CR-377 retired them
from the help because touching the screen already tells them.

NOT ONE WORD IS CARRIED. FR-038 (MUST NOT) keeps every printed word in one
dictionary per language, so what travels here is the row ids, the key
assignment (which belongs to no language) and the layout FR-036 settles. The
help joins a word to an entry by row id, as every other surface does.

THE LAYOUT IS FR-036'S OWN:

  - blocks in the order it names them: the assignments with no entrance
    (`basics`, the only block with a heading), `Row Title Panel`,
    `Resource Roster`, `App Header`, `Command Palette`;
  - inside a block the order the screen shows, not the print order of table
    T-109;
  - an assignment whose table names an entrance sits on that entrance's item,
    never as a second item (MUST NOT);
  - under `IC-1`, the entrances of the surfaces that stand after opening,
    indented;
  - the rows armed with AR-3 and `IC-50` as ONE item, drawn with the first
    and the last glyph `S-216` always shows and the glyph of `IC-50`;
  - the item of `IC-54` carries its note (the row id whose note words it
    reads), never a second item; `IC-102` is the legend and not an item.

A row of table T-109 that no item carries stops the run: dropping an entrance
from the help in silence is exactly what FR-036's "every row" forbids.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import sys

import spec_tables

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ROSTER = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer', 'icon-roster.json')
SETTINGS = os.path.join(ROOT, 'docs', 'spec', '_source', 'settings.json')
OUT = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer', 'help-roster.json')
REL_OUT = 'src/adapter/screen-renderer/help-roster.json'
REL_SELF = 'tools/generate_help_roster.py'
REL_REQUIREMENTS = 'docs/spec/01-04-requirements.md'

ICON_TABLE = 'T-109'
SHORTCUT_TABLE = 'T-036'
ASSIGNMENT_TABLE = 'T-023'
# The requirement itself, as the table of an entry whose word FR-036 asks for
# but no table row holds: the heading of `basics`.
REQUIREMENT = 'FR-036'

KEY_HEADING = '割当'
ENTRANCE_HEADING = '入口'
# Table T-036 lets one assignment name two entrances only when the direction
# lives in the input itself (MK-3 turns the wheel either way), and writes them
# the way it writes two key chords.
ENTRANCE_SEPARATOR = ' / '
EM_DASH = '—'
CODE_FENCE = '`'

BASICS = 'basics'
ROW_TITLE_PANEL = 'Row Title Panel'
RESOURCE_ROSTER = 'Resource Roster'
APP_HEADER = 'App Header'
COMMAND_PALETTE = 'Command Palette'
BLOCKS = (BASICS, ROW_TITLE_PANEL, RESOURCE_ROSTER, APP_HEADER, COMMAND_PALETTE)

# FR-036 names these by id: shown, and the rest of table T-023 split into the
# rows with an entrance and the rows it keeps off the help. A row of that table
# in none of the three stops the run -- FR-036 (MUST) has the requirement decide
# a new row, and this script must not decide it.
SHOWN_ASSIGNMENTS = ('MK-2', 'MK-5', 'MK-7')
UNLISTED_ASSIGNMENTS = ('MK-1', 'MK-6', 'MK-8', 'MK-11', 'MK-13',
                        'MK-9', 'MK-9a', 'MK-10', 'MK-12')

# The screen order of the Row Title Panel. HF-10 of table T-051 orders the head
# (open one level, collapse all, open all, add); HF-1 reads the 2 x 2 grid of a
# row column first (hide, open one level, collapse below, open below), HF-4
# puts delete over add after it and the pin outermost. The rows are the
# entrances table T-109 describes in those words. The set is checked against
# the table every run, so a row added there stops the run instead of vanishing.
ROW_TITLE_PANEL_ORDER = ('IC-92', 'IC-78', 'IC-74', 'IC-93',
                         'IC-59', 'IC-90', 'IC-77', 'IC-58', 'IC-82', 'IC-91',
                         'IC-60')

# FR-036: under IC-1, the entrances of Open Chooser then Difference Review.
OPENED_UNDER = 'IC-1'
OPENED_SURFACES = ('Open Chooser', 'Difference Review')

MILESTONE_ARM = 'AR-3'
MILESTONE_LIST_ROW = 'IC-50'
ALWAYS_SHOWN_GLYPHS = 'S-216'
ARMED_NOTE_ROW = 'IC-54'
LEGEND_ROW = 'IC-102'

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


def stop(message):
    """@purity non-pure"""
    say('%s: %s' % (REL_SELF, message))
    sys.exit(1)


def cell_or_none(row, heading):
    """A cell with its code fences dropped, or None for the table's em dash.

    @purity pure
    """
    written = row.cell(heading).replace(CODE_FENCE, '').strip()
    return None if written in ('', EM_DASH) else written


def keys_of(row):
    """The key assignment a reader needs, out of the cell table T-036 prints.

    The joins inside the cell (a slash between alternatives, a full-width plus
    inside a chord) are the table's and are kept as written. SK-8 carries a
    parenthetical about where its rule lives; that is prose in one language and
    is dropped.

    @purity pure
    """
    written = cell_or_none(row, KEY_HEADING)
    if written is None:
        return None
    cut = written.find('（')
    return (written[:cut] if cut >= 0 else written).strip()


def entrances_of(row):
    """@purity pure"""
    written = cell_or_none(row, ENTRANCE_HEADING)
    return [] if written is None else [one.strip() for one in
                                       written.split(ENTRANCE_SEPARATOR)]


def always_shown_glyph_count():
    """@purity semi-pure-b"""
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    found = []

    def walk(node):
        if isinstance(node, dict):
            if node.get('id') == ALWAYS_SHOWN_GLYPHS:
                found.append(node)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)
    walk(doc)
    if len(found) != 1:
        stop('settings.json holds %d row(s) %s' % (len(found), ALWAYS_SHOWN_GLYPHS))
    return int(found[0]['default']['num'])


def item(block, segment, table, row, keys=None, press=None, glyphs=None,
         indent=False, kind='item', note=None):
    """@purity pure"""
    return {
        'kind': kind,
        'block': block,
        'segment': segment,
        'indent': indent,
        'table': table,
        'row': row,
        'keys': keys,
        'press': press,
        'glyphs': list(glyphs) if glyphs is not None else [],
        'note': note,
    }


def build():
    """The roster, as it is written out.

    @purity semi-pure-b
    """
    icons = json.load(io.open(ROSTER, encoding='utf-8'))['icons']
    by_id = dict((icon['rowId'], icon) for icon in icons)

    keys_on = {}
    press_on = {}
    basics = [item(BASICS, None, REQUIREMENT, BASICS, kind='heading')]

    for row in spec_tables.read(REL_REQUIREMENTS, SHORTCUT_TABLE):
        keys = keys_of(row)
        drives = entrances_of(row)
        if keys is None:
            continue
        if not drives:
            basics.append(item(BASICS, None, SHORTCUT_TABLE, row.id, keys=keys))
            continue
        for icon in drives:
            if icon not in by_id:
                stop('%s of table %s names %s, which table %s has no row for'
                     % (row.id, SHORTCUT_TABLE, icon, ICON_TABLE))
            if icon in keys_on:
                stop('%s and another row of table %s both name %s; an item holds '
                     'one key assignment' % (row.id, SHORTCUT_TABLE, icon))
            keys_on[icon] = keys

    for row in spec_tables.read(REL_REQUIREMENTS, ASSIGNMENT_TABLE):
        drives = entrances_of(row)
        if drives:
            for icon in drives:
                if icon not in by_id or icon in press_on:
                    stop('%s of table %s names %s, which is unknown or already '
                         'carries a pointer assignment'
                         % (row.id, ASSIGNMENT_TABLE, icon))
                press_on[icon] = row.id
        elif row.id in SHOWN_ASSIGNMENTS:
            basics.append(item(BASICS, None, ASSIGNMENT_TABLE, row.id, press=row.id))
        elif row.id not in UNLISTED_ASSIGNMENTS:
            stop('%s of table %s is neither shown nor kept off the help by '
                 'FR-036; the requirement has to decide it'
                 % (row.id, ASSIGNMENT_TABLE))

    # FR-036: the note on IC-54 belongs to the IC-54 item, so an entrance
    # never stands on a second item for it.
    def icon_item(block, segment, rid, glyphs=None, indent=False):
        return item(block, segment, ICON_TABLE, rid, keys=keys_on.get(rid),
                    press=press_on.get(rid),
                    glyphs=glyphs if glyphs is not None else [rid],
                    indent=indent,
                    note=rid if rid == ARMED_NOTE_ROW else None)

    # A row stands in ONE place on the help: the first surface of its cell that
    # has a block or stands under IC-1. IC-52 closes six surfaces and is listed
    # once, under the first of them that has a block.
    placed = BLOCKS + OPENED_SURFACES

    def home(icon):
        found = [one for one in icon['surfaces'] if one in placed]
        return found[0] if found else None

    on = lambda surface: [i['rowId'] for i in icons if home(i) == surface]

    panel_rows = on(ROW_TITLE_PANEL)
    if sorted(panel_rows) != sorted(ROW_TITLE_PANEL_ORDER):
        stop('table %s puts %s on %s, and the screen order this script holds '
             'names %s' % (ICON_TABLE, panel_rows, ROW_TITLE_PANEL,
                           list(ROW_TITLE_PANEL_ORDER)))
    panel = [icon_item(ROW_TITLE_PANEL, None, rid) for rid in ROW_TITLE_PANEL_ORDER]

    roster = [icon_item(RESOURCE_ROSTER, None, rid) for rid in on(RESOURCE_ROSTER)]

    header = []
    for rid in on(APP_HEADER):
        header.append(icon_item(APP_HEADER, None, rid))
        if rid == OPENED_UNDER:
            for surface in OPENED_SURFACES:
                header.extend(icon_item(APP_HEADER, None, one, indent=True)
                              for one in on(surface))

    # The palette as the screen draws it: the grab band (the rows with no
    # group) first, then each group where it first appears, holding its rows
    # in table order. IC-54 is the group drawn last, as the armed line.
    palette_rows = [i for i in icons if home(i) == COMMAND_PALETTE]
    band = [i for i in palette_rows if i['group'] is None]
    groups = []
    for icon in palette_rows:
        if icon['group'] is None:
            continue
        found = [g for g in groups if g[0] == icon['group']]
        if found:
            found[0][2].append(icon)
        else:
            groups.append((icon['group'], icon['rowId'], [icon]))
    milestones = [i['rowId'] for i in palette_rows if i['arms'] == MILESTONE_ARM]
    shown = always_shown_glyph_count()
    if len(milestones) < shown:
        stop('table %s arms %s on %d row(s), fewer than %s says are always shown'
             % (ICON_TABLE, MILESTONE_ARM, len(milestones), ALWAYS_SHOWN_GLYPHS))
    milestone_glyphs = [milestones[0], milestones[shown - 1], MILESTONE_LIST_ROW]

    palette = [icon_item(COMMAND_PALETTE, band[0]['rowId'], i['rowId']) for i in band]
    for _cell, first, members in groups:
        for icon in members:
            rid = icon['rowId']
            if rid == MILESTONE_LIST_ROW:
                continue
            if rid in milestones:
                if rid == milestones[0]:
                    palette.append(icon_item(COMMAND_PALETTE, first,
                                             MILESTONE_LIST_ROW,
                                             glyphs=milestone_glyphs))
                continue
            palette.append(icon_item(COMMAND_PALETTE, first, rid))

    entries = basics + panel + roster + header + palette

    # The one merged item stands for every row armed with AR-3 (FR-036).
    carried = set([LEGEND_ROW] + milestones)
    for one in entries:
        if one['table'] == ICON_TABLE:
            carried.add(one['row'])
            carried.update(one['glyphs'])
    missing = [i['rowId'] for i in icons if i['rowId'] not in carried]
    if missing:
        stop('no help item carries %s of table %s; FR-036 lists every row'
             % (', '.join(missing), ICON_TABLE))
    listed = [one['row'] for one in entries if one['kind'] == 'item']
    if len(listed) != len(set(listed)):
        stop('an entrance stands on two items: %s' % listed)
    if LEGEND_ROW not in by_id:
        stop('table %s has no row %s for the legend' % (ICON_TABLE, LEGEND_ROW))

    return {'$comment': BANNER, 'legend': LEGEND_ROW, 'entries': entries}


def main():
    """Write the roster, or say whether the one on disk still matches.

    @purity non-pure
    """
    built = build()
    body = json.dumps(built, ensure_ascii=False, indent=1) + '\n'
    count = len([one for one in built['entries'] if one['kind'] == 'item'])
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % REL_OUT)
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body:
            say('PROBLEM  %s has drifted from its tables -- run `python %s`'
                % (REL_OUT, REL_SELF))
            return 1
        say('OK       the help roster matches its tables (%d items)' % count)
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    say('wrote %s (%d items, %d bytes)' % (REL_OUT, count, len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
