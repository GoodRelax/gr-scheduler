# CR-579 の割り方の計画（`input-command-translator.ts`）—— 2026-10-24、木 `d0ae3a9c8`（枝 `w4-first-half`）

> 書いた者: CR-579 の計画の体（読むだけ。書いたのは本ファイルだけ）。
> 数はどれも本日の木で測った。測り方は各節の「測り方」と末尾の 9 節。台本はスクラッチの置き場にある
> （`ranges579.mjs`・`readers579.mjs`・`cochange579.mjs`。木には無い）。
> 行の見積もりは「動かす宣言の範囲（直前のコメントと空行を含む）の和」である。当てる体は各波のあとで `wc -l` と生成の区画の行で測り直すこと。

---

## 0. 先に読むこと —— CR の本文と裁定のずれ（⛔ 当てる体は CR の 10 節ではなく本節に従う）

| 項 | CR-579 の本文（2026-09-26） | `docs/development-records/rulings.md` の行（正） | 本計画の扱い |
| --- | --- | --- | --- |
| `JDG-690` | 10 節は「A 写しを返す (Recommended)」と書く | 「**座標と錨を兄弟へ (推奨)**」。⭐「`CR-579` は写しを持ち主へ返し、さらに座標とスクロールの錨・日の番号（`CR-579` の 4.3 節の R と D）を 1 つの兄弟のファイルへ出して、入口を手書き 1,000 行の下へ入れる（`JDG-695`）。入口の台帳・押した所の振り分け・答えの語彙は入口に残す。⭐ `CR-579` の 4.3 節の『割らない理由』（`JDG-54` を根拠とする）はこの答えで覆る」。CR の 10 節の「A」は「答えとして扱わない」と同行が書く | rulings.md の向きに従う。R・D の兄弟を作る（W4） |
| `JDG-691` | 10 節は「A 今はしない」と書く | 調整役が B を選び、`CR-589` が当てた（適用済）。`VISIBLE_ELEMENT_BY_ENTRY`・`GUIDE_CURSOR_MODE_BY_ENTRY` は既に生成の区画にある（`input-command-translator.ts:1546-1564`） | 済み。触らない（W8 で区画の置き場だけ動く） |
| `JDG-695` | —— | 手書き 1,000 行を超える `src` のファイルは割る（MUST） | 入口を 1,000 の下へ（見積もり ≈890）。⚠️ 同じフォルダの `item-grab.ts` も 1,000 超（1.1 節、9 節 Q3） |

⭐ 本計画は `JDG-690` に逆らう選択を含まない。ただし `JDG-690` が名指した兄弟は 1 つ（R・D、当時の見積もり「手書きおよそ 960 行」）で、今日の木ではそれだけでは ≈1,155 行に留まる（2.4 節）。1,000 を切るために、`JDG-690` が「入口に残す」と言った 3 つ（台帳 E・振り分け P・語彙 V）には触れずに、要求ごとの兄弟を 4 つ足す —— これを 9 節の問い Q1 に置いた。

---

## 1. 測った事実

### 1.1 大きさ

| 測ったもの | 値 | 測り方 |
| --- | --- | --- |
| 入口の全行 | 1,565 | `wc -l` |
| 生成の区画 | 74 行（`:1492-1565`） | `<generated -- do not edit by hand>` から `</generated>` まで |
| 入口の手書き | **1,491** | 1,565 − 74 |
| 兄弟の手書き | `item-grab.ts` **1,117**（区画なし）、`field-commit.ts` 783、`zoom-and-fit.ts` 705、`screen-state-input.ts` 472、`task-group-grab.ts` 331、`task-group-tree-entrances.ts` 280、`armed-placement.ts` 260、`selection-input.ts` 239、`shortcut-keys.ts` 178、`frame-drags.ts` 154、`wheel-input.ts` 130、`display-scale-steps.ts` 126、`input-source.ts` 54、`dual-cursor-input.ts` 47 | 同じ（どの兄弟も区画 0） |
| `src` で手書き 1,000 超のファイル | **18 本**（`frame-loop.ts` 4,409・`properties-panel.ts` 2,284・`delay-diagnostics-report.ts` 1,630・`dom-screen-surface.ts` 1,549・`properties-panel-drawing.ts` 1,521・入口 1,491・`delay-fixes.ts` 1,425・`mspdi-codec.ts` 1,419・`delay-diagnostics.ts` 1,401・`search-panel-drawing.ts` 1,352・`document-file-flow.ts` 1,320・`item-hit-area.ts` 1,275・`grs-json-schema.ts` 1,271・`agent-api-members.ts` 1,123・**`item-grab.ts` 1,117**・`schedule-task-figures.ts` 1,018・`screen-renderer.ts` 1,005・`mcp-relay-server.ts` 1,003） | `git ls-files 'src/*.ts'` の各ファイルの `wc -l` から生成の区画の行を引いた |

⚠️ `JDG-695` が 2026-09-26 に名指した 3 本のほかに、同じフォルダの `item-grab.ts` が 1,000 を超えている。本計画は `item-grab.ts` を 1 行も増やさない（4 節の規則 規則 3）。割るかは 9 節の Q3。

### 1.2 宣言の群（今日の名。範囲は直前のコメント・空行を含む。和 1,491 = 手書きの全行）

測り方: `node scripts/ranges579.mjs <entry>`（`rolldown/parseAst` で頂上の文を取り、前の文の終わりの次の行から自分の終わりまでを範囲とする。和を 1,491 と突き合わせた）。

| 群 | 中身（宣言名） | 行 |
| --- | --- | --- |
| I 取り込みと出し直し | `:1-137` | 137 |
| V 答えの語彙 | `PressRow`〜`TranslatedInput`（`:138-338`）、`UNASSIGNED`・`CONSUMED_ELSEWHERE`・`DOCUMENT_TITLE_PART`・`GrabTaskGroup`・`grabTaskGroupOf`・`acted`・`changed`・`changedAndCreated`・`nothingToDo`・`foldsOrNothing`・`changedInOrder`・`browserKept`（`:339-401`）、`PlacedPlanActual`・`ActualEndHold`（`:1394-1397`） | 268 |
| M 修飾キーとキーの名 | `isCtrlHeld` 6・`isCombo` 10・`isAssignedPointerCombo` 10・`isCtrlDragCombo` 5・`releasedSnapOf` 6・`isDateKeepingDrag` 6・`gestureModifiers` 6・`KEY` 30・`isSingleCharacterKey` 5・`FIELD_CTRL_KEYS` 5・`isTypedIntoSearchWord` 11・`isEnterInSearchPanel` 7 | 107 |
| D 日の番号 | `MS_PER_DAY` 3・`serialOfDay` 5・`dayFromSerial` 6・`dayShifted` 5・`dayAtX` 5・`pointerDaySerial` 8・`dayShift` 8・`compareDay` 5 | 45 |
| R 座標と錨 | `scrollingTaskGroupsOf` 5・`scrollAreaTopOf` 5・`taskGroupAtY` 8・`PlacedCommentAnchor` 5・`commentAnchorAt` 19・`snappedAnchorOf` 19・`freeAnchorAt` 10・`BAND_FRACTION_STEPS` 2・`ScrollAnchor` 7・`unitFraction` 9・`dayAnchorAt` 17・`taskGroupAnchorAt` 12・`panTo` 15・`scrolledAnchor` 9・`isScrollPositionInForce` 16・`isOnTaskGroupArea` 5・`drawnTaskGroupsOf` 7・`drawnTaskGroupsCrossed` 8 | 178 |
| P 押しの振り分け（表 T-023a） | `COPY_DRAG_GRABS`・`isCopyDragPress`・`pressedRowOf` 33、`commandFromInput` 14、`commandFromPointer`〜`pointerAssignment` 89、`followingTravel` 10、`panFollow` 15 | 161 |
| P' 押すか引くか（表 T-270） | `hasDraggedPastThreshold` 6・`isParentPickingCtrlClick` 12 | 18 |
| E 入口の台帳（表 T-109） | `ENTRY` 68、`VisibleElement`・`visibleElementOfEntry`・`PressedGuideCursor`・`guideCursorModeOfEntry`・`FontSizeStep`・`FONT_SIZE_STEPS`・`nextFontSizeStep` 26、`Armed`・`ARMED_BY_ENTRY`・`armedByEntry` 36、`VIEW_SCALE_ENTRIES` 10、`commandFromEntry` 142、`commandFromVisibleElement` 8、`resourceListChoiceCommand` 13、`resourceListChoiceOfEntry` 13 | 316 |
| L 着地の印（`EL-17`・`EL-18`） | `MODIFIER_ONLY_KEYS` 3・`isLandingMarkKeptBy` 20・`isSwallowedSecondPress` 7 | 30 |
| X `Esc` の文脈（`IN-4`） | `escapeContextOf` | 26 |
| A 揃え（`FR-034`） | `chosenDrawnTaskCount` 15・`alignWrites` 31 | 46 |
| Z 縦軸の上限（`FR-016`） | `TOP_TASK_GROUP_DEPTH` 2・`zoomYCeiling` 9・`taskGroupsAtZoomY` 16 | 27 |
| H 補助と写し | `rememberedActualIn` 6、`TASK_SHAPE_KINDS` 9・`taskShapeKindOf` 7・`TASK_MILESTONE_GLYPHS` 18・`milestoneGlyphOf` 7、`nextIssuedUid` 6、`placementAt` 24、`taskGroupGrabDepthOf` 13・`taskGroupDepthOfGroup` 8、`boxById` 6、`taskGroupRankById` 27 | 131 |
| 末尾の空行 | `:1491` | 1 |

