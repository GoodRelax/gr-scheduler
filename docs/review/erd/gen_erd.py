# -*- coding: utf-8 -*-
"""Emit the detail ERD figure and its column table from one source."""
import io
import erd_model as m

PK = '#C00000'
FK = '#008000'

# parent, child, multiplicity, label
RELATIONS = [
    ('Task', 'Task', '0..n ─ 0..1',
     'WBS の親子（`wbsParentUid`）。輪を禁じる規則は 表 T-015a の `HM-4` と `FR-023` が持つ'),
    ('Task', 'Dependency', '1 ─ 0..n', 'この依存の後続（入れ子の位置が表す）'),
    ('Dependency', 'Task', '0..n ─ 1', 'この依存の先行（`predecessorUid`）'),
    ('TaskGroup', 'TaskGroup', '0..n ─ 0..1', '行の親子（`parentId`）。深さの上限は `FR-004`'),
    ('TaskGroupMember', 'TaskGroup', '0..n ─ 1', 'どの行に載るか（`groupId`）'),
    ('TaskGroupMember', 'Task', '1 ─ 1', 'どのタスクが載るか（`taskUid`）'),
    ('TaskGroup', 'Task', '0..n ─ 0..1', '行の名前の導出元（`derivedFromTaskUid`）'),
    ('Project', 'Calendar', '1 ─ 0..1', '文書の既定の暦（`calendarUid`）'),
    ('Task', 'Calendar', '0..n ─ 0..1', 'このタスクが使う暦（`calendarUid`）'),
    ('Resource', 'Calendar', '0..n ─ 0..1', 'この担当者が使う暦（`calendarUid`）'),
    ('Calendar', 'Calendar', '0..n ─ 0..1', '継承元の暦（`baseCalendarUid`）'),
    ('Calendar', 'WeekDay', '1 ─ 0..n', '曜日ごとの稼働（弱エンティティ）'),
    ('Calendar', 'Exception', '1 ─ 0..n', '例外日（弱エンティティ）'),
    ('Assignment', 'Task', '0..n ─ 1', '就くタスク（`taskUid`）'),
    ('Assignment', 'Resource', '0..n ─ 1', '就く担当者（`resourceUid`）'),
    ('TaskVisual', 'Task', '0..1 ─ 1', 'そのタスクの見せ方（`taskUid`）'),
    ('TaskOrigin', 'Task', '0..1 ─ 1', 'そのタスクの取り込み元（`taskUid`）'),
    ('CommentBox', 'Task', '0..n ─ 0..1', '留めるタスク（`anchorTaskUid`）'),
    ('CommentBox', 'TaskGroup', '0..n ─ 0..1', '留める行（`anchorGroupId`）'),
    ('HighlightBox', 'TaskGroup', '0..n ─ 0..1', '囲む範囲の上端の行（`topGroupId`）'),
    ('HighlightBox', 'TaskGroup', '0..n ─ 0..1', '囲む範囲の下端の行（`bottomGroupId`）'),
    ('CarryElement', 'CarryElement', '1 ─ 0..n', '入れ子の子（`children`）'),
    ('Task', 'BaselineTask', '0..1 ─ 0..1',
     '変更前の予定との対応（`uid` の一致。参照ではない）。対応が無いものは描かない（`FR-015`）'),
]

CARRY_OWNERS = ['Project', 'Task', 'Dependency', 'Calendar', 'WeekDay',
                'Exception', 'Resource', 'Assignment']


def esc(s):
    return s.replace('`', '')


def cell_name(name, key):
    if key.startswith('PK'):
        return "<b><span style='color:%s'>%s</span></b>" % (PK, name)
    if key == 'FK':
        return "<b><span style='color:%s'>%s</span></b>" % (FK, name)
    return name


def node(ident, title, cols):
    rows = ["<tr><td colspan='4'><b>%s</b></td></tr>" % ident]
    for name, typ, nul, key, fk, origin, mspdi, meaning in cols:
        rows.append('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>'
                    % (cell_name(name, key), esc(typ), key or '—', origin))
    return '    %s["<table style=\'white-space:nowrap\'>\n      %s\n    </table>"]' \
        % (ident, '\n      '.join(rows))


# Boxes are declared in table order. Reordering was measured in the real
# StrictDoc export (bundled mermaid 11.12.2, 15 boxes / 38 edge paths):
#   table order            4523 x 3482, 2 edges cross a box
#   visuals declared last  4523 x 3482, 2 edges cross a box  (no gain)
#   calendars declared     4863 x 3482, 5 edges cross a box  (worse)
# A standalone probe page reports different sizes for the same input because
# StrictDoc's stylesheet changes the cell widths -- measure in the export.
def figure():
    out = ['```mermaid', '---', 'config:', '  flowchart:',
           '    wrappingWidth: 1200', '    htmlLabels: true', '---', 'flowchart TB']
    for name, desc, cols in m.ENTITIES + m.STAMP + m.LATE:
        out.append(node(name, name, cols))
    for a, b, mult, label in RELATIONS:
        out.append('    %s -->|"%s（%s）"| %s' % (a, esc(label), mult, b))
    for o in CARRY_OWNERS:
        out.append('    %s -->|"carryElements の中身（1 ─ 0..n）"| CarryElement'
                   % o)
    out.append('```')
    body = '\n'.join(out[1:-1])
    assert '`' not in body, 'a backtick would show literally inside mermaid'
    return '\n'.join(out)


