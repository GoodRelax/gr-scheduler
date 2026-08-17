# -*- coding: utf-8 -*-
"""Cycles of the INDUCED subgraph on the objects one change is about to touch.

This is the tool for the rule SKILL.md states and nothing else implemented:

    "To find what must move together, take the induced subgraph on the
     objects you are about to touch and look for cycles there. The
     180-member whole-graph cycle is useless for this; the induced one is
     actionable."

impact.py answers "what does this object reach" (blast radius, two hops).
graph.py --cycles answers the whole graph, whose largest cycle holds ~180
objects and so tells an editor nothing. Neither answers "of the things I am
about to write, which ones must be written in ONE pass".

    usage: python .claude/skills/spec-graph-check/induced.py <object> [...]

Run it BEFORE editing, with every object the change request names -- both the
ones being rewritten and the ones they will point at. A cycle in the result
means those members cannot be edited in sequence: the later edit does not know
what the earlier one moved, restates it, and a fresh contradiction is born
(measured at 0.46 new defects per defect fixed, round 7 -> 8).

Most 2-cycles are the convention working as intended -- a value row points at
the requirement that owns its rule, and the requirement names the value. Those
must not be "fixed". What matters is that a cycle you are EDITING MEMBERS OF
gets one plan and one pass.

WHY THIS FILE EXISTS: the rule above was carried in prose across several
sessions and skipped in every one of them, because impact.py was runnable and
this was not. A rule whose tool has to be rebuilt by hand each time is a rule
that does not run.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import graph as G  # noqa: E402
import specindex  # noqa: E402


def sccs_of(sub):
    """Tarjan over an adjacency dict already restricted to the seed set."""
    index, low, on, stack, out, counter = {}, {}, {}, [], [], [0]

    for root in list(sub):
        if root in index:
            continue
        work = [(root, iter(sub.get(root, ())))]
        index[root] = low[root] = counter[0]
        counter[0] += 1
        stack.append(root)
        on[root] = True
        while work:
            node, it = work[-1]
            advanced = False
            for nxt in it:
                if nxt not in sub:
                    continue
                if nxt not in index:
                    index[nxt] = low[nxt] = counter[0]
                    counter[0] += 1
                    stack.append(nxt)
                    on[nxt] = True
                    work.append((nxt, iter(sub.get(nxt, ()))))
                    advanced = True
                    break
                if on.get(nxt):
                    low[node] = min(low[node], index[nxt])
            if advanced:
                continue
            work.pop()
            if work:
                low[work[-1][0]] = min(low[work[-1][0]], low[node])
            if low[node] == index[node]:
                group = []
                while True:
                    w = stack.pop()
                    on[w] = False
                    group.append(w)
                    if w == node:
                        break
                if len(group) > 1:
                    out.append(group)
    return out


def main():
    seeds = sys.argv[1:]
    if not seeds:
        print(__doc__)
        return 2

    idx = specindex.build(G.ROOT)

    # graph.py refuses to run without the StrictDoc export because the Parent
    # relations change the answer without saying so. The same holds here.
    if not os.path.exists(G.SD_JSON):
        print('ERROR: %s not found.' % G.SD_JSON)
        print('Run check.sh first -- it produces the export that carries the')
        print('Parent relations. Without them this reports a different graph.')
        return 2
    g = G.build_graph(idx, G.SD_JSON)

    unknown = [s for s in seeds if s not in idx.known]
    live = [s for s in seeds if s in idx.known]
    if unknown:
        print('not objects of the specification: %s' % ' '.join(unknown))
    # An empty seed set yields zero cycles, which READS as a pass and is not
    # one. This exact silence is what the export guard above exists to stop,
    # so it gets the same treatment.
    if not live:
        print('ERROR: not one seed resolved -- refusing to report a cycle')
        print('count for an empty graph. Check the object names.')
        return 2

    sub = {}
    edges = 0
    for a in live:
        kept = [b for b in g.get(a, ()) if b in live]
        sub[a] = kept
        edges += len(kept)

    print('seeds in the specification : %d of %d' % (len(live), len(seeds)))
    print('edges inside the seed set  : %d' % edges)
    cycles = sccs_of(sub)
    print('cycles in the induced graph: %d' % len(cycles))
    for c in cycles:
        print('   size %d : %s' % (len(c), ' '.join(sorted(c))))
    print('')
    if cycles:
        print('Each cycle above gets ONE plan and ONE pass. Editing its')
        print('members in sequence cannot converge. A value row pointing at')
        print('the requirement that owns its rule is the convention, not a')
        print('defect -- but if you are editing two of its members, they')
        print('still have to be written together.')
    else:
        print('No cycle among the seeds, so they may be written one at a')
        print('time. Iterate over OBJECTS, not over findings, all the same.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