関数の大きさ: `commandFromEntry` 139 行・分岐 59、`pointerAssignment` 39・21（どちらも `function-size-baseline.txt:74-75` の `HELD`）。閾値は 50 行・15 分岐（`check-function-size.py:150-151`）。

### 1.3 読み手（`src` と `tests` の `import { … } from '…/input-command-translator'` をすべて読んだ）

測り方: `node scripts/readers579.mjs <worktree>`（`git ls-files src tests` の全ファイルの名前つき取り込みを読む。`import *` と動的な取り込みは 0 件 —— `git grep -n -E "import \* as .* input-command-translator'|import\(.*input-command-translator"`）。

| 名 | フォルダの外の読み手 | 兄弟の読み手 |
| --- | --- | --- |
| ⭐ `single-html-shell/*` が読む 22 名（CR-578 の継ぎ目） | `HumanInput`・`InputAction`・`InputContext`・`NOT_STORED_ZOOM_STEP`・`PointerInput`・`PointerPress`・`SpentEntranceSituation`・`commandFromFieldCommit`・`commandFromInput`・`diagnosisRowAskedOf`・`escapeContextOf`・`fitWrites`・`isCombo`・`isLandingMarkKeptBy`・`isTypedIntoSearchWord`・`markerOperatedTaskUidOf`・`pressedRowOf`・`screenEventFromFieldCommit`・`screenEventFromInput`・`selectionFromInput`・`taskGroupBandCeilingOf`・`zoomEntranceEndsOf`（`frame-loop.ts`・`field-entry.ts`・`held-press-preview.ts`・`pointer-shape.ts`・`interaction-record.ts`・`parent-task-hold.ts`・`view-place.ts`・`task-group-band-ceiling-cache.ts`） | —— |
| 本計画が動かすのはこのうち `isCombo`・`isTypedIntoSearchWord` の 2 つだけ | 入口から同じ署名で出し直す（W5） | |
| 試験だけが入口から読み、本計画が動かす名 | `commentAnchorAt`（`cr-777`）・`panTo`（`dfc-2410`）・`KEY`（`cr-607`・`cr-631` ×2） | 入口から出し直す |
| 試験が読み、入口に残る名 | `hasDraggedPastThreshold`（`w3-t5-t-270`）・`isParentPickingCtrlClick`・`armedByEntry`（`cr-631`）・`Armed`・`TaskGroupGrabLanding`・`NOT_STORED_TASK_GROUP_GRAB_SIZES` ほか型 | —— |
| R・D の名で兄弟が読むもの | —— | `commentAnchorAt`（armed-placement・item-grab）・`dayAnchorAt`（display-scale-steps・item-grab・zoom-and-fit）・`dayAtX`（armed-placement・item-grab）・`dayShift`・`dayShifted`・`drawnTaskGroupsOf`・`drawnTaskGroupsCrossed`・`pointerDaySerial`（item-grab）・`isOnTaskGroupArea`（screen-state-input・selection-input）・`isScrollPositionInForce`（item-grab・wheel-input・zoom-and-fit）・`panTo`（frame-drags）・`scrollAreaTopOf`（wheel-input）・`scrolledAnchor`（display-scale-steps・item-grab・wheel-input・zoom-and-fit）・`scrollingTaskGroupsOf`（display-scale-steps・wheel-input・zoom-and-fit）・`taskGroupAtY`（armed-placement）・`ScrollAnchor`（wheel-input・zoom-and-fit） |
| M の名で兄弟が読むもの | `isCombo`（frame-loop）・`isTypedIntoSearchWord`（frame-loop） | `isCombo`（5 兄弟）・`KEY`（3 兄弟）・`isSingleCharacterKey`（screen-state-input・shortcut-keys）・`isTypedIntoSearchWord`（screen-state-input）・`releasedSnapOf`（armed-placement・item-grab）・`isDateKeepingDrag`（item-grab・selection-input） |
| 1 つの兄弟だけが読むもの | —— | `rememberedActualIn` → screen-state-input、`taskGroupDepthOfGroup` → task-group-tree-entrances、`taskGroupGrabDepthOf` → task-group-grab、`zoomYCeiling`・`taskGroupsAtZoomY` → zoom-and-fit、`taskShapeKindOf` → armed-placement、`ActualEndHold`・`boxById` → item-grab |
| 2 つの兄弟が読むもの | —— | `placementAt`（field-commit・item-grab）、`milestoneGlyphOf`・`nextIssuedUid`（armed-placement・field-commit）、`taskGroupRankById`・`compareDay`（armed-placement・item-grab） |

### 1.4 共変（規則 04 の 6 の数え方: 両方を変えたコミット ／ 小さい側のコミット。閾値 0.5 超・小さい側 5 件以上）

測り方: `node scripts/cochange579.mjs <worktree> 80`。入口のコードを変えた直近 80 件（`--no-merges`、コメントだけの塊を除く）の `git show -U0` の塊を、その版の頂上の宣言の範囲へ写して群に数えた。名は改名を跨いで正規化（`TaskGroup`→`Row`、`FontSize`→`FontScale`）。⚠️ 近似: 分割前の名（いまは兄弟にある宣言）に落ちた塊は「?」として捨てた（24 件のコミットに出る）。「掃き」= 入口の群を 5 つ以上一度に変えたコミット（改名・分割の 6 件: `0f20b5509` `dc0556156` `2d59c7c81` `239dec0d0` `39c15ff4a` `223a5a5b9`）を除いた版を判定に使う（`SWEEP=5`）。

| 組 | 掃きを除く（判定） | 素の 80 件 | 読み |
| --- | --- | --- | --- |
| V 〜 X（`escapeContextOf`） | 6/7 = 0.86 | 9/10 = 0.90 | **R** —— X は V と共に入口に残す |
| V 〜 P | 6/10 = 0.60 | 10/14 = 0.71 | **R**（`JDG-690` も残すと決めた） |
| V 〜 E | 15/27 = 0.56 | 21/32 = 0.66 | **R**（同） |
| P 〜 E | 4/10 = 0.40 | 8/14 = 0.57 | s |
| V 〜 M ・ M 〜 P | 3/7 = 0.43 ・ 3/7 = 0.43 | 0.50 ・ 0.50 | s —— M の継ぎ目は立つ |
| V 〜 R ・ R 〜 P | 1/8 = 0.13 ・ 1/8 = 0.13 | 0.55 ・ 0.36 | s —— **最も低い**。R を切る（`JDG-681`: 低い所で切る） |
| D・A・L・Z と、どの相手 | 小さい側が 2〜3 件 | 下限未満 | ne |
| E 〜 兄弟（参考、素） | `screen-state-input` 16/20・`shortcut-keys` 10/12・`task-group-tree-entrances` 4/5・`field-commit` 9/12 | | 台帳は兄弟と共に変わる。⇒ 入口ごとの答えを兄弟へ出す前例（`task-group-tree-entrances.ts`、`UT-10`）と同じ形で E の腕を兄弟へ出しても、開くファイルの数は今の兄弟と同じ |

### 1.5 字で読むもの（コードが動くと割れる）

