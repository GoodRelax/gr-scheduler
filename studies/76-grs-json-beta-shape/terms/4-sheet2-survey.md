# シート 2 の下調べ — 区分の中の部品（マウスで操作するもの・決まった絵の部品）

1 枚目で決まった木（`3-sheet1-questions.md`）の下の段、`Task Group Lanes`・`Time Ruler`・2 つのパネルの中にある部品を、層ごとに数えた。
2 つの族に分けた。A はマウスで操作するもの（`JDG-3362` の「操作点と操作子」）、B はいつも描いてある絵の部品。
名を決めるのは利用者であり、本書は数と食い違いだけを並べる（どれが正しいかは選んでいない）。

## 数え方

| 層 | 読んだもの | 数え方 |
| --- | --- | --- |
| 用語集 | `docs/spec/_assets/tbl-glossary.md` | その語を含む表の行の ID。「行なし」は、その部品を名として定める行が無いこと |
| 画面 | `src/adapter/screen-renderer/display-words.json` | `"ja":` / `"en":` の行に出る回数。例は `dw:2768` のように行番号 |
| 本文 | `docs/spec/*.md`・`docs/spec/_assets/*.md`（用語集は除く） | 出る回数。例の `01-04:5204` は `01-04-requirements.md` の 5204 行 |
| JSON 案 | `doc-shape-map.tsv` の `description_new` | 出る回数（英語は大文字小文字を区別しない）。例は TSV の行番号 |
| コード | `src/**/*.ts`（185 ファイル） | 注釈と文字列を除いた識別子の「種類 / 回数」。`data-role` の名は文字列のほうから別に拾った |

- 数は scratchpad の `survey2.py`（語の一覧は `terms2.json`）と grep で数えた。日本語の言い換え（「実績のダミー」など）は grep の `-o` で数えた。
- 「掴み代」「操作子」のような日本語は前後を見ずに数えたので、別の意味が少し混ざる所は表に書いた。
- 画面の en の欄が識別子（`fadeHandleHalfPx` など）になっているのは、設定の行の英語ラベルが識別子をそのまま出しているため。

---

## A. マウスで操作するもの（操作点と操作子）

### A1. 掴む所

| 部品 | 用語集 | 画面 ja / en | 本文 | JSON 案 | コード |
| --- | --- | --- | --- | --- | --- |
| 掴み領域 `Grab Region`（`U-43`） | `U-43` | 0 / 0 | ja 10（`01-04:2368`・`tbl-settings.md:342`）、英 1（`01-04:7425`） | 0 | `WindowGrabRegion` 1 種 / 4（`screen-surface.ts:18`）—— ウィンドウにだけ使う |
| 掴み点 `Grab Point`（`U-43`） | `U-43`・`K-94`・`K-95` | 2 / 0（`dw:3045`・`:3055`、フェードの設定） | 72（`tbl-settings.md:360`・`:361`） | 0 | `grabPoint` 族 7 種 / 15（`item-hit-area.ts:1141`・`schedule-overlays.ts:197`） |
| 掴み代 | **行なし**（`U-52` の説明に出るだけ） | 0 / 0 | **238**（表 T-266 の表題「掴み代の幾何」`01-04:4718`、`tbl-document-commands.md:47`） | 0 | 0（コードは `grab` 族 46 種 / 362、`grab` 146 回 `input-command-translator.ts:353`） |
| 掴み帯（パレット・`Panel Divider`・タスクグループ） | **行なし**（`IC-75`・`IC-76` の文の中） | 0 / 0 | 27（`GR-19`・`GR-22` `01-04:4486`・`:4490`、`tbl-settings.md:410`） | 0 | `GrabStrip`・`GrabBand` 8 種 / 27（`task-group-grab.ts:267`・`frame-drags.ts:34`）—— strip と band が混ざる |
| つまみ（`Scrollbars` の、`GR-21`） | 行なし | 0 / 0 | 14（`01-04:4499`・`tbl-state-machines.md:643`） | 0 | `thumb` 2 種 / 5（`screen-frame.ts:65`） |
| handle（描く掴み点） | `K-94`・`K-95` の設定名 `fadeHandle*` だけ | 識別子として 2 | ja ハンドル 3（`05-07:132`） | 0 | `handleParts`（`svg-renderer.ts:895`）・`fadeHandles`（`schedule-task-figures.ts:649`）。同じ handle が `FileHandle` 21 回（ファイル）にも |

