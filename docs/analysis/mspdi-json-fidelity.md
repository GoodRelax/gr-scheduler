# GR Scheduler JSON ↔ MSPDI XML フィデリティ・マトリクス

**対象**: gr-scheduler の主データ形式 JSON と MS Project 交換形式 MSPDI XML の相互変換における情報層の損失分析
**作成日**: 2026-07-19
**根拠**: JSON SSOT [`docs/api/gr-scheduler.schema.json`](../api/gr-scheduler.schema.json) ／ 実装 [`src/domain/usecase/mspdi-codec.ts`](../../src/domain/usecase/mspdi-codec.ts) ／ 仕様 [`docs/spec/40-data-format.sdoc`](../spec/40-data-format.sdoc) §2 ／ MSPDI スキーマ `docs/spec/vendor/mspdi/mspdi_pj12.xsd`

---

## 0. 要旨

JSON と MSPDI XML は**得意分野が異なる 2 つのデータモデル**であり、損失は双方向・非対称に生じる。

- **GR JSON → MSPDI**: 消えるのは主に**「見た目（プレゼンテーション）」の層** — MSPDI には視覚・レイアウトのモデルが無い。
- **MSPDI → GR JSON**: 消えるのは主に**「工数・資源・制約（スケジューリング意味論）」の層** — GR JSON にはこれらのモデルが無い。

損失は 2 種類に分かれ、本書はこの区別で書く。

| 種類 | 意味 | 修正可能性 |
|------|------|-----------|
| **【形式差】** | 変換先モデルに概念が**そもそも無い**（本書の主題） | 原則不能。根治にはモデル拡張が要る |
| **【実装漏れ】** | 両形式とも表現**できる**のに codec が写していない | **codec 改修で解消可**（§5） |

> なお実装は、GR→MSPDI の往復救済のため文書全体を Project の Notes に同梱する「サイドカー」を持つが、これは自己往復専用の回避策であり、以降は**形式差そのもの**を論じる。

**凡例**: ○=変換先の形式に対応概念あり ／ ◐=近似のみ ／ ✕=形式に概念が無く消える（【形式差】）

---

## 1. Export: GR JSON → MSPDI XML（消えるのは「見た目」の層）

MSPDI は「タスク・日付・依存・階層・資源・工数」を持つが、**アイコン・色・注釈・表示状態といった視覚モデルを一切持たない**。したがって GR の視覚・レイアウト情報は形式的に表現先が無い。

| GR JSON の概念（フィールド） | MSPDI での表現 | 可否 | 種類 |
|------------------------------|----------------|:---:|------|
| `title` | `Project/Title` | ○ | — |
| `epochDate`（時間軸原点） | `Project/CreationDate`（意味は近い別物） | ◐ | — |
| アイテムの日付 `startDate`/`endDate` | `Task/Start`・`Task/Finish` | ○ | — |
| `itemKind`（task/milestone） | `Task/Milestone` | ○ | — |
| 名称 `fullName`/`abbrev` | `Task/Name`（単一文字列） | ○ | — |
| 依存の存在 `dependencies[]` | `Task/PredecessorLink` | ○ | — |
| 行/セクション階層 `sections`/`rows` | `Task/OutlineLevel`・`Summary` | ○ | 実装漏れ(§5-1) |
| 担当 `assignee` | `Assignments/Assignment`(Resource) | ○ | 実装漏れ(§5-2) |
| 進捗 `progressRatio` | `Task/PercentComplete` | ○ | 実装漏れ(§5-3) |
| 予実/変更前予定 `planActualKind`/`previousPlan` | `Baseline*`・`ActualStart/Finish` | ○ | 実装漏れ(§5-4) |
| 説明 `description` | `Task/Notes` | ○ | 実装漏れ(§5-6) |
| **アイコン**（`milestoneShape`/`taskShape`/`iconShapeKind`） | — | **✕** | **形式差** |
| **色・線幅**（`fillColor`/`strokeColor`/`lineWeight`） | — | **✕** | **形式差** |
| **略称位置**（`labelPosition`/`labelOffset`） | — | **✕** | **形式差** |
| **コメント/丸角囲み** `annotations[]` | — | **✕** | **形式差** |
| **透かし** `viewState.watermark` | — | **✕** | **形式差** |
| **表示状態** `viewState`（ズーム/スクロール/カーソル/テーマ/フォント） | — | **✕** | **形式差** |
| **依存の配線** `fromAnchor`/`toAnchor`(9点)/`bends`/`strokeColor` | — | **✕** | **形式差** |
| **マルチバー行帰属** `item.rowId`（1 行に複数アイテム） | 近似 `SplitParts`／サマリ化のみ | **◐/✕** | 形式差(近似) |
| **多言語** activeLocale 以外のロケール値 | — | **✕** | **形式差** |
| インポート画像 `assets[]` | — | **✕** | **形式差** |
| LOD 重要度 `importance` | `Task/Priority`（近似） | ◐ | 実装漏れ(近似) |

