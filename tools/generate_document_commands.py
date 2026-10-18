# -*- coding: utf-8 -*-
"""Print the document commands' types into src/ from their manuscript.

    python tools/generate_document_commands.py
    python tools/generate_document_commands.py --check

READS   docs/spec/_source/document-commands.json (table T-108, the commands
        applyDocumentChange takes and the values each one carries -- CR-766,
        JDG-2162), through docs/spec/_source/document_commands_json_to_md.py,
        which refuses an invalid manuscript first; the column a value points at
        is read from erd.json / settings.json there, and its JSON shape from
        docs/spec/_source/grs-document.schema.json here.
WRITES  one region per unit, the one that opens
        `// <generated -- do not edit by hand>` followed by the line naming
        document-commands.json, up to its `// </generated>`:

          src/use-case/edit-document/edit-task.ts            TaskCommand
          src/use-case/edit-document/edit-task-group.ts      TaskGroupCommand
          src/use-case/edit-document/edit-dependency.ts      DependencyCommand
          src/use-case/edit-document/edit-annotation.ts      AnnotationCommand
          src/use-case/edit-document/edit-resource.ts        ResourceCommand
          src/use-case/edit-document/edit-calendar.ts        CalendarCommand
          src/use-case/edit-document/edit-project.ts         ProjectCommand
          src/use-case/edit-document/whole-schedule-shift.ts WholeScheduleShiftCommand
          src/use-case/edit-document/edit-document-settings.ts DocumentSettingsCommand
          src/use-case/edit-document/edit-document.ts        UnimplementedDocumentCommand,
                                                             DocumentCommand and
                                                             COMMAND_KINDS_BY_UNION
          src/entity/layout-engine/schedule-layout/name-label.ts
                                                             LengthLetter, the values of
                                                             TypedLag.lagUnit: the letters
                                                             a length is spelled in (TX-10)
          src/adapter/screen-renderer/properties-panel.ts    LENGTH_LETTERS, the same values
          src/adapter/document-codec/grs-json-schema.ts      SHAPE_OF_COMMAND_KIND, the shape of each
                                                             command as the walker there reads
                                                             it (DFC-2856)

        and, through tools/generate_mcp_tool_descriptions.py, which calls
        with_command_shapes() below, the input shape of the AM-7 MCP tool: the
        stamp, and each command as an object whose `kind` is one of the
        confirmed names of table T-108 (no oneOf -- AG-12 (8)).
WRITES  docs/spec/_source/grs-commands.schema.json whole: the JSON Schema of
        the commands, one oneOf branch per command of table T-108 with its kind,
        keys, types and description -- the second MCP resource of the relay
        (AG-12 (8), design-mcp-relay.md 3.1). Generated -- do not edit it by
        hand; rebuild with `npm run gen` (`npm run gen:check` fails on drift).

⭐ A VALUE THAT WRITES A COLUMN IS TYPED BY THAT COLUMN (CR-766 X-d). Its type
is the entity's own field (`Task['fadeInDays']`, `DocumentSettings['zoomX']`),
narrowed by `null` / `list` as the manuscript says; only a value that is no
column carries a type of its own. So tsc, not a copy, keeps the two equal.

⭐ A SET THE CODE WALKS IS PRINTED, NEVER RETYPED (check 69). The router reads
COMMAND_KINDS_BY_UNION; a shape whose every field is optional (a command
writes only the fields it carries) gets `<SHAPE>_FIELD_NAMES`; and the letters
of TypedLag.lagUnit are printed into each unit that uses them -- the length
speller of ScheduleLayout and the Properties Panel of ScreenRenderer -- since
neither may import EditDocument (no declared edge).

⭐ A SHAPE IS DECLARED HERE TOO. The shapes a command carries (PasteLanding,
TableView ...) are declared in the region of the first unit that uses one. A
shape marked `inline` is declared nowhere and printed where it is used. A shape
marked `elsewhere` is declared by hand by another component (RememberedActual,
of ScreenState); the region holds its field names against the manuscript at
compile time (SHAPE_FIELDS_MATCH).

⚠️ A TYPE NAME IS NOT IMPORTED HERE. The regions use the names the manuscript
and erd.json give; each unit imports them by hand outside its region, so tsc
refuses a name nobody brings in.

Run with PYTHONIOENCODING=utf-8.
"""
import collections
import copy
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SPEC_SOURCE = os.path.join(ROOT, 'docs', 'spec', '_source')
sys.path.insert(0, SPEC_SOURCE)
import document_commands_json_to_md as manuscript  # noqa: E402
# CR-796: the English an MCP client reads, checked the one way (design-mcp-relay.md 3.1).
from generate_agent_api import english  # noqa: E402

