# -*- coding: utf-8 -*-
"""Write into src/ the formats of table T-024 that go out.

    python tools/generate_exchange_formats.py
    python tools/generate_exchange_formats.py --check

THREE READERS ASK THIS ROSTER THREE DIFFERENT QUESTIONS, AND THEY ARE NOT THE
SAME SET OF ROWS.

OP-12 of table T-024a decides which decoder a file is sent to, and it decides
it from two values table T-024 holds in columns of its own: the extension and
the first non-blank character. Rule 03 of docs/development-rules forbids
re-typing a value the specification holds, so `document-codec.ts` may not spell
`.json` or `<` itself. This script is the way those two columns arrive, and
`npm run gen:check` is what fails when the manuscript moves on without them.

FR-096 (MUST) has the author choose among the rows whose "offered on IC-2"
column says so (CR-768), and the same requirement forbids one entrance per
format (MUST NOT) -- so the surface that asks needs the WHOLE of that set,
including the rows OP-12 never judges. ⛔ Those rows may not be typed on the
drawing side either: table T-024 is the one place that says which formats
there are, and since CR-768 it is also the one place that says which of them
the chooser offers -- the list of rows NOT offered that two generators used to
hold by hand is gone.

RW-7 of table T-346 names the written report by the extension of IO-8, a row
that is a file and is NOT offered on IC-2. So the drawing side carries a
second list beside the offered one: every row that comes out as a FILE.

CR-214 is why the values are in columns at all: they used to sit inside a
sentence of the note column, where no generator could reach them -- every
generator this repository has joins by row id and column, and not one parses
prose. So this one joins by row id and column too. ⭐ Since CR-768 it reads
each cell BY ITS HEADING (`tools/spec_tables.py`), not by its place: the table
gained two columns, and a reader that counts places breaks at every one.

⛔ Nothing here is minted. No English name is given to a format: table T-024's
format column is the manuscript's own wording and the only join the table
admits is the row id, so the row id is what this file carries and `src/` is
where a row id is bound to a name this build already had (`ImportFormat`).
A cell that is missing, a caption that has moved, a heading that has been
renamed and a row that carries half the rule all stop the run rather than
produce a file.

⚠️ THE TWO COLUMNS OP-12 COMPARES ARE NOT THE SAME SET OF ROWS. Table T-024
gives the first-non-blank-character column to the rows `OP-1` accepts on
intake, and gives the extension column to every row that comes out as a FILE
-- because FR-096 (MUST) suggests the document name with that extension, and
the clipboard and the store have no file to name. So three shapes stand here:
both columns (a row OP-12 judges), the extension alone (a file format that
only goes out), and neither. An em dash is carried across as `null` and NOT as
an empty string: an empty extension is the tail of every file name, so it
would match all of them rather than none. ⛔ Nothing is invented in an em
dash's place.

⚠️ THE MEDIA TYPE FOLLOWS THE EXTENSION (CR-768, JDG-2163). A row that comes
out as a file carries the media type FR-096 (MUST) hands the save chooser, and
a row that does not carries an em dash -- one without the other stops the run.
The Framework's copy is printed by tools/generate_entity_types.py, which reads
it through `file_rows()` below so that the table is parsed in one place.

⚠️ THE ROW THAT IS NOT WRITTEN OUT AT ALL is the one whose direction column
marks neither taking in nor writing out. It is not a file this tool exchanges,
so no reader has a question about it.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

import spec_tables

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SOURCE = os.path.join(ROOT, 'docs', 'spec', '01-04-requirements.md')
OUT = os.path.join(ROOT, 'src', 'adapter', 'document-codec', 'exchange-formats.json')
# The ScreenRenderer's copy. FR-096 (MUST) has the `Export Chooser` propose
# the document name with the chosen row's extension, RW-7 names the written
# report with IO-8's, and LR-2 of table T-061 forbids that component reaching
# into DocumentCodec's folder for either.
CHOOSER_OUT = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer',
                           'export-formats.json')

REL_SOURCE = 'docs/spec/01-04-requirements.md'
REL_OUT = 'src/adapter/document-codec/exchange-formats.json'
REL_CHOOSER_OUT = 'src/adapter/screen-renderer/export-formats.json'
REL_SELF = 'tools/generate_exchange_formats.py'

TABLE = 'T-024'

CODE_SPAN = re.compile(r'`([^`]+)`')
# A media type as RFC 6838 spells one: a type, a slash, a subtype.
MEDIA_TYPE = re.compile(r'^[a-z]+/[a-z0-9.+-]+$')

# ⚠️ Japanese needles, and rule 03 section 5 allows them because the thing
# being parsed IS Japanese. The headings are the table's own, read by name so
# that a column added upstream moves nothing here. The em dash is how table
# T-024 writes "this row has no such value" (tools/generate_icon_roster.py reads
# the same dash the same way). The two direction words are how the same table
# says a row is accepted on intake -- which is the property the first-character
# column belongs to -- and how it says a row is written out. The two words of
# the offered column are the only two values that column takes.
# ⛔ None of them is ever printed: every message this script writes is ASCII,
# so a console that cannot encode them still shows the reason.
HEAD_ROW = u'行 ID'
HEAD_DIRECTION = u'方向'
HEAD_EXTENSION = u'拡張子'
HEAD_MEDIA_TYPE = u'保存の選択面に渡す媒体の型'
HEAD_OFFERED = u'`IC-2` に出す'
HEAD_FIRST = u'先頭の非空白 1 文字'
EM_DASH = u'—'
INTAKE = u'取り込み'
OUTWARD = u'書出'
OFFERED = u'出す'
NOT_OFFERED = u'出さない'

BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s, table %s: every row '
    'that table gives an out direction, each with the extension and the first '
    'non-blank character that OP-12 of table T-024a compares, where the row '
    'carries them. Rebuild: npm run gen -- '
    'npm run gen:check fails on drift. The generator is %s. The first character '
    'is null on a row that only goes out, and the extension is null too where '
    'the row is not a file at all: table %s writes an em dash there, and such a '
    'row is not a format a file may be read AS. A format is carried by '
    'its row id alone -- the table has no English column, and the names this '
    'build uses for the readable ones are bound to those row ids in '
    'document-codec.ts.'
    % (REL_SOURCE, TABLE, REL_SELF, TABLE))

CHOOSER_BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s, table %s. formats: '
    'the rows whose column "offered on IC-2" says so, in the table\'s order, '
    'which is the set and the order FR-096 (MUST) has the author choose from. '
    'files: every row that comes out as a file, offered or not -- RW-7 of '
    'table T-346 names the written report by the extension of one of them. '
    'Each row carries its row id and its extension; the shown name is '
    'display-words.json\'s, under the same row id (FR-038). Rebuild: npm run '
    'gen -- npm run gen:check fails on drift. The generator is %s.'
    % (REL_SOURCE, TABLE, REL_SELF))


def only_code_span(cell, row_id, column):
    """The one name a cell writes as `code`, and nothing else beside it."""
    # @purity pure
    found = CODE_SPAN.findall(cell)
    if len(found) != 1 or '`%s`' % found[0] != cell:
        sys.exit('generate_exchange_formats: %s writes its %s as %r, which is '
                 'not one back-quoted value this script may read'
                 % (row_id, column, cell))
    return found[0]


def offered_of(row):
    """Whether FR-096's chooser offers the row: the offered column, read whole."""
    # @purity pure
    cell = row.cell(HEAD_OFFERED)
    if cell == OFFERED:
        return True
    if cell == NOT_OFFERED:
        return False
    sys.exit('generate_exchange_formats: %s of table %s writes %r in the '
             'column that says whether IC-2 offers it, which is neither of the '
             'two values that column takes' % (row.id, TABLE, cell))


