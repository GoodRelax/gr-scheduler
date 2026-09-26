# -*- coding: utf-8 -*-
"""Write the generated region of each state-machine region unit.

READS   docs/spec/_source/state-machines.json (through the one reader,
        docs/spec/_source/state_machines_json_to_md.py `load()`)
WRITES  the region between `// <generated -- do not edit by hand>` and
        `// </generated>` of the unit each region names (`unit`), e.g.
        src/use-case/advance-screen-session/screen-values.ts

What it prints per region, with <Stem> the region's `typeStem` and <Noun>
a machine's name without `StateMachine`, in PascalCase (JDG-286, R4.4):
  <Stem>Key                 the root key and every state id (`machine.key`),
                            as a string-literal union
  <Noun>State               the current state of one machine, a discriminated
                            union (`kind` = the last key segment); a
                            composite state holds its own union as `child`,
                            typed <Noun><Path>State;
                            a carried value is a field typed through the
                            hand-written <Stem>StateCarried
  <Stem>                    the root: its carried values and one field per
                            machine, named <noun>State (armModeStateMachine
                            -> armModeState)
  <Stem>Event               one member per event (`type` = the event key),
                            carried values typed through <Stem>EventCarried
  <Stem>EffectName          every effect name the tables use (`never` when
                            they use none)
  <Stem>Transition          the row shape of the table below: one branch of
                            one cell (state x event); printed only with it
  <STEM>_INITIAL_CHILDREN   the kind entered below a composite state (not
                            printed for a region that nests no composite)
  <STEM>_INITIAL_AXES       the initial value of every machine
  <STEM>_TRANSITIONS        printed only for a unit TRANSITIONS_READ names
                            (JDG-139, below);
                            every branch of the region's tables (table T-280
                            for `screen`, table T-286 for `notices`, table
                            T-289 for `gesture`, table T-290 for `fileFlow`,
                            table T-292 for `fieldEntry`, table T-293 for
                            `selection`, table T-295 for
                            `interactionRecord`, table T-296 for
                            `agentApi`, table T-328 for `rowTree`), the
                            root's first, then each machine's in manuscript
                            order

A region that holds documentData (SD-5 of table T-250 -- the row tree, whose
unit is src/use-case/edit-document/task-group-folding.ts) is a SAVED value of
the document, so it gets no state unions, no root type and no initial values:
its state type is the erd.json enum column the region names. Only <Stem>Key,
<Stem>Event, <Stem>EffectName, <Stem>Transition and <STEM>_TRANSITIONS are
printed for it (table T-328).

Everything else in the unit -- the carried-value types, the transition
functions, the guards and the effect payloads -- is hand written (table T-250,
SD-3), and a contract test holds the functions against the manuscript.

A file without the two markers is refused, never created: the hand-written
half of the unit is not this script's to write.

Usage:
    python tools/generate_state_machine_types.py           write the regions
    python tools/generate_state_machine_types.py --check   exit 1 when one differs
Run with PYTHONIOENCODING=utf-8.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SOURCE_DIR = os.path.join(ROOT, 'docs', 'spec', '_source')

sys.dont_write_bytecode = True
sys.path.insert(0, SOURCE_DIR)
import state_machines_json_to_md as manuscript  # noqa: E402

OPEN = '// <generated -- do not edit by hand>'
CLOSE = '// </generated>'
REGION = re.compile(re.escape(OPEN) + r'\n.*?' + re.escape(CLOSE), re.S)


# ---- JDG-139: which transition tables are printed, and which leave their file
#
# The user's ruling of 2026-09-16 (tools/generate_entity_types.py holds the
# full reasoning): a generated constant is EXPORTED ONLY WHEN ANOTHER FILE
# READS IT, and is otherwise a plain `const`. A plain `const` that nothing
# reads at all -- not even its own file -- is refused by noUnusedLocals, so
# it is not generated (the precedent is NOT_STORED_ROW_CONTROL_OUTER_SIZES).
#
# The hand-written `step` of a region answers from its own code and never
# reads the region's <STEM>_TRANSITIONS; the per-region contract test holds it
# against the manuscript directly (table T-250, SD-3). Only the tests that
# checked the printed table against the manuscript read it, and CR-573 (rule
# R3 of table UO, docs/development-rules/04-verification.md) removed them.
# A region unit not named below therefore gets neither the table nor its row
# type <Stem>Transition.
#
# Per unit, with the path relative to the repository root:
#   'export'  another file of src/ or tests/ reads the table
#   'const'   only the unit itself reads it
# Check 30 (.claude/skills/spec-graph-check/check-generated-constants.py)
# refuses an exported copy nobody imports and a read copy that is not
# exported; this generator refuses an entry that names no region's unit.
TRANSITIONS_READ = {
    # task-group-folding.ts looks its cells up; the contract test counts rows.
    'src/use-case/edit-document/task-group-folding.ts': 'export',
}


def refuse_unknown_transition_units(regions):
    """Stop when TRANSITIONS_READ names a unit no region writes, or a bad mode."""
    units = set(region.raw['unit'] for region in regions)
    stray = sorted(set(TRANSITIONS_READ) - units)
    if stray:
        raise SystemExit(
            'generate_state_machine_types: TRANSITIONS_READ names %s, which no '
            'region of state-machines.json names as its unit.' % ', '.join(stray))
    bad = sorted(rel for rel, mode in TRANSITIONS_READ.items()
                 if mode not in ('export', 'const'))
    if bad:
        raise SystemExit(
            'generate_state_machine_types: TRANSITIONS_READ gives %s a mode '
            'other than export / const.' % ', '.join(bad))


def say(message):
    sys.stdout.write(message + '\n')


def pascal(word):
    return word[:1].upper() + word[1:]


def upper_snake(stem):
    return re.sub(r'(?<!^)(?=[A-Z])', '_', stem).upper()


def quoted(value):
    return "'%s'" % value


class Printer(object):
    def __init__(self, region):
        self.region = region
        self.stem = region.stem
        self.upper = upper_snake(region.stem)
        self.root = region.name

    # --- names ---------------------------------------------------------------

    def union_name(self, machine, parent):
        """The type of one union: a machine's top kinds, or a composite's kinds."""
        path = parent.split('.') if parent else []
        noun = machine.name[:-len('StateMachine')]
        return pascal(noun) + ''.join(pascal(p) for p in path) + 'State'

    def state_carried(self, name):
        return "%sStateCarried['%s']" % (self.stem, name)

    def event_carried(self, name):
        return "%sEventCarried['%s']" % (self.stem, name)

    # --- the state types -----------------------------------------------------

    def member(self, machine, state):
        fields = ["readonly kind: '%s'" % machine.word(state)]
        fields += ['readonly %s: %s' % (c['name'], self.state_carried(c['name']))
                   for c in state['carries']]
        if state['key'] in machine.children:
            fields.append('readonly child: %s' % self.union_name(machine, state['key']))
        return '{ %s }' % '; '.join(fields)

    def union(self, machine, parent):
        lines = ['export type %s =' % self.union_name(machine, parent)]
        lines += ['  | %s' % self.member(machine, s) for s in machine.children[parent]]
        return lines + ['']

    def composites(self):
        return [(m, p) for m in self.region.machines for p in m.children if p is not None]

    def unions(self):
        """Innermost first, so a type is printed before the one that holds it."""
        out = []
        for machine, parent in sorted(self.composites(), key=lambda mp: -mp[1].count('.')):
            out += self.union(machine, parent)
        for machine in self.region.machines:
            out += self.union(machine, None)
        return out

    def root_type(self):
        carried = [c['name'] for c in self.region.root['carries']]
        lines = ['export interface %s {' % self.stem]
        lines += ['  readonly %s: %s' % (n, self.state_carried(n)) for n in carried]
        lines += ['  readonly %s: %s' % (m.holder(), self.union_name(m, None))
                  for m in self.region.machines]
        lines += ['}', '']
        omitted = ' | '.join(quoted(n) for n in carried) or 'never'
        lines += ['export type %sAxes = Omit<%s, %s>' % (self.stem, self.stem, omitted), '']
        return lines

    # --- the initial values --------------------------------------------------

    def initial_of(self, machine, parent):
        """The object literal of a union's initial member."""
        state = [s for s in machine.children[parent] if s['initial']][0]
        if state['carries']:
            raise ValueError('%s is an initial state and carries %s, which the '
                             'manuscript gives no initial value'
                             % (machine.state_id(state['key']),
                                ', '.join(c['name'] for c in state['carries'])))
        fields = ["kind: '%s'" % machine.word(state)]
        if state['key'] in machine.children:
            fields.append('child: %s_INITIAL_CHILDREN[%s]'
                          % (self.upper, quoted(machine.state_id(state['key']))))
        return '{ %s }' % ', '.join(fields)

    def initial_children(self):
        # WHY: a region whose states nest no composite (`notices`) would get an
        # empty table nobody reads, and noUnusedLocals refuses an unread constant.
        composites = self.composites()
        if not composites:
            return []
        name = '%s_INITIAL_CHILDREN' % self.upper
        lines = ['const %s: {' % name]
        lines += ['  readonly %s: %s' % (quoted(m.state_id(p)), self.union_name(m, p))
                  for m, p in composites]
        lines += ['} = {']
        lines += ['  %s: %s,' % (quoted(m.state_id(p)), self.initial_of(m, p))
                  for m, p in composites]
        return lines + ['}', '']

    def initial_axes(self):
        lines = ['const %s_INITIAL_AXES: %sAxes = {' % (self.upper, self.stem)]
        lines += ['  %s: %s,' % (m.holder(), self.initial_of(m, None))
                  for m in self.region.machines]
        return lines + ['}', '']

    # --- events, effects, transitions -----------------------------------------

    def events(self):
        lines = ['export type %sEvent =' % self.stem]
        for event in self.region.events:
            fields = ["readonly type: '%s'" % event['key']]
            fields += ['readonly %s: %s' % (c['name'], self.event_carried(c['name']))
                       for c in event['carries']]
            lines.append('  | { %s }' % '; '.join(fields))
        return lines + ['']

    def rows(self):
        """(state id, event, branch, target id) for every branch, the root's first."""
        region = self.region
        for event, branches in region.root_cells():
            for branch in branches:
                yield self.root, event, branch, self.root
        for machine in region.machines:
            for event, key, branches in machine.cells():
                for branch in branches:
                    yield machine.state_id(key), event, branch, machine.state_id(branch['to'])

    def effect_names(self):
        names = []
        for _state, _event, branch, _to in self.rows():
            if branch.get('effect') and branch['effect'] not in names:
                names.append(branch['effect'])
        # A region whose tables name no effect (table T-293) has none to name.
        if not names:
            return ['export type %sEffectName = never' % self.stem, '']
        lines = ['export type %sEffectName =' % self.stem]
        lines += ['  | %s' % quoted(n) for n in names]
        return lines + ['']

    def transition_type(self):
        return [
            'export interface %sTransition {' % self.stem,
            '  readonly state: %sKey' % self.stem,
            "  readonly event: %sEvent['type']" % self.stem,
            '  readonly guard: string | null',
            '  readonly to: string',
            '  readonly effect: %sEffectName | null' % self.stem,
            '  readonly effectArgument: string | null',
            '}',
            '',
        ]

    def transitions(self, mode):
        keyword = 'export const' if mode == 'export' else 'const'
        lines = ['%s %s_TRANSITIONS: readonly %sTransition[] = ['
                 % (keyword, self.upper, self.stem)]
        for state, event, branch, target in self.rows():
            guard = manuscript.guard_words(branch.get('guard'))
            effect = branch.get('effect')
            argument = branch.get('effectArgument')
            lines += [
                '  {',
                '    state: %s,' % quoted(state),
                '    event: %s,' % quoted(event),
                '    guard: %s,' % (quoted(guard) if guard else 'null'),
                '    to: %s,' % quoted(target),
                '    effect: %s,' % (quoted(effect) if effect else 'null'),
                '    effectArgument: %s,' % (quoted(argument) if argument else 'null'),
                '  },',
            ]
        return lines + [']']

    def keys(self):
        lines = ['export type %sKey =' % self.stem, '  | %s' % quoted(self.root)]
        lines += ['  | %s' % quoted(m.state_id(s['key']))
                  for m in self.region.machines for s in m.states]
        return lines + ['']

    def block(self):
        lines = [OPEN,
                 '// From docs/spec/_source/state-machines.json, region %s (table %s).'
                 % (self.region.name, self.region.raw['table']['id']),
                 '// Rebuild: npm run gen (tools/generate_state_machine_types.py).',
                 '']
        lines += self.keys()
        # WHY: SD-5 -- a documentData region's state type is an erd.json
        # column, and it has no unsaved root to hold or initialise.
        saved = self.region.holds_document_data
        if not saved:
            lines += self.unions()
            lines += self.root_type()
        lines += self.events()
        lines += self.effect_names()
        # JDG-139: the table and its row type only where something reads it.
        mode = TRANSITIONS_READ.get(self.region.raw['unit'])
        if mode:
            lines += self.transition_type()
        if not saved:
            lines += self.initial_children()
            lines += self.initial_axes()
        if mode:
            lines += self.transitions(mode)
        while lines[-1] == '':
            lines.pop()
        lines.append(CLOSE)
        return '\n'.join(lines)


