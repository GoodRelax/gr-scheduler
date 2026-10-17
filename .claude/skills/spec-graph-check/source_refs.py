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
    `entity: "ColumnFilter"`. The FIELDS table below lists each one, with
    what it points at and, for a row id, the row families it may land in.
    A value that is not an id where an id belongs, that resolves nowhere, or
    that lands in the wrong family is a broken manuscript.
  - PROSE: any token shaped like a row id or a table number (`FR-131`,
    T-376, IV-17) in any other string or dict key, with or without a code
    span. ⭐ Bare tokens count: the review of 585b29cc found 2,101 cross-file
    ids the backtick-only reader missed (components.json's remarks,
    state-machines.json's `rows`, ...). A bare token that resolves nowhere
    is a broken reference only when its prefix is one the specification
    registered (row-id-prefixes.json, owner `spec`); `UTF-8`, `SHA-256` and
    the ledger ids (`JDG-…`, owner `records`) are not references here.

WHERE AN ID IS DEFINED. specindex.build() already parses every table row of
docs/spec and docs/spec/_assets. A row printed into a GENERATED Markdown file
is credited to the JSON manuscript that file names in its banner, so `AT-156`
(printed into fig-erd-detail.md) belongs to erd.json. A row of a hand-written
Markdown file belongs to that Markdown file.

WHAT IS READ. Every .json of _source except the generated ones -- the
manuscripts AND the hand-written *.schema.json contracts (their prose names
the same keys, settings.schema.json among them).

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
TOKEN = re.compile(r'(?<![A-Za-z0-9_-])([A-Z]{1,3}-[0-9]+[a-z]?)(?![A-Za-z0-9])')
SCHEMA_FILE = re.compile(r'^\./([a-z0-9-]+\.schema\.json)$')

# The JSON files that are written FROM others, and what from. A reference
# INSIDE one of these is its generator's, not a manuscript's, so it is not
# read; the generation itself is an edge of its own. erd_json_to_schema.py
# reads grs-json-changes.json for the schema's change ledger.
GENERATED_JSON = {
    'grs-document.schema.json': ['erd.json', 'settings.json',
                                 'grs-json-changes.json'],
    'overview.json': ['components.json'],
}
# The edge list this module's references are written into: generated from
# every manuscript at once, so it refers to nothing itself.
EDGE_LIST = 'source-relations.json'

# STRUCTURED references: (file, field) -> (what the value points at, the
# row-id families it may land in, or None for any).
#   row     -- a table row id anywhere in the specification
#   table   -- a table number (T-nnn)
#   entity  -- an entity name of erd.json, or a value shape of settings.json
#   column  -- a column name of an erd.json entity (needs the entity: see
#              _entity_at)
#   node    -- a node name of components.json
#   node?   -- the same, where the field also holds names of its own (the
#              people and clients of fig-mcp-relay.json); only a hit counts
# ⚠️ A field missing here is read as prose: its ids still count, but a value
# that is not an id passes in silence. Add a row when a manuscript grows a
# pointing field.
FIELDS = {
    ('document-commands.json', 'column'): ('row', {'AT', 'S'}),
    ('document-commands.json', 'key'): ('row', {'AT', 'S'}),
    ('document-commands.json', 'valuesOf'): ('row', {'S'}),
    ('document-commands.json', 'tag'): ('row', {'PA'}),
    ('display-words.json', 'rowId'): ('row', None),
    ('display-words.json', 'firstRow'): ('row', {'IC'}),
    ('erd.json', 'defaultFrom'): ('row', {'S'}),
    ('erd.json', 'maxItemsFrom'): ('row', {'S'}),
    ('erd.json', 'valuesFrom'): ('table', None),
    ('settings.json', 'sameAs'): ('row', {'S'}),
    ('settings.json', 'entity'): ('entity', None),
    ('settings.json', 'valuesFrom'): ('table', None),
    ('notice-reasons.json', 'wordsOf'): ('row', {'RS'}),
    ('notice-reasons.json', 'manner'): ('row', {'NT'}),
    ('notice-reasons.json', 'table'): ('table', None),
    ('state-machines.json', 'evidence'): ('row', None),
    ('state-machines.json', 'rows'): ('row', None),
    # a notice reason, or the surface an effect opens (U-56 Open Chooser)
    ('state-machines.json', 'effectArgument'): ('row', {'RS', 'U'}),
    ('state-machines.json', 'column'): ('row', {'AT'}),
    ('verification.json', 'verifiedBy'): ('row', {'TS'}),
    ('verification.json', 'alsoVerifies'): ('row', None),
    ('property-items.json', 'appliesTo'): ('entity', None),
    ('property-items.json', 'columns'): ('column', None),
    ('published-entries.json', 'component'): ('node', None),
    ('grs-json-changes.json', 'entity'): ('entity', None),
    ('grs-json-changes.json', 'column'): ('column', None),
    ('mspdi-custom-fields.json', 'prefers'): ('column', None),
    ('mspdi-custom-fields.json', 'alias'): ('column', None),
    ('fig-mcp-relay.json', 'name'): ('node?', None),
}

# Fields that list withdrawn ids on purpose; retired_disagreements() holds
# them against retired.py instead of reading them as references.
LISTS_OF_RETIRED = {('document-commands.json', 'retired')}

# property-items.json names columns of `Task` unless `appliesTo` says another
# entity (property_items_json_to_md.py prints the same default); the two
# MSPDI custom-field frames carry Task columns.
COLUMN_ENTITY_DEFAULT = 'Task'
# A Task's drawing columns live on its one TaskVisual row (keyed `taskUid`),
# and the property panel shows them as the task's own.
COLUMN_COMPANIONS = {'Task': ['TaskVisual']}

# The entities a command of each union may write (document-commands.json
# `union`). MEASURED 2026-10-17 on 585b29cc: every `column` of every row
# lands in its union's set. A command writing another entity's column --
# CM-26 pointed at AT-27 (Task) instead of AT-53 (TaskGroup) -- is red.
UNION_ENTITIES = {
    'ProjectCommand': {'Project'},
    'TaskCommand': {'Task', 'TaskGroupMember', 'TaskVisual'},
    'TaskGroupCommand': {'TaskGroup'},
    'DependencyCommand': {'Dependency'},
    'CalendarCommand': {'Calendar', 'Exception', 'Project', 'WeekDay'},
    'ResourceCommand': {'Resource', 'Assignment'},
    'AnnotationCommand': {'CommentBox', 'HighlightBox'},
    'UnimplementedDocumentCommand': {'TaskGroup'},
    'DocumentSettingsCommand': set(),
    'WholeScheduleShiftCommand': set(),
}

Ref = collections.namedtuple(
    'Ref', 'source path field token kind target status')
# status: 'ok' | 'retired' | 'unresolved' | 'malformed' (not an id where an
# id belongs) | 'wrong-family' (an id of another table family) |
# 'wrong-entity' (a column of an entity its command does not write)
RED = ('unresolved', 'malformed', 'wrong-family', 'wrong-entity')


def read_json(rel, root='.'):
    with io.open(os.path.join(root, rel), encoding='utf-8') as f:
        return json.load(f)


def manuscripts(root='.'):
    """Every hand-edited .json of _source that is not a schema, sorted."""
    out = []
    for name in sorted(os.listdir(os.path.join(root, SOURCE_DIR))):
        if (name.endswith('.json') and name not in GENERATED_JSON
                and name != EDGE_LIST and not name.endswith('.schema.json')):
            out.append(name)
    return out


def schemas(root='.'):
    """The hand-written *.schema.json contracts (not the generated one)."""
    return sorted(n for n in os.listdir(os.path.join(root, SOURCE_DIR))
                  if n.endswith('.schema.json') and n not in GENERATED_JSON)


def read_files(root='.'):
    """Every file whose references are read: manuscripts, then schemas."""
    return manuscripts(root) + schemas(root)


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


def spec_prefixes(root='.'):
    """The row-id prefixes the specification registered (owner `spec`)."""
    doc = read_json(SOURCE_DIR + '/row-id-prefixes.json', root)
    return {p['prefix'] for p in doc['prefixes'] if p['owner'] == 'spec'}


class Definitions(object):
    """Where every id and name the references can point at is defined."""

    def __init__(self, root='.'):
        self.index = specindex.build(root)
        self.md_to_json = generated_markdown(root)
        self.prefixes = spec_prefixes(root) | {'T'}
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
        # AT-n -> its entity, read from the printed row (entity | column).
        self.column_entity = {}
        for rid, owners in self.index.row_owner.items():
            if rid.startswith('AT-'):
                _t, f, ln = owners[0]
                cells = self.index.lines[f][ln - 1].strip().strip('|').split('|')
                self.column_entity[rid] = cells[1].strip().strip('`')
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
    """(path, key, value) for every string in x. A dict KEY that looks like
    a row id (notice-reasons.json's `wordsOf: {"IV-17": "RS-21"}`) is
    yielded too, under the field name `#key`."""
    if isinstance(x, dict):
        for k, v in x.items():
            p = path + '/' + k
            if ROW_ID.match(k):
                yield p, '#key', k
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
    """The entity a `columns` / `column` / `alias` value names a column of."""
    m = re.match(r'^/items\[(\d+)\]', path)
    if m:
        return doc['items'][int(m.group(1))].get('appliesTo',
                                                  COLUMN_ENTITY_DEFAULT)
    m = re.match(r'^/changes\[(\d+)\]', path)
    if m:
        return doc['changes'][int(m.group(1))].get('entity')
    return COLUMN_ENTITY_DEFAULT


def _command_union(doc, path):
    m = re.match(r'^/rows\[(\d+)\]', path)
    return doc['rows'][int(m.group(1))].get('union') if m else None


def _own_ids(doc):
    """The ids a file DEFINES (`"id": "CM-1"`): a definition, not a use."""
    out = set()

    def walk(x):
        if isinstance(x, dict):
            v = x.get('id')
            if isinstance(v, str) and ROW_ID.match(v):
                out.add(v)
            for item in x.values():
                walk(item)
        elif isinstance(x, list):
            for item in x:
                walk(item)
    walk(doc)
    return out


def _structured(defs, rel, name, doc, path, key, value, kind, families):
    """The Ref for one value of a FIELDS field (None when it is no hit)."""
    if kind in ('row', 'table'):
        shape = TABLE_ID if kind == 'table' else ROW_ID
        if not shape.match(value):
            return Ref(rel, path, key, value, kind, None, 'malformed')
        target, status = _resolve_id(defs, value)
        if status == 'ok' and families is not None \
                and value.split('-', 1)[0] not in families:
            status = 'wrong-family'
        if status == 'ok' and name == 'document-commands.json' \
                and key == 'column' and value.startswith('AT-'):
            union = _command_union(doc, path)
            if union is not None:
                allowed = UNION_ENTITIES.get(union)
                if allowed is None or \
                        defs.column_entity.get(value) not in allowed:
                    status = 'wrong-entity'
        return Ref(rel, path, key, value, kind, target, status)
    if kind == 'entity':
        if value in defs.entities:
            target = SOURCE_DIR + '/erd.json'
        elif value in defs.shapes:
            target = SOURCE_DIR + '/settings.json'
        else:
            target = None
        return Ref(rel, path, key, value, 'entity', target,
                   'ok' if target else 'unresolved')
    if kind == 'column':
        entity = _entity_at(doc, path)
        ok = value in defs.columns.get(entity, ())
        return Ref(rel, path, key, '%s.%s' % (entity, value), 'column',
                   SOURCE_DIR + '/erd.json' if ok else None,
                   'ok' if ok else 'unresolved')
    if kind in ('node', 'node?'):
        ok = value in defs.nodes
        if kind == 'node?' and not ok:
            return None
        return Ref(rel, path, key, value, 'node',
                   SOURCE_DIR + '/components.json' if ok else None,
                   'ok' if ok else 'unresolved')
    raise ValueError(kind)


def references(defs, root='.'):
    """Every reference from a _source manuscript or schema, as Ref rows."""
    out = []
    for name in read_files(root):
        rel = SOURCE_DIR + '/' + name
        doc = read_json(rel, root)
        own = _own_ids(doc)
        if isinstance(doc, dict) and isinstance(doc.get('$schema'), str):
            m = SCHEMA_FILE.match(doc['$schema'])
            if m:
                target = SOURCE_DIR + '/' + m.group(1)
                ok = os.path.exists(os.path.join(root, target))
                out.append(Ref(rel, '/$schema', '$schema', m.group(1),
                               'schema', target if ok else None,
                               'ok' if ok else 'unresolved'))
        for path, key, value in _strings(doc):
            if (name, key) in LISTS_OF_RETIRED:
                continue                            # retired_disagreements()
            spec = FIELDS.get((name, key))
            if spec is not None:
                ref = _structured(defs, rel, name, doc, path, key, value,
                                  spec[0], spec[1])
                if ref is not None:
                    out.append(ref)
                continue
            if key == 'id' and value in own:
                continue                            # its own definition
            for token in TOKEN.findall(value):
                target, status = _resolve_id(defs, token)
                if status == 'unresolved' and \
                        token.split('-', 1)[0] not in defs.prefixes:
                    continue                        # UTF-8, JDG-…: not ours
                out.append(Ref(rel, path, key, token, 'prose', target,
                               status))
    return out


def retired_disagreements(root='.'):
    """Ids document-commands.json lists as retired that retired.py lacks."""
    doc = read_json(SOURCE_DIR + '/document-commands.json', root)
    return sorted(set(doc.get('retired', [])) - RETIRED)


def cross_file(refs):
    """The references whose target is another file (or nowhere)."""
    return [r for r in refs if r.target != r.source]
