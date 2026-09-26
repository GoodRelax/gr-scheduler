# -*- coding: utf-8 -*-
"""verification.json -> docs/spec/_assets/tbl-verification.md

verification.json is the manuscript for tables T-334 and T-218 of Chapter 7.
EDIT THAT. This file prints it as the document the specification carries, and
_assets/tbl-verification.md is a generated artifact: a hand edit to it is
overwritten, and --check catches one before it can be committed.

    python verification_json_to_md.py           rebuild the document
    python verification_json_to_md.py --check   exit 1 if the file differs

⭐ ONE MANUSCRIPT FOR TWO TABLES, AND THE LINK IS WRITTEN ONCE (JDG-607,
CR-573). A row of table T-334 names the rows of table T-218 that verify it
(`verifiedBy`). Table T-218's 確かめるもの column is NOT in the manuscript: it
is derived here, on every run, from those links -- so the two tables cannot
disagree about which place verifies what.

⛔ REFUSED BEFORE A BYTE IS WRITTEN:

    a T-334 row naming a TS id table T-218 does not define
    a row id written twice in either table
    whatever verification.schema.json refuses (when jsonschema is installed)

⛔ NO RULE IS PRINTED HERE. The MUST clauses about these tables stand in
Chapter 7 of 05-07-design.md, where check 39 counts them; this document prints
the rows and says where it came from.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), '_assets')
SRC = os.path.join(HERE, 'verification.json')
SCHEMA = os.path.join(HERE, 'verification.schema.json')
OUT = os.path.join(ASSETS, 'tbl-verification.md')

LANG = 'ja'
NONE_CELL = u'——'           # the empty cell the table has always printed
JOIN = u' ／ '               # the separator the tables join with


def say(message):
    """The same guard settings_json_to_md.py carries: the Windows console is
    cp932 and these messages quote a manuscript holding ⛔ and ⭐, so writing
    them raw raised UnicodeEncodeError from inside the problem reporter."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def prose(cell):
    """One printed cell, in this document's language."""
    return cell.get(LANG, '')


STOP = u'。'
QUOTE_OPEN = u'「『'
QUOTE_SHUT = u'」』'


def separate_tables(text):
    """A blank line between a table and whatever follows it.

    A line that is not a row but sits directly under one is absorbed into the
    table -- it renders as a row whose first cell is empty (check 48).
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
    a closer may not START a line. A quotation is never split.
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
    `<br>`. A row is one line, so this is the only break a cell can carry, and
    a quotation is never split.
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


def code(value):
    """A value the table prints as code, or the empty cell."""
    return NONE_CELL if value is None else '`%s`' % value


def plain(value):
    return NONE_CELL if value is None else value


def verified_by(doc):
    """TS id -> the T-334 row ids naming it, in T-334's own order."""
    out = {}
    for row in doc['targets']['rows']:
        for place in row['verifiedBy']:
            out.setdefault(place, []).append(row['id'])
    return out


def verifies_cell(place, links, targets_id):
    """Table T-218's 確かめるもの column: the derived links, then the note."""
    parts = [u'表 %s の `%s`' % (targets_id, rid) for rid in links.get(place['id'], [])]
    if 'alsoVerifies' in place:
        parts.append(prose(place['alsoVerifies']))
    return JOIN.join(parts) if parts else NONE_CELL


