# -*- coding: utf-8 -*-
"""Draw who refers to whom between the JSON files of docs/spec/_source/.

Writes, from the references the manuscripts already hold (JDG-2692):
  docs/spec/_source/source-relations.json     the edge list (GENERATED)
  docs/spec/_source/fig-source-relations.drawio + _assets/.svg
      the STRUCTURED references -- a field whose whole value names a row, an
      entity, a column, a value shape or a component of another file -- and
      which generated JSON is written from which manuscript
and keeps in the edge list, without a figure, the PROSE references -- a row
id in a code span or a table number inside any string -- counted file to file
(--matrix prints them as a Markdown matrix).

One cluster per file; an edge leaves the referring file's cluster and lands
on the family it names (a row-id prefix, or erd.json's entity / column names).

The references are read by .claude/skills/spec-graph-check/source_refs.py,
the same reader check 83 (every reference resolves) and check 84 (a name
matches what it points at) use, so the picture and the checks cannot disagree
on what a reference is.

Run:
  npm run gen:relations          rebuild the edge list and the figure
  npm run gen:relations:check    exit 1 when source-relations.json is stale
  --no-figures                   rebuild the edge list only
  --png DIR                      also export the figure as PNG into DIR
  --matrix                       print the prose references as a matrix

⚠️ --check compares the edge list only. The figure needs Graphviz and the
draw.io desktop CLI, and are drawn FROM that list, so a current list with a
stale picture is possible; rebuild with npm run gen:relations after a change.
"""
import collections
import io
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
ASSETS = os.path.abspath(os.path.join(HERE, '..', '_assets'))
sys.path.insert(0, os.path.join(ROOT, '.claude', 'skills', 'spec-graph-check'))
import source_refs as sr  # noqa: E402

EDGES_JSON = os.path.join(HERE, 'source-relations.json')
SKILL = os.path.expanduser(os.path.join('~', '.claude', 'skills', 'drawio-uml',
                                        'scripts'))
# An installed executable: asked of the environment first, then where the
# Windows installer puts it (the same lookup as build.py).
DRAWIO = os.environ.get('DRAWIO_EXE') or shutil.which('draw.io') \
    or os.path.join(os.environ.get('ProgramFiles', ''), 'draw.io', 'draw.io.exe')

BANNER = [
    'GENERATED -- do not edit by hand. Your change is overwritten by the next '
    'rebuild.',
    'Written by docs/spec/_source/source_relations.py from the references the '
    'JSON manuscripts of docs/spec/_source/ hold (read by '
    '.claude/skills/spec-graph-check/source_refs.py).',
    'Rebuild: npm run gen:relations',
]
DRAWIO_MARK = ' '.join(BANNER)

# What a family of names is called in the picture.
NAME_FAMILY = {
    'entity': 'entity names',
    'column': 'column names',
    'node': 'component names',
    'schema': 'schema',
}
FIELD_ORDER = ('$schema',)

# The order of the files that other files name, left to right.
TARGET_ORDER = ['components.json', 'agent-api-members.json',
                'notice-reasons.json', 'property-items.json',
                'document-commands.json', 'erd.json', 'settings.json']
# The files named by files of the band above them, given a band of their own:
# side by side in one band, the edges between them ran straight through the
# boxes between (measured on the first drawings, 2026-10-17).
SINKS = ('erd.json', 'settings.json')

# Colours: manuscripts, generated JSON, hand-written Markdown.
COLOUR = {
    'manuscript': ('#1F6FB2', '#E3EEF8'),
    'generated': ('#7A7A7A', '#F0F0F0'),
    'markdown': ('#B36200', '#FFF0DD'),
}


def short(path):
    return path.rsplit('/', 1)[-1]


