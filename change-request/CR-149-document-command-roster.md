# CR-149 — 命令の名簿を 表 T-108 として置く

> ⛔ **未適用である。** 4 編集は逐語検証済み（すべて `grep -F -c` で `count=1`）。
> ⭐ **機械検査は複製で先に通した** —— 16 検査・`audit-ch5.py`・`strictdoc export`（JSON と HTML の両方）を当てた複製に走らせ、**ALL GREEN** を実測した（§4）。
> ⚠️ **起草時は 3 編集だった。検証で 1 件（重複検出のベースライン）が増えた** —— 足さないと検査 11 が FAIL する。理由は §3 にある。

**閉じるもの**: CR-146 §4 が「利用者が裁定していない第三の論点」として落とした **`DocumentCommand` の全数を誰が持つか**。
⚠️ **`CR-145` は版 0.39 の変更履歴が席を使っている。ファイルは無いが再利用しない。**
⛔ **本 CR は名簿を置くだけである。** 名簿を組むときに見つかった仕様の穴（**49 件**）は **CR-150** が引き受ける —— **10 件を要求本文で閉じ、残りは利用者の裁定へ回す。**

## 1. 出どころ

名簿の実体は `previous-project-result/temp/document-command-roster.md` の **71 件**である。切り方は **「複数の列にまたがる MUST があるものだけ畳み、無いものは分ける」**。畳んだものは **20 件**、分けたものは **51 件**である。

### 実測した事実

| | 実測 |
|---|---|
| `DocumentCommand` の出現 | 仕様全体で **1 行だけ** —— `05-07-design.md:338` の `PI-8`。全数の持ち主を「Chapter 6.1」と書いている |
| Chapter 6.1（`05-07-design.md:679`） | **未記入。** 器は `SW_SPEC` を EARS 1 文で並べる形であり、**71 件の名簿を持てる形ではない** |
| 表 T-107（`_assets/tbl-glossary.md:308`） | **18 行。** 列は 行 ID / 群 / 確定名 / 品詞と純粋性 / 何を担うか / 正 の **6 列** |
| 用語集の末尾 | 節 6（表 T-107）で終わる。**節 7 の席は空いている**（`_assets/tbl-glossary.md:335` が最終行）|
| 接頭辞 `DC-` | ⛔ **埋まっている** —— 表 T-029a の `DC-1` 〜 `DC-6`（`Dual Cursor`）|

⭐ **持ち主が「置けない場所」を指している。** CR-146 が署名について直したのと同じ形の穴が、全数についても開いている。

## 2. 何をするか

**4 か所を触り、表を 1 つ・行を 71 増やす。**

| # | 場所 | 何を |
|---|---|---|
| **①** | `_assets/tbl-glossary.md:335` の直後 | **節 7 と 表 T-108 を新設**し、71 行を置く。行 ID は `CM-1` 〜 `CM-71` |
| **②** | `05-07-design.md:338`（`PI-8`）| 全数の持ち主を **表 T-108 を指す形**に |
| **③** | `01-04-requirements.md:195`（1.8）| 範囲表記 `表 T-101 〜 T-107` → `表 T-101 〜 T-108` |
| **④** | `docs/review/duplication-baseline.txt` | 署名を 1 行足す（§3）|

**表 T-108 の列は 表 T-107 に合わせた 6 列**である。`品詞と純粋性` の席には `組` を置く —— 命令はすべて動詞＋目的語で、純粋性は署名の側の話だからである。

