# -*- coding: utf-8 -*-
"""Check 84 -- a name in docs/spec/_source/ matches the name of what it
points at, or the allow-list says why not.

JDG-2692 (2026-10-17), the second half of the _source consistency check
(the first, every reference resolves, is check 83). JDG-2691 seeds the
allow-list: the seven names the user chose to keep although their screen word
differs. JDG-820: a new identifier states what it points at, spelt after the
specification's name.

THREE PAIRINGS, each read from the manuscripts:
  value   a document-command value (document-commands.json, `values` of a row
          or `fields` of a shape) that names the column it writes --
          `{"name": "parentId", "column": "AT-52"}`. The value's name must BE
          the column's name (JDG-2361); for a settings row (`S-…`), the
          stored key's last segment.
  key     a value that names the row it addresses by its key column --
          `{"name": "taskGroupId", "key": "AT-51"}`. The name must END with
          the key column's name (`…Id`, `…Uid`, or a list of them, `…Ids`):
          it may say which row (`successorUid`), never another column.
  screen  a stored key and the word the screen shows for it: a settings key
          (tbl-glossary.md table T-…'s `K-` rows) against display-words.json
          `settings`, and a property item's columns (property-items.json)
          against display-words.json `properties`. The two match when the
          words of one are all among the words of the other, camelCase split,
          case, plural `s`, `-ed`, `is`/`has` and the words in STOP aside.

RED: a pair that does not match and has no allow-list line, and an allow-list
line that matches no pair (stale -- the rename it waited for has landed, or
the name moved; delete the line).

⚠️ WHAT IT DOES NOT SEE. A name with no pointer beside it -- an Agent API
member, a command's own name, a value with neither `column` nor `key` --
has nothing to be compared with here. Word matching is about spelling: a key
whose words all appear in the screen word passes even when it means
something else.

MEASURED 2026-10-17 on e5d2b794 plus this change: 354 pairs (value 116,
key 60, screen 178), 41 differ, all 41 on the allow-list with a reason.
Renaming CM-87's value to `parentToleranceDays` gives 1 red; deleting the
allow-list line of K-77 gives 1 red.
--self-test feeds a matching, a mismatched, an allowed pair and a stale line.

Usage: python check-source-names.py [--self-test] [--list]
"""
import io
import os
import re
import sys
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import source_refs as sr  # noqa: E402

ALLOW = os.path.join(HERE, 'source-names-allow.txt')

# Words a screen label may carry that a key never spells.
STOP = {'of', 'the', 'a', 'an', 'to', 'in', 'on', 'per', 'by', 'and', 'for',
        'at', 'with', 'or', 'show'}
BOOLEAN_HEAD = ('is', 'has')

Pair = collections.namedtuple('Pair', 'kind where name spec_name source')


def words(text):
    """camelCase and spaces split, lower case, plural / -ed stripped."""
    out = set()
    for w in re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?![a-z])|[0-9]+', text):
        w = w.lower()
        if w.endswith('s') and len(w) > 3:
            w = w[:-1]
        elif w.endswith('ed') and len(w) > 4:
            w = w[:-2]
            if len(w) > 3 and w[-1] == w[-2]:       # planned -> plan
                w = w[:-1]
        out.add(w)
    return out


def key_words(key):
    w = words(key.split('.')[-1])
    head = re.match(r'^(is|has)(?=[A-Z])', key.split('.')[-1])
    if head:
        w.discard(head.group(1))
    return w


def screen_matches(key, label):
    k = key_words(key) - STOP
    s = words(label) - STOP
    return bool(k) and bool(s) and (k <= s or s <= k)


def key_matches(name, column):
    tail = column[0].upper() + column[1:]
    return (name == column or name.endswith(tail)
            or name.endswith(tail + 's'))


def cells(defs, rid):
    _t, f, ln = defs.index.row_owner[rid][0]
    return [c.strip() for c in
            defs.index.lines[f][ln - 1].strip().strip('|').split('|')]


def first_code(cell):
    m = re.search(r'`([^`]+)`', cell)
    return m.group(1) if m else cell


