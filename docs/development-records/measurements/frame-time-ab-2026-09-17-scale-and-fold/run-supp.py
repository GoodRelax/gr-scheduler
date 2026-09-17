"""Supplementary run: stage 0, head at displayScale 100 (as opened), head at displayScale 200 (ratio 1.0).

Usage: python run-supp.py <variants-dir> <out-dir> <runs> <stage0-tree> <head-tree> [<probe>,<probe> [<file-prefix>]]

The variants come from make-scaled-variants.py. Probes per run: first-notch, then lm-19 (default),
or the comma list given (zoom-row-axis was run second, with prefix "suppz").
Order rotates by one every run (run 1: stage0 s100 s200, run 2: s100 s200 stage0, run 3: s200 stage0 s100).
Raw stdout JSON is saved as supp<i>-<probe>-<label>.json; summary goes to supp-summary.txt through
run-ab.py's own table code.
"""
import importlib.util
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("run_ab", os.path.join(HERE, "run-ab.py"))
run_ab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(run_ab)


def main():
    variants, out_dir, runs, stage0, head = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]
    trees = [(stage0, "stage0-5c1b915", 0), (head, "head100-cdca63ac", 0), (head, "head200-cdca63ac", 5)]
    probes = tuple(sys.argv[6].split(",")) if len(sys.argv) > 6 else ("first-notch", "lm-19")
    prefix = sys.argv[7] if len(sys.argv) > 7 else "supp"
    lines = []

    def say(line=""):
        print(line, flush=True)
        lines.append(line)

    table = {p: {} for p in probes}
    for i in range(1, runs + 1):
        shift = (i - 1) % len(trees)
        order = trees[shift:] + trees[:shift]
        say("supp run %d order: %s" % (i, " ".join(label for _, label, _ in order)))
        for probe in probes:
            for tree, label, presses in order:
                env = dict(os.environ, SCALE_PRESSES=str(presses), LM19_ROOT=tree)
                if probe == "first-notch":
                    cmd = ["node", os.path.join(variants, "first-notch-scaled.mjs"), "--tree", tree]
                elif probe == "zoom-row-axis":
                    cmd = ["node", os.path.join(variants, "zoom-row-axis-scaled.mjs"), "--tree", tree]
                else:
                    cmd = ["node", os.path.join(variants, "lm-19-scaled.mjs")]
                proc = subprocess.run(cmd, cwd=tree, env=env, capture_output=True, text=True,
                                      encoding="utf-8", errors="replace", timeout=3600)
                text = proc.stdout
                s, e = text.find("{"), text.rfind("}")
                data = json.loads(text[s: e + 1]) if s >= 0 and e >= 0 else {"ok": False, "notMeasured": ["no JSON"]}
                with open(os.path.join(out_dir, "%s%d-%s-%s.json" % (prefix, i, probe, label)), "w", encoding="utf-8") as fh:
                    json.dump(data, fh, indent=2)
                c = data.get("conditions") or {}
                say("supp run %d %s %s: ok %s, sha %s, measuredAt %s, presses %s/%s, displayScale %s, notMeasured %s, doubts %s" % (
                    i, probe, label, data.get("ok"), c.get("buildSha256", "")[:8], c.get("measuredAt"),
                    c.get("scalePresses"), c.get("scalePressesAsked"), c.get("displayScaleMeasured"),
                    data.get("notMeasured"), data.get("doubts")))
                if probe == "zoom-row-axis" and isinstance(data.get("ceiling"), dict):
                    say("    ceiling zoomY: %s; notMeasured %s" % (", ".join("%s=%s" % (k, (data["ceiling"].get(k) or {}).get("zoomY")) for k in ("1920x1080", "1920x400")), data.get("notMeasured")))
                for name, metric, value in run_ab.sections(probe, data):
                    table[probe].setdefault((name, metric), {}).setdefault(label, []).append(
                        (i, value.get("medianMs"), value.get("p95Ms"), "" if data.get("ok") else "*"))
                w = data.get("writeCost") or {}
                for metric in ("inputToRedrawCallbackEnd", "insideThatRedrawCallback", "synchronousDispatch"):
                    if isinstance(w.get(metric), dict):
                        table[probe].setdefault(("MK-2 write cost", metric), {}).setdefault(label, []).append(
                            (i, w[metric].get("medianMs"), w[metric].get("p95Ms"), ""))

    for probe in probes:
        say("")
        say("## %s" % probe)
        say("")
        say("| section | metric | build | median per run | p95 per run | median min-max | p95 min-max |")
        say("|---|---|---|---:|---:|---:|---:|")
        for (name, metric), by_label in table[probe].items():
            for _, label, _ in trees:
                rows = sorted(by_label.get(label, []))
                say("| %s | %s | %s | %s | %s | %s ms | %s ms |" % (
                    name, metric, label,
                    " / ".join(run_ab.fmt(m) + k for _, m, _, k in rows) or "-",
                    " / ".join(run_ab.fmt(p) + k for _, _, p, k in rows) or "-",
                    run_ab.span([m for _, m, _, _ in rows]), run_ab.span([p for _, _, p, _ in rows])))
    with open(os.path.join(out_dir, "%s-summary.txt" % prefix), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
