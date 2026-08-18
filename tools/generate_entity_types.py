# -*- coding: utf-8 -*-
"""Write the TypeScript types of the schedule group from erd.json.

The columns of the document already exist in machine-readable form -- the same
"json" key that check 17 turns into the `GRS JSON` schema. Writing them a
second time by hand would be 138 chances to drift from it, so they are
generated into the units that Chapter 5.3 says own them:

  src/entity/document-model/schedule/schedule.ts        the 18 entity types
                                                        and the Schedule group
  src/entity/document-model/document-stamp/…            the stamp and the log
  src/entity/document-model/document-settings/…         the presentation group

The presentation group is read from grs-document.schema.json rather than from
tbl-settings.md a second time: check 17 already keeps that artifact in step
with both of its sources, so deriving from it means one parser, not two.

Chapter 6.2 does not require this (CR-147 dropped the MUST for .ts types); it
only leaves it open. This is the project taking the offer.

Only the region between the two markers is written. Everything a person writes
outside it is left alone, exactly as tools/generate_unit_tree.py does.

  python tools/generate_entity_types.py            write the regions
  python tools/generate_entity_types.py --check    fail if a region has drifted

Run with PYTHONIOENCODING=utf-8.
"""
import collections
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ERD = os.path.join(ROOT, 'docs', 'spec', '_source', 'erd.json')
SCHEMA = os.path.join(ROOT, 'docs', 'spec', '_source', 'grs-document.schema.json')
SETTINGS = os.path.join(ROOT, 'docs', 'spec', '_source', 'settings.json')
MODEL = os.path.join(ROOT, 'src', 'entity', 'document-model')
LAYOUT = os.path.join(ROOT, 'src', 'entity', 'layout-engine')

# ⚠️ The marker carries NO path. It used to read "<generated from
# docs/spec/_assets/source/erd.json …>", and when CR-175 moved the manuscript
# the marker stopped matching the one already in the file -- so region() took
# the "no region yet" branch and APPENDED a second copy of everything instead
# of replacing the first. Nothing failed; the files simply doubled. The path
# belongs in the body, which is rewritten every run, not in the marker that has
# to survive being edited.
OPEN = '// <generated -- do not edit by hand>'
CLOSE = '// </generated>'
# Any older marker, so a file written before CR-175 is migrated rather than
# silently appended to. Matching this while OPEN is absent is an error.
STALE = '// <generated from '

# The stamp and the change log are the document's own record, not part of the
# schedule group (table T-052 DR-4), so they belong to DocumentStamp.
STAMP_ENTITIES = ('revisionStamp', 'changeLog')

say = lambda m: sys.stdout.write(m + '\n')


def ts_type(spec, name):
    """The TypeScript type of one column, from its machine-readable form."""
    kind = spec['kind']
    if kind in ('integer', 'number'):
        base = 'number'
    elif kind == 'boolean':
        base = 'boolean'
    elif kind == 'string':
        base = 'string'
    elif kind == 'enum':
        base = (' | '.join("'%s'" % v for v in spec['values'])
                if 'values' in spec else 'string')
    elif kind == 'map':
        base = 'Readonly<Record<string, %s>>' % ts_element(spec['of'])
    elif kind == 'array':
        base = 'readonly %s[]' % ts_element(spec['of'])
    elif kind == 'object':
        inner = ', '.join('readonly %s: %s' % (f, ts_element(spec['fields'][f]))
                          for f in sorted(spec['fields']))
        base = '{ %s }' % inner
    else:
        raise SystemExit('unknown kind %r on %s' % (kind, name))
    return base + (' | null' if spec.get('null') else '')


def ts_element(spec):
    kind = spec['kind']
    if kind == 'ref':
        return spec['entity']
    return {'integer': 'number', 'number': 'number',
            'string': 'string', 'boolean': 'boolean'}[kind]


def entity_block(entity, row_id, first_column):
    """One entity, documented by pointing at its rows rather than copying them.

    Chapter 1.9 tells the specification not to write out the text it points at.
    The same reason applies here, and adds two of its own: a row ID cannot fall
    out of step with the row it names, and the tree stays ASCII.
    """
    lines = ['/** %s of table T-056. */' % row_id,
             'export interface %s {' % entity['name']]
    for i, column in enumerate(entity['columns']):
        lines.append('  /** AT-%d */' % (first_column + i))
        lines.append('  readonly %s: %s' % (column['name'],
                                            ts_type(column['json'], column['name'])))
    lines.append('}')
    return '\n'.join(lines)


