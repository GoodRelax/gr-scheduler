# -*- coding: utf-8 -*-
"""The one reader of state-machines.json, in the shape the NDD review standard
writes, and the region view every generator works on.

It writes nothing. docs/spec/_assets/tbl-state-machines.md and its figures
(state_machines_json_to_md.py) and the generated regions of the src units
(tools/generate_state_machine_types.py) are printed through it.

state-machines.json keeps the state transition tables in the keys of the NDD
review standard, appendix A.6 'List of JSON Keys': a top-level array
`stateMachines[]`, each with `name`, `states` (state names, no `initial`),
`transitions[]` ({source, target, trigger, guard?, effect?}) and `unhandled[]`
({source, trigger, handling}). Every key the project adds starts with `x`
(xRegions, xPriorities, xGuardLanguage at the top; xRegion, xStates on a
machine; xEffectArgument, xEvidence, xNote on a transition). Inside a value
that is itself a project key (an `x...` object, or a guard), the keys are
the project's own and carry no `x`.

The generators do not read that shape directly. `regions()` turns it into the
REGION VIEW they were written against -- per region its events, root, guards
and machines; per machine its states ({key, parent, initial, carries,
evidence, entry?, exit?}) and its table event -> current state -> cell -- so
the printed document and the generated code depend on the content, not on
the file's layout. The conversion is lossless both ways; `manuscript()` is
the inverse that a migration used once.

⛔ A transition from `initial` is the initial transition: it has no trigger,
and its target is the initial state at the target's level (a top-level state,
or the initial child of a composite). A composite every transition enters by
naming a child has none.

⭐ `unhandled[]` makes every cell explicit (R4 of the standard): for every
LEAF state and every event the machine names, exactly one entry answers --
a transition from the leaf or from one of its composites, or an `unhandled`
entry from the leaf or one of its composites with `handling` `ignore` (the
machine keeps its state and the same reference, SD-3) or `error`.
`problems()` refuses a pair answered twice or not at all.
"""
import collections
import io
import json

INITIAL = 'initial'
HANDLINGS = ('ignore', 'error')

TOP_KEYS = ('$schema', '$comment', 'xPriorities', 'xGuardLanguage',
            'xRegions', 'stateMachines')
MACHINE_KEYS = ('name', 'xRegion', 'states', 'xStates', 'transitions',
                'unhandled', 'finalStates')
TRANSITION_KEYS = ('source', 'target', 'trigger', 'guard', 'effect',
                   'xEffectArgument', 'xEvidence', 'xNote')
UNHANDLED_KEYS = ('source', 'trigger', 'handling')

# A branch of the region view <-> a transition of the manuscript.
BRANCH_TO_TRANSITION = (('to', 'target'), ('guard', 'guard'),
                        ('effect', 'effect'),
                        ('effectArgument', 'xEffectArgument'),
                        ('evidence', 'xEvidence'), ('note', 'xNote'))


def read(path):
    """The manuscript, key order kept."""
    return json.load(io.open(path, encoding='utf-8'),
                     object_pairs_hook=collections.OrderedDict)


def parent_of(key):
    """`shown.expanded` -> `shown`; a top-level state has no parent."""
    return key.rpartition('.')[0] or None


def leaves(states):
    return [s for s in states
            if not any(parent_of(other) == s for other in states)]


def covers(source, leaf):
    """A cell on a composite answers for every state below it."""
    return leaf == source or leaf.startswith(source + '.')


