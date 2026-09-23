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
    elif kind in ('string', 'color'):
        # 'color' is stored text (table T-017b of 01-04); the parser is in the entity.
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


def entity_block(entity, row_id):
    """One entity, documented by pointing at its rows rather than copying them.

    Chapter 1.9 tells the specification not to write out the text it points at.
    The same reason applies here, and adds two of its own: a row ID cannot fall
    out of step with the row it names, and the tree stays ASCII.
    """
    lines = ['/** %s of table T-056. */' % row_id,
             'export interface %s {' % entity['name']]
    for column in entity['columns']:
        lines.append('  /** AT-%d */' % column['seat'])
        lines.append('  readonly %s: %s' % (column['name'],
                                            ts_type(column['json'], column['name'])))
    lines.append('}')
    return '\n'.join(lines)


DATE_COLUMNS_NOTE = [
    '// see T-058, IV-14',
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
# bounds into src/ at all. ⛔ Five entities and not all eighteen: FR-006's table
# T-016 is the `Task` roster (with `TaskVisual` for the drawn columns), FR-042
# adds a row's colour and height (`TaskGroup`), FR-009 adds the dependency
# line, and PR-21 of table T-016 (対象 `CommentBox`) adds the comment box. A
# roster of every entity would state a shape for columns no surface offers.
#
# ⛔ `HighlightBox` IS NOT HERE, AND IT WAS ASKED FOR. No row of table T-016
# carries 対象 `HighlightBox`, so FR-006 (MUST NOT -- 「対象の違う行を出しては
# ならない」) leaves this panel nothing to draw for one, and a shape for its
# seven columns would be the very roster the paragraph above refuses. ⚠️ AND IT
# WOULD NOT CLOSE DFC-314 EITHER: what is broken there is the DEFAULT of S-132
# (table T-217), and erd.json states no default, no minimum and no maximum for
# `HighlightBox.cornerRadiusPx` -- so nothing this constant can carry would
# reach it. That road is the settings one (NOT_STORED_TARGETS), not this one.
#
# ⚠️ READ FROM erd.json AND NOT FROM grs-document.schema.json, although the
# paragraph names the schema. That file is ITSELF generated from erd.json by
# erd_json_to_schema.py, so erd.json is the manuscript -- and naming a third
# source in schedule.ts's banner would push its "Rebuild:" line out of the
# window check 27 reads a banner in.
SHAPED_ENTITIES = ['Task', 'TaskVisual', 'TaskGroup', 'Dependency', 'CommentBox']

COLUMN_SHAPES_NOTE = [
    '// see T-058, T-016',
    'export const COLUMN_SHAPES: {',
]


def column_shape(node):
    """One column's accepted shape, read off the 型 column of table T-058.

    A 'color' column's choices are the palette names of table T-294 (CR-548);
    a custom colour is accepted beside them (CV-2 of table T-017b).
    """
    values = node.get('values')
    if node.get('kind') == 'color':
        values = [n for n in palette_spellings()
                  if node.get('transparent', True) or n != 'transparent']
    return (node.get('kind'), values, node.get('min'),
            node.get('max'), bool(node.get('null')))


def palette_spellings():
    """The stored spellings of table T-294, in row order."""
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    for block in doc['blocks']:
        if block.get('id') == 'T-294':
            return [row['key'].strip('`') for row in block['rows']]
    raise SystemExit('settings.json holds no table T-294')


def column_shapes_block(erd):
    """The accepted shape of every column of the edited entities."""
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
    '// see T-058',
    'export interface ColumnShape {',
    '  readonly kind: string',
    '  readonly choices: readonly string[] | null',
    '  readonly min: number | null',
    '  readonly max: number | null',
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
    '// see IV-1, IV-2',
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
        '// see T-057',
        'export interface ForeignKeyColumn {',
        '  readonly fromColumn: string',
        '  readonly child: string',
        '  readonly toColumn: string',
        '}',
        '',
        'export interface NestedRows {',
        '  readonly column: string',
        '  readonly entity: string',
        '}',
        '',
        '// see T-056, T-058',
        'export interface EntityRows {',
        '  readonly entity: string',
        '  readonly scheduleKey: string | null',
        '  readonly many: boolean',
        '  readonly primaryKey: readonly string[]',
        '  readonly foreignKeys: readonly ForeignKeyColumn[]',
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
    '// see T-058',
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
    """The ET- row of every entity, as the manuscript seated it.

    ⛔ Not counted from the position any more. A seat is given once and never
    moves, so a column added above an entity no longer renames every row below
    it -- the hazard the appendix records twice (0.19 and 0.46).
    """
    return {entity['name']: ('ET-%d' % entity['seat'], )
            for entity in erd['entities']}


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
    out.append('// see DR-2\n'
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

def unit_phrase(unit):
    """'in px' for a unit, '' for none.

    Only table T-209's members still carry a unit in their comment. A unit that
    is not ASCII stops the run instead of reaching a comment in src/, which is
    ASCII only (docs/review/comment-rules-src.md, section 1): the sign the
    manuscript writes for a multiplier is what reached src/ before.
    """
    if not unit:
        return ''
    if any(ord(ch) > 0x7E for ch in unit):
        raise SystemExit(
            'generate_entity_types: settings.json writes the unit %s, which is '
            'not ASCII, so it cannot go into a comment in src/' % ascii(unit))
    return 'in %s' % unit

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

    ⭐ `times` IS READ ON THE `index` BRANCH TOO (CR-418 decision 1). S-3's
    cell became `index: [fontScaleSizes, fontScale], times: 1.5` -- the ruler
    font is the font-size step times 1.5 -- and CR-417 section 6.3 names this
    function: before it read `times`, the branch ignored the key and the
    generated default stayed at the bare step (14), which the manuscript no
    longer states. ⛔ A cell with no `times` multiplies by 1, so an `index`
    cell written before CR-418 prints the value it always did.
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
                if isinstance(value, (int, float)):
                    value = value * cell.get('times', 1)
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
                        unit_phrase(unit) or 'the number the row states'))
        else:
            raise SystemExit(
                'table T-209 row %s holds no machine value this generator '
                'reads' % row_id)

    out = ['// see T-209, FR-054',
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
# same way S-90 to S-92 are, but its consumer is screen-frame.ts in the Adapter
# layer while NOT_STORED_SIZES is generated into item-hit-area.ts in the Entity
# layer. Adding the row to that constant would hand one unit a value belonging
# to another, which is the duplication rule 03 section 1 forbids -- and the
# Adapter would have to import an Entity unit to read a number the layer rules
# (table T-061) never meant it to cross for.
#
# Each entry is (the rows, the comment lines emitted after `// see T-206`).
# Ruling 17 (docs/review/comment-rules-src.md) keeps the reasons below out of
# src/: a seam emits a TRAP where one is needed and nothing otherwise, and the
# paragraphs that explain each seam stay here, in the generator.
ARRIVES_AS_ARGUMENT = []
# ⛔ A THIRD SEAM: no door AND no caller. S-138 and S-140 are read by the unit
# that draws with them, and neither crosses a contract -- S-140 is the room the
# row control keeps, which only the side that lays the panel out can subtract,
# and S-138 is a constant of the drawing itself rather than of any one item.
DRAWN_WITH_WHERE_IT_STANDS = []
# ⛔ A SEAM OF ITS OWN, AND THE ONE GROUND ABOVE DOES NOT FIT. S-138 and S-218
# are the room GR-20's grab strip keeps beside the row's name, and FR-085 (MUST)
# subtracts both of them before cutting that name -- so what they settle is
# WHERE THE NAME IS CUT, and EP-3 of table T-076 draws the panel into the
# exported picture. ⇒ The closing sentence of DRAWN_WITH_WHERE_IT_STANDS ("the
# reader sees the same picture whatever this value is") would be false here, and
# FR-085 says so itself: 「書き出し専用の幅を設けてはならない」.
SUBTRACTED_WHERE_IT_STANDS = []

# ⛔ THE SAME THIRD SEAM, WITH A DIFFERENT GROUND. S-180 belongs to the mark
# FR-043 draws, the way S-138 and S-140 belong to what draws with them -- but
# the sentence that tells a reader their picture does not change is NOT the same
# sentence. The entrance is absent from an export because EP-1 and EP-4 draw no
# entrance at all; the dummy is absent because EP-14 says so of U-52 alone, and
# that row adds that no place is reserved for it (it lies over the task bar).
# ⛔ Sharing one paragraph would print the wrong row ID in the one place a
# reader looks for it, which is the copied-value defect rule 03 section 3 names.
#
# ⛔⛔ AND THE DRAWING UNIT IS NOT THE ONLY READER. Table T-023d's closing
# rule (MUST) sends 「描かれたダミーの印の画素」 to GR-17, which makes the drawn
# rectangle a fact the HIT TEST needs -- so `schedule-geometry.ts` solves
# DM-3's width (the marker's diameter times S-247, at most S-180, CR-421) once
# onto `DummyGeometry.ink` and both sides read that. ⭐ The paragraph below claims only why the document does
# not keep the row.
DRAWN_FOR_THE_SCREEN_ALONE = []

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
DRAWN_INSIDE_THE_COMMAND_PALETTE = []

# ⛔ A FIFTH GROUND, AND THE ONLY ONE WHOSE PICTURE LEAVES THE TOOL. S-194 is
# read by the unit that draws with it, as S-138 is (and as S-180 was until the
# hit test came to need the drawn rectangle too) -- but all three of their
# closing sentences say some form of "the export does not show
# this", and EP-6 of table T-076 puts the Dual Cursor's two lines INTO the
# exported picture. What table T-206 records here is narrower: the document
# keeps the two DATES (S-65) and never the width they are drawn at.
DRAWN_INTO_THE_EXPORTED_PICTURE = []

# ⛔ A SIXTH GROUND, AND THE SECOND WHOSE PICTURE LEAVES THE TOOL. S-196 is the
# gap the name label of a line-only shape is lifted by (the label column of table
# T-012), and it is read by the unit that lays the label out. ⛔ The ground of
# S-138 and S-180 does NOT fit: both close with some form of "the
# export does not show this", and EP-5 of table T-076 draws the Row Area's
# contents -- the name label among them -- INTO the exported picture. ⚠️ Nor is
# S-194's sentence right: that one turns on the document keeping the two DATES,
# and a label has no such pair. What table T-206 records here is that the
# document keeps no label position at all -- the gap comes from the shape's
# own kind instead (T-297 RK-1/RK-2 retired the anchor columns).
DRAWN_INTO_THE_EXPORTED_PICTURE_FROM_THE_SHAPE = []

# ⛔ AN EIGHTH GROUND, AND THE THIRD WHOSE PICTURE LEAVES THE TOOL -- but the
# first where the SCREEN AND THE EXPORT READ THE SAME ROW. S-225 is the size
# the `Document Title` is written at and S-226 is its inset from the band's
# left edge, and EP-1 of table T-076 (MUST) has both sides read one row while
# forbidding (MUST NOT) an export a constant of its own, because an export
# with its own constants draws the title at a different size and inset from
# the screen's.
# ⛔ S-194's ground does NOT fit: that one turns on the document keeping the
# two DATES a cursor is drawn from, and a title has no such pair. ⚠️ Nor does
# S-196's: that one turns on the label's ANCHOR being kept, and nothing
# anchors a title. ⭐ What table T-206 records here is that the document keeps
# the title's TEXT (`Project.title`, U-27) and neither of the two numbers it
# is written with.
DRAWN_ON_THE_SCREEN_AND_IN_THE_EXPORT = []

# ⛔⛔ RETIRED (CR-369). The seventh ground held exactly one
# row and that row went out with the mode it measured, so
# NOT_STORED_GUIDE_CURSOR_SIZES is no longer written. ⭐ The paragraph is kept
# because DRAWN_UNDER_THE_HAND_ALONE is the sentence a future row of this
# shape would arrive on, and because it records WHY the other six grounds did
# not fit -- which is the part that would be re-derived otherwise.
# S-209
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
DRAWN_UNDER_THE_HAND_ALONE = []

READ_WHERE_IT_STANDS = []
# ⛔ A SEAM OF ITS OWN, BECAUSE THE ONE ABOVE NAMES A COUNT THAT MOVED. UF-61
# takes FOUR arguments since DFC-298 -- `ScreenSession` joined them so GR-21 of
# table T-023d could reach the extents the grip's length is a fraction of -- so
# the sentence "fixes UF-61 at three arguments" is no longer true of the two
# constants that stand in the frame's own units. ⭐ The ground did not move with
# the count: the door that was opened carries EXTENTS and not settings values,
# and FR-051 (MUST NOT) still forbids a setting to hold what these rows bound.
# ⭐ AND THE SECOND HALF OF THE GROUND IS THE LAYER RULE: S-205 stands in
# `frame-loop.ts` as well, and Chapter 5.3 keeps an Adapter from importing a
# Framework file -- so one manuscript row is generated into both units rather
# than passed between them.
READ_WHERE_THE_FRAME_STANDS = []
# ⛔ A FOURTH SEAM: no door AND no caller, because the clock is the shell's
# own. FT-4 of table T-078 puts time arriving among the triggers a frame runs
# on and gives it to SingleHtmlShell (CP-25) to count for itself, and the note
# under that table refuses to widen what IF-2 supplies (table T-065) on the
# ground that a time is the host's value rather than an input device's event.
# So no argument may be added to hand these in through, and the unit that
# measures the wait is the unit that reads the rows.
TIMED_WHERE_IT_STANDS = []
# ⛔ A FIFTH SEAM: no door AND no caller, because the record is made of what
# this loop itself receives. FR-102 (MUST) has a person start and stop a record
# of the happenings and the frames, and both of those are the shell's own --
# IF-2 delivers the happenings here and table T-078 runs the frames here -- so
# there is no argument any caller could hand the cap in through.
KEPT_WHERE_IT_STANDS = []
# ⛔ A SIXTH SEAM: no door AND no caller, because the DECISION is the reading
# unit's own. S-208 is the distance HF-15 of table T-051 settles a grab's axis
# at -- 「掴んでから最初に閾値を超えた向きで軸が決まり、離すまで変わらない
# （MUST）」 -- and the unit that settles it is InputCommandTranslator. ⛔ The
# zoom trio's seam does NOT fit, although both land in that file: S-53 arrives
# as an argument because the SHELL applies the zoom and has to pass the step
# it stepped by, and nothing outside this unit applies an axis. ⛔ Nor does any
# drawing ground fit -- those close on what an exported picture does not show,
# and a threshold appears in no picture at all.
SETTLED_WHERE_IT_STANDS = []
# ⛔ AN EIGHTH SEAM: no door AND no caller, because the value is one END of a
# DERIVATION this unit alone can carry out. FR-016 (MUST) states the ceiling of
# the day axis as 「`Row Area` の幅 ÷（`S-229` × 等倍のときの 1 日の幅）」, and
# both of the other two terms are already here and nowhere else: the region is
# `InputContext.regions.rowArea` and the width of one day at 等倍 is read back
# off the frame's own layout. ⛔ The row's own note forbids the number itself
# reaching `src/` by hand -- 「`src/` に 10 を打ち込んではならない」 -- which is
# exactly what a generated block is for.
DERIVED_WHERE_IT_STANDS = []
# ⭐ Three rows of table T-206 hold no value of their own: their 値 column NAMES
# a row of table T-201 instead (S-96 -> S-53, S-97 -> S-54, S-98 -> S-55). The
# zoom trio is stated once, among the drawing settings, and table T-206 records
# only that the document does not keep it.
#
# ⛔ Before this, nothing carried them into src/ at all, and that single gap
# stopped the whole of FT-1: `InputContext.zoomStep` is S-53 and
# `SettingsLimits.zoomMin` / `zoomMax` are S-54 / S-55, so no member of PI-18
# could be called and no pointer or key ever reached the application.
ARRIVES_AS_ARGUMENT_ZOOM = list(ARRIVES_AS_ARGUMENT)
# ⛔ A SEVENTH SEAM: no door AND no caller, because the STORE is the shell's
# own. S-99a is one of the rows table T-206 keeps in `localStorage`, LM-14
# admits an environment that refuses that store outright, and LY-5 of table
# T-060 leaves it with the Framework -- so the unit that reads the store is the
# unit that has to hold what to fall back to.
#
# ⭐ THE FALLBACK IS THE ROW'S OWN DEFAULT, AND FR-086 IS WHY THAT IS THE RIGHT
# ONE. That requirement (MUST) has a person enter the name and starts them from
# this very value; nothing in this build asks yet, so the start is all there is
# -- and FR-020 (MUST) still lays a name over the Row Area meanwhile. ⛔ The
# alternative was the shell typing the word in, which rule 03 forbids.
STORED_WHERE_IT_STANDS = []
NOT_STORED_TARGETS = {
    # ⭐ THE 41 VALUES OF TABLE T-266, AND NOT THE THREE THAT STOOD HERE
    # (CR-430). S-90 .. S-92 held ONE plan margin, ONE actual margin and ONE
    # fade square for every shape at once; FR-104 (MUST) now gives each of the
    # 22 grab areas its own row so that widening one target's margin moves no
    # other target's -- so the constant carries the rows table T-266 names,
    # in the order that table states them (GA-1 .. GA-22, outer / inner /
    # band-and-beyond).
    # ⛔ THE ROWS ARE NOT DERIVED FROM ONE ANOTHER HERE. Table T-266's own
    # closing rules cap the inner margins at half the drawn width and split
    # the dummy mark down its middle; those are the hit test's to apply, and
    # this constant hands over the stated numbers alone.
    # ⚠️ S-93 IS STILL NOT IN THIS LIST, and the ground outlived the rows that
    # carried it: the dummy's hit width is the ink's (table T-240's DM-3),
    # which S-180 states and NOT_STORED_DUMMY_SIZES carries.
    # ⭐ S-137 AND THE FOUR ANNOTATION ROWS RIDE ALONG, as S-137 and S-230
    # already did: table T-023d's GR-16 is the base-date line's grab and GR-14
    # is the annotation's, and the unit that answers WHICH grab area a point
    # falls in answers for those too (CR-430 section 6.3). S-293 is the
    # highlight box's frame, S-291 the comment box's leader line and S-292 its
    # line end -- the three GR-14 rows the older editions had no value for.
    'NOT_STORED_SIZES': (['S-250', 'S-251', 'S-252', 'S-253', 'S-254', 'S-255',
                          'S-256', 'S-257', 'S-258', 'S-259', 'S-260', 'S-261',
                          'S-262', 'S-263', 'S-264', 'S-265', 'S-266', 'S-267',
                          'S-268', 'S-269', 'S-270', 'S-271', 'S-272', 'S-273',
                          'S-274', 'S-275', 'S-276', 'S-277', 'S-278', 'S-279',
                          'S-280', 'S-281', 'S-282', 'S-283', 'S-284', 'S-285',
                          'S-286', 'S-287', 'S-288', 'S-289', 'S-290',
                          'S-137', 'S-230', 'S-293', 'S-291', 'S-292'],
                         ARRIVES_AS_ARGUMENT),
    'NOT_STORED_LIMITS': (['S-94', 'S-95'], ARRIVES_AS_ARGUMENT),
    'NOT_STORED_PANEL_DIVIDER_SIZES': (['S-134'], READ_WHERE_THE_FRAME_STANDS),
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
    # NOT FOLDED INTO THE LINE ABOVE. S-248 is the least width FR-052 lets the
    # properties panel be drawn at, and TWO units read it that may not import
    # one another (Chapter 5.3): the translator stops the held boundary there,
    # and `frame-loop.ts` opens a document whose S-80 is below it at S-171.
    # One name printed into both, as NOT_STORED_SCROLLBAR_SIZES is; folding it
    # into the line above would hand the translator S-171, which it never reads.
    'NOT_STORED_PROPERTIES_PANEL_FLOOR': (['S-248'], READ_WHERE_IT_STANDS),
    # ⛔ THE FLOOR UNDER THE SCROLLBAR AND NOT ITS THICKNESS. FR-051 forbids
    # the thickness to be a setting -- it is measured off the environment at
    # BO-1 -- and S-205 is the least this tool will draw whatever that
    # measurement says, because a host with overlay scrollbars answers 0 and
    # half of 0 is 0 (DFC-115).
    # ⭐⭐ AND IT IS WRITTEN INTO TWO UNITS, which is the bargain S-218 already
    # stands on a few entries below: one manuscript row read by two units that
    # may not import one another. `frame-loop.ts` floors the LANE'S THICKNESS
    # with it at BO-1, and `screen-frame.ts` floors the GRIP'S LENGTH with it
    # for GR-21 of table T-023d -- 「長さの下限を `S-205` とすること（MUST）」,
    # which that row states is the same number on purpose 「最小のつまみを正方形
    # にするため」. ⛔ The Adapter may not import the Framework file the block
    # already stood in (Chapter 5.3), and ⛔ the lane's own thickness may not be
    # substituted for it: that thickness is at least S-205 and usually more, so
    # flooring at it would make the grip longer than the fraction GR-21 fixes.
    # ⭐ ONE NAME AND NOT TWO, unlike S-218: there the two constants hold
    # DIFFERENT row sets for different subjects, and here both hold {S-205} for
    # the one subject table T-206's row names -- the least a scrollbar is drawn
    # at. Two names for one set would be the invented distinction.
    'NOT_STORED_SCROLLBAR_SIZES': (['S-205'], READ_WHERE_THE_FRAME_STANDS),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE. S-171 is the panel's own width and
    # stands where the frame is laid out; S-199 is the room ONE control needs
    # beyond its value, and FR-006 (MUST) makes the side that ESTIMATES carry
    # it across -- which is `properties-panel.ts`. One shared constant would
    # hand each unit the other's value.
    'NOT_STORED_PROPERTY_CONTROL_SIZES': (['S-199'], READ_WHERE_IT_STANDS),
    'NOT_STORED_ROW_CONTROL_SIZES': (['S-140', 'S-313'], DRAWN_WITH_WHERE_IT_STANDS),
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
    # S-243 joins the three because the one unit that draws every entrance
    # draws the Row Title Panel's too: FR-029 (MUST) gives an entrance on that
    # panel the gap S-243 instead of S-141, and the box and frame line stay.
    'NOT_STORED_ICON_SIZES': (['S-138', 'S-141', 'S-237', 'S-243'],
                              DRAWN_WITH_WHERE_IT_STANDS),
    # ⭐ THE THREE ROWS AN ENTRANCE'S OUTER WIDTH IS COMPOSED OF, READ WHERE
    # THE FLOOR IS WORKED OUT. FR-029 (MUST) states that width as the box
    # (S-138) plus the gap (S-141) and the frame's line (S-237) on each side,
    # and FR-039's floor under the DRAWN Row Title Panel is four of them times
    # S-235, beside one grab strip of S-138 times S-235.
    # ⛔ THE OUTER WIDTH IS NOT A ROW AND MAY NOT BECOME ONE: FR-029 (MUST NOT)
    # forbids that px number a place in table T-206, because a table holding
    # both the terms and their sum lets one of them be corrected alone. ⇒ The
    # sum is composed in the unit, out of these three rows, and the day any
    # term moves the floor moves with it.
    # ⛔ NOT FOLDED INTO NOT_STORED_ICON_SIZES ABOVE, although that constant
    # holds two of the same rows: one constant per consuming UNIT, and that one
    # belongs to the Framework unit that DRAWS an entrance while this one
    # belongs to `screen-regions.ts`, which draws nothing and works out a
    # width. ⚠️ S-237 NOW STANDS IN BOTH CONSTANTS. The drawing side used to
    # carry its border as a raw `1px` in its own CSS, and the note here said
    # that the day it read the row instead, the row would join ITS constant
    # rather than this one moving. That day came: `dom-screen-surface.ts` draws
    # the entrance's frame from S-237 x S-235, so the row joined there too.
    # ⭐ IT STANDS IN `screen-regions.ts` on the ground the S-236 entry below
    # gives: the floor belongs where the drawn settings are made, and that unit
    # imports `document-settings.ts` alone, so no import cycle is opened.
    # S-243 AND NOT S-141 SINCE CR-414: every entrance this unit composes sits
    # on the Row Title Panel (HF-1's lattice for LF-3's floor, four row
    # controls for FR-039's), and FR-029 (MUST) gives those the gap S-243.
    'NOT_STORED_ENTRANCE_SIZES': (['S-138', 'S-237', 'S-243'],
                                  READ_WHERE_IT_STANDS),
    # ⭐ THE PRODUCT'S OWN NOTCH, AND NOT A DOCUMENT'S. S-236 is the ratio the
    # chart is drawn at when table T-202's S-234 reads 100, and FR-039 (MUST)
    # builds the drawing ratio out of the two: S-234 / 100 * S-236. The DOCUMENT
    # keeps S-234 and never this row, because this one is where the product's
    # scale is set rather than one schedule's.
    # ⛔ NOT WITH S-235 BELOW, although both read 0.6667 today. Table T-206's own
    # rows for the pair forbid sharing (「`S-235` と兼ねてはならない」 / 「`S-236`
    # と兼ねてはならない」): one is the chart's base and the other is the frame
    # around it, and either may be chosen again on its own. One constant would
    # be exactly the joined value those two notes refuse.
    # ⭐ IT STANDS IN `screen-regions.ts`, the bottom of the layout engine, because
    # every side that draws has to multiply table T-252's rows by it and that unit
    # is the one they can all reach -- see the paragraph above its own entry below.
    # ⛔ Each side multiplies the STORED settings once on its way in; none of them
    # scales an already scaled value (FR-039 MUST NOT: 「導く元と導いた値の両方に
    # … 掛けてはならない」).
    'NOT_STORED_DISPLAY_SCALE_BASE': (['S-236'], READ_WHERE_IT_STANDS),
    # ⭐ THE FRAME AROUND THE CHART, FIXED AT TWO THIRDS. S-235 is what FR-051
    # and FR-053 (MUST) draw the `App Header` and the `Command Palette` at, and
    # what FR-029 (MUST) multiplies an entrance's box (S-138) and gap (S-141) by
    # ON EVERY SURFACE. ⛔ The display scale (S-234) is NOT applied to any of it
    # -- DS-6 and DS-7 of table T-252 say so in as many words.
    # ⭐⭐ IT IS WRITTEN INTO THREE UNITS, on the bargain S-225 / S-226 already
    # stand on a few entries below: EP-1 of table T-076 (MUST) has the screen and
    # the export read ONE row for the title's size and inset, and FR-051 (MUST)
    # multiplies that same pair by this row -- so the export has to reach it too.
    # ⛔ A second value in the exporter is what EP-1 (MUST NOT) forbids.
    # ⭐ THE THIRD IS `screen-regions.ts`, and FR-039's floor is why: the floor
    # under the drawn Row Title Panel is the grab strip and four entrances
    # multiplied by THIS row rather than by the display ratio (DS-7 of table
    # T-252 keeps the display scale off both), and it is worked out where the
    # drawn settings are made. ⛔ That unit may not import the Adapter or the
    # Framework one this row already stands in (Chapter 5.3).
    'NOT_STORED_CHROME_SCALE': (['S-235'], DRAWN_ON_THE_SCREEN_AND_IN_THE_EXPORT),
    # ⭐ THE SAME GAP, ON THE SIDE THAT DRAWS IT. S-218 stands twice because two
    # units read it and neither may import the other (Chapter 5.3): the Adapter
    # SUBTRACTS it before cutting the name and this unit LAYS it between the
    # strip and the name. ⛔ Two hand-typed 4s would be the copied value rule 03
    # section 1 forbids; two readings of one generated row are not -- what the
    # rule forbids is a value with two homes, and its home is table T-206.
    # ⛔ NOT FOLDED INTO NOT_STORED_ICON_SIZES: that constant is an ENTRANCE's
    # shape (S-138's box, S-141's inner gap and S-237's frame line), and GR-20
    # is no entrance.
    'NOT_STORED_ROW_GRAB_STRIP_SIZES': (['S-218'], DRAWN_WITH_WHERE_IT_STANDS),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE, though both land in
    # dom-screen-surface.ts: one constant per consuming SUBJECT. S-138, S-141
    # and S-237 are the box an ENTRANCE is drawn in; S-213 is the band a ROW is
    # marked with -- HF-15's live axis and HF-18's holding mark -- and the
    # settings row itself states that those two bands are one number.
    'NOT_STORED_ROW_BAND_SIZES': (['S-213'], DRAWN_WITH_WHERE_IT_STANDS),
    # THE SAME ROW, ON THE SIDE THAT DRAWS IT (seam S-9 of CR-541). S-313 stands
    # in NOT_STORED_ROW_CONTROL_SIZES for row-title-panel.ts, which measures the
    # controls, and here for row-title-panel-drawing.ts, which lays the nearest
    # one in from the panel's right edge (HF-4 of table T-051); neither unit may
    # import the other (Chapter 5.3), so both read one generated row -- the
    # bargain S-218 already stands on. NOT folded into the lines above: one
    # constant per consuming SUBJECT, and this subject is the controls' inset.
    'NOT_STORED_ROW_CONTROL_EDGE_SIZES': (['S-313'], DRAWN_WITH_WHERE_IT_STANDS),
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
    # ⭐ CR-551: S-339 (IN-7's inset of a tooltip from the window edge), and
    # S-334 / S-340 (DC-3's readout text factor and its px floor) join S-204,
    # the tooltip's text factor, because the one unit that draws them all is
    # tooltips-drawing.ts, which reads this constant already -- the readout is
    # drawn by the tooltip drawer, and S-334 is stated as S-204's half.
    'NOT_STORED_HELP_SIZES': (['S-201', 'S-202', 'S-203', 'S-204', 'S-334',
                               'S-339', 'S-340'],
                              DRAWN_WITH_WHERE_IT_STANDS),
    # FR-099's Resource Roster (table T-257, CR-406): the text factor RR-1 reads
    # and the rule width RR-5 reads. Not folded into the help line above -- one
    # constant per consuming SUBJECT. S-241 is NOT S-237 / S-143 although all
    # three are 1px: the row's own note forbids sharing them.
    'NOT_STORED_RESOURCE_ROSTER_SIZES': (['S-240', 'S-241'],
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
    # ⛔ NOT FOLDED INTO THE SELECTION LINE EITHER. S-224 is the halo FR-009
    # lays on the dependency line in front, and its subject is the DEPENDENCY,
    # not the selection sign -- the halo is drawn on every line, selected or
    # not, and only the ORDER changes when one is selected. ⭐ Like S-178 it is
    # a multiplier on the line's own width (S-18) rather than a length.
    'NOT_STORED_DEPENDENCY_SIZES': (['S-224'], DRAWN_INTO_THE_EXPORTED_PICTURE),
    # ⭐ CR-551: S-333 (the base date line's width, CU-1 of table T-029) joins
    # S-194: both are the width a line of table T-029 is drawn at, both are
    # drawn by schedule-overlays.ts, which reads this constant already, and
    # EP-6 of table T-076 carries both into an exported picture.
    'NOT_STORED_DUAL_CURSOR_SIZES': (['S-194', 'S-333'], DRAWN_INTO_THE_EXPORTED_PICTURE),
    # ⭐ CR-551: the four numbers FR-013 (MUST) draws the delay mark `(!)` of
    # PM-4 with -- the bar's width against S-24, its lower end, the dot's
    # centre and the dot's radius. ⛔ A NEW CONSTANT, not folded into any line
    # of svg-renderer.ts: one constant per consuming SUBJECT, and none of the
    # others is the progress marker's glyph. Read by schedule-task-figures.ts.
    # ⭐ CR-551 (E-42): S-341 joins them -- the symbol's half-height as a ratio
    # of the marker circle's radius, that PM-2's check and PM-3's slash also
    # read (table T-021), not only PM-4's `(!)`. ⛔ No separate marker-size
    # group exists yet, and this group is already schedule-task-figures.ts's
    # one constant for the progress marker's glyph, so S-341 lands here rather
    # than founding a new group of its own.
    'NOT_STORED_DELAY_MARK_SIZES': (['S-328', 'S-329', 'S-330', 'S-331', 'S-341'],
                                    DRAWN_INTO_THE_EXPORTED_PICTURE),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE, though both are a cursor's and both
    # land in svg-renderer.ts. FR-048 (MUST) states in as many words that the
    # two 「縦 2 本」 are different things -- CU-2 measures and the document
    # keeps its two dates, CU-3 follows the hand and keeps none -- and EP-6 of
    # table T-076 puts one in an exported picture and the other out of it. One
    # shared constant would say the two arrive on the same ground, and the
    # paragraph above each is what says the ground.
    # ⭐ The coefficient FR-017 prints the day tier's THIRD line at. ⚠️ NOT
    # A LENGTH -- it is a fraction of the ruler's own font size (S-3), so
    # what it multiplies is known only where the ruler is drawn.
    # ⛔ NOT WITH THE CURSORS ABOVE. Their ground is that the export does
    # not show them; EP-5 of table T-076 draws the ruler INTO an exported
    # picture, so this one is the reader's own for the other reason: the
    # document keeps the DATES and never the width their labels take.
    'NOT_STORED_RULER_WEEKDAY_SIZES': (['S-219'],
                                       DRAWN_INTO_THE_EXPORTED_PICTURE),
    # ⭐ DFC-276: the two numbers EP-1 writes the `Document Title` with, in the
    # unit that assembles an exported picture. ⛔ NOT FOLDED INTO ANY LINE
    # ABOVE -- every one of them is read by a unit that draws the schedule,
    # and these two are read where the CHROME around it is drawn.
    # ⚠️ The screen draws the same title from the same two rows, so this
    # constant is generated a second time into the unit that paints it -- the
    # bargain S-218 already stands on in two units, and what EP-1 of table
    # T-076 asks for.
    'NOT_STORED_DOCUMENT_TITLE_SIZES': (['S-225', 'S-226'],
                                        DRAWN_ON_THE_SCREEN_AND_IN_THE_EXPORT),
    # ⭐ The eight lengths FR-006's fields are drawn at, and the two
    # coefficients its typography is drawn at. ⚠️ THE LAST TWO ARE NOT
    # LENGTHS: S-197 is the panel's text size as a fraction of the host's own
    # base, and S-198 is the item name's as a fraction of THAT -- FR-006 (MUST)
    # states both multiplicands, and neither multiplies fontScaleSizes.
    # ⛔ NOT folded into
    # NOT_STORED_ICON_SIZES though both land in dom-screen-surface.ts: one
    # constant per consuming SUBJECT, which is the split the note under
    # NOT_STORED_DUMMY_SIZES states. S-138, S-141 and S-237 are an entrance's
    # shape and S-186 .. S-193 are the property fields', and a shared constant
    # would make one of the two paragraphs a lie.
    'NOT_STORED_PROPERTY_FIELD_SIZES': (
        # CR-551: S-335 and S-338 are COUNTS of CV-9's colour field (squares
        # on a checker side, swatches in one row), drawn by the same unit.
        ['S-186', 'S-187', 'S-188', 'S-189', 'S-190', 'S-191', 'S-192', 'S-193',
         'S-197', 'S-198', 'S-335', 'S-338'],
        DRAWN_WITH_WHERE_IT_STANDS),
    # NOT FOLDED INTO NOT_STORED_PALETTE_GROUP_RULE_SIZES though both are one
    # rule's thickness drawn by dom-screen-surface.ts: one constant per
    # consuming SUBJECT. S-143 separates the palette's groups, S-242 separates
    # a confirmation's question from its list (CQ-2 of table T-258), and the
    # row's own note forbids sharing it with S-241 as well.
    'NOT_STORED_CONFIRMATION_RULE_SIZES': (['S-242'], DRAWN_WITH_WHERE_IT_STANDS),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE, though both land in svg-renderer.ts:
    # one constant per consuming SUBJECT, not per file. S-174 to S-178 are the
    # selection frame's and S-180 is the dummy's, and the two paragraphs state
    # different grounds -- a shared constant would make one of them a lie.
    # ⭐ The one gap the name label of a line-only shape is lifted by. ⛔ NOT
    # folded into any constant above: one per consuming SUBJECT, and this one
    # is read by the unit that PLACES the label rather than by one that paints
    # a mark over it. Its ground is the sixth, for the reason written there.
    # S-233 (CR-380 decision 11) rides the same constant because PI-5 of table
    # T-064 hands both rows over and OC-10 reads both to count the label's
    # height. Its reason for not being kept is its own row's note in table
    # T-206 (the document holds no typeface), not the sixth ground's.
    # ⭐ CR-551: S-325 rides the same constant. FR-002 (MUST) measures the
    # planned dates at the name's size times S-325 for T-273's fit and OC-1,
    # and this is the unit that measures them; the renderer draws the dates'
    # <tspan> at the same factor and reads it from this unit's public entry.
    'NOT_STORED_LABEL_SIZES': (['S-196', 'S-233', 'S-325'],
                               DRAWN_INTO_THE_EXPORTED_PICTURE_FROM_THE_SHAPE),
    # ⭐ CR-551: FR-055's fit leaves S-332 of the Row Area's width free on each
    # side. ⛔ A NEW CONSTANT: its subject is the fit, which fitZoom in
    # schedule-layout.ts carries out, and no line above is the fit's.
    'NOT_STORED_FIT_MARGIN': (['S-332'], READ_WHERE_IT_STANDS),
    # S-247 (CR-421) rides the same constant: DM-3 of table T-240 draws the
    # dummy at the marker's diameter times S-247, capped by S-180, and the
    # row's own note gives S-180's reason for not being kept.
    'NOT_STORED_DUMMY_SIZES': (['S-180', 'S-247'], DRAWN_FOR_THE_SCREEN_ALONE),
    'NOT_STORED_REPEAT_TIMES': (['S-172', 'S-173'], TIMED_WHERE_IT_STANDS),
    # ⭐ How long SE-3 of table T-260 keeps the display scale message. ⚠️ Not
    # folded into NOT_STORED_REPEAT_TIMES though both are times counted off
    # the clock in frame-loop.ts: one constant per consuming SUBJECT, and those
    # two are how long a held entrance waits (CR-411).
    'NOT_STORED_SCALE_MESSAGE_TIMES': (['S-244'], TIMED_WHERE_IT_STANDS),
    # ⛔ A COUNT OF ENTRIES AND NOT A LENGTH OF TIME. FR-102 (MUST) drops the
    # record from the oldest end once S-207 is reached and writes at its head
    # how many were dropped, so what the row bounds is how many happenings the
    # record may hold. ⚠️ Not folded into NOT_STORED_REPEAT_TIMES though both
    # land in frame-loop.ts: one constant per consuming SUBJECT, and those two
    # are how long a held entrance waits.
    'NOT_STORED_INTERACTION_RECORD_LIMITS': (['S-207'], KEPT_WHERE_IT_STANDS),
    # ⭐ THE SIZES OF THE POINTER PICTURES THIS TOOL DRAWS ITSELF (table T-269
    # since CR-430; table T-264's PC-5 before it). They arrive on the sentence
    # DRAWN_UNDER_THE_HAND_ALONE keeps for a row of this shape: a pointer
    # follows the hand, and a picture no hand is over has nowhere to put it.
    # ⚠️ Not folded into any other line of frame-loop.ts: one constant per
    # consuming SUBJECT, and the others are a panel width, times and a count.
    # ⛔ The display scale (FR-039) must not reach any of them -- the closing
    # rule under table T-269 says so of the pictures.
    # ⭐ THE FOUR NEW ROWS JOIN S-249 RATHER THAN OPENING A CONSTANT OF THEIR
    # OWN, because the subject is the one table T-269 names -- the shapes the
    # tool hands the host. S-249 is the side of PK-1 / PK-2 / PK-4, S-294 the
    # fade triangle PK-3, S-295 the two circle diameters PK-5 / PK-6, S-296 the
    # resume arrow PK-9 and S-297 the one border every picture is drawn with.
    # ⛔ The name is kept as it stands: renaming a published constant is a
    # separate decision from carrying rows, and check 30 counts these names
    # against the list in rule 03.
    'NOT_STORED_END_POINTER_SIZES': (['S-249', 'S-294', 'S-295', 'S-296',
                                      'S-297'], DRAWN_UNDER_THE_HAND_ALONE),
    # ⛔ NOT FOLDED INTO ANY LINE ABOVE, and the subject is what keeps it
    # apart: every other row in this file's shell block is a length, a count
    # or a time, and this one is a NAME -- the word FR-020 lays over the Row
    # Area while FR-086's entry road does not exist. ⚠️ It is the only row of
    # table T-206 in `src/` whose cell is a `lit`, so its generated type is
    # the literal itself.
    'NOT_STORED_WATERMARK_NAME': (['S-99a'], STORED_WHERE_IT_STANDS),
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
    # ⛔ NOT FOLDED INTO EITHER LINE ABOVE, though all three land in the
    # translator: one constant per consuming SUBJECT. S-96 is how far one notch
    # steps, S-208 / S-212 are HF-15's grab, and S-229 is the FLOOR ON WHAT
    # STAYS VISIBLE that FR-016 turns into the ceiling of the day axis -- three
    # subjects, and a shared constant would make one of the three paragraphs a
    # lie.
    'NOT_STORED_VISIBLE_DAY_FLOOR': (['S-229'], DERIVED_WHERE_IT_STANDS),
    # ⛔ NOT FOLDED INTO THE LINE ABOVE, though both land in the translator and
    # both end in an FR-016 ceiling: S-229 bounds the DAY axis, S-238 / S-239
    # are the step and the tolerance table T-253 searches the ROW axis's band
    # side with. The same seam as S-229: both are ends of a derivation only
    # `rowBandCeilingOf` carries out, and neither may be typed into `src/`.
    # ⛔ S-238 IS NOT S-53 / S-96 although both default to 1.1: the row's own
    # note forbids the two to be shared (S-53 is how fast one notch moves).
    'NOT_STORED_ROW_BAND_CEILING_SEARCH': (['S-238', 'S-239'], DERIVED_WHERE_IT_STANDS),
    'NOT_STORED_ZOOM_BOUNDS': (['S-97', 'S-98'], ARRIVES_AS_ARGUMENT_ZOOM),
    # ⭐ THE ONE TYPEFACE LIST EVERY TEXT IS DRAWN IN (CR-419). FR-039 (MUST)
    # draws every text of the screen AND of the exported picture in S-246's
    # list, and (MUST NOT) forbids a surface a list of its own -- so the row is
    # written into the three units that write text: `svg-renderer.ts` (the
    # chart's labels, ruler, watermark and highlight text, which travel into the
    # export inside the chart's SVG), `image-exporter.ts` (the title and row
    # names the export draws around that SVG), and `dom-screen-surface.ts` (the
    # root every DOM surface inherits from).
    # ⭐ ONE NAME IN THREE UNITS, on the bargain NOT_STORED_CHROME_SCALE stands
    # on: the decision is the ROW, and three readers of one row is what "one
    # list, not one per surface" asks for. ⛔ A second value in any of them is
    # exactly the per-surface list the MUST NOT refuses.
    # ⚠️ The row's own note gives the reason the document does not keep it: the
    # way text is drawn belongs to the product, as S-233's does.
    'NOT_STORED_TYPEFACES': (['S-246'], DRAWN_ON_THE_SCREEN_AND_IN_THE_EXPORT),
    # ⭐ THE WEIGHT OF THE NAME LABEL ALONE (CR-419). FR-039 (MUST) draws the
    # shape's name label (OC-1 of table T-038) at S-245 and (MUST NOT) no other
    # text at that weight. ⛔ NOT FOLDED INTO NOT_STORED_TYPEFACES although both
    # land in `svg-renderer.ts`: one constant per consuming SUBJECT, and the two
    # subjects differ -- the list is every text's, the weight is one label's,
    # and the other two units that carry the list must not carry the weight.
    # ⛔ Nor into NOT_STORED_LABEL_SIZES: that constant stands in the unit that
    # PLACES the label, and a weight is read only where the label is written.
    'NOT_STORED_NAME_LABEL_WEIGHT': (['S-245'],
                                     DRAWN_INTO_THE_EXPORTED_PICTURE_FROM_THE_SHAPE),
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
    # ⭐ A CELL PRINTED AS ONE CODE SPAN AND NOTHING ELSE STATES ITS VALUE IN
    # THAT SPAN. S-246 (CR-419) is the first such row: its value is the CSS
    # `font-family` list `"Yu Gothic UI", "Yu Gothic", YuGothic, "BIZ UDPGothic",
    # sans-serif`, printed in backticks and carrying no `lit`. The span is the
    # same in every edition, so reading it is reading the value, not a guess.
    # ⛔ Only a WHOLE-cell span: a cell with prose around a span (「`S-53`
    # と同じ」) is not a value, and a span holding a single quote or a backslash
    # could not be carried in the '...' literal written below, so both are
    # refused by returning None and letting the caller stop.
    # ⚠️ Typed `string`, not the literal: a typeface list is not a key anything
    # switches on, and a 60-character literal type would say otherwise.
    spoken = cell.get('ja')
    if isinstance(spoken, str):
        span = re.match(r"^`([^`'\\]+)`$", spoken.strip())
        if span:
            return ("'%s'" % span.group(1), 'string')
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
    # ⛔ S-168 AND S-169 (the ink and halo of a label ON A BAR) do not belong
    # here: this unit draws no bar, so it could never use them.
    # ⭐ S-183 STANDS WHERE TABLE T-236 PRINTS IT -- right after S-152, whose
    # pair it takes. The row's own note says the green is the one the table
    # already holds for 「いま効いている」, and FR-029's table T-237 has this unit
    # FILL the armed entrance with it (EN-1), so it is the chrome's after all.
    # ⭐ S-151 IS THE CHROME'S TOO, by the same
    # reading: EN-3 of table T-237 fills a PINNED row's `Row Pin` with it and
    # HF-6 of table T-051 (MUST) points at that row. The pin is a row control
    # this unit draws, not a bar, so the row has a reader on this side as
    # well as on the drawing side (where SL-8's selection frame keeps it).
    # ⛔ Not a second copy -- ONE row of table T-236 read by two units, which is
    # what S-146 / S-147 / S-149 already do below.
    # ⭐ S-231 IS THE ROW HEADER PANEL'S ALONE (DFC-601 / CR-385): the row's
    # grab strip mark (HF-15, GR-20) is drawn by this unit only, and S-149
    # (the rule) no longer stands in for it -- that is the whole point of the
    # change request (`the grip no longer borrows the rule's colour`).
    # ⭐ CR-551: S-336 / S-337 are CV-9's checker squares, which the property
    # panel draws on this side (properties-panel-drawing.ts), so they are the
    # chrome's too.
    'SCREEN_COLOURS': ['S-146', 'S-147', 'S-148', 'S-149', 'S-150', 'S-231',
                       'S-151', 'S-152', 'S-183', 'S-153', 'S-154', 'S-170',
                       'S-336', 'S-337'],
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
    # PND-341
    'SCHEDULE_COLOURS': ['S-146', 'S-147', 'S-148', 'S-149', 'S-150', 'S-151', 'S-155', 'S-156',
                         'S-157', 'S-158', 'S-159', 'S-160', 'S-312', 'S-161', 'S-162',
                         'S-163', 'S-164', 'S-165', 'S-166', 'S-167', 'S-168',
                         'S-169', 'S-195', 'S-223',
                         # CR-551: the delay marker's ground and symbol (PM-4, FR-013).
                         'S-326', 'S-327'],
}

COLOUR_NOTE = [
    '// see T-236, S-73',
]


def colour_block(name):
    """The rows of table T-236 one unit needs, by row ID."""
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    block = [b for b in doc['blocks'] if b.get('id') == 'T-236']
    if not block:
        raise SystemExit('settings.json holds no table T-236')
    by_id = {r['id']: r for r in block[0]['rows']}
    out = list(COLOUR_NOTE) + [
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
        out.append("  '%s': { light: '%s', dark: '%s', followsHue: %s },"
                   % (row_id, cells['light'], cells['dark'],
                      'true' if follows else 'false'))
    out.append('}')
    return NEWLINE.join(out)


# ---- table T-294: the palette colours (CR-548) ---------------------------
#
# ⭐ ONE ROW PER COLOUR, EIGHT CELLS: the four drawn forms (fill, outline,
# actual fill, row band) in both themes. The document stores the row's KEY
# (CV-1 of table T-017b); these values are baked into the artifact.
# A cell is '#rrggbb', null (描かない: not drawn), the row ID a `sameAs`
# names -- that row is a row of table T-236 which follows the hue, so the
# renderer resolves it through its own themed() -- or false for a dash (—):
# the colour offers no value for that form (black's row band, CV-9), and the
# form keeps the theme's.

PALETTE_FORMS = ('fill', 'outline', 'actual', 'band')


def palette_cell(cell, row_id, field):
    if isinstance(cell, dict) and 'colour' in cell:
        return "'%s'" % cell['colour']
    if isinstance(cell, dict) and 'sameAs' in cell:
        return "{ sameAs: '%s' }" % cell['sameAs']
    if isinstance(cell, dict) and cell.get('ja') == '描かない':
        return 'null'
    if isinstance(cell, dict) and cell.get('ja', '').startswith('—'):
        return 'false'
    raise SystemExit('table T-294 row %s states nothing readable in %s'
                     % (row_id, field))


def palette_block():
    """COLOUR_NAME_VALUES: table T-294 keyed by the stored spelling."""
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    block = [b for b in doc['blocks'] if b.get('id') == 'T-294']
    if not block:
        raise SystemExit('settings.json holds no table T-294')
    out = ['// see T-294, T-017b',
           'type PaletteCell = string | null | false | { readonly sameAs: string }',
           'interface PaletteForms {',
           '  readonly fill: PaletteCell',
           '  readonly outline: PaletteCell',
           '  readonly actual: PaletteCell',
           '  readonly band: PaletteCell',
           '}',
           'export const COLOUR_NAME_VALUES: {',
           '  readonly [spelling: string]: {',
           '    readonly rowId: string',
           '    readonly light: PaletteForms',
           '    readonly dark: PaletteForms',
           '  }',
           '} = {']
    for row in block[0]['rows']:
        key = row['key'].strip('`')
        out.append("  %s: {" % key)
        out.append("    rowId: '%s'," % row['id'])
        for side in ('light', 'dark'):
            cells = ', '.join(
                '%s: %s' % (form, palette_cell(row.get(side + form.capitalize()),
                                               row['id'], side + form.capitalize()))
                for form in PALETTE_FORMS)
            out.append('    %s: { %s },' % (side, cells))
        out.append('  },')
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
        # The per-member note that carried the unit and the pointed row
        # ("S-95, in MB", "S-96, stated at S-53") is no longer emitted: the key
        # is the row ID, and the row states its unit and what it points at.
        # Ruling 17 (docs/review/comment-rules-src.md) leaves one `// see` line.
        got.append((cell[0], cell[1], row_id))
    out = ['// see T-206'] + list(seam) + ['export const %s: {' % name]
    for _literal, ts, row_id in got:
        out.append("  readonly '%s': %s" % (row_id, ts))
    out.append('} = {')
    for literal, _ts, row_id in got:
        out.append("  '%s': %s," % (row_id, literal))
    out.append('}')
    return '\n'.join(out)


# ---- table T-217's one row: a HighlightBox's own default, not a setting ----
#
# ⛔ NOT `not_stored_block`, AND NOT BECAUSE OF A DIFFERENT REASON THAN THE
# NAME SAYS. That function reads table T-206, whose whole point is a row
# where the document does NOT keep a value at all. S-132 is not that kind of
# row: table T-217's own paragraph says its value LANDS in the schedule data,
# as a `HighlightBox`'s own `cornerRadiusPx` column (DFC-314) -- so the document
# DOES keep the number once a box exists. What was missing from src/ was
# never a place to keep it; it was the STARTING number a newly created box is
# given, which is table T-217's own default cell and answers to no row of
# table T-206.
def annotation_defaults_block():
    """The one row of table T-217, by its own key column."""
    doc = json.load(io.open(SETTINGS, encoding='utf-8'))
    block = [b for b in doc['blocks'] if b.get('id') == 'T-217']
    if not block:
        raise SystemExit('settings.json holds no table T-217')
    rows = block[0]['rows']
    if len(rows) != 1 or rows[0]['id'] != 'S-132':
        raise SystemExit(
            'table T-217 no longer holds exactly one row named S-132 -- '
            'annotation_defaults_block assumed that shape and has to be reread')
    row = rows[0]
    cell = not_stored_cell(row.get('default'))
    if cell is None:
        raise SystemExit('table T-217 row S-132 holds no machine value, so '
                         'NOT_STORED_ANNOTATION_SIZES cannot be generated')
    out = ['// see T-217, FR-019',
           "export const NOT_STORED_ANNOTATION_SIZES: { readonly 'S-132': %s } = {"
           % cell[1],
           "  'S-132': %s," % cell[0],
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
# である」.
#
# ⭐ S-102 AND THE THREE OF CR-348 REACH THE DRAWING SIDE. ⛔ Do not leave a
# value out on the ground that nothing draws it yet: FR-020 (MUST) has GRS lay
# the mark over the Row Area, and FR-020 (MUST) names S-220 / S-221 / S-222
# and S-223 as the values it is drawn with and (MUST NOT) forbids them in
# `src/`, so the values are carried here -- the alternative is the drawing
# side typing -30.
# ⭐ `watermarkSvg` in svg-renderer.ts spends all four. A value that reaches no
# reader is dropped from the build as dead code, and a value that reaches no
# reader is a value the artifact does not carry.
# ⛔ S-223 IS NOT HERE. It is a colour, so it is a row of table T-236 and
# rides with the other colours in SCHEDULE_COLOURS; only a value with no
# light and dark rendering belongs in this constant.
WATERMARK_TARGETS = {
    # The raw password (S-100) stays out, and FR-020 (MUST NOT) is why; the
    # digest S-99c keeps in `localStorage` replaces this one when it is set.
    'WATERMARK_UNLOCK_DIGEST': (['S-101'], []),
    # The angle, the size, the spacing and the opacity; the ink is S-223 and
    # rides in SCHEDULE_COLOURS.
    'WATERMARK_MARKS': (['S-220', 'S-221', 'S-222', 'S-102'], []),
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
        # manuscript's markup and not part of the value.
        # ⚠️ A cell is EITHER a plain string OR a `num` object carrying the
        # printing marks (`code`, `mark`). S-100 and S-101 are the first shape
        # and S-102 is the second, and both are values; only a cell that is
        # neither is an error at the call site rather than a silent one.
        if isinstance(raw, dict) and 'num' in raw:
            raw = raw['num']
        if not isinstance(raw, str):
            raise SystemExit(
                'table T-207 row %s holds no plain value, so %s cannot be '
                'generated.' % (row_id, name))
        got.append((row_id, raw.strip().strip('`')))
    out = ['// see T-207, FR-020'] + list(seam) + ['export const %s: {' % name]
    for row_id, _value in got:
        out.append("  readonly '%s': string" % row_id)
    out.append('} = {')
    for row_id, value in got:
        out.append("  '%s': '%s'," % (row_id, value))
    out.append('}')
    return '\n'.join(out)


DEFAULTS_NOTE = [
    'export const SETTINGS_DEFAULTS: Readonly<Record<string, unknown>> = {',
]


BOUNDS_NOTE = [
    '// TRAP: the tokens are in postfix order.',
    'export type SettingsBoundToken =',
    '  | { readonly key: string }',
    '  | { readonly num: number }',
    "  | { readonly op: '+' | '-' | '*' | '/' }",
    '',
    'export interface SettingsBound {',
    '  readonly min?: number',
    '  readonly max?: number',
    '  readonly exclusiveMin?: number',
    '  readonly exclusiveMax?: number',
    '  readonly minExpression?: readonly SettingsBoundToken[]',
    '  readonly maxExpression?: readonly SettingsBoundToken[]',
    '}',
    '',
    '// see IV-16',
    'export const SETTINGS_BOUNDS: Readonly<Record<string, SettingsBound>> = {',
]


DERIVED_NOTE = [
    '// see FR-039',
    '// TRAP: SETTINGS_DEFAULTS holds these keys worked out at the defaults only;',
    '// once a key they read is edited, work them out again from this rule.',
    '// TRAP: the value is from * times + plus + plusFrom * plusTimes, and',
    '// plusFrom is null when the rule names no second key.',
    '// TRAP: a rule with index instead of from is index[by] * times.',
    'export const SETTINGS_DERIVED = {',
]


def derived_rules(manuscript):
    """Print each derived default as the rule the manuscript states.

    ⭐ Every field is written out, defaults included, so a reader of the
    generated file never has to know which ones may be left off.

    ⭐ AN `index` RULE IS PRINTED TOO, AND CR-418 IS WHY. Until S-3 carried
    `times: 1.5` the rule was the bare step -- `fontScaleSizes[fontScale]` --
    and the use-case that rewrites the ruler font on a font-size change
    (FR-039: 「目盛の文字と目盛の帯の高さがこれに追随し、その保存値が書き換わる」)
    could index the table itself. ⛔ With the factor in the manuscript, that
    use-case would have to type 1.5 a second time, which rule 03 forbids; the
    rule is printed here instead and the use-case reads it, the way it already
    reads S-2's.
    """
    out = []
    for key in sorted(manuscript):
        cell = manuscript[key]['default']
        if isinstance(cell, dict) and 'index' in cell:
            table, by = cell['index']
            out.append("  '%s': { index: '%s', by: '%s', times: %s },"
                       % (key, table, by, cell.get('times', 1)))
            continue
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

    head = '// see DR-3, FR-063'
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
        rows.append('  // TRAP: IV-16 cannot judge these bounds on a document alone; each')
        rows.append('  // names a key this group does not hold:')
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
        defaults.append('  // TRAP: no default is generated for these keys, since settings.json')
        defaults.append('  // states none as a machine value; reading one gives undefined:')
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


# Each target names EVERY manuscript it is built from. ⚠️ A back-pointer that
# is incomplete -- naming only erd.json for a unit whose defaults come from
# settings.json -- sends the next reader to the wrong file, which is the same
# failure as having none.
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
    # ⭐⭐ AND S-180 BESIDE IT, BECAUSE THE DRAWN MARK IS READ TWICE. Table
    # T-023d's closing rule (MUST) sends 「描かれたダミー
    # の印の画素」 to GR-17, so the hit test has to know the rectangle the mark
    # was drawn in. DM-3 of table T-240 (CR-421) states its width as the
    # marker's diameter times S-247, at most S-180, which only a unit holding
    # the placed label font can solve. ⇒ This unit solves it once, onto
    # `DummyGeometry.ink`, and the renderer and the hit test both read that one
    # rectangle (`schedule-layout.ts` counts the same width into its reach, and
    # may not import this unit, which imports it). ⛔ Solving it in the renderer and
    # again in the hit test is the copied-value defect rule 03 section 1 names.
    # S-178 STANDS HERE AS WELL AS IN `svg-renderer.ts`, for the same reason
    # (CR-399). Table T-023d's closing rule (MUST) has GR-13 take only the
    # drawn line on a drawn plan or actual shape, and DS-7 of table T-252 puts
    # that width at S-18 times the drawing ratio, times S-178 when the line is
    # selected. Only this unit holds both the drawn settings and the selection
    # the hit test cannot be handed (PI-7 keeps its arguments), so it solves
    # the width and the head onto `DependencyGeometry` for the hit test. The
    # constant rides whole, as the one NOT_STORED_SELECTION_SIZES the row
    # already stands in. WARNING: `svg-renderer.ts` still widens and heads the
    # line it draws from the same rows by itself; the TRAP lines in
    # `schedule-geometry.ts` name that pairing until the renderer reads these.
    (os.path.join(LAYOUT, 'schedule-geometry', 'schedule-geometry.ts'),
     lambda _erd: not_stored_block('NOT_STORED_DUMMY_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_SELECTION_SIZES'),
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
    # ⭐⭐ NOT_STORED_SIZES (the grab margins S-90 .. S-92) STANDS HERE AS WELL AS
    # IN `item-hit-area.ts`, on the bargain the note above states: table T-038's
    # closing rule (MUST) counts
    # 「掴みシロを持つものについてはその掴みシロの幅」, and
    # this is the unit that measures that order -- but `item-hit-area.ts`
    # imports ScheduleGeometry, which imports this file, so reading the constant
    # from there would be the cycle LR-3 forbids. ⇒ The number is generated
    # twice from the one manuscript, which is what `NOT_STORED_SCROLLBAR_SIZES`
    # already does.
    # ⭐ S-180 STANDS HERE AS WELL AS IN `schedule-geometry.ts` AND THE RENDERER,
    # on the same bargain the entry above states: it is one manuscript row
    # printed into each unit that consumes it, not a duplicated value. This unit
    # needs it because table T-038's order counts 「掴みシロの幅」 and the closing
    # rule of table T-023d made that width the ink's -- DM-3 of table T-240
    # (CR-421) puts it at the marker's diameter times S-247, at most S-180 -- so
    # `dummyReachOf` can no longer read a fixed 30. `schedule-geometry.ts` solves
    # the same width from its own copy; a TRAP line there names this pairing.
    # ⛔ IT MAY NOT REACH ScheduleGeometry FOR IT: that unit imports this one, and
    # LR-3 forbids the cycle.
    # S-196 is generated here and ONLY here (CR-380 decision 7, table T-064
    # row PI-5): table T-038's OC-10 counts the lifted label in the band, and
    # this is the unit that settles a band. `schedule-geometry.ts` places the
    # label with the same gap and reads it from this unit's public entry -- it
    # imports this file already, so the edge runs the way LR-3 allows. A second
    # printing there is the copy PI-5's MUST NOT forbids.
    # ⭐ THE DRAWING RATIO STANDS AT THE BOTTOM OF THE LAYOUT ENGINE, and the
    # reason is the import graph rather than the subject. Every side that draws
    # has to multiply table T-252's rows by it -- the regions, the layout, the
    # geometry, the row title panel, the picture and the export -- and
    # `screen-regions.ts` is the one unit of the engine they can all reach:
    # it imports `document-settings.ts` alone, while `schedule-layout.ts`
    # imports IT. ⛔ Putting the row in `schedule-layout.ts` would leave
    # `regionsFromScreen` unable to scale S-79 and S-2 without the cycle LR-3
    # forbids.
    # ⭐ THE ENTRANCE'S THREE ROWS AND THE CHROME'S SCALE STAND HERE TOO, for
    # FR-039's floor under the drawn Row Title Panel: the floor is composed
    # where the drawn settings are made, so nothing downstream has to know it.
    (os.path.join(LAYOUT, 'screen-regions', 'screen-regions.ts'),
     lambda _erd: not_stored_block('NOT_STORED_DISPLAY_SCALE_BASE') + NEWLINE * 2
     + not_stored_block('NOT_STORED_ENTRANCE_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_CHROME_SCALE'),
     ['docs/spec/_source/settings.json (table T-206)']),
    # NOT_STORED_ROW_CONTROL_OUTER_SIZES used to lead this entry. CR-397 moved
    # the row-control floor to `screen-regions.ts`, which composes it from
    # NOT_STORED_ENTRANCE_SIZES and S-235, and left the sum with no reader
    # anywhere -- not even in this file. JDG-139 prints a constant nobody
    # outside its file reads as a plain `const`, and a plain `const` nobody
    # reads at all is refused by noUnusedLocals, so it is no longer generated.
    (os.path.join(LAYOUT, 'schedule-layout', 'schedule-layout.ts'),
     lambda _erd: not_stored_block('NOT_STORED_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_DUMMY_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_LABEL_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_FIT_MARGIN'),
     ['docs/spec/_source/settings.json (table T-206)']),
    # ⭐ S-205 STANDS HERE AS WELL AS IN `frame-loop.ts`, and the entry for
    # NOT_STORED_SCROLLBAR_SIZES above says why: GR-21 of table T-023d floors
    # the GRIP'S LENGTH at the row the shell floors the LANE'S THICKNESS with,
    # and this Adapter unit may not import that Framework file to reach it.
    # ⛔ NOT FOLDED INTO NOT_STORED_PANEL_DIVIDER_SIZES, though both land in this
    # file: one constant per consuming SUBJECT, and the subject differs -- S-134
    # is the band FR-052's drag grabs at a panel boundary, S-205 is the least a
    # scrollbar is drawn at. One shared constant would name neither.
    (os.path.join(ADAPTER, 'screen-renderer', 'screen-frame.ts'),
     lambda _erd: not_stored_block('NOT_STORED_PANEL_DIVIDER_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_SCROLLBAR_SIZES'),
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
     + not_stored_block('NOT_STORED_ROW_GRAB_ROOM_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_CHROME_SCALE'),
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
     + not_stored_block('NOT_STORED_ROW_GRAB_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_VISIBLE_DAY_FLOOR') + NEWLINE * 2
     + not_stored_block('NOT_STORED_ROW_BAND_CEILING_SEARCH') + NEWLINE * 2
     + not_stored_block('NOT_STORED_PROPERTIES_PANEL_FLOOR'),
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
    # ⛔ NO RIM THICKNESS HERE (S-185 is retired): FR-029 and table T-237 draw
    # the armed entrance as a FILL, not a RIM, whose two colours are rows of
    # table T-236 and reach this unit through `SCREEN_COLOURS`. A thickness
    # has no reader.
    # ⭐ S-214 AND S-215 COME BESIDE THE COLOURS AND NOT AMONG THEM. Table T-236
    # states WHICH colour a state's ground takes and table T-206 states HOW
    # FAINT it is laid, so the two halves arrive on the two roads their own
    # tables put them on -- ⛔ a percentage written into a colour row, or a
    # colour written into a settings row, would be one decision in two places.
    # ⭐⭐ S-225 AND S-226 ARE HANDED TO TWO FILES ON PURPOSE, and that is the
    # whole of EP-1 of table T-076 (MUST): 「字の大きさと左の余白は、画面と書き
    # 出しが同じ 1 つの行を読むこと」. `image-exporter.ts` reads the same pair a
    # few entries below; ⛔ this is NOT a duplicated decision -- the decision is
    # the ROW, and two readers of one row is what the requirement asks for,
    # while a second value would be what it forbids (DFC-276).
    (os.path.join(FRAMEWORK, 'dom-screen-surface', 'dom-screen-surface.ts'),
     lambda _erd: not_stored_block('NOT_STORED_ICON_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_ROW_GRAB_STRIP_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_ROW_BAND_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_ROW_CONTROL_EDGE_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_STATE_GROUND_PERCENTS') + NEWLINE * 2
     + not_stored_block('NOT_STORED_HELP_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_RESOURCE_ROSTER_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_PALETTE_GROUP_RULE_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_PROPERTY_FIELD_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_CONFIRMATION_RULE_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_DOCUMENT_TITLE_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_CHROME_SCALE') + NEWLINE * 2
     # ⭐ CR-419: the typeface list, set once on the surface's root so every
     # DOM surface under it inherits one list (FR-039 MUST NOT: no per-surface
     # list). See the entry in NOT_STORED_TARGETS.
     + not_stored_block('NOT_STORED_TYPEFACES') + NEWLINE * 2
     + colour_block('SCREEN_COLOURS'),
     ['docs/spec/_source/settings.json (tables T-206 and T-236)']),
    # ⭐ The selection frame's own two lengths land beside the colours, in the
    # one unit that draws the picture SL-8 puts the frame on.
    # ⭐ The dummy's drawn width joins them, in its own constant: FR-043's three
    # grab handles are drawn by this unit and by no other, and S-180 is the only
    # row that gives U-52 a drawn dimension (S-129 and S-130 are durations,
    # and S-131 is the faintness).
    # ⚠️ S-180 LANDS IN `schedule-geometry.ts` AS WELL, for the reason that
    # entry states: table T-023d's closing rule made the drawn rectangle a fact
    # the hit test needs, so the geometry solves it once and this unit reads the
    # answer off `DummyGeometry.ink` instead of the row.
    # ⭐ The Dual Cursor's own line width joins them, in a constant of its own
    # for the reason the entry in NOT_STORED_TARGETS gives: CU-2's two lines
    # are drawn by this unit and by no other, and S-194 is the only row that
    # gives them a width -- S-178 is the multiplier DC-8 borrows from SL-8 and
    # stands with the selection's rows, where SL-8 put it.
    (os.path.join(ADAPTER, 'svg-renderer', 'svg-renderer.ts'),
     lambda _erd: not_stored_block('NOT_STORED_SELECTION_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_DEPENDENCY_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_DUMMY_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_DUAL_CURSOR_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_DELAY_MARK_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_RULER_WEEKDAY_SIZES') + NEWLINE * 2
     # ⭐ CR-419: every <text> this unit writes carries S-246's list, and the
     # shape's name label alone carries S-245's weight -- see both entries in
     # NOT_STORED_TARGETS.
     + not_stored_block('NOT_STORED_TYPEFACES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_NAME_LABEL_WEIGHT') + NEWLINE * 2
     + colour_block('SCHEDULE_COLOURS') + NEWLINE * 2
     # ⭐ CR-548: the palette colours' drawn values, beside the theme's own.
     + palette_block()
     # ⭐ FR-020's four, in the unit that lays the mark over the Row Area. The
     # ink rides in SCHEDULE_COLOURS above, because it is a row of table T-236
     # and has a light and a dark rendering; the angle, the size, the spacing
     # and the opacity have one value each and are rows of table T-207.
     # ⛔ Not in the shell beside WATERMARK_UNLOCK_DIGEST -- that one is
     # compared against an answer the shell hashes, and these are drawn.
     + NEWLINE * 2 + watermark_block('WATERMARK_MARKS'),
     ['docs/spec/_source/settings.json (tables T-206, T-207, T-236 and T-294)']),
    # ⭐ DFC-276: the two numbers EP-1 writes the `Document Title` with, in the
    # one unit that assembles a picture that goes out. ⛔ Do not derive them
    # here as fractions of the band's own height (PND-52): EP-1 (MUST NOT)
    # forbids an export a constant of its own, because a second value lets
    # the title on the screen and the title in the picture stand apart.
    (os.path.join(ADAPTER, 'image-exporter', 'image-exporter.ts'),
     lambda _erd: not_stored_block('NOT_STORED_DOCUMENT_TITLE_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_CHROME_SCALE') + NEWLINE * 2
     # ⭐ CR-419: the title and row names this unit draws AROUND the chart's
     # SVG are texts of the exported picture too (FR-039 MUST), and the chart's
     # own texts already carry the list inside that SVG.
     + not_stored_block('NOT_STORED_TYPEFACES'),
     ['docs/spec/_source/settings.json (table T-206)']),
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
     + not_stored_block('NOT_STORED_PROPERTIES_PANEL_FLOOR') + NEWLINE * 2
     + not_stored_block('NOT_STORED_REPEAT_TIMES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_SCALE_MESSAGE_TIMES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_SCROLLBAR_SIZES') + NEWLINE * 2
     + not_stored_block('NOT_STORED_INTERACTION_RECORD_LIMITS') + NEWLINE * 2
     + not_stored_block('NOT_STORED_END_POINTER_SIZES') + NEWLINE * 2
     # ⭐ FR-020's other half, in the one unit that can reach the store S-99a
     # names. ⛔ Not folded into the digest below -- that one is a row of table
     # T-207 baked into the artifact, and this is a row of table T-206 the
     # environment may hold a different value for.
     + not_stored_block('NOT_STORED_WATERMARK_NAME') + NEWLINE * 2
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
    # ⭐ DFC-314: the one call site FR-019 gives a fixed radius, reading table
    # T-217's own default rather than a copy typed at the use-case that
    # creates a `HighlightBox`.
    (os.path.join(USECASE, 'edit-document', 'edit-annotation.ts'),
     lambda _erd: annotation_defaults_block(),
     ['docs/spec/_source/settings.json (table T-217)']),
]


# ---- JDG-139: which generated constants leave their file ------------------
#
# The user's ruling of 2026-09-16: a generated constant is EXPORTED ONLY WHEN
# ANOTHER FILE READS IT. Every other constant is printed as a plain `const`,
# because an `export` nobody imports is a public name with no consumer -- it
# widens the face of the unit and says "something outside depends on this"
# when nothing does.
#
# The decision is made per COPY, a (file, constant) pair, and not per name:
# one row of table T-206 is printed into every unit that consumes it (see
# NOT_STORED_SIZES above), and each copy has its own readers. Judged by name,
# a copy nobody imports stays exported because another copy of the same name
# is imported somewhere else.
#
# The list is written out rather than worked out from the imports at
# generation time, for two reasons:
#   - publishing a name is a decision about the unit's public face, so it is
#     made in a reviewed line, not granted to whoever adds an import;
#   - this generator stays a function of the manuscripts and of this file --
#     its output does not change because a test gained or lost an import.
# The list cannot rot silently: this generator refuses an entry that names no
# constant it prints into that file, and check 30
# (.claude/skills/spec-graph-check/check-generated-constants.py) refuses an
# exported copy that no other file imports, a copy another file reads that is
# not exported (tsc sees a named import of it, but not a namespace read by a
# string key), and an entry sitting in the wrong one of the two groups below.
#
# Three stages, in the order the user ruled:
#   1. (done) take `export` off every copy no file of src/ or tests/ reads;
#   2. rewrite the tests that read the READ_BY_TESTS_ONLY copies so that they
#      take the expected value from the settings table instead;
#   3. empty READ_BY_TESTS_ONLY, and narrow check 30 to readers in src/.
# Paths are relative to the repository root, with forward slashes.

# Copies at least one OTHER file of src/ imports.
PUBLISHED_READ_BY_SRC = {
    'src/adapter/input-command-translator/input-command-translator.ts': (
        'NOT_STORED_PROPERTIES_PANEL_FLOOR',
        'NOT_STORED_ROW_BAND_CEILING_SEARCH',
        'NOT_STORED_ROW_GRAB_SIZES',
        'NOT_STORED_VISIBLE_DAY_FLOOR',
        'NOT_STORED_ZOOM_STEP',
    ),
    'src/adapter/svg-renderer/svg-renderer.ts': (
        'NOT_STORED_DELAY_MARK_SIZES',
        'NOT_STORED_DEPENDENCY_SIZES',
        'NOT_STORED_DUAL_CURSOR_SIZES',
        'NOT_STORED_NAME_LABEL_WEIGHT',
        'NOT_STORED_RULER_WEEKDAY_SIZES',
        'WATERMARK_MARKS',
    ),
    'src/entity/document-model/document-settings/document-settings.ts': (
        'SETTINGS_BOUNDS',
        'SETTINGS_DEFAULTS',
        'SETTINGS_DERIVED',
    ),
    'src/entity/document-model/edit-history/edit-history.ts': (
        'NOT_STORED_LIMITS',
    ),
    'src/entity/document-model/schedule/schedule.ts': (
        'COLUMN_DEFAULTS',
        'COLUMN_SHAPES',
        'DATE_COLUMNS',
        'DEFAULT_CALENDAR_VALUES',
    ),
    'src/entity/layout-engine/schedule-layout/schedule-layout.ts': (
        'NOT_STORED_LABEL_SIZES',
    ),
    'src/framework/dom-screen-surface/dom-screen-surface.ts': (
        'NOT_STORED_CONFIRMATION_RULE_SIZES',
        'NOT_STORED_DOCUMENT_TITLE_SIZES',
        'NOT_STORED_HELP_SIZES',
        'NOT_STORED_ICON_SIZES',
        'NOT_STORED_PALETTE_GROUP_RULE_SIZES',
        'NOT_STORED_PROPERTY_FIELD_SIZES',
        'NOT_STORED_RESOURCE_ROSTER_SIZES',
        'NOT_STORED_ROW_BAND_SIZES',
        'NOT_STORED_ROW_CONTROL_EDGE_SIZES',
        'NOT_STORED_ROW_GRAB_STRIP_SIZES',
        'SCREEN_COLOURS',
    ),
    'src/framework/single-html-shell/frame-loop.ts': (
        'NOT_STORED_SCROLLBAR_SIZES',
    ),
    'src/use-case/edit-document/edit-document.ts': (
        'NOT_STORED_ZOOM_BOUNDS',
    ),
}

# Copies only tests/ reads. Stage 3 of JDG-139 empties this group.
PUBLISHED_READ_BY_TESTS_ONLY = {
    'src/adapter/image-exporter/image-exporter.ts': (
        'NOT_STORED_DOCUMENT_TITLE_SIZES',
    ),
    'src/adapter/screen-renderer/command-palette.ts': (
        'NOT_STORED_COMMAND_PALETTE_SIZES',
    ),
    'src/adapter/screen-renderer/properties-panel.ts': (
        'NOT_STORED_PROPERTY_CONTROL_SIZES',
    ),
    'src/adapter/screen-renderer/row-title-panel.ts': (
        'NOT_STORED_ROW_CONTROL_SIZES',
    ),
    'src/adapter/screen-renderer/screen-frame.ts': (
        'NOT_STORED_PANEL_DIVIDER_SIZES',
    ),
    'src/adapter/svg-renderer/svg-renderer.ts': (
        'NOT_STORED_DUMMY_SIZES',
        'NOT_STORED_SELECTION_SIZES',
        'SCHEDULE_COLOURS',
    ),
    # JDG-151: frame-loop.ts calls grabSizesOf() and no longer reads this copy.
    'src/entity/layout-engine/item-hit-area/item-hit-area.ts': (
        'NOT_STORED_SIZES',
    ),
    'src/entity/layout-engine/schedule-geometry/schedule-geometry.ts': (
        'NOT_STORED_DUMMY_SIZES',
    ),
    'src/entity/layout-engine/schedule-layout/schedule-layout.ts': (
        'NOT_STORED_DUMMY_SIZES',
        'NOT_STORED_SIZES',
    ),
    'src/framework/single-html-shell/frame-loop.ts': (
        'NOT_STORED_PROPERTIES_PANEL_SIZES',
        'WATERMARK_UNLOCK_DIGEST',
    ),
}

EXPORTED_CONST = re.compile(r'^export const ([A-Za-z_][A-Za-z0-9_]*)', re.M)


def published_in(rel):
    """The constants the file at `rel` exports, from both groups above."""
    return (set(PUBLISHED_READ_BY_SRC.get(rel, ()))
            | set(PUBLISHED_READ_BY_TESTS_ONLY.get(rel, ())))


def publish_only_listed(rel, body):
    """Take `export` off every generated constant the lists do not publish.

    The block builders all print `export const`; this is the one place that
    decides which of those keep the keyword, so no builder needs to know.
    """
    published = published_in(rel)
    printed = set(EXPORTED_CONST.findall(body))
    unknown = sorted(published - printed)
    if unknown:
        raise SystemExit(
            'generate_entity_types: the JDG-139 list publishes %s from %s, and '
            'this generator prints no such constant into that file. Take the '
            'entry out of PUBLISHED_READ_BY_SRC / PUBLISHED_READ_BY_TESTS_ONLY.'
            % (', '.join(unknown), rel))
    return EXPORTED_CONST.sub(
        lambda found: found.group(0) if found.group(1) in published
        else 'const %s' % found.group(1),
        body)


def refuse_unknown_published_files(written):
    """Stop when a list entry names a file this generator does not write."""
    listed = set(PUBLISHED_READ_BY_SRC) | set(PUBLISHED_READ_BY_TESTS_ONLY)
    stray = sorted(listed - set(written))
    if stray:
        raise SystemExit(
            'generate_entity_types: the JDG-139 list names %s, which is not a '
            'target of this generator.' % ', '.join(stray))


def provenance(sources):
    """The lines that lead a reader from this artifact back to its manuscript."""
    out = ['// Single source of truth:']
    out.extend('//   %s' % s for s in sources)
    out.append('// Rebuild: npm run gen   ||   npm run gen:check fails on drift.')
    return '\n'.join(out) + '\n'


def refuse_non_ascii_comments(rel, body):
    """Stop when a comment line of a region carries a character outside ASCII.

    src/ comments are ASCII only (docs/review/comment-rules-src.md, section 1).
    A generated region is where a manuscript's own words would otherwise reach
    src/ unseen, so this is checked on every run, --check included.
    tools/generate_json_schema_validator.py holds the same guard.
    """
    for number, line in enumerate(body.split('\n'), 1):
        if not line.lstrip().startswith(('//', '/*', '*')):
            continue
        bad = sorted(set(ch for ch in line if ord(ch) > 0x7E))
        if bad:
            raise SystemExit(
                'generate_entity_types: line %d of the region for %s is a '
                'comment carrying %s, and src/ comments are ASCII only:\n  %s'
                % (number, rel, ', '.join('U+%04X' % ord(ch) for ch in bad),
                   ascii(line)))


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
    refuse_unknown_published_files(
        os.path.relpath(path, ROOT).replace('\\', '/') for path, _b, _s in TARGETS)

    for path, build, sources in TARGETS:
        if not os.path.exists(path):
            say('MISSING  %s -- run tools/generate_unit_tree.py first'
                % os.path.relpath(path, ROOT).replace('\\', '/'))
            return 1
        current = io.open(path, encoding='utf-8', newline='').read()
        # The manuscript's path rides in the body, not in the marker: the body
        # is rewritten every run, so moving the manuscript can never make the
        # region undiscoverable (see the note on OPEN).
        rel = os.path.relpath(path, ROOT).replace('\\', '/')
        body = publish_only_listed(rel, provenance(sources) + build(erd))
        refuse_non_ascii_comments(rel, body)
        wanted = region(current, body)
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
