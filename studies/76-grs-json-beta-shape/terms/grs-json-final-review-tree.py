"""Render the GRS JSON final-review tree from its indented source.

Source: grs-json-final-review-tree.src.txt, one node per line,
two spaces of indent per level, "name<TAB>japanese". A line
"# part <id><TAB><title>" starts a part. Values of an enumeration are
written as nodes whose name starts with a double quote or a digit.

  python grs-json-final-review-tree.py ja      -> tree with Japanese column
  python grs-json-final-review-tree.py en      -> English names only
  python grs-json-final-review-tree.py count   -> key and value counts per part
Add -num (ja-num, en-num) to number every line R001, R002, ... across the parts.
Output goes to stdout as Markdown with one text block per part.
"""
import io
import os
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))


def width(text):
    return sum(2 if unicodedata.east_asian_width(ch) in ('W', 'F') else 1 for ch in text)


def read_parts(path):
    parts = []
    with io.open(path, encoding='utf-8') as f:
        for raw in f:
            raw = raw.rstrip('\r\n')
            if not raw.strip():
                continue
            if raw.startswith('# part '):
                pid, title = raw[len('# part '):].split('\t')
                parts.append({'id': pid, 'title': title, 'nodes': []})
                continue
            indent = len(raw) - len(raw.lstrip(' '))
            if indent % 2:
                sys.exit('odd indent: ' + raw)
            name, _, ja = raw.strip().partition('\t')
            parts[-1]['nodes'].append((indent // 2, name, ja))
    return parts


def is_value(name):
    return name[:1] == '"' or name[:1].isdigit()


def branches(nodes):
    """Return the ASCII tree prefix for every node."""
    out = []
    for i, (depth, _, _) in enumerate(nodes):
        prefix = ''
        for level in range(1, depth + 1):
            # does an ancestor at this level (or this node, at the last level) have a later sibling?
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


def render(part, with_ja, start=None):
    nodes = part['nodes']
    pre = branches(nodes)
    left = [p + n for p, (_, n, _) in zip(pre, nodes)]
    if start is not None:
        left = ['R%03d  %s' % (start + i, t) for i, t in enumerate(left)]
    if not with_ja:
        return '\n'.join(left)
    col = max(width(t) for t in left) + 2
    return '\n'.join((t + ' ' * (col - width(t)) + ja).rstrip() for t, (_, _, ja) in zip(left, nodes))


def main(mode):
    parts = read_parts(os.path.join(HERE, 'grs-json-final-review-tree.src.txt'))
    if mode == 'count':
        for p in parts:
            values = sum(1 for _, n, _ in p['nodes'] if is_value(n))
            print(p['id'], 'keys', len(p['nodes']) - values, 'values', values)
        return
    numbered = mode.endswith('-num')
    start = 1
    for p in parts:
        print('### ' + p['title'] + '\n')
        print('```text')
        print(render(p, mode.startswith('ja'), start if numbered else None))
        print('```\n')
        start += len(p['nodes'])


if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', newline='\n')
    main(sys.argv[1] if len(sys.argv) > 1 else 'ja')
