# -*- coding: utf-8 -*-
"""Check 23: printed prose in a manuscript is held as a language dictionary.

Chapter 6.2 has said so since CR-175:

    ⚠️ 散文のうち刊行される欄は、言語ごとの辞書として持つこと（MUST）
       —— 後から言語を足す作業を、書き直しではなく記入にするためである。

⛔ Nothing measured it, and erd.json broke it for 213 strings and
settings.json for 62 while the rule sat in the specification looking kept.
That is the ladder the handoff wrote down: a rule in the specification but not
in a check gets skipped eventually. This is the bottom rung.

⭐ It is NOT "no Japanese outside a dictionary". Some Japanese in a manuscript
is not prose: the `type` and `nullable` columns hold a CLASSIFICATION, and
wrapping those would burn the display word 「可」 into the manuscript instead of
letting the generator print the classification per language. So the exemptions
are named below WITH THEIR COUNT -- a new bare string fails even at an exempt
path, and an exemption cannot quietly grow.

    python check-language-dictionary.py
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
SOURCE = os.path.join(ROOT, 'docs', 'spec', '_source')

# Hiragana, katakana, CJK ideographs, and the fullwidth forms.
JAPANESE = re.compile(u'[぀-ヿ一-鿿＀-￯]')

# A file says for itself whether it is a manuscript (CR-175, check 21), so
# this check does not carry a second list that could disagree with that one.
MANUSCRIPT = 'SINGLE SOURCE OF TRUTH'

# path -> (how many bare Japanese strings are expected, why it is not prose)
EXEMPT = {
    'erd.json': {
        '/entities[]/columns[]/type': (
            125, 'a CLASSIFICATION, not prose: 「文字列（16 字以下）」 is a type '
                 'and a range, and the Japanese wording of it is a display '
                 'decision. Wrapping it would fix the wording in the '
                 'manuscript. CR-176 left it for the change that decides how '
                 'the classification is spelled.'),
        '/entities[]/columns[]/nullable': (
            138, 'the same: 9 distinct values of which 108 are 可 / 否 / '
                 '否（空可）. A classification plus a note, not prose.'),
        '/container/boxes[]/rows[][]': (
            7, 'the TYPE TOKEN cell of a plain attribute row -- the same '
               'classification the type column holds. The comment cell of the '
               'same row IS prose and is a dictionary, which is why this count '
               'is 7 and not 12.'),
        '/container/boxes[]/entity_rows[][]': (
            12, 'the type token cell again. The comment cell of an entity row '
                'holds an entity NAME, which belongs to no language.'),
    },
    'property-items.json': {
        '/items[]/inputKinds[]': (
            24, 'a CLASSIFICATION, not prose: the seven tokens 文字 / 複数行 / '
                '日付 / 数値 / 真偽 / 選択 / 色 that table T-016 has always '
                'printed in its 入力の型 column, one per GRS JSON column. The '
                'schema of this manuscript states them as an enum, which is '
                'what makes them a closed set rather than wording -- and '
                'FR-006 (MUST) reads the token to choose the control, so a '
                'translation of it would be a second spelling nothing maps '
                'back. ⚠️ The `note` and `mspdi` cells of the same row ARE '
                'prose and are dictionaries, which is why this count is not '
                '53. ⭐ 21 -> 24 on 2026-09-02: table T-016 gained PR-18 / '
                'PR-19 / PR-20 for a TaskGroup\'s label, colour and height '
                '(the user\'s ruling of that day), one token each and all '
                'three drawn from the same closed enum. The count rises '
                'because the table has three more rows, not because the '
                'exemption widened.'),
    },
}


def manuscripts():
    """Every file of _source/ that declares itself the single source."""
    out = []
    for name in sorted(os.listdir(SOURCE)):
        if not name.endswith('.json'):
            continue
        with io.open(os.path.join(SOURCE, name), encoding='utf-8') as f:
            head = f.read(4000)
        if MANUSCRIPT in head:
            out.append(name)
    return out


def bare(value, path='', key=None):
    """Every Japanese-bearing string whose own key is not a language."""
    if isinstance(value, dict):
        for k, v in value.items():
            for x in bare(v, path + '/' + k, k):
                yield x
    elif isinstance(value, list):
        for v in value:
            for x in bare(v, path + '[]', key):
                yield x
    elif isinstance(value, str) and JAPANESE.search(value):
        if key not in ('ja', 'en'):
            yield path, value


def main():
    files = manuscripts()
    if not files:
        sys.stdout.write('PROBLEM  no manuscript declares itself in %s\n'
                         % SOURCE)
        return 1

    problems = []
    for name in files:
        with io.open(os.path.join(SOURCE, name), encoding='utf-8') as f:
            doc = json.load(f)
        counted = {}
        examples = {}
        for path, value in bare(doc, ''):
            counted[path] = counted.get(path, 0) + 1
            examples.setdefault(path, value)
        allowed = EXEMPT.get(name, {})
        for path in sorted(counted):
            if path not in allowed:
                problems.append(
                    '%s: %d Japanese string(s) at %s are not held per '
                    'language, e.g. %r -- Chapter 6.2 requires printed prose '
                    'to be a language dictionary. If it is NOT prose, name it '
                    'in EXEMPT of this file with its count and why.'
                    % (name, counted[path], path, examples[path][:40]))
            elif counted[path] != allowed[path][0]:
                problems.append(
                    '%s: %s is exempt for %d string(s) but holds %d. An '
                    'exemption may not grow silently -- if the new one is '
                    'prose, wrap it; if not, raise the count and say why.'
                    % (name, path, allowed[path][0], counted[path]))
        for path in sorted(allowed):
            if path not in counted:
                problems.append(
                    '%s: %s is exempt for %d string(s) but holds none. Remove '
                    'the exemption -- an exemption nobody needs is one nobody '
                    'rereads.' % (name, path, allowed[path][0]))

    if problems:
        for p in problems:
            sys.stdout.write('PROBLEM  %s\n' % p)
        return 1

    total = sum(n for f in files for n, _ in EXEMPT.get(f, {}).values())
    sys.stdout.write(
        'OK       %d manuscript(s) hold every printed sentence per language; '
        '%d string(s) are exempt as classification, each named with its count\n'
        % (len(files), total))
    return 0


if __name__ == '__main__':
    sys.exit(main())
