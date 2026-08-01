---
type: Open Items
title: 実開発ステップ別の欠落一覧
description: 次期の実開発で埋めるべき 18 件を、どのステップで埋めるかまで割り当てた一覧。
tags: [open-items]
phase: packaging
status: stable
---
# 実開発ステップ別の欠落一覧

- 日付: 2026-08-02
- 目的: **次期の実開発で「まだ決まっていないこと」の全数と、それを埋めるステップ。**
- 対象の順序は次期の実開発の順である:

```
1 要望ヒアリング → 2 UI モック作成 → 3 アーキ設計 → 4 データモデル設計
                 → 5 JSON/MSPDI 入出力設計 → 6 UI×データ複合動作
```

## この文書の読み方

**各行の「決まっていること」列は handover の一次資料に実際に当たって確かめた実測である。**
ここを読まずに着手すると、**既に決まっているものを決め直す**ことになる。それが前プロジェクトで
最も多く時間を溶かした失敗であった。

- **決まっていること** … 所在を書く。**本文はここに複製しない**
  （`DISCARDED-ja.md` の原則 4「**『正』が 2 つになるものは片方を破棄する**」）。
- **決めること** … これが残作業である。

`OPEN-ITEMS-ja.md` とは別物である。あちらは **MS Project の実機を触らないと分からない 3 件**であり、
本書は**次期が自分で決めれば済む 18 件**である。

---

## ステップ 1 — 要望ヒアリング（1 件）

### 1-1. 対象環境の定義

| | |
|---|---|
| **決まっていること** | 性能の目標値（初期描画 ≤ 1500 ms / 平均 ~60 FPS / p95 ~16.7 ms）と**ベンチの既定規模**（50 行 / 1000 アイテム）＝ `04-performance/handover-performance-notes-ja.md` §2。**基準の画面環境**（1920×1080 / ブラウザ全画面 / 拡大率 100% / ヘッダー領域の縦 50px）＝ `07-plan-actual/handover-plan-actual-decisions-ja.md` §2-4-1（同文が `08-poc/README.md` と `08-poc/OPEN-QUESTIONS-ja.md` Q7 にもある）。**CSP は 10 指令の骨格が確定**＝ `05-security-a11y/security-design.md` §4 |
| **決めること** | ① 対応ブラウザと版 ② 対応 OS ③ **タッチ・モバイル対応の要否**（`05-security-a11y/a11y-wcag21-aa-checklist.md` はスイッチ／音声入力での操作性を「未検証」としたまま。掴み代 6px・**フェード掴み点 15×15px** の根拠 WCAG 2.5.5 を AA 判定に数えるかもここで決まる） ④ **性能測定の基準マシンと基準ブラウザ**（`08-poc/README.md` が「別の環境で測れば別の数字が出る」と明記している） ⑤ **CSP の `img-src` の scheme**（`data:` / `blob:` が未決。`blob:` を選ぶと指令自体が変わる ＝ `05-security-a11y/security-design.md` §4） |

> **これが決まらないと性能ゲートが機能しない。** `README.md` §0-2 の「骨格の段階で性能を実測する」は
> 測定条件が固定されて初めて意味を持つ。**ステップ 1 で最初に決めること。**

---

## ステップ 2 — UI モック作成（6 件）

### 2-1. 視覚モック

| | |
|---|---|
| **決まっていること** | 画面の 4 部構成・上部ボタンの並び・パレットの内訳・掴み領域・操作割当 ＝ `03-ui-naming/handover-ui-detail-spec-ja.md` §1〜§5。UI パーツ名と責務 ＝ `03-ui-naming/handover-ui-parts-ja.md`（**命名の正**） |
| **決めること** | **絵が 1 枚も無い。** PoC（`08-poc/poc-integrated.html`）にあるのはキャンバス描画・形状の基準タブ・読取専用の Properties Panel だけで、**`Command Palette` / `Watermark` / `Comment Boxes` / `Highlight Boxes` は 6 本すべてに 0 件**である |

