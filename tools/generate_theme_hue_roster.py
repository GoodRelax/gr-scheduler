# -*- coding: utf-8 -*-
"""Write the roster of theme hues of table T-305 into src/.

    python tools/generate_theme_hue_roster.py
    python tools/generate_theme_hue_roster.py --check

Table T-305 (FR-041) holds the hues the document settings surface offers, in
the order they are offered. The Properties Panel reads this roster instead of
typing the hues out: rule 03 of docs/development-rules forbids re-typing a
value the specification holds, and `npm run gen:check` is what fails when the
manuscript moves on without the roster.

The roster is a bare JSON array of { "rowId": "TH-n", "hue": <integer> } in the
table's print order. The words each row shows are NOT carried here: the
dictionary (display-words.json, section themeHues) holds them by the same row
id, and the row id is the only join.

A cell that names a settings row instead of a number -- TH-1 says it is the
same as S-73's default -- is resolved against docs/spec/_source/settings.json,
so the default is never typed here a second time.

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
SETTINGS = os.path.join(ROOT, 'docs', 'spec', '_source', 'settings.json')
OUT = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer',
                   'theme-hue-roster.json')

REL_REQUIREMENTS = 'docs/spec/01-04-requirements.md'
REL_SETTINGS = 'docs/spec/_source/settings.json'
REL_OUT = 'src/adapter/screen-renderer/theme-hue-roster.json'
REL_SELF = 'tools/generate_theme_hue_roster.py'

HUE_TABLE = 'T-305'
# The settings row whose bounds every hue must sit inside (the column the
# chosen hue is written to, Project.themeHue).
HUE_SETTING = 'S-73'

ROW_ID = re.compile(r'^TH-\d+$')
PLAIN_HUE = re.compile(r'^\d+$')
# A cell that names a settings row: "`S-73` ..." -- only the row id is read,
# and only a row that is HUE_SETTING itself is accepted (see hue_of).
NAMED_ROW = re.compile(r'^`(S-\d+[a-z]?)`')


def settings_row(row_id):
    """One row of _source/settings.json by id, or a refusal naming it."""
    # @purity semi-pure-b
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    for block in doc['blocks']:
        for row in block.get('rows') or []:
            if row.get('id') == row_id:
                return row
    sys.exit('generate_theme_hue_roster: %s holds no row %s'
             % (REL_SETTINGS, row_id))


def number_of(row, field):
    """The integer a settings row writes in one of its num fields."""
    # @purity pure
    cell = row.get(field) or {}
    text = cell.get('num') if isinstance(cell, dict) else None
    if text is None or not PLAIN_HUE.match(str(text)):
        sys.exit('generate_theme_hue_roster: %s of %s writes %r in %s, which '
                 'is not a whole number' % (row.get('id'), REL_SETTINGS, cell,
                                            field))
    return int(text)


def hue_of(row_id, cell, setting):
    """The hue one row of table T-305 stands for."""
    # @purity pure
    if PLAIN_HUE.match(cell):
        hue = int(cell)
    else:
        named = NAMED_ROW.match(cell)
        if named is None or named.group(1) != HUE_SETTING:
            sys.exit('generate_theme_hue_roster: %s of table %s writes %r, '
                     'which is neither a whole number nor a cell naming %s'
                     % (row_id, HUE_TABLE, cell, HUE_SETTING))
        hue = number_of(setting, 'default')
    low, high = number_of(setting, 'min'), number_of(setting, 'max')
    if hue < low or hue > high:
        sys.exit('generate_theme_hue_roster: %s of table %s is %d, outside '
                 'the range %s allows' % (row_id, HUE_TABLE, hue, HUE_SETTING))
    return hue


def build():
    """The roster, as it is written out."""
    # @purity semi-pure-b
    table = spec_tables.read(REL_REQUIREMENTS, HUE_TABLE)
    if len(table.headings) != 2:
        sys.exit('generate_theme_hue_roster: table %s must have 2 columns '
                 '(row id, hue); it has %d' % (HUE_TABLE, len(table.headings)))
    setting = settings_row(HUE_SETTING)
    roster = []
    for row in table:
        row_id, cell = row.cells[0], row.cells[1]
        if not ROW_ID.match(row_id):
            sys.exit('generate_theme_hue_roster: table %s holds a row %r whose '
                     'id is not TH-n' % (HUE_TABLE, row_id))
        roster.append({'rowId': row_id, 'hue': hue_of(row_id, cell, setting)})
    ids = [one['rowId'] for one in roster]
    hues = [one['hue'] for one in roster]
    if len(set(ids)) != len(ids):
        sys.exit('generate_theme_hue_roster: table %s uses one row id twice'
                 % HUE_TABLE)
    if len(set(hues)) != len(hues):
        sys.exit('generate_theme_hue_roster: table %s offers one hue twice, so '
                 'the field could not tell two rows apart' % HUE_TABLE)
    return roster


def main():
    """Write the roster, or say whether the one on disk still matches."""
    # @purity non-pure
    roster = build()
    body = json.dumps(roster, ensure_ascii=True, indent=1) + '\n'
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            sys.stdout.write('PROBLEM  %s has not been written yet\n' % REL_OUT)
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body:
            sys.stdout.write('PROBLEM  %s has drifted from its manuscript -- '
                             'run `python %s`\n' % (REL_OUT, REL_SELF))
            return 1
        sys.stdout.write('OK       the theme hue roster matches its manuscript '
                         '(%d hue(s))\n' % len(roster))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    sys.stdout.write('wrote %s (%d hue(s), %d byte(s))\n'
                     % (REL_OUT, len(roster), len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
