# -*- coding: utf-8 -*-
"""Check 59 -- every cross-component edge in src/ is declared in components.json.

⛔ WHY THIS EXISTS. The rule is already written, in `EG-5` of 表 T-247 of
docs/spec/05-07-design.md, verbatim:

    | EG-5 | 本表で数えた辺はすべて、`_source/components.json` の `edges` に、
    同じ `source` と `target` の組として在ること（MUST）。<br>`edges` に無い辺
    をコードに作ってはならない（MUST NOT） |

Nothing read that clause. 表 T-247 counts the edges (`EG-1` 〜 `EG-4`), 表 T-248
says where a `.json` sits, check 19 holds src/ against 表 T-061 -- and the
figure the specification prints drifted 52 edges behind the code before anybody
measured it. A picture that is wrong in a way no gate can see is read as the
design.

⭐ NOTHING IN THIS FILE IS A LIST OF TODAY'S EDGES, and there is no baseline
file. Both sides are read on every run:

  * the CODE side comes from tools/check_layer_rules.py -- its `read_imports`
    and `unit_key`, the same reader check 19 is held to, so the two gates can
    never disagree about what an import is. `EG-2` counts an edge once per
    (A, B) pair however many import sites make it, `EG-3` counts a type-only
    import, and `EG-4` drops the imports inside one component and the bare
    specifiers;
  * the FIGURE side is the `edges` of docs/spec/_source/components.json, the
    single source of truth every component figure is generated from.

⛔ THE GATE IS ONE-DIRECTIONAL, exactly as `EG-5` is: an edge in the code must
be in the figure. An edge in the figure that no import makes is NOT a fault --
`CR-378` 決定 7 rules that 「図 ⊆ コード」 is not a rule, because `JDG-47`
judged only the one direction. Those are counted and printed, never gated.

⛔ Green on arrival, with no baseline: MEASURED 2026-09-21 on a1eca14f plus the
52 edges this change added -- 302 of 302 import specifiers read, 127 distinct
cross-component edges over 193 import sites, 0 of them undeclared, and 11
declared edges no import makes (printed, not gated).
⭐ MEASURED by breaking it: one added import of another component's public
entry that components.json does not declare reports exactly 1.

⚠️ WHAT IT DOES NOT SEE. Runtime wiring: `EG-7` keeps a call-back that no
import carries out of the count, so an implementation handed to the side that
declared it (表 T-065) is not an edge here. Nor does it read tests/ -- 表 T-247
counts the edges of `src/`.

Usage:
    python check-component-edges.py [repo-root]
"""
import io
import json
import os
import sys

SOURCE = os.path.join('docs', 'spec', '05-07-design.md')
MODEL = os.path.join('docs', 'spec', '_source', 'components.json')

# ⛔ The only constant that is not read from the tree: the words that identify
# the clause. A guard that cannot find its own rule must go red rather than
# pass over an empty rule.
ANCHOR = u'`edges` に無い辺をコードに作ってはならない（MUST NOT）'


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def read_text(path):
    """Normalise on read -- this tree mixes CRLF and LF."""
    return io.open(path, 'rb').read().decode('utf-8').replace('\r\n', '\n')


def clause_line(path):
    """The line number of `EG-5`, or None when the clause is gone."""
    for number, line in enumerate(read_text(path).split('\n'), 1):
        if ANCHOR in line:
            return number
    return None


def pascal(folder):
    """`EG-1`: the component name is the folder name with 表 T-006a's W-11
    turned around, kebab-case to PascalCase."""
    return ''.join(part[:1].upper() + part[1:] for part in folder.split('-'))


