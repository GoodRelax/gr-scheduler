r"""List every old name that the settled beta names replace, and where each old name occurs.

Use (from the repository root):  python studies/83-beta-rename-inventory/extract_renames.py

Reads (all inside the repository):
  - studies/76-grs-json-beta-shape/terms/grs-json-beta-schema-sources.tsv   beta key -> draft/alpha pointers
  - studies/76-grs-json-beta-shape/doc-shape-map.tsv                        draft pointer -> alpha pointer
  - studies/76-grs-json-beta-shape/terms/grs-json-beta.schema.json          the settled beta schema (JDG-3807)
  - docs/spec/_source/grs-document.schema.json                              the current (alpha) schema
  - studies/76-grs-json-beta-shape/commands-map.tsv                         alpha command -> draft command
  - studies/76-grs-json-beta-shape/terms/agent-api-names-by-policy-draft.md draft command / Agent API name -> settled name (JDG-3781)
  - studies/76-grs-json-beta-shape/terms/6-cr855-handoff.md                 retired screen words (JDG-3351..3379)

Writes next to this file:
  - renames.tsv      one row per (old name, new name, context)
  - occurrences.tsv  one row per (old name, counted pattern, file) with the line numbers

Search areas (git ls-files, so ignored files are never counted):
  source   docs/spec/_source/** except glossary.json
  spec     docs/spec/*.md and docs/spec/_assets/*.md
  src      src/**
  tests    tests/**
  glossary docs/spec/_source/glossary.json (the names dictionary of CR-857; the older draft under studies is not read)

Search pattern of an ASCII name: case-sensitive, the name not glued to another identifier character
  (?<![A-Za-z0-9_$])NAME(?![A-Za-z0-9_$])
For a "generic" name (one lowercase English word, such as order or which) the plain pattern also hits
prose and unrelated code, so a second, narrower "key form" pattern is counted as well and used for
occurrences.tsv:
  ["'`]NAME["'`]  |  \.NAME(?![A-Za-z0-9_$])  |  (?<![A-Za-z0-9_$.])NAME\??\s*:
Japanese screen words use the handoff's own regular expression, case-sensitive.
"""
import csv
import io
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..'))
S76 = os.path.join(REPO, 'studies', '76-grs-json-beta-shape')
TERMS = os.path.join(S76, 'terms')

ID_CHAR = r'A-Za-z0-9_$'


def read_tsv(path, skip_comments=True):
    with io.open(path, encoding='utf-8') as f:
        lines = [ln.rstrip('\r\n') for ln in f]
    if skip_comments:
        lines = [ln for ln in lines if not ln.startswith('#')]
    return [ln.split('\t') for ln in lines if ln.strip()]


def jdgs(text):
    seen = []
    for j in re.findall(r'JDG-\d+', text or ''):
        if j not in seen:
            seen.append(j)
    return seen


def leaf_of_pointer(ptr):
    """Last property name of a schema pointer, or None when the pointer ends at a type."""
    ptr = re.sub(r'\s.*$', '', ptr.strip())
    m = re.findall(r'/properties/([^/]+)', ptr)
    if not m or not ptr.rstrip('/').endswith(m[-1]):
        return None
    return m[-1]


def leaf_of_path(path):
    last = path.split('.')[-1]
    return last.replace('[]', '')


# ---------------------------------------------------------------- GRS JSON keys and values

def resolve(schema, ptr):
    node = schema
    for tok in ptr.strip('/').split('/'):
        tok = tok.replace('~1', '/').replace('~0', '~')
        if isinstance(node, dict) and tok in node:
            node = node[tok]
        else:
            return None
    return node


def enum_of(schema, node, depth=0):
    if node is None or depth > 10 or not isinstance(node, dict):
        return None
    if 'enum' in node:
        return list(node['enum'])
    if '$ref' in node:
        return enum_of(schema, resolve(schema, node['$ref'][1:]), depth + 1)
    if 'items' in node:
        return enum_of(schema, node['items'], depth + 1)
    if 'const' in node and isinstance(node['const'], str):
        return None
    return None


def beta_node(beta, path):
    """Walk the beta schema along a dotted instance path such as scheduleData.tasks[].grs.style.taskShape."""
    node = beta
    parts = path.split('.')
    if parts[0] in beta.get('$defs', {}):
        node = beta['$defs'][parts[0]]
        parts = parts[1:]
    for part in parts:
        key = part.replace('[]', '')
        node = eff(beta, node)
        props = node.get('properties', {})
        if key not in props:
            return None
        node = props[key]
        if part.endswith('[]'):
            node = eff(beta, node).get('items', {})
    return node


