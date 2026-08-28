# -*- coding: utf-8 -*-
"""Write the empty unit tree of src/ from the specification tables.

  table T-062  component -> layer          (docs/spec/05-07-design.md)
  table T-075  unit      -> component, file name, purity
  table T-064  component -> the names its public entry publishes
  table T-065  the nine interfaces that cross a layer boundary

Chapter 5.3 fixes the path of every unit, so no path is written by hand here:

    src/<layer folder>/<kebab(component)>/<file name of table T-075>

  python tools/generate_unit_tree.py            create the files that are missing
  python tools/generate_unit_tree.py --check    fail if the tree and the tables disagree
  python tools/generate_unit_tree.py --report   print the tree it derives

A file that already exists is never rewritten: once an implementer has filled
one in, this script must not be able to undo that. --check therefore compares
the SET of paths, not their contents.
Run with PYTHONIOENCODING=utf-8.
"""
import io
import os
import re
import sys

import spec_tables

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DESIGN = os.path.join(ROOT, 'docs', 'spec', '05-07-design.md')
SRC = os.path.join(ROOT, 'src')

# Chapter 5.3 draws the tree with five layer folders; table T-062 names the
# layer of every component in the same words.
LAYER_FOLDER = {
    'documentModel': os.path.join('entity', 'document-model'),
    'layoutEngine': os.path.join('entity', 'layout-engine'),
    'UseCase': 'use-case',
    'Adapter': 'adapter',
    'Framework': 'framework',
}

say = lambda m: sys.stdout.write(m + '\n')


def bare(cell):
    """The name inside a `code span`, with any decoration dropped."""
    found = re.findall(r'`([^`]+)`', cell)
    return found[0] if found else cell.strip('* ')


def kebab(name):
    """Component name to folder name: ScheduleLayout -> schedule-layout."""
    return re.sub(r'(?<!^)(?=[A-Z])', '-', name).lower()


# Which table of Chapter 5 holds each kind of row this script walks.
# ⭐ NAMED RATHER THAN MATCHED BY ROW SHAPE, which is what the shared
# reader makes possible: the old walk took every CP / UF / PI / IF row in
# the whole file, so a row of that shape appearing in some other table
# would have joined the roster silently.
ROW_TABLE = {'CP': 'T-062', 'UF': 'T-075', 'PI': 'T-064', 'IF': 'T-065'}

REL_DESIGN = 'docs/spec/05-07-design.md'


def read_tables():
    rows = {}
    for kind, table_id in ROW_TABLE.items():
        rows[kind] = [row.cells
                      for row in spec_tables.read(REL_DESIGN, table_id)]
    return rows


def build():
    rows = read_tables()
    problems = []

    layer_of = {}
    for row in rows['CP']:
        layer_of[bare(row[2])] = bare(row[1])

    publishes = {}
    for row in rows['PI']:
        publishes[bare(row[2])] = row[0]

    declares = {}                      # component -> [interface name, ...]
    for row in rows['IF']:
        declares.setdefault(bare(row[2]), []).append((row[0], bare(row[1])))

    units = []
    for row in rows['UF']:
        uid, component, file_name, purity = row[0], bare(row[1]), bare(row[2]), bare(row[3])
        layer = layer_of.get(component)
        if layer is None:
            problems.append('%s names component %r, which table T-062 does not have'
                            % (uid, component))
            continue
        folder = LAYER_FOLDER.get(layer)
        if folder is None:
            problems.append('%s sits in layer %r, which Chapter 5.3 does not draw'
                            % (uid, layer))
            continue
        units.append({
            'uid': uid,
            'component': component,
            'layer': layer,
            # Table T-075 writes an em dash for a unit that only declares an
            # interface. The tree keeps to ASCII, so it says so in words.
            'purity': 'n/a' if purity in ('—', '-') else purity,
            'path': os.path.join('src', folder, kebab(component), file_name),
        })

    # Chapter 5.3 (MUST): exactly one file per folder is the public entry, and
    # its stem is the component name. Every component has one.
    entries = {}
    for unit in units:
        stem = os.path.basename(unit['path'])[:-3]
        unit['entry'] = (stem == kebab(unit['component']))
        if unit['entry']:
            if unit['component'] in entries:
                problems.append('component %s has two public entries' % unit['component'])
            entries[unit['component']] = unit
    for component in sorted(set(u['component'] for u in units)):
        if component not in entries:
            problems.append('component %s has no file named after it' % component)

    # The nine interfaces that cross a layer boundary sit in the folder of the
    # component that declares them, under their own stem (Chapter 5.3, MUST).
    for component, declared in declares.items():
        for row_id, interface in declared:
            want = kebab(interface) + '.ts'
            match = [u for u in units
                     if u['component'] == component
                     and os.path.basename(u['path']) == want]
            if not match:
                problems.append('%s declares %s, but table T-075 has no %s under %s'
                                % (row_id, interface, want, component))
                continue
            match[0]['interface'] = interface
            match[0]['interface_row'] = row_id

    return units, entries, declares, publishes, problems


