# -*- coding: utf-8 -*-
"""state-machines.json -> docs/spec/_assets/tbl-state-machines.md

state-machines.json is the manuscript for the unsaved state machines (ADR-002
of Chapter 5.6, table T-250 of docs/spec/05-07-design.md). EDIT THAT. This
file prints, per region, the event definitions, the root's values and one
section per state machine -- its state diagram, its state transition table and
its states -- and _assets/tbl-state-machines.md is a generated artifact: a
hand edit to it is overwritten, and --check catches one before it can be
committed. Ahead of the regions it prints table T-283, the order across
regions (SD-4), from the manuscript's top-level `priorities`; what
`load_priorities()` refuses is written on it. Only this printer reads
`priorities` -- no code constant is generated from it.

    python state_machines_json_to_md.py           rebuild the document
    python state_machines_json_to_md.py --check   exit 1 if the file differs

It is also the ONE reader of the manuscript: tools/generate_state_machine_types.py
imports `load()` from here, so the two artifacts are printed from one
validated model and cannot disagree about what the manuscript says.

NAMES, NOT NUMBERS (JDG-286, R4.4 of docs/development-rules/07-review-
standards.md). A machine -- the definition -- is a noun phrase plus
`StateMachine` and is unique across every region; the code holds its current
state under the same noun phrase plus `State` (`armModeStateMachine` ->
`armModeState`); a state is `machine.key`; an event is `region/key`; a
transition is its cell -- the machine, the current state and the event.

What `load()` refuses (CR-436 section 3.1 and wave A2), on top of the schema:
  - an evidence id -- of a state, the root, a branch, an event source, a
    carried value or an effect argument -- that no table row or requirement
    of docs/spec defines (this file's own output is not counted);
  - a cell whose state is not a state of its machine, whose `to` is not a
    state of the SAME machine, or whose `{name}` target is not a value the
    event carries (such a target stands for any top-level kind of the
    machine but its initial one);
  - a guard term `in` that names no state of another machine of the region;
  - an event a machine's or the root's table uses that its region does not
    define, and an event no table uses;
  - an event with a cell on a state and on one of that state's ancestors in
    the same machine, and a cell of two or more branches one of which has no
    guard;
  - a union without exactly one initial state;
  - a key that is not one word below its parent (or one word at the top);
  - a duplicate state key or event key, and a machine name two machines
    share, in one region or across regions;
  - a guard name that does not start with is / has / can (R4.4);
  - a machine name that does not end in `StateMachine`, or whose current-
    state name (the noun phrase plus `State`) is also a value the root
    carries;
  - an event key two regions both hold (decision 12 of CR-440): the root
    finds the region an event touches by its `type` (SS-5 of table T-284),
    so one key in two regions leaves that lookup without one answer. An
    effect name may repeat across regions -- the shell only runs it;
  - a region that holds documentData (SD-5 of table T-250, the row tree)
    without the erd.json column it names, or whose machine's state keys are
    not that column's enum values in the same order -- the state type is the
    column's, so the two lists may not drift apart.

Run with PYTHONIOENCODING=utf-8.
"""
import collections
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.dirname(HERE)
ASSETS = os.path.join(SPEC, '_assets')
SRC = os.path.join(HERE, 'state-machines.json')
ERD = os.path.join(HERE, 'erd.json')
DOCUMENT_DATA = 'documentData'
SCHEMA = os.path.join(HERE, 'state-machines.schema.json')
OUT_NAME = 'tbl-state-machines.md'
OUT = os.path.join(ASSETS, OUT_NAME)

LANG = 'ja'
NONE_CELL = u'—'
JOIN = u' ・ '
ALT = u' ／ '
AND = u' & '

SOURCE_WORD = {
    'input': u'入力',
    'effectResult': u'副作用の結果',
    'otherRegion': u'ほかの領域の結果',
    'time': u'時間',
}

# The first cell of a table row and a requirement's UID line: the two ways
# docs/spec defines an id (the same reading row_id_prefixes_json_to_md.py uses).
ROW = re.compile(r'^\|\s*(?:\*\*)?`?([A-Z][A-Za-z]*-\d+[a-z]?)`?(?:\*\*)?\s*\|')
UID = re.compile(r'^\*\*UID\*\*:\s*(\S+)')
PLACEHOLDER = re.compile(r'^\{([a-z][A-Za-z0-9]*)\}$')
GUARD_NAME = re.compile(r'^(is|has|can)[A-Z]')