掴む所の表は 3 つ（表 T-266 `GA-*` 日程の形・表 T-267 `HT-*` 手順・表 T-268 `TY-*` 順、ほかに表 T-023d `GR-*` 日程の形でないもの）。
T-266 と T-268 は「掴み代」、T-023d は表題が「掴み領域」で、行の中では「掴み帯」「掴み代」「つまみ」を使う。

### A2. 選ぶ・構える・指す

| 部品 | 用語集 | 画面 ja / en | 本文 ja / 英 | JSON 案 | コード |
| --- | --- | --- | --- | --- | --- |
| 選択 `Selection`（`U-39`） | `U-39` ほか 10 行 | 25 / 7（`dw:198`・`:286`） | 405 / 53 | 0 | `selection` 族 48 種 / 465 |
| 範囲選択 `Marquee`（`U-40`） | `U-40`・`X-4` | 1 / 1（`dw:5091`「範囲選択する」/ `:5092`「Marquee-select」） | 33 / 5（`01-04:592`） | 0 | `marquee` 8 種 / 33（`marquee.ts:23`） |
| 構え `ArmedShape`（`U-38`） | `U-38`・`X-3`・`IC-23` ほか 13 行 | **30 / 0**（`dw:308`「矩形を構える」→ en「Rectangle: drag …」） | 176 / 338（英は `armed` を含む） | 0 | `armed` 族 31 種 / 182（`armed-placement.ts:52`） |
| ポインタ `Pointer`（`U-42`） | `U-42` | 1 / 2（`dw:5047`・`:1464`） | **ポインタ 261・ポインター 0** / 10 | 0 | `pointer` 族 72 種 / 580 |
| カーソル `Cursors`（`U-10`） | `U-10`・`U-12`・`U-13`・`K-80`・`K-81` ほか | 7 / 5（`dw:726`・`:744`） | 76 / 45 | 0 | `cursor` 族 33 種 / 202 |
| デュアルカーソル `Dual Cursor`（`U-12`） | `U-12`・`K-80`・`IC-45` | 3 / 2（`dw:744`・`:2815`） | デュアルカーソル 5・**2 連カーソル 2**（`01-04:5199` の `ZO-8`）/ 32 | 0 | `dualCursor` 族 23 種 / 125 |
| ガイドカーソル `Guide Cursor`（`U-13`） | `U-13`・`K-81`・`IC-47` | 3 / 2（`dw:726`・`:2825`） | 25 / 6 | 0 | `guideCursor` 族 13 種 / 70 |

### A3. タスクグループパネルの操作子と、ドラッグ中の印

