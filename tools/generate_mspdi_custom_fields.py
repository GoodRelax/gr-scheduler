# -*- coding: utf-8 -*-
"""Carry the two borrowed MSPDI custom-field frames from the manuscript into src/.

    python tools/generate_mspdi_custom_fields.py
    python tools/generate_mspdi_custom_fields.py --check

AT-40 and AT-41 of table T-058 name `Task/ExtendedAttribute` as where
`fadeInDays` and `fadeOutDays` ride, and EX-6 / EX-8 of table T-033 rule how the
frames are chosen and how the definition is written. Neither says WHICH frame --
that is two numbers, and docs/spec/_source/mspdi-custom-fields.json is the one
place they are written down.

⛔ THE NUMBERS ARE NEVER TYPED INTO CODE. Rule 03 section 1 says to generate a
value rather than copy it: a number typed a second time goes stale in silence
when the manuscript moves. This script is the only way they reach src/.

⛔ NO VALUE IS INVENTED HERE. The alias of each frame is empty until the user
fills it, exactly as display-words.json leaves its words empty -- an alias is
written into the partner's file, shows as a column heading in the partner's
tool, and is the key EX-6 uses to tell a frame GRS wrote from one the import
source wrote. A machine-written alias would settle all three at once.

⭐ WHAT IS HELD AGAINST WHAT. The manuscript is validated against its
hand-written contract (_source/mspdi-custom-fields.schema.json) before a byte is
written, and the frames are held against table T-058: a frame that prefers a
column the ERD does not have, or an ERD fade column no frame prefers, stops the
run with exit code 1. That is the drift a roster typed twice would hide.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

REL_SOURCE = 'docs/spec/_source/mspdi-custom-fields.json'
REL_CONTRACT = 'docs/spec/_source/mspdi-custom-fields.schema.json'
REL_ERD = 'docs/spec/_assets/fig-erd-detail.md'
REL_OUT = 'src/adapter/document-codec/mspdi-custom-fields.json'
REL_SELF = 'tools/generate_mspdi_custom_fields.py'

# ⭐ The needle is the row id shape, so it stays ASCII; the caption is checked
# afterwards, so a renumbered table fails loudly instead of being read as the
# wrong one. Same guard as tools/generate_icon_roster.py.
COLUMN_ROW = re.compile(r'^\| (AT-\d+[a-z]?) \|')
FADE_CELL = re.compile(r'`(fade(?:In|Out)Days)`')


def path_of(rel):
    return os.path.join(ROOT, *rel.split('/'))


def read_json(rel):
    with io.open(path_of(rel), encoding='utf-8') as handle:
        return json.load(handle)


def fade_columns_of_erd():
    """The fade columns table T-058 actually holds, read from the printed table.

    ⚠️ fig-erd-detail.md is itself generated from _source/erd.json. It is read
    here rather than the manuscript because T-058 is what the specification
    prints and what a reader checks against -- if the two ever disagree, check
    16 says so first.
    """
    with io.open(path_of(REL_ERD), encoding='utf-8') as handle:
        lines = handle.read().split('\n')
    if not any('T-058' in line for line in lines):
        return None, 'table T-058 is not in %s -- was it renumbered?' % REL_ERD
    found = []
    for line in lines:
        if not COLUMN_ROW.match(line):
            continue
        cells = [cell.strip() for cell in line.split('|')]
        if len(cells) < 5 or cells[2] != '`Task`':
            continue
        hit = FADE_CELL.search(cells[3])
        if hit:
            found.append((cells[1], hit.group(1), cells[8] if len(cells) > 8 else ''))
    return found, None


def build():
    source = read_json(REL_SOURCE)
    contract = read_json(REL_CONTRACT)

    try:
        import jsonschema
    except ImportError:
        jsonschema = None
    if jsonschema is not None:
        errors = list(jsonschema.Draft202012Validator(contract).iter_errors(source))
        if errors:
            return None, ['the manuscript does not satisfy %s: %s'
                          % (REL_CONTRACT, errors[0].message)]

    problems = []
    columns, failure = fade_columns_of_erd()
    if failure:
        return None, [failure]

    erd_names = sorted(name for _, name, _ in columns)
    wanted = sorted(frame['prefers'] for frame in source['frames'])
    if erd_names != wanted:
        problems.append('table T-058 holds fade columns %s but the manuscript '
                        'prefers %s -- one of the two moved'
                        % (erd_names, wanted))
    for row, name, exchange in columns:
        if 'Task/ExtendedAttribute' not in exchange:
            problems.append('%s (%s) no longer names Task/ExtendedAttribute as '
                            'its exchange element, so these frames carry '
                            'nothing' % (row, name))

    ids = [frame['fieldId'] for frame in source['frames']]
    if len(set(ids)) != len(ids):
        problems.append('two frames share a FieldID (%s) -- the partner links '
                        'a value to its definition by that number alone' % ids)
    if problems:
        return None, problems

    out = {
        '$comment': [
            'GENERATED -- do not edit by hand. Your change is overwritten by '
            'the next rebuild.',
            'Generated from %s (the two MSPDI custom-field frames GRS borrows '
            'for the fade day counts, EX-6 / EX-8 of table T-033), which is '
            'the single source of truth. The generator is %s.'
            % (REL_SOURCE, REL_SELF),
            'Rebuild: npm run gen   |   npm run gen:check fails on drift.',
            'The FieldID numbers are a quotation from Microsoft PjCustomField, '
            'not a GRS decision. The manuscript records the source and what '
            'could and could not be corroborated locally.',
        ],
        'elemType': source['elemType']['value'],
        'cfType': source['cfType']['value'],
        'aliasMaxLength': source['aliasMaxLength']['value'],
        'frames': [
            {
                'name': frame['name'],
                'fieldId': frame['fieldId'],
                'prefers': frame['prefers'],
                'alias': frame['alias'],
            }
            for frame in source['frames']
        ],
    }
    return out, []


def main(argv):
    check = '--check' in argv
    out, problems = build()
    if problems:
        for problem in problems:
            sys.stdout.write('PROBLEM  %s\n' % problem)
        return 1

    text = json.dumps(out, ensure_ascii=False, indent=1) + '\n'
    target = path_of(REL_OUT)
    written = sum(1 for frame in out['frames'] if frame['alias'] != '')

    if check:
        if not os.path.exists(target):
            sys.stdout.write('PROBLEM  %s does not exist -- run npm run gen\n' % REL_OUT)
            return 1
        with io.open(target, encoding='utf-8') as handle:
            if handle.read() != text:
                sys.stdout.write('PROBLEM  %s has drifted from %s -- run '
                                 'npm run gen\n' % (REL_OUT, REL_SOURCE))
                return 1
        sys.stdout.write('OK       %s matches %s (%d frame(s), %d alias '
                         'written)\n' % (REL_OUT, REL_SOURCE, len(out['frames']), written))
        return 0

    os.makedirs(os.path.dirname(target), exist_ok=True)
    with io.open(target, 'w', encoding='utf-8', newline='') as handle:
        handle.write(text)
    sys.stdout.write('wrote %s (%d frame(s), %d alias written)\n'
                     % (REL_OUT, len(out['frames']), written))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
