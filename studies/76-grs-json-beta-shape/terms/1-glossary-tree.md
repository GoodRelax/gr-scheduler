# 用語集を木にする — 第 1 段（用語集だけを読んで）

元にしたのは `docs/spec/_assets/tbl-glossary.md` だけである（仕様の本文もコードも読んでいない）。
行の全数（382 行）と親子は `1-glossary-terms.tsv` にある。

- 書き方: `English (行 ID) — 日本語`。用語集が書いていない親子は「（推）」を付けた。
- `( )` で囲んだ名前（例 `(文書)`）は、**用語集に行が無い**のに親として要るものである。

| 表 | 中身 | 行数 | 推した親子 |
| --- | --- | ---: | ---: |
| T-101 | データの語 `N-*` | 15 | 9 |
| T-102 | プロパティ `P-*` | 22 | 15 |
| T-103 | UI パーツ `U-*` | 66 | 38 |
| T-104 | 設定値のキー `K-*` | 132 | 26 |
| T-109 | アイコン `IC-*` | 138 | 0 |
| T-105 | 直訳しない語 `X-*` | 5 | 0 |
| T-106 | 価値のことば `VK-*` | 4 | 0 |
| 計 |  | **382** | **88** |

推した 88 のうち T-104 の 26 は、群の名が UI パーツの日本語と同じだから結んだもの（例 群「依存線」→ `U-16`）。

## T-101 データの語

部分の木。根の「文書」は用語集に行が無い。

```
(文書) ※行なし
├─ Project (N-8) — プロジェクト            ← 文書が表す 1 件
├─ Calendar (N-9) — 暦（推）
├─ Resource (N-10) — 担当（推）
├─ Task (N-1) — タスク（推）
│  ├─ TaskVisual (N-13) — タスクの見せ方（推）
│  └─ TaskOrigin (N-14) — 取り込み元の記録（推）
├─ Assignment (N-11) — 割当（推）           ← Resource と Task を結ぶ
├─ Dependency (N-12) — 依存（推）
├─ TaskGroup (N-2) — タスクグループ（推）
│  ├─ TaskGroupMember (N-3) — タスクグループメンバー（推）
│  └─ treeState (N-26) — タスクグループの木の状態
├─ CommentBox / commentBoxes (N-5) — コメントボックス
├─ HighlightBox / highlightBoxes (N-6) — ハイライトボックス
└─ carry / carryElements (N-7) — そのまま持ち回る入れ物（推）
```

種類の木。`Item` は「当たり判定と選択の対象の総称」で、`Task` より外延が広いと書かれている。

```
Item (N-4a) — アイテム
├─ Task (N-1) — タスク
├─ CommentBox (N-5)（推）
├─ HighlightBox (N-6)（推）
└─ Dependency (N-12)（推）       ※全数は T-023c の SL-1 にあり、用語集には無い
```

## T-102 プロパティ

持ち主を書いている行は 22 行のうち 4 行だけ（`P-9`・`P-10`・`P-19`・`P-23`）。残りは推した。

```
Task (N-1)
├─ name (P-1) — 名称（推）            ├─ notes (P-2) — 備考（推）
├─ start / finish (P-3)（推）          ├─ actualStart / stop / actualFinish (P-4)（推）
├─ actualDuration (P-5)（推）          ├─ resume (P-6)・resumeValid (P-7)（推）
├─ percentComplete (P-8)（推）         ├─ deadline (P-9) — 期限   ← U-63 が「Task の deadline」
├─ fadeInDays / fadeOutDays (P-21)（推）
└─ parentTaskUid (P-22) — 親タスク（推）
TaskVisual (N-13)
├─ shapeKind (P-10) — タスク形状（5 値）
│  ├─ 'rectangle' (P-11)（推）  'chevron' (P-12)（推）  'arrow' (P-13)（推）  'endpointSpan' (P-14)（推）
│  ├─ 'milestone' (P-15) — マイルストーン
│  ├─ milestoneGlyph (P-16) — 'milestone' のときだけ見る
│  └─ actualPlacement (P-17) — shapeKind から導出
└─ strokeColor / fillColor / strokeWidthPx (P-18)（推）
   └─ 'transparent' (P-19) — 透明（TaskGroup.color の値でもある）
Dependency (N-12)
└─ linkType (P-23) — 依存の種別
```