def problems(doc):
    """What the region view cannot be built from, or what the standard's
    keys refuse. Run after the schema; each message names the machine."""
    found = []
    for key in doc:
        if key not in TOP_KEYS:
            found.append('(root): key %s is neither a key of the standard nor '
                         'a project key starting with x' % key)
    regions = [r['region'] for r in doc.get('xRegions', [])]
    for machine in doc.get('stateMachines', []):
        name = machine.get('name', '?')
        for key in machine:
            if key not in MACHINE_KEYS:
                found.append('%s: key %s is not allowed on a machine'
                             % (name, key))
        if machine.get('xRegion') not in regions:
            found.append('%s: xRegion %r names no region of xRegions'
                         % (name, machine.get('xRegion')))
        states = machine.get('states', [])
        facts = machine.get('xStates', {})
        if list(facts) != list(states):
            found.append('%s: xStates must hold the states of `states`, in the '
                         'same order (states %s, xStates %s)'
                         % (name, list(states), list(facts)))
        for key in states:
            parent = parent_of(key)
            if key == INITIAL:
                found.append('%s: `initial` is not a state' % name)
            elif parent is not None and parent not in states:
                found.append('%s: state %s has no composite %s'
                             % (name, key, parent))
        found.extend(_transition_problems(name, machine, states))
        found.extend(_coverage_problems(name, machine, states))
    return found


def _transition_problems(name, machine, states):
    found = []
    initials = collections.Counter()
    for one in machine.get('transitions', []):
        for key in one:
            if key not in TRANSITION_KEYS:
                found.append('%s: key %s is not allowed on a transition'
                             % (name, key))
        source, target = one.get('source'), one.get('target')
        if source == INITIAL:
            if 'trigger' in one or set(one) - {'source', 'target'}:
                found.append('%s: the initial transition to %s carries only '
                             'source and target' % (name, target))
            if target not in states:
                found.append('%s: the initial transition targets %s, which is '
                             'not a state' % (name, target))
            initials[parent_of(target)] += 1
            continue
        if 'trigger' not in one:
            found.append('%s: the transition from %s to %s has no trigger'
                         % (name, source, target))
        if not one.get('xEvidence'):
            found.append('%s: the transition %s on %s has no xEvidence'
                         % (name, one.get('trigger'), source))
        if source not in states:
            found.append('%s: a transition leaves %s, which is not a state'
                         % (name, source))
    for parent, count in initials.items():
        if count > 1:
            found.append('%s: %d initial transitions at the level of %s'
                         % (name, count, parent or 'the machine'))
    return found


def _coverage_problems(name, machine, states):
    """Every pair of a leaf and an event of the machine, answered once."""
    found = []
    answers = collections.defaultdict(list)
    events = []
    for one in machine.get('transitions', []):
        if one.get('source') == INITIAL:
            continue
        answers[(one['trigger'], one['source'])].append('transition')
        if one['trigger'] not in events:
            events.append(one['trigger'])
    for one in machine.get('unhandled', []):
        if one.get('handling') not in HANDLINGS:
            found.append('%s: unhandled %s on %s: handling must be one of %s'
                         % (name, one.get('trigger'), one.get('source'),
                            ', '.join(HANDLINGS)))
        if one.get('source') not in states:
            found.append('%s: unhandled names %s, which is not a state'
                         % (name, one.get('source')))
        key = (one.get('trigger'), one.get('source'))
        if 'unhandled' in answers[key]:
            found.append('%s: unhandled %s on %s is written twice'
                         % (name, key[0], key[1]))
        if 'transition' in answers[key]:
            found.append('%s: %s on %s is both a transition and unhandled'
                         % (name, key[0], key[1]))
        answers[key].append('unhandled')
        if one.get('trigger') not in events:
            found.append('%s: unhandled names event %s, which no transition '
                         'of the machine names' % (name, one.get('trigger')))
    final = set(machine.get('finalStates', []))
    for leaf in leaves(states):
        if leaf in final:
            continue
        for event in events:
            sources = [source for (trigger, source), kinds in answers.items()
                       if trigger == event and kinds and covers(source, leaf)]
            if not sources:
                found.append('%s: %s on %s is neither a transition nor '
                             'unhandled -- write it in unhandled[] with '
                             'handling ignore or error' % (name, event, leaf))
            elif len(sources) > 1 and 'unhandled' in [
                    k for s in sources for k in answers[(event, s)]]:
                found.append('%s: %s on %s is answered by %s at once'
                             % (name, event, leaf, ', '.join(sources)))
    return found