> 前プロジェクトの視覚モックは「**視覚的な目標としては有効**だが、コピペ誘因になる」として
> 意図的に外した（`DISCARDED-ja.md`）。**次期は確定名で描き直す。**

### 2-2. アイコンの図形定義

| | |
|---|---|
| **決まっていること** | 作画規則 ＝「**全て線画**。20×20 のデザイングリッドで作画し、太さを揃える」（`03-ui-naming/handover-ui-detail-spec-ja.md` §3）。アイコンが要る箇所の列挙も同 §2・§3 にある — **App Header（現行 11）**／パレット: タスク形状 4・マイルストーン 8・機能コマンド 7・**カーソル 6**（本日線 ＋ デュアル ＋ ガイド 4 モード）・予実トグル 2 |
| **決めること** | ① **図形そのものが 0 件。** `03-ui-naming/handover-ui-detail-spec-ja.md` §3 は「前プロジェクトのアイコン定義が参考になる」と書くが、**それは handover に入っていない**（形状の意図だけを引き継ぐ、という但し書きの側だけが残った） ② **必要数が確定しない。** 同 §2 の確定（2026-07-26）は App Header を**文書に対する操作 8 個**（`Fit` / `Load` / `Save` / `Base` / `Undo` / `Redo` / `AI` / `?`）と定義しており、**現行 11 個のうち `Cmd` / `SS` / `Theme` の行き先が書かれていない**。モックで確定させる |

> タスク形状（4 種）は**アイコンではなく描画対象**であり、作図の幾何まで確定している
> （`chevronNotchOfHeight` / `arrowHeadOfStroke` / `spanDotOfStroke` ほか ＝ `02-data-model/grs-document-settings-ja.md` §3）。
> **マイルストーン（8 種）は形状の集合と並び順だけが確定**（面積の大きい順 ＝
> `07-plan-actual/handover-plan-actual-decisions-ja.md` §2-2-2）。
> **六角形の向き・五角形の回転といった作図の幾何は未定**なので、ここはモックで決める。

### 2-3. i18n の表示文字列カタログ

| | |
|---|---|
| **決まっていること** | 対象言語は **en / ja の 2 つだけ**（それ以上に広げない）、項目名は `language`、値は `ja` / `en`（`user-order.md` 項 21）。**i18n キーの記法は snake_case**（`03-ui-naming/handover-ui-parts-ja.md` §1-2 ＝ **記法の正**）。**翻訳の対象はメニューとパネルの文字だけ**で、タスク名・行名は**データなので対象外**（`02-data-model/grs-document-settings-ja.md` §5-2）。UI パーツ名・プロパティ名の**英日対訳は 57 行ある**（`03-ui-naming/handover-ui-parts-ja.md` §2-1-1〜§2-1-4。機械カウント） |
| **決めること** | **キー付きの表示文字列カタログ（ボタン文言・ツールチップ・通知メッセージ）が 0 件。** 前プロジェクトの ja/en 対訳は「**パーツ名が確定名に変わったので使えない**」として破棄済み（`DISCARDED-ja.md`） |

> ⚠️ **`language` を `documentSettings` に入れてはならない。** 「どの言語で開くかは**読む人の環境**」であり、
> **文書には保存しない**（`user-order.md` 項 21）。置き場所は **`localStorage`**
> （`02-data-model/grs-document-settings-ja.md` §5-2 ＝ **設定値の正**）。
> 保存すると「日本語で作った文書を英語の利用者が開いたときにメニューまで日本語になる」。
> `localStorage` が読めないときは**ブラウザの言語設定に従う**（同 §5-2）。

### 2-4. Properties Panel の UI 設計

| | |
|---|---|
| **決まっていること** | **表示項目は全数確定している** — `user-order.md` 項 20 の表。項目名は**英語固定**（同 項 22）。MSPDI 対応は `02-data-model/handover-property-mspdi-mapping-ja.md`。パネル幅は `propertyPanelWidth` として文書に保存する（`02-data-model/grs-document-settings-ja.md` §4-2）。**PoC に読取専用の実装がある**（`08-poc/poc-integrated.html`） |
| **決めること** | 項目のグループ分け／入力ウィジェットの種別／編集可否／バリデーションの見せ方／**フォーカス順**。`03-ui-naming/handover-ui-parts-ja.md` の UI パーツ木で、**`Properties Panel` だけ子ノードが 1 行も無い** |

