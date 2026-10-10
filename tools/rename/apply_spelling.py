# -*- coding: utf-8 -*-
"""Apply CR-730 (one spelling: American) to the live tree, in one pass.

change-request/CR-730-one-spelling-american-color-everywhere.md section 7
describes the tool; JDG-1921 / JDG-1925 (every British spelling, identifiers
included) and JDG-1924 (unanalysed -> unreliable) are the rulings it applies.

    PYTHONIOENCODING=utf-8 python tools/rename/apply_spelling.py --dry-run [--root <copy>]
    PYTHONIOENCODING=utf-8 python tools/rename/apply_spelling.py --apply [--root <copy>]
        [--collisions <tsv> | --skip-collisions] [--allow-unmapped]

Tables (built by docs/review/spelling-map-cr730.py from THIS module, so the
builder and the applier read the tree the same way):

  docs/review/spelling-map-cr730.tsv   old new kind files count collision
      one row per distinct name or word. The applier writes `new` for every
      token `old` it finds (a reviewer may edit `new`; new == old keeps it).
  docs/review/spelling-keep-cr730.tsv  path line text reason
      text '*'      the whole path (a prefix when it ends in '/') is not edited
      text '<url>'  every URL in that path ('*' = every path) is not edited
      other text    that literal, wherever it stands in that path, is not edited
                    (the line is where the builder saw it; it is not used)

How a file is changed: every token ([A-Za-z0-9_$] runs joined by hyphens) is
split into sub-words (camelCase / snake_case / kebab-case / digits) and each
British sub-word is replaced by its American form, the case kept per sub-word
(colour -> color, Colour -> Color, COLOUR -> COLOR). A token is looked up in
the map; a British token with no map row is UNMAPPED.

STOP -- it writes nothing when:
  * a token is unmapped (the tree moved since the map was built: rebuild the
    map, read the new rows, run again; or pass --allow-unmapped),
  * a COLLISION is found -- a British name whose American form is already a
    token of the same file (code), or a sibling key (JSON) -- and no decision
    for that (path, old) is in --collisions <tsv> (columns path, old, new;
    new = the name to write in that file, empty = as the map says). With
    --skip-collisions those (path, old) pairs are left British (rehearsal only),
  * a renamed path already exists,
  * the map gives two different `new` for one `old`.

It re-scans the tree on every run (no line numbers are replayed), so it can
run on a later tree, and it is idempotent: a second run finds nothing.

Never edited: the keep table's paths and literals, generated files (they
follow `npm run gen` / `npm run build`; a generated file whose PATH changes is
still moved), and every path outside rename_common.is_live plus EXTRA_LIVE.
Line endings: rename_common.read_text / write_text (majority wins).
"""
import argparse
import collections
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rename_common as rc  # noqa: E402

MAP_TSV = 'docs/review/spelling-map-cr730.tsv'
KEEP_TSV = 'docs/review/spelling-keep-cr730.tsv'
MAP_HEAD = ['old', 'new', 'kind', 'files', 'count', 'collision']
KEEP_HEAD = ['path', 'line', 'text', 'reason']
LANE_B = 'lane-B'

# Live beyond rename_common.LIVE_PREFIXES (the CR-708 scope did not need them).
EXTRA_LIVE = ('.claude/workflows/',)

# ------------------------------------------------------------------ the spelling rule

