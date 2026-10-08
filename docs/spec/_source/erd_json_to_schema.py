# -*- coding: utf-8 -*-
"""Build the `GRS JSON` schema from the two sources Chapter 6.2 names.

  schedule group      docs/spec/_source/erd.json     (the "json" key of
                      every column carries the machine-readable type)
  documentSettings    docs/spec/_assets/tbl-settings.md     (read in its present
                      table form, as Chapter 6.2 requires)

Output: docs/spec/_source/grs-document.schema.json -- a generated artifact.
It sits beside the manuscripts because it belongs to no language: the ja/en
split divides _assets/, and this schema is the ONE format contract of
FR-024, read by machines and exchange partners rather than looked up by a
person (CR-175).
Never edit it by hand; run this instead.

  python erd_json_to_schema.py            write the schema
  python erd_json_to_schema.py --check    fail if the file on disk has drifted
  python erd_json_to_schema.py --report   print what the sources left open

This generator never invents a value.  Where a source names how many members
an enumeration has but not their spellings, the property widens to a plain
string and the omission is recorded in the schema and printed by --report.

⭐ THE SCHEMA EXPLAINS ITSELF TO ONE WHO HAS ONLY IT (CR-642). Its reader is
the writer of a document -- an AI included -- holding this one file, so:
  - a description says a summary and the reason, never what the name and the
    structure already say, and names no specification ID (Chapter 6.2). A
    column's description is its `schemaNote` in erd.json; most columns have
    none, on purpose. A note that needs a value of table T-209 names the row
    (`{{S-128}}`) and the value is printed from settings.json (CR-644);
  - every date column (`isDate` in erd.json) points at one `$defs/DateTime`,
    whose pattern is the lexical form of xsd:dateTime, the type MS Project
    gives every date (CR-643). It is a promise to the writer (FR-024) and NOT a
    reading condition: tools/generate_json_schema_validator.py drops it, since
    FR-023 drops an unusable date row by row where the walker would refuse the
    whole file (Chapter 6.1). `scrollDate` carries the same pattern inline,
    because tools/generate_entity_types.py types a presentation key from its
    own node and cannot follow a reference;
  - every time-of-day column (`isTime`, Project.defaultStartTime /
    defaultFinishTime) points at one `$defs/Time` with the lexical form of
    xsd:time, and that pattern IS a reading condition (CR-646): the column
    sits on the one Project, so no row can be dropped in its place;
  - a documentSettings key's description is its row's `schemaNote` in
    settings.json (stackDirection, CR-646), under the column's rule;
  - `schemaVersion` is the `const` of this build's version, read from
    tools/generate_startup_template.py (SCHEMA_VERSION), never retyped; the
    reader judges the version itself (FR-073), so the validator drops it too;
  - every `carry` points at one `$defs/Carry`, so its reason is said once;
  - every documentSettings key carries its `default`, and a bound the table
    writes as the name of a constant (`zoomMin`) is carried as that constant's
    number. ⛔ Both are READ, never retyped: the values come from
    settings.json through the very functions tools/generate_entity_types.py
    prints SETTINGS_DEFAULTS with, so the schema is not a third copy;
  - a column whose default a settings row decides names that row
    (`defaultFrom`, `S-73` for Project.themeHue) and the row is read.
Run with PYTHONIOENCODING=utf-8.
"""
import collections
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# tools/generate_entity_types.py owns the one reading of settings.json's
# defaults and bound fields; it is imported, not copied (CR-642).
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(HERE))),
                                'tools'))
import generate_entity_types as settings_reader  # noqa: E402
# ⭐ The format version has ONE source, the build's own startup document
# (DR-4 of table T-052); the schema's `const` is read from it (CR-643).
from generate_startup_template import SCHEMA_VERSION  # noqa: E402
# HERE is docs/spec/_source/ (the manuscripts, which belong to no language);
# what it writes goes to docs/spec/_assets/ (CR-175).
ASSETS = os.path.join(os.path.dirname(HERE), '_assets')
ERD = os.path.join(HERE, 'erd.json')
SETTINGS = os.path.join(ASSETS, 'tbl-settings.md')
OUT = os.path.join(HERE, 'grs-document.schema.json')

# CR-699 (DFC-2230): the address of the latest schema is S-540 of table T-206,
# read through the one reader of not-stored strings -- never typed here. The
# same value is the first key, "$schema", of every document GRS writes (DR-4).
SCHEMA_ID = settings_reader.not_stored_string('S-540')
# ⭐ The change ledger's one source (Chapter 6.2), printed as the root
# annotation x-grsChanges. Empty until S-541 is set (FR-073, check 76).
CHANGES = os.path.join(HERE, 'grs-json-changes.json')
CHANGES_KEY = 'x-grsChanges'
ADDRESS_KEY = '$schema'