| 読み手 | file:line | 本計画での扱い |
| --- | --- | --- |
| 試験 `tests/system/user-reported-fixes.test.ts` | `:1472-1474`（`TRANSLATOR_SOURCE`）・`:1522-1531`（入口に `layoutFromSchedule` が無いこと —— `FR-016` の MUST NOT） | 否定の試験なので赤にはならない。W3・W4 の後は守る範囲が入口だけになり、`zoom-and-fit.ts`・`chart-coordinates.ts` を見ない ⇒ 仕様だけを読む試験の体が「フォルダ全体」へ広げるかを決める（移す体は試験を書き換えない） |
| 検査 50 `check-press-row-ids.py` | `:52-54`（入口の `PressRow` の字を表 T-023a と比べる） | `PressRow` は入口に残す。W14（任意）で別名にするなら、読む先を `gesture-values.ts` へ移す |
| 検査 21 `check-provenance.py` | `:98-99`・`:105-106`（入口 × `settings.json`・`tbl-glossary.md`） | W8 で新しい兄弟の行、W9 で入口の原稿（`01-04-requirements.md` の表 T-012・`state-machines.json`）を足す |
| 生成器 `tools/generate_entity_types.py` | `:3572-3584`（入口の TARGETS）・`:3852-3859`（`PUBLISHED_READ_BY_SRC`） | W8・W9・W13 で書き換える |
| 検査 69 `literal-restatement-baseline.txt` | `:41` `ARMED_BY_ENTRY`・`:44` `FONT_SIZE_STEPS` | W9 で記録を消す（縮むだけ） |
| 検査 70 `twin-comments-baseline.txt` | `:52-54`・`:178-180`（`taskGroupRankById` の写し） | W1 で 2 記録を消す（縮むだけ） |
| `src/entity/layout-engine/schedule-layout/task-group-scroll.ts:32` の TRAP（「taskGroupAnchorAt in input-command-translator.ts」） | 検査 70 の記録 `:128-129` が既に「stale」と書く | ⛔ 触らない（フォルダの外。直すと記録の鍵が変わる。`DFC-1062` の畳みが片付ける） |

### 1.6 評価の順（TDZ）

- 兄弟の頂上の `const` の初期化式に入口の名が現れる所: **0 件**（`grep -n -E "^(export )?const .*\b(ENTRY|KEY|UNASSIGNED|CONSUMED_ELSEWHERE|NOT_STORED_[A-Z_]+)\b"` を入口以外の兄弟に掛けた）。
- 入口の頂上の初期化式が読む名: `FIELD_CTRL_KEYS`（`KEY`）・`MODIFIER_ONLY_KEYS`（`KEY`）・`VIEW_SCALE_ENTRIES`（`ENTRY`）—— どれも今は同じファイル。W5 の後、`MODIFIER_ONLY_KEYS` は `modifier-keys.ts` の `KEY` を初期化で読む ⇒ **`modifier-keys.ts` は入口から型しか取り込まない葉にする**（4 節 規則 4）。葉は輪の外なので、入口より必ず先に評価され終わる。
- 今の 13 兄弟はどれも入口から値（`CONSUMED_ELSEWHERE`・`changed` ほか）を取り込み、入口もそれらを取り込む（輪）。関数の中でだけ読むので動く。⚠️ 計画の依頼文の「兄弟は入口が取り込むなら入口を取り込まない（型を除く）」は、今のフォルダの形そのものに反する —— 新しい兄弟のうち `chart-coordinates.ts`・`task-alignment.ts`・`resource-list-entrances.ts`・`display-setting-entrances.ts` は同じ輪に入る（値は関数の中でだけ読み、頂上では読まない）。輪を断つには V を下へ出すことになり `JDG-690` に反する ⇒ 本計画は今の形に従う。前に立つ者が承知するか判じること。

---

## 2. ユニットの表

### 2.1 入口と新しい兄弟

| ファイル | 仮の行 ID | 責務文（R2.2a の畳み） | 中身 | 手書きの見積もり | 形 |
| --- | --- | --- | --- | --- | --- |
| `input-command-translator.ts`（残る） | `UF-30` | 「`CP-18` の残り —— 入力の種類と押した所から、答える兄弟を選ぶ（表 T-023a・表 T-109）。<br>兄弟とシェルが共有する語彙 —— 入力の文脈と押し・出力の型・`Esc` の段の材料（`IN-4`）—— を持ち、兄弟が共有する補助（日程表の座標の読み・修飾キーの読み）を出し直す」<br>畳み: 主は「答える兄弟を選ぶ」。語彙と出し直しは継ぎ目の宣言で (c)。`pressedRowOf`・`isLandingMarkKeptBy`・`escapeContextOf` は振り分けが読んだものをシェルへ返す公開の問い（`PI-18`）で (c)。⚠️ 3 つめの文「縦軸の上限の字と帯を…」は `UF-92` へ移る | V・P・P'・E（`ENTRY`・振り分け・`armedByEntry`・`guideCursorModeOfEntry`・`VIEW_SCALE_ENTRIES`・`FIXED_ACTION_BY_ENTRY`）・L・X・`placementAt`・`taskShapeKindNamed`・`milestoneGlyphNamed`・`boxById` | **≈890**（1,491 から 2.4 節の差し引き。±30） | —— |
| `chart-coordinates.ts`（新） | `UF-p1` | 「日程表の上の点を、日（日の番号）とタスクグループに読み替え、スクロールの錨と注記の錨にする —— 錨の書き込みと、書き込みが既に効いているかの判定（`CM-66`）を含む」<br>畳み: 主は「点を日とタスクグループに読み替える」。2 つの錨は読みが文書に残る形の列挙で (b)（`CM-66` に欄が 1 つ増えても外から呼ぶ形は変わらない）。書き込みと判定は錨という値に掛かる (c)。日の番号の足し引き（`dayShifted`・`dayShift`）は「日」の読みの手順で (a) | `dayShifted`・`dayAtX`・`pointerDaySerial`・`dayShift`・R の 18 宣言（1.2） | ≈240（宣言 204 ＋ 見出し 5 ＋ 取り込み ≈30） | 移すだけ（F/M 不要。頂上の関数） |
| `modifier-keys.ts`（新） | `UF-p2` | 「キーの名と修飾キーの組を読み、修飾の割当（表 T-023 の `MK-10`・`MK-12`・`MK-16`）・押したときの修飾（`CY-11`）・`Alt` の吸着（`SG-4`）・検索の語の欄が取るキー（`IN-5a`・`SV-5`）を判ずる」<br>畳み: 主は「キーの名と修飾キーの組を読み判ずる」。行 ID の列挙は判じる規則の範囲で (b) | M の 12 宣言 | ≈120（107 ＋ 5 ＋ ≈8） | 移すだけ。⛔ 入口からは型だけ取り込む（葉） |
| `task-alignment.ts`（新） | `UF-p3` | 「選んだタスクの予定を、最後に選んだタスクの始まりか終わりに揃える書き込みを作る（`FR-034`・`SL-7b`）—— 描いているタスクグループの中で選んだタスクが 2 つ未満なら、揃えるものが無いと答える（`FR-029`）」<br>畳み: 「2 つ未満なら…」は (c) | `chosenDrawnTaskCount`・`alignWrites`、新しい `alignAnswer(context, byStart)`（`commandFromEntry` の揃えの腕の `if` と `TRAP` をそのまま運ぶ） | ≈70 | 移すだけ ＋ 腕を 1 関数へ |
| `resource-list-entrances.ts`（新） | `UF-p4` | 「担当リストの入口（`IC-63` 〜 `IC-65`・`IC-67`・`IC-68`）を、`FR-099` に従って担当の選びに変える —— 選びが変わらない押しには何もしないと答える（`FR-029`）」<br>畳み: 入口の列挙は (b)、「何もしない」は (c) | `resourceListChoiceCommand`・`resourceListChoiceOfEntry`、新しい `commandFromResourceListEntry(entry, resourceUid, context)`（5 つの札の 2 つの腕） | ≈45 | 移すだけ ＋ 腕を 1 関数へ（`commandFromRowEntry` の前例と同じ形） |
| `display-setting-entrances.ts`（新） | `UF-p5` | 「表示を切り替える入口（表 T-109 の `FR-049` の切り替えと `IC-99`・`IC-100`・`IC-101`）を、文書の表示の設定値の書き込みに変える —— 次の値は描いた入口でなく文書の値から決める」<br>畳み: 入口の列挙は (b)、「文書の値から決める」は (c)（`commandFromVisibleElement` の `TRAP`） | `VisibleElement`・`visibleElementOfEntry`・`commandFromVisibleElement`・`FontSizeStep`・`nextFontSizeStep`、新しい `commandFromDisplaySettingEntry(entry, context)`（`IC-99`〜`IC-101` の 3 つの腕）。生成の区画: `VISIBLE_ELEMENT_BY_ENTRY`（W8）・`FONT_SIZE_STEPS`（W9） | ≈58（区画を除く） | 移すだけ ＋ 腕を 1 関数へ |
| `src/entity/document-model/schedule/task-group-tree.ts`（新、`Schedule`） | `UF-p6` | 「タスクグループの親子の木の中の位置 —— 兄弟の順に前から歩いた順位（`IV-19`・`SV-8`）と、根からの深さ —— を答える。<br>親の無い群と環の群は木の外として数える」<br>畳み: 順位と深さは 1 つの木の位置の読みの列挙で (b)。読み手（不変条件・検索・並べ替え・翻訳係）の列挙はしない。2 文目は (c) | `taskGroupRankById`（3 つの写しを 1 つに）・`taskGroupTreeDepth`（`edit-task-group.ts` の `depthOf` と入口の `taskGroupGrabDepthOf` を 1 つに） | ≈48 | 移すだけ（名を 1 つ改める） |

