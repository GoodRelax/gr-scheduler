---
type: Decision Record
title: UI 基本設計（パーツ名と責務）
description: UI パーツ名と日英対応表、面ごとの記法と語幹一致の規則。命名の正。
tags: [ui, naming]
phase: planning
authority: naming
status: stable
---
# UI 基本設計（パーツ名と責務）— 引継ぎ Step 2 成果物

- 日付: 2026-07-26
- 目的: 次期開発が**最初から確定名で始められる**ようにする。現行コードは旧名のままなので、本書の名前で作り直す。
- 素材: 前プロジェクトの用語集・GUI 木（**どちらも旧名のため `handover/` には無い**。`../DISCARDED-ja.md` §3）/ `../02-data-model/grs-native-erd-ja.md`（データモデル）
- 位置づけ: **UI パーツ名の確定版**。データ構造は `../02-data-model/grs-native-erd-ja.md` が正。
  **日英対応表は §2-1 が正**（全数をそこに置く。他の文書に同じ表を作らない）。
  予実・進捗まわりの設計は `../07-plan-actual/handover-plan-actual-decisions-ja.md` が正。

---

## 1. 命名の原則（確定）

### 1-1. モデル名称を正とし、UI 名称を合わせる

**UI 名称とモデル名称が食い違う場合は、UI 名称を変更する。**

現行は同じものに **UI 側と データ側で別の語**を当てており、それが「画面とデータが同じ語彙で混在している」（**バグの根因**。`../README.md` §0-1）状態を生んでいた。次期は**モデルの語彙に一本化**する。

### 1-2. 面ごとの記法（**本書が正**）

| 面 | 記法 | 例 |
|---|---|---|
| 型・クラス | PascalCase | `TaskGroup` |
| 関数・変数・**JSON プロパティ** | camelCase | `stackOrder` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_GROUP_DEPTH` |
| 文字列判別値・`data-role`・CSS クラス | kebab-case | `toggle-plan` |
| i18n キー・**プロパティパネルの項目名** | snake_case | `stack_order` |

> **同じ概念でも面が違えば記法が違う**のは規則どおり（矛盾ではない）。ただし**語幹は必ず一致させる**（`stackOrder` ↔ `stack_order`。`laneIndex` ↔ `stack_order` のような**語幹の不一致は禁止**）。

#### 略語は識別子に入れない — **確定 2026-08-02**

**大文字の略語は camelCase に落ちた瞬間に意味が消える。** 識別子では**全部書く**。

| 散文 | 識別子 | 理由 |
|---|---|---|
| `LOD` | **`LevelOfDetail`** | `LOD` は略語として読めるが **`Lod` は無意味な語になる**（ユーザー判断。実際に「`Lod` ってなに？」と読めなくなった） |
| 高さ / 幅 | **`Height` / `Width`** | 裸の `H` / `W` も同じ。`chevronNotchOfHeight` は「÷ 何」が読めないので**式として読めない** |

**`LOD` = Level of Detail（詳細度）。** ズームに応じて描く要素を増減させる仕組みで、**3 つある**:

| 名前 | 何を増減するか | 駆動 |
|---|---|---|
| 時間軸 LOD | `Time Ruler` の粒度（年 → 年＋月 → 年＋月＋週 → 年＋月＋日＋曜日） | 横（`zoomX`） |
| タスク LOD | 深い **WBS** の `Task` を描かない | 横（`zoomX`）＝ **幅** |
| グループ LOD | 深い **`TaskGroup`** を親へ畳む | 縦（`zoomY`）＝ **高さ** |

**散文では `LOD` と書いてよい**（大文字なら読める）。**タスク LOD（WBS）とグループ LOD（`TaskGroup`）は別物なので必ず言い分ける**
（`../07-plan-actual/handover-plan-actual-decisions-ja.md` §5-3）。

### 1-3. 概念に記号のラベルを与えない — **確定 2026-08-04**

```
比較しているあいだ    案A / 案B / 案C      可。区別のための一時的な番号
比較表の行ラベル      A / B / C            可。表の中は「どれの話か」が見えている
決着したあとの散文    中身の名前で呼ぶ      記号を使わない。採用案も却下案も
```

**判定は 1 つだけである。**

> **その記号を知らない人が、その 1 文だけを読んで意味が取れるか。**
> 取れないなら、記号ではなく中身で呼ぶ。

- **名前は発明しなくてよい。** 括弧の中身がもう名前になっていることが多い
  （`案D（エンティティ別バッグ ＋ 入口/出口の検査）` → **エンティティ別バッグ**）。
- ⚠️ **却下案も対象である。** 「**案B と同じ非決定性に落ちる**」のような文は、
  案B を知らないと読めない。**却下案こそ中身で呼ぶ**（読み手はそちらの表を開かない）。
- **比較表そのものは残す。** 却下案とその理由は**妥当性**であり、
  同じ案を再提案させないために要る（`../DISCARDED-ja.md` §7）。

> **なぜ規則を足したか**: 既存の 3 つの防御——**項 66**（無意味な汎用語の禁止）／
> **`../README.md` §0-4**（記録番号の中身は本文に書く）／**数値は設定値の正が持つ**——の
> **どれにも当たらない第 4 のカテゴリ**があった。「**概念に付けた記号名**」である。
> **2 匹すり抜けた** — `軸A` / `軸B`（§4 の改名表）と `案A` 〜 `案D`。
> ⚠️ **`案A` は同じ文書の中で 2 つの別物を指していた**（`grs-native-erd-ja.md` の
> 「出自の保持・確定」と「UID 再マップ表・却下」）。**記号は衝突しても気づけない。**

---

## 2. 語彙の統合（現行 → 確定）

現行は**同じ概念に 6 系統の語**があった。モデル語彙へ寄せて **3 語**にする。

| 概念 | 現行の語（重複） | **確定名** | 根拠 |
|---|---|---|---|
| バーが載る器・階層ノード | `section`（廃止済）/ `classification` / `activity major/middle/minor category` / `row` / `ribbon`（帯） | **`TaskGroup`** | モデル名。**階層と行を 1 つの再帰構造に統合**（≤Lv5）。「大/中/小分類」は**深さで表す**ので専用語を持たない |
| 器への所属と縦の積み位置 | `lane` / `laneIndex` | **`TaskGroupMember` / `stackOrder`** | モデル名。同概念の別名だった |
| 日程要素（バー・◆） | `item` / `activity` / `Activity Span` | **`Task`** | モデル名。**D-22「item を activity に改名するか」は「両方やめて `Task`」で決着** |

> **`Task` に一本化する理由**: MSPDI の `Task` を無汚染継承しており、マイルストーンも `Task.milestone` フラグで表す（MSPDI と同じ）。UI で「アイテム」「アクティビティ」と呼び分ける必要がない。
> **表示上の呼称**は残す: `milestone=true` のものを画面で「マイルストーン」と呼ぶのは自然（**データ上は Task**）。

### 2-0. `Bar` の定義 — **確定 2026-07-31**

**「バー」は 3 つの階層で使われて意味が定まっていなかった。** 総称 / 予実の 2 面 / 形状の 1 値である。
**形状の 1 値を `rectangle`（矩形）へ改名し、`bar` を総称専用にした。**

```
Bar   1 つの Task が占める横帯 1 本と、そこに描かれるもの全体を指す総称。
      形状を問わない。マイルストーン（◇）も Bar である。
      「棒の見た目」ではなく「1 タスクが占める 1 本」を指す。

      根拠 1  MSPDI の HideBar は Task 全般（マイルストーンを含む）に掛かる。
              "Whether the GANTT bar of the task is hidden when displayed in Microsoft Project."
              正本 XSD `../01-mspdi/mspdi/mspdi_pj12.xsd`。XSD 内の "bar" はこの 1 要素だけ。
      根拠 2  マイルストーンも 1 タスクぶんの横帯を 1 本占有する
              （`../07-plan-actual/handover-plan-actual-decisions-ja.md` §2-2）。
              実績は実績日の位置へ横にずらすので、占有する縦幅は ◇ 1 つぶんである。

