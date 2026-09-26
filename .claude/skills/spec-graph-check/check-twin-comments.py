# -*- coding: utf-8 -*-
"""Check 70 -- the registry of copy comments in src/ does not grow.

WHAT IT CATCHES

A comment block in `src/**/*.ts` that CLAIMS the code below it is a copy of
code elsewhere, or must be kept equal to it: "a copy of X", "repeats X",
"mirrors", "the same walk as", "change both together", "keep in step with",
"must match", "must spell it the same", "also spelled in", "the translator's
PressRow again", "a change to ED-1 must be copied here by hand". Every such
claim present today is held, one record each, in
`twin-comments-baseline.txt` -- the registry. The run is GREEN when the claims
found are EXACTLY the ones held, RED when a claim appears that is not held,
and RED when a held record's claim is gone. The shape is check 26b's
(`published-members-baseline.txt`).

⛔ A new copy comment is not fixed by registering it. The fix is to publish the
original through its component's public entry (a table T-064 row when the
member is not published yet) and import it; a copy inside one component is
folded into one file. The registry may only SHRINK without the user's OK --
adding a record needs the user's decision behind it, exactly as a new line in
any other baseline here does.
⛔ A paid debt must leave the file: when a copy is folded and its comment
deleted, the record's claim is no longer found and the run goes red until the
record is deleted in the same change.

Three sorts are held, written by hand on each record:
    copy       a deliberate copy of code elsewhere (a function, a type, a map,
               a constant, an inverse of an arithmetic)
    spec-copy  a hand copy of a specification table (a generator's job)
    coupling   two different pieces of code that must agree (a spelling, a
               BOM contract, a column list), not one piece written twice

⭐ WHAT A CLAIM IS -- the CLAIM regex below minus the NOT_A_CLAIM regex, asked
of each comment FORM separately. A form opens at a line of a comment block
starting with a head of check 55 (`see <ID>`, `TRAP:`, `WHY:`, `STOP:`,
`DEVIATION:`, an `@tag`) and runs to the next head or an empty comment line;
a block is a run of full-line comments on consecutive lines, and a trailing
comment is a block of its own. The phrases were tuned by reading every hit,
and a generous pass (copy / twin / mirror / same / together / spell / keep /
must stay / again / ...) was read by hand for misses. Excluded on purpose:
"writes it twice", "walk a copy of the Map", "copy, do not cast", "the
vertical twin", "a referenced twin", "names its twin", "same-as word",
"asks again", "the two spellings drift apart" (a warning NOT to copy), "as
anchorsOf does" (an imitation with no demand to stay equal), and contracts
that only say one side relies on the other ("item-hit-area.ts reads the first
one only") with no demand that two places stay equal.

⭐ THE KEY survives a file being split or moved and lines shifting, because
src/framework/single-html-shell/frame-loop.ts,
src/adapter/input-command-translator/input-command-translator.ts and
src/adapter/document-codec/mspdi-codec.ts are about to be split:

    <symbol> :: <the first 10 words of the claim's form>

  symbol  the declaration the comment sits on, qualified by the named
          declarations enclosing it (`rowAnchorAt.slab`). When the comment sits
          on a statement, not a declaration, it is the enclosing chain alone
          (`isOpenOneLevelArmed`); at the top of a file with no declaration
          below, `(top)`. Found by indentation on the lexed code, so a
          multi-line signature is read through its closing `): T {` line.
  words   the form's text, head (`TRAP:` / `WHY:` ...) dropped, split on
          anything not [A-Za-z0-9], lower-cased, the first 10 kept.

  Never the line number and never the file path; file:line is printed as
  information only. ⚠️ Renaming the declaration, or rewording the first ten
  words, changes the key: the run goes red twice (a new claim, a held one
  gone), and the record is re-keyed by hand in the same change.

  Collisions: when two claims share a key, each takes ALL of its form's words
  instead of ten; when those still agree, ` #1`, ` #2` ... are appended in the
  order of (file path, line). Neither case occurs on today's tree.

WHAT IT CANNOT SEE

  - A copy nobody commented on. The survey's compareDay / compareDays pair
    (input-command-translator.ts and calendar-day.ts) says nothing, so it is
    invisible here; check 45 and a symbol-level duplicate finder are the
    tools for that.
  - A claim in words the regex does not know. The phrases are the ones today's
    tree uses; a new copy comment written in a fresh idiom passes. A reviewer
    who meets one adds the phrase here, not a record to the baseline.
  - Whether the twin a record names still exists and still agrees. The
    `twin:` field is read only to print a NOTE when a `path#symbol` twin cannot
    be found and is not marked `stale`; token equality is out of scope.

MEASURED on this tree (160 files under src/, 2026-09-26, at 0ad572f6): 50
claims -- 36 copy, 2 spec-copy, 12 coupling; 5 of the named twins are stale
(gone, moved or renamed). The prototype's regex found 37 here, as it did on an
older tree (32 / 2 / 3); the 13 added are 4 copies it could not phrase (an
inverse, "must stay the set", a constant "change with NOT_DRAWN", a same-file
box "the same box and barOf call as") and 9 couplings (6 spelling contracts,
a column list, a tool that must read a list the same way, a threshold kept
per axis). One run takes about 0.3 s (0.29 s measured; lexing 160 files with
check 55's lexer).

    python check-twin-comments.py              check against the registry
    python check-twin-comments.py --list       every claim found, file:line and key
    python check-twin-comments.py --self-test  break a tree held in memory

Run with PYTHONIOENCODING=utf-8 from the repository root.

The comment lexer is check 55's own (`check-comment-rules.py`, `lex`), loaded
by file path, so the two checks agree on what a comment is and neither holds
a copy of it.
"""
import importlib.util
import io
import os
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
BASELINE = os.path.join(HERE, 'twin-comments-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/twin-comments-baseline.txt'
SORTS = ('copy', 'spec-copy', 'coupling')
KEY_WORDS = 10


def _comment_rules():
    """Check 55's module, so its lexer is used and not imitated."""
    spec = importlib.util.spec_from_file_location(
        'check_comment_rules', os.path.join(HERE, 'check-comment-rules.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


LEX = _comment_rules().lex

# ⭐ The net. Each alternative is a phrase today's tree uses to say "this is a
# copy of, or must stay equal to, code elsewhere". Read every hit before
# widening it: a noisy ratchet gets harmless comments reworded instead of
# copies removed.
CLAIM = re.compile(
    r"(copy of|copies of|copied here|\brepeats\b|\bmirrors?\b|\btwin\b|"
    r"same (walk|tests?|predicate|join|map|mapping|clearing|overhang|width|"
    r"boundary|denominator|tiers|half|base half|slab)\b|"
    r"same box and \w+ call as|"
    r"change (both|all \w+|them) together|change both|change all|"
    r"change together with|change with \w+ in|"
    r"keep in step|in step with|must match|exactly as \w+ does|rounds as|"
    r"holds this join|inverts this|must stay the set|"
    r"must spell it the same|also spelled in|spelled as \S+ delivers|"
    r"must \w+ it the same way|keep this [\w ]{0,20}as \w+ reads|"
    r"\w+'s \w+( and \w+)? again\b|\w+'s \w+ plus\b)", re.I)

# ⛔ Phrases that trip CLAIM and are not claims. Asked of the same form only,
# so an exclusion in one form of a block never hides a claim in another.
NOT_A_CLAIM = re.compile(
    r"(walk a copy|copy, do not cast|referenced twin|writes? (it|each) twice|"
    r"second copy of that row|a copy would stop|pasted|paste|vertical twin|"
    r"repeats its|names its twin|same-as word)", re.I)

# The heads of check 55 that open a new form inside a block.
HEAD = re.compile(r'^(see\s+[A-Z]{1,4}-[0-9]|TRAP:|WHY:|STOP:|DEVIATION:|@)')
HEAD_WORD = re.compile(r'^(TRAP|WHY|STOP|DEVIATION):\s*')
LEADER = re.compile(r'^\s*(?://+|/\*\*?|\*(?!/))\s?')
CLOSER = re.compile(r'\s*\*/\s*$')

DECL = re.compile(
    r'^\s*(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?'
    r'(?:async\s+)?(?:function\*?|const|let|var|class|interface|enum|type|'
    r'namespace)\s+([A-Za-z_$][\w$]*)')
PROPERTY = re.compile(
    r'^\s*(?:(?:public|private|protected|static|readonly|override)\s+)*'
    r'([A-Za-z_$][\w$]*)\??\s*:\s')
METHOD = re.compile(
    r'^\s*(?:(?:public|private|protected|static|async|override|get|set)\s+)*'
    r'([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\([^)]*\)\s*(?::[^=]*)?\{\s*$')
NOT_A_NAME = frozenset((
    'if', 'for', 'while', 'switch', 'return', 'case', 'else', 'do', 'try',
    'catch', 'throw', 'new', 'await', 'yield', 'typeof', 'default', 'break',
    'continue', 'import', 'export', 'from', 'finally', 'void', 'delete'))
TWIN_REF = re.compile(r'^(src/[\w./-]+\.ts)#([A-Za-z_$][\w$]*)')


def say(message):
    sys.stdout.write(message + '\n')


# ---------------------------------------------------------------- the scan

def tree_of(root):
    """{repo-relative path: text} for every .ts file under src/."""
    files = {}
    for folder, dirs, names in os.walk(os.path.join(root, 'src')):
        dirs.sort()
        for name in sorted(names):
            if name.endswith('.ts'):
                path = os.path.join(folder, name)
                rel = os.path.relpath(path, root).replace(os.sep, '/')
                with io.open(path, encoding='utf-8', errors='replace') as h:
                    files[rel] = h.read()
    return files


def decl_name(line):
    for pattern in (DECL, METHOD, PROPERTY):
        found = pattern.match(line)
        if found and found.group(1) not in NOT_A_NAME:
            return found.group(1)
    return None


def indent_of(line):
    return len(line) - len(line.lstrip())


def enclosing(code_lines, idx):
    """Names of the declarations enclosing line idx, outermost first."""
    names = []
    limit = indent_of(code_lines[idx])
    same_ok = False
    j = idx - 1
    while j >= 0 and (limit > 0 or same_ok):
        line = code_lines[j]
        j -= 1
        if not line.strip():
            continue
        ind = indent_of(line)
        if ind < limit or (same_ok and ind == limit):
            name = decl_name(line)
            limit, same_ok = ind, False
            if name:
                names.append(name)
            elif line.lstrip()[:1] in ')]}':
                # a multi-line signature's close: its opener sits at this indent
                same_ok = True
    return names[::-1]


def symbol_at(code_lines, last_line, trailing):
    """The declaration a comment ending on last_line (1-based) sits on."""
    idx = last_line - 1 if trailing else last_line
    while idx < len(code_lines) and not code_lines[idx].strip():
        idx += 1
    if idx >= len(code_lines):
        return '(top)'
    chain = enclosing(code_lines, idx)
    own = decl_name(code_lines[idx])
    if own:
        chain.append(own)
    return '.'.join(chain) if chain else '(top)'


def blocks_of(text, comments):
    """[(trailing, [(line, cleaned text)])] -- runs of full-line comments."""
    lines = text.split('\n')
    blocks = []
    for _kind, first, parts in comments:
        before = lines[first - 1].lstrip() if first - 1 < len(lines) else ''
        trailing = not before.startswith(('//', '/*'))
        body = []
        for k, raw in enumerate(parts):
            body.append((first + k, CLOSER.sub('', LEADER.sub('', raw)).strip()))
        if (not trailing and blocks and not blocks[-1][0]
                and blocks[-1][1][-1][0] + 1 == first):
            blocks[-1][1].extend(body)
        else:
            blocks.append((trailing, body))
    return blocks


def forms_of(body):
    """Split a block's lines into forms: [(first line, last line, text)]."""
    forms = []
    cur = None
    for line, text in body:
        if not text:
            cur = None
            continue
        if cur is None or HEAD.match(text):
            cur = [line, line, [text]]
            forms.append(cur)
        else:
            cur[1] = line
            cur[2].append(text)
    return [(a, b, ' '.join(t)) for a, b, t in forms]


def words_of(text):
    return re.sub(r'[^A-Za-z0-9]+', ' ', HEAD_WORD.sub('', text)).lower().split()


def claims_of(files):
    """Every copy claim: dicts with rel, line, symbol, words, text, key."""
    found = []
    for rel in sorted(files):
        text = files[rel].replace('\r\n', '\n').replace('\r', '\n')
        code, comments = LEX(text)
        code_lines = code.split('\n')
        for trailing, body in blocks_of(text, comments):
            last_line = body[-1][0]
            symbol = None
            for first, _last, form in forms_of(body):
                if not CLAIM.search(form) or NOT_A_CLAIM.search(form):
                    continue
                if symbol is None:
                    symbol = symbol_at(code_lines, last_line, trailing)
                found.append({'rel': rel, 'line': first, 'symbol': symbol,
                              'words': words_of(form), 'text': form})
    keyed = {}
    for claim in found:
        claim['key'] = '%s :: %s' % (claim['symbol'],
                                     ' '.join(claim['words'][:KEY_WORDS]))
        keyed.setdefault(claim['key'], []).append(claim)
    for key, same in keyed.items():
        if len(same) < 2:
            continue
        for claim in same:
            claim['key'] = '%s :: %s' % (claim['symbol'], ' '.join(claim['words']))
        full = {}
        for claim in same:
            full.setdefault(claim['key'], []).append(claim)
        for group in full.values():
            if len(group) > 1:
                group.sort(key=lambda c: (c['rel'], c['line']))
                for n, claim in enumerate(group, 1):
                    claim['key'] += ' #%d' % n
    return found


# ------------------------------------------------------------ the registry

def load_registry(path):
    """{key: {'sort', 'twin', 'why'}} and the records it cannot read.

    ⛔ Read strictly: a record this loader cannot parse is reported, never
    dropped, because a registry nobody can read forgives every copy.
    """
    held, malformed = {}, []
    if not os.path.exists(path):
        return held, ['it does not exist -- check 70 holds the known copy '
                      'comments there, so without it every one reads as new']
    record = None

    def close(rec, where):
        if rec is None:
            return
        missing = [f for f in ('twin', 'why') if not rec.get(f)]
        if missing:
            malformed.append('the record opened on line %d has no %s line'
                             % (where, ' and no '.join(
                                 '"%s:"' % m for m in missing)))
        if rec['key'] in held:
            malformed.append('the key on line %d is held twice: %s'
                             % (where, rec['key']))
        held[rec['key']] = rec

    opened = 0
    with io.open(path, encoding='utf-8') as handle:
        for lineno, raw in enumerate(handle, 1):
            line = raw.strip()
            if not line or line.startswith('#'):
                continue
            low = line.lower()
            if low.startswith(('twin:', 'why:')):
                field = low.split(':', 1)[0]
                if record is None or record.get(field):
                    malformed.append('line %d carries a "%s:" with no record '
                                     'above it that lacks one' % (lineno, field))
                    continue
                record[field] = line.split(':', 1)[1].strip()
                continue
            close(record, opened)
            record = None
            cells = [c.strip() for c in line.split('|', 1)]
            if len(cells) != 2 or cells[0] not in SORTS or ' :: ' not in cells[1]:
                malformed.append('line %d is not "<%s> | <symbol> :: <words>": %s'
                                 % (lineno, ' / '.join(SORTS), line[:70]))
                continue
            record = {'sort': cells[0], 'key': cells[1]}
            opened = lineno
    close(record, opened)
    return held, malformed


def twin_notes(root, held):
    """NOTE lines for `path#symbol` twins that cannot be found and are not stale."""
    notes = []
    for key in sorted(held):
        twin = held[key].get('twin') or ''
        found = TWIN_REF.match(twin)
        if not found or twin.lower().startswith('stale'):
            continue
        path = os.path.join(root, *found.group(1).split('/'))
        name = re.escape(found.group(2))
        ok = False
        if os.path.exists(path):
            with io.open(path, encoding='utf-8', errors='replace') as h:
                body = h.read()
            ok = bool(re.search(
                r'(?m)(?:function\*?|const|let|var|type|interface|class|enum)\s+'
                + name + r'\b|^\s*' + name + r'\s*[(:<]', body))
        if not ok:
            notes.append('twin %s of "%s" is not found -- mark it stale or '
                         'correct it' % (twin.split()[0], key))
    return notes


def verdict(claims, held, malformed):
    """(problems, known lines, summary)."""
    problems = ['the registry %s cannot be read: %s' % (REL_BASELINE, bad)
                for bad in malformed]
    found = {}
    for claim in claims:
        found[claim['key']] = claim
    known = []
    for key in sorted(found, key=lambda k: (found[k]['rel'], found[k]['line'])):
        claim = found[key]
        rec = held.get(key)
        where = '%s:%d' % (claim['rel'], claim['line'])
        if rec is None:
            problems.append(
                '%s: a NEW copy comment, not held in %s -- "%s". Publish the '
                'original through its component\'s public entry and import it '
                '(fold it, inside one component); registering it needs the '
                'user\'s OK. key: %s' % (where, REL_BASELINE, claim['text'][:110],
                                         key))
            continue
        known.append('%-9s %s  %s -- twin: %s -- why: %s'
                     % (rec['sort'], where, key, rec['twin'], rec['why']))
    new = len([c for c in found if c not in held])
    for key in sorted(held):
        if key not in found:
            problems.append(
                '%s holds a %s claim no longer found in src/ -- a paid debt '
                'must leave the file (or the comment was reworded or its '
                'declaration renamed: re-key the record): %s'
                % (REL_BASELINE, held[key]['sort'], key))
    summary = '%d copy claim(s) held in the registry (new %d)' % (
        len([k for k in found if k in held]), new)
    return problems, known, summary


# -------------------------------------------------------------- self-test

SELF_TEST_A = u'''\
export function rectHoldsPoint(rect: Rect, x: number): boolean {
  return rect.x <= x
}

// TRAP: a copy of screen-regions.ts's private rectHoldsPoint; change both together.
function holds(rect: Rect, x: number): boolean {
  return rect.x <= x
}
'''

SELF_TEST_B = u'''\
export function writeRows(rows: Row[]): string[] {
  // TRAP: a claimed value must leave the carried list, or the writer writes it twice.
  const out = rows.map(String)
  return out
}
'''

SELF_TEST_NEW = u'''\
export function rowAt(rows: Row[], y: number): number {
  const at = rows.length
  // TRAP: the same walk as rowAnchorIn in zoom-and-fit.ts; change both together.
  const slab = y - at
  return slab
}
'''

SELF_TEST_KEY = ('holds :: a copy of screen regions ts s private recthold'
                 'spoint change')


def self_test_case(label, files, held, wanted):
    """One case; `wanted` is None for green, or a substring a problem must hold."""
    problems, _known, summary = verdict(claims_of(files), held, [])
    if wanted is None:
        say('         %s: %s' % (label, 'green, ' + summary if not problems
                                  else 'RED: ' + '; '.join(problems)))
        return None if not problems else '%s: expected green, got red' % label
    hit = [p for p in problems if wanted in p]
    say('         %s: %s' % (label, ('RED, ' + hit[0][:150]) if hit else
                                  ('green' if not problems else
                                   'red for another reason: ' + '; '.join(problems))))
    return None if hit else '%s: expected a problem holding "%s"' % (label, wanted)


def self_test():
    clean = {'src/a/a.ts': SELF_TEST_A, 'src/b/b.ts': SELF_TEST_B}
    rec = {'sort': 'copy', 'twin': 'src/c/c.ts#rectHoldsPoint', 'why': 'test',
           'key': SELF_TEST_KEY}
    held = {SELF_TEST_KEY: rec}
    results = []
    # 0. held exactly what is found; "writes it twice" is no claim.
    results.append(self_test_case('case 0 (clean tree)', clean, held, None))
    # 1. a new unregistered copy comment.
    results.append(self_test_case(
        'case 1 (a new copy comment)', dict(clean, **{'src/d/d.ts': SELF_TEST_NEW}),
        held, 'rowAt.slab :: the same walk as rowanchorin'))
    # 2. the held claim's comment deleted.
    gone = dict(clean, **{'src/a/a.ts': SELF_TEST_A.replace(
        "// TRAP: a copy of screen-regions.ts's private rectHoldsPoint; "
        "change both together.\n", '')})
    results.append(self_test_case('case 2 (a held claim deleted)', gone, held,
                                  'no longer found in src/'))
    # 3. the file split and moved, lines shifted: the key holds.
    moved = {'src/b/b.ts': SELF_TEST_B,
             'src/a/parts/holds.ts': u'\n\n\n' + SELF_TEST_A.split('\n\n', 1)[1]}
    results.append(self_test_case('case 3 (file moved, lines shifted)', moved,
                                  held, None))
    # 4. more phrases that name a copy without claiming one.
    quiet = dict(clean, **{'src/e/e.ts': u'''\
export function deliverAll(watchers: Map<string, Watcher>): void {
  // TRAP: walk a copy: deliver may watch or unwatch, which would change the Map.
  const each = [...watchers.values()]
  // TRAP: the vertical twin, held for the same reason.
  const held = each.length
}
'''})
    results.append(self_test_case('case 4 (non-claim phrases)', quiet, held, None))
    # 5. two identical new claims on one symbol: keys stay distinct (#1, #2).
    twice = dict(clean, **{'src/d/d.ts': SELF_TEST_NEW,
                           'src/f/f.ts': SELF_TEST_NEW})
    results.append(self_test_case('case 5 (a key collision)', twice, held,
                                  'rowAt.slab :: the same walk as rowanchorin in '
                                  'zoom and fit ts change both together #2'))
    failures = [one for one in results if one]
    for failure in failures:
        say('FAIL     check 70 self-test: %s' % failure)
    if failures:
        return 1
    say('OK       check 70 self-test: 3 break(s) went red, the non-claims and '
        'the moved file stayed green, and the clean tree held in memory is green')
    return 0


# ------------------------------------------------------------------- main

def main(argv):
    if '--self-test' in argv:
        return self_test()
    started = time.time()
    claims = claims_of(tree_of(ROOT))
    if '--list' in argv:
        for claim in claims:
            say('%s:%d\t%s\t%s' % (claim['rel'], claim['line'], claim['key'],
                                   claim['text'][:160]))
        say('NOTE     %d copy claim(s) found in src/' % len(claims))
        return 0
    held, malformed = load_registry(BASELINE)
    problems, known, summary = verdict(claims, held, malformed)
    for line in known:
        say('KNOWN    %s' % line)
    for note in twin_notes(ROOT, held):
        say('NOTE     %s' % note)
    for problem in problems:
        say('PROBLEM  %s' % problem)
    say('%s %s; %.2f s' % ('FAIL    ' if problems else 'OK      ', summary,
                           time.time() - started))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