def eff(schema, node, depth=0):
    if not isinstance(node, dict) or depth > 20:
        return {}
    if '$ref' in node:
        base = dict(eff(schema, resolve(schema, node['$ref'][1:]), depth + 1))
        base.update({k: v for k, v in node.items() if k != '$ref'})
        return base
    if node.get('allOf') and '$ref' in node['allOf'][0] and 'properties' not in node:
        base = dict(eff(schema, resolve(schema, node['allOf'][0]['$ref'][1:]), depth + 1))
        base.update({k: v for k, v in node.items() if k != 'allOf'})
        return base
    return node


TYPE_RENAMES = [
    # alpha $defs name, beta $defs name, rulings, note
    ('documentStamp', 'DocumentStamp', 'JDG-3712', ''),
    ('changeLog', 'ChangeLogEntry', 'JDG-3712', ''),
    ('Dependency', 'PredecessorLink', 'JDG-3604', ''),
    ('TaskVisual', 'TaskStyle', 'JDG-3384;JDG-3699', 'TaskVisual rows move under tasks[].grs.style'),
    ('TaskOrigin', 'ImportOrigin', 'JDG-3710', 'moves under tasks[].grs.importOrigin'),
    ('Carry', 'Passthrough', 'JDG-3606;JDG-3748', 'moves under <entity>.grs.passthrough'),
    ('CarryElement', 'MspdiElement', 'JDG-3606;JDG-3613;JDG-3807',
     'no ruling names the pair; the shape is fixed by JDG-3606 (MSPDI structure and element names, no ordinal, a repeatable element is always an array) '
     'and JDG-3613 (mspdiElement), and $defs/MspdiElement of the frozen schema (JDG-3807) is the type'),
    ('TaskGroupMember', '(removed)', 'JDG-3614', 'replaced by tasks[].grs.taskGroupId'),
]


TREE_NOTE = ('CHECK (the CR-851 applying seat decides; the owner sees it in the CR-851 row review): a rule for the alpha-to-beta converter HTML '
             '(CR-851 section 4.1, JDG-3306, JDG-3307); GRS itself refuses an alpha file. An alpha value speaks of the group\'s children, a beta '
             'value of the band itself, so a parent\'s alpha value becomes its children\'s beta value; an own alpha hidden stays hidden. '
             'See README.md, open point 3')


VALUE_OVERRIDES = [
    # alpha key, alpha value, beta value, extra ruling, note
    ('shapeKind', 'endpointSpan', 'dumbbell', 'JDG-3711', ''),
    ('shapeKind', 'milestone', '(removed)', 'JDG-3711', 'a milestone takes milestoneShape instead of a task shape'),
    ('treeState', 'auto', 'proposal: automatic (the group and its children keep automatic)', 'JDG-3662', TREE_NOTE),
    ('treeState', 'collapsed', 'proposal: the group automatic, each child hiddenUntilZoomIn', 'JDG-3663', TREE_NOTE),
    ('treeState', 'expanded', 'proposal: the group automatic, each child shown', 'JDG-3663', TREE_NOTE),
    ('treeState', 'temporarilyExpanded', 'proposal: the group automatic, each child shown', 'JDG-3663;JDG-3664;JDG-3677', TREE_NOTE),
]


KEY_EXTRA = [
    # alpha key, beta key, context, rulings, note
    ('carry', 'passthrough', '<entity>.grs.passthrough  <-  alpha /$defs/<entity>/properties/carry ($defs/Carry)', 'JDG-3606;JDG-3748', ''),
    ('carryElements', 'passthrough',
     '<entity>.grs.passthrough  <-  alpha /$defs/<entity>/properties/carryElements', 'JDG-3606;JDG-3748',
     'unknown child elements of an entity go to that entity\'s grs.passthrough; all 8 entities have it (Project, Calendar, WeekDay, Exception, Task, '
     'PredecessorLink, Resource, Assignment). scheduleData.passthroughCalendars/Tasks/Resources/Assignments[] (JDG-3613, JDG-3750) are a different thing: '
     'whole list elements that GRS makes no row for'),
    ('children', '(removed)', 'alpha /$defs/CarryElement/properties/children', 'JDG-3606', 'MspdiElement is keyed by child element names'),
    ('fields', '(removed)', 'alpha /$defs/CarryElement/properties/fields', 'JDG-3606', 'MspdiElement is keyed by child element names'),
    ('isFitSpanFixed', 'type', 'documentSettings.fitDayRange.type ("fixed" / "automatic")  <-  alpha /properties/documentSettings/properties/isFitSpanFixed',
     'JDG-3708;JDG-3744', 'a boolean becomes a discriminator value'),
    ('levelZeroTreeState', '(removed)', 'alpha /properties/documentSettings/properties/levelZeroTreeState', 'JDG-3602;JDG-3664',
     'JDG-3602 renamed it rootTreeState, then JDG-3664 removed the root show state'),
    ('taskGroupMembers', '(removed)', 'scheduleData.tasks[].grs.taskGroupId  <-  alpha /properties/schedule/properties/taskGroupMembers', 'JDG-3614', ''),
    ('taskOrigins', 'importOrigin', 'scheduleData.tasks[].grs.importOrigin  <-  alpha /properties/schedule/properties/taskOrigins', 'JDG-3710', ''),
    ('taskVisuals', 'style', 'scheduleData.tasks[].grs.style  <-  alpha /properties/schedule/properties/taskVisuals', 'JDG-3384;JDG-3699', ''),
]


