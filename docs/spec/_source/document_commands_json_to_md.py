# -*- coding: utf-8 -*-
"""document-commands.json -> docs/spec/_assets/tbl-document-commands.md

document-commands.json is the manuscript for table T-108 (the commands
applyDocumentChange takes, with the values each one carries) -- CR-766,
JDG-2162. EDIT THAT. This file prints it as the document the specification
carries, and _assets/tbl-document-commands.md is a generated artifact: a hand
edit to it is overwritten, and --check catches one before it can be committed.

    python document_commands_json_to_md.py           rebuild the document
    python document_commands_json_to_md.py --check   exit 1 if the file differs

⭐ WHY A MANUSCRIPT (CR-766). Table T-108 named the commands and said what
each does; what a command carries lived only in the eight hand-written unions
of src/use-case/edit-document/, and the AI's applyCommands took an untyped
object (DFC-2642). The same manuscript now prints the table, and
tools/generate_document_commands.py prints the code's unions and the MCP input
shape of AM-7 from it.

⭐ A VALUE THAT WRITES A COLUMN POINTS AT IT (CR-766 X-d). `column` names the
AT- row of table T-058 (erd.json) or the S- row of tables T-202 / T-203
(settings.json); the printed line names the column and the row, and the type
and bounds stay that row's. `key` names the row a value identifies its target
by. Only a value that is no column writes `type`.

⛔ REFUSED BEFORE A BYTE IS WRITTEN:

    a row id, a retired number or a command name written twice
    a number between CM-1 and the highest row that is neither a row nor retired
    a value name written twice in one command or one shape
    a `key` / `column` naming an AT- row erd.json does not hold or an S- row
      settings.json (tables T-202 / T-203) does not hold
    a `type` that is neither a built-in word, a shape nor an externalTypes name
    an enum with neither `values` nor `valuesOf`, or a map without its two types
    a shape or an externalTypes entry no value uses
    an empty line, a line holding a line-break tag, or a line whose
      parenthesis or bold run does not close on it
    whatever document-commands.schema.json refuses (when jsonschema is installed)

⛔ NO RULE IS PRINTED HERE. The rules stand in the requirements the `source`
cells name; this document prints the rows and says where it came from.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

from spec_md_printing import say

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), '_assets')
SRC = os.path.join(HERE, 'document-commands.json')
SCHEMA = os.path.join(HERE, 'document-commands.schema.json')
ERD = os.path.join(HERE, 'erd.json')
SETTINGS = os.path.join(HERE, 'settings.json')
OUT = os.path.join(ASSETS, 'tbl-document-commands.md')

LANG = 'ja'
BR = '<br>'
OPEN = chr(0xFF08)           # the full-width parentheses a reference is printed inside
CLOSE = chr(0xFF09)
SOLIDUS = u' ／ '        # between two references
DOT = u' ・ '            # between the choices of an enum
INDENT = chr(0x3000) * 2     # the fields of a shape, under the value that carries it
DASH = u' —— '     # between a value and what it means
NONE = u'—'             # an empty cell
STAR = u'⭐'

BUILT_IN = ('string', 'integer', 'number', 'boolean', 'enum', 'map')
SETTINGS_TABLES = ('T-202', 'T-203')
ROW_ID = re.compile(r'^CM-(\d+)$')


def prose(cell):
    return cell.get(LANG, '')


def load_json(path):
    return json.load(io.open(path, encoding='utf-8'))


class Columns(object):
    """The rows a value may point at: AT- of erd.json, S- of tables T-202 / T-203."""

    def __init__(self):
        self.at = {}
        for entity in load_json(ERD)['entities']:
            for column in entity.get('columns', []):
                self.at['AT-%d' % column['seat']] = (entity['name'], column['name'],
                                                     column.get('json', {}))
        self.s = {}
        for block in load_json(SETTINGS)['blocks']:
            if block.get('id') in SETTINGS_TABLES:
                for row in block.get('rows', []):
                    self.s[row['id']] = row['key'].strip('`')

    def holds(self, row_id):
        return row_id in self.at or row_id in self.s

    def name(self, row_id):
        """`Task.fadeInDays` for an AT- row, `stackDirection` for an S- row."""
        if row_id in self.at:
            return u'%s.%s' % self.at[row_id][:2]
        return self.s[row_id]


def pointers(value):
    """The rows a value names, `key` before `column`, as a list."""
    found = []
    for field in ('key', 'column'):
        one = value.get(field)
        if one is None:
            continue
        found += one if isinstance(one, list) else [one]
    return found


def shapes_by_name(doc):
    return dict((shape['name'], shape) for shape in doc['shapes'])


def fields_of(shape):
    """Every field of a shape, the fields of each variant included."""
    if 'variants' in shape:
        return [one for variant in shape['variants'] for one in variant['fields']]
    return shape['fields']


def every_value(doc):
    """(where, value) for every value a row or a shape carries."""
    for row in doc['rows']:
        for value in row['values']:
            yield row['id'], value
    for shape in doc['shapes']:
        for value in fields_of(shape):
            yield shape['name'], value


class Printer(object):
    def __init__(self, doc, columns):
        self.doc = doc
        self.columns = columns
        self.shapes = shapes_by_name(doc)
        self.words = dict((key, prose(cell)) for key, cell in doc['words'].items())

    def reference(self, ids):
        names = SOLIDUS.join(u'`%s`' % self.columns.name(one) for one in ids)
        return u'%s%s%s%s' % (names, OPEN, SOLIDUS.join(u'`%s`' % one for one in ids), CLOSE)

    def type_words(self, value):
        """The printed type of a value that writes `type`."""
        kind = value['type']
        if kind == 'enum':
            if 'valuesOf' in value:
                choices = [u'`%s`%s`%s`%s' % (self.columns.name(one), OPEN, one, CLOSE)
                           for one in value['valuesOf']]
            else:
                choices = [u"`'%s'`" % one for one in value['values']]
            return DOT.join(choices) + u' のどれか'
        if kind == 'map':
            return u'`%s` から `%s` への%s' % (value['keyType'], value['valueType'],
                                              self.words['map'])
        if kind in self.doc['externalTypes']:
            return u'`%s`%s%s%s' % (kind, OPEN, prose(self.doc['externalTypes'][kind]), CLOSE)
        return u'`%s`' % kind

    def narrowing(self, value):
        notes = []
        if value.get('null') is False:
            notes.append(self.words['notNull'])
        if value.get('optional'):
            notes.append(self.words['optional'])
        return (OPEN + u'、'.join(notes) + CLOSE) if notes else u''

    def head(self, value):
        """What a value is, without its meaning."""
        listed = self.words['list'] if value.get('list') else u''
        or_null = (u' ' + self.words['orNull']) if value.get('null') is True else u''
        if 'key' in value:
            ids = pointers(value)
            return u'%s%s%s%s、%s%s%s' % (
                self.words['key'], listed, OPEN,
                SOLIDUS.join(u'`%s`' % self.columns.name(one) for one in ids),
                SOLIDUS.join(u'`%s`' % one for one in ids), CLOSE, or_null)
        if 'type' not in value:
            return u'%s%s%s%s' % (self.reference(pointers(value)), listed, or_null,
                                  self.words['writes'])
        written = u''
        if 'column' in value:
            written = u' で %s%s' % (self.reference(pointers(value)), self.words['writes'])
        return u'%s%s%s%s' % (self.type_words(value), listed, or_null, written)

    def value_lines(self, value, depth=0):
        indent = INDENT * depth
        meaning = prose(value.get('meaning', {}))
        tail = (DASH + meaning) if meaning else u''
        if 'oneOf' in value:
            lines = [indent + self.words['oneOf'] + tail]
            for name in value['oneOf']:
                lines.append(indent + INDENT + u'`%s`:' % name)
                lines += self.shape_lines(self.shapes[name], depth + 2)
            return lines
        line = u'%s`%s`: %s%s%s' % (indent, value['name'], self.head(value),
                                    self.narrowing(value), tail)
        shape = self.shapes.get(value.get('type'))
        return [line] + (self.shape_lines(shape, depth + 1) if shape else [])

    def shape_lines(self, shape, depth):
        indent = INDENT * depth
        if 'variants' not in shape:
            lines = []
            for one in shape['fields']:
                lines += self.value_lines(one, depth)
            return lines
        lines = []
        for variant in shape['variants']:
            # CR-792: a word tag names its table row beside it, as `row` holds it.
            row = u'（`%s`）' % variant['row'] if 'row' in variant else u''
            lines.append(u"%s`%s` が `'%s'`%s%s" % (indent, shape['discriminant'], variant['tag'], row,
                                                    u':' if variant['fields'] else u''))
            for one in variant['fields']:
                lines += self.value_lines(one, depth + 1)
        return lines

    def values_cell(self, row):
        lines = []
        for value in row['values']:
            lines += self.value_lines(value)
        if row['union'] == UNIMPLEMENTED:
            lines.append(self.words['unimplemented'])
        return BR.join(lines) or NONE

    def row_line(self, row):
        return u'| %s | %s | `%s` | %s | %s | %s | %s |' % (
            row['id'], prose(row['group']), row['name'], STAR if row['bundle'] else NONE,
            self.values_cell(row), BR.join(prose(row['carries'])), prose(row['source']))


UNIMPLEMENTED = 'UnimplementedDocumentCommand'


def schema_problems(doc):
    try:
        import jsonschema
    except ImportError:
        return []
    schema = load_json(SCHEMA)
    return ['schema: %s at /%s' % (e.message, '/'.join(str(p) for p in e.path))
            for e in jsonschema.Draft202012Validator(schema).iter_errors(doc)]


def number_problems(doc):
    found = []
    seen = set()
    for one in [row['id'] for row in doc['rows']] + list(doc['retired']):
        if one in seen:
            found.append('%s is written twice (a row or a retired number)' % one)
        seen.add(one)
    numbers = set(int(ROW_ID.match(one).group(1)) for one in seen)
    for gap in range(1, max(numbers) + 1):
        if gap not in numbers:
            found.append('CM-%d is neither a row nor retired' % gap)
    names = set()
    for row in doc['rows']:
        if row['name'] in names:
            found.append('%s: the command %s is written twice' % (row['id'], row['name']))
        names.add(row['name'])
    return found


def value_problems(doc, columns):
    found = []
    shapes = shapes_by_name(doc)
    external = doc['externalTypes']
    used = set()
    groups = [(row['id'], row['values']) for row in doc['rows']]
    for shape in doc['shapes']:
        if 'variants' in shape:
            groups += [('%s %s' % (shape['name'], v['tag']), v['fields']) for v in shape['variants']]
        else:
            groups.append((shape['name'], shape['fields']))
    for where, values in groups:
        names = [value['name'] for value in values if 'name' in value]
        for name in set(names):
            if names.count(name) > 1:
                found.append('%s: the value %s is written twice' % (where, name))
    for where, value in every_value(doc):
        for one in pointers(value) + list(value.get('valuesOf', [])):
            if not columns.holds(one):
                found.append('%s %s: %s is neither an AT- row of erd.json nor an S- row of '
                             'tables T-202 / T-203' % (where, value.get('name', ''), one))
        for name in value.get('oneOf', []):
            used.add(name)
            if name not in shapes:
                found.append('%s: oneOf names %s, which is no shape' % (where, name))
        kind = value.get('type')
        if kind is None:
            if 'oneOf' not in value and 'column' not in value and 'key' not in value:
                found.append('%s %s: no column, key, type or oneOf' % (where, value.get('name')))
            continue
        used.add(kind)
        if kind not in BUILT_IN and kind not in shapes and kind not in external:
            found.append('%s %s: the type %s is no built-in word, shape or externalTypes entry'
                         % (where, value['name'], kind))
        if kind == 'enum' and not ('values' in value or 'valuesOf' in value):
            found.append('%s %s: an enum names no values' % (where, value['name']))
        if kind == 'map' and not ('keyType' in value and 'valueType' in value):
            found.append('%s %s: a map names no key or value type' % (where, value['name']))
    for name in list(shapes) + list(external):
        if name not in used:
            found.append('%s is defined and no value uses it' % name)
    return found


def every_line(doc, printer):
    for paragraph in prose(doc['before']) + prose(doc['after']):
        for line in paragraph:
            yield 'before/after', line
    for row in doc['rows']:
        for line in prose(row['carries']):
            yield row['id'], line
        yield row['id'], prose(row['source'])
        for line in printer.values_cell(row).split(BR):
            yield row['id'], line


def line_problems(doc, printer):
    found = []
    for where, line in every_line(doc, printer):
        if not line.strip() or BR in line:
            found.append('%s: an empty line or a line-break tag -- one string is one line' % where)
        elif line.count('**') % 2:
            found.append('%s: a bold run does not close on its line: %r' % (where, line[:40]))
        elif line.count(OPEN) != line.count(CLOSE):
            found.append('%s: a parenthesis does not close on its line: %r' % (where, line[:40]))
    return found


def problems(doc, columns):
    found = schema_problems(doc)
    if found:
        return found
    found = number_problems(doc) + value_problems(doc, columns)
    if found:
        return found
    return line_problems(doc, Printer(doc, columns))


def load_valid():
    """(doc, columns) when the manuscript is valid, else (None, problems).

    tools/generate_document_commands.py reads the manuscript through this, so
    nothing is generated from a manuscript this printer would refuse.
    """
    doc = load_json(SRC)
    columns = Columns()
    found = problems(doc, columns)
    if found:
        return None, found
    return doc, columns


def paragraph(lines):
    return u'  \n'.join(lines)


def build(doc, columns):
    """The document, as it is written out."""
    printer = Printer(doc, columns)
    table = doc['table']
    column_names = prose(table['columns'])
    out = [
        u'# %s — 表 %s' % (prose(table['caption']), table['id']),
        '',
        '**UID**: DOC-TBL-DOCUMENT-COMMANDS',
        '**Version**: 0.1',
        '',
        u'> ⛔ 本書は生成物である。  ',
        u'> 手で直さない —— 直しても次の `npm run gen` で消える。',
        u'> **文書を書き換える命令と、命令ごとに運ぶ値の唯一の正は `_source/document-commands.json` である。**  ',
        u'> 本書はそれを `_source/document_commands_json_to_md.py` が印字したものである。',
        u'> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`。',
        '',
    ]
    for one in prose(doc['before']):
        out += [paragraph(one), '']
    out += [
        u'**表 %s — %s**' % (table['id'], prose(table['caption'])),
        '',
        u'| %s |' % u' | '.join(column_names),
        u'| %s |' % u' | '.join(['---'] * len(column_names)),
    ]
    out += [printer.row_line(row) for row in doc['rows']]
    for one in prose(doc['after']):
        out += ['', paragraph(one)]
    return u'\n'.join(out) + u'\n'


def main():
    doc, columns = load_valid()
    if doc is None:
        for one in columns:
            say('  %s' % one)
        say('document-commands.json is not valid; nothing was written')
        return 1
    built = build(doc, columns)
    rel = os.path.relpath(OUT, os.path.dirname(os.path.dirname(HERE))).replace('\\', '/')
    counts = '%d command(s), %d value(s), %d shape(s)' % (
        len(doc['rows']), sum(len(row['values']) for row in doc['rows']), len(doc['shapes']))
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % rel)
            return 1
        current = io.open(OUT, encoding='utf-8', newline='').read().replace('\r\n', '\n')
        if current != built:
            say('DRIFTED  %s no longer matches document-commands.json -- rerun '
                'document_commands_json_to_md.py' % rel)
            return 1
        say('OK       %s matches document-commands.json (%s)' % (rel, counts))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(built)
    say('wrote %s  (%s)' % (rel, counts))
    return 0


if __name__ == '__main__':
    sys.exit(main())
