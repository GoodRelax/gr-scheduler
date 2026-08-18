# -*- coding: utf-8 -*-
"""Write the bundled startup template (FR-027, table T-226).

    python tools/generate_startup_template.py
    python tools/generate_startup_template.py --check

FR-027 requires the template to be a bundled `GRS JSON` and forbids building
the document in code, so that the same validator the import path uses can be
pointed at it. This script is the manuscript; the JSON it writes is the
artifact, and the artifact is what ships.

⛔ Nothing here invents a value the specification has decided. The 97 keys of
`documentSettings` come from SETTINGS_DEFAULTS, which
tools/generate_entity_types.py writes out of docs/spec/_source/settings.json,
so a default changed in the manuscript reaches the template on the next
`npm run gen` and never drifts.

The shape the template must have is table T-226: software development, three
years, seven phases drawn as chevrons with a milestone each, a forest of
top-level rows, 100 rows at five levels, 1000 tasks spread unevenly.
"""
import io
import json
import os
import re
import sys
import uuid
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SETTINGS_TS = os.path.join(ROOT, 'src', 'entity', 'document-model',
                           'document-settings', 'document-settings.ts')
OUT = os.path.join(ROOT, 'src', 'framework', 'single-html-shell',
                   'startup-template.json')

# FR-073: the format version is a date, compared as a plain string.
SCHEMA_VERSION = '2026-08-18'

# TP-2. Three years of working days, starting on a Wednesday so the first
# phase does not begin on a week boundary.
PROJECT_START = date(2026, 4, 1)
PROJECT_END = date(2029, 3, 30)

# TP-3. Seven phases, deliberately overlapping: a plan where design ends
# before build starts is not one anybody has worked to.
PHASES = [
    ('Market Research', date(2026, 4, 1), date(2026, 7, 31), 'circle'),
    ('Research', date(2026, 6, 1), date(2026, 11, 30), 'hexagon'),
    ('Planning', date(2026, 10, 1), date(2027, 3, 31), 'pentagon'),
    ('Design', date(2027, 2, 1), date(2027, 10, 29), 'diamond'),
    ('Implementation', date(2027, 8, 2), date(2028, 9, 29), 'square'),
    ('Test', date(2028, 6, 1), date(2029, 1, 31), 'triangleUp'),
    ('Delivery', date(2029, 1, 4), date(2029, 3, 30), 'star'),
]

# TP-4 and TP-5. A forest: the first tree is the overview band, the rest are
# the parts of the product. Each entry is (label, [children]); the depth of
# the deepest branch is five, which is what FR-004 caps.
#
# ⛔ Names stay inside general software-development vocabulary (FR-027's one
# exception). No industry and no product is named.
TREE = [
    ('Total System', [
        ('Phases', []),
    ]),
    ('Smartphone App', [
        ('iOS', [
            ('Screens', [('Sign In', [('Layout', []), ('Validation', [])]),
                         ('Home', [('List View', []), ('Detail View', [])]),
                         ('Settings', [])]),
            ('Local Store', [('Schema', []), ('Migration', [])]),
            ('Push Notification', [('Registration', []), ('Delivery', [])]),
        ]),
        ('Android', [
            ('Screens', [('Sign In', [('Layout', []), ('Validation', [])]),
                         ('Home', [('List View', []), ('Detail View', [])]),
                         ('Settings', [])]),
            ('Local Store', [('Schema', []), ('Migration', [])]),
            ('Push Notification', [('Registration', []), ('Delivery', [])]),
        ]),
    ]),
    ('Web Server', [
        ('API', [
            ('Account', [('Sign Up', []), ('Sign In', []), ('Password Reset', [])]),
            ('Content', [('Search', []), ('Upload', [])]),
            ('Reporting', [('Daily Summary', [])]),
        ]),
        ('Batch', [('Nightly Job', []), ('Retry Queue', []), ('Dead Letter', [])]),
        ('Authentication', [('Token', []), ('Session', [])]),
    ]),
    ('Web Front End', [
        ('Screens', [('Dashboard', [('Chart Panel', []), ('Filter Bar', [])]),
                     ('Admin', [('User List', []), ('Audit Log', [])])]),
        ('State Store', [('Cache', [])]),
        ('Build Pipeline', [('Bundling', []), ('Asset Optimisation', [])]),
    ]),
    ('Database', [
        ('Schema', [('Core Tables', [('Account Table', []), ('Content Table', [])]),
                    ('Index', [])]),
        ('Migration', [('Forward', []), ('Rollback', [])]),
        ('Tuning', [('Query Plan', []), ('Connection Pool', [])]),
    ]),
    ('PC Client', [
        ('Application', [('Main Window', [('Editor Pane', []), ('Preview Pane', [])]),
                         ('Preferences', [])]),
        ('Installer', [('Packaging', []), ('Signing', [])]),
        ('Auto Update', [('Check', []), ('Download', [])]),
    ]),
    ('Quality And Release', [
        ('Test Plan', [('Unit', []), ('Integration', []), ('Acceptance', [])]),
        ('Release', [('Staging', []), ('Production', [])]),
        ('Documentation', [('User Guide', []), ('Release Note', []),
                           ('Api Reference', [])]),
    ]),
]