def media_type_of(row, has_extension):
    """The media type FR-096 hands the save chooser, or None for a dash.

    ⛔ Held together with the extension: a file row with no media type would
    open a chooser that names no type, and a media type on a row that is not a
    file names a type for nothing.
    """
    # @purity pure
    cell = row.cell(HEAD_MEDIA_TYPE)
    has_type = cell != EM_DASH
    if has_type != has_extension:
        sys.exit('generate_exchange_formats: %s of table %s %s an extension and '
                 '%s a media type -- the two columns are filled together'
                 % (row.id, TABLE, 'has' if has_extension else 'has no',
                    'has' if has_type else 'has no'))
    if not has_type:
        return None
    media_type = only_code_span(cell, row.id, 'media type')
    if not MEDIA_TYPE.match(media_type):
        sys.exit('generate_exchange_formats: %s of table %s writes the media '
                 'type %r, which is not a type, a slash and a subtype'
                 % (row.id, TABLE, media_type))
    return media_type


def format_of(row):
    """One row of table T-024 that goes out, or None where the row does not.

    ⛔ The two columns OP-12 compares are read together. A row with one of them
    and an em dash in the other is half a rule, and OP-12 needs both sides to
    agree before a file may be read -- so half a rule stops the run rather
    than becoming a format that can never match.
    """
    # @purity pure
    row_id = row.id
    direction = row.cell(HEAD_DIRECTION)
    extension = row.cell(HEAD_EXTENSION)
    first = row.cell(HEAD_FIRST)
    has_extension = extension != EM_DASH
    has_first = first != EM_DASH
    offered = offered_of(row)
    media_type = media_type_of(row, has_extension)
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

    # ⛔ The chooser offers a FILE it can WRITE: an offered row with no
    # extension has no name to propose, and one with no out direction is not
    # a format the chooser can write.
    if offered and (not has_extension or OUTWARD not in direction):
        sys.exit('generate_exchange_formats: %s of table %s is offered on IC-2 '
                 'and is not a file that is written out, so FR-096 could not '
                 'propose a name for it' % (row_id, TABLE))

    if OUTWARD not in direction:
        # ⛔ A row OP-12 may name that this filter DROPS is a decoder lost in
        # silence, so the two sets parting company stops the run. Nothing here
        # may choose which of the readers to serve.
        if has_first:
            sys.exit('generate_exchange_formats: %s of table %s carries the two '
                     'columns OP-12 compares and is not written out, so one '
                     'roster can no longer answer every reader' % (row_id, TABLE))
        return None

    if not has_extension:
        # ⛔ The em dash crosses as null and never as an empty string: an empty
        # extension is the tail of every file name, so it would match files
        # rather than none of them.
        return {'rowId': row_id, 'extension': None, 'firstCharacter': None,
                'mediaType': None, 'offered': offered}

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
        return {'rowId': row_id, 'extension': extension, 'firstCharacter': None,
                'mediaType': media_type, 'offered': offered}

    first = only_code_span(first, row_id, 'first non-blank character')
    # The column is named for ONE character. More than one is not something
    # "the first non-blank character" can be compared against.
    if len(first) != 1:
        sys.exit('generate_exchange_formats: %s of table %s writes %d '
                 'character(s) where the column holds one'
                 % (row_id, TABLE, len(first)))
    return {'rowId': row_id, 'extension': extension, 'firstCharacter': first,
            'mediaType': media_type, 'offered': offered}


