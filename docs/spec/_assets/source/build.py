#!/usr/bin/env python
"""Build every component figure and the component table from model.json.

model.json is the single source of truth. It holds ONLY node-level edges.

The overview figure is DERIVED, never hand-written: each node-level edge is
collapsed onto the innermost labelled cluster of its endpoints, and every
collapsed edge must be backed by at least one real node-level edge. An arrow
that nothing supports cannot be drawn, and a backed pair with no label stops
the build. That is what keeps the overview honest without a second source.

Cluster-level edges are deliberately kept OUT of model.json: a view keeps
every edge whose endpoints survive, so a cluster edge would leak into every
view that spans those layers and collide with the node-level labels.

Usage:  python docs/spec/_assets/source/build.py
"""

import json
import math
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "model.json")
OVERVIEW = os.path.join(HERE, "overview.json")
# The .svg is what the specification carries, so it lands one level up, in the
# asset folder itself. The .drawio stay here beside model.json as working files.
ASSETS = os.path.abspath(os.path.join(HERE, ".."))
# components.md must NOT live under _assets/: StrictDoc parses every .md below
# the input folder as a document, but specindex.discover() only lists
# docs/spec and docs/spec/_assets without recursing -- the table would ship in
# the export while no mechanical check ever read it.
TABLE = os.path.abspath(os.path.join(HERE, "..", "..", "..",
                                     "review", "components", "components.md"))
SKILL = os.path.expanduser(r"~\.claude\skills\drawio-uml\scripts")
DRAWIO = r"C:\Program Files\draw.io\draw.io.exe"

# The only hand-written part: what each collapsed arrow means. Every entry must
# be backed by node-level edges in model.json, and every backed pair must have
# an entry -- both directions are asserted below.
CLUSTER_EDGE_LABELS = {
    ("framework", "adapter"): "drives / implements",
    ("framework", "usecase"): "candidates",
    ("framework", "layoutEngine"): "layout once per frame",
    ("adapter", "usecase"): "one operation",
    ("adapter", "layoutEngine"): "geometry only",
    ("adapter", "documentModel"): "converts",
    ("usecase", "documentModel"): "updates",
    ("usecase", "layoutEngine"): "calculates",
    ("layoutEngine", "documentModel"): "reads",
}


def labelled_cluster_of(layout):
    """Map every node name to the innermost labelled cluster that holds it."""
    owner = {}

    def walk(cluster, nearest):
        here = cluster.get("name") if "label" in cluster else nearest
        for child in cluster.get("clusters", []):
            walk(child, here)
        for name in cluster.get("nodes", []):
            owner[name] = here

    walk(layout, None)
    return owner


def collapse(model):
    """Collapse node-level edges onto cluster pairs, with their backing counts."""
    owner = labelled_cluster_of(model["layout"])
    missing = sorted(n["name"] for n in model["nodes"] if owner.get(n["name"]) is None)
    if missing:
        sys.exit("build: node(s) outside every labelled cluster: %s" % ", ".join(missing))
    backing = {}
    for edge in model["edges"]:
        pair = (owner[edge["source"]], owner[edge["target"]])
        if pair[0] == pair[1]:
            continue
        backing.setdefault(pair, []).append("%s -> %s" % (edge["source"], edge["target"]))
    return backing


def build_overview(model, backing):
    unlabelled = sorted(backing.keys() - CLUSTER_EDGE_LABELS.keys())
    unbacked = sorted(CLUSTER_EDGE_LABELS.keys() - backing.keys())
    if unlabelled:
        sys.exit("build: cluster pair(s) with no label: %s"
                 % ", ".join("%s -> %s" % p for p in unlabelled))
    if unbacked:
        sys.exit("build: label(s) with no backing edge in model.json: %s"
                 % ", ".join("%s -> %s" % p for p in unbacked))
    edges = [{"source": src, "target": dst, "arrow": "dependency",
              "label": CLUSTER_EDGE_LABELS[(src, dst)],
              "description": "backed by %d component edge(s): %s"
                             % (len(backing[(src, dst)]), "; ".join(backing[(src, dst)]))}
             for (src, dst) in sorted(backing, key=lambda p: sorted(CLUSTER_EDGE_LABELS).index(p))]
    overview = {"title": model["title"] + " by layer",
                "options": dict(model["options"], node_separation=0.5, rank_separation=3.0),
                "nodes": model["nodes"],
                "edges": edges,
                "layout": model["layout"]}
    with open(OVERVIEW, "w", encoding="utf-8") as handle:
        json.dump(overview, handle, ensure_ascii=False, indent=1)
    return edges



# ------------------------------------------------------ edge label placement
# draw.io draws an edge label at the midpoint of its edge. In the overview every
# arrow runs down one corridor, so a midpoint can land inside a component box in
# a band the arrow only passes through, and the label's white background hides
# the box's name. Moving the label along its own edge keeps every layer
# dependency in the picture; dropping the arrow would not. Widening the gaps does
# not help -- the midpoint stays on the corridor.
LABEL_FRACTIONS = (0.50, 0.60, 0.40, 0.68, 0.32, 0.76, 0.24, 0.84, 0.16)
LABEL_STYLE = ("edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;"
               "points=[];labelBackgroundColor=#FFFFFF;fontSize=11;fontColor=#222222;")
LABEL_MARGIN = 6
CELL_RE = re.compile(
    r'<mxCell id="([^"]+)" value="([^"]*)"[^>]*vertex="1"[^>]*>\s*'
    r'<mxGeometry x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"')
