# -*- coding: utf-8 -*-
"""Move the draft names dictionary into the terms[] shape of CR-857 (one run).

    python migrate_to_terms_array.py SETTLED_PATCH CONTRACT_CHECK RULING_BASIS [CONTRACT_PATCH] [--write]

READS   glossary.json beside this file (the draft tree: groups[] holding
        terms[] and sub-groups[], terms holding children[]),
        SETTLED_PATCH  (JSON: the 113 settled terms of Parts 1..5, JDG-3513),
        CONTRACT_CHECK (TSV: each contract term checked against the frozen
                        GRS JSON, document commands and Agent API names),
        RULING_BASIS   (TSV, optional: the rulings in which the owner chose
                        or approved the name of a screen, settings or
                        development term; keyed by the new key).
        The three inputs were made by reading the sources named in CR-857,
        section 4; the scripts that made them sit in the session that ran
        this migration, and their counts are in CR-857, section 7.
WRITES  docs/spec/_source/glossary.json (only with --write; otherwise it
        prints the counts and the problems).

THE KEY RULE (CR-857, section 3). The NDD review standard (appendix A.6) asks
for a camelCase key that is unique across terms[]. The draft keyed a term by
its written name plus an owner, and wrote type names in PascalCase.
  K1  A written name in camelCase keeps itself as the key.
  K2  A written name starting with capitals lowers its leading run:
      Task -> task, SSOT -> ssot, JSONSchema -> jsonSchema, ISO8601 -> iso8601.
  K3  A term with an owner takes owner + name: kind under Color -> colorKind.
  K4  When K2 lands on the key of another term without an owner, the term
      whose written name is a type (PascalCase) takes the suffix Type:
      Task -> taskType beside the concept task.
  K5  When an owner term (K3) still shares its key with a K4 key, the owner
      term takes the suffix Property: type under Color -> colorTypeProperty
      beside the type Color -> colorType.
The written name itself stays in label.en, or in identifier when label.en is
a display name and the key is not the written name, so no name GRS prints or
writes changes.

THE LABEL RULE. A term without a label (a person reads the written name) gets
label { en: written name, ja: written name }.

This script is the migration only. After CR-857 lands, glossary.json is the
single source of truth and is edited by hand; this script is not run again.
"""
import csv
import io
import json
import os
import re
import sys
from collections import Counter, OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
DRAFT = os.path.join(HERE, 'glossary.json')
OUT = os.path.join(ROOT, 'docs', 'spec', '_source', 'glossary.json')
TERM_FIELDS = ['key', 'label', 'definition', 'avoid', 'renames', 'group',
               'parent', 'identifier', 'owner', 'basis', 'specTableRowId', 'since',
               'expansion', 'nonLiteral', 'usage', 'uses', 'tags']
# The standard (20261123T220647Z) names checkedBasis; a project key starts with x.
X_KEYS = {'group': 'xGroup', 'parent': 'xParent', 'identifier': 'xIdentifier', 'owner': 'xOwner', 'basis': 'checkedBasis', 'specTableRowId': 'xSpecTableRowId', 'since': 'xSince', 'expansion': 'xExpansion', 'nonLiteral': 'xNonLiteral', 'usage': 'xUsage', 'uses': 'xUses', 'tags': 'xTags'}
CAMEL = re.compile(r'^[a-z][A-Za-z0-9]*$')
JDG = re.compile(r'JDG-[0-9]+')

COMMENT = [
    'SINGLE SOURCE OF TRUTH -- EDIT THIS FILE.',
    'The names dictionary (CR-857; JDG-3411, JDG-3419): every name GRS uses, one entry of terms[] per term. English is the primary text and Japanese its translation (JDG-3422, JDG-3825). Order is array position only (JDG-3423): a definition uses only names defined earlier, and a child term follows its parent.',
    'checkedBasis lists the rulings that record a person\'s check of the term (NDD review standard, Glossary). A term without checkedBasis waits for the owner\'s check (study 82, stage B3). A key the project adds starts with x, as the standard asks.',
    'Validated by docs/development-rules/manuscript-schemas/glossary.schema.json and by docs/spec/_source/glossary_json_to_md.py, which also prints the review tables. Check: npm run glossary:check.',
]