DATE_COLUMNS_NOTE = [
    '/**',
    ' * Every column table T-058 gives a date or a datetime type, by entity.',
    ' *',
    ' * ⭐ IV-14 reaches these as "表 T-058 の型の欄が日付または日時とする列"',
    ' * rather than naming them, so a hand-written roster goes stale the moment',
    ' * a column is added and nothing says so (F-3). erd.json marks them, so',
    ' * this is the roster, not a copy of it.',
    ' */',
    'export const DATE_COLUMNS: {',
]


def date_columns_block(erd):
    """The date roster, typed per entity so a wrong name fails to compile.

    `keyof Project & string` is what the hand-written lists used; keeping it
    means the generated roster is checked the same way, not merely trusted.
    """
    holders = [(e['name'], [c['name'] for c in e['columns']
                            if c['json'].get('isDate')])
               for e in erd['entities']]
    holders = [(name, cols) for name, cols in holders if cols]
    out = list(DATE_COLUMNS_NOTE)
    for name, _cols in holders:
        out.append('  readonly %s: readonly (keyof %s & string)[]' % (name, name))
    out.append('} = {')
    for name, cols in holders:
        out.append('  %s: [%s],' % (name, ', '.join("'%s'" % c for c in cols)))
    out.append('}')
    return '\n'.join(out)


COLUMN_DEFAULTS_NOTE = [
    '/**',
    ' * Every column the specification gives a default, by entity.',
    ' *',
    ' * ⭐ A default is only here when the specification HAS decided one: the',
    ' * value comes from erd.json, is printed beside the column in table T-058,',
    ' * and reaches the GRS JSON schema as its "default" annotation. So the',
    ' * number of places holding it is one.',
    ' *',
    ' * ⚠️ The value type is read off the generated interface, so a default that',
    ' * is not a member of its own column fails to compile rather than shipping.',
    ' */',
    'export const COLUMN_DEFAULTS: {',
]


def column_defaults_block(erd):
    """The decided defaults, typed from the interfaces above."""
    holders = [(e['name'], [(c['name'], c['json']['default'])
                            for c in e['columns'] if 'default' in c['json']])
               for e in erd['entities']]
    holders = [(name, cols) for name, cols in holders if cols]
    if not holders:
        return ''
    out = list(COLUMN_DEFAULTS_NOTE)
    for name, cols in holders:
        out.append('  readonly %s: {' % name)
        for column, _value in cols:
            out.append("    readonly %s: NonNullable<%s['%s']>"
                       % (column, name, column))
        out.append('  }')
    out.append('} = {')
    for name, cols in holders:
        pairs = ', '.join('%s: %s' % (column, ts_literal(value))
                          for column, value in cols)
        out.append('  %s: { %s },' % (name, pairs))
    out.append('}')
    return '\n'.join(out)


def ts_literal(value):
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, str):
        return "'%s'" % value
    return str(value)


def numbering(erd):
    """The ET- row and the first AT- row of every entity, by position."""
    seats, column = {}, 0
    for i, entity in enumerate(erd['entities'], 1):
        seats[entity['name']] = ('ET-%d' % i, column + 1)
        column += len(entity['columns'])
    return seats


def schedule_block(erd):
    """The 18 entity types, then the group that holds them (table T-052 DR-2)."""
    seats = numbering(erd)
    order = [e for e in erd['entities'] if e['name'] not in STAMP_ENTITIES]
    out = [entity_block(e, *seats[e['name']]) for e in order]

    box = [b for b in erd['container']['boxes'] if b['id'] == 'schedule'][0]
    keys = []
    for shape, key, entity in box['entity_rows']:
        keys.append('  readonly %s: %s' % (key, ('readonly %s[]' % entity)
                                           if shape == '配列' else entity))
    out.append('/** The schedule group. Its keys are DR-2 of table T-052. */\n'
               'export interface Schedule {\n%s\n}' % '\n'.join(keys))
    out.append(date_columns_block(erd))
    defaults = column_defaults_block(erd)
    if defaults:
        out.append(defaults)
    out.append(default_calendar_block())
    return '\n\n'.join(out)


