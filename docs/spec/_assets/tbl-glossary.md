# 用語辞書 — 確定名の全数

**UID**: DOC-TBL-GLOSSARY
**Version**: 0.1

**本書が用語の正である。** 本書と食い違う名前を他所で見たら、本書が勝つ。
本書は `01-04-requirements.md` の Chapter 1.8 から参照される。

由来は前プロジェクトの命名確定版（`previous-project-result/03-ui-naming/ui-parts-ja.md` §2-1）である。
**語は 1 つも落とさずに引き継いだ。** 一方、そこに併記されていた**旧名と改名の経緯は引き継がない** —— 旧語彙を本プロジェクトへ流入させないためである。経緯が要るときは由来の文書を読む。

記法の規則と、単独で使ってはならない曖昧な日本語は **`01-04-requirements.md` の 1.9 表記規約**が持つ。ここには置かない。

> ⚠️ **数値（既定値・範囲）は本書に無い。** 本書が持つのは**名前**である。
> 値は `tbl-settings.md`（`DOC-TBL-SETTINGS`）が持つ。**名前と値を 2 か所で管理しない。**

## 1. データの語

**Type**: SECTION

**表 T-101 — データの語**

| 行 ID | 確定名（英） | 日本語 |
| --- | --- | --- |
| N-1 | `Task` | タスク（`shapeKind` が `'milestone'` のときは「マイルストーン」と表示する）。⚠️ **真偽値の `milestone` という列は持たない** |
| N-2 | `TaskGroup` | タスクグループ |
| N-3 | `TaskGroupMember` | タスクグループメンバー |
| N-4 | `stackOrder` | 積み順。**自動で決まる値であり、人が手で指定する経路は持たない**（表 T-014 の ST-6） |
| N-4a | `Item` | **アイテム**。**当たり判定と選択の対象となるものの総称**（タスク・依存線・コメントボックス・ハイライトボックス）。全数は表 T-023c の SL-1 が持つ。⚠️ **`Task` の別名ではない** —— 外延が広いので `CN-9`（画面とデータで別名を与えない）には当たらない。**`Task` 1 つを指すときは「タスク」と書く** |

## 2. プロパティ

**Type**: SECTION

**表 T-102 — プロパティ**

| 行 ID | 確定名（英） | 日本語 |
| --- | --- | --- |
| P-1 | `name` | 名称 |
| P-2 | `notes` | 備考 |
| P-3 | `start` / `finish` | 開始日 / 終了日 |
| P-4 | `actualStart` / `actualFinish` | 実績開始日 / 実績終了日 |
| P-5 | `actualDuration` | 実績期間 |
| P-6 | `resume` | 再開予定日 |
| P-7 | `resumeValid` | 再開可否 |
| P-8 | `percentComplete` | 完了率 |
| P-9 | `deadline` | 期限 |
| P-10 | `shapeKind` | タスク形状（5 値。`'milestone'` のときだけ `milestoneGlyph` を見る） |
| P-11 | `'rectangle'` | 矩形（`===`） |
| P-12 | `'chevron'` | 矢羽根（`>===>`）。直訳ではない。例外は表 T-105 |
| P-13 | `'arrow'` | 矢印（`--->`） |
| P-14 | `'endpointSpan'` | 端点スパン（`*----*`）。「端点」と略さない |
| P-15 | `'milestone'` | マイルストーン（◇ ほか） |
| P-16 | `milestoneGlyph` | マイルストーン形状（〇 六角形 五角形 ◇ □ ☆ △ ▽） |
| P-17 | `actualPlacement` | 実績の置き方（`'inside'` = 内側 / `'below'` = 下 / `'atActualDate'` = 実績日）。`shapeKind` から導出する |
| P-18 | `strokeColor` / `fillColor` / `lineWeight` | 線色 / 塗り色 / 線の太さ |
| P-19 | `'transparent'` | 透明。`strokeColor` / `fillColor` / `TaskGroup.color` が取りうる値。`null`（選んでいない）とは別物である |
| P-20 | `nameAnchor` / `nameAlign` | 名称アンカー / 名称の揃え |
| P-21 | `fadeInDays` / `fadeOutDays` | フェードイン日数 / フェードアウト日数 |
| P-22 | `wbs_parent_uid` | WBS の親（深さは導出する） |

## 3. UI パーツ

