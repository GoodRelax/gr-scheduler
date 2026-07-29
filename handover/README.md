# gr-scheduler 引継ぎ資産（次期開発への入力）

- 日付: 2026-07-26
- 由来: gr-scheduler 第1次プロジェクト（2026-07-18 〜 2026-07-26）
- 目的: 次期開発を **ノイズの少ない状態で最初から** 走らせるための、厳選した入力一式。
- **このフォルダだけを次期リポジトリへ持っていけばよい。**

---

## 0. 5 つの原則（最初に読む）

### 0-1. コードは引き継がない。**コピペ禁止**

前プロジェクトの `src/` は **全て旧名**（`item` / `itemKind` / `laneIndex` / `section` /
`ScheduleItem` …）で書かれている。確定名は `03-ui-naming/handover-ui-parts-ja.md` にある。
**コピペは旧語彙を次期に流入させ、前プロジェクトのバグ根因（語彙の重複）を再生産する。**

参考として読むことは許す。**写すことは禁止する。** 命名規則を中心に、**完全新規に設計・実装する**。

例外として設計の要点だけ言語化した 3 領域（依存線の自動配線 / 多段レイアウト / ズーム・パンの
描画経路）が `04-performance/handover-performance-notes-ja.md` §4 にある。
そこでも実物はパス参照に留めてある。

### 0-2. ぬるサクが最優先。**骨格の段階で性能を実測してから機能を積む**

`user-order.md` 最優先事項 1。前プロジェクトは M1 ウォーキングスケルトンで性能 PoC ゲートを
置いた（この順序は正しかった）が、**その 1 回で終わり、完成版を一度も計測しなかった**。

次期は骨格段階で自分の数字を取り、**節目ごとの再計測を工程表に書く**。
詳細と実測基準線は `04-performance/`。

### 0-3. MSPDI の事実は **必ず正本 XSD で検証する**

`01-mspdi/mspdi/mspdi_pj12.xsd` が正本。日本語の要約文書（`mspdi-*-ja.md`）は**参考であって正ではない**。
「XSD にこう書いてあった」を根拠にすること。

### 0-4. **記録番号（`CR-xxx` / `DEF-xxx` / `DEC-xxx` / `ADR-xxx` / `RISK-xxx` / `IO-L1-006` 等）は無視してよい**

文書中に前プロジェクトの記録番号が **約 185 箇所**出てくる。**その原典は `handover/` に入っていない**
（変更要求・不具合記録・決定記録・リスク台帳・`.sdoc` 仕様書はいずれも「参考」扱いで外した。`DISCARDED-ja.md`）。

**番号の中身は、必要なものはすべて本文に書いてある。** 例えば「DEF-009（実績バーが名称ラベルを覆う不具合）」
のように、番号のあとに何が起きたかが書いてある。**番号は出典の印であって、参照しないと読めない箇所は無い。**

- **次期は自分の番号体系を振り直すこと。** 前プロジェクトの番号を引き継ぐ意味はない。
- 番号だけで内容が分からない箇所を見つけたら、それは**本文の書き漏れ**である。凍結リポジトリで原典を確認できる。

### 0-5. **特定の業種・特定の製品に依存しない**

本ツールは**業種を問わない汎用の日程表ツール**である。前プロジェクトの文書には特定業種の例示と
特定製品名が混ざっていたため、**本フォルダでは中立な語に置き換えた**（記録は `NEUTRALIZED-TERMS-ja.md`）。

- 例示は**業種に依存しない語**で書く（「対象」「製品A」「企画/設計/検証/展開」）。
- 対向ツールは**役割名**で呼ぶ（「外部 WBS マスタ」）。製品名を仕様に埋め込まない。
- **例外は `MS Project` / `MSPDI`** のみ。これは交換フォーマットの相手先＝機能要求そのもの
  （`user-order.md` 56）であり、業種の限定ではない。
- 次期でも**この中立性を維持する**こと。特定業種向けに読める記述を足さない。

---

## 1. 読む順