HEADER = """\
// %(component)s -- %(role)s
//
// @unit      %(uid)s   (docs/spec/05-07-design.md, table T-075)
// @component %(component)s, layer %(layer)s (table T-062)
// @purity    %(purity)s
%(extra)s//
// Generated as an empty unit by tools/generate_unit_tree.py. Fill it in; the
// generator never rewrites a file that exists.
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
"""


def body(unit, publishes, entries):
    if unit.get('interface'):
        role = 'declares the interface %s (table T-065 %s).' % (
            unit['interface'], unit['interface_row'])
        extra = ('// @seam      %s, implemented in another layer (LR-5)\n'
                 % unit['interface'])
        text = HEADER % dict(unit, role=role, extra=extra)
        return text + (
            '\n'
            '// The members are not in the specification: table T-065 names the\n'
            '// interface and what it supplies, nothing more. They are decided here,\n'
            '// by the component that declares the seam.\n'
            'export interface %s {\n'
            '  // TODO: declare the members this seam supplies.\n'
            '}\n' % unit['interface'])

    if unit['entry']:
        role = 'public entry of this folder.'
        extra = '// @publishes table T-064 row %s\n' % publishes.get(
            unit['component'], '(none)')
        text = HEADER % dict(unit, role=role, extra=extra)
        note = (
            '\n'
            '// Nothing outside this folder may import any other file in it\n'
            '// (Chapter 5.3, MUST NOT), so every name the component publishes\n'
            '// leaves through here.\n')
        seams = unit.get('reexports') or []
        if seams:
            note += ('//\n'
                     '// The seam declared in this folder is re-exported here because\n'
                     '// the layer that implements it may not reach past this file\n'
                     '// (Chapter 5.3, MUST).\n')
            lines = ''.join(
                "export type { %s } from './%s'\n" % (name, kebab(name))
                for name in seams)
            return text + note + '\n' + lines
        return text + note + '\nexport {}\n'

    role = 'internal unit of the component.'
    text = HEADER % dict(unit, role=role, extra='')
    return text + '\nexport {}\n'


def main():
    units, entries, declares, publishes, problems = build()

    for component, declared in declares.items():
        entry = entries.get(component)
        if entry is not None:
            entry['reexports'] = [name for _row, name in declared]

    if problems:
        for problem in problems:
            say('PROBLEM  %s' % problem)
        return 2

    wanted = sorted(u['path'].replace('\\', '/') for u in units)

    if '--report' in sys.argv:
        for unit in units:
            say('%-6s %-28s %-10s %s' % (unit['uid'], unit['component'],
                                         unit['purity'], unit['path']))
        say('units %d  components %d  seams %d'
            % (len(units), len(entries), sum(len(v) for v in declares.values())))
        return 0

    if '--check' in sys.argv:
        found = []
        for base, _dirs, files in os.walk(SRC):
            for name in files:
                if name.endswith('.ts'):
                    found.append(os.path.relpath(os.path.join(base, name), ROOT)
                                 .replace('\\', '/'))
        found.sort()
        missing = [p for p in wanted if p not in found]
        extra = [p for p in found if p not in wanted]
        for path in missing:
            say('MISSING  %s -- table T-075 has it, src/ does not' % path)
        for path in extra:
            say('EXTRA    %s -- src/ has it, table T-075 does not' % path)
        if missing or extra:
            return 1
        say('OK       src/ holds exactly the %d units of table T-075' % len(wanted))
        return 0

    made = 0
    for unit in units:
        target = os.path.join(ROOT, unit['path'])
        if os.path.exists(target):
            continue
        folder = os.path.dirname(target)
        if not os.path.isdir(folder):
            os.makedirs(folder)
        with io.open(target, 'w', encoding='utf-8', newline='\n') as out:
            out.write(body(unit, publishes, entries))
        made += 1
    say('created %d file(s); table T-075 holds %d units in %d components'
        % (made, len(units), len(entries)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