REL_SOURCE = 'docs/spec/_source/document-commands.json'
REL_SELF = 'tools/generate_document_commands.py'
REL_DOCUMENT_SCHEMA = 'docs/spec/_source/grs-document.schema.json'
UNIT_DIR = 'src/use-case/edit-document/'

OPEN = '// <generated -- do not edit by hand>'
CLOSE = '// </generated>'
HEADER_PREFIX = '// From %s (' % REL_SOURCE
HEADER = HEADER_PREFIX + '%s).'

# Each union and the unit that declares it, in the order DocumentCommand joins them.
UNITS = [
    ('TaskCommand', 'edit-task.ts'),
    ('TaskGroupCommand', 'edit-task-group.ts'),
    ('DependencyCommand', 'edit-dependency.ts'),
    ('AnnotationCommand', 'edit-annotation.ts'),
    ('ResourceCommand', 'edit-resource.ts'),
    ('CalendarCommand', 'edit-calendar.ts'),
    ('ProjectCommand', 'edit-project.ts'),
    ('WholeScheduleShiftCommand', 'whole-schedule-shift.ts'),
    ('DocumentSettingsCommand', 'edit-document-settings.ts'),
]
UNIMPLEMENTED = manuscript.UNIMPLEMENTED
ROUTER_UNIT = 'edit-document.ts'
# The router's const of the command names of each union.
KINDS_NAME = 'COMMAND_KINDS_BY_UNION'
# The enum whose values are the letters of a length (TX-10), and the units that
# use them: the speller as a type, the Properties Panel as an array it walks.
LENGTH_LETTER_FIELD = ('TypedLag', 'lagUnit')
LENGTH_LETTER_UNITS = [
    ('src/entity/layout-engine/schedule-layout/name-label.ts', 'type'),
    ('src/adapter/screen-renderer/properties-panel.ts', 'const'),
]
SETTINGS_TYPE = 'DocumentSettings'
TS_OF_WORD = {'string': 'string', 'integer': 'number', 'number': 'number', 'boolean': 'boolean'}
JSON_OF_WORD = {'string': 'string', 'integer': 'integer', 'number': 'number', 'boolean': 'boolean'}
# A union alternative longer than this is printed one field per line.
LINE_WIDTH = 110
# The AM-7 argument type whose MCP input shape this generator prints.
WRITE_REQUEST_TYPE = 'AgentWriteRequest'
COMMAND_LIST_TYPE = 'readonly DocumentCommand[]'
STAMP_TYPE = 'DocumentStamp'
DROPPED_SCHEMA_KEYS = ('description', 'default', '$comment')
# The second MCP resource of the relay (AG-12 (8), design-mcp-relay.md 3.1).
REL_COMMANDS_SCHEMA = 'docs/spec/_source/grs-commands.schema.json'
COMMANDS_SCHEMA_ID = 'https://goodrelax.github.io/gr-scheduler/spec/_source/grs-commands.schema.json'
JSON_SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema'
COMMANDS_SCHEMA_TITLE = 'GRS document commands'
COMMANDS_SCHEMA_COMMENT = (
    'Generated from docs/spec/_source/document-commands.json (table T-108, the commands applyCommands '
    'takes), the column shapes from docs/spec/_source/grs-document.schema.json. Never edit by hand. '
    'Rebuild: npm run gen -- npm run gen:check fails on drift. The generator is '
    'tools/generate_document_commands.py. One definition per command under $defs, keyed by its kind, and '
    'a oneOf naming them in the order of the table; a command with a choice of shapes holds a oneOf of its own.')
COMMANDS_SCHEMA_DESCRIPTION = (
    'One command of the batch applyCommands takes: kind names the command, the other keys are '
    'the values it carries. A value that writes a column of the document has the shape of that column '
    'in grs-document.schema.json.')
# CR-796: the head of the kind description; one line per command follows, from its English.
KIND_DESCRIPTION = (
    'The command. The keys and types of each command are in the resource grs-commands.schema.json. '
    'What each command does:')


def path_of(rel):
    return os.path.join(ROOT, *rel.split('/'))


def say(message):
    """The cp932 guard every generator in this tree carries.

    @purity non-pure
    """
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def stop(message):
    """@purity non-pure"""
    say('%s: %s' % (REL_SELF, message))
    sys.exit(1)


def load():
    """(doc, columns) of the manuscript, or stop when the printer refuses it.

    @purity semi-pure-b
    """
    doc, columns = manuscript.load_valid()
    if doc is None:
        for one in columns:
            say('  %s' % one)
        stop('%s is not valid; run docs/spec/_source/document_commands_json_to_md.py' % REL_SOURCE)
    return doc, columns


# ---------------------------------------------------------------- TypeScript

