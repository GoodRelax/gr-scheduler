# -*- coding: utf-8 -*-
"""Write the property items of table T-016 into src/.

    python tools/generate_property_items.py
    python tools/generate_property_items.py --check

Table T-016 is the whole of the items the properties panel draws (FR-006), and
since CR-278 its manuscript is docs/spec/_source/property-items.json. UF-67
needs each row's GRS JSON columns, the input kind of each column, whether the
row is read-only, and which selection the row belongs to (the table's 対象
column, CR-325) -- and it may not type them out. Rule 03 of
docs/development-rules forbids re-typing a value the specification holds, and
properties-panel.ts carried exactly such a copy until this script existed: the
roster of rows, their columns, and the read-only list were all hand-written
beside the table they were copied from.

WHAT THIS SCRIPT DOES NOT CARRY, AND WHY:

  - THE SHOWN NAME. FR-038 (MUST NOT) keeps every word the screen prints in one
    dictionary per language, so a row's name travels through
    `display-words.json` under the same PR row id. Carrying it here would put
    printed words in two places, which is the very rule this split was made to
    obey (the user's instruction of 2026-08-27).
  - THE CANDIDATES, THE BOUNDS AND WHICH COLUMNS ARE DATES. The note under
    table T-016 (MUST NOT) sends those to grs-document.schema.json and to
    DATE_COLUMNS, which src/ already reads.
  - WHICH ENTITY HOLDS A COLUMN (`heldBy`). That is not table T-016's to say --
    erd.json holds it -- and properties-panel.ts keeps its own reading of it.
    ⚠️ The 対象 column carried below is NOT that answer: it says which SELECTION
    a row belongs to, and a row of 対象 `Task` may still be held by `Task`, by
    `TaskVisual` or (PR-16) by an `Assignment`.

WHAT `appliesTo` IS, AND WHY IT IS WRITTEN OUT FOR EVERY ROW:

  FR-006 (MUST) prints only the rows whose 対象 matches what is selected and
  (MUST NOT) forbids printing the others. The manuscript leaves the field ABSENT
  where the answer is `Task`, that having been every row until 2026-09-02 -- so
  the default is resolved HERE, once, rather than by each reader in src/.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'docs', 'spec', '_source', 'property-items.json')
OUT = os.path.join(ROOT, 'src', 'adapter', 'screen-renderer', 'property-items.json')
REL_OUT = 'src/adapter/screen-renderer/property-items.json'
REL_SELF = 'tools/generate_property_items.py'
REL_SRC = 'docs/spec/_source/property-items.json'

# The 対象 a row that names none belongs to. FR-006's own default: every row of
# table T-016 was a `Task` row until the 対象 column was added on 2026-09-02,
# and the manuscript's schema says so in as many words.
DEFAULT_APPLIES_TO = 'Task'

BANNER = (
    'GENERATED from %s by %s -- do not edit by hand. '
    'Rebuild: npm run gen  |  npm run gen:check fails on drift. '
    'The shown name is NOT here: FR-038 keeps it in display-words.json under '
    'the same row id.' % (REL_SRC, REL_SELF)
)


def build():
    """The items, as they are written out. @purity semi-pure-b"""
    doc = json.load(io.open(SRC, encoding='utf-8'))
    items = []
    for item in doc['items']:
        one = {
            'rowId': item['id'],
            'columns': list(item['columns']),
            'inputKinds': list(item['inputKinds']),
            'isReadOnly': bool(item.get('isReadOnly', False)),
            'appliesTo': item.get('appliesTo', DEFAULT_APPLIES_TO),
        }
        items.append(one)
    return {'$comment': BANNER, 'items': items}


def main():
    """Write the items, or say whether the ones on disk still match."""
    # @purity non-pure
    built = build()
    body = json.dumps(built, ensure_ascii=False, indent=1) + '\n'
    count = len(built['items'])
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            sys.stdout.write('PROBLEM  %s has not been written yet\n' % REL_OUT)
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body:
            sys.stdout.write('PROBLEM  %s has drifted from its manuscript -- '
                             'run `python %s`\n' % (REL_OUT, REL_SELF))
            return 1
        sys.stdout.write('OK       the property items match their manuscript '
                         '(%d item(s))\n' % count)
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    sys.stdout.write('wrote %s (%d item(s), %d byte(s))\n'
                     % (REL_OUT, count, len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