def say(message):
    """The console may be cp932 while the manuscript quotes marks it cannot
    print; the same guard settings_json_to_md.py carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def text(value):
    return value[LANG]


def defined_ids():
    """Every id a table row or a requirement of docs/spec defines."""
    ids = set()
    for base, dirs, names in os.walk(SPEC):
        dirs[:] = [d for d in dirs if d not in ('output', '__pycache__', '_source')]
        for name in names:
            if not name.endswith('.md') or name == OUT_NAME:
                continue
            path = os.path.join(base, name)
            body = io.open(path, encoding='utf-8').read().replace('\r\n', '\n')
            fenced = False
            for line in body.split('\n'):
                if line.strip().startswith('```'):
                    fenced = not fenced
                    continue
                if fenced:
                    continue
                for pattern in (ROW, UID):
                    found = pattern.match(line)
                    if found:
                        ids.add(found.group(1))
    return ids


def schema_problems(doc):
    """Soft dependency, as in settings_json_to_md.py: a machine without a
    validator must still be able to build the specification."""
    try:
        import jsonschema
    except ImportError:
        say('NOTE     jsonschema is not installed, so state-machines.schema.json'
            ' was not enforced this run')
        return []
    schema = json.load(io.open(SCHEMA, encoding='utf-8'))
    validator = jsonschema.Draft202012Validator(schema)
    out = []
    for e in sorted(validator.iter_errors(doc), key=lambda e: list(e.path)):
        message = e.message if len(e.message) <= 160 else e.message[:157] + '...'
        out.append('%s: %s' % ('/'.join(str(x) for x in e.path) or '(root)',
                               message))
    return out


def branches_of(cell):
    """A cell is one branch or a list of two or more; always a list here."""
    return cell if isinstance(cell, list) else [cell]


def guard_words(guard):
    """The guard as one line of ASCII, the form the generated table holds."""
    words = []
    for term in guard or []:
        if 'in' in term:
            words.append('in %s' % term['in'])
        else:
            words.append(('not ' if term.get('not') else '') + term['name'])
    return ' & '.join(words)


class Machine(object):
    """One state machine: its states, its unions and its table."""

    def __init__(self, region, raw):
        self.region = region
        self.raw = raw
        self.name = raw['name']
        self.states = raw['states']
        self.table = raw['transitions']
        self.by_key = collections.OrderedDict((s['key'], s) for s in self.states)
        # parent key (None for the top) -> [state, ...]
        self.children = collections.OrderedDict()

    def holder(self):
        """The name the code holds this machine's current state under (R4.4)."""
        return self.name[:-len('Machine')]

    def state_id(self, key):
        return '%s.%s' % (self.name, key)

    def word(self, state):
        return state['key'].split('.')[-1]

    def leaves(self):
        return [s for s in self.states if s['key'] not in self.children]

    def ancestors(self, key):
        out = []
        state = self.by_key[key]
        while state['parent'] is not None:
            out.insert(0, state['parent'])
            state = self.by_key[state['parent']]
        return out

    def covers(self, source, leaf):
        """Does a cell on `source` answer for the leaf state `leaf`?"""
        return source == leaf or source in self.ancestors(leaf)

    def classify(self, found):
        for state in self.states:
            parent = state['parent']
            if parent is None:
                if '.' in state['key']:
                    found.append('%s: a top-level key has more than one word'
                                 % self.state_id(state['key']))
                self.children.setdefault(None, []).append(state)
                continue
            if parent not in self.by_key:
                found.append('%s: parent %s is not a state of %s'
                             % (self.state_id(state['key']), parent, self.name))
                continue
            rest = state['key'][len(parent) + 1:]
            if not state['key'].startswith(parent + '.') or '.' in rest:
                found.append('%s: the key is not one word below its parent %s'
                             % (self.state_id(state['key']), parent))
                continue
            self.children.setdefault(parent, []).append(state)

    def unions(self):
        """(label, [state, ...]) for every union of kinds in this machine."""
        return [(self.name if parent is None else self.state_id(parent), members)
                for parent, members in self.children.items()]

    def check_initials(self, found):
        for label, members in self.unions():
            count = sum(1 for s in members if s['initial'])
            if count != 1:
                found.append('%s: %d initial states in the union %s'
                             % (self.name, count, label))

    def targets_of(self, key, event):
        """The state keys a `to` can mean: itself, or the kinds a value names."""
        hole = PLACEHOLDER.match(key)
        if not hole:
            return [key] if key in self.by_key else []
        if hole.group(1) not in [c['name'] for c in event['carries']]:
            return []
        # The value names a kind that is ENTERED, so never the union's
        # initial kind -- the absence the union starts from (`none`).
        return [s['key'] for s in self.children.get(None, []) if not s['initial']]

    def cells(self):
        """(event key, state key, [branch, ...]) in the manuscript's order."""
        for event, row in self.table.items():
            for key, cell in row.items():
                yield event, key, branches_of(cell)


