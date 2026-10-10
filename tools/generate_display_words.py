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
Every entry is `{"ja": "", "en": ""}` until the user fills it
(PND-160). Table T-109 refuses an English column in as many words --
one would settle dozens of names the glossary has not settled -- and a word
written by a machine settles exactly the same names.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

import spec_tables

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

REL_SOURCE = 'docs/spec/_source/display-words.json'
REL_GLOSSARY = 'docs/spec/_assets/tbl-glossary.md'
# ⭐ A GENERATED DOCUMENT READ BY A GENERATOR, which is safe in this one
# direction: `property_items_json_to_md.py` prints table T-016 from its own
# manuscript and this reads only the row ids out of it, so the two cannot
# disagree about which rows exist. ⚠️ `npm run gen` runs them in that order.
REL_PROPERTY_ITEMS = 'docs/spec/_assets/tbl-property-items.md'
# ⭐ The same one-way read, for CR-637: `tools/generate_help_roster.py` decides
# which rows of table T-036 the help lists as an item of their own (an
# assignment whose entrance item is left off the help joins them, FR-036), and
# this reads only those row ids. ⚠️ `npm run gen` runs it first (helproster).
REL_HELP_ROSTER = 'src/adapter/screen-renderer/help-roster.json'
REL_REQUIREMENTS = 'docs/spec/01-04-requirements.md'
REL_DESIGN = 'docs/spec/05-07-design.md'
REL_OUT = 'src/adapter/screen-renderer/display-words.json'
# ⛔ NOT IN THE DICTIONARY. The note under table T-018 (FR-009) says the
# abbreviations are symbols that do not change with the language, so FR-038's
# dictionary must not hold them -- they are generated from the table and used.
# They leave in a file of their own beside the dictionary.
REL_OUT_DEPENDENCY_KINDS = 'src/adapter/screen-renderer/dependency-kinds.json'
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
ARM_ROW = re.compile(r'^\| (AR-\d+[a-z]?) \|')
THEME_HUE_ROW = re.compile(r'^\| (TH-\d+[a-z]?) \|')
PROPERTY_ROW = re.compile(r'^\| (PR-\d+[a-z]?) \|')
SETTINGS_ROW = re.compile(r'^\| (K-\d+[a-z]?) \|')
SHORTCUT_ROW = re.compile(r'^\| (SK-\d+[a-z]?) \|')
EXPORT_FORMAT_ROW = re.compile(r'^\| (IO-\d+[a-z]?) \|')
INVARIANT_ROW = re.compile(r'^\| (IV-\d+[a-z]?) \|')
CODE_SPAN = re.compile(r'`([^`]+)`')

ICON_TABLE = 'T-109'
NOTICE_TABLE = 'T-037'
ASSIGNMENT_TABLE = 'T-023'
# ⛔ What the pointer is armed with. Table T-023b is the whole count of the
# arms FR-053's palette can put the pointer in, so an arm with no row here
# cannot be armed -- and until this section existed the screen printed the
# row id itself (DFC-10).
ARM_TABLE = 'T-023b'
# ⛔ The name a property item shows. Table T-016 carries the COLUMN of the
# file and not a shown name: FR-038 (MUST NOT) keeps every printed word in
# this dictionary. ⛔ Do not let the panel draw the column name itself --
# that is how `strokeColor` and `fadeInDays` reach the screen (DFC-81,
# DFC-84).
# ⚠️ ONE WORD PER ROW, NOT PER COLUMN. PR-14 carries two columns and its
# word has to fit on one line over both, so the word is the row's and is
# never built by joining the columns'.
PROPERTY_TABLE = 'T-016'
# The name a settings item shows. Table T-104 of the glossary is the whole
# count of the keys `documentSettings` carries and is the AUTHORITY ON THE
# NAME, and the paragraph under table T-006a (MUST) holds the surface that
# prints those settings to the same rule as the one that prints a property:
# the word on the screen is this dictionary's, and the internal spelling is
# (MUST NOT) never printed as it is -- which is what it was printing (DFC-233).
# ⚠️ ONE WORD PER ROW, NOT PER KEY, the same move PROPERTY_TABLE records.
# `K-103` names two keys and `K-105` names three, and a word per key would
# settle names table T-104 has not settled.
# ⭐ THE KEYS EACH ROW NAMES TRAVEL WITH THE WORD (`settings_keys` below).
# The surface holds a settings KEY and the dictionary is keyed by ROW, so
# something has to join them; read from the table every run it cannot go
# stale, and written out by hand it would be wrong the day it was written.
SETTINGS_TABLE = 'T-104'
# ⛔ FR-036 (MUST) lists on the help only the rows of table T-036 whose
# entrance is an em dash and whose assignment is not. A row that drives an
# entrance is shown on that entrance's item under the icon's own word, and a
# row with no assignment is not shown, so neither needs a word here (CR-377).
# Tables T-023a, T-023c and T-023d left the help with that change and their
# sections went with it.
# CR-637: a row whose entrance item the help leaves off (SK-8, entrance IC-52)
# is listed among the rows with no entrance, so it needs a word here too.
SHORTCUT_TABLE = 'T-036'
SHORTCUT_KEY_HEADING = u'割当'
SHORTCUT_ENTRANCE_HEADING = u'入口'
# ⭐ The words FR-036 asks for that no table holds as a row: the heading of
# the one block of assignments with no entrance, and the note on IC-54 that it
# is on the screen only while something is armed. FR-036 says the dictionary
# holds the note on IC-54's row, so that section is keyed by the row id.
# CR-635: every block of the help carries a heading, keyed by the block's name
# in the help roster (tools/generate_help_roster.py). CR-665: the palette's
# group moved under the Task Group Panel is a block of its own, with its own
# heading.
# ⚠️ These are KEYS, not words.
HELP_HEADINGS =('basics', 'browser', 'App Header', 'Task Group Panel',
                'Command Palette (continued)', 'Command Palette')
