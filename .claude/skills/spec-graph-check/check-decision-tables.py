# -*- coding: utf-8 -*-
"""Check 57 -- a decision table covers its conditions and never overlaps.

⛔ WHY THIS EXISTS. The rule is written at the end of section 1.9 (Notation)
of docs/spec/01-04-requirements.md, verbatim:

    **条件の列と結論の列で組んだ表（決定表）は、条件の取りうる値をすべて覆い、
    かつ 2 行が同じ条件の組で重ならないように書くこと（MUST）。**
    条件の列の「—」と「（問わない）」は、その列のどの値でも当たることを表す
    略記とすること（MUST） —— 略記を開いて読んだとき、条件のどの組にも
    ちょうど 1 行が当たること。

A gap means the specification never says what happens for that combination,
and an overlap means two answers stand for it. Neither is visible by eye once
a column carries a 「—」: the shorthand hides four combinations in one row.

⭐ THE DOMAINS LIVE HERE, NOT IN THE SPECIFICATION. CR-430 section 8 settles
that: 「条件の列と値の域は検査の側に書き、規則は 1.9 節の表記規約に 1 行足す」.
Each domain below carries a comment saying where it was READ FROM. ⛔ The
checker refuses a condition cell whose value is not in the declared domain --
that is what stops a domain here from rotting when the table is rewritten.

TWO SHAPES OF TABLE ARE READ.

  * FULL -- several condition columns, each with a closed domain. The
    shorthand is expanded and EXACTLY ONE row must answer every combination.
    表 T-272 (2 columns, 4 combinations) and 表 T-273 (3 columns, 12) are read
    this way.
  * MATRIX -- one condition column whose values ARE the rows (a domain that
    cannot be enumerated from anywhere), and the remaining columns are one
    gesture each. Coverage is then "every cell of the grid is answered" and
    overlap is "no two rows name the same thing". 表 T-270 is read this way.
    ⚠️ 「—」 in a CONCLUSION column is a literal answer ("nothing happens"),
    never a wildcard -- the rule names the condition columns only.

MEASURED on 0163153c: 表 T-272 4 of 4 combinations, one row each; 表 T-273 12
of 12, one row each; 表 T-270 13 rows, 13 distinct 掴んだもの, 39 of 39 cells
answered. 0 gaps and 0 overlaps in all three.

⚠️ WHAT IT DOES NOT SEE. Only the three tables listed below. The suite has no
way to tell a decision table from a value table by its shape alone -- 表 T-266
is columns of numbers, not conditions -- so the list is deliberate, and adding
a decision table means adding its columns here in the same change.

Usage:
    python check-decision-tables.py [repo-root]
"""
import io
import os
import re
import sys

SOURCE = os.path.join('docs', 'spec', '01-04-requirements.md')

# ⛔ The words that identify the rule. A guard that cannot find its own rule
# must go red rather than pass; see the docstring of check 56 for the same
# reasoning.
ANCHOR = u'条件の取りうる値をすべ' \
         u'て覆い'

# 「—」 and 「（問わない）」, named by the rule itself.
WILDCARDS = (u'—', u'（問わない）')

TABLE_HEADING = re.compile(u'^\\*\\*表 (T-[0-9a-z]+) —')