# Terms the owner defined with JDG-3660 (the task group tree, 2026-11-21),
# after the Parts 1..5 settlement.
TREE_TERMS = ('root', 'depth', 'topLevel', 'topLevelTaskGroup', 'parent',
              'child', 'below', 'ancestor')
RENAME_REASON = {
    'rowId': {
        'en': 'The name says that the value names a row of a specification table, apart from a StrictDoc requirement ID.',
        'ja': '値が仕様書の表の 1 行を名指す番号で、StrictDoc の要求 ID とは別だと、名で言う。'},
    'delayDiagnostics': {
        'en': 'The feature diagnoses the delay as of one status date; diagnostics names the results, diagnosis names the act and its conclusion.',
        'ja': '機能は 1 つの基準日について遅れを診断して結論を出す。diagnostics は結果を、diagnosis は行いと結論を指す。'},
}


def find_term(groups, key):
    """(the list holding the term, its index) for the first term written key."""
    for group in groups:
        for holder in [group.get('terms', [])]:
            stack = [holder]
            while stack:
                items = stack.pop()
                for index, term in enumerate(items):
                    if term['key'] == key and 'owner' not in term:
                        return items, index
                    stack.append(term.get('children', []))
        found = find_term(group.get('groups', []), key)
        if found:
            return found
    return None


def apply_settled_structure(draft, patch, problems):
    """Apply the structural rulings of the settled Parts 1..5 to the draft
    tree in memory: two renames (JDG-3491, JDG-3512), two new terms
    (JDG-3516, JDG-3490), one split (JDG-3508) and one merge (JDG-3512).
    Return {new written name: (former written name, basis)}."""
    renames = {}
    for fix in patch['terms']:
        if 'newKey' not in fix:
            continue
        place = find_term(draft['groups'], fix['key'])
        if place is None:
            problems.append('rename: no draft term %s' % fix['key'])
            continue
        items, index = place
        items[index]['key'] = fix['newKey']
        items[index]['_rename'] = (fix['key'], [j for j in fix['basis'] if j != 'JDG-3513'][-1:])
        renames[fix['newKey']] = items[index]['_rename']
        fix['key'] = fix['newKey']
    proposed = {u['key']: u['proposed'] for u in patch['unmatched']}

    def new_term(key, uses):
        entry = proposed[key]
        term = OrderedDict([('key', key)])
        if 'label' in entry:
            term['label'] = entry['label']
        term['definition'] = entry['definition']
        term['uses'] = uses
        patch['terms'].append(OrderedDict(
            [('key', key), ('basis', entry['basis']), ('definition', entry['definition'])]
            + ([('label', entry['label'])] if 'label' in entry else [])))
        return term

    items, index = find_term(draft['groups'], 'SoC')
    items.insert(index, new_term('DivideAndConquer', ['spec']))
    items, index = find_term(draft['groups'], 'ResourceEfficiency')
    items.insert(index + 1, new_term('AffirmativeActiveWording', ['spec']))
    items, index = find_term(draft['groups'], 'doubtfulOrMissing')
    uses = items[index]['uses']
    items[index:index + 1] = [new_term('suspicion', uses), new_term('omission', uses)]
    items, index = find_term(draft['groups'], 'diagnosableDelay')
    merged = items.pop(index)
    target_items, target_index = find_term(draft['groups'], 'delayDiagnosis')
    target = target_items[target_index]
    if 'rowId' in merged and 'rowId' not in target:
        target['rowId'] = merged['rowId']
    elif 'rowId' in merged:
        problems.append('merge: diagnosableDelay row %s has no home' % merged['rowId'])
    for group in draft['groups']:
        if group['key'] == 'values':
            group['tags'] = ['delayDiagnosis']
    for key in TREE_TERMS:
        patch['terms'].append({'key': key, 'basis': ['JDG-3660'], 'keepText': True})
    return renames