## T-103 UI パーツ

### 部分の木（画面のどこにあるか）

```
GoodRelax Scheduler (U-45)（推）
└─ (ウィンドウ) ※行なし
   ├─ App Header (U-31) — ヘッダー
   │  ├─ Branding (U-35)                       ← 左端の製品の略称
   │  ├─ Header Commands (U-35)（推）
   │  ├─ Document Title (U-27) — 文書名（推）
   │  ├─ Opened File Name (U-58) — 開いているファイル名（推）
   │  └─ File Saved At (U-59) — ファイル保存時刻   ← ファイルの状態の下段
   ├─ Schedule Filter Bar (U-67) — スケジュールフィルタの帯   ← 出ている間は Canvas はその下から
   └─ Schedule Canvas (U-32)（構造名）
      ├─ Time Ruler (U-19) — タイムルーラー
      ├─ Task Group Panel (U-22)（推）
      │  └─ Task Group Title Tree (U-23) — パネルの中身
      │     ├─ Task Group Expander (U-47)（推）
      │     └─ Task Group Pin (U-48)（推）
      ├─ Panel Divider (U-24) — パネル境界（推）
      ├─ Properties Panel (U-25)（推）
      ├─ Task Group Area (U-50)（構造名）       ← Canvas から Time Ruler と余白を除く
      │  ├─ Task Groups (U-1)
      │  │  ├─ Pinned Task Group (U-46)（推・種類）
      │  │  └─ Task Bars (U-2)（推）
      │  │     ├─ Progress Marker (U-5)（推）
      │  │     │  └─ Resume Icon (U-6)（推）
      │  │     └─ Name Label (U-7)・Assignee Label (U-8)・Percent Complete Label (U-41)（推）
      │  ├─ Annotations (U-15a) — 注記（推）
      │  ├─ Deadline Mark (U-63) — 期限の印（推）
      │  └─ Progress Line (U-9)・Status Line (U-11)・Dependency Lines (U-16)
      │     ・Date Grid Lines (U-17)・Group Grid Lines (U-18)（推）
      ├─ Cursors (U-10)（推）
      ├─ Watermark (U-20)・Scrollbars (U-21)（推）
      ├─ Command Palette (U-26)（推）
      │  └─ Palette Groups / Palette Commands (U-34)（推）
      ├─ Canvas Overlays (U-33)（推・説明なし）
      ├─ Notification Area (U-57) — 通知が立つ場所（推）
      └─ Drop Cue (U-68) — ドロップの案内       ← Canvas を薄く塗って囲む面
```

### 種類の木

```
Task Bars (U-2) — タスクバー（総称）
├─ Plan Bar (U-3) — 予定バー
└─ Actual Bar (U-4) — 実績バー
   └─ Actual Operation Dummy (U-52)（推）
Annotations (U-15a) — 注記
├─ Comment Boxes (U-14)
└─ Highlight Boxes (U-15)
Cursors (U-10) — カーソル
├─ Dual Cursor (U-12)（推）
└─ Guide Cursor (U-13)（推）
(面) ※行なし（設定の S-99g が持つ）
├─ Export Chooser (U-54) ⇄ Open Chooser (U-56)（対）
├─ Confirmation (U-55)・Watermark Unlock (U-60)・Difference Review (U-61)
└─ Import Report (U-62)・Holiday Settings (U-65)・Drop Cue (U-68)
(ウィンドウ 表 T-335) ※行なし                   ← IC-52 が並べる
├─ Help Modal (U-30) — ヘルプ
├─ Resource List (U-49)・Search Panel (U-64)・Delay Diagnostics Report (U-66)
面でもウィンドウでもない、と書かれたもの
└─ Notification Area (U-57)・Tooltip (U-53)・Schedule Filter Bar (U-67)
(操作の状態) ※行なし（推）
├─ Selection (U-39) — 選択
│  └─ Marquee (U-40) — 範囲選択（推）
├─ ArmedShape (U-38) — 構え                    ← Selection とは別
├─ Pointer (U-42)
└─ Grab Region / Grab Point (U-43)
画面の部品でないもの: Agent API (U-36)・WatermarkUnlockPassword (U-37)・ScreenState (U-51)
```