# family -> full match on a lower-case sub-word (the families of
# docs/review/british-spelling-survey-cr730.py, the survey the CR quotes).
FAMILIES = [
    ('colour', r'.*colour.*'),
    ('centre', r'.*(centre|centring).*'),
    ('grey', r'.*grey.*'),
    ('behaviour', r'.*behaviour.*'),
    ('-our', r'(un|dis)?(neighbour|honour|flavour|favour|labour|humour|rumour|harbour|vapour|'
             r'armour|endeavour|odour|vigour|rigour|savour|parlour)'
             r'(s|ed|ing|able|ably|ite|ites|hood|less|ful)?'),
    ('-ise', r'(un|re|de|non|over|under)?(minim|maxim|normal|summar|recogn|stabil|raster|serial|'
             r'deserial|parameter|local|capital|anonym|canonical|canon|author|general|initial|'
             r'linear|institutional|neutral|optim|quant|random|real|organ|visual|custom|priorit|'
             r'final|synchron|util|categor|special|material|memor|sanit|token|character|digit|'
             r'standard|central|item|penal|harmon|apolog|critic|emphas|colour|recolour|norm|'
             r'equal|regular|vector|binar|discret|factor|modern|optimal|personal|internal|'
             r'external|legal|fertil|steril|sympath|hospital|immun|mobil|symbol|scrutin|fantas|'
             r'subsid|vapor|agon|dramat|publici|theor|jeopard|pressur|patron|terror|polar|motor|'
             r'monopol)is(e|es|ed|ing|er|ers|ation|ations|able)'),
    ('-yse', r'(un|re)?(analys|paralys|catalys|electrolys|dialys)(e|ed|er|ers|ing)'),
    ('-lled', r'(un|re|pre)?(cancel|label|model|travel|level|signal|total|fuel|channel|tunnel|'
              r'dial|marshal|counsel|jewel|equal|initial|rival|shovel|snorkel|spiral|bevel|'
              r'chisel|duel|funnel|grovel|marvel|panel|pencil|quarrel|ravel|unravel|revel|'
              r'swivel|towel|yodel|kennel|libel|barrel|cudgel|enamel|gravel)l(ed|ing|er|ers)'),
    ('-re', r'(centi|milli|kilo)?(metre|litre|fibre|theatre|calibre|mitre|lustre|sombre|spectre|'
            r'meagre|sabre|manoeuvre)(s|d)?'),
    ('licence', r'licenc(e|es|ed|ing)'),
    ('other', r'(catalogue|catalogues|catalogued|programme|programmes|artefact|artefacts|'
              r'judgement|judgements|acknowledgement|acknowledgements|fulfil|fulfils|fulfilment|'
              r'enrol|enrols|enrolment|instalment|skilful|wilful|ageing|defence|offence|pretence|'
              r'practise|practised|spelt|burnt|learnt|dreamt|spilt|spoilt|whilst|amongst|cheque|'
              r'tyre|storey|aluminium|sceptic|sceptical|plough|analogue|focussed|focussing|'
              r'aeroplane|mould|moulded|kerb|draught)'),
]
FAMILIES = [(n, re.compile(rx)) for n, rx in FAMILIES]

# JDG-1924 (2026-10-10): the NAME unanalysed becomes unreliable, not unanalyzed.
OVERRIDES = {'unanalysed': 'unreliable'}

# whole-word replacements of the "other" and "-re" families (lower case)
WORDS = {
    'catalogue': 'catalog', 'catalogues': 'catalogs', 'catalogued': 'cataloged',
    'programme': 'program', 'programmes': 'programs', 'artefact': 'artifact',
    'artefacts': 'artifacts', 'judgement': 'judgment', 'judgements': 'judgments',
    'acknowledgement': 'acknowledgment', 'acknowledgements': 'acknowledgments',
    'fulfil': 'fulfill', 'fulfils': 'fulfills', 'fulfilment': 'fulfillment',
    'enrol': 'enroll', 'enrols': 'enrolls', 'enrolment': 'enrollment',
    'instalment': 'installment', 'skilful': 'skillful', 'wilful': 'willful',
    'ageing': 'aging', 'defence': 'defense', 'offence': 'offense', 'pretence': 'pretense',
    'practise': 'practice', 'practised': 'practiced', 'spelt': 'spelled', 'burnt': 'burned',
    'learnt': 'learned', 'dreamt': 'dreamed', 'spilt': 'spilled', 'spoilt': 'spoiled',
    'whilst': 'while', 'amongst': 'among', 'cheque': 'check', 'tyre': 'tire',
    'storey': 'story', 'aluminium': 'aluminum', 'sceptic': 'skeptic',
    'sceptical': 'skeptical', 'plough': 'plow', 'analogue': 'analog',
    'focussed': 'focused', 'focussing': 'focusing', 'aeroplane': 'airplane',
    'mould': 'mold', 'moulded': 'molded', 'kerb': 'curb', 'draught': 'draft',
    'manoeuvre': 'maneuver', 'manoeuvres': 'maneuvers',
}
RE_STEMS = re.compile(r'(metre|litre|fibre|theatre|calibre|mitre|lustre|sombre|spectre|'
                      r'meagre|sabre)(s|d)?$')
