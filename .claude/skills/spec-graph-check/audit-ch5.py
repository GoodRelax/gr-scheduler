"""Audit chapter 5 against itself and against model.json.

Everything here is a claim the chapter makes about a count or a correspondence.
Green means the claim matches what is actually written -- it does not mean the
design is right.  Run with PYTHONIOENCODING=utf-8.
"""
import json
import re
import sys

DESIGN = "docs/spec/05-07-design.md"
GLOSSARY = "docs/spec/_assets/tbl-glossary.md"
MODEL = "docs/spec/_assets/source/model.json"

design = open(DESIGN, encoding="utf-8").read()
glossary = open(GLOSSARY, encoding="utf-8").read()
model = json.load(open(MODEL, encoding="utf-8"))

fails = []


def check(name, got, want):
    ok = got == want
    print("  %-52s %-18s %s" % (name, "%s vs %s" % (got, want), "OK" if ok else "MISMATCH"))
    if not ok:
        fails.append(name)


def rows_of(table_id):
    """Row-ID cells of the table with this caption, in order."""
    start = design.index("**表 %s —" % table_id)
    block = design[start:]
    end = block.find("\n\n**表 ", 10)
    block = block[:end] if end > 0 else block
    return re.findall(r"^\| ([A-Z]{2,3}-\d+[a-z]?) \|", block, re.M)


print("== counts the chapter asserts ==")
cp = rows_of("T-062")
pi = rows_of("T-064")
ut = rows_of("T-063")
iface = rows_of("T-065")
check("T-062 rows (components)", len(cp), 34)
check("T-064 rows (public interfaces)", len(pi), 34)
check("T-065 rows (cross-layer interfaces)", len(iface), 8)
check("CP-n and PI-n are one to one",
      [c.replace("CP-", "") for c in cp], [p.replace("PI-", "") for p in pi])

for phrase, want in (("34 のフォルダ", 1), ("34 コンポーネント", 2), ("部品", 1)):
    check("phrase %r appears" % phrase, design.count(phrase), want)

# 部品 is forbidden (T-006b A-17); it may appear only where a rule names it
for doc, want in (("01-04-requirements", 1), ("A-appendix", 1)):
    check("%s names 部品 only where a rule does" % doc,
          open("docs/spec/%s.md" % doc, encoding="utf-8").read().count("部品"), want)
check("T-063 rows", len(ut), 6)

# the directory tree in 5.3 must hold one folder per component
tree = design[design.index("```text"):design.index("```", design.index("```text") + 5)]
folders = re.findall(r"([a-z0-9-]+)/", tree)
leaves = [f for f in folders if f not in
          ("src", "entity", "document-model", "layout-engine", "use-case",
           "adapter", "framework")]
check("directory tree leaf folders", len(leaves), 34)

# Agent API member count, asserted in three places in the design
api_rows = re.findall(r"^\| (AM-\d+) \|", glossary, re.M)
check("T-107 rows (Agent API members)", len(api_rows), 18)
check("design never says a stale member count",
      len(re.findall(r"1[0-7] [のメ]ンバ|17 メンバ", design)), 0)

print()
print("== model.json against table T-062 ==")
nodes = [n["name"] for n in model["nodes"]]
named = re.findall(r"^\| CP-\d+ \| `[^`]+` \| `([^`]+)` \|", design, re.M)
check("model nodes", len(nodes), 34)
check("T-062 component names == model node names", sorted(named), sorted(nodes))

print()
print("== landing: every edge target declares a member ==")
# member cell of table T-064, per component
member_cells = re.findall(r"^\| PI-\d+ \| `[^`]+` \| `([^`]+)` \| (.+) \|$", design, re.M)
members = {name: re.findall(r"`([A-Za-z][A-Za-z0-9]*)`", cell)
           for name, cell in member_cells}
check("T-064 covers every component", sorted(members), sorted(nodes))

FRAMEWORK = {"SingleHtmlShell", "DomSvgSurface", "DomInputSource",
             "FileSystemAccessFileStore", "LocalStorageDocumentStore",
             "BrowserClipboard", "CanvasRasterizer"}

incoming = {}
for e in model["edges"]:
    incoming.setdefault(e["target"], []).append(e["source"])

no_member = [t for t in incoming if not members.get(t)]
print("  edge targets with no declared member : %s" % (no_member or "none"))
if no_member:
    fails.append("edge target without a member")

# PI-25 says the shell has no member other parts call
shell_in = incoming.get("SingleHtmlShell", [])
print("  edges pointing at SingleHtmlShell    : %s" % (shell_in or "none"))
if shell_in:
    fails.append("something calls the shell")

print()
print("== landing: every component with members is reached ==")
unreached = [n for n in nodes
             if members.get(n) and n not in incoming and n not in FRAMEWORK]
print("  components with members but no caller: %s" % (unreached or "none"))
if unreached:
    fails.append("unreached component")

print()
print("== layer rules ==")
layer = {}


def walk(cluster, outer):
    here = cluster.get("label", outer)
    for n in cluster.get("nodes", []):
        layer[n] = here
    for c in cluster.get("clusters", []):
        walk(c, here)


for top in model["layout"]["clusters"]:
    walk(top, None)
RANK = {"documentModel": 0, "layoutEngine": 1, "UseCase": 2, "Adapter": 3, "Framework": 4}
outward = ["%s -> %s" % (e["source"], e["target"]) for e in model["edges"]
           if RANK[layer[e["target"]]] > RANK[layer[e["source"]]]]
print("  LR-1 outward edges                   : %s" % (outward or "none"))
if outward:
    fails.append("outward edge")

# T-062's layer column must agree with model.json's clusters
declared = {name: lay for lay, name in
            re.findall(r"^\| CP-\d+ \| `([^`]+)` \| `([^`]+)` \|", design, re.M)}
bad_layer = ["%s: table=%s model=%s" % (n, declared.get(n), layer.get(n))
             for n in nodes if declared.get(n) != layer.get(n)]
print("  T-062 layer vs model cluster         : %s" % (bad_layer or "all agree"))
if bad_layer:
    fails.append("layer disagreement")

print()
print("RESULT: %s" % ("PASS" if not fails else "FAIL -- " + "; ".join(fails)))
sys.exit(0 if not fails else 1)
