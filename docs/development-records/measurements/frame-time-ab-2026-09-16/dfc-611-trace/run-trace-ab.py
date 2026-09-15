"""Alternate dfc-611-trace.mjs between two built trees (record 17 method).

Usage: python run-trace-ab.py <tree-A> <label-A> <tree-B> <label-B> <out-dir> [runs] [holdMs]
  runs    default 3 (record 17: three alternations per build)
  holdMs  default 5000 (traced motion per stretch; record 17's dependency-drag held >= 5 s)

Order per run: tree A then tree B. Each run traces both stretches (empty ground, another Task) in
one browser session. Raw result JSON and trace files go to <out-dir>; a table of the per-frame
median of each stage, per run and min-max over runs, is printed and saved as <out-dir>/summary.txt.
Put <out-dir> OUTSIDE the repository: one trace file is tens of MB.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROBE = os.path.join(HERE, "dfc-611-trace.mjs")
RUN_TIMEOUT_S = 900
PROBE_ROWS = ("frameTime", "insideRedrawCallback")


def run_once(tree, label, out_dir, hold_ms):
    command = ["node", PROBE, "--tree", tree, "--out", out_dir, "--label", label, "--holdMs", str(hold_ms)]
    try:
        proc = subprocess.run(command, cwd=tree, capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=RUN_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        raise SystemExit("probe timed out after %d s in %s" % (RUN_TIMEOUT_S, tree))
    if proc.stderr.strip():
        with open(os.path.join(out_dir, label + ".stderr.txt"), "w", encoding="utf-8") as fh:
            fh.write(proc.stderr)
    text = proc.stdout
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        raise SystemExit("probe printed no JSON in %s (exit %s)\n%s" % (tree, proc.returncode, proc.stderr[-2000:]))
    data = json.loads(text[start:end + 1])
    with open(os.path.join(out_dir, label + ".json"), "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
    if proc.returncode == 2:
        raise SystemExit("probe could not run in %s: %s" % (tree, data.get("reason")))
    return data


def span(values):
    present = [v for v in values if v is not None]
    return "-" if not present else "%s-%s" % (min(present), max(present))


def main():
    given = sys.argv[1:6]
    if len(given) < 5:
        raise SystemExit(__doc__)
    tree_a, label_a, tree_b, label_b, out_dir = given
    runs = int(sys.argv[6]) if len(sys.argv) > 6 else 3
    hold_ms = int(sys.argv[7]) if len(sys.argv) > 7 else 5000
    os.makedirs(out_dir, exist_ok=True)
    trees = ((os.path.abspath(tree_a), label_a), (os.path.abspath(tree_b), label_b))
    lines = []

    def say(line=""):
        print(line, flush=True)
        lines.append(line)

    # table[(stretch, row)][label] -> [median per run]
    table = {}
    failed = []
    for i in range(1, runs + 1):
        for tree, label in trees:
            run_label = "run%d-%s" % (i, label)
            data = run_once(tree, run_label, out_dir, hold_ms)
            say("run %d %s: ok %s, sha256 %s, notMeasured %s"
                % (i, label, data.get("ok"), (data.get("conditions") or {}).get("buildSha256", "?")[:8],
                   data.get("notMeasured")))
            if not data.get("ok"):
                failed.append(run_label)
                continue
            for s in data.get("stretches") or []:
                probe = s.get("inPageProbe") or {}
                for row in PROBE_ROWS:
                    v = (probe.get(row) or {}).get("medianMs")
                    table.setdefault((s["name"], "probe." + row), {}).setdefault(label, []).append(v)
                trace = s.get("trace") or {}
                table.setdefault((s["name"], "trace.frames"), {}).setdefault(label, []).append(trace.get("frames"))
                for row, v in (trace.get("table") or {}).items():
                    table.setdefault((s["name"], row), {}).setdefault(label, []).append(v.get("medianMs"))
                for row, v in (trace.get("counts") or {}).items():
                    table.setdefault((s["name"], row), {}).setdefault(label, []).append(v.get("median"))

    say("")
    say("## per-frame medians (ms; count.* are events per frame), runs that reported ok only")
    say("")
    say("| stretch | row | build | median per run | min-max |")
    say("|---|---|---|---:|---:|")
    for (stretch, row), by_label in table.items():
        for _, label in trees:
            values = by_label.get(label, [])
            say("| %s | %s | %s | %s | %s |" % (stretch, row, label,
                                                 " / ".join("-" if v is None else str(v) for v in values) or "-",
                                                 span(values)))
    if failed:
        say("")
        say("runs left out (ok false): %s" % ", ".join(failed))
    with open(os.path.join(out_dir, "summary.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
