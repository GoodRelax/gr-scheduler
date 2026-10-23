# -*- coding: utf-8 -*-
"""state-machines.json -> docs/spec/_assets/tbl-state-machines.md and fig-sm-*.svg

state-machines.json is the manuscript for the unsaved state machines (ADR-002
of Chapter 5.6, table T-250 of docs/spec/05-07-design.md). EDIT THAT. This
file prints, per region, the event definitions, the guard list, the root's
values and one section per state machine -- the link to its UML figure, its
state transition table and its states -- and _assets/tbl-state-machines.md is
a generated artifact: a hand edit to it is overwritten, and --check catches
one before it can be committed. Ahead of the regions it prints the guard
language (`guardLanguage`) and table T-283, the order across regions (SD-4),
from the manuscript's top-level `priorities`; what `load_priorities()`
refuses is written on it. Only this printer reads `priorities` -- no code
constant is generated from it. The figures, one SVG per machine, are drawn by
state_machine_figures.py, which this file runs.

    python state_machines_json_to_md.py           rebuild the document and
                                                  redraw the stale figures
    python state_machines_json_to_md.py --check   exit 1 if the document
                                                  differs or a figure's
                                                  fingerprint does (no drawing)

It is also the ONE reader of the manuscript: tools/generate_state_machine_types.py
imports `load()` from here, so the two artifacts are printed from one
validated model and cannot disagree about what the manuscript says.

NAMES, NOT NUMBERS (JDG-286, R4.4 of docs/development-rules/07-review-
standards.md). A machine -- the definition -- is a noun phrase plus
`StateMachine` and is unique across every region; the code holds its current
state under the same noun phrase plus `State` (`armModeStateMachine` ->
`armModeState`); a state is `machine.key`; an event is `region/key`; a
transition is its cell -- the machine, the current state and the event.

GUARDS ARE CONDITIONS (JDG-2161, JDG-2362). Each region lists its guards,
and each guard's condition is an expression in the one language the
manuscript's `guardLanguage` defines; `load()` parses every condition here
and resolves every term it reads, so a printed condition cannot name a value
nothing holds. Entry and exit effects run as UML runs them -- exit, the
transition's own effect, entry; a transition to itself crosses nothing.

What `load()` refuses (CR-436 section 3.1 and wave A2), on top of the schema:
  - an evidence id -- of a state, its entry or exit, the root, a branch, an
    event source, a carried value, an effect argument, a guard or a function
    of the guard language -- that no table row or requirement of docs/spec
    defines (this file's own output is not counted);
  - a guard a cell names that its region's `guards` does not define, a guard
    defined twice in one region, and a defined guard no cell of the region
    names (CR-767);
  - a condition the guard language cannot read, and a term it reads that does
    not resolve: `event.x` the event of some cell using the guard does not
    carry, `root.x` the root does not carry, `machine.x` no state of that
    machine of the region carries, an entity term (`taskGroup.x`) outside a
    documentData region or naming no column of that entity in erd.json,
    `in(...)` / `inAfter(...)` naming no state of the region, and a function
    `guardLanguage` does not define or that is given the wrong number of
    arguments;
  - a function `guardLanguage` defines twice, or that no condition calls;
  - a cell whose state is not a state of its machine, whose `to` is not a
    state of the SAME machine, or whose `{name}` target is not a value the
    event carries (such a target stands for any top-level kind of the
    machine but its initial one; `parent.{name}` for any kind of that
    composite state but its initial one);
  - a guard term `in` that names no state of another machine of the region;
  - an event a machine's or the root's table uses that its region does not
    define, and an event no table uses;
  - an event with a cell on a state and on one of that state's ancestors in
    the same machine, and a cell of two or more branches one of which has no
    guard;
  - a union without exactly one initial state -- but a composite state that
    no cell names as its target and that is not itself initial may have none
    (every transition enters it by naming a child, as `armed.{armKind}`);
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
  - a region that holds documentData (SD-5 of table T-250, the task group tree)
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

import state_machine_figures as figures
from spec_md_printing import say

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


def names_of(carries):
    return [c['name'] for c in carries]


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


# --- the guard language ------------------------------------------------------
#
# A small recursive descent over the forms `guardLanguage` writes down. `!`
# binds tighter than a comparison or `in`, which bind tighter than `&&`, which
# binds tighter than `||`. The tree is tuples: ('lit', value), ('list', [x]),
# ('path', [word, ...]), ('field', x, word), ('call', name, [x]),
# ('state', 'in' | 'inAfter', state id), ('not', x) and (operator, left, right).

# A number, a quoted text, a word, or an operator.
TOKEN = re.compile(r"\s*(?:(\d+)|('[^']*')|([A-Za-z][A-Za-z0-9]*)"
                   r"|(&&|\|\||==|!=|<=|>=|[!<>().,\[\]]))")
COMPARE = ('==', '!=', '<', '<=', '>', '>=', 'in')
LITERALS = {'true': True, 'false': False, 'null': None}
STATE_TERMS = ('in', 'inAfter')


def tokens(condition):
    out = []
    at = 0
    while condition[at:].strip():
        found = TOKEN.match(condition, at)
        if not found:
            raise ValueError('cannot read %r' % condition[at:].strip())
        out.append(next(g for g in found.groups() if g is not None))
        at = found.end()
    return out


class Condition(object):
    """One condition read into its tree; ValueError says where it stopped."""

    def __init__(self, condition):
        self.words = tokens(condition)
        self.at = 0
        self.tree = self.either()
        if self.peek() is not None:
            raise ValueError('unexpected %s' % self.peek())

    def peek(self):
        return self.words[self.at] if self.at < len(self.words) else None

    def take(self, wanted=None):
        word = self.peek()
        if word is None or wanted is not None and word != wanted:
            raise ValueError('expected %s, found %s' % (wanted or 'more', word or 'the end'))
        self.at += 1
        return word

    def either(self):
        tree = self.both()
        while self.peek() == '||':
            tree = (self.take(), tree, self.both())
        return tree

    def both(self):
        tree = self.compared()
        while self.peek() == '&&':
            tree = (self.take(), tree, self.compared())
        return tree

    def compared(self):
        tree = self.negated()
        if self.peek() in COMPARE:
            tree = (self.take(), tree, self.negated())
        return tree

    def negated(self):
        if self.peek() == '!':
            self.take()
            return ('not', self.negated())
        return self.postfix()

    def postfix(self):
        tree = self.primary()
        while self.peek() == '.':
            self.take()
            word = self.take()
            if not word[0].isalpha():
                raise ValueError('expected a field name, found %s' % word)
            tree = ('path', tree[1] + [word]) if tree[0] == 'path' else ('field', tree, word)
        return tree

    def primary(self):
        word = self.take()
        if word == '(':
            tree = self.either()
            self.take(')')
            return tree
        if word == '[':
            return ('list', self.items(']'))
        if word.isdigit():
            return ('lit', int(word))
        if word.startswith("'"):
            return ('lit', word[1:-1])
        if word in LITERALS:
            return ('lit', LITERALS[word])
        if not word[0].isalpha():
            raise ValueError('unexpected %s' % word)
        if self.peek() != '(':
            return ('path', [word])
        self.take()
        if word not in STATE_TERMS:
            return ('call', word, self.items(')'))
        state = self.postfix()
        self.take(')')
        if state[0] != 'path':
            raise ValueError('%s() takes a state id' % word)
        return ('state', word, '.'.join(state[1]))

    def items(self, close):
        out = []
        while self.peek() != close:
            if out:
                self.take(',')
            out.append(self.either())
        self.take(close)
        return out

    def nodes(self, tree=None):
        """Every node of the tree, the tree itself first."""
        tree = self.tree if tree is None else tree
        yield tree
        for part in tree[1:]:
            for child in (part if isinstance(part, list) else [part]):
                if isinstance(child, tuple):
                    for one in self.nodes(child):
                        yield one


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

    def entered_by_child_only(self, parent):
        """A composite no cell targets and its union does not start in: every
        transition enters it by naming a child, so it needs no initial child."""
        if parent is None or self.by_key[parent]['initial']:
            return False
        return all(b['to'] != parent for _, _, branches in self.cells() for b in branches)

    def check_initials(self, found):
        for parent, members in self.children.items():
            label = self.name if parent is None else self.state_id(parent)
            count = sum(1 for s in members if s['initial'])
            if count == 0 and self.entered_by_child_only(parent):
                continue
            if count != 1:
                found.append('%s: %d initial states in the union %s'
                             % (self.name, count, label))

    def targets_of(self, key, event):
        """The state keys a `to` can mean: itself, or the kinds a value names --
        `{name}` among the top-level kinds, `parent.{name}` among a composite's."""
        parent, _, last = key.rpartition('.')
        hole = PLACEHOLDER.match(last)
        if not hole:
            return [key] if key in self.by_key else []
        if hole.group(1) not in [c['name'] for c in event['carries']]:
            return []
        if parent and parent not in self.children:
            return []
        # The value names a kind that is ENTERED, so never the union's
        # initial kind -- the absence the union starts from (`none`).
        return [s['key'] for s in self.children.get(parent or None, []) if not s['initial']]

    def cells(self):
        """(event key, state key, [branch, ...]) in the manuscript's order."""
        for event, row in self.table.items():
            for key, cell in row.items():
                yield event, key, branches_of(cell)

    def crossed(self, key, target):
        """(left, entered) by a transition from `key` to `target`: the states it
        leaves, innermost first, and those it enters, outermost first."""
        if target == key:
            return [], []
        source = [key] + self.ancestors(key)[::-1]
        aim = [target] + self.ancestors(target)[::-1]
        return [s for s in source if s not in aim], [s for s in aim[::-1] if s not in source]

    def effects_of(self, key, branch, event):
        """The effect names one branch runs, in UML's order: the exits of the
        states it leaves, its own effect, the entries of the states it enters
        (a `{name}` target may enter any of the kinds the value names)."""
        left, entered = [], []
        for target in self.targets_of(branch['to'], event):
            out, into = self.crossed(key, target)
            left += [s for s in out if s not in left]
            entered += [s for s in into if s not in entered]
        names = [self.by_key[s]['exit']['effect'] for s in left if 'exit' in self.by_key[s]]
        names += [branch['effect']] if branch.get('effect') else []
        return names + [self.by_key[s]['entry']['effect'] for s in entered
                        if 'entry' in self.by_key[s]]