| 順 | ファイル | 何が書いてあるか | 性質 |
|:--:|---|---|---|
| **1** | **`user-order.md`** | **次期開発の入力そのもの**（項 1〜68。うち 11 と 14 は取り下げ済みの欠番なので実質 66 項目。＋「やらないこと」＋「決着した仕様」） | **これが正** |
| **2** | **`01-mspdi/mspdi-pitfalls-ja.md`** | **MSPDI 実装の落とし穴**。素直に実装すると必ず踏む罠 | **製品に依存しない**。最優先 |
| 3 | `01-mspdi/mspdi-enums-ja.md` | enum 全数（53 要素 / 535 値） | 同上。実装時に必携 |
| 4 | `01-mspdi/mspdi-core-tree.md` / `mspdi-tables.md` | MSPDI の構造・全 29 テーブルの責務 | MSPDI 自体の理解 |
| **5** | **`04-performance/handover-performance-notes-ja.md`** | **ぬるサクの引継ぎ**。効いた手 / 効かなかった手 / 踏んだ罠 / 実測基準線 / 参考実装の設計要点 | **経験の記録**。設計前に読む |
| 6 | `02-data-model/handover-data-model-entry-ja.md` | データ構造の**入口**。読む順と JSON 実例 | 入口 |
| 7 | `02-data-model/grs-mspdi-field-ledger-ja.md` | 全要素の取捨選択（Own / Consume / Reconstruct / Carry / Drop） | 仕分けの実例。枠組み自体が再利用できる |
| **8** | **`02-data-model/grs-native-erd-ja.md`** | **データ構造の確定版**。ERD・識別子・マージ・Carry ストア・往復規約 | **データ構造の正** |
| 8b | `02-data-model/handover-property-mspdi-mapping-ja.md` | プロパティ全項目の MSPDI 対応（XSD 実測）・**進捗と実績の関係**・無い項目の格納方式 3 案比較 | 項目を増やす前に読む |
| **9** | **`03-ui-naming/handover-ui-parts-ja.md`** | **UI パーツ名と責務**（確定名）。語彙 6 系統 → 3 語。**面ごとの記法と語幹一致の規則**もここ | **命名の正** |
| 9b | `03-ui-naming/handover-ui-detail-spec-ja.md` | **UI 詳細仕様**。4 部構成の内訳・上部ボタン・パレット構成・**掴み領域**・操作割当・自動レイアウト規則 | 実装前に読む |
| **10** | **`07-plan-actual/handover-plan-actual-decisions-ja.md`** | **予実・進捗の確定設計**。MSPDI の `Stop`/`Resume`/`ResumeValid` をそのまま使うモデル・4 状態・字形・Progress Marker・イナズマ線の頂点規則・Undo・命名 | **この領域はここが正**。⚠️ 8b と 9b の予実まわりを**上書きする**（同書 §9 に差分の全数） |
| 11 | `05-security-a11y/security-design.md` | 脅威モデル・**JSON / MSPDI XML** の検証・単一 HTML の CSP | 要求として生きている（`user-order.md` 62）。⚠️ **冒頭の注記を先に読む** — SVG/PNG 取込の節は**対象機能が取り下げ済み** |
| 12 | `05-security-a11y/a11y-wcag21-aa-checklist.md` | WCAG 2.1 AA チェックリスト | 有効な条件付きプロセス |
| 13 | `06-background/` | 経緯（監査・改訂差分・バグ根因分析・未決論点） | **迷ったとき**に読む |
| — | `NEUTRALIZED-TERMS-ja.md` | **ドメイン語・製品名を中立化した記録**（凍結リポジトリの原本との差分） | 原本を併読するとき必要 |

> **迷ったら 8（データ）と 9（命名）を見る。** 2〜4 は前提知識、6 は入口、13 は経緯。

### 1-1. 文書内のパス表記の読み替え

`handover/` 内の文書は**凍結リポジトリからのコピーを出発点に、その後の決定を反映したもの**である。
**パス表記だけは元リポジトリのまま**なので下表で読み替える。
（中立化の記録は `NEUTRALIZED-TERMS-ja.md`。それ以降に確定した内容は各文書に「確定 2026-07-26」と明記してある。）

| 文書中の表記 | `handover/` 内の位置 |
|---|---|
| `docs/spec/vendor/mspdi-*.md` | `01-mspdi/mspdi-*.md` |
| `docs/spec/vendor/mspdi/mspdi_pj12.xsd` | `01-mspdi/mspdi/mspdi_pj12.xsd` |
| `docs/spec/_assets/grs-*.md` / `handover-data-model-entry-ja.md` | `02-data-model/` |
| `docs/spec/_assets/handover-ui-parts-ja.md` | `03-ui-naming/` |
| `docs/spec/glossary.md`（前プロジェクトの用語集） | **`handover/` には無い**。旧名で書かれているため外した（`DISCARDED-ja.md` §3） |
| `docs/spec/_assets/handover-performance-notes-ja.md` | `04-performance/` |
| `docs/security/security-design.md` / `docs/dev/a11y-wcag21-aa-checklist.md` | `05-security-a11y/` |
| `docs/spec/_assets/handover-stale-spec-audit-ja.md` / `handover-user-order-diff-ja.md` / `docs/analysis/refactor-gui-data-separation-ja.md` / `plan-actual-visibility-operability-model-ja.md` | `06-background/` |
| `old/日程管理ツール.md`（既存ツール比較の調査記録） | **`handover/` には無い**。特定製品の評価を含むため外した（`DISCARDED-ja.md` §3） |
| 上表に無いパス（`src/` / `tests/` / `.sdoc` / `project-records/` 等） | **`handover/` には無い**。凍結リポジトリを見る。理由は `DISCARDED-ja.md` |

---

## 2. フォルダの構成