def grs_json_rows():
    beta = json.load(io.open(os.path.join(TERMS, 'grs-json-beta.schema.json'), encoding='utf-8'))
    alpha = json.load(io.open(os.path.join(REPO, 'docs', 'spec', '_source', 'grs-document.schema.json'), encoding='utf-8'))
    src_rows = read_tsv(os.path.join(TERMS, 'grs-json-beta-schema-sources.tsv'))
    dsm = read_tsv(os.path.join(S76, 'doc-shape-map.tsv'))
    head = dsm[0]
    i_old, i_new, i_why = head.index('element_old'), head.index('element_new'), head.index('why')
    new2old = {}
    removed = []
    for r in dsm[1:]:
        old, new = r[i_old], r[i_new]
        if new == '-' and old != '-':
            removed.append((old, r[i_why]))
        for one in new.split(' ; '):
            new2old.setdefault(one.strip(), []).append((old, r[i_why]))

    rows = []
    mapped_old_leaves = set()
    unmapped_beta = []
    value_rows = []
    for r in src_rows[1:]:
        if len(r) < 6:
            r = r + [''] * (6 - len(r))
        path, sources = r[0], r[5]
        if ':' in path.split('.')[0] and not path.startswith('$'):
            continue  # section headings such as settings:documentSettings
        if '.' not in path and path in beta.get('$defs', {}):
            continue  # a type row; type names are listed in TYPE_RENAMES
        new_leaf = leaf_of_path(path)
        pointers = []
        for a in re.findall(r'alpha:(/[^;\s)]+)', sources):
            pointers.append(('alpha', a, ''))
        for d in re.findall(r'dsm:(/[^;\s)]+)', sources):
            for old, why in new2old.get(d, []):
                if old != '-':
                    pointers.append(('dsm', old, why))
        if not pointers:
            unmapped_beta.append(path)
            continue
        olds = []
        for kind, ptr, why in pointers:
            leaf = leaf_of_pointer(ptr)
            if leaf and leaf not in olds:
                olds.append((leaf, ptr, why))
        seen = set()
        for leaf, ptr, why in olds:
            if leaf in seen:
                continue
            seen.add(leaf)
            mapped_old_leaves.add(leaf)
            ptr_clean = re.sub(r'\s.*$', '', ptr)
            if leaf != new_leaf:
                rows.append({
                    'area': 'GRS JSON', 'kind': 'key', 'old': leaf, 'new': new_leaf,
                    'context': path + '  <-  alpha ' + ptr_clean,
                    'jdg': ';'.join(jdgs(sources) or jdgs(why)), 'cr': 'CR-851', 'note': ''})
            # enum values of the same key
            ea = enum_of(alpha, resolve(alpha, ptr_clean))
            eb = enum_of(beta, beta_node(beta, path))
            if ea and eb:
                gone = [v for v in ea if v not in eb]
                came = [v for v in eb if v not in ea]
                if gone:
                    value_rows.append((path, ptr_clean, gone, came, sources))
    # values (number values are not names: the key row says when they change)
    for path, ptr, gone, came, sources in value_rows:
        str_gone = [v for v in gone if isinstance(v, str)]
        str_came = [v for v in came if isinstance(v, str)]
        if len(str_gone) < len(gone):
            for r in rows:
                if r['kind'] == 'key' and r['context'].startswith(path + '  <-'):
                    r['note'] = 'number values change too: ' + ', '.join(str(v) for v in gone if not isinstance(v, str)) + \
                        ' -> ' + ', '.join(str(v) for v in came if not isinstance(v, str))
        if str_gone and all(re.fullmatch(r'UTC[+-][0-9]{2}:[0-9]{2}', v) for v in str_gone):
            rows.append({'area': 'GRS JSON', 'kind': 'value', 'old': r'UTC[+-][0-9]{2}:[0-9]{2}', 'new': r'[+-][0-9]{2}:[0-9]{2} (the UTC prefix is dropped)',
                         'context': path + '  <-  alpha ' + ptr + '  (%d values)' % len(str_gone), 'jdg': ';'.join(jdgs(sources)),
                         'cr': 'CR-851', 'note': 'one row for all %d offsets; pattern is a regular expression' % len(str_gone),
                         'regex_given': True})
            continue
        paired = len(str_gone) == len(str_came)
        for v in str_gone:
            if paired:
                new = str_came[str_gone.index(v)]
                note = 'paired by position (same count of removed and added values); pair read against grs-json-final-review-tree.md'
            else:
                new = '(not in beta enum)'
                note = 'CHECK: beta adds ' + (', '.join(map(str, str_came)) or 'nothing') + '; no one-to-one pair'
            rows.append({'area': 'GRS JSON', 'kind': 'value', 'old': v, 'new': new,
                         'context': path + '  <-  alpha ' + ptr, 'jdg': ';'.join(jdgs(sources)), 'cr': 'CR-851', 'note': note})
    for r in rows:
        if r['kind'] != 'value':
            continue
        for leaf, value, new, j, note in VALUE_OVERRIDES:
            if r['old'] == value and ('/properties/' + leaf) in r['context']:
                r['new'] = new
                r['note'] = note
                for one in j.split(';'):
                    if one and one not in r['jdg'].split(';'):
                        r['jdg'] = (r['jdg'] + ';' + one).strip(';')
    # types
    for old, new, j, note in TYPE_RENAMES:
        rows.append({'area': 'GRS JSON', 'kind': 'type', 'old': old, 'new': new, 'context': '$defs/' + old,
                     'jdg': j, 'cr': 'CR-851', 'note': note})
    # alpha keys that the two tables cannot reach mechanically (pointer ends at a type, or the source names them in prose)
    for old, new, ctx, j, note in KEY_EXTRA:
        rows.append({'area': 'GRS JSON', 'kind': 'key', 'old': old, 'new': new, 'context': ctx, 'jdg': j, 'cr': 'CR-851', 'note': note})
        mapped_old_leaves.add(old)
    # keys removed in the draft (doc-shape-map element_new = '-')
    for old, why in removed:
        leaf = leaf_of_pointer(old)
        if leaf and leaf not in mapped_old_leaves:
            rows.append({'area': 'GRS JSON', 'kind': 'key', 'old': leaf, 'new': '(removed)', 'context': 'alpha ' + old,
                         'jdg': ';'.join(jdgs(why)), 'cr': 'CR-851', 'note': ''})
            mapped_old_leaves.add(leaf)
    # alpha keys that no row reaches
    alpha_leaves = set()

    def collect(node):
        if isinstance(node, dict):
            for k, v in node.get('properties', {}).items():
                alpha_leaves.add(k)
            for v in node.values():
                collect(v)
        elif isinstance(node, list):
            for v in node:
                collect(v)
    collect(alpha)
    beta_leaves = set()

    def collect_b(node):
        if isinstance(node, dict):
            for k in node.get('properties', {}):
                beta_leaves.add(k)
            for v in node.values():
                collect_b(v)
        elif isinstance(node, list):
            for v in node:
                collect_b(v)
    collect_b(beta)
    for leaf in sorted(alpha_leaves - mapped_old_leaves - beta_leaves):
        rows.append({'area': 'GRS JSON', 'kind': 'key', 'old': leaf, 'new': '(not found)',
                     'context': 'alpha key reached by no row of grs-json-beta-schema-sources.tsv / doc-shape-map.tsv',
                     'jdg': '', 'cr': 'CR-851', 'note': 'CHECK: where does this alpha key go in beta?'})
    return rows, unmapped_beta


