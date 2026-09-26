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

⭐ Two more manuscripts are read, and only for the one field table T-109 cannot
carry on its own. Its arm column names a KIND of arm (table T-023b), so AR-2
stands against four entries and AR-3 against eight; FR-053 (MUST) asks for THE
armed entrance to be told from the ones that are not, which needs the shape or
the glyph as well as the kind. `docs/spec/01-04-requirements.md` holds table
T-012, whose rows table T-109 names for the four task shapes and whose SH-5
prints the eight milestone marks, and `docs/spec/_source/erd.json` holds the
spellings of both -- section 8 of the glossary sends the eight there in as many
words. ⛔ No spelling is minted here either.

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
GLOSSARY = os.path.join(ROOT, 'docs', 'spec', '_assets', 'tbl-glossary.md')
REQUIREMENTS = os.path.join(ROOT, 'docs', 'spec', '01-04-requirements.md')
ERD = os.path.join(ROOT, 'docs', 'spec', '_source', 'erd.json')
OUT = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer', 'icon-roster.json')

REL_GLOSSARY = 'docs/spec/_assets/tbl-glossary.md'
REL_REQUIREMENTS = 'docs/spec/01-04-requirements.md'
REL_ERD = 'docs/spec/_source/erd.json'
REL_OUT = 'src/adapter/screen-renderer/icon-roster.json'
REL_SELF = 'tools/generate_icon_roster.py'

ICON_TABLE = 'T-109'
SURFACE_TABLE = 'T-103'
SHAPE_TABLE = 'T-012'

# The two rows of table T-023b that stand against MORE THAN ONE entrance, and
# the columns of `TaskVisual` whose spellings tell those entrances apart.
# ⛔ AR-4, AR-5 and AR-6 are absent on purpose: each stands against exactly one
# row of table T-109, so there is nothing to tell apart and `armsShape` is null.
# ⭐ SH-5 is named because its cell is where the eight milestone marks are
# printed -- the four task shapes are reached by the row each entry names for
# itself, so no row id of theirs is written down.
TASK_SHAPE_ARM = 'AR-2'
MILESTONE_SHAPE_ARM = 'AR-3'
SHAPE_ENTITY = 'TaskVisual'
SHAPE_COLUMN = 'shapeKind'
GLYPH_COLUMN = 'milestoneGlyph'
MILESTONE_SHAPE_ROW = 'SH-5'

# ⭐ The two tables are found by the shape of their row ids rather than by
# their captions, which keeps the needles ASCII. The caption is then checked
# to name the table, so a renumbered or moved table fails loudly instead of
# being read as the wrong one.
ICON_ROW = re.compile(r'^\| (IC-\d+[a-z]?) \|')
SURFACE_ROW = re.compile(r'^\| (U-\d+[a-z]?) \|')
SHAPE_ROW = re.compile(r'^\| (SH-\d+[a-z]?) \|')
CODE_SPAN = re.compile(r'`([^`]+)`')

# ⚠️ The one Japanese needle in this script, and rule 03 section 5 allows it
# because the thing being parsed IS Japanese: the manuscript states the height
# of table T-109 in a sentence of its own prose, and FR-029 forbids a
# requirement to repeat that number, so there is nowhere else to read it from.
# ⛔ Writing the number here instead is the drift this script exists to stop.
STATED_COUNT = re.compile(r'(\d+)\s*行ある')

# The keys this file gives the six columns it carries, in the manuscript's own
# order. ⭐ Their Japanese headings travel with the artifact (see `columns`
# below), read from the table rather than typed out, so no key here has to
# explain itself in a second language.
FIELDS = ('rowId', 'surfaces', 'group', 'entryTo', 'authority', 'arms')