| 部品 | 用語集 | 画面 | 本文 | コード（`data-role` は `dom-screen-surface.ts`） |
| --- | --- | --- | --- | --- |
| 折りたたみの操作子 `Task Group Expander`（`U-47`） | `U-47`（1 つの名） | 0 | 80。`HF-1`（`01-04:1764`）は **4 つ**の操作子（隠す・1 階層展開・すべて折りたたむ・すべて展開）を 2 × 2 に置く | `expander` 14 種 / 46、`data-role` `Task Group Expander`（`:90`） |
| ピン止めの操作子 `Task Group Pin`（`U-48`） | `U-48`・`U-46`・`K-110`・`K-111` | ja 7 / en 5（`dw:887`・`:2692`） | 107 | `pin` 族 22 種 / 222、`data-role` `Task Group Pin`（`:91`） |
| 操作子（総称） | **行なし**（`U-47`・`U-48` の説明だけ） | 0 / en「control」2 | **164**（`tbl-settings.md:207`・`:397`） | — |
| 操作点 | 行なし | 0 | **0** | — |
| 差し込み線（`HF-15`） | **行なし** | 0 | 12（`tbl-settings.md:480`・`:485`） | `dropLine` 1 種 / 2、`data-role` **`Task Group Drop Line`**（`:100`） |
| 差し込み線の左端の丸（輪） | 行なし | 0 | `HF-15` の中だけ（`S-620`） | 名なし（`Grab Cues` の中） |
| 運んでいるタスクグループの写し | **行なし** | 0 | 写し 7（`HF-15` `01-04:1775` の中）・`S-599`（`tbl-settings.md:573`） | `grabCopy` 2 種 / 12、`data-role` **`Task Group Grab Copy`**（`:101`） |
| 上の 3 つをまとめた物 | **行なし** | 0 | 0 | `grabCues` 3 種 / 6、`data-role` **`Task Group Grab Cues`**（`:102`） |
| ドロップの案内 `Drop Cue`（`U-68`） | `U-68`（「面」と書く） | 0 | 5（`01-04:5249`） | `dropCue` 8 種 / 39、`data-role` `Drop Cue`（`:99`） |

### A4. 押しているあいだ・乗せているあいだ・選んでいるあいだだけ描くもの

| 部品 | 用語集 | 本文（重ね順） | コード |
| --- | --- | --- | --- |
| 選択の枠 | **行なし** | 14（`ZO-10` `01-04:5204`・`S-174`） | `selectionFrameSvg` 1 種 / 6（`schedule-overlays.ts:38`）—— **範囲選択の矩形も同じ関数で描く**（`svg-renderer.ts:944`） |
| 範囲選択の矩形 | `U-40` は「選ぶこと」で、矩形の行は無い | 7（`ZO-6` `01-04:5207`） | `zoLayer('ZO-6', …)`（`svg-renderer.ts:944`） |
| フェードの掴み点（`GA-7`・`GA-8`） | 設定 `K-94`・`K-95` だけ（「フェード掴み点」） | フェードの掴み点 22・フェード掴み点 0（`ZO-10`） | `fadeHandles` 4 種 / 11 |
| ハイライトボックスの掴み点（8 つ、表 T-246） | 行なし | 5（`01-04:4547`・`tbl-settings.md:405`） | `grabPointsOfBox`（`schedule-overlays.ts:197`） |
| コメントボックスの線先（`Leader Anchor`） | **行なし**（「Leader」「線先」とも 0） | 線先 84・線先の印 2（`ZO-10`）・アンカー 13 は**依存線の両端**（`01-04:725`・`:2859`） | `anchor` 族 55 種 / 628 —— 線先のほか `ScrollAnchor`・`TaskGroupAnchor`・`TooltipAnchor`・`nameAnchor` も。JSON 案は `CommentBox/anchor`（TSV `:221`・`:222`） |
| 構えて引いている仮の依存線 | 行なし | 仮の依存線 5（`ZO-11` `01-04:5205`・`:2890`） | `tentative` 族（`tentativeLink`・`tentativeParts` `svg-renderer.ts:897`）。`Dependency` でも `Link` でもない名 |
| 依存線の端の `Task` の囲み | 行なし | 依存線の端 6（`ZO-10`） | `endOutlineParts`（`svg-renderer.ts:895`） |
| 飛んだ先の印の囲み・関係するタスクの囲み・波紋 | **行なし** | 飛んだ先の印 9・波紋 16（`ZO-8` `01-04:5199`） | `data-role` **`Jump Landing Ring`**・**`Jump Landing Related Ring`**（`schedule-overlays.ts:98`・`:101`）・**`Jump Landing Ripple`**（`dom-screen-surface.ts:1466`）、`jumpLanding` 族 10 種 / 31 |
| 続きの印（依存線、`EL-9`・`EL-16`） | 行なし | **49**（`GA-24`・`EP-12` `01-04:7425`） | — |
| ホバーの印 | 行なし | ホバー 1（`tbl-settings.md:500`） | `hover` 族 5 種 / 22（`hoveredEntrance` `dom-screen-surface.ts:161`） |