> ⚠️ **ここは a11y の適合根拠を預かっている。** `07-plan-actual/handover-plan-actual-decisions-ja.md` §7 は、
> ドラッグ操作の **WCAG 2.1.1（キーボード操作可能）適合を「Properties Panel で日付を入力できること」に預けて**おり、
> その到達性は「実装時に確認すること」のまま検証されていない。**このパネルの設計は a11y 要求である。**

### 2-5. 通知（Toast）の設計

| | |
|---|---|
| **決まっていること** | 支援技術への伝え方だけ ＝ `aria-live="polite"` / `role="status"`（`05-security-a11y/a11y-wcag21-aa-checklist.md`） |
| **決めること** | **`Toast` が UI パーツ木に無い**（`03-ui-naming/handover-ui-parts-ja.md` にヒット 0）。表示位置・滞留時間・多重時の積み方・i18n が未定 |

**通知の発生源は既に 8 系統ある。** 設計はこの 8 つを収容できること:

| # | 何を知らせるか | 所在 |
|:--:|---|---|
| 1 | 取込で「届かなかった」N 件 | `02-data-model/grs-native-erd-ja.md` |
| 2 | 連鎖削除の件数 | 同上 |
| 3 | 工数（`Work` 系）を温存したこと | `02-data-model/handover-property-mspdi-mapping-ja.md` / `02-data-model/handover-data-model-entry-ja.md` |
| 4 | Carry の予約枠が満杯でフォールバックしたこと | `02-data-model/handover-property-mspdi-mapping-ja.md` |
| 5 | `stackSafetyCap` に到達したこと（`user-order.md` 項 30-7） | `02-data-model/grs-document-settings-ja.md` ほか 2 か所 |
| 6 | 自動保存の成否 | `05-security-a11y/a11y-wcag21-aa-checklist.md` / `03-ui-naming/handover-ui-parts-ja.md` |
| 7 | 取込バリデーションの拒否・警告 | `05-security-a11y/security-design.md` §3 |
| 8 | localStorage 破損で復元できないこと | 同 §5 |

### 2-6. 初期テンプレートの中身

| | |
|---|---|
| **決まっていること** | 「初期表示用のテンプレートを 1 つ提供すること。**新規に作る**こと」＝ `user-order.md` 項 63。旧テンプレートを使わない理由（廃止済みの予実別行モデル・行 id に制御文字）＝ `DISCARDED-ja.md` |
| **決めること** | **中身が 0 件。** 何行・何タスク・どの設定値を持つかが未指定 |

> **ステップ 4 の 4-1（既定値未定 16 項目）が片づかないと書けない。** `documentSettings` は
> **常に全項目を書き出す**規約なので（`02-data-model/grs-document-settings-ja.md` §2）、
> 既定値が決まらないとテンプレートの JSON が完成しない。**依存関係に注意。**

---

## ステップ 3 — アーキ設計（5 件）

**状況と所在は `09-architecture/handover-architecture-entry-ja.md` にまとめてある。ここには複製しない。**
本表は「**何を決めるか**」だけを持つ。

| # | 決めること | 状況 | 詳細 |
|:--:|---|---|---|
| **3-1** | **描画方式の追認** | handover 内の裏付けは**推奨 1 件と PoC の前提 1 行だけ** | `09-architecture/handover-architecture-entry-ja.md` §1 |
| **3-2** | **状態管理／不変更新ストアの設計** | **既存の決定 2 件がこれを前提にしている**のに設計が無い | 同 §2 |
| **3-3** | **モジュール／ディレクトリ構成** | **意図的な空白** | 同 §4 |
| **3-4** | **技術スタック** | **意図的な空白** | 同 §4 |
| **3-5** | **localStorage のキー設計とスキーマ移行手順** | プレフィックスのみ確定 | 同 §3 |