# ---------------------------------------------------------------- document commands and Agent API

# Japanese phrases of the policy table and the handoff, kept as escapes so this file stays ASCII.
KEEP = '\u4eca\u306e\u307e\u307e'                    # "unchanged"
NAME_KEEP = '\u540d\u306f\u4eca\u306e\u307e\u307e'   # "the name is unchanged"
NONE_YET = '\uff08\u7121\u3044'                      # "(none" -- a new tool
ALPHA_IS = '\uff08\u03b1 \u306f'                     # "(alpha is"
CLOSE_PAREN = '\uff09'
VALUE_OF = '\u306e\u5024'                            # "value of"
ANSWER_OF = '\u306e\u7b54\u3048\u306e'               # "of the answer of"
ARG = '\u306e\u5f15\u6570'                           # "argument of"
TYPE_OF = '\u306e\u578b'                             # "type of"
SAME_NAME = '\u540c\u3058\u540d'                     # "same name"
DROP = '\u7121\u304f\u3059'                          # "drop"
ERASE = '\u6d88\u3059'                               # "erase"
OLD_WORD_HEAD = '| \u53e4\u3044\u8a9e'               # handoff table head "| old word"
TOTAL_ROW = '**\u8a08**'                             # handoff total row
DOT_SEP = '\u30fb'                                   # Japanese middle dot


