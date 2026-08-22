# -*- coding: utf-8 -*-
"""Write the bundled startup template (FR-027, table T-226).

    python tools/generate_startup_template.py
    python tools/generate_startup_template.py --check

FR-027 requires the template to be a bundled `GRS JSON` and forbids building
the document in code, so that the same validator the import path uses can be
pointed at it. This script is the manuscript; the JSON it writes is the
artifact, and the artifact is what ships.

⭐ AND THE VALIDATOR IS ACTUALLY POINTED AT IT. `check_schema` runs
docs/spec/_source/grs-document.schema.json over the document before a byte is
written, which is the benefit FR-027 names and which nothing here used to
collect. ⭐ `check_neutrality` does the other half of FR-027 -- every readable
string in the document has to be a word this file declares somewhere, because
the generator wrote them all and can therefore say which ones it knows how to
write. ⛔ Neither is a list of forbidden words: there is no such list.

⛔ Nothing here invents a value the specification has decided. The presentation
values come from SETTINGS_DEFAULTS and the calendar from
DEFAULT_CALENDAR_VALUES, both written by tools/generate_entity_types.py out of
the manuscript; the theme hue is read from docs/spec/_source/settings.json,
which is the only place `S-73` exists machine readably (`DR-5` keeps it off
`documentSettings`).

⛔ And nothing here hand-lists a column the manuscript already marks. Which
columns are keys, what a key points at, and which columns hold a day are read
straight out of docs/spec/_source/erd.json -- the file tables T-057 and T-058
are generated FROM -- so the checks below cannot fall behind the manuscript
the way a typed-out list does. The one exception the manuscript itself asks
for is stated at check_invariants: conditions a single column settles are the
generated schema's job, not this file's.

⭐ WHAT THE DOCUMENT IS. A three-year software plan a project manager can read:

    seven phases       Survey, Research, Planning, Design, Implementation,
                       Test, Delivery -- the seven TP-3 names, in its order,
                       each drawn as a chevron with one milestone at its gate.
                       They overlap heavily, the way real phases do, and the
                       overlap is what lets one row design, build and test a
                       component without idling for six months in between.
    a forest           the first tree overviews the whole (TP-4): one bar over
                       the whole project, the phase bars under it, the gates
                       beside them. Six product trees follow.
    the WBS            mirrors the row forest. Every row that has child rows
                       carries ONE roll-up task, and that task is the WBS
                       parent of the row's own work and of the child rows'
                       roll-ups. ⛔ A roll-up is DERIVED from what hangs under
                       it, never dated on its own -- that is what makes a
                       parent contain its children (A1) and a row contain the
                       rows indented under it (A3).
    the work           comes from what the row IS. A row has a KIND, taken from
                       where it sits in the tree, and each kind has its own
                       vocabulary of work: a documentation row writes and
                       proofreads, a data row draws models and migrates, a
                       screen row wireframes and checks contrast. ⛔ No row
                       runs a checklist with the noun swapped (A14).
    the names          say what the WORK is, never what the ROW is. The row
                       header already carries the label, so a bar repeating it
                       says nothing twice; a name is one of the kind's verbs
                       filled with one of the kind's objects, each pair spoken
                       once in the whole document (A10).
    the shape          a row works the phases its HEIGHT is responsible for --
                       how much hangs under it, not how deep it sits. A row
                       with nothing under it designs, builds and tests one
                       component in one band; a row with four levels under it
                       surveys, researches, plans and hands over. So the
                       vertical axis carries information, and a leaf row's work
                       is clustered where that component is built (A15).
    the actuals        a status date 40% in, and REAL variance: work that
                       started late, work that finished early, work that ran
                       over and is still open past its planned finish, work
                       nobody has begun although its planned start has passed.
                       The five states of table T-019a and all three delay
                       readings of table T-021b are in the file (A16).
    the links          chain, and they cross. A dependency whose successor does
                       not follow soon after is not drawn at all, because a
                       link that constrains nothing is noise (A17); each phase
                       gate holds the next phase back (A19); and the product
                       trees wait on one another, a client on the service it
                       calls and a release on the suite that tested it (A20).

⭐ Every acceptance condition below is checked before a byte is written, and
the script exits non-zero with a named reason when one fails. A template that
drifts back into a shape nobody can read cannot be committed by accident.
"""
import hashlib
import io
import json
import math
import os
import re
import sys
import uuid
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SETTINGS_TS = os.path.join(ROOT, 'src', 'entity', 'document-model',
                           'document-settings', 'document-settings.ts')
SCHEDULE_TS = os.path.join(ROOT, 'src', 'entity', 'document-model',
                           'schedule', 'schedule.ts')
SETTINGS_JSON = os.path.join(ROOT, 'docs', 'spec', '_source', 'settings.json')
SCHEMA = os.path.join(ROOT, 'docs', 'spec', '_source', 'grs-document.schema.json')
OUT = os.path.join(ROOT, 'src', 'framework', 'single-html-shell',
                   'startup-template.json')

# FR-073: the format version is a date, compared as a plain string. ⭐ Bumped
# with the rewrite of the document's contents, because a reader that keeps
# documents from several versions tells them apart by nothing else.
SCHEMA_VERSION = '2026-08-20'
STAMPED_AT = '2026-08-20T00:00:00Z'

# TP-2. Three years. The window ends on the last working day of the third
# year, because every date in the document is a working day (S-106) and a
# project that ends on a Saturday would have to break that in one place.
PROJECT_START = date(2026, 4, 1)
PROJECT_FINISH = date(2029, 3, 30)

# TP-3. Seven phases, each ending at its own gate, overlapping the way a plan
# that anybody has worked to overlaps: design starts before research is signed
# off, and the build starts before the design is finished.
#
# ⛔ The first of TP-3's seven is a survey, not "Market Research": the row
# asks for plain software-development English, and marketing vocabulary is the
# industry narrowing FR-027 forbids.
#
# ⚠️ THE OVERLAP CARRIES WEIGHT, and is not decoration. A row that designs, builds
# and tests one component has to place three blocks in a row; if the design
# window closed six months before the test window opened, the row would be
# idle in between and its lane would read as work smeared over three years.
# Each phase now overlaps the next by more than a block, so the blocks abut
# (A15). ⚠️ Every boundary is a working day, which `build()` checks, and none
# of them falls inside a shutdown (CALENDAR_EXCEPTIONS).
PHASES = (
    ('Survey',         date(2026, 4, 1),  date(2026, 10, 30), 'circle'),
    ('Research',       date(2026, 5, 1),  date(2027, 3, 31), 'hexagon'),
    ('Planning',       date(2026, 8, 3),  date(2027, 8, 31), 'pentagon'),
    ('Design',         date(2026, 11, 2), date(2028, 3, 31), 'diamond'),
    ('Implementation', date(2027, 3, 1),  date(2028, 11, 30), 'square'),
    ('Test',           date(2027, 8, 2),  date(2029, 2, 28), 'triangleUp'),
    ('Delivery',       date(2027, 12, 1), date(2029, 3, 30), 'star'),
)

# How much of a row's work each phase takes, by the HEIGHT of the row -- how
# many levels hang under it. ⭐ This is the shape of the plan, and height is
# the right key rather than depth: a row with nothing under it is where a
# component is actually built, wherever it sits in the tree, and a row with
# four levels under it is co-ordinating a programme. Reading down the row
# titles therefore reads left to right along the time axis, which is what
# makes the vertical axis mean something.
# ⛔ A weight of zero is the point of the leaf rows: a component is not
# surveyed and is not rolled out on its own, so its band covers three phases
# and not the whole three years. A weight of one or two percent would put a
# single task at the far end of the chart and stretch the lane back over
# everything -- which is how every row in the artifact this replaces came to
# span the whole project.
HEIGHT_PHASE_WEIGHT = {
    0: (0,  0,  0, 24, 52, 24,  0),
    1: (0,  0, 12, 24, 34, 22,  8),
    2: (4, 14, 22, 18, 16, 14, 12),
    3: (16, 22, 22, 10,  8,  8, 14),
    4: (30, 24, 20,  6,  2,  4, 14),
}

# TP-4 and TP-5. The row forest. ⛔ Every label is unique across the document:
# the row title panel shows the leaf label alone, so three rows all reading
# "Screens" would be three rows a reader cannot tell apart.
#
# ⛔ No industry and no product is named, in the values as well as the prose
# (FR-027). That is why the two mobile targets are a phone and a tablet --
# naming the two real operating systems would name two products.
TREE = (
    ('Whole Product', (
        ('Phase Bars', ()),
        ('Phase Gates', ()),
    )),
    ('Mobile Client', (
        ('Phone App', (
            ('Phone Sign In', (
                ('Phone Sign In Layout', (
                    ('Phone Portrait Layout', ()),
                    ('Phone Landscape Layout', ()),
                )),
                ('Phone Sign In Validation', ()),
            )),
            ('Phone Home Screen', (
                ('Phone Home List', ()),
                ('Phone Home Detail', ()),
            )),
            ('Phone Settings Screen', ()),
            ('Phone Local Store', (
                ('Phone Store Schema', ()),
                ('Phone Store Migration', ()),
            )),
            ('Phone Push Notification', (
                ('Phone Push Registration', ()),
                ('Phone Push Delivery', ()),
            )),
        )),
        ('Tablet App', (
            ('Tablet Sign In', (
                ('Tablet Sign In Layout', ()),
                ('Tablet Sign In Validation', ()),
            )),
            ('Tablet Home Screen', (
                ('Tablet Home List', ()),
                ('Tablet Home Detail', ()),
            )),
            ('Tablet Local Store', (
                ('Tablet Store Schema', ()),
                ('Tablet Store Migration', ()),
            )),
            ('Tablet Push Notification', (
                ('Tablet Push Registration', ()),
                ('Tablet Push Delivery', ()),
            )),
        )),
    )),
    ('Web Service', (
        ('Public API', (
            ('Account API', (
                ('Sign Up Endpoint', ()),
                ('Sign In Endpoint', ()),
                ('Password Reset Endpoint', ()),
            )),
            ('Content API', (
                ('Content Search Endpoint', ()),
                ('Content Upload Endpoint', ()),
            )),
            ('Reporting API', (
                ('Daily Summary Endpoint', ()),
            )),
        )),
        ('Batch Processing', (
            ('Nightly Job', ()),
            ('Retry Queue', ()),
            ('Dead Letter Queue', ()),
        )),
        ('Authentication Service', (
            ('Token Service', ()),
            ('Session Store', ()),
        )),
    )),
    ('Web Front End', (
        ('Web Screens', (
            ('Dashboard Screen', (
                ('Chart Panel', ()),
                ('Filter Bar', ()),
            )),
            ('Admin Screen', (
                ('User List Panel', ()),
                ('Audit Log Panel', ()),
            )),
        )),
        ('Client State Store', (
            ('Response Cache', ()),
        )),
        ('Front End Build', (
            ('Module Bundling', ()),
            ('Asset Optimization', ()),
        )),
    )),
    ('Data Platform', (
        ('Database Schema', (
            ('Core Tables', (
                ('Account Table', ()),
                ('Content Table', ()),
            )),
            ('Index Design', ()),
        )),
        ('Data Migration', (
            ('Forward Migration', ()),
            ('Rollback Migration', ()),
        )),
        ('Query Tuning', (
            ('Query Plan Review', ()),
            ('Connection Pool', ()),
        )),
    )),
    ('Desktop Client', (
        ('Desktop Application', (
            ('Main Window', (
                ('Editor Pane', ()),
                ('Preview Pane', ()),
            )),
            ('Preferences Dialog', ()),
        )),
        ('Desktop Installer', (
            ('Installer Packaging', ()),
            ('Installer Signing', ()),
        )),
        ('Auto Update', (
            ('Update Check', ()),
            ('Update Download', ()),
        )),
    )),
    ('Quality And Release', (
        ('Test Plan', (
            ('Unit Test Suite', ()),
            ('Integration Test Suite', ()),
            ('Acceptance Test Suite', ()),
        )),
        ('Release Management', (
            ('Staging Release', ()),
            ('Production Release', ()),
        )),
        ('Documentation', (
            ('User Guide', ()),
            ('Release Note', ()),
            ('API Reference', ()),
        )),
    )),
)

# ⭐ WHAT KIND OF THING EACH ROW IS. The kind decides the row's vocabulary of
# work, and it comes from where the row sits in the tree: a row inherits its
# parent's kind, and only the places where the kind CHANGES are named here. A
# top-level row that names no kind co-ordinates a programme.
# ⛔ This is the whole answer to "row Documentation contains Draw the
# Documentation data model": a documentation row does documentation work
# because the work is drawn from its kind, not from a list every row shares.
ROW_KIND = {
    'Phone App': 'ui',
    'Phone Local Store': 'data',
    'Phone Push Notification': 'service',
    'Tablet App': 'ui',
    'Tablet Local Store': 'data',
    'Tablet Push Notification': 'service',
    'Public API': 'service',
    'Batch Processing': 'service',
    'Authentication Service': 'service',
    'Session Store': 'data',
    'Web Screens': 'ui',
    'Client State Store': 'data',
    'Front End Build': 'platform',
    'Database Schema': 'data',
    'Data Migration': 'data',
    'Query Tuning': 'data',
    'Desktop Application': 'ui',
    'Desktop Installer': 'release',
    'Auto Update': 'platform',
    'Test Plan': 'qa',
    'Release Management': 'release',
    'Documentation': 'doc',
}
ROOT_KIND = 'program'

WANTED_ROWS = 100    # TP-5
WANTED_TASKS = 1000  # TP-6

# The label of the row that overviews the whole (TP-4), and of its two
# children. They carry the fixed contents of the first tree and take no
# generated work.
OVERVIEW_ROW = 'Whole Product'
PHASE_BAR_ROW = 'Phase Bars'
PHASE_GATE_ROW = 'Phase Gates'
OVERVIEW_ROWS = (OVERVIEW_ROW, PHASE_BAR_ROW, PHASE_GATE_ROW)

# What the first tree's three rows and every roll-up are called. ⭐ Declared
# rather than typed where they are used, because the neutrality check reads
# the declarations: a word this generator can say is a word it has written
# down somewhere, and one it has not is the refusal.
OVERVIEW_TASK = 'Deliver the whole product'
PHASE_BAR_NAME = '%s phase'
PHASE_GATE_NAME = '%s complete'
ROLLUP_NAME = '%s workstream'

# TP-7 forbids an even spread. How much work a row carries of its own, by
# depth: the cycle repeats down the rows of that depth, and the scaler below
# moves the whole set onto TP-6 without flattening it.
WORK_CYCLE = {
    1: (26, 31, 22, 29, 18, 24),
    2: (13, 19, 11, 16, 22, 9, 14, 17),
    3: (9, 15, 6, 12, 18, 8, 11, 7, 13, 10),
    4: (7, 12, 5, 9, 14, 6, 10, 8, 4, 11, 16, 3),
    5: (12, 8),
}

# How long a piece of work runs, in working days, and how often that length is
# drawn. ⭐ The tail is the point: a plan of nothing but three-week tasks is a
# plan nobody wrote. A one-day item and a ninety-day workstream both exist.
DURATIONS = (
    (1, 8), (2, 9), (3, 9), (4, 8), (5, 10), (6, 6), (7, 5), (8, 5), (9, 4),
    (10, 6), (12, 4), (14, 4), (15, 3), (18, 3), (20, 4), (22, 2), (25, 3),
    (28, 2), (30, 3), (35, 2), (40, 2), (45, 1), (50, 1), (55, 1), (60, 1),
    (70, 1), (80, 1), (90, 1),
)

# How many working days pass between one piece of work finishing and the next
# one on the same row starting, and how often that gap is drawn. ⭐ Mostly
# nothing to a few days: a row is a person's queue, and a queue with a
# three-month hole in it is not a queue. The tail exists so that not every
# consecutive pair is a dependency (`build_dependencies` draws a link only
# where the gap is small enough to constrain anything).
WORK_GAPS = ((0, 9), (1, 12), (2, 10), (3, 7), (4, 4), (5, 3), (8, 2),
             (12, 1), (20, 1))

# The gap between the last piece of work of one phase and the first of the
# next, on the same row. ⭐ Wider than a gap inside a phase, because something
# has to be signed off in between, but nothing like a phase window.
PHASE_HANDOFF_GAPS = ((1, 6), (2, 6), (3, 5), (5, 4), (8, 3), (13, 2), (21, 1))

# How eagerly a row pulls its next phase block up against the last one, by the
# row's height. ⭐ 0 means "the day the window opens or the day the last block
# ended, whichever is later" -- which is what makes a leaf row's work a band
# rather than a smear. A row with levels under it is co-ordinating, and
# co-ordination genuinely does run through the whole of a phase window.
BAND_PULL = {0: 0.0, 1: 0.10, 2: 0.34, 3: 0.50, 4: 0.55}

# How far a row's gaps are stretched, by height, for the same reason. ⭐ A leaf
# row's queue is back to back; a programme row's five survey tasks are spread
# through the survey, which is what keeps every month of the plan carrying a
# start (A9) without any row lapping its window.
GAP_STRETCH = {0: 1.0, 1: 1.4, 2: 3.0, 3: 4.5, 4: 5.5}

# How many working days a row may wait past the earliest day a block could
# start. ⭐ Nobody starts on the morning a window opens because the window
# opened.
BAND_WAIT = 34

# How much of a row's lane is drawn from the row itself rather than from its
# place among its siblings. ⭐ Measured, not guessed: at 0 two sibling sets of
# the same size land on the same days (which is what A6 refuses), and past
# about a third the rows stop reading as a sequence and the busiest month
# climbs again. 0.30 gave the lowest peak month and the tightest leaf rows of
# the values tried.
LANE_SCATTER = 0.30

# ⛔ How far apart a dependency may hold its two ends, in working days. A link
# whose successor starts three months after its predecessor finished does not
# constrain anything, and 548 of them do not make a network -- they make noise
# that hides the links that DO constrain. Every link this document draws is
# inside this window, and `check_links` (A17) refuses the document otherwise.
DEPENDENCY_MAX_GAP = 10

# How many pieces of work may feed one gate, and how many may open with one
# phase bar. ⭐ A gate that eight hundred tasks point at is a gate nobody can
# read the picture of.
GATE_FEEDERS = 8

# ⛔ WHAT WAITS ON WHAT ACROSS THE ROW FOREST. Every link this document drew
# used to stay inside one display row -- 373 of 406 of them -- and not one of
# the six product trees waited on another. A plan where the client never waits
# on the service it calls and the release never waits on the tests is not a
# plan, it is six plans printed on one page.
# ⭐ Each pair is a real reason one thing cannot proceed until another has:
# a caller waiting on the endpoint it calls, a service waiting on the table it
# reads, a suite waiting on what it exercises, a release waiting on the suite.
# ⚠️ The pair names ROWS, and the search reaches everything indented under
# them, because the work is on the leaves. Where no two pieces of work land
# close enough in time to constrain one another, NO link is drawn -- the same
# rule DEPENDENCY_MAX_GAP holds everywhere else.
WAITS_ON = (
    ('Sign In Endpoint', 'Phone Sign In Validation'),
    ('Sign In Endpoint', 'Tablet Sign In Validation'),
    ('Token Service', 'Phone Push Registration'),
    ('Content Search Endpoint', 'Phone Home List'),
    ('Content Search Endpoint', 'Tablet Home List'),
    ('Content API', 'Main Window'),
    ('Public API', 'Desktop Application'),
    ('Daily Summary Endpoint', 'Chart Panel'),
    ('Account API', 'User List Panel'),
    ('Content API', 'Response Cache'),
    ('Account Table', 'Session Store'),
    ('Database Schema', 'Content API'),
    ('Index Design', 'Nightly Job'),
    ('Forward Migration', 'Batch Processing'),
    ('Query Tuning', 'Reporting API'),
    ('Query Tuning', 'Chart Panel'),
    ('Core Tables', 'Preview Pane'),
    ('Data Migration', 'Integration Test Suite'),
    ('Public API', 'Integration Test Suite'),
    ('Public API', 'API Reference'),
    ('Web Screens', 'Acceptance Test Suite'),
    ('Web Screens', 'User Guide'),
    ('Phone App', 'Unit Test Suite'),
    ('Desktop Application', 'Unit Test Suite'),
    ('Auto Update', 'Release Note'),
    ('Desktop Installer', 'Staging Release'),
    ('Test Plan', 'Release Management'),
    ('Acceptance Test Suite', 'Production Release'),
)

# How many links one row-to-row relation may draw. ⭐ A handful: the point is
# that the trees hold each other up, not that every task of one row points at
# every task of another.
WAITING_LINKS = 3

# The unit of `Dependency.lag`. ⭐ S-118 fixes the unit as working days;
# `erd.json` says the column's unit IS `lagFormat`, so a lag without one is a
# number without a unit, and the exchange partner's own documentation states
# that "LinkLag requires a LagFormat to be specified"
# (docs/reference/mspdi/learn-docs/.../linklag-element.md). ⛔ The CODE is not a
# value docs/spec decided, so it is read from the canon rather than invented:
# the official XSD's LagFormat enumerates 7 = `d` (days) and 8 = `ed` (elapsed
# days), and working days is the first of the two
# (docs/reference/mspdi/_erd-part-M2-task.md, PredecessorLink row 6).
LAG_FORMAT_WORKING_DAYS = 7