### A のほころび

1. **掴む所の名が 4 つ、用語集の名がいちばん少ない**: 掴み代 238・掴み点 72・掴み帯 27・掴み領域 10。用語集 `U-43` は「掴み領域 / 掴み点」だが、表 T-266 の表題と本文の大半は「掴み代」で、掴み代には行が無い。英語は `Grab Region` が本文 1 回（`EP-12`）、コードは `grab` だけ（region はウィンドウに 1 種）。
2. **描く掴み点の英語が 3 つ**: `Grab Point`（用語集）・`handle`（`fadeHandle*`、`handleParts`、`data-figure` の `-fade-handle`・`comment-…-handle`）・`grab`／`grabPoint`（`grabPointsOfBox`、`data-figure` の `box-…-grab-…`）。handle はコードでファイルの `FileHandle` も指す。
3. **ドラッグ中の印に行が無い**: `data-role` の `Task Group Drop Line`・`Task Group Grab Copy`・`Task Group Grab Cues`・`Jump Landing Ring`・`Jump Landing Related Ring`・`Jump Landing Ripple` の 6 つ。`W-4`（`01-04:334`）は「`data-role` は表 T-103 の名を書く」と定めている。本文の日本語（差し込み線・写し・波紋）とも対応が書かれていない。
4. **1 つの名に 4 つの操作子**: `Task Group Expander`（単数、「折りたたみの操作子」）が、`HF-1` の 4 つ（隠す・1 階層展開・すべて折りたたむ・すべて展開）を指す。総称「操作子」（本文 164）に行が無く、`JDG-3362` の「操作点」は本文 0。
5. **anchor が 5 つのもの**: コメントボックスの線先（JSON 案・コード）、依存線の両端（本文のアンカー 13）、スクロールの基準、タスクグループの基準、ツールチップの置き場。線先そのものの名は用語集に無く、本文は「線先」、JSON 案は `anchor`。
6. **選択の枠と範囲選択の矩形に行が無い**: `ZO-10` と `ZO-6` は別の物として順を決めるが、コードは同じ `selectionFrameSvg` で描く。`U-40` の Marquee は「選ぶこと」で、絵の名ではない。
7. **画面の en に「構え」が無い**: ja は「矩形を構える」など 30、en は「Rectangle: drag …」で armed の語を出さない（本文の英は `ArmedShape`・`armed` 338）。
8. **言い換え**: `Dual Cursor` を `ZO-8` が「2 連カーソル」（2）、ポインタを 1 枚目の木が「ポインター」（本文は ポインタ 261・ポインター 0）。
9. **`Drop Cue` を用語集は「面」と書く**（1 枚目で面は `Dialog` に分けた）。押せるものを持たない印であり、A3 の印と同じ仲間かもしれない。

---

## B. いつも描いてある絵の部品（`Task Group Lanes` と `Time Ruler`）

### B1. 字の部品（ラベルと札）

| 部品 | 用語集 | 画面 ja / en | 本文 | JSON 案 | コード |
| --- | --- | --- | --- | --- | --- |
| 名称ラベル `Name Label`（`U-7`） | `U-7`・`K-124`・`IC-103` | 2 / 1（`dw:2768`・`:5179`） | 98 | 2（`:24`・`:44`） | `nameLabel` 4 種 / 12（`name-label.ts:131`） |
| 担当ラベル `Assignee Label`（`U-8`） | `U-8`・`K-75`・`IC-79` | 4 / 4（`dw:623`・`:2748`） | 担当ラベル 33・担当の札 5 | 1（`:51`） | `assigneeLabel` 4 種 / 18（`schedule-task-figures.ts:692`） |
| 完了率ラベル `Percent Complete Label`（`U-41`） | `U-41`・`K-76`・`IC-80` | 3 / 3（`dw:634`・`:2758`） | 完了率ラベル 12・進捗の札 9 | 1（`:46`） | **`percentLabel`** 2 種 / 5（`percent-label.ts:12`）—— Complete が落ちる |
| 札（担当と進捗の札） | **行なし**（`K-132` の説明が「担当と進捗の札」） | 1 / 0（`dw:2231`） | 札 125、うち「担当と進捗の札」8（`ZO-5` `01-04:5201`・`tbl-settings.md:97`） | 0 | `labelParts`（`svg-renderer.ts:890`） |