def policy_rows():
    """Rows of the tables of agent-api-names-by-policy-draft.md: (section, q, old cell, new cell, rule)."""
    out = []
    section = ''
    with io.open(os.path.join(TERMS, 'agent-api-names-by-policy-draft.md'), encoding='utf-8') as f:
        for ln in f:
            if ln.startswith('## '):
                section = ln[3:].strip()
            if not (section.startswith('BGQA4') or section.startswith('BGQA5')):
                continue
            if not re.match(r'\|\s*\d', ln):
                continue
            cells = [c.strip() for c in ln.strip().strip('|').split('|')]
            if len(cells) < 4:
                continue
            out.append((section[:5], cells[0], cells[1], cells[2], cells[3], cells[4] if len(cells) > 4 else ''))
    return out


def ticks(cell):
    return re.findall(r'`([^`]+)`', cell)


def policy_map():
    """draft name (full dotted) -> settled name, plus the rows it came from."""
    result = []
    for sec, q, old, new, rule, note in policy_rows():
        if new.startswith(KEEP) or new.startswith(NAME_KEEP):
            continue
        if NONE_YET in old:
            continue  # a new tool, not a rename
        alpha_alt = []
        m = re.search(ALPHA_IS + r'\s*`([^`]+)`' + CLOSE_PAREN, old)
        if m:
            alpha_alt = [m.group(1)]
            old = old[:m.start()] + old[m.end():]
        is_value = VALUE_OF in old
        parent = []
        olds = ticks(old)
        is_field = False
        for phrase in (VALUE_OF, ANSWER_OF, ARG, TYPE_OF):
            if phrase in old:
                is_field = phrase in (ANSWER_OF, ARG)
                head, tail = old.rsplit(phrase, 1)
                parent = ticks(head)
                olds = ticks(tail)
                break
        news = [n for n in ticks(new) if not n.startswith('<')]
        if SAME_NAME in new:
            continue  # the key moves, its name stays
        if not news and (DROP in new or ERASE in new):
            news = ['(removed)'] * len(olds)
        if alpha_alt and len(olds) == 1 and len(news) == 1:
            result.append({'section': sec, 'q': q, 'old_full': alpha_alt[0], 'new_full': news[0], 'is_value': is_value,
                           'parent': '.'.join(parent), 'jdg': ';'.join(['JDG-3781'] + [j for j in jdgs(rule + ' ' + note) if j != 'JDG-3781']),
                           'note': 'alpha name given in the table', 'field': True})
        if len(news) == len(olds):
            pairs = list(zip(olds, news))
            note2 = ''
        elif len(news) == 1:
            pairs = [(o, news[0]) for o in olds]
            if len({o.split('.')[-1] for o in olds}) == 1:
                note2 = 'one name in several commands'
            else:
                note2 = 'CHECK: several old names, one new name in the table'
        elif len(olds) == 1:
            pairs = [(olds[0], ' / '.join(news))]
            note2 = 'split into %d names, as the table says' % len(news)
        else:
            pairs = [(o, ' / '.join(news)) for o in olds]
            note2 = 'CHECK: old and new counts differ in the table row'
        for o, n in pairs:
            result.append({'section': sec, 'q': q, 'old_full': o, 'new_full': n, 'is_value': is_value,
                           'field': is_field, 'parent': '.'.join(parent), 'jdg': ';'.join(['JDG-3781'] + [j for j in jdgs(rule + ' ' + note) if j != 'JDG-3781']),
                           'note': note2})
    return result


def strip_cm(s):
    s = re.sub(r'^CM-\d+\s+', '', s.strip())
    s = re.sub(r'\s*\(retired\)\s*$', '', s)
    s = re.sub(r'\s*--.*$', '', s)
    return s.strip()


def command_rows(policy):
    rows = []
    cm = read_tsv(os.path.join(S76, 'commands-map.tsv'))
    head = cm[0]
    i_o, i_n, i_k, i_w = head.index('command_old'), head.index('command_new'), head.index('kind'), head.index('why')
    final_of = {p['old_full']: p for p in policy if '.' not in p['old_full'] and not p['is_value']}
    for r in cm[1:]:
        if r[i_o].startswith('(new)') or r[i_k] == 'retired':
            continue
        alpha_name = strip_cm(r[i_o])
        draft = strip_cm(r[i_n])
        final = final_of[draft]['new_full'] if draft in final_of else draft
        j = jdgs(r[i_w])
        if draft in final_of:
            j = j + [x for x in final_of[draft]['jdg'].split(';') if x not in j]
        if alpha_name != final:
            rows.append({'area': 'document command', 'kind': 'command', 'old': alpha_name, 'new': final,
                         'context': 'alpha ' + r[i_o].strip() + ' -> draft ' + draft + (' -> settled ' + final if final != draft else ''),
                         'jdg': ';'.join(j), 'cr': 'CR-851',
                         'note': 'folded into an edit command' if r[i_k] == 'edit-fold' else ''})
    # fields, values and types of BGQA4 that are not whole command names
    for p in policy:
        if p['section'] != 'BGQA4':
            continue
        if '.' not in p['old_full'] and not p['is_value']:
            if p['old_full'] in final_of and any(r['old'] == p['old_full'] or r['context'].find('draft ' + p['old_full']) >= 0 for r in rows):
                continue
        rows.append(policy_row(p, 'document command'))
    return rows


