"""Count what actually reaches the published HTML.

Two things the 16 mechanical checks cannot see:
  - a table caption present in the markdown but absent from the render
  - a bold span emitted as literal asterisks (code spans excluded)
Run with PYTHONIOENCODING=utf-8.
"""
import re

HTML = "scratch/spec-html-probe/html/spec/%s.html"
DOCS = ["01-04-requirements", "05-07-design", "08-10-test", "A-appendix"]

total_literal = 0
for name in DOCS:
    page = open(HTML % name, encoding="utf-8").read()
    stripped = re.sub(r"<code>.*?</code>", "", page, flags=re.S)
    literal = re.findall(r"\*\*[^*\n]{1,80}\*\*", stripped)
    total_literal += len(literal)
    print("%-22s literal ** = %-3d  <table> = %d"
          % (name, len(literal), page.count("<table>")))
    for span in literal:
        print("      ", span[:74])

for name in ["01-04-requirements", "05-07-design"]:
    src = open("docs/spec/%s.md" % name, encoding="utf-8").read()
    page = open(HTML % name, encoding="utf-8").read()
    caps = re.findall(r"\*\*表 (T-[0-9a-z]+) —", src)
    missing = [c for c in caps if "表 %s —" % c not in page]
    figs = re.findall(r"\*\*図 (F-[0-9a-z]+) —", src)
    fmiss = [f for f in figs if "図 %s —" % f not in page]
    print("%-22s tables %d/%d  figures %d/%d  missing=%s%s"
          % (name, len(caps) - len(missing), len(caps),
             len(figs) - len(fmiss), len(figs), missing, fmiss))

print()
print("RESULT: %s" % ("PASS" if total_literal == 0 else "FAIL"))