## T-104 設定値のキー（132 行・26 群）

群は行の「群」の欄そのまま。★は群の名が UI パーツの日本語と同じもの。

| 群 | 数 | 例 3 つ |
| --- | ---: | --- |
| 表示の切り替え | 21 | `stackDirection` `isPlanVisible` `isActualVisible` |
| ラベル | 13 | `labelCoef` `labelPad` `labelGap` |
| 画面の状態 | 13 | `zoomX` `zoomY` `scrollDate` |
| 形状の細部 | 10 | `planStroke` `chevronNotchOfHeight` `chevronNotchOfWidth` |
| 縦の寸法 | 9 | `basePlanHeight` `actualOfPlan` `actualMin` |
| ★進捗マーカー (U-5) | 9 | `markerSize` `markerStroke` `resumeScaleInvalid` |
| ★タイムルーラー (U-19) | 6 | `pxPerDayAt1x` `rulerHeightPx` `rulerFontSizePx` |
| ★依存線 (U-16) | 6 | `dependencyWidth` `dependencyArrowLength` `dependencyLeadOut` |
| LOD | 6 | `rulerTierPxPerDayMonth` `rulerTierPxPerDayWeek` `rulerTierPxPerDayDay` |
| 形状の縦幅 | 5 | `shapeHeightOf.rectangle` `shapeHeightOf.chevron` `shapeHeightOf.arrow` |
| 保存と上限 | 5 | `importMaxBytes` `importMaxItems` `importMaxDepth` |
| ズーム | 4 | `zoomStep` `zoomMin` `zoomMax` |
| テーマ / 予実の補助線 / 予実 | 3 ずつ | `themeHue` / `planActualGuideColor` / `dummyOpacity` |
| ★イナズマ線 (U-9)・★注記 (U-15a)・出力・フェード・画面の寸法 | 2 ずつ | `progressLineWidth` `commentBoxPad` `exportCanvas` |
| ★透かし (U-20)・構造の上限・文字サイズ・遅延診断・保存しないもの・保存しないもの（別枠） | 1 ずつ | `watermarkOpacity` `maxGroupDepth` `helpLanguage` |

UI パーツの行と結べた群は 6 群 26 キー。残り 20 群 106 キーは、どの部品の値かを群の名からは引けない。
文書に保存しない（⛔）キーは 9 個で、テーマ・ズーム・画面の状態・表示の切り替え・保存しないもの 2 群の 6 群に散っている。

## T-109 アイコン（138 行・面ごと）

| 面（T-103 の名） | 数 | 例 3 つ |
| --- | ---: | --- |
| `Command Palette` (U-26) | 48 | `IC-23` 矩形を構える / `IC-39` イナズマ線の表示 / `IC-44` 基準日を置く |
| `App Header` (U-31) | 27 | `IC-1` 文書を開く / `IC-5` 取り消す / `IC-20` Agent API |
| `Task Group Panel` (U-22) | 12 | `IC-58` 配下をすべて展開 / `IC-60` ピン止め / `IC-82` 削除 |
| `Delay Diagnostics Report` (U-66) | 12 | `IC-168` やり直す / `IC-140` .md に書き出す / `IC-157` 上書きして発行 |
| 2 つ以上の面に置くもの | 12 | `IC-52` 閉じる（8 面）/ `IC-129` 最小化 / `IC-123` 昇順 |
| `Holiday Settings` (U-65) | 9 | `IC-133` 曜日の稼働 / `IC-135` 例外日を加える / `IC-138` 当てる |
| `Resource List` (U-49) | 6 | `IC-63` すべて選択 / `IC-65` 参照されない担当 / `IC-66` 消す |
| `Open Chooser` (U-56)・`Difference Review` (U-61) | 3 ずつ | `IC-71` 置き換える / `IC-72` 合流 / `IC-95` 開いた値で取り込む |
| `Help Modal`・`Search Panel`・`Properties Panel` | 2 ずつ | `IC-128` ヘルプの言語 / `IC-118` タスクの表 / `IC-162` タイムシフト |

面の名はすべて T-103 にあった（名の無い面は 0）。
自分のアイコンを持たない面: `Export Chooser`（`IC-52` の閉じるだけ）・`Confirmation`・`Watermark Unlock`・`Import Report`・`Drop Cue`。