| 行 ID | 群 | 確定名 | 組 | 何を担うか | 正 |
|---|---|---|---|---|---|
| CM-1 | `Project` | `setProjectTitle` | — | 文書名を変える | `FR-035` |
| CM-2 | `Project` | `setProjectProfile` | — | 基本情報を直す | `FR-074` |
| CM-3 | `Project` | `setStatusDate` | — | 基準日を置く・動かす | `FR-046` |
| CM-4 | `Project` | `clearStatusDate` | — | 基準日を消す | `FR-046` |
| CM-5 | `Project` | `setThemeHue` | — | テーマの色相を変える | `FR-041` |
| CM-6 | `Task` | `createTask` | ⭐ | タスクを作る | `FR-001` |
| CM-7 | `Task` | `deleteTask` | — | タスクを消す | `FR-032` |
| CM-8 | `Task` | `pasteTaskSubtree` | ⭐ | 部分木を複製する | `FR-033` |
| CM-9 | `Task` | `setTaskName` | — | 名称を変える | `FR-091` |
| CM-10 | `Task` | `setTaskNotes` | — | 備考を置く | `FR-006` |
| CM-11 | `Task` | `setTaskPlanDates` | ⭐ | 予定の開始・終了を置く | `FR-012` |
| CM-12 | `Task` | `setTaskDeadline` | — | 期限を置く | `FR-006` |
| CM-13 | `Task` | `setTaskPlanActualState` | ⭐ | 予実の 5 列を置く | `FR-010` |
| CM-14 | `Task` | `beginTaskActual` | ⭐ | 実績を置き始める | `FR-043` |
| CM-15 | `Task` | `cycleTaskPlanActualState` | ⭐ | 予実の状態を巡らせる | `FR-013` |
| CM-16 | `Task` | `setTaskFadeInDays` | — | フェードイン日数を置く | `FR-075` |
| CM-17 | `Task` | `setTaskFadeOutDays` | — | フェードアウト日数を置く | `FR-075` |
| CM-18 | `Task` | `setTaskWbsParent` | — | WBS の親を移す | `FR-005` |
| CM-19 | `Task` | `moveTaskToTaskGroup` | — | 別の行へ載せ替える | `FR-005` |
| CM-20 | `TaskVisual` | `setTaskVisualShapeKind` | — | タスク形状を変える | `FR-083` |
| CM-21 | `TaskVisual` | `setTaskVisualMilestoneGlyph` | — | マイルストーン形状を変える | `FR-078` |
| CM-22 | `TaskVisual` | `setTaskVisualColors` | ⭐ | 線色と塗り色を置く | `FR-007` |
| CM-23 | `TaskVisual` | `resetTaskVisualColors` | ⭐ | 色をテーマ追随へ戻す | `FR-007` |
| CM-24 | `TaskVisual` | `setTaskVisualLineWeight` | — | 線の太さを置く | `FR-007` |
| CM-25 | `TaskVisual` | `setTaskVisualNamePlacement` | ⭐ | 名称ラベルの位置を置く | `FR-002` |
| CM-26 | `TaskGroup` | `createTaskGroup` | ⭐ | 行を作る | `FR-085` |
| CM-27 | `TaskGroup` | `deleteTaskGroup` | — | 行を消す | `FR-032` |
| CM-28 | `TaskGroup` | `pasteTaskGroupSubtree` | ⭐ | 行の部分木を複製する | `FR-033` |
| CM-29 | `TaskGroup` | `setTaskGroupLabel` | — | 行の名前を変える | `FR-085` |
| CM-30 | `TaskGroup` | `setTaskGroupColor` | — | 行の色を置く | `FR-042` |
| CM-31 | `TaskGroup` | `resetTaskGroupColor` | — | 行の色をテーマ追随へ戻す | `FR-007` |
| CM-32 | `TaskGroup` | `setTaskGroupHeight` | — | 行の高さを置く | `FR-042` |
| CM-33 | `TaskGroup` | `setTaskGroupCollapsed` | — | 行を畳む・開く | `FR-004` |
| CM-34 | `TaskGroup` | `setTaskGroupHidden` | — | 行を隠す・戻す | `FR-004` |
| CM-35 | `TaskGroup` | `reorderTaskGroupSiblings` | ⭐ | 兄弟の並びを変える | `FR-005` |
| CM-36 | `Dependency` | `createDependency` | ⭐ | 依存線を引く | `FR-009` |
| CM-37 | `Dependency` | `deleteDependency` | — | 依存線を消す | `FR-032` |
| CM-38 | `Dependency` | `setDependencyLag` | ⭐ | ラグを変える | `FR-009` |
| CM-39 | `Calendar` | `setCalendar` | ⭐ | 暦と週の始まりを直す | `FR-088` |
| CM-40 | `Resource` | `createResource` | — | 担当者を足す | `FR-008` |
| CM-41 | `Resource` | `setResourceName` | — | 担当者の名前を変える | `FR-008` |
| CM-42 | `Resource` | `deleteResource` | — | 選んだ担当者を消す | `FR-099` |
| CM-43 | `Resource` | `deleteUnreferencedResources` | — | 未参照をまとめて消す | `FR-099` |
| CM-44 | `Assignment` | `createAssignment` | — | 担当者を就ける | `FR-008` |
| CM-45 | `Assignment` | `unassignResource` | — | 割当を解く | `FR-008` |
| CM-46 | `CommentBox` | `createCommentBox` | — | コメントボックスを置く | `FR-019` |
| CM-47 | `CommentBox` | `deleteCommentBox` | — | コメントボックスを消す | `FR-032` |
| CM-48 | `CommentBox` | `setCommentBoxText` | — | 本文を書く | `FR-097` |
| CM-49 | `CommentBox` | `setCommentBoxLeaderShapeKind` | — | 引出し線の形を選ぶ | `FR-019` |
| CM-50 | `CommentBox` | `setCommentBoxAnchor` | — | 留め先を変える | `FR-016` |
| CM-51 | `CommentBox` | `setCommentBoxBodyOffsetPx` | — | 本文のずれを変える | `FR-016` |
| CM-52 | `HighlightBox` | `createHighlightBox` | — | ハイライトボックスを置く | `FR-019` |
| CM-53 | `HighlightBox` | `deleteHighlightBox` | — | ハイライトボックスを消す | `FR-032` |
| CM-54 | `HighlightBox` | `setHighlightBoxRange` | — | 囲む範囲を変える | `FR-016` |
| CM-55 | `HighlightBox` | `setHighlightBoxStrokeColor` | — | 枠の色を置く | `FR-019` |
| CM-56 | 見せ方の群 | `setStackDirection` | — | 積む向きを選ぶ | `FR-003` |
| CM-57 | 見せ方の群 | `setPlanActualDisplay` | — | 予実の表示を選ぶ | `FR-049` |
| CM-58 | 見せ方の群 | `setElementVisible` | — | 要素の表示を切り替える | `FR-049` |
| CM-59 | 見せ方の群 | `setGuideCursorMode` | — | ガイドカーソルを選ぶ | `FR-048` |
| CM-60 | 見せ方の群 | `setDualCursor` | ⭐ | 2 本のカーソルを置く | `FR-082` |
| CM-61 | 見せ方の群 | `clearDualCursor` | — | 2 本のカーソルを解く | `FR-082` |
| CM-62 | 見せ方の群 | `setFontScale` | ⭐ | 文字サイズの段を変える | `FR-039` |
| CM-63 | 見せ方の群 | `setThemePreference` | — | 明暗テーマを選ぶ | `FR-039` |
| CM-64 | 見せ方の群 | `setThemeMonochrome` | — | モノクロを選ぶ | `FR-041` |
| CM-65 | 見せ方の群 | `setZoom` | ⭐ | 表示倍率を変える | `FR-016` |
| CM-66 | 見せ方の群 | `setScrollPosition` | — | 表示位置を変える | `FR-051` |
| CM-67 | 見せ方の群 | `setPanelWidths` | ⭐ | パネル幅を変える | `FR-052` |
| CM-68 | 見せ方の群 | `pinTaskGroup` | — | 行をピン止めする | `FR-098` |
| CM-69 | 見せ方の群 | `unpinTaskGroup` | — | ピン止めを外す | `FR-098` |
| CM-70 | 見せ方の群 | `setExportPngScale` | — | PNG の倍率を選ぶ | `FR-025` |
| CM-71 | 見せ方の群 | `fitScheduleToScreen` | ⭐ | 全体を 1 画面に収める | `FR-055` |