def column_type(row_id, columns):
    """The code's own type of the column an AT- or S- row names.

    @purity pure
    """
    if row_id in columns.at:
        entity, name, _json = columns.at[row_id]
        return "%s['%s']" % (entity, name)
    key = columns.s[row_id]
    if '.' in key:
        stop('%s names the nested key %s; give the value a type' % (row_id, key))
    return "%s['%s']" % (SETTINGS_TYPE, key)


def literal(text):
    """@purity pure"""
    return "'%s'" % text


def joined(parts):
    """@purity pure"""
    return ' | '.join(parts)


def own_type(value, doc, columns):
    """The type of a value that writes `type`, before list and null.

    @purity pure
    """
    kind = value['type']
    if kind in TS_OF_WORD:
        return TS_OF_WORD[kind]
    if kind == 'enum':
        if 'valuesOf' in value:
            return joined(literal(columns.s[one]) for one in value['valuesOf'])
        return joined(literal(one) for one in value['values'])
    if kind == 'map':
        return 'Readonly<Record<%s, %s>>' % (TS_OF_WORD[value['keyType']],
                                            TS_OF_WORD[value['valueType']])
    shape = manuscript.shapes_by_name(doc).get(kind)
    if shape is not None and shape.get('inline'):
        return inline_object(shape['fields'], doc, columns)
    return kind


def value_type(value, doc, columns):
    """The TypeScript type of one value, narrowed as the manuscript says.

    @purity pure
    """
    if 'type' in value:
        base = own_type(value, doc, columns)
        nullable_column = False
    else:
        base = column_type(manuscript.pointers(value)[0], columns)
        nullable_column = True
    if value.get('null') is False and nullable_column:
        base = 'NonNullable<%s>' % base
    if value.get('list'):
        base = 'readonly %s[]' % (('(%s)' % base) if ' | ' in base else base)
    if value.get('null') is True:
        base = '%s | null' % base
    return base


def field_text(value, doc, columns):
    """@purity pure"""
    return 'readonly %s%s: %s' % (value['name'], '?' if value.get('optional') else '',
                                  value_type(value, doc, columns))


def inline_object(fields, doc, columns):
    """@purity pure"""
    return '{ %s }' % '; '.join(field_text(one, doc, columns) for one in fields)


def alternative_lines(row, doc, columns):
    """One command as an alternative of its union.

    @purity pure
    """
    plain = [value for value in row['values'] if 'oneOf' not in value]
    choice = [value for value in row['values'] if 'oneOf' in value]
    fields = ["readonly kind: '%s'" % row['name']] + [field_text(one, doc, columns) for one in plain]
    tail = ' & (%s))' % joined(choice[0]['oneOf']) if choice else ''
    head = '  | (' if choice else '  | '
    shown = '%s{ %s }%s' % (head, '; '.join(fields), tail)
    if len(shown) <= LINE_WIDTH:
        return [shown]
    return [head + '{'] + ['      %s' % one for one in fields] + ['    }%s' % tail]


def union_lines(name, rows, doc, columns):
    """@purity pure"""
    out = ['// see %s' % doc['table']['id'], 'export type %s =' % name]
    for row in rows:
        out += alternative_lines(row, doc, columns)
    return out


def shapes_used_by(rows, doc):
    """The declared shapes the rows use, directly or through another shape, in first use order.

    @purity pure
    """
    shapes = manuscript.shapes_by_name(doc)
    found = []

    def visit(value):
        for name in [value.get('type')] + list(value.get('oneOf', [])):
            shape = shapes.get(name)
            if shape is None or name in found:
                continue
            found.append(name)
            for one in manuscript.fields_of(shape):
                visit(one)

    for row in rows:
        for value in row['values']:
            visit(value)
    return [shapes[name] for name in found if not shapes[name].get('inline')]


def names_of(fields):
    """@purity pure"""
    return joined(literal(one['name']) for one in fields) or 'never'


def shape_checks(shape):
    """The SameFieldNames lines that hold one declared shape.

    @purity pure
    """
    code = shape['name']
    if 'variants' not in shape:
        return ['SameFieldNames<%s, %s>' % (code, names_of(shape['fields']))]
    tag = shape['discriminant']
    checks = ["SameFieldNames<Record<%s['%s'], true>, %s>" % (
        code, tag, joined(literal(v['tag']) for v in shape['variants']))]
    for variant in shape['variants']:
        checks.append("SameFieldNames<Extract<%s, { readonly %s: '%s' }>, %s>" % (
            code, tag, variant['tag'],
            joined([literal(tag)] + [literal(one['name']) for one in variant['fields']])))
    return checks