HELP_NOTES = ('IC-54', 'IC-20')
# ⭐ The notes below the columns of the help body (FR-036, CR-620): note *1
# names the bundle for using the Agent API from an AI app and the page that
# setting S-350 names. A note is not a row of any table, so it is keyed by its
# number, never by a minted row id. ⚠️ These are KEYS, not words.
HELP_FOOTNOTES = (1,)
# CR-622: the two words of the license lines below the help's columns
# (FR-069): the line naming the license, and the word that opens the folded
# full text. No table holds them as rows, so they are HELD HERE, the same move
# as SEARCH_PANEL_PARTS. The copyright line is not a word: it is NOTICE's own
# spelling, carried by generate_license.py. These are KEYS, not words.
HELP_LEGAL_PARTS = ('licensedUnder', 'fullText')
# The browser's own functions FR-036 lists on the help (table T-255, CR-405).
# Every row takes a word, including one the help does not show today: whether
# a row is shown is table T-255's closing rule, read by generate_help_roster.py.
BROWSER_FUNCTION_ROW = re.compile(r'^\| (BF-\d+[a-z]?) \|')
BROWSER_FUNCTION_TABLE = 'T-255'
# ⭐ The words and the next step for a document refused on import. FR-076 has
# the refusal carry the row of table T-220 it broke, and the words are looked
# up by that row id exactly as a reason is by its row of table T-233.
INVARIANT_TABLE = 'T-220'
# ⛔ The name of a format the export chooser offers. FR-096 (MUST) has the
# chooser show the format by the word this dictionary holds and forbids the
# row id on the screen (MUST NOT) -- which is what it was printing (DFC-118).
# ⚠️ THE NAME ONLY, NEVER THE EXTENSION. FR-096 (MUST NOT) keeps the
# extension in table T-024 alone, so it travels from the table and a second
# copy is never made here.
EXPORT_FORMAT_TABLE = 'T-024'
# ⛔ WHICH ROWS OF THAT TABLE ARE OFFERED IS NOT THIS FILE'S TO DECIDE, and
# the whole table is not the answer: IO-5 is the browser store and IO-6 is
# the clipboard, and FR-096 (MUST NOT) puts neither on the chooser -- the
# first has no write direction of the kind offered, and the second does not
# come out as a file, so it has no name to propose. FR-025 carries IO-6 on
# IC-3 instead.
EXPORT_FORMATS_NOT_OFFERED = ('IO-5', 'IO-6')
# ⭐ The reasons a telling can carry (table T-233) and the sentences a question
# shows (table T-234: the whole count of the places NT-7 lets GRS ask, so a
# question with no row there cannot be raised) are read from the notice
# roster's manuscript, not from a printed table (CR-712, JDG-1751). The two
# tables are printed from that manuscript, so the rows and their order are the
# same; reading the manuscript keeps this generator independent of the order
# `npm run gen` prints them in.
REL_NOTICE_REASONS = 'docs/spec/_source/notice-reasons.json'
# The theme hues the document settings surface offers (FR-041, CR-557). The
# rows hold a hue and no word, so the word is this dictionary's, keyed by the
# row id exactly as a reason is.
THEME_HUE_TABLE = 'T-305'

# The surface whose entry closes an open surface. Its 面 column is the roster of
# surfaces table T-103 has settled a name for -- CR-191 and CR-193 both added a
# name to that one cell, which is what makes it the roster rather than a list.
CLOSE_SURFACE_ROW = 'IC-52'
# ⛔ A SURFACE ON THAT ROSTER THAT PRINTS NO HEADING HOLDS NO HEADING WORD.
# FR-072 (MUST NOT) puts no heading row at the head of the properties panel, so
# a word kept for it would be a word no screen prints (CR-711).
SURFACES_WITHOUT_HEADING = ('Properties Panel',)

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
# both languages, and the manuscript is where it is
# written. ⛔ It is deliberately NOT a row of table T-109: that table is the roster
# of ENTRANCES DRAWN AS SHAPES (FR-029), and this one is a word, the way NT-7's
# two answers are.
NOTICE_DISMISS = ('dismiss',)

# The caveat FR-032 (MUST) puts on a listed item: a `Task` that goes with the
# task group being deleted but is DRAWN on another task group, which HM-10 of table T-015a is
# what makes possible. FR-032 settles the medium as a WORD and forbids raising a
# glyph for it, RC-13 of table T-026 keeping shapes as the user's own ruling.
# ⛔ Held here rather than read from a table for the reason above it: no table
# holds these as rows. ⚠️ These are KEYS, not words.
CONFIRMATION_MARKS = ('shownOnAnotherTaskGroup',)

# What the header shows in place of a time when the document has never been
# written to a file (FR-101, MUST: 「時刻の代わりにその旨を示すこと」).
# ⛔ HELD HERE RATHER THAN READ FROM A TABLE, for the reason above: no table
# holds it as a row, and Chapter 6.2 forbids a table whose only column would
# be the word itself. ⚠️ The NAME beside it needs no word -- FR-101 asks for
# a substitute for the TIME alone, and an empty name line is not a claim.
# ⚠️ These are KEYS, not words.
FILE_STATUS = ('neverSaved',)

# CR-628: the App Header's Branding (U-35, table T-349 of FR-051) prints the
# product's short name (BR-1); the word itself is the user's, in the
# manuscript. HELD HERE, the same move as FILE_STATUS: BR-1 states it in prose
# and no table holds it as a row. KEYS, not words.
BRANDING_PARTS = ('logo',)

# The name a task group settles on when it has none of its own. FR-032 (MUST) has a
# task group whose derivation source is being deleted settle its name before the Task
# goes, and (MUST NOT) forbids refusing the deletion because that source never
# had a name -- which is the ordinary case, since FR-001 draws a nameless Task
# and derives the new task group's name from it. The requirement states the rule and
# says in as many words that the WORD is this dictionary's and is not spelled
# there.
# ⛔ HELD HERE RATHER THAN READ FROM A TABLE, the same move as FILE_STATUS above
# and for the same reason: no table holds it as a row, and Chapter 6.2 forbids a
# table whose only column would be the word itself.
# ⚠️ ONE KEY AND NOT ONE PER ENTRANCE. `taskGroup` is the default name of a TASK GROUP, not
# of "a task group CM-7 settled" -- FR-032's settle and the task group a document with no task groups
# raises want the same word, and two keys would let them drift apart.
# ⚠️ These are KEYS, not words.
DEFAULT_NAMES = ('taskGroup',)

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