def read_formats():
    """Every row of table T-024 that goes out, with all five values it carries.

    The one parse of the table: build() below, and the regions
    tools/generate_entity_types.py prints, both start from here.
    """
    # @purity semi-pure-b
    table = spec_tables.read(REL_SOURCE, TABLE)
    for heading in (HEAD_ROW, HEAD_DIRECTION, HEAD_EXTENSION, HEAD_MEDIA_TYPE,
                    HEAD_OFFERED, HEAD_FIRST):
        if heading not in table.headings:
            sys.exit('generate_exchange_formats: table %s has no column this '
                     'script reads (one of its headings was renamed or dropped)'
                     % TABLE)
    if table.headings[0] != HEAD_ROW:
        sys.exit('generate_exchange_formats: table %s no longer opens with its '
                 'row id column' % TABLE)
    ids = table.ids()
    if len(set(ids)) != len(ids):
        sys.exit('generate_exchange_formats: table %s uses %d row id(s) for %d '
                 'row(s)' % (TABLE, len(set(ids)), len(ids)))

    formats = [f for f in (format_of(row) for row in table) if f is not None]
    if not formats:
        sys.exit('generate_exchange_formats: no row of table %s is written out, '
                 'so nothing could be chosen' % TABLE)
    if not any(f['offered'] for f in formats):
        sys.exit('generate_exchange_formats: no row of table %s is offered on '
                 'IC-2, so FR-096 would open a chooser with nothing in it'
                 % TABLE)
    judged = [f for f in formats if f['firstCharacter'] is not None]
    if not judged:
        sys.exit('generate_exchange_formats: no row of table %s carries the two '
                 'columns OP-12 compares, so nothing could be judged' % TABLE)
    # ⛔ OP-12 reads a file as the row BOTH sides match, so what has to name
    # one row is the PAIR (extension, first non-blank character) -- two rows
    # wearing one pair would make the file ambiguous, and the ambiguity would
    # show up as a file opened as the wrong format rather than as a failure.
    # ⚠️ One column alone is NOT asked to be unique: IO-1 and IO-7 both open
    # with `<`, and their extensions tell them apart (the note under table
    # T-024; DFC-1427). The extension check below is stronger still, so the
    # pair check is what states OP-12 and the one below what states FR-096.
    pairs = [(f['extension'], f['firstCharacter']) for f in judged]
    if len(set(pairs)) != len(pairs):
        sys.exit('generate_exchange_formats: two rows of table %s share an '
                 'extension and a first non-blank character, so OP-12 could '
                 'not name one row' % TABLE)
    # ⛔ Two rows may share an extension only with one media type: the
    # Framework's media types are keyed by the extension, so two types on one
    # extension would leave one of them unreachable. FR-096 suggests the name
    # by the chosen ROW, so a shared extension does not blur the name (CR-827:
    # IO-10, the schema handed with the image prompt, is `.json` as IO-2 is).
    media_by_extension = {}
    for f in formats:
        if f['extension'] is None:
            continue
        seen = media_by_extension.setdefault(f['extension'], f['mediaType'])
        if seen != f['mediaType']:
            sys.exit('generate_exchange_formats: two rows of table %s share the '
                     'extension %s with two media types, so the Framework '
                     'could not key one type by it' % (TABLE, f['extension']))
    return table.headings, formats


