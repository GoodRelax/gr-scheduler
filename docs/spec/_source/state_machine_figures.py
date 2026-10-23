# -*- coding: utf-8 -*-
"""state-machines.json -> docs/spec/_assets/fig-sm-<machine>.svg, one per machine

The figure half of state_machines_json_to_md.py, which imports this module and
is the only thing that runs it: `npm run machines` prints the document and
then redraws the figures, `npm run machines:check` checks both. Nothing here
reads the manuscript -- it is handed the machines the ONE loader (`load()` of
the printer) validated.

ONE UML STATE MACHINE DIAGRAM PER MACHINE (JDG-2161, JDG-2363). Per machine a
drawio-uml model (`model_of`) is built from the manuscript alone:
  - an initial pseudo-state per union -- the top and every composite state;
  - a leaf state is a rounded box; a composite state is a solid rounded
    container holding its children and its own initial pseudo-state; an
    entry / exit effect is written inside the state's box;
  - the transitions between the same two ends are ONE arrow whose label holds
    one line per transition, `event [guard] / effect`; a guard is printed by
    NAME (`!name` for not, `in(state)` for a state term) -- the condition is
    in the region's guard list of the document;
  - a transition to itself is a self loop;
  - a `{name}` target goes through one choice pseudo-state per value name,
    with one branch `[name = kind]` per top-level kind but the initial one.

The model goes through the drawio-uml skill's draw.py (engine "dot") into a
.drawio in a temporary folder, three fixes study 57 needed are applied (label
newlines as `&#xa;`, composite boxes solid, no legend), and the draw.io CLI
exports the SVG. The SVG carries the generated-file banner and the model's
FINGERPRINT -- sha256 of the canonical JSON of the model and the box labels,
with RECIPE.

    --check   rebuilds every model and compares fingerprints; it never draws,
              so it needs neither draw.io nor Graphviz. A missing or stale SVG
              is a problem naming the machine.
    write     redraws only the machines whose SVG is missing or stale.

The figure is not the full truth: the machine's state transition table in
docs/spec/_assets/tbl-state-machines.md is, and both are printed from the
manuscript.
"""
import collections
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), '_assets')
SKILL = os.path.expanduser(os.path.join('~', '.claude', 'skills', 'drawio-uml', 'scripts'))
# An installed executable, asked of the environment first (as in build.py):
# a hard-coded absolute path names one machine, and this file is published.
DRAWIO = os.environ.get('DRAWIO_EXE') or shutil.which('draw.io') \
    or os.path.join(os.environ.get('ProgramFiles', ''), 'draw.io', 'draw.io.exe')

# Raise when the drawing changes without the model changing (a new fix below,
# other options), so every SVG reads as stale and is redrawn.
RECIPE = 1
OPTIONS = {'engine': 'dot', 'direction': 'TB', 'node_separation': 0.7, 'rank_separation': 0.7}

PLACEHOLDER = re.compile(r'^\{([a-z][A-Za-z0-9]*)\}$')
FINGERPRINT = re.compile(r'fingerprint sha256:([0-9a-f]{64})')
SVG_WIDTH = re.compile(r'\bwidth="(\d+)px"')
MIN_FIGURE_WIDTH_PX = 60
HEAD_CHARS = 1400

STATE_FILL, STATE_STROKE = '#FFFFFF', '#333333'
CHAR_PX = 7.4
LINE_PX = 18

BANNER = (u'<!-- Generated from docs/spec/_source/state-machines.json, the single source'
          u' of truth, by docs/spec/_source/state_machine_figures.py: the UML state'
          u' machine diagram of %s. Do not edit by hand. Rebuild: npm run machines'
          u' (part of npm run gen), on a machine with draw.io and Graphviz.'
          u' fingerprint sha256:%s -->\n')


def file_name(machine):
    return 'fig-sm-%s.svg' % machine.name


def link(machine):
    """The document's figure line for one machine."""
    return u'[![%s](%s)](%s)' % (machine.name, file_name(machine), file_name(machine))


# --- the model ---------------------------------------------------------------

def guard_label(guard):
    words = []
    for term in guard or []:
        if 'in' in term:
            words.append('in(%s)' % term['in'])
        else:
            words.append(('!' if term.get('not') else '') + term['name'])
    return ' && '.join(words)


def transition_label(event, branch):
    line = event
    if branch.get('guard'):
        line += ' [%s]' % guard_label(branch['guard'])
    if branch.get('effect'):
        line += ' / ' + branch['effect']
    return line