def policy_row(p, area):
    o = p['old_full']
    n = p['new_full']
    old_leaf = o.split('.')[-1].replace('[]', '')
    new_leaf = n.split('.')[-1].replace('[]', '')
    if p['is_value']:
        kind = 'value'
    elif '.' in o or p.get('field'):
        kind = 'member field' if area == 'Agent API' else 'command field'
    elif o[:1].isupper():
        kind = 'type'
    else:
        kind = 'member' if area == 'Agent API' else 'command'
    ctx = ('value of ' + p['parent'] + ': ' if p['is_value'] else '') + o + ' -> ' + n + '  (q ' + p['q'] + ')'
    return {'area': area, 'kind': kind, 'old': old_leaf, 'new': new_leaf, 'context': ctx,
            'jdg': p['jdg'], 'cr': 'CR-851', 'note': p['note']}


AGENT_EXTRA = [
    # names the policy table records outside its 45 questions (its section of names noticed outside the questions)
    ('readDelayDiagnostics', 'readDelayDiagnosis', 'JDG-3512', 'member', ''),
    ('runDelayDiagnostics', 'runDelayDiagnosis', 'JDG-3512', 'member', ''),
    ('setTaskGroupSelfShowMode', 'setTaskGroupShowMode', 'JDG-3672;JDG-3736', 'command', 'draft name; check the alpha name'),
    ('setTaskGroupSelfShowModesToAutomaticExceptHidden', 'setTaskGroupShowModesToAutomaticExceptHidden', 'JDG-3690;JDG-3736', 'command', 'draft name; check the alpha name'),
    ('AgentRefusalReason', 'RefusalReason (proposal; not ruled)', 'JDG-3716', 'type',
     'CHECK (owner, through the BOSS GQA): no table names it (searched agent-api-names-by-policy-draft.md, agent-api-names-ai-c-review.md and both '
     'Agent API naming branches). Proposal RefusalReason: P-5 drops the caller prefix Agent, and P-9 names a field type after the field (Refusal.reason). '
     'Rejected: Reason (too bare to look up, as Column was for TableColumn, N-2); keeping AgentRefusalReason (P-5)'),
]


def agent_rows(policy):
    rows = [policy_row(p, 'Agent API') for p in policy if p['section'] == 'BGQA5']
    for o, n, j, kind, note in AGENT_EXTRA:
        area = 'document command' if kind == 'command' else 'Agent API'
        rows.append({'area': area, 'kind': kind, 'old': o, 'new': n, 'context': 'agent-api-names-by-policy-draft.md, names outside the questions',
                     'jdg': j, 'cr': 'CR-851', 'note': note})
    # every Agent* type in the current members manuscript that no row covers
    text = io.open(os.path.join(REPO, 'docs', 'spec', '_source', 'agent-api-members.json'), encoding='utf-8').read()
    covered = {r['old'] for r in rows}
    for name in sorted(set(re.findall(r'\bAgent[A-Z][A-Za-z]+\b', text))):
        if name not in covered and name not in ('AgentApi',):
            rows.append({'area': 'Agent API', 'kind': 'type', 'old': name, 'new': '(not in the settled table)',
                         'context': 'docs/spec/_source/agent-api-members.json', 'jdg': 'JDG-3716',
                         'note': 'CHECK: P-5 drops a leading Agent; no row names this type'})
    return rows


# ---------------------------------------------------------------- screen words (CR-855)