class Region(object):
    """One region, read and cross-checked. Everything a printer needs."""

    def __init__(self, raw):
        self.raw = raw
        self.name = raw['region']
        # SD-5: a region that holds a saved value of the document (the row
        # tree). Its state type is an erd.json column, never printed here.
        self.holds_document_data = raw.get('holds') == DOCUMENT_DATA
        self.stem = raw['typeStem']
        self.root = raw['root']
        self.events = raw['events']
        self.event_by_key = collections.OrderedDict(
            (e['key'], e) for e in self.events)
        self.machines = [Machine(self, m) for m in raw['machines']]
        self.machine_by_name = collections.OrderedDict(
            (m.name, m) for m in self.machines)

    def event_id(self, key):
        return '%s/%s' % (self.name, key)

    def root_cells(self):
        for event, cell in self.root['transitions'].items():
            yield event, branches_of(cell)

    def state_of(self, state_id):
        """(machine, key) for a state id of this region, or (None, None)."""
        head, _, key = state_id.partition('.')
        machine = self.machine_by_name.get(head)
        if machine is None or key not in machine.by_key:
            return None, None
        return machine, key

    def movers(self, event):
        """The machines whose tables name the event, in manuscript order."""
        return [m.name for m in self.machines if event in m.table]

    def check_guard(self, where, machine, guard, found):
        for term in guard or []:
            if 'in' not in term:
                if not GUARD_NAME.match(term['name']):
                    found.append('%s: guard %s does not start with is / has / can'
                                 % (where, term['name']))
                continue
            other, _key = self.state_of(term['in'])
            if other is None:
                found.append('%s: guard in %s names no state of region %s'
                             % (where, term['in'], self.name))
            elif machine is not None and other is machine:
                found.append('%s: guard in %s names its own machine'
                             % (where, term['in']))

    def check_branches(self, where, branches, found):
        if len(branches) > 1 and any(not b.get('guard') for b in branches):
            found.append('%s: %d branches, and one of them has no guard'
                         % (where, len(branches)))

    def check_tables(self, found):
        used = set()
        for event, branches in self.root_cells():
            where = '%s x %s' % (self.name, self.event_id(event))
            if event not in self.event_by_key:
                found.append('%s: event %s is not defined in region %s'
                             % (where, event, self.name))
            used.add(event)
            self.check_branches(where, branches, found)
            for branch in branches:
                self.check_guard(where, None, branch.get('guard'), found)
        for machine in self.machines:
            for event, row in machine.table.items():
                used.add(event)
                known = self.event_by_key.get(event)
                if known is None:
                    found.append('%s: event %s is not defined in region %s'
                                 % (machine.name, event, self.name))
                keys = [k for k in row if k in machine.by_key]
                for key in row:
                    if key not in machine.by_key:
                        found.append('%s x %s: %s is not a state of %s'
                                     % (machine.name, self.event_id(event), key, machine.name))
                for key in keys:
                    for above in machine.ancestors(key):
                        if above in keys:
                            found.append('%s x %s: cells on both %s and its ancestor %s'
                                         % (machine.name, self.event_id(event), key, above))
                for key, cell in row.items():
                    where = '%s x %s' % (machine.state_id(key), self.event_id(event))
                    branches = branches_of(cell)
                    self.check_branches(where, branches, found)
                    for branch in branches:
                        self.check_guard(where, machine, branch.get('guard'), found)
                        if known is not None and not machine.targets_of(branch['to'], known):
                            found.append('%s: target %s is not a state of %s'
                                         % (where, branch['to'], machine.name))
        for event in self.events:
            if event['key'] not in used:
                found.append('%s: no table names the event' % self.event_id(event['key']))

    def evidence(self):
        """(where, [cited id, ...]) for everything this region cites."""
        out = []
        cited = list(self.root['evidence'])
        for carried in self.root['carries']:
            cited.extend(carried.get('rows', []))
        out.append((self.name, cited))
        for event in self.events:
            cited = list(event['source']['rows'])
            for carried in event['carries']:
                cited.extend(carried.get('rows', []))
            out.append((self.event_id(event['key']), cited))
        for event, branches in self.root_cells():
            for branch in branches:
                cited = list(branch['evidence'])
                if branch.get('effectArgument'):
                    cited.append(branch['effectArgument'])
                out.append(('%s x %s' % (self.name, self.event_id(event)), cited))
        for machine in self.machines:
            for state in machine.states:
                cited = list(state['evidence'])
                for carried in state['carries']:
                    cited.extend(carried.get('rows', []))
                out.append((machine.state_id(state['key']), cited))
            for event, key, branches in machine.cells():
                for branch in branches:
                    cited = list(branch['evidence'])
                    if branch.get('effectArgument'):
                        cited.append(branch['effectArgument'])
                    out.append(('%s x %s' % (machine.state_id(key), self.event_id(event)),
                                cited))
        return out


def duplicates(values):
    seen = set()
    out = []
    for value in values:
        if value in seen:
            out.append(value)
        seen.add(value)
    return out


def shared_event_keys(regions):
    """One problem per event key that more than one region holds."""
    owners = collections.OrderedDict()
    for region in regions:
        for event in region.events:
            names = owners.setdefault(event['key'], [])
            if region.name not in names:
                names.append(region.name)
    return ['event %s is held by more than one region (%s)' % (key, ', '.join(names))
            for key, names in owners.items() if len(names) > 1]


def enum_of_column(seat_id):
    """The enum values of the erd.json column whose seat is `AT-<n>`, or None."""
    erd = json.load(io.open(ERD, encoding='utf-8'))
    seat = int(seat_id.split('-')[1])
    for entity in erd['entities']:
        for column in entity.get('columns', []):
            if column.get('seat') == seat:
                return column.get('json', {}).get('values')
    return None


