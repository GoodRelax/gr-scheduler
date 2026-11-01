# 用語集に未登録の 5 つの画面部品 — 既に使われている語の調べ

調べた日は 2026-10-26。読むだけで、仕様書もコードも変えていない。用語集の 表 T-103（U-1..U-68）に、下の 5 つを指す行は無い。
数え方は、正規表現の出現数（行数ではない）。範囲の略号は次のとおり。

| 略号 | 範囲 |
| --- | --- |
| 文 | `docs/spec/*.md`（地の文） |
| 表 | `docs/spec/_assets/*.md` |
| 原 | `docs/spec/_source/*.json`（生成物の `*.schema.json` と `display-words.json` は除く） |
| 語 | `src/adapter/screen-renderer/display-words.json`（画面に出る語） |
| src | `src/**/*.ts` |
| 案 | `doc-shape-map.tsv` と `commands-map.tsv`（CR-851 の案） |

例の場所は `ファイル:行`。`docs/spec/` と `studies/76-grs-json-beta-shape/` の接頭辞は略した。分類（意味の振り分け）は目視で、数えたのは語の出現だけ。

## 1. コメントボックスから対象へ引く線と、その線の端点

| 語 | 範囲別の数（計） | 例 |
| --- | --- | --- |
| 線先 | 文54/表30/原28 (112) | 01-04-requirements.md:4519（本体・引出し線・線先を持つ）、_assets/fig-erd-detail.md:278（ET-13）、_assets/tbl-settings.md:408（S-292） |
| 引出し線 | 文18/表11/原11 (40) | 01-04-requirements.md:6634、_assets/tbl-settings.md:407（S-291） |
| 引き出し線（「き」あり） | 表1/原1 (2) | _assets/fig-erd-detail.md:453（AT-111）、_source/erd.json:2781 |
| 指す先 | 文12/案3 (15)。一般の語としても使う | 01-04-requirements.md:857、:6634（付箋の縁から指す先） |
| 留め先 | 表3/原3 (6) | _assets/tbl-document-commands.md:77（`anchor` の訳） |
| アンカー | 文14/表1/原1 (16)。文の 14 は依存線の出口と入口の意味 | _assets/tbl-settings.md:403（「アンカー（線先）」）、01-04-requirements.md:725（依存線） |
| 先端 | 文6/表2/原2 (10)。すべて矢じり・矢羽根の先で、コメントには無関係 | 01-04-requirements.md:1408、_assets/tbl-published-entries.md:24 |
| leader line | 原3/src1/案7 (11) | _source/document-commands.json:2181、src/entity/layout-engine/schedule-geometry/comment-box.ts:1、doc-shape-map.tsv:221 |
| leader（語単独） | 原3/src16/案8 (27) | src/entity/layout-engine/item-hit-area/item-hit-area.ts:54（`kind: 'leader'`）、:1123 |
| leaderShapeKind | 文2/表4/原3/src12/案6 (27)。案では CM-49 で廃止の方向 | 01-04-requirements.md:6643、commands-map.tsv:75 |
| tip | 原1/src63/案21 (85)。src の内訳は線先 19、ツールチップ約 29、矢じり 14、他 1 | _source/erd.json:2742（ET-13 の英語）、src/use-case/edit-document/edit-annotation.ts:265、doc-shape-map.tsv:241 |
| anchor 系の識別子（`anchorDate` `anchorTaskUid` `CommentBoxAnchor` `commentAnchor*` ほか） | 表・原・src・案の計 215（src のみ） | src/entity/layout-engine/schedule-geometry/comment-box.ts:43、src/entity/layout-engine/item-hit-area/item-hit-area.ts:53（`kind: 'anchor'`） |
| endTip | src5。シェブロン（矢羽根）の終了側の切り込み | src/entity/layout-engine/schedule-geometry/task-figures.ts:82 |
| pointer / ポインタ | pointer: src233。ポインタ: 文226/表37/原35 | _assets/tbl-glossary.md:123（U-42 マウスが指す点） |