### B2. 線

| 部品 | 用語集 | 画面 ja / en | 本文 | JSON 案 | コード |
| --- | --- | --- | --- | --- | --- |
| イナズマ線 `Progress Line`（`U-9`） | `U-9`・`K-50`・`K-51`・`K-79` | 4 / 3（`dw:568`・`:2421`） | 54 | 1（`:48`） | `progressLine` 6 種 / 23（`schedule-overlays.ts:90`） |
| 基準日線 `Status Line`（`U-11`） | `U-11`・`X-5` | 1 / 1（`dw:715`） | 56 | 2（`:92`） | `statusLine` 9 種 / 36（`input-command-translator.ts:796`） |
| 依存線 `Dependency Lines`（`U-16`） | `U-16`・`N-12` ほか 12 行 | 10 / 8（`dw:513`・`:645`） | 240 | 1（`:50`） | **`link`**（`links.linkParts` `svg-renderer.ts:884`・`dependencyLinkSvg`）と `dependencyArrow*`、8 種 / 35。`dependencyLine` は 0 |
| 矢じり | 設定 `K-27`・`K-46`・`K-135`・`K-136` だけ | 4 / 3（`dw:2141`・`:2351`） | 92 | 0 | `arrowHead` 4 種 / 16（`schedule-task-figures.ts:10`） |
| 日付罫線 `Date Grid Lines`（`U-17`） | `U-17`・`K-82`・`IC-42` | 3 / 3（`dw:601`） | 6 | 1（`:52`） | `isDateGridLinesVisible` 1 種 / 5 |
| グループ罫線 `Group Grid Lines`（`U-18`） | `U-18`・`K-83`・`IC-43` | 3 / 3（`dw:612`） | 8 | 0 | `groupGridLine` 族 5 種 / 18（`image-exporter.ts:182`） |
| 予実の補助線（`FR-084`） | **行なし**（設定 `K-91`〜`K-93` だけ） | 3 / 3（`dw:3015`、en は識別子） | 予実の補助線 10・補助線 17（`ZO-1a` `01-04:5194`） | 0 | `planActualGuide*` 2 種 / 4、描く層は **`guideParts`**（`svg-renderer.ts:881`）—— Guide Cursor と同じ guide |
| 停止日から再開アイコンへの破線 | **行なし**（設定 `K-28`・`K-29`・`K-130`「再開アイコンへ繋ぐ破線」） | 3 / 0（`dw:2151`） | 4（`ZO-2` `01-04:5195`・`tbl-settings.md:107`） | 0 | `resumeDash*` 3 種 / 6（`document-settings.ts:253`） |
| コメントボックスの線（`Leader Line`） | **行なし** | 0 / 0 | コメントボックスの線 13・引き出し線 1（`fig-erd-detail.md:453`）・英 leader 8 | 4（`:221`・`:228`・`:229`「leader line」） | `leader` 3 種 / 18（`leaderShapeKind` `grs-json-schema.ts:552`・`leaderOf` `schedule-overlays.ts:9`） |

### B3. 印とアイコン

