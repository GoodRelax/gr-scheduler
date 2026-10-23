# -*- coding: utf-8 -*-
"""Compile a region's guard conditions into the judgments of its unit (CR-767 wave 3).

READS   the condition trees of docs/spec/_source/state_machines_json_to_md.py
        (`Condition`), one region at a time
PRINTS  `const <STEM>_GUARDS = { <guard>: (<params>): boolean => ..., ... }`,
        lines for the generated region tools/generate_state_machine_types.py
        writes (table T-250 SD-3: the code's judgment is generated from the
        condition, so the two cannot drift apart)

A judgment takes only what its condition reads, in this order:
  values  the region's values (<Stem>)        -- root.<carry>, <machine>.<carry>, in()
  event   the event, narrowed to the events of the cells that name the guard
                                               -- event.<carry>
  after   the region's values once the same event's step is over
                                               -- after(), inAfter()

How each form of `guardLanguage` is printed:
  <machine>.<carry>   a local const read before the expression: the value of
                      the state that carries it, else null (one const per
                      value, so TypeScript narrows it across the expression)
  in(<state id>)      the `kind` of each level down to the state
  .<field>            `?.` -- the field of null is null
  ==, !=              ===, !== ; against the literal null, == / != (a field of
                      null reads undefined)
  <, <=, >, >=        a side that is not a literal is read `?? NaN`, so a null
                      side makes the comparison false
  x in y              (y as readonly unknown[]).includes(x)
  <function>(...)     a call of the hand-written function of that name in the
                      unit (the type check stops a unit that lacks it)

A documentData region (SD-5, the task group tree) is not compiled here: its
judgments read one task group at a time (`taskGroup.<column>`).
"""


def pascal(word):
    return word[:1].upper() + word[1:]


RELATIONAL = ('<', '<=', '>', '>=')
# Above this width a top-level chain of || or && is broken, one term a line.
WIDTH = 110


