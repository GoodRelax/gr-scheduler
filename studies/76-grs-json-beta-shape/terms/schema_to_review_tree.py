"""Render the GRS JSON final-review tree from the GRS JSON Schema.

GENERATED OUTPUT: grs-json-final-review-tree.md (from its first "### " heading on).
Inputs:
  grs-json-beta.schema.json        the keys, their order, the enumeration values,
                                   [M] (a description that starts "Same as MSPDI X")
  grs-json-beta-tree-labels-ja.tsv the Japanese column, one row per tree line
                                   (path<TAB>ja; a line starting with # is a comment). Paths:
                                     documentStamp.lastEditedBy.type     a key
                                     changeLogEntries[].changedAt        a key under an array
                                     documentStamp.lastEditedBy.type="user"   a string value
                                     ...predecessorLinks[].type=1        a number value
                                     ...lagFormat=35..44                 a run of number values on one line
                                     settings:documentSettings           the head line of a part
                                     Color.type                          a key of a shared type

Usage (run from any folder):
  python schema_to_review_tree.py ja-num   -> the tree, numbered R001.. (the published form)
  python schema_to_review_tree.py ja | en | en-num
  python schema_to_review_tree.py desc | desc-num -> the tree with the first English sentence of each
                                              key's description in place of the Japanese column
  python schema_to_review_tree.py japanese-num -> the Japanese version: each key with its Japanese name and,
                                              under it, the Japanese translation of its description
                                              (grs-json-beta-descriptions-ja.tsv, path<TAB>ja)
  python schema_to_review_tree.py english-num -> the tree in English only: each key with its whole
                                              English description (the owner's review of the descriptions)
  python schema_to_review_tree.py review-num -> the tree with the Japanese column and, under each key,
                                              its whole English description (the owner's review, JDG-3761)
  python schema_to_review_tree.py count    -> keys and values per part
  python schema_to_review_tree.py check    -> unified diff against grs-json-final-review-tree.md;
                                              also reports labels that no tree line uses.
                                              Exit code 1 when anything differs.
  python schema_to_review_tree.py write    -> rewrite grs-json-final-review-tree.md
                                              (keeps its hand-written head above the first "### ")

Rules that the tool derives from the schema:
  - A key is a node. An array key gets "[]" after the name; its children come from "items".
  - A "$ref" to a shared type (SHARED_TYPES) prints "-> Type" after the Japanese text and
    no children. Any other "$ref" is followed and its properties are shown in place.
  - A "$ref" into a property of a type ("#/$defs/X/properties/y") prints as the property it
    points at when that property is a shared type or an object (its keys are shown again), and
    otherwise as a leaf without children (enumeration values are listed once, where they live).
  - "allOf" whose first member is a shared-type "$ref" prints like that "$ref" (the later
    members only narrow values and do not show in the tree).
  - "enum" values become child lines. The values of a named value type (a $defs entry with an
    enum, used through "$ref", such as StandardUtcOffset) are not listed, nor the allowed amounts
    of a "number" key (an enum of numbers is a bound, not a set of names). A label path "key=A..B" folds the numbers A..B into one line.
  - [M] marks a key whose description starts "Same as MSPDI X". "(X)" follows when X differs
    from the key, ignoring case. [G] marks a key that is not [M] directly under an [M] key.
"""
import difflib
import io
import json
import os
import re
import sys
import textwrap
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA = os.path.join(HERE, 'grs-json-beta.schema.json')
LABELS = os.path.join(HERE, 'grs-json-beta-tree-labels-ja.tsv')
JA_DESCRIPTIONS = os.path.join(HERE, 'grs-json-beta-descriptions-ja.tsv')
TREE_MD = os.path.join(HERE, 'grs-json-final-review-tree.md')

