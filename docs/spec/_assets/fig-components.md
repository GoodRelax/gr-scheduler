# 図 — コンポーネント

**UID**: DOC-FIG-COMPONENTS
**Version**: 0.1

**本書は図だけを持つ。** 部品の責務と機器の対応は `05-07-design.md` の Chapter 5.2 が表として持つ。**ここに責務を書かない（MUST NOT）。**

## 1. 全体

**Type**: SECTION

**図 F-005 — コンポーネントの全体**

**枠は層である**（`05-07-design.md` の 表 T-045）。**矢印は「呼ぶ」向きであり、依存の向きと同じである。** すべての矢印が内側を向いていることが、この図で確かめるべきことである。

```mermaid
flowchart TB
    subgraph FW["土台"]
        direction LR
        DOM["ブラウザと DOM"]
        FILE["ファイルへの読み書き"]
        LS["localStorage"]
    end
    subgraph AD["接続"]
        direction LR
        VIEW["画面の接続"]
        AGENT["Agent API"]
        SER["SVG の直列化"]
        CODEC["JSON と MSPDI の変換"]
        IO["入出力の門"]
    end
    subgraph UC["操作層"]
        direction LR
        CMD["命令の実行"]
        HIST["履歴"]
        VAL["取り込みの検証"]
        NOTE["変更の通知"]
    end
    subgraph EN["中核"]
        direction LR
        MODEL["文書のモデル"]
        GEOM["幾何<br/>時刻と座標・縦積み・整列<br/>選別・依存線の経路・遅れの頂点"]
    end

    DOM --> VIEW
    FILE --> IO
    LS --> IO
    VIEW --> CMD
    AGENT --> CMD
    IO --> CODEC
    CODEC --> CMD
    CMD --> VAL
    CMD --> HIST
    CMD --> NOTE
    CMD --> GEOM
    CMD --> MODEL
    NOTE --> VIEW
    NOTE --> AGENT
    SER --> GEOM
    VIEW --> GEOM
    SER --> DOM
```

⚠️ **`SVG の直列化` から `幾何` への矢印が操作層を通っていないことが、この図の要点である。** 描画は**読み取りの経路**であって書き込みの経路ではない。書き込みの経路は `命令の実行` の 1 本しかない。

## 2. 書き込みの経路

**Type**: SECTION

**図 F-006 — 書き込みは 1 本の関門を通る**

**人が画面から行う編集と、`Agent API` から行う編集は、同じ関門を通る。** 関門を通らない書き込みの経路は存在しない。

```mermaid
sequenceDiagram
    participant H as 人（画面）
    participant A as AI（Agent API）
    participant C as 命令の実行
    participant V as 検証
    participant M as 文書のモデル
    participant N as 変更の通知

    H->>C: 命令（誰が出したかを添える）
    A->>C: 同じ命令（誰が出したかを添える）
    C->>V: 基準の版と中身を確かめる
    V-->>C: 受理／拒否
    Note over C: 拒否なら文書を変えずに値で返す
    C->>C: 直前の状態を履歴へ積む
    C->>M: 不変の更新で置き換える
    C->>C: 版数を 1 つ上げ、最後に書いた者を記す
    C->>N: 変わったことを知らせる
    N-->>H: 画面を描き直す
    N-->>A: 自分以外が確定した変更だけを通知する
```

⚠️ **版数を上げることと知らせることを、この関門の外で行ってはならない（MUST NOT）。** 外で行える経路を 1 本でも作ると、**版数が上がったのに誰も知らない状態**が生まれる。前プロジェクトの共同編集の試作は、受理した書き込みをすべて 1 つの関門に通すことでこれを防いでいた。