## T-105 直訳しない語（5 行）

`Progress Line`→イナズマ線（X-1）、`chevron`→矢羽根（X-2）、`ArmedShape`→構え（X-3）、`Marquee`→範囲選択（X-4）、`Status Line`→基準日線（X-5）。
5 行とも、元の行（`U-9`・`P-12`・`U-38`・`U-40`・`U-11`）が「例外は表 T-105」と書き返しており、食い違いは無い。

## T-106 価値のことば（4 行）

ぬるサク（VK-1）・すぐわか（VK-2）・ペライチ（VK-3）・遅延診断（VK-4）。どれも目標 `GL-*` を指す語で、木は持たない。

## 用語集の中のほころび

| 種類 | 数 |
| --- | ---: |
| A. 同じものを 2 つの名で呼ぶ | 8 |
| B. 1 つの名で 2 つ以上のものを呼ぶ（うち 4 は用語集自身が注意書きで抑えている） | 10 |
| C. 用語集に行が無い語が説明に出る | 22 語 |
| C'. 名で出るのに T-102 に行が無いプロパティ | 6 |
| D. 単数・複数・大文字・接尾辞の揺れ | 7 |
| E. 親の領域が書かれていない UI パーツ | 29 / 66 |
| F. 直訳でないのに T-105 に無い候補 | 13 |
| G. 「画面に出ない構造名」の行（うち説明が（同上）だけ 3） | 6 |
| H. 日本語の短い名が無く、説明文だけの UI パーツ | 5 |

C の 22 語: 文書・面・ウィンドウ／窓・日程表・変更前の予定・基準日・親タスク／子タスク・スケジュールフィルタ・入口・通知（`Notice`）・合流・ラグ・修正案／修正の記録・例外日／稼働日／時間帯・掴み帯・札・積み順／段・LOD・タイトルバー・タイムシフト・GRS リセット・下書き。
C' の 6: `Task.milestone`（N-1）・`Project.statusDate`（U-11）・`TaskGroup.color`（P-19）・`cornerRadiusPx`（4 章前文）・`Project/Title`（U-27）・依存のラグ（K-104・IC-81）。
F の 13: `Resource`→担当（N-10）・`TaskOrigin`→取り込み元の記録（N-14）・`Document Title`→文書名（U-27）・`Help Modal`→ヘルプ（U-30）・`App Header`→ヘッダー（U-31）・`Task Group Expander`→折りたたみの操作子（U-47）・`Resource List`→担当リスト（U-49）・`stop`→実績最終日（P-4）・`resume`→再開予定日（P-6）・`shapeKind`→タスク形状（P-10）・`milestoneGlyph`→マイルストーン形状（P-16）・`parentTaskUid`→親タスク（P-22）・`linkType`→依存の種別（P-23）。
H の 5: `U-54`・`U-55`・`U-56`・`U-57`・`U-62`。

### 大事な 15 件