# --------------------------------------------------------------------------
# The tables, their condition columns and each column's domain.
# --------------------------------------------------------------------------
TABLES = [
    {
        'table': 'T-272',
        'mode': 'full',
        'conditions': [
            # 実績を表示 / 実績がある: both are two-valued by construction --
            # a display switch (FR-108, `actualVisible`) and "is there an
            # actual at all". READ FROM the table's own two columns and from
            # 表 T-272's closing note, which treats 「しない」 as the one other
            # case of 「する」.
            (u'実績を表示', [u'する', u'しない']),
            (u'実績がある', [u'ある', u'ない']),
        ],
    },
    {
        'table': 'T-273',
        'mode': 'full',
        'conditions': [
            # 形: THREE notations, not the five `shapeKind` values of 表 T-012.
            # READ FROM 表 T-267's `HT-1`, which groups the five exactly this
            # way -- 「矩形と矢羽根」 / 「線だけの形と端点スパン」 /
            # 「マイルストーン」 -- and from 表 T-271's closing MUST, which
            # extends the 線だけの形 rows to 端点スパン (`SH-4`).
            # ⚠️ So `===` stands for SH-1 and SH-2, `--->` for SH-3 and SH-4,
            # and ◆ for SH-5.
            (u'形', [u'`===`', u'`--->`', u'◆']),
            # マーカー: the progress marker is drawn or it is not.
            # READ FROM 表 T-273's own column and 表 T-270's `PE-8` 〜 `PE-10`.
            (u'マーカー', [u'出す', u'出さない']),
            # 入る: the predicate 表 T-273's closing defines as a MUST
            # (「入る」とは ... 基準の幅以下であることとすること) -- true or false.
            (u'入る', [u'入る', u'入らない']),
        ],
    },
    {
        'table': 'T-270',
        'mode': 'matrix',
        # 掴んだもの: the thing under the pointer. Its domain is open -- the
        # table's own closing says so (「実績を直接動かす経路の全数は本表が
        # 持つ（MUST）」), which makes the ROWS the domain. So coverage here is
        # the grid, and the only overlap possible is two rows naming the same
        # thing.
        'condition': u'掴んだもの',
    },
]

ROW_ID_COLUMN = u'行 ID'


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def read_lines(path):
    """Normalise on read -- this tree mixes CRLF and LF."""
    text = io.open(path, 'rb').read().decode('utf-8')
    return text.replace('\r\n', '\n').split('\n')


def split_row(line):
    return [cell.strip() for cell in line.strip().strip('|').split('|')]


def find_table(lines, table):
    """(header, rows, line_number) for the markdown table under its heading."""
    for index, line in enumerate(lines):
        match = TABLE_HEADING.match(line.strip())
        if not match or match.group(1) != table:
            continue
        cursor = index
        while cursor < len(lines) and not lines[cursor].lstrip().startswith('|'):
            cursor += 1
        if cursor >= len(lines):
            return None, None, index + 1
        header = split_row(lines[cursor])
        rows = []
        cursor += 2                     # skip the header and the `| --- |` rule
        while cursor < len(lines) and lines[cursor].lstrip().startswith('|'):
            rows.append((split_row(lines[cursor]), cursor + 1))
            cursor += 1
        return header, rows, index + 1
    return None, None, None


def combinations(domains):
    result = [()]
    for values in domains:
        result = [one + (value,) for one in result for value in values]
    return result


def check_full(table, header, rows, conditions, faults):
    """Expand the shorthand and hold every combination to exactly one row."""
    index_of = {}
    for name, _ in conditions:
        if name not in header:
            faults.append(u'表 %s has no condition column 「%s」 -- '
                          u'the columns held in this check are out of step with '
                          u'the table.' % (table, name))
            return None
        index_of[name] = header.index(name)

    answers = {}
    for cells, line in rows:
        choices = []
        for name, domain in conditions:
            value = cells[index_of[name]]
            if value in WILDCARDS:
                choices.append(list(domain))
                continue
            if value not in domain:
                faults.append(
                    u'表 %s line %d: 「%s」 holds 「%s」, '
                    u'which is not in the domain this check declares (%s). '
                    u'⛔ Re-read the domain and its source before widening '
                    u'it.' % (table, line, name, value, u' / '.join(domain)))
                choices = None
                break
            choices.append([value])
        if choices is None:
            continue
        for one in combinations(choices):
            answers.setdefault(one, []).append((cells[0], line))

    total = combinations([domain for _, domain in conditions])
    gaps = [one for one in total if one not in answers]
    overlaps = [(one, answers[one]) for one in total if len(answers.get(one, ())) > 1]
    for one in gaps:
        faults.append(u'表 %s: GAP -- no row answers (%s).'
                      % (table, u', '.join(one)))
    for one, who in overlaps:
        faults.append(u'表 %s: OVERLAP -- (%s) is answered by %s.'
                      % (table, u', '.join(one),
                         u' and '.join(u'%s (line %d)' % pair for pair in who)))
    return len(total), len(gaps), len(overlaps)