- 画面に出る語: 無い。`display-words.json` に 引出し線・線先・leader・tip・anchor は 0 件。コメントボックスは `ja` コメントボックス / `en` Callout（AR-5、アイコン IC-35。IC-119 は Callouts）。
- 仕様の地の文は「本体・引出し線・線先」の 3 部（GR-14）。線先は利用者の語（JDG-249「引き出し線と、線先もつかめる」。S-291 は 3px、S-292 は 6px）。
- 案の英語は leader line（線）と tip（端点）。_source/erd.json の ET-13 の英語も tip。
- 候補（英語/日本語）: `Leader Line` / 引出し線、`Leader Tip` / 線先。
- 衝突: ① tip だけだと、コードの注釈で Tooltip（`EZ-6 tip`、tooltips-drawing.ts に 25 件）と矢じり（dependency-route.ts に 9 件）の意味でも使う。② anchor は 4 つの意味で使う（線先 215、スクロール位置 `ScrollAnchor` 34、`TooltipAnchor` 12、依存線・ラベル 69）。③ 「端点」は表 T-006b の A-13 で、バーの端の掴み点と決まっていて使えない。④ 「引出し線」(40) と「引き出し線」(2) の綴りが揺れる。⑤ 「アンカー」は依存線の出口と入口（表 T-018）にも使う。

## 2. 日程表（タスクグループ領域）の、いま見えている部分

| 語 | 範囲別の数（計） | 例 |
| --- | --- | --- |
| 見えている範囲 | 文10/表2/原2/語1 (15) | 01-04-requirements.md:2102（RN-3、`groupView`）、_assets/tbl-published-entries.md:51、display-words.json:6190 |
| 表示の左端 / 表示の上端 | 左11・上12 | _assets/tbl-glossary.md:262-263（K-69、K-70）、display-words.json:2611、:2629 |
| 日程表の左端 / 日程表の上端 | 左2・上1 | 01-04-requirements.md:2110、display-words.json:6358、:6372 |
| スクロール位置 | 文3/表1 (4) | _assets/tbl-glossary.md:325（`scrollX`/`scrollY` にしない）、01-04-requirements.md:6408 |
| scroll position | 原3/案4 (7) | _source/document-commands.json:2896、commands-map.tsv:89 |
| scrollDate / scrollTaskGroupId / scrollDateFraction | 138 / 140 / 101（src が 103 / 108 / 77） | _assets/tbl-document-commands.md:103（CM-66 `setScrollPosition`） |
| leftEdgeDay / topEdgeTaskGroup | 案15 / 案14（案だけ） | doc-shape-map.tsv:26、:30 |
| the view（英語の文中） | 原1/語1/src24/案5 (31) | display-words.json:5103（Pan the view）、doc-shape-map.tsv:26、:35、settings.json:2157 |
| 表示範囲 | 文1 (1) | 01-04-requirements.md:9101（画面の外の意味） |
| viewport / visible range / 画面の範囲 / scroll position（日）/ 可視範囲 | 0 | — |
| ScreenView（描き手へ渡す値の型） | 文2/表7/原7/src128 (144) | src/adapter/screen-renderer/screen-renderer.ts:692 |

- 画面に出る語: 設定のグループ名に `ja` 見えている範囲 / `en` View（`readOnlySettings[3]`、`groupView`）。値の行は `ja` 日程表の左端の日時 / `en` Left Edge Date-Time、`ja` 日程表の上端のタスクグループ / `en` Top Edge Task Group。設定の行は `ja` 表示の左端が指す日付 / `en` Left Edge Date（K-69）、`ja` 表示の上端が指すタスクグループ / `en` Top Task Group（K-70）。操作は `ja` 画面をパンする / `en` Pan the view（MK-7）。
- 候補（英語/日本語）: `View` / 見えている範囲。画面とグループ名が既に使っている対。
- 衝突: ① `view` は src で 550 件の一般語。② `TableView` 130（表の見え方）、`viewTimeZone` 68（表示タイムゾーン）、`ScreenView` 144（描き手の入力）と別の意味。③ 「表示」は表示／非表示の意味でも多用。

## 3. 描画の横方向の時間の軸