WANTED_ROWS = 100   # TP-5
WANTED_TASKS = 1000  # TP-6

# TP-7 forbids an even spread. These counts repeat down the row list; the
# figures are ordinary team-sized chunks of work, and the last row absorbs
# whatever the cycle leaves over so the total lands exactly on TP-6.
TASKS_PER_ROW_CYCLE = [6, 14, 9, 21, 5, 12, 30, 8, 17, 4, 11, 25, 7, 16, 10]

# A fixed namespace, so every run writes the same TaskGroup ids. A template
# that changed its ids each rebuild would show up as a diff in every commit.
ID_NAMESPACE = uuid.UUID('6f9619ff-8b86-d011-b42d-00c04fc964ff')


def settings_defaults():
    """The 97 presentation values, read from what the manuscript generated.

    ⛔ Deliberately NOT a second reading of docs/spec/_source/settings.json.
    That file is the manuscript, and tools/generate_entity_types.py already
    resolves it; parsing it again here would put a second interpretation of
    the same source in the tree, which is the failure R4 is about.
    """
    text = io.open(SETTINGS_TS, encoding='utf-8').read()
    found = re.search(r'export const SETTINGS_DEFAULTS[^=]*=\s*\{(.*?)\n\}',
                      text, re.S)
    if not found:
        sys.exit('generate_startup_template: SETTINGS_DEFAULTS is not in %s -- '
                 'run `npm run types` first' % os.path.relpath(SETTINGS_TS, ROOT))
    body = found.group(1)
    # ⚠️ Values are not all scalars: exportCanvas, fontScaleSizes,
    # planActualGuidePattern and shapeHeightOf are nested objects, so this
    # reads the literal WHOLE rather than line by line. The block is machine
    # written, which is what makes the two rewrites below safe -- every key
    # and string in it is single quoted and holds no apostrophe.
    if '"' in body:
        sys.exit('generate_startup_template: SETTINGS_DEFAULTS now holds a '
                 'double quote; the reader below assumes it does not')
    literal = re.sub(r'^\s*//.*$', '', body, flags=re.M)   # the block explains its gaps
    literal = '{%s}' % literal.replace("'", '"')
    # JSON forbids the trailing comma the generated block ends every entry
    # with. Closing the object first means the last one is caught too.
    literal = re.sub(r',(\s*[}\]])', r'\1', literal)
    try:
        flat = json.loads(literal)
    except ValueError as why:
        sys.exit('generate_startup_template: cannot read SETTINGS_DEFAULTS: %s' % why)
    # ⚠️ SETTINGS_DEFAULTS is flat and spells a nested value with a dot
    # ("fontScaleSizes.L"), while the GRS JSON schema wants the object. The
    # dot is the manuscript's own notation for one key inside another, so
    # rebuilding the nesting here is reading it, not reinterpreting it.
    out = {}
    for key, value in flat.items():
        head, dot, tail = key.partition('.')
        if dot:
            out.setdefault(head, {})[tail] = value
        else:
            out[key] = value
    return out


def flatten(tree, parent=None, depth=1, rows=None):
    """The row forest, depth first, each row carrying its parent and depth."""
    rows = [] if rows is None else rows
    for order, (label, children) in enumerate(tree):
        row = {'label': label, 'parent': parent, 'depth': depth, 'order': order}
        row['id'] = str(uuid.uuid5(ID_NAMESPACE, '%s/%s' % (
            parent['id'] if parent else '', label)))
        rows.append(row)
        flatten(children, row, depth + 1, rows)
    return rows


def text_of(day):
    return day.isoformat()


def working_span(start, length_days):
    """A span that starts on a weekday and ends on one, IV-10 kept."""
    while start.weekday() >= 5:
        start += timedelta(days=1)
    finish = start + timedelta(days=max(0, length_days - 1))
    while finish.weekday() >= 5:
        finish += timedelta(days=1)
    return start, finish


def phase_for(index):
    return PHASES[index % len(PHASES)]


