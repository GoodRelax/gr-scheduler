# -*- coding: utf-8 -*-
"""Check 21: every generated artifact says where it came from.

A generated file that does not name its manuscript gets edited by hand. The
edit then survives until the next `npm run gen` throws it away, and nothing in
between says a word -- so the person who made it learns nothing and does it
again. Worse, tbl-settings.md used to OPEN with "本書が設定値の正である",
which was true until CR-175 made it a generated artifact and false afterwards.

So each artifact must carry three things near its top:

  1. that it is generated and must not be edited by hand
  2. the manuscript it is generated FROM, by path
  3. how to rebuild it

⚠️ Add a row here when you add a generated artifact. The list is the point:
a new generator that forgets the banner is exactly what this catches.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))

# artifact -> the manuscript path its banner has to name.
ARTIFACTS = [
    ('docs/spec/_assets/tbl-settings.md', 'settings.json'),
    ('docs/spec/_assets/fig-erd-detail.md', 'erd.json'),
    ('docs/spec/_assets/fig-erd-overview.md', 'erd.json'),
    ('docs/spec/_source/grs-document.schema.json', 'erd.json'),
    ('docs/review/components/components.md', 'components.json'),
    ('src/entity/document-model/schedule/schedule.ts', 'erd.json'),
    ('src/entity/document-model/document-stamp/document-stamp.ts', 'erd.json'),
    ('src/entity/document-model/document-settings/document-settings.ts',
     'settings.json'),
    # Three units whose generated region carries table T-206 -- the values the
    # document does NOT store, which reach the unit that owns their type
    # (CR-178). ⚠️ Most of each file is hand written; only the marked region
    # is generated, which is why the banner has to say so per file.
    # ⚠️ The third is an Adapter unit: a row of that table goes to the unit that
    # consumes it, and S-134's consumer is the screen frame, not a hit area.
    ('src/entity/layout-engine/item-hit-area/item-hit-area.ts', 'settings.json'),
    ('src/entity/document-model/edit-history/edit-history.ts', 'settings.json'),
    ('src/adapter/screen-renderer/screen-frame.ts', 'settings.json'),
    # ⚠️ Two more of the same kind, and the first pair whose table T-206 rows
    # hold no value of their own: S-96 / S-97 / S-98 NAME S-53 / S-54 / S-55 of
    # table T-201, so the manuscript is still settings.json but the number is
    # one hop away. ⛔ Nothing carried the zoom trio into src/ until then, and
    # that single gap stopped FT-1 -- every pointer and key path -- outright.
    ('src/adapter/input-command-translator/input-command-translator.ts',
     'settings.json'),
    ('src/use-case/edit-document/edit-document.ts', 'settings.json'),
    # The roster of icons (table T-109), which UF-62 and UF-65 read instead of
    # naming its rows themselves. ⚠️ Its banner is a "$comment" key, which the
    # startup template beside it may NOT have: that one is validated by the GRS
    # JSON schema, and this one is not.
    ('src/adapter/screen-renderer/icon-roster.json', 'tbl-glossary.md'),
    # The shapes themselves (figure F-019), which UF-71 draws instead of
    # printing the row id where a glyph belongs. ⚠️ Its manuscript is a FIGURE,
    # and the only one of these artifacts whose manuscript is not a table or a
    # _source/ file: FR-029 (MUST) makes that figure the authority for every
    # icon's shape, so the banner names the .svg and the generator cross-checks
    # it against table T-109 so neither can move alone.
    ('src/adapter/screen-renderer/icon-glyphs.json', 'fig-icons.svg'),
    # The words the screen prints (FR-038). ⚠️ Its manuscript is a manuscript of
    # WORDS ONLY: which words exist is read from the specification on every run,
    # so this artifact drifts if a table moves and the manuscript does not.
    ('src/adapter/screen-renderer/display-words.json',
     'docs/spec/_source/display-words.json'),
    # The two MSPDI custom-field frames GRS borrows for the fade day counts
    # (EX-6 / EX-8 of table T-033). ⚠️ The FieldID numbers are a quotation from
    # Microsoft's PjCustomField enumeration, so the manuscript has to say where
    # they came from as well as what it is -- rule 03 section 1 forbids typing
    # them a second time anywhere.
    ('src/adapter/document-codec/mspdi-custom-fields.json',
     'docs/spec/_source/mspdi-custom-fields.json'),
    # The two values OP-12 of table T-024a compares (CR-214 moved them out of
    # prose and into columns of table T-024, so that a generator could reach
    # them at all). ⚠️ Its manuscript is a REQUIREMENTS document rather than a
    # _source/ file: the values are the specification's own, and the row id is
    # the only join the table admits.
    ('src/adapter/document-codec/exchange-formats.json',
     'docs/spec/01-04-requirements.md'),
]

# How far into the file the banner may sit. Long enough for a StrictDoc header
# (title, UID, Version) or a JSON Schema's $schema and $id, and no longer.
HEAD_CHARS = 1400

GENERATED = ('生成物', 'generated', 'Generated')
NO_HAND = ('手で直さない', 'do not edit by hand', 'Do not edit by hand',
           'Never edit by hand')
REBUILD = ('npm run gen', 'build.py')


# Every file of docs/spec/_source/ has to say which of the two it is. The
# folder holds BOTH -- erd.json is edited by hand, overview.json and the
# .drawio are written by build.py -- so the folder name cannot answer the
# question and the file has to. ⚠️ A README cannot: whoever opens a file from
# a search result never sees it.
SOURCE_DIR = 'docs/spec/_source'
MANUSCRIPT = ('SINGLE SOURCE OF TRUTH', 'EDIT THIS', 'single source of truth')
DERIVED = ('GENERATED --', 'do not edit by hand', 'Never edit by hand',
           'Do not edit by hand')


def source_folder_problems():
    """docs/spec/_source holds manuscripts AND generated files. Each says which."""
    problems = []
    root = os.path.join(ROOT, *SOURCE_DIR.split('/'))
    for name in sorted(os.listdir(root)):
        path = os.path.join(root, name)
        if os.path.isdir(path) or name.startswith('.'):
            continue
        head = io.open(path, encoding='utf-8', errors='replace').read(HEAD_CHARS)
        if name.endswith('.py'):
            # A generator is neither. Its docstring must name what it writes.
            if 'docs/spec/' not in head:
                problems.append('%s/%s: a generator that does not name what it '
                                'writes' % (SOURCE_DIR, name))
            continue
        if not (any(w in head for w in MANUSCRIPT)
                or any(w in head for w in DERIVED)):
            problems.append('%s/%s: says neither that it is a single source of '
                            'truth nor that it is generated'
                            % (SOURCE_DIR, name))
    return problems


def main():
    problems = source_folder_problems()
    for rel, manuscript in ARTIFACTS:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            problems.append('%s is missing' % rel)
            continue
        head = io.open(path, encoding='utf-8').read(HEAD_CHARS)
        if not any(w in head for w in GENERATED):
            problems.append('%s does not say it is generated' % rel)
        if not any(w in head for w in NO_HAND):
            problems.append('%s does not say not to edit it by hand' % rel)
        if manuscript not in head:
            problems.append('%s does not name its manuscript (%s)'
                            % (rel, manuscript))
        if not any(w in head for w in REBUILD):
            problems.append('%s does not say how to rebuild it' % rel)

    for p in problems:
        sys.stdout.write('  %s\n' % p)
    if problems:
        sys.stdout.write('FAIL     %d file(s) leave a reader unable to tell '
                         'a manuscript from an artifact\n' % len(problems))
        return 1
    sys.stdout.write('OK       %d generated artifacts name their manuscript and '
                     'how to rebuild; every file of %s says which it is\n'
                     % (len(ARTIFACTS), SOURCE_DIR))
    return 0


if __name__ == '__main__':
    sys.exit(main())