def document_data_problems(region):
    """SD-5: the state keys of a documentData region are its column's enum."""
    raw = region.raw
    if not region.holds_document_data:
        if 'column' in raw:
            return ['%s: names a column but does not hold documentData' % region.name]
        return []
    if 'column' not in raw:
        return ['%s: holds documentData and names no erd.json column' % region.name]
    values = enum_of_column(raw['column'])
    if values is None:
        return ['%s: %s is not an enum column of erd.json' % (region.name, raw['column'])]
    found = []
    for machine in region.machines:
        keys = [s['key'] for s in machine.states]
        if keys != list(values):
            found.append('%s: states %s are not the values of %s %s, in that order'
                         % (machine.name, keys, raw['column'], list(values)))
    return found


def load():
    """(regions, problems) -- the validated model, or the reasons it is not."""
    doc = json.load(io.open(SRC, encoding='utf-8'),
                    object_pairs_hook=collections.OrderedDict)
    found = schema_problems(doc)
    if found:
        return [], found
    regions = [Region(raw) for raw in doc['regions']]
    found.extend('region %s appears twice' % d
                 for d in duplicates(r.name for r in regions))
    found.extend('machine %s appears twice' % d
                 for d in duplicates(m.name for r in regions for m in r.machines))
    for region in regions:
        carried = set(c['name'] for c in region.root['carries'])
        for one in region.machines:
            if not one.name.endswith('StateMachine'):
                found.append('%s: a machine name ends in StateMachine' % one.name)
            elif one.holder() in carried:
                found.append('%s: its current state %s is also a value the root carries'
                             % (one.name, one.holder()))
    captions = [c for region in regions
                for c in (region.raw['figure']['id'], region.raw['table']['id'])]
    found.extend('table or figure %s appears twice' % d for d in duplicates(captions))
    found.extend(shared_event_keys(regions))
    known = defined_ids()
    for region in regions:
        found.extend('event %s appears twice' % region.event_id(d)
                     for d in duplicates(e['key'] for e in region.events))
        for machine in region.machines:
            found.extend('state %s appears twice' % machine.state_id(d)
                         for d in duplicates(s['key'] for s in machine.states))
            machine.classify(found)
            machine.check_initials(found)
        region.check_tables(found)
        found.extend(document_data_problems(region))
        for where, cited in region.evidence():
            for one in cited:
                if one not in known:
                    found.append('%s: %s is not defined in docs/spec' % (where, one))
    return regions, found


# The chain IN-4 writes with arrows: 「消費する階層は A → B → … の順」.
ESCAPE_KEY = 'Esc'
ESCAPE_CHAIN = re.compile(u'消費する階層は (.+?) の順')
ESCAPE_ROW = '| IN-4 |'
REQUIREMENTS = os.path.join(SPEC, '01-04-requirements.md')


def escape_chain():
    """The Esc rungs as the requirement row IN-4 writes them, first to last,
    or None when the row or its chain cannot be found."""
    body = io.open(REQUIREMENTS, encoding='utf-8').read().replace('\r\n', '\n')
    for line in body.split('\n'):
        if line.startswith(ESCAPE_ROW):
            found = ESCAPE_CHAIN.search(line)
            return found.group(1).split(u' → ') if found else None
    return None


def load_priorities(regions):
    """(priorities, problems) -- table T-283 (SD-4), or None when the
    manuscript holds none. Refused, on top of the schema: a rung id used
    twice; a rung state whose machine or state no region defines; an
    evidence id docs/spec does not define; and Esc rungs whose words are not,
    one for one and in order, the chain the requirement row IN-4 writes --
    the ORDER is the requirement's (SD-4), so the table may not drift from it.
    Enter and y / n are not compared: their requirements do not write the
    order as one arrowed chain."""
    doc = json.load(io.open(SRC, encoding='utf-8'),
                    object_pairs_hook=collections.OrderedDict)
    raw = doc.get('priorities')
    if raw is None:
        return None, []
    found = []
    machines = collections.OrderedDict(
        (m.name, m) for r in regions for m in r.machines)
    rungs = raw['rungs']
    found.extend('rung %s appears twice' % d for d in duplicates(r['id'] for r in rungs))
    known = defined_ids()
    for rung in rungs:
        where = 'priorities %s' % rung['id']
        for state in rung['states']:
            if 'in' in state:
                head, _, key = state['in'].partition('.')
            else:
                head, key = state['machine'], state['except']
            machine = machines.get(head)
            if machine is None:
                found.append('%s: no region defines the machine %s' % (where, head))
            elif key not in machine.by_key or machine.by_key[key]['parent'] is not None \
                    and 'except' in state:
                found.append('%s: %s has no %sstate %s'
                             % (where, head, '' if 'in' in state else 'top-level ', key))
        for one in rung['evidence']:
            if one not in known:
                found.append('%s: %s is not defined in docs/spec' % (where, one))
    chain = escape_chain()
    written = [text(r['rung']) for r in rungs if r['keys'] == [ESCAPE_KEY]]
    if chain is None:
        found.append('priorities: the chain of %s was not found in %s'
                     % (ESCAPE_ROW.strip('| '), os.path.basename(REQUIREMENTS)))
    elif written != chain:
        found.append('priorities: the %s rungs %s are not the chain IN-4 writes %s'
                     % (ESCAPE_KEY, ' -> '.join(written), ' -> '.join(chain)))
    return raw, found