**要点**: GR→MSPDI で**本質的に消える（✕）のは視覚・レイアウト層のみ**。階層・担当・進捗・予実・説明は MSPDI 形式に受け皿があり（○）、消えているのは実装漏れ（§5）。

---

## 2. Import: MSPDI XML → GR JSON（消えるのは「工数・資源・制約」の層）

GR JSON は視覚モデルを持つが、**工数(Work)・コスト・稼働カレンダー・制約・タスク種別といったスケジューリング意味論のモデルを持たない**。したがって MSPDI 側のこれらは表現先が無い。

| MSPDI の概念 | GR JSON での表現 | 可否 | 種類 |
|--------------|------------------|:---:|------|
| `Title`・`CreationDate` | `title`・`epochDate` | ○ | — |
| `Task` UID/Name/Start/Finish/Milestone | アイテム基本属性 | ○ | — |
| `PredecessorLink`（存在） | `dependencies[]` | ○ | — |
| `OutlineLevel`・`Summary`（階層） | `sections`/`rows` | ○ | 実装漏れ(§5-1) |
| `Assignment`（担当名） | `assignee` | ○ | 実装漏れ(§5-2) |
| `PercentComplete`（進捗） | `progressRatio` | ○ | 実装漏れ(§5-3) |
| `Baseline*`・`ActualStart/Finish`（実績・基準） | `previousPlan`/`planActualKind` | ○ | 実装漏れ(§5-4) |
| `SplitParts`（分割タスク） | マルチバー（1 行複数アイテム） | ○ | 実装漏れ(§5-5) |
| `Task/Notes`（メモ） | `description` | ○ | 実装漏れ(§5-6) |
| **依存の種別** `PredecessorLink/Type`(FS/SS/FF/SF) | — | **✕** | **形式差**（§6候補） |
| **依存のラグ** `LinkLag` | — | **✕** | **形式差** |
| **工数・所要** `Work`・`Duration` | — | **✕** | **形式差** |
| **コスト** `Cost`・`BaselineCost` | — | **✕** | **形式差** |
| **稼働カレンダー** `Calendars`（休日/稼働時間） | — | **✕** | **形式差** |
| **制約**（スケジューラを縛るルール）`ConstraintType`/`ConstraintDate` | — | **✕** | **形式差** |
| **期限**（目標終了日マーカー）`Deadline` | — | **✕** | **形式差**（§6 で採用検討） |
| **タスク種別** `Type`(Fixed*)・`EffortDriven` | — | **✕** | **形式差** |
| **資源配分** `Assignment/Units`・`Work` | — | **✕** | **形式差** |
| **スラック/クリティカル** `FreeSlack`/`Critical` | —（派生値） | ✕ | 形式差(派生) |
| カスタム列 `ExtendedAttribute` | — | ✕ | 形式差 |
| プロジェクト属性 `Author`/`Manager`/`Company`/`CurrencySymbol` 等 | — | ✕ | 形式差 |

