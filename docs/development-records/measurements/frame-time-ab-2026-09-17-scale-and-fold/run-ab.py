"""Alternate three probes between built trees on one machine on one day (record 17 method; stage 0 vs scale-and-fold A/B).

Usage: python run-ab.py <out-dir> <runs> <tree>=<label> [<tree>=<label> ...]

Probes, in this order inside every run:
  zoom-row-axis    ../frame-time-ab-2026-09-16/extra-zoom-row-axis-and-dependency-drag/zoom-row-axis.mjs --tree <tree>
  first-notch      ./first-notch.mjs --tree <tree>
  lm-19            <tree>/tools/probe/examples/lm-19-frame-time-baseline.mjs (the tree's own copy, run in the tree)
For each probe the trees are taken in an order that rotates by one every run
(two trees: run 1: A B, run 2: B A, run 3: A B), so no tree always goes first.
dependency-drag is left out: it finds no drag start on builds after the display-scale wave
(DFC-611 note, frame-time-ab-2026-09-17-dfc-610/results.md section 5).
Every run's raw stdout JSON is saved as run<i>-<probe>-<label>.json, stderr beside it when not empty.
Runs whose JSON says ok false are KEPT in the tables and marked, because a probe's own
precondition (for example "the row-area ceiling holds at 1920x400") can be false for a build
whose behaviour changed; the notMeasured reasons are printed with the run.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OLD = os.path.join(os.path.dirname(HERE), "frame-time-ab-2026-09-16", "extra-zoom-row-axis-and-dependency-drag")
RUN_TIMEOUT_S = 3600
STRETCH_METRICS = ("frameTime", "insideRedrawCallback", "synchronousDispatch", "inputToRedrawCallbackEnd")
SINGLE_METRICS = ("inputToNextFrameEnter", "inputToRedrawCallbackEnd", "insideThatRedrawCallback", "synchronousDispatch")


def command_of(probe, tree):
    if probe == "zoom-row-axis":
        return ["node", os.path.join(OLD, "zoom-row-axis.mjs"), "--tree", tree]
    if probe == "first-notch":
        return ["node", os.path.join(HERE, "first-notch.mjs"), "--tree", tree]
    return ["node", os.path.join(tree, "tools", "probe", "examples", "lm-19-frame-time-baseline.mjs")]


PROBES = ("zoom-row-axis", "first-notch", "lm-19")


def run_once(probe, tree, out_path):
    try:
        proc = subprocess.run(
            command_of(probe, tree), cwd=tree, capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=RUN_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "notMeasured": ["timed out after %d s" % RUN_TIMEOUT_S]}
    if proc.stderr.strip():
        with open(out_path[: -len(".json")] + ".stderr.txt", "w", encoding="utf-8") as fh:
            fh.write(proc.stderr)
    text = proc.stdout
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        data = {"ok": False, "notMeasured": ["printed no JSON (exit %s)" % proc.returncode]}
    else:
        data = json.loads(text[start: end + 1])
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
    return data


def sections(probe, data):
    found = []
    if probe == "first-notch":
        for item in data.get("results") or []:
            for part in ("firstNotch", "repeatedNotches"):
                for metric, value in (item.get(part) or {}).items():
                    found.append(("%s %s" % (item["name"], part), metric, value))
        return found
    for group, metrics in (("stretches", STRETCH_METRICS), ("singles", SINGLE_METRICS)):
        for item in data.get(group) or []:
            if not isinstance(item, dict):
                continue
            for metric in metrics:
                value = item.get(metric)
                if isinstance(value, dict) and "medianMs" in value:
                    found.append((item.get("name", "?"), metric, value))
    if isinstance(data.get("frameTime"), dict):
        found.append(("(pooled)", "frameTime", data["frameTime"]))
    return found


def fmt(v):
    return "-" if v is None else "%s" % v


def span(values):
    present = [v for v in values if v is not None]
    return "-" if not present else "%s-%s" % (min(present), max(present))


def main():
    if len(sys.argv) < 5:
        raise SystemExit(__doc__)
    out_dir = sys.argv[1]
    runs = int(sys.argv[2])
    trees = [tuple(arg.split("=", 1)) for arg in sys.argv[3:]]
    os.makedirs(out_dir, exist_ok=True)
    lines = []

    def say(line=""):
        print(line, flush=True)
        lines.append(line)

    table = {p: {} for p in PROBES}
    for i in range(1, runs + 1):
        shift = (i - 1) % len(trees)
        order = trees[shift:] + trees[:shift]
        say("run %d order: %s" % (i, " ".join(label for _, label in order)))
        for probe in PROBES:
            for tree, label in order:
                out_path = os.path.join(out_dir, "run%d-%s-%s.json" % (i, probe, label))
                data = run_once(probe, tree, out_path)
                sha = (data.get("conditions") or {}).get("buildSha256", "")[:8]
                say("run %d %s %s: ok %s, sha %s, measuredAt %s, notMeasured %d, doubts %d" % (
                    i, probe, label, data.get("ok"), sha, (data.get("conditions") or {}).get("measuredAt"),
                    len(data.get("notMeasured") or []), len(data.get("doubts") or [])))
                for reason in data.get("notMeasured") or []:
                    say("    notMeasured: %s" % reason)
                for doubt in data.get("doubts") or []:
                    say("    doubt: %s" % doubt)
                if probe == "zoom-row-axis" and isinstance(data.get("ceiling"), dict):
                    c = data["ceiling"]
                    say("    ceiling zoomY: %s" % ", ".join(
                        "%s=%s" % (k, (c.get(k) or {}).get("zoomY")) for k in ("1920x1080", "1920x400", "1920x1600")))
                mark = "" if data.get("ok") else "*"
                for name, metric, value in sections(probe, data):
                    table[probe].setdefault((name, metric), {}).setdefault(label, []).append(
                        (i, value.get("medianMs"), value.get("p95Ms"), mark))

    for probe in PROBES:
        say("")
        say("## %s (* = that run reported ok false; see its notMeasured above)" % probe)
        say("")
        say("| section | metric | build | median per run | p95 per run | median min-max | p95 min-max |")
        say("|---|---|---|---:|---:|---:|---:|")
        for (name, metric), by_label in table[probe].items():
            for _, label in trees:
                rows = sorted(by_label.get(label, []))
                say("| %s | %s | %s | %s | %s | %s ms | %s ms |" % (
                    name, metric, label,
                    " / ".join(fmt(m) + k for _, m, _, k in rows) or "-",
                    " / ".join(fmt(p) + k for _, _, p, k in rows) or "-",
                    span([m for _, m, _, _ in rows]), span([p for _, _, p, _ in rows])))

    with open(os.path.join(out_dir, "summary.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
