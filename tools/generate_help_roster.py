# -*- coding: utf-8 -*-
"""Write the roster the help shows into src/.

    python tools/generate_help_roster.py
    python tools/generate_help_roster.py --check

FR-036 (MUST) has the help list the shortcut keys and the icons: every row of
table T-109, the rows of table T-036 whose entrance is an em dash and whose
assignment is not, and MK-2 / MK-5 / MK-7 of table T-023. Tables T-023a,
T-023b, T-023c and T-023d are (MUST NOT) never listed -- CR-377 retired them
from the help because touching the screen already tells them. The rows of
table T-255 (the browser's own functions, CR-405) are listed too, except a row
whose chord a row of table T-036 holds (MUST NOT): MK-10 stops the browser on
that chord, so the help would show a function that does not work.

NOT ONE WORD IS CARRIED. FR-038 (MUST NOT) keeps every printed word in one
dictionary per language, so what travels here is the row ids, the key
assignment (which belongs to no language) and the layout FR-036 settles. The
help joins a word to an entry by row id, as every other surface does.

THE LAYOUT IS FR-036'S OWN:

  - blocks in the columns and the order table T-256 names them: the
    assignments with no entrance (`basics`) and the browser functions
    (`browser`) -- the only two blocks with a heading -- then `Row Title Panel`
    and `Resource Roster` in HC-1, `App Header` in HC-2, `Command Palette` in
    HC-3. Every entry carries the row id of its column, and the count of those
    rows must equal S-202 (MUST);
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
import re
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
BROWSER_TABLE = 'T-255'
COLUMN_TABLE = 'T-256'
# The requirement itself, as the table of an entry whose word FR-036 asks for
# but no table row holds: the heading of `basics`.
REQUIREMENT = 'FR-036'

KEY_HEADING = '割当'
ENTRANCE_HEADING = '入口'
# Table T-036 lets one assignment name two entrances only when the direction
# lives in the input itself (MK-3 turns the wheel either way), and writes them
# joined by a half-width slash.
ENTRANCE_SEPARATOR = ' / '
# FR-036 (MUST, CR-425): two assignments in one cell of table T-036 or T-255
# are joined by a full-width slash with one half-width space either side --
# the same join the help puts between an item's keys and its pointer press.
ASSIGNMENT_SEPARATOR = u' \uff0f '
EM_DASH = '—'
CODE_FENCE = '`'
# FR-036 (MUST, CR-425): an assignment cell fences each key on its own and
# joins them with a full-width plus. A fence holding a plus beside another key
# (`Ctrl+A`), or a half-width slash between two assignments, is the spelling
# the requirement retired, and the help would print it as written.
FENCED = re.compile('`([^`]*)`')
PLUS = '+'
RETIRED_SEPARATOR = ' / '
# SK-8's cell closes on a parenthetical in prose, which may hold any slash.
PROSE_OPENS = u'\uff08'
# Table T-256 writes the blocks of one column top to bottom, joined by an arrow.
# The two blocks with no surface name are written in words: the assignments
# with no entrance, and the browser functions (named by their table id).
COLUMN_BLOCKS_HEADING = u'\u7f6e\u304f\u584a\uff08\u4e0a\u304b\u3089\u9806\u306b\uff09'
COLUMN_BLOCK_SEPARATOR = u' \u2192 '
BASICS_WORDS = u'\u5165\u53e3\u3092\u6301\u305f\u306a\u3044\u5272\u5f53'
# A chord is compared after dropping spaces and reading the full-width plus as
# a plain one, so a key that is itself a plus (`Ctrl` + `+`) compares too.
FULL_WIDTH_PLUS = u'\uff0b'

BASICS = 'basics'
BROWSER = 'browser'
ROW_TITLE_PANEL = 'Row Title Panel'
RESOURCE_ROSTER = 'Resource Roster'
APP_HEADER = 'App Header'
COMMAND_PALETTE = 'Command Palette'
BLOCKS = (BASICS, BROWSER, ROW_TITLE_PANEL, RESOURCE_ROSTER, APP_HEADER,
          COMMAND_PALETTE)

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
HELP_COLUMN_COUNT = 'S-202'
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


def keys_of(row, table):
    """The key assignment a reader needs, out of the cell table T-036 prints.

    The joins inside the cell (a full-width slash between assignments, a
    full-width plus inside a chord) are the table's and are kept as written.
    SK-8 carries a parenthetical about where its rule lives; that is prose in
    one language and is dropped. A cell still in the retired spelling stops the
    run rather than reach the help.

    @purity non-pure
    """
    fenced = row.cell(KEY_HEADING).split(PROSE_OPENS)[0]
    joined_in_a_fence = [one for one in FENCED.findall(fenced)
                         if PLUS in one and one.strip() != PLUS]
    if joined_in_a_fence or RETIRED_SEPARATOR in fenced:
        stop('%s of table %s writes %r; FR-036 (MUST) fences each key on its own '
             'and joins two assignments with %r'
             % (row.id, table, fenced, ASSIGNMENT_SEPARATOR))
    written = cell_or_none(row, KEY_HEADING)
    if written is None:
        return None
    cut = written.find(PROSE_OPENS)
    return (written[:cut] if cut >= 0 else written).strip()


def entrances_of(row):
    """@purity pure"""
    written = cell_or_none(row, ENTRANCE_HEADING)
    return [] if written is None else [one.strip() for one in
                                       written.split(ENTRANCE_SEPARATOR)]


def settings_number(row_id):
    """@purity semi-pure-b"""
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    found = []

    def walk(node):
        if isinstance(node, dict):
            if node.get('id') == row_id:
                found.append(node)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)
    walk(doc)
    if len(found) != 1:
        stop('settings.json holds %d row(s) %s' % (len(found), row_id))
    return int(found[0]['default']['num'])


def always_shown_glyph_count():
    """@purity semi-pure-b"""
    return settings_number(ALWAYS_SHOWN_GLYPHS)


def chords_of(keys):
    """The chords one assignment cell names, spelled so two tables compare.

    @purity pure
    """
    if keys is None:
        return set()
    return set(one.replace(' ', '').replace(FULL_WIDTH_PLUS, PLUS)
               for one in keys.split(ASSIGNMENT_SEPARATOR))


def block_of(written):
    """The block one step of a table T-256 cell names.

    @purity non-pure
    """
    step = written.strip()
    if len(step) > 1 and step.startswith(CODE_FENCE) and step.endswith(CODE_FENCE):
        return step.strip(CODE_FENCE)
    if BROWSER_TABLE in step:
        return BROWSER
    if step == BASICS_WORDS:
        return BASICS
    stop('table %s names a block this script does not know: %r'
         % (COLUMN_TABLE, step))
    return None


def column_layout():
    """[(column row id, [block, ...]), ...] in table T-256's order.

    @purity non-pure
    """
    layout = [(row.id, [block_of(step) for step in
                        row.cell(COLUMN_BLOCKS_HEADING).split(COLUMN_BLOCK_SEPARATOR)])
              for row in spec_tables.read(REL_REQUIREMENTS, COLUMN_TABLE)]
    placed = [block for _column, blocks in layout for block in blocks]
    if sorted(placed) != sorted(BLOCKS):
        stop('table %s places %s, and the blocks this script builds are %s'
             % (COLUMN_TABLE, placed, list(BLOCKS)))
    count = settings_number(HELP_COLUMN_COUNT)
    if len(layout) != count:
        stop('table %s has %d row(s) and %s says %d columns; FR-036 (MUST) has '
             'the two agree' % (COLUMN_TABLE, len(layout), HELP_COLUMN_COUNT, count))
    return layout


def item(block, segment, table, row, keys=None, press=None, glyphs=None,
         indent=False, kind='item', note=None):
    """@purity pure"""
    return {
        'kind': kind,
        'column': None,
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
    held_chords = set()
    basics = [item(BASICS, None, REQUIREMENT, BASICS, kind='heading')]

    # STOP: spec does not decide the order of the help title row. Looked in FR-036, FR-038, IC-52
    # @provisional PND-500
    for row in spec_tables.read(REL_REQUIREMENTS, SHORTCUT_TABLE):
        keys = keys_of(row, SHORTCUT_TABLE)
        drives = entrances_of(row)
        if keys is None:
            continue
        held_chords |= chords_of(keys)
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

    # FR-036, table T-255: the browser's own functions, minus a row whose chord
    # table T-036 holds -- MK-10 stops the browser on that chord (MUST NOT).
    browser = [item(BROWSER, None, REQUIREMENT, BROWSER, kind='heading')]
    for row in spec_tables.read(REL_REQUIREMENTS, BROWSER_TABLE):
        keys = keys_of(row, BROWSER_TABLE)
        if keys is None:
            stop('%s of table %s has no assignment' % (row.id, BROWSER_TABLE))
        if chords_of(keys) & held_chords:
            continue
        browser.append(item(BROWSER, None, BROWSER_TABLE, row.id, keys=keys))

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

    by_block = {BASICS: basics, BROWSER: browser, ROW_TITLE_PANEL: panel,
                RESOURCE_ROSTER: roster, APP_HEADER: header,
                COMMAND_PALETTE: palette}
    entries = []
    for column, blocks in column_layout():
        for block in blocks:
            for one in by_block[block]:
                one['column'] = column
                entries.append(one)

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