# ⛔ THE VOCABULARY OF WORK, BY KIND AND THEN BY PHASE. Seven tuples per kind,
# in the order of PHASES, and one tuple of OBJECTS per kind -- the concrete
# things that kind of row works on. A name is one template filled with one
# object, and NOTHING ELSE goes into it.
#
# ⛔ THE ROW LABEL IS NOT IN A WORK NAME. The row header already says what the
# thing is; a bar that repeats it says the same thing twice and reads as
# stutter ("Fix the Phone Portrait Layout layout defects" on the Phone
# Portrait Layout row -- 985 of a thousand names did that, and 17 of them
# doubled the word outright). The bar says what the WORK is -- "Fix the
# toolbar layout defects" -- and A10 refuses a work name carrying its own
# row's label.
# ⭐ Uniqueness therefore comes from the PAIR, not from the label: `take` hands
# out each (template, object) pair once across the whole document and refuses
# when a kind runs out, so a thousand names are a thousand names without a
# single row label pasted in.
#
# ⛔ EVERY VERB FITS EVERY OBJECT OF ITS OWN KIND. That is what the object
# tuples are for: "Backfill the %s" sits in the data kind, whose objects are
# all stored collections, so nothing can be told to backfill a connection pool.
# A verb that fits only some objects of its kind is a defect of this table.
# ⚠️ Nothing here doubles a word either -- `reads_clean` refuses a pair whose
# two halves say one word twice, and A10 reads every shipped name.
# ⚠️ An empty tuple would mean the kind never works that phase even when its
# height gives the phase a weight, and `phase_split` would move that weight to
# the next phase the kind can work. No kind has one today; the fallback is what
# keeps the weights and the vocabulary from going out of step the day one does.
WORK_BY_KIND = {
    # A top-level product tree: nobody builds a "programme", they steer one.
    'program': (
        ('Collect the %s requirements', 'Interview the %s stakeholders',
         'Map the %s workflow', 'Assess the %s risks',
         'Catalog the %s constraints', 'Summarize the %s findings',
         'Review past %s incidents', 'Record the %s assumptions'),
        ('Compare the %s options', 'Measure the %s ceiling',
         'Publish the %s findings', 'Trial the %s approach',
         'Weigh the %s alternatives', 'Gather the %s evidence'),
        ('Estimate the %s effort', 'Draft the %s plan', 'Agree the %s scope',
         'Sequence the %s work', 'Size the %s team',
         'Set the %s exit criteria', 'Book the %s reviews',
         'Baseline the %s schedule'),
        ('Detail the %s approach', 'Review the %s approach',
         'Sign off the %s approach', 'Agree the %s handoffs'),
        ('Track the %s progress', 'Unblock the %s work',
         'Review the %s risk register', 'Report on the %s spend'),
        ('Agree the %s acceptance criteria', 'Review the %s readiness',
         'Triage the open %s actions'),
        ('Close out the %s work', 'Report on the %s outcome',
         'Brief support on the %s change', 'Review the %s lessons',
         'Sign off the %s handover'),
    ),
    # A screen, a panel, a layout, a dialog.
    'ui': (
        ('Observe how people use the %s', 'Catalog the %s states',
         'Collect the %s requirements'),
        ('Sketch two %s directions', 'Test the %s sketches with readers',
         'Publish the %s findings'),
        ('Estimate the %s effort', 'Agree the %s scope',
         'Set the %s acceptance criteria'),
        ('Wireframe the %s', 'Design the %s layout',
         'Specify the %s interactions', 'Detail the %s edge cases',
         'Choose the %s wording', 'Review the %s wireframes',
         'Sign off the %s layout'),
        ('Build the %s markup', 'Style the %s', 'Wire the %s to its data',
         'Handle the %s input errors', 'Make the %s reachable by keyboard',
         'Make the %s follow the window size', 'Review the %s code'),
        ('Write the %s render tests',
         'Check the %s against the contrast rules',
         'Walk the %s with a screen reader', 'Fix the %s layout defects',
         'Retest the %s fixes'),
        ('Write the %s screen note', 'Stage the %s behind a flag'),
    ),
    # An endpoint, a queue, a job, a long-running service.
    'service': (
        ('Measure the current %s load', 'Catalog the %s callers',
         'Record the %s assumptions'),
        ('Spike the %s integration', 'Benchmark the %s alternatives',
         'Measure the %s ceiling'),
        ('Estimate the %s effort', 'Sequence the %s work',
         'Set the %s acceptance criteria'),
        ('Design the %s contract', 'Specify the %s error responses',
         'Choose the %s retry rule', 'Detail the %s call limits',
         'Review the %s contract', 'Sign off the %s contract'),
        ('Build the %s handler', 'Validate the %s request',
         'Wire the %s to its store', 'Return the %s error codes',
         'Instrument the %s tracing', 'Harden the %s inputs',
         'Make the %s safe to repeat', 'Review the %s code'),
        ('Write the %s contract tests', 'Load test the %s',
         'Fix the %s defects', 'Profile the %s response times',
         'Retest the %s fixes', 'Close the %s test report'),
        ('Write the %s runbook', 'Stage the %s behind a flag'),
    ),
    # A schema, a table, an index, a migration, a cache.
    'data': (
        ('Profile the current %s volume', 'Catalog the %s readers',
         'Record the %s assumptions'),
        ('Compare the %s storage options', 'Measure the %s growth',
         'Publish the %s findings'),
        ('Estimate the %s effort', 'Agree the %s retention rule',
         'Sequence the %s work'),
        ('Draw the %s data model', 'Choose the %s keys',
         'Design the %s indexes', 'Specify the %s retention',
         'Review the %s data model', 'Sign off the %s data model'),
        ('Write the %s migration', 'Backfill the %s',
         'Add the %s constraints', 'Tune the %s queries',
         'Instrument the %s counters', 'Review the %s migration'),
        ('Test the %s migration', 'Test the %s rollback',
         'Check the %s integrity', 'Measure the %s query times',
         'Fix the %s defects', 'Retest the %s fixes'),
        ('Write the %s data note', 'Publish the %s schema reference'),
    ),
    # A build pipeline, a bundler, an updater: the machinery around the product.
    'platform': (
        ('Measure the current %s cost', 'Catalog the %s inputs'),
        ('Compare the %s toolchains', 'Publish the %s findings'),
        ('Estimate the %s effort', 'Agree the %s scope'),
        ('Choose the %s toolchain', 'Design the %s pipeline',
         'Specify the %s failure handling', 'Review the %s pipeline'),
        ('Script the %s', 'Cache the %s artifacts', 'Cut the %s turnaround',
         'Report the %s failures', 'Review the %s scripts'),
        ('Measure the %s turnaround', 'Check that the %s repeats exactly',
         'Fix the %s defects', 'Retest the %s fixes'),
        ('Write the %s pipeline note', 'Publish the %s pipeline reference'),
    ),
    # A test suite: the work is cases, harnesses and runs.
    'qa': (
        ('Catalog the %s risks', 'Review past %s escapes'),
        ('Compare the %s frameworks', 'Publish the %s findings'),
        ('Draft the %s plan', 'Agree the %s coverage target',
         'Estimate the %s effort', 'Book the %s reviews'),
        ('Write the %s cases', 'Review the %s cases',
         'Choose the %s fixtures', 'Sign off the %s cases'),
        ('Build the %s harness', 'Automate the %s cases',
         'Wire the %s into the pipeline', 'Stabilise the flaky %s cases',
         'Review the %s harness'),
        ('Run the %s', 'Triage the %s failures', 'Report the %s coverage',
         'Rerun the %s after the fixes', 'Close the %s test report'),
        ('Write the %s handover note', 'Publish the %s coverage report'),
    ),
    # A guide, a note, a reference: the work is writing and editing.
    'doc': (
        ('Collect the %s topics', 'Interview the %s readers',
         'Catalog the %s gaps'),
        ('Compare the %s formats', 'Publish the %s findings'),
        ('Outline the %s', 'Agree the %s scope', 'Estimate the %s effort'),
        ('Draft the %s outline', 'Choose the %s wording rules',
         'Review the %s outline', 'Sign off the %s outline'),
        ('Write the %s first draft', 'Add the %s examples',
         'Edit the %s for plain wording', 'Illustrate the %s',
         'Review the %s draft'),
        ('Proofread the %s', 'Check the %s links',
         'Check the %s against the screens', 'Correct the %s draft'),
        ('Publish the %s', 'Brief support on the %s'),
    ),
    # Packaging, signing, staging, shipping.
    'release': (
        ('Catalog the %s steps', 'Review past %s incidents'),
        ('Compare the %s approaches', 'Publish the %s findings'),
        ('Draft the %s plan', 'Agree the %s scope',
         'Set the %s acceptance criteria'),
        ('Design the %s steps', 'Choose the %s key handling',
         'Specify the %s failure path', 'Review the %s steps'),
        ('Build the %s pipeline', 'Script the %s steps',
         'Add the %s failure path', 'Instrument the %s checks',
         'Review the %s scripts'),
        ('Rehearse the %s', 'Test the %s rollback', 'Verify the %s output',
         'Fix the %s defects'),
        ('Publish the %s', 'Write the %s runbook', 'Record the %s outcome'),
    ),
}

# ⛔ WHAT EACH KIND OF ROW WORKS ON. Sixteen per kind, so that the pairs a
# kind can say outnumber the tasks any one phase of it carries -- the busiest
# is the screen kind's build, where seven templates over sixteen objects say a
# hundred and twelve different things and ninety-three are needed.
# ⭐ Chosen so that every verb of the kind fits every object of the kind: the
# data objects are all stored collections because the data kind backfills and
# migrates, and the screen objects are all things on a screen because the
# screen kind wireframes them and walks them with a screen reader.
# ⛔ No industry and no product is named (FR-027 puts identifier VALUES in
# scope), and no object repeats a word its own kind's templates use.
WORK_OBJECTS = {
    'program': ('rollout', 'training', 'support', 'metrics', 'vendor',
                'budget', 'staffing', 'pilot', 'onboarding', 'governance',
                'procurement', 'contingency', 'licensing', 'tooling',
                'migration', 'security'),
    'ui': ('sign-in form', 'list view', 'detail panel', 'onboarding tour',
           'alert banner', 'settings sheet', 'navigation bar', 'search field',
           'filter drawer', 'confirmation dialog', 'progress indicator',
           'avatar picker', 'date picker', 'toolbar', 'side menu',
           'notification badge'),
    'service': ('search endpoint', 'upload endpoint', 'token exchange',
                'export job', 'webhook dispatcher', 'throttle guard',
                'replay queue', 'health probe', 'audit feed', 'batch importer',
                'notification sender', 'session lookup', 'report builder',
                'file scanner', 'schedule runner', 'usage meter'),
    'data': ('account table', 'audit log', 'session map', 'archive partition',
             'change feed', 'lookup table', 'summary table', 'event stream',
             'attachment store', 'reference list', 'usage rollup',
             'full-text catalog', 'history table', 'snapshot set',
             'queue table', 'settings table'),
    'platform': ('bundle step', 'type check', 'lint step', 'test run',
                 'asset compression', 'dependency install', 'output upload',
                 'workspace restore', 'signing step', 'version stamp',
                 'release branch', 'changelog step', 'coverage gate',
                 'smoke gate', 'container image', 'nightly build'),
    'qa': ('smoke suite', 'regression suite', 'contract suite', 'load suite',
           'accessibility suite', 'upgrade suite', 'offline suite',
           'permission suite', 'localisation suite', 'boundary suite',
           'recovery suite', 'compatibility suite', 'soak suite',
           'security suite', 'data suite', 'exploratory charter'),
    'doc': ('getting-started guide', 'reference pages', 'release notes',
            'troubleshooting guide', 'glossary', 'admin guide',
            'integration guide', 'migration guide', 'answers page',
            'walkthrough', 'field reference', 'quick tour', 'install guide',
            'upgrade guide', 'concepts page', 'security note'),
    'release': ('installer package', 'signing chain', 'phased release',
                'revert plan', 'version manifest', 'release checklist',
                'distribution feed', 'update channel', 'preflight probe',
                'announcement', 'hotfix path', 'store submission',
                'canary batch', 'sunset notice', 'artifact registry',
                'approval gate'),
}

# How many of its kind's objects one row keeps coming back to. ⭐ A row is one
# component's queue, so it works a handful of things over and over rather than
# sixteen different ones once each; `take` starts inside that window and walks
# outward only when the pair it wanted is already spoken for.
ROW_OBJECT_SPAN = 4

# The two pieces of delivery work that always come last, and always in this
# order. ⭐ They are named apart from the rotation because the SHAPE they are
# drawn in follows from what they are: a handover points one way and has no
# duration to speak of (SH-3), and watching a release runs between two points
# and has no body (SH-4). Table T-012 has five shapes and a template that
# never draws two of them leaves a third of the table untested.
DELIVERY_WATCH = 'Monitor the %s after release'
DELIVERY_HANDOVER = 'Hand the %s over to operations'

# Where a row builds enough to be worth splitting, the build closes with
# numbered increments. ⭐ They are handed out in the order the tasks are
# generated, which is date order, so increment 2 always starts after increment
# 1 -- the thing 43.4% of the pairs in the artifact this replaces got wrong.
# ⚠️ All three increments of one row take the SAME object, because they are
# increments OF one thing; `take_series` is what keeps them together, and that
# is also what gives A5 a counter to read against the dates.
IMPLEMENTATION_INCREMENT = 'Complete the %s increment %d'
INCREMENTS = 3

# The two phases whose names are decided by something other than the kind's
# rotation, by their place in PHASES.
IMPLEMENTATION_PHASE = 4
DELIVERY_PHASE = 6

# What a name that is not a piece of work may be: a roll-up, a phase bar, a
# gate, or one of the milestones a row plants in its own lane.
DELIVERABLE_TAILS = (' workstream', ' phase', ' complete', ' ready',
                     ' frozen', ' accepted', ' handed over')
# ⚠️ A roll-up and a milestone DO carry the row label, and that is the
# difference: neither is work. One is the row itself summarised and the other
# is the row itself signed off, and a reader meets both in the WBS outline --
# away from the row header, where nothing else would identify them.
MILESTONE_TAILS = ('%s ready', '%s frozen', '%s accepted', '%s handed over')
# ⭐ HOW FAR A TASK SLIPPED, in working days, and how often. A negative slip is
# work that started early. ⚠️ The tail is what makes `DL-2` of table T-021b
# exist at all: a task whose planned start has gone by and which nobody has
# begun is the second of the three delay readings, and it can only happen if
# some slips are longer than the days left before the status date.
START_SLIP = ((-3, 1), (-2, 2), (-1, 4), (0, 24), (1, 12), (2, 10), (3, 8),
              (4, 6), (5, 5), (7, 4), (10, 3), (14, 2), (20, 2), (30, 1))

# ⭐ HOW LONG IT ACTUALLY TOOK, as a share of the planned span. Under one is
# work that came in early, over one is work that ran long -- and FR-012 says
# in as many words that the second reads over 100%: "a task planned for a
# hundred days and taking a hundred and twenty reads 120". ⛔ Do not clamp it.
#
# ⛔ THE TAIL IS SHORT ON PURPOSE. FR-012 refusing to clamp makes a figure over
# a hundred LAWFUL; it does not make it ordinary. One finished task in four
# overrunning -- which the earlier weights produced, with fourteen past 150%
# and two past 200% -- is not a plan a team delivered, it is a plan nobody
# estimated. So the overrun weight is a tenth of the roster and stops at 1.4,
# and the figures past that come from work still OPEN past its planned finish
# (OVERDUE_PROGRESS), which is where an overrun is genuinely commonplace.
PACE = ((0.5, 4), (0.6, 9), (0.7, 14), (0.8, 18), (0.9, 20), (1.0, 25),
        (1.1, 6), (1.25, 3), (1.4, 1))

# ⭐ HOW FAR A RUNNING PIECE OF WORK HAS GOT, as a share of its planned span.
# Over one is work that has already cost more than it was given and is still
# not done, which is where FR-090's label prints a figure past 100.
PROGRESS = ((0.15, 3), (0.3, 6), (0.45, 8), (0.6, 9), (0.75, 8), (0.9, 7),
            (1.05, 4), (1.2, 3), (1.35, 2))

# The same, for work whose planned finish has already gone by. ⚠ Being past
# due and still open is `DL-1` of table T-021b, and such work has usually eaten
# its estimate -- which is the reading FR-012 refuses to clamp at 100.
OVERDUE_PROGRESS = ((0.7, 3), (0.85, 5), (1.0, 7), (1.15, 8), (1.3, 6),
                    (1.5, 4), (1.8, 2))

# How many pieces of work are suspended at the status date. ⭐ Enough that
# both suspensions of table T-019 and the `DL-3` delay are all drawn, few
# enough that the picture still reads as a plan in progress.
SUSPENSIONS = 18

# What share of the work whose planned finish has gone by is still open at the
# status date. ⭐ Fourteen months in, some things are simply late.
STUCK_SHARE = 0.07

# What share of the work that came due in the last IDLE_REACH working days
# nobody has begun, and how far back that reaches.
IDLE_SHARE = 0.16
IDLE_REACH = 45

# The eight glyphs of SH-5, in the order the extra milestones take them, so
# that triangleDown -- which no phase gate uses -- is drawn somewhere.
GLYPHS = ('triangleDown', 'diamond', 'circle', 'square', 'star', 'hexagon',
          'pentagon', 'triangleUp')

# The five shapes of table T-012. ⭐ Named once: `build_visuals` draws them,
# A12 counts them and the neutrality check reads them as words this generator
# is allowed to say, and three copies of one list would drift.
SHAPE_KINDS = ('rectangle', 'chevron', 'arrow', 'endpointSpan', 'milestone')

# ⛔ THE COMPANY SHUTDOWNS. Table T-209's S-107 keeps the DEFAULT calendar
# free of exceptions "because holding them would presume a region", and
# FR-088's rationale says in as many words that a document therefore needs a
# way to carry its own shutdown days, or the day counts do not match reality.
# This document carries its own.
# ⛔ NEUTRALITY (FR-027, which puts identifier VALUES in scope): not one of
# these names a country, a culture, a religion or a festival. A year-end
# shutdown stated in neutral words is a fact about an organisation's calendar;
# naming the festival it happens to sit next to is not.
# ⚠️ `recurrenceKind` is 9, "no recurrence" (erd.json, `Exception`): FR-054
# says GRS does NOT expand a repeating exception into real days, so a template
# that stated these as yearly repeats would carry days nothing counts.
# ⚠️ `fromDate` and `toDate` are inclusive real days here, which is what
# `recurrenceKind` 9 makes them.
CALENDAR_EXCEPTIONS = (
    ('Year-end shutdown', date(2026, 12, 24), date(2027, 1, 1)),
    ('Mid-year shutdown', date(2027, 8, 16), date(2027, 8, 20)),
    ('Year-end shutdown, second year', date(2027, 12, 24), date(2027, 12, 31)),
    ('Whole-company meeting day', date(2028, 4, 28), date(2028, 4, 28)),
    ('Mid-year shutdown, second year', date(2028, 8, 14), date(2028, 8, 18)),
    ('Year-end shutdown, third year', date(2028, 12, 22), date(2029, 1, 1)),
    ('Whole-company meeting day, second year', date(2029, 2, 23),
     date(2029, 2, 23)),
)

# The people the work is assigned to. ⛔ Neutral by construction: a craft and a
# letter, so no real person and no company is named (FR-027).
# ⚠️ Two of them are called `Developer C`, and that is DELIBERATE. ⛔ DO NOT
# "FIX" IT. Table T-225's AS-8 rules that a name shared by several resources
# resolves to the SMALLER `uid` and MUST NOT be merged (merging belongs to the
# join path alone, table T-032's MG-5). A document with no such pair gives that
# rule nothing to be read against, so the template carries exactly one pair:
# uid 1008 and uid 1010 are both `Developer C`, and AS-8 says the first wins.
RESOURCE_NAMES = (
    'Analyst A', 'Analyst B', 'Architect A', 'Designer A', 'Designer B',
    'Developer A', 'Developer B', 'Developer C', 'Developer D', 'Developer C',
    'Tester A', 'Tester B', 'Writer A', 'Release Engineer A',
)
# Which of them a phase draws from, by index into RESOURCE_NAMES.
PHASE_RESOURCES = (
    (0, 1), (0, 1, 2), (0, 2, 3), (2, 3, 4), (5, 6, 7, 8, 9),
    (10, 11), (12, 13),
)

# Colours an author chose, so FR-007's override is exercised rather than every
# bar taking the theme. ⚠️ The specification names the palette (CL-1 of table
# T-017) but does not spell its values, so these are this document's own
# choice of the eleven names it lists. ⛔ Never both transparent (IV-9).
AUTHOR_PAINT = (
    ('orange', 'dimgray', 'medium'),
    ('lightgray', 'purple', 'thin'),
    ('green', 'black', 'thick'),
    ('transparent', 'red', 'medium'),
    ('yellow', 'dimgray', 'thin'),
)

# The rows that carry a colour of their own, so FR-042's override is drawn.
ROW_PAINT = (('Quality And Release', 'lightgray'), ('Mobile Client', 'orange'))

# The document's one calendar (FR-054), and who the document stamp says last
# wrote the file. ⭐ Both are words this generator says, so both are declared
# rather than typed at the point of use -- the neutrality check reads the
# declarations, and a string it cannot find among them is refused.
CALENDAR_NAME = 'Standard'
STAMP_AUTHOR = 'template'

# ⭐ WHO THE PLAN BELONGS TO. Table T-224 is the whole list of the fields the
# document information panel shows (PF-1 .. PF-10), and a plan with every one
# of them empty is a plan nobody owns. ⛔ FR-027 puts identifier VALUES in
# scope, so no real person and no real company is named: these are role-style
# names of the same shape the resources already use.
# ⚠️ `title` is the DOCUMENT name (FR-035) and `name` is the PROJECT name
# (PF-1). They are different fields with different owners, so they are not the
# same string.
PROJECT_TITLE = 'Three-Year Product Plan'          # FR-035, Project.title
PROJECT_NAME = 'Product Development Programme'     # PF-1
PROJECT_SUBJECT = 'Building and delivering the product over three years'
PROJECT_CATEGORY = 'Software Development'
PROJECT_COMPANY = 'Product Organization'
PROJECT_MANAGER = 'Programme Manager A'
PROJECT_AUTHOR = 'Planner A'
PROJECT_CREATED = date(2026, 3, 6)
PROJECT_LAST_SAVED = date(2027, 6, 14)
# PF-7: the exchange partner's save count, which is NOT the document's stamp
# (FR-074 says so). A plan fourteen months in has been saved more than once.
PROJECT_REVISION = 37