命名の確かめ（`git ls-files 'src/*.ts'` の名を読んだ）:
- `chart-coordinates`: 近い名は `schedule-geometry.ts`（描いた物の位置）・`screen-regions.ts`・`time-axis.ts`。どれも「入力の点を読む」とは言わない。⚠️ `dayShifted` は座標ではなく日の番号の足し算だが、`JDG-690` が「日の番号」を同じ兄弟へ出すと決めた。名の候補は 9 節 Q2。
- `modifier-keys`: ⚠️ 同じフォルダの `shortcut-keys.ts`（`UF-90` 打鍵 → 操作）と語が近い。候補は Q2。
- `task-alignment`: `src` に `align` を含むファイルは 0。
- `resource-list-entrances`: `screen-renderer/resource-list.ts`（`UF-199`、描く側）と対になる。`task-group-tree-entrances.ts` と同じ型の名。
- `display-setting-entrances`: ⚠️ `display-scale-steps.ts`（表示の倍率）と頭の語が同じ。候補は Q2。
- `task-group-tree`（Schedule）: `adapter/…/task-group-tree-entrances.ts` と語が重なるが層もフォルダも違い、中身は木の位置そのもの。
- `Manager`・`Handler`・`Helper`・`Utils`・`-and-` を含む名: 0。

### 2.2 中身が増える既存の兄弟（どれも 1,000 以下）

| ファイル | 入るもの | 手書き（今 → 後の見積もり） |
| --- | --- | --- |
| `zoom-and-fit.ts`（`UF-92`） | Z の 3 宣言（W3）、新しい `timeZoomAnswer(context, isIn)`（H11、W3） | 705 → ≈740 |
| `screen-state-input.ts`（`UF-102`） | `rememberedActualIn`（W10） | 472 → ≈478 |
| `task-group-tree-entrances.ts`（`UF-96`） | `taskGroupDepthOfGroup`（W1） | 280 → ≈289 |
| `task-group-grab.ts`（`UF-97`） | 新しい `taskGroupChosen(press, taskGroupId)`（H13、W10） | 331 → ≈333（自分の写し 5 行が 1 行になり、関数 7 行が増える） |
| `shortcut-keys.ts` | `timeZoomAnswer` を読む（H11） | 178 → 177 |
| `item-grab.ts`（1,117） | ⛔ 何も入れない。W1・W2 の取り込みの入れ替え（入口の塊から Schedule の塊へ 1 名ずつ）で行は ±0 | 1,117 → ≤1,117 |
| `armed-placement.ts`・`field-commit.ts` | 取り込みの名が変わるだけ（`compareDays`・`milestoneGlyphNamed`・`taskShapeKindNamed`・`nextIssuedUid` の出どころ） | ±0 |

### 2.3 入口から消える名・残る名（公開エントリの約束）

- ⭐ フォルダの外（`single-html-shell/*` を含む）と試験が入口から読む名は、**すべて名と署名を保って入口から読める**。動くのは `isCombo`・`isTypedIntoSearchWord`・`KEY`・`commentAnchorAt`・`panTo` で、入口が `export { … } from` で出し直す。
- 兄弟が入口から読んでいる R・D・M の名（1.3 の表）も入口が出し直す（4 節 規則 1）。⇒ 兄弟の取り込みの文は、写しを畳む名（`compareDay` ほか）を除いて変わらない。
- 入口から消えて、どこからも出し直さない名（読み手が兄弟 1 つで、その兄弟が持ち主になるか、写しが畳まれる）: `serialOfDay`・`dayFromSerial`・`compareDay`・`taskGroupRankById`・`taskGroupGrabDepthOf`・`taskGroupDepthOfGroup`・`zoomYCeiling`・`taskGroupsAtZoomY`・`rememberedActualIn`・`nextIssuedUid`・`taskShapeKindOf` → `taskShapeKindNamed`・`milestoneGlyphOf` → `milestoneGlyphNamed`。どれもフォルダの外と試験から読まれていない（1.3 の台本）。

### 2.4 入口の手書きの行の見積もり（波ごと。「消す宣言の範囲の和 − 増える取り込み・出し直しの行」）

| 波の後 | 入口の手書き | 主な差 |
| --- | --- | --- |
| 今 | 1,491 | |
| W1 | ≈1,442 | −27 rank −13 grab depth −8 depthOfGroup |
| W2 | ≈1,400 | −14 serial ほか −5 compareDay −25 図形の一覧 ＋2 取り込み |
| W3 | ≈1,367 | −27 Z −1 H11 −5 取り込み |
| W4 | ≈1,155 | −204 R・D −14 取り込み ＋5 出し直し |
| W5 | ≈1,056 | −107 M ＋8 取り込み ＋1 出し直し |
| W6 | ≈1,002 | −46 A −5 腕 −4 取り込み ＋1 |
| W7 | ≈973 | −26 −4 腕 ＋1 |
| W8 | ≈939 | −26 −13 腕 ＋5 |
| W9 | ≈912 | −27 `ARMED_BY_ENTRY` が区画へ |
| W10 | ≈898 | −20 腕 ＋15 表 −4 H13 ＋1 −6 `rememberedActualIn` |
| W11 | ≈892 | −6 `nextIssuedUid` |
| W12〜W14（任意） | ≈890 | |
| W15（任意） | ≈866 | −24 `placementAt` |

⇒ 1,000 を確かに切るのは W7〜W8（W6 の ≈1,002 は誤差の内）。床の見積もり: `JDG-690` が残すと決めた V・P・E と取り込みだけで ≈850（V 268 ＋ P 161 ＋ E の残り ≈206 ＋ 取り込みと出し直し ≈120 ＋ 見出し 8 ＋ X 26 ＋ L 30 は残すので ≈820〜850）。⇒ ≈850 を目指すと、2 つの兄弟が読む小さな補助（`placementAt` ほか）まで出すことになる（W15）。

---

## 3. 偶然の写し（`DFC-1072` の群）

測り方: 行の群ごとに今日の木で名を `git grep` し、本体を突き合わせた（`diff` で本体の比較）。

