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
SCHEMA = os.path.join(ROOT, 'docs', 'spec', '_assets', 'grs-document.schema.json')
SETTINGS = os.path.join(ROOT, 'docs', 'spec', '_source', 'settings.json')
MODEL = os.path.join(ROOT, 'src', 'entity', 'document-model')

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
        return cell['lit'].replace("'", "'") if cell['lit'][0] == "'" else cell['lit']
    return None


def number_of(cell):
    if isinstance(cell, dict) and 'num' in cell:
        return float(cell['num'])
    return None


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
    defaults, unstated = [], []
    for path in sorted(flat_keys(node, '')):
        said = manuscript.get(path) or manuscript.get(path.split('.')[-1])
        literal = literal_of(said['default']) if said else None
        if literal is None:
            unstated.append(path)
            continue
        defaults.append("  '%s': %s," % (path, literal))
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
     ['docs/spec/_source/erd.json']),
    (os.path.join(MODEL, 'document-stamp', 'document-stamp.ts'), stamp_block,
     ['docs/spec/_source/erd.json']),
    (os.path.join(MODEL, 'document-settings', 'document-settings.ts'), settings_block,
     ['docs/spec/_source/settings.json',
      'docs/spec/_source/erd.json',
      'docs/spec/_assets/grs-document.schema.json (itself generated from the two above)']),
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