class Region(object):
    """One region, read and cross-checked. Everything a printer needs."""

    def __init__(self, raw):
        self.raw = raw
        self.name = raw['region']
        # SD-5: a region that holds a saved value of the document (the task group
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
        self.guards = collections.OrderedDict((g['name'], g) for g in raw.get('guards', []))

    def event_id(self, key):
        return '%s/%s' % (self.name, key)

    def effect_order(self):
        """Every effect the region's cells run, in the order the cells stand --
        the root's first -- and a branch's own in UML's order (effects_of)."""
        names = [b['effect'] for _e, branches in self.root_cells() for b in branches
                 if b.get('effect')]
        for machine in self.machines:
            for event, key, branches in machine.cells():
                for branch in branches:
                    names += machine.effects_of(key, branch, self.event_by_key[event])
        return names

    def guard_uses(self):
        """guard name -> [(cell, event key), ...] for every cell naming it."""
        uses = collections.OrderedDict()
        rows = [(self.name, event, branches) for event, branches in self.root_cells()]
        rows += [(m.state_id(key), event, branches)
                 for m in self.machines for event, key, branches in m.cells()]
        for cell, event, branches in rows:
            for branch in branches:
                for term in branch.get('guard') or []:
                    if 'name' in term:
                        uses.setdefault(term['name'], []).append((cell, event))
        return uses

    def check_guards(self, functions, found):
        """The guard list against the cells, and each condition against the
        guard language and this region; returns the function names called."""
        called = set()
        found.extend('%s: guard %s is defined twice' % (self.name, d)
                     for d in duplicates(g['name'] for g in self.raw.get('guards', [])))
        uses = self.guard_uses()
        found.extend('%s: guard %s is named by %s but not defined in the region'
                     % (self.name, name, cells[0][0])
                     for name, cells in uses.items() if name not in self.guards)
        for name, guard in self.guards.items():
            where = '%s: guard %s' % (self.name, name)
            if name not in uses:
                found.append('%s is defined but no cell names it' % where)
                continue
            try:
                condition = Condition(guard['condition'])
            except ValueError as e:
                found.append('%s: %s' % (where, e))
                continue
            for node in condition.nodes():
                if node[0] == 'call':
                    called.add(node[1])
                problem = self.unresolved(node, uses[name], functions)
                if problem:
                    found.append('%s: %s' % (where, problem))
        return called

    def unresolved(self, node, cells, functions):
        """Why one node of a condition names nothing, or None."""
        if node[0] == 'state' and self.state_of(node[2])[0] is None:
            return '%s(%s) names no state of region %s' % (node[1], node[2], self.name)
        if node[0] == 'call':
            if node[1] not in functions:
                return 'calls %s, which guardLanguage does not define' % node[1]
            if len(functions[node[1]]) != len(node[2]):
                return '%s takes %d argument(s), not %d' % (
                    node[1], len(functions[node[1]]), len(node[2]))
        if node[0] == 'path':
            return self.unresolved_path(node[1], cells)
        return None

    def unresolved_path(self, words, cells):
        head = words[0]
        carry = words[1] if len(words) > 1 else None
        if carry is None:
            return '%s is no term of the guard language' % head
        if head == 'event':
            for cell, event in cells:
                known = self.event_by_key.get(event)
                if known is not None and carry not in names_of(known['carries']):
                    return 'reads event.%s, which %s does not carry (%s)' % (
                        carry, self.event_id(event), cell)
            return None
        if head == 'root':
            if carry not in names_of(self.root['carries']):
                return 'reads root.%s, which the root does not carry' % carry
            return None
        if head in self.machine_by_name:
            if not any(carry in names_of(s['carries']) for s in self.machine_by_name[head].states):
                return 'reads %s.%s, which no state of %s carries' % (head, carry, head)
            return None
        entity = self.document_entity()
        if entity is not None and head == entity['name'][0].lower() + entity['name'][1:]:
            if carry not in [c['name'] for c in entity['columns']]:
                return '%s.%s is no column of %s in erd.json' % (head, carry, entity['name'])
            return None
        return '%s.%s is no term of the guard language in region %s' % (head, carry, self.name)

    def document_entity(self):
        """SD-5: the erd.json entity whose column a documentData region holds."""
        if not self.holds_document_data or 'column' not in self.raw:
            return None
        return entity_of_column(self.raw['column'])[0]

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
        for guard in self.guards.values():
            out.append(('%s: guard %s' % (self.name, guard['name']), guard['evidence']))
        for machine in self.machines:
            for state in machine.states:
                cited = list(state['evidence'])
                for carried in state['carries']:
                    cited.extend(carried.get('rows', []))
                for moment in ('entry', 'exit'):
                    if moment in state:
                        cited.extend(state[moment]['evidence'])
                        if state[moment].get('effectArgument'):
                            cited.append(state[moment]['effectArgument'])
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


