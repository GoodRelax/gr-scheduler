# UI 基本設計（パーツ名と責務）— 引継ぎ Step 2 成果物

- 日付: 2026-07-26
- 目的: 次期開発が**最初から確定名で始められる**ようにする。現行コードは旧名のままなので、本書の名前で作り直す。
- 素材: `docs/spec/glossary.md`（製品用語 SSOT・387行・第3版）/ `docs/spec/gur-components.md`（GUI 木）/ `docs/analysis/refactor-gui-data-separation-ja.md`（木の抜けの指摘）/ 今回の GRS データモデル（`grs-native-erd-ja.md`）
- 位置づけ: **UI パーツ名の確定版**。データ構造は `grs-native-erd-ja.md` が正。

---

## 1. 命名の原則（確定）

### 1-1. モデル名称を正とし、UI 名称を合わせる

**UI 名称とモデル名称が食い違う場合は、UI 名称を変更する。**

現行は同じものに **UI 側と データ側で別の語**を当てており、それが「画面とデータが同じ語彙で混在している」（`refactor-gui-data-separation-ja.md` が指摘した**バグの根因**）状態を生んでいた。次期は**モデルの語彙に一本化**する。

### 1-2. 面ごとの記法（`glossary.md` §2 を継承）

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

### 2-1. 日本語 UI ラベル

| 確定名（英） | 日本語 UI |
|---|---|
| `TaskGroup` | 行 / グループ（階層の見出しとして表示するときは「見出し」） |
| `Task` | タスク（`milestone=true` は「マイルストーン」と表示） |
| `stackOrder` | 段（縦の積み順） |

---

## 3. UI パーツ木（確定名・責務つき）

`gur-components.md` の木に、`refactor-gui-data-separation-ja.md` が指摘した**抜け 4 件**（依存線・グリッド線・透かし・モーダル）と `glossary.md` §3.1 の領域を統合した完全版。

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
│   └─ Panel Divider           左パネルの幅を変えるドラッグ境界
│
├─ Schedule Canvas             中央の描画領域
│   ├─ Time Ruler              上端の年・月・日・曜の目盛り
│   ├─ Grid Lines              ‼️ 抜けていた
│   │   ├─ Date Grid Lines     日付の縦罫線（表示切替あり）
│   │   └─ Group Grid Lines    TaskGroup 境界の横罫線（表示切替あり）
│   ├─ Rows                    TaskGroup 1 つ分の横帯。旧「ribbon」
│   │   └─ Task Bars           Task の描画。milestone は ◆、それ以外はスパン
│   ├─ Dependency Lines        ‼️ 抜けていた（核機能）。全自動配線・経路は保存しない
│   └─ Canvas Overlays         ‼️ Items から分離（重ね描き層）
│       ├─ Progress Line       イナズマ線（実績の進み遅れ）
│       ├─ Comment Boxes       引き出し線付きコメント
│       ├─ Highlight Boxes     丸角の囲み枠
│       ├─ Cursor Guides       今日線 / 単線 / 十字 / 二重カーソル（排他 4 種）
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

> **`‼️`** = `gur-components.md` の初版に無く、`refactor-gui-data-separation-ja.md` が指摘した抜け。

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

`glossary.md` §4〜§9（アイテム字形・予実・掴み領域・時間軸・カーソル・注記）を今回のモデルと全数突合した。

### (a) モデルに合わせて改名するもの

| 現行 | 確定 | 理由 |
|---|---|---|
| `item` / `ScheduleItem` / `itemKind`（`'task'`/`'milestone'`） | **`Task` / `Task.milestone`(bool)** | MSPDI と同じ表現。`itemKind` という判別値をやめ**真偽値**にする |
| `abbreviation` `abbreviationPosition` `abbreviationOffset` | **`abbrev` `abbrevAnchor` `abbrevAlign`** | 今回の設計で**位置の表し方が変わった**（9 点アンカー＋左/中央/右詰め、`null`=自動）。旧 `offset(dx,dy)` は**ズームでずれる**ため不採用 |
| `actualEnd` | **`actualFinish`** | 語幹を `finish` に統一（§5-1） |
| `planStart` / `planEnd`（改名予定だった） | **`start` / `finish`** | §5-1 |
| `progressStatus`（現 `status`） | **`progressStatus`** のまま | 用語集の改名を採用（`status` は汎用語すぎる・D-8） |

### (b) モデルに**無い**が UI に必要なもの（次期で追加が要る）

今回の `TaskVisual` は `abbrev` / `iconShapeKind` / `color` / `abbrevAnchor` / `abbrevAlign` / `importance` の 6 列しか持たない。**以下が不足**している。

| 不足 | 用途 | 備考 |
|---|---|---|
| `strokeColor` / `fillColor` の分離 | 塗りと輪郭を別に指定 | 現行は `color` 1 列。**2 列に分ける** |
| **`lineWeight`** | 線の太さ（thin/medium/thick） | **色以外の冗長符号＝WCAG 2.1 AA の要件**。落とせない |
| `fadeInDays` / `fadeOutDays` | バー端のテーパ（日付の曖昧さ） | 製品固有の表現 |
| `fullName` / `description` / `remarks` | 正式名称・説明・備考 | `Task.name` とは別 |
| `progressStatus` | 進捗の自由文字列 | 数値の `progressRatio` とは別 |
| `taskShape` / `milestoneShape` | 字形（bar/chevron/arrow/span、菱形ほか） | `iconShapeKind` に統合済みか要確認 |

