# -*- coding: utf-8 -*-
"""Check 97 -- the traceability gap counts of the NDD review standard (R1b).

R1b asks that four gap counts be 0. Check 39 reads whether a test quotes a
MUST clause, which is another question; nothing counted these before (study
82, A16).

THE CHAIN AS IT STANDS (2026-11-24)

  Read from the StrictDoc export check.sh writes (sections 1-4,
  scratch/spec-check/sd-out/json/index.json): the nodes of type GOAL (the top
  of the chain), USE_CASE, FUNC_REQ, NON_FUNC_REQ and SW_SPEC, joined by their
  Parent relations. A table row of docs/spec whose table has a `traces`
  column joins the chain as a node below the requirements (stage B8 adds the
  column; the row's ID is its first cell, its parents the IDs of the traces
  cell). DOCUMENT nodes are no part of the chain.

  An implementation cites an ID by a `see <ID>` or `Spec: <ID>` comment in
  src/, or in the build-time code whose output ships (BUILD_CODE:
  vite.config.ts, the tools/generate_*.py and docs/spec/_source/*.py
  generators; `# Spec: <ID>` in Python; B13, 2026-11-28). A test cites an ID anywhere in a tests/ file (title, describe title,
  comment), matched on whole IDs, so FR-001 never hits NFR-001; R6 wants the
  `// Spec:` comment, and the lenient reading is held until stage B11 moves
  the IDs into comments.

THE FOUR COUNTS (R1b, "Are all of the following gap counts 0?")

  no-parent        a chain node other than a GOAL with no parent, or with a
                   parent the chain does not hold
  no-child         a GOAL or USE_CASE (an item above the requirements) with no
                   child
  leaf-unbuilt     a leaf requirement (FUNC_REQ or NON_FUNC_REQ with no child
                   requirement) with no implementation, or with neither a test
                   nor a row in the verification method list; an
                   implementation or a test of a child below it (SW_SPEC, a
                   traces row) counts for it
  below-unbuilt    a node below the requirements (SW_SPEC, a traces row) with
                   no implementation or no test

  THE EXCEPTIONS R1b NAMES (stage B13, 2026-11-28)

  verification     a docs/spec table whose header has both a verification
  method list      method column and a verifier column (ANMS v0.36 6.1:
                   requirement ID / verification method / verifier; the
                   Japanese header words are VERIFY_METHOD and VERIFIER
                   below): every ID in its requirement column counts as
                   tested for leaf-unbuilt. It never counts for
                   below-unbuilt: R1b gives an implementation specification
                   no such way out.
  limitations      a leaf requirement whose ID the body of section 1.7
                   Limitations (ANMS 1.10) names, and whose statement's first
                   paragraph carries SHOULD or MAY and no MUST, leaves
                   leaf-unbuilt.
  retired rows     a traces row whose second cell opens with the retired
                   mark (RETIRED below) keeps a number so it is never reused;
                   it is no item of the chain and joins no count.

THE NUMBERS HELD (trace-gaps-baseline.txt, one `key value` per line)

  A ratchet, the shape of checks 60 and 96: a count above its line fails and
  names every node behind it; a count below asks for the line to be lowered
  in the same commit. Stage B13 drives every line to 0.

Usage:
    python check-trace-gaps.py            the gate
    python check-trace-gaps.py --list     every node behind every count
    python check-trace-gaps.py --self-test
Exit 0 green, 1 red.
"""
import io
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import spec_files  # noqa: E402
EXPORT = os.path.join(ROOT, 'scratch', 'spec-check', 'sd-out', 'json',
                      'index.json')
