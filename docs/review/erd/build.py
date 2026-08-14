# -*- coding: utf-8 -*-
"""Regenerate the data model figures and tables.

    python docs/review/erd/build.py

Writes docs/spec/_assets/fig-erd-overview.md and fig-erd-detail.md.
The figure and the tables come from the same source (erd_model.ENTITIES), so
they cannot disagree about a column. Edit erd_model.py or the *.txt prose
templates in this folder -- never the generated .md.

After running, always:
    bash .claude/skills/spec-graph-check/check.sh
and confirm the tables= / figures= / rows= counters move by the expected amount.
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
ASSETS = os.path.join(ROOT, 'docs', 'spec', '_assets')

sys.path.insert(0, HERE)
import gen_erd as g                                          # noqa: E402


def read(name):
    with io.open(os.path.join(HERE, name), encoding='utf-8') as f:
        return f.read()


def write(name, text):
    path = os.path.join(ASSETS, name)
    with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    return path


def main():
    overview = (read('ov_head.txt')
                + '\n'.join(g.entity_table())
                + read('ov_tail.txt'))
    detail = (read('det_head.txt') + g.figure()
              + read('det_mid1.txt') + '\n'.join(g.relation_table())
              + read('det_mid2.txt') + '\n'.join(g.column_table())
              + read('det_mid3.txt') + '\n'.join(g.derived_table())
              + read('det_tail.txt'))
    write('fig-erd-overview.md', overview)
    write('fig-erd-detail.md', detail)
    print('entities  %d' % len(g.m.ENTITIES))
    print('columns   %d  (table rows, including the two document stamps)'
          % len(g.column_table()))
    print('relations %d' % len(g.relation_table()))
    print('derived   %d' % len(g.derived_table()))


if __name__ == '__main__':
    main()