# ⭐ THE SEVENTH COLUMN, AND THE ROSTER DOES NOT CARRY IT (CR-589). It names,
# for the entries of FR-049 and FR-048 only, the settings row the entry
# rewrites. Its one reader is `entry_switches` below, which
# tools/generate_entity_types.py imports to print the two maps into src/; a
# copy in this roster would put the same join into a generated file twice.
# ⚠️ A Japanese needle, allowed by rule 03 section 5 for the reason given at
# STATED_COUNT: the heading is the manuscript's own word and is found by it,
# so the column is read by name and never by position.
SWITCH_HEADING = u'切り替える設定値'
SWITCH_AFTER = 4  # the column sits right after `authority` (index 4)
SWITCH_PLAIN = re.compile(r'^`(S-\d+[a-z]?)`$')
SWITCH_VALUE = re.compile(u"^`(S-\\d+[a-z]?)`（`'([^`']+)'`）$")
# The requirement whose entries write a boolean row of table T-202, and the one
# whose entries write a value of the guide cursor row.
FLIP_REQUIREMENT = 'FR-049'
CHOOSE_REQUIREMENT = 'FR-048'
GUIDE_CURSOR_ROW = 'S-66'
BOOLEAN_TABLE = 'T-202'
SETTINGS = os.path.join(ROOT, 'docs', 'spec', '_source', 'settings.json')

# ⛔ THE ARM COLUMN EXISTS FOR LR-3. Which entry arms which row of table
# T-023b is stated in the glossary and nowhere the renderer may import: the
# one map that held it sits in another component, and table T-061's LR-3
# forbids reaching for it. Carrying the column in this roster is the only
# road the layering leaves, which is why FR-053 can ask the screen to show
# what is armed at all. ⚠️ An entry that arms nothing writes the em dash,
# and becomes None here the way `group` already does.

# ⭐ `armsShape` IS A SEVENTH FIELD AND IS NOT A COLUMN, which is why it is
# absent from FIELDS: `columns` below is the header of the six columns of
# table T-109 this roster carries (the seventh column, SWITCH_HEADING, is not
# carried). It is DERIVED, by `fill_arms_shape`, and it exists because the arm
# column names a KIND of arm rather than an entrance -- AR-2 stands against
# four rows and AR-3 against eight, so a join on the column alone marks four
# entrances (or eight) as armed where FR-053 (MUST) asks for the armed
# entrance to be told apart from the ones that are not.
ARMS_SHAPE_FIELD = 'armsShape'

# Table T-109 writes an em dash in the group column for a row that belongs to
# no group. ⭐ JSON has a word for absent, so the roster uses it, the way
# tools/generate_unit_tree.py turns the same dash into a purity of 'n/a'.
EM_DASH = u'—'

BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s, table %s (the whole '
    'of the icons, FR-029). Rebuild: npm run gen -- npm run gen:check fails on '
    'drift. The generator is %s. An icon is carried by its row id alone: table '
    '%s deliberately has no English column and no shape column, and the shapes '
    'are figure F-019. The `columns` map names SIX of the seven columns of '
    'that table; the settings-row column is not carried here, because '
    'tools/generate_entity_types.py prints it into src/. '
    '`%s` is a seventh field and no column of it -- it is derived from table '
    '%s of %s and from %s, and it exists because the arm column names a KIND '
    'of arm that stands against several entries at once.'
    % (REL_GLOSSARY, ICON_TABLE, REL_SELF, ICON_TABLE, ARMS_SHAPE_FIELD,
       SHAPE_TABLE, REL_REQUIREMENTS, REL_ERD))


def code_spans(cell):
    """The names a cell writes as `code`."""
    # @purity pure
    return CODE_SPAN.findall(cell)


def read_lines(path):
    """One manuscript, line by line.

    ⚠️ Still needed after the shared reader took the table parsing: the
    sentence stating a table height sits in the PROSE above the caption,
    which is not part of any table.

    @purity semi-pure-b
    """
    return io.open(path, encoding='utf-8').read().splitlines()


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
    rows = [row.cells for row in spec_tables.read(REL_GLOSSARY, SURFACE_TABLE)]
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


def settled_spellings(entity, column):
    """The spellings _source/erd.json settles for one column, in its order."""
    # @purity semi-pure-b
    erd = json.load(io.open(ERD, encoding='utf-8'))
    for entry in erd.get('entities', []):
        if entry.get('name') != entity:
            continue
        for cell in entry.get('columns', []):
            if cell.get('name') != column:
                continue
            values = cell.get('json', {}).get('values')
            if not values:
                sys.exit('generate_icon_roster: %s.%s of %s settles no list of '
                         'values' % (entity, column, REL_ERD))
            return values
    sys.exit('generate_icon_roster: %s holds no column %s.%s'
             % (REL_ERD, entity, column))


