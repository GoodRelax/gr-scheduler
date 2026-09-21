# -*- coding: utf-8 -*-
"""state-machines.json -> docs/spec/_assets/tbl-state-machines.md

state-machines.json is the manuscript for the unsaved state machines (ADR-002
of Chapter 5.6, table T-250 of docs/spec/05-07-design.md). EDIT THAT. This
file prints, per region, the state table, the event table, the transition
table and the state diagram, and _assets/tbl-state-machines.md is a generated
artifact: a hand edit to it is overwritten, and --check catches one before it
can be committed.

    python state_machines_json_to_md.py           rebuild the document
    python state_machines_json_to_md.py --check   exit 1 if the file differs

It is also the ONE reader of the manuscript: tools/generate_state_machine_types.py
imports `load()` from here, so the two artifacts are printed from one
validated model and cannot disagree about what the manuscript says.

What `load()` refuses (CR-436 section 3.1), on top of the schema:
  - an evidence id -- of a state, a transition, an event source, a carried
    value or an effect -- that no table row or requirement of docs/spec
    defines (this file's own output is not counted as a definition);
  - a transition whose source or target key is not a state, whose event is
    not an event, or whose `{name}` target segment is not a value the event
    carries (such a segment stands for any kind of that union but its
    initial one);
  - a union without exactly one initial state;
  - a key that is neither `axis.kind` nor `kind` below its parent
    (decision 4 of CR-436), or a parent mixing the two readings;
  - a duplicate row id, key or event, and an event no transition names;
  - an event key two regions both hold (decision 12 of CR-440): the root
    finds the region an event touches by its `type` (SS-5 of table T-284),
    so one key in two regions leaves that lookup without one answer. An
    effect name may repeat across regions -- the shell only runs it.

Run with PYTHONIOENCODING=utf-8.
"""
import collections
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.dirname(HERE)
ASSETS = os.path.join(SPEC, '_assets')
SRC = os.path.join(HERE, 'state-machines.json')
SCHEMA = os.path.join(HERE, 'state-machines.schema.json')
OUT_NAME = 'tbl-state-machines.md'
OUT = os.path.join(ASSETS, OUT_NAME)

LANG = 'ja'
NONE_CELL = u'—'
JOIN = u' ・ '
ALT = u' ／ '
AND = u' & '

SOURCE_WORD = {
    'input': u'入力',
    'effectResult': u'副作用の結果',
    'otherRegion': u'ほかの領域の結果',
    'time': u'時間',
}

# The first cell of a table row and a requirement's UID line: the two ways
# docs/spec defines an id (the same reading row_id_prefixes_json_to_md.py uses).
ROW = re.compile(r'^\|\s*(?:\*\*)?`?([A-Z][A-Za-z]*-\d+[a-z]?)`?(?:\*\*)?\s*\|')
UID = re.compile(r'^\*\*UID\*\*:\s*(\S+)')
PLACEHOLDER = re.compile(r'^\{([a-z][A-Za-z0-9]*)\}$')