| 部品 | 用語集 | 画面 ja / en | 本文 | JSON 案 | コード |
| --- | --- | --- | --- | --- | --- |
| 進捗マーカー `Progress Marker`（`U-5`） | `U-5`・`K-22`〜`K-27` ほか 13 行 | 4 / 3（`dw:579`・`:2241`） | 進捗マーカー 142・マーカー 288 | 1（`:49`） | `marker` 族 35 種 / 249（`item-grab.ts:345`）、層は `markerParts` |
| 再開アイコン `Resume Icon`（`U-6`） | `U-6`・`K-26`〜`K-29`・`K-130` | 6 / 1（`dw:583`・`:2131`） | 62 | 1（`:49`） | `resumeBox`・`resumeArm*`・`resumeHead*` 3 種 / 14（`item-hit-area.ts:282`）—— Icon の語は無い |
| 期限の印 `Deadline Mark`（`U-63`） | `U-63`（「マーカーと呼ばない」） | **0 / 0** | 23（`ZO-13` `01-04:5198`・`GR-26`） | 0 | `deadline*` 10 種 / 48（`DeadlineGeometry` `schedule-task-figures.ts:45`）—— Mark の語は無い |
| マイルストーンマーク `Milestone Mark`（1 枚目で決めた） | 行なし。形は `P-16` `milestoneGlyph`（マイルストーン形状） | — | — | 1（`:203` glyph） | `milestoneGlyph` 21（`grs-json-schema.ts:504`）・`glyph` 93（`armed-placement.ts:67`） |

### B4. 箱・輪郭・帯

| 部品 | 用語集 | 画面 ja / en | 本文 | JSON 案 | コード |
| --- | --- | --- | --- | --- | --- |
| コメントボックス `Comment Boxes`（`U-14`） | `U-14`・`N-5`・`U-15a` | ja 8（`dw:524`）/ **en「Callout」6**（`dw:525`・`:529`・`:932`）、en「Comment Box」0 | 130 | 16（`:16`・`:64`・`:219`） | `commentBox` 46 種 / 329。`callout` 0 |
| ハイライトボックス `Highlight Boxes`（`U-15`） | `U-15`・`N-6`・`U-15a`・`IC-36` | 6 / 6（`dw:535`「Highlight Box」） | 77 | 15 | `highlightBox` 33 種 / 247 |
| 注記 `Annotations`（`U-15a`） | `U-15a` | 1 / 1（`dw:4051`） | 83 | 0 | `annotation` 9 種 / 62、層は `annotationParts`（`ZO-9`） |
| 変更前の予定の輪郭（`FR-015` 表 T-339） | **行なし**（`K-84`・`IC-4` などに「変更前の予定」） | 5 / 0（`dw:62`・`:1408`） | 輪郭 14・変更前の予定 37（`ZO-15` `01-04:5196`・`GR-27`） | 0 | `baseline` 族 23 種 / 148、層は `baselineParts` |
| 実績のダミー `Actual Operation Dummy`（`U-52`） | `U-52`・`K-109` | 1 / 0（`dw:3188`） | **実績操作のダミー 0**・実績のダミー 15・ダミー 123（`GA-5`・`ZO-2`） | 0 | `dummy` 族 24 種 / 92（`item-hit-area.ts:280`） |
| フェードの台形 | **行なし**（`P-21` は日数だけ） | 0 | 3（`ZO-1` `01-04:5193`・`01-04:1404`） | 0 | `trapezoid` 0。`fade` 族 35 種 / 217 |
| タスクグループの帯 | **行なし** | 0 | **74**（`ZO-7` `01-04:5191`・`fig-erd-detail.md:398`） | 2（`:193`・`:293`） | `band` 族 40 種 / 370（`grid.bandParts`） |
| 積み順の段（1 つのタスクグループの中の横の段） | 行なし（`K-11` に「積み順の段」） | 2（`dw:1981`） | 段目 44・積み順の段 1 | 0 | `stack` 15 種 / 116 と **`lane`**（`laneHeights` `schedule-layout.ts:468`・`dependency-route.ts:111`） |

### B5. 重ね順（表 T-020、`01-04:5187`）の行と名