# Which group each settings table belongs to, and the marker in the document
# that says so.  A table missing from this map stops the build: a new table
# must be classified by a person, not guessed by this script.
TABLE_GROUP = {
    'T-202': ('documentSettings', None),
    'T-203': ('documentSettings', None),
    # ⭐ Constants baked into the artifact (CR-572): no in-app command
    # rewrites them, so a copy in a file would keep the value of the build
    # that wrote it and a repair of the tool would never reach that file.
    'T-201': ('notStored', '文書には保存しない'),
    'T-204': ('notStored', '文書には保存しない'),
    'T-205': ('notStored', '文書には保存しない'),
    'T-208': ('notStored', '文書には保存しない'),
    'T-210': ('notStored', '文書には保存しない'),
    'T-211': ('notStored', '文書には保存しない'),
    'T-212': ('notStored', '文書には保存しない'),
    'T-213': ('notStored', '文書には保存しない'),
    'T-214': ('notStored', '文書には保存しない'),
    'T-215': ('notStored', '文書には保存しない'),
    # CR-571: the search panel's four text sizes (FR-151 SV-16), constants
    # like T-215's; the step chosen among them (S-429) is a screen value.
    'T-333': ('notStored', '文書には保存しない'),
    'T-216': ('schedule', '日程データに属する値'),
    'T-209': ('schedule', '本表の値は日程データの群に入る'),
    'T-217': ('schedule', '本表の値は日程データの群に入る'),
    'T-206': ('notStored', '保存しないもの'),
    'T-207': ('notStored', '文書には保存しない'),
    # ⭐ The screen's colours (CR-243). Like T-207 they are constants baked
    # into the artifact: FR-041 (MUST NOT) forbids saving a derived colour,
    # so none of these may reach documentSettings.
    'T-236': ('notStored', '文書には保存しない'),
    # The palette colours' drawn values (CR-548). A document stores the NAME
    # (table T-017b CV-1 of 01-04), never these values.
    'T-294': ('notStored', '文書には保存しない'),
}

def manuscript_types():
    """Rows of settings.json that state their machine type directly.

    ⚠️ This generator still reads the PRINTED table for everything else, on
    purpose: tools/generate_entity_types.py reads settings.json instead, and
    two independent readers of the same manuscript disagreeing is what catches
    a misread cell. Only the rows whose 型 cell cannot be machine-read at all
    are taken from here.
    """
    path = os.path.join(HERE, 'settings.json')
    if not os.path.exists(path):
        return {}
    doc = json.load(io.open(path, encoding='utf-8'))
    out = {}
    for block in doc['blocks']:
        if block['kind'] != 'table':
            continue
        for row in block['rows']:
            if 'json' in row:
                out[row['id']] = row['json']
    return out


MANUSCRIPT_TYPES = manuscript_types()


def manuscript_notes():
    """Rows of settings.json that carry a `schemaNote` for their key (CR-646).

    The description a documentSettings key prints, under the same rule as an
    erd.json column's schemaNote (Chapter 6.2): most rows carry none.
    """
    doc = json.load(io.open(os.path.join(HERE, 'settings.json'), encoding='utf-8'))
    out = {}
    for block in doc['blocks']:
        if block['kind'] != 'table':
            continue
        for row in block['rows']:
            if 'schemaNote' in row:
                out[row['id']] = row['schemaNote']['en']
    return out


MANUSCRIPT_NOTES = manuscript_notes()


def colour_names():
    """The stored spellings of the palette colours: table T-294's key column.

    Read from settings.json in row order, so a new colour needs no edit here.
    """
    doc = json.load(io.open(os.path.join(HERE, 'settings.json'), encoding='utf-8'))
    for block in doc['blocks']:
        if block['kind'] == 'table' and block.get('id') == 'T-294':
            return [row['key'].strip('`') for row in block['rows']]
    raise SystemExit('settings.json holds no table T-294 (the palette colours)')


def bandless_colour_names():
    """The palette names that offer no row band: table T-294's band cells.

    CR-586: a colour column flagged "band" (AT-58, TaskGroup.color) takes only
    the names whose row-band cells (lightBand, darkBand) are not a dash; the
    dash (black, S-315) is what CV-9 leaves off the row colour field. The dash
    is read the way tools/generate_entity_types.py's palette_cell reads it --
    a cell whose `ja` starts with it -- so the two generators agree; a change
    to one reading is a change to both.
    """
    doc = json.load(io.open(os.path.join(HERE, 'settings.json'), encoding='utf-8'))
    for block in doc['blocks']:
        if block['kind'] == 'table' and block.get('id') == 'T-294':
            return [row['key'].strip('`') for row in block['rows']
                    if any(isinstance(row.get(field), dict)
                           and row[field].get('ja', '').startswith('—')
                           for field in ('lightBand', 'darkBand'))]
    raise SystemExit('settings.json holds no table T-294 (the palette colours)')


# A custom colour: <light>/<dark>, each #rrggbb or empty, never both empty
# (table T-017b CV-2 of 01-04).
CUSTOM_COLOUR = '#[0-9a-fA-F]{6}/(?:#[0-9a-fA-F]{6})?|/#[0-9a-fA-F]{6}'

# ⭐ The lexical form of xsd:dateTime: fractional seconds and a zone are
# allowed, because a value imported from MS Project keeps its spelling (EX-4
# of table T-033). GRS itself writes no zone and stops at the second.
# tools/generate_json_schema_validator.py names DATE_TIME_DEF by its pointer
# and drops this pattern there (Chapter 6.1, CR-643).
DATE_TIME_DEF = 'DateTime'
DATE_TIME_PATTERN = (r'^-?\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?'
                     r'(Z|[+-]\d{2}:\d{2})?$')