**Type**: SECTION

**表 T-103 — UI パーツ**

| 行 ID | 確定名（英） | 日本語 |
| --- | --- | --- |
| U-1 | `Rows` | 行 |
| U-2 | `Task Bars` | タスクバー |
| U-3 | `Plan Bar` | 予定バー |
| U-4 | `Actual Bar` | 実績バー |
| U-5 | `Progress Marker` | 進捗マーカー |
| U-6 | `Resume Icon` | 再開アイコン |
| U-7 | `Name Label` | 名称ラベル |
| U-8 | `Assignee Label` | 担当ラベル |
| U-9 | `Progress Line` | イナズマ線。直訳ではない。例外は表 T-105 |
| U-10 | `Cursors` | カーソル |
| U-11 | `Today Line` | 本日線 |
| U-12 | `Dual Cursor` | デュアルカーソル |
| U-13 | `Guide Cursor` | ガイドカーソル |
| U-14 | `Comment Boxes` | コメントボックス |
| U-15 | `Highlight Boxes` | ハイライトボックス。**「囲み枠」と呼んではならない（MUST NOT）** |
| U-15a | `Annotations` | **注記**。コメントボックスとハイライトボックスをまとめて指す上位語 |
| U-16 | `Dependency Lines` | 依存線 |
| U-17 | `Date Grid Lines` | 日付罫線 |
| U-18 | `Group Grid Lines` | グループ罫線 |
| U-19 | `Time Ruler` | タイムルーラー |
| U-20 | `Watermark` | 透かし |
| U-21 | `Scrollbars` | スクロールバー |
| U-22 | `Row Title Panel` | 行見出しパネル |
| U-23 | `Row Title Tree` | 行見出しツリー |
| U-24 | `Panel Divider` | パネル境界 |
| U-25 | `Properties Panel` | プロパティパネル |
| U-26 | `Command Palette` | コマンドパレット |
| U-27 | `Schedule Title` | 文書名 |
| U-28 | `Autosave Status` | 自動保存の状態 |
| U-29 | `Hidden Group Tab` | 非表示グループタブ |
| U-30 | `Help Modal` / `AI Export Modal` | ヘルプ / AI 出力 |
| U-31 | `App Header` | （画面に出ない構造名。日本語を当てない） |
| U-32 | `Schedule Canvas` | （同上） |
| U-33 | `Canvas Overlays` | （同上） |
| U-34 | `Palette Groups` / `Palette Commands` | （同上） |
| U-35 | `Header Commands` / `Branding` | （同上） |
| U-36 | `Agent API` | **`Agent API`**（日英とも同じ語を使い、訳語を当てない） |
| U-37 | `WatermarkPassword` | **透かし解除パスワード**。**「合言葉」と呼んではならない（MUST NOT）** —— 何のための語かが伝わらない。既定値と SHA-256 は `tbl-settings.md` の表 T-207 が持つ |
| U-38 | `ArmedShape` | **構え**。パレットで選んでいて「次に引いたら作られる / 結ばれるもの」。全数（なし / タスク形状 / マイルストーン形状 / 依存線 / コメントボックス / ハイライトボックス）は表 T-023b が持つ。**「選択」と呼んではならない（MUST NOT）** —— 選択（`Selection`）は既にある対象を選ぶことであり、別の状態である |
| U-39 | `Selection` | **選択**。既にある対象を選ぶこと、およびその集合。規則は表 T-023c が持つ |
| U-40 | `Marquee` | **範囲選択**。何にも当たらない場所からドラッグして矩形で選ぶこと |
| U-41 | `Caret` | **キャレット**。キーボード操作のときに、次に置く位置を示す印。`SK-1`（構えているものをキャレット位置に置く）が前提にしている |

> **`Agent API` は 2026-08-12 に確定した呼び名である**（ユーザー判断）。**日本語でも `Agent API` と書く。**
> **「機械向けの口」「口」と呼んではならない（MUST NOT）。**
>
> **`AI API` を採らない理由**: 英語では「**AI を提供する API**」と読まれる（OpenAI API などと同型）。これは AI が叩く側の API なので向きが逆であり、**Chapter 2.4（表 T-009 の `XO-4`）「本ソフトウェアは AI 推論の実行系を持たない」と矛盾する。** `agent` は叩く側を名指しする語なので誤読が起きない。**同じ理由で再提案しないこと。**
>
> **公開する識別子は `grSchedulerAgentApi` とする —— 確定 2026-08-12（ユーザー判断）。**
> `globalThis` に載る名前なので、**他のツールが公開する同種の API と衝突しないよう製品名の接頭辞を残す。**
> 概念とインターフェースの呼び名が `Agent API`、実際に公開する識別子が `grSchedulerAgentApi` であり、
> **面が違うだけで食い違いではない**（記法は表 T-006a）。

