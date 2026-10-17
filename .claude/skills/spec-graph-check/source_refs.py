# -*- coding: utf-8 -*-
"""Who refers to whom between the JSON files of docs/spec/_source/.

Shared by three readers, so the references are read in one place only:
  - check 83 (check-source-references.py): every reference resolves;
  - check 84 (check-source-names.py): a name matches what it points at;
  - source_relations.py: the relation diagram (fig-source-relations) and the
    edge list docs/spec/_source/source-relations.json it is drawn from.

JDG-2692 (2026-10-17): the _source JSON files are not restructured; their
relations are drawn from the references they already hold, and the checks
watch those references. JDG-2691 seeds the name allow-list.

WHAT COUNTS AS A REFERENCE. Two kinds, kept apart because they fail apart:
  - STRUCTURED: a field whose whole value names something defined elsewhere
    -- `column: "AT-156"`, `valuesOf: ["S-69", ...]`, `rowId: "PR-33"`,
    `entity: "ColumnFilter"`. The FIELDS table below lists each one with what
    it points at. A value that does not resolve is a broken manuscript.
  - PROSE: a row id in a code span (`FR-131`) or a table number (表 T-376)
    inside any string -- the specification's own house style, the same token
    specindex.REF_TOKEN reads in the Markdown.

WHERE AN ID IS DEFINED. specindex.build() already parses every table row of
docs/spec and docs/spec/_assets. A row printed into a GENERATED Markdown file
is credited to the JSON manuscript that file names in its banner, so `AT-156`
(printed into fig-erd-detail.md) belongs to erd.json. A row of a hand-written
Markdown file belongs to that Markdown file.

This module reads and returns; it prints nothing and writes nothing.
"""
import io
import json
import os
import re
import sys
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import specindex  # noqa: E402
from retired import RETIRED  # noqa: E402

SOURCE_DIR = 'docs/spec/_source'
ASSETS_DIR = 'docs/spec/_assets'

ROW_ID = re.compile(r'^[A-Z]{1,3}-[0-9]+[a-z]?$')
TABLE_ID = re.compile(r'^T-[0-9]+[a-z]?$')
PROSE_ROW = re.compile(r'`([A-Z]{1,3}-[0-9]+[a-z]?)`')
PROSE_TABLE = re.compile(r'表 ?(T-[0-9]+[a-z]?)(?![0-9a-z])')
SCHEMA_FILE = re.compile(r'^\./([a-z0-9-]+\.schema\.json)$')

# The JSON files that are written FROM another file, and what from. A
# reference INSIDE one of these is its generator's, not a manuscript's, so it
# is not read; the generation itself is an edge of its own.
GENERATED_JSON = {
    'grs-document.schema.json': ['erd.json', 'settings.json'],
    'overview.json': ['components.json'],
}
# The edge list this module's references are written into: generated from
# every manuscript at once, so it refers to nothing itself.
EDGE_LIST = 'source-relations.json'

# Files that are neither manuscripts nor generated: hand-written models a
# figure is drawn from. Their prose is read like a manuscript's.
# (fig-mcp-relay.json is the drawio-uml model of figure fig-mcp-relay.)

# STRUCTURED references: (manuscript, field) -> what the value points at.
#   row     -- a table row id anywhere in the specification
#   table   -- a table number (T-nnn)
#   entity  -- an entity name of erd.json
#   column  -- a column name of an erd.json entity (needs the entity: see
#              COLUMN_ENTITY)
#   node    -- a node name of components.json
# ⚠️ A field missing here is simply not read as structured; its prose ids
# still are. Add a row here when a manuscript grows a pointing field.
FIELDS = {
    ('document-commands.json', 'column'): 'row',
    ('document-commands.json', 'key'): 'row',
    ('document-commands.json', 'valuesOf'): 'row',
    ('display-words.json', 'rowId'): 'row',
    ('display-words.json', 'firstRow'): 'row',
    ('erd.json', 'defaultFrom'): 'row',
    ('erd.json', 'maxItemsFrom'): 'row',
    ('settings.json', 'sameAs'): 'row',
    ('settings.json', 'entity'): 'entity',
    ('settings.json', 'valuesFrom'): 'table',
    ('notice-reasons.json', 'wordsOf'): 'row',
    ('state-machines.json', 'evidence'): 'row',
    ('verification.json', 'verifiedBy'): 'row',
    ('verification.json', 'alsoVerifies'): 'row',
    ('property-items.json', 'appliesTo'): 'entity',
    ('property-items.json', 'columns'): 'column',
    ('published-entries.json', 'component'): 'node',
    ('grs-json-changes.json', 'entity'): 'entity',
    ('grs-json-changes.json', 'column'): 'column',
}