def family_of(ref):
    """The name family a reference lands on.

    A row of a JSON manuscript lands on its row-id prefix (`AT`, `S`, ...),
    so the picture says which part of the file is named. A row of the
    hand-written Markdown lands on the file as a whole: those files define
    dozens of prefixes, and one box per prefix buried the JSON relations
    (100 boxes, measured 2026-10-17).
    """
    if ref.kind in ('row', 'table', 'prose'):
        if not ref.target.endswith('.json'):
            return 'rows'
        return ref.token.split('-', 1)[0]
    return NAME_FAMILY[ref.kind]


def build_edges(root=ROOT):
    """The edge list, as plain data (sorted, so a rebuild is byte-stable)."""
    defs = sr.Definitions(root)
    refs = sr.references(defs, root)
    structured = collections.defaultdict(lambda: collections.Counter())
    prefixes = collections.defaultdict(set)
    prose = collections.Counter()
    unresolved = collections.Counter()
    for r in refs:
        if r.status != 'ok':
            unresolved[(r.source, r.field, r.token, r.status)] += 1
            continue
        if r.target == r.source or r.kind == 'schema':
            continue
        if r.kind == 'prose':
            prose[(r.source, r.target)] += 1
            continue
        structured[(r.source, r.target, family_of(r))][r.field] += 1
        if r.kind in ('row', 'table'):
            prefixes[(r.source, r.target, family_of(r))].add(
                r.token.split('-', 1)[0])
    defined = collections.defaultdict(collections.Counter)
    for rid, owners in defs.index.row_owner.items():
        home = defs.home(owners[0][1])
        defined[home][rid.split('-', 1)[0]] += 1
    schemas = {}
    for r in refs:
        if r.kind == 'schema' and r.status == 'ok':
            schemas[r.source] = r.target
    return {
        '$comment': BANNER,
        'manuscripts': [sr.SOURCE_DIR + '/' + m for m in sr.manuscripts(root)],
        'generated': [
            {'file': sr.SOURCE_DIR + '/' + g,
             'from': [sr.SOURCE_DIR + '/' + f for f in froms]}
            for g, froms in sorted(sr.GENERATED_JSON.items())],
        'schemas': [{'file': k, 'schema': v} for k, v in sorted(schemas.items())],
        'structured': [
            {'from': s, 'to': t, 'family': fam,
             'fields': dict(sorted(fields.items())),
             'prefixes': sorted(prefixes[(s, t, fam)]),
             'count': sum(fields.values())}
            for (s, t, fam), fields in sorted(structured.items())],
        'prose': [{'from': s, 'to': t, 'count': n}
                  for (s, t), n in sorted(prose.items())],
        'notResolved': [
            {'from': s, 'field': f, 'token': tok, 'status': st, 'count': n}
            for (s, f, tok, st), n in sorted(unresolved.items())],
        'definedRows': {k: dict(sorted(v.items()))
                        for k, v in sorted(defined.items())},
    }


def dumps(data):
    return json.dumps(data, ensure_ascii=False, indent=1) + '\n'


# -- the two drawio-uml models ------------------------------------------

def cluster_name(path):
    return 'c_' + re.sub(r'[^A-Za-z0-9]+', '_', short(path))