Task Bars    Rows の子。その行に載る Task 全部の Bar をまとめた描画層。
Plan Bar     その Task の予定側の描画。shapeKind の形で描く。
Actual Bar   その Task の実績側の描画。予定と同じ形で描く（07 §2-2-1）。
rectangle    shapeKind の 1 値（`===`）。日本語は「矩形」。
             2026-07-31 に `'bar'` から改名した。総称と衝突していたため。
```

> **なぜ総称を別語（Task Line 等）にしなかったか**: MSPDI 自身が「Gantt bar」と呼んでおり、
> 相手ツールと語彙を揃える利益が大きい（往復無損失は機能要求・項 56）。
> また `Baseline`（ベースライン＝変更前の予定）と語尾が衝突する。
> 「マルチバー」は**機能名**（§2 の表）であり、部品名と役割が違うので併存してよい。

### 2-1. 日英対応表（**全数。ここが正**）

#### 2-1-0. 規則

```
日本語ラベルは英語の確定名の直訳とする。
意訳・別語・語順の反転を禁止する。例外は §2-1-4 のリストに載せたものだけ。
画面に出ない構造名（App Shell / Canvas Overlays / Palette Groups 等）には日本語を当てない。
```

#### 2-1-1. データの語

| 確定名（英） | 日本語 |
|---|---|
| `Task` | タスク（`milestone = true` は「マイルストーン」と表示） |
| `TaskGroup` | **タスクグループ** |
| `TaskGroupMember` | **タスクグループメンバー** |
| `stackOrder` | **積み順** |

> **改名の記録**: `TaskGroup` は「行 / グループ / 見出し」、`stackOrder` は「段」と訳していた。
> どちらも直訳ではなく、**`Rows`（UI）と `TaskGroup`（データ）がどちらも「行」**になっていた。
> `TaskGroup` = タスクグループ に改めたことで、**「行」が `Rows` 専用に空いた**。

#### 2-1-2. プロパティ

| 確定名（英） | 日本語 |
|---|---|
| `name` | **名称** |
| `notes` | **備考** |
| `start` / `finish` | 開始日 / 終了日 |
| `actualStart` / `actualFinish` | 実績開始日 / 実績終了日 |
| `actualDuration` | **実績期間** |
| `resume` | **再開予定日** |
| `resumeValid` | **再開可否** |
| `percentComplete` | **完了率** |
| `deadline` | 期限 |
| `shapeKind` | **タスク形状**（5 値。`'milestone'` のときだけ `milestoneGlyph` を見る） |
| `'rectangle'` | **矩形**（`===`）。※2026-07-31 に `'bar'` から改名。理由は §2-0 |
| `'chevron'` | **矢羽根**（`>===>`）。※直訳ではない。例外リスト §2-1-4 |
| `'arrow'` | **矢印**（`--->`） |
| `'endpointSpan'` | **端点スパン**（`*----*`）。※「端点」と略さない。§2-1-5 |
| `'milestone'` | **マイルストーン**（◇ ほか） |
| `milestoneGlyph` | **マイルストーン形状**（〇 六角形 五角形 ◇ □ ☆ △ ▽） |
| **`actualPlacement`** | **実績の置き方**（`'inside'` = 内側 / `'below'` = 下 / `'atActualDate'` = 実績日）。`shapeKind` から導出する |
| `strokeColor` / `fillColor` / `lineWeight` | **線色** / 塗り色 / 線の太さ |
| `nameAnchor` / `nameAlign` | **名称アンカー** / **名称の揃え** |
| `fadeInDays` / `fadeOutDays` | フェードイン日数 / フェードアウト日数 |
| `wbs_parent_uid` | **WBS の親**（深さは導出） |

> **改名の記録**: `name` は「正式名称」（廃止した `fullName` の名残）、`notes` は「説明・備考」
> （廃止した `description` の名残）と訳していた。`percentComplete` は「進捗率」だったが直訳は「完了率」。
> `nameAnchor` / `nameAlign` は **2 語に 1 つの日本語**（「名称ラベルの位置」）を当てていた。

#### 2-1-3. UI パーツ

| 確定名（英） | 日本語 |
|---|---|
| `Rows` | 行 |
| `Task Bars` | タスクバー |
| **`Plan Bar`** | **予定バー** |
| **`Actual Bar`** | **実績バー** |
| **`Progress Marker`** | **進捗マーカー** |
| **`Resume Icon`** | **再開アイコン** |
| **`Name Label`** | **名称ラベル** |
| **`Assignee Label`** | **担当ラベル** |
| `Progress Line` | **イナズマ線**（例外。§2-1-4） |
| **`Cursors`** | **カーソル** |
| `Today Line` | 本日線 |
| `Dual Cursor` | デュアルカーソル |
| **`Guide Cursor`** | ガイドカーソル |
| `Comment Boxes` | コメントボックス |
| **`Highlight Boxes`** | **ハイライトボックス** |
| `Dependency Lines` | 依存線 |
| **`Date Grid Lines`** | **日付罫線** |
| **`Group Grid Lines`** | **グループ罫線** |
| **`Time Ruler`** | **タイムルーラー** |
| `Watermark` | 透かし |
| **`Scrollbars`** | **スクロールバー** |
| **`Row Title Panel`** | **行見出しパネル** |
| **`Row Title Tree`** | **行見出しツリー** |
| `Panel Divider` | パネル境界 |
| `Properties Panel` | プロパティパネル |
| `Command Palette` | コマンドパレット |
| `Schedule Title` | 文書名 |
| `Autosave Status` | 自動保存の状態 |
| **`Hidden Group Tab`** | **非表示グループタブ** |
| `Help Modal` / `AI Export Modal` | ヘルプ / AI 出力 |

> **改名の記録**: `Highlight Boxes`（角丸四角 / 囲み枠）、`Hidden Group Tab`（小タブ）、
> `Group Grid Lines`（水平線）は**直訳ではない別語**を当てていた。
>
> **`Cursors` / `Guide Cursor` への改名**: 親が `Cursor Guides`、子が `Cursor Guide` で
> **単複の違いしかない同名**だった（項 66 違反）。さらに子だけ `Cursor ◯◯` の語順で、
> 兄弟の `Dual Cursor` と揃っていなかった。親を総称の `Cursors` に、子を `Guide Cursor` にして両方解消した。
>
> **この改名はデータ項目名にも及ぼす**（2026-07-30 確定）。`documentSettings.cursorGuideMode` →
> **`guideCursorMode`**、型名 `CursorGuideMode` → **`GuideCursorMode`**。
> UI 名とデータ名を食い違わせない（項 66）。`../02-data-model/grs-native-erd-ja.md` §5.7 の改名表と対応する。

#### 2-1-4. 例外リスト（直訳しないもの）

| 英語 | 日本語 | 例外にする理由 |
|---|---|---|
| `Progress Line` | **イナズマ線** | 日本の日程管理で定着した語。「進捗線」に変えると日本のユーザーに通じなくなり、`user-order.md` 項 6-4（マニュアルを見ないで使える）に反する |
| `chevron` | **矢羽根** | 図形名としての直訳は「山形」だが、`user-order.md`（ユーザーの入力）が「矢羽根」を使っており、日程表の文脈で意味が通る。英語側は世界共通の図形名 `chevron` を使う（コードは英語で世界公開する前提） |

**例外はこの 2 件だけ。** 増やすときは必ずこの表に追記する。「なんとなく違う」を許すと規則が崩れる。

> **確認できる事実**: 「矢羽根」は `handover/` 内に **33 箇所**あり `user-order.md` を含む
> （内訳: `.md` に 28 ＋ `../08-poc/poc-integrated.html` に 5。**数え直すときはこの内訳で照合すること**）。
> 「山形」は**本表の中の 2 箇所（この行と直訳の説明）以外に 0 箇所**。
> 「日本の工程表で通用する語である」というのは**推定**であって、リポジトリ内では裏付けられない。

#### 2-1-5. 曖昧な日本語を単独で使わない

同じ日本語が複数の概念を指す語がある。**単独で書いたら誤り**とする。

| 曖昧な日本語 | 書き方 |
|---|---|
| 段 | **4 義ある。** ①**積み順（`stackOrder`）** ②**WBS の深さ**（`OutlineLevel` から導出） ③**`TaskGroup` の深さ** ④**ズームのノッチ**。**必ずどれかを併記する。「N 段」と単独で書かない** |
| 行 | **`Rows`**（UI パーツ）/ **「タスクグループ（`TaskGroup`）」**（データ） |
| レベル | `OutlineLevel` / `TaskGroup` の深さ / LOD のどれかを明示 |
| 深さ | **WBS** か **`TaskGroup`** かを必ず併記（`深さ` と単独で書かない）（`../07-plan-actual/handover-plan-actual-decisions-ja.md` §5-3） |
| マーカー | **単独で書いたら `Progress Marker`（進捗マーカー）。** 期限の印は「**期限の印**」（`deadline`）、マイルストーンの図形は「**マイルストーン形状（`milestoneGlyph`）**」と書く。**「マーク」とも書かない** |
| 進捗 | **3 つが別物。** `Progress Marker`（状態の記号）/ `Progress Line`（イナズマ線）/ **完了率（`percentComplete`）**。ラベルを指すなら「完了率ラベル」 |
| ベースライン | **2 義ある。** ①**変更前の予定**（`baselineVisible`。別ファイルを重ねる） ②**文字のベースライン**（`labelBaseline`）。前者は「変更前の予定」と書くのが安全 |
| キャンバス | **`Schedule Canvas`**（UI 領域）/ **出力サイズ（`exportCanvas`）** / **余白（`canvasPadding`）** を区別 |
| 基準線 | **`Baseline`（変更前の予定）の訳語に限る。** 性能の実測値は「**基準値**」「ベンチ基準」と書く |
| 太さ | 英語は用途で分かれる（`lineWeight` / `dependencyWidth` / `progressLineWidth` / `markerStroke` / `planStroke` / `thinStroke*`）。**`Width` は寸法（幅）に使い、太さには使わない**のが原則だが既存キーに例外がある。**日本語で「幅」と「太さ」を取り違えないこと** |
| 幅 | 「日付の幅」/ **「占有幅」**（ラベル込み）を区別 |
| 期間 | 「予定の期間」/ **`actualDuration`（実績期間）** / 表示期間 を明示 |
| 端点 | 単独で書いたら**掴み点**（全形状が持つバーの端）。形状名は必ず「**端点スパン**」と 4 文字で書く |
| バー | **`Task Bars`（総称）/ `Plan Bar` / `Actual Bar`** のどれかを明示。**形状の 1 値は `rectangle`（矩形）**であって「バー」ではない |
| カーソル | **`Cursors`**（`Today Line` / `Dual Cursor` / `Guide Cursor` の総称。**日付を指す線**）と、**「ポインタ」**（マウスが指す点。掴めるかどうかで形が変わる）を区別する。**「カーソル」単独で書いたら `Cursors` の意味**とし、マウス側は必ず「ポインタ」と書く |

**文中で属性に触れるときは所属を付ける**（`stackOrder` ではなく `TaskGroupMember.stackOrder`）。
§1-2 の記法により、**形で面が見分けられる**。

```
UI パーツ         PascalCase の複合語（空白あり）   Row Title Panel / Progress Marker
データの実体       PascalCase 1 語                  Task / TaskGroup
データの属性       Entity.field 形式                TaskGroupMember.stackOrder / Task.actualDuration
プロパティ項目名   snake_case                       stack_order
```

#### 2-1-6. 設定値のキー（**全数。ここが正**）

`documentSettings` が持つ設定値の**名前の正はここ**である。
**値**（既定値・範囲・範囲の理由・保存するかどうか）は
`../02-data-model/grs-document-settings-ja.md` が持つ。**名前と値を 2 か所で管理しない。**

> ⛔ は**文書に保存しない**もの（読む人の環境）。名前としては本表に載せる。

**タイムルーラー（`Time Ruler`）**

| 確定名（英） | 日本語 |
|---|---|
| `pxPerDayAt1x` | 1 日の幅（zoomX = 1） |
| `rulerHeight` | 目盛の帯の高さ |
| `rulerFont` | 目盛の文字 |

**縦の寸法**

| 確定名（英） | 日本語 |
|---|---|
| `basePlanHeight` | 予定の縦幅（zoomY = 1） |
| `actualOfPlan` | 実績 ÷ 予定 |
| `actualMin` | 実績の縦幅の下限 |
| `fontOfActual` | フォント ÷ 実績 |
| `fontMin` | 最小フォント |
| `thinFontScale` | 細線のフォント倍率 |
| `actualGap` | 予定 → 実績の間隔（下に置くとき） |
| `stackGap` | 段の間隔 |
| `rowGap` | 行の間隔 |

**形状ごとの縦幅（予定の縦幅の倍率）**

| 確定名（英） | 日本語 |
|---|---|
| `shapeHeightOf.rectangle` | === 矩形 |
| `shapeHeightOf.chevron` | >===> 矢羽根 |
| `shapeHeightOf.arrow` | ---> 矢印 |
| `shapeHeightOf.endpointSpan` | *----* 端点スパン |
| `shapeHeightOf.milestone` | ◇ マイルストーン |

**依存線（固定・ズームに追随しない）**

| 確定名（英） | 日本語 |
|---|---|
| `dependencyWidth` | 太さ |
| `dependencyArrowLength` | 矢印の三角形の長さ |
| `dependencyRunOfArrow` | 入口の走り ÷ 三角形 |

**進捗マーカー**

| 確定名（英） | 日本語 |
|---|---|
| `markerOfFont` | マーカー径 ÷ フォント |
| `markerMin` | マーカー径の下限 |
| `markerGap` | 実績の右端からの隙間 |
| `markerStroke` | 円の線の太さ |
| `resumeScaleInvalid` | 再開日未定のときの縮小率 |
| `resumeArmOfMarker` | Resume の腕の長さ ÷ マーカー |
| `resumeHeadOfMarker` | Resume の矢じり ÷ マーカー |
| `resumeDashOn` | Resume へ繋ぐ破線の実部 |
| `resumeDashOff` | Resume へ繋ぐ破線の空部 |

**ラベル**

| 確定名（英） | 日本語 |
|---|---|
| `labelCoef` | 幅の概算係数 |
| `labelPad` | 形状の内側の余白 |
| `labelGap` | 形状の外へ出すときの隙間 |
| `labelBaseline` | ベースライン補正 |
| `labelHaloOfFont` | 縁取りの太さ ÷ フォント |
| `truncateUnits` | 打ち切り幅（半角換算） |
| `rowTitleFont` | 行名の文字 |
| `rowTitleIndent` | 行名の 1 段のインデント |
| `rowTitleTopScale` | `TaskGroup` 深さ 1 の行名の倍率 |

**形状の細部**

| 確定名（英） | 日本語 |
|---|---|
| `planStroke` | 予定の輪郭線 |
| `thinStrokeOfPlan` | 細線の太さ ÷ その形状の予定の縦幅 |
| `thinStrokeMin` | 細線の太さの下限 |
| `thinStrokeMax` | 細線の太さの上限 |
| `chevronNotchOfHeight` | 矢羽根の切り欠き ÷ 高さ |
| `chevronNotchOfWidth` | 矢羽根の切り欠き ÷ 幅 |
| `arrowHeadOfStroke` | 矢印の矢じり ÷ 線の太さ |
| `arrowHeadOfSpan` | 矢印の矢じり ÷ 全長（上限） |
| `spanDotOfStroke` | 端点の点の半径 ÷ 線の太さ |
| `starInnerOfOuter` | ☆ の内接半径 ÷ 外接半径 |
| `minShapeWidth` | ゼロ期間でも残す最小幅 |

**進捗線（イナズマ線）**

| 確定名（英） | 日本語 |
|---|---|
| `progressLineWidth` | 太さ |
| `progressLineOverhang` | 上下へのはみ出し |
| `statusDate` 🅿 | 基準日。**PoC 専用のキー** — 製品では `Project.status_date`（`StatusDate` へ書き出す Own）であり、`documentSettings` ではなく**文書のデータ**である（`../02-data-model/grs-document-settings-ja.md` §3） |

**LOD のしきい値**

**描く Task と行が変わる**＝出力の中身が変わるので、これも `documentSettings` である
（`../02-data-model/grs-document-settings-ja.md` §4-4）。

| 確定名（英） | 日本語 |
|---|---|
| `rulerTierPxPerDayMonth` | 目盛が 年 → 年＋月 に変わる px/day |
| `rulerTierPxPerDayWeek` | 目盛が 年＋月 → 年＋月＋週 に変わる px/day |
| `rulerTierPxPerDayDay` | 目盛が 年＋月＋週 → 年＋月＋日＋曜日 に変わる px/day |
| `taskLevelOfDetailReadablePx` | この幅を割った深さは描かない |
| `groupLevelOfDetailBase` | グループ LOD の初項 |
| `groupLevelOfDetailRatio` | グループ LOD の公比 |
| `stackSafetyCap` | 積み順の安全弁 |

> **時間軸のしきい値をキーに分ける理由**（確定 2026-08-01）: 隣どうしが互いを縛るためである
> （Month ≦ Week ≦ Day）。`rulerTierPxPerDay = [1, 8]` のような 1 つの配列にすると、
> **どの要素にどの範囲が掛かるかを書く場所が無くなる**。
> 目盛は 4 段階なので、しきい値は**その境目の数だけ 3 本**になる（`handover-ui-detail-spec-ja.md` §6-3）。

**テーマ**

**色のテーマはプロジェクトのテーマカラー**なので文書に保存する
（`../02-data-model/grs-document-settings-ja.md` §4-2）。

| 確定名（英） | 日本語 |
|---|---|
| `themePreference` | 明暗テーマ |
| `themeHue` | テーマの色相 |
| `themeMonochrome` | モノクロにするか |

> **`palette` を名前に使わない。** `Command Palette` / `Palette Groups` / `Palette Commands`
> が既にあり、**同じ語が別のものを指す**ことになる（§2-1-5）。

**ズーム**

| 確定名（英） | 日本語 |
|---|---|
| `zoomStep` ⛔ | 1 ノッチの倍率 |
| `zoomMin` ⛔ | 下限 |
| `zoomMax` ⛔ | 上限 |
| `canvasPadding` | キャンバスの余白 |
| `svgPadding` | SVG の縁の余白 |

**画面の状態**

2026-07-31 に「保存しない」から `documentSettings` へ移した
（`../02-data-model/grs-document-settings-ja.md` §4-2）。

| 確定名（英） | 日本語 |
|---|---|
| `zoomX` | 横のズーム倍率 |
| `zoomY` | 縦のズーム倍率 |
| `scrollDate` | 表示の左端が指す日付 |
| `scrollGroupId` | 表示の上端が指す行 |
| `rowTitlePanelWidth` | `Row Title Panel` の幅 |
| `propertyPanelWidth` | `Properties Panel` の幅 |

> **スクロール位置は px で持たない**（ズームや画面幅が変わると別の場所を指すため）。
> **日付 ＋ 行の識別子**で持つので、名前も `scrollX` / `scrollY` ではない。

**表示の切り替えと文書全体の書式**

（`../02-data-model/grs-document-settings-ja.md` §4-1）

| 確定名（英） | 日本語 |
|---|---|
| `stackDirection` | 積む向き |
| `planActualDisplay` | 予実の表示 |
| `assigneeVisible` | 担当ラベル |
| `percentCompleteVisible` | 完了率ラベル |
| `dependencyVisible` | 依存線 |
| `progressMarkerVisible` | 進捗マーカー |
| `progressLineVisible` | イナズマ線 |
| `dualCursor` | デュアルカーソル |
| `guideCursorMode` | ガイドカーソル |
| `dateGridLinesVisible` | 日付罫線（日付ごとの縦線） |
| `groupGridLinesVisible` | グループ罫線（`TaskGroup` 境界の横線） |
| `baselineVisible` | 変更前の予定を重ねるか |
| `fontScale` | 文字サイズ |
| `importSeq` | 取込の連番 |

> **`todayLineVisible` は廃止した**（確定 2026-07-31）。本日線は保存しない
> （`../02-data-model/grs-document-settings-ja.md` §7）。

**出力**

（`../02-data-model/grs-document-settings-ja.md` §4-3）

| 確定名（英） | 日本語 |
|---|---|
| `exportCanvas` | SVG / PNG の出力サイズ |
| `exportPngScale` | PNG の倍率 |

> **2026-07-31 の改名**: 略語が確定名と語幹一致していなかったものを展開した。
>
> | 旧 | 新 | 語幹を合わせた先 |
> |---|---|---|
> | `depWidth` / `depArrowLen` / `depRunOfArrow` | `dependencyWidth` / `dependencyArrowLength` / `dependencyRunOfArrow` | `Dependency Lines` |
> | `markGap` / `markMin` / `markStroke` / `markOfText` / `markTextOfFont` / `markTextBaseline` | `marker...` | `Progress Marker` |
> | `progWidth` / `progOverhang` | `progressLineWidth` / `progressLineOverhang` | `Progress Line` |
> | `rowLabelW` / `rowLabelFont` / `rowIndent` | ~~`rowTitleWidth`~~ / `rowTitleFont` / `rowTitleIndent` | `Row Title Panel`。⚠️ **`rowTitleWidth` は 2026-08-04 に廃止**（下記） |
> | `laneGap` | `stackGap` | `stackOrder`（`lane` は廃止語） |
> | `shapeH` / `truncUnits` / `minShapeW` / `svgPad` / `canvasPad` | `shapeHeightOf` / `truncateUnits` / `minShapeWidth` / `svgPadding` / `canvasPadding` | 略語をやめた |
> | `todayDay` | `statusDate` | 中身は**基準日**であって本日ではなかった |

> **2026-08-02 の改名（14 キー）**: 07-31 の掃き出しの取りこぼしと、**camelCase に落とすと意味が消える略語**を潰した。
>
> | 旧 | 新 | 直した理由 |
> |---|---|---|
> | `itemLodReadablePx` | **`taskLevelOfDetailReadablePx`** | ① `item` は廃止語（正は `Task`） ② **`LOD` は略語として読めるが `Lod` になると意味が消える**（ユーザー判断 2026-08-02） |
> | `rowLodBase` / `rowLodRatio` | **`groupLevelOfDetailBase` / `groupLevelOfDetailRatio`** | 同上 ＋ 実体は `TaskGroup` の深さであって UI 語の `Rows` ではない |
> | `rulerH` / `basePlanH` | **`rulerHeight` / `basePlanHeight`** | **裸の `H` は `Lod` と同じ**。07-31 に `shapeH` → `shapeHeightOf` を直したのに残っていた |
> | `chevronNotchOfH` / `chevronNotchOfW` | **`chevronNotchOfHeight` / `chevronNotchOfWidth`** | 同上（`OfX` は「÷ X」の意味なので X が読めないと式が読めない） |
> | `leftPaneWidth` | **`rowTitlePanelWidth`** | 07-31 に `rowLabelW` → `rowTitleWidth` で語幹を `Row Title Panel` に合わせたのに、この 1 キーだけ漏れた。`Pane` / `Panel` の綴りも不一致だった |
> | `scrollRowUid` | **`scrollGroupId`** | 語幹（`Row` ↔ `TaskGroup`）も列名（`Uid` ↔ `id`）も**型**（整数 ↔ UUID 文字列）も食い違い、JSON 実例の参照が実際に壊れていた |
> | `progressVisible` | **`percentCompleteVisible`** | **`Progress` が 3 概念を指していた**（`Progress Marker` / `Progress Line` / 完了率ラベル）。表示する値の正式名は `percentComplete` |
> | `gridDateLinesVisible` / `gridGroupLinesVisible` | **`dateGridLinesVisible` / `groupGridLinesVisible`** | UI パーツ名 `Date Grid Lines` / `Group Grid Lines` に対し**語順が反転**していた（`Cursor Guide` → `Guide Cursor` で潰したのと同型） |
> | `resumeArmOfMark` / `resumeHeadOfMark` | **`resumeArmOfMarker` / `resumeHeadOfMarker`** | 07-31 に `mark*` → `marker*` と決めたのに 2 キーだけ漏れた（日本語欄は既に「マーカー」だった） |
>
> | `add-box` | **`highlight-box`** | パレットのコマンド名が UI パーツ名 `Highlight Boxes` と繋がっていなかった（旧「囲み枠」時代の残骸） |
> | 「アイテム LOD」 | **「タスク LOD」** | `item` は廃止語。キー名 `taskLevelOfDetail*` と語幹を合わせた |
> | 「行階層 LOD」 | **「グループ LOD」** | 実体は `TaskGroup`。`Rows` は UI 語。キー名 `groupLevelOfDetail*` と語幹を合わせた |
>
> ✅ **PoC（`../08-poc/poc-integrated.html`）も 2026-08-02 に確定名へ揃えた。** 読み替え表は要らない。
> 案比較の 5 本は同日に引継ぎ資産から外した（`../DISCARDED-ja.md` §4-4b）。

> ⚠️ **2026-08-04 の統合（1 キー）— 改名が 2 キーを生んでいた。**
>
> **`rowTitleWidth` を廃止し、`rowTitlePanelWidth` に一本化した。**
> 07-31 の `rowLabelW` → `rowTitleWidth`（PoC 側の名前）と、08-02 の `leftPaneWidth` → `rowTitlePanelWidth`
> （製品側の名前）は、**別々の改名でありながら同じ「行名ペインの幅」を指していた**。
> どちらも既定 170 で、`../02-data-model/grs-document-settings-ja.md` §3 と §4-2 の両方に載り、
> JSON 実例にも両方入っていた。**製品の実装には `leftPaneWidth` の 1 本しか無かった。**
>
> **`rowTitlePanelWidth` を残した理由**: ①§6 の「使える幅」の式が使っているのはこちら
> ②`propertyPanelWidth` と対になり、上限が相互に依存する規則に載っている
> ③**人がドラッグして変える値**なので、置き場所は §3「描画の設定」ではなく §4-2「画面の状態」が正しい。
>
> **この型は 3 度目である** — §1-3 が潰した記号ラベル 2 組（`軸A`/`軸B` と `案A`〜`案D`）に続く 3 例目。
> **改名は「新しい名前を決める」ことではなく「古い名前を全部潰す」ことである。**
> 改名表を書いたら、**旧名の全出現を機械で走査して残りゼロを確かめる**こと。

---

## 3. UI パーツ木（確定名・責務つき）

前プロジェクトの GUI 木に、**抜けていた 4 件**（依存線・グリッド線・透かし・モーダル）と画面領域の定義を統合した完全版。**これが正。**

```
App Shell                      アプリ全体の器
├─ App Header                  最上部の帯。ブランディング・タイトル・操作
│   ├─ Branding                製品名と著作権表示
│   ├─ Schedule Title          文書の名前。クリック / F2 で編集
│   ├─ Header Commands         Fit / Cmd / SS / Load / Save / Theme / Base / Undo / Redo / AI / ?
│   └─ Autosave Status         localStorage 保存の成否表示
│
├─ Row Title Panel             左の固定パネル。TaskGroup の見出しを階層表示する
│   ├─ Row Title Tree          TaskGroup 木。畳み・並べ替え・表示切替の操作点
│   │                          ‼️ ここでの階層移動は WBS を動かし、MSPDI へ伝播する
│   │                             （UID は保持。grs-native-erd-ja.md §5.5g）
│   └─ Panel Divider           左パネルの幅を変えるドラッグ境界
│
├─ Schedule Canvas             中央の描画領域
│   ├─ Time Ruler              上端の目盛り。年 / 年月 / 年月週 / 年月日曜 の 4 段階
│   ├─ Grid Lines              ‼️ 抜けていた
│   │   ├─ Date Grid Lines     日付罫線（日付ごとの縦線・表示切替あり）
│   │   └─ Group Grid Lines    TaskGroup 境界の横罫線（表示切替あり）
│   ├─ Rows                    TaskGroup 1 つ分の横帯。旧「ribbon」
│   │   └─ Task Bars           その行に載る Task 全部の Bar（§2-0）。milestone も含む
│   │       ├─ Plan Bar        予定側の描画。shapeKind の形で描く
│   │       ├─ Actual Bar      実績側の描画。予定と同じ形で描く（07 §2-2-1）
│   │       ├─ Progress Marker タスクの状態を示す印（完了 / 遅れ / 中断 / 未完了）
│   │       │                  07-plan-actual/handover-plan-actual-decisions-ja.md §2-4
│   │       ├─ Resume Icon     中断のときだけ出る L 字の折れ矢印（同 §2-5）
│   │       ├─ Name Label      Task.name。バー内に収まらなければ右へ出す（同 §6-1）
│   │       └─ Assignee Label  担当と完了率。バーの外側左へ右揃えで連結（同 §6-1）
│   ├─ Dependency Lines        ‼️ 抜けていた（核機能）。全自動配線・経路は保存しない
│   ├─ Canvas Overlays         ‼️ Items から分離（重ね描き層）
│   │   ├─ Progress Line       イナズマ線（実績の進み遅れ）
│   │   ├─ Comment Boxes       引き出し線付きコメント
│   │   ├─ Highlight Boxes     ハイライトボックス
│   │   ├─ Cursors             日付を指す線 3 種の総称。マウスの「ポインタ」とは別物（§2-1-5）
│   │   │   ├─ Today Line      本日線（固定）
│   │   │   ├─ Dual Cursor     縦線 2 本で日数を測る
│   │   │   └─ Guide Cursor    ポインタに追従する補助線（4 モード排他）
│   │   └─ Watermark           ‼️ 抜けていた。斜めタイルの識別表示
│   └─ Scrollbars              横・縦とも常時表示。幅は環境の既定の半分
│                              handover-ui-detail-spec-ja.md §5-2
│
├─ Properties Panel            右の属性編集パネル
│
├─ Command Palette             浮遊するコマンドパネル。ドラッグで移動
│   └─ Palette Groups          ボタンのまとまり（Add など）
│       └─ Palette Commands    個々のボタン
│
└─ Modals                      ‼️ 抜けていた
    ├─ Help Modal              操作説明
    ├─ AI Export Modal         AI へ渡す JSON の表示
    └─ Hidden Group Tab        隠した TaskGroup を戻す小タブ
