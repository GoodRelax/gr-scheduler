# CR-776 —— 文書の命令が運ぶ値のうち、列を 1 対 1 で書く 19 の値を、その列の名にそろえる

> 状態: ⭐ **当てた** —— 2026-10-16、アルファの第 2 レーンの席（`6c11e22a` の上）。仕様の段（原稿 `_source/document-commands.json` と `npm run gen`、変更履歴 4.88）、コード（`src` の手書きの呼び手）、試験（別の体が名を追った）を 1 つの巡で当てた。
> ID の帯: 番号 `CR-776` を調整役から受けた。新しい行の ID は使わない。
> 当てる裁定: `JDG-2361`（「B 列の名にそろえる (Recommended)」 —— `CR-766` の 11 節の Q1 への答え）。閉じるもの: なし（台帳の行は無い）。
> 覆すもの: なし。`CR-766` は択 A（今の名のまま列を指す）で当て済みで、本書はその上に名だけを変える（`CR-766` には追補しない —— 検査 62）。
> 測った木: `6c11e22a`（統合の枝の先端。`GT-2` を通って push 済み）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 裁定の逐語と土台

`JDG-2361` は、命令が運ぶ値のうち文書の列（表 T-058 の `AT-`）か見せ方の群の値（`S-`）を 1 対 1 で書く値を、その列の名と同じ名にすると決めた。AI は `readDocument` で読む名と `applyCommands` で書く名が同じになる。裁定の行が 19 の値を名指しする（2 節の表はその写しではなく、原稿で 1 つずつ確かめた結果である）。