def moments(state):
    return ['%s / %s' % (moment, state[moment]['effect'])
            for moment in ('entry', 'exit') if moment in state]


def box_width(lines):
    return max(96, int(CHAR_PX * max(len(x) for x in lines)) + 30)


class Figure(object):
    """The drawio-uml model of one machine and the box labels to set after it
    is drawn (draw.py writes a node's name as its label)."""

    def __init__(self, machine):
        self.machine = machine
        self.composites = set(k for k in machine.children if k is not None)
        self.nodes = []
        self.values = collections.OrderedDict()   # node name -> label HTML
        self.arrows = collections.OrderedDict()   # (source, target) -> [line, ...]
        self.layout = self.union(None)
        self.add_cells()

    def ref(self, key):
        """A state key as an edge end: a composite is its cluster."""
        return 'c_' + key.replace('.', '_') if key in self.composites else key

    def arrow(self, source, target, line):
        lines = self.arrows.setdefault((source, target), [])
        if line is not None and line not in lines:
            lines.append(line)

    def node(self, name, shape, value, width=None, height=None):
        node = {'name': name, 'shape': shape}
        if shape in ('state', 'decision'):
            node.update({'fill': STATE_FILL, 'stroke': STATE_STROKE})
        if width:
            node.update({'width': width, 'height': height})
        self.nodes.append(node)
        if value is not None:
            self.values[name] = value

    def union(self, parent):
        """The cluster of one union: its initial pseudo-state, its leaves and
        its composite children, each composite a labelled cluster."""
        machine = self.machine
        initial = (parent + '.' if parent else '') + '__initial'
        self.node(initial, 'initial', None)
        leaves, inner = [initial], []
        for state in machine.children.get(parent, []):
            key = state['key']
            if state['initial']:
                self.arrow(initial, self.ref(key), None)
            if key in self.composites:
                child = self.union(key)
                child.update({'name': self.ref(key), 'color': STATE_STROKE,
                              'label': '\n'.join([machine.word(state)] + moments(state))})
                inner.append(child)
                continue
            lines = [machine.word(state)] + moments(state)
            self.node(key, 'state', '<br>'.join(['<b>%s</b>' % lines[0]] + lines[1:]),
                      box_width(lines), 40 + LINE_PX * (len(lines) - 1))
            leaves.append(key)
        if not inner:
            return {'nodes': leaves}
        return {'clusters': [{'nodes': leaves}] + inner}

    def add_cells(self):
        machine = self.machine
        choices = collections.OrderedDict()
        for event, key, branches in machine.cells():
            carried = machine.region.event_by_key[event]
            for branch in branches:
                hole = PLACEHOLDER.match(branch['to'])
                target = self.ref(branch['to'])
                if hole:
                    target = '__choice_' + hole.group(1)
                    choices[target] = (hole.group(1), machine.targets_of(branch['to'], carried))
                self.arrow(self.ref(key), target, transition_label(event, branch))
        top = self.layout['nodes'] if 'nodes' in self.layout else self.layout['clusters'][0]['nodes']
        for name, (value, kinds) in choices.items():
            self.node(name, 'decision', '', 34, 34)
            top.append(name)
            for kind in kinds:
                self.arrow(name, self.ref(kind), '[%s = %s]' % (value, kind))

    def model(self):
        edges = [dict({'source': s, 'target': t, 'arrow': 'transition'},
                      **({'label': '\n'.join(lines)} if lines else {}))
                 for (s, t), lines in self.arrows.items()]
        model = {'title': self.machine.name, 'options': OPTIONS,
                 'nodes': self.nodes, 'edges': edges}
        if 'clusters' in self.layout:
            model['layout'] = self.layout
        return model

    def fingerprint(self):
        canonical = json.dumps({'recipe': RECIPE, 'model': self.model(), 'values': self.values},
                               sort_keys=True, ensure_ascii=True, separators=(',', ':'))
        return hashlib.sha256(canonical.encode('ascii')).hexdigest()


# --- drawing -----------------------------------------------------------------
#
# ⛔ draw.io draws an edge label at the middle of the drawn edge, not where dot
# made room for it: the first drawing of treeStateMachine put a dozen labels on
# top of each other and of the arrows. So draw.py runs as a module, its one dot
# run is watched, and every label is moved to the centre dot gave it (`lp`), as
# a text box of its own. dot sizes the labels at LABEL_FONT, the size draw.io
# prints them at (draw.py asks dot for 9, which leaves too little room).