def shape_rows(lines):
    """The rows of table T-012, by row ID, with their spelling resolved.

    ⭐ The spelling is the table's own 値 column, which writes it as a quoted
    `code` span. ⛔ It is checked against `TaskVisual.shapeKind` rather than
    trusted: the manuscript states the five in two places, and a roster built
    on the half that had drifted would arm a shape the model cannot hold.
    """
    # @purity semi-pure-b
    rows = [row.cells
            for row in spec_tables.read(REL_REQUIREMENTS, SHAPE_TABLE)]
    settled = settled_spellings(SHAPE_ENTITY, SHAPE_COLUMN)
    found = {}
    for row in rows:
        spelled = [name.strip("'") for name in code_spans(row[2])]
        if len(spelled) != 1:
            sys.exit('generate_icon_roster: %s of table %s writes its value as '
                     '%r, which is not one name that %s can be asked about'
                     % (row[0], SHAPE_TABLE, row[2], REL_ERD))
        if spelled[0] not in settled:
            sys.exit('generate_icon_roster: %s of table %s spells its value %s, '
                     'which %s does not settle for %s.%s'
                     % (row[0], SHAPE_TABLE, spelled[0], REL_ERD, SHAPE_ENTITY,
                        SHAPE_COLUMN))
        found[row[0]] = (row[1], spelled[0])
    if len(found) != len(settled):
        sys.exit('generate_icon_roster: table %s holds %d row(s) and %s settles '
                 '%d spelling(s) for %s.%s'
                 % (SHAPE_TABLE, len(found), REL_ERD, len(settled),
                    SHAPE_ENTITY, SHAPE_COLUMN))
    return found


def glyph_by_mark(shapes):
    """Each mark SH-5 of table T-012 prints, paired with its spelling.

    ⛔ THE PAIRING IS BY ORDER AND NOTHING ELSE STATES IT. Section 8 of the
    glossary sends the eight spellings to _source/erd.json and table T-012
    prints the eight marks, and no row of the manuscript joins one mark to one
    spelling -- so the only join there is is that both lists are printed in the
    same order. ⚠️ That is the one place this script would go wrong in silence
    if a list were re-ordered, which is why the count is checked here and the
    marks are matched against table T-109 one by one below rather than being
    assumed to stand in the table's own order too.
    """
    # @purity semi-pure-b
    if MILESTONE_SHAPE_ROW not in shapes:
        sys.exit('generate_icon_roster: table %s has no row %s, so the marks of '
                 'the milestone shapes cannot be read'
                 % (SHAPE_TABLE, MILESTONE_SHAPE_ROW))
    marks = shapes[MILESTONE_SHAPE_ROW][0].split()
    settled = settled_spellings(SHAPE_ENTITY, GLYPH_COLUMN)
    if len(marks) != len(settled):
        sys.exit('generate_icon_roster: %s of table %s prints %d mark(s) and %s '
                 'settles %d spelling(s) for %s.%s'
                 % (MILESTONE_SHAPE_ROW, SHAPE_TABLE, len(marks), REL_ERD,
                    len(settled), SHAPE_ENTITY, GLYPH_COLUMN))
    if len(set(marks)) != len(marks):
        sys.exit('generate_icon_roster: %s of table %s prints one mark twice, '
                 'so no entry of table %s can be told from another'
                 % (MILESTONE_SHAPE_ROW, SHAPE_TABLE, ICON_TABLE))
    return dict(zip(marks, settled))