EDGE_RE = re.compile(
    r'<mxCell id="(edge\d+)" value="([^"]*)"([^>]*?)source="([^"]+)" target="([^"]+)">(.*?)</mxCell>',
    re.S)


def _point_at(path, fraction):
    """The point `fraction` of the way along a polyline."""
    total = sum(math.dist(path[i], path[i + 1]) for i in range(len(path) - 1))
    want, walked = total * fraction, 0.0
    for i in range(len(path) - 1):
        step = math.dist(path[i], path[i + 1])
        if step and walked + step >= want:
            ratio = (want - walked) / step
            return (path[i][0] + (path[i + 1][0] - path[i][0]) * ratio,
                    path[i][1] + (path[i + 1][1] - path[i][1]) * ratio)
        walked += step
    return path[-1]


def place_labels(drawio_path):
    """Move every edge label clear of the node boxes. Stop the build if one cannot be."""
    text = open(drawio_path, encoding="utf-8").read()
    geom = {m.group(1): tuple(map(float, m.groups()[2:])) for m in CELL_RE.finditer(text)}
    boxes = [geom[i] for i in geom if i.startswith("n_")]

    def centre(cell_id):
        x, y, w, h = geom[cell_id]
        return (x + w / 2, y + h / 2)

    def clear_of_boxes(point):
        return not any(x - LABEL_MARGIN <= point[0] <= x + w + LABEL_MARGIN
                       and y - LABEL_MARGIN <= point[1] <= y + h + LABEL_MARGIN
                       for x, y, w, h in boxes)

    moved, stuck = [], []
    for match in list(EDGE_RE.finditer(text)):
        eid, label, rest, src, dst, body = match.groups()
        if not label:
            continue
        waypoints = [(float(a), float(b))
                     for a, b in re.findall(r'<mxPoint x="([-\d.]+)" y="([-\d.]+)"/>', body)]
        path = [centre(src)] + waypoints + [centre(dst)]
        chosen = next((f for f in LABEL_FRACTIONS if clear_of_boxes(_point_at(path, f))), None)
        if chosen is None:
            stuck.append(label)
            continue
        if chosen == LABEL_FRACTIONS[0]:
            continue                                    # the midpoint is already clear
        cell = ('<mxCell id="%s-label" value="%s" style="%s" vertex="1" connectable="0" '
                'parent="%s"><mxGeometry x="%.3f" relative="1" as="geometry">'
                '<mxPoint as="offset"/></mxGeometry></mxCell>'
                % (eid, label, LABEL_STYLE, eid, 2 * chosen - 1))
        original = match.group(0)
        text = text.replace(original,
                            original.replace('value="%s"' % label, 'value=""', 1) + cell, 1)
        moved.append((label, chosen))

    if stuck:
        sys.exit("build: no clear position for edge label(s): %s" % ", ".join(stuck))
    if moved:
        open(drawio_path, "w", encoding="utf-8").write(text)
        print("    labels moved clear of the boxes: "
              + ", ".join("%s@%.2f" % m for m in moved))


def run(argv):
    print("  " + " ".join(os.path.basename(a) for a in argv[1:]))
    result = subprocess.run(argv, capture_output=True, text=True)
    if result.returncode:
        sys.exit((result.stderr or result.stdout).strip())
    return result.stdout.strip()


def draw(model_path, out_stem, view=None):
    argv = [sys.executable, os.path.join(SKILL, "draw.py"), model_path, out_stem + ".drawio"]
    if view:
        argv += ["--view", view]
    print("    " + run(argv))
    place_labels(out_stem + ".drawio")
    if os.path.exists(DRAWIO):
        stem = os.path.basename(out_stem)
        # Only the .svg is produced. To eyeball a figure as a raster, run the
        # draw.io CLI by hand:
        #   drawio -x -f png -b 12 -o out.png docs/spec/_assets/source/<stem>.drawio
        for fmt, where in (("svg", os.path.join(ASSETS, stem)),):
            # No -e: the editable XML is not embedded. model.json is the source,
            # so nothing is ever re-opened from the picture.
            argv = [DRAWIO, "-x", "-f", fmt, "-b", "12",
                    "-o", "%s.%s" % (where, fmt), out_stem + ".drawio"]
            if fmt == "svg":
                # Embedded fonts make draw.io raster every label into a base64
                # <image> fallback: 578 KB instead of 57 KB for the same picture.
                argv[1:1] = ["--embed-svg-fonts", "false"]
            run(argv)


def main():
    with open(MODEL, encoding="utf-8") as handle:
        model = json.load(handle)

    stray = [e for e in model["edges"]
             if e["source"] not in {n["name"] for n in model["nodes"]}
             or e["target"] not in {n["name"] for n in model["nodes"]}]
    if stray:
        sys.exit("build: model.json must hold node-level edges only; found %d cluster edge(s)"
                 % len(stray))

    backing = collapse(model)
    edges = build_overview(model, backing)
    print("overview: %d cluster edges, each backed by component edges" % len(edges))
    for src, dst in sorted(backing):
        print("  %-14s -> %-14s  %d" % (src, dst, len(backing[(src, dst)])))

    print("figures:")
    draw(OVERVIEW, os.path.join(HERE, "fig-components"))
    for key in model.get("views", {}):
        draw(MODEL, os.path.join(HERE, "view-" + key), view=key)

    print("table:")
    print("    " + run([sys.executable, os.path.join(SKILL, "table.py"),
                        MODEL, TABLE]))


if __name__ == "__main__":
    main()
