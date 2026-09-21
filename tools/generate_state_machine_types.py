# -*- coding: utf-8 -*-
"""Write the generated region of each state-machine region unit.

READS   docs/spec/_source/state-machines.json (through the one reader,
        docs/spec/_source/state_machines_json_to_md.py `load()`)
WRITES  the region between `// <generated -- do not edit by hand>` and
        `// </generated>` of the unit each region names (`unit`), e.g.
        src/use-case/advance-screen-session/screen-values.ts

What it prints per region, with <Stem> the region's `typeStem`:
  <Stem>Key                 every state key, as a string-literal union
  <Stem><Axis>              one discriminated union per axis (`kind` = the
                            last key segment); a state with orthogonal
                            children holds one field per axis, a state with a
                            single union of children holds it as `child`;
                            a carried value is a field typed through the
                            hand-written <Stem>StateCarried
  <Stem>                    the root: its carried values and its axes
  <Stem>Event               one member per event (`type` = the event key),
                            carried values typed through <Stem>EventCarried
  <Stem>EffectName          every effect name the transitions use
  <Stem>Transition          the row shape of the table below
  <STEM>_INITIAL_CHILDREN   the kind entered below a composite state
  <STEM>_INITIAL_AXES       the initial value of every axis
  <STEM>_TRANSITIONS        the transition table (table T-282 for `screen`)

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
        self.root = region.root['key']

    # --- names ---------------------------------------------------------------

    def union_name(self, parent, axis):
        """The type of one union: an axis below `parent`, or its own kinds."""
        path = parent[len(self.root):].split('.')[1:]
        if axis is not None:
            path.append(axis)
        return self.stem + ''.join(pascal(p) for p in path)

    def state_carried(self, name):
        return "%sStateCarried['%s']" % (self.stem, name)

    def event_carried(self, name):
        return "%sEventCarried['%s']" % (self.stem, name)

    # --- the state types -----------------------------------------------------

    def child_fields(self, key):
        """The fields a state holds for the states below it."""
        region = self.region
        if key in region.axes:
            return ['readonly %s: %s' % (axis, self.union_name(key, axis))
                    for axis in region.axes[key]]
        if key in region.kinds:
            return ['readonly child: %s' % self.union_name(key, None)]
        return []

    def member(self, state):
        fields = ["readonly kind: '%s'" % self.region.remainder(state)[-1]]
        fields += ['readonly %s: %s' % (c['name'], self.state_carried(c['name']))
                   for c in state['carries']]
        fields += self.child_fields(state['key'])
        return '{ %s }' % '; '.join(fields)

    def union(self, name, members):
        lines = ['export type %s =' % name]
        lines += ['  | %s' % self.member(s) for s in members]
        return lines + ['']

    def unions(self):
        """Innermost first, so a type is printed before the one that holds it."""
        region = self.region
        out = []
        parents = list(region.axes.keys()) + list(region.kinds.keys())
        for parent in sorted(parents, key=lambda k: -k.count('.')):
            if parent in region.axes:
                for axis, members in region.axes[parent].items():
                    out += self.union(self.union_name(parent, axis), members)
            else:
                out += self.union(self.union_name(parent, None), region.kinds[parent])
        return out

    def root_type(self):
        root = self.region.root
        carried = [c['name'] for c in root['carries']]
        lines = ['export interface %s {' % self.stem]
        lines += ['  readonly %s: %s' % (n, self.state_carried(n)) for n in carried]
        lines += ['  %s' % f for f in self.child_fields(root['key'])]
        lines += ['}', '']
        omitted = ' | '.join(quoted(n) for n in carried) or 'never'
        lines += ['export type %sAxes = Omit<%s, %s>' % (self.stem, self.stem, omitted), '']
        return lines

    # --- the initial values --------------------------------------------------

    def initial_of(self, members):
        """The object literal of a union's initial member."""
        state = [s for s in members if s['initial']][0]
        if state['carries']:
            raise ValueError('%s is an initial state and carries %s, which the '
                             'manuscript gives no initial value'
                             % (state['id'], ', '.join(c['name'] for c in state['carries'])))
        fields = ["kind: '%s'" % self.region.remainder(state)[-1]]
        fields += ['%s: %s' % (name, value)
                   for name, value in self.children_initial(state['key'])]
        return '{ %s }' % ', '.join(fields)

    def children_initial(self, key):
        region = self.region
        if key in region.axes:
            return [(axis, self.initial_of(members))
                    for axis, members in region.axes[key].items()]
        if key in region.kinds:
            return [('child', '%s_INITIAL_CHILDREN[%s]' % (self.upper, quoted(key)))]
        return []

    def initial_children(self):
        region = self.region
        name = '%s_INITIAL_CHILDREN' % self.upper
        lines = ['const %s: {' % name]
        lines += ['  readonly %s: %s' % (quoted(k), self.union_name(k, None))
                  for k in region.kinds]
        lines += ['} = {']
        lines += ['  %s: %s,' % (quoted(k), self.initial_of(region.kinds[k]))
                  for k in region.kinds]
        return lines + ['}', '']

    def initial_axes(self):
        lines = ['const %s_INITIAL_AXES: %sAxes = {' % (self.upper, self.stem)]
        lines += ['  %s: %s,' % (name, value)
                  for name, value in self.children_initial(self.root)]
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

    def effect_names(self):
        names = []
        for row in self.region.transitions:
            if row['effect'] and row['effect']['name'] not in names:
                names.append(row['effect']['name'])
        lines = ['export type %sEffectName =' % self.stem]
        lines += ['  | %s' % quoted(n) for n in names]
        return lines + ['']

    def transition_type(self):
        return [
            'export interface %sTransition {' % self.stem,
            '  readonly id: string',
            '  readonly from: readonly (readonly %sKey[])[]' % self.stem,
            "  readonly event: %sEvent['type']" % self.stem,
            '  readonly guard: string | null',
            "  readonly to: readonly string[] | 'self'",
            '  readonly effect: %sEffectName | null' % self.stem,
            '  readonly effectArgument: string | null',
            '}',
            '',
        ]

    def guard_text(self, guard):
        if not guard:
            return 'null'
        return quoted(' & '.join(('not ' if t.get('not') else '') + t['name']
                                 for t in guard))

    def transitions(self):
        lines = ['export const %s_TRANSITIONS: readonly %sTransition[] = ['
                 % (self.upper, self.stem)]
        for row in self.region.transitions:
            source = '[%s]' % ', '.join(
                '[%s]' % ', '.join(quoted(k) for k in alt) for alt in row['from'])
            target = quoted('self') if row['to'] == 'self' else \
                '[%s]' % ', '.join(quoted(k) for k in row['to'])
            effect = row['effect']
            lines += [
                '  {',
                '    id: %s,' % quoted(row['id']),
                '    from: %s,' % source,
                '    event: %s,' % quoted(row['event']),
                '    guard: %s,' % self.guard_text(row['guard']),
                '    to: %s,' % target,
                '    effect: %s,' % (quoted(effect['name']) if effect else 'null'),
                '    effectArgument: %s,' % (quoted(effect['row'])
                                             if effect and effect.get('row') else 'null'),
                '  },',
            ]
        return lines + [']']

    def keys(self):
        lines = ['export type %sKey =' % self.stem]
        lines += ['  | %s' % quoted(s['key']) for s in self.region.states]
        return lines + ['']

    def block(self):
        tables = self.region.raw['tables']
        lines = [OPEN,
                 '// From docs/spec/_source/state-machines.json, region %s (tables %s to %s).'
                 % (self.region.name, tables['states']['id'], tables['transitions']['id']),
                 '// Rebuild: npm run gen (tools/generate_state_machine_types.py).',
                 '']
        lines += self.keys()
        lines += self.unions()
        lines += self.root_type()
        lines += self.events()
        lines += self.effect_names()
        lines += self.transition_type()
        lines += self.initial_children()
        lines += self.initial_axes()
        lines += self.transitions()
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