def screen_rows():
    rows = []
    path = os.path.join(TERMS, '6-cr855-handoff.md')
    in_table = False
    with io.open(path, encoding='utf-8') as f:
        for ln in f:
            if ln.startswith(OLD_WORD_HEAD):
                in_table = True
                continue
            if in_table and not ln.startswith('|'):
                in_table = False
            if not in_table or ln.startswith('|---') or TOTAL_ROW in ln:
                continue
            cells = [c.strip() for c in ln.strip().strip('|').split('|')]
            old, new, j = cells[0], cells[1], cells[2]
            old = old.replace('\\b', r'\b').replace('\\|', '|')
            old = '|'.join(p.strip() for p in old.split(DOT_SEP))
            j = j.replace('`', '').replace(DOT_SEP, ';JDG-')
            j = ';'.join(x if x.startswith('JDG-') else 'JDG-' + x for x in j.split(';'))
            rows.append({'area': 'screen word', 'kind': 'screen label', 'old': old, 'new': new,
                         'context': '6-cr855-handoff.md section 2', 'jdg': j, 'cr': 'CR-855', 'note': '', 'regex_given': True})
    for old, new, j, kind, note in SCREEN_EXTRA:
        rows.append({'area': 'screen word', 'kind': kind, 'old': old, 'new': new, 'context': 'ruling after the handoff of 2026-10-27',
                     'jdg': j, 'cr': 'CR-855', 'note': note, 'regex_given': True})
    return rows


CR_OVERRIDES = {
    # the rename is CR-855/CR-851, the behaviour that comes with it is CR-856 (6-cr855-handoff.md section 4)
    'Document Title': 'CR-855;CR-856 (JDG-3355: the project title is edited in the Properties Panel)',
    'auto': 'CR-851 (section 4.1 converter)',
    'collapsed': 'CR-851 (section 4.1 converter)',
    'expanded': 'CR-851 (section 4.1 converter)',
    'temporarilyExpanded': 'CR-851 (section 4.1 converter)',
}


SCREEN_EXTRA = [
    # regular expression of the old word, new word, ruling, kind, note
    ('Delay Diagnostics', 'Delay Diagnosis', 'JDG-3512', 'screen label', 'includes Delay Diagnostics Report (Window)'),
    ('[Dd]elayDiagnostics', '[Dd]elayDiagnosis', 'JDG-3512', 'code name',
     'any identifier that starts with the old word (delayDiagnosticsReport, DelayDiagnosticsRow ...); Agent API names are rows of their own'),
]


# ---------------------------------------------------------------- counting

def area_files():
    out = subprocess.run(['git', 'ls-files'], cwd=REPO, capture_output=True, text=True, encoding='utf-8').stdout.split('\n')
    areas = {'source': [], 'spec': [], 'src': [], 'tests': [], 'glossary': []}
    for p in out:
        if not p:
            continue
        if p == 'docs/spec/_source/glossary.json':
            areas['glossary'].append(p)
        elif p.startswith('docs/spec/_source/'):
            areas['source'].append(p)
        elif re.match(r'docs/spec/[^/]+\.md$', p) or re.match(r'docs/spec/_assets/[^/]+\.md$', p):
            areas['spec'].append(p)
        elif p.startswith('src/'):
            areas['src'].append(p)
        elif p.startswith('tests/'):
            areas['tests'].append(p)
    texts = {}
    for name, files in areas.items():
        for p in files:
            if re.search(r'\.(png|jpg|ico|woff2?|ttf|gif|pdf|zip|mcpb)$', p):
                continue
            try:
                whole = io.open(os.path.join(REPO, p), encoding='utf-8').read()
                texts[p] = (name, whole.split('\n'), whole)
            except (UnicodeDecodeError, FileNotFoundError):
                pass
    return texts


def is_generic(name):
    return re.fullmatch(r'[a-z]+', name) is not None


def patterns(row):
    old = row['old']
    if row.get('regex_given'):
        return re.compile(old), None, old
    if old.startswith('('):
        return None, None, ''
    esc = re.escape(old)
    plain = re.compile(r'(?<![' + ID_CHAR + '])' + esc + r'(?![' + ID_CHAR + '])')
    key = None
    if row['kind'] == 'value':
        key = re.compile(r'["\'`]' + esc + r'["\'`]')
    elif is_generic(old):
        key = re.compile(r'["\'`]' + esc + r'["\'`]|\.' + esc + r'(?![' + ID_CHAR + r'])|(?<![' + ID_CHAR + r'.])' + esc + r'\??\s*:')
    return plain, key, plain.pattern


