# -*- coding: utf-8 -*-
"""Apply the renames that glossary.json records to the specification and the tests.

The owner rules names; glossary.json records each rename in renames[] of the
term (NDD review standard, appendix A.2, step 2). A rename the specification
has not taken yet carries `xAppliedToSpec: false`. This tool replaces the
former name with the current one wherever the specification, its manuscripts
and the tests write it, and then drops the mark. Code and generated files cite
names by row id or are printed from the manuscripts, so `npm run gen` carries
the rename on after this tool (owner policy JDG-3836, JDG-3837).

    python tools/apply_glossary_renames.py record <rows.tsv>   record renames
    python tools/apply_glossary_renames.py apply [--list]      replace, drop the marks
    python tools/apply_glossary_renames.py --check [--version V] [--list]
    python tools/apply_glossary_renames.py --self-test

record <rows.tsv>
    One rename per row, tab separated, with a header line:
        key  language  new  basis  reasonEn  reasonJa
    language is en (label.en) or ja (label.ja); basis is ruling ids separated
    by spaces. The term's label takes the new name, and renames[] gets
    {from: the old label, version: CR-855, reason, basis, xAppliedToSpec: false}
    (plus xLanguage: ja for a Japanese name). Refused, with nothing written:
    an unknown key, a new name equal to the old one, a new name that is a
    former name of a term (A.2: a former name is never reused), and a term in
    a frozen contract group (GRS JSON, document commands, Agent API: JDG-3807).

apply
    Replaces every former name of a pending rename in the files below, all
    renames in ONE pass (so X->Y and Y->Z never chain), then removes
    xAppliedToSpec from the applied renames. Run `npm run gen` afterwards.
    Only a DELIMITED former name is replaced: inside `...`, "...", '...',
    a Japanese bracket pair, **...**, or a whole table cell | ... |. A former
    name that stands loose in a sentence is listed for a person to read
    (--list prints each place), because a loose word may mean something else.

--check
    Counts the delimited former names still written in the files below, for
    every pending rename and, with --version V, for the renames of version V
    already applied. Exit 1 when any remains. Loose hits are counted, never
    failed.

FILES (repository-relative)
    docs/spec/**/*.md except generated files (their head carries the
        generated-file sentence GENERATED_MARK) and docs/spec/output/
    docs/spec/_source/*.json except glossary.json and the frozen contracts
    tests/**/*.ts
    A rename of a term in a frozen contract group (GRS JSON, document
    commands, Agent API) is never applied here: CR-851 renames those
    names together with the code that writes them.
    src/ is read by --check only and reported: a former name written there by
        hand is a finding for a person (code cites names by row id).

Run with PYTHONIOENCODING=utf-8.
"""
import csv
import io
import json
import os
import re
import sys
from collections import Counter, OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLOSSARY = os.path.join(ROOT, 'docs', 'spec', '_source', 'glossary.json')
VERSION = 'CR-855'
CONTRACT_USES = ('grsJsonSchema', 'commandSchema', 'agentApi')
FROZEN = {'glossary.json', 'grs-document.schema.json', 'grs-commands.schema.json',
          'agent-api-members.json', 'document-commands.json'}
GENERATED_MARK = u'\u672c\u66f8\u306f\u751f\u6210\u7269\u3067\u3042\u308b'
OPENERS = u'`"\'\u300c'           # ` " ' and the Japanese opening bracket
CLOSERS = {u'`': u'`', u'"': u'"', u"'": u"'", u'\u300c': u'\u300d'}


def say(text):
    sys.stdout.write(text + '\n')


def read(path):
    return io.open(path, encoding='utf-8', newline='').read()


def write(path, text):
    io.open(path, 'w', encoding='utf-8', newline='').write(text)


def load_glossary():
    return json.loads(read(GLOSSARY))


def save_glossary(doc):
    write(GLOSSARY, json.dumps(doc, ensure_ascii=False, indent=1) + '\n')


def rel(path):
    return os.path.relpath(path, ROOT).replace('\\', '/')