# The word SE-2 of table T-260 (MUST) puts after the percentage when a press at
# an end step changed nothing: one for the largest step, one for the smallest.
# ⛔ HELD HERE RATHER THAN READ FROM A TABLE, the same move as FILE_STATUS: SE-2
# states the two in prose and no table holds them as rows (CR-411 decision 9).
# ⚠️ These are KEYS, not words.
SCALE_ECHO_ENDS = ('max', 'min')

# The lines DC-3 of table T-029a (MUST) shows beside the pointer while the
# Dual Cursor mode is on: the earlier date (left), the later date (right), and
# the interval between them, whose value is `days`, or `oneDay` when the count
# is 1. HELD HERE, the same move as SCALE_ECHO_ENDS: DC-3 states the lines in
# prose and no table holds them as rows (CR-550, CR-626). KEYS, not words.
DUAL_CURSOR_READOUT_LINES = ('left', 'right', 'span', 'days', 'oneDay')

# The parts of the color field of the properties panel (CV-9 of table
# T-017b, CR-548): the entrance to a custom color, the two theme swatches and
# the note on an undefined side, and the entrance back to the theme with the
# hint it shows (E-44, JDG-405). HELD HERE, the same move as SCALE_ECHO_ENDS:
# CV-9 states them in prose and no table holds them as rows. KEYS, not words.
# The hint is a part of its own: this section's entries carry one word each.
#
# CR-606 (CV-9's new order, JDG-863 / JDG-990): the transparent entrance reads
# noFill on a fill field and noLine on a line field; the null marks themeMark /
# defaultMark stand where the value would; defaultColor is the word of the
# entrance back to a null that does not follow the theme hue (S-312, S-147).
#
# CR-689 (JDG-1556, JDG-1656): the field is two rows of swatches only. The
# light/dark side rows, their notes and the null marks left; the entrances are
# swatches carrying a glyph (themeGlyph, customGlyph) and say what they are in
# their tooltips; customValue is the custom entrance's tooltip with the value.
COLOR_FIELD_PARTS = ('custom', 'themeHint', 'noFill', 'noLine', 'defaultColor',
                      'themeGlyph', 'customGlyph', 'customValue')

# CR-606 E-28: the words of the properties panel's rows that no table holds as
# rows -- how one end of a dependency is written ({name} and {uid} slots, the
# read-only rows PR-37/PR-38/PR-43/PR-44) and the item that adds a resource
# (AS-5, {name} slot). HELD HERE, the same move as COLOR_FIELD_PARTS. KEYS,
# not words.
#
# CR-689: the three words of the parent task field (PTL-15 2-4, JDG-1133 /
# JDG-1467), the unit words beside the outline width and the actual length
# (FR-006), the lag and the kind tooltips of a dependency line in PR-37 / PR-38
# ({lag} and {abbreviation} slots, JDG-1653), and the tooltip of PR-8
# (JDG-1654).
PROPERTY_FIELD_PARTS = ('dependencyEnd', 'addResource', 'derivedParent',
                        'undecidedParent', 'noParent', 'pxUnit', 'daysUnit',
                        'lagDays', 'linkHintFS', 'linkHintSF', 'linkHintFF',
                        'linkHintSS', 'resumeValidHint')

# CR-582: the parts of a task group's min height field (table T-338): the unit beside
# the value (MH-1), the current height with its `{px}` slot (MH-3), the word an
# empty field shows (MH-2), and the word that replaces the current height while
# the task group is not drawn (MH-6). HELD HERE, the same move as COLOR_FIELD_PARTS:
# table T-338 states them in prose and no table holds them as rows. KEYS, not
# words.
#
# CR-689 (JDG-1559, JDG-1569, JDG-1656): the field is three lines -- the check
# (MH-2, enable), the value with its unit and the basis tooltip (MH-1), and the
# read-only current height (MH-3, currentName / currentValue). `none` left: no
# word stands for null (MH-2), the check does.
ROW_MIN_HEIGHT_FIELD_PARTS = ('enable', 'unit', 'basisHint', 'currentName',
                              'currentValue', 'currentlyHidden')
# CR-690: the document settings panel's task group panel width field (table
# T-368: the unit WF-2, the read-only current width WF-3) and fit span field
# (table T-367: the read-only shown span FX-6, the copy entrance FX-7). No
# table holds these words as rows, so they are HELD HERE, the same move as
# ROW_MIN_HEIGHT_FIELD_PARTS. KEYS, not words.
TASK_GROUP_PANEL_WIDTH_FIELD_PARTS = ('unit', 'currentName', 'currentValue')
FIT_SPAN_FIELD_PARTS = ('currentName', 'currentValue', 'copyCurrent')

# CR-571: the search panel (FR-151). The column headings are READ from table
# T-331 and the state words from table T-019a, the move `reasons` makes with
# table T-233. The two words no table holds as rows -- the value list's
# blank entry (SV-7) and the name of a nameless task (SQ-1) -- are HELD HERE,
# the same move as COLOR_FIELD_PARTS. KEYS, not words. CR-621 retired the
# third (the label IC-121 carried while maximized): the window title row draws
# IC-131 in its place instead (table T-335). CR-661 added the two values of the
# SQ-10 value list, the reason IC-143 is disabled (TV-5), the band U-67 (TV-11)
# with its word entrance (no row of table T-109: a word, not an icon) and the
# picture caption IX-11: no table holds them as rows either. CR-686 added the
# labels of the two date inputs a date column's filter offers (SV-7). CR-721
# renamed the two SQ-10 values to showValue / hideValue (Show / Hide) and
# retired the picture caption: IX-11 no longer writes the band's words.
# CR-722: the band now names the tables whose Schedule Filter is on (TV-11),
# so its words became scheduleFilterBar with a {tables} slot, the separator
# between two table names became tableNameSeparator, its word entrance
# became scheduleFilterOff (it turns every table's Schedule Filter off, TV-8),
# and the reason IC-143 is disabled became nothingHidden (TV-5).
SEARCH_COLUMN_ROW = re.compile(r'^\| (SQ-\d+[a-z]?) \|')
SEARCH_COLUMN_TABLE = 'T-331'
PLAN_ACTUAL_STATE_ROW = re.compile(r'^\| (PS-\d+[a-z]?) \|')
PLAN_ACTUAL_STATE_TABLE = 'T-019a'
SEARCH_PANEL_PARTS = ('blank', 'noName', 'filterSearch', 'dateFrom', 'dateTo', 'showValue',
                      'hideValue', 'nothingHidden', 'scheduleFilterBar', 'scheduleFilterOff',
                      'tableNameSeparator')
