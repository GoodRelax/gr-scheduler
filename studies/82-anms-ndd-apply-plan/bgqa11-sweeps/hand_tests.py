# -*- coding: utf-8 -*-
"""Fixed test-quote edits that the sweeps cannot make, and one the tool must not make.

Run LAST in run_all.sh. Idempotent: a fix already in place counts as done.

- uf-72 quotes the IC-59 row and the HF-1 word of the Retract control (JDG-3907).
- cr-430-ty-1-to-9 names the marker KIND of table T-268, where the spec writes
  進捗マーカー loose; the rename tool replaced the quoted word anyway (the
  TRAP its docstring names), so the quote goes back to the spec's word.
"""
import sys

FIXES = {
    'tests/unit/uf-72-screen-part.test.ts': [
        (u" *   | IC-59 | `Task Group Panel` | — | このタスクグループを隠す              | 表 T-051 の `HF-3`  |",
         u" *   | IC-59 | `Task Group Panel` | — | このタスクグループを親に格納する      | 表 T-051 の `HF-3`  |"),
        (u"gist: 'このタスクグループを隠す', side: 'hiding'",
         u"gist: 'このタスクグループを親に格納する', side: 'hiding'"),
        (u"  { rule: 'HF-3', word: '隠す' },",
         u"  { rule: 'HF-3', word: '親に格納' },"),
        (u" * machine-joined: 「隠す」 is `HF-3` because",
         u" * machine-joined: 「親に格納」 is `HF-3` because"),
        # HF-1 writes these two control words loose; the tool replaced the quotes
        (u"  { rule: 'HF-11', word: '配下を折り畳み' },", u"  { rule: 'HF-11', word: '配下をすべて折りたたむ' },"),
        (u"  { rule: 'HF-2', word: '配下を展開' },", u"  { rule: 'HF-2', word: '配下をすべて展開する' },"),
        (u"is `HF-13`, 「配下を折り畳み」 is `HF-11`", u"is `HF-13`, 「配下をすべて折りたたむ」 is `HF-11`"),
    ],
    'tests/contract/cr-430-ty-1-to-9-type-order.test.ts': [
        (u"      '進捗ステータスマーク',\n      '再開アイコン',", u"      '進捗マーカー',\n      '再開アイコン',"),
        (u"kinds.lastIndexOf('進捗ステータスマーク')", u"kinds.lastIndexOf('進捗マーカー')"),
    ],
}


def main():
    missing = 0
    for path, fixes in FIXES.items():
        with open(path, encoding='utf-8', newline='') as h:
            text = h.read()
        for old, new in fixes:
            if old in text:
                print('fixed  %d  %s' % (text.count(old), path))
                text = text.replace(old, new)
            elif new in text:
                print('done      %s' % path)
            else:
                print('MISSING   %s: %s' % (path, old[:40]))
                missing += 1
        with open(path, 'w', encoding='utf-8', newline='') as h:
            h.write(text)
    sys.exit(1 if missing else 0)


if __name__ == '__main__':
    main()