## 4. 設定値のキー

**Type**: SECTION

`documentSettings` が持つ設定値の**名前**の正はここである。**値（既定値・下限・上限・範囲の理由）は `tbl-settings.md`（`DOC-TBL-SETTINGS`）が持つ。**
⛔ を付けたものは文書に保存しない（読む人の環境である）。名前としては本書に載せる。

**表 T-104 — 設定値のキー**

| 行 ID | 群 | 確定名（英） | 日本語 |
| --- | --- | --- | --- |
| K-1 | タイムルーラー | `pxPerDayAt1x` | 1 日の幅（`zoomX` = 1） |
| K-2 | タイムルーラー | `rulerHeight` | 目盛の帯の高さ |
| K-3 | タイムルーラー | `rulerFont` | 目盛の文字 |
| K-4 | 縦の寸法 | `basePlanHeight` | 予定の縦幅（`zoomY` = 1） |
| K-5 | 縦の寸法 | `actualOfPlan` | 実績 ÷ 予定 |
| K-6 | 縦の寸法 | `actualMin` | 実績の縦幅の下限 |
| K-7 | 縦の寸法 | `fontOfActual` | フォント ÷ 実績 |
| K-8 | 縦の寸法 | `fontMin` | 最小フォント |
| K-9 | 縦の寸法 | `thinFontScale` | 細線のフォント倍率 |
| K-10 | 縦の寸法 | `actualGap` | 予定から実績までの間隔（下に置くとき） |
| K-11 | 縦の寸法 | `stackGap` | 段の間隔 |
| K-12 | 縦の寸法 | `rowGap` | 行の間隔 |
| K-13 | 形状の縦幅 | `shapeHeightOf.rectangle` | 矩形（`===`） |
| K-14 | 形状の縦幅 | `shapeHeightOf.chevron` | 矢羽根（`>===>`） |
| K-15 | 形状の縦幅 | `shapeHeightOf.arrow` | 矢印（`--->`） |
| K-16 | 形状の縦幅 | `shapeHeightOf.endpointSpan` | 端点スパン（`*----*`） |
| K-17 | 形状の縦幅 | `shapeHeightOf.milestone` | マイルストーン（◇） |
| K-18 | 依存線 | `dependencyWidth` | 太さ |
| K-19 | 依存線 | `dependencyArrowLength` | 矢印の三角形の長さ |
| K-20 | 依存線 | `dependencyRunOfArrow` | 入口の走り ÷ 三角形 |
| K-21 | 進捗マーカー | `markerOfFont` | マーカー径 ÷ フォント |
| K-22 | 進捗マーカー | `markerMin` | マーカー径の下限 |
| K-23 | 進捗マーカー | `markerGap` | 実績の右端からの隙間 |
| K-24 | 進捗マーカー | `markerStroke` | 円の線の太さ |
| K-25 | 進捗マーカー | `resumeScaleInvalid` | 再開日未定のときの縮小率 |
| K-26 | 進捗マーカー | `resumeArmOfMarker` | 再開アイコンの腕の長さ ÷ マーカー |
| K-27 | 進捗マーカー | `resumeHeadOfMarker` | 再開アイコンの矢じり ÷ マーカー |
| K-28 | 進捗マーカー | `resumeDashOn` | 再開アイコンへ繋ぐ破線の実部 |
| K-29 | 進捗マーカー | `resumeDashOff` | 再開アイコンへ繋ぐ破線の空部 |
| K-30 | ラベル | `labelCoef` | 幅の概算係数 |
| K-31 | ラベル | `labelPad` | 形状の内側の余白 |
| K-32 | ラベル | `labelGap` | 形状の外へ出すときの隙間 |
| K-33 | ラベル | `labelBaseline` | ベースライン補正 |
| K-34 | ラベル | `labelHaloOfFont` | 縁取りの太さ ÷ フォント |
| K-35 | ラベル | `truncateUnits` | 打ち切り幅（半角換算） |
| K-36 | ラベル | `rowTitleFont` | 行名の文字 |
| K-37 | ラベル | `rowTitleIndent` | 行名の 1 段のインデント |
| K-38 | ラベル | `rowTitleTopScale` | `TaskGroup` 深さ 1 の行名の倍率 |
| K-39 | 形状の細部 | `planStroke` | 予定の輪郭線 |
| K-40 | 形状の細部 | `thinStrokeOfPlan` | 細線の太さ ÷ その形状の予定の縦幅 |
| K-41 | 形状の細部 | `thinStrokeMin` | 細線の太さの下限 |
| K-42 | 形状の細部 | `thinStrokeMax` | 細線の太さの上限 |
| K-43 | 形状の細部 | `chevronNotchOfHeight` | 矢羽根の切り欠き ÷ 高さ |
| K-44 | 形状の細部 | `chevronNotchOfWidth` | 矢羽根の切り欠き ÷ 幅 |
| K-45 | 形状の細部 | `arrowHeadOfStroke` | 矢印の矢じり ÷ 線の太さ |
| K-46 | 形状の細部 | `arrowHeadOfSpan` | 矢印の矢じり ÷ 全長（上限） |
| K-47 | 形状の細部 | `spanDotOfStroke` | 端点の点の半径 ÷ 線の太さ |
| K-48 | 形状の細部 | `starInnerOfOuter` | ☆ の内接半径 ÷ 外接半径 |
| K-49 | 形状の細部 | `minShapeWidth` | ゼロ期間でも残す最小幅 |
| K-50 | イナズマ線 | `progressLineWidth` | 太さ |
| K-51 | イナズマ線 | `progressLineOverhang` | 上下へのはみ出し |
| K-52 | LOD | `rulerTierPxPerDayMonth` | 目盛が「年」から「年 ＋ 月」に変わる px/day |
| K-53 | LOD | `rulerTierPxPerDayWeek` | 目盛が「年 ＋ 月」から「年 ＋ 月 ＋ 週」に変わる px/day |
| K-54 | LOD | `rulerTierPxPerDayDay` | 目盛が「年 ＋ 月 ＋ 週」から「年 ＋ 月 ＋ 日 ＋ 曜日」に変わる px/day |
| K-55 | LOD | `taskLevelOfDetailReadablePx` | この幅を割った深さは描かない |
| K-56 | LOD | `groupLevelOfDetailBase` | グループ LOD の初項 |
| K-57 | LOD | `groupLevelOfDetailRatio` | グループ LOD の公比 |
| K-58 | LOD | `stackSafetyCap` | 積み順の安全弁 |
| K-59 | テーマ | `themePreference` | 明暗テーマ（**ダークモード**はこの値の `'dark'` を指す通称） |
| K-60 | テーマ | `themeHue` | テーマの色相 |
| K-61 | テーマ | `themeMonochrome` | モノクロにするか |
| K-62 | ズーム | `zoomStep` ⛔ | 1 ノッチの倍率 |
| K-63 | ズーム | `zoomMin` ⛔ | 下限 |
| K-64 | ズーム | `zoomMax` ⛔ | 上限 |
| K-65 | ズーム | `canvasPadding` | キャンバスの余白 |
| K-66 | ズーム | `svgPadding` | SVG の縁の余白 |
| K-67 | 画面の状態 | `zoomX` | 横のズーム倍率 |
| K-68 | 画面の状態 | `zoomY` | 縦のズーム倍率 |
| K-69 | 画面の状態 | `scrollDate` | 表示の左端が指す日付 |
| K-70 | 画面の状態 | `scrollGroupId` | 表示の上端が指す行 |
| K-71 | 画面の状態 | `rowTitlePanelWidth` | `Row Title Panel` の幅 |
| K-72 | 画面の状態 | `propertyPanelWidth` | `Properties Panel` の幅 |
| K-73 | 表示の切り替え | `stackDirection` | 積む向き |
| K-74 | 表示の切り替え | `planActualDisplay` | 予実の表示 |
| K-75 | 表示の切り替え | `assigneeVisible` | 担当ラベル |
| K-76 | 表示の切り替え | `percentCompleteVisible` | 完了率ラベル |
| K-77 | 表示の切り替え | `dependencyVisible` | 依存線 |
| K-78 | 表示の切り替え | `progressMarkerVisible` | 進捗マーカー |
| K-79 | 表示の切り替え | `progressLineVisible` | イナズマ線 |
| K-80 | 表示の切り替え | `dualCursor` | デュアルカーソル |
| K-81 | 表示の切り替え | `guideCursorMode` | ガイドカーソル |
| K-82 | 表示の切り替え | `dateGridLinesVisible` | 日付罫線（日付ごとの縦線） |
| K-83 | 表示の切り替え | `groupGridLinesVisible` | グループ罫線（`TaskGroup` 境界の横線） |
| K-84 | 表示の切り替え | `baselineVisible` | 変更前の予定を重ねるか |
| K-85 | 表示の切り替え | `fontScale` | 文字サイズ |
| K-86 | 表示の切り替え | `importSeq` | 取込の連番 |
| K-87 | 出力 | `exportCanvas` | SVG / PNG の出力サイズ |
| K-88 | 出力 | `exportPngScale` | PNG の倍率 |
| K-91 | 予実の補助線 | `planActualGuideWeight` | 補助線の太さ |
| K-92 | 予実の補助線 | `planActualGuidePattern` | 補助線の破線の刻み |
| K-93 | 予実の補助線 | `planActualGuideColor` | 補助線の色 |
| K-94 | フェード | `fadeHandleHalfPx` | フェード掴み点の半辺 |
| K-95 | フェード | `fadeHandleStrokePx` | フェード掴み点の枠線 |
| K-96 | 保存と上限 | `autosaveIdleMs` | 自動保存の操作の切れ目 |
| K-97 | 保存と上限 | `importMaxBytes` | 取り込むファイルの上限 |
| K-98 | 保存と上限 | `importMaxItems` | 取り込む `Task` の件数の上限 |
| K-99 | 保存と上限 | `importMaxDepth` | WBS のネストの深さの上限 |
| K-100 | 画面の寸法 | `appHeaderMaxHeight` | `App Header` の高さの上限 |
| K-101 | 透かし | `watermarkOpacity` | 透かしの濃さ |
| K-89 | 表示の切り替え | `statusDateLineVisible` | 基準日の縦線 |
| K-90 | 保存しないもの（別枠） | `language` ⛔ | 表示言語（`ja` / `en`）。**文書に保存せず `localStorage` に置く**（表 T-206 の S-99）。**表 T-202 に行は無いので `FR-049` の切り替え対象ではない** |