### 0.2 裁定の鎖（`rulings.md` を「列の名」「命令が運ぶ値」「`label`」「`minHeight`」「`HighlightRange`」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-2162` | 表 T-108 の運ぶ値を原稿 `_source/document-commands.json` で持ち、型を生成する | 名を変えるのは原稿の 19 か所だけで、型・表・MCP の入力の形は生成が追う |
| `JDG-2241`・`JDG-2246` | 保存される名と連携する者が見る名を英語の慣習にそろえる（`CR-769`） | 同じ向き。`CR-769` が列の側を直し、本書が命令の側を列へ寄せる |
| `JDG-2361` | 本件 | 当てる |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-004`（`CH-1`。成果物が機械の読める構造化データである） —— 読む構造（`readDocument` の列の名）と書く構造（`applyCommands` の値の名）が同じ名を持つ。機械は読んだ鍵をそのまま書き込みに使え、対応の表を持たなくてよい。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない） —— 名は原稿の 1 か所だけを変え、表 T-108・命令の型・MCP の入力の形・形の確かめ（`commandShapeFaults`、`DFC-2856`）は `npm run gen` が刷り直す。
- `R2.22`（呼び手の名） —— 手書きの呼び手は tsc が全数を挙げた（`src` 83 か所）。型に捕まらない所は 5 節の grep で 0 件を確かめた。

### ③ 利用者に問わずに決めたこと（覆してよい）

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 注記の置き場（`AnnotationAnchor`）の `date`（`AT-113` `CommentBox.anchorDate`）は変えない | 裁定の行が挙げた 19 に入っていない。置き場は `anchor` という組の中の値なので、`anchor.date` が `anchorDate` と読める | 列の名と 1 字違う値が 1 つ残る。変えるなら新しい変更要求で |
| X-b | 呼び手のコードのローカル変数（`days`・`hue`・`scale` など）は変えない | 運ぶ値の名ではなく、変える理由が無い | — |

---

## 1. 範囲

| 観点 | 本書の前 | 本書の後 |
|---|---|---|
| 命令が運ぶ値の名 | 列と違う名が 19（`label`・`hue` など） | 列の名と同じ（2 節） |
| 列と 1 対 1 でない値 | `dx`・`dy`・`workingDayTypes`・`targetTaskGroupId` | 変えない（裁定の行の ⚠️） |
| 保存する `GRS JSON` の鍵 | — | 変えない（列の名はもとから同じ） |

## 2. 名前の対応（原稿 `_source/document-commands.json` の 19 か所）

| 行 | 命令 | 旧 | 新 | 書く列 |
|---|---|---|---|---|
| `CM-3` | `setStatusDate` | `date` | `statusDate` | `AT-13` |
| `CM-5` | `setThemeHue` | `hue` | `themeHue` | `AT-19` |
| `CM-16` | `setTaskFadeInDays` | `days` | `fadeInDays` | `AT-40` |
| `CM-17` | `setTaskFadeOutDays` | `days` | `fadeOutDays` | `AT-41` |
| `CM-18` | `setTaskParentTask` | `parentUid` | `parentTaskUid` | `AT-25` |
| `CM-21` | `setTaskVisualMilestoneGlyph` | `glyph` | `milestoneGlyph` | `AT-101` |
| `CM-26` | `createTaskGroup` | `label` | `name` | `AT-53` |
| `CM-29` | `setTaskGroupName` | `label` | `name` | `AT-53` |
| `CM-32` | `setTaskGroupMinHeightPx` | `minHeight` | `minHeightPx` | `AT-59` |
| `CM-56` | `setStackDirection` | `direction` | `stackDirection` | `S-58` |
| `CM-62` | `setFontScale` | `scale` | `fontScale` | `S-70` |
| `CM-64` | `setThemeMonochrome` | `monochrome` | `isThemeMonochrome` | `S-74` |
| `CM-74` | `setDisplayScale` | `scale` | `displayScale` | `S-234` |
| `CM-87` | `setParentProgressToleranceDays` | `workingDays` | `parentProgressToleranceDays` | `AT-156` |
| `CM-94` | `setScheduleDataTimeZone` | `timeZone` | `scheduleDataTimeZone` | `AT-157` |
| `CM-95` | `setViewTimeZone` | `timeZone` | `viewTimeZone` | `S-574` |
| `CM-96` | `setDisplayTimeZones` | `timeZones` | `displayTimeZones` | `S-575` |
| 形 `HighlightRange` | 強調枠の範囲 | `startDate` | `start` | `AT-117` |
| 形 `HighlightRange` | 強調枠の範囲 | `endDate` | `finish` | `AT-118` |

## 3. 数（`6c11e22a` → 本書、測り方は 7 節）

| 何か | 予測 | 実測 |
|---|---|---|
| 原稿で変わる値の名 | 19 | 19（`document-commands.json` の差 19 行） |
| 変わる表 | 1（表 T-108） | 1（`_assets/tbl-document-commands.md` の差 19 行） |
| 増える・消える行 ID | 0 | 0 |
| 変わる図 | 0 | 0 |
| 仕様の本文で旧い名を命令の値として言う所 | 0 | 0（7 節の grep） |
| 刷り直す `src` の生成域 | 6（5 つの命令の単位 ＋ `grs-json-schema.ts` の形の表）と `mcp-tool-descriptions.json` | 同じ |

## 4. ⛔ 変えない語

`AnnotationAnchor.date`（X-a）・`dx`・`dy`・`workingDayTypes`・`targetTaskGroupId`・`ProjectProfileFields.startDate`（もとから列の名）・命令の種類の名（`kind`）・設定の鍵・状態機械の運ぶ値。

## 5. 継ぎ目（コード）

- 型と表と MCP の入力の形と形の確かめは `npm run gen` が刷る（`tools/generate_document_commands.py`・`tools/generate_mcp_tool_descriptions.py`）。
- 手書きの呼び手は tsc が挙げた所を直した: `src/adapter/input-command-translator/` の 8 ファイル、`src/use-case/edit-document/` の 8 ファイル、`src/entity/document-model/schedule/delay-fixes.ts`（`DelayFixCommand` の `setStatusDate` は表 T-108 の形を持つ —— 表 T-373）。
- 試験は、名を追うだけの書き換えを別の体が当てた（何を確かめるかは変えていない）。

## 6. 台帳

- `JDG-2361` を「適用済」にする（着地は表 T-108 の 19 の値）。

## 7. 測り方の再現

```
git diff --stat 6c11e22a -- docs/spec/_source/document-commands.json docs/spec/_assets/tbl-document-commands.md
grep -rnoE '`(label|minHeight|hue|glyph|monochrome|direction|scale|days|workingDays|timeZone|timeZones|parentUid|startDate|endDate|date)`' docs/spec   # 命令の値として言う所を目で見て 0
node ../../../node_modules/typescript/bin/tsc --noEmit -p .
```