# ⭐ The lexical form of xsd:time, for the two time-of-day columns of Project
# (defaultStartTime / defaultFinishTime, MSPDI's DefaultStartTime /
# DefaultFinishTime, CR-646). Unlike DATE_TIME_PATTERN this one is a reading
# condition: the column sits on the one Project, so no row can be dropped in
# its place and a value that does not fit refuses the document (Chapter 6.1).
TIME_DEF = 'Time'
TIME_PATTERN = r'^\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$'
# The one root key that is the format version (DR-4 of table T-052).
VERSION_KEY = 'schemaVersion'

# ⭐ The prose a document writer reads, in English because the schema belongs
# to no language (Chapter 6.2). A summary and the reason only; no
# specification ID, which a reader holding only the schema cannot look up.
ROOT_DESCRIPTION = (
    'A GRS schedule document. `$schema` is where the latest version of this '
    "schema lives (the same as this schema's $id), written first so that whoever holds only "
    'the document can reach it; a reader never refuses a document over its value. '
    '`schedule` is the data; `documentSettings` is how '
    'it is drawn when opened; `documentStamp` and `changeLog` record when, by whom '
    'and why it changed. Every key is written, null included, so that "the source '
    'had no value" and "the value is 0" are never confused. What comes from MS '
    'Project XML (MSPDI) keeps its names and codes, so that a round trip loses '
    'nothing. Times come in two kinds, for two reasons. Schedule dates (start, '
    'finish, deadline, statusDate, calendar exceptions, comment and highlight '
    'boxes) are local date-times without a zone, exactly as MS Project writes '
    'them, so that they round-trip unchanged. GRS uses only their day for now; '
    'when it writes one it uses the project\'s default start time on a start-side '
    'column and its default finish time on a finish-side column (a milestone '
    'takes the finish time at both ends), and 00:00:00..23:59:00 for a whole-day '
    'range (00:00:00 for a single day such as a comment\'s anchor), because that '
    'is what MS Project does with a date entered without a time, so the value '
    'already means the right instant when times are used. A last day (finish, '
    'actualFinish, stop, endDate) is included. Record instants (documentStamp, '
    'changeLog) are UTC, so that every reader sees them in their own local time. '
    'A null colour or width follows the '
    'theme. A custom colour gives the light-theme and the dark-theme value '
    '("#light/#dark"; an empty side is drawn with the other), because a readable '
    'dark colour cannot be derived from a light one.')
SCHEDULE_DESCRIPTION = ('The data: what is exported to MS Project, and what GRS '
                        'adds to draw it.')
SETTINGS_DESCRIPTION = ('How the document is drawn when opened. Every key is '
                        'written even at its default, so that a later change of '
                        'a default never changes this picture.')
CARRY_DESCRIPTION = ('Values of an imported MS Project element that GRS does not '
                     'interpret, kept to write them back unchanged; {} when '
                     'nothing was imported.')
# The provenance banner check 21 reads near the top of the file. It is a
# `$comment`, not the description, because it speaks to whoever maintains the
# schema and not to the writer of a document.
PROVENANCE = (
    'Generated from docs/spec/_source/erd.json (the schedule group) and '
    'docs/spec/_assets/tbl-settings.md with docs/spec/_source/settings.json (the '
    'presentation group); x-grsChanges from docs/spec/_source/grs-json-changes.json. '
    'Never edit by hand. Rebuild: npm run gen -- npm run '
    'gen:check fails on drift. The generator is '
    'docs/spec/_source/erd_json_to_schema.py.')

# CR-699: what the root's `$schema` property says to a writer.
ADDRESS_DESCRIPTION = (
    'The address of the latest version of this schema, the same as its $id. '
    'Written as the first key of the document; any string is read.')

# CR-699: the ledger, said once in the banner for a reader holding only the
# schema. No specification ID (Chapter 6.2).
LEDGER_NOTE = (
    'x-grsChanges is the change ledger of this format: one element per changed '
    'column, oldest first, each with version, kind (added, removed, renamed, '
    'converted, refused), entity and column, plus default (added), to (renamed) '
    'or rule (converted). It tells how the latest GRS reads a document of an '
    'older version. It stays empty until GRS goes into official use.')


def change_ledger():
    """The ledger's elements, read from its one manuscript (CR-699)."""
    ledger = json.load(io.open(CHANGES, encoding='utf-8'),
                       object_pairs_hook=collections.OrderedDict)
    changes = ledger.get('changes')
    if not isinstance(changes, list):
        raise SystemExit('%s holds no "changes" array' % CHANGES)
    return changes


NOT_STORED_MARK = '⛔'          # the stop sign the sources put on a key
UNSOURCED_MARK = '\U0001f50e'       # the magnifier marking a default with no origin

say = lambda m: sys.stdout.write(m + '\n')


# --------------------------------------------------------------- the schedule


def frag(spec, open_enums, where):
    """Turn one "json" object of erd.json into a JSON Schema fragment.

    ⚠️ A decided default is carried through as JSON Schema's own "default",
    which is an ANNOTATION: it describes what the absent value means and never
    makes a document valid or invalid. That is what is wanted here -- the
    column stays nullable, and the reader of the schema learns what null
    means without this file inventing a rule.
    """
    out = frag_body(spec, open_enums, where)
    if 'default' in spec:
        out['default'] = spec['default']
    elif 'defaultFrom' in spec:
        out['default'] = settings_row_default(spec['defaultFrom'], where)
    return out