def fill_arms_shape(icons, lines):
    """Give every entry the spelling of the shape it arms, or None.

    ⭐ WHY A SEVENTH FIELD AT ALL. The arm column of table T-109 names a KIND of
    arm, and AR-2 stands against four entries while AR-3 stands against eight --
    so a join on that column alone marks four (or eight) entrances as armed at
    once, and FR-053 (MUST) asks for THE armed entrance to be told from the ones
    that are not.
    ⭐ WHERE EACH HALF COMES FROM. An AR-2 entry names its row of table T-012 in
    the entry column, and that row settles the `shapeKind` spelling; an AR-3
    entry prints one of the eight marks SH-5 lists, and `glyph_by_mark` says how
    a mark reaches a `milestoneGlyph` spelling. ⛔ Nothing is minted here: both
    ends of both joins stand in the manuscript.
    """
    # @purity semi-pure-b
    shapes = shape_rows(lines)
    glyphs = glyph_by_mark(shapes)
    armed = []
    for icon in icons:
        if icon['arms'] == TASK_SHAPE_ARM:
            named = [name for name in code_spans(icon['entryTo']) if name in shapes]
            if len(named) != 1:
                sys.exit('generate_icon_roster: %s arms %s and names %d row(s) '
                         'of table %s in its entry column, and exactly one row '
                         'must be named' % (icon['rowId'], TASK_SHAPE_ARM,
                                            len(named), SHAPE_TABLE))
            icon[ARMS_SHAPE_FIELD] = shapes[named[0]][1]
        elif icon['arms'] == MILESTONE_SHAPE_ARM:
            marked = [mark for mark in glyphs if mark in icon['entryTo']]
            if len(marked) != 1:
                sys.exit('generate_icon_roster: %s arms %s and prints %d of the '
                         'marks %s lists, and exactly one mark must be printed'
                         % (icon['rowId'], MILESTONE_SHAPE_ARM, len(marked),
                            MILESTONE_SHAPE_ROW))
            icon[ARMS_SHAPE_FIELD] = glyphs[marked[0]]
            armed.append(icon[ARMS_SHAPE_FIELD])
        else:
            icon[ARMS_SHAPE_FIELD] = None
    if sorted(armed) != sorted(glyphs.values()):
        sys.exit('generate_icon_roster: the rows of table %s that arm %s reach '
                 '%d of the %d spelling(s) of %s.%s, and every one must be '
                 'reached exactly once'
                 % (ICON_TABLE, MILESTONE_SHAPE_ARM, len(set(armed)),
                    len(glyphs), SHAPE_ENTITY, GLYPH_COLUMN))
    told = [icon[ARMS_SHAPE_FIELD] for icon in icons
            if icon['arms'] == TASK_SHAPE_ARM]
    if len(set(told)) != len(told):
        sys.exit('generate_icon_roster: two rows of table %s that arm %s reach '
                 'the same spelling of %s.%s, so neither can be told from the '
                 'other' % (ICON_TABLE, TASK_SHAPE_ARM, SHAPE_ENTITY,
                            SHAPE_COLUMN))


def build():
    """The roster, as it is written out."""
    # @purity semi-pure-b
    lines = read_lines(GLOSSARY)
    surfaces = settled_surfaces(lines)
    table = spec_tables.read(REL_GLOSSARY, ICON_TABLE)
    switch = switch_column(table)
    rows = [without(row.cells, switch) for row in table]
    headings = without(table.headings, switch)
    # the caption line is 1-based; the list below it is 0-based
    wanted = stated_row_count(lines, table.caption_line - 1)
    if len(rows) != wanted:
        sys.exit('generate_icon_roster: table %s holds %d row(s), and the '
                 'sentence above it in %s says %d'
                 % (ICON_TABLE, len(rows), REL_GLOSSARY, wanted))
    icons = [icon_of(row, surfaces) for row in rows]
    seen = sorted(set(icon['rowId'] for icon in icons))
    if len(seen) != len(icons):
        sys.exit('generate_icon_roster: table %s uses %d row id(s) for %d row(s)'
                 % (ICON_TABLE, len(seen), len(icons)))
    fill_arms_shape(icons, read_lines(REQUIREMENTS))
    # The roster does not carry the settings-row column, but it is the table's
    # one reader, so a broken cell stops this run as well as the printer's.
    entry_switches()
    return {
        '$comment': BANNER,
        'columns': dict(zip(FIELDS, headings)),
        'icons': icons,
    }