ISE = re.compile(r'is(e|es|ed|ing|er|ers|ation|ations|able)$')
YSE = re.compile(r'ys(e|ed|er|ers|ing)$')
LLED = re.compile(r'l(l)(ed|ing|er|ers)$')
OUR = re.compile(r'our')
CENTRE = (('centring', 'centering'), ('centred', 'centered'), ('centres', 'centers'),
          ('centre', 'center'))

SUB = re.compile(r'[A-Z]?[a-z]+|[A-Z]+(?![a-z])')
TOKEN = re.compile(r'[A-Za-z0-9_$]+(?:-[A-Za-z0-9_$]+)*')
CO_ORDINATE = re.compile(r'(?<![A-Za-z])(co|Co|CO)-(ordinat|ORDINAT)')
URL = re.compile(r'https?://[^\s<>"\'`)\]|]+')


def family_of(sub):
    low = sub.lower()
    for name, rx in FAMILIES:
        if rx.fullmatch(low):
            return name
    return None


def american_lower(low):
    """The American form of one British lower-case sub-word (unchanged if none)."""
    if low in OVERRIDES:
        return OVERRIDES[low]
    fam = family_of(low)
    if fam is None:
        return low
    if low in WORDS:
        return WORDS[low]
    new = low
    if 'colour' in new:
        new = new.replace('colour', 'color')
    for old, rep in CENTRE:
        if old in new:
            new = new.replace(old, rep)
            break
    new = new.replace('grey', 'gray').replace('behaviour', 'behavior')
    if fam == '-our':
        new = OUR.sub('or', new)
    if fam == '-ise' or (fam == 'colour' and ISE.search(new) and 'colouris' in low):
        new = ISE.sub(lambda m: 'iz' + m.group(1), new)
    if fam == '-yse':
        new = YSE.sub(lambda m: 'yz' + m.group(1), new)
    if fam == '-lled':
        new = LLED.sub(lambda m: 'l' + m.group(2), new)
    if fam == '-re':
        new = RE_STEMS.sub(lambda m: m.group(1)[:-2] + 'er' + ('ed' if m.group(2) == 'd'
                                                              else (m.group(2) or '')), new)
    if fam == 'licence':
        new = new.replace('licenc', 'licens')
    return new


def keep_case(old, low_new):
    if old.isupper() and len(old) > 1:
        return low_new.upper()
    if old[0].isupper():
        return low_new[0].upper() + low_new[1:]
    return low_new


def convert_sub(sub):
    new = american_lower(sub.lower())
    return sub if new == sub.lower() else keep_case(sub, new)


def is_british_token(token):
    if CO_ORDINATE.search(token):
        return True
    return any(convert_sub(s.group(0)) != s.group(0) for s in SUB.finditer(token))


def convert_token(token):
    """Sub-word by sub-word; everything that is not a letter run stays."""
    token = CO_ORDINATE.sub(lambda m: m.group(1) + m.group(2), token)
    return SUB.sub(lambda m: convert_sub(m.group(0)), token)


# ------------------------------------------------------------------ scope

def is_live(path):
    if path.startswith(EXTRA_LIVE):
        return path.endswith(rc.TEXT_EXTENSIONS)
    return rc.is_live(path)


GEN_EXTRA = re.compile(r'\bGenerated (from|by)\b|\bgenerated by\b')


def is_generated(path, text):
    """rename_common.is_generated, widened the way the CR-730 survey widened it:
    dist/, every JSON under src/, and the "Generated from" / "generated by"
    heads of the generators of this tree. A .ts file is never generated as a
    whole (generators print regions INTO hand-written files; they follow gen)."""
    if path.startswith('dist/') or (path.startswith('src/') and path.endswith('.json')):
        return True
    if path.endswith(('.py', '.ts')):
        return False
    if rc.is_generated(path, text):
        return True
    head = '\n'.join(text.split('\n')[:15])[:6000]
    return rc.MANUSCRIPT_MARKER not in head and bool(GEN_EXTRA.search(head))


def load_keep():
    rows = rc.read_tsv(KEEP_TSV)
    whole, literals, urls = [], collections.defaultdict(set), set()
    for row in rows:
        path, text = row.get('path', ''), row.get('text', '')
        if not path or not text:
            continue
        if text == '*':
            whole.append(path)
        elif text == '<url>':
            urls.add(path)
        else:
            literals[path].add(text)
    return whole, literals, urls


def kept_whole(path, whole):
    return any(path == w or (w.endswith('/') and path.startswith(w)) for w in whole)