def structured_model(edges):
    """Clusters = files; nodes = the families another file names."""
    families = collections.defaultdict(set)         # file -> {family}
    for e in edges['structured']:
        families[e['to']].add(e['family'])
    generated = [g['file'] for g in edges['generated']]
    sources = {e['from'] for e in edges['structured']}
    for g in edges['generated']:
        sources.update(g['from'])
    targets = {e['to'] for e in edges['structured']}
    # A file that neither names nor is named by another file through a
    # structured field is left out of the picture; source-relations.json
    # still lists it under `manuscripts`.
    files = [f for f in edges['manuscripts'] if f in sources | targets]
    # Neighbours first: a file sits beside the files it names, so the edges
    # of the middle band stay short (an unlisted file keeps the name order).
    files.sort(key=lambda f: (TARGET_ORDER.index(short(f))
                              if short(f) in TARGET_ORDER else -1))
    files += generated
    files += sorted(t for t in targets if t not in files)
    nodes, layout_md, layout_src, layout_tgt, layout_gen = [], [], [], [], []
    layout_sink = []
    node_of = {}                                    # (file, family) -> name
    taken = set()

    def add_node(f, text):
        # drawio-uml prints a node's name, so the name IS the label; two
        # files naming the same text get the file appended.
        name = text if text not in taken else '%s [%s]' % (text, short(f))
        taken.add(name)
        nodes.append({'name': name, 'shape': 'box'})
        return name

    for f in files:
        kind = ('generated' if any(g['file'] == f for g in edges['generated'])
                else 'markdown' if not f.endswith('.json')
                else 'manuscript')
        rows = edges['definedRows'].get(f, {})
        members = []
        for fam in sorted(families.get(f, ())):
            if fam == 'rows':
                text = 'rows of ' + short(f)
            elif fam in rows:
                text = '%s- rows (%d)' % (fam, rows[fam])
            else:
                text = fam
            node_of[(f, fam)] = add_node(f, text)
            members.append(node_of[(f, fam)])
        if not members:
            # A file nothing names still gets a box, so its outgoing edges
            # have a cluster to leave from.
            own = ', '.join('%s-' % p for p in sorted(rows))
            if kind == 'generated':
                text = 'generated'
            else:
                text = 'defines ' + own if own else 'no rows of its own'
            members.append(add_node(f, text))
        stroke, fill = COLOUR[kind]
        cluster = {'name': cluster_name(f), 'label': short(f),
                   'color': stroke, 'fill': fill, 'direction': 'TB',
                   'nodes': members}
        if kind == 'manuscript' and short(f) in SINKS:
            layout_sink.append(cluster)
        elif kind == 'manuscript' and f in targets:
            layout_tgt.append(cluster)
        else:
            {'manuscript': layout_src, 'generated': layout_gen,
             'markdown': layout_md}[kind].append(cluster)
    model_edges = []
    for e in edges['structured']:
        label = ', '.join('%s %d' % kv for kv in e['fields'].items())
        model_edges.append({
            'source': cluster_name(e['from']),
            'target': node_of[(e['to'], e['family'])],
            'arrow': 'directed_association', 'label': label})
    for g in edges['generated']:
        for f in g['from']:
            model_edges.append({'source': cluster_name(f),
                                'target': cluster_name(g['file']),
                                'arrow': 'dependency', 'label': 'generates'})
    return {
        'title': 'docs/spec/_source -- structured references between files',
        'options': {'direction': 'TB', 'column_width': 220,
                    'node_separation': 0.5, 'rank_separation': 0.9},
        'nodes': nodes,
        'edges': model_edges,
        # Four bands, top down: the hand-written Markdown, the files that
        # only refer, the files referred to, and what those generate. The
        # referrers name the Markdown and the JSON alike, so they sit between
        # them; fewer edges then cross a band.
        # Each band is a labelled box so the legend names the colours.
        'layout': {'direction': 'TB', 'clusters': [
            dict(_band('markdown', 'hand-written Markdown of docs/spec'),
                 direction='LR', clusters=layout_md),
            dict(_band('manuscript', 'JSON manuscripts of docs/spec/_source'),
                 direction='TB', clusters=[
                     {'direction': 'LR', 'clusters': layout_src},
                     {'direction': 'LR', 'clusters': layout_tgt},
                     {'direction': 'LR', 'clusters': layout_sink}]),
            dict(_band('generated', 'generated JSON'),
                 direction='LR', clusters=layout_gen),
        ]},
    }


def _band(kind, label):
    stroke, fill = COLOUR[kind]
    return {'name': 'band_' + kind, 'label': label, 'color': stroke,
            'fill': fill}


