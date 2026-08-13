# 図 F-005 — コンポーネント

**UID**: DOC-FIG-COMPONENTS
**Version**: 0.1

**本書は 図 F-005 とその読み方だけを持つ。** 部品の責務は `05-07-design.md` の 表 T-046 が持ち、**ここに責務を書かない（MUST NOT）。** 層の凡例は同書の 図 F-007 が持つ。

本書は `05-07-design.md` の Chapter 5.2 から参照される。

## 1. 図

**Type**: SECTION

**色は 図 F-007 の凡例と同じである。** 矢印は「呼ぶ」向きであり、依存の向きと同じである。**すべての矢印が内側の層を向いていることが、この図で確かめるべきことである。**

**図 F-005 — コンポーネント**

```mermaid
graph RL
    subgraph FW["Framework"]
        direction TB
        BrowserDom["BrowserDom"]:::framework
        FileSystemAccess["FileSystemAccess"]:::framework
        LocalStorage["LocalStorage"]:::framework
        SingleFileShell["SingleFileShell"]:::framework
    end
    subgraph AD["Adapter"]
        direction TB
        ViewAdapter["ViewAdapter"]:::adapter
        AgentApi["AgentApi"]:::adapter
        SvgSerializer["SvgSerializer"]:::adapter
        JsonCodec["JsonCodec"]:::adapter
        MspdiCodec["MspdiCodec"]:::adapter
        StorageGateway["StorageGateway"]:::adapter
    end
    subgraph UC["Use Case"]
        direction TB
        CommandExecutor["CommandExecutor"]:::usecase
        RevisionGuard["RevisionGuard"]:::usecase
        UndoHistory["UndoHistory"]:::usecase
        ImportValidator["ImportValidator"]:::usecase
        ChangeNotifier["ChangeNotifier"]:::usecase
    end
    subgraph EN["Entity"]
        direction TB
        DocumentModel["DocumentModel"]:::entity
        TimeAxis["TimeAxis"]:::entity
        RowLayout["RowLayout"]:::entity
        AlignmentSolver["AlignmentSolver"]:::entity
        DetailSelector["DetailSelector"]:::entity
        DependencyRouter["DependencyRouter"]:::entity
        ProgressGeometry["ProgressGeometry"]:::entity
        FitCalculator["FitCalculator"]:::entity
    end

    BrowserDom --> ViewAdapter
    SingleFileShell --> AgentApi
    FileSystemAccess --> StorageGateway
    LocalStorage --> StorageGateway

    ViewAdapter --> CommandExecutor
    AgentApi --> CommandExecutor
    StorageGateway --> JsonCodec
    StorageGateway --> MspdiCodec
    JsonCodec --> CommandExecutor
    MspdiCodec --> CommandExecutor

    ViewAdapter --> TimeAxis
    ViewAdapter --> RowLayout
    SvgSerializer --> RowLayout
    SvgSerializer --> DependencyRouter
    SvgSerializer --> ProgressGeometry

    CommandExecutor --> RevisionGuard
    CommandExecutor --> ImportValidator
    CommandExecutor --> UndoHistory
    CommandExecutor --> ChangeNotifier
    CommandExecutor --> DocumentModel
    CommandExecutor --> AlignmentSolver
    CommandExecutor --> FitCalculator

    RevisionGuard --> DocumentModel
    UndoHistory --> DocumentModel
    ChangeNotifier --> DocumentModel
    RowLayout --> DocumentModel
    RowLayout --> DetailSelector
    DependencyRouter --> RowLayout
    ProgressGeometry --> RowLayout
    FitCalculator --> RowLayout
    AlignmentSolver --> DocumentModel
    TimeAxis --> DocumentModel

    classDef entity fill:#FF8C00,stroke:#333,color:#000
    classDef usecase fill:#FFD700,stroke:#333,color:#000
    classDef adapter fill:#90EE90,stroke:#333,color:#000
    classDef framework fill:#87CEEB,stroke:#333,color:#000
```

## 2. この図で確かめること

**Type**: SECTION

| 確かめること | 図のどこに出ているか |
| --- | --- |
| 書き込みの入口が 1 つであること | `ViewAdapter` と `AgentApi` の矢印が、どちらも `CommandExecutor` へ入る |
| 書き込みの経路が 1 本であること | `DocumentModel` へ向かう `Use Case` の矢印のうち、値を変えるのは `CommandExecutor` からの 1 本だけである |
| 描画が書き込みの経路でないこと | `SvgSerializer` の矢印が `Use Case` を通らず `Entity` へ直接入る |
| 依存が内向きであること | `Entity` から外へ出る矢印が 1 本も無い |

⚠️ **`ChangeNotifier` から `ViewAdapter` と `AgentApi` への通知は、依存の向きと逆なので図に矢印として描いていない。** 実装では**外側が購読する形**にし、内側が外側の型を知らないままにすること（MUST）。順序は 図 F-006 が持つ。