ROOT_NAME = 'ScheduleDocument'
# Parts in print order: (id, title). The scheduleData parts split at SPLIT_KEY.
PARTS = [
    ('root', '根と帳簿'),
    ('settings', '文書設定'),
    ('mspdi', 'スケジュールデータ（頭の値と、MSPDI と往復する群）'),
    ('grs', 'スケジュールデータ（GRS だけが持つ配列）'),
    ('types', '共通の型（-> で指す物）'),
]
EN_TITLES = {
    'root': 'Root and records',
    'settings': 'Document settings',
    'mspdi': 'Schedule data (head values and the MSPDI part)',
    'grs': 'Schedule data (the GRS part)',
    'types': 'Shared types',
}
SPLIT_KEY = 'taskGroups'
SHARED_TYPES = [
    'Color', 'TaskGroupColor', 'Paint', 'Stroke', 'ShapeStyle',
    'ColumnFilter', 'ColumnSort', 'TaskTableWindow', 'ResourceTableWindow',
]
SEP = '\x00'  # splits the Japanese label from the English text in the review mode
MSPDI_RE = re.compile(r'^Same as MSPDI ([A-Za-z/]+)')


def first_sentence(text):
    """The first sentence of a description, without the opening 'Same as MSPDI X.' and 'Only when type is ...'."""
    text = re.sub(r'^Same as MSPDI [A-Za-z/]+\.\s*', '', text)
    text = re.sub(r'^(Write this key only|Only) when type is [^.]*\.\s*', '', text)
    if text.startswith('"'):
        return ''  # a list of values: the value lines below say it
    m = re.match(r'(.+?\.)(\s|$)', text)
    return m.group(1) if m else text


def wrap_text(text, limit):
    """Wrap by display width: English at spaces (limit = characters), Japanese anywhere (limit = wide characters)."""
    if not any(width(ch) == 2 for ch in text):
        return textwrap.wrap(text, limit)
    out, line = [], ''
    for ch in text:
        if width(line + ch) > limit * 2:
            out.append(line)
            line = ''
        line += ch
    if line:
        out.append(line)
    return out


def width(text):
    return sum(2 if unicodedata.east_asian_width(ch) in ('W', 'F') else 1 for ch in text)