CONTRACT_REASON = {
    'en': 'The owner settled this name in the frozen contract (GRS JSON beta or the Agent API names) after the draft was written.',
    'ja': '下書きの後に、持ち主が凍結した契約（GRS JSON の beta、または Agent API の名）でこの名に決めた。'}


def find_pair(groups, key, owner):
    """(the list holding the term, its index) for the term (key, owner)."""
    for group in groups:
        stack = [group.get('terms', [])]
        while stack:
            items = stack.pop()
            for index, term in enumerate(items):
                if (term['key'], term.get('owner')) == (key, owner) or term.get('_pair') == (key, owner):
                    return items, index
                stack.append(term.get('children', []))
        found = find_pair(group.get('groups', []), key, owner)
        if found:
            return found
    return None


def apply_contract_patch(draft, cpatch, problems):
    """Make the draft carry the names of the frozen contracts (JDG-3807,
    JDG-3781): the renames, additions and removals the owner ruled."""
    for fix in cpatch.get('rename', []):
        place = find_pair(draft['groups'], fix['key'], fix.get('owner'))
        if place is None:
            problems.append('contract rename: no draft term %s@%s' % (fix['key'], fix.get('owner')))
            continue
        term = place[0][place[1]]
        if fix['newKey'] != fix['key'] and '_rename' not in term:
            term['_rename'] = (fix['key'], fix.get('renameBasis') or fix.get('basis'))
        term['key'] = fix['newKey']
        if fix.get('newOwner'):
            term['owner'] = fix['newOwner']
        else:
            term.pop('owner', None)
        if fix.get('definition'):
            term['definition'] = fix['definition']
        term['_basis'] = list(fix.get('basis') or [])
        term['_patched'] = True
    for fix in cpatch.get('drop', []):
        place = find_pair(draft['groups'], fix['key'], fix.get('owner'))
        if place is None:
            problems.append('contract drop: no draft term %s@%s' % (fix['key'], fix.get('owner')))
            continue
        items, index = place
        gone = items.pop(index)
        if gone.get('children'):
            problems.append('contract drop: %s had %d child term(s), dropped with it'
                            % (fix['key'], len(gone['children'])))
    waiting = list(cpatch.get('add', []))
    while waiting:
        placed = place_additions(draft, waiting)
        if not placed:
            break
        waiting = [fix for fix in waiting if id(fix) not in placed]
    for fix in waiting:
        problems.append('contract add: no place for %s@%s' % (fix['key'], fix.get('owner')))


def place_additions(draft, waiting):
    """Place each addition whose anchor exists; return the ids placed."""
    placed = set()
    for fix in waiting:
        term = OrderedDict([('key', fix['key'])])
        if fix.get('owner'):
            term['owner'] = fix['owner']
        if fix.get('label'):
            term['label'] = fix['label']
        term['definition'] = fix['definition']
        if fix.get('since'):
            term['since'] = fix['since']
        term['uses'] = fix['uses']
        term['_basis'] = list(fix.get('basis') or [])
        term['_patched'] = True
        if fix.get('parentKey'):
            place = find_pair(draft['groups'], fix['parentKey'], fix.get('parentOwner'))
            if place is None:
                place = find_term(draft['groups'], fix['parentKey'])
            if place is not None:
                place[0][place[1]].setdefault('children', []).append(term)
                placed.add(id(fix))
                continue
        place = find_pair(draft['groups'], fix.get('afterKey'), fix.get('afterOwner'))
        if place is None:
            continue
        place[0].insert(place[1] + 1, term)
        placed.add(id(fix))
    return placed


def lower_head(name):
    run = re.match(r'^([A-Z]+)(?=[A-Z][a-z]|[0-9]|$)', name)
    if run and len(run.group(1)) > 1:
        return run.group(1).lower() + name[len(run.group(1)):]
    return name[0].lower() + name[1:]


def upper_first(name):
    return name[0].upper() + name[1:]