def settings_row_default(row_id, where):
    """The machine default one settings row states, read where it is held."""
    found = [said for said in settings_reader.settings_manuscript().values()
             if said['row'] == row_id]
    if len(found) != 1 or settings_value(found[0]['default']) is None:
        raise SystemExit('%s names %s as its default, but settings.json states '
                         'no single machine default there' % (where, row_id))
    return settings_value(found[0]['default'])


def settings_value(cell):
    """One machine cell of settings.json as a JSON value, or None.

    The same cells tools/generate_entity_types.py's literal_of reads: `num` is a
    number, `lit` a literal that is quoted when it is a string.
    """
    if not isinstance(cell, dict):
        return None
    if 'num' in cell:
        number = float(cell['num'])
        return int(number) if number.is_integer() else number
    if 'lit' in cell:
        lit = cell['lit']
        if cell.get('quote') or (lit[:1] == "'" and lit[-1:] == "'"):
            return lit.strip("'")
        return json.loads(lit)
    if 'pair' in cell and 'parts' in cell:
        return collections.OrderedDict(
            (name, settings_value({'num': number}))
            for name, number in zip(cell['parts'], cell['pair']))
    return None


def frag_body(spec, open_enums, where):
    kind = spec['kind']
    nullable = spec.get('null', False)

    def typed(name, extra=None):
        out = collections.OrderedDict()
        out['type'] = [name, 'null'] if nullable else name
        for k, v in (extra or []):
            out[k] = v
        return out

    if kind in ('integer', 'number'):
        extra = []
        if 'min' in spec:
            extra.append(('minimum', spec['min']))
        if 'max' in spec:
            extra.append(('maximum', spec['max']))
        return typed(kind, extra)

    if kind == 'boolean':
        return typed('boolean')

    if kind == 'string':
        extra = []
        if 'maxLength' in spec:
            extra.append(('maxLength', spec['maxLength']))
        if spec.get('format') == 'uuid':
            extra.append(('format', 'uuid'))
        elif spec.get('format') == 'iso8601Seconds':
            extra.append(('format', 'date-time'))
            extra.append(('$comment', 'ISO 8601, UTC, to the second.'))
        return typed('string', extra)

    if kind == 'color':
        refused = bandless_colour_names() if spec.get('band') else []
        names = [n for n in colour_names()
                 if (spec.get('transparent', True) or n != 'transparent')
                 and n not in refused]
        return typed('string', [('pattern', '^(?:%s|%s)$'
                                 % ('|'.join(names), CUSTOM_COLOUR))])

    if kind == 'enum':
        if 'values' in spec:
            members = list(spec['values'])
            if nullable:
                members.append(None)
            return collections.OrderedDict([('enum', members)])
        open_enums.append(where)
        return typed('string', [('$comment', 'The specification names how many '
                                             'members this enumeration has but '
                                             'not their spellings.')])

    if kind == 'map':
        return typed('object', [('additionalProperties',
                                 element(spec['of']))])

    if kind == 'array':
        return typed('array', [('items', element(spec['of']))])

    if kind == 'object':
        props = collections.OrderedDict()
        for name in sorted(spec['fields']):
            props[name] = element(spec['fields'][name])
        return typed('object', [('required', sorted(spec['fields'])),
                                ('additionalProperties', False),
                                ('properties', props)])

    raise SystemExit('unknown kind %r at %s' % (kind, where))


def element(spec):
    """The element type of a map, an array or an object field."""
    kind = spec['kind']
    if kind == 'ref':
        return collections.OrderedDict([('$ref', '#/$defs/%s' % spec['entity'])])
    return collections.OrderedDict([('type', kind)])


CARRY_DEF = 'Carry'


def is_carry_store(entity, column):
    """The `carry` column of an entity erd.json marks as holding one."""
    if not (entity.get('carry') and column['name'] == 'carry'):
        return False
    if column['json']['kind'] != 'map' or column['json'].get('null'):
        raise SystemExit('%s.carry is no longer a non-null map, so it cannot '
                         'point at $defs/%s' % (entity['name'], CARRY_DEF))
    return True


def carry_def(erd):
    """The one definition every carry store points at, typed by erd.json."""
    stores = [c for e in erd['entities'] for c in e['columns']
              if is_carry_store(e, c)]
    shapes = set(json.dumps(element(c['json']['of'])) for c in stores)
    if len(shapes) != 1:
        raise SystemExit('the carry stores of erd.json disagree on their '
                         'element type: %s' % sorted(shapes))
    return collections.OrderedDict([
        ('type', 'object'),
        ('description', CARRY_DESCRIPTION),
        ('additionalProperties', element(stores[0]['json']['of'])),
    ])


def date_time_ref(spec, where, marker='isDate', target=None):
    """A date (or time) column: a reference to its one definition.

    ⛔ The definition admits null, so a column that does not would be widened
    by it; such a column stops the build rather than being widened.
    """
    target = target or DATE_TIME_DEF
    if spec['kind'] != 'string' or not spec.get('null') or \
            set(spec) - {'kind', marker, 'null'}:
        raise SystemExit('%s is a %s column that is not a plain nullable '
                         'string, so it cannot point at $defs/%s'
                         % (where, marker, target))
    return collections.OrderedDict([('$ref', '#/$defs/%s' % target)])


