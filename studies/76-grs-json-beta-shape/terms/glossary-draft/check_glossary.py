"""Check the names dictionary (glossary.json) against its schema and its own rules.

Usage: python check_glossary.py [glossary.json] [glossary.schema.json]

Checks:
  1. The file validates against the JSON Schema (draft 2020-12).
  2. The pair (key, owner) is unique across the whole dictionary, children included.
  3. Every tag points at a term that exists (key, and owner when the tag gives one).
  4. Names written in backticks in definition.en that are dictionary keys are
     defined earlier in reading order (depth-first, group order, children after
     their parent). Each forward reference is reported with the two keys.
     Forward references are reported only; they do not fail the check.
  5. Prints the number of terms per group and sub-group.

Exit code 1 on a schema error, a duplicate (key, owner) or an unresolved tag.
"""

import json
import os
import re
import sys
from collections import defaultdict

try:
    import jsonschema
except ImportError:  # pragma: no cover - reported to the person running the check
    print('jsonschema is not installed: pip install jsonschema')
    sys.exit(2)

HERE = os.path.dirname(os.path.abspath(__file__))
BACKTICK_NAME = re.compile(r'`([A-Za-z][A-Za-z0-9]*)`')


def load_json(path):
    with open(path, encoding='utf-8') as handle:
        return json.load(handle)


def walk_terms(terms, group_path, depth=0):
    """Yield (group_path, term, depth) for every term, parent before children."""
    for term in terms:
        yield group_path, term, depth
        yield from walk_terms(term.get('children', []), group_path, depth + 1)


def walk_groups(groups, parent_path=()):
    """Yield (group_path, group) in reading order: a group's terms, then its sub-groups."""
    for group in groups:
        path = parent_path + (group['key'],)
        yield path, group
        yield from walk_groups(group.get('groups', []), path)


def term_label(term):
    owner = term.get('owner')
    return term['key'] + ('@' + owner if owner else '')


def main():
    glossary_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'glossary.json')
    schema_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'glossary.schema.json')
    glossary = load_json(glossary_path)
    schema = load_json(schema_path)

    failed = False

    # 1. Schema
    validator = jsonschema.Draft202012Validator(schema)
    schema_errors = sorted(validator.iter_errors(glossary), key=lambda e: list(e.path))
    if schema_errors:
        failed = True
        print('SCHEMA: %d error(s)' % len(schema_errors))
        for error in schema_errors[:50]:
            print('  at /%s: %s' % ('/'.join(str(p) for p in error.path), error.message[:300]))
    else:
        print('SCHEMA: valid')

    # Reading order
    ordered = []  # (group_path, term, depth)
    group_counts = []  # (group_path, own term count, total term count)
    for path, group in walk_groups(glossary.get('groups', [])):
        own = list(walk_terms(group.get('terms', []), path))
        ordered.extend(own)
        group_counts.append((path, len(own)))

    # 2. Uniqueness of (key, owner)
    seen = {}
    duplicates = []
    for index, (path, term, _) in enumerate(ordered):
        pair = (term.get('key'), term.get('owner'))
        if pair in seen:
            duplicates.append((pair, seen[pair], '/'.join(path)))
        else:
            seen[pair] = '/'.join(path)
    if duplicates:
        failed = True
        print('DUPLICATES: %d' % len(duplicates))
        for pair, first, second in duplicates:
            print('  %s%s in %s and %s' % (pair[0], '@' + pair[1] if pair[1] else '', first, second))
    else:
        print('DUPLICATES: 0')

    # 3. Tags resolve
    keys_any_owner = defaultdict(set)
    for path, term, _ in ordered:
        keys_any_owner[term['key']].add(term.get('owner'))
    tag_errors = []
    for path, term, _ in ordered:
        for tag in term.get('tags', []):
            key, owner = tag.get('key'), tag.get('owner')
            if key not in keys_any_owner:
                tag_errors.append((term_label(term), key, owner))
            elif owner is not None and owner not in keys_any_owner[key]:
                tag_errors.append((term_label(term), key, owner))
            elif owner is None and None not in keys_any_owner[key] and len(keys_any_owner[key]) > 1:
                # A tag without an owner on a key that only exists per owner is ambiguous.
                tag_errors.append((term_label(term), key, '(ambiguous: give an owner)'))
    if tag_errors:
        failed = True
        print('TAG ERRORS: %d' % len(tag_errors))
        for source, key, owner in tag_errors[:100]:
            print('  %s -> %s%s' % (source, key, '@' + owner if owner else ''))
    else:
        print('TAG ERRORS: 0')

    # 4. Forward references in definition.en
    first_position = {}
    for index, (path, term, _) in enumerate(ordered):
        first_position.setdefault(term['key'], index)
    forward = []
    for index, (path, term, _) in enumerate(ordered):
        text = term.get('definition', {}).get('en', '')
        reported = set()
        for name in BACKTICK_NAME.findall(text):
            if name == term['key'] or name in reported:
                continue
            position = first_position.get(name)
            if position is not None and position > index:
                forward.append((term_label(term), name, '/'.join(path)))
                reported.add(name)
    print('FORWARD REFERENCES: %d (reported only)' % len(forward))
    for source, name, path in forward:
        print('  %s uses `%s` before it is defined (%s)' % (source, name, path))

    # 5. Counts
    print('COUNTS (terms including children):')
    total = 0
    for path, count in group_counts:
        print('  %s%s: %d' % ('  ' * (len(path) - 1), '/'.join(path), count))
        total += count
    print('  TOTAL: %d' % total)

    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