def renamed_path(path):
    parts = path.split('/')
    out = [TOKEN.sub(lambda m: convert_token(m.group(0)) if is_british_token(m.group(0))
                     else m.group(0), p) for p in parts]
    return '/'.join(out)


def path_moves(files, whole):
    """Live paths (and generated ones inside the live prefixes) whose name changes."""
    moves = []
    for path in files:
        if kept_whole(path, whole) or not is_live(path):
            continue
        new = renamed_path(path)
        if new != path:
            moves.append((path, new))
    return moves


def history_components(files, whole):
    """Name parts (extension cut) of every tracked path that is NOT moved and
    holds a British sub-word: a live file that names one points at history
    (a landed CR, a sample folder) and must keep the British spelling."""
    found = set()
    for path in files:
        if is_live(path) and not kept_whole(path, whole):
            continue
        for part in path.split('/'):
            stem = part.rsplit('.', 1)[0] if '.' in part[1:] else part
            if any(is_british_token(m.group(0)) for m in TOKEN.finditer(stem)):
                found.add(stem)
    return found


# ------------------------------------------------------------------ scanning

def protected_spans(path, text, literals, urls, history):
    spans = []
    if path in urls or '*' in urls:
        spans += [(m.start(), m.end(), '<url>') for m in URL.finditer(text)]
    for lit in literals.get(path, set()) | literals.get('*', set()) | history:
        start = text.find(lit)
        while start >= 0:
            spans.append((start, start + len(lit), lit))
            start = text.find(lit, start + 1)
    return sorted(spans)


def covered(spans, start, end):
    for s, e, why in spans:
        if s > start:
            break
        if s <= start and end <= e:
            return why
    return None


IDENT_SHAPE = re.compile(r'_|[a-z][A-Z]|^[A-Z][a-z]+[A-Z]|^[A-Z0-9]+_')
FILE_AFTER = re.compile(r'\.(ts|tsx|js|mjs|py|json|md|html|css|svg|txt|drawio|sh)\b')


def kind_of(path, text, start, end, segments):
    token = text[start:end]
    ext = os.path.splitext(path)[1]
    if ext == '.json' and text[start - 1:start] == '"' and re.match(r'"\s*:', text[end:end + 4]):
        return 'json-key'
    if FILE_AFTER.match(text, end) or text[start - 1:start] == '/':
        return 'path'
    context = 'text'
    if segments is not None:
        context = 'code'
        for s, e, k in segments:
            if s > start:
                break
            if s <= start < e:
                context = k
                break
    elif ext in ('.html', '.css', '.svg', '.drawio'):
        context = 'string'
    if token.startswith(('data-', 'aria-')) or text[start - 2:start] == '--':
        return 'dom'
    if '-' in token and token == token.lower() and context == 'string':
        return 'dom'
    if IDENT_SHAPE.search(token) or context == 'code':
        return 'identifier'
    return 'prose'


Occ = collections.namedtuple('Occ', 'path start end old new kind')


def scan_text(path, text, literals, urls, history, with_kind=True):
    """(occurrences, kept): the British tokens of one file, and those the keep
    table protects (reason -> count)."""
    ext = os.path.splitext(path)[1]
    segments = None
    if with_kind and (ext in rc.CODE_EXTENSIONS or ext == '.py'):
        segments = rc.code_segments(text, ext, path)
    spans = protected_spans(path, text, literals, urls, history)
    occs, kept = [], collections.Counter()
    for m in TOKEN.finditer(text):
        token = m.group(0)
        if not is_british_token(token):
            continue
        why = covered(spans, m.start(), m.end())
        if why:
            kept[why] += 1
            continue
        kind = kind_of(path, text, m.start(), m.end(), segments) if with_kind else ''
        occs.append(Occ(path, m.start(), m.end(), token, convert_token(token), kind))
    return occs, kept


def code_tokens(text):
    return set(re.findall(r'[A-Za-z_$][A-Za-z0-9_$]*', text))


def json_sibling_collisions(text):
    """British keys whose American form is a key of the same object."""
    found = set()

    def walk(node):
        if isinstance(node, dict):
            keys = set(node.keys())
            for k in keys:
                if is_british_token(k) and convert_token(k) != k and convert_token(k) in keys:
                    found.add(k)
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)
    try:
        walk(json.loads(text))
    except ValueError:
        pass
    return found