| 群 | 今もあるか（今日の file:line） | 畳んだ後の持ち主 | 表 T-064 の行 | 波 | 値は変わるか |
| --- | --- | --- | --- | --- | --- |
| G01 `MS_PER_DAY`・`serialOfDay`・`dayFromSerial` | ある（入口 `:488-499`）。`calendar-day.ts:176` `serial`・`:228` `dayFromSerial` は `schedule.ts:42-61` で既に公開 | `Schedule`（既にある公開名を読む） | 要らない（`serial`・`dayFromSerial` は `published-entries.json` に既にある） | W2 | ⚠️ **年 0〜99 だけ変わる**: `CR-831` が `serial` を「年を書いたとおりに読む」へ直した（`utcMillisecondsOf`）。翻訳係の `serialOfDay` は `Date.UTC` のまま 1900 年代に読む。100 年以上では `Math.floor` も含めて同じ（`Date.UTC` は整数の日で 86400000 の倍数を返す）。0〜99 年は `CR-831` の後どの入口からも文書に入らない（同書 0.1・X-b）⇒ 照合器の設計した違い。Q4 |
| G02 `compareDay`（`:1435`）・`dayShift`（`:1427`） | ある。呼び所 7（`armed-placement.ts:215`・`:216`、`item-grab.ts:209`・`:434`・`:702`・`:963`・`:980`）、**どれも符号だけを読む**（`<= 0`・`< 0`・`=== 0`） | `compareDays`（`Schedule`、公開済み）。`dayShift` の差は `calendarDaysBetween(from, to)` | 要らない | W2 | 年 0〜99 だけ（G01 と同じ理由）。⭐ これは `DFC-1061`（`実装待ち`、対応 ①「`compareDay` を消し、公開済みの `compareDays` を使う。`dayShift` の差は `calendarDaysBetween`」、「`CR-579` で当てる」）を当てることになる ⇒ `DFC-1061` を閉じる |
| G03 `dayAnchorAt`（`:627`、`unitFraction`）＝ `fit-zoom.ts:150` `fittedLeftEdge` | ある | （畳むなら `time-axis.ts` の新しい公開名） | 要る | ⛔ 見送り | 変わる（`unitFraction` は負の端で `value − floor`、`fittedLeftEdge` は `0 < into < 1` 以外を 0）。Entity の `fit-zoom.ts` を書き換えることになる ⇒ 純粋な移動で決められない。台帳に残す |
| G04 `taskGroupRankById` | ある、**3 つ**: 入口 `:1402`、`schedule-invariants.ts:152`（`export` 済み、`schedule-search.ts:19` が読む）、`use-case/edit-document/task-group-order.ts:18` `taskGroupTreeRankById`（局所の名だけが違う、`diff` で確かめた） | `Schedule` の新しい `task-group-tree.ts` | 要る（`PI-1` に `taskGroupRankById`） | W1 | 変わらない |
| G05・G06 `taskGroupGrabDepthOf`（`:1308`）＝ `edit-task-group.ts:105` `depthOf`（本体が 1 字も違わない） | ある | `task-group-tree.ts` の `taskGroupTreeDepth` | 要る（`PI-1`） | W1 | 変わらない。⚠️ 上限つきの写し（`drawn-task-groups.ts:61`・`delay-diagnostics.ts:352`・`delay-fixes.ts:1217`）は形も値も違う ⇒ 畳まない |
| G09 → `DFC-1062` | 入口の側は委譲だけ（`taskGroupAnchorAt` → `taskGroupAnchorIn`）。写しは `zoom-and-fit.ts` と `task-group-scroll.ts` | —— | —— | ⛔ 見送り | 1 以上の `scrollGroupOffset` で答えが割れ、取り込んだファイルで届く ⇒ 自分の行（`DFC-1062`）が持つ |
| G10(c) `zoomWithinBounds` ＝ `clampedZoom` | `zoom-and-fit.ts:471`・`fit-zoom.ts:52`。`edit-document-settings.ts:151` の写しは無くなった | —— | —— | ⛔ 見送り | 有限でない境で変わる（`DFC-971`） |
| G11 `hasDraggedPastThreshold` ＝ `task-group-grab.ts` の `S-208` | **無くなった**（`task-group-grab.ts:271` は WHY のコメントだけ） | —— | —— | —— | —— |
| G22(a) `milestoneGlyphOf` は名を読む別の仕事 | ある（`:758`） | 入口に残し、`milestoneGlyphNamed` へ改名。対の `taskShapeKindOf` も同じ形の `taskShapeKindNamed` へ（POLA） | 要らない（`PI-18` に無い） | W2 | 変わらない |
| G37(a) `nextIssuedUid` → `DFC-1066` ② | ある。**写しは 6 つ**: 入口 `:766`、`edit-resource.ts:52`、`task-create.ts:40`、`edit-calendar.ts:232`、`delay-fixes.ts:366`・`:1065`（`git grep "uidHighWaterMark + 1"`） | `Schedule`（`schedule.ts`、`taskByUid` の隣）。⚠️ `DFC-1066` ② は `edit-document.ts` を持ち主に挙げるが、Entity の `delay-fixes.ts` は UseCase を読めない（表 T-061）⇒ `Schedule` | 要る（`PI-1`） | W11 | 変わらない |
| G43 `shortcut-keys.ts:37-41` ＝ `wheel-input.ts:66-70` | 形が変わり写しと言えない（`shortcut-keys.ts:36-41`・`wheel-input.ts:60-75` を読んだ） | —— | —— | —— | —— |
| G44・G48・E18・E39 → `DFC-1071`（`CR-578` の側） | 翻訳係の側の材料（`escapeContextOf`・`ENTRY`・`KEY`・`isOnTheChart`）は入口に残る（`KEY` は出し直し） | `CR-578` が入口へ公開口を足す（例 `pressedPartOnRelease`） | `CR-578` が足す | —— | ⚠️ 併合: `CR-578` が入口の `export` の行を足すと、本計画の W4・W5 の出し直しの行と同じ所で当たる |
| G65 `TASK_SHAPE_KINDS`・`TASK_MILESTONE_GLYPHS` | ある（`:724`・`:739`）。生成された `COLUMN_SHAPES.TaskVisual.shapeKind.choices`・`.milestoneGlyph.choices`（`schedule-entities.ts:471-472`、`schedule.ts:11` が公開）と集合が同じ（5 個・15 個） | `COLUMN_SHAPES` を読む | 要らない（公開済み） | W2 | 変わらない（`hasOwnProperty` と `includes` は、`toString` などの字でも共に偽） |
| G66 `ARMED_BY_ENTRY` | ある（`:867-891`、23 行） | 生成（`generate_entity_types.py` が `generate_icon_roster.py` の `fill_arms_shape` の結果と `state-machines.json` の `AR-n` → 構えの状態の結びから刷る）。`CR-768` X-d・`DFC-2645` が `CR-579` に割り当てた | 要らない | W9 | 変わらない（鍵の並びだけが表 T-109 の並びになる。引くだけで外へ出ない） |
| E32・N1 `chosenDrawnTaskCount` ＝ `command-palette.ts:80` `drawnTaskUids` | ある（同じ輪） | `Schedule` の新しい `taskUidsInTaskGroups(schedule, taskGroupIds)` | 要る（`PI-1`） | W12（任意） | 変わらない |
| E33 `rosterChoiceOfEntry` の写し | **無くなった**（`open-modals.ts` に無く、`deletion-confirmations.ts:88` は別の仕事） | —— | —— | —— | —— |
| E38 `VISIBLE_ELEMENT_BY_ENTRY`・`GUIDE_CURSOR_MODE_BY_ENTRY` | **済み**（`CR-589`、生成の区画） | —— | —— | —— | —— |
| E42 `FONT_SCALE_STEPS`（今は `FONT_SIZE_STEPS`、`CR-792`） | ある（`:856`） | 生成（表 T-215 の `S-121`〜`S-123` の並び）。`DISPLAY_SCALE_STEPS`・`DAY_TYPES` は別のファイルで範囲外 | 要らない | W9 | 変わらない |
| H11 時間軸のズームの答え（入口 `:1185-1189` ＝ `shortcut-keys.ts:91-94`） | ある（`wheel-input.ts:100` はポインタの位置を渡すので別） | `zoom-and-fit.ts` の `timeZoomAnswer(context, isIn)`（`verticalZoomAnswer` の隣） | 要らない | W3 | 変わらない |
| H13 `chooseTaskGroup` の答え（入口 `:1152-1156` ＝ `task-group-grab.ts:315-319`） | ある | `task-group-grab.ts` の `taskGroupChosen(press, taskGroupId)` | 要らない | W10 | 変わらない |
| H19 `PressRow` ＝ `gesture-values.ts:10` `GesturePressRow` | ある（同じ和集合） | `advance-screen-session.ts` が `GesturePressRow` を出し、入口は別名にする | 要る（`AdvanceScreenSession` の行） | W14（任意） | 変わらない。⚠️ 検査 50 が入口の字を読む（1.5）⇒ 読み先を移す道具の変更が要る |
| I08 → `DFC-1059` | 状態 `未検討` | —— | —— | ⛔ 見送り | 実物で測る前 |
| I09 `alignWrites` ＝ `bodyMoveWrites` | **写しでなくなった**（`bodyMoveWrites` は `planMoveWrite` を経る形に書き換わった、`item-grab.ts:473-501`） | —— | —— | —— | —— |