| 語 | 範囲別の数（計） | 例 |
| --- | --- | --- |
| 時間軸 | 文27/表8/原5/語3 (43) | 01-04-requirements.md:267、:280（L-1「時間軸 LOD」）、display-words.json:143 |
| time axis | 原3/語3/src1/案2 (9) | display-words.json:144、src/entity/layout-engine/schedule-layout/time-axis.ts:1、doc-shape-map.tsv:23 |
| timeAxis（`timeAxisOf` `TimeAxis` 型） | 表1/原1/src20 (22) | _assets/tbl-published-entries.md:23、src/adapter/screen-renderer/task-group-panel.ts:21 |
| Time Ruler / タイムルーラー | Time Ruler: 文9/表2/原1/案3。タイムルーラー: 文8/表12/原5 | _assets/tbl-glossary.md:102（U-19）、01-04-requirements.md:824 |
| 目盛 | 文78/表44/原36/語11 (169) | 01-04-requirements.md:392、_assets/tbl-glossary.md:189（K-2「目盛の帯の高さ」） |
| ruler（語単独） / rulerHeightPx | ruler 43（src22）/ rulerHeightPx 25 | display-words.json:1855（Ruler Height） |
| zoomX | 文10/表13/原11/語2/src99/案11 (146) | _assets/tbl-document-commands.md:102（CM-65） |
| dayWidthPx | 案7（案だけ。zoomX の置き換え案） | doc-shape-map.tsv:23 |
| dateAtX / xOnTimeAxis | 表2/原2/src23 (27) | src/adapter/input-command-translator/dual-cursor-input.ts:17 |
| 横軸 / x axis / 日付軸 / 時間方向 | 横軸0・日付軸0・時間方向0。x axis 系（`axisX` 等）src13 | — |
| 縦軸（対の語） | 文31/表21/原19/語3 (74) | 01-04-requirements.md:2474、display-words.json:165 |

- 画面に出る語: `ja` 横に縮小・横に拡大 / `en` Zoom Out Horizontally・Zoom In Horizontally（IC-12、IC-13）。ヒントは `ja` 時間軸（横）を縮小・拡大 / `en` Zoom the time axis (horizontal) out・in。割り当ては `ja` 時間軸（横）だけをズームする / `en` Zoom the time axis only。縦は `ja` 縦軸を縮小 / `en` Zoom the vertical axis (vertical) out。
- 候補（英語/日本語）: `Time Axis` / 時間軸。ヒント・L-1・コード（`time-axis.ts`）が既に揃っている。
- 衝突: `Time Ruler`（U-19）は軸ではなく、上端の目盛の帯である（U-50 も「`Time Ruler` の帯」）。「時間軸」は L-1 では時間軸 LOD（`Time Ruler` の粒度）の意味。「目盛」は帯の中の目盛や目盛ラベルも指すので、軸と取り違えやすい。

## 4. タスク 1 つの描かれた形（バーまたはマイルストーンの印）

| 語 | 範囲別の数（計） | 例 |
| --- | --- | --- |
| 図形 | 文171/表57/原34/語4 (266)。意味は広い | _assets/fig-erd-detail.md:460（「タスクの図形 —— 予定バー・実績バー・マイルストーンの図形」）、display-words.json:110 |
| タスクの図形 | 文3/表2/原2 (7) | 01-04-requirements.md:4414、05-07-design.md:1371 |
| タスクの形 | 文1/表4/原4/語1 (10) | 01-04-requirements.md:1350、display-words.json:4739 |
| 形状 | 文112/表48/原29/語5 (194) | 01-04-requirements.md:274、_assets/tbl-document-commands.md:53 |
| タスク形状 | 文6/表2/原1/語1 (10) | 01-04-requirements.md:632、display-words.json:5221 |
| マイルストーン形状 | 文3/表2/原1/語3 (9) | 01-04-requirements.md:395（A-5）、display-words.json:759 |
| taskFigure / TaskFigure | 文1/表8/原6/src53/案8 (76) | _source/document-commands.json:113、src/entity/layout-engine/schedule-geometry/comment-box.ts:43、doc-shape-map.tsv:241 |
| task figure（英語の文中） | 案2 (2) | doc-shape-map.tsv:24 |
| shapeKind | 文10/表49/原22/src232/案24 (337) | 01-04-requirements.md:256、_assets/fig-erd-detail.md:442（AT-100） |
| TaskVisual | 文17/表36/原24/src173/案61 (311) | _assets/fig-erd-detail.md:150、:276（ET-11 タスクの見せ方） |
| Task Bars / タスクバー | Task Bars: 文2/表1。タスクバー: 文5/表1 | _assets/tbl-glossary.md:84（U-2）、01-04-requirements.md:404（A-14） |
| milestoneGlyph / diamond | milestoneGlyph 63 / diamond 27 | _assets/fig-erd-detail.md:443（AT-101） |
| task-figures.ts（ファイル名） | 文4/src7 | 05-07-design.md:343、src/adapter/svg-renderer/svg-renderer.ts:45 |