# CR-722: the Resource List window (FR-099). Its column headings are READ from
# table T-371, the move `delayReportColumns` makes with table T-347. The
# name of the row that holds the tasks with no resource (RO-5) and the
# separator between two task names in one cell (RQ-5) are no table's rows,
# so they are HELD HERE, the same move as SEARCH_PANEL_PARTS. KEYS, not words.
RESOURCE_LIST_COLUMN_ROW = re.compile(r'^\| (RQ-\d+[a-z]?) \|')
RESOURCE_LIST_COLUMN_TABLE = 'T-371'
RESOURCE_LIST_PARTS = ('unassigned', 'taskSeparator')
# CR-623: the Open Chooser (U-56, row OP-16 of table T-024a). The labels of
# its file line and document-title line, and the word beside its cancel row,
# are no table's rows, so they are HELD HERE, the same move as
# SEARCH_PANEL_PARTS. KEYS, not words.
OPEN_CHOOSER_PARTS = ('file', 'documentTitle', 'cancel')
# CR-727: the one line the Drop Cue (U-68) shows while a file is dragged over
# the window (OP-17 of table T-024a). No table holds it as a row, so it is
# HELD HERE, the same move as OPEN_CHOOSER_PARTS. KEYS, not words. A section
# of its own, not a part of openChooser: the line is a sentence, and check 32
# reads openChooser.text as names in Title Case (JDG-1862).
DROP_CUE_PARTS = ('dropToOpen',)
# CR-712: the note the Difference Review (U-61) always shows while it offers
# "take in as a separate task" (MG-10 of table T-032). No table holds it as a
# row, so it is HELD HERE, the same move as OPEN_CHOOSER_PARTS. KEYS, not words.
DIFFERENCE_REVIEW_PARTS = ('separateNote',)
# CR-677: the one line the Export Chooser (U-54, FR-096) shows under its
# format grid while the document fixes its fit span (S-532, CR-690). No
# table holds it as a row, so it is HELD HERE, the same move as
# OPEN_CHOOSER_PARTS. KEYS, not words.
EXPORT_CHOOSER_PARTS = ('fitSpan',)
# CR-631: the two choices QN-12 of table T-234 offers when a selection mixes
# tasks and parent task arrows (PTL-13 of table T-351): the first in its armed
# and its unarmed wording (JDG-1142), then the arrows. Not NT-7's Yes / No, and
# no table holds them as rows, so they are HELD HERE, the same move as
# OPEN_CHOOSER_PARTS. KEYS, not words.
PARENT_TASK_CHOICE_PARTS = ('childTasks', 'tasks', 'links')

# CR-624: the words that head two lines of the hint a rested pointer shows
# (table T-348 of FR-092): the plan line (TL-5) and the actual line (TL-6).
# HELD HERE, the same move as OPEN_CHOOSER_PARTS: the other rows of table
# T-348 carry no word of their own (the deadline line reuses PR-10's word, the
# weekday reuses `weekdays`, and TL-9 / TL-11 forbid a second word), so a
# roster of every row would ask for words the specification forbids. The row
# id IS the key, and `hint_lines` checks each one is still a row of the table.
# CR-648: the Delay Diagnostics Report window (FR-134, table T-346). The column
# headings are READ from table T-347, the move `searchColumns` makes with table
# T-331. The statuses are DT-1's six in its order, each keyed by the row it is
# made of -- four rows of table T-315, and the two rows of table T-317 DT-1 names
# for the doubtful-or-missing finding (DX-3) and the settled push-out (DX-9) --
# so no word of the code's vocabulary enters the manuscript. They are HELD HERE
# and `delay_report_statuses` checks each still stands in its table. The summary line (RW-4), the Markdown labels
# (RW-6) and the sentence patterns of DT-7 are no table's rows either: HELD
# HERE, the same move as SEARCH_PANEL_PARTS. KEYS, not words.
DELAY_REPORT_COLUMN_ROW = re.compile(r'^\| (DT-\d+[a-z]?) \|')
DELAY_REPORT_COLUMN_TABLE = 'T-347'
DELAY_MARKER_ROW = re.compile(r'^\| (DG-\d+[a-z]?) \|')
DELAY_MARKER_TABLE = 'T-315'
DELAY_REPORT_ROW = re.compile(r'^\| (DX-\d+[a-z]?) \|')
DELAY_REPORT_TABLE = 'T-317'
DELAY_REPORT_STATUSES = ('DG-1', 'DX-3', 'DG-2', 'DG-3', 'DG-4', 'DX-9')
DELAY_REPORT_SUMMARY_PARTS = ('statusDate', 'afterStatusDate', 'count', 'between',
                              'unreliable')
DELAY_REPORT_MARKDOWN_PARTS = ('documentName', 'madeAt', 'filter', 'none')
DELAY_REPORT_REASON_PARTS = ('bottleneck', 'bottleneckPath', 'late', 'settled',
                             'finding', 'wall', 'missingActual',
                             'milestoneAchieved', 'parentProgressOutside',
                             'proposal')
