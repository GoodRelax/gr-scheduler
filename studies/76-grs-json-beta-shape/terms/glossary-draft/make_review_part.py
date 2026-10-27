"""Cut glossary.json into review parts and print one part as a Markdown table.

    python make_review_part.py --list        list every part with its size
    python make_review_part.py <n>           print part n (1-based)

A part is one sub-group (or group) in reading order; a sub-group with more
than PART_SIZE terms (children included) is cut into chunks that never split
a term from its children. The table shows only what the user reviews: the
Japanese name a person sees and the Japanese meaning (JDG-3424).
"""
import json
import os
import sys

PART_SIZE = 40
HERE = os.path.dirname(os.path.abspath(__file__))


def load():
    with open(os.path.join(HERE, "glossary.json"), encoding="utf-8") as f:
        return json.load(f)


def flatten(term, depth):
    rows = [(depth, term)]
    for child in term.get("children", []):
        rows.extend(flatten(child, depth + 1))
    return rows


def units_of(group, path):
    """(sub-group path, rows of one term with its children) in reading order."""
    path = path + [group]
    for term in group.get("terms", []):
        yield path, flatten(term, 0)
    for sub in group.get("groups", []):
        yield from units_of(sub, path)


def all_parts():
    """Pack the terms of one top group into parts of at most PART_SIZE rows."""
    parts = []
    for group in load()["groups"]:
        paths, chunk = [], []
        for path, rows in units_of(group, []):
            if chunk and len(chunk) + len(rows) > PART_SIZE:
                parts.append((paths, chunk))
                paths, chunk = [], []
            if not paths or paths[-1] is not path:
                paths.append(path)
            chunk.extend((path, depth, term) for depth, term in rows)
        if chunk:
            parts.append((paths, chunk))
    return parts


def title(paths):
    top = paths[0][0]["title"]["ja"]
    subs = [p[-1]["title"]["ja"] for p in paths if len(p) > 1]
    names = []
    for name in subs:
        if name not in names:
            names.append(name)
    return top + (" / " + "・".join(names) if names else "")


def cell(text):
    return text.replace("|", "\\|").replace("\n", " ")


def print_part(n):
    parts = all_parts()
    paths, rows = parts[n - 1]
    print("### Part %d / %d -- %s（%d 語）" % (n, len(parts), title(paths), len(rows)))
    print()
    print("| # | キー | 日本語の名 | 意味（日本語） |")
    print("|---|---|---|---|")
    for i, (_path, depth, term) in enumerate(rows, 1):
        key = "`" + term["key"] + "`"
        if term.get("owner"):
            key += "\uff08\u6301\u3061\u4e3b `" + term["owner"] + "`\uff09"
        key = "\u3000" * depth + ("+- " if depth else "") + key
        label = term.get("label", {}).get("ja", "")
        print("| %d | %s | %s | %s |" % (i, key, cell(label), cell(term["definition"]["ja"])))


def main(argv):
    if argv[1:] == ["--list"]:
        for n, (paths, rows) in enumerate(all_parts(), 1):
            print("%3d  %3d  %s" % (n, len(rows), title(paths)))
        return 0
    print_part(int(argv[1]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