> 依存種別の略号: **FS**=Finish-to-Start(終了→開始・最も一般的), **SS**=Start-to-Start, **FF**=Finish-to-Finish, **SF**=Start-to-Finish。MSPDI の `Type` 値は FF=0/FS=1/SF=2/SS=3。

> **注（制約・期限は「予定終了日」とは別物）**: GR の `endDate` は MSPDI `Finish`（＝依存・所要から**計算されて配置された終了日**）に対応し、これは保持される。消えるのは「この日までに開始/終了すべき」という**制約(Constraint)** や「本来ここまでに終えたい」という**目標(Deadline)** の**意図の層**であって、予定終了日そのものではない。なお MS Project の `Start`/`Finish` は計算出力、制約・期限はその計算への別入力メタ情報。

**要点**: MSPDI→GR で**本質的に消える（✕）のは工数・資源・制約・依存種別**。名称・日付・階層・担当・進捗は GR に受け皿があり（○）、消えているのは実装漏れ（§5）。

---

## 3. 往復の形式差サマリ

| 情報層 | GR JSON | MSPDI | 変換で本質的に消える方向 |
|--------|:---:|:---:|------|
| 視覚（アイコン/色/略称位置/注釈/透かし/表示状態/配線） | ●豊富 | ✕無 | **GR→MSPDI** で消える |
| マルチバー（1 行複数アイテム） | ●中核 | ◐分割で近似 | **GR→MSPDI** で崩れる |
| 多言語 | ●対応 | ✕単一名 | **GR→MSPDI** で activeLocale 以外消える |
| 工数・コスト・カレンダー・制約・タスク種別・資源配分 | ✕無 | ●豊富 | **MSPDI→GR** で消える |
| 依存の種別(SS/FF/SF)・ラグ | ✕無 | ●対応 | **MSPDI→GR** で消える |
| タスク/日付/Milestone/階層/担当/進捗/予実/依存の存在 | ● | ● | 形式的には両立可（実装次第、§5） |

**結論**: GR は「見た目」を、MSPDI は「工数・資源・制約」を、それぞれ相手側で失う。これが JSON⇔XML の情報層差の全体像である。

---

## 4. （参考）現在の codec が標準要素に出す/読む範囲

形式差とは別に、現実装が扱う標準 MSPDI 要素は限定的である（詳細は §5）。

- **Export** [mspdi-codec.ts](../../src/domain/usecase/mspdi-codec.ts): `Title`/`CreationDate` と各 `Task{UID,Name,Start,Finish,Milestone,OutlineLevel=1,PredecessorLink(Type=1 固定)}` のみ。
- **Import**（サイドカー無し）: `Title`/`CreationDate` と `Task{UID,Name,Start,Finish,Milestone,PredecessorLink/PredecessorUID}` のみ読取。**それ以外は破棄**し、全タスクを単一行 `row-0` に集約。

---

## 5. 現在の実装漏れ（修正対象）

**両形式とも表現できるのに codec が写していない分**。JSON データ構造の限界ではなく実装の未対応であり、改修で解消できる。`project-records/defects/`(defect) / CR 起票候補。

| # | 実装漏れ | 本来可能な対応 | 現状 |
|---|---------|---------------|------|
| **5-1** | 行/セクション階層 | `OutlineLevel`+`Summary` で双方向変換（仕様 `DATA-MSPDI-005`） | Export は `OutlineLevel` を 1 固定・サマリ未生成／Import は階層を読まず `row-0` に集約 |
| **5-2** | 担当 `assignee` ⇔ Resource/Assignment | Resource として出力・読取 | 双方向とも未対応 |
| **5-3** | 進捗 `progressRatio` ⇔ `PercentComplete` | 数値をそのまま往復 | 双方向とも未対応 |
| **5-4** | 予実/変更前予定 ⇔ `Baseline*`/`ActualStart/Finish` | 予実を Baseline・実績日付で表現 | 未対応 |
| **5-5** | 分割タスク `SplitParts` → マルチバー | 分割区間を GR の 1 行複数アイテムへ写す（GR 構造上は表現可能） | Import が `SplitParts` を無視し連続バーに潰す |
| **5-6** | 説明 `description` ⇔ `Task/Notes` | タスク単位 Notes に格納 | 未対応（Project 単位 Notes をサイドカーが占有中のため配置設計が要る） |