# CR-670: the aspect word DT-7 prints for a finding (one per row of tables
# T-310 and T-311) and the wall word it prints for a wall (one per row of table
# T-316). READ from the tables, the move `delayReportColumns` makes. VS-6 is
# left out: it speaks in its own told words, `parentProgressOutside` above.
DELAY_ASPECT_ROW = re.compile(r'^\| (V[CS]-\d+[a-z]?) \|')
DELAY_ASPECT_TABLES = ('T-310', 'T-311')
DELAY_ASPECTS_WITH_OWN_WORDS = ('VS-6',)
DELAY_WALL_ROW = re.compile(r'^\| (DW-\d+[a-z]?) \|')
DELAY_WALL_TABLE = 'T-316'
# CR-731: the fix proposals and the fix log of the Delay Diagnostics Report
# (FR-155). The column headings are READ from table T-374, the move
# `delayReportColumns` makes with table T-347. The count beside the two
# fix entrances (RW-12), the counter of RW-14, the four fix types of table
# T-373, the suggested-date mark, the empty choice, the hint of a by-hand row,
# the cascade prefix, the read-only reason (FM-8, FM-4) and the two notices
# FR-155 tells are no table's rows: HELD HERE, the same move as
# DELAY_REPORT_REASON_PARTS. KEYS, not words.
DELAY_FIX_COLUMN_ROW = re.compile(r'^\| (FM-\d+[a-z]?) \|')
DELAY_FIX_COLUMN_TABLE = 'T-374'
DELAY_FIX_PARTS = ('fixCount', 'humanCounter', 'automatic', 'choose',
                   'suggestedDate', 'byHand', 'suggested', 'choosePlaceholder',
                   'openFieldHint', 'cascadePrefix', 'readOnlyReason',
                   'fixedNotice', 'refusedNotice')

HINT_LINE_ROW = re.compile(r'^\| (TL-\d+[a-z]?) \|')
HINT_LINE_TABLE = 'T-348'
HINT_LINES = ('TL-5', 'TL-6')

# The palette colors are keyed by their stored spelling, READ from the key
# column of table T-294 in settings.json, so a new color needs no edit here.
REL_SETTINGS = 'docs/spec/_source/settings.json'
PALETTE_TABLE = 'T-294'

# Table T-018 names each dependency kind; the screen shows the abbreviation
# before the full-width parenthesis of its name column (CR-541, the note under
# table T-018). NOT a dictionary word: the abbreviation does not change with
# the language, so it is read from the table and carried into src/ only.
DEPENDENCY_KIND_ROW = re.compile(r'^\| (DP-\d+) \|')
DEPENDENCY_KIND_TABLE = 'T-018'

LANGUAGES = ('ja', 'en')

# ⭐ THE WORDS ARE THE USER'S. The filling is left to the user, because table
# T-109 refuses an English column in as many words and a word written by an
# agent settles the very names that refusal protects. ⛔ Do not state here
# how many entries are filled or empty: the count below is printed on every
# run instead, so the claim cannot rot.
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

DEPENDENCY_KINDS_BANNER = (
    'GENERATED -- do not edit by hand. Generated from table %s of %s by %s. '
    'Rebuild: npm run gen -- npm run gen:check fails on drift. The '
    'abbreviations are symbols that do not change with the language, so they '
    'are not in the dictionary of FR-038 (the note under table %s).'
    % (DEPENDENCY_KIND_TABLE, REL_REQUIREMENTS, REL_SELF, DEPENDENCY_KIND_TABLE))


def say(message):
    """⛔ The Windows console is cp932 and these messages quote the marks the
    specification uses. Writing them raw raised UnicodeEncodeError from INSIDE
    the problem reporter, so a bad manuscript killed the run with a stack trace
    instead of naming the row. Same guard as settings_json_to_md.py's `say`.
    """
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def table_rows(rel, row_pattern, table):
    """Every row of one table, in the order it is printed.

    ⭐ THE WALK IS `tools/spec_tables.py`'S NOW. It stops at the next
    caption, which the copy that stood here did not: that one set a flag
    when it saw its caption and then took every row matching its pattern to
    the end of the file, safe only while no other table used the same
    row-id shape and with nothing enforcing that.

    ⚠️ `row_pattern` IS STILL APPLIED, against the row id rather than the
    line. A caption owns rows that are not part of its roster -- table
    T-023a carries a second block with no row ids at all -- and the pattern
    is what each caller uses to say which rows it means.

    @purity semi-pure-b
    """
    found = [row.cells for row in spec_tables.read(rel, table)
             if row_pattern.match('| %s |' % row.id)]
    if not found:
        raise SystemExit('%s: table %s has no rows the caller recognizes -- '
                         'the needle no longer matches the document'
                         % (rel, table))
    return found


def notice_roster(key):
    """The row ids of one list of the notice roster, in its printed order.

    `reasons` is table T-233 and `questions` is table T-234 (CR-712).

    ⛔ A row that shares the words of another (`wordsOf`, CR-712 X-2) has NO
    entry: the screen prints the row it names, and an entry of its own would
    be a word nothing prints (FR-076).

    @purity semi-pure-b
    """
    with io.open(path_of(REL_NOTICE_REASONS), encoding='utf-8') as handle:
        found = [one['id'] for one in json.load(handle)[key]
                 if 'wordsOf' not in one]
    if not found:
        raise SystemExit('%s: the list %s has no rows' % (REL_NOTICE_REASONS, key))
    return found


def invariants_sharing_words():
    """The rows of table T-220 whose words are a reason's (CR-712).

    @purity semi-pure-b
    """
    with io.open(path_of(REL_NOTICE_REASONS), encoding='utf-8') as handle:
        found = json.load(handle)['invariantRefusals'].get('wordsOf', {})
    return set(found)


def settings_keys():
    """Which settings keys each row of table T-104 names, in the table's order.

    ⭐ THE JOIN THE SURFACE NEEDS, READ RATHER THAN WRITTEN DOWN. `IC-17` of
    table T-109 puts the document's settings on the Properties Panel, and what
    that side holds is a settings KEY -- while this dictionary is keyed by the
    row of table T-104, which is where the name lives. ⛔ A map written out in
    `src/` would be wrong the day it was written: the two rosters already
    disagree in both directions, and rule 03 section 1 forbids a value copied
    out of the specification by hand.

    ⚠️ A row may name several keys (`K-103`, `K-105`), and the order is the
    table's own -- rule 03 section 4, the same reason `roster` gives.

    @purity semi-pure-b
    """
    return dict((row[0], CODE_SPAN.findall(row[2]))
                for row in table_rows(REL_GLOSSARY, SETTINGS_ROW,
                                      SETTINGS_TABLE))