def switch_column(table):
    """Where the settings-row column stands; refuse any other header shape."""
    # @purity pure
    headings = list(table.headings)
    if (len(headings) != len(FIELDS) + 1
            or headings.count(SWITCH_HEADING) != 1
            or headings.index(SWITCH_HEADING) != SWITCH_AFTER + 1):
        sys.exit('generate_icon_roster: table %s must have %d columns, the '
                 'settings-row column right after column %d; it has %d '
                 'column(s)' % (ICON_TABLE, len(FIELDS) + 1, SWITCH_AFTER + 1,
                                len(headings)))
    return headings.index(SWITCH_HEADING)


def without(cells, index):
    """A row or a header with one column taken out."""
    # @purity pure
    return list(cells[:index]) + list(cells[index + 1:])


def settings_rows():
    """Every row of _source/settings.json by id, with the table it stands in."""
    # @purity semi-pure-b
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    found = {}
    for block in doc['blocks']:
        for row in block.get('rows') or []:
            found[row['id']] = (block.get('id'), row)
    return found


def entry_switches():
    """The settings row each entry of FR-049 and FR-048 rewrites (CR-589).

    Returns [(entry row id, settings key, value or None)] in table order. The
    key is the spelling a T-202 row gives in settings.json for a FR-049 entry,
    and the guide cursor row's id for a FR-048 entry, whose value is the one
    the entry writes. Refuses, naming the row and writing nothing, when the
    column holds anything else, names a row that is not there or is not of
    the right kind, leaves a FR-049 / FR-048 entry blank, or lets two entries
    rewrite the same row (or write the same value) -- FR-029 (MUST NOT) keeps
    one entrance per function.
    """
    # @purity semi-pure-b
    table = spec_tables.read(REL_GLOSSARY, ICON_TABLE)
    switch = switch_column(table)
    rows = settings_rows()
    out = []
    seen = {}
    for row in table:
        cells = row.cells
        entry, authority, cell = cells[0], cells[4], cells[switch]
        flips = authority.startswith('`%s`' % FLIP_REQUIREMENT)
        chooses = authority.startswith('`%s`' % CHOOSE_REQUIREMENT)
        if cell == EM_DASH:
            if flips or chooses:
                sys.exit('generate_icon_roster: %s is an entry of %s and leaves '
                         'the settings-row column of table %s blank'
                         % (entry, FLIP_REQUIREMENT if flips
                            else CHOOSE_REQUIREMENT, ICON_TABLE))
            continue
        plain, valued = SWITCH_PLAIN.match(cell), SWITCH_VALUE.match(cell)
        if not plain and not valued:
            sys.exit('generate_icon_roster: %s writes a settings-row cell that '
                     'is neither an em dash, `S-n`, nor `S-n` with a quoted '
                     'value' % entry)
        target = (plain or valued).group(1)
        if target not in rows:
            sys.exit('generate_icon_roster: %s names %s, which settings.json '
                     'does not hold' % (entry, target))
        table_id, settings_row = rows[target]
        if plain:
            spelled = settings_row.get('type')
            if isinstance(spelled, dict):
                spelled = spelled.get('ja')
            if not flips or table_id != BOOLEAN_TABLE or spelled != u'真偽':
                sys.exit('generate_icon_roster: %s names %s, but a plain cell '
                         'must name a boolean row of table %s from an entry '
                         'of %s' % (entry, target, BOOLEAN_TABLE,
                                    FLIP_REQUIREMENT))
            key = (settings_row.get('key') or '').strip('`')
            value = None
            twin_key = target
        else:
            if not chooses or target != GUIDE_CURSOR_ROW:
                sys.exit('generate_icon_roster: %s names %s with a value, but '
                         'only an entry of %s may, and only for %s'
                         % (entry, target, CHOOSE_REQUIREMENT, GUIDE_CURSOR_ROW))
            key, value = target, valued.group(2)
            twin_key = (target, value)
        if twin_key in seen:
            sys.exit('generate_icon_roster: %s and %s rewrite the same setting '
                     '(%s); FR-029 keeps one entrance per function'
                     % (seen[twin_key], entry, target))
        seen[twin_key] = entry
        out.append((entry, key, value))
    return out


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
