# -*- coding: utf-8 -*-
"""row-id-prefixes.json -> docs/spec/_assets/tbl-row-id-prefixes.md

row-id-prefixes.json is the manuscript for what a row-ID prefix MEANS. EDIT
THAT. This file prints it as the document the specification carries, and
_assets/tbl-row-id-prefixes.md is a generated artifact: a hand edit to it is
overwritten, and --check catches one before it can be committed.

    python row_id_prefixes_json_to_md.py           rebuild the document
    python row_id_prefixes_json_to_md.py --check   exit 1 if the file differs

⭐ THE MANUSCRIPT HOLDS NO ROSTER, and that is the whole point (CR-371). Which
prefixes exist, where each one is defined and how many rows it has are read on
every run out of THREE trees -- every `| XX-n |` row of their Markdown and the
表 caption it sits under. The manuscript holds the meanings, the walk holds the
numbers, and joining them IS the check:

    used by a tree, absent from the json        -> an unregistered prefix
    written in the json, used by no tree        -> a dead registration
    defined in two trees, undeclared            -> a collision
    declared a mirror, holding ids the owner
      never defined                             -> not a mirror

⛔ All of them exit 1. Nothing else checks this; `npm run gen:check` is where
it lands.

⛔⚠️ THE WALK COVERS THREE TREES BECAUSE THE DEFECT SPANS THEM. `PD-` named a
row of table T-023a AND an un-ruled decision of the ledger, and a register that
walked docs/spec alone could not see the second one: it would have reported
green on the very collision that cost the round of 2026-09-12, when a
classifier built on that spelling stripped three live pointers out of src/.

⭐ A MIRROR IS A TESTED CLAIM. The ledger records work about rows the
specification defines -- its UF-32 IS the specification's UF-32 -- so
`mirrored_in` is held against the ids: every id in the mirroring tree must be
one the owner defines. Measured 2026-09-12, that test separates the eight real
mirrors (AM IC IV MC MK OP PG UF, not one foreign id between them) from the
prefixes that mean two different things -- three that day (D, PD and R, with
494, 208 and 44 ids the specification never defined).

⭐ TWO SINCE 2026-09-13. CR-371 pulled PD's two meanings apart -- table
T-023a became `PTD-` (6 rows, owned by the spec) and the pending decisions
became `PND-` (212 rows, owned by records) -- so the spelling no longer
stands in two trees and neither half is foreign to the other. ⚠️ The 208
above was those 212 minus the 4 that stood in both trees, the ledger's four
lowest-numbered rows, which the press table numbered too; it reproduces from
the renamed rosters, which is what says the old measurement was read right.
D and R are held for a later CR (the user's ruling of 2026-09-13) and both
are still suppressed below.

⚠️ docs/spec/output/ is NOT walked. It is an untracked StrictDoc export: its
copies of the manuscripts would double every count and it goes stale between
runs.

⚠️ A ROW ID MAY BE WRAPPED. `| **`S-1`** |`, `| `S-1` |` and `| S-1 |` all
occur, and the number may carry a letter (`PTD-4a`). The pattern below matches
all of them and anchors on the FIRST cell, so a row that MENTIONS `MK-9a` in
its prose is not read as defining it.

⚠️ A CAPTION OWNS THE NEXT TABLE BLOCK, not every block that follows it. One
table of 01-04-requirements.md (the four SP rows under FR-083) carries no
caption at all, and taking the nearest caption above would have filed those
rows under 表 T-012, which belongs to SH. A captionless block is printed as
the requirement it sits under -- or, where there is no UID either (the ledger
and the rules number nothing), as the file it stands in -- instead of being
given someone else's number.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(SPEC))
ASSETS = os.path.join(SPEC, '_assets')
SRC = os.path.join(HERE, 'row-id-prefixes.json')
OUT = os.path.join(ASSETS, 'tbl-row-id-prefixes.md')

LANG = 'ja'

# The trees a row ID can be defined in: the key the manuscript writes, the
# folder it stands for, and the word the document prints for it.
TREES = [
    ('spec', 'docs/spec', u'仕様書'),
    ('records', 'docs/development-records', u'台帳'),
    ('rules', 'docs/development-rules', u'規則'),
]
TREE_WORD = dict((key, word) for key, _, word in TREES)

# Folders that are not manuscripts.
SKIP_DIRS = ('output', '__pycache__')

# The first cell of a table row, wrapped however the manuscripts wrap it.
ROW = re.compile(r'^\|\s*(?:\*\*)?`?([A-Z][A-Za-z]*)-(\d+[a-z]?)`?(?:\*\*)?\s*\|')
# 「**表 T-023a — ポインタを押したときの判定順序**」
CAPTION = re.compile(u'^\\*\\*表\\s+([A-Za-z0-9\\-]+)\\s*(?:—|--)')
# 「**UID**: FR-083」 -- what a captionless table is printed as.
UID = re.compile(r'^\*\*UID\*\*:\s*(\S+)')

JOIN = u' ／ '                       # the separator the tables join with
NO_TABLE = u'—'                     # an empty cell
PENDING_CELL = u'—（登録のみ）'    # registered, no rows yet

# The three trees, as the document names them.
TREE_LIST = JOIN.join(u'%s（`%s`）' % (word, tree)
                      for _, tree, word in TREES)


def say(message):
    """The same guard settings_json_to_md.py carries: the Windows console is
    cp932 and these messages quote a manuscript holding ⛔ and ⭐, so writing
    them raw raised UnicodeEncodeError from inside the problem reporter -- a
    bad manuscript killed the run with a stack trace instead of naming the
    prefix."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def manuscripts(tree):
    """Every Markdown file of one tree, minus the generated export."""
    out = []
    for base, dirs, names in os.walk(os.path.join(ROOT, *tree.split('/'))):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in sorted(names):
            if name.endswith('.md'):
                out.append(os.path.join(base, name))
    return sorted(out)