def color_spellings():
    """The stored spellings of table T-294, in the table's order.

    @purity semi-pure-b
    """
    doc = json.load(io.open(path_of(REL_SETTINGS), encoding='utf-8'))
    for block in doc['blocks']:
        if block['kind'] == 'table' and block.get('id') == PALETTE_TABLE:
            return [row['key'].strip('`') for row in block['rows']]
    raise SystemExit('%s: no table %s' % (REL_SETTINGS, PALETTE_TABLE))


def listed_shortcuts():
    """The rows of table T-036 FR-036 lists as their own item, in print order.

    Those are the rows with no entrance and an assignment, and (CR-637) the
    rows the help roster lists because their entrance item is left off.

    @purity semi-pure-b
    """
    roster = json.load(io.open(path_of(REL_HELP_ROSTER), encoding='utf-8'))
    on_help = set(entry['row'] for entry in roster['entries']
                  if entry['kind'] == 'item' and entry['table'] == SHORTCUT_TABLE)
    found = []
    for row in spec_tables.read(REL_REQUIREMENTS, SHORTCUT_TABLE):
        if not SHORTCUT_ROW.match('| %s |' % row.id):
            continue
        keys = row.cell(SHORTCUT_KEY_HEADING).strip()
        entrance = row.cell(SHORTCUT_ENTRANCE_HEADING).strip()
        if (entrance == EM_DASH and keys not in ('', EM_DASH)) or row.id in on_help:
            found.append(row.id)
    if not found:
        raise SystemExit('%s: table %s lists no assignment without an entrance'
                         % (REL_REQUIREMENTS, SHORTCUT_TABLE))
    return found


def hint_lines():
    """The rows of table T-348 that own a word, after checking they exist.

    @purity semi-pure-b
    """
    rows = [row[0] for row in
            table_rows(REL_REQUIREMENTS, HINT_LINE_ROW, HINT_LINE_TABLE)]
    missing = [row for row in HINT_LINES if row not in rows]
    if missing:
        raise SystemExit('%s: table %s has no row %s, so the hint line words '
                         'cannot be keyed' % (REL_REQUIREMENTS, HINT_LINE_TABLE,
                                              ', '.join(missing)))
    return list(HINT_LINES)


def delay_report_statuses():
    """DT-1's statuses, after checking their rows still stand.

    @purity semi-pure-b
    """
    rows = ([row[0] for row in table_rows(REL_REQUIREMENTS, DELAY_MARKER_ROW,
                                          DELAY_MARKER_TABLE)]
            + [row[0] for row in table_rows(REL_REQUIREMENTS, DELAY_REPORT_ROW,
                                            DELAY_REPORT_TABLE)])
    missing = [status for status in DELAY_REPORT_STATUSES if status not in rows]
    if missing:
        raise SystemExit('%s: tables %s and %s have no row %s, so the report '
                         'statuses cannot be keyed'
                         % (REL_REQUIREMENTS, DELAY_MARKER_TABLE,
                            DELAY_REPORT_TABLE, ', '.join(missing)))
    return list(DELAY_REPORT_STATUSES)


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
        'settings': list(settings_keys()),
        'shortcuts': listed_shortcuts(),
        'helpHeadings': list(HELP_HEADINGS),
        'helpLegal': list(HELP_LEGAL_PARTS),
        'helpNotes': list(HELP_NOTES),
        'helpFootnotes': list(HELP_FOOTNOTES),
        'browserFunctions': [row[0] for row in
                             table_rows(REL_REQUIREMENTS, BROWSER_FUNCTION_ROW,
                                        BROWSER_FUNCTION_TABLE)],
        # ⛔ The same move for a row of table T-220 that shares the words of a
        # reason (`invariantRefusals.wordsOf` of the notice roster, CR-712).
        'invariants': [row[0] for row in
                       table_rows(REL_DESIGN, INVARIANT_ROW, INVARIANT_TABLE)
                       if row[0] not in invariants_sharing_words()],
        'exportFormats': [row[0] for row in
                          table_rows(REL_REQUIREMENTS, EXPORT_FORMAT_ROW,
                                     EXPORT_FORMAT_TABLE)
                          if row[0] not in EXPORT_FORMATS_NOT_OFFERED],
        # ⛔ A group is keyed by the FIRST row of table T-109 that sits in it.
        # The specification gives groups no id of their own, and minting one
        # (GRP-1 ..) would put a number in the code that no table holds. ⚠️ The
        # key moves if the rows are re-ordered -- which this function recomputes
        # every run, so the manuscript is told rather than left wrong.
        'paletteGroups': [first for _group, first in groups],
        'surfaces': [name for name in surfaces
                     if name not in SURFACES_WITHOUT_HEADING],
        'notices': [row[0] for row in
                    table_rows(REL_REQUIREMENTS, NOTICE_ROW, NOTICE_TABLE)],
        'confirmation': list(CONFIRMATION_ANSWERS),
        'noticeDismiss': list(NOTICE_DISMISS),
        'confirmationMarks': list(CONFIRMATION_MARKS),
        'fileStatus': list(FILE_STATUS),
        'branding': list(BRANDING_PARTS),
        'defaultNames': list(DEFAULT_NAMES),
        'weekdays': list(WEEKDAYS),
        'colorNames': color_spellings(),
        'colorField': list(COLOR_FIELD_PARTS),
        'propertyField': list(PROPERTY_FIELD_PARTS),
        'rowMinHeightField': list(ROW_MIN_HEIGHT_FIELD_PARTS),
        'taskGroupPanelWidthField': list(TASK_GROUP_PANEL_WIDTH_FIELD_PARTS),
        'scaleEcho': list(SCALE_ECHO_ENDS),
        'dualCursorReadout': list(DUAL_CURSOR_READOUT_LINES),
        'searchColumns': [row[0] for row in
                          table_rows(REL_REQUIREMENTS, SEARCH_COLUMN_ROW,
                                     SEARCH_COLUMN_TABLE)],
        'planActualStates': [row[0] for row in
                             table_rows(REL_REQUIREMENTS, PLAN_ACTUAL_STATE_ROW,
                                        PLAN_ACTUAL_STATE_TABLE)],
        'searchPanel': list(SEARCH_PANEL_PARTS),
        'resourceListColumns': [row[0] for row in
                                table_rows(REL_REQUIREMENTS, RESOURCE_LIST_COLUMN_ROW,
                                           RESOURCE_LIST_COLUMN_TABLE)],
        'resourceList': list(RESOURCE_LIST_PARTS),
        'delayReportColumns': [row[0] for row in
                               table_rows(REL_REQUIREMENTS, DELAY_REPORT_COLUMN_ROW,
                                          DELAY_REPORT_COLUMN_TABLE)],
        'delayReportStatuses': delay_report_statuses(),
        'delayReportSummary': list(DELAY_REPORT_SUMMARY_PARTS),
        'delayReportMarkdown': list(DELAY_REPORT_MARKDOWN_PARTS),
        'delayReportReasons': list(DELAY_REPORT_REASON_PARTS),
        'delayReportAspects': [row[0] for table in DELAY_ASPECT_TABLES
                               for row in table_rows(REL_REQUIREMENTS,
                                                     DELAY_ASPECT_ROW, table)
                               if row[0] not in DELAY_ASPECTS_WITH_OWN_WORDS],
        'delayReportWalls': [row[0] for row in
                             table_rows(REL_REQUIREMENTS, DELAY_WALL_ROW,
                                        DELAY_WALL_TABLE)],
        'delayFixColumns': [row[0] for row in
                            table_rows(REL_REQUIREMENTS, DELAY_FIX_COLUMN_ROW,
                                       DELAY_FIX_COLUMN_TABLE)],
        'delayFixes': list(DELAY_FIX_PARTS),
        'fitSpanField': list(FIT_SPAN_FIELD_PARTS),
        'exportChooser': list(EXPORT_CHOOSER_PARTS),
        'openChooser': list(OPEN_CHOOSER_PARTS),
        'dropCue': list(DROP_CUE_PARTS),
        'differenceReview': list(DIFFERENCE_REVIEW_PARTS),
        'parentTaskChoice': list(PARENT_TASK_CHOICE_PARTS),
        'hintLines': hint_lines(),
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
        'reasons': notice_roster('reasons'),
        # ⛔ The same move for the question a confirmation shows. ⚠️ No
        # nextStep: what to do next is NT-3a's clause, and a question already
        # offers the two answers table T-037's NT-7 settles.
        'questions': notice_roster('questions'),
        'themeHues': [row[0] for row in
                      table_rows(REL_REQUIREMENTS, THEME_HUE_ROW,
                                 THEME_HUE_TABLE)],
    }


