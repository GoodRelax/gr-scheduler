# -*- coding: utf-8 -*-
"""Find names that are the head of another name, and refuse a new one.

The owner (2026-11-27, with JDG-3789): a new or provisional name must not have
the same form as the head of another name, and the check holds for every
other name too. A name H is the HEAD of a name N when the words of H are the
leading words of N and N has more words: `Refusal` is the head of
`RefusalReason`, `fix` is NOT the head of `fixed`.

WORDS. A name is cut at every character that is not a letter or a digit
(`Zoom to Fit`) and at every camelCase or PascalCase boundary (`zoomToFit`).
Words compare with the first letter folded (`refusal` = `Refusal`); a word
written all in capitals is an acronym and folds whole (`MSPDI` = `mspdi`).
Two names with the same words are one name (`Refusal` and `refusal`), never
a pair. A name with a letter outside ASCII (a Japanese label) has no words
here and is left out.

THE NAMES (groups; the kind says which part of the group holds the name)
    glossary          docs/spec/_source/glossary.json: term keys, label.en, xIdentifier
    glossaryDraft     studies/76-grs-json-beta-shape/terms/glossary-draft/glossary.json
    displayWords      docs/spec/_source/display-words.json: the en word of every label,
                      name, heading and milestoneLabel, and every plain name
    agentApi          docs/spec/_source/agent-api-members.json: members, arguments,
                      MCP-only keys, value types, fields, external types, the literal
                      values a type text writes
    documentCommands  docs/spec/_source/document-commands.json: commands, unions, values,
                      shapes, shape fields, discriminants, variant tags, enum values
    commandSchema     docs/spec/_source/grs-commands.schema.json: $defs names, property
                      keys, enum and const strings
    provisional       studies/76-grs-json-beta-shape/terms/agent-api-provisional-names.tsv:
                      the provisional names

BASELINE. tools/name-head-pairs-baseline.tsv holds the pairs that exist
today; a rename is refused only for a pair that is NOT in it. A person who
accepts a new pair writes the baseline again (--prefix-report
--write-baseline of tools/apply_contract_renames.py) and says why in the
commit.

Run with PYTHONIOENCODING=utf-8.
"""
import csv
import io
import json
import os
import re
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE = os.path.join(ROOT, 'tools', 'name-head-pairs-baseline.tsv')
SOURCE = os.path.join(ROOT, 'docs', 'spec', '_source')
TERMS = os.path.join(ROOT, 'studies', '76-grs-json-beta-shape', 'terms')
PROVISIONAL_TSV = os.path.join(TERMS, 'agent-api-provisional-names.tsv')
WORD = re.compile(r'[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+|[0-9]+')
LABEL_KEYS = ('label', 'name', 'heading', 'milestoneLabel')
PLAIN = re.compile(r'^[A-Za-z0-9][A-Za-z0-9 /-]*$')
LITERAL = re.compile(r"'([A-Za-z_$][A-Za-z0-9_$]*)'")
MAX_WORDS = 8


def read_json(path):
    return json.loads(io.open(path, encoding='utf-8').read())


def fold(word):
    if word.isupper() and len(word) > 1:
        return word.lower()
    return word[0].lower() + word[1:]


def words(name):
    """The folded words of a name, or () when the name is not plain ASCII."""
    name = name.replace(u'\u2026', '').strip()
    if not name or not PLAIN.match(name):
        return ()
    out = []
    for part in re.split(r'[^A-Za-z0-9]+', name):
        out.extend(fold(w) for w in WORD.findall(part))
    return tuple(out) if 0 < len(out) <= MAX_WORDS else ()


def spell(key):
    """One spelling for a set of words: camelCase."""
    return key[0] + ''.join(w[0].upper() + w[1:] for w in key[1:])


class Inventory(object):
    """{words: {'spellings': set, 'where': set of (group, kind)}}."""

    def __init__(self):
        self.names = OrderedDict()

    def add(self, group, kind, name):
        if not isinstance(name, str):
            return
        key = words(name)
        if not key:
            return
        one = self.names.setdefault(key, {'spellings': set(), 'where': set()})
        one['spellings'].add(name)
        one['where'].add((group, kind))

    def groups(self):
        return sorted({g for one in self.names.values() for g, _k in one['where']})