def flatten(draft):
    groups, terms = [], []

    def walk_terms(items, group_key, parent):
        for term in items:
            terms.append((group_key, parent, term))
            walk_terms(term.get('children', []), group_key, term)

    def walk_groups(items, parent_key):
        for group in items:
            entry = OrderedDict([('key', group['key'])])
            if parent_key:
                entry['parent'] = parent_key
            entry['title'] = group['title']
            if 'description' in group:
                entry['description'] = group['description']
            if 'tags' in group:
                entry['tags'] = group['tags']
            groups.append(entry)
            walk_terms(group.get('terms', []), group['key'], None)
            walk_groups(group.get('groups', []), group['key'])

    walk_groups(draft['groups'], None)
    return groups, terms


def assign_keys(terms):
    """Return {id(term): new key} by rules K1..K4, and the problems."""
    base = {}
    for _, _, term in terms:
        written = term['key']
        if 'owner' in term:
            base[id(term)] = lower_head(term['owner']) + upper_first(written)
        else:
            base[id(term)] = written if CAMEL.match(written) else lower_head(written)
    counts = Counter(base.values())
    keys = {}
    for _, _, term in terms:
        key = base[id(term)]
        if counts[key] > 1 and not CAMEL.match(term['key']) and 'owner' not in term:
            key += 'Type'
        keys[id(term)] = key
    counts = Counter(keys.values())
    for _, _, term in terms:
        if counts[keys[id(term)]] > 1 and 'owner' in term:
            keys[id(term)] += 'Property'
    again = Counter(keys.values())
    problems = ['key %s is still shared by %d terms' % (k, n)
                for k, n in again.items() if n > 1]
    return keys, problems