LEGEND = re.compile(r'<mxCell id="legend".*?</mxCell>', re.S)
EDGE_FONT = 'edge [fontname="Helvetica", fontsize=9]'
LABEL_FONT = 11
LABEL_STYLE = ('text;html=1;align=center;verticalAlign=middle;resizable=0;'
               'fontSize=%d;fontColor=#222222;labelBackgroundColor=#FFFFFF;' % LABEL_FONT)
LABEL_CHAR_PX = 6.2
LABEL_LINE_PX = 14


def node_id(name):
    """draw.py's id for a node (its make_nid)."""
    return 'n_' + re.sub(r'[^0-9A-Za-z_]', '_', name)


def html_attribute(value):
    return value.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;') \
        .replace('"', '&quot;')


def skill_module():
    import importlib.util
    spec = importlib.util.spec_from_file_location('drawio_uml_draw',
                                                  os.path.join(SKILL, 'draw.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class WatchedDot(object):
    """Stands in for draw.py's `subprocess`: dot sizes labels at LABEL_FONT,
    and its -Tjson answer is kept."""

    def __init__(self):
        self.layout = None

    def run(self, argv, **kwargs):
        if list(argv[:2]) == ['dot', '-Tjson']:
            if EDGE_FONT not in kwargs.get('input', ''):
                raise RuntimeError('draw.py no longer asks dot for %s' % EDGE_FONT)
            kwargs['input'] = kwargs['input'].replace(
                EDGE_FONT, EDGE_FONT.replace('fontsize=9', 'fontsize=%d' % LABEL_FONT))
            result = subprocess.run(argv, **kwargs)
            self.layout = json.loads(result.stdout)
            return result
        return subprocess.run(argv, **kwargs)


def rendered(figure):
    """(the .drawio XML draw.py writes, dot's -Tjson layout)."""
    module = skill_module()
    watched = WatchedDot()
    module.subprocess = watched
    try:
        xml = module.render_model(figure.model())[0]
    except SystemExit as e:
        raise RuntimeError('draw.py refused the model: %s' % e)
    if watched.layout is None:
        raise RuntimeError('draw.py ran no dot layout')
    return xml, watched.layout


def shift(drawio, layout):
    """(dx, dy, height): from dot's y-up points to the .drawio's pixels, read
    off one node both hold."""
    height = float(layout['bb'].split(',')[3])
    for one in layout.get('objects', []):
        if 'pos' not in one:
            continue
        found = re.search(r'<mxCell id="%s" [^>]*><mxGeometry x="(-?\d+)" y="(-?\d+)"'
                          % re.escape(one['name']), drawio)
        if found:
            cx, cy = (float(v) for v in one['pos'].split(','))
            w, h = float(one['width']) * 72.0, float(one['height']) * 72.0
            return (float(found.group(1)) - (cx - w / 2.0),
                    float(found.group(2)) - (height - cy - h / 2.0), height)
    raise RuntimeError('no node of the dot layout is in the .drawio')


def placed_labels(drawio, figure, layout):
    """Every edge label moved to a text box of its own at dot's label centre.
    dot keeps the order of the edges it was given and leaves some out (a self
    loop on a composite), so the labels are matched in order, by text."""
    dx, dy, height = shift(drawio, layout)
    laid = [e for e in layout.get('edges', []) if e.get('label') and e.get('lp')]
    at = 0
    boxes = []
    for index, edge in enumerate(figure.model()['edges']):
        label = edge.get('label')
        if not label or at >= len(laid) or laid[at]['label'] != label:
            continue
        x, y = (float(v) for v in laid[at]['lp'].split(','))
        at += 1
        lines = label.split('\n')
        w = int(LABEL_CHAR_PX * max(len(line) for line in lines)) + 8
        h = LABEL_LINE_PX * len(lines) + 4
        cell = '<mxCell id="edge%d" value="' % index
        drawio = drawio.replace(cell + html_attribute(label) + '"', cell + '"', 1)
        boxes.append('<mxCell id="edge%d-label" value="%s" style="%s" vertex="1" parent="1">'
                     '<mxGeometry x="%d" y="%d" width="%d" height="%d" as="geometry"/></mxCell>'
                     % (index, html_attribute(label), LABEL_STYLE,
                        round(x + dx - w / 2.0), round(height - y + dy - h / 2.0), w, h))
    return drawio.replace('</root>', ''.join(boxes) + '</root>', 1)


def fixed(drawio, figure, layout):
    """The labels where dot put them, the three fixes of study 57 and each
    box's own label."""
    drawio = placed_labels(drawio.replace('\r\n', '\n'), figure, layout)
    drawio = drawio.replace('\n', '&#xa;')
    drawio = LEGEND.sub('', drawio)
    drawio = re.sub(r'rounded=1;arcSize=3;fillColor=none;strokeColor=([^;]+);dashed=1;'
                    r'dashPattern=8 4;strokeWidth=2;',
                    r'rounded=1;absoluteArcSize=1;arcSize=24;fillColor=none;strokeColor=\1;'
                    r'strokeWidth=1.5;', drawio)
    for name, value in figure.values.items():
        drawio = re.sub(r'(<mxCell id="%s" value=")[^"]*"' % re.escape(node_id(name)),
                        lambda m: m.group(1) + html_attribute(value) + '"', drawio, count=1)
    return drawio


def run(argv):
    result = subprocess.run(argv, capture_output=True, text=True, encoding='utf-8',
                            errors='replace')
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout).strip())


