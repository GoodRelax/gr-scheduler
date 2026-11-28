# -*- coding: utf-8 -*-
"""Apply the CR-855 word rulings that stand in sentences, not between delimiters.

    PYTHONIOENCODING=utf-8 python tools/rename/cr855_words.py --dry-run
    PYTHONIOENCODING=utf-8 python tools/rename/cr855_words.py --apply
    PYTHONIOENCODING=utf-8 python tools/rename/cr855_words.py --list <out.tsv>
    PYTHONIOENCODING=utf-8 python tools/rename/cr855_words.py --src [--dry-run]

change-request/CR-855-spec-text-and-code-names-follow-the-names-dictionary.md
section 4 describes it. tools/apply_glossary_renames.py replaces a former
name only between delimiters, because a loose word may mean something else.
The words of this table are notation (the long vowel of JDG-3375, the particle
of JDG-3365) or a ruled word that no other sense shares (JDG-3351, JDG-3372),
so they are replaced wherever they stand -- or, for a word with other senses,
listed for a person to read (mode `read`).

Table: docs/review/cr-855-words.tsv, columns
    no  pattern  replacement  mode  basis  note
mode `all`  every match of the regex `pattern` becomes `replacement`
mode `read` --list writes every match (path, line, row, text) for a person;
            --apply leaves it alone
A replacement written `GRS` (a code span) gets a space on a side where it
meets a letter of Japanese text, as the specification writes it
("`GRS` は、"); none where it meets punctuation or the line's edge.

FILES: the files tools/apply_glossary_renames.py edits (the specification's
hand-written .md, the manuscripts in docs/spec/_source except the frozen
contracts, the tests), plus the `definition` strings of glossary.json for the
terms outside the frozen contract groups (never `label`, `renames[]` or
`avoid`: those are names, renamed by apply_glossary_renames.py).
src/ is edited only by --src: the hand-written .ts files still write some
screen names as strings (surface names and data-role values, e.g.
'Help Modal'), against rule 03 section 1. --src replaces the `all` rows whose
pattern is plain English words there, on word boundaries, so the strings stay
the same as the tests that look for them. Generated copies (the .json under
src/) follow `npm run gen`.

One pass per file, all rows in one regex, longest first, so a replacement is
never read again.
"""
import csv
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import apply_glossary_renames as agr  # noqa: E402

ROOT = agr.ROOT
TABLE = os.path.join(ROOT, 'docs', 'review', 'cr-855-words.tsv')
CODE_SPAN = '`'
# A letter of Japanese text: kana, kanji, the long vowel mark.
JA_LETTER = re.compile(u'[ぁ-ヿ㐀-鿿ｦ-ﾟ]')


def load_table():
    rows = [r for r in csv.DictReader(io.open(TABLE, encoding='utf-8'), delimiter='\t')]
    for r in rows:
        if r['mode'] not in ('all', 'read'):
            raise SystemExit('%s: mode must be all or read, not %r' % (r['no'], r['mode']))
        r['regex'] = re.compile(r['pattern'])
    return rows


def spaced(text, start, end, new):
    """new, with a space where a code span meets a Japanese letter."""
    if not new.startswith(CODE_SPAN):
        return new
    before = text[start - 1] if start else ''
    after = text[end] if end < len(text) else ''
    if before and JA_LETTER.match(before):
        new = ' ' + new
    if after and JA_LETTER.match(after):
        new = new + ' '
    return new


def replace_all(text, rows):
    """(text, {no: count}) with every `all` row applied in one pass."""
    active = [r for r in rows if r['mode'] == 'all']
    if not active:
        return text, {}
    joined = re.compile('|'.join('(?P<r%d>%s)' % (i, r['pattern'])
                                 for i, r in enumerate(active)))
    counts = {}
    out, last = [], 0
    for m in joined.finditer(text):
        i = int(m.lastgroup[1:])
        row = active[i]
        out.append(text[last:m.start()])
        # The replacement is literal: no group references (one joined regex).
        out.append(spaced(text, m.start(), m.end(), row['replacement']))
        last = m.end()
        counts[row['no']] = counts.get(row['no'], 0) + 1
    out.append(text[last:])
    return ''.join(out), counts


# The frozen contract manuscripts (JDG-3807) keep their words, and so do the
# tables printed from them; a test that quotes them must keep the same words.
FROZEN_PRINTED = ('docs/spec/_assets/tbl-agent-api-members.md',
                  'docs/spec/_assets/tbl-document-commands.md')
TEST_LITERAL = re.compile(r"'(?:[^'\\\n]|\\.){6,}'|\"(?:[^\"\\\n]|\\.){6,}\"")
HOLE = '\x00'


def frozen_text():
    parts = []
    for name in agr.FROZEN - {'glossary.json'}:
        path = os.path.join(ROOT, 'docs', 'spec', '_source', name)
        if os.path.exists(path):
            parts.append(agr.read(path))
    for rel_path in FROZEN_PRINTED:
        path = os.path.join(ROOT, rel_path)
        if os.path.exists(path):
            parts.append(agr.read(path))
    return '\n'.join(parts)