- **`群`** は対象の確定名（`Project` / `Task` / `TaskVisual` / `TaskGroup` / `Dependency` / `Calendar` / `Resource` / `Assignment` / `CommentBox` / `HighlightBox`）と 見せ方の群。
- **`組`** は ⭐ か `—`。⭐ は **20 行**である。
- **`正`** は要求 1 つ（**39 種の `FR`。全部が実在することを確かめた**）。

**前書きは **CR-146 適用後の** 表 T-107 と同じ形にした**（`src/` が署名を、Chapter 6.1 が境界値を、要求が規則を持つ）。

⛔ **署名・引数・戻り値・境界値は 1 つも書かない。** ⛔ **`（MUST）` を 1 つも書かない** —— 検査 12 は用語集の MUST を落とすためである。

## 3. ⚠️ 起草で覆った 5 点

| | |
|---|---|
| **改名 4 件** | `advanceTaskPlanActualState`→**`cycleTaskPlanActualState`**（仕様自身の動詞が「巡らせる」。`FR-013` / `FR-043` ／ `05-07-design.md:500`）／ `deleteAssignment`→**`unassignResource`**（仕様は割当の「解除」と担当者の「削除」を書き分ける。`:1514` / `:1520`）／ `setTaskGroupOrder`→**`reorderTaskGroupSiblings`**（`HM-8` の動詞は「並べ替え」。`:1350`）／ `setCommentBoxBodyOffset`→**`setCommentBoxBodyOffsetPx`**（列名が `bodyOffsetPx` であり、`setTaskFadeInDays` と同じ逐語の慣行）|
| **「正」の訂正 4 件** | `setTaskPlanDates` の正は `FR-006` ではなく **`FR-012`** —— `finish` が `start` より前を受け付けない等の MUST NOT は `:1991` / `:1995` にあり、`FR-006` が持つのは入口（`PR-3`）だけである。⭐ **`CM-50` / `CM-51` / `CM-54` の正も `FR-019` ではなく `FR-016`** —— `FR-019`（`:2599`）の STATEMENT は「構えて置いたとき…作り…持つこと」＝**置くときだけ**を縛り、置いた後に留め先・本文のずれ・囲む範囲を変える規則は 表 T-023d の `GR-14`（`:2268`。`FR-016` の表）にしか無い（CR-150 §5）。**種類の数は 39 のまま**である（`FR-019` が 7 → 4、`FR-016` が 1 → 4）|
| **判定** | `setDependencyLag` は **⭐ 側**である —— `01-04-requirements.md:1775` が `lag` の編集と `linkType` を 1 操作で縛る。名簿の集計（19 / 52）は **20 / 51** に直る |
| **接頭辞** | `DC-` が使えないので **`CM-`** にした。表 T-107 の `AM-`（Agent Member）と対になる |
| **ベースライン** | ⚠️ **`CM-16` / `CM-17`（フェードイン・フェードアウト）が新しい重複として立つ**（類似 0.49）。**同じ形の兄弟行が既に 6 組ベースラインに載っている**（`S-28`+`S-29`、`S-75`+`S-76`、`S-122`+`S-123`、`K-28`+`K-29` ほか）ので、文言を歪めず署名を足す |