def variant_lines(shape, variant, doc, columns):
    """One alternative of a shape with variants.

    @purity pure
    """
    tag = shape['discriminant']
    fields = ["readonly %s: '%s'" % (tag, variant['tag'])] + [
        field_text(one, doc, columns) for one in variant['fields']]
    shown = '  | { %s }' % '; '.join(fields)
    if len(shown) <= LINE_WIDTH:
        return [shown]
    return ['  | {'] + ['      %s' % one for one in fields] + ['    }']


def shape_declaration(shape, doc, columns):
    """The code's declaration of one shape the manuscript defines.

    @purity pure
    """
    out = ['// see %s' % doc['table']['id']]
    if 'variants' not in shape:
        out.append('export interface %s {' % shape['name'])
        out += ['  %s' % field_text(one, doc, columns) for one in shape['fields']]
        return out + ['}']
    out.append('export type %s =' % shape['name'])
    for variant in shape['variants']:
        out += variant_lines(shape, variant, doc, columns)
    return out


def checks_lines(shapes):
    """@purity pure"""
    if not shapes:
        return []
    checks = [one for shape in shapes for one in shape_checks(shape)]
    return [
        '',
        '// see T-108',
        '// WHY: another component declares these shapes; their field names are held against table T-108 here.',
        'type SameFieldNames<TValue, TNames extends PropertyKey> = [keyof TValue] extends [TNames]',
        '  ? ([TNames] extends [keyof TValue] ? true : false)',
        '  : false',
        'const SHAPE_FIELDS_MATCH: [',
    ] + ['  %s,' % one for one in checks] + [
        '] = [%s]' % ', '.join('true' for _ in checks),
        'void SHAPE_FIELDS_MATCH',
    ]


def rows_of(doc, union):
    """@purity pure"""
    return [row for row in doc['rows'] if row['union'] == union]


def upper_snake(name):
    """`TaskGroupCommand` -> `TASK_GROUP_COMMAND`.

    @purity pure
    """
    return re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '_', name).upper()


def const_lines(name, items, suffix=' as const'):
    """A const array of string literals, on one line when it fits.

    @purity pure
    """
    shown = 'const %s = [%s]%s' % (name, ', '.join(literal(one) for one in items), suffix)
    if len(shown) <= LINE_WIDTH:
        return [shown]
    return ['const %s = [' % name] + ['  %s,' % literal(one) for one in items] + [']%s' % suffix]


def is_patch_shape(shape):
    """A shape every field of which is optional: a command writes only the fields it carries.

    @purity pure
    """
    return 'variants' not in shape and bool(shape['fields']) and all(
        one.get('optional') for one in shape['fields'])


def field_names_name(shape):
    """`ProjectProfileFields` -> `PROJECT_PROFILE_FIELD_NAMES`.

    @purity pure
    """
    stem = upper_snake(shape['name'])
    if stem.endswith('_FIELDS'):
        stem = stem[:-len('_FIELDS')]
    return stem + '_FIELD_NAMES'


def field_names_lines(shape, doc):
    """The field names of a patch shape, which the unit walks to write only what a command carries.

    @purity pure
    """
    return [''] + const_lines(
                field_names_name(shape), [one['name'] for one in shape['fields']],
                " as const satisfies readonly (keyof %s)[]" % shape['name'])


def kinds_lines(doc):
    """The command names of each union, which the router reads to send a command to its aggregate.

    @purity pure
    """
    out = ['',
           '// see %s' % doc['table']['id'],
           '// WHY: the router reads the commands of each union here rather than a hand copy (check 69).',
           'const %s = {' % KINDS_NAME]
    for name, _unit in UNITS:
        kinds = [row['name'] for row in rows_of(doc, name)]
        shown = '  %s: [%s],' % (name, ', '.join(literal(one) for one in kinds))
        if len(shown) <= LINE_WIDTH:
            out.append(shown)
        else:
            out += ['  %s: [' % name] + ['    %s,' % literal(one) for one in kinds] + ['  ],']
    return out + ['} as const']


def length_letters(doc):
    """The values of the enum that holds the letters of a length.

    @purity pure
    """
    shape_name, field_name = LENGTH_LETTER_FIELD
    shape = manuscript.shapes_by_name(doc).get(shape_name)
    fields = [one for one in (shape or {}).get('fields', []) if one['name'] == field_name]
    if not fields or fields[0].get('type') != 'enum' or 'values' not in fields[0]:
        stop('%s holds no enum %s.%s' % (REL_SOURCE, shape_name, field_name))
    return fields[0]['values']