# A fixed namespace, so every run writes the same TaskGroup ids. A template
# that changed its ids each rebuild would show up as a diff in every commit.
ID_NAMESPACE = uuid.UUID('6f9619ff-8b86-d011-b42d-00c04fc964ff')


def insist(condition, reason):
    """Refuse to write the document, naming what is wrong with it.

    ⛔ Not a bare `assert`: these run in the build, and `python -O` would drop
    an `assert` silently, which is exactly the way the old artifact drifted
    into a shape nobody could read.

    @purity semi-pure-b
    """
    if not condition:
        sys.exit('generate_startup_template: %s' % reason)


# ---------------------------------------------------------------------------
# Values the manuscript already states
# ---------------------------------------------------------------------------

def generated_object(path, name):
    """One `export const NAME ... = { ... }` block, read as data.

    ⛔ Deliberately NOT a second reading of the manuscript those blocks come
    from. tools/generate_entity_types.py already resolves docs/spec, and
    parsing its sources again here would put a second interpretation of one
    source in the tree, which is the failure R4 is about.

    @purity semi-pure-b
    """
    text = io.open(path, encoding='utf-8').read()
    found = re.search(r'^export const %s\b' % name, text, re.M)
    insist(found is not None,
           '%s is not in %s -- run `npm run types` first'
           % (name, os.path.relpath(path, ROOT)))
    # ⚠️ Not one regex to the closing brace: the type annotation of one of
    # these blocks carries `(1 = Sunday)` in a comment, and a pattern that
    # stops at the first `=` stops inside the prose.
    opened = text.index('= {', found.start()) + 2
    depth, at = 0, opened
    while at < len(text):
        if text[at] == '{':
            depth += 1
        elif text[at] == '}':
            depth -= 1
            if depth == 0:
                break
        at += 1
    insist(depth == 0, '%s does not close its braces' % name)
    body = text[opened + 1:at]
    # ⚠️ The block is machine written, which is what makes the rewrites below
    # safe: every key and string in it is single quoted and holds no
    # apostrophe, and no value holds a colon.
    insist('"' not in body,
           '%s now holds a double quote; the reader here assumes it does not'
           % name)
    literal = re.sub(r'^\s*//.*$', '', body, flags=re.M)   # the blocks explain their gaps
    literal = literal.replace("'", '"')
    # Some blocks spell their keys bare (`min: 3`), which JSON does not allow.
    literal = re.sub(r'([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', literal)
    literal = '{%s}' % literal
    literal = re.sub(r'^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":',
                     literal, flags=re.M)
    # JSON forbids the trailing comma the generated blocks end every entry
    # with. Closing the object first means the last one is caught too.
    literal = re.sub(r',(\s*[}\]])', r'\1', literal)
    try:
        return json.loads(literal)
    except ValueError as why:
        sys.exit('generate_startup_template: cannot read %s: %s' % (name, why))


def settings_defaults():
    """The presentation values, read from what the manuscript generated.

    @purity semi-pure-b
    """
    flat = generated_object(SETTINGS_TS, 'SETTINGS_DEFAULTS')
    # ⚠️ SETTINGS_DEFAULTS is flat and spells a nested value with a dot
    # ("fontScaleSizes.L"), while the GRS JSON schema wants the object. The
    # dot is the manuscript's own notation for one key inside another, so
    # rebuilding the nesting here is reading it, not reinterpreting it.
    out = {}
    for key, value in flat.items():
        head, dot, tail = key.partition('.')
        if dot:
            out.setdefault(head, {})[tail] = value
        else:
            out[key] = value
    return out


def manuscript_number(row_id):
    """The number a settings row states, straight from the manuscript.

    ⛔ Used for `S-73` alone. DR-5 keeps the theme hue on `Project` and out of
    the presentation group, so it is the one value this file needs that
    SETTINGS_DEFAULTS does not carry -- and writing `214` here would put a
    second copy of a decided value in the tree (rule 03 of
    docs/development-rules, and the reason CR-175 and CR-178 exist).

    @purity semi-pure-b
    """
    manuscript = json.load(io.open(SETTINGS_JSON, encoding='utf-8'))
    found = []

    def walk(node):
        """@purity semi-pure-a"""
        if isinstance(node, dict):
            if node.get('id') == row_id:
                found.append(node)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(manuscript)
    insist(len(found) == 1,
           'docs/spec/_source/settings.json states %s %d time(s), and this '
           'reader needs exactly one' % (row_id, len(found)))
    default = found[0].get('default') or {}
    insist('num' in default,
           '%s does not state its default as a machine value, so the template '
           'cannot be written without copying it. ⛔ Widen the manuscript '
           'instead (CR-175).' % row_id)
    return int(default['num'])


# ---------------------------------------------------------------------------
# The calendar the whole document is laid out on
# ---------------------------------------------------------------------------

CALENDAR_VALUES = generated_object(SCHEDULE_TS, 'DEFAULT_CALENDAR_VALUES')
# S-106 is in the `WeekDay.dayType` encoding, where Sunday is 1; Python's
# `weekday()` has Monday at 0. ⛔ The two do not share a numbering, and the
# manuscript says so in as many words -- converting between them is the
# reader's job.
WORKING_DAY_TYPES = tuple(CALENDAR_VALUES['S-106'])


def shut_days():
    """Every real day the document's own exceptions close.

    ⚠️ Expanded once, here, because `recurrenceKind` 9 means these ARE real
    days -- FR-054 forbids expanding a REPEATING exception, and none of these
    repeat.

    @purity pure
    """
    closed = set()
    for _name, first, last in CALENDAR_EXCEPTIONS:
        at = first
        while at <= last:
            closed.add(at)
            at += timedelta(days=1)
    return frozenset(closed)


SHUT_DAYS = shut_days()


def is_working_day(day):
    """@purity pure"""
    if day in SHUT_DAYS:
        # FR-054: the working days follow the DOCUMENT's calendar, which is
        # the week days AND the exceptions. A generator that read only the
        # week days would date work on days its own calendar closes.
        return False
    return ((day.weekday() + 1) % 7) + 1 in WORKING_DAY_TYPES


def working_days_of(first, last):
    """Every working day from `first` to `last`, both ends included.

    @purity pure
    """
    days = []
    at = first
    while at <= last:
        if is_working_day(at):
            days.append(at)
        at += timedelta(days=1)
    return tuple(days)


WORKDAYS = working_days_of(PROJECT_START, PROJECT_FINISH)
WORKDAY_INDEX = dict((day, i) for i, day in enumerate(WORKDAYS))


def index_of(day):
    """Where a day sits in the project's working days.

    @purity pure
    """
    insist(day in WORKDAY_INDEX,
           '%s is not a working day inside the project window' % day.isoformat())
    return WORKDAY_INDEX[day]


def text_of(day):
    """The spelling GRS uses for a day it decided itself.

    ⭐ EX-7 of table T-033: the time is `00:00:00` and the spelling follows the
    exchange partner's type. ⚠️ A value GRS did not touch keeps the text it
    arrived with (EX-2), which is why this is not a general date formatter.

    @purity pure
    """
    return '%sT00:00:00' % day.isoformat()


# ---------------------------------------------------------------------------
# Deciding the same way every run
# ---------------------------------------------------------------------------

def fraction(*parts):
    """A number in [0, 1) that depends only on what it is asked about.

    ⛔ Not `random` and not `hash()`: Python randomises string hashing per
    process, and a template whose bytes moved every run would show up as a
    diff in every commit.

    @purity pure
    """
    text = '|'.join(str(part) for part in parts).encode('utf-8')
    return int(hashlib.sha256(text).hexdigest()[:12], 16) / float(1 << 48)


def weighed(roster, *parts):
    """One value drawn from a roster of `(value, weight)` pairs.

    @purity pure
    """
    total = sum(weight for _value, weight in roster)
    wanted = fraction(*parts) * total
    running = 0.0
    for value, weight in roster:
        running += weight
        if wanted < running:
            return value
    return roster[-1][0]


def duration_for(*parts):
    """One length in working days, drawn from the weighted roster.

    @purity pure
    """
    return weighed(DURATIONS, 'duration', *parts)


def percent_of(duration, span):
    """FR-012's figure: `round(actualDuration / (finish - start) * 100)`.

    ⛔ Not clamped to 0..100 -- FR-012 says so twice, and FR-090 says the
    label prints what this stores without rounding it again. ⚠️ Half away from
    zero, not Python's half-to-even: a reader recomputing the figure by hand
    rounds 12.5 to 13.

    @purity pure
    """
    insist(span > 0,
           'FR-012 forbids dividing by a planned span of zero; the caller '
           'stores 100 or 0 from the presence of a finish instead')
    return int(math.floor(duration * 100.0 / span + 0.5))


# ---------------------------------------------------------------------------
# What a piece of work may be called
# ---------------------------------------------------------------------------

# Words that carry no meaning of their own, so saying one twice in a name is
# grammar rather than stutter. ⭐ Everything else said twice IS stutter, which
# is what `reads_clean` refuses.
NAME_JOINING_WORDS = frozenset((
    'a', 'after', 'against', 'an', 'and', 'at', 'behind', 'by', 'for', 'from',
    'how', 'in', 'into', 'its', 'of', 'on', 'open', 'out', 'past', 'people',
    'that', 'the', 'to', 'two', 'use', 'with',
))

TRIMMED_WORD = re.compile(r'[^a-z0-9-]')


def reads_clean(name):
    """Whether a name says every word it carries at most once.

    ⛔ "Fix the Phone Portrait Layout layout defects" is the shape this
    refuses: a template and the thing it is filled with saying one word twice.
    ⚠️ Both `take` and A10 read this, so a pair that stutters is never handed
    out AND never ships -- the check is not a second opinion on the allocator,
    it is the proof that the allocator has no way round it.

    @purity pure
    """
    said = set()
    for word in name.lower().split():
        word = TRIMMED_WORD.sub('', word)
        if not word or word in NAME_JOINING_WORDS:
            continue
        if word in said:
            return False
        said.add(word)
    return True


def numbered_increment(turn):
    """The increment template with its counter already in it.

    @purity pure
    """
    return IMPLEMENTATION_INCREMENT.replace('%d', str(turn))


def work_names_by_kind():
    """Every name a kind's vocabulary can say, and the template that says it.

    ⭐ THIS IS THE WHOLE OF WHAT A ROW MAY BE TOLD TO DO. A14 reads it to
    refuse a name the row's kind could not have produced, and the neutrality
    check reads it to refuse a string the generator did not draw from its own
    declared words. Built from the declarations alone -- never from what was
    written -- because a set read back off the artifact would allow whatever
    the artifact happened to hold.

    @purity pure
    """
    out = {}
    for kind, phases in WORK_BY_KIND.items():
        said = {}
        rotated = [one for held in phases for one in held]
        for template in rotated + [DELIVERY_WATCH, DELIVERY_HANDOVER]:
            for one in WORK_OBJECTS[kind]:
                said[template % one] = template
        # ⚠️ The three increments fold back onto ONE skeleton. Counting them as
        # three would let a row claim a spread of names it does not have.
        for turn in range(1, INCREMENTS + 1):
            for one in WORK_OBJECTS[kind]:
                said[numbered_increment(turn) % one] = IMPLEMENTATION_INCREMENT
        out[kind] = said
    return out


SAYABLE = work_names_by_kind()


# ---------------------------------------------------------------------------
# The rows
# ---------------------------------------------------------------------------

def flatten(tree, parent=None, depth=1, rows=None):
    """The row forest, depth first, each row carrying its parent, depth and kind.

    ⭐ The kind is inherited unless ROW_KIND names this row, which is what
    makes "where it sits in the tree" the answer to "what work does it do".

    @purity pure
    """
    rows = [] if rows is None else rows
    for order, (label, children) in enumerate(tree):
        row = {
            'label': label,
            'parent': parent,
            'depth': depth,
            'order': order,
            'siblings': len(tree),
            'kind': ROW_KIND.get(label,
                                 parent['kind'] if parent else ROOT_KIND),
            'children': [],
            'tasks': [],
        }
        row['id'] = str(uuid.uuid5(ID_NAMESPACE, '%s/%s' % (
            parent['id'] if parent else '', label)))
        rows.append(row)
        if parent is not None:
            parent['children'].append(row)
        flatten(children, row, depth + 1, rows)
    for row in rows:
        row['height'] = height_of(row)
    return rows


def height_of(row):
    """How many levels hang under this row.

    @purity pure
    """
    if not row['children']:
        return 0
    return 1 + max(height_of(child) for child in row['children'])


def work_counts(rows, wanted):
    """How much work of its own each row carries, adding up to `wanted`.

    The cycle fixes the SHAPE of the spread (TP-7), not its total. Scale the
    rows until the total is exact, then hand the rounding residue to the
    biggest rows one at a time -- biggest first, so a row never drops to zero
    and the unevenness the cycle put there survives. Every step is decided by
    the row order, so two runs agree.

    @purity pure
    """
    counts = {}
    seen = {}
    for row in rows:
        if row['label'] in OVERVIEW_ROWS:
            continue
        depth = row['depth']
        turn = seen.get(depth, 0)
        seen[depth] = turn + 1
        cycle = WORK_CYCLE[depth]
        counts[row['id']] = cycle[turn % len(cycle)]
    raw = sum(counts.values())
    for key in counts:
        counts[key] = max(2, int(round(counts[key] * wanted / float(raw))))
    order = sorted(counts, key=lambda key: (-counts[key], key))
    step = 1 if sum(counts.values()) < wanted else -1
    cursor = 0
    while sum(counts.values()) != wanted:
        key = order[cursor % len(order)]
        cursor += 1
        if step < 0 and counts[key] <= 2:
            continue
        counts[key] += step
    return counts


def phase_split(row, total):
    """How a row's work falls across the seven phases (largest remainder).

    ⛔ A phase its KIND has no vocabulary for takes no work, and its weight
    moves to the next phase the kind can work. Otherwise a height would put
    delivery work on a screen row, and the only names left to give it would be
    somebody else's.

    @purity pure
    """
    weights = list(HEIGHT_PHASE_WEIGHT[row['height']])
    vocabulary = WORK_BY_KIND[row['kind']]
    for phase in range(len(weights) - 1, -1, -1):
        if weights[phase] and not vocabulary[phase]:
            fallback = phase - 1 if phase > 0 else phase + 1
            weights[fallback] += weights[phase]
            weights[phase] = 0
    insist(sum(weights) > 0,
           'the row %s works no phase at all: kind %s has no vocabulary for '
           'the phases its height gives it' % (row['label'], row['kind']))
    weighed = sum(weights)
    exact = [total * weight / float(weighed) for weight in weights]
    taken = [int(value) for value in exact]
    left = total - sum(taken)
    order = sorted(range(len(weights)),
                   key=lambda p: (-(exact[p] - taken[p]), p))
    for step in range(left):
        taken[order[step % len(order)]] += 1
    for phase, count in enumerate(taken):
        insist(count == 0 or vocabulary[phase],
               'the row %s was given %d task(s) in the %s phase and its kind '
               '%s has no vocabulary for it'
               % (row['label'], count, PHASES[phase][0], row['kind']))
    return taken


def lane_of(row):
    """Where in the room it has this row places its band, as a fraction.

    Siblings slide across the room in the order the tree lists them, so the
    parts of one component are sequenced rather than piled on one another.
    ⚠️ Not the same as the row's order alone: two sibling sets of the same
    size would then land on the same days, and A6 exists because that reads as
    one bar drawn twice.

    @purity pure
    """
    place = 0.5 if row['siblings'] <= 1 else (
        row['order'] / float(row['siblings'] - 1))
    drawn = fraction(row['id'], 'lane')
    return min(1.0, max(0.0, place * (1.0 - LANE_SCATTER)
                        + drawn * LANE_SCATTER))


# ---------------------------------------------------------------------------
# The tasks
# ---------------------------------------------------------------------------

