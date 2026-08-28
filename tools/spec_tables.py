# -*- coding: utf-8 -*-
"""The one reader of a specification table, for every generator in tools/.

WHY THIS EXISTS, MEASURED ON 2026-08-29. Six generators read the specification's
Markdown tables and carried ELEVEN table-parsing functions between them, none of
them shared and none of them the same. `.claude/skills/spec-graph-check/
specindex.py` had solved the same problem once already for the twenty-eight
checks, and no generator used it.

⛔ THE FRAGILITY IS NOT HYPOTHETICAL. A quick parser written the obvious way, in
the survey that led to this file, lost three of the specification's 135 tables:
a numbered table can span two pipe blocks, and prose sits between a caption and
its rows. Every bespoke copy is a fresh chance to lose rows silently -- and a
generator that loses rows writes a SHORT roster, which no check can tell from a
correct one.

⚠️ WHY NOT specindex.py ITSELF. That module answers a different question: which
row ids exist anywhere in the specification, and which node encloses each line.
It deliberately keeps no cells, because none of the checks need one. Generators
need the CELLS of ONE named table. Rather than widen an index the checks depend
on, the table reader lives here and the index keeps its own scan. ⛔ That leaves
two readers of the same syntax in the tree, which is one more than ideal; it is
recorded here rather than hidden.

WHAT THIS READER DOES THAT THE ELEVEN DID NOT:

  - stops at the NEXT caption. The bespoke copies set a flag when they saw
    their caption and then took every row matching their pattern to the end of
    the file, which is only safe while no other table uses the same row-id
    shape. Nothing enforced that.
  - reads a cell BY ITS HEADING. An index breaks the moment a column is added;
    a heading does not. CR-285 adds a column to two tables, which is what made
    this worth doing first.
  - refuses rather than guesses. A caption that is not found, a table with no
    rows, a heading that is not there: each is an error naming the table, not
    an empty list that becomes a short roster.
"""
import io
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# `**表 T-nnn — …**`. Anchored on the em dash, which is what tells a caption
# from the bold prose `**表 T-202 の…**` that merely mentions one.
CAPTION = re.compile(r'^\*\*表 (T-[0-9]+[a-z]?) —')
SEPARATOR = re.compile(r'^\|[\s:|-]+\|\s*$')
# A row id as the specification spells one: `IC-13`, `S-99a`, `RS-3a`.
ROW_ID = re.compile(r'^[A-Z]{1,4}-[0-9]+[a-z]?$')
# A line that ends a table even without a new caption.
BREAKS = ('#', '**UID**:', '**Type**:')


class Row(object):
    """One row of one table, with its cells reachable by heading."""

    def __init__(self, table, cells, lineno):
        self.table = table
        self.cells = cells
        self.lineno = lineno

    @property
    def id(self):
        """The first cell, stripped of the emphasis a table sometimes puts on it."""
        return self.cells[0].strip('`* ')

    def cell(self, heading):
        """The cell under `heading`. Refuses when the table has no such column."""
        # @purity pure
        if heading not in self.table.headings:
            raise SystemExit(
                'spec_tables: table %s has no column %r -- it has %r (%s:%d)'
                % (self.table.id, heading, self.table.headings,
                   self.table.file, self.lineno))
        return self.cells[self.table.headings.index(heading)]

    def has(self, heading):
        """@purity pure"""
        return heading in self.table.headings

    def __repr__(self):
        return '<Row %s of %s>' % (self.id, self.table.id)


class Table(object):
    """One numbered table, in the order the specification prints it."""

    def __init__(self, tid, rel, headings, caption_line):
        self.id = tid
        self.file = rel
        self.headings = headings
        #: 1-based line of the `**表 T-nnn —` caption. A reader that needs
        #: the prose ABOVE a table -- the sentence stating its height, say --
        #: has nowhere else to start from.
        self.caption_line = caption_line
        self.rows = []
        #: (line, headings) of every pipe block under this caption whose
        #: shape differs from the first -- see `read` for why they exist.
        self.asides = []

    def ids(self):
        """Every row id, in print order (rule 03 section 4). @purity pure"""
        return [r.id for r in self.rows]

    def by_id(self, rid):
        """@purity pure"""
        for row in self.rows:
            if row.id == rid:
                return row
        raise SystemExit('spec_tables: table %s has no row %s (%s)'
                         % (self.id, rid, self.file))

    def __len__(self):
        return len(self.rows)

    def __iter__(self):
        return iter(self.rows)


def read(rel, table_id):
    """One table of one file, or a refusal naming what was not found.

    ⚠️ A NUMBERED TABLE MAY SPAN TWO PIPE BLOCKS, which is why the walk does
    not stop at the first blank line. It stops at the next caption, at a
    chapter or requirement line, or at the end of the file.

    @purity semi-pure-b
    """
    path = os.path.join(ROOT, rel)
    lines = io.open(path, encoding='utf-8').read().split('\n')

    table = None
    inside = False
    headings = None
    aside = None
    caption_line = 0
    for i, line in enumerate(lines, 1):
        caption = CAPTION.match(line)
        if caption:
            if inside:
                break                       # the next table begins
            inside = caption.group(1) == table_id
            if inside:
                caption_line = i
            headings = None
            continue
        if not inside:
            continue
        if line.startswith(BREAKS):
            break
        if not line.startswith('|'):
            headings = None                 # a pipe block ended; prose may follow
            aside = None
            continue
        if SEPARATOR.match(line):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if headings is None:
            headings = cells
            if table is None:
                table = Table(table_id, rel, headings, caption_line)
            elif table.headings != headings:
                # ⭐ A SECOND PIPE BLOCK OF A DIFFERENT SHAPE IS AN ASIDE, NOT
                # A FAULT. Table T-023a is the measured case: its caption owns
                # the six PD rows and then a 面 / 何が定めるか list that carries
                # no row id at all. Its rows are not this table's roster, and
                # refusing here would stop a run over a document that is right.
                # ⚠️ COUNTED RATHER THAN DROPPED IN SILENCE, so a block that
                # SHOULD have been part of the roster can still be found.
                aside = headings
                table.asides.append((i, headings))
                continue
            continue
        if aside is not None and headings == aside:
            continue                        # a row of the aside block
        if len(cells) != len(headings):
            raise SystemExit(
                'spec_tables: table %s row %s has %d cells, its heading has %d '
                '(%s:%d)' % (table_id, cells[0], len(cells), len(headings), rel, i))
        table.rows.append(Row(table, cells, i))

    if table is None:
        raise SystemExit('spec_tables: %s has no table %s -- the caption is gone '
                         'or its spelling changed' % (rel, table_id))
    if not table.rows:
        raise SystemExit('spec_tables: table %s in %s has no rows' % (table_id, rel))
    return table


def row_ids(rel, table_id, shape=ROW_ID):
    """Every row id of one table whose first cell IS a row id.

    ⚠️ A table sometimes carries a row whose first cell is a word rather than an
    id; those are skipped here rather than reported, which is what the eleven
    parsers did by matching a row-id pattern.

    @purity semi-pure-b
    """
    return [r.id for r in read(rel, table_id) if shape.match(r.id)]
