# -*- coding: utf-8 -*-
u"""Check 90 -- a data element of the generated schemas breaks OKPN or takes null.

THE RULES (docs/development-rules/07-review-standards.md, JDG-3221..3230).
  OKPN (One Kind Per Name, R2): one name of a data element takes values of
        one kind only.
  OMPV (One Meaning Per Value, R2): one value of a data element has one
        meaning only.
  Null Trap (R3): an absent value is an omitted key, not null.

WHY. The custom colours were written as "#c0504d/#b2423f" -- the light and
the dark value packed into one string behind a separator, in the same element
that also takes palette names. Marking one side alone could only be done by
changing the shape, which broke the documents of the alpha (CR-851). A rule
in prose did not stop it; this check reads the shapes themselves.

WHAT IT READS. The two generated JSON Schemas a reader of GRS JSON sees:
docs/spec/_source/grs-document.schema.json and grs-commands.schema.json.
Every property definition is one data element, named by its JSON Pointer.

WHAT IT FINDS, per element.
  packed  (OKPN) a string pattern joins two values with a separator outside a
          character class: / ; , or a space. ISO 8601 date-times use - : T
          and are one value, so they are not separators here.
  mixed   (OKPN) a string pattern whose top-level alternatives mix bare words
          (palette names, keywords) with a format (a class or a quantifier).
  spaced  (OKPN) an enum member holding a space or a separator, i.e. two
          values in one member ("UTC-08:00 DST").
  null    (Null Trap) the type, an enum or an alternative takes null.

THE BASELINE. data-element-kinds-baseline.txt lists what the tree held when
the rule was written, one "<kind> <file>#<pointer>" per line. A finding not
listed is red: a new element broke the rule. A listed line no longer found is
red too, so the baseline only goes down (CR-851 brings the schema part to 0;
JDG-3226).

WHAT IT DOES NOT SEE. OMPV in general: a value whose second meaning lives
only in prose (0 meaning "no parent") has no shape to read -- that stays with
the review perspective OMPV. Separators inside an enum-free, pattern-free string.
src/: the code is counted once by docs/review/data-element-survey-2026-10-24.md
and settled item by item, not gated (JDG-3226).

Usage:
    python check-data-element-kinds.py [--self-test] [--write-baseline]
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SCHEMAS = (
    'docs/spec/_source/grs-document.schema.json',
    'docs/spec/_source/grs-commands.schema.json',
)
BASELINE = os.path.join(HERE, 'data-element-kinds-baseline.txt')
BASELINE_HEADER = (
    '# Check 90 baseline: the data elements that broke OKPN (R2) or took null\n'
    '# (Null Trap, R3) when the rule was written. Lower only: delete a line when its element\n'
    '# is fixed; never add one (JDG-3226). MEASURED 2026-10-24 on 8d162d7c7:\n'
    '# 195 lines -- packed 16, mixed 16 (the colour elements), spaced 2 (the\n'
    '# " DST" time-zone keys), null 161 (83 document, 78 commands). CR-851 brings\n'
    '# them to 0 before the beta.\n'
)
SEPARATORS = '/;, '
BARE_WORD = re.compile(r'^[A-Za-z][A-Za-z0-9_-]*$')


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


QUANTIFIER = re.compile(r'\{\d*,?\d*\}')


def outside_classes(pattern):
    """The pattern with escapes, character classes and {n,m} quantifiers struck out."""
    out = []
    i = 0
    in_class = False
    while i < len(pattern):
        c = pattern[i]
        if c == '\\':
            out.append('e')
            i += 2
            continue
        if in_class:
            in_class = c != ']'
        elif c == '[':
            in_class = True
        else:
            out.append(c)
        i += 1
    return QUANTIFIER.sub('', ''.join(out))


def top_level_alternatives(pattern):
    """The pattern's top-level alternatives, anchors and one outer group peeled."""
    body = pattern
    if body.startswith('^'):
        body = body[1:]
    if body.endswith('$') and not body.endswith('\\$'):
        body = body[:-1]
    if body.startswith('(?:') and body.endswith(')'):
        body = body[3:-1]
    parts, depth, start, i, in_class = [], 0, 0, 0, False
    while i < len(body):
        c = body[i]
        if c == '\\':
            i += 2
            continue
        if in_class:
            in_class = c != ']'
        elif c == '[':
            in_class = True
        elif c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
        elif c == '|' and depth == 0:
            parts.append(body[start:i])
            start = i + 1
        i += 1
    parts.append(body[start:])
    return parts


def kinds_of_pattern(pattern):
    """The OKPN findings one string pattern carries."""
    found = set()
    if any(s in outside_classes(pattern) for s in SEPARATORS):
        found.add('packed')
    parts = top_level_alternatives(pattern)
    words = [p for p in parts if BARE_WORD.match(p)]
    if words and len(words) < len(parts):
        found.add('mixed')
    return found


def takes_null(definition):
    """Whether one property definition lets its element hold null."""
    kind = definition.get('type')
    if kind == 'null' or (isinstance(kind, list) and 'null' in kind):
        return True
    if None in (definition.get('enum') or []):
        return True
    for alternative in (definition.get('oneOf') or []) + (definition.get('anyOf') or []):
        if isinstance(alternative, dict) and takes_null(alternative):
            return True
    return False