| 行 | 本文の名 | 用語集の行 | コードの層の名（`svg-renderer.ts:878`〜`:897`） |
| --- | --- | --- | --- |
| `ZO-7` | タスクグループの帯・グループ罫線・日付罫線 | `U-18`・`U-17`（帯は無し） | `grid.bandParts` |
| `ZO-14` | ハイライトボックスの塗り | `U-15` | `overlays.fillParts` |
| `ZO-1` | 予定バー（フェードの台形・予定の菱形・予定の矢） | `U-3` | `figures.planParts` |
| `ZO-1a` | 予実の補助線 | 無し | `figures.guideParts` |
| `ZO-2` | 実績バー・実績のダミー・実績の菱形・実績の矢・再開への破線 | `U-4`・`U-52` | `figures.actualParts` |
| `ZO-15` | 変更前の予定の輪郭 | 無し | `baselines.baselineParts` |
| `ZO-4` | 依存線 | `U-16` | `links.linkParts` |
| `ZO-13` | 期限の印 | `U-63` | `figures.deadlineParts` |
| `ZO-8` | 基準日線・2 連カーソル・ガイドカーソル・ハイライトボックスの枠・飛んだ先の印の囲み | `U-11`・`U-12`・`U-13`・`U-15` | **`overlays.linkParts`**・`ring` |
| `ZO-3` | 進捗マーカー・再開アイコン | `U-5`・`U-6` | `figures.markerParts` |
| `ZO-5` | 名称ラベル・担当と進捗の札 | `U-7`・`U-8`・`U-41` | `figures.labelParts` |
| `ZO-16` | イナズマ線 | `U-9` | `overlays.progressLineParts` |
| `ZO-9` | コメントボックス | `U-14` | `overlays.annotationParts` |
| `ZO-10` | 選択の枠・フェードの掴み点・ハイライトボックスの掴み点・線先の印・依存線の端の囲み | 無し | `endOutlineParts`・`selectionParts`・`handleParts` |
| `ZO-11` | 構えて引いている仮の依存線 | 無し | `tentativeParts` |
| `ZO-12` | 透かし | `U-20` | `watermarkSvg` |
| `ZO-6` | 範囲選択の矩形 | （`U-40` は選ぶこと） | `selectionFrameSvg(marquee, …)`（`:944`） |

SVG の部品は `data-figure` の名も持つ（`figureKey`、`svg-renderer.ts:121`）。ここでも同じ種類の物に別の名が付く: フェードの掴み点は `-fade-handle`（`schedule-task-figures.ts:655`）、ハイライトボックスの掴み点は `box-…-grab-…`（`schedule-overlays.ts:220`）、コメントボックスの線先は `comment-…-handle`（`:315`）、線は `comment-…-leader`（`:286`）、予実の補助線は `-guide`（`schedule-task-figures.ts:618`）、依存線は `dep-…`（`:880`）。

### B のほころび

1. **ラベルと札が同じ物の 2 つの名**: 用語集は `Assignee Label`・`Percent Complete Label`、`ZO-5` と `K-132` は「担当と進捗の札」、本文の札は 125。札に行が無い。コードは `percentLabel`（Complete が落ちる）。
2. **コメントボックスの英語が 2 つ**: 用語集・本文・JSON 案・コードは `Comment Box`、画面の en は「Callout」（6、`dw:525`）で、「Comment Box」は画面に 0。ハイライトボックスは画面でも「Highlight Box」。
3. **`Leader Line` に行が無い**: 本文は「コメントボックスの線」13・引き出し線 1、JSON 案は leader line、コードは `leader`。線先（A の 5）とあわせて、コメントボックスの部品の名がそろっていない。
4. **行の無い絵の部品が 7 つ**: 予実の補助線・変更前の予定の輪郭・フェードの台形・再開への破線・タスクグループの帯（本文 74）・矢じり（本文 92）・続きの印（本文 49）。どれも表 T-020 か設定の行にだけ出る。
5. **Mark と Marker と Icon が混ざる**: `Progress Marker`・`Deadline Mark`（「マーカーと呼ばない」）・`Milestone Mark`・`Resume Icon`。コードは marker・deadline・resume で、Mark も Icon も使わない。印の仲間（期限の印・線先の印・続きの印・飛んだ先の印）の英語は 1 つしか決まっていない。
6. **`U-52` の名を本文が使わない**: 用語集「実績操作のダミー」は本文 0、本文は「実績のダミー」15・「ダミー」123。
7. **`linkParts` が 2 つの層**: `links.linkParts` は依存線（`ZO-4`）、`overlays.linkParts` は基準日線・カーソル・枠（`ZO-8`）。依存線のコードの名は `link` で、`Dependency Lines` と合わない。