def date_time_def():
    return collections.OrderedDict([
        ('type', ['string', 'null']),
        ('pattern', DATE_TIME_PATTERN),
    ])


def time_def():
    """The one time-of-day definition (CR-646). Its pattern IS a reading
    condition: tools/generate_json_schema_validator.py drops the pattern only
    at DATE_TIME_DEF, so the walker keeps this one (Chapter 6.1)."""
    return collections.OrderedDict([
        ('type', ['string', 'null']),
        ('pattern', TIME_PATTERN),
    ])


def entity_defs(erd, open_enums):
    defs = collections.OrderedDict()
    for e in erd['entities']:
        props = collections.OrderedDict()
        for c in e['columns']:
            where = '%s.%s' % (e['name'], c['name'])
            if is_carry_store(e, c):
                # ⭐ One definition for every carry store, so that its reason
                # is said once (CR-642).
                props[c['name']] = collections.OrderedDict(
                    [('$ref', '#/$defs/%s' % CARRY_DEF)])
                continue
            if c['json'].get('isDate'):
                body = date_time_ref(c['json'], where)
            elif c['json'].get('isTime'):
                body = date_time_ref(c['json'], where, 'isTime', TIME_DEF)
            else:
                body = frag(c['json'], open_enums, where)
            if 'schemaNote' in c:
                # A note naming a value of table T-209 (`{{S-128}}`) is printed
                # from that row, never retyped (CR-644).
                note = settings_reader.with_calendar_rows_printed(
                    c['schemaNote']['en'], where)
                described = collections.OrderedDict([('description', note)])
                described.update(body)
                body = described
            props[c['name']] = body
        defs[e['name']] = collections.OrderedDict([
            ('type', 'object'),
            ('description', e['description']['en']),
            # FR-024: in the schedule group every key is written out, a null
            # column included, so every column is required.
            ('required', [c['name'] for c in e['columns']]),
            ('additionalProperties', False),
            ('properties', props),
        ])
    return defs


def schedule_object(erd, reachable):
    box = [b for b in erd['container']['boxes'] if b['id'] == 'schedule'][0]
    props = collections.OrderedDict()
    order = []
    for shape, key, entity in box['entity_rows']:
        order.append(key)
        reachable.add(entity)
        ref = collections.OrderedDict([('$ref', '#/$defs/%s' % entity)])
        if shape == '配列':
            props[key] = collections.OrderedDict([('type', 'array'), ('items', ref)])
        else:
            props[key] = ref
    return collections.OrderedDict([
        ('type', 'object'),
        ('description', SCHEDULE_DESCRIPTION),
        ('required', order),
        ('additionalProperties', False),
        ('properties', props),
    ])


# ------------------------------------------------------- the document settings


def settings_tables():
    """Every numbered table of tbl-settings.md, with its header and S- rows."""
    tables = collections.OrderedDict()
    current = None
    for line in io.open(SETTINGS, encoding='utf-8').read().split('\n'):
        cap = re.match(r'\*\*表 (T-\d+[a-z]?) — (.+?)\*\*', line)
        if cap:
            current = cap.group(1)
            tables[current] = {'title': cap.group(2), 'header': None,
                               'rows': [], 'notes': []}
            continue
        if current is None:
            continue
        if line.startswith('| 行 ID') and tables[current]['header'] is None:
            tables[current]['header'] = [c.strip() for c in line.strip('|').split('|')]
        elif re.match(r'\| S-\d+ ', line):
            tables[current]['rows'].append([c.strip() for c in line.strip('|').split('|')])
        elif line.strip() and not line.startswith('|'):
            tables[current]['notes'].append(line)
    return tables


def classify(tables, problems):
    """Confirm the declared group of each table against the document itself."""
    for tid, t in tables.items():
        if tid not in TABLE_GROUP:
            problems.append('settings table %s (%s) is not classified -- '
                            'classify it before the schema can be built'
                            % (tid, t['title']))
            continue
        group, marker = TABLE_GROUP[tid]
        if marker and marker not in t['title'] and \
                not any(marker in n for n in t['notes']):
            problems.append('settings table %s is declared %s, but the document '
                            'no longer says %r' % (tid, group, marker))


NUM = re.compile(r'^-?\d+(?:\.\d+)?$')


def clean(cell):
    return cell.replace(NOT_STORED_MARK, '').replace(UNSOURCED_MARK, '').strip()


def cell_number(cell):
    """The numeric value of a bound cell, or None when it is symbolic."""
    text = clean(cell).strip('`')
    if NUM.match(text):
        return int(text) if re.match(r'^-?\d+$', text) else float(text)
    return None


def quoted_members(text):
    """The `'a'` / `'b'` spellings a type cell lists, if it lists them all."""
    if 'ほか' in text or '…' in text:
        return None
    members = re.findall(r"`'([^']+)'`", text)
    return members or None