def _branch(transition):
    branch = collections.OrderedDict()
    for view_key, source_key in BRANCH_TO_TRANSITION:
        if source_key in transition:
            branch[view_key] = transition[source_key]
    return branch


def _view_machine(machine):
    """One machine of the manuscript -> the region view's machine."""
    initial_targets = set(t['target'] for t in machine['transitions']
                          if t['source'] == INITIAL)
    states = []
    for key in machine['states']:
        facts = machine['xStates'][key]
        state = collections.OrderedDict()
        state['key'] = key
        state['parent'] = parent_of(key)
        state['initial'] = key in initial_targets
        for fact in facts:
            state[fact] = facts[fact]
        states.append(state)
    table = collections.OrderedDict()
    for one in machine['transitions']:
        if one['source'] == INITIAL:
            continue
        row = table.setdefault(one['trigger'], collections.OrderedDict())
        row.setdefault(one['source'], []).append(_branch(one))
    for row in table.values():
        for source, branches in row.items():
            row[source] = branches[0] if len(branches) == 1 else branches
    view = collections.OrderedDict()
    view['name'] = machine['name']
    view['states'] = states
    view['transitions'] = table
    view['unhandled'] = list(machine.get('unhandled', []))
    return view


def regions(doc):
    """The manuscript -> {'priorities', 'guardLanguage', 'regions'}, the
    region view; call only on a manuscript `problems()` passed."""
    out = collections.OrderedDict()
    if 'xPriorities' in doc:
        out['priorities'] = doc['xPriorities']
    out['guardLanguage'] = doc['xGuardLanguage']
    views = []
    for raw in doc['xRegions']:
        region = collections.OrderedDict(raw)
        region['machines'] = [_view_machine(m) for m in doc['stateMachines']
                              if m['xRegion'] == raw['region']]
        views.append(region)
    out['regions'] = views
    return out


def manuscript(view, unhandled):
    """The inverse of regions(): a region view (the former file) -> the
    manuscript. `unhandled` maps a machine name to its unhandled[] list."""
    out = collections.OrderedDict()
    if 'priorities' in view:
        out['xPriorities'] = view['priorities']
    out['xGuardLanguage'] = view['guardLanguage']
    out['xRegions'] = []
    out['stateMachines'] = []
    for region in view['regions']:
        raw = collections.OrderedDict(
            (k, v) for k, v in region.items() if k != 'machines')
        out['xRegions'].append(raw)
        for machine in region['machines']:
            one = collections.OrderedDict()
            one['name'] = machine['name']
            one['xRegion'] = region['region']
            one['states'] = [s['key'] for s in machine['states']]
            one['xStates'] = collections.OrderedDict(
                (s['key'], collections.OrderedDict(
                    (k, v) for k, v in s.items()
                    if k not in ('key', 'parent', 'initial')))
                for s in machine['states'])
            transitions = [collections.OrderedDict(
                [('source', INITIAL), ('target', s['key'])])
                for s in machine['states'] if s['initial']]
            for trigger, row in machine['transitions'].items():
                for source, cell in row.items():
                    for branch in (cell if isinstance(cell, list) else [cell]):
                        t = collections.OrderedDict()
                        t['source'] = source
                        t['target'] = branch['to']
                        t['trigger'] = trigger
                        for view_key, source_key in BRANCH_TO_TRANSITION[1:]:
                            if view_key in branch:
                                t[source_key] = branch[view_key]
                        extra = set(branch) - set(
                            k for k, _ in BRANCH_TO_TRANSITION)
                        assert not extra, (machine['name'], extra)
                        transitions.append(t)
            one['transitions'] = transitions
            if unhandled.get(machine['name']):
                one['unhandled'] = unhandled[machine['name']]
            out['stateMachines'].append(one)
    return out
