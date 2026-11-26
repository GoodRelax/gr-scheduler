# -*- coding: utf-8 -*-
"""Re-apply the BGQA11 renames (version CR-855) after a merge brought back former names.

A merge that takes the other side of a spec file brings back names that
tools/apply_glossary_renames.py had replaced. This script marks every
CR-855 rename whose basis is one of the BGQA11 rulings as pending again
(xAppliedToSpec: false); then `python tools/apply_glossary_renames.py apply`
replaces them once more and drops the marks (BOSS 2026-11-27: conflicts are
solved by running the scripts again, never by hand).

    python studies/82-anms-ndd-apply-plan/bgqa11-sweeps/reapply_cr855_renames.py
    python tools/apply_glossary_renames.py apply
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import apply_glossary_renames as tool  # noqa: E402

BASIS = {'JDG-3901', 'JDG-3902', 'JDG-3903', 'JDG-3904', 'JDG-3905', 'JDG-3906'}


def main():
    doc = tool.load_glossary()
    # a former name another term still carries is renamed by hand, by row id
    # (the tool refuses it: U-10 Cursors vs the palette group Cursors)
    labels = {term['label'].get(lang) for term in doc['terms'] for lang in ('en', 'ja')}
    marked = 0
    for term in doc['terms']:
        for rename in term.get('renames', []):
            if rename['from'] in labels:
                continue
            if rename.get('version') == 'CR-855' and BASIS & set(rename.get('basis', [])):
                if 'xAppliedToSpec' not in rename:
                    rename['xAppliedToSpec'] = False
                    marked += 1
    tool.save_glossary(doc)
    print('OK       %d rename(s) marked pending again; next: tools/apply_glossary_renames.py apply' % marked)


if __name__ == '__main__':
    main()
