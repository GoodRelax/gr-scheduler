# 図 — ドメインモデル

**UID**: DOC-FIG-DOMAIN-MODEL
**Version**: 0.1

**本書は図だけを持つ。** 列と型と制約の正は `tbl-datamodel.md`（`DOC-TBL-DATAMODEL`）である。**ここに列を書かない（MUST NOT）** —— 図と表の両方に列を持つと、片方だけが古くなる。

本書は `05-07-design.md` の Chapter 5.4 から参照される。

## 1. 全体

**Type**: SECTION

**図 F-003 — ドメインモデルの全体**

線のラベルは、その関係を担う列の名前である。**破線で描いたものは MSPDI へ書き出さない**（表 T-302 の `export` 欄）。

```mermaid
erDiagram
    Project ||--o{ Task : "tasks"
    Project ||--o{ Calendar : "calendars"
    Project ||--o{ Resource : "resources"
    Project ||--o{ Assignment : "assignments"
    Project }o--o| Calendar : "calendarId（既定の暦）"
    Project ||..o{ TaskGroup : "taskGroups"
    Project ||..o{ Comment : "comments"
    Project ||..o{ HighlightBox : "highlightBoxes"

    Task ||--o{ Task : "wbs_parent_uid（WBS の親）"
    Task }o--o| Calendar : "calendarId"
    Task ||--o{ Dependency : "successorUid（後続として）"
    Task ||--o{ Dependency : "predecessorUid（先行として）"
    Task ||..o| TaskVisual : "taskUid"
    Task ||..o| TaskOrigin : "taskUid"
    Task ||..o| TaskGroupMember : "taskUid"

    TaskGroup ||..o{ TaskGroup : "parentId（行の入れ子）"
    TaskGroup ||..o{ TaskGroupMember : "groupId"

    Calendar ||--o| Calendar : "baseCalendarId（土台）"
    Calendar ||--o{ WeekDay : "weekDays"
    Calendar ||--o{ Exception : "exceptions"

    Assignment }o--o| Task : "taskUid"
    Assignment }o--o| Resource : "resourceUid"
    Resource }o--o| Calendar : "calendarId"

    Comment }o..|| TaskGroup : "anchorGroupId"
    Comment }o..o| Task : "anchorTaskUid"
    HighlightBox }o..|| TaskGroup : "topGroupId / bottomGroupId"
```

## 2. 2 つの軸

**Type**: SECTION

**図 F-002 は Chapter 5.4 の本文が持つ。** 本節は、その 2 つの軸が交わる 1 点だけを図にする。

**図 F-004 — 同じ `Task` が 2 つの木に属する**

```mermaid
flowchart LR
    subgraph A["軸 A — WBS（書き出す）"]
        direction TB
        P1["Task 上位"] --> P2["Task 中位"]
        P2 --> P3["Task 末端"]
    end
    subgraph B["軸 B — 行（書き出さない）"]
        direction TB
        G1["TaskGroup 見出し"] --> G2["TaskGroup 行"]
    end
    P3 -. "TaskGroupMember が結ぶ" .-> G2
```

**軸 A の親子は `Task` どうしで、軸 B の親子は `TaskGroup` どうしである。** 交点は `TaskGroupMember` だけであり、**そこ以外で 2 つの木が触れ合わない。** この形が、行を動かしても WBS が動かないことを構造として保証している。