def collisions_in(path, text, occs):
    """(old, new) pairs of one file that would merge two names."""
    out = set()
    if path.endswith('.json'):
        for k in json_sibling_collisions(text):
            out.add((k, convert_token(k)))
        return out
    ext = os.path.splitext(path)[1]
    if ext not in rc.CODE_EXTENSIONS and ext != '.py':
        return out
    tokens = code_tokens(text)
    for o in occs:
        if o.kind == 'identifier' and o.new != o.old and re.fullmatch(r'[A-Za-z_$][A-Za-z0-9_$]*', o.old) \
                and o.new in tokens:
            out.add((o.old, o.new))
    return out


def scan_tree(files, whole, literals, urls, history):
    """Every British token of the live, hand-edited tree."""
    live = [p for p in files if is_live(p) and not kept_whole(p, whole)
            and os.path.isfile(os.path.join(rc.ROOT, p))]
    rc.prime_lexer(live)
    result = {'occs': [], 'kept': collections.Counter(), 'generated': {}, 'collisions': {},
              'texts': {}}
    for path in live:
        try:
            text, crlf = rc.read_text(path)
        except UnicodeDecodeError:
            continue
        if is_generated(path, text):
            n = sum(1 for m in TOKEN.finditer(text) if is_british_token(m.group(0)))
            if n:
                result['generated'][path] = n
            continue
        occs, kept = scan_text(path, text, literals, urls, history)
        result['kept'].update(kept)
        if not occs:
            continue
        result['occs'] += occs
        result['texts'][path] = (text, crlf)
        col = collisions_in(path, text, occs)
        if col:
            result['collisions'][path] = col
    return result


# ------------------------------------------------------------------ applying

def load_map():
    rows = rc.read_tsv(MAP_TSV)
    table, errors, lane_b = {}, [], set()
    for row in rows:
        old, new = row['old'], row['new']
        if old in table and table[old] != new:
            errors.append('two new forms for %s: %s / %s' % (old, table[old], new))
        table[old] = new
        if row.get('collision', '').startswith(LANE_B):
            lane_b.add(old)
    return table, errors, lane_b


def load_decisions(path):
    if not path:
        return None
    full = path if os.path.isabs(path) else os.path.join(os.getcwd(), path)
    import io
    text = io.open(full, encoding='utf-8').read().replace('\r\n', '\n')
    lines = [l for l in text.split('\n') if l]
    head = lines[0].split('\t')
    out = {}
    for line in lines[1:]:
        cells = dict(zip(head, line.split('\t')))
        out[(cells['path'], cells['old'])] = cells.get('new', '')
    return out


def plan(result, table, decisions, skip_collisions, allow_unmapped):
    """{path: [(start, end, new)]} plus the reasons to stop."""
    stops, unmapped, edits, skipped = [], collections.Counter(), collections.defaultdict(list), 0
    for o in result['occs']:
        new = table.get(o.old)
        if new is None:
            unmapped[o.old] += 1
            if not allow_unmapped:
                continue
            new = o.new
        pair = (o.old, o.new)
        if pair in result['collisions'].get(o.path, ()):
            if decisions is not None and (o.path, o.old) in decisions:
                new = decisions[(o.path, o.old)] or new
            elif skip_collisions:
                skipped += 1
                continue
            else:
                stops.append('undecided collision %s: %s -> %s' % (o.path, o.old, o.new))
                continue
        if new != o.old:
            edits[o.path].append((o.start, o.end, new))
    if unmapped and not allow_unmapped:
        stops.append('%d unmapped tokens (%d distinct), e.g. %s' % (
            sum(unmapped.values()), len(unmapped), ', '.join(sorted(unmapped)[:12])))
    return edits, sorted(set(stops)), unmapped, skipped


def apply_edits(result, edits):
    changed = {}
    for path, spans in edits.items():
        text, crlf = result['texts'][path]
        out, at = [], 0
        for start, end, new in sorted(spans):
            out.append(text[at:start])
            out.append(new)
            at = end
        out.append(text[at:])
        changed[path] = (text, ''.join(out), crlf)
    return changed


def move(old, new):
    full_new = os.path.join(rc.ROOT, new)
    os.makedirs(os.path.dirname(full_new), exist_ok=True)
    if os.path.exists(os.path.join(rc.ROOT, '.git')):
        subprocess.run(['git', 'mv', old, new], cwd=rc.ROOT, check=True)
    else:
        os.rename(os.path.join(rc.ROOT, old), full_new)
    folder = os.path.dirname(os.path.join(rc.ROOT, old))
    while folder != rc.ROOT and os.path.isdir(folder) and not os.listdir(folder):
        os.rmdir(folder)
        folder = os.path.dirname(folder)


