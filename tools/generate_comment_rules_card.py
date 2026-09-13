# -*- coding: utf-8 -*-
"""Write the comment rules card from docs/review/comment-rules-src.md.

The card is what a brief to a subagent pastes instead of the rules themselves
(JDG-59, record 11 of docs/development-records/refactor-plan-report-2026-09-13.md):
no more than MAX_LINES lines, generated so it cannot drift from the ruling it
condenses.

READS   docs/review/comment-rules-src.md
WRITES  docs/review/comment-rules-card.md

How the source becomes the card, by structure only -- no wording is matched:
  - the front matter is dropped; the H1 title is kept;
  - before the first `## ` heading, only lines opening with the no-entry mark
    are kept (the rule, not its grounds);
  - inside each `## ` section every non-blank line outside a table is kept,
    and the section title is put in front of the section's first line;
  - a table of 4 or more columns gives one line per row; any other table is
    joined into one line, its rows split by ` / `, a leading `#` column
    dropped;
  - a Markdown link keeps its text only.
Every kept line becomes a list item. The build fails (exit 1) past MAX_LINES.

WHAT IT DOES NOT SEE. Whether the condensed card still means what the ruling
means: the preamble keeps only its no-entry lines, so a rule written there as
plain prose never reaches the card; and a table joined into one line loses its
column headings. Nothing checks that the card is enough to write by.

Usage:
    python tools/generate_comment_rules_card.py           write the card
    python tools/generate_comment_rules_card.py --check   exit 1 when it differs
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_REL = 'docs/review/comment-rules-src.md'
CARD_REL = 'docs/review/comment-rules-card.md'
SOURCE = os.path.join(ROOT, *SOURCE_REL.split('/'))
CARD = os.path.join(ROOT, *CARD_REL.split('/'))

MAX_LINES = 30
# A table this wide keeps one line per row; a narrower one is joined.
ROW_PER_LINE_COLUMNS = 4
NO_ENTRY = u'\u26d4'
BANNER = (u'<!-- generated from %s by tools/generate_comment_rules_card.py -- '
          u'do not edit by hand; rebuild with npm run gen:card -->'
          % SOURCE_REL)

LINK = re.compile(u'\\[([^\\]]*)\\]\\([^)]*\\)')
CELL = re.compile(u'(?<!\\\\)\\|')
SEPARATOR = re.compile(u'^\\|[\\s:|-]+\\|$')


def say(message):
    """Print ASCII whatever the console's code page."""
    sys.stdout.write(message.encode('ascii', 'backslashreplace')
                     .decode('ascii') + '\n')


def cells_of(line):
    return [cell.strip() for cell in CELL.split(line.strip())[1:-1]]


def render_table(rows):
    """Card lines for one table: its header row first, separator skipped."""
    header = cells_of(rows[0])
    body = [cells_of(r) for r in rows[1:] if not SEPARATOR.match(r.strip())]
    if len(header) >= ROW_PER_LINE_COLUMNS:
        return [u' | '.join(cells) for cells in body]
    drop = 1 if header and header[0] == u'#' else 0
    parts = []
    for cells in body:
        cells = cells[drop:]
        if len(cells) == 1:
            parts.append(cells[0])
        elif len(cells) == 2:
            parts.append(u'%s: %s' % (cells[0], cells[1]))
        else:
            parts.append(u'%s: %s (%s)' % (cells[0], cells[1],
                                           u'; '.join(cells[2:])))
    return [u' / '.join(parts)]


def build():
    with io.open(SOURCE, encoding='utf-8', newline='') as handle:
        text = handle.read().replace(u'\r\n', u'\n')
    lines = text.split(u'\n')
    if lines and lines[0].strip() == u'---':
        end = lines.index(u'---', 1)
        lines = lines[end + 1:]

    title = None
    preamble = []
    sections = []
    table = []

    def flush_table():
        if table and sections:
            wide = len(cells_of(table[0])) >= ROW_PER_LINE_COLUMNS
            kind = u'table' if wide else u'line'
            sections[-1][1].extend((kind, item) for item in render_table(table))
        del table[:]

    for raw in lines:
        line = raw.rstrip()
        if line.startswith(u'|'):
            table.append(line)
            continue
        flush_table()
        if not line.strip():
            continue
        if line.startswith(u'## '):
            sections.append((line[3:].strip(), []))
        elif line.startswith(u'# ') and title is None:
            title = line[2:].strip()
        elif not sections:
            if line.startswith(NO_ENTRY):
                preamble.append(line.strip())
        else:
            sections[-1][1].append((u'line', line.strip()))
    flush_table()

    out = [BANNER, u'# %s' % (title or SOURCE_REL)]
    out.extend(u'- %s' % LINK.sub(u'\\1', p) for p in preamble)
    for heading, items in sections:
        if not items:
            continue
        kind, first = items[0]
        if kind == u'line':
            out.append(u'- **%s** %s' % (heading, LINK.sub(u'\\1', first)))
            rest = items[1:]
        else:
            out.append(u'- **%s**' % heading)
            rest = items
        for kind, item in rest:
            indent = u'  ' if kind == u'table' else u''
            out.append(u'%s- %s' % (indent, LINK.sub(u'\\1', item)))
    return u'\n'.join(out) + u'\n'


def main(argv):
    card = build()
    count = card.count(u'\n')
    if count > MAX_LINES:
        say('FAIL     %s would be %d lines, over the %d a brief can carry; '
            'shorten %s' % (CARD_REL, count, MAX_LINES, SOURCE_REL))
        return 1
    if '--check' in argv:
        current = None
        if os.path.exists(CARD):
            with io.open(CARD, encoding='utf-8', newline='') as handle:
                current = handle.read()
        if current != card:
            say('FAIL     %s differs from what %s builds -- run npm run '
                'gen:card' % (CARD_REL, SOURCE_REL))
            return 1
        say('OK       %s matches %s (%d lines)' % (CARD_REL, SOURCE_REL, count))
        return 0
    with io.open(CARD, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(card)
    say('WROTE    %s (%d lines)' % (CARD_REL, count))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
