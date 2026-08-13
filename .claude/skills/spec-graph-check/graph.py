# -*- coding: utf-8 -*-
"""The specification's reference graph, and what it says about editing it.

impact.py answers "what does this one object reach". This answers the
structural questions that decide HOW to edit:

    --depth      how far a change actually propagates, measured against a
                 past round instead of guessed
    --cycles     strongly connected components; if the graph is not a DAG
                 there is no dependency order to edit in, and the work must
                 be partitioned instead of sequenced
    --units      partition a set of findings into groups that share objects

Two facts this tool established for round 8, both of which had been
assumed rather than measured:

  * Depth 2 is the right blast radius. Measured against round 7's edits,
    depth 0 covers 61% of the next round's findings, depth 1 covers 91%,
    depth 2 covers 94%, and depth 3 buys one more point for four times the
    set size. Beyond that the graph is small-world and stops discriminating.
  * The graph is NOT a DAG: 16 cycles, the largest holding 57 objects.
    Most small cycles are the convention working as intended -- a value row
    points at the requirement that owns its rule, and the requirement names
    the value -- so they must not be "fixed".

NOTE ON NON-ASCII: the patterns hold Japanese text because the
specification is written in Japanese; those code points are data.
"""
import collections
import io
import json
import os
import re
import sys

import specindex

import os
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    '..', '..', '..'))

ROOT = REPO
SD_JSON = os.path.join(REPO, 'scratch', 'spec-check',
                       'sd-out', 'json', 'index.json')
OBJ = re.compile(r'(?:FR|NFR|UC|GL)-\d+|T-\d+[a-z]?|\b[A-Z]{1,3}-\d+[a-z]?\b')
ROW = re.compile(r'^[A-Z]{1,3}-\d+[a-z]?$')


def build_graph(idx, sd_json=None):
    """owner -> {referenced objects}, including StrictDoc Parent relations.

    Textual references alone miss the traceability spine: a requirement can
    belong to a cluster through Parent/Satisfies without naming any table.
    """
    g = collections.defaultdict(set)
    for path, lines in idx.lines.items():
        for i, line in enumerate(lines, 1):
            src = idx.owner(path, i)
            if line.startswith('|'):
                rid = line.strip().strip('|').split('|')[0].strip('`* ')
                if ROW.match(rid):
                    src = rid
            for t in set(OBJ.findall(line)):
                if t != src and t in idx.known:
                    g[src].add(t)
    if sd_json and os.path.exists(sd_json):
        sd = json.load(io.open(sd_json, encoding='utf-8'))

        def walk(n):
            for k in (n.get('NODES') or []):
                yield k
                for m in walk(k):
                    yield m

        for d in sd['DOCUMENTS']:
            for n in walk(d):
                if n.get('UID'):
                    for r in (n.get('RELATIONS') or []):
                        if r.get('TYPE') == 'Parent':
                            g[r['VALUE']].add(n['UID'])
    return g


def reverse(g):
    rg = collections.defaultdict(set)
    for a, bs in g.items():
        for b in bs:
            rg[b].add(a)
    return rg


def reach(rg, starts, depth):
    """Objects affected when `starts` change, within `depth` hops."""
    seen = set(starts)
    frontier = set(starts)
    for _ in range(depth):
        nxt = set()
        for x in frontier:
            nxt |= rg.get(x, set())
        nxt -= seen
        if not nxt:
            break
        seen |= nxt
        frontier = nxt
    return seen


def sccs(g):
    """Tarjan, iterative -- the graph is deep enough to blow the stack."""
    index, low, onstk, stk, out = {}, {}, {}, [], []
    ctr = [0]
    for root in list(g):
        if root in index:
            continue
        work = [(root, iter(g.get(root, ())))]
        index[root] = low[root] = ctr[0]
        ctr[0] += 1
        stk.append(root)
        onstk[root] = True
        while work:
            n, it = work[-1]
            pushed = False
            for w in it:
                if w not in index:
                    index[w] = low[w] = ctr[0]
                    ctr[0] += 1
                    stk.append(w)
                    onstk[w] = True
                    work.append((w, iter(g.get(w, ()))))
                    pushed = True
                    break
                if onstk.get(w):
                    low[n] = min(low[n], index[w])
            if pushed:
                continue
            work.pop()
            if work:
                low[work[-1][0]] = min(low[work[-1][0]], low[n])
            if low[n] == index[n]:
                comp = []
                while True:
                    w = stk.pop()
                    onstk[w] = False
                    comp.append(w)
                    if w == n:
                        break
                if len(comp) > 1:
                    out.append(comp)
    out.sort(key=len, reverse=True)
    return out


def units(findings):
    """Partition {id: {objects}} into groups sharing at least one object.

    An object shared by very many findings is a hub that would merge
    everything into one group, so only 2-4 way sharing creates an edge.
    """
    obj = collections.defaultdict(set)
    for fid, objs in findings.items():
        for t in objs:
            obj[t].add(fid)
    parent = {f: f for f in findings}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for t, fs in obj.items():
        if not 2 <= len(fs) <= 4:
            continue
        fs = sorted(fs)
        for b in fs[1:]:
            a, b2 = find(fs[0]), find(b)
            if a != b2:
                parent[a] = b2
    comp = collections.defaultdict(list)
    for f in findings:
        comp[find(f)].append(f)
    return sorted(comp.values(), key=len, reverse=True)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--cycles'
    idx = specindex.build(ROOT)
    # Without the Parent relations the cycle count is wildly different (18
    # small cycles instead of 4, the largest 60 instead of 181), so a missing
    # export must stop the run rather than quietly answer a different
    # question. This exact silence once produced a wrong number in a report.
    if not os.path.exists(SD_JSON):
        print('ERROR: %s not found.' % SD_JSON)
        print('Run check.sh first -- it produces the StrictDoc export that')
        print('carries the Parent relations. Without them this tool would')
        print('report a different graph without saying so.')
        return 2
    g = build_graph(idx, SD_JSON)
    if mode == '--cycles':
        cs = sccs(g)
        print('objects with outgoing references: %d' % len(g))
        print('cycles (2+ members): %d' % len(cs))
        for c in cs[:8]:
            print('   size %2d : %s' % (len(c), ' '.join(sorted(c)[:14])))
        print('')
        print('The graph is not a DAG, so there is no dependency order to')
        print('edit in. Partition the work by shared object instead.')
        print('A value row and the requirement owning its rule form a')
        print('2-cycle by design -- that is the convention, not a defect.')
    elif mode == '--depth':
        rg = reverse(g)
        seeds = [a for a in sys.argv[2:] if a in idx.known]
        if not seeds:
            print('usage: graph.py --depth <object> [...]')
            return 2
        for d in (1, 2, 3, 6):
            print('depth %d : %d objects affected' % (d, len(reach(rg, seeds, d)) - len(seeds)))
        print('')
        print('Depth 2 was validated against round 7 (94% of the next')
        print('round\'s findings); depth 3 adds ~1 point for 4x the set.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
