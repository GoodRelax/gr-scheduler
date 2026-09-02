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
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ERD = os.path.join(ROOT, 'docs', 'spec', '_source', 'erd.json')
SCHEMA = os.path.join(ROOT, 'docs', 'spec', '_source', 'grs-document.schema.json')
SETTINGS = os.path.join(ROOT, 'docs', 'spec', '_source', 'settings.json')
MODEL = os.path.join(ROOT, 'src', 'entity', 'document-model')
LAYOUT = os.path.join(ROOT, 'src', 'entity', 'layout-engine')
# ⚠️ Not every generated region lands in Entity. Table T-206 holds values whose
# consumer is an Adapter unit, and the constant goes where its consumer is --
# see the note on NOT_STORED_TARGETS.
ADAPTER = os.path.join(ROOT, 'src', 'adapter')
USECASE = os.path.join(ROOT, 'src', 'use-case')
# ⚠️ AND ONE LANDS IN FRAMEWORK. S-138 is the box a glyph of figure F-019 is
# drawn in, and the only unit that draws one is DomScreenSurface -- the same
# rule as above, followed one layer further out. ⛔ No import crosses for it:
# the constant STANDS in its consumer, so table T-064 gains no member and no new
# name crosses a component folder.
FRAMEWORK = os.path.join(ROOT, 'src', 'framework')

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
STAMP_ENTITIES = ('documentStamp', 'changeLog')

# The TypeScript name of each. Written as a MAPPING and not as a conditional:
# a conditional that names one entity turns every OTHER name into the second
# type, so a rename in the manuscript emitted the same interface twice and
# only `tsc` said so (CR-205 renamed `revisionStamp` to `documentStamp`).
# ⚠️ `changeLog` is a collection in the document and one entry in the type,
# which is why the two names are not simply capitalised.
TS_NAME_OF_STAMP_ENTITY = {
    'documentStamp': 'DocumentStamp',
    'changeLog': 'ChangeLogEntry',
}

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


# ⭐ THE ENTITIES THE PROPERTIES PANEL EDITS, and no others. The paragraph
# under table T-016 (MUST NOT) forbids the choices, the numeric bounds and the
# date columns to be written into that table on the ground that
# grs-document.schema.json and DATE_COLUMNS already hold them -- so the panel
# has to DERIVE them, and nothing carried the manuscript's enumerations and
# bounds into src/ at all. ⛔ Four entities and not all eighteen: FR-006's table
# T-016 is the `Task` roster (with `TaskVisual` for the drawn columns), FR-042
# adds a row's colour and height (`TaskGroup`), and FR-009 adds the dependency
# line. A roster of every entity would state a shape for columns no surface
# offers.
#
# ⚠️ READ FROM erd.json AND NOT FROM grs-document.schema.json, although the
# paragraph names the schema. That file is ITSELF generated from erd.json by
# erd_json_to_schema.py, so erd.json is the manuscript -- and naming a third
# source in schedule.ts's banner would push its "Rebuild:" line out of the
# window check 27 reads a banner in.
SHAPED_ENTITIES = ['Task', 'TaskVisual', 'TaskGroup', 'Dependency']

COLUMN_SHAPES_NOTE = [
    '/**',
    ' * What each column of the four edited entities accepts, as the 型 column',
    ' * of table T-058 states it.',
    ' *',
    ' * ⭐ THE PARAGRAPH UNDER TABLE T-016 (MUST NOT) forbids the choices,',
    ' * the numeric bounds and the date columns to be copied into that',
    ' * table, on the ground that the schema and DATE_COLUMNS already hold',
    ' * them. This is how they reach src/: a surface that offers a choice',
    ' * reads the roster instead of re-typing it, and a value the',
    ' * manuscript adds appears without anyone editing a list.',
    ' *',
    " * ⛔ `kind` IS THE MANUSCRIPT'S OWN WORD (`integer`, `string`, `enum`,",
    ' * `boolean`, `map`, `array`, `object`, `number`), not a name minted',
    ' * here. ⚠️ Which columns are DATES is NOT among them -- DATE_COLUMNS',
    ' * above is where that is answered, and asking twice would be two',
    ' * rosters to keep in step.',
    ' */',
    'export const COLUMN_SHAPES: {',
]


def column_shape(node):
    """One column's accepted shape, read off the 型 column of table T-058."""
    return (node.get('kind'), node.get('values'), node.get('min'),
            node.get('max'), bool(node.get('null')))


def column_shapes_block(erd):
    """The accepted shape of every column of the four edited entities."""
    by_name = dict((e['name'], e) for e in erd['entities'])
    out = list(COLUMN_SHAPES_NOTE)
    for name in SHAPED_ENTITIES:
        if name not in by_name:
            raise SystemExit('erd.json holds no entity %s' % name)
        out.append('  readonly %s: {' % name)
        out.append('    readonly [column: string]: ColumnShape')
        out.append('  }')
    out.append('} = {')
    for name in SHAPED_ENTITIES:
        out.append('  %s: {' % name)
        for column in by_name[name]['columns']:
            kind, choices, low, high, nullable = column_shape(column['json'])
            out.append(
                "    %s: { kind: '%s', choices: %s, min: %s, max: %s, isNullable: %s },"
                % (column['name'], kind,
                   ('[%s]' % ', '.join("'%s'" % c for c in choices))
                   if choices is not None else 'null',
                   'null' if low is None else low,
                   'null' if high is None else high,
                   'true' if nullable else 'false'))
        out.append('  },')
    out.append('}')
    return '\n'.join(COLUMN_SHAPE_TYPE) + '\n\n' + '\n'.join(out)


COLUMN_SHAPE_TYPE = [
    '/** What one column accepts. `null` in a bound means the manuscript states none. */',
    'export interface ColumnShape {',
    "  /** The 型 column's own word: `integer`, `string`, `enum`, `boolean`, and so on. */",
    '  readonly kind: string',
    '  /** The values a column of kind `enum` admits. */',
    '  readonly choices: readonly string[] | null',
    '  readonly min: number | null',
    '  readonly max: number | null',
    '  /** Whether the 空を許すか column admits an empty value. */',
    '  readonly isNullable: boolean',
    '}',
]


# The marks the 鍵の欄 of table T-058 puts on a column. ⚠️ Written as a
# MAPPING of every mark this generator understands, so that a mark the
# manuscript grows raises key_marks() below instead of dropping the column out
# of both rosters in silence -- which is how IV-1 and IV-2 would quietly stop
# judging a whole entity.
KEY_MARK_IS_PRIMARY = {'': False, 'PK': True, 'FK': False, 'PK/FK': True}
KEY_MARK_IS_FOREIGN = {'': False, 'PK': False, 'FK': True, 'PK/FK': True}


def key_marks(erd):
    """Which columns the key column of table T-058 makes a key, by entity.

    ⛔ An unknown mark is an error, not a shrug: IV-1 and IV-2 reach their
    columns through this roster and nothing else would say a column had gone
    missing from it.
    """
    primary, foreign = {}, {}
    for entity in erd['entities']:
        got_primary, got_foreign = [], []
        for column in entity['columns']:
            mark = column.get('key', '')
            if mark not in KEY_MARK_IS_PRIMARY:
                raise SystemExit(
                    'erd.json marks %s.%s with %r, which this generator does '
                    'not know. Add it to KEY_MARK_IS_PRIMARY and '
                    'KEY_MARK_IS_FOREIGN.' % (entity['name'], column['name'], mark))
            if KEY_MARK_IS_PRIMARY[mark]:
                got_primary.append(column['name'])
            if KEY_MARK_IS_FOREIGN[mark]:
                got_foreign.append(column['name'])
        primary[entity['name']] = got_primary
        foreign[entity['name']] = got_foreign
    return primary, foreign


def reference_targets(erd):
    """Where each foreign key lands, from the relations of table T-057.

    ⭐ A relation states the column that holds the reference and the column it
    lands on, so the target is read rather than guessed from the spelling of
    the column. A relation that holds no column at all says so with a
    `noReference` note, and is passed over here.
    """
    out = {}
    for relation in erd['relations']:
        column = relation.get('fromColumn')
        if column is None:
            if 'noReference' not in relation:
                raise SystemExit(
                    'erd.json relates %s to %s with no fromColumn and no '
                    'noReference note, so this generator cannot tell a missing '
                    'column from one that does not exist'
                    % (relation['parent'], relation['child']))
            continue
        seat = (relation['parent'], column)
        if seat in out:
            raise SystemExit(
                'erd.json gives %s.%s two relations, so IV-2 would have two '
                'answers for one column' % seat)
        out[seat] = (relation['child'], relation['toColumn'])
    return out


def foreign_key_block_rows(erd, foreign, primary):
    """One (entity, column, child, toColumn) per foreign key, cross-checked.

    ⭐ Two independent halves of the manuscript have to agree: the key column
    of table T-058 says WHICH columns hold a reference, and the relations of
    table T-057 say where each lands. A column marked in one and absent from
    the other is a hole in IV-2, so it is an error here rather than a row the
    walk never reaches.
    """
    targets = reference_targets(erd)
    columns = {e['name']: set(c['name'] for c in e['columns'])
               for e in erd['entities']}
    out = {}
    for entity in erd['entities']:
        got = []
        for column in foreign[entity['name']]:
            seat = (entity['name'], column)
            if seat not in targets:
                raise SystemExit(
                    'table T-058 marks %s.%s a foreign key but no relation of '
                    'table T-057 carries it, so IV-2 has nowhere to land it'
                    % seat)
            child, to_column = targets[seat]
            if to_column not in columns.get(child, ()):
                raise SystemExit(
                    'erd.json lands %s.%s on %s.%s, which is not a column of '
                    'that entity' % (entity['name'], column, child, to_column))
            if to_column not in primary[child]:
                raise SystemExit(
                    'erd.json lands %s.%s on %s.%s, which the key column of '
                    'table T-058 does not make a primary key'
                    % (entity['name'], column, child, to_column))
            got.append((column, child, to_column))
        out[entity['name']] = got
    for seat in targets:
        if seat[1] not in foreign.get(seat[0], ()):
            raise SystemExit(
                'a relation of table T-057 carries %s.%s but the key column of '
                'table T-058 does not mark it a foreign key' % seat)
    return out


def nested_rows(entity):
    """The columns of one row that hold rows of another entity.

    ⭐ Read off the same "json" key the interfaces above are written from: a
    column holding an array of a named entity IS where those rows sit. IV-1
    judges each such array on its own and IV-2 looks a reference up across all
    of them, and neither can reach a row it cannot walk to.
    """
    got = []
    for column in entity['columns']:
        spec = column['json']
        if spec.get('kind') == 'array' and spec.get('of', {}).get('kind') == 'ref':
            got.append((column['name'], spec['of']['entity']))
    return got


