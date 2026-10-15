# -*- coding: utf-8 -*-
"""Write the roster of time zones of table T-376 into src/.

    python tools/generate_time_zone_roster.py
    python tools/generate_time_zone_roster.py --check

Table T-376 (FR-156) holds the time zones a document may name, in the order
the choosers offer them. A time zone is one fixed UTC offset and one
abbreviation (CR-755): the stored value is the row's key, daylight saving is
never applied by season, and a daylight-time row is its own row read at its
offset all year. The time-zone unit of the Schedule component reads this
roster instead of typing the keys out: rule 03 of docs/development-rules
forbids re-typing a value the specification holds, and `npm run gen:check` is
what fails when the manuscript moves on without the roster.

The roster is a bare JSON array of
    { "rowId": "ZN-n", "key": "UTC+09:00", "offsetMinutes": <integer>,
      "isDaylight": <bool>, "abbreviation": "JST" | null }
in the table's print order. The place a person reads is NOT carried here:
the dictionary (display-words.json, section timeZones) holds it by the same
row id, and the row id is the only join.

The schema generator (docs/spec/_source/erd_json_to_schema.py) reads build()
too: the enum of the schedule data's time zone is the standard-time keys, the
enum of the display time zones every key (CR-751's mechanism, CR-755's values).

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
OUT = os.path.join(ROOT, 'src', 'entity', 'document-model', 'schedule',
                   'time-zone-roster.json')

REL_REQUIREMENTS = 'docs/spec/01-04-requirements.md'
REL_OUT = 'src/entity/document-model/schedule/time-zone-roster.json'
REL_SELF = 'tools/generate_time_zone_roster.py'

ZONE_TABLE = 'T-376'
KEY_HEADING = u'鍵'
OFFSET_HEADING = u'UTC の差'
KIND_HEADING = u'種'
ABBREVIATION_HEADING = u'略称'
KIND_STANDARD = u'標準時'
KIND_DAYLIGHT = u'夏時間'
NO_ABBREVIATION = u'—'

ROW_ID = re.compile(r'^ZN-\d+$')
# The key: UTC, an ASCII sign, two-digit hours, a colon, two-digit minutes,
# and " DST" on a daylight-time row only.
KEY = re.compile(r'^`(UTC([+-])(\d{2}):(\d{2})( DST)?)`$')
# The offset cell writes the sign as U+2212 (minus), "+" or U+00B1 (plus-minus, zero).
OFFSET = re.compile(u'^([−+±])(\\d{2}):(\\d{2})$')
ABBREVIATION = re.compile(r'^[A-Z]{2,5}$')


def refuse(row_id, what):
    """Stop the build, naming the row of table T-376 that broke a rule."""
    # @purity non-pure
    sys.exit('generate_time_zone_roster: %s of table %s %s'
             % (row_id, ZONE_TABLE, what))


def offset_minutes(row_id, cell):
    """The UTC offset one row writes, in minutes east of UTC."""
    # @purity pure
    hit = OFFSET.match(cell)
    if hit is None:
        refuse(row_id, 'writes the offset %r, which is not [sign]HH:MM' % cell)
    minutes = int(hit.group(2)) * 60 + int(hit.group(3))
    sign = hit.group(1)
    if (sign == u'±') != (minutes == 0):
        refuse(row_id, 'writes the plus-minus sign on a non-zero offset, or '
                       'a zero offset without it')
    return -minutes if sign == u'−' else minutes


def key_of(row_id, cell, offset, is_daylight):
    """The stored key of one row, checked against its offset and kind cells."""
    # @purity pure
    hit = KEY.match(cell)
    if hit is None:
        refuse(row_id, 'writes the key %r, which is not `UTC+HH:MM` with an '
                       'optional " DST"' % cell)
    minutes = int(hit.group(3)) * 60 + int(hit.group(4))
    if (-minutes if hit.group(2) == '-' else minutes) != offset:
        refuse(row_id, 'writes a key whose offset disagrees with its %s cell'
               % OFFSET_HEADING)
    if (hit.group(5) is not None) != is_daylight:
        refuse(row_id, 'writes " DST" on a row whose kind is not %s, or a %s '
                       'row without it' % (KIND_DAYLIGHT, KIND_DAYLIGHT))
    return hit.group(1)


def is_daylight_of(row_id, cell):
    """Whether one row is a daylight-time row."""
    # @purity pure
    if cell == KIND_DAYLIGHT:
        return True
    if cell == KIND_STANDARD:
        return False
    refuse(row_id, 'writes the kind %r, neither %s nor %s'
           % (cell, KIND_STANDARD, KIND_DAYLIGHT))


def abbreviation_of(row_id, cell):
    """The one abbreviation a row shows, or None for a row without one."""
    # @purity pure
    if cell == NO_ABBREVIATION:
        return None
    if ABBREVIATION.match(cell) is None:
        refuse(row_id, 'writes the abbreviation %r, which is neither 2 to 5 '
                       'capital letters nor %s' % (cell, NO_ABBREVIATION))
    return cell


def build():
    """The roster, as it is written out."""
    # @purity semi-pure-b
    table = spec_tables.read(REL_REQUIREMENTS, ZONE_TABLE)
    roster = []
    for row in table:
        row_id = row.cells[0]
        if not ROW_ID.match(row_id):
            sys.exit('generate_time_zone_roster: table %s holds a row %r whose '
                     'id is not ZN-n' % (ZONE_TABLE, row_id))
        offset = offset_minutes(row_id, row.cell(OFFSET_HEADING))
        is_daylight = is_daylight_of(row_id, row.cell(KIND_HEADING))
        roster.append({
            'rowId': row_id,
            'key': key_of(row_id, row.cell(KEY_HEADING), offset, is_daylight),
            'offsetMinutes': offset,
            'isDaylight': is_daylight,
            'abbreviation': abbreviation_of(row_id, row.cell(ABBREVIATION_HEADING)),
        })
    keys = [one['key'] for one in roster]
    if len(set(keys)) != len(keys):
        sys.exit('generate_time_zone_roster: table %s offers one key twice'
                 % ZONE_TABLE)
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
        sys.stdout.write('OK       the time zone roster matches its manuscript '
                         '(%d zone(s))\n' % len(roster))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    sys.stdout.write('wrote %s (%d zone(s), %d byte(s))\n'
                     % (REL_OUT, len(roster), len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