def settings_type(row, header, key, open_types):
    """A JSON Schema fragment for one settings row, read off its own table."""
    cells = dict(zip(header, row))
    declared = cells.get('型', '')
    default = cells.get('既定値') or cells.get('既定') or cells.get('値') or ''
    low = cell_number(cells.get('下限', ''))
    high = cell_number(cells.get('上限', ''))
    unit = cells.get('単位', '')

    if declared:
        text = clean(declared)
        nullable = '`null`' in text
        members = quoted_members(text)
        if members:
            out = collections.OrderedDict([('enum', members + ([None] if nullable else []))])
            return out
        if text.startswith('真偽'):
            return collections.OrderedDict([('type', 'boolean')])
        if text.startswith('整数') or re.match(r'^\d+〜\d+$', text):
            out = collections.OrderedDict([('type', 'integer')])
            span = re.match(r'^(\d+)〜(\d+)$', text)
            if span:
                out['minimum'], out['maximum'] = int(span.group(1)), int(span.group(2))
            return out
        if text.startswith('数値') or text.startswith('px'):
            return collections.OrderedDict([('type', 'number')])
        if text.startswith('日付'):
            return collections.OrderedDict([
                ('type', ['string', 'null'] if nullable else 'string'),
                ('pattern', DATE_TIME_PATTERN)])
        if 'UUID' in text and '配列' not in text:
            return collections.OrderedDict([
                ('type', ['string', 'null'] if nullable else 'string'),
                ('format', 'uuid')])
        if '配列' in text:
            item = collections.OrderedDict([('type', 'string')])
            if 'UUID' in text or 'TaskGroup.id' in text:
                item['format'] = 'uuid'
            return collections.OrderedDict([('type', 'array'), ('items', item)])
        fields = re.match(r'^`\{ ([\w, ]+) \}`', text)
        if fields:
            names = [f.strip() for f in fields.group(1).split(',')]
            # The field names come from the type cell; what they hold has to
            # come from the default cell, which sometimes shows one value per
            # field ("`1600 × 900`") and sometimes shows none ("`null`").
            shown = re.findall(r'-?\d+(?:\.\d+)?', clean(default))
            props = collections.OrderedDict()
            for i, name in enumerate(names):
                if len(shown) == len(names):
                    whole = re.match(r'^-?\d+$', shown[i])
                    props[name] = collections.OrderedDict(
                        [('type', 'integer' if whole else 'number')])
                else:
                    props[name] = open_type('%s.%s' % (key, name), clean(default),
                                            open_types)
            body = collections.OrderedDict([
                ('type', 'object'), ('required', names),
                ('additionalProperties', False), ('properties', props)])
            if nullable:
                return collections.OrderedDict([('oneOf', [body, {'type': 'null'}])])
            return body
        numbers = re.findall(r'`(\d+)`', text)
        if numbers and '/' in text:
            return collections.OrderedDict([('enum', [int(x) for x in numbers])])
        return open_type(key, text, open_types)

    # No 型 column.  A 単位 column says the row holds a quantity whatever its
    # default cell shows; otherwise the default cell has to show one value and
    # nothing else, sometimes with the unit after it ("`3000` ms").
    text = clean(default)
    if re.match(r'^`?\d{4}-\d{2}-\d{2}`?$', text):
        return collections.OrderedDict([('type', 'string'), ('format', 'date')])
    literal = re.match(r'^`?(-?\d+(?:\.\d+)?)`?(?:\s+\S+)?$', text)
    if not literal and not unit:
        return open_type(key, text, open_types)
    whole = bool(literal) and re.match(r'^-?\d+$', literal.group(1)) and \
        (low is None or float(low).is_integer()) and \
        (high is None or float(high).is_integer())
    out = collections.OrderedDict([('type', 'integer' if whole else 'number')])
    if low is not None:
        out['minimum'] = low
    if high is not None:
        out['maximum'] = high
    return out


def open_type(key, cell, open_types):
    """A key whose own row does not say what type it holds.

    The property stays required -- FR-024 writes every settings key out -- but
    unconstrained, and the omission is recorded rather than guessed at.
    """
    open_types.append('%s (%s)' % (key, cell))
    return collections.OrderedDict([
        ('$comment', 'The source does not say what type this holds; its default '
                     'is written as %r.' % cell)])


def nest(flat):
    """Read a dotted key name as nesting: fontScaleSizes.S -> an object."""
    tree = collections.OrderedDict()
    for key in sorted(flat):
        node, parts = tree, key.split('.')
        for part in parts[:-1]:
            node = node.setdefault(part, collections.OrderedDict())
        node[parts[-1]] = flat[key]
    return tree


SCHEMA_MARKERS = ('type', 'enum', 'oneOf', '$comment', '$ref')


def as_object(tree, description=None):
    props = collections.OrderedDict()
    for name, value in tree.items():
        nested = isinstance(value, collections.OrderedDict) and \
            not any(m in value for m in SCHEMA_MARKERS)
        props[name] = as_object(value) if nested else value
    out = collections.OrderedDict()
    out['type'] = 'object'
    if description:
        out['description'] = description
    # FR-024 / DR-3: the presentation group is written out in full every time.
    out['required'] = list(props)
    out['additionalProperties'] = False
    out['properties'] = props
    return out