# ---------------------------------------------------------------------------
# Printing
# ---------------------------------------------------------------------------

def code(value):
    return u'`%s`' % value


def cited(ids):
    return JOIN.join(code(i) for i in ids) if ids else NONE_CELL


def carried_cell(carries):
    if not carries:
        return NONE_CELL
    pieces = []
    for carried in carries:
        extra = []
        if carried.get('rows'):
            extra.append(JOIN.join(code(r) for r in carried['rows']))
        if carried.get('note'):
            extra.append(text(carried['note']))
        piece = code(carried['name'])
        if extra:
            piece += u'（%s）' % u'。'.join(extra)
        pieces.append(piece)
    return ALT.join(pieces)


def source_cell(source):
    word = SOURCE_WORD[source['kind']]
    if source.get('note'):
        word += u'（%s）' % text(source['note'])
    return u'%s: %s' % (word, JOIN.join(code(r) for r in source['rows']))


def guard_text(guard):
    terms = []
    for term in guard:
        if 'in' in term:
            terms.append(u'%s にいる' % code(term['in']))
        else:
            terms.append((u'not ' if term.get('not') else u'') + code(term['name']))
    return u'[%s]' % AND.join(terms)


def branch_text(branch, source):
    """One branch as「→ 次 [ガード] / 副作用」. `source` is the state the cell is on."""
    if 'to' not in branch or branch['to'] == source:
        cell = u'→ 自己'
    else:
        cell = u'→ ' + code(branch['to'])
    if branch.get('guard'):
        cell += u' ' + guard_text(branch['guard'])
    if branch.get('effect'):
        cell += u' / ' + code(branch['effect'])
        if branch.get('effectArgument'):
            cell += u'（%s）' % code(branch['effectArgument'])
    if branch.get('note'):
        cell += u'（%s）' % text(branch['note'])
    return cell


def term_key(term):
    return ('in', term['in']) if 'in' in term else ('name', term['name'])


def can_happen(truth, region):
    """False when the `in` terms of one machine cannot all hold as assigned: a
    machine is in exactly one leaf state, so `in a` and `in b` of one machine
    are never both true, and the `in` terms naming all of its leaves are never
    all false. Without the region every assignment is taken as possible."""
    if region is None:
        return True
    by_machine = collections.OrderedDict()
    for key, value in truth.items():
        if key[0] != 'in':
            continue
        machine, state = region.state_of(key[1])
        if machine is not None:
            by_machine.setdefault(machine.name, (machine, []))[1].append((state, value))
    for machine, terms in by_machine.values():
        if not any(all(machine.covers(state, leaf['key']) == value for state, value in terms)
                   for leaf in machine.leaves()):
            return False
    return True


def covers_every_case(branches, region=None):
    """True when some branch has no guard, or every truth assignment of the guard
    terms the cell names satisfies one branch (a guard is a conjunction). An
    assignment the `in` terms cannot take (can_happen) is not a case."""
    if any(not b.get('guard') for b in branches):
        return True
    keys = sorted(set(term_key(t) for b in branches for t in b['guard']))
    for bits in range(2 ** len(keys)):
        truth = dict((k, bool(bits >> i & 1)) for i, k in enumerate(keys))
        if not can_happen(truth, region):
            continue
        if not any(all(truth[term_key(t)] != bool(t.get('not')) for t in b['guard'])
                   for b in branches):
            return False
    return True


def cell_text(branches, source, leaf, region=None):
    """Every case of the cell is stated (R4.4): guards that leave cases open get
    an explicit fall-through to no change."""
    lines = [branch_text(b, source) for b in branches]
    if not covers_every_case(branches, region):
        lines.append(u'それ以外 → %s' % NONE_CELL)
    body = u'<br>'.join(lines)
    if source != leaf:
        body += u'（親 %s の升）' % code(source)
    return body


def table_lines(head, rows):
    lines = [u'| ' + u' | '.join(head) + u' |',
             u'| ' + u' | '.join([u'---'] * len(head)) + u' |']
    for cells in rows:
        lines.append(u'| ' + u' | '.join(cells) + u' |')
    return lines


def event_rows(region):
    for e in region.events:
        movers = region.movers(e['key'])
        if e['key'] in region.root['transitions']:
            movers = [u'根'] + movers
        yield [code(region.event_id(e['key'])), source_cell(e['source']),
               carried_cell(e['carries']), JOIN.join(code(m) if m != u'根' else m
                                                     for m in movers)]


def root_lines(region):
    root = region.root
    lines = [u'', u'### 根 %s の値' % code(region.name), u'']
    lines.append(u'運ぶ値: %s。  ' % carried_cell(root['carries']))
    lines.append(u'根拠: %s。' % cited(root['evidence']))
    lines.append(u'')
    if not root['transitions']:
        lines.append(u'根の運ぶ値だけを書き換える出来事は無い。')
        return lines
    rows = [[code(region.event_id(event)), cell_text(branches, None, None, region)]
            for event, branches in region.root_cells()]
    lines += table_lines([u'出来事', code(region.name)], rows)
    return lines


