---
type: Index
title: "gr-scheduler 引継ぎ資産（次期開発への入力）"
description: このフォルダの読む順と 5 つの原則。最初に読む。
tags: [index]
phase: packaging
status: stable
---
# gr-scheduler 引継ぎ資産（次期開発への入力）

- 日付: 2026-07-26
- 由来: gr-scheduler 第1次プロジェクト（2026-07-18 〜 2026-07-26）
- 目的: 次期開発を **ノイズの少ない状態で最初から** 走らせるための、厳選した入力一式。
- **このフォルダだけを次期リポジトリへ持っていけばよい。**
  唯一の例外が **MSPDI の正本 XSD** で、ライセンスの都合により**同梱していない**。
  取得方法は `01-mspdi/mspdi/README.md`（§0-3）。

---

## 00. 各文書の冒頭 YAML の読み方（**先に読む**）

全 `.md` の冒頭に **OKF（Open Knowledge Format）v0.2** の YAML があり、
**その文書をどう扱えばよいか**を書いてある。本文を読む前にここを見る。

```yaml
---
type: Decision Record          # 扱い
title: 予定と実績の設計 — 決定事項
description: ...
tags: [plan-actual]
phase: planning                # どの段階の産物か
status: stable
---
```

この文書は**この領域の正**なので、実際にはもう 1 行 `authority:` が付く（下の §`authority` を見る）。
**検査を成立させるため、この例示にはあえて書いていない。**

### `type` — この文書をどう扱うか

| 値 | 意味 |
|---|---|
| **`Decision Record`** | **決定。これに従う** |
| **`Requirement Input`** | **要望の入力。決定ではない**（`user-order.md` のみ） |
| `Reference` | 事実の記録。決定ではない |
| `Background` | 当時の検討・分析。**仕様として採用しない**。ただし**根拠の出典として引くのは正しい**（引く側が結論を自分の本文に書いていること） |
| `Frozen Record` | 当時の記録。**追随させない**（食い違ったら他方が正） |
| `Working Note` | 作業用。**役目が終わったらリポジトリから消す**（内容は正の文書へ移してから）。**現在 0 件** |
| `Index` | 入口。それ自体は何も決めない |
| `Open Items` | 未決の記録 |

### `phase` — どの段階の産物か

`survey`（先行調査）→ `planning`（企画）→ `proof-of-concept`（原理証明）→ `packaging`（成果物整理）

**段階が新しいほうが正とは限らない。** どちらが正かは `type` と `authority` で決まる。

### `authority` — **用語の正は 4 つだけ**

このキーを持つ文書だけが、その領域の**唯一の正**である。**5 つ目を作らない。**

| `authority` | 文書 | 何の正か |
|---|---|---|
| `naming` | `03-ui-naming/handover-ui-parts-ja.md` | 命名（§2-1 日英対応 / §2-1-6 設定値キー） |
| `data-model` | `02-data-model/grs-native-erd-ja.md` | データ構造 |
| `plan-actual` | `07-plan-actual/handover-plan-actual-decisions-ja.md` | 予実・進捗 |
| `document-settings` | `02-data-model/grs-document-settings-ja.md` | 設定値（既定値・範囲） |

```bash
grep -rl "^authority:" handover/ | wc -l   # 4 でなければ正が増えている
```

### `status`

`stable` = 現行 ／ `deprecated` = **歴史として残すが現行ではない** ／ `draft` = 作業中

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

### 0-3. MSPDI の事実は **必ず XSD で検証する**。ただし **XSD はこのリポジトリに入っていない**

```
正            https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd
ローカル複製   01-mspdi/mspdi/mspdi_pj12.xsd   ← 自分で取得する（git 管理外）
```

**規則は 1 文: 事実はローカル複製で確かめ、出典には公式 URL を書く。**
複製は公式とバイト単位で同一なので、見る先と書く先が違っても主張は同じである。

**取得方法・照合用のハッシュ・ライセンスは `01-mspdi/mspdi/README.md`。** ファイル 1 つで、ビルドは要らない。

日本語の要約文書（`mspdi-*-ja.md`）は**参考であって正ではない**。実際に誤りが複数あり、XSD と突き合わせて直した。

