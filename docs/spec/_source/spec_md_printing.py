# -*- coding: utf-8 -*-
"""The printing helpers the docs/spec/_assets/*.md generators share.

Every *_json_to_md.py beside this file prints one manuscript of this folder as
one document of docs/spec/_assets/. Before this module, each of them carried
its own copy of the helpers below -- the same code, with comments that had
drifted apart -- so a fix to one copy left the other tables printed the old
way. A generator imports what it needs from here; nothing here knows which
manuscript is being printed.

    say                 a console line that survives the cp932 console
    separate_tables     a blank line under every table
    broken_prose        every prose sentence on its own line (check 46)
    broken              every sentence of a table cell on its own line
    schema_problems     what a manuscript's hand-written schema refuses

This module writes nothing. Run a generator, not this file.
"""
import io
import json
import sys

STOP = u'。'
QUOTE_OPEN = u'「『'
QUOTE_SHUT = u'」』'


def say(message):
    """Print one line in whatever encoding the console takes.

    The Windows console is cp932 and the messages quote manuscripts holding
    marks it cannot encode. Writing them raw raised UnicodeEncodeError from
    inside the problem reporter, so a bad manuscript killed the run with a
    stack trace instead of naming the row.
    """
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def separate_tables(text):
    """A blank line between a table and whatever follows it.

    A line that is not a row but sits directly under one is absorbed into the
    table -- it renders as a row whose first cell is empty (check 48). The
    caption of table T-236 did exactly that.
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

    THE RULE (check 46): inside a table row a sentence break is written
    `<br>`. A row is one line, so this is the only break a cell can carry.

    A quotation is never split: a `<br>` inside a quotation would put a line
    break in the middle of a verbatim, which is what ruling JDG-05's check
    caught.
    """
    out = []
    quoted = 0
    for i, ch in enumerate(cell):
        out.append(ch)
        if ch in QUOTE_OPEN:
            quoted += 1
        elif ch in QUOTE_SHUT:
            quoted = max(0, quoted - 1)
        elif ch == STOP and not quoted:
            rest = cell[i + 1:]
            if rest.strip() and not rest.startswith('<br>'):
                out.append('<br>')
    return ''.join(out)


def schema_problems(doc, schema_path):
    """What the hand-written schema at schema_path refuses in doc, one line
    per refusal. Nothing when jsonschema is not installed."""
    try:
        import jsonschema
    except ImportError:
        return []
    schema = json.load(io.open(schema_path, encoding='utf-8'))
    return ['schema: %s at /%s' % (e.message, '/'.join(str(p) for p in e.path))
            for e in jsonschema.Draft202012Validator(schema).iter_errors(doc)]
