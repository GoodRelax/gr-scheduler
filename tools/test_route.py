# -*- coding: utf-8 -*-
"""Say which of the costly tests a merged range needs, and in which order.

    python tools/test_route.py [<A..B>]       # default origin/refactor..HEAD
    python tools/test_route.py --self-test    # each route on a planted file list
    python tools/test_route.py --check-rule   # ROUTES and STEPS match rule 04 section 7

THE RULE (JDG-2419, rule 04 section 7). Each parallel seat runs only the
minimum tests of its own files (section 7.1). After the fixes merge, the
coordinator CHOOSES from what the merged diff touched whether PERF, the e2e
suite and agent-driven Playwright probing are needed, which comes first and
which may be skipped. This tool prints that choice as a recommendation:

  PERF   yes when the diff touches a per-frame path (read from the table of
         rule 04 section 5, the same reader check 66 uses) or tests/nfr, or
         when a perf-pending row names a change request of the range;
  E2E    "subset first" when it touches the screen flow, "inside GT-2" when it
         touches src/, tests/, dist/ or docs/spec/ (tools/push_guard.py's
         GATED_PREFIXES, JDG-1965), "no" for data only;
  PROBE  yes when a user checklist row (docs/review/user-checklist-*.md) is in
         the range -- its file changed or one of its ids is named by a commit
         of the range -- and no file under tests/system or tests/use-case
         cites any of its ids;
  ORDER  the steps of table STEPS that are on, in the table's order.

Every decision comes from the two tables below, ROUTES and STEPS; the code only
walks them. Rule 04 section 7 shows the same rows as its route and step
tables, and `--check-rule` (check 82) is red when the two drift apart.

WHY. 2026-10-17: the coordinator handed the user a 13-row checklist to press
by hand, then tried a browser extension in which drags never landed, then
started an agent that drives Playwright through every row and reads its
screenshots -- the costliest test there is, chosen without asking which test
the change needed. The user asked for a procedure and a tool, not a memory
note (JDG-2419).

WHAT IT CANNOT SEE: whether a test that cites an id really walks the row's
steps (a citation counts as coverage); a per-frame path the table of rule 04
section 5 does not list; whether the machine is quiet enough for PERF (PW-3);
the size and risk the coordinator weighs before skipping GT-2 (JDG-2126).
"""
import importlib.util
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from push_guard import GATED_PREFIXES  # noqa: E402  -- one list of the paths GT-2 guards

DEFAULT_RANGE = 'origin/refactor..HEAD'
RULE = 'docs/development-rules/04-verification.md'
PENDING = 'docs/development-records/perf-pending.md'
CHECKLISTS = 'docs/review/'
CHECKLIST_NAME = re.compile(r'^docs/review/user-checklist-[^/]+\.md$')
UI_TESTS = ('tests/system/', 'tests/use-case/')
LEDGER_ID = re.compile(r'\b(?:CR|DFC|JDG)-\d+\b')
ID_IN_FILE_NAME = re.compile(r'(?:^|-)(cr|dfc)-(\d+)(?=-|\.)', re.I)
PER_FRAME = '<per-frame paths of rule 04 section 5>'
GT2_LEVELS = ['none', 'recommended', 'required']

# The route table of rule 04 section 7. The first row whose globs match a file takes it.
# The names are words, not row ids: a `| XX-n |` row would need a prefix in the registry
# of docs/spec, and these rows belong to a rule.
# perf: PERF is needed. e2e: 'subset-first' (the named tests/system and tests/use-case
# files, alone, before GT-2), 'in-gt2' (the whole suite inside GT-2 is enough), 'none'.
# gt2: 'required' (push_guard refuses without GT-2 or a reason), 'recommended', 'none'.
ROUTES = [
    {'name': 'per-frame', 'globs': [PER_FRAME],
     'perf': True, 'e2e': 'in-gt2', 'gt2': 'required'},
    {'name': 'frame-tests', 'globs': ['tests/nfr/**'],
     'perf': True, 'e2e': 'in-gt2', 'gt2': 'required'},
    {'name': 'screen-flow',
     'globs': ['src/adapter/input-command-translator/**', 'src/framework/**',
               'tests/system/**', 'tests/use-case/**'],
     'perf': False, 'e2e': 'subset-first', 'gt2': 'required'},
    {'name': 'other-src', 'globs': ['src/**'],
     'perf': False, 'e2e': 'in-gt2', 'gt2': 'required'},
    {'name': 'gated-rest', 'globs': ['tests/**', 'docs/spec/**', 'dist/**'],
     'perf': False, 'e2e': 'in-gt2', 'gt2': 'required'},
    {'name': 'config',
     'globs': ['package.json', 'package-lock.json', 'index.html', 'playwright.config.ts',
               'vite.config.ts', 'vite.relay.config.ts', 'vitest.config.ts',
               'tsconfig.json', 'tsconfig.entity.json', 'tools/gate/**'],
     'perf': False, 'e2e': 'in-gt2', 'gt2': 'recommended'},
    {'name': 'data-only', 'globs': ['**'],
     'perf': False, 'e2e': 'none', 'gt2': 'none'},
]