> 補足: 5-5 の分割タスクは、皮肉にも本製品のコア差別化「マルチバー」と同概念でありながら現状は捨てている。優先度の高い修正候補。

---

## 6. GR 側に取り込むべき推奨項目

**MSPDI→GR で形式差（✕）となっている項目のうち、GR JSON モデルへ追加する価値があるもの**を提案する。製品は自動車開発の「日程表（俯瞰）ツール」であり資源平準化エンジンではない点を踏まえ、採否を判断した。

| 項目 | 現状の受け皿 | 推奨 | 理由 |
|------|-------------|:---:|------|
| **担当者** `assignee` | モデルに**有**（配線のみ） | **採用（最優先）** | すでにフィールドがあり、Resource 往復を実装するだけ。日程表で担当明示は必須級。実体は §5-2 の実装作業 |
| **進捗率** `progressRatio` | モデルに**有**（配線のみ） | **採用** | 予実可視化の中核。§5-3 の実装作業 |
| **予実・変更前予定** | モデルに**有**（配線のみ） | **採用** | イナズマ線/グレー表示の要。Baseline 往復で他ツール可視に。§5-4 |
| **依存の種別**（FS/SS/FF/SF） | モデルに**無** | **採用推奨（モデル拡張）** | スケジュール論理の基本。`dependencies[]` に `linkType` を追加すれば MSPDI と往復可能。低コスト高価値 |
| **依存のラグ**（リード/ラグ日数） | モデルに**無** | 条件付き採用 | 種別とセットで意味を持つ。種別追加時に併せて `lagDays` を検討 |
| **所要/工数** `Duration`/`Work` | モデルに**無** | 見送り（要検討） | 日付で足りる俯瞰用途では過剰。資源計画に踏み込むなら別途 CR |
| **コスト** `Cost` | モデルに**無** | 見送り | 製品スコープ外（原価管理は非目的） |
| **稼働カレンダー** `Calendars` | モデルに**無** | 見送り | 休日計算は俯瞰日程表の目的外。将来の自動再計算導入時に再評価 |
| **制約**（ルール）`ConstraintType`/`ConstraintDate` | モデルに**無** | 見送り（将来） | スケジューラを縛るルール。GR は手動配置でエンジンが無く適用先が無い。自動スケジューリング導入時に再評価 |
| **期限（目標終了日）** `Deadline` | モデルに**無** | **採用検討** | バー端と独立した「◆ここまで」目標マーカー。俯瞰日程表と相性良。`item.targetDate` 追加で表現でき、遅延の可視化にも使える |
| **タスク種別/資源配分** `Type`/`Units` | モデルに**無** | 見送り | 資源平準化前提の概念。製品方向と不一致 |

**推奨の要約**:
1. **即実装（モデル変更なし）**: 担当者・進捗・予実 — フィールドは既にあり、codec の配線だけ（§5-2〜5-4）。
2. **モデル拡張して採用/検討**: 依存の**種別**（+必要ならラグ）と**期限（目標終了日マーカー）** — いずれも低コストで、前者は MSPDI 相互運用、後者は日程表の目標可視化に効く。
3. **見送り**: 工数・コスト・カレンダー・**制約(ルール)**・資源配分 — 「俯瞰日程表」という製品スコープ外。将来、自動再計算や資源計画へ拡張する場合に CR で再評価。

---

*本分析は 2026-07-19 時点の実装とスキーマに基づく。実装変更時は再検証すること。*
