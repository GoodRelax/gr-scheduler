"""Alternate the row-zoom and dependency-drag probes between two built trees (record 17 method).

Usage: python run-ab.py [<tree-A> <label-A> <tree-B> <label-B> <out-dir> [runs]]
With no arguments: tree A = ../perf-a-5c1b915 (label stage0-5c1b915),
tree B = ../perf-b-f45e9cd7 (label tip-f45e9cd7), out-dir = ../perf-ab-2026-09-16-extra, 3 runs,
all relative to this folder.

The probes stay in this folder and are handed the tree with --tree, so nothing is copied into a tree.
Each tree is a git-archive copy with node_modules linked and dist/ built.
Every run's raw JSON is saved; a table of median and p95 per section is printed and saved as summary.txt.
Order per run, as perf_ab.py: for each probe, tree A then tree B.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCRATCH = os.path.dirname(HERE)
PROBES = (
    ("zoom-row-axis", "zoom-row-axis.mjs"),
    ("dependency-drag", "dependency-drag.mjs"),
)
DEFAULT_ARGS = (
    os.path.join(SCRATCH, "perf-a-5c1b915"),
    "stage0-5c1b915",
    os.path.join(SCRATCH, "perf-b-f45e9cd7"),
    "tip-f45e9cd7",
    os.path.join(SCRATCH, "perf-ab-2026-09-16-extra"),
)
RUN_TIMEOUT_S = 1800
STRETCH_METRICS = ("frameTime", "insideRedrawCallback", "synchronousDispatch", "inputToRedrawCallbackEnd")
SINGLE_METRICS = ("inputToNextFrameEnter", "inputToRedrawCallbackEnd", "insideThatRedrawCallback", "synchronousDispatch")


def run_once(probe_file, tree, out_path):
    command = ["node", os.path.join(HERE, probe_file), "--tree", tree]
    try:
        proc = subprocess.run(
            command, cwd=tree, capture_output=True, text=True, encoding="utf-8", errors="replace",
            timeout=RUN_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        raise SystemExit("probe %s timed out after %d s in %s" % (probe_file, RUN_TIMEOUT_S, tree))
    if proc.stderr.strip():
        with open(out_path[: -len(".json")] + ".stderr.txt", "w", encoding="utf-8") as fh:
            fh.write(proc.stderr)
    text = proc.stdout
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end < 0:
        raise SystemExit("probe %s printed no JSON in %s (exit %s)\n%s"
                         % (probe_file, tree, proc.returncode, proc.stderr[-2000:]))
    data = json.loads(text[start : end + 1])
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
    if proc.returncode == 2:
        # Bad arguments or environment: every later run would fail the same way.
        raise SystemExit("probe %s could not run in %s: %s" % (probe_file, tree, data.get("reason")))
    return data


def sections(data):
    """((section name, metric), {medianMs, p95Ms}) for every stretch and single the probe reported."""
    found = []
    for group, metrics in (("stretches", STRETCH_METRICS), ("singles", SINGLE_METRICS)):
        for item in data.get(group) or []:
            if not isinstance(item, dict):
                continue
            for metric in metrics:
                value = item.get(metric)
                if isinstance(value, dict) and "medianMs" in value:
                    found.append(((item.get("name", "?"), metric), value))
    return found


def fmt(value):
    return "-" if value is None else "%s" % value


def span(values):
    present = [v for v in values if v is not None]
    return "-" if not present else "%s-%s" % (min(present), max(present))


def main():
    given = sys.argv[1:6]
    if given and len(given) < 5:
        raise SystemExit(__doc__)
    tree_a, label_a, tree_b, label_b, out_dir = given if given else DEFAULT_ARGS
    runs = int(sys.argv[6]) if len(sys.argv) > 6 else 3
    os.makedirs(out_dir, exist_ok=True)
    trees = ((tree_a, label_a), (tree_b, label_b))

    lines = []

    def say(line=""):
        print(line, flush=True)
        lines.append(line)

    # table[probe][(section, metric)][label] -> list of (run, median, p95) from runs that were ok
    table = {name: {} for name, _ in PROBES}
    failed = []
    for i in range(1, runs + 1):
        for probe_name, probe_file in PROBES:
            for tree, label in trees:
                out_path = os.path.join(out_dir, "run%d-%s-%s.json" % (i, probe_name, label))
                data = run_once(probe_file, tree, out_path)
                overall = data.get("frameTime") or {}
                not_measured = data.get("notMeasured") or []
                say("run %d %s %s: ok %s, frame time median %s p95 %s, notMeasured %d, doubts %d"
                    % (i, probe_name, label, data.get("ok"), overall.get("medianMs"), overall.get("p95Ms"),
                       len(not_measured), len(data.get("doubts") or [])))
                for reason in not_measured:
                    say("    notMeasured: %s" % reason)
                for doubt in data.get("doubts") or []:
                    say("    doubt: %s" % doubt)
                if probe_name == "zoom-row-axis" and isinstance(data.get("ceiling"), dict):
                    say("    ceiling: %s" % data["ceiling"].get("reading"))
                if not data.get("ok"):
                    failed.append((i, probe_name, label))
                    continue
                for key, value in sections(data):
                    table[probe_name].setdefault(key, {}).setdefault(label, []).append(
                        (i, value.get("medianMs"), value.get("p95Ms")))

    for probe_name, _ in PROBES:
        say("")
        say("## %s (runs that reported ok only)" % probe_name)
        say("")
        say("| section | metric | build | median per run | p95 per run | median min-max | p95 min-max |")
        say("|---|---|---|---:|---:|---:|---:|")
        for (section, metric), by_label in table[probe_name].items():
            for _, label in trees:
                rows = by_label.get(label, [])
                medians = [m for _, m, _ in rows]
                p95s = [p for _, _, p in rows]
                say("| %s | %s | %s | %s | %s | %s ms | %s ms |" % (
                    section, metric, label,
                    " / ".join(fmt(m) for m in medians) or "-",
                    " / ".join(fmt(p) for p in p95s) or "-",
                    span(medians), span(p95s)))

    if failed:
        say("")
        say("runs left out of the tables (ok false): %s"
            % ", ".join("run %d %s %s" % one for one in failed))

    with open(os.path.join(out_dir, "summary.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