def main():
    grs, unmapped_beta = grs_json_rows()
    policy = policy_map()
    rows = grs + command_rows(policy) + agent_rows(policy) + screen_rows()
    # one row per (area, kind, old, new); merge contexts
    merged = {}
    for r in rows:
        k = (r['area'], r['kind'], r['old'], r['new'])
        if k in merged:
            m = merged[k]
            if r['context'] not in m['context']:
                m['context'] += ' | ' + r['context']
            for j in r['jdg'].split(';'):
                if j and j not in m['jdg'].split(';'):
                    m['jdg'] = (m['jdg'] + ';' + j).strip(';')
            if r['note'] and r['note'] not in m['note']:
                m['note'] = (m['note'] + ' / ' + r['note']).strip(' /')
        else:
            merged[k] = dict(r)
    rows = list(merged.values())
    texts = area_files()
    area_names = ['source', 'spec', 'src', 'tests', 'glossary']
    occ = []
    count_cache = {}
    for r in rows:
        plain, key, shown = patterns(r)
        r['pattern'] = shown
        r['key_pattern'] = key.pattern if key else ''
        ck = (r['old'], plain.pattern if plain else '', key.pattern if key else '')
        if plain is None:
            for a in area_names:
                r[a] = ''
            r['total'] = ''
            r['key_total'] = ''
            r['files'] = ''
            continue
        if ck not in count_cache:
            counts = {a: 0 for a in area_names}
            kcount = 0
            files = set()
            hits = []
            literal = None if r.get('regex_given') else r['old']
            for p, (a, lines, whole) in texts.items():
                if literal is not None and literal not in whole:
                    continue
                if literal is None and not plain.search(whole):
                    continue
                for i, ln in enumerate(lines, 1):
                    if literal is not None and literal not in ln:
                        continue
                    n = len(plain.findall(ln))
                    if not n:
                        continue
                    counts[a] += n
                    kn = len(key.findall(ln)) if key else n
                    kcount += kn
                    if kn:
                        files.add(p)
                        hits.append((a, p, i, kn))
            count_cache[ck] = (counts, kcount, files, hits)
        counts, kcount, files, hits = count_cache[ck]
        for a in area_names:
            r[a] = counts[a]
        r['total'] = sum(counts.values())
        r['key_total'] = kcount if key else ''
        r['files'] = len(files)
    for (old, pat, kpat), (counts, kcount, files, hits) in count_cache.items():
        per_file = {}
        for a, p, i, n in hits:
            e = per_file.setdefault((a, p), [0, []])
            e[0] += n
            e[1].append(str(i))
        for (a, p), (n, lines) in per_file.items():
            occ.append((old, 'key_pattern' if kpat else 'pattern', a, p, n, len(lines), ','.join(lines)))
    cols = ['no', 'area', 'kind', 'old', 'new', 'cr', 'jdg', 'source', 'spec', 'src', 'tests', 'glossary', 'total',
            'key_total', 'files', 'check', 'note', 'context', 'pattern', 'key_pattern']
    order = {'GRS JSON': 0, 'document command': 1, 'Agent API': 2, 'screen word': 3}
    korder = {'type': 0, 'key': 1, 'value': 2, 'command': 3, 'command field': 4, 'member': 5, 'member field': 6, 'screen label': 7, 'code name': 8}
    rows.sort(key=lambda r: (order[r['area']], korder.get(r['kind'], 9), r['old'].lower(), r['new']))
    for r in rows:
        if r['old'] in CR_OVERRIDES and r['area'] in ('screen word', 'GRS JSON'):
            r['cr'] = CR_OVERRIDES[r['old']]
    old_count = {}
    for r in rows:
        old_count[r['old']] = old_count.get(r['old'], 0) + 1
    with io.open(os.path.join(HERE, 'renames.tsv'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('# Old names replaced by the settled beta names, one row per (area, kind, old, new). Made by extract_renames.py -- do not edit by hand.\n')
        f.write('# Counts are matches of the pattern column (key_total: of key_pattern, for generic one-word names). files = files with a key_pattern (else pattern) match.\n')
        f.write('\t'.join(cols) + '\n')
        for n, r in enumerate(rows, 1):
            r['no'] = 'RN-%03d' % n
            check = []
            if 'CHECK' in r['note']:
                check.append('CHECK')
            if old_count[r['old']] > 1:
                check.append('same old name in %d rows' % old_count[r['old']])
            if r['total'] == 0 and r['area'] != 'screen word':
                check.append('0 hits: a draft name only, nothing to apply')
            r['check'] = '; '.join(check)
            f.write('\t'.join(str(r.get(c, '')).replace('\t', ' ') for c in cols) + '\n')
    occ.sort(key=lambda x: (x[0].lower(), x[2], x[3]))
    with io.open(os.path.join(HERE, 'occurrences.tsv'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('# One row per (old name, file, line) of renames.tsv. Made by extract_renames.py -- do not edit by hand.\n')
        f.write('old\tarea\tfile\tline\tmatches\ttext\n')
        for o in occ:
            f.write('\t'.join(str(x).replace('\t', ' ') for x in o) + '\n')
    with io.open(os.path.join(HERE, 'beta-keys-without-old-name.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('# Beta keys whose source row names no draft or alpha pointer (added in beta, or no source given). Made by extract_renames.py.\n')
        for p in unmapped_beta:
            f.write(p + '\n')
    print('rows', len(rows), 'distinct old names', len({r['old'] for r in rows}), 'occurrence rows', len(occ))


if __name__ == '__main__':
    main()
