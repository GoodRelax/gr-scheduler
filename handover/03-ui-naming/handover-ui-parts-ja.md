# UI 基本設計（パーツ名と責務）— 引継ぎ Step 2 成果物

- 日付: 2026-07-26
- 目的: 次期開発が**最初から確定名で始められる**ようにする。現行コードは旧名のままなので、本書の名前で作り直す。
- 素材: 前プロジェクトの用語集・GUI 木（**どちらも旧名のため `handover/` には無い**。`DISCARDED-ja.md` §3）/ `../06-background/refactor-gui-data-separation-ja.md`（木の抜けの指摘）/ `../02-data-model/grs-native-erd-ja.md`（データモデル）
- 位置づけ: **UI パーツ名の確定版**。データ構造は `../02-data-model/grs-native-erd-ja.md` が正。
  **日英対応表は §2-1 が正**（全数をそこに置く。他の文書に同じ表を作らない）。
  予実・進捗まわりの設計は `../07-plan-actual/handover-plan-actual-decisions-ja.md` が正。

---

## 1. 命名の原則（確定）

### 1-1. モデル名称を正とし、UI 名称を合わせる

**UI 名称とモデル名称が食い違う場合は、UI 名称を変更する。**

現行は同じものに **UI 側と データ側で別の語**を当てており、それが「画面とデータが同じ語彙で混在している」（`refactor-gui-data-separation-ja.md` が指摘した**バグの根因**）状態を生んでいた。次期は**モデルの語彙に一本化**する。

### 1-2. 面ごとの記法（**本書が正**）