def length_letter_regions(doc):
    """(unit, what, lines) of each unit that spells or reads the letters of a length.

    The speller is typed over them; the Properties Panel walks them at run time.
    Each unit gets its own copy, so no name crosses a component folder for them.

    @purity pure
    """
    letters = length_letters(doc)
    what = 'table %s, %s.%s' % (doc['table']['id'], LENGTH_LETTER_FIELD[0], LENGTH_LETTER_FIELD[1])
    see = '// see %s, TX-10' % doc['table']['id']
    out = []
    for unit, form in LENGTH_LETTER_UNITS:
        if form == 'type':
            body = 'type LengthLetter = %s' % joined(literal(one) for one in letters)
        else:
            body = 'const LENGTH_LETTERS = [%s] as const' % ', '.join(literal(one) for one in letters)
        if len(body) > LINE_WIDTH:
            stop('the letters of %s no longer fit one line' % what)
        out.append((unit, what, [see, body]))
    return out


def regions(doc, columns):
    """(unit, what, lines) for every unit, in UNITS order and then the router.

    @purity pure
    """
    known = set(name for name, _unit in UNITS) | {UNIMPLEMENTED}
    for row in doc['rows']:
        if row['union'] not in known:
            stop('%s names the union %s, which no unit of %s declares' % (row['id'], row['union'], REL_SELF))
    placed = set()
    out = []
    for name, unit in UNITS:
        rows = rows_of(doc, name)
        if not rows:
            stop('no command of %s names the union %s' % (REL_SOURCE, name))
        shapes = [one for one in shapes_used_by(rows, doc) if one['name'] not in placed]
        placed.update(one['name'] for one in shapes)
        declared = []
        for shape in shapes:
            if not shape.get('elsewhere'):
                declared += shape_declaration(shape, doc, columns)
                if is_patch_shape(shape):
                    declared += field_names_lines(shape, doc)
                declared += ['']
        held = [shape for shape in shapes if shape.get('elsewhere')]
        out.append((UNIT_DIR + unit, 'table %s, %s' % (doc['table']['id'], name),
                    declared + union_lines(name, rows, doc, columns) + checks_lines(held)))
    pending = rows_of(doc, UNIMPLEMENTED)
    router = []
    if pending:
        router += ['// see %s, %s' % (doc['table']['id'], ', '.join(row['id'] for row in pending)),
                   '// WHY: rows of table T-108 nothing implements yet; editDocument refuses them as no aggregate owns them.']
        router += union_lines(UNIMPLEMENTED, pending, doc, columns)[1:]
        router.append('')
    router += ['// see %s' % doc['table']['id'], 'export type DocumentCommand =']
    router += ['  | %s' % name for name, _unit in UNITS]
    if pending:
        router.append('  | %s' % UNIMPLEMENTED)
    router += kinds_lines(doc)
    out.append((UNIT_DIR + ROUTER_UNIT, 'table %s, DocumentCommand' % doc['table']['id'], router))
    return out + length_letter_regions(doc)


def rewritten(rel, text, what, lines):
    """The unit with its region replaced, or stop when it has none or two.

    @purity pure
    """
    pattern = re.compile(re.escape(OPEN) + r'\r?\n' + re.escape(HEADER_PREFIX)
                         + r'[^\n]*\n.*?' + re.escape(CLOSE), re.S)
    found = pattern.findall(text)
    if len(found) != 1:
        stop('%s holds %d region(s) naming %s; it must hold exactly one' % (rel, len(found), REL_SOURCE))
    newline = '\r\n' if found[0].count('\r\n') * 2 > found[0].count('\n') else '\n'
    body = newline.join([OPEN, HEADER % what] + lines + [CLOSE])
    return pattern.sub(lambda _match: body, text, count=1)


# ---------------------------------------------------------------- MCP input shape

def document_schema():
    """@purity semi-pure-b"""
    return json.load(io.open(path_of(REL_DOCUMENT_SCHEMA), encoding='utf-8'))


def cleaned(node, defs, seen=()):
    """A column's JSON schema with its references resolved and its notes dropped.

    A definition reached again inside itself is cut to a bare object.

    @purity pure
    """
    if isinstance(node, list):
        return [cleaned(one, defs, seen) for one in node]
    if not isinstance(node, dict):
        return node
    if '$ref' in node:
        name = node['$ref'].rsplit('/', 1)[-1]
        if name in seen:
            return {'type': 'object'}
        return cleaned(defs[name], defs, seen + (name,))
    return dict((key, cleaned(one, defs, seen)) for key, one in node.items()
                if key not in DROPPED_SCHEMA_KEYS and not key.startswith('x-'))


def column_schema(row_id, columns, schema):
    """@purity pure"""
    defs = schema['$defs']
    if row_id in columns.at:
        entity, name, _json = columns.at[row_id]
        node = defs[entity]['properties'][name]
    else:
        node = schema['properties']['documentSettings']['properties'][columns.s[row_id]]
    return cleaned(node, defs)


def without_null(node):
    """@purity pure"""
    node = copy.deepcopy(node)
    kind = node.get('type')
    if isinstance(kind, list) and 'null' in kind:
        kind = [one for one in kind if one != 'null']
        node['type'] = kind[0] if len(kind) == 1 else kind
    if 'enum' in node and None in node['enum']:
        node['enum'] = [one for one in node['enum'] if one is not None]
    return node


