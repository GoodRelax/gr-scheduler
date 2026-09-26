# -*- coding: utf-8 -*-
"""published-entries.json -> docs/spec/_assets/tbl-published-entries.md

published-entries.json is the manuscript for table T-064 of Chapter 5.3 (the
names each component's public entry publishes, CR-581). EDIT THAT. This file
prints it as the document the specification carries, and
_assets/tbl-published-entries.md is a generated artifact: a hand edit to it is
overwritten, and --check catches one before it can be committed.

    python published_entries_json_to_md.py           rebuild the document
    python published_entries_json_to_md.py --check   exit 1 if the file differs

⭐ WHY A MANUSCRIPT (CR-581). The duplicate survey of 2026-09-26 found 128
accidental copies in src/, and 78 of them were stopped only because the
original was not published: publishing one name meant editing a cell of a
hand-written table in the specification, which meant a change request. With
the table printed from here, publishing a name is one entry in this file and
`npm run gen`.

⭐ ONE STRING IS ONE PRINTED LINE (the user's report, 2026-09-26). The
hand-written table broke a cell only after a full stop, so one printed line
held the end of one member's note and the start of the next, and the
parentheses of a note never closed on the line that opened them. So:

    - every member after the first starts a line of its own, opened by the
      full-width slash -- a line that does not open with one continues the
      member above it;
    - a member's `note` lines are printed inside ONE pair of full-width
      parentheses right after the name; the manuscript never writes those
      parentheses, nor a line-break tag -- each string is one line;
    - its `after` lines (why it was published) follow the closing
      parenthesis on a line of their own, except an `after` opening with a
      lone full stop, which stays on the parenthesis (PI-17);
    - a text piece (a piece that publishes no name) is printed as its lines.

The words are the ones the hand-written table held; only where the lines
break changed (CR-581 moved the table byte-identical first, then this).

⛔ REFUSED BEFORE A BYTE IS WRITTEN:

    a row id or a component written twice
    a member name written twice in one row
    an empty line, or a line that holds a line-break tag
    a text piece that check 26b would read as a published name
    whatever published-entries.schema.json refuses (when jsonschema is installed)

Check 26b counts a piece as a published name exactly when, line-break tags
dropped, it opens with one back-quoted identifier followed by nothing or a
full-width parenthesis -- which is what every member printed here opens with.

⛔ NO RULE IS PRINTED HERE. The MUST clauses about this table stand in
Chapter 5.3 of 05-07-design.md; this document prints the rows and says where
it came from.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), '_assets')
SRC = os.path.join(HERE, 'published-entries.json')
SCHEMA = os.path.join(HERE, 'published-entries.schema.json')
OUT = os.path.join(ASSETS, 'tbl-published-entries.md')

LANG = 'ja'
SLASH = chr(0xFF0F)          # opens every member after the first
OPEN = chr(0xFF08)           # the parentheses a note is printed inside
CLOSE = chr(0xFF09)
STOP = chr(0x3002)           # the lone full stop an `after` may open with
BR = '<br>'
# The same reading check 26b makes of one piece of the member cell.
PUBLISHED_NAME = re.compile(u'^`[A-Za-z_$][A-Za-z0-9_$]*`(?:$|' + OPEN + u')')


def say(message):
    """The Windows console is cp932 and these messages quote a manuscript
    holding marks it cannot encode, so write them through a replacing
    encoder rather than raise from inside the problem reporter."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def prose(cell):
    """The printed lines of one cell part, in this document's language."""
    return cell.get(LANG, [])


def piece_text(one):
    if 'text' in one:
        return BR.join(prose(one['text']))
    out = u'`%s`' % one['name']
    if 'note' in one:
        note = prose(one['note'])
        # A sentence ends a line (check 46), so a note whose last line ends
        # with a full stop closes its parenthesis on the next line.
        out += OPEN + BR.join(note) + (BR if note[-1].endswith(STOP) else u'') + CLOSE
    after = prose(one.get('after', {}))
    if after:
        out += (u'' if after[0] == STOP else BR) + BR.join(after)
    return out


