# -*- coding: utf-8 -*-
"""Write the roster of time zones of table T-376 into src/.

    python tools/generate_time_zone_roster.py
    python tools/generate_time_zone_roster.py --check

Table T-376 (FR-156) holds the time zones a document may name, in the order
the choosers offer them. The time-zone unit of the Schedule component reads
this roster instead of typing the region names out: rule 03 of
docs/development-rules forbids re-typing a value the specification holds, and
`npm run gen:check` is what fails when the manuscript moves on without the
roster.

The roster is a bare JSON array of
    { "rowId": "ZN-n", "region": "<IANA name>",
      "standardOffsetMinutes": <integer>, "observesDaylightSaving": <bool> }
in the table's print order. The words each row shows are NOT carried here:
the dictionary (display-words.json, section timeZones) holds them by the same
row id, and the row id is the only join. The standard offset is carried for
the one reader that has no instant to ask the region at (FR-156: a region not
in the table falls to the row of the same offset at that moment -- the moment
is the reader's, the offset of each row at it comes from the region rules).

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
REGION_HEADING = u'地域名'
OFFSET_HEADING = u'標準時の UTC の差'
DAYLIGHT_HEADING = u'夏時間'
DAYLIGHT_YES = u'有'
DAYLIGHT_NO = u'—'

ROW_ID = re.compile(r'^ZN-\d+$')
REGION = re.compile(r'^`([A-Za-z_]+(?:/[A-Za-z_+\-0-9]+)*)`$')
# The table writes the sign as U+2212 (minus), "+" or U+00B1 (plus-minus, zero).
OFFSET = re.compile(u'^([−+±])(\\d{2}):(\\d{2})$')


def offset_minutes(row_id, cell):
    """The standard UTC offset one row writes, in minutes east of UTC."""
    # @purity pure
    hit = OFFSET.match(cell)
    if hit is None:
        sys.exit('generate_time_zone_roster: %s of table %s writes the offset '
                 '%r, which is not [sign]HH:MM' % (row_id, ZONE_TABLE, cell))
    minutes = int(hit.group(2)) * 60 + int(hit.group(3))
    sign = hit.group(1)
    if sign == u'±' and minutes != 0:
        sys.exit('generate_time_zone_roster: %s of table %s writes a '
                 'plus-minus sign on a non-zero offset' % (row_id, ZONE_TABLE))
    return -minutes if sign == u'−' else minutes


def daylight_of(row_id, cell):
    """Whether one row's region moves its offset with the seasons."""
    # @purity pure
    if cell == DAYLIGHT_YES:
        return True
    if cell == DAYLIGHT_NO:
        return False
    sys.exit('generate_time_zone_roster: %s of table %s writes %r for '
             'daylight saving, neither %s nor %s'
             % (row_id, ZONE_TABLE, cell, DAYLIGHT_YES, DAYLIGHT_NO))


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
        region = REGION.match(row.cell(REGION_HEADING))
        if region is None:
            sys.exit('generate_time_zone_roster: %s of table %s writes no '
                     'back-quoted region name' % (row_id, ZONE_TABLE))
        roster.append({
            'rowId': row_id,
            'region': region.group(1),
            'standardOffsetMinutes': offset_minutes(row_id, row.cell(OFFSET_HEADING)),
            'observesDaylightSaving': daylight_of(row_id, row.cell(DAYLIGHT_HEADING)),
        })
    regions = [one['region'] for one in roster]
    if len(set(regions)) != len(regions):
        sys.exit('generate_time_zone_roster: table %s offers one region twice'
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