def code_edges(rules):
    """{(A, B): [(file, specifier)]} for every edge 表 T-247 counts, and faults.

    `EG-2` makes one edge of a pair however many import sites it has, so the
    sites are kept only to name one when the pair is undeclared.
    """
    edges, (files_read, read, present, short) = rules.read_imports()
    faults = ['%s: read %d of its %d import specifier(s)' % s for s in short]
    pairs = {}
    sites = 0
    for path, spec in edges:
        if not spec.startswith('.'):
            continue                      # `EG-4`: a package is not a unit
        here = os.path.relpath(path, rules.ROOT).replace('\\', '/')
        from_layer, from_component, _stem = rules.unit_key(path)
        target = os.path.normpath(os.path.join(os.path.dirname(path), spec))
        if not spec.endswith('.json') and not target.endswith('.ts'):
            target += '.ts'
        to_layer, to_component, _to_stem = rules.unit_key(target)
        if from_component is None or to_component is None:
            # Check 19 reports the same file under `EG-1`; without a component
            # this check has no pair to look up, so it says so and moves on.
            faults.append('%s: imports %r, and one end sits in no component '
                          'folder (EG-1)' % (here, spec))
            continue
        if (from_layer, from_component) == (to_layer, to_component):
            continue                      # `EG-4`: inside one component
        sites += 1
        pairs.setdefault((pascal(from_component), pascal(to_component)),
                         []).append((here, spec))
    return pairs, sites, (files_read, read, present), faults


def main(argv):
    root = argv[1] if len(argv) > 1 else '.'
    for relative in (SOURCE, MODEL):
        if not os.path.exists(os.path.join(root, relative)):
            say(u'FAIL     %s is missing -- check 59 cannot read its rule.'
                % relative.replace(os.sep, '/'))
            return 1

    at = clause_line(os.path.join(root, SOURCE))
    if at is None:
        say(u'FAIL     the rule this check enforces is GONE from %s: no line '
            u'holds 「%s」. ⛔ Either restore `EG-5` in 表 T-247 or retire this '
            u'check in the same change.'
            % (SOURCE.replace(os.sep, '/'), ANCHOR))
        return 1

    sys.path.insert(0, os.path.abspath(os.path.join(root, 'tools')))
    try:
        import check_layer_rules as rules
    except ImportError:
        say(u'FAIL     tools/check_layer_rules.py cannot be imported -- '
            u'check 59 reads the edges with check 19\'s own reader.')
        return 1

    model = json.loads(read_text(os.path.join(root, MODEL)))
    nodes = set(node['name'] for node in model['nodes'])
    declared = set((edge['source'], edge['target']) for edge in model['edges'])

    pairs, sites, (files_read, read, present), faults = code_edges(rules)
    if read < present:
        faults.append('read %d of the %d import specifier(s) in src/ -- an '
                      'edge this reader cannot see is an edge this gate does '
                      'not hold' % (read, present))

    unknown = sorted(name for pair in pairs for name in pair
                     if name not in nodes)
    missing = sorted(pair for pair in pairs if pair not in declared)
    unused = sorted(declared - set(pairs))

    if faults or unknown or missing:
        if faults:
            say(u'FAIL     %d fault(s) in what this check could read:'
                % len(faults))
            for fault in faults:
                say(u'         %s' % fault)
        if unknown:
            say(u'FAIL     %d component folder(s) of src/ that %s does not '
                u'name as a node (EG-1): %s'
                % (len(unknown), MODEL.replace(os.sep, '/'),
                   ' '.join(sorted(set(unknown)))))
        if missing:
            say(u'FAIL     %d cross-component edge(s) in src/ that %s does '
                u'not declare -- `EG-5` at %s:%d.'
                % (len(missing), MODEL.replace(os.sep, '/'),
                   SOURCE.replace(os.sep, '/'), at))
            for pair in missing:
                here, spec = pairs[pair][0]
                say(u'         %s -> %s (%d import site(s), e.g. %s imports '
                    u'%s)' % (pair[0], pair[1], len(pairs[pair]), here, spec))
            say(u'         ⭐ Declare each one in the `edges` of %s with its '
                u'own label and description, then rebuild the figures: '
                u'python docs/spec/_source/build.py'
                % MODEL.replace(os.sep, '/'))
        return 1

    say(u'OK       every cross-component edge of src/ is declared: %d edge(s) '
        u'over %d import site(s), read from %d of the %d import specifier(s) '
        u'in %d file(s), all of them in the `edges` of %s (`EG-5` at %s:%d).'
        % (len(pairs), sites, read, present, files_read,
           MODEL.replace(os.sep, '/'), SOURCE.replace(os.sep, '/'), at))
    say(u'         NOT GATED: %d declared edge(s) that no import of src/ '
        u'makes. `EG-5` holds one direction only, and `CR-378` 決定 7 keeps '
        u'「図 ⊆ コード」 out of it.' % len(unused))
    if unused:
        say(u'         %s' % ', '.join('%s -> %s' % pair for pair in unused))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