| 面 | 記法 | 例 |
|---|---|---|
| 型・クラス | PascalCase | `TaskGroup` |
| 関数・変数・**JSON プロパティ** | camelCase | `stackOrder` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_GROUP_DEPTH` |
| 文字列判別値・`data-role`・CSS クラス | kebab-case | `toggle-plan` |
| i18n キー・**プロパティパネルの項目名** | snake_case | `stack_order` |

> **同じ概念でも面が違えば記法が違う**のは規則どおり（矛盾ではない）。ただし**語幹は必ず一致させる**（`stackOrder` ↔ `stack_order`。`laneIndex` ↔ `stack_order` のような**語幹の不一致は禁止**）。

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
| `shapeKind` | **形状種** |
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
| **`Progress Marker`** | **進捗マーカー** |
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

#### 2-1-4. 例外リスト（直訳しないもの）

| 英語 | 日本語 | 例外にする理由 |
|---|---|---|
| `Progress Line` | **イナズマ線** | 日本の日程管理で定着した語。「進捗線」に変えると日本のユーザーに通じなくなり、`user-order.md` 項 6-4（マニュアルを見ないで使える）に反する |

**例外はこの 1 件だけ。** 増やすときは必ずこの表に追記する。「なんとなく違う」を許すと規則が崩れる。

#### 2-1-5. 曖昧な日本語を単独で使わない

同じ日本語が複数の概念を指す語がある。**単独で書いたら誤り**とする。

| 曖昧な日本語 | 書き方 |
|---|---|
| 段 | **「積み順（`stackOrder`）」** / **「階層の深さ（`OutlineLevel`）」** と必ず併記 |
| 行 | **`Rows`**（UI パーツ）/ **「タスクグループ（`TaskGroup`）」**（データ） |
| レベル | `OutlineLevel` / `TaskGroup` の深さ / LOD のどれかを明示 |
| 幅 | 「日付の幅」/ **「占有幅」**（ラベル込み）を区別 |
| 期間 | 「予定の期間」/ **`actualDuration`（実績期間）** / 表示期間 を明示 |

**文中で属性に触れるときは所属を付ける**（`stackOrder` ではなく `Task.stackOrder`）。
§1-2 の記法により、**形で面が見分けられる**。

```
UI パーツ         PascalCase の複合語（空白あり）   Row Title Panel / Progress Marker
データの実体       PascalCase 1 語                  Task / TaskGroup
データの属性       Entity.field 形式                Task.stackOrder / Task.actualDuration
プロパティ項目名   snake_case                       stack_order
```

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
│   │                          ‼️ ここでの階層移動は WBS（軸A）を動かし、MSPDI へ伝播する
│   │                             （UID は保持。grs-data-model-ja.md §7.1-2）
│   └─ Panel Divider           左パネルの幅を変えるドラッグ境界
│
├─ Schedule Canvas             中央の描画領域
│   ├─ Time Ruler              上端の年・月・日・曜の目盛り
│   ├─ Grid Lines              ‼️ 抜けていた
│   │   ├─ Date Grid Lines     日付の縦罫線（表示切替あり）
│   │   └─ Group Grid Lines    TaskGroup 境界の横罫線（表示切替あり）
│   ├─ Rows                    TaskGroup 1 つ分の横帯。旧「ribbon」
│   │   └─ Task Bars           Task の描画。milestone は ◆、それ以外はスパン
│   │       └─ Progress Marker タスクの状態を示す印（完了 / 中断 / 期限超過 / 未完了）
│   │                          07-plan-actual/handover-plan-actual-decisions-ja.md §2-4
│   ├─ Dependency Lines        ‼️ 抜けていた（核機能）。全自動配線・経路は保存しない
│   └─ Canvas Overlays         ‼️ Items から分離（重ね描き層）
│       ├─ Progress Line       イナズマ線（実績の進み遅れ）
│       ├─ Comment Boxes       引き出し線付きコメント
│       ├─ Highlight Boxes     丸角の囲み枠
│       ├─ Cursors             カーソル 3 種の総称
│       │   ├─ Today Line      本日線（固定）
│       │   ├─ Dual Cursor     縦線 2 本で日数を測る
│       │   └─ Guide Cursor    ポインタに追従する補助線（4 モード排他）
│       └─ Watermark           ‼️ 抜けていた。斜めタイルの識別表示
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

---

## 4-2. UI 再点検の結果 — モデルと突き合わせて判明した差分

前プロジェクトの用語集（アイテム字形・予実・掴み領域・時間軸・カーソル・注記）を今回のモデルと**全数突合**した結果。

### (a) モデルに合わせて改名するもの

| 現行 | 確定 | 理由 |
|---|---|---|
| `item` / `ScheduleItem` / `itemKind`（`'task'`/`'milestone'`） | **`Task` / `Task.milestone`(bool)** | MSPDI と同じ表現。`itemKind` という判別値をやめ**真偽値**にする |
| `abbreviation` `abbreviationPosition` `abbreviationOffset` | **廃止 ＋ `nameAnchor` `nameAlign`** | **略称そのものを廃止**（ユーザー確定 2026-07-26）。アイコンに描くラベルは **`Task.name`**。MSPDI に `Name` / `Notes` しかないのに合わせ、テキスト列を増やさない。位置指定の 2 列は**語幹を `name` に合わせて改名**（9 点アンカー＋左/中央/右詰め、`null`=自動）。旧 `offset(dx,dy)` は**ズームでずれる**ため不採用 |
| `actualEnd` | **`actualFinish`** | 語幹を `finish` に統一（§5-1） |
| `planStart` / `planEnd`（改名予定だった） | **`start` / `finish`** | §5-1 |
| ~~`progressStatus`~~ | **廃止** | 状態が構造化されて不要になった（`../07-plan-actual/handover-plan-actual-decisions-ja.md` §9-5） |
| `iconShapeKind` | **`shapeKind`** | 「アイコン」の 3 つ目の用法を作らない（同 §9-1） |
| `progressRatio`（0〜1） | **`percentComplete`**（整数 0〜100） | MSPDI 同名・同型（`xsd:integer`） |
| ~~`importance`~~ | **廃止** | LOD は WBS の階層の深さで判定する（同 §5） |
| `Cursor Guides`（親） / `Cursor Guide`（子） | **`Cursors`** / **`Guide Cursor`** | 親子が単複違いの同名だった。子だけ語順が逆だった（§2-1-3） |
| `span`（形状種名） | **`endpointSpan`** | `measuredSpanDays` と語義が衝突する（§4-2(c)） |

### (b) 【解決済み】UI に必要で当初モデルに無かった列

**すべて取り込み済み**（`../02-data-model/grs-native-erd-ja.md` §5.2 / §5.7）。次期は下表を**確定として**扱う。

| 列 | 用途 | 決着 |
|---|---|---|
| `strokeColor` / `fillColor` | 塗りと輪郭を別に指定 | **2 列に分けた**（`color` 1 列をやめた） |
| **`lineWeight`** | 線の太さ（thin/medium/thick） | **採用**。色以外の冗長符号は WCAG 2.1 AA の要件で落とせない |
| `fadeInDays` / `fadeOutDays` | バー端のテーパ（日付の曖昧さ） | **`Task` の列**として採用（`TaskVisual` ではない。MSPDI 拡張領域で往復するため） |
| ~~`progressStatus`~~ | 進捗の自由文字列 | **廃止**（`../07-plan-actual/handover-plan-actual-decisions-ja.md` §9-5） |
| `taskShape` / `milestoneShape` | 形状種 | **`shapeKind` の 1 列に統合**（2 列に分けない） |
| `fullName` / `description` / `remarks` | 正式名称・説明・備考 | **不採用**。テキスト列は `name` ＋ `notes` の 2 つだけ（MSPDI に合わせた） |

### (c) 用語の区別として**維持すべき**もの

| 区別 | 内容 |
|---|---|
| **日付 vs 掴み点** | 「開始日/終了日」＝データ、「開始点/終了点」＝画面で掴む場所。**混用禁止**。掴み領域の全数は `handover-ui-detail-spec-ja.md` §4-1 |
| **デュアルカーソル vs ガイドカーソル** | 前者は 2 本で日数を測る機能、後者はポインタ追従の補助線。**別物** |
| **`measuredSpanDays` vs `endpointSpan`（形状種）** | 「計測スパン」（デュアルカーソルが測る日数）と「端点スパン」（細線の形状種）は**別語義**。`span` を単独で使わない |

---

## 5. 残る論点（**いずれも構造に影響しない**）

| # | 論点 | 状況 |
|---|---|---|
| ~~5-1~~ | ~~予定日付のフィールド名~~ | **確定**（B 案。下記） |
| 5-2 | `Command Palette` の UI 表示名 | ヘッダーの `Cmd` ボタンとの対応は確定済み。**画面に出す文字列だけ未決**（構造に影響しない） |
| 5-3 | `CursorMode` と `CursorGuideMode` の重複（同 D-21） | 未調査。**型が 2 つ残っている**。次期で 1 つに統合する |
| ~~5-4~~ | ~~予実の編集モデルと遮蔽時の運用~~ | **確定**（2026-07-26 ユーザー確定。下記） |
| ~~5-5~~ | ~~ユーザー未回答の穴 2 件~~ | **確定**（同上） |

### 5-4/5-5. 【解決】予実の編集モデル — 2026-07-26 ユーザー確定

前プロジェクトで**回答を得られないまま終わった 2 件**（①矢羽根/矢印/細線スパンおよびフェード付きタスクは
両方表示で実績端点を掴めない ②重ね表示で実績の本体を掴むと予定に解決される）は**決着した**。

**モードで解く。**「予定のみ / 実績のみ」に切り替えるか、上下分離表示にして編集する。
掴み点・ラベル書式・遷移モードの詳細は **`handover-ui-detail-spec-ja.md` §4**、
実績の入力規則（3 状態）は同 **§4-0** と `../02-data-model/handover-property-mspdi-mapping-ja.md` §3-2 が正。

`planSideVisibility` / `actualSideVisibility`（3 状態＝非表示/表示のみ/操作可能）という**新設列は採らない**。
表示状態は**遷移モード 1 つ**で表す（色 ＋ アイコン形状の二重符号で識別。WCAG 1.4.1）。

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
   **用語の正は 2 つだけにする**: 本書（命名）と `../02-data-model/grs-native-erd-ja.md`（データ構造）。
   新しい用語を足すときの規則は **§1-2（面ごとの記法・語幹一致）** と **1 概念 1 語**（`user-order.md` 項 66）。
3. **語彙の重複がバグの源だった**という分析（`refactor-gui-data-separation-ja.md`）は次期でも有効。**1 概念 1 語**を維持する。