def pairs(defs):
    """Every (name, the name it points at) pair the manuscripts hold."""
    out = []
    settings_key = {}
    for block in sr.read_json(sr.SOURCE_DIR + '/settings.json')['blocks']:
        for row in block.get('rows', []):
            if 'id' in row and isinstance(row.get('key'), str):
                settings_key[row['id']] = first_code(row['key'])

    def spec_name(rid):
        if rid.startswith('S-'):
            return settings_key.get(rid, '?').split('.')[-1]
        return first_code(cells(defs, rid)[2])      # AT row: entity | column

    def walk(x, where):
        if isinstance(x, dict):
            here = x.get('id') if isinstance(x.get('id'), str) else where
            if 'fields' in x and isinstance(x.get('name'), str) \
                    and 'id' not in x:
                here = 'shape ' + x['name']
            name = x.get('name')
            if isinstance(name, str) and isinstance(x.get('column'), str):
                out.append(Pair('value', where, name, spec_name(x['column']),
                                x['column']))
            if isinstance(name, str) and isinstance(x.get('key'), str) \
                    and sr.ROW_ID.match(x['key']):
                out.append(Pair('key', where, name, spec_name(x['key']),
                                x['key']))
            for v in x.values():
                walk(v, here)
        elif isinstance(x, list):
            for v in x:
                walk(v, where)
    walk(sr.read_json(sr.SOURCE_DIR + '/document-commands.json'), '')

    shown = sr.read_json(sr.SOURCE_DIR + '/display-words.json')
    for e in shown['settings']:
        key = first_code(cells(defs, e['rowId'])[2])
        out.append(Pair('screen', e['rowId'], key, e['label']['en'],
                        'tbl-glossary.md'))
    items = {i['id']: i for i in
             sr.read_json(sr.SOURCE_DIR + '/property-items.json')['items']}
    for e in shown['properties']:
        for column in items[e['rowId']]['columns']:
            out.append(Pair('screen', e['rowId'], column, e['label']['en'],
                            'property-items.json'))
    return out


def matches(p):
    if p.kind == 'value':
        return p.name == p.spec_name
    if p.kind == 'key':
        return key_matches(p.name, p.spec_name)
    return screen_matches(p.name, p.spec_name)


def read_allow(path=ALLOW):
    """<kind> | <where> | <name> | <spec name> | <reason>"""
    out = {}
    for line in io.open(path, encoding='utf-8').read().splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        parts = [p.strip() for p in line.split('|')]
        if len(parts) != 5 or not parts[4]:
            raise SystemExit('source-names-allow.txt: a line needs <kind> | '
                             '<where> | <name> | <spec name> | <reason>: %r'
                             % line)
        out[tuple(parts[:4])] = parts[4]
    return out


def problems(all_pairs, allow):
    red, used = [], set()
    for p in all_pairs:
        if matches(p):
            continue
        key = (p.kind, p.where, p.name, p.spec_name)
        if key in allow:
            used.add(key)
            continue
        red.append('%s %s: %r does not match %r (%s)'
                   % (p.kind, p.where, p.name, p.spec_name, p.source))
    for key in sorted(set(allow) - used):
        red.append('stale allow-list line %s -- nothing it covers is left; '
                   'delete the line' % ' | '.join(key))
    return red


def self_test():
    ps = [Pair('value', 'CM-1', 'parentId', 'parentId', 'AT-52'),
          Pair('value', 'CM-2', 'targetTaskGroupId', 'parentId', 'AT-52'),
          Pair('key', 'CM-3', 'successorUid', 'uid', 'AT-24'),
          Pair('screen', 'K-1', 'fontSizeStep', 'Font Size', 'x'),
          Pair('screen', 'K-2', 'fontScale', 'Font Size', 'x'),
          Pair('screen', 'K-3', 'isDependencyVisible', 'Dependency Lines', 'x')]
    allow = {('screen', 'K-3', 'isDependencyVisible', 'Dependency Lines'): 'r',
             ('screen', 'K-9', 'gone', 'Gone'): 'stale'}
    red = problems(ps, allow)
    # CM-2 and K-2 mismatch, K-3 is allowed (its words differ: dependency /
    # dependency, line -- `visible` is the key's own), K-9 is stale.
    if len(red) != 3:
        sys.stdout.write('FAIL     check 84 self-test: %d red, want 3\n'
                         % len(red))
        for line in red:
            sys.stdout.write('  %s\n' % line)
        return 1
    sys.stdout.write('OK       check 84 self-test: two mismatches and a stale '
                     'line red, a match and an allowed pair pass\n')
    return 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    os.chdir(ROOT)
    all_pairs = pairs(sr.Definitions())
    if '--list' in argv:
        for p in all_pairs:
            if not matches(p):
                sys.stdout.write('%s | %s | %s | %s |\n'
                                 % (p.kind, p.where, p.name, p.spec_name))
        return 0
    allow = read_allow()
    red = problems(all_pairs, allow)
    for line in red:
        sys.stdout.write('  %s\n' % line)
    if red:
        sys.stdout.write('FAIL     %d name(s) in the _source JSON files do not '
                         'match what they point at\n' % len(red))
        return 1
    count = collections.Counter(p.kind for p in all_pairs)
    sys.stdout.write('OK       %d name pairs (value %d, key %d, screen %d): '
                     '%d match, %d differ with a reason on the allow-list\n'
                     % (len(all_pairs), count['value'], count['key'],
                        count['screen'], len(all_pairs) - len(allow),
                        len(allow)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