def document_settings(tables, open_types, skipped):
    flat = collections.OrderedDict()
    noted = set()
    for tid, t in tables.items():
        group = TABLE_GROUP.get(tid, (None, None))[0]
        if group != 'documentSettings':
            continue
        header = t['header']
        for row in t['rows']:
            cells = dict(zip(header, row))
            name_cell = cells.get('キー') or cells.get('名前') or ''
            if NOT_STORED_MARK in name_cell:
                skipped.append((row[0], clean(name_cell), 'marked not stored'))
                continue
            reason = cells.get('備考') or cells.get('意味・範囲の理由') or \
                cells.get('意味') or cells.get('範囲の理由') or ''
            if '保存しない' in reason:
                skipped.append((row[0], clean(name_cell),
                                'its own row says it is not stored'))
                continue
            key = re.match(r'^`([A-Za-z][\w.]*)`$', clean(name_cell))
            if not key:
                skipped.append((row[0], clean(name_cell), 'not a named key'))
                continue
            stated = MANUSCRIPT_TYPES.get(row[0])
            if stated is not None:
                # ⭐ The manuscript states the machine type for a row whose
                # printed 型 cell cannot carry one -- `{ date1: 日付, date2:
                # 日付 }` is written for a person, and no regex over it is the
                # specification's answer (CR-175). The printed table stays the
                # human type; settings.json holds the machine one, in the same
                # "json" shape erd.json uses for an entity column.
                flat[key.group(1)] = frag(stated, [], row[0])
            else:
                flat[key.group(1)] = settings_type(row, header, key.group(1),
                                                   open_types)
            note = MANUSCRIPT_NOTES.get(row[0])
            if note is not None:
                described = collections.OrderedDict([('description', note)])
                described.update(flat[key.group(1)])
                flat[key.group(1)] = described
                noted.add(row[0])
    # ⛔ A note on a row that prints no stored key would be read by nobody.
    unused = set(MANUSCRIPT_NOTES) - noted
    if unused:
        raise SystemExit('settings.json rows %s carry a schemaNote but print no '
                         'documentSettings key' % ', '.join(sorted(unused)))
    with_defaults_and_bounds(flat)
    return as_object(nest(flat), SETTINGS_DESCRIPTION)


NO_DEFAULT = object()


def with_defaults_and_bounds(flat):
    """Give each presentation key its default and its constant-named bounds.

    ⭐ Read through tools/generate_entity_types.py's own reading of
    settings.json -- settings_manuscript for the cells, derived_defaults for a
    default a rule computes (S-2, S-3) -- so SETTINGS_DEFAULTS and this schema
    cannot hold two different answers (CR-642).
    ⚠️ A bound is folded into a number only when every key it names is a
    constant the document does not store: a bound naming a stored key
    (`rulerHeight`) moves with the document, so a number here would be the
    answer for the defaults and for nothing else. That is the same line
    generate_entity_types.py draws when it folds a constant into IV-16's
    expression.
    """
    manuscript = settings_reader.settings_manuscript()
    direct, values = {}, {}
    for key, said in manuscript.items():
        cell = said['default']
        if not isinstance(cell, dict):
            continue
        if 'pair' in cell and 'parts' in cell:
            for name, number in zip(cell['parts'], cell['pair']):
                direct['%s.%s' % (key, name)] = float(number)
                values['%s.%s' % (key, name)] = settings_value({'num': number})
            continue
        if 'num' not in cell and 'lit' not in cell:
            continue
        direct[key] = float(cell['num']) if 'num' in cell else cell['lit']
        values[key] = settings_value(cell)
    values.update(settings_reader.derived_defaults(manuscript, direct))

    for key, node in flat.items():
        value = values.get(key, NO_DEFAULT)
        if value is not NO_DEFAULT:
            node['default'] = value
        kinds = node.get('type')
        kinds = [kinds] if isinstance(kinds, str) else (kinds or [])
        said = manuscript.get(key)
        if said is None or not set(kinds) & {'integer', 'number'}:
            continue
        for edge, keyword in (('min', 'minimum'), ('max', 'maximum')):
            folded = constant_bound(said[edge], flat, direct)
            if keyword not in node and folded is not None:
                node[keyword] = folded


def constant_bound(cell, stored, direct):
    """A bound field that names only constants, worked out; else None."""
    if not isinstance(cell, str):
        return None
    named = re.findall(r'`([^`]+)`', cell)
    if not named or any(one in stored or not isinstance(direct.get(one), float)
                        for one in named):
        return None
    pieces = settings_reader.bound_pieces(cell)
    expression = (settings_reader.bound_expression(pieces)
                  if pieces is not None else None)
    if expression is None:
        return None
    stack = []
    for kind, held in expression:
        if kind == 'key':
            stack.append(direct[held])
        elif kind == 'num':
            stack.append(float(held))
        else:
            right, left = stack.pop(), stack.pop()
            stack.append({'+': left + right, '-': left - right,
                          '*': left * right, '/': left / right}[held])
    number = round(stack[0], 9)
    return int(number) if number.is_integer() else number


# ---------------------------------------------------------------------- build