ENTITY_ROWS_NOTE = [
    '/**',
    ' * Where the schedule group puts the rows of each entity, and what the key',
    ' * column of table T-058 and the relations of table T-057 say about them.',
    ' *',
    ' * ⭐ IV-1 and IV-2 reach their columns by pointing at those two columns of',
    ' * the manuscript rather than by naming them, and the closing remark of',
    ' * table T-220 refuses to list the columns for exactly that reason. So this',
    ' * is the roster, generated the way DATE_COLUMNS is, and not a second copy',
    ' * of it that would go stale the moment a column is added (F-3).',
    ' *',
    ' * ⚠️ The entity and column names are strings and not `keyof`, because the',
    ' * walk that reads them is driven by the roster itself. What keeps them',
    ' * honest is the manuscript: every name below is spelled by erd.json, and',
    ' * the generator refuses to write a foreign key whose target is not a',
    ' * column of the entity it lands on.',
    ' */',
]


def holds_many(shape):
    """Whether one row of the container box holds an array or a single row.

    ⚠️ A Japanese literal, and the one exception rule 03 section 5 names: the
    shape column of the container is written in Japanese and something has to
    read it. It is read HERE and nowhere else, so the word sits in one place --
    the `Schedule` interface and the roster below both ask this.
    """
    return shape == '配列'


def ts_array_field(name, members, indent=4):
    """One array field of a roster entry, broken up when the line grows long."""
    pad = ' ' * indent
    one_line = '%s%s: [%s],' % (pad, name, ', '.join(members))
    if len(one_line) <= 92:
        return [one_line]
    return ([('%s%s: [' % (pad, name))]
            + ['%s  %s,' % (pad, member) for member in members]
            + ['%s],' % pad])


def entity_rows_block(erd):
    """The roster IV-1 and IV-2 are driven by."""
    primary, foreign = key_marks(erd)
    references = foreign_key_block_rows(erd, foreign, primary)
    box = [b for b in erd['container']['boxes'] if b['id'] == 'schedule'][0]
    seat_of = {}
    for shape, key, entity in box['entity_rows']:
        seat_of[entity] = (key, holds_many(shape))

    out = [
        '/** One foreign key of an entity, and the row of table T-057 it lands on. */',
        'export interface ForeignKeyColumn {',
        '  /** The column of this entity that holds the reference. */',
        '  readonly fromColumn: string',
        '  /** The entity whose rows it names. */',
        '  readonly child: string',
        '  /** The column of that entity it lands on. */',
        '  readonly toColumn: string',
        '}',
        '',
        '/** One column of a row that holds rows of another entity. */',
        'export interface NestedRows {',
        '  readonly column: string',
        '  readonly entity: string',
        '}',
        '',
        '/** One entity of table T-056, as IV-1 and IV-2 need it. */',
        'export interface EntityRows {',
        '  readonly entity: string',
        '  /** The key of `Schedule` its rows sit in, or `null` when they sit in a row. */',
        '  readonly scheduleKey: string | null',
        '  /** Whether that key holds many rows or one. */',
        '  readonly many: boolean',
        '  /** The columns the key column of table T-058 marks a primary key. */',
        '  readonly primaryKey: readonly string[]',
        '  /** The columns it marks a foreign key, each with where it lands. */',
        '  readonly foreignKeys: readonly ForeignKeyColumn[]',
        '  /** The columns of one row that hold rows of another entity. */',
        '  readonly nested: readonly NestedRows[]',
        '}',
        '',
    ] + list(ENTITY_ROWS_NOTE) + ['export const ENTITY_ROWS: readonly EntityRows[] = [']

    for entity in erd['entities']:
        name = entity['name']
        if name in STAMP_ENTITIES:
            continue
        key, many = seat_of.get(name, (None, False))
        out.append('  {')
        out.append("    entity: '%s'," % name)
        out.append('    scheduleKey: %s,' % (("'%s'" % key) if key else 'null'))
        out.append('    many: %s,' % ('true' if many else 'false'))
        out.append('    primaryKey: [%s],'
                   % ', '.join("'%s'" % c for c in primary[name]))
        out.extend(ts_array_field(
            'foreignKeys',
            ["{ fromColumn: '%s', child: '%s', toColumn: '%s' }" % one
             for one in references[name]]))
        out.extend(ts_array_field(
            'nested',
            ["{ column: '%s', entity: '%s' }" % one
             for one in nested_rows(entity)]))
        out.append('  },')
    out.append(']')
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
                                           if holds_many(shape) else entity))
    out.append('/** The schedule group. Its keys are DR-2 of table T-052. */\n'
               'export interface Schedule {\n%s\n}' % '\n'.join(keys))
    out.append(date_columns_block(erd))
    out.append(column_shapes_block(erd))
    out.append(entity_rows_block(erd))
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
        renamed['name'] = TS_NAME_OF_STAMP_ENTITY[name]
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
    # ⛔ THE SHAPE IS READ BEFORE THE TYPE LIST. A node may state its kind as a
    # list AND still carry `properties`, and then the list is not a union of
    # names -- it says "this shape, or null". Reading the names alone printed
    # the bare `object` below and threw the fields away.
    # ⚠️ S-65 is the one key written that way (its `json` block gives date1 and
    # date2 and sets `null`), and DC-7 is what the `| null` is for: clearing the
    # two cursors puts the key back to null. ⛔ Losing either half is a defect:
    # without the fields nothing can read the dates, without the null DC-7
    # cannot be expressed.
    names = kinds if isinstance(kinds, list) else [kinds]
    if 'object' in names and 'properties' in node:
        out = ['%s  readonly %s: {' % (pad, name)]
        for key, child in node['properties'].items():
            out.extend(settings_property(key, child, indent + 1))
        beside = ['null' if k == 'null' else TS_OF[k]
                  for k in names if k != 'object']
        out.append('%s  }%s' % (pad, ''.join(' | ' + k for k in beside)))
        return out
    if isinstance(kinds, list):
        base = ' | '.join('null' if k == 'null' else TS_OF[k] for k in kinds)
        return ['%s  readonly %s: %s' % (pad, name, base)]
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


# ⚠️ The manuscript writes its arithmetic with the typographic signs, not the
# ASCII ones. ⛔ Named by code point rather than typed, so this file stays ASCII
# (rule 03 section 5): multiply, divide, minus.
MANUSCRIPT_SIGNS = ((chr(0x00D7), '*'), (chr(0x00F7), '/'), (chr(0x2212), '-'))

BOUND_PIECE = re.compile(r'`([^`]+)`|(\d+(?:\.\d+)?)|([-+*/()])|(\s+)')

# Left-associative, and the only two levels the manuscript's bound fields use.
BOUND_PRECEDENCE = {'+': 1, '-': 1, '*': 2, '/': 2}


def bound_pieces(text):
    """One bound field, cut into keys, numbers and operators.

    Answers `None` when a character this generator does not read turns up, so
    that a field which is prose rather than arithmetic is passed over instead
    of half-read.
    """
    for sign, plain in MANUSCRIPT_SIGNS:
        text = text.replace(sign, plain)
    out, at = [], 0
    while at < len(text):
        piece = BOUND_PIECE.match(text, at)
        if piece is None:
            return None
        at = piece.end()
        if piece.group(1) is not None:
            out.append(('key', piece.group(1)))
        elif piece.group(2) is not None:
            out.append(('num', piece.group(2)))
        elif piece.group(3) is not None:
            out.append(('op', piece.group(3)))
    return out


def bound_expression(pieces):
    """The same field in postfix order, so the reader needs no parser.

    ⭐ Postfix rather than the field's own spelling: evaluating it where the
    bound is judged means the expression is applied to the settings the
    DOCUMENT holds, which is what IV-16 asks for. A number worked out here
    would be the answer for the defaults and for nothing else.
    """
    out, ops = [], []
    for kind, held in pieces:
        if kind in ('key', 'num'):
            out.append((kind, held))
        elif held == '(':
            ops.append(held)
        elif held == ')':
            while ops and ops[-1] != '(':
                out.append(('op', ops.pop()))
            if not ops:
                return None
            ops.pop()
        elif held in BOUND_PRECEDENCE:
            while (ops and ops[-1] != '('
                   and BOUND_PRECEDENCE[ops[-1]] >= BOUND_PRECEDENCE[held]):
                out.append(('op', ops.pop()))
            ops.append(held)
        else:
            return None
    while ops:
        held = ops.pop()
        if held == '(':
            return None
        out.append(('op', held))
    # A well-formed expression leaves exactly one value on the stack.
    depth = 0
    for kind, _held in out:
        depth += -1 if kind == 'op' else 1
        if depth < 1:
            return None
    return out if depth == 1 else None