def with_null(node):
    """@purity pure"""
    if 'enum' in node:
        return dict(node, enum=list(node['enum']) + ([None] if None not in node['enum'] else []))
    kind = node.get('type')
    if isinstance(kind, str):
        return dict(node, type=[kind, 'null'])
    if isinstance(kind, list):
        return dict(node, type=kind + ([] if 'null' in kind else ['null']))
    return {'anyOf': [node, {'type': 'null'}]}


def own_schema(value, doc, columns, schema):
    """@purity pure"""
    kind = value['type']
    if kind in JSON_OF_WORD:
        return {'type': JSON_OF_WORD[kind]}
    if kind == 'enum':
        if 'valuesOf' in value:
            return {'enum': [columns.s[one] for one in value['valuesOf']]}
        return {'enum': list(value['values'])}
    if kind == 'map':
        return {'type': 'object', 'additionalProperties': {'type': JSON_OF_WORD[value['valueType']]}}
    shape = manuscript.shapes_by_name(doc).get(kind)
    if shape is not None:
        return shape_schema(shape, doc, columns, schema)
    return cleaned(schema['$defs'][kind], schema['$defs'])


def value_schema(value, doc, columns, schema):
    """@purity pure"""
    if 'type' in value:
        node = own_schema(value, doc, columns, schema)
    else:
        node = column_schema(manuscript.pointers(value)[0], columns, schema)
    if value.get('null') is False:
        node = without_null(node)
    if value.get('list'):
        node = {'type': 'array', 'items': node}
    if value.get('null') is True:
        node = with_null(node)
    return node


def column_description(value, columns, schema):
    """The English description of the column a value points at, or None.

    CR-796: a value is described only in English (design-mcp-relay.md 3.1),
    and the one English source of a value is the description of its column in
    grs-document.schema.json; a value with none is printed without one.

    @purity pure
    """
    ids = manuscript.pointers(value)
    if not ids:
        return None
    if ids[0] in columns.at:
        entity, name, _json = columns.at[ids[0]]
        node = schema['$defs'][entity]['properties'][name]
    else:
        node = settings_node(columns.s[ids[0]], schema)
    if not node or 'description' not in node:
        return None
    return english({'en': node['description']}, '%s of %s' % (ids[0], REL_DOCUMENT_SCHEMA))


def settings_node(key, schema):
    """The schema node of a settings key, a dotted one walked part by part, or None.

    @purity pure
    """
    node = schema['properties']['documentSettings']
    for part in key.split('.'):
        if '$ref' in node:
            node = schema['$defs'][node['$ref'].rsplit('/', 1)[-1]]
        node = node.get('properties', {}).get(part)
        if node is None:
            return None
    return node


def object_schema(values, doc, columns, schema, description, first=None):
    """@purity pure"""
    properties = dict(first or {})
    required = list(properties)
    for value in values:
        node = value_schema(value, doc, columns, schema)
        told = column_description(value, columns, schema)
        if told:
            node['description'] = told
        properties[value['name']] = node
        if not value.get('optional'):
            required.append(value['name'])
    out = {'type': 'object'}
    if description:
        out['description'] = description
    out.update({'properties': properties, 'required': required, 'additionalProperties': False})
    return out


def shape_schema(shape, doc, columns, schema):
    """@purity pure"""
    if 'variants' not in shape:
        return object_schema(shape['fields'], doc, columns, schema, None)
    tag = shape['discriminant']
    return {'oneOf': [object_schema(variant['fields'], doc, columns, schema, None,
                                    {tag: {'const': variant['tag']}})
                      for variant in shape['variants']]}


def carried(row):
    """What a command does, in English: its "what it carries" lines (CR-796).

    @purity pure
    """
    return english(row['carries'], '%s of %s' % (row['id'], REL_SOURCE))


def command_schemas(doc, columns, schema):
    """One alternative per command the Agent API takes, in the table's order.

    A command with a choice of shapes gives one alternative per shape.

    @purity pure
    """
    out = []
    for row in doc['rows']:
        if row.get('agent') is False:
            continue
        plain = [value for value in row['values'] if 'oneOf' not in value]
        choice = [value for value in row['values'] if 'oneOf' in value]
        shapes = manuscript.shapes_by_name(doc)
        ways = [plain + shapes[name]['fields'] for name in choice[0]['oneOf']] if choice else [plain]
        for values in ways:
            out.append(object_schema(values, doc, columns, schema, carried(row),
                                     {'kind': {'const': row['name']}}))
    return out