def read(path):
    """A manuscript's lines, whatever line ending it was written with."""
    return io.open(path, encoding='utf-8', newline='').read() \
        .replace('\r\n', '\n').split('\n')


def walk(tree):
    """One tree's roster: prefix -> {'tables': [...], 'rows': n, 'ids': set}.

    ⚠️ A fenced block is skipped. Chapter 5.3 draws its directory tree inside
    one and a line of it can start with `|`.
    """
    tables = {}
    rows = {}
    ids = {}
    for path in manuscripts(tree):
        where = os.path.relpath(path, ROOT).replace('\\', '/')
        pending = None          # a caption waiting for its table
        current = None          # the caption of the block being read
        uid = None
        in_block = False
        fenced = False
        for line in read(path):
            stripped = line.strip()
            if stripped.startswith('```'):
                fenced = not fenced
                continue
            if fenced:
                continue
            found = UID.match(stripped)
            if found:
                uid = found.group(1)
            found = CAPTION.match(stripped)
            if found:
                pending = found.group(1)
                in_block = False
                continue
            if stripped.startswith('|'):
                if not in_block:
                    in_block = True
                    if pending:
                        current = pending
                    elif uid:
                        current = 'UID:%s' % uid
                    else:
                        current = 'FILE:%s' % where
                    pending = None
                found = ROW.match(stripped)
                if found:
                    prefix = found.group(1)
                    rows[prefix] = rows.get(prefix, 0) + 1
                    ids.setdefault(prefix, set()).add(
                        '%s-%s' % (prefix, found.group(2)))
                    seen = tables.setdefault(prefix, [])
                    if current not in seen:
                        seen.append(current)
                continue
            if stripped:
                in_block = False
    return {p: {'tables': tables[p], 'rows': rows[p], 'ids': ids[p]}
            for p in rows}


def walk_all():
    """Every tree's roster, keyed by the name the manuscript writes."""
    return dict((key, walk(tree)) for key, tree, _ in TREES)


def where_used(rosters, prefix):
    """Which trees define rows of this prefix, in the order TREES lists."""
    return [key for key, _, _ in TREES if prefix in rosters[key]]


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


def tables_cell(entry, found):
    """Where the OWNER tree defines this prefix's rows.

    ⭐ READ FROM THE MANUSCRIPTS, never from the json. A prefix whose numbering
    is split over several tables prints all of them: that is one run of numbers
    divided by subject, not one spelling meaning several things.
    """
    if found is None:
        return PENDING_CELL if entry.get('pending') else NO_TABLE
    out = []
    for name in found['tables']:
        if name.startswith('UID:'):
            # A table with no caption. It is printed as the requirement it
            # sits under, because giving it the number above it would hand
            # these rows to a table that does not own them.
            out.append(u'—（`%s` の無題の表）' % name[4:])
        elif name.startswith('FILE:'):
            # No caption and no UID either -- the ledger and the rules number
            # nothing, so the file IS the locator.
            out.append('`%s`' % name[5:])
        else:
            out.append('`%s`' % name)
    return JOIN.join(out)