- 画面に出る語: 構え（パレット）の `ja` タスク形状 / `en` Task Shape（AR-2）と `ja` マイルストーン形状 / `en` Milestone Shape（AR-3）。バーは `ja` 予定バー・実績バー / `en` Plan Bar・Actual Bar。構えている道具は `ja` 構えている図形 / `en` Current Tool（IC-54）。
- コード側は figure が 1 組の描かれたものを指す。`taskFigure` は `plannedBar` | `actualBar` | `milestone` の 3 値（AT-165）。形の種類は `shapeKind` の 5 値（AT-100）。
- 候補（英語/日本語）: `Task Figure` / タスクの図形。種類（`shapeKind`）は `Task Shape` / タスク形状のまま残し、使い分ける。
- 衝突: ① `Task Shape`（画面に出る）は種類の語で、描かれたものではない。② 表 T-006b の A-14「形状の 1 値は矩形であって『バー』ではない」。③ 「図」は図 F-nnn（挿絵）や行 ID 接頭辞 NF（No Figure）にも使う。④ 一般の `figure` は src で 102 件、`figureKey` は描く物すべての識別（48 件）。⑤ 「マーカー」は A-5 で進捗の印に限る。

## 5. 日程の全体をウィンドウに収める命令

| 語 | 範囲別の数（計） | 例 |
| --- | --- | --- |
| 全体表示（「時の期間」を除く） | 文40/表14/原14/語2 (70) | 01-04-requirements.md:1104、:989、_assets/tbl-document-commands.md:108 |
| 全体表示時の期間 | 文19/表12/原10/語4 (45) | 01-04-requirements.md:989、display-words.json:2933 |
| 全体を収める | 文10/語1 (11) | 01-04-requirements.md:3026（FR-055、SK-18、IC-10）、display-words.json:95 |
| （全体を）1 画面に収める | 文7/表2/原1 (10) | _assets/tbl-glossary.md:421（表 T-109 の IC-10 の行）、01-04-requirements.md:1088 |
| Zoom to Fit | 語1/案2 (3) | display-words.json:96、commands-map.tsv:105 |
| fit to screen（大小無視） | 案3 (3) | doc-shape-map.tsv:23 |
| fit span / Fit Span | 表1/原5/語4/src1/案9 (20) | display-words.json:2934、_source/document-commands.json:3165 |
| fitSpan 系の識別子（`fitSpanStart` `isFitSpanFixed` ほか） | 233（src145、案46） | _assets/tbl-document-commands.md:112（CM-88 `setFitSpan`） |
| fitScheduleToScreen | 表1/原1/src9/案2 (13) | _source/document-commands.json:2992（CM-71）、commands-map.tsv:89 |
| fitScheduleToScreenOnPage | 表2/原2/src9/案4 (17) | _source/document-commands.json:3038（CM-102）、src/adapter/agent-api-endpoint/agent-api-members.ts:790 |
| fitToScreen / fitPressed | fitToScreen: src2。fitPressed: src7 | src/adapter/input-command-translator/input-command-translator.ts:779（IC-10） |
| 窓（ウィンドウ）に収める | 0（ウィンドウは「画面」と言い換えて使っている） | — |

- 画面に出る語: IC-10 は `ja` 全体を収める / `en` Zoom to Fit、ヒントは `ja` 日程の全体を表示 / `en` Show the whole schedule。期間の設定は `ja` 全体表示時の期間 / `en` Fit Span（K-141）、`ja` 全体表示時の期間を固定する / `en` Fix the fit span（K-142）、`ja` 全体表示時の期間に設定 / `en` Use as Fit Span、`ja` 現在表示中の期間 / `en` Shown Now。
- 規則は FR-055（表 T-036 の SK-18、表 T-109 の IC-10、表 T-367 の FX）。コマンド名は `fitScheduleToScreen`（呼ぶ側が数えた値を置く）と `fitScheduleToScreenOnPage`（ページが数える）で、名は E-17（JDG-3292、JDG-3293）で決まっている。
- 候補（英語/日本語）: 命令は `Zoom to Fit` / 全体を収める、収める期間は `Fit Span` / 全体表示時の期間（どちらも画面に出ている語）。案の「fitting the schedule to the window」は仕様のどこにも無く、「画面（screen）」が使われている。
- 衝突: ① 「全体表示」(70) は「全画面表示」`Full Screen`（IC-11）と字が近い。② 「全体表示」は命令の名と、その結果の状態の両方を指す。③ `Fit` は行 ID 接頭辞 CF（Color Fit）にも使う。