def ts_bound_expression(expression):
    """The postfix field as the array the generated reader walks."""
    spelled = []
    for kind, held in expression:
        if kind == 'key':
            spelled.append("{ key: '%s' }" % held)
        elif kind == 'num':
            spelled.append('{ num: %s }' % held)
        else:
            spelled.append("{ op: '%s' }" % held)
    return '[%s]' % ', '.join(spelled)


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
    fontScale, and `from`/`times`/`plusFrom`/`plusTimes` for S-2, which is
    three rows of the ruler plus three rows' worth of its padding. Evaluating
    it here rather than writing the answer down keeps the number in one place;
    a second copy is what CR-175 and CR-178 were spent removing.

    ⚠️ `plusFrom` names a key where `plus` would have written a number.
    CR-200 needed it: once the padding became a settings row of its own
    (S-136), a literal 6 here would have been that row written a second time.

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
                added = cell.get('plus', 0)
                if 'plusFrom' in cell:
                    # ⛔ Named, not resolved yet, is NOT zero: adding nothing
                    # would settle the key at a wrong value and the pass that
                    # could have settled it right would never run again.
                    other = known.get(cell['plusFrom'])
                    added = (cell.get('plus', 0) + other * cell.get('plusTimes', 1)
                             if isinstance(other, (int, float)) else None)
                if isinstance(base, (int, float)) and added is not None:
                    value = base * cell.get('times', 1) + added
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
#
# ⛔ ONE CONSTANT PER CONSUMING UNIT, never a shared one. S-134 is a 掴み帯 the
# same way S-90 to S-93 are, but its consumer is screen-frame.ts in the Adapter
# layer while NOT_STORED_SIZES is generated into item-hit-area.ts in the Entity
# layer. Adding the row to that constant would hand one unit a value belonging
# to another, which is the duplication rule 03 section 1 forbids -- and the
# Adapter would have to import an Entity unit to read a number the layer rules
# (table T-061) never meant it to cross for.
#
# ⭐ Each entry is (the rows, the paragraph that says HOW the unit gets them).
# The paragraph differs because the seam does: the first two are handed their
# values, and the third reads its own.
ARRIVES_AS_ARGUMENT = [
    ' * ⚠️ Reading this is NOT the same as taking it: the value still',
    ' * arrives as an argument, because table T-206 keeps these out of the',
    ' * document on purpose (the environment may hold a larger one). This',
    ' * is what a caller passes when it has nothing better.',
]
# ⛔ A THIRD SEAM: no door AND no caller. S-138 and S-140 are read by the unit
# that draws with them, and neither crosses a contract -- S-140 is the room the
# row control keeps, which only the side that lays the panel out can subtract,
# and S-138 is a constant of the drawing itself rather than of any one item.
DRAWN_WITH_WHERE_IT_STANDS = [
    ' * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a',
    ' * document setting and neither may become one: table T-206 is where',
    ' * the specification records that the document does not keep them,',
    ' * and the export draws no entrance at all (EP-1 and EP-4 of table',
    ' * T-076), so a reader handed this document sees the same picture',
    ' * whatever this value is.',
]
# ⛔ A SEAM OF ITS OWN, AND THE ONE GROUND ABOVE DOES NOT FIT. S-138 and S-218
# are the room GR-20's grab strip keeps beside the row's name, and FR-085 (MUST)
# subtracts both of them before cutting that name -- so what they settle is
# WHERE THE NAME IS CUT, and EP-3 of table T-076 draws the panel into the
# exported picture. ⇒ The closing sentence of DRAWN_WITH_WHERE_IT_STANDS ("the
# reader sees the same picture whatever this value is") would be false here, and
# FR-085 says so itself: 「書き出し専用の幅を設けてはならない」.
SUBTRACTED_WHERE_IT_STANDS = [
    ' * ⚠️ This unit reads the row where it stands because the arithmetic',
    ' * is its own: FR-085 (MUST) cuts the row name at what is left of the',
    ' * panel once the indent, the room the row controls keep and the room',
    ' * GR-20 of table T-023d keeps are taken off, and nothing on IF-9',
    ' * carries a length for a caller to hand in. ⛔ Neither row is a',
    ' * document setting and neither may become one: table T-206 is where',
    ' * the specification records that the document does not keep them.',
    ' * ⭐ The cut they settle IS in the exported picture (EP-3 of table',
    " * T-076), which is why FR-085 (MUST NOT) refuses an export width of",
    ' * its own -- so these are not values a screen may hold alone.',
]

# ⛔ THE SAME THIRD SEAM, WITH A DIFFERENT GROUND. S-180 is read by the unit
# that draws with it, exactly as S-138 and S-140 are -- but the sentence that
# tells a reader their picture does not change is NOT the same sentence. The
# entrance is absent from an export because EP-1 and EP-4 draw no entrance at
# all; the dummy is absent because EP-14 says so of U-52 alone, and that row
# adds that no place is reserved for it (it lies over the task bar). ⛔ Sharing
# one paragraph would print the wrong row ID in the one place a reader looks
# for it, which is the copied-value defect rule 03 section 3 names.
DRAWN_FOR_THE_SCREEN_ALONE = [
    ' * ⚠️ This unit reads the row where it stands. ⛔ It is not a document',
    ' * setting and may not become one: table T-206 is where the',
    ' * specification records that the document does not keep it, and EP-14',
    ' * of table T-076 keeps the dummy out of the exported picture without',
    ' * reserving its place -- so a reader handed this document sees the',
    ' * same picture whatever this value is.',
]

# ⛔ THE SAME THIRD SEAM, AND A FOURTH GROUND. S-143 is read by the unit that
# draws with it, as S-138 is -- ⚠️ but the closing sentence of the
# entrance rows does NOT fit. EP-1 and EP-4 of table T-076 keep an ENTRANCE out
# of an exported picture, and this row is no entrance: its own note in table
# T-206 says the rule is a line rather than a word and not a shape either, so
# it has no row of table T-109 and no shape of figure F-019. What keeps it out
# of an export is EP-11, which draws no Command Palette at all.
#
# ⛔ AND THE UNIT IS NOT THE ONE THAT DESCRIBES THE PALETTE. UF-65 builds the
# groups and says in its own note that the rule belongs to the drawing side,
# which is DomScreenSurface in Framework -- and that side may not import
# command-palette.ts, because it is not ScreenRenderer's public entry
# (Chapter 5.3 MUST NOT, LR-2 of table T-061, enforced by
# tools/check_layer_rules.py). ⚠️ Routed here for the round S-143 spent in
# NOT_STORED_COMMAND_PALETTE_SIZES, where it was read by nobody and the
# boundary FR-053 (MUST) asks for was drawn by nothing.
DRAWN_INSIDE_THE_COMMAND_PALETTE = [
    ' * ⚠️ This unit reads the row where it stands. ⛔ It is not a document',
    ' * setting and may not become one: table T-206 is where the',
    ' * specification records that the document does not keep it. ⚠️ The',
    ' * closing sentence of the entrance rows does NOT fit -- EP-1 and EP-4',
    ' * of table T-076 keep an ENTRANCE out of an exported picture, and this',
    ' * row is no entrance: table T-206 says of it that the boundary is a',
    ' * line rather than a word and not a shape either, so it has no row of',
    ' * table T-109 and no shape of figure F-019. ⭐ What keeps it out of an',
    ' * export is EP-11, which draws no `Command Palette` at all.',
]

# ⛔ A FIFTH GROUND, AND THE ONLY ONE WHOSE PICTURE LEAVES THE TOOL. S-194 is
# read by the unit that draws with it, as S-138 and S-180 are -- but all
# three of their closing sentences say some form of "the export does not show
# this", and EP-6 of table T-076 puts the Dual Cursor's two lines INTO the
# exported picture. What table T-206 records here is narrower: the document
# keeps the two DATES (S-65) and never the width they are drawn at.
DRAWN_INTO_THE_EXPORTED_PICTURE = [
    ' * ⚠️ This unit reads the row where it stands. ⛔ It is not a document',
    ' * setting and may not become one: table T-206 is where the',
    ' * specification records that the document does not keep it. ⭐ AND',
    ' * ITS PICTURE DOES LEAVE THE TOOL -- EP-6 of table T-076 draws the',
    ' * two lines into an exported picture -- so what makes this the',
    " * reader's own is not that the mark is hidden but that the document",
    ' * keeps the two DATES (S-65) and never the width they take.',
]

# ⛔ A SIXTH GROUND, AND THE SECOND WHOSE PICTURE LEAVES THE TOOL. S-196 is the
# gap the name label of a line-only shape is lifted by (the label column of table
# T-012), and it is read by the unit that lays the label out. ⛔ The ground of
# S-138 and S-180 does NOT fit: both close with some form of "the
# export does not show this", and EP-5 of table T-076 draws the Row Area's
# contents -- the name label among them -- INTO the exported picture. ⚠️ Nor is
# S-194's sentence right: that one turns on the document keeping the two DATES,
# and a label has no such pair. What table T-206 records here is that the
# document keeps the label's ANCHOR (PR-13, nameAnchor / nameAlign) and never
# the gap the shape's own kind implies.
DRAWN_INTO_THE_EXPORTED_PICTURE_FROM_THE_SHAPE = [
    ' * ⚠️ This unit reads the row where it stands. ⛔ It is not a document',
    ' * setting and may not become one: table T-206 is where the',
    ' * specification records that the document does not keep it. ⭐ AND',
    ' * ITS PICTURE DOES LEAVE THE TOOL -- EP-5 of table T-076 draws the',
    " * `Row Area`'s contents, the name label among them, into an exported",
    " * picture -- so what makes this the reader's own is not that the gap",
    " * is hidden but that the document keeps the label's ANCHOR (PR-13)",
    " * and never the gap the shape's own kind implies.",
]

# ⛔ A SEVENTH GROUND, AND THE ONE WHOSE PICTURE HAS NOWHERE TO STAND. S-209
# is the distance between the two lines of CU-3's 縦 2 本, read by the unit
# that draws them. ⛔ The ground of S-138 and S-180 does NOT fit: those close
# on EP-1 / EP-4, which keep an ENTRANCE out of an export, and on EP-14, which
# keeps the dummy out -- and a cursor is neither. ⚠️ Nor is S-194's sentence
# right: that one turns on the picture LEAVING the tool, and EP-6 of table
# T-076 draws the `Status Line` and the `Dual Cursor` while keeping the
# `Guide Cursor` OUT. ⭐ The reason EP-6 gives is this row's own, and no other
# row of table T-206 stands on it: 「書き出した時点のポインタの位置に意味が
# 無い」 -- a line that follows a hand has nowhere to stand in a picture no
# hand is over.
DRAWN_UNDER_THE_HAND_ALONE = [
    ' * ⚠️ This unit reads the row where it stands. ⛔ It is not a document',
    ' * setting and may not become one: table T-206 is where the',
    ' * specification records that the document does not keep it. ⭐ What',
    ' * keeps it out of an exported picture is EP-6 of table T-076, which',
    ' * draws the `Status Line` and the `Dual Cursor` and NOT the',
    ' * `Guide Cursor` -- 「書き出した時点のポインタの位置に意味が無い」 --',
    ' * so a reader handed this document sees the same picture whatever',
    ' * this value is.',
]

