# -*- coding: utf-8 -*-
"""Check src/ against table T-061, the dependency rules of Chapter 5.1.

Chapter 5.1 says of table T-061 that the direction of dependency "is not a
property you confirm by running something, it is one you confirm by looking at
the structure", which is why the table sits in the chapter instead of behind a
requirement with a test. Nothing said who runs that look. This does.

  LR-1  a dependency that crosses a layer points inward only
  LR-2  a call into another component goes through its public entry
  LR-3  calls inside a layer stay acyclic
  LR-4  layoutEngine may read documentModel, never the other way round
  LR-5  an outer layer reaches an inner one through the interface the inner
        one declares -- checked here as: the import lands on the declaring
        component's own folder

  LR-6  is NOT checked here. It is enforced by the compiler instead:
        tsconfig.entity.json compiles src/entity and src/use-case without the
        DOM library, so touching a browser type is a type error rather than a
        name this script could only guess at.

  python tools/check_layer_rules.py            report violations, non-zero if any
  python tools/check_layer_rules.py --report   print the component graph it read

Run with PYTHONIOENCODING=utf-8.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'src')

# Inward is towards a smaller rank. Chapter 5.1 splits Entity into two
# sub-layers and LR-4 orders them, so they take two ranks rather than one.
LAYER_RANK = {
    'entity/document-model': 0,
    'entity/layout-engine': 1,
    'use-case': 2,
    'adapter': 3,
    'framework': 4,
}

IMPORT = re.compile(
    r'''(?:^|\n)\s*(?:import|export)\b[^;\n]*?from\s*['"]([^'"]+)['"]'''
    r'''|(?:^|\n)\s*import\s*['"]([^'"]+)['"]''')

say = lambda m: sys.stdout.write(m + '\n')


def unit_key(path):
    """(layer, component, file stem) of a file under src/."""
    rel = os.path.relpath(path, SRC).replace('\\', '/')
    parts = rel.split('/')
    for layer in LAYER_RANK:
        depth = layer.count('/') + 1
        if '/'.join(parts[:depth]) == layer:
            return layer, parts[depth], parts[-1][:-3]
    return None, None, None


def read_imports():
    """Every import edge in src/, as (from unit, to path)."""
    edges = []
    for base, _dirs, files in os.walk(SRC):
        for name in sorted(files):
            if not name.endswith('.ts'):
                continue
            path = os.path.join(base, name)
            text = io.open(path, encoding='utf-8').read()
            # A specifier inside a line comment is not an import.
            text = re.sub(r'(?m)^\s*//.*$', '', text)
            for hit in IMPORT.finditer(text):
                edges.append((path, hit.group(1) or hit.group(2)))
    return edges


def main():
    if not os.path.isdir(SRC):
        say('PROBLEM  src/ does not exist -- run tools/generate_unit_tree.py')
        return 2

    violations = []
    graph = {}                       # (layer, component) -> set of the same

    for path, spec in read_imports():
        from_layer, from_component, _stem = unit_key(path)
        here = os.path.relpath(path, ROOT).replace('\\', '/')
        if from_layer is None:
            violations.append('%s: sits outside the five layer folders' % here)
            continue

        if not spec.startswith('.'):
            # A bare specifier is a package, not a unit of this tree. Chapter
            # 5.3 does not govern those; LR-6 and review do.
            continue

        target = os.path.normpath(os.path.join(os.path.dirname(path), spec))
        if spec.endswith('.json'):
            # Data, not a unit. Table T-075 counts units and check 18 counts
            # `.ts`, so a bundled document (FR-027's template) is neither a
            # component nor a reach into one. ⛔ Still has to exist: a missing
            # one would be a build error nobody saw here.
            if not os.path.exists(target):
                violations.append('%s: imports %r, which is not a file'
                                  % (here, spec))
            continue
        if not target.endswith('.ts'):
            target += '.ts'
        if not os.path.exists(target):
            violations.append('%s: imports %r, which is not a file' % (here, spec))
            continue

        to_layer, to_component, to_stem = unit_key(target)
        if to_layer is None:
            violations.append('%s: imports %r, which is outside the layer folders'
                              % (here, spec))
            continue

        # LR-1 / LR-4: crossing a layer boundary is allowed inward only.
        if LAYER_RANK[to_layer] > LAYER_RANK[from_layer]:
            rule = 'LR-4' if {from_layer, to_layer} == {
                'entity/document-model', 'entity/layout-engine'} else 'LR-1'
            violations.append('%s: %s -- %s reaches outward to %s'
                              % (here, rule, from_layer, to_layer))
            continue

        if (from_layer, from_component) == (to_layer, to_component):
            continue                 # inside one component: Chapter 5.3 allows it

        # LR-2 / LR-5: another component is reached through its public entry,
        # the one file whose stem is the component name.
        if to_stem != to_component:
            violations.append(
                '%s: LR-2 -- reaches %s/%s/%s.ts instead of the public entry %s.ts'
                % (here, to_layer, to_component, to_stem, to_component))
            continue

        if LAYER_RANK[to_layer] == LAYER_RANK[from_layer]:
            graph.setdefault((from_layer, from_component), set()).add(
                (to_layer, to_component))

    # LR-3: the same-layer graph carries no cycle.
    cycles = []
    colour = {}

    def walk(node, trail):
        colour[node] = 'open'
        for nxt in sorted(graph.get(node, ())):
            if colour.get(nxt) == 'open':
                cycles.append(trail[trail.index(nxt):] + [nxt]
                              if nxt in trail else trail + [nxt])
            elif colour.get(nxt) is None:
                walk(nxt, trail + [nxt])
        colour[node] = 'done'

    for node in sorted(graph):
        if colour.get(node) is None:
            walk(node, [node])
    for cycle in cycles:
        violations.append('LR-3 -- a cycle inside a layer: %s'
                          % ' -> '.join('%s/%s' % c for c in cycle))

    if '--report' in sys.argv:
        say('same-layer component edges: %d'
            % sum(len(v) for v in graph.values()))
        for node in sorted(graph):
            for nxt in sorted(graph[node]):
                say('   %s/%s -> %s/%s' % (node + nxt))
        say('violations: %d' % len(violations))

    for line in violations:
        say('VIOLATION  %s' % line)
    if violations:
        return 1
    say('OK       src/ obeys table T-061 (LR-1 / LR-2 / LR-3 / LR-4 / LR-5)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