---

## 族の決まり・新しい名とぶつかる所

| 決まり | ぶつかる所 | 数と場所 |
| --- | --- | --- |
| `Glyph` はアイコンだけ | `milestoneGlyph`（`P-16`「マイルストーン形状」）がマイルストーンの形の種類を指す。構えの `armed.glyph` も | `glyph` 族 26 種 / 215（`grs-json-schema.ts:504`・`armed-placement.ts:67`）。アイコンのほうは `icon-glyphs.json`（`dom-screen-surface.ts:23`） |
| `Shape` は選んだ種類 | 本文の「形」が描いた物を指す —— 「描いた形」22・「日程の形」16（表 T-023d の表題 `01-04:4478`） | 形状 160（`P-10` `shapeKind` も「タスク形状」） |
| `Graphic` は描いた物 | コードは `Figure`（`taskFigure` 19・`anchorTaskFigure` 13）、`Graphic` は 0。本文 ja「図形」228・タスク図形 0 | `Figure` 族 12 種 / 102（`grs-json-schema.ts:2154`） |
| `kind` は union の札 | `shapeKind`（5 値、`P-10`）と `leaderShapeKind` は選ぶ種類。Shape と kind が 1 つの名に重なる | `shapeKind` 141（`grs-json-schema.ts:501`） |
| `Lane` は `Task Group Lane` | コードの `lane` は **1 つのタスクグループの中の積み順の段**（`laneHeights`・`packedLanesOf` `schedule-layout.ts:468`）、依存線の通り道（`dependency-route.ts:111`）、スクロールバーの溝（`frame-drags.ts:43`）。本文も「上下のレーン」1（`01-04:5080`、掴み代） | `lane` 族 13 種 / 127 |
| `Window` は Tool Window | `WindowGrabRegion`（ウィンドウの掴む所）は合う。`Drop Cue` は「ファイルがウィンドウの上に在る」のウィンドウ＝ブラウザ | — |
| `Dialog` | A・B の部品とはぶつからない | `dialog` 0 |
| guide | `Guide Cursor` と予実の補助線（`planActualGuide*`・`guideParts`）が同じ guide | — |

---

## まとめ —— 裁定がいちばん要るもの

| 族 | 問い |
| --- | --- |
| A | 掴む所の名を 1 つの木にするか: 掴み代 238 / 掴み点 72 / 掴み帯 27 / 掴み領域 10、英語は `Grab Region`・`Grab Point`・handle・strip/band・thumb |
| A | ドラッグ中・選択中だけ描く印（差し込み線・写し・飛んだ先の囲み・波紋・選択の枠・範囲選択の矩形・仮の依存線・線先の印）に行を立てるか —— `data-role` 6 つが用語集に無い |
| A | `Task Group Expander` 1 つの名で 4 つの操作子を呼ぶか、総称「操作子」（164）を立てるか |
| B | ラベルか札か（`Assignee Label` / 担当と進捗の札）、コメントボックスの英語（`Comment Box` / Callout） |
| B | 行の無い 7 つの絵の部品と、Mark / Marker / Icon / Glyph をどの族に入れるか |
| 族 | コードの `lane`（積み順の段）を `Task Group Lane` とどう分けるか |