class Walker:
    def __init__(self, schema, labels, desc_mode=False, ja_desc=None):
        self.schema = schema
        self.labels = labels
        self.desc_mode = desc_mode
        self.ja_desc = ja_desc or {}
        self.used = set()
        self.missing = []

    # ---- schema access -------------------------------------------------
    def pointer(self, ref):
        if not ref.startswith('#/'):
            sys.exit('only local $ref is supported: ' + ref)
        node = self.schema
        for token in ref[2:].split('/'):
            node = node[token.replace('~1', '/').replace('~0', '~')]
        return node

    @staticmethod
    def shared_name(ref):
        m = re.match(r'^#/\$defs/([A-Za-z]+)$', ref or '')
        if m and m.group(1) in SHARED_TYPES:
            return m.group(1)
        return None

    def classify(self, node):
        """Return (kind, payload): ('shared', name) | ('leaf', node) | ('node', resolved)."""
        if 'allOf' in node and node['allOf'] and self.shared_name(node['allOf'][0].get('$ref')):
            return 'shared', self.shared_name(node['allOf'][0]['$ref'])
        ref = node.get('$ref')
        if ref:
            name = self.shared_name(ref)
            if name:
                return 'shared', name
            target = self.pointer(ref)
            if '/properties/' in ref:
                kind, payload = self.classify(target)
                if kind == 'shared' or 'properties' in payload:
                    return kind, payload
                return 'leaf', target
            if 'enum' in target and 'properties' not in target:
                return 'leaf', target
            merged = dict(target)
            merged.update({k: v for k, v in node.items() if k != '$ref'})
            return self.classify(merged)
        return 'node', node

    # ---- labels --------------------------------------------------------
    def label(self, path):
        if self.desc_mode == 'en':
            return ''
        if path in self.labels:
            self.used.add(path)
            return self.labels[path]
        self.missing.append(path)
        return '(no label: ' + path + ')'

    # ---- walking -------------------------------------------------------
    def lines_for_key(self, key, node, path, depth, parent_mspdi, out, skip=None, only=None):
        """Append (depth, name, ja) for one key and its subtree."""
        is_array = node.get('type') == 'array' or 'items' in node
        desc = node.get('description', '')
        m = MSPDI_RE.match(desc)
        name = key + ('[]' if is_array else '')
        if m:
            name += ' [M]'
            if m.group(1).lower() != key.lower():
                name += ' (' + m.group(1) + ')'
        elif parent_mspdi:
            name += ' [G]'
        node_path = path + ('[]' if is_array else '')
        body = node['items'] if is_array else node
        kind, payload = self.classify(body)
        ja = self.label(node_path)
        full = desc or (payload.get('description', '') if isinstance(payload, dict) else '')
        if self.desc_mode == 'first':
            ja = first_sentence(full) or ja
        if self.desc_mode == 'en':
            ja = ('(type ' + payload + ') ' if kind == 'shared' else '') + full
        elif kind == 'shared':
            ja = ja + ('-> ' if ja.endswith('）') else ' -> ') + payload
        if self.desc_mode == 'full' and full:
            ja = ja + SEP + full
        if self.desc_mode == 'jadesc' and self.ja_desc.get(node_path):
            ja = ja + SEP + self.ja_desc[node_path]
        out.append((depth, name, ja))
        if kind == 'node':
            self.children(payload, node_path, depth + 1, bool(m), out, skip, only)

    def children(self, node, path, depth, is_mspdi, out, skip=None, only=None):
        props = node.get('properties', {})
        keys = list(props)
        if only == 'before':
            keys = keys[:keys.index(SPLIT_KEY)]
        elif only == 'after':
            keys = keys[keys.index(SPLIT_KEY):]
        for key in keys:
            child_path = (path + '.' if path else '') + key
            if skip and key in skip:
                text = props[key].get('title', '') if self.desc_mode == 'en' else self.label(child_path)
                out.append((depth, key, text))
                continue
            self.lines_for_key(key, props[key], child_path, depth, is_mspdi, out)
        if 'enum' in node and node.get('type') != 'number':
            self.values(node['enum'], path, depth, out)

    def values(self, values, path, depth, out):
        runs = {}
        for p in self.labels:
            if p.startswith(path + '=') and '..' in p[len(path) + 1:]:
                a, b = p[len(path) + 1:].split('..')
                runs[int(a)] = (int(b), p[len(path) + 1:])
        skip_until = None
        for v in values:
            if skip_until is not None and isinstance(v, int) and v <= skip_until:
                continue
            skip_until = None
            if isinstance(v, int) and v in runs:
                end, text = runs[v]
                out.append((depth, text, self.label(path + '=' + text)))
                skip_until = end
                continue
            text = json.dumps(v, ensure_ascii=False)
            out.append((depth, text, self.label(path + '=' + text)))

    # ---- parts ---------------------------------------------------------
    def part(self, pid):
        s = self.schema
        out = []
        en = self.desc_mode == 'en'
        if pid == 'root':
            out.append((0, ROOT_NAME, s.get('title', '') if en else self.label(ROOT_NAME)))
            self.children(s, '', 1, False, out, skip={'documentSettings', 'scheduleData'})
        elif pid == 'settings':
            prop = s['properties']['documentSettings']
            node = self.classify(prop)[1]
            out.append((0, 'documentSettings', prop.get('description', '') if en else self.label('settings:documentSettings')))
            self.children(node, 'documentSettings', 1, False, out)
        elif pid in ('mspdi', 'grs'):
            prop = s['properties']['scheduleData']
            node = self.classify(prop)[1]
            out.append((0, 'scheduleData', prop.get('description', '') if en else self.label(pid + ':scheduleData')))
            self.children(node, 'scheduleData', 1, False, out,
                          only='before' if pid == 'mspdi' else 'after')
        elif pid == 'types':
            for name in SHARED_TYPES:
                node = s['$defs'][name]
                out.append((0, name, node.get('description', '') if en else self.label(name)))
                if 'properties' in node:
                    self.children(node, name, 1, False, out)
        return out


def branches(nodes):
    out = []
    for i, (depth, _, _) in enumerate(nodes):
        prefix = ''
        for level in range(1, depth + 1):
            later = False
            for later_depth, _, _ in nodes[i + 1:]:
                if later_depth < level:
                    break
                if later_depth == level:
                    later = True
                    break
            if level == depth:
                prefix += '+- '
            else:
                prefix += '|  ' if later else '   '
        out.append(prefix)
    return out