```
handover/
├── README.md                        この文書
├── DISCARDED-ja.md                  破棄した資産とその理由（同じものを作り直さないため）
├── NEUTRALIZED-TERMS-ja.md          ドメイン語・製品名の中立化記録（原本との差分）
├── user-order.md                    次期開発の入力
│
├── 01-mspdi/                        MSPDI の事実（製品に依存しない・そのまま再利用可）
│   ├── mspdi-pitfalls-ja.md         落とし穴（最優先で読む）
│   ├── mspdi-enums-ja.md            enum 全数
│   ├── mspdi-core-tree.md           構造
│   ├── mspdi-tables.md              全 29 テーブルの責務
│   └── mspdi/
│       ├── mspdi_pj12.xsd           ★正本（MS Project 2012 MSPDI スキーマ）
│       ├── README.md                入手元・ライセンス・使い方
│       └── LICENSE                  上流ドキュメントのライセンス
│
├── 02-data-model/                   GRS のデータ構造（確定版）
│   ├── handover-data-model-entry-ja.md   入口・読む順・JSON 実例
│   ├── grs-native-erd-ja.md              ★データ構造の正（14 エンティティ・2 軸）
│   ├── grs-mspdi-field-ledger-ja.md      MSPDI 全要素の取捨選択台帳
│   ├── handover-property-mspdi-mapping-ja.md  プロパティ×MSPDI 対応・進捗と実績・格納方式3案
│   └── grs-data-model-ja.md              §8 に設計判断の変遷（却下案とその理由）
│
├── 03-ui-naming/                    命名（1 概念 1 語）
│   ├── handover-ui-parts-ja.md      ★UI パーツ名と責務の確定版
│   └── handover-ui-detail-spec-ja.md  UI 詳細仕様（画面構成・掴み領域・操作割当・予実の編集モデル）
│
├── 04-performance/                  ぬるサク
│   └── handover-performance-notes-ja.md  ★効いた手 / 罠 / 実測基準線 / 参考実装
│
├── 05-security-a11y/
│   ├── security-design.md           脅威モデルとサニタイズ設計
│   └── a11y-wcag21-aa-checklist.md  WCAG 2.1 AA
│
├── 06-background/                   経緯（迷ったときに読む）
│   ├── handover-stale-spec-audit-ja.md              旧仕様の陳腐化監査
│   ├── handover-user-order-diff-ja.md               user-order 改訂の差分と理由
│   ├── refactor-gui-data-separation-ja.md           **バグ根因の分析**（画面とデータの語彙混在）
│   └── plan-actual-visibility-operability-model-ja.md  予実の可視性/操作性モデル（**旧案。07 が上書き**）
│
└── 07-plan-actual/                  予実・進捗の確定設計（この領域の正）
    └── handover-plan-actual-decisions-ja.md
                                     MSPDI 準拠モデル・4 状態・字形・Progress Marker
                                     イナズマ線の頂点規則・Undo・命名
                                     ⚠️ §9 に「既存文書のどこを上書きするか」の全数
```

---

## 3. 次期の着手順（推奨）

1. `user-order.md` を読む。**冒頭「用語」節を先に読んで言葉を揃える**（揃えないまま細部を読むと誤解して手戻りになる）。次に**「やらないこと」節と末尾の「決着した仕様」**。
2. `04-performance/` を読む。**方式を決める前に骨格で性能を測る**（§0-2）。
3. `03-ui-naming/handover-ui-parts-ja.md` の確定名で**語彙を固定する**。ここを曖昧にすると再発する。振る舞いは `handover-ui-detail-spec-ja.md`。
4. `02-data-model/grs-native-erd-ja.md` でデータ構造を確定する。**画面とデータを分離**する（`user-order.md` 67）。
5. `01-mspdi/mspdi-pitfalls-ja.md` を読んでから MSPDI に着手する。往復無損失は**後付けできない**。
6. `05-security-a11y/` を実装方針に織り込む。**`innerHTML` 直挿し禁止・XXE 無効化**は設計時点の判断。

---

## 4. 引き継がなかったもの

`DISCARDED-ja.md` に**全数と理由**を記録した。**同じものを作り直さないために読む。**
特に以下は意図的に外している:

| 外したもの | 理由（詳細は DISCARDED-ja.md） |
|---|---|
| `src/` / `tests/`（実装とテスト 一式） | 全て旧名。**コピペ禁止**（§0-1） |
| `.sdoc` 19 本（293 要求） | 陳腐化を含み `user-order.md` に吸収済み。凍結リポジトリに**参考として残す** |
| `40-data-format.sdoc` / `gr-scheduler.schema.json` | 旧 flat 形状。`grs-native-erd-ja.md` が正（ユーザー明示で判断材料から除外） |
| `old/gr-scheduler-template.json` | **廃止済みの予実別行モデル**で書かれ、行 id に制御文字を含む |
| `old/日程管理ツール.md`（既存ツール比較の調査記録） | **特定製品の評価×特定業種**が前提の文書（§0-4）。結論は `user-order.md`「それはどうして？」に吸収済み |
| `process-rules/` / `essays/` | gr-sw-maker フレームワーク側の資産。次期でもフレームワークから供給される |