def stamp_block(erd):
    by = {e['name']: e for e in erd['entities']}
    seats = numbering(erd)
    blocks = []
    for name in STAMP_ENTITIES:
        renamed = dict(by[name])
        renamed['name'] = 'DocumentStamp' if name == 'revisionStamp' else 'ChangeLogEntry'
        blocks.append(entity_block(renamed, *seats[name]))
    return '\n\n'.join(blocks)


def settings_property(name, node, indent):
    """One documentSettings key, from the schema the two sources produced."""
    pad = '  ' * indent
    if 'enum' in node:
        members = [m for m in node['enum'] if m is not None]
        kind = ' | '.join(("'%s'" % m) if isinstance(m, str) else str(m) for m in members)
        if any(m is None for m in node['enum']):
            kind += ' | null'
        return ['%s  readonly %s: %s' % (pad, name, kind)]
    if 'oneOf' in node:
        body = [b for b in node['oneOf'] if b.get('type') != 'null']
        inner = settings_object(body[0], indent + 1)
        return ['%s  readonly %s:' % (pad, name)] + inner[:-1] + ['%s  } | null' % pad]
    kinds = node.get('type')
    if kinds is None:
        # A key whose own row does not say what it holds; the schema records
        # that rather than guessing, and so does the type.
        return ['%s  /** the source does not say what this holds */' % pad,
                '%s  readonly %s: unknown' % (pad, name)]
    if isinstance(kinds, list):
        base = ' | '.join('null' if k == 'null' else TS_OF[k] for k in kinds)
        return ['%s  readonly %s: %s' % (pad, name, base)]
    if kinds == 'object' and 'properties' in node:
        out = ['%s  readonly %s: {' % (pad, name)]
        for key, child in node['properties'].items():
            out.extend(settings_property(key, child, indent + 1))
        out.append('%s  }' % pad)
        return out
    if kinds == 'array':
        return ['%s  readonly %s: readonly %s[]'
                % (pad, name, TS_OF[node['items'].get('type', 'string')])]
    return ['%s  readonly %s: %s' % (pad, name, TS_OF[kinds])]


TS_OF = {'integer': 'number', 'number': 'number', 'string': 'string',
         'boolean': 'boolean', 'object': 'object'}


def settings_object(node, indent):
    lines = ['{']
    for name, child in node['properties'].items():
        lines.extend(settings_property(name, child, indent))
    lines.append('}')
    return lines


def bounds_of(node, prefix, found):
    """Every numeric bound the sources state, by dotted key."""
    for name, child in node.get('properties', {}).items():
        path = ('%s.%s' % (prefix, name)) if prefix else name
        if 'properties' in child:
            bounds_of(child, path, found)
        elif 'minimum' in child or 'maximum' in child:
            found.append((path, child.get('minimum'), child.get('maximum')))
    return found


def settings_manuscript():
    """Every row of settings.json that carries a machine value, by key.

    The manuscript is the one Chapter 6.2 names; tbl-settings.md is printed
    from it. A row's key is written in the キー column of some tables and the
    名前 column of others, and its value in 既定値 / 既定 / 値 -- the printed
    heading differs, the field name does not.
    """
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    out = {}
    for block in doc['blocks']:
        if block['kind'] != 'table':
            continue
        for row in block['rows']:
            named = row.get('key', row.get('name'))
            if not isinstance(named, str):
                continue                      # a row whose name is prose
            key = named.strip('`').split('`')[0].strip()
            if not key:
                continue
            out[key] = {
                'row': row['id'],
                'default': row.get('default', row.get('value')),
                'min': row.get('min'),
                'max': row.get('max'),
            }
    return out


def literal_of(cell):
    """The TypeScript literal for one machine cell, or None."""
    if not isinstance(cell, dict):
        return None
    if 'num' in cell:
        return cell['num']
    if 'lit' in cell:
        # `quote` says the literal is a string. The document prints a date as
        # 1970-01-01 and not as '1970-01-01', so the quotes cannot live in the
        # cell -- they would print.
        if cell.get('quote'):
            return "'%s'" % cell['lit']
        return cell['lit'].replace("'", "'") if cell['lit'][0] == "'" else cell['lit']
    return None


