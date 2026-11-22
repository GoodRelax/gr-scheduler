"""Compare two GRS JSON Schemas key by key, whatever their $defs layout.

Use: python compare_schemas.py A.schema.json B.schema.json
     (default A = grs-json-beta.schema.json next to this file,
      B = docs/spec/_source/grs-document.schema.json)

The gate of CR-851: when the manuscripts (erd.json, settings.json) are changed to the beta shape and
`npm run gen` writes docs/spec/_source/grs-document.schema.json, this tool must print "same" for
A = the beta schema of this study and B = the generated schema.

For every key reachable from the root (following $ref, items and a leading allOf $ref), the tool
compares: the key order inside its object, whether the key is required, the JSON type, enum and
const values, the value bounds (pattern, format, minimum, maximum, exclusiveMinimum,
exclusiveMaximum, minLength, maxLength, minItems, maxItems, minProperties, uniqueItems), the
description, and the variant rules (allOf if/then) of the object that holds the key.
It prints one line per difference and exits 1 when anything differs.
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
DEFAULT_A = os.path.join(HERE, 'grs-json-beta.schema.json')
DEFAULT_B = os.path.join(REPO, 'docs', 'spec', '_source', 'grs-document.schema.json')
BOUNDS = ['type', 'enum', 'const', 'pattern', 'format', 'minimum', 'maximum', 'exclusiveMinimum',
          'exclusiveMaximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'minProperties',
          'uniqueItems', 'default']


class Flattener:
    def __init__(self, schema):
        self.schema = schema
        self.rows = {}

    def pointer(self, ref):
        node = self.schema
        for tok in ref[2:].split('/'):
            node = node[tok.replace('~1', '/').replace('~0', '~')]
        return node

    def effective(self, node, depth=0):
        """Merge a node with what its $ref (or leading allOf $ref) points at; the node's own keys win."""
        if depth > 30:
            raise ValueError('$ref loop')
        if '$ref' in node:
            base = self.effective(self.pointer(node['$ref']), depth + 1)
            merged = dict(base)
            merged.update({k: v for k, v in node.items() if k != '$ref'})
            return merged
        if node.get('allOf') and '$ref' in node['allOf'][0] and 'properties' not in node:
            base = self.effective(self.pointer(node['allOf'][0]['$ref']), depth + 1)
            merged = dict(base)
            merged.update({k: v for k, v in node.items() if k != 'allOf'})
            merged['x-narrowedBy'] = node['allOf'][1:]
            return merged
        return node

    def scalar_view(self, node):
        eff = self.effective(node)
        view = {k: eff[k] for k in BOUNDS if k in eff}
        if 'anyOf' in eff:
            view['anyOf'] = len(eff['anyOf'])
        if 'additionalProperties' in eff and not isinstance(eff['additionalProperties'], bool):
            view['additionalProperties'] = 'schema'
        if 'x-narrowedBy' in eff:
            view['narrowedBy'] = json.dumps(eff['x-narrowedBy'], sort_keys=True)
        return view

    def walk(self, node, path, visiting=()):
        ref = node.get('$ref')
        if ref and ref in visiting:
            self.rows[path + ' (recursive)'] = ref
            return
        if ref:
            visiting = visiting + (ref,)
        eff = self.effective(node)
        props = eff.get('properties', {})
        if props:
            self.rows[path + ' (order)'] = list(props)
            self.rows[path + ' (required)'] = sorted(eff.get('required', []))
            self.rows[path + ' (additionalProperties)'] = eff.get('additionalProperties', True)
            rules = [r for r in eff.get('allOf', []) if 'if' in r]
            if rules:
                self.rows[path + ' (variants)'] = json.dumps(rules, sort_keys=True)
        for key, sub in props.items():
            if sub is False:
                continue
            child = (path + '.' if path else '') + key
            self.rows[child + ' (description)'] = sub.get('description', self.effective(sub).get('description'))
            sub_eff = self.effective(sub)
            if sub_eff.get('type') == 'array' or 'items' in sub_eff:
                self.rows[child + ' (array)'] = self.scalar_view(sub)
                self.walk(sub_eff['items'], child + '[]', visiting)
            else:
                self.rows[child + ' (value)'] = self.scalar_view(sub)
                self.walk(sub, child, visiting)


def flatten(path):
    with io.open(path, encoding='utf-8') as f:
        schema = json.load(f)
    fl = Flattener(schema)
    fl.rows['(root description)'] = schema.get('description')
    fl.walk(schema, '')
    return fl.rows


def main():
    a = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_A
    b = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_B
    ra, rb = flatten(a), flatten(b)
    diffs = 0
    for key in sorted(set(ra) | set(rb)):
        if key not in rb:
            print('only in A:', key)
        elif key not in ra:
            print('only in B:', key)
        elif ra[key] != rb[key]:
            print('differs:', key)
            print('   A:', json.dumps(ra[key], ensure_ascii=False)[:300])
            print('   B:', json.dumps(rb[key], ensure_ascii=False)[:300])
        else:
            continue
        diffs += 1
    print('same' if not diffs else '%d differences' % diffs)
    sys.exit(0 if not diffs else 1)


if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', newline='\n')
    main()
