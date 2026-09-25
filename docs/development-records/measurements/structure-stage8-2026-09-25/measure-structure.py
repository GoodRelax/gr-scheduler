# -*- coding: utf-8 -*-
"""Measure the shape of one src/ tree for the stage-8 re-measurement.

Usage (from the repository root):

    python docs/development-records/measurements/structure-stage8-2026-09-25/measure-structure.py [TREE [LABEL]]

TREE is the root of a checkout (default: this repository); LABEL is written
into the output as `tree` (default: the folder name of TREE). To measure an
old commit the same way, extract it first, for example
`git archive 8701ccf src | tar -x -C <dir>`, and pass <dir>.

Every number comes from a tool already in this repository, run over TREE/src:

  * functions   .claude/skills/spec-graph-check/function-size.mjs (the check-60
                reader: rolldown parseAst; lines = start..end inclusive, blank
                and comment lines counted; branches = if, ternary, loops,
                catch, case with a test, && || ??; a nested function's
                branches are its own).
  * code lines  the lexer of check 55 (check-comment-rules.py `lex`): a line
                counts when, after comments are removed and string insides
                blanked, it holds a character other than space or slash;
                lines between the generated-region markers are not counted.
  * frameLoop   lines inside the span of the function named `frameLoop` in
                frame-loop.ts that start with exactly two spaces and `let `
                (the method of the plan's record 1).

Prints one JSON object on stdout. Nothing is written to disk.
"""
import importlib.util
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
CHECKS = os.path.join(REPO, '.claude', 'skills', 'spec-graph-check')


def load(name, file_name):
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(CHECKS, file_name))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SIZE = load('check_function_size', 'check-function-size.py')
COMMENTS = load('check_comment_rules', 'check-comment-rules.py')

LET_AT_TWO = re.compile(r'^  let\s')


def source_files(src):
    for base, dirs, names in os.walk(src):
        dirs[:] = sorted(d for d in dirs if d != 'node_modules')
        for name in sorted(names):
            if name.endswith('.ts'):
                yield os.path.join(base, name)


def read(path):
    with io.open(path, encoding='utf-8', errors='replace', newline='') as handle:
        return handle.read().replace('\r\n', '\n')


def code_lines(text):
    lines = text.split('\n')
    generated = COMMENTS.generated_lines(lines)
    code, _comments = COMMENTS.lex(text)
    return sum(1 for number, line in enumerate(code.split('\n'), 1)
               if number not in generated and COMMENTS.is_code(line))


def percentile(values, fraction):
    ordered = sorted(values)
    if not ordered:
        return None
    rank = max(1, -(-len(ordered) * fraction // 1))  # nearest rank
    return ordered[int(rank) - 1]


def main(argv):
    tree = os.path.abspath(argv[0]) if argv else REPO
    src = os.path.join(tree, 'src')
    files = []
    texts = {}
    for path in source_files(src):
        rel = os.path.relpath(path, tree).replace(os.sep, '/')
        texts[rel] = read(path)
        files.append({'file': rel, 'text': texts[rel]})
    measured = SIZE.run_node(files)
    functions = measured['functions']

    per_file = []
    for rel, text in texts.items():
        per_file.append({'file': rel,
                         'physicalLines': text.count('\n') + (0 if text.endswith('\n') else 1),
                         'codeLines': code_lines(text)})
    per_file.sort(key=lambda row: -row['codeLines'])
    total_code = sum(row['codeLines'] for row in per_file)

    lines = [f['lines'] for f in functions]
    branches = [f['branches'] for f in functions]

    def listed(rows):
        return [{'file': f['file'], 'name': f['name'], 'lines': f['lines'],
                 'branches': f['branches']} for f in rows]

    frame_loop = None
    for f in functions:
        if f['name'] == 'frameLoop' and f['file'].endswith('/frame-loop.ts'):
            body = texts[f['file']].split('\n')[f['startLine'] - 1:f['endLine']]
            frame_loop = {'file': f['file'], 'lines': f['lines'],
                          'branches': f['branches'],
                          'letAtIndentTwo': sum(1 for line in body
                                                if LET_AT_TWO.match(line))}

    result = {
        'tree': argv[1] if len(argv) > 1 else os.path.basename(tree),
        'files': len(per_file),
        'codeLines': total_code,
        'topFilesByCodeLines': per_file[:12],
        'topThreeShareOfCodeLines': round(
            100.0 * sum(r['codeLines'] for r in per_file[:3]) / total_code, 1)
        if total_code else None,
        'functions': len(functions),
        'functionsAtMost50Lines': sum(1 for n in lines if n <= 50),
        'functionsOver50LinesOr15Branches': sum(
            1 for f in functions if f['lines'] > 50 or f['branches'] > 15),
        'functionsOver500Lines': listed(sorted(
            (f for f in functions if f['lines'] > 500), key=lambda f: -f['lines'])),
        'functionsOver200Lines': sum(1 for n in lines if n > 200),
        'functionsWith100BranchesOrMore': listed(sorted(
            (f for f in functions if f['branches'] >= 100),
            key=lambda f: -f['branches'])),
        'functionsWith50BranchesOrMore': sum(1 for n in branches if n >= 50),
        'linesPercentiles': {p: percentile(lines, q) for p, q in
                             (('p50', 0.5), ('p90', 0.9), ('p99', 0.99), ('max', 1.0))},
        'branchesPercentiles': {p: percentile(branches, q) for p, q in
                                (('p50', 0.5), ('p90', 0.9), ('p99', 0.99), ('max', 1.0))},
        'largestFunctions': listed(sorted(functions, key=lambda f: -f['lines'])[:10]),
        'mostBranchedFunctions': listed(sorted(functions, key=lambda f: -f['branches'])[:10]),
        'frameLoop': frame_loop,
        'readerErrors': measured.get('errors', []),
    }
    json.dump(result, sys.stdout, indent=2, ensure_ascii=True)
    sys.stdout.write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
