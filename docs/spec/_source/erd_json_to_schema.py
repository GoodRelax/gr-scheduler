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
Run with PYTHONIOENCODING=utf-8.
"""
import collections
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# HERE is docs/spec/_source/ (the manuscripts, which belong to no language);
# what it writes goes to docs/spec/_assets/ (CR-175).
ASSETS = os.path.join(os.path.dirname(HERE), '_assets')
ERD = os.path.join(HERE, 'erd.json')
SETTINGS = os.path.join(ASSETS, 'tbl-settings.md')
OUT = os.path.join(HERE, 'grs-document.schema.json')

SCHEMA_ID = ('https://github.com/GoodRelax/gr-scheduler/docs/spec/_source/'
             'grs-document.schema.json')

# Which group each settings table belongs to, and the marker in the document
# that says so.  A table missing from this map stops the build: a new table
# must be classified by a person, not guessed by this script.
TABLE_GROUP = {
    'T-201': ('documentSettings', None),
    'T-202': ('documentSettings', None),
    'T-203': ('documentSettings', None),
    'T-204': ('documentSettings', None),
    'T-205': ('documentSettings', None),
    'T-208': ('documentSettings', None),
    'T-210': ('documentSettings', None),
    'T-211': ('documentSettings', None),
    'T-212': ('documentSettings', None),
    'T-213': ('documentSettings', None),
    'T-214': ('documentSettings', None),
    'T-215': ('documentSettings', None),
    'T-216': ('schedule', '日程データに属する値'),
    'T-209': ('schedule', '本表の値は日程データの群に入る'),
    'T-217': ('schedule', '本表の値は日程データの群に入る'),
    'T-206': ('notStored', '保存しないもの'),
    'T-207': ('notStored', '文書には保存しない'),
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
    return out


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


def entity_defs(erd, open_enums):
    defs = collections.OrderedDict()
    for e in erd['entities']:
        props = collections.OrderedDict()
        for c in e['columns']:
            props[c['name']] = frag(c['json'], open_enums,
                                    '%s.%s' % (e['name'], c['name']))
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
        ('description', 'The schedule group (DR-2 of table T-052).'),
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
                ('type', ['string', 'null'] if nullable else 'string')])
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
    return as_object(nest(flat), 'The presentation group (DR-3 of table T-052). FR-063 fixes what is in it.')


# ---------------------------------------------------------------------- build


def build():
    erd = json.load(io.open(ERD, encoding='utf-8'),
                    object_pairs_hook=collections.OrderedDict)
    tables = settings_tables()

    problems, open_enums, open_types, skipped = [], [], [], []
    classify(tables, problems)

    reachable = set()
    defs = entity_defs(erd, open_enums)
    schedule = schedule_object(erd, reachable)
    settings = document_settings(tables, open_types, skipped)

    root_box = [b for b in erd['container']['boxes'] if b['id'] == 'Document'][0]
    order = [key for _shape, key, _note in root_box['rows']]

    props = collections.OrderedDict()
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
        else:
            props[key] = collections.OrderedDict([('type', 'string')])

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
    schema['title'] = 'GRS JSON document'
    schema['description'] = (
        'Generated from docs/spec/_source/erd.json (the schedule group) '
        'and docs/spec/_assets/tbl-settings.md (the presentation group). '
        'Never edit by hand. Rebuild: npm run gen -- npm run gen:check fails '
        'on drift. The generator is docs/spec/_source/erd_json_to_schema.py.')
    note = []
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
    if note:
        schema['$comment'] = ' '.join(note)
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
