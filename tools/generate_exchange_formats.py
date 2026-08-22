# -*- coding: utf-8 -*-
"""Write the two exchange formats of table T-024 into src/.

    python tools/generate_exchange_formats.py
    python tools/generate_exchange_formats.py --check

OP-12 of table T-024a decides which decoder a file is sent to, and it decides
it from two values table T-024 holds in columns of its own: the extension and
the first non-blank character. Rule 03 of docs/development-rules forbids
re-typing a value the specification holds, so `document-codec.ts` may not spell
`.json` or `<` itself. This script is the way those two columns arrive, and
`npm run gen:check` is what fails when the manuscript moves on without them.

CR-214 is why the values are in columns at all: they used to sit inside a
sentence of the note column, where no generator could reach them -- every
generator this repository has joins by row id and column, and not one parses
prose. So this one joins by row id and column too.

⛔ Nothing here is minted. No English name is given to a format: table T-024's
format column is the manuscript's own wording and the only join the table
admits is the row id, so the row id is what this file carries and `src/` is
where a row id is bound to a name this build already had (`ImportFormat` /
`SaveFileForm`). A cell that is missing, a caption that has moved, a column
that has been renumbered and a row that carries half the rule all stop the run
rather than produce a file.

⚠️ Only the rows carrying BOTH values are written out. Table T-024 puts an em
dash in both columns for the five write-only rows, and says in as many words
that the two columns belong to the two rows `OP-1` accepts on intake -- so a
row with an em dash is not a format anything may be read AS.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SOURCE = os.path.join(ROOT, 'docs', 'spec', '01-04-requirements.md')
OUT = os.path.join(ROOT, 'src', 'adapter', 'document-codec', 'exchange-formats.json')

REL_SOURCE = 'docs/spec/01-04-requirements.md'
REL_OUT = 'src/adapter/document-codec/exchange-formats.json'
REL_SELF = 'tools/generate_exchange_formats.py'

TABLE = 'T-024'

# ⭐ The table is found by the shape of its row ids rather than by its caption,
# which keeps the needle ASCII. The caption is then checked to name the table,
# so a renumbered or moved table fails loudly instead of being read as the
# wrong one. Table T-024 is the only table in docs/spec whose rows open `IO-`.
FORMAT_ROW = re.compile(r'^\| (IO-\d+[a-z]?) \|')
CODE_SPAN = re.compile(r'`([^`]+)`')

# The keys this file gives the seven columns, in the manuscript's own order.
# ⚠️ All seven are named so that a column added or dropped upstream stops the
# run; only the three below travel into the artifact.
FIELDS = ('rowId', 'format', 'direction', 'extension', 'firstCharacter',
          'purpose', 'note')
CARRIED = ('rowId', 'extension', 'firstCharacter')

# ⚠️ Two Japanese needles, and rule 03 section 5 allows them because the thing
# being parsed IS Japanese. The em dash is how table T-024 writes "this row has
# no such value" (tools/generate_icon_roster.py reads the same dash the same
# way). The direction word is how the same table says a row is accepted on
# intake, which is the property the two columns belong to.
# ⛔ Neither is ever printed: every message this script writes is ASCII, so a
# console that cannot encode them still shows the reason.
EM_DASH = u'—'
INTAKE = u'取込'

BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s, table %s (the '
    'extension and the first non-blank character, which OP-12 of table T-024a '
    'compares). Rebuild: npm run gen -- npm run gen:check fails on drift. The '
    'generator is %s. Only the rows carrying BOTH values are here: table %s '
    'writes an em dash for the write-only rows, and those are not formats a '
    'file may be read AS. A format is carried by its row id alone -- the '
    'table has no English column, and the names this build uses for the two '
    'are bound to these row ids in document-codec.ts.'
    % (REL_SOURCE, TABLE, REL_SELF, TABLE))


def cells(line):
    """The cells of one Markdown table row."""
    # @purity pure
    return [c.strip() for c in line.strip().strip('|').split('|')]


def read_lines():
    """The requirements document, line by line."""
    # @purity semi-pure-b
    return io.open(SOURCE, encoding='utf-8').read().split('\n')


def table_rows(lines, row_pattern, table_id):
    """The header and the body rows of one table.

    Fails when the table is absent, when its rows are not one unbroken run, or
    when the caption above them names something else -- all three of which mean
    the reader below would be guessing at which table it has.
    """
    # @purity pure
    body = [i for i, line in enumerate(lines) if row_pattern.match(line)]
    if not body:
        sys.exit('generate_exchange_formats: %s holds no row of table %s'
                 % (REL_SOURCE, table_id))
    first, last = body[0], body[-1]
    if body != list(range(first, last + 1)):
        sys.exit('generate_exchange_formats: the rows of table %s do not form '
                 'one run of lines in %s' % (table_id, REL_SOURCE))
    if first < 3:
        sys.exit('generate_exchange_formats: table %s starts at line %d of %s, '
                 'with no room above it for a header and a caption'
                 % (table_id, first + 1, REL_SOURCE))
    ruler = set(lines[first - 1].replace('|', '').replace(' ', ''))
    if ruler != set('-'):
        sys.exit('generate_exchange_formats: table %s has no header ruler above '
                 'its first row in %s' % (table_id, REL_SOURCE))
    caption = first - 3
    while caption > 0 and not lines[caption].strip():
        caption -= 1
    if table_id not in lines[caption]:
        sys.exit('generate_exchange_formats: the rows that look like table %s '
                 'sit under a caption that does not name it (line %d of %s)'
                 % (table_id, caption + 1, REL_SOURCE))
    header = cells(lines[first - 2])
    rows = []
    for i in body:
        row = cells(lines[i])
        if len(row) != len(header):
            sys.exit('generate_exchange_formats: line %d of %s has %d cell(s) '
                     'where table %s has %d column(s)'
                     % (i + 1, REL_SOURCE, len(row), table_id, len(header)))
        rows.append(row)
    return header, rows


def only_code_span(cell, row_id, column):
    """The one name a cell writes as `code`, and nothing else beside it."""
    # @purity pure
    found = CODE_SPAN.findall(cell)
    if len(found) != 1 or '`%s`' % found[0] != cell:
        sys.exit('generate_exchange_formats: %s writes its %s as %r, which is '
                 'not one back-quoted value this script may read'
                 % (row_id, column, cell))
    return found[0]


def format_of(row):
    """One row of table T-024, or None where the row carries no format.

    ⛔ The two columns are read together. A row with one of them and an em dash
    in the other is half a rule, and OP-12 needs both sides to agree before a
    file may be read -- so half a rule stops the run rather than becoming a
    format that can never match.
    """
    # @purity pure
    row_id, direction, extension, first = row[0], row[2], row[3], row[4]
    has_extension = extension != EM_DASH
    has_first = first != EM_DASH
    if has_extension != has_first:
        sys.exit('generate_exchange_formats: %s of table %s carries one of the '
                 'two columns OP-12 compares and an em dash in the other'
                 % (row_id, TABLE))

    # Table T-024 states that the two columns belong to the rows OP-1 accepts
    # on intake. Held in both directions, so that a row gaining a direction
    # without the values -- or the other way round -- is a stop and not a
    # format that silently cannot be opened.
    on_intake = INTAKE in direction
    if has_extension != on_intake:
        sys.exit('generate_exchange_formats: %s of table %s %s accepted on '
                 'intake, and %s the two columns OP-12 compares'
                 % (row_id, TABLE, 'is' if on_intake else 'is not',
                    'carries' if has_extension else 'does not carry'))
    if not has_extension:
        return None

    extension = only_code_span(extension, row_id, 'extension')
    first = only_code_span(first, row_id, 'first non-blank character')
    # ⛔ The reader compares the dotted tail of a file name, so an extension
    # written without its dot could never match and would refuse every file in
    # silence. Refused here instead, where it is one line to fix.
    if not extension.startswith('.'):
        sys.exit('generate_exchange_formats: %s of table %s writes the '
                 'extension %r, which does not open with a dot'
                 % (row_id, TABLE, extension))
    # The column is named for ONE character. More than one is not something
    # "the first non-blank character" can be compared against.
    if len(first) != 1:
        sys.exit('generate_exchange_formats: %s of table %s writes %d '
                 'character(s) where the column holds one'
                 % (row_id, TABLE, len(first)))
    return {'rowId': row_id, 'extension': extension, 'firstCharacter': first}


def build():
    """The formats, as they are written out."""
    # @purity semi-pure-b
    lines = read_lines()
    header, rows = table_rows(lines, FORMAT_ROW, TABLE)
    if len(header) != len(FIELDS):
        sys.exit('generate_exchange_formats: table %s now has %d column(s) and '
                 'this script names %d' % (TABLE, len(header), len(FIELDS)))
    ids = [row[0] for row in rows]
    if len(set(ids)) != len(ids):
        sys.exit('generate_exchange_formats: table %s uses %d row id(s) for %d '
                 'row(s)' % (TABLE, len(set(ids)), len(ids)))

    formats = [f for f in (format_of(row) for row in rows) if f is not None]
    if not formats:
        sys.exit('generate_exchange_formats: no row of table %s carries the two '
                 'columns OP-12 compares, so nothing could be judged' % TABLE)
    # ⛔ OP-12 reads a file as the row BOTH sides match. Two rows sharing a
    # side would make that row ambiguous, and the ambiguity would show up as a
    # file opened as the wrong format rather than as a failure.
    for key, what in (('extension', 'extension'),
                      ('firstCharacter', 'first non-blank character')):
        seen = [f[key] for f in formats]
        if len(set(seen)) != len(seen):
            sys.exit('generate_exchange_formats: two rows of table %s share a '
                     '%s, so OP-12 could not name one row' % (TABLE, what))

    columns = dict(zip(CARRIED, (header[0], header[3], header[4])))
    return {'$comment': BANNER, 'columns': columns, 'formats': formats}


def main():
    """Write the formats, or say whether the one on disk still matches."""
    # @purity non-pure
    roster = build()
    body = json.dumps(roster, ensure_ascii=False, indent=1) + '\n'
    count = len(roster['formats'])
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            sys.stdout.write('PROBLEM  %s has not been written yet\n' % REL_OUT)
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body:
            sys.stdout.write('PROBLEM  %s has drifted from its manuscript -- '
                             'run `python %s`\n' % (REL_OUT, REL_SELF))
            return 1
        sys.stdout.write('OK       the exchange formats match their manuscript '
                         '(%d format(s))\n' % count)
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    sys.stdout.write('wrote %s (%d format(s), %d byte(s))\n'
                     % (REL_OUT, count, len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