> ⚠️ **XSD が手元に無く、Web にも出られないときは、「未検証」と書くこと。**
> 要約を根拠に断定してはならない。**推測を断定で書くこと**が、この引継ぎ資産が防ごうとしている失敗である。

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
| **1** | **`user-order.md`** | **次期開発の入力そのもの**（項 1〜68。うち **11 / 14 / 52 が欠番**なので実質 **65 項目**。＋「やらないこと」＋「決着した仕様」） | **これが正** |
| **2** | **`01-mspdi/mspdi-pitfalls-ja.md`** | **MSPDI 実装の落とし穴**。素直に実装すると必ず踏む罠 | **製品に依存しない**。最優先 |
| 3 | `01-mspdi/mspdi-enums-ja.md` | enum 全数（53 要素 / 535 値） | 同上。実装時に必携 |
| 4 | `01-mspdi/mspdi-core-tree.md` / `mspdi-tables.md` | MSPDI の構造・全 29 テーブルの責務 | MSPDI 自体の理解 |
| **5** | **`04-performance/handover-performance-notes-ja.md`** | **ぬるサクの引継ぎ**。効いた手 / 効かなかった手 / 踏んだ罠 / 実測基準線 / 参考実装の設計要点 | **経験の記録**。設計前に読む |
| 6 | `02-data-model/handover-data-model-entry-ja.md` | データ構造の**入口**。読む順と JSON 実例 | 入口 |
| 7 | `02-data-model/grs-mspdi-field-ledger-ja.md` | 全要素の取捨選択（Own / Consume / Reconstruct / Carry / Drop） | 仕分けの実例。枠組み自体が再利用できる |
| **8** | **`02-data-model/grs-native-erd-ja.md`** | **データ構造の確定版**。ERD・識別子・マージ・Carry ストア・往復規約 | **データ構造の正** |
| 8a | **`02-data-model/grs-document-settings-ja.md`** | **文書に保存する設定値の全数**（描画 58 項目 ＋ 表示状態 ＋ 出力 ＋ LOD）。保存しないもの 9 項目とその理由。自動保存と往復検査の規約 | **設定値の正** |
| 8b | `02-data-model/handover-property-mspdi-mapping-ja.md` | プロパティ全項目の MSPDI 対応（XSD 実測）・**進捗と実績の関係**・無い項目の格納方式 3 案比較 | 項目を増やす前に読む |
| **9** | **`03-ui-naming/handover-ui-parts-ja.md`** | **UI パーツ名と責務**（確定名）。語彙 6 系統 → 3 語。**面ごとの記法と語幹一致の規則**もここ | **命名の正** |
| 9b | `03-ui-naming/handover-ui-detail-spec-ja.md` | **UI 詳細仕様**。4 部構成の内訳・上部ボタン・パレット構成・**掴み領域**・操作割当・自動レイアウト規則 | 実装前に読む |
| **10** | **`07-plan-actual/handover-plan-actual-decisions-ja.md`** | **予実・進捗の確定設計**。MSPDI の `Stop`/`Resume`/`ResumeValid` をそのまま使うモデル・5 状態・形状・Progress Marker・イナズマ線の頂点規則・Undo・命名 | **この領域はここが正**。⚠️ 8b と 9b の予実まわりを**上書きする**（同書 §11 に差分の全数） |
| 11 | `05-security-a11y/security-design.md` | 脅威モデル・**JSON / MSPDI XML** の検証・単一 HTML の CSP | 要求として生きている（`user-order.md` 62）。⚠️ **冒頭の注記を先に読む** — SVG/PNG 取込の節は**対象機能が取り下げ済み** |
| 12 | `05-security-a11y/a11y-wcag21-aa-checklist.md` | WCAG 2.1 AA チェックリスト | 有効な条件付きプロセス |
| 13 | `06-background/` | 経緯（監査・改訂差分・バグ根因分析・未決論点） | **迷ったとき**に読む |
| **14** | **`08-poc/`** | **動く PoC**（`poc-integrated.html` **1 本**・6 タブ。日程表 / 形状の基準 / マルチバー 20 パターン / レベル遷移 / 色と縁取り / 記録）。入口は `08-poc/poc-integrated.html`（**ダブルクリックで開く。サーバー不要**）、結論は `08-poc/POC-RESULTS-ja.md` | **読む前に開いて触る**。**書き戻しは 2026-08-02 に全数を棚卸し済み**（同書 §6 の 6 件と末尾の表の 7 件）。**2026-08-02 に 3 件とも決着した**（§6-2 は不採用・横切りは重ね順で解く／#5 は罠 T-14 へ／#7 は深さ 5〜1 を試す方式に確定）。**書き戻し待ちのものは無い** |
| 15 | `09-architecture/handover-architecture-entry-ja.md` | **アーキ領域の所在**。描画方式 = SVG の結論がどこにあるか / 不変更新ストアが「前提として参照されているのに設計が無い」こと / **モジュール構成と技術スタックは意図的な空白**であること | 事実の所在のみ。決定はしない |
| — | **`NEXT-STEPS-ja.md`** | **実開発ステップ別の欠落一覧 14 件**（要望ヒアリング / UI モック / アーキ / データモデル / 入出力 / 複合動作）。各件に「**今どこまで決まっているか**」を実測で併記 | **着手前に読む。** 既に決まっているものを決め直さないため |
| — | **`OPEN-ITEMS-ja.md`** | **実機確認の残件 3 件**（MS Project を触らないと分からないこと）。**15 分で終わるチェックリスト** | 未解決はこれだけ。**開発を止める理由にはならない** |
| — | `NEUTRALIZED-TERMS-ja.md` | **ドメイン語・製品名を中立化した記録**（凍結リポジトリの原本との差分） | 原本を併読するとき必要 |