**キーに関する規約:**

- **`palette` を設定値の名前に使わないこと（MUST NOT）。** `Command Palette` / `Palette Groups` / `Palette Commands` が既にあり、同じ語が別のものを指すことになる。
- **スクロール位置を px で持たないこと（MUST NOT）。** ズームや画面幅が変わると別の場所を指す。日付（`scrollDate`）と行の識別子（`scrollGroupId`）で持つ。名前も `scrollX` / `scrollY` にしない。
- **時間軸のしきい値を 1 つの配列にまとめないこと（MUST NOT）。** 隣どうしが互いを縛る（Month ≦ Week ≦ Day）ため、どの要素にどの範囲が掛かるかを書く場所が無くなる。目盛は 4 段階なので、しきい値はその境目の数だけ 3 本になる。
- **基準日は設定値ではない。** `Project.status_date` として文書のデータが持つ。

## 5. 直訳しない語

**Type**: SECTION

日本語ラベルは英語の確定名の直訳とする。意訳・別語・語順の反転を禁止する（MUST NOT）。
**例外は表 T-105 の 2 件だけである。増やすときは必ず本表に追記すること（MUST）。**
「なんとなく違う」を許すと規則が崩れる。

**表 T-105 — 直訳しない語（例外）**

| 行 ID | 英語 | 日本語 | 例外にする理由 |
| --- | --- | --- | --- |
| X-1 | `Progress Line` | イナズマ線 | 日本の日程管理で定着した語である。「進捗線」に変えると日本の利用者に通じなくなり、目標 `GL-006`（マニュアルを読まずに使える）に反する |
| X-2 | `chevron` | 矢羽根 | 図形名としての直訳は「山形」だが、要望の入力が「矢羽根」を使っており、日程表の文脈で意味が通る。英語側は世界共通の図形名 `chevron` を使う（コードは英語で書くため） |