def derived_defaults(manuscript, direct):
    """Every default a rule computes out of another key.

    ⭐ The rule stays in the manuscript -- `index` for S-3, which follows
    fontScale, and `from`/`times`/`plus` for S-2, which is three lines of the
    ruler plus its padding. Evaluating it here rather than writing the answer
    down keeps the number in one place; a second copy is what CR-175 and
    CR-178 were spent removing.

    ⚠️ Resolved by repeated passes, because one derived key may feed another
    (S-2 reads S-3). A pass that settles nothing means the rest cannot be
    reached, and the caller reports them as unstated rather than guessing.
    """
    known = dict(direct)
    pending = {key: said['default'] for key, said in manuscript.items()
               if isinstance(said['default'], dict)
               and ('index' in said['default'] or 'from' in said['default'])}
    out = {}
    while pending:
        settled = []
        for key, cell in pending.items():
            if 'index' in cell:
                table, by = cell['index']
                chosen = known.get(by)
                value = known.get('%s.%s' % (table, chosen)) if chosen else None
                if isinstance(chosen, str):
                    value = known.get('%s.%s' % (table, chosen.strip("'")))
            else:
                base = known.get(cell['from'])
                value = None
                if isinstance(base, (int, float)):
                    value = base * cell.get('times', 1) + cell.get('plus', 0)
            if value is None:
                continue
            if isinstance(value, float) and value == int(value):
                value = int(value)
            known[key] = value
            out[key] = value
            settled.append(key)
        if not settled:
            break
        for key in settled:
            del pending[key]
    return out


def number_of(cell):
    if isinstance(cell, dict) and 'num' in cell:
        return float(cell['num'])
    return None


# ---- table T-209: the calendar a document starts from ---------------------
#
# ⭐ Unlike table T-206 these values ARE stored: they land in the columns of
# Calendar and Project, so a document made without importing one still round
# trips (EX-1). FR-054 resolves the document's calendar down to them.
#
# ⛔ The two weekday columns are numbered DIFFERENTLY by the exchange format --
# WeekDay/DayType counts 1 = Sunday, Project/WeekStartDay counts 0 = Sunday
# (AT-73 and AT-17) -- so each row states its own encoding and this generator
# never converts between them. Monday is 2 in one row and 1 in the next, and
# that is the format's doing, not a mistake here.
DEFAULT_CALENDAR_ROWS = ['S-106', 'S-107', 'S-108', 'S-128']


def default_calendar_block():
    """Table T-209, by row ID, with the encoding written beside each row."""
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    block = [b for b in doc['blocks'] if b.get('id') == 'T-209']
    if not block:
        raise SystemExit('settings.json holds no table T-209')
    by_id = {r['id']: r for r in block[0]['rows']}
    got = []
    for row_id in DEFAULT_CALENDAR_ROWS:
        if row_id not in by_id:
            raise SystemExit('table T-209 has no row %s' % row_id)
        cell = by_id[row_id].get('value')
        if not isinstance(cell, dict):
            raise SystemExit('table T-209 row %s is not a machine value' % row_id)
        if 'days' in cell:
            days, encoding = cell['days'], cell['encoding']
            note = ('as `WeekDay.dayType` (1 = Sunday)' if encoding == 'dayType'
                    else 'as `Project.weekStartDay` (0 = Sunday)')
            if encoding == 'weekStartDay':
                # That column holds ONE day, so a list of any other length
                # would be silently truncated by whoever read it.
                if len(days) != 1:
                    raise SystemExit(
                        'table T-209 row %s is a weekStartDay and must state '
                        'exactly one day, not %d' % (row_id, len(days)))
                got.append((row_id, str(days[0]), 'number', note))
            else:
                got.append((row_id, '[%s]' % ', '.join(str(d) for d in days),
                            'readonly number[]', note))
        elif 'num' in cell:
            unit = (cell.get('suffix') or '').strip()
            got.append((row_id, cell['num'], 'number',
                        ('in %s' % unit) if unit
                        else 'the number the row states'))
        else:
            raise SystemExit(
                'table T-209 row %s holds no machine value this generator '
                'reads' % row_id)

    out = ['/**',
           ' * Table T-209 -- the values a document starts its calendar from,',
           ' * by row ID. `DEFAULT_CALENDAR` below is built out of them.',
           ' *',
           ' * ⭐ FR-054 resolves the document\'s calendar to these when nothing',
           ' * was imported, or when what was imported left the value empty.',
           ' *',
           ' * ⛔ The two weekday rows do NOT share a numbering. S-106 is in the',
           ' * dayType encoding and S-108 in the weekStartDay one, which differ',
           ' * by one -- so Monday is 2 in the first and 1 in the second. Each',
           ' * row says which below; converting between them is the reader\'s',
           ' * job and the specification states both (AT-73, AT-17).',
           ' */',
           'export const DEFAULT_CALENDAR_VALUES: {']
    for row_id, _literal, ts, note in got:
        out.append('  /** %s, %s */' % (row_id, note))
        out.append("  readonly '%s': %s" % (row_id, ts))
    out.append('} = {')
    for row_id, literal, _ts, _note in got:
        out.append("  '%s': %s," % (row_id, literal))
    out.append('}')
    return '\n'.join(out)