def spot(name):
    """One location, spelled for a MESSAGE rather than for the document.

    The walk marks a captionless block with `UID:` or `FILE:` so the printed
    cell can choose its wording; a problem message wants neither marker.
    """
    if name.startswith('UID:'):
        return 'an untitled table under %s' % name[4:]
    if name.startswith('FILE:'):
        return name[5:]
    return name


def spots(found):
    return ', '.join(spot(name) for name in found['tables'])


def rows_cell(entry, found):
    return '0' if found is None else str(found['rows'])


def owner_cell(entry, rosters, suppressed):
    """The tree that owns the prefix, and what else holds rows of it.

    ⭐ THE SUPPRESSED COLLISIONS ARE PRINTED HERE, not only in the manuscript:
    a debt nobody can see in the document is a debt nobody pays.
    """
    out = TREE_WORD[entry['owner']]
    extra = []
    for key in where_used(rosters, entry['prefix']):
        if key == entry['owner']:
            continue
        rows = rosters[key][entry['prefix']]['rows']
        if key in entry.get('mirrored_in', []):
            extra.append(u'%sにも %d 行。写しとして申告済み'
                         % (TREE_WORD[key], rows))
        else:
            extra.append(u'⛔ %sにも %d 行。別物であり、'
                         u'%s から抑止している'
                         % (TREE_WORD[key], rows,
                            suppressed[entry['prefix']]['since']))
    if extra:
        out += u'（%s）' % u'、'.join(extra)
    return out


def build(doc, rosters, suppressed):
    """The document, as it is written out."""
    out = [
        '# 行 ID の接頭辞 — 登録簿',
        '',
        '**UID**: DOC-TBL-ROW-ID-PREFIXES',
        '**Version**: 0.2',
        '',
        '> ⛔ 本書は生成物である。手で直さない —— 直しても次の `npm run gen` で消える。',
        '> **行 ID の接頭辞の唯一の正は `_source/row-id-prefixes.json` である。**'
        ' 本書はそれを `_source/row_id_prefixes_json_to_md.py` が印字したものである。',
        '> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`。',
        '',
        '本書は表の行 ID の接頭辞の全数である。'
        '`1.9 Notation` がここを指す。',
        '',
        '⭐ **`接頭辞` `元の語` `何を指すか` `持ち主` は原稿（`_source/row-id-prefixes.json`）が持ち、'
        '`定義する表` と `行数` は生成のたびに文書の木を歩いて数える。**'
        ' 原稿は員数を持たない —— 持たせると、表が動いたときに黙ってずれる側ができる。',
        '',
        '⭐ **歩く木は 3 つである** —— %s。'
        '⛔ **1 つでは足りない** —— 同じ綴りが仕様書と台帳で別のものを指す形こそが、'
        '本登録簿の作られた理由だからである。' % TREE_LIST,
        '',
        '⛔ **次の 4 つを `npm run gen` が拒む（MUST）。** 別の検査は無い。',
        '',
        '| # | 拒むもの |',
        '| --- | --- |',
        '| 1 | 木が使っていて、登録の無い接頭辞 |',
        '| 2 | 登録が在って、どの木も使っていない接頭辞 |',
        '| 3 | 2 つ以上の木が行を定義していて、写しとして申告されていない接頭辞 |',
        '| 4 | 写しと申告しながら、持ち主が定義していない綴りを持つ接頭辞 |',
        '',
        '⭐ **「写し」は申告ではなく検査である。**'
        '台帳が持ち主の行について記録を書くとき、その綴りは持ち主が定義したものに限る。'
        '1 つでも持ち主の知らない綴りを持てば、それは写しではなく別物である。',
        '',
        '⚠️ **`元の語` が空の行は、綴りの由来を文書から読み取れなかったことを言う。**'
        ' 推測で埋めてはならない（MUST NOT） —— もっともらしい展開は、本登録簿が取り除こうとしている誤りそのものである。',
        '',
        '⚠️ **`定義する表` が「登録のみ」の行は、行が書かれる前に登録した接頭辞である。**'
        ' 死んだ登録としては数えない。',
        '',
        '**行 ID の接頭辞**',
        '',
        '| 接頭辞 | 元の語 | 何を指すか | 持ち主 | 定義する表 | 行数 |',
        '| --- | --- | --- | --- | --- | --- |',
    ]
    for entry in doc['prefixes']:
        found = rosters[entry['owner']].get(entry['prefix'])
        out.append('| `%s` | %s | %s | %s | %s | %s |' % (
            entry['prefix'],
            entry['words'] or NO_TABLE,
            broken(entry['means'][LANG]),
            owner_cell(entry, rosters, suppressed),
            tables_cell(entry, found),
            rows_cell(entry, found),
        ))
    out.append('')
    out.extend(suppression_block(doc, rosters))
    return '\n'.join(out)