def prose_matrix(edges):
    """The prose references as a Markdown matrix: row = the citing file,
    column = the file that defines the id, cell = how many ids.

    ⭐ A matrix, not a figure: drawn as a graph, the 68 file-to-file edges
    covered every box (measured 2026-10-17), and a count reads better in a
    cell than on a line.
    """
    froms = sorted({e['from'] for e in edges['prose']})
    tos = sorted({e['to'] for e in edges['prose']},
                 key=lambda t: (t.endswith('.json'), t))
    cell = {(e['from'], e['to']): e['count'] for e in edges['prose']}
    head = '| cites / defines | ' + ' | '.join(short(t) for t in tos) + ' |'
    lines = [head, '| --- |' + ' ---: |' * len(tos)]
    for f in froms:
        row = [str(cell[(f, t)]) if (f, t) in cell else '' for t in tos]
        lines.append('| %s | %s |' % (short(f), ' | '.join(row)))
    return '\n'.join(lines) + '\n'


# -- drawing -------------------------------------------------------------

def run(argv):
    done = subprocess.run(argv, capture_output=True, text=True)
    if done.returncode != 0:
        sys.exit('source_relations: %s failed\n%s%s'
                 % (os.path.basename(argv[0]), done.stdout, done.stderr))
    return done.stdout.strip()


def stamp_drawio(path):
    """The back-pointer as an attribute (an XML comment empties the export --
    build.py's stamp_drawio records the measurement)."""
    with io.open(path, encoding='utf-8') as handle:
        body = handle.read()
    if DRAWIO_MARK not in body:
        body = body.replace('<mxGraphModel ',
                            '<mxGraphModel generatedBy="%s" ' % DRAWIO_MARK, 1)
        with io.open(path, 'w', encoding='utf-8', newline='\n') as handle:
            handle.write(body)


def draw(model, stem, png_dir, scratch):
    model_path = os.path.join(scratch, stem + '.model.json')
    with io.open(model_path, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(dumps(model))
    drawio = os.path.join(HERE, stem + '.drawio')
    print('    ' + run([sys.executable, os.path.join(SKILL, 'draw.py'),
                        model_path, drawio]))
    stamp_drawio(drawio)
    if not os.path.exists(DRAWIO):
        print('NOT DRAWN %s.svg -- the draw.io CLI is not installed' % stem)
        return
    svg = os.path.join(ASSETS, stem + '.svg')
    run([DRAWIO, '-x', '-f', 'svg', '--embed-svg-fonts', 'false', '-b', '12',
         '-o', svg, drawio])
    if png_dir:
        run([DRAWIO, '-x', '-f', 'png', '-s', '1', '-b', '12',
             '-o', os.path.join(png_dir, stem + '.png'), drawio])


def main(argv):
    check = '--check' in argv
    edges = build_edges()
    if '--matrix' in argv:
        sys.stdout.write(prose_matrix(edges))
        return 0
    text = dumps(edges)
    if check:
        old = ''
        if os.path.exists(EDGES_JSON):
            old = io.open(EDGES_JSON, encoding='utf-8').read().replace('\r\n',
                                                                       '\n')
        if old != text:
            print('FAIL     docs/spec/_source/source-relations.json is stale -- '
                  'run npm run gen:relations')
            return 1
        print('OK       docs/spec/_source/source-relations.json matches the '
              'references (%d structured edges, %d prose edges)'
              % (len(edges['structured']), len(edges['prose'])))
        return 0
    with io.open(EDGES_JSON, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(text)
    print('wrote docs/spec/_source/source-relations.json')
    if '--no-figures' in argv:
        return 0
    png_dir = None
    if '--png' in argv:
        png_dir = os.path.abspath(argv[argv.index('--png') + 1])
        os.makedirs(png_dir, exist_ok=True)
    scratch = os.path.join(ROOT, 'scratch', 'source-relations')
    os.makedirs(scratch, exist_ok=True)
    draw(structured_model(edges), 'fig-source-relations', png_dir, scratch)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