# The step table of rule 04 section 7: the steps in the order they run. `on` names the
# decision that turns a step on.
STEPS = [
    {'step': 'PERF', 'on': 'perf',
     'command': 'GRS_PERF=1 node tools/gate/gate-queue.mjs enqueue PERF, then drain on a quiet machine (PW-3)'},
    {'step': 'E2E subset', 'on': 'e2e_subset',
     'command': 'node tools/gate/gate-queue.mjs run -- bash -c "npm run build && npm run e2e -- <files>"'
                ' in the merge worktree, then git checkout -- dist/index.html'},
    {'step': 'GT-2', 'on': 'gt2',
     'command': 'node tools/gate/gate-queue.mjs enqueue GT-2, then drain (npm run guard:publish)'},
    {'step': 'PROBE', 'on': 'probe',
     'command': 'one agent, only with the coordinator\'s go-ahead, on the rows listed'},
]


def git(*args):
    done = subprocess.run(['git', '-C', ROOT] + list(args), capture_output=True, text=True,
                          encoding='utf-8', errors='replace')
    if done.returncode != 0:
        raise RuntimeError('git %s: %s' % (' '.join(args), done.stderr.strip()[-300:]))
    return done.stdout


def load_perf_gate():
    path = os.path.join(ROOT, '.claude', 'skills', 'spec-graph-check', 'check-perf-gate.py')
    spec = importlib.util.spec_from_file_location('check_perf_gate', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def matches(path, glob, per_frame):
    if glob == PER_FRAME:
        return any(matches(path, one, per_frame) for one in per_frame)
    if glob == '**':
        return True
    if glob.endswith('/**'):
        return path.startswith(glob[:-2])
    return path == glob


def route_of(path, per_frame):
    for route in ROUTES:
        if any(matches(path, glob, per_frame) for glob in route['globs']):
            return route
    return ROUTES[-1]


def ids_cited_by(path, text):
    found = set(LEDGER_ID.findall(text))
    for kind, number in ID_IN_FILE_NAME.findall(os.path.basename(path)):
        found.add('%s-%s' % (kind.upper(), number))
    return found


def decide(files, range_text, rows, test_citations, per_frame, pending, subjects=None):
    """The whole decision, from data only.

    files           paths the merged diff touched
    range_text      the commit messages of the range
    subjects        their subject lines (default: range_text); a perf-pending row counts only
                    when a subject names its change request, as check 66 reads landings
    rows            checklist rows: (checklist path, ids, label, file changed in the range)
    test_citations  {tests/system or tests/use-case file: ids it cites}
    per_frame       the per-frame globs of rule 04 section 5
    pending         perf-pending rows: (row number, change request id)
    """
    hits = {route['name']: [] for route in ROUTES}
    for path in files:
        hits[route_of(path, per_frame)['name']].append(path)
    on = [route for route in ROUTES if hits[route['name']]]
    range_ids = set(LEDGER_ID.findall(range_text))
    subject_ids = set(LEDGER_ID.findall(range_text if subjects is None else subjects))
    pending_hit = [(number, cr) for number, cr in pending if cr in subject_ids]
    gt2 = max((route['gt2'] for route in on), key=GT2_LEVELS.index, default='none')
    e2e_subset = any(route['e2e'] == 'subset-first' for route in on)
    cited = set()
    for ids in test_citations.values():
        cited |= ids
    subset_files = sorted(path for path, ids in test_citations.items()
                          if ids & range_ids or path in files)
    probe_rows = []
    for checklist, ids, label, changed in rows:
        if not (changed or set(ids) & range_ids):
            continue
        if not ids or not set(ids) & cited:
            probe_rows.append((checklist, ids, label))
    decision = {
        'hits': hits,
        'perf': bool(any(route['perf'] for route in on) or pending_hit),
        'pending_hit': pending_hit,
        'e2e': 'subset-first' if e2e_subset else ('in-gt2' if gt2 != 'none' else 'none'),
        'e2e_subset': e2e_subset,
        'subset_files': subset_files,
        'gt2': gt2,
        'probe': bool(probe_rows),
        'probe_rows': probe_rows,
    }
    decision['order'] = [step['step'] for step in STEPS if decision[step['on']] not in (False, 'none')]
    return decision


# ------------------------------------------------------------------ readers ----

def changed_files(base, tip):
    return [line for line in git('diff', '--name-only', '%s...%s' % (base, tip)).split('\n') if line]


def checklist_rows(tip, files):
    names = sorted(line for line in git('ls-tree', '-r', '--name-only', tip, '--', CHECKLISTS).split('\n')
                   if CHECKLIST_NAME.match(line))
    chosen = [name for name in names if name in files] or names[-1:]
    rows = []
    for name in chosen:
        rows.extend(rows_of(name, git('show', '%s:%s' % (tip, name)), name in files))
    return rows


def rows_of(name, text, changed):
    """The body rows of a checklist table whose first cell is a box (not the header, not a '-' row)."""
    rows, past_header = [], False
    for line in text.split('\n'):
        if re.match(r'^\|[\s|:-]+\|?\s*$', line):
            past_header = True
            continue
        if not line.startswith('|'):
            past_header = False
        cells = [cell.strip() for cell in line.split('|')]
        if not past_header or len(cells) < 5 or cells[1] not in ('\u2610', '\u2705', '\u274c'):
            continue
        rows.append((name, tuple(sorted(set(LEDGER_ID.findall(cells[3])))),
                     '%s / %s' % (cells[2], cells[3]), changed))
    return rows


def ui_test_citations(tip):
    citations = {}
    listed = git('ls-tree', '-r', '--name-only', tip, '--', *UI_TESTS).split('\n')
    for path in listed:
        if path.endswith('.ts'):
            citations[path] = ids_cited_by(path, '')
    try:
        found = git('grep', '-o', '-E', '(CR|DFC|JDG)-[0-9]+', tip, '--', *UI_TESTS)
    except RuntimeError:
        found = ''
    for line in found.split('\n'):
        parts = line.split(':')
        if len(parts) >= 3 and parts[1] in citations:
            citations[parts[1]].add(parts[-1])
    return citations


def pending_rows():
    try:
        with open(os.path.join(ROOT, *PENDING.split('/')), encoding='utf-8') as handle:
            text = handle.read()
    except OSError:
        return []
    rows = []
    for line in text.split('\n'):
        cells = [cell.strip() for cell in line.split('|')]
        if len(cells) > 3 and cells[1].isdigit():
            rows.extend((cells[1], cr) for cr in sorted(set(LEDGER_ID.findall(cells[2]))))
    return rows


# ------------------------------------------------------------------- report ----

def short(paths, limit=4):
    head = ', '.join(paths[:limit])
    return head + (' and %d more' % (len(paths) - limit) if len(paths) > limit else '')


def report(spec, files, commits, decision, pending_total):
    lines = ['test route for %s: %d file(s) in the merged diff, %d commit(s)' % (spec, len(files), commits)]
    for route in ROUTES:
        hit = decision['hits'][route['name']]
        if hit:
            lines.append('  %-12s %3d  %s' % (route['name'], len(hit), short(hit, 3)))
    perf_routes = [r['name'] for r in ROUTES if r['perf'] and decision['hits'][r['name']]]
    if decision['perf']:
        why = []
        if perf_routes:
            why.append('%s touched' % '/'.join(perf_routes))
        if decision['pending_hit']:
            why.append('perf-pending rows whose id a commit subject of the range names: %s' % short(
                ['#%s %s' % one for one in decision['pending_hit']], 6))
        lines.append('PERF   yes -- ' + '; '.join(why))
    else:
        lines.append('PERF   no  -- no per-frame path, no tests/nfr, no perf-pending row of the range '
                     '(%d older row(s) wait for the next quiet slot, PW-1)' % pending_total)
    if decision['e2e'] == 'subset-first':
        lines.append('E2E    yes -- subset first (screen-flow), then the whole suite inside GT-2; %d file(s) '
                     'cite the range or changed: %s' % (len(decision['subset_files']),
                                                        short(decision['subset_files'])))
    elif decision['e2e'] == 'in-gt2':
        lines.append('E2E    yes -- inside GT-2 only; no screen-flow file changed')
    else:
        lines.append('E2E    no  -- data only')
    gt2_text = {'required': 'required before the push: the range touches %s (push_guard, JDG-1965; '
                            'skipping takes the coordinator\'s reason, JDG-2126)' % ' '.join(GATED_PREFIXES),
                'recommended': 'recommended: build or test configuration changed (push_guard does not '
                               'require it)',
                'none': 'not needed: data-only push (JDG-1965)'}
    lines.append('GT-2   ' + gt2_text[decision['gt2']])
    if decision['probe']:
        lines.append('PROBE  yes -- %d checklist row(s) no tests/system or tests/use-case file cites; only with '
                     'the coordinator\'s go-ahead, and turn each into a committed case:' % len(decision['probe_rows']))
        for checklist, ids, label in decision['probe_rows']:
            lines.append('         %s  %s' % (os.path.basename(checklist), label if ids else label + ' (no id)'))
    else:
        lines.append('PROBE  no  -- every checklist row of the range is cited by a committed UI test, '
                     'or no row is in the range')
    order = decision['order']
    lines.append('ORDER  ' + ('  '.join('%d %s' % (n + 1, step) for n, step in enumerate(order))
                              if order else 'none -- nothing costly to run'))
    for step in STEPS:
        if step['step'] in order:
            lines.append('         %-10s %s' % (step['step'], step['command']))
    return lines


# ---------------------------------------------------------------- self-test ----

SELF_TEST_FRAME = ['src/entity/layout-engine/**', 'src/framework/single-html-shell/frame-loop.ts']
SELF_TEST = [
    # (name, files, range text, rows, test citations, pending, expected order, expected perf, e2e, gt2)
    ('frame path goes PERF first', ['src/framework/single-html-shell/frame-loop.ts'], '', [], {}, [],
     ['PERF', 'GT-2'], True, 'in-gt2', 'required'),
    ('screen flow goes e2e first', ['src/adapter/input-command-translator/drag.ts'], '', [], {}, [],
     ['E2E subset', 'GT-2'], False, 'subset-first', 'required'),
    ('ledger only runs nothing', ['docs/development-records/defects.md', 'change-request/CR-1-x.md'], '', [],
     {}, [], [], False, 'none', 'none'),
    ('pure function skips PERF', ['src/entity/document-model/schedule/working-days.ts'], '', [], {}, [],
     ['GT-2'], False, 'in-gt2', 'required'),
    ('frame and flow: PERF, then e2e', ['src/entity/layout-engine/a.ts', 'src/framework/dom-screen-surface/b.ts'],
     '', [], {}, [], ['PERF', 'E2E subset', 'GT-2'], True, 'subset-first', 'required'),
    ('frame-time test goes PERF first', ['tests/nfr/nfr-002.test.ts'], '', [], {}, [],
     ['PERF', 'GT-2'], True, 'in-gt2', 'required'),
    ('configuration recommends GT-2', ['package.json'], '', [], {}, [], ['GT-2'], False, 'in-gt2', 'recommended'),
    ('perf-pending row of the range', ['docs/development-records/perf-pending.md'], 'Apply CR-9', [], {},
     [('3', 'CR-9'), ('4', 'CR-8')], ['PERF'], True, 'none', 'none'),
    ('uncited checklist row is probed', ['docs/review/user-checklist-x.md'], 'Apply CR-2',
     [('docs/review/user-checklist-x.md', ('CR-1',), 'a', False),
      ('docs/review/user-checklist-x.md', ('CR-2',), 'b', False),
      ('docs/review/user-checklist-x.md', ('CR-3',), 'c', False)],
     {'tests/system/cr-1-a.test.ts': {'CR-1'}}, [], ['PROBE'], False, 'none', 'none'),
    ('cited checklist row is not probed', ['src/use-case/edit-document/x.ts'], 'Apply CR-1',
     [('docs/review/user-checklist-x.md', ('CR-1',), 'a', False)],
     {'tests/system/cr-1-a.test.ts': {'CR-1'}}, [], ['GT-2'], False, 'in-gt2', 'required'),
    ('a changed checklist probes its id-less row', ['docs/review/user-checklist-x.md'], '',
     [('docs/review/user-checklist-x.md', (), 'about page', True)], {}, [], ['PROBE'], False, 'none', 'none'),
]


def gated(glob):
    return glob == PER_FRAME or any(glob.startswith(prefix) for prefix in GATED_PREFIXES)


def self_test():
    wrong = []
    for name, files, text, rows, citations, pending, order, perf, e2e, gt2 in SELF_TEST:
        got = decide(files, text, rows, citations, SELF_TEST_FRAME, pending)
        if (got['order'], got['perf'], got['e2e'], got['gt2']) != (order, perf, e2e, gt2):
            wrong.append('%s: got order %s perf %s e2e %s gt2 %s' % (
                name, got['order'], got['perf'], got['e2e'], got['gt2']))
    probe = decide(['docs/review/user-checklist-x.md'], 'Apply CR-2', SELF_TEST[8][3], SELF_TEST[8][4],
                   SELF_TEST_FRAME, [])
    if [row[1] for row in probe['probe_rows']] != [('CR-2',)]:
        wrong.append('probe rows: expected only CR-2, got %s' % [row[1] for row in probe['probe_rows']])
    body_only = decide(['docs/development-records/perf-pending.md'], 'Fix a thing\n\nAfter CR-9', [], {},
                       SELF_TEST_FRAME, [('3', 'CR-9')], 'Fix a thing')
    if body_only['perf']:
        wrong.append('a perf-pending CR named only in a commit body turned PERF on')
    planted = '| \u2610 | screen | id |\n|---|---|---|\n| \u2610 | canvas | CR-5 | step |\n| - | ai | CR-6 | - |\n'
    if [row[1] for row in rows_of('x.md', planted, False)] != [('CR-5',)]:
        wrong.append('checklist rows: expected only the CR-5 body row, got %s'
                     % [row[1] for row in rows_of('x.md', planted, False)])
    if ids_cited_by('tests/system/cr-613-cr-620-built-relay.test.ts', 'DFC-7') != {'CR-613', 'CR-620', 'DFC-7'}:
        wrong.append('ids of a file name: cr-613-cr-620 was not read as CR-613 and CR-620')
    for route in ROUTES:
        for glob in route['globs']:
            if glob != '**' and gated(glob) != (route['gt2'] == 'required'):
                wrong.append('%s: glob %s and gt2 %s disagree with push_guard GATED_PREFIXES'
                             % (route['name'], glob, route['gt2']))
    planted_text = planted_rule()
    if rule_faults(planted_text):
        wrong.append('a rule section that matches the tables was faulted: %s' % rule_faults(planted_text))
    drifted = planted_text.replace('`tools/gate/**`', '').replace('| 4 | `PROBE` |', '| 4 | `PROBES` |')
    if len(rule_faults(drifted)) != 2:
        wrong.append('a rule section with a lost glob and a renamed step gave %s' % rule_faults(drifted))
    for line in wrong:
        print('WRONG  ' + line)
    print('%s  %d case(s) and the route table, %d wrong' % ('OK' if not wrong else 'FAIL', len(SELF_TEST),
                                                             len(wrong)))
    return 0 if not wrong else 1


# --------------------------------------------------------------- check-rule ----

RULE_WORDS = {
    'perf': {'\u8981\u308b': True, '\u8981\u3089\u306a\u3044': False},
    'e2e': {'\u90e8\u5206\u3092\u5148\u306b': 'subset-first', 'GT-2 \u306e\u4e2d': 'in-gt2',
            '\u8981\u3089\u306a\u3044': 'none'},
    'gt2': {'\u5fc5\u9808': 'required', '\u52e7\u3081\u308b': 'recommended',
            '\u8981\u3089\u306a\u3044': 'none'},
}


def rule_section(text):
    at = text.find('\n## 7.')
    if at < 0:
        return None
    end = text.find('\n## ', at + 1)
    return text[at:end if end > 0 else len(text)]


ROUTE_ROW = re.compile(r'^`([a-z][a-z0-9-]*)`$')
STEP_ROW = re.compile(r'^`([^`]+)`$')


def rule_faults(text):
    """Faults between ROUTES / STEPS and the route and step tables of rule 04 section 7.

    A route row is `| `name` | what | globs | PERF | e2e | GT-2 | why |`; a step row is
    `| n | `step` | ... |`. The globs cell holds the globs in backticks and nothing else in
    backticks; the per-frame row names the table of section 5 instead, and the catch-all none.
    """
    section = rule_section(text)
    if section is None:
        return ['%s has no section 7 -- the route and step tables live there' % RULE]
    faults, seen_routes, seen_steps = [], {}, []
    for line in section.split('\n'):
        cells = [cell.strip() for cell in line.split('|')]
        if len(cells) < 4:
            continue
        if ROUTE_ROW.match(cells[1]) and len(cells) >= 9:
            seen_routes[ROUTE_ROW.match(cells[1]).group(1)] = cells
        elif cells[1].isdigit() and STEP_ROW.match(cells[2]):
            seen_steps.append(STEP_ROW.match(cells[2]).group(1))
    tool_routes = {route['name']: route for route in ROUTES}
    for missing in sorted(set(tool_routes) ^ set(seen_routes)):
        faults.append('route %s is in %s' % (missing, 'the tool only' if missing in tool_routes
                                              else 'the rule only'))
    for name in [route['name'] for route in ROUTES if route['name'] in seen_routes]:
        route, cells = tool_routes[name], seen_routes[name]
        written = set(re.findall(r'`([^`]+)`', cells[3]))
        expected = set(glob for glob in route['globs'] if glob not in (PER_FRAME, '**'))
        if written != expected:
            faults.append('%s: the rule names %s, the tool %s' % (name, sorted(written), sorted(expected)))
        for column, key in ((4, 'perf'), (5, 'e2e'), (6, 'gt2')):
            word = cells[column].replace('*', '').strip()
            if RULE_WORDS[key].get(word, '?') != route[key]:
                faults.append('%s: the rule says %s=%r, the tool %r' % (name, key, word, route[key]))
    if [name for name in seen_routes] != [route['name'] for route in ROUTES if route['name'] in seen_routes]:
        faults.append('routes: the rule orders them %s, the tool %s (the first match wins, so order matters)'
                      % (list(seen_routes), [route['name'] for route in ROUTES]))
    tool_steps = [step['step'] for step in STEPS]
    if seen_steps != tool_steps:
        faults.append('steps: the rule has %s, the tool %s' % (seen_steps, tool_steps))
    return faults


def planted_rule():
    """A rule section built from the tables, for the self-test (what --check-rule must accept)."""
    words = {key: {value: word for word, value in table.items()} for key, table in RULE_WORDS.items()}
    lines = ['', '## 7. planted', '', '| a | b | c | d | e | f | g |', '|---|---|---|---|---|---|---|']
    for route in ROUTES:
        globs = ' '.join('`%s`' % glob for glob in route['globs'] if glob not in (PER_FRAME, '**'))
        lines.append('| `%s` | what | %s | %s | %s | %s | why |' % (
            route['name'], globs or 'section 5', words['perf'][route['perf']], words['e2e'][route['e2e']],
            words['gt2'][route['gt2']]))
    lines += ['', '| n | step | when |', '|---|---|---|']
    lines += ['| %d | `%s` | when |' % (n + 1, step['step']) for n, step in enumerate(STEPS)]
    return '\n'.join(lines) + '\n'


def check_rule():
    with open(os.path.join(ROOT, *RULE.split('/')), encoding='utf-8') as handle:
        faults = rule_faults(handle.read())
    for fault in faults:
        print('FAIL     ' + fault)
    if not faults:
        print('OK       the route and step tables of rule 04 section 7 match ROUTES and STEPS of tools/test_route.py '
              '(%d routes, %d steps)' % (len(ROUTES), len(STEPS)))
    print('   NOT COVERED  whether a test that cites an id walks the row; whether the machine is quiet '
          'for PERF; the prose around the tables')
    return 1 if faults else 0


def main(argv):
    if argv and argv[0] in ('-h', '--help'):
        sys.stdout.write(__doc__)
        return 0
    if argv and argv[0] == '--self-test':
        return self_test()
    if argv and argv[0] == '--check-rule':
        return check_rule()
    spec = argv[0] if argv else DEFAULT_RANGE
    if '..' not in spec or '...' in spec:
        print('usage: python tools/test_route.py [<A..B>]  (two dots)')
        return 2
    base, tip = spec.split('..', 1)
    try:
        files = changed_files(base, tip or 'HEAD')
        tip = tip or 'HEAD'
        text = git('log', '--format=%B', '%s..%s' % (base, tip))
        subjects = git('log', '--format=%s', '%s..%s' % (base, tip))
        commits = len(git('rev-list', '%s..%s' % (base, tip)).split())
        rows = checklist_rows(tip, files)
        citations = ui_test_citations(tip)
    except RuntimeError as exc:
        print('PROBLEM  %s' % exc)
        return 2
    per_frame = load_perf_gate().per_frame_paths(ROOT) or []
    if not per_frame:
        print('PROBLEM  %s section 5 lists no per-frame path' % RULE)
        return 2
    pending = pending_rows()
    decision = decide(files, text, rows, citations, per_frame, pending, subjects)
    for line in report(spec, files, commits, decision, len(set(number for number, _ in pending))):
        print(line)
    return 0


for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