def render(nodes, with_ja, start=None, wrap_ja=False, wrap_width=88):
    pre = branches(nodes)
    left = [p + n for p, (_, n, _) in zip(pre, nodes)]
    if start is not None:
        left = ['R%03d  %s' % (start + i, t) for i, t in enumerate(left)]
    if not with_ja:
        return '\n'.join(left)
    col = max(width(t) for t in left) + 2
    lines = []
    for t, (_, _, ja) in zip(left, nodes):
        ja, _, english = ja.partition(SEP)
        if wrap_ja:
            pieces = textwrap.wrap(ja, wrap_width) or ['']
            ja, english = pieces[0], ' '.join(pieces[1:])
        lines.append((t + ' ' * (col - width(t)) + ja).rstrip())
        for piece in wrap_text(english, wrap_width):
            lines.append(' ' * col + piece)
    return '\n'.join(lines)


def read_labels(path):
    labels = {}
    with io.open(path, encoding='utf-8') as f:
        header_seen = False
        for raw in f:
            raw = raw.rstrip('\r\n')
            if not raw or raw.startswith('#'):
                continue
            if not header_seen:
                header_seen = True
                continue
            key, _, ja = raw.partition('\t')
            if key in labels:
                sys.exit('duplicate label path: ' + key)
            labels[key] = ja
    return labels


def build(mode):
    with io.open(SCHEMA, encoding='utf-8') as f:
        schema = json.load(f)
    english = mode.startswith('english')
    japanese = mode.startswith('japanese')
    walker = Walker(schema, read_labels(LABELS),
                    desc_mode='first' if mode.startswith('desc') else 'full' if mode.startswith('review')
                    else 'en' if english else 'jadesc' if japanese else None,
                    ja_desc=read_labels(JA_DESCRIPTIONS) if japanese else None)
    parts = [(pid, EN_TITLES[pid] if english else title, walker.part(pid)) for pid, title in PARTS]
    if mode == 'count':
        lines = []
        for pid, _, nodes in parts:
            values = sum(1 for _, n, _ in nodes if n[:1] == '"' or n[:1].isdigit())
            lines.append('%s keys %d values %d' % (pid, len(nodes) - values, values))
        return '\n'.join(lines) + '\n', walker
    numbered = mode.endswith('-num')
    start = 1
    chunks = []
    for _, title, nodes in parts:
        chunks.append('### ' + title + '\n\n```text\n'
                      + render(nodes, mode.startswith(('ja', 'desc', 'review', 'english')), start if numbered else None,
                               wrap_width=44 if japanese else 88,
                               wrap_ja=english)
                      + '\n```\n\n')
        start += len(nodes)
    return ''.join(chunks), walker


def main(mode):
    if mode in ('check', 'write'):
        text, walker = build('ja-num')
        with io.open(TREE_MD, encoding='utf-8') as f:
            md = f.read()
        head_end = md.index('\n### ') + 1
        head, body = md[:head_end], md[head_end:]
        unused = sorted(set(walker.labels) - walker.used)
        if mode == 'write':
            with io.open(TREE_MD, 'w', encoding='utf-8', newline='\n') as f:
                f.write(head + text)
            print('wrote', TREE_MD)
        else:
            diff = list(difflib.unified_diff(body.splitlines(), text.splitlines(),
                                             'tree.md (now)', 'from schema', lineterm='', n=1))
            for line in diff:
                print(line)
            for p in walker.missing:
                print('missing label:', p)
            for p in unused:
                print('unused label:', p)
            same = not diff and not walker.missing and not unused
            print('same' if same else 'differs: %d diff lines, %d missing, %d unused'
                  % (len(diff), len(walker.missing), len(unused)))
            sys.exit(0 if same else 1)
        return
    text, walker = build(mode)
    sys.stdout.write(text)
    for p in walker.missing:
        sys.stderr.write('missing label: ' + p + '\n')


if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', newline='\n')
    main(sys.argv[1] if len(sys.argv) > 1 else 'ja')
