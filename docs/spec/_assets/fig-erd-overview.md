# データモデル — 概要（文書の全体像）

**UID**: DOC-FIG-ERD-OVERVIEW
**Version**: 0.3

> **本書は `_assets/source/erd.json` から `erd_json_to_md.py` が書き出す。手で直さない。**
> **直すのは `erd.json` である。** 説明の散文は `05-07-design.md` が持つ。

## 1. 文書の全体像

**Type**: SECTION

**図 F-010 — 文書の全体像**

```mermaid
---
config:
  flowchart:
    wrappingWidth: 1200
    htmlLabels: true
---
flowchart TB
    Document["<table style='white-space:nowrap'>
      <tr><td colspan='2'><b>文書ルート</b></td></tr>
      <tr><td>schemaVersion</td><td>文書の形式の版</td></tr>
      <tr><td>schedule</td><td>日程データの群</td></tr>
      <tr><td>documentSettings</td><td>見せ方の群</td></tr>
      <tr><td>revisionStamp</td><td>文書の刻印</td></tr>
      <tr><td>changeLog[]</td><td>文書の刻印</td></tr>
    </table>"]
    Schedule["<table style='white-space:nowrap'>
      <tr><td colspan='2'><b>schedule</b>（日程データの群）</td></tr>
      <tr><td>project</td><td>Project</td></tr>
      <tr><td>calendars[]</td><td>Calendar</td></tr>
      <tr><td>tasks[]</td><td>Task</td></tr>
      <tr><td>resources[]</td><td>Resource</td></tr>
      <tr><td>assignments[]</td><td>Assignment</td></tr>
      <tr><td>taskGroups[]</td><td>TaskGroup</td></tr>
      <tr><td>taskGroupMembers[]</td><td>TaskGroupMember</td></tr>
      <tr><td>taskVisuals[]</td><td>TaskVisual</td></tr>
      <tr><td>commentBoxes[]</td><td>CommentBox</td></tr>
      <tr><td>highlightBoxes[]</td><td>HighlightBox</td></tr>
      <tr><td>taskOrigins[]</td><td>TaskOrigin</td></tr>
      <tr><td>baselineTasks[]</td><td>BaselineTask</td></tr>
    </table>"]
    Settings["<table style='white-space:nowrap'>
      <tr><td colspan='2'><b>documentSettings</b>（見せ方の群）</td></tr>
      <tr><td colspan='2'>鍵と値の全数は tbl-settings.md</td></tr>
      <tr><td>scrollGroupId</td><td>S-78</td></tr>
      <tr><td>pinnedGroupIds[]</td><td>S-126</td></tr>
      <tr><td>importSeq</td><td>S-71</td></tr>
    </table>"]
    Stamp["<table style='white-space:nowrap'>
      <tr><td colspan='2'><b>revisionStamp</b></td></tr>
      <tr><td>revision</td><td>版数</td></tr>
      <tr><td>lastEditedBy</td><td>最後に書いた者</td></tr>
      <tr><td>updatedAt</td><td>時刻</td></tr>
    </table>"]
    Log["<table style='white-space:nowrap'>
      <tr><td colspan='2'><b>changeLog[]</b></td></tr>
      <tr><td>revision</td><td>適用された版数</td></tr>
      <tr><td>editedBy</td><td>書いた者</td></tr>
      <tr><td>explanation</td><td>変更の理由</td></tr>
      <tr><td>changedAt</td><td>時刻</td></tr>
    </table>"]
    Dep["<b>Dependency</b>"]
    Week["<b>WeekDay</b>"]
    Exc["<b>Exception</b>"]
    Carry["<b>CarryElement</b>"]
    Document -->|"日程データの群（1 ─ 1）"| Schedule
    Document -->|"見せ方の群（1 ─ 1）"| Settings
    Document -->|"文書の刻印（1 ─ 1）"| Stamp
    Document -->|"文書の刻印（1 ─ 0..n）"| Log
    Schedule -->|"tasks[] の各要素の下に入れ子（1 ─ 0..n）"| Dep
    Schedule -->|"calendars[] の各要素の下に入れ子（1 ─ 0..n）"| Week
    Schedule -->|"calendars[] の各要素の下に入れ子（1 ─ 0..n）"| Exc
    Schedule -->|"carryElements を持つ 8 型の兄弟の鍵（1 ─ 0..n）"| Carry
    Settings -->|"表示位置が指す行（弱い参照。0..1 ─ 1）"| Schedule
    Settings -->|"ピン止めした行（弱い参照。0..n ─ 1）"| Schedule
    Settings -->|"前回の取り込みの通し番号（taskOrigins と突き合わせる）"| Schedule
```
