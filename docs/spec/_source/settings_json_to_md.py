# -*- coding: utf-8 -*-
"""settings.json -> docs/spec/_assets/tbl-settings.md

settings.json is the manuscript Chapter 6.2 names for the presentation group.
EDIT THAT. This file prints it as the document the specification carries, and
_assets/tbl-settings.md is a generated artifact: a hand edit to it is
overwritten, and --check catches one before it can be committed.

    python settings_json_to_md.py           rebuild the document
    python settings_json_to_md.py --check   exit 1 if the file on disk differs

⭐ The manuscript sits in docs/spec/_source/, which belongs to no language:
the ja/en split divides _assets/, and 1533 table rows maintained twice would
be the very drift this generator exists to remove. Every cell holding Japanese
is a {"ja": ...} dictionary so that "en" is data entry rather than a rewrite;
a cell holding a key, a number or a unit is the same in every language and is
stored as a plain string.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), '_assets')
SRC = os.path.join(HERE, 'settings.json')
OUT = os.path.join(ASSETS, 'tbl-settings.md')

LANG = 'ja'

# Row keys that are not printed cells.
METADATA = frozenset(['json'])

def say(message):
    """⛔ The Windows console is cp932 and this file's messages quote the
    manuscript, which holds 🔎 and ⛔. Writing them raw raised
    UnicodeEncodeError from INSIDE the problem reporter -- so a bad manuscript
    killed the run with a stack trace instead of naming the row. Same guard as
    erd_json_to_md.py's `say`.
    """
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


# The day-name roster of the manuscript, put here by build() so that text()
# keeps one argument. ⚠️ Read only -- the manuscript owns it.
ROSTER = None


def weekdays(value, roster):
    """A cell that states weekdays: the NUMBERS render into the day names.

    ⛔ The words are not in the cell. Table T-209 prints 「月・火・水・木・金」
    and the code needs [2, 3, 4, 5, 6]; holding both would let them disagree,
    and nothing would say so.

    ⚠️ The exchange format numbers weekdays two different ways, so a cell says
    which one it uses: `WeekDay/DayType` counts 1 = Sunday to 7 = Saturday,
    `Project/WeekStartDay` counts 0 = Sunday to 6 = Saturday (AT-73 and AT-17).
    The roster below is indexed the second way, so a dayType value is shifted.
    """
    names = roster[value['form']][LANG]
    shift = 1 if value['encoding'] == 'dayType' else 0
    days = [names[day - shift] for day in value['days']]
    if not days:
        return roster['none'][LANG]
    # ⚠️ The separator belongs to a language too. It was written as a plain
    # string first, and check 23 caught it: 「・」 is Japanese punctuation and an
    # English edition would join with a comma.
    return roster['separator'][LANG].join(days)


def text(value, field=None):
    """One cell, in the language being printed.

    A cell is one of three things:

      "6"                       a plain string -- an expression, a dash, an
                                empty cell, anything printed verbatim
      {"ja": "…"}               prose, which the ja/en split divides
      {"num": "0.80", …}        a MACHINE value, which the code generators read
                                and this function renders back

    ⚠️ `num` holds the number as it is written, not as a JSON number: 0.80,
    1.0 and 0.20 would come back as 0.8, 1.0 and 0.2 and the printed document
    would stop matching. The author's precision is part of the value.
    """
    if not isinstance(value, dict):
        return value
    if 'ja' in value:
        return value[LANG]
    if 'days' in value:
        if ROSTER is None:
            raise SystemExit('a weekday cell was printed before the roster was read')
        out = weekdays(value, ROSTER)
        return out + (' ' + value['mark'] if value.get('mark') else '')
    if 'sameAs' in value:
        # ⛔ The value is NOT restated here; the cell names the row it follows.
        return '`%s` に同じ' % value['sameAs']
    if 'num' in value or 'lit' in value or 'pair' in value or 'colour' in value:
        if 'pair' in value:
            # `sep` is for the pairs the specification does NOT write as
            # width by height -- S-104's dash pattern is 「2,2」, and printing
            # it with the default separator would rewrite the document.
            body = value.get('sep', PAIR_SEPARATOR).join(value['pair'])
        else:
            body = value.get('num', value.get('lit', value.get('colour')))
        out = '`%s`' % body if value.get('code') else body
        # A word that WRAPS the value belongs to a language, so it is a
        # dictionary of its own -- and the number inside it is not written a
        # second time. S-90's 「バーの上下に 6px」 is one number and one phrase,
        # not a sentence with a 6 buried in it.
        if 'prefix' in value:
            out = text(value['prefix']) + out
        out += value.get('suffix', '')
        # ⭐ An OPEN bound. The value itself is not allowed, and the printed
        # table has to say so -- these rows used to read `1 − ε`, which named a
        # quantity the specification never gave a value to. The word is derived
        # from which column the cell is in, so it cannot disagree with the flag.
        if value.get('exclusive'):
            out += {'max': ' 未満', 'min': ' 超'}[field]
        if value.get('mark'):
            out += ' ' + value['mark']
        return out
    raise SystemExit('a cell is neither prose nor a machine value: %r' % value)


# Two numbers printed as one cell: 「30 × 20px」. The separator is the
# specification's, not a language's -- 表 T-206 writes it this way for every
# size it gives as width by height.
PAIR_SEPARATOR = ' × '


STOP = u'\u3002'
QUOTE_OPEN = u'\u300c\u300e'
QUOTE_SHUT = u'\u300d\u300f'


def separate_tables(text):
    """A blank line between a table and whatever follows it.

    A line that is not a row but sits directly under one is absorbed into the
    table -- it renders as a row whose first cell is empty. The caption of
    表 T-236 did exactly that.
    """
    out = []
    under_a_row = False
    fenced = False
    for line in text.split('\n'):
        stripped = line.strip()
        if stripped.startswith('```'):
            fenced = not fenced
        if under_a_row and stripped and not stripped.startswith('|') and not fenced:
            out.append('')
        under_a_row = stripped.startswith('|') and not fenced
        out.append(line)
    return '\n'.join(out)


def _break_points(body):
    """Where this line may be split.

    Just past a sentence end -- and past a closing ** that follows it, because
    a closer may not START a line (the renderer leaves the asterisks on the
    page) though it may end one. A quotation is never split.
    """
    out, quoted = [], 0
    for i, ch in enumerate(body):
        if ch in QUOTE_OPEN:
            quoted += 1
            continue
        if ch in QUOTE_SHUT:
            quoted = max(0, quoted - 1)
            continue
        if ch != STOP or quoted:
            continue
        at = i + 1
        if body[at:].lstrip().startswith('**') and body[:at].count('**') % 2:
            at = body.index('**', at) + 2
        if body[at:].strip().strip('*'):
            out.append(at)
    return out


def broken_prose(text):
    """The built document with every prose sentence on its own line.

    THE RULE (check 46): outside a table a sentence break is a HARD break --
    two trailing spaces, and the line ends. A table row, a heading and a
    fenced block are left alone; a blockquote keeps its `> ` on each piece.
    """
    out = []
    fenced = False
    under_a_row = False
    for line in text.split('\n'):
        stripped = line.strip()
        if stripped.startswith('```'):
            fenced = not fenced
            out.append(line)
            continue
        if fenced or not stripped or stripped.startswith(('|', '#')):
            under_a_row = stripped.startswith('|')
            out.append(line)
            continue
        # A line directly under a table row belongs to that table as far as
        # markdown is concerned; splitting it would hand the table a row.
        if under_a_row:
            out.append(line)
            continue
        lead = ''
        body = line
        while body.lstrip().startswith('>'):
            cut = body.index('>') + 1
            if body[cut:cut + 1] == ' ':
                cut += 1
            lead += body[:cut]
            body = body[cut:]
        spots = _break_points(body)
        if not spots:
            out.append(line)
            continue
        pieces, prev = [], 0
        for at in spots:
            pieces.append(body[prev:at])
            prev = at
        pieces.append(body[prev:])
        pieces = [p for p in pieces if p.strip()]
        if len(pieces) < 2:
            out.append(line)
            continue
        for piece in pieces[:-1]:
            out.append(lead + piece.strip() + '  ')
        out.append(lead + pieces[-1].strip())
    return '\n'.join(out)

def broken(cell):
    """A cell with every sentence on its own line.

    ⛔ THE RULE (check 46, the user's ruling 2026-09-12): inside a table row a
    sentence break is written `<br>`. A row is one line, so this is the only
    break a cell can carry.

    ⚠️ A quotation is never split: a `<br>` inside 「…」 would put a line break
    in the middle of a verbatim, which is what ruling R-05's check caught.
    """
    out = []
    quoted = 0
    for i, ch in enumerate(cell):
        out.append(ch)
        if ch in u'\u300c\u300e':
            quoted += 1
        elif ch in u'\u300d\u300f':
            quoted = max(0, quoted - 1)
        elif ch == u'\u3002' and not quoted:
            rest = cell[i + 1:]
            if rest.strip() and not rest.startswith('<br>'):
                out.append('<br>')
    return ''.join(out)


def markdown_row(cells):
    """One Markdown row.

    ⚠️ An empty cell is written `| |`, not `|  |`. Joining on ' | ' would put
    two spaces there and the round trip would stop being byte for byte -- which
    is how this was found: rows S-122 and S-123 leave their last column blank.
    """
    return '|' + ''.join((' %s |' % broken(c)) if c else ' |' for c in cells)


def row_line(fields, row):
    return markdown_row([text(row[f], f) for f in fields])


def table(block):
    fields = [c['field'] for c in block['columns']]
    out = ['**表 %s — %s**' % (block['id'], text(block['caption'])),
           block['blank_before_header'],
           markdown_row([text(c) for c in block['columns']]),
           block['separator']]
    out.extend(row_line(fields, r) for r in block['rows'])
    return out


def build(doc):
    global ROSTER
    ROSTER = doc['weekdays']
    lines = []
    for block in doc['blocks']:
        if block['kind'] == 'prose':
            # A line carrying Japanese is a language dictionary; a line that
            # carries none -- a blank, a `**Type**: SECTION`, a rule row --
            # belongs to no language and stays a plain string. Chapter 6.2
            # requires the printed prose to be held per language, and this is
            # printed prose: it is the paragraphs BETWEEN the tables.
            lines.extend(text(x) for x in block['lines'])
        else:
            lines.extend(table(block))
    return '\n'.join(lines)


def schema_problems(doc):
    """Check the manuscript against settings.schema.json.

    Same soft dependency as erd_json_to_md.py: the schema is the portable
    description of the format, but a machine without a validator must still be
    able to build the specification. The checks below cover what a schema
    cannot say.
    """
    path = os.path.join(HERE, 'settings.schema.json')
    if not os.path.exists(path):
        return ['settings.schema.json is missing']
    try:
        import jsonschema
    except ImportError:
        say('NOTE     jsonschema is not installed, so settings.schema.json was'
            ' not enforced this run')
        return []
    schema = json.load(io.open(path, encoding='utf-8'))
    validator = jsonschema.Draft202012Validator(schema)
    out = []
    for e in sorted(validator.iter_errors(doc), key=lambda e: list(e.path)):
        # A message that quotes the offending value can be the whole table.
        # Whoever edits the manuscript needs the path, not a wall of JSON.
        message = e.message if len(e.message) <= 160 else e.message[:157] + '...'
        out.append('%s: %s' % ('/'.join(str(x) for x in e.path) or '(root)',
                               message))
    return out


ERD = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'erd.json')


def erd_column_types():
    """Every ERD column's printed type, keyed by column name.

    ⭐ Read here rather than typed out, for rule 03's reason: the type of a
    column has ONE source and it is docs/spec/_source/erd.json.
    """
    doc = json.load(io.open(ERD, encoding='utf-8'))
    out = {}
    for entity in doc['entities']:
        for column in entity['columns']:
            out.setdefault(column['name'], []).append(
                (entity['name'], column['type']))
    return out


def type_of(row):
    """The 型 cell of a settings row, however that row spells it."""
    value = row.get('type')
    if isinstance(value, dict):
        return value.get('ja')
    return value


def same_type(settings_type, erd_type):
    """Whether the two manuscripts are saying the same thing.

    ⛔ NOT string equality. The two tables print for different readers: the
    ERD's 型 column carries the classification AND its range in one token
    (整数（0〜359）), while the settings table puts the range in its own 下限 /
    上限 columns and prints only what is left (0〜359). ⭐ So the test is
    containment, in either direction, once the parentheses are gone.
    """
    if settings_type is None or erd_type is None:
        return True
    bare = erd_type.replace('（', '(').replace('）', ')')
    inner = bare[bare.find('(') + 1:bare.rfind(')')] if '(' in bare else ''
    head = bare[:bare.find('(')] if '(' in bare else bare
    return settings_type in (erd_type, head, inner)


def type_stated_twice(doc):
    """⛔ D-335: a value whose type is written in BOTH manuscripts.

    Measured 2026-09-06: three of the settings keys are also ERD columns, and
    one of the three -- themeHue -- already disagreed in wording while nothing
    compared them. This is the latch that would have caught it.

    ⚠️ IT DOES NOT REMOVE THE DUAL MANAGEMENT, and is not meant to look as if
    it does. The type still stands in two places; what changes is that the two
    can no longer drift in silence. Removing the second copy is the other
    repair D-335 records, and it is larger.
    """
    columns = erd_column_types()
    found = []
    for block in doc['blocks']:
        if block['kind'] != 'table':
            continue
        for row in block['rows']:
            key = (row.get('key') or '').strip('`')
            if key not in columns:
                continue
            settings_type = type_of(row)
            for entity, erd_type in columns[key]:
                if not same_type(settings_type, erd_type):
                    found.append(
                        '%s row %s: 型 is %r here and %r on %s.%s in erd.json '
                        '-- one value, two manuscripts, and they disagree '
                        '(ledger row D-335)'
                        % (block['id'], row['id'], settings_type, erd_type,
                           entity, key))
    return found


def problems(doc):
    """Everything that must hold before a single byte is written."""
    found = schema_problems(doc)
    if found:
        return found
    found.extend(type_stated_twice(doc))
    seen = set()
    for block in doc['blocks']:
        if block['kind'] != 'table':
            continue
        fields = [c['field'] for c in block['columns']]
        if len(set(fields)) != len(fields):
            found.append('%s: two columns map to one field' % block['id'])
        for row in block['rows']:
            if row['id'] in seen:
                found.append('%s: row %s appears twice' % (block['id'], row['id']))
            seen.add(row['id'])
            # Every column of the table has to have a cell, and no row may
            # carry a field its table does not print -- either way the printed
            # document would silently lose or gain a value.
            missing = [f for f in fields if f not in row]
            # `json` is metadata, not a printed cell: it states the machine
            # type for a row whose 型 column is written for a person (CR-175).
            extra = [f for f in row if f not in fields and f not in METADATA]
            if missing:
                found.append('%s row %s: no cell for %s'
                             % (block['id'], row['id'], ', '.join(missing)))
            if extra:
                found.append('%s row %s: %s is not a column of this table'
                             % (block['id'], row['id'], ', '.join(extra)))
    return found


def main():
    doc = json.load(io.open(SRC, encoding='utf-8'))
    found = problems(doc)
    if found:
        for p in found:
            say('  %s' % p)
        say('settings.json is not valid; nothing was written')
        return 1
    built = broken_prose(separate_tables(build(doc)))
    rel = os.path.relpath(OUT, os.path.dirname(os.path.dirname(HERE)))
    rel = rel.replace('\\', '/')
    if '--check' in sys.argv:
        current = io.open(OUT, encoding='utf-8', newline='').read()
        # The document is written with LF; read it the same way.
        current = current.replace('\r\n', '\n')
        if current != built:
            say('DRIFTED  %s no longer matches settings.json -- rerun '
                'settings_json_to_md.py' % rel)
            return 1
        say('OK       %s matches settings.json' % rel)
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(built)
    tables = [b for b in doc['blocks'] if b['kind'] == 'table']
    say('wrote %s  (%d tables, %d rows)'
        % (rel, len(tables), sum(len(t['rows']) for t in tables)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