def request_fields(agent_doc):
    """The fields of AgentWriteRequest as table T-400 of the Agent API manuscript holds them.

    @purity pure
    """
    for row in agent_doc['values']['rows']:
        if row['name'] == WRITE_REQUEST_TYPE:
            return row['fields']
    stop('the Agent API manuscript holds no value type %s' % WRITE_REQUEST_TYPE)


def kind_item_schema(doc):
    """One command as the AM-7 tool input shows it: an object that must carry `kind`,
    one of the confirmed names of table T-108 in its order.

    ⛔ NO oneOf (AG-12 (8)): the MCP client drops it, so the keys of each command
    are in grs-commands.schema.json, the second resource, instead.

    @purity pure
    """
    told = [KIND_DESCRIPTION] + ['%s: %s' % (row['name'], carried(row).replace('\n', ' '))
                                 for row in doc['rows']]
    kind = {'type': 'string', 'enum': [row['name'] for row in doc['rows']], 'description': '\n'.join(told)}
    return {'type': 'object', 'properties': {'kind': kind}, 'required': ['kind']}


def with_command_shapes(input_schema, member, agent_doc):
    """The MCP input of one Agent API member, with an AgentWriteRequest argument
    printed from table T-108: the stamp, and the commands, each an object with its kind.

    The member's own description of the argument is kept; each field is
    described by its meaning in table T-400.

    @purity semi-pure-b
    """
    written = [one for one in member['arguments'] if one['type'] == WRITE_REQUEST_TYPE]
    if not written:
        return input_schema
    doc, _columns = load()
    properties = {}
    for field in request_fields(agent_doc):
        if field['type'] == STAMP_TYPE:
            node = {'type': 'object'}
        elif field['type'] == COMMAND_LIST_TYPE:
            node = {'type': 'array', 'items': kind_item_schema(doc)}
        else:
            stop('%s holds the field %s of type %s, which no rule here prints'
                 % (WRITE_REQUEST_TYPE, field['name'], field['type']))
        # CR-796: English only; a field whose meaning has none is printed without one.
        if field['meaning'].get('en'):
            node['description'] = english(field['meaning'], '%s %s' % (WRITE_REQUEST_TYPE, field['name']))
        properties[field['name']] = node
    out = copy.deepcopy(input_schema)
    for one in written:
        out['properties'][one['name']].update({'properties': properties, 'required': list(properties)})
    return out


# ---------------------------------------------------------------- the commands resource

def command_branch(row, doc, columns, schema):
    """The branch of one command in grs-commands.schema.json.

    A command with a choice of shapes (CM-38) is one branch holding a oneOf of
    its ways, so its kind is named once; each way lists `kind` as allowed.

    @purity pure
    """
    description = carried(row)
    kind = {'kind': {'const': row['name']}}
    plain = [value for value in row['values'] if 'oneOf' not in value]
    choice = [value for value in row['values'] if 'oneOf' in value]
    if not choice:
        return object_schema(plain, doc, columns, schema, description, kind)
    shapes = manuscript.shapes_by_name(doc)
    ways = [object_schema(plain + shapes[name]['fields'], doc, columns, schema, None, {'kind': True})
            for name in choice[0]['oneOf']]
    return {'type': 'object', 'description': description, 'properties': kind,
            'required': ['kind'], 'oneOf': ways}


def commands_schema_text(doc, columns, schema):
    """grs-commands.schema.json as it is written: every command of table T-108, in its order.

    @purity pure
    """
    out = collections.OrderedDict([
        ('$schema', JSON_SCHEMA_DIALECT),
        ('$id', COMMANDS_SCHEMA_ID),
        ('$comment', COMMANDS_SCHEMA_COMMENT),
        ('title', COMMANDS_SCHEMA_TITLE),
        ('description', COMMANDS_SCHEMA_DESCRIPTION),
        # CR-806: one definition per command, keyed by its confirmed name, so readSchema (AM-30) lists them.
        ('oneOf', [{'$ref': '#/$defs/%s' % row['name']} for row in doc['rows']]),
        ('$defs', collections.OrderedDict(
            (row['name'], command_branch(row, doc, columns, schema)) for row in doc['rows'])),
    ])
    return json.dumps(out, ensure_ascii=False, indent=1) + '\n'


def commands_schema_drifted(doc, columns, schema):
    """Write grs-commands.schema.json, or under --check say whether it drifted.

    @purity non-pure
    """
    built = commands_schema_text(doc, columns, schema)
    path = path_of(REL_COMMANDS_SCHEMA)
    held = io.open(path, encoding='utf-8', newline='').read() if os.path.exists(path) else None
    if held == built:
        return False
    if '--check' in sys.argv:
        return True
    io.open(path, 'w', encoding='utf-8', newline='').write(built)
    say('wrote %s' % REL_COMMANDS_SCHEMA)
    return False