class Builder(object):
    """Everything the document holds, built once, in one order.

    ⛔ Not a bag of module-level lists: the uid counter, the tasks and the
    rows have to move together, and `Project.uidHighWaterMark` is the maximum
    uid ISSUED, not the maximum a Task holds (AT-20).
    """

    def __init__(self, settings):
        """@purity non-pure"""
        self.settings = settings
        self.rows = flatten(TREE)
        self.tasks = []
        self.by_uid = {}
        self.members = []
        self.visuals = []
        self.resources = []
        self.assignments = []
        self.next_uid = 0
        self.gates = {}
        self.painted = []
        self.phase_bars = {}
        self.stands_over = {}
        self.overview_uid = None
        self.overview_task_uids = set()
        self.rollups = set()
        # Every work name already handed out. ⛔ This is what makes a name
        # unique without the row label in it: a (template, object) pair is
        # spoken once in the whole document and `take` walks on when it meets
        # one that is.
        self.taken = set()
        # The two delivery pieces whose SHAPE follows from what they are.
        # ⚠️ Held by uid rather than found by reading the name back: a reader
        # that matched on the first word would draw the wrong shape the day a
        # template started with the same one.
        self.watched = set()
        self.handed = set()
        self.watched_names = set()
        self.handed_names = set()

    def issue_uid(self):
        """@purity non-pure"""
        self.next_uid += 1
        return self.next_uid

    def add_task(self, row, name, start_at, finish_at, phase, milestone=False,
                 parent_uid=None):
        """One task, on one row, dated in working-day indices.

        @purity non-pure
        """
        uid = self.issue_uid()
        task = {
            'uid': uid,
            'wbsParentUid': parent_uid,
            'wbsOrder': 0,
            'name': name,
            'start': text_of(WORKDAYS[start_at]),
            'finish': text_of(WORKDAYS[finish_at]),
            'milestone': milestone,
            'deadline': None,
            'notes': None,
            'calendarUid': None,
            'actualStart': None,
            'actualDuration': None,
            'actualFinish': None,
            'resume': None,
            'resumeValid': None,
            'percentComplete': 0,
            'fadeInDays': None,
            'fadeOutDays': None,
            'dependencies': [],
            'carry': {},
            'carryElements': [],
        }
        self.tasks.append(task)
        self.by_uid[uid] = task
        self.members.append({'taskUid': uid, 'groupId': row['id'],
                             'stackOrder': None})
        row['tasks'].append(uid)
        task['startAt'] = start_at
        task['finishAt'] = finish_at
        task['phase'] = phase
        return task

    # -- the first tree, which overviews the whole (TP-4, A11) --------------

    def build_overview(self):
        """The whole-project bar, the seven phase bars and the seven gates.

        @purity non-pure
        """
        rows = dict((row['label'], row) for row in self.rows)
        whole = self.add_task(
            rows[OVERVIEW_ROW], OVERVIEW_TASK,
            index_of(PROJECT_START), index_of(PROJECT_FINISH),
            len(PHASES) - 1)
        self.overview_uid = whole['uid']
        self.rollups.add(whole['uid'])
        self.overview_task_uids.add(whole['uid'])
        for phase, (name, start, gate, _glyph) in enumerate(PHASES):
            bar = self.add_task(rows[PHASE_BAR_ROW], PHASE_BAR_NAME % name,
                                index_of(start), index_of(gate), phase,
                                parent_uid=whole['uid'])
            self.phase_bars[phase] = bar['uid']
            self.overview_task_uids.add(bar['uid'])
        for phase, (name, _start, gate, _glyph) in enumerate(PHASES):
            mark = self.add_task(rows[PHASE_GATE_ROW], PHASE_GATE_NAME % name,
                                 index_of(gate), index_of(gate), phase,
                                 milestone=True, parent_uid=whole['uid'])
            self.gates[phase] = mark['uid']
            self.overview_task_uids.add(mark['uid'])

    # -- the work, leaves first (A1) ---------------------------------------

    def build_work(self, counts):
        """Every row's own work, laid out as ONE BAND through its phases.

        ⭐ A row is somebody's queue, so its work is chained: each piece
        starts a few working days after the one before it finished, each phase
        block follows the one before it, and the whole band is slid to where
        every block fits inside its own phase window. That is what makes a
        leaf row's work sit where the component is built (A15) instead of
        being smeared across three years -- and it is what gives the
        dependencies something to constrain (A17).

        ⭐ Starts never go backwards inside a row, which is what keeps a row
        from lapping the phase cycle (A4) and keeps a counter in a name in
        step with its date (A5).

        @purity non-pure
        """
        for row in self.rows:
            if row['label'] in OVERVIEW_ROWS:
                continue
            placed = self.row_band(row, phase_split(row, counts[row['id']]))
            for entry in self.name_band(row, placed):
                task = self.add_task(row, entry['name'], entry['start_at'],
                                     entry['finish_at'], entry['phase'],
                                     milestone=entry['is_mark'])
                if entry['is_mark']:
                    self.plant_glyph(task)
                if entry.get('watched'):
                    self.watched.add(task['uid'])
                if entry.get('handed'):
                    self.handed.add(task['uid'])

    def row_band(self, row, split):
        """Where every piece of this row's work sits, as working-day indices.

        ⛔ Nothing is placed until the whole band is known to fit: the blocks
        are measured first, the band is slid to a start that keeps every block
        inside its own phase window, and only then are the days handed out.
        Placing first and clipping afterwards is what put sixteen unrelated
        tasks on one day in the artifact this rewrite replaces.

        @purity semi-pure-a
        """
        live = [phase for phase, count in enumerate(split) if count]
        insist(live, 'the row %s was given no work at all' % row['label'])
        planted = self.plants(row) and split[live[-1]] >= 2
        scale = 1.0
        for _attempt in range(30):
            blocks = self.blocks_of(row, split, live, planted, scale)
            placed = self.slide(row, blocks)
            if placed is not None:
                return placed
            scale *= 0.82
        insist(False,
               'the row %s cannot be laid out inside its phase windows even '
               'at a thirtieth of its lengths' % row['label'])

    def blocks_of(self, row, split, live, planted, scale):
        """One block per phase: the lengths and the gaps between them.

        @purity semi-pure-a
        """
        blocks = []
        for phase in live:
            count = split[phase]
            mark_at = count - 1 if planted and phase == live[-1] else None
            lengths, gaps = [], []
            for turn in range(count):
                if turn == mark_at:
                    lengths.append(1)          # a point takes one day (SH-5)
                else:
                    days = duration_for(row['id'], phase, turn)
                    lengths.append(max(1, int(round(days * scale))))
                if turn < count - 1:
                    gaps.append(int(round(
                        weighed(WORK_GAPS, row['id'], phase, turn, 'gap')
                        * GAP_STRETCH[row['height']] * scale)))
            width = sum(lengths) + sum(gaps)
            blocks.append({'phase': phase, 'lengths': lengths, 'gaps': gaps,
                           'width': width, 'mark_at': mark_at})
        for turn in range(len(blocks) - 1):
            blocks[turn]['handoff'] = max(1, int(round(
                weighed(PHASE_HANDOFF_GAPS, row['id'], turn, 'handoff')
                * scale)))
        return blocks

    def slide(self, row, blocks):
        """Place the blocks one after another, each inside its phase window.

        The first block is placed by the row's lane, so rows spread across the
        window instead of piling on its first day. Every block after it starts
        as soon as the row's PULL lets it: a row with nothing under it pulls
        its next block up against the last one, because that is where the
        component is built; a row co-ordinating a programme spreads its blocks
        through the windows, because that is what co-ordination is.

        Gives back `None` when a block no longer fits the room its window has
        left, which is the signal to measure the band again at shorter
        lengths.

        @purity semi-pure-a
        """
        pull = BAND_PULL[row['height']]
        placed = []
        cursor = None
        for turn, block in enumerate(blocks):
            phase = block['phase']
            low = index_of(PHASES[phase][1])
            if cursor is not None:
                low = max(low, cursor)
            high = index_of(PHASES[phase][2]) - block['width'] + 1
            if low > high:
                return None
            # ⛔ Never exactly on the day the window opens. A row whose last
            # block ended before the next window exists would otherwise start
            # on its first day, and every such row would start on that ONE day
            # -- 82 of a thousand tasks landed on two of them before this wait
            # existed, which is what A9's ceiling is for.
            # ⚠️ The wait is bounded by HALF the room that is left, and the
            # reach is taken from what is left AFTER the wait: a placement that
            # can reach the last day the block fits pins the block against its
            # own gate, and thirteen tasks ended on the last day of the project
            # that way.
            room = high - low
            wait = int(fraction(row['id'], phase, 'wait')
                       * min(BAND_WAIT, room * 0.5))
            reach = lane_of(row) if turn == 0 else pull
            at = low + wait + int(round(reach * (room - wait)))
            for step, length in enumerate(block['lengths']):
                placed.append({
                    'phase': phase,
                    'start_at': at,
                    'finish_at': at + length - 1,
                    'is_mark': step == block['mark_at'],
                    'step': step,
                    'count': len(block['lengths']),
                    'mark_at': block['mark_at'],
                })
                at += length + (block['gaps'][step]
                                if step < len(block['gaps']) else 0)
            cursor = placed[-1]['finish_at'] + 1 + block.get('handoff', 0)
        return placed

    def plants(self, row):
        """Whether this row plants a milestone of its own at the end of its band.

        ⭐ Not every row: a lane with a marker in it every few weeks stops
        reading as a marker. One row in seven carries one.

        ⛔ At the END of the band, never in the middle. A milestone named
        "<row> ready" that sits before the row builds anything is signed off
        before its own work begins, and eight of them were -- one of them the
        PREDECESSOR of the build it claimed to gate, across a 270-day link.

        @purity pure
        """
        return row['depth'] >= 2 and fraction(row['id'], 'plant') <= 0.14

    def plant_glyph(self, task):
        """@purity non-pure"""
        turn = len(self.visuals)
        self.visuals.append(self.visual(task['uid'], 'milestone',
                                        GLYPHS[turn % len(GLYPHS)]))

    def name_band(self, row, placed):
        """Name a band once it is known to fit, and hand back what to build.

        ⛔ NOT named inside `slide`. The band is measured up to thirty times
        at shrinking lengths before one fits, and a name handed out during a
        measurement that is then thrown away would be spent for good -- every
        row after it would find the pairs it wanted already taken.

        @purity non-pure
        """
        out = []
        drawn = {}
        increments = None
        for turn, entry in enumerate(placed):
            named = dict(entry)
            named['name'] = self.name_for(row, entry, turn, drawn, increments)
            if named['name'] is None:
                increments = self.take_series(
                    row, [numbered_increment(one + 1)
                          for one in range(INCREMENTS)], turn)
                named['name'] = self.name_for(row, entry, turn, drawn,
                                              increments)
            named['watched'] = named['name'] in self.watched_names
            named['handed'] = named['name'] in self.handed_names
            out.append(named)
        return out

    def name_for(self, row, entry, turn, drawn, increments):
        """A name that reads as work this row would actually do.

        ⛔ THE ROW LABEL IS NOT IN IT. The row header says what the thing is;
        this says what the work is. Uniqueness comes from `take`, which spends
        each (template, object) pair once in the whole document.

        ⚠️ A milestone and a roll-up are the exception and DO name the row --
        they are the row signed off and the row summarised, and a reader meets
        them in the WBS outline where nothing else identifies them.

        ⭐ Where in the kind's list a row starts is drawn from the row's id, so
        two rows of one kind carrying the same amount of work do not end up
        with the same set of skeletons (A14).

        Hands back `None` the first time a row's numbered increments are
        wanted, because those three take ONE object between them and the
        caller settles that as a series.

        @purity non-pure
        """
        if entry['is_mark']:
            tail = MILESTONE_TAILS[int(fraction(row['id'], 'mark')
                                       * len(MILESTONE_TAILS))]
            return tail % row['label']
        phase = entry['phase']
        count, mark_at = entry['count'], entry['mark_at']
        step = entry['step']
        work = count if mark_at is None else count - 1
        if phase == DELIVERY_PHASE and work >= 3:
            if step == work - 1:
                name = self.take(row, DELIVERY_HANDOVER, turn)
                self.handed_names.add(name)
                return name
            if step == work - 2:
                name = self.take(row, DELIVERY_WATCH, turn)
                self.watched_names.add(name)
                return name
        if (phase == IMPLEMENTATION_PHASE and work >= INCREMENTS * 2
                and step >= work - INCREMENTS):
            if increments is None:
                return None
            return increments[step - work + INCREMENTS]
        templates = WORK_BY_KIND[row['kind']][phase]
        seen = drawn.get(phase, 0)
        drawn[phase] = seen + 1
        start = int(fraction(row['id'], phase, 'rotation') * len(templates))
        return self.take(row, templates[(start + seen) % len(templates)], turn)

    def take(self, row, template, turn):
        """Fill one template's slot with an object nobody has used it on yet.

        ⭐ The row prefers a small window of its kind's objects, because a row
        is one component's queue and a queue comes back to the same handful of
        things. It walks outward only when the pair it wanted is spent, which
        is what keeps a thousand names apart without a row label in any of
        them.

        @purity non-pure
        """
        objects = WORK_OBJECTS[row['kind']]
        first = (int(fraction(row['id'], 'object') * len(objects))
                 + turn % ROW_OBJECT_SPAN)
        for step in range(len(objects)):
            name = template % objects[(first + step) % len(objects)]
            if name not in self.taken and reads_clean(name):
                self.taken.add(name)
                return name
        insist(False,
               'the %s vocabulary has run out of ways to say %r, so the row '
               '%s cannot be given a name that is not already used'
               % (row['kind'], template, row['label']))

    def take_series(self, row, templates, turn):
        """Names for several templates that must share ONE object.

        ⚠️ The numbered increments are increments OF something, so all three
        name the same thing; A5 then reads the counter against the dates.

        @purity non-pure
        """
        objects = WORK_OBJECTS[row['kind']]
        first = (int(fraction(row['id'], 'object') * len(objects))
                 + turn % ROW_OBJECT_SPAN)
        for step in range(len(objects)):
            one = objects[(first + step) % len(objects)]
            names = [template % one for template in templates]
            if all(name not in self.taken and reads_clean(name)
                   for name in names):
                self.taken.update(names)
                return names
        insist(False,
               'the %s vocabulary has no object left that the row %s can take '
               'all %d increments of' % (row['kind'], row['label'],
                                         len(templates)))

    # -- the roll-ups, derived from what hangs under them (A1, A2, A3) ------

    def build_rollups(self):
        """One roll-up per row that has child rows, dated by its children.

        ⛔ Derived, never dated on its own. A parent that is dated
        independently is how the artifact this replaces came to hang three
        hundred tasks off a two-week bar.

        @purity non-pure
        """
        for row in sorted(self.rows, key=lambda one: -one['depth']):
            if row['label'] in OVERVIEW_ROWS or not row['children']:
                continue
            held = [self.by_uid[uid] for uid in row['tasks']]
            held += [self.by_uid[child['rollup']] for child in row['children']
                     if 'rollup' in child]
            held += [self.by_uid[uid] for child in row['children']
                     if 'rollup' not in child for uid in child['tasks']]
            insist(len(held) > 0,
                   'the row %s has neither work nor children to roll up'
                   % row['label'])
            start_at = min(one['startAt'] for one in held)
            finish_at = max(one['finishAt'] for one in held)
            phase = max(one['phase'] for one in held)
            task = self.add_task(row, ROLLUP_NAME % row['label'],
                                 start_at, finish_at, phase)
            row['rollup'] = task['uid']
            self.rollups.add(task['uid'])
            for one in held:
                one['wbsParentUid'] = task['uid']
        # Every root row's roll-up is a WBS root of its own, the way the row
        # forest has several roots (TP-4). ⛔ Hanging them under the overview
        # bar would make the WBS six deep, and TP-8 holds both axes at five.
        self.number_wbs()

    def number_wbs(self):
        """`wbsOrder` is the place under ONE parent, not a running count.

        @purity non-pure
        """
        seen = {}
        for task in sorted(self.tasks, key=lambda one: (one['startAt'],
                                                        one['uid'])):
            parent = task['wbsParentUid']
            turn = seen.get(parent, 0)
            seen[parent] = turn + 1
            task['wbsOrder'] = turn

    # -- what has already happened (A12) -----------------------------------

    def apply_actuals(self, status_at):
        """Actuals that agree with the status date, by table T-019a.

        ⭐ WITH REAL VARIANCE. Fourteen months into a three-year programme,
        some work started late, some finished quicker than planned, some ran
        over and is still open past the day it was due, and some has not been
        touched although its planned start has passed. A plan where every one
        of three hundred started tasks began on its planned day and every
        finished one ended on its planned day is not a plan anybody worked to.

        ⭐ Every state emitted is one table T-019a admits: PS-1 for work that
        has not begun, PS-2 for work with a finish recorded, PS-3 and PS-4 for
        the two suspensions, PS-5 for work in progress. The three delay
        readings of table T-021b (`DL-1` running past `finish`, `DL-2` not
        started past `start`, `DL-3` suspended past `resume`) all occur --
        ⚠️ delay is NOT a sixth state; it is derived from these five and the
        status date, which is why nothing here stores it.

        ⚠️ `percentComplete` is not a free value. FR-012 fixes it as
        `round(actualDuration / (finish - start) * 100)` in working days and
        forbids clamping it to 0..100 -- a task planned for a hundred days and
        done in eighty reads 80, and one that has taken a hundred and twenty
        reads 120. PR-9 of table T-016 marks the column read-only for the same
        reason. So the figure is never chosen here; it is always derived from
        what this method stored.

        @purity non-pure
        """
        for task in self.tasks:
            if task['uid'] in self.rollups or self.is_band(task):
                continue
            self.begin_actuals(task, status_at)
        self.honour_links(status_at)
        self.suspend_some(status_at)
        self.derive_actuals(status_at)

    def is_band(self, task):
        """Whether this task is a band of the first tree rather than work.

        ⭐ A gate is not a band: it is a point with a date of its own, and it
        is read as a task everywhere below.

        @purity semi-pure-a
        """
        return (task['uid'] in self.overview_task_uids
                and task['uid'] not in set(self.gates.values()))

    def begin_actuals(self, task, status_at):
        """One task's own reading of what has happened to it.

        @purity non-pure
        """
        span = task['finishAt'] - task['startAt']
        slip = weighed(START_SLIP, task['uid'], 'slip')
        began_at = min(len(WORKDAYS) - 1, max(0, task['startAt'] + slip))
        task['actualStartAt'] = began_at
        # ⭐ Some work due in the weeks just gone has simply not been picked
        # up. That is `DL-2` of table T-021b: not started, and the planned
        # start has passed. ⚠️ Only work that came due recently -- a task due
        # a year ago and never begun would be a plan nobody is reading, and
        # everything that waits on it would have to be unpicked too.
        if (status_at - IDLE_REACH <= task['startAt'] < status_at
                and fraction(task['uid'], 'idle') < IDLE_SHARE):
            task['actualStartAt'] = None
            return                                        # PS-1, all null
        if began_at > status_at:
            return                                        # PS-1, all null
        task['actualStart'] = text_of(WORKDAYS[began_at])
        if span == 0:
            # ⛔ FR-011 puts the right end of the actual bar at `actualStart`
            # plus `actualDuration` in working days, and says the recorded
            # finish IS that right end. So a piece of work that began and
            # ended on one day records ZERO, not one: FR-012 spells the same
            # convention out for the planned span ("the difference between the
            # start and the finish", and MUST NOT be mistaken for a count that
            # includes both ends), and the two ends of one bar cannot be
            # counted two different ways.
            # ⚠️ S-129 and S-130 are NOT this value. Those are what FR-043
            # places when somebody grabs the handle of work that has not
            # started -- work with no recorded finish for the duration to
            # disagree with -- and `uncomplete` is where they belong.
            # ⛔ No division at span zero (FR-012): a recorded finish reads 100.
            task['actualDuration'] = 0
            task['actualFinish'] = task['actualStart']
            task['resumeValid'] = False
            task['percentComplete'] = 100
            return
        worked = max(1, int(round(span * weighed(PACE, task['uid'], 'pace'))))
        ended_at = began_at + worked
        # ⭐ Some work is simply not finished, and its planned finish has gone
        # by. That is `DL-1` of table T-021b -- the first and commonest of the
        # three delay readings -- and it is also where FR-012's un-clamped
        # figure is seen, because the elapsed days have passed the planned
        # span. ⛔ Not a state: delay is derived from these columns and the
        # status date, so nothing is stored for it.
        stuck = (task['finishAt'] < status_at - 4 and not task['milestone']
                 and fraction(task['uid'], 'stuck') < STUCK_SHARE)
        if ended_at <= status_at and not stuck:           # PS-2, finished
            # FR-011: the right end of the actual bar IS `actualFinish`, so
            # the recorded duration and the recorded finish are one fact told
            # twice and may not disagree.
            task['actualDuration'] = worked
            task['actualFinish'] = text_of(WORKDAYS[ended_at])
            task['resumeValid'] = False
        else:                                             # PS-5, running
            # ⛔ NOT the elapsed days. `actualDuration` is the length of the
            # ACTUAL BAR (PR-5 of table T-016) -- how far the work has got --
            # and reading it as elapsed time makes a two-day job that stalled
            # in the spring read 4350%. What is stored is how far it has got,
            # bounded by the days that have actually passed.
            task['actualDuration'] = min(status_at - began_at,
                                         self.reached_of(task, span, status_at))
            task['resumeValid'] = True
        task['percentComplete'] = percent_of(task['actualDuration'], span)

    def reached_of(self, task, span, status_at):
        """How far a running piece of work has got, in working days.

        ⭐ Work whose planned finish has already gone by has usually eaten
        its whole estimate and then some, which is where FR-012's un-clamped
        figure comes from; work still inside its window is somewhere along it.

        @purity pure
        """
        roster = (OVERDUE_PROGRESS if task['finishAt'] < status_at
                  else PROGRESS)
        return max(1, int(round(
            span * weighed(roster, task['uid'], 'progress'))))

    def honour_links(self, status_at):
        """Nothing is complete whose predecessor is not (A16).

        ⛔ Read by link type, because the four types constrain different ends
        (table T-018). A finish-to-start or finish-to-finish successor cannot
        be finished while its predecessor is not; a start-to-finish successor
        cannot be finished while its predecessor has not begun; a
        start-to-start successor cannot have begun while its predecessor has
        not. ⚠️ Walked in the order the edges were drawn along, so one pass
        settles the whole chain.

        ⭐ This is what stops a gate being signed off before the work it gates
        is done -- eight of them were, one of them the PREDECESSOR of the
        build it claimed to gate.

        @purity non-pure
        """
        for task in sorted(self.tasks, key=self.order_key):
            if task['uid'] in self.rollups:
                continue
            for link in task['dependencies']:
                pred = self.by_uid[link['predecessorUid']]
                if self.is_band(pred):
                    # A phase band starts when its phase starts, by
                    # construction, so it never holds its own work back.
                    continue
                done = pred['actualFinish'] is not None
                begun = pred['actualStart'] is not None
                if link['linkType'] in (0, 1) and not done:
                    self.uncomplete(task, status_at)
                elif link['linkType'] == 2 and not begun:
                    self.uncomplete(task, status_at)
                elif link['linkType'] == 3 and not begun:
                    self.unbegin(task)

    def uncomplete(self, task, status_at):
        """Take a recorded finish back off a task, leaving it in progress.

        @purity non-pure
        """
        if task['actualFinish'] is None or task['actualStart'] is None:
            return
        span = task['finishAt'] - task['startAt']
        task['actualFinish'] = None
        task['resumeValid'] = True
        if span == 0:
            task['actualDuration'] = (self.settings['milestoneActualDuration']
                                      if task['milestone']
                                      else self.settings['actualInitialDuration'])
            # FR-012: no division at span 0, and no finish means 0.
            task['percentComplete'] = 0
            return
        task['actualDuration'] = min(max(1, status_at - task['actualStartAt']),
                                     self.reached_of(task, span, status_at))
        task['percentComplete'] = percent_of(task['actualDuration'], span)

    def unbegin(self, task):
        """Take a task back to PS-1, which is every column empty.

        @purity non-pure
        """
        task['actualStart'] = None
        task['actualDuration'] = None
        task['actualFinish'] = None
        task['resume'] = None
        task['resumeValid'] = None
        task['percentComplete'] = 0
        task['actualStartAt'] = None

    def suspend_some(self, status_at):
        """The two suspensions of table T-019, on work that is in progress.

        ⛔ PS-3 is read before PS-4, so a suspension with no date planned is
        told by `resumeValid` being false and NOT by the date being absent. A
        suspension also stopped before the status date, so its actual bar is
        shorter than the elapsed time -- that gap is the thing FR-013 draws.

        ⭐ A third of the planned resumes are already in the past, which is
        `DL-3` of table T-021b: suspended, and the day it was to be picked up
        again has gone by.

        @purity non-pure
        """
        stalled = [one for one in self.tasks
                   if one['actualStart'] is not None
                   and one['actualFinish'] is None
                   and one['uid'] not in self.rollups
                   and not self.is_band(one)
                   and not one['milestone']
                   and one['finishAt'] - one['startAt'] > 4]
        stalled.sort(key=lambda one: fraction(one['uid'], 'stall'))
        for turn, task in enumerate(stalled[:SUSPENSIONS]):
            span = task['finishAt'] - task['startAt']
            task['actualDuration'] = max(1, int(task['actualDuration'] * 0.6))
            task['percentComplete'] = percent_of(task['actualDuration'], span)
            if turn % 3 == 2:
                # PS-3: the work stopped and nobody knows when it resumes.
                task['resumeValid'] = False
                task['resume'] = None
                continue
            # PS-4: the work stopped, and a day to pick it up again is set.
            # ⚠️ Every third of them is a day that has already gone by, so
            # that `DL-3` has something to be read against.
            away = 18 if turn % 3 == 0 else -12
            task['resume'] = text_of(WORKDAYS[min(len(WORKDAYS) - 1,
                                                  max(0, status_at + away))])
            task['resumeValid'] = True

    def derive_actuals(self, status_at):
        """The roll-ups and the bands, which own no work of their own.

        ⛔ A roll-up's figure is not a number somebody typed: FR-012 derives
        `percentComplete` from `actualDuration` and the planned span, so the
        way to make a roll-up read as the sum of what hangs under it is to
        store the `actualDuration` that FR-012 turns into that sum. The weight
        is each descendant's planned duration, because a two-day task and a
        ninety-day workstream are not each half of their parent.

        @purity non-pure
        """
        under = descendants_of(self)
        for task in sorted(self.tasks, key=lambda one: -len(under[one['uid']])):
            if task['uid'] not in self.rollups:
                continue
            self.roll_up(task, [self.by_uid[uid] for uid in under[task['uid']]
                                if uid not in self.rollups], status_at)
        for phase in range(len(PHASES)):
            self.roll_up(self.by_uid[self.phase_bars[phase]],
                         [one for one in self.tasks
                          if one['phase'] == phase
                          and one['uid'] not in self.rollups
                          and not self.is_band(one)], status_at)
        # ⚠️ The whole-project bar stands over the phase bands and the
        # gates, which ARE its WBS children -- not over every task, so that a
        # reader recomputing the figure from the WBS gets the same answer.
        self.roll_up(self.by_uid[self.overview_uid],
                     [self.by_uid[uid] for uid in under[self.overview_uid]],
                     status_at)

    def roll_up(self, task, held, status_at):
        """One derived task, read off what it stands over.

        @purity non-pure
        """
        insist(held, 'the task %s stands over nothing' % task['name'])
        self.stands_over[task['uid']] = [one['uid'] for one in held]
        begun = [one for one in held if one['actualStart'] is not None]
        if not begun:
            return                                        # PS-1, all null
        task['actualStartAt'] = min(one['actualStartAt'] for one in begun)
        task['actualStart'] = text_of(WORKDAYS[task['actualStartAt']])
        span = task['finishAt'] - task['startAt']
        if all(one['actualFinish'] is not None for one in held):
            ended = max(index_of(date.fromisoformat(one['actualFinish'][:10]))
                        for one in held)
            task['actualFinish'] = text_of(WORKDAYS[ended])
            task['actualDuration'] = max(0, ended - task['actualStartAt'])
            task['resumeValid'] = False
            task['percentComplete'] = (100 if span == 0
                                       else percent_of(task['actualDuration'],
                                                       span))
            return
        weighed_sum, weights = 0.0, 0.0
        for one in held:
            weight = float(one['finishAt'] - one['startAt'] + 1)
            weighed_sum += one['percentComplete'] * weight
            weights += weight
        share = weighed_sum / weights
        task['actualDuration'] = max(0, int(round(share * span / 100.0)))
        task['resumeValid'] = True
        task['percentComplete'] = (0 if span == 0
                                   else percent_of(task['actualDuration'],
                                                   span))


    # -- who is on what (A12, table T-225) ---------------------------------

    def build_people(self):
        """Work resources, and one assignment for every piece of real work.

        ⛔ A roll-up gets no owner: it is the sum of what hangs under it, and
        naming an owner on it would put the same work in two lanes.

        ⛔ NEITHER DOES A BAND OF THE FIRST TREE. "Implementation phase" is a
        band over eighteen months of the programme, and making it one named
        person's task -- the longest task in the plan -- says that person is
        doing all of it. TP-4 calls the first tree the row that overviews the
        WHOLE, which is the same argument as the roll-up's. ⚠️ An unassigned
        task is a state the specification draws rather than a hole: AS-2 of
        table T-225 requires the assignee label to read `-` for exactly this.

        @purity non-pure
        """
        uids = []
        for name in RESOURCE_NAMES:
            uid = self.issue_uid()
            uids.append(uid)
            self.resources.append({
                'uid': uid,
                'name': name,
                # FR-008: an assignee is created as a WORK resource, because
                # FR-059 draws assignee labels for those alone.
                'resourceKind': 1,
                'isCostResource': False,
                'calendarUid': None,
                'carry': {},
                'carryElements': [],
            })
        for task in self.tasks:
            if (task['uid'] in self.rollups
                    or task['uid'] in self.overview_task_uids):
                continue
            pool = PHASE_RESOURCES[task['phase']]
            pick = pool[int(fraction(task['uid'], 'owner') * len(pool))]
            self.assignments.append({
                'uid': self.issue_uid(),
                'taskUid': task['uid'],
                'resourceUid': uids[pick],
                'carry': {},
                'carryElements': [],
            })

    # -- what depends on what (A12, tables T-018 and T-053) ----------------

    def build_dependencies(self):
        """A web of dependencies that chains, and never contradicts the dates.

        ⛔ Acyclic by construction (IV-4): an edge is only ever drawn from the
        smaller of two tasks in the total order (start, finish, uid) to the
        larger, so following edges strictly increases that key.

        ⛔ EVERY LINK CONSTRAINS SOMETHING. A link is drawn only when its two
        ends are within DEPENDENCY_MAX_GAP working days of each other. Where a
        pair is further apart than that, NO link is drawn -- a dependency
        whose successor starts three months after its predecessor finished
        tells a reader nothing, and 548 of them hide the ones that do.

        ⚠️ Nested under the SUCCESSOR (DF-4 of table T-053), which is why
        `schedule` has no `dependencies` key of its own.

        @purity non-pure
        """
        made = set()

        def link(pred, succ, kind):
            """@purity non-pure"""
            if pred['uid'] == succ['uid'] or (pred['uid'], succ['uid']) in made:
                return False
            if self.order_key(pred) >= self.order_key(succ):
                return False
            # ⛔ Half open (R3.4): FINISH to START means the successor starts
            # AFTER the predecessor has finished, so the two may not share the
            # day. The other three relations name the same edge of both bars,
            # so they may.
            if kind == 1:
                gap = succ['startAt'] - pred['finishAt'] - 1
                if gap < 0:
                    return False
            elif kind == 3:
                gap = succ['startAt'] - pred['startAt']
            elif kind == 0:
                gap = succ['finishAt'] - pred['finishAt']
            else:
                gap = succ['finishAt'] - pred['startAt']
            if gap < 0 or gap > DEPENDENCY_MAX_GAP:
                return False
            made.add((pred['uid'], succ['uid']))
            succ['dependencies'].append({
                'predecessorUid': pred['uid'],
                'linkType': kind,
                # S-118 fixes the unit as working days; S-117 makes 0 "no gap".
                # ⚠️ Only a finish-to-start link has room between its ends to
                # measure; the other three name one edge of each bar, so the
                # value there is S-117's zero.
                'lag': gap if kind == 1 else 0,
                # ⛔ NOT left unstated. `erd.json` says this column IS the unit
                # of `lag`, and the exchange partner's own documentation says
                # "LinkLag requires a LagFormat to be specified". The code for
                # working days is read from the canon, not invented.
                'lagFormat': LAG_FORMAT_WORKING_DAYS,
                'carry': {},
                'carryElements': [],
            })
            return True

        for row in self.rows:
            held = [self.by_uid[uid] for uid in row['tasks']
                    if uid not in self.rollups]
            held.sort(key=self.order_key)
            for turn in range(1, len(held)):
                if turn % 3 == 2:
                    continue                     # not every task waits on one
                pred, succ = held[turn - 1], held[turn]
                if not link(pred, succ, 1):      # DP-1 FS
                    link(pred, succ, 3)          # DP-4 SS
            # DP-3 FF: two rows under one parent finish together, because the
            # parent is not done until both of them are. ⚠️ Only where they
            # really do finish together -- `link` drops the pair otherwise.
            for turn in range(1, len(row['children'])):
                mine = self.last_of(row['children'][turn - 1]['tasks'])
                theirs = self.last_of(row['children'][turn]['tasks'])
                if mine is not None and theirs is not None:
                    link(mine, theirs, 0)
        # The work that finishes just before a gate feeds that gate. ⛔ FS,
        # because a milestone is a point and the four date relations collapse
        # on it (FR-009). ⚠️ Only the work that finishes NEAR the gate: a gate
        # is not held up by something that finished a quarter earlier, and a
        # link saying it was would be the fiction this rewrite removes.
        for phase in range(len(PHASES)):
            gate = self.by_uid[self.gates[phase]]
            near = [one for one in self.tasks
                    if one['phase'] == phase
                    and one['uid'] not in self.rollups
                    and one['uid'] not in self.overview_task_uids
                    and 0 <= gate['startAt'] - one['finishAt'] - 1
                    <= DEPENDENCY_MAX_GAP]
            near.sort(key=lambda one: (-one['finishAt'], one['uid']))
            for one in near[:GATE_FEEDERS]:
                link(one, gate, 1)
            # ⛔ AND THE GATE HOLDS THE NEXT PHASE BACK. All seven gates used
            # to have three predecessors each and no successor anywhere, which
            # makes a gate a decoration: nothing in the picture waits on it,
            # so signing it off changes nothing. The work of the next phase
            # that starts just after the gate starts BECAUSE of it (DP-1 FS).
            # ⚠️ The last gate has no phase after it to hold back, which is
            # why A19 asks the question of the first six.
            if phase + 1 < len(PHASES):
                waiting = [one for one in self.tasks
                           if one['phase'] == phase + 1
                           and one['uid'] not in self.rollups
                           and one['uid'] not in self.overview_task_uids
                           and 0 <= one['startAt'] - gate['finishAt'] - 1
                           <= DEPENDENCY_MAX_GAP]
                waiting.sort(key=lambda one: (one['startAt'], one['uid']))
                for one in waiting[:GATE_FEEDERS]:
                    link(gate, one, 1)
            # The phase bar opens the phase, so the work that starts with it
            # starts with the bar (DP-4 SS).
            bar = self.by_uid[self.phase_bars[phase]]
            opening = [one for one in self.tasks
                       if one['phase'] == phase
                       and one['uid'] not in self.rollups
                       and one['uid'] not in self.overview_task_uids
                       and 0 <= one['startAt'] - bar['startAt']
                       <= DEPENDENCY_MAX_GAP]
            opening.sort(key=lambda one: (one['startAt'], one['uid']))
            for one in opening[:GATE_FEEDERS]:
                link(bar, one, 3)
        # ⛔ AND THE TREES WAIT ON EACH OTHER (WAITS_ON). Closest pair first,
        # so the link that is drawn is the one that really does constrain --
        # and a relation whose two rows never come within
        # DEPENDENCY_MAX_GAP of each other draws nothing at all, the same rule
        # every other link here follows.
        by_label = dict((row['label'], row) for row in self.rows)
        for ahead_label, behind_label in WAITS_ON:
            ahead = self.work_under(by_label[ahead_label])
            behind = self.work_under(by_label[behind_label])
            near = []
            for pred in ahead:
                for succ in behind:
                    gap = succ['startAt'] - pred['finishAt'] - 1
                    kind = 1                             # DP-1 FS
                    if not 0 <= gap <= DEPENDENCY_MAX_GAP:
                        gap = succ['startAt'] - pred['startAt']
                        kind = 3                         # DP-4 SS
                    if 0 <= gap <= DEPENDENCY_MAX_GAP:
                        near.append((gap, pred['uid'], succ['uid'], kind))
            near.sort()
            drawn = 0
            for _gap, pred_uid, succ_uid, kind in near:
                if drawn >= WAITING_LINKS:
                    break
                if link(self.by_uid[pred_uid], self.by_uid[succ_uid], kind):
                    drawn += 1
        # DP-2 SF, the rare one: a row cannot close its delivery until the
        # first thing it delivered has begun.
        for row in self.rows:
            held = [self.by_uid[uid] for uid in row['tasks']
                    if uid not in self.rollups
                    and self.by_uid[uid]['phase'] == DELIVERY_PHASE]
            if len(held) < 2:
                continue
            held.sort(key=self.order_key)
            for turn in range(1, len(held)):
                link(held[turn - 1], held[turn], 2)

    def order_key(self, task):
        """The total order edges are drawn along.

        @purity pure
        """
        return (task['startAt'], task['finishAt'], task['uid'])

    def work_under(self, row):
        """Every piece of real work on this row and on the rows under it.

        ⭐ The work is on the leaves, so a relation stated between two rows
        has to reach what is indented under them or it would find nothing to
        join. ⛔ Roll-ups are not in it: a roll-up is derived from what hangs
        under it, and holding one up would hold up everything twice.

        @purity semi-pure-a
        """
        held = []
        stack = [row]
        while stack:
            one = stack.pop()
            held.extend(self.by_uid[uid] for uid in one['tasks']
                        if uid not in self.rollups
                        and uid not in self.overview_task_uids)
            stack.extend(one['children'])
        held.sort(key=self.order_key)
        return held

    def last_of(self, uids):
        """@purity semi-pure-a"""
        held = [self.by_uid[uid] for uid in uids if uid not in self.rollups]
        if not held:
            return None
        return sorted(held, key=self.order_key)[-1]

    # -- how it is drawn (A12, tables T-012 and T-012a) ---------------------

    def visual(self, uid, shape, glyph=None, fill=None, stroke=None,
               weight=None):
        """@purity pure"""
        return {
            'taskUid': uid,
            'nameAnchor': None,
            'nameAlign': None,
            'shapeKind': shape,
            'milestoneGlyph': glyph,
            'fillColor': fill,
            'strokeColor': stroke,
            'lineWeight': weight,
        }

    def build_visuals(self):
        """The five shapes of table T-012, and the eight glyphs of SH-5.

        @purity non-pure
        """
        self.visuals.append(self.visual(self.overview_uid, 'rectangle'))
        for phase in range(len(PHASES)):
            self.visuals.append(self.visual(self.phase_bars[phase], 'chevron'))
        for phase, (_name, _start, _gate, glyph) in enumerate(PHASES):
            self.visuals.append(self.visual(self.gates[phase], 'milestone',
                                            glyph))
        for task in self.tasks:
            if task['uid'] in self.handed:
                self.visuals.append(self.visual(task['uid'], 'arrow'))
            elif task['uid'] in self.watched:
                self.visuals.append(self.visual(task['uid'], 'endpointSpan'))
        # ⭐ The piece of work that closes each top-level component's planning
        # is given a colour of its own, so the six of them read as one set
        # across the whole chart -- which is what FR-007 lets an author do, and
        # what nothing in the artifact this replaces was doing.
        planning = 2
        for turn, row in enumerate(self.top_rows()):
            held = [self.by_uid[uid] for uid in row['tasks']
                    if uid not in self.rollups
                    and self.by_uid[uid]['phase'] == planning]
            if not held:
                continue
            closer = sorted(held, key=self.order_key)[-1]
            fill, stroke, weight = AUTHOR_PAINT[turn % len(AUTHOR_PAINT)]
            self.painted.append(closer)
            self.visuals.append(self.visual(closer['uid'], 'rectangle', None,
                                            fill, stroke, weight))

    def top_rows(self):
        """The product trees, in the order the forest lists them.

        @purity semi-pure-a
        """
        return [row for row in self.rows
                if row['parent'] is None and row['label'] not in OVERVIEW_ROWS]

    def build_fades(self):
        """Fades, on rectangles and chevrons alone (FD-5 of table T-012a).

        ⛔ Never on an arrow, an endpoint span or a milestone: FD-5 limits the
        shapes, and IV-11 and IV-12 bound the days.

        @purity non-pure
        """
        # ⭐ Where a fade means something: nobody knows exactly when the survey
        # began, and nobody knows exactly when the last of the delivery work
        # peters out.
        self.by_uid[self.phase_bars[0]]['fadeInDays'] = 5
        self.by_uid[self.phase_bars[len(PHASES) - 1]]['fadeOutDays'] = 8
        longest = sorted(self.painted,
                         key=lambda one: -(one['finishAt'] - one['startAt']))
        for task in longest[:2]:
            if task['finishAt'] - task['startAt'] < 8:
                continue
            task['fadeInDays'] = 3
            task['fadeOutDays'] = 4

    # -- assembly ----------------------------------------------------------

    def project(self, status_at, hue):
        """@purity semi-pure-a"""
        # ⭐ Every row of table T-224 (PF-1 .. PF-10) carries a value: that
        # table is the whole list of what the document information panel
        # shows, and a template that leaves all ten empty ships a panel with
        # nothing in it. ⛔ Neutral values, because FR-027 puts identifier
        # VALUES in scope as well as prose.
        return {
            'id': None,
            'name': PROJECT_NAME,                     # PF-1
            'title': PROJECT_TITLE,                   # FR-035, not PF-1
            'subject': PROJECT_SUBJECT,               # PF-2
            'category': PROJECT_CATEGORY,             # PF-3
            'company': PROJECT_COMPANY,               # PF-4
            'manager': PROJECT_MANAGER,               # PF-5
            'author': PROJECT_AUTHOR,                 # PF-6
            'created': text_of(PROJECT_CREATED),      # PF-9
            'revision': PROJECT_REVISION,             # PF-7
            'lastSaved': text_of(PROJECT_LAST_SAVED),  # PF-10
            'startDate': text_of(PROJECT_START),
            'statusDate': text_of(WORKDAYS[status_at]),
            'minutesPerDay': None,
            'minutesPerWeek': None,
            'daysPerMonth': None,
            'weekStartDay': CALENDAR_VALUES['S-108'],
            'calendarUid': 1,
            'themeHue': hue,
            'uidHighWaterMark': self.next_uid,
            'importSeq': 0,
            'carry': {},
            'carryElements': [],
        }

    def task_groups(self):
        """@purity semi-pure-a"""
        out = []
        for row in self.rows:
            # ⭐ A couple of rows carry a colour and a height of their own, so
            # FR-042's overrides are exercised. The rest are resolved from the
            # theme and the number of stacked levels.
            color = dict(ROW_PAINT).get(row['label'])
            height = None
            if row['label'] == OVERVIEW_ROW:
                height = 64
            elif row['label'] == PHASE_GATE_ROW:
                height = 40
            out.append({
                'id': row['id'],
                'parentId': row['parent']['id'] if row['parent'] else None,
                'label': row['label'],
                # FR-058 lets a row take its name from the task it was derived
                # from; every row here names itself, and AT-54 only forbids a
                # row with neither.
                'derivedFromTaskUid': None,
                'order': row['order'],
                'isCollapsed': False,
                'isHidden': False,
                'color': color,
                'height': height,
            })
        return out

    def calendar(self):
        """@purity semi-pure-a"""
        return {
            'uid': 1,
            'name': CALENDAR_NAME,
            'isBaseCalendar': True,
            'baseCalendarUid': None,
            'ordinal': 0,
            'carry': {},
            'carryElements': [],
            # dayType is the 1 = Sunday encoding; S-106 lists the working ones.
            'weekDays': [{'ordinal': day - 1, 'dayType': day,
                          'dayWorking': day in WORKING_DAY_TYPES,
                          'carry': {}, 'carryElements': []}
                         for day in range(1, 8)],
            # S-107 keeps the DEFAULT calendar free of exceptions because
            # holding them would presume a region; FR-088's rationale says a
            # document therefore has to be able to carry its own shutdowns, or
            # the day counts do not match reality. This document carries its
            # own, and `is_working_day` counts by them.
            'exceptions': [
                {'ordinal': turn, 'name': name,
                 'fromDate': text_of(first), 'toDate': text_of(last),
                 'dayWorking': False,
                 # 9 is "no recurrence" (erd.json, Exception.recurrenceKind).
                 # ⛔ Never a repeating kind: FR-054 says GRS does not expand
                 # one into real days, so a repeating exception here would be
                 # days nothing counts.
                 'recurrenceKind': 9,
                 'carry': {}, 'carryElements': []}
                for turn, (name, first, last) in enumerate(CALENDAR_EXCEPTIONS)
            ],
        }

    def stripped_tasks(self):
        """The tasks, without the working-day indices used to build them.

        @purity semi-pure-a
        """
        out = []
        for task in self.tasks:
            row = dict(task)
            for key in ('startAt', 'finishAt', 'phase', 'actualStartAt'):
                row.pop(key, None)
            out.append(row)
        return out