def walk(top, suffix):
    for here, dirs, files in os.walk(top):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'output', '.git')]
        for name in sorted(files):
            if name.endswith(suffix):
                yield os.path.join(here, name)


def is_generated(text):
    return GENERATED_MARK in '\n'.join(text.splitlines()[:15])


def target_files():
    """The files apply edits, in a stable order."""
    spec = os.path.join(ROOT, 'docs', 'spec')
    for path in walk(spec, '.md'):
        if not is_generated(read(path)):
            yield path
    source = os.path.join(spec, '_source')
    for name in sorted(os.listdir(source)):
        if name.endswith('.json') and name not in FROZEN:
            yield os.path.join(source, name)
    for path in walk(os.path.join(ROOT, 'tests'), '.ts'):
        yield path


def report_files():
    return list(walk(os.path.join(ROOT, 'src'), '.ts'))


# ---------------------------------------------------------------- the renames

def written_name(term):
    if 'xIdentifier' in term:
        return term['xIdentifier']
    if re.match(r'^[A-Za-z][A-Za-z0-9]*$', term['label']['en']):
        return term['label']['en']
    return term['key']


def current_name(term, rename):
    """The name a rename leads to: label.ja for a Japanese rename; else the
    screen label when the former name was a label, the written name otherwise."""
    if rename.get('xLanguage') == 'ja':
        return term['label']['ja']
    if re.match(r'^[A-Za-z][A-Za-z0-9]*$', rename['from']):
        return written_name(term)
    return term['label']['en']


def is_contract(term):
    return any(u in term['xUses'] for u in CONTRACT_USES)


def chosen_renames(doc, version=None):
    """[(term, rename, old, new)] for the pending renames and, with a version,
    the applied renames of that version. A term of a frozen contract group
    is left out (CR-851 renames it with the code)."""
    chosen = []
    for term in doc['terms']:
        if is_contract(term):
            continue
        for rename in term.get('renames', []):
            pending = rename.get('xAppliedToSpec') is False
            if pending or (version and rename.get('version') == version):
                chosen.append((term, rename, rename['from'], current_name(term, rename)))
    return chosen


def mapping(chosen):
    """{old: new}; refuses a former name that two renames send to two names."""
    found, problems = OrderedDict(), []
    for term, _rename, old, new in chosen:
        if old == new:
            continue
        if old in found and found[old] != new:
            problems.append('former name %r leads to %r and to %r (term %s)'
                            % (old, found[old], new, term['key']))
        found[old] = new
    return found, problems


# ---------------------------------------------------------- the replacement

def delimited_pattern(olds):
    """One regex for every delimited former name, longest first."""
    names = '|'.join(re.escape(o) for o in sorted(olds, key=len, reverse=True))
    return re.compile(
        u'(?P<open>[%s]|\\*\\*|\\| )(?P<name>%s)(?=(?P<close>[`"\'\u300d]|\\*\\*| \\|))'
        % (re.escape(OPENERS), names))


def closes(opening, closing):
    if opening == '**':
        return closing == '**'
    if opening == '| ':
        return closing == ' |'
    return CLOSERS.get(opening) == closing


def replace_text(text, names, pattern):
    """(new text, number of replacements). One pass: a replaced name is never
    read again, so renames cannot chain."""
    count = [0]

    def one(match):
        if not closes(match.group('open'), match.group('close')):
            return match.group(0)
        count[0] += 1
        return match.group('open') + names[match.group('name')]
    # The closing delimiter is only looked at, never consumed, so a cell
    # "| a | b |" lets its bar close one cell and open the next. One pass:
    # a replaced name is never read again, so renames cannot chain.
    text = pattern.sub(one, text)
    return text, count[0]


def loose_hits(text, olds, names):
    """[(line number, old)] for former names that stand outside delimiters."""
    hits = []
    pattern = delimited_pattern(olds)
    for number, line in enumerate(text.splitlines(), 1):
        stripped = pattern.sub(lambda m: m.group('open') + '\0'
                               if closes(m.group('open'), m.group('close')) else m.group(0), line)
        for old in olds:
            if re.search(r'(?<![A-Za-z0-9])%s(?![A-Za-z0-9])' % re.escape(old), stripped):
                hits.append((number, old))
    return hits