# ---- table T-206: the values the document does NOT store ------------------
#
# ⛔ These rows have no key column: the 値 column of table T-206 is prose for
# most of them ("予定の端点の掴み代"), so they cannot be reached the way
# settings_manuscript() reaches a named setting. They are reached by ROW ID,
# which is the specification's own identifier and invents no name -- and the
# interfaces that consume them already document their fields that way
# (`/** S-90: … */` in PointerSlop).
#
# ⚠️ Which rows land in which unit is decided HERE, not in the manuscript: it
# is a fact about the code's shape, and the manuscript describes values.
NOT_STORED_TARGETS = {
    'NOT_STORED_SIZES': ['S-90', 'S-92', 'S-93'],
    'NOT_STORED_LIMITS': ['S-94', 'S-95'],
}


def not_stored_cell(cell):
    """One machine value of table T-206, as a TypeScript literal and type."""
    if not isinstance(cell, dict):
        return None
    if 'pair' in cell:
        return ('[%s]' % ', '.join(cell['pair']), 'readonly [number, number]')
    if 'num' in cell:
        return (cell['num'], 'number')
    if 'lit' in cell:
        return ("'%s'" % cell['lit'], "'%s'" % cell['lit'])
    return None


def not_stored_block(name):
    """The rows of table T-206 one unit needs, by row ID.

    ⭐ The seam is unchanged: S-94 and S-95 still arrive as an argument, the
    way edit-history.ts says they do. What this adds is a correct thing for the
    caller to pass -- before it, the only place outside docs/spec holding these
    numbers was whatever a caller happened to type.
    """
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    block = [b for b in doc['blocks'] if b.get('id') == 'T-206']
    if not block:
        raise SystemExit('settings.json holds no table T-206')
    by_id = {r['id']: r for r in block[0]['rows']}
    got = []
    for row_id in NOT_STORED_TARGETS[name]:
        if row_id not in by_id:
            raise SystemExit('table T-206 has no row %s' % row_id)
        raw = by_id[row_id].get('default')
        cell = not_stored_cell(raw)
        if cell is None:
            raise SystemExit(
                'table T-206 row %s holds no machine value, so %s cannot be '
                'generated. Give the row a num / pair / lit cell, or take the '
                'row out of NOT_STORED_TARGETS.' % (row_id, name))
        # ⛔ The unit rides along. Without it S-95 generates a bare 64 and the
        # reader cannot tell megabytes from bytes -- the exact defect CR-173
        # closed for S-113, which was a boundary that moved in silence.
        unit = (raw.get('suffix') or '').strip()
        got.append((row_id, cell[0], cell[1], unit))
    out = ['/**',
           ' * The values table T-206 states that this unit needs, by row ID.',
           ' *',
           ' * ⭐ Table T-206 holds what the document does NOT store, so these',
           ' * are not document settings and are not in SETTINGS_DEFAULTS. They',
           ' * are reached by row ID because most rows of that table have no key',
           ' * column -- the row ID is the specification\'s own name for them.',
           ' *',
           ' * ⚠️ Reading this is NOT the same as taking it: the value still',
           ' * arrives as an argument, because table T-206 keeps these out of the',
           ' * document on purpose (the environment may hold a larger one). This',
           ' * is what a caller passes when it has nothing better.',
           ' */',
           'export const %s: {' % name]
    for row_id, _literal, ts, unit in got:
        out.append('  /** %s%s */' % (row_id, (', in %s' % unit) if unit else ''))
        out.append("  readonly '%s': %s" % (row_id, ts))
    out.append('} = {')
    for row_id, literal, _ts, _unit in got:
        out.append("  '%s': %s," % (row_id, literal))
    out.append('}')
    return '\n'.join(out)