class Judgment(object):
    """One guard's judgment: its parameters, its hoisted reads and its expression."""

    def __init__(self, printer, name, tree, uses):
        self.printer = printer
        self.region = printer.region
        self.name = name
        self.uses = uses
        self.reads = []          # [(const name, expression)], in first-read order
        self.reads_values = False
        self.reads_event = False
        self.reads_after = False
        self.expression = self.top(tree)

    # --- the parameters ------------------------------------------------------

    def event_type(self):
        keys = []
        for _cell, event in self.uses:
            if event not in keys:
                keys.append(event)
        union = ' | '.join("'%s'" % k for k in keys)
        return 'Extract<%sEvent, { readonly type: %s }>' % (self.printer.stem, union)

    def parameters(self):
        out = []
        if self.reads_values:
            out.append('values: %s' % self.printer.stem)
        if self.reads_event:
            out.append('event: %s' % self.event_type())
        if self.reads_after:
            out.append('after: %s' % self.printer.stem)
        return ', '.join(out)

    # --- the states ----------------------------------------------------------

    def levels(self, machine, key):
        """[(access, kind)] from the machine's field down to the state `key`."""
        holder = machine.holder()
        out = []
        path = machine.ancestors(key) + [key]
        for depth, one in enumerate(path):
            access = holder + '.child' * depth
            out.append((access, machine.word(machine.by_key[one])))
        return out

    def state_test(self, var, state_id):
        machine, key = self.region.state_of(state_id)
        return ' && '.join("%s.%s.kind === '%s'" % (var, access, kind)
                           for access, kind in self.levels(machine, key))

    def carried(self, var, machine_name, carry):
        """The const that holds a machine's carried value read off `var`."""
        machine = self.region.machine_by_name[machine_name]
        noun = machine.holder()[:-len('State')]
        const = ('after' + pascal(noun) if var == 'after' else noun) + pascal(carry)
        if const not in [c for c, _e in self.reads]:
            branches = []
            for state in machine.states:
                if carry not in [c['name'] for c in state['carries']]:
                    continue
                levels = self.levels(machine, state['key'])
                test = ' && '.join("%s.%s.kind === '%s'" % (var, a, k) for a, k in levels)
                branches.append('%s ? %s.%s.%s' % (test, var, levels[-1][0], carry))
            self.reads.append((const, branches + ['null']))
        return const

    # --- the expression ------------------------------------------------------

    def top(self, tree):
        text = self.emit(tree)
        return text[1:-1] if text.startswith('(') and self.closes_at_end(text) else text

    @staticmethod
    def closes_at_end(text):
        depth = 0
        for at, char in enumerate(text):
            depth += {'(': 1, ')': -1}.get(char, 0)
            if depth == 0 and at < len(text) - 1:
                return False
        return True

    def literal(self, value):
        if value is None:
            return 'null'
        if value is True or value is False:
            return 'true' if value else 'false'
        if isinstance(value, int):
            return str(value)
        return "'%s'" % value.replace('\\', '\\\\').replace("'", "\\'")

    def path(self, words):
        head, rest = words[0], words[1:]
        if head == 'event':
            self.reads_event = True
            text = 'event.' + rest[0]
        elif head == 'root':
            self.reads_values = True
            text = 'values.' + rest[0]
        elif head in self.region.machine_by_name:
            self.reads_values = True
            text = self.carried('values', head, rest[0])
        else:
            raise ValueError('%s: %s.%s is not compiled (a documentData term?)'
                             % (self.name, head, rest[0]))
        return text + ''.join('?.' + w for w in rest[1:])

    def call(self, name, args):
        if name == 'after':
            words = args[0][1] if args and args[0][0] == 'path' else None
            if words is None or words[0] not in self.region.machine_by_name or len(words) != 2:
                raise ValueError('%s: after() takes <machine>.<carry>' % self.name)
            self.reads_after = True
            return self.carried('after', words[0], words[1])
        return '%s(%s)' % (name, ', '.join(self.top(a) for a in args))

    def compared(self, op, left, right):
        if op == 'in':
            return '(%s as readonly unknown[]).includes(%s)' % (self.top(right), self.top(left))
        if op in RELATIONAL:
            sides = [self.emit(s) if s[0] == 'lit' else '(%s ?? NaN)' % self.emit(s)
                     for s in (left, right)]
            return '(%s %s %s)' % (sides[0], op, sides[1])
        loose = left == ('lit', None) or right == ('lit', None)
        symbol = {'==': '==', '!=': '!='}[op] if loose else {'==': '===', '!=': '!=='}[op]
        return '(%s %s %s)' % (self.emit(left), symbol, self.emit(right))

    def emit(self, node):
        kind = node[0]
        if kind == 'lit':
            return self.literal(node[1])
        if kind == 'list':
            return '[%s]' % ', '.join(self.top(x) for x in node[1])
        if kind == 'path':
            return self.path(node[1])
        if kind == 'field':
            return '%s?.%s' % (self.emit(node[1]), node[2])
        if kind == 'call':
            return self.call(node[1], node[2])
        if kind == 'state':
            var = 'after' if node[1] == 'inAfter' else 'values'
            if var == 'after':
                self.reads_after = True
            else:
                self.reads_values = True
            return '(%s)' % self.state_test(var, node[2])
        if kind == 'not':
            return '!%s' % self.wrapped(self.emit(node[1]))
        if kind in ('&&', '||'):
            return '(%s %s %s)' % (self.emit(node[1]), kind, self.emit(node[2]))
        return self.compared(kind, node[1], node[2])

    @staticmethod
    def wrapped(text):
        if text.startswith('(') and Judgment.closes_at_end(text):
            return text
        if text.replace('.', '').replace('?', '').replace('_', '').isalnum():
            return text
        return '(%s)' % text

    # --- the printed lines ---------------------------------------------------

    def chain(self, tree):
        """The terms of a top-level chain of one operator, or None."""
        if tree[0] not in ('&&', '||'):
            return None
        op = tree[0]
        terms = []

        def walk(node):
            if node[0] == op:
                walk(node[1])
                walk(node[2])
            else:
                terms.append(node)
        walk(tree)
        return op, terms

    def body_lines(self, tree, indent):
        """The returned expression, broken one term a line when it is wide."""
        if len(indent) + len(self.expression) <= WIDTH or self.chain(tree) is None:
            return [indent + self.expression]
        op, terms = self.chain(tree)
        out = [indent + self.top(terms[0])]
        out += ['%s  %s %s' % (indent, op, self.wrapped_term(t, op)) for t in terms[1:]]
        return out

    def wrapped_term(self, term, op):
        text = self.top(term)
        # WHY: a || term inside an && chain must keep its parentheses.
        return '(%s)' % text if op == '&&' and term[0] == '||' else text

    @staticmethod
    def read_lines(const, branches):
        """One hoisted read; a long ternary takes a line per branch."""
        line = '    const %s = %s' % (const, ' : '.join(branches))
        if len(line) <= WIDTH:
            return [line]
        return ['    const %s =' % const, '      ' + branches[0]] + ['      : ' + b for b in branches[1:]]

    def lines(self, tree):
        head = '  %s: (%s): boolean =>' % (self.name, self.parameters())
        if not self.reads:
            body = self.body_lines(tree, '    ')
            if len(head) + 1 + len(body[0].strip()) <= WIDTH and len(body) == 1:
                return ['%s %s,' % (head, body[0].strip())]
            return [head] + body[:-1] + [body[-1] + ',']
        out = [head + ' {']
        for const, branches in self.reads:
            out += self.read_lines(const, branches)
        body = self.body_lines(tree, '    ')
        out += ['    return ' + body[0].strip()] + body[1:]
        return out + ['  },']


def judgment_lines(printer, condition_of):
    """The `<STEM>_GUARDS` table of one region, or [] when it has no guard.

    condition_of(text) -> the parsed tree (state_machines_json_to_md.Condition).
    """
    region = printer.region
    if not region.guards or region.holds_document_data:
        return []
    uses = region.guard_uses()
    lines = ['const %s_GUARDS = {' % printer.upper]
    for name, guard in region.guards.items():
        tree = condition_of(guard['condition'])
        lines += Judgment(printer, name, tree, uses[name]).lines(tree)
    return lines + ['}', '']