READ_WHERE_IT_STANDS = [
    ' * ⚠️ This unit reads the row where it stands instead of being handed',
    ' * it: the contract in screen-renderer.ts fixes UF-61 at three',
    ' * arguments, and FR-051 (MUST NOT) forbids a setting to hold the',
    ' * value either -- so there is no door to pass it through. ⛔ It is',
    ' * still not a document setting and must not become one.',
]
# ⛔ A FOURTH SEAM: no door AND no caller, because the clock is the shell's
# own. FT-4 of table T-078 puts time arriving among the triggers a frame runs
# on and gives it to SingleHtmlShell (CP-25) to count for itself, and the note
# under that table refuses to widen what IF-2 supplies (table T-065) on the
# ground that a time is the host's value rather than an input device's event.
# So no argument may be added to hand these in through, and the unit that
# measures the wait is the unit that reads the rows.
TIMED_WHERE_IT_STANDS = [
    ' * ⚠️ This unit reads the row where it stands because the clock is its',
    ' * own to read: FT-4 of table T-078 counts time arriving as a trigger',
    ' * the shell measures for itself, and the note under that table refuses',
    ' * to widen what IF-2 supplies (table T-065) -- so there is no argument',
    ' * to be handed these through and none may be added. ⛔ Neither row is a',
    ' * document setting and neither may become one: the note on S-173 puts',
    ' * the speed of a repeat with the reader rather than with the document,',
    ' * which is the same ground the grab rows stand on.',
]
# ⛔ A FIFTH SEAM: no door AND no caller, because the record is made of what
# this loop itself receives. FR-102 (MUST) has a person start and stop a record
# of the happenings and the frames, and both of those are the shell's own --
# IF-2 delivers the happenings here and table T-078 runs the frames here -- so
# there is no argument any caller could hand the cap in through.
KEPT_WHERE_IT_STANDS = [
    ' * ⚠️ This unit reads the row where it stands because the record is',
    ' * its own to keep: FR-102 (MUST) records the happenings IF-2 delivers',
    ' * to this loop and the frames table T-078 runs in it, so no caller is',
    ' * in a position to be handed the cap on its behalf and no argument may',
    ' * be added to pass it through. ⛔ The row is not a document setting',
    ' * and must not become one -- FR-102 (MUST NOT) keeps the record out of',
    ' * the document, and table T-206 is where the specification says so.',
]
# ⛔ A SIXTH SEAM: no door AND no caller, because the DECISION is the reading
# unit's own. S-208 is the distance HF-15 of table T-051 settles a grab's axis
# at -- 「掴んでから最初に閾値を超えた向きで軸が決まり、離すまで変わらない
# （MUST）」 -- and the unit that settles it is InputCommandTranslator. ⛔ The
# zoom trio's seam does NOT fit, although both land in that file: S-53 arrives
# as an argument because the SHELL applies the zoom and has to pass the step
# it stepped by, and nothing outside this unit applies an axis. ⛔ Nor does any
# drawing ground fit -- those close on what an exported picture does not show,
# and a threshold appears in no picture at all.
SETTLED_WHERE_IT_STANDS = [
    ' * ⚠️ This unit reads the row where it stands because the decision is',
    ' * its own to make: HF-15 of table T-051 (MUST) settles the axis of a',
    ' * grab at the first travel past this distance and holds it until the',
    ' * release, and no member of `InputContext` carries a distance for a',
    ' * caller to hand in. ⛔ It is not a document setting and must not',
    ' * become one: table T-206 is where the specification records that the',
    " * document does not keep it, and it stands on S-138's ground.",
]
# ⭐ Three rows of table T-206 hold no value of their own: their 値 column NAMES
# a row of table T-201 instead (S-96 -> S-53, S-97 -> S-54, S-98 -> S-55). The
# zoom trio is stated once, among the drawing settings, and table T-206 records
# only that the document does not keep it.
#
# ⛔ Before this, nothing carried them into src/ at all, and that single gap
# stopped the whole of FT-1: `InputContext.zoomStep` is S-53 and
# `SettingsLimits.zoomMin` / `zoomMax` are S-54 / S-55, so no member of PI-18
# could be called and no pointer or key ever reached the application.
ARRIVES_AS_ARGUMENT_ZOOM = ARRIVES_AS_ARGUMENT + [
    ' *',
    ' * ⚠️ Table T-206 states these by POINTING at table T-201 (S-96 names',
    ' * S-53, and so on), so both row IDs appear below: the first is where',
    ' * the specification says the document does not keep the value, and',
    ' * the second is where the value itself stands.',
]
NOT_STORED_TARGETS = {
    'NOT_STORED_SIZES': (['S-90', 'S-91', 'S-92', 'S-93', 'S-137'], ARRIVES_AS_ARGUMENT),
    'NOT_STORED_LIMITS': (['S-94', 'S-95'], ARRIVES_AS_ARGUMENT),
    'NOT_STORED_PANEL_DIVIDER_SIZES': (['S-134'], READ_WHERE_IT_STANDS),
    # ⛔ S-135a ALONE, AND S-143 IS NOT WITH IT ANY MORE. Both rows are the
    # palette's, but the seam is not the same one: S-135a is a height UF-65
    # carries on the description it builds, and S-143 is a line the DRAWING
    # side lays between the groups -- see the paragraph above
    # DRAWN_INSIDE_THE_COMMAND_PALETTE. ⚠️ While the two shared a constant,
    # S-143 stood in a file that could not draw with it and that the drawing
    # side may not import.
    # ⭐ S-216 JOINS S-135a RATHER THAN OPENING A CONSTANT OF ITS OWN, and
    # the subject is the same one: both are values UF-65 reads where it stands
    # to build ONE description of ONE surface, and neither crosses a contract.
    # S-135a is the band's height, S-216 is how many milestone glyph entrances
    # stay out of the fold FR-053 (MUST) puts the rest behind. ⚠️ A count in a
    # constant named SIZES is not new: NOT_STORED_HELP_SIZES holds S-202, the
    # number of help columns, beside a share of the window.
    'NOT_STORED_COMMAND_PALETTE_SIZES': (['S-135a', 'S-216'], READ_WHERE_IT_STANDS),
    'NOT_STORED_PALETTE_GROUP_RULE_SIZES': (['S-143'],
                                            DRAWN_INSIDE_THE_COMMAND_PALETTE),
    'NOT_STORED_PROPERTIES_PANEL_SIZES': (['S-171'], READ_WHERE_IT_STANDS),
    # ⛔ THE FLOOR UNDER THE SCROLLBAR AND NOT ITS THICKNESS. FR-051 forbids
    # the thickness to be a setting -- it is measured off the environment at
    # BO-1 -- and S-205 is the least this tool will draw whatever that
    # measurement says, because a host with overlay scrollbars answers 0 and
    # half of 0 is 0 (D-115).
    'NOT_STORED_SCROLLBAR_SIZES': (['S-205'], READ_WHERE_IT_STANDS),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE. S-171 is the panel's own width and
    # stands where the frame is laid out; S-199 is the room ONE control needs
    # beyond its value, and FR-006 (MUST) makes the side that ESTIMATES carry
    # it across -- which is `properties-panel.ts`. One shared constant would
    # hand each unit the other's value.
    'NOT_STORED_PROPERTY_CONTROL_SIZES': (['S-199'], READ_WHERE_IT_STANDS),
    'NOT_STORED_ROW_CONTROL_SIZES': (['S-140'], DRAWN_WITH_WHERE_IT_STANDS),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE, though both land in row-title-panel.ts
    # and both are terms of the same subtraction: one constant per consuming
    # SUBJECT, and the subject differs. S-140 is the room the row CONTROLS keep
    # (HF-6 of table T-051 lays them over the name, so it is 0); S-138 and S-218
    # are the room the GRAB STRIP keeps, and HF-15 states outright that the
    # strip is 「押す入口ではなく、掴める場所を指す印」 -- not a control at all.
    # ⛔ S-218 IS NOT S-141, although both are 4px: S-141 is the gap between a
    # shape and its entrance FRAME (FR-029), and table T-206's own row for S-218
    # refuses that reading in as many words.
    'NOT_STORED_ROW_GRAB_ROOM_SIZES': (['S-138', 'S-218'],
                                       SUBTRACTED_WHERE_IT_STANDS),
    'NOT_STORED_ICON_SIZES': (['S-138', 'S-141'], DRAWN_WITH_WHERE_IT_STANDS),
    # ⭐ THE SAME GAP, ON THE SIDE THAT DRAWS IT. S-218 stands twice because two
    # units read it and neither may import the other (Chapter 5.3): the Adapter
    # SUBTRACTS it before cutting the name and this unit LAYS it between the
    # strip and the name. ⛔ Two hand-typed 4s would be the copied value rule 03
    # section 1 forbids; two readings of one generated row are not -- what the
    # rule forbids is a value with two homes, and its home is table T-206.
    # ⛔ NOT FOLDED INTO NOT_STORED_ICON_SIZES: that constant is an ENTRANCE's
    # shape (S-138's box and S-141's inner gap), and GR-20 is no entrance.
    'NOT_STORED_ROW_GRAB_STRIP_SIZES': (['S-218'], DRAWN_WITH_WHERE_IT_STANDS),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE, though both land in
    # dom-screen-surface.ts: one constant per consuming SUBJECT. S-138 and
    # S-141 are the box an ENTRANCE is drawn in; S-213 is the band a ROW is
    # marked with -- HF-15's live axis and HF-18's holding mark -- and the
    # settings row itself states that those two bands are one number.
    'NOT_STORED_ROW_BAND_SIZES': (['S-213'], DRAWN_WITH_WHERE_IT_STANDS),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE EITHER, though it lands in the same
    # file: S-213 is a BAND drawn on a row's edge and these two are how faint a
    # GROUND laid under something is, which is the subject S-214's own row
    # names (「状態を地で薄く示すときの濃さ」).
    # ⭐ AND THE TWO ARE ONE SUBJECT, which is why they share a constant where
    # S-213 could not join them. S-215's own note says it exists to be READ
    # AGAINST S-214 -- 「`S-214` より濃い値を別に持つ … 同じ濃さでは見分けられ
    # ない」 -- so the pair is a single scale of state grounds with two steps on
    # it, and three requirements read it: FR-029 (the entrance under the
    # pointer) and FR-098 (the pinned row) take S-214, and HF-15 of table T-051
    # (the row a hand is holding) takes S-215.
    'NOT_STORED_STATE_GROUND_PERCENTS': (['S-214', 'S-215'],
                                         DRAWN_WITH_WHERE_IT_STANDS),
    # ⭐ FR-036's help, whose share of the screen and whose column count are
    # both the drawing side's to apply: the share is of the window, which is
    # the environment's own measure, and the columns are a layout. ⛔ Not
    # folded into the line above -- one constant per consuming SUBJECT.
    'NOT_STORED_HELP_SIZES': (['S-201', 'S-202', 'S-203', 'S-204'],
                              DRAWN_WITH_WHERE_IT_STANDS),
    'NOT_STORED_SELECTION_SIZES': (['S-174', 'S-175', 'S-178'], DRAWN_WITH_WHERE_IT_STANDS),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE, though both land in svg-renderer.ts:
    # one constant per consuming SUBJECT, which is the split the notes around
    # this table state. S-174 .. S-178 are the SELECTION's sign and S-194 is
    # the Dual Cursor's own line width -- DC-8 of table T-029a borrows SL-8's
    # rule for the mark and table T-023c's own note keeps the Dual Cursor out
    # of SL-1, so the two are not one subject. ⚠️ S-178 is read by both and
    # stands in one place: it is the multiplier SL-8 states, and DC-8 reaches
    # it by naming that row rather than restating the number.
    'NOT_STORED_DUAL_CURSOR_SIZES': (['S-194'], DRAWN_INTO_THE_EXPORTED_PICTURE),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE, though both are a cursor's and both
    # land in svg-renderer.ts. FR-048 (MUST) states in as many words that the
    # two 「縦 2 本」 are different things -- CU-2 measures and the document
    # keeps its two dates, CU-3 follows the hand and keeps none -- and EP-6 of
    # table T-076 puts one in an exported picture and the other out of it. One
    # shared constant would say the two arrive on the same ground, and the
    # paragraph above each is what says the ground.
    'NOT_STORED_GUIDE_CURSOR_SIZES': (['S-209'], DRAWN_UNDER_THE_HAND_ALONE),
    # ⭐ The eight lengths FR-006's fields are drawn at, and the two
    # coefficients its typography is drawn at. ⚠️ THE LAST TWO ARE NOT
    # LENGTHS: S-197 is the panel's text size as a fraction of the host's own
    # base, and S-198 is the item name's as a fraction of THAT -- FR-006 (MUST)
    # states both multiplicands, and neither multiplies fontScaleSizes.
    # ⛔ NOT folded into
    # NOT_STORED_ICON_SIZES though both land in dom-screen-surface.ts: one
    # constant per consuming SUBJECT, which is the split the note under
    # NOT_STORED_DUMMY_SIZES states. S-138 and S-141 are an entrance's shape
    # and S-186 .. S-193 are the property fields', and a shared constant would
    # make one of the two paragraphs a lie.
    'NOT_STORED_PROPERTY_FIELD_SIZES': (
        ['S-186', 'S-187', 'S-188', 'S-189', 'S-190', 'S-191', 'S-192', 'S-193',
         'S-197', 'S-198'],
        DRAWN_WITH_WHERE_IT_STANDS),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE, though both land in svg-renderer.ts:
    # one constant per consuming SUBJECT, not per file. S-174 to S-178 are the
    # selection frame's and S-180 is the dummy's, and the two paragraphs state
    # different grounds -- a shared constant would make one of them a lie.
    # ⭐ The one gap the name label of a line-only shape is lifted by. ⛔ NOT
    # folded into any constant above: one per consuming SUBJECT, and this one
    # is read by the unit that PLACES the label rather than by one that paints
    # a mark over it. Its ground is the sixth, for the reason written there.
    'NOT_STORED_LABEL_SIZES': (['S-196'], DRAWN_INTO_THE_EXPORTED_PICTURE_FROM_THE_SHAPE),
    'NOT_STORED_DUMMY_SIZES': (['S-180'], DRAWN_FOR_THE_SCREEN_ALONE),
    'NOT_STORED_REPEAT_TIMES': (['S-172', 'S-173'], TIMED_WHERE_IT_STANDS),
    # ⛔ A COUNT OF ENTRIES AND NOT A LENGTH OF TIME. FR-102 (MUST) drops the
    # record from the oldest end once S-207 is reached and writes at its head
    # how many were dropped, so what the row bounds is how many happenings the
    # record may hold. ⚠️ Not folded into NOT_STORED_REPEAT_TIMES though both
    # land in frame-loop.ts: one constant per consuming SUBJECT, and those two
    # are how long a held entrance waits.
    'NOT_STORED_INTERACTION_RECORD_LIMITS': (['S-207'], KEPT_WHERE_IT_STANDS),
    'NOT_STORED_ZOOM_STEP': (['S-96'], ARRIVES_AS_ARGUMENT_ZOOM),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE, though both land in the translator:
    # one constant per consuming SUBJECT, and the two do not even arrive the
    # same way -- S-96 is handed in and S-208 is read where it stands, which
    # is what the paragraph above each says.
    # ⭐ S-212 JOINS S-208 BECAUSE THEY ARE ONE SUBJECT: both are HF-15's grab,
    # both are read by the member that answers where the held row is DRAWN, and
    # neither is a length the document keeps. S-208 says when the axis is
    # settled and S-212 says how far the row still follows the axis that was
    # refused -- 「拒まれた向きへの追従は途中で止めること（MUST）—— 止める割合は
    # ... `S-212`」.
    # ⛔ S-211 IS NOT WITH THEM AND CANNOT BE. That row states a STATE (段 0 が
    # 畳まれているか) whose value cell is 「畳まれていない」, not a machine value,
    # so it has no literal to emit; its own note puts it beside S-99g, and the
    # shell holds it the way it holds that one.
    'NOT_STORED_ROW_GRAB_SIZES': (['S-208', 'S-212'], SETTLED_WHERE_IT_STANDS),
    'NOT_STORED_ZOOM_BOUNDS': (['S-97', 'S-98'], ARRIVES_AS_ARGUMENT_ZOOM),
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


def pointed_row(cell, everywhere):
    """The row a table T-206 cell NAMES, when it states no value of its own.

    ⭐ S-96 says `S-53` rather than 1.1: the zoom trio is stated once, among
    the drawing settings, and table T-206 records only that the document does
    not keep it. Following the pointer keeps the number in that one place.

    ⚠️ Nothing is guessed. A cell that is not exactly one row ID in backticks
    is left alone, and a row ID that resolves to nothing is an error at the
    call site rather than a silent zero.
    """
    if not isinstance(cell, str):
        return None, None
    named = cell.strip().strip('`')
    if not re.match(r'^S-\d+[a-z]?$', named):
        return None, None
    row = everywhere.get(named)
    if row is None:
        raise SystemExit('table T-206 names row %s, which settings.json has not'
                         % named)
    return named, row.get('default')


NEWLINE = chr(10)

# ---- table T-236: the screen's colours ------------------------------------
#
# ⛔ ONE ROW, TWO CELLS. A colour is one decision with two renderings, so the
# light and the dark cell are carried out of the SAME row. Two tables, or two
# constants, could drift apart without anything noticing.
#
# ⭐ THE HUE IS A LETTER, NOT A NUMBER, wherever the row follows the theme.
# S-73 holds themeHue once, and writing 214 into twenty rows is the copied
# value rule 03 forbids -- so the manuscript writes `H` and the consumer
# substitutes. A row whose 色相追随 column is not ○ states its own number and
# is left exactly as written (FR-041: the dependency and progress lines do NOT
# follow the theme).
COLOUR_TARGETS = {
    # The chrome: the ground, the ink, the panels, the shadow. Only this unit
    # can paint them, and only this unit can set `color-scheme` (FR-041).
    # ⛔ S-168 AND S-169 (the ink and halo of a label ON A BAR) were here and
    # are not the chrome's: this unit draws no bar, so they went to a unit that
    # could never use them. Measured by the agent that owns the drawing side.
    # ⭐ S-183 STANDS WHERE TABLE T-236 PRINTS IT -- right after S-152, whose
    # pair it takes. The row's own note says the green is the one the table
    # already holds for 「いま効いている」, and FR-029's table T-237 has this unit
    # FILL the armed entrance with it (EN-1), so it is the chrome's after all.
    # ⭐ S-151 CAME BACK ON 2026-08-30 AND IS THE CHROME'S TOO, by the same
    # reading: EN-3 of table T-237 fills a PINNED row's `Row Pin` with it and
    # HF-6 of table T-051 (MUST) points at that row. The pin is a row control
    # this unit draws, not a bar, so the row now has a reader on this side as
    # well as on the drawing side (where SL-8's selection frame keeps it).
    # ⛔ Not a second copy -- ONE row of table T-236 read by two units, which is
    # what S-146 / S-147 / S-149 already do below.
    'SCREEN_COLOURS': ['S-146', 'S-147', 'S-148', 'S-149', 'S-150', 'S-151',
                       'S-152', 'S-183', 'S-153', 'S-154', 'S-170'],
    # The schedule itself: bars, the two lines, markers, bands -- and the time
    # ruler, which is drawn on this side too (`_source/components.json` gives
    # SvgRenderer the edge labelled "ruler and rows" and gives ScreenRenderer no
    # edge to ScheduleLayout at all).
    # ⭐ S-146, S-147 AND S-149 STAND IN BOTH ROSTERS ON PURPOSE. They are the
    # ground, the ink and the rule, and both units draw with them: the chrome
    # paints its own panels and the ruler prints its tiers on a ground of its
    # own. ⛔ Without S-146 on this side the ruler has lines and text and
    # nothing under them, so whatever lies behind the band shows through --
    # and the row's own note in table T-236 says an unpainted ground falls back
    # to the OS default. ⚠️ S-162 and S-169 already carry this colour into this
    # constant, but only as their own cells' `sameAs`; nothing here could name
    # the ground itself. ⛔ Two rows would be the drift the note above forbids;
    # ONE row read by two units is not.
    # ⭐ S-148 JOINS THEM, for the same reason and by the same note: the guide
    # cursor (CU-3 of table T-029) is drawn on this side, table T-236 holds no
    # row of its own for it, and the muted neutral is what the table keeps for
    # what is secondary. ⛔ NOT A NEW VALUE -- the row already stands, and the
    # colour it lends is deliberately neither S-163's nor S-195's, which is what
    # FR-048's closing MUST asks of a line that carries no date. @provisional
    # PD-341
    'SCHEDULE_COLOURS': ['S-146', 'S-147', 'S-148', 'S-149', 'S-151', 'S-155', 'S-156',
                         'S-157', 'S-158', 'S-159', 'S-160', 'S-161', 'S-162',
                         'S-163', 'S-164', 'S-165', 'S-166', 'S-167', 'S-168',
                         'S-169', 'S-195'],
}

COLOUR_NOTE = [
    ' * The colours of table T-236, by row ID, in both renderings.',
    ' *',
    ' * ⭐ Table T-236 holds constants baked into the artifact. FR-041 (MUST',
    ' * NOT) forbids saving a derived colour, so none of these is a document',
    ' * setting and none may become one.',
    ' *',
    " * ⛔ `H` IN A HUE IS NOT A TYPO. Where `followsHue` is true the row",
    ' * follows themeHue (S-73), and the manuscript writes the letter so that',
    " * S-73's value is stated once rather than copied into every row. Solve it",
    ' * by putting the hue in before use. A row with `followsHue` false states',
    ' * its own hue and is used exactly as written -- the dependency and',
    ' * progress lines are the two of those (FR-041).',
]


def colour_block(name):
    """The rows of table T-236 one unit needs, by row ID."""
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    block = [b for b in doc['blocks'] if b.get('id') == 'T-236']
    if not block:
        raise SystemExit('settings.json holds no table T-236')
    by_id = {r['id']: r for r in block[0]['rows']}
    out = ['/**'] + COLOUR_NOTE + [' */',
           'export const %s: {' % name,
           '  readonly [rowId: string]: {',
           '    readonly light: string',
           '    readonly dark: string',
           '    readonly followsHue: boolean',
           '  }',
           '} = {']
    for row_id in COLOUR_TARGETS[name]:
        if row_id not in by_id:
            raise SystemExit('table T-236 has no row %s' % row_id)
        row = by_id[row_id]
        cells = {}
        for side in ('light', 'dark'):
            cell = row.get(side)
            # ⛔ A cell may NAME another row rather than restate its colour, so
            # that one value is stated once. Follow it before reading.
            seen = set()
            while isinstance(cell, dict) and 'sameAs' in cell:
                named = cell['sameAs']
                if named in seen:
                    raise SystemExit('table T-236 row %s follows a ring through %s'
                                     % (row_id, named))
                seen.add(named)
                if named not in by_id:
                    raise SystemExit('table T-236 row %s names %s, which the table '
                                     'has not' % (row_id, named))
                cell = by_id[named].get(side)
            if not isinstance(cell, dict) or 'colour' not in cell:
                raise SystemExit(
                    'table T-236 row %s states no colour for its %s cell, so '
                    '%s cannot be generated. A row that inherits another names '
                    'it in prose and cannot be carried by this constant.'
                    % (row_id, side, name))
            cells[side] = cell['colour']
        follows = 'H' in cells['light'] or 'H' in cells['dark']
        out.append("  /* %s */" % row_id)
        out.append("  '%s': { light: '%s', dark: '%s', followsHue: %s },"
                   % (row_id, cells['light'], cells['dark'],
                      'true' if follows else 'false'))
    out.append('}')
    return NEWLINE.join(out)


def not_stored_block(name):
    """The rows of table T-206 one unit needs, by row ID.

    ⭐ No seam moves: S-94 and S-95 still arrive as an argument, the way
    edit-history.ts says they do. What this adds is a correct thing for the
    caller to pass -- before it, the only place outside docs/spec holding these
    numbers was whatever a caller happened to type. ⚠️ Where a unit has no
    caller to be handed the value by, its own paragraph says so instead.
    """
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    block = [b for b in doc['blocks'] if b.get('id') == 'T-206']
    if not block:
        raise SystemExit('settings.json holds no table T-206')
    by_id = {r['id']: r for r in block[0]['rows']}
    everywhere = {}
    for other in doc['blocks']:
        for row in other.get('rows', []) if other.get('kind') == 'table' else []:
            everywhere.setdefault(row['id'], row)
    rows, seam = NOT_STORED_TARGETS[name]
    got = []
    for row_id in rows:
        if row_id not in by_id:
            raise SystemExit('table T-206 has no row %s' % row_id)
        raw = by_id[row_id].get('default')
        # ⛔ The KEY stays the table T-206 row ID even when the value stands
        # elsewhere: that row is where the specification says the document does
        # not keep it, which is what this constant is about. The row it points
        # at rides in the comment instead -- a key of "S-96 -> S-53" would put
        # an arrow in every call site.
        named, stated = pointed_row(raw, everywhere)
        if named is not None:
            raw = stated
        cell = not_stored_cell(raw)
        if cell is None:
            raise SystemExit(
                'table T-206 row %s holds no machine value, so %s cannot be '
                'generated. Give the row a num / pair / lit cell, name a row '
                'that has one, or take the row out of NOT_STORED_TARGETS.'
                % (row_id, name))
        # ⛔ The unit rides along. Without it S-95 generates a bare 64 and the
        # reader cannot tell megabytes from bytes -- the exact defect CR-173
        # closed for S-113, which was a boundary that moved in silence.
        unit = (raw.get('suffix') or '').strip()
        note = row_id
        if unit:
            note += ', in %s' % unit
        if named is not None:
            note += ', stated at %s' % named
        got.append((note, cell[0], cell[1], row_id))
    out = ['/**',
           ' * The values table T-206 states that this unit needs, by row ID.',
           ' *',
           ' * ⭐ Table T-206 holds what the document does NOT store, so these',
           ' * are not document settings and are not in SETTINGS_DEFAULTS. They',
           ' * are reached by row ID because most rows of that table have no key',
           ' * column -- the row ID is the specification\'s own name for them.',
           ' *'] + list(seam) + [
           ' */',
           'export const %s: {' % name]
    for note, _literal, ts, row_id in got:
        out.append('  /** %s */' % note)
        out.append("  readonly '%s': %s" % (row_id, ts))
    out.append('} = {')
    for _note, literal, _ts, row_id in got:
        out.append("  '%s': %s," % (row_id, literal))
    out.append('}')
    return '\n'.join(out)


# ---- a value table T-206 states in two rows and nothing may add up by hand --
#
# ⛔ NOT `not_stored_block`'s SHAPE, AND THE DIFFERENCE IS THE POINT. That one
# carries ROWS, keyed by the row ID, because the row ID is the specification's
# own name for the value. This one carries a SUM, and the sum has a name of its
# own in the specification's prose while no single row holds it -- so a key of
# "S-138" would be a lie about which row answers for the number, and a hand-
# typed 24 in any unit would be the copied value rule 03 section 1 forbids.
#
# ⭐ ONE MEMBER PER CONSTANT AND A NAME RATHER THAN A ROW ID, for that reason.
# ⚠️ The terms carry a MULTIPLIER because a gap stated once is taken twice: an
# entrance has S-141 above the shape and S-141 below it, and 「S-141 x 2」 is
# how FR-029 composes the entrance rather than a second row saying 8.
DERIVED_TARGETS = {
    # ⭐⭐ LF-3 OF TABLE T-221 (MUST) AND HF-19 OF TABLE T-051 (MUST NOT): a
    # row's band is never shorter than the lattice HF-1 (MUST) draws on it --
    # 「並びは 2 x 2 の格子とすること」 -- and HF-19 forbids meeting that by
    # shrinking the lattice instead. ⇒ The floor is two of these, stacked, and
    # the layer that decides a band is the layer that has to hold it.
    # ⛔ IT REACHED THE LAYOUT ONLY AS AN ARGUMENT UNTIL 2026-09-03, measured
    # off a drawn lattice by the side that drew it, so a caller that passed
    # nothing dropped a MUST NOT in silence. The ruling of that day (CR-342)
    # gives the layout engine the floor of its own and keeps the measurement as
    # what may raise it.
    # ⚠️ THE SUM IS THE SPECIFICATION'S OWN, not an arithmetic invented here:
    # the note on S-138 states the answer in as many words -- 「`S-141` を 6 から
    # 4 へ同時に下げるので、入口の外形は 26 x 24px のまま動かない」 -- and 16 + 4
    # x 2 is the 24 of that sentence.
    'NOT_STORED_ROW_CONTROL_OUTER_SIZES': (
        'rowControlOuterHeightPx',
        [('S-138', 1), ('S-141', 2)],
        [' * ⚠️ This unit holds the sum rather than being handed it because the',
         ' * rule is its own to keep: LF-3 of table T-221 (MUST) makes the',
         " * lattice's height a floor under the band this unit decides, and",
         ' * HF-19 of table T-051 (MUST NOT) lets no band fall below it. A rule',
         ' * that only holds when a caller remembers to pass something is not a',
         ' * rule. ⭐ A measured lattice is still taken where one arrives -- it',
         ' * is what shows the drawn lattice leaving the two rows below -- and',
         ' * it can only ever RAISE the band, never lower it past this floor.',
         ' * ⛔ Neither term is a document setting and neither may become one:',
         ' * table T-206 is where the specification records that the document',
         ' * does not keep them, and the note on S-138 keeps the size off the',
         " * reader's own text size (FR-039) as well."],
    ),
}


def derived_block(name):
    """One value that table T-206 states across more than one row.

    ⛔ The sum is worked out HERE and nowhere else. Every unit that needs it
    reads this constant, so the day either term moves the answer moves with it
    -- which a value typed into a unit cannot do (rule 03 section 1).
    """
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    block = [b for b in doc['blocks'] if b.get('id') == 'T-206']
    if not block:
        raise SystemExit('settings.json holds no table T-206')
    by_id = {r['id']: r for r in block[0]['rows']}
    member, terms, seam = DERIVED_TARGETS[name]
    total = 0.0
    spelled = []
    unit = None
    for row_id, times in terms:
        if row_id not in by_id:
            raise SystemExit('table T-206 has no row %s' % row_id)
        raw = by_id[row_id].get('default') or {}
        stated = raw.get('num')
        if stated is None:
            raise SystemExit(
                'table T-206 row %s holds no number in its default cell, so '
                '%s cannot be generated.' % (row_id, name))
        # ⛔ The units have to agree or the sum means nothing -- the very
        # failure CR-173 closed for S-113, where a boundary moved in silence
        # because nothing said what it was measured in.
        suffix = (raw.get('suffix') or '').strip()
        if unit is None:
            unit = suffix
        elif suffix != unit:
            raise SystemExit(
                'table T-206 states %s in %s and another term of %s in %s, and '
                'two units cannot be added.' % (row_id, suffix or '(none)',
                                                name, unit or '(none)'))
        total += float(stated) * times
        spelled.append(row_id if times == 1 else '%s x %d' % (row_id, times))
    literal = '%d' % int(total) if float(total).is_integer() else repr(total)
    note = ' + '.join(spelled)
    if unit:
        note += ', in %s' % unit
    out = ['/**',
           ' * A value table T-206 states across more than one row, summed once',
           ' * here so that no unit adds it up for itself.',
           ' *',
           ' * ⭐ The member is NAMED rather than keyed by a row ID, which every',
           ' * other generated block of table T-206 is: no single row holds this',
           " * number, so no row ID would be an honest name for it.",
           ' *'] + list(seam) + [
           ' */',
           'export const %s: {' % name,
           '  /** %s */' % note,
           '  readonly %s: number' % member,
           '} = {',
           '  %s: %s,' % (member, literal),
           '}']
    return '\n'.join(out)


# ---- table T-207: what the watermark bakes into the artifact ---------------
#
# ⛔ NOT `not_stored_block`'s TABLE, AND NOT ITS SHAPE. That one reads table
# T-206, whose rows carry a `default` cell; table T-207 carries a `value` cell
# and says of itself 「成果物に埋め込む定数。文書には保存しない」. ⭐ So the two
# are generated apart rather than one being widened to admit the other's cell
# name -- a row of T-206 with no default and a row of T-207 with no value are
# different faults, and one function could no longer say which it had met.
#
# ⛔ ONE ROW OF THE TABLE IS CARRIED, AND THE OTHERS DELIBERATELY ARE NOT.
# S-100 is the default watermark unlock PASSWORD in the clear, and FR-020
# (MUST NOT) forbids the raw password to be kept in code, in the model or in
# what goes out -- that row's own note says 「成果物へ入るのは下の SHA-256 だけ
# である」. S-102 (`watermarkOpacity`) is a number the drawing side would want
# and nothing in `src/` draws the watermark yet, so generating it would be a
# constant with no reader.
WATERMARK_TARGETS = {
    'WATERMARK_UNLOCK_DIGEST': (['S-101'], [
        ' * ⛔ THE RAW PASSWORD IS NOT HERE AND MAY NOT BE. FR-020 (MUST NOT)',
        ' * forbids it in code, in the model and in what goes out, and S-100 --',
        ' * the row that states it -- says the artifact takes only the digest.',
        ' * ⚠️ Which is also why this constant cannot be checked by hashing the',
        ' * password here: there would have to be a password here to hash.',
        ' *',
        ' * ⭐ WHAT IT IS COMPARED AGAINST IS NOT ALWAYS THIS. S-99c of table',
        ' * T-206 holds a digest the author set, in `localStorage`; this one is',
        ' * what FR-020 falls back to while no such row is kept.',
    ]),
}


def watermark_block(name):
    """The rows of table T-207 one unit needs, by row ID."""
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    block = [b for b in doc['blocks'] if b.get('id') == 'T-207']
    if not block:
        raise SystemExit('settings.json holds no table T-207')
    by_id = {r['id']: r for r in block[0]['rows']}
    rows, seam = WATERMARK_TARGETS[name]
    got = []
    for row_id in rows:
        if row_id not in by_id:
            raise SystemExit('table T-207 has no row %s' % row_id)
        raw = by_id[row_id].get('value')
        # ⛔ The published table prints the value in backticks, which are the
        # manuscript's markup and not part of the value. A cell that is not a
        # plain string is an error at the call site rather than a silent one.
        if not isinstance(raw, str):
            raise SystemExit(
                'table T-207 row %s holds no plain value, so %s cannot be '
                'generated.' % (row_id, name))
        got.append((row_id, raw.strip().strip('`')))
    out = ['/**',
           ' * The values table T-207 states that this unit needs, by row ID.',
           ' *',
           ' * ⭐ Table T-207 holds what is BAKED INTO THE ARTIFACT and not kept',
           ' * in the document, so these are not document settings and are not',
           ' * in SETTINGS_DEFAULTS. They are reached by row ID because the',
           ' * table has no key column -- the row ID is the specification\'s own',
           ' * name for them.',
           ' *'] + list(seam) + [
           ' */',
           'export const %s: {' % name]
    for row_id, _value in got:
        out.append('  /** %s */' % row_id)
        out.append("  readonly '%s': string" % row_id)
    out.append('} = {')
    for row_id, value in got:
        out.append("  '%s': '%s'," % (row_id, value))
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
    '/** One piece of a bound stated as an expression, in postfix order. */',
    'export type SettingsBoundToken =',
    '  | { readonly key: string }',
    '  | { readonly num: number }',
    "  | { readonly op: '+' | '-' | '*' | '/' }",
    '',
    '/** What the lower- and upper-bound columns of one settings row state. */',
    'export interface SettingsBound {',
    '  /** A floor the value may sit on. */',
    '  readonly min?: number',
    '  /** A ceiling the value may sit on. */',
    '  readonly max?: number',
    '  /** A floor the value must stay ABOVE. Never equal to it. */',
    '  readonly exclusiveMin?: number',
    '  /** A ceiling the value must stay BELOW. Never equal to it. */',
    '  readonly exclusiveMax?: number',
    '  /** A floor stated over other keys, which IV-16 judges. */',
    '  readonly minExpression?: readonly SettingsBoundToken[]',
    '  /** A ceiling stated over other keys, which IV-16 judges. */',
    '  readonly maxExpression?: readonly SettingsBoundToken[]',
    '}',
    '',
    '/**',
    ' * The bounds the settings manuscript states for each key.',
    ' *',
    ' * ⚠️ An open bound is kept APART from a closed one rather than written',
    ' * into the same field. A reader that clamps has no value to clamp an open',
    ' * bound to -- the nearest allowed number does not exist -- so folding the',
    ' * two together would quietly turn a bound the manuscript marks open into',
    ' * one a value is allowed to sit on.',
    ' *',
    ' * ⭐ A bound that names ANOTHER key is here as its expression, in postfix',
    ' * order. It holds BETWEEN keys, so no per-key clamp can decide it; IV-16',
    ' * of table T-220 is what judges it, and it needs the whole document.',
    ' */',
    'export const SETTINGS_BOUNDS: Readonly<Record<string, SettingsBound>> = {',
]