⇒ 畳む: G01・G02（`DFC-1061` ごと）・G04・G05/G06・G22(a)・G37(a)・G65・G66・E42・H11・H13（＋任意 E32/N1・H19）。見送る（値が変わる・自分の行が持つ）: G03・G09・G10(c)・I08。消えていた: G11・G43・E33・E38（済み）・I09。

---

## 4. 波に共通の規則（依頼文に逐語で写す）

- **規則 1 取り込みの向き**: 新しい兄弟へ移した名のうち、ほかの兄弟が読んでいるものは、入口が `export { … } from './<新しい兄弟>'` で出し直す。ほかの兄弟の取り込みの文は書き換えない（写しを畳む名を除く）。⇒ `item-grab.ts` は 1 行も増えない、`CR-578` の継ぎ目の名はどれも入口から読める。
- **規則 2 フォルダの外の取り込み**: 書き換えてよいのは `Schedule` の中（W1・W11・W12）、`EditDocument` の `edit-task-group.ts`・`task-group-naming.ts`・`task-group-order.ts`（W1）と `edit-resource.ts`・`task-create.ts`・`edit-calendar.ts`（W11）、`delay-fixes.ts`（W11）、`command-palette.ts`（W12）、`advance-screen-session.ts`（W14）だけ。`single-html-shell/*` には触らない。
- **規則 3** `item-grab.ts` の手書きの行を増やさない（各波の後に `wc -l` で測って報告）。
- **規則 4** `modifier-keys.ts` は入口から型しか取り込まない（`import type` だけ）—— 入口の `MODIFIER_ONLY_KEYS` が初期化で `KEY` を読むため。ほかの新しい兄弟は、入口の値を関数の中でだけ読み、頂上の初期化式では読まない。`FIXED_ACTION_BY_ENTRY` は `ENTRY` より後に書く（同じファイルの TDZ）。
- **規則 5** 移す宣言のコメント（`see`・`TRAP`・`WHY`）は宣言と共に運ぶ。頭の見出し（`@unit`・`@component`・`@purity`）の形は今の兄弟と同じ。
- **規則 6** 振る舞いを変えない。照合器（8 節）が一致しなければ止まって報告する。設計した違いは 8 節の表のものだけ。
- **規則 7** 各波で `tsc --noEmit`・`vitest`（試験は書き換えない）・`npm run types` と `npm run gen:check`（生成器を触る波）・`check.sh` の終了コードと赤の集合（当てる前と同じであること。`FAIL` を grep しない —— 検査 11・12・33）。検査 55 は `--list` で触ったファイルの行を報告する。

---

## 5. 波（1 波 1 コミット。表 T-075 の行と `SU-3` は、そのファイルを作る波のコミットに入れる —— 検査 18・26b・44 を各コミットで緑に保つ）

| 波 | すること | 触るファイル | 危険と手当て |
| --- | --- | --- | --- |
| W1 | `Schedule` に `task-group-tree.ts`（`UF-p6`）を作る: `schedule-invariants.ts` の `taskGroupRankById` を移し、`edit-task-group.ts` の `depthOf` を `taskGroupTreeDepth` の名で移す。`schedule.ts` が 2 つを出し直す。`schedule-invariants.ts`・`schedule-search.ts`・`edit-task-group.ts`・`task-group-naming.ts`・`task-group-order.ts`（写し `taskGroupTreeRankById` を消す）が新しいユニットを読む。入口の `taskGroupRankById`・`taskGroupGrabDepthOf` を消し、`armed-placement.ts`・`item-grab.ts`・`task-group-grab.ts` は `Schedule` から読む。入口の `taskGroupDepthOfGroup` を `task-group-tree-entrances.ts`（唯一の読み手）へ移す。`published-entries.json` の `PI-1` に 2 名。検査 70 の 2 記録（`twin-comments-baseline.txt:52-54`・`:178-180`）を消す | 上記 ＋ `docs/spec/05-07-design.md`（`UF-p6` の行、`SU-3`） | `Schedule` の中の取り込みの輪（`schedule-invariants` ↔ 新ユニット）を作らない —— 新ユニットは `schedule-entities` の型だけを読む。`npm run gen`（`published-entries` の md） |
| W2 | 写しを返す: `MS_PER_DAY`・`serialOfDay`・`dayFromSerial`・`compareDay` を消す。入口と `item-grab.ts` は `serial`・`dayFromSerial`・`compareDays` を `Schedule` から読む（呼び所: 入口の `dayShifted`・`pointerDaySerial`・`alignWrites`、`item-grab.ts:591`・`:858-870`・`:1051-1052`、`compareDay` 7 か所は `compareDays` へ —— 符号だけを読むので同じ）。`dayShift` の差を `calendarDaysBetween(from, to)` に。`TASK_SHAPE_KINDS`・`TASK_MILESTONE_GLYPHS` を消し、`taskShapeKindNamed`・`milestoneGlyphNamed`（改名）の本体が `COLUMN_SHAPES.TaskVisual` の `choices` を読む。`armed-placement.ts`・`field-commit.ts` の取り込みの名を改める | 入口・`armed-placement.ts`・`item-grab.ts`・`field-commit.ts` | 年 0〜99 の違い（3 節 G01・G02、Q4）。`DFC-1061` を閉じる（台帳は前に立つ者） |
| W3 | Z（`TOP_TASK_GROUP_DEPTH`・`zoomYCeiling`・`taskGroupsAtZoomY`）を `zoom-and-fit.ts` へ。H11: `zoom-and-fit.ts` に `timeZoomAnswer(context, isIn)` を足し、入口の `zoomTimeIn`/`zoomTimeOut` の腕と `shortcut-keys.ts:91-94` がそれを返す（腕の `TRAP` は入口に残す） | 入口・`zoom-and-fit.ts`・`shortcut-keys.ts`・`05-07-design.md`（`UF-30`・`UF-92` の文） | ⛔ 検査 55: `zoom-and-fit.ts` はコード 541・コメント 60 で上限ちょうど（`floor(541/9) = 60`）。運び込むコメントは `see` の 2 行だけにし、`timeZoomAnswer` にコメントを足さない。赤なら `comment-rules-src.md` の 5 節 |
| W4 | `chart-coordinates.ts`（`UF-p1`）を作り、R・D の 22 宣言を移す（`JDG-690`）。入口は `panTo`・`isOnTaskGroupArea` を取り込み、16 名を出し直す（規則 1） | 入口・新ファイル・`05-07-design.md` | 新ファイルは輪に入る（`CONSUMED_ELSEWHERE`・`changed`・`nothingToDo` を関数の中で読む。`unstoredZoomWrites` を `zoom-and-fit` から）。`tests/contract/dfc-2301-…` の `vi.mock('…/zoom-and-fit')` は元を広げるので影響なし。検査 55: コード ≈174・コメント ≈18（上限 19）—— 際どい。測って報告 |
| W5 | `modifier-keys.ts`（`UF-p2`）を作り、M の 12 宣言を移す。入口は P が読む 7 名を取り込み、6 名（`isCombo`・`KEY`・`isSingleCharacterKey`・`isTypedIntoSearchWord`・`releasedSnapOf`・`isDateKeepingDrag`）を出し直す | 入口・新ファイル・`05-07-design.md` | 規則 4（葉）。`PI-18` の `isCombo`・`isTypedIntoSearchWord` は出し直しで残る（検査 26b は出し直しを数える —— 今の `fitWrites` と同じ） |
| W6 | `task-alignment.ts`（`UF-p3`）を作る。`commandFromEntry` の `alignStart`/`alignFinish` の腕は `return alignAnswer(context, entry === ENTRY.alignStart)` になる | 入口・新ファイル・`05-07-design.md`（`FR-034`（`OW-1`）を `UF-30` から `UF-p3` の「負う要求」へ） | `requirement-owner` の数は変わらない（行が移るだけ） |
| W7 | `resource-list-entrances.ts`（`UF-p4`）を作る。5 つの札の 2 つの腕は `return commandFromResourceListEntry(entry, on.resourceUid, context)` になる | 入口・新ファイル・`05-07-design.md` | `ENTRY` は関数の中でだけ読む |
| W8 | `display-setting-entrances.ts`（`UF-p5`）を作る。`IC-4` の重ねが無いときの特別の段（`OP-15`）は入口に残し、その直後の `visibleElementOfEntry`/`commandFromVisibleElement` を新ファイルから読む。`IC-99`〜`IC-101` の 3 つの腕は `return commandFromDisplaySettingEntry(entry, context)` になる。⭐ 生成の区画が動く: `generate_entity_types.py` の `TARGETS` に新ファイルの `with_entry_switches(path, None, ENTRY_SWITCH_NAMES)` を足す（`entry_switch_block` は「読み、手で宣言しない」ファイルにだけ刷るので、入口の区画からは `VISIBLE_ELEMENT_BY_ENTRY` が自然に消える）。新ファイルの見出しに生成の段落、検査 21 に（新ファイル × `tbl-glossary.md`）の行 | 入口・新ファイル・生成器・`check-provenance.py`・`05-07-design.md` | `npm run types` → `gen:check` が緑。検査 55 の見出しの段落の行（小さいファイルは 100 行未満で C の対象外） |
| W9 | `ARMED_BY_ENTRY`（入口へ）と `FONT_SIZE_STEPS`（`display-setting-entrances.ts` へ）を生成する。`entry_switch_block` と同じ「読み、宣言しないユニットに刷る」形で 2 名を足す。`ARMED_BY_ENTRY` は `generate_icon_roster.py` を取り込んで `fill_arms_shape` の結果（`armsShape`）と表 T-109 の構えの欄、`state-machines.json` の `AR-n` → 構えの状態の名の結びから刷る（写さない）。`FONT_SIZE_STEPS` は `settings.json` の表 T-215 の行の並び。入口の `:866` の `TRAP` を消す。検査 21 の原稿の行（入口 × `01-04-requirements.md`・`state-machines.json`、新ファイル × `settings.json`）、入口の見出し `:6-7`、`03-implementation.md` の生成の定数の一覧（検査 30）。検査 69 の 2 記録を消す | 生成器・入口・新ファイル・`check-provenance.py`・`03-implementation.md`・`literal-restatement-baseline.txt` | `package.json` の `gen` の順は `types` が `icons` より先 ⇒ `icon-roster.json` を読まず、`generate_icon_roster` の関数を呼ぶ（`entry_switch_maps` の前例）。`ArmModeArmedState` の型は入口の手書きの取り込みにある |
| W10 | `commandFromEntry` の 10 の決まった腕（`openDocument`・`copyPicture`・`undo`・`redo`・`paletteMinimize`・`interactionRecord`・`milestoneList`・`documentSettingsProperties`・`agentApi`・`imageToJsonPrompt`）を `FIXED_ACTION_BY_ENTRY` の 1 表にし、`switch` の前（`guideCursorModeOfEntry` の段の後）で引く。呼ぶたびに新しい答え（`acted({ kind })`）を作る。H13: `task-group-grab.ts` に `taskGroupChosen`、入口と `commandFromRowGrab` が返す。`rememberedActualIn` を `screen-state-input.ts` へ | 入口・`task-group-grab.ts`・`screen-state-input.ts` | 表の型は「payload の無い `InputAction` の `kind`」。表に無い入口は今までどおり `switch` と `default` へ。`commandFromEntry` の `HELD` の行は下がるだけ（下げるのは調整役、`JDG-520`） |
| W11 | `nextIssuedUid` を `schedule.ts` へ（`DFC-1066` ②）。写し 6 つ（3 節）が読む。`PI-1` に 1 名 | `schedule.ts`・入口・`armed-placement.ts`・`field-commit.ts`・`edit-resource.ts`・`task-create.ts`・`edit-calendar.ts`・`delay-fixes.ts`・`published-entries.json` | `delay-fixes.ts` も 1,000 超 —— 行は減るだけ |
| W12（任意） | E32/N1: `taskUidsInTaskGroups` を `Schedule` に、`task-alignment.ts` と `command-palette.ts` が読む | `Schedule`・`task-alignment.ts`・`command-palette.ts`・`published-entries.json` | ScreenRenderer に触る |
| W13（任意） | 生成の 3 群（`NOT_STORED_VISIBLE_DAY_FLOOR`・`NOT_STORED_ROW_BAND_CEILING_SEARCH`・`NOT_STORED_HOUR_WIDTH_CEILING`）を `zoom-and-fit.ts` の、`NOT_STORED_PROPERTIES_PANEL_FLOOR` を `frame-drags.ts` の区画へ（読み手がそこだけ。`03-implementation.md:137`）。`TARGETS` に 2 ファイル、`PUBLISHED_READ_BY_SRC` の入口の鍵から 4 名を外す（刷った先では `export` しない、`JDG-139`）。検査 21 に 2 行 | 生成器・入口・`zoom-and-fit.ts`・`frame-drags.ts`・`check-provenance.py` | ⛔ 検査 55: 2 ファイルとも 10.0%（`frame-drags.ts` 117/13、`zoom-and-fit.ts` 541/60）。区画の見出しの段落が 2 行のコメントを足す ⇒ 赤になりうる。赤なら波ごと見送り、台帳に起こす |
| W14（任意） | H19: `PressRow` を `GesturePressRow` の別名に。`check-press-row-ids.py` の読み先を `gesture-values.ts` へ | `advance-screen-session.ts`・入口・`check-press-row-ids.py`・`published-entries.json` | 道具を変える |
| W15（任意） | `placementAt` を `EditDocument` の `task-plan-actual.ts`（逆向きの写像の持ち主、`DFC-1072` の H21）へ移し公開する —— 入口を ≈866 へ | `task-plan-actual.ts`・`edit-document.ts`・入口・`published-entries.json` | 公開名が 1 つ増える |