def transition_rows(machine):
    region = machine.region
    leaves = machine.leaves()
    for event, row in machine.table.items():
        cells = [code(region.event_id(event))]
        for leaf in leaves:
            answer = NONE_CELL
            for source, cell in row.items():
                if machine.covers(source, leaf['key']):
                    answer = cell_text(branches_of(cell), source, leaf['key'], region)
            cells.append(answer)
        yield cells


def state_list(machine):
    lines = []
    for s in machine.states:
        parts = []
        if s['initial']:
            parts.append(u'初期')
        if s['parent'] is not None:
            parts.append(u'親 %s' % code(machine.state_id(s['parent'])))
        if s['carries']:
            parts.append(u'運ぶ値 %s' % carried_cell(s['carries']))
        parts.append(u'根拠 %s' % cited(s['evidence']))
        lines.append(u'- %s —— %s' % (code(machine.state_id(s['key'])), u'。'.join(parts)))
    return lines


# --- the diagram -------------------------------------------------------------
#
# ONE FIGURE PER REGION, ONE BLOCK PER MACHINE. A single diagram of every
# machine side by side came out about 1600px wide with labels a few pixels
# tall, so each machine is drawn in its own stateDiagram-v2 block, inside its
# own section, all under the region's one figure caption.
#
# THE PICTURE IS FOLDED; the machine's state transition table is the full
# truth. A fold unit is one outcome -- the same event, guard, target and
# effect -- written in several cells. Two folds, both read off the manuscript
# mechanically and never by name:
#   - a GROUP is a set of at least MIN_GROUP sibling kinds that one unit links
#     pairwise in both directions (a full mesh), or that one unit leaves for a
#     single kind outside the set (a fan-in), or enters from a single kind
#     outside the set (a fan-out). The siblings are drawn inside one
#     composite state;
#   - a unit that meshes the group is drawn ONCE as a self-loop on the
#     composite, and a fan-in or fan-out is drawn once from or to the
#     composite. A note beside the composite names the meshing events.
# Two candidate groups that overlap without being equal are both left
# unfolded rather than choosing one. Arrow labels carry the event key only;
# the guard and the effect are in the table.

MIN_GROUP = 3


def node(machine, key):
    return machine.name + (u'_' + key.replace('.', '_') if key else u'')


def scope_of(machine, source, target):
    """The innermost composite holding both ends (None for the top) -- where
    mermaid needs the arrow written, or it draws a second copy elsewhere."""
    common = None
    for a, b in zip(machine.ancestors(source), machine.ancestors(target)):
        if a != b:
            break
        common = a
    return common


def arrows(machine):
    """{section: [(unit, label, source, target), ...]} for one machine."""
    region = machine.region
    units = collections.OrderedDict()
    drawn = collections.OrderedDict()
    for event, key, branches in machine.cells():
        for branch in branches:
            unit = units.setdefault(
                (event, guard_words(branch.get('guard')), branch['to'],
                 branch.get('effect'), branch.get('effectArgument')), len(units))
            if branch['to'] == key:
                pairs = [(key, key)]
            else:
                ends = machine.targets_of(branch['to'], region.event_by_key[event])
                pairs = [(key, one) for one in ends if one != key or len(ends) == 1]
            for source, target in pairs:
                section = drawn.setdefault(scope_of(machine, source, target), [])
                if (unit, event, source, target) not in section:
                    section.append((unit, event, source, target))
    return drawn


def by_unit(edges):
    units = collections.OrderedDict()
    for unit, _label, source, target in edges:
        units.setdefault(unit, []).append((source, target))
    return units


def fold_shape(pairs):
    """('mesh' | 'in' | 'out', the set, the outside kind) for one unit, or None."""
    sources = set(s for s, _ in pairs)
    targets = set(t for _, t in pairs)
    if len(sources) >= MIN_GROUP and sources == targets:
        wanted = set((a, b) for a in sources for b in sources if a != b)
        if wanted <= set(pairs):
            return ('mesh', frozenset(sources), None)
    if len(sources) >= MIN_GROUP and len(targets) == 1 and not targets & sources:
        return ('in', frozenset(sources), next(iter(targets)))
    if len(targets) >= MIN_GROUP and len(sources) == 1 and not sources & targets:
        return ('out', frozenset(targets), next(iter(sources)))
    return None


def group_of(edges):
    """The one group this section folds, and how each unit folds into it."""
    shapes = collections.OrderedDict()
    for unit, pairs in by_unit(edges).items():
        shape = fold_shape(pairs)
        if shape:
            shapes[unit] = shape
    sets = set(shape[1] for shape in shapes.values())
    if len(sets) != 1:
        return None, {}
    return next(iter(sets)), shapes


def group_label(machine, members, group):
    """What the composite is called: the kinds it leaves out, or those it holds."""
    outside = [s for s in members if s['key'] not in group]
    if len(outside) == 1:
        return u'%s 以外' % machine.word(outside[0])
    return u' ・ '.join(machine.word(s) for s in members if s['key'] in group)