# ---------------------------------------------------------------------------
# What the document has to be before a byte of it is written
# ---------------------------------------------------------------------------

def descendants_of(built):
    """Every task under each task, by `wbsParentUid`.

    @purity pure
    """
    children = {}
    for task in built.tasks:
        children.setdefault(task['wbsParentUid'], []).append(task['uid'])
    out = {}
    for task in built.tasks:
        held = []
        stack = list(children.get(task['uid'], []))
        while stack:
            uid = stack.pop()
            held.append(uid)
            stack.extend(children.get(uid, []))
        out[task['uid']] = held
    return out


def check_rollup(built, under):
    """A1 -- a WBS parent contains every task under it. A2 -- and is not a point.

    @purity semi-pure-b
    """
    for task in built.tasks:
        held = under[task['uid']]
        if not held:
            continue
        insist(task['startAt'] != task['finishAt'],
               'A2: the milestone %s has %d WBS children, and a point cannot '
               'contain a span' % (task['name'], len(held)))
        first = min(built.by_uid[uid]['startAt'] for uid in held)
        last = max(built.by_uid[uid]['finishAt'] for uid in held)
        insist(task['startAt'] <= first and task['finishAt'] >= last,
               'A1: %s runs %s..%s and does not contain its %d descendant(s), '
               'which run %s..%s'
               % (task['name'], WORKDAYS[task['startAt']],
                  WORKDAYS[task['finishAt']], len(held),
                  WORKDAYS[first], WORKDAYS[last]))


def window_of(built, row, with_children=True):
    """The days a row covers, optionally counting the rows indented under it.

    @purity pure
    """
    held = list(row['tasks'])
    if with_children:
        stack = list(row['children'])
        while stack:
            one = stack.pop()
            held.extend(one['tasks'])
            stack.extend(one['children'])
    if not held:
        return None
    return (min(built.by_uid[uid]['startAt'] for uid in held),
            max(built.by_uid[uid]['finishAt'] for uid in held))


def check_nesting(built):
    """A3 -- the indentation does not lie.

    @purity semi-pure-b
    """
    for row in built.rows:
        if row['parent'] is None:
            continue
        mine = window_of(built, row)
        theirs = window_of(built, row['parent'], with_children=False)
        insist(mine is not None and theirs is not None,
               'A3: %s or its parent carries no task at all' % row['label'])
        insist(theirs[0] <= mine[0] and theirs[1] >= mine[1],
               'A3: the row %s runs %s..%s and escapes its parent %s, which '
               'runs %s..%s'
               % (row['label'], WORKDAYS[mine[0]], WORKDAYS[mine[1]],
                  row['parent']['label'], WORKDAYS[theirs[0]],
                  WORKDAYS[theirs[1]]))