def check_matrix(table, header, rows, condition, faults):
    """One condition column: the rows are the domain, the grid is the coverage."""
    if condition not in header:
        faults.append(u'表 %s has no condition column 「%s」 -- the '
                      u'column held in this check is out of step with the table.'
                      % (table, condition))
        return None
    where = header.index(condition)
    outcomes = [name for name in header
                if name not in (ROW_ID_COLUMN, condition)]
    if not outcomes:
        faults.append(u'表 %s has no conclusion column.' % table)
        return None

    seen = {}
    cells_total = 0
    blank = 0
    for cells, line in rows:
        value = cells[where]
        if value in WILDCARDS:
            faults.append(u'表 %s line %d: the condition column 「%s'
                          u'」 holds the wildcard 「%s」, which '
                          u'makes that row answer every other row too.'
                          % (table, line, condition, value))
        if value in seen:
            faults.append(u'表 %s: OVERLAP -- 「%s」 is named by '
                          u'both %s (line %d) and %s (line %d).'
                          % (table, value, seen[value][0], seen[value][1],
                             cells[0], line))
        else:
            seen[value] = (cells[0], line)
        for name in outcomes:
            cells_total += 1
            if not cells[header.index(name)]:
                blank += 1
                faults.append(u'表 %s: GAP -- %s answers nothing for '
                              u'「%s」 (line %d).'
                              % (table, cells[0], name, line))
    return len(rows), len(outcomes), cells_total, blank


def main(argv):
    root = argv[1] if len(argv) > 1 else '.'
    path = os.path.join(root, SOURCE)
    if not os.path.exists(path):
        say(u'FAIL     %s is missing -- check 57 cannot read its rule.'
            % SOURCE.replace(os.sep, '/'))
        return 1
    lines = read_lines(path)
    rel = SOURCE.replace(os.sep, '/')

    rule_at = None
    for number, line in enumerate(lines, 1):
        if ANCHOR in line:
            rule_at = number
            break
    if rule_at is None:
        say(u'FAIL     the rule this check enforces is GONE from %s: no line '
            u'holds 「%s」. ⛔ Either restore it at the end of '
            u'section 1.9 or delete this check -- a guard that cannot find its '
            u'rule must not pass.' % (rel, ANCHOR))
        return 1

    faults = []
    report = []
    for spec in TABLES:
        table = spec['table']
        header, rows, at = find_table(lines, table)
        if header is None:
            faults.append(u'表 %s is not in %s any more.' % (table, rel))
            continue
        if spec['mode'] == 'full':
            outcome = check_full(table, header, rows, spec['conditions'], faults)
            if outcome:
                total, gaps, overlaps = outcome
                report.append(u'%s %d/%d combination(s) answered, %d overlap(s) '
                              u'[%s:%d]'
                              % (table, total - gaps, total, overlaps, rel, at))
        else:
            outcome = check_matrix(table, header, rows, spec['condition'], faults)
            if outcome:
                count, gestures, cells_total, blank = outcome
                report.append(u'%s %d row(s) × %d conclusion column(s) = '
                              u'%d/%d cell(s) answered [%s:%d]'
                              % (table, count, gestures, cells_total - blank,
                                 cells_total, rel, at))

    if faults:
        say(u'FAIL     %d decision-table fault(s) -- the MUST at %s:%d.'
            % (len(faults), rel, rule_at))
        for one in faults:
            say(u'         %s' % one)
        return 1

    say(u'OK       %d decision table(s) cover their conditions with no gap and '
        u'no overlap -- the MUST at %s:%d.' % (len(TABLES), rel, rule_at))
    for one in report:
        say(u'         %s' % one)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