def entity_of_column(seat_id):
    """(entity, column) of erd.json for the column whose seat is `AT-<n>`,
    or (None, None)."""
    erd = json.load(io.open(ERD, encoding='utf-8'))
    seat = int(seat_id.split('-')[1])
    for entity in erd['entities']:
        for column in entity.get('columns', []):
            if column.get('seat') == seat:
                return entity, column
    return None, None


def enum_of_column(seat_id):
    """The enum values of the erd.json column whose seat is `AT-<n>`, or None."""
    column = entity_of_column(seat_id)[1]
    return None if column is None else column.get('json', {}).get('values')


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
    language = doc['guardLanguage']
    found.extend('guardLanguage: function %s appears twice' % d
                 for d in duplicates(f['name'] for f in language['functions']))
    functions = dict((f['name'], f['parameters']) for f in language['functions'])
    called = set()
    for one in language['functions']:
        found.extend('guardLanguage: function %s: %s is not defined in docs/spec' % (one['name'], e)
                     for e in one['evidence'] if e not in known)
    for region in regions:
        found.extend('event %s appears twice' % region.event_id(d)
                     for d in duplicates(e['key'] for e in region.events))
        for machine in region.machines:
            found.extend('state %s appears twice' % machine.state_id(d)
                         for d in duplicates(s['key'] for s in machine.states))
            machine.classify(found)
            machine.check_initials(found)
        region.check_tables(found)
        called |= region.check_guards(functions, found)
        found.extend(document_data_problems(region))
        for where, cited in region.evidence():
            for one in cited:
                if one not in known:
                    found.append('%s: %s is not defined in docs/spec' % (where, one))
    found.extend('guardLanguage: function %s is called by no condition' % name
                 for name in functions if name not in called)
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