# ------------------------------------------------------------ the collectors

def collect_glossary(inv, path, group):
    if not os.path.exists(path):
        return

    def walk(x):
        if isinstance(x, dict):
            if isinstance(x.get('key'), str) and isinstance(x.get('label'), dict):
                inv.add(group, 'key', x['key'])
                inv.add(group, 'label', x['label'].get('en'))
                inv.add(group, 'identifier', x.get('xIdentifier'))
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    walk(read_json(path))


def collect_display_words(inv, path):
    def walk(x):
        if isinstance(x, dict):
            for key in LABEL_KEYS:
                v = x.get(key)
                if isinstance(v, dict):
                    inv.add('displayWords', key, v.get('en'))
                elif key == 'name':
                    inv.add('displayWords', key, v)
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    walk(read_json(path))


def collect_type_text(inv, group, text):
    for literal in LITERAL.findall(text or ''):
        inv.add(group, 'value', literal)


def collect_agent_api(inv, path):
    doc = read_json(path)
    g = 'agentApi'
    for name in doc.get('externalTypes', {}):
        inv.add(g, 'type', name)
    for member in doc['members']['rows']:
        inv.add(g, 'member', member['name'])
        collect_type_text(inv, g, member.get('returns'))
        for one in member['arguments'] + member.get('mcpOnlyKeys', []):
            inv.add(g, 'argument', one['name'])
            collect_type_text(inv, g, one['type'])
    for value in doc['values']['rows']:
        inv.add(g, 'type', value['name'])
        fields = list(value.get('fields', []))
        for variant in value.get('variants', []):
            fields.extend(variant.get('fields', []))
            collect_type_text(inv, g, variant.get('type'))
        for field in fields:
            inv.add(g, 'field', field['name'])
            collect_type_text(inv, g, field['type'])


def collect_document_commands(inv, path):
    doc = read_json(path)
    g = 'documentCommands'
    for name in doc.get('externalTypes', {}):
        inv.add(g, 'type', name)

    def values(items):
        for one in items:
            inv.add(g, 'property', one.get('name'))
            for literal in one.get('values', []):
                inv.add(g, 'value', literal)
    for row in doc['rows']:
        inv.add(g, 'command', row['name'])
        inv.add(g, 'type', row['union'])
        values(row['values'])
    for shape in doc['shapes']:
        inv.add(g, 'type', shape['name'])
        inv.add(g, 'property', shape.get('discriminant'))
        values(shape.get('fields', []))
        for variant in shape.get('variants', []):
            inv.add(g, 'value', variant['tag'])
            values(variant['fields'])


def collect_command_schema(inv, path):
    g = 'commandSchema'

    def walk(x):
        if isinstance(x, dict):
            for name in x.get('$defs', {}):
                inv.add(g, 'type', name)
            for name in x.get('properties', {}) if isinstance(x.get('properties'), dict) else ():
                inv.add(g, 'property', name)
            for literal in x.get('enum', []) if isinstance(x.get('enum'), list) else ():
                inv.add(g, 'value', literal)
            if isinstance(x.get('const'), str):
                inv.add(g, 'value', x['const'])
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    walk(read_json(path))


def provisional_rows(path=PROVISIONAL_TSV):
    if not os.path.exists(path):
        return []
    return list(csv.DictReader(io.open(path, encoding='utf-8'), delimiter='\t'))


def collect_provisional(inv, path=PROVISIONAL_TSV):
    for row in provisional_rows(path):
        inv.add('provisional', 'provisional', row.get('provisionalName'))


def inventory(extra=()):
    """Every name of the groups above, plus `extra` [(group, kind, name)]."""
    inv = Inventory()
    collect_glossary(inv, os.path.join(SOURCE, 'glossary.json'), 'glossary')
    collect_glossary(inv, os.path.join(TERMS, 'glossary-draft', 'glossary.json'), 'glossaryDraft')
    collect_display_words(inv, os.path.join(SOURCE, 'display-words.json'))
    collect_agent_api(inv, os.path.join(SOURCE, 'agent-api-members.json'))
    collect_document_commands(inv, os.path.join(SOURCE, 'document-commands.json'))
    collect_command_schema(inv, os.path.join(SOURCE, 'grs-commands.schema.json'))
    collect_provisional(inv)
    for group, kind, name in extra:
        inv.add(group, kind, name)
    return inv