def build():
    """DocumentCodec's roster: the formats, as they are written out."""
    # @purity semi-pure-b
    headings, formats = read_formats()
    # ⭐ THE HEADINGS ARE THE TABLE'S OWN, carried so the artifact says which
    # column each key came from.
    columns = {'rowId': HEAD_ROW, 'extension': HEAD_EXTENSION,
               'firstCharacter': HEAD_FIRST}
    for heading in columns.values():
        if heading not in headings:
            sys.exit('generate_exchange_formats: table %s lost a column' % TABLE)
    carried = [{'rowId': f['rowId'], 'extension': f['extension'],
                'firstCharacter': f['firstCharacter']} for f in formats]
    return {'$comment': BANNER, 'columns': columns, 'formats': carried}


def file_rows():
    """Every row that comes out as a FILE: (row id, extension, media type, offered)."""
    # @purity semi-pure-b
    _headings, formats = read_formats()
    return [(f['rowId'], f['extension'], f['mediaType'], f['offered'])
            for f in formats if f['extension'] is not None]


def offered_rows():
    """The row ids FR-096 offers on IC-2, in the table's order."""
    # @purity semi-pure-b
    return [row_id for row_id, _e, _m, offered in file_rows() if offered]


def chooser_roster():
    """What the `Export Chooser` offers, and every row that is a file.

    ⛔ IO-6 IS NOT AMONG EITHER and neither is IO-5: a row with no extension is
    not a file, so it has no name to propose. FR-096 (MUST NOT) keeps the
    clipboard off the chooser for exactly that reason, and FR-025 carries it
    on IC-3 instead. ⛔ IO-8 is a file and is NOT offered: the offered column
    says so (CR-768), and RW-7 reads its extension from `files`.
    """
    # @purity semi-pure-b
    rows = file_rows()
    offered = [{'rowId': row_id, 'extension': extension}
               for row_id, extension, _m, is_offered in rows if is_offered]
    files = [{'rowId': row_id, 'extension': extension}
             for row_id, extension, _m, _o in rows]
    return {'$comment': CHOOSER_BANNER, 'formats': offered, 'files': files}


def main():
    """Write the formats, or say whether the ones on disk still match."""
    # @purity non-pure
    roster = build()
    chooser = chooser_roster()
    body = json.dumps(roster, ensure_ascii=False, indent=1) + '\n'
    chooser_body = json.dumps(chooser, ensure_ascii=False, indent=1) + '\n'
    count = len(roster['formats'])
    offered = len(chooser['formats'])
    if '--check' in sys.argv:
        for path, rel, wanted in ((OUT, REL_OUT, body),
                                  (CHOOSER_OUT, REL_CHOOSER_OUT, chooser_body)):
            if not os.path.exists(path):
                sys.stdout.write('PROBLEM  %s has not been written yet\n' % rel)
                return 1
            if io.open(path, encoding='utf-8', newline='').read() != wanted:
                sys.stdout.write('PROBLEM  %s has drifted from its manuscript -- '
                                 'run `python %s`\n' % (rel, REL_SELF))
                return 1
        sys.stdout.write('OK       the exchange formats match their manuscript '
                         '(%d format(s), %d offered)\n' % (count, offered))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    io.open(CHOOSER_OUT, 'w', encoding='utf-8', newline='\n').write(chooser_body)
    sys.stdout.write('wrote %s (%d format(s), %d byte(s)) and %s (%d offered)\n'
                     % (REL_OUT, count, len(body), REL_CHOOSER_OUT, offered))
    return 0


if __name__ == '__main__':
    sys.exit(main())