def report(result, edits, moves, unmapped, skipped, stops, out=sys.stdout):
    kinds = collections.Counter()
    names = collections.defaultdict(set)
    for o in result['occs']:
        kinds[o.kind] += 1
        names[o.kind].add(o.old)
    edit_count = sum(len(v) for v in edits.values())
    print('occurrences per kind (distinct tokens):', file=out)
    for k in sorted(kinds):
        print('  %-11s %6d  (%d)' % (k, kinds[k], len(names[k])), file=out)
    print('  path moves  %6d' % len(moves), file=out)
    print('edits %d in %d files; collisions left British (--skip-collisions) %d' % (
        edit_count, len(edits), skipped), file=out)
    print('kept by the keep table: %d (%s)' % (sum(result['kept'].values()), ', '.join(
        '%s %d' % (k if len(k) < 40 else k[:37] + '...', v)
        for k, v in result['kept'].most_common(8))), file=out)
    print('generated files skipped (they follow npm run gen / build): %d files, %d tokens' % (
        len(result['generated']), sum(result['generated'].values())), file=out)
    print('collisions: %d (path, old) pairs' % sum(len(v) for v in result['collisions'].values()),
          file=out)
    for path in sorted(result['collisions']):
        for old, new in sorted(result['collisions'][path]):
            print('  %s\t%s -> %s' % (path, old, new), file=out)
    if unmapped:
        print('unmapped: %d distinct' % len(unmapped), file=out)
    for s in stops:
        print('STOP: ' + s, file=out)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument('--dry-run', action='store_true')
    mode.add_argument('--apply', action='store_true')
    ap.add_argument('--root', help='another copy of the tree (relative to the current folder)')
    ap.add_argument('--collisions', help='TSV path old new: the decision per colliding (path, old)')
    ap.add_argument('--skip-collisions', action='store_true',
                    help='leave colliding (path, old) British (rehearsal only)')
    ap.add_argument('--allow-unmapped', action='store_true')
    args = ap.parse_args(argv)
    decisions = load_decisions(args.collisions)
    if args.root:
        rc.set_root(args.root)
    files = rc.git_files()
    whole, literals, urls = load_keep()
    if not whole:
        raise SystemExit('STOP: the keep table %s is empty or missing' % KEEP_TSV)
    table, map_errors, _lane_b = load_map()
    history = history_components(files, whole)
    result = scan_tree(files, whole, literals, urls, history)
    moves = path_moves(files, whole)
    edits, stops, unmapped, skipped = plan(result, table, decisions, args.skip_collisions,
                                           args.allow_unmapped)
    stops += map_errors
    unmapped_moves = [o for o, _n in moves if o not in table]
    if unmapped_moves and not args.allow_unmapped:
        stops.append('%d path moves have no map row, e.g. %s' % (
            len(unmapped_moves), ', '.join(unmapped_moves[:5])))
    moves = [(o, table.get(o, n)) for o, n in moves if table.get(o, n) != o]
    existing = set(files)
    stops += ['target exists: %s -> %s' % (o, n) for o, n in moves
              if n in existing or os.path.exists(os.path.join(rc.ROOT, n))]
    targets = collections.Counter(n for _o, n in moves)
    stops += ['two paths move to %s' % n for n, c in targets.items() if c > 1]
    report(result, edits, moves, unmapped, skipped, stops)
    if args.dry_run:
        return 1 if stops else 0
    if stops:
        print('nothing written', file=sys.stderr)
        return 2
    changed = apply_edits(result, edits)
    before = rc.syntax_errors(dict((p, t[0]) for p, t in changed.items()))
    after = rc.syntax_errors(dict((p, t[1]) for p, t in changed.items()))
    broke = sorted(p for p in after if after[p] != 0 and before.get(p) == 0)
    if broke:
        print('STOP: the edit breaks the syntax of %s; nothing written' % ', '.join(broke),
              file=sys.stderr)
        return 3
    for path, (_old, new, crlf) in changed.items():
        rc.write_text(path, new, crlf)
    for old, new in moves:
        move(old, new)
    print('written: %d files, %d moves' % (len(changed), len(moves)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