# ------------------------------------------------------------------ the pairs

def head_pairs(inv, only=None):
    """[(head words, name words)]; with `only`, just the pairs one of whose
    ends is in `only` (a set of word tuples)."""
    keys = set(inv.names)
    pairs = []
    for key in sorted(keys):
        if only is not None and key not in only:
            # `key` can still be the longer name of a pair whose head is new.
            heads = [key[:n] for n in range(1, len(key)) if key[:n] in only]
            pairs.extend((h, key) for h in heads if h in keys)
            continue
        for n in range(1, len(key)):
            if key[:n] in keys:
                pairs.append((key[:n], key))
    return sorted(set(pairs))


def pair_line(pair):
    return '%s\t%s' % (spell(pair[0]), spell(pair[1]))


def load_baseline(path=BASELINE):
    if not os.path.exists(path):
        return set()
    out = set()
    for line in io.open(path, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line or line.startswith('#'):
            continue
        head, name = line.split('\t')
        out.add((words(head), words(name)))
    return out


def write_baseline(pairs, path=BASELINE):
    lines = ['# The name pairs where one name is the head of another, as they were when this file was written.',
             '# Written by: python tools/apply_contract_renames.py --prefix-report --write-baseline',
             '# A rename that makes a pair NOT listed here is refused (tools/name_heads.py).',
             '# head<TAB>name, each spelled camelCase from its words.']
    io.open(path, 'w', encoding='utf-8', newline='').write(
        '\n'.join(lines + [pair_line(p) for p in pairs]) + '\n')


def new_pairs(names, inv=None, baseline=None):
    """The head pairs a set of new names makes that the baseline lacks:
    [(pair, (group, kind) of the new name)]."""
    inv = inv or inventory()
    for name in names:
        inv.add('new', 'new', name)
    baseline = load_baseline() if baseline is None else baseline
    only = {words(n) for n in names if words(n)}
    return [p for p in head_pairs(inv, only) if p not in baseline]


def summary(inv, pairs):
    """Counts: per group (both ends in it), across groups, and per kind pair."""
    per_group, kinds = OrderedDict(), OrderedDict()
    across = 0
    for head, name in pairs:
        hw, nw = inv.names[head]['where'], inv.names[name]['where']
        shared = {g for g, _k in hw} & {g for g, _k in nw}
        if not shared:
            across += 1
        for g in sorted(shared):
            per_group[g] = per_group.get(g, 0) + 1
        for kind in sorted({'%s:%s > %s:%s' % (hg, hk, ng, nk)
                            for hg, hk in hw for ng, nk in nw if hg == ng}):
            kinds[kind] = kinds.get(kind, 0) + 1
    return per_group, across, kinds


def self_test():
    """[problem] for the word rules; empty when all hold."""
    bad = []
    cases = [('RefusalReason', ('refusal', 'reason')), ('zoomToFit', ('zoom', 'to', 'fit')),
             ('Zoom to Fit', ('zoom', 'to', 'fit')), ('MSPDIImport', ('mspdi', 'import')),
             ('pxPerDayAt1x', ('px', 'per', 'day', 'at', '1', 'x')), (u'\u958b\u304f', ())]
    for name, wanted in cases:
        if words(name) != wanted:
            bad.append('words(%r) = %r, wanted %r' % (name, words(name), wanted))
    inv = Inventory()
    for name in ('Refusal', 'refusal', 'RefusalReason', 'fix', 'fixed', 'Fit', 'Fit All'):
        inv.add('t', 'k', name)
    got = [pair_line(p) for p in head_pairs(inv)]
    if got != ['fit\tfitAll', 'refusal\trefusalReason']:
        bad.append('head pairs %r' % got)
    baseline = {(words('Refusal'), words('RefusalReason'))}
    fresh = [pair_line(p) for p in new_pairs(['RefusalCode', 'fixedPoint', 'fitAllDay'], inv, baseline)]
    if fresh != ['fit\tfitAllDay', 'fitAll\tfitAllDay', 'fixed\tfixedPoint', 'refusal\trefusalCode']:
        bad.append('new pairs %r' % fresh)
    if new_pairs(['RefusalReason'], inv, baseline):
        bad.append('a pair in the baseline was refused')
    return bad