⭐ 1,000 を切るのに要るのは W1〜W8（W9・W10 で余裕が増える）。W11〜W15 は写しの台帳を片付けるもので、どれを落としても 1,000 の目標は崩れない。

---

## 6. 仕様の書き換え

### 6.1 表 T-075（`docs/spec/05-07-design.md`）

- `UF-30`
  - 旧: 「`CP-18` の残り —— 入力の種類と押した所から、答える兄弟を選ぶ（表 T-023a・表 T-109）。<br>兄弟が共有する語彙と補助 —— 出力の型、日とタスクグループの座標、スクロールの錨 —— を持つ。<br>縦軸の上限の字と帯を、コピーせずに `PI-5`・`PI-37` へ問う」、負う要求「`FR-016`（`OW-3`）・`FR-034`（`OW-1`）・`FR-040`（`OW-4`）・`FR-070`（`OW-3`）」
  - 新: 「`CP-18` の残り —— 入力の種類と押した所から、答える兄弟を選ぶ（表 T-023a・表 T-109）。<br>兄弟とシェルが共有する語彙 —— 入力の文脈と押し・出力の型・`Esc` の段の材料（`IN-4`）—— を持ち、兄弟が共有する補助（日程表の座標の読み・修飾キーの読み）を出し直す」、負う要求「`FR-016`（`OW-3`）・`FR-040`（`OW-4`）・`FR-070`（`OW-3`）」（`OW-3` の起点は公開エントリなので `FR-016`・`FR-070` は残る。`FR-034` は `OW-1` で規則を持つユニットへ移る）
- `UF-92`
  - 旧: 「日程表の倍率を決めて書き込む —— 1 段のズームと、全体を収めること」
  - 新: 「日程表の倍率を決めて書き込む —— 1 段のズームと、全体を収めること。<br>縦軸の上限の字と帯を、コピーせずに `PI-5`・`PI-37` へ問う」（`FR-016` の MUST NOT、(c)）
- 新しい行（`UF-30` の群の中、`UF-31` の前。`Schedule` の行は `UF-131` の直後）: 2.1 の表の `UF-p1`〜`UF-p6` の責務文。純粋性はどれも `pure`、負う要求は `UF-p3` だけ「`FR-034`（`OW-1`）」、ほかは「—」。

### 6.2 表 T-063 `UT-10`

- 旧（末尾）: 「兄弟が共有する語彙と補助、入口の振り分け（表 T-023a・表 T-109）は公開エントリに置いた」
- 新: 「兄弟が共有する語彙と入口の振り分け（表 T-023a・表 T-109）は公開エントリに置き、兄弟が共有する補助のうち日程表の座標の読みと修飾キーの読みは兄弟に置いて公開エントリから出し直した」。ファイルの欄（「全数は 表 T-075」）は変えない。

### 6.3 表 T-074 `SU-3` と数