---

## ステップ 4 — データモデル設計（1 件）

### 4-1. 既定値が決まっていない 16 項目

| | |
|---|---|
| **決まっていること** | `documentSettings` は**常に全項目を書き出す**（`02-data-model/grs-document-settings-ja.md` §2）。設定値の全数・型・範囲は同 §3〜§4（**設定値の正**） |
| **決めること** | 既定値が空欄のまま残っている **16 キー** — §4-1 の **7 キー**（`dependencyVisible` / `progressLineVisible` / `progressLineColor` / `dateGridLinesVisible` / `groupGridLinesVisible` / `baselineVisible` / `importSeq`）、§4-2 の **8 キー**（同節は**既定値の列そのものが無い**。全 9 キーのうち `themeMonochrome` だけ意味欄に `false` と書いてあるので残り 8。`zoomX` / `zoomY` は 1 行に同居しているが **2 キー**である）、§4-4 の `stackSafetyCap`（「十分に大きい値」のまま） |

> ⚠️ **§3 の 🔎 印 41 個と混同しないこと。** あちらは「**既定値の由来が記録されていない**」＝ 値はある。
> 本項は「**値そのものが無い**」である。🔎 の付いた値は**次期が選び直してよい**
> （`02-data-model/grs-document-settings-ja.md` §3 が「むしろ**選び直すべきである**」と書いている）。

> ⚠️ **`02-data-model/handover-data-model-entry-ja.md` の JSON 実例は、この 16 キー全部に値を入れている**
> （`"stackSafetyCap": 4096` / `"progressLineColor": "#b03030"` / `"themeHue": 210` ほか）。
> **あれはインスタンスの値であって既定値ではない。** 採用するなら
> `02-data-model/grs-document-settings-ja.md` §4 の表へ**書き戻して初めて既定値になる**。
> 下の 5-1 が同じ JSON を「完全な実例」として読ませているので、**取り違えに注意。**

---

## ステップ 5 — JSON / MSPDI 入出力設計（2 件）

### 5-1. JSON Schema

| | |
|---|---|
| **決まっていること** | **完全な文書インスタンスの実例がある**（`02-data-model/handover-data-model-entry-ja.md` の JSON。`schemaVersion` / `project` / `documentSettings` / `tasks` を含む）。データ構造は `02-data-model/grs-native-erd-ja.md`（**データの正**） |
| **決めること** | **機械可読なスキーマ（型・必須・値域）が 0 件。** `user-order.md` 項 57 が JSON を主データ形式とし、項 62 が**取込を信頼できない入力として厳格に検証すること**を要求しているので、**スキーマが無いと項 62 が実装できない** |

> 旧 `gr-scheduler.schema.json` は**意図的に捨てた** — 予定日付が `startDate` / `endDate` で、
> 確定名 `start` / `finish` と食い違うため（`DISCARDED-ja.md`）。**流用しないこと。**

### 5-2. 完全な MSPDI XML 実例

| | |
|---|---|
| **決まっていること** | 名前空間 URI ＝ `http://schemas.microsoft.com/project/2007`（`01-mspdi/mspdi-core-tree.md`）。**`Project` 直下の必須要素は `SaveVersion` と `CurrencyCode` の 2 つだけ**（`01-mspdi/mspdi-tables.md` / `01-mspdi/mspdi-pitfalls-ja.md`）。文字コードは UTF-8・BOM なし（`user-order.md`）。落とし穴は `01-mspdi/mspdi-pitfalls-ja.md`、enum 全数は `01-mspdi/mspdi-enums-ja.md` |
| **決めること** | **ルート `<Project>` を持つ文書の実例が 0 件**（最大の断片は `01-mspdi/mspdi-core-tree.md` の `<Task>` 18 行）。`xmlns` 宣言の書き方・**要素順（`xsd:sequence`）**・`elementFormDefault` が未記載。**最小妥当文書と、往復に使う代表文書の 2 本**を作ること |