# section -> (the key each entry is known by, the word fields it holds)
SHAPE = {
    'icons': ('rowId', ('label', 'hint')),
    'properties': ('rowId', ('label',)),
    'settings': ('rowId', ('label',)),
    'shortcuts': ('rowId', ('text',)),
    'helpHeadings': ('block', ('text',)),
    'helpLegal': ('part', ('text',)),
    'helpNotes': ('rowId', ('text',)),
    'helpFootnotes': ('footnote', ('text',)),
    'browserFunctions': ('rowId', ('text',)),
    'invariants': ('rowId', ('text', 'nextStep')),
    'exportFormats': ('rowId', ('name',)),
    'paletteGroups': ('firstRow', ('name',)),
    'surfaces': ('name', ('heading',)),
    'notices': ('rowId', ('manner',)),
    'confirmation': ('answer', ('text',)),
    'noticeDismiss': ('answer', ('text',)),
    'confirmationMarks': ('mark', ('text',)),
    'fileStatus': ('state', ('text',)),
    'branding': ('part', ('text',)),
    'defaultNames': ('use', ('text',)),
    # ⛔ TWO WORDS PER ROW. `text` is the 動作 column's -- what the gesture
    # does -- and `press` is the gesture itself, which FR-036 (MUST) puts in
    # this dictionary because 「ホイール」 needs translating where `Ctrl+S`
    # does not.
    'assignments': ('rowId', ('text', 'press')),
    'arms': ('rowId', ('text',)),
    'reasons': ('rowId', ('text', 'nextStep')),
    'questions': ('rowId', ('text',)),
    'weekdays': ('weekday', ('text',)),
    'colorNames': ('spelling', ('text',)),
    'colorField': ('part', ('text',)),
    'propertyField': ('part', ('text',)),
    'rowMinHeightField': ('part', ('text',)),
    'taskGroupPanelWidthField': ('part', ('text',)),
    'themeHues': ('rowId', ('text',)),
    'scaleEcho': ('end', ('text',)),
    'dualCursorReadout': ('line', ('text',)),
    'searchColumns': ('rowId', ('text',)),
    'planActualStates': ('rowId', ('text',)),
    'searchPanel': ('part', ('text',)),
    'resourceListColumns': ('rowId', ('text',)),
    'resourceList': ('part', ('text',)),
    'delayReportColumns': ('rowId', ('text',)),
    'delayReportStatuses': ('rowId', ('text',)),
    'delayReportSummary': ('part', ('text',)),
    'delayReportMarkdown': ('part', ('text',)),
    'delayReportReasons': ('part', ('text',)),
    'delayReportAspects': ('rowId', ('text',)),
    'delayReportWalls': ('rowId', ('text',)),
    'delayFixColumns': ('rowId', ('text',)),
    'delayFixes': ('part', ('text',)),
    'fitSpanField': ('part', ('text',)),
    'exportChooser': ('part', ('text',)),
    'openChooser': ('part', ('text',)),
    'dropCue': ('part', ('text',)),
    'differenceReview': ('part', ('text',)),
    'parentTaskChoice': ('part', ('text',)),
    'hintLines': ('rowId', ('text',)),
}