SPEC = os.path.join(ROOT, 'docs', 'spec')
BASELINE = os.path.join(HERE, 'trace-gaps-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/trace-gaps-baseline.txt'
TERMS = ('no-parent', 'no-child', 'leaf-unbuilt', 'below-unbuilt')

TOP = frozenset(['GOAL'])
ABOVE = frozenset(['GOAL', 'USE_CASE'])
REQUIREMENT = frozenset(['FUNC_REQ', 'NON_FUNC_REQ'])
BELOW = frozenset(['SW_SPEC', 'TRACES_ROW'])
CHAIN = ABOVE | REQUIREMENT | BELOW

ID = r'[A-Z]{1,5}-[0-9]+[a-z]?'
WHOLE_ID = re.compile(r'(?<![A-Za-z0-9-])(' + ID + r')(?![A-Za-z0-9-])')
CITE = re.compile(r'(?://|\*|#)\s*(?:see|Spec:)\s+(' + ID + r'(?:\s*,\s*' + ID +
                  r')*)')
# Build-time code that writes what ships (the single HTML, generated src/ data):
# R1b counts the code that implements a behaviour wherever it sits.
BUILD_CODE = ('vite.config.ts', 'tools/generate_*.py', 'docs/spec/_source/*.py')
CELL = re.compile(r'(?<!\\)\|')
VERIFY_METHOD = u'\u691c\u8a3c\u65b9\u6cd5'      # the verification method column
VERIFIER = u'\u691c\u8a3c\u8005'                 # the verifier column
REQUIREMENT_COLUMN = u'\u8981\u6c42'             # the requirement (ID) column
RETIRED = u'\uff08\u6b20\u756a'                  # a retired row: "(retired number"
LIMITATIONS_FILE = '01-04-requirements.md'   # read whole: spec_files joins the parts
LIMITATIONS_HEADING = '### 1.7 Limitations'


def say(message):
    sys.stdout.write(message.encode('ascii', 'backslashreplace')
                     .decode('ascii') + '\n')


def export_nodes(path=EXPORT, statements=None):
    """{uid: (type, [parent uid])} of the chain nodes of the export.

    When `statements` is a dict, it receives {uid: STATEMENT text}.
    """
    with io.open(path, encoding='utf-8') as handle:
        doc = json.load(handle)
    nodes = {}

    def walk(x):
        if isinstance(x, dict):
            kind = x.get('_NODE_TYPE')
            if isinstance(x.get('UID'), str) and kind in CHAIN:
                parents = [r.get('VALUE') for r in x.get('RELATIONS') or []
                           if r.get('TYPE') == 'Parent']
                nodes[x['UID']] = (kind, parents)
                if statements is not None:
                    statements[x['UID']] = x.get('STATEMENT') or ''
            for value in x.values():
                walk(value)
        elif isinstance(x, list):
            for value in x:
                walk(value)
    walk(doc.get('DOCUMENTS', []))
    return nodes


def traces_rows(spec=SPEC):
    """{row id: [parent id]} of the rows of every docs/spec table with a traces column."""
    rows = {}
    for base, dirs, names in os.walk(spec):
        dirs[:] = sorted(d for d in dirs if d not in ('output', '__pycache__'))
        for name in spec_files.listed_names(base, sorted(names)):
            if not name.endswith('.md'):
                continue
            column = None
            with io.StringIO(spec_files.read_spec_file(os.path.join(base, name))) as handle:
                for line in handle:
                    text = line.strip()
                    if not text.startswith('|'):
                        column = None
                        continue
                    cells = [c.strip().strip('`*') for c in CELL.split(text)[1:-1]]
                    lowered = [c.lower() for c in cells]
                    if 'traces' in lowered:
                        column = lowered.index('traces')
                        continue
                    if column is None or column >= len(cells) or not cells:
                        continue
                    first = WHOLE_ID.fullmatch(cells[0])
                    if first and not is_retired(cells):
                        rows[first.group(1)] = WHOLE_ID.findall(cells[column])
    return rows


def is_retired(cells):
    """True for a retired row: its second cell opens with the retired mark."""
    return len(cells) > 1 and cells[1].startswith(RETIRED)


def spec_tables(spec=SPEC):
    """Yield (header cells, [row cells]) of every table of the docs/spec manuscripts."""
    for base, dirs, names in os.walk(spec):
        dirs[:] = sorted(d for d in dirs if d not in ('output', '__pycache__'))
        for name in spec_files.listed_names(base, sorted(names)):
            if not name.endswith('.md'):
                continue
            header, body = None, []
            for line in spec_files.read_spec_file(os.path.join(base, name)).split('\n') + ['']:
                text = line.strip()
                if not text.startswith('|'):
                    if header:
                        yield header, body
                    header, body = None, []
                    continue
                cells = [c.strip().strip('`*') for c in CELL.split(text)[1:-1]]
                if header is None:
                    header = cells
                elif not all(set(c) <= set('-: ') for c in cells):
                    body.append(cells)


def verification_rows(spec=SPEC):
    """IDs named in the requirement column of the verification method list (ANMS 6.1)."""
    found = set()
    for header, body in spec_tables(spec):
        if not (any(VERIFY_METHOD in h for h in header) and any(VERIFIER in h for h in header)):
            continue
        column = next((i for i, h in enumerate(header) if h.startswith(REQUIREMENT_COLUMN)), None)
        for cells in body:
            if column is not None and column < len(cells):
                found.update(WHOLE_ID.findall(cells[column]))
    return found


def limitation_ids(spec=SPEC):
    """IDs the body of section 1.7 Limitations names (ANMS 1.10)."""
    text = spec_files.read_spec_file(os.path.join(spec, LIMITATIONS_FILE))
    start = text.find(LIMITATIONS_HEADING)
    if start < 0:
        return set()
    end = text.find('\n### ', start + len(LIMITATIONS_HEADING))
    return set(WHOLE_ID.findall(text[start:end if end > 0 else len(text)]))


def may_or_should(statement):
    """True when the first paragraph of a statement carries SHOULD or MAY and no MUST."""
    first = (statement or '').strip().split('\n\n')[0]
    return bool(re.search(r'\b(SHOULD|MAY)\b', first)) and not re.search(r'\bMUST\b', first)


def tracked(top):
    out = subprocess.run(['git', 'ls-files', '--', top], cwd=ROOT,
                         capture_output=True, text=True, check=True).stdout
    return [p for p in out.split('\n') if p.endswith('.ts')]


def implementation_files():
    """src/ and the build-time code whose output ships (see BUILD_CODE)."""
    out = tracked('src')
    listed = subprocess.run(['git', 'ls-files', '--'] + list(BUILD_CODE), cwd=ROOT,
                            capture_output=True, text=True, check=True).stdout
    out.extend(p for p in listed.split('\n') if p.endswith(('.ts', '.py')))
    return out


def cited_by_src():
    found = set()
    for rel in implementation_files():
        with io.open(os.path.join(ROOT, rel), encoding='utf-8',
                     errors='replace') as handle:
            for match in CITE.finditer(handle.read()):
                found.update(WHOLE_ID.findall(match.group(1)))
    return found


def cited_by_tests():
    found = set()
    for rel in tracked('tests'):
        with io.open(os.path.join(ROOT, rel), encoding='utf-8',
                     errors='replace') as handle:
            found.update(WHOLE_ID.findall(handle.read()))
    return found


def gaps(nodes, built, tested, verified=frozenset(), exempt=frozenset()):
    """{term: [(uid, why)]} over `nodes` {uid: (type, [parents])}.

    `verified`: requirement IDs of the verification method list (tested for
    leaf-unbuilt only). `exempt`: MAY / SHOULD requirements the limitations
    section names (out of leaf-unbuilt).
    """
    children = {}
    for uid, (_kind, parents) in nodes.items():
        for parent in parents:
            children.setdefault(parent, []).append(uid)
    found = {term: [] for term in TERMS}

    def below_of(uid, seen=None):
        """Every node below the requirements that traces up to `uid`."""
        seen = set() if seen is None else seen
        out = []
        for child in children.get(uid, []):
            if child in seen:
                continue
            seen.add(child)
            if nodes[child][0] in BELOW:
                out.append(child)
                out.extend(below_of(child, seen))
        return out

    for uid in sorted(nodes):
        kind, parents = nodes[uid]
        if kind not in TOP:
            missing = [p for p in parents if p not in nodes]
            if not parents:
                found['no-parent'].append((uid, 'no parent'))
            elif missing:
                found['no-parent'].append((uid, 'parent %s is not in the chain'
                                                % ', '.join(missing)))
        if kind in ABOVE and not children.get(uid):
            found['no-child'].append((uid, 'no child'))
        if kind in REQUIREMENT:
            kids = children.get(uid, [])
            if any(nodes[k][0] in REQUIREMENT for k in kids) or uid in exempt:
                continue
            family = [uid] + below_of(uid)
            has_build = any(f in built for f in family)
            has_test = any(f in tested for f in family) or uid in verified
            if not has_build or not has_test:
                lacks = [w for w, ok in (('implementation', has_build),
                                         ('test or verification row',
                                          has_test)) if not ok]
                found['leaf-unbuilt'].append((uid, 'no ' + ' and no '.join(lacks)))
        if kind in BELOW:
            family = [uid] + below_of(uid)
            has_build = any(f in built for f in family)
            has_test = any(f in tested for f in family)
            if not has_build or not has_test:
                lacks = [w for w, ok in (('implementation', has_build),
                                         ('test', has_test)) if not ok]
                found['below-unbuilt'].append((uid, 'no ' + ' and no '.join(lacks)))
    return found


def read_baseline():
    held = {}
    with io.open(BASELINE, encoding='utf-8') as handle:
        for raw in handle:
            line = raw.strip()
            if not line or line.startswith('#'):
                continue
            key, value = line.split()
            held[key] = int(value)
    return held


def self_test():
    nodes = {
        'GL-1': ('GOAL', []),
        'GL-2': ('GOAL', []),
        'UC-1': ('USE_CASE', ['GL-1']),
        'FR-1': ('FUNC_REQ', ['UC-1']),
        'FR-2': ('FUNC_REQ', ['UC-9']),
        'SWS-1': ('SW_SPEC', ['FR-1']),
        'NFR-1': ('NON_FUNC_REQ', []),
    }
    nodes['FR-3'] = ('FUNC_REQ', ['UC-1'])      # built, verified by the list
    nodes['FR-4'] = ('FUNC_REQ', ['UC-1'])      # a MAY the limitations name
    nodes['SWS-2'] = ('SW_SPEC', ['FR-3'])      # the list is no way out here
    got = gaps(nodes, built={'SWS-1', 'FR-3', 'SWS-2'},
               tested={'FR-1', 'SWS-1'}, verified={'FR-3', 'SWS-2'},
               exempt={'FR-4'})
    want = {'no-parent': ['FR-2', 'NFR-1'], 'no-child': ['GL-2'],
            'leaf-unbuilt': ['FR-2', 'NFR-1'], 'below-unbuilt': ['SWS-2']}
    bad = 0
    for term in TERMS:
        ids = [uid for uid, _why in got[term]]
        ok = ids == want[term]
        say('%s self-test %s: %s' % ('OK  ' if ok else 'FAIL', term, ids))
        bad += 0 if ok else 1
    if not may_or_should(u'GRS MAY do it.\n\nMUST later') or may_or_should(u'GRS MUST, SHOULD'):
        say('FAIL self-test: may_or_should reads the wrong paragraph or keyword')
        bad += 1
    if not is_retired(['X-1', RETIRED + u' -- gone)', '-']) or is_retired(['X-2', 'kept', 'FR-1']):
        say('FAIL self-test: a retired row is not told from a kept one')
        bad += 1
    # FR-1 is built only through its child SWS-1: R1b counts it as built.
    whole = gaps(nodes, built=set(), tested=set())
    if 'SWS-1' not in [u for u, _w in whole['below-unbuilt']]:
        say('FAIL self-test: SWS-1 with no implementation was not counted')
        bad += 1
    return 0 if bad == 0 else 1


def main(argv):
    if '--self-test' in argv:
        return self_test()
    if not os.path.exists(EXPORT):
        say('PROBLEM  the StrictDoc export is missing (%s) -- run check.sh, '
            'which writes it in sections 1-4; without it the Parent relations '
            'would be lost and every count would be wrong'
            % os.path.relpath(EXPORT, ROOT).replace(os.sep, '/'))
        return 1
    statements = {}
    nodes = export_nodes(statements=statements)
    for uid, parents in traces_rows().items():
        nodes.setdefault(uid, ('TRACES_ROW', parents))
    named = limitation_ids()
    exempt = {u for u in named if nodes.get(u, ('',))[0] in REQUIREMENT
              and may_or_should(statements.get(u))}
    verified = verification_rows()
    found = gaps(nodes, cited_by_src(), cited_by_tests(), verified, exempt)
    held = read_baseline()
    red = False
    say('INFO     %d chain node(s): %s' % (len(nodes), ', '.join(
        '%s %d' % (k, sum(1 for t, _p in nodes.values() if t == k))
        for k in sorted(CHAIN) if any(t == k for t, _p in nodes.values()))))
    say('INFO     %d requirement ID(s) in the verification method list, %d MAY / '
        'SHOULD requirement(s) the limitations section names' % (len(verified), len(exempt)))
    for term in TERMS:
        count = len(found[term])
        line = held.get(term)
        if line is None:
            say('FAIL     %s holds no line "%s <n>"' % (REL_BASELINE, term))
            red = True
        elif count > line:
            red = True
            say('FAIL     %s: %d > %d held' % (term, count, line))
            for uid, why in found[term]:
                say('           %s -- %s' % (uid, why))
        elif count < line:
            say('OK       %s: %d < %d held -- lower the line in %s in this '
                'commit' % (term, count, line, REL_BASELINE))
        else:
            say('OK       %s: %d (held %d)' % (term, count, line))
        if '--list' in argv:
            for uid, why in found[term]:
                say('           %s %s -- %s' % (term, uid, why))
    return 1 if red else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
