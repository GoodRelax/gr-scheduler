# -*- coding: utf-8 -*-
"""Write into src/ the formats of table T-024 that go out.

    python tools/generate_exchange_formats.py
    python tools/generate_exchange_formats.py --check

TWO READERS ASK THIS ROSTER TWO DIFFERENT QUESTIONS, AND THEY ARE NOT THE SAME
SET OF ROWS.

OP-12 of table T-024a decides which decoder a file is sent to, and it decides
it from two values table T-024 holds in columns of its own: the extension and
the first non-blank character. Rule 03 of docs/development-rules forbids
re-typing a value the specification holds, so `document-codec.ts` may not spell
`.json` or `<` itself. This script is the way those two columns arrive, and
`npm run gen:check` is what fails when the manuscript moves on without them.

FR-096 (MUST) has the author choose among the rows table T-024 marks with an
out direction, and the same requirement forbids one entrance per format (MUST
NOT) -- so the surface that asks needs the WHOLE of that set, including the
rows OP-12 never judges. ⛔ Those rows may not be typed on the drawing side
either: table T-024 is the one place that says which formats there are.

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

⚠️ THE TWO COLUMNS ARE NOT THE SAME SET OF ROWS. Table T-024 gives the
first-non-blank-character column to the rows `OP-1` accepts on intake, and gives
the extension column to every row that comes out as a FILE -- because FR-096
(MUST) suggests the document name with that extension, and the clipboard and the
store have no file to name. So three shapes stand here: both columns (a row
OP-12 judges), the extension alone (a file format that only goes out), and
neither. An em dash is carried across as `null` and NOT as an empty string: an
empty extension is the tail of every file name, so it would match all of them
rather than none. ⛔ Nothing is invented in an em dash's place.

⚠️ THE ROW THAT IS NOT WRITTEN OUT AT ALL is the one whose direction column
marks neither taking in nor writing out. It is not a file this tool exchanges,
so neither reader has a question about it.

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
# The ScreenRenderer's copy. FR-096 (MUST) has the `Export Chooser` propose
# the document name with the chosen row's extension, and LR-2 of table T-061
# forbids that component reaching into DocumentCodec's folder for it.
CHOOSER_OUT = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer',
                           'export-formats.json')

REL_SOURCE = 'docs/spec/01-04-requirements.md'
REL_OUT = 'src/adapter/document-codec/exchange-formats.json'
REL_CHOOSER_OUT = 'src/adapter/screen-renderer/export-formats.json'
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

# ⚠️ Three Japanese needles, and rule 03 section 5 allows them because the thing
# being parsed IS Japanese. The em dash is how table T-024 writes "this row has
# no such value" (tools/generate_icon_roster.py reads the same dash the same
# way). The two direction words are how the same table says a row is accepted on
# intake -- which is the property the two columns belong to -- and how it says a
# row is written out, which is the set FR-096 has the author choose from.
# ⛔ None of them is ever printed: every message this script writes is ASCII, so
# a console that cannot encode them still shows the reason.
EM_DASH = u'—'
INTAKE = u'取込'
OUTWARD = u'書出'

BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s, table %s: every row '
    'that table gives an out direction, which is the set FR-096 (MUST) has the '
    'author choose from, each with the extension and the first non-blank '
    'character that OP-12 of table T-024a compares, where the row carries them. '
    'Rebuild: npm run gen -- '
    'npm run gen:check fails on drift. The generator is %s. The first character '
    'is null on a row that only goes out, and the extension is null too where '
    'the row is not a file at all: table %s writes an em dash there, and such a '
    'row is not a format a file may be read AS. A format is carried by '
    'its row id alone -- the table has no English column, and the names this '
    'build uses for the two readable ones are bound to those row ids in '
    'document-codec.ts.'
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
    """One row of table T-024 that goes out, or None where the row does not.

    ⛔ The two columns are read together. A row with one of them and an em dash
    in the other is half a rule, and OP-12 needs both sides to agree before a
    file may be read -- so half a rule stops the run rather than becoming a
    format that can never match.
    """
    # @purity pure
    row_id, direction, extension, first = row[0], row[2], row[3], row[4]
    has_extension = extension != EM_DASH
    has_first = first != EM_DASH
    if has_first and not has_extension:
        sys.exit('generate_exchange_formats: %s of table %s carries the first '
                 'non-blank character OP-12 compares and an em dash where the '
                 'extension goes, so that side could never be matched'
                 % (row_id, TABLE))

    # Table T-024 gives the FIRST-CHARACTER column to the rows OP-1 accepts on
    # intake. Held in both directions, so that a row gaining a direction without
    # the value -- or the other way round -- is a stop and not a format that
    # silently cannot be opened.
    on_intake = INTAKE in direction
    if has_first != on_intake:
        sys.exit('generate_exchange_formats: %s of table %s %s accepted on '
                 'intake, and %s the first non-blank character OP-12 compares'
                 % (row_id, TABLE, 'is' if on_intake else 'is not',
                    'carries' if has_first else 'does not carry'))

    # FR-096's set is the whole of this file, and the rows OP-12 judges are a
    # part of it today.
    if OUTWARD not in direction:
        # ⛔ A row OP-12 may name that this filter DROPS is a decoder lost in
        # silence, so the two sets parting company stops the run. Nothing here
        # may choose which of the two readers to serve.
        if has_first:
            sys.exit('generate_exchange_formats: %s of table %s carries the two '
                     'columns OP-12 compares and is not written out, so one '
                     'roster can no longer answer both readers' % (row_id, TABLE))
        return None

    if not has_extension:
        # ⛔ The em dash crosses as null and never as an empty string: an empty
        # extension is the tail of every file name, so it would match files
        # rather than none of them.
        return {'rowId': row_id, 'extension': None, 'firstCharacter': None}

    extension = only_code_span(extension, row_id, 'extension')
    # ⛔ The reader compares the dotted tail of a file name, so an extension
    # written without its dot could never match and would refuse every file in
    # silence. FR-096 would suggest the same dotless name. Refused here instead,
    # where it is one line to fix.
    if not extension.startswith('.'):
        sys.exit('generate_exchange_formats: %s of table %s writes the '
                 'extension %r, which does not open with a dot'
                 % (row_id, TABLE, extension))
    if not has_first:
        # A file format that only goes out. FR-096 (MUST) suggests a name from
        # this extension; OP-12 never judges the row, so it carries no second
        # side to be compared against and null is what says so.
        return {'rowId': row_id, 'extension': extension, 'firstCharacter': None}

    first = only_code_span(first, row_id, 'first non-blank character')
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
        sys.exit('generate_exchange_formats: no row of table %s is written out, '
                 'so nothing could be chosen' % TABLE)
    judged = [f for f in formats if f['firstCharacter'] is not None]
    if not judged:
        sys.exit('generate_exchange_formats: no row of table %s carries the two '
                 'columns OP-12 compares, so nothing could be judged' % TABLE)
    # ⛔ OP-12 reads a file as the row BOTH sides match. Two rows sharing a
    # side would make that row ambiguous, and the ambiguity would show up as a
    # file opened as the wrong format rather than as a failure. ⚠️ Asked of the
    # rows that carry values only: the rows that only go out are all null on
    # both sides, and null is not a side anything is compared against.
    for key, what in (('extension', 'extension'),
                      ('firstCharacter', 'first non-blank character')):
        seen = [f[key] for f in judged]
        if len(set(seen)) != len(seen):
            sys.exit('generate_exchange_formats: two rows of table %s share a '
                     '%s, so OP-12 could not name one row' % (TABLE, what))
    # ⛔ And no two rows may share an extension at all, judged or not: FR-096
    # (MUST) suggests the document name with the chosen row extension, and two
    # rows wearing one extension would put the same suggested name on two
    # different formats.
    named = [f['extension'] for f in formats if f['extension'] is not None]
    if len(set(named)) != len(named):
        sys.exit('generate_exchange_formats: two rows of table %s share an '
                 'extension, so FR-096 could not suggest one name' % TABLE)

    columns = dict(zip(CARRIED, (header[0], header[3], header[4])))
    return {'$comment': BANNER, 'columns': columns, 'formats': formats}


def chooser_roster(roster):
    """What the `Export Chooser` offers: the rows that come out as a FILE.

    ⛔ IO-6 IS NOT AMONG THEM and neither is IO-5, and the extension column
    is what says so rather than a list written here: a row with no extension
    is not a file, so it has no name for FR-096 to propose. FR-096 (MUST
    NOT) keeps the clipboard off that surface for exactly that reason, and
    FR-025 carries it on IC-3 instead.
    """
    # @purity pure
    offered = [{'rowId': one['rowId'], 'extension': one['extension']}
               for one in roster['formats'] if one['extension'] is not None]
    return {'$comment': BANNER, 'formats': offered}


def main():
    """Write the formats, or say whether the ones on disk still match."""
    # @purity non-pure
    roster = build()
    body = json.dumps(roster, ensure_ascii=False, indent=1) + '\n'
    chooser_body = json.dumps(chooser_roster(roster),
                              ensure_ascii=False, indent=1) + '\n'
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
        if not os.path.exists(CHOOSER_OUT):
            sys.stdout.write('PROBLEM  %s has not been written yet\n'
                             % REL_CHOOSER_OUT)
            return 1
        if io.open(CHOOSER_OUT, encoding='utf-8', newline='').read() != chooser_body:
            sys.stdout.write('PROBLEM  %s has drifted from its manuscript -- '
                             'run `python %s`\n'
                             % (REL_CHOOSER_OUT, REL_SELF))
            return 1
        sys.stdout.write('OK       the exchange formats match their manuscript '
                         '(%d format(s), %d offered)\n'
                         % (count, len(chooser_roster(roster)['formats'])))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    io.open(CHOOSER_OUT, 'w', encoding='utf-8', newline='\n').write(chooser_body)
    sys.stdout.write('wrote %s (%d format(s), %d byte(s)) and %s (%d offered)\n'
                     % (REL_OUT, count, len(body), REL_CHOOSER_OUT,
                        len(chooser_roster(roster)['formats'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