CODE_SPAN = re.compile(u'`([^`]*)`')


def html_code(content):
    escaped = content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return u'<code>%s</code>' % escaped.replace('|', '&#124;')


def bar_free(cell):
    """A table cell with no `|` left in it. ⛔ Not even in a code span: every
    reader of docs/spec splits a row on the bar (check 10 counts the cells),
    and a guard condition holds `||`. A code span holding one becomes an HTML
    code element with the bar as a character reference; a bare bar becomes
    the reference alone."""
    if '|' not in cell:
        return cell
    cell = CODE_SPAN.sub(lambda m: html_code(m.group(1)) if '|' in m.group(1) else m.group(0), cell)
    return cell.replace('|', '&#124;')


def named_guard(name, region):
    """A named guard term as「`name`（`condition`）」(D3 of CR-767)."""
    guard = region.guards.get(name) if region is not None else None
    if guard is None:
        return code(name)
    return u'%s（%s）' % (code(name), code(guard['condition']))


def guard_text(guard, region=None):
    terms = []
    for term in guard:
        if 'in' in term:
            terms.append(u'%s にいる' % code(term['in']))
        else:
            terms.append((u'not ' if term.get('not') else u'') + named_guard(term['name'], region))
    return u'[%s]' % AND.join(terms)


def effect_text(holder):
    """「/ `effect`（`argument`）」of a branch, an entry or an exit."""
    cell = u'/ ' + code(holder['effect'])
    if holder.get('effectArgument'):
        cell += u'（%s）' % code(holder['effectArgument'])
    return cell