1. **C「文書」に行が無い。** 23 行が使い、`N-5`・`N-6` は「文書が持つ配列」、`N-8` は「文書が表す 1 件」と書く。データの木の根が名無しである。
2. **B「面」が 2 つの意味。** T-109 の列「面」は `App Header`・`Command Palette`・`Search Panel` も入れるが、`U-49`・`U-57`・`U-64`・`U-66`・`U-67` は「面ではない」と書く。面そのものの行は無い（設定の `S-99g`）。
3. **A 窓／ウィンドウ。** `U-49` は「浮くウィンドウ」、`U-66` は「浮く窓」、`IC-52` は 1 文に両方。ウィンドウ（T-335）という種類の行も無く、ウィンドウである `U-30` の名は `Help Modal`。
4. **C 変更前の予定。** `U-53`・`K-84`・`X-5`・`IC-4`・`IC-73` が使い、キーは `isBaselineVisible`。`X-5` は「基準線」をこの訳語に予約したと書くのに、本体の行が無い。
5. **C' 基準日 `Project.statusDate`。** `U-11`・`IC-44`・4 章の規約が名指すが、T-102 に無い。`Task.milestone`・`TaskGroup.color` も同じ。
6. **T-102 の持ち主がほぼ書かれていない。** 22 行のうち持ち主を書くのは 4 行（`P-9`・`P-10`・`P-19`・`P-23`）。`name`・`notes` が `Task` だけのものか読めない。
7. **B 矢印。** 図形の `'arrow'`（`P-13`・`K-15`・`IC-25`）、依存線の先の三角形（`K-19`・`K-128`）、子から親への矢印（`IC-141`）が同じ語。
8. **B Canvas。** `Schedule Canvas`（範囲）と `data-role` の要素（`U-32` 自身が別と書く）、書き出す絵の `exportCanvas`・`exportCanvasHeightCap`（`K-87`・`K-119`）、`canvasPadding`「キャンバスの余白」（`K-65`）。
9. **A ラベル／札。** `U-8` 担当ラベル・`U-41` 完了率ラベルに対し、`K-132` は「担当と進捗の札」。`U-52`・`IC-140` も「札」。ラベルをまとめる行は無いのに、キーの群「ラベル」は 13 個ある。
10. **A `Grab Point` と Handle。** `U-43` は掴み点、`K-94`・`K-95` は `fadeHandle…`（日本語は「フェード掴み点」）。
11. **D `K-72` `propertyPanelWidth`。** UI の名は `Properties Panel`（複数）で、隣の `K-71` は `taskGroupPanelWidthPx`（`Px` 付き）。
12. **A Title の訳が 3 つ。** `U-23` は見出し、`K-36`〜`K-38` の `taskGroupTitle…` は「タスクグループ名」、`U-27` `Document Title` は「文書名」。
13. **F 訳の例外が T-105 に載っていない。** 5 章は「例外は 5 件だけ」と書くが、`N-10` `Resource`→担当、`U-30` `Help Modal`→ヘルプ、`U-47` Expander→「折りたたみ」（向きが逆）、`P-4` `stop`→実績最終日 など 13 件の候補がある。
14. **G 説明の無い構造名。** `U-33` `Canvas Overlays`・`U-34` `Palette Groups / Palette Commands` は（同上）だけで、何を指すかが書かれていない。`U-35` `Header Commands` も同じ。
15. **`U-51` の挙げるキーが古い。** 群「画面の状態」は 13 キーあるが、`U-51` は `K-67`〜`K-72`・`K-110`・`K-111` の 8 個しか挙げない（`K-120`・`K-121`・`K-138`・`K-142`・`K-143` が抜け）。

### そのほか（数だけ）

- A の残り: 修正の記録／直した行の記録（`IC-169`／`IC-156`）・文書の描画設定／文書の設定の面／`documentSettings`（`IC-17`／`IC-139`／4 章）・グループ／タスクグループ（`K-56`・`K-102`・`U-18`）・解除パスワード（`IC-41`）。
- B の残り: マーカー（`U-5` と `K-32`・`K-131` の「マーカーから離す」）・段（文字サイズ `K-105`／積み順 `K-11`／木 `K-138`／浅い段 `IC-92`）・遅延診断（`VK-4` の価値のことばと `U-66`・`K-140`・`IC-107` の機能名）。注意書き済みの 4: 資源（`N-10`）・`milestone` の真偽と形（`N-1`）・`Item` と `Task`（`N-4a`）・範囲と要素（`U-32`）。
- D の残り: 複数形の名 13 行（`Task Groups` `Dependency Lines` など）の子や隣が単数（`Plan Bar` `Progress Line`）・`isDateGridLinesVisible`（複数）と `isDependencyVisible`（`Lines` なし）・T-103 に PascalCase が 3 行（`U-37`・`U-38`・`U-51`）・`Px` を末尾に付けるキーが 5 個だけ・群「保存しないもの」と「保存しないもの（別枠）」・`CommentBox`／`commentBoxes`／`Comment Boxes`／`commentBoxPad` の 4 つの綴り（`N-5` が意図を書いている）。
- E の 29: `U-2`・`U-5`〜`U-11`・`U-15a`〜`U-18`・`U-20`〜`U-22`・`U-24`〜`U-27`・`U-31`・`U-33`・`U-34`・`U-41`・`U-47`・`U-48`・`U-53`・`U-57`・`U-58`・`U-63`（行は TSV の `inferred`）。