DERIVED_NOTE = [
    '/**',
    ' * The defaults settings.json states as a rule over OTHER keys, printed as',
    ' * the rule rather than as its answer.',
    ' *',
    ' * ⭐ SETTINGS_DEFAULTS holds what such a key works out to while the keys it',
    ' * reads are still at THEIR defaults. That answer goes stale the moment one',
    ' * of them is edited, and S-2 follows S-3 by FR-039, so the band height has',
    ' * to be worked out again every time the ruler type changes.',
    ' *',
    ' * ⛔ Before CR-200 there was nowhere to read the rule from, so',
    ' * edit-document-settings.ts wrote S-2\'s arithmetic out a second time --',
    ' * with the padding as a bare 6, which no longer even names a value.',
    ' *',
    ' * ⚠️ Only the `from` family is here. S-3\'s `index` rule is not: the one',
    ' * caller that needs it already reads fontScaleSizes directly, and a second',
    ' * path to the same answer is what this constant exists to prevent.',
    ' *',
    ' * ⭐ `as const` is deliberate: it makes every key name a literal type, so',
    ' * `settings[rule.from]` type checks and a key renamed in the manuscript',
    ' * fails the build instead of reading undefined at run time.',
    ' *',
    ' * The value is `from x times + plus + plusFrom x plusTimes`, and a rule',
    ' * that names no second key states plusFrom as null.',
    ' */',
    'export const SETTINGS_DERIVED = {',
]