```

> **`‼️`** = 前プロジェクトの GUI 木に**無かった**もの。核機能（依存線）まで抜けていたので、**木は必ず全数で持つ**こと。

---

## 4. 主な改名（現行 → 確定）

| 現行 | 確定 | 理由 |
|---|---|---|
| Activity Title Panel | **Row Title Panel** | `Activity` を廃し、示す対象（行＝`TaskGroup`）で呼ぶ |
| Activity List | **Row Title Tree** | 実体は木であってリストではない |
| Activity Rows | **Rows** | 冗長な接頭辞を落とす |
| Activity Spans | **Task Bars** | モデル名（`Task`）に合わせる |
| Canvas Items | **Task Bars** に統合 | 「アイテム」という別語をやめる |
| ribbon（帯） | **Row** | 同じものの別名だった |
| lane / laneIndex | **stackOrder** | 同上 |
| activity major/middle/minor category | **`TaskGroup` の深さ** | 3 層固定をやめ、≤Lv5 の入れ子で表す |
| category gridline | **Group Grid Lines** | 「分類」語彙の廃止に合わせる |
| hidden section tab | **Hidden Group Tab** | `section` は廃止済み語 |
| **軸A** | **WBS** | **確定 2026-08-04。** 中身の無いラベルだった。実際の文はほぼ全部「軸A（WBS）」と併記されており、**括弧の中身が全部の仕事をしていた**。実体は `Task.wbs_parent_uid`（親ポインタの木）。**識別子には一度も使われていなかった**ので、コード契約への影響はゼロ |
| **軸B** | **`TaskGroup` ＋ `TaskGroupMember`**（散文では「マルチバー」） | **確定 2026-08-04。** 同上。⚠️ **1 語に置き換えない** — `TaskGroup` は行の器（木の節点）だけで、**「どのタスクが載るか」は `TaskGroupMember`**。**マルチバー＝製品最大の差別化は後者**なので、`TaskGroup` だけに畳むと核が名前から落ちる |

> **なぜ対称な名前をやめたか（2026-08-04）**
>
> **2 つは同じ種類のものではなかった。** `WBS` は木の節点が `Task` 自身で、**外部マスタが権威を持ち export する**。
> `TaskGroup` は節点が器で、`Task` は**載る側**であり、**GRS 専用で export しない**。
> 実体の数も 1 対 2 で違う。**「軸A / 軸B」という対称なラベルが、この非対称を全部隠していた。**
>
> **既成概念があるのは `WBS` だけである。** `TaskGroup` ＋ `TaskGroupMember` を覆う既成語は無く、
> **前プロジェクトが中身の無い記号を置いたのはそのためと思われる。** 次期も 1 語に畳もうとしないこと。

---

## 4-2. UI 再点検の結果 — モデルと突き合わせて判明した差分

前プロジェクトの用語集（アイテム形状・予実・掴み領域・時間軸・カーソル・注記）を今回のモデルと**全数突合**した結果。

### (a) モデルに合わせて改名するもの

| 現行 | 確定 | 理由 |
|---|---|---|
| `item` / `ScheduleItem` / `itemKind`（`'task'`/`'milestone'`） | **`Task` / `Task.milestone`(bool)** | MSPDI と同じ表現。`itemKind` という判別値をやめ**真偽値**にする |
| `abbreviation` `abbreviationPosition` `abbreviationOffset` | **廃止 ＋ `nameAnchor` `nameAlign`** | **略称そのものを廃止**（ユーザー確定 2026-07-26）。アイコンに描くラベルは **`Task.name`**。MSPDI に `Name` / `Notes` しかないのに合わせ、テキスト列を増やさない。位置指定の 2 列は**語幹を `name` に合わせて改名**（9 点アンカー＋左/中央/右詰め、`null`=自動）。旧 `offset(dx,dy)` は**ズームでずれる**ため不採用 |
| `actualEnd` | **`actualFinish`** | 語幹を `finish` に統一（§5-1） |
| `planStart` / `planEnd`（改名予定だった） | **`start` / `finish`** | §5-1 |
| ~~`progressStatus`~~ | **廃止** | 状態が構造化されて不要になった（`../07-plan-actual/handover-plan-actual-decisions-ja.md` §9-5） |
| `iconShapeKind` | **`shapeKind`** | 「アイコン」の 3 つ目の用法を作らない（同 §9-1） |
| `progressRatio`（0〜1） | **`percentComplete`**（整数・0 以上） | MSPDI 同名・同型（`xsd:integer`） |
| ~~`importance`~~ | **廃止** | LOD は WBS の階層の深さで判定する（同 §5） |
| `Cursor Guides`（親） / `Cursor Guide`（子） | **`Cursors`** / **`Guide Cursor`** | 親子が単複違いの同名だった。子だけ語順が逆だった（§2-1-3） |
| `span`（タスク形状名） | **`endpointSpan`** | `measuredSpanDays` と語義が衝突する（§4-2(c)） |

### (b) 【解決済み】UI に必要で当初モデルに無かった列

**すべて取り込み済み**（`../02-data-model/grs-native-erd-ja.md` §5.2 / §5.7）。次期は下表を**確定として**扱う。

| 列 | 用途 | 決着 |
|---|---|---|
| `strokeColor` / `fillColor` | 塗りと輪郭を別に指定 | **2 列に分けた**（`color` 1 列をやめた） |
| **`lineWeight`** | 線の太さ（thin/medium/thick） | **採用**。色以外の冗長符号は WCAG 2.1 AA の要件で落とせない |
| `fadeInDays` / `fadeOutDays` | バー端のテーパ（日付の曖昧さ） | **`Task` の列**として採用（`TaskVisual` ではない。MSPDI 拡張領域で往復するため） |
| ~~`progressStatus`~~ | 進捗の自由文字列 | **廃止**（`../07-plan-actual/handover-plan-actual-decisions-ja.md` §9-5） |
| `taskShape` / `milestoneShape` | タスク形状 | **`shapeKind` の 1 列に統合**（2 列に分けない）。※マイルストーンの**形の詳細**だけは `milestoneGlyph` に分ける（2026-07-30・`../07-plan-actual/handover-plan-actual-decisions-ja.md` §2-2-2） |
| 「**字形**」（日本語） | **形状** | 「字形」は書体の話に読めるので使わない（2026-07-30）。`shapeKind` = **タスク形状**、`milestoneGlyph` = **マイルストーン形状**。※「フォントの字形に依存しない」のように**書体そのもの**を指す場合だけ「字形」を使ってよい |
| `fullName` / `description` / `remarks` | 正式名称・説明・備考 | **不採用**。テキスト列は `name` ＋ `notes` の 2 つだけ（MSPDI に合わせた） |

### (c) 用語の区別として**維持すべき**もの

| 区別 | 内容 |
|---|---|
| **日付 vs 掴み点** | 「開始日/終了日」＝データ、「開始点/終了点」＝画面で掴む場所。**混用禁止**。掴み領域の全数は `handover-ui-detail-spec-ja.md` §4-1 |
| **デュアルカーソル vs ガイドカーソル** | 前者は 2 本で日数を測る機能、後者はポインタ追従の補助線。**別物** |
| **`measuredSpanDays` vs `endpointSpan`（タスク形状）** | 「計測スパン」（デュアルカーソルが測る日数）と「端点スパン」（細線のタスク形状）は**別語義**。`span` を単独で使わない |

---

## 5. 残る論点（**いずれも構造に影響しない**）

| # | 論点 | 状況 |
|---|---|---|
| ~~5-1~~ | ~~予定日付のフィールド名~~ | **確定**（B 案。下記） |
| 5-2 | `Command Palette` の UI 表示名 | ヘッダーの `Cmd` ボタンとの対応は確定済み。**画面に出す文字列だけ未決**（構造に影響しない） |
| ~~5-3~~ | ~~`CursorMode` と `CursorGuideMode` の重複~~（同 D-21） | **確定**（2026-07-30）。型は **1 つ**にし、名前は **`GuideCursorMode`** とする。`documentSettings` の項目も **`guideCursorMode`**（旧 `cursorGuideMode`）。UI パーツ名 `Guide Cursor` と語幹・語順を揃えた |
| ~~5-4~~ | ~~予実の編集モデルと遮蔽時の運用~~ | **確定**（2026-07-26 ユーザー確定。下記） |
| ~~5-5~~ | ~~ユーザー未回答の穴 2 件~~ | **確定**（同上） |

### 5-4/5-5. 【解決】予実の編集モデル — 2026-07-30 更新

前プロジェクトで**回答を得られないまま終わった 2 件**（①`chevron` / `arrow` / `endpointSpan` および
フェード付きタスクは両方表示で実績端点を掴めない ②重ね表示で実績の本体を掴むと予定に解決される）は**決着した**。

> ⚠️ **2026-07-26 版の「上下分離表示にして編集する」は撤回した。上下分離表示そのものを廃止した**
> （`user-order.md` 項 52 は欠番）。以下が確定内容である。

**幾何で解く。モードでは解かない。**

```
予定バーの高さ > 実績バーの高さ    上下に露出した帯で予定を掴む
```

- **実績は予定と同じ形状で描く**（2026-07-30 追加）。予定が矢羽根なら実績も矢羽根。**実績だけ四角にしない。**
- **上下に幅があるタスク形状**（`rectangle` / `chevron`）は、**実績を予定の内側に重ねる**。露出した帯が予定の掴み代になる。
- **幅がないタスク形状**（`arrow` / `endpointSpan`）は内側に収められないので、
  **そのタスク形状だけ実績を下にずらす**。文書全体のモードではなく、**タスク形状ごとの描き方**である。
  実績ぶんの高さを**常に確保する**（表示を切り替えても行の高さが動かない）。
- **マイルストーン**（`milestone`）は下ではなく、**実績日の位置へ横にずらす**（確定 2026-08-01）。
  上下の中心は予定と同じで、占有する縦幅は ◇ 1 つぶん。実績ぶんの高さは確保しない。
- 3 通りの置き方は **`actualPlacement`**（`'inside'` / `'below'` / `'atActualDate'`）で表す（§2-1）。

`[予定]` `[実績]` の 2 トグル（表示の絞り込み）は残す。**両方 OFF は作らせない。**
根拠と却下案は `../07-plan-actual/handover-plan-actual-decisions-ja.md` §2-2 / §2-3 が正。
掴み点・ラベル書式の詳細は **`handover-ui-detail-spec-ja.md` §4**、
実績の入力規則（5 状態）は **`../07-plan-actual/handover-plan-actual-decisions-ja.md` §1-3 が正**
（`handover-ui-detail-spec-ja.md` §4-0 と `../02-data-model/handover-property-mspdi-mapping-ja.md` §3-2 はそこを参照する）。

`planSideVisibility` / `actualSideVisibility`（3 状態＝非表示/表示のみ/操作可能）という**新設列は採らない**。
表示状態は `documentSettings.planActualDisplay`（`both` / `plan-only` / `actual-only` の 3 値）**1 つ**で表す
（色 ＋ 形状の二重符号で識別。WCAG 1.4.1）。

### 5-1. 【解決】予定日付のフィールド名 — **B 案（`start` / `finish`）で確定**

**確定**: 予定 = **`start` / `finish`**、実績 = **`actualStart` / `actualFinish`**。

**これは前プロジェクトの用語集が定めた目標（`planStart`/`planEnd` に改名する）を覆す**。覆す理由を記録する:

1. **`plan` 接頭辞は部分的にしか適用できない** — 予定側には `deadline`（期限）・`stop`/`resume`（中断）もある。`planStart` にするなら `planDeadline` になってしまい、**かえって不統一**になる。
2. **日程ドメインの標準語彙** — MSPDI も P6 も `Start`/`Finish` を予定の意味で使う。この分野の読み手には `start` = 予定開始が自然。
3. **UI とモデルの区別は名前空間で行う** — `PropertyPanel.start` / `Task.start` のように**所属で区別**できるなら、名前自体を変える必要がない（**本書 §1-1 の原則**）。
4. **Adapter が単純** — Own は「同名同形」で写せる。
5. **D-9 の懸念は B 案で解消済み** — D-9 が問題視した非対称は「`startDate`/`endDate` vs `actualStart`/`actualEnd`」という**語幹の不一致**（`Date` 接尾辞・`end` と `finish` の混在）が主因。B 案は**語幹が `start`/`finish` で揃う**ため、その問題は消えている。

> **`actualEnd` → `actualFinish` に変更**（用語集は `actualEnd`）。B 案では語幹を `finish` に揃えるため。MSPDI も `ActualFinish`。

---

## 6. 次期への申し送り

1. **現行コードは全て旧名**。次期は本書の確定名で**最初から**書く。
2. **用語集は次期が自分で作る。前プロジェクトの用語集は引き継がない**（`DISCARDED-ja.md` §3）。
   199 表行の大半が旧名か本書との重複で、**残すと「どちらが勝つか」を読む側が毎回判断させられる**。
   **用語の正は 4 つだけにする**: 本書（命名）／ `../02-data-model/grs-native-erd-ja.md`（データ構造）／
   `../07-plan-actual/handover-plan-actual-decisions-ja.md`（予実・進捗）／
   `../02-data-model/grs-document-settings-ja.md`（設定値）。frontmatter の `authority:` キーがその印である。
   新しい用語を足すときの規則は **§1-2（面ごとの記法・語幹一致）** と **1 概念 1 語**（`user-order.md` 項 66）。
3. **語彙の重複がバグの源だった**という分析（`../README.md` §0-1）は次期でも有効。**1 概念 1 語**を維持する。