def build():
    erd = json.load(io.open(ERD, encoding='utf-8'),
                    object_pairs_hook=collections.OrderedDict)
    tables = settings_tables()

    problems, open_enums, open_types, skipped = [], [], [], []
    classify(tables, problems)

    reachable = set()
    defs = entity_defs(erd, open_enums)
    defs[CARRY_DEF] = carry_def(erd)
    defs[DATE_TIME_DEF] = date_time_def()
    defs[TIME_DEF] = time_def()
    schedule = schedule_object(erd, reachable)
    settings = document_settings(tables, open_types, skipped)

    root_box = [b for b in erd['container']['boxes'] if b['id'] == 'Document'][0]
    order = [key for _shape, key, _note in root_box['rows']]

    # CR-699 (JDG-1693): the address rides first. It is not a row of the
    # figure's root box -- a mermaid attribute name cannot hold "$" -- so it is
    # placed here, typed as a string only and never a const: a document whose
    # address moved is still read (the format version decides, FR-073).
    order = [ADDRESS_KEY] + order
    props = collections.OrderedDict()
    props[ADDRESS_KEY] = collections.OrderedDict([
        ('type', 'string'),
        ('description', ADDRESS_DESCRIPTION)])
    for shape, key, _note in root_box['rows']:
        if key == 'schedule':
            props[key] = schedule
        elif key == 'documentSettings':
            props[key] = settings
        elif shape == '配列':
            props[key] = collections.OrderedDict([
                ('type', 'array'),
                ('items', collections.OrderedDict([('$ref', '#/$defs/%s' % key)]))])
            reachable.add(key)
        elif shape == 'オブジェクト':
            props[key] = collections.OrderedDict([('$ref', '#/$defs/%s' % key)])
            reachable.add(key)
        elif key == VERSION_KEY:
            props[key] = collections.OrderedDict([('type', 'string'),
                                                  ('const', SCHEMA_VERSION)])
        else:
            props[key] = collections.OrderedDict([('type', 'string')])
    if VERSION_KEY not in props:
        raise SystemExit('the root box of erd.json no longer holds %r, so the '
                         'format version has no key to carry its const'
                         % VERSION_KEY)

    # An entity a column points at is reachable too.
    changed = True
    while changed:
        changed = False
        for name in list(reachable):
            for c in [x for x in erd['entities'] if x['name'] == name][0]['columns']:
                target = (c['json'].get('of') or {}).get('entity')
                if target and target not in reachable:
                    reachable.add(target)
                    changed = True

    unplaced = sorted({e['name'] for e in erd['entities']} - reachable)

    schema = collections.OrderedDict()
    schema['$schema'] = 'https://json-schema.org/draft/2020-12/schema'
    schema['$id'] = SCHEMA_ID
    note = [PROVENANCE]
    if open_enums:
        note.append('Enumerations whose members the specification has not spelled '
                    'out, widened to a plain string here: %s.' % ', '.join(open_enums))
    if open_types:
        note.append('Settings keys whose own row does not say what type they hold, '
                    'left unconstrained here: %s.'
                    % ', '.join(k.split(' (')[0] for k in open_types))
    if unplaced:
        note.append('Entities the container does not place anywhere, so no property '
                    'points at their definition: %s.' % ', '.join(unplaced))
    note.append(LEDGER_NOTE)
    schema['$comment'] = ' '.join(note)
    schema['title'] = 'GRS JSON document'
    schema['description'] = ROOT_DESCRIPTION
    schema[CHANGES_KEY] = change_ledger()
    schema['type'] = 'object'
    schema['required'] = order
    schema['additionalProperties'] = False
    schema['properties'] = props
    schema['$defs'] = defs

    return schema, problems, open_enums, open_types, unplaced, skipped


def render(schema):
    return json.dumps(schema, ensure_ascii=False, indent=1) + '\n'


def main():
    schema, problems, open_enums, open_types, unplaced, skipped = build()
    text = render(schema)

    if '--report' in sys.argv:
        say('settings keys      : %d' % len(schema['properties']['documentSettings']['properties']))
        say('entity definitions : %d' % len(schema['$defs']))
        say('')
        say('-- enumerations with no spelled-out members (%d)' % len(open_enums))
        for x in open_enums:
            say('   %s' % x)
        say('-- settings keys with no readable type (%d)' % len(open_types))
        for x in open_types:
            say('   %s' % x)
        say('-- entities no property points at (%d)' % len(unplaced))
        for x in unplaced:
            say('   %s' % x)
        say('-- settings rows that are not a stored key (%d)' % len(skipped))
        for rid, name, why in skipped:
            say('   %-6s %-34s %s' % (rid, name, why))
        say('-- problems (%d)' % len(problems))
        for x in problems:
            say('   %s' % x)
        return 1 if problems else 0

    if problems:
        for x in problems:
            say('PROBLEM  %s' % x)
        return 2

    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('MISSING  %s -- run erd_json_to_schema.py' % os.path.basename(OUT))
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != text:
            say('DRIFTED  %s no longer matches its sources -- rerun '
                'erd_json_to_schema.py' % os.path.basename(OUT))
            return 1
        say('OK       %s matches erd.json and tbl-settings.md'
            % os.path.basename(OUT))
        return 0

    io.open(OUT, 'w', encoding='utf-8', newline='').write(text)
    say('wrote %s  (%d chars)' % (OUT, len(text)))
    say('settings keys %d  entity definitions %d  open enums %d  open types %d  '
        'unplaced %d'
        % (len(schema['properties']['documentSettings']['properties']),
           len(schema['$defs']), len(open_enums), len(open_types), len(unplaced)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