# ---------------------------------------------------------------- run-time shape check

SHAPE_UNIT = 'src/adapter/document-codec/grs-json-schema.ts'

# ⭐ What a run-time check of a command judges: its kind, the values it must
# carry, the values it may not carry, and the JSON type of each (FR-028, AG-9a
# of table T-035; DFC-2856). A bound, a spelling or a count is NOT judged here:
# the planning of the command already refuses those with a reason of its own,
# and a malformedRequest in their place would hide that reason.
SHAPE_KEPT = ('type', 'const', 'enum', 'required', 'additionalProperties', 'properties', 'items', 'oneOf')
SHAPE_NOT_JUDGED = ('description', 'pattern', 'format', 'minimum', 'maximum', 'maxItems', 'maxLength')


def shape_check_node(node, at):
    """One command schema node, cut down to the keywords the walker of SHAPE_UNIT reads.

    @purity pure
    """
    out = collections.OrderedDict()
    for keyword in node:
        if keyword not in SHAPE_KEPT and keyword not in SHAPE_NOT_JUDGED:
            stop('%s of a command schema uses %r, which neither SHAPE_KEPT nor SHAPE_NOT_JUDGED lists' % (at, keyword))
    if 'type' in node:
        out['type'] = [node['type']] if isinstance(node['type'], str) else list(node['type'])
    if 'const' in node:
        out['enum'] = [node['const']]
    if 'enum' in node:
        out['enum'] = list(node['enum'])
    if 'required' in node:
        out['required'] = list(node['required'])
    if 'additionalProperties' in node:
        extra = node['additionalProperties']
        if extra is False:
            out['closed'] = True
        elif isinstance(extra, dict):
            # A map whose keys are free and whose values have one shape (PasteLanding.taskGroupIdOf).
            out['values'] = shape_check_node(extra, at + '/{}')
        else:
            stop('%s of a command schema gives additionalProperties the value %r' % (at, extra))
    if 'properties' in node:
        out['properties'] = collections.OrderedDict(
            (key, shape_check_node(inner, at + '/' + key)) for key, inner in node['properties'].items())
    if 'items' in node:
        out['items'] = shape_check_node(node['items'], at + '/[]')
    if 'oneOf' in node:
        out['alternatives'] = [shape_check_node(one, '%s/oneOf/%d' % (at, index))
                               for index, one in enumerate(node['oneOf'])]
    return out


def shape_check_region(doc, columns, schema):
    """(unit, what, lines) of SHAPE_OF_COMMAND_KIND, keyed by the kind of each command.

    @purity pure
    """
    # ⚠️ Imported here, not at the head: generate_mcp_tool_descriptions.py imports this file
    # for with_command_shapes() alone, and is run on copies that carry no validator.
    import generate_json_schema_validator as validator
    lines = ['// see %s, FR-028, AG-9a' % doc['table']['id'],
             'const SHAPE_OF_COMMAND_KIND: Readonly<Record<string, SchemaNode>> = {']
    ways = collections.OrderedDict()
    for one in command_schemas(doc, columns, schema):
        kind = one['properties']['kind']['const']
        ways.setdefault(kind, []).append(shape_check_node(one, '/' + kind))
    for kind, nodes in ways.items():
        # A command with a choice of shapes (CM-38) is one alternative per shape.
        node = nodes[0] if len(nodes) == 1 else collections.OrderedDict([('alternatives', nodes)])
        lines.append('  %s: %s,' % (validator.ts_key(kind), validator.ts_node(node, 1)))
    lines.append('}')
    return (SHAPE_UNIT, 'table %s, SHAPE_OF_COMMAND_KIND' % doc['table']['id'], lines)


def main():
    """Write the regions, or say whether the units on disk still match.

    @purity non-pure
    """
    doc, columns = load()
    schema = document_schema()
    drifted = [REL_COMMANDS_SCHEMA] if commands_schema_drifted(doc, columns, schema) else []
    printed = regions(doc, columns) + [shape_check_region(doc, columns, schema)]
    for rel, what, lines in printed:
        text = io.open(path_of(rel), encoding='utf-8', newline='').read()
        built = rewritten(rel, text, what, lines)
        if built == text:
            continue
        if '--check' in sys.argv:
            drifted.append(rel)
        else:
            io.open(path_of(rel), 'w', encoding='utf-8', newline='').write(built)
            say('wrote the region of %s' % rel)
    if drifted:
        for rel in drifted:
            say('PROBLEM  %s has drifted from %s -- run `python %s`' % (rel, REL_SOURCE, REL_SELF))
        return 1
    say('OK       %d unit region(s) and %s match %s (%d commands)'
        % (len(printed), REL_COMMANDS_SCHEMA, REL_SOURCE, len(doc['rows'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