def patterns_of(definition):
    """Every string pattern and enum of one definition, its alternatives and items."""
    patterns, members = [], []
    stack = [definition]
    while stack:
        one = stack.pop()
        if not isinstance(one, dict):
            continue
        if isinstance(one.get('pattern'), str):
            patterns.append(one['pattern'])
        members.extend(m for m in (one.get('enum') or []) if isinstance(m, str))
        for key in ('oneOf', 'anyOf'):
            stack.extend(one.get(key) or [])
        if isinstance(one.get('items'), dict):
            stack.append(one['items'])
    return patterns, members


def findings_of(schema, file_name):
    """[(kind, file#pointer)] for every data element of one schema."""
    found = []

    def walk(node, pointer):
        if isinstance(node, dict):
            for name, definition in (node.get('properties') or {}).items():
                if not isinstance(definition, dict):
                    continue
                at = '%s#%s/properties/%s' % (file_name, pointer, name)
                kinds = set()
                patterns, members = patterns_of(definition)
                for pattern in patterns:
                    kinds |= kinds_of_pattern(pattern)
                if any(any(s in m for s in SEPARATORS) for m in members):
                    kinds.add('spaced')
                if takes_null(definition):
                    kinds.add('null')
                found.extend((kind, at) for kind in sorted(kinds))
            for key, child in node.items():
                walk(child, '%s/%s' % (pointer, key))
        elif isinstance(node, list):
            for index, child in enumerate(node):
                walk(child, '%s/%d' % (pointer, index))

    walk(schema, '')
    return sorted(set(found))


def tree_findings():
    """The findings of both generated schemas as baseline lines."""
    lines = []
    for path in SCHEMAS:
        with io.open(os.path.join(REPO, path), encoding='utf-8') as handle:
            schema = json.load(handle)
        lines.extend('%s %s' % pair for pair in findings_of(schema, os.path.basename(path)))
    return lines


def compare(found, held):
    """(new, gone): findings not on the baseline, baseline lines no longer found."""
    return sorted(set(found) - set(held)), sorted(set(held) - set(found))


def self_test():
    schema = {'properties': {
        'packedColor': {'type': 'string', 'pattern': '^#[0-9a-f]{6}/#[0-9a-f]{6}$'},
        'mixedColor': {'type': 'string', 'pattern': '^(?:red|blue|#[0-9a-f]{6})$'},
        'dateTime': {'type': 'string', 'pattern': r'^-?\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'},
        'zone': {'enum': ['UTC+09:00', 'UTC-08:00 DST']},
        'note': {'type': ['string', 'null']},
        'shape': {'enum': ['bar', 'milestone', None]},
        'plain': {'type': 'string', 'enum': ['bar', 'milestone']},
    }}
    got = findings_of(schema, 'x.json')
    want = [
        ('mixed', 'x.json#/properties/mixedColor'),
        ('null', 'x.json#/properties/note'),
        ('null', 'x.json#/properties/shape'),
        ('packed', 'x.json#/properties/packedColor'),
        ('spaced', 'x.json#/properties/zone'),
    ]
    if got != want:
        say('FAIL     check 90 self-test: expected %r, got %r' % (want, got))
        return 1
    new, gone = compare(['a', 'b'], ['b', 'c'])
    if (new, gone) != (['a'], ['c']):
        say('FAIL     check 90 self-test: baseline comparison is wrong')
        return 1
    say('OK       check 90 self-test: packed, mixed, spaced and null found; '
        'the date-time and the plain enum pass; the baseline comparison works')
    return 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    found = tree_findings()
    if '--write-baseline' in argv:
        with io.open(BASELINE, 'w', encoding='utf-8', newline='\n') as handle:
            handle.write(BASELINE_HEADER + ''.join(line + '\n' for line in found))
        say('wrote %d line(s) to %s' % (len(found), os.path.relpath(BASELINE, REPO)))
        return 0
    with io.open(BASELINE, encoding='utf-8') as handle:
        held = [line.strip() for line in handle if line.strip() and not line.startswith('#')]
    new, gone = compare(found, held)
    for line in new:
        say('  new    %s' % line)
    for line in gone:
        say('  gone   %s' % line)
    counts = {}
    for line in found:
        counts[line.split(' ', 1)[0]] = counts.get(line.split(' ', 1)[0], 0) + 1
    tally = ', '.join('%s %d' % pair for pair in sorted(counts.items()))
    if new:
        say('FAIL     %d data element(s) break OKPN (R2) or take null (Null Trap, R3) '
            'and are not on the baseline -- reshape them (07 R2 "OKPN/OMPV", R3 '
            '"Null Trap"); never add them to the baseline' % len(new))
    if gone:
        say('FAIL     %d baseline line(s) no longer found -- the element was fixed '
            'or moved: delete the line (the baseline only goes down)' % len(gone))
    if new or gone:
        return 1
    say('OK       %d finding(s), all on the baseline (%s)' % (len(found), tally))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
