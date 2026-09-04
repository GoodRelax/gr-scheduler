# プロパティ項目 — 表 T-016

**UID**: DOC-TBL-PROPERTY-ITEMS
**Version**: 0.1

> ⛔ **本書は生成物である。手で直さない —— 直しても次の `npm run gen` で消える。**
> **プロパティ項目の唯一の正は `_source/property-items.json` である。** 本書はそれを `_source/property_items_json_to_md.py` が印字したものである。
> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`（検査 16 が呼ぶ）。

**規則は `FR-006` が持つ。本書は全数と、各行の列・入力の型・対象・備考・交換相手の対応を印字する。**

⛔ **`対象` の欄は、その行を出すのがどちらの選択のときかを言う（MUST）** —— `FR-006` が「いま選ばれているものと同じ対象を持つ行だけを出すこと（MUST）」と定める。⚠️ **本表の並びは印刷順そのものなので、対象を持たないと `TaskGroup` の `height` が`Task` のパネルにも出る**（利用者の裁定 2026-09-02）。

⛔ **画面に出す名は本表に無い（MUST NOT）** —— `FR-038` が「画面に刷る語は言語ごとの辞書 1 つに持つ」と定めるので、表示名は `_source/display-words.json` の `properties` 節が同じ行 ID で持つ。⚠️ **本表の `列` は GRS JSON の列名であって、画面に出す名ではない。**

⛔⛔ **画面に出す名は表示言語に従う（`FR-038`）。**⚠️⚠️ **2026-09-04 まで、ここには「項目名を英語のまま保つ理由」が在った** —— **その裁定（2026-09-03）は、実装が英語で刷っているという偽の前提の上に下されており、2026-09-04 に覆った。**⭐ **交換形式の列名は本表の `列` の欄が持つ** —— **往復の手がかりはそこに在り、画面に出す名が担うものではない。**

⛔ **選択の候補・数値の下限と上限・日付である列を本表へ写してはならない（MUST NOT）** —— `_source/grs-document.schema.json` と `DATE_COLUMNS` が既に持つ。写すと正が 2 か所になる。

**表 T-016 — プロパティ項目**

| 行 ID | 列（`GRS JSON`）| 入力の型 | 対象 | 備考 | MSPDI |
| --- | --- | --- | --- | --- | --- |
| PR-1 | `name` | 文字 | `Task` | バーに描くラベル | `Task/Name` |
| PR-3 | `start` / `finish` | 日付 / 日付 | `Task` | **予定**の日付 | `Task/Start` `Task/Finish` |
| PR-16 | `assignee` | 選択 | `Task` | **編集できる。入口と選び方は `FR-008` の表 T-225 が持つ。** ⚠️ **`Task` の列ではない** —— 実体は `Assignment` であり、表示する名は割当から導出する | `Assignment/ResourceUID`（`mspdi_pj12.xsd:3207`・`xsd:integer`）。名は `Resource/Name` |
| PR-4 | `actualStart` | 日付 | `Task` |  | `Task/ActualStart` |
| PR-5 | `actualDuration` | 数値 | `Task` | 実績バーの長さそのもの（稼働日数） | `Task/ActualDuration` |
| PR-6 | `actualFinish` | 日付 | `Task` | 完了したときだけ入る | `Task/ActualFinish` |
| PR-9 | `percentComplete` | 数値（読み取り専用） | `Task` | **読み取り専用。** 型と算出は `FR-012` | `Task/PercentComplete` |
| PR-10 | `deadline` | 日付 | `Task` | 終了日とは別の独立マーカー | `Task/Deadline` |
| PR-2 | `notes` | 複数行 | `Task` |  | `Task/Notes` |
| PR-7 | `resume` | 日付 | `Task` | 中断したときだけ入る | `Task/Resume` |
| PR-8 | `resumeValid` | 真偽 | `Task` | `false` = 再開日未定の中断 | `Task/ResumeValid` |
| PR-17 | `milestoneGlyph` | 選択 | `Task` | `shapeKind` が `'milestone'` のときだけ有効。置いた後も変えられること（`FR-078`） | 無い（`GRS JSON` のみ） |
| PR-12 | `strokeColor` / `fillColor` / `lineWeight` | 色 / 色 / 選択 | `Task` | FR-007 | 無い（`GRS JSON` のみ） |
| PR-13 | `nameAnchor` / `nameAlign` | 数値 / 選択 | `Task` | FR-002 | 無い（`GRS JSON` のみ） |
| PR-14 | `fadeInDays` / `fadeOutDays` | 数値 / 数値 | `Task` | 日付の曖昧さを端のぼかしで表す。**適用する形状は表 T-012a の `FD-5` が限る** | `Task/ExtendedAttribute`（**通常の列は無い。拡張領域を使うのはこの 2 つだけである**。枠の選び方は 表 T-033 の `EX-6`） |
| PR-15 | `wbsParentUid` | 選択 | `Task` | 階層の深さはここから導出する | `Task/OutlineLevel` へ導出 |
| PR-18 | `label` | 文字 | `TaskGroup` | 行の名前。⚠️ **実体は `fig-erd-detail.md` の `AT-53` である** —— 表 T-023 の `MK-13` が名指すのはそちらであり、本行はその値をパネルに出す項目のほうである | 無い（`GRS JSON` のみ） |
| PR-19 | `color` | 色 | `TaskGroup` | 行の帯の色。`null` ＝ テーマから解く | 無い（`GRS JSON` のみ） |
| PR-20 | `height` | 数値 | `TaskGroup` | 倍率 1 のときの論理の高さ。`null` ＝ 自動 | 無い（`GRS JSON` のみ） |
