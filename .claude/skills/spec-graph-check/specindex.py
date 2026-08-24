# -*- coding: utf-8 -*-
"""Shared index of the gr-scheduler specification.

Both md-checks.py (the mechanical checks) and impact.py (the change-request
blast radius tool) need the same picture of the source: which tables exist,
which rows each one owns, which node encloses each line, and who references
what. Parsing it twice would be the very duplication this specification
forbids, so it is parsed once here.

NOTE ON NON-ASCII: the patterns hold Japanese text because the specification
is written in Japanese; those code points are data, not prose.
"""
import io
import os
import re
import collections

def discover(root='.'):
    """Every specification source file, found rather than listed.

    A hardcoded list was kept here and in md-checks.py, so a new
    `_assets/*.md` was invisible to checks 5-10 and 15 until someone
    remembered to register it in both places -- and the checks reported
    green while never having read it. Scanning removes that failure mode.

    Only two levels are scanned, which is what keeps the generated export
    out: `docs/spec/output/strictdoc/html/spec/_assets/*.md` sits deeper.
    `*.bak-<stamp>` files do not end in `.md` and so cannot match.
    """
    out = []
    for d in ('docs/spec', 'docs/spec/_assets'):
        full = os.path.join(root, d)
        if not os.path.isdir(full):
            continue
        for name in sorted(os.listdir(full)):
            if name.endswith('.md') and os.path.isfile(os.path.join(full, name)):
                out.append(d + '/' + name)
    return out


FILES = discover()

ROW_ID = re.compile(r'^[A-Z]{1,3}-[0-9]+[a-z]?$')
TABLE_HEAD = re.compile(r'^\*\*表 (T-[0-9]+[a-z]?) —')
SEPARATOR = re.compile(r'^\|[\s:|-]+\|\s*$')
UID_LINE = re.compile(r'^\*\*UID\*\*:\s*(\S+)')
SECTION_LINE = re.compile(r'^(#+)\s+(.*)')

# Retired on purpose; the reduction-candidate table records the retirement,
# so a reference to either is correct and must not be reported as dangling.
RETIRED = {'FR-050', 'T-030', 'S-21', 'S-52', 'K-21', 'S-57', 'K-66', 'S-139'}

REF_TABLE = re.compile(r'表 (T-[0-9]+[a-z]?)')
REF_TOKEN = re.compile(r'`([A-Z]{1,3}-[0-9]+[a-z]?)`')
REF_QUALIFIED = re.compile(
    r'表 (T-[0-9]+[a-z]?) の\s*`?([A-Z]{1,3}-[0-9]+[a-z]?)`?')
REF_COUNTED = re.compile(
    r'表 (T-[0-9]+[a-z]?) の\s*\*{0,2}([0-9]+)\*{0,2}\s*(件|行|段|つ)')


class Index(object):
    """Everything the two tools need, parsed once."""

    def __init__(self):
        self.tables = {}                            # T-id -> dict
        self.row_owner = collections.defaultdict(list)   # row -> [(T, f, ln)]
        self.uids = set()
        self.lines = {}                             # file -> [line, ...]
        self.owner_at = {}                          # (file, lineno) -> owner
        self.col_errors = []                        # (file, ln, got, want, T)

    # -- lookups -----------------------------------------------------

    @property
    def all_tables(self):
        return set(self.tables)

    @property
    def all_rows(self):
        return set(self.row_owner)

    @property
    def known(self):
        return self.all_rows | self.uids | self.all_tables | RETIRED

    def rows_of(self, tid):
        return self.tables.get(tid, {}).get('rows', [])

    def count_of(self, tid):
        """Row count as prose would state it: row-ID rows when the table has
        any, because a numbered table sometimes spans two blocks and only one
        of them carries row IDs."""
        t = self.tables.get(tid)
        if not t:
            return None
        return len(t['rows']) or t['nrows']

    def owner(self, path, lineno):
        return self.owner_at.get((path, lineno), '(unknown)')

    # -- references --------------------------------------------------

    def references_to(self, target):
        """Every place that mentions `target`, excluding its own definition.

        Returns [(file, lineno, owner, text), ...] sorted by file and line.
        """
        if target.startswith('T-'):
            pattern = re.compile(r'表 ' + re.escape(target) + r'(?![0-9a-z])')
        else:
            pattern = re.compile(r'`?\b' + re.escape(target) + r'\b`?')
        hits = []
        for path, lines in self.lines.items():
            for i, line in enumerate(lines, 1):
                if TABLE_HEAD.match(line) and target.startswith('T-'):
                    if TABLE_HEAD.match(line).group(1) == target:
                        continue                    # the definition itself
                if not pattern.search(line):
                    continue
                if self._defines(line, target):
                    continue
                hits.append((path, i, self.owner(path, i), line.strip()))
        hits.sort(key=lambda h: (h[0], h[1]))
        return hits

    @staticmethod
    def _defines(line, target):
        """True when this line is the definition of target, not a use."""
        if line.startswith('**UID**:') and line.split(':', 1)[1].strip() == target:
            return True
        if line.startswith('|'):
            first = line.strip().strip('|').split('|')[0].strip('`* ')
            if first == target:
                return True
        return False


def build(root='.'):
    idx = Index()
    for rel in discover(root):
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            continue
        lines = io.open(path, encoding='utf-8').read().splitlines()
        idx.lines[rel] = lines

        # A "**表 T-nnn —" heading owns every "|" block that follows it until
        # the next heading, UID, or chapter line: prose sits between the
        # heading and the rows, and one numbered table sometimes spans two
        # blocks. Rows under no heading are filed against the enclosing UID
        # so that dangling-reference checks still know they exist.
        current = None
        uid = '(preamble)'
        section = '(preamble)'
        header_cols = None

        for i, line in enumerate(lines, 1):
            m = UID_LINE.match(line)
            if m:
                uid = m.group(1)
                idx.uids.add(uid)
                current = header_cols = None
                idx.owner_at[(rel, i)] = uid
                continue

            m = TABLE_HEAD.match(line)
            if m:
                current = m.group(1)
                header_cols = None
                idx.tables[current] = {'rows': [], 'file': rel, 'line': i,
                                       'nrows': 0, 'uid': uid,
                                       'section': section}
                idx.owner_at[(rel, i)] = uid
                continue

            m = SECTION_LINE.match(line)
            if m:
                section = m.group(2).strip()
                current = None
                uid = '(section) ' + section
                idx.owner_at[(rel, i)] = uid
                continue

            if line.startswith('|'):
                idx.owner_at[(rel, i)] = uid
                if SEPARATOR.match(line):
                    continue
                c = [x.strip() for x in line.strip().strip('|').split('|')]
                if header_cols is None:             # first row of a "|" block
                    header_cols = len(c)
                    if current is None:             # a table with no number
                        current = 'UID:' + uid
                        idx.tables.setdefault(
                            current, {'rows': [], 'file': rel, 'line': i,
                                      'nrows': 0, 'uid': uid,
                                      'section': section, 'unnumbered': True})
                    continue                        # header row, not data
                if len(c) != header_cols:
                    idx.col_errors.append((rel, i, len(c), header_cols, current))
                idx.tables[current]['nrows'] += 1
                rid = c[0].strip('`* ')
                if ROW_ID.match(rid):
                    idx.tables[current]['rows'].append(rid)
                    idx.row_owner[rid].append((current, rel, i))
                continue

            header_cols = None
            idx.owner_at[(rel, i)] = uid

    return idx