def branch_text(branch, source, region=None):
    """One branch as「→ 次 [ガード] / 副作用」. `source` is the state the cell is on."""
    if 'to' not in branch or branch['to'] == source:
        cell = u'→ 自己'
    else:
        cell = u'→ ' + code(branch['to'])
    if branch.get('guard'):
        cell += u' ' + guard_text(branch['guard'], region)
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
    lines = [branch_text(b, source, region) for b in branches]
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
        lines.append(u'| ' + u' | '.join(bar_free(c) for c in cells) + u' |')
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


MOMENTS = ('entry', 'exit')


def moment_rows(machine):
    """The `entry` / `exit` rows above the event rows (CR-767 X-b): one per
    moment some state of the machine has, its effect printed in the column of
    every leaf at or below the state that has it."""
    leaves = machine.leaves()
    for moment in MOMENTS:
        holders = [s for s in machine.states if moment in s]
        if not holders:
            continue
        cells = [moment]
        for leaf in leaves:
            pieces = []
            for state in holders:
                if not machine.covers(state['key'], leaf['key']):
                    continue
                piece = effect_text(state[moment])
                if state[moment].get('note'):
                    piece += u'（%s）' % text(state[moment]['note'])
                if state['key'] != leaf['key']:
                    piece += u'（親 %s の升）' % code(state['key'])
                pieces.append(piece)
            cells.append(u'<br>'.join(pieces) if pieces else NONE_CELL)
        yield cells


def transition_rows(machine):
    region = machine.region
    leaves = machine.leaves()
    for cells in moment_rows(machine):
        yield cells
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
        for moment in MOMENTS:
            if moment in s:
                parts.append(u'%s %s' % (moment, effect_text(s[moment])))
        parts.append(u'根拠 %s' % cited(s['evidence']))
        lines.append(u'- %s —— %s' % (code(machine.state_id(s['key'])), u'。'.join(parts)))
    return lines


def machine_lines(machine):
    lines = [u'', u'### 状態機械 %s' % code(machine.name), u'']
    lines.append(figures.link(machine))
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
    u'⚠️ 例外はタスクグループの木（`taskGroupTree`）の 1 つだけであり、その状態は文書に保存する値である（`05-07-design.md` の 表 T-250 の `SD-5`）。  ',
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
    lines.append(u'ガードは名と条件を「`名`（`条件`）」と刷り、条件は同じ領域のガードの一覧と同じである。  ')
    lines.append(u'状態に entry ／ exit の副作用がある状態機械は、出来事の行の上に `entry` ／ `exit` の行を置く'
                 u' —— その状態へ入る遷移・出る遷移が、出 → 遷移の副作用 → 入の順に起こし、'
                 u'自己への遷移（「→ 自己」）は起こさない。  ')
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
    lines += guard_list_lines(region, name)
    lines += root_lines(region)
    lines += [u'', u'**図 %s — %s**' % (figure['id'], text(figure['caption'])), u'']
    lines.append(u'状態機械ごとに 1 つの図に分け、その状態機械の節に置く。状態機械どうしは直交する。  ')
    lines.append(u'図は UML の状態機械図である —— 矢印のラベルは「出来事 [ガード] / 副作用」、'
                 u'同じ 2 つの状態を結ぶ遷移は 1 本の矢印に 1 行ずつ並べる。'
                 u'ガードは名で書き、条件は同じ領域のガードの一覧が持つ。  ')
    lines.append(u'行き先が運ぶ値で決まる升は選択の擬似状態（◇）で分ける。'
                 u'entry ／ exit は状態の箱の中に書く。  ')
    lines.append(u'⭐ 遷移の全数は 表 %s の状態遷移表が持つ。図と表はどちらも原稿から刷る。' % table['id'])
    for machine in region.machines:
        lines += machine_lines(machine)
    return lines