DEFAULTS_NOTE = [
    '/**',
    ' * The default settings.json states for each key.',
    ' *',
    ' * ⭐ Before CR-175 nothing generated these. SETTINGS_BOUNDS carried a',
    ' * key\'s range but never its value, so every caller that wanted a default',
    ' * typed the number again -- and when CR-174 moved `minShapeWidth` from 2',
    ' * to 6 not one check, type or test noticed.',
    ' */',
    'export const SETTINGS_DEFAULTS: Readonly<Record<string, unknown>> = {',
]


BOUNDS_NOTE = [
    '/**',
    ' * The bounds tbl-settings.md states for one key on its own.',
    ' * A bound written as another key rather than a number is NOT here: those',
    ' * hold BETWEEN two keys -- FR-052 is the one with a rule of its own -- and',
    ' * no per-key clamp can decide them.',
    ' */',
    'export const SETTINGS_BOUNDS: Readonly<',
    '  Record<string, { readonly min?: number; readonly max?: number }>',
    '> = {',
]


def settings_block(_erd):
    schema = json.load(io.open(SCHEMA, encoding='utf-8'),
                       object_pairs_hook=collections.OrderedDict)
    node = schema['properties']['documentSettings']

    head = '/** The presentation group. DR-3 of table T-052; FR-063 says what is in it. */'
    body = [head + '\nexport interface DocumentSettings '
            + '\n'.join(settings_object(node, 0))]

    manuscript = settings_manuscript()

    rows = []
    for path, low, high in bounds_of(node, '', []):
        parts = []
        if low is not None:
            parts.append('min: %s' % low)
        if high is not None:
            parts.append('max: %s' % high)
        rows.append("  '%s': { %s }," % (path, ', '.join(parts)))
        # ⭐ Two independent readers of the same manuscript have to agree: this
        # bound came from grs-document.schema.json, which erd_json_to_schema.py
        # built by parsing the printed document, while the manuscript is read
        # here directly. A disagreement means one of the two is misreading a
        # cell, which is exactly the failure the whole change request is about.
        said = manuscript.get(path.split('.')[-1] if path not in manuscript else path)
        if said is not None:
            for edge, want in (('min', low), ('max', high)):
                got = number_of(said[edge])
                if want is not None and got is not None and float(want) != got:
                    raise SystemExit(
                        'generate_entity_types: %s (%s) states %s %s in '
                        'settings.json but %s in the generated schema'
                        % (path, said['row'], edge, got, want))

    # The defaults, for every stored key the schema names. A key the schema
    # holds but the manuscript cannot state a machine value for is reported
    # rather than guessed -- those are the rows stage 3b promotes.
    # What each key states outright, before anything is derived. A pair
    # carries two numbers under the names its `parts` gives, which is how a
    # stored key holding an object reaches the code at all.
    direct, literals = {}, {}
    for key, said in manuscript.items():
        cell = said['default']
        if not isinstance(cell, dict):
            continue
        if 'pair' in cell and 'parts' in cell:
            for name, number in zip(cell['parts'], cell['pair']):
                literals['%s.%s' % (key, name)] = number
                direct['%s.%s' % (key, name)] = float(number)
            continue
        literal = literal_of(cell)
        if literal is None:
            continue
        literals[key] = literal
        direct[key] = float(cell['num']) if 'num' in cell else cell.get('lit')

    for key, value in derived_defaults(manuscript, direct).items():
        literals[key] = repr(value)

    defaults, unstated = [], []
    for path in sorted(flat_keys(node, '')):
        # ⚠️ A key whose own cell says `null` HOLDS null; the leaves the schema
        # lists under it describe what it looks like when it is not null, and
        # asking the manuscript for them would report a gap that is not one.
        parent = path.split('.')[0]
        if parent != path and literals.get(parent) == 'null':
            continue
        literal = literals.get(path)
        if literal is None:
            said = manuscript.get(path) or manuscript.get(path.split('.')[-1])
            literal = literal_of(said['default']) if said else None
        if literal is None:
            unstated.append(path)
            continue
        defaults.append("  '%s': %s," % (path, literal))
    for parent, literal in sorted(literals.items()):
        if literal == 'null' and any(p.startswith(parent + '.')
                                     for p in flat_keys(node, '')):
            defaults.append("  '%s': null," % parent)
    defaults.sort()
    if unstated:
        defaults.append('  // ⛔ Not stated as a machine value by settings.json,')
        defaults.append('  // so not generated rather than guessed:')
        for path in unstated:
            defaults.append('  //   %s' % path)
    body.append('\n'.join(DEFAULTS_NOTE + defaults + ['}']))

    body.append('\n'.join(BOUNDS_NOTE + rows + ['}']))
    return '\n\n'.join(body)