# property-items.json names columns of `Task` unless `appliesTo` says another
# entity (property_items_json_to_md.py prints the same default).
COLUMN_ENTITY_DEFAULT = 'Task'
# A Task's drawing columns live on its one TaskVisual row (keyed `taskUid`),
# and the property panel shows them as the task's own.
COLUMN_COMPANIONS = {'Task': ['TaskVisual']}

Ref = collections.namedtuple(
    'Ref', 'source path field token kind target status')
# status: 'ok' | 'retired' | 'unresolved'


def read_json(rel, root='.'):
    with io.open(os.path.join(root, rel), encoding='utf-8') as f:
        return json.load(f)


def manuscripts(root='.'):
    """Every .json of _source that is not generated and not a schema, sorted.

    A *.schema.json is a hand-written contract the manuscript names in its
    `$schema`; that pointer is read as a reference of kind `schema`, and the
    schema's own prose (it validates, it cites nothing) is not read.
    """
    out = []
    for name in sorted(os.listdir(os.path.join(root, SOURCE_DIR))):
        if (name.endswith('.json') and name not in GENERATED_JSON
                and name != EDGE_LIST and not name.endswith('.schema.json')):
            out.append(name)
    return out


def generated_markdown(root='.'):
    """_assets/*.md that says it is generated -> the manuscript it names."""
    out = {}
    folder = os.path.join(root, ASSETS_DIR)
    for name in sorted(os.listdir(folder)):
        if not name.endswith('.md'):
            continue
        head = io.open(os.path.join(folder, name), encoding='utf-8').read(3000)
        if '生成物' not in head and 'GENERATED' not in head:
            continue
        named = re.findall(r'_source/([a-z0-9-]+\.json)', head)
        named = [n for n in named if not n.endswith('.schema.json')]
        if named:
            out[ASSETS_DIR + '/' + name] = named[0]
    return out


class Definitions(object):
    """Where every id and name the references can point at is defined."""

    def __init__(self, root='.'):
        self.index = specindex.build(root)
        self.md_to_json = generated_markdown(root)
        erd = read_json(SOURCE_DIR + '/erd.json', root)
        self.entities = {e['name'] for e in erd['entities']}
        self.columns = collections.defaultdict(set)
        for e in erd['entities']:
            self.columns[e['name']].update(c['name'] for c in e['columns'])
        for d in erd['derived']:                    # printed as DV rows
            self.columns[d['entity']].add(d['name'])
        for owner, companions in COLUMN_COMPANIONS.items():
            for c in companions:
                self.columns[owner] |= self.columns[c]
        # The value shapes settings.json holds itself (table T-372): a
        # stored setting names them as `entity` like an erd.json entity.
        settings = read_json(SOURCE_DIR + '/settings.json', root)
        self.shapes = set()
        for block in settings['blocks']:
            for field in block.get('fields', []):
                if isinstance(field.get('shape'), str):
                    self.shapes.add(field['shape'].strip('`'))
        comps = read_json(SOURCE_DIR + '/components.json', root)
        self.nodes = {n['name'] for n in comps['nodes']}

    def home(self, md):
        """The file a Markdown row belongs to: its manuscript, or itself."""
        if md in self.md_to_json:
            return SOURCE_DIR + '/' + self.md_to_json[md]
        return md

    def row_home(self, rid):
        owners = self.index.row_owner.get(rid)
        if owners:
            homes = [self.home(f) for _t, f, _l in owners]
            json_homes = [h for h in homes if h.endswith('.json')]
            return (json_homes or homes)[0]
        if rid in self.index.uids:
            return 'docs/spec UIDs'
        return None

    def table_home(self, tid):
        t = self.index.tables.get(tid)
        return self.home(t['file']) if t else None


