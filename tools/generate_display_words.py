# -*- coding: utf-8 -*-
"""Carry the words the screen prints from the manuscript into src/.

    python tools/generate_display_words.py
    python tools/generate_display_words.py --check
    python tools/generate_display_words.py --report

FR-038 requires menus and panels to be shown in the chosen language (MUST) and
Chapter 6.2 puts the words in docs/spec/_source/display-words.json. This script
is the only way they reach the code.

⭐ THE MANUSCRIPT HOLDS WORDS AND NO ROSTER. Which words are needed is already
written down -- table T-109 (every entry and its group), table T-037 (every
manner of telling and asking), table T-233 (every reason a telling can carry),
table T-023 (every assignment) and FR-072 (the three headings of the properties
panel). ⛔ So this script builds that roster
from docs/spec every run and holds the manuscript against it: a row added to a
table and not to the manuscript, or a key in the manuscript that no table has,
stops the run with exit code 1 and nothing is written. A roster typed twice
would go stale in silence, which is the drift rule 03 section 1 forbids.

⛔ NO WORD IS INVENTED HERE, and none is invented in the manuscript either.
Every entry is `{"ja": "", "en": ""}` until the user fills it (ruling
2026-08-21, PD-160). Table T-109 refuses an English column in as many words --
one would settle dozens of names the glossary has not settled -- and a word
written by a machine settles exactly the same names.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

REL_SOURCE = 'docs/spec/_source/display-words.json'
REL_GLOSSARY = 'docs/spec/_assets/tbl-glossary.md'
# ⭐ A GENERATED DOCUMENT READ BY A GENERATOR, which is safe in this one
# direction: `property_items_json_to_md.py` prints table T-016 from its own
# manuscript and this reads only the row ids out of it, so the two cannot
# disagree about which rows exist. ⚠️ `npm run gen` runs them in that order.
REL_PROPERTY_ITEMS = 'docs/spec/_assets/tbl-property-items.md'
REL_REQUIREMENTS = 'docs/spec/01-04-requirements.md'
REL_OUT = 'src/adapter/screen-renderer/display-words.json'
REL_SELF = 'tools/generate_display_words.py'


def path_of(rel):
    return os.path.join(ROOT, *rel.split('/'))


# ⭐ Tables are found by the shape of their row ids, so the needles stay ASCII,
# and the caption is then checked to name the table -- a renumbered or moved
# table fails loudly instead of being read as the wrong one. Same guard as
# tools/generate_icon_roster.py.
ICON_ROW = re.compile(r'^\| (IC-\d+[a-z]?) \|')
NOTICE_ROW = re.compile(r'^\| (NT-\d+[a-z]?) \|')
ASSIGNMENT_ROW = re.compile(r'^\| (MK-\d+[a-z]?) \|')
REASON_ROW = re.compile(r'^\| (RS-\d+[a-z]?) \|')
QUESTION_ROW = re.compile(r'^\| (QN-\d+[a-z]?) \|')
ARM_ROW = re.compile(r'^\| (AR-\d+[a-z]?) \|')
PROPERTY_ROW = re.compile(r'^\| (PR-\d+[a-z]?) \|')
CODE_SPAN = re.compile(r'`([^`]+)`')

ICON_TABLE = 'T-109'
NOTICE_TABLE = 'T-037'
ASSIGNMENT_TABLE = 'T-023'
# ⛔ What the pointer is armed with. Table T-023b is the whole count of the
# arms FR-053's palette can put the pointer in, so an arm with no row here
# cannot be armed -- and until this section existed the screen printed the
# row id itself (D-10).
ARM_TABLE = 'T-023b'
# ⛔ The name a property item shows. Table T-016 carries the COLUMN of the
# file and no longer a shown name: FR-038 (MUST NOT) keeps every printed
# word in this dictionary, and until 2026-08-28 the panel drew the column
# name itself -- which is how `strokeColor` and `fadeInDays` reached the
# screen (the user's reports D-81 and D-84).
# ⚠️ ONE WORD PER ROW, NOT PER COLUMN. PR-14 carries two columns and the
# user asked for one word over both (「1 行で入るように」), so the word is
# the row's and is never built by joining the columns'.
PROPERTY_TABLE = 'T-016'
REASON_TABLE = 'T-233'
# ⛔ The sentence a question shows. Table T-234 is the whole count of the
# places NT-7 lets GRS ask, so a question with no row here cannot be raised.
QUESTION_TABLE = 'T-234'

# The surface whose entry closes an open surface. Its 面 column is the roster of
# surfaces table T-103 has settled a name for -- CR-191 and CR-193 both added a
# name to that one cell, which is what makes it the roster rather than a list.
CLOSE_SURFACE_ROW = 'IC-52'

# Table T-109 writes an em dash in the 群 column for a row that belongs to no
# group, the same convention tools/generate_icon_roster.py reads.
EM_DASH = u'—'

COMMAND_PALETTE = 'Command Palette'

# The two answers NT-7 (MUST) makes a person choose between. ⛔ Fixed here and
# not read from a table because table T-037 states the choice in prose and no
# table holds the two as rows -- which is exactly why the WORDS have nowhere to
# live and this file exists. ⚠️ These are KEYS, not words.
CONFIRMATION_ANSWERS = ('proceed', 'cancel')

# The one entrance NT-8 (MUST) puts on a told notification. ⛔ Fixed here for the
# same reason as the two above: table T-037 states it in prose and no table holds
# it as a row. ⚠️ A KEY, not a word -- NT-8 settles the word itself as `OK` in
# both languages (利用者の裁定, 2026-08-25), and the manuscript is where it is
# written. ⛔ It is deliberately NOT a row of table T-109: that table is the roster
# of ENTRANCES DRAWN AS SHAPES (FR-029), and this one is a word, the way NT-7's
# two answers are.
NOTICE_DISMISS = ('dismiss',)

# The caveat FR-032 (MUST) puts on a listed item: a `Task` that goes with the
# row being deleted but is DRAWN on another row, which HM-10 of table T-015a is
# what makes possible. FR-032 settles the medium as a WORD and forbids raising a
# glyph for it, RC-13 of table T-026 keeping shapes as the user's own ruling.
# ⛔ Held here rather than read from a table for the reason above it: no table
# holds these as rows. ⚠️ These are KEYS, not words.
CONFIRMATION_MARKS = ('shownOnAnotherRow',)

# The seven weekdays the fourth ruler tier prints beside the day number
# (FR-017, MUST). ⛔ HELD HERE RATHER THAN READ FROM A TABLE, and Chapter 6.2
# is why: it forbids a table whose only column would be the word itself, and a
# seven-row table of weekdays is exactly that. ⭐ THE ORDER IS AT-17's, not a
# choice made here -- `fig-erd-detail.md` fixes 0 as Sunday rising to 6 for
# Saturday, and `Project.weekStartDay` is stored against that numbering, so the
# roster and the stored number index the same list. ⚠️ These are KEYS, not
# words; the words are the user's, in the manuscript.
WEEKDAYS = ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
            'saturday')

LANGUAGES = ('ja', 'en')

# ⭐ THE WORDS ARE THE USER'S, AND THEY ARE NOW WRITTEN. The ruling of
# 2026-08-21 built the place and left the filling to the user, because table
# T-109 refuses an English column in as many words and a word written by an
# agent settles the very names that refusal protects. ⛔ THIS NOTE USED TO SAY
# "every entry of the manuscript is empty" and went on saying it after the
# filling; the count below is printed on every run so the claim cannot rot
# again.
#
# ⚠️ The fallbacks each printing side keeps -- an empty label, a row id, the
# group word table T-109 itself uses -- are NOT dead. They are what an entry
# added to a table before its word is written falls back to, which is the state
# every one of these was in until recently.
BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s (the words the screen '
    'prints, FR-038). Rebuild: npm run gen -- npm run gen:check fails on drift. '
    'The generator is %s. The words belong to the user: table %s refuses '
    'an English column because one would settle dozens of names the glossary '
    'has not settled, and an invented word settles the same names. Whoever '
    'prints one of these falls back to what it printed before -- a row id, an '
    'empty label -- while its entry is still unwritten.' % (REL_SOURCE, REL_SELF, ICON_TABLE))


def say(message):
    """⛔ The Windows console is cp932 and these messages quote the marks the
    specification uses. Writing them raw raised UnicodeEncodeError from INSIDE
    the problem reporter, so a bad manuscript killed the run with a stack trace
    instead of naming the row. Same guard as settings_json_to_md.py's `say`.
    """
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def cells(line):
    """The cells of one Markdown table row."""
    return [cell.strip() for cell in line.strip().strip('|').split('|')]


def table_rows(rel, row_pattern, table):
    """Every row of one table, in the order it is printed.

    The caption has to have been seen first, which is what keeps a row id
    belonging to some other table from being read as this one's.
    """
    seen_caption = False
    caption = u'表 %s —' % table          # 表 T-nnn —
    found = []
    for line in io.open(path_of(rel), encoding='utf-8'):
        if caption in line:
            seen_caption = True
        match = row_pattern.match(line)
        if match:
            if not seen_caption:
                raise SystemExit('%s: row %s stands before the caption of table '
                                 '%s' % (rel, match.group(1), table))
            found.append(cells(line))
    if not found:
        raise SystemExit('%s: table %s has no rows -- the needle no longer '
                         'matches the document' % (rel, table))
    return found


def roster():
    """Which words the screen needs, read from the specification every run.

    ⭐ The order of every list is the printed order of the table it came from
    (rule 03 section 4): reading the manuscript against the specification has to
    be a walk in one direction, or a reader cannot tell an omission from a
    re-ordering.
    """
    icons = table_rows(REL_GLOSSARY, ICON_ROW, ICON_TABLE)

    groups = []
    surfaces = []
    for row in icons:
        row_id, on, group = row[0], CODE_SPAN.findall(row[1]), row[2]
        if row_id == CLOSE_SURFACE_ROW:
            surfaces = on
        if COMMAND_PALETTE not in on or not group or group == EM_DASH:
            continue
        if group not in [seen for seen, _first in groups]:
            groups.append((group, row_id))

    if not surfaces:
        raise SystemExit('%s: table %s has no row %s, so the surfaces that have '
                         'a settled name cannot be read'
                         % (REL_GLOSSARY, ICON_TABLE, CLOSE_SURFACE_ROW))

    return {
        'icons': [row[0] for row in icons],
        'properties': [row[0] for row in
                       table_rows(REL_PROPERTY_ITEMS, PROPERTY_ROW,
                                  PROPERTY_TABLE)],
        # ⛔ A group is keyed by the FIRST row of table T-109 that sits in it.
        # The specification gives groups no id of their own, and minting one
        # (GRP-1 ..) would put a number in the code that no table holds. ⚠️ The
        # key moves if the rows are re-ordered -- which this function recomputes
        # every run, so the manuscript is told rather than left wrong.
        'paletteGroups': [first for _group, first in groups],
        'surfaces': surfaces,
        'notices': [row[0] for row in
                    table_rows(REL_REQUIREMENTS, NOTICE_ROW, NOTICE_TABLE)],
        'confirmation': list(CONFIRMATION_ANSWERS),
        'noticeDismiss': list(NOTICE_DISMISS),
        'confirmationMarks': list(CONFIRMATION_MARKS),
        'weekdays': list(WEEKDAYS),
        'assignments': [row[0] for row in
                        table_rows(REL_REQUIREMENTS, ASSIGNMENT_ROW,
                                   ASSIGNMENT_TABLE)],
        # ⛔ The same move again, for table T-023b. ⚠️ AR-1 is the arm that is
        # NO arm -- 「なし（既定）」 -- and it still needs a word, because the
        # palette shows what is armed and 「nothing」 is one of the answers.
        'arms': [row[0] for row in
                 table_rows(REL_REQUIREMENTS, ARM_ROW, ARM_TABLE)],
        # ⛔ The row id IS the key, the move `Notice.manner` already makes with
        # table T-037: a reason then points at one line of the specification
        # (1.9, "the first column is the row id"), and no camelCase vocabulary of
        # the code's is copied into the manuscript. ⚠️ RS-15 is the row a reason
        # with no row of its own falls to -- without it NT-1 (MUST) and NT-3a
        # (MUST) cannot be kept for a reason nobody has written down yet.
        'reasons': [row[0] for row in
                    table_rows(REL_REQUIREMENTS, REASON_ROW, REASON_TABLE)],
        # ⛔ The same move for the question a confirmation shows. ⚠️ No
        # nextStep: what to do next is NT-3a's clause, and a question already
        # offers the two answers table T-037's NT-7 settles.
        'questions': [row[0] for row in
                      table_rows(REL_REQUIREMENTS, QUESTION_ROW,
                                 QUESTION_TABLE)],
    }


# section -> (the key each entry is known by, the word fields it holds)
SHAPE = {
    'icons': ('rowId', ('label', 'hint')),
    'properties': ('rowId', ('label',)),
    'paletteGroups': ('firstRow', ('name',)),
    'surfaces': ('name', ('heading',)),
    'notices': ('rowId', ('manner',)),
    'confirmation': ('answer', ('text',)),
    'noticeDismiss': ('answer', ('text',)),
    'confirmationMarks': ('mark', ('text',)),
    'assignments': ('rowId', ('text',)),
    'arms': ('rowId', ('text',)),
    'reasons': ('rowId', ('text', 'nextStep')),
    'questions': ('rowId', ('text',)),
    'weekdays': ('weekday', ('text',)),
}


def word_problems(where, word):
    """A printed word is a dictionary of the two languages FR-038 admits."""
    if not isinstance(word, dict):
        return ['%s: is not a language dictionary' % where]
    missing = [lang for lang in LANGUAGES if lang not in word]
    extra = [key for key in word if key not in LANGUAGES]
    found = []
    if missing:
        found.append('%s: no %s' % (where, ', '.join(missing)))
    if extra:
        found.append('%s: %s is not a language' % (where, ', '.join(extra)))
    for lang in LANGUAGES:
        if lang in word and not isinstance(word[lang], str):
            found.append('%s/%s: is not a string' % (where, lang))
    return found


def problems(doc, wanted):
    """Everything that must hold before a single byte is written."""
    found = []
    for section in sorted(SHAPE):
        key_field, word_fields = SHAPE[section]
        entries = doc.get(section)
        if not isinstance(entries, list):
            found.append('%s: the manuscript has no such section' % section)
            continue
        keys = [entry.get(key_field) if isinstance(entry, dict) else None
                for entry in entries]
        if keys != wanted[section]:
            found.append(
                '%s: the manuscript holds %d entr(ies) and the specification '
                'asks for %d, or they are in a different order. Missing: %s. '
                'Not in the specification: %s'
                % (section, len(keys), len(wanted[section]),
                   ', '.join(k for k in wanted[section] if k not in keys) or '-',
                   ', '.join(str(k) for k in keys
                             if k not in wanted[section]) or '-'))
        for entry in entries:
            if not isinstance(entry, dict):
                found.append('%s: an entry is not an object' % section)
                continue
            where = '%s/%s' % (section, entry.get(key_field))
            for field in word_fields:
                if field not in entry:
                    found.append('%s: no %s' % (where, field))
                else:
                    found.extend(word_problems('%s/%s' % (where, field),
                                               entry[field]))
            for field in entry:
                if field != key_field and field not in word_fields:
                    found.append('%s: %s is not a field of this section'
                                 % (where, field))
    for section in doc:
        if section != '$comment' and section not in SHAPE:
            found.append('%s: is not a section this generator knows' % section)
    return found


def build(doc):
    """What reaches src/: the manuscript's own entries, under a banner.

    ⭐ Nothing is translated, re-ordered or filled in here. What the generator
    adds is the guarantee that the roster still matches the specification, and a
    signpost back to the manuscript (Chapter 6.2, MUST).
    """
    out = {'$comment': BANNER}
    for section in ('icons', 'properties', 'paletteGroups', 'surfaces', 'notices',
                    'reasons', 'questions', 'confirmation', 'noticeDismiss',
                    'confirmationMarks',
                    'assignments', 'arms', 'weekdays'):
        out[section] = doc[section]
    return json.dumps(out, ensure_ascii=False, indent=1) + '\n'


def counted(doc):
    return sum(len(doc[section]) * len(SHAPE[section][1]) for section in SHAPE)


def filled(doc):
    """How many entries the user has actually written a word into."""
    total = 0
    for section, (_key, word_fields) in SHAPE.items():
        for entry in doc[section]:
            for field in word_fields:
                if any(entry[field][lang] for lang in LANGUAGES):
                    total += 1
    return total


def main():
    wanted = roster()
    doc = json.load(io.open(path_of(REL_SOURCE), encoding='utf-8'))
    found = problems(doc, wanted)
    if found:
        for problem in found:
            say('  %s' % problem)
        say('%s does not match the specification; nothing was written'
            % REL_SOURCE)
        return 1

    if '--report' in sys.argv:
        for section in ('icons', 'paletteGroups', 'surfaces', 'notices',
                        'reasons', 'questions', 'confirmation', 'noticeDismiss',
                        'confirmationMarks',
                        'assignments', 'arms'):
            say('%-14s %3d entr(ies): %s'
                % (section, len(doc[section]),
                   ', '.join(str(e[SHAPE[section][0]]) for e in doc[section])))
        say('%d word(s), %d written' % (counted(doc), filled(doc)))
        return 0

    built = build(doc)
    out = path_of(REL_OUT)
    if '--check' in sys.argv:
        current = io.open(out, encoding='utf-8', newline='').read()
        current = current.replace('\r\n', '\n')
        if current != built:
            say('DRIFTED  %s no longer matches %s -- rerun %s'
                % (REL_OUT, REL_SOURCE, REL_SELF))
            return 1
        say('OK       %s matches %s (%d word(s), %d written)'
            % (REL_OUT, REL_SOURCE, counted(doc), filled(doc)))
        return 0

    io.open(out, 'w', encoding='utf-8', newline='\n').write(built)
    say('wrote %s  (%d word(s), %d written)'
        % (REL_OUT, counted(doc), filled(doc)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
