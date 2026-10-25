# -*- coding: utf-8 -*-
"""Check that the CR-851 line-review tables cover their sources exactly once.

1. doc-shape-map.tsv: every data element of today's document schema
   (docs/spec/_source/grs-document.schema.json, named by JSON Pointer) appears
   exactly once in the column element_old, and no new element appears twice
   in element_new.
2. commands-map.tsv: every command row of docs/spec/_source/document-commands.json
   (CM-n), live or retired, appears exactly once in the column command_old.

The tables were drafted against develop 80927c91d. Once CR-851 is applied the
sources change and this check is expected to fail; it is a record of the
review, not a gate.

Usage (from the repository root):
    python -I studies/76-grs-json-beta-shape/check_tables.py
"""
import io
import json
import os
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SCHEMA = os.path.join(ROOT, 'docs', 'spec', '_source', 'grs-document.schema.json')
COMMANDS = os.path.join(ROOT, 'docs', 'spec', '_source', 'document-commands.json')


def schema_elements(schema):
    """Every property of the schema and of each $defs entry, as JSON Pointers."""
    found = []

    def walk(base, node):
        for key, value in node.get('properties', {}).items():
            pointer = base + '/properties/' + key
            found.append(pointer)
            kinds = value.get('type') or []
            if (kinds == 'object' or 'object' in kinds) and 'properties' in value:
                walk(pointer, value)

    walk('', schema)
    for name, definition in schema['$defs'].items():
        found.append('/$defs/' + name)
        walk('/$defs/' + name, definition)
    return found


def tsv_column(path, column):
    with io.open(path, encoding='utf-8') as handle:
        rows = [line.rstrip('\n').split('\t') for line in handle if line.strip()]
    index = rows[0].index(column)
    return [row[index] for row in rows[1:]]


def report(label, expected, listed):
    counts = Counter(listed)
    missing = sorted(set(expected) - set(counts))
    extra = sorted(set(counts) - set(expected))
    twice = sorted(key for key, count in counts.items() if count > 1)
    ok = not (missing or extra or twice)
    print('%s %s: %d expected, %d listed, missing %d, extra %d, twice %d'
          % ('OK ' if ok else 'BAD', label, len(set(expected)), len(listed),
             len(missing), len(extra), len(twice)))
    for name, keys in (('missing', missing), ('extra', extra), ('twice', twice)):
        for key in keys[:10]:
            print('    %s %s' % (name, key))
    return ok


def main():
    with io.open(SCHEMA, encoding='utf-8') as handle:
        schema = json.load(handle)
    old = [value for value in tsv_column(os.path.join(HERE, 'doc-shape-map.tsv'), 'element_old')
           if value != '-']
    new = [value for value in tsv_column(os.path.join(HERE, 'doc-shape-map.tsv'), 'element_new')
           if value != '-']
    ok = report('doc-shape-map element_old', schema_elements(schema), old)
    twice_new = sorted(key for key, count in Counter(new).items() if count > 1)
    print('%s doc-shape-map element_new: %d listed, twice %d'
          % ('OK ' if not twice_new else 'BAD', len(new), len(twice_new)))
    ok = ok and not twice_new

    with io.open(COMMANDS, encoding='utf-8') as handle:
        commands = json.load(handle)
    ids = [row['id'] for row in commands['rows']]
    ids += [entry if isinstance(entry, str) else entry.get('id', '')
            for entry in commands.get('retired', [])]
    listed = [value.split(' ')[0] for value in
              tsv_column(os.path.join(HERE, 'commands-map.tsv'), 'command_old')
              if value.startswith('CM-')]
    ok = report('commands-map command_old', ids, listed) and ok
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