def guard_list_lines(region, name):
    """The region's guard list (CR-767 X-e): a table with no number, next to
    the tables whose cells name the guards (R4.4)."""
    if not region.guards:
        return []
    lines = [u'', u'### %s%sのガード' % (name, u' ' if name.endswith(u'`') else u''), u'']
    lines.append(u'升が名で引くガードと、その条件（本書の頭の「ガードの条件の書き方」で書く）。')
    lines.append(u'')
    rows = []
    for guard in region.guards.values():
        condition = code(guard['condition'])
        if guard.get('note'):
            condition += u'（%s）' % text(guard['note'])
        rows.append([code(guard['name']), condition, cited(guard['evidence'])])
    return lines + table_lines([u'ガード', u'条件', u'根拠'], rows)


def form_cell(form):
    """A form of the guard language, each of its ・-separated forms as code."""
    return JOIN.join(code(one) for one in form.split(JOIN))


def language_lines(language):
    """The guard language (`guardLanguage`), once, ahead of the regions."""
    lines = [u'', u'## ガードの条件の書き方', u'']
    lines.append(u'各領域のガードの一覧の条件は、次の項・演算・関数だけで書く式である。  ')
    lines.append(u'生成器は条件を 1 つずつ読み、読む値が在ることを確かめる'
                 u'（`_source/state_machines_json_to_md.py` の `load()`）。')
    lines += [u'', u'### 項', u'']
    lines += table_lines([u'項', u'意味'],
                         [[form_cell(t['form']), text(t['meaning'])] for t in language['terms']])
    lines += [u'', u'### 演算', u'']
    lines += table_lines([u'演算', u'意味'],
                         [[form_cell(o['form']), text(o['meaning'])] for o in language['operators']])
    lines += [u'', u'### 関数', u'']
    lines += table_lines([u'関数', u'意味', u'根拠'],
                         [[code(u'%s(%s)' % (f['name'], u', '.join(f['parameters']))),
                           text(f['meaning']), cited(f['evidence'])]
                          for f in language['functions']])
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


def build(regions, priorities=None, language=None):
    lines = list(HEADER)
    if language is not None:
        lines += language_lines(language)
    if priorities is not None:
        lines += priority_lines(priorities)
    for region in regions:
        lines += region_lines(region)
    return u'\n'.join(lines) + u'\n'


def guard_language():
    """The manuscript's `guardLanguage`, which load() has already checked."""
    return json.load(io.open(SRC, encoding='utf-8'),
                     object_pairs_hook=collections.OrderedDict)['guardLanguage']


def check(regions, body):
    """--check: the document and every figure's fingerprint; nothing drawn."""
    current = io.open(OUT, encoding='utf-8', newline='').read() \
        if os.path.exists(OUT) else None
    problems = []
    if current != body:
        problems.append('docs/spec/_assets/%s differs from %s -- run npm run gen'
                        % (OUT_NAME, os.path.basename(SRC)))
    problems += figures.check(regions)
    for one in problems:
        say('FAIL     ' + one)
    if problems:
        return 1
    say('OK       docs/spec/_assets/%s and its %d figures match the manuscript'
        % (OUT_NAME, sum(len(r.machines) for r in regions)))
    return 0


def write(regions, body):
    """Print the document, then redraw the figures that are missing or stale."""
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    say('wrote    docs/spec/_assets/%s' % OUT_NAME)
    drawn, problems, seconds = figures.redraw(regions)
    if drawn:
        say('drew     %d figure(s) in %.1fs: %s' % (len(drawn), seconds, ', '.join(drawn)))
    for one in problems:
        say('FAIL     ' + one)
    return 1 if problems else 0


def main(argv):
    regions, found = load()
    if not found:
        priorities, found = load_priorities(regions)
    if found:
        for one in found:
            say('PROBLEM  ' + one)
        say('FAIL     %s: %d problem(s); nothing written' % (os.path.basename(SRC), len(found)))
        return 1
    body = build(regions, priorities, guard_language())
    if '--check' in argv:
        return check(regions, body)
    return write(regions, body)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