def replace_outside_frozen_quotes(text, rows, frozen):
    """replace_all, but a quoted string the frozen manuscripts hold word for
    word is left as it is."""
    kept = []

    def hide(m):
        if m.group(0)[1:-1] in frozen:
            kept.append(m.group(0))
            return '%s%d%s' % (HOLE, len(kept) - 1, HOLE)
        return m.group(0)
    hidden = TEST_LITERAL.sub(hide, text)
    changed, counts = replace_all(hidden, rows)
    changed = re.sub(HOLE + r'(\d+)' + HOLE, lambda m: kept[int(m.group(1))], changed)
    return changed, counts


def glossary_strings(doc):
    """The definition dicts of glossary.json this tool may edit."""
    for term in doc['terms']:
        if agr.is_contract(term):
            continue
        definition = term.get('definition')
        if isinstance(definition, dict):
            yield definition


def run(mode, list_path=None):
    rows = load_table()
    total = {r['no']: 0 for r in rows}
    files = 0
    listing = []
    frozen = frozen_text()
    for path in agr.target_files():
        text = agr.read(path)
        if mode == 'list':
            for number, line in enumerate(text.splitlines(), 1):
                for r in rows:
                    if r['mode'] == 'read' and r['regex'].search(line):
                        listing.append((agr.rel(path), number, r['no'], line.strip()))
            continue
        if agr.rel(path).startswith('tests/'):
            changed, counts = replace_outside_frozen_quotes(text, rows, frozen)
        else:
            changed, counts = replace_all(text, rows)
        if counts:
            files += 1
            for no, n in counts.items():
                total[no] += n
            if mode == 'apply':
                agr.write(path, changed)
    doc = agr.load_glossary()
    edited = False
    for definition in glossary_strings(doc):
        for language, value in list(definition.items()):
            if not isinstance(value, str):
                continue
            if mode == 'list':
                for r in rows:
                    if r['mode'] == 'read' and r['regex'].search(value):
                        listing.append(('docs/spec/_source/glossary.json', 0, r['no'], value))
                continue
            changed, counts = replace_all(value, rows)
            for no, n in counts.items():
                total[no] += n
            if counts and mode == 'apply':
                definition[language] = changed
                edited = True
    if edited:
        agr.save_glossary(doc)
    if mode == 'list':
        with io.open(list_path, 'w', encoding='utf-8', newline='') as out:
            out.write('path\tline\tno\ttext\tdecision\n')
            for path, number, no, line in listing:
                out.write('%s\t%d\t%s\t%s\t\n' % (path, number, no, line.replace('\t', ' ')))
        agr.say('OK       %d place(s) to read written to %s' % (len(listing), list_path))
        return 0
    for r in rows:
        if r['mode'] == 'all':
            agr.say('%-8s %5d  %s -> %s' % (r['no'], total[r['no']], r['pattern'], r['replacement']))
    agr.say('%s %d replacement(s) in %d file(s)%s' % (
        'OK      ', sum(total.values()), files + (1 if edited else 0),
        '' if mode == 'apply' else ' (dry run: nothing was written)'))
    return 0


def self_test():
    rows = [{'no': 'W1', 'pattern': u'本ツール', 'replacement': '`GRS`', 'mode': 'all'},
            {'no': 'W2', 'pattern': u'ポインタ(?!ー)', 'replacement': u'ポインター', 'mode': 'all'}]
    cases = [
        (u'本ツールは、', u'`GRS` は、'),
        (u'、本ツール。', u'、`GRS`。'),
        (u'ポインターとポインタ', u'ポインターとポインター'),
    ]
    bad = 0
    for given, wanted in cases:
        got, _c = replace_all(given, rows)
        if got != wanted:
            bad += 1
            agr.say('FAIL     %r -> %r, wanted %r' % (given, got, wanted))
    agr.say('%s self-test: %d case(s)' % ('OK      ' if not bad else 'FAIL    ', len(cases)))
    return 1 if bad else 0


def run_src(edit):
    rows = [r for r in load_table() if r['mode'] == 'all'
            and re.match(r'^[A-Za-z ]+$', r['pattern'])]
    names = {r['pattern']: r['replacement'] for r in rows}
    pattern = re.compile(r'(?<![A-Za-z])(%s)(?![A-Za-z])' % '|'.join(
        re.escape(n) for n in sorted(names, key=len, reverse=True)))
    total = 0
    for path in agr.walk(os.path.join(ROOT, 'src'), '.ts'):
        text = agr.read(path)
        changed, n = pattern.subn(lambda m: names[m.group(1)], text)
        if n:
            total += n
            agr.say('%4d  %s' % (n, agr.rel(path)))
            if edit:
                agr.write(path, changed)
    agr.say('OK       %d replacement(s) in src/%s' % (total, '' if edit else ' (dry run)'))
    return 0


def main(argv):
    if argv in (['--src'], ['--src', '--dry-run']):
        return run_src('--dry-run' not in argv)
    if argv == ['--self-test']:
        return self_test()
    if argv == ['--dry-run']:
        return run('dry')
    if argv == ['--apply']:
        return run('apply')
    if len(argv) == 2 and argv[0] == '--list':
        return run('list', argv[1])
    agr.say(__doc__.split('\n\n')[0])
    agr.say('unknown arguments: %s -- nothing was written' % ' '.join(argv))
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
