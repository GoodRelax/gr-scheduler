"""Audit chapter 5 against itself and against components.json.

Everything here is a claim the chapter makes about a count or a correspondence.
Green means the claim matches what is actually written -- it does not mean the
design is right.  Run with PYTHONIOENCODING=utf-8.
"""
import json
import re
import sys

DESIGN = "docs/spec/05-07-design.md"
GLOSSARY = "docs/spec/_assets/tbl-glossary.md"
MODEL = "docs/spec/_assets/source/components.json"

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
check("T-062 rows (components)", len(cp), 38)
check("T-064 rows (public interfaces)", len(pi), 38)
check("T-065 rows (cross-layer interfaces)", len(iface), 9)
check("CP-n and PI-n are one to one",
      [c.replace("CP-", "") for c in cp], [p.replace("PI-", "") for p in pi])

for phrase, want in (("38 のフォルダ", 1), ("38 コンポーネント", 2), ("部品", 1)):
    check("phrase %r appears" % phrase, design.count(phrase), want)

# 部品 is forbidden (T-006b A-17); it may appear only where a rule names it
for doc, want in (("01-04-requirements", 1), ("A-appendix", 1)):
    check("%s names 部品 only where a rule does" % doc,
          open("docs/spec/%s.md" % doc, encoding="utf-8").read().count("部品"), want)
check("T-063 rows", len(ut), 7)

# SU-1 defines a component by its public entry.  The earlier wording -- "it
# publishes an interface outward" -- was false for 7 of the 34 (CP-25 publishes
# no member; CP-26..CP-31 only implement interfaces another component declares),
# so it was abandoned.  It must not grow back, in the design or in the record.
SPEC = ("01-04-requirements", "05-07-design", "08-10-test", "A-appendix")
check("T-074 SU-1 defines a component by its entry",
      design.count("フォルダの外へ見せる公開エントリを 1 つ持つもの"), 1)
check("the abandoned definition survives only in the record",
      {d: open("docs/spec/%s.md" % d, encoding="utf-8").read().count("外へインターフェースを公開")
       for d in SPEC},
      {"01-04-requirements": 0, "05-07-design": 0, "08-10-test": 0, "A-appendix": 1})

# the directory tree in 5.3 must hold one folder per component
tree = design[design.index("```text"):design.index("```", design.index("```text") + 5)]
folders = re.findall(r"([a-z0-9-]+)/", tree)
leaves = [f for f in folders if f not in
          ("src", "entity", "document-model", "layout-engine", "use-case",
           "adapter", "framework")]
check("directory tree leaf folders", len(leaves), 38)

# Agent API member count, asserted in three places in the design
api_rows = re.findall(r"^\| (AM-\d+) \|", glossary, re.M)
check("T-107 rows (Agent API members)", len(api_rows), 18)
check("design never says a stale member count",
      len(re.findall(r"1[0-7] [のメ]ンバ|17 メンバ", design)), 0)

print()
print("== components.json against table T-062 ==")
nodes = [n["name"] for n in model["nodes"]]
named = re.findall(r"^\| CP-\d+ \| `[^`]+` \| `([^`]+)` \|", design, re.M)
check("model nodes", len(nodes), 38)
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
             "BrowserClipboard", "CanvasRasterizer", "DomScreenSurface"}

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
print("== table T-075: the unit inventory ==")
PURITY = {"pure", "semi-pure-a", "semi-pure-b", "non-pure"}


def kebab(name):
    return re.sub(r"(?<!^)(?=[A-Z])", "-", name).lower()


check("T-075 rows (units)", len(rows_of("T-075")), 71)
unit_cells = re.findall(
    r"^\| UF-\d+ \| `([^`]+)` \| `([^`]+)` \| (.+?) \| (.+) \|$", design, re.M)
check("T-075 rows that parse into 4 cells", len(unit_cells), 71)
check("T-074 SU-3 states the unit count", design.count("**71。** 全数は 表 T-075"), 1)

files = [f for _, f, _, _ in unit_cells]
check("unit file names are unique", len(set(files)), len(files))

owners, purity_of = {}, {}
for comp, f, pur, _ in unit_cells:
    owners.setdefault(comp, []).append(f)
    purity_of[f] = set(re.findall(r"`([^`]+)`", pur)) or {pur.strip()}
check("T-075 covers every component", sorted(owners), sorted(nodes))

# every component owns the entry file named after its folder, and the folder
# is in the directory tree -- this is what ties T-075 to the tree in 5.3
no_entry = sorted(c for c in owners if kebab(c) + ".ts" not in owners[c])
print("  components missing their entry file  : %s" % (no_entry or "none"))
if no_entry:
    fails.append("component without its entry file")
check("T-075 components vs tree folders",
      sorted(kebab(c) for c in owners), sorted(leaves))

# T-063 records why a component was split, so each of its rows must be split
split = re.findall(r"^\| UT-\d+ \| `([^`]+)` \|", design, re.M)
unsplit = sorted(c for c in split if len(owners.get(c, [])) < 2)
print("  T-063 rows that T-075 shows as 1 unit: %s" % (unsplit or "none"))
if unsplit:
    fails.append("T-063 row is not split in T-075")

# each cross-layer interface of T-065 is a unit of the component declaring it
iface_rows = re.findall(r"^\| IF-\d+ \| `([^`]+)` \| `([^`]+)`", design, re.M)
check("T-065 rows that parse", len(iface_rows), 9)
iface_files = {kebab(n) + ".ts": d for n, d in iface_rows}
homeless = sorted(f for f, d in iface_files.items() if f not in owners.get(d, []))
print("  interfaces with no unit of their own : %s" % (homeless or "none"))
if homeless:
    fails.append("cross-layer interface without a unit")
check("interface units carry no purity",
      sorted(f for f in iface_files if purity_of.get(f) != {"—"}), [])

bad = sorted(f for f, p in purity_of.items()
             if f not in iface_files and not p <= PURITY)
print("  units with a purity outside the 4    : %s" % (bad or "none"))
if bad:
    fails.append("purity outside the four values")

# T-064 annotates members; T-075 annotates units.  Where a component's only
# code unit is its entry, every purity T-064 names must appear on that unit.
missed = []
for name, cell in member_cells:
    code = [f for f in owners.get(name, []) if f not in iface_files]
    if len(code) != 1:
        continue
    declared = {p for p in PURITY if "`%s`" % p in cell}
    if not declared <= purity_of[code[0]]:
        missed.append("%s: T-064 has %s, T-075 has %s"
                      % (name, sorted(declared), sorted(purity_of[code[0]])))
print("  purity T-064 names but T-075 drops   : %s" % (missed or "none"))
if missed:
    fails.append("purity dropped between T-064 and T-075")

# the changelog names the components holding more than two units.  That claim
# went stale once already, so derive it from T-075 and compare it exactly.
appendix = open("docs/spec/A-appendix.md", encoding="utf-8").read()
sentence = appendix[appendix.index("2 つより多いユニットを持つのは"):]
sentence = sentence[:sentence.index("。")]
check("changelog's >2-unit claim matches T-075",
      {n: int(c) for n, c in re.findall(r"`([A-Za-z]+)`（(\d+)）", sentence)},
      {c: len(u) for c, u in owners.items() if len(u) > 2})

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

# T-062's layer column must agree with components.json's clusters
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
