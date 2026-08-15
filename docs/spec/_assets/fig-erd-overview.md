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
  er:
    entityPadding: 6
---
erDiagram
    documentRoot {
        文字列 schemaVersion "文書の形式の版"
        オブジェクト schedule "日程データの群"
        オブジェクト documentSettings "見せ方の群"
        オブジェクト revisionStamp "文書の刻印"
        配列 changeLog "文書の刻印"
    }
    schedule {
        オブジェクト project "Project"
        配列 calendars "Calendar"
        配列 tasks "Task"
        配列 resources "Resource"
        配列 assignments "Assignment"
        配列 taskGroups "TaskGroup"
        配列 taskGroupMembers "TaskGroupMember"
        配列 taskVisuals "TaskVisual"
        配列 commentBoxes "CommentBox"
        配列 highlightBoxes "HighlightBox"
        配列 taskOrigins "TaskOrigin"
        配列 baselineTasks "BaselineTask"
    }
    documentSettings {
        文字列 scrollGroupId "S-78"
        配列 pinnedGroupIds "S-126"
        整数 importSeq "S-71"
    }
    revisionStamp {
        整数 revision "版数"
        文字列 lastEditedBy "最後に書いた者"
        文字列 updatedAt "時刻"
    }
    changeLog {
        整数 revision "適用された版数"
        文字列 editedBy "書いた者"
        文字列 explanation "変更の理由"
        文字列 changedAt "時刻"
    }
    documentRoot ||--|| schedule : "日程データの群"
    documentRoot ||--|| documentSettings : "見せ方の群"
    documentRoot ||--|| revisionStamp : "文書の刻印"
    documentRoot ||--o{ changeLog : "文書の刻印"
    schedule ||--o{ Dependency : "tasks の各要素の下に入れ子"
    schedule ||--o{ WeekDay : "calendars の各要素の下に入れ子"
    schedule ||--o{ Exception : "calendars の各要素の下に入れ子"
    schedule ||--o{ CarryElement : "carryElements を持つ 8 型の兄弟の鍵"
    documentSettings |o--|| schedule : "表示位置が指す行。弱い参照"
    documentSettings }o--|| schedule : "ピン止めした行。弱い参照"
    documentSettings |o--|| schedule : "前回の取り込みの通し番号。taskOrigins と突き合わせる"
```