def build():
    rows = flatten(TREE)
    if len(rows) != WANTED_ROWS:
        sys.exit('generate_startup_template: the tree holds %d rows, and table '
                 'T-226 row TP-5 asks for %d' % (len(rows), WANTED_ROWS))
    deepest = max(r['depth'] for r in rows)
    if deepest > 5:
        sys.exit('generate_startup_template: the tree is %d deep; FR-004 caps '
                 'the row depth at 5' % deepest)

    task_groups, members, tasks, visuals = [], [], [], []
    uid = [0]

    def next_uid():
        uid[0] += 1
        return uid[0]

    for row in rows:
        task_groups.append({
            'id': row['id'],
            'parentId': row['parent']['id'] if row['parent'] else None,
            'label': row['label'],
            'derivedFromTaskUid': None,
            'order': row['order'],
            'isCollapsed': False,
            'isHidden': False,
            'color': None,
            'height': None,
        })

    # How many tasks each row carries (TP-7). The two overview rows are fixed
    # at seven each -- one milestone and one chevron per phase -- and the rest
    # take the cycle.
    overview = {'Total System', 'Phases'}
    counts = [len(PHASES) if row['label'] in overview
              else TASKS_PER_ROW_CYCLE[i % len(TASKS_PER_ROW_CYCLE)]
              for i, row in enumerate(rows)]

    # The cycle fixes the SHAPE of the spread, not its total. Scale the rows
    # that are free to move until the total is TP-6 exactly, then hand the
    # rounding residue to the biggest rows one at a time -- biggest first, so
    # a row never drops to zero and the unevenness the cycle put there
    # survives. Every step is decided by the row order, so two runs agree.
    free = [i for i, row in enumerate(rows) if row['label'] not in overview]
    fixed_total = sum(counts[i] for i, row in enumerate(rows)
                      if row['label'] in overview)
    target = WANTED_TASKS - fixed_total
    raw = sum(counts[i] for i in free)
    for i in free:
        counts[i] = max(1, int(round(counts[i] * target / float(raw))))
    order = sorted(free, key=lambda i: (-counts[i], i))
    step = 1 if sum(counts[i] for i in free) < target else -1
    cursor = 0
    while sum(counts[i] for i in free) != target:
        i = order[cursor % len(order)]
        if step < 0 and counts[i] <= 1:
            cursor += 1
            continue
        counts[i] += step
        cursor += 1

    def add_task(row, name, start, finish, milestone, wbs_parent, shape, glyph):
        task_uid = next_uid()
        tasks.append({
            'uid': task_uid,
            'wbsParentUid': wbs_parent,
            'wbsOrder': len(tasks),
            'name': name,
            'start': text_of(start),
            'finish': text_of(finish),
            'milestone': milestone,
            'deadline': None,
            'notes': None,
            'calendarUid': None,
            'actualStart': None,
            'actualDuration': None,
            'actualFinish': None,
            'resume': None,
            'resumeValid': None,
            'percentComplete': 0,
            'fadeInDays': None,
            'fadeOutDays': None,
            'dependencies': [],
            'carry': {},
            'carryElements': [],
        })
        members.append({'taskUid': task_uid, 'groupId': row['id'],
                        'stackOrder': None})
        if shape is not None:
            visuals.append({
                'taskUid': task_uid,
                'nameAnchor': None,
                'nameAlign': None,
                'shapeKind': shape,
                'milestoneGlyph': glyph,
                'fillColor': None,
                'strokeColor': None,
                'lineWeight': None,
            })
        return task_uid

    # Every task on a row of depth d hangs off the FIRST task of the parent
    # row, so the WBS depth of a task equals the depth of the row it sits on
    # (TP-8). The forest keeps IV-4 acyclic by construction.
    first_task_of = {}

    for row, count in zip(rows, counts):
        parent_uid = None
        if row['parent'] is not None:
            parent_uid = first_task_of.get(row['parent']['id'])
        if row['label'] == 'Total System':
            for name, start, finish, glyph in PHASES:
                got = add_task(row, '%s Complete' % name, finish, finish,
                               True, parent_uid, 'milestone', glyph)
                first_task_of.setdefault(row['id'], got)
            continue
        if row['label'] == 'Phases':
            for name, start, finish, _glyph in PHASES:
                got = add_task(row, name, start, finish, False, parent_uid,
                               'chevron', None)
                first_task_of.setdefault(row['id'], got)
            continue
        for n in range(count):
            name, p_start, p_finish, _glyph = phase_for(n + row['depth'] + row['order'])
            window = (p_finish - p_start).days
            offset = (n * 13 + row['order'] * 7 + row['depth'] * 3) % max(1, window - 5)
            length = 5 + (n * 7 + row['depth'] * 11) % 30
            start, finish = working_span(p_start + timedelta(days=offset), length)
            if finish > PROJECT_END:
                finish = PROJECT_END
            if start > finish:
                start = finish
            got = add_task(row, '%s %s %d' % (row['label'], name.split()[0], n + 1),
                           start, finish, False, parent_uid, None, None)
            first_task_of.setdefault(row['id'], got)

    if len(tasks) != WANTED_TASKS:
        sys.exit('generate_startup_template: built %d tasks, and table T-226 '
                 'row TP-6 asks for %d' % (len(tasks), WANTED_TASKS))

    calendar = {
        'uid': 1,
        'name': 'Standard',
        'isBaseCalendar': True,
        'baseCalendarUid': None,
        'ordinal': 0,
        'carry': {},
        'carryElements': [],
        # dayType is the 1 = Sunday encoding; S-106 lists the working ones.
        'weekDays': [{'ordinal': d - 1, 'dayType': d,
                      'dayWorking': d in (2, 3, 4, 5, 6),
                      'carry': {}, 'carryElements': []}
                     for d in range(1, 8)],
        'exceptions': [],
    }

    project = {
        'id': None,
        'name': 'Product Development Plan',
        'title': 'Product Development Plan',
        'subject': None,
        'category': None,
        'company': None,
        'manager': None,
        'author': None,
        'created': None,
        'revision': 1,
        'lastSaved': None,
        'startDate': text_of(PROJECT_START),
        'statusDate': None,
        'minutesPerDay': None,
        'minutesPerWeek': None,
        'daysPerMonth': None,
        'weekStartDay': 1,
        'calendarUid': 1,
        'themeHue': 214,
        'uidHighWaterMark': uid[0],
        'importSeq': 0,
        'carry': {},
        'carryElements': [],
    }

    # ⛔ No "$comment" banner rides in this file, and that is deliberate. The
    # GRS JSON schema closes its root with additionalProperties:false, so a
    # banner would make the template fail the very validator FR-027 wants it
    # to pass. The back-pointer lives in this generator and in
    # `npm run gen:check`, which fails the moment the artifact drifts.
    return {
        'schemaVersion': SCHEMA_VERSION,
        'schedule': {
            'project': project,
            'calendars': [calendar],
            'tasks': tasks,
            'resources': [],
            'assignments': [],
            'taskGroups': task_groups,
            'taskGroupMembers': members,
            'taskVisuals': visuals,
            'commentBoxes': [],
            'highlightBoxes': [],
            'taskOrigins': [],
            'baselineTasks': [],
        },
        'documentSettings': settings_defaults(),
        'revisionStamp': {
            'revision': 1,
            'lastEditedBy': 'template',
            'updatedAt': '2026-08-18T00:00:00Z',
        },
        'changeLog': [],
    }