def check_phase_order(built, under):
    """A4 -- no row laps the phase cycle.

    ⚠️ Roll-ups are not in this: one spans the phases of everything under it,
    so it has no single phase to be in order by. A7 covers them instead, by
    the LAST phase they reach.

    @purity semi-pure-b
    """
    for row in built.rows:
        held = [built.by_uid[uid] for uid in row['tasks'] if not under[uid]]
        held.sort(key=lambda one: (one['startAt'], one['uid']))
        for turn in range(1, len(held)):
            insist(held[turn]['phase'] >= held[turn - 1]['phase'],
                   'A4: on the row %s, %s (%s) starts after %s (%s) and goes '
                   'back a phase'
                   % (row['label'], held[turn]['name'],
                      PHASES[held[turn]['phase']][0], held[turn - 1]['name'],
                      PHASES[held[turn - 1]['phase']][0]))


COUNTED = re.compile(r'^(.*?)(\d+)$')


def check_counters(built):
    """A5 -- where a name carries a counter, it agrees with the dates.

    @purity semi-pure-b
    """
    stems = {}
    for task in built.tasks:
        hit = COUNTED.match(task['name'])
        if hit is None:
            continue
        stems.setdefault(hit.group(1), []).append((int(hit.group(2)), task))
    for stem, held in stems.items():
        held.sort()
        for turn in range(1, len(held)):
            insist(held[turn][1]['startAt'] >= held[turn - 1][1]['startAt'],
                   'A5: %s is numbered %d and starts before number %d'
                   % (held[turn][1]['name'], held[turn][0], held[turn - 1][0]))


def check_twins(built):
    """A6 -- no two rows hold the same dates.

    @purity semi-pure-b
    """
    seen = {}
    for row in built.rows:
        shape = tuple(sorted((built.by_uid[uid]['startAt'],
                              built.by_uid[uid]['finishAt'])
                             for uid in row['tasks']))
        insist(shape not in seen,
               'A6: the rows %s and %s hold the identical set of dates'
               % (seen.get(shape), row['label']))
        seen[shape] = row['label']


def check_gates(built):
    """A7 -- work belonging to a phase is done by that phase's gate.

    @purity semi-pure-b
    """
    last = index_of(PROJECT_FINISH)
    for task in built.tasks:
        gate_at = built.by_uid[built.gates[task['phase']]]['finishAt']
        insist(task['finishAt'] <= gate_at,
               'A7: %s finishes %s, after the %s gate on %s'
               % (task['name'], WORKDAYS[task['finishAt']],
                  PHASES[task['phase']][0], WORKDAYS[gate_at]))
    ending = [one for one in built.tasks if one['finishAt'] == last]
    insist(len(ending) <= 10,
           'A7: %d tasks finish on the last day of the project, which is what '
           'clipping a span looks like' % len(ending))


def check_durations(built):
    """A8 -- lengths spread, with a real tail.

    @purity semi-pure-b
    """
    spread = {}
    leaves = {}
    for task in built.tasks:
        days = (WORKDAYS[task['finishAt']] - WORKDAYS[task['startAt']]).days + 1
        spread[days] = spread.get(days, 0) + 1
        if task['uid'] not in built.rollups:
            leaves[days] = leaves.get(days, 0) + 1
    insist(len(spread) >= 40,
           'A8: only %d distinct durations, and the condition asks for 40'
           % len(spread))
    # ⚠️ Measured over the work, not over the roll-ups: a roll-up is long
    # because of what hangs under it, so counting them would let a plan of
    # nothing but three-week tasks claim a tail it does not have.
    insist(len(leaves) >= 40,
           'A8: the work itself takes only %d distinct durations' % len(leaves))
    insist(min(leaves) <= 1 and sorted(leaves)[1] <= 3,
           'A8: nothing short enough -- the shortest are %s'
           % sorted(leaves)[:3])
    insist(max(leaves) >= 60,
           'A8: the longest piece of work runs %d days, which is not a '
           'workstream' % max(leaves))
    worst = max(spread, key=lambda days: spread[days])
    share = spread[worst] * 100.0 / len(built.tasks)
    insist(share <= 15.0,
           'A8: %.1f%% of tasks run exactly %d days, over the 15%% ceiling'
           % (share, worst))


def months_of(first, last):
    """@purity pure"""
    out = []
    year, month = first.year, first.month
    while (year, month) <= (last.year, last.month):
        out.append('%04d-%02d' % (year, month))
        month += 1
        if month == 13:
            year, month = year + 1, 1
    return out


def check_effort(built):
    """A9 -- the effort curve is a curve, not a wall at the end.

    @purity semi-pure-b
    """
    months = months_of(PROJECT_START, PROJECT_FINISH)
    started = dict((month, 0) for month in months)
    for task in built.tasks:
        started[WORKDAYS[task['startAt']].strftime('%Y-%m')] += 1
    empty = [month for month in months if started[month] == 0]
    insist(not empty, 'A9: no task starts in %s' % ', '.join(empty))
    busiest = max(started, key=lambda month: started[month])
    share = started[busiest] * 100.0 / len(built.tasks)
    insist(share <= 8.0,
           'A9: %s carries %.1f%% of every start, over the 8%% ceiling'
           % (busiest, share))
    quarters = [sum(started[month] for month in months[at:at + 3])
                for at in range(0, len(months), 3)]
    insist(quarters[-1] < max(quarters),
           'A9: the final quarter carries %d starts, the most of any quarter'
           % quarters[-1])


def check_names(built):
    """A10 -- a name reads as work, is said once, and does not stutter.

    @purity semi-pure-b
    """
    verbs = set(['Deliver'])
    for vocabulary in WORK_BY_KIND.values():
        for templates in vocabulary:
            for one in templates:
                verbs.add(one.split()[0])
    for one in (DELIVERY_WATCH, DELIVERY_HANDOVER, IMPLEMENTATION_INCREMENT):
        verbs.add(one.split()[0])
    seen = set()
    for task in built.tasks:
        name = task['name']
        insist(name not in seen, 'A10: two tasks are called %s' % name)
        seen.add(name)
        reads = (name.split()[0] in verbs
                 or any(name.endswith(tail) for tail in DELIVERABLE_TAILS))
        insist(reads,
               'A10: %s is neither a verb nor a deliverable, so it does not '
               'read as a piece of work' % name)
        insist(reads_clean(name),
               'A10: %s says one of its own words twice' % name)
    labels = set()
    for row in built.rows:
        insist(row['label'] not in labels,
               'A10: two rows are called %s, and the row title panel shows the '
               'leaf label alone' % row['label'])
        labels.add(row['label'])
    # ⛔ THE BAR SAYS WHAT THE WORK IS; THE ROW SAYS WHAT THE THING IS. 985 of
    # a thousand names restated their own row's label, which the row header
    # was already showing. ⚠️ A roll-up and a milestone are exempt because
    # neither is work: one is the row summarised and the other is the row
    # signed off, and both are read in the WBS outline away from the header.
    for row in built.rows:
        if row['label'] in OVERVIEW_ROWS:
            continue
        for uid in row['tasks']:
            task = built.by_uid[uid]
            if uid in built.rollups or task['milestone']:
                continue
            insist(row['label'].lower() not in task['name'].lower(),
                   'A10: %s restates the label of the row it sits on (%s), '
                   'which the row header already shows'
                   % (task['name'], row['label']))


def check_overview(built):
    """A11 -- the first tree overviews the whole.

    @purity semi-pure-b
    """
    bar = built.by_uid[built.overview_uid]
    insist(bar['start'] == text_of(PROJECT_START),
           'A11: the overview bar starts %s and Project.startDate is %s'
           % (bar['start'], text_of(PROJECT_START)))
    insist(bar['finishAt'] == index_of(PROJECT_FINISH),
           'A11: the overview bar ends %s, not at the end of the project'
           % bar['finish'])
    for phase in range(len(PHASES)):
        held = built.by_uid[built.phase_bars[phase]]
        insist(bar['startAt'] <= held['startAt']
               and bar['finishAt'] >= held['finishAt'],
               'A11: the overview bar does not contain the %s phase'
               % PHASES[phase][0])
    rows = dict((row['label'], row) for row in built.rows)
    insist(rows[PHASE_BAR_ROW]['parent'] is rows[OVERVIEW_ROW]
           and rows[PHASE_GATE_ROW]['parent'] is rows[OVERVIEW_ROW],
           'A11: the phase rows are not under the row that overviews the whole')


def plan_actual_state(task):
    """Table T-019a, read top to bottom, first row that matches.

    ⭐ Total by construction (`PS-5` catches the rest), which is what the
    table says about itself: there is no `Task` in no state.

    @purity pure
    """
    if task['actualStart'] is None:
        return 'PS-1'
    if task['actualFinish'] is not None:
        return 'PS-2'
    if task['resumeValid'] is False:
        return 'PS-3'
    if task['resume'] is not None:
        return 'PS-4'
    return 'PS-5'


def check_dead_data(built, status_at):
    """A12 -- nothing that should be drawn is left empty.

    @purity semi-pure-b
    """
    insist(0 < status_at < len(WORKDAYS) - 1,
           'A12: the status date is outside the project window')
    states = {}
    for task in built.tasks:
        states[plan_actual_state(task)] = states.get(
            plan_actual_state(task), 0) + 1
    for row in ('PS-1', 'PS-2', 'PS-3', 'PS-4', 'PS-5'):
        insist(states.get(row, 0) >= 3,
               'A12: %d task(s) are in the state %s of table T-019a, and a '
               'template that never reaches a state leaves it undrawn'
               % (states.get(row, 0), row))
    insist(states['PS-5'] >= 50,
           'A12: only %d task(s) are visibly part done at the status date'
           % states['PS-5'])
    suspended = [one for one in built.tasks
                 if plan_actual_state(one) in ('PS-3', 'PS-4')]
    insist(not [one for one in suspended
                if one['resumeValid'] is False and one['resume'] is not None],
           'A12: a task is suspended with resumeValid false AND a resume date, '
           'which PS-3 reads before PS-4 and would hide')
    insist(len(built.resources) >= 8 and len(built.assignments) >= 500,
           'A12: %d resource(s) and %d assignment(s) is not a plan anybody owns'
           % (len(built.resources), len(built.assignments)))
    named = {}
    for one in built.resources:
        named.setdefault(one['name'], []).append(one['uid'])
    insist(any(len(uids) > 1 for uids in named.values()),
           'A12: no two resources share a name, so AS-8 of table T-225 has no '
           'representative in the document')
    links = sum(len(one['dependencies']) for one in built.tasks)
    insist(links >= 200,
           'A12: %d dependencies is not a web' % links)
    kinds = set()
    for task in built.tasks:
        for one in task['dependencies']:
            kinds.add(one['linkType'])
    insist(kinds == set([0, 1, 2, 3]),
           'A12: the dependencies use link types %s, and table T-018 has four'
           % sorted(kinds))
    shapes = set(one['shapeKind'] for one in built.visuals)
    insist(shapes == set(SHAPE_KINDS),
           'A12: the drawn shapes are %s, and table T-012 has five'
           % sorted(shapes))
    glyphs = set(one['milestoneGlyph'] for one in built.visuals
                 if one['shapeKind'] == 'milestone')
    insist(glyphs == set(GLYPHS),
           'A12: the milestones use %d of the eight glyphs of SH-5'
           % len(glyphs))
    painted = [one for one in built.visuals
               if one['fillColor'] is not None or one['strokeColor'] is not None]
    insist(len(painted) >= 3,
           'A12: %d task(s) carry a colour of their own, so FR-007 is not '
           'exercised' % len(painted))
    faded = [one for one in built.tasks
             if one['fadeInDays'] is not None or one['fadeOutDays'] is not None]
    insist(len(faded) >= 3, 'A12: %d task(s) fade' % len(faded))
    drawn_as = dict((one['taskUid'], one['shapeKind']) for one in built.visuals)
    for task in faded:
        insist(drawn_as.get(task['uid']) in ('rectangle', 'chevron'),
               'A12: %s fades and is drawn as %s, which FD-5 forbids'
               % (task['name'], drawn_as.get(task['uid'])))
    coloured = [one for one in built.task_groups() if one['color'] is not None]
    sized = [one for one in built.task_groups() if one['height'] is not None]
    insist(coloured and sized,
           'A12: no row carries a colour or a height of its own (FR-042)')
    # ⛔ A band of the first tree is not one person's task. B7 of the second
    # audit: "Implementation phase" was a 395-day leaf owned solely by
    # Developer B, and it was the longest task in the plan.
    owned = set(one['taskUid'] for one in built.assignments)
    for uid in built.overview_task_uids:
        insist(uid not in owned,
               'A12: %s is a band of the first tree and carries an assignee'
               % built.by_uid[uid]['name'])


def check_vocabulary(built):
    """A14 -- the work in a row comes from what that row IS.

    ⛔ Two measurements, both of which the artifact this replaces failed. A
    thousand names collapsed to 59 skeletons, one of which appeared in 95 of
    the 100 rows; and 62 rows carried a task-name SET identical to another
    row's, which is the duplicate-bar-set defect wearing new clothes.

    @purity semi-pure-b
    """
    rows = dict((row['id'], row) for row in built.rows)
    where = {}
    for member in built.members:
        where[member['taskUid']] = rows[member['groupId']]
    shapes = {}
    for task in built.tasks:
        row = where[task['uid']]
        # ⚠️ The first tree is exempt: its three rows hold the fixed contents
        # of TP-4 -- a whole-project bar, seven phase bands and seven gates --
        # and no kind says those.
        if row['label'] in OVERVIEW_ROWS:
            continue
        # ⛔ Every name is one its own row's kind could have said.
        insist(sayable(row, task),
               'A14: %s is on a %s row, whose kind has no such work'
               % (task['name'], row['kind']))
        shapes.setdefault(row['label'], set()).add(skeleton_of(row, task))
    seen = {}
    for label, held in shapes.items():
        key = tuple(sorted(held))
        insist(key not in seen,
               'A14: the rows %s and %s carry the identical set of task names '
               'with the noun swapped' % (seen.get(key), label))
        seen[key] = label
    spread = {}
    for label, held in shapes.items():
        for shape in held:
            spread[shape] = spread.get(shape, 0) + 1
    # ⚠️ The roll-up is deliberately the same shape on every row that has one
    # ("<ROW> workstream"), so it is measured apart from the work.
    worst = max((count, shape) for shape, count in spread.items()
                if not shape.endswith(' workstream'))
    insist(worst[0] <= len(shapes) * 0.34,
           'A14: %s is on %d of the %d rows, over the third that says the '
           'rows are one checklist' % (worst[1], worst[0], len(shapes)))
    insist(len(spread) >= 120,
           'A14: a thousand names collapse to %d shapes' % len(spread))


def skeleton_of(row, task):
    """The template that could have said this task's name, on this row.

    ⭐ A roll-up and a milestone name the row itself, so they keep their own
    skeleton with the label taken back out; everything else is a piece of work
    and is looked up in what its kind can say.

    ⚠️ Hands back `None` for a name no vocabulary reaches, which is what A14
    refuses.

    @purity pure
    """
    label = row['label']
    name = task['name']
    if name == ROLLUP_NAME % label:
        return ROLLUP_NAME
    for tail in MILESTONE_TAILS:
        if name == tail % label:
            return tail
    return SAYABLE[row['kind']].get(name)


def sayable(row, task):
    """Whether this row's kind could have produced this task's name.

    @purity pure
    """
    return skeleton_of(row, task) is not None


def check_clustering(built):
    """A15 -- a leaf row's work sits where that component is built.

    ⛔ 60 leaf rows with a median span of 558 days and a median density of
    0.17 is a plan smeared across three years. The density is the days a row
    has a bar on divided by the days between its first start and its last
    finish.

    @purity semi-pure-b
    """
    spans, densities = [], []
    for row in built.rows:
        if row['children'] or row['label'] in OVERVIEW_ROWS or not row['tasks']:
            continue
        held = [built.by_uid[uid] for uid in row['tasks']]
        first = min(one['startAt'] for one in held)
        last = max(one['finishAt'] for one in held)
        busy = set()
        for one in held:
            busy.update(range(one['startAt'], one['finishAt'] + 1))
        spans.append(last - first + 1)
        densities.append(len(busy) / float(last - first + 1))
    insist(len(spans) >= 40, 'A15: only %d leaf rows to measure' % len(spans))
    spans.sort()
    densities.sort()
    middle = len(spans) // 2
    insist(densities[middle] >= 0.40,
           'A15: the median leaf row has a bar on %.2f of the days it spans, '
           'and a row that empty is not a row anybody planned'
           % densities[middle])
    insist(spans[middle] <= 320,
           'A15: the median leaf row spans %d working days' % spans[middle])
    smeared = [one for one in spans if one > 400]
    insist(len(smeared) <= 12,
           'A15: %d leaf rows span more than 400 working days' % len(smeared))


def check_progress(built, status_at):
    """A16 -- the actuals are a plan somebody has been working to.

    ⛔ Every state is one table T-019a admits, every figure is the one FR-012
    derives, nothing is complete whose predecessor is not, and all three delay
    readings of table T-021b occur. The artifact this replaces had 327 started
    tasks of which 327 began on their planned day, 311 finished tasks of which
    311 ended on their planned day, and 308 tasks at exactly 100%.

    @purity semi-pure-b
    """
    late, early, quick, over, running_late, unstarted_late, resume_late = (
        0, 0, 0, 0, 0, 0, 0)
    for task in built.tasks:
        span = task['finishAt'] - task['startAt']
        state = plan_actual_state(task)
        if state == 'PS-1':
            insist(task['actualStart'] is None
                   and task['actualFinish'] is None
                   and task['actualDuration'] is None
                   and task['percentComplete'] == 0,
                   'A16: %s reads PS-1 and carries actuals' % task['name'])
            if task['startAt'] < status_at:
                unstarted_late += 1               # DL-2 of table T-021b
            continue
        insist(task['actualDuration'] is not None,
               'A16: %s has started and records no duration' % task['name'])
        began_at = index_of(date.fromisoformat(task['actualStart'][:10]))
        insist(began_at <= status_at,
               'A16: %s records a start after the status date' % task['name'])
        if began_at > task['startAt']:
            late += 1
        elif began_at < task['startAt']:
            early += 1
        # FR-012: the stored figure is the derived figure, always.
        wanted = (task['percentComplete'] if span == 0
                  else percent_of(task['actualDuration'], span))
        if span == 0:
            wanted = 100 if task['actualFinish'] is not None else 0
        insist(task['percentComplete'] == wanted,
               'A16: %s stores %d%% and FR-012 derives %d%% from its own '
               'columns' % (task['name'], task['percentComplete'], wanted))
        if task['percentComplete'] > 100:
            # FR-012's own example: planned a hundred days, took a hundred and
            # twenty, reads 120. It applies to finished work as much as to
            # work still open.
            over += 1
        if state == 'PS-2':
            ended_at = index_of(date.fromisoformat(task['actualFinish'][:10]))
            insist(ended_at <= status_at,
                   'A16: %s records a finish after the status date'
                   % task['name'])
            if ended_at < task['finishAt']:
                quick += 1
            # FR-011: the right end of the actual bar is `actualStart` plus
            # `actualDuration` in working days, and a recorded finish IS that
            # right end, so the two may not tell different stories.
            # ⛔ NO "if span > 0" GUARD. It used to sit here and it skipped
            # exactly the twenty rows that disagreed -- work whose actual
            # start and actual finish were one day, storing a duration of one
            # against a bar zero days wide. A check that steps over the cases
            # it would fail on is not a check.
            insist(task['actualDuration'] == ended_at - began_at,
                   'A16: %s runs %s..%s and records %d working day(s), which '
                   'is not where FR-011 puts the right end of its actual bar'
                   % (task['name'], task['actualStart'], task['actualFinish'],
                      task['actualDuration']))
            continue
        if task['finishAt'] < status_at:
            running_late += 1                     # DL-1 of table T-021b
        if (state == 'PS-4'
                and index_of(date.fromisoformat(task['resume'][:10]))
                < status_at):
            resume_late += 1                      # DL-3 of table T-021b
    insist(late >= 60, 'A16: only %d task(s) started later than planned' % late)
    insist(early >= 10, 'A16: only %d task(s) started early' % early)
    insist(quick >= 30, 'A16: only %d task(s) finished early' % quick)
    insist(over >= 10,
           'A16: only %d task(s) read over 100%%, so FR-012 not being clamped '
           'is never seen' % over)
    insist(running_late >= 10,
           'A16: only %d task(s) are running past their planned finish (DL-1)'
           % running_late)
    insist(unstarted_late >= 5,
           'A16: only %d task(s) are unstarted past their planned start (DL-2)'
           % unstarted_late)
    insist(resume_late >= 3,
           'A16: only %d suspended task(s) are past their resume date (DL-3)'
           % resume_late)
    for task in built.tasks:
        for link in task['dependencies']:
            pred = built.by_uid[link['predecessorUid']]
            if pred['uid'] in built.overview_task_uids and not pred['milestone']:
                continue
            if link['linkType'] in (0, 1):
                insist(task['actualFinish'] is None
                       or pred['actualFinish'] is not None,
                       'A16: %s is complete and its predecessor %s is not'
                       % (task['name'], pred['name']))
            elif link['linkType'] == 2:
                insist(task['actualFinish'] is None
                       or pred['actualStart'] is not None,
                       'A16: %s is complete and its predecessor %s has not '
                       'begun' % (task['name'], pred['name']))
            else:
                insist(task['actualStart'] is None
                       or pred['actualStart'] is not None,
                       'A16: %s has begun and its predecessor %s has not'
                       % (task['name'], pred['name']))


