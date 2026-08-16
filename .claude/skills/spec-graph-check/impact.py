# -*- coding: utf-8 -*-
"""Blast radius of a change, for the impact section of a change request.

A table and the requirements that point at it are one-to-many, so changing a
single table row changes the meaning of every requirement that points there.
Working that out by hand for each change request is the step most likely to
be skipped, and skipping it is how the last seven rounds produced 11 to 27
fresh defects each.

    python impact.py T-023a          what changes if that table changes
    python impact.py MK-6 FR-016     several targets at once
    python impact.py --cluster       print the interlocking-cluster map

Accepts table IDs (T-023a), row IDs (MK-6, S-35) and node UIDs (FR-016).
Output is Markdown, ready to paste into the impact section.

NOTE ON NON-ASCII: the cluster map holds Japanese labels because the
specification is written in Japanese.
"""
import re
import sys
import collections

import specindex

import os
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    '..', '..', '..'))

ROOT = REPO

# Clusters that move together. Recorded from the seven review rounds: these
# are the groups where changing one member broke an assumption held by
# another. Membership is by table, because tables are what requirements point
# at.
CLUSTERS = [
    ('ポインタ操作',
     ['T-023', 'T-023a', 'T-023b', 'T-023c', 'T-023d', 'T-036'],
     '判定順序（T-023a）が正。T-023 は指すだけ'),
    ('予実と遅れ',
     ['T-019', 'T-021', 'T-021a', 'T-021b', 'T-022'],
     '未着手の印は FR-013 が持つ。PM-1a は記号だけ'),
    ('開くと合流',
     ['T-024', 'T-024a', 'T-032'],
     '入口は「開く」1 つ（FR-087）。MSPDI も JSON も同じ経路'),
    ('占有幅と段',
     ['T-038', 'T-014'],
     '算入の可否は、表示の切り替えで位置が動くかで決めている'),
    ('設定値の相互依存',
     ['T-201', 'T-203', 'T-205', 'T-215'],
     'fontScale -> rulerFont -> rulerHeight -> 目盛の段階 の鎖'),
    ('命名と置き場の規約',
     ['T-101', 'T-102', 'T-103', 'T-104', 'T-105'],
     '名前の正は辞書、値の正は設定値表、規則と理由の正は要求'),
]

NODE_UID = re.compile(r'^(FR|NFR|UC|GL)-[0-9]+$')
TABLE_ID = re.compile(r'^T-[0-9]+[a-z]?$')


def cluster_of(tid):
    return [(name, members, note) for name, members, note in CLUSTERS
            if tid in members]


def classify(target):
    if TABLE_ID.match(target):
        return 'table'
    if NODE_UID.match(target):
        return 'node'
    return 'row'


def nodes_touching(idx, hits):
    """Node UIDs among the owners of the given reference hits."""
    seen = []
    for _, _, owner, _ in hits:
        if NODE_UID.match(owner) and owner not in seen:
            seen.append(owner)
    return seen


def second_hop(idx, nodes):
    """Requirements that point at one of `nodes` without naming any table.

    A requirement can belong to a cluster through a UID chain alone -- FR-022
    sits in the merge cluster but names no table, reaching it only through
    FR-087 and UC-014. Following table references alone would drop it, so the
    impact section needs this hop as well.
    """
    out = []
    for n in nodes:
        for path, ln, owner, _ in idx.references_to(n):
            if not NODE_UID.match(owner) or owner in nodes:
                continue
            hit = [o for o in out if o[0] == owner]
            if hit:
                if n not in hit[0][1]:
                    hit[0][1].append(n)
            else:
                out.append((owner, [n]))
    return out


def sections_touching(idx, hits):
    seen = []
    for _, _, owner, _ in hits:
        if owner.startswith('(section)') and owner not in seen:
            seen.append(owner)
    return seen


def report_table(idx, tid):
    t = idx.tables.get(tid)
    print('## 表 %s' % tid)
    if not t:
        print('')
        print('**その表は存在しない。** 表番号を確かめること。')
        return
    print('')
    print('- 定義: `%s:%s`' % (t['file'], t['line']))
    print('- 行: %d 行（%s）' % (idx.count_of(tid),
                                ' '.join(t['rows']) or '行 ID なし'))
    for name, members, note in cluster_of(tid):
        others = [m for m in members if m != tid]
        print('- **塊「%s」に属する。** 同じ塊: %s'
              % (name, ' '.join('表 ' + m for m in others)))
        print('  - %s' % note)

    hits = idx.references_to(tid)
    nodes = nodes_touching(idx, hits)
    sects = sections_touching(idx, hits)
    print('')
    print('### この表を指している要求（%d 件）' % len(nodes))
    print('')
    if nodes:
        print('| UID | 参照箇所 |')
        print('| --- | --- |')
        for n in nodes:
            where = ['%s:%s' % (h[0].split('/')[-1], h[1])
                     for h in hits if h[2] == n]
            print('| `%s` | %s |' % (n, ' '.join('`%s`' % w for w in where)))
    else:
        print('**指している要求が 1 件も無い。** 表が浮いているか、参照が'
              '別の書き方（表番号を伴わない行 ID）になっている。')
    second = second_hop(idx, nodes)
    print('')
    print('### 上の要求を指している要求（2 次。%d 件）' % len(second))
    print('')
    if second:
        print('| UID | どの 1 次要求を指しているか |')
        print('| --- | --- |')
        for n, via in second:
            print('| `%s` | %s |' % (n, ' '.join('`%s`' % v for v in via)))
        print('')
        print('⚠️ **表を名指ししない要求はここにしか現れない。**'
              ' 表だけを追うと取りこぼす。')
    else:
        print('なし')

    if sects:
        print('')
        print('### 要求以外から指している箇所（%d 件）' % len(sects))
        print('')
        for s in sects:
            n = len([h for h in hits if h[2] == s])
            print('- %s（%d 箇所）' % (s, n))