- `SU-3`: 185 → **191**（`CR-579` だけで ＋6 —— 翻訳係 5・`Schedule` 1）。`CR-578`・`CR-580` の分の足し算は前に立つ者。
- 数を書く所: `05-07-design.md:246` の `SU-3` だけ（`git grep -n -E "\b185\b"` を `.claude/skills`・`tools`・`docs/spec/05-07-design.md`・`tests/contract` に掛けた）。`tests/contract/units.contract.test.ts:23` は `SU-3` を読む（字の数は持たない）。

### 6.4 表 T-064（`docs/spec/_source/published-entries.json`）

- `PI-1` に足す: `taskGroupRankById`・`taskGroupTreeDepth`（W1）、`nextIssuedUid`（W11）、任意で `taskUidsInTaskGroups`（W12）。
- `PI-18`: 変えない（`isCombo`・`isTypedIntoSearchWord` は出し直しで入口に残る）。
- 任意: `AdvanceScreenSession` に `GesturePressRow`（W14）、`EditDocument` に `placementAt`（W15）。

---

## 7. 検査の効き目（見込み）

| 検査 | 見込み |
| --- | --- |
| 60（関数の大きさ） | 上がる行 0。移す関数はどれも `HELD` でない。新しい関数（`alignAnswer` ≈8 行・`commandFromResourceListEntry` ≈10・`commandFromDisplaySettingEntry` ≈20 行 4 分岐・`timeZoomAnswer` ≈4・`taskGroupChosen` ≈7）はどれも 50 行・15 分岐の下。`commandFromEntry`（139/59）は ≈98 行へ下がる —— 調整役が実測へ下げる（`JDG-520`） |
| 55（コメントの密度、100 行以上のファイルで `floor(コード/9)` まで。基準線 0） | ⚠️ `zoom-and-fit.ts`（W3）と `chart-coordinates.ts`（W4）が際どい（1.2・5 節）。小さな新ファイル（コード 100 行未満: `modifier-keys`・`task-alignment`・`resource-list-entrances`・`display-setting-entrances`・`task-group-tree`）は C の対象外 |
| 45（同じ式の繰り返し） | 出し直しの文と、新しいファイルの取り込みで 20 字句を超える重複が出うる ⇒ 各波で回す。型なら既にある名で解く |
| 59（コンポーネントの辺） | 新しい辺 0（`InputCommandTranslator` → `Schedule`・LayoutEngine・`EditDocument`・`AdvanceScreenSession`、`EditDocument` → `Schedule`、`ScreenRenderer` → `Schedule` はどれも既にある） |
| 26b・18・44（新しいファイルの行） | 各波のコミットに表 T-075 の行と `PI-1` の名を入れて緑に保つ |
| 21・30・69・70 | W8・W9・W13 で書き換え（5 節）。69・70 は記録が減るだけ |
| 50 | 変わらない（`PressRow` は入口に残る。W14 をするときだけ道具を変える） |

---

## 8. 照合器（規則 05 の 割る波の手順 3、別の体が分割前の木から作る）

- 比べるもの: 公開エントリを動的に取り込み、`commandFromInput`・`selectionFromInput`・`screenEventFromInput`・`commandFromFieldCommit`・`taskGroupBandCeilingOf`・`isLandingMarkKeptBy`・`escapeContextOf`・`pressedRowOf` の多くの入力の出力の `sha256`。表 T-109 の入口すべて、`PressRow` すべて、掴みの連なり、±1 の境、倍率の端。W1・W11 のために `scheduleViolations`・検索の並び・`EditDocument` のタスクグループの並べ替えと名付け・貼り付けの uid。
- **設計した違い**（差として数えない）: ① 年 0〜99 の日（G01・G02 —— Q4 で B を選ぶならこの違いは無くなる）② `ARMED_BY_ENTRY` の鍵の並び（外へ出ない）③ 入口の公開名の一覧が減る（2.3 節の消える名）④ `Schedule` の公開名が 2〜4 増える。
- 感度: わざと壊す 10 件の例 —— `compareDays` の引数を逆にする、`FIXED_ACTION_BY_ENTRY` の 1 行の種類を変える、`ARMED_BY_ENTRY` の 1 行の `glyph` を変える、`TOP_TASK_GROUP_DEPTH` を 2 にする、`taskGroupRankById` の兄弟の並びを逆にする、`taskGroupTreeDepth` の起点を 0 にする、`alignAnswer` の `>= 2` を `>= 1` にする、`resourceListChoiceOfEntry` の未参照を逆にする、`nextFontSizeStep` の巡りを逆にする、`timeZoomAnswer` の向きを逆にする。

---

## 9. 残る問い（利用者か前に立つ者が決めること）

### Q1. 1,000 を切るために、`JDG-690` の 1 つの兄弟（R・D）より先へ出してよいか（利用者）

場面: `JDG-690` の時の見積もりは「写しを返し、R・D を出して ≈960 行」。いまは入口が 153 行太り（1,338 → 1,491）、同じことをしても ≈1,155 行に留まる（2.4 節の W4 の行）。`JDG-695` は 1,000 超を割る MUST。

| 選択肢 | 入口 | 中身 |
| --- | --- | --- |
| **A（推奨）** R・D に加え、修飾キー（M）・揃え（`FR-034`）・担当リストの入口（`FR-099`）・表示の設定の入口（`FR-049` ほか）の 4 つの兄弟へ出す | ≈890 | `JDG-690` が入口に残すと決めた台帳・振り分け・語彙には触れない。揃え・担当リスト・表示は要求の所有が提案する継ぎ目（`UD-1`）。M は共変が最も低い組の 1 つ（0.43） |
| B R・D に加え、M・揃え・担当リストの 3 つだけ | ≈973 | 1,000 との間が 27 行しかなく、次の機能 1 つで再び超える |
| C 答えの語彙（V の型 ≈200 行）を型のファイルへ出す | ≈950 | `JDG-690`（語彙は入口に残す）と CR の 3 節 ② に反する。V 〜 E 0.56・V 〜 P 0.60 で共に変わる |

### Q2. 新しいファイルの名（利用者 —— 規則 05 の 割る波の手順 1 は、名の表を見せてから最初の `src` の波を出す）

| 中身 | 推奨 | ほかの候補 |
| --- | --- | --- |
| R・D（点 → 日・タスクグループ・錨） | `chart-coordinates.ts` | `chart-point-reading.ts`（読むことを言う）／ `pointer-anchors.ts`（錨を言うが日の番号を言わない） |
| M（キーの名と修飾の組） | `modifier-keys.ts` | `input-modifiers.ts`（型 `InputModifiers` と揃う。`KEY` の英字を言わない）／ `key-combos.ts` |
| 表示の設定の入口 | `display-setting-entrances.ts` | `view-setting-entrances.ts`（`view-place.ts` と語が重なる）／ `appearance-entrances.ts` |
| `Schedule` の木の位置 | `task-group-tree.ts` | `task-group-tree-position.ts` |

（`task-alignment.ts`・`resource-list-entrances.ts` は既にある名の型に倣ったので問わない。）

### Q3. `item-grab.ts`（手書き 1,117）を割るか（前に立つ者 → 利用者）

場面: `JDG-695` の MUST に同じフォルダの兄弟が当たっている。2026-09-26 に名指された 3 本の外で、ほかにも 15 本が 1,000 を超える（1.1 節）。

| 選択肢 | |
| --- | --- |
| **A（推奨）** `CR-579` には入れず、別の変更要求で割る。本計画は `item-grab.ts` を 1 行も増やさない（規則 3） | `CR-579` の波が既に 11〜15 あり、`commandFromGrab`（122/57、`HELD`）を割る設計は別の測りが要る |
| B `CR-579` に入れる | 照合器と波が倍になる |

### Q4. 日の番号の写し（G01・G02）を畳むか —— 年 0〜99 だけ値が変わる（前に立つ者）

場面: `CR-831` が `serial` を直した結果、翻訳係の写しだけが年 0〜99 を 1900 年代に読む。どの入口も 1984 年より前を文書に入れない（`CR-831`）。

| 選択肢 | |
| --- | --- |
| **A（推奨）** 畳む（W2）。`DFC-1061`（対応 ① が決まり `CR-579` に割り当て済み）を閉じる。照合器は年 0〜99 を設計した違いに数える | 1 つの事実が 1 か所になる |
| B 写しを `chart-coordinates.ts` へそのまま移し、`DFC-1061` は開けたまま | 依頼文の「振る舞いを変えない」を字どおり守る。写しは残る |