⭐ **`組` の列は裁定に無い。** ⭐ が無いと 71 行がただの羅列になり、畳んだ理由が読めなくなるので置いた。**外すなら 71 行はそのままで 1 列減る。**

⚠️ **CR-146 とは 1 行も取り合わない**（`:325` / `:306` に対し 本 CR は `:338` と末尾）。**どちらを先に当ててもよい。** ただし CR-146 が当たるまで、表 T-107 と 表 T-108 の前書きは表現が揃わない。

⛔ **変更履歴は本 CR の編集に含めない。** CR-146 / CR-147 / CR-148 と同じ席を取り合うので、**当て終えてから 1 回で書く。**

## 4. 数の予測（すべて複製で実測）

| | 改定前 | 改定後 |
|---|---|---|
| `tables` | 114 | **115** |
| `rows` | 1338 | **1409**（＋71）|
| `figures` / `uids` | 10 / 140 | **不変** |
| 検査 1 のノード数 | `SECTION`=68 `TEXT`=66 | **`SECTION`=69 `TEXT`=67**（節 7 と前書き）|
| 検査 2 〜 10・15・16 | 0 件 / OK | **0 件 / OK** |
| 検査 11 | A=16（new 0）groups=48 pairs=119 | ⚠️ **編集 ④ 込みで不変。**④ が無いと **new 1** で FAIL |
| 検査 12 | 0 件 | **0 件**（助言の 13・14 も 4 件 / 18 件のまま）|
| `audit-ch5.py` | PASS | **PASS** |
| HTML 描画 | 用語集 `<table>`=7、素の `**`=2 | ⭐ **`<table>`=8、素の `**`=2（増えない）** —— 前書きの太字 3 か所は `<strong>` として出る |
| 生成物 | — | **再生成は要らない** —— `erd.json`・`components.json`・`_assets/source/` を 1 つも触らない |