def build(doc):
    """The document, as it is written out."""
    targets = doc['targets']
    places = doc['places']
    t_id = targets['table']['id']
    p_id = places['table']['id']
    links = verified_by(doc)
    out = [
        u'# 確かめるものと試験の置き場 — 表 %s・表 %s' % (t_id, p_id),
        '',
        '**UID**: DOC-TBL-VERIFICATION',
        '**Version**: 0.1',
        '',
        u'> ⛔ 本書は生成物である。手で直さない —— 直しても次の `npm run gen` で消える。',
        u'> **確かめるものと試験の置き場の唯一の正は `_source/verification.json` である。**'
        u' 本書はそれを `_source/verification_json_to_md.py` が印字したものである。',
        u'> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`。',
        '',
        u'規則は `05-07-design.md` の Chapter 7 が持つ。'
        u'本書は 2 つの表の全数を印字する。',
        '',
        u'⭐ **表 %s の `確かめるもの` の欄は原稿に無い** —— 表 %s の各行が名指す系統から、'
        u'生成のたびに引く。'
        u'⛔ 表 %s に無い系統を 表 %s の行が名指すと、`npm run gen` が何も書かずに止まる。'
        % (p_id, t_id, p_id, t_id),
        '',
        u'**表 %s — %s**' % (t_id, prose(targets['table']['caption'])),
        '',
        u'| 行 ID | 確かめるもの | 全数を持つ所 | 1 件の単位 | 系統（表 %s） | 走らせ方 |' % p_id,
        '| --- | --- | --- | --- | --- | --- |',
    ]
    for row in targets['rows']:
        out.append('| %s | %s | %s | %s | %s | %s |' % (
            row['id'],
            broken(prose(row['what'])),
            broken(prose(row['population'])),
            broken(prose(row['unit'])),
            JOIN.join('`%s`' % place for place in row['verifiedBy']),
            broken(prose(row['howRun'])),
        ))
    out.extend([
        '',
        u'**表 %s — %s**' % (p_id, prose(places['table']['caption'])),
        '',
        u'| 行 ID | 系統 | 確かめるもの | 親に取るもの | テストレベル | 置き場 | ツール |',
        '| --- | --- | --- | --- | --- | --- | --- |',
    ])
    for place in places['rows']:
        out.append('| %s | %s | %s | %s | %s | %s | %s |' % (
            place['id'],
            broken(prose(place['kind'])),
            broken(verifies_cell(place, links, t_id)),
            code(place['parent']),
            plain(place['level']),
            code(place['folder']),
            place['tool'],
        ))
    out.append('')
    return '\n'.join(out)


def schema_problems(doc):
    """Soft dependency, as in state_machines_json_to_md.py: a machine without
    a validator must still be able to build the specification."""
    try:
        import jsonschema
    except ImportError:
        say('NOTE     jsonschema is not installed, so verification.schema.json'
            ' was not enforced this run')
        return []
    schema = json.load(io.open(SCHEMA, encoding='utf-8'))
    validator = jsonschema.Draft202012Validator(schema)
    out = []
    for e in sorted(validator.iter_errors(doc), key=lambda e: list(e.path)):
        message = e.message if len(e.message) <= 160 else e.message[:157] + '...'
        out.append('%s: %s' % ('/'.join(str(x) for x in e.path) or '(root)',
                               message))
    return out


def problems(doc):
    """What would make the printed document wrong, named by row."""
    found = schema_problems(doc)
    if found:
        return found
    t_id = doc['targets']['table']['id']
    p_id = doc['places']['table']['id']
    defined = []
    for place in doc['places']['rows']:
        if place['id'] in defined:
            found.append('%s is defined twice in table %s' % (place['id'], p_id))
        defined.append(place['id'])
    seen = set()
    for row in doc['targets']['rows']:
        if row['id'] in seen:
            found.append('%s is defined twice in table %s' % (row['id'], t_id))
        seen.add(row['id'])
        for place in row['verifiedBy']:
            if place not in defined:
                found.append(
                    '%s of table %s names %s, which table %s does not define '
                    '-- add the place to `places`, or name one that exists'
                    % (row['id'], t_id, place, p_id))
    return found


def main():
    doc = json.load(io.open(SRC, encoding='utf-8'))
    found = problems(doc)
    if found:
        for p in found:
            say('  %s' % p)
        say('verification.json is not valid; nothing was written')
        return 1
    built = broken_prose(separate_tables(build(doc)))
    rel = os.path.relpath(OUT, os.path.dirname(os.path.dirname(HERE)))
    rel = rel.replace('\\', '/')
    counts = '%d + %d row(s)' % (len(doc['targets']['rows']),
                                 len(doc['places']['rows']))
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % rel)
            return 1
        current = io.open(OUT, encoding='utf-8', newline='').read()
        current = current.replace('\r\n', '\n')
        if current != built:
            say('DRIFTED  %s no longer matches verification.json -- rerun '
                'verification_json_to_md.py' % rel)
            return 1
        say('OK       %s matches verification.json (%s)' % (rel, counts))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(built)
    say('wrote %s  (%s)' % (rel, counts))
    return 0


if __name__ == '__main__':
    sys.exit(main())