# ---------------------------------------------------------------- commands

def record(path):
    doc = load_glossary()
    by_key = {t['key']: t for t in doc['terms']}
    former = {r['from'] for t in doc['terms'] for r in t.get('renames', [])}
    rows = list(csv.DictReader(io.open(path, encoding='utf-8'), delimiter='\t'))
    problems, planned = [], []
    for number, row in enumerate(rows, 2):
        key, language, new = row.get('key', ''), row.get('language', ''), row.get('new', '')
        term = by_key.get(key)
        basis = (row.get('basis') or '').split()
        if term is None:
            problems.append('line %d: no term %s' % (number, key))
            continue
        if language not in ('en', 'ja'):
            problems.append('line %d: language must be en or ja, not %r' % (number, language))
            continue
        if is_contract(term):
            problems.append('line %d: %s is in a frozen contract (JDG-3807); the owner '
                            'reopens the contract first' % (number, key))
            continue
        old = term['label'][language]
        if not new or new == old:
            problems.append('line %d: %s: new name %r equals the old one' % (number, key, new))
            continue
        if new in former:
            problems.append('line %d: %s: %r is a former name of a term (A.2)' % (number, key, new))
            continue
        if not basis or not all(re.match(r'^JDG-\d+$', b) for b in basis):
            problems.append('line %d: %s: basis needs ruling ids JDG-n' % (number, key))
            continue
        if any(r.get('xAppliedToSpec') is False and r.get('xLanguage') == (None if language == 'en' else 'ja')
               for r in term.get('renames', [])):
            problems.append('line %d: %s already has a pending %s rename' % (number, key, language))
            continue
        planned.append((term, language, old, new, basis, row))
    if problems:
        for p in problems:
            say('  ' + p)
        say('REFUSED  %d problem(s); glossary.json is unchanged' % len(problems))
        return 1
    for term, language, old, new, basis, row in planned:
        rename = OrderedDict([
            ('from', old), ('version', VERSION),
            ('reason', {'en': row.get('reasonEn') or 'The owner ruled the new name.',
                        'ja': row.get('reasonJa') or u'\u6301\u3061\u4e3b\u304c\u65b0\u3057\u3044\u540d\u3092\u88c1\u5b9a\u3057\u305f\u3002'}),
            ('basis', basis)])
        if language == 'ja':
            rename['xLanguage'] = 'ja'
        rename['xAppliedToSpec'] = False
        term['label'][language] = new
        term.setdefault('renames', []).append(rename)
        for b in basis:
            if b not in term.setdefault('checkedBasis', []):
                term['checkedBasis'].append(b)
    save_glossary(doc)
    say('OK       recorded %d rename(s) in glossary.json; next: apply' % len(planned))
    return 0


def scan(names, files, edit):
    pattern = delimited_pattern(names) if names else None
    per_file, loose = OrderedDict(), []
    for path in files:
        text = read(path)
        if not pattern or not any(o in text for o in names):
            continue
        changed, count = replace_text(text, names, pattern)
        if count:
            per_file[rel(path)] = count
            if edit:
                write(path, changed)
        for number, old in loose_hits(changed if edit else text, list(names), names):
            loose.append('%s:%d %s' % (rel(path), number, old))
    return per_file, loose


def apply(listing):
    doc = load_glossary()
    chosen = [c for c in chosen_renames(doc) if c[1].get('xAppliedToSpec') is False]
    names, problems = mapping(chosen)
    if problems:
        for p in problems:
            say('  ' + p)
        say('REFUSED  nothing was written')
        return 1
    per_file, loose = scan(names, list(target_files()), edit=True)
    for _term, rename, _old, _new in chosen:
        rename.pop('xAppliedToSpec', None)
    save_glossary(doc)
    for path, count in per_file.items():
        say('replaced %4d  %s' % (count, path))
    say('OK       %d rename(s) applied: %d replacement(s) in %d file(s); %d loose hit(s) '
        'left for a person%s' % (len(chosen), sum(per_file.values()), len(per_file), len(loose),
                                 '' if listing else ' (--list prints them)'))
    if listing:
        for hit in loose:
            say('  loose  ' + hit)
    say('next: npm run gen, then npm run gen:check and the tests that quote the spec')
    return 0