def load_contract(path):
    rows = {}
    with io.open(path, encoding='utf-8', newline='') as handle:
        for row in csv.DictReader(handle, delimiter='\t'):
            rows[(row['key'], row.get('owner') or None)] = row
    return rows


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    patch = json.load(io.open(sys.argv[1], encoding='utf-8'))
    contract = load_contract(sys.argv[2])
    ruled = {}
    paths = [a for a in sys.argv[3:] if not a.startswith('--')]
    if paths:
        with io.open(paths[0], encoding='utf-8', newline='') as handle:
            for row in csv.DictReader(handle, delimiter='\t'):
                ruled[row['key']] = row
    draft = json.load(io.open(DRAFT, encoding='utf-8'))
    problems = []
    for _, _, term in flatten(draft)[1]:
        term['_pair'] = (term['key'], term.get('owner'))
    renames = apply_settled_structure(draft, patch, problems)
    cpaths = [a for a in sys.argv[4:] if not a.startswith('--')]
    if cpaths:
        apply_contract_patch(draft, json.load(io.open(cpaths[0], encoding='utf-8')), problems)
    groups, terms = flatten(draft)
    group_keys = Counter(g['key'] for g in groups)
    problems += ['group key %s written %d times' % (k, n)
                 for k, n in group_keys.items() if n > 1]
    keys, key_problems = assign_keys(terms)
    problems += key_problems
    by_pair = {(t['key'], t.get('owner')): t for _, _, t in terms}
    by_pair.update({t['_pair']: t for _, _, t in terms if '_pair' in t and t['_pair'] not in by_pair})
    aliases = {former: new for new, (former, _) in renames.items()}
    aliases['diagnosableDelay'] = 'delayDiagnosis'
    settled = {(p['key'], p.get('owner')): p for p in patch['terms']}
    used_settled, used_contract = set(), set()
    out_terms = []
    for group_key, parent, term in terms:
        pair = (term['key'], term.get('owner'))
        entry = {}
        entry['key'] = keys[id(term)]
        entry['label'] = term.get('label') or OrderedDict(
            [('en', term['key']), ('ja', term['key'])])
        entry['definition'] = term['definition']
        if 'avoid' in term:
            avoid = OrderedDict((lang, words) for lang, words in term['avoid'].items() if words)
            if avoid:
                entry['avoid'] = avoid
        if term['key'] not in (entry['key'], entry['label']['en']):
            entry['identifier'] = term['key']
        entry['group'] = group_key
        if parent is not None:
            entry['parent'] = keys[id(parent)]
        if 'owner' in term:
            entry['owner'] = term['owner']
        basis = []
        fix = settled.get(pair)
        if fix:
            used_settled.add(pair)
            if not fix.get('keepText'):
                entry['definition'] = fix['definition']
                if 'label' in fix:
                    entry['label'] = fix['label']
                if 'expansion' in fix:
                    entry['expansion'] = fix['expansion']
            basis += fix.get('basis', [])
        basis += term.get('_basis', [])
        row = contract.get(term.get('_pair'))
        if row:
            used_contract.add(term['_pair'])
            if row['status'] == 'renamed' and row['newName'] == term['key']:
                term['_patched'] = True
            if row['status'] == 'match' or (row['status'] == 'renamed' and '_patched' in term):
                basis += JDG.findall(row.get('basis', ''))
            if row['status'] == 'renamed' and '_patched' not in term:
                problems.append('renamed in the contract, not applied here: %s -> %s (%s)'
                                % ('@'.join(x for x in pair if x), row['newName'], row['basis']))
        found = ruled.get(entry['key'])
        if found and found['status'] == 'checked':
            basis += JDG.findall(found['basis'])
        elif found and found['status'] == 'conflict':
            problems.append('the owner chose another name for %s: %s (%s)'
                            % (entry['key'], found['evidence'], found['basis']))
        if basis:
            entry['basis'] = sorted(set(basis), key=lambda j: int(j[4:]))
        if '_rename' in term:
            former, rename_basis = term['_rename']
            reason = RENAME_REASON.get(former, CONTRACT_REASON)
            version = 'CR-857' if former in RENAME_REASON else 'GRS JSON beta / Agent API names'
            entry['renames'] = [OrderedDict([
                ('from', former), ('version', version),
                ('reason', reason), ('basis', rename_basis)])]
        if 'rowId' in term:
            entry['specTableRowId'] = term['rowId']
        for name in ('since', 'nonLiteral', 'usage'):
            if name in term:
                entry[name] = term[name]
        entry['uses'] = term['uses']
        if term.get('tags'):
            tags = []
            for tag in term['tags']:
                tag_key = aliases.get(tag['key'], tag['key']) if 'owner' not in tag else tag['key']
                target = by_pair.get((tag_key, tag.get('owner')))
                if target is term:
                    continue
                if target is None and 'owner' not in tag:
                    near = [t for (k, o), t in by_pair.items()
                            if o is None and k.lower() == tag['key'].lower()]
                    if len(near) == 1:
                        target = near[0]
                        problems.append('tag of %s fixed by letter case: %s -> %s'
                                        % (entry['key'], tag['key'], target['key']))
                if target is None:
                    problems.append('tag of %s names nothing: %s' % (entry['key'], tag))
                    continue
                tags.append(keys[id(target)])
            if tags:
                entry['tags'] = tags
        out_terms.append(OrderedDict((X_KEYS.get(f, f), entry[f]) for f in TERM_FIELDS if f in entry))
    problems += ['settled row matched no draft term: %s' % (k,)
                 for k in settled if k not in used_settled]
    doc = OrderedDict([
        ('$schema', '../../development-rules/manuscript-schemas/glossary.schema.json'),
        ('$comment', COMMENT),
        ('xGroups', groups),
        ('terms', out_terms),
    ])
    checked = sum(1 for t in out_terms if 'checkedBasis' in t)
    print('groups %d, terms %d, with basis %d, without basis %d'
          % (len(groups), len(out_terms), checked, len(out_terms) - checked))
    print('settled applied %d / %d, contract rows used %d / %d'
          % (len(used_settled), len(settled), len(used_contract), len(contract)))
    for p in problems:
        print('  ' + p)
    if '--write' in sys.argv:
        text = json.dumps(doc, ensure_ascii=False, indent=1) + '\n'
        # The notation table (rule 02, section 5) gates this spelling; the
        # draft predates the gate (check 32). Written as escapes: ASCII code.
        text = text.replace(u'フィルター', u'フィルタ')
        io.open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
        print('wrote ' + os.path.relpath(OUT, ROOT).replace('\\', '/'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