> **迷ったら 8（データ）と 9（命名）を見る。** 2〜4 は前提知識、6 は入口、13 は経緯。
> **数値（寸法・既定値・範囲）は 8a が正。** 他の文書に出てくる数値は説明のための再掲である。

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
| **フォルダを付けない裸のファイル名**（`user-order.md` / `grs-native-erd-ja.md` 等） | **`handover/` 内の同名ファイル**を指す。所在は §2 のフォルダ構成で引く。**`README.md` を除き、全 29 文書にファイル名の重複は無い**ので名前で一意に定まる（機械検査済み。衝突ゼロ）。`README.md` だけは **3 つ**ある — 本書 / `01-mspdi/mspdi/README.md`（XSD の入手元）/ `08-poc/README.md`（PoC の開き方） |
| `docs/spec/vendor/mspdi-declutter-erd-ja.md`（MSPDI 断捨離の中間分析） | **`handover/` には無い**。結論は `02-data-model/grs-mspdi-field-ledger-ja.md` に落ちている（`DISCARDED-ja.md`） |
| `project-management/` 配下（`handoff-*.md` 等） | **`handover/` には無い**。中身の要点は `DISCARDED-ja.md` に書いてある |
| 上表に無いパス（`src/` / `tests/` / `.sdoc` / `project-records/` 等） | **`handover/` には無い**。凍結リポジトリを見る。理由は `DISCARDED-ja.md` |

---

## 2. フォルダの構成

```
handover/
├── README.md                        この文書
├── NEXT-STEPS-ja.md                 実開発ステップ別の欠落一覧 14 件（着手前に読む）
├── OPEN-ITEMS-ja.md                 実機確認の残件 3 件（未解決はこれだけ）
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
│       ├── README.md                ★入手方法・照合ハッシュ・ライセンス（**追跡しているのはこれだけ**）
│       └── mspdi_pj12.xsd           MS Project 2007 MSPDI スキーマ。**同梱していない**（自分で取得する）
│
├── 02-data-model/                   GRS のデータ構造（確定版）
│   ├── handover-data-model-entry-ja.md   入口・読む順・JSON 実例
│   ├── grs-native-erd-ja.md              ★データ構造の正（14 エンティティ・2 軸）
│   ├── grs-document-settings-ja.md        ★設定値の正（保存する全項目・保存しないもの・自動保存）
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
├── 07-plan-actual/                  予実・進捗の確定設計（この領域の正）
│   └── handover-plan-actual-decisions-ja.md
│                                    MSPDI 準拠モデル・5 状態・形状・Progress Marker
│                                    イナズマ線の頂点規則・Undo・命名
│                                    ⚠️ §11 に「既存文書のどこを上書きするか」の全数
│
├── 08-poc/                          **動く PoC 一式**（開いて触る。サーバー不要）
│   ├── README.md                    開き方と読むときの注意。**最初にこれ**
│   ├── POC-SPEC-ja.md               共通仕様と入力データ（§8 に既知の弱点）
│   ├── POC-RESULTS-ja.md            **計測結果・推奨・書き戻しの反映状況**
│   ├── OPEN-QUESTIONS-ja.md         判断が要った 7 件（全件 決着済みの記録）
│   └── poc-integrated.html          **入口。PoC はこの 1 本だけ**。6 タブ
│                                    （案比較の 5 本は 2026-08-02 に外した。
│                                      結論と数値は POC-RESULTS-ja.md に残っている）
│
└── 09-architecture/                 アーキ領域の所在（決定はしない）
    └── handover-architecture-entry-ja.md
                                     描画方式 = SVG の結論の所在 / 不変更新ストアが
                                     前提だけ参照され設計が無いこと /
                                     モジュール構成・技術スタックは**意図的な空白**
```

---

## 3. 次期の着手順（推奨）

1. `user-order.md` を読む。**冒頭「用語」節を先に読んで言葉を揃える**（揃えないまま細部を読むと誤解して手戻りになる）。次に**「やらないこと」節と末尾の「決着した仕様」**。
2. `04-performance/` を読む。**方式を決める前に骨格で性能を測る**（§0-2）。
3. `03-ui-naming/handover-ui-parts-ja.md` の確定名で**語彙を固定する**。ここを曖昧にすると再発する。振る舞いは `handover-ui-detail-spec-ja.md`。
4. `02-data-model/grs-native-erd-ja.md` でデータ構造を確定する。**画面とデータを分離**する（`user-order.md` 67）。
5. `01-mspdi/mspdi-pitfalls-ja.md` を読んでから MSPDI に着手する。往復無損失は**後付けできない**。
6. `05-security-a11y/` を実装方針に織り込む。**`innerHTML` 直挿し禁止・XXE 無効化**は設計時点の判断。
7. **`NEXT-STEPS-ja.md` で残作業を引く。** 実開発のステップごとに「まだ決まっていないこと 14 件」と
   「**今どこまで決まっているか**」が対になっている。**決め直しを防ぐのはこの表である。**

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
| `old/日程管理ツール.md`（既存ツール比較の調査記録） | **特定製品の評価×特定業種**が前提の文書（§0-5）。結論は `user-order.md`「それはどうして？」に吸収済み |
| `process-rules/` / `essays/` | gr-sw-maker フレームワーク側の資産。次期でもフレームワークから供給される |