def _strings(x, path=''):
    """(path, key, value) for every string in x, keys included as values."""
    if isinstance(x, dict):
        for k, v in x.items():
            p = path + '/' + k
            if isinstance(v, str):
                yield p, k, v
            else:
                for item in _strings(v, p):
                    yield item
    elif isinstance(x, list):
        for i, v in enumerate(x):
            p = '%s[%d]' % (path, i)
            if isinstance(v, str):
                yield p, path.rsplit('/', 1)[-1].split('[')[0], v
            else:
                for item in _strings(v, p):
                    yield item


def _resolve_id(defs, token):
    if TABLE_ID.match(token):
        home = defs.table_home(token)
    else:
        home = defs.row_home(token)
    if home:
        return home, 'ok'
    if token in RETIRED:
        return None, 'retired'
    return None, 'unresolved'


def _entity_at(doc, path):
    """The `appliesTo` of the property item a path sits in, else Task."""
    m = re.match(r'^/items\[(\d+)\]', path)
    if m:
        return doc['items'][int(m.group(1))].get('appliesTo',
                                                  COLUMN_ENTITY_DEFAULT)
    m = re.match(r'^/changes\[(\d+)\]', path)
    if m:
        return doc['changes'][int(m.group(1))].get('entity')
    return COLUMN_ENTITY_DEFAULT


def references(defs, root='.'):
    """Every reference from a _source manuscript, as Ref rows."""
    out = []
    for name in manuscripts(root):
        rel = SOURCE_DIR + '/' + name
        doc = read_json(rel, root)
        if isinstance(doc, dict) and isinstance(doc.get('$schema'), str):
            m = SCHEMA_FILE.match(doc['$schema'])
            if m:
                target = SOURCE_DIR + '/' + m.group(1)
                ok = os.path.exists(os.path.join(root, target))
                out.append(Ref(rel, '/$schema', '$schema', m.group(1),
                               'schema', target if ok else None,
                               'ok' if ok else 'unresolved'))
        for path, key, value in _strings(doc):
            kind = FIELDS.get((name, key))
            if kind == 'row' and ROW_ID.match(value):
                target, status = _resolve_id(defs, value)
                out.append(Ref(rel, path, key, value, 'row', target, status))
                continue
            if kind == 'table' and TABLE_ID.match(value):
                target, status = _resolve_id(defs, value)
                out.append(Ref(rel, path, key, value, 'table', target, status))
                continue
            if kind == 'entity':
                if value in defs.entities:
                    target = SOURCE_DIR + '/erd.json'
                elif value in defs.shapes:
                    target = SOURCE_DIR + '/settings.json'
                else:
                    target = None
                out.append(Ref(rel, path, key, value, 'entity', target,
                               'ok' if target else 'unresolved'))
                continue
            if kind == 'column':
                entity = _entity_at(doc, path)
                ok = value in defs.columns.get(entity, ())
                out.append(Ref(rel, path, key, '%s.%s' % (entity, value),
                               'column', SOURCE_DIR + '/erd.json' if ok
                               else None, 'ok' if ok else 'unresolved'))
                continue
            if kind == 'node':
                ok = value in defs.nodes
                out.append(Ref(rel, path, key, value, 'node',
                               SOURCE_DIR + '/components.json' if ok
                               else None, 'ok' if ok else 'unresolved'))
                continue
            for token in PROSE_ROW.findall(value) + PROSE_TABLE.findall(value):
                target, status = _resolve_id(defs, token)
                out.append(Ref(rel, path, key, token, 'prose', target, status))
    return out


def cross_file(refs):
    """The references whose target is another file (or nowhere)."""
    return [r for r in refs if r.target != r.source]
