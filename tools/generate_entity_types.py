# -*- coding: utf-8 -*-
"""Write the TypeScript types of the schedule group from erd.json.

The columns of the document already exist in machine-readable form -- the same
"json" key that check 17 turns into the `GRS JSON` schema. Writing them a
second time by hand would be 138 chances to drift from it, so they are
generated into the units that Chapter 5.3 says own them:

  src/entity/document-model/schedule/schedule.ts        the 18 entity types
                                                        and the Schedule group
  src/entity/document-model/document-stamp/…            the stamp and the log

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
ERD = os.path.join(ROOT, 'docs', 'spec', '_assets', 'source', 'erd.json')
MODEL = os.path.join(ROOT, 'src', 'entity', 'document-model')

OPEN = '// <generated from docs/spec/_assets/source/erd.json -- do not edit by hand>'
CLOSE = '// </generated>'

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


TARGETS = [
    (os.path.join(MODEL, 'schedule', 'schedule.ts'), schedule_block),
    (os.path.join(MODEL, 'document-stamp', 'document-stamp.ts'), stamp_block),
]


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
    if text and not text.endswith('\n'):
        text += '\n'
    return text + '\n' + block


def main():
    erd = json.load(io.open(ERD, encoding='utf-8'),
                    object_pairs_hook=collections.OrderedDict)
    checking = '--check' in sys.argv
    drift = 0

    for path, build in TARGETS:
        if not os.path.exists(path):
            say('MISSING  %s -- run tools/generate_unit_tree.py first'
                % os.path.relpath(path, ROOT).replace('\\', '/'))
            return 1
        current = io.open(path, encoding='utf-8', newline='').read()
        wanted = region(current, build(erd))
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