def rewritten(path, block):
    """The unit's text with its region replaced, or None when it has none."""
    body = io.open(path, encoding='utf-8', newline='').read()
    ending = '\r\n' if body.count('\r\n') * 2 > body.count('\n') else '\n'
    text = body.replace('\r\n', '\n')
    if len(REGION.findall(text)) != 1:
        return body, None
    text = REGION.sub(lambda _m: block, text)
    return body, text.replace('\n', ending)


def main(argv):
    check = '--check' in argv
    regions, found = manuscript.load()
    if found:
        for one in found:
            say('PROBLEM  %s' % one.encode('ascii', 'backslashreplace').decode('ascii'))
        say('FAIL     state-machines.json: %d problem(s); nothing written' % len(found))
        return 1
    refuse_unknown_transition_units(regions)
    failed = 0
    for region in regions:
        rel = region.raw['unit']
        path = os.path.join(ROOT, *rel.split('/'))
        if not os.path.exists(path):
            say('FAIL     %s does not exist -- write its hand-written half first' % rel)
            failed += 1
            continue
        current, wanted = rewritten(path, Printer(region).block())
        if wanted is None:
            say('FAIL     %s holds no single generated region (%s ... %s)'
                % (rel, OPEN, CLOSE))
            failed += 1
            continue
        if current == wanted:
            say('OK       %s matches state-machines.json' % rel)
            continue
        if check:
            say('FAIL     %s differs from state-machines.json -- run npm run gen' % rel)
            failed += 1
            continue
        io.open(path, 'w', encoding='utf-8', newline='').write(wanted)
        say('wrote    %s' % rel)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