def stamped(svg, figure, fingerprint):
    """The exported SVG with the banner after its prolog, in LF."""
    svg = svg.replace('\r\n', '\n')
    found = SVG_WIDTH.search(svg[:4096])
    if not found or int(found.group(1)) < MIN_FIGURE_WIDTH_PX:
        raise RuntimeError('draw.io rendered nothing (the SVG is a stub) and still exited 0')
    at = svg.index('<svg')
    return svg[:at] + BANNER % (figure.machine.name, fingerprint) + svg[at:]


def draw(figure, fingerprint, scratch):
    stem = os.path.join(scratch, figure.machine.name)
    xml, layout = rendered(figure)
    io.open(stem + '.drawio', 'w', encoding='utf-8', newline='\n').write(
        fixed(xml, figure, layout))
    # No -e (the editable XML is not embedded) and no embedded fonts, which
    # would raster every label (build.py measured 578 KB against 57 KB).
    run([DRAWIO, '-x', '--embed-svg-fonts', 'false', '-f', 'svg', '-b', '12',
         '-o', stem + '.svg', stem + '.drawio'])
    svg = io.open(stem + '.svg', encoding='utf-8').read()
    io.open(os.path.join(ASSETS, file_name(figure.machine)), 'w', encoding='utf-8',
            newline='\n').write(stamped(svg, figure, fingerprint))


def drawn_fingerprint(machine):
    path = os.path.join(ASSETS, file_name(machine))
    if not os.path.exists(path):
        return None
    found = FINGERPRINT.search(io.open(path, encoding='utf-8').read(HEAD_CHARS))
    return found.group(1) if found else ''


def stale(regions):
    """[(figure, fingerprint, why)] for every machine whose SVG is missing or
    was drawn from another model."""
    out = []
    for region in regions:
        for machine in region.machines:
            figure = Figure(machine)
            want = figure.fingerprint()
            have = drawn_fingerprint(machine)
            if have != want:
                out.append((figure, want, 'is missing' if have is None else 'is stale'))
    return out


def missing_tools():
    lacking = [what for what, there in (
        ('the drawio-uml skill', os.path.exists(os.path.join(SKILL, 'draw.py'))),
        ('Graphviz', shutil.which('dot') is not None),
        ('draw.io', os.path.exists(DRAWIO)))
        if not there]
    return ' and '.join(lacking)


def check(regions):
    """Problems for --check: never draws."""
    return ['docs/spec/_assets/%s %s -- run npm run machines on a machine with draw.io'
            ' and Graphviz to redraw %s' % (file_name(f.machine), why, f.machine.name)
            for f, _want, why in stale(regions)]


def redraw(regions):
    """(drawn names, problems, seconds): redraw the stale and missing figures."""
    todo = stale(regions)
    if not todo:
        return [], [], 0.0
    lacking = missing_tools()
    if lacking:
        return [], ['docs/spec/_assets/%s %s, and %s is not installed here -- redraw it'
                    ' on a machine with draw.io and Graphviz'
                    % (file_name(f.machine), why, lacking) for f, _w, why in todo], 0.0
    started = time.time()
    drawn, problems = [], []
    with tempfile.TemporaryDirectory() as scratch:
        for figure, want, _why in todo:
            try:
                draw(figure, want, scratch)
                drawn.append(figure.machine.name)
            except (RuntimeError, OSError) as e:
                problems.append('%s: %s' % (file_name(figure.machine), e))
    return drawn, problems, time.time() - started
