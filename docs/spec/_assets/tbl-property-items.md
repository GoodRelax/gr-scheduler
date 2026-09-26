# プロパティ項目 — 表 T-016

**UID**: DOC-TBL-PROPERTY-ITEMS
**Version**: 0.1

> ⛔ 本書は生成物である。  
> 手で直さない —— 直しても次の `npm run gen` で消える。
> **プロパティ項目の唯一の正は `_source/property-items.json` である。**  
> 本書はそれを `_source/property_items_json_to_md.py` が印字したものである。
> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`（検査 16 が呼ぶ）。

規則は `FR-006` が持つ。  
本書は全数と、各行の列・入力の型・対象・備考・交換相手の対応を印字する。

⛔ **`対象` の欄は、その行を出すのがどちらの選択のときかを言う（MUST）** —— `FR-006` が「いま選ばれているものと同じ「対象」を持つ行だけを出すこと（MUST）」と定める。  
⚠️ **本表の並びは印刷順そのものなので、対象を持たないと `TaskGroup` の `minHeight` が`Task` のパネルにも出る**。

⛔ **画面に出す名は本表に無い（MUST NOT）** —— `FR-038` が「画面に刷る語は、言語ごとの辞書として 1 か所に持つこと（MUST）」と定めるので、表示名は `_source/display-words.json` の `properties` 節が同じ行 ID で持つ。  
⚠️ **本表の `列` は GRS JSON の列名であって、画面に出す名ではない。**

⛔ **画面に出す名は画面の言語に従う（`FR-038`）。**  
⭐ **交換形式の列名は本表の `列` の欄が持つ** —— **往復の手がかりはそこに在り、画面に出す名が担うものではない。**

⛔ **選択の候補・数値の下限と上限・日付である列を本表へ写してはならない（MUST NOT）** —— `_source/grs-document.schema.json` と `DATE_COLUMNS` が既に持つ。  
写すと正が 2 か所になる。

**表 T-016 — プロパティ項目**

| 行 ID | 列（`GRS JSON`）| 入力の型 | 対象 | 備考 | MSPDI |
| --- | --- | --- | --- | --- | --- |
| PR-1 | `name` | 文字 | `Task` | バーに描くラベル | `Task/Name` |
| PR-3 | `start` / `finish` | 日付 / 日付 | `Task` | **予定**の日付 | `Task/Start` `Task/Finish` |
| PR-16 | `assignee` | 選択 | `Task` | 編集できる。<br>入口と選び方は `FR-008` の表 T-225 が持つ。<br> ⚠️ **`Task` の列ではない** —— 実体は `Assignment` であり、表示する名は割当から導出する | `Assignment/ResourceUID`（`mspdi_pj12.xsd:3207`・`xsd:integer`）。<br>名は `Resource/Name` |
| PR-4 | `actualStart` | 日付 | `Task` |  | `Task/ActualStart` |
| PR-5 | `actualDuration` | 数値 | `Task` | 文書の列ではない —— `FR-011` が日付から数えた実績の長さ（両端の日は非稼働日でも数える）。<br>入れると、`actualStart` の後に来る稼働日を入れた数 − 1 個数えた日を実績の最後の日（完了していれば `actualFinish`、それ以外は `stop`）に置く | `Task/ActualDuration` |
| PR-6 | `actualFinish` | 日付 | `Task` | 完了したときだけ入る | `Task/ActualFinish` |
| PR-9 | `percentComplete` | 数値（読み取り専用） | `Task` | **読み取り専用。<br>** 型と算出は `FR-012` | `Task/PercentComplete` |
| PR-10 | `deadline` | 日付 | `Task` | 終了日とは別の独立マーカー | `Task/Deadline` |
| PR-2 | `notes` | 複数行 | `Task` |  | `Task/Notes` |
| PR-7 | `resume` | 日付 | `Task` | 中断したときだけ入る | `Task/Resume` |
| PR-8 | `resumeValid` | 真偽 | `Task` | `false` = 再開日未定の中断 | `Task/ResumeValid` |
| PR-17 | `milestoneGlyph` | 選択 | `Task` | `shapeKind` が `'milestone'` のときだけ有効。<br>置いた後も変えられること（`FR-078`） | 無い（`GRS JSON` のみ） |
| PR-14 | `fadeInDays` / `fadeOutDays` | 数値 / 数値 | `Task` | 日付の曖昧さを端のぼかしで表す。<br>**適用する形状は表 T-012a の `FD-5` が限る** | `Task/ExtendedAttribute`（通常の列は無い。<br>拡張領域を使うのはこの 2 つだけである。<br>枠の選び方は 表 T-033 の `EX-6`） |
| PR-15 | `wbsParentUid` | 選択 | `Task` | 階層の深さはここから導出する | `Task/OutlineLevel` へ導出 |
| PR-12 | `strokeColor` / `fillColor` / `lineWeight` | 色 / 色 / 選択 | `Task` | FR-007 | 無い（`GRS JSON` のみ） |
| PR-18 | `label` | 文字 | `TaskGroup` | 行の名前。<br>⚠️ **実体は `fig-erd-detail.md` の `AT-53` である** —— 表 T-023 の `MK-13` が名指すのはそちらであり、本行はその値をパネルに出す項目のほうである | 無い（`GRS JSON` のみ） |
| PR-20 | `minHeight` | 数値 | `TaskGroup` | 行の最小の高さ（縦のズーム 100% のときの画面の px）。<br>`null` ＝ 下限なし。<br>欄の出し方は `FR-042` の 表 T-338 が持つ | 無い（`GRS JSON` のみ） |
| PR-33 | `editGroup` | 文字 | `TaskGroup` | 行を編集できるグループの名乗り（`fig-erd-detail.md` の `AT-144`）。<br>空の欄は `null` ＝ 誰でも編集できる。<br>⭐ **人だけが入れ・消せる項目である** —— `editGroup` が `null` でない行でも編集でき、`Agent API` からは書けない。<br>規則は `FR-111` の 表 T-275 の `GP-1` が持つ | 無い（`GRS JSON` のみ） |
| PR-19 | `color` | 色 | `TaskGroup` | 行の帯の色。<br>`null` ＝ テーマから解く | 無い（`GRS JSON` のみ） |
| PR-21 | `text` | 複数行 | `CommentBox` | 付箋の本文。<br>⚠️ **「コメント」と略さない**（`U-14`）。<br>⭐ **本行が 表 T-023 の `MK-13` の言う「本文の編集」の入口である** —— **図の上で打ち換える器は作らない** | 無い（`GRS JSON` のみ） |
| PR-26 | `strokeWidthPx` | 数値 | `CommentBox` | 本文の箱の枠と引出し線の太さ（px）。<br>既定と範囲は `_assets/tbl-settings.md` の表 T-217 の `S-374` | 無い（`GRS JSON` のみ） |
| PR-27 | `fillTransparencyPercent` | 数値 | `CommentBox` | 本文の箱の塗りの透過率。<br>0 は不透明、100 は透明。<br>既定と範囲は同表の `S-375` | 無い（`GRS JSON` のみ） |
| PR-28 | `strokeColor` / `fillColor` / `textColor` | 色 / 色 / 色 | `CommentBox` | 枠と引出し線・本文の箱の塗り・本文の字の色。<br>`null` ＝ `FR-019` が名指す色（`S-312` ・ `S-146` ・ `S-147`）。<br>⭐ 色の行なので、同じ対象の行の並びの末尾に置く（`FR-006`） | 無い（`GRS JSON` のみ） |
| PR-23 | `strokeWidthPx` | 数値 | `HighlightBox` | 枠の線の太さ（px）。<br>既定と範囲は `_assets/tbl-settings.md` の表 T-217 の `S-369` | 無い（`GRS JSON` のみ） |
| PR-24 | `fillTransparencyPercent` | 数値 | `HighlightBox` | 塗りの透過率。<br>0 は不透明、100 は透明。<br>既定と範囲は同表の `S-371` | 無い（`GRS JSON` のみ） |
| PR-22 | `strokeColor` | 色 | `HighlightBox` | ハイライトボックスの枠の色（`CM-55`）。<br>`null` ＝ テーマから解く。<br>⚠️ **透明は取らない**（`FR-019`、表 T-017b の `CV-9`） | 無い（`GRS JSON` のみ） |
| PR-25 | `fillColor` | 色 | `HighlightBox` | 塗りの色。<br>`null` ＝ 同表の `S-370` の色（既定は透明 ＝ 塗らない）。<br>規則は `FR-019` | 無い（`GRS JSON` のみ） |