def report_row(idx, rid):
    owners = idx.row_owner.get(rid, [])
    print('## 行 `%s`' % rid)
    print('')
    if not owners:
        print('**どの表にも無い行である。** 行 ID を確かめること。')
        return
    for tid, f, ln in owners:
        label = tid if not tid.startswith('UID:') else \
            '%s（表番号の無い表）' % tid
        print('- 属する表: **%s**  `%s:%s`' % (label, f, ln))
        for name, members, note in cluster_of(tid):
            print('  - 塊「%s」。**表 %s を変えると塊全体を見ること**'
                  % (name, tid))

    hits = idx.references_to(rid)
    nodes = nodes_touching(idx, hits)
    print('')
    print('### この行を指している箇所（要求 %d 件 / 参照 %d 箇所）'
          % (len(nodes), len(hits)))
    print('')
    if hits:
        print('| 場所 | 位置 |')
        print('| --- | --- |')
        for path, ln, owner, _ in hits:
            print('| `%s` | `%s:%s` |' % (owner, path.split('/')[-1], ln))
    else:
        print('**指している箇所が無い。** 行が浮いている可能性がある。')


def report_node(idx, uid):
    print('## `%s`' % uid)
    print('')
    if uid not in idx.uids:
        print('**そのノードは存在しない。**'
              + ('（`FR-050` は廃止済み。欠番のまま残す）'
                 if uid in specindex.RETIRED else ''))
        return

    # Tables and rows this node points at.
    body_tables, body_rows = [], []
    for path, lines in idx.lines.items():
        for i, line in enumerate(lines, 1):
            if idx.owner(path, i) != uid:
                continue
            for t in specindex.REF_TABLE.findall(line):
                if t not in body_tables:
                    body_tables.append(t)
            for tok in specindex.REF_TOKEN.findall(line):
                if tok in idx.all_rows and tok not in body_rows:
                    body_rows.append(tok)

    print('### この要求が指している先')
    print('')
    print('- 表: %s' % (' '.join('表 `%s`' % t for t in body_tables) or 'なし'))
    print('- 行: %s' % (' '.join('`%s`' % r for r in body_rows) or 'なし'))
    clusters = collections.OrderedDict()
    for t in body_tables:
        for name, members, note in cluster_of(t):
            clusters[name] = (members, note)
    for name, (members, note) in clusters.items():
        print('- **塊「%s」に触れる。** %s'
              % (name, ' '.join('表 ' + m for m in members)))
        print('  - %s' % note)

    hits = idx.references_to(uid)
    nodes = nodes_touching(idx, hits)
    print('')
    print('### この要求を指している箇所（要求 %d 件 / 参照 %d 箇所）'
          % (len(nodes), len(hits)))
    print('')
    if hits:
        print('| 場所 | 位置 |')
        print('| --- | --- |')
        for path, ln, owner, _ in hits:
            print('| `%s` | `%s:%s` |' % (owner, path.split('/')[-1], ln))
    else:
        print('**指している箇所が無い。**')


def print_clusters(idx):
    print('# 噛み合っている塊')
    print('')
    print('**1 枚動かすと、同じ塊の残りと、それを指す要求すべてが影響を受ける。**')
    print('')
    for name, members, note in CLUSTERS:
        print('## %s' % name)
        print('')
        print('- 表: %s' % ' '.join('`%s`' % m for m in members))
        print('- %s' % note)
        nodes = []
        for m in members:
            for n in nodes_touching(idx, idx.references_to(m)):
                if n not in nodes:
                    nodes.append(n)
        print('- 指している要求 %d 件: %s'
              % (len(nodes), ' '.join('`%s`' % n for n in nodes)))
        print('')


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    idx = specindex.build(ROOT)
    if args[0] == '--cluster':
        print_clusters(idx)
        return 0
    for n, target in enumerate(args):
        if n:
            print('')
            print('---')
            print('')
        kind = classify(target)
        if kind == 'table':
            report_table(idx, target)
        elif kind == 'node':
            report_node(idx, target)
        else:
            report_row(idx, target)
    return 0


if __name__ == '__main__':
    sys.exit(main())