def suppression_block(doc, rosters):
    """The collisions the register is holding open, printed in full.

    ⛔ A DEBT, NOT A PERMISSION. Each one names the day it was written and what
    removes it, so a reader can count them and see that the count is not
    supposed to stay where it is.
    """
    held = doc.get('collisions_suppressed', [])
    if not held:
        return []
    out = [
        '**⛔ 抑止している衝突 —— %d 件**' % len(held),
        '',
        '同じ綴りが 2 つの木で別のものを指しており、'
        'まだ直っていないものである。'
        '⛔ **これは借りであって、許可ではない。**'
        ' 直った日に原稿から消す —— 消し忘れは、衝突が解けた時点で生成器が赤にする。',
        '',
        '| 接頭辞 | 立っている木 | 行数 | いつから | なぜ | 何が外すか |',
        '| --- | --- | --- | --- | --- | --- |',
    ]
    for item in held:
        counts = []
        for key in item['trees']:
            rows = rosters[key].get(item['prefix'], {}).get('rows', 0)
            counts.append('%s %d' % (TREE_WORD[key], rows))
        out.append('| `%s` | %s | %s | %s | %s | %s |' % (
            item['prefix'],
            JOIN.join(TREE_WORD[k] for k in item['trees']),
            JOIN.join(counts),
            item['since'],
            broken(item['why'][LANG]),
            broken(item['until'][LANG]),
        ))
    out.append('')
    return out