def derived_rules(manuscript):
    """Print each `from`-shaped default as the rule the manuscript states.

    ⭐ Every field is written out, defaults included, so a reader of the
    generated file never has to know which ones may be left off.
    """
    out = []
    for key in sorted(manuscript):
        cell = manuscript[key]['default']
        if not isinstance(cell, dict) or 'from' not in cell:
            continue
        named = cell.get('plusFrom')
        out.append(
            "  '%s': { from: '%s', times: %s, plus: %s, plusFrom: %s, "
            "plusTimes: %s },"
            % (key, cell['from'], cell.get('times', 1), cell.get('plus', 0),
               ("'%s'" % named) if named else 'null', cell.get('plusTimes', 1)))
    return out


def settings_block(_erd):
    schema = json.load(io.open(SCHEMA, encoding='utf-8'),
                       object_pairs_hook=collections.OrderedDict)
    node = schema['properties']['documentSettings']

    head = '/** The presentation group. DR-3 of table T-052; FR-063 says what is in it. */'
    body = [head + '\nexport interface DocumentSettings '
            + '\n'.join(settings_object(node, 0))]

    manuscript = settings_manuscript()

    stored = set(flat_keys(node, ''))
    schema_bounds = dict((path, (low, high))
                         for path, low, high in bounds_of(node, '', []))
    rows, unreachable = [], []
    for path in flat_keys(node, ''):
        low, high = schema_bounds.get(path, (None, None))
        # ⭐ Two independent readers of the same manuscript have to agree: the
        # closed bounds come from grs-document.schema.json, which
        # erd_json_to_schema.py built by parsing the printed document, while
        # the manuscript is read here directly. A disagreement means one of the
        # two is misreading a cell, which is exactly the failure the whole
        # change request is about.
        checked = manuscript.get(path.split('.')[-1] if path not in manuscript else path)
        if checked is not None:
            for edge, want in (('min', low), ('max', high)):
                got = number_of(checked[edge])
                if want is not None and got is not None and float(want) != got:
                    raise SystemExit(
                        'generate_entity_types: %s (%s) states %s %s in '
                        'settings.json but %s in the generated schema'
                        % (path, checked['row'], edge, got, want))
        parts = []
        # ⛔ Only an exact key is read for what follows. The lookup above falls
        # back to the last piece of a dotted path, which is enough to notice a
        # disagreement but would attach one row's OPEN bound or expression to
        # another row's key.
        said = manuscript.get(path)
        for edge, want, closed, opened in (('min', low, 'min', 'exclusiveMin'),
                                           ('max', high, 'max', 'exclusiveMax')):
            cell = said[edge] if said is not None else None
            open_bound = isinstance(cell, dict) and cell.get('exclusive') is True
            if open_bound and want is not None:
                raise SystemExit(
                    'generate_entity_types: %s (%s) marks its %s open in '
                    'settings.json but the generated schema states it closed'
                    % (path, said['row'], edge))
            if open_bound:
                parts.append('%s: %s' % (opened, cell['num']))
            elif want is not None:
                parts.append('%s: %s' % (closed, want))
        for edge, field in (('min', 'minExpression'), ('max', 'maxExpression')):
            cell = said[edge] if said is not None else None
            if not isinstance(cell, str):
                continue
            named = re.findall(r'`([^`]+)`', cell)
            if not named:
                # A field that names no key states no bound between keys. "—"
                # and the prose fields land here.
                continue
            outside = [one for one in named if one not in stored]
            if outside:
                # ⛔ Left out, and said so below rather than dropped in silence.
                # IV-16 is judged over a document at rest, and a key the
                # presentation group does not hold is not in one.
                unreachable.append((path, said['row'], edge, sorted(set(outside))))
                continue
            pieces = bound_pieces(cell)
            expression = bound_expression(pieces) if pieces is not None else None
            if expression is None:
                raise SystemExit(
                    'generate_entity_types: the %s field of %s (%s) names a '
                    'settings key but is not arithmetic this generator reads, '
                    'so IV-16 would stop judging that row without saying so'
                    % (edge, path, said['row']))
            parts.append('%s: %s' % (field, ts_bound_expression(expression)))
        if not parts:
            continue
        one_line = "  '%s': { %s }," % (path, ', '.join(parts))
        # An expression makes a long line; the fields go one to a line so the
        # roster stays readable rather than needing a sideways scroll.
        if len(one_line) <= 92:
            rows.append(one_line)
        else:
            rows.append("  '%s': {" % path)
            rows.extend('    %s,' % part for part in parts)
            rows.append('  },')
    if unreachable:
        rows.append('  // ⛔ A bound that names a key the presentation group does')
        rows.append('  // not hold, so IV-16 cannot judge it on a document alone:')
        for path, row_id, edge, outside in unreachable:
            rows.append('  //   %s (%s) %s names %s'
                        % (path, row_id, edge, ', '.join(outside)))

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
    body.append('\n'.join(DERIVED_NOTE + derived_rules(manuscript)
                          + ['} as const']))
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
    # ⭐ The name label's lift, in the unit that decides where the label goes.
    # The label column of table T-012 is what chooses whether the gap applies.
    (os.path.join(LAYOUT, 'schedule-geometry', 'schedule-geometry.ts'),
     lambda _erd: not_stored_block('NOT_STORED_LABEL_SIZES'),
     ['docs/spec/_source/settings.json (table T-206)']),
    # ⭐⭐ LF-3's SECOND FLOOR, IN THE UNIT THAT DECIDES THE BAND. Table T-221's
    # LF-3 (MUST) and table T-051's HF-19 (MUST NOT) hold a row's band at or
    # above HF-1's 2 x 2 lattice, and this is the unit that settles a band --
    # so the floor stands here rather than arriving from whoever remembered to
    # measure one. ⛔ NOT `NOT_STORED_ICON_SIZES` MOVED HERE: that constant is
    # the box `dom-screen-surface.ts` DRAWS an entrance in, and Chapter 5.3
    # keeps a Framework file out of the Entity layer's reach anyway -- what
    # crosses is the number, generated twice from the one manuscript, which is
    # the same bargain S-218 already stands on in two units.
    (os.path.join(LAYOUT, 'schedule-layout', 'schedule-layout.ts'),
     lambda _erd: derived_block('NOT_STORED_ROW_CONTROL_OUTER_SIZES'),
     ['docs/spec/_source/settings.json (table T-206)']),
    (os.path.join(ADAPTER, 'screen-renderer', 'screen-frame.ts'),
     lambda _erd: not_stored_block('NOT_STORED_PANEL_DIVIDER_SIZES'),
     ['docs/spec/_source/settings.json (table T-206)']),
    # ⛔ ONE CONSTANT PER CONSUMING UNIT, the same split the note above states:
    # S-134 is UF-61's band and stands in `screen-frame.ts`; S-135a is UF-65's
    # and stands here. One shared constant would hand each unit the other's
    # value.
    (os.path.join(ADAPTER, 'screen-renderer', 'command-palette.ts'),
     lambda _erd: not_stored_block('NOT_STORED_COMMAND_PALETTE_SIZES'),
     ['docs/spec/_source/settings.json (table T-206)']),
    # ⭐ HF-5's room, resolved on the side that can resolve it. S-140 is the
    # room the row controls keep, and what it is subtracted from is the row's
    # own name width, which only this side knows -- `DocumentSettings` does not
    # cross IF-9.
    # ⭐ And GR-20's room beside it, in a constant of its own: FR-085 (MUST)
    # subtracts 「行の掴み代（表 T-023d の `GR-20`）に確保した場所（… `S-138`）と
    # その隔たり（同表の `S-218`）」 from the same panel width, and until CR-336
    # neither row reached this side at all -- the strip took 20px of the name's
    # box that the arithmetic never took off, so the cut was judged on a width
    # the name never had and the browser's own ellipsis ate the difference.
    (os.path.join(ADAPTER, 'screen-renderer', 'row-title-panel.ts'),
     lambda _erd: not_stored_block('NOT_STORED_ROW_CONTROL_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_ROW_GRAB_ROOM_SIZES'),
     ['docs/spec/_source/settings.json (table T-206)']),
    # ⭐ The only generated region that lands in Framework, for the reason the
    # note on FRAMEWORK above gives: FR-029 (MUST) makes one box the authority
    # for every entrance, and one unit draws all of them.
    # ⭐ The zoom trio, split by consuming unit the way the note above requires:
    # `InputContext.zoomStep` is read by the translator, `SettingsLimits`
    # zoomMin / zoomMax by the edit path. ⛔ One shared constant would hand each
    # unit a value belonging to the other.
    # ⭐ And HF-15's threshold beside it, in a constant of its own: S-208 is the
    # distance a grab's axis is settled at, and this unit is the one that
    # settles it. ⛔ Not folded into the zoom step -- see NOT_STORED_TARGETS.
    (os.path.join(ADAPTER, 'input-command-translator', 'input-command-translator.ts'),
     lambda _erd: not_stored_block('NOT_STORED_ZOOM_STEP') + NEWLINE * 2
     + not_stored_block('NOT_STORED_ROW_GRAB_SIZES'),
     ['docs/spec/_source/settings.json (table T-206, which names table T-201)']),
    (os.path.join(USECASE, 'edit-document', 'edit-document.ts'),
     lambda _erd: not_stored_block('NOT_STORED_ZOOM_BOUNDS'),
     ['docs/spec/_source/settings.json (table T-206, which names table T-201)']),
    # ⭐ The colours, split by who paints what. The chrome and `color-scheme`
    # are the surface's alone (FR-041); the schedule's own colours belong to
    # whoever draws the picture.
    # ⛔ NOT FOLDED INTO EITHER LINE ABOVE, though both land here: one
    # constant per consuming SUBJECT. S-138 and S-141 are the box every
    # entrance keeps, and S-143 is the line between two GROUPS of them -- a
    # decoration nothing can point at, arm or be reported for.
    # ⚠️ S-185 STOOD HERE UNTIL CR-311 AND ITS ROW IS GONE. FR-053 drew the
    # armed entrance with a RIM until 2026-08-30; the ruling of that day made it
    # a FILL, whose two colours are rows of table T-236 and reach this unit
    # through `SCREEN_COLOURS`. A thickness has no reader left.
    # ⭐ S-214 AND S-215 COME BESIDE THE COLOURS AND NOT AMONG THEM. Table T-236
    # states WHICH colour a state's ground takes and table T-206 states HOW
    # FAINT it is laid, so the two halves arrive on the two roads their own
    # tables put them on -- ⛔ a percentage written into a colour row, or a
    # colour written into a settings row, would be one decision in two places.
    (os.path.join(FRAMEWORK, 'dom-screen-surface', 'dom-screen-surface.ts'),
     lambda _erd: not_stored_block('NOT_STORED_ICON_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_ROW_GRAB_STRIP_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_ROW_BAND_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_STATE_GROUND_PERCENTS') + NEWLINE * 2
     + not_stored_block('NOT_STORED_HELP_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_PALETTE_GROUP_RULE_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_PROPERTY_FIELD_SIZES') + NEWLINE * 2
     + colour_block('SCREEN_COLOURS'),
     ['docs/spec/_source/settings.json (tables T-206 and T-236)']),
    # ⭐ The selection frame's own two lengths land beside the colours, in the
    # one unit that draws the picture SL-8 puts the frame on.
    # ⭐ The dummy's drawn width joins them, in its own constant: FR-043's three
    # grab handles are drawn by this unit and by no other, and S-180 is the only
    # row that gives U-52 a drawn dimension (S-129 and S-130 are durations,
    # S-131 is the faintness, and S-93 is the reader's hit area, which table
    # T-206 routes to item-hit-area.ts alone).
    # ⭐ The Dual Cursor's own line width joins them, in a constant of its own
    # for the reason the entry in NOT_STORED_TARGETS gives: CU-2's two lines
    # are drawn by this unit and by no other, and S-194 is the only row that
    # gives them a width -- S-178 is the multiplier DC-8 borrows from SL-8 and
    # stands with the selection's rows, where SL-8 put it.
    # ⭐ And the guide cursor's own gap, in a fourth constant: CU-3's 縦 2 本 is
    # drawn by this unit and by no other, and S-209 is the only row that states
    # how far apart its two lines stand. ⛔ Not folded into the Dual Cursor's --
    # FR-048 (MUST) keeps the two pairs apart, and EP-6 of table T-076 draws
    # one into an exported picture and not the other.
    (os.path.join(ADAPTER, 'svg-renderer', 'svg-renderer.ts'),
     lambda _erd: not_stored_block('NOT_STORED_SELECTION_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_DUMMY_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_DUAL_CURSOR_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_GUIDE_CURSOR_SIZES') + NEWLINE * 2
     + colour_block('SCHEDULE_COLOURS'),
     ['docs/spec/_source/settings.json (tables T-206 and T-236)']),
    # ⭐ The width the properties panel opens to, which only the shell can put
    # into force: S-80 is what the DOCUMENT keeps and 0 is what "closed" means
    # there, so the open width has to be laid over the settings for the frame
    # that draws the panel and nowhere else. ⛔ It is not a document setting and
    # must not become one -- FR-052's drag is what writes S-80.
    # ⭐ The two lengths FR-018 measures a held entrance with land beside it,
    # in their own constant rather than in that one: they are times and it is a
    # width, and the seam differs -- S-171 is laid over the settings of the
    # frame being drawn, while S-172 and S-173 are counted off the clock FT-4
    # of table T-078 gives the shell. ⛔ One shared constant would say the two
    # arrive the same way, and the paragraph above each is what says how.
    (os.path.join(FRAMEWORK, 'single-html-shell', 'frame-loop.ts'),
     lambda _erd: not_stored_block('NOT_STORED_PROPERTIES_PANEL_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_REPEAT_TIMES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_SCROLLBAR_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_INTERACTION_RECORD_LIMITS') + NEWLINE * 2
     # ⭐ FR-020's digest, in the one unit that compares against it: the answer
     # is read off a field this layer drew and hashed with the browser's own
     # SHA-256, which LR-6 keeps out of every other layer. ⛔ Not folded into
     # the three above -- they are rows of table T-206 and this is a row of
     # table T-207, and the two tables say different things about their rows.
     + watermark_block('WATERMARK_UNLOCK_DIGEST'),
     ['docs/spec/_source/settings.json (tables T-206 and T-207)']),
    # ⭐ FR-006's room, resolved on the side that can resolve it. S-199 is a
    # MULTIPLE of the control's own font size rather than a px, so what it is
    # multiplied by is not known here -- what IS known here is `labelCoef`
    # (S-30), which FR-093's estimate needs and which does not cross IF-9.
    (os.path.join(ADAPTER, 'screen-renderer', 'properties-panel.ts'),
     lambda _erd: not_stored_block('NOT_STORED_PROPERTY_CONTROL_SIZES'),
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
