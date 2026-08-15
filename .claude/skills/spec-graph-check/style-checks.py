# -*- coding: utf-8 -*-
"""Checks 12-14: gate the defect types that every review round regenerates.

Seven rounds of review kept producing the same four kinds of duplication,
because none of checks 1-11 look for them: the near-duplicate detector only
sees similar WORDING, and a paraphrase walks straight past it. These three
checks gate the types mechanically, so the next round cannot recreate them.

    12  a rule in a value table      tbl-settings.md must not hold MUST /
                                     MUST NOT; rules live in requirements
    13  a transfer leftover          a line that points at the owner
                                     ("規則と理由は FR-xxx") while still
                                     stating the rule itself
    14  a value written twice        a settings default that also appears
                                     as a literal in the requirements
                                     (advisory: printed, does not fail)

Usage: python style-checks.py [repo-root]
Exit code 1 if check 12 or 13 reports a finding.

NOTE ON NON-ASCII: the patterns hold Japanese text because the
specification is written in Japanese; those code points are data.
"""
import io
import os
import re
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'

SETTINGS = 'docs/spec/_assets/tbl-settings.md'
GLOSSARY = 'docs/spec/_assets/tbl-glossary.md'
REQS = 'docs/spec/01-04-requirements.md'

# Rules may sit in a value table only where the document says so. Each entry
# is a row ID or an anchor phrase; anything else is a violation. Keep this
# list short -- it is the exception, not the escape hatch.
CHECK12_ALLOWED = set()

# Two whole-line exceptions the specification itself sanctions.
CHECK12_ALLOWED_TEXT = (
    '例外は表 T-105',          # keeping the naming table's own exception list
    '本表はかつて',            # quoting an instruction that was withdrawn
)

# A line that hands ownership away with one of these, and then keeps stating
# the rule, is a transfer that never finished.
POINTS_AWAY = re.compile(
    r'(規則と理由|規則|理由)(と[^は]{0,12})?は\s*[`「]?(FR|NFR|UC|GL)-[0-9]+|'
    r'(規則と理由|規則)(と[^は]{0,12})?は\s*表 T-[0-9]+[a-z]?')
STATES_RULE = re.compile(r'（MUST）|（MUST NOT）|してはならない|しなければならない')

MUST = re.compile(r'（MUST(?: NOT)?）')

# The glossary owns names, so a prohibition about WORDING belongs there.
# Anything else it forbids (behaviour, data shape, values) does not.
NAMING_RULE = re.compile(
    r'呼んではならない|と書く|と書くこと|書いてはならない|略さない|略してはならない|'
    r'名前に使わない|訳語|直訳|語順|別語|意訳|表記')

findings = []
advisory = []


def report(check, path, lineno, message):
    findings.append('%-3s %s:%s  %s' % (check, path, lineno, message))


def row_id(line):
    if not line.startswith('|'):
        return ''
    return line.strip().strip('|').split('|')[0].strip('`* ')


def read(rel):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        return []
    return io.open(path, encoding='utf-8').read().splitlines()


# ------------------------------------------------------- check 12

for rel in (SETTINGS, GLOSSARY):
    for i, line in enumerate(read(rel), 1):
        if not MUST.search(line):
            continue
        rid = row_id(line)
        if rid in CHECK12_ALLOWED:
            continue
        if any(x in line for x in CHECK12_ALLOWED_TEXT):
            continue
        # A line that only points at where the rule lives is fine.
        stripped = MUST.sub('', line)
        if POINTS_AWAY.search(line) and not STATES_RULE.search(stripped):
            continue
        if rel == GLOSSARY and NAMING_RULE.search(line):
            continue        # a rule about what to CALL a thing is the
                            # glossary's own subject: it is the name owner
        what = 'value table' if rel == SETTINGS else 'name table'
        report('12', rel, i,
               'a rule (MUST / MUST NOT) sits in the %s%s -- rules belong to '
               'a requirement' % (what, (' at row %s' % rid) if rid else ''))

# ------------------------------------------------------- check 13

for rel in (SETTINGS, GLOSSARY, REQS):
    for i, line in enumerate(read(rel), 1):
        if not POINTS_AWAY.search(line):
            continue
        # Cut everything from the hand-off onward; a rule stated AFTER the
        # pointer is the pointer's own sentence, not a leftover.
        head = POINTS_AWAY.split(line)[0]
        if STATES_RULE.search(head):
            # Advisory, not a gate: a line may legitimately state its own
            # rule and then point elsewhere for a DIFFERENT one. Telling
            # those apart needs the subject of each clause, which this
            # cannot recover -- and a noisy gate gets legitimate text
            # "fixed", which is how type 4 is created in the first place.
            advisory.append('13  %s:%s  points at an owner while also '
                            'stating a rule -- check which rule is whose'
                            % (rel, i))

# ------------------------------------------------------- check 14

# Settings defaults that also appear as a literal in the requirements.
# Single digits are excluded: they collide with counts, depths and indexes
# far too often to carry signal.
# Identifiers (T-036, S-99a, FR-012) and ISO dates carry digits that are
# not values; counting them buries the real echoes in noise.
NOISE = re.compile(r'[A-Z]{1,4}-[0-9]+[a-z]?|[0-9]{4}-[0-9]{2}-[0-9]{2}')


def denoise(text):
    return NOISE.sub(' ', text)


defaults = {}
for i, line in enumerate(read(SETTINGS), 1):
    rid = row_id(line)
    if not re.match(r'^S-[0-9]+[a-z]?$', rid or ''):
        continue
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    for c in cells[2:4]:
        for num in re.findall(r'([0-9]+(?:\.[0-9]+)?)', denoise(c)):
            if '.' in num or len(num) >= 2:
                defaults.setdefault(num, []).append((rid, i))

req_lines = read(REQS)
for num, owners in sorted(defaults.items(), key=lambda kv: -len(kv[1])):
    if re.match(r'^(19|20)[0-9]{2}$', num):
        continue
    hits = []
    for i, line in enumerate(req_lines, 1):
        if re.search(r'(?<![-0-9.])' + re.escape(num) + r'(?![0-9.])',
                     denoise(line)):
            hits.append(i)
    if hits:
        rid = owners[0][0]
        advisory.append('14  %s appears in %s (%s) and in %s at %s'
                        % (num, SETTINGS, rid, REQS.split('/')[-1],
                           ' '.join(str(h) for h in hits[:6])
                           + (' ...' if len(hits) > 6 else '')))

# ------------------------------------------------------- output

for f in sorted(findings):
    print(f)
print('')
print('check 12 (rule in a value/name table) : %d'
      % len([f for f in findings if f.startswith('12')]))
print('check 13 (transfer leftover, ADVISORY): %d'
      % len([a for a in advisory if a.startswith('13')]))
print('check 14 (value echoed, ADVISORY)     : %d'
      % len([a for a in advisory if a.startswith('14')]))
if advisory:
    print('')
    print('-- advisory: these are candidates to read, not proven defects.')
    for a in advisory[:25]:
        print('   ' + a)
    if len(advisory) > 25:
        print('   ... %d more' % (len(advisory) - 25))

sys.exit(1 if findings else 0)
