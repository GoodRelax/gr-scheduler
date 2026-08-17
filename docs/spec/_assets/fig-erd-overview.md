# データモデル — 概要（文書の全体像）

**UID**: DOC-FIG-ERD-OVERVIEW
**Version**: 0.3

> ⛔ **本書は生成物である。手で直さない —— 直しても次の `npm run gen` で消える。**
> **唯一の正は `_source/erd.json` であり、本書はそれを `_source/erd_json_to_md.py` が書き出したものである。**
> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`（検査 16 が呼ぶ）。説明の散文は `05-07-design.md` が持つ。

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
    Document {
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
    Document ||--|| schedule : "日程データの群"
    Document ||--|| documentSettings : "見せ方の群"
    Document ||--|| revisionStamp : "文書の刻印"
    Document ||--o{ changeLog : "文書の刻印"
    schedule ||--o{ Dependency : "tasks の各要素の下に入れ子"
    schedule ||--o{ WeekDay : "calendars の各要素の下に入れ子"
    schedule ||--o{ Exception : "calendars の各要素の下に入れ子"
    schedule ||--o{ CarryElement : "carryElements を持つ 8 型の兄弟の鍵"
    documentSettings |o--|| schedule : "表示位置が指す行。弱い参照"
    documentSettings }o--|| schedule : "ピン止めした行。弱い参照"
```