> ⚠️ **正本 XSD はリポジトリに入っていない**（ライセンスのため）。入手方法とハッシュは
> `01-mspdi/mspdi/README.md`。**要素順と `elementFormDefault` は XSD を取得してから確かめる。**
> XSD が手元に無いときは「未検証」と書くこと（`README.md` §0-3）。

---

## ステップ 6 — UI×データ複合動作（3 件）

### 6-1. LOD のレベル減の量の式

| | |
|---|---|
| **決まっていること** | **方針だけ** ＝「文字をさらに縮めるのではなく、描画する Outline のレベルを 1 つ減らす」（`07-plan-actual/handover-plan-actual-decisions-ja.md` §2-4-1）。フォント下限は 12px |
| **決めること** | **減らす量の式が未確定。** PoC は `減らすレベル数 = ceil( log_3( 15 / タスク高 ) )` としたが、同書が「**本 PoC の提案であって確定ではない。分岐数は文書によって違うので、実装では実際の行数から求めるべき**」と明記している（`08-poc/POC-RESULTS-ja.md` §B-6） |

### 6-2. 行をまたぐ依存線

**核機能である**（`user-order.md` 項 46「依存関係を表現できること」／項 48「他のアイコンと極力かぶらないよう**自動で引く**。折れ曲がり点は 0〜4」／項 49「**FS / SS / FF / SF** とラグを持てること」）。

| | |
|---|---|
| **決まっていること** | **FS だけ**。アンカーは右辺中央 → 左辺中央の 2 点、走りは `dependencyArrowLength × dependencyRunOfArrow`、経路は **5 パターン 1 規則で、候補列挙も採点も探索も要らない**、折れ点 0〜4、段間の通路 y ＝ `03-ui-naming/handover-ui-detail-spec-ja.md` §4-9 |
| **決めること** | 同 §4-9 の「まだ決めていないこと」5 行 — ① 完全な逆行 ② **段が 2 つ以上離れる** ③ **行をまたぐ** ④ マイルストーン端点（幅 0） ⑤ **FF / SF / SS**（アンカーが右辺・左辺でなくなる） |

> **PoC は 3 案とも行跨ぎで破綻した**（`08-poc/POC-RESULTS-ja.md`。案 C は行内 57/57 が 1 パスで無交差なのに、
> 行跨ぎは 9/9 が何かを横切った）。PoC の結論は「**最小間隔の制約が横方向しか作られていない。
> 余地の予約は縦方向にも要る**」（同 §6-2）。**これは提案であって確定ではないので、
> 上の ③ を決めるときに一緒に判断する。**

### 6-3. Fit の仕様

| | |
|---|---|
| **決まっていること** | 役割 1 行（縦横とも全体が収まるようにズームとスクロールを合わせる）とキー割当 `F` ＝ `03-ui-naming/handover-ui-detail-spec-ja.md` §2・§5-2。**測り方は確定済み** ＝「Fit は**論理矩形ではなく描画される矩形**（オーバーハング込み）で測る」（`04-performance/handover-performance-notes-ja.md` 罠 T-11）。含めるものの全数（実績バーの下方向・マイルストーンの横方向・Progress Marker の右方向）も同所 |
| **決めること** | ① **算出規則を書いた節が無い**（余白の取り方・縦横どちらを優先するか・上下限に当たったときの振る舞い） ② **Fit と LOD しきい値の衝突**が未反映 — PoC が不具合を 1 件発見して PoC 内で修正済み（`08-poc/POC-RESULTS-ja.md` §B-5）だが、`04-performance/` に書き戻されていない ③ **Fit で最下行が半分切れる**ことがある（縦ズームの下限に先に当たる。同 §7） |

---

## 数

| ステップ | 件数 |
|---|:--:|
| 1 要望ヒアリング | 1 |
| 2 UI モック作成 | 6 |
| 3 アーキ設計 | 5 |
| 4 データモデル設計 | 1 |
| 5 JSON/MSPDI 入出力設計 | 2 |
| 6 UI×データ複合動作 | 3 |
| **合計** | **18** |