SCHEMA = os.path.join(ROOT, 'docs', 'spec', '_source', 'grs-document.schema.json')


def assert_settings_complete(settings):
    """Refuse to write a document the GRS JSON schema would reject.

    ⛔ FR-024 makes every presentation key mandatory, and FR-027 wants this
    file to pass the same validator the import path uses. So a missing key is
    not something to paper over with a literal: writing the number here would
    put a second copy of a specified value in the tree, which rule 03 of
    docs/development-rules forbids and CR-175 and CR-178 exist to undo.

    ⭐ The way out is the one the user already ruled on (CR-175): widen the
    generator's reach so docs/spec/_source/settings.json states the value
    machine readably, and it arrives here on its own.
    """
    schema = json.load(io.open(SCHEMA, encoding='utf-8'))
    wanted = schema['properties']['documentSettings']['required']
    missing = [key for key in wanted if key not in settings]
    if missing:
        sys.exit(
            'generate_startup_template: %d presentation value(s) are not stated\n'
            '  machine readably by docs/spec/_source/settings.json, so the\n'
            '  template cannot be written without copying them:\n'
            '    %s\n'
            '  ⛔ Do not write them here. Widen the manuscript instead (CR-175).'
            % (len(missing), '\n    '.join(missing)))


def main():
    document = build()
    assert_settings_complete(document['documentSettings'])
    body = json.dumps(document, ensure_ascii=False, indent=1) + '\n'
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            sys.stdout.write('PROBLEM  %s has not been written yet\n'
                             % os.path.relpath(OUT, ROOT))
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body:
            sys.stdout.write('PROBLEM  %s has drifted from its manuscript -- '
                             'run `python tools/generate_startup_template.py`\n'
                             % os.path.relpath(OUT, ROOT))
            return 1
        sys.stdout.write('OK       the startup template matches its manuscript '
                         '(%d row(s), %d task(s))\n'
                         % (len(document['schedule']['taskGroups']),
                            len(document['schedule']['tasks'])))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    sys.stdout.write('wrote %s (%d row(s), %d task(s), %d byte(s))\n'
                     % (os.path.relpath(OUT, ROOT),
                        len(document['schedule']['taskGroups']),
                        len(document['schedule']['tasks']), len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