def edge_lines(pad, edges):
    merged = collections.OrderedDict()
    for label, source, target in edges:
        labels = merged.setdefault((source, target), [])
        if label not in labels:
            labels.append(label)
    return [pad + u'%s --> %s : %s' % (source, target, u', '.join(labels))
            for (source, target), labels in merged.items()]


def section_lines(machine, parent, drawn, indent):
    pad = u' ' * indent
    members = machine.children.get(parent, [])
    edges = drawn.get(parent, [])
    group, shapes = group_of(edges)
    labels = dict((unit, label) for unit, label, _s, _t in edges)
    lines = []
    for s in members:
        if s['initial']:
            lines.append(pad + u'[*] --> %s' % node(machine, s['key']))
    grouped = [s for s in members if group and s['key'] in group]
    for s in members:
        if s in grouped:
            continue
        lines.extend(state_lines(machine, s, drawn, indent))
    out = []
    if grouped:
        box = node(machine, parent) + u'_group'
        lines.append(pad + u'state "%s" as %s {' % (group_label(machine, members, group), box))
        for s in grouped:
            lines.extend(state_lines(machine, s, drawn, indent + 4))
        lines.append(pad + u'}')
        meshes = []
        for unit, (kind, _members, other) in shapes.items():
            if kind == 'mesh':
                out.append((labels[unit], box, box))
                if labels[unit] not in meshes:
                    meshes.append(labels[unit])
            elif kind == 'in':
                out.append((labels[unit], box, node(machine, other)))
            else:
                out.append((labels[unit], node(machine, other), box))
        if meshes:
            lines.append(pad + u'note right of %s : %s は組のどの 2 つの間も結ぶ'
                         % (box, u' ・ '.join(meshes)))
    for unit, label, source, target in edges:
        if unit in shapes:
            continue
        out.append((label, node(machine, source), node(machine, target)))
    return lines + edge_lines(pad, out)


def state_lines(machine, s, drawn, indent):
    pad = u' ' * indent
    lines = [pad + u'%s : %s' % (node(machine, s['key']), machine.word(s))]
    if s['key'] in machine.children:
        lines.append(pad + u'state %s {' % node(machine, s['key']))
        lines.extend(section_lines(machine, s['key'], drawn, indent + 4))
        lines.append(pad + u'}')
    return lines


def diagram(machine):
    drawn = arrows(machine)
    body = section_lines(machine, None, drawn, 4)
    # LR keeps a flat machine one row high; a nested or folded one reads narrower TB.
    nested = len(machine.children) > 1
    folded = group_of(drawn.get(None, []))[0] is not None
    direction = u'TB' if nested or folded else u'LR'
    return [u'```mermaid', u'stateDiagram-v2', u'    direction %s' % direction] \
        + body + [u'```']


def machine_lines(machine):
    lines = [u'', u'### 状態機械 %s' % code(machine.name), u'']
    lines += diagram(machine)
    lines.append(u'')
    head = [u'出来事'] + [code(s['key']) for s in machine.leaves()]
    lines += table_lines(head, transition_rows(machine))
    lines.append(u'')
    lines += state_list(machine)
    lines.append(u'')
    lines.append(u'表に無い出来事は %s を変えない（同じ参照）。' % code(machine.name))
    return lines


# --- the document ------------------------------------------------------------

HEADER = [
    u'# 状態機械 — 出来事・状態・状態遷移表',
    u'',
    u'**UID**: DOC-TBL-STATE-MACHINES',
    u'**Version**: 0.2',
    u'',
    u'> ⛔ 本書は生成物である。  ',
    u'> 手で直さない —— 直しても次の `npm run gen` で消える。',
    u'> **状態機械の唯一の正は `_source/state-machines.json` である。**  ',
    u'> 本書はそれを `_source/state_machines_json_to_md.py` が印字したものである。',
    u'> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`。',
    u'',
    u'本書は、保存しない状態の状態機械（`05-07-design.md` の 5.6 の ADR-002）を、領域ごと・状態機械ごとに印字したものである。  ',
    u'⚠️ 例外は行の木（`rowTree`）の 1 つだけであり、その状態は文書に保存する値である（`05-07-design.md` の 表 T-250 の `SD-5`）。  ',
    u'原稿が持つもの・持たないものは `05-07-design.md` の 表 T-250 が、状態機械の形は 表 T-249 が持つ。  ',
    u'名前の読み方は `05-07-design.md` の 5.5 が持つ。',
]