def check(version, listing):
    doc = load_glossary()
    chosen = chosen_renames(doc, version)
    names, problems = mapping(chosen)
    for p in problems:
        say('  ' + p)
    per_file, loose = scan(names, list(target_files()), edit=False)
    in_src, src_loose = scan(names, report_files(), edit=False)
    pending = sum(1 for c in chosen if c[1].get('xAppliedToSpec') is False)
    remaining = sum(per_file.values())
    for path, count in list(per_file.items()) + list(in_src.items()):
        say('left     %4d  %s' % (count, path))
    if listing:
        for hit in loose + src_loose:
            say('  loose  ' + hit)
    status = 1 if (remaining or problems or in_src) else 0
    say('%s %d rename(s) checked (%d pending%s): %d delimited former name(s) left, '
        '%d in src by hand, %d loose' % (
            'FAIL    ' if status else 'OK      ', len(chosen), pending,
            ', version %s' % version if version else '', remaining,
            sum(in_src.values()), len(loose) + len(src_loose)))
    return status


def self_test():
    names = OrderedDict([('Zoom to Fit', 'Fit All'), ('Fit All', 'Show All'),
                         (u'\u5168\u4f53\u3092\u53ce\u3081\u308b', u'\u5168\u4f53\u8868\u793a')])
    pattern = delimited_pattern(names)
    cases = [
        (u'press `Zoom to Fit`', u'press `Fit All`'),                     # backticks
        (u'"Fit All" and \'Zoom to Fit\'', u'"Show All" and \'Fit All\''),  # one pass, no chain
        (u'| Zoom to Fit | Fit All |', u'| Fit All | Show All |'),          # shared bar
        (u'\u300c\u5168\u4f53\u3092\u53ce\u3081\u308b\u300d', u'\u300c\u5168\u4f53\u8868\u793a\u300d'),               # Japanese brackets
        (u'the Zoom to Fit entry', u'the Zoom to Fit entry'),              # loose: kept
        (u'`Zoom to Fit"', u'`Zoom to Fit"'),                              # mismatched pair
        (u'**Zoom to Fit**', u'**Fit All**'),
    ]
    bad = 0
    for given, wanted in cases:
        got, _n = replace_text(given, names, pattern)
        if got != wanted:
            bad += 1
            say('FAIL     %r -> %r, wanted %r' % (given, got, wanted))
    loose = loose_hits(u'the Zoom to Fit entry, `Fit All`', list(names), names)
    if loose != [(1, 'Zoom to Fit')]:
        bad += 1
        say('FAIL     loose hits %r' % loose)
    _m, problems = mapping([({'key': 'a'}, {}, 'X', 'Y'), ({'key': 'b'}, {}, 'X', 'Z')])
    if not problems:
        bad += 1
        say('FAIL     a former name sent to two names was not refused')
    say('%s self-test: %d case(s)' % ('OK      ' if not bad else 'FAIL    ', len(cases) + 2))
    return 1 if bad else 0


def main(argv):
    if argv[:1] == ['--self-test']:
        return self_test()
    if argv[:1] == ['record'] and len(argv) == 2:
        return record(argv[1])
    if argv[:1] == ['apply'] and set(argv[1:]) <= {'--list'}:
        return apply('--list' in argv)
    if argv[:1] == ['--check']:
        rest = argv[1:]
        version = None
        if '--version' in rest:
            i = rest.index('--version')
            if i + 1 >= len(rest):
                say('--version needs a value')
                return 2
            version = rest[i + 1]
            rest = rest[:i] + rest[i + 2:]
        if set(rest) <= {'--list'}:
            return check(version, '--list' in rest)
    say(__doc__.split('\n\n')[1])
    say('unknown arguments: %s -- nothing was written' % ' '.join(argv))
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