def say(message):
    """The console may be cp932 while the manuscript quotes marks it cannot
    print; the same guard settings_json_to_md.py carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def text(value):
    return value[LANG]


def defined_ids():
    """Every id a table row or a requirement of docs/spec defines."""
    ids = set()
    for base, dirs, names in os.walk(SPEC):
        dirs[:] = [d for d in dirs if d not in ('output', '__pycache__', '_source')]
        for name in names:
            if not name.endswith('.md') or name == OUT_NAME:
                continue
            path = os.path.join(base, name)
            body = io.open(path, encoding='utf-8').read().replace('\r\n', '\n')
            fenced = False
            for line in body.split('\n'):
                if line.strip().startswith('```'):
                    fenced = not fenced
                    continue
                if fenced:
                    continue
                for pattern in (ROW, UID):
                    found = pattern.match(line)
                    if found:
                        ids.add(found.group(1))
    return ids


def schema_problems(doc):
    """Soft dependency, as in settings_json_to_md.py: a machine without a
    validator must still be able to build the specification."""
    try:
        import jsonschema
    except ImportError:
        say('NOTE     jsonschema is not installed, so state-machines.schema.json'
            ' was not enforced this run')
        return []
    schema = json.load(io.open(SCHEMA, encoding='utf-8'))
    validator = jsonschema.Draft202012Validator(schema)
    out = []
    for e in sorted(validator.iter_errors(doc), key=lambda e: list(e.path)):
        message = e.message if len(e.message) <= 160 else e.message[:157] + '...'
        out.append('%s: %s' % ('/'.join(str(x) for x in e.path) or '(root)',
                               message))
    return out


class Region(object):
    """One region, read and cross-checked. Everything a printer needs."""

    def __init__(self, raw):
        self.raw = raw
        self.name = raw['region']
        self.stem = raw['typeStem']
        self.states = raw['states']
        self.events = raw['events']
        self.transitions = raw['transitions']
        self.by_key = collections.OrderedDict((s['key'], s) for s in self.states)
        self.event_by_key = collections.OrderedDict(
            (e['key'], e) for e in self.events)
        self.root = None
        # parent key -> ordered axes {axis: [state, ...]}  (two-word children)
        self.axes = collections.OrderedDict()
        # parent key -> [state, ...]                         (one-word children)
        self.kinds = collections.OrderedDict()

    def remainder(self, state):
        return state['key'][len(state['parent']) + 1:].split('.')

    def classify(self, found):
        for state in self.states:
            if state['parent'] is None:
                if self.root is not None:
                    found.append('%s: a second root %s' % (self.name, state['id']))
                self.root = state
                continue
            if state['parent'] not in self.by_key:
                found.append('%s: parent %s is not a state' % (state['id'], state['parent']))
                continue
            if not state['key'].startswith(state['parent'] + '.'):
                found.append('%s: key %s is not below its parent %s'
                             % (state['id'], state['key'], state['parent']))
                continue
            rest = self.remainder(state)
            if len(rest) == 2:
                self.axes.setdefault(state['parent'], collections.OrderedDict()) \
                    .setdefault(rest[0], []).append(state)
            elif len(rest) == 1:
                self.kinds.setdefault(state['parent'], []).append(state)
            else:
                found.append('%s: %s is neither axis.kind nor kind below %s'
                             % (state['id'], state['key'], state['parent']))
        for parent in self.axes:
            if parent in self.kinds:
                found.append('%s: its children are read both as axes and as kinds'
                             % parent)
        if self.root is None:
            found.append('%s: no root state' % self.name)
        elif self.root['key'] != self.name:
            found.append('%s: the root key is %s' % (self.name, self.root['key']))

    def unions(self):
        """(label, [state, ...]) for every union, the root as a union of one."""
        out = [(self.name, [self.root])] if self.root else []
        for parent, axes in self.axes.items():
            for axis, members in axes.items():
                out.append(('%s.%s' % (parent, axis), members))
        for parent, members in self.kinds.items():
            out.append((parent, members))
        return out

    def check_initials(self, found):
        for label, members in self.unions():
            count = sum(1 for s in members if s['initial'])
            if count != 1:
                found.append('%s: %d initial states in the union %s'
                             % (self.name, count, label))

    def targets_of(self, key, event):
        """The state keys a target key can mean: itself, or its expansion."""
        parts = key.split('.')
        holes = [i for i, p in enumerate(parts) if PLACEHOLDER.match(p)]
        if not holes:
            return [key] if key in self.by_key else []
        if holes != [len(parts) - 1]:
            return []
        name = PLACEHOLDER.match(parts[-1]).group(1)
        if name not in [c['name'] for c in event['carries']]:
            return []
        head = '.'.join(parts[:-1])
        # The value names a kind that is ENTERED, so never the union's
        # initial kind -- the absence the union starts from (`armed.none`).
        return [k for k, s in self.by_key.items()
                if k.startswith(head + '.') and '.' not in k[len(head) + 1:]
                and not s['initial']]

    def check_transitions(self, found):
        named = set()
        for row in self.transitions:
            event = self.event_by_key.get(row['event'])
            if event is None:
                found.append('%s: event %s is not an event' % (row['id'], row['event']))
                continue
            named.add(row['event'])
            for alternative in row['from']:
                for key in alternative:
                    if key not in self.by_key:
                        found.append('%s: source %s is not a state' % (row['id'], key))
            if row['to'] != 'self':
                for key in row['to']:
                    if not self.targets_of(key, event):
                        found.append('%s: target %s is not a state' % (row['id'], key))
        for event in self.events:
            if event['key'] not in named:
                found.append('%s: no transition names event %s'
                             % (event['id'], event['key']))

    def evidence(self):
        """(row id, [cited id, ...]) for everything this region cites."""
        out = []
        for state in self.states:
            cited = list(state['evidence'])
            for carried in state['carries']:
                cited.extend(carried.get('rows', []))
            out.append((state['id'], cited))
        for event in self.events:
            cited = list(event['source']['rows'])
            for carried in event['carries']:
                cited.extend(carried.get('rows', []))
            out.append((event['id'], cited))
        for row in self.transitions:
            cited = list(row['evidence'])
            if row['effect'] and row['effect'].get('row'):
                cited.append(row['effect']['row'])
            out.append((row['id'], cited))
        return out


def duplicates(values):
    seen = set()
    out = []
    for value in values:
        if value in seen:
            out.append(value)
        seen.add(value)
    return out


def shared_event_keys(regions):
    """One problem per event key that more than one region holds."""
    owners = collections.OrderedDict()
    for region in regions:
        for event in region.events:
            names = owners.setdefault(event['key'], [])
            if region.name not in names:
                names.append(region.name)
    return ['event %s is held by more than one region (%s)' % (key, ', '.join(names))
            for key, names in owners.items() if len(names) > 1]


def load():
    """(regions, problems) -- the validated model, or the reasons it is not."""
    doc = json.load(io.open(SRC, encoding='utf-8'),
                    object_pairs_hook=collections.OrderedDict)
    found = schema_problems(doc)
    if found:
        return [], found
    regions = [Region(raw) for raw in doc['regions']]
    ids = [r['id'] for region in regions
           for r in region.states + region.events + region.transitions]
    found.extend('row id %s appears twice' % d for d in duplicates(ids))
    captions = [c for region in regions
                for c in [region.raw['figure']['id']]
                + [t['id'] for t in region.raw['tables'].values()]]
    found.extend('table or figure %s appears twice' % d for d in duplicates(captions))
    found.extend(shared_event_keys(regions))
    known = defined_ids()
    for region in regions:
        found.extend('state key %s appears twice' % d
                     for d in duplicates(s['key'] for s in region.states))
        found.extend('event %s appears twice' % d
                     for d in duplicates(e['key'] for e in region.events))
        region.classify(found)
        region.check_initials(found)
        region.check_transitions(found)
        for row_id, cited in region.evidence():
            for one in cited:
                if one not in known:
                    found.append('%s: %s is not defined in docs/spec' % (row_id, one))
    return regions, found


# ---------------------------------------------------------------------------
# Printing
# ---------------------------------------------------------------------------

def code(value):
    return u'`%s`' % value


def cited(ids):
    return JOIN.join(code(i) for i in ids) if ids else NONE_CELL


def carried_cell(carries):
    if not carries:
        return NONE_CELL
    pieces = []
    for carried in carries:
        extra = []
        if carried.get('rows'):
            extra.append(JOIN.join(code(r) for r in carried['rows']))
        if carried.get('note'):
            extra.append(text(carried['note']))
        piece = code(carried['name'])
        if extra:
            piece += u'（%s）' % u'。'.join(extra)
        pieces.append(piece)
    return ALT.join(pieces)


def source_cell(source):
    word = SOURCE_WORD[source['kind']]
    if source.get('note'):
        word += u'（%s）' % text(source['note'])
    return u'%s: %s' % (word, JOIN.join(code(r) for r in source['rows']))


def keys_cell(conjunction):
    return AND.join(code(k) for k in conjunction)


def guard_cell(guard):
    if not guard:
        return NONE_CELL
    return AND.join((u'not ' if term.get('not') else u'') + code(term['name'])
                    for term in guard)


def target_cell(row):
    cell = u'自己' if row['to'] == 'self' else keys_cell(row['to'])
    if row.get('note'):
        cell += u'（%s）' % text(row['note'])
    return cell


def effect_cell(effect):
    if not effect:
        return NONE_CELL
    cell = code(effect['name'])
    if effect.get('row'):
        cell += u'（%s）' % code(effect['row'])
    return cell


def table(caption, head, rows):
    lines = [u'**表 %s — %s**' % (caption['id'], text(caption['caption'])), u'']
    lines.append(u'| ' + u' | '.join(head) + u' |')
    lines.append(u'| ' + u' | '.join([u'---'] * len(head)) + u' |')
    for cells in rows:
        lines.append(u'| ' + u' | '.join(cells) + u' |')
    return lines


def state_rows(region):
    for s in region.states:
        yield [s['id'], code(s['key']),
               code(s['parent']) if s['parent'] else NONE_CELL,
               u'○' if s['initial'] else NONE_CELL,
               carried_cell(s['carries']), cited(s['evidence'])]


def event_rows(region):
    for e in region.events:
        yield [e['id'], code(e['key']), source_cell(e['source']),
               carried_cell(e['carries'])]


def transition_rows(region):
    for t in region.transitions:
        event = region.event_by_key[t['event']]
        yield [t['id'], ALT.join(keys_cell(a) for a in t['from']),
               u'%s（`%s`）' % (code(t['event']), event['id']),
               guard_cell(t['guard']), target_cell(t), effect_cell(t['effect']),
               cited(t['evidence'])]


# --- the diagram -------------------------------------------------------------
#
# ONE FIGURE, ONE BLOCK PER AXIS. A single diagram of every axis side by side
# came out about 1600px wide with labels a few pixels tall, so the figure is
# printed as one stateDiagram-v2 block per axis of the root, each under its own
# small heading, all inside the one figure caption.
#
# THE PICTURE IS FOLDED; table T-282 is the full truth. Two folds, both read
# off the manuscript mechanically and never by name:
#   - a GROUP is a set of at least MIN_GROUP sibling kinds that one transition
#     links pairwise in both directions (a full mesh), or that one transition
#     leaves for a single kind outside the set (a fan-in), or enters from a
#     single kind outside the set (a fan-out). The siblings are drawn inside
#     one composite state;
#   - a transition that meshes the group is drawn ONCE as a self-loop on the
#     composite, and a fan-in or fan-out is drawn once from or to the
#     composite. A note beside the composite names the meshing transitions.
# Two candidate groups that overlap without being equal are both left
# unfolded rather than choosing one. Arrow labels carry the row id only; the
# event, guard and effect are in table T-282.

MIN_GROUP = 3


def node(key):
    return key.replace('.', '_')


def containers(region, key):
    """The sections enclosing a state, outermost first: (parent, axis) for an
    axis of orthogonal kinds, (parent, None) for a single union of kinds."""
    out = []
    state = region.by_key[key]
    while state['parent'] is not None:
        rest = region.remainder(state)
        out.insert(0, (state['parent'], rest[0] if len(rest) == 2 else None))
        state = region.by_key[state['parent']]
    return out


def scope_of(region, source, target):
    """The innermost section holding both ends -- where mermaid needs the
    arrow written, or it draws a second copy of the state elsewhere."""
    common = None
    for a, b in zip(containers(region, source), containers(region, target)):
        if a != b:
            break
        common = a
    return common


def arrows(region):
    """{section: [(row id, source, target), ...]} and the undrawn rows.

    A transition from the root itself has no section to be drawn in, so it is
    listed instead of drawn. A conjunctive source is drawn from its key on the
    target's axis; a target naming a carried value is drawn to every kind it
    can name.
    """
    drawn = collections.OrderedDict()
    skipped = []
    for t in region.transitions:
        event = region.event_by_key[t['event']]
        pairs = []
        for alternative in t['from']:
            if t['to'] == 'self':
                pairs.extend((k, k) for k in alternative)
                continue
            for target in t['to']:
                ends = region.targets_of(target, event)
                axis = containers(region, ends[0])[:1]
                for source in alternative:
                    if containers(region, source)[:1] == axis:
                        pairs.extend((source, one) for one in ends
                                     if one != source or len(ends) == 1)
        pairs = [p for p in pairs if p[0] != region.root['key']]
        if not pairs:
            skipped.append(t['id'])
        for source, target in pairs:
            section = drawn.setdefault(scope_of(region, source, target), [])
            if (t['id'], source, target) not in section:
                section.append((t['id'], source, target))
    return drawn, skipped


def by_row(edges):
    rows = collections.OrderedDict()
    for row_id, source, target in edges:
        rows.setdefault(row_id, []).append((source, target))
    return rows


def fold_shape(pairs):
    """('mesh' | 'in' | 'out', the set, the outside kind) for one row, or None."""
    sources = set(s for s, _ in pairs)
    targets = set(t for _, t in pairs)
    if len(sources) >= MIN_GROUP and sources == targets:
        wanted = set((a, b) for a in sources for b in sources if a != b)
        if wanted <= set(pairs):
            return ('mesh', frozenset(sources), None)
    if len(sources) >= MIN_GROUP and len(targets) == 1 and not targets & sources:
        return ('in', frozenset(sources), next(iter(targets)))
    if len(targets) >= MIN_GROUP and len(sources) == 1 and not sources & targets:
        return ('out', frozenset(targets), next(iter(sources)))
    return None


def group_of(edges):
    """The one group this section folds, and how each row folds into it."""
    shapes = collections.OrderedDict()
    for row_id, pairs in by_row(edges).items():
        shape = fold_shape(pairs)
        if shape:
            shapes[row_id] = shape
    sets = set(shape[1] for shape in shapes.values())
    if len(sets) != 1:
        return None, {}
    return next(iter(sets)), shapes


def group_label(region, members, group):
    """What the composite is called: the kinds it leaves out, or those it holds."""
    outside = [s for s in members if s['key'] not in group]
    if len(outside) == 1:
        return u'%s 以外' % region.remainder(outside[0])[-1]
    return u' ・ '.join(region.remainder(s)[-1] for s in members if s['key'] in group)


def edge_lines(pad, edges):
    merged = collections.OrderedDict()
    for row_id, source, target in edges:
        merged.setdefault((source, target), []).append(row_id)
    return [pad + u'%s --> %s : %s' % (source, target, u', '.join(ids))
            for (source, target), ids in merged.items()]


def section_lines(region, members, section, drawn, indent):
    pad = u' ' * indent
    edges = drawn.get(section, [])
    group, shapes = group_of(edges)
    lines = []
    for s in members:
        if s['initial']:
            lines.append(pad + u'[*] --> %s' % node(s['key']))
    grouped = [s for s in members if group and s['key'] in group]
    for s in members:
        if s in grouped:
            continue
        lines.extend(state_lines(region, s, drawn, indent))
    out = []
    if grouped:
        box = node(section[0]) + u'_' + (section[1] or u'kinds') + u'_group'
        lines.append(pad + u'state "%s" as %s {' % (group_label(region, members, group), box))
        for s in grouped:
            lines.extend(state_lines(region, s, drawn, indent + 4))
        lines.append(pad + u'}')
        meshes = [r for r, shape in shapes.items() if shape[0] == 'mesh']
        for row_id, (kind, _members, other) in shapes.items():
            if kind == 'mesh':
                out.append((row_id, box, box))
            elif kind == 'in':
                out.append((row_id, box, node(other)))
            else:
                out.append((row_id, node(other), box))
        if meshes:
            lines.append(pad + u'note right of %s : %s は組のどの 2 つの間も結ぶ'
                         % (box, u' ・ '.join(meshes)))
    for row_id, source, target in edges:
        if row_id in shapes:
            continue
        out.append((row_id, node(source), node(target)))
    return lines + edge_lines(pad, out)


def state_lines(region, s, drawn, indent):
    pad = u' ' * indent
    lines = [pad + u'%s : %s' % (node(s['key']), region.remainder(s)[-1])]
    if s['key'] in region.axes or s['key'] in region.kinds:
        lines.append(pad + u'state %s {' % node(s['key']))
        lines.extend(composite_lines(region, s['key'], drawn, indent + 4))
        lines.append(pad + u'}')
    return lines


def composite_lines(region, parent, drawn, indent):
    """The body of one composite state: its concurrent axes, or its kinds."""
    lines = []
    if parent in region.axes:
        for number, (axis, members) in enumerate(region.axes[parent].items()):
            if number:
                lines.append(u' ' * indent + u'--')
            lines.extend(section_lines(region, members, (parent, axis), drawn, indent))
    elif parent in region.kinds:
        lines.extend(section_lines(region, region.kinds[parent], (parent, None),
                                   drawn, indent))
    return lines


def axis_block(region, axis, members, drawn):
    section = (region.root['key'], axis)
    body = section_lines(region, members, section, drawn, 4)
    # LR keeps a flat axis one row high; a nested or folded one reads narrower TB.
    nested = any(s['key'] in region.kinds or s['key'] in region.axes for s in members)
    folded = group_of(drawn.get(section, []))[0] is not None
    direction = u'TB' if nested or folded else u'LR'
    return [u'```mermaid', u'stateDiagram-v2', u'    direction %s' % direction] \
        + body + [u'```']


def figure(region):
    caption = region.raw['figure']
    transitions_table = region.raw['tables']['transitions']['id']
    drawn, skipped = arrows(region)
    root = region.root['key']
    lines = [u'**図 %s — %s**' % (caption['id'], text(caption['caption'])), u'']
    lines.append(u'軸ごとに 1 つの図に分けて示す。軸どうしは直交する。  ')
    lines.append(u'矢印のラベルは遷移の行 ID だけであり、出来事・ガード・副作用は 表 %s が持つ。  '
                 % transitions_table)
    lines.append(u'⚠️ 図は畳んである —— 同じ遷移が %d つ以上の兄弟の種類のどの 2 つの間も結ぶか、'
                 u'それらのどれからも同じ 1 つの種類へ出るか、同じ 1 つの種類から入るときは、'
                 u'兄弟を 1 つの箱に囲み、その遷移を箱から 1 本だけ描く（どの 2 つの間も結ぶ遷移は、'
                 u'箱の注に行 ID を書く）。  ' % MIN_GROUP)
    lines.append(u'⭐ 遷移の全数は 表 %s が持つ。' % transitions_table)
    if skipped:
        lines.append(u'')
        lines.append(u'根（`%s`）が元の遷移 %s は図に描かず、表 %s だけが持つ。'
                     % (root, JOIN.join(code(i) for i in skipped), transitions_table))
    for axis, members in region.axes.get(root, {}).items():
        lines += [u'', u'### %s の軸 `%s`' % (caption['id'], axis), u'']
        lines += axis_block(region, axis, members, drawn)
    return lines


# --- the document ------------------------------------------------------------

HEADER = [
    u'# 状態機械 — 状態・出来事・遷移',
    u'',
    u'**UID**: DOC-TBL-STATE-MACHINES',
    u'**Version**: 0.1',
    u'',
    u'> ⛔ 本書は生成物である。  ',
    u'> 手で直さない —— 直しても次の `npm run gen` で消える。',
    u'> **状態機械の唯一の正は `_source/state-machines.json` である。**  ',
    u'> 本書はそれを `_source/state_machines_json_to_md.py` が印字したものである。',
    u'> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`。',
    u'',
    u'本書は、保存しない状態の状態機械（`05-07-design.md` の 5.6 の ADR-002）を、領域ごとに印字したものである。  ',
    u'原稿が持つもの・持たないものは `05-07-design.md` の 表 T-250 が、状態機械の形は 表 T-249 が持つ。  ',
    u'キーの読み方は `05-07-design.md` の 5.5 が持つ。',
]


def build(regions):
    lines = list(HEADER)
    for region in regions:
        tables = region.raw['tables']
        lines += [u'', u'## %s（`%s`）' % (text(region.raw['name']), region.name), u'']
        lines += table(tables['states'],
                       [u'行 ID', u'キー', u'親', u'初期', u'運ぶ値', u'根拠'],
                       state_rows(region))
        lines.append(u'')
        lines += table(tables['events'],
                       [u'行 ID', u'キー', u'どこから来るか', u'運ぶ値'],
                       event_rows(region))
        lines.append(u'')
        lines += table(tables['transitions'],
                       [u'行 ID', u'元', u'出来事', u'ガード', u'先', u'副作用', u'根拠'],
                       transition_rows(region))
        lines.append(u'')
        lines += figure(region)
    return u'\n'.join(lines) + u'\n'


def main(argv):
    regions, found = load()
    if found:
        for one in found:
            say('PROBLEM  ' + one)
        say('FAIL     %s: %d problem(s); nothing written' % (os.path.basename(SRC), len(found)))
        return 1
    body = build(regions)
    if '--check' in argv:
        current = io.open(OUT, encoding='utf-8', newline='').read() \
            if os.path.exists(OUT) else None
        if current != body:
            say('FAIL     docs/spec/_assets/%s differs from %s -- run npm run gen'
                % (OUT_NAME, os.path.basename(SRC)))
            return 1
        say('OK       docs/spec/_assets/%s matches its manuscript' % OUT_NAME)
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    say('wrote    docs/spec/_assets/%s' % OUT_NAME)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