> **これは Step 3（データ構造設計）で `TaskVisual` に追加すべき列**。今回の設計は MSPDI 交換に集中したため、GRS 固有の視覚属性を洗い切れていない。

### (c) 用語の区別として**維持すべき**もの

| 区別 | 内容 |
|---|---|
| **日付 vs 掴み点** | 「開始日/終了日」＝データ、「開始点/終了点」＝画面で掴む場所。**混用禁止**（`glossary.md` §5 の明示規則） |
| **デュアルカーソル vs ガイドカーソル** | 前者は 2 本で日数を測る機能、後者はポインタ追従の補助線。**別物** |
| **`measuredSpanDays` vs `span`（字形）** | 「計測スパン」と「スパン字形」は別語義（D-16） |

---

## 5. 未決（次期で決める）

| # | 論点 | 状況 |
|---|---|---|
| ~~5-1~~ | ~~予定日付のフィールド名~~ | **確定**（B 案。下記） |
| 5-2 | `Command Palette` の UI 表示名（`glossary.md` D-7 協議中） | ヘッダーの `Cmd` ボタンとの対応は確定済み。表示文字列のみ未決 |
| 5-3 | `CursorMode` と `CursorGuideMode` の重複（同 D-21） | 未調査。**型が 2 つ残っている**。次期で 1 つに統合する |
| **5-4** | **CR-017「予実の編集モデルと遮蔽時の運用」が未起票** | **下記 5-5**。用語集・分析文書 5 本が参照しているが **CR は存在しない** |
| **5-5** | **ユーザー未回答の穴 2 件** | 下記 |

### 5-4/5-5. 未起票の CR-017 と、回答を待っている 2 つの穴

`project-management/handoff-cr-013-016-followups.md` に「change-manager で **CR-017「予実の編集モデルと遮蔽時の運用」** を起票する」と書かれているが、**`project-records/change-requests/` に CR-017 は存在しない**。`planSideVisibility` / `actualSideVisibility`（予定側/実績側の 3 状態＝非表示/表示のみ/操作可能）は**用語集に「新設予定」として載っているだけ**で、要求としては宙に浮いている。

同文書に、**ユーザーへ質問したがセッション終了で回答を得られなかった 2 件**が記録されている:

1. **矢羽根/矢印/span 字形およびフェード付きタスクは、`both` 表示で実績専用バーを描かないため実績端点を掴めない**（1 アイテム = 1 グリフの制約）
2. **Overlap 表示で実績の本体を掴むと予定に解決される**（同点時は予定優先）

> **次期への申し送り**: この 2 件は「予実をどう編集させるか」の核心。**設計を始める前に決める**こと。

### 5-1. 【解決】予定日付のフィールド名 — **B 案（`start` / `finish`）で確定**

**確定**: 予定 = **`start` / `finish`**、実績 = **`actualStart` / `actualFinish`**。

**これは `glossary.md` D-9（`planStart`/`planEnd` に改名する）を覆す**。覆す理由を記録する:

1. **`plan` 接頭辞は部分的にしか適用できない** — 予定側には `deadline`（期限）・`stop`/`resume`（中断）もある。`planStart` にするなら `planDeadline` になってしまい、**かえって不統一**になる。
2. **日程ドメインの標準語彙** — MSPDI も P6 も `Start`/`Finish` を予定の意味で使う。この分野の読み手には `start` = 予定開始が自然。
3. **UI とモデルの区別は名前空間で行う** — `PropertyPanel.start` / `Task.start` のように**所属で区別**できるなら、名前自体を変える必要がない（**本書 §1-1 の原則**）。
4. **Adapter が単純** — Own は「同名同形」で写せる。
5. **D-9 の懸念は B 案で解消済み** — D-9 が問題視した非対称は「`startDate`/`endDate` vs `actualStart`/`actualEnd`」という**語幹の不一致**（`Date` 接尾辞・`end` と `finish` の混在）が主因。B 案は**語幹が `start`/`finish` で揃う**ため、その問題は消えている。

> **`actualEnd` → `actualFinish` に変更**（用語集は `actualEnd`）。B 案では語幹を `finish` に揃えるため。MSPDI も `ActualFinish`。

---

## 6. 次期への申し送り

1. **現行コードは全て旧名**（`glossary.md` の「改名予定」列が示すとおり）。次期は本書の確定名で**最初から**書く。
2. **`glossary.md` は保守する価値がある**。387 行・221 表行で、用語の揺れ 22 件を確定/協議中の別に記録している。次期でも**製品用語の SSOT** として引き継ぐ。
3. **語彙の重複がバグの源だった**という分析（`refactor-gui-data-separation-ja.md`）は次期でも有効。**1 概念 1 語**を維持する。