def column_table():
    rows = []
    n = 0
    for name, desc, cols in m.ENTITIES + m.STAMP + m.LATE:
        for cname, typ, nul, key, fk, origin, mspdi, meaning in cols:
            n += 1
            rows.append('| AT-%d | `%s` | `%s` | %s | %s | %s | %s | %s | %s |'
                        % (n, name, cname, typ, nul, key or '—',
                           origin, ('`%s`' % mspdi) if mspdi else '—', meaning))
    return rows


KEY_NOTE = {
    'Project': '— （文書に 1 つしか無い。`id` は主キーにしない）',
    'Dependency': '— （後続タスクの下での位置が表す）',
    'CarryElement': '所有者 ＋ `ordinal`',
    'TaskGroupMember': '`taskUid`（一意）',
    'revisionStamp': '— （文書に 1 つしか無い）',
}


def entity_table():
    rows = []
    for i, (name, desc, cols) in enumerate(m.ENTITIES + m.STAMP + m.LATE, 1):
        keys = [c[0] for c in cols if c[3].startswith('PK')]
        carry = 'あり' if name in CARRY_OWNERS else '—'
        export = '書き出す'
        if name in ('TaskGroup', 'TaskGroupMember', 'TaskVisual', 'TaskOrigin',
                    'CommentBox', 'HighlightBox', 'BaselineTask',
                    'revisionStamp', 'changeLog'):
            export = '**書き出さない**'
        key = KEY_NOTE.get(
            name, ' ＋ '.join('`%s`' % k for k in keys) or '—')
        rows.append('| ET-%d | `%s` | %s | %s | %s | %s |'
                    % (i, name, desc, key, export, carry))
    return rows


def relation_table():
    rows = []
    for i, (a, b, mult, label) in enumerate(RELATIONS, 1):
        rows.append('| RL-%d | `%s` | `%s` | %s | %s |' % (i, a, b, mult, label))
    for j, o in enumerate(CARRY_OWNERS, len(RELATIONS) + 1):
        rows.append('| RL-%d | `%s` | `CarryElement` | 1 ─ 0..n | '
                    '解釈しない要素の退避先（`carryElements`） |' % (j, o))
    return rows


if __name__ == '__main__':
    w = io.open('erd_out.md', 'w', encoding='utf-8')
    w.write(figure())
    w.write('\n\n===ENTITY===\n')
    w.write('\n'.join(entity_table()))
    w.write('\n\n===RELATION===\n')
    w.write('\n'.join(relation_table()))
    w.write('\n\n===COLUMN===\n')
    w.write('\n'.join(column_table()))
    w.write('\n')
    w.close()
    print('entities', len(m.ENTITIES), 'stamps', len(m.STAMP))
    print('columns', len(column_table()))
    print('relations', len(relation_table()))


DERIVED = [
    ('Project', 'finishDate', 'Project/FinishDate', '最も遅い `Task.finish`'),
    ('Project', 'saveVersion', 'Project/SaveVersion', '書き出す本ソフトウェアの版'),
    ('Project', 'currencyCode', 'Project/CurrencyCode', '`carry` に控えた原値'),
    ('Task', 'id', 'Task/ID', '書き出す順に振り直す。**`uid` とは別物で、可変である**'),
    ('Task', 'outlineLevel', 'Task/OutlineLevel',
     '`wbsParentUid` の木の深さ。**浅く丸めない**（`FR-004`）'),
    ('Task', 'outlineNumber', 'Task/OutlineNumber', '木の道すじ。**照合の鍵にしない**'),
    ('Task', 'summary', 'Task/Summary', '子を持つかどうか'),
    ('Task', 'duration', 'Task/Duration',
     '`finish` − `start` と暦。**人が編集していないタスクは受け取った値をそのまま返す**'),
    ('Task', 'stop', 'Task/Stop', '`actualStart` ＋ `actualDuration`。**中断のときだけ書く**'),
    ('Resource', 'id', 'Resource/ID', '書き出す順に振り直す。**`uid` とは別物**'),
]


def derived_table():
    return ['| DV-%d | `%s` | `%s` | `%s` | %s |' % (i, e, c, x, w)
            for i, (e, c, x, w) in enumerate(DERIVED, 1)]