def flat_keys(node, prefix):
    """Every leaf key of the presentation group, dotted."""
    for name, child in node.get('properties', {}).items():
        path = ('%s.%s' % (prefix, name)) if prefix else name
        if 'properties' in child:
            for k in flat_keys(child, path):
                yield k
        else:
            yield path


# Each target names EVERY manuscript it is built from. ⚠️ document-settings.ts
# used to say only erd.json while its defaults came from settings.json -- a
# back-pointer that is incomplete sends the next reader to the wrong file, which
# is the same failure as having none.
TARGETS = [
    (os.path.join(MODEL, 'schedule', 'schedule.ts'), schedule_block,
     ['docs/spec/_source/erd.json',
      'docs/spec/_source/settings.json (table T-209)']),
    (os.path.join(MODEL, 'document-stamp', 'document-stamp.ts'), stamp_block,
     ['docs/spec/_source/erd.json']),
    (os.path.join(MODEL, 'document-settings', 'document-settings.ts'), settings_block,
     ['docs/spec/_source/settings.json',
      'docs/spec/_source/erd.json',
      'docs/spec/_source/grs-document.schema.json (itself generated from the two above)']),
    (os.path.join(LAYOUT, 'item-hit-area', 'item-hit-area.ts'),
     lambda _erd: not_stored_block('NOT_STORED_SIZES'),
     ['docs/spec/_source/settings.json (table T-206)']),
    (os.path.join(MODEL, 'edit-history', 'edit-history.ts'),
     lambda _erd: not_stored_block('NOT_STORED_LIMITS'),
     ['docs/spec/_source/settings.json (table T-206)']),
]


def provenance(sources):
    """The lines that lead a reader from this artifact back to its manuscript."""
    out = ['// Single source of truth:']
    out.extend('//   %s' % s for s in sources)
    out.append('// Rebuild: npm run gen   ||   npm run gen:check fails on drift.')
    return '\n'.join(out) + '\n'


def region(text, body):
    """Replace the marked region, leaving everything around it untouched.

    Only what sits between the two markers belongs to this generator. What a
    person writes after the region is theirs, so the separating blank line is
    normalised rather than eaten -- otherwise --check would call a filled-in
    unit "drifted" for a newline nobody typed.
    """
    block = '%s\n%s\n%s\n' % (OPEN, body, CLOSE)
    if OPEN in text:
        head, rest = text.split(OPEN, 1)
        _old, tail = rest.split(CLOSE, 1)
        tail = tail.lstrip('\n')
        return head + block + ('\n' + tail if tail else '')
    # ⛔ A marker this generator no longer recognises. Appending would leave two
    # regions in the file and nothing would say so, which is exactly what
    # happened when CR-175 moved the manuscript.
    if STALE in text:
        raise SystemExit(
            'generate_entity_types: found an unrecognised generated marker.\n'
            '  Replace the "%s…" line with:\n    %s\n  then run this again.'
            % (STALE, OPEN))
    if text and not text.endswith('\n'):
        text += '\n'
    return text + '\n' + block


def main():
    erd = json.load(io.open(ERD, encoding='utf-8'),
                    object_pairs_hook=collections.OrderedDict)
    checking = '--check' in sys.argv
    drift = 0

    for path, build, sources in TARGETS:
        if not os.path.exists(path):
            say('MISSING  %s -- run tools/generate_unit_tree.py first'
                % os.path.relpath(path, ROOT).replace('\\', '/'))
            return 1
        current = io.open(path, encoding='utf-8', newline='').read()
        # The manuscript's path rides in the body, not in the marker: the body
        # is rewritten every run, so moving the manuscript can never make the
        # region undiscoverable (see the note on OPEN).
        wanted = region(current, provenance(sources) + build(erd))
        rel = os.path.relpath(path, ROOT).replace('\\', '/')
        if checking:
            if current != wanted:
                say('DRIFTED  %s no longer matches erd.json -- rerun '
                    'generate_entity_types.py' % rel)
                drift = 1
            continue
        io.open(path, 'w', encoding='utf-8', newline='\n').write(wanted)
        say('wrote %s' % rel)

    if checking and drift == 0:
        say('OK       the generated types still match erd.json')
    return drift


if __name__ == '__main__':
    sys.exit(main())