def problems(doc, rosters, suppressed):
    """Everything that must hold before a single byte is written.

    ⛔ These messages ARE the check CR-371 asked for. Each names the prefix and
    says which side is wrong, because the repair differs: an unregistered
    prefix needs a meaning written, a dead registration needs the entry struck,
    a collision needs a rename or a ruling, and a false mirror needs the claim
    withdrawn.
    """
    found = []
    seen = set()
    for entry in doc['prefixes']:
        prefix = entry['prefix']
        if prefix in seen:
            found.append('%s is registered more than once' % prefix)
        seen.add(prefix)
        if LANG not in entry.get('means', {}):
            found.append('%s has no means cell in %s' % (prefix, LANG))
        owner = entry.get('owner')
        if owner not in TREE_WORD:
            found.append('%s names an owner tree nobody walks: %r' % (prefix, owner))
            continue
        used = where_used(rosters, prefix)
        if entry.get('pending'):
            if used:
                found.append(
                    '%s is marked pending but %s -- strike the flag, the wave '
                    'it was waiting for has landed'
                    % (prefix, ' and '.join(
                        '%s already defines %d row(s) of it (%s)'
                        % (key, rosters[key][prefix]['rows'],
                           spots(rosters[key][prefix]))
                        for key in used)))
            continue
        if not used:
            found.append(
                '%s is registered and no tree uses it -- a dead registration. '
                'Strike it, or mark it "pending": true if its rows are still '
                'to be written' % prefix)
            continue
        if owner not in used:
            found.append(
                '%s is registered as owned by %s, which defines no row of it; '
                'its rows stand in %s. Point `owner` at the tree that defines '
                'them' % (prefix, owner, ', '.join(used)))
        mirrors = entry.get('mirrored_in', [])
        for key in mirrors:
            if key not in TREE_WORD:
                found.append('%s claims a mirror in a tree nobody walks: %r'
                             % (prefix, key))
            elif key == owner:
                found.append('%s names its own owner as a mirror' % prefix)
            elif key not in used:
                found.append(
                    '%s is declared mirrored in %s, which holds no row of it '
                    '-- a dead mirror declaration. Strike it' % (prefix, key))
            else:
                # ⭐ THE MIRROR IS TESTED, not believed: a tree that records
                # the owner's rows may not hold a spelling the owner never
                # wrote. This is what tells a record apart from a collision.
                theirs = rosters[key][prefix]['ids']
                ours = rosters[owner][prefix]['ids'] if owner in used else set()
                foreign = sorted(theirs - ours)
                if foreign:
                    found.append(
                        '%s is declared a mirror in %s, but %d of its %d '
                        'id(s) there are ones %s never defines (%s%s) -- that '
                        'is not a record of the owner\'s rows, it is a second '
                        'meaning. Withdraw the claim and rule the collision'
                        % (prefix, key, len(foreign), len(theirs), owner,
                           ', '.join(foreign[:4]),
                           ', ...' if len(foreign) > 4 else ''))
        for key in used:
            if key == owner or key in mirrors:
                continue
            if prefix in suppressed and key in suppressed[prefix]['trees']:
                continue
            found.append(
                '%s is defined in %s (%d row(s)) as well as in %s (%d row(s)) '
                'and %s declares neither a mirror nor a suppression -- one '
                'spelling, two meanings, which is the defect this register '
                'exists to catch. Declare "mirrored_in" if %s only records '
                'what %s defines, and rule the collision if it does not'
                % (prefix, key, rosters[key][prefix]['rows'], owner,
                   rosters[owner][prefix]['rows'] if owner in used else 0,
                   prefix, key, owner))
    for key, _, _ in TREES:
        for prefix in sorted(rosters[key]):
            if prefix not in seen:
                found.append(
                    '%s is used by %s (%d row(s) in %s) and is registered '
                    'nowhere -- an unregistered prefix. Add it to '
                    'row-id-prefixes.json with what its letters stand for and '
                    'what it indexes'
                    % (prefix, key, rosters[key][prefix]['rows'],
                       spots(rosters[key][prefix])))
    for item in doc.get('collisions_suppressed', []):
        prefix = item['prefix']
        if prefix not in seen:
            found.append('%s is suppressed as a collision and is not '
                         'registered at all' % prefix)
            continue
        still = [k for k in item['trees'] if prefix in rosters[k]]
        if len(still) < 2:
            found.append(
                '%s is held as a suppressed collision, but it no longer '
                'stands in two of the named trees (%s). The suppression has '
                'outlived its reason -- strike it'
                % (prefix, ', '.join(still) or 'none'))
    return found


def main():
    doc = json.load(io.open(SRC, encoding='utf-8'))
    rosters = walk_all()
    suppressed = dict((item['prefix'], item)
                      for item in doc.get('collisions_suppressed', []))
    found = problems(doc, rosters, suppressed)
    if found:
        for p in found:
            say('  %s' % p)
        say('the documents and row-id-prefixes.json disagree; '
            'nothing was written')
        return 1
    built = broken_prose(separate_tables(build(doc, rosters, suppressed)))
    rel = os.path.relpath(OUT, ROOT).replace('\\', '/')
    counted = ', '.join(
        '%s %d/%d' % (key, len(rosters[key]),
                      sum(r['rows'] for r in rosters[key].values()))
        for key, _, _ in TREES)
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % rel)
            return 1
        current = io.open(OUT, encoding='utf-8', newline='').read()
        # The document is written with LF; read it the same way.
        current = current.replace('\r\n', '\n')
        if current != built:
            say('DRIFTED  %s no longer matches row-id-prefixes.json or the '
                'documents it counts -- rerun row_id_prefixes_json_to_md.py'
                % rel)
            return 1
        say('OK       %s matches row-id-prefixes.json (%d registered; '
            'prefixes/rows walked: %s; %d collision(s) suppressed)'
            % (rel, len(doc['prefixes']), counted, len(suppressed)))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(built)
    say('wrote %s  (%d registered; prefixes/rows walked: %s; '
        '%d collision(s) suppressed)'
        % (rel, len(doc['prefixes']), counted, len(suppressed)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