def region_lines(region):
    table = region.raw['table']
    figure = region.raw['figure']
    lines = [u'', u'## %s（%s）' % (text(region.raw['name']), code(region.name)), u'']
    lines.append(u'**表 %s — %s**' % (table['id'], text(table['caption'])))
    lines.append(u'')
    lines.append(u'本表は、出来事の定義・根の値・状態機械ごとの状態遷移表と状態の一覧からなる。  ')
    lines.append(u'状態遷移表の行はその状態機械を動かす出来事、列はその状態機械の葉の状態、'
                 u'升は「→ 次の状態 [ガード] / 副作用」である。  ')
    lines.append(u'升の「%s」は変化なし（同じ参照）を表す。  ' % NONE_CELL)
    lines.append(u'ガードの付いた枝がすべての場合を覆わない升には「それ以外 → %s」を添え、どの場合に何が起きるかを升ごとに言い切る。  ' % NONE_CELL)
    lines.append(u'親の状態に置いた升は、その子のすべての列に同じ升を刷り、「親 … の升」と書き添える。')
    if region.holds_document_data:
        lines.append(u'')
        lines.append(u'⭐ 本領域の状態は文書に保存する値である（`05-07-design.md` の 表 T-250 の `SD-5`） —— '
                     u'状態の型は `_assets/fig-erd-detail.md` の %s の列挙が持ち、状態のキーはその値と同じ並びである。  '
                     % code(region.raw['column']))
        lines.append(u'値が変われば、起こしたものによらず未保存の編集であり、取り消しの 1 段である（`01-04-requirements.md` の `FR-018`）。')
    name = text(region.raw['name'])
    # A name that ends in code (`Agent API`) takes a space before the particle, as the prose does.
    lines += [u'', u'### %s%sの出来事' % (name, u' ' if name.endswith(u'`') else u''), u'']
    lines += table_lines([u'出来事', u'どこから来るか', u'運ぶ値', u'動かすもの'],
                         event_rows(region))
    lines += root_lines(region)
    lines += [u'', u'**図 %s — %s**' % (figure['id'], text(figure['caption'])), u'']
    lines.append(u'状態機械ごとに 1 つの図に分け、その状態機械の節に置く。状態機械どうしは直交する。  ')
    lines.append(u'矢印のラベルは出来事のキーだけであり、ガード・副作用は同じ節の状態遷移表が持つ。  ')
    lines.append(u'⚠️ 図は畳んである —— 同じ出来事・ガード・先・副作用の升が %d つ以上の兄弟の種類の'
                 u'どの 2 つの間も結ぶか、それらのどれからも同じ 1 つの種類へ出るか、'
                 u'同じ 1 つの種類から入るときは、兄弟を 1 つの箱に囲み、その遷移を箱から 1 本だけ描く'
                 u'（どの 2 つの間も結ぶ遷移は、箱の注に出来事のキーを書く）。  ' % MIN_GROUP)
    lines.append(u'⭐ 遷移の全数は 表 %s の状態遷移表が持つ。' % table['id'])
    for machine in region.machines:
        lines += machine_lines(machine)
    return lines


def rung_state_text(state):
    if 'in' in state:
        return code(state['in'])
    return u'%s（%s 以外）' % (code(state['machine']), code(state['except']))


def priority_lines(priorities):
    """Table T-283: the order across regions (SD-4), printed ahead of the
    regions because it reads the states of all of them."""
    table = priorities['table']
    lines = [u'', u'## 領域をまたぐ優先順', u'']
    lines.append(u'**表 %s — %s**' % (table['id'], text(table['caption'])))
    lines.append(u'')
    lines.append(u'本表は、2 つ以上の領域が同じ入力を奪い合うとき、どの段が先に消費するかを並べる（`05-07-design.md` の 表 T-250 の `SD-4`）。  ')
    lines.append(u'同じ出来事の行は、上ほど先に消費する。  ')
    lines.append(u'段ごとの状態のキーは、その段に当たる状態であり、名は本書の各領域の状態の一覧に在る。  ')
    lines.append(u'⭐ 順そのものの正は、各行の「順を決めた行」が名指す要求の行である —— '
                 u'`Esc` の段の語と並びは `IN-4` の「消費する階層は」の並びと 1 対 1 で一致し、生成器がそれを確かめる。')
    lines.append(u'')
    rows = []
    for rung in priorities['rungs']:
        states = ALT.join(rung_state_text(s) for s in rung['states'])
        if rung.get('also'):
            states += u' と、' + text(rung['also'])
        rows.append([rung['id'], ALT.join(code(k) for k in rung['keys']), text(rung['rung']),
                     states, cited(rung['evidence']),
                     text(rung['note']) if rung.get('note') else NONE_CELL])
    lines += table_lines([u'行 ID', u'奪い合う出来事', u'段', u'段ごとの状態のキー',
                          u'順を決めた行', u'注'], rows)
    return lines


def build(regions, priorities=None):
    lines = list(HEADER)
    if priorities is not None:
        lines += priority_lines(priorities)
    for region in regions:
        lines += region_lines(region)
    return u'\n'.join(lines) + u'\n'


def main(argv):
    regions, found = load()
    if not found:
        priorities, found = load_priorities(regions)
    if found:
        for one in found:
            say('PROBLEM  ' + one)
        say('FAIL     %s: %d problem(s); nothing written' % (os.path.basename(SRC), len(found)))
        return 1
    body = build(regions, priorities)
    if '--check' in argv:
        current = io.open(OUT, encoding='utf-8', newline='').read() \
            if os.path.exists(OUT) else None
        if current != body:
            say('FAIL     docs/spec/_assets/%s differs from %s -- run npm run gen'
                % (OUT_NAME, os.path.basename(SRC)))
            return 1
        say('OK       docs/spec/_assets/%s matches its manuscript' % OUT_NAME)
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    say('wrote    docs/spec/_assets/%s' % OUT_NAME)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