def check_links(built):
    """A17 -- every dependency constrains something.

    @purity semi-pure-b
    """
    held = 0
    for task in built.tasks:
        for link in task['dependencies']:
            held += 1
            pred = built.by_uid[link['predecessorUid']]
            kind = link['linkType']
            if kind == 1:
                gap = task['startAt'] - pred['finishAt'] - 1
                insist(gap >= 0,
                       'A17: %s follows %s finish to start and begins on the '
                       'day it finished; the reading is half open (R3.4)'
                       % (task['name'], pred['name']))
            elif kind == 3:
                gap = task['startAt'] - pred['startAt']
            elif kind == 0:
                gap = task['finishAt'] - pred['finishAt']
            else:
                gap = task['finishAt'] - pred['startAt']
            insist(0 <= gap <= DEPENDENCY_MAX_GAP,
                   'A17: %s depends on %s across %d working days, and a link '
                   'that far apart constrains nothing'
                   % (task['name'], pred['name'], gap))
            insist(link['lag'] == (gap if kind == 1 else 0),
                   'A17: the lag on %s does not measure its own gap'
                   % task['name'])
            insist(link['lagFormat'] is not None,
                   'A17: %s carries a lag with no unit, and erd.json says the '
                   'unit of `lag` IS `lagFormat`' % task['name'])
    insist(held >= 200, 'A17: %d dependencies is not a web' % held)


def tree_of(row):
    """The top-level row this row hangs under.

    @purity pure
    """
    while row['parent'] is not None:
        row = row['parent']
    return row['label']


def check_reach(built):
    """A19 -- a gate holds work back. A20 -- the trees wait on each other.

    ⛔ Both were measured at zero. All seven gates had three predecessors and
    no successor anywhere, which makes a gate a decoration rather than a gate;
    and 373 of 406 links stayed inside a single display row, with every one of
    the 30 that did not touching the overview lane. Mobile Client never waited
    on Web Service.

    @purity semi-pure-b
    """
    where = {}
    rows = dict((row['id'], row) for row in built.rows)
    for member in built.members:
        where[member['taskUid']] = rows[member['groupId']]
    successors = {}
    pairs = {}
    inside = 0
    held = 0
    for task in built.tasks:
        for link in task['dependencies']:
            held += 1
            pred = built.by_uid[link['predecessorUid']]
            successors[pred['uid']] = successors.get(pred['uid'], 0) + 1
            ahead, behind = where[pred['uid']], where[task['uid']]
            if ahead['id'] == behind['id']:
                inside += 1
            first, second = tree_of(ahead), tree_of(behind)
            if first != second:
                pairs[(first, second)] = pairs.get((first, second), 0) + 1
    # ⚠️ The LAST gate has no phase after it to hold back, so it is not asked.
    for phase in range(len(PHASES) - 1):
        gate = built.by_uid[built.gates[phase]]
        insist(successors.get(gate['uid'], 0) > 0,
               'A19: nothing anywhere waits on the %s gate, and a gate that '
               'holds nothing back is a decoration' % PHASES[phase][0])
    overview = set([OVERVIEW_ROW])
    between = dict((pair, count) for pair, count in pairs.items()
                   if pair[0] not in overview and pair[1] not in overview)
    insist(len(between) >= 8,
           'A20: the product trees wait on one another across %d pair(s) of '
           'trees, and six trees that never wait on each other are six plans '
           'printed on one page' % len(between))
    insist(sum(between.values()) >= 20,
           'A20: only %d link(s) cross from one product tree to another'
           % sum(between.values()))
    insist(inside * 100.0 / held <= 80.0,
           'A20: %.1f%% of the links stay inside one display row'
           % (inside * 100.0 / held))


def check_rollup_reading(built):
    """A18 -- a roll-up reads as the sum of what hangs under it.

    ⚠️ FR-012 and PR-9 make `percentComplete` derived, so this does not check
    a second rule: it checks that the `actualDuration` stored on a roll-up is
    the one whose FR-012 figure is the duration-weighted reading of what it
    stands over. 33 of 40 summaries were more than three points away from it.

    ⚠️ A row's roll-up stands over its WBS descendants, and this checks that
    too -- the two lists have to agree, or the roll-up is reading something
    other than the rows indented under it.

    @purity semi-pure-b
    """
    under = descendants_of(built)
    for task in built.tasks:
        if task['uid'] not in built.rollups:
            continue
        wanted = sorted(uid for uid in under[task['uid']]
                        if uid not in built.rollups)
        insist(sorted(built.stands_over.get(task['uid'], [])) == wanted,
               'A18: %s rolls up something other than what hangs under it'
               % task['name'])
    for uid, over in built.stands_over.items():
        task = built.by_uid[uid]
        if task['actualFinish'] is not None or task['actualStart'] is None:
            continue
        held = [built.by_uid[one] for one in over]
        weighed_sum = sum(one['percentComplete']
                          * (one['finishAt'] - one['startAt'] + 1)
                          for one in held)
        weights = sum(one['finishAt'] - one['startAt'] + 1 for one in held)
        share = weighed_sum / float(weights)
        insist(abs(share - task['percentComplete']) <= 2.0,
               'A18: %s stores %d%% against a duration-weighted %.1f%% of what '
               'hangs under it'
               % (task['name'], task['percentComplete'], share))


def check_counts(built):
    """A13 -- the counts table T-226 fixes.

    @purity semi-pure-b
    """
    insist(len(built.rows) == WANTED_ROWS,
           'TP-5: the tree holds %d rows, and table T-226 asks for %d'
           % (len(built.rows), WANTED_ROWS))
    insist(len(built.tasks) == WANTED_TASKS,
           'TP-6: built %d tasks, and table T-226 asks for %d'
           % (len(built.tasks), WANTED_TASKS))
    depth = max(row['depth'] for row in built.rows)
    insist(depth == 5,
           'TP-5 and TP-8: the row tree is %d deep, and the cap FR-004 imposes '
           'is 5' % depth)
    # ⚠️ Not a single pass in uid order: a roll-up is issued AFTER the work it
    # rolls up, so a parent's uid can be larger than its child's.
    wbs = {}

    def deep(uid):
        """@purity semi-pure-a"""
        if uid not in wbs:
            parent = built.by_uid[uid]['wbsParentUid']
            wbs[uid] = 1 if parent is None else deep(parent) + 1
        return wbs[uid]

    for task in built.tasks:
        deep(task['uid'])
    insist(max(wbs.values()) == 5,
           'TP-8: the WBS is %d deep, and the row depth is 5'
           % max(wbs.values()))
    roots = [row for row in built.rows if row['parent'] is None]
    insist(len(roots) >= 3,
           'TP-4: %d top-level row(s), and the table asks for a forest'
           % len(roots))
    insist(len(PHASES) == 7, 'TP-3: %d phases, and the table asks for seven'
           % len(PHASES))
    per_row = set(len(row['tasks']) for row in built.rows)
    insist(len(per_row) > 5,
           'TP-7: the tasks per row take only %d different values'
           % len(per_row))


# ---------------------------------------------------------------------------
# ⭐ The invariants, driven by the manuscript rather than by a list here
#
# ⛔ Table T-220 does not name a single column. Each of its rows points at
# the KEY field or the TYPE field of table T-058, or at the target table T-057
# gives a foreign key, and the note under the table forbids listing the columns
# by name (MUST NOT) for a stated reason: a column added to the manuscript
# would then have to be added here too. A checker that hand-lists them falls
# behind the manuscript exactly the same way. ⚠️ It did: IV-1 covered 6 of the
# 15 primary keys, IV-14 covered 2 of the 8 entities that carry a date, and a
# duplicated `WeekDay.ordinal`, a duplicated `TaskOrigin.taskUid` and a
# `BaselineTask.start` reading "not-a-day" all wrote the file with exit 0.
#
# Both tables are generated FROM docs/spec/_source/erd.json, so reading that
# file IS reading them (docs/spec/_assets/fig-erd-detail.md says so at its
# head). ⭐ Nothing below names a column.
# ---------------------------------------------------------------------------

ERD = json.load(io.open(os.path.join(ROOT, 'docs', 'spec', '_source',
                                     'erd.json'), encoding='utf-8'))
ENTITIES = dict((one['name'], one) for one in ERD['entities'])
BACKTICKED = re.compile(r'`([^`]+)`')

# Table T-214's two ends (S-119 and S-120), which IV-14 measures against.
# ⛔ Not typed here: they arrive through the same generated block the rest of
# the presentation values do.
ACCEPTED_FIRST_DAY = settings_defaults()['importMinDate']
ACCEPTED_LAST_DAY = settings_defaults()['importMaxDate']


def columns_keyed(entity, mark):
    """The columns of one entity whose key field carries this mark.

    ⚠️ A column that is both spells it `PK/FK`, so the field is split rather
    than compared whole. Three of the fifteen primary keys are of that shape,
    and a reader comparing the whole field misses every one of them.

    @purity pure
    """
    return [one['name'] for one in ENTITIES[entity]['columns']
            if mark in re.split(r'[/,]', one.get('key') or '')]


def date_columns_of(entity):
    """The columns of one entity the type field calls a day or a moment.

    @purity pure
    """
    return [one['name'] for one in ENTITIES[entity]['columns']
            if one.get('json', {}).get('isDate')]


def nested_of(entity):
    """`(column, entity)` for every column that holds rows of another entity.

    @purity pure
    """
    out = []
    for column in ENTITIES[entity]['columns']:
        shape = column.get('json', {})
        if shape.get('kind') == 'array' and isinstance(shape.get('of'), dict):
            held = shape['of'].get('entity')
            if held is not None:
                out.append((column['name'], held))
    return out


def points_at(entity, column):
    """Which entity a foreign key points at, from table T-057.

    ⚠️ The relation names its column in backticks inside its label, which is
    the only place the manuscript joins the two. `insist` catches the day that
    stops being unique.

    @purity semi-pure-b
    """
    found = [one['child'] for one in ERD['relations']
             if one['parent'] == entity
             and column in BACKTICKED.findall(one.get('label', {}).get('ja', ''))]
    insist(len(found) == 1,
           'IV-2: table T-057 names %d relation(s) for %s.%s, and the reader '
           'here needs exactly one' % (len(found), entity, column))
    return found[0]


def entity_places(document):
    """Every place in the document where rows of one entity sit.

    ⭐ Taken from the container of the ERD, which is where the manuscript says
    which array holds which entity, and then followed down through the columns
    that hold rows of another entity (the weak ones).

    @purity semi-pure-b
    """
    places = []

    def descend(entity, value, path):
        """@purity semi-pure-a"""
        rows = value if isinstance(value, list) else [value]
        places.append((entity, path, rows))
        for row in rows:
            for column, held in nested_of(entity):
                descend(held, row[column], '%s[].%s' % (path, column))

    boxes = dict((one['id'], one) for one in ERD['container']['boxes'])
    for _kind, key, entity in boxes['schedule']['entity_rows']:
        descend(entity, document['schedule'][key], 'schedule.' + key)
    for box in ERD['container']['boxes']:
        if 'entity' in box and box['id'] in document:
            descend(box['entity'], document[box['id']], box['id'])
    return places


def calendar_entities():
    """The entities that ARE the document's calendar, however deeply nested.

    ⛔ A day the calendar itself declares cannot be tested against the
    calendar: a shutdown's `fromDate` is by definition NOT a working day, and
    a check that asked would refuse the document for saying what it means.
    ⚠️ Read out of erd.json rather than named here, so the day another entity
    is nested under `Calendar` this reader already knows about it.

    @purity semi-pure-b
    """
    held = set()
    stack = ['Calendar']
    while stack:
        entity = stack.pop()
        for _column, nested in nested_of(entity):
            if nested not in held:
                held.add(nested)
                stack.append(nested)
    return held


def document_calendar(document):
    """Whether a day works, read off the DOCUMENT's own calendar (FR-054).

    ⛔ Not off a hard-coded weekday rule and not off this file's own module
    constants: FR-054 says the working days follow the document's calendar,
    which is its week days AND its exceptions, and a checker that knew the
    rule some other way would pass a document whose dates had been moved onto
    a Saturday or into its own shutdown.

    ⚠️ `recurrenceKind` 9 is "no recurrence", which is what makes `fromDate`
    and `toDate` real inclusive days. FR-054 does not expand a REPEATING
    exception, so one of those closes nothing this reader can count.

    @purity semi-pure-b
    """
    schedule = document['schedule']
    resolved = [one for one in schedule['calendars']
                if one['uid'] == schedule['project']['calendarUid']]
    insist(len(resolved) == 1,
           'IV-17: Project.calendarUid does not resolve to one calendar')
    calendar = resolved[0]
    working = set(day['dayType'] for day in calendar['weekDays']
                  if day['dayWorking'])
    shut = set()
    for one in calendar['exceptions']:
        if one['dayWorking'] or one['recurrenceKind'] != NO_RECURRENCE:
            continue
        first, last = day_of(one['fromDate']), day_of(one['toDate'])
        insist(first is not None and last is not None,
               'IV-14: the calendar exception %s does not spell two days'
               % one['name'])
        at = first
        while at <= last:
            shut.add(at)
            at += timedelta(days=1)

    def works(day):
        """@purity pure"""
        if day in shut:
            return False
        return ((day.weekday() + 1) % 7) + 1 in working

    return works


def check_keys_and_references(document):
    """IV-1, IV-2 and IV-14, over every column the manuscript marks.

    @purity semi-pure-b
    """
    places = entity_places(document)
    works = document_calendar(document)
    declared = calendar_entities()
    known = {}
    for entity, _path, rows in places:
        primary = columns_keyed(entity, 'PK')
        for column in primary:
            for row in rows:
                known.setdefault((entity, column), set()).add(row[column])
    marked = 0
    for entity, path, rows in places:
        for column in columns_keyed(entity, 'PK'):
            marked += 1
            seen = set()
            for row in rows:
                insist(row[column] not in seen,
                       'IV-1: %s.%s repeats the value %s inside %s'
                       % (entity, column, row[column], path))
                seen.add(row[column])
        for column in columns_keyed(entity, 'FK'):
            target = points_at(entity, column)
            wanted = columns_keyed(target, 'PK')
            insist(len(wanted) == 1,
                   'IV-2: %s has %d primary key column(s), and a foreign key '
                   'needs exactly one to point at' % (target, len(wanted)))
            among = known.get((target, wanted[0]), set())
            for row in rows:
                insist(row[column] is None or row[column] in among,
                       'IV-2: %s.%s in %s points at %s, which is not in the '
                       'document' % (entity, column, path, row[column]))
        for column in date_columns_of(entity):
            marked += 1
            for row in rows:
                check_day(entity, column, row[column],
                          None if entity in declared else works)
    insist(marked >= 30,
           'IV-1 and IV-14: only %d marked column(s) were read out of the '
           'manuscript, so the reader has stopped finding them' % marked)


SPELLED_DAY = re.compile(r'^\d{4}-\d{2}-\d{2}$')
# EX-7 of table T-033 keeps the time part a value GRS writes and does not
# interpret, so a reader has to accept one -- and has to accept ONLY one.
SPELLED_TIME = re.compile(r'^\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$')

# `Exception.recurrenceKind` 9, "no recurrence" (erd.json).
NO_RECURRENCE = 9


def day_of(value):
    """The day a stored date spells, or `None` when it does not spell one.

    ⛔ PARSED, NEVER PATTERN MATCHED. The reader here used to be an unanchored
    regex over the first ten characters, so "2027-13-45T00:00:00",
    "2027-02-30T00:00:00" and "2027-05-04 NOT A DAY AT ALL" all read as days
    and shipped. A month of 13 and a February of 30 are only caught by the
    calendar arithmetic a real parse does.

    ⚠️ Not `date.fromisoformat` alone either: from Python 3.11 that also
    accepts "20270504" and a whole timestamp, so the shape is settled first
    and only then handed to the parser.

    @purity pure
    """
    if not isinstance(value, str):
        return None
    spelled, mark, rest = value.partition('T')
    if SPELLED_DAY.match(spelled) is None:
        return None
    if mark and SPELLED_TIME.match(rest) is None:
        return None
    try:
        return date.fromisoformat(spelled)
    except ValueError:
        return None


ACCEPTED_FIRST = day_of(ACCEPTED_FIRST_DAY)
ACCEPTED_LAST = day_of(ACCEPTED_LAST_DAY)


def check_day(entity, column, value, works):
    """IV-14 for one value: a real day, in range, on the document's calendar.

    ⚠️ Not a duplicate of the generated schema. That schema types a date
    column as a string and stops there -- the spelling and table T-214's range
    are not in it, which is why this belongs to table T-220 and the numeric
    bounds do not.

    ⛔ `works` is the document's OWN calendar (FR-054), and `None` for the
    entities that ARE that calendar. Every other day in this document is a day
    the plan sits on, and a plan that dates work on a day its own calendar
    closes cannot be counted in working days at all.

    @purity semi-pure-b
    """
    if value is None:
        return
    spelled = day_of(value)
    insist(spelled is not None,
           'IV-14: %s.%s does not read as a day: %s' % (entity, column, value))
    insist(ACCEPTED_FIRST <= spelled <= ACCEPTED_LAST,
           'IV-14: %s.%s is outside the accepted range: %s'
           % (entity, column, value))
    insist(works is None or works(spelled),
           'IV-14 and FR-054: %s.%s falls on %s, which the document\'s own '
           'calendar does not work' % (entity, column, spelled.isoformat()))


def settings_rows():
    """Every row of `_assets/tbl-settings.md`, read from its own source.

    @purity semi-pure-b
    """
    manuscript = json.load(io.open(SETTINGS_JSON, encoding='utf-8'))
    found = []

    def walk(node):
        """@purity semi-pure-a"""
        if isinstance(node, dict):
            if str(node.get('id', '')).startswith('S-'):
                found.append(node)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(manuscript)
    return found


def settings_key(row):
    """The name a settings row goes by, without its backticks or its marks.

    @purity pure
    """
    named = row.get('key') or row.get('name')
    if not isinstance(named, str):
        return None
    held = BACKTICKED.findall(named)
    return held[0] if held else None


def settings_numbers(rows):
    """What every settings row states its value to be, where it states one.

    @purity semi-pure-b
    """
    out = {}
    for row in rows:
        key = settings_key(row)
        stated = row.get('default') or row.get('value') or {}
        if key is not None and isinstance(stated, dict) and 'num' in stated:
            out[key] = float(stated['num'])
    return out


ARITHMETIC = re.compile(r'^[0-9+\-*/(). ]+$')

# ⚠️ The manuscript writes its arithmetic with the typographic signs, not the
# ASCII ones, so a reader of a bound field has to know them. ⛔ Named by code
# point rather than typed, so this file stays ASCII (rule 03 of
# docs/development-rules): multiply, divide, minus.
MANUSCRIPT_SIGNS = ((chr(0x00D7), '*'), (chr(0x00F7), '/'),
                    (chr(0x2212), '-'))


def bound_from(text, values):
    """The number a bound field states, or `None` when it names no setting.

    ⛔ IV-16 is about the settings whose floor or ceiling field NAMES
    another setting -- that is the whole of what it says. A field of literal
    numbers is a
    single-column condition, and the preamble of table T-220 says those belong
    to the generated schema and MUST NOT be repeated here.

    @purity semi-pure-b
    """
    if not isinstance(text, str):
        return None
    named = BACKTICKED.findall(text)
    if not named:
        return None
    if any(one not in values for one in named):
        # ⚠️ T-220 excludes a field that points at a screen dimension, because
        # a document at rest cannot answer it. Anything the manuscript does
        # not state a number for is that kind of field.
        return None
    spelled = text
    for one in sorted(named, key=len, reverse=True):
        spelled = spelled.replace('`%s`' % one, repr(values[one]))
    for sign, plain in MANUSCRIPT_SIGNS:
        spelled = spelled.replace(sign, plain)
    if ARITHMETIC.match(spelled) is None:
        return None
    return float(eval(spelled, {'__builtins__': {}}, {}))   # noqa: S307


def check_settings_bounds(settings):
    """IV-16 -- the bounds that name another setting.

    ⛔ The whole of IV-16, which nothing checked before: SETTINGS_BOUNDS holds
    only the literal numbers, and the generated schema already enforces those
    (`fontMin` carries minimum 12 and maximum 40 there). None of the 25 rows
    whose bound NAMES another setting were in it, so `markerSize` = 100 with a
    ceiling of `actualMin` = 16, and `rulerFont` = 5 with a floor of `fontMin`
    = 12, both wrote the file happily.

    @purity semi-pure-b
    """
    rows = settings_rows()
    stated = settings_numbers(rows)
    for key, value in settings.items():
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            stated[key] = float(value)
        elif isinstance(value, list):
            # ⛔ A LIST HAS A LENGTH, AND THAT IS WHAT ITS BOUND BOUNDS.
            # `pinnedGroupIds` (S-126) states a ceiling of `pinnedRowMax` and
            # a floor of no items, and the row was skipped entirely because
            # the value was not a number -- so the one setting in the table
            # whose bound counts rows was the one bound nobody read.
            stated[key] = float(len(value))
        elif isinstance(value, dict):
            for tail, held in value.items():
                if isinstance(held, (int, float)) and not isinstance(held, bool):
                    stated['%s.%s' % (key, tail)] = float(held)
    read = 0
    for row in rows:
        key = settings_key(row)
        if key is None or key not in stated:
            continue
        floor = bound_from(row.get('min'), stated)
        ceiling = bound_from(row.get('max'), stated)
        if floor is not None:
            read += 1
            insist(stated[key] >= floor - 1e-9,
                   'IV-16: %s is %s, under the floor %s states (%s = %s)'
                   % (key, stated[key], row['id'], row['min'], floor))
        if ceiling is not None:
            read += 1
            insist(stated[key] <= ceiling + 1e-9,
                   'IV-16: %s is %s, over the ceiling %s states (%s = %s)'
                   % (key, stated[key], row['id'], row['max'], ceiling))
    insist(read >= 20,
           'IV-16: only %d bound(s) that name another setting were found in '
           'the manuscript, and it states far more than that' % read)