# section -> the word fields an entry MAY carry beside SHAPE's. CR-606 E-17:
# PR-1 names a milestone's name with its own word (FR-006), under the same row.
OPTIONAL_WORD_FIELDS = {
    'properties': ('milestoneLabel',),
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
            optional = OPTIONAL_WORD_FIELDS.get(section, ())
            for field in optional:
                if field in entry:
                    found.extend(word_problems('%s/%s' % (where, field),
                                               entry[field]))
            for field in entry:
                if (field != key_field and field not in word_fields
                        and field not in optional):
                    found.append('%s: %s is not a field of this section'
                                 % (where, field))
    for section in doc:
        if section != '$comment' and section not in SHAPE:
            found.append('%s: is not a section this generator knows' % section)
    return found


def build(doc, keys_by_row):
    """What reaches src/: the manuscript's own entries, under a banner.

    ⭐ Nothing is translated, re-ordered or filled in here. What the generator
    adds is the guarantee that the roster still matches the specification, and a
    signpost back to the manuscript (Chapter 6.2, MUST).

    ⚠️ ONE SECTION LEAVES WITH MORE THAN THE MANUSCRIPT WROTE. A settings entry
    carries the KEYS its row of table T-104 names beside its word, for the reason
    `settings_keys` gives: the surface holds a settings key and this dictionary
    is keyed by a row, and that join belongs to the table rather than to either
    side. ⛔ The WORD is still the manuscript's alone -- nothing here writes one.
    """
    out = {'$comment': BANNER}
    for section in ('icons', 'properties', 'settings', 'paletteGroups',
                    'surfaces', 'notices',
                    'shortcuts', 'helpHeadings', 'helpLegal', 'helpNotes',
                    'helpFootnotes',
                    'browserFunctions',
                    'reasons', 'invariants', 'questions', 'confirmation',
                    'noticeDismiss',
                    'confirmationMarks', 'fileStatus', 'branding',
                    'defaultNames',
                    'exportFormats', 'fitSpanField', 'exportChooser', 'openChooser',
                    'dropCue',
                    'differenceReview',
                    'assignments', 'arms',
                    'weekdays', 'hintLines',
                    'colorNames', 'colorField', 'propertyField',
                    'rowMinHeightField', 'taskGroupPanelWidthField',
                    'themeHues',
                    'scaleEcho', 'dualCursorReadout', 'searchColumns',
                    'planActualStates', 'searchPanel', 'resourceListColumns',
                    'resourceList', 'parentTaskChoice',
                    'delayReportColumns',
                    'delayReportStatuses', 'delayReportSummary',
                    'delayReportMarkdown', 'delayReportReasons',
                    'delayReportAspects', 'delayReportWalls',
                    'delayFixColumns', 'delayFixes'):
        if section == 'settings':
            out[section] = [{'rowId': entry['rowId'],
                             'keys': keys_by_row[entry['rowId']],
                             'label': entry['label']}
                            for entry in doc[section]]
            continue
        out[section] = doc[section]
    return json.dumps(out, ensure_ascii=False, indent=1) + '\n'


def build_dependency_kinds():
    """Table T-018's rows for src/, outside FR-038's dictionary (FR-009 note).

    @purity semi-pure-b
    """
    out = {'$comment': DEPENDENCY_KINDS_BANNER,
           'dependencyKinds': dependency_kinds()}
    return json.dumps(out, ensure_ascii=False, indent=1) + '\n'


def dependency_kinds():
    """Table T-018's rows as the screen needs them: row id, stored number and
    the abbreviation its name column starts with (CR-541).

    @purity semi-pure-b
    """
    kinds = []
    for cells in table_rows(REL_REQUIREMENTS, DEPENDENCY_KIND_ROW,
                            DEPENDENCY_KIND_TABLE):
        name = cells[2].strip()
        cut = name.find(u'\uff08')
        kinds.append({'rowId': cells[0].strip('`* '),
                      'linkType': int(cells[1].strip()),
                      'abbreviation': (name[:cut] if cut >= 0 else name).strip()})
    return kinds


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
                        'confirmationMarks', 'fileStatus', 'defaultNames',
                        'exportFormats', 'assignments', 'arms'):
            say('%-14s %3d entr(ies): %s'
                % (section, len(doc[section]),
                   ', '.join(str(e[SHAPE[section][0]]) for e in doc[section])))
        say('%d word(s), %d written' % (counted(doc), filled(doc)))
        return 0

    built = build(doc, settings_keys())
    kinds = build_dependency_kinds()
    if '--check' in sys.argv:
        drifted = [rel for rel, body in ((REL_OUT, built),
                                         (REL_OUT_DEPENDENCY_KINDS, kinds))
                   if written_text(rel) != body]
        for rel in drifted:
            say('DRIFTED  %s no longer matches the specification -- rerun %s'
                % (rel, REL_SELF))
        if drifted:
            return 1
        say('OK       %s matches %s (%d word(s), %d written)'
            % (REL_OUT, REL_SOURCE, counted(doc), filled(doc)))
        say('OK       %s matches table %s'
            % (REL_OUT_DEPENDENCY_KINDS, DEPENDENCY_KIND_TABLE))
        return 0

    io.open(path_of(REL_OUT), 'w', encoding='utf-8', newline='\n').write(built)
    io.open(path_of(REL_OUT_DEPENDENCY_KINDS), 'w', encoding='utf-8',
            newline='\n').write(kinds)
    say('wrote %s  (%d word(s), %d written)'
        % (REL_OUT, counted(doc), filled(doc)))
    say('wrote %s' % REL_OUT_DEPENDENCY_KINDS)
    return 0


def written_text(rel):
    """The file as it stands, line ends folded, or None when it is absent.

    @purity semi-pure-b
    """
    if not os.path.exists(path_of(rel)):
        return None
    return io.open(path_of(rel), encoding='utf-8', newline='').read().replace('\r\n', '\n')


if __name__ == '__main__':
    sys.exit(main())