def member_cell(members):
    return (BR + SLASH + u' ').join(piece_text(one) for one in members)


def schema_problems(doc):
    try:
        import jsonschema
    except ImportError:
        return []
    schema = json.load(io.open(SCHEMA, encoding='utf-8'))
    return ['schema: %s at /%s' % (e.message, '/'.join(str(p) for p in e.path))
            for e in jsonschema.Draft202012Validator(schema).iter_errors(doc)]


def problems(doc):
    found = schema_problems(doc)
    if found:
        return found
    t_id = doc['table']['id']
    seen_rows = set()
    seen_components = set()
    for row in doc['rows']:
        rid = row['id']
        if rid in seen_rows:
            found.append('%s is defined twice in table %s' % (rid, t_id))
        seen_rows.add(rid)
        if row['component'] in seen_components:
            found.append('%s: component %s already has a row' % (rid, row['component']))
        seen_components.add(row['component'])
        names = set()
        for one in row['members']:
            for part in ('note', 'after', 'text'):
                for line in prose(one.get(part, {})):
                    if not line.strip() or BR in line:
                        found.append('%s: %s has an empty line or a line-break '
                                     'tag in its %s -- one string is one line'
                                     % (rid, one.get('name', 'a text piece'), part))
            if 'name' in one:
                if one['name'] in names:
                    found.append('%s publishes %s twice' % (rid, one['name']))
                names.add(one['name'])
            elif PUBLISHED_NAME.match(piece_text(one)):
                found.append('%s: the text piece %r reads as a published name '
                             '-- write it as a member (name + note)'
                             % (rid, piece_text(one)[:40]))
    return found


def build(doc):
    """The document, as it is written out."""
    table = doc['table']
    t_id = table['id']
    columns = table['columns'][LANG]
    out = [
        u'# %s — 表 %s' % (prose(table['caption']), t_id),
        '',
        '**UID**: DOC-TBL-PUBLISHED-ENTRIES',
        '**Version**: 0.1',
        '',
        u'> ⛔ 本書は生成物である。  ',
        u'> 手で直さない —— 直しても次の `npm run gen` で消える。',
        u'> **公開インターフェースの唯一の正は `_source/published-entries.json` である。**  ',
        u'> 本書はそれを `_source/published_entries_json_to_md.py` が印字したものである。',
        u'> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`。',
        '',
        u'規則は `05-07-design.md` の 5.3 が持つ。  ',
        u'本書は 表 %s の全行を印字する。' % t_id,
        '',
        u'**表 %s — %s**' % (t_id, prose(table['caption'])),
        '',
        u'| %s |' % u' | '.join(columns),
        u'| %s |' % u' | '.join(['---'] * len(columns)),
    ]
    for row in doc['rows']:
        out.append(u'| %s | `%s` | `%s` | %s |' % (
            row['id'], row['layer'], row['component'], member_cell(row['members'])))
    return u'\n'.join(out) + u'\n'


def main():
    doc = json.load(io.open(SRC, encoding='utf-8'))
    found = problems(doc)
    if found:
        for p in found:
            say('  %s' % p)
        say('published-entries.json is not valid; nothing was written')
        return 1
    built = build(doc)
    rel = os.path.relpath(OUT, os.path.dirname(os.path.dirname(HERE)))
    rel = rel.replace('\\', '/')
    members = sum(1 for row in doc['rows'] for one in row['members'] if 'name' in one)
    texts = sum(1 for row in doc['rows'] for one in row['members'] if 'text' in one)
    counts = '%d row(s), %d member(s), %d text piece(s)' % (len(doc['rows']), members, texts)
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % rel)
            return 1
        current = io.open(OUT, encoding='utf-8', newline='').read()
        current = current.replace('\r\n', '\n')
        if current != built:
            say('DRIFTED  %s no longer matches published-entries.json -- rerun '
                'published_entries_json_to_md.py' % rel)
            return 1
        say('OK       %s matches published-entries.json (%s)' % (rel, counts))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(built)
    say('wrote %s  (%s)' % (rel, counts))
    return 0


if __name__ == '__main__':
    sys.exit(main())