def check_invariants(document, settings):
    """Table T-220, IV-1 .. IV-17. Refuse to write a document that breaks one.

    ⚠️ What is NOT here: every condition that one column settles on its own.
    The preamble of table T-220 says the generated schema already enforces the
    type of a column, whether it may be `null`, the length of a string, the
    range of a number and any spelled enumeration, and the note under the
    table forbids (MUST NOT) writing a condition that one column settles on
    its own into that table at all, because it would then be held twice. The
    document is
    put through that schema by the tests (`validateDocument` in
    tests/fixtures/grs-document.ts), which is where those belong.

    @purity semi-pure-b
    """
    schedule = document['schedule']
    tasks = schedule['tasks']
    groups = schedule['taskGroups']

    check_keys_and_references(document)

    task_uids = set(one['uid'] for one in tasks)
    group_ids = set(one['id'] for one in groups)

    for pinned in settings['pinnedGroupIds']:
        insist(pinned in group_ids,
               'IV-3: a pinned row points at %s, which is not a TaskGroup'
               % pinned)

    parent_of = dict((task['uid'], task['wbsParentUid']) for task in tasks)
    for uid in task_uids:
        seen = set()
        at = uid
        while at is not None:
            insist(at not in seen, 'IV-4: the WBS above %d is a cycle' % uid)
            seen.add(at)
            at = parent_of[at]

    above = dict((group['id'], group['parentId']) for group in groups)
    for group in groups:
        # ⛔ A CYCLE IS A REFUSAL, NOT A HANG. This walk had no memory, so a
        # `parentId` cycle ran until something killed the process -- no
        # refusal, no message, no file, and nothing to tell the reader which
        # of the two faults it was. IV-4 above already keeps its own `seen`
        # for the same reason.
        depth, at, seen = 1, group['parentId'], set([group['id']])
        while at is not None:
            insist(at not in seen,
                   'IV-5: the rows above %s are a cycle' % group['label'])
            seen.add(at)
            depth += 1
            at = above[at]
        insist(depth <= settings['maxGroupDepth'],
               'IV-5: the row %s sits %d deep, over the cap of %d'
               % (group['label'], depth, settings['maxGroupDepth']))

    held = {}
    for member in schedule['taskGroupMembers']:
        held[member['taskUid']] = held.get(member['taskUid'], 0) + 1
    for uid in task_uids:
        insist(held.get(uid, 0) == 1,
               'IV-6: the task %d is named by %d TaskGroupMembers, and each '
               'task is named by exactly one' % (uid, held.get(uid, 0)))

    insist(len(schedule['calendars']) >= 1, 'IV-7: the document has no calendar')
    # ⚠️ `check_keys_and_references` has already resolved the same calendar
    # (IV-17's first half) in order to read the days IV-14 measures against;
    # what is left here is the half it does not need -- that the resolved
    # calendar works at least one of the seven days.
    resolved = [one for one in schedule['calendars']
                if one['uid'] == schedule['project']['calendarUid']]
    insist(len(resolved) == 1,
           'IV-17: Project.calendarUid does not resolve to one calendar')
    working = [day for day in resolved[0]['weekDays'] if day['dayWorking']]
    insist(working,
           'IV-17: the document calendar works none of the seven days')

    for group in groups:
        insist(group['label'] is not None
               or group['derivedFromTaskUid'] is not None,
               'IV-8: a row has neither a label nor a task to take one from')

    for visual in schedule['taskVisuals']:
        insist(not (visual['fillColor'] == 'transparent'
                    and visual['strokeColor'] == 'transparent'),
               'IV-9: the task %d is transparent inside and out'
               % visual['taskUid'])

    for task in tasks:
        # ⛔ T-220 SCOPES IV-10 TO TASKS THAT HOLD BOTH DATES, and this
        # compared them unguarded -- so it crashed on a document the row
        # explicitly excludes, one line before IV-11 could ever run. IV-11's
        # message was dead code because of it.
        if task['start'] is not None and task['finish'] is not None:
            insist(day_of(task['start']) <= day_of(task['finish']),
                   'IV-10: %s finishes before it starts' % task['name'])
        fades = [task['fadeInDays'], task['fadeOutDays']]
        if any(one is not None for one in fades):
            insist(task['finish'] is not None,
                   'IV-11: %s fades and has no finish' % task['name'])
            span = (day_of(task['finish']) - day_of(task['start'])).days
            insist(sum(one or 0 for one in fades) <= span,
                   'IV-12: %s fades for more days than it runs' % task['name'])

    # ⛔ IV-13 IS NOT HERE, AND THAT IS THE POINT. The preamble of table T-220
    # says the generated schema already enforces the type of a column, whether
    # it may be `null` and which keys an object must carry -- and that the
    # answer to a gap is to fix the manuscript so the SCHEMA enforces it, not
    # to hold the condition twice. `documentSettings.dualCursor` in
    # docs/spec/_source/grs-document.schema.json is typed `["object", "null"]`
    # with both `date1` and `date2` required and both typed `"string"`, which
    # is the whole of IV-13. `check_schema` below runs that schema over this
    # document, so the condition is enforced -- once.

    for origin in schedule['taskOrigins']:
        insist(origin['lastSeenImportSeq'] <= schedule['project']['importSeq'],
               'IV-15: a task origin has been seen after the last import')

    check_settings_bounds(settings)


def strings_in(node, path, out):
    """Every string the document holds, with where it sits.

    ⚠️ Values only. A key is a column name settled by the schema, not
    something anybody reads off the screen.

    @purity semi-pure-b
    """
    if isinstance(node, str):
        out.append((path, node))
    elif isinstance(node, dict):
        for key, value in node.items():
            strings_in(value, '%s.%s' % (path, key), out)
    elif isinstance(node, list):
        for turn, value in enumerate(node):
            strings_in(value, '%s[%d]' % (path, turn), out)
    return out


def declared_strings(settings):
    """Every word this generator is allowed to put in the document.

    ⛔ BUILT FROM THE DECLARATIONS, NEVER FROM THE ARTIFACT. A set read back
    off what was written would allow whatever was written, which is exactly
    the hole that let a resource be renamed after a real company and the
    project be given a real person as its manager.

    ⭐ This is the shape FR-027's neutrality check has to take. Hand-listing
    forbidden words cannot work -- there is no list of every company, country
    and festival -- but the generator WROTE every string in the document, so
    it can say which words it knows how to write. Anything else is a word it
    did not draw from its own vocabulary, and that is the refusal.

    @purity semi-pure-b
    """
    said = set()
    for kind in WORK_BY_KIND:
        said.update(SAYABLE[kind])
    said.add(OVERVIEW_TASK)
    for name, _start, _gate, _glyph in PHASES:
        said.add(PHASE_BAR_NAME % name)
        said.add(PHASE_GATE_NAME % name)
    for label in tree_labels(TREE):
        said.add(label)
        said.add(ROLLUP_NAME % label)
        said.update(tail % label for tail in MILESTONE_TAILS)
    said.update(RESOURCE_NAMES)
    said.add(CALENDAR_NAME)
    said.update(name for name, _first, _last in CALENDAR_EXCEPTIONS)
    said.update((PROJECT_TITLE, PROJECT_NAME, PROJECT_SUBJECT,
                 PROJECT_CATEGORY, PROJECT_COMPANY, PROJECT_MANAGER,
                 PROJECT_AUTHOR, STAMP_AUTHOR, SCHEMA_VERSION))
    said.update(GLYPHS)
    said.update(SHAPE_KINDS)
    for fill, stroke, weight in AUTHOR_PAINT:
        said.update((fill, stroke, weight))
    said.update(paint for _label, paint in ROW_PAINT)
    # ⭐ The presentation values are the manuscript's own words, arriving
    # through the block tools/generate_entity_types.py writes.
    said.update(one for _path, one in strings_in(settings, 'settings', []))
    return said


def tree_labels(tree):
    """Every row label the forest declares.

    @purity pure
    """
    out = []
    for label, children in tree:
        out.append(label)
        out.extend(tree_labels(children))
    return out


def check_neutrality(document, settings):
    """FR-027 -- every readable word came from this generator's vocabulary.

    ⛔ FR-027 requires the template to be written in words that presume no
    industry and no product, and says in as many words that IDENTIFIER VALUES
    are in scope because "the values are the half that gets missed". Three
    comments in this file ASSERTED that and nothing enforced it: a resource
    renamed "Microsoft Corporation", a shutdown renamed after a national
    holiday and a project handed a real company and a real person all wrote
    the file with exit 0.

    ⚠️ A uuid and a day are exempt, and only those two: a uuid is a machine
    identifier nobody reads and a day has already been through IV-14.

    @purity semi-pure-b
    """
    said = declared_strings(settings)
    strange = []
    for path, value in strings_in(document, 'document', []):
        if value in said:
            continue
        if SPELLED_UUID.match(value) is not None or day_of(value) is not None:
            continue
        strange.append('%s = %r' % (path, value))
    insist(not strange,
           'FR-027: %d string(s) in the document are not words this generator '
           'declares, so nothing vouches for them being free of an industry, '
           'a product, a company or a person:\n    %s'
           % (len(strange), '\n    '.join(strange[:12])))


def check_stack_order(built):
    """ST-6 of table T-014 -- the stack order is settled automatically.

    ⛔ ST-6 forbids (MUST NOT) giving a person any way to place a task on a
    stacking level by hand, and `AT-62` of the ERD spells `null` as "automatic".
    A template that shipped a level chosen by hand would be the one document in
    existence asking the reader to honour a setting the specification says
    nobody can make. One shipped with exit 0.

    @purity semi-pure-b
    """
    for member in built.members:
        insist(member['stackOrder'] is None,
               'ST-6: the task %d is placed on stacking level %s by hand, and '
               'the order is settled automatically'
               % (member['taskUid'], member['stackOrder']))


# ---------------------------------------------------------------------------
# ⭐ The GRS JSON schema, run over what is about to be written
#
# ⛔ FR-027 gives ONE reason for keeping the template as a bundled `GRS JSON`
# rather than as code that assembles a document: docs/spec/01-04-requirements.md
# says in as many words that a `GRS JSON` can be put through the same validator
# the import path uses (`FR-023`). Nothing here ever did it. So the artifact
# claimed the benefit the requirement was written for and never collected it,
# and a TaskGroupMember carrying a stack order the schema forbids shipped with
# exit 0.
#
# ⚠️ NO THIRD-PARTY LIBRARY IS ASSUMED. Every other Python tool in this
# repository is standard library only, and `npm run gen:check` runs this file
# in continuous integration; a hard `import jsonschema` would make the artifact
# unbuildable wherever that library is absent. ⭐ So the reader below
# implements the keyword vocabulary this schema actually uses AND REFUSES ON
# ANY KEYWORD IT DOES NOT IMPLEMENT -- it cannot fall behind the schema
# silently, which is the failure every hand-listed check here exists to undo.
# ⭐ And where `jsonschema` IS importable it is run as well, so the reference
# implementation has the last word wherever it exists.
# ---------------------------------------------------------------------------

# What a subschema may say. ⛔ Anything else is a refusal, not a shrug.
SCHEMA_READ = frozenset((
    'type', 'properties', 'required', 'additionalProperties', 'items',
    'enum', 'minimum', 'maximum', 'minLength', 'maxLength', 'format', '$ref',
))
# Words a subschema may carry that say nothing about whether a value is valid.
# ⚠️ `$defs` is among them because it holds subschemas nothing is measured
# against directly -- every one of them is reached through a `$ref`.
SCHEMA_PROSE = frozenset(('$schema', '$id', '$comment', '$defs', 'title',
                          'description', 'default', 'examples'))

SCHEMA_TYPES = {
    'object': dict, 'array': list, 'string': str, 'boolean': bool,
    'number': (int, float), 'integer': int, 'null': type(None),
}

SPELLED_UUID = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')


def schema_types_of(shape):
    """The types one subschema admits, as the manuscript spells them.

    @purity semi-pure-b
    """
    named = shape.get('type')
    if named is None:
        return None
    named = named if isinstance(named, list) else [named]
    for one in named:
        insist(one in SCHEMA_TYPES,
               'the GRS JSON schema types a value %r, which the reader in '
               'this file does not know' % one)
    return named


def schema_faults(value, shape, defs, path):
    """Every way one value breaks one subschema, as sentences.

    @purity semi-pure-b
    """
    for word in shape:
        insist(word in SCHEMA_READ or word in SCHEMA_PROSE,
               'the GRS JSON schema says %r at %s, and the reader in this '
               'file does not implement it -- ⛔ widen the reader rather '
               'than letting the condition go unchecked' % (word, path))
    if '$ref' in shape:
        pointed = shape['$ref']
        insist(pointed.startswith('#/$defs/'),
               'the GRS JSON schema points at %s, which this reader cannot '
               'follow' % pointed)
        return schema_faults(value, defs[pointed[len('#/$defs/'):]], defs, path)
    out = []
    named = schema_types_of(shape)
    if named is not None:
        wanted = tuple(SCHEMA_TYPES[one] for one in named)
        # ⚠️ `True` is an `int` in Python and `1` is not a boolean anywhere
        # else, so the two are separated by hand rather than by isinstance.
        fits = isinstance(value, wanted) and not (
            isinstance(value, bool) and bool not in wanted)
        if not fits:
            return ['%s is %s and the schema types it %s'
                    % (path, type(value).__name__, '/'.join(named))]
    if 'enum' in shape and value not in shape['enum']:
        out.append('%s is %r, which is not one of the values the schema '
                   'spells' % (path, value))
    if shape.get('format') == 'uuid' and isinstance(value, str):
        if SPELLED_UUID.match(value) is None:
            out.append('%s does not spell a uuid' % path)
    if shape.get('format') in ('date', 'date-time') and isinstance(value, str):
        if day_of(value) is None:
            out.append('%s does not spell a day' % path)
    if isinstance(value, str):
        if 'minLength' in shape and len(value) < shape['minLength']:
            out.append('%s is shorter than the schema allows' % path)
        if 'maxLength' in shape and len(value) > shape['maxLength']:
            out.append('%s is longer than the schema allows' % path)
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if 'minimum' in shape and value < shape['minimum']:
            out.append('%s is %s, under the schema minimum %s'
                       % (path, value, shape['minimum']))
        if 'maximum' in shape and value > shape['maximum']:
            out.append('%s is %s, over the schema maximum %s'
                       % (path, value, shape['maximum']))
    if isinstance(value, dict):
        held = shape.get('properties', {})
        for key in shape.get('required', ()):
            if key not in value:
                out.append('%s does not carry %s, which the schema requires'
                           % (path, key))
        if shape.get('additionalProperties') is False:
            for key in value:
                if key not in held:
                    out.append('%s carries %s, which the schema does not know'
                               % (path, key))
        for key, nested in held.items():
            if key in value:
                out.extend(schema_faults(value[key], nested, defs,
                                         '%s.%s' % (path, key)))
    if isinstance(value, list) and 'items' in shape:
        for turn, one in enumerate(value):
            out.extend(schema_faults(one, shape['items'], defs,
                                     '%s[%d]' % (path, turn)))
    return out


def check_schema(document):
    """FR-027 -- the template goes through the validator FR-023 uses.

    @purity semi-pure-b
    """
    schema = json.load(io.open(SCHEMA, encoding='utf-8'))
    defs = schema.get('$defs', {})
    faults = schema_faults(document, schema, defs, 'document')
    insist(not faults,
           'the GRS JSON schema refuses this document (%d fault(s)):\n    %s'
           % (len(faults), '\n    '.join(faults[:12])))
    try:
        import jsonschema                                   # noqa: PLC0415
    except ImportError:
        return
    # ⭐ Where the reference implementation is installed it gets the last word,
    # so a hole in the reader above is a refusal rather than a false green.
    told = sorted(jsonschema.Draft202012Validator(schema).iter_errors(document),
                  key=lambda one: list(one.absolute_path))
    insist(not told,
           'jsonschema refuses this document where the reader in this file '
           'did not (%d fault(s)):\n    %s'
           % (len(told), '\n    '.join(
               '%s: %s' % ('/'.join(str(one) for one in why.absolute_path),
                           why.message) for why in told[:12])))


def assert_settings_complete(settings):
    """Refuse to write a document the GRS JSON schema would reject.

    ⛔ FR-024 makes every presentation key mandatory, and FR-027 wants this
    file to pass the same validator the import path uses. So a missing key is
    not something to paper over with a literal: writing the number here would
    put a second copy of a specified value in the tree, which rule 03 of
    docs/development-rules forbids and CR-175 and CR-178 exist to undo.

    ⭐ The way out is the one the user already ruled on (CR-175): widen the
    generator's reach so docs/spec/_source/settings.json states the value
    machine readably, and it arrives here on its own.

    @purity semi-pure-b
    """
    schema = json.load(io.open(SCHEMA, encoding='utf-8'))
    wanted = schema['properties']['documentSettings']['required']
    missing = [key for key in wanted if key not in settings]
    if missing:
        sys.exit(
            'generate_startup_template: %d presentation value(s) are not stated\n'
            '  machine readably by docs/spec/_source/settings.json, so the\n'
            '  template cannot be written without copying them:\n'
            '    %s\n'
            '  ⛔ Do not write them here. Widen the manuscript instead (CR-175).'
            % (len(missing), '\n    '.join(missing)))


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------

def build():
    """The whole document, checked before it is handed back.

    @purity semi-pure-b
    """
    settings = settings_defaults()
    assert_settings_complete(settings)
    built = Builder(settings)
    insist(len(built.rows) == WANTED_ROWS,
           'TP-5: the tree holds %d rows, and table T-226 asks for %d'
           % (len(built.rows), WANTED_ROWS))
    for phase in PHASES:
        insist(is_working_day(phase[1]) and is_working_day(phase[2]),
               'the %s phase begins or ends on a non-working day' % phase[0])

    built.build_overview()
    fixed = len(built.tasks)
    rollups = sum(1 for row in built.rows
                  if row['children'] and row['label'] not in OVERVIEW_ROWS)
    built.build_work(work_counts(built.rows, WANTED_TASKS - fixed - rollups))
    built.build_rollups()

    # ⛔ The links are drawn BEFORE the actuals, because the actuals read them:
    # nothing may be complete whose predecessor is not, and that cannot be
    # honoured by a pass that runs before the graph exists (A16).
    built.build_dependencies()
    # 40% of the way through, which is where a plan is worth looking at: some
    # of it is behind, some of it is running, and most of it is still ahead.
    status_at = int(round(0.40 * (len(WORKDAYS) - 1)))
    built.apply_actuals(status_at)
    built.build_visuals()
    built.build_fades()
    built.build_people()

    under = descendants_of(built)
    check_rollup(built, under)
    check_nesting(built)
    check_phase_order(built, under)
    check_counters(built)
    check_twins(built)
    check_gates(built)
    check_durations(built)
    check_effort(built)
    check_names(built)
    check_overview(built)
    check_dead_data(built, status_at)
    check_counts(built)
    check_vocabulary(built)
    check_clustering(built)
    check_progress(built, status_at)
    check_links(built)
    check_reach(built)
    check_rollup_reading(built)
    check_stack_order(built)

    hue = manuscript_number('S-73')
    # ⛔ No "$comment" banner rides in this file, and that is deliberate. The
    # GRS JSON schema closes its root with additionalProperties:false, so a
    # banner would make the template fail the very validator FR-027 wants it
    # to pass. The back-pointer lives in this generator and in
    # `npm run gen:check`, which fails the moment the artifact drifts.
    document = {
        'schemaVersion': SCHEMA_VERSION,
        'schedule': {
            'project': built.project(status_at, hue),
            'calendars': [built.calendar()],
            'tasks': built.stripped_tasks(),
            'resources': built.resources,
            'assignments': built.assignments,
            'taskGroups': built.task_groups(),
            'taskGroupMembers': built.members,
            'taskVisuals': built.visuals,
            'commentBoxes': [],
            'highlightBoxes': [],
            'taskOrigins': [],
            'baselineTasks': [],
        },
        'documentSettings': settings,
        'documentStamp': {
            # FR-063: the two instants say WHICH document this is, never which
            # is newer. A template nobody has edited has one instant for both.
            'scheduleUpdatedUtc': STAMPED_AT,
            'lastEditedBy': STAMP_AUTHOR,
            'settingsUpdatedUtc': STAMPED_AT,
        },
        'changeLog': [],
    }
    check_invariants(document, settings)
    check_neutrality(document, settings)
    # ⛔ LAST, AND NOT OPTIONAL. FR-027 keeps the template as bundled GRS JSON
    # for exactly one stated reason -- that the same validator FR-023 uses can
    # be pointed at it -- and until now nothing ever pointed it.
    check_schema(document)
    return document


def main():
    """@purity non-pure"""
    document = build()
    body = json.dumps(document, ensure_ascii=False, indent=1) + '\n'
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            sys.stdout.write('PROBLEM  %s has not been written yet\n'
                             % os.path.relpath(OUT, ROOT))
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body:
            sys.stdout.write('PROBLEM  %s has drifted from its manuscript -- '
                             'run `python tools/generate_startup_template.py`\n'
                             % os.path.relpath(OUT, ROOT))
            return 1
        sys.stdout.write('OK       the startup template matches its manuscript '
                         '(%d row(s), %d task(s))\n'
                         % (len(document['schedule']['taskGroups']),
                            len(document['schedule']['tasks'])))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    sys.stdout.write('wrote %s (%d row(s), %d task(s), %d byte(s))\n'
                     % (os.path.relpath(OUT, ROOT),
                        len(document['schedule']['taskGroups']),
                        len(document['schedule']['tasks']), len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